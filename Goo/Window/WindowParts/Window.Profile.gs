package Goo

import System
import System.Collections.Generic
import System.Diagnostics
import System.Text

internal enum FrameProfileStage {
  Frame; Events; Input; Tree; Motion; Reconcile; Build; Diff; StyleResolve;
  Transitions; Layout; InputTree;
  Render; MakeCurrent; Paint; CanvasFlush; GpuFlush; Swap; Count
}

internal data struct FrameProfilePoint {
  internal var Ticks int64
  internal var Bytes int64
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
    // Report labels for Events..Swap in enum order.
    private let stageNames []string = []string{
      "events", "input", "tree", "motion", "reconcile", "build", "diff", "style_resolve",
      "transitions", "layout", "input_tree", "render", "current", "paint", "canvas_flush",
      "gpu_flush", "swap" }
  }

  private let enabled bool
  private let totals List[FrameProfileTotal]
  private var warmupFrames int32
  private var frames int32
  private var rendered int32
  private var styleResolveNodes int64

  internal prop Enabled bool { get { return enabled } }

  internal init() {
    enabled = Environment.GetEnvironmentVariable("GOO_FRAME_PROFILE") == "1"
    warmupFrames = 60
    totals = List[FrameProfileTotal]()
    for i in 0 ... int32(FrameProfileStage.Count) {
      totals.Add(FrameProfileTotal())
    }
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
    let total = totals[int32(stage)]
    total.Ticks = total.Ticks + ticks
    total.Bytes = total.Bytes + bytes
    total.Calls = total.Calls + calls
  }

  internal func EndFrame(start FrameProfilePoint, didRender bool) {
    Record(FrameProfileStage.Frame, start)
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
    let ticks = totals[int32(stage)].Ticks
    let value = float64(ticks) * 1000.0 / float64(Stopwatch.Frequency) / float64(frames)
    return value.ToString("F3")
  }

  private func bytes(stage FrameProfileStage) int64 {
    if frames == 0 {
      return 0
    }
    return totals[int32(stage)].Bytes / int64(frames)
  }

  private func callCount(stage FrameProfileStage) int64 {
    return totals[int32(stage)].Calls
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
    for total in totals {
      total.Reset()
    }
  }
}
