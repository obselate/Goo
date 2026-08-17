package Goo.VulkanProof

import System
import System.Threading
import Goo.Vulkan.Generated

internal class VulkanImageE2EContract {
    const Width uint32 = 64u
    const Height uint32 = 64u
    const ImageLogicalId uint64 = 7771uL
    const SamplerLogicalId uint64 = 7772uL
    const ExpectedDigest uint64 = 2726448270383127845uL
}

internal func VulkanImageResourceIdVersion(version uint64) ResourceId {
    return ResourceId{
        Kind: SceneResourceKind.Image,
        LogicalId: VulkanImageE2EContract.ImageLogicalId,
        Version: version,
    }
}

internal func VulkanImageResourceId() ResourceId {
    return VulkanImageResourceIdVersion(2uL)
}

internal func VulkanImageSamplerId() ResourceId {
    return ResourceId{
        Kind: SceneResourceKind.Sampler,
        LogicalId: VulkanImageE2EContract.SamplerLogicalId,
        Version: 1uL,
    }
}

internal func BuildVulkanImageScene(frame SceneFrame, sampling uint32) {
    if frame == nil {
        throw ArgumentNullException("frame")
    }
    if sampling > 1u {
        throw ArgumentOutOfRangeException("sampling")
    }
    frame.ResetForReuse()
    frame.BeginChunk(0x494D414745454E44uL, 1uL, ConservativeBounds{
        X: 0.0F,
        Y: 0.0F,
        Width: float32(VulkanImageE2EContract.Width),
        Height: float32(VulkanImageE2EContract.Height),
    }, true)
    frame.AddCachedImage(CachedImageRefRecord{
        Bounds: ConservativeBounds{ X: 16.0F, Y: 16.0F, Width: 32.0F, Height: 32.0F },
        ImageId: VulkanImageResourceId(),
        SamplerId: VulkanImageSamplerId(),
        SourceX: 0.0F,
        SourceY: 0.0F,
        SourceWidth: 1.0F,
        SourceHeight: 1.0F,
        Opacity: 1.0F,
        Sampling: sampling,
        TransformIndex: -1,
    })
    frame.EndChunk()
}

internal unsafe func VulkanImageReadbackDigest(readback *uint8, width uint32, height uint32) uint64 {
    if readback == nil || width < VulkanImageE2EContract.Width || height < VulkanImageE2EContract.Height {
        throw ArgumentException("invalid Vulkan image readback")
    }
    var hash uint64 = 14695981039346656037uL
    var y uint32 = 0u
    while y < VulkanImageE2EContract.Height {
        var x uint32 = 0u
        while x < VulkanImageE2EContract.Width {
            let offset = uint64(y) * uint64(width) * 4uL + uint64(x) * 4uL
            hash = (hash ^ uint64(readback[offset])) * 1099511628211uL
            hash = (hash ^ uint64(readback[offset + 1uL])) * 1099511628211uL
            hash = (hash ^ uint64(readback[offset + 2uL])) * 1099511628211uL
            hash = (hash ^ uint64(readback[offset + 3uL])) * 1099511628211uL
            x++
        }
        y++
    }
    return hash
}

internal unsafe func VerifyVulkanImageReadback(readback *uint8, width uint32, height uint32) bool {
    if readback == nil || width < VulkanImageE2EContract.Width || height < VulkanImageE2EContract.Height {
        return false
    }
    if !VulkanImageExactPixel(readback, width, 4, 4, 0u, 0u, 0u, 0u) {
        return false
    }
    if !VulkanImageExactPixel(readback, width, 20, 20, 0u, 0u, 255u, 255u) {
        return false
    }
    if !VulkanImageNearPixel(readback, width, 44, 20, 188, 92, 0, 128, 4) {
        return false
    }
    if !VulkanImageExactPixel(readback, width, 20, 44, 0u, 255u, 0u, 255u) {
        return false
    }
    if !VulkanImageExactPixel(readback, width, 44, 44, 0u, 0u, 0u, 0u) {
        return false
    }
    return true
}

internal unsafe func VerifyVulkanImageLinearReadback(readback *uint8, width uint32, height uint32) bool {
    return VerifyVulkanImageReadback(readback, width, height)
}

internal func VulkanImageUploadStatsEqual(first VulkanUploadRingStats, second VulkanUploadRingStats) bool {
    return first.Capacity == second.Capacity
        && first.UsedBytes == second.UsedBytes
        && first.FreeBytes == second.FreeBytes
        && first.ActiveRanges == second.ActiveRanges
        && first.SubmittedRanges == second.SubmittedRanges
}

internal unsafe func AbortVulkanImageUploads(
    dispatch VkDeviceDispatch,
    commandBuffer VkCommandBuffer,
    imageResources VulkanImageResources,
    generation uint64,
    diagnostics VulkanDiagnostics?,
    eventId uint64) {
    let resetCommandBuffer = dispatch.vkResetCommandBuffer
    let resetResult = TrackResult(diagnostics, eventId,
        resetCommandBuffer(commandBuffer, VkCommandBufferResetFlags(0u)))
    let aborted = imageResources.AbortUploads(commandBuffer, generation)
    let unrecorded = imageResources.AbortUnrecordedUploads(generation)
    if resetResult != VkConstants.VK_SUCCESS {
        throw InvalidOperationException("vkResetCommandBuffer failed while aborting image upload")
    }
    if aborted < 0 {
        throw InvalidOperationException("Vulkan image upload abort count is invalid")
    }
    if unrecorded < 0 {
        throw InvalidOperationException("Vulkan unrecorded image upload abort count is invalid")
    }
}

