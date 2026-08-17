package Goo.VulkanProof

import System
import Goo.Vulkan.Generated

internal data struct VulkanTextAtlasStats {
    var ByteSize VkDeviceSize
    var TexelCount VkDeviceSize
    var Buffer VkBuffer
    var BufferView VkBufferView
    var DescriptorSetLayout VkDescriptorSetLayout
    var DescriptorSet VkDescriptorSet
    var UploadPending bool
    var UploadRecorded bool
    var UploadSubmitted bool
    var Uploaded bool
    var UploadFence uint64
}

internal unsafe class VulkanTextAtlas : IDisposable {
    private const AtlasTexelBytes VkDeviceSize = 8uL
    private const MaxAtlasBytes VkDeviceSize = 2147483647uL

    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let allocator VulkanMemoryAllocator
    private let byteSize VkDeviceSize
    private var atlasBuffer VkBuffer = 0uL
    private var atlasAllocation VulkanMemoryAllocation? = nil
    private var atlasBufferView VkBufferView = 0uL
    private var stagingBuffer VkBuffer = 0uL
    private var stagingAllocation VulkanMemoryAllocation? = nil
    private var descriptorSetLayout VkDescriptorSetLayout = 0uL
    private var descriptorPool VkDescriptorPool = 0uL
    private var descriptorSet VkDescriptorSet = 0uL
    private var uploadCommandBuffer VkCommandBuffer = nint(0)
    private var uploadFence uint64 = 0uL
    private var uploadPending bool
    private var uploadRecorded bool
    private var uploadSubmitted bool
    private var uploaded bool
    private var flushPrepared bool
    private var disposed bool

