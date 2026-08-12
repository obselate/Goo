package Goo

import System
import System.Collections.Generic
import System.Diagnostics
import System.Numerics
import System.Text
import SkiaSharp
import Goo.InternalTextInterop

/// Identifies the requested state of a window.
public enum WindowState { Normal; Minimized; Maximized; Fullscreen }

/// Selects the native rendering backend used by a window.
public enum WindowRenderer { Gpu; Raster }

/// Describes one stable window size and display-scale snapshot.
public data struct WindowMetrics {
  private var logicalWidth int32
  private var logicalHeight int32
  private var framebufferWidth int32
  private var framebufferHeight int32
  private var displayScaleX float64
  private var displayScaleY float64

  /// Gets the reported logical width.
  public prop LogicalWidth int32 { get { return logicalWidth } init { logicalWidth = value } }
  /// Gets the reported logical height.
  public prop LogicalHeight int32 { get { return logicalHeight } init { logicalHeight = value } }
  /// Gets the reported framebuffer width.
  public prop FramebufferWidth int32 { get { return framebufferWidth } init { framebufferWidth = value } }
  /// Gets the reported framebuffer height.
  public prop FramebufferHeight int32 { get { return framebufferHeight } init { framebufferHeight = value } }
  /// Gets the horizontal framebuffer-to-logical scale.
  public prop DisplayScaleX float64 { get { return displayScaleX } init { displayScaleX = value } }
  /// Gets the vertical framebuffer-to-logical scale.
  public prop DisplayScaleY float64 { get { return displayScaleY } init { displayScaleY = value } }
}

/// Hosts a Goo tree on one process-wide UI thread.
/// After Open, only Post and RequestClose are safe from another thread.
public partial class Window {
  /// Gets or sets the window clear color.
  public prop Background Color {
    get { return background }
    set(v) {
      requireUiThread("Window.Background")
      if background == v {
        return
      }
      background = v
      requestRender()
    }
  }
  /// Gets the root cell.
  public prop Root Cell? {
    get { return root }
    init { root = value }
  }
  /// Reports whether the window is open.
  public prop IsOpen bool { get; private set; }
  internal prop Tree Node? { get { return node } }
  internal prop GradientShaderCountForTests int32 {
    get { return retainedPainter?.GradientShaderCountForTests ?? 0 }
  }

  /// Gets or sets GPU vertical synchronization.
  /// Raster presentation is compositor paced.
  public prop VSync bool {
    get { return vsync }
    set(v) {
      requireUiThread("Window.VSync")
      if vsync == v {
        return
      }
      vsync = v
      if let native = host {
        native.SetVSync(v)
      }
    }
  }

  /// Gets or sets the renderer used the next time the window opens. GPU is the default.
  /// Raster requires Wayland, avoids GPU contexts, and cannot be combined with Transparent.
  public prop Renderer WindowRenderer {
    get { return renderer }
    set(v) {
      requireUiThread("Window.Renderer")
      renderer = v
    }
  }

  /// Gets or sets the window title.
  public prop Title string {
    get { return title }
    set(v) {
      requireUiThread("Window.Title")
      if title == v {
        return
      }
      title = v
      if let native = host {
        native.SetTitle(v)
      }
    }
  }

  /// Gets or sets the window width.
  public prop Width int32 {
    get { return width }
    set(v) {
      requireUiThread("Window.Width")
      if width == v {
        return
      }
      width = v
      pushSize()
      MetricSubscriptions.MarkWindowDirty(this)
      requestRender()
    }
  }

  /// Gets or sets the window height.
  public prop Height int32 {
    get { return height }
    set(v) {
      requireUiThread("Window.Height")
      if height == v {
        return
      }
      height = v
      pushSize()
      MetricSubscriptions.MarkWindowDirty(this)
      requestRender()
    }
  }

  // positionSet distinguishes an explicit (0,0) request.
  /// Gets or sets the requested horizontal position.
  public prop X int32 {
    get { return x }
    set(v) {
      requireUiThread("Window.X")
      positionSet = true
      if x == v {
        return
      }
      x = v
      pushPosition()
    }
  }

