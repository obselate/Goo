package Goo

import System
import System.Runtime.InteropServices

internal data struct VulkanPrimitiveFrameStats {
  var SlotIndex int32
  var RecordCount int32
  var ByteCount VkDeviceSize
  var Capacity VkDeviceSize
  var BufferGeneration uint64
  var WrittenBytes VkDeviceSize
  var SkippedBytes VkDeviceSize
  var DirtyRecordCount int32
  var UploadRangeCount int32
  var FullUpload bool
  var MappedWrites uint64
  var Flushes uint64
  var RetainedReuse uint64
  var LastUseSerial uint64
  var Prepared bool

  var TotalWrittenBytes VkDeviceSize
  var TotalSkippedBytes VkDeviceSize
  var TotalDirtyRecordCount uint64
  var TotalUploadRangeCount uint64
  var TotalFullUploads uint64
  var TotalMappedWrites uint64
  var TotalFlushes uint64
  var TotalRetainedReuse uint64
}

internal unsafe sealed class VulkanPrimitiveFrameSlot : IDisposable {
  internal let Device VkDevice
  internal let Dispatch VkDeviceDispatch
  internal let Allocator VulkanMemoryAllocator
  internal let ObjectAccounting VulkanObjectAccounting?
  internal var StagingBuffer VkBuffer = 0uL
  internal var StagingAllocation VulkanMemoryAllocation? = nil
  internal var Buffer VkBuffer = 0uL
  internal var Allocation VulkanMemoryAllocation? = nil
  internal var Capacity VkDeviceSize
  internal var BufferGeneration uint64
  internal var LastUseGlobalSubmissionSerial uint64
  internal var Prepared bool
  internal var Recorded bool
  internal var Submitted bool
  internal var RecordedCommandBuffer VkCommandBuffer
  internal var PreparedByteCount VkDeviceSize
  internal var PreparedRecordCount int32
  internal var PreparedRecordRegionByteCount VkDeviceSize
  internal var PreparedEffectDataByteCount VkDeviceSize
  internal var FlushPrepared bool
  internal var HistoryWords []uint32
  internal var HistoryRecordCount int32
  internal var HistoryEffectDataOffset VkDeviceSize
  internal var HistoryEffectDataByteCount VkDeviceSize
  internal var HistoryEffectDataVersion uint64
  internal var HistoryBufferGeneration uint64
  internal var HistoryValid bool
  internal var PreparedRanges []VkBufferCopy
  internal var PreparedRangeCount int32
  internal var ObjectStagingAccounted bool
  internal var ObjectBufferAccounted bool
  internal var disposed bool

  internal init(nativeDevice VkDevice, nativeDispatch VkDeviceDispatch,
    nativeAllocator VulkanMemoryAllocator, nativeObjectAccounting VulkanObjectAccounting?) {
      Device = nativeDevice
      Dispatch = nativeDispatch
      Allocator = nativeAllocator
      ObjectAccounting = nativeObjectAccounting
      Capacity = 0uL
      BufferGeneration = 0uL
      LastUseGlobalSubmissionSerial = 0uL
      Prepared = false
      Recorded = false
      Submitted = false
      RecordedCommandBuffer = nint(0)
      HistoryWords = [0]uint32
      HistoryRecordCount = 0
      HistoryBufferGeneration = 0uL
      HistoryValid = false
      PreparedRanges = [0]VkBufferCopy
      PreparedRangeCount = 0
    }

  internal func EnsureCapacity(required VkDeviceSize, completedSubmissionSerial uint64) {
    if required == 0uL {
      throw ArgumentOutOfRangeException("required")
    }
    if LastUseGlobalSubmissionSerial > completedSubmissionSerial {
      throw InvalidOperationException("Vulkan primitive frame slot is still in flight")
    }
    if required <= Capacity && Buffer != 0uL && StagingBuffer != 0uL
      && Allocation != nil && StagingAllocation != nil {
        return
      }
    if Prepared || Recorded {
      throw InvalidOperationException("Vulkan primitive frame slot has prepared work")
    }
    if BufferGeneration == uint64.MaxValue {
      throw OverflowException("Vulkan primitive frame buffer generation overflow")
    }
    var next = if Capacity == 0uL { 4096uL } else { Capacity }
    while next < required {
      if next > uint64.MaxValue / 2uL {
        next = required
        break
      }
      next = next * 2uL
    }
    DestroyBuffers()
    try {
      let deviceCreation = VulkanBufferFactory.Create(
        Device,
        Dispatch,
        Allocator,
        ObjectAccounting,
        next,
        uint32(VkConstants.VK_BUFFER_USAGE_TRANSFER_DST_BIT)
        | uint32(VkConstants.VK_BUFFER_USAGE_STORAGE_BUFFER_BIT),
        VulkanMemoryPolicy.DeviceLocalRequired)
      Buffer = deviceCreation.Buffer
      Allocation = deviceCreation.Allocation
      ObjectBufferAccounted = ObjectAccounting != nil

      let stagingCreation = VulkanBufferFactory.CreateMapped(
        Device,
        Dispatch,
        Allocator,
        ObjectAccounting,
        next,
        uint32(VkConstants.VK_BUFFER_USAGE_TRANSFER_SRC_BIT),
        VulkanMemoryPolicy.HostVisibleCoherentCached)
      StagingBuffer = stagingCreation.Buffer
      StagingAllocation = stagingCreation.Allocation
      ObjectStagingAccounted = ObjectAccounting != nil
      Capacity = next
      BufferGeneration = BufferGeneration + 1uL
    } catch (error Exception) {
      DestroyBuffers()
      throw error
    }
  }

