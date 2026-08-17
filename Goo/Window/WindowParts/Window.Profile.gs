package Goo

import System
import System.Collections.Generic
import System.Diagnostics
import System.IO
import System.Text
import System.Threading

internal enum FrameProfileStage {
  Frame = 0; Events = 1; Input = 2; Tree = 3; Motion = 4; Reconcile = 5; Build = 6; Diff = 7; StyleResolve = 8;
  Transitions = 9; Layout = 10; InputTree = 11;
  Render = 12; TargetBegin = 13; Paint = 14; CanvasFlush = 15; TargetFlush = 16; Present = 17; Count = 18
}

internal data struct FrameProfilePoint {
  internal var Ticks int64
  internal var Bytes int64
}

internal data struct FrameTraceRecord {
  internal var Window int32
  internal var Frame int64
  internal var Stage int32
  internal var Rendered int32
  internal var Ticks int64
  internal var Bytes int64
  internal var Calls int64
}

internal class FrameProfileTotal {
  internal var Ticks int64
  internal var Bytes int64
  internal var Calls int64

  internal func Reset() {
    Ticks = 0
    Bytes = 0
    Calls = 0
  }
}

internal class FrameProfiler {
  shared {
    private let stageNames []string = []string{
      "events", "input", "tree", "motion", "reconcile", "build", "diff", "style_resolve",
      "transitions", "layout", "input_tree", "render", "target_begin", "paint", "canvas_flush",
      "target_flush", "present" }
    private var traceSequence int32
    private let traceSchemaVersion int32 = 1
    private let traceMaxRecords int32 = 131072

    internal func Create() FrameProfiler? {
      let profile = Environment.GetEnvironmentVariable("GOO_FRAME_PROFILE") == "1"
      let path = Environment.GetEnvironmentVariable("GOO_FRAME_TRACE_PATH")
      if !profile && (path == nil || path == "") {
        return nil
      }
      return FrameProfiler(profile, path)
    }
  }

  private let enabled bool
  private let profileOutput bool
  private let totals List[FrameProfileTotal]?
  private let tracePath string?
  private let traceWindowId int32
  private let traceWarmupConfigured int32
  private let traceRecords List[FrameTraceRecord]?
  private var traceWarmupRemaining int32
  private var traceFrameId int64
  private var traceFrameStart int32
  private var traceFrameRecording bool
  private var traceDroppedRecords int64
  private var traceFlushed bool
  private var warmupFrames int32
  private var frames int32
  private var rendered int32
  private var styleResolveNodes int64

  internal prop Enabled bool { get { return enabled } }

  internal init(profile bool, requestedTracePath string?) {
    profileOutput = profile
    enabled = profile || (requestedTracePath != nil && requestedTracePath != "")
    warmupFrames = 60
    totals = if profile {
      let values = List[FrameProfileTotal](int32(FrameProfileStage.Count))
      for i in 0 ... int32(FrameProfileStage.Count) {
        values.Add(FrameProfileTotal())
      }
      values
    } else {
      nil
    }
    if let path = requestedTracePath {
      let id = Interlocked.Increment(&traceSequence)
      tracePath = if id == 1 { path } else { path + "." + id.ToString() }
      traceWindowId = id
      traceWarmupConfigured = readTraceWarmup()
      traceWarmupRemaining = traceWarmupConfigured
      traceRecords = List[FrameTraceRecord](traceMaxRecords)
    } else {
      tracePath = nil
      traceWindowId = 0
      traceWarmupConfigured = 0
      traceWarmupRemaining = 0
      traceRecords = nil
    }
    traceFrameId = 0
    traceFrameStart = 0
    traceFrameRecording = false
    traceDroppedRecords = 0
    traceFlushed = false
  }

  private func readTraceWarmup() int32 {
    let value = Environment.GetEnvironmentVariable("GOO_FRAME_TRACE_WARMUP")
    guard let text = value else { return 0 }
    let parsed = Int32.Parse(text)
    if parsed < 0 {
      throw ArgumentOutOfRangeException("GOO_FRAME_TRACE_WARMUP")
    }
    return parsed
  }

  internal func BeginFrame() FrameProfilePoint {
    if tracePath != nil {
      traceFrameId = traceFrameId + 1
      if traceWarmupRemaining > 0 {
        traceWarmupRemaining = traceWarmupRemaining - 1
        traceFrameRecording = false
      } else {
        traceFrameStart = traceRecords?.Count ?? 0
        traceFrameRecording = true
      }
    }
    return Start()
  }