  /// Gets or sets the requested vertical position.
  public prop Y int32 {
    get { return y }
    set(v) {
      requireUiThread("Window.Y")
      positionSet = true
      if y == v {
        return
      }
      y = v
      pushPosition()
    }
  }

  /// Gets or sets the window state.
  public prop State WindowState {
    get { return state }
    set(v) {
      requireUiThread("Window.State")
      if state == v {
        return
      }
      state = v
      if let native = host {
        native.SetState(toSdlState(v))
      }
    }
  }

  /// Gets or sets next-open per-pixel alpha. An open window is unchanged.
  /// Transparency requires the GPU renderer.
  public prop Transparent bool {
    get { return transparent }
    set(v) {
      requireUiThread("Window.Transparent")
      transparent = v
    }
  }

  /// Gets or sets whether the system draws window decorations.
  public prop Decorated bool {
    get { return decorated }
    set(v) {
      requireUiThread("Window.Decorated")
      if decorated == v {
        return
      }
      decorated = v
      if let native = host {
        native.SetBorder(decorated, resizable)
      }
    }
  }

  /// Gets or sets whether the user can resize the window.
  public prop Resizable bool {
    get { return resizable }
    set(v) {
      requireUiThread("Window.Resizable")
      if resizable == v {
        return
      }
      resizable = v
      if let native = host {
        native.SetBorder(decorated, resizable)
      }
    }
  }

  /// Gets or sets the undecorated edge resize band in logical pixels.
  public prop ResizeBand float32 {
    get { return resizeBand }
    set(v) {
      requireUiThread("Window.ResizeBand")
      if !Single.IsFinite(v) || v < 0.0F {
        throw ArgumentOutOfRangeException("value")
      }
      resizeBand = v
    }
  }

  /// Reports whether the window currently holds native input focus.
  public prop IsFocused bool { get; private set; }

  /// Gets or sets the callback that receives each window state change.
  public prop OnStateChange Action[WindowState]? {
    get { return onStateChange }
    set(v) {
      requireUiThread("Window.OnStateChange")
      onStateChange = v
    }
  }
  /// Gets or sets the callback that receives each physical key press.
  public prop OnKeyPress ((Key, KeyModifiers) -> void)? {
    get { return onKeyPress }
    set(v) {
      requireUiThread("Window.OnKeyPress")
      onKeyPress = v
    }
  }
  /// Gets or sets the close-request handler; return false to veto closure.
  public prop OnClosing (() -> bool)? {
    get { return onClosing }
    set(v) {
      requireUiThread("Window.OnClosing")
      onClosing = v
    }
  }
  /// Gets or sets the callback that receives native focus changes.
  public prop OnFocusChange Action[bool]? {
    get { return onFocusChange }
    set(v) {
      requireUiThread("Window.OnFocusChange")
      onFocusChange = v
    }
  }

  /// Occurs after the native window reports a new stable size or display scale.
  /// Callbacks run on the window UI thread after native metrics and layout settle.
  public event MetricsChanged Action[WindowMetrics] {
    add { MetricSubscriptions.AddWindow(this, value) }
    remove { MetricSubscriptions.RemoveWindow(this, value) }
  }

  /// Gets the current native clipboard text on the window UI thread.
  /// An empty result can mean an empty clipboard or native copy failure.
  /// @exception InvalidOperationException when the window is not open.
  public func GetClipboardText() string {
    requireUiThread("Window.GetClipboardText")
    if !IsOpen { throw InvalidOperationException("Clipboard access requires an open window") }
    guard let native = host else {
      throw InvalidOperationException("Clipboard access requires an open window")
    }
    return native.GetClipboardText()
  }

  /// Sets the native clipboard text on the window UI thread.
  /// Native set failures throw.
  /// @exception InvalidOperationException when the window is not open.
  public func SetClipboardText(value string) {
    requireUiThread("Window.SetClipboardText")
    if value == nil { throw ArgumentNullException("value") }
    if !IsOpen { throw InvalidOperationException("Clipboard access requires an open window") }
    guard let native = host else {
      throw InvalidOperationException("Clipboard access requires an open window")
    }
    native.SetClipboardText(value)
  }

  /// Reports whether programmatic window movement is available.
  public prop CanMove bool {
    get {
      requireUiThread("Window.CanMove")
      return if let native = host { native.CanMove } else { false }
    }
  }

