package Goo

import System

internal class CellFixtures {
  func InputEqualitySchedulesOneBuild() bool {
    CellInputFixtureCell.Builds = 0
    let rec = Reconciler{ Res: Resolver{} }
    let first = CellInputFixtureValue{ Label: "first", Count: 1 }
    let second = CellInputFixtureValue{ Label: "second", Count: 2 }
    var node = rec.Mount(cellInputFixture(first))
    if CellInputFixtureCell.Builds != 1 || node.Content != "first:1" {
      return false
    }
    node = rec.Diff(node, cellInputFixture(first))
    if CellInputFixtureCell.Builds != 1 {
      return false
    }
    node = rec.Diff(node, cellInputFixture(second))
    if CellInputFixtureCell.Builds != 2 || node.Content != "second:2" {
      return false
    }
    node = rec.Diff(node, cellInputFixture(second))
    return CellInputFixtureCell.Builds == 2
  }

  func SemanticInputEquivalenceKeepsNewestCallback() bool {
    CellCallbackInputFixtureCell.Builds = 0
    CellCallbackInputFixtureCell.Callback = ""
    CellCallbackInputFixtureCell.SnapshotWasStored = false
    let rec = Reconciler{ Res: Resolver{} }
    let first = CellCallbackInputFixtureValue{
      Label: "same",
      OnClick: () -> { CellCallbackInputFixtureCell.Callback = "first" },
    }
    let second = CellCallbackInputFixtureValue{
      Label: "same",
      OnClick: () -> { CellCallbackInputFixtureCell.Callback = "second" },
    }
    let changed = CellCallbackInputFixtureValue{
      Label: "changed",
      OnClick: () -> { CellCallbackInputFixtureCell.Callback = "changed" },
    }
    var node = rec.Mount(cellCallbackInputFixture(first))
    node = rec.Diff(node, cellCallbackInputFixture(second))
    if CellCallbackInputFixtureCell.Builds != 1 || !CellCallbackInputFixtureCell.SnapshotWasStored {
      return false
    }
    guard let action = node.OnClick else { return false }
    action()
    if CellCallbackInputFixtureCell.Callback != "second" {
      return false
    }
    node = rec.Diff(node, cellCallbackInputFixture(changed))
    guard let changedAction = node.OnClick else { return false }
    changedAction()
    return CellCallbackInputFixtureCell.Builds == 2
      && CellCallbackInputFixtureCell.Callback == "changed"
  }

  func ThrowingInputEquivalenceRetriesSameSnapshot() bool {
    CellThrowingInputFixtureCell.Builds = 0
    CellThrowingInputFixtureCell.ThrowOnce = false
    let rec = Reconciler{ Res: Resolver{} }
    let first = CellThrowingInputFixtureValue{ Label: "first" }
    let second = CellThrowingInputFixtureValue{ Label: "second" }
    var node = rec.Mount(cellThrowingInputFixture(first))
    CellThrowingInputFixtureCell.ThrowOnce = true
    var threw = false
    try {
      node = rec.Diff(node, cellThrowingInputFixture(second))
    } catch (error Exception) {
      threw = error.Message == "throw once"
    }
    if !threw || CellThrowingInputFixtureCell.Builds != 1 || node.Content != "first" {
      return false
    }
    node = rec.Diff(node, cellThrowingInputFixture(second))
    if CellThrowingInputFixtureCell.Builds != 2 || node.Content != "second" {
      return false
    }
    node = rec.Diff(node, cellThrowingInputFixture(second))
    return CellThrowingInputFixtureCell.Builds == 2 && node.Content == "second"
  }

