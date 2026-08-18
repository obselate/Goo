package Goo

import System
import System.Runtime.InteropServices

internal unsafe partial class VulkanWindowTarget {
    private func Bootstrap() {
        if !host.LoadVulkanLibrary() {
            throw InvalidOperationException("SDL Vulkan loader initialization failed")
        }
        vulkanLoaded = true
        getProcAddress = host.GetVulkanGetInstanceProcAddr()
        if getProcAddress == nint(0) {
            throw InvalidOperationException("SDL Vulkan global procedure lookup is unavailable")
        }
        CreateInstance()
        LoadInstanceDispatch()
        var createdSurface VkSurfaceKHR = 0uL
        if !host.CreateVulkanSurface(instance, out createdSurface) || createdSurface == 0uL {
            throw InvalidOperationException("SDL Vulkan surface creation failed")
        }
        surface = createdSurface
        surfaceCreated = true
        SelectPhysicalDevice()
        CreateDevice()
        LoadDeviceDispatch()
        CreateCommandResources()
    }

    private func CreateInstance() {
        let requiredExtensions = host.GetVulkanInstanceExtensions()
        if requiredExtensions.Length == 0 {
            throw InvalidOperationException("SDL Vulkan instance extensions are unavailable")
        }
        instanceMaintenanceVariant = ResolveInstanceMaintenanceVariant()
        let surfaceMaintenanceName = if instanceMaintenanceVariant == VulkanSwapchainMaintenanceVariant.Khr {
            VulkanWindowTargetExtensionNames.SurfaceMaintenanceKhr
        } else {
            VulkanWindowTargetExtensionNames.SurfaceMaintenanceExt
        }
        var enabledExtensionCount int32 = requiredExtensions.Length
        if instanceMaintenanceVariant != VulkanSwapchainMaintenanceVariant.None
            && !ContainsExtensionName(requiredExtensions, surfaceMaintenanceName) {
            enabledExtensionCount = enabledExtensionCount + 1
        }
        if instanceMaintenanceVariant != VulkanSwapchainMaintenanceVariant.None
            && !ContainsExtensionName(requiredExtensions, VkConstants.VK_KHR_GET_SURFACE_CAPABILITIES_2_EXTENSION_NAME) {
            enabledExtensionCount = enabledExtensionCount + 1
        }
        var extensionStorage []nint = [enabledExtensionCount]nint
        var appNameStorage nint = nint(0)
        var engineNameStorage nint = nint(0)
        try {
            let extensionPointers *VulkanWindowTargetExtensionPointer =
                stackalloc [enabledExtensionCount]VulkanWindowTargetExtensionPointer
            var extensionIndex int32 = 0
            while extensionIndex < requiredExtensions.Length {
                let storage = Marshal.StringToCoTaskMemUTF8(requiredExtensions[extensionIndex])
                extensionStorage[extensionIndex] = storage
                extensionPointers[extensionIndex].Value = *int8(storage)
                extensionIndex = extensionIndex + 1
            }
            if instanceMaintenanceVariant != VulkanSwapchainMaintenanceVariant.None
                && !ContainsExtensionName(requiredExtensions, surfaceMaintenanceName) {
                let storage = Marshal.StringToCoTaskMemUTF8(surfaceMaintenanceName)
                extensionStorage[extensionIndex] = storage
                extensionPointers[extensionIndex].Value = *int8(storage)
                extensionIndex = extensionIndex + 1
            }
            if instanceMaintenanceVariant != VulkanSwapchainMaintenanceVariant.None
                && !ContainsExtensionName(requiredExtensions, VkConstants.VK_KHR_GET_SURFACE_CAPABILITIES_2_EXTENSION_NAME) {
                let storage = Marshal.StringToCoTaskMemUTF8(VkConstants.VK_KHR_GET_SURFACE_CAPABILITIES_2_EXTENSION_NAME)
                extensionStorage[extensionIndex] = storage
                extensionPointers[extensionIndex].Value = *int8(storage)
                extensionIndex = extensionIndex + 1
            }
            appNameStorage = Marshal.StringToCoTaskMemUTF8("Goo")
            engineNameStorage = Marshal.StringToCoTaskMemUTF8("Goo")
            var applicationInfo = VkApplicationInfo{}
            applicationInfo.sType = VkConstants.VK_STRUCTURE_TYPE_APPLICATION_INFO
            applicationInfo.pApplicationName = *int8(appNameStorage)
            applicationInfo.applicationVersion = 1u
            applicationInfo.pEngineName = *int8(engineNameStorage)
            applicationInfo.engineVersion = 1u
            applicationInfo.apiVersion = VkConstants.VK_API_VERSION_1_3
            var createInfo = VkInstanceCreateInfo{}
            createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO
            createInfo.pApplicationInfo = &applicationInfo
            createInfo.enabledExtensionCount = uint32(enabledExtensionCount)
            createInfo.ppEnabledExtensionNames = &extensionPointers[0].Value
            let address = ResolveGlobalProc(nint(0), "vkCreateInstance")
            let nullable = address as (unmanaged[Cdecl] (*VkInstanceCreateInfo, *VkAllocationCallbacks, *VkInstance) -> VkResult)?
            if nullable == nil {
                throw InvalidOperationException("vkCreateInstance is unavailable")
            }
            let createInstance = nullable!!
            var createdInstance VkInstance = nint(0)
            let result = createInstance(&createInfo, nil, &createdInstance)
            if result != VkConstants.VK_SUCCESS || createdInstance == nint(0) {
                throw InvalidOperationException("vkCreateInstance failed: " + result.ToString())
            }
            instance = createdInstance
        } finally {
            var index int32 = 0
            while index < extensionStorage.Length {
                if extensionStorage[index] != nint(0) {
                    Marshal.FreeCoTaskMem(extensionStorage[index])
                    extensionStorage[index] = nint(0)
                }
                index = index + 1
            }
            if appNameStorage != nint(0) {
                Marshal.FreeCoTaskMem(appNameStorage)
            }
            if engineNameStorage != nint(0) {
                Marshal.FreeCoTaskMem(engineNameStorage)
            }
        }
    }

