package Goo

import System

internal enum VulkanOffscreenState {
    Idle;
    Prepared;
    Recorded;
    Pending;
    Complete;
}

internal unsafe sealed class VulkanOffscreenTarget : IDisposable {
    private const MaxClipDepth int32 = 64
    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let queue VkQueue
    private let commandPool VkCommandPool
    private let allocator VulkanMemoryAllocator
    private let extent VkExtent2D
    private let byteSize VkDeviceSize
    private let targetFormat VkFormat
    private let imageResources VulkanImageResources
    private let primitiveState VulkanSharedPrimitiveState
    private let textAtlases VulkanTextAtlasSet?
    private let resourceGeneration uint64
    private let objectAccounting VulkanObjectAccounting?
    private let diagnostics VulkanDiagnostics?
    private var image VkImage
    private var imageView VkImageView
    private var imageAllocation VulkanMemoryAllocation? = nil
    private var stagingBuffer VkBuffer
    private var stagingAllocation VulkanMemoryAllocation? = nil
    private var commandBuffer VkCommandBuffer
    private var completionFence VkFence
    private var imageLayout VkImageLayout
    private var state VulkanOffscreenState
    private var reservedFrame SceneFrame? = nil
    private var imageReferencesReserved bool
    private var imageAccounted bool
    private var imageViewAccounted bool
    private var stagingBufferAccounted bool
    private var completionFenceAccounted bool
    private var lastResult VkResult = VkConstants.VK_SUCCESS
    private var unsafeTeardown bool
    private var disposed bool
    private var primitiveRenderer VulkanPrimitiveRenderer? = nil

