package Goo

import System

internal data struct VulkanTextAtlasStats {
    var ByteSize VkDeviceSize
    var TexelCount VkDeviceSize
    var Buffer VkBuffer
    var BufferView VkBufferView
    var DescriptorSetLayout VkDescriptorSetLayout
    var DescriptorSet VkDescriptorSet
    var LiveObjectCount uint64
    var UploadPending bool
    var UploadRecorded bool
    var UploadSubmitted bool
    var Uploaded bool
    var UploadByteOffset VkDeviceSize
    var UploadByteCount VkDeviceSize
    var UploadFence uint64
    var UploadCommandBuffer VkCommandBuffer
}

internal unsafe partial class VulkanTextAtlas : IDisposable {
    private const AtlasTexelBytes VkDeviceSize = 8uL
    private const MaxAtlasBytes VkDeviceSize = 2147483647uL

    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let allocator VulkanMemoryAllocator
    private let objectAccounting VulkanObjectAccounting?
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
    private var uploadByteOffset VkDeviceSize
    private var uploadByteCount VkDeviceSize
    private var uploadSequence uint64
    private var completedUploadSequence uint64
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
    internal prop UploadByteOffset VkDeviceSize { get { return uploadByteOffset } }
    internal prop UploadByteCount VkDeviceSize { get { return uploadByteCount } }
    internal prop UploadSequence uint64 { get { return uploadSequence } }
    internal prop CompletedUploadSequence uint64 { get { return completedUploadSequence } }
    internal prop Stats VulkanTextAtlasStats {
        get {
            return VulkanTextAtlasStats{
                ByteSize: byteSize,
                TexelCount: byteSize / AtlasTexelBytes,
                Buffer: atlasBuffer,
                BufferView: atlasBufferView,
                DescriptorSetLayout: descriptorSetLayout,
                DescriptorSet: descriptorSet,
                LiveObjectCount: LiveObjectCount(),
                UploadPending: uploadPending,
                UploadRecorded: uploadRecorded,
                UploadSubmitted: uploadSubmitted,
                Uploaded: uploaded,
                UploadByteOffset: uploadByteOffset,
                UploadByteCount: uploadByteCount,
                UploadFence: uploadFence,
                UploadCommandBuffer: uploadCommandBuffer,
            }
        }
    }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        nativeAllocator VulkanMemoryAllocator,
        atlasByteSize VkDeviceSize,
        nativeMaxTexelBufferElements uint32,
        nativeDescriptorSetLayout VkDescriptorSetLayout,
        nativeObjectAccounting VulkanObjectAccounting?) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan device is null", "nativeDevice")
        }
        if nativeDescriptorSetLayout == 0uL {
            throw ArgumentException("Vulkan text atlas descriptor layout is null", "nativeDescriptorSetLayout")
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
        objectAccounting = nativeObjectAccounting
        byteSize = atlasByteSize
        descriptorSetLayout = nativeDescriptorSetLayout
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

    internal func QueueUpload(source *uint8, sourceByteOffset VkDeviceSize,
        sourceByteCount VkDeviceSize) bool {
        EnsureOpen()
        if source == nil {
            throw ArgumentNullException("source")
        }
        if sourceByteCount == 0uL || sourceByteOffset > byteSize
            || sourceByteCount > byteSize - sourceByteOffset
            || (sourceByteOffset % AtlasTexelBytes) != 0uL
            || (sourceByteCount % AtlasTexelBytes) != 0uL {
            throw ArgumentException("Text atlas upload range is invalid", "sourceByteCount")
        }
        if uploadPending {
            throw InvalidOperationException("Vulkan text atlas upload is already pending")
        }
        if uploadSequence == uint64.MaxValue {
            throw OverflowException("Vulkan text atlas upload sequence overflow")
        }
        uploadSequence = uploadSequence + 1uL
        let destination = *uint8(nint(stagingAllocation!!.mapped))
        var byteIndex int32 = 0
        let sourceOffset = int32(sourceByteOffset)
        let copyLength = int32(sourceByteCount)
        while byteIndex < copyLength {
            let index = sourceOffset + byteIndex
            destination[index] = source[index]
            byteIndex++
        }
        uploadPending = true
        uploadRecorded = false
        uploadSubmitted = false
        uploadByteOffset = sourceByteOffset
        uploadByteCount = sourceByteCount
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
        copy.srcOffset = uploadByteOffset
        copy.dstOffset = uploadByteOffset
        copy.size = uploadByteCount
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
        barrier.offset = uploadByteOffset
        barrier.size = uploadByteCount
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
        let result = allocator.FlushBeforeSubmit(stagingAllocation!!,
            uploadByteOffset, uploadByteCount)
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
        uploadByteOffset = 0uL
        uploadByteCount = 0uL
        uploadCommandBuffer = nint(0)
        uploadFence = 0uL
        completedUploadSequence = uploadSequence
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
        uploadByteOffset = 0uL
        uploadByteCount = 0uL
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
        if !uploaded {
            throw InvalidOperationException("Vulkan text atlas upload is not ready for this command buffer")
        }
        if uploadPending && (!uploadRecorded
            || (!uploadSubmitted && uploadCommandBuffer != commandBuffer)) {
            throw InvalidOperationException("Vulkan text atlas upload is not ready for this command buffer")
        }
        if descriptorSet == 0uL {
            throw InvalidOperationException("Vulkan text atlas descriptor set is unavailable")
        }
        let bindDescriptorSets = dispatch.vkCmdBindDescriptorSets
        bindDescriptorSets(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS,
            pipelineLayout, 0u, 1u, &descriptorSet, 0u, nil)
    }

    private func LiveObjectCount() uint64 {
        var count uint64 = 0uL
        if atlasBuffer != 0uL { count = count + 1uL }
        if atlasBufferView != 0uL { count = count + 1uL }
        if descriptorPool != 0uL { count = count + 1uL }
        if descriptorSet != 0uL { count = count + 1uL }
        if stagingBuffer != 0uL { count = count + 1uL }
        return count
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
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyBuffer = dispatch.vkDestroyBuffer
            destroyBuffer(device, atlasBuffer, nil)
            atlasBuffer = 0uL
            throw error
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
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyBufferView = dispatch.vkDestroyBufferView
            destroyBufferView(device, atlasBufferView, nil)
            atlasBufferView = 0uL
            throw error
        }
    }

    private func CreateDescriptorResources() {
        if descriptorSetLayout == 0uL {
            throw InvalidOperationException("Vulkan text atlas descriptor layout is unavailable")
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
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyPool = dispatch.vkDestroyDescriptorPool
            destroyPool(device, descriptorPool, nil)
            descriptorPool = 0uL
            throw error
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
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyPool = dispatch.vkDestroyDescriptorPool
            destroyPool(device, descriptorPool, nil)
            if let accounting = objectAccounting {
                accounting.Release()
            }
            descriptorPool = 0uL
            descriptorSet = 0uL
            throw error
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
            throw InvalidOperationException("vkMapMemory failed for text atlas staging")
        }
    }

    private func DestroyStagingBuffer() {
        if stagingBuffer != 0uL {
            let staleBuffer = stagingBuffer
            stagingBuffer = 0uL
            let destroyBuffer = dispatch.vkDestroyBuffer
            try { destroyBuffer(device, staleBuffer, nil) } catch (cleanup Exception) { }
            if let accounting = objectAccounting {
                try { accounting.Release() } catch (cleanup Exception) { }
            }
        }
        if let allocation = stagingAllocation {
            stagingAllocation = nil
            try { allocator.Release(allocation) } catch (cleanup Exception) { }
        }
    }

    private func DestroyDescriptorResources() {
        if descriptorPool != 0uL {
            let stalePool = descriptorPool
            let staleSet = descriptorSet
            descriptorPool = 0uL
            descriptorSet = 0uL
            descriptorSetLayout = 0uL
            let destroyPool = dispatch.vkDestroyDescriptorPool
            try { destroyPool(device, stalePool, nil) } catch (cleanup Exception) { }
            if staleSet != 0uL {
                if let accounting = objectAccounting {
                    try { accounting.Release() } catch (cleanup Exception) { }
                }
            }
            if let accounting = objectAccounting {
                try { accounting.Release() } catch (cleanup Exception) { }
            }
        }
        descriptorSet = 0uL
        descriptorSetLayout = 0uL
    }

    private func DestroyBufferView() {
        if atlasBufferView != 0uL {
            let staleBufferView = atlasBufferView
            atlasBufferView = 0uL
            let destroyBufferView = dispatch.vkDestroyBufferView
            try { destroyBufferView(device, staleBufferView, nil) } catch (cleanup Exception) { }
            if let accounting = objectAccounting {
                try { accounting.Release() } catch (cleanup Exception) { }
            }
        }
    }

    private func DestroyAtlasBuffer() {
        if atlasBuffer != 0uL {
            let staleBuffer = atlasBuffer
            atlasBuffer = 0uL
            let destroyBuffer = dispatch.vkDestroyBuffer
            try { destroyBuffer(device, staleBuffer, nil) } catch (cleanup Exception) { }
            if let accounting = objectAccounting {
                try { accounting.Release() } catch (cleanup Exception) { }
            }
        }
        if let allocation = atlasAllocation {
            atlasAllocation = nil
            try { allocator.Release(allocation) } catch (cleanup Exception) { }
        }
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanTextAtlas")
        }
    }
}
