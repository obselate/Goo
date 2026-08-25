package Goo

import System
internal data struct FailedIdlePrimitiveFrameTestSnapshot {
  internal var SlotIndex int32
  internal var RecordCount int32
  internal var ByteCount VkDeviceSize
  internal var BufferGeneration uint64
  internal var WrittenBytes VkDeviceSize
  internal var SkippedBytes VkDeviceSize
  internal var DirtyRecordCount int32
  internal var UploadRangeCount int32
  internal var FullUpload bool
  internal var MappedWrites uint64
  internal var Flushes uint64
  internal var RetainedReuse uint64
  internal var LastUseSerial uint64
}

internal data struct FailedIdleTextFrameTestSnapshot {
  internal var SlotIndex int32
  internal var SegmentCount int32
  internal var RunCount int32
  internal var RecordCount int32
  internal var ByteCount VkDeviceSize
  internal var BufferGeneration uint64
  internal var TopologyKey uint64
  internal var WrittenBytes VkDeviceSize
  internal var SkippedBytes VkDeviceSize
  internal var DirtySegmentCount int32
  internal var UploadRangeCount int32
  internal var FullUpload bool
  internal var MappedWrites uint64
  internal var Flushes uint64
  internal var RetainedReuse uint64
  internal var LastUseSerial uint64
}

internal data struct FailedIdleSubmissionSerialTestSnapshot {
  internal var Slot0Serial uint64
  internal var Slot1Serial uint64
  internal var RuntimeGeneration uint64
}

internal partial class VulkanWindowTarget {
  internal func FailedIdlePrimitiveFrameForTest() FailedIdlePrimitiveFrameTestSnapshot {
    guard let renderer = primitiveRenderer else {
      return FailedIdlePrimitiveFrameTestSnapshot{}
    }
    let stats = renderer.PrimitiveFrameStats
    return FailedIdlePrimitiveFrameTestSnapshot{
      SlotIndex: stats.SlotIndex,
      RecordCount: stats.RecordCount,
      ByteCount: stats.ByteCount,
      BufferGeneration: stats.BufferGeneration,
      WrittenBytes: stats.WrittenBytes,
      SkippedBytes: stats.SkippedBytes,
      UploadRangeCount: stats.UploadRangeCount,
      DirtyRecordCount: stats.DirtyRecordCount,
      FullUpload: stats.FullUpload,
      MappedWrites: stats.MappedWrites,
      Flushes: stats.Flushes,
      RetainedReuse: stats.RetainedReuse,
      LastUseSerial: stats.LastUseSerial,
    }
  }

  internal func FailedIdleTextFrameForTest() FailedIdleTextFrameTestSnapshot {
    guard let renderer = primitiveRenderer else {
      return FailedIdleTextFrameTestSnapshot{}
    }
    let stats = renderer.TextFrameStats
    return FailedIdleTextFrameTestSnapshot{
      SlotIndex: stats.SlotIndex,
      SegmentCount: stats.SegmentCount,
      RunCount: stats.RunCount,
      RecordCount: stats.RecordCount,
      ByteCount: stats.ByteCount,
      BufferGeneration: stats.BufferGeneration,
      TopologyKey: stats.TopologyKey,
      WrittenBytes: stats.WrittenBytes,
      SkippedBytes: stats.SkippedBytes,
      DirtySegmentCount: stats.DirtySegmentCount,
      UploadRangeCount: stats.UploadRangeCount,
      FullUpload: stats.FullUpload,
      MappedWrites: stats.MappedWrites,
      Flushes: stats.Flushes,
      RetainedReuse: stats.RetainedReuse,
      LastUseSerial: stats.LastUseSerial,
    }
  }

  internal func FailedIdleSubmissionSerialsForTest() FailedIdleSubmissionSerialTestSnapshot -> FailedIdleSubmissionSerialTestSnapshot {
    Slot0Serial: frameSlots.Slot(0u)?.SubmissionSerial ?? 0uL,
    Slot1Serial: frameSlots.Slot(1u)?.SubmissionSerial ?? 0uL,
    RuntimeGeneration: runtime?.Generation ?? 0uL,
  }
}

public partial class Window {
  internal func FailedIdlePrimitiveFrameForTest() FailedIdlePrimitiveFrameTestSnapshot -> windowTarget?.FailedIdlePrimitiveFrameForTest()
  ?? FailedIdlePrimitiveFrameTestSnapshot{}

  internal func FailedIdleTextFrameForTest() FailedIdleTextFrameTestSnapshot -> windowTarget?.FailedIdleTextFrameForTest()
  ?? FailedIdleTextFrameTestSnapshot{}

  internal func FailedIdleSubmissionSerialsForTest()
  FailedIdleSubmissionSerialTestSnapshot -> windowTarget?.FailedIdleSubmissionSerialsForTest()
  ?? FailedIdleSubmissionSerialTestSnapshot{}
}

internal partial class VulkanWindowTarget {
  internal func FailedIdleCountersForTest() VulkanDiagnosticCounterSnapshot {
    if let current = diagnostics {
      return current.Counters
    }
    return VulkanDiagnosticCounterSnapshot{}
  }
}

public partial class Window {
  internal func FailedIdleCountersForTest() VulkanDiagnosticCounterSnapshot {
    guard let target = windowTarget else {
      return VulkanDiagnosticCounterSnapshot{}
    }
    return target.FailedIdleCountersForTest()
  }

  internal func FailedIdleForcePumpForTest() bool {
    requestRender()
    PumpScheduled(0.0)
    return windowTarget?.LastFrameSubmitted == true
  }

  internal func FailedIdlePumpQueueForTest() bool {
    guard let target = windowTarget else {
      return true
    }
    target.PollQueueCompletion()
    target.FailedIdleCollectRetiredSwapchainsForTest()
    return !target.QueueWorkPending && !target.NeedsRender
  }

  internal func FailedIdleNeedsRenderForTest() bool -> windowTarget?.NeedsRender == true
}

internal class FailedIdleTestFixture {
  shared {
    internal func Counters(window Window) VulkanDiagnosticCounterSnapshot -> window.FailedIdleCountersForTest()

    internal func Pump(window Window) {
      SdlRuntime.PumpEvents(Int32.MaxValue)
      window.PumpScheduled(0.0)
    }

    internal func ForcePump(window Window) bool {
      SdlRuntime.PumpEvents(Int32.MaxValue)
      return window.FailedIdleForcePumpForTest()
    }

    internal func PumpQueue(window Window) bool {
      SdlRuntime.PumpEvents(Int32.MaxValue)
      return window.FailedIdlePumpQueueForTest()
    }

    internal func NeedsRender(window Window) bool -> window.FailedIdleNeedsRenderForTest()

    internal func PrimitiveFrame(window Window) FailedIdlePrimitiveFrameTestSnapshot -> window.FailedIdlePrimitiveFrameForTest()

    internal func TextFrame(window Window) FailedIdleTextFrameTestSnapshot -> window.FailedIdleTextFrameForTest()

    internal func SubmissionSerials(window Window)
    FailedIdleSubmissionSerialTestSnapshot -> window.FailedIdleSubmissionSerialsForTest()
  }
}
