package Goo.VulkanProof

import System
import Goo.Vulkan.Generated

internal enum VulkanResourceState {
    Empty;
    Logical;
    Resident;
    Retiring;
}

internal data struct VulkanResourceSource {
    var ProviderId uint64
    var SourceId uint64
    var Version uint64
    var Bytes VkDeviceSize

    internal prop IsValid bool {
        get {
            return ProviderId != 0uL && SourceId != 0uL && Version != 0uL && Bytes != 0uL
        }
    }
}

internal data struct VulkanResourceEntry {
    var Id ResourceId
    var Source VulkanResourceSource
    var State VulkanResourceState
    var Bytes VkDeviceSize
    var GpuGeneration uint64
    var GpuHandle uint64
    var DescriptorSlot int32
    var UploadedVersion uint64
    var LastUseFence uint64
    var RetireFence uint64
    var LastTouch uint64
    var Cacheable bool
}

internal data struct VulkanResourceRegistration {
    var Accepted bool
    var Existing bool
    var Index int32
}

internal data struct VulkanResourceLookup {
    var Found bool
    var Id ResourceId
    var Source VulkanResourceSource
    var State VulkanResourceState
    var Bytes VkDeviceSize
    var GpuGeneration uint64
    var GpuHandle uint64
    var DescriptorSlot int32
    var UploadedVersion uint64
}

internal data struct VulkanLogicalResource {
    var Id ResourceId
    var Source VulkanResourceSource
    var Bytes VkDeviceSize
    var Cacheable bool
}

internal data struct VulkanResourceEviction {
    var Found bool
    var Id ResourceId
    var Index int32
    var RetireFence uint64
}

internal data struct VulkanResourceRegistryStats {
    var EntryCount int32
    var LogicalCount int32
    var ResidentCount int32
    var RetiringCount int32
    var LogicalBytes VkDeviceSize
    var ResidentBytes VkDeviceSize
    var RetiredBytes VkDeviceSize
    var LogicalSourceBytes VkDeviceSize
    var LogicalSourceBudget VkDeviceSize
}

internal unsafe class VulkanResourceRegistry {
    private const MaxCapacity int32 = 1048576

    private let entries []VulkanResourceEntry
    private let byteBudget VkDeviceSize
    private let logicalSourceBudget VkDeviceSize
    private var entryCount int32
    private var logicalCount int32
    private var residentCount int32
    private var retiringCount int32
    private var logicalBytes VkDeviceSize
    private var residentBytes VkDeviceSize
    private var retiredBytes VkDeviceSize
    private var logicalSourceBytes VkDeviceSize
    private var gpuGeneration uint64
    private var nextTouch uint64
    private var disposed bool

    internal prop GpuGeneration uint64 { get { return gpuGeneration } }
    internal prop ByteBudget VkDeviceSize { get { return byteBudget } }
    internal prop LogicalSourceBudget VkDeviceSize { get { return logicalSourceBudget } }
    internal prop Stats VulkanResourceRegistryStats {
        get {
            return VulkanResourceRegistryStats{
                EntryCount: entryCount,
                LogicalCount: logicalCount,
                ResidentCount: residentCount,
                RetiringCount: retiringCount,
                LogicalBytes: logicalBytes,
                ResidentBytes: residentBytes,
                RetiredBytes: retiredBytes,
                LogicalSourceBytes: logicalSourceBytes,
                LogicalSourceBudget: logicalSourceBudget,
            }
        }
    }

    internal init(capacity int32, maximumResidentBytes VkDeviceSize,
        maximumLogicalSourceBytes VkDeviceSize) {
        if capacity <= 0 || capacity > MaxCapacity {
            throw ArgumentOutOfRangeException("capacity")
        }
        if maximumResidentBytes == 0uL {
            throw ArgumentOutOfRangeException("maximumResidentBytes")
        }
        if maximumLogicalSourceBytes == 0uL {
            throw ArgumentOutOfRangeException("maximumLogicalSourceBytes")
        }
        entries = [capacity]VulkanResourceEntry
        byteBudget = maximumResidentBytes
        logicalSourceBudget = maximumLogicalSourceBytes
        nextTouch = 1uL
    }

    internal func SetGpuGeneration(nextGeneration uint64) int32 {
        EnsureOpen()
        if nextGeneration == 0uL {
            throw ArgumentOutOfRangeException("nextGeneration")
        }
        if gpuGeneration == nextGeneration {
            return 0
        }
        if gpuGeneration != 0uL && nextGeneration < gpuGeneration {
            throw InvalidOperationException("Vulkan GPU generation must increase")
        }
        let invalidated = InvalidateResidentEntries()
        gpuGeneration = nextGeneration
        return invalidated
    }

