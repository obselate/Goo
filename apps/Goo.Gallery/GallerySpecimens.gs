package GooGallery

import System
import System.Collections.Generic
import Gsharp.Extensions.Go
import Goo

class GallerySpecimenTile {
  internal let Index int32
  internal let Value int32

  init(index int32, value int32) {
    Index = index
    Value = value
  }
}

class GalleryTileWorkerResult {
  internal let Index int32
  internal let Rank int64

  init(index int32, rank int64) {
    Index = index
    Rank = rank
  }
}

func GalleryRankTile(index int32, value int32, generation int32, output chan GalleryTileWorkerResult) {
  var rank = int64(index + 1) * 104729 + int64(value + generation) * 13007
  var iteration int32 = 0
  while iteration < 4096 {
    rank = (rank * 48271 + int64(value * 97 + iteration)) % 2147483629
    iteration = iteration + 1
  }
  output <- GalleryTileWorkerResult(index: index, rank: rank)
}

private data struct GalleryFibonacciPlacement(Left float64, Top float64, Size float64) { }

private func galleryFibonacciBasePlacement(slot int32) GalleryFibonacciPlacement {
  if slot == 0 {
    return GalleryFibonacciPlacement(24.0, 5.0, 1.0)
  }
  if slot == 1 {
    return GalleryFibonacciPlacement(25.0, 5.0, 1.0)
  }
  if slot == 2 {
    return GalleryFibonacciPlacement(24.0, 6.0, 2.0)
  }
  if slot == 3 {
    return GalleryFibonacciPlacement(21.0, 5.0, 3.0)
  }
  if slot == 4 {
    return GalleryFibonacciPlacement(21.0, 0.0, 5.0)
  }
  if slot == 5 {
    return GalleryFibonacciPlacement(26.0, 0.0, 8.0)
  }
  if slot == 6 {
    return GalleryFibonacciPlacement(21.0, 8.0, 13.0)
  }
  return GalleryFibonacciPlacement(0.0, 0.0, 21.0)
}

private func galleryFibonacciPlacement(slot int32, orientation int32) GalleryFibonacciPlacement {
  let placement = galleryFibonacciBasePlacement(slot)
  if orientation == 1 {
    return GalleryFibonacciPlacement(
      21.0 - placement.Top - placement.Size,
      placement.Left,
      placement.Size)
  }
  if orientation == 2 {
    return GalleryFibonacciPlacement(
      34.0 - placement.Left - placement.Size,
      21.0 - placement.Top - placement.Size,
      placement.Size)
  }
  if orientation == 3 {
    return GalleryFibonacciPlacement(
      placement.Top,
      34.0 - placement.Left - placement.Size,
      placement.Size)
  }
  return placement
}

class GalleryTypeClock : Simulation {
  private let offset float64

  public init(offset float64) {
    this.offset = offset
  }

  /// Gets the scalar coordinate at the specified elapsed time.
  public override func Position(elapsed float64) float64 -> offset + elapsed

  /// Gets the rate of change of progress at the specified elapsed time.
  public override func Velocity(elapsed float64) float64 -> 1.0

  /// Gets whether the simulation has settled at the specified elapsed time.
  public override func Done(elapsed float64) bool -> false
}

func GalleryTypeClockSpec(start float64, target float64, velocity float64) Simulation -> GalleryTypeClock(start)

class GalleryMotionSimulation : Simulation {
  private let from float64
  private let to float64
  private let duration float64

  public init(start float64, target float64, velocity float64) {
    from = start
    to = target
    duration = 2.4
  }

  /// Gets the scalar coordinate at the specified elapsed time.
  public override func Position(elapsed float64) float64 {
    if elapsed <= 0.0 {
      return from
    }
    if elapsed >= duration {
      return to
    }
    let progress = elapsed / duration
    let eased = if progress < 0.5 {
      2.0 * progress * progress
    } else {
      1.0 - Math.Pow(-2.0 * progress + 2.0, 2.0) / 2.0
    }
    return from + (to - from) * eased
  }

  /// Gets the rate of change of progress at the specified elapsed time.
  public override func Velocity(elapsed float64) float64 {
    if elapsed <= 0.0 || elapsed >= duration {
      return 0.0
    }
    let progress = elapsed / duration
    let slope = if progress < 0.5 {
      4.0 * progress
    } else {
      4.0 * (1.0 - progress)
    }
    return (to - from) * slope / duration
  }

  /// Gets whether the simulation has settled at the specified elapsed time.
  public override func Done(elapsed float64) bool -> elapsed >= duration
}

func GalleryMotionSpec(start float64, target float64, velocity float64) Simulation ->
GalleryMotionSimulation(start, target, velocity)

func GallerySpecimen(name string, hint string, content Blob) Container {
  let frameChildren = List[Blob]()
  frameChildren.Add(Container{
    Key: "spec-name",
    Children: { GalleryTheme.SpecimenName(name) },
  })
  frameChildren.Add(Container{
    Key: "spec-content",
    Children: { content },
  })
  frameChildren.Add(GalleryTheme.Hint(hint))
  let frame = GalleryTheme.Frame(frameChildren)
  return Container{
    Width: Length.Percent(100),
    Color: Color.Transparent,
    Focusable: true,
    TransitionMs: 100.0,
    Hover: Style{ Color: GalleryTheme.InkSubtle },
    Focus: Style{
      Color: GalleryTheme.InkSubtle,
      OutlineWidth: 1,
      OutlineColor: GalleryTheme.BorderStrong,
    },
    Children: { frame },
  }
}