    private func ResolveInstanceMaintenanceVariant() VulkanSwapchainMaintenanceVariant {
        let address = ResolveGlobalProc(nint(0), "vkEnumerateInstanceExtensionProperties")
        let nullable = address as (unmanaged[Cdecl] (*int8, *uint32, *VkExtensionProperties) -> VkResult)?
        if nullable == nil {
            return VulkanSwapchainMaintenanceVariant.None
        }
        let enumerate = nullable!!
        var count uint32 = 0u
        if enumerate(nil, &count, nil) != VkConstants.VK_SUCCESS || count == 0u {
            return VulkanSwapchainMaintenanceVariant.None
        }
        let extensions *VkExtensionProperties = stackalloc [int32(count)]VkExtensionProperties
        if enumerate(nil, &count, extensions) != VkConstants.VK_SUCCESS {
            return VulkanSwapchainMaintenanceVariant.None
        }
        var hasSurfaceExt = false
        var hasSurfaceKhr = false
        var hasCapabilities2 = false
        var index uint32 = 0u
        while index < count {
            if !hasSurfaceExt {
                hasSurfaceExt = ExtensionNameEquals(
                    &extensions[index], VulkanWindowTargetExtensionNames.SurfaceMaintenanceExt)
            }
            if !hasSurfaceKhr {
                hasSurfaceKhr = ExtensionNameEquals(
                    &extensions[index], VulkanWindowTargetExtensionNames.SurfaceMaintenanceKhr)
            }
            if !hasCapabilities2 {
                hasCapabilities2 = ExtensionNameEquals(
                    &extensions[index], VkConstants.VK_KHR_GET_SURFACE_CAPABILITIES_2_EXTENSION_NAME)
            }
            index = index + 1u
        }
        if !hasCapabilities2 {
            return VulkanSwapchainMaintenanceVariant.None
        }
        if hasSurfaceKhr {
            return VulkanSwapchainMaintenanceVariant.Khr
        }
        if hasSurfaceExt {
            return VulkanSwapchainMaintenanceVariant.Ext
        }
        return VulkanSwapchainMaintenanceVariant.None
    }

    private func ContainsExtensionName(extensions []string, expected string) bool {
        var index int32 = 0
        while index < extensions.Length {
            if extensions[index] == expected {
                return true
            }
            index = index + 1
        }
        return false
    }