    internal func Register(id ResourceId, bytes VkDeviceSize,
        source VulkanResourceSource, cacheable bool) VulkanResourceRegistration {
        EnsureOpen()
        ValidateId(id)
        if bytes == 0uL {
            throw ArgumentOutOfRangeException("bytes")
        }
        ValidateSource(id, source)
        let existingIndex = FindLogicalIndex(id)
        if existingIndex >= 0 {
            let existing = entries[existingIndex]
            if id.Version < existing.Id.Version {
                throw InvalidOperationException("Vulkan resource version must increase")
            }
            if existing.Id.Version != id.Version && existing.State != VulkanResourceState.Logical {
                throw InvalidOperationException("Vulkan resource version change requires retirement")
            }
            if existing.Bytes != bytes && existing.State != VulkanResourceState.Logical {
                throw InvalidOperationException("Resident Vulkan resource byte charge cannot change")
            }
            if !SameSource(existing.Source, source) && existing.State != VulkanResourceState.Logical {
                throw InvalidOperationException("Resident Vulkan resource source cannot change")
            }
            if !SameSource(existing.Source, source) {
                ValidateSourceCharge(existing.Source.Bytes, source.Bytes)
            }
            if existing.Bytes != bytes {
                logicalBytes -= existing.Bytes
                logicalBytes += bytes
            }
            if !SameSource(existing.Source, source) {
                ReplaceSourceCharge(existing.Source.Bytes, source.Bytes)
            }
            let updated = VulkanResourceEntry{
                Id: id,
                Source: source,
                State: existing.State,
                Bytes: bytes,
                GpuGeneration: existing.GpuGeneration,
                GpuHandle: existing.GpuHandle,
                DescriptorSlot: existing.DescriptorSlot,
                UploadedVersion: if existing.Id.Version == id.Version { existing.UploadedVersion } else { 0uL },
                LastUseFence: existing.LastUseFence,
                RetireFence: existing.RetireFence,
                LastTouch: TouchValue(),
                Cacheable: cacheable,
            }
            entries[existingIndex] = updated
            return VulkanResourceRegistration{ Accepted: true, Existing: true, Index: existingIndex }
        }
        var freeIndex int32 = -1
        var index int32 = 0
        while index < entries.Length {
            if entries[index].State == VulkanResourceState.Empty {
                freeIndex = index
                break
            }
            index++
        }
        if freeIndex < 0 {
            throw InvalidOperationException("Vulkan logical resource capacity reached")
        }
        AddSourceCharge(source.Bytes)
        entries[freeIndex] = VulkanResourceEntry{
            Id: id,
            Source: source,
            State: VulkanResourceState.Logical,
            Bytes: bytes,
            GpuGeneration: 0uL,
            GpuHandle: 0uL,
            DescriptorSlot: -1,
            UploadedVersion: 0uL,
            LastUseFence: 0uL,
            RetireFence: 0uL,
            LastTouch: TouchValue(),
            Cacheable: cacheable,
        }
        entryCount++
        logicalCount++
        logicalBytes += bytes
        return VulkanResourceRegistration{ Accepted: true, Existing: false, Index: freeIndex }
    }

    internal func PublishGpu(id ResourceId, generation uint64, gpuHandle uint64,
        descriptorSlot int32) {
        EnsureOpen()
        ValidateId(id)
        if generation == 0uL || generation != gpuGeneration {
            throw InvalidOperationException("Vulkan resource generation is stale")
        }
        if gpuHandle == 0uL {
            throw ArgumentOutOfRangeException("gpuHandle")
        }
        let index = FindIndex(id)
        if index < 0 {
            throw InvalidOperationException("Vulkan resource is not registered")
        }
        var entry = entries[index]
        if entry.State == VulkanResourceState.Retiring {
            throw InvalidOperationException("Vulkan resource is retiring")
        }
        if entry.State == VulkanResourceState.Resident {
            if entry.GpuGeneration != generation {
                throw InvalidOperationException("Vulkan resource generation is stale")
            }
            entry.GpuHandle = gpuHandle
            entry.DescriptorSlot = descriptorSlot
            entry.LastTouch = TouchValue()
            entries[index] = entry
            return
        }
        if entry.Bytes > byteBudget || residentBytes > byteBudget - entry.Bytes {
            throw InvalidOperationException("Vulkan resource byte budget exceeded")
        }
        entry.State = VulkanResourceState.Resident
        entry.GpuGeneration = generation
        entry.GpuHandle = gpuHandle
        entry.DescriptorSlot = descriptorSlot
        entry.UploadedVersion = 0uL
        entry.LastTouch = TouchValue()
        entries[index] = entry
        logicalCount--
        residentCount++
        logicalBytes -= entry.Bytes
        residentBytes += entry.Bytes
    }

