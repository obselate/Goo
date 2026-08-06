package Goo

import System
import System.Collections.Generic
import System.Numerics
import SkiaSharp

internal class WindowFixtures {
  func FieldClickRepaints() bool {
    guard let surface = SKSurface.Create(SKImageInfo(100, 100, SKColorType.Rgba8888, SKAlphaType.Premul)) else {
      return false
    }
    using let owned = surface
    guard let canvas = owned.Canvas else { return false }
    let window = Window{ Root: WindowPlainFieldCell{}, Width: 100, Height: 100 }
    let input = InputCoordinator()
    window.UpdateAndPaint(canvas)
    canvas.Flush()
    using let before = owned.Snapshot()
    using let beforeBitmap = SKBitmap.FromImage(before)
    let beforePixel = uint32(beforeBitmap.GetPixel(50, 50))
    let handled = input.HandleClick(window.Tree, 50.0F, 50.0F)
    window.UpdateAndPaint(canvas)
    canvas.Flush()
    using let after = owned.Snapshot()
    using let afterBitmap = SKBitmap.FromImage(after)
    let afterPixel = uint32(afterBitmap.GetPixel(50, 50))
    return handled && beforePixel != afterPixel
  }

  func FrameAndResize() bool {
    let frame = WindowFrameCell{}
    let window = Window{ Root: frame, Width: 200, Height: 100 }
    window.UpdateTree()
    if frame.Builds != 1 { return false }
    window.UpdateTree()
    if frame.Builds != 1 { return false }
    frame.Value.Value = 1
    window.UpdateTree()
    guard let updated = window.Tree else { return false }
    if frame.Builds != 2 || updated.Content != "1" { return false }

    let resized = Window{ Root: WindowResizeCell{}, Width: 200, Height: 200 }
    resized.UpdateTree()
    resized.HandleResize(400, 300)
    resized.UpdateTree()
    guard let root = resized.Tree else { return false }
    let scaled = DpiScale(1280, 720, 1920, 1080)
    let degenerate = DpiScale(0, 0, 1920, 1080)
    return root.Rect.W == 400.0F && root.Rect.H == 300.0F
      && scaled.X == 1.5F && scaled.Y == 1.5F && degenerate == Vector2(1.0F, 1.0F)
  }

  func MetricsContract() bool {
    let window = Window{ Root: WindowResizeCell{}, Width: 200, Height: 100 }
    let snapshots = List[WindowMetrics]()
    window.MetricsChanged += func(value WindowMetrics) {
      snapshots.Add(value)
    }
    window.UpdateTree()
    if snapshots.Count != 1 {
      return false
    }
    let initial = snapshots[0]
    if initial.LogicalWidth != 200 || initial.LogicalHeight != 100
      || initial.FramebufferWidth != 0 || initial.FramebufferHeight != 0
      || initial.DisplayScaleX != 0.0 || initial.DisplayScaleY != 0.0 {
      return false
    }
    window.UpdateTree()
    if snapshots.Count != 1 {
      return false
    }
    window.queueNativeMetrics(200, 100, 400, 200)
    window.UpdateTree()
    if snapshots.Count != 2 || snapshots[1].LogicalWidth != 200
      || snapshots[1].LogicalHeight != 100 || snapshots[1].FramebufferWidth != 400
      || snapshots[1].FramebufferHeight != 200 || snapshots[1].DisplayScaleX != 2.0
      || snapshots[1].DisplayScaleY != 2.0 {
      return false
    }
    window.queueNativeMetrics(200, 100, 0, 0)
    window.UpdateTree()
    return snapshots.Count == 3 && snapshots[2].FramebufferWidth == 0
      && snapshots[2].FramebufferHeight == 0 && snapshots[2].DisplayScaleX == 0.0
      && snapshots[2].DisplayScaleY == 0.0
  }

