package Goo

import System
import System.Collections.Generic
import System.Text
import System.Threading
import Goo.InternalTextInterop

internal class PerformanceFixtures {
  internal var emptyBuildCell EmptyBuildCell?
  internal var textTrimmingNode Node?
  internal var textTrimmingWidthIndex int32
  internal var textTransformNoneNode Node?
  internal var textTransformUppercaseNode Node?
  internal var textTransformFlipCell TextTransformFlipFixtureCell?
  internal var textTransformFlipWindow Window?
  internal var textTransformFlipLayout TextLayout?
  internal var directionLtrNode Node?
  internal var directionMixedNode Node?
  internal var directionColdLtrNode Node?
  internal var directionColdMixedNode Node?
  internal var directionColdTick int32
  internal var keyboardDispatchRoot Node?
  internal var keyboardDispatchInput KeyboardInput?
  internal var keyboardDispatchText TextInput?
  internal var keyboardDispatchResolver Resolver?
  internal var keyboardDispatchCount int32

  func PrepareBuildAllocation() {
    emptyBuildCell = EmptyBuildCell{}
  }

  func BuildEmptyContainer() int32 {
    return Container{}.Children.Count
  }

  func BuildEmptyCell() int32 {
    guard let cell = emptyBuildCell else { return -1 }
    let result = cell.Render()
    if result is Container {
      return result.Children.Count
    }
    return -1
  }

  func BuildStyledContainer() int32 {
    let container = Container{
      Width: 100.0,
      Height: 40.0,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      Gap: 8.0,
      BackgroundColor: Color.Rgb(41, 41, 51),
    }
    guard let entries = container.Entries() else { return -1 }
    return entries.Count
  }

  func BuildOneEntryStyle() int32 {
    let style = Style{ Width: 100.0 }
    guard let entries = style.Entries() else { return -1 }
    return entries.Count
  }

  func BuildFourEntryStyle() int32 {
    let style = Style{
      Width: 100.0,
      Height: 40.0,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
    }
    guard let entries = style.Entries() else { return -1 }
    return entries.Count
  }

  func BuildFiveEntryStyle() int32 {
    let style = Style{
      Width: 100.0,
      Height: 40.0,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      Gap: 8.0,
    }
    guard let entries = style.Entries() else { return -1 }
    return entries.Count
  }

  internal func buildTree() Container {
    return Container{
      Width: 420.0,
      Padding: 24.0,
      BackgroundColor: Color.Rgb(41, 41, 51),
      Children: {
        Text{ Content: "Goo Desktop", FontSize: 28.0 },
        Text{ Content: "second line", FontSize: 14.0 },
      },
    }
  }

  func BuildTreeChildCount() int32 {
    return int32(buildTree().Children.Count)
  }

