package GooAsyncReadbackSmoke

import System
import System.Collections.Generic
import System.Diagnostics
import System.IO
import Goo

func S15Q10TableText(row int32, column int32, mutated bool) string {
  if mutated {
    return "M"
  }
  let value = (int64(row) * 131L + int64(column) * 17L
    +int64(2654435761uL % 997uL)) % 26L
  return Convert.ToChar(65 + int32(value)).ToString()
}

data struct S15Q10TableCellInput {
  internal var Row int32
  internal var MutationMask uint32
}

class S15Q10TableRoot : Cell {
  shared {
    const S15Q10TableRows int32 = 100000
    const S15Q10TableColumns int32 = 12
    const S15Q10TableRowHeight float64 = 32.0
    const S15Q10TableOverscanRows int32 = 8
    const S15Q10TableWidth int32 = 1440
    const S15Q10TableHeight int32 = 900
  }

  private let seed uint64
  private let poolRows int32
  private let viewportRows int32
  private let maxScrollRow int32
  private let rowKeys []string
  private var scrollRow int32
  private var scrollDirection int32
  private let mutationRows []int32
  private let mutationColumns []int32

  prop LogicalCount int64 {
    get { return int64(S15Q10TableRows) * int64(S15Q10TableColumns) }
  }
  prop VisibleCount int32 { get { return viewportRows } }
  prop MountedCount int32 { get { return poolRows } }
  prop MountedBound int32 { get { return poolRows } }
  prop Width int32 { get { return S15Q10TableWidth } }
  prop Height int32 { get { return S15Q10TableHeight } }
  prop MutationCount int32 { get { return 10 } }

  init(initialSeed uint64) {
    seed = initialSeed
    mutationRows = [10]int32
    mutationColumns = [10]int32
    viewportRows = 29
    poolRows = 45
    maxScrollRow = S15Q10TableRows - viewportRows
    rowKeys = [poolRows]string
    var rowIndex int32 = 0
    while rowIndex < poolRows {
      rowKeys[rowIndex] = "q10-table-row-" + rowIndex.ToString()
      rowIndex = rowIndex + 1
    }
    scrollRow = 0
    scrollDirection = 1
    var mutationIndex int32 = 0
    while mutationIndex < 10 {
      mutationRows[mutationIndex] = mutationIndex
      mutationColumns[mutationIndex] = mutationIndex % S15Q10TableColumns
      mutationIndex = mutationIndex + 1
    }
  }

  func Advance(frame int32) {
    var next = scrollRow + scrollDirection * 17
    if next >= maxScrollRow {
      next = maxScrollRow
      scrollDirection = -1
    } else if next <= 0 {
      next = 0
      scrollDirection = 1
    }
    scrollRow = next
    var index int32 = 0
    while index < 10 {
      let visible = (frame * 13 + index * 7 + int32(seed % 31uL)) % viewportRows
      mutationRows[index] = scrollRow + visible
      mutationColumns[index] =
      (frame * 5 + index * 3 + int32(seed % 11uL)) % S15Q10TableColumns
      index = index + 1
    }
  }

  private func MutationMask(row int32) uint32 {
    var result uint32 = 0u
    var index int32 = 0
    while index < 10 {
      if mutationRows[index] == row {
        result = result | (1u << mutationColumns[index])
      }
      index = index + 1
    }
    return result
  }

  override func Build() Blob {
    var firstRow = scrollRow - S15Q10TableOverscanRows
    if firstRow < 0 {
      firstRow = 0
    }
    let lastStart = S15Q10TableRows - poolRows
    if firstRow > lastStart {
      firstRow = lastStart
    }
    let canvas = Container{
      Key: "q10-table-canvas",
      Position: PositionType.Absolute,
      Left: 0.0,
      Top: -float64(scrollRow) * S15Q10TableRowHeight,
      Width: S15Q10TableWidth,
      Height: float64(S15Q10TableRows) * S15Q10TableRowHeight,
      Children: {},
    }
    var offset int32 = 0
    while offset < poolRows {
      let row = firstRow + offset
      let slot = row % poolRows
      canvas.Children.Add(Cell.Mount[S15Q10TableCellInput, S15Q10TableCell](
        rowKeys[slot],
        S15Q10TableCellInput{
          Row: row,
          MutationMask: MutationMask(row),
        }))
      offset = offset + 1
    }
    return Container{
      Width: S15Q10TableWidth,
      Height: S15Q10TableHeight,
      Position: PositionType.Relative,
      OverflowX: Overflow.Hidden,
      OverflowY: Overflow.Hidden,
      BackgroundColor: Color.Rgb(10, 15, 24),
      Children: { canvas },
    }
  }
}

open class S15Q10TableCell : Cell[S15Q10TableCellInput] {
  protected override func Build(input S15Q10TableCellInput) Blob {
    let result = Container{
      Position: PositionType.Absolute,
      Left: 0.0,
      Top: float64(input.Row) * 32.0,
      Width: 1440,
      Height: 32,
      BackgroundColor: (input.Row & 1) == 0
      ? Color.Rgb(16, 24, 36) : Color.Rgb(20, 30, 44),
    }
    var column int32 = 0
    while column < 12 {
      let mutated = (input.MutationMask & (1u << column)) != 0u
      if column % 4 == 0 {
        result.Children.Add(Text{
          Content: S15Q10TableText(input.Row, column, mutated),
          Position: PositionType.Absolute,
          Left: float64(column) * 120.0 + 6.0,
          Top: 0.0,
          Width: 16.0,
          Height: 32.0,
          PaddingTop: 6.0,
          FontSize: 10.0,
          TextWrap: TextWrap.NoWrap,
          Color: mutated ? Color.Rgb(255, 232, 160) : Color.Rgb(208, 220, 236),
        })
      }
      if mutated {
        result.Children.Add(Container{
          Position: PositionType.Absolute,
          Left: float64(column) * 120.0 + 108.0,
          Top: 13.0,
          Width: 6.0,
          Height: 6.0,
          BorderRadius: 3.0,
          BackgroundColor: Color.Rgb(255, 196, 72),
        })
      }
      column = column + 1
    }
    return result
  }
}

data struct S15Q10TopologyCellInput {
  internal var Node int32
  internal var Group int32
  internal var Mutated bool
  internal var Labeled bool
}

class S15Q10TopologyRoot : Cell {
  shared {
    const S15Q10TopologyNodes int32 = 5000
    const S15Q10TopologyEdges int32 = 15000
    const S15Q10TopologyGroups int32 = 32
    const S15Q10TopologyVisibleTarget int32 = 400
    const S15Q10TopologyWidth int32 = 1920
    const S15Q10TopologyHeight int32 = 1080
  }

  private let seed uint64
  private let nodeKeys []string
  private let edgeKeys []string
  private let visibleNodes []int32
  private let visibleMap []bool
  private let mutatedNodes []int32
  private var visibleCount int32
  private var visibleEdgeCount int32
  private var panX float64
  private var panY float64
  private var zoom float64

  prop LogicalCount int64 { get { return int64(S15Q10TopologyNodes) } }
  prop LogicalEdges int32 { get { return S15Q10TopologyEdges } }
  prop VisibleCount int32 { get { return visibleCount } }
  prop VisibleEdgeCount int32 { get { return visibleEdgeCount } }
  prop MountedCount int32 { get { return visibleCount } }
  prop MountedBound int32 { get { return S15Q10TopologyVisibleTarget } }
  prop Width int32 { get { return S15Q10TopologyWidth } }
  prop Height int32 { get { return S15Q10TopologyHeight } }
  prop MutationCount int32 { get { return 16 } }

