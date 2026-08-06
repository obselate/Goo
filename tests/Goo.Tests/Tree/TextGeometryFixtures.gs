package Goo

import System

internal class TextGeometryFixtures {
  internal init() {
    queryDestination = []ElementRect{}
  }

  func StaticTextUsesRetainedWrappedBidiAndTransformedGeometry() bool {
    let owner = Window{}
    let handle = ElementHandle{}
    let rec = Reconciler{ Res: Resolver{} }
    let root = mount(rec, owner, Container{ Width: 96, Height: 100, Children: {
      Text{ Handle: handle, Width: 72, Height: 80, FontSize: 14,
        Content: "a\u00df b \u05e9\u05dc\u05d5\u05dd wrap wrap", TextTransform: TextTransform.Uppercase },
    } })
    Layout().Calculate(root, 96.0F, 100.0F)
    let text = root.Children[0]
    var position TextPosition
    let uncached = !handle.TryGetTextPositionAt(Point{}, TextCoordinateSpace.Element, out position)
      && text.TextLayout == nil
    let layout = TextLayouts.For(text, TextLayouts.ContentWidth(text))
    let hit = handle.TryGetTextPositionAt(Point{ X: 3, Y: 3 }, TextCoordinateSpace.Content,
      out position)
    var caret ElementRect
    let hasCaret = handle.TryGetTextCaretRect(position, TextCoordinateSpace.Content, out caret)
    var transformedCaret ElementRect
    let transformedOffset = handle.TryGetTextCaretRect(TextPosition{ Offset: 2,
      Affinity: TextAffinity.Downstream }, TextCoordinateSpace.Content, out transformedCaret)
    let values = [16]ElementRect
    var destination = values.AsSpan()
    var required int32
    let ranges = handle.TryCopyTextRangeRects(TextRange{ Start: 0, Length: text.Content.Length },
      TextCoordinateSpace.Content, destination, out required)
    TextLayouts.DisposeTree(root)
    return uncached && hit && hasCaret && caret.Height > 0.0 && transformedOffset
      && transformedCaret.Height > 0.0
      && ranges && required >= 2 && values[0].Y != values[1].Y && !handle.IsMounted
  }

