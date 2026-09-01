package GooGallery

import System
import System.Collections.Generic
import System.Numerics
import Goo

class GalleryGooSpringSimulation : Simulation {
  private let target float64
  private let displacement float64
  private let decay float64
  private let frequency float64
  private let sineWeight float64

  public init(start float64, target float64, velocity float64) {
    this.target = target
    displacement = start - target
    decay = 6.5
    frequency = 11.0
    sineWeight = (velocity + decay * displacement) / frequency
  }

  /// Gets the spring coordinate at the specified elapsed time.
  public override func Position(elapsed float64) float64 {
    if Done(elapsed) {
      return target
    }
    let envelope = Math.Exp(-decay * elapsed)
    return target + envelope * (
      displacement * Math.Cos(frequency * elapsed)
      +sineWeight * Math.Sin(frequency * elapsed))
  }

  /// Gets the spring velocity at the specified elapsed time.
  public override func Velocity(elapsed float64) float64 {
    if Done(elapsed) {
      return 0.0
    }
    let phase = frequency * elapsed
    let cosineWeight = -decay * displacement + frequency * sineWeight
    let nextSineWeight = -frequency * displacement - decay * sineWeight
    return Math.Exp(-decay * elapsed) * (
      cosineWeight * Math.Cos(phase) + nextSineWeight * Math.Sin(phase))
  }

  /// Gets whether the spring has settled.
  public override func Done(elapsed float64) bool -> elapsed >= 1.15
}

func GalleryGooSpringSpec(start float64, target float64, velocity float64) Simulation ->
GalleryGooSpringSimulation(start, target, velocity)

class GalleryGooFollowSimulation : Simulation {
  private let target float64
  private let displacement float64
  private let decay float64

  public init(start float64, target float64, velocity float64) {
    this.target = target
    displacement = start - target
    decay = 42.0
  }

  /// Gets the damped pointer-follow coordinate.
  public override func Position(elapsed float64) float64 {
    if Done(elapsed) {
      return target
    }
    return target + displacement * Math.Exp(-decay * elapsed)
  }

  /// Gets the damped pointer-follow velocity.
  public override func Velocity(elapsed float64) float64 {
    if Done(elapsed) {
      return 0.0
    }
    return -decay * displacement * Math.Exp(-decay * elapsed)
  }

  /// Gets whether the pointer-follow motion has settled.
  public override func Done(elapsed float64) bool -> elapsed >= 0.18
}

func GalleryGooFollowSpec(start float64, target float64, velocity float64) Simulation ->
GalleryGooFollowSimulation(start, target, velocity)

class GalleryCell : Cell, IDisposable {
  private let rootHandle ElementHandle
  private let showcaseHandle ElementHandle
  private let chapterNames []string
  private let chapterTitles []string
  private let chapterSentences []string
  private let showcaseChapters []int32
  private let showcaseLocals []int32
  private let showcaseTitles []string
  private let rootMetricsHandler Action[ElementMetrics]
  private let Assets GalleryMathAssets
  private let Programs GalleryShaderPrograms
  private var Compact bool
  private var currentShowcase int32
  private var disposed bool

  public init() {
    rootHandle = ElementHandle{}
    showcaseHandle = ElementHandle{}
    chapterNames = []string{
      "compose",
      "surfaces",
      "motion",
      "shaders",
      "studio",
    }
    chapterTitles = []string{
      "Compose and Layout",
      "One State, Many Surfaces",
      "Interaction and Motion",
      "Shader Lab",
      "Final Synthesis",
    }
    chapterSentences = []string{
      "Retained identity through keyed children, flex composition, and a poster stage that answers its constraints.",
      "One retained phrase travels through a tactile fridge, drawn ink, and a deterministic cipher.",
      "State, pointer capture, and Point, Color, and Length simulations composed into one live instrument.",
      "Eight native fragment programs, from a playable dungeon to volumetric fields.",
      "A working studio: choose a program, tune it, title it, and watch the retained canvas answer.",
    }
    showcaseChapters = []int32{
      -1,
      0, 0,
      1,
      2, 2,
      3, 3, 3, 3, 3, 3, 3, 3,
      4,
    }
    showcaseLocals = []int32{
      0,
      0, 1,
      0,
      0, 1,
      0, 1, 2, 3, 4, 5, 6, 7,
      0,
    }
    showcaseTitles = []string{
      "Goo",
      "Keyed Fibonacci tiles",
      "Live modular poster",
      "One State, Many Surfaces",
      "Motion Instrument",
      "Fibonacci / prime ribbon",
      "Wolfenstein",
      "Chrome SDF",
      "Corridor",
      "Radial Light",
      "Ripple",
      "Glass",
      "Volumetric",
      "Dither",
      "Final Synthesis",
    }
    Assets = GalleryMathAssets{}
    Programs = GalleryShaderPrograms{}
    Compact = false
    currentShowcase = 0
    disposed = false
    rootMetricsHandler = (metrics ElementMetrics) -> {
      if metrics.IsMounted && metrics.BorderBox.Width > 0.0 {
        UpdateCompact(metrics.BorderBox.Width)
      }
    }
    rootHandle.MetricsChanged += rootMetricsHandler
  }

