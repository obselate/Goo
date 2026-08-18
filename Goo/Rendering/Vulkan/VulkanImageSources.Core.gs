package Goo

import System

internal unsafe partial class VulkanImageSourceProvider : IDisposable {
    private const MaxCapacity int32 = 1048576

    private let providerId uint64
    private let ownerThreadId int32
    private let sourceCapacity int32
    private let leaseCapacity int32
    private let byteBudget VkDeviceSize
    private let sources []VulkanImageSourceEntry
    private let leaseSlots []VulkanImageSourceLeaseSlot
    private var sourceCount int32
    private var pendingCount int32
    private var readyCount int32
    private var failedCount int32
    private var disposedCount int32
    private var activeLeaseCount int32
    private var retainedBytes VkDeviceSize
    private var nextLeaseToken uint64
    private var disposed bool

    internal prop ProviderId uint64 {
        get {
            EnsureOwnerThread()
            return providerId
        }
    }
    internal prop IsDisposed bool {
        get {
            EnsureOwnerThread()
            return disposed
        }
    }

    internal prop Stats VulkanImageSourceProviderStats {
        get {
            EnsureOwnerThread()
            return VulkanImageSourceProviderStats{
                ProviderId: providerId,
                SourceCapacity: sourceCapacity,
                LeaseCapacity: leaseCapacity,
                SourceCount: sourceCount,
                PendingCount: pendingCount,
                ReadyCount: readyCount,
                FailedCount: failedCount,
                DisposedCount: disposedCount,
                ActiveLeaseCount: activeLeaseCount,
                RetainedBytes: retainedBytes,
                ByteBudget: byteBudget,
                Disposed: disposed,
            }
        }
    }

    internal init(id uint64, maximumSources int32, maximumLeases int32,
        maximumRetainedBytes VkDeviceSize) {
        if id == 0uL {
            throw ArgumentOutOfRangeException("id")
        }
        if maximumSources <= 0 || maximumSources > MaxCapacity {
            throw ArgumentOutOfRangeException("maximumSources")
        }
        if maximumLeases <= 0 || maximumLeases > MaxCapacity {
            throw ArgumentOutOfRangeException("maximumLeases")
        }
        if maximumRetainedBytes == 0uL {
            throw ArgumentOutOfRangeException("maximumRetainedBytes")
        }

        providerId = id
        ownerThreadId = Environment.CurrentManagedThreadId
        sourceCapacity = maximumSources
        leaseCapacity = maximumLeases
        byteBudget = maximumRetainedBytes
        sources = [maximumSources]VulkanImageSourceEntry
        leaseSlots = [maximumLeases]VulkanImageSourceLeaseSlot
        nextLeaseToken = 1uL
    }

    internal func Begin(sourceId uint64, contentVersion uint64) bool {
        EnsureOpen()
        if sourceId == 0uL || contentVersion == 0uL {
            return false
        }

        let exactIndex = FindExact(sourceId, contentVersion)
        if exactIndex >= 0 {
            let exactState = sources[exactIndex].State
            if exactState == VulkanImageSourceState.Pending || exactState == VulkanImageSourceState.Ready {
                return true
            }
            if exactState == VulkanImageSourceState.Failed {
                return false
            }
            if exactState == VulkanImageSourceState.Disposed && sources[exactIndex].LeaseCount == 0 {
                InitializePending(exactIndex, sourceId, contentVersion)
                return true
            }
        }

        let latestVersion = FindLatestVersion(sourceId)
        if latestVersion > contentVersion {
            return false
        }

        let replacingOlderVersion = latestVersion != 0uL && latestVersion < contentVersion
        var freeIndex = FindReusableIndex()
        if freeIndex < 0 && replacingOlderVersion {
            let stalePendingIndex = FindStalePendingIndex(sourceId, contentVersion)
            if stalePendingIndex >= 0 {
                SetFailed(stalePendingIndex)
                freeIndex = FindReusableIndex()
            }
        }
        if freeIndex < 0 {
            return false
        }

        if replacingOlderVersion {
            var index int32 = 0
            while index < sources.Length {
                let entry = sources[index]
                if entry.Key.SourceId == sourceId && entry.Key.ContentVersion < contentVersion
                    && entry.State == VulkanImageSourceState.Pending {
                    SetFailed(index)
                }
                index++
            }
        }

        InitializePending(freeIndex, sourceId, contentVersion)
        return true
    }

