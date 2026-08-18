package Goo

import System
import System.Diagnostics
import System.Numerics
import System.Threading

/// Hosts a Goo tree in an SDL window.
public partial class Window {
  shared {
    /// Configures process-wide application identity before SDL initialization.
    /// @param name human-readable application name
    /// @param version application version
    /// @param identifier unique reverse-domain identifier
    public func ConfigureApplication(name string, version string, identifier string) {
      SdlRuntime.ConfigureApplication(name, version, identifier)
    }
  }

  private func requireUiThread(operation string) {
    if uiThreadBound {
      requireOpenThread(operation)
    }
  }

  private func requireOpenThread(operation string) {
    SdlRuntime.RequireMainThread(operation)
  }

  private func pushSize() {
    if let native = host {
      native.SetSize(width, height)
    }
  }

  private func pushPosition() {
    if let native = host {
      native.SetPosition(x, y)
    }
  }

  /// Creates the native window and returns this window.
  /// @returns this window after native initialization
  public func Open() Window {
    requireOpenThread("Window.Open")
    if IsOpen {
      return this
    }
    prepare()

    try {
      let native = SdlHost(
        Title,
        Width,
        Height,
        x,
        y,
        positionSet,
        toSdlState(State),
        decorated,
        resizable,
        transparent,
        VSync,
        func(px int32, py int32) SdlHitResult { return hitTest(px, py) })
      host = native
      uiThreadBound = true
      configureHost(native)
      windowTarget = VulkanWindowTarget(native)
      if !applyNativeResize(
        native.LogicalWidth,
        native.LogicalHeight,
        native.FramebufferWidth,
        native.FramebufferHeight) {
        throw InvalidOperationException("Window initialization could not create a render target")
      }
      x = native.X
      y = native.Y
      input.Attach(native)
      native.Show()
      IsOpen = true
      return this
    } catch (e Exception) {
      Close()
      throw e
    }
  }

  private func configureHost(native SdlHost) {
    native.MetricsChanged += func(logicalWidth int32, logicalHeight int32,
      nativeWidth int32, nativeHeight int32) {
      queueNativeMetrics(logicalWidth, logicalHeight, nativeWidth, nativeHeight)
    }
    native.StateChanged += func(value SdlHostState) {
      state = fromSdlState(value)
      requestRender()
      if let callback = OnStateChange {
        callback(State)
      }
    }
    native.Moved += func(px int32, py int32) {
      x = px
      y = py
    }
    native.FocusChanged += func(hasFocus bool) {
      handleFocusChanged(hasFocus)
    }
    native.Exposed += func() {
      requestRender()
    }
    native.CloseRequested += func() {
      Interlocked.Exchange(&closeRequested, 1)
    }
  }

  internal func handleFocusChanged(hasFocus bool) {
    if IsFocused == hasFocus {
      return
    }
    IsFocused = hasFocus
    if !hasFocus {
      input.FocusLost(resolver)
      markDirtyAndRender()
    }
    if let callback = OnFocusChange {
      callback(hasFocus)
    }
  }

  /// Queues an idempotent close request. This is safe from any thread.
  public func RequestClose() {
    if Interlocked.Exchange(&closeRequested, 1) == 0 {
      host?.Wake()
    }
  }

  // One decision per queued request: native close, Alt+F4, and RequestClose
  // all land here; nil OnClosing closes, false vetoes.
  internal func drainCloseRequest() bool {
    if Interlocked.Exchange(&closeRequested, 0) == 0 {
      return false
    }
    guard let handler = OnClosing else {
      return true
    }
    return handler()
  }

