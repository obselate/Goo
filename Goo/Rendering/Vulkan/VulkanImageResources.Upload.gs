package Goo

import System

internal unsafe partial class VulkanImageResources : IDisposable {
    internal func RegisterImage(
        id ResourceId,
        width uint32,
        height uint32,
        source VulkanResourceSource,
        cacheable bool,
        samplerId ResourceId,
        samplerMode VulkanImageSamplerMode) VulkanImageResourceLookup {
        EnsureOpen()
        ValidateImageId(id)
        ValidateSamplerId(samplerId)
        let bytes = ImageBytes(width, height)
        if bytes > VkDeviceSize(Int32.MaxValue) {
            throw ArgumentOutOfRangeException("width")
        }
        if source.Bytes != bytes || source.Version != id.Version {
            throw ArgumentException("Vulkan image source does not match image extent", "source")
        }
        SupersedeOlderSourceVersions(source)
        let existingIndex = FindLogicalIndex(id)
        if existingIndex >= 0 {
            var existing = entries[existingIndex]
            if existing.State == VulkanImageResourceState.Resident
                || existing.State == VulkanImageResourceState.UploadPending {
                if existing.PendingRetire {
                    throw InvalidOperationException("Vulkan image is pending retirement")
                }
                if existing.Id.Version == id.Version {
                    EnsureExactMetadata(existing, id, width, height, source, cacheable, samplerId, samplerMode)
                    registry.Register(id, bytes, source, cacheable)
                    existing.SamplerMode = samplerMode
                    existing.LastTouch = TouchValue()
                    entries[existingIndex] = existing
                    return Lookup(existingIndex, samplerId, samplerMode)
                }
                throw InvalidOperationException("Vulkan image version is still resident")
            }
            if existing.State == VulkanImageResourceState.Retiring {
                throw InvalidOperationException("Vulkan image version is retiring")
            }
        }
        EnsureResidentCapacity(bytes)
        let index = if existingIndex >= 0 { existingIndex } else { FindEmptyIndex() }
        let priorLogical = if existingIndex < 0 { CaptureLogical(id) } else { nil }
        CreateImage(index, id, width, height, bytes, source, cacheable, samplerId, samplerMode, priorLogical)
        return Lookup(index, samplerId, samplerMode)
    }

