package Goo

import System
import SkiaSharp

internal class TreeFixtures {
  func KeyedReconciliationContract() bool {
    TreeKeyedCell.DisposedA = 0
    let parent = TreeKeyedParent{}
    let window = Window{ Root: parent, Width: 200, Height: 100 }
    window.UpdateTree()
    guard let first = window.Tree else { return false }
    guard let a = first.Children[0].Fiber else { return false }
    guard let b = first.Children[1].Fiber else { return false }
    if !(a is TreeKeyedCell) || !(b is TreeKeyedCell) { return false }
    a.Value.Value = "A"
    b.Value.Value = "B"
    window.UpdateTree()

    parent.Mode.Value = 1
    window.UpdateTree()
    guard let reordered = window.Tree else { return false }
    if reordered.Children.Count != 2 || reordered.Children[0].Content != "b:B" || reordered.Children[1].Content != "a:A" {
      return false
    }

    parent.Mode.Value = 2
    window.UpdateTree()
    guard let inserted = window.Tree else { return false }
    if inserted.Children.Count != 3 || inserted.Children[0].Content != "b:B"
      || inserted.Children[1].Content != "c:initial" || inserted.Children[2].Content != "a:A" {
      return false
    }

    parent.Mode.Value = 3
    window.UpdateTree()
    guard let removed = window.Tree else { return false }
    if removed.Children.Count != 2 || removed.Children[0].Content != "b:B" || removed.Children[1].Content != "a:A" {
      return false
    }

    parent.Mode.Value = 4
    window.UpdateTree()
    guard let replaced = window.Tree else { return false }
    if replaced.Children.Count != 2 || replaced.Children[0].Content != "b:B"
      || replaced.Children[1].Content != "replacement" || TreeKeyedCell.DisposedA != 1 {
      return false
    }
    a.Value.Value = "stale"
    window.UpdateTree()
    guard let afterStaleUpdate = window.Tree else { return false }
    if afterStaleUpdate.Children.Count != 2 || afterStaleUpdate.Children[0].Content != "b:B"
      || afterStaleUpdate.Children[1].Content != "replacement" || TreeKeyedCell.DisposedA != 1 {
      return false
    }
    return freshSubtreeOnCellReplacement()
  }

  internal func freshSubtreeOnCellReplacement() bool {
    let rec = Reconciler{ Res: Resolver{} }
    let root = rec.Mount(Container{ Children: {
      Cell.Mount[TreeContainerCell]("slot", nil),
    } })
    let entry = root.Children[0].Children[0]
    entry.Focused = true
    entry.Buffer = "typed"
    rec.Diff(root, Container{ Children: {
      Container{ Key: "slot", Children: {
        TextEntry{ Key: "entry", Value: "new" },
      } },
    } })
    let replacement = root.Children[0].Children[0]
    return !replacement.Focused && replacement.Buffer == "new"
  }

  func PositionalReconciliationContract() bool {
    let parent = TreePositionalParent{}
    let window = Window{ Root: parent, Width: 200, Height: 100 }
    window.UpdateTree()
    guard let first = window.Tree else { return false }
    guard let child = first.Children[1].Fiber else { return false }
    if !(child is TreePositionalCell) { return false }
    child.Value.Value = "kept"
    window.UpdateTree()
    parent.Label.Value = "after"
    window.UpdateTree()
    guard let after = window.Tree else { return false }
    return after.Children.Count == 3 && after.Children[0].Content == "after"
      && after.Children[1].Content == "slot:kept" && after.Children[2].Content == "tail"
  }

  func OutputAndKindReplacementContract() bool {
    let rec = Reconciler{ Res: Resolver{} }
    let node = rec.Mount(Container{ Children: { Text{ Content: "original" } } })
    rec.Diff(node, Container{ Children: { Text{ Content: "changed" } } })
    if node.Children[0].Content != "changed" { return false }
    rec.Diff(node, Container{ Children: { Container{ Children: { Text{ Content: "nested" } } } } })
    let container = node.Children[0]
    if container.Children.Count != 1 || container.Children[0].Content != "nested" {
      return false
    }
    rec.Diff(node, Container{ Children: { Text{ Content: "replaced" } } })
    let replacement = node.Children[0]
    return replacement.Content == "replaced" && replacement.Children.Count == 0
  }