  func MetricsResubscribeContract() bool {
    let handle = ElementHandle{}
    let window = Window{ Root: WindowMetricsHandleCell(handle), Width: 100, Height: 60 }
    var callbacks int32
    let callback Action[WindowMetrics] = func(value WindowMetrics) {
      callbacks = callbacks + 1
    }
    handle.MetricsChanged += func(value ElementMetrics) {
    }
    window.MetricsChanged += callback
    window.UpdateTree()
    window.MetricsChanged -= callback
    window.MetricsChanged += callback
    window.UpdateTree()
    return callbacks == 2
  }



  func GradientRepaints() bool {
    let cell = WindowGradientCell{}
    let window = Window{ Root: cell, Width: 100, Height: 100 }
    window.UpdateTree()
    let linear = window.visualFingerprint()
    cell.Mode.Value = 1
    window.UpdateTree()
    let angled = window.visualFingerprint()
    cell.Mode.Value = 2
    window.UpdateTree()
    let stops = window.visualFingerprint()
    cell.Mode.Value = 3
    window.UpdateTree()
    let radial = window.visualFingerprint()
    cell.Mode.Value = 4
    window.UpdateTree()
    let radius = window.visualFingerprint()
    return linear != angled && angled != stops && stops != radial && radial != radius
  }

  func OwnedBackgroundSourceRepaints() bool {
    let first = ImageSource(2, 1, []uint8{ 255, 0, 0, 255, 0, 0, 255, 255 })
    let second = ImageSource(2, 1, []uint8{ 0, 255, 0, 255, 0, 0, 255, 255 })
    let cell = WindowOwnedBackgroundSourceCell{}
    let window = Window{ Root: cell, Width: 100, Height: 100 }
    window.UpdateTree()
    window.markFrameRendered()
    let empty = window.visualFingerprint()
    cell.Source.Value = first
    window.UpdateTree()
    let firstChanged = window.RenderPending() && empty != window.visualFingerprint()
    window.markFrameRendered()
    let firstFingerprint = window.visualFingerprint()
    cell.Source.Value = second
    window.UpdateTree()
    let secondChanged = window.RenderPending() && firstFingerprint != window.visualFingerprint()
    window.Close()
    first.Dispose()
    second.Dispose()
    return firstChanged && secondChanged
  }

  func ZIndexRepaints() bool {
    let cell = WindowZIndexCell{}
    let window = Window{ Root: cell, Width: 40, Height: 40 }
    window.UpdateTree()
    let before = window.visualFingerprint()
    cell.Level.Value = 2
    window.UpdateTree()
    return before != window.visualFingerprint()
  }

  func TextFlowRepaints() bool {
    let cell = WindowTextFlowCell{}
    let window = Window{ Root: cell, Width: 120, Height: 40 }
    window.UpdateTree()
    let wrapped = window.visualFingerprint()
    cell.Mode.Value = 1
    window.UpdateTree()
    let unwrapped = window.visualFingerprint()
    cell.Mode.Value = 2
    window.UpdateTree()
    return wrapped != unwrapped && unwrapped != window.visualFingerprint()
  }

  func TextDecorationRepaints() bool {
    let cell = WindowTextDecorationCell{}
    let window = Window{ Root: cell, Width: 120, Height: 40 }
    window.UpdateTree()
    let none = window.visualFingerprint()
    cell.Mode.Value = 1
    window.UpdateTree()
    let underline = window.visualFingerprint()
    cell.Mode.Value = 2
    window.UpdateTree()
    let strike = window.visualFingerprint()
    cell.Mode.Value = 3
    window.UpdateTree()
    let combined = window.visualFingerprint()
    cell.Hidden.Value = true
    window.UpdateTree()
    let hidden = window.visualFingerprint()
    cell.Mode.Value = 1
    window.UpdateTree()
    return none != underline && underline != strike && strike != combined
      && hidden == window.visualFingerprint()
  }

