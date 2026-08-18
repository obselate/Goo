package Goo

import System

internal unsafe partial class VulkanImageResources : IDisposable {
    private func RecordUpload(commandBuffer VkCommandBuffer, entry VulkanImageResourceEntry) {
        var subresourceRange = VkImageSubresourceRange{}
        subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
        subresourceRange.levelCount = 1u
        subresourceRange.layerCount = 1u
        var before = VkImageMemoryBarrier2{}
        before.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
        if entry.ImageLayout == VkConstants.VK_IMAGE_LAYOUT_UNDEFINED {
            before.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT
            before.srcAccessMask = VkConstants.VK_ACCESS_2_NONE
        } else if entry.ImageLayout == VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL {
            before.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
            before.srcAccessMask = VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT
        } else {
            throw InvalidOperationException("Vulkan image has an unsupported layout")
        }
        before.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_COPY_BIT
        before.dstAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT
        before.oldLayout = entry.ImageLayout
        before.newLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL
        before.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        before.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        before.image = entry.Image
        before.subresourceRange = subresourceRange
        var firstDependency = VkDependencyInfo{}
        firstDependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
        firstDependency.imageMemoryBarrierCount = 1u
        firstDependency.pImageMemoryBarriers = &before
        let pipelineBarrier = dispatch.vkCmdPipelineBarrier2
        pipelineBarrier(commandBuffer, &firstDependency)

        var copy = VkBufferImageCopy{}
        copy.bufferOffset = entry.Upload.Offset
        copy.bufferRowLength = 0u
        copy.bufferImageHeight = 0u
        copy.imageSubresource = VkImageSubresourceLayers{}
        copy.imageSubresource.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
        copy.imageSubresource.layerCount = 1u
        copy.imageOffset = VkOffset3D{}
        copy.imageExtent = VkExtent3D{}
        copy.imageExtent.width = entry.Width
        copy.imageExtent.height = entry.Height
        copy.imageExtent.depth = 1u
        let copyBufferToImage = dispatch.vkCmdCopyBufferToImage
        copyBufferToImage(commandBuffer, stagingBuffer, entry.Image,
            VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1u, &copy)

        var after = VkImageMemoryBarrier2{}
        after.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
        after.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_COPY_BIT
        after.srcAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT
        after.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
        after.dstAccessMask = VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT
        after.oldLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL
        after.newLayout = VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL
        after.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        after.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        after.image = entry.Image
        after.subresourceRange = subresourceRange
        var secondDependency = VkDependencyInfo{}
        secondDependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
        secondDependency.imageMemoryBarrierCount = 1u
        secondDependency.pImageMemoryBarriers = &after
        pipelineBarrier(commandBuffer, &secondDependency)
    }

    private func Lookup(
        index int32,
        samplerId ResourceId,
        samplerMode VulkanImageSamplerMode) VulkanImageResourceLookup {
        var entry = entries[index]
        let descriptor = DescriptorFor(entry, samplerId, samplerMode)
        let descriptorSet = if descriptor.State == VulkanImageDescriptorState.Bound
            && descriptor.Slot >= 0 && descriptor.Slot < descriptorCapacity {
            descriptorSets[descriptor.Slot]
        } else { 0uL }
        let renderable = entry.GpuPublished
            && entry.State == VulkanImageResourceState.Resident
            && entry.Image != 0uL && entry.ImageView != 0uL
            && entry.UploadedVersion == entry.Id.Version && descriptorSet != 0uL
        entry.LastTouch = TouchValue()
        entries[index] = entry
        return VulkanImageResourceLookup{
            Found: entry.State != VulkanImageResourceState.Empty,
            Renderable: renderable,
            Id: entry.Id,
            Image: entry.Image,
            ImageView: entry.ImageView,
            DescriptorSet: descriptorSet,
            Width: entry.Width,
            Height: entry.Height,
            SamplerId: samplerId,
            SamplerMode: samplerMode,
            UploadedVersion: entry.UploadedVersion,
        }
    }