  func RejectsInvalidChildList(scenario string) bool {
    try {
      let rec = Reconciler{ Res: Resolver{} }
      switch scenario {
        case "mount-mixed" {
          rec.Mount(Container{ Children: { Text{ Key: "keyed", Content: "x" }, Text{ Content: "plain" } } })
        }
        case "diff-mixed" {
          let node = rec.Mount(Container{ Children: { Text{ Key: "keyed", Content: "x" } } })
          rec.Diff(node, Container{ Children: { Text{ Key: "keyed", Content: "x" }, Text{ Content: "plain" } } })
        }
        case "mount-duplicate" {
          rec.Mount(Container{ Children: { Text{ Key: "same", Content: "a" }, Text{ Key: "same", Content: "b" } } })
        }
        case "diff-duplicate" {
          let node = rec.Mount(Container{ Children: { Text{ Key: "a", Content: "a" } } })
          rec.Diff(node, Container{ Children: { Text{ Key: "same", Content: "a" }, Text{ Key: "same", Content: "b" } } })
        }
        case _ {
          return false
        }
      }
    } catch (error NotSupportedException) {
      return true
    }
    return false
  }

  func LeafDirtyUpdateContract() bool {
    let parent = TreeBuildCountingParent{}
    let window = Window{ Root: parent, Width: 200, Height: 100 }
    window.UpdateTree()
    let parentBuilds = parent.Builds
    guard let first = window.Tree else { return false }
    guard let child = first.Children[1].Fiber else { return false }
    if !(child is TreeIncrementalChild) { return false }
    child.Count.Value = 42
    window.UpdateTree()
    guard let after = window.Tree else { return false }
    return parent.Builds == parentBuilds && after.Children[0].Content == "stable"
      && after.Children[1].Children[1].Content == "42"
  }

  func DirtyAncestorContract() bool {
    let parent = TreeIncrementalParent{}
    let window = Window{ Root: parent, Width: 200, Height: 100 }
    window.UpdateTree()
    guard let first = window.Tree else { return false }
    guard let child = first.Children[1].Fiber else { return false }
    if !(child is TreeIncrementalChild) { return false }
    let childBuilds = child.Builds
    parent.Title.Value = "new"
    child.Count.Value = 7
    window.UpdateTree()
    guard let after = window.Tree else { return false }
    return child.Builds == childBuilds + 1 && after.Children[0].Content == "new"
      && after.Children[1].Children[0].Content == "new" && after.Children[1].Children[1].Content == "7"
  }

  func RemovedDirtyContract() bool {
    let parent = TreeRemovedChildParent{}
    let window = Window{ Root: parent, Width: 200, Height: 100 }
    window.UpdateTree()
    guard let first = window.Tree else { return false }
    guard let child = first.Children[0].Fiber else { return false }
    if !(child is TreeIncrementalChild) { return false }
    child.Count.Value = 5
    parent.ShowChild.Value = false
    window.UpdateTree()
    guard let after = window.Tree else { return false }
    return after.Children.Count == 1 && after.Children[0].Content == "empty"
  }