    internal func MarkUploaded(id ResourceId, generation uint64) {
        EnsureOpen()
        let index = FindIndex(id)
        if index < 0 {
            throw InvalidOperationException("Vulkan resource is not registered")
        }
        var entry = entries[index]
        if entry.State != VulkanResourceState.Resident
            || entry.GpuGeneration != generation
            || generation != gpuGeneration {
            throw InvalidOperationException("Vulkan resource is not resident in the requested generation")
        }
        entry.UploadedVersion = id.Version
        entry.LastTouch = TouchValue()
        entries[index] = entry
    }

    internal func Lookup(id ResourceId, generation uint64) VulkanResourceLookup {
        if disposed || !id.IsValid || generation == 0uL {
            return VulkanResourceLookup{ Found: false }
        }
        let index = FindIndex(id)
        if index < 0 {
            return VulkanResourceLookup{ Found: false }
        }
        let entry = entries[index]
        if entry.State != VulkanResourceState.Resident
            || entry.GpuGeneration != generation
            || generation != gpuGeneration {
            return VulkanResourceLookup{ Found: false }
        }
        return VulkanResourceLookup{
            Found: true,
            Id: entry.Id,
            Source: entry.Source,
            State: entry.State,
            Bytes: entry.Bytes,
            GpuGeneration: entry.GpuGeneration,
            GpuHandle: entry.GpuHandle,
            DescriptorSlot: entry.DescriptorSlot,
            UploadedVersion: entry.UploadedVersion,
        }
    }