  func DirtySiblingsRebuildOnceInOneUpdate() bool {
    let parent = CellSchedulingSiblingsParent{}
    let window = Window{ Root: parent, Width: 200, Height: 100 }
    window.UpdateTree()
    guard let first = window.Tree else { return false }
    guard let left = first.Children[0].Fiber else { return false }
    guard let right = first.Children[1].Fiber else { return false }
    if left is CellSchedulingLeft {
      if right is CellSchedulingRight {
        let leftBefore = left.Builds
        let rightBefore = right.Builds
        left.RequestMany()
        right.RequestMany()
        window.UpdateTree()
        return left.Builds == leftBefore + 1 && right.Builds == rightBefore + 1
      }
    }
    return false
  }
  func DirtySiblingFailureResubmitsRemaining() bool {
    CellSchedulingRecoveryFirst.ThrowOnce = false
    let parent = CellSchedulingRecoveryParent{}
    let window = Window{ Root: parent, Width: 200, Height: 100 }
    window.UpdateTree()
    guard let first = window.Tree else { return false }
    guard let left = first.Children[0].Fiber else { return false }
    guard let right = first.Children[1].Fiber else { return false }
    if left is CellSchedulingRecoveryFirst {
      if right is CellSchedulingRecoverySecond {
        let leftBefore = left.Builds
        let rightBefore = right.Builds
        left.Request()
        right.Request()
        CellSchedulingRecoveryFirst.ThrowOnce = true
        var threw = false
        try {
          window.UpdateTree()
        } catch (error Exception) {
          threw = true
        }
        if !threw || left.Builds != leftBefore + 1 || right.Builds != rightBefore {
          return false
        }
        window.UpdateTree()
        if left.Builds != leftBefore + 2 || right.Builds != rightBefore + 1 {
          return false
        }
        window.UpdateTree()
        return left.Builds == leftBefore + 2 && right.Builds == rightBefore + 1
      }
    }
    return false
  }

  func RepeatedRebuildRequestsCoalesce() bool {
    let parent = CellSchedulingSiblingsParent{}
    let window = Window{ Root: parent, Width: 200, Height: 100 }
    window.UpdateTree()
    guard let first = window.Tree else { return false }
    guard let child = first.Children[0].Fiber else { return false }
    if child is CellSchedulingLeft {
      let buildsBefore = child.Builds
      child.RequestMany()
      window.UpdateTree()
      window.UpdateTree()
      return child.Builds == buildsBefore + 1
    }
    return false
  }

  func DirtyParentRunsBeforeAndSubsumesDirtyChild() bool {
    CellSchedulingOrderParent.Trace = ""
    let parent = CellSchedulingOrderParent{}
    let window = Window{ Root: parent, Width: 200, Height: 100 }
    window.UpdateTree()
    guard let first = window.Tree else { return false }
    guard let child = first.Children[0].Fiber else { return false }
    if child is CellSchedulingOrderChild {
      let parentBefore = parent.Builds
      let childBefore = child.Builds
      CellSchedulingOrderParent.Trace = ""
      child.Request()
      parent.Change("after")
      window.UpdateTree()
      guard let after = window.Tree else { return false }
      return parent.Builds == parentBefore + 1
        && child.Builds == childBefore + 1
        && CellSchedulingOrderParent.Trace == "PC"
        && after.Children[0].Content == "after"
    }
    return false
  }

  func RemovedQueuedCellIsNotRebuiltAndDisposesOnce() bool {
    CellSchedulingRemovalChild.Disposals = 0
    let parent = CellSchedulingRemovalParent{}
    let window = Window{ Root: parent, Width: 200, Height: 100 }
    window.UpdateTree()
    guard let first = window.Tree else { return false }
    guard let child = first.Children[0].Fiber else { return false }
    if child is CellSchedulingRemovalChild {
      let childBefore = child.Builds
      child.RequestMany()
      parent.Remove()
      window.UpdateTree()
      guard let after = window.Tree else { return false }
      window.UpdateTree()
      return child.Builds == childBefore
        && CellSchedulingRemovalChild.Disposals == 1
        && after.Children.Count == 1
        && after.Children[0].Content == "removed"
    }
    return false
  }