  func PrepareKeyboardDispatch() {
    keyboardDispatchCount = 0
    let root = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 100, Height: 30, Focusable: true,
      OnKeyDown: (e KeyEvent) -> { keyboardDispatchCount++ },
    })
    let resolver = Resolver{}
    let text = TextInput()
    text.SetFocus(resolver, root)
    keyboardDispatchRoot = root
    keyboardDispatchInput = KeyboardInput()
    keyboardDispatchText = text
    keyboardDispatchResolver = resolver
  }

  func KeyboardDispatch() int32 {
    guard let root = keyboardDispatchRoot else { return -1 }
    guard let input = keyboardDispatchInput else { return -1 }
    guard let text = keyboardDispatchText else { return -1 }
    guard let resolver = keyboardDispatchResolver else { return -1 }
    input.HandleKey(root, resolver, text, Key.Left, KeyModifiers{ Ctrl: true })
    return keyboardDispatchCount
  }

  func PrepareTextTrimmingWidthCache() int32 {
    let window = Window{
      Width: 240,
      Height: 80,
      Root: TextTrimmingFixtureCell{},
    }
    window.UpdateTree()
    guard let node = window.Tree else { return -1 }
    TextLayouts.For(node, 96.0F)
    TextLayouts.For(node, 128.0F)
    TextLayouts.For(node, 160.0F)
    let layout = TextLayouts.For(node, 192.0F)
    textTrimmingNode = node
    textTrimmingWidthIndex = 0
    return layout.Lines.Count
  }

  func StepTextTrimmingWidthCache() int32 {
    guard let node = textTrimmingNode else { return -1 }
    let width = switch textTrimmingWidthIndex {
      case 0: 96.0F
      case 1: 128.0F
      case 2: 160.0F
      case _: 192.0F
    }
    textTrimmingWidthIndex = (textTrimmingWidthIndex + 1) % 4
    return TextLayouts.For(node, width).Lines.Count
  }

  func PrepareTextTransformCacheHits() int32 {
    let content = "Goo keeps representative static text layout cached while interface state changes around it."
    let none = Reconciler{ Res: Resolver{} }.Mount(Text{
      Width: 320, Content: content, TextTransform: TextTransform.None,
    })
    let uppercase = Reconciler{ Res: Resolver{} }.Mount(Text{
      Width: 320, Content: content, TextTransform: TextTransform.Uppercase,
    })
    let noneLayout = TextLayouts.For(none, 320.0F)
    let uppercaseLayout = TextLayouts.For(uppercase, 320.0F)
    textTransformNoneNode = none
    textTransformUppercaseNode = uppercase
    return noneLayout.Lines.Count + uppercaseLayout.Lines.Count
  }

  func StepTextTransformNoneCacheHit() int32 {
    guard let node = textTransformNoneNode else { return -1 }
    return TextLayouts.For(node, 320.0F).Lines.Count
  }

  func StepTextTransformUppercaseCacheHit() int32 {
    guard let node = textTransformUppercaseNode else { return -1 }
    return TextLayouts.For(node, 320.0F).Lines.Count
  }

  func PrepareTextTransformFlip() {
    let cell = TextTransformFlipFixtureCell{}
    let window = Window{ Width: 360, Height: 200, Root: cell }
    window.UpdateTree()
    textTransformFlipCell = cell
    textTransformFlipWindow = window
    if let node = window.Tree {
      textTransformFlipLayout = TextLayouts.For(node, 320.0F)
    }
  }

  func StepTextTransformFlip() int32 {
    guard let cell = textTransformFlipCell else { return -1 }
    guard let window = textTransformFlipWindow else { return -1 }
    cell.Flip()
    window.UpdateTree()
    guard let node = window.Tree else { return -1 }
    let expected = cell.IsUppercase() ? TextTransform.Uppercase : TextTransform.None
    if node.TextTransform != expected { return -1 }
    let layout = TextLayouts.For(node, 320.0F)
    if layout == textTransformFlipLayout { return -1 }
    textTransformFlipLayout = layout
    return layout.Lines.Count
  }

  func PrepareDirectionTextCacheHits() int32 {
    let ltr = Reconciler{ Res: Resolver{} }.Mount(Text{
      Width: 320, Content: "Goo keeps representative left-to-right text cached.",
      Direction: Direction.Auto, FontFamily: "DejaVu Sans",
    })
    let mixed = Reconciler{ Res: Resolver{} }.Mount(Text{
      Width: 320, Content: "Goo status: מצב מוכן 42",
      Direction: Direction.Auto, FontFamily: "DejaVu Sans",
    })
    let ltrLayout = TextLayouts.For(ltr, 320.0F)
    let mixedLayout = TextLayouts.For(mixed, 320.0F)
    directionLtrNode = ltr
    directionMixedNode = mixed
    return ltrLayout.Lines.Count + mixedLayout.Lines.Count
  }

  func StepDirectionLtrCacheHit() int32 {
    guard let node = directionLtrNode else { return -1 }
    return TextLayouts.For(node, 320.0F).Lines.Count
  }

  func StepDirectionMixedCacheHit() int32 {
    guard let node = directionMixedNode else { return -1 }
    return TextLayouts.For(node, 320.0F).Lines.Count
  }

  func PrepareDirectionColdBuilds() {
    directionColdLtrNode = Reconciler{ Res: Resolver{} }.Mount(Text{
      Width: 320, Content: "direction cold ltr seed",
      Direction: Direction.Auto, FontFamily: "DejaVu Sans",
    })
    directionColdMixedNode = Reconciler{ Res: Resolver{} }.Mount(Text{
      Width: 320, Content: "כיוון Goo seed 42",
      Direction: Direction.Auto, FontFamily: "DejaVu Sans",
    })
    directionColdTick = 0
  }

  func StepDirectionColdLtrBuild() int32 {
    guard let node = directionColdLtrNode else { return -1 }
    directionColdTick++
    node.Content = "direction cold ltr ${directionColdTick}"
    TextLayouts.Invalidate(node)
    return TextLayouts.For(node, 320.0F).Lines.Count
  }

  func StepDirectionColdMixedBuild() int32 {
    guard let node = directionColdMixedNode else { return -1 }
    directionColdTick++
    node.Content = "כיוון Goo ${directionColdTick} ready 42"
    TextLayouts.Invalidate(node)
    return TextLayouts.For(node, 320.0F).Lines.Count
  }

  func PrepareDirectionTextPaint(count int32, mixed bool) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: DirectionTextPaintFixtureCell{ Count: count, Mixed: mixed },
    }
    window.UpdateTree()
    return window
  }

  func MountDirectionTree(count int32, logical bool) int32 {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: DirectionMountFixtureCell{ Count: count, Logical: logical },
    }
    window.UpdateTree()
    guard let tree = window.Tree else { return 0 }
    return countNodes(tree)
  }

  func PrepareFlatFillPaint(count int32) Window {
    return prepareGradientPaint(count, nil)
  }

  func PrepareScrollPaint(rows int32) Window {
    let window = Window{
      Width: 1280,
      Height: 720,
      Root: ScrollPaintFixtureCell{ Rows: rows },
    }
    window.UpdateTree()
    guard let root = window.Tree else { return window }
    let layout = Layout()
    layout.Calculate(root, 1280.0F, 720.0F)
    let middle = maxScrollY(root) * 0.5F
    root.ScrollY = middle
    root.ScrollTargetY = middle
    root.UserScrolled = true
    layout.RefreshRects(root)
    return window
  }

  func PrepareTallTextPaint(lines int32) Window {
    let window = Window{
      Width: 1280,
      Height: 720,
      Root: TallTextPaintFixtureCell{ Lines: lines },
    }
    window.UpdateTree()
    guard let root = window.Tree else { return window }
    let layout = Layout()
    layout.Calculate(root, 1280.0F, 720.0F)
    let middle = maxScrollY(root) * 0.5F
    root.ScrollY = middle
    root.ScrollTargetY = middle
    root.UserScrolled = true
    layout.RefreshRects(root)
    return window
  }

  func PrepareLinearGradientPaint(count int32) Window {
    return prepareGradientPaint(count,
      LinearGradient(135.0, Color.Rgb(26, 42, 108), Color.Rgb(178, 31, 31)))
  }

  func PrepareRadialGradientPaint(count int32) Window {
    return prepareGradientPaint(count,
      RadialGradient(Color.Rgb(26, 42, 108), Color.Rgb(178, 31, 31)))
  }

  func PrepareDistinctLinearGradientPaint(count int32) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: GradientPaintFixtureCell{ Count: count, DistinctGradients: true },
    }
    window.UpdateTree()
    return window
  }

  func PrepareDistinctShapeGradientPaint(count int32) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: GradientPaintFixtureCell{ Count: count, DistinctGradients: true, ShapeGradients: true },
    }
    window.UpdateTree()
    return window
  }

  internal func prepareGradientPaint(count int32, gradient Gradient?) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: GradientPaintFixtureCell{ Count: count, FillGradient: gradient },
    }
    window.UpdateTree()
    return window
  }

  func GradientPaintChildCount(window Window) int32 {
    guard let tree = window.Tree else { return -1 }
    return int32(tree.Children.Count)
  }

  func PrepareBackgroundImagePaint(count int32, distinct bool) Window {
    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    let window = Window{
      Width: 800,
      Height: 600,
      Root: BackgroundImagePaintFixtureCell{ Count: count, Distinct: distinct },
    }
    window.UpdateTree()
    waitForBackgroundImages(window, count)
    return window
  }

  func PrepareOwnedBackgroundImagePaint(count int32) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: OwnedBackgroundImagePaintFixtureCell{ Count: count },
    }
    window.UpdateTree()
    return window
  }

  func BackgroundImagePaintChildCount(window Window) int32 {
    guard let tree = window.Tree else { return -1 }
    return int32(tree.Children.Count)
  }

  internal func waitForBackgroundImages(window Window, count int32) {
    guard let tree = window.Tree else {
      return
    }
    for attempt in 0 ... 100000 {
      var ready = 0
      for child in tree.Children {
        if BackgroundImageLayouts.Image(child) != nil { ready++ }
      }
      if ready == count {
        return
      }
      Thread.Yield()
    }
    throw InvalidOperationException("background image benchmark decode timed out")
  }

  func PrepareOutlinePaint(count int32, outlined bool) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: OutlinePaintFixtureCell{ Count: count, Outlined: outlined },
    }
    window.UpdateTree()
    return window
  }

  func PrepareClipPathPaint(count int32, clipped bool) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: ClipPathPaintFixtureCell{ Count: count, Clipped: clipped },
    }
    window.UpdateTree()
    return window
  }

  func ClipPathPaintChildCount(window Window) int32 {
    guard let tree = window.Tree else { return -1 }
    return int32(tree.Children.Count)
  }

  func MountClipPathTree(count int32, clipped bool) int32 {
    let window = PrepareClipPathPaint(count, clipped)
    guard let tree = window.Tree else { return 0 }
    return countNodes(tree)
  }

  func ClipPathFingerprint(window Window) int32 {
    return window.UpdateTreeForPresentation(0.0) ? 1 : 0
  }

  func PrepareTextDecorationPaint(count int32, decoration TextDecoration) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: TextDecorationPaintFixtureCell{ Count: count, Decoration: decoration },
    }
    window.UpdateTree()
    return window
  }

  func PrepareTextShadowPaint(count int32, shadows []TextShadow, styled bool) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: TextShadowPaintFixtureCell{ Count: count, Shadows: shadows, Styled: styled },
    }
    window.UpdateTree()
    return window
  }

  func TextShadowFingerprint(window Window) int32 {
    return window.UpdateTreeForPresentation(0.0) ? 1 : 0
  }

  func PrepareTextStrokePaint(count int32, width float64, color Color, styled bool) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: TextStrokePaintFixtureCell{
        Count: count, Width: width, Color: color, Styled: styled, Entries: false,
      },
    }
    window.UpdateTree()
    return window
  }

  func PrepareTextStrokeEntryPaint(count int32, width float64, spacing float64) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: TextStrokePaintFixtureCell{
        Count: count, Width: width, Color: Color.Black, Styled: width > 0.0,
        Entries: true, LetterSpacing: spacing,
      },
    }
    window.UpdateTree()
    return window
  }

  func TextStrokeFingerprint(window Window) int32 {
    return window.UpdateTreeForPresentation(0.0) ? 1 : 0
  }

  func MountTextStrokeTree(count int32, styled bool) int32 {
    let window = PrepareTextStrokePaint(
      count, styled ? 2.0 : 0.0, styled ? Color.Black : Color.Transparent, styled)
    guard let tree = window.Tree else { return 0 }
    return countNodes(tree)
  }

  internal var visibilityHit Hit?
  internal var clipPathHit Hit?

  func PrepareClipPathHit(count int32, clipped bool) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: ClipPathHitFixtureCell{ Count: count, Clipped: clipped },
    }
    window.UpdateTree()
    clipPathHit = Hit()
    return window
  }

  func ClipPathHit(window Window) int32 {
    guard let tree = window.Tree else { return -1 }
    guard let hit = clipPathHit else { return -1 }
    guard let target = hit.Topmost(tree, 75.0F, 25.0F) else { return -1 }
    return target.Key == "underlay" ? 1 : 0
  }

  func PrepareVisibilityTraversal(count int32, hidden bool) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: VisibilityTraversalFixtureCell{ Count: count, Hidden: hidden },
    }
    window.UpdateTree()
    visibilityHit = Hit()
    return window
  }

  func VisibilityHit(window Window) int32 {
    guard let tree = window.Tree else { return -1 }
    guard let hit = visibilityHit else { return -1 }
    guard let target = hit.Topmost(tree, 20.0F, 20.0F) else { return -1 }
    return target.Key == "underlay" ? 1 : 0
  }

  internal var transformHit Hit?
  internal var transformStyleWindow Window?
  internal var transformStyleCell TransformStyleFixtureCell?
  internal var transformMotionWindow Window?
  internal var transformMotionCell TransformMotionFixtureCell?
  internal var transformMotionLastX float32
  internal var motionActivePump MotionPump?
  internal var motionCompletionPump MotionPump?

  internal var transformDispatchWindow Window?
  internal var transformDispatchCell TransformPointerDispatchFixtureCell?
  internal var transformDispatchInput PointerInput?
  internal var transformDispatchResolver Resolver?
  internal var transformDispatchX float32
  internal var transformDispatchExpected int32
  internal var pointerBurstWindow Window?
  internal var pointerBurstCell PointerBurstFixtureCell?
  internal var pointerBurstInput PointerInput?
  internal var pointerBurstResolver Resolver?
  internal var pointerBurstText TextInput?
  internal var pointerBurstMode int32
  internal var pointerBurstExpected int32

  func PrepareTransformPaint(count int32, transformed bool) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: TransformPaintFixtureCell{ Count: count, Transformed: transformed },
    }
    window.UpdateTree()
    return window
  }

  func PrepareTransformAncestorPaint(count int32, transformed bool) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: TransformAncestorPaintFixtureCell{ Count: count, Transformed: transformed },
    }
    window.UpdateTree()
    return window
  }

  func MountTransformTree(count int32, transformed bool) int32 {
    let window = PrepareTransformPaint(count, transformed)
    guard let tree = window.Tree else { return 0 }
    return countNodes(tree)
  }

  func MountTransformAncestorTree(count int32, transformed bool) int32 {
    let window = PrepareTransformAncestorPaint(count, transformed)
    guard let tree = window.Tree else { return 0 }
    return countNodes(tree)
  }

  func PrepareTransformHit(count int32, transformed bool) Window {
    let window = Window{
      Width: 800,
      Height: 600,
      Root: TransformHitFixtureCell{ Count: count, Transformed: transformed },
    }
    window.UpdateTree()
    transformHit = Hit()
    return window
  }

  func TransformHit(window Window) int32 {
    guard let tree = window.Tree else { return -1 }
    guard let hit = transformHit else { return -1 }
    guard let target = hit.Topmost(tree, 20.0F, 20.0F) else { return -1 }
    return target.Key == "underlay" ? 1 : 0
  }

  func TransformFingerprint(window Window) int32 {
    return window.UpdateTreeForPresentation(0.0) ? 1 : 0
  }

  func PrepareTransformStyleUpdate() {
    let cell = TransformStyleFixtureCell{}
    let window = Window{ Width: 160, Height: 120, Root: cell }
    window.UpdateTree()
    transformStyleCell = cell
    transformStyleWindow = window
  }

  func StepTransformStyleUpdate() int32 {
    guard let cell = transformStyleCell else { return -1 }
    guard let window = transformStyleWindow else { return -1 }
    cell.Flip()
    window.UpdateTree()
    guard let tree = window.Tree else { return -1 }
    return tree.HasVisualTransform == cell.Shifted() ? 1 : -1
  }

  func PrepareTransformMotionUpdate() {

    let cell = TransformMotionFixtureCell{}
    let window = Window{ Width: 160, Height: 120, Root: cell }
    window.UpdateTree()
    if let motion = cell.Motion {
      motion.To(64.0, foreverMotionSpec)

      window.UpdateTree(0.001)
      transformMotionCell = cell
      transformMotionWindow = window
      if let tree = window.Tree {
        transformMotionLastX = Transforming.TranslateX(tree).Value
      }
    }
  }

  func StepTransformMotionUpdate() int32 {
    guard let window = transformMotionWindow else { return -1 }

    window.UpdateTree(0.001)
    guard let tree = window.Tree else { return -1 }
    let next = Transforming.TranslateX(tree).Value
    if !tree.HasVisualTransform || next <= transformMotionLastX { return -1 }
    transformMotionLastX = next
    return 1
  }

  func PrepareTransformPointerDispatch(depth int32, transformed bool) {
    let cell = TransformPointerDispatchFixtureCell{ Depth: depth, Transformed: transformed }
    let window = Window{ Width: 240, Height: 120, Root: cell }
    window.UpdateTree()
    let input = PointerInput()
    let resolver = Resolver{}
    let x = transformed ? 150.0F : 50.0F
    input.HandlePointerMove(window.Tree, resolver, x, 50.0F, KeyModifiers{})
    transformDispatchWindow = window
    transformDispatchCell = cell
    transformDispatchInput = input
    transformDispatchResolver = resolver
    transformDispatchX = x
    transformDispatchExpected = cell.MoveCount
  }

  func TransformPointerDispatch() int32 {
    guard let window = transformDispatchWindow else { return -1 }
    guard let cell = transformDispatchCell else { return -1 }
    guard let input = transformDispatchInput else { return -1 }
    guard let resolver = transformDispatchResolver else { return -1 }
    transformDispatchX = transformDispatchX == 50.0F || transformDispatchX == 150.0F
      ? transformDispatchX + 1.0F : transformDispatchX - 1.0F
    input.HandlePointerMove(window.Tree, resolver, transformDispatchX, 50.0F, KeyModifiers{})
    transformDispatchExpected = transformDispatchExpected + 1
    return cell.MoveCount == transformDispatchExpected ? 1 : -1
  }

  func PreparePointerBurst(mode int32, transformed bool) {
    let cell = PointerBurstFixtureCell{ Capture: mode == 2, Transformed: transformed }
    let window = Window{ Width: 240, Height: 120, Root: cell }
    window.UpdateTree()
    let input = PointerInput()
    let resolver = Resolver{}
    let text = TextInput()
    let modifiers = KeyModifiers{}
    if mode == 1 {
      input.QueueMove(25.0F, 25.0F, modifiers)
    } else if mode == 2 {
      input.QueuePress(25.0F, 25.0F, PointerButton.Primary, modifiers)
    } else if mode == 3 {
      input.QueuePress(1, PointerDevice.Touch, 25.0F, 25.0F, PointerButton.Primary, modifiers, 0.5F)
    } else if mode == 4 {
      input.QueuePress(1, PointerDevice.Pen, 25.0F, 25.0F, PointerButton.Primary, modifiers, 0.5F)
    }
    input.Drain(window.Tree, resolver, 0.0, text)
    pointerBurstWindow = window
    pointerBurstCell = cell
    pointerBurstInput = input
    pointerBurstResolver = resolver
    pointerBurstText = text
    pointerBurstMode = mode
    pointerBurstExpected = cell.MoveCount
  }

  func PointerBurst() int32 {
    guard let window = pointerBurstWindow else { return -1 }
    guard let cell = pointerBurstCell else { return -1 }
    guard let input = pointerBurstInput else { return -1 }
    guard let resolver = pointerBurstResolver else { return -1 }
    guard let text = pointerBurstText else { return -1 }
    let modifiers = KeyModifiers{}
    for i in 0 ... 64 {
      let offset = i % 2 == 0 ? 0.0F : 1.0F
      if pointerBurstMode == 1 {
        input.QueueMove(25.0F + offset, 25.0F, modifiers)
      } else if pointerBurstMode == 2 {
        input.QueueMove(180.0F + offset, 25.0F, modifiers)
      } else if pointerBurstMode == 3 {
        input.QueueMove(1, PointerDevice.Touch, 25.0F + offset, 25.0F, modifiers, 0.5F)
      } else if pointerBurstMode == 4 {
        input.QueueMove(1, PointerDevice.Pen, 25.0F + offset, 25.0F, modifiers, 0.5F)
      }
    }
    input.Drain(window.Tree, resolver, 0.0, text)
    pointerBurstExpected = pointerBurstExpected + 64
    return cell.MoveCount == pointerBurstExpected ? 1 : -1
  }

  internal var typingWindow Window?
  internal var typingInput InputCoordinator?

  func PrepareTyping() {
    let h = EntryHarness{}
    let w = Window{ Width: 300, Height: 100, Root: h }
    w.UpdateTree()
    let input = InputCoordinator()
    let resolver = Resolver{}
    input.AfterTreeUpdated(w.Tree, resolver, true)
    input.HandlePress(w.Tree, resolver, 0.0, 10.0F, 10.0F)
    input.HandleRelease(w.Tree, resolver, 10.0F, 10.0F)
    typingWindow = w
    typingInput = input
  }

  func StepTyping() int32 {
    guard let w = typingWindow else { return -1 }
    guard let input = typingInput else { return -1 }
    input.HandleChar(w.Tree, "x")
    w.UpdateTree(0.016)
    return w.Tree!!.Children[0].Buffer.Length
  }

  internal var frameWindow Window?
  internal var frameCell FrameFixtureCell?

  // Mounts the fixture tree once, outside any measured window, so
  // StepSteadyFrame exercises steady-state frames, not a first mount.
  func PrepareSteadyFrame() {
    let cell = FrameFixtureCell{}
    let w = Window{ Root: cell, Width: 420, Height: 200 }
    w.UpdateTree()
    frameWindow = w
    frameCell = cell
  }

  // One full headless frame: dirty state write, then Build->Diff->Layout
  // via UpdateTree. Returns the node count so the caller consumes it.
  func StepSteadyFrame() int32 {
    guard let w = frameWindow else {
      return -1
    }
    guard let cell = frameCell else {
      return -1
    }
    cell.Bump()
    w.UpdateTree()
    guard let n = w.Tree else {
      return -1
    }
    return countNodes(n)
  }

  // The same window as StepSteadyFrame but with no state write, so UpdateTree
  // skips Build and Diff and the cost is Layout.Calculate alone.
  func StepLayoutOnlyFrame() int32 {
    guard let w = frameWindow else {
      return -1
    }
    w.UpdateTree()
    guard let n = w.Tree else {
      return -1
    }
    return countNodes(n)
  }

  internal var scaleWindow Window?
  internal var scaleCell ScaleFixtureCell?
  internal var componentScaleWindow Window?
  internal var componentScaleRow ComponentizedScaleRowCell?
  internal var componentCallbackScaleWindow Window?
  internal var componentCallbackScaleRow ComponentizedScaleRowCell?
  internal var unhandledWheelWindow Window?
  internal var unhandledWheelInput InputCoordinator?
  internal var unhandledWheelResolver Resolver?

  func PrepareScale(rows int32) int32 {
    let cell = ScaleFixtureCell{ rows: rows }
    let w = Window{ Root: cell, Width: 1280, Height: 720 }
    w.UpdateTree()
    scaleWindow = w
    scaleCell = cell
    guard let n = w.Tree else { return -1 }
    return countNodes(n)
  }

  func PrepareScalePaint(rows int32) Window {
    PrepareScale(rows)
    guard let w = scaleWindow else {
      throw InvalidOperationException("scale paint fixture did not mount")
    }
    return w
  }

  // Monolithic root state change rebuilds the full list.
  func StepScaleDirty() int32 {
    guard let w = scaleWindow else { return -1 }
    guard let cell = scaleCell else { return -1 }
    cell.Bump()
    w.UpdateTree()
    return 1
  }

  func PrepareComponentizedScale(rows int32) int32 {
    let cell = ComponentizedScaleFixtureCell{ rows: rows }
    let w = Window{ Root: cell, Width: 1280, Height: 720 }
    w.UpdateTree()
    guard let n = w.Tree else { return -1 }
    if n.Children.Count == 0 {
      return -1
    }
    guard let first = n.Children[0].Fiber else { return -1 }
    if first is ComponentizedScaleRowCell {
      componentScaleWindow = w
      componentScaleRow = first
      return countNodes(n)
    }
    return -1
  }

  func StepComponentizedScaleDirty() int32 {
    guard let w = componentScaleWindow else { return -1 }
    guard let row = componentScaleRow else { return -1 }
    row.Bump()
    w.UpdateTree()
    return row.Tick()
  }

  func ComponentizedScaleFirstLabelMatches(tick int32) bool {
    guard let w = componentScaleWindow else { return false }
    guard let root = w.Tree else { return false }
    if root.Children.Count == 0 || root.Children[0].Children.Count == 0 {
      return false
    }
    return root.Children[0].Children[0].Content == "row $tick"
  }

  func PrepareComponentizedCallbackScale(rows int32) int32 {
    let cell = ComponentizedScaleFixtureCell{ rows: rows, CallbackRows: true }
    let w = Window{ Root: cell, Width: 1280, Height: 720 }
    w.UpdateTree()
    guard let n = w.Tree else { return -1 }
    if n.Children.Count == 0 { return -1 }
    guard let first = n.Children[0].Fiber else { return -1 }
    if first is ComponentizedScaleRowCell {
      componentCallbackScaleWindow = w
      componentCallbackScaleRow = first
      return countNodes(n)
    }
    return -1
  }

  func StepComponentizedCallbackScaleDirty() int32 {
    guard let w = componentCallbackScaleWindow else { return -1 }
    guard let row = componentCallbackScaleRow else { return -1 }
    row.Bump()
    w.UpdateTree()
    return row.Tick()
  }

  func ComponentizedCallbackScaleFirstLabelMatches(tick int32) bool {
    guard let w = componentCallbackScaleWindow else { return false }
    guard let root = w.Tree else { return false }
    if root.Children.Count == 0 || root.Children[0].Children.Count == 0 {
      return false
    }
    return root.Children[0].Children[0].Content == "row $tick"
  }

  func PrepareUnhandledWheel() {
    let window = Window{ Root: UnhandledWheelFixtureCell{}, Width: 100, Height: 100 }
    window.UpdateTree()
    unhandledWheelWindow = window
    unhandledWheelInput = InputCoordinator()
    unhandledWheelResolver = Resolver{}
  }

  func StepUnhandledWheel() int32 {
    guard let window = unhandledWheelWindow else { return -1 }
    guard let input = unhandledWheelInput else { return -1 }
    guard let resolver = unhandledWheelResolver else { return -1 }
    input.QueuePointerWheel(50.0F, 50.0F, 0.0F, 1.0F)
    return input.Drain(window.Tree, resolver, 0.0, nil) ? 1 : 0
  }

  // No state change at all, which is what most frames of a desktop app are.
  func StepScaleIdle() int32 {
    guard let w = scaleWindow else { return -1 }
    w.UpdateTree()
    return 1
  }

  internal var deepScaleWindow Window?
  internal var deepScaleCell DeepScaleFixtureCell?

  func PrepareDeepScale(depth int32) int32 {
    let cell = DeepScaleFixtureCell{ depth: depth }
    let w = Window{ Root: cell, Width: 1280, Height: 720 }
    w.UpdateTree()
    deepScaleWindow = w
    deepScaleCell = cell
    guard let n = w.Tree else { return -1 }
    return countNodes(n)
  }

  // Deep-narrow counterpart to StepScaleDirty: one root state change
  // rebuilds a single-child container chain ending in one Text leaf.
  func StepDeepScaleDirty() int32 {
    guard let w = deepScaleWindow else { return -1 }
    guard let cell = deepScaleCell else { return -1 }
    cell.Bump()
    w.UpdateTree()
    return 1
  }

  internal var hoverFlipWindow Window?
  internal var hoverFlipInput InputCoordinator?
  internal var hoverFlipResolver Resolver?
  internal var hoverFlipInside bool

  // Mounts a 3-node tree (root + two children, only the left with Hover
  // styles) once, outside any measured window; cursor starts on the right.
  func PrepareHoverFlip() {
    let w = Window{ Root: HoverFlipFixtureCell{}, Width: 200, Height: 200 }
    w.UpdateTree()
    let input = InputCoordinator()
    let resolver = Resolver{}
    input.AfterTreeUpdated(w.Tree, resolver, true)
    input.HandleMove(w.Tree, resolver, 150.0F, 150.0F)
    hoverFlipWindow = w
    hoverFlipInput = input
    hoverFlipResolver = resolver
    hoverFlipInside = false
  }

  // One HandleMove flip between the two children: root stays in both
  // chains, so this costs exactly one exit resolve + one enter resolve.
  func StepHoverFlip() int32 {
    guard let w = hoverFlipWindow else {
      return -1
    }
    guard let input = hoverFlipInput else { return -1 }
    guard let resolver = hoverFlipResolver else { return -1 }
    hoverFlipInside = !hoverFlipInside
    if hoverFlipInside {
      input.HandleMove(w.Tree, resolver, 25.0F, 25.0F)
    } else {
      input.HandleMove(w.Tree, resolver, 150.0F, 150.0F)
    }
    return int32(input.CurrentCursor()) + 1
  }

  internal var animatingResolver Resolver?
  internal var zeroZStackingParent Node?
  internal var activeZStackingParent Node?

  func PrepareZeroZIndexTraversal() {
    let parent = Node{ Kind: NodeKind.Container }
    parent.Children.Add(Node{ Kind: NodeKind.Container, Parent: parent })
    parent.Children.Add(Node{ Kind: NodeKind.Container, Parent: parent })
    parent.Children.Add(Node{ Kind: NodeKind.Container, Parent: parent })
    Stacking.InvalidateStructure(parent)
    Stacking.Children(parent)
    zeroZStackingParent = parent
  }

  func StepZeroZIndexTraversal() int32 {
    guard let parent = zeroZStackingParent else { return -1 }
    let forward = Stacking.Children(parent)
    let reverse = Stacking.Children(parent)
    return forward.Count + reverse.Count
  }

  func PrepareActiveZIndexTraversal() {
    let parent = Node{ Kind: NodeKind.Container }
    let low = Node{ Kind: NodeKind.Container, Parent: parent, ZIndex: -1 }
    let middle = Node{ Kind: NodeKind.Container, Parent: parent }
    let high = Node{ Kind: NodeKind.Container, Parent: parent, ZIndex: 1 }
    parent.Children.Add(middle)
    parent.Children.Add(high)
    parent.Children.Add(low)
    Stacking.InvalidateStructure(parent)
    Stacking.Children(parent)
    activeZStackingParent = parent
  }

  func StepActiveZIndexTraversal() int32 {
    guard let parent = activeZStackingParent else { return -1 }
    let forward = Stacking.Children(parent)
    let reverse = Stacking.Children(parent)
    return forward[0].ZIndex + reverse[reverse.Count - 1].ZIndex
      + forward.Count + reverse.Count
  }

  // One node mid-transition (TransitionMs 10000, hover target already in
  // flight) so StepAnimatingFrame measures Advance alone.
  func PrepareAnimatingFrame() {
    let n = Node{ Kind: NodeKind.Container }
    let r = Resolver{}
    n.TransitionMs = 10000.0
    n.BaseStyle = Style{ Opacity: 0.0 }.Entries()
    n.HoverStyle = Style{ Opacity: 1.0 }.Entries()
    r.Invalidate(n, true)
    r.Flush()
    n.Hovered = true
    r.Invalidate(n, false)
    r.Flush()
    animatingResolver = r
  }

  // One Advance(0.001) against the single in-flight transition; struct
  // updates in place, so this should allocate ~0.
  func StepAnimatingFrame() int32 {
    guard let r = animatingResolver else {
      return -1
    }
    r.Advance(0.001)
    return 1
  }

  // Measures one leaf-cell state change at scale: the dirty frame should cost
  // on the order of one card's rebuild, not the whole tree's.
  func CellScaleLeafChangeBytes(cards int32) int64 {
    let root = FixtureCardListCell{ Count: cards }
    let w = Window{ Width: 800, Height: 600, Root: root }
    w.UpdateTree()
    guard let tree = w.Tree else { return -1 }
    guard let f = tree.Children[0].Fiber else { return -1 }
    if f is FixtureCardCell {
      // Warm up one dirty frame so first-time paths are jitted/cached.
      f.stamp.Value = 1
      w.UpdateTree()

      let before = GC.GetAllocatedBytesForCurrentThread()
      f.stamp.Value = 2
      w.UpdateTree()
      let bytes = GC.GetAllocatedBytesForCurrentThread() - before

      // Prove the leaf actually re-rendered, not a silent dirty-flag skip.
      guard let after = w.Tree else { return -1 }
      if after.Children[0].BackgroundColor.R < 0.9F {
        return -1
      }
      return bytes
    }
    return -1
  }

  func CellScaleIntrinsicTextReflowBytes(cards int32) int64 {
    let root = FixtureIntrinsicTextCardListCell{ Count: cards }
    let w = Window{ Width: 800, Height: 600, Root: root }
    w.UpdateTree()
    guard let tree = w.Tree else { return -1 }
    guard let f = tree.Children[0].Fiber else { return -1 }
    if f is FixtureIntrinsicTextCardCell {
      f.stamp.Value = 1
      w.UpdateTree()
      let before = GC.GetAllocatedBytesForCurrentThread()
      f.stamp.Value = 2
      w.UpdateTree()
      return GC.GetAllocatedBytesForCurrentThread() - before
    }
    return -1
  }

  // One steady-state tick of a single running (never-finishing) anim: calls
  // MotionPump.Sweep directly, so Build/Diff/Layout never runs in the
  // measured window (a queued invalidate()-triggered rebuild is never
  // consumed, since UpdateTree isn't called again here).
  func MotionTickBytes() int64 {
    let pump = MotionPump()
    let root = MotionTickFixtureCell{}
    let w = Window{ Width: 100, Height: 100, Root: root }
    w.UpdateTree()
    guard let anim = root.anim else { return -1 }
    root.BindPump(pump)
    anim.To(1.0, foreverMotionSpec)
    pump.Sweep(0.001)

    let before = GC.GetAllocatedBytesForCurrentThread()
    pump.Sweep(0.001)
    let bytes = GC.GetAllocatedBytesForCurrentThread() - before

    if !anim.Running {
      return -1
    }
    return bytes
  }

  internal var motionRetargetCell MotionBenchmarkCell?
  internal var motionFloat Anim[float64]?
  internal var motionPoint Anim[Point]?
  internal var motionColor Anim[Color]?
  internal var motionFlip bool
  internal var motionActiveCell MotionBenchmarkCell?
  internal var motionActiveFloat Anim[float64]?
  internal var motionActivePoint Anim[Point]?
  internal var motionActiveColor Anim[Color]?
  internal var motionCompletionCell MotionBenchmarkCell?

  func MotionConstructFloat64(count int32) int32 {
    let cell = MotionBenchmarkCell{}
    var total = 0.0
    for var i = 0; i < count; i++ {
      let anim = cell.Animate(float64(i))
      total = total + anim.Value
    }
    return int32(total)
  }

  func MotionConstructPoint(count int32) int32 {
    let cell = MotionBenchmarkCell{}
    var total = 0.0
    for var i = 0; i < count; i++ {
      let value = float64(i)
      let anim = cell.Animate(Point{ X: value, Y: value + 1.0 })
      let current = anim.Value
      total = total + current.X + current.Y
    }
    return int32(total)
  }

  func MotionConstructColor(count int32) int32 {
    let cell = MotionBenchmarkCell{}
    var total = 0.0
    for var i = 0; i < count; i++ {
      let anim = cell.Animate(Color.Rgba(32, 64, 96, 128))
      total = total + float64(anim.Value.A)
    }
    return int32(total)
  }

  func PrepareMotionRetargets() {
    let pump = MotionPump()
    let cell = MotionBenchmarkCell{}
    cell.BindPump(pump)
    motionRetargetCell = cell
    motionFloat = cell.Animate(0.0)
    motionPoint = cell.Animate(Point{ X: 0.0, Y: 0.0 })
    motionColor = cell.Animate(Color.Black)
    motionFlip = false
  }

  func MotionRetargetFloat64Ordinary() int32 {
    guard let anim = motionFloat else { return -1 }
    motionFlip = !motionFlip
    anim.To(motionFlip ? 1.0 : 0.0)
    return anim.Running ? 1 : 0
  }

  func MotionRetargetPointOrdinary() int32 {
    guard let anim = motionPoint else { return -1 }
    motionFlip = !motionFlip
    anim.To(motionFlip ? Point{ X: 1.0, Y: 2.0 } : Point{ X: 0.0, Y: 0.0 })
    return anim.Running ? 1 : 0
  }

  func MotionRetargetColorOrdinary() int32 {
    guard let anim = motionColor else { return -1 }
    motionFlip = !motionFlip
    anim.To(motionFlip ? Color.White : Color.Black)
    return anim.Running ? 1 : 0
  }

  func MotionRetargetFloat64Uniform() int32 {
    guard let anim = motionFloat else { return -1 }
    motionFlip = !motionFlip
    anim.To(motionFlip ? 1.0 : 0.0, MotionVelocity.Uniform(3.0))
    return anim.Running ? 1 : 0
  }

  func MotionRetargetPointUniform() int32 {
    guard let anim = motionPoint else { return -1 }
    motionFlip = !motionFlip
    anim.To(motionFlip ? Point{ X: 1.0, Y: 2.0 } : Point{ X: 0.0, Y: 0.0 }, MotionVelocity.Uniform(3.0))
    return anim.Running ? 1 : 0
  }

  func MotionRetargetColorUniform() int32 {
    guard let anim = motionColor else { return -1 }
    motionFlip = !motionFlip
    anim.To(motionFlip ? Color.White : Color.Black, MotionVelocity.Uniform(0.5))
    return anim.Running ? 1 : 0
  }

  func MotionRetargetFloat64Components() int32 {
    guard let anim = motionFloat else { return -1 }
    motionFlip = !motionFlip
    anim.To(motionFlip ? 1.0 : 0.0, MotionVelocity.Components(3.0))
    return anim.Running ? 1 : 0
  }

  func MotionRetargetPointComponents() int32 {
    guard let anim = motionPoint else { return -1 }
    motionFlip = !motionFlip
    anim.To(
      motionFlip ? Point{ X: 1.0, Y: 2.0 } : Point{ X: 0.0, Y: 0.0 },
      MotionVelocity.Components(3.0, -2.0))
    return anim.Running ? 1 : 0
  }

  func MotionRetargetColorComponents() int32 {
    guard let anim = motionColor else { return -1 }
    motionFlip = !motionFlip
    anim.To(
      motionFlip ? Color.White : Color.Black,
      MotionVelocity.Components(0.5, -0.25, 0.75, 0.0))
    return anim.Running ? 1 : 0
  }

  func PrepareMotionActiveFloat64() {
    let pump = MotionPump()
    motionActivePump = pump
    let cell = MotionBenchmarkCell{}
    cell.BindPump(pump)
    let anim = cell.Animate(0.0)
    anim.To(1.0, activeMotionSpec)
    motionActiveCell = cell
    motionActiveFloat = anim
  }

  func PrepareMotionActivePoint() {
    let pump = MotionPump()
    motionActivePump = pump
    let cell = MotionBenchmarkCell{}
    cell.BindPump(pump)
    let anim = cell.Animate(Point{ X: 0.0, Y: 0.0 })
    anim.To(Point{ X: 1.0, Y: 1.0 }, activeMotionSpec)
    motionActiveCell = cell
    motionActivePoint = anim
  }

  func PrepareMotionActiveColor() {
    let pump = MotionPump()
    motionActivePump = pump
    let cell = MotionBenchmarkCell{}
    cell.BindPump(pump)
    let anim = cell.Animate(Color.Black)
    anim.To(Color.White, activeMotionSpec)
    motionActiveCell = cell
    motionActiveColor = anim
  }

  func MotionActiveFloat64TickAndValue() int32 {
    guard let anim = motionActiveFloat else { return -1 }
    guard let pump = motionActivePump else { return -1 }
    pump.Sweep(0.001)
    return int32(anim.Value * 1000.0)
  }

  func MotionActivePointTickAndValue() int32 {
    guard let anim = motionActivePoint else { return -1 }
    guard let pump = motionActivePump else { return -1 }
    pump.Sweep(0.001)
    let value = anim.Value
    return int32((value.X + value.Y) * 1000.0)
  }

  func MotionActiveColorTickAndValue() int32 {
    guard let anim = motionActiveColor else { return -1 }
    guard let pump = motionActivePump else { return -1 }
    pump.Sweep(0.001)
    let value = anim.Value
    return int32((float64(value.R) + float64(value.G) + float64(value.B) + float64(value.A)) * 1000.0)
  }

  func PrepareMotionMassCompletion(count int32) {
    let pump = MotionPump()
    motionCompletionPump = pump
    let cell = MotionBenchmarkCell{}
    cell.BindPump(pump)
    motionCompletionCell = cell
    for var i = 0; i < count; i++ {
      let anim = cell.Animate(float64(i))
      anim.To(float64(i + 1), doneMotionSpec)
    }
  }

  func MotionMassCompletionSweep() int32 {
    guard let pump = motionCompletionPump else { return -1 }
    pump.Sweep(0.001)
    return pump.Active ? 1 : 0
  }

  func PrepareMotionMixedCompletion(count int32) {
    let pump = MotionPump()
    motionCompletionPump = pump
    let cell = MotionBenchmarkCell{}
    cell.BindPump(pump)
    motionCompletionCell = cell
    for var i = 0; i < count; i++ {
      let anim = cell.Animate(float64(i))
      if i % 2 == 0 {
        anim.To(float64(i + 1), doneMotionSpec)
      } else {
        anim.To(float64(i + 1), activeMotionSpec)
      }
    }
  }

  func MotionMixedCompletionSweep() int32 {
    guard let pump = motionCompletionPump else { return -1 }
    pump.Sweep(0.001)
    return pump.Active ? 1 : 0
  }

  internal var scrollFrameWindow Window?
  internal var scrollFrameInput InputCoordinator?
  internal var scrollFrameResolver Resolver?
  internal var scrollFrameFlip bool

  // Steady scroll churn: every step retargets, so the lerp+refresh path runs.
  func PrepareScrollFrame() {
    let w = Window{ Root: PinnedScrollFixtureCell{}, Width: 100, Height: 100 }
    w.UpdateTree()
    let input = InputCoordinator()
    let resolver = Resolver{}
    input.AfterTreeUpdated(w.Tree, resolver, true)
    if let root = w.Tree {
      root.UserScrolled = true
    }
    scrollFrameWindow = w
    scrollFrameInput = input
    scrollFrameResolver = resolver
    scrollFrameFlip = false
  }

  func StepScrollFrame() int32 {
    guard let w = scrollFrameWindow else {
      return -1
    }
    guard let input = scrollFrameInput else { return -1 }
    guard let resolver = scrollFrameResolver else { return -1 }
    scrollFrameFlip = !scrollFrameFlip
    input.HandleWheel(w.Tree, 50.0F, 50.0F, 0.0F, scrollFrameFlip ? -1.0F : 1.0F)
    w.UpdateTree(1.0 / 60.0)
    input.AfterTreeUpdated(w.Tree, resolver, true)
    return 1
  }

}

