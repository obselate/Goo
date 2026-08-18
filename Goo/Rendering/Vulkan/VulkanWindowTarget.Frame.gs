package Goo

internal unsafe partial class VulkanWindowTarget {
    private func BeginRendering(
        current VulkanSwapchainGeneration,
        slot VulkanFrameSlot,
        imageIndex uint32) {
        var beginInfo = VkCommandBufferBeginInfo{}
        beginInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO
        beginInfo.flags = uint32(VkConstants.VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT)
        let beginCommandBuffer = dispatch.vkBeginCommandBuffer
        let beginResult = beginCommandBuffer(slot.CommandBuffer, &beginInfo)
        if beginResult != VkConstants.VK_SUCCESS {
            HandleFrameFailure(beginResult)
            ClearActiveFrame()
            return
        }
        let image = current.Image(imageIndex)
        let oldLayout = current.CurrentLayout(imageIndex)
        var subresourceRange = VkImageSubresourceRange{}
        subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
        subresourceRange.baseMipLevel = 0u
        subresourceRange.levelCount = 1u
        subresourceRange.baseArrayLayer = 0u
        subresourceRange.layerCount = 1u
        var barrier = VkImageMemoryBarrier2{}
        barrier.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
        if oldLayout == VkConstants.VK_IMAGE_LAYOUT_UNDEFINED {
            barrier.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT
            barrier.srcAccessMask = VkConstants.VK_ACCESS_2_NONE
        } else if oldLayout == VkConstants.VK_IMAGE_LAYOUT_PRESENT_SRC_KHR {
            barrier.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_BOTTOM_OF_PIPE_BIT
            barrier.srcAccessMask = VkConstants.VK_ACCESS_2_NONE
        } else {
            throw InvalidOperationException("Vulkan swapchain image layout is invalid")
        }
        barrier.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT
        barrier.dstAccessMask = VkConstants.VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT
        barrier.oldLayout = oldLayout
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
        pipelineBarrier(slot.CommandBuffer, &dependency)
        var clear = VkClearValue{}
        clear.color.float32.values[0] = 0.0F
        clear.color.float32.values[1] = 0.0F
        clear.color.float32.values[2] = 0.0F
        clear.color.float32.values[3] = 0.0F
        var attachment = VkRenderingAttachmentInfo{}
        attachment.sType = VkConstants.VK_STRUCTURE_TYPE_RENDERING_ATTACHMENT_INFO
        attachment.imageView = current.ImageView(imageIndex)
        attachment.imageLayout = VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL
        attachment.resolveMode = VkConstants.VK_RESOLVE_MODE_NONE
        attachment.loadOp = VkConstants.VK_ATTACHMENT_LOAD_OP_CLEAR
        attachment.storeOp = VkConstants.VK_ATTACHMENT_STORE_OP_STORE
        attachment.clearValue = clear
        var rendering = VkRenderingInfo{}
        rendering.sType = VkConstants.VK_STRUCTURE_TYPE_RENDERING_INFO
        rendering.renderArea.offset = VkOffset2D{ x: 0, y: 0 }
        rendering.renderArea.extent = current.Extent
        rendering.layerCount = 1u
        rendering.colorAttachmentCount = 1u
        rendering.pColorAttachments = &attachment
        let beginRendering = dispatch.vkCmdBeginRendering
        beginRendering(slot.CommandBuffer, &rendering)
    }

    private func EndRendering(
        current VulkanSwapchainGeneration,
        slot VulkanFrameSlot) {
        let endRendering = dispatch.vkCmdEndRendering
        endRendering(slot.CommandBuffer)
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
        barrier.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_BOTTOM_OF_PIPE_BIT
        barrier.dstAccessMask = VkConstants.VK_ACCESS_2_NONE
        barrier.oldLayout = VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL
        barrier.newLayout = VkConstants.VK_IMAGE_LAYOUT_PRESENT_SRC_KHR
        barrier.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        barrier.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        barrier.image = current.Image(activeImageIndex)
        barrier.subresourceRange = subresourceRange
        var dependency = VkDependencyInfo{}
        dependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
        dependency.imageMemoryBarrierCount = 1u
        dependency.pImageMemoryBarriers = &barrier
        let pipelineBarrier = dispatch.vkCmdPipelineBarrier2
        pipelineBarrier(slot.CommandBuffer, &dependency)
    }
}