    private func LoadInstanceDispatch() {
        let destroyInstance = ResolveGlobalProc(instance, "vkDestroyInstance") as (unmanaged[Cdecl] (VkInstance, *VkAllocationCallbacks) -> void)?
        if destroyInstance == nil { throw InvalidOperationException("vkDestroyInstance is unavailable") }
        instanceDispatch.vkDestroyInstance = destroyInstance!!
        instanceDestroyAvailable = true
        let enumeratePhysicalDevices = ResolveGlobalProc(instance, "vkEnumeratePhysicalDevices") as (unmanaged[Cdecl] (VkInstance, *uint32, *VkPhysicalDevice) -> VkResult)?
        if enumeratePhysicalDevices == nil { throw InvalidOperationException("vkEnumeratePhysicalDevices is unavailable") }
        instanceDispatch.vkEnumeratePhysicalDevices = enumeratePhysicalDevices!!
        let getPhysicalDeviceQueueFamilyProperties = ResolveGlobalProc(instance, "vkGetPhysicalDeviceQueueFamilyProperties") as (unmanaged[Cdecl] (VkPhysicalDevice, *uint32, *VkQueueFamilyProperties) -> void)?
        if getPhysicalDeviceQueueFamilyProperties == nil { throw InvalidOperationException("vkGetPhysicalDeviceQueueFamilyProperties is unavailable") }
        instanceDispatch.vkGetPhysicalDeviceQueueFamilyProperties = getPhysicalDeviceQueueFamilyProperties!!
        let getPhysicalDeviceProperties = ResolveGlobalProc(instance, "vkGetPhysicalDeviceProperties") as (unmanaged[Cdecl] (VkPhysicalDevice, *VkPhysicalDeviceProperties) -> void)?
        if getPhysicalDeviceProperties == nil { throw InvalidOperationException("vkGetPhysicalDeviceProperties is unavailable") }
        instanceDispatch.vkGetPhysicalDeviceProperties = getPhysicalDeviceProperties!!
        let getPhysicalDeviceSurfaceSupport = ResolveGlobalProc(instance, "vkGetPhysicalDeviceSurfaceSupportKHR") as (unmanaged[Cdecl] (VkPhysicalDevice, uint32, VkSurfaceKHR, *VkBool32) -> VkResult)?
        if getPhysicalDeviceSurfaceSupport == nil { throw InvalidOperationException("vkGetPhysicalDeviceSurfaceSupportKHR is unavailable") }
        instanceDispatch.vkGetPhysicalDeviceSurfaceSupportKHR = getPhysicalDeviceSurfaceSupport!!
        let getDeviceProcAddr = ResolveGlobalProc(instance, "vkGetDeviceProcAddr") as (unmanaged[Cdecl] (VkDevice, *int8) -> unmanaged[Cdecl] () -> void)?
        if getDeviceProcAddr == nil { throw InvalidOperationException("vkGetDeviceProcAddr is unavailable") }
        instanceDispatch.vkGetDeviceProcAddr = getDeviceProcAddr!!
        let getPhysicalDeviceFeatures2 = ResolveGlobalProc(instance, "vkGetPhysicalDeviceFeatures2") as (unmanaged[Cdecl] (VkPhysicalDevice, *VkPhysicalDeviceFeatures2) -> void)?
        if getPhysicalDeviceFeatures2 == nil { throw InvalidOperationException("vkGetPhysicalDeviceFeatures2 is unavailable") }
        instanceDispatch.vkGetPhysicalDeviceFeatures2 = getPhysicalDeviceFeatures2!!
        let enumerateDeviceExtensionProperties = ResolveGlobalProc(instance, "vkEnumerateDeviceExtensionProperties") as (unmanaged[Cdecl] (VkPhysicalDevice, *int8, *uint32, *VkExtensionProperties) -> VkResult)?
        if enumerateDeviceExtensionProperties == nil { throw InvalidOperationException("vkEnumerateDeviceExtensionProperties is unavailable") }
        instanceDispatch.vkEnumerateDeviceExtensionProperties = enumerateDeviceExtensionProperties!!
        let getPhysicalDeviceSurfaceCapabilities = ResolveGlobalProc(instance, "vkGetPhysicalDeviceSurfaceCapabilitiesKHR") as (unmanaged[Cdecl] (VkPhysicalDevice, VkSurfaceKHR, *VkSurfaceCapabilitiesKHR) -> VkResult)?
        if getPhysicalDeviceSurfaceCapabilities == nil { throw InvalidOperationException("vkGetPhysicalDeviceSurfaceCapabilitiesKHR is unavailable") }
        instanceDispatch.vkGetPhysicalDeviceSurfaceCapabilitiesKHR = getPhysicalDeviceSurfaceCapabilities!!
        let getPhysicalDeviceSurfaceFormats = ResolveGlobalProc(instance, "vkGetPhysicalDeviceSurfaceFormatsKHR") as (unmanaged[Cdecl] (VkPhysicalDevice, VkSurfaceKHR, *uint32, *VkSurfaceFormatKHR) -> VkResult)?
        if getPhysicalDeviceSurfaceFormats == nil { throw InvalidOperationException("vkGetPhysicalDeviceSurfaceFormatsKHR is unavailable") }
        instanceDispatch.vkGetPhysicalDeviceSurfaceFormatsKHR = getPhysicalDeviceSurfaceFormats!!
        let getPhysicalDeviceSurfacePresentModes = ResolveGlobalProc(instance, "vkGetPhysicalDeviceSurfacePresentModesKHR") as (unmanaged[Cdecl] (VkPhysicalDevice, VkSurfaceKHR, *uint32, *VkPresentModeKHR) -> VkResult)?
        if getPhysicalDeviceSurfacePresentModes == nil { throw InvalidOperationException("vkGetPhysicalDeviceSurfacePresentModesKHR is unavailable") }
        instanceDispatch.vkGetPhysicalDeviceSurfacePresentModesKHR = getPhysicalDeviceSurfacePresentModes!!
        let getPhysicalDeviceFormatProperties = ResolveGlobalProc(instance, "vkGetPhysicalDeviceFormatProperties") as (unmanaged[Cdecl] (VkPhysicalDevice, VkFormat, *VkFormatProperties) -> void)?
        if getPhysicalDeviceFormatProperties == nil { throw InvalidOperationException("vkGetPhysicalDeviceFormatProperties is unavailable") }
        instanceDispatch.vkGetPhysicalDeviceFormatProperties = getPhysicalDeviceFormatProperties!!
        let createDevice = ResolveGlobalProc(instance, "vkCreateDevice") as (unmanaged[Cdecl] (VkPhysicalDevice, *VkDeviceCreateInfo, *VkAllocationCallbacks, *VkDevice) -> VkResult)?
        if createDevice == nil { throw InvalidOperationException("vkCreateDevice is unavailable") }
        instanceDispatch.vkCreateDevice = createDevice!!
    }

