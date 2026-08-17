package Goo.Vulkan.Generated

import System.Runtime.InteropServices

type VkBool32 = uint32
type VkFlags = uint32
type VkInstance = nint
type VkInstanceCreateFlagBits = int32
type VkInstanceCreateFlags = VkFlags
type VkInternalAllocationType = int32
type VkPhysicalDevice = nint
type VkQueueFlagBits = int32
type VkQueueFlags = VkFlags
type VkResult = int32
type VkStructureType = int32
type VkSurfaceKHR = uint64
type VkSystemAllocationScope = int32
class VkConstants {
    shared {
        const VK_API_VERSION_1_0 uint32 = 4194304u
        const VK_API_VERSION_1_1 uint32 = 4198400u
        const VK_API_VERSION_1_2 uint32 = 4202496u
        const VK_API_VERSION_1_3 uint32 = 4206592u
        const VK_ATTACHMENT_UNUSED uint32 = 4294967295u
        const VK_COMPRESSED_TRIANGLE_FORMAT_DGF1_BYTE_ALIGNMENT_AMDX uint32 = 128u
        const VK_COMPRESSED_TRIANGLE_FORMAT_DGF1_BYTE_STRIDE_AMDX uint32 = 128u
        const VK_COMPUTE_OCCUPANCY_PRIORITY_HIGH_NV float32 = 0.75F
        const VK_COMPUTE_OCCUPANCY_PRIORITY_LOW_NV float32 = 0.25F
        const VK_COMPUTE_OCCUPANCY_PRIORITY_NORMAL_NV float32 = 0.50F
        const VK_DATA_GRAPH_MODEL_TOOLCHAIN_VERSION_LENGTH_QCOM uint32 = 3u
        const VK_ERROR_DEVICE_LOST VkResult = -4
        const VK_ERROR_EXTENSION_NOT_PRESENT VkResult = -7
        const VK_ERROR_FEATURE_NOT_PRESENT VkResult = -8
        const VK_ERROR_FORMAT_NOT_SUPPORTED VkResult = -11
        const VK_ERROR_FRAGMENTED_POOL VkResult = -12
        const VK_ERROR_INCOMPATIBLE_DRIVER VkResult = -9
        const VK_ERROR_INITIALIZATION_FAILED VkResult = -3
        const VK_ERROR_LAYER_NOT_PRESENT VkResult = -6
        const VK_ERROR_MEMORY_MAP_FAILED VkResult = -5
        const VK_ERROR_NATIVE_WINDOW_IN_USE_KHR VkResult = -1000000001
        const VK_ERROR_OUT_OF_DATE_KHR VkResult = -1000001004
        const VK_ERROR_OUT_OF_DEVICE_MEMORY VkResult = -2
        const VK_ERROR_OUT_OF_HOST_MEMORY VkResult = -1
        const VK_ERROR_SURFACE_LOST_KHR VkResult = -1000000000
        const VK_ERROR_TOO_MANY_OBJECTS VkResult = -10
        const VK_ERROR_UNKNOWN VkResult = -13
        const VK_EVENT_RESET VkResult = 4
        const VK_EVENT_SET VkResult = 3
        const VK_FALSE uint32 = 0u
        const VK_HEADER_VERSION uint32 = 357u
        const VK_IMAGE_LAYOUT_PRESENT_SRC_KHR int32 = 1000001002
        const VK_INCOMPLETE VkResult = 5
        const VK_INTERNAL_ALLOCATION_TYPE_EXECUTABLE VkInternalAllocationType = 0
        const VK_KHR_SURFACE_EXTENSION_NAME string = "VK_KHR_surface"
        const VK_KHR_SURFACE_SPEC_VERSION int32 = 25
        const VK_KHR_SWAPCHAIN_EXTENSION_NAME string = "VK_KHR_swapchain"
        const VK_KHR_SWAPCHAIN_SPEC_VERSION int32 = 70
        const VK_KHR_WAYLAND_SURFACE_EXTENSION_NAME string = "VK_KHR_wayland_surface"
        const VK_KHR_WAYLAND_SURFACE_SPEC_VERSION int32 = 6
        const VK_KHR_WIN32_SURFACE_EXTENSION_NAME string = "VK_KHR_win32_surface"
        const VK_KHR_WIN32_SURFACE_SPEC_VERSION int32 = 6
        const VK_LOD_CLAMP_NONE float32 = 1000.0F
        const VK_LUID_SIZE uint32 = 8u
        const VK_MAX_DATA_GRAPH_TOSA_NAME_SIZE_ARM uint32 = 128u
        const VK_MAX_DESCRIPTION_SIZE uint32 = 256u
        const VK_MAX_DEVICE_GROUP_SIZE uint32 = 32u
        const VK_MAX_DRIVER_INFO_SIZE uint32 = 256u
        const VK_MAX_DRIVER_NAME_SIZE uint32 = 256u
        const VK_MAX_EXTENSION_NAME_SIZE uint32 = 256u
        const VK_MAX_GLOBAL_PRIORITY_SIZE uint32 = 16u
        const VK_MAX_MEMORY_HEAPS uint32 = 16u
        const VK_MAX_MEMORY_TYPES uint32 = 32u
        const VK_MAX_PHYSICAL_DEVICE_DATA_GRAPH_OPERATION_SET_NAME_SIZE_ARM uint32 = 128u
        const VK_MAX_PHYSICAL_DEVICE_NAME_SIZE uint32 = 256u
        const VK_MAX_PIPELINE_BINARY_KEY_SIZE_KHR uint32 = 32u
        const VK_MAX_SHADER_MODULE_IDENTIFIER_SIZE_EXT uint32 = 32u
        const VK_MAX_TENSOR_CREATE_INFO_ROLLING_BACKING_WRAP_COUNT_ARM uint32 = 4u
        const VK_MAX_VIDEO_AV1_REFERENCES_PER_FRAME_KHR uint32 = 7u
        const VK_MAX_VIDEO_VP9_REFERENCES_PER_FRAME_KHR uint32 = 3u
        const VK_NOT_READY VkResult = 1
        const VK_OBJECT_TYPE_SURFACE_KHR int32 = 1000000000
        const VK_OBJECT_TYPE_SWAPCHAIN_KHR int32 = 1000001000
        const VK_PARTITIONED_ACCELERATION_STRUCTURE_PARTITION_INDEX_GLOBAL_NV uint32 = 4294967295u
        const VK_QUEUE_COMPUTE_BIT VkQueueFlagBits = 2
        const VK_QUEUE_FAMILY_EXTERNAL uint32 = 4294967294u
        const VK_QUEUE_FAMILY_FOREIGN_EXT uint32 = 4294967293u
        const VK_QUEUE_FAMILY_IGNORED uint32 = 4294967295u
        const VK_QUEUE_GRAPHICS_BIT VkQueueFlagBits = 1
        const VK_QUEUE_SPARSE_BINDING_BIT VkQueueFlagBits = 8
        const VK_QUEUE_TRANSFER_BIT VkQueueFlagBits = 4
        const VK_REMAINING_3D_SLICES_EXT uint32 = 4294967295u
        const VK_REMAINING_ARRAY_LAYERS uint32 = 4294967295u
        const VK_REMAINING_MIP_LEVELS uint32 = 4294967295u
        const VK_SHADER_INDEX_UNUSED_AMDX uint32 = 4294967295u
        const VK_SHADER_UNUSED_KHR uint32 = 4294967295u
        const VK_STRUCTURE_TYPE_ACQUIRE_NEXT_IMAGE_INFO_KHR VkStructureType = 1000060010
        const VK_STRUCTURE_TYPE_APPLICATION_INFO VkStructureType = 0
        const VK_STRUCTURE_TYPE_BIND_IMAGE_MEMORY_SWAPCHAIN_INFO_KHR VkStructureType = 1000060009
        const VK_STRUCTURE_TYPE_BIND_SPARSE_INFO VkStructureType = 7
        const VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO VkStructureType = 12
        const VK_STRUCTURE_TYPE_BUFFER_MEMORY_BARRIER VkStructureType = 44
        const VK_STRUCTURE_TYPE_BUFFER_VIEW_CREATE_INFO VkStructureType = 13
        const VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO VkStructureType = 40
        const VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO VkStructureType = 42
        const VK_STRUCTURE_TYPE_COMMAND_BUFFER_INHERITANCE_INFO VkStructureType = 41
        const VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO VkStructureType = 39
        const VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO VkStructureType = 29
        const VK_STRUCTURE_TYPE_COPY_DESCRIPTOR_SET VkStructureType = 36
        const VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO VkStructureType = 33
        const VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO VkStructureType = 34
        const VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO VkStructureType = 32
        const VK_STRUCTURE_TYPE_DEVICE_CREATE_INFO VkStructureType = 3
        const VK_STRUCTURE_TYPE_DEVICE_GROUP_PRESENT_CAPABILITIES_KHR VkStructureType = 1000060007
        const VK_STRUCTURE_TYPE_DEVICE_GROUP_PRESENT_INFO_KHR VkStructureType = 1000060011
        const VK_STRUCTURE_TYPE_DEVICE_GROUP_SWAPCHAIN_CREATE_INFO_KHR VkStructureType = 1000060012
        const VK_STRUCTURE_TYPE_DEVICE_QUEUE_CREATE_INFO VkStructureType = 2
        const VK_STRUCTURE_TYPE_EVENT_CREATE_INFO VkStructureType = 10
        const VK_STRUCTURE_TYPE_FENCE_CREATE_INFO VkStructureType = 8
        const VK_STRUCTURE_TYPE_FRAMEBUFFER_CREATE_INFO VkStructureType = 37
        const VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO VkStructureType = 28
        const VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO VkStructureType = 14
        const VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER VkStructureType = 45
        const VK_STRUCTURE_TYPE_IMAGE_SWAPCHAIN_CREATE_INFO_KHR VkStructureType = 1000060008
        const VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO VkStructureType = 15
        const VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO VkStructureType = 1
        const VK_STRUCTURE_TYPE_LOADER_DEVICE_CREATE_INFO VkStructureType = 48
        const VK_STRUCTURE_TYPE_LOADER_INSTANCE_CREATE_INFO VkStructureType = 47
        const VK_STRUCTURE_TYPE_MAPPED_MEMORY_RANGE VkStructureType = 6
        const VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO VkStructureType = 5
        const VK_STRUCTURE_TYPE_MEMORY_BARRIER VkStructureType = 46
        const VK_STRUCTURE_TYPE_PIPELINE_CACHE_CREATE_INFO VkStructureType = 17
        const VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO VkStructureType = 26
        const VK_STRUCTURE_TYPE_PIPELINE_DEPTH_STENCIL_STATE_CREATE_INFO VkStructureType = 25
        const VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO VkStructureType = 27
        const VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO VkStructureType = 20
        const VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO VkStructureType = 30
        const VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO VkStructureType = 24
        const VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO VkStructureType = 23
        const VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO VkStructureType = 18
        const VK_STRUCTURE_TYPE_PIPELINE_TESSELLATION_STATE_CREATE_INFO VkStructureType = 21
        const VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO VkStructureType = 19
        const VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO VkStructureType = 22
        const VK_STRUCTURE_TYPE_PRESENT_INFO_KHR VkStructureType = 1000001001
        const VK_STRUCTURE_TYPE_QUERY_POOL_CREATE_INFO VkStructureType = 11
        const VK_STRUCTURE_TYPE_RENDER_PASS_BEGIN_INFO VkStructureType = 43
        const VK_STRUCTURE_TYPE_RENDER_PASS_CREATE_INFO VkStructureType = 38
        const VK_STRUCTURE_TYPE_SAMPLER_CREATE_INFO VkStructureType = 31
        const VK_STRUCTURE_TYPE_SEMAPHORE_CREATE_INFO VkStructureType = 9
        const VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO VkStructureType = 16
        const VK_STRUCTURE_TYPE_SUBMIT_INFO VkStructureType = 4
        const VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR VkStructureType = 1000001000
        const VK_STRUCTURE_TYPE_WAYLAND_SURFACE_CREATE_INFO_KHR VkStructureType = 1000006000
        const VK_STRUCTURE_TYPE_WIN32_SURFACE_CREATE_INFO_KHR VkStructureType = 1000009000
        const VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET VkStructureType = 35
        const VK_SUBOPTIMAL_KHR VkResult = 1000001003
        const VK_SUBPASS_EXTERNAL uint32 = 4294967295u
        const VK_SUCCESS VkResult = 0
        const VK_SWAPCHAIN_CREATE_PROTECTED_BIT_KHR int32 = 2
        const VK_SWAPCHAIN_CREATE_SPLIT_INSTANCE_BIND_REGIONS_BIT_KHR int32 = 1
        const VK_SYSTEM_ALLOCATION_SCOPE_CACHE VkSystemAllocationScope = 2
        const VK_SYSTEM_ALLOCATION_SCOPE_COMMAND VkSystemAllocationScope = 0
        const VK_SYSTEM_ALLOCATION_SCOPE_DEVICE VkSystemAllocationScope = 3
        const VK_SYSTEM_ALLOCATION_SCOPE_INSTANCE VkSystemAllocationScope = 4
        const VK_SYSTEM_ALLOCATION_SCOPE_OBJECT VkSystemAllocationScope = 1
        const VK_TIMEOUT VkResult = 2
        const VK_TRUE uint32 = 1u
        const VK_UUID_SIZE uint32 = 16u
        const VK_WHOLE_SIZE uint64 = uint64.MaxValue
    }
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkAllocationCallbacks {
    var pUserData *void
    var pfnAllocation unmanaged[Cdecl] (nint, nuint, nuint, VkSystemAllocationScope) -> nint
    var pfnReallocation unmanaged[Cdecl] (nint, nint, nuint, nuint, VkSystemAllocationScope) -> nint
    var pfnFree unmanaged[Cdecl] (nint, nint) -> void
    var pfnInternalAllocation unmanaged[Cdecl] (nint, nuint, VkInternalAllocationType, VkSystemAllocationScope) -> void
    var pfnInternalFree unmanaged[Cdecl] (nint, nuint, VkInternalAllocationType, VkSystemAllocationScope) -> void
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkApplicationInfo {
    var sType VkStructureType
    var pNext *void
    var pApplicationName *int8
    var applicationVersion uint32
    var pEngineName *int8
    var engineVersion uint32
    var apiVersion uint32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkExtensionProperties {
    fixed extensionName [256]int8
    var specVersion uint32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkExtent3D {
    var width uint32
    var height uint32
    var depth uint32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkInstanceCreateInfo {
    var sType VkStructureType
    var pNext *void
    var flags VkInstanceCreateFlags
    var pApplicationInfo *VkApplicationInfo
    var enabledLayerCount uint32
    var ppEnabledLayerNames **int8
    var enabledExtensionCount uint32
    var ppEnabledExtensionNames **int8
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkQueueFamilyProperties {
    var queueFlags VkQueueFlags
    var queueCount uint32
    var timestampValidBits uint32
    var minImageTransferGranularity VkExtent3D
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkGlobalDispatch {
    var vkGetInstanceProcAddr unmanaged[Cdecl] (VkInstance, *int8) -> unmanaged[Cdecl] () -> void
    var vkEnumerateInstanceVersion unmanaged[Cdecl] (*uint32) -> VkResult
    var vkEnumerateInstanceExtensionProperties unmanaged[Cdecl] (*int8, *uint32, *VkExtensionProperties) -> VkResult
    var vkCreateInstance unmanaged[Cdecl] (*VkInstanceCreateInfo, *VkAllocationCallbacks, *VkInstance) -> VkResult
}
@StructLayout(LayoutKind.Sequential)
unsafe struct VkInstanceDispatch {
    var vkDestroyInstance unmanaged[Cdecl] (VkInstance, *VkAllocationCallbacks) -> void
    var vkEnumeratePhysicalDevices unmanaged[Cdecl] (VkInstance, *uint32, *VkPhysicalDevice) -> VkResult
    var vkGetPhysicalDeviceQueueFamilyProperties unmanaged[Cdecl] (VkPhysicalDevice, *uint32, *VkQueueFamilyProperties) -> void
    var vkDestroySurfaceKHR unmanaged[Cdecl] (VkInstance, VkSurfaceKHR, *VkAllocationCallbacks) -> void
    var vkGetPhysicalDeviceSurfaceSupportKHR unmanaged[Cdecl] (VkPhysicalDevice, uint32, VkSurfaceKHR, *VkBool32) -> VkResult
}