  internal prop Mapped * void{
    get {
      guard let allocation = StagingAllocation else {
        throw InvalidOperationException("Vulkan primitive staging buffer is not allocated")
      }
      if allocation.mapped == nil {
        throw InvalidOperationException("Vulkan primitive staging buffer is not mapped")
      }
      return allocation.mapped
    }
  }

  internal func EnsureHistoryWordCapacity(requiredWords int32) {
    if requiredWords < 0 {
      throw ArgumentOutOfRangeException("requiredWords")
    }
    if requiredWords <= HistoryWords.Length {
      return
    }
    var next = if HistoryWords.Length == 0 { 256 } else { HistoryWords.Length }
    while next < requiredWords {
      if next > Int32.MaxValue / 2 {
        next = requiredWords
        break
      }
      next = next * 2
    }
    let replacement = [next]uint32
    Array.Copy(HistoryWords, replacement, HistoryWords.Length)
    HistoryWords = replacement
  }

  internal func EnsureRangeCapacity(recordCount int32) {
    if recordCount < 0 {
      throw ArgumentOutOfRangeException("recordCount")
    }
    if recordCount <= PreparedRanges.Length {
      return
    }
    var next = if PreparedRanges.Length == 0 { 8 } else { PreparedRanges.Length }
    while next < recordCount {
      if next > Int32.MaxValue / 2 {
        next = recordCount
        break
      }
      next = next * 2
    }
    let replacement = [next]VkBufferCopy
    var index int32 = 0
    while index < PreparedRanges.Length {
      replacement[index] = PreparedRanges[index]
      index++
    }
    PreparedRanges = replacement
  }

  internal func FlushRanges() uint64 {
    guard let allocation = StagingAllocation else {
      throw InvalidOperationException("Vulkan primitive staging buffer is not allocated")
    }
    var index int32 = 0
    var flushes uint64 = 0uL
    while index < PreparedRangeCount {
      let copyRange = PreparedRanges[index]
      if copyRange.size > 0uL {
        let result = Allocator.FlushBeforeSubmit(allocation,
          copyRange.srcOffset, copyRange.size)
        if result != VkConstants.VK_SUCCESS {
          throw InvalidOperationException("vkFlushMappedMemoryRanges failed for Vulkan primitive frame data")
        }
        flushes = flushes + 1uL
      }
      index++
    }
    FlushPrepared = true
    return flushes
  }

  internal func DestroyBuffers() {
    if StagingBuffer != 0uL {
      let stale = StagingBuffer
      StagingBuffer = 0uL
      let destroyBuffer = Dispatch.vkDestroyBuffer
      try { destroyBuffer(Device, stale, nil) } catch (cleanup Exception) { }
      if ObjectStagingAccounted {
        if let accounting = ObjectAccounting {
          try { accounting.Release() } catch (cleanup Exception) { }
        }
        ObjectStagingAccounted = false
      }
    }
    if let allocation = StagingAllocation {
      StagingAllocation = nil
      try { Allocator.Release(allocation) } catch (cleanup Exception) { }
    }
    if Buffer != 0uL {
      let stale = Buffer
      Buffer = 0uL
      let destroyBuffer = Dispatch.vkDestroyBuffer
      try { destroyBuffer(Device, stale, nil) } catch (cleanup Exception) { }
      if ObjectBufferAccounted {
        if let accounting = ObjectAccounting {
          try { accounting.Release() } catch (cleanup Exception) { }
        }
        ObjectBufferAccounted = false
      }
    }
    if let allocation = Allocation {
      Allocation = nil
      try { Allocator.Release(allocation) } catch (cleanup Exception) { }
    }
    Capacity = 0uL
    PreparedByteCount = 0uL
    PreparedRecordCount = 0
    PreparedRecordRegionByteCount = 0uL
    PreparedEffectDataByteCount = 0uL
    FlushPrepared = false
    PreparedRangeCount = 0
    Recorded = false
    RecordedCommandBuffer = nint(0)
    InvalidateHistory()
  }

  internal func InvalidateHistory() {
    HistoryRecordCount = 0
    HistoryEffectDataOffset = 0uL
    HistoryEffectDataByteCount = 0uL
    HistoryEffectDataVersion = 0uL
    HistoryBufferGeneration = 0uL
    HistoryValid = false
  }