  /// Releases owned subscriptions and resources.
  public func Dispose() {
    if disposed {
      return
    }
    disposed = true
    rootHandle.MetricsChanged -= rootMetricsHandler
    Assets.Dispose()
  }

  /// Gets the element handle for the root layout container.
  public func RootView() ElementHandle -> rootHandle

  /// Gets the element handle for the current full-window showcase.
  public func ShowcaseView() ElementHandle -> showcaseHandle

  /// Gets the number of individually navigable showcases.
  public func ShowcaseCount() int32 -> showcaseTitles.Length

  /// Gets the current showcase index.
  public func CurrentShowcase() int32 -> currentShowcase

  /// Opens the showcase at the specified index.
  public func OpenShowcase(index int32) bool {
    if index < 0 || index >= showcaseTitles.Length {
      return false
    }
    if currentShowcase != index {
      currentShowcase = index
      Rebuild()
    }
    return true
  }

  /// Opens the next showcase.
  public func NextShowcase() bool -> OpenShowcase(currentShowcase + 1)

  /// Opens the previous showcase.
  public func PreviousShowcase() bool -> OpenShowcase(currentShowcase - 1)

  /// Opens the first showcase in the named chapter.
  public func OpenSection(name string) bool {
    let chapter = ChapterIndex(name)
    if chapter < 0 {
      return false
    }
    var index int32 = 0
    while index < showcaseChapters.Length {
      if showcaseChapters[index] == chapter {
        return OpenShowcase(index)
      }
      index = index + 1
    }
    return false
  }

  /// Finds the chapter index by its route name.
  public func ChapterIndex(name string) int32 {
    var index int32 = 0
    while index < chapterNames.Length {
      if chapterNames[index] == name {
        return index
      }
      index = index + 1
    }
    return -1
  }

  private func UpdateCompact(width float64) {
    let next = width < GalleryTheme.Breakpoint
    if next == Compact {
      return
    }
    Compact = next
    Rebuild()
  }

  private func CurrentChapter() int32 -> showcaseChapters[currentShowcase]

  private func CurrentChapterTitle() string {
    let chapter = CurrentChapter()
    if chapter < 0 {
      return "Opening"
    }
    return chapterTitles[chapter]
  }

  private func CurrentSentence() string {
    let chapter = CurrentChapter()
    if chapter < 0 {
      return "A retained interface rendered as one focused, interactive exhibit at a time."
    }
    return chapterSentences[chapter]
  }

  private func BuildHeader() Container -> Container {
    Width: Length.Percent(100),
    Height: 72,
    MinHeight: 72,
    PaddingLeft: if Compact { 24 } else { 32 },
    PaddingRight: if Compact { 24 } else { 32 },
    FlexDirection: FlexDirection.Row,
    AlignItems: AlignItems.Center,
    JustifyContent: JustifyContent.SpaceBetween,
    BackgroundColor: GalleryTheme.Surface,
    BorderBottomWidth: 1,
    BorderColor: GalleryTheme.Border,
    Children: {
      Container{
        FlexDirection: FlexDirection.Column,
        Gap: 3,
        Children: {
          Text{
            Content: "GOO GALLERY / " + CurrentChapterTitle().ToUpperInvariant(),
            FontSize: 11,
            FontWeight: 600,
            LetterSpacing: 1.2,
            Color: GalleryTheme.InkMuted,
          },
          Text{
            Content: showcaseTitles[currentShowcase],
            FontSize: 22,
            FontWeight: 700,
            LetterSpacing: -0.4,
            Color: GalleryTheme.Ink,
          },
        },
      },
      Text{
        Content: (currentShowcase + 1).ToString("D2") + " / " + showcaseTitles.Length.ToString("D2"),
        FontSize: 12,
        FontWeight: 700,
        LetterSpacing: 1,
        Color: GalleryTheme.InkMuted,
      },
    },
  }

