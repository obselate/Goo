package Goo

import System
import System.Collections.Generic
import System.Runtime.InteropServices
import Hexa.NET.SDL3

internal unsafe partial class SdlHost : IDisposable {
  private const MousePointerId int64 = 0L
  private const TouchMouseId uint32 = uint32.MaxValue
  private const PenMouseId uint32 = uint32.MaxValue - 1u
  private const MouseTouchId int64 = -1L
  private const PenTouchId int64 = -2L

  private let hitTest ((int32, int32) -> SdlHitResult)
  private let hitTestRawDelegate SdlHostRawHitTest
  private let hitTestCallbackAddress nint
  private var window SDLWindowPtr = SDLWindowPtr.Null
  private var windowId uint32
  private var windowHandle nint
  private var disposed bool
  private var runtimeOwned bool
  private var textInputActive bool
  private var hitTestEnabled bool
  private var pointerButtons SdlHostPointerButtons
  private let touchPointers Dictionary[TouchContactKey, int64] =
    Dictionary[TouchContactKey, int64]()
  private var penPressures Dictionary[int64, float32]?
  private var nextTouchPointerId int64 = Int64.MinValue

  internal init(title string, width int32, height int32, x int32, y int32,
    positionSet bool, state SdlHostState, decorated bool, resizable bool,
    transparent bool, vsync bool, hitTest ((int32, int32) -> SdlHitResult)) {
    this.hitTest = hitTest
    hitTestRawDelegate = HitTest
    hitTestCallbackAddress = Marshal.GetFunctionPointerForDelegate(hitTestRawDelegate)
    SdlRuntime.Acquire()
    runtimeOwned = true
    try {
      CreateWindow(title, width, height, transparent)
      windowId = SDL.GetWindowID(window)
      if windowId == 0u {
        ThrowSdl("SDL_GetWindowID")
      }
      windowHandle = SDL_GetWindowFromIdRaw(windowId)
      if windowHandle == nint(0) {
        ThrowSdl("SDL_GetWindowFromID")
      }
      SdlRuntime.Register(windowId, Dispatch)
      if positionSet && CanMove {
        Require(SDL.SetWindowPosition(window, x, y), "SDL_SetWindowPosition")
      }
      SetBorder(decorated, resizable)
      SetState(state)
      SetVSync(vsync)
      RefreshMetrics()
      RefreshPosition()
    } catch (e Exception) {
      Dispose()
      throw e
    }
  }

  public event MetricsChanged Action[int32, int32, int32, int32]
  public event Moved Action[int32, int32]
  public event StateChanged Action[SdlHostState]
  public event FocusChanged Action[bool]
  public event CloseRequested Action
  public event Exposed Action
  public event PointerMoved Action[int64, SdlHostPointerDevice, float32, float32,
    SdlHostPointerButtons, float32, SdlHostModifiers]
  public event PointerPressed Action[int64, SdlHostPointerDevice, float32, float32,
    SdlHostPointerButton, SdlHostPointerButtons, float32, SdlHostModifiers]
  public event PointerReleased Action[int64, SdlHostPointerDevice, float32, float32,
    SdlHostPointerButton, SdlHostPointerButtons, float32, SdlHostModifiers]
  public event PointerCanceled Action[int64, SdlHostPointerDevice]
  public event Wheel Action[float32, float32, float32, float32, SdlHostModifiers]
  public event KeyPressed Action[SdlHostKey, SdlHostModifiers]
  public event KeyReleased Action[SdlHostKey, SdlHostModifiers]
  public event TextEntered Action[string]
  public event TextEditing Action[string, int32, int32]
  public event TextEditingCandidates Action[IReadOnlyList[string], int32, bool]
  public event TextCompositionCanceled Action

  public prop LogicalWidth int32 { get; private set }
  public prop LogicalHeight int32 { get; private set }
  public prop FramebufferWidth int32 { get; private set }
  public prop FramebufferHeight int32 { get; private set }
  public prop X int32 { get; private set }
  public prop Y int32 { get; private set }
  public prop IsClosing bool { get; private set }
  internal prop IsTextInputActive bool { get { return textInputActive } }
  internal prop NativeWindow SDLWindowPtr { get { return window } }
  internal prop WindowHandle nint {
    get {
      ThrowIfDisposed()
      return windowHandle
    }
  }
  internal prop NativeResizable bool {
    get {
      ThrowIfDisposed()
      return (SDL.GetWindowFlags(window) & uint64(SDLWindowFlags.Resizable)) != 0uL
    }
  }

