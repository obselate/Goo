package GooAsyncReadbackSmoke

import System
import System.Collections.Generic
import System.Diagnostics
import Goo

data struct S15PrimitiveStagingBox {
  internal var Left float64
  internal var Top float64
  internal var Width float64
  internal var Height float64
  internal var Radius float64
  internal var Color Color
}

class S15PrimitiveStagingCell : Cell {
  shared {
    const BoxCount int32 = 1000
    const Columns int32 = 25
    const Rows int32 = 40
  }

  private let boxes []S15PrimitiveStagingBox

  init() {
    boxes = [BoxCount]S15PrimitiveStagingBox
    var index int32 = 0
    while index < BoxCount {
      let row = index / Columns
      let column = index % Columns
      let color = Color.Rgb(
        24 + (index % 8) * 12,
        56 + (column % 5) * 18,
        112 + (row % 6) * 16)
      boxes[index] = S15PrimitiveStagingBox{
        Left: float64(column) * 40.0,
        Top: float64(row) * 16.0,
        Width: 40.0,
        Height: 16.0,
        Radius: index % 2 == 0 ? 0.0 : 3.0,
        Color: color,
      }
      index = index + 1
    }
  }

  override func Build() Blob {
    let children = List[Blob](BoxCount)
    var index int32 = 0
    while index < BoxCount {
      let box = boxes[index]
      children.Add(Container{
        Position: PositionType.Absolute,
        Left: box.Left,
        Top: box.Top,
        Width: box.Width,
        Height: box.Height,
        BorderRadius: box.Radius,
        BackgroundColor: box.Color,
      })
      index = index + 1
    }
    return Container{
      Width: float64(Columns) * 40.0,
      Height: float64(Rows) * 16.0,
      Position: PositionType.Relative,
      BackgroundColor: Color.Transparent,
      Children: children,
    }
  }
}

func S15PrimitiveStagingSum(values []int64) int64 {
  var total int64 = 0L
  var index int32 = 0
  while index < values.Length {
    total = total + values[index]
    index = index + 1
  }
  return total
}