internal class EmptyBuildCell : Cell {
  override func Build() Blob {
    return Container{}
  }
}

internal class TextTrimmingFixtureCell : Cell {
  override func Build() Blob {
    return Text{
      Width: 240,
      Padding: 12,
      Content: "A long static text line that must be trimmed at several cached widths",
      TextWrap: TextWrap.NoWrap,
      TextTrimming: TextTrimming.Ellipsis,
    }
  }
}

internal class TextTransformFlipFixtureCell : Cell {
  internal var uppercase State[bool]

  init() {
    uppercase = Track(false)
  }

  func Flip() {
    uppercase.Value = !uppercase.Value
  }

  func IsUppercase() bool {
    return uppercase.Value
  }

  override func Build() Blob {
    return Text{
      Width: 320,
      Content: "Goo keeps representative static text layout cached while interface state changes around it.",
      TextTransform: uppercase.Value ? TextTransform.Uppercase : TextTransform.None,
    }
  }
}

internal class DirectionTextPaintFixtureCell : Cell {
  internal var Count int32
  internal var Mixed bool

  override func Build() Blob {
    let root = Container{ Width: 800, FlexDirection: FlexDirection.Row, FlexWrap: FlexWrap.Wrap }
    for i in 0 ... Count {
      root.Children.Add(Text{
        Key: "direction-text-$i",
        Content: Mixed ? "Goo מצב 42" : "Goo status 42",
        Width: 96,
        Height: 24,
        Direction: Direction.Auto,
        FontFamily: "DejaVu Sans",
      })
    }
    return root
  }
}