    private func DestroyImage(index int32, entry VulkanImageResourceEntry) {
        if entry.ImageView != 0uL {
            let destroyView = dispatch.vkDestroyImageView
            destroyView(device, entry.ImageView, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
        }
        if entry.Image != 0uL {
            let destroyImage = dispatch.vkDestroyImage
            destroyImage(device, entry.Image, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
        }
        if entry.Allocation != nil {
            allocator.Release(entry.Allocation!!)
        }
    }

    private func DestroyGpuResources() {
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State != VulkanImageResourceState.Empty {
                DestroyImage(index, entry)
                entries[index] = VulkanImageResourceEntry{}
            }
            index++
        }
        liveCount = 0
        residentBytes = 0uL
        DestroyGeneration()
    }

    private func DestroyGeneration() {
        if nearestSampler != 0uL {
            let destroySampler = dispatch.vkDestroySampler
            destroySampler(device, nearestSampler, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            nearestSampler = 0uL
        }
        if linearSampler != 0uL {
            let destroySampler = dispatch.vkDestroySampler
            destroySampler(device, linearSampler, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            linearSampler = 0uL
        }
        if descriptorPool != 0uL {
            let destroyPool = dispatch.vkDestroyDescriptorPool
            destroyPool(device, descriptorPool, nil)
            var descriptorIndex int32 = 0
            while descriptorIndex < trackedDescriptorSetCount {
                if let accounting = objectAccounting {
                    accounting.Release()
                }
                descriptorIndex = descriptorIndex + 1
            }
            trackedDescriptorSetCount = 0
            if let accounting = objectAccounting {
                accounting.Release()
            }
            descriptorPool = 0uL
        }
        if descriptorSetLayout != 0uL {
            let destroyLayout = dispatch.vkDestroyDescriptorSetLayout
            destroyLayout(device, descriptorSetLayout, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            descriptorSetLayout = 0uL
        }
        var index int32 = 0
        while index < descriptorSets.Length {
            descriptorSets[index] = 0uL
            descriptorLayouts[index] = 0uL
            index++
        }
    }

    private func DestroyStagingBuffer() {
        if stagingBuffer != 0uL {
            let destroyBuffer = dispatch.vkDestroyBuffer
            destroyBuffer(device, stagingBuffer, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            stagingBuffer = 0uL
        }
        if stagingAllocation != nil {
            allocator.Release(stagingAllocation!!)
            stagingAllocation = nil
        }
    }

    private func FindEmptyIndex() int32 {
        var index int32 = 0
        while index < entries.Length {
            if entries[index].State == VulkanImageResourceState.Empty {
                return index
            }
            index++
        }
        return -1
    }

    private func EnsureResidentCapacity(bytes VkDeviceSize) {
        if bytes > residentByteBudget {
            throw InvalidOperationException("Vulkan image resident byte budget exceeded")
        }
        while residentBytes > residentByteBudget - bytes || FindEmptyIndex() < 0 {
            if !EvictLeastRecentlyUsed() {
                throw InvalidOperationException("Vulkan image resident capacity reached")
            }
        }
    }

    private func EnsureRegistryPublication(bytes VkDeviceSize) {
        if registry.GpuGeneration != generation {
            throw InvalidOperationException("Vulkan image registry generation is stale")
        }
        if bytes > registry.ByteBudget {
            throw InvalidOperationException("Vulkan image registry byte budget exceeded")
        }
        let registryStats = registry.Stats
        if registryStats.ResidentBytes > registry.ByteBudget - bytes {
            throw InvalidOperationException("Vulkan image registry byte budget exceeded")
        }
    }

    private func CaptureLogical(id ResourceId) VulkanLogicalResource? {
        let count = registry.CopyLogicalResources(logicalRecords)
        var index int32 = 0
        while index < count {
            let logical = logicalRecords[index]
            if SameLogical(logical.Id, id) {
                return logical
            }
            index++
        }
        return nil
    }

    private func RollbackRegistration(
        id ResourceId,
        registration VulkanResourceRegistration,
        priorLogical VulkanLogicalResource?) bool {
        if !registration.Existing {
            return registry.DropLogical(id)
        }
        if priorLogical == nil {
            return false
        }
        if !registry.DropLogical(id) {
            return false
        }
        let prior = priorLogical!!
        let restored = registry.Register(prior.Id, prior.Bytes, prior.Source, prior.Cacheable)
        return restored.Accepted && !restored.Existing
    }

    private func EnsureExactMetadata(
        entry VulkanImageResourceEntry,
        id ResourceId,
        width uint32,
        height uint32,
        source VulkanResourceSource,
        cacheable bool,
        samplerId ResourceId,
        samplerMode VulkanImageSamplerMode) {
        if entry.Id.Version != id.Version
            || entry.Width != width
            || entry.Height != height
            || entry.Bytes != source.Bytes
            || !SameSource(entry.SamplerId, samplerId)
            || entry.Cacheable != cacheable
            || !SameSource(entry.Id, id)
            || !SameSource(entry, source) {
            throw InvalidOperationException("Vulkan image metadata changed for an unchanged version")
        }
    }

}
