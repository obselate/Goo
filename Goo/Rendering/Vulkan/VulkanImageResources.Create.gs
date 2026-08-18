package Goo

import System

internal unsafe partial class VulkanImageResources : IDisposable {
    private func CreateGeneration() {
        var layoutBinding = VkDescriptorSetLayoutBinding{}
        layoutBinding.binding = 0u
        layoutBinding.descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER
        layoutBinding.descriptorCount = 1u
        layoutBinding.stageFlags = uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT)
        var layoutInfo = VkDescriptorSetLayoutCreateInfo{}
        layoutInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO
        layoutInfo.bindingCount = 1u
        layoutInfo.pBindings = &layoutBinding
        let createLayout = dispatch.vkCreateDescriptorSetLayout
        if createLayout(device, &layoutInfo, nil, &descriptorSetLayout) != VkConstants.VK_SUCCESS
            || descriptorSetLayout == 0uL {
            throw InvalidOperationException("vkCreateDescriptorSetLayout failed")
        }
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyLayout = dispatch.vkDestroyDescriptorSetLayout
            destroyLayout(device, descriptorSetLayout, nil)
            descriptorSetLayout = 0uL
            throw error
        }
        poolSizes[0] = VkDescriptorPoolSize{}
        poolSizes[0]._type = VkConstants.VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER
        poolSizes[0].descriptorCount = uint32(descriptorCapacity)
        var poolInfo = VkDescriptorPoolCreateInfo{}
        poolInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO
        poolInfo.maxSets = uint32(descriptorCapacity)
        poolInfo.poolSizeCount = 1u
        poolInfo.pPoolSizes = &poolSizes[0]
        let createPool = dispatch.vkCreateDescriptorPool
        if createPool(device, &poolInfo, nil, &descriptorPool) != VkConstants.VK_SUCCESS
            || descriptorPool == 0uL {
            DestroyGeneration()
            throw InvalidOperationException("vkCreateDescriptorPool failed")
        }
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyPool = dispatch.vkDestroyDescriptorPool
            destroyPool(device, descriptorPool, nil)
            descriptorPool = 0uL
            DestroyGeneration()
            throw error
        }
        var descriptorIndex int32 = 0
        while descriptorIndex < descriptorCapacity {
            descriptorLayouts[descriptorIndex] = descriptorSetLayout
            descriptorIndex++
        }
        var allocateInfo = VkDescriptorSetAllocateInfo{}
        allocateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO
        allocateInfo.descriptorPool = descriptorPool
        allocateInfo.descriptorSetCount = uint32(descriptorCapacity)
        allocateInfo.pSetLayouts = &descriptorLayouts[0]
        let allocateSets = dispatch.vkAllocateDescriptorSets
        if allocateSets(device, &allocateInfo, &descriptorSets[0]) != VkConstants.VK_SUCCESS {
            DestroyGeneration()
            throw InvalidOperationException("vkAllocateDescriptorSets failed")
        }
        try {
            while trackedDescriptorSetCount < descriptorCapacity {
                if let accounting = objectAccounting {
                    accounting.Allocate()
                }
                trackedDescriptorSetCount = trackedDescriptorSetCount + 1
            }
        } catch (error Exception) {
            DestroyGeneration()
            throw error
        }
        nearestSampler = CreateSampler(VkConstants.VK_FILTER_NEAREST)
        linearSampler = CreateSampler(VkConstants.VK_FILTER_LINEAR)
    }

    private func CreateSampler(filter VkFilter) VkSampler {
        var samplerInfo = VkSamplerCreateInfo{}
        samplerInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SAMPLER_CREATE_INFO
        samplerInfo.magFilter = filter
        samplerInfo.minFilter = filter
        samplerInfo.mipmapMode = VkConstants.VK_SAMPLER_MIPMAP_MODE_NEAREST
        samplerInfo.addressModeU = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
        samplerInfo.addressModeV = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
        samplerInfo.addressModeW = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
        samplerInfo.maxLod = 1.0F
        samplerInfo.borderColor = VkConstants.VK_BORDER_COLOR_FLOAT_TRANSPARENT_BLACK
        let createSampler = dispatch.vkCreateSampler
        var sampler VkSampler = 0uL
        if createSampler(device, &samplerInfo, nil, &sampler) != VkConstants.VK_SUCCESS || sampler == 0uL {
            throw InvalidOperationException("vkCreateSampler failed")
        }
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroySampler = dispatch.vkDestroySampler
            destroySampler(device, sampler, nil)
            throw error
        }
        return sampler
    }

    private func CreateStagingBuffer() {
        var bufferInfo = VkBufferCreateInfo{}
        bufferInfo.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO
        bufferInfo.size = stagingByteCapacity
        bufferInfo.usage = uint32(VkConstants.VK_BUFFER_USAGE_TRANSFER_SRC_BIT)
        bufferInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
        let createBuffer = dispatch.vkCreateBuffer
        if createBuffer(device, &bufferInfo, nil, &stagingBuffer) != VkConstants.VK_SUCCESS
            || stagingBuffer == 0uL {
            throw InvalidOperationException("vkCreateBuffer failed")
        }
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyBuffer = dispatch.vkDestroyBuffer
            destroyBuffer(device, stagingBuffer, nil)
            stagingBuffer = 0uL
            throw error
        }
        stagingAllocation = allocator.AllocateBuffer(stagingBuffer,
            uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT),
            uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)
                | uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_CACHED_BIT))
        if allocator.Map(stagingAllocation!!) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkMapMemory failed")
        }
    }

    private func CreateImage(
        index int32,
        id ResourceId,
        width uint32,
        height uint32,
        bytes VkDeviceSize,
        source VulkanResourceSource,
        cacheable bool,
        samplerId ResourceId,
        samplerMode VulkanImageSamplerMode,
        priorLogical VulkanLogicalResource?) {
        EnsureDescriptorSlots(index)
        var imageInfo = VkImageCreateInfo{}
        imageInfo.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO
        imageInfo.imageType = VkConstants.VK_IMAGE_TYPE_2D
        imageInfo.format = VkConstants.VK_FORMAT_R8G8B8A8_SRGB
        imageInfo.extent = VkExtent3D{}
        imageInfo.extent.width = width
        imageInfo.extent.height = height
        imageInfo.extent.depth = 1u
        imageInfo.mipLevels = 1u
        imageInfo.arrayLayers = 1u
        imageInfo.samples = VkConstants.VK_SAMPLE_COUNT_1_BIT
        imageInfo.tiling = VkConstants.VK_IMAGE_TILING_OPTIMAL
        imageInfo.usage = uint32(VkConstants.VK_IMAGE_USAGE_TRANSFER_DST_BIT)
            | uint32(VkConstants.VK_IMAGE_USAGE_SAMPLED_BIT)
        imageInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
        imageInfo.initialLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
        var image VkImage = 0uL
        let createImage = dispatch.vkCreateImage
        if createImage(device, &imageInfo, nil, &image) != VkConstants.VK_SUCCESS || image == 0uL {
            throw InvalidOperationException("vkCreateImage failed")
        }
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyImage = dispatch.vkDestroyImage
            destroyImage(device, image, nil)
            throw error
        }
        var allocation VulkanMemoryAllocation? = nil
        var view VkImageView = 0uL
        var registration VulkanResourceRegistration{}
        try {
            allocation = allocator.AllocateImage(image,
                uint32(VkConstants.VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT), 0u)
            var viewInfo = VkImageViewCreateInfo{}
            viewInfo.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO
            viewInfo.image = image
            viewInfo.viewType = VkConstants.VK_IMAGE_VIEW_TYPE_2D
            viewInfo.format = VkConstants.VK_FORMAT_R8G8B8A8_SRGB
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
            if createView(device, &viewInfo, nil, &view) != VkConstants.VK_SUCCESS || view == 0uL {
                throw InvalidOperationException("vkCreateImageView failed")
            }
            try {
                if let accounting = objectAccounting {
                    accounting.Allocate()
                }
            } catch (error Exception) {
                let destroyView = dispatch.vkDestroyImageView
                destroyView(device, view, nil)
                view = 0uL
                throw error
            }
            EnsureRegistryPublication(bytes)
            registration = registry.Register(id, bytes, source, cacheable)
            entries[index] = VulkanImageResourceEntry{
                Id: id,
                ProviderId: source.ProviderId,
                SourceId: source.SourceId,
                Width: width,
                Height: height,
                Bytes: bytes,
                SamplerId: samplerId,
                SamplerMode: samplerMode,
                Cacheable: cacheable,
                State: VulkanImageResourceState.Resident,
                GpuPublished: false,
                Image: image,
                ImageView: view,
                Allocation: allocation,
                NearestDescriptor: VulkanImageDescriptorBinding{},
                LinearDescriptor: VulkanImageDescriptorBinding{},
                ImageLayout: VkConstants.VK_IMAGE_LAYOUT_UNDEFINED,
                UploadedVersion: 0uL,
                Upload: VulkanUploadReservation{},
                UploadRecorded: false,
                UploadSubmitted: false,
                UploadCommandBuffer: 0uL,
                UploadFence: 0uL,
                PendingRetire: false,
                DropLogicalOnRetire: false,
                RecordingUseCount: 0,
                LastUseFence: 0uL,
                RetireFence: 0uL,
                LastTouch: TouchValue(),
            }
            liveCount++
            residentBytes += bytes
        } catch (error Exception) {
            var rollbackSucceeded = true
            if registration.Accepted {
                rollbackSucceeded = RollbackRegistration(id, registration, priorLogical)
            }
            if view != 0uL {
                let destroyView = dispatch.vkDestroyImageView
                destroyView(device, view, nil)
                if let accounting = objectAccounting {
                    accounting.Release()
                }
            }
            let destroyImage = dispatch.vkDestroyImage
            destroyImage(device, image, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            if allocation != nil {
                allocator.Release(allocation!!)
            }
            if !rollbackSucceeded {
                throw InvalidOperationException("Vulkan image registry rollback failed")
            }
            throw error
        }
    }

    private func BindDescriptorSet(
        index int32,
        id ResourceId,
        samplerId ResourceId,
        view VkImageView,
        samplerMode VulkanImageSamplerMode) VulkanImageDescriptorBinding {
        let sampler = if samplerMode == VulkanImageSamplerMode.Nearest { nearestSampler } else { linearSampler }
        let slot = DescriptorSlot(index, samplerMode)
        if slot < 0 || slot >= descriptorCapacity || descriptorSets[slot] == 0uL {
            throw InvalidOperationException("Vulkan image descriptor capacity reached")
        }
        let existing = if samplerMode == VulkanImageSamplerMode.Nearest {
            entries[index].NearestDescriptor
        } else {
            entries[index].LinearDescriptor
        }
        if existing.State != VulkanImageDescriptorState.Empty {
            throw InvalidOperationException("Vulkan image descriptor is still in use")
        }
        let token = uint64(view)
        var imageInfo = VkDescriptorImageInfo{}
        imageInfo.sampler = sampler
        imageInfo.imageView = view
        imageInfo.imageLayout = VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL
        var write = VkWriteDescriptorSet{}
        write.sType = VkConstants.VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET
        write.dstSet = descriptorSets[slot]
        write.dstBinding = 0u
        write.descriptorCount = 1u
        write.descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER
        write.pImageInfo = &imageInfo
        let update = dispatch.vkUpdateDescriptorSets
        update(device, 1u, &write, 0u, nil)
        return VulkanImageDescriptorBinding{
            State: VulkanImageDescriptorState.Bound,
            ImageId: id,
            SamplerId: samplerId,
            SamplerMode: samplerMode,
            Generation: generation,
            Slot: slot,
            DescriptorToken: token,
            RetireFence: 0uL,
        }
    }

}