class GalleryPosterReflowSimulation : Simulation {
  private let from float64
  private let to float64
  private let duration float64

  init(start float64, target float64, velocity float64) {
    from = start
    to = target
    duration = 0.22
  }

  /// Gets the eased reflow coordinate.
  public override func Position(elapsed float64) float64 {
    if elapsed <= 0.0 {
      return from
    }
    if elapsed >= duration {
      return to
    }
    let remaining = 1.0 - elapsed / duration
    let eased = 1.0 - remaining * remaining * remaining
    return from + (to - from) * eased
  }

  /// Gets the eased reflow velocity.
  public override func Velocity(elapsed float64) float64 {
    if elapsed <= 0.0 || elapsed >= duration {
      return 0.0
    }
    let remaining = 1.0 - elapsed / duration
    return (to - from) * 3.0 * remaining * remaining / duration
  }

  /// Gets whether the reflow has settled.
  public override func Done(elapsed float64) bool -> elapsed >= duration
}

func GalleryPosterReflowSpec(start float64, target float64, velocity float64) Simulation ->
GalleryPosterReflowSimulation(start, target, velocity)

class GalleryPosterTransitions {
  shared {
    internal let Frame []TransitionProperty = []TransitionProperty{
      TransitionProperty.Width,
      TransitionProperty.Height,
    }
    internal let Module []TransitionProperty = []TransitionProperty{
      TransitionProperty.Height,
      TransitionProperty.FlexBasis,
    }
    internal let Marker []TransitionProperty = []TransitionProperty{
      TransitionProperty.Width,
      TransitionProperty.Height,
      TransitionProperty.BorderRadius,
    }
    internal let Type []TransitionProperty = []TransitionProperty{ TransitionProperty.FontSize }
  }
}

class GalleryPosterReflowItem {
  private let handle ElementHandle
  private let offset Anim[Point]
  private var layout Point
  private var initialized bool

  init(animatedOffset Anim[Point]) {
    handle = ElementHandle{}
    offset = animatedOffset
    layout = Point{}
    initialized = false
    handle.MetricsChanged += trackMetrics
  }

  internal prop Handle ElementHandle{ get -> handle }

  internal prop Offset Point{ get -> offset.Value }

  internal func Dispose() {
    handle.MetricsChanged -= trackMetrics
  }

  private func trackMetrics(metrics ElementMetrics) {
    if !metrics.IsMounted {
      initialized = false
      return
    }
    let current = offset.Value
    let next = Point{
      X: metrics.BorderBox.X - current.X,
      Y: metrics.BorderBox.Y - current.Y,
    }
    if !initialized {
      layout = next
      initialized = true
      return
    }
    let delta = Point{
      X: layout.X - next.X,
      Y: layout.Y - next.Y,
    }
    layout = next
    if Math.Abs(delta.X) < 0.01 && Math.Abs(delta.Y) < 0.01 {
      return
    }
    offset.Snap(Point{
      X: current.X + delta.X,
      Y: current.Y + delta.Y,
    })
    offset.To(Point{}, GalleryPosterReflowSpec)
  }
}

internal data struct ComposeChapterInput {
  internal var Showcase int32
}

open class ComposeChapter : Cell[ComposeChapterInput], IDisposable {

  private let tiles List[GallerySpecimenTile]
  private var rotation float64
  private var posterWidth float64
  private var orientation int32
  private var shuffleState int64
  private var workerGeneration int32
  private let posterFormReflow GalleryPosterReflowItem
  private let posterAlignReflow GalleryPosterReflowItem
  private let posterFlowReflow GalleryPosterReflowItem
  private let posterGapReflow GalleryPosterReflowItem
  private let posterWrapReflow GalleryPosterReflowItem

  public init() {
    tiles = List[GallerySpecimenTile](8)
    tiles.Add(GallerySpecimenTile(index: 0, value: 1))
    tiles.Add(GallerySpecimenTile(index: 1, value: 1))
    tiles.Add(GallerySpecimenTile(index: 2, value: 2))
    tiles.Add(GallerySpecimenTile(index: 3, value: 3))
    tiles.Add(GallerySpecimenTile(index: 4, value: 5))
    tiles.Add(GallerySpecimenTile(index: 5, value: 8))
    tiles.Add(GallerySpecimenTile(index: 6, value: 13))
    tiles.Add(GallerySpecimenTile(index: 7, value: 21))
    posterFormReflow = GalleryPosterReflowItem(Animate(Point{}))
    posterAlignReflow = GalleryPosterReflowItem(Animate(Point{}))
    posterFlowReflow = GalleryPosterReflowItem(Animate(Point{}))
    posterGapReflow = GalleryPosterReflowItem(Animate(Point{}))
    posterWrapReflow = GalleryPosterReflowItem(Animate(Point{}))
    rotation = 0.0
    posterWidth = 580.0
    orientation = 0
    shuffleState = 173
    workerGeneration = 0
  }

  /// Releases poster geometry subscriptions.
  public func Dispose() {
    posterFormReflow.Dispose()
    posterAlignReflow.Dispose()
    posterFlowReflow.Dispose()
    posterGapReflow.Dispose()
    posterWrapReflow.Dispose()
  }

  private func rotateTiles() {
    rotation = rotation + 90.0
    Rebuild()
  }

  private func cycleOrientation() {
    orientation = (orientation + 1) % 4
    Rebuild()
  }