  init(initialSeed uint64) {
    seed = initialSeed
    mutatedNodes = [16]int32
    nodeKeys = [S15Q10TopologyNodes]string
    edgeKeys = [S15Q10TopologyEdges]string
    visibleNodes = [S15Q10TopologyVisibleTarget]int32
    visibleMap = [S15Q10TopologyNodes]bool
    var index int32 = 0
    while index < S15Q10TopologyNodes {
      nodeKeys[index] = "q10-topology-node-" + index.ToString()
      index = index + 1
    }
    index = 0
    while index < S15Q10TopologyEdges {
      edgeKeys[index] = "q10-topology-edge-" + index.ToString()
      index = index + 1
    }
    index = 0
    while index < S15Q10TopologyVisibleTarget {
      visibleNodes[index] = -1
      index = index + 1
    }
    index = 0
    while index < 16 {
      mutatedNodes[index] = -1
      index = index + 1
    }
    visibleCount = 0
    panX = 1800.0
    panY = 990.0
    zoom = 1.0
    RefreshVisible()
  }

  func Advance(frame int32) {
    let phase = frame % 120
    let triangle = if phase <= 60 { phase } else { 120 - phase }
    let zoomPhase = frame % 300
    let zoomTriangle = if zoomPhase <= 150 { zoomPhase } else { 300 - zoomPhase }
    panX = 1740.0 + float64(triangle) * 3.0
    panY = 900.0 + float64((frame * 5) % 121)
    zoom = 0.75 + float64(zoomTriangle) * 0.005
    RefreshVisible()
    var index int32 = 0
    while index < 16 {
      if visibleCount > 0 {
        mutatedNodes[index] =
        visibleNodes[(frame * 11 + index * 17 + int32(seed % 29uL)) % visibleCount]
      } else {
        mutatedNodes[index] = -1
      }
      index = index + 1
    }
  }

  private func IsMutated(node int32) bool {
    var index int32 = 0
    while index < 16 {
      if mutatedNodes[index] == node {
        return true
      }
      index = index + 1
    }
    return false
  }

  private func NodeX(node int32) float64 -> float64((node * 97 + int32(seed % 5760uL)) % 5760)

  private func NodeY(node int32) float64 -> float64((node * 193 + int32(seed % 3240uL)) % 3240)

  private func ScreenX(node int32) float64 -> (NodeX(node) - panX) * zoom

  private func ScreenY(node int32) float64 -> (NodeY(node) - panY) * zoom

  private func RefreshVisible() {
    var node int32 = 0
    while node < visibleMap.Length {
      visibleMap[node] = false
      node = node + 1
    }
    visibleCount = 0
    node = 0
    while node < S15Q10TopologyNodes && visibleCount < S15Q10TopologyVisibleTarget {
      let x = ScreenX(node)
      let y = ScreenY(node)
      if x >= -20.0 && x < float64(S15Q10TopologyWidth) + 20.0
        && y >= -20.0 && y < float64(S15Q10TopologyHeight) + 20.0 {
          visibleNodes[visibleCount] = node
          visibleMap[node] = true
          visibleCount = visibleCount + 1
        }
      node = node + 1
    }
    while visibleCount < S15Q10TopologyVisibleTarget {
      visibleNodes[visibleCount] = -1
      visibleCount = visibleCount + 1
    }
    var active int32 = 0
    while active < S15Q10TopologyVisibleTarget && visibleNodes[active] >= 0 {
      active = active + 1
    }
    visibleCount = active
  }

  override func Build() Blob {
    let canvas = Container{
      Key: "q10-topology-canvas",
      Position: PositionType.Absolute,
      Left: -panX,
      Top: -panY,
      Width: 5760,
      Height: 3240,
      Transform: PanelTransform{ Scale: zoom },
      TransformOriginX: Length.Percent(0),
      TransformOriginY: Length.Percent(0),
      BackgroundColor: Color.Rgb(8, 13, 22),
      Children: {},
    }
    visibleEdgeCount = 0
    var visibleSlot int32 = 0
    while visibleSlot < visibleCount {
      let from = visibleNodes[visibleSlot]
      var edgeGroup int32 = 0
      while edgeGroup < 3 {
        let edge = from + edgeGroup * S15Q10TopologyNodes
        let to = (edge * 37 + 17) % S15Q10TopologyNodes
        if visibleMap[to] {
          let fromX = NodeX(from) + 7.0
          let fromY = NodeY(from) + 7.0
          let dx = NodeX(to) + 7.0 - fromX
          let dy = NodeY(to) + 7.0 - fromY
          let length = Math.Sqrt(dx * dx + dy * dy)
          if length > 0.0 {
            canvas.Children.Add(Container{
              Key: edgeKeys[edge],
              Position: PositionType.Absolute,
              Left: fromX,
              Top: fromY,
              Width: length,
              Height: 1.0,
              Transform: PanelTransform{
                Rotate: Math.Atan2(dy, dx) * 180.0 / Math.PI,
              },
              TransformOriginX: Length.Percent(0),
              TransformOriginY: Length.Percent(0),
              BackgroundColor: Color.Rgb(42, 62, 86),
            })
            visibleEdgeCount = visibleEdgeCount + 1
          }
        }
        edgeGroup = edgeGroup + 1
      }
      visibleSlot = visibleSlot + 1
    }
    var slot int32 = 0
    while slot < visibleCount {
      let node = visibleNodes[slot]
      canvas.Children.Add(Cell.Mount[S15Q10TopologyCellInput, S15Q10TopologyCell](
        nodeKeys[node],
        S15Q10TopologyCellInput{
          Node: node,
          Group: node % S15Q10TopologyGroups,
          Mutated: IsMutated(node),
          Labeled: (node & 31) == 0,
        }))
      slot = slot + 1
    }
    return Container{
      Width: S15Q10TopologyWidth,
      Height: S15Q10TopologyHeight,
      Position: PositionType.Relative,
      OverflowX: Overflow.Hidden,
      OverflowY: Overflow.Hidden,
      Children: { canvas },
    }
  }
}

open class S15Q10TopologyCell : Cell[S15Q10TopologyCellInput] {
  protected override func Build(input S15Q10TopologyCellInput) Blob {
    let base = 24 + (input.Group * 29) % 160
    let green = if input.Mutated { 232 } else { 72 + (input.Group * 17) % 120 }
    let blue = 128 + (input.Group * 11) % 112
    let result = Container{
      Position: PositionType.Absolute,
      Left: float64((input.Node * 97 + int32(2246822519uL % 5760uL)) % 5760),
      Top: float64((input.Node * 193 + int32(2246822519uL % 3240uL)) % 3240),
      Width: 14.0,
      Height: 14.0,
      BorderRadius: 3.0,
      BackgroundColor: Color.Rgb(if input.Mutated { 255 } else { base }, green, blue),
    }
    if input.Labeled {
      result.Children.Add(Text{
        Content: Convert.ToChar(65 + input.Node % 26).ToString(),
        Position: PositionType.Absolute,
        Left: 16.0,
        Top: 0.0,
        Width: 16.0,
        Height: 14.0,
        FontSize: 8.0,
        Color: Color.Rgb(220, 230, 242),
      })
    }
    return result
  }
}

class S15Q10BoxesRoot : Cell {
  shared {
    const S15Q10Boxes int32 = 1000
  }

  private let seed uint64
  private let full bool
  private let keys []string
  private var generation int32
  private var changedIndex int32