  /// Processes one frame with the specified elapsed time.
  /// @param dt elapsed seconds since the previous frame
  public func Pump(dt float64) {
    requireUiThread("Window.Pump")
    if !motionFinite(dt) || dt < 0.0 {
      throw ArgumentOutOfRangeException("dt")
    }
    guard let native = host else {
      return
    }
    if native.IsClosing {
      Close()
      return
    }
    if !IsOpen {
      return
    }
    let profiling = profiler.Enabled
    let frameProfile = profiling ? profiler.Start() : FrameProfilePoint{}
    let eventsProfile = profiling ? profiler.Start() : FrameProfilePoint{}
    if hasDemand() {
      native.PollEvents()
    } else {
      // No demand: block for native/Wake events instead of spinning. The
      // timeout is a fallback net (or the caret's next blink deadline);
      // real wakeups (input, Wake()) return immediately regardless of it.
      native.WaitEvents(idleWaitMs())
    }
    let repeatStartTicks = Stopwatch.GetTimestamp()
    if !native.IsClosing && drainCloseRequest() {
      stopPosts()
      native.BeginClose()
    }
    if native.IsClosing || !IsOpen {
      try {
        Close()
      } finally {
        if profiling {
          profiler.Record(FrameProfileStage.Events, eventsProfile)
          profiler.EndFrame(frameProfile, false)
        }
      }
      return
    }
    consumeNativeMetrics()
    if profiling {
      profiler.Record(FrameProfileStage.Events, eventsProfile)
    }

    // Pump drains each fixed Post batch here, after close decisions and before input.
    drainPostedActions()

    // Drain returns true only for visually relevant input; bare moves stay quiet.
    let inputProfile = profiling ? profiler.Start() : FrameProfilePoint{}
    let inputChanged = input.Drain(node, resolver, timeS, OnKeyPress, repeatStartTicks)
    if profiling {
      profiler.Record(FrameProfileStage.Input, inputProfile)
    }
    if inputChanged {
      accessibility?.MarkDirty()
      resolver.VisualDirty = true
    }
    // dt can carry a stale idle wait (up to 250 ms) plus whatever this call's
    // own poll/wait consumed. Nothing was ticking while asleep (hasDemand()
    // was false), so nothing loses banked motion; without this clamp, an
    // anim/transition/scroll retarget started by the very input that just
    // woke us would take its first (and sometimes only) step across the
    // whole stale gap instead of animating. timeS (and so input's
    // double-click clock) must NOT be clamped, or it runs slow while idle
    // and misreads two far-apart clicks as a double-click -- only the
    // simulation step is bounded; UpdateTree's wallDt/simDt split keeps them
    // separate.
    let stepDt = Math.Min(dt, 1.0 / 30.0)
    let treeProfile = profiling ? profiler.Start() : FrameProfilePoint{}
    UpdateTree(dt, stepDt)
    if profiling {
      profiler.Record(FrameProfileStage.Tree, treeProfile)
    }
    native.SetCursor(toSdlCursor(input.CurrentCursor()))
    var rendered = false
    if needsRenderFrame(resolver.VisualDirty) {
      let renderProfile = profiling ? profiler.Start() : FrameProfilePoint{}
      let currentProfile = profiling ? profiler.Start() : FrameProfilePoint{}
      windowTarget?.BeginFrame()
      if profiling {
        profiler.Record(FrameProfileStage.TargetBegin, currentProfile)
      }
      renderFrame()
      let swapProfile = profiling ? profiler.Start() : FrameProfilePoint{}
      windowTarget?.Present()
      if profiling {
        profiler.Record(FrameProfileStage.Present, swapProfile)
        profiler.Record(FrameProfileStage.Render, renderProfile)
      }
      markFrameRendered()
      rendered = true
    }
    if profiling {
      profiler.EndFrame(frameProfile, rendered)
    }
  }

  // One source of truth for "may I sleep": a running Anim, a mid-transition
  // Resolver field, an already-requested render, a not-yet-drained rebuild,
  // or scroll glide/scrollbar fade still settling. Any of these means Pump
  // must keep spinning; none of them means it is safe to block in SdlHost.
  // Caret blink and key repeat are deliberately NOT here: unlike the sources
  // above, they never terminate on their own (a focus caret keeps "wanting"
  // a tick for as long as it's focused), so folding them into demand would
  // latch Pump into an unpaced, unrendered poll spin instead of a bounded
  // sleep. idleWaitMs() below is where their timing actually gets honored.
  private func hasDemand() bool {
    return motionPump.Active || resolver.Animating.Count > 0 || renderDirty || pendingRebuild != 0
      || pendingImageCompletion != 0 || pendingRetainedInvalidation != 0 || hasScrollDemand()
      || accessibility?.HasDemand == true || hasPostedActions() || MetricSubscriptions.HasDemand(this)
  }

  // The idle wait timeout: 250ms by default, shortened to land on the next
  // caret blink or key-repeat edge when one is due sooner, so a focused,
  // otherwise-idle window still blocks (near-0 CPU) instead of polling, but
  // wakes itself in time to render each blink transition.
  private func idleWaitMs() int32 {
    let deadline = Math.Min(0.25, input.NextTickDeadlineSeconds())
    let ms = int32(Math.Ceiling(deadline * 1000.0))
    return ms < 1 ? 1 : ms
  }

