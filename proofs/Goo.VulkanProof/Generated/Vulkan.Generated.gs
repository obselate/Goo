package Goo.Vulkan.Generated

import System.Runtime.InteropServices

type VkAccessFlagBits2 = uint64
type VkFlags64 = uint64
type VkAccessFlags2 = VkFlags64
type VkBool32 = uint32
type VkBuffer = uint64
type VkColorSpaceKHR = int32
type VkCommandBuffer = nint
type VkCommandBufferLevel = int32
type VkCommandBufferUsageFlagBits = int32
type VkFlags = uint32
type VkCommandBufferUsageFlags = VkFlags
type VkCommandPool = uint64
type VkCommandPoolCreateFlagBits = int32
type VkCommandPoolCreateFlags = VkFlags
type VkCompositeAlphaFlagBitsKHR = int32
type VkCompositeAlphaFlagsKHR = VkFlags
type VkDependencyFlagBits = int32
type VkDependencyFlags = VkFlags
type VkDevice = nint
type VkDeviceCreateFlags = VkFlags
type VkDeviceQueueCreateFlagBits = int32
type VkDeviceQueueCreateFlags = VkFlags
type VkDeviceSize = uint64
type VkFence = uint64
type VkFenceCreateFlagBits = int32
type VkFenceCreateFlags = VkFlags
type VkFormat = int32
type VkFramebuffer = uint64
type VkImage = uint64
type VkImageAspectFlagBits = int32
type VkImageAspectFlags = VkFlags
type VkImageLayout = int32
type VkImageUsageFlagBits = int32
type VkImageUsageFlags = VkFlags
type VkInstance = nint
type VkInstanceCreateFlagBits = int32
type VkInstanceCreateFlags = VkFlags
type VkInternalAllocationType = int32
type VkPhysicalDevice = nint
type VkPhysicalDeviceType = int32
type VkPipelineStageFlagBits2 = uint64
type VkPipelineStageFlags2 = VkFlags64
type VkPresentModeKHR = int32
type VkQueryControlFlagBits = int32
type VkQueryControlFlags = VkFlags
type VkQueryPipelineStatisticFlagBits = int32
type VkQueryPipelineStatisticFlags = VkFlags
type VkQueue = nint
type VkQueueFlagBits = int32
type VkQueueFlags = VkFlags
type VkRenderPass = uint64
type VkResult = int32
type VkSampleCountFlagBits = int32
type VkSampleCountFlags = VkFlags
type VkSemaphore = uint64
type VkSemaphoreCreateFlags = VkFlags
type VkSharingMode = int32
type VkStructureType = int32
type VkSubmitFlagBits = int32
type VkSubmitFlags = VkFlags
type VkSurfaceKHR = uint64
type VkSurfaceTransformFlagBitsKHR = int32
type VkSurfaceTransformFlagsKHR = VkFlags
type VkSwapchainCreateFlagBitsKHR = int32
type VkSwapchainCreateFlagsKHR = VkFlags
type VkSwapchainKHR = uint64
type VkSystemAllocationScope = int32
class VkConstants {
    shared {
        const VK_ACCESS_2_COLOR_ATTACHMENT_READ_BIT VkAccessFlagBits2 = 128L
        const VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT VkAccessFlagBits2 = 256L
        const VK_ACCESS_2_DEPTH_STENCIL_ATTACHMENT_READ_BIT VkAccessFlagBits2 = 512L
        const VK_ACCESS_2_DEPTH_STENCIL_ATTACHMENT_WRITE_BIT VkAccessFlagBits2 = 1024L
        const VK_ACCESS_2_HOST_READ_BIT VkAccessFlagBits2 = 8192L
        const VK_ACCESS_2_HOST_WRITE_BIT VkAccessFlagBits2 = 16384L
        const VK_ACCESS_2_INDEX_READ_BIT VkAccessFlagBits2 = 2L
        const VK_ACCESS_2_INDIRECT_COMMAND_READ_BIT VkAccessFlagBits2 = 1L
        const VK_ACCESS_2_INPUT_ATTACHMENT_READ_BIT VkAccessFlagBits2 = 16L
        const VK_ACCESS_2_MEMORY_READ_BIT VkAccessFlagBits2 = 32768L
        const VK_ACCESS_2_MEMORY_WRITE_BIT VkAccessFlagBits2 = 65536L
        const VK_ACCESS_2_NONE VkAccessFlagBits2 = 0L
        const VK_ACCESS_2_SHADER_READ_BIT VkAccessFlagBits2 = 32L
        const VK_ACCESS_2_SHADER_SAMPLED_READ_BIT VkAccessFlagBits2 = 4294967296L
        const VK_ACCESS_2_SHADER_STORAGE_READ_BIT VkAccessFlagBits2 = 8589934592L
        const VK_ACCESS_2_SHADER_STORAGE_WRITE_BIT VkAccessFlagBits2 = 17179869184L
        const VK_ACCESS_2_SHADER_WRITE_BIT VkAccessFlagBits2 = 64L
        const VK_ACCESS_2_TRANSFER_READ_BIT VkAccessFlagBits2 = 2048L
        const VK_ACCESS_2_TRANSFER_WRITE_BIT VkAccessFlagBits2 = 4096L
        const VK_ACCESS_2_UNIFORM_READ_BIT VkAccessFlagBits2 = 8L
        const VK_ACCESS_2_VERTEX_ATTRIBUTE_READ_BIT VkAccessFlagBits2 = 4L
        const VK_API_VERSION_1_0 uint32 = 4194304u
        const VK_API_VERSION_1_1 uint32 = 4198400u
        const VK_API_VERSION_1_2 uint32 = 4202496u
        const VK_API_VERSION_1_3 uint32 = 4206592u
        const VK_ATTACHMENT_UNUSED uint32 = 4294967295u
        const VK_COLORSPACE_SRGB_NONLINEAR_KHR VkColorSpaceKHR = VK_COLOR_SPACE_SRGB_NONLINEAR_KHR
        const VK_COLOR_SPACE_SRGB_NONLINEAR_KHR VkColorSpaceKHR = 0
        const VK_COMMAND_BUFFER_LEVEL_PRIMARY VkCommandBufferLevel = 0
        const VK_COMMAND_BUFFER_LEVEL_SECONDARY VkCommandBufferLevel = 1
        const VK_COMMAND_BUFFER_USAGE_ONE_TIME_SUBMIT_BIT VkCommandBufferUsageFlagBits = 1
        const VK_COMMAND_BUFFER_USAGE_RENDER_PASS_CONTINUE_BIT VkCommandBufferUsageFlagBits = 2
        const VK_COMMAND_BUFFER_USAGE_SIMULTANEOUS_USE_BIT VkCommandBufferUsageFlagBits = 4
        const VK_COMMAND_POOL_CREATE_RESET_COMMAND_BUFFER_BIT VkCommandPoolCreateFlagBits = 2
        const VK_COMMAND_POOL_CREATE_TRANSIENT_BIT VkCommandPoolCreateFlagBits = 1
        const VK_COMPOSITE_ALPHA_INHERIT_BIT_KHR VkCompositeAlphaFlagBitsKHR = 8
        const VK_COMPOSITE_ALPHA_OPAQUE_BIT_KHR VkCompositeAlphaFlagBitsKHR = 1
        const VK_COMPOSITE_ALPHA_POST_MULTIPLIED_BIT_KHR VkCompositeAlphaFlagBitsKHR = 4
        const VK_COMPOSITE_ALPHA_PRE_MULTIPLIED_BIT_KHR VkCompositeAlphaFlagBitsKHR = 2
        const VK_COMPRESSED_TRIANGLE_FORMAT_DGF1_BYTE_ALIGNMENT_AMDX uint32 = 128u
        const VK_COMPRESSED_TRIANGLE_FORMAT_DGF1_BYTE_STRIDE_AMDX uint32 = 128u
        const VK_COMPUTE_OCCUPANCY_PRIORITY_HIGH_NV float32 = 0.75F
        const VK_COMPUTE_OCCUPANCY_PRIORITY_LOW_NV float32 = 0.25F
        const VK_COMPUTE_OCCUPANCY_PRIORITY_NORMAL_NV float32 = 0.50F
        const VK_DATA_GRAPH_MODEL_TOOLCHAIN_VERSION_LENGTH_QCOM uint32 = 3u
        const VK_DEPENDENCY_BY_REGION_BIT VkDependencyFlagBits = 1
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
        const VK_FENCE_CREATE_SIGNALED_BIT VkFenceCreateFlagBits = 1
        const VK_FORMAT_A1R5G5B5_UNORM_PACK16 VkFormat = 8
        const VK_FORMAT_A2B10G10R10_SINT_PACK32 VkFormat = 69
        const VK_FORMAT_A2B10G10R10_SNORM_PACK32 VkFormat = 65
        const VK_FORMAT_A2B10G10R10_SSCALED_PACK32 VkFormat = 67
        const VK_FORMAT_A2B10G10R10_UINT_PACK32 VkFormat = 68
        const VK_FORMAT_A2B10G10R10_UNORM_PACK32 VkFormat = 64
        const VK_FORMAT_A2B10G10R10_USCALED_PACK32 VkFormat = 66
        const VK_FORMAT_A2R10G10B10_SINT_PACK32 VkFormat = 63
        const VK_FORMAT_A2R10G10B10_SNORM_PACK32 VkFormat = 59
        const VK_FORMAT_A2R10G10B10_SSCALED_PACK32 VkFormat = 61
        const VK_FORMAT_A2R10G10B10_UINT_PACK32 VkFormat = 62
        const VK_FORMAT_A2R10G10B10_UNORM_PACK32 VkFormat = 58
        const VK_FORMAT_A2R10G10B10_USCALED_PACK32 VkFormat = 60
        const VK_FORMAT_A8B8G8R8_SINT_PACK32 VkFormat = 56
        const VK_FORMAT_A8B8G8R8_SNORM_PACK32 VkFormat = 52
        const VK_FORMAT_A8B8G8R8_SRGB_PACK32 VkFormat = 57
        const VK_FORMAT_A8B8G8R8_SSCALED_PACK32 VkFormat = 54
        const VK_FORMAT_A8B8G8R8_UINT_PACK32 VkFormat = 55
        const VK_FORMAT_A8B8G8R8_UNORM_PACK32 VkFormat = 51
        const VK_FORMAT_A8B8G8R8_USCALED_PACK32 VkFormat = 53
        const VK_FORMAT_ASTC_10x10_SRGB_BLOCK VkFormat = 180
        const VK_FORMAT_ASTC_10x10_UNORM_BLOCK VkFormat = 179
        const VK_FORMAT_ASTC_10x5_SRGB_BLOCK VkFormat = 174
        const VK_FORMAT_ASTC_10x5_UNORM_BLOCK VkFormat = 173
        const VK_FORMAT_ASTC_10x6_SRGB_BLOCK VkFormat = 176
        const VK_FORMAT_ASTC_10x6_UNORM_BLOCK VkFormat = 175
        const VK_FORMAT_ASTC_10x8_SRGB_BLOCK VkFormat = 178
        const VK_FORMAT_ASTC_10x8_UNORM_BLOCK VkFormat = 177
        const VK_FORMAT_ASTC_12x10_SRGB_BLOCK VkFormat = 182
        const VK_FORMAT_ASTC_12x10_UNORM_BLOCK VkFormat = 181
        const VK_FORMAT_ASTC_12x12_SRGB_BLOCK VkFormat = 184
        const VK_FORMAT_ASTC_12x12_UNORM_BLOCK VkFormat = 183
        const VK_FORMAT_ASTC_4x4_SRGB_BLOCK VkFormat = 158
        const VK_FORMAT_ASTC_4x4_UNORM_BLOCK VkFormat = 157
        const VK_FORMAT_ASTC_5x4_SRGB_BLOCK VkFormat = 160
        const VK_FORMAT_ASTC_5x4_UNORM_BLOCK VkFormat = 159
        const VK_FORMAT_ASTC_5x5_SRGB_BLOCK VkFormat = 162
        const VK_FORMAT_ASTC_5x5_UNORM_BLOCK VkFormat = 161
        const VK_FORMAT_ASTC_6x5_SRGB_BLOCK VkFormat = 164
        const VK_FORMAT_ASTC_6x5_UNORM_BLOCK VkFormat = 163
        const VK_FORMAT_ASTC_6x6_SRGB_BLOCK VkFormat = 166
        const VK_FORMAT_ASTC_6x6_UNORM_BLOCK VkFormat = 165
        const VK_FORMAT_ASTC_8x5_SRGB_BLOCK VkFormat = 168
        const VK_FORMAT_ASTC_8x5_UNORM_BLOCK VkFormat = 167
        const VK_FORMAT_ASTC_8x6_SRGB_BLOCK VkFormat = 170
        const VK_FORMAT_ASTC_8x6_UNORM_BLOCK VkFormat = 169
        const VK_FORMAT_ASTC_8x8_SRGB_BLOCK VkFormat = 172
        const VK_FORMAT_ASTC_8x8_UNORM_BLOCK VkFormat = 171
        const VK_FORMAT_B10G11R11_UFLOAT_PACK32 VkFormat = 122
        const VK_FORMAT_B4G4R4A4_UNORM_PACK16 VkFormat = 3
        const VK_FORMAT_B5G5R5A1_UNORM_PACK16 VkFormat = 7
        const VK_FORMAT_B5G6R5_UNORM_PACK16 VkFormat = 5
        const VK_FORMAT_B8G8R8A8_SINT VkFormat = 49
        const VK_FORMAT_B8G8R8A8_SNORM VkFormat = 45
        const VK_FORMAT_B8G8R8A8_SRGB VkFormat = 50
        const VK_FORMAT_B8G8R8A8_SSCALED VkFormat = 47
        const VK_FORMAT_B8G8R8A8_UINT VkFormat = 48
        const VK_FORMAT_B8G8R8A8_UNORM VkFormat = 44
        const VK_FORMAT_B8G8R8A8_USCALED VkFormat = 46
        const VK_FORMAT_B8G8R8_SINT VkFormat = 35
        const VK_FORMAT_B8G8R8_SNORM VkFormat = 31
        const VK_FORMAT_B8G8R8_SRGB VkFormat = 36
        const VK_FORMAT_B8G8R8_SSCALED VkFormat = 33
        const VK_FORMAT_B8G8R8_UINT VkFormat = 34
        const VK_FORMAT_B8G8R8_UNORM VkFormat = 30
        const VK_FORMAT_B8G8R8_USCALED VkFormat = 32
        const VK_FORMAT_BC1_RGBA_SRGB_BLOCK VkFormat = 134
        const VK_FORMAT_BC1_RGBA_UNORM_BLOCK VkFormat = 133
        const VK_FORMAT_BC1_RGB_SRGB_BLOCK VkFormat = 132
        const VK_FORMAT_BC1_RGB_UNORM_BLOCK VkFormat = 131
        const VK_FORMAT_BC2_SRGB_BLOCK VkFormat = 136
        const VK_FORMAT_BC2_UNORM_BLOCK VkFormat = 135
        const VK_FORMAT_BC3_SRGB_BLOCK VkFormat = 138
        const VK_FORMAT_BC3_UNORM_BLOCK VkFormat = 137
        const VK_FORMAT_BC4_SNORM_BLOCK VkFormat = 140
        const VK_FORMAT_BC4_UNORM_BLOCK VkFormat = 139
        const VK_FORMAT_BC5_SNORM_BLOCK VkFormat = 142
        const VK_FORMAT_BC5_UNORM_BLOCK VkFormat = 141
        const VK_FORMAT_BC6H_SFLOAT_BLOCK VkFormat = 144
        const VK_FORMAT_BC6H_UFLOAT_BLOCK VkFormat = 143
        const VK_FORMAT_BC7_SRGB_BLOCK VkFormat = 146
        const VK_FORMAT_BC7_UNORM_BLOCK VkFormat = 145
        const VK_FORMAT_D16_UNORM VkFormat = 124
        const VK_FORMAT_D16_UNORM_S8_UINT VkFormat = 128
        const VK_FORMAT_D24_UNORM_S8_UINT VkFormat = 129
        const VK_FORMAT_D32_SFLOAT VkFormat = 126
        const VK_FORMAT_D32_SFLOAT_S8_UINT VkFormat = 130
        const VK_FORMAT_E5B9G9R9_UFLOAT_PACK32 VkFormat = 123
        const VK_FORMAT_EAC_R11G11_SNORM_BLOCK VkFormat = 156
        const VK_FORMAT_EAC_R11G11_UNORM_BLOCK VkFormat = 155
        const VK_FORMAT_EAC_R11_SNORM_BLOCK VkFormat = 154
        const VK_FORMAT_EAC_R11_UNORM_BLOCK VkFormat = 153
        const VK_FORMAT_ETC2_R8G8B8A1_SRGB_BLOCK VkFormat = 150
        const VK_FORMAT_ETC2_R8G8B8A1_UNORM_BLOCK VkFormat = 149
        const VK_FORMAT_ETC2_R8G8B8A8_SRGB_BLOCK VkFormat = 152
        const VK_FORMAT_ETC2_R8G8B8A8_UNORM_BLOCK VkFormat = 151
        const VK_FORMAT_ETC2_R8G8B8_SRGB_BLOCK VkFormat = 148
        const VK_FORMAT_ETC2_R8G8B8_UNORM_BLOCK VkFormat = 147
        const VK_FORMAT_R16G16B16A16_SFLOAT VkFormat = 97
        const VK_FORMAT_R16G16B16A16_SINT VkFormat = 96
        const VK_FORMAT_R16G16B16A16_SNORM VkFormat = 92
        const VK_FORMAT_R16G16B16A16_SSCALED VkFormat = 94
        const VK_FORMAT_R16G16B16A16_UINT VkFormat = 95
        const VK_FORMAT_R16G16B16A16_UNORM VkFormat = 91
        const VK_FORMAT_R16G16B16A16_USCALED VkFormat = 93
        const VK_FORMAT_R16G16B16_SFLOAT VkFormat = 90
        const VK_FORMAT_R16G16B16_SINT VkFormat = 89
        const VK_FORMAT_R16G16B16_SNORM VkFormat = 85
        const VK_FORMAT_R16G16B16_SSCALED VkFormat = 87
        const VK_FORMAT_R16G16B16_UINT VkFormat = 88
        const VK_FORMAT_R16G16B16_UNORM VkFormat = 84
        const VK_FORMAT_R16G16B16_USCALED VkFormat = 86
        const VK_FORMAT_R16G16_SFLOAT VkFormat = 83
        const VK_FORMAT_R16G16_SINT VkFormat = 82
        const VK_FORMAT_R16G16_SNORM VkFormat = 78
        const VK_FORMAT_R16G16_SSCALED VkFormat = 80
        const VK_FORMAT_R16G16_UINT VkFormat = 81
        const VK_FORMAT_R16G16_UNORM VkFormat = 77
        const VK_FORMAT_R16G16_USCALED VkFormat = 79
        const VK_FORMAT_R16_SFLOAT VkFormat = 76
        const VK_FORMAT_R16_SINT VkFormat = 75
        const VK_FORMAT_R16_SNORM VkFormat = 71
        const VK_FORMAT_R16_SSCALED VkFormat = 73
        const VK_FORMAT_R16_UINT VkFormat = 74
        const VK_FORMAT_R16_UNORM VkFormat = 70
        const VK_FORMAT_R16_USCALED VkFormat = 72
        const VK_FORMAT_R32G32B32A32_SFLOAT VkFormat = 109
        const VK_FORMAT_R32G32B32A32_SINT VkFormat = 108
        const VK_FORMAT_R32G32B32A32_UINT VkFormat = 107
        const VK_FORMAT_R32G32B32_SFLOAT VkFormat = 106
        const VK_FORMAT_R32G32B32_SINT VkFormat = 105
        const VK_FORMAT_R32G32B32_UINT VkFormat = 104
        const VK_FORMAT_R32G32_SFLOAT VkFormat = 103
        const VK_FORMAT_R32G32_SINT VkFormat = 102
        const VK_FORMAT_R32G32_UINT VkFormat = 101
        const VK_FORMAT_R32_SFLOAT VkFormat = 100
        const VK_FORMAT_R32_SINT VkFormat = 99
        const VK_FORMAT_R32_UINT VkFormat = 98
        const VK_FORMAT_R4G4B4A4_UNORM_PACK16 VkFormat = 2
        const VK_FORMAT_R4G4_UNORM_PACK8 VkFormat = 1
        const VK_FORMAT_R5G5B5A1_UNORM_PACK16 VkFormat = 6
        const VK_FORMAT_R5G6B5_UNORM_PACK16 VkFormat = 4
        const VK_FORMAT_R64G64B64A64_SFLOAT VkFormat = 121
        const VK_FORMAT_R64G64B64A64_SINT VkFormat = 120
        const VK_FORMAT_R64G64B64A64_UINT VkFormat = 119
        const VK_FORMAT_R64G64B64_SFLOAT VkFormat = 118
        const VK_FORMAT_R64G64B64_SINT VkFormat = 117
        const VK_FORMAT_R64G64B64_UINT VkFormat = 116
        const VK_FORMAT_R64G64_SFLOAT VkFormat = 115
        const VK_FORMAT_R64G64_SINT VkFormat = 114
        const VK_FORMAT_R64G64_UINT VkFormat = 113
        const VK_FORMAT_R64_SFLOAT VkFormat = 112
        const VK_FORMAT_R64_SINT VkFormat = 111
        const VK_FORMAT_R64_UINT VkFormat = 110
        const VK_FORMAT_R8G8B8A8_SINT VkFormat = 42
        const VK_FORMAT_R8G8B8A8_SNORM VkFormat = 38
        const VK_FORMAT_R8G8B8A8_SRGB VkFormat = 43
        const VK_FORMAT_R8G8B8A8_SSCALED VkFormat = 40
        const VK_FORMAT_R8G8B8A8_UINT VkFormat = 41
        const VK_FORMAT_R8G8B8A8_UNORM VkFormat = 37
        const VK_FORMAT_R8G8B8A8_USCALED VkFormat = 39
        const VK_FORMAT_R8G8B8_SINT VkFormat = 28
        const VK_FORMAT_R8G8B8_SNORM VkFormat = 24
        const VK_FORMAT_R8G8B8_SRGB VkFormat = 29
        const VK_FORMAT_R8G8B8_SSCALED VkFormat = 26
        const VK_FORMAT_R8G8B8_UINT VkFormat = 27
        const VK_FORMAT_R8G8B8_UNORM VkFormat = 23
        const VK_FORMAT_R8G8B8_USCALED VkFormat = 25
        const VK_FORMAT_R8G8_SINT VkFormat = 21
        const VK_FORMAT_R8G8_SNORM VkFormat = 17
        const VK_FORMAT_R8G8_SRGB VkFormat = 22
        const VK_FORMAT_R8G8_SSCALED VkFormat = 19
        const VK_FORMAT_R8G8_UINT VkFormat = 20
        const VK_FORMAT_R8G8_UNORM VkFormat = 16
        const VK_FORMAT_R8G8_USCALED VkFormat = 18
        const VK_FORMAT_R8_SINT VkFormat = 14
        const VK_FORMAT_R8_SNORM VkFormat = 10
        const VK_FORMAT_R8_SRGB VkFormat = 15
        const VK_FORMAT_R8_SSCALED VkFormat = 12
        const VK_FORMAT_R8_UINT VkFormat = 13
        const VK_FORMAT_R8_UNORM VkFormat = 9
        const VK_FORMAT_R8_USCALED VkFormat = 11
        const VK_FORMAT_S8_UINT VkFormat = 127
        const VK_FORMAT_UNDEFINED VkFormat = 0
        const VK_FORMAT_X8_D24_UNORM_PACK32 VkFormat = 125
        const VK_HEADER_VERSION uint32 = 357u
        const VK_IMAGE_ASPECT_COLOR_BIT VkImageAspectFlagBits = 1
        const VK_IMAGE_ASPECT_DEPTH_BIT VkImageAspectFlagBits = 2
        const VK_IMAGE_ASPECT_METADATA_BIT VkImageAspectFlagBits = 8
        const VK_IMAGE_ASPECT_STENCIL_BIT VkImageAspectFlagBits = 4
        const VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL VkImageLayout = 2
        const VK_IMAGE_LAYOUT_DEPTH_STENCIL_ATTACHMENT_OPTIMAL VkImageLayout = 3
        const VK_IMAGE_LAYOUT_DEPTH_STENCIL_READ_ONLY_OPTIMAL VkImageLayout = 4
        const VK_IMAGE_LAYOUT_GENERAL VkImageLayout = 1
        const VK_IMAGE_LAYOUT_PREINITIALIZED VkImageLayout = 8
        const VK_IMAGE_LAYOUT_PRESENT_SRC_KHR VkImageLayout = 1000001002
        const VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL VkImageLayout = 5
        const VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL VkImageLayout = 7
        const VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL VkImageLayout = 6
        const VK_IMAGE_LAYOUT_UNDEFINED VkImageLayout = 0
        const VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT VkImageUsageFlagBits = 16
        const VK_IMAGE_USAGE_DEPTH_STENCIL_ATTACHMENT_BIT VkImageUsageFlagBits = 32
        const VK_IMAGE_USAGE_INPUT_ATTACHMENT_BIT VkImageUsageFlagBits = 128
        const VK_IMAGE_USAGE_SAMPLED_BIT VkImageUsageFlagBits = 4
        const VK_IMAGE_USAGE_STORAGE_BIT VkImageUsageFlagBits = 8
        const VK_IMAGE_USAGE_TRANSFER_DST_BIT VkImageUsageFlagBits = 2
        const VK_IMAGE_USAGE_TRANSFER_SRC_BIT VkImageUsageFlagBits = 1
        const VK_IMAGE_USAGE_TRANSIENT_ATTACHMENT_BIT VkImageUsageFlagBits = 64
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
        const VK_PHYSICAL_DEVICE_TYPE_CPU VkPhysicalDeviceType = 4
        const VK_PHYSICAL_DEVICE_TYPE_DISCRETE_GPU VkPhysicalDeviceType = 2
        const VK_PHYSICAL_DEVICE_TYPE_INTEGRATED_GPU VkPhysicalDeviceType = 1
        const VK_PHYSICAL_DEVICE_TYPE_OTHER VkPhysicalDeviceType = 0
        const VK_PHYSICAL_DEVICE_TYPE_VIRTUAL_GPU VkPhysicalDeviceType = 3
        const VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT VkPipelineStageFlagBits2 = 65536L
        const VK_PIPELINE_STAGE_2_ALL_GRAPHICS_BIT VkPipelineStageFlagBits2 = 32768L
        const VK_PIPELINE_STAGE_2_ALL_TRANSFER_BIT VkPipelineStageFlagBits2 = 4096L
        const VK_PIPELINE_STAGE_2_BLIT_BIT VkPipelineStageFlagBits2 = 17179869184L
        const VK_PIPELINE_STAGE_2_BOTTOM_OF_PIPE_BIT VkPipelineStageFlagBits2 = 8192L
        const VK_PIPELINE_STAGE_2_CLEAR_BIT VkPipelineStageFlagBits2 = 34359738368L
        const VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT VkPipelineStageFlagBits2 = 1024L
        const VK_PIPELINE_STAGE_2_COMPUTE_SHADER_BIT VkPipelineStageFlagBits2 = 2048L
        const VK_PIPELINE_STAGE_2_COPY_BIT VkPipelineStageFlagBits2 = 4294967296L
        const VK_PIPELINE_STAGE_2_DRAW_INDIRECT_BIT VkPipelineStageFlagBits2 = 2L
        const VK_PIPELINE_STAGE_2_EARLY_FRAGMENT_TESTS_BIT VkPipelineStageFlagBits2 = 256L
        const VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT VkPipelineStageFlagBits2 = 128L
        const VK_PIPELINE_STAGE_2_GEOMETRY_SHADER_BIT VkPipelineStageFlagBits2 = 64L
        const VK_PIPELINE_STAGE_2_HOST_BIT VkPipelineStageFlagBits2 = 16384L
        const VK_PIPELINE_STAGE_2_INDEX_INPUT_BIT VkPipelineStageFlagBits2 = 68719476736L
        const VK_PIPELINE_STAGE_2_LATE_FRAGMENT_TESTS_BIT VkPipelineStageFlagBits2 = 512L
        const VK_PIPELINE_STAGE_2_NONE VkPipelineStageFlagBits2 = 0L
        const VK_PIPELINE_STAGE_2_PRE_RASTERIZATION_SHADERS_BIT VkPipelineStageFlagBits2 = 274877906944L
        const VK_PIPELINE_STAGE_2_RESOLVE_BIT VkPipelineStageFlagBits2 = 8589934592L
        const VK_PIPELINE_STAGE_2_TESSELLATION_CONTROL_SHADER_BIT VkPipelineStageFlagBits2 = 16L
        const VK_PIPELINE_STAGE_2_TESSELLATION_EVALUATION_SHADER_BIT VkPipelineStageFlagBits2 = 32L
        const VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT VkPipelineStageFlagBits2 = 1L
        const VK_PIPELINE_STAGE_2_TRANSFER_BIT VkPipelineStageFlagBits2 = VK_PIPELINE_STAGE_2_ALL_TRANSFER_BIT
        const VK_PIPELINE_STAGE_2_VERTEX_ATTRIBUTE_INPUT_BIT VkPipelineStageFlagBits2 = 137438953472L
        const VK_PIPELINE_STAGE_2_VERTEX_INPUT_BIT VkPipelineStageFlagBits2 = 4L
        const VK_PIPELINE_STAGE_2_VERTEX_SHADER_BIT VkPipelineStageFlagBits2 = 8L
        const VK_PRESENT_MODE_FIFO_KHR VkPresentModeKHR = 2
        const VK_PRESENT_MODE_FIFO_RELAXED_KHR VkPresentModeKHR = 3
        const VK_PRESENT_MODE_IMMEDIATE_KHR VkPresentModeKHR = 0
        const VK_PRESENT_MODE_MAILBOX_KHR VkPresentModeKHR = 1
        const VK_QUERY_CONTROL_PRECISE_BIT VkQueryControlFlagBits = 1
        const VK_QUERY_PIPELINE_STATISTIC_CLIPPING_INVOCATIONS_BIT VkQueryPipelineStatisticFlagBits = 32
        const VK_QUERY_PIPELINE_STATISTIC_CLIPPING_PRIMITIVES_BIT VkQueryPipelineStatisticFlagBits = 64
        const VK_QUERY_PIPELINE_STATISTIC_COMPUTE_SHADER_INVOCATIONS_BIT VkQueryPipelineStatisticFlagBits = 1024
        const VK_QUERY_PIPELINE_STATISTIC_FRAGMENT_SHADER_INVOCATIONS_BIT VkQueryPipelineStatisticFlagBits = 128
        const VK_QUERY_PIPELINE_STATISTIC_GEOMETRY_SHADER_INVOCATIONS_BIT VkQueryPipelineStatisticFlagBits = 8
        const VK_QUERY_PIPELINE_STATISTIC_GEOMETRY_SHADER_PRIMITIVES_BIT VkQueryPipelineStatisticFlagBits = 16
        const VK_QUERY_PIPELINE_STATISTIC_INPUT_ASSEMBLY_PRIMITIVES_BIT VkQueryPipelineStatisticFlagBits = 2
        const VK_QUERY_PIPELINE_STATISTIC_INPUT_ASSEMBLY_VERTICES_BIT VkQueryPipelineStatisticFlagBits = 1
        const VK_QUERY_PIPELINE_STATISTIC_TESSELLATION_CONTROL_SHADER_PATCHES_BIT VkQueryPipelineStatisticFlagBits = 256
        const VK_QUERY_PIPELINE_STATISTIC_TESSELLATION_EVALUATION_SHADER_INVOCATIONS_BIT VkQueryPipelineStatisticFlagBits = 512
        const VK_QUERY_PIPELINE_STATISTIC_VERTEX_SHADER_INVOCATIONS_BIT VkQueryPipelineStatisticFlagBits = 4
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
        const VK_SAMPLE_COUNT_16_BIT VkSampleCountFlagBits = 16
        const VK_SAMPLE_COUNT_1_BIT VkSampleCountFlagBits = 1
        const VK_SAMPLE_COUNT_2_BIT VkSampleCountFlagBits = 2
        const VK_SAMPLE_COUNT_32_BIT VkSampleCountFlagBits = 32
        const VK_SAMPLE_COUNT_4_BIT VkSampleCountFlagBits = 4
        const VK_SAMPLE_COUNT_64_BIT VkSampleCountFlagBits = 64
        const VK_SAMPLE_COUNT_8_BIT VkSampleCountFlagBits = 8
        const VK_SHADER_INDEX_UNUSED_AMDX uint32 = 4294967295u
        const VK_SHADER_UNUSED_KHR uint32 = 4294967295u
        const VK_SHARING_MODE_CONCURRENT VkSharingMode = 1
        const VK_SHARING_MODE_EXCLUSIVE VkSharingMode = 0
        const VK_STRUCTURE_TYPE_ACQUIRE_NEXT_IMAGE_INFO_KHR VkStructureType = 1000060010
        const VK_STRUCTURE_TYPE_APPLICATION_INFO VkStructureType = 0
        const VK_STRUCTURE_TYPE_BIND_IMAGE_MEMORY_SWAPCHAIN_INFO_KHR VkStructureType = 1000060009
        const VK_STRUCTURE_TYPE_BIND_SPARSE_INFO VkStructureType = 7
        const VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO VkStructureType = 12
        const VK_STRUCTURE_TYPE_BUFFER_MEMORY_BARRIER VkStructureType = 44
        const VK_STRUCTURE_TYPE_BUFFER_MEMORY_BARRIER_2 VkStructureType = 1000314001
        const VK_STRUCTURE_TYPE_BUFFER_VIEW_CREATE_INFO VkStructureType = 13
        const VK_STRUCTURE_TYPE_COMMAND_BUFFER_ALLOCATE_INFO VkStructureType = 40
        const VK_STRUCTURE_TYPE_COMMAND_BUFFER_BEGIN_INFO VkStructureType = 42
        const VK_STRUCTURE_TYPE_COMMAND_BUFFER_INHERITANCE_INFO VkStructureType = 41
        const VK_STRUCTURE_TYPE_COMMAND_BUFFER_SUBMIT_INFO VkStructureType = 1000314006
        const VK_STRUCTURE_TYPE_COMMAND_POOL_CREATE_INFO VkStructureType = 39
        const VK_STRUCTURE_TYPE_COMPUTE_PIPELINE_CREATE_INFO VkStructureType = 29
        const VK_STRUCTURE_TYPE_COPY_DESCRIPTOR_SET VkStructureType = 36
        const VK_STRUCTURE_TYPE_DEPENDENCY_INFO VkStructureType = 1000314003
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
        const VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2 VkStructureType = 1000314002
        const VK_STRUCTURE_TYPE_IMAGE_SWAPCHAIN_CREATE_INFO_KHR VkStructureType = 1000060008
        const VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO VkStructureType = 15
        const VK_STRUCTURE_TYPE_INSTANCE_CREATE_INFO VkStructureType = 1
        const VK_STRUCTURE_TYPE_LOADER_DEVICE_CREATE_INFO VkStructureType = 48
        const VK_STRUCTURE_TYPE_LOADER_INSTANCE_CREATE_INFO VkStructureType = 47
        const VK_STRUCTURE_TYPE_MAPPED_MEMORY_RANGE VkStructureType = 6
        const VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO VkStructureType = 5
        const VK_STRUCTURE_TYPE_MEMORY_BARRIER VkStructureType = 46
        const VK_STRUCTURE_TYPE_MEMORY_BARRIER_2 VkStructureType = 1000314000
        const VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_FEATURES_2 VkStructureType = 1000059000
        const VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_2_FEATURES VkStructureType = 51
        const VK_STRUCTURE_TYPE_PHYSICAL_DEVICE_VULKAN_1_3_FEATURES VkStructureType = 53
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
        const VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO VkStructureType = 1000314005
        const VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO VkStructureType = 16
        const VK_STRUCTURE_TYPE_SUBMIT_INFO VkStructureType = 4
        const VK_STRUCTURE_TYPE_SUBMIT_INFO_2 VkStructureType = 1000314004
        const VK_STRUCTURE_TYPE_SWAPCHAIN_CREATE_INFO_KHR VkStructureType = 1000001000
        const VK_STRUCTURE_TYPE_WAYLAND_SURFACE_CREATE_INFO_KHR VkStructureType = 1000006000
        const VK_STRUCTURE_TYPE_WIN32_SURFACE_CREATE_INFO_KHR VkStructureType = 1000009000
        const VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET VkStructureType = 35
        const VK_SUBMIT_PROTECTED_BIT VkSubmitFlagBits = 1
        const VK_SUBOPTIMAL_KHR VkResult = 1000001003
        const VK_SUBPASS_EXTERNAL uint32 = 4294967295u
        const VK_SUCCESS VkResult = 0
        const VK_SURFACE_TRANSFORM_HORIZONTAL_MIRROR_BIT_KHR VkSurfaceTransformFlagBitsKHR = 16
        const VK_SURFACE_TRANSFORM_HORIZONTAL_MIRROR_ROTATE_180_BIT_KHR VkSurfaceTransformFlagBitsKHR = 64
        const VK_SURFACE_TRANSFORM_HORIZONTAL_MIRROR_ROTATE_270_BIT_KHR VkSurfaceTransformFlagBitsKHR = 128
        const VK_SURFACE_TRANSFORM_HORIZONTAL_MIRROR_ROTATE_90_BIT_KHR VkSurfaceTransformFlagBitsKHR = 32
        const VK_SURFACE_TRANSFORM_IDENTITY_BIT_KHR VkSurfaceTransformFlagBitsKHR = 1
        const VK_SURFACE_TRANSFORM_INHERIT_BIT_KHR VkSurfaceTransformFlagBitsKHR = 256
        const VK_SURFACE_TRANSFORM_ROTATE_180_BIT_KHR VkSurfaceTransformFlagBitsKHR = 4
        const VK_SURFACE_TRANSFORM_ROTATE_270_BIT_KHR VkSurfaceTransformFlagBitsKHR = 8
        const VK_SURFACE_TRANSFORM_ROTATE_90_BIT_KHR VkSurfaceTransformFlagBitsKHR = 2
        const VK_SWAPCHAIN_CREATE_PROTECTED_BIT_KHR VkSwapchainCreateFlagBitsKHR = 2
        const VK_SWAPCHAIN_CREATE_SPLIT_INSTANCE_BIND_REGIONS_BIT_KHR VkSwapchainCreateFlagBitsKHR = 1
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
unsafe struct VkBufferMemoryBarrier2 {
    var sType VkStructureType
    var pNext *void
    var srcStageMask VkPipelineStageFlags2
    var srcAccessMask VkAccessFlags2
    var dstStageMask VkPipelineStageFlags2
    var dstAccessMask VkAccessFlags2
    var srcQueueFamilyIndex uint32
    var dstQueueFamilyIndex uint32
    var buffer VkBuffer
    var offset VkDeviceSize
    var size VkDeviceSize
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkClearColorValue_float32Array {
    fixed values [4]float32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkClearColorValue_int32Array {
    fixed values [4]int32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkClearColorValue_uint32Array {
    fixed values [4]uint32
}

@StructLayout(LayoutKind.Explicit, Size: 16)
unsafe struct VkClearColorValue {
    @FieldOffset(0) var float32 VkClearColorValue_float32Array
    @FieldOffset(0) var int32 VkClearColorValue_int32Array
    @FieldOffset(0) var uint32 VkClearColorValue_uint32Array
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkClearDepthStencilValue {
    var depth float32
    var stencil uint32
}

@StructLayout(LayoutKind.Explicit, Size: 16)
unsafe struct VkClearValue {
    @FieldOffset(0) var color VkClearColorValue
    @FieldOffset(0) var depthStencil VkClearDepthStencilValue
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkCommandBufferAllocateInfo {
    var sType VkStructureType
    var pNext *void
    var commandPool VkCommandPool
    var level VkCommandBufferLevel
    var commandBufferCount uint32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkCommandBufferBeginInfo {
    var sType VkStructureType
    var pNext *void
    var flags VkCommandBufferUsageFlags
    var pInheritanceInfo *VkCommandBufferInheritanceInfo
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkCommandBufferInheritanceInfo {
    var sType VkStructureType
    var pNext *void
    var renderPass VkRenderPass
    var subpass uint32
    var framebuffer VkFramebuffer
    var occlusionQueryEnable VkBool32
    var queryFlags VkQueryControlFlags
    var pipelineStatistics VkQueryPipelineStatisticFlags
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkCommandBufferSubmitInfo {
    var sType VkStructureType
    var pNext *void
    var commandBuffer VkCommandBuffer
    var deviceMask uint32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkCommandPoolCreateInfo {
    var sType VkStructureType
    var pNext *void
    var flags VkCommandPoolCreateFlags
    var queueFamilyIndex uint32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkDependencyInfo {
    var sType VkStructureType
    var pNext *void
    var dependencyFlags VkDependencyFlags
    var memoryBarrierCount uint32
    var pMemoryBarriers *VkMemoryBarrier2
    var bufferMemoryBarrierCount uint32
    var pBufferMemoryBarriers *VkBufferMemoryBarrier2
    var imageMemoryBarrierCount uint32
    var pImageMemoryBarriers *VkImageMemoryBarrier2
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkDeviceCreateInfo {
    var sType VkStructureType
    var pNext *void
    var flags VkDeviceCreateFlags
    var queueCreateInfoCount uint32
    var pQueueCreateInfos *VkDeviceQueueCreateInfo
    var enabledLayerCount uint32
    var ppEnabledLayerNames **int8
    var enabledExtensionCount uint32
    var ppEnabledExtensionNames **int8
    var pEnabledFeatures *VkPhysicalDeviceFeatures
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkDeviceQueueCreateInfo {
    var sType VkStructureType
    var pNext *void
    var flags VkDeviceQueueCreateFlags
    var queueFamilyIndex uint32
    var queueCount uint32
    var pQueuePriorities *float32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkExtensionProperties {
    fixed extensionName [256]int8
    var specVersion uint32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkExtent2D {
    var width uint32
    var height uint32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkExtent3D {
    var width uint32
    var height uint32
    var depth uint32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkFenceCreateInfo {
    var sType VkStructureType
    var pNext *void
    var flags VkFenceCreateFlags
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkImageMemoryBarrier2 {
    var sType VkStructureType
    var pNext *void
    var srcStageMask VkPipelineStageFlags2
    var srcAccessMask VkAccessFlags2
    var dstStageMask VkPipelineStageFlags2
    var dstAccessMask VkAccessFlags2
    var oldLayout VkImageLayout
    var newLayout VkImageLayout
    var srcQueueFamilyIndex uint32
    var dstQueueFamilyIndex uint32
    var image VkImage
    var subresourceRange VkImageSubresourceRange
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkImageSubresourceRange {
    var aspectMask VkImageAspectFlags
    var baseMipLevel uint32
    var levelCount uint32
    var baseArrayLayer uint32
    var layerCount uint32
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
unsafe struct VkMemoryBarrier2 {
    var sType VkStructureType
    var pNext *void
    var srcStageMask VkPipelineStageFlags2
    var srcAccessMask VkAccessFlags2
    var dstStageMask VkPipelineStageFlags2
    var dstAccessMask VkAccessFlags2
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkPhysicalDeviceFeatures {
    var robustBufferAccess VkBool32
    var fullDrawIndexUint32 VkBool32
    var imageCubeArray VkBool32
    var independentBlend VkBool32
    var geometryShader VkBool32
    var tessellationShader VkBool32
    var sampleRateShading VkBool32
    var dualSrcBlend VkBool32
    var logicOp VkBool32
    var multiDrawIndirect VkBool32
    var drawIndirectFirstInstance VkBool32
    var depthClamp VkBool32
    var depthBiasClamp VkBool32
    var fillModeNonSolid VkBool32
    var depthBounds VkBool32
    var wideLines VkBool32
    var largePoints VkBool32
    var alphaToOne VkBool32
    var multiViewport VkBool32
    var samplerAnisotropy VkBool32
    var textureCompressionETC2 VkBool32
    var textureCompressionASTC_LDR VkBool32
    var textureCompressionBC VkBool32
    var occlusionQueryPrecise VkBool32
    var pipelineStatisticsQuery VkBool32
    var vertexPipelineStoresAndAtomics VkBool32
    var fragmentStoresAndAtomics VkBool32
    var shaderTessellationAndGeometryPointSize VkBool32
    var shaderImageGatherExtended VkBool32
    var shaderStorageImageExtendedFormats VkBool32
    var shaderStorageImageMultisample VkBool32
    var shaderStorageImageReadWithoutFormat VkBool32
    var shaderStorageImageWriteWithoutFormat VkBool32
    var shaderUniformBufferArrayDynamicIndexing VkBool32
    var shaderSampledImageArrayDynamicIndexing VkBool32
    var shaderStorageBufferArrayDynamicIndexing VkBool32
    var shaderStorageImageArrayDynamicIndexing VkBool32
    var shaderClipDistance VkBool32
    var shaderCullDistance VkBool32
    var shaderFloat64 VkBool32
    var shaderInt64 VkBool32
    var shaderInt16 VkBool32
    var shaderResourceResidency VkBool32
    var shaderResourceMinLod VkBool32
    var sparseBinding VkBool32
    var sparseResidencyBuffer VkBool32
    var sparseResidencyImage2D VkBool32
    var sparseResidencyImage3D VkBool32
    var sparseResidency2Samples VkBool32
    var sparseResidency4Samples VkBool32
    var sparseResidency8Samples VkBool32
    var sparseResidency16Samples VkBool32
    var sparseResidencyAliased VkBool32
    var variableMultisampleRate VkBool32
    var inheritedQueries VkBool32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkPhysicalDeviceFeatures2 {
    var sType VkStructureType
    var pNext *void
    var features VkPhysicalDeviceFeatures
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkPhysicalDeviceLimits {
    var maxImageDimension1D uint32
    var maxImageDimension2D uint32
    var maxImageDimension3D uint32
    var maxImageDimensionCube uint32
    var maxImageArrayLayers uint32
    var maxTexelBufferElements uint32
    var maxUniformBufferRange uint32
    var maxStorageBufferRange uint32
    var maxPushConstantsSize uint32
    var maxMemoryAllocationCount uint32
    var maxSamplerAllocationCount uint32
    var bufferImageGranularity VkDeviceSize
    var sparseAddressSpaceSize VkDeviceSize
    var maxBoundDescriptorSets uint32
    var maxPerStageDescriptorSamplers uint32
    var maxPerStageDescriptorUniformBuffers uint32
    var maxPerStageDescriptorStorageBuffers uint32
    var maxPerStageDescriptorSampledImages uint32
    var maxPerStageDescriptorStorageImages uint32
    var maxPerStageDescriptorInputAttachments uint32
    var maxPerStageResources uint32
    var maxDescriptorSetSamplers uint32
    var maxDescriptorSetUniformBuffers uint32
    var maxDescriptorSetUniformBuffersDynamic uint32
    var maxDescriptorSetStorageBuffers uint32
    var maxDescriptorSetStorageBuffersDynamic uint32
    var maxDescriptorSetSampledImages uint32
    var maxDescriptorSetStorageImages uint32
    var maxDescriptorSetInputAttachments uint32
    var maxVertexInputAttributes uint32
    var maxVertexInputBindings uint32
    var maxVertexInputAttributeOffset uint32
    var maxVertexInputBindingStride uint32
    var maxVertexOutputComponents uint32
    var maxTessellationGenerationLevel uint32
    var maxTessellationPatchSize uint32
    var maxTessellationControlPerVertexInputComponents uint32
    var maxTessellationControlPerVertexOutputComponents uint32
    var maxTessellationControlPerPatchOutputComponents uint32
    var maxTessellationControlTotalOutputComponents uint32
    var maxTessellationEvaluationInputComponents uint32
    var maxTessellationEvaluationOutputComponents uint32
    var maxGeometryShaderInvocations uint32
    var maxGeometryInputComponents uint32
    var maxGeometryOutputComponents uint32
    var maxGeometryOutputVertices uint32
    var maxGeometryTotalOutputComponents uint32
    var maxFragmentInputComponents uint32
    var maxFragmentOutputAttachments uint32
    var maxFragmentDualSrcAttachments uint32
    var maxFragmentCombinedOutputResources uint32
    var maxComputeSharedMemorySize uint32
    fixed maxComputeWorkGroupCount [3]uint32
    var maxComputeWorkGroupInvocations uint32
    fixed maxComputeWorkGroupSize [3]uint32
    var subPixelPrecisionBits uint32
    var subTexelPrecisionBits uint32
    var mipmapPrecisionBits uint32
    var maxDrawIndexedIndexValue uint32
    var maxDrawIndirectCount uint32
    var maxSamplerLodBias float32
    var maxSamplerAnisotropy float32
    var maxViewports uint32
    fixed maxViewportDimensions [2]uint32
    fixed viewportBoundsRange [2]float32
    var viewportSubPixelBits uint32
    var minMemoryMapAlignment nuint
    var minTexelBufferOffsetAlignment VkDeviceSize
    var minUniformBufferOffsetAlignment VkDeviceSize
    var minStorageBufferOffsetAlignment VkDeviceSize
    var minTexelOffset int32
    var maxTexelOffset uint32
    var minTexelGatherOffset int32
    var maxTexelGatherOffset uint32
    var minInterpolationOffset float32
    var maxInterpolationOffset float32
    var subPixelInterpolationOffsetBits uint32
    var maxFramebufferWidth uint32
    var maxFramebufferHeight uint32
    var maxFramebufferLayers uint32
    var framebufferColorSampleCounts VkSampleCountFlags
    var framebufferDepthSampleCounts VkSampleCountFlags
    var framebufferStencilSampleCounts VkSampleCountFlags
    var framebufferNoAttachmentsSampleCounts VkSampleCountFlags
    var maxColorAttachments uint32
    var sampledImageColorSampleCounts VkSampleCountFlags
    var sampledImageIntegerSampleCounts VkSampleCountFlags
    var sampledImageDepthSampleCounts VkSampleCountFlags
    var sampledImageStencilSampleCounts VkSampleCountFlags
    var storageImageSampleCounts VkSampleCountFlags
    var maxSampleMaskWords uint32
    var timestampComputeAndGraphics VkBool32
    var timestampPeriod float32
    var maxClipDistances uint32
    var maxCullDistances uint32
    var maxCombinedClipAndCullDistances uint32
    var discreteQueuePriorities uint32
    fixed pointSizeRange [2]float32
    fixed lineWidthRange [2]float32
    var pointSizeGranularity float32
    var lineWidthGranularity float32
    var strictLines VkBool32
    var standardSampleLocations VkBool32
    var optimalBufferCopyOffsetAlignment VkDeviceSize
    var optimalBufferCopyRowPitchAlignment VkDeviceSize
    var nonCoherentAtomSize VkDeviceSize
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkPhysicalDeviceProperties {
    var apiVersion uint32
    var driverVersion uint32
    var vendorID uint32
    var deviceID uint32
    var deviceType VkPhysicalDeviceType
    fixed deviceName [256]int8
    fixed pipelineCacheUUID [16]uint8
    var limits VkPhysicalDeviceLimits
    var sparseProperties VkPhysicalDeviceSparseProperties
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkPhysicalDeviceSparseProperties {
    var residencyStandard2DBlockShape VkBool32
    var residencyStandard2DMultisampleBlockShape VkBool32
    var residencyStandard3DBlockShape VkBool32
    var residencyAlignedMipSize VkBool32
    var residencyNonResidentStrict VkBool32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkPhysicalDeviceVulkan12Features {
    var sType VkStructureType
    var pNext *void
    var samplerMirrorClampToEdge VkBool32
    var drawIndirectCount VkBool32
    var storageBuffer8BitAccess VkBool32
    var uniformAndStorageBuffer8BitAccess VkBool32
    var storagePushConstant8 VkBool32
    var shaderBufferInt64Atomics VkBool32
    var shaderSharedInt64Atomics VkBool32
    var shaderFloat16 VkBool32
    var shaderInt8 VkBool32
    var descriptorIndexing VkBool32
    var shaderInputAttachmentArrayDynamicIndexing VkBool32
    var shaderUniformTexelBufferArrayDynamicIndexing VkBool32
    var shaderStorageTexelBufferArrayDynamicIndexing VkBool32
    var shaderUniformBufferArrayNonUniformIndexing VkBool32
    var shaderSampledImageArrayNonUniformIndexing VkBool32
    var shaderStorageBufferArrayNonUniformIndexing VkBool32
    var shaderStorageImageArrayNonUniformIndexing VkBool32
    var shaderInputAttachmentArrayNonUniformIndexing VkBool32
    var shaderUniformTexelBufferArrayNonUniformIndexing VkBool32
    var shaderStorageTexelBufferArrayNonUniformIndexing VkBool32
    var descriptorBindingUniformBufferUpdateAfterBind VkBool32
    var descriptorBindingSampledImageUpdateAfterBind VkBool32
    var descriptorBindingStorageImageUpdateAfterBind VkBool32
    var descriptorBindingStorageBufferUpdateAfterBind VkBool32
    var descriptorBindingUniformTexelBufferUpdateAfterBind VkBool32
    var descriptorBindingStorageTexelBufferUpdateAfterBind VkBool32
    var descriptorBindingUpdateUnusedWhilePending VkBool32
    var descriptorBindingPartiallyBound VkBool32
    var descriptorBindingVariableDescriptorCount VkBool32
    var runtimeDescriptorArray VkBool32
    var samplerFilterMinmax VkBool32
    var scalarBlockLayout VkBool32
    var imagelessFramebuffer VkBool32
    var uniformBufferStandardLayout VkBool32
    var shaderSubgroupExtendedTypes VkBool32
    var separateDepthStencilLayouts VkBool32
    var hostQueryReset VkBool32
    var timelineSemaphore VkBool32
    var bufferDeviceAddress VkBool32
    var bufferDeviceAddressCaptureReplay VkBool32
    var bufferDeviceAddressMultiDevice VkBool32
    var vulkanMemoryModel VkBool32
    var vulkanMemoryModelDeviceScope VkBool32
    var vulkanMemoryModelAvailabilityVisibilityChains VkBool32
    var shaderOutputViewportIndex VkBool32
    var shaderOutputLayer VkBool32
    var subgroupBroadcastDynamicId VkBool32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkPhysicalDeviceVulkan13Features {
    var sType VkStructureType
    var pNext *void
    var robustImageAccess VkBool32
    var inlineUniformBlock VkBool32
    var descriptorBindingInlineUniformBlockUpdateAfterBind VkBool32
    var pipelineCreationCacheControl VkBool32
    var privateData VkBool32
    var shaderDemoteToHelperInvocation VkBool32
    var shaderTerminateInvocation VkBool32
    var subgroupSizeControl VkBool32
    var computeFullSubgroups VkBool32
    var synchronization2 VkBool32
    var textureCompressionASTC_HDR VkBool32
    var shaderZeroInitializeWorkgroupMemory VkBool32
    var dynamicRendering VkBool32
    var shaderIntegerDotProduct VkBool32
    var maintenance4 VkBool32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkPresentInfoKHR {
    var sType VkStructureType
    var pNext *void
    var waitSemaphoreCount uint32
    var pWaitSemaphores *VkSemaphore
    var swapchainCount uint32
    var pSwapchains *VkSwapchainKHR
    var pImageIndices *uint32
    var pResults *VkResult
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkQueueFamilyProperties {
    var queueFlags VkQueueFlags
    var queueCount uint32
    var timestampValidBits uint32
    var minImageTransferGranularity VkExtent3D
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkSemaphoreCreateInfo {
    var sType VkStructureType
    var pNext *void
    var flags VkSemaphoreCreateFlags
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkSemaphoreSubmitInfo {
    var sType VkStructureType
    var pNext *void
    var semaphore VkSemaphore
    var value uint64
    var stageMask VkPipelineStageFlags2
    var deviceIndex uint32
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkSubmitInfo2 {
    var sType VkStructureType
    var pNext *void
    var flags VkSubmitFlags
    var waitSemaphoreInfoCount uint32
    var pWaitSemaphoreInfos *VkSemaphoreSubmitInfo
    var commandBufferInfoCount uint32
    var pCommandBufferInfos *VkCommandBufferSubmitInfo
    var signalSemaphoreInfoCount uint32
    var pSignalSemaphoreInfos *VkSemaphoreSubmitInfo
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkSurfaceCapabilitiesKHR {
    var minImageCount uint32
    var maxImageCount uint32
    var currentExtent VkExtent2D
    var minImageExtent VkExtent2D
    var maxImageExtent VkExtent2D
    var maxImageArrayLayers uint32
    var supportedTransforms VkSurfaceTransformFlagsKHR
    var currentTransform VkSurfaceTransformFlagBitsKHR
    var supportedCompositeAlpha VkCompositeAlphaFlagsKHR
    var supportedUsageFlags VkImageUsageFlags
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkSurfaceFormatKHR {
    var format VkFormat
    var colorSpace VkColorSpaceKHR
}

@StructLayout(LayoutKind.Sequential)
unsafe struct VkSwapchainCreateInfoKHR {
    var sType VkStructureType
    var pNext *void
    var flags VkSwapchainCreateFlagsKHR
    var surface VkSurfaceKHR
    var minImageCount uint32
    var imageFormat VkFormat
    var imageColorSpace VkColorSpaceKHR
    var imageExtent VkExtent2D
    var imageArrayLayers uint32
    var imageUsage VkImageUsageFlags
    var imageSharingMode VkSharingMode
    var queueFamilyIndexCount uint32
    var pQueueFamilyIndices *uint32
    var preTransform VkSurfaceTransformFlagBitsKHR
    var compositeAlpha VkCompositeAlphaFlagBitsKHR
    var presentMode VkPresentModeKHR
    var clipped VkBool32
    var oldSwapchain VkSwapchainKHR
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
    var vkGetPhysicalDeviceProperties unmanaged[Cdecl] (VkPhysicalDevice, *VkPhysicalDeviceProperties) -> void
    var vkDestroySurfaceKHR unmanaged[Cdecl] (VkInstance, VkSurfaceKHR, *VkAllocationCallbacks) -> void
    var vkGetPhysicalDeviceSurfaceSupportKHR unmanaged[Cdecl] (VkPhysicalDevice, uint32, VkSurfaceKHR, *VkBool32) -> VkResult
    var vkGetDeviceProcAddr unmanaged[Cdecl] (VkDevice, *int8) -> unmanaged[Cdecl] () -> void
    var vkGetPhysicalDeviceFeatures2 unmanaged[Cdecl] (VkPhysicalDevice, *VkPhysicalDeviceFeatures2) -> void
    var vkEnumerateDeviceExtensionProperties unmanaged[Cdecl] (VkPhysicalDevice, *int8, *uint32, *VkExtensionProperties) -> VkResult
    var vkGetPhysicalDeviceSurfaceCapabilitiesKHR unmanaged[Cdecl] (VkPhysicalDevice, VkSurfaceKHR, *VkSurfaceCapabilitiesKHR) -> VkResult
    var vkGetPhysicalDeviceSurfaceFormatsKHR unmanaged[Cdecl] (VkPhysicalDevice, VkSurfaceKHR, *uint32, *VkSurfaceFormatKHR) -> VkResult
    var vkGetPhysicalDeviceSurfacePresentModesKHR unmanaged[Cdecl] (VkPhysicalDevice, VkSurfaceKHR, *uint32, *VkPresentModeKHR) -> VkResult
    var vkCreateDevice unmanaged[Cdecl] (VkPhysicalDevice, *VkDeviceCreateInfo, *VkAllocationCallbacks, *VkDevice) -> VkResult
}
@StructLayout(LayoutKind.Sequential)
unsafe struct VkDeviceDispatch {
    var vkDestroyDevice unmanaged[Cdecl] (VkDevice, *VkAllocationCallbacks) -> void
    var vkGetDeviceQueue unmanaged[Cdecl] (VkDevice, uint32, uint32, *VkQueue) -> void
    var vkCreateSwapchainKHR unmanaged[Cdecl] (VkDevice, *VkSwapchainCreateInfoKHR, *VkAllocationCallbacks, *VkSwapchainKHR) -> VkResult
    var vkDestroySwapchainKHR unmanaged[Cdecl] (VkDevice, VkSwapchainKHR, *VkAllocationCallbacks) -> void
    var vkGetSwapchainImagesKHR unmanaged[Cdecl] (VkDevice, VkSwapchainKHR, *uint32, *VkImage) -> VkResult
    var vkCreateCommandPool unmanaged[Cdecl] (VkDevice, *VkCommandPoolCreateInfo, *VkAllocationCallbacks, *VkCommandPool) -> VkResult
    var vkDestroyCommandPool unmanaged[Cdecl] (VkDevice, VkCommandPool, *VkAllocationCallbacks) -> void
    var vkAllocateCommandBuffers unmanaged[Cdecl] (VkDevice, *VkCommandBufferAllocateInfo, *VkCommandBuffer) -> VkResult
    var vkCreateSemaphore unmanaged[Cdecl] (VkDevice, *VkSemaphoreCreateInfo, *VkAllocationCallbacks, *VkSemaphore) -> VkResult
    var vkDestroySemaphore unmanaged[Cdecl] (VkDevice, VkSemaphore, *VkAllocationCallbacks) -> void
    var vkCreateFence unmanaged[Cdecl] (VkDevice, *VkFenceCreateInfo, *VkAllocationCallbacks, *VkFence) -> VkResult
    var vkDestroyFence unmanaged[Cdecl] (VkDevice, VkFence, *VkAllocationCallbacks) -> void
    var vkWaitForFences unmanaged[Cdecl] (VkDevice, uint32, *VkFence, VkBool32, uint64) -> VkResult
    var vkAcquireNextImageKHR unmanaged[Cdecl] (VkDevice, VkSwapchainKHR, uint64, VkSemaphore, VkFence, *uint32) -> VkResult
    var vkBeginCommandBuffer unmanaged[Cdecl] (VkCommandBuffer, *VkCommandBufferBeginInfo) -> VkResult
    var vkEndCommandBuffer unmanaged[Cdecl] (VkCommandBuffer) -> VkResult
    var vkCmdPipelineBarrier2 unmanaged[Cdecl] (VkCommandBuffer, *VkDependencyInfo) -> void
    var vkCmdClearColorImage unmanaged[Cdecl] (VkCommandBuffer, VkImage, VkImageLayout, *VkClearColorValue, uint32, *VkImageSubresourceRange) -> void
    var vkQueueSubmit2 unmanaged[Cdecl] (VkQueue, uint32, *VkSubmitInfo2, VkFence) -> VkResult
    var vkQueuePresentKHR unmanaged[Cdecl] (VkQueue, *VkPresentInfoKHR) -> VkResult
    var vkQueueWaitIdle unmanaged[Cdecl] (VkQueue) -> VkResult
}