  prop LogicalCount int64 { get { return int64(S15Q10Boxes) } }
  prop LogicalEdges int32 { get { return 0 } }
  prop VisibleCount int32 { get { return S15Q10Boxes } }
  prop MountedCount int32 { get { return S15Q10Boxes } }
  prop MountedBound int32 { get { return S15Q10Boxes } }
  prop Width int32 { get { return 1000 } }
  prop Height int32 { get { return 640 } }
  prop MutationCount int32 { get { return if full { S15Q10Boxes } else { 1 } } }

  init(initialSeed uint64, mutateAll bool) {
    seed = initialSeed
    full = mutateAll
    keys = [S15Q10Boxes]string
    var index int32 = 0
    while index < S15Q10Boxes {
      keys[index] = "q10-box-" + index.ToString()
      index = index + 1
    }
    generation = 0
    changedIndex = -1
  }

  func Advance(frame int32) {
    generation = generation + 1
    changedIndex = if full { -1 } else { (frame * 17 + int32(seed % 997uL)) % S15Q10Boxes }
    Rebuild()
  }

  private func BoxColor(index int32) Color {
    let base = 24 + (index % 8) * 12
    let green = 56 + (index % 5) * 18
    let blue = 112 + (index / 25 % 6) * 16
    if full || changedIndex == index {
      return Color.Rgb(
        (base + generation * 13 + index) % 220 + 24,
        (green + generation * 7 + index * 3) % 180 + 40,
        (blue + generation * 5 + index * 5) % 160 + 72)
    }
    return Color.Rgb(base, green, blue)
  }

  override func Build() Blob {
    let children = List[Blob](S15Q10Boxes)
    var index int32 = 0
    while index < S15Q10Boxes {
      let row = index / 25
      let column = index % 25
      children.Add(Container{
        Key: keys[index],
        Position: PositionType.Absolute,
        Left: float64(column) * 40.0,
        Top: float64(row) * 16.0,
        Width: 40.0,
        Height: 16.0,
        BorderRadius: if (index & 1) == 0 { 0.0 } else { 3.0 },
        BackgroundColor: BoxColor(index),
      })
      index = index + 1
    }
    return Container{
      Width: 1000,
      Height: 640,
      Position: PositionType.Relative,
      BackgroundColor: Color.Transparent,
      Children: children,
    }
  }
}

class S15Q10Scenario : Cell {
  private let workload string
  private let seed uint64
  private var table S15Q10TableRoot?
  private var topology S15Q10TopologyRoot?
  private var boxes S15Q10BoxesRoot?
  private var smallAnimation S15Q10SmallAnimationRoot?
  private var textEditing S15Q10TextEditingRoot?
  private var imageEffects S15Q10ImageEffectsRoot?
  private var resizeDpi S15Q10ResizeDpiRoot?

  private var revision int32

  prop Workload string { get { return workload } }
  prop InitialSettlementFrames int32 {
    get {
      return if workload == "image-effects" { 2 } else { 0 }
    }
  }
  prop Seed uint64 { get { return seed } }
  prop Root Cell { get { return this } }
  prop LogicalCount int64 {
    get {
      if let current = table { return current.LogicalCount }
      if let current = topology { return current.LogicalCount }
      if let current = boxes { return current.LogicalCount }
      if let current = smallAnimation { return current.LogicalCount }
      if let current = textEditing { return current.LogicalCount }
      if let current = imageEffects { return current.LogicalCount }
      if let current = resizeDpi { return current.LogicalCount }
      return 0L
    }
  }
  prop LogicalEdges int32 {
    get {
      if let current = topology { return current.LogicalEdges }
      if let current = smallAnimation { return current.LogicalEdges }
      if let current = textEditing { return current.LogicalEdges }
      if let current = imageEffects { return current.LogicalEdges }
      if let current = resizeDpi { return current.LogicalEdges }
      return 0
    }
  }
  prop VisibleEdges int32 {
    get {
      if let current = topology { return current.VisibleEdgeCount }
      if let current = resizeDpi { return current.VisibleEdges }
      return 0
    }
  }
  prop VisibleCount int32 {
    get {
      if let current = table { return current.VisibleCount }
      if let current = topology { return current.VisibleCount }
      if let current = boxes { return current.VisibleCount }
      if let current = smallAnimation { return current.VisibleCount }
      if let current = textEditing { return current.VisibleCount }
      if let current = imageEffects { return current.VisibleCount }
      if let current = resizeDpi { return current.VisibleCount }
      return 0
    }
  }
  prop MountedCount int32 {
    get {
      if let current = table { return current.MountedCount }
      if let current = topology { return current.MountedCount }
      if let current = boxes { return current.MountedCount }
      if let current = smallAnimation { return current.MountedCount }
      if let current = textEditing { return current.MountedCount }
      if let current = imageEffects { return current.MountedCount }
      if let current = resizeDpi { return current.MountedCount }
      return 0
    }
  }
  prop MountedBound int32 {
    get {
      if let current = table { return current.MountedBound }
      if let current = topology { return current.MountedBound }
      if let current = boxes { return current.MountedBound }
      if let current = smallAnimation { return current.MountedBound }
      if let current = textEditing { return current.MountedBound }
      if let current = imageEffects { return current.MountedBound }
      if let current = resizeDpi { return current.MountedBound }
      return 0
    }
  }
  prop MutationCount int32 {
    get {
      if let current = table { return current.MutationCount }
      if let current = topology { return current.MutationCount }
      if let current = boxes { return current.MutationCount }
      if let current = smallAnimation { return current.MutationCount }
      if let current = textEditing { return current.MutationCount }
      if let current = imageEffects { return current.MutationCount }
      if let current = resizeDpi { return current.MutationCount }
      return 0
    }
  }
  prop Width int32 {
    get {
      if let current = table { return current.Width }
      if let current = topology { return current.Width }
      if let current = boxes { return current.Width }
      if let current = smallAnimation { return current.Width }
      if let current = textEditing { return current.Width }
      if let current = imageEffects { return current.Width }
      if let current = resizeDpi { return current.Width }
      return 0
    }
  }
  prop Height int32 {
    get {
      if let current = table { return current.Height }
      if let current = topology { return current.Height }
      if let current = boxes { return current.Height }
      if let current = smallAnimation { return current.Height }
      if let current = textEditing { return current.Height }
      if let current = imageEffects { return current.Height }
      if let current = resizeDpi { return current.Height }
      return 0
    }
  }

  init(selected string) {
    revision = 0
    workload = selected
    seed = if selected == "table" {
      2654435761uL
    } else if selected == "topology" {
      2246822519uL
    } else if selected == "small-animation" {
      1103515245uL
    } else if selected == "text-editing" {
      3266489917uL
    } else if selected == "image-effects" {
      668265263uL
    } else if selected == "resize-dpi" {
      374761393uL
    } else {
      668265263uL
    }
    if selected == "table" {
      let value = S15Q10TableRoot(seed)
      table = value
    } else if selected == "topology" {
      let value = S15Q10TopologyRoot(seed)
      topology = value
    } else if selected == "boxes-sparse" {
      let value = S15Q10BoxesRoot(seed, false)
      boxes = value
    } else if selected == "boxes-full" {
      let value = S15Q10BoxesRoot(seed, true)
      boxes = value
    } else if selected == "small-animation" {
      let value = S15Q10SmallAnimationRoot(seed)
      smallAnimation = value
    } else if selected == "text-editing" {
      let value = S15Q10TextEditingRoot(seed)
      textEditing = value
    } else if selected == "image-effects" {
      let value = S15Q10ImageEffectsRoot()
      imageEffects = value
    } else if selected == "resize-dpi" {
      let value = S15Q10ResizeDpiRoot(seed)
      resizeDpi = value
    } else {
      let value = S15Q10BoxesRoot(seed, true)
      boxes = value
    }
  }