  func TextTransformRepaints() bool {
    let cell = WindowTextTransformCell{}
    let window = Window{ Root: cell, Width: 120, Height: 40 }
    window.UpdateTree()
    let none = window.visualFingerprint()
    cell.Mode.Value = 1
    window.UpdateTree()
    let uppercase = window.visualFingerprint()
    cell.Mode.Value = 2
    window.UpdateTree()
    let lowercase = window.visualFingerprint()
    cell.Hidden.Value = true
    window.UpdateTree()
    let hidden = window.visualFingerprint()
    cell.Mode.Value = 1
    window.UpdateTree()
    return none != uppercase && uppercase != lowercase
      && hidden == window.visualFingerprint()
  }

  func TextShadowRepaints() bool {
    if !textShadowFingerprint(false) { return false }
    return textShadowFingerprint(true)
  }

  func TextStrokeRepaints() bool {
    if !textStrokeFingerprint(false) { return false }
    return textStrokeFingerprint(true)
  }

  private func textStrokeFingerprint(entry bool) bool {
    let cell = WindowTextStrokeCell{ Entry: entry }
    let window = Window{ Root: cell, Width: 120, Height: 50 }
    window.UpdateTree()
    let inactive = window.visualFingerprint()
    cell.Mode.Value = 1
    window.UpdateTree()
    if window.visualFingerprint() != inactive { return false }
    cell.Mode.Value = 2
    window.UpdateTree()
    if window.visualFingerprint() != inactive { return false }
    cell.Mode.Value = 3
    window.UpdateTree()
    let active = window.visualFingerprint()
    if active == inactive { return false }
    cell.Mode.Value = 4
    window.UpdateTree()
    let wider = window.visualFingerprint()
    if wider == active { return false }
    cell.Mode.Value = 5
    window.UpdateTree()
    let recolored = window.visualFingerprint()
    if recolored == wider { return false }
    cell.Hidden.Value = true
    window.UpdateTree()
    let hidden = window.visualFingerprint()
    cell.Mode.Value = 3
    window.UpdateTree()
    return hidden == window.visualFingerprint()
  }

  private func textShadowFingerprint(entry bool) bool {
    let cell = WindowTextShadowCell{ Entry: entry }
    let window = Window{ Root: cell, Width: 120, Height: 50 }
    window.UpdateTree()
    var prior = window.visualFingerprint()
    for mode in 1 ... 5 {
      cell.Mode.Value = mode
      window.UpdateTree()
      let next = window.visualFingerprint()
      if next == prior { return false }
      prior = next
    }
    cell.Hidden.Value = true
    window.UpdateTree()
    let hidden = window.visualFingerprint()
    cell.Mode.Value = 0
    window.UpdateTree()
    return hidden == window.visualFingerprint()
  }

  func OutlineRepaints() bool {
    let cell = WindowOutlineCell{}
    let window = Window{ Root: cell, Width: 80, Height: 80 }
    window.UpdateTree()
    let width = window.visualFingerprint()
    cell.Mode.Value = 1
    window.UpdateTree()
    let color = window.visualFingerprint()
    cell.Mode.Value = 2
    window.UpdateTree()
    let offset = window.visualFingerprint()
    cell.Mode.Value = 3
    window.UpdateTree()
    return width != color && color != offset && offset != window.visualFingerprint()
  }

  func TransformRepaints() bool {
    let cell = WindowTransformCell{}
    let window = Window{ Root: cell, Width: 80, Height: 80 }
    window.UpdateTree()
    let translated = window.visualFingerprint()
    cell.Mode.Value = 1
    window.UpdateTree()
    let moved = window.visualFingerprint()
    cell.Mode.Value = 2
    window.UpdateTree()
    let origin = window.visualFingerprint()
    cell.Hidden.Value = true
    window.UpdateTree()
    let hidden = window.visualFingerprint()
    cell.Mode.Value = 0
    window.UpdateTree()
    return translated != moved && moved != origin && hidden == window.visualFingerprint()
  }

