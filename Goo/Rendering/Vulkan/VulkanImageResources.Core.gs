package Goo

import System

internal unsafe partial class VulkanImageResources : IDisposable {
    private const MaxCapacity int32 = 1048576
    private const MaxStagingBytes VkDeviceSize = 4294967295uL

    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let allocator VulkanMemoryAllocator
    private let registry VulkanResourceRegistry
    private let capacity int32
    private let descriptorCapacity int32
    private let residentByteBudget VkDeviceSize
    private let entries []VulkanImageResourceEntry
    private let logicalRecords []VulkanLogicalResource
    private let descriptorSets []VkDescriptorSet
    private let descriptorLayouts []VkDescriptorSetLayout
    private let poolSizes []VkDescriptorPoolSize
    private let uploadRing VulkanUploadRing
    private let stagingByteCapacity VkDeviceSize
    private var stagingBuffer VkBuffer
    private var stagingAllocation VulkanMemoryAllocation? = nil
    private var descriptorPool VkDescriptorPool
    private var descriptorSetLayout VkDescriptorSetLayout
    private var nearestSampler VkSampler
    private var linearSampler VkSampler
    private var generation uint64
    private var generationLastUseFence uint64
    private var highestCompletedFence uint64
    private var nextTouch uint64
    private var liveCount int32
    private var residentBytes VkDeviceSize
    private var flushPrepared bool
    private var disposed bool

    internal prop Generation uint64 { get { return generation } }
    internal prop DescriptorSetLayout VkDescriptorSetLayout { get { return descriptorSetLayout } }
    internal prop Stats VulkanImageResourceStats {
        get {
            return VulkanImageResourceStats{
                Generation: generation,
                Capacity: capacity,
                LiveCount: liveCount,
                ResidentBytes: residentBytes,
                ResidentByteBudget: residentByteBudget,
                LiveObjectCount: CurrentLiveObjectHandleCount(),
                DescriptorCapacity: descriptorCapacity,
                BoundDescriptorCount: CurrentBoundDescriptorCount(),
                RetiringDescriptorCount: CurrentRetiringDescriptorCount(),
                HighestCompletedFence: highestCompletedFence,
                Upload: uploadRing.Stats,
                Registry: registry.Stats,
            }
        }
    }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        nativeAllocator VulkanMemoryAllocator,
        imageCapacity int32,
        logicalResourceCapacity int32,
        maximumResidentBytes VkDeviceSize,
        maximumLogicalSourceBytes VkDeviceSize,
        stagingBytes VkDeviceSize,
        uploadRangeCapacity int32,
        initialGeneration uint64) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan device is null", "nativeDevice")
        }
        if imageCapacity <= 0 || imageCapacity > MaxCapacity {
            throw ArgumentOutOfRangeException("imageCapacity")
        }
        if logicalResourceCapacity < imageCapacity || logicalResourceCapacity > MaxCapacity {
            throw ArgumentOutOfRangeException("logicalResourceCapacity")
        }
        if maximumResidentBytes == 0uL {
            throw ArgumentOutOfRangeException("maximumResidentBytes")
        }
        if maximumLogicalSourceBytes == 0uL {
            throw ArgumentOutOfRangeException("maximumLogicalSourceBytes")
        }
        if stagingBytes == 0uL || stagingBytes > MaxStagingBytes {
            throw ArgumentOutOfRangeException("stagingBytes")
        }
        if uploadRangeCapacity <= 0 || uploadRangeCapacity > MaxCapacity {
            throw ArgumentOutOfRangeException("uploadRangeCapacity")
        }
        if initialGeneration == 0uL {
            throw ArgumentOutOfRangeException("initialGeneration")
        }
        device = nativeDevice
        dispatch = nativeDispatch
        allocator = nativeAllocator
        capacity = imageCapacity
        residentByteBudget = maximumResidentBytes
        stagingByteCapacity = stagingBytes
        entries = [imageCapacity]VulkanImageResourceEntry
        logicalRecords = [logicalResourceCapacity]VulkanLogicalResource
        descriptorCapacity = imageCapacity + imageCapacity
        descriptorSets = [descriptorCapacity]VkDescriptorSet
        descriptorLayouts = [descriptorCapacity]VkDescriptorSetLayout
        poolSizes = [1]VkDescriptorPoolSize
        generation = initialGeneration
        highestCompletedFence = 0uL
        generationLastUseFence = 0uL
        nextTouch = 1uL
        registry = VulkanResourceRegistry(logicalResourceCapacity, maximumResidentBytes,
            maximumLogicalSourceBytes)
        uploadRing = VulkanUploadRing(stagingBytes, uploadRangeCapacity, initialGeneration)
        registry.SetGpuGeneration(initialGeneration)
        flushPrepared = false
        try {
            CreateGeneration()
            CreateStagingBuffer()
        } catch (error Exception) {
            DestroyGeneration()
            DestroyStagingBuffer()
            uploadRing.Dispose()
            registry.Dispose()
            throw error
        }
    }

    internal func SetGeneration(nextGeneration uint64, completedFence uint64) {
        EnsureOpen()
        if nextGeneration == 0uL || nextGeneration <= generation {
            throw ArgumentOutOfRangeException("nextGeneration")
        }
        Collect(completedFence)
        if highestCompletedFence < generationLastUseFence {
            throw InvalidOperationException("Vulkan image generation is still in use")
        }
        var entryIndex int32 = 0
        while entryIndex < entries.Length {
            let entry = entries[entryIndex]
            if entry.State == VulkanImageResourceState.Retiring
                && entry.RetireFence > highestCompletedFence {
                throw InvalidOperationException("Vulkan image retirement is still in flight")
            }
            entryIndex++
        }
        let uploadStats = uploadRing.Stats
        if uploadStats.ActiveRanges != 0 || uploadStats.SubmittedRanges != 0 {
            throw InvalidOperationException("Vulkan image uploads are still in flight")
        }
        try {
            DestroyGpuResources()
            registry.SetGpuGeneration(nextGeneration)
            uploadRing.SetGeneration(nextGeneration)
            generation = nextGeneration
            generationLastUseFence = 0uL
            highestCompletedFence = 0uL
            flushPrepared = false
            CreateGeneration()
        } catch (error Exception) {
            DestroyGeneration()
            DestroyStagingBuffer()
            uploadRing.Dispose()
            registry.Dispose()
            disposed = true
            throw error
        }
    }

}