    internal func CopyLogicalResources(destination []VulkanLogicalResource) int32 {
        EnsureOpen()
        var count int32 = 0
        var index int32 = 0
        while index < entries.Length {
            if entries[index].State == VulkanResourceState.Logical {
                count++
            }
            index++
        }
        if destination.Length < count {
            throw ArgumentException("Logical resource destination is too small", "destination")
        }
        var output int32 = 0
        index = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanResourceState.Logical {
                destination[output] = VulkanLogicalResource{
                    Id: entry.Id,
                    Source: entry.Source,
                    Bytes: entry.Bytes,
                    Cacheable: entry.Cacheable,
                }
                output++
            }
            index++
        }
        return count
    }

    internal func MarkUsed(id ResourceId, generation uint64, fence uint64) {
        EnsureOpen()
        let index = FindIndex(id)
        if index < 0 {
            throw InvalidOperationException("Vulkan resource is not registered")
        }
        var entry = entries[index]
        if entry.State != VulkanResourceState.Resident
            || entry.GpuGeneration != generation
            || generation != gpuGeneration {
            throw InvalidOperationException("Vulkan resource is not resident in the requested generation")
        }
        if fence > entry.LastUseFence {
            entry.LastUseFence = fence
        }
        entry.LastTouch = TouchValue()
        entries[index] = entry
    }

    internal func Retire(id ResourceId, fence uint64) bool {
        EnsureOpen()
        let index = FindIndex(id)
        if index < 0 {
            return false
        }
        var entry = entries[index]
        if entry.State == VulkanResourceState.Retiring {
            if fence > entry.RetireFence {
                entry.RetireFence = fence
                entries[index] = entry
            }
            return true
        }
        if entry.State != VulkanResourceState.Resident {
            return false
        }
        let retireFence = if fence > entry.LastUseFence { fence } else { entry.LastUseFence }
        entry.State = VulkanResourceState.Retiring
        entry.RetireFence = retireFence
        entries[index] = entry
        residentCount--
        retiringCount++
        residentBytes -= entry.Bytes
        retiredBytes += entry.Bytes
        return true
    }

    internal func EvictLeastRecentlyUsed(completedFence uint64) VulkanResourceEviction {
        EnsureOpen()
        var candidate int32 = -1
        var candidateTouch uint64 = uint64.MaxValue
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanResourceState.Resident
                && entry.Cacheable
                && entry.LastUseFence <= completedFence
                && entry.LastTouch < candidateTouch {
                candidate = index
                candidateTouch = entry.LastTouch
            }
            index++
        }
        if candidate < 0 {
            return VulkanResourceEviction{ Found: false, Index: -1 }
        }
        let entry = entries[candidate]
        Retire(entry.Id, completedFence)
        return VulkanResourceEviction{
            Found: true,
            Id: entry.Id,
            Index: candidate,
            RetireFence: if completedFence > entry.LastUseFence { completedFence } else { entry.LastUseFence },
        }
    }

    internal func Collect(completedFence uint64) int32 {
        EnsureOpen()
        var collected int32 = 0
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanResourceState.Retiring && entry.RetireFence <= completedFence {
                if entry.Cacheable {
                    retiringCount--
                    retiredBytes -= entry.Bytes
                    entries[index] = VulkanResourceEntry{
                        Id: entry.Id,
                        Source: entry.Source,
                        State: VulkanResourceState.Logical,
                        Bytes: entry.Bytes,
                        GpuGeneration: 0uL,
                        GpuHandle: 0uL,
                        DescriptorSlot: -1,
                        UploadedVersion: 0uL,
                        LastUseFence: 0uL,
                        RetireFence: 0uL,
                        LastTouch: TouchValue(),
                        Cacheable: entry.Cacheable,
                    }
                    logicalCount++
                    logicalBytes += entry.Bytes
                } else {
                    ClearEntry(index, entry)
                }
                collected++
            }
            index++
        }
        return collected
    }

    internal func DropLogical(id ResourceId) bool {
        EnsureOpen()
        let index = FindIndex(id)
        if index < 0 {
            return false
        }
        let entry = entries[index]
        if entry.State != VulkanResourceState.Logical {
            return false
        }
        ClearEntry(index, entry)
        return true
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        var index int32 = 0
        while index < entries.Length {
            entries[index] = VulkanResourceEntry{}
            index++
        }
        entryCount = 0
        logicalCount = 0
        residentCount = 0
        retiringCount = 0
        logicalBytes = 0uL
        residentBytes = 0uL
        retiredBytes = 0uL
        logicalSourceBytes = 0uL
    }

    deinit {
        Dispose()
    }

    private func InvalidateResidentEntries() int32 {
        var invalidated int32 = 0
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State == VulkanResourceState.Resident {
                residentCount--
                residentBytes -= entry.Bytes
                logicalCount++
                logicalBytes += entry.Bytes
                entries[index] = VulkanResourceEntry{
                    Id: entry.Id,
                    Source: entry.Source,
                    State: VulkanResourceState.Logical,
                    Bytes: entry.Bytes,
                    GpuGeneration: 0uL,
                    GpuHandle: 0uL,
                    DescriptorSlot: -1,
                    UploadedVersion: 0uL,
                    LastUseFence: 0uL,
                    RetireFence: 0uL,
                    LastTouch: TouchValue(),
                    Cacheable: entry.Cacheable,
                }
                invalidated++
            } else if entry.State == VulkanResourceState.Retiring {
                retiringCount--
                retiredBytes -= entry.Bytes
                logicalCount++
                logicalBytes += entry.Bytes
                entries[index] = VulkanResourceEntry{
                    Id: entry.Id,
                    Source: entry.Source,
                    State: VulkanResourceState.Logical,
                    Bytes: entry.Bytes,
                    GpuGeneration: 0uL,
                    GpuHandle: 0uL,
                    DescriptorSlot: -1,
                    UploadedVersion: 0uL,
                    LastUseFence: 0uL,
                    RetireFence: 0uL,
                    LastTouch: TouchValue(),
                    Cacheable: entry.Cacheable,
                }
                invalidated++
            }
            index++
        }
        return invalidated
    }

    private func ClearEntry(index int32, entry VulkanResourceEntry) {
        if entry.State == VulkanResourceState.Logical {
            logicalCount--
            logicalBytes -= entry.Bytes
        } else if entry.State == VulkanResourceState.Resident {
            residentCount--
            residentBytes -= entry.Bytes
        } else if entry.State == VulkanResourceState.Retiring {
            retiringCount--
            retiredBytes -= entry.Bytes
        }
        logicalSourceBytes -= entry.Source.Bytes
        entryCount--
        entries[index] = VulkanResourceEntry{}
    }

    private func FindIndex(id ResourceId) int32 {
        if !id.IsValid {
            return -1
        }
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State != VulkanResourceState.Empty
                && entry.Id.Kind == id.Kind
                && entry.Id.LogicalId == id.LogicalId
                && entry.Id.Version == id.Version {
                return index
            }
            index++
        }
        return -1
    }

    private func FindLogicalIndex(id ResourceId) int32 {
        if !id.IsValid {
            return -1
        }
        var index int32 = 0
        while index < entries.Length {
            let entry = entries[index]
            if entry.State != VulkanResourceState.Empty
                && entry.Id.Kind == id.Kind
                && entry.Id.LogicalId == id.LogicalId {
                return index
            }
            index++
        }
        return -1
    }

    private func TouchValue() uint64 {
        let value = nextTouch
        if nextTouch == uint64.MaxValue {
            nextTouch = 1uL
        } else {
            nextTouch++
        }
        return value
    }

    private func ValidateId(id ResourceId) {
        if !id.IsValid {
            throw ArgumentException("ResourceId is invalid", "id")
        }
    }

    private func ValidateSource(id ResourceId, source VulkanResourceSource) {
        if !source.IsValid || source.Version != id.Version {
            throw ArgumentException("Vulkan resource source is invalid", "source")
        }
    }

    private func SameSource(left VulkanResourceSource, right VulkanResourceSource) bool {
        return left.ProviderId == right.ProviderId
            && left.SourceId == right.SourceId
            && left.Version == right.Version
            && left.Bytes == right.Bytes
    }

    private func AddSourceCharge(bytes VkDeviceSize) {
        if bytes > logicalSourceBudget || logicalSourceBytes > logicalSourceBudget - bytes {
            throw InvalidOperationException("Vulkan logical source byte budget exceeded")
        }
        logicalSourceBytes += bytes
    }

    private func ReplaceSourceCharge(oldBytes VkDeviceSize, newBytes VkDeviceSize) {
        let withoutOld = logicalSourceBytes - oldBytes
        logicalSourceBytes = withoutOld + newBytes
    }

    private func ValidateSourceCharge(oldBytes VkDeviceSize, newBytes VkDeviceSize) {
        let withoutOld = logicalSourceBytes - oldBytes
        if newBytes > logicalSourceBudget || withoutOld > logicalSourceBudget - newBytes {
            throw InvalidOperationException("Vulkan logical source byte budget exceeded")
        }
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanResourceRegistry")
        }
    }
}