  public func Dispose() {
    if disposed {
      return
    }
    if Prepared || Recorded || Submitted || LastUseGlobalSubmissionSerial != 0uL {
      throw InvalidOperationException("Vulkan primitive frame slot is in use")
    }
    disposed = true
    DestroyBuffers()
  }

  deinit{
    try { Dispose() } catch (cleanup Exception) { }
  }
}

internal unsafe sealed class VulkanPrimitiveFrameData : IDisposable {
  private const RecordBytes VkDeviceSize = 128uL
  private let device VkDevice
  private let dispatch VkDeviceDispatch
  private let allocator VulkanMemoryAllocator
  private let objectAccounting VulkanObjectAccounting?
  private let descriptorSetLayout VkDescriptorSetLayout
  private let effectDataDescriptorSetLayout VkDescriptorSetLayout
  private let maxStorageBufferRange VkDeviceSize
  private let slotCount int32
  private let slots []VulkanPrimitiveFrameSlot
  private let descriptorSets []VkDescriptorSet
  private let effectDataDescriptorSets []VkDescriptorSet
  private var descriptorPool VkDescriptorPool = 0uL
  private var descriptorPoolAccounted bool
  private var descriptorSetsAccounted int32
  private var preparedSlot int32 = -1
  private var preparedBytes VkDeviceSize
  private var preparedRecords int32
  private var preparedRecordBytes VkDeviceSize
  private var preparedRecordRegionBytes VkDeviceSize
  private var preparedEffectDataBytes VkDeviceSize
  private var preparedBufferSpan VkDeviceSize
  private var preparedEffectDataVersion uint64
  private var preparedEffectDataNeedsWrite bool
  private var preparedEffectDataWritten bool
  private var preparedCommandBuffer VkCommandBuffer
  private var lastStats VulkanPrimitiveFrameStats
  private var totalWrittenBytes VkDeviceSize
  private var totalSkippedBytes VkDeviceSize
  private var totalDirtyRecordCount uint64
  private var totalUploadRangeCount uint64
  private var totalFullUploads uint64
  private var totalMappedWrites uint64
  private var totalFlushes uint64
  private var totalRetainedReuse uint64
  private var disposed bool

  internal prop PreparedSlot int32{ get -> preparedSlot }
  internal prop PreparedBytes VkDeviceSize{ get -> preparedBytes }
  internal prop PreparedRecordCount int32{ get -> preparedRecords }
  internal prop EffectDataWordOffset uint32{
    get -> uint32(preparedRecordRegionBytes / 4uL)
  }
  internal prop LastStats VulkanPrimitiveFrameStats{ get -> lastStats }
  internal prop Totals VulkanPrimitiveFrameStats{
    get {
      return VulkanPrimitiveFrameStats{
        TotalWrittenBytes: totalWrittenBytes,
        TotalSkippedBytes: totalSkippedBytes,
        TotalDirtyRecordCount: totalDirtyRecordCount,
        TotalUploadRangeCount: totalUploadRangeCount,
        TotalFullUploads: totalFullUploads,
        TotalMappedWrites: totalMappedWrites,
        TotalFlushes: totalFlushes,
        TotalRetainedReuse: totalRetainedReuse,
      }
    }
  }
  internal prop LiveObjectCount uint64{
    get {
      var count uint64 = 0uL
      if descriptorPool != 0uL { count++ }
      count += uint64(descriptorSetsAccounted)
      var index int32 = 0
      while index < slots.Length {
        if slots[index].Buffer != 0uL { count++ }
        if slots[index].StagingBuffer != 0uL { count++ }
        index++
      }
      return count
    }
  }

  internal init(nativeDevice VkDevice, nativeDispatch VkDeviceDispatch,
    nativeAllocator VulkanMemoryAllocator, nativeDescriptorSetLayout VkDescriptorSetLayout,
    nativeEffectDataDescriptorSetLayout VkDescriptorSetLayout,
    nativeMaxStorageBufferRange VkDeviceSize, nativeSlotCount int32,
    nativeObjectAccounting VulkanObjectAccounting?) {
      if nativeDevice == nint(0) {
        throw ArgumentException("Vulkan device is null", "nativeDevice")
      }
      if nativeAllocator == nil {
        throw ArgumentNullException("nativeAllocator")
      }
      if nativeDescriptorSetLayout == 0uL {
        throw ArgumentException("Vulkan primitive descriptor set layout is null", "nativeDescriptorSetLayout")
      }
      if nativeEffectDataDescriptorSetLayout == 0uL {
        throw ArgumentException("Vulkan effect data descriptor set layout is null",
          "nativeEffectDataDescriptorSetLayout")
      }
      if nativeMaxStorageBufferRange < RecordBytes {
        throw ArgumentOutOfRangeException("nativeMaxStorageBufferRange")
      }
      if nativeSlotCount < 1 || nativeSlotCount > 2 {
        throw ArgumentOutOfRangeException("nativeSlotCount")
      }
      device = nativeDevice
      dispatch = nativeDispatch
      allocator = nativeAllocator
      descriptorSetLayout = nativeDescriptorSetLayout
      effectDataDescriptorSetLayout = nativeEffectDataDescriptorSetLayout
      maxStorageBufferRange = nativeMaxStorageBufferRange
      slotCount = nativeSlotCount
      objectAccounting = nativeObjectAccounting
      slots = [nativeSlotCount]VulkanPrimitiveFrameSlot
      descriptorSets = [nativeSlotCount]VkDescriptorSet
      effectDataDescriptorSets = [nativeSlotCount]VkDescriptorSet
      var index int32
      while index < slotCount {
        slots[index] = VulkanPrimitiveFrameSlot(device, dispatch, allocator, objectAccounting)
        index++
      }
      try {
        CreateDescriptorResources()
      } catch (error Exception) {
        DestroyDescriptorResources()
        DisposeSlots()
        throw error
      }
    }