  func VisibilityRepaints() bool {
    let cell = WindowVisibilityCell{}
    let window = Window{ Root: cell, Width: 80, Height: 80 }
    window.UpdateTree()
    let visible = window.visualFingerprint()
    cell.Hidden.Value = true
    window.UpdateTree()
    let hidden = window.visualFingerprint()
    cell.Blue.Value = true
    window.UpdateTree()
    let hiddenChanged = window.visualFingerprint()
    cell.Hidden.Value = false
    window.UpdateTree()
    return visible != hidden && hidden == hiddenChanged
      && hiddenChanged != window.visualFingerprint()
  }

  func KeyCallbackDeliversModifiers() bool {
    var calls = 0
    var received = Key.Unknown
    var modifiers = KeyModifiers{}
    let window = Window{
      OnKeyPress: (key Key, active KeyModifiers) -> {
        calls = calls + 1
        received = key
        modifiers = active
      },
    }
    InputCoordinator().DispatchKeyPress(nil, Resolver{}, Key.S,
      KeyModifiers{ Alt: true, Shift: true, Ctrl: true, Super: true }, window.OnKeyPress)
    return calls == 1 && received == Key.S && modifiers.Alt && modifiers.Shift && modifiers.Ctrl && modifiers.Super
  }

  // The render gate's two break paths, with the fingerprint as oracle:
  // a missed raise freezes the UI, a stuck raise re-renders idle frames.
  func RenderGateTracksVisualChanges() bool {
    let fade = RenderGateFadeCell{}
    let window = Window{ Root: fade, Width: 100, Height: 100 }
    window.UpdateTree()
    if !window.RenderPending() { return false }
    window.markFrameRendered()
    let idle = window.visualFingerprint()
    window.UpdateTree(0.016)
    if window.RenderPending() { return false }
    if idle != window.visualFingerprint() { return false }
    fade.On.Value = true
    window.UpdateTree(0.016)
    if !window.RenderPending() { return false }
    if idle == window.visualFingerprint() { return false }
    window.markFrameRendered()
    window.UpdateTree(0.016)
    if !window.RenderPending() { return false }
    window.markFrameRendered()
    window.UpdateTree(1.0)
    window.markFrameRendered()
    window.UpdateTree(0.016)
    return !window.RenderPending()
  }
  // Native close must retain the mounted tree and only reopen the render gate.
  func NativeTeardownRetainsTree() bool {
    WindowTeardownDisposableCell.Disposals = 0
    let cell = WindowTeardownDisposableCell{}
    let window = Window{ Root: cell, Width: 100, Height: 100 }
    window.UpdateTree()
    guard let tree = window.Tree else {
      window.Close()
      return false
    }
    let builds = cell.Builds
    window.markFrameRendered()
    let gateCleared = !window.RenderPending()
    window.teardownNative()
    let retained = tree == window.Tree && cell.Builds == builds
      && WindowTeardownDisposableCell.Disposals == 0 && window.RenderPending()
    window.Close()
    return gateCleared && retained && WindowTeardownDisposableCell.Disposals == 1
  }