  func ElidedTextAndWindowTransformUseVisibleGeometry() bool {
    let owner = Window{}
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner, Container{
      Width: 120, Height: 40, Transform: PanelTransform{ TranslateX: 20 },
      TransformOriginX: Length.Percent(0), TransformOriginY: Length.Percent(0), Children: {
        Text{ Handle: handle, Width: 40, Height: 24, FontSize: 14, TextWrap: TextWrap.NoWrap,
          TextTrimming: TextTrimming.Ellipsis, Content: "elided text geometry" },
      },
    })
    Layout().Calculate(root, 120.0F, 40.0F)
    let text = root.Children[0]
    let layout = TextLayouts.For(text, TextLayouts.ContentWidth(text))
    guard let geometry = TextLayoutGeometries.Get(layout) else { return false }
    let geometryLine = geometry.Lines[0]
    guard let shape = layout.Lines[0].Shape else { return false }
    var position TextPosition
    var elementCaret ElementRect
    var windowCaret ElementRect
    let ellipse = TransformGeometry.NodeToWindow(text, text.Rect.X + shape.Width - 0.1F,
      text.Rect.Y + 3.0F)
    let hit = ellipse.Valid && handle.TryGetTextPositionAt(Point{ X: ellipse.X, Y: ellipse.Y },
      TextCoordinateSpace.Window,
      out position)
    let element = handle.TryGetTextCaretRect(position, TextCoordinateSpace.Element, out elementCaret)
    let window = handle.TryGetTextCaretRect(position, TextCoordinateSpace.Window, out windowCaret)
    let values = [4]ElementRect
    var destination = values.AsSpan()
    var required int32
    let ranges = handle.TryCopyTextRangeRects(TextRange{ Start: 0, Length: geometryLine.VisibleEnd },
      TextCoordinateSpace.Window, destination, out required)
    var hidden ElementRect
    let hiddenRejected = !handle.TryGetTextCaretRect(TextPosition{ Offset: text.Content.Length,
      Affinity: TextAffinity.Downstream }, TextCoordinateSpace.Element, out hidden)
    TextLayouts.DisposeTree(root)
    return hit && position.Offset == geometryLine.VisibleEnd && position.Affinity == TextAffinity.Upstream
      && element && window && windowCaret.X >= elementCaret.X + 19.0 && ranges && required >= 1
      && hiddenRejected
  }

  func EntryUsesVisibleAndContentScrollCoordinates() bool {
    let owner = Window{}
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner,
      TextEntry{ Handle: handle, Width: 60, Height: 28, FontSize: 14, Value: "long entry value" })
    Layout().Calculate(root, 60.0F, 28.0F)
    let entry = root
    TextMetrics().BufferShape(entry)
    entry.EditScrollX = 8.0F
    var visible TextPosition
    var content TextPosition
    let visibleHit = handle.TryGetTextPositionAt(Point{ X: 2, Y: 4 }, TextCoordinateSpace.Element,
      out visible)
    let contentHit = handle.TryGetTextPositionAt(Point{ X: 10, Y: 4 }, TextCoordinateSpace.Content,
      out content)
    var visibleCaret ElementRect
    var contentCaret ElementRect
    let visibleRect = handle.TryGetTextCaretRect(visible, TextCoordinateSpace.Element, out visibleCaret)
    let contentRect = handle.TryGetTextCaretRect(visible, TextCoordinateSpace.Content, out contentCaret)
    TextLayouts.DisposeTree(root)
    return visibleHit && contentHit && visible.Offset == content.Offset && visibleRect && contentRect
      && contentCaret.X >= visibleCaret.X + 7.0
  }

  func EditorUsesStyledProjectedAndVirtualizedGeometry() bool {
    let owner = Window{}
    let handle = ElementHandle{}
    let first = "start \u05d0\u05d1\u05d2\u05d3\u05d4 wraps several words for geometry"
    let prefix = first + "\nline one\nline two\nline three\nline four\n"
    let replacement = "source replacement item wraps too"
    let document = TextDocument(prefix + replacement + "\nline six\nline seven\nline eight\nline nine")
    let replacementStart = prefix.Length
    let controller = TextEditorController(document)
    let layer = TextPresentationLayer(document)
    layer.SetStyle("style", TextRange{ Start: 6, Length: 5 }, Style{ FontSize: 22 })
    layer.SetReplacement("projection", TextRange{ Start: replacementStart, Length: 6 }, "PROJECTED")
    let root = mount(Reconciler{ Res: Resolver{} }, owner,
      TextEditor(document, controller){ Layers = []TextPresentationLayer{ layer }, Handle = handle,
        Width = 110, Height = 28, FontSize = 14, OverscanLines = 0 })
    Layout().Calculate(root, 110.0F, 28.0F)
    let initial = TextEditorLayouts.For(root, TextLayouts.ContentWidth(root), TextLayouts.ContentHeight(root))
    var hit TextPosition
    let hasHit = handle.TryGetTextPositionAt(Point{ X: 5, Y: 5 }, TextCoordinateSpace.Content, out hit)
    var caret ElementRect
    let hasCaret = handle.TryGetTextCaretRect(hit, TextCoordinateSpace.Content, out caret)
    let values = [128]ElementRect
    var destination = values.AsSpan()
    var required int32
    let styled = handle.TryCopyTextRangeRects(TextRange{ Start: 6, Length: 5 },
      TextCoordinateSpace.Content, destination, out required)
    TextEditorLayouts.FollowCaret(root, TextPosition{ Offset: replacementStart,
      Affinity: TextAffinity.Downstream })
    let scrolled = TextEditorLayouts.For(root, TextLayouts.ContentWidth(root), TextLayouts.ContentHeight(root))
    var projectedLine TextEditorVisualLine? = nil
    for line in scrolled.Lines {
      if replacementStart >= line.SourceStart && replacementStart <= line.SourceEnd {
        projectedLine = line
        break
      }
    }
    guard let projected = projectedLine else { return false }
    var projectedHit TextPosition
    let projectedPoint = Point{ X: 5, Y: float64(projected.Top + 2.0F) }
    let hitProjected = handle.TryGetTextPositionAt(projectedPoint, TextCoordinateSpace.Content,
      out projectedHit)
    var projectedCaret ElementRect
    let caretProjected = handle.TryGetTextCaretRect(TextPosition{ Offset: replacementStart,
      Affinity: TextAffinity.Downstream }, TextCoordinateSpace.Content, out projectedCaret)
    var projectedRequired int32
    let rangeProjected = handle.TryCopyTextRangeRects(TextRange{ Start: replacementStart, Length: 6 },
      TextCoordinateSpace.Content, destination, out projectedRequired)
    var allRequired int32
    let allRetained = handle.TryCopyTextRangeRects(TextRange{ Start: 0, Length: document.Length },
      TextCoordinateSpace.Content, destination, out allRequired)
    let visibleStart = scrolled.Lines[0].SourceStart
    let visibleEnd = scrolled.Lines[scrolled.Lines.Count - 1].SourceEnd
    var visibleRequired int32
    let visibleRetained = handle.TryCopyTextRangeRects(TextRange{ Start: visibleStart,
      Length: visibleEnd - visibleStart }, TextCoordinateSpace.Content, destination, out visibleRequired)
    var offscreen ElementRect
    let offscreenRejected = !handle.TryGetTextCaretRect(TextPosition{ Offset: document.Length,
      Affinity: TextAffinity.Downstream }, TextCoordinateSpace.Content, out offscreen)
    TextLayouts.DisposeTree(root)
    return initial.Lines.Count > 0 && hasHit && hasCaret && caret.Height > 0.0 && styled && required >= 1
      && hitProjected && projectedHit.Offset >= replacementStart && projectedHit.Offset <= replacementStart + 6
      && caretProjected && projectedCaret.Height > 0.0 && rangeProjected && projectedRequired >= 1
      && scrolled.Lines.Count < scrolled.DocumentLineCount && allRetained && visibleRetained
      && allRequired == visibleRequired && offscreenRejected
  }

  func EmptyDestinationAndInvalidArgumentsContract() bool {
    let owner = Window{}
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner,
      Text{ Handle: handle, Width: 96, Height: 40, FontSize: 14, Content: "range geometry" })
    Layout().Calculate(root, 96.0F, 40.0F)
    TextLayouts.For(root, TextLayouts.ContentWidth(root))
    let values = [16]ElementRect
    let full = values.AsSpan()
    let empty = values.AsSpan().Slice(0, 0)
    var fullRequired int32
    var emptyRequired int32
    let fullResult = handle.TryCopyTextRangeRects(TextRange{ Start: 0, Length: 5 },
      TextCoordinateSpace.Element, full, out fullRequired)
    let emptyResult = handle.TryCopyTextRangeRects(TextRange{ Start: 0, Length: 5 },
      TextCoordinateSpace.Element, empty, out emptyRequired)
    var position = TextPosition{ Offset: 11, Affinity: TextAffinity.Downstream }
    var rect = ElementRect{ X: 11.0, Y: 12.0, Width: 13.0, Height: 14.0 }
    var required int32 = 11
    let invalid = !handle.TryGetTextPositionAt(Point{}, TextCoordinateSpace(99), out position)
      && !handle.TryGetTextCaretRect(TextPosition{ Offset: 0, Affinity: TextAffinity(99) },
        TextCoordinateSpace.Element, out rect)
      && !handle.TryCopyTextRangeRects(TextRange{ Start: Int32.MaxValue, Length: 1 },
        TextCoordinateSpace.Element, full, out required)
    TextLayouts.DisposeTree(root)
    return fullResult && emptyResult && fullRequired == emptyRequired && fullRequired > 0
      && invalid && position.Offset == 0 && rect.Width == 0.0 && required == 0
  }

  func CrLfCaretOffsetsUseRetainedStaticGeometry() bool {
    let owner = Window{}
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner,
      Text{ Handle: handle, Width: 80, Height: 40, FontSize: 14, Content: "a\r\nb" })
    Layout().Calculate(root, 80.0F, 40.0F)
    TextLayouts.For(root, TextLayouts.ContentWidth(root))
    var beforeBreak ElementRect
    var betweenCrLf ElementRect
    var nextLine ElementRect
    let before = handle.TryGetTextCaretRect(TextPosition{ Offset: 1,
      Affinity: TextAffinity.Downstream }, TextCoordinateSpace.Element, out beforeBreak)
    let between = handle.TryGetTextCaretRect(TextPosition{ Offset: 2,
      Affinity: TextAffinity.Downstream }, TextCoordinateSpace.Element, out betweenCrLf)
    let next = handle.TryGetTextCaretRect(TextPosition{ Offset: 3,
      Affinity: TextAffinity.Downstream }, TextCoordinateSpace.Element, out nextLine)
    TextLayouts.DisposeTree(root)
    return before && between && next && betweenCrLf.Y == beforeBreak.Y
      && nextLine.Y > beforeBreak.Y
  }

  func FailedWindowRangeZeroesRequired() bool {
    let owner = Window{}
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner, Container{
      Width: 48, Height: 48, Transform: PanelTransform{ ScaleX: 1.0e37 },
      TransformOriginX: Length.Percent(0), TransformOriginY: Length.Percent(0), Children: {
        Text{ Handle: handle, Width: 48, Height: 40, FontSize: 14, TextWrap: TextWrap.NoWrap,
          Content: "a\nlonger" },
      },
    })
    Layout().Calculate(root, 48.0F, 48.0F)
    let text = root.Children[0]
    TextLayouts.For(text, TextLayouts.ContentWidth(text))
    let values = [4]ElementRect
    var destination = values.AsSpan()
    var firstCaret ElementRect
    let first = handle.TryGetTextCaretRect(TextPosition{ Offset: 0,
      Affinity: TextAffinity.Downstream }, TextCoordinateSpace.Window, out firstCaret)
    var required int32 = 99
    let result = handle.TryCopyTextRangeRects(TextRange{ Start: 0, Length: text.Content.Length },
      TextCoordinateSpace.Window, destination, out required)
    TextLayouts.DisposeTree(root)
    return first && !result && required == 0
  }

  func ReattachDropsStaticGeometryUntilNormalLayout() bool {
    let owner = Window{}
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner,
      Text{ Handle: handle, Width: 96, Height: 40, Content: "reattach geometry" })
    Layout().Calculate(root, 96.0F, 40.0F)
    let first = TextLayouts.For(root, TextLayouts.ContentWidth(root))
    if TextLayoutGeometries.Get(first) == nil { return false }
    ElementHandles.Detach(root)
    if TextLayoutGeometries.Get(first) != nil || handle.IsMounted { return false }
    ElementHandles.PushOwner(owner)
    try { ElementHandles.Bind(root, handle) }
    finally { ElementHandles.PopOwner() }
    var position TextPosition
    let needsLayout = !handle.TryGetTextPositionAt(Point{}, TextCoordinateSpace.Element, out position)
      && root.TextLayout == nil
    let second = TextLayouts.For(root, TextLayouts.ContentWidth(root))
    let rebuilt = TextLayoutGeometries.Get(second) != nil
      && handle.TryGetTextPositionAt(Point{}, TextCoordinateSpace.Element, out position)
    TextLayouts.DisposeTree(root)
    return needsLayout && rebuilt
  }

  func LateAttachEntryAndEditorPrepareGeometry() bool {
    let owner = Window{}
    let entryHandle = ElementHandle{}
    let entry = mount(Reconciler{ Res: Resolver{} }, owner,
      TextEntry{ Width: 120, Height: 28, FontSize: 14, Value: "late entry geometry" })
    Layout().Calculate(entry, 120.0F, 28.0F)
    TextMetrics().BufferShape(entry)
    ElementHandles.PushOwner(owner)
    try { ElementHandles.Bind(entry, entryHandle) }
    finally { ElementHandles.PopOwner() }
    if !entryHandle.IsMounted { return false }
    var entryRect ElementRect
    let entryBefore = GC.GetAllocatedBytesForCurrentThread()
    let entryResult = entryHandle.TryGetTextCaretRect(TextPosition{ Offset: 3,
      Affinity: TextAffinity.Downstream }, TextCoordinateSpace.Element, out entryRect)
    let entryBytes = GC.GetAllocatedBytesForCurrentThread() - entryBefore
    TextLayouts.DisposeTree(entry)

    let document = TextDocument("late editor geometry\nsecond line")
    let controller = TextEditorController(document)
    let editorHandle = ElementHandle{}
    let editor = mount(Reconciler{ Res: Resolver{} }, owner,
      TextEditor(document, controller){ Width = 120, Height = 28, FontSize = 14,
        OverscanLines = 0 })
    Layout().Calculate(editor, 120.0F, 28.0F)
    TextEditorLayouts.For(editor, TextLayouts.ContentWidth(editor), TextLayouts.ContentHeight(editor))
    ElementHandles.PushOwner(owner)
    try { ElementHandles.Bind(editor, editorHandle) }
    finally { ElementHandles.PopOwner() }
    if !editorHandle.IsMounted { return false }
    let editorPosition = TextPosition{ Offset: 3, Affinity: TextAffinity.Downstream }
    var editorRect ElementRect
    let editorBefore = GC.GetAllocatedBytesForCurrentThread()
    let editorResult = editorHandle.TryGetTextCaretRect(editorPosition,
      TextCoordinateSpace.Element, out editorRect)
    let editorBytes = GC.GetAllocatedBytesForCurrentThread() - editorBefore
    TextLayouts.DisposeTree(editor)
    return entryResult && editorResult && entryBytes == 0 && editorBytes == 0
  }

  func TransformedScrolledAncestorUsesWindowSpace() bool {
    let owner = Window{}
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner, Container{
      Width: 80, Height: 36, OverflowX: Overflow.Scroll,
      Transform: PanelTransform{ TranslateX: 20 }, TransformOriginX: Length.Percent(0),
      TransformOriginY: Length.Percent(0), Children: {
        Text{ Handle: handle, Width: 180, Height: 30, FontSize: 14, Content: "scrolled ancestor geometry" },
      },
    })
    let layout = Layout()
    layout.Calculate(root, 80.0F, 36.0F)
    root.ScrollX = 12.0F
    layout.RefreshRects(root)
    let text = root.Children[0]
    TextLayouts.For(text, TextLayouts.ContentWidth(text))
    var elementRect ElementRect
    let element = handle.TryGetTextCaretRect(TextPosition{ Offset: 3,
      Affinity: TextAffinity.Downstream }, TextCoordinateSpace.Element, out elementRect)
    let expected = TransformGeometry.NodeToWindow(text, text.Rect.X + float32(elementRect.X),
      text.Rect.Y + float32(elementRect.Y))
    var windowRect ElementRect
    let window = handle.TryGetTextCaretRect(TextPosition{ Offset: 3,
      Affinity: TextAffinity.Downstream }, TextCoordinateSpace.Window, out windowRect)
    TextLayouts.DisposeTree(root)
    return element && window && expected.Valid && Math.Abs(windowRect.X - float64(expected.X)) < 0.01
      && windowRect.X < elementRect.X + 20.0
  }

  private var queryRoot Node?
  private var queryHandle ElementHandle?
  private var queryDestination []ElementRect

  func PrepareWarmStaticGeometryQueries() int32 {
    let owner = Window{}
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner,
      Text{ Handle: handle, Width: 160, Height: 40, FontSize: 14, Content: "warm geometry query" })
    Layout().Calculate(root, 160.0F, 40.0F)
    TextLayouts.For(root, TextLayouts.ContentWidth(root))
    queryRoot = root
    queryHandle = handle
    queryDestination = [16]ElementRect
    return 1
  }

  func WarmStaticGeometryPoint() int32 {
    guard let handle = queryHandle else { return -1 }
    var position TextPosition
    return handle.TryGetTextPositionAt(Point{ X: 4, Y: 4 }, TextCoordinateSpace.Element,
      out position) ? position.Offset : -1
  }

  func WarmStaticGeometryCaret() int32 {
    guard let handle = queryHandle else { return -1 }
    var rect ElementRect
    return handle.TryGetTextCaretRect(TextPosition{ Offset: 4, Affinity: TextAffinity.Downstream },
      TextCoordinateSpace.Element, out rect) ? int32(rect.Width) : -1
  }

  func WarmStaticGeometryRange() int32 {
    guard let handle = queryHandle else { return -1 }
    var required int32
    let destination = queryDestination.AsSpan()
    return handle.TryCopyTextRangeRects(TextRange{ Start: 0, Length: 8 },
      TextCoordinateSpace.Element, destination, out required) ? required : -1
  }

  func PrepareCachedStaticGeometryQuery() int32 {
    let owner = Window{}
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner,
      Text{ Handle: handle, Width: 160, Height: 40, FontSize: 14, Content: "cached geometry query" })
    Layout().Calculate(root, 160.0F, 40.0F)
    TextLayouts.For(root, TextLayouts.ContentWidth(root))
    TextLayouts.For(root, 80.0F)
    queryRoot = root
    queryHandle = handle
    queryDestination = [16]ElementRect
    return 1
  }

  func WarmCachedStaticGeometryCaret() int32 {
    guard let handle = queryHandle else { return -1 }
    var rect ElementRect
    return handle.TryGetTextCaretRect(TextPosition{ Offset: 4, Affinity: TextAffinity.Downstream },
      TextCoordinateSpace.Element, out rect) ? int32(rect.Width) : -1
  }

  func PrepareWarmEntryGeometryRange() int32 {
    let owner = Window{}
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner,
      TextEntry{ Handle: handle, Width: 160, Height: 28, FontSize: 14,
        Value: "warm entry geometry" })
    Layout().Calculate(root, 160.0F, 28.0F)
    TextMetrics().BufferShape(root)
    queryRoot = root
    queryHandle = handle
    queryDestination = [16]ElementRect
    return 1
  }

  func WarmEntryGeometryRange() int32 {
    guard let handle = queryHandle else { return -1 }
    var required int32
    let destination = queryDestination.AsSpan()
    return handle.TryCopyTextRangeRects(TextRange{ Start: 0, Length: 8 },
      TextCoordinateSpace.Element, destination, out required) ? required : -1
  }

  func PrepareWarmProjectedEditorGeometryQueries() int32 {
    let owner = Window{}
    let document = TextDocument("warm source replacement geometry")
    let controller = TextEditorController(document)
    let layer = TextPresentationLayer(document)
    layer.SetStyle("style", TextRange{ Start: 5, Length: 6 }, Style{ FontSize: 18 })
    layer.SetReplacement("projection", TextRange{ Start: 12, Length: 6 }, "PROJECTED")
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner,
      TextEditor(document, controller){ Layers = []TextPresentationLayer{ layer }, Handle = handle,
        Width = 180, Height = 32, FontSize = 14, OverscanLines = 0 })
    Layout().Calculate(root, 180.0F, 32.0F)
    TextEditorLayouts.For(root, TextLayouts.ContentWidth(root), TextLayouts.ContentHeight(root))
    queryRoot = root
    queryHandle = handle
    queryDestination = [16]ElementRect
    return 1
  }

  func WarmProjectedEditorGeometryPoint() int32 {
    guard let handle = queryHandle else { return -1 }
    var position TextPosition
    return handle.TryGetTextPositionAt(Point{ X: 4, Y: 4 }, TextCoordinateSpace.Element,
      out position) ? position.Offset : -1
  }

  func WarmProjectedEditorGeometryRange() int32 {
    guard let handle = queryHandle else { return -1 }
    var required int32
    let destination = queryDestination.AsSpan()
    return handle.TryCopyTextRangeRects(TextRange{ Start: 12, Length: 6 },
      TextCoordinateSpace.Element, destination, out required) ? required : -1
  }

  func StaticGeometryLayoutAllocationBytes(handled bool) int64 {
    let owner = Window{}
    let root = if handled {
      mount(Reconciler{ Res: Resolver{} }, owner,
        Text{ Handle: ElementHandle{}, Width: 180, Height: 40, FontSize: 14,
          Content: "handled static geometry allocation" })
    } else {
      mount(Reconciler{ Res: Resolver{} }, owner,
        Text{ Width: 180, Height: 40, FontSize: 14, Content: "handled static geometry allocation" })
    }
    Layout().Calculate(root, 180.0F, 40.0F)
    TextLayouts.Invalidate(root)
    let before = GC.GetAllocatedBytesForCurrentThread()
    TextLayouts.For(root, TextLayouts.ContentWidth(root))
    let bytes = GC.GetAllocatedBytesForCurrentThread() - before
    TextLayouts.DisposeTree(root)
    return bytes
  }

  func UnsupportedAndStaleHandlesReturnFalse() bool {
    let owner = Window{}
    let handle = ElementHandle{}
    let root = mount(Reconciler{ Res: Resolver{} }, owner, Container{ Handle: handle, Width: 10, Height: 10 })
    var position TextPosition
    var rect ElementRect
    let values = [1]ElementRect
    var destination = values.AsSpan()
    var required int32
    let unsupported = !handle.TryGetTextPositionAt(Point{}, TextCoordinateSpace.Element, out position)
      && !handle.TryGetTextCaretRect(TextPosition{}, TextCoordinateSpace.Element, out rect)
      && !handle.TryCopyTextRangeRects(TextRange{}, TextCoordinateSpace.Element, destination, out required)
      && required == 0
    TextLayouts.DisposeTree(root)
    let stale = !handle.TryGetTextPositionAt(Point{}, TextCoordinateSpace.Element, out position)
      && !handle.TryGetTextCaretRect(TextPosition{}, TextCoordinateSpace.Element, out rect)
      && !handle.TryCopyTextRangeRects(TextRange{}, TextCoordinateSpace.Element, destination, out required)
      && required == 0
    return unsupported && stale
  }

  private func mount(rec Reconciler, owner Window, blob Blob) Node {
    ElementHandles.PushOwner(owner)
    try { return rec.Mount(blob) }
    finally { ElementHandles.PopOwner() }
  }
}
