package Goo.VulkanProof

import System.Runtime.InteropServices

@DllImport("SDL3", EntryPoint: "SDL_GetWindowID", CallingConvention: CallingConvention.Cdecl)
func SDL_GetWindowID(window nint) uint32;

@DllImport("SDL3", EntryPoint: "SDL_GetWindowFlags", CallingConvention: CallingConvention.Cdecl)
func SDL_GetWindowFlags(window nint) uint64;

@DllImport("SDL3", EntryPoint: "SDL_SetWindowPosition", CallingConvention: CallingConvention.Cdecl)
func SDL_SetWindowPosition(window nint, x int32, y int32) uint8;

@DllImport("SDL3", EntryPoint: "SDL_SetWindowSize", CallingConvention: CallingConvention.Cdecl)
func SDL_SetWindowSize(window nint, width int32, height int32) uint8;

@DllImport("SDL3", EntryPoint: "SDL_GetWindowSize", CallingConvention: CallingConvention.Cdecl)
func SDL_GetWindowSize(window nint, ref width int32, ref height int32) uint8;

@DllImport("SDL3", EntryPoint: "SDL_GetWindowSizeInPixels", CallingConvention: CallingConvention.Cdecl)
func SDL_GetWindowSizeInPixels(window nint, ref width int32, ref height int32) uint8;

@DllImport("SDL3", EntryPoint: "SDL_GetWindowPixelDensity", CallingConvention: CallingConvention.Cdecl)
func SDL_GetWindowPixelDensity(window nint) float32;

@DllImport("SDL3", EntryPoint: "SDL_GetWindowDisplayScale", CallingConvention: CallingConvention.Cdecl)
func SDL_GetWindowDisplayScale(window nint) float32;

@DllImport("SDL3", EntryPoint: "SDL_ShowWindow", CallingConvention: CallingConvention.Cdecl)
func SDL_ShowWindow(window nint) uint8;

@DllImport("SDL3", EntryPoint: "SDL_MinimizeWindow", CallingConvention: CallingConvention.Cdecl)
func SDL_MinimizeWindow(window nint) uint8;

@DllImport("SDL3", EntryPoint: "SDL_RestoreWindow", CallingConvention: CallingConvention.Cdecl)
func SDL_RestoreWindow(window nint) uint8;

@DllImport("SDL3", EntryPoint: "SDL_SyncWindow", CallingConvention: CallingConvention.Cdecl)
func SDL_SyncWindow(window nint) uint8;

@DllImport("SDL3", EntryPoint: "SDL_PumpEvents", CallingConvention: CallingConvention.Cdecl)
func SDL_PumpEvents() void;

@DllImport("SDL3", EntryPoint: "SDL_PollEvent", CallingConvention: CallingConvention.Cdecl)
unsafe func SDL_PollEvent(nativeEvent * SdlEvent) uint8;

@DllImport("SDL3", EntryPoint: "SDL_WaitEventTimeout", CallingConvention: CallingConvention.Cdecl)
unsafe func SDL_WaitEventTimeout(nativeEvent * SdlEvent, timeoutMs int32) uint8;

@DllImport("SDL3", EntryPoint: "SDL_PeepEvents", CallingConvention: CallingConvention.Cdecl)
unsafe func SDL_PeepEvents(nativeEvent * SdlEvent, count int32, action int32, minType uint32, maxType uint32) int32;

unsafe struct SdlEvent {
  var eventType uint32
  fixed padding[124]uint8
}

unsafe struct SdlWindowEvent {
  var eventType uint32
  var reserved uint32
  var timestamp uint64
  var windowIdentifier uint32
  var data1 int32
  var data2 int32
}

internal class SdlEventConstants {
  shared {
    const Quit uint32 = 0x100u
    const WindowFirst uint32 = 0x202u
    const WindowExposed uint32 = 0x204u
    const WindowResized uint32 = 0x206u
    const WindowPixelSizeChanged uint32 = 0x207u
    const WindowMinimized uint32 = 0x209u
    const WindowMaximized uint32 = 0x20Au
    const WindowRestored uint32 = 0x20Bu
    const WindowCloseRequested uint32 = 0x210u
    const WindowDisplayChanged uint32 = 0x213u
    const WindowDisplayScaleChanged uint32 = 0x214u
    const WindowDestroyed uint32 = 0x219u
    const WindowLast uint32 = 0x21Au
    const WindowMinimizedFlag uint64 = 0x0000000000000040uL
    const Last uint32 = 0xFFFFu
    const PeekEvent int32 = 1
    const GetEvent int32 = 2
  }
}