  // Undecorated windows own their chrome: resize-band edges, drag regions,
  // content suppression; decorated windows defer everything to the system.
  func CustomChromeRoutesHitTests() bool {
    let cell = WindowChromeCell{}
    let window = Window{ Root: cell, Width: 100, Height: 100 }
    window.UpdateTree()
    if window.hitTest(2, 2) != Goo.InternalTextInterop.SdlHitResult.Normal { return false }
    window.Decorated = false
    if window.hitTest(2, 2) != Goo.InternalTextInterop.SdlHitResult.TopLeft { return false }
    if window.hitTest(50, 2) != Goo.InternalTextInterop.SdlHitResult.Top { return false }
    if window.hitTest(30, 30) != Goo.InternalTextInterop.SdlHitResult.Draggable { return false }
    if window.hitTest(50, 50) != Goo.InternalTextInterop.SdlHitResult.Normal { return false }
    window.ResizeBand = 20.0F
    if window.hitTest(15, 70) != Goo.InternalTextInterop.SdlHitResult.Left { return false }
    window.ResizeBand = 8.0F
    window.Resizable = false
    if window.hitTest(2, 2) != Goo.InternalTextInterop.SdlHitResult.Draggable { return false }
    var invalid = false
    try {
      window.ResizeBand = -1.0F
    } catch (error Exception) {
      invalid = true
    }
    var focusEvents = 0
    var lastFocus = false
    window.OnFocusChange = (focused bool) -> {
      focusEvents = focusEvents + 1
      lastFocus = focused
    }
    window.handleFocusChanged(true)
    if !window.IsFocused || focusEvents != 1 || !lastFocus { return false }
    window.handleFocusChanged(true)
    if focusEvents != 1 { return false }
    window.handleFocusChanged(false)
    let focusOk = !window.IsFocused && focusEvents == 2 && !lastFocus
    window.Close()
    return invalid && focusOk
  }

  // Native close, Alt+F4, and RequestClose share one queued request that
  // OnClosing can veto; each request drains exactly one decision.
  func CloseHonorsVeto() bool {
    let window = Window{ Root: WindowFrameCell{}, Width: 100, Height: 100 }
    window.UpdateTree()
    if window.drainCloseRequest() { return false }
    window.RequestClose()
    if !window.drainCloseRequest() { return false }
    if window.drainCloseRequest() { return false }
    var asked = 0
    window.OnClosing = () -> {
      asked = asked + 1
      return false
    }
    window.RequestClose()
    if window.drainCloseRequest() { return false }
    if asked != 1 { return false }
    window.OnClosing = () -> {
      asked = asked + 1
      return true
    }
    window.RequestClose()
    window.RequestClose()
    if !window.drainCloseRequest() { return false }
    if asked != 2 { return false }
    if window.drainCloseRequest() { return false }
    window.Close()
    return true
  }

  // Caret blink repaints came from the fingerprint hashing BlinkT; the gate
  // must hear the phase flips or a focused caret freezes on screen.
  func CaretBlinkRepaints() bool {
    let harness = EntryHarness{}
    let window = Window{ Root: harness, Width: 300, Height: 100 }
    window.UpdateTree()
    let input = InputCoordinator()
    let resolver = Resolver{}
    input.AfterTreeUpdated(window.Tree, resolver, true)
    input.HandlePress(window.Tree, resolver, 0.0, 10.0F, 10.0F)
    input.HandleRelease(window.Tree, resolver, 10.0F, 10.0F)
    if input.Step(window.Tree, resolver, 0.1) { return false }
    if !input.Step(window.Tree, resolver, 0.5) { return false }
    if input.Step(window.Tree, resolver, 0.2) { return false }
    return input.Step(window.Tree, resolver, 0.3)
  }