  func DisplayNonePaintContract() bool {
    let root = Node{ Kind: NodeKind.Container, Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F }, BackgroundColor: Color.Rgb(0, 0, 255) }
    let hidden = Node{ Kind: NodeKind.Container, Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F }, Display: Display.None, BackgroundColor: Color.Rgb(255, 0, 0) }
    let child = Node{ Kind: NodeKind.Container, Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F }, BackgroundColor: Color.Rgb(0, 255, 0) }
    markBackgroundApplied(root)
    markBackgroundApplied(hidden)
    markBackgroundApplied(child)
    hidden.Children.Add(child)
    root.Children.Add(hidden)
    using let image = Painter().RenderOffscreen(root, 100, 100)
    using let bitmap = SKBitmap.FromImage(image)
    return uint32(bitmap.GetPixel(50, 50)) == Color.Rgb(0, 0, 255).ToSkia()
  }

  func DisplayNonePointerContract() bool {
    var visibleHits = 0
    var hiddenHits = 0
    let root = Node{ Kind: NodeKind.Container, Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F } }
    let visible = Node{ Kind: NodeKind.Container, Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F }, OnClick: func() { visibleHits = visibleHits + 1 } }
    let hidden = Node{ Kind: NodeKind.Container, Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F }, Display: Display.None, OnClick: func() { hiddenHits = hiddenHits + 1 } }
    hidden.Children.Add(Node{ Kind: NodeKind.Container, Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F }, OnClick: func() { hiddenHits = hiddenHits + 1 } })
    root.Children.Add(visible)
    root.Children.Add(hidden)
    return Hit().DispatchClick(root, 25.0F, 25.0F) && visibleHits == 1 && hiddenHits == 0
  }

  func DisplayNoneFocusContract() bool {
    let cell = TreeDisplayFocusCell{}
    let window = Window{ Width: 300, Height: 100, Root: cell }
    let input = InputCoordinator()
    let resolver = Resolver{}
    window.UpdateTree()
    input.AfterTreeUpdated(window.Tree, resolver, true)
    input.HandleKey(window.Tree, resolver, Key.Tab, false, false)
    input.HandleKey(window.Tree, resolver, Key.Tab, false, false)
    guard let before = window.Tree else { return false }
    if !before.Children[1].Children[0].Focused { return false }
    cell.Hide()
    window.UpdateTree()
    input.AfterTreeUpdated(window.Tree, resolver, true)
    guard let hidden = window.Tree else { return false }
    if hidden.Children[1].Children[0].Focused || input.HandleChar(window.Tree, "x") { return false }
    input.HandleKey(window.Tree, resolver, Key.Tab, false, false)
    if !hidden.Children[0].Focused { return false }
    input.HandleKey(window.Tree, resolver, Key.Tab, false, false)
    return hidden.Children[2].Focused
  }

  func DisplayNoneLifecycleContract() bool {
    TreeDisplayRetainedCell.Disposed = false
    let parent = TreeDisplayRetainedParent{}
    let window = Window{ Width: 200, Height: 100, Root: parent }
    window.UpdateTree()
    guard let mounted = window.Tree else { return false }
    guard let child = mounted.Children[0].Children[0].Fiber else { return false }
    if !(child is TreeDisplayRetainedCell) { return false }
    parent.Hide()
    window.UpdateTree()
    child.Increment()
    window.UpdateTree()
    guard let hidden = window.Tree else { return false }
    if hidden.Children[0].Children[0].Children[0].Content != "1" || TreeDisplayRetainedCell.Disposed { return false }
    parent.Show()
    window.UpdateTree()
    guard let shown = window.Tree else { return false }
    return shown.Children[0].Children[0].Children[0].Content == "1" && !TreeDisplayRetainedCell.Disposed
  }

  func VisibilityPaintAndLayoutContract() bool {
    let root = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 60, Height: 20, FlexDirection: FlexDirection.Row,
      BackgroundColor: Color.Black,
      Children: {
        Container{
          Key: "hidden", Width: 20, Height: 20, Visibility: Visibility.Hidden,
          BackgroundColor: Color.Rgb(255, 0, 0),
          Children: {
            Container{
              Width: 20, Height: 20, Visibility: Visibility.Visible,
              BackgroundColor: Color.Rgb(0, 255, 0),
            },
          },
        },
        Container{ Key: "visible", Width: 20, Height: 20, BackgroundColor: Color.Rgb(0, 0, 255) },
      },
    })
    Layout().Calculate(root, 60.0F, 20.0F)
    let hidden = root.Children[0]
    let visible = root.Children[1]
    if hidden.Rect.W != 20.0F || visible.Rect.X != 20.0F
      || hidden.Children[0].Visibility != Visibility.Visible {
      return false
    }
    using let image = Painter().RenderOffscreen(root, 60, 20)
    using let bitmap = SKBitmap.FromImage(image)
    return uint32(bitmap.GetPixel(10, 10)) == Color.Black.ToSkia()
      && uint32(bitmap.GetPixel(30, 10)) == Color.Rgb(0, 0, 255).ToSkia()
  }

  func VisibilityPointerContract() bool {
    var visibleHits = 0
    var hiddenHits = 0
    let root = Node{ Kind: NodeKind.Container,
      Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F } }
    let visible = Node{ Kind: NodeKind.Container,
      Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F },
      OnClick: () -> { visibleHits++ } }
    let hidden = Node{ Kind: NodeKind.Container, Visibility: Visibility.Hidden,
      Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F },
      OnClick: () -> { hiddenHits++ } }
    hidden.Children.Add(Node{ Kind: NodeKind.Container, Visibility: Visibility.Visible,
      Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F },
      OnClick: () -> { hiddenHits++ } })
    root.Children.Add(visible)
    root.Children.Add(hidden)
    return Hit().DispatchClick(root, 25.0F, 25.0F) && visibleHits == 1 && hiddenHits == 0
  }

  func VisibilityFocusContract() bool {
    let cell = TreeVisibilityFocusCell{}
    let window = Window{ Width: 300, Height: 100, Root: cell }
    let input = InputCoordinator()
    let resolver = Resolver{}
    window.UpdateTree()
    input.AfterTreeUpdated(window.Tree, resolver, true)
    input.HandleKey(window.Tree, resolver, Key.Tab, false, false)
    input.HandleKey(window.Tree, resolver, Key.Tab, false, false)
    guard let before = window.Tree else { return false }
    if !before.Children[1].Children[0].Focused { return false }
    cell.Hide()
    window.UpdateTree()
    input.AfterTreeUpdated(window.Tree, resolver, true)
    guard let hidden = window.Tree else { return false }
    if hidden.Children[1].Children[0].Focused || input.HandleChar(window.Tree, "x") { return false }
    input.HandleKey(window.Tree, resolver, Key.Tab, false, false)
    if !hidden.Children[0].Focused { return false }
    input.HandleKey(window.Tree, resolver, Key.Tab, false, false)
    return hidden.Children[2].Focused
  }

  func VisibilityLifecycleContract() bool {
    TreeDisplayRetainedCell.Disposed = false
    let parent = TreeVisibilityRetainedParent{}
    let window = Window{ Width: 200, Height: 100, Root: parent }
    window.UpdateTree()
    guard let mounted = window.Tree else { return false }
    guard let child = mounted.Children[0].Children[0].Fiber else { return false }
    if !(child is TreeDisplayRetainedCell) { return false }
    parent.Hide()
    window.UpdateTree()
    child.Increment()
    window.UpdateTree()
    guard let hidden = window.Tree else { return false }
    if hidden.Children[0].Children[0].Children[0].Content != "1" || TreeDisplayRetainedCell.Disposed {
      return false
    }
    parent.Show()
    window.UpdateTree()
    guard let shown = window.Tree else { return false }
    return shown.Children[0].Children[0].Children[0].Content == "1" && !TreeDisplayRetainedCell.Disposed
  }

  func ButtonSemanticPrimitiveContract() bool {
    let resolver = Resolver{}
    let reconciler = Reconciler{ Res: resolver }
    let node = reconciler.Mount(Button{
      BackgroundColor: Color.Rgb(100, 100, 100),
      Color: Color.Rgb(200, 20, 10),
      Hover: Style{ BackgroundColor: Color.White },
      Children: {
        Shape{ Key: "icon", Path: PathBuilder().MoveTo(0.0, 0.0).LineTo(1.0, 1.0).Build() },
        Text{ Key: "label", Content: "Hi" },
      },
    })
    if node.Kind != NodeKind.Button || !node.Focusable || node.TransitionMs != 0.0
      || node.JustifyContent != JustifyContent.Center || node.AlignItems != AlignItems.Center
      || node.ActiveStyle != nil || node.FocusStyle != nil || node.Children.Count != 2
      || node.Children[0].Kind != NodeKind.Shape || node.Children[1].Content != "Hi"
      || node.Children[1].Color != Color.Rgb(200, 20, 10)
      || node.HoverStyle == nil {
      return false
    }
    node.Hovered = true
    resolver.Invalidate(node, false)
    resolver.Flush()
    if node.BackgroundColor != Color.White {
      return false
    }
    reconciler.Diff(node, Button{
      Color: Color.Rgb(10, 20, 200),
      Children: {
        Shape{ Key: "icon", Path: PathBuilder().MoveTo(0.0, 0.0).LineTo(1.0, 0.0).Build() },
        Text{ Key: "label", Content: "Updated" },
      },
    })
    return node.Kind == NodeKind.Button && node.Children.Count == 2
      && node.Children[1].Content == "Updated" && node.Children[1].Color == Color.Rgb(10, 20, 200)
  }

  func ButtonStyleSpillContract() bool {
    let node = Reconciler{ Res: Resolver{} }.Mount(Button{
      Width: 100,
      Height: 40,
      Gap: 8,
      BackgroundColor: Color.Rgb(41, 41, 51),
      Color: Color.White,
    })
    guard let entries = node.BaseStyle else { return false }
    return entries.Count == 7
      && entries.At(0).Field == StyleField.JustifyContent
      && entries.At(1).Field == StyleField.AlignItems
      && entries.At(2).Field == StyleField.Width
      && entries.At(6).Field == StyleField.Color
      && node.JustifyContent == JustifyContent.Center && node.AlignItems == AlignItems.Center
      && node.Width.Value == 100.0F && node.Height.Value == 40.0F
      && node.Gap.Value == 8.0F && node.BackgroundColor == Color.Rgb(41, 41, 51)
      && node.Color == Color.White
  }

  func TextEntryControlledValueContract() bool {
    let rec = Reconciler{ Res: Resolver{} }
    var calls = 0
    let node = rec.Mount(TextEntry{ Key: "entry", Value: "original", Placeholder: "first", Color: Color.Rgb(255, 0, 0) })
    node.Caret = 10
    node.Anchor = 10
    rec.Diff(node, TextEntry{
      Key: "entry", Value: "x", Placeholder: "second", Color: Color.Rgb(0, 255, 0),
      OnChange: (value string) -> { calls = calls + 1 },
    })
    if node.Buffer != "x" || node.Caret != 1 || node.Anchor != 1 || node.Placeholder != "second" || node.Color.G != 1.0F {
      return false
    }
    node.Focused = true
    node.Buffer = "typed"
    node.Caret = 5
    node.Anchor = 5
    rec.Diff(node, TextEntry{
      Key: "entry", Value: "external", Placeholder: "updated", Color: Color.Rgb(0, 0, 255),
      OnChange: (value string) -> { calls = calls + 1 },
    })
    if let onChange = node.OnChange { onChange("event") }
    return node.Buffer == "typed" && node.Caret == 5 && node.Anchor == 5
      && node.Placeholder == "updated" && node.Color.B == 1.0F && calls == 1
  }

  internal func markBackgroundApplied(node Node) {
    node.AppliedMask = styleMaskWith(node.AppliedMask, StyleField.BackgroundColor)
  }
}

