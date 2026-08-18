package Goo

import System

internal data struct VulkanTextAtlasSetStats {
    var AtlasCount int32
    var ByteSize VkDeviceSize
    var LiveObjectCount uint64
    var UploadPending bool
    var UploadRecorded bool
    var UploadSubmitted bool
    var UploadByteCount VkDeviceSize
}

internal unsafe sealed class VulkanTextAtlasSet : IDisposable {
    private const MaxAtlasCount int32 = 8
    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let allocator VulkanMemoryAllocator
    private let atlasByteSize VkDeviceSize
    private let maxTexelBufferElements uint32
    private let descriptorSetLayout VkDescriptorSetLayout
    private let objectAccounting VulkanObjectAccounting?
    private let atlases []VulkanTextAtlas?
    private let identities []ResourceId
    private let lastUseSerial []uint64
    private let active []bool
    private var atlasCount int32
    private var currentAtlasIndex int32
    private var nextLogicalId uint64 = 1uL
    private var nextVersion uint64 = 1uL
    private var publishedVersion uint64
    private var disposed bool

    internal prop AtlasSlotCapacity int32 { get { return atlases.Length } }
    internal prop AtlasCount int32 { get { return atlasCount } }
    internal prop CurrentAtlasIndex int32 { get { return currentAtlasIndex } }
    internal prop PublishedVersion uint64 { get { return publishedVersion } }
    internal prop DescriptorSetLayout VkDescriptorSetLayout {
        get { return descriptorSetLayout }
    }
    internal prop Stats VulkanTextAtlasSetStats {
        get {
            var byteSize VkDeviceSize = 0uL
            var liveObjectCount uint64 = 0uL
            var uploadPending bool = false
            var uploadRecorded bool = false
            var uploadSubmitted bool = false
            var uploadByteCount VkDeviceSize = 0uL
            var index int32 = 0
            while index < atlases.Length {
                if active[index] {
                    let stats = AtlasAt(index).Stats
                    byteSize = byteSize + stats.ByteSize
                    if stats.Buffer != 0uL { liveObjectCount++ }
                    if stats.BufferView != 0uL { liveObjectCount++ }
                    if stats.DescriptorSet != 0uL { liveObjectCount++ }
                    uploadPending = uploadPending || stats.UploadPending
                    uploadRecorded = uploadRecorded || stats.UploadRecorded
                    uploadSubmitted = uploadSubmitted || stats.UploadSubmitted
                    uploadByteCount = uploadByteCount + stats.UploadByteCount
                }
                index++
            }
            return VulkanTextAtlasSetStats{
                AtlasCount: atlasCount,
                ByteSize: byteSize,
                LiveObjectCount: liveObjectCount,
                UploadPending: uploadPending,
                UploadRecorded: uploadRecorded,
                UploadSubmitted: uploadSubmitted,
                UploadByteCount: uploadByteCount,
            }
        }
    }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        nativeAllocator VulkanMemoryAllocator,
        nativeAtlasByteSize VkDeviceSize,
        nativeMaxTexelBufferElements uint32,
        nativeDescriptorSetLayout VkDescriptorSetLayout,
        nativeObjectAccounting VulkanObjectAccounting?) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan device is null", "nativeDevice")
        }
        if nativeAtlasByteSize == 0uL || nativeMaxTexelBufferElements == 0u {
            throw ArgumentOutOfRangeException("nativeAtlasByteSize")
        }
        if nativeDescriptorSetLayout == 0uL {
            throw ArgumentException("Vulkan text atlas descriptor layout is null", "nativeDescriptorSetLayout")
        }
        device = nativeDevice
        dispatch = nativeDispatch
        allocator = nativeAllocator
        objectAccounting = nativeObjectAccounting
        atlasByteSize = nativeAtlasByteSize
        maxTexelBufferElements = nativeMaxTexelBufferElements
        descriptorSetLayout = nativeDescriptorSetLayout
        atlases = [MaxAtlasCount]VulkanTextAtlas?
        identities = [MaxAtlasCount]ResourceId
        lastUseSerial = [MaxAtlasCount]uint64
        active = [MaxAtlasCount]bool
        currentAtlasIndex = -1
        CreateAtlas()
    }

    internal func AtlasAt(index int32) VulkanTextAtlas {
        EnsureOpen()
        if index < 0 || index >= atlases.Length || !active[index] {
            throw ArgumentOutOfRangeException("index")
        }
        guard let value = atlases[index] else {
            throw InvalidOperationException("Vulkan text atlas slot is empty")
        }
        return value
    }

    internal func IdentityAt(index int32) ResourceId {
        EnsureOpen()
        if index < 0 || index >= atlases.Length || !active[index] {
            throw ArgumentOutOfRangeException("index")
        }
        return identities[index]
    }

    internal func IsActive(index int32) bool {
        EnsureOpen()
        if index < 0 || index >= atlases.Length {
            throw ArgumentOutOfRangeException("index")
        }
        return active[index]
    }

    internal func CreateAtlas() int32 {
        EnsureOpen()
        if atlasCount >= atlases.Length {
            throw InvalidOperationException("Vulkan text atlas capacity is exhausted")
        }
        var index int32 = 0
        while index < atlases.Length && active[index] {
            index = index + 1
        }
        if index >= atlases.Length {
            throw InvalidOperationException("Vulkan text atlas capacity is exhausted")
        }
        let identity = NextIdentity()
        let created = VulkanTextAtlas(device, dispatch, allocator, atlasByteSize,
            maxTexelBufferElements, descriptorSetLayout, objectAccounting)
        atlases[index] = created
        identities[index] = identity
        lastUseSerial[index] = 0uL
        active[index] = true
        atlasCount = atlasCount + 1
        currentAtlasIndex = index
        return index
    }

    internal func FindReclaimable(completedSerial uint64, protectedSlots []bool) int32 {
        EnsureOpen()
        if protectedSlots.Length < atlases.Length {
            throw ArgumentException("protectedSlots")
        }
        var candidate int32 = -1
        var candidateSerial uint64 = uint64.MaxValue
        var index int32 = 1
        while index < atlases.Length {
            if active[index] && !protectedSlots[index]
                && lastUseSerial[index] <= completedSerial {
                let stats = atlases[index]!!.Stats
                if !stats.UploadPending && !stats.UploadRecorded && !stats.UploadSubmitted
                    && lastUseSerial[index] < candidateSerial {
                    candidate = index
                    candidateSerial = lastUseSerial[index]
                }
            }
            index = index + 1
        }
        return candidate
    }

    internal func RecycleAtlas(index int32, completedSerial uint64) ResourceId {
        EnsureOpen()
        if index <= 0 || index >= atlases.Length || !active[index] {
            throw ArgumentOutOfRangeException("index")
        }
        if lastUseSerial[index] > completedSerial {
            throw InvalidOperationException("Vulkan text atlas is still in use")
        }
        let oldAtlas = atlases[index]!!
        let oldStats = oldAtlas.Stats
        if oldStats.UploadPending || oldStats.UploadRecorded || oldStats.UploadSubmitted {
            throw InvalidOperationException("Vulkan text atlas has pending work")
        }
        let identity = NextIdentity()
        let replacement = VulkanTextAtlas(device, dispatch, allocator, atlasByteSize,
            maxTexelBufferElements, descriptorSetLayout, objectAccounting)
        try {
            oldAtlas.Dispose()
        } catch (error Exception) {
            try { replacement.Dispose() } catch (cleanup Exception) { }
            throw error
        }
        atlases[index] = replacement
        identities[index] = identity
        lastUseSerial[index] = 0uL
        currentAtlasIndex = index
        return identity
    }

    internal func Resolve(identity ResourceId) VulkanTextAtlas {
        EnsureOpen()
        let index = FindIndex(identity)
        if index < 0 {
            throw InvalidOperationException("Vulkan text atlas identity is not resident")
        }
        return AtlasAt(index)
    }

    internal func FindIndex(identity ResourceId) int32 {
        if !identity.IsValid || identity.Kind != SceneResourceKind.Atlas {
            return -1
        }
        var index int32 = 0
        while index < atlases.Length {
            if active[index] {
                let current = identities[index]
                if current.Kind == identity.Kind && current.LogicalId == identity.LogicalId
                    && current.Version == identity.Version {
                    return index
                }
            }
            index++
        }
        return -1
    }

    internal func RecordUploads(commandBuffer VkCommandBuffer, out recordedBytes VkDeviceSize)
        int32 {
        var recordedBarriers int32 = 0
        return RecordUploads(commandBuffer, out recordedBytes, out recordedBarriers)
    }

    internal func RecordUploads(commandBuffer VkCommandBuffer, out recordedBytes VkDeviceSize,
        out recordedBarriers int32) int32 {
        EnsureOpen()
        if commandBuffer == nint(0) {
            throw ArgumentException("Command buffer is null", "commandBuffer")
        }
        recordedBytes = 0uL
        recordedBarriers = 0
        var recorded int32 = 0
        var index int32 = 0
        while index < atlases.Length {
            if !active[index] {
                index = index + 1
                continue
            }
            let atlas = AtlasAt(index)
            let stats = atlas.Stats
            if stats.UploadPending && !stats.UploadRecorded {
                atlas.RecordUpload(commandBuffer)
                recordedBytes = recordedBytes + stats.UploadByteCount
                recordedBarriers = recordedBarriers + 1
                recorded = recorded + 1
            }
            index++
        }
        return recorded
    }

    internal func FlushBeforeSubmit() VkResult {
        EnsureOpen()
        var result VkResult = VkConstants.VK_SUCCESS
        var index int32 = 0
        while index < atlases.Length {
            if !active[index] {
                index = index + 1
                continue
            }
            let flushResult = AtlasAt(index).FlushBeforeSubmit()
            if result == VkConstants.VK_SUCCESS && flushResult != VkConstants.VK_SUCCESS {
                result = flushResult
            }
            index++
        }
        return result
    }

    internal func MarkSubmitted(commandBuffer VkCommandBuffer, submissionSerial uint64) {
        EnsureOpen()
        if commandBuffer == nint(0) || submissionSerial == 0uL {
            throw ArgumentException("Text atlas submission arguments are invalid")
        }
        var index int32 = 0
        while index < atlases.Length {
            if !active[index] {
                index = index + 1
                continue
            }
            let atlas = AtlasAt(index)
            let stats = atlas.Stats
            if stats.UploadPending && stats.UploadRecorded && !stats.UploadSubmitted {
                atlas.MarkSubmitted(commandBuffer, submissionSerial)
                if submissionSerial > lastUseSerial[index] {
                    lastUseSerial[index] = submissionSerial
                }
                if identities[index].Version > publishedVersion {
                    publishedVersion = identities[index].Version
                }
            }
            index++
        }
    }

    internal func MarkUsed(identity ResourceId, submissionSerial uint64) {
        EnsureOpen()
        if submissionSerial == 0uL {
            throw ArgumentOutOfRangeException("submissionSerial")
        }
        let index = FindIndex(identity)
        if index < 0 {
            throw InvalidOperationException("Vulkan text atlas identity is not resident")
        }
        if submissionSerial > lastUseSerial[index] {
            lastUseSerial[index] = submissionSerial
        }
    }

    internal func Collect(completedSerial uint64) bool {
        EnsureOpen()
        var collected bool = false
        var index int32 = 0
        while index < atlases.Length {
            if active[index] && AtlasAt(index).Collect(completedSerial) {
                collected = true
            }
            index++
        }
        return collected
    }

    internal func AbortUploads() bool {
        EnsureOpen()
        var aborted bool = false
        var index int32 = 0
        while index < atlases.Length {
            if !active[index] {
                index = index + 1
                continue
            }
            let atlas = AtlasAt(index)
            let stats = atlas.Stats
            if stats.UploadPending && !stats.UploadSubmitted {
                if atlas.AbortUpload(stats.UploadCommandBuffer) {
                    aborted = true
                }
            }
            index++
        }
        return aborted
    }

    internal func RetireAll(completedSerial uint64) {
        EnsureOpen()
        var index int32 = 0
        while index < atlases.Length {
            if !active[index] {
                index = index + 1
                continue
            }
            if lastUseSerial[index] > completedSerial {
                throw InvalidOperationException("Vulkan text atlas is still in use")
            }
            let atlas = AtlasAt(index)
            let stats = atlas.Stats
            if stats.UploadPending {
                if stats.UploadSubmitted {
                    if !atlas.Collect(completedSerial) {
                        throw InvalidOperationException("Vulkan text atlas upload is still in flight")
                    }
                } else {
                    atlas.AbortUpload(stats.UploadCommandBuffer)
                }
            }
            atlas.Dispose()
            atlases[index] = nil
            active[index] = false
            identities[index] = ResourceId{}
            lastUseSerial[index] = 0uL
            index++
        }
        atlasCount = 0
        currentAtlasIndex = -1
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        var index int32 = 0
        while index < atlases.Length {
            if let atlas = atlases[index] {
                let stats = atlas.Stats
                if stats.UploadPending && !stats.UploadSubmitted {
                    try { atlas.AbortUpload(stats.UploadCommandBuffer) } catch (cleanup Exception) { }
                }
                try { atlas.Collect(uint64.MaxValue) } catch (cleanup Exception) { }
                try { atlas.Dispose() } catch (cleanup Exception) { }
                atlases[index] = nil
            }
            active[index] = false
            identities[index] = ResourceId{}
            lastUseSerial[index] = 0uL
            index++
        }
        atlasCount = 0
        currentAtlasIndex = -1
    }

    deinit {
        try {
            Dispose()
        } catch (error Exception) {
        }
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanTextAtlasSet")
        }
    }

    private func NextIdentity() ResourceId {
        if nextLogicalId == uint64.MaxValue || nextVersion == uint64.MaxValue {
            throw OverflowException("Vulkan text atlas identity overflow")
        }
        let identity = ResourceId{
            Kind: SceneResourceKind.Atlas,
            LogicalId: nextLogicalId,
            Version: nextVersion,
        }
        nextLogicalId = nextLogicalId + 1uL
        nextVersion = nextVersion + 1uL
        return identity
    }
}