  private func swapEnds() {
    if tiles.Count < 2 {
      return
    }
    let last = tiles.Count - 1
    let firstTile = tiles[0]
    tiles[0] = tiles[last]
    tiles[last] = firstTile
    Rebuild()
  }

  private func shuffleTiles() {
    var index = tiles.Count - 1
    while index > 0 {
      shuffleState = (shuffleState * 1103515245 + 12345) % 2147483629
      let target = int32(shuffleState % int64(index + 1))
      let moved = tiles[index]
      tiles[index] = tiles[target]
      tiles[target] = moved
      index = index - 1
    }
    Rebuild()
  }

  private func runWorkers() {
    workerGeneration = workerGeneration + 1
    let count = tiles.Count
    let generation = workerGeneration
    let output = make(chan GalleryTileWorkerResult, count)
    scope {
      var index int32 = 0
      while index < count {
        let tile = tiles[index]
        go GalleryRankTile(tile.Index, tile.Value, generation, output)
        index = index + 1
      }
    }

    let results = List[GalleryTileWorkerResult](count)
    var received int32 = 0
    while received < count {
      results.Add(<- output)
      received = received + 1
    }
    var left int32 = 0
    while left < results.Count - 1 {
      var right = left + 1
      while right < results.Count {
        let before = results[right].Rank < results[left].Rank ||
        results[right].Rank == results[left].Rank && results[right].Index < results[left].Index
        if before {
          let result = results[left]
          results[left] = results[right]
          results[right] = result
        }
        right = right + 1
      }
      left = left + 1
    }

    let ordered = List[GallerySpecimenTile](count)
    for result in results {
      for tile in tiles {
        if tile.Index == result.Index {
          ordered.Add(tile)
        }
      }
    }
    tiles.Clear()
    for tile in ordered {
      tiles.Add(tile)
    }
    Rebuild()
  }

  private func orientationName() string {
    if orientation == 0 {
      return "landscape"
    }
    if orientation == 1 {
      return "portrait"
    }
    if orientation == 2 {
      return "landscape flipped"
    }
    return "portrait flipped"
  }

  private func tileContent() Blob {
    let shownRotation = int32(rotation) % 360
    let controls = Container{
      FlexDirection: FlexDirection.Row,
      FlexWrap: FlexWrap.Wrap,
      Gap: 8,
      Children: {
        GalleryTheme.GhostButton("Orientation: " + orientationName(), () -> cycleOrientation()),
        GalleryTheme.GhostButton("Rotate 90° · " + shownRotation.ToString() + "°", () -> rotateTiles()),
        GalleryTheme.GhostButton("Swap ends", () -> swapEnds()),
        GalleryTheme.GhostButton("Shuffle", () -> shuffleTiles()),
        GalleryTheme.GhostButton("Go workers", () -> runWorkers()),
      },
    }
    let spiral = Container{
      Height: Length.Percent(100),
      MaxWidth: Length.Percent(100),
      MinWidth: 0,
      MinHeight: 0,
      AspectRatio: if orientation % 2 == 0 { 34.0 / 21.0 } else { 21.0 / 34.0 },
      Position: PositionType.Relative,
      OverflowX: Overflow.Hidden,
      OverflowY: Overflow.Hidden,
      BackgroundColor: Color.Rgb(8, 8, 10),
      BorderWidth: 1,
      BorderColor: GalleryTheme.BorderStrong,
      BorderRadius: 8,
      Children: buildTiles(),
    }
    let grid = Container{
      Width: Length.Percent(100),
      MinWidth: 0,
      MinHeight: 0,
      FlexGrow: 1.0,
      FlexShrink: 1.0,
      AlignItems: AlignItems.Center,
      JustifyContent: JustifyContent.Center,
      Children: { spiral },
    }
    return Container{
      Width: Length.Percent(100),
      Height: 430,
      MinHeight: 0,
      FlexDirection: FlexDirection.Column,
      Gap: 14,
      Children: { controls, grid },
    }
  }

  private func buildTiles() List[Blob] {
    let children = List[Blob](tiles.Count)
    let layoutWidth = if orientation % 2 == 0 { 34.0 } else { 21.0 }
    let layoutHeight = if orientation % 2 == 0 { 21.0 } else { 34.0 }
    var slot int32 = 0
    for tile in tiles {
      let placement = galleryFibonacciPlacement(slot, orientation)
      let fill = if tile.Value % 3 == 0 {
        Color.Rgb(225, 112, 80)
      } else {
        if tile.Value % 3 == 1 {
          Color.Rgb(74, 159, 168)
        } else {
          Color.Rgb(202, 164, 70)
        }
      }
      children.Add(Container{
        Key: "tile-" + tile.Index.ToString(),
        Position: PositionType.Absolute,
        Left: Length.Percent(placement.Left / layoutWidth * 100.0),
        Top: Length.Percent(placement.Top / layoutHeight * 100.0),
        Width: Length.Percent(placement.Size / layoutWidth * 100.0),
        Height: Length.Percent(placement.Size / layoutHeight * 100.0),
        MinWidth: 0,
        MinHeight: 0,
        BorderWidth: 1,
        BorderColor: Color.Rgba(8, 8, 10, 180),
        BackgroundColor: fill,
        Transform: PanelTransform{ Rotate: rotation },
        TransitionMs: 350.0,
        TransitionEasing: Easing.EaseInOut,
        JustifyContent: JustifyContent.Center,
        AlignItems: AlignItems.Center,
        OverflowX: Overflow.Hidden,
        OverflowY: Overflow.Hidden,
        Children: {
          Text{
            Content: tile.Value.ToString(),
            FontSize: if slot < 2 { 8 } else { if slot < 4 { 10 } else { 14 } },
            FontWeight: 700,
            Color: Color.Rgb(10, 10, 11),
          },
        },
      })
      slot = slot + 1
    }
    return children
  }