  private func BuildPagerButton(label string, enabled bool, forward bool) Button -> Button {
    Width: 124,
    Height: 38,
    PaddingLeft: 14,
    PaddingRight: 14,
    BackgroundColor: GalleryTheme.SurfaceRaised,
    BorderWidth: 1,
    BorderColor: GalleryTheme.Border,
    BorderRadius: 8,
    Cursor: if enabled { Cursor.Pointer } else { Cursor.Default },
    Focusable: enabled,
    Disabled: !enabled,
    TransitionMs: 100.0,
    Hover: Style{ BackgroundColor: GalleryTheme.Border },
    Active: Style{ BackgroundColor: GalleryTheme.BorderStrong },
    Focus: Style{ OutlineWidth: 1, OutlineColor: GalleryTheme.BorderStrong },
    DisabledStyle: Style{ BackgroundColor: GalleryTheme.Surface, Color: GalleryTheme.BorderStrong },
    Accessibility: Accessibility{
      Role: AccessibilityRole.Button,
      Name: label,
    },
    OnClick: () -> {
      if forward {
        NextShowcase()
      } else {
        PreviousShowcase()
      }
    },
    Children: {
      Text{
        Content: label,
        FontSize: 12,
        FontWeight: 650,
        Color: if enabled { GalleryTheme.Ink } else { GalleryTheme.BorderStrong },
        TextAlign: TextAlign.Center,
      },
    },
  }

  private func BuildFooter() Container -> Container {
    Width: Length.Percent(100),
    Height: 64,
    MinHeight: 64,
    PaddingLeft: if Compact { 24 } else { 32 },
    PaddingRight: if Compact { 24 } else { 32 },
    FlexDirection: FlexDirection.Row,
    AlignItems: AlignItems.Center,
    JustifyContent: JustifyContent.SpaceBetween,
    BackgroundColor: GalleryTheme.Surface,
    BorderTopWidth: 1,
    BorderColor: GalleryTheme.Border,
    Children: {
      BuildPagerButton("Previous", currentShowcase > 0, false),
      Container{
        FlexDirection: FlexDirection.Column,
        AlignItems: AlignItems.Center,
        Gap: 2,
        Children: {
          Text{
            Content: CurrentSentence(),
            FontSize: 11,
            Color: GalleryTheme.InkMuted,
            TextAlign: TextAlign.Center,
            TextTrimming: TextTrimming.Ellipsis,
            TextMaxLines: 1,
          },
          Text{
            Content: "PAGE UP / PAGE DOWN",
            FontSize: 9,
            FontWeight: 700,
            LetterSpacing: 1,
            Color: GalleryTheme.InkSubtle,
          },
        },
      },
      BuildPagerButton("Next", currentShowcase + 1 < showcaseTitles.Length, true),
    },
  }