internal enum VulkanDescriptorSlotState {
    Empty;
    Bound;
    Retiring;
}

internal data struct VulkanDescriptorSlot {
    var State VulkanDescriptorSlotState
    var Resource ResourceId
    var Generation uint64
    var DescriptorToken uint64
    var RetireFence uint64
}

internal data struct VulkanDescriptorBinding {
    var Succeeded bool
    var Slot int32
    var Generation uint64
    var DescriptorToken uint64
}

internal data struct VulkanDescriptorLookup {
    var Found bool
    var Slot int32
    var Resource ResourceId
    var Generation uint64
    var DescriptorToken uint64
}

internal unsafe class VulkanDescriptorTable {
    private const MaxCapacity int32 = 1048576
    private let slots []VulkanDescriptorSlot
    private var generation uint64
    private var boundCount int32
    private var retiringCount int32
    private var disposed bool

    internal prop Generation uint64 { get { return generation } }
    internal prop BoundCount int32 { get { return boundCount } }
    internal prop RetiringCount int32 { get { return retiringCount } }

    internal init(capacity int32, initialGeneration uint64) {
        if capacity <= 0 || capacity > MaxCapacity {
            throw ArgumentOutOfRangeException("capacity")
        }
        if initialGeneration == 0uL {
            throw ArgumentOutOfRangeException("initialGeneration")
        }
        slots = [capacity]VulkanDescriptorSlot
        generation = initialGeneration
    }

    internal func Bind(resource ResourceId, descriptorToken uint64) VulkanDescriptorBinding {
        EnsureOpen()
        if !resource.IsValid || descriptorToken == 0uL {
            throw ArgumentException("Descriptor binding arguments are invalid")
        }
        var index int32 = 0
        while index < slots.Length {
            let slot = slots[index]
            if slot.State == VulkanDescriptorSlotState.Bound
                && SameResource(slot.Resource, resource) {
                slots[index] = VulkanDescriptorSlot{
                    State: slot.State,
                    Resource: resource,
                    Generation: generation,
                    DescriptorToken: descriptorToken,
                    RetireFence: slot.RetireFence,
                }
                return VulkanDescriptorBinding{
                    Succeeded: true,
                    Slot: index,
                    Generation: generation,
                    DescriptorToken: descriptorToken,
                }
            }
            index++
        }
        index = 0
        while index < slots.Length {
            if slots[index].State == VulkanDescriptorSlotState.Empty {
                slots[index] = VulkanDescriptorSlot{
                    State: VulkanDescriptorSlotState.Bound,
                    Resource: resource,
                    Generation: generation,
                    DescriptorToken: descriptorToken,
                    RetireFence: 0uL,
                }
                boundCount++
                return VulkanDescriptorBinding{
                    Succeeded: true,
                    Slot: index,
                    Generation: generation,
                    DescriptorToken: descriptorToken,
                }
            }
            index++
        }
        return VulkanDescriptorBinding{ Succeeded: false, Slot: -1 }
    }

    internal func Lookup(slotIndex int32, expectedGeneration uint64) VulkanDescriptorLookup {
        if disposed || slotIndex < 0 || slotIndex >= slots.Length {
            return VulkanDescriptorLookup{ Found: false, Slot: -1 }
        }
        let slot = slots[slotIndex]
        if slot.State != VulkanDescriptorSlotState.Bound
            || slot.Generation != expectedGeneration
            || expectedGeneration != generation {
            return VulkanDescriptorLookup{ Found: false, Slot: slotIndex }
        }
        return VulkanDescriptorLookup{
            Found: true,
            Slot: slotIndex,
            Resource: slot.Resource,
            Generation: slot.Generation,
            DescriptorToken: slot.DescriptorToken,
        }
    }