  private func posterContent() Blob {
    let narrowPoster = posterWidth < 540.0
    let paper = Color.Rgb(238, 233, 219)
    let ink = Color.Rgb(12, 13, 15)
    let blue = Color.Rgb(63, 86, 235)
    let acid = Color.Rgb(211, 239, 80)
    let coral = Color.Rgb(244, 92, 70)
    let formOffset = posterFormReflow.Offset
    let alignOffset = posterAlignReflow.Offset
    let flowOffset = posterFlowReflow.Offset
    let gapOffset = posterGapReflow.Offset
    let wrapOffset = posterWrapReflow.Offset
    return Container{
      Width: Length.Percent(100),
      FlexDirection: FlexDirection.Column,
      Gap: 14,
      Children: {
        Cell.Mount[GalleryRange]("poster-width", func(slider GalleryRange) {
          slider.Label = "Poster width"
          slider.MinValue = 320.0
          slider.MaxValue = 860.0
          slider.Value = posterWidth
          slider.Step = 10.0
          slider.OnChange = (value float64) -> {
            posterWidth = value
            Rebuild()
          }
        }),
        Container{
          Key: "poster-stage",
          Width: Length.Percent(100),
          MinWidth: 0,
          AlignItems: AlignItems.Center,
          JustifyContent: JustifyContent.Center,
          Children: {
            Container{
              Key: "poster",
              Width: posterWidth,
              MaxWidth: Length.Percent(100),
              MinWidth: 0,
              Height: if narrowPoster { 360 } else { 330 },
              TransitionMs: 180.0,
              TransitionEasing: Easing.EaseInOut,
              TransitionProperties: GalleryPosterTransitions.Frame,
              Position: PositionType.Relative,
              FlexDirection: FlexDirection.Column,
              BackgroundColor: ink,
              BorderWidth: 1,
              BorderColor: Color.Rgb(88, 88, 94),
              OverflowX: Overflow.Hidden,
              OverflowY: Overflow.Hidden,
              Children: {
                Container{
                  Key: "poster-head",
                  Width: Length.Percent(100),
                  Height: 46,
                  MinHeight: 46,
                  PaddingLeft: 14,
                  PaddingRight: 14,
                  FlexDirection: FlexDirection.Row,
                  AlignItems: AlignItems.Center,
                  JustifyContent: JustifyContent.SpaceBetween,
                  BackgroundColor: paper,
                  BorderBottomWidth: 2,
                  BorderColor: ink,
                  Children: {
                    Text{
                      Content: "MODULAR / SYSTEM 03",
                      FontSize: 10,
                      FontWeight: 750,
                      LetterSpacing: 1.1,
                      Color: ink,
                    },
                    Text{
                      Content: int32(posterWidth).ToString() + " PX",
                      FontSize: 10,
                      FontWeight: 750,
                      LetterSpacing: 1.1,
                      Color: ink,
                    },
                  },
                },
                Container{
                  Key: "poster-grid",
                  Width: Length.Percent(100),
                  MinWidth: 0,
                  MinHeight: 0,
                  FlexGrow: 1.0,
                  FlexShrink: 1.0,
                  Padding: 6,
                  FlexDirection: FlexDirection.Row,
                  FlexWrap: FlexWrap.Wrap,
                  Gap: 6,
                  RowGap: 6,
                  ColumnGap: 6,
                  AlignItems: AlignItems.Stretch,
                  AlignContent: AlignContent.SpaceBetween,
                  BackgroundColor: ink,
                  Children: {
                    Container{
                      Key: "poster-form",
                      Handle: posterFormReflow.Handle,
                      Transform: PanelTransform{
                        TranslateX: formOffset.X,
                        TranslateY: formOffset.Y,
                      },
                      Height: if narrowPoster { 120 } else { 160 },
                      FlexGrow: 3.0,
                      FlexShrink: 1.0,
                      FlexBasis: if narrowPoster { 280 } else { 300 },
                      TransitionMs: 180.0,
                      TransitionEasing: Easing.EaseInOut,
                      TransitionProperties: GalleryPosterTransitions.Module,
                      MinWidth: 180,
                      Padding: 14,
                      FlexDirection: FlexDirection.Column,
                      JustifyContent: JustifyContent.SpaceBetween,
                      BackgroundColor: blue,
                      Children: {
                        Text{
                          Content: "FLEX-GROW 3 / BASIS 300",
                          FontSize: 9,
                          FontWeight: 700,
                          LetterSpacing: 0.9,
                          Color: paper,
                        },
                        Text{
                          Content: "FORM",
                          FontSize: if narrowPoster { 40 } else { 58 },
                          TransitionMs: 180.0,
                          TransitionEasing: Easing.EaseInOut,
                          TransitionProperties: GalleryPosterTransitions.Type,
                          FontWeight: 850,
                          LetterSpacing: -2.4,
                          LineHeight: 0.9,
                          Color: paper,
                        },
                      },
                    },
                    Container{
                      Key: "poster-align",
                      Handle: posterAlignReflow.Handle,
                      Transform: PanelTransform{
                        TranslateX: alignOffset.X,
                        TranslateY: alignOffset.Y,
                      },
                      Height: if narrowPoster { 80 } else { 160 },
                      FlexGrow: 1.0,
                      FlexShrink: 1.0,
                      FlexBasis: if narrowPoster { 110 } else { 135 },
                      TransitionMs: 180.0,
                      TransitionEasing: Easing.EaseInOut,
                      TransitionProperties: GalleryPosterTransitions.Module,
                      MinWidth: 84,
                      Padding: 12,
                      FlexDirection: FlexDirection.Column,
                      AlignItems: AlignItems.FlexEnd,
                      JustifyContent: JustifyContent.SpaceBetween,
                      BackgroundColor: acid,
                      Children: {
                        Text{
                          Content: "ALIGN / END",
                          FontSize: 9,
                          FontWeight: 750,
                          LetterSpacing: 0.7,
                          Color: ink,
                        },
                        Container{
                          Width: if narrowPoster { 34 } else { 48 },
                          Height: if narrowPoster { 34 } else { 48 },
                          BorderRadius: if narrowPoster { 17 } else { 24 },
                          TransitionMs: 180.0,
                          TransitionEasing: Easing.EaseInOut,
                          TransitionProperties: GalleryPosterTransitions.Marker,
                          BackgroundColor: ink,
                          AlignItems: AlignItems.Center,
                          JustifyContent: JustifyContent.Center,
                          Children: {
                            Text{
                              Content: "03",
                              FontSize: if narrowPoster { 10 } else { 13 },
                              TransitionMs: 180.0,
                              TransitionEasing: Easing.EaseInOut,
                              TransitionProperties: GalleryPosterTransitions.Type,
                              FontWeight: 800,
                              Color: acid,
                            },
                          },
                        },
                      },
                    },
                    Container{
                      Key: "poster-flow",
                      Handle: posterFlowReflow.Handle,
                      Transform: PanelTransform{
                        TranslateX: flowOffset.X,
                        TranslateY: flowOffset.Y,
                      },
                      Height: if narrowPoster { 80 } else { 90 },
                      FlexGrow: 2.0,
                      FlexShrink: 1.0,
                      FlexBasis: if narrowPoster { 180 } else { 260 },
                      TransitionMs: 180.0,
                      TransitionEasing: Easing.EaseInOut,
                      TransitionProperties: GalleryPosterTransitions.Module,
                      MinWidth: 150,
                      PaddingLeft: 14,
                      PaddingRight: 14,
                      FlexDirection: FlexDirection.Row,
                      AlignItems: AlignItems.Center,
                      JustifyContent: JustifyContent.SpaceBetween,
                      BackgroundColor: coral,
                      Children: {
                        Text{
                          Content: "FLOW",
                          FontSize: if narrowPoster { 30 } else { 42 },
                          TransitionMs: 180.0,
                          TransitionEasing: Easing.EaseInOut,
                          TransitionProperties: GalleryPosterTransitions.Type,
                          FontWeight: 850,
                          LetterSpacing: -1.8,
                          Color: ink,
                        },
                        Container{
                          FlexDirection: FlexDirection.Column,
                          AlignItems: AlignItems.FlexEnd,
                          Gap: 2,
                          Children: {
                            Text{
                              Content: "WRAP",
                              FontSize: 9,
                              FontWeight: 800,
                              LetterSpacing: 0.8,
                              Color: ink,
                            },
                            Text{
                              Content: "SHRINK 1",
                              FontSize: 9,
                              FontWeight: 800,
                              LetterSpacing: 0.8,
                              Color: ink,
                            },
                          },
                        },
                      },
                    },
                    Container{
                      Key: "poster-gap",
                      Handle: posterGapReflow.Handle,
                      Transform: PanelTransform{
                        TranslateX: gapOffset.X,
                        TranslateY: gapOffset.Y,
                      },
                      Height: if narrowPoster { 76 } else { 90 },
                      FlexGrow: 1.0,
                      FlexShrink: 1.0,
                      FlexBasis: if narrowPoster { 86 } else { 110 },
                      TransitionMs: 180.0,
                      TransitionEasing: Easing.EaseInOut,
                      TransitionProperties: GalleryPosterTransitions.Module,
                      MinWidth: 76,
                      Padding: 12,
                      FlexDirection: FlexDirection.Column,
                      JustifyContent: JustifyContent.SpaceBetween,
                      BackgroundColor: paper,
                      Children: {
                        Text{
                          Content: "GAP",
                          FontSize: 9,
                          FontWeight: 800,
                          LetterSpacing: 0.9,
                          Color: ink,
                        },
                        Text{
                          Content: "06",
                          FontSize: if narrowPoster { 24 } else { 32 },
                          TransitionMs: 180.0,
                          TransitionEasing: Easing.EaseInOut,
                          TransitionProperties: GalleryPosterTransitions.Type,
                          FontWeight: 850,
                          LetterSpacing: -1,
                          Color: ink,
                        },
                      },
                    },
                    Container{
                      Key: "poster-wrap",
                      Handle: posterWrapReflow.Handle,
                      Transform: PanelTransform{
                        TranslateX: wrapOffset.X,
                        TranslateY: wrapOffset.Y,
                      },
                      Height: if narrowPoster { 76 } else { 90 },
                      FlexGrow: 1.0,
                      FlexShrink: 2.0,
                      FlexBasis: if narrowPoster { 86 } else { 100 },
                      TransitionMs: 180.0,
                      TransitionEasing: Easing.EaseInOut,
                      TransitionProperties: GalleryPosterTransitions.Module,
                      MinWidth: 72,
                      Padding: 12,
                      FlexDirection: FlexDirection.Column,
                      JustifyContent: JustifyContent.SpaceBetween,
                      BackgroundColor: Color.Rgb(31, 32, 37),
                      Children: {
                        Text{
                          Content: "COL",
                          FontSize: 9,
                          FontWeight: 800,
                          LetterSpacing: 0.9,
                          Color: GalleryTheme.InkMuted,
                        },
                        Text{
                          Content: "12",
                          FontSize: if narrowPoster { 24 } else { 32 },
                          TransitionMs: 180.0,
                          TransitionEasing: Easing.EaseInOut,
                          TransitionProperties: GalleryPosterTransitions.Type,
                          FontWeight: 850,
                          LetterSpacing: -1,
                          Color: paper,
                        },
                      },
                    },
                  },
                },
                Container{
                  Key: "poster-badge",
                  Position: PositionType.Absolute,
                  Right: 12,
                  Bottom: 12,
                  ZIndex: 3,
                  PaddingLeft: 8,
                  PaddingRight: 8,
                  PaddingTop: 5,
                  PaddingBottom: 5,
                  BackgroundColor: acid,
                  BorderWidth: 1,
                  BorderColor: ink,
                  Children: {
                    Text{
                      Content: "ABS / PINNED",
                      FontSize: 8,
                      FontWeight: 850,
                      LetterSpacing: 0.8,
                      Color: ink,
                    },
                  },
                },
              },
            },
          },
        },
      },
    }
  }