    private func SelectPhysicalDevice() {
        var count uint32 = 0u
        let enumerate = instanceDispatch.vkEnumeratePhysicalDevices
        if enumerate(instance, &count, nil) != VkConstants.VK_SUCCESS || count == 0u {
            throw InvalidOperationException("No Vulkan physical device is available")
        }
        let devices *VkPhysicalDevice = stackalloc [int32(count)]VkPhysicalDevice
        if enumerate(instance, &count, devices) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("Vulkan physical device enumeration failed")
        }
        var deviceIndex uint32 = 0u
        while deviceIndex < count {
            let candidate = devices[deviceIndex]
            var properties = VkPhysicalDeviceProperties{}
            let getProperties = instanceDispatch.vkGetPhysicalDeviceProperties
            getProperties(candidate, &properties)
            if properties.apiVersion >= VkConstants.VK_API_VERSION_1_3
                && HasGraphicsPresentationQueue(candidate)
                && HasRequiredDeviceExtensions(candidate)
                && HasRequiredFeatures(candidate) {
                physicalDevice = candidate
                return
            }
            deviceIndex = deviceIndex + 1u
        }
        throw InvalidOperationException("No Vulkan physical device satisfies the Goo presentation requirements")
    }

    private func HasGraphicsPresentationQueue(candidate VkPhysicalDevice) bool {
        var count uint32 = 0u
        let getProperties = instanceDispatch.vkGetPhysicalDeviceQueueFamilyProperties
        getProperties(candidate, &count, nil)
        if count == 0u {
            return false
        }
        let families *VkQueueFamilyProperties = stackalloc [int32(count)]VkQueueFamilyProperties
        getProperties(candidate, &count, families)
        var familyIndex uint32 = 0u
        while familyIndex < count {
            let family = families[familyIndex]
            if family.queueCount > 0u
                && (family.queueFlags & uint32(VkConstants.VK_QUEUE_GRAPHICS_BIT)) != 0u {
                var supported VkBool32 = VkConstants.VK_FALSE
                let surfaceSupport = instanceDispatch.vkGetPhysicalDeviceSurfaceSupportKHR
                let supportResult = surfaceSupport(
                    candidate, familyIndex, surface, &supported)
                if supportResult == VkConstants.VK_SUCCESS && supported == VkConstants.VK_TRUE
                    && host.GetVulkanPresentationSupport(instance, candidate, familyIndex) {
                    queueFamilyIndex = familyIndex
                    return true
                }
            }
            familyIndex = familyIndex + 1u
        }
        return false
    }

    private func HasRequiredDeviceExtensions(candidate VkPhysicalDevice) bool {
        var count uint32 = 0u
        let enumerate = instanceDispatch.vkEnumerateDeviceExtensionProperties
        if enumerate(candidate, nil, &count, nil) != VkConstants.VK_SUCCESS || count == 0u {
            return false
        }
        let extensions *VkExtensionProperties = stackalloc [int32(count)]VkExtensionProperties
        if enumerate(candidate, nil, &count, extensions) != VkConstants.VK_SUCCESS {
            return false
        }
        var hasSwapchain = false
        var hasMaintenanceExt = false
        var hasMaintenanceKhr = false
        var index uint32 = 0u
        while index < count {
            if ExtensionNameEquals(&extensions[index], VkConstants.VK_KHR_SWAPCHAIN_EXTENSION_NAME) {
                hasSwapchain = true
            }
            if ExtensionNameEquals(&extensions[index], VulkanWindowTargetExtensionNames.SwapchainMaintenanceExt) {
                hasMaintenanceExt = true
            }
            if ExtensionNameEquals(&extensions[index], VulkanWindowTargetExtensionNames.SwapchainMaintenanceKhr) {
                hasMaintenanceKhr = true
            }
            index = index + 1u
        }
        swapchainMaintenanceVariant = VulkanSwapchainMaintenanceVariant.None
        if instanceMaintenanceVariant == VulkanSwapchainMaintenanceVariant.Khr && hasMaintenanceKhr {
            swapchainMaintenanceVariant = VulkanSwapchainMaintenanceVariant.Khr
        } else if instanceMaintenanceVariant == VulkanSwapchainMaintenanceVariant.Ext && hasMaintenanceExt {
            swapchainMaintenanceVariant = VulkanSwapchainMaintenanceVariant.Ext
        }
        return hasSwapchain
    }

    private func HasRequiredFeatures(candidate VkPhysicalDevice) bool {
        var features2 = VkPhysicalDeviceFeatures2{}
        var features12 = VkPhysicalDeviceVulkan12Features{}
        var features13 = VkPhysicalDeviceVulkan13Features{}
        var maintenance = VkPhysicalDeviceSwapchainMaintenance1FeaturesEXT{}
        features2.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2
        features2.pNext = *void(&features12)
        features12.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES
        features12.pNext = *void(&features13)
        features13.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES
        if swapchainMaintenanceVariant != VulkanSwapchainMaintenanceVariant.None {
            features13.pNext = *void(&maintenance)
            maintenance.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_SWAPCHAIN_MAINTENANCE_1_FEATURES_EXT
        }
        let getFeatures = instanceDispatch.vkGetPhysicalDeviceFeatures2
        getFeatures(candidate, &features2)
        let maintenanceSupported = swapchainMaintenanceVariant == VulkanSwapchainMaintenanceVariant.None
            || maintenance.swapchainMaintenance1 == VkConstants.VK_TRUE
        return features12.timelineSemaphore == VkConstants.VK_TRUE
            && features13.synchronization2 == VkConstants.VK_TRUE
            && features13.dynamicRendering == VkConstants.VK_TRUE
            && maintenanceSupported
    }

    private func CreateDevice() {
        var features2 = VkPhysicalDeviceFeatures2{}
        var features12 = VkPhysicalDeviceVulkan12Features{}
        var features13 = VkPhysicalDeviceVulkan13Features{}
        var maintenance = VkPhysicalDeviceSwapchainMaintenance1FeaturesEXT{}
        features2.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2
        features2.pNext = *void(&features12)
        features12.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES
        features12.pNext = *void(&features13)
        features12.timelineSemaphore = VkConstants.VK_TRUE
        features13.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES
        features13.synchronization2 = VkConstants.VK_TRUE
        features13.dynamicRendering = VkConstants.VK_TRUE
        if swapchainMaintenanceVariant != VulkanSwapchainMaintenanceVariant.None {
            features13.pNext = *void(&maintenance)
            maintenance.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_SWAPCHAIN_MAINTENANCE_1_FEATURES_EXT
            maintenance.swapchainMaintenance1 = VkConstants.VK_TRUE
        }
        let priorities *float32 = stackalloc [1]float32{1.0F}
        var queueInfo = VkDeviceQueueCreateInfo{}
        queueInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO
        queueInfo.queueFamilyIndex = queueFamilyIndex
        queueInfo.queueCount = 1u
        queueInfo.pQueuePriorities = priorities
        var extensionStorage []nint = [2]nint
        try {
            extensionStorage[0] = Marshal.StringToCoTaskMemUTF8(VkConstants.VK_KHR_SWAPCHAIN_EXTENSION_NAME)
            let extensionPointers *VulkanWindowTargetExtensionPointer = stackalloc [2]VulkanWindowTargetExtensionPointer
            extensionPointers[0].Value = *int8(extensionStorage[0])
            var deviceExtensionCount uint32 = 1u
            if swapchainMaintenanceVariant != VulkanSwapchainMaintenanceVariant.None {
                extensionStorage[1] = Marshal.StringToCoTaskMemUTF8(MaintenanceDeviceExtensionName())
                extensionPointers[1].Value = *int8(extensionStorage[1])
                deviceExtensionCount = 2u
            }
            var createInfo = VkDeviceCreateInfo{}
            createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO
            createInfo.pNext = *void(&features2)
            createInfo.queueCreateInfoCount = 1u
            createInfo.pQueueCreateInfos = &queueInfo
            createInfo.enabledExtensionCount = deviceExtensionCount
            createInfo.ppEnabledExtensionNames = &extensionPointers[0].Value
            let createDevice = instanceDispatch.vkCreateDevice
            var createdDevice VkDevice = nint(0)
            let result = createDevice(physicalDevice, &createInfo, nil, &createdDevice)
            if result != VkConstants.VK_SUCCESS || createdDevice == nint(0) {
                throw InvalidOperationException("vkCreateDevice failed: " + result.ToString())
            }
            device = createdDevice
        } finally {
            var index int32 = 0
            while index < extensionStorage.Length {
                if extensionStorage[index] != nint(0) {
                    Marshal.FreeCoTaskMem(extensionStorage[index])
                    extensionStorage[index] = nint(0)
                }
                index = index + 1
            }
        }
    }

    private func CreateCommandResources() {
        var poolInfo = VkCommandPoolCreateInfo{}
        poolInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO
        poolInfo.flags = uint32(VkConstants.VK_COMMAND_POOL_CREATE_TRANSIENT_BIT)
            | uint32(VkConstants.VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT)
        poolInfo.queueFamilyIndex = queueFamilyIndex
        let createCommandPool = dispatch.vkCreateCommandPool
        var createdCommandPool VkCommandPool = 0uL
        let poolResult = createCommandPool(device, &poolInfo, nil, &createdCommandPool)
        if poolResult != VkConstants.VK_SUCCESS || createdCommandPool == 0uL {
            throw InvalidOperationException("vkCreateCommandPool failed: " + poolResult.ToString())
        }
        commandPool = createdCommandPool
        let buffers *VkCommandBuffer = stackalloc [2]VkCommandBuffer
        var allocateInfo = VkCommandBufferAllocateInfo{}
        allocateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO
        allocateInfo.commandPool = commandPool
        allocateInfo.level = VkConstants.VK_COMMAND_BUFFER_LEVEL_PRIMARY
        allocateInfo.commandBufferCount = 2u
        let allocateCommandBuffers = dispatch.vkAllocateCommandBuffers
        let allocateResult = allocateCommandBuffers(device, &allocateInfo, buffers)
        if allocateResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkAllocateCommandBuffers failed: " + allocateResult.ToString())
        }
        var acquiredQueue VkQueue = nint(0)
        let getDeviceQueue = dispatch.vkGetDeviceQueue
        getDeviceQueue(device, queueFamilyIndex, 0u, &acquiredQueue)
        if acquiredQueue == nint(0) {
            throw InvalidOperationException("Vulkan queue acquisition failed")
        }
        queue = acquiredQueue
        runtime = VulkanRuntime(instance, instanceDispatch)
        runtime!!.AttachDevice(
            physicalDevice,
            device,
            dispatch,
            queue,
            queue,
            queueFamilyIndex,
            queueFamilyIndex)
        frameSlot0 = VulkanFrameSlot(device, dispatch, buffers[0])
        frameSlot1 = VulkanFrameSlot(device, dispatch, buffers[1])
    }

    private func MaintenanceDeviceExtensionName() string {
        if swapchainMaintenanceVariant == VulkanSwapchainMaintenanceVariant.Khr {
            return VulkanWindowTargetExtensionNames.SwapchainMaintenanceKhr
        }
        return VulkanWindowTargetExtensionNames.SwapchainMaintenanceExt
    }
}
