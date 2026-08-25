package Goo

import System

internal unsafe sealed class VulkanReadbackDispatch {
    private let copyImageToBufferAddress nint

    internal init(nativeAddress nint) {
        if nativeAddress == nint(0) {
            throw ArgumentException("Vulkan copy command is null", "nativeAddress")
        }
        copyImageToBufferAddress = nativeAddress
    }

    internal func CopyImageToBuffer(commandBuffer VkCommandBuffer, image VkImage,
        imageLayout VkImageLayout, buffer VkBuffer, region VkBufferImageCopy) {
        let copy = copyImageToBufferAddress as (unmanaged[Cdecl] (VkCommandBuffer, VkImage,
            VkImageLayout, VkBuffer, uint32, *VkBufferImageCopy) -> void)?
        if copy == nil {
            throw InvalidOperationException("vkCmdCopyImageToBuffer has an invalid address")
        }
        let copyFunction = copy!!
        var copyRegion = region
        copyFunction(commandBuffer, image, imageLayout, buffer, 1u, &copyRegion)
    }
}