  protected override func Build(input ComposeChapterInput) Blob -> if input.Showcase == 0 {
    GallerySpecimen(
      "Keyed Fibonacci tiles",
      "Reorient, rotate, shuffle, swap, or race workers while keyed identity survives.",
      tileContent())
  } else {
    GallerySpecimen(
      "Live modular poster",
      "Drag the width and watch basis, grow, shrink, wrapping, gaps, alignment, and the pinned badge negotiate space.",
      posterContent())
  }
}

class MotionChapter : Cell {
  /// Gets or sets the pre-generated mathematical vector and image assets.
  public var Assets GalleryMathAssets?
  /// Gets or sets the compiled shader program suite.
  public var Programs GalleryShaderPrograms?
  /// Gets or sets whether this chapter uses compact single-column sizing.
  public var Compact bool
  internal prop Active bool{
    get -> active
    set {
      if active == value {
        return
      }
      active = value
      updateMotionActivity()
      Rebuild()
    }
  }
  internal prop Showcase int32{
    get -> showcase
    set {
      if showcase == value {
        return
      }
      showcase = value
      updateMotionActivity()
      Rebuild()
    }
  }

  private var active bool
  private var showcase int32
  private var disabledTarget bool
  private var pointerActive bool
  private let captureField ElementHandle
  private var pointer Point
  private var pressure float64
  private let movingPoint Anim[Point]
  private let movingColor Anim[Color]
  private let movingLength Anim[Length]
  private let motionCycle Anim[float64]
  private var motionLeg int32
  private var motionTowardEnd bool

