package Goo

internal sealed class VulkanObjectAccounting {
    private let parent VulkanObjectAccounting?
    private let synchronization object
    private var liveCount uint64
    private var allocationCount uint64

    internal init(nativeParent VulkanObjectAccounting?) {
        parent = nativeParent
        if let currentParent = nativeParent {
            synchronization = currentParent.synchronization
        } else {
            synchronization = Object()
        }
    }

    internal prop LiveCount uint64 {
        get {
            lock (synchronization) { return liveCount }
        }
    }
    internal prop AllocationCount uint64 {
        get {
            lock (synchronization) { return allocationCount }
        }
    }

    internal func Allocate() {
        lock (synchronization) {
            EnsureCapacity(liveCount, allocationCount)
            if let currentParent = parent {
                EnsureCapacity(currentParent.liveCount, currentParent.allocationCount)
            }
            liveCount++
            allocationCount++
            if let currentParent = parent {
                currentParent.liveCount++
                currentParent.allocationCount++
            }
        }
    }

    internal func Release() {
        lock (synchronization) {
            if liveCount == 0uL {
                throw InvalidOperationException("Vulkan object accounting live count underflow")
            }
            if let currentParent = parent {
                if currentParent.liveCount == 0uL {
                    throw InvalidOperationException("Vulkan process object accounting live count underflow")
                }
                currentParent.liveCount--
            }
            liveCount--
        }
    }

    private func EnsureCapacity(live uint64, allocations uint64) {
        if live == uint64.MaxValue || allocations == uint64.MaxValue {
            throw OverflowException("Vulkan object accounting counter overflow")
        }
    }
}
