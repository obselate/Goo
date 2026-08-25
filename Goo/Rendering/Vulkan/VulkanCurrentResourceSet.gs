package Goo

import System

internal class VulkanCurrentResourceSet {
  private const UnlimitedCapacity int32 = 0

  private var current []ResourceId
  private var pending []ResourceId
  private let maximumCapacity int32
  private var currentCount int32
  private var pendingCount int32

  internal init(initialCapacity int32, nativeMaximumCapacity int32) {
    if initialCapacity <= 0 {
      throw ArgumentOutOfRangeException("initialCapacity")
    }
    if nativeMaximumCapacity < 0
      || (nativeMaximumCapacity != UnlimitedCapacity
        && nativeMaximumCapacity < initialCapacity) {
      throw ArgumentOutOfRangeException("nativeMaximumCapacity")
    }
    current = [initialCapacity]ResourceId
    pending = [initialCapacity]ResourceId
    maximumCapacity = nativeMaximumCapacity
  }

  internal prop Current []ResourceId {
    get -> current
  }

  internal prop CurrentCount int32 {
    get -> currentCount
  }

  internal prop PendingCount int32 {
    get -> pendingCount
  }

  internal func Begin() {
    pendingCount = 0
  }

  internal func EnsureCanAdd(id ResourceId) {
    if PendingContains(id) {
      return
    }
    EnsureCapacity(pendingCount + 1)
  }

  internal func Add(id ResourceId) bool {
    if PendingContains(id) {
      return false
    }
    EnsureCapacity(pendingCount + 1)
    pending[pendingCount] = id
    pendingCount = pendingCount + 1
    return true
  }

  internal func CurrentAt(index int32) ResourceId {
    if index < 0 || index >= currentCount {
      throw ArgumentOutOfRangeException("index")
    }
    return current[index]
  }

  internal func PendingAt(index int32) ResourceId {
    if index < 0 || index >= pendingCount {
      throw ArgumentOutOfRangeException("index")
    }
    return pending[index]
  }

  internal func CurrentContains(id ResourceId) bool
    -> Contains(current, currentCount, id)

  internal func PendingContains(id ResourceId) bool
    -> Contains(pending, pendingCount, id)

  internal func Commit() {
    EnsureCapacity(pendingCount)
    Array.Copy(pending, current, pendingCount)
    currentCount = pendingCount
  }

  internal func Reset() {
    currentCount = 0
    pendingCount = 0
  }

  private func EnsureCapacity(required int32) {
    if required <= current.Length && required <= pending.Length {
      return
    }
    if maximumCapacity != UnlimitedCapacity && required > maximumCapacity {
      throw InvalidOperationException("Vulkan current resource capacity reached")
    }
    var capacity = current.Length
    if capacity < pending.Length {
      capacity = pending.Length
    }
    while capacity < required {
      if capacity > Int32.MaxValue / 2 {
        capacity = required
      } else {
        capacity = capacity * 2
      }
      if maximumCapacity != UnlimitedCapacity && capacity > maximumCapacity {
        capacity = maximumCapacity
      }
    }
    let nextCurrent = [capacity]ResourceId
    let nextPending = [capacity]ResourceId
    Array.Copy(current, nextCurrent, currentCount)
    Array.Copy(pending, nextPending, pendingCount)
    current = nextCurrent
    pending = nextPending
  }

  private func Contains(values []ResourceId, count int32, id ResourceId) bool {
    var index int32 = 0
    while index < count {
      let currentId = values[index]
      if currentId.Kind == id.Kind && currentId.LogicalId == id.LogicalId
        && currentId.Version == id.Version {
        return true
      }
      index = index + 1
    }
    return false
  }
}