  public init() {
    Compact = false
    Assets = nil
    Programs = nil
    active = false
    showcase = 0
    disabledTarget = false
    captureField = ElementHandle{}
    pointerActive = false
    pointer = Point{ X: 0.5, Y: 0.5 }
    pressure = 0.0
    movingPoint = Animate(Point{ X: 44.0, Y: 42.0 })
    movingColor = Animate(Color.Rgb(226, 100, 98))
    movingLength = Animate(Length.Percent(22))
    motionCycle = Animate(0.0)
    motionLeg = 0
    motionTowardEnd = false
  }
  private func updateMotionActivity() {
    if active && showcase == 0 {
      motionCycle.Set(0.0)
      motionLeg = 0
      motionTowardEnd = false
      movingPoint.Set(Point{ X: 44.0, Y: 42.0 })
      movingColor.Set(Color.Rgb(226, 100, 98))
      movingLength.Set(Length.Percent(22))
      retargetMotion()
      motionCycle.To(1000000.0, GalleryTypeClockSpec)
    } else {
      motionCycle.Set(motionCycle.Value)
      movingPoint.Set(movingPoint.Value)
      movingColor.Set(movingColor.Value)
      movingLength.Set(movingLength.Value)
    }
  }

  private func retargetMotion() {
    motionTowardEnd = !motionTowardEnd
    if motionTowardEnd {
      movingPoint.To(Point{ X: 250.0, Y: 170.0 }, GalleryMotionSpec)
      movingColor.To(Color.Rgb(87, 177, 188), GalleryMotionSpec)
      movingLength.To(Length.Percent(78), GalleryMotionSpec)
    } else {
      movingPoint.To(Point{ X: 44.0, Y: 42.0 }, GalleryMotionSpec)
      movingColor.To(Color.Rgb(226, 100, 98), GalleryMotionSpec)
      movingLength.To(Length.Percent(22), GalleryMotionSpec)
    }
  }

  private func syncMotion() {
    if !Active || Showcase != 0 {
      return
    }
    let nextLeg = int32(Math.Floor(motionCycle.Value / 2.4))
    if nextLeg != motionLeg {
      motionLeg = nextLeg
      retargetMotion()
    }
  }

  private func toggleDisabled() {
    disabledTarget = !disabledTarget
    Rebuild()
  }

  private func updatePointer(position Point, nextPressure float64) {
    let bounds = captureField.BorderBox
    let width = Math.Max(bounds.Width, 1.0)
    let height = Math.Max(bounds.Height, 1.0)
    pointer = Point{
      X: Math.Clamp(position.X / width, 0.0, 1.0),
      Y: Math.Clamp(position.Y / height, 0.0, 1.0),
    }
    pressure = Math.Clamp(nextPressure, 0.0, 1.0)
  }