internal class TreeKeyedParent : Cell {
  internal var Mode State[int32]

  init() { Mode = Track(0) }

  override func Build() Blob {
    return switch Mode.Value {
      case 0: Container{ Children: { keyedCell("a"), keyedCell("b") } }
      case 1: Container{ Children: { keyedCell("b"), keyedCell("a") } }
      case 2: Container{ Children: { keyedCell("b"), keyedCell("c"), keyedCell("a") } }
      case 3: Container{ Children: { keyedCell("b"), keyedCell("a") } }
      case _: Container{ Children: { keyedCell("b"), Text{ Key: "a", Content: "replacement" } } }
    }
  }

  internal func keyedCell(label string) Blob {
    return Cell.Mount[TreeKeyedCell](label, (cell TreeKeyedCell) -> { cell.Label = label })
  }
}

internal class TreeKeyedCell : Cell, IDisposable {
  shared { var DisposedA int32 }
  internal var Label string
  internal var Value State[string]

  init() {
    Label = ""
    Value = Track("initial")
  }

  override func Build() Blob { return Text{ Content: "$Label:${Value.Value}" } }

  func Dispose() {
    if Label == "a" { DisposedA = DisposedA + 1 }
  }
}

internal class TreeContainerCell : Cell {
  override func Build() Blob {
    return Container{ Children: {
      TextEntry{ Key: "entry", Value: "old" },
    } }
  }
}