  shared {
    internal func IsWayland() bool {
      return String.Equals(SDL.GetCurrentVideoDriverS(), "wayland",
        StringComparison.OrdinalIgnoreCase)
    }

    internal func BuildWindowFlags(transparent bool) SDLWindowFlags {
      let baseFlags = SDLWindowFlags.HighPixelDensity |
        SDLWindowFlags.Hidden | SDLWindowFlags.Resizable | SDLWindowFlags.Vulkan
      return transparent ? baseFlags | SDLWindowFlags.Transparent : baseFlags
    }

    internal func EvaluateHitTest(hitTest ((int32, int32) -> SdlHitResult),
      x int32, y int32) SDLHitTestResult {
      try {
        return switch hitTest(x, y) {
          case SdlHitResult.Normal: SDLHitTestResult.Normal
          case SdlHitResult.Draggable: SDLHitTestResult.Draggable
          case SdlHitResult.TopLeft: SDLHitTestResult.ResizeTopleft
          case SdlHitResult.Top: SDLHitTestResult.ResizeTop
          case SdlHitResult.TopRight: SDLHitTestResult.ResizeTopright
          case SdlHitResult.Right: SDLHitTestResult.ResizeRight
          case SdlHitResult.BottomRight: SDLHitTestResult.ResizeBottomright
          case SdlHitResult.Bottom: SDLHitTestResult.ResizeBottom
          case SdlHitResult.BottomLeft: SDLHitTestResult.ResizeBottomleft
          case SdlHitResult.Left: SDLHitTestResult.ResizeLeft
          case _: SDLHitTestResult.Normal
        }
      } catch (e Exception) {
        return SDLHitTestResult.Normal
      }
    }
  }

  public func PollEvents() {
    ThrowIfDisposed()
    SdlRuntime.PollEvents()
    RefreshMetricsIfChanged()
  }

  public func WaitEvents(timeoutMs int32) {
    ThrowIfDisposed()
    SdlRuntime.WaitEvents(timeoutMs)
    RefreshMetricsIfChanged()
  }

  public func Wake() {
    if disposed {
      return
    }
    SdlRuntime.Wake()
  }

  public func SetTitle(value string) {
    ThrowIfDisposed()
    Require(SDL.SetWindowTitle(window, value), "SDL_SetWindowTitle")
  }

  public func SetSize(width int32, height int32) {
    ThrowIfDisposed()
    Require(SDL.SetWindowSize(window, width, height), "SDL_SetWindowSize")
  }

  public func SetPosition(x int32, y int32) {
    ThrowIfDisposed()
    if CanMove {
      Require(SDL.SetWindowPosition(window, x, y), "SDL_SetWindowPosition")
    }
  }

  public func SetState(value SdlHostState) {
    ThrowIfDisposed()
    if value == SdlHostState.Normal || value == SdlHostState.Minimized ||
        value == SdlHostState.Maximized {
      Require(SDL.SetWindowFullscreen(window, false), "SDL_SetWindowFullscreen")
    }
    switch value {
      case SdlHostState.Normal { Require(SDL.RestoreWindow(window), "SDL_RestoreWindow") }
      case SdlHostState.Minimized { Require(SDL.MinimizeWindow(window), "SDL_MinimizeWindow") }
      case SdlHostState.Maximized { Require(SDL.MaximizeWindow(window), "SDL_MaximizeWindow") }
      case SdlHostState.Fullscreen { Require(SDL.SetWindowFullscreen(window, true), "SDL_SetWindowFullscreen") }
      case _ { throw ArgumentOutOfRangeException("value") }
    }
  }

  public func SetBorder(decorated bool, resizable bool) {
    ThrowIfDisposed()
    if !decorated {
      EnableHitTest()
    }
    Require(SDL.SetWindowBordered(window, decorated), "SDL_SetWindowBordered")
    Require(SDL.SetWindowResizable(window, resizable), "SDL_SetWindowResizable")
    if decorated {
      DisableHitTest()
    }
  }

  public func SetVSync(value bool) {
    ThrowIfDisposed()
  }

  public func SetCursor(value SdlHostCursor) {
    ThrowIfDisposed()
    if SDL.GetMouseFocus() != window {
      return
    }
    SdlRuntime.SetCursor(value)
  }

  public func Show() {
    ThrowIfDisposed()
    Require(SDL.ShowWindow(window), "SDL_ShowWindow")
  }

  public func StartTextInput() bool {
    ThrowIfDisposed()
    if textInputActive {
      return true
    }
    if !SDL.StartTextInput(window) {
      return false
    }
    textInputActive = true
    return true
  }

  public func StopTextInput() {
    ThrowIfDisposed()
    if !textInputActive {
      return
    }
    Require(SDL.StopTextInput(window), "SDL_StopTextInput")
    textInputActive = false
  }

