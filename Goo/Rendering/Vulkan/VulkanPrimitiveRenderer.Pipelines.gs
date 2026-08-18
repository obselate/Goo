package Goo

import System
import System.IO
import System.Runtime.InteropServices

internal unsafe partial class VulkanPrimitiveRenderer : IDisposable {
    private func Create() {
        var vertexModule VkShaderModule = 0uL
        var solidModule VkShaderModule = 0uL
        var linearModule VkShaderModule = 0uL
        var radialModule VkShaderModule = 0uL
        var sampledModule VkShaderModule = 0uL
        var textVertexModule VkShaderModule = 0uL
        var textFragmentModule VkShaderModule = 0uL
        var textPaintFragmentModule VkShaderModule = 0uL
        var createdLayout VkPipelineLayout = 0uL
        var createdTextLayout VkPipelineLayout = 0uL
        var createdSolid VkPipeline = 0uL
        var createdLinear VkPipeline = 0uL
        var createdRadial VkPipeline = 0uL
        var createdSampled VkPipeline = 0uL
        var createdText VkPipeline = 0uL
        var createdTextPaint VkPipeline = 0uL
        var entryPointStorage nint = nint(0)
        try {
            vertexModule = CreateShaderModule("analytic.vert.spv")
            solidModule = CreateShaderModule("analytic_solid.frag.spv")
            linearModule = CreateShaderModule("analytic_linear3.frag.spv")
            radialModule = CreateShaderModule("analytic_radial3.frag.spv")
            if imageResources != nil {
                sampledModule = CreateShaderModule("analytic_sampled_image.frag.spv")
            }
            if textAtlas != nil {
                textVertexModule = CreateShaderModule("hb_gpu.vert.spv")
                textFragmentModule = CreateShaderModule("hb_gpu_draw.frag.spv")
                textPaintFragmentModule = CreateShaderModule("hb_gpu_paint.frag.spv")
            }
            createdLayout = CreatePipelineLayout()
            entryPointStorage = Marshal.StringToCoTaskMemUTF8("main")
            createdSolid = CreatePipeline(vertexModule, solidModule, createdLayout, entryPointStorage)
            createdLinear = CreatePipeline(vertexModule, linearModule, createdLayout, entryPointStorage)
            createdRadial = CreatePipeline(vertexModule, radialModule, createdLayout, entryPointStorage)
            if imageResources != nil {
                createdSampled = CreatePipeline(vertexModule, sampledModule, createdLayout, entryPointStorage)
            }
            if textAtlas != nil {
                createdTextLayout = CreateTextPipelineLayout()
                createdText = CreatePipeline(textVertexModule, textFragmentModule,
                    createdTextLayout, entryPointStorage)
                createdTextPaint = CreatePipeline(textVertexModule, textPaintFragmentModule,
                    createdTextLayout, entryPointStorage)
            }
            let destroyShaderModule = dispatch.vkDestroyShaderModule
            destroyShaderModule(device, vertexModule, nil)
            vertexModule = 0uL
            destroyShaderModule(device, solidModule, nil)
            solidModule = 0uL
            destroyShaderModule(device, linearModule, nil)
            linearModule = 0uL
            destroyShaderModule(device, radialModule, nil)
            radialModule = 0uL
            if sampledModule != 0uL {
                destroyShaderModule(device, sampledModule, nil)
                sampledModule = 0uL
            }
            if textVertexModule != 0uL {
                destroyShaderModule(device, textVertexModule, nil)
                textVertexModule = 0uL
            }
            if textFragmentModule != 0uL {
                destroyShaderModule(device, textFragmentModule, nil)
                textFragmentModule = 0uL
            }
            if textPaintFragmentModule != 0uL {
                destroyShaderModule(device, textPaintFragmentModule, nil)
                textPaintFragmentModule = 0uL
            }
            pipelineLayout = createdLayout
            createdLayout = 0uL
            solidPipeline = createdSolid
            createdSolid = 0uL
            linearPipeline = createdLinear
            createdLinear = 0uL
            radialPipeline = createdRadial
            createdRadial = 0uL
            sampledPipeline = createdSampled
            createdSampled = 0uL
            textPipelineLayout = createdTextLayout
            createdTextLayout = 0uL
            textPipeline = createdText
            createdText = 0uL
            textPaintPipeline = createdTextPaint
            createdTextPaint = 0uL
        } catch (error Exception) {
            let destroyPipeline = dispatch.vkDestroyPipeline
            if createdText != 0uL {
                destroyPipeline(device, createdText, nil)
            }
            if createdTextPaint != 0uL {
                destroyPipeline(device, createdTextPaint, nil)
            }
            if createdRadial != 0uL {
                destroyPipeline(device, createdRadial, nil)
            }
            if createdSampled != 0uL {
                destroyPipeline(device, createdSampled, nil)
            }
            if createdLinear != 0uL {
                destroyPipeline(device, createdLinear, nil)
            }
            if createdSolid != 0uL {
                destroyPipeline(device, createdSolid, nil)
            }
            if createdLayout != 0uL {
                let destroyPipelineLayout = dispatch.vkDestroyPipelineLayout
                destroyPipelineLayout(device, createdLayout, nil)
            }
            if createdTextLayout != 0uL {
                let destroyPipelineLayout = dispatch.vkDestroyPipelineLayout
                destroyPipelineLayout(device, createdTextLayout, nil)
            }
            let destroyShaderModule = dispatch.vkDestroyShaderModule
            if textFragmentModule != 0uL {
                destroyShaderModule(device, textFragmentModule, nil)
            }
            if textVertexModule != 0uL {
                destroyShaderModule(device, textVertexModule, nil)
            }
            if textPaintFragmentModule != 0uL {
                destroyShaderModule(device, textPaintFragmentModule, nil)
            }
            if radialModule != 0uL {
                destroyShaderModule(device, radialModule, nil)
            }
            if sampledModule != 0uL {
                destroyShaderModule(device, sampledModule, nil)
            }
            if linearModule != 0uL {
                destroyShaderModule(device, linearModule, nil)
            }
            if solidModule != 0uL {
                destroyShaderModule(device, solidModule, nil)
            }
            if vertexModule != 0uL {
                destroyShaderModule(device, vertexModule, nil)
            }
            throw error
        } finally {
            if entryPointStorage != nint(0) {
                Marshal.FreeCoTaskMem(entryPointStorage)
            }
        }
    }