  internal func BeginPrepare(slotIndex int32, maximumRecordCount uint64,
    effectDataByteCount int32, effectDataVersion uint64,
    completedSubmissionSerial uint64) {
      EnsureOpen()
      if preparedSlot >= 0 {
        throw InvalidOperationException("Vulkan primitive frame data already has prepared work")
      }
      if slotIndex < 0 || slotIndex >= slotCount {
        throw ArgumentOutOfRangeException("slotIndex")
      }
      if effectDataByteCount < 0 || (effectDataByteCount & 3) != 0 {
        throw ArgumentOutOfRangeException("effectDataByteCount")
      }
      var recordLimit = maximumRecordCount
      if recordLimit == 0uL { recordLimit = 1uL }
      if recordLimit >= uint64(Int32.MaxValue)
        || recordLimit > maxStorageBufferRange / RecordBytes{
          throw ArgumentOutOfRangeException("maximumRecordCount")
        }
      let recordRegionBytes = recordLimit * RecordBytes
      let dataBytes = uint64(effectDataByteCount)
      if dataBytes > maxStorageBufferRange
        || recordRegionBytes > maxStorageBufferRange - dataBytes{
          throw ArgumentOutOfRangeException("effectDataByteCount")
        }
      let requiredBytes = recordRegionBytes + dataBytes
      let requiredWords = requiredBytes / 4uL
      if requiredWords > uint64(Int32.MaxValue) {
        throw ArgumentOutOfRangeException("effectDataByteCount")
      }
      let slot = slots[slotIndex]
      Collect(completedSubmissionSerial)
      if slot.Prepared || slot.Recorded {
        throw InvalidOperationException("Vulkan primitive frame slot already has prepared work")
      }
      slot.EnsureCapacity(requiredBytes, completedSubmissionSerial)
      slot.EnsureHistoryWordCapacity(int32(requiredWords))
      preparedEffectDataNeedsWrite = dataBytes > 0uL
        && (!slot.HistoryValid
            || slot.HistoryBufferGeneration != slot.BufferGeneration
            || slot.HistoryEffectDataOffset != recordRegionBytes
            || slot.HistoryEffectDataByteCount != dataBytes
            || slot.HistoryEffectDataVersion != effectDataVersion)
      slot.EnsureRangeCapacity(int32(recordLimit) + 1)
      preparedSlot = slotIndex
      preparedBytes = 0uL
      preparedRecordBytes = 0uL
      preparedRecordRegionBytes = recordRegionBytes
      preparedEffectDataBytes = dataBytes
      preparedBufferSpan = requiredBytes
      preparedEffectDataVersion = effectDataVersion
      preparedEffectDataWritten = dataBytes == 0uL
      preparedRecords = 0
      preparedCommandBuffer = nint(0)
      slot.Prepared = true
      slot.PreparedByteCount = 0uL
      slot.PreparedRecordCount = 0
      slot.PreparedRecordRegionByteCount = recordRegionBytes
      slot.PreparedEffectDataByteCount = dataBytes
      slot.FlushPrepared = false
      slot.PreparedRangeCount = 0
    }

  internal func WriteRecord(recordIndex int32, source * void) {
    EnsureOpen()
    if preparedSlot < 0 || source == nil {
      throw InvalidOperationException("Vulkan primitive frame data is not prepared")
    }
    if recordIndex != preparedRecords {
      throw InvalidOperationException("Vulkan primitive record ordinal is not sequential")
    }
    if recordIndex < 0 || uint64(recordIndex) >= maxStorageBufferRange / RecordBytes {
      throw ArgumentOutOfRangeException("recordIndex")
    }
    let slot = slots[preparedSlot]
    let sourceWords = *uint32(nint(source))
    let destination = *uint32(nint(slot.Mapped)
      +nint(uint64(recordIndex) * RecordBytes))
    var index int32 = 0
    while index < 32 {
      destination[index] = sourceWords[index]
      index++
    }
    preparedRecords = preparedRecords + 1
  }

