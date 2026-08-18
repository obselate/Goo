package Goo

internal unsafe partial class VulkanWindowTarget {
    private var nextGenerationId uint64 = 1uL

    private func RecreateSwapchain(width int32, height int32) bool {
        if width <= 0 || height <= 0 {
            recreatePending = true
            return true
        }
        if !WaitForGpu() {
            return false
        }
        if surfaceLost {
            if !RecreateSurface() {
                return false
            }
            surfaceLost = false
        }
        var selection VulkanWindowTargetSelection = VulkanWindowTargetSelection{}
        if !TryQuerySelection(out selection) {
            if !RecreateSurface() {
                return false
            }
            surfaceLost = false
            if !TryQuerySelection(out selection) {
                return false
            }
        }
        let oldFormat = if let old = generation { old.Format } else { VkFormat(-1) }
        let generationId = nextGenerationId
        if nextGenerationId == uint64.MaxValue {
            throw OverflowException("Vulkan swapchain generation overflow")
        }
        nextGenerationId = nextGenerationId + 1uL
        if let old = generation {
            old.Dispose()
            generation = nil
        }
        if primitiveRenderer != nil && oldFormat != selection.Format.format {
            primitiveRenderer!!.Dispose()
            primitiveRenderer = nil
        }
        var desiredExtent = VkExtent2D{}
        desiredExtent.width = uint32(width)
        desiredExtent.height = uint32(height)
        let next = VulkanSwapchainGeneration(
            device,
            dispatch,
            surface,
            selection.Capabilities,
            selection.Format,
            selection.PresentMode,
            desiredExtent,
            selection.CompositeAlpha,
            0uL,
            generationId,
            swapchainMaintenanceVariant != VulkanSwapchainMaintenanceVariant.None)
        generation = next
        if primitiveRenderer == nil {
            primitiveRenderer = VulkanPrimitiveRenderer(
                device,
                dispatch,
                selection.Format.format,
                64,
                nil,
                generationId,
                textAtlas)
        }
        framebufferWidth = int32(next.Extent.width)
        framebufferHeight = int32(next.Extent.height)
        requestedWidth = width
        requestedHeight = height
        recreatePending = false
        return true
    }

    private func RecreateSurface() bool {
        if surfaceCreated && instance != nint(0) {
            host.DestroyVulkanSurface(instance, surface)
            surface = 0uL
            surfaceCreated = false
        }
        var createdSurface VkSurfaceKHR = 0uL
        if !host.CreateVulkanSurface(instance, out createdSurface) || createdSurface == 0uL {
            return false
        }
        surface = createdSurface
        surfaceCreated = true
        return true
    }