  func BidiCaretRepaints() bool {
    let harness = EntryHarness{}
    harness.value.Value = "abc \u05D0\u05D1\u05D2"
    let window = Window{
      Root: harness,
      Width: 300, Height: 100,
    }
    window.UpdateTree()
    guard let tree = window.Tree else { return false }
    let entry = tree.Children[0]
    entry.Focused = true
    entry.Caret = 4
    entry.CaretAffinity = TextAffinity.Upstream
    let upstream = window.visualFingerprint()
    entry.CaretAffinity = TextAffinity.Downstream
    let downstream = window.visualFingerprint()
    entry.Caret = 6
    entry.Anchor = 4
    entry.CaretAffinity = TextAffinity.Upstream
    entry.AnchorAffinity = TextAffinity.Upstream
    let anchorUpstream = window.visualFingerprint()
    entry.AnchorAffinity = TextAffinity.Downstream
    let anchorDownstream = window.visualFingerprint()
    entry.Focused = false
    entry.Anchor = entry.Caret
    let auto = window.visualFingerprint()
    entry.Direction = Direction.RightToLeft
    let rtl = window.visualFingerprint()
    return upstream != downstream && anchorUpstream != anchorDownstream && auto != rtl
  }
  func InvalidDeltasFail() bool {
    let cell = WindowFrameCell{}
    let window = Window{ Root: cell, Width: 100, Height: 100 }
    var negativeWall = false
    var nonFiniteWall = false
    var negativeSim = false
    var nonFiniteSim = false
    var invalidPublicPump = false
    try {
      window.UpdateTree(-0.1)
    } catch (error Exception) {
      negativeWall = true
    }
    try {
      window.UpdateTree(Double.NaN)
    } catch (error Exception) {
      nonFiniteWall = true
    }
    try {
      window.UpdateTree(0.0, Double.PositiveInfinity)
    } catch (error Exception) {
      nonFiniteSim = true
    }
    try {
      window.UpdateTree(0.0, -0.1)
    } catch (error Exception) {
      negativeSim = true
    }
    try {
      window.Pump(-0.1)
    } catch (error Exception) {
      invalidPublicPump = true
    }
    let untouched = cell.Builds == 0
    window.UpdateTree()
    return negativeWall && nonFiniteWall && negativeSim && nonFiniteSim
      && invalidPublicPump && untouched && cell.Builds == 1
  }

  func EmptyDispatcherDrainBytes() int64 {
    let window = Window{}
    for i in 0 ... 8 { window.drainPostedActions() }
    let before = GC.GetAllocatedBytesForCurrentThread()
    window.drainPostedActions()
    return GC.GetAllocatedBytesForCurrentThread() - before
  }

  func EmptyDispatcherHasNoDemand() bool {
    let window = Window{}
    window.markFrameRendered()
    return !window.DispatcherHasDemandForTest()
  }

}

public partial class Window {
  internal func DispatcherHasDemandForTest() bool { return hasDemand() }
}

internal class WindowPlainFieldCell : Cell {
  internal var Clicks int32

  override func Build() Blob {
    return Container{
      Width: 100.0,
      Height: 100.0,
      BackgroundColor: Clicks == 0 ? Color.Black : Color.White,
      OnClick: func() { Clicks = Clicks + 1 },
    }
  }
}

internal class WindowChromeCell : Cell {
  override func Build() Blob {
    return Window.DragRegion(Container{
      Width: 100.0,
      Height: 100.0,
      Children: {
        Container{ Width: 20.0, Height: 20.0, MarginLeft: 40.0, MarginTop: 40.0, OnClick: func() {} },
      },
    })
  }
}

internal class WindowFrameCell : Cell {
  internal var Builds int32
  internal var Value State[int32]

  init() { Value = Track(0) }

  override func Build() Blob {
    Builds = Builds + 1
    return Text{ Content: "${Value.Value}" }
  }
}

internal class WindowResizeCell : Cell {
  override func Build() Blob {
    return Container{ Width: Length.Percent(100), Height: Length.Percent(100) }
  }
}

internal class WindowMetricsHandleCell : Cell {
  private let handle ElementHandle

  init(handle ElementHandle) { this.handle = handle }

  override func Build() Blob {
    return Container{ Handle: handle, Width: 100, Height: 60 }
  }
}

internal class RenderGateFadeCell : Cell {
  internal var On State[bool]

  init() { On = Track(false) }

  override func Build() Blob {
    return Container{
      Width: 50.0, Height: 50.0, TransitionMs: 200.0,
      BackgroundColor: On.Value ? Color.Rgb(255, 0, 0) : Color.Rgb(0, 0, 255),
    }
  }
}

internal class WindowGradientCell : Cell {
  internal var Mode State[int32]