  internal func WriteEffectData(source []uint8, byteCount int32) {
    EnsureOpen()
    if preparedSlot < 0 {
      throw InvalidOperationException("Vulkan primitive frame data is not prepared")
    }
    if byteCount < 0 || uint64(byteCount) != preparedEffectDataBytes
      || byteCount > source.Length{
        throw ArgumentOutOfRangeException("byteCount")
      }
    if byteCount > 0 && preparedEffectDataNeedsWrite {
      let destination = nint(slots[preparedSlot].Mapped) + nint(preparedRecordRegionBytes)
      Marshal.Copy(source, 0, destination, byteCount)
    }
    preparedEffectDataWritten = true
  }

  internal func FinishPrepare() {
    EnsureOpen()
    if preparedSlot < 0 {
      throw InvalidOperationException("Vulkan primitive frame data has no prepared work")
    }
    if !preparedEffectDataWritten {
      throw InvalidOperationException("Vulkan shader effect data was not written")
    }
    let slot = slots[preparedSlot]
    if preparedRecords <= 0 {
      preparedRecords = 1
      let destination = *uint32(nint(slot.Mapped))
      var index int32
      while index < 32 {
        destination[index] = 0u
        index++
      }
    }
    if uint64(preparedRecords) > maxStorageBufferRange / RecordBytes {
      throw ArgumentOutOfRangeException("primitive record storage range")
    }
    preparedRecordBytes = uint64(preparedRecords) * RecordBytes
    preparedBytes = preparedRecordBytes + preparedEffectDataBytes
    slot.PreparedByteCount = preparedBufferSpan
    slot.PreparedRecordCount = preparedRecords
    let fullUpload = !slot.HistoryValid
      || slot.HistoryBufferGeneration != slot.BufferGeneration
      || slot.HistoryRecordCount != preparedRecords
    let candidate = *uint32(nint(slot.Mapped))
    var dirtyRecordCount int32
    var rangeCount int32
    let dataChanged = preparedEffectDataNeedsWrite
    if fullUpload {
      dirtyRecordCount = preparedRecords
      if preparedRecordBytes > 0uL {
        var recordRange = VkBufferCopy{}
        recordRange.srcOffset = 0uL
        recordRange.dstOffset = 0uL
        recordRange.size = preparedRecordBytes
        slot.PreparedRanges[rangeCount] = recordRange
        rangeCount++
      }
    } else {
      var recordIndex int32
      var rangeStart = -1
      while recordIndex < preparedRecords {
        let firstWord = recordIndex * 32
        var same = true
        var wordIndex int32
        while wordIndex < 32 {
          if candidate[firstWord + wordIndex] != slot.HistoryWords[firstWord + wordIndex] {
            same = false
            break
          }
          wordIndex++
        }
        if !same {
          dirtyRecordCount++
          if rangeStart < 0 { rangeStart = recordIndex }
        } else if rangeStart >= 0 {
          var copyRange = VkBufferCopy{}
          copyRange.srcOffset = uint64(rangeStart) * RecordBytes
          copyRange.dstOffset = copyRange.srcOffset
          copyRange.size = uint64(recordIndex - rangeStart) * RecordBytes
          slot.PreparedRanges[rangeCount] = copyRange
          rangeCount++
          rangeStart = -1
        }
        recordIndex++
      }
      if rangeStart >= 0 {
        var copyRange = VkBufferCopy{}
        copyRange.srcOffset = uint64(rangeStart) * RecordBytes
        copyRange.dstOffset = copyRange.srcOffset
        copyRange.size = uint64(preparedRecords - rangeStart) * RecordBytes
        slot.PreparedRanges[rangeCount] = copyRange
        rangeCount++
      }
    }
    if dataChanged {
      var dataRange = VkBufferCopy{}
      dataRange.srcOffset = preparedRecordRegionBytes
      dataRange.dstOffset = preparedRecordRegionBytes
      dataRange.size = preparedEffectDataBytes
      slot.PreparedRanges[rangeCount] = dataRange
      rangeCount++
    }
    slot.PreparedRangeCount = rangeCount
    let writtenBytes = uint64(dirtyRecordCount) * RecordBytes
    +(dataChanged ? preparedEffectDataBytes : 0uL)
    let skippedBytes = preparedBytes - writtenBytes
    let retainedReuse = if fullUpload {
      0uL
    } else {
      uint64(preparedRecords - dirtyRecordCount)
    }
    let flushes = slot.FlushRanges()
    UpdateDescriptors(preparedSlot, preparedRecordBytes,
      preparedEffectDataBytes > 0uL ? preparedBufferSpan : 0uL)
    lastStats = VulkanPrimitiveFrameStats{
      SlotIndex: preparedSlot,
      RecordCount: preparedRecords,
      ByteCount: preparedBytes,
      Capacity: slot.Capacity,
      BufferGeneration: slot.BufferGeneration,
      WrittenBytes: writtenBytes,
      SkippedBytes: skippedBytes,
      DirtyRecordCount: dirtyRecordCount,
      UploadRangeCount: rangeCount,
      FullUpload: fullUpload,
      MappedWrites: 1uL,
      Flushes: flushes,
      RetainedReuse: retainedReuse,
      LastUseSerial: slot.LastUseGlobalSubmissionSerial,
      Prepared: true,
    }
    totalWrittenBytes = SaturatingAdd(totalWrittenBytes, writtenBytes)
    totalSkippedBytes = SaturatingAdd(totalSkippedBytes, skippedBytes)
    totalDirtyRecordCount = SaturatingAdd(totalDirtyRecordCount, uint64(dirtyRecordCount))
    totalUploadRangeCount = SaturatingAdd(totalUploadRangeCount, uint64(rangeCount))
    if fullUpload { totalFullUploads = SaturatingAdd(totalFullUploads, 1uL) }
    totalMappedWrites = SaturatingAdd(totalMappedWrites, 1uL)
    totalFlushes = SaturatingAdd(totalFlushes, flushes)
    totalRetainedReuse = SaturatingAdd(totalRetainedReuse, retainedReuse)
    lastStats.TotalWrittenBytes = totalWrittenBytes
    lastStats.TotalSkippedBytes = totalSkippedBytes
    lastStats.TotalDirtyRecordCount = totalDirtyRecordCount
    lastStats.TotalUploadRangeCount = totalUploadRangeCount
    lastStats.TotalFullUploads = totalFullUploads
    lastStats.TotalMappedWrites = totalMappedWrites
    lastStats.TotalFlushes = totalFlushes
    lastStats.TotalRetainedReuse = totalRetainedReuse
  }