  func Advance(frame int32) {
    if let current = table {
      current.Advance(frame)
    } else if let current = topology {
      current.Advance(frame)
    } else if let current = boxes {
      current.Advance(frame)
    } else if let current = smallAnimation {
      current.Advance(frame)
    } else if let current = textEditing {
      current.Advance(frame)
    } else if let current = imageEffects {
      current.Advance(frame)
    } else if let current = resizeDpi {
      current.Advance(frame)
    }
    revision = revision + 1
    Rebuild()
  }

  func PrepareWindow(window Window, frame int32) {
    if let current = resizeDpi {
      current.Transition(frame)
      var metrics = WindowReadbackTestFixture.Metrics(window)
      if metrics.LogicalWidth != current.Width
        || metrics.LogicalHeight != current.Height
        || metrics.FramebufferWidth != current.FramebufferWidth
        || metrics.FramebufferHeight != current.FramebufferHeight{
          let resized = WindowReadbackTestFixture.Resize(window, current.Width,
            current.Height, current.FramebufferWidth, current.FramebufferHeight)
          S14Require(resized,
            "S15 Q10 resize-dpi native resize failed at frame " + frame.ToString())
          metrics = WindowReadbackTestFixture.Metrics(window)
        }
      S14Require(metrics.LogicalWidth == current.Width
          && metrics.LogicalHeight == current.Height
          && metrics.FramebufferWidth == current.FramebufferWidth
          && metrics.FramebufferHeight == current.FramebufferHeight,
        "S15 Q10 resize-dpi metrics did not match root at frame "
        +frame.ToString())
    }
  }

  func AdvanceForWindow(frame int32, window Window) {
    PrepareWindow(window, frame)
    Advance(frame)
  }

  func DisposeOwnedResources() {
    if let current = imageEffects {
      current.DisposeSources()
    }
    if let current = resizeDpi {
      current.DisposeSource()
    }
  }

  override func Build() Blob {
    let currentRevision = revision
    if let current = table { return current.Build() }
    if let current = topology { return current.Build() }
    if let current = boxes { return current.Build() }
    if let current = smallAnimation { return current.Build() }
    if let current = textEditing { return current.Build() }
    if let current = imageEffects { return current.Build() }
    if let current = resizeDpi { return current.Build() }
    return Container{}
  }

  func Invariant() bool {
    let common = MountedCount >= 0 && MountedCount <= MountedBound
      && VisibleCount >= 0 && VisibleCount <= MountedBound
      && (LogicalEdges == 0 || VisibleEdges > 0)
    if let current = smallAnimation { return common && current.Invariant() }
    if let current = textEditing { return common && current.Invariant() }
    if let current = imageEffects { return common && current.Invariant() }
    if let current = resizeDpi { return common && current.Invariant() }
    return common
  }
}

data struct S15Q10GpuStats {
  internal var Count int32
  internal var P50 int64
  internal var P95 int64
  internal var P99 int64
  internal var P999 int64
  internal var Worst int64
}

func S15Q10Value(value int64) uint64 -> if value < 0L { 0uL } else { uint64(value) }

func S15Q10Delta(after uint64, before uint64) uint64 -> if after >= before { after - before } else { 0uL }

func S15Q10MaxCount(values []int64, count int32) int64 {
  var maximum int64 = 0L
  var index int32 = 0
  while index < count {
    if values[index] > maximum {
      maximum = values[index]
    }
    index = index + 1
  }
  return maximum
}

func S15Q10PercentileCount(values []int64, count int32, percentile float64) int64 {
  if count <= 0 {
    return 0L
  }
  if count == values.Length {
    return S14Percentile(values, percentile)
  }
  let subset = [count]int64
  Array.Copy(values, subset, count)
  return S14Percentile(subset, percentile)
}

func S15Q10GpuStats(values []int64, count int32) S15Q10GpuStats -> S15Q10GpuStats {
  Count: count,
  P50: S15Q10PercentileCount(values, count, 0.50),
  P95: S15Q10PercentileCount(values, count, 0.95),
  P99: S15Q10PercentileCount(values, count, 0.99),
  P999: S15Q10PercentileCount(values, count, 0.999),
  Worst: S15Q10MaxCount(values, count),
}

func S15Q10Workload() string {
  let value = Environment.GetEnvironmentVariable("GOO_S15_Q10_WORKLOAD")
  if value == "table" || value == "topology" || value == "boxes-sparse"
    || value == "boxes-full" || value == "small-animation"
    || value == "text-editing" || value == "image-effects"
    || value == "resize-dpi" || value == "three-window"
    || value == "true-idle" {
      return value!!
    }
  throw InvalidOperationException(
    "GOO_S15_Q10_WORKLOAD must be table, topology, boxes-sparse, boxes-full, "
    +"small-animation, text-editing, image-effects, resize-dpi, "
    +"three-window, or true-idle")
}

func S15Q10ProcessWorkingSet(process Process) uint64 {
  process.Refresh()
  return S15Q10Value(process.WorkingSet64)
}

func S15Q10ProcessPrivateMemory(process Process) uint64 {
  process.Refresh()
  return S15Q10Value(process.PrivateMemorySize64)
}

func S15Q10ManagedLive() uint64 -> S15Q10Value(GC.GetTotalMemory(false))
func S15Q10ManagedRetained() uint64 -> S15Q10Value(GC.GetTotalMemory(true))

func S15Q10PrivateDirty() uint64 {
  let path = "/proc/self/smaps_rollup"
  if !File.Exists(path) {
    return 0uL
  }
  for line in File.ReadLines(path) {
    if line.StartsWith("Private_Dirty:") {
      var value = line.Substring(14).Trim()
      let separator = value.IndexOf(" ")
      if separator >= 0 {
        value = value.Substring(0, separator)
      }
      return UInt64.Parse(value) * 1024uL
    }
  }
  return 0uL
}