  private func nudgePointer(key Key) {
    let dx = if key == Key.Left { -0.06 } else { if key == Key.Right { 0.06 } else { 0.0 } }
    let dy = if key == Key.Up { -0.06 } else { if key == Key.Down { 0.06 } else { 0.0 } }
    pointer = Point{
      X: Math.Clamp(pointer.X + dx, 0.0, 1.0),
      Y: Math.Clamp(pointer.Y + dy, 0.0, 1.0),
    }
    Rebuild()
  }

  private func responseColor() Color {
    if pointerActive {
      if pointer.Y < 0.34 {
        return Color.Rgb(251, 215, 116)
      }
      if pointer.Y < 0.67 {
        return Color.Rgb(226, 100, 98)
      }
      return Color.Rgb(87, 177, 188)
    }
    return movingColor.Value
  }

  private func stateContent() Blob -> Container {
    Width: if Compact { Length.Percent(48) } else { Length.Percent(100) },
    MinWidth: 0,
    Height: 150,
    FlexGrow: 1.0,
    FlexDirection: FlexDirection.Column,
    Gap: 8,
    Children: {
      Container{
        Width: Length.Percent(100),
        FlexGrow: 1.0,
        AlignItems: AlignItems.Center,
        JustifyContent: JustifyContent.Center,
        Focusable: true,
        Disabled: disabledTarget,
        TransitionMs: 100.0,
        BackgroundColor: GalleryTheme.SurfaceRaised,
        BorderWidth: 1,
        BorderColor: GalleryTheme.Border,
        Hover: Style{
          BackgroundColor: Color.Rgb(36, 48, 52),
          BorderColor: Color.Rgb(87, 177, 188),
        },
        Active: Style{
          BackgroundColor: Color.Rgb(57, 49, 52),
          Transform: PanelTransform{ Scale: 0.98 },
        },
        Focus: Style{
          OutlineWidth: 2,
          OutlineColor: GalleryTheme.Ink,
          OutlineOffset: 2,
        },
        DisabledStyle: Style{
          Opacity: 0.42,
          BackgroundColor: Color.Rgb(34, 34, 38),
          BorderColor: GalleryTheme.BorderStrong,
        },
        Children: {
          Container{
            Width: 48,
            Height: 48,
            BorderRadius: 24,
            BorderWidth: 10,
            BorderColor: responseColor(),
            AlignItems: AlignItems.Center,
            JustifyContent: JustifyContent.Center,
            Children: {
              Container{
                Width: 14,
                Height: 14,
                BackgroundColor: responseColor(),
                Transform: PanelTransform{ Rotate: motionCycle.Value * 24.0 },
              },
            },
          },
        },
      },
      GalleryTheme.GhostButton(if disabledTarget { "Enable" } else { "Disable" }, () -> toggleDisabled()),
    },
  }

  private func pointerContent(height float64) Blob {
    if let assets = Assets {
      let ambient = if pointerActive { 0.0 } else { 1.0 }
      let rotate = (pointer.X - 0.5) * 28.0 + Math.Sin(motionCycle.Value * 0.9) * 6.0 * ambient
      let scale = 0.84 + pressure * 0.32 + Math.Sin(motionCycle.Value * 1.3) * 0.04 * ambient
      return Container{
        Width: if Compact { Length.Percent(100) } else { Length.Percent(66) },
        MinWidth: 0,
        Height: height,
        FlexGrow: 1.0,
        Position: PositionType.Relative,
        Handle: captureField,
        Focusable: true,
        BackgroundColor: Color.Rgb(20, 24, 29),
        BorderWidth: 1,
        BorderColor: GalleryTheme.Border,
        OnPointerDown: func(e PointerEvent) {
          e.Capture()
          e.PreventDefault()
          pointerActive = true
          updatePointer(e.Position, e.Pressure)
          Rebuild()
        },
        OnPointerMove: func(e PointerEvent) {
          if pointerActive {
            updatePointer(e.Position, e.Pressure)
            Rebuild()
          }
        },
        OnPointerUp: func(e PointerEvent) {
          e.ReleaseCapture()
          pointerActive = false
          pressure = 0.0
          Rebuild()
        },
        OnPointerCancel: func(e PointerEvent) {
          e.ReleaseCapture()
          pointerActive = false
          pressure = 0.0
          Rebuild()
        },
        OnKeyDown: func(e KeyEvent) {
          if e.Key == Key.Left || e.Key == Key.Right || e.Key == Key.Up || e.Key == Key.Down {
            e.PreventDefault()
            nudgePointer(e.Key)
          }
        },
        Children: {
          Shape{
            Path: assets.Harmonograph,
            Width: Length.Percent(100),
            Height: Length.Percent(100),
            Fit: ShapeFit.Contain,
            BorderWidth: 1,
            BorderColor: Color.Rgb(87, 177, 188),
            StrokeCap: StrokeCap.Butt,
            StrokeJoin: StrokeJoin.Miter,
            Transform: PanelTransform{ Rotate: rotate, Scale: scale },
          },
          Container{
            Position: PositionType.Absolute,
            Left: Length.Percent(pointer.X * 100.0),
            Top: Length.Percent(pointer.Y * 100.0),
            Width: 8,
            Height: 8,
            BorderRadius: 4,
            BackgroundColor: Color.Rgb(251, 215, 116),
            Transform: PanelTransform{ TranslateX: -4.0, TranslateY: -4.0 },
          },
          Container{
            Position: PositionType.Absolute,
            Left: 12,
            Bottom: 12,
            Width: Length.Percent(20.0 + pointer.X * 60.0),
            Height: 3,
            BackgroundColor: responseColor(),
          },
        },
      }
    }
    return Container{
      Width: if Compact { Length.Percent(100) } else { Length.Percent(66) },
      MinWidth: 0,
      Height: height,
      FlexGrow: 1.0,
      BackgroundColor: GalleryTheme.SurfaceRaised,
    }
  }