  private func BuildTransientShowcase() Blob {
    if currentShowcase == 0 {
      return Cell.Mount[HeroCell]("showcase-hero", (c HeroCell) -> {
        c.Programs = Programs
        c.Compact = Compact
        c.Active = true
      })
    }
    let chapter = showcaseChapters[currentShowcase]
    let local = showcaseLocals[currentShowcase]
    return switch chapter {
      case 0: Cell.Mount[ComposeChapterInput, ComposeChapter](
        "showcase-compose",
        ComposeChapterInput{ Showcase: local })
      case 1: Container { Key: "showcase-surfaces-placeholder", Display: Display.None }
      case 2: Cell.Mount[MotionChapter]("showcase-motion", (c MotionChapter) -> {
        c.Assets = Assets
        c.Programs = Programs
        c.Compact = Compact
        c.Showcase = local
        c.Active = true
      })
      case 3: Cell.Mount[ShaderLabCell]("showcase-shaders", (c ShaderLabCell) -> {
        c.Assets = Assets
        c.Programs = Programs
        c.Compact = false
        c.Showcase = local
        c.Active = true
      })
      default: Cell.Mount[StudioCell]("showcase-studio", (c StudioCell) -> {
        c.Assets = Assets
        c.Programs = Programs
        c.Compact = false
        c.Active = true
      })
    }
  }
  private func BuildShowcase() Blob {
    let surfacesActive = currentShowcase == 3
    return Container{
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      MinWidth: 0,
      MinHeight: 0,
      Position: PositionType.Relative,
      Children: {
        Container{
          Key: "persistent-surfaces-host",
          Display: if surfacesActive { Display.Flex } else { Display.None },
          Position: PositionType.Absolute,
          Left: 0,
          Top: 0,
          Right: 0,
          Bottom: 0,
          AlignItems: AlignItems.Center,
          JustifyContent: JustifyContent.Center,
          Children: {
            Cell.Mount[StateSurfacesChapter]("showcase-surfaces", (c StateSurfacesChapter) -> {
              c.Compact = Compact
              c.Active = surfacesActive
            }),
          },
        },
        Container{
          Key: "transient-showcase-host",
          Display: if surfacesActive { Display.None } else { Display.Flex },
          Position: PositionType.Absolute,
          Left: 0,
          Top: 0,
          Right: 0,
          Bottom: 0,
          AlignItems: AlignItems.Center,
          JustifyContent: JustifyContent.Center,
          Children: { BuildTransientShowcase() },
        },
      },
    }
  }

  override func Build() Blob -> Container {
    Key: "root",
    Width: Length.Percent(100),
    Height: Length.Percent(100),
    Handle: rootHandle,
    BackgroundColor: GalleryTheme.Background,
    FlexDirection: FlexDirection.Column,
    OnKeyDown: func(e KeyEvent) {
      if e.Key == Key.PageUp {
        e.PreventDefault()
        PreviousShowcase()
      } else if e.Key == Key.PageDown {
        e.PreventDefault()
        NextShowcase()
      }
    },
    Children: {
      BuildHeader(),
      Container{
        Handle: showcaseHandle,
        Width: Length.Percent(100),
        MinHeight: 0,
        FlexGrow: 1.0,
        FlexShrink: 1.0,
        PaddingLeft: if Compact { 24 } else { GalleryTheme.PadWide },
        PaddingRight: if Compact { 24 } else { GalleryTheme.PadWide },
        PaddingTop: 16,
        PaddingBottom: 16,
        AlignItems: AlignItems.Center,
        JustifyContent: JustifyContent.Center,
        OverflowX: Overflow.Hidden,
        OverflowY: Overflow.Hidden,
        Children: {
          Container{
            Width: Length.Percent(100),
            Height: Length.Percent(100),
            MaxWidth: GalleryTheme.MaxContent,
            AlignItems: AlignItems.Center,
            JustifyContent: JustifyContent.Center,
            Children: { BuildShowcase() },
          },
        },
      },
      BuildFooter(),
    },
  }

  private class HeroCell : Cell {
    /// Gets or sets the compiled shader program suite.
    public var Programs GalleryShaderPrograms?
    /// Gets or sets whether the hero renders in compact layout.
    public var Compact bool
    internal prop Active bool{
      get -> active
      set {
        if active != value {
          active = value
          Rebuild()
        }
      }
    }

    private let hostHandle ElementHandle
    private let gPosition Anim[Point]
    private let firstOPosition Anim[Point]
    private let secondOPosition Anim[Point]
    private var active bool
    private var layoutMode int32
    private var pointerX float64
    private var pointerY float64
    private var pressure float64
    private var pointerDown bool
    private var draggingAnchor int32
    private var previousGPosition Point
    private var previousFirstOPosition Point
    private var previousSecondOPosition Point
    private var gVelocity Point
    private var firstOVelocity Point
    private var secondOVelocity Point
    private var velocityTick int64

    public init() {
      Programs = nil
      Compact = false
      active = false
      hostHandle = ElementHandle{}
      gPosition = Animate(Point{ X: 0.35, Y: 0.5 })
      firstOPosition = Animate(Point{ X: 0.5, Y: 0.5 })
      secondOPosition = Animate(Point{ X: 0.65, Y: 0.5 })
      previousGPosition = Point{ X: 0.35, Y: 0.5 }
      previousFirstOPosition = Point{ X: 0.5, Y: 0.5 }
      previousSecondOPosition = Point{ X: 0.65, Y: 0.5 }
      gVelocity = Point{ X: 0.0, Y: 0.0 }
      firstOVelocity = Point{ X: 0.0, Y: 0.0 }
      secondOVelocity = Point{ X: 0.0, Y: 0.0 }
      velocityTick = Environment.TickCount64
      layoutMode = 0
      pointerX = 0.5
      pointerY = 0.5
      pressure = 0.0
      pointerDown = false
      draggingAnchor = -1
    }