    internal func Retire(binding VulkanDescriptorBinding, fence uint64) bool {
        EnsureOpen()
        if !binding.Succeeded || binding.Slot < 0 || binding.Slot >= slots.Length {
            return false
        }
        if binding.Generation != generation {
            return false
        }
        let slot = slots[binding.Slot]
        if slot.Generation != binding.Generation || slot.DescriptorToken != binding.DescriptorToken {
            return false
        }
        if slot.State == VulkanDescriptorSlotState.Retiring {
            if fence > slot.RetireFence {
                slots[binding.Slot] = VulkanDescriptorSlot{
                    State: slot.State,
                    Resource: slot.Resource,
                    Generation: slot.Generation,
                    DescriptorToken: slot.DescriptorToken,
                    RetireFence: fence,
                }
            }
            return true
        }
        if slot.State != VulkanDescriptorSlotState.Bound {
            return false
        }
        slots[binding.Slot] = VulkanDescriptorSlot{
            State: VulkanDescriptorSlotState.Retiring,
            Resource: slot.Resource,
            Generation: slot.Generation,
            DescriptorToken: slot.DescriptorToken,
            RetireFence: fence,
        }
        boundCount--
        retiringCount++
        return true
    }

    internal func Collect(completedFence uint64) int32 {
        EnsureOpen()
        var collected int32 = 0
        var index int32 = 0
        while index < slots.Length {
            let slot = slots[index]
            if slot.State == VulkanDescriptorSlotState.Retiring && slot.RetireFence <= completedFence {
                slots[index] = VulkanDescriptorSlot{}
                retiringCount--
                collected++
            }
            index++
        }
        return collected
    }

    internal func SetGeneration(nextGeneration uint64) int32 {
        EnsureOpen()
        if nextGeneration == 0uL {
            throw ArgumentOutOfRangeException("nextGeneration")
        }
        if nextGeneration == generation {
            return 0
        }
        if nextGeneration < generation {
            throw InvalidOperationException("Vulkan descriptor generation must increase")
        }
        var invalidated int32 = 0
        var index int32 = 0
        while index < slots.Length {
            if slots[index].State != VulkanDescriptorSlotState.Empty {
                slots[index] = VulkanDescriptorSlot{}
                invalidated++
            }
            index++
        }
        boundCount = 0
        retiringCount = 0
        generation = nextGeneration
        return invalidated
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        var index int32 = 0
        while index < slots.Length {
            slots[index] = VulkanDescriptorSlot{}
            index++
        }
        boundCount = 0
        retiringCount = 0
    }

    deinit {
        Dispose()
    }

    private func SameResource(left ResourceId, right ResourceId) bool {
        return left.Kind == right.Kind
            && left.LogicalId == right.LogicalId
            && left.Version == right.Version
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanDescriptorTable")
        }
    }
}

internal enum VulkanUploadRangeState {
    Free;
    Reserved;
    Submitted;
    Completed;
}

internal data struct VulkanUploadSegment {
    var State VulkanUploadRangeState
    var Resource ResourceId
    var Version uint64
    var Generation uint64
    var StartOffset VkDeviceSize
    var DataOffset VkDeviceSize
    var Size VkDeviceSize
    var SpanSize VkDeviceSize
    var Fence uint64
    var Sequence uint64
}

internal data struct VulkanUploadReservation {
    var Succeeded bool
    var Slot int32
    var Resource ResourceId
    var Version uint64
    var Generation uint64
    var Offset VkDeviceSize
    var Size VkDeviceSize
    var SpanSize VkDeviceSize
    var Sequence uint64
}

internal data struct VulkanUploadRingStats {
    var Capacity VkDeviceSize
    var UsedBytes VkDeviceSize
    var FreeBytes VkDeviceSize
    var ActiveRanges int32
    var SubmittedRanges int32
}

internal unsafe class VulkanUploadRing {
    private const MaxRangeCapacity int32 = 1048576
    private let capacity VkDeviceSize
    private let segments []VulkanUploadSegment
    private var generation uint64
    private var head VkDeviceSize
    private var tail VkDeviceSize
    private var usedBytes VkDeviceSize
    private var activeRanges int32
    private var submittedRanges int32
    private var nextSequence uint64
    private var disposed bool

    internal prop Generation uint64 { get { return generation } }
    internal prop Stats VulkanUploadRingStats {
        get {
            return VulkanUploadRingStats{
                Capacity: capacity,
                UsedBytes: usedBytes,
                FreeBytes: capacity - usedBytes,
                ActiveRanges: activeRanges,
                SubmittedRanges: submittedRanges,
            }
        }
    }

