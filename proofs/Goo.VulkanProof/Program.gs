package Goo.VulkanProof

import System
import System.Runtime.InteropServices
import Goo.Vulkan.Generated

@DllImport("SDL3", EntryPoint: "SDL_Init", CallingConvention: CallingConvention.Cdecl)
unsafe func SDL_Init(flags uint32) uint8;

@DllImport("SDL3", EntryPoint: "SDL_Quit", CallingConvention: CallingConvention.Cdecl)
func SDL_Quit() void;

@DllImport("SDL3", EntryPoint: "SDL_Vulkan_LoadLibrary", CallingConvention: CallingConvention.Cdecl)
unsafe func SDL_Vulkan_LoadLibrary(path nint) uint8;

@DllImport("SDL3", EntryPoint: "SDL_Vulkan_GetVkGetInstanceProcAddr", CallingConvention: CallingConvention.Cdecl)
unsafe func SDL_Vulkan_GetVkGetInstanceProcAddr() nint;

@DllImport("SDL3", EntryPoint: "SDL_Vulkan_UnloadLibrary", CallingConvention: CallingConvention.Cdecl)
func SDL_Vulkan_UnloadLibrary() void;

@DllImport("SDL3", EntryPoint: "SDL_Vulkan_GetInstanceExtensions", CallingConvention: CallingConvention.Cdecl)
unsafe func SDL_Vulkan_GetInstanceExtensions(ref count uint32) **int8;

@DllImport("SDL3", EntryPoint: "SDL_CreateWindow", CallingConvention: CallingConvention.Cdecl)
func SDL_CreateWindow(title string, width int32, height int32, flags uint64) nint;

@DllImport("SDL3", EntryPoint: "SDL_DestroyWindow", CallingConvention: CallingConvention.Cdecl)
func SDL_DestroyWindow(window nint) void;

@DllImport("SDL3", EntryPoint: "SDL_Vulkan_CreateSurface", CallingConvention: CallingConvention.Cdecl)
unsafe func SDL_Vulkan_CreateSurface(window nint, instance VkInstance, allocator *VkAllocationCallbacks, ref surface VkSurfaceKHR) uint8;

@DllImport("SDL3", EntryPoint: "SDL_Vulkan_DestroySurface", CallingConvention: CallingConvention.Cdecl)
unsafe func SDL_Vulkan_DestroySurface(instance VkInstance, surface VkSurfaceKHR, allocator *VkAllocationCallbacks) void;

@DllImport("SDL3", EntryPoint: "SDL_Vulkan_GetPresentationSupport", CallingConvention: CallingConvention.Cdecl)
unsafe func SDL_Vulkan_GetPresentationSupport(instance VkInstance, physicalDevice VkPhysicalDevice, queueFamilyIndex uint32) uint8;

unsafe func LoadGlobalProc(getProc nint, instance VkInstance, name string) nint {
    let nameStorage = Marshal.StringToCoTaskMemUTF8(name)
    let namePointer = *int8(nameStorage)
    let pointer = getProc as (unmanaged[Cdecl] (VkInstance, *int8) -> unmanaged[Cdecl] () -> void)?
    let nonNullable = pointer!!
    let result = nonNullable(instance, namePointer)
    Marshal.FreeCoTaskMem(nameStorage)
    let resultAddress = result as nint?
    return resultAddress!!
}

unsafe func LoadDeviceProc(getProc nint, device VkDevice, name string) nint {
    let nameStorage = Marshal.StringToCoTaskMemUTF8(name)
    let namePointer = *int8(nameStorage)
    let pointer = getProc as (unmanaged[Cdecl] (VkDevice, *int8) -> unmanaged[Cdecl] () -> void)?
    let nonNullable = pointer!!
    let result = nonNullable(device, namePointer)
    Marshal.FreeCoTaskMem(nameStorage)
    let resultAddress = result as nint?
    return resultAddress!!
}

unsafe func ExtensionNameEquals(property *VkExtensionProperties, expected string) bool {
    let expectedStorage = Marshal.StringToCoTaskMemUTF8(expected)
    try {
        let expectedPointer = *int8(expectedStorage)
        let actualPointer = property->extensionName
        var index uint32 = 0u
        while index < VkConstants.VK_MAX_EXTENSION_NAME_SIZE {
            let actual = actualPointer[index]
            let wanted = expectedPointer[index]
            if actual != wanted {
                return false
            }
            if actual == 0 {
                return true
            }
            index++
        }
        return false
    } finally {
        Marshal.FreeCoTaskMem(expectedStorage)
    }
}