    private func restPosition(index int32) Point {
      if layoutMode == 1 {
        if index == 0 {
          return Point{ X: 0.5, Y: 0.24 }
        }
        if index == 1 {
          return Point{ X: 0.5, Y: 0.5 }
        }
        return Point{ X: 0.5, Y: 0.76 }
      }
      if layoutMode == 2 {
        if index == 0 {
          return Point{ X: 0.5, Y: 0.31 }
        }
        if index == 1 {
          return Point{ X: 0.415, Y: 0.61 }
        }
        return Point{ X: 0.585, Y: 0.61 }
      }
      if layoutMode == 3 {
        if index == 0 {
          return Point{ X: 0.43, Y: 0.45 }
        }
        if index == 1 {
          return Point{ X: 0.57, Y: 0.43 }
        }
        return Point{ X: 0.51, Y: 0.59 }
      }
      if index == 0 {
        return Point{ X: 0.35, Y: 0.5 }
      }
      if index == 1 {
        return Point{ X: 0.5, Y: 0.5 }
      }
      return Point{ X: 0.65, Y: 0.5 }
    }

    private func trackedVelocity(
      current Point,
      previous Point,
      prior Point,
      seconds float64,
      running bool) Point{
        if !running {
          return Point{ X: 0.0, Y: 0.0 }
        }
        let blend = Math.Clamp(seconds * 24.0, 0.35, 0.72)
        let rawX = Math.Clamp((current.X - previous.X) / seconds, -3.0, 3.0)
        let rawY = Math.Clamp((current.Y - previous.Y) / seconds, -3.0, 3.0)
        return Point{
          X: prior.X + (rawX - prior.X) * blend,
          Y: prior.Y + (rawY - prior.Y) * blend,
        }
      }

    private func updateCellVelocities(g Point, firstO Point, secondO Point) {
      let tick = Environment.TickCount64
      let elapsed = tick - velocityTick
      if elapsed <= 0 {
        return
      }
      let seconds = Math.Clamp(float64(elapsed) / 1000.0, 1.0 / 240.0, 0.05)
      gVelocity = trackedVelocity(
        g, previousGPosition, gVelocity, seconds, gPosition.Running)
      firstOVelocity = trackedVelocity(
        firstO, previousFirstOPosition, firstOVelocity, seconds, firstOPosition.Running)
      secondOVelocity = trackedVelocity(
        secondO, previousSecondOPosition, secondOVelocity, seconds, secondOPosition.Running)
      previousGPosition = g
      previousFirstOPosition = firstO
      previousSecondOPosition = secondO
      velocityTick = tick
    }

    private func currentPosition(index int32) Point {
      if index == 0 {
        return gPosition.Value
      }
      if index == 1 {
        return firstOPosition.Value
      }
      return secondOPosition.Value
    }

    private func moveAnchor(index int32, target Point) {
      if index == 0 {
        gPosition.To(target, GalleryGooSpringSpec)
      } else if index == 1 {
        firstOPosition.To(target, GalleryGooSpringSpec)
      } else {
        secondOPosition.To(target, GalleryGooSpringSpec)
      }
    }

    private func followAnchor(index int32, target Point) {
      if index == 0 {
        gPosition.To(target, GalleryGooFollowSpec)
      } else if index == 1 {
        firstOPosition.To(target, GalleryGooFollowSpec)
      } else {
        secondOPosition.To(target, GalleryGooFollowSpec)
      }
    }

    private func returnToFrame() {
      for index in 0 ... 3 {
        moveAnchor(index, restPosition(index))
      }
    }

    private func setLayout(next int32) {
      layoutMode = next
      pointerDown = false
      draggingAnchor = -1
      returnToFrame()
      Rebuild()
    }

    private func reform() {
      setLayout(0)
    }

    private func layoutButtonLabel(index int32, name string) string {
      if layoutMode == index {
        return "• " + name
      }
      return name
    }