internal class DirectionMountFixtureCell : Cell {
  internal var Count int32
  internal var Logical bool

  override func Build() Blob {
    let root = Logical ? Container{
      Width: 800,
      FlexDirection: FlexDirection.Row,
      FlexWrap: FlexWrap.Wrap,
      Direction: Direction.RightToLeft,
    } : Container{
      Width: 800,
      FlexDirection: FlexDirection.Row,
      FlexWrap: FlexWrap.Wrap,
    }
    for i in 0 ... Count {
      if Logical {
        root.Children.Add(Container{
          Key: "logical-$i", Width: 48, Height: 32,
          MarginStart: 2, PaddingStart: 3,
          BorderStartWidth: 1, BorderStartColor: Color.Rgb(60, 130, 246),
        })
      } else {
        root.Children.Add(Container{
          Key: "physical-$i", Width: 48, Height: 32,
          MarginRight: 2, PaddingRight: 3,
          BorderRightWidth: 1, BorderRightColor: Color.Rgb(60, 130, 246),
        })
      }
    }
    return root
  }
}

internal class GradientPaintFixtureCell : Cell {
  internal var Count int32
  internal var FillGradient Gradient?
  internal var DistinctGradients bool
  internal var ShapeGradients bool

  override func Build() Blob {
    let root = Container{
      Width: 800,
      Height: 600,
      FlexDirection: FlexDirection.Row,
      FlexWrap: FlexWrap.Wrap,
    }
    if DistinctGradients {
      if ShapeGradients {
        let path = PathBuilder().MoveTo(0.0, 0.0).LineTo(1.0, 0.0)
          .LineTo(1.0, 1.0).LineTo(0.0, 1.0).Close().Build()
        for i in 0 ... Count {
          root.Children.Add(Shape{
            Key: "distinct-shape-gradient-$i", Width: 40, Height: 20, Path: path,
            BackgroundGradient: LinearGradient(135.0,
              Color.Rgb(26, 42, 108), Color.Rgb(178, 31, 31)),
          })
        }
        return root
      }
      for i in 0 ... Count {
        root.Children.Add(Container{
          Key: "distinct-gradient-$i", Width: 40, Height: 20,
          BackgroundGradient: LinearGradient(135.0,
            Color.Rgb(26, 42, 108), Color.Rgb(178, 31, 31)),
        })
      }
      return root
    }
    if let gradient = FillGradient {
      for i in 0 ... Count {
        root.Children.Add(Container{
          Key: "gradient-$i", Width: 40, Height: 20, BackgroundGradient: gradient,
        })
      }
      return root
    }
    for i in 0 ... Count {
      root.Children.Add(Container{
        Key: "flat-$i", Width: 40, Height: 20, BackgroundColor: Color.Rgb(26, 42, 108),
      })
    }
    return root
  }
}

