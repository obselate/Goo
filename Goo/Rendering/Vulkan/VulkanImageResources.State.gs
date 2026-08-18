package Goo

import System

internal unsafe partial class VulkanImageResources : IDisposable {
    internal func Collect(completedFence uint64) int32 {
        EnsureOpen()
        if completedFence > highestCompletedFence {
            highestCompletedFence = completedFence
        }
        let effectiveCompletedFence = highestCompletedFence
        var completedUploads int32 = 0
        var index int32 = 0
        while index < entries.Length {
            var entry = entries[index]
            if entry.State == VulkanImageResourceState.UploadPending
                && entry.UploadSubmitted && entry.UploadFence <= effectiveCompletedFence {
                let pendingRetire = entry.PendingRetire
                var retiredEntry = entry
                if pendingRetire {
                    retiredEntry = RetireDescriptors(entry, entry.RetireFence)
                }
                let registryLookup = registry.Lookup(entry.Id, generation)
                if !registryLookup.Found {
                    throw InvalidOperationException("Vulkan image registry entry is stale")
                }
                registry.MarkUploaded(entry.Id, generation)
                if pendingRetire {
                    if !registry.Retire(entry.Id, entry.RetireFence) {
                        throw InvalidOperationException("Vulkan image registry entry is not resident")
                    }
                    entry = retiredEntry
                }
                entry.UploadedVersion = entry.Id.Version
                entry.Upload = VulkanUploadReservation{}
                entry.UploadRecorded = false
                entry.UploadSubmitted = false
                entry.UploadCommandBuffer = 0uL
                entry.UploadFence = 0uL
                entry.State = VulkanImageResourceState.Resident
                entry.LastTouch = TouchValue()
                if pendingRetire {
                    entry.PendingRetire = false
                    entry.State = VulkanImageResourceState.Retiring
                }
                entries[index] = entry
                completedUploads++
            }
            index++
        }
        uploadRing.Collect(effectiveCompletedFence)
        var retired int32 = 0
        index = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanImageResourceState.Retiring && entry.RetireFence <= effectiveCompletedFence {
                DestroyImage(index, entry)
                entries[index] = VulkanImageResourceEntry{}
                liveCount--
                residentBytes -= entry.Bytes
                retired++
            }
            index++
        }
        registry.Collect(effectiveCompletedFence)
        return completedUploads + retired
    }

    internal func CopyLogicalResources(destination []VulkanLogicalResource) int32 {
        EnsureOpen()
        return registry.CopyLogicalResources(destination)
    }

    internal func EvictLeastRecentlyUsed() bool {
        EnsureOpen()
        var candidate int32 = -1
        var candidateTouch uint64 = uint64.MaxValue
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanImageResourceState.Resident
                && entry.Cacheable
                && entry.LastUseFence <= highestCompletedFence
                && entry.LastTouch < candidateTouch {
                candidate = index
                candidateTouch = entry.LastTouch
            }
            index++
        }
        if candidate < 0 {
            return false
        }
        let id = entries[candidate].Id
        if !Retire(id, generation, highestCompletedFence) {
            return false
        }
        Collect(highestCompletedFence)
        return true
    }

    internal func Lookup(id ResourceId, expectedGeneration uint64) VulkanImageResourceLookup {
        if disposed || !id.IsValid || id.Kind != SceneResourceKind.Image
            || expectedGeneration == 0uL || expectedGeneration != generation {
            return VulkanImageResourceLookup{ Found: false }
        }
        let index = FindExactIndex(id)
        if index < 0 {
            return VulkanImageResourceLookup{ Found: false }
        }
        let entry = entries[index]
        return Lookup(index, entry.SamplerId, entry.SamplerMode)
    }

    internal func Lookup(
        id ResourceId,
        samplerId ResourceId,
        samplerMode VulkanImageSamplerMode,
        expectedGeneration uint64) VulkanImageResourceLookup {
        if disposed || !id.IsValid || id.Kind != SceneResourceKind.Image
            || !samplerId.IsValid || samplerId.Kind != SceneResourceKind.Sampler
            || expectedGeneration == 0uL || expectedGeneration != generation {
            return VulkanImageResourceLookup{ Found: false }
        }
        let index = FindExactIndex(id)
        if index < 0 {
            return VulkanImageResourceLookup{ Found: false }
        }
        return Lookup(index, samplerId, samplerMode)
    }

    internal func BindDescriptor(
        commandBuffer VkCommandBuffer,
        pipelineLayout VkPipelineLayout,
        id ResourceId,
        expectedGeneration uint64) {
        EnsureOpen()
        ValidateGeneration(expectedGeneration)
        let index = FindExactIndex(id)
        if index < 0 {
            throw InvalidOperationException("Vulkan image is not registered")
        }
        let entry = entries[index]
        BindDescriptor(commandBuffer, pipelineLayout, id, entry.SamplerId, entry.SamplerMode,
            expectedGeneration)
    }

    internal func BindDescriptor(
        commandBuffer VkCommandBuffer,
        pipelineLayout VkPipelineLayout,
        id ResourceId,
        samplerId ResourceId,
        samplerMode VulkanImageSamplerMode,
        expectedGeneration uint64) {
        EnsureOpen()
        ValidateGeneration(expectedGeneration)
        ValidateSamplerId(samplerId)
        let index = FindExactIndex(id)
        if index < 0 {
            throw InvalidOperationException("Vulkan image is not registered")
        }
        let lookup = Lookup(index, samplerId, samplerMode)
        let entry = entries[index]
        let uploadCanBeConsumed = entry.State == VulkanImageResourceState.UploadPending
            && entry.Upload.Succeeded
            && entry.UploadRecorded
            && entry.UploadCommandBuffer == commandBuffer
        if !lookup.Renderable && !uploadCanBeConsumed {
            throw InvalidOperationException("Vulkan image upload is not complete")
        }
        if lookup.DescriptorSet == 0uL {
            throw InvalidOperationException("Vulkan image descriptor is stale")
        }
        var descriptorSet = lookup.DescriptorSet
        let bindDescriptorSets = dispatch.vkCmdBindDescriptorSets
        bindDescriptorSets(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS,
            pipelineLayout, 0u, 1u, &descriptorSet, 0u, nil)
    }

    public func Dispose() {
        if disposed {
            return
        }
        Collect(highestCompletedFence)
        if highestCompletedFence < generationLastUseFence {
            throw InvalidOperationException("Vulkan image resources still have in-flight work")
        }
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanImageResourceState.UploadPending
                || entry.State == VulkanImageResourceState.Retiring
                || entry.LastUseFence > highestCompletedFence
                || entry.RetireFence > highestCompletedFence
                || (entry.UploadSubmitted && entry.UploadFence > highestCompletedFence) {
                throw InvalidOperationException("Vulkan image resources still have in-flight work")
            }
            index++
        }
        disposed = true
        DestroyGpuResources()
        DestroyStagingBuffer()
        uploadRing.Dispose()
        registry.Dispose()
        index = 0
        while index < entries.Length {
            entries[index] = VulkanImageResourceEntry{}
            index++
        }
        liveCount = 0
        residentBytes = 0uL
    }

    deinit {
        Dispose()
    }

}