unsafe func Main() int32 {
    var sdlInitialized = false
    var vulkanLoaded = false
    var window nint = nint(0)
    var instance VkInstance = nint(0)
    var surface VkSurfaceKHR = uint64(0)
    var surfaceCreated = false
    var appNameStorage nint = nint(0)
    var engineNameStorage nint = nint(0)
    var swapchainExtensionStorage nint = nint(0)
    var destroyInstanceAddress nint = nint(0)
    var device VkDevice = nint(0)
    var deviceCreated = false
    var queue VkQueue = nint(0)
    var swapchain VkSwapchainKHR = uint64(0)
    var swapchainCreated = false
    var commandPool VkCommandPool = uint64(0)
    var commandPoolCreated = false
    var acquireSemaphore VkSemaphore = uint64(0)
    var acquireSemaphoreCreated = false
    var renderSemaphore VkSemaphore = uint64(0)
    var renderSemaphoreCreated = false
    var fence VkFence = uint64(0)
    var fenceCreated = false
    var commandBuffer VkCommandBuffer = nint(0)
    var deviceDispatch = VkDeviceDispatch{}
    var instanceDispatch = VkInstanceDispatch{}
    var queueWaitIdleAddress nint = nint(0)
    var destroyFenceAddress nint = nint(0)
    var destroySemaphoreAddress nint = nint(0)
    var destroyCommandPoolAddress nint = nint(0)
    var destroySwapchainAddress nint = nint(0)
    var destroyDeviceAddress nint = nint(0)

    try {
        if SDL_Init(0x00004020u) == 0u {
            throw InvalidOperationException("SDL video initialization failed")
        }
        sdlInitialized = true

        if SDL_Vulkan_LoadLibrary(nint(0)) == 0u {
            throw InvalidOperationException("Vulkan loader initialization failed")
        }
        vulkanLoaded = true

        let getProcAddress nint = SDL_Vulkan_GetVkGetInstanceProcAddr()
        if getProcAddress == nint(0) {
            throw InvalidOperationException("Vulkan global procedure lookup is unavailable")
        }
        let getProcNullable = getProcAddress as (unmanaged[Cdecl] (VkInstance, *int8) -> unmanaged[Cdecl] () -> void)?
        if getProcNullable == nil {
            throw InvalidOperationException("Vulkan global procedure lookup has an invalid address")
        }

        let enumerateVersionAddress = LoadGlobalProc(getProcAddress, nint(0), "vkEnumerateInstanceVersion")
        let enumerateVersionNullable = enumerateVersionAddress as (unmanaged[Cdecl] (*uint32) -> VkResult)?
        if enumerateVersionNullable == nil {
            throw InvalidOperationException("vkEnumerateInstanceVersion is unavailable")
        }
        let enumerateVersion = enumerateVersionNullable!!

        let enumerateExtensionsAddress = LoadGlobalProc(getProcAddress, nint(0), "vkEnumerateInstanceExtensionProperties")
        let enumerateExtensionsNullable = enumerateExtensionsAddress as (unmanaged[Cdecl] (*int8, *uint32, *VkExtensionProperties) -> VkResult)?
        if enumerateExtensionsNullable == nil {
            throw InvalidOperationException("vkEnumerateInstanceExtensionProperties is unavailable")
        }
        let enumerateExtensions = enumerateExtensionsNullable!!

        let createInstanceAddress = LoadGlobalProc(getProcAddress, nint(0), "vkCreateInstance")
        let createInstanceNullable = createInstanceAddress as (unmanaged[Cdecl] (*VkInstanceCreateInfo, *VkAllocationCallbacks, *VkInstance) -> VkResult)?
        if createInstanceNullable == nil {
            throw InvalidOperationException("vkCreateInstance is unavailable")
        }
        let createInstance = createInstanceNullable!!

        var apiVersion uint32 = 0u
        if enumerateVersion(&apiVersion) != VkConstants.VK_SUCCESS || apiVersion < VkConstants.VK_API_VERSION_1_3 {
            throw InvalidOperationException("Vulkan 1.3 is required")
        }

        var availableExtensionCount uint32 = 0u
        if enumerateExtensions(nil, &availableExtensionCount, nil) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkEnumerateInstanceExtensionProperties failed")
        }
        if availableExtensionCount > 0u {
            let availableExtensions *VkExtensionProperties = stackalloc [int32(availableExtensionCount)]VkExtensionProperties
            if enumerateExtensions(nil, &availableExtensionCount, availableExtensions) != VkConstants.VK_SUCCESS {
                throw InvalidOperationException("vkEnumerateInstanceExtensionProperties data query failed")
            }
        }

        var requiredExtensionCount uint32 = 0u
        let requiredExtensions = SDL_Vulkan_GetInstanceExtensions(ref requiredExtensionCount)
        if requiredExtensions == nil || requiredExtensionCount == 0u {
            throw InvalidOperationException("SDL Vulkan instance extensions are unavailable")
        }

        appNameStorage = Marshal.StringToCoTaskMemUTF8("Goo Vulkan Proof")
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
        createInfo.enabledExtensionCount = requiredExtensionCount
        createInfo.ppEnabledExtensionNames = requiredExtensions

        if createInstance(&createInfo, nil, &instance) != VkConstants.VK_SUCCESS || instance == nint(0) {
            throw InvalidOperationException("vkCreateInstance failed")
        }

        destroyInstanceAddress = LoadGlobalProc(getProcAddress, instance, "vkDestroyInstance")
        let destroyInstanceNullable = destroyInstanceAddress as (unmanaged[Cdecl] (VkInstance, *VkAllocationCallbacks) -> void)?
        if destroyInstanceNullable == nil {
            throw InvalidOperationException("vkDestroyInstance is unavailable")
        }
        instanceDispatch.vkDestroyInstance = destroyInstanceNullable!!
        let destroyInstance = instanceDispatch.vkDestroyInstance

        let enumeratePhysicalDevicesAddress = LoadGlobalProc(getProcAddress, instance, "vkEnumeratePhysicalDevices")
        let enumeratePhysicalDevicesNullable = enumeratePhysicalDevicesAddress as (unmanaged[Cdecl] (VkInstance, *uint32, *VkPhysicalDevice) -> VkResult)?
        if enumeratePhysicalDevicesNullable == nil {
            throw InvalidOperationException("vkEnumeratePhysicalDevices is unavailable")
        }
        let enumeratePhysicalDevices = enumeratePhysicalDevicesNullable!!

        let queueFamilyPropertiesAddress = LoadGlobalProc(getProcAddress, instance, "vkGetPhysicalDeviceQueueFamilyProperties")
        let queueFamilyPropertiesNullable = queueFamilyPropertiesAddress as (unmanaged[Cdecl] (VkPhysicalDevice, *uint32, *VkQueueFamilyProperties) -> void)?
        if queueFamilyPropertiesNullable == nil {
            throw InvalidOperationException("vkGetPhysicalDeviceQueueFamilyProperties is unavailable")
        }
        let queueFamilyProperties = queueFamilyPropertiesNullable!!

        let physicalDevicePropertiesAddress = LoadGlobalProc(getProcAddress, instance, "vkGetPhysicalDeviceProperties")
        let physicalDevicePropertiesNullable = physicalDevicePropertiesAddress as (unmanaged[Cdecl] (VkPhysicalDevice, *VkPhysicalDeviceProperties) -> void)?
        if physicalDevicePropertiesNullable == nil {
            throw InvalidOperationException("vkGetPhysicalDeviceProperties is unavailable")
        }
        instanceDispatch.vkGetPhysicalDeviceProperties = physicalDevicePropertiesNullable!!

        let surfaceSupportAddress = LoadGlobalProc(getProcAddress, instance, "vkGetPhysicalDeviceSurfaceSupportKHR")
        let surfaceSupportNullable = surfaceSupportAddress as (unmanaged[Cdecl] (VkPhysicalDevice, uint32, VkSurfaceKHR, *VkBool32) -> VkResult)?
        if surfaceSupportNullable == nil {
            throw InvalidOperationException("vkGetPhysicalDeviceSurfaceSupportKHR is unavailable")
        }
        let surfaceSupport = surfaceSupportNullable!!

        let getDeviceProcAddressAddress = LoadGlobalProc(getProcAddress, instance, "vkGetDeviceProcAddr")
        let getDeviceProcAddressNullable = getDeviceProcAddressAddress as (unmanaged[Cdecl] (VkDevice, *int8) -> unmanaged[Cdecl] () -> void)?
        if getDeviceProcAddressNullable == nil {
            throw InvalidOperationException("vkGetDeviceProcAddr is unavailable")
        }
        instanceDispatch.vkGetDeviceProcAddr = getDeviceProcAddressNullable!!

        let getPhysicalDeviceFeatures2Address = LoadGlobalProc(getProcAddress, instance, "vkGetPhysicalDeviceFeatures2")
        let getPhysicalDeviceFeatures2Nullable = getPhysicalDeviceFeatures2Address as (unmanaged[Cdecl] (VkPhysicalDevice, *VkPhysicalDeviceFeatures2) -> void)?
        if getPhysicalDeviceFeatures2Nullable == nil {
            throw InvalidOperationException("vkGetPhysicalDeviceFeatures2 is unavailable")
        }
        instanceDispatch.vkGetPhysicalDeviceFeatures2 = getPhysicalDeviceFeatures2Nullable!!

        let enumerateDeviceExtensionsAddress = LoadGlobalProc(getProcAddress, instance, "vkEnumerateDeviceExtensionProperties")
        let enumerateDeviceExtensionsNullable = enumerateDeviceExtensionsAddress as (unmanaged[Cdecl] (VkPhysicalDevice, *int8, *uint32, *VkExtensionProperties) -> VkResult)?
        if enumerateDeviceExtensionsNullable == nil {
            throw InvalidOperationException("vkEnumerateDeviceExtensionProperties is unavailable")
        }
        instanceDispatch.vkEnumerateDeviceExtensionProperties = enumerateDeviceExtensionsNullable!!

        let getSurfaceCapabilitiesAddress = LoadGlobalProc(getProcAddress, instance, "vkGetPhysicalDeviceSurfaceCapabilitiesKHR")
        let getSurfaceCapabilitiesNullable = getSurfaceCapabilitiesAddress as (unmanaged[Cdecl] (VkPhysicalDevice, VkSurfaceKHR, *VkSurfaceCapabilitiesKHR) -> VkResult)?
        if getSurfaceCapabilitiesNullable == nil {
            throw InvalidOperationException("vkGetPhysicalDeviceSurfaceCapabilitiesKHR is unavailable")
        }
        instanceDispatch.vkGetPhysicalDeviceSurfaceCapabilitiesKHR = getSurfaceCapabilitiesNullable!!

        let getSurfaceFormatsAddress = LoadGlobalProc(getProcAddress, instance, "vkGetPhysicalDeviceSurfaceFormatsKHR")
        let getSurfaceFormatsNullable = getSurfaceFormatsAddress as (unmanaged[Cdecl] (VkPhysicalDevice, VkSurfaceKHR, *uint32, *VkSurfaceFormatKHR) -> VkResult)?
        if getSurfaceFormatsNullable == nil {
            throw InvalidOperationException("vkGetPhysicalDeviceSurfaceFormatsKHR is unavailable")
        }
        instanceDispatch.vkGetPhysicalDeviceSurfaceFormatsKHR = getSurfaceFormatsNullable!!

        let getPresentModesAddress = LoadGlobalProc(getProcAddress, instance, "vkGetPhysicalDeviceSurfacePresentModesKHR")
        let getPresentModesNullable = getPresentModesAddress as (unmanaged[Cdecl] (VkPhysicalDevice, VkSurfaceKHR, *uint32, *VkPresentModeKHR) -> VkResult)?
        if getPresentModesNullable == nil {
            throw InvalidOperationException("vkGetPhysicalDeviceSurfacePresentModesKHR is unavailable")
        }
        instanceDispatch.vkGetPhysicalDeviceSurfacePresentModesKHR = getPresentModesNullable!!

        let createDeviceAddress = LoadGlobalProc(getProcAddress, instance, "vkCreateDevice")
        let createDeviceNullable = createDeviceAddress as (unmanaged[Cdecl] (VkPhysicalDevice, *VkDeviceCreateInfo, *VkAllocationCallbacks, *VkDevice) -> VkResult)?
        if createDeviceNullable == nil {
            throw InvalidOperationException("vkCreateDevice is unavailable")
        }
        instanceDispatch.vkCreateDevice = createDeviceNullable!!

        window = SDL_CreateWindow("Goo Vulkan Proof", 640, 480, uint64(0x0000000010000000))
        if window == nint(0) {
            throw InvalidOperationException("SDL Vulkan window creation failed")
        }
        if SDL_Vulkan_CreateSurface(window, instance, nil, ref surface) == 0u {
            throw InvalidOperationException("SDL Vulkan surface creation failed")
        }
        surfaceCreated = true

        var physicalDeviceCount uint32 = 0u
        if enumeratePhysicalDevices(instance, &physicalDeviceCount, nil) != VkConstants.VK_SUCCESS || physicalDeviceCount == 0u {
            throw InvalidOperationException("No Vulkan physical device is available")
        }
        let physicalDevices *VkPhysicalDevice = stackalloc [int32(physicalDeviceCount)]VkPhysicalDevice
        if enumeratePhysicalDevices(instance, &physicalDeviceCount, physicalDevices) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkEnumeratePhysicalDevices data query failed")
        }

        let getPhysicalDeviceFeatures2 = instanceDispatch.vkGetPhysicalDeviceFeatures2
        let getPhysicalDeviceProperties = instanceDispatch.vkGetPhysicalDeviceProperties
        let enumerateDeviceExtensions = instanceDispatch.vkEnumerateDeviceExtensionProperties
        let getSurfaceCapabilities = instanceDispatch.vkGetPhysicalDeviceSurfaceCapabilitiesKHR
        let getSurfaceFormats = instanceDispatch.vkGetPhysicalDeviceSurfaceFormatsKHR
        let getPresentModes = instanceDispatch.vkGetPhysicalDeviceSurfacePresentModesKHR
        var selectedPhysicalDevice VkPhysicalDevice = nint(0)
        var selectedQueueFamilyIndex uint32 = 0u
        var selectedSurfaceCapabilities = VkSurfaceCapabilitiesKHR{}
        var selectedSurfaceFormat = VkSurfaceFormatKHR{}
        var selectedPresentMode VkPresentModeKHR = VkConstants.VK_PRESENT_MODE_FIFO_KHR
        var physicalIndex uint32 = 0u
        while physicalIndex < physicalDeviceCount && selectedPhysicalDevice == nint(0) {
            let physicalDevice = physicalDevices[physicalIndex]
            var candidateProperties = VkPhysicalDeviceProperties{}
            getPhysicalDeviceProperties(physicalDevice, &candidateProperties)
            var candidateQualified = candidateProperties.apiVersion >= VkConstants.VK_API_VERSION_1_3
            var candidateQueueFamilyIndex uint32 = 0u
            var hasPresentationQueue = false
            var queueFamilyCount uint32 = 0u
            if candidateQualified {
                queueFamilyProperties(physicalDevice, &queueFamilyCount, nil)
                if queueFamilyCount > 0u {
                    let queueFamilies *VkQueueFamilyProperties = stackalloc [int32(queueFamilyCount)]VkQueueFamilyProperties
                    queueFamilyProperties(physicalDevice, &queueFamilyCount, queueFamilies)
                    var queueFamilyIndex uint32 = 0u
                    while queueFamilyIndex < queueFamilyCount && !hasPresentationQueue {
                        let queueFamily = queueFamilies[queueFamilyIndex]
                        if queueFamily.queueCount > 0u && (queueFamily.queueFlags & uint32(VkConstants.VK_QUEUE_GRAPHICS_BIT)) != 0u {
                            var supported VkBool32 = VkConstants.VK_FALSE
                            if surfaceSupport(physicalDevice, queueFamilyIndex, surface, &supported) != VkConstants.VK_SUCCESS {
                                throw InvalidOperationException("vkGetPhysicalDeviceSurfaceSupportKHR failed")
                            }
                            let sdlSupported = SDL_Vulkan_GetPresentationSupport(instance, physicalDevice, queueFamilyIndex)
                            if supported != VkConstants.VK_FALSE && sdlSupported != 0u {
                                candidateQueueFamilyIndex = queueFamilyIndex
                                hasPresentationQueue = true
                            }
                        }
                        queueFamilyIndex++
                    }
                }
            }

            candidateQualified = candidateQualified && hasPresentationQueue
            var candidateSurfaceCapabilities = VkSurfaceCapabilitiesKHR{}
            var candidateSurfaceFormat = VkSurfaceFormatKHR{}
            var candidatePresentMode VkPresentModeKHR = VkConstants.VK_PRESENT_MODE_FIFO_KHR
            if candidateQualified {
                var supportedFeatures2 = VkPhysicalDeviceFeatures2{}
                var supportedFeatures12 = VkPhysicalDeviceVulkan12Features{}
                var supportedFeatures13 = VkPhysicalDeviceVulkan13Features{}
                supportedFeatures2.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2
                supportedFeatures2.pNext = *void(&supportedFeatures12)
                supportedFeatures12.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES
                supportedFeatures12.pNext = *void(&supportedFeatures13)
                supportedFeatures13.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES
                getPhysicalDeviceFeatures2(physicalDevice, &supportedFeatures2)
                candidateQualified = supportedFeatures12.timelineSemaphore == VkConstants.VK_TRUE && supportedFeatures13.synchronization2 == VkConstants.VK_TRUE && supportedFeatures13.dynamicRendering == VkConstants.VK_TRUE
            }

            if candidateQualified {
                var deviceExtensionCount uint32 = 0u
                if enumerateDeviceExtensions(physicalDevice, nil, &deviceExtensionCount, nil) != VkConstants.VK_SUCCESS || deviceExtensionCount == 0u {
                    candidateQualified = false
                } else {
                    let deviceExtensions *VkExtensionProperties = stackalloc [int32(deviceExtensionCount)]VkExtensionProperties
                    if enumerateDeviceExtensions(physicalDevice, nil, &deviceExtensionCount, deviceExtensions) != VkConstants.VK_SUCCESS {
                        candidateQualified = false
                    } else {
                        var hasSwapchainExtension = false
                        var extensionIndex uint32 = 0u
                        while extensionIndex < deviceExtensionCount && !hasSwapchainExtension {
                            if ExtensionNameEquals(&deviceExtensions[extensionIndex], VkConstants.VK_KHR_SWAPCHAIN_EXTENSION_NAME) {
                                hasSwapchainExtension = true
                            }
                            extensionIndex++
                        }
                        candidateQualified = hasSwapchainExtension
                    }
                }
            }

            if candidateQualified {
                if getSurfaceCapabilities(physicalDevice, surface, &candidateSurfaceCapabilities) != VkConstants.VK_SUCCESS || (candidateSurfaceCapabilities.supportedUsageFlags & uint32(VkConstants.VK_IMAGE_USAGE_TRANSFER_DST_BIT)) == 0u {
                    candidateQualified = false
                }
            }

            if candidateQualified {
                var surfaceFormatCount uint32 = 0u
                if getSurfaceFormats(physicalDevice, surface, &surfaceFormatCount, nil) != VkConstants.VK_SUCCESS || surfaceFormatCount == 0u {
                    candidateQualified = false
                } else {
                    let surfaceFormats *VkSurfaceFormatKHR = stackalloc [int32(surfaceFormatCount)]VkSurfaceFormatKHR
                    if getSurfaceFormats(physicalDevice, surface, &surfaceFormatCount, surfaceFormats) != VkConstants.VK_SUCCESS {
                        candidateQualified = false
                    } else if surfaceFormatCount == 1u && surfaceFormats[0].format == VkConstants.VK_FORMAT_UNDEFINED {
                        candidateSurfaceFormat.format = VkConstants.VK_FORMAT_B8G8R8A8_SRGB
                        candidateSurfaceFormat.colorSpace = VkConstants.VK_COLOR_SPACE_SRGB_NONLINEAR_KHR
                    } else {
                        var hasPreferredFormat = false
                        var formatIndex uint32 = 0u
                        while formatIndex < surfaceFormatCount && !hasPreferredFormat {
                            let format = surfaceFormats[formatIndex]
                            if format.format == VkConstants.VK_FORMAT_B8G8R8A8_SRGB && format.colorSpace == VkConstants.VK_COLOR_SPACE_SRGB_NONLINEAR_KHR {
                                candidateSurfaceFormat = format
                                hasPreferredFormat = true
                            }
                            formatIndex++
                        }
                        formatIndex = 0u
                        while formatIndex < surfaceFormatCount && !hasPreferredFormat {
                            let format = surfaceFormats[formatIndex]
                            if format.format == VkConstants.VK_FORMAT_R8G8B8A8_SRGB && format.colorSpace == VkConstants.VK_COLOR_SPACE_SRGB_NONLINEAR_KHR {
                                candidateSurfaceFormat = format
                                hasPreferredFormat = true
                            }
                            formatIndex++
                        }
                        if !hasPreferredFormat {
                            candidateSurfaceFormat = surfaceFormats[0]
                        }
                    }
                }
            }

            if candidateQualified {
                var presentModeCount uint32 = 0u
                if getPresentModes(physicalDevice, surface, &presentModeCount, nil) != VkConstants.VK_SUCCESS || presentModeCount == 0u {
                    candidateQualified = false
                } else {
                    let presentModes *VkPresentModeKHR = stackalloc [int32(presentModeCount)]VkPresentModeKHR
                    if getPresentModes(physicalDevice, surface, &presentModeCount, presentModes) != VkConstants.VK_SUCCESS {
                        candidateQualified = false
                    } else {
                        var hasFifoPresentMode = false
                        var presentModeIndex uint32 = 0u
                        while presentModeIndex < presentModeCount {
                            if presentModes[presentModeIndex] == VkConstants.VK_PRESENT_MODE_FIFO_KHR {
                                hasFifoPresentMode = true
                            }
                            presentModeIndex++
                        }
                        candidateQualified = hasFifoPresentMode
                    }
                }
            }

            if candidateQualified {
                selectedPhysicalDevice = physicalDevice
                selectedQueueFamilyIndex = candidateQueueFamilyIndex
                selectedSurfaceCapabilities = candidateSurfaceCapabilities
                selectedSurfaceFormat = candidateSurfaceFormat
                selectedPresentMode = candidatePresentMode
            }
            physicalIndex++
        }
        if selectedPhysicalDevice == nint(0) {
            throw InvalidOperationException("No fully qualified Vulkan physical device is available")
        }

        var swapchainExtent = selectedSurfaceCapabilities.currentExtent
        if swapchainExtent.width == uint32.MaxValue {
            swapchainExtent.width = 640u
            if swapchainExtent.width < selectedSurfaceCapabilities.minImageExtent.width {
                swapchainExtent.width = selectedSurfaceCapabilities.minImageExtent.width
            } else if swapchainExtent.width > selectedSurfaceCapabilities.maxImageExtent.width {
                swapchainExtent.width = selectedSurfaceCapabilities.maxImageExtent.width
            }
            swapchainExtent.height = 480u
            if swapchainExtent.height < selectedSurfaceCapabilities.minImageExtent.height {
                swapchainExtent.height = selectedSurfaceCapabilities.minImageExtent.height
            } else if swapchainExtent.height > selectedSurfaceCapabilities.maxImageExtent.height {
                swapchainExtent.height = selectedSurfaceCapabilities.maxImageExtent.height
            }
        }
        var compositeAlpha VkCompositeAlphaFlagBitsKHR = VkConstants.VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR
        var hasCompositeAlpha = false
        if (selectedSurfaceCapabilities.supportedCompositeAlpha & uint32(VkConstants.VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR)) != 0u {
            hasCompositeAlpha = true
        } else if (selectedSurfaceCapabilities.supportedCompositeAlpha & uint32(VkConstants.VK_COMPOSITE_ALPHA_PRE_MULTIPLIED_BIT_KHR)) != 0u {
                compositeAlpha = VkConstants.VK_COMPOSITE_ALPHA_PRE_MULTIPLIED_BIT_KHR
            hasCompositeAlpha = true
        } else if (selectedSurfaceCapabilities.supportedCompositeAlpha & uint32(VkConstants.VK_COMPOSITE_ALPHA_POST_MULTIPLIED_BIT_KHR)) != 0u {
            compositeAlpha = VkConstants.VK_COMPOSITE_ALPHA_POST_MULTIPLIED_BIT_KHR
            hasCompositeAlpha = true
        } else if (selectedSurfaceCapabilities.supportedCompositeAlpha & uint32(VkConstants.VK_COMPOSITE_ALPHA_INHERIT_BIT_KHR)) != 0u {
            compositeAlpha = VkConstants.VK_COMPOSITE_ALPHA_INHERIT_BIT_KHR
            hasCompositeAlpha = true
        }
        if !hasCompositeAlpha {
            throw InvalidOperationException("No supported swapchain composite alpha mode is available")
        }

        var enabledFeatures2 = VkPhysicalDeviceFeatures2{}
        var enabledFeatures12 = VkPhysicalDeviceVulkan12Features{}
        var enabledFeatures13 = VkPhysicalDeviceVulkan13Features{}
        enabledFeatures2.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2
        enabledFeatures2.pNext = *void(&enabledFeatures12)
        enabledFeatures12.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES
        enabledFeatures12.pNext = *void(&enabledFeatures13)
        enabledFeatures12.timelineSemaphore = VkConstants.VK_TRUE
        enabledFeatures13.sType = VkConstants.VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES
        enabledFeatures13.synchronization2 = VkConstants.VK_TRUE
        enabledFeatures13.dynamicRendering = VkConstants.VK_TRUE

        let priorities *float32 = stackalloc [1]float32{1.0F}
        var queueCreateInfo = VkDeviceQueueCreateInfo{}
        queueCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO
        queueCreateInfo.queueFamilyIndex = selectedQueueFamilyIndex
        queueCreateInfo.queueCount = 1u
        queueCreateInfo.pQueuePriorities = priorities

        swapchainExtensionStorage = Marshal.StringToCoTaskMemUTF8(VkConstants.VK_KHR_SWAPCHAIN_EXTENSION_NAME)
        let swapchainExtensionName = *int8(swapchainExtensionStorage)
        var deviceExtensionNamePointer *int8 = swapchainExtensionName
        let deviceExtensionNames = &deviceExtensionNamePointer

        var deviceCreateInfo = VkDeviceCreateInfo{}
        deviceCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO
        deviceCreateInfo.pNext = *void(&enabledFeatures2)
        deviceCreateInfo.queueCreateInfoCount = 1u
        deviceCreateInfo.pQueueCreateInfos = &queueCreateInfo
        deviceCreateInfo.enabledExtensionCount = 1u
        deviceCreateInfo.ppEnabledExtensionNames = deviceExtensionNames
        let createDevice = instanceDispatch.vkCreateDevice
        if createDevice(selectedPhysicalDevice, &deviceCreateInfo, nil, &device) != VkConstants.VK_SUCCESS || device == nint(0) {
            throw InvalidOperationException("vkCreateDevice failed")
        }
        deviceCreated = true

        let getDeviceProcAddress = instanceDispatch.vkGetDeviceProcAddr
        let destroyDeviceAddressLoaded = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkDestroyDevice")
        destroyDeviceAddress = destroyDeviceAddressLoaded
        let destroyDeviceNullable = destroyDeviceAddressLoaded as (unmanaged[Cdecl] (VkDevice, *VkAllocationCallbacks) -> void)?
        if destroyDeviceNullable == nil {
            throw InvalidOperationException("vkDestroyDevice is unavailable")
        }
        deviceDispatch.vkDestroyDevice = destroyDeviceNullable!!
        let getDeviceQueueAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkGetDeviceQueue")
        let getDeviceQueueNullable = getDeviceQueueAddress as (unmanaged[Cdecl] (VkDevice, uint32, uint32, *VkQueue) -> void)?
        if getDeviceQueueNullable == nil { throw InvalidOperationException("vkGetDeviceQueue is unavailable") }
        deviceDispatch.vkGetDeviceQueue = getDeviceQueueNullable!!
        let createSwapchainAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkCreateSwapchainKHR")
        let createSwapchainNullable = createSwapchainAddress as (unmanaged[Cdecl] (VkDevice, *VkSwapchainCreateInfoKHR, *VkAllocationCallbacks, *VkSwapchainKHR) -> VkResult)?
        if createSwapchainNullable == nil { throw InvalidOperationException("vkCreateSwapchainKHR is unavailable") }
        deviceDispatch.vkCreateSwapchainKHR = createSwapchainNullable!!
        let destroySwapchainAddressLoaded = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkDestroySwapchainKHR")
        destroySwapchainAddress = destroySwapchainAddressLoaded
        let destroySwapchainNullable = destroySwapchainAddressLoaded as (unmanaged[Cdecl] (VkDevice, VkSwapchainKHR, *VkAllocationCallbacks) -> void)?
        if destroySwapchainNullable == nil { throw InvalidOperationException("vkDestroySwapchainKHR is unavailable") }
        deviceDispatch.vkDestroySwapchainKHR = destroySwapchainNullable!!
        let getSwapchainImagesAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkGetSwapchainImagesKHR")
        let getSwapchainImagesNullable = getSwapchainImagesAddress as (unmanaged[Cdecl] (VkDevice, VkSwapchainKHR, *uint32, *VkImage) -> VkResult)?
        if getSwapchainImagesNullable == nil { throw InvalidOperationException("vkGetSwapchainImagesKHR is unavailable") }
        deviceDispatch.vkGetSwapchainImagesKHR = getSwapchainImagesNullable!!
        let createCommandPoolAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkCreateCommandPool")
        let createCommandPoolNullable = createCommandPoolAddress as (unmanaged[Cdecl] (VkDevice, *VkCommandPoolCreateInfo, *VkAllocationCallbacks, *VkCommandPool) -> VkResult)?
        if createCommandPoolNullable == nil { throw InvalidOperationException("vkCreateCommandPool is unavailable") }
        deviceDispatch.vkCreateCommandPool = createCommandPoolNullable!!
        let destroyCommandPoolAddressLoaded = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkDestroyCommandPool")
        destroyCommandPoolAddress = destroyCommandPoolAddressLoaded
        let destroyCommandPoolNullable = destroyCommandPoolAddressLoaded as (unmanaged[Cdecl] (VkDevice, VkCommandPool, *VkAllocationCallbacks) -> void)?
        if destroyCommandPoolNullable == nil { throw InvalidOperationException("vkDestroyCommandPool is unavailable") }
        deviceDispatch.vkDestroyCommandPool = destroyCommandPoolNullable!!
        let allocateCommandBuffersAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkAllocateCommandBuffers")
        let allocateCommandBuffersNullable = allocateCommandBuffersAddress as (unmanaged[Cdecl] (VkDevice, *VkCommandBufferAllocateInfo, *VkCommandBuffer) -> VkResult)?
        if allocateCommandBuffersNullable == nil { throw InvalidOperationException("vkAllocateCommandBuffers is unavailable") }
        deviceDispatch.vkAllocateCommandBuffers = allocateCommandBuffersNullable!!
        let createSemaphoreAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkCreateSemaphore")
        let createSemaphoreNullable = createSemaphoreAddress as (unmanaged[Cdecl] (VkDevice, *VkSemaphoreCreateInfo, *VkAllocationCallbacks, *VkSemaphore) -> VkResult)?
        if createSemaphoreNullable == nil { throw InvalidOperationException("vkCreateSemaphore is unavailable") }
        deviceDispatch.vkCreateSemaphore = createSemaphoreNullable!!
        let destroySemaphoreAddressLoaded = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkDestroySemaphore")
        destroySemaphoreAddress = destroySemaphoreAddressLoaded
        let destroySemaphoreNullable = destroySemaphoreAddressLoaded as (unmanaged[Cdecl] (VkDevice, VkSemaphore, *VkAllocationCallbacks) -> void)?
        if destroySemaphoreNullable == nil { throw InvalidOperationException("vkDestroySemaphore is unavailable") }
        deviceDispatch.vkDestroySemaphore = destroySemaphoreNullable!!
        let createFenceAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkCreateFence")
        let createFenceNullable = createFenceAddress as (unmanaged[Cdecl] (VkDevice, *VkFenceCreateInfo, *VkAllocationCallbacks, *VkFence) -> VkResult)?
        if createFenceNullable == nil { throw InvalidOperationException("vkCreateFence is unavailable") }
        deviceDispatch.vkCreateFence = createFenceNullable!!
        let destroyFenceAddressLoaded = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkDestroyFence")
        destroyFenceAddress = destroyFenceAddressLoaded
        let destroyFenceNullable = destroyFenceAddressLoaded as (unmanaged[Cdecl] (VkDevice, VkFence, *VkAllocationCallbacks) -> void)?
        if destroyFenceNullable == nil { throw InvalidOperationException("vkDestroyFence is unavailable") }
        deviceDispatch.vkDestroyFence = destroyFenceNullable!!
        let waitForFencesAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkWaitForFences")
        let waitForFencesNullable = waitForFencesAddress as (unmanaged[Cdecl] (VkDevice, uint32, *VkFence, VkBool32, uint64) -> VkResult)?
        if waitForFencesNullable == nil { throw InvalidOperationException("vkWaitForFences is unavailable") }
        deviceDispatch.vkWaitForFences = waitForFencesNullable!!
        let acquireNextImageAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkAcquireNextImageKHR")
        let acquireNextImageNullable = acquireNextImageAddress as (unmanaged[Cdecl] (VkDevice, VkSwapchainKHR, uint64, VkSemaphore, VkFence, *uint32) -> VkResult)?
        if acquireNextImageNullable == nil { throw InvalidOperationException("vkAcquireNextImageKHR is unavailable") }
        deviceDispatch.vkAcquireNextImageKHR = acquireNextImageNullable!!
        let beginCommandBufferAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkBeginCommandBuffer")
        let beginCommandBufferNullable = beginCommandBufferAddress as (unmanaged[Cdecl] (VkCommandBuffer, *VkCommandBufferBeginInfo) -> VkResult)?
        if beginCommandBufferNullable == nil { throw InvalidOperationException("vkBeginCommandBuffer is unavailable") }
        deviceDispatch.vkBeginCommandBuffer = beginCommandBufferNullable!!
        let endCommandBufferAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkEndCommandBuffer")
        let endCommandBufferNullable = endCommandBufferAddress as (unmanaged[Cdecl] (VkCommandBuffer) -> VkResult)?
        if endCommandBufferNullable == nil { throw InvalidOperationException("vkEndCommandBuffer is unavailable") }
        deviceDispatch.vkEndCommandBuffer = endCommandBufferNullable!!
        let pipelineBarrierAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkCmdPipelineBarrier2")
        let pipelineBarrierNullable = pipelineBarrierAddress as (unmanaged[Cdecl] (VkCommandBuffer, *VkDependencyInfo) -> void)?
        if pipelineBarrierNullable == nil { throw InvalidOperationException("vkCmdPipelineBarrier2 is unavailable") }
        deviceDispatch.vkCmdPipelineBarrier2 = pipelineBarrierNullable!!
        let clearColorAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkCmdClearColorImage")
        let clearColorNullable = clearColorAddress as (unmanaged[Cdecl] (VkCommandBuffer, VkImage, VkImageLayout, *VkClearColorValue, uint32, *VkImageSubresourceRange) -> void)?
        if clearColorNullable == nil { throw InvalidOperationException("vkCmdClearColorImage is unavailable") }
        deviceDispatch.vkCmdClearColorImage = clearColorNullable!!
        let queueSubmitAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkQueueSubmit2")
        let queueSubmitNullable = queueSubmitAddress as (unmanaged[Cdecl] (VkQueue, uint32, *VkSubmitInfo2, VkFence) -> VkResult)?
        if queueSubmitNullable == nil { throw InvalidOperationException("vkQueueSubmit2 is unavailable") }
        deviceDispatch.vkQueueSubmit2 = queueSubmitNullable!!
        let queuePresentAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkQueuePresentKHR")
        let queuePresentNullable = queuePresentAddress as (unmanaged[Cdecl] (VkQueue, *VkPresentInfoKHR) -> VkResult)?
        if queuePresentNullable == nil { throw InvalidOperationException("vkQueuePresentKHR is unavailable") }
        deviceDispatch.vkQueuePresentKHR = queuePresentNullable!!
        queueWaitIdleAddress = LoadDeviceProc(getDeviceProcAddressAddress, device, "vkQueueWaitIdle")
        let queueWaitIdleNullable = queueWaitIdleAddress as (unmanaged[Cdecl] (VkQueue) -> VkResult)?
        if queueWaitIdleNullable == nil { throw InvalidOperationException("vkQueueWaitIdle is unavailable") }
        deviceDispatch.vkQueueWaitIdle = queueWaitIdleNullable!!

        let getDeviceQueue = deviceDispatch.vkGetDeviceQueue
        getDeviceQueue(device, selectedQueueFamilyIndex, 0u, &queue)
        if queue == nint(0) { throw InvalidOperationException("Vulkan queue acquisition failed") }

        var imageCount uint32 = selectedSurfaceCapabilities.minImageCount + 1u
        if selectedSurfaceCapabilities.maxImageCount != 0u && imageCount > selectedSurfaceCapabilities.maxImageCount {
            imageCount = selectedSurfaceCapabilities.maxImageCount
        }
        var swapchainCreateInfo = VkSwapchainCreateInfoKHR{}
        swapchainCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR
        swapchainCreateInfo.surface = surface
        swapchainCreateInfo.minImageCount = imageCount
        swapchainCreateInfo.imageFormat = selectedSurfaceFormat.format
        swapchainCreateInfo.imageColorSpace = selectedSurfaceFormat.colorSpace
        swapchainCreateInfo.imageExtent = swapchainExtent
        swapchainCreateInfo.imageArrayLayers = 1u
        swapchainCreateInfo.imageUsage = uint32(VkConstants.VK_IMAGE_USAGE_TRANSFER_DST_BIT)
        swapchainCreateInfo.imageSharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
        swapchainCreateInfo.preTransform = selectedSurfaceCapabilities.currentTransform
        swapchainCreateInfo.compositeAlpha = compositeAlpha
        swapchainCreateInfo.presentMode = selectedPresentMode
        swapchainCreateInfo.clipped = VkConstants.VK_TRUE
        let createSwapchain = deviceDispatch.vkCreateSwapchainKHR
        if createSwapchain(device, &swapchainCreateInfo, nil, &swapchain) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkCreateSwapchainKHR failed")
        }
        swapchainCreated = true

        var swapchainImageCount uint32 = 0u
        let getSwapchainImages = deviceDispatch.vkGetSwapchainImagesKHR
        if getSwapchainImages(device, swapchain, &swapchainImageCount, nil) != VkConstants.VK_SUCCESS || swapchainImageCount == 0u {
            throw InvalidOperationException("Swapchain images are unavailable")
        }
        let swapchainImages *VkImage = stackalloc [int32(swapchainImageCount)]VkImage
        if getSwapchainImages(device, swapchain, &swapchainImageCount, swapchainImages) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("Swapchain image enumeration failed")
        }

        var commandPoolCreateInfo = VkCommandPoolCreateInfo{}
        commandPoolCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO
        commandPoolCreateInfo.flags = uint32(VkConstants.VK_COMMAND_POOL_CREATE_TRANSIENT_BIT)
        commandPoolCreateInfo.queueFamilyIndex = selectedQueueFamilyIndex
        let createCommandPool = deviceDispatch.vkCreateCommandPool
        if createCommandPool(device, &commandPoolCreateInfo, nil, &commandPool) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkCreateCommandPool failed")
        }
        commandPoolCreated = true

        var commandBufferAllocateInfo = VkCommandBufferAllocateInfo{}
        commandBufferAllocateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO
        commandBufferAllocateInfo.commandPool = commandPool
        commandBufferAllocateInfo.level = VkConstants.VK_COMMAND_BUFFER_LEVEL_PRIMARY
        commandBufferAllocateInfo.commandBufferCount = 1u
        let allocateCommandBuffers = deviceDispatch.vkAllocateCommandBuffers
        if allocateCommandBuffers(device, &commandBufferAllocateInfo, &commandBuffer) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkAllocateCommandBuffers failed")
        }

        var semaphoreCreateInfo = VkSemaphoreCreateInfo{}
        semaphoreCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO
        let createSemaphore = deviceDispatch.vkCreateSemaphore
        if createSemaphore(device, &semaphoreCreateInfo, nil, &acquireSemaphore) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("acquire semaphore creation failed")
        }
        acquireSemaphoreCreated = true
        if createSemaphore(device, &semaphoreCreateInfo, nil, &renderSemaphore) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("render semaphore creation failed")
        }
        renderSemaphoreCreated = true

        var fenceCreateInfo = VkFenceCreateInfo{}
        fenceCreateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_FENCE_CREATE_INFO
        let createFence = deviceDispatch.vkCreateFence
        if createFence(device, &fenceCreateInfo, nil, &fence) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("fence creation failed")
        }
        fenceCreated = true

        var imageIndex uint32 = 0u
        let acquireNextImage = deviceDispatch.vkAcquireNextImageKHR
        let acquireResult = acquireNextImage(device, swapchain, VkConstants.VK_WHOLE_SIZE, acquireSemaphore, uint64(0), &imageIndex)
        if acquireResult != VkConstants.VK_SUCCESS && acquireResult != VkConstants.VK_SUBOPTIMAL_KHR {
            throw InvalidOperationException("vkAcquireNextImageKHR failed")
        }
        if imageIndex >= swapchainImageCount { throw InvalidOperationException("Acquired image index is invalid") }

        var commandBufferBeginInfo = VkCommandBufferBeginInfo{}
        commandBufferBeginInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO
        commandBufferBeginInfo.flags = uint32(VkConstants.VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT)
        let beginCommandBuffer = deviceDispatch.vkBeginCommandBuffer
        if beginCommandBuffer(commandBuffer, &commandBufferBeginInfo) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkBeginCommandBuffer failed")
        }

        var subresourceRange = VkImageSubresourceRange{}
        subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
        subresourceRange.levelCount = 1u
        subresourceRange.layerCount = 1u
        var toTransferBarrier = VkImageMemoryBarrier2{}
        toTransferBarrier.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
        toTransferBarrier.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT
        toTransferBarrier.srcAccessMask = VkConstants.VK_ACCESS_2_NONE
        toTransferBarrier.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_TRANSFER_BIT
        toTransferBarrier.dstAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT
        toTransferBarrier.oldLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
        toTransferBarrier.newLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL
        toTransferBarrier.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        toTransferBarrier.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        toTransferBarrier.image = swapchainImages[imageIndex]
        toTransferBarrier.subresourceRange = subresourceRange
        var firstDependency = VkDependencyInfo{}
        firstDependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
        firstDependency.imageMemoryBarrierCount = 1u
        firstDependency.pImageMemoryBarriers = &toTransferBarrier
        let pipelineBarrier = deviceDispatch.vkCmdPipelineBarrier2
        pipelineBarrier(commandBuffer, &firstDependency)

        var clearColor = VkClearColorValue{}
        clearColor.float32.values[0] = 0.05F
        clearColor.float32.values[1] = 0.30F
        clearColor.float32.values[2] = 0.90F
        clearColor.float32.values[3] = 1.0F
        let clearColorImage = deviceDispatch.vkCmdClearColorImage
        clearColorImage(commandBuffer, swapchainImages[imageIndex], VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, &clearColor, 1u, &subresourceRange)

        var toPresentBarrier = VkImageMemoryBarrier2{}
        toPresentBarrier.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
        toPresentBarrier.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TRANSFER_BIT
        toPresentBarrier.srcAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT
        toPresentBarrier.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_BOTTOM_OF_PIPE_BIT
        toPresentBarrier.dstAccessMask = VkConstants.VK_ACCESS_2_NONE
        toPresentBarrier.oldLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL
        toPresentBarrier.newLayout = VkConstants.VK_IMAGE_LAYOUT_PRESENT_SRC_KHR
        toPresentBarrier.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        toPresentBarrier.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        toPresentBarrier.image = swapchainImages[imageIndex]
        toPresentBarrier.subresourceRange = subresourceRange
        var secondDependency = VkDependencyInfo{}
        secondDependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
        secondDependency.imageMemoryBarrierCount = 1u
        secondDependency.pImageMemoryBarriers = &toPresentBarrier
        pipelineBarrier(commandBuffer, &secondDependency)

        let endCommandBuffer = deviceDispatch.vkEndCommandBuffer
        if endCommandBuffer(commandBuffer) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkEndCommandBuffer failed")
        }

        var waitSemaphoreInfo = VkSemaphoreSubmitInfo{}
        waitSemaphoreInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO
        waitSemaphoreInfo.semaphore = acquireSemaphore
        waitSemaphoreInfo.stageMask = VkConstants.VK_PIPELINE_STAGE_2_TRANSFER_BIT
        var signalSemaphoreInfo = VkSemaphoreSubmitInfo{}
        signalSemaphoreInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO
        signalSemaphoreInfo.semaphore = renderSemaphore
        signalSemaphoreInfo.stageMask = VkConstants.VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT
        var commandBufferSubmitInfo = VkCommandBufferSubmitInfo{}
        commandBufferSubmitInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_BUFFER_SUBMIT_INFO
        commandBufferSubmitInfo.commandBuffer = commandBuffer
        var submitInfo = VkSubmitInfo2{}
        submitInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SUBMIT_INFO_2
        submitInfo.waitSemaphoreInfoCount = 1u
        submitInfo.pWaitSemaphoreInfos = &waitSemaphoreInfo
        submitInfo.commandBufferInfoCount = 1u
        submitInfo.pCommandBufferInfos = &commandBufferSubmitInfo
        submitInfo.signalSemaphoreInfoCount = 1u
        submitInfo.pSignalSemaphoreInfos = &signalSemaphoreInfo
        let queueSubmit = deviceDispatch.vkQueueSubmit2
        if queueSubmit(queue, 1u, &submitInfo, fence) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkQueueSubmit2 failed")
        }

        var presentInfo = VkPresentInfoKHR{}
        presentInfo.sType = VkConstants.VK_STRUCTURE_TYPE_PRESENT_INFO_KHR
        presentInfo.waitSemaphoreCount = 1u
        presentInfo.pWaitSemaphores = &renderSemaphore
        presentInfo.swapchainCount = 1u
        presentInfo.pSwapchains = &swapchain
        presentInfo.pImageIndices = &imageIndex
        let queuePresent = deviceDispatch.vkQueuePresentKHR
        let presentResult = queuePresent(queue, &presentInfo)
        if presentResult != VkConstants.VK_SUCCESS && presentResult != VkConstants.VK_SUBOPTIMAL_KHR {
            throw InvalidOperationException("vkQueuePresentKHR failed")
        }
        let waitForFences = deviceDispatch.vkWaitForFences
        if waitForFences(device, 1u, &fence, VkConstants.VK_TRUE, VkConstants.VK_WHOLE_SIZE) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkWaitForFences failed")
        }
        let queueWaitIdle = deviceDispatch.vkQueueWaitIdle
        if queueWaitIdle(queue) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkQueueWaitIdle failed")
        }
        Console.WriteLine("Vulkan version: ${apiVersion}")
        Console.WriteLine("Physical devices: ${physicalDeviceCount}")
        Console.WriteLine("Queue family: ${selectedQueueFamilyIndex}")
        Console.WriteLine("Swapchain images: ${swapchainImageCount}")
        Console.WriteLine("One-frame clear/present: true")
        return 0
    } finally {
        if deviceCreated && queue != nint(0) && queueWaitIdleAddress != nint(0) {
            let queueWaitIdleNullable = queueWaitIdleAddress as (unmanaged[Cdecl] (VkQueue) -> VkResult)?
            if queueWaitIdleNullable != nil {
                let queueWaitIdle = queueWaitIdleNullable!!
                queueWaitIdle(queue)
            }
        }
        if fenceCreated && destroyFenceAddress != nint(0) {
            let destroyFenceNullable = destroyFenceAddress as (unmanaged[Cdecl] (VkDevice, VkFence, *VkAllocationCallbacks) -> void)?
            if destroyFenceNullable != nil {
                let destroyFence = destroyFenceNullable!!
                destroyFence(device, fence, nil)
            }
        }
        if renderSemaphoreCreated && destroySemaphoreAddress != nint(0) {
            let destroySemaphoreNullable = destroySemaphoreAddress as (unmanaged[Cdecl] (VkDevice, VkSemaphore, *VkAllocationCallbacks) -> void)?
            if destroySemaphoreNullable != nil {
                let destroySemaphore = destroySemaphoreNullable!!
                destroySemaphore(device, renderSemaphore, nil)
            }
        }
        if acquireSemaphoreCreated && destroySemaphoreAddress != nint(0) {
            let destroySemaphoreNullable = destroySemaphoreAddress as (unmanaged[Cdecl] (VkDevice, VkSemaphore, *VkAllocationCallbacks) -> void)?
            if destroySemaphoreNullable != nil {
                let destroySemaphore = destroySemaphoreNullable!!
                destroySemaphore(device, acquireSemaphore, nil)
            }
        }
        if commandPoolCreated && destroyCommandPoolAddress != nint(0) {
            let destroyCommandPoolNullable = destroyCommandPoolAddress as (unmanaged[Cdecl] (VkDevice, VkCommandPool, *VkAllocationCallbacks) -> void)?
            if destroyCommandPoolNullable != nil {
                let destroyCommandPool = destroyCommandPoolNullable!!
                destroyCommandPool(device, commandPool, nil)
            }
        }
        if swapchainCreated && destroySwapchainAddress != nint(0) {
            let destroySwapchainNullable = destroySwapchainAddress as (unmanaged[Cdecl] (VkDevice, VkSwapchainKHR, *VkAllocationCallbacks) -> void)?
            if destroySwapchainNullable != nil {
                let destroySwapchain = destroySwapchainNullable!!
                destroySwapchain(device, swapchain, nil)
            }
        }
        if deviceCreated && destroyDeviceAddress != nint(0) {
            let destroyDeviceNullable = destroyDeviceAddress as (unmanaged[Cdecl] (VkDevice, *VkAllocationCallbacks) -> void)?
            if destroyDeviceNullable != nil {
                let destroyDevice = destroyDeviceNullable!!
                destroyDevice(device, nil)
            }
        }
        if swapchainExtensionStorage != nint(0) {
            Marshal.FreeCoTaskMem(swapchainExtensionStorage)
        }
        if surfaceCreated {
            SDL_Vulkan_DestroySurface(instance, surface, nil)
        }
        if window != nint(0) {
            SDL_DestroyWindow(window)
        }
        if instance != nint(0) && destroyInstanceAddress != nint(0) {
            let destroyInstanceNullable = destroyInstanceAddress as (unmanaged[Cdecl] (VkInstance, *VkAllocationCallbacks) -> void)?
            if destroyInstanceNullable != nil {
                let destroyInstance = destroyInstanceNullable!!
                destroyInstance(instance, nil)
            }
        }
        if engineNameStorage != nint(0) {
            Marshal.FreeCoTaskMem(engineNameStorage)
        }
        if appNameStorage != nint(0) {
            Marshal.FreeCoTaskMem(appNameStorage)
        }
        if vulkanLoaded {
            SDL_Vulkan_UnloadLibrary()
        }
        if sdlInitialized {
            SDL_Quit()
        }
    }
}