    internal func CompletePremultipliedRgba(sourceId uint64, contentVersion uint64,
        width uint32, height uint32, pixels []?uint8) bool {
        EnsureOwnerThread()
        if disposed || sourceId == 0uL || contentVersion == 0uL {
            return false
        }

        let sourceIndex = FindExact(sourceId, contentVersion)
        if sourceIndex < 0 || sources[sourceIndex].State != VulkanImageSourceState.Pending {
            return false
        }
        let expectedBytes = PixelByteCount(width, height)
        if expectedBytes == 0uL || pixels == nil || uint64(pixels!!.Length) != uint64(expectedBytes) {
            SetFailed(sourceIndex)
            return false
        }
        if expectedBytes > uint64(byteBudget)
            || retainedBytes > byteBudget - VkDeviceSize(expectedBytes) {
            SetFailed(sourceIndex)
            return false
        }
        if expectedBytes > uint64(2147483647) {
            SetFailed(sourceIndex)
            return false
        }

        var index int32 = 0
        while index < pixels!!.Length {
            let alpha = pixels!![index + 3]
            if pixels!![index] > alpha || pixels!![index + 1] > alpha
                || pixels!![index + 2] > alpha {
                SetFailed(sourceIndex)
                return false
            }
            index += 4
        }

        let owned = [int32(expectedBytes)]uint8
        index = 0
        while index < owned.Length {
            owned[index] = pixels!![index]
            index++
        }

        sources[sourceIndex].Width = width
        sources[sourceIndex].Height = height
        sources[sourceIndex].Bytes = VkDeviceSize(expectedBytes)
        sources[sourceIndex].Pixels = owned
        retainedBytes += VkDeviceSize(expectedBytes)
        SetSourceState(sourceIndex, VulkanImageSourceState.Ready)
        return true
    }

    internal func Fail(sourceId uint64, contentVersion uint64) bool {
        EnsureOwnerThread()
        if disposed || sourceId == 0uL || contentVersion == 0uL {
            return false
        }
        let sourceIndex = FindExact(sourceId, contentVersion)
        if sourceIndex < 0 || sources[sourceIndex].State != VulkanImageSourceState.Pending {
            return false
        }
        SetFailed(sourceIndex)
        return true
    }

    internal func Lookup(sourceId uint64, contentVersion uint64) VulkanImageSourceLookup {
        EnsureOwnerThread()
        if sourceId == 0uL || contentVersion == 0uL {
            return VulkanImageSourceLookup{}
        }
        let sourceIndex = FindExact(sourceId, contentVersion)
        if sourceIndex < 0 {
            return VulkanImageSourceLookup{}
        }
        let entry = sources[sourceIndex]
        return VulkanImageSourceLookup{
            Found: entry.State != VulkanImageSourceState.Empty,
            Key: entry.Key,
            State: entry.State,
            Width: entry.Width,
            Height: entry.Height,
            Bytes: entry.Bytes,
            HasPixels: entry.Pixels != nil,
            LeaseCount: entry.LeaseCount,
        }
    }

    internal func Acquire(sourceId uint64, contentVersion uint64) VulkanImageSourceLease? {
        EnsureOwnerThread()
        if disposed || sourceId == 0uL || contentVersion == 0uL {
            return nil
        }
        let sourceIndex = FindExact(sourceId, contentVersion)
        if sourceIndex < 0 {
            return nil
        }
        let sourceState = sources[sourceIndex].State
        if sourceState == VulkanImageSourceState.Empty || sourceState == VulkanImageSourceState.Disposed {
            return nil
        }

        var leaseIndex int32 = 0
        while leaseIndex < leaseSlots.Length {
            if !leaseSlots[leaseIndex].Active {
                let leaseToken = NextLeaseToken()
                leaseSlots[leaseIndex] = VulkanImageSourceLeaseSlot{
                    Active: true,
                    SourceIndex: sourceIndex,
                    Token: leaseToken,
                }
                sources[sourceIndex].LeaseCount++
                activeLeaseCount++
                return VulkanImageSourceLease(this, leaseIndex, leaseToken)
            }
            leaseIndex++
        }
        return nil
    }