  internal func Start() FrameProfilePoint {
    return FrameProfilePoint{
      Ticks: Stopwatch.GetTimestamp(),
      Bytes: GC.GetAllocatedBytesForCurrentThread(),
    }
  }

  internal func Record(stage FrameProfileStage, start FrameProfilePoint) {
    let elapsed = Elapsed(start)
    Add(stage, elapsed.Ticks, elapsed.Bytes, 1)
  }

  internal func Elapsed(start FrameProfilePoint) FrameProfilePoint {
    return FrameProfilePoint{
      Ticks: Stopwatch.GetTimestamp() - start.Ticks,
      Bytes: GC.GetAllocatedBytesForCurrentThread() - start.Bytes,
    }
  }

  internal func RecordStyleResolveNodes(nodes int64) {
    styleResolveNodes = styleResolveNodes + nodes
  }

  internal func RecordReconcileSplit(
    start FrameProfilePoint,
    buildTicks int64,
    buildBytes int64,
    buildCalls int64,
    resolveTicks int64,
    resolveBytes int64,
    resolveCalls int64,
  ) {
    let elapsed = Elapsed(start)
    Add(FrameProfileStage.Reconcile, elapsed.Ticks, elapsed.Bytes, 1)
    Add(FrameProfileStage.Build, buildTicks, buildBytes, buildCalls)
    Add(FrameProfileStage.StyleResolve, resolveTicks, resolveBytes, resolveCalls)

    let diffTicks = elapsed.Ticks - buildTicks - resolveTicks
    let diffBytes = elapsed.Bytes - buildBytes - resolveBytes
    Add(
      FrameProfileStage.Diff,
      diffTicks < 0 ? 0 : diffTicks,
      diffBytes < 0 ? 0 : diffBytes,
      1,
    )
  }

  private func Add(stage FrameProfileStage, ticks int64, bytes int64, calls int64) {
    if let values = totals {
      let total = values[int32(stage)]
      total.Ticks = total.Ticks + ticks
      total.Bytes = total.Bytes + bytes
      total.Calls = total.Calls + calls
    }
    if traceFrameRecording {
      if let values = traceRecords {
        if values.Count >= traceMaxRecords {
          traceDroppedRecords = traceDroppedRecords + 1
        } else {
          values.Add(FrameTraceRecord{
            Window: traceWindowId,
            Frame: traceFrameId,
            Stage: int32(stage),
            Rendered: 0,
            Ticks: ticks,
            Bytes: bytes,
            Calls: calls,
          })
        }
      }
    }
  }

  internal func EndFrame(start FrameProfilePoint, didRender bool) {
    Record(FrameProfileStage.Frame, start)
    if traceFrameRecording {
      if let values = traceRecords {
        for i in traceFrameStart ... values.Count {
          var record = values[i]
          record.Rendered = didRender ? 1 : 0
          values[i] = record
        }
      }
      traceFrameRecording = false
    }
    if profileOutput {
      if warmupFrames > 0 {
        warmupFrames--
        Reset()
        return
      }
      frames++
      if didRender {
        rendered++
      }
      if frames >= 240 {
        Report()
        Reset()
      }
    }
  }