    internal init(byteCapacity VkDeviceSize, rangeCapacity int32, initialGeneration uint64) {
        if byteCapacity == 0uL {
            throw ArgumentOutOfRangeException("byteCapacity")
        }
        if rangeCapacity <= 0 || rangeCapacity > MaxRangeCapacity {
            throw ArgumentOutOfRangeException("rangeCapacity")
        }
        if initialGeneration == 0uL {
            throw ArgumentOutOfRangeException("initialGeneration")
        }
        capacity = byteCapacity
        segments = [rangeCapacity]VulkanUploadSegment
        generation = initialGeneration
        nextSequence = 1uL
    }

    internal func Reserve(resource ResourceId, version uint64, size VkDeviceSize,
        alignment VkDeviceSize) VulkanUploadReservation {
        EnsureOpen()
        if !resource.IsValid || version == 0uL || version != resource.Version
            || size == 0uL || size > capacity || alignment == 0uL {
            throw ArgumentException("Upload reservation arguments are invalid")
        }
        if activeRanges == segments.Length || size > capacity - usedBytes {
            return VulkanUploadReservation{ Succeeded: false, Slot: -1 }
        }
        var start VkDeviceSize = 0uL
        var dataOffset VkDeviceSize = 0uL
        var span VkDeviceSize = 0uL
        if !FindOffset(size, alignment, ref start, ref dataOffset, ref span) {
            return VulkanUploadReservation{ Succeeded: false, Slot: -1 }
        }
        if span == 0uL || span > capacity - usedBytes {
            return VulkanUploadReservation{ Succeeded: false, Slot: -1 }
        }
        var slotIndex int32 = 0
        while slotIndex < segments.Length {
            if segments[slotIndex].State == VulkanUploadRangeState.Free {
                break
            }
            slotIndex++
        }
        if slotIndex >= segments.Length {
            return VulkanUploadReservation{ Succeeded: false, Slot: -1 }
        }
        let serial = nextSequence
        if nextSequence == uint64.MaxValue {
            nextSequence = 1uL
        } else {
            nextSequence++
        }
        segments[slotIndex] = VulkanUploadSegment{
            State: VulkanUploadRangeState.Reserved,
            Resource: resource,
            Version: version,
            Generation: generation,
            StartOffset: start,
            DataOffset: dataOffset,
            Size: size,
            SpanSize: span,
            Fence: 0uL,
            Sequence: serial,
        }
        activeRanges++
        usedBytes += span
        head = (start + span) % capacity
        return VulkanUploadReservation{
            Succeeded: true,
            Slot: slotIndex,
            Resource: resource,
            Version: version,
            Generation: generation,
            Offset: dataOffset,
            Size: size,
            SpanSize: span,
            Sequence: serial,
        }
    }

    internal func MarkSubmitted(reservation VulkanUploadReservation, fence uint64) bool {
        EnsureOpen()
        if !reservation.Succeeded || reservation.Slot < 0 || reservation.Slot >= segments.Length {
            return false
        }
        let segment = segments[reservation.Slot]
        if segment.State != VulkanUploadRangeState.Reserved
            || reservation.Generation != generation
            || segment.Generation != generation
            || segment.Resource.Kind != reservation.Resource.Kind
            || segment.Resource.LogicalId != reservation.Resource.LogicalId
            || segment.Resource.Version != reservation.Resource.Version
            || segment.Version != reservation.Version
            || segment.DataOffset != reservation.Offset
            || segment.Size != reservation.Size
            || segment.SpanSize != reservation.SpanSize
            || segment.Sequence != reservation.Sequence {
            return false
        }
        segments[reservation.Slot] = VulkanUploadSegment{
            State: VulkanUploadRangeState.Submitted,
            Resource: segment.Resource,
            Version: segment.Version,
            Generation: segment.Generation,
            StartOffset: segment.StartOffset,
            DataOffset: segment.DataOffset,
            Size: segment.Size,
            SpanSize: segment.SpanSize,
            Fence: fence,
            Sequence: segment.Sequence,
        }
        submittedRanges++
        return true
    }

    internal func Cancel(reservation VulkanUploadReservation) bool {
        EnsureOpen()
        if !reservation.Succeeded || reservation.Slot < 0 || reservation.Slot >= segments.Length {
            return false
        }
        let segment = segments[reservation.Slot]
        if segment.State != VulkanUploadRangeState.Reserved
            || reservation.Generation != generation
            || segment.Generation != generation
            || segment.Resource.Kind != reservation.Resource.Kind
            || segment.Resource.LogicalId != reservation.Resource.LogicalId
            || segment.Resource.Version != reservation.Resource.Version
            || segment.Version != reservation.Version
            || segment.DataOffset != reservation.Offset
            || segment.Size != reservation.Size
            || segment.SpanSize != reservation.SpanSize
            || segment.Sequence != reservation.Sequence {
            return false
        }
        segments[reservation.Slot] = VulkanUploadSegment{
            State: VulkanUploadRangeState.Completed,
            Resource: segment.Resource,
            Version: segment.Version,
            Generation: segment.Generation,
            StartOffset: segment.StartOffset,
            DataOffset: segment.DataOffset,
            Size: segment.Size,
            SpanSize: segment.SpanSize,
            Fence: 0uL,
            Sequence: segment.Sequence,
        }
        return true
    }

