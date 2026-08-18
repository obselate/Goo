package Goo

import System
import System.IO
import System.Runtime.InteropServices

internal unsafe sealed class VulkanSharedPrimitiveFormatState : IDisposable {
    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let format VkFormat
    private let objectAccounting VulkanObjectAccounting?
    private let pipelineLayout VkPipelineLayout
    private let textPipelineLayout VkPipelineLayout
    private var solidPipeline VkPipeline
    private var borderPipeline VkPipeline
    private var linearPipeline VkPipeline
    private var radialPipeline VkPipeline
    private var sampledPipeline VkPipeline
    private var textPipeline VkPipeline
    private var textPaintPipeline VkPipeline
    private var disposed bool

    internal prop Format VkFormat { get { return format } }
    internal prop PipelineLayout VkPipelineLayout { get { return pipelineLayout } }
    internal prop TextPipelineLayout VkPipelineLayout { get { return textPipelineLayout } }
    internal prop SolidPipeline VkPipeline { get { return solidPipeline } }
    internal prop BorderPipeline VkPipeline { get { return borderPipeline } }
    internal prop LinearPipeline VkPipeline { get { return linearPipeline } }
    internal prop RadialPipeline VkPipeline { get { return radialPipeline } }
    internal prop SampledPipeline VkPipeline { get { return sampledPipeline } }
    internal prop TextPipeline VkPipeline { get { return textPipeline } }
    internal prop TextPaintPipeline VkPipeline { get { return textPaintPipeline } }
    internal prop LiveObjectCount uint64 {
        get {
            var count uint64 = 0uL
            if solidPipeline != 0uL { count++ }
            if borderPipeline != 0uL { count++ }
            if linearPipeline != 0uL { count++ }
            if radialPipeline != 0uL { count++ }
            if sampledPipeline != 0uL { count++ }
            if textPipeline != 0uL { count++ }
            if textPaintPipeline != 0uL { count++ }
            return count
        }
    }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        targetFormat VkFormat,
        nativePipelineLayout VkPipelineLayout,
        nativeTextPipelineLayout VkPipelineLayout,
        vertexModule VkShaderModule,
        solidModule VkShaderModule,
        borderModule VkShaderModule,
        linearModule VkShaderModule,
        radialModule VkShaderModule,
        sampledModule VkShaderModule,
        textVertexModule VkShaderModule,
        textFragmentModule VkShaderModule,
        textPaintFragmentModule VkShaderModule,
        nativeObjectAccounting VulkanObjectAccounting?) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan device is null", "nativeDevice")
        }
        if targetFormat != VkConstants.VK_FORMAT_R8G8B8A8_SRGB
            && targetFormat != VkConstants.VK_FORMAT_B8G8R8A8_SRGB {
            throw ArgumentException("Vulkan primitive pipeline requires an sRGB RGBA target", "targetFormat")
        }
        if nativePipelineLayout == 0uL {
            throw ArgumentException("Vulkan primitive pipeline layout is null", "nativePipelineLayout")
        }
        if nativeTextPipelineLayout == 0uL {
            throw ArgumentException("Vulkan text pipeline layout is null", "nativeTextPipelineLayout")
        }
        if vertexModule == 0uL || solidModule == 0uL || borderModule == 0uL
            || linearModule == 0uL || radialModule == 0uL || sampledModule == 0uL {
            throw ArgumentException("Vulkan primitive shader module is null")
        }
        if textVertexModule == 0uL || textFragmentModule == 0uL
            || textPaintFragmentModule == 0uL {
            throw ArgumentException("Vulkan text shader module is null")
        }
        device = nativeDevice
        dispatch = nativeDispatch
        format = targetFormat
        objectAccounting = nativeObjectAccounting
        pipelineLayout = nativePipelineLayout
        textPipelineLayout = nativeTextPipelineLayout
        try {
            Create(vertexModule, solidModule, borderModule, linearModule,
                radialModule, sampledModule, textVertexModule, textFragmentModule,
                textPaintFragmentModule)
        } catch (error Exception) {
            DestroyPipelines()
            throw error
        }
    }

    private func Create(
        vertexModule VkShaderModule,
        solidModule VkShaderModule,
        borderModule VkShaderModule,
        linearModule VkShaderModule,
        radialModule VkShaderModule,
        sampledModule VkShaderModule,
        textVertexModule VkShaderModule,
        textFragmentModule VkShaderModule,
        textPaintFragmentModule VkShaderModule) {
        var entryPointStorage nint = nint(0)
        try {
            entryPointStorage = Marshal.StringToCoTaskMemUTF8("main")
            solidPipeline = CreatePipeline(vertexModule, solidModule, pipelineLayout, entryPointStorage)
            borderPipeline = CreatePipeline(vertexModule, borderModule, pipelineLayout, entryPointStorage)
            linearPipeline = CreatePipeline(vertexModule, linearModule, pipelineLayout, entryPointStorage)
            radialPipeline = CreatePipeline(vertexModule, radialModule, pipelineLayout, entryPointStorage)
            sampledPipeline = CreatePipeline(vertexModule, sampledModule, pipelineLayout, entryPointStorage)
            textPipeline = CreatePipeline(textVertexModule, textFragmentModule,
                textPipelineLayout, entryPointStorage)
            textPaintPipeline = CreatePipeline(textVertexModule, textPaintFragmentModule,
                textPipelineLayout, entryPointStorage)
        } finally {
            if entryPointStorage != nint(0) {
                Marshal.FreeCoTaskMem(entryPointStorage)
            }
        }
    }

    private func CreatePipeline(
        vertexModule VkShaderModule,
        fragmentModule VkShaderModule,
        layout VkPipelineLayout,
        entryPointStorage nint) VkPipeline {
        let entryPoint = *int8(entryPointStorage)
        let stages *VkPipelineShaderStageCreateInfo = stackalloc [2]VkPipelineShaderStageCreateInfo
        stages[0] = VkPipelineShaderStageCreateInfo{}
        stages[0].sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO
        stages[0].stage = VkConstants.VK_SHADER_STAGE_VERTEX_BIT
        stages[0].module = vertexModule
        stages[0].pName = entryPoint
        stages[1] = VkPipelineShaderStageCreateInfo{}
        stages[1].sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO
        stages[1].stage = VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT
        stages[1].module = fragmentModule
        stages[1].pName = entryPoint

        var vertexInput = VkPipelineVertexInputStateCreateInfo{}
        vertexInput.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO

        var inputAssembly = VkPipelineInputAssemblyStateCreateInfo{}
        inputAssembly.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO
        inputAssembly.topology = VkConstants.VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST

        var viewportState = VkPipelineViewportStateCreateInfo{}
        viewportState.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO
        viewportState.viewportCount = 1u
        viewportState.scissorCount = 1u

        var rasterization = VkPipelineRasterizationStateCreateInfo{}
        rasterization.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO
        rasterization.polygonMode = VkConstants.VK_POLYGON_MODE_FILL
        rasterization.cullMode = uint32(VkConstants.VK_CULL_MODE_NONE)
        rasterization.frontFace = VkConstants.VK_FRONT_FACE_COUNTER_CLOCKWISE
        rasterization.lineWidth = 1.0F

        var multisample = VkPipelineMultisampleStateCreateInfo{}
        multisample.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO
        multisample.rasterizationSamples = VkConstants.VK_SAMPLE_COUNT_1_BIT

        var colorBlendAttachment = VkPipelineColorBlendAttachmentState{}
        colorBlendAttachment.blendEnable = VkConstants.VK_TRUE
        colorBlendAttachment.srcColorBlendFactor = VkConstants.VK_BLEND_FACTOR_ONE
        colorBlendAttachment.dstColorBlendFactor = VkConstants.VK_BLEND_FACTOR_ONE_MINUS_SRC_ALPHA
        colorBlendAttachment.colorBlendOp = VkConstants.VK_BLEND_OP_ADD
        colorBlendAttachment.srcAlphaBlendFactor = VkConstants.VK_BLEND_FACTOR_ONE
        colorBlendAttachment.dstAlphaBlendFactor = VkConstants.VK_BLEND_FACTOR_ONE_MINUS_SRC_ALPHA
        colorBlendAttachment.alphaBlendOp = VkConstants.VK_BLEND_OP_ADD
        colorBlendAttachment.colorWriteMask = uint32(VkConstants.VK_COLOR_COMPONENT_R_BIT)
            | uint32(VkConstants.VK_COLOR_COMPONENT_G_BIT)
            | uint32(VkConstants.VK_COLOR_COMPONENT_B_BIT)
            | uint32(VkConstants.VK_COLOR_COMPONENT_A_BIT)

        var colorBlend = VkPipelineColorBlendStateCreateInfo{}
        colorBlend.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO
        colorBlend.logicOpEnable = VkConstants.VK_FALSE
        colorBlend.logicOp = VkConstants.VK_LOGIC_OP_COPY
        colorBlend.attachmentCount = 1u
        colorBlend.pAttachments = &colorBlendAttachment

        let dynamicStates *VkDynamicState = stackalloc [2]VkDynamicState
        dynamicStates[0] = VkConstants.VK_DYNAMIC_STATE_VIEWPORT
        dynamicStates[1] = VkConstants.VK_DYNAMIC_STATE_SCISSOR
        var dynamicState = VkPipelineDynamicStateCreateInfo{}
        dynamicState.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO
        dynamicState.dynamicStateCount = 2u
        dynamicState.pDynamicStates = dynamicStates

        var pipelineColorFormat = format
        var pipelineRendering = VkPipelineRenderingCreateInfo{}
        pipelineRendering.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_RENDERING_CREATE_INFO
        pipelineRendering.colorAttachmentCount = 1u
        pipelineRendering.pColorAttachmentFormats = &pipelineColorFormat
        pipelineRendering.depthAttachmentFormat = VkFormat(0)
        pipelineRendering.stencilAttachmentFormat = VkFormat(0)

        var createInfo = VkGraphicsPipelineCreateInfo{}
        createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO
        createInfo.pNext = *void(&pipelineRendering)
        createInfo.stageCount = 2u
        createInfo.pStages = stages
        createInfo.pVertexInputState = &vertexInput
        createInfo.pInputAssemblyState = &inputAssembly
        createInfo.pViewportState = &viewportState
        createInfo.pRasterizationState = &rasterization
        createInfo.pMultisampleState = &multisample
        createInfo.pColorBlendState = &colorBlend
        createInfo.pDynamicState = &dynamicState
        createInfo.layout = layout
        createInfo.renderPass = 0uL
        var result VkPipeline = 0uL
        let createGraphicsPipelines = dispatch.vkCreateGraphicsPipelines
        if createGraphicsPipelines(device, 0uL, 1u, &createInfo, nil, &result) != VkConstants.VK_SUCCESS
            || result == 0uL {
            throw InvalidOperationException("vkCreateGraphicsPipelines failed")
        }
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyPipeline = dispatch.vkDestroyPipeline
            destroyPipeline(device, result, nil)
            throw error
        }
        return result
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        DestroyPipelines()
    }

    private func DestroyPipelines() {
        let destroyPipeline = dispatch.vkDestroyPipeline
        if textPaintPipeline != 0uL {
            destroyPipeline(device, textPaintPipeline, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            textPaintPipeline = 0uL
        }
        if textPipeline != 0uL {
            destroyPipeline(device, textPipeline, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            textPipeline = 0uL
        }
        if sampledPipeline != 0uL {
            destroyPipeline(device, sampledPipeline, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            sampledPipeline = 0uL
        }
        if radialPipeline != 0uL {
            destroyPipeline(device, radialPipeline, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            radialPipeline = 0uL
        }
        if linearPipeline != 0uL {
            destroyPipeline(device, linearPipeline, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            linearPipeline = 0uL
        }
        if borderPipeline != 0uL {
            destroyPipeline(device, borderPipeline, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            borderPipeline = 0uL
        }
        if solidPipeline != 0uL {
            destroyPipeline(device, solidPipeline, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            solidPipeline = 0uL
        }
    }

    deinit {
        Dispose()
    }
}

internal unsafe sealed class VulkanSharedPrimitiveState : IDisposable {
    private const FormatCapacity int32 = 2
    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let imageResources VulkanImageResources
    private let objectAccounting VulkanObjectAccounting?
    private let generation uint64
    private let formatStates []VulkanSharedPrimitiveFormatState?
    private var vertexModule VkShaderModule
    private var solidModule VkShaderModule
    private var borderModule VkShaderModule
    private var linearModule VkShaderModule
    private var radialModule VkShaderModule
    private var sampledModule VkShaderModule
    private var textVertexModule VkShaderModule
    private var textFragmentModule VkShaderModule
    private var textPaintFragmentModule VkShaderModule
    private var pipelineLayout VkPipelineLayout
    private var textDescriptorSetLayout VkDescriptorSetLayout
    private var textPipelineLayout VkPipelineLayout
    private var disposed bool

    internal prop Generation uint64 { get { return generation } }
    internal prop PipelineLayout VkPipelineLayout { get { return pipelineLayout } }
    internal prop TextDescriptorSetLayout VkDescriptorSetLayout { get { return textDescriptorSetLayout } }
    internal prop LiveObjectCount uint64 {
        get {
            var count uint64 = 0uL
            if vertexModule != 0uL { count++ }
            if solidModule != 0uL { count++ }
            if borderModule != 0uL { count++ }
            if linearModule != 0uL { count++ }
            if radialModule != 0uL { count++ }
            if sampledModule != 0uL { count++ }
            if textVertexModule != 0uL { count++ }
            if textFragmentModule != 0uL { count++ }
            if textPaintFragmentModule != 0uL { count++ }
            if pipelineLayout != 0uL { count++ }
            if textDescriptorSetLayout != 0uL { count++ }
            if textPipelineLayout != 0uL { count++ }
            var index int32 = 0
            while index < formatStates.Length {
                if let state = formatStates[index] {
                    count += state.LiveObjectCount
                }
                index++
            }
            return count
        }
    }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        nativeImageResources VulkanImageResources,
        nativeGeneration uint64,
        nativeObjectAccounting VulkanObjectAccounting?) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan device is null", "nativeDevice")
        }
        if nativeImageResources == nil {
            throw ArgumentNullException("nativeImageResources")
        }
        if nativeGeneration == 0uL || nativeImageResources.Generation != nativeGeneration {
            throw ArgumentOutOfRangeException("nativeGeneration")
        }
        device = nativeDevice
        dispatch = nativeDispatch
        imageResources = nativeImageResources
        objectAccounting = nativeObjectAccounting
        generation = nativeGeneration
        formatStates = [FormatCapacity]VulkanSharedPrimitiveFormatState?
        let vertexCode = LoadShaderCode("analytic.vert.spv")
        let solidCode = LoadShaderCode("analytic_solid.frag.spv")
        let borderCode = LoadShaderCode("analytic_border.frag.spv")
        let linearCode = LoadShaderCode("analytic_linear4.frag.spv")
        let radialCode = LoadShaderCode("analytic_radial4.frag.spv")
        let sampledCode = LoadShaderCode("analytic_sampled_image.frag.spv")
        let textVertexCode = LoadShaderCode("hb_gpu.vert.spv")
        let textFragmentCode = LoadShaderCode("hb_gpu_draw.frag.spv")
        let textPaintFragmentCode = LoadShaderCode("hb_gpu_paint.frag.spv")
        try {
            vertexModule = CreateShaderModule(vertexCode, "analytic.vert.spv")
            solidModule = CreateShaderModule(solidCode, "analytic_solid.frag.spv")
            borderModule = CreateShaderModule(borderCode, "analytic_border.frag.spv")
            linearModule = CreateShaderModule(linearCode, "analytic_linear4.frag.spv")
            radialModule = CreateShaderModule(radialCode, "analytic_radial4.frag.spv")
            sampledModule = CreateShaderModule(sampledCode, "analytic_sampled_image.frag.spv")
            textVertexModule = CreateShaderModule(textVertexCode, "hb_gpu.vert.spv")
            textFragmentModule = CreateShaderModule(textFragmentCode, "hb_gpu_draw.frag.spv")
            textPaintFragmentModule = CreateShaderModule(textPaintFragmentCode, "hb_gpu_paint.frag.spv")
            pipelineLayout = CreatePipelineLayout()
            textDescriptorSetLayout = CreateTextDescriptorSetLayout()
            textPipelineLayout = CreateTextPipelineLayout()
        } catch (error Exception) {
            Dispose()
            throw error
        }
    }

    internal func PipelinesFor(targetFormat VkFormat) VulkanSharedPrimitiveFormatState {
        EnsureOpen()
        var slot int32 = -1
        if targetFormat == VkConstants.VK_FORMAT_R8G8B8A8_SRGB {
            slot = 0
        } else if targetFormat == VkConstants.VK_FORMAT_B8G8R8A8_SRGB {
            slot = 1
        } else {
            throw ArgumentException("Vulkan primitive pipeline requires an sRGB RGBA target", "targetFormat")
        }
        if let existing = formatStates[slot] {
            return existing
        }
        let created = VulkanSharedPrimitiveFormatState(
            device,
            dispatch,
            targetFormat,
            pipelineLayout,
            textPipelineLayout,
            vertexModule,
            solidModule,
            borderModule,
            linearModule,
            radialModule,
            sampledModule,
            textVertexModule,
            textFragmentModule,
            textPaintFragmentModule,
            objectAccounting)
        formatStates[slot] = created
        return created
    }

    private func CreatePipelineLayout() VkPipelineLayout {
        var descriptorLayout VkDescriptorSetLayout = imageResources.DescriptorSetLayout
        if descriptorLayout == 0uL {
            throw InvalidOperationException("Vulkan sampled image descriptor layout is unavailable")
        }
        var pushRange = VkPushConstantRange{}
        pushRange.stageFlags = uint32(VkConstants.VK_SHADER_STAGE_VERTEX_BIT)
            | uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT)
        pushRange.offset = 0u
        pushRange.size = 128u
        var createInfo = VkPipelineLayoutCreateInfo{}
        createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO
        createInfo.setLayoutCount = 1u
        createInfo.pSetLayouts = &descriptorLayout
        createInfo.pushConstantRangeCount = 1u
        createInfo.pPushConstantRanges = &pushRange
        var result VkPipelineLayout = 0uL
        let createPipelineLayout = dispatch.vkCreatePipelineLayout
        if createPipelineLayout(device, &createInfo, nil, &result) != VkConstants.VK_SUCCESS
            || result == 0uL {
            throw InvalidOperationException("vkCreatePipelineLayout failed")
        }
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyPipelineLayout = dispatch.vkDestroyPipelineLayout
            destroyPipelineLayout(device, result, nil)
            throw error
        }
        return result
    }

    private func CreateTextDescriptorSetLayout() VkDescriptorSetLayout {
        var layoutBinding = VkDescriptorSetLayoutBinding{}
        layoutBinding.binding = 0u
        layoutBinding.descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_UNIFORM_TEXEL_BUFFER
        layoutBinding.descriptorCount = 1u
        layoutBinding.stageFlags = uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT)
        var createInfo = VkDescriptorSetLayoutCreateInfo{}
        createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO
        createInfo.bindingCount = 1u
        createInfo.pBindings = &layoutBinding
        var result VkDescriptorSetLayout = 0uL
        let createLayout = dispatch.vkCreateDescriptorSetLayout
        if createLayout(device, &createInfo, nil, &result) != VkConstants.VK_SUCCESS
            || result == 0uL {
            throw InvalidOperationException("vkCreateDescriptorSetLayout failed for Vulkan text")
        }
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyLayout = dispatch.vkDestroyDescriptorSetLayout
            destroyLayout(device, result, nil)
            throw error
        }
        return result
    }

    private func CreateTextPipelineLayout() VkPipelineLayout {
        if textDescriptorSetLayout == 0uL {
            throw InvalidOperationException("Vulkan text atlas descriptor layout is unavailable")
        }
        var descriptorLayout VkDescriptorSetLayout = textDescriptorSetLayout
        var pushRange = VkPushConstantRange{}
        pushRange.stageFlags = uint32(VkConstants.VK_SHADER_STAGE_VERTEX_BIT)
            | uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT)
        pushRange.offset = 0u
        pushRange.size = 128u
        var createInfo = VkPipelineLayoutCreateInfo{}
        createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO
        createInfo.setLayoutCount = 1u
        createInfo.pSetLayouts = &descriptorLayout
        createInfo.pushConstantRangeCount = 1u
        createInfo.pPushConstantRanges = &pushRange
        var result VkPipelineLayout = 0uL
        let createPipelineLayout = dispatch.vkCreatePipelineLayout
        if createPipelineLayout(device, &createInfo, nil, &result) != VkConstants.VK_SUCCESS
            || result == 0uL {
            throw InvalidOperationException("vkCreatePipelineLayout failed for Vulkan text")
        }
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyPipelineLayout = dispatch.vkDestroyPipelineLayout
            destroyPipelineLayout(device, result, nil)
            throw error
        }
        return result
    }

    private func LoadShaderCode(fileName string) []uint8 {
        let path = Path.Combine(AppContext.BaseDirectory, "Vulkan", "Shaders", fileName)
        let code = File.ReadAllBytes(path)
        if code.Length == 0 || (code.Length & 3) != 0 {
            throw InvalidDataException("Invalid SPIR-V artifact: " + path)
        }
        return code
    }

    private func CreateShaderModule(code []uint8, fileName string) VkShaderModule {
        let pin = GCHandle.Alloc(code, GCHandleType.Pinned)
        try {
            var createInfo = VkShaderModuleCreateInfo{}
            createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO
            createInfo.codeSize = nuint(code.Length)
            createInfo.pCode = *uint32(pin.AddrOfPinnedObject())
            var result VkShaderModule = 0uL
            let createShaderModule = dispatch.vkCreateShaderModule
            if createShaderModule(device, &createInfo, nil, &result) != VkConstants.VK_SUCCESS
                || result == 0uL {
                throw InvalidOperationException("vkCreateShaderModule failed: " + fileName)
            }
            try {
                if let accounting = objectAccounting {
                    accounting.Allocate()
                }
            } catch (error Exception) {
                let destroyShaderModule = dispatch.vkDestroyShaderModule
                destroyShaderModule(device, result, nil)
                throw error
            }
            return result
        } finally {
            pin.Free()
        }
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        var index int32 = 0
        while index < formatStates.Length {
            if let state = formatStates[index] {
                state.Dispose()
                formatStates[index] = nil
            }
            index++
        }
        if pipelineLayout != 0uL {
            let destroyPipelineLayout = dispatch.vkDestroyPipelineLayout
            destroyPipelineLayout(device, pipelineLayout, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            pipelineLayout = 0uL
        }
        if textPipelineLayout != 0uL {
            let destroyPipelineLayout = dispatch.vkDestroyPipelineLayout
            destroyPipelineLayout(device, textPipelineLayout, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            textPipelineLayout = 0uL
        }
        if textDescriptorSetLayout != 0uL {
            let destroyDescriptorSetLayout = dispatch.vkDestroyDescriptorSetLayout
            destroyDescriptorSetLayout(device, textDescriptorSetLayout, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            textDescriptorSetLayout = 0uL
        }
        let destroyShaderModule = dispatch.vkDestroyShaderModule
        if textPaintFragmentModule != 0uL {
            destroyShaderModule(device, textPaintFragmentModule, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            textPaintFragmentModule = 0uL
        }
        if textFragmentModule != 0uL {
            destroyShaderModule(device, textFragmentModule, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            textFragmentModule = 0uL
        }
        if textVertexModule != 0uL {
            destroyShaderModule(device, textVertexModule, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            textVertexModule = 0uL
        }
        if sampledModule != 0uL {
            destroyShaderModule(device, sampledModule, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            sampledModule = 0uL
        }
        if radialModule != 0uL {
            destroyShaderModule(device, radialModule, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            radialModule = 0uL
        }
        if linearModule != 0uL {
            destroyShaderModule(device, linearModule, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            linearModule = 0uL
        }
        if borderModule != 0uL {
            destroyShaderModule(device, borderModule, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            borderModule = 0uL
        }
        if solidModule != 0uL {
            destroyShaderModule(device, solidModule, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            solidModule = 0uL
        }
        if vertexModule != 0uL {
            destroyShaderModule(device, vertexModule, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            vertexModule = 0uL
        }
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanSharedPrimitiveState")
        }
    }

    deinit {
        Dispose()
    }
}