internal class TreePositionalParent : Cell {
  internal var Label State[string]

  init() { Label = Track("before") }

  override func Build() Blob {
    return Container{ Children: {
      Text{ Content: Label.Value },
      Cell.Mount[TreePositionalCell](nil),
      Text{ Content: "tail" },
    } }
  }
}

internal class TreePositionalCell : Cell {
  internal var Value State[string]

  init() { Value = Track("initial") }

  override func Build() Blob { return Text{ Content: "slot:${Value.Value}" } }
}

internal class TreeIncrementalParent : Cell {
  internal var Title State[string]

  init() { Title = Track("old") }

  override func Build() Blob {
    return Container{ Children: {
      Text{ Key: "title", Content: Title.Value },
      Cell.Mount[TreeIncrementalChild]("child", (child TreeIncrementalChild) -> { child.Label.Value = Title.Value }),
    } }
  }
}

internal class TreeBuildCountingParent : Cell {
  internal var Builds int32

  override func Build() Blob {
    Builds = Builds + 1
    return Container{ Children: {
      Text{ Key: "stable", Content: "stable" },
      Cell.Mount[TreeIncrementalChild]("child", nil),
    } }
  }
}

internal class TreeRemovedChildParent : Cell {
  internal var ShowChild State[bool]

  init() { ShowChild = Track(true) }