    private func TryQuerySelection(out selection VulkanWindowTargetSelection) bool {
        selection = VulkanWindowTargetSelection{}
        var capabilities = VkSurfaceCapabilitiesKHR{}
        let getSurfaceCapabilities = instanceDispatch.vkGetPhysicalDeviceSurfaceCapabilitiesKHR
        let capabilitiesResult = getSurfaceCapabilities(
            physicalDevice,
            surface,
            &capabilities)
        if capabilitiesResult == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
            surfaceLost = true
            return false
        }
        if capabilitiesResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("Vulkan surface capabilities query failed: " + capabilitiesResult.ToString())
        }
        if (capabilities.supportedUsageFlags & uint32(VkConstants.VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT)) == 0u {
            throw InvalidOperationException("Vulkan surface does not support color attachment swapchain images")
        }
        var formatCount uint32 = 0u
        let getFormats = instanceDispatch.vkGetPhysicalDeviceSurfaceFormatsKHR
        let formatCountResult = getFormats(physicalDevice, surface, &formatCount, nil)
        if formatCountResult == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
            surfaceLost = true
            return false
        }
        if formatCountResult != VkConstants.VK_SUCCESS || formatCount == 0u {
            throw InvalidOperationException("Vulkan surface formats are unavailable")
        }
        let formats *VkSurfaceFormatKHR = stackalloc [int32(formatCount)]VkSurfaceFormatKHR
        let formatResult = getFormats(physicalDevice, surface, &formatCount, formats)
        if formatResult == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
            surfaceLost = true
            return false
        }
        if formatResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("Vulkan surface format query failed")
        }
        var selectedFormat VkSurfaceFormatKHR = VkSurfaceFormatKHR{}
        if !SelectSrgbFormat(formats, formatCount, out selectedFormat) {
            throw InvalidOperationException("Vulkan surface exposes no supported sRGB swapchain format")
        }
        var formatProperties = VkFormatProperties{}
        let getFormatProperties = instanceDispatch.vkGetPhysicalDeviceFormatProperties
        getFormatProperties(
            physicalDevice,
            selectedFormat.format,
            &formatProperties)
        let requiredFormatFeatures = uint32(VkConstants.VK_FORMAT_FEATURE_COLOR_ATTACHMENT_BIT)
            | uint32(VkConstants.VK_FORMAT_FEATURE_COLOR_ATTACHMENT_BLEND_BIT)
        if (formatProperties.optimalTilingFeatures & requiredFormatFeatures) != requiredFormatFeatures {
            throw InvalidOperationException("Vulkan sRGB surface format lacks color attachment blend support")
        }
        var modeCount uint32 = 0u
        let getModes = instanceDispatch.vkGetPhysicalDeviceSurfacePresentModesKHR
        let modeCountResult = getModes(physicalDevice, surface, &modeCount, nil)
        if modeCountResult == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
            surfaceLost = true
            return false
        }
        if modeCountResult != VkConstants.VK_SUCCESS || modeCount == 0u {
            throw InvalidOperationException("Vulkan surface present modes are unavailable")
        }
        let modes *VkPresentModeKHR = stackalloc [int32(modeCount)]VkPresentModeKHR
        let modeResult = getModes(physicalDevice, surface, &modeCount, modes)
        if modeResult == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
            surfaceLost = true
            return false
        }
        if modeResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("Vulkan surface present mode query failed")
        }
        var hasFifo = false
        var modeIndex uint32 = 0u
        while modeIndex < modeCount {
            if modes[modeIndex] == VkConstants.VK_PRESENT_MODE_FIFO_KHR {
                hasFifo = true
            }
            modeIndex = modeIndex + 1u
        }
        if !hasFifo {
            throw InvalidOperationException("Vulkan FIFO present mode is unavailable")
        }
        let compositeAlpha = SelectCompositeAlpha(capabilities.supportedCompositeAlpha)
        if compositeAlpha == VkCompositeAlphaFlagBitsKHR(0) {
            throw InvalidOperationException("Vulkan surface has no supported composite alpha mode")
        }
        var support VkBool32 = VkConstants.VK_FALSE
        let surfaceSupport = instanceDispatch.vkGetPhysicalDeviceSurfaceSupportKHR
        let supportResult = surfaceSupport(
            physicalDevice,
            queueFamilyIndex,
            surface,
            &support)
        if supportResult == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
            surfaceLost = true
            return false
        }
        if supportResult != VkConstants.VK_SUCCESS || support != VkConstants.VK_TRUE
            || !host.GetVulkanPresentationSupport(instance, physicalDevice, queueFamilyIndex) {
            throw InvalidOperationException("Vulkan selected queue does not support the SDL surface")
        }
        selection = VulkanWindowTargetSelection{
            Capabilities: capabilities,
            Format: selectedFormat,
            PresentMode: VkConstants.VK_PRESENT_MODE_FIFO_KHR,
            CompositeAlpha: compositeAlpha,
        }
        return true
    }

    private func SelectSrgbFormat(
        formats *VkSurfaceFormatKHR,
        count uint32,
        out selected VkSurfaceFormatKHR) bool {
        selected = VkSurfaceFormatKHR{}
        if count == 0u {
            return false
        }
        if count == 1u && formats[0].format == VkConstants.VK_FORMAT_UNDEFINED {
            if formats[0].colorSpace != VkConstants.VK_COLOR_SPACE_SRGB_NONLINEAR_KHR {
                return false
            }
            selected.format = VkConstants.VK_FORMAT_B8G8R8A8_SRGB
            selected.colorSpace = VkConstants.VK_COLOR_SPACE_SRGB_NONLINEAR_KHR
            return true
        }
        var index uint32 = 0u
        while index < count {
            if formats[index].format == VkConstants.VK_FORMAT_B8G8R8A8_SRGB
                && formats[index].colorSpace == VkConstants.VK_COLOR_SPACE_SRGB_NONLINEAR_KHR {
                selected = formats[index]
                return true
            }
            index = index + 1u
        }
        index = 0u
        while index < count {
            if formats[index].format == VkConstants.VK_FORMAT_R8G8B8A8_SRGB
                && formats[index].colorSpace == VkConstants.VK_COLOR_SPACE_SRGB_NONLINEAR_KHR {
                selected = formats[index]
                return true
            }
            index = index + 1u
        }
        return false
    }

    private func SelectCompositeAlpha(supported VkCompositeAlphaFlagsKHR) VkCompositeAlphaFlagBitsKHR {
        if (supported & uint32(VkConstants.VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR)) != 0u {
            return VkConstants.VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR
        }
        if (supported & uint32(VkConstants.VK_COMPOSITE_ALPHA_PRE_MULTIPLIED_BIT_KHR)) != 0u {
            return VkConstants.VK_COMPOSITE_ALPHA_PRE_MULTIPLIED_BIT_KHR
        }
        if (supported & uint32(VkConstants.VK_COMPOSITE_ALPHA_POST_MULTIPLIED_BIT_KHR)) != 0u {
            return VkConstants.VK_COMPOSITE_ALPHA_POST_MULTIPLIED_BIT_KHR
        }
        if (supported & uint32(VkConstants.VK_COMPOSITE_ALPHA_INHERIT_BIT_KHR)) != 0u {
            return VkConstants.VK_COMPOSITE_ALPHA_INHERIT_BIT_KHR
        }
        return VkCompositeAlphaFlagBitsKHR(0)
    }

    private func WaitForGpu() bool {
        if let slot = frameSlot0 {
            let result = slot.PrepareAcquire()
            if result != VkConstants.VK_SUCCESS {
                HandleFrameFailure(result)
                return false
            }
            presentationRetirement.CollectCompleted(0u, slot.LastCompletedSerial)
            slot.AbortPrepared()
        }
        if let slot = frameSlot1 {
            let result = slot.PrepareAcquire()
            if result != VkConstants.VK_SUCCESS {
                HandleFrameFailure(result)
                return false
            }
            presentationRetirement.CollectCompleted(1u, slot.LastCompletedSerial)
            slot.AbortPrepared()
        }
        if let current = generation {
            let result = current.WaitForPresentCompletion(presentationRetirement)
            if result == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
                surfaceLost = true
                return false
            }
            if result != VkConstants.VK_SUCCESS {
                HandleFrameFailure(result)
                return false
            }
        }
        return true
    }

    private func WaitDeviceIdle() {
        if device == nint(0) || deviceWaitIdleAddress == nint(0) {
            return
        }
        let nullable = deviceWaitIdleAddress as (unmanaged[Cdecl] (VkDevice) -> VkResult)?
        if nullable == nil {
            throw InvalidOperationException("vkDeviceWaitIdle has an invalid address")
        }
        let deviceWaitIdleFunction = nullable!!
        let result = deviceWaitIdleFunction(device)
        if result != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkDeviceWaitIdle failed: " + result.ToString())
        }
    }
}