    internal func QueueUpload(id ResourceId, premultipliedSourceBytes *uint8,
        byteCount VkDeviceSize, expectedGeneration uint64) bool {
        EnsureOpen()
        ValidateGeneration(expectedGeneration)
        ValidateImageId(id)
        if premultipliedSourceBytes == nil {
            throw ArgumentNullException("premultipliedSourceBytes")
        }
        let index = FindExactIndex(id)
        if index < 0 {
            throw InvalidOperationException("Vulkan image is not registered")
        }
        var entry = entries[index]
        if entry.PendingRetire {
            throw InvalidOperationException("Vulkan image is pending retirement")
        }
        if entry.State == VulkanImageResourceState.Retiring {
            throw InvalidOperationException("Vulkan image is retiring")
        }
        if entry.State == VulkanImageResourceState.Empty || entry.Image == 0uL {
            throw InvalidOperationException("Vulkan image is not resident")
        }
        if byteCount != entry.Bytes || byteCount > VkDeviceSize(Int32.MaxValue) {
            throw ArgumentOutOfRangeException("byteCount")
        }
        if (byteCount % 4uL) != 0uL {
            throw ArgumentOutOfRangeException("byteCount")
        }
        if entry.UploadedVersion == id.Version || entry.Upload.Succeeded {
            return false
        }
        EnsureStagingBuffer()
        let reservation = uploadRing.Reserve(id, id.Version, byteCount, 4uL)
        if !reservation.Succeeded {
            throw InvalidOperationException("Vulkan upload ring has no available range")
        }
        let destination = *uint8(nint(stagingAllocation!!.mapped) + nint(reservation.Offset))
        try {
            var byteIndex int32 = 0
            while byteIndex < int32(byteCount) {
                let alpha = premultipliedSourceBytes[byteIndex + 3]
                if alpha == uint8(255) {
                    destination[byteIndex] = premultipliedSourceBytes[byteIndex]
                    destination[byteIndex + 1] = premultipliedSourceBytes[byteIndex + 1]
                    destination[byteIndex + 2] = premultipliedSourceBytes[byteIndex + 2]
                } else if alpha == uint8(0) {
                    destination[byteIndex] = uint8(0)
                    destination[byteIndex + 1] = uint8(0)
                    destination[byteIndex + 2] = uint8(0)
                } else {
                    destination[byteIndex] = Unpremultiply(premultipliedSourceBytes[byteIndex], alpha)
                    destination[byteIndex + 1] = Unpremultiply(premultipliedSourceBytes[byteIndex + 1], alpha)
                    destination[byteIndex + 2] = Unpremultiply(premultipliedSourceBytes[byteIndex + 2], alpha)
                }
                destination[byteIndex + 3] = alpha
                byteIndex += 4
            }
        } catch (error Exception) {
            if !uploadRing.Cancel(reservation) {
                throw InvalidOperationException("Vulkan image upload reservation rollback failed")
            }
            uploadRing.Collect(highestCompletedFence)
            throw error
        }
        entry.State = VulkanImageResourceState.UploadPending
        entry.Upload = reservation
        entry.UploadRecorded = false
        entry.UploadSubmitted = false
        entry.UploadCommandBuffer = 0uL
        entry.UploadFence = 0uL
        entry.PendingRetire = false
        flushPrepared = false
        entries[index] = entry
        return true
    }

    internal func RecordUploads(commandBuffer VkCommandBuffer, expectedGeneration uint64) int32 {
        var recordedBytes VkDeviceSize = 0uL
        var recordedBarriers int32 = 0
        return RecordUploads(commandBuffer, expectedGeneration, out recordedBytes,
            out recordedBarriers)
    }

    internal func RecordUploads(commandBuffer VkCommandBuffer, expectedGeneration uint64,
        out recordedBytes VkDeviceSize) int32 {
        var recordedBarriers int32 = 0
        return RecordUploads(commandBuffer, expectedGeneration, out recordedBytes,
            out recordedBarriers)
    }

    internal func RecordUploads(commandBuffer VkCommandBuffer, expectedGeneration uint64,
        out recordedBytes VkDeviceSize, out recordedBarriers int32) int32 {
        EnsureOpen()
        ValidateGeneration(expectedGeneration)
        if commandBuffer == nint(0) {
            throw ArgumentException("Command buffer is null", "commandBuffer")
        }
        recordedBytes = 0uL
        recordedBarriers = 0
        var recorded int32 = 0
        var index int32 = 0
        while index < entries.Length {
            var entry = entries[index]
            if entry.State == VulkanImageResourceState.UploadPending
                && entry.Upload.Succeeded && !entry.UploadSubmitted {
                if entry.UploadRecorded {
                    if entry.UploadCommandBuffer != commandBuffer {
                        throw InvalidOperationException("Vulkan image upload is recorded into another command buffer")
                    }
                    index++
                    continue
                }
                if entry.UploadCommandBuffer != 0uL {
                    throw InvalidOperationException("Vulkan image upload must be aborted before recording again")
                }
                try {
                    RecordUpload(commandBuffer, entry)
                } catch (error Exception) {
                    if !uploadRing.Cancel(entry.Upload) {
                        throw InvalidOperationException("Vulkan image upload reservation rollback failed")
                    }
                    entry.State = VulkanImageResourceState.Resident
                    entry.Upload = VulkanUploadReservation{}
                    entry.UploadRecorded = false
                    entry.UploadSubmitted = false
                    entry.UploadCommandBuffer = 0uL
                    entry.UploadFence = 0uL
                    entry.PendingRetire = false
                    entries[index] = entry
                    uploadRing.Collect(highestCompletedFence)
                    flushPrepared = false
                    throw error
                }
                entry.UploadCommandBuffer = commandBuffer
                entry.UploadRecorded = true
                entries[index] = entry
                recorded++
                recordedBytes = recordedBytes + entry.Upload.Size
                recordedBarriers = recordedBarriers + 2
            }
            index++
        }
        return recorded
    }

