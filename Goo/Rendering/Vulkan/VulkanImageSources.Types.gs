package Goo

import System

internal enum VulkanImageSourceState {
    Empty;
    Pending;
    Ready;
    Failed;
    Disposed;
}

internal data struct VulkanImageSourceKey {
    var ProviderId uint64
    var SourceId uint64
    var ContentVersion uint64

    internal prop IsValid bool {
        get {
            return ProviderId != 0uL && SourceId != 0uL && ContentVersion != 0uL
        }
    }
}

internal data struct VulkanImageSourceLookup {
    var Found bool
    var Key VulkanImageSourceKey
    var State VulkanImageSourceState
    var Width uint32
    var Height uint32
    var Bytes VkDeviceSize
    var HasPixels bool
    var LeaseCount int32
}

internal data struct VulkanImageSourceProviderStats {
    var ProviderId uint64
    var SourceCapacity int32
    var LeaseCapacity int32
    var SourceCount int32
    var PendingCount int32
    var ReadyCount int32
    var FailedCount int32
    var DisposedCount int32
    var ActiveLeaseCount int32
    var RetainedBytes VkDeviceSize
    var ByteBudget VkDeviceSize
    var Disposed bool
}

internal data struct VulkanImageSourceEntry {
    var Key VulkanImageSourceKey
    var State VulkanImageSourceState
    var Width uint32
    var Height uint32
    var Bytes VkDeviceSize
    var Pixels []?uint8
    var LeaseCount int32
}

internal data struct VulkanImageSourceLeaseSlot {
    var Active bool
    var SourceIndex int32
    var Token uint64
}

internal unsafe struct VulkanImageSourceLease {
    private var provider VulkanImageSourceProvider?
    private var slot int32
    private var token uint64
    private var valid bool

    internal init(owner VulkanImageSourceProvider, leaseSlot int32, leaseToken uint64) {
        provider = owner
        slot = leaseSlot
        token = leaseToken
        valid = true
    }

    internal prop IsValid bool {
        get {
            if !EnsureOwnerForAccess() || !valid {
                return false
            }
            return provider!!.IsLeaseValid(slot, token)
        }
    }

    internal prop IsDisposed bool { get { return !IsValid } }

    internal prop State VulkanImageSourceState {
        get {
            if !EnsureOwnerForAccess() || !valid {
                return VulkanImageSourceState.Disposed
            }
            return provider!!.LeaseState(slot, token)
        }
    }

    internal prop IsReady bool {
        get { return State == VulkanImageSourceState.Ready }
    }

    internal prop IsFailed bool {
        get { return State == VulkanImageSourceState.Failed }
    }

    internal prop Key VulkanImageSourceKey {
        get {
            if !EnsureOwnerForAccess() || !valid {
                return VulkanImageSourceKey{}
            }
            return provider!!.LeaseKey(slot, token)
        }
    }

    internal prop Width uint32 {
        get {
            if !EnsureOwnerForAccess() || !valid {
                return 0u
            }
            return provider!!.LeaseWidth(slot, token)
        }
    }

    internal prop Height uint32 {
        get {
            if !EnsureOwnerForAccess() || !valid {
                return 0u
            }
            return provider!!.LeaseHeight(slot, token)
        }
    }

    internal prop ByteCount VkDeviceSize {
        get {
            if !EnsureOwnerForAccess() || !valid {
                return 0uL
            }
            return provider!!.LeaseBytes(slot, token)
        }
    }

    internal func CopyPixelsTo(destination *uint8, byteCount VkDeviceSize) bool {
        if !EnsureOwnerForAccess() || !valid {
            return false
        }
        return provider!!.CopyLeasePixelsTo(slot, token, destination, byteCount)
    }

    internal func Dispose() {
        if !EnsureOwnerForAccess() {
            return
        }
        provider!!.ReleaseLease(slot, token)
        valid = false
    }

    private func EnsureOwnerForAccess() bool {
        if provider == nil {
            return false
        }
        provider!!.EnsureOwnerThread()
        return true
    }
}
