package Goo

import System

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

  internal prop Generation uint64{ get -> generation }
  internal prop BoundCount int32{ get -> boundCount }
  internal prop RetiringCount int32{ get -> retiringCount }

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
          if slot.Generation != generation || slot.DescriptorToken != descriptorToken {
            throw InvalidOperationException("Vulkan descriptor binding conflicts with an active slot")
          }
          return VulkanDescriptorBinding{
            Succeeded: true,
            Slot: index,
            Generation: slot.Generation,
            DescriptorToken: slot.DescriptorToken,
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
      || expectedGeneration != generation{
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

  deinit{
    Dispose()
  }

  private func SameResource(left ResourceId, right ResourceId) bool -> left.Kind == right.Kind
    && left.LogicalId == right.LogicalId
    && left.Version == right.Version

  private func EnsureOpen() {
    if disposed {
      throw ObjectDisposedException("VulkanDescriptorTable")
    }
  }
}