  private func hasScrollDemand() bool {
    guard let n = node else {
      return false
    }
    let scrollers = layout.ScrollNodes(n)
    for i in 0 ... scrollers.Count {
      let s = scrollers[i]
      if s.ScrollX != s.ScrollTargetX || s.ScrollY != s.ScrollTargetY || s.ScrollBarAlpha > 0.0F {
        return true
      }
    }
    return false
  }

  /// Opens the window and processes frames until it closes.
  public func Run() {
    requireOpenThread("Window.Run")
    Open()
    try {
      let clock = Stopwatch.StartNew()
      var last = clock.Elapsed.TotalSeconds
      while IsOpen {
        let now = clock.Elapsed.TotalSeconds
        Pump(now - last)
        last = now
      }
    } finally {
      if IsOpen {
        Close()
      }
    }
  }
  internal func teardownNative() {
    requireUiThread("Window teardown")
    stopPosts()
    try {
      input.Reset(node, resolver)
    } finally {
      try {
        input.Dispose()
      } finally {
        windowTarget?.Dispose()
        windowTarget = nil
        host?.Dispose()
        host = nil
        framebufferWidth = 0
        framebufferHeight = 0
        pendingMetrics = false
        pendingLogicalWidth = 0
        pendingLogicalHeight = 0
        pendingFramebufferWidth = 0
        pendingFramebufferHeight = 0
        IsOpen = false
        renderDirty = true
        Interlocked.Exchange(&closeRequested, 0)
        IsFocused = false
      }
    }
  }

  internal func Close() {
    requireUiThread("Window.Close")
    stopPosts()
    stopImageCompletions()
    stopRetainedInvalidations()
    try {
      teardownNative()
    } finally {
      try {
        if let tree = node {
          node = nil
          TextLayouts.DisposeTree(tree)
        }
      } finally {
        try {
          MetricSubscriptions.Flush(this)
        } finally {
          MetricSubscriptions.ClearWindow(this)
        }
      }
      motionPump.Clear()
      pendingRebuild = 0
      pendingPaintResourceInvalidation = 0
      lock cellQueueGate {
        cellTransactionActive = false
        pendingCells.Clear()
        deferredCells.Clear()
        cellBatch.Clear()
        fiberBatch.Clear()
      }
      paintResourceHook = nil
      imageCompletionHook = nil
      retainedInvalidationHook = nil
      resolver.PaintResourceInvalidated = nil
      cellHook = nil
      hookInstalled = false
    }
  }

  private func renderFrame() {
    if let target = windowTarget {
      let paintProfile = profiler.Enabled ? profiler.Start() : FrameProfilePoint{}
      target.Render(node, Background, dpi)
      if profiler.Enabled {
        profiler.Record(FrameProfileStage.Paint, paintProfile)
      }
    }
  }

  private func consumeNativeMetrics() {
    if !pendingMetrics {
      return
    }
    pendingMetrics = false
    if !applyNativeResize(
      pendingLogicalWidth,
      pendingLogicalHeight,
      pendingFramebufferWidth,
      pendingFramebufferHeight) {
      Close()
    }
  }

  private func applyNativeResize(logicalWidth int32, logicalHeight int32,
    newFramebufferWidth int32, newFramebufferHeight int32) bool {
    HandleResize(logicalWidth, logicalHeight)
    if newFramebufferWidth <= 0 || newFramebufferHeight <= 0 {
      return true
    }
    dpi = DpiScale(logicalWidth, logicalHeight, newFramebufferWidth, newFramebufferHeight)
    requestRender()
    guard let target = windowTarget else {
      return false
    }
    if !target.Resize(newFramebufferWidth, newFramebufferHeight) {
      return false
    }
    framebufferWidth = newFramebufferWidth
    framebufferHeight = newFramebufferHeight
    return true
  }
}

internal func DpiScale(width int32, height int32, fbWidth int32, fbHeight int32) Vector2 {
  if width <= 0 || height <= 0 || fbWidth <= 0 || fbHeight <= 0 {
    return Vector2(1.0F, 1.0F)
  }
  return Vector2(float32(fbWidth) / float32(width), float32(fbHeight) / float32(height))
}