    internal prop Image VkImage { get { return image } }
    internal prop ImageView VkImageView { get { return imageView } }
    internal prop StagingBuffer VkBuffer { get { return stagingBuffer } }
    internal prop CommandBuffer VkCommandBuffer { get { return commandBuffer } }
    internal prop CompletionFence VkFence { get { return completionFence } }
    internal prop Extent VkExtent2D { get { return extent } }
    internal prop ByteSize VkDeviceSize { get { return byteSize } }
    internal prop TargetFormat VkFormat { get { return targetFormat } }
    internal prop State VulkanOffscreenState { get { return state } }
    internal prop LastResult VkResult { get { return lastResult } }
    internal prop UnsafeTeardown bool { get { return unsafeTeardown } }
    internal prop ReadbackReady bool { get { return state == VulkanOffscreenState.Complete } }
    internal prop LiveObjectCount uint32 {
        get {
            var count uint32 = 0u
            if image != 0uL { count = count + 1u }
            if imageView != 0uL { count = count + 1u }
            if stagingBuffer != 0uL { count = count + 1u }
            if commandBuffer != nint(0) { count = count + 1u }
            if completionFence != 0uL { count = count + 1u }
            if let renderer = primitiveRenderer {
                count = count + renderer.LiveObjectCount
            }
            return count
        }
    }
    internal prop ReadbackPointer *void {
        get {
            if disposed {
                throw ObjectDisposedException("VulkanOffscreenTarget")
            }
            if state != VulkanOffscreenState.Complete {
                throw InvalidOperationException("Vulkan offscreen readback is not complete")
            }
            guard let allocation = stagingAllocation else {
                throw InvalidOperationException("Vulkan offscreen staging allocation is unavailable")
            }
            if allocation.mapped == nil {
                throw InvalidOperationException("Vulkan offscreen staging allocation is not mapped")
            }
            return allocation.mapped
        }
    }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        nativeQueue VkQueue,
        nativeCommandPool VkCommandPool,
        nativeAllocator VulkanMemoryAllocator,
        targetExtent VkExtent2D,
        colorFormat VkFormat,
        nativeImageResources VulkanImageResources?,
        expectedGeneration uint64,
        nativePrimitiveState VulkanSharedPrimitiveState?,
        nativeTextAtlases VulkanTextAtlasSet?,
        nativeObjectAccounting VulkanObjectAccounting?,
        nativeDiagnostics VulkanDiagnostics?) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan device is null", "nativeDevice")
        }
        if nativeQueue == nint(0) {
            throw ArgumentException("Vulkan queue is null", "nativeQueue")
        }
        if nativeCommandPool == 0uL {
            throw ArgumentException("Vulkan command pool is null", "nativeCommandPool")
        }
        if targetExtent.width == 0u || targetExtent.height == 0u {
            throw ArgumentOutOfRangeException("targetExtent")
        }
        if colorFormat != VkConstants.VK_FORMAT_R8G8B8A8_SRGB
            && colorFormat != VkConstants.VK_FORMAT_B8G8R8A8_SRGB {
            throw ArgumentException("Vulkan offscreen target requires an sRGB RGBA format", "colorFormat")
        }
        if uint64(targetExtent.width) > uint64.MaxValue / 4uL {
            throw OverflowException("Offscreen row byte size overflow")
        }
        let rowBytes = uint64(targetExtent.width) * 4uL
        if uint64(targetExtent.height) > uint64.MaxValue / rowBytes {
            throw OverflowException("Offscreen staging byte size overflow")
        }
        guard let sharedImages = nativeImageResources else {
            throw ArgumentNullException("nativeImageResources")
        }
        guard let sharedState = nativePrimitiveState else {
            throw ArgumentNullException("nativePrimitiveState")
        }
        if expectedGeneration == 0uL
            || sharedImages.Generation != expectedGeneration
            || sharedState.Generation != expectedGeneration {
            throw ArgumentOutOfRangeException("expectedGeneration")
        }
        device = nativeDevice
        dispatch = nativeDispatch
        queue = nativeQueue
        commandPool = nativeCommandPool
        allocator = nativeAllocator
        extent = targetExtent
        byteSize = VkDeviceSize(rowBytes * uint64(targetExtent.height))
        targetFormat = colorFormat
        imageResources = sharedImages
        primitiveState = sharedState
        textAtlases = nativeTextAtlases
        resourceGeneration = expectedGeneration
        objectAccounting = nativeObjectAccounting
        diagnostics = nativeDiagnostics
        imageLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
        state = VulkanOffscreenState.Idle
        imageReferencesReserved = false
        unsafeTeardown = false
        disposed = false
        Create()
    }

    internal func ReserveImageReferences(frame SceneFrame) {
        EnsureOpen()
        if state != VulkanOffscreenState.Prepared {
            throw InvalidOperationException("Vulkan offscreen image references require prepared work")
        }
        if frame == nil {
            throw ArgumentNullException("frame")
        }
        if imageReferencesReserved {
            guard let current = reservedFrame else {
                throw InvalidOperationException("Vulkan offscreen image reference state is invalid")
            }
            if current != frame {
                throw InvalidOperationException("Vulkan offscreen image references belong to another frame")
            }
            return
        }
        guard let renderer = primitiveRenderer else {
            throw InvalidOperationException("Vulkan offscreen primitive renderer is unavailable")
        }
        renderer.ReserveImageReferences(frame)
        reservedFrame = frame
        imageReferencesReserved = true
    }

    internal func PrepareSubmit() VkResult {
        EnsureOpen()
        if state == VulkanOffscreenState.Pending {
            lastResult = VkConstants.VK_NOT_READY
            return VkConstants.VK_NOT_READY
        }
        if state != VulkanOffscreenState.Idle && state != VulkanOffscreenState.Complete {
            throw InvalidOperationException("Vulkan offscreen target has prepared work")
        }
        let resetCommandBuffer = dispatch.vkResetCommandBuffer
        let commandResult = resetCommandBuffer(commandBuffer, VkCommandBufferResetFlags(0u))
        NoteResult(commandResult)
        if commandResult != VkConstants.VK_SUCCESS {
            return commandResult
        }
        let resetFences = dispatch.vkResetFences
        let fenceResult = resetFences(device, 1u, &completionFence)
        NoteResult(fenceResult)
        if fenceResult == VkConstants.VK_SUCCESS {
            state = VulkanOffscreenState.Prepared
        }
        return fenceResult
    }

    internal func RecordScene(frame SceneFrame, clearColor VkClearColorValue) {
        EnsureOpen()
        if state != VulkanOffscreenState.Prepared {
            throw InvalidOperationException("PrepareSubmit must precede RecordScene")
        }
        if frame == nil {
            throw ArgumentNullException("frame")
        }
        if frame.ActiveChunk >= 0 {
            throw InvalidOperationException("Vulkan offscreen recording requires a closed scene frame")
        }
        let previousLayout = imageLayout
        var renderingActive = false
        try {
            ReserveImageReferences(frame)
            BeginRecord()
            BeginRendering(clearColor)
            renderingActive = true
            guard let renderer = primitiveRenderer else {
                throw InvalidOperationException("Vulkan offscreen primitive renderer is unavailable")
            }
            renderer.RecordInsideRendering(commandBuffer, frame, extent)
            EndRendering()
            renderingActive = false
            FinishRecord()
            let endCommandBuffer = dispatch.vkEndCommandBuffer
            let endResult = endCommandBuffer(commandBuffer)
            NoteResult(endResult)
            if endResult != VkConstants.VK_SUCCESS {
                throw InvalidOperationException("vkEndCommandBuffer failed: " + endResult.ToString())
            }
            state = VulkanOffscreenState.Recorded
        } catch (error Exception) {
            if renderingActive {
                try { EndRendering() } catch (cleanup Exception) { }
            }
            let resetCommandBuffer = dispatch.vkResetCommandBuffer
            let resetResult = resetCommandBuffer(commandBuffer, VkCommandBufferResetFlags(0u))
            NoteResult(resetResult)
            if resetResult != VkConstants.VK_SUCCESS {
                throw InvalidOperationException("vkResetCommandBuffer failed while aborting offscreen record: "
                    + resetResult.ToString())
            }
            imageLayout = previousLayout
            ReleaseReservedImageReferences()
            state = VulkanOffscreenState.Idle
            throw error
        }
    }

    internal func Submit() VkResult {
        EnsureOpen()
        if state != VulkanOffscreenState.Recorded {
            throw InvalidOperationException("Vulkan offscreen commands are not recorded")
        }
        var commandInfo = VkCommandBufferSubmitInfo{}
        commandInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_BUFFER_SUBMIT_INFO
        commandInfo.commandBuffer = commandBuffer
        var submitInfo = VkSubmitInfo2{}
        submitInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SUBMIT_INFO_2
        submitInfo.commandBufferInfoCount = 1u
        submitInfo.pCommandBufferInfos = &commandInfo
        let queueSubmit = dispatch.vkQueueSubmit2
        let result = queueSubmit(queue, 1u, &submitInfo, completionFence)
        return MarkSubmitted(result)
    }

    internal func MarkSubmitted(result VkResult) VkResult {
        EnsureOpen()
        if state != VulkanOffscreenState.Recorded {
            throw InvalidOperationException("Vulkan offscreen commands are not ready for submission")
        }
        NoteResult(result)
        if result == VkConstants.VK_SUCCESS {
            imageLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL
            state = VulkanOffscreenState.Pending
            return result
        }
        let resetCommandBuffer = dispatch.vkResetCommandBuffer
        let resetResult = resetCommandBuffer(commandBuffer, VkCommandBufferResetFlags(0u))
        NoteResult(resetResult)
        ReleaseReservedImageReferences()
        if resetResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkResetCommandBuffer failed after offscreen submit failure: "
                + resetResult.ToString())
        }
        state = VulkanOffscreenState.Idle
        return result
    }

    internal func AbortPrepared() {
        EnsureOpen()
        if state == VulkanOffscreenState.Pending {
            throw InvalidOperationException("Submitted Vulkan offscreen work cannot be aborted")
        }
        if state == VulkanOffscreenState.Idle || state == VulkanOffscreenState.Complete {
            return
        }
        let resetCommandBuffer = dispatch.vkResetCommandBuffer
        let result = resetCommandBuffer(commandBuffer, VkCommandBufferResetFlags(0u))
        NoteResult(result)
        if result != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkResetCommandBuffer failed while aborting offscreen work: "
                + result.ToString())
        }
        ReleaseReservedImageReferences()
        state = VulkanOffscreenState.Idle
    }

    internal func PollCompletion() VkResult {
        EnsureOpen()
        if state == VulkanOffscreenState.Complete {
            lastResult = VkConstants.VK_SUCCESS
            return VkConstants.VK_SUCCESS
        }
        if state != VulkanOffscreenState.Pending {
            lastResult = VkConstants.VK_NOT_READY
            return VkConstants.VK_NOT_READY
        }
        let getFenceStatus = dispatch.vkGetFenceStatus
        let status = getFenceStatus(device, completionFence)
        NoteResult(status)
        if status != VkConstants.VK_SUCCESS {
            if status != VkConstants.VK_NOT_READY {
                unsafeTeardown = true
            }
            return status
        }
        guard let allocation = stagingAllocation else {
            throw InvalidOperationException("Vulkan offscreen staging allocation is unavailable")
        }
        let invalidateResult = allocator.InvalidateAfterFence(allocation, 0uL, byteSize)
        NoteResult(invalidateResult)
        if invalidateResult != VkConstants.VK_SUCCESS {
            return invalidateResult
        }
        state = VulkanOffscreenState.Complete
        ReleaseReservedImageReferences()
        if let currentDiagnostics = diagnostics {
            currentDiagnostics.AddReadback(1uL)
        }
        return VkConstants.VK_SUCCESS
    }

    public func Dispose() {
        if disposed {
            return
        }
        if unsafeTeardown {
            throw InvalidOperationException("Vulkan offscreen target cannot safely tear down after a failed fence operation: "
                + lastResult.ToString())
        }
        if state == VulkanOffscreenState.Pending {
            let waitForFences = dispatch.vkWaitForFences
            let waitResult = waitForFences(device, 1u, &completionFence,
                VkConstants.VK_TRUE, VkConstants.VK_WHOLE_SIZE)
            NoteResult(waitResult)
            if waitResult != VkConstants.VK_SUCCESS {
                unsafeTeardown = true
                throw InvalidOperationException("vkWaitForFences failed for Vulkan offscreen submission: "
                    + waitResult.ToString())
            }
            let completion = PollCompletion()
            if completion != VkConstants.VK_SUCCESS {
                throw InvalidOperationException("Vulkan offscreen readback completion failed: "
                    + completion.ToString())
            }
        }
        if state == VulkanOffscreenState.Prepared || state == VulkanOffscreenState.Recorded {
            AbortPrepared()
        }
        if unsafeTeardown {
            throw InvalidOperationException("Vulkan offscreen target cannot safely tear down after a failed fence operation: "
                + lastResult.ToString())
        }
        ReleaseReservedImageReferences()
        if let renderer = primitiveRenderer {
            renderer.Dispose()
            primitiveRenderer = nil
        }
        if completionFence != 0uL {
            let destroyFence = dispatch.vkDestroyFence
            destroyFence(device, completionFence, nil)
            completionFence = 0uL
            if completionFenceAccounted {
                if let accounting = objectAccounting { accounting.Release() }
                completionFenceAccounted = false
            }
        }
        if stagingBuffer != 0uL {
            let destroyBuffer = dispatch.vkDestroyBuffer
            destroyBuffer(device, stagingBuffer, nil)
            stagingBuffer = 0uL
            if stagingBufferAccounted {
                if let accounting = objectAccounting { accounting.Release() }
                stagingBufferAccounted = false
            }
        }
        if stagingAllocation != nil {
            allocator.Release(stagingAllocation!!)
            stagingAllocation = nil
        }
        if imageView != 0uL {
            let destroyImageView = dispatch.vkDestroyImageView
            destroyImageView(device, imageView, nil)
            imageView = 0uL
            if imageViewAccounted {
                if let accounting = objectAccounting { accounting.Release() }
                imageViewAccounted = false
            }
        }
        if image != 0uL {
            let destroyImage = dispatch.vkDestroyImage
            destroyImage(device, image, nil)
            image = 0uL
            if imageAccounted {
                if let accounting = objectAccounting { accounting.Release() }
                imageAccounted = false
            }
        }
        if imageAllocation != nil {
            allocator.Release(imageAllocation!!)
            imageAllocation = nil
        }
        commandBuffer = nint(0)
        disposed = true
    }

    private func BeginRecord() {
        if state != VulkanOffscreenState.Prepared {
            throw InvalidOperationException("Vulkan offscreen recording is not prepared")
        }
        var subresourceRange = VkImageSubresourceRange{}
        subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
        subresourceRange.baseMipLevel = 0u
        subresourceRange.levelCount = 1u
        subresourceRange.baseArrayLayer = 0u
        subresourceRange.layerCount = 1u
        var barrier = VkImageMemoryBarrier2{}
        barrier.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
        if imageLayout == VkConstants.VK_IMAGE_LAYOUT_UNDEFINED {
            barrier.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT
            barrier.srcAccessMask = VkConstants.VK_ACCESS_2_NONE
        } else if imageLayout == VkConstants.VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL {
            barrier.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_COPY_BIT
            barrier.srcAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_READ_BIT
        } else {
            throw InvalidOperationException("Vulkan offscreen image has an unsupported layout")
        }
        barrier.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT
        barrier.dstAccessMask = VkConstants.VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT
        barrier.oldLayout = imageLayout
        barrier.newLayout = VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL
        barrier.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        barrier.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        barrier.image = image
        barrier.subresourceRange = subresourceRange
        var dependency = VkDependencyInfo{}
        dependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
        dependency.imageMemoryBarrierCount = 1u
        dependency.pImageMemoryBarriers = &barrier
        let pipelineBarrier = dispatch.vkCmdPipelineBarrier2
        pipelineBarrier(commandBuffer, &dependency)
    }

    private func FinishRecord() {
        var subresourceRange = VkImageSubresourceRange{}
        subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
        subresourceRange.baseMipLevel = 0u
        subresourceRange.levelCount = 1u
        subresourceRange.baseArrayLayer = 0u
        subresourceRange.layerCount = 1u
        var barrier = VkImageMemoryBarrier2{}
        barrier.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
        barrier.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT
        barrier.srcAccessMask = VkConstants.VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT
        barrier.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_COPY_BIT
        barrier.dstAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_READ_BIT
        barrier.oldLayout = VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL
        barrier.newLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL
        barrier.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        barrier.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        barrier.image = image
        barrier.subresourceRange = subresourceRange
        var dependency = VkDependencyInfo{}
        dependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
        dependency.imageMemoryBarrierCount = 1u
        dependency.pImageMemoryBarriers = &barrier
        let pipelineBarrier = dispatch.vkCmdPipelineBarrier2
        pipelineBarrier(commandBuffer, &dependency)
        var copyRegion = VkBufferImageCopy{}
        copyRegion.bufferOffset = 0uL
        copyRegion.bufferRowLength = 0u
        copyRegion.bufferImageHeight = 0u
        copyRegion.imageSubresource = VkImageSubresourceLayers{}
        copyRegion.imageSubresource.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
        copyRegion.imageSubresource.mipLevel = 0u
        copyRegion.imageSubresource.baseArrayLayer = 0u
        copyRegion.imageSubresource.layerCount = 1u
        copyRegion.imageOffset = VkOffset3D{}
        copyRegion.imageExtent = VkExtent3D{}
        copyRegion.imageExtent.width = extent.width
        copyRegion.imageExtent.height = extent.height
        copyRegion.imageExtent.depth = 1u
        let copyImageToBuffer = dispatch.vkCmdCopyImageToBuffer
        copyImageToBuffer(commandBuffer, image, VkConstants.VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL,
            stagingBuffer, 1u, &copyRegion)
    }

    private func BeginRendering(clearColor VkClearColorValue) {
        var clearValue = VkClearValue{}
        clearValue.color = clearColor
        var attachment = VkRenderingAttachmentInfo{}
        attachment.sType = VkConstants.VK_STRUCTURE_TYPE_RENDERING_ATTACHMENT_INFO
        attachment.imageView = imageView
        attachment.imageLayout = VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL
        attachment.resolveMode = VkConstants.VK_RESOLVE_MODE_NONE
        attachment.resolveImageView = 0uL
        attachment.resolveImageLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
        attachment.loadOp = VkConstants.VK_ATTACHMENT_LOAD_OP_CLEAR
        attachment.storeOp = VkConstants.VK_ATTACHMENT_STORE_OP_STORE
        attachment.clearValue = clearValue
        var rendering = VkRenderingInfo{}
        rendering.sType = VkConstants.VK_STRUCTURE_TYPE_RENDERING_INFO
        rendering.renderArea = VkRect2D{}
        rendering.renderArea.offset = VkOffset2D{}
        rendering.renderArea.extent = extent
        rendering.layerCount = 1u
        rendering.viewMask = 0u
        rendering.colorAttachmentCount = 1u
        rendering.pColorAttachments = &attachment
        rendering.pDepthAttachment = nil
        rendering.pStencilAttachment = nil
        let beginRendering = dispatch.vkCmdBeginRendering
        beginRendering(commandBuffer, &rendering)
    }

    private func EndRendering() {
        let endRendering = dispatch.vkCmdEndRendering
        endRendering(commandBuffer)
    }

    private func ReleaseReservedImageReferences() {
        if !imageReferencesReserved {
            return
        }
        let frame = reservedFrame
        reservedFrame = nil
        imageReferencesReserved = false
        if let value = frame {
            if let renderer = primitiveRenderer {
                renderer.ReleaseImageReferences(value)
            }
        }
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanOffscreenTarget")
        }
    }

    private func NoteResult(result VkResult) {
        lastResult = result
        if result == VkConstants.VK_ERROR_DEVICE_LOST {
            unsafeTeardown = true
        }
    }

    private func Create() {
        try {
            var imageCreateInfo = VkImageCreateInfo{}
            imageCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO
            imageCreateInfo.imageType = VkConstants.VK_IMAGE_TYPE_2D
            imageCreateInfo.format = targetFormat
            imageCreateInfo.extent = VkExtent3D{}
            imageCreateInfo.extent.width = extent.width
            imageCreateInfo.extent.height = extent.height
            imageCreateInfo.extent.depth = 1u
            imageCreateInfo.mipLevels = 1u
            imageCreateInfo.arrayLayers = 1u
            imageCreateInfo.samples = VkConstants.VK_SAMPLE_COUNT_1_BIT
            imageCreateInfo.tiling = VkConstants.VK_IMAGE_TILING_OPTIMAL
            imageCreateInfo.usage = uint32(VkConstants.VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT)
                | uint32(VkConstants.VK_IMAGE_USAGE_TRANSFER_SRC_BIT)
            imageCreateInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
            imageCreateInfo.initialLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
            let createImage = dispatch.vkCreateImage
            let imageResult = createImage(device, &imageCreateInfo, nil, &image)
            NoteResult(imageResult)
            if imageResult != VkConstants.VK_SUCCESS || image == 0uL {
                throw InvalidOperationException("vkCreateImage failed: " + imageResult.ToString())
            }
            try {
                if let accounting = objectAccounting {
                    accounting.Allocate()
                    imageAccounted = true
                }
            } catch (error Exception) {
                let destroyImage = dispatch.vkDestroyImage
                destroyImage(device, image, nil)
                image = 0uL
                throw error
            }
            imageAllocation = allocator.AllocateImage(image,
                uint32(VkConstants.VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT),
                uint32(VkConstants.VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT))

            var viewCreateInfo = VkImageViewCreateInfo{}
            viewCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO
            viewCreateInfo.image = image
            viewCreateInfo.viewType = VkConstants.VK_IMAGE_VIEW_TYPE_2D
            viewCreateInfo.format = targetFormat
            viewCreateInfo.components = VkComponentMapping{}
            viewCreateInfo.components.r = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
            viewCreateInfo.components.g = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
            viewCreateInfo.components.b = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
            viewCreateInfo.components.a = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
            viewCreateInfo.subresourceRange = VkImageSubresourceRange{}
            viewCreateInfo.subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
            viewCreateInfo.subresourceRange.baseMipLevel = 0u
            viewCreateInfo.subresourceRange.levelCount = 1u
            viewCreateInfo.subresourceRange.baseArrayLayer = 0u
            viewCreateInfo.subresourceRange.layerCount = 1u
            let createImageView = dispatch.vkCreateImageView
            let viewResult = createImageView(device, &viewCreateInfo, nil, &imageView)
            NoteResult(viewResult)
            if viewResult != VkConstants.VK_SUCCESS || imageView == 0uL {
                throw InvalidOperationException("vkCreateImageView failed: " + viewResult.ToString())
            }
            try {
                if let accounting = objectAccounting {
                    accounting.Allocate()
                    imageViewAccounted = true
                }
            } catch (error Exception) {
                let destroyImageView = dispatch.vkDestroyImageView
                destroyImageView(device, imageView, nil)
                imageView = 0uL
                throw error
            }

            var bufferCreateInfo = VkBufferCreateInfo{}
            bufferCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO
            bufferCreateInfo.size = byteSize
            bufferCreateInfo.usage = uint32(VkConstants.VK_BUFFER_USAGE_TRANSFER_DST_BIT)
            bufferCreateInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
            let createBuffer = dispatch.vkCreateBuffer
            let bufferResult = createBuffer(device, &bufferCreateInfo, nil, &stagingBuffer)
            NoteResult(bufferResult)
            if bufferResult != VkConstants.VK_SUCCESS || stagingBuffer == 0uL {
                throw InvalidOperationException("vkCreateBuffer failed: " + bufferResult.ToString())
            }
            try {
                if let accounting = objectAccounting {
                    accounting.Allocate()
                    stagingBufferAccounted = true
                }
            } catch (error Exception) {
                let destroyBuffer = dispatch.vkDestroyBuffer
                destroyBuffer(device, stagingBuffer, nil)
                stagingBuffer = 0uL
                throw error
            }
            stagingAllocation = allocator.AllocateBuffer(stagingBuffer,
                uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT)
                    | uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT),
                uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_CACHED_BIT))
            let mapResult = allocator.Map(stagingAllocation!!)
            NoteResult(mapResult)
            if mapResult != VkConstants.VK_SUCCESS {
                throw InvalidOperationException("vkMapMemory failed: " + mapResult.ToString())
            }

            var fenceCreateInfo = VkFenceCreateInfo{}
            fenceCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_FENCE_CREATE_INFO
            fenceCreateInfo.flags = uint32(VkConstants.VK_FENCE_CREATE_SIGNALED_BIT)
            let createFence = dispatch.vkCreateFence
            let fenceResult = createFence(device, &fenceCreateInfo, nil, &completionFence)
            NoteResult(fenceResult)
            if fenceResult != VkConstants.VK_SUCCESS || completionFence == 0uL {
                throw InvalidOperationException("vkCreateFence failed: " + fenceResult.ToString())
            }
            try {
                if let accounting = objectAccounting {
                    accounting.Allocate()
                    completionFenceAccounted = true
                }
            } catch (error Exception) {
                let destroyFence = dispatch.vkDestroyFence
                destroyFence(device, completionFence, nil)
                completionFence = 0uL
                throw error
            }

            let commandBuffers *VkCommandBuffer = stackalloc [1]VkCommandBuffer
            var allocateInfo = VkCommandBufferAllocateInfo{}
            allocateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO
            allocateInfo.commandPool = commandPool
            allocateInfo.level = VkConstants.VK_COMMAND_BUFFER_LEVEL_PRIMARY
            allocateInfo.commandBufferCount = 1u
            let allocateCommandBuffers = dispatch.vkAllocateCommandBuffers
            let commandResult = allocateCommandBuffers(device, &allocateInfo, commandBuffers)
            NoteResult(commandResult)
            if commandResult != VkConstants.VK_SUCCESS || commandBuffers[0] == nint(0) {
                throw InvalidOperationException("vkAllocateCommandBuffers failed: " + commandResult.ToString())
            }
            commandBuffer = commandBuffers[0]
            primitiveRenderer = VulkanPrimitiveRenderer(
                device,
                dispatch,
                targetFormat,
                MaxClipDepth,
                imageResources,
                resourceGeneration,
                primitiveState,
                textAtlases,
                objectAccounting)
        } catch (error Exception) {
            try { Dispose() } catch (cleanup Exception) { }
            throw error
        }
    }
}
