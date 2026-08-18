package Goo

import System

internal unsafe partial class VulkanImageSourceProvider : IDisposable {
    private func EnsureOpen() {
        EnsureOwnerThread()
        if disposed {
            throw ObjectDisposedException(nameof(VulkanImageSourceProvider))
        }
    }

    private func NextLeaseToken() uint64 {
        let value = nextLeaseToken
        nextLeaseToken++
        if nextLeaseToken == 0uL {
            nextLeaseToken = 1uL
        }
        return value
    }

    private func FindExact(sourceId uint64, contentVersion uint64) int32 {
        var index int32 = 0
        while index < sources.Length {
            let entry = sources[index]
            if entry.State != VulkanImageSourceState.Empty
                && entry.Key.SourceId == sourceId
                && entry.Key.ContentVersion == contentVersion {
                return index
            }
            index++
        }
        return -1
    }

    private func FindLatestVersion(sourceId uint64) uint64 {
        var latest uint64
        var index int32 = 0
        while index < sources.Length {
            let entry = sources[index]
            if entry.State != VulkanImageSourceState.Empty && entry.Key.SourceId == sourceId
                && entry.Key.ContentVersion > latest {
                latest = entry.Key.ContentVersion
            }
            index++
        }
        return latest
    }

    private func FindStalePendingIndex(sourceId uint64, contentVersion uint64) int32 {
        var index int32 = 0
        while index < sources.Length {
            let entry = sources[index]
            if entry.State == VulkanImageSourceState.Pending && entry.LeaseCount == 0
                && entry.Key.SourceId == sourceId && entry.Key.ContentVersion < contentVersion {
                return index
            }
            index++
        }
        return -1
    }

    private func FindReusableIndex() int32 {
        var index int32 = 0
        while index < sources.Length {
            if sources[index].State == VulkanImageSourceState.Empty {
                return index
            }
            index++
        }
        index = 0
        while index < sources.Length {
            let entry = sources[index]
            if entry.LeaseCount == 0 && (entry.State == VulkanImageSourceState.Disposed
                || entry.State == VulkanImageSourceState.Failed) {
                ClearEntry(index)
                return index
            }
            index++
        }
        index = 0
        while index < sources.Length {
            if sources[index].LeaseCount == 0 && sources[index].State == VulkanImageSourceState.Ready {
                ClearEntry(index)
                return index
            }
            index++
        }
        return -1
    }

    private func InitializePending(index int32, sourceId uint64, contentVersion uint64) {
        ClearEntry(index)
        sources[index].Key = VulkanImageSourceKey{
            ProviderId: providerId,
            SourceId: sourceId,
            ContentVersion: contentVersion,
        }
        SetSourceState(index, VulkanImageSourceState.Pending)
    }

    private func SetFailed(index int32) {
        if sources[index].Pixels != nil {
            retainedBytes -= sources[index].Bytes
            sources[index].Pixels = nil
        }
        sources[index].Width = 0u
        sources[index].Height = 0u
        sources[index].Bytes = 0uL
        SetSourceState(index, VulkanImageSourceState.Failed)
    }

    private func SetSourceState(index int32, nextState VulkanImageSourceState) {
        let priorState = sources[index].State
        if priorState == nextState {
            return
        }
        if priorState == VulkanImageSourceState.Empty {
            sourceCount++
        } else if priorState == VulkanImageSourceState.Pending {
            pendingCount--
        } else if priorState == VulkanImageSourceState.Ready {
            readyCount--
        } else if priorState == VulkanImageSourceState.Failed {
            failedCount--
        } else if priorState == VulkanImageSourceState.Disposed {
            disposedCount--
        }
        if nextState == VulkanImageSourceState.Empty {
            sourceCount--
        } else if nextState == VulkanImageSourceState.Pending {
            pendingCount++
        } else if nextState == VulkanImageSourceState.Ready {
            readyCount++
        } else if nextState == VulkanImageSourceState.Failed {
            failedCount++
        } else if nextState == VulkanImageSourceState.Disposed {
            disposedCount++
        }
        sources[index].State = nextState
    }

    private func ClearEntry(index int32) {
        if sources[index].Pixels != nil {
            retainedBytes -= sources[index].Bytes
        }
        sources[index].Key = VulkanImageSourceKey{}
        sources[index].Width = 0u
        sources[index].Height = 0u
        sources[index].Bytes = 0uL
        sources[index].Pixels = nil
        sources[index].LeaseCount = 0
        SetSourceState(index, VulkanImageSourceState.Empty)
    }

    private func DisposeEntry(index int32) {
        if sources[index].Pixels != nil {
            retainedBytes -= sources[index].Bytes
            sources[index].Pixels = nil
            sources[index].Width = 0u
            sources[index].Height = 0u
            sources[index].Bytes = 0uL
        }
        SetSourceState(index, VulkanImageSourceState.Disposed)
    }

    private func ValidLeaseSourceIndex(leaseIndex int32, leaseToken uint64) int32 {
        EnsureOwnerThread()
        if leaseIndex < 0 || leaseIndex >= leaseSlots.Length {
            return -1
        }
        let slot = leaseSlots[leaseIndex]
        if !slot.Active || slot.Token != leaseToken {
            return -1
        }
        if slot.SourceIndex < 0 || slot.SourceIndex >= sources.Length {
            return -1
        }
        return slot.SourceIndex
    }

    private func CopyPixelsFromEntry(sourceIndex int32, destination *uint8,
        byteCount VkDeviceSize) bool {
        if sourceIndex < 0 || sourceIndex >= sources.Length || destination == nil {
            return false
        }
        let entry = sources[sourceIndex]
        if (entry.State != VulkanImageSourceState.Ready
            && entry.State != VulkanImageSourceState.Disposed)
            || entry.Pixels == nil || byteCount != entry.Bytes {
            return false
        }
        let pixels = entry.Pixels!!
        var index int32 = 0
        while index < pixels.Length {
            destination[index] = pixels[index]
            index++
        }
        return true
    }

    private func PixelByteCount(width uint32, height uint32) uint64 {
        if width == 0u || height == 0u {
            return 0uL
        }
        let widthValue = uint64(width)
        let heightValue = uint64(height)
        if widthValue > uint64.MaxValue / 4uL {
            return 0uL
        }
        let rowBytes = widthValue * 4uL
        if heightValue > uint64.MaxValue / rowBytes {
            return 0uL
        }
        return rowBytes * heightValue
    }

    deinit {
        if Environment.CurrentManagedThreadId == ownerThreadId {
            Dispose()
        }
    }
}