  private var node Node?
  private var dirty bool
  private var pendingReconcileEffects ReconcileEffects
  private var pendingRebuild int32
  private var pendingPaintResourceInvalidation int32
  private let retainedInvalidationGate object
  private var pendingRetainedEffects ReconcileEffects
  private var pendingRetainedInvalidation int32
  private var acceptingRetainedInvalidations bool
  private let imageCompletionGate object
  private let pendingImageCompletions List[ImageCompletionWork]
  private let imageCompletionBatch List[ImageCompletionWork]
  private var acceptingImageCompletions bool
  private var pendingImageCompletion int32
  private let cellQueueGate object
  private let pendingCells List[DirtyCellSubmission]
  private let deferredCells List[DirtyCellSubmission]
  private let cellBatch List[DirtyCellSubmission]
  private let fiberBatch List[Cell]
  private let childDiffScratch ChildDiffScratch
  private var cellTransactionActive bool
  private var renderDirty bool
  private var hookInstalled bool
  private var paintResourceHook Action?
  private var imageCompletionHook ((Node, object) -> void)?
  private var retainedInvalidationHook Action[ReconcileEffects]?
  private var cellHook Action[Cell]?
  private var layout Layout
  private var resolver Resolver
  private let profiler FrameProfiler
  private let motionPump MotionPump
  private var timeS float64

  private var input InputCoordinator
  private var accessibility AccessibilityManager?
  private var retainedPainter Painter?

  private var host Goo.InternalTextInterop.SdlHost?
  private var windowTarget Goo.InternalTextInterop.SdlRenderTarget?
  private var dpi Vector2

  private var pendingMetrics bool
  private var pendingLogicalWidth int32
  private var pendingLogicalHeight int32
  private var pendingFramebufferWidth int32
  private var pendingFramebufferHeight int32
  private var framebufferWidth int32
  private var framebufferHeight int32

  private var state WindowState
  private var renderer WindowRenderer
  private var vsync bool
  private var title string
  private var background Color
  private var root Cell?
  private var width int32
  private var height int32
  private var x int32
  private var y int32
  private var positionSet bool
  private var decorated bool
  private var resizable bool
  private var transparent bool
  private var resizeBand float32
  private var closeRequested int32
  private var postedActions Queue[Action]?
  private var pendingPostedActions int32
  private var acceptingPosts bool
  private var uiThreadBound bool
  private var onStateChange Action[WindowState]?
  private var onKeyPress ((Key, KeyModifiers) -> void)?
  private var onClosing (() -> bool)?
  private var onFocusChange Action[bool]?

  /// Creates a window with default configuration.
  public init() {
    title = ""
    Background = Color.Black
    retainedPainter = nil
    renderer = WindowRenderer.Gpu
    vsync = true
    decorated = true
    resizable = true
    resizeBand = 8.0F
    postedActions = nil
    pendingPostedActions = 0
    acceptingPosts = true
    dirty = true
    pendingRebuild = 0
    pendingPaintResourceInvalidation = 0
    retainedInvalidationGate = Object()
    pendingRetainedEffects = ReconcileEffects.None
    pendingRetainedInvalidation = 0
    acceptingRetainedInvalidations = true
    imageCompletionGate = Object()
    pendingImageCompletions = List[ImageCompletionWork]()
    imageCompletionBatch = List[ImageCompletionWork]()
    acceptingImageCompletions = true
    pendingImageCompletion = 0
    pendingReconcileEffects = ReconcileEffects.None
    renderDirty = true
    cellQueueGate = Object()
    pendingCells = List[DirtyCellSubmission]()
    deferredCells = List[DirtyCellSubmission]()
    cellBatch = List[DirtyCellSubmission]()
    fiberBatch = List[Cell]()
    imageCompletionHook = nil
    retainedInvalidationHook = nil
    childDiffScratch = ChildDiffScratch()
    layout = Layout()
    resolver = Resolver{}
    profiler = FrameProfiler()
    motionPump = MotionPump()
    motionPump.Wake = func() {
      requestReconcile()
    }

    input = InputCoordinator()
    accessibility = nil

    dpi = Vector2(1.0F, 1.0F)
  }
}