    private func updatePointer(e PointerEvent) {
      let bounds = hostHandle.BorderBox
      let width = if bounds.Width > 0.0 { bounds.Width } else { 1.0 }
      let height = if bounds.Height > 0.0 { bounds.Height } else { 1.0 }
      pointerX = Math.Clamp(e.Position.X / width, 0.0, 1.0)
      pointerY = Math.Clamp(e.Position.Y / height, 0.0, 1.0)
      pressure = if pointerDown { Math.Max(e.Pressure, 0.55) } else { e.Pressure }
    }

    private func anchorAtPointer() int32 {
      let bounds = hostHandle.BorderBox
      if bounds.Width <= 0.0 || bounds.Height <= 0.0 {
        return -1
      }
      let hitRadius = if Compact { 56.0 } else { 74.0 }
      let hitRadiusSquared = hitRadius * hitRadius
      var hit int32 = -1
      var hitDistance = Double.MaxValue
      for index in 0 ... 3 {
        let point = currentPosition(index)
        let dx = point.X * bounds.Width - pointerX * bounds.Width
        let dy = point.Y * bounds.Height - pointerY * bounds.Height
        let distance = dx * dx + dy * dy
        if distance <= hitRadiusSquared && distance < hitDistance {
          hit = index
          hitDistance = distance
        }
      }
      return hit
    }

    private func pullMaterial() {
      if draggingAnchor < 0 {
        return
      }
      let target = Point{
        X: Math.Clamp(pointerX, 0.08, 0.92),
        Y: Math.Clamp(pointerY, 0.1, 0.9),
      }
      let origin = restPosition(draggingAnchor)
      let deltaX = target.X - origin.X
      let deltaY = target.Y - origin.Y
      for index in 0 ... 3 {
        if index == draggingAnchor {
          followAnchor(index, target)
        } else {
          let rest = restPosition(index)
          followAnchor(index, Point{
            X: rest.X + deltaX * 0.14,
            Y: rest.Y + deltaY * 0.14,
          })
        }
      }
    }

    private func letter(key string, content string, index int32, size float64) Blob {
      let point = currentPosition(index)
      return Container{
        Key: key,
        Position: PositionType.Absolute,
        Left: Length.Percent(point.X * 100.0),
        Top: Length.Percent(point.Y * 100.0),
        Width: size,
        Height: size,
        Transform: PanelTransform{
          TranslateX: -size * 0.5,
          TranslateY: -size * 0.5,
        },
        JustifyContent: JustifyContent.Center,
        AlignItems: AlignItems.Center,
        Children: {
          Text{
            Content: content,
            FontSize: if index == 0 { size * 0.7 } else { size * 0.76 },
            FontWeight: 850,
            LetterSpacing: -4,
            Color: GalleryTheme.Ink,
            TextAlign: TextAlign.Center,
          },
        },
      }
    }