internal class ScrollPaintFixtureCell : Cell {
  internal var Rows int32

  override func Build() Blob {
    let viewport = Container{
      Width: 1280,
      Height: 720,
      OverflowY: Overflow.Scroll,
      BackgroundColor: Color.Rgb(12, 14, 18),
    }
    for row in 0 ... Rows {
      for column in 0 ... 70 {
        viewport.Children.Add(Text{
          Content: "ACME ${row * 70 + column} 42.15",
          Position: PositionType.Absolute,
          Left: float64(column * 64),
          Top: float64(row * 18),
          Width: 64,
          Height: 18,
          PaddingLeft: 2,
          PaddingTop: 1,
          PaddingRight: 2,
          PaddingBottom: 1,
          FontSize: 8,
          TextWrap: TextWrap.NoWrap,
          TextTrimming: TextTrimming.Ellipsis,
          Color: column % 2 == 0 ? Color.Rgb(0, 128, 0) : Color.Rgb(255, 0, 0),
        })
      }
    }
    return viewport
  }
}

internal class TallTextPaintFixtureCell : Cell {
  internal var Lines int32

  override func Build() Blob {
    let sb = StringBuilder()
    for i in 0 ... Lines {
      if i > 0 { sb.Append("\n") }
      sb.Append("log line ")
      sb.Append(i)
      sb.Append(" lorem ipsum dolor sit amet consectetur")
    }
    let viewport = Container{
      Width: 1280,
      Height: 720,
      OverflowY: Overflow.Scroll,
      BackgroundColor: Color.Rgb(12, 14, 18),
    }
    viewport.Children.Add(Text{
      Content: sb.ToString(),
      Width: 1280,
      FontSize: 12,
      Color: Color.Rgb(220, 224, 228),
    })
    return viewport
  }
}