func RunS15Q10Benchmark() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let workload = S15Q10Workload()
  if workload == "three-window" {
    RunS15Q10ThreeWindowBenchmark()
    return
  }
  if workload == "true-idle" {
    RunS19IdleGate()
    return
  }
  let warmup = S14EnvCount("GOO_S15_Q10_WARMUP", 300, 300)
  let samples = S14EnvCount("GOO_S15_Q10_SAMPLES", 2000, 2000)
  S14Require(samples > 0, "GOO_S15_Q10_SAMPLES must be positive")
  let scenario = S15Q10Scenario(workload)
  let frameNs = [samples]int64
  let frameAllocations = [samples]int64
  let gpuNs = [samples]int64
  let process = Process.GetCurrentProcess()
  var sawSlot0 bool = false
  var sawSlot1 bool = false
  var gpuCount int32 = 0
  var timestampSupported bool = false
  var measurementStartFrame uint64 = 0uL
  var measurementEndFrame uint64 = 0uL
  var collectGpu bool = false
  var finalCounters VulkanDiagnosticCounterSnapshot
  var beforeCounters VulkanDiagnosticCounterSnapshot
  var finalScene VulkanSceneRetentionTestSnapshot
  var finalPrimitive VulkanPrimitiveFrameRetentionTestSnapshot
  var finalText VulkanTextFrameRetentionTestSnapshot
  var window Window? = nil
  var managedLiveStart uint64 = 0uL
  var managedLiveEnd uint64 = 0uL
  var managedLivePeak uint64 = 0uL
  var managedRetainedStart uint64 = 0uL
  var managedRetainedEnd uint64 = 0uL
  var workingSetStart uint64 = 0uL
  var workingSetEnd uint64 = 0uL
  var workingSetPeak uint64 = 0uL
  var privateMemoryStart uint64 = 0uL
  var privateMemoryEnd uint64 = 0uL
  var privateMemoryPeak uint64 = 0uL
  var privateDirtyStart uint64 = 0uL
  var privateDirtyEnd uint64 = 0uL
  var allocatorPeak uint64 = 0uL
  var vulkanMemoryPeak uint64 = 0uL
  var cachePeak uint64 = 0uL
  var imagePeak uint64 = 0uL
  var textAtlasPeak uint64 = 0uL
  var gen0Before int32 = 0
  var gen1Before int32 = 0
  var gen2Before int32 = 0
  var gen0After int32 = 0
  var gen1After int32 = 0
  var gen2After int32 = 0
  var pauseTicksBefore int64 = 0L
  var pauseTicksAfter int64 = 0L
  try {
    let opened = Window{
      Title: "Goo S15 Q10 " + workload,
      Width: scenario.Width,
      Height: scenario.Height,
      VSync: false,
      Root: scenario.Root,
    }
    window = opened
    opened.Open()
    WindowReadbackTestFixture.SetMainPassTimestampSink(opened,
      func(snapshot VulkanDiagnosticTimestampSnapshot) {
        if collectGpu && snapshot.frame > measurementStartFrame
          && (measurementEndFrame == 0uL || snapshot.frame <= measurementEndFrame)
          && gpuCount < gpuNs.Length{
            gpuNs[gpuCount] = int64(snapshot.elapsedNanoseconds)
            gpuCount = gpuCount + 1
          }
      })
    WindowReadbackTestFixture.ForceRender(opened, 0.0)

    S14Require(WindowReadbackTestFixture.CellMounted(scenario),
      "S15 Q10 scenario root is not mounted")
    var settlementIndex int32 = 0
    while settlementIndex < scenario.InitialSettlementFrames {
      WindowReadbackTestFixture.PumpNativeEvents()
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      settlementIndex = settlementIndex + 1
    }
    timestampSupported = WindowReadbackTestFixture.TimestampSupported(opened)
    var warmIndex int32 = 0
    while warmIndex < warmup {
      WindowReadbackTestFixture.PumpNativeEvents()
      scenario.AdvanceForWindow(warmIndex, opened)

      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      warmIndex = warmIndex + 1
    }
    measurementStartFrame = WindowReadbackTestFixture.DiagnosticFrameId(opened)
    collectGpu = true
    beforeCounters = WindowReadbackTestFixture.DiagnosticCounters(opened)
    managedRetainedStart = S15Q10ManagedRetained()
    managedLiveStart = S15Q10ManagedLive()
    workingSetStart = S15Q10ProcessWorkingSet(process)
    privateMemoryStart = S15Q10ProcessPrivateMemory(process)
    privateDirtyStart = S15Q10PrivateDirty()
    allocatorPeak = beforeCounters.allocatorBytes
    vulkanMemoryPeak = beforeCounters.vulkanDeviceMemoryBytes
    cachePeak = beforeCounters.cacheBytes
    imagePeak = beforeCounters.imagePeakResidentBytes
    textAtlasPeak = beforeCounters.textAtlasPeakResidentBytes
    gen0Before = GC.CollectionCount(0)
    gen1Before = GC.CollectionCount(1)
    gen2Before = GC.CollectionCount(2)
    pauseTicksBefore = GC.GetTotalPauseDuration().Ticks
    managedLivePeak = managedLiveStart
    workingSetPeak = workingSetStart
    privateMemoryPeak = privateMemoryStart
    var sampleIndex int32 = 0
    while sampleIndex < samples {
      WindowReadbackTestFixture.PumpNativeEvents()
      let countersBefore = WindowReadbackTestFixture.DiagnosticCounters(opened)
      let submissionsBefore = countersBefore.submitCount
      let presentsBefore = countersBefore.presentCount
      let allocatedBefore = GC.GetAllocatedBytesForCurrentThread()
      let start = Stopwatch.GetTimestamp()
      scenario.AdvanceForWindow(warmup + sampleIndex, opened)

      S14Require(WindowReadbackTestFixture.CellDirty(scenario),
        "S15 Q10 scenario root was not dirtied")
      var counters = WindowReadbackTestFixture.DiagnosticCounters(opened)
      var end int64 = 0L
      var allocatedAfter int64 = 0L
      var submitAttempt int32 = 0
      while counters.submitCount == submissionsBefore && submitAttempt < 1000 {
        WindowReadbackTestFixture.ForceRenderNonblocking(
          opened, submitAttempt == 0 ? 0.0166666666666667 : 0.0)
        end = Stopwatch.GetTimestamp()
        allocatedAfter = GC.GetAllocatedBytesForCurrentThread()
        WindowReadbackTestFixture.DrainWindowQueue(opened, 2000)
        counters = WindowReadbackTestFixture.DiagnosticCounters(opened)
        if counters.submitCount == submissionsBefore {
          WindowReadbackTestFixture.PumpNativeEvents()
        }
        submitAttempt = submitAttempt + 1
      }
      S14Require(counters.submitCount == submissionsBefore + 1uL,
        "S15 Q10 measured frame did not submit exactly once at sample "
        +sampleIndex.ToString())
      S14Require(counters.presentCount == presentsBefore + 1uL,
        "S15 Q10 measured frame did not present exactly once at sample "
        +sampleIndex.ToString())

      frameNs[sampleIndex] = S14TicksToNs(end - start)
      frameAllocations[sampleIndex] = allocatedAfter - allocatedBefore
      let live = S15Q10ManagedLive()
      let working = S15Q10ProcessWorkingSet(process)
      let privateMemory = S15Q10ProcessPrivateMemory(process)
      managedLiveEnd = live
      workingSetEnd = working
      privateMemoryEnd = privateMemory
      if live > managedLivePeak { managedLivePeak = live }
      if working > workingSetPeak { workingSetPeak = working }
      if privateMemory > privateMemoryPeak { privateMemoryPeak = privateMemory }
      let primitive = WindowReadbackTestFixture.PrimitiveFrameRetention(opened)
      let text = WindowReadbackTestFixture.TextFrameRetention(opened)
      if primitive.SlotIndex == 0 { sawSlot0 = true }
      if primitive.SlotIndex == 1 { sawSlot1 = true }
      finalPrimitive = primitive
      finalText = text
      finalScene = WindowReadbackTestFixture.SceneRetention(opened)
      finalCounters = counters
      if finalCounters.allocatorBytes > allocatorPeak {
        allocatorPeak = finalCounters.allocatorBytes
      }
      if finalCounters.vulkanDeviceMemoryBytes > vulkanMemoryPeak {
        vulkanMemoryPeak = finalCounters.vulkanDeviceMemoryBytes
      }
      if finalCounters.cacheBytes > cachePeak {
        cachePeak = finalCounters.cacheBytes
      }
      if finalCounters.imagePeakResidentBytes > imagePeak {
        imagePeak = finalCounters.imagePeakResidentBytes
      }
      if finalCounters.textAtlasPeakResidentBytes > textAtlasPeak {
        textAtlasPeak = finalCounters.textAtlasPeakResidentBytes
      }
      sampleIndex = sampleIndex + 1
    }
    measurementEndFrame = WindowReadbackTestFixture.DiagnosticFrameId(opened)
    var resolveIndex int32 = 0
    while resolveIndex < 2 {
      WindowReadbackTestFixture.PumpNativeEvents()
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      resolveIndex = resolveIndex + 1
    }
    collectGpu = false
    WindowReadbackTestFixture.SetMainPassTimestampSink(opened, nil)
    S14Require(sampleIndex == samples, "S15 Q10 sample count is incorrect")
    managedLiveEnd = S15Q10ManagedLive()
    workingSetEnd = S15Q10ProcessWorkingSet(process)
    privateMemoryEnd = S15Q10ProcessPrivateMemory(process)
    privateDirtyEnd = S15Q10PrivateDirty()
    managedRetainedEnd = S15Q10ManagedRetained()
    gen0After = GC.CollectionCount(0)
    gen1After = GC.CollectionCount(1)
    gen2After = GC.CollectionCount(2)
    pauseTicksAfter = GC.GetTotalPauseDuration().Ticks
    if managedLiveEnd > managedLivePeak { managedLivePeak = managedLiveEnd }
    if workingSetEnd > workingSetPeak { workingSetPeak = workingSetEnd }
    if privateMemoryEnd > privateMemoryPeak { privateMemoryPeak = privateMemoryEnd }
    S14Require(scenario.Invariant(), "S15 Q10 mounted bounds invariant failed")
    S14Require(sawSlot0 && sawSlot1, "S15 Q10 did not exercise both frame slots")
    if timestampSupported {
      S14Require(gpuCount == samples,
        "S15 Q10 did not resolve every measured GPU sample")
    }
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "S15 Q10 benchmark window did not close")
  } finally {
    collectGpu = false
    try {
      if let active = window {
        WindowReadbackTestFixture.SetMainPassTimestampSink(active, nil)
        if active.IsOpen {
          active.RequestClose()
          WindowReadbackTestFixture.ForceRender(active, 0.0)
        }
      }
    } finally {
      scenario.DisposeOwnedResources()
    }
  }
  let gpu = S15Q10GpuStats(gpuNs, gpuCount)
  var allocationSum int64 = 0L
  var index int32 = 0
  while index < samples {
    allocationSum = allocationSum + frameAllocations[index]
    index = index + 1
  }
  let allocationP50 = S15Q10PercentileCount(frameAllocations, samples, 0.50)
  let allocationP95 = S15Q10PercentileCount(frameAllocations, samples, 0.95)
  let allocationP99 = S15Q10PercentileCount(frameAllocations, samples, 0.99)
  let allocationP999 = S15Q10PercentileCount(frameAllocations, samples, 0.999)
  let allocationWorst = S15Q10MaxCount(frameAllocations, samples)
  let planDelta = S15Q10Delta(finalCounters.planCompileCount, beforeCounters.planCompileCount)
  let recordDelta = S15Q10Delta(finalCounters.recordCount, beforeCounters.recordCount)
  let submitDelta = S15Q10Delta(finalCounters.submitCount, beforeCounters.submitCount)
  let presentDelta = S15Q10Delta(finalCounters.presentCount, beforeCounters.presentCount)
  let damageDelta = S15Q10Delta(finalCounters.damageCount, beforeCounters.damageCount)
  let damageAreaDelta = S15Q10Delta(finalCounters.damageArea, beforeCounters.damageArea)
  Console.WriteLine("s15-q10: workload=" + workload
    +" seed=" + scenario.Seed.ToString()
    +" logical=" + scenario.LogicalCount.ToString()
    +" logical_edges=" + scenario.LogicalEdges.ToString()
    +" visible_edges=" + scenario.VisibleEdges.ToString()
    +" visible=" + scenario.VisibleCount.ToString()
    +" mounted=" + scenario.MountedCount.ToString()
    +" mounted_bound=" + scenario.MountedBound.ToString()
    +" mutations=" + scenario.MutationCount.ToString()
    +" warmup=" + warmup.ToString()
    +" samples=" + samples.ToString()
    +" cpu_p50_ns=" + S14Percentile(frameNs, 0.50).ToString()
    +" cpu_p95_ns=" + S14Percentile(frameNs, 0.95).ToString()
    +" cpu_p99_ns=" + S14Percentile(frameNs, 0.99).ToString()
    +" cpu_p999_ns=" + S14Percentile(frameNs, 0.999).ToString()
    +" cpu_worst_ns=" + S14Max(frameNs).ToString()
    +" managed_alloc_p50_B=" + allocationP50.ToString()
    +" managed_alloc_p95_B=" + allocationP95.ToString()
    +" managed_alloc_p99_B=" + allocationP99.ToString()
    +" managed_alloc_p999_B=" + allocationP999.ToString()
    +" managed_alloc_worst_B=" + allocationWorst.ToString()
    +" managed_alloc_total_B=" + allocationSum.ToString()
    +" managed_live_start_B=" + managedLiveStart.ToString()
    +" managed_live_end_B=" + managedLiveEnd.ToString()
    +" managed_live_peak_B=" + managedLivePeak.ToString()
    +" managed_retained_start_B=" + managedRetainedStart.ToString()
    +" managed_retained_end_B=" + managedRetainedEnd.ToString()
    +" working_set_start_B=" + workingSetStart.ToString()
    +" working_set_end_B=" + workingSetEnd.ToString()
    +" working_set_peak_B=" + workingSetPeak.ToString()
    +" private_memory_start_B=" + privateMemoryStart.ToString()
    +" private_memory_end_B=" + privateMemoryEnd.ToString()
    +" private_memory_peak_B=" + privateMemoryPeak.ToString()
    +" private_dirty_start_B=" + privateDirtyStart.ToString()
    +" private_dirty_end_B=" + privateDirtyEnd.ToString()
    +" allocator_current_B=" + finalCounters.allocatorBytes.ToString()
    +" allocator_peak_B=" + allocatorPeak.ToString()
    +" vk_memory_current_B=" + finalCounters.vulkanDeviceMemoryBytes.ToString()
    +" vk_memory_peak_B=" + vulkanMemoryPeak.ToString()
    +" image_current_B=" + finalCounters.imageResidentBytes.ToString()
    +" text_atlas_current_B=" + finalCounters.textAtlasResidentBytes.ToString()
    +" cache_current_B=" + finalCounters.cacheBytes.ToString()
    +" cache_peak_B=" + cachePeak.ToString()
    +" image_peak_B=" + imagePeak.ToString()
    +" text_atlas_peak_B=" + textAtlasPeak.ToString()
    +" gc_gen0_delta=" + (gen0After - gen0Before).ToString()
    +" gc_gen1_delta=" + (gen1After - gen1Before).ToString()
    +" gc_gen2_delta=" + (gen2After - gen2Before).ToString()
    +" gc_pause_ns=" + ((pauseTicksAfter - pauseTicksBefore) * 100L).ToString()
    +" managed_diagnostic_B=" + finalCounters.managedAllocatedBytes.ToString()
    +" vk_object_alloc_delta=" + S15Q10Delta(finalCounters.vulkanObjectAllocationCount,
      beforeCounters.vulkanObjectAllocationCount).ToString()
    +" vk_device_alloc_delta=" + S15Q10Delta(finalCounters.vulkanDeviceMemoryAllocationCount,
      beforeCounters.vulkanDeviceMemoryAllocationCount).ToString()
    +" plan_delta=" + planDelta.ToString()
    +" record_delta=" + recordDelta.ToString()
    +" submit_delta=" + submitDelta.ToString()
    +" present_delta=" + presentDelta.ToString()
    +" damage_delta=" + damageDelta.ToString()
    +" damage_area_delta=" + damageAreaDelta.ToString()
    +" damage_x=" + finalScene.DamageX.ToString()
    +" damage_y=" + finalScene.DamageY.ToString()
    +" damage_width=" + finalScene.DamageWidth.ToString()
    +" damage_height=" + finalScene.DamageHeight.ToString()
    +" primitive_written_B=" + finalPrimitive.TotalWrittenBytes.ToString()
    +" primitive_skipped_B=" + finalPrimitive.TotalSkippedBytes.ToString()
    +" primitive_dirty=" + finalPrimitive.TotalDirtyRecordCount.ToString()
    +" primitive_ranges=" + finalPrimitive.TotalUploadRangeCount.ToString()
    +" primitive_full_uploads=" + finalPrimitive.TotalFullUploads.ToString()
    +" primitive_mapped_writes=" + finalPrimitive.TotalMappedWrites.ToString()
    +" primitive_flushes=" + finalPrimitive.TotalFlushes.ToString()
    +" primitive_retained_reuse=" + finalPrimitive.TotalRetainedReuse.ToString()
    +" text_written_B=" + finalText.TotalWrittenBytes.ToString()
    +" text_skipped_B=" + finalText.TotalSkippedBytes.ToString()
    +" text_dirty=" + finalText.TotalDirtySegmentCount.ToString()
    +" text_ranges=" + finalText.TotalUploadRangeCount.ToString()
    +" text_full_uploads=" + finalText.TotalFullUploads.ToString()
    +" text_mapped_writes=" + finalText.TotalMappedWrites.ToString()
    +" text_flushes=" + finalText.TotalFlushes.ToString()
    +" text_retained_reuse=" + finalText.TotalRetainedReuse.ToString()
    +" gpu_supported=" + (timestampSupported ? "1" : "0")
    +" gpu_samples=" + gpu.Count.ToString()
    +" gpu_main_p50_ns=" + gpu.P50.ToString()
    +" gpu_main_p95_ns=" + gpu.P95.ToString()
    +" gpu_main_p99_ns=" + gpu.P99.ToString()
    +" gpu_main_p999_ns=" + gpu.P999.ToString()
    +" gpu_main_worst_ns=" + gpu.Worst.ToString()
    +" power_proxy=external"
    +" both_slots=" + (sawSlot0 && sawSlot1 ? "1" : "0")
    +" close=1")
}