  internal func RecordUpload(commandBuffer VkCommandBuffer) {
    EnsureOpen()
    if commandBuffer == nint(0) {
      throw ArgumentException("Command buffer is null", "commandBuffer")
    }
    if preparedSlot < 0 {
      throw InvalidOperationException("Vulkan primitive frame data is not prepared")
    }
    let slot = slots[preparedSlot]
    if !slot.Prepared {
      throw InvalidOperationException("Vulkan primitive frame slot is not prepared")
    }
    if slot.Recorded {
      if slot.RecordedCommandBuffer != commandBuffer {
        throw InvalidOperationException("Vulkan primitive frame upload belongs to another command buffer")
      }
      return
    }
    if slot.PreparedRangeCount > 0 {
      let copyBuffer = dispatch.vkCmdCopyBuffer
      copyBuffer(commandBuffer, slot.StagingBuffer, slot.Buffer,
        uint32(slot.PreparedRangeCount), &slot.PreparedRanges[0])
      VulkanTransitions.RecordBuffer(
        commandBuffer,
        dispatch.vkCmdPipelineBarrier2,
        slot.Buffer,
        0uL,
        preparedBufferSpan,
        VkConstants.VK_PIPELINE_STAGE_2_TRANSFER_BIT,
        VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT,
        VkConstants.VK_PIPELINE_STAGE_2_VERTEX_SHADER_BIT
        | VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT,
        VkConstants.VK_ACCESS_2_SHADER_STORAGE_READ_BIT)
    }
    slot.Recorded = true
    slot.RecordedCommandBuffer = commandBuffer
    preparedCommandBuffer = commandBuffer
  }

  internal func FlushBeforeSubmit() VkResult {
    EnsureOpen()
    if preparedSlot < 0 {
      return VkConstants.VK_SUCCESS
    }
    let slot = slots[preparedSlot]
    if !slot.Prepared || !slot.Recorded || !slot.FlushPrepared
      || slot.RecordedCommandBuffer != preparedCommandBuffer{
        throw InvalidOperationException("Vulkan primitive frame upload is not ready for submit")
      }
    return VkConstants.VK_SUCCESS
  }

  internal func Bind(commandBuffer VkCommandBuffer, pipelineLayout VkPipelineLayout,
    setIndex uint32) {
      EnsureOpen()
      if commandBuffer == nint(0) || pipelineLayout == 0uL {
        throw ArgumentException("Vulkan primitive descriptor binding arguments are invalid")
      }
      if preparedSlot < 0 || !slots[preparedSlot].Prepared {
        throw InvalidOperationException("Vulkan primitive frame data is not prepared")
      }
      var descriptorSet = descriptorSets[preparedSlot]
      let bindDescriptorSets = dispatch.vkCmdBindDescriptorSets
      bindDescriptorSets(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS,
        pipelineLayout, setIndex, 1u, &descriptorSet, 0u, nil)
    }

  internal func BindEffectData(commandBuffer VkCommandBuffer,
    pipelineLayout VkPipelineLayout, setIndex uint32) {
      EnsureOpen()
      if commandBuffer == nint(0) || pipelineLayout == 0uL {
        throw ArgumentException("Vulkan effect data descriptor binding arguments are invalid")
      }
      if preparedSlot < 0 || !slots[preparedSlot].Prepared
        || preparedEffectDataBytes == 0uL {
          throw InvalidOperationException("Vulkan shader effect data is not prepared")
        }
      var descriptorSet = effectDataDescriptorSets[preparedSlot]
      let bindDescriptorSets = dispatch.vkCmdBindDescriptorSets
      bindDescriptorSets(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS,
        pipelineLayout, setIndex, 1u, &descriptorSet, 0u, nil)
    }