  func RebuildRequestedDuringTransactionRunsOnNextUpdate() bool {
    CellSchedulingDeferredSecond.Last = nil
    let parent = CellSchedulingDeferredParent{}
    let window = Window{ Root: parent, Width: 200, Height: 100 }
    window.UpdateTree()
    guard let first = window.Tree else { return false }
    guard let source = first.Children[0].Fiber else { return false }
    guard let target = first.Children[1].Fiber else { return false }
    if source is CellSchedulingDeferredFirst {
      if target is CellSchedulingDeferredSecond {
        let sourceBefore = source.Builds
        let targetBefore = target.Builds
        source.TriggerPeer()
        window.UpdateTree()
        if source.Builds != sourceBefore + 1 || target.Builds != targetBefore {
          return false
        }
        window.UpdateTree()
        return target.Builds == targetBefore + 1
      }
    }
    return false
  }

  func TryPostReportsQueueAcceptance() bool {
    var calls int32
    let window = Window{}
    if !window.TryPost(() -> { calls++ }) { return false }
    window.drainPostedActions()
    if calls != 1 { return false }
    window.Close()
    if window.TryPost(() -> { calls++ }) { return false }
    var threw = false
    try {
      window.Post(() -> { calls++ })
    } catch (error InvalidOperationException) {
      threw = true
    }
    return threw && calls == 1
  }

  func DirectCompositionAddsNoRenderNode() bool {
    DirectChildCell.Last = nil
    let window = Window{ Root: DirectParentCell{}, Width: 100, Height: 100 }
    window.UpdateTree()
    guard let node = window.Tree else { return false }
    guard let child = DirectChildCell.Last else { return false }
    if node.Kind != NodeKind.Text || node.Content != "direct:0" || node.Children.Count != 0 {
      return false
    }
    child.Change()
    window.UpdateTree()
    guard let after = window.Tree else { return false }
    return after.Kind == NodeKind.Text
      && after.Content == "direct:1"
      && after.Children.Count == 0
  }

  func DisposesEachUnmountedCellExactlyOnce() bool {
    KeyedDisposableCell.Disposals = 0
    PositionalDisposableCell.Disposals = 0
    ReplacementDisposableCell.Disposals = 0
    WindowDisposableCell.Disposals = 0

    let rec = Reconciler{ Res: Resolver{} }
    var keyed = rec.Mount(Container{
      Children: {
        Cell.Mount[KeyedDisposableCell]("removed"),
        Text{ Key: "kept", Content: "kept" },
      },
    })
    keyed = rec.Diff(keyed, Container{
      Children: {
        Text{ Key: "kept", Content: "kept" },
      },
    })

    var positional = rec.Mount(Container{
      Children: {
        Text{ Content: "kept" },
        Cell.Mount[PositionalDisposableCell](nil),
      },
    })
    positional = rec.Diff(positional, Container{
      Children: {
        Text{ Content: "kept" },
      },
    })

    var replacement = rec.Mount(Cell.Mount[ReplacementDisposableCell]("same"))
    replacement = rec.Diff(replacement, Cell.Mount[ReplacementOtherCell]("same"))

    let root = WindowDisposableCell{}
    let window = Window{ Root: root, Width: 100, Height: 100 }
    window.UpdateTree()
    window.Close()
    window.Close()

    return KeyedDisposableCell.Disposals == 1
      && PositionalDisposableCell.Disposals == 1
      && ReplacementDisposableCell.Disposals == 1
      && WindowDisposableCell.Disposals == 1
  }
}

internal data struct CellInputFixtureValue {
  internal var Label string
  internal var Count int32
}

internal func cellInputFixture(input CellInputFixtureValue) Blob -> Cell.Mount[CellInputFixtureValue, CellInputFixtureCell](nil, input)

internal class CellInputFixtureCell : Cell[CellInputFixtureValue] {
  shared { internal var Builds int32 }