internal class BackgroundImagePaintFixtureCell : Cell {
  internal var Count int32
  internal var Distinct bool

  override func Build() Blob {
    let root = Container{
      Width: 800,
      Height: 600,
      FlexDirection: FlexDirection.Row,
      FlexWrap: FlexWrap.Wrap,
    }
    for i in 0 ... Count {
      root.Children.Add(Container{
        Key: "background-image-$i", Width: 40, Height: 20,
        BackgroundColor: Color.Rgb(26, 42, 108),
        BackgroundImage: Distinct ? "synthetic-background-$i" : "synthetic-background-shared",
        BackgroundImageFit: ImageFit.Cover,
      })
    }
    return root
  }
}

internal class OwnedBackgroundImagePaintFixtureCell : Cell, IDisposable {
  private let source ImageSource
  internal var Count int32

  init() {
    source = ImageSource(2, 1, []uint8{ 255, 0, 0, 255, 0, 0, 255, 255 })
  }

  override func Build() Blob {
    let root = Container{
      Width: 800,
      Height: 600,
      FlexDirection: FlexDirection.Row,
      FlexWrap: FlexWrap.Wrap,
    }
    for i in 0 ... Count {
      root.Children.Add(Container{
        Key: "owned-background-image-$i", Width: 40, Height: 20,
        BackgroundColor: Color.Rgb(26, 42, 108),
        BackgroundImageSource: source,
        BackgroundImageFit: ImageFit.Cover,
      })
    }
    return root
  }

  public func Dispose() { source.Dispose() }
}

internal class OutlinePaintFixtureCell : Cell {
  internal var Count int32
  internal var Outlined bool

  override func Build() Blob {
    let root = Container{ Width: 800, FlexDirection: FlexDirection.Row, FlexWrap: FlexWrap.Wrap }
    for i in 0 ... Count {
      if Outlined {
        root.Children.Add(Container{
          Key: "outline-$i", Width: 32, Height: 24, Margin: 4, BorderRadius: 6,
          BackgroundColor: Color.Rgb(41, 41, 51),
          OutlineWidth: 2, OutlineOffset: 1, OutlineColor: Color.Rgb(60, 130, 246),
        })
      } else {
        root.Children.Add(Container{
          Key: "plain-$i", Width: 32, Height: 24, Margin: 4, BorderRadius: 6,
          BackgroundColor: Color.Rgb(41, 41, 51),
        })
      }
    }
    return root
  }
}

internal class ClipPathPaintFixtureCell : Cell {
  internal var Count int32
  internal var Clipped bool

  override func Build() Blob {
    let root = Container{ Width: 800, FlexDirection: FlexDirection.Row, FlexWrap: FlexWrap.Wrap }
    let path = PathBuilder(0.0, 0.0, 1.0, 1.0)
      .MoveTo(0.0, 0.0).LineTo(1.0, 0.0).LineTo(0.5, 1.0).Close().Build()
    for i in 0 ... Count {
      if Clipped {
        root.Children.Add(Container{
          Key: "clipped-$i", Width: 32, Height: 24, Margin: 4,
          BackgroundColor: Color.Rgb(41, 41, 51), ClipPath: path,
        })
      } else {
        root.Children.Add(Container{
          Key: "plain-$i", Width: 32, Height: 24, Margin: 4,
          BackgroundColor: Color.Rgb(41, 41, 51),
        })
      }
    }
    return root
  }
}

internal class TextDecorationPaintFixtureCell : Cell {
  internal var Count int32
  internal var Decoration TextDecoration

  override func Build() Blob {
    let root = Container{
      Width: 800,
      FlexDirection: FlexDirection.Row,
      FlexWrap: FlexWrap.Wrap,
      TextDecoration: Decoration,
    }
    for i in 0 ... Count {
      root.Children.Add(Text{
        Key: "text-$i", Content: "Goo", Width: 40, Height: 24, FontSize: 14,
      })
    }
    return root
  }
}

internal class TextShadowPaintFixtureCell : Cell {
  internal var Count int32
  internal var Shadows []TextShadow
  internal var Styled bool

  override func Build() Blob {
    if Styled {
      let root = Container{
        Width: 800,
        FlexDirection: FlexDirection.Row,
        FlexWrap: FlexWrap.Wrap,
        TextShadows: Shadows,
      }
      for i in 0 ... Count {
        root.Children.Add(Text{
          Key: "shadowed-text-$i", Content: "Goo", Width: 40, Height: 24, FontSize: 14,
        })
      }
      return root
    }
    let root = Container{ Width: 800, FlexDirection: FlexDirection.Row, FlexWrap: FlexWrap.Wrap }
    for i in 0 ... Count {
      root.Children.Add(Text{
        Key: "plain-text-$i", Content: "Goo", Width: 40, Height: 24, FontSize: 14,
      })
    }
    return root
  }
}