  internal func ValidateSubmission(slotIndex int32, submissionSerial uint64) {
    EnsureOpen()
    if slotIndex < 0 || slotIndex >= slotCount || submissionSerial == 0uL {
      throw ArgumentOutOfRangeException("submissionSerial")
    }
    if preparedSlot != slotIndex || !slots[slotIndex].Prepared
      || !slots[slotIndex].Recorded || !slots[slotIndex].FlushPrepared{
        throw InvalidOperationException("Vulkan primitive frame slot has no submitted work")
      }
  }

  internal func MarkSubmitted(slotIndex int32, submissionSerial uint64) {
    ValidateSubmission(slotIndex, submissionSerial)
    let slot = slots[slotIndex]
    CommitHistory(slot)
    slot.Prepared = false
    slot.Recorded = false
    slot.RecordedCommandBuffer = nint(0)
    slot.Submitted = true
    slot.LastUseGlobalSubmissionSerial = submissionSerial
    preparedSlot = -1
    preparedBytes = 0uL
    preparedRecords = 0
    ResetPreparedMetadata()
    preparedCommandBuffer = nint(0)
    lastStats.Prepared = false
    lastStats.LastUseSerial = submissionSerial
  }

  internal func ReconcileSubmitted(slotIndex int32, submissionSerial uint64) {
    EnsureOpen()
    if slotIndex < 0 || slotIndex >= slotCount || submissionSerial == 0uL {
      throw ArgumentOutOfRangeException("submissionSerial")
    }
    let slot = slots[slotIndex]
    if preparedSlot == slotIndex && slot.Prepared {
      CommitHistory(slot)
      slot.Prepared = false
      slot.Recorded = false
      slot.RecordedCommandBuffer = nint(0)
      slot.Submitted = true
      slot.LastUseGlobalSubmissionSerial = submissionSerial
      preparedSlot = -1
      preparedBytes = 0uL
      preparedRecords = 0
      ResetPreparedMetadata()
      preparedCommandBuffer = nint(0)
      lastStats.Prepared = false
      lastStats.LastUseSerial = submissionSerial
      return
    }
    if preparedSlot >= 0 {
      throw InvalidOperationException("Vulkan primitive frame data belongs to another slot")
    }
    if slot.LastUseGlobalSubmissionSerial != submissionSerial {
      throw InvalidOperationException("Vulkan primitive frame submission state is not recoverable")
    }
  }

  private func CommitHistory(slot VulkanPrimitiveFrameSlot) {
    if !slot.Prepared {
      throw InvalidOperationException("Vulkan primitive frame slot has no candidate history")
    }
    let candidate = *uint32(nint(slot.Mapped))
    var rangeIndex int32 = 0
    while rangeIndex < slot.PreparedRangeCount {
      let copyRange = slot.PreparedRanges[rangeIndex]
      let firstWord = int32(copyRange.srcOffset / 4uL)
      let wordCount = int32(copyRange.size / 4uL)
      var wordIndex int32 = 0
      while wordIndex < wordCount {
        slot.HistoryWords[firstWord + wordIndex] = candidate[firstWord + wordIndex]
        wordIndex++
      }
      rangeIndex++
    }
    slot.HistoryRecordCount = slot.PreparedRecordCount
    slot.HistoryBufferGeneration = slot.BufferGeneration
    slot.HistoryEffectDataOffset = slot.PreparedRecordRegionByteCount
    slot.HistoryEffectDataByteCount = slot.PreparedEffectDataByteCount
    slot.HistoryEffectDataVersion = slot.PreparedEffectDataByteCount > 0uL
    ? preparedEffectDataVersion : 0uL
    slot.HistoryValid = true
  }

  internal func Collect(completedSubmissionSerial uint64) {
    EnsureOpen()
    var index int32 = 0
    while index < slots.Length {
      if slots[index].Submitted
        && slots[index].LastUseGlobalSubmissionSerial != 0uL
        && slots[index].LastUseGlobalSubmissionSerial <= completedSubmissionSerial{
          slots[index].Submitted = false
          slots[index].LastUseGlobalSubmissionSerial = 0uL
          if lastStats.SlotIndex == index {
            lastStats.LastUseSerial = 0uL
          }
        }
      index++
    }
  }

  internal func Abort(slotIndex int32) {
    EnsureOpen()
    if slotIndex < 0 || slotIndex >= slotCount {
      throw ArgumentOutOfRangeException("slotIndex")
    }
    if preparedSlot != slotIndex {
      return
    }
    let slot = slots[slotIndex]
    slot.Prepared = false
    slot.Recorded = false
    slot.RecordedCommandBuffer = nint(0)
    slot.PreparedByteCount = 0uL
    slot.PreparedRecordCount = 0
    slot.PreparedRecordRegionByteCount = 0uL
    slot.PreparedEffectDataByteCount = 0uL
    slot.FlushPrepared = false
    slot.PreparedRangeCount = 0
    preparedSlot = -1
    preparedBytes = 0uL
    preparedRecords = 0
    ResetPreparedMetadata()
    preparedCommandBuffer = nint(0)
    lastStats.Prepared = false
  }