internal enum SdlLifecycleState {
  Closed;
  OpenPending;
  Ready;
  Suspended;
  Closing;
}

internal data struct SdlLifecycleChangeSet {
  var logicalChanged bool
  var pixelChanged bool
  var scaleChanged bool
  var exposed bool
  var minimized bool
  var restored bool
  var closeRequested bool
  var destroyed bool
}

internal unsafe class SdlLifecycle {
  private const EventBatchCapacity int32 = 32
  private var windowId uint32
  private var state SdlLifecycleState
  private var logicalWidth int32
  private var logicalHeight int32
  private var pixelWidth int32
  private var pixelHeight int32
  private var pixelDensity float32
  private var displayScale float32
  private var logicalDirty bool
  private var pixelDirty bool
  private var scaleDirty bool
  private var renderDirty bool
  private var closeRequested bool
  private var destroyed bool
  private var exposed bool
  private var minimized bool
  private var restored bool
  private var lastDrainResult int32

  internal prop WindowId uint32{ get -> windowId }
  internal prop State SdlLifecycleState{ get -> state }
  internal prop LogicalWidth int32{ get -> logicalWidth }
  internal prop LogicalHeight int32{ get -> logicalHeight }
  internal prop PixelWidth int32{ get -> pixelWidth }
  internal prop PixelHeight int32{ get -> pixelHeight }
  internal prop PixelDensity float32{ get -> pixelDensity }
  internal prop DisplayScale float32{ get -> displayScale }
  internal prop LogicalDirty bool{ get -> logicalDirty }
  internal prop PixelDirty bool{ get -> pixelDirty }
  internal prop ScaleDirty bool{ get -> scaleDirty }
  internal prop RenderDirty bool{ get -> renderDirty }
  internal prop CloseRequested bool{ get -> closeRequested }
  internal prop Destroyed bool{ get -> destroyed }
  internal prop Exposed bool{ get -> exposed }
  internal prop Minimized bool{ get -> minimized }
  internal prop Restored bool{ get -> restored }
  internal prop LastDrainResult int32{ get -> lastDrainResult }

  internal init() {
    state = SdlLifecycleState.Closed
  }

  internal func BeginOpen(window nint) uint32 {
    let id = SDL_GetWindowID(window)
    if id == 0u {
      throw InvalidOperationException("SDL_GetWindowID failed")
    }
    windowId = id
    state = SdlLifecycleState.OpenPending
    logicalDirty = true
    pixelDirty = true
    scaleDirty = true
    renderDirty = true
    closeRequested = false
    destroyed = false
    exposed = false
    minimized = false
    restored = false
    return id
  }

  internal func SetWindowPosition(window nint, x int32, y int32) {
    if SDL_SetWindowPosition(window, x, y) == 0u {
      throw InvalidOperationException("SDL_SetWindowPosition failed")
    }
  }

  internal func SetWindowSize(window nint, width int32, height int32) {
    if SDL_SetWindowSize(window, width, height) == 0u {
      throw InvalidOperationException("SDL_SetWindowSize failed")
    }
  }

  internal func ShowWindow(window nint) {
    if SDL_ShowWindow(window) == 0u {
      throw InvalidOperationException("SDL_ShowWindow failed")
    }
  }

  internal func MinimizeWindow(window nint) {
    if SDL_MinimizeWindow(window) == 0u {
      throw InvalidOperationException("SDL_MinimizeWindow failed")
    }
  }

  internal func RestoreWindow(window nint) {
    if SDL_RestoreWindow(window) == 0u {
      throw InvalidOperationException("SDL_RestoreWindow failed")
    }
  }

  internal func SyncWindow(window nint) {
    if SDL_SyncWindow(window) == 0u {
      throw InvalidOperationException("SDL_SyncWindow failed")
    }
  }