    override func Build() Blob {
      let height = if Compact { 420.0 } else { 560.0 }
      guard let programs = Programs else {
        return Container{
          Width: Length.Percent(100),
          MaxWidth: GalleryTheme.MaxContent,
          Height: height,
          BackgroundColor: GalleryTheme.Surface,
        }
      }
      let effect = programs.Hero
      var liveEffect ShaderEffect? = nil
      let bounds = hostHandle.BorderBox
      let width = if bounds.Width > 0.0 { bounds.Width } else { GalleryTheme.MaxContent }
      let surfaceHeight = if Compact { 322.0 } else { 448.0 }
      let hostHeight = if bounds.Height > 0.0 { bounds.Height } else { surfaceHeight }
      let letterSize = if Compact { 98.0 } else { 132.0 }
      let radius = letterSize / hostHeight * 0.5
      let g = gPosition.Value
      let firstO = firstOPosition.Value
      let secondO = secondOPosition.Value
      updateCellVelocities(g, firstO, secondO)
      if Active {
        liveEffect = effect
        effect.SetParameter(0, Vector4(
          0.0F,
          float32(width),
          float32(hostHeight),
          1.0F))
        effect.SetParameter(1, Vector4(
          float32(pointerX),
          float32(pointerY),
          float32(pressure),
          if pointerDown { 1.0F } else { 0.0F }))
        effect.SetParameter(2, Vector4(float32(g.X), float32(g.Y), float32(radius), 1.0F))
        effect.SetParameter(3, Vector4(
          float32(firstO.X), float32(firstO.Y), float32(radius), 1.0F))
        effect.SetParameter(4, Vector4(
          float32(secondO.X), float32(secondO.Y), float32(radius), 1.0F))
        effect.SetParameter(5, Vector4(
          float32(layoutMode),
          0.0F,
          float32(draggingAnchor),
          0.0F))
        effect.SetParameter(6, Vector4(
          float32(gVelocity.X),
          float32(gVelocity.Y),
          float32(firstOVelocity.X),
          float32(firstOVelocity.Y)))
        effect.SetParameter(7, Vector4(
          float32(secondOVelocity.X),
          float32(secondOVelocity.Y),
          0.0F,
          0.0F))
      }
      return Container{
        Width: Length.Percent(100),
        MaxWidth: GalleryTheme.MaxContent,
        Height: height,
        Padding: 12,
        Gap: 10,
        FlexDirection: FlexDirection.Column,
        BackgroundColor: GalleryTheme.Surface,
        BorderWidth: 1,
        BorderColor: GalleryTheme.Border,
        BorderRadius: 12,
        Children: {
          Container{
            Key: "goo-memory-surface",
            Handle: hostHandle,
            Width: Length.Percent(100),
            MinHeight: 0,
            FlexGrow: 1.0,
            FlexShrink: 1.0,
            Position: PositionType.Relative,
            BackgroundColor: Color.Rgb(9, 11, 16),
            ShaderEffect: liveEffect,
            Cursor: if pointerDown {
              Cursor.Move
            } else if anchorAtPointer() >= 0 {
              Cursor.Pointer
            } else {
              Cursor.Default
            },
            Focusable: true,
            Accessibility: Accessibility{
              Role: AccessibilityRole.Generic,
              Name: "Goo has shape memory. Grab a letter and release to reform.",
            },
            OnPointerDown: (e PointerEvent) -> {
              updatePointer(e)
              let hit = anchorAtPointer()
              if hit >= 0 {
                e.Capture()
                e.PreventDefault()
                pointerDown = true
                draggingAnchor = hit
                pullMaterial()
                Rebuild()
              }
            },
            OnPointerMove: (e PointerEvent) -> {
              updatePointer(e)
              if pointerDown {
                pullMaterial()
              }
              Rebuild()
            },
            OnPointerUp: (e PointerEvent) -> {
              if pointerDown {
                e.ReleaseCapture()
                updatePointer(e)
                pointerDown = false
                pressure = 0.0
                draggingAnchor = -1
                returnToFrame()
                Rebuild()
              }
            },
            OnPointerCancel: (e PointerEvent) -> {
              if pointerDown {
                e.ReleaseCapture()
                pointerDown = false
                pressure = 0.0
                draggingAnchor = -1
                returnToFrame()
                Rebuild()
              }
            },
            Children: {
              Text{
                Key: "goo-memory-heading",
                Position: PositionType.Absolute,
                Left: 18,
                Top: 16,
                Content: "GOO HAS SHAPE MEMORY",
                FontSize: 11,
                FontWeight: 750,
                LetterSpacing: 1.5,
                Color: GalleryTheme.InkMuted,
              },
              letter("goo-letter-g", "G", 0, letterSize),
              letter("goo-letter-o1", "o", 1, letterSize),
              letter("goo-letter-o2", "o", 2, letterSize),
            },
          },
          Container{
            Key: "goo-memory-controls",
            Width: Length.Percent(100),
            FlexDirection: FlexDirection.Row,
            FlexWrap: FlexWrap.Wrap,
            Gap: 8,
            Children: {
              GalleryTheme.GhostButton(layoutButtonLabel(0, "Wordmark"), () -> setLayout(0)),
              GalleryTheme.GhostButton(layoutButtonLabel(1, "Stack"), () -> setLayout(1)),
              GalleryTheme.GhostButton(layoutButtonLabel(2, "Orbit"), () -> setLayout(2)),
              GalleryTheme.GhostButton(layoutButtonLabel(3, "Knot"), () -> setLayout(3)),
              GalleryTheme.GhostButton("Reform", () -> reform()),
            },
          },
          Text{
            Key: "goo-memory-hint",
            Content: "Pull it apart. It remembers where it belongs.",
            FontSize: 12,
            Color: GalleryTheme.InkSubtle,
          },
        },
      }
    }
  }
}