  private func motionContent(height float64) Blob {
    let point = if pointerActive {
      Point{ X: 24.0 + pointer.X * 250.0, Y: 24.0 + pointer.Y * Math.Max(height - 48.0, 1.0) }
    } else {
      movingPoint.Value
    }
    let color = responseColor()
    let length = if pointerActive { Length.Percent(22.0 + pointer.X * 56.0) } else { movingLength.Value }
    return Container{
      Width: if Compact { Length.Percent(48) } else { Length.Percent(100) },
      MinWidth: 0,
      Height: height,
      FlexGrow: 1.0,
      Position: PositionType.Relative,
      BackgroundColor: Color.Rgb(19, 22, 27),
      BorderWidth: 1,
      BorderColor: GalleryTheme.Border,
      Children: {
        Container{
          Position: PositionType.Absolute,
          Left: point.X,
          Top: point.Y,
          Width: 24,
          Height: 24,
          BorderRadius: 12,
          BackgroundColor: color,
          Transform: PanelTransform{ TranslateX: -12.0, TranslateY: -12.0 },
        },
        Container{
          Position: PositionType.Absolute,
          Left: 24,
          Top: 28,
          Width: 42,
          Height: 42,
          BorderRadius: 8,
          BackgroundColor: color,
          Opacity: 0.9,
        },
        Container{
          Position: PositionType.Absolute,
          Left: 24,
          Bottom: 28,
          Width: length,
          MaxWidth: Length.Percent(88),
          Height: 12,
          BorderRadius: 6,
          BackgroundGradient: LinearGradient(color, Color.Rgb(251, 215, 116)),
        },
      },
    }
  }

  private func instrumentContent() Blob -> Container {
    Width: Length.Percent(100),
    Height: 410,
    FlexDirection: if Compact { FlexDirection.Column } else { FlexDirection.Row },
    Gap: 10,
    Children: {
      pointerContent(if Compact { 250.0 } else { 410.0 }),
      Container{
        Width: if Compact { Length.Percent(100) } else { Length.Percent(32) },
        MinWidth: 0,
        Height: if Compact { 150 } else { 410 },
        FlexDirection: if Compact { FlexDirection.Row } else { FlexDirection.Column },
        Gap: 10,
        Children: {
          stateContent(),
          motionContent(if Compact { 150.0 } else { 250.0 }),
        },
      },
    },
  }

  private func isPrime(value int32) bool {
    if value < 2 {
      return false
    }
    var divisor int32 = 2
    while divisor * divisor <= value {
      if value % divisor == 0 {
        return false
      }
      divisor = divisor + 1
    }
    return true
  }

  private func isFibonacci(value int32) bool {
    if value == 0 || value == 1 {
      return true
    }
    var previous int32 = 0
    var current int32 = 1
    while current < value {
      let next = previous + current
      previous = current
      current = next
    }
    return current == value
  }

  private func ribbonContent() Blob {
    let rows = List[Blob](48)
    var value int32 = 2
    while value <= 49 {
      let prime = isPrime(value)
      let fib = isFibonacci(value)
      let label = if prime && fib {
        "FIBONACCI / PRIME"
      } else {
        if prime {
          "PRIME"
        } else {
          if fib { "FIBONACCI" } else { "SEQUENCE" }
        }
      }
      let fill = if fib { Color.Rgb(74, 104, 148) } else { GalleryTheme.SurfaceRaised }
      rows.Add(Container{
        Key: "number-" + value.ToString(),
        Width: Length.Percent(100),
        MinHeight: 26,
        PaddingLeft: 10,
        PaddingRight: 10,
        FlexDirection: FlexDirection.Row,
        AlignItems: AlignItems.Center,
        JustifyContent: JustifyContent.SpaceBetween,
        BackgroundColor: fill,
        Children: {
          Text{ Content: value.ToString("D2"), FontSize: 12, FontWeight: 700, Color: GalleryTheme.Ink },
          Text{ Content: label, FontSize: 10, LetterSpacing: 0.6, Color: GalleryTheme.InkMuted },
        },
      })
      value = value + 1
    }
    return Container{
      Width: Length.Percent(100),
      Height: 174,
      MaxHeight: 174,
      MinHeight: 0,
      FlexDirection: FlexDirection.Column,
      Gap: 4,
      OverflowY: Overflow.Scroll,
      ScrollbarVisibility: ScrollbarVisibility.Auto,
      BackgroundColor: Color.Rgb(19, 22, 27),
      Padding: 6,
      Children: rows,
    }
  }

  override func Build() Blob {
    syncMotion()
    if Showcase == 0 {
      return GallerySpecimen(
        "Motion Instrument",
        "Drag the field or use arrow keys; hover, press, focus, and disable the live target.",
        instrumentContent())
    }
    return GallerySpecimen("Fibonacci / prime ribbon", "Scroll the keyed nested sequence to compare retained rows.", ribbonContent())
  }
}