internal class TextStrokePaintFixtureCell : Cell {
  internal var Count int32
  internal var Width float64
  internal var Color Color
  internal var Styled bool
  internal var Entries bool
  internal var LetterSpacing float64

  override func Build() Blob {
    let root = Container{
      Width: 800,
      FlexDirection: FlexDirection.Row,
      FlexWrap: FlexWrap.Wrap,
      TextStrokeWidth: Styled ? Width : 0.0,
      TextStrokeColor: Styled ? Color : Color.Transparent,
    }
    for i in 0 ... Count {
      if Entries {
        root.Children.Add(TextEntry{
          Key: "stroke-entry-$i", Value: "Goo", Width: 80, Height: 24,
          FontSize: 14, LetterSpacing: LetterSpacing,
        })
      } else {
        root.Children.Add(Text{
          Key: "stroke-text-$i", Content: "Goo", Width: 40, Height: 24, FontSize: 14,
        })
      }
    }
    return root
  }
}

internal class VisibilityTraversalFixtureCell : Cell {
  internal var Count int32
  internal var Hidden bool

  override func Build() Blob {
    let barrier = Container{
      Key: "barrier",
      Position: PositionType.Absolute,
      Width: 100,
      Height: 100,
      HitTestSelf: false,
      Visibility: Hidden ? Visibility.Hidden : Visibility.Visible,
    }
    for i in 0 ... Count {
      barrier.Children.Add(Container{
        Key: "blocker-$i",
        Position: PositionType.Absolute,
        Width: 100,
        Height: 100,
        HitTestSelf: false,
        BackgroundColor: Color.Rgb(41, 41, 51),
      })
    }
    return Container{
      Width: 800,
      Height: 600,
      Children: {
        Button{
          Key: "underlay",
          Position: PositionType.Absolute,
          Width: 100,
          Height: 100,
          BackgroundColor: Color.Rgb(60, 130, 246),
        },
        barrier,
      },
    }
  }
}

internal class ClipPathHitFixtureCell : Cell {
  internal var Count int32
  internal var Clipped bool

  override func Build() Blob {
    let barrier = Container{
      Key: "barrier",
      Position: PositionType.Absolute,
      Width: 100,
      Height: 100,
      HitTestSelf: false,
    }
    let path = PathBuilder(0.0, 0.0, 1.0, 1.0)
      .MoveTo(0.0, 0.0).LineTo(0.5, 0.0).LineTo(0.5, 1.0).LineTo(0.0, 1.0)
      .Close().Build()
    for i in 0 ... Count {
      if Clipped {
        barrier.Children.Add(Container{
          Key: "clipped-$i", Position: PositionType.Absolute,
          Width: 100, Height: 100, HitTestSelf: false, ClipPath: path,
        })
      } else {
        barrier.Children.Add(Container{
          Key: "plain-$i", Position: PositionType.Absolute,
          Width: 100, Height: 100, HitTestSelf: false,
        })
      }
    }
    return Container{
      Width: 800,
      Height: 600,
      Children: {
        Button{
          Key: "underlay",
          Position: PositionType.Absolute,
          Width: 100,
          Height: 100,
          BackgroundColor: Color.Rgb(60, 130, 246),
        },
        barrier,
      },
    }
  }
}

internal class TransformPaintFixtureCell : Cell {
  internal var Count int32
  internal var Transformed bool

  override func Build() Blob {
    let root = Container{ Width: 800, FlexDirection: FlexDirection.Row, FlexWrap: FlexWrap.Wrap }
    for i in 0 ... Count {
      if Transformed {
        root.Children.Add(Container{
          Key: "transformed-$i", Width: 32, Height: 24, Margin: 4, BorderRadius: 6,
          BackgroundColor: Color.Rgb(41, 41, 51),
          Transform: PanelTransform{ TranslateX: 1, TranslateY: 1, Rotate: 3, Scale: 0.98 },
        })
      } else {
        root.Children.Add(Container{
          Key: "plain-$i", Width: 32, Height: 24, Margin: 4, BorderRadius: 6,
          BackgroundColor: Color.Rgb(41, 41, 51),
        })
      }
    }
    return root
  }
}

internal class TransformAncestorPaintFixtureCell : Cell {
  internal var Count int32
  internal var Transformed bool

  override func Build() Blob {
    let root = Transformed ? Container{
      Width: 800, FlexDirection: FlexDirection.Row, FlexWrap: FlexWrap.Wrap,
      Transform: PanelTransform{ TranslateX: 1, TranslateY: 1, Rotate: 3, Scale: 0.98 },
    } : Container{
      Width: 800, FlexDirection: FlexDirection.Row, FlexWrap: FlexWrap.Wrap,
    }
    for i in 0 ... Count {
      root.Children.Add(Container{
        Key: "box-$i", Width: 32, Height: 24, Margin: 4, BorderRadius: 6,
        BackgroundColor: Color.Rgb(41, 41, 51),
      })
    }
    return root
  }
}

internal class TransformHitFixtureCell : Cell {
  internal var Count int32
  internal var Transformed bool

  override func Build() Blob {
    let barrier = Container{
      Key: "barrier",
      Position: PositionType.Absolute,
      Width: 100,
      Height: 100,
      HitTestSelf: false,
    }
    for i in 0 ... Count {
      if Transformed {
        barrier.Children.Add(Container{
          Key: "transformed-$i",
          Position: PositionType.Absolute,
          Width: 100,
          Height: 100,
          HitTestSelf: false,
          Transform: PanelTransform{ TranslateX: 1, TranslateY: 1, Rotate: 3, Scale: 0.98 },
        })
      } else {
        barrier.Children.Add(Container{
          Key: "plain-$i",
          Position: PositionType.Absolute,
          Width: 100,
          Height: 100,
          HitTestSelf: false,
        })
      }
    }
    return Container{
      Width: 800,
      Height: 600,
      Children: {
        Button{
          Key: "underlay",
          Position: PositionType.Absolute,
          Width: 100,
          Height: 100,
          BackgroundColor: Color.Rgb(60, 130, 246),
        },
        barrier,
      },
    }
  }
}

internal class TransformStyleFixtureCell : Cell {
  internal var shifted State[bool]

  init() {
    shifted = Track(false)
  }

  func Flip() {
    shifted.Value = !shifted.Value
  }

  func Shifted() bool {
    return shifted.Value
  }

  override func Build() Blob {
    if shifted.Value {
      return Container{
        Width: 100,
        Height: 100,
        BackgroundColor: Color.Rgb(41, 41, 51),
        Transform: PanelTransform{ TranslateX: 12, TranslateY: 8, Rotate: 3, Scale: 0.98 },
      }
    }
    return Container{
      Width: 100,
      Height: 100,
      BackgroundColor: Color.Rgb(41, 41, 51),
    }
  }
}

internal class TransformMotionFixtureCell : Cell {
  internal var Motion Anim[float64]?

  override func Build() Blob {
    if Motion == nil {
      Motion = Animate(0.0)
    }
    let value = Motion!!.Value
    return Container{
      Width: 100,
      Height: 100,
      BackgroundColor: Color.Rgb(41, 41, 51),
      Transform: PanelTransform{ TranslateX: value, TranslateY: value * 0.5, Rotate: value, Scale: 0.98 },
    }
  }
}

internal class TransformPointerDispatchFixtureCell : Cell {
  internal var Depth int32
  internal var Transformed bool
  internal var MoveCount int32

  override func Build() Blob {
    var current Blob
    if Transformed {
      current = Container{
        Key: "leaf",
        Width: 100,
        Height: 100,
        Transform: PanelTransform{ TranslateX: 1 },
        TransformOriginX: Length.Percent(0),
        TransformOriginY: Length.Percent(0),
        OnPointerMove: (e PointerEvent) -> { MoveCount = MoveCount + 1 },
      }
    } else {
      current = Container{
        Key: "leaf",
        Width: 100,
        Height: 100,
        OnPointerMove: (e PointerEvent) -> { MoveCount = MoveCount + 1 },
      }
    }
    for i in 1 ... Depth {
      if Transformed {
        current = Container{
          Key: "node-$i",
          Width: 100,
          Height: 100,
          Transform: PanelTransform{ TranslateX: 1 },
          TransformOriginX: Length.Percent(0),
          TransformOriginY: Length.Percent(0),
          Children: { current },
        }
      } else {
        current = Container{
          Key: "node-$i",
          Width: 100,
          Height: 100,
          Children: { current },
        }
      }
    }
    return current
  }
}

internal class PointerBurstFixtureCell : Cell {
  internal var Capture bool
  internal var Transformed bool
  internal var MoveCount int32

  override func Build() Blob {
    return Container{
      Key: "target",
      Width: 100,
      Height: 100,
      Transform: Transformed ? PanelTransform{ TranslateX: 1 } : PanelTransform{},
      TransformOriginX: Length.Percent(0),
      TransformOriginY: Length.Percent(0),
      OnPointerDown: (e PointerEvent) -> {
        if Capture { e.Capture() }
      },
      OnPointerMove: (e PointerEvent) -> { MoveCount = MoveCount + 1 },
    }
  }
}

// Same three-blob shape as buildTree(), but the first line's text changes
// every frame so Diff does real content work, not a same-tree no-op.
internal class FrameFixtureCell : Cell {
  internal var tick State[int32]?

