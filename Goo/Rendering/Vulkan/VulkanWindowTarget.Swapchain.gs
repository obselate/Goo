package Goo

internal class VulkanRetiredWindowSwapchain {
    internal let Generation VulkanSwapchainGeneration
    internal let Surface VkSurfaceKHR
    internal let DestroySurface bool

    internal init(nativeGeneration VulkanSwapchainGeneration, nativeSurface VkSurfaceKHR,
        shouldDestroySurface bool) {
        Generation = nativeGeneration
        Surface = nativeSurface
        DestroySurface = shouldDestroySurface
    }
}

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
        var surfaceRecovery = false
        if surfaceLost {
            surfaceRecovery = true
            RetireCurrentSwapchain(true)
            if !RecreateSurface() {
                return false
            }
            surfaceLost = false
        }
        var selection VulkanWindowTargetSelection = VulkanWindowTargetSelection{}
        if !TryQuerySelection(out selection) {
            if !surfaceLost {
                return false
            }
            surfaceRecovery = true
            RetireCurrentSwapchain(true)
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
        let oldSwapchain = if let old = generation { old.Handle } else { 0uL }
        if generation != nil {
            RetireCurrentSwapchain(false)
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
            oldSwapchain,
            generationId,
            swapchainMaintenanceVariant != VulkanSwapchainMaintenanceVariant.None,
            windowObjectAccounting)
        generation = next
        if primitiveRenderer == nil {
            guard let activeRuntime = runtime else {
                throw InvalidOperationException("Vulkan shared runtime is unavailable")
            }
            primitiveRenderer = VulkanPrimitiveRenderer(
                device,
                dispatch,
                selection.Format.format,
                64,
                imageResources,
                activeRuntime.Generation,
                activeRuntime.PrimitiveState,
                textAtlas,
                windowObjectAccounting)
        }
        framebufferWidth = int32(next.Extent.width)
        framebufferHeight = int32(next.Extent.height)
        requestedWidth = width
        requestedHeight = height
        recreatePending = false
        if surfaceRecovery {
            diagnostics?.AddSurfaceRecovery(1uL)
        }
        return true
    }

    private func RetireCurrentSwapchain(destroySurface bool) {
        if let old = generation {
            if destroySurface {
                let presentCompletionResult = old.WaitForPresentCompletion(presentationRetirement)
                RecordDiagnosticResult(VulkanDiagnosticEventIds.PresentWait, presentCompletionResult)
                if presentCompletionResult != VkConstants.VK_SUCCESS {
                    throw InvalidOperationException("Vulkan surface recovery present completion failed")
                }
                old.Dispose()
                generation = nil
                DestroyCurrentSurface()
                return
            }
            guard let storage = retiredSwapchains else {
                throw InvalidOperationException("Vulkan retired swapchain storage is unavailable")
            }
            if retiredSwapchainCount >= storage.Length {
                throw OverflowException("Vulkan retired swapchain capacity exceeded")
            }
            let oldSurface = if destroySurface { surface } else { 0uL }
            presentationRetirement.QueueRetiredGeneration(old.Generation)
            storage[retiredSwapchainCount] = VulkanRetiredWindowSwapchain(
                old,
                oldSurface,
                false)
            retiredSwapchainCount = retiredSwapchainCount + 1
            generation = nil
            return
        }
        if destroySurface {
            DestroyCurrentSurface()
        }
    }

    private func DestroyCurrentSurface() {
        if surfaceCreated && instance != nint(0) {
            host.DestroyVulkanSurface(instance, surface)
            if let accounting = windowObjectAccounting {
                accounting.Release()
            }
        }
        surface = 0uL
        surfaceCreated = false
    }

    private func CollectRetiredSwapchains() {
        guard let storage = retiredSwapchains else {
            return
        }
        var retiredGeneration uint64 = 0uL
        while presentationRetirement.TryPopRetiredGeneration(out retiredGeneration) {
            var found = false
            var index int32 = 0
            while index < retiredSwapchainCount {
                if let retired = storage[index] {
                    if retired.Generation.Generation == retiredGeneration {
                        retired.Generation.Dispose()
                        if retired.DestroySurface && retired.Surface != 0uL
                            && instance != nint(0) {
                            host.DestroyVulkanSurface(instance, retired.Surface)
                            if let accounting = windowObjectAccounting {
                                accounting.Release()
                            }
                        }
                        var readIndex = index + 1
                        while readIndex < retiredSwapchainCount {
                            storage[readIndex - 1] = storage[readIndex]
                            readIndex = readIndex + 1
                        }
                        retiredSwapchainCount = retiredSwapchainCount - 1
                        storage[retiredSwapchainCount] = nil
                        found = true
                        break
                    }
                }
                index = index + 1
            }
            if !found {
                throw InvalidOperationException("Vulkan retired swapchain generation is missing")
            }
        }
    }

    private func DisposeRetiredSwapchains() {
        guard let storage = retiredSwapchains else {
            return
        }
        var index int32 = 0
        while index < retiredSwapchainCount {
            if let retired = storage[index] {
                try {
                    let presentCompletionResult = retired.Generation.WaitForPresentCompletion(presentationRetirement)
                    RecordDiagnosticResult(VulkanDiagnosticEventIds.PresentWait, presentCompletionResult)
                } catch (cleanup Exception) { }
                try { retired.Generation.Dispose() } catch (cleanup Exception) { }
                if retired.DestroySurface && retired.Surface != 0uL
                    && instance != nint(0) {
                    try { host.DestroyVulkanSurface(instance, retired.Surface) } catch (cleanup Exception) { }
                    if let accounting = windowObjectAccounting {
                        accounting.Release()
                    }
                }
                storage[index] = nil
            }
            index = index + 1
        }
        retiredSwapchainCount = 0
    }

    private func RecreateSurface() bool {
        DestroyCurrentSurface()
        var createdSurface VkSurfaceKHR = 0uL
        if !host.CreateVulkanSurface(instance, out createdSurface) || createdSurface == 0uL {
            return false
        }
        try {
            if let accounting = windowObjectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            try { host.DestroyVulkanSurface(instance, createdSurface) } catch (cleanup Exception) { }
            throw error
        }
        surface = createdSurface
        surfaceCreated = true
        return true
    }

    private func TryQuerySelection(out selection VulkanWindowTargetSelection) bool {
        selection = VulkanWindowTargetSelection{}
        if VulkanWindowTarget.TakeTestSurfaceLostForTest() {
            surfaceLost = true
            return false
        }
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
            RecordDiagnosticResult(VulkanDiagnosticEventIds.PresentWait, result)
            if result != VkConstants.VK_SUCCESS {
                HandleFrameFailure(result, VulkanDiagnosticEventIds.PresentWait)
                return false
            }
            presentationRetirement.CollectCompleted(0u, slot.LastCompletedSerial)
            slot.AbortPrepared()
        }
        if let slot = frameSlot1 {
            let result = slot.PrepareAcquire()
            RecordDiagnosticResult(VulkanDiagnosticEventIds.PresentWait, result)
            if result != VkConstants.VK_SUCCESS {
                HandleFrameFailure(result, VulkanDiagnosticEventIds.PresentWait)
                return false
            }
            presentationRetirement.CollectCompleted(1u, slot.LastCompletedSerial)
            slot.AbortPrepared()
        }
        if let current = generation {
            let result = current.WaitForPresentCompletion(presentationRetirement)
            RecordDiagnosticResult(VulkanDiagnosticEventIds.PresentWait, result)
            if result == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
                surfaceLost = true
                return true
            }
            if result != VkConstants.VK_SUCCESS {
                HandleFrameFailure(result, VulkanDiagnosticEventIds.PresentWait)
                return false
            }
        }
        return true
    }

    private func WaitDeviceIdleResult() VkResult {
        if let activeRuntime = runtime {
            return activeRuntime.WaitDeviceIdleResult()
        }
        if device == nint(0) || deviceWaitIdleAddress == nint(0) {
            return VkConstants.VK_ERROR_INITIALIZATION_FAILED
        }
        let nullable = deviceWaitIdleAddress as (unmanaged[Cdecl] (VkDevice) -> VkResult)?
        if nullable == nil {
            return VkConstants.VK_ERROR_INITIALIZATION_FAILED
        }
        let deviceWaitIdleFunction = nullable!!
        return deviceWaitIdleFunction(device)
    }
}