func RunS15Q10StageTimestampGate() {
  const EffectsScopeCount int32 = 16
  const OffscreenScopeCount int32 = 8
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let warmup = S14EnvCount("GOO_S15_Q10_WARMUP", 300, 300)
  let samples = S14EnvCount("GOO_S15_Q10_SAMPLES", 2000, 2000)
  S14Require(samples > 0, "GOO_S15_Q10_SAMPLES must be positive")
  let scenario = S15Q10Scenario("image-effects")
  let expectedFrames = [samples]uint64
  let effectsSamples = [samples]int64
  let offscreenSamples = [samples]int64
  let captureCapacity = samples + 8
  let capturedEffectsFrames = [captureCapacity]uint64
  let capturedEffectsTicks = [captureCapacity]uint64
  let capturedEffectsNanoseconds = [captureCapacity]int64
  let capturedEffectsScopes = [captureCapacity]int32
  let capturedEffectsDrops = [captureCapacity]int32
  let capturedEffectsMatched = [captureCapacity]bool
  let capturedOffscreenFrames = [captureCapacity]uint64
  let capturedOffscreenTicks = [captureCapacity]uint64
  let capturedOffscreenNanoseconds = [captureCapacity]int64
  let capturedOffscreenScopes = [captureCapacity]int32
  let capturedOffscreenDrops = [captureCapacity]int32
  let capturedOffscreenMatched = [captureCapacity]bool
  var capturedEffectsCount int32 = 0
  var capturedOffscreenCount int32 = 0
  var captureOverflow bool = false
  var collectTimestamp bool = false
  var measurementStartFrame uint64 = 0uL
  var measurementEndFrame uint64 = 0uL
  var beforeCounters VulkanDiagnosticCounterSnapshot{}
  var finalCounters VulkanDiagnosticCounterSnapshot{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  var window Window? = nil
  try {
    let opened = Window{
      Title: "Goo S15 Q10 stage timestamps",
      Width: scenario.Width,
      Height: scenario.Height,
      VSync: false,
      Root: scenario.Root,
    }
    window = opened
    Console.SetError(capturedError)
    opened.Open()
    WindowReadbackTestFixture.SetAllTimestampSink(opened,
      func(snapshot VulkanDiagnosticTimestampSnapshot) {
        if !collectTimestamp || snapshot.frame <= measurementStartFrame
          || (measurementEndFrame != 0uL
              && snapshot.frame > measurementEndFrame) {
                return
              }
        if snapshot.stage == VulkanDiagnosticTimestampStage.Effects {
          if capturedEffectsCount >= capturedEffectsFrames.Length {
            captureOverflow = true
            return
          }
          capturedEffectsFrames[capturedEffectsCount] = snapshot.frame
          capturedEffectsTicks[capturedEffectsCount] = snapshot.elapsedTicks
          capturedEffectsNanoseconds[capturedEffectsCount] =
          int64(snapshot.elapsedNanoseconds)
          capturedEffectsScopes[capturedEffectsCount] = snapshot.scopeCount
          capturedEffectsDrops[capturedEffectsCount] =
          snapshot.droppedScopeCount
          capturedEffectsCount = capturedEffectsCount + 1
        } else if snapshot.stage == VulkanDiagnosticTimestampStage.Offscreen {
          if capturedOffscreenCount >= capturedOffscreenFrames.Length {
            captureOverflow = true
            return
          }
          capturedOffscreenFrames[capturedOffscreenCount] = snapshot.frame
          capturedOffscreenTicks[capturedOffscreenCount] = snapshot.elapsedTicks
          capturedOffscreenNanoseconds[capturedOffscreenCount] =
          int64(snapshot.elapsedNanoseconds)
          capturedOffscreenScopes[capturedOffscreenCount] = snapshot.scopeCount
          capturedOffscreenDrops[capturedOffscreenCount] =
          snapshot.droppedScopeCount
          capturedOffscreenCount = capturedOffscreenCount + 1
        }
      })
    scenario.AdvanceForWindow(0, opened)
    WindowReadbackTestFixture.ForceRender(opened, 0.0, 30.0)
    S14Require(WindowReadbackTestFixture.CellMounted(scenario),
      "S15 Q10 stage timestamp scenario root is not mounted")
    var settlementIndex int32 = 0
    while settlementIndex < scenario.InitialSettlementFrames {
      WindowReadbackTestFixture.PumpNativeEvents()
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      settlementIndex = settlementIndex + 1
    }
    S14Require(WindowReadbackTestFixture.TimestampSupported(opened),
      "S15 Q10 stage timestamps are unsupported")
    var warmIndex int32 = 0
    while warmIndex < warmup {
      WindowReadbackTestFixture.PumpNativeEvents()
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      warmIndex = warmIndex + 1
    }
    measurementStartFrame = WindowReadbackTestFixture.DiagnosticFrameId(opened)
    beforeCounters = WindowReadbackTestFixture.DiagnosticCounters(opened)
    collectTimestamp = true
    var sampleIndex int32 = 0
    while sampleIndex < samples {
      WindowReadbackTestFixture.PumpNativeEvents()
      let countersBefore = WindowReadbackTestFixture.DiagnosticCounters(opened)
      let submissionsBefore = countersBefore.submitCount
      let presentsBefore = countersBefore.presentCount
      var counters = countersBefore
      var submitAttempt int32 = 0
      while counters.submitCount == submissionsBefore && submitAttempt < 1000 {
        WindowReadbackTestFixture.ForceRenderNonblocking(
          opened, submitAttempt == 0 ? 0.0166666666666667 : 0.0)
        WindowReadbackTestFixture.DrainWindowQueue(opened, 2000)
        counters = WindowReadbackTestFixture.DiagnosticCounters(opened)
        if counters.submitCount == submissionsBefore {
          WindowReadbackTestFixture.PumpNativeEvents()
        }
        submitAttempt = submitAttempt + 1
      }
      S14Require(counters.submitCount == submissionsBefore + 1uL,
        "S15 Q10 stage timestamp frame did not submit exactly once")
      S14Require(counters.presentCount == presentsBefore + 1uL,
        "S15 Q10 stage timestamp frame did not present exactly once")
      S14Require(S15Q10Delta(counters.vulkanObjectAllocationCount,
        countersBefore.vulkanObjectAllocationCount) == 0uL,
        "S15 Q10 stage timestamp frame created a Vulkan object")
      S14Require(S15Q10Delta(counters.vulkanDeviceMemoryAllocationCount,
        countersBefore.vulkanDeviceMemoryAllocationCount) == 0uL,
        "S15 Q10 stage timestamp frame allocated Vulkan device memory")
      expectedFrames[sampleIndex] =
      WindowReadbackTestFixture.DiagnosticFrameId(opened)
      if sampleIndex > 0 {
        S14Require(expectedFrames[sampleIndex] > expectedFrames[sampleIndex - 1],
          "S15 Q10 stage timestamp completed-frame ids are not strictly ordered")
      }
      sampleIndex = sampleIndex + 1
    }
    measurementEndFrame = WindowReadbackTestFixture.DiagnosticFrameId(opened)
    var resolveIndex int32 = 0
    while resolveIndex < 8
      && (capturedEffectsCount < samples
          || capturedOffscreenCount < samples) {
            WindowReadbackTestFixture.PumpNativeEvents()
            WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
            resolveIndex = resolveIndex + 1
          }
    collectTimestamp = false
    WindowReadbackTestFixture.SetAllTimestampSink(opened, nil)
    S14Require(!captureOverflow,
      "S15 Q10 stage timestamp capture buffer overflowed")
    S14Require(capturedEffectsCount == samples
        && capturedOffscreenCount == samples,
      "S15 Q10 stage timestamp did not resolve every measured stage sample")
    var matchedIndex int32 = 0
    while matchedIndex < samples {
      var effectsMatches int32 = 0
      var offscreenMatches int32 = 0
      var capturedIndex int32 = 0
      while capturedIndex < capturedEffectsCount {
        if !capturedEffectsMatched[capturedIndex]
          && capturedEffectsFrames[capturedIndex] == expectedFrames[matchedIndex]{
            S14Require(capturedEffectsTicks[capturedIndex] > 0uL
                && capturedEffectsNanoseconds[capturedIndex] > 0L
                && capturedEffectsScopes[capturedIndex] == EffectsScopeCount
                && capturedEffectsDrops[capturedIndex] == 0,
              "S15 Q10 stage timestamp Effects aggregate is invalid at frame "
              +expectedFrames[matchedIndex].ToString())
            effectsSamples[matchedIndex] =
            capturedEffectsNanoseconds[capturedIndex]
            capturedEffectsMatched[capturedIndex] = true
            effectsMatches = effectsMatches + 1
          }
        capturedIndex = capturedIndex + 1
      }
      capturedIndex = 0
      while capturedIndex < capturedOffscreenCount {
        if !capturedOffscreenMatched[capturedIndex]
          && capturedOffscreenFrames[capturedIndex]
        == expectedFrames[matchedIndex]{
          S14Require(capturedOffscreenTicks[capturedIndex] > 0uL
              && capturedOffscreenNanoseconds[capturedIndex] > 0L
              && capturedOffscreenScopes[capturedIndex] == OffscreenScopeCount
              && capturedOffscreenDrops[capturedIndex] == 0,
            "S15 Q10 stage timestamp Offscreen aggregate is invalid at frame "
            +expectedFrames[matchedIndex].ToString())
          offscreenSamples[matchedIndex] =
          capturedOffscreenNanoseconds[capturedIndex]
          capturedOffscreenMatched[capturedIndex] = true
          offscreenMatches = offscreenMatches + 1
        }
        capturedIndex = capturedIndex + 1
      }
      S14Require(effectsMatches == 1 && offscreenMatches == 1,
        "S15 Q10 stage timestamp frame did not match exactly once at frame "
        +expectedFrames[matchedIndex].ToString())
      matchedIndex = matchedIndex + 1
    }
    finalCounters = WindowReadbackTestFixture.DiagnosticCounters(opened)
    S14Require(S15Q10Delta(finalCounters.vulkanObjectAllocationCount,
      beforeCounters.vulkanObjectAllocationCount) == 0uL,
      "S15 Q10 stage timestamp warm frames created a Vulkan object")
    S14Require(S15Q10Delta(finalCounters.vulkanDeviceMemoryAllocationCount,
      beforeCounters.vulkanDeviceMemoryAllocationCount) == 0uL,
      "S15 Q10 stage timestamp warm frames allocated Vulkan device memory")
    S14Require(scenario.Invariant(),
      "S15 Q10 stage timestamp scenario invariant failed")
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen,
      "S15 Q10 stage timestamp gate window did not close")
  } finally {
    collectTimestamp = false
    try {
      if let active = window {
        WindowReadbackTestFixture.SetAllTimestampSink(active, nil)
        if active.IsOpen {
          active.RequestClose()
          WindowReadbackTestFixture.ForceRender(active, 0.0)
        }
      }
    } finally {
      try {
        scenario.DisposeOwnedResources()
      } finally {
        Console.SetError(originalError)
      }
    }
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  let effects = S15Q10GpuStats(effectsSamples, samples)
  let offscreen = S15Q10GpuStats(offscreenSamples, samples)
  let warmObjectAllocations = S15Q10Delta(
    finalCounters.vulkanObjectAllocationCount,
    beforeCounters.vulkanObjectAllocationCount)
  let warmDeviceMemoryAllocations = S15Q10Delta(
    finalCounters.vulkanDeviceMemoryAllocationCount,
    beforeCounters.vulkanDeviceMemoryAllocationCount)
  Console.WriteLine("s15-q10-stage-timestamp: workload=image-effects"
    +" seed=" + scenario.Seed.ToString()
    +" warmup=" + warmup.ToString()
    +" samples=" + samples.ToString()
    +" effects_p50_ns=" + effects.P50.ToString()
    +" effects_p95_ns=" + effects.P95.ToString()
    +" effects_p99_ns=" + effects.P99.ToString()
    +" effects_worst_ns=" + effects.Worst.ToString()
    +" effects_scope_count=" + EffectsScopeCount.ToString()
    +" effects_dropped_scope_count=0"
    +" offscreen_p50_ns=" + offscreen.P50.ToString()
    +" offscreen_p95_ns=" + offscreen.P95.ToString()
    +" offscreen_p99_ns=" + offscreen.P99.ToString()
    +" offscreen_worst_ns=" + offscreen.Worst.ToString()
    +" offscreen_scope_count=" + OffscreenScopeCount.ToString()
    +" offscreen_dropped_scope_count=0"
    +" exact_completed_frames=1"
    +" timestamp_supported=1"
    +" validation_clean=1"
    +" warm_vk_object_alloc_delta=" + warmObjectAllocations.ToString()
    +" warm_vk_device_memory_alloc_delta="
    +warmDeviceMemoryAllocations.ToString()
    +" close=1")
}