    internal func Collect(completedFence uint64) int32 {
        EnsureOpen()
        var index int32 = 0
        while index < segments.Length {
            let segment = segments[index]
            if segment.State == VulkanUploadRangeState.Submitted && segment.Fence <= completedFence {
                segments[index] = VulkanUploadSegment{
                    State: VulkanUploadRangeState.Completed,
                    Resource: segment.Resource,
                    Version: segment.Version,
                    Generation: segment.Generation,
                    StartOffset: segment.StartOffset,
                    DataOffset: segment.DataOffset,
                    Size: segment.Size,
                    SpanSize: segment.SpanSize,
                    Fence: segment.Fence,
                    Sequence: segment.Sequence,
                }
                submittedRanges--
            }
            index++
        }
        var collected int32 = 0
        while true {
            var oldestIndex int32 = -1
            var oldestSequence uint64 = uint64.MaxValue
            index = 0
            while index < segments.Length {
                let segment = segments[index]
                if segment.State != VulkanUploadRangeState.Free && segment.Sequence < oldestSequence {
                    oldestIndex = index
                    oldestSequence = segment.Sequence
                }
                index++
            }
            if oldestIndex < 0 || segments[oldestIndex].State != VulkanUploadRangeState.Completed {
                break
            }
            let completedSegment = segments[oldestIndex]
            tail = (completedSegment.StartOffset + completedSegment.SpanSize) % capacity
            usedBytes -= completedSegment.SpanSize
            activeRanges--
            segments[oldestIndex] = VulkanUploadSegment{}
            collected++
        }
        if activeRanges == 0 {
            head = 0uL
            tail = 0uL
            usedBytes = 0uL
        }
        return collected
    }

    internal func SetGeneration(nextGeneration uint64) int32 {
        EnsureOpen()
        if nextGeneration == 0uL {
            throw ArgumentOutOfRangeException("nextGeneration")
        }
        if nextGeneration == generation {
            return 0
        }
        if nextGeneration < generation {
            throw InvalidOperationException("Vulkan upload generation must increase")
        }
        var invalidated int32 = 0
        var index int32 = 0
        while index < segments.Length {
            if segments[index].State != VulkanUploadRangeState.Free {
                invalidated++
                segments[index] = VulkanUploadSegment{}
            }
            index++
        }
        generation = nextGeneration
        head = 0uL
        tail = 0uL
        usedBytes = 0uL
        activeRanges = 0
        submittedRanges = 0
        return invalidated
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        var index int32 = 0
        while index < segments.Length {
            segments[index] = VulkanUploadSegment{}
            index++
        }
        head = 0uL
        tail = 0uL
        usedBytes = 0uL
        activeRanges = 0
        submittedRanges = 0
    }

    deinit {
        Dispose()
    }

    private func FindOffset(size VkDeviceSize, alignment VkDeviceSize,
        ref start VkDeviceSize, ref dataOffset VkDeviceSize, ref span VkDeviceSize) bool {
        if activeRanges == 0 {
            let aligned = Align(0uL, alignment)
            if aligned > capacity || size > capacity - aligned {
                return false
            }
            start = 0uL
            dataOffset = aligned
            span = aligned + size
            return true
        }
        if head == tail {
            return false
        }
        if head >= tail {
            let aligned = Align(head, alignment)
            if aligned <= capacity && size <= capacity - aligned {
                start = head
                dataOffset = aligned
                span = (aligned - head) + size
                return true
            }
            if size <= tail {
                let wrapSize = capacity - head
                if wrapSize > uint64.MaxValue - size {
                    return false
                }
                start = head
                dataOffset = 0uL
                span = wrapSize + size
                return true
            }
            return false
        }
        let aligned = Align(head, alignment)
        if aligned >= tail || size > tail - aligned {
            return false
        }
        start = head
        dataOffset = aligned
        span = (aligned - head) + size
        return true
    }

    private func Align(value VkDeviceSize, alignment VkDeviceSize) VkDeviceSize {
        let remainder = value % alignment
        if remainder == 0uL {
            return value
        }
        let padding = alignment - remainder
        if value > uint64.MaxValue - padding {
            return uint64.MaxValue
        }
        return value + padding
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanUploadRing")
        }
    }
}