    internal func FlushBeforeSubmit() VkResult {
        EnsureOpen()
        if stagingAllocation == nil {
            return VkConstants.VK_SUCCESS
        }
        var flushed bool = false
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanImageResourceState.UploadPending
                && entry.Upload.Succeeded && !entry.UploadSubmitted {
                let result = allocator.FlushBeforeSubmit(stagingAllocation!!,
                    entry.Upload.Offset, entry.Upload.Size)
                if result != VkConstants.VK_SUCCESS {
                    flushPrepared = false
                    return result
                }
                flushed = true
            }
            index = index + 1
        }
        flushPrepared = flushed
        return VkConstants.VK_SUCCESS
    }

    internal func AbortUploads(commandBuffer VkCommandBuffer, expectedGeneration uint64) int32 {
        EnsureOpen()
        ValidateGeneration(expectedGeneration)
        if commandBuffer == nint(0) {
            throw ArgumentException("Command buffer is null", "commandBuffer")
        }
        var aborted int32 = 0
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanImageResourceState.UploadPending
                && entry.Upload.Succeeded && !entry.UploadSubmitted
                && entry.UploadCommandBuffer != 0uL
                && entry.UploadCommandBuffer != commandBuffer {
                throw InvalidOperationException("Vulkan image upload belongs to another command buffer")
            }
            index++
        }
        index = 0
        while index < entries.Length {
            var entry = entries[index]
            if entry.State == VulkanImageResourceState.UploadPending
                && entry.Upload.Succeeded && !entry.UploadSubmitted
                && entry.UploadCommandBuffer == commandBuffer {
                if !uploadRing.Cancel(entry.Upload) {
                    throw InvalidOperationException("Vulkan image upload reservation is stale")
                }
                entry.State = VulkanImageResourceState.Resident
                entry.Upload = VulkanUploadReservation{}
                entry.UploadRecorded = false
                entry.UploadSubmitted = false
                entry.UploadCommandBuffer = 0uL
                entry.UploadFence = 0uL
                entry.PendingRetire = false
                let dropLogicalOnRetire = entry.DropLogicalOnRetire
                entries[index] = entry
                if dropLogicalOnRetire {
                    if !Retire(entry.Id, generation, highestCompletedFence) {
                        throw InvalidOperationException("Vulkan image retirement failed")
                    }
                }
                aborted++
            }
            index++
        }
        uploadRing.Collect(highestCompletedFence)
        flushPrepared = false
        return aborted
    }

    internal func AbortUnrecordedUploads(expectedGeneration uint64) int32 {
        EnsureOpen()
        ValidateGeneration(expectedGeneration)
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanImageResourceState.UploadPending
                && entry.Upload.Succeeded && !entry.UploadSubmitted
                && (entry.UploadRecorded || entry.UploadCommandBuffer != 0uL) {
                throw InvalidOperationException("Vulkan image upload commands are recorded")
            }
            index++
        }
        var aborted int32 = 0
        index = 0
        while index < entries.Length {
            var entry = entries[index]
            if entry.State == VulkanImageResourceState.UploadPending
                && entry.Upload.Succeeded && !entry.UploadSubmitted
                && !entry.UploadRecorded && entry.UploadCommandBuffer == 0uL {
                if !uploadRing.Cancel(entry.Upload) {
                    throw InvalidOperationException("Vulkan image upload reservation is stale")
                }
                entry.State = VulkanImageResourceState.Resident
                entry.Upload = VulkanUploadReservation{}
                entry.UploadRecorded = false
                entry.UploadSubmitted = false
                entry.UploadCommandBuffer = 0uL
                entry.UploadFence = 0uL
                entry.PendingRetire = false
                let dropLogicalOnRetire = entry.DropLogicalOnRetire
                entries[index] = entry
                if dropLogicalOnRetire {
                    if !Retire(entry.Id, generation, highestCompletedFence) {
                        throw InvalidOperationException("Vulkan image retirement failed")
                    }
                }
                aborted++
            }
            index++
        }
        uploadRing.Collect(highestCompletedFence)
        flushPrepared = false
        return aborted
    }

    internal func ValidateUploadSubmission(
        commandBuffer VkCommandBuffer,
        fence uint64,
        expectedGeneration uint64) int32 {
        EnsureOpen()
        ValidateGeneration(expectedGeneration)
        if commandBuffer == nint(0) {
            throw ArgumentException("Command buffer is null", "commandBuffer")
        }
        if fence == 0uL {
            throw ArgumentOutOfRangeException("fence")
        }
        var index int32 = 0
        var tracked int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanImageResourceState.UploadPending
                && entry.Upload.Succeeded {
                if entry.UploadSubmitted {
                    if entry.UploadCommandBuffer != commandBuffer {
                        index++
                        continue
                    }
                    if !entry.UploadRecorded
                        || entry.UploadFence != fence
                        || !uploadRing.IsSubmitted(entry.Upload, fence) {
                        throw InvalidOperationException("Vulkan image upload submission identity is invalid")
                    }
                } else {
                    if !entry.UploadRecorded || entry.UploadCommandBuffer == 0uL {
                        throw InvalidOperationException("Vulkan image upload is not recorded")
                    }
                    if entry.UploadCommandBuffer != commandBuffer || entry.UploadFence != 0uL {
                        throw InvalidOperationException("Vulkan image upload is recorded into another submission")
                    }
                    if !uploadRing.CanMarkSubmitted(entry.Upload, fence) {
                        throw InvalidOperationException("Vulkan image upload range is not submit-ready")
                    }
                }
                tracked++
            }
            index++
        }
        return tracked
    }

    internal func MarkSubmitted(
        commandBuffer VkCommandBuffer,
        fence uint64,
        expectedGeneration uint64) int32 {
        let tracked = ValidateUploadSubmission(commandBuffer, fence, expectedGeneration)
        if tracked == 0 {
            return 0
        }
        var pending int32 = 0
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanImageResourceState.UploadPending
                && entry.Upload.Succeeded {
                if entry.UploadSubmitted {
                    if entry.UploadCommandBuffer != commandBuffer {
                        index++
                        continue
                    }
                    if !uploadRing.IsSubmitted(entry.Upload, fence) {
                        throw InvalidOperationException("Vulkan image upload submission identity is invalid")
                    }
                } else {
                    if !uploadRing.CanMarkSubmitted(entry.Upload, fence) {
                        throw InvalidOperationException("Vulkan image upload range is not submit-ready")
                    }
                    pending++
                }
            }
            index++
        }
        if pending != 0 && !flushPrepared {
            throw InvalidOperationException("Vulkan image uploads must be flushed before submit")
        }
        index = 0
        while index < entries.Length {
            var entry = entries[index]
            if entry.State == VulkanImageResourceState.UploadPending
                && entry.Upload.Succeeded && !entry.UploadSubmitted
                && entry.UploadRecorded && entry.UploadCommandBuffer == commandBuffer {
                if !uploadRing.MarkSubmitted(entry.Upload, fence) {
                    throw InvalidOperationException("Vulkan upload reservation is stale")
                }
                entry.UploadSubmitted = true
                entry.UploadFence = fence
                if entry.PendingRetire {
                    let safeFence = RetireFence(entry, fence)
                    entry.RetireFence = safeFence
                    if safeFence > generationLastUseFence {
                        generationLastUseFence = safeFence
                    }
                }
                entry.ImageLayout = VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL
                entries[index] = entry
            }
            index++
        }
        if pending != 0 {
            flushPrepared = false
        }
        return tracked
    }

    internal func ReserveRecording(id ResourceId, expectedGeneration uint64) {
        EnsureOpen()
        ValidateGeneration(expectedGeneration)
        let index = FindExactIndex(id)
        if index < 0 {
            throw InvalidOperationException("Vulkan image is not registered")
        }
        var entry = entries[index]
        if entry.State != VulkanImageResourceState.Resident
            || !entry.GpuPublished || entry.PendingRetire {
            throw InvalidOperationException("Vulkan image is not available for recording")
        }
        if entry.RecordingUseCount == Int32.MaxValue {
            throw InvalidOperationException("Vulkan image recording reservation capacity reached")
        }
        entry.RecordingUseCount++
        entry.LastTouch = TouchValue()
        entries[index] = entry
    }

    internal func ReleaseRecording(id ResourceId, expectedGeneration uint64) bool {
        EnsureOpen()
        ValidateGeneration(expectedGeneration)
        let index = FindExactIndex(id)
        if index < 0 {
            return false
        }
        var entry = entries[index]
        if entry.RecordingUseCount == 0 {
            return false
        }
        entry.RecordingUseCount--
        let retire = entry.PendingRetire && entry.RecordingUseCount == 0
        if retire {
            entry.PendingRetire = false
        }
        entry.LastTouch = TouchValue()
        entries[index] = entry
        if retire && !Retire(id, generation, highestCompletedFence) {
            throw InvalidOperationException("Vulkan image retirement failed")
        }
        return true
    }

    internal func MarkUsed(id ResourceId, expectedGeneration uint64, fence uint64) {
        EnsureOpen()
        ValidateGeneration(expectedGeneration)
        if fence == 0uL {
            throw ArgumentOutOfRangeException("fence")
        }
        let index = FindExactIndex(id)
        if index < 0 {
            return
        }
        if entries[index].RecordingUseCount == 0 {
            return
        }
        if entries[index].State != VulkanImageResourceState.Resident
            || !entries[index].GpuPublished {
            throw InvalidOperationException("Vulkan image upload is not complete")
        }
        registry.MarkUsed(id, expectedGeneration, fence)
        var entry = entries[index]
        if fence > entry.LastUseFence {
            entry.LastUseFence = fence
        }
        if fence > generationLastUseFence {
            generationLastUseFence = fence
        }
        if entry.RecordingUseCount > 0 {
            entry.RecordingUseCount--
        }
        let retire = entry.PendingRetire && entry.RecordingUseCount == 0
        if retire {
            entry.PendingRetire = false
        }
        entry.LastTouch = TouchValue()
        entries[index] = entry
        if retire && !Retire(id, generation, fence) {
            throw InvalidOperationException("Vulkan image retirement failed")
        }
    }

    internal func Retire(id ResourceId, expectedGeneration uint64, fence uint64) bool {
        EnsureOpen()
        ValidateGeneration(expectedGeneration)
        let index = FindExactIndex(id)
        if index < 0 {
            return false
        }
        var entry = entries[index]
        if entry.RecordingUseCount != 0 {
            let safeFence = RetireFence(entry, fence)
            entry.PendingRetire = true
            if safeFence > entry.RetireFence {
                entry.RetireFence = safeFence
            }
            entries[index] = entry
            if entry.RetireFence > generationLastUseFence {
                generationLastUseFence = entry.RetireFence
            }
            return true
        }
        if entry.PendingRetire {
            if entry.State == VulkanImageResourceState.UploadPending
                && entry.UploadSubmitted {
                let safeFence = RetireFence(entry, fence)
                if safeFence > entry.RetireFence {
                    entry.RetireFence = safeFence
                    entries[index] = entry
                    if safeFence > generationLastUseFence {
                        generationLastUseFence = safeFence
                    }
                }
                return true
            }
            throw InvalidOperationException("Vulkan image is pending retirement")
        }
        if entry.State == VulkanImageResourceState.UploadPending
            && entry.UploadSubmitted {
            let safeFence = RetireFence(entry, fence)
            entry.PendingRetire = true
            entry.RetireFence = safeFence
            entries[index] = entry
            if safeFence > generationLastUseFence {
                generationLastUseFence = safeFence
            }
            return true
        }
        if entry.State == VulkanImageResourceState.Retiring {
            let safeFence = RetireFence(entry, fence)
            if safeFence > entry.RetireFence {
                if entry.GpuPublished {
                    let retiredEntry = RetireDescriptors(entry, safeFence)
                    if !registry.Retire(id, safeFence) {
                        throw InvalidOperationException("Vulkan image registry entry is not resident")
                    }
                    entry = retiredEntry
                }
                entry.RetireFence = safeFence
                entries[index] = entry
                if safeFence > generationLastUseFence {
                    generationLastUseFence = safeFence
                }
            }
            return true
        }
        if entry.Upload.Succeeded && entry.UploadRecorded && !entry.UploadSubmitted {
            throw InvalidOperationException("Vulkan image upload commands are recorded")
        }
        let cancelUpload = entry.Upload.Succeeded && !entry.UploadSubmitted
        let safeFence = RetireFence(entry, fence)
        if !entry.GpuPublished {
            if cancelUpload {
                if !uploadRing.Cancel(entry.Upload) {
                    throw InvalidOperationException("Vulkan image upload reservation is stale")
                }
                entry.Upload = VulkanUploadReservation{}
                entry.UploadRecorded = false
                entry.UploadSubmitted = false
                entry.UploadCommandBuffer = 0uL
                entry.UploadFence = 0uL
            }
            entry.RetireFence = safeFence
            entry.State = VulkanImageResourceState.Retiring
            entries[index] = entry
            if entry.RetireFence > generationLastUseFence {
                generationLastUseFence = entry.RetireFence
            }
            return true
        }
        let registryLookup = registry.Lookup(id, generation)
        if !registryLookup.Found {
            throw InvalidOperationException("Vulkan image registry entry is stale")
        }
        let retiredEntry = RetireDescriptors(entry, safeFence)
        if cancelUpload {
            if !uploadRing.Cancel(entry.Upload) {
                throw InvalidOperationException("Vulkan image upload reservation is stale")
            }
        }
        if !registry.Retire(id, safeFence) {
            throw InvalidOperationException("Vulkan image registry entry is not resident")
        }
        entry = retiredEntry
        if cancelUpload {
            entry.Upload = VulkanUploadReservation{}
            entry.UploadRecorded = false
            entry.UploadSubmitted = false
            entry.UploadCommandBuffer = 0uL
            entry.UploadFence = 0uL
        }
        entry.RetireFence = safeFence
        entry.State = VulkanImageResourceState.Retiring
        entries[index] = entry
        if entry.RetireFence > generationLastUseFence {
            generationLastUseFence = entry.RetireFence
        }
        return true
    }

    private func SupersedeOlderSourceVersions(source VulkanResourceSource) {
        var superseded bool = false
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State != VulkanImageResourceState.Empty
                && entry.ProviderId == source.ProviderId
                && entry.SourceId == source.SourceId
                && entry.Id.Version < source.Version {
                var marked = entry
                marked.DropLogicalOnRetire = true
                if entry.State == VulkanImageResourceState.UploadPending
                    && entry.Upload.Succeeded && entry.UploadRecorded
                    && !entry.UploadSubmitted {
                    marked.PendingRetire = true
                    entries[index] = marked
                } else {
                    entries[index] = marked
                    if !Retire(entry.Id, generation, highestCompletedFence) {
                        throw InvalidOperationException("Vulkan image retirement failed")
                    }
                }
                superseded = true
            }
            index++
        }
        if superseded {
            Collect(highestCompletedFence)
        }
    }

}