  init() {
    tick = Track[int32](0)
  }

  func Bump() {
    guard let s = tick else {
      return
    }
    s.Value = s.Value + 1
  }

  override func Build() Blob {
    var label = "Goo Desktop"
    if let s = tick {
      let n = s.Value
      label = "Goo Desktop $n"
    }
    return Container{
      Width: 420.0,
      Padding: 24.0,
      BackgroundColor: Color.Rgb(41, 41, 51),
      Children: {
        Text{ Content: label, FontSize: 28.0 },
        Text{ Content: "second line", FontSize: 14.0 },
      },
    }
  }
}

internal func countNodes(n Node) int32 {
  var count = 1
  for child in n.Children {
    count = count + countNodes(child)
  }
  return count
}

// A card list: each card is a Container with two Texts and a nested
// Container, so the tree has realistic depth and breadth, not one flat row.
internal class ScaleFixtureCell : Cell {
  internal var rows int32
  internal var tick State[int32]?

  init() {
    tick = Track[int32](0)
  }

  func Bump() {
    guard let s = tick else {
      return
    }
    s.Value = s.Value + 1
  }

  override func Build() Blob {
    var label = "row"
    if let s = tick {
      let n = s.Value
      label = "row $n"
    }
    let root = Container{ Width: 1280.0, Padding: 16.0, Gap: 8.0 }
    for i in 0 ... rows {
      let card = Container{ Padding: 12.0, Gap: 4.0, BorderRadius: 6.0 }
      card.Children.Add(Text{ Content: i == 0 ? label : "static title", FontSize: 18.0 })
      card.Children.Add(Text{ Content: "supporting copy", FontSize: 13.0 })
      let footer = Container{ Gap: 4.0 }
      footer.Children.Add(Text{ Content: "meta", FontSize: 11.0 })
      card.Children.Add(footer)
      root.Children.Add(card)
    }
    return root
  }
}

internal class ComponentizedScaleFixtureCell : Cell {
  internal var rows int32
  internal prop CallbackRows bool { get; init; }

  override func Build() Blob {
    let root = Container{ Width: 1280.0, Padding: 16.0, Gap: 8.0 }
    for i in 0 ... rows {
      root.Children.Add(Cell.Mount[ComponentizedScaleRowInput, ComponentizedScaleRowCell](
        "row-$i",
        ComponentizedScaleRowInput{ Index: i, HasCallback: CallbackRows }))
    }
    return root
  }
}

internal class UnhandledWheelFixtureCell : Cell {
  override func Build() Blob {
    return Container{ Width: 100, Height: 100 }
  }
}

internal data struct ComponentizedScaleRowInput {
  internal var Index int32
  internal var HasCallback bool
}

internal class ComponentizedScaleRowCell : Cell[ComponentizedScaleRowInput] {
  internal var tick State[int32]?

  init() {
    tick = Track[int32](0)
  }

  func Bump() {
    guard let s = tick else {
      return
    }
    s.Value = s.Value + 1
  }

  func Tick() int32 {
    guard let s = tick else { return -1 }
    return s.Value
  }

  override func Build() Blob {
    var label = "static title"
    if Input.Index == 0 {
      if let s = tick {
        label = "row ${s.Value}"
      }
    }
    let card = if Input.HasCallback {
      Container{ Padding: 12.0, Gap: 4.0, BorderRadius: 6.0, OnClick: () -> { Bump() } }
    } else {
      Container{ Padding: 12.0, Gap: 4.0, BorderRadius: 6.0 }
    }
    card.Children.Add(Text{ Content: label, FontSize: 18.0 })
    card.Children.Add(Text{ Content: "supporting copy", FontSize: 13.0 })
    let footer = Container{ Gap: 4.0 }
    footer.Children.Add(Text{ Content: "meta", FontSize: 11.0 })
    card.Children.Add(footer)
    return card
  }
}

internal class DeepScaleFixtureCell : Cell {
  internal var depth int32
  internal var tick State[int32]?

  init() {
    tick = Track[int32](0)
  }

  func Bump() {
    guard let s = tick else {
      return
    }
    s.Value = s.Value + 1
  }

  private func buildChain(remaining int32, label string) Blob {
    if remaining <= 0 {
      return Text{ Content: label, FontSize: 13.0 }
    }
    let wrap = Container{ Padding: 1.0 }
    wrap.Children.Add(buildChain(remaining - 1, label))
    return wrap
  }

  override func Build() Blob {
    var label = "leaf"
    if let s = tick {
      let n = s.Value
      label = "leaf $n"
    }
    return buildChain(depth, label)
  }
}

// One card's worth of state, mounted many times by FixtureCardListCell.
internal class FixtureCardCell : Cell {
  internal var title State[string]
  internal var body State[string]
  internal var stamp State[int32]

  init() {
    title = Track("")
    body = Track("")
    stamp = Track(0)
  }

  override func Build() Blob {
    return Container{
      Width: 300.0, Height: 80.0,
      BackgroundColor: stamp.Value % 2 == 0 ? Color.Rgb(255, 0, 0) : Color.Rgb(0, 0, 255),
      Children: {
        Text{ Content: title.Value },
        Text{ Content: body.Value },
      },
    }
  }
}

internal class FixtureIntrinsicTextCardCell : Cell {
  internal var title State[string]
  internal var body State[string]
  internal var stamp State[int32]

  init() {
    title = Track("")
    body = Track("")
    stamp = Track(0)
  }

  override func Build() Blob {
    return Container{ Children: {
      Text{ Content: title.Value },
      Text{ Content: body.Value },
      Container{ Children: { Text{ Content: "${stamp.Value}" } } },
    } }
  }
}

// A card list where every card is a nested Cell, so a leaf's state write
// dirties only that card's fiber, not the list's.
internal class FixtureCardListCell : Cell {
  prop Count int32 { get; set; }

  override func Build() Blob {
    let kids = List[Blob]()
    for i in 0 ... Count {
      kids.Add(Cell.Mount[FixtureCardCell]("card-$i", (c FixtureCardCell) -> {
        c.title.Value = "Card"
        c.body.Value = "body"
      }))
    }
    return Container{ Children: kids }
  }
}

internal class FixtureIntrinsicTextCardListCell : Cell {
  prop Count int32 { get; set; }

  override func Build() Blob {
    let kids = List[Blob]()
    for i in 0 ... Count {
      kids.Add(Cell.Mount[FixtureIntrinsicTextCardCell]("card-$i", (c FixtureIntrinsicTextCardCell) -> {
        c.title.Value = "Card"
        c.body.Value = "body"
      }))
    }
    return Container{ Children: kids }
  }
}

// Row of two 100x100 columns; only the left carries Hover styles — for the
// per-flip allocation fixture (root spans both, so it never itself flips).
internal class HoverFlipFixtureCell : Cell {
  override func Build() Blob {
    return Container{
      Width: 200.0, Height: 200.0, FlexDirection: FlexDirection.Row, Cursor: Cursor.Move,
      Children: {
        Container{ Width: 100.0, Height: 200.0, Hover: Style{ Opacity: 0.5, Cursor: Cursor.Text } },
        Container{ Width: 100.0, Height: 200.0 },
      },
    }
  }
}

internal class PinnedScrollFixtureCell : Cell {
  override func Build() Blob {
    return Container{
      Width: 100.0, Height: 100.0, Overflow: Overflow.Scroll, PinToBottom: true,
      Children: { Container{ Height: 300.0 } },
    }
  }
}

internal class MotionTickFixtureCell : Cell {
  internal var anim Anim[float64]?

  override func Build() Blob {
    if anim == nil {
      anim = Animate(0.0)
    }
    return Container{}
  }
}

internal class MotionBenchmarkCell : Cell {
}

// Never reports Done, so a steady tick keeps re-simulating instead of
// settling partway through the measured loop.
internal class ForeverMotionSimulation : Simulation {
  public override func Position(elapsed float64) float64 {
    return elapsed
  }

  public override func Velocity(elapsed float64) float64 {
    return 1.0
  }

  public override func Done(elapsed float64) bool {
    return false
  }
}

internal func foreverMotionSpec(from float64, to float64, velocity float64) Simulation {
  return ForeverMotionSimulation()
}

internal class ActiveMotionSimulation : Simulation {
  public override func Position(elapsed float64) float64 {
    return 0.25 + elapsed * 0.0001
  }

  public override func Velocity(elapsed float64) float64 {
    return 0.0001
  }

  public override func Done(elapsed float64) bool {
    return false
  }
}

internal func activeMotionSpec(from float64, to float64, velocity float64) Simulation {
  return ActiveMotionSimulation()
}

internal class DoneMotionSimulation : Simulation {
  public override func Position(elapsed float64) float64 {
    return elapsed
  }

  public override func Velocity(elapsed float64) float64 {
    return 0.0
  }

  public override func Done(elapsed float64) bool {
    return true
  }
}

internal func doneMotionSpec(from float64, to float64, velocity float64) Simulation {
  return DoneMotionSimulation()
}

internal class EntryHarness : Cell {
  internal var value State[string]
  internal var writeBack bool
  internal var changed string
  internal var submitted string

  init() {
    value = Track("")
    changed = ""
    submitted = ""
  }

  override func Build() Blob {
    return Container{
      Width: 300.0,
      Height: 100.0,
      Children: {
        TextEntry{
          Key: "entry",
          Value: value.Value,
          Placeholder: "hint",
          Width: 200.0,
          Height: 30.0,
          FontSize: 16.0,
          LineHeight: 1.5,
          Color: Color.White,
          OnChange: (s string) -> {
            changed = s
            if writeBack { value.Value = s }
          },
          OnSubmit: (s string) -> { submitted = s },
        },
      },
    }
  }
}