  internal func RefreshMetrics(window nint) bool {
    var nextLogicalWidth int32 = 0
    var nextLogicalHeight int32 = 0
    var nextPixelWidth int32 = 0
    var nextPixelHeight int32 = 0
    if SDL_GetWindowSize(window, ref nextLogicalWidth, ref nextLogicalHeight) == 0u {
      throw InvalidOperationException("SDL_GetWindowSize failed")
    }
    if SDL_GetWindowSizeInPixels(window, ref nextPixelWidth, ref nextPixelHeight) == 0u {
      throw InvalidOperationException("SDL_GetWindowSizeInPixels failed")
    }
    let nextPixelDensity = SDL_GetWindowPixelDensity(window)
    let nextDisplayScale = SDL_GetWindowDisplayScale(window)
    let nextMinimized = (SDL_GetWindowFlags(window) & SdlEventConstants.WindowMinimizedFlag) != 0uL
    let changed = nextLogicalWidth != logicalWidth || nextLogicalHeight != logicalHeight
      || nextPixelWidth != pixelWidth || nextPixelHeight != pixelHeight
      || nextPixelDensity != pixelDensity || nextDisplayScale != displayScale
      || nextMinimized != minimized
    if nextLogicalWidth != logicalWidth || nextLogicalHeight != logicalHeight {
      logicalDirty = true
      renderDirty = true
    }
    if nextPixelWidth != pixelWidth || nextPixelHeight != pixelHeight {
      pixelDirty = true
      renderDirty = true
    }
    if nextPixelDensity != pixelDensity || nextDisplayScale != displayScale {
      scaleDirty = true
      logicalDirty = true
      renderDirty = true
    }
    if nextMinimized != minimized {
      minimized = nextMinimized
      if minimized {
        state = SdlLifecycleState.Suspended
        renderDirty = false
      } else {
        restored = true
        logicalDirty = true
        pixelDirty = true
        renderDirty = true
      }
    }
    logicalWidth = nextLogicalWidth
    logicalHeight = nextLogicalHeight
    pixelWidth = nextPixelWidth
    pixelHeight = nextPixelHeight
    pixelDensity = nextPixelDensity
    displayScale = nextDisplayScale
    if state == SdlLifecycleState.Ready || state == SdlLifecycleState.Suspended {
      if minimized || pixelWidth == 0 || pixelHeight == 0 {
        state = SdlLifecycleState.Suspended
      } else {
        state = SdlLifecycleState.Ready
      }
    }
    return changed
  }

  internal func MarkReady() {
    if state == SdlLifecycleState.OpenPending || state == SdlLifecycleState.Suspended {
      if minimized || pixelWidth == 0 || pixelHeight == 0 {
        state = SdlLifecycleState.Suspended
      } else {
        state = SdlLifecycleState.Ready
      }
    }
    renderDirty = true
  }

  internal func MarkPresented() {
    if state == SdlLifecycleState.OpenPending {
      MarkReady()
    }
    renderDirty = false
    logicalDirty = false
    pixelDirty = false
    scaleDirty = false
    exposed = false
    restored = false
  }

  internal func RequestRender() {
    renderDirty = true
  }

  internal func BeginClose() {
    closeRequested = true
    state = SdlLifecycleState.Closing
    renderDirty = false
  }

  internal func RejectClose() {
    if destroyed {
      return
    }
    closeRequested = false
    if minimized || pixelWidth == 0 || pixelHeight == 0 {
      state = SdlLifecycleState.Suspended
      renderDirty = false
    } else {
      state = SdlLifecycleState.Ready
      renderDirty = true
    }
  }

  internal func MarkDestroyed() {
    destroyed = true
    closeRequested = true
    state = SdlLifecycleState.Closing
    renderDirty = false
  }

  internal func ResetClosed() {
    windowId = 0u
    state = SdlLifecycleState.Closed
    logicalWidth = 0
    logicalHeight = 0
    pixelWidth = 0
    pixelHeight = 0
    pixelDensity = 0.0F
    displayScale = 0.0F
    logicalDirty = false
    pixelDirty = false
    scaleDirty = false
    renderDirty = false
    closeRequested = false
    destroyed = false
    exposed = false
    minimized = false
    restored = false
    lastDrainResult = 0
  }

  internal func ConsumeChanges() SdlLifecycleChangeSet {
    let result = SdlLifecycleChangeSet{
      logicalChanged: logicalDirty,
      pixelChanged: pixelDirty,
      scaleChanged: scaleDirty,
      exposed: exposed,
      minimized: minimized,
      restored: restored,
      closeRequested: closeRequested,
      destroyed: destroyed,
    }
    logicalDirty = false
    pixelDirty = false
    scaleDirty = false
    exposed = false
    restored = false
    return result
  }