  init() { Mode = Track(0) }

  override func Build() Blob {
    let gradient Gradient = switch Mode.Value {
      case 0: LinearGradient(0.0, Color.Black, Color.White)
      case 1: LinearGradient(90.0, Color.Black, Color.White)
      case 2: LinearGradient(90.0, Color.Black, Color.Rgb(255, 0, 0))
      case _: RadialGradient(Color.Black, Color.Rgb(255, 0, 0))
    }
    return Container{
      Width: 100,
      Height: 100,
      BorderRadius: Mode.Value == 4 ? 16 : 4,
      BackgroundGradient: gradient,
    }
  }
}

internal class WindowOwnedBackgroundSourceCell : Cell {
  internal var Source State[ImageSource?]

  init() { Source = Track[ImageSource?](nil) }

  override func Build() Blob {
    return Container{ Width: 100, Height: 100, BackgroundImageSource: Source.Value,
      BackgroundImageFit: ImageFit.Fill }
  }
}

internal class WindowZIndexCell : Cell {
  internal var Level State[int32]

  init() { Level = Track(0) }

  override func Build() Blob {
    return Container{ Width: 40, Height: 40, Children: {
      Container{ Position: PositionType.Absolute, Width: 40, Height: 40,
        ZIndex: Level.Value },
      Container{ Position: PositionType.Absolute, Width: 40, Height: 40,
        ZIndex: 1 },
    } }
  }
}

internal class WindowTextFlowCell : Cell {
  internal var Mode State[int32]

  init() { Mode = Track(0) }

  override func Build() Blob {
    return Text{
      Width: 120,
      Content: "A line that exceeds its box",
      TextWrap: Mode.Value == 0 ? TextWrap.Wrap : TextWrap.NoWrap,
      TextTrimming: Mode.Value == 2 ? TextTrimming.Ellipsis : TextTrimming.None,
    }
  }
}

internal class WindowTextDecorationCell : Cell {
  internal var Mode State[int32]
  internal var Hidden State[bool]

  init() {
    Mode = Track(0)
    Hidden = Track(false)
  }

  override func Build() Blob {
    let decoration = switch Mode.Value {
      case 1: TextDecoration.Underline
      case 2: TextDecoration.LineThrough
      case 3: TextDecoration(3)
      default: TextDecoration.None
    }
    return Text{
      Width: 120,
      Height: 40,
      Content: "Goo",
      TextDecoration: decoration,
      Visibility: Hidden.Value ? Visibility.Hidden : Visibility.Visible,
    }
  }
}

internal class WindowTextTransformCell : Cell {
  internal var Mode State[int32]
  internal var Hidden State[bool]

  init() {
    Mode = Track(0)
    Hidden = Track(false)
  }

  override func Build() Blob {
    let transform = switch Mode.Value {
      case 1: TextTransform.Uppercase
      case 2: TextTransform.Lowercase
      default: TextTransform.None
    }
    return Text{
      Width: 120,
      Height: 40,
      Content: "Goo",
      TextTransform: transform,
      Visibility: Hidden.Value ? Visibility.Hidden : Visibility.Visible,
    }
  }
}

internal class WindowTextShadowCell : Cell {
  internal prop Entry bool { get; init; }
  internal var Mode State[int32]
  internal var Hidden State[bool]

  init() {
    Mode = Track(0)
    Hidden = Track(false)
  }