    internal prop ByteSize VkDeviceSize { get { return byteSize } }
    internal prop TexelCount VkDeviceSize { get { return byteSize / AtlasTexelBytes } }
    internal prop Buffer VkBuffer { get { return atlasBuffer } }
    internal prop BufferView VkBufferView { get { return atlasBufferView } }
    internal prop DescriptorSetLayout VkDescriptorSetLayout { get { return descriptorSetLayout } }
    internal prop DescriptorSet VkDescriptorSet { get { return descriptorSet } }
    internal prop UploadPending bool { get { return uploadPending } }
    internal prop IsUploaded bool { get { return uploaded } }
    internal prop Stats VulkanTextAtlasStats {
        get {
            return VulkanTextAtlasStats{
                ByteSize: byteSize,
                TexelCount: byteSize / AtlasTexelBytes,
                Buffer: atlasBuffer,
                BufferView: atlasBufferView,
                DescriptorSetLayout: descriptorSetLayout,
                DescriptorSet: descriptorSet,
                UploadPending: uploadPending,
                UploadRecorded: uploadRecorded,
                UploadSubmitted: uploadSubmitted,
                Uploaded: uploaded,
                UploadFence: uploadFence,
            }
        }
    }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        nativeAllocator VulkanMemoryAllocator,
        atlasByteSize VkDeviceSize,
        nativeMaxTexelBufferElements uint32) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan device is null", "nativeDevice")
        }
        if atlasByteSize == 0uL || atlasByteSize > MaxAtlasBytes
            || (atlasByteSize % AtlasTexelBytes) != 0uL
            || nativeMaxTexelBufferElements == 0u
            || (atlasByteSize / AtlasTexelBytes) > uint64(nativeMaxTexelBufferElements) {
            throw ArgumentOutOfRangeException("atlasByteSize")
        }
        device = nativeDevice
        dispatch = nativeDispatch
        allocator = nativeAllocator
        byteSize = atlasByteSize
        try {
            CreateAtlasBuffer()
            CreateBufferView()
            CreateDescriptorResources()
            CreateStagingBuffer()
        } catch (error Exception) {
            DestroyStagingBuffer()
            DestroyDescriptorResources()
            DestroyBufferView()
            DestroyAtlasBuffer()
            throw error
        }
    }

    internal func QueueUpload(source *uint8, sourceByteCount VkDeviceSize) bool {
        EnsureOpen()
        if source == nil {
            throw ArgumentNullException("source")
        }
        if sourceByteCount != byteSize {
            throw ArgumentException("Text atlas upload byte count does not match the atlas", "sourceByteCount")
        }
        if uploaded || uploadPending {
            throw InvalidOperationException("Vulkan text atlas has already been uploaded")
        }
        let destination = *uint8(nint(stagingAllocation!!.mapped))
        var byteIndex int32 = 0
        while byteIndex < int32(byteSize) {
            destination[byteIndex] = source[byteIndex]
            byteIndex++
        }
        uploadPending = true
        uploadRecorded = false
        uploadSubmitted = false
        uploadCommandBuffer = nint(0)
        uploadFence = 0uL
        flushPrepared = false
        return true
    }

    internal func RecordUpload(commandBuffer VkCommandBuffer) {
        EnsureOpen()
        if commandBuffer == nint(0) {
            throw ArgumentException("Command buffer is null", "commandBuffer")
        }
        if !uploadPending {
            throw InvalidOperationException("Vulkan text atlas has no pending upload")
        }
        if uploadSubmitted {
            throw InvalidOperationException("Vulkan text atlas upload has already been submitted")
        }
        if uploadRecorded {
            if uploadCommandBuffer != commandBuffer {
                throw InvalidOperationException("Vulkan text atlas upload is recorded into another command buffer")
            }
            return
        }
        var copy = VkBufferCopy{}
        copy.srcOffset = 0uL
        copy.dstOffset = 0uL
        copy.size = byteSize
        let copyBuffer = dispatch.vkCmdCopyBuffer
        copyBuffer(commandBuffer, stagingBuffer, atlasBuffer, 1u, &copy)

        var barrier = VkBufferMemoryBarrier2{}
        barrier.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_MEMORY_BARRIER_2
        barrier.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TRANSFER_BIT
        barrier.srcAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT
        barrier.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
        barrier.dstAccessMask = VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT
        barrier.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        barrier.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
        barrier.buffer = atlasBuffer
        barrier.offset = 0uL
        barrier.size = byteSize
        var dependency = VkDependencyInfo{}
        dependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
        dependency.bufferMemoryBarrierCount = 1u
        dependency.pBufferMemoryBarriers = &barrier
        let pipelineBarrier = dispatch.vkCmdPipelineBarrier2
        pipelineBarrier(commandBuffer, &dependency)
        uploadCommandBuffer = commandBuffer
        uploadRecorded = true
    }

    internal func FlushBeforeSubmit() VkResult {
        EnsureOpen()
        if !uploadPending || flushPrepared {
            return VkConstants.VK_SUCCESS
        }
        let result = allocator.FlushBeforeSubmit(stagingAllocation!!)
        if result == VkConstants.VK_SUCCESS {
            flushPrepared = true
        }
        return result
    }

    internal func MarkSubmitted(commandBuffer VkCommandBuffer, fence uint64) {
        EnsureOpen()
        if commandBuffer == nint(0) || fence == 0uL {
            throw ArgumentException("Text atlas submission arguments are invalid")
        }
        if !uploadPending || !uploadRecorded || uploadCommandBuffer != commandBuffer {
            throw InvalidOperationException("Vulkan text atlas upload is not recorded for this command buffer")
        }
        if !flushPrepared {
            throw InvalidOperationException("Vulkan text atlas upload must be flushed before submit")
        }
        if uploadSubmitted {
            if uploadFence != fence {
                throw InvalidOperationException("Vulkan text atlas upload fence changed")
            }
            return
        }
        uploadSubmitted = true
        uploadFence = fence
    }

    internal func Collect(completedFence uint64) bool {
        EnsureOpen()
        if !uploadSubmitted || uploadFence > completedFence {
            return false
        }
        uploadPending = false
        uploadRecorded = false
        uploadSubmitted = false
        uploaded = true
        uploadCommandBuffer = nint(0)
        uploadFence = 0uL
        flushPrepared = false
        return true
    }

    internal func AbortUpload(commandBuffer VkCommandBuffer) bool {
        EnsureOpen()
        if !uploadPending {
            return false
        }
        if uploadSubmitted {
            throw InvalidOperationException("Vulkan text atlas upload has already been submitted")
        }
        if uploadRecorded && uploadCommandBuffer != commandBuffer {
            throw InvalidOperationException("Vulkan text atlas upload belongs to another command buffer")
        }
        uploadPending = false
        uploadRecorded = false
        uploadCommandBuffer = nint(0)
        uploadFence = 0uL
        flushPrepared = false
        return true
    }

    internal func BindDescriptor(commandBuffer VkCommandBuffer, pipelineLayout VkPipelineLayout) {
        EnsureOpen()
        if commandBuffer == nint(0) || pipelineLayout == 0uL {
            throw ArgumentException("Text atlas descriptor binding arguments are invalid")
        }
        if !uploaded && (!uploadPending || !uploadRecorded || uploadCommandBuffer != commandBuffer) {
            throw InvalidOperationException("Vulkan text atlas upload is not ready for this command buffer")
        }
        if descriptorSet == 0uL {
            throw InvalidOperationException("Vulkan text atlas descriptor set is unavailable")
        }
        let bindDescriptorSets = dispatch.vkCmdBindDescriptorSets
        bindDescriptorSets(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS,
            pipelineLayout, 0u, 1u, &descriptorSet, 0u, nil)
    }

    public func Dispose() {
        if disposed {
            return
        }
        if uploadSubmitted || (uploadPending && uploadRecorded) {
            throw InvalidOperationException("Vulkan text atlas still has in-flight upload work")
        }
        disposed = true
        DestroyStagingBuffer()
        DestroyDescriptorResources()
        DestroyBufferView()
        DestroyAtlasBuffer()
    }

    deinit {
        try {
            Dispose()
        } catch (error Exception) {
        }
    }

    private func CreateAtlasBuffer() {
        var bufferInfo = VkBufferCreateInfo{}
        bufferInfo.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO
        bufferInfo.size = byteSize
        bufferInfo.usage = uint32(VkConstants.VK_BUFFER_USAGE_TRANSFER_DST_BIT)
            | uint32(VkConstants.VK_BUFFER_USAGE_UNIFORM_TEXEL_BUFFER_BIT)
        bufferInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
        let createBuffer = dispatch.vkCreateBuffer
        if createBuffer(device, &bufferInfo, nil, &atlasBuffer) != VkConstants.VK_SUCCESS
            || atlasBuffer == 0uL {
            throw InvalidOperationException("vkCreateBuffer failed for text atlas")
        }
        atlasAllocation = allocator.AllocateBuffer(atlasBuffer,
            uint32(VkConstants.VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT), 0u)
    }

    private func CreateBufferView() {
        var viewInfo = VkBufferViewCreateInfo{}
        viewInfo.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_VIEW_CREATE_INFO
        viewInfo.buffer = atlasBuffer
        viewInfo.format = VkConstants.VK_FORMAT_R16G16B16A16_SINT
        viewInfo.offset = 0uL
        viewInfo._range = byteSize
        let createBufferView = dispatch.vkCreateBufferView
        if createBufferView(device, &viewInfo, nil, &atlasBufferView) != VkConstants.VK_SUCCESS
            || atlasBufferView == 0uL {
            throw InvalidOperationException("vkCreateBufferView failed for text atlas")
        }
    }

    private func CreateDescriptorResources() {
        var layoutBinding = VkDescriptorSetLayoutBinding{}
        layoutBinding.binding = 0u
        layoutBinding.descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_UNIFORM_TEXEL_BUFFER
        layoutBinding.descriptorCount = 1u
        layoutBinding.stageFlags = uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT)
        var layoutInfo = VkDescriptorSetLayoutCreateInfo{}
        layoutInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO
        layoutInfo.bindingCount = 1u
        layoutInfo.pBindings = &layoutBinding
        let createLayout = dispatch.vkCreateDescriptorSetLayout
        if createLayout(device, &layoutInfo, nil, &descriptorSetLayout) != VkConstants.VK_SUCCESS
            || descriptorSetLayout == 0uL {
            throw InvalidOperationException("vkCreateDescriptorSetLayout failed for text atlas")
        }

        var poolSize = VkDescriptorPoolSize{}
        poolSize._type = VkConstants.VK_DESCRIPTOR_TYPE_UNIFORM_TEXEL_BUFFER
        poolSize.descriptorCount = 1u
        var poolInfo = VkDescriptorPoolCreateInfo{}
        poolInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO
        poolInfo.maxSets = 1u
        poolInfo.poolSizeCount = 1u
        poolInfo.pPoolSizes = &poolSize
        let createPool = dispatch.vkCreateDescriptorPool
        if createPool(device, &poolInfo, nil, &descriptorPool) != VkConstants.VK_SUCCESS
            || descriptorPool == 0uL {
            throw InvalidOperationException("vkCreateDescriptorPool failed for text atlas")
        }

        var allocateInfo = VkDescriptorSetAllocateInfo{}
        allocateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO
        allocateInfo.descriptorPool = descriptorPool
        allocateInfo.descriptorSetCount = 1u
        allocateInfo.pSetLayouts = &descriptorSetLayout
        let allocateSets = dispatch.vkAllocateDescriptorSets
        if allocateSets(device, &allocateInfo, &descriptorSet) != VkConstants.VK_SUCCESS
            || descriptorSet == 0uL {
            throw InvalidOperationException("vkAllocateDescriptorSets failed for text atlas")
        }

        var write = VkWriteDescriptorSet{}
        write.sType = VkConstants.VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET
        write.dstSet = descriptorSet
        write.dstBinding = 0u
        write.descriptorCount = 1u
        write.descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_UNIFORM_TEXEL_BUFFER
        write.pTexelBufferView = &atlasBufferView
        let updateDescriptors = dispatch.vkUpdateDescriptorSets
        updateDescriptors(device, 1u, &write, 0u, nil)
    }

    private func CreateStagingBuffer() {
        var bufferInfo = VkBufferCreateInfo{}
        bufferInfo.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO
        bufferInfo.size = byteSize
        bufferInfo.usage = uint32(VkConstants.VK_BUFFER_USAGE_TRANSFER_SRC_BIT)
        bufferInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
        let createBuffer = dispatch.vkCreateBuffer
        if createBuffer(device, &bufferInfo, nil, &stagingBuffer) != VkConstants.VK_SUCCESS
            || stagingBuffer == 0uL {
            throw InvalidOperationException("vkCreateBuffer failed for text atlas staging")
        }
        stagingAllocation = allocator.AllocateBuffer(stagingBuffer,
            uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT),
            uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)
                | uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_CACHED_BIT))
        if allocator.Map(stagingAllocation!!) != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkMapMemory failed for text atlas staging")
        }
    }

    private func DestroyStagingBuffer() {
        if stagingBuffer != 0uL {
            let destroyBuffer = dispatch.vkDestroyBuffer
            destroyBuffer(device, stagingBuffer, nil)
            stagingBuffer = 0uL
        }
        if stagingAllocation != nil {
            allocator.Release(stagingAllocation!!)
            stagingAllocation = nil
        }
    }

    private func DestroyDescriptorResources() {
        if descriptorPool != 0uL {
            let destroyPool = dispatch.vkDestroyDescriptorPool
            destroyPool(device, descriptorPool, nil)
            descriptorPool = 0uL
        }
        if descriptorSetLayout != 0uL {
            let destroyLayout = dispatch.vkDestroyDescriptorSetLayout
            destroyLayout(device, descriptorSetLayout, nil)
            descriptorSetLayout = 0uL
        }
        descriptorSet = 0uL
    }

    private func DestroyBufferView() {
        if atlasBufferView != 0uL {
            let destroyBufferView = dispatch.vkDestroyBufferView
            destroyBufferView(device, atlasBufferView, nil)
            atlasBufferView = 0uL
        }
    }

    private func DestroyAtlasBuffer() {
        if atlasBuffer != 0uL {
            let destroyBuffer = dispatch.vkDestroyBuffer
            destroyBuffer(device, atlasBuffer, nil)
            atlasBuffer = 0uL
        }
        if atlasAllocation != nil {
            allocator.Release(atlasAllocation!!)
            atlasAllocation = nil
        }
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanTextAtlas")
        }
    }
}