  internal func DisposeAfterDeviceLoss() {
    if disposed {
      return
    }
    disposed = true
    preparedSlot = -1
    preparedBytes = 0uL
    preparedRecords = 0
    ResetPreparedMetadata()
    preparedCommandBuffer = nint(0)
    var index int32 = 0
    while index < slots.Length {
      slots[index].Prepared = false
      slots[index].Recorded = false
      slots[index].Submitted = false
      slots[index].LastUseGlobalSubmissionSerial = 0uL
      slots[index].DestroyBuffers()
      index++
    }
    DestroyDescriptorResources()
  }

  public func Dispose() {
    if disposed {
      return
    }
    if preparedSlot >= 0 {
      throw InvalidOperationException("Vulkan primitive frame data has prepared work")
    }
    var index int32 = 0
    while index < slots.Length {
      if slots[index].Submitted || slots[index].LastUseGlobalSubmissionSerial != 0uL {
        throw InvalidOperationException("Vulkan primitive frame data is still in flight")
      }
      index++
    }
    disposed = true
    DisposeSlots()
    DestroyDescriptorResources()
  }

  deinit{
    try { Dispose() } catch (cleanup Exception) { }
  }

  private func CreateDescriptorResources() {
    var poolSize = VkDescriptorPoolSize{}
    poolSize._type = VkConstants.VK_DESCRIPTOR_TYPE_STORAGE_BUFFER
    poolSize.descriptorCount = uint32(slotCount * 2)
    let descriptorCount = slotCount * 2
    let layouts = [descriptorCount]VkDescriptorSetLayout
    let allocated = [descriptorCount]VkDescriptorSet
    var index int32
    while index < slotCount {
      layouts[index] = descriptorSetLayout
      layouts[slotCount + index] = effectDataDescriptorSetLayout
      index++
    }
    let creation = VulkanDescriptorFactory.CreatePoolAndAllocate(
      device,
      dispatch,
      objectAccounting,
      &poolSize,
      1u,
      &layouts[0],
      uint32(descriptorCount),
      &allocated[0])
    descriptorPool = creation.Pool
    index = 0
    while index < slotCount {
      descriptorSets[index] = allocated[index]
      effectDataDescriptorSets[index] = allocated[slotCount + index]
      index++
    }
    if objectAccounting != nil {
      descriptorPoolAccounted = true
      descriptorSetsAccounted = int32(creation.SetCount)
    }
  }

  private func UpdateDescriptors(slotIndex int32, recordByteCount VkDeviceSize,
    effectBufferByteCount VkDeviceSize) {
      VulkanDescriptorFactory.WriteStorageBuffer(
        device,
        dispatch,
        descriptorSets[slotIndex],
        0u,
        slots[slotIndex].Buffer,
        0uL,
        recordByteCount)
      if effectBufferByteCount > 0uL {
        VulkanDescriptorFactory.WriteStorageBuffer(
          device,
          dispatch,
          effectDataDescriptorSets[slotIndex],
          0u,
          slots[slotIndex].Buffer,
          0uL,
          effectBufferByteCount)
      }
    }

  private func DisposeSlots() {
    var index int32 = 0
    while index < slots.Length {
      try { slots[index].Dispose() } catch (cleanup Exception) { slots[index].DestroyBuffers() }
      index++
    }
  }

  private func DestroyDescriptorResources() {
    if descriptorPool != 0uL {
      let stalePool = descriptorPool
      descriptorPool = 0uL
      let destroyPool = dispatch.vkDestroyDescriptorPool
      try { destroyPool(device, stalePool, nil) } catch (cleanup Exception) { }
      if let accounting = objectAccounting {
        var index int32 = 0
        while index < descriptorSetsAccounted {
          try { accounting.Release() } catch (cleanup Exception) { }
          index++
        }
        descriptorSetsAccounted = 0
        if descriptorPoolAccounted {
          try { accounting.Release() } catch (cleanup Exception) { }
          descriptorPoolAccounted = false
        }
      }
    }
    var index int32 = 0
    while index < descriptorSets.Length {
      descriptorSets[index] = 0uL
      index++
    }
    index = 0
    while index < effectDataDescriptorSets.Length {
      effectDataDescriptorSets[index] = 0uL
      index++
    }
  }

  private func ResetPreparedMetadata() {
    preparedRecordBytes = 0uL
    preparedRecordRegionBytes = 0uL
    preparedEffectDataBytes = 0uL
    preparedBufferSpan = 0uL
    preparedEffectDataWritten = false
    preparedEffectDataVersion = 0uL
    preparedEffectDataNeedsWrite = false
  }

  private func EnsureOpen() {
    if disposed {
      throw ObjectDisposedException("VulkanPrimitiveFrameData")
    }
  }

  private func SaturatingAdd(current uint64, value uint64) uint64 {
    if uint64.MaxValue - current < value {
      return uint64.MaxValue
    }
    return current + value
  }
}