  override func Build() Blob {
    let first = TextShadow{
      OffsetX: Mode.Value == 2 ? 5 : 2,
      OffsetY: Mode.Value == 3 ? 6 : 3,
      Blur: Mode.Value == 4 ? 8 : 4,
      Color: Mode.Value == 1 ? Color.Rgb(0, 255, 0) : Color.Rgb(255, 0, 0),
    }
    let second = TextShadow{ OffsetX: 1, Color: Color.Rgb(0, 0, 255) }
    let shadows = Mode.Value == 5
      ? []TextShadow{ second, first }
      : []TextShadow{ first, second }
    if Entry {
      return TextEntry{
        Value: "",
        Placeholder: "hint",
        Width: 120,
        Height: 50,
        TextShadows: shadows,
        Visibility: Hidden.Value ? Visibility.Hidden : Visibility.Visible,
      }
    }
    return Text{
      Content: "Goo",
      Width: 120,
      Height: 50,
      TextShadows: shadows,
      Visibility: Hidden.Value ? Visibility.Hidden : Visibility.Visible,
    }
  }
}

internal class WindowTextStrokeCell : Cell {
  internal prop Entry bool { get; init; }
  internal var Mode State[int32]
  internal var Hidden State[bool]

  init() {
    Mode = Track(0)
    Hidden = Track(false)
  }

  override func Build() Blob {
    let width = switch Mode.Value {
      case 1: 2.0
      case 3: 2.0
      case 4: 4.0
      case 5: 4.0
      default: 0.0
    }
    let color = switch Mode.Value {
      case 2: Color.Rgb(255, 0, 0)
      case 3: Color.Rgb(255, 0, 0)
      case 4: Color.Rgb(255, 0, 0)
      case 5: Color.Rgb(0, 0, 255)
      default: Color.Transparent
    }
    if Entry {
      return TextEntry{
        Value: "",
        Placeholder: "hint",
        Width: 120,
        Height: 50,
        TextStrokeWidth: width,
        TextStrokeColor: color,
        Visibility: Hidden.Value ? Visibility.Hidden : Visibility.Visible,
      }
    }
    return Text{
      Content: "Goo",
      Width: 120,
      Height: 50,
      TextStrokeWidth: width,
      TextStrokeColor: color,
      Visibility: Hidden.Value ? Visibility.Hidden : Visibility.Visible,
    }
  }
}

internal class WindowOutlineCell : Cell {
  internal var Mode State[int32]

  init() { Mode = Track(0) }

  override func Build() Blob {
    return Container{
      Width: 40,
      Height: 40,
      BorderRadius: 8,
      OutlineWidth: Mode.Value == 0 ? 2 : 4,
      OutlineColor: Mode.Value == 1 ? Color.Rgb(0, 0, 255) : Color.Rgb(255, 0, 0),
      OutlineOffset: Mode.Value == 3 ? 3 : 0,
    }
  }
}

internal class WindowTransformCell : Cell {
  internal var Mode State[int32]
  internal var Hidden State[bool]

  init() {
    Mode = Track(0)
    Hidden = Track(false)
  }

  override func Build() Blob {
    return Container{
      Width: 40,
      Height: 40,
      Visibility: Hidden.Value ? Visibility.Hidden : Visibility.Visible,
      Transform: PanelTransform{ TranslateX: Mode.Value == 0 ? 10 : 20 },
      TransformOriginX: Mode.Value == 2 ? Length.Percent(0) : Length.Percent(50),
    }
  }
}

internal class WindowVisibilityCell : Cell {
  internal var Hidden State[bool]
  internal var Blue State[bool]

  init() {
    Hidden = Track(false)
    Blue = Track(false)
  }

  override func Build() Blob {
    return Container{
      Width: 40,
      Height: 40,
      Visibility: Hidden.Value ? Visibility.Hidden : Visibility.Visible,
      Children: {
        Container{
          Width: 40,
          Height: 40,
          BackgroundColor: Blue.Value ? Color.Rgb(0, 0, 255) : Color.Rgb(255, 0, 0),
        },
      },
    }
  }
}

internal class WindowTeardownDisposableCell : Cell, IDisposable {
  shared { internal var Disposals int32 }
  internal var Builds int32

  func Dispose() { Disposals = Disposals + 1 }

  override func Build() Blob {
    Builds = Builds + 1
    return Text{ Content: "retained" }
  }
}