  override func Build() Blob {
    Builds = Builds + 1
    return Text{ Content: "${Input.Label}:${Input.Count}" }
  }
}

internal data struct CellCallbackInputFixtureValue {
  internal var Label string
  internal var OnClick Action
}

internal func cellCallbackInputFixture(input CellCallbackInputFixtureValue) Blob -> Cell.Mount[CellCallbackInputFixtureValue, CellCallbackInputFixtureCell](nil, input)

internal open class CellCallbackInputFixtureCell : Cell[CellCallbackInputFixtureValue] {
  shared {
    internal var Builds int32
    internal var Callback string
    internal var SnapshotWasStored bool
  }

  protected override func ShouldRebuild(previous CellCallbackInputFixtureValue, next CellCallbackInputFixtureValue) bool {
    SnapshotWasStored = Input.Label == next.Label
    return previous.Label != next.Label
  }

  override func Build() Blob {
    Builds = Builds + 1
    return Container{ OnClick: () -> { Input.OnClick() } }
  }
}

internal data struct CellThrowingInputFixtureValue {
  internal var Label string
}

internal func cellThrowingInputFixture(input CellThrowingInputFixtureValue) Blob -> Cell.Mount[CellThrowingInputFixtureValue, CellThrowingInputFixtureCell](nil, input)

internal open class CellThrowingInputFixtureCell : Cell[CellThrowingInputFixtureValue] {
  shared {
    internal var Builds int32
    internal var ThrowOnce bool
  }

  protected override func ShouldRebuild(previous CellThrowingInputFixtureValue, next CellThrowingInputFixtureValue) bool {
    if ThrowOnce {
      ThrowOnce = false
      throw InvalidOperationException("throw once")
    }
    return previous.Label != next.Label
  }

  override func Build() Blob {
    Builds = Builds + 1
    return Text{ Content: Input.Label }
  }
}

internal class CellSchedulingSiblingsParent : Cell {
  override func Build() Blob -> Container { Children: {
    Cell.Mount[CellSchedulingLeft]("left", nil),
    Cell.Mount[CellSchedulingRight]("right", nil),
  } }
}

internal class CellSchedulingLeft : Cell {
  internal var Builds int32

  internal func RequestMany() {
    Rebuild()
    Rebuild()
    Rebuild()
  }

  override func Build() Blob {
    Builds = Builds + 1
    return Text{ Content: "left" }
  }
}

internal class CellSchedulingRight : Cell {
  internal var Builds int32

  internal func RequestMany() {
    Rebuild()
    Rebuild()
    Rebuild()
  }

  override func Build() Blob {
    Builds = Builds + 1
    return Text{ Content: "right" }
  }
}
internal class CellSchedulingRecoveryParent : Cell {
  override func Build() Blob -> Container { Children: {
    Cell.Mount[CellSchedulingRecoveryFirst]("first", nil),
    Cell.Mount[CellSchedulingRecoverySecond]("second", nil),
  } }
}

internal class CellSchedulingRecoveryFirst : Cell {
  shared { internal var ThrowOnce bool }
  internal var Builds int32

  internal func Request() { Rebuild() }

  override func Build() Blob {
    Builds = Builds + 1
    if ThrowOnce {
      ThrowOnce = false
      throw InvalidOperationException("recovery fixture")
    }
    return Text{ Content: "first" }
  }
}

internal class CellSchedulingRecoverySecond : Cell {
  internal var Builds int32

  internal func Request() { Rebuild() }

  override func Build() Blob {
    Builds = Builds + 1
    return Text{ Content: "second" }
  }
}

internal class CellSchedulingOrderParent : Cell {
  shared { internal var Trace string }
  internal var Builds int32
  private var label string

  init() { label = "before" }

  internal func Change(value string) {
    label = value
    Rebuild()
  }