    private func CreateShaderModule(fileName string) VkShaderModule {
        let path = Path.Combine(AppContext.BaseDirectory, "Vulkan", "Shaders", fileName)
        let code = File.ReadAllBytes(path)
        if code.Length == 0 || (code.Length & 3) != 0 {
            throw InvalidDataException("Invalid SPIR-V artifact: " + path)
        }
        let pin = GCHandle.Alloc(code, GCHandleType.Pinned)
        try {
            var createInfo = VkShaderModuleCreateInfo{}
            createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO
            createInfo.codeSize = nuint(code.Length)
            createInfo.pCode = *uint32(pin.AddrOfPinnedObject())
            var result VkShaderModule = 0uL
            let createShaderModule = dispatch.vkCreateShaderModule
            if createShaderModule(device, &createInfo, nil, &result) != VkConstants.VK_SUCCESS || result == 0uL {
                throw InvalidOperationException("vkCreateShaderModule failed: " + fileName)
            }
            return result
        } finally {
            pin.Free()
        }
    }

    private func CreatePipelineLayout() VkPipelineLayout {
        var pushRange = VkPushConstantRange{}
        pushRange.stageFlags = uint32(VkConstants.VK_SHADER_STAGE_VERTEX_BIT)
            | uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT)
        pushRange.offset = 0u
        pushRange.size = PushConstantSize
        var createInfo = VkPipelineLayoutCreateInfo{}
        createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO
        if imageResources != nil {
            var descriptorLayout VkDescriptorSetLayout = imageResources!!.DescriptorSetLayout
            if descriptorLayout == 0uL {
                throw InvalidOperationException("Vulkan sampled image descriptor layout is unavailable")
            }
            createInfo.setLayoutCount = 1u
            createInfo.pSetLayouts = &descriptorLayout
        }
        createInfo.pushConstantRangeCount = 1u
        createInfo.pPushConstantRanges = &pushRange
        var result VkPipelineLayout = 0uL
        let createPipelineLayout = dispatch.vkCreatePipelineLayout
        if createPipelineLayout(device, &createInfo, nil, &result) != VkConstants.VK_SUCCESS || result == 0uL {
            throw InvalidOperationException("vkCreatePipelineLayout failed")
        }
        return result
    }

    private func CreateTextPipelineLayout() VkPipelineLayout {
        if textAtlas == nil || textAtlas!!.DescriptorSetLayout == 0uL {
            throw InvalidOperationException("Vulkan text atlas descriptor layout is unavailable")
        }
        var descriptorLayout VkDescriptorSetLayout = textAtlas!!.DescriptorSetLayout
        var pushRange = VkPushConstantRange{}
        pushRange.stageFlags = uint32(VkConstants.VK_SHADER_STAGE_VERTEX_BIT)
            | uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT)
        pushRange.offset = 0u
        pushRange.size = TextPushConstantSize
        var createInfo = VkPipelineLayoutCreateInfo{}
        createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO
        createInfo.setLayoutCount = 1u
        createInfo.pSetLayouts = &descriptorLayout
        createInfo.pushConstantRangeCount = 1u
        createInfo.pPushConstantRanges = &pushRange
        var result VkPipelineLayout = 0uL
        let createPipelineLayout = dispatch.vkCreatePipelineLayout
        if createPipelineLayout(device, &createInfo, nil, &result) != VkConstants.VK_SUCCESS || result == 0uL {
            throw InvalidOperationException("vkCreatePipelineLayout failed for Vulkan text")
        }
        return result
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

        var pipelineColorFormat = targetFormat
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
        if createGraphicsPipelines(device, 0uL, 1u, &createInfo, nil, &result) != VkConstants.VK_SUCCESS || result == 0uL {
            throw InvalidOperationException("vkCreateGraphicsPipelines failed")
        }
        return result
    }

}