  internal func DrainEvents() int32 {
    SDL_PumpEvents()
    return DrainPending()
  }

  internal func WaitAndDrain(timeoutMs int32) int32 {
    SDL_WaitEventTimeout(nil, timeoutMs)
    SDL_PumpEvents()
    return DrainPending()
  }

  internal func ProcessEvent(nativeEvent * SdlEvent) bool -> DispatchEvent(nativeEvent)

  private func DrainPending() int32 {
    let quitEvents = DrainRange(SdlEventConstants.Quit, SdlEventConstants.Quit)
    if quitEvents < 0 {
      return quitEvents
    }
    let windowEvents = DrainRange(SdlEventConstants.WindowFirst, SdlEventConstants.WindowLast)
    if windowEvents < 0 {
      return windowEvents
    }
    lastDrainResult = quitEvents + windowEvents
    return lastDrainResult
  }

  private func DrainRange(minType uint32, maxType uint32) int32 {
    var pending = SDL_PeepEvents(nil, 0, SdlEventConstants.PeekEvent,
      minType, maxType)
    if pending < 0 {
      lastDrainResult = pending
      throw InvalidOperationException("SDL_PeepEvents failed")
    }
    var processed int32 = 0
    let events * SdlEvent = stackalloc[EventBatchCapacity]SdlEvent
    while pending > 0 {
      let request = pending > EventBatchCapacity ? EventBatchCapacity : pending
      let received = SDL_PeepEvents(events, request, SdlEventConstants.GetEvent,
        minType, maxType)
      if received < 0 {
        lastDrainResult = received
        throw InvalidOperationException("SDL_PeepEvents failed")
      }
      if received == 0 {
        break
      }
      var index int32 = 0
      while index < received {
        DispatchEvent(&events[index])
        index++
      }
      processed += received
      pending -= received
    }
    return processed
  }

  private func DispatchEvent(nativeEvent * SdlEvent) bool {
    let eventType = nativeEvent -> eventType
    if eventType == SdlEventConstants.Quit {
      closeRequested = true
      state = SdlLifecycleState.Closing
      renderDirty = false
      return true
    }
    if eventType < SdlEventConstants.WindowFirst || eventType > SdlEventConstants.WindowLast {
      return false
    }
    let windowEvent = *SdlWindowEvent(*void(nativeEvent))
    if windowEvent -> windowIdentifier != windowId || windowEvent -> windowIdentifier == 0u {
      return false
    }
    switch eventType {
      case SdlEventConstants.WindowResized {
        logicalDirty = true
        renderDirty = true
      }
      case SdlEventConstants.WindowPixelSizeChanged {
        pixelDirty = true
        renderDirty = true
      }
      case SdlEventConstants.WindowDisplayChanged {
        scaleDirty = true
        logicalDirty = true
        pixelDirty = true
        renderDirty = true
      }
      case SdlEventConstants.WindowDisplayScaleChanged {
        scaleDirty = true
        logicalDirty = true
        renderDirty = true
      }
      case SdlEventConstants.WindowMinimized {
        minimized = true
        state = SdlLifecycleState.Suspended
        renderDirty = false
      }
      case SdlEventConstants.WindowMaximized {
        minimized = false
        restored = true
        logicalDirty = true
        pixelDirty = true
        renderDirty = true
        if state != SdlLifecycleState.Closing {
          state = SdlLifecycleState.Ready
        }
      }
      case SdlEventConstants.WindowRestored {
        minimized = false
        restored = true
        logicalDirty = true
        pixelDirty = true
        renderDirty = true
        if state != SdlLifecycleState.Closing {
          state = SdlLifecycleState.Ready
        }
      }
      case SdlEventConstants.WindowExposed {
        exposed = true
        renderDirty = true
      }
      case SdlEventConstants.WindowCloseRequested {
        closeRequested = true
        state = SdlLifecycleState.Closing
        renderDirty = false
      }
      case SdlEventConstants.WindowDestroyed {
        MarkDestroyed()
      }
      case _ {
        return false
      }
    }
    return true
  }
}