func RunS15PrimitiveStagingBenchmark() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  Environment.SetEnvironmentVariable("GOO_FRAME_PROFILE", "1")
  let warmup = S14EnvCount("GOO_S15_PRIMITIVE_WARMUP", 300, 2000)
  let samples = S14EnvCount("GOO_S15_PRIMITIVE_SAMPLES", 2000, 10000)
  S14Require(samples > 0, "GOO_S15_PRIMITIVE_SAMPLES must be positive")
  let root = S15PrimitiveStagingCell{}
  let frameTicks = [samples]int64
  let frameAllocations = [samples]int64
  var sawSlot0 bool = false
  var sawSlot1 bool = false
  var finalPrimitive VulkanPrimitiveFrameRetentionTestSnapshot{}
  var window Window? = nil
  try {
    let opened = Window{
      Title: "Goo S15 primitive staging benchmark",
      Width: 1000,
      Height: 640,
      Background: Color.Transparent,
      VSync: false,
      Root: root,
    }
    window = opened
    opened.Open()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    var warmIndex int32 = 0
    while warmIndex < warmup || !sawSlot0 || !sawSlot1 {
      root.Rebuild()
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      let warmPrimitive = WindowReadbackTestFixture.PrimitiveFrameRetention(opened)
      if warmPrimitive.SlotIndex == 0 {
        sawSlot0 = true
      } else if warmPrimitive.SlotIndex == 1 {
        sawSlot1 = true
      }
      warmIndex = warmIndex + 1
      if warmIndex > warmup + 8 && (!sawSlot0 || !sawSlot1) {
        throw InvalidOperationException("S15 primitive staging did not observe both frame slots")
      }
    }
    var sampleIndex int32 = 0
    while sampleIndex < samples {
      let beforeBytes = GC.GetAllocatedBytesForCurrentThread()
      let start = Stopwatch.GetTimestamp()
      root.Rebuild()
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      let end = Stopwatch.GetTimestamp()
      let afterBytes = GC.GetAllocatedBytesForCurrentThread()
      frameTicks[sampleIndex] = end - start
      frameAllocations[sampleIndex] = afterBytes - beforeBytes
      finalPrimitive = WindowReadbackTestFixture.PrimitiveFrameRetention(opened)
      if finalPrimitive.SlotIndex == 0 {
        sawSlot0 = true
      } else if finalPrimitive.SlotIndex == 1 {
        sawSlot1 = true
      }
      sampleIndex = sampleIndex + 1
    }
    S14Require(finalPrimitive.RecordCount == S15PrimitiveStagingCell.BoxCount,
      "S15 primitive staging emitted an unexpected record count "
      +finalPrimitive.RecordCount.ToString())
    S14Require(finalPrimitive.ByteCount
      == uint64(S15PrimitiveStagingCell.BoxCount) * 128uL,
      "S15 primitive staging emitted an unexpected byte count")
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "S15 primitive staging window did not close")
  } finally {
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
  }
  let frameNs = [samples]int64
  var index int32 = 0
  while index < samples {
    frameNs[index] = S14TicksToNs(frameTicks[index])
    index = index + 1
  }
  let allocationTotal = S15PrimitiveStagingSum(frameAllocations)
  let allocationPerFrame = allocationTotal / int64(samples)
  let bothSlots = sawSlot0 && sawSlot1
  Console.WriteLine("s15-primitive-staging: samples=" + samples.ToString()
    +" record_count=" + finalPrimitive.RecordCount.ToString()
    +" byte_count=" + finalPrimitive.ByteCount.ToString()
    +" primitive_records=" + finalPrimitive.RecordCount.ToString()
    +" primitive_bytes=" + finalPrimitive.ByteCount.ToString()
    +" p50_ns=" + S14Percentile(frameNs, 0.50).ToString()
    +" p95_ns=" + S14Percentile(frameNs, 0.95).ToString()
    +" max_ns=" + S14Max(frameNs).ToString()
    +" alloc_B_frame=" + allocationPerFrame.ToString()
    +" written=" + finalPrimitive.WrittenBytes.ToString()
    +" skipped=" + finalPrimitive.SkippedBytes.ToString()
    +" dirty=" + finalPrimitive.DirtyRecordCount.ToString()
    +" ranges=" + finalPrimitive.UploadRangeCount.ToString()
    +" full_upload=" + (finalPrimitive.FullUpload ? "1" : "0")
    +" mapped_writes=" + finalPrimitive.MappedWrites.ToString()
    +" flushes=" + finalPrimitive.Flushes.ToString()
    +" retained_reuse=" + finalPrimitive.RetainedReuse.ToString()
    +" primitive_written=" + finalPrimitive.WrittenBytes.ToString()
    +" primitive_skipped=" + finalPrimitive.SkippedBytes.ToString()
    +" primitive_dirty_records=" + finalPrimitive.DirtyRecordCount.ToString()
    +" primitive_upload_ranges=" + finalPrimitive.UploadRangeCount.ToString()
    +" primitive_full_upload=" + (finalPrimitive.FullUpload ? "1" : "0")
    +" primitive_mapped_writes=" + finalPrimitive.MappedWrites.ToString()
    +" primitive_flushes=" + finalPrimitive.Flushes.ToString()
    +" primitive_retained_reuse=" + finalPrimitive.RetainedReuse.ToString()
    +" total_written=" + finalPrimitive.TotalWrittenBytes.ToString()
    +" total_skipped=" + finalPrimitive.TotalSkippedBytes.ToString()
    +" total_dirty=" + finalPrimitive.TotalDirtyRecordCount.ToString()
    +" total_ranges=" + finalPrimitive.TotalUploadRangeCount.ToString()
    +" total_full_upload=" + finalPrimitive.TotalFullUploads.ToString()
    +" total_mapped_writes=" + finalPrimitive.TotalMappedWrites.ToString()
    +" total_flushes=" + finalPrimitive.TotalFlushes.ToString()
    +" total_retained_reuse=" + finalPrimitive.TotalRetainedReuse.ToString()
    +" slot0=" + (sawSlot0 ? "1" : "0")
    +" slot1=" + (sawSlot1 ? "1" : "0")
    +" both_slots=" + (bothSlots ? "1" : "0")
    +" both_slots_observed=" + (bothSlots ? "1" : "0")
    +" close=1")
}