internal unsafe func CompleteAcceptedVulkanImageUpload(
    dispatch VkDeviceDispatch,
    device VkDevice,
    fence VkFence,
    commandBuffer VkCommandBuffer,
    imageResources VulkanImageResources,
    fenceSerial uint64,
    generation uint64,
    diagnostics VulkanDiagnostics?,
    eventId uint64) {
    let waitForFences = dispatch.vkWaitForFences
    var waitFence = fence
    let waitResult = TrackResult(diagnostics, eventId,
        waitForFences(device, 1u, &waitFence, VkConstants.VK_TRUE, VkConstants.VK_WHOLE_SIZE))
    if waitResult != VkConstants.VK_SUCCESS {
        throw InvalidOperationException("vkWaitForFences failed while completing image upload tracking")
    }
    let tracked = imageResources.MarkSubmitted(commandBuffer, fenceSerial, generation)
    if tracked <= 0 {
        throw InvalidOperationException("Vulkan image upload tracking could not be completed")
    }
    if imageResources.Collect(fenceSerial) <= 0 {
        throw InvalidOperationException("Vulkan image upload tracking did not collect")
    }
}

internal unsafe func RecordVulkanImageFrame(
    dispatch VkDeviceDispatch,
    queue VkQueue,
    target VulkanOffscreenTarget,
    commandBuffer VkCommandBuffer,
    frame SceneFrame,
    clearColor VkClearColorValue,
    imageResources VulkanImageResources,
    imageId ResourceId,
    generation uint64,
    serial uint64,
    diagnostics VulkanDiagnostics?) {
    let resetCommandBuffer = dispatch.vkResetCommandBuffer
    let resetResult = TrackResult(diagnostics, 350uL + serial, resetCommandBuffer(commandBuffer, VkCommandBufferResetFlags(0u)))
    if resetResult != VkConstants.VK_SUCCESS {
        throw InvalidOperationException("vkResetCommandBuffer failed for sampled image frame")
    }
    let prepareResult = target.PrepareSubmit()
    if prepareResult != VkConstants.VK_SUCCESS {
        throw InvalidOperationException("Vulkan sampled image target preparation failed")
    }
    var submitted = false
    try {
        let beginCommandBuffer = dispatch.vkBeginCommandBuffer
        let endCommandBuffer = dispatch.vkEndCommandBuffer
        let queueSubmit = dispatch.vkQueueSubmit2
        var beginInfo = VkCommandBufferBeginInfo{}
        beginInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO
        beginInfo.flags = uint32(VkConstants.VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT)
        let beginResult = TrackResult(diagnostics, 360uL + serial, beginCommandBuffer(commandBuffer, &beginInfo))
        if beginResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkBeginCommandBuffer failed for sampled image frame")
        }
        target.RecordScene(commandBuffer, frame, clearColor)
        let endResult = TrackResult(diagnostics, 370uL + serial, endCommandBuffer(commandBuffer))
        if endResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkEndCommandBuffer failed for sampled image frame")
        }
        var commandBufferInfo = VkCommandBufferSubmitInfo{}
        commandBufferInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_BUFFER_SUBMIT_INFO
        commandBufferInfo.commandBuffer = commandBuffer
        var submitInfo = VkSubmitInfo2{}
        submitInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SUBMIT_INFO_2
        submitInfo.commandBufferInfoCount = 1u
        submitInfo.pCommandBufferInfos = &commandBufferInfo
        let submitResult = TrackResult(diagnostics, 380uL + serial,
            queueSubmit(queue, 1u, &submitInfo, target.CompletionFence))
        target.MarkSubmitted(submitResult)
        if submitResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkQueueSubmit2 failed for sampled image frame")
        }
        submitted = true
        imageResources.MarkUsed(imageId, generation, serial)
    } catch (error Exception) {
        if !submitted {
            target.AbortPrepared()
        }
        throw error
    }
}

internal func WaitVulkanImageFrame(target VulkanOffscreenTarget) {
    let deadline = Environment.TickCount64 + 5000L
    var completion = target.PollCompletion()
    while completion == VkConstants.VK_NOT_READY && Environment.TickCount64 < deadline {
        Thread.Sleep(1)
        completion = target.PollCompletion()
    }
    if completion != VkConstants.VK_SUCCESS {
        throw InvalidOperationException("Vulkan sampled image frame did not complete")
    }
}

private unsafe func VulkanImageExactPixel(
    readback *uint8,
    width uint32,
    x int32,
    y int32,
    red uint32,
    green uint32,
    blue uint32,
    alpha uint32) bool {
    let offset = uint64(y) * uint64(width) * 4uL + uint64(x) * 4uL
    return readback[offset] == uint8(red)
        && readback[offset + 1uL] == uint8(green)
        && readback[offset + 2uL] == uint8(blue)
        && readback[offset + 3uL] == uint8(alpha)
}

private unsafe func VulkanImageNearPixel(
    readback *uint8,
    width uint32,
    x int32,
    y int32,
    red int32,
    green int32,
    blue int32,
    alpha int32,
    tolerance int32) bool {
    let offset = uint64(y) * uint64(width) * 4uL + uint64(x) * 4uL
    let redDelta = int32(readback[offset]) - red
    let greenDelta = int32(readback[offset + 1uL]) - green
    let blueDelta = int32(readback[offset + 2uL]) - blue
    let alphaDelta = int32(readback[offset + 3uL]) - alpha
    return redDelta >= -tolerance && redDelta <= tolerance
        && greenDelta >= -tolerance && greenDelta <= tolerance
        && blueDelta >= -tolerance && blueDelta <= tolerance
        && alphaDelta >= -tolerance && alphaDelta <= tolerance
}
