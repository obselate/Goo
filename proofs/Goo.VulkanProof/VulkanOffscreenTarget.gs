package Goo.VulkanProof

import System
import Goo.Vulkan.Generated

internal unsafe class VulkanOffscreenTarget : IDisposable {
    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let allocator VulkanMemoryAllocator
    private let extent VkExtent2D
    private let byteSize VkDeviceSize
    private var image VkImage
    private var imageView VkImageView
    private var imageAllocation VulkanMemoryAllocation? = nil
    private var stagingBuffer VkBuffer
    private var stagingAllocation VulkanMemoryAllocation? = nil
    private var completionFence VkFence
    private var solidQuad VulkanSolidQuad? = nil
    private var imageLayout VkImageLayout
    private var requestPrepared bool
    private var commandRecorded bool
    private var submissionPending bool
    private var readbackComplete bool
    private var disposed bool

    internal prop Image VkImage { get { return image } }
    internal prop ImageView VkImageView { get { return imageView } }
    internal prop StagingBuffer VkBuffer { get { return stagingBuffer } }
    internal prop CompletionFence VkFence { get { return completionFence } }
    internal prop Extent VkExtent2D { get { return extent } }
    internal prop ByteSize VkDeviceSize { get { return byteSize } }
    internal prop ReadbackReady bool { get { return readbackComplete } }
    internal prop ReadbackPointer *void {
        get {
            if !readbackComplete {
                throw InvalidOperationException("Vulkan offscreen readback is not complete")
            }
            return stagingAllocation!!.mapped
        }
    }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        nativeAllocator VulkanMemoryAllocator,
        targetExtent VkExtent2D) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan device is null", "nativeDevice")
        }
        if targetExtent.width == 0u || targetExtent.height == 0u {
            throw ArgumentOutOfRangeException("targetExtent")
        }
        if uint64(targetExtent.width) > uint64.MaxValue / 4uL {
            throw OverflowException("Offscreen row byte size overflow")
        }
        let rowBytes = uint64(targetExtent.width) * 4uL
        if uint64(targetExtent.height) > uint64.MaxValue / rowBytes {
            throw OverflowException("Offscreen staging byte size overflow")
        }
        this.device = nativeDevice
        this.dispatch = nativeDispatch
        this.allocator = nativeAllocator
        this.extent = targetExtent
        this.byteSize = VkDeviceSize(rowBytes * uint64(targetExtent.height))
        this.imageLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
        Create()
    }

    internal func PrepareSubmit() VkResult {
        if disposed {
            throw ObjectDisposedException("VulkanOffscreenTarget")
        }
        if submissionPending {
            return VkConstants.VK_NOT_READY
        }
        if requestPrepared || commandRecorded {
            throw InvalidOperationException("Vulkan offscreen request is already prepared")
        }
        let resetFences = dispatch.vkResetFences
        let result = resetFences(device, 1u, &completionFence)
        if result == VkConstants.VK_SUCCESS {
            requestPrepared = true
            commandRecorded = false
            readbackComplete = false
        }
        return result
    }

    internal func Record(
        commandBuffer VkCommandBuffer,
        clearColor VkClearColorValue,
        pushConstants SolidQuadPushConstants) {
        if disposed {
            throw ObjectDisposedException("VulkanOffscreenTarget")
        }
        if commandBuffer == nint(0) {
            throw ArgumentException("Command buffer is null", "commandBuffer")
        }
        if !requestPrepared {
            throw InvalidOperationException("PrepareSubmit must precede Record")
        }
        if commandRecorded {
            throw InvalidOperationException("Vulkan offscreen command buffer is already recorded")
        }
        var subresourceRange = VkImageSubresourceRange{}
        subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
        subresourceRange.baseMipLevel = 0u
        subresourceRange.levelCount = 1u
        subresourceRange.baseArrayLayer = 0u
        subresourceRange.layerCount = 1u

        var toColorAttachment = VkImageMemoryBarrier2{}
        toColorAttachment.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
        if imageLayout == VkConstants.VK_IMAGE_LAYOUT_UNDEFINED {
            toColorAttachment.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT
            toColorAttachment.srcAccessMask = VkConstants.VK_ACCESS_2_NONE
        } else if imageLayout == VkConstants.VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL {
            toColorAttachment.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_COPY_BIT
            toColorAttachment.srcAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_READ_BIT
        } else {
            throw InvalidOperationException("Vulkan offscreen image has an unsupported layout")
        }
        toColorAttachment.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT
        toColorAttachment.dstAccessMask = VkConstants.VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT
        toColorAttachment.oldLayout = imageLayout
        toColorAttachment.newLayout = VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL
        toColorAttachment.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        toColorAttachment.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        toColorAttachment.image = image
        toColorAttachment.subresourceRange = subresourceRange

        var firstDependency = VkDependencyInfo{}
        firstDependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
        firstDependency.imageMemoryBarrierCount = 1u
        firstDependency.pImageMemoryBarriers = &toColorAttachment
        let pipelineBarrier = dispatch.vkCmdPipelineBarrier2
        pipelineBarrier(commandBuffer, &firstDependency)

        solidQuad!!.Record(commandBuffer, imageView, extent, clearColor, pushConstants)

        var toTransferSource = VkImageMemoryBarrier2{}
        toTransferSource.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
        toTransferSource.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT
        toTransferSource.srcAccessMask = VkConstants.VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT
        toTransferSource.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_COPY_BIT
        toTransferSource.dstAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_READ_BIT
        toTransferSource.oldLayout = VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL
        toTransferSource.newLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL
        toTransferSource.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        toTransferSource.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        toTransferSource.image = image
        toTransferSource.subresourceRange = subresourceRange

        var secondDependency = VkDependencyInfo{}
        secondDependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
        secondDependency.imageMemoryBarrierCount = 1u
        secondDependency.pImageMemoryBarriers = &toTransferSource
        pipelineBarrier(commandBuffer, &secondDependency)

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

        commandRecorded = true
    }

    internal func MarkSubmitted(result VkResult) VkResult {
        if disposed {
            throw ObjectDisposedException("VulkanOffscreenTarget")
        }
        if !requestPrepared || !commandRecorded {
            throw InvalidOperationException("Vulkan offscreen commands are not ready for submission")
        }
        requestPrepared = false
        commandRecorded = false
        if result == VkConstants.VK_SUCCESS {
            submissionPending = true
            imageLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL
        }
        return result
    }

    internal func AbortPrepared() {
        if submissionPending {
            throw InvalidOperationException("Submitted Vulkan offscreen work cannot be aborted")
        }
        requestPrepared = false
        commandRecorded = false
        readbackComplete = false
    }

    internal func PollCompletion() VkResult {
        if disposed {
            throw ObjectDisposedException("VulkanOffscreenTarget")
        }
        if readbackComplete {
            return VkConstants.VK_SUCCESS
        }
        if !submissionPending {
            return VkConstants.VK_NOT_READY
        }
        let getFenceStatus = dispatch.vkGetFenceStatus
        let status = getFenceStatus(device, completionFence)
        if status != VkConstants.VK_SUCCESS {
            return status
        }
        let invalidateResult = allocator.InvalidateAfterFence(stagingAllocation!!)
        if invalidateResult != VkConstants.VK_SUCCESS {
            return invalidateResult
        }
        readbackComplete = true
        submissionPending = false
        return VkConstants.VK_SUCCESS
    }

    public func Dispose() {
        if disposed {
            return
        }
        if submissionPending {
            let completion = PollCompletion()
            if completion != VkConstants.VK_SUCCESS {
                throw InvalidOperationException("Vulkan offscreen submission is still pending")
            }
        }
        disposed = true
        if solidQuad != nil {
            solidQuad!!.Dispose()
            solidQuad = nil
        }
        if imageView != 0uL {
            let destroyImageView = dispatch.vkDestroyImageView
            destroyImageView(device, imageView, nil)
            imageView = 0uL
        }
        if image != 0uL {
            let destroyImage = dispatch.vkDestroyImage
            destroyImage(device, image, nil)
            image = 0uL
        }
        if imageAllocation != nil {
            allocator.Release(imageAllocation!!)
            imageAllocation = nil
        }
        if stagingBuffer != 0uL {
            let destroyBuffer = dispatch.vkDestroyBuffer
            destroyBuffer(device, stagingBuffer, nil)
            stagingBuffer = 0uL
        }
        if stagingAllocation != nil {
            allocator.Release(stagingAllocation!!)
            stagingAllocation = nil
        }
        if completionFence != 0uL {
            let destroyFence = dispatch.vkDestroyFence
            destroyFence(device, completionFence, nil)
            completionFence = 0uL
        }
    }

    private func Create() {
        try {
            var imageCreateInfo = VkImageCreateInfo{}
            imageCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO
            imageCreateInfo.imageType = VkConstants.VK_IMAGE_TYPE_2D
            imageCreateInfo.format = VkConstants.VK_FORMAT_R8G8B8A8_UNORM
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
            if createImage(device, &imageCreateInfo, nil, &image) != VkConstants.VK_SUCCESS || image == 0uL {
                throw InvalidOperationException("vkCreateImage failed")
            }
            imageAllocation = allocator.AllocateImage(image, 0u, uint32(VkConstants.VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT))

            var imageViewCreateInfo = VkImageViewCreateInfo{}
            imageViewCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO
            imageViewCreateInfo.image = image
            imageViewCreateInfo.viewType = VkConstants.VK_IMAGE_VIEW_TYPE_2D
            imageViewCreateInfo.format = VkConstants.VK_FORMAT_R8G8B8A8_UNORM
            imageViewCreateInfo.components = VkComponentMapping{}
            imageViewCreateInfo.components.r = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
            imageViewCreateInfo.components.g = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
            imageViewCreateInfo.components.b = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
            imageViewCreateInfo.components.a = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
            imageViewCreateInfo.subresourceRange = VkImageSubresourceRange{}
            imageViewCreateInfo.subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
            imageViewCreateInfo.subresourceRange.levelCount = 1u
            imageViewCreateInfo.subresourceRange.layerCount = 1u
            let createImageView = dispatch.vkCreateImageView
            if createImageView(device, &imageViewCreateInfo, nil, &imageView) != VkConstants.VK_SUCCESS || imageView == 0uL {
                throw InvalidOperationException("vkCreateImageView failed")
            }

            var bufferCreateInfo = VkBufferCreateInfo{}
            bufferCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO
            bufferCreateInfo.size = byteSize
            bufferCreateInfo.usage = uint32(VkConstants.VK_BUFFER_USAGE_TRANSFER_DST_BIT)
            bufferCreateInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
            let createBuffer = dispatch.vkCreateBuffer
            if createBuffer(device, &bufferCreateInfo, nil, &stagingBuffer) != VkConstants.VK_SUCCESS || stagingBuffer == 0uL {
                throw InvalidOperationException("vkCreateBuffer failed")
            }
            stagingAllocation = allocator.AllocateBuffer(stagingBuffer,
                uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT),
                uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)
                    | uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_CACHED_BIT))
            let mapResult = allocator.Map(stagingAllocation!!)
            if mapResult != VkConstants.VK_SUCCESS {
                throw InvalidOperationException("vkMapMemory failed")
            }

            var fenceCreateInfo = VkFenceCreateInfo{}
            fenceCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_FENCE_CREATE_INFO
            fenceCreateInfo.flags = uint32(VkConstants.VK_FENCE_CREATE_SIGNALED_BIT)
            let createFence = dispatch.vkCreateFence
            if createFence(device, &fenceCreateInfo, nil, &completionFence) != VkConstants.VK_SUCCESS || completionFence == 0uL {
                throw InvalidOperationException("vkCreateFence failed")
            }
            solidQuad = VulkanSolidQuad(device, dispatch, VkConstants.VK_FORMAT_R8G8B8A8_UNORM)
        } catch (error Exception) {
            Dispose()
            throw error
        }
    }
}