  public func SetImeArea(x int32, y int32, width int32, height int32, cursor int32) bool {
    ThrowIfDisposed()
    if !textInputActive {
      return false
    }
    var area = SDLRect(x, y, width, height)
    return SDL.SetTextInputArea(window, &area, cursor)
  }

  public func GetClipboardText() string {
    ThrowIfDisposed()
    return SDL.GetClipboardTextS() ?? ""
  }

  public func SetClipboardText(value string) {
    ThrowIfDisposed()
    Require(SDL.SetClipboardText(value), "SDL_SetClipboardText")
  }

  public func BeginClose() {
    ThrowIfDisposed()
    IsClosing = true
  }

  public func Dispose() {
    if disposed {
      return
    }
    SdlRuntime.RequireMainThread("SdlHost.Dispose")
    disposed = true
    if windowId != 0u {
      SdlRuntime.Unregister(windowId)
      windowId = 0u
    }
    if textInputActive && !window.IsNull {
      SDL.StopTextInput(window)
      textInputActive = false
    }
    if hitTestEnabled && !window.IsNull {
      hitTestEnabled = false
      SDL_SetWindowHitTestRaw(windowHandle, nint(0), nint(0))
    }
    if !window.IsNull {
      SDL.DestroyWindow(window)
      window = SDLWindowPtr.Null
      windowHandle = nint(0)
    }
    if runtimeOwned {
      runtimeOwned = false
      SdlRuntime.Release()
    }
  }

  internal prop CanMove bool {
    get {
      ThrowIfDisposed()
      return !IsWayland()
    }
  }

  private func CreateWindow(title string, width int32, height int32, transparent bool) {
    let flags = BuildWindowFlags(transparent)
    window = SDL.CreateWindow(title, width, height, uint64(flags))
    if window.IsNull {
      ThrowSdl("SDL_CreateWindow")
    }
  }

  private func EnableHitTest() {
    if hitTestEnabled {
      return
    }
    Require(SDL_SetWindowHitTestRaw(windowHandle, hitTestCallbackAddress, nint(0)) != uint8(0),
      "SDL_SetWindowHitTest")
    hitTestEnabled = true
  }

  private func DisableHitTest() {
    if !hitTestEnabled {
      return
    }
    Require(SDL_SetWindowHitTestRaw(windowHandle, nint(0), nint(0)) != uint8(0),
      "SDL_SetWindowHitTest")
    hitTestEnabled = false
  }

  private func RefreshMetrics() {
    RefreshLogical()
    RefreshFramebuffer()
  }

  internal func RefreshMetricsIfChanged() {
    let logicalWidth = LogicalWidth
    let logicalHeight = LogicalHeight
    let framebufferWidth = FramebufferWidth
    let framebufferHeight = FramebufferHeight
    RefreshMetrics()
    if logicalWidth != LogicalWidth || logicalHeight != LogicalHeight ||
        framebufferWidth != FramebufferWidth || framebufferHeight != FramebufferHeight {
      RaiseMetrics()
    }
  }

  private func RefreshLogical() {
    var width int32 = 0
    var height int32 = 0
    Require(SDL.GetWindowSize(window, &width, &height), "SDL_GetWindowSize")
    LogicalWidth = width
    LogicalHeight = height
  }

  private func RefreshFramebuffer() {
    var width int32 = 0
    var height int32 = 0
    Require(SDL.GetWindowSizeInPixels(window, &width, &height), "SDL_GetWindowSizeInPixels")
    FramebufferWidth = width
    FramebufferHeight = height
  }

  private func RefreshPosition() {
    var x int32 = 0
    var y int32 = 0
    Require(SDL.GetWindowPosition(window, &x, &y), "SDL_GetWindowPosition")
    X = x
    Y = y
  }

  private func RaiseMetrics() {
    MetricsChanged?.Invoke(LogicalWidth, LogicalHeight, FramebufferWidth, FramebufferHeight)
  }

  private func RequestClose() {
    if IsClosing {
      return
    }
    CloseRequested?.Invoke()
  }

  private func HitTest(nativeWindow nint, pointAddress nint, userData nint) SDLHitTestResult {
    if !hitTestEnabled {
      return SDLHitTestResult.Normal
    }
    let point = *SdlHostPoint(pointAddress)
    return EvaluateHitTest(hitTest, point->X, point->Y)
  }

  private func ThrowIfDisposed() {
    SdlRuntime.RequireMainThread("SdlHost.")
    if disposed {
      throw ObjectDisposedException("SdlHost")
    }
  }

  private func Require(result bool, operation string) {
    if !result {
      ThrowSdl(operation)
    }
  }

  private func ThrowSdl(operation string) {
    throw InvalidOperationException(operation + " failed: " + SDL.GetErrorS())
  }
}