  override func Build() Blob {
    Builds = Builds + 1
    Trace = Trace + "P"
    return Container{ Children: {
      Cell.Mount[CellSchedulingOrderInput, CellSchedulingOrderChild](
        nil,
        CellSchedulingOrderInput{ Label: label }),
    } }
  }
}

internal data struct CellSchedulingOrderInput {
  internal var Label string
}

internal class CellSchedulingOrderChild : Cell[CellSchedulingOrderInput] {
  internal var Builds int32

  internal func Request() { Rebuild() }

  override func Build() Blob {
    Builds = Builds + 1
    CellSchedulingOrderParent.Trace = CellSchedulingOrderParent.Trace + "C"
    return Text{ Content: Input.Label }
  }
}

internal class CellSchedulingRemovalParent : Cell {
  private var showChild bool

  init() { showChild = true }

  internal func Remove() {
    showChild = false
    Rebuild()
  }

  override func Build() Blob {
    if showChild {
      return Container{ Children: {
        Cell.Mount[CellSchedulingRemovalChild](nil, nil),
      } }
    }
    return Container{ Children: { Text{ Content: "removed" } } }
  }
}

internal class CellSchedulingRemovalChild : Cell, IDisposable {
  shared { internal var Disposals int32 }
  internal var Builds int32

  internal func RequestMany() {
    Rebuild()
    Rebuild()
    Rebuild()
  }

  func Dispose() { Disposals = Disposals + 1 }

  override func Build() Blob {
    Builds = Builds + 1
    return Text{ Content: "child" }
  }
}

internal class CellSchedulingDeferredParent : Cell {
  override func Build() Blob -> Container { Children: {
    Cell.Mount[CellSchedulingDeferredFirst]("first", nil),
    Cell.Mount[CellSchedulingDeferredSecond]("second", nil),
  } }
}

internal class CellSchedulingDeferredFirst : Cell {
  internal var Builds int32
  private var triggerPeer bool

  internal func TriggerPeer() {
    triggerPeer = true
    Rebuild()
  }

  override func Build() Blob {
    Builds = Builds + 1
    if triggerPeer {
      triggerPeer = false
      if let peer = CellSchedulingDeferredSecond.Last {
        peer.Request()
      }
    }
    return Text{ Content: "first" }
  }
}

internal class CellSchedulingDeferredSecond : Cell {
  shared { internal var Last CellSchedulingDeferredSecond? }
  internal var Builds int32

  init() { Last = this }

  internal func Request() { Rebuild() }

  override func Build() Blob {
    Builds = Builds + 1
    return Text{ Content: "second" }
  }
}

internal class DirectParentCell : Cell {
  override func Build() Blob -> Cell.Mount[DirectChildCell](nil)
}

internal class DirectChildCell : Cell {
  shared { internal var Last DirectChildCell? }
  private var count int32

  init() {
    Last = this
  }

  internal func Change() {
    count = count + 1
    Rebuild()
  }

  override func Build() Blob -> Text { Content: "direct:$count" }
}

internal class KeyedDisposableCell : Cell, IDisposable {
  shared { internal var Disposals int32 }
  func Dispose() { Disposals = Disposals + 1 }
  override func Build() Blob -> Text { Content: "keyed" }
}

internal class PositionalDisposableCell : Cell, IDisposable {
  shared { internal var Disposals int32 }
  func Dispose() { Disposals = Disposals + 1 }
  override func Build() Blob -> Text { Content: "positional" }
}

internal class ReplacementDisposableCell : Cell, IDisposable {
  shared { internal var Disposals int32 }
  func Dispose() { Disposals = Disposals + 1 }
  override func Build() Blob -> Text { Content: "replacement" }
}

internal class ReplacementOtherCell : Cell {
  override func Build() Blob -> Text { Content: "other" }
}

internal class WindowDisposableCell : Cell, IDisposable {
  shared { internal var Disposals int32 }
  func Dispose() { Disposals = Disposals + 1 }
  override func Build() Blob -> Text { Content: "window" }
}