  internal func Flush() {
    guard let path = tracePath else { return }
    if traceFlushed {
      return
    }
    traceFlushed = true
    try {
      using let writer = StreamWriter(path, false)
      writer.Write("{\"type\":\"header\",\"schema\":")
      writer.Write(traceSchemaVersion)
      writer.Write(",\"window\":")
      writer.Write(traceWindowId)
      writer.Write(",\"frequency\":")
      writer.Write(Stopwatch.Frequency)
      writer.Write(",\"stages\":[{\"id\":0,\"name\":\"frame\"}")
      for i in 0 ... stageNames.Length {
        writer.Write(",{\"id\":")
        writer.Write(int32(FrameProfileStage.Events) + i)
        writer.Write(",\"name\":\"")
        writer.Write(stageNames[i])
        writer.Write("\"}")
      }
      writer.Write("]")
      writer.Write(",\"warmup\":")
      writer.Write(traceWarmupConfigured)
      writer.WriteLine("}")
      if let values = traceRecords {
        for i in 0 ... values.Count {
          let record = values[i]
          writer.Write("{\"type\":\"stage\",\"schema\":")
          writer.Write(traceSchemaVersion)
          writer.Write(",\"window\":")
          writer.Write(record.Window)
          writer.Write(",\"frame\":")
          writer.Write(record.Frame)
          writer.Write(",\"stage\":")
          writer.Write(record.Stage)
          writer.Write(",\"rendered\":")
          writer.Write(record.Rendered)
          writer.Write(",\"ticks\":")
          writer.Write(record.Ticks)
          writer.Write(",\"bytes\":")
          writer.Write(record.Bytes)
          writer.Write(",\"calls\":")
          writer.Write(record.Calls)
          writer.WriteLine("}")
        }
      }
      writer.Write("{\"type\":\"summary\",\"schema\":")
      writer.Write(traceSchemaVersion)
      writer.Write(",\"window\":")
      writer.Write(traceWindowId)
      writer.Write(",\"frequency\":")
      writer.Write(Stopwatch.Frequency)
      writer.Write(",\"records\":")
      writer.Write(traceRecords?.Count ?? 0)
      writer.Write(",\"dropped\":")
      writer.Write(traceDroppedRecords)
      writer.WriteLine("}")
    } catch (e Exception) {
      Console.Error.WriteLine("[goo.frame_trace] " + e.Message)
    }
  }

  private func Report() {
    let reconcileCalls = callCount(FrameProfileStage.Reconcile)
    let buildCalls = callCount(FrameProfileStage.Build)
    let diffCalls = callCount(FrameProfileStage.Diff)
    let styleResolveCalls = callCount(FrameProfileStage.StyleResolve)
    let layoutCalls = callCount(FrameProfileStage.Layout)
    let paintCalls = callCount(FrameProfileStage.Paint)
    Console.WriteLine("[goo.profile] frames=$frames rendered=$rendered calls(reconcile/build/diff/layout/paint)=$reconcileCalls/$buildCalls/$diffCalls/$layoutCalls/$paintCalls")
    let styleEntriesPerFrame = countPerFrame(styleResolveCalls)
    let styleNodesPerFrame = countPerFrame(styleResolveNodes)
    Console.WriteLine("[goo.profile.reconcile_style] total(entry/node)=$styleResolveCalls/$styleResolveNodes per_frame(entry/node)=$styleEntriesPerFrame/$styleNodesPerFrame")

    let sb = StringBuilder()
    sb.Append("[goo.profile.time_ms/frame] total=").Append(time(FrameProfileStage.Frame))
    for i in 0 ... stageNames.Length {
      let stage = FrameProfileStage(int32(FrameProfileStage.Events) + i)
      sb.Append(" ").Append(stageNames[i]).Append("=").Append(time(stage))
    }
    Console.WriteLine(sb.ToString())

    sb.Clear()
    sb.Append("[goo.profile.alloc_B/frame] total=").Append(bytes(FrameProfileStage.Frame))
    for i in 0 ... stageNames.Length {
      let stage = FrameProfileStage(int32(FrameProfileStage.Events) + i)
      sb.Append(" ").Append(stageNames[i]).Append("=").Append(bytes(stage))
    }
    Console.WriteLine(sb.ToString())
  }

  private func time(stage FrameProfileStage) string {
    if frames == 0 {
      return "0.000"
    }
    guard let values = totals else { return "0.000" }
    let ticks = values[int32(stage)].Ticks
    let value = float64(ticks) * 1000.0 / float64(Stopwatch.Frequency) / float64(frames)
    return value.ToString("F3")
  }

  private func bytes(stage FrameProfileStage) int64 {
    if frames == 0 {
      return 0
    }
    guard let values = totals else { return 0 }
    return values[int32(stage)].Bytes / int64(frames)
  }

  private func callCount(stage FrameProfileStage) int64 {
    guard let values = totals else { return 0 }
    return values[int32(stage)].Calls
  }

  private func countPerFrame(value int64) string {
    if frames == 0 {
      return "0.00"
    }
    return (float64(value) / float64(frames)).ToString("F2")
  }

  private func Reset() {
    frames = 0
    rendered = 0
    styleResolveNodes = 0
    if let values = totals {
      for total in values {
        total.Reset()
      }
    }
  }
}
