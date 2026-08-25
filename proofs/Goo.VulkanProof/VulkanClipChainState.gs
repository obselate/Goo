package Goo.VulkanProof

import System
import Goo.Vulkan.Generated

internal unsafe sealed class VulkanClipChainState : IDisposable {
    private const ClipBufferBytes VkDeviceSize = 1024uL
    private const ClipBufferWordCount int32 = 256

    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let allocator VulkanMemoryAllocator
    private var emptySetLayout VkDescriptorSetLayout
    private var descriptorSetLayout VkDescriptorSetLayout
    private var descriptorPool VkDescriptorPool
    private var descriptorSet VkDescriptorSet
    private var image VkImage
    private var imageView VkImageView
    private var sampler VkSampler
    private var clipBuffer VkBuffer
    private var clipImageAllocation VulkanMemoryAllocation? = nil
    private var clipAllocation VulkanMemoryAllocation? = nil
    private var prepared bool
    private var disposed bool

    internal prop EmptySetLayout VkDescriptorSetLayout { get { return emptySetLayout } }
    internal prop DescriptorSetLayout VkDescriptorSetLayout { get { return descriptorSetLayout } }
    internal prop LiveObjectCount uint32 {
        get {
            var count uint32 = 0u
            if emptySetLayout != 0uL { count++ }
            if descriptorSetLayout != 0uL { count++ }
            if descriptorPool != 0uL { count++ }
            if descriptorSet != 0uL { count++ }
            if image != 0uL { count++ }
            if imageView != 0uL { count++ }
            if sampler != 0uL { count++ }
            if clipBuffer != 0uL { count++ }
            return count
        }
    }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        nativeAllocator VulkanMemoryAllocator) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan device is null", "nativeDevice")
        }
        if nativeAllocator == nil {
            throw ArgumentNullException("nativeAllocator")
        }
        device = nativeDevice
        dispatch = nativeDispatch
        allocator = nativeAllocator
        Create()
    }

    internal func RecordPrepare(commandBuffer VkCommandBuffer, drawCount int32) {
        EnsureOpen()
        if commandBuffer == nint(0) {
            throw ArgumentException("Command buffer is null", "commandBuffer")
        }
        if drawCount < 0 || uint64(drawCount) > uint64(ClipBufferWordCount - 4) / 12uL {
            throw ArgumentOutOfRangeException("drawCount")
        }
        if prepared {
            return
        }
        let words = *uint32(nint(clipAllocation!!.mapped))
        words[0] = uint32(drawCount)
        words[1] = uint32(4uL + uint64(drawCount) * 12uL)
        words[2] = 0u
        words[3] = 0u
        let flushResult = allocator.FlushBeforeSubmit(clipAllocation!!, 0uL, ClipBufferBytes)
        if flushResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkFlushMappedMemoryRanges failed for Vulkan clip chain")
        }

        var subresourceRange = VkImageSubresourceRange{}
        subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
        subresourceRange.baseMipLevel = 0u
        subresourceRange.levelCount = 1u
        subresourceRange.baseArrayLayer = 0u
        subresourceRange.layerCount = 1u

        var imageBarrier = VkImageMemoryBarrier2{}
        imageBarrier.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
        imageBarrier.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT
        imageBarrier.srcAccessMask = VkConstants.VK_ACCESS_2_NONE
        imageBarrier.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
        imageBarrier.dstAccessMask = VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT
        imageBarrier.oldLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
        imageBarrier.newLayout = VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL
        imageBarrier.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        imageBarrier.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        imageBarrier.image = image
        imageBarrier.subresourceRange = subresourceRange

        var bufferBarrier = VkBufferMemoryBarrier2{}
        bufferBarrier.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_MEMORY_BARRIER_2
        bufferBarrier.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_HOST_BIT
        bufferBarrier.srcAccessMask = VkConstants.VK_ACCESS_2_HOST_WRITE_BIT
        bufferBarrier.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
        bufferBarrier.dstAccessMask = VkConstants.VK_ACCESS_2_SHADER_STORAGE_READ_BIT
        bufferBarrier.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        bufferBarrier.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        bufferBarrier.buffer = clipBuffer
        bufferBarrier.offset = 0uL
        bufferBarrier.size = ClipBufferBytes

        var dependency = VkDependencyInfo{}
        dependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
        dependency.bufferMemoryBarrierCount = 1u
        dependency.pBufferMemoryBarriers = &bufferBarrier
        dependency.imageMemoryBarrierCount = 1u
        dependency.pImageMemoryBarriers = &imageBarrier
        let pipelineBarrier = dispatch.vkCmdPipelineBarrier2
        pipelineBarrier(commandBuffer, &dependency)
        prepared = true
    }

    internal func BindDescriptor(commandBuffer VkCommandBuffer, pipelineLayout VkPipelineLayout) {
        EnsureOpen()
        if commandBuffer == nint(0) || pipelineLayout == 0uL {
            throw ArgumentException("Vulkan clip chain descriptor binding arguments are invalid")
        }
        if !prepared {
            throw InvalidOperationException("Vulkan clip chain must be prepared before binding")
        }
        if descriptorSet == 0uL {
            throw InvalidOperationException("Vulkan clip chain descriptor set is unavailable")
        }
        let bindDescriptorSets = dispatch.vkCmdBindDescriptorSets
        bindDescriptorSets(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS,
            pipelineLayout, 1u, 1u, &descriptorSet, 0u, nil)
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        if descriptorPool != 0uL {
            let destroyPool = dispatch.vkDestroyDescriptorPool
            destroyPool(device, descriptorPool, nil)
            descriptorPool = 0uL
            descriptorSet = 0uL
        }
        if descriptorSetLayout != 0uL {
            let destroyLayout = dispatch.vkDestroyDescriptorSetLayout
            destroyLayout(device, descriptorSetLayout, nil)
            descriptorSetLayout = 0uL
        }
        if emptySetLayout != 0uL {
            let destroyLayout = dispatch.vkDestroyDescriptorSetLayout
            destroyLayout(device, emptySetLayout, nil)
            emptySetLayout = 0uL
        }
        if sampler != 0uL {
            let destroySampler = dispatch.vkDestroySampler
            destroySampler(device, sampler, nil)
            sampler = 0uL
        }
        if imageView != 0uL {
            let destroyImageView = dispatch.vkDestroyImageView
            destroyImageView(device, imageView, nil)
            imageView = 0uL
        }
        if image != 0uL {
            let destroyImage = dispatch.vkDestroyImage
            destroyImage(device, image, nil)
            image = 0uL
        }
        if clipBuffer != 0uL {
            let destroyBuffer = dispatch.vkDestroyBuffer
            destroyBuffer(device, clipBuffer, nil)
            clipBuffer = 0uL
        }
        if clipAllocation != nil {
            allocator.Release(clipAllocation!!)
            clipAllocation = nil
        }
        if clipImageAllocation != nil {
            allocator.Release(clipImageAllocation!!)
            clipImageAllocation = nil
        }
    }

    deinit {
        Dispose()
    }

    private func Create() {
        try {
            CreateSetLayouts()
            CreateClipImage()
            CreateClipBuffer()
            CreateSampler()
            CreateDescriptorResources()
        } catch (error Exception) {
            Dispose()
            throw error
        }
    }

    private func CreateSetLayouts() {
        var emptyLayoutInfo = VkDescriptorSetLayoutCreateInfo{}
        emptyLayoutInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO
        let createLayout = dispatch.vkCreateDescriptorSetLayout
        if createLayout(device, &emptyLayoutInfo, nil, &emptySetLayout) != VkConstants.VK_SUCCESS
            || emptySetLayout == 0uL {
            throw InvalidOperationException("vkCreateDescriptorSetLayout failed for empty Vulkan clip set")
        }

        let bindings *VkDescriptorSetLayoutBinding = stackalloc [2]VkDescriptorSetLayoutBinding
        bindings[0] = VkDescriptorSetLayoutBinding{}
        bindings[0].binding = 0u
        bindings[0].descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER
        bindings[0].descriptorCount = 1u
        bindings[0].stageFlags = uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT)
        bindings[1] = VkDescriptorSetLayoutBinding{}
        bindings[1].binding = 1u
        bindings[1].descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_STORAGE_BUFFER
        bindings[1].descriptorCount = 1u
        bindings[1].stageFlags = uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT)
        var layoutInfo = VkDescriptorSetLayoutCreateInfo{}
        layoutInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO
        layoutInfo.bindingCount = 2u
        layoutInfo.pBindings = bindings
        if createLayout(device, &layoutInfo, nil, &descriptorSetLayout) != VkConstants.VK_SUCCESS
            || descriptorSetLayout == 0uL {
            throw InvalidOperationException("vkCreateDescriptorSetLayout failed for Vulkan clip chain")
        }
    }

    private func CreateClipImage() {
        var imageInfo = VkImageCreateInfo{}
        imageInfo.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO
        imageInfo.imageType = VkConstants.VK_IMAGE_TYPE_2D
        imageInfo.format = VkConstants.VK_FORMAT_R8G8B8A8_UNORM
        imageInfo.extent = VkExtent3D{}
        imageInfo.extent.width = 1u
        imageInfo.extent.height = 1u
        imageInfo.extent.depth = 1u
        imageInfo.mipLevels = 1u
        imageInfo.arrayLayers = 1u
        imageInfo.samples = VkConstants.VK_SAMPLE_COUNT_1_BIT
        imageInfo.tiling = VkConstants.VK_IMAGE_TILING_OPTIMAL
        imageInfo.usage = uint32(VkConstants.VK_IMAGE_USAGE_SAMPLED_BIT)
        imageInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
        imageInfo.initialLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
        let createImage = dispatch.vkCreateImage
        if createImage(device, &imageInfo, nil, &image) != VkConstants.VK_SUCCESS || image == 0uL {
            throw InvalidOperationException("vkCreateImage failed for Vulkan clip mask atlas")
        }
        clipImageAllocation = allocator.AllocateImage(image,
            uint32(VkConstants.VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT), 0u)

        var viewInfo = VkImageViewCreateInfo{}
        viewInfo.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO
        viewInfo.image = image
        viewInfo.viewType = VkConstants.VK_IMAGE_VIEW_TYPE_2D_ARRAY
        viewInfo.format = VkConstants.VK_FORMAT_R8G8B8A8_UNORM
        viewInfo.components = VkComponentMapping{}
        viewInfo.components.r = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
        viewInfo.components.g = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
        viewInfo.components.b = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
        viewInfo.components.a = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
        viewInfo.subresourceRange = VkImageSubresourceRange{}
        viewInfo.subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
        viewInfo.subresourceRange.levelCount = 1u
        viewInfo.subresourceRange.layerCount = 1u
        let createView = dispatch.vkCreateImageView
        if createView(device, &viewInfo, nil, &imageView) != VkConstants.VK_SUCCESS || imageView == 0uL {
            throw InvalidOperationException("vkCreateImageView failed for Vulkan clip mask atlas")
        }
    }

    private func CreateClipBuffer() {
        var bufferInfo = VkBufferCreateInfo{}
        bufferInfo.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO
        bufferInfo.size = ClipBufferBytes
        bufferInfo.usage = uint32(VkConstants.VK_BUFFER_USAGE_STORAGE_BUFFER_BIT)
        bufferInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
        let createBuffer = dispatch.vkCreateBuffer
        if createBuffer(device, &bufferInfo, nil, &clipBuffer) != VkConstants.VK_SUCCESS || clipBuffer == 0uL {
            throw InvalidOperationException("vkCreateBuffer failed for Vulkan clip chain")
        }
        clipAllocation = allocator.AllocateBuffer(clipBuffer,
            uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT),
            uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)
                | uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_CACHED_BIT))
        if allocator.Map(clipAllocation!!) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkMapMemory failed for Vulkan clip chain")
        }
        let words = *uint32(nint(clipAllocation!!.mapped))
        var index int32 = 0
        while index < ClipBufferWordCount {
            words[index] = 0u
            index++
        }
    }

    private func CreateSampler() {
        var samplerInfo = VkSamplerCreateInfo{}
        samplerInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SAMPLER_CREATE_INFO
        samplerInfo.magFilter = VkConstants.VK_FILTER_NEAREST
        samplerInfo.minFilter = VkConstants.VK_FILTER_NEAREST
        samplerInfo.mipmapMode = VkConstants.VK_SAMPLER_MIPMAP_MODE_NEAREST
        samplerInfo.addressModeU = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
        samplerInfo.addressModeV = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
        samplerInfo.addressModeW = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
        samplerInfo.maxLod = 1.0F
        samplerInfo.borderColor = VkConstants.VK_BORDER_COLOR_FLOAT_TRANSPARENT_BLACK
        let createSampler = dispatch.vkCreateSampler
        if createSampler(device, &samplerInfo, nil, &sampler) != VkConstants.VK_SUCCESS || sampler == 0uL {
            throw InvalidOperationException("vkCreateSampler failed for Vulkan clip mask atlas")
        }
    }

    private func CreateDescriptorResources() {
        let poolSizes *VkDescriptorPoolSize = stackalloc [2]VkDescriptorPoolSize
        poolSizes[0] = VkDescriptorPoolSize{}
        poolSizes[0]._type = VkConstants.VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER
        poolSizes[0].descriptorCount = 1u
        poolSizes[1] = VkDescriptorPoolSize{}
        poolSizes[1]._type = VkConstants.VK_DESCRIPTOR_TYPE_STORAGE_BUFFER
        poolSizes[1].descriptorCount = 1u
        var poolInfo = VkDescriptorPoolCreateInfo{}
        poolInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO
        poolInfo.maxSets = 1u
        poolInfo.poolSizeCount = 2u
        poolInfo.pPoolSizes = poolSizes
        let createPool = dispatch.vkCreateDescriptorPool
        if createPool(device, &poolInfo, nil, &descriptorPool) != VkConstants.VK_SUCCESS
            || descriptorPool == 0uL {
            throw InvalidOperationException("vkCreateDescriptorPool failed for Vulkan clip chain")
        }

        var allocateInfo = VkDescriptorSetAllocateInfo{}
        allocateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO
        allocateInfo.descriptorPool = descriptorPool
        allocateInfo.descriptorSetCount = 1u
        allocateInfo.pSetLayouts = &descriptorSetLayout
        let allocateSets = dispatch.vkAllocateDescriptorSets
        if allocateSets(device, &allocateInfo, &descriptorSet) != VkConstants.VK_SUCCESS || descriptorSet == 0uL {
            throw InvalidOperationException("vkAllocateDescriptorSets failed for Vulkan clip chain")
        }

        var imageInfo = VkDescriptorImageInfo{}
        imageInfo.sampler = sampler
        imageInfo.imageView = imageView
        imageInfo.imageLayout = VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL
        var bufferInfo = VkDescriptorBufferInfo{}
        bufferInfo.buffer = clipBuffer
        bufferInfo.offset = 0uL
        bufferInfo._range = ClipBufferBytes
        let writes *VkWriteDescriptorSet = stackalloc [2]VkWriteDescriptorSet
        writes[0] = VkWriteDescriptorSet{}
        writes[0].sType = VkConstants.VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET
        writes[0].dstSet = descriptorSet
        writes[0].dstBinding = 0u
        writes[0].descriptorCount = 1u
        writes[0].descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER
        writes[0].pImageInfo = &imageInfo
        writes[1] = VkWriteDescriptorSet{}
        writes[1].sType = VkConstants.VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET
        writes[1].dstSet = descriptorSet
        writes[1].dstBinding = 1u
        writes[1].descriptorCount = 1u
        writes[1].descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_STORAGE_BUFFER
        writes[1].pBufferInfo = &bufferInfo
        let updateDescriptors = dispatch.vkUpdateDescriptorSets
        updateDescriptors(device, 2u, writes, 0u, nil)
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanClipChainState")
        }
    }
}