  override func Build() Blob {
    if ShowChild.Value {
      return Container{ Children: { Cell.Mount[TreeIncrementalChild]("child", nil) } }
    }
    return Container{ Children: { Text{ Content: "empty" } } }
  }
}

internal class TreeIncrementalChild : Cell {
  internal var Label State[string]
  internal var Count State[int32]
  internal var Builds int32

  init() {
    Label = Track("")
    Count = Track(0)
  }

  override func Build() Blob {
    Builds = Builds + 1
    return Container{ Children: {
      Text{ Content: Label.Value },
      Text{ Content: "${Count.Value}" },
    } }
  }
}

internal class TreeDisplayFocusCell : Cell {
  internal var Hidden State[bool]

  init() { Hidden = Track(false) }

  func Hide() { Hidden.Value = true }

  override func Build() Blob {
    return Container{ Width: 300.0, Height: 100.0, Children: {
      TextEntry{ Key: "a", Width: 100.0, Height: 30.0 },
      Container{ Key: "hidden", Display: Hidden.Value ? Display.None : Display.Flex, Children: {
        TextEntry{ Key: "hidden-entry", Width: 100.0, Height: 30.0 },
      } },
      TextEntry{ Key: "c", Width: 100.0, Height: 30.0 },
    } }
  }
}

internal class TreeDisplayRetainedParent : Cell {
  internal var Hidden State[bool]

  init() { Hidden = Track(false) }

  func Hide() { Hidden.Value = true }

  func Show() { Hidden.Value = false }

  override func Build() Blob {
    return Container{ Width: 200.0, Height: 100.0, Children: {
      Container{ Key: "wrapper", Display: Hidden.Value ? Display.None : Display.Flex, Children: {
        Cell.Mount[TreeDisplayRetainedCell]("retained", nil),
      } },
    } }
  }
}

internal class TreeVisibilityFocusCell : Cell {
  internal var Hidden State[bool]

  init() { Hidden = Track(false) }

  func Hide() { Hidden.Value = true }

  override func Build() Blob {
    return Container{ Width: 300.0, Height: 100.0, Children: {
      TextEntry{ Key: "a", Width: 100.0, Height: 30.0 },
      Container{
        Key: "hidden", Visibility: Hidden.Value ? Visibility.Hidden : Visibility.Visible,
        Children: {
          TextEntry{
            Key: "hidden-entry", Width: 100.0, Height: 30.0,
            Visibility: Visibility.Visible,
          },
        },
      },
      TextEntry{ Key: "c", Width: 100.0, Height: 30.0 },
    } }
  }
}

internal class TreeVisibilityRetainedParent : Cell {
  internal var Hidden State[bool]

  init() { Hidden = Track(false) }

  func Hide() { Hidden.Value = true }

  func Show() { Hidden.Value = false }

  override func Build() Blob {
    return Container{ Width: 200.0, Height: 100.0, Children: {
      Container{
        Key: "wrapper", Visibility: Hidden.Value ? Visibility.Hidden : Visibility.Visible,
        Children: { Cell.Mount[TreeDisplayRetainedCell]("retained", nil) },
      },
    } }
  }
}

internal class TreeDisplayRetainedCell : Cell, IDisposable {
  shared { var Disposed bool }
  internal var Count State[int32]

  init() { Count = Track(0) }

  func Increment() { Count.Value = Count.Value + 1 }

  func Dispose() { Disposed = true }

  override func Build() Blob { return Container{ Children: { Text{ Content: "${Count.Value}" } } } }
}