    internal func Evict(sourceId uint64, contentVersion uint64) bool {
        EnsureOpen()
        if sourceId == 0uL || contentVersion == 0uL {
            return false
        }
        let sourceIndex = FindExact(sourceId, contentVersion)
        if sourceIndex < 0 || sources[sourceIndex].LeaseCount != 0 {
            return false
        }
        DisposeEntry(sourceIndex)
        return true
    }

    public func Dispose() {
        EnsureOwnerThread()
        if disposed {
            return
        }
        disposed = true
        var index int32 = 0
        while index < sources.Length {
            if sources[index].State != VulkanImageSourceState.Empty {
                if sources[index].LeaseCount == 0 && sources[index].Pixels != nil {
                    retainedBytes -= sources[index].Bytes
                    sources[index].Pixels = nil
                    sources[index].Width = 0u
                    sources[index].Height = 0u
                    sources[index].Bytes = 0uL
                }
                SetSourceState(index, VulkanImageSourceState.Disposed)
            }
            index++
        }
    }

    internal func LeaseState(leaseIndex int32, leaseToken uint64) VulkanImageSourceState {
        let sourceIndex = ValidLeaseSourceIndex(leaseIndex, leaseToken)
        if sourceIndex < 0 {
            return VulkanImageSourceState.Disposed
        }
        if sources[sourceIndex].State == VulkanImageSourceState.Disposed
            && sources[sourceIndex].Pixels != nil {
            return VulkanImageSourceState.Ready
        }
        return sources[sourceIndex].State
    }

    internal func LeaseKey(leaseIndex int32, leaseToken uint64) VulkanImageSourceKey {
        let sourceIndex = ValidLeaseSourceIndex(leaseIndex, leaseToken)
        if sourceIndex < 0 {
            return VulkanImageSourceKey{}
        }
        return sources[sourceIndex].Key
    }

    internal func LeaseWidth(leaseIndex int32, leaseToken uint64) uint32 {
        let sourceIndex = ValidLeaseSourceIndex(leaseIndex, leaseToken)
        if sourceIndex < 0 {
            return 0u
        }
        return sources[sourceIndex].Width
    }

    internal func LeaseHeight(leaseIndex int32, leaseToken uint64) uint32 {
        let sourceIndex = ValidLeaseSourceIndex(leaseIndex, leaseToken)
        if sourceIndex < 0 {
            return 0u
        }
        return sources[sourceIndex].Height
    }

    internal func LeaseBytes(leaseIndex int32, leaseToken uint64) VkDeviceSize {
        let sourceIndex = ValidLeaseSourceIndex(leaseIndex, leaseToken)
        if sourceIndex < 0 {
            return 0uL
        }
        return sources[sourceIndex].Bytes
    }

    internal func CopyLeasePixelsTo(leaseIndex int32, leaseToken uint64,
        destination *uint8, byteCount VkDeviceSize) bool {
        EnsureOwnerThread()
        let sourceIndex = ValidLeaseSourceIndex(leaseIndex, leaseToken)
        if sourceIndex < 0 {
            return false
        }
        return CopyPixelsFromEntry(sourceIndex, destination, byteCount)
    }

    internal func IsLeaseValid(leaseIndex int32, leaseToken uint64) bool {
        EnsureOwnerThread()
        return ValidLeaseSourceIndex(leaseIndex, leaseToken) >= 0
    }

    internal func ReleaseLease(leaseIndex int32, leaseToken uint64) {
        EnsureOwnerThread()
        if leaseIndex < 0 || leaseIndex >= leaseSlots.Length {
            return
        }
        let slot = leaseSlots[leaseIndex]
        if !slot.Active || slot.Token != leaseToken {
            return
        }
        let sourceIndex = slot.SourceIndex
        leaseSlots[leaseIndex] = VulkanImageSourceLeaseSlot{}
        activeLeaseCount--
        if sourceIndex >= 0 && sourceIndex < sources.Length {
            if sources[sourceIndex].LeaseCount != 0 {
                sources[sourceIndex].LeaseCount--
            }
            if disposed && sources[sourceIndex].LeaseCount == 0 {
                ClearEntry(sourceIndex)
            }
        }
    }

    internal func EnsureOwnerThread() {
        if Environment.CurrentManagedThreadId != ownerThreadId {
            throw InvalidOperationException("Vulkan image source provider used from a non-owner thread")
        }
    }

}
