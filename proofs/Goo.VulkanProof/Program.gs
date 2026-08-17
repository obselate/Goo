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

unsafe func Main() int32 {
    var sdlInitialized = false
    var vulkanLoaded = false
    var window nint = nint(0)
    var instance VkInstance = nint(0)
    var surface VkSurfaceKHR = uint64(0)
    var surfaceCreated = false
    var appNameStorage nint = nint(0)
    var engineNameStorage nint = nint(0)
    var destroyInstanceAddress nint = nint(0)
    var globalDispatch = VkGlobalDispatch{}
    var instanceDispatch = VkInstanceDispatch{}

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
        globalDispatch.vkGetInstanceProcAddr = getProcNullable!!
        let enumerateVersionAddress = LoadGlobalProc(getProcAddress, nint(0), "vkEnumerateInstanceVersion")
        let enumerateVersionNullable = enumerateVersionAddress as (unmanaged[Cdecl] (*uint32) -> VkResult)?
        if enumerateVersionNullable == nil {
            throw InvalidOperationException("vkEnumerateInstanceVersion is unavailable")
        }
        globalDispatch.vkEnumerateInstanceVersion = enumerateVersionNullable!!
        let enumerateVersion = globalDispatch.vkEnumerateInstanceVersion

        let enumerateExtensionsAddress = LoadGlobalProc(getProcAddress, nint(0), "vkEnumerateInstanceExtensionProperties")
        let enumerateExtensionsNullable = enumerateExtensionsAddress as (unmanaged[Cdecl] (*int8, *uint32, *VkExtensionProperties) -> VkResult)?
        if enumerateExtensionsNullable == nil {
            throw InvalidOperationException("vkEnumerateInstanceExtensionProperties is unavailable")
        }
        globalDispatch.vkEnumerateInstanceExtensionProperties = enumerateExtensionsNullable!!
        let enumerateExtensions = globalDispatch.vkEnumerateInstanceExtensionProperties

        let createInstanceAddress = LoadGlobalProc(getProcAddress, nint(0), "vkCreateInstance")
        let createInstanceNullable = createInstanceAddress as (unmanaged[Cdecl] (*VkInstanceCreateInfo, *VkAllocationCallbacks, *VkInstance) -> VkResult)?
        if createInstanceNullable == nil {
            throw InvalidOperationException("vkCreateInstance is unavailable")
        }
        globalDispatch.vkCreateInstance = createInstanceNullable!!
        let createInstance = globalDispatch.vkCreateInstance

        var apiVersion uint32 = 0u
        let versionResult = enumerateVersion(&apiVersion)
        if versionResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkEnumerateInstanceVersion failed")
        }
        if apiVersion < VkConstants.VK_API_VERSION_1_3 {
            throw InvalidOperationException("Vulkan 1.3 is required")
        }
        Console.WriteLine("Vulkan version: ${apiVersion}")

        var availableExtensionCount uint32 = 0u
        let extensionCountResult = enumerateExtensions(nil, &availableExtensionCount, nil)
        if extensionCountResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkEnumerateInstanceExtensionProperties failed")
        }
        if availableExtensionCount > 0u {
            let availableExtensions *VkExtensionProperties = stackalloc [int32(availableExtensionCount)]VkExtensionProperties
            let extensionResult = enumerateExtensions(nil, &availableExtensionCount, availableExtensions)
            if extensionResult != VkConstants.VK_SUCCESS {
                throw InvalidOperationException("vkEnumerateInstanceExtensionProperties data query failed")
            }
        }
        Console.WriteLine("Instance extensions: ${availableExtensionCount}")

        var requiredExtensionCount uint32 = 0u
        let requiredExtensions = SDL_Vulkan_GetInstanceExtensions(ref requiredExtensionCount)
        if requiredExtensions == nil || requiredExtensionCount == 0u {
            throw InvalidOperationException("SDL Vulkan instance extensions are unavailable")
        }

        appNameStorage = Marshal.StringToCoTaskMemUTF8("Goo Vulkan Proof")
        engineNameStorage = Marshal.StringToCoTaskMemUTF8("Goo")
        var applicationInfo = VkApplicationInfo{}
        applicationInfo.sType = VkConstants.VK_STRUCTURE_TYPE_APPLICATION_INFO
        applicationInfo.pNext = nil
        applicationInfo.pApplicationName = *int8(appNameStorage)
        applicationInfo.applicationVersion = 1u
        applicationInfo.pEngineName = *int8(engineNameStorage)
        applicationInfo.engineVersion = 1u
        applicationInfo.apiVersion = VkConstants.VK_API_VERSION_1_3

        var createInfo = VkInstanceCreateInfo{}
        createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO
        createInfo.pNext = nil
        createInfo.flags = uint32(0)
        createInfo.pApplicationInfo = &applicationInfo
        createInfo.enabledLayerCount = 0u
        createInfo.ppEnabledLayerNames = nil
        createInfo.enabledExtensionCount = requiredExtensionCount
        createInfo.ppEnabledExtensionNames = requiredExtensions

        let createResult = createInstance(&createInfo, nil, &instance)
        if createResult != VkConstants.VK_SUCCESS || instance == nint(0) {
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
        instanceDispatch.vkEnumeratePhysicalDevices = enumeratePhysicalDevicesNullable!!
        let enumeratePhysicalDevices = instanceDispatch.vkEnumeratePhysicalDevices

        let queueFamilyPropertiesAddress = LoadGlobalProc(getProcAddress, instance, "vkGetPhysicalDeviceQueueFamilyProperties")
        let queueFamilyPropertiesNullable = queueFamilyPropertiesAddress as (unmanaged[Cdecl] (VkPhysicalDevice, *uint32, *VkQueueFamilyProperties) -> void)?
        if queueFamilyPropertiesNullable == nil {
            throw InvalidOperationException("vkGetPhysicalDeviceQueueFamilyProperties is unavailable")
        }
        instanceDispatch.vkGetPhysicalDeviceQueueFamilyProperties = queueFamilyPropertiesNullable!!
        let queueFamilyProperties = instanceDispatch.vkGetPhysicalDeviceQueueFamilyProperties

        let surfaceSupportAddress = LoadGlobalProc(getProcAddress, instance, "vkGetPhysicalDeviceSurfaceSupportKHR")
        let surfaceSupportNullable = surfaceSupportAddress as (unmanaged[Cdecl] (VkPhysicalDevice, uint32, VkSurfaceKHR, *VkBool32) -> VkResult)?
        if surfaceSupportNullable == nil {
            throw InvalidOperationException("vkGetPhysicalDeviceSurfaceSupportKHR is unavailable")
        }
        instanceDispatch.vkGetPhysicalDeviceSurfaceSupportKHR = surfaceSupportNullable!!
        let surfaceSupport = instanceDispatch.vkGetPhysicalDeviceSurfaceSupportKHR

        window = SDL_CreateWindow("Goo Vulkan Proof", 640, 480, uint64(0x0000000010000000))
        if window == nint(0) {
            throw InvalidOperationException("SDL Vulkan window creation failed")
        }

        if SDL_Vulkan_CreateSurface(window, instance, nil, ref surface) == 0u {
            throw InvalidOperationException("SDL Vulkan surface creation failed")
        }
        surfaceCreated = true

        var physicalDeviceCount uint32 = 0u
        let physicalCountResult = enumeratePhysicalDevices(instance, &physicalDeviceCount, nil)
        if physicalCountResult != VkConstants.VK_SUCCESS || physicalDeviceCount == 0u {
            throw InvalidOperationException("No Vulkan physical device is available")
        }
        let physicalDevices *VkPhysicalDevice = stackalloc [int32(physicalDeviceCount)]VkPhysicalDevice
        let physicalResult = enumeratePhysicalDevices(instance, &physicalDeviceCount, physicalDevices)
        if physicalResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkEnumeratePhysicalDevices data query failed")
        }

        var hasPresentationQueue = false
        var physicalIndex uint32 = 0u
        while physicalIndex < physicalDeviceCount && !hasPresentationQueue {
            let physicalDevice = physicalDevices[physicalIndex]
            var queueFamilyCount uint32 = 0u
            queueFamilyProperties(physicalDevice, &queueFamilyCount, nil)
            if queueFamilyCount > 0u {
                let queueFamilies *VkQueueFamilyProperties = stackalloc [int32(queueFamilyCount)]VkQueueFamilyProperties
                queueFamilyProperties(physicalDevice, &queueFamilyCount, queueFamilies)
                var queueFamilyIndex uint32 = 0u
                while queueFamilyIndex < queueFamilyCount && !hasPresentationQueue {
                    let queueFamily = queueFamilies[queueFamilyIndex]
                    if queueFamily.queueCount > 0u && (queueFamily.queueFlags & uint32(VkConstants.VK_QUEUE_GRAPHICS_BIT)) != 0u {
                        var supported VkBool32 = VkConstants.VK_FALSE
                        let supportResult = surfaceSupport(physicalDevice, queueFamilyIndex, surface, &supported)
                        if supportResult != VkConstants.VK_SUCCESS {
                            throw InvalidOperationException("vkGetPhysicalDeviceSurfaceSupportKHR failed")
                        }
                        let sdlSupported = SDL_Vulkan_GetPresentationSupport(instance, physicalDevice, queueFamilyIndex)
                        hasPresentationQueue = supported != VkConstants.VK_FALSE && sdlSupported != 0u
                    }
                    queueFamilyIndex++
                }
            }
            physicalIndex++
        }
        if !hasPresentationQueue {
            throw InvalidOperationException("No graphics presentation queue is available")
        }
        Console.WriteLine("Physical devices: ${physicalDeviceCount}")
        Console.WriteLine("Graphics presentation queue: true")
        return 0
    } finally {
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
