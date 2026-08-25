package GooShowcase

import System
import System.Collections.Generic
import System.IO
import System.Numerics
import Goo

internal class LavaCell : Cell {
  shared {
    let Root ElementHandle = ElementHandle{}
    let Surface ElementHandle = ElementHandle{}
    let RailHandle ElementHandle = ElementHandle{}
    let ModeSurface ElementHandle = ElementHandle{}
    let ActionSurface ElementHandle = ElementHandle{}
    let SliderSurface ElementHandle = ElementHandle{}
    let CollapsedSurface ElementHandle = ElementHandle{}
    let Toggle ElementHandle = ElementHandle{}
    let CollapsedToggle ElementHandle = ElementHandle{}
    let FlowTrack ElementHandle = ElementHandle{}
    let RainbowToggle ElementHandle = ElementHandle{}
    let CalmMode ElementHandle = ElementHandle{}
    let MeltMode ElementHandle = ElementHandle{}
    let PrismMode ElementHandle = ElementHandle{}
    let Reroll ElementHandle = ElementHandle{}
  }

  private let Glass ShaderEffect
  private var Flow State[float64]
  private var Form State[float64]
  private var Blend State[float64]
  private var Light State[float64]
  private var Hue State[float64]
  private var Rainbow State[bool]
  private var Expanded State[bool]
  private var Rotation State[Point]
  private var Seed State[uint32]
  private var Refraction State[float64]
  private var Mode State[int32]
  private var DraggingControl bool
  private var DraggingField bool
  private var FieldDragStart Point
  private var FieldRotationStart Point
  private var OrbPosition Point
  private var OrbInitialized bool

  init() {
    Flow = Track(0.48)
    Form = Track(0.56)
    Blend = Track(0.64)
    Light = Track(0.64)
    Hue = Track(0.62)
    Rainbow = Track(false)
    Expanded = Track(true)
    Rotation = Track(Point{ X: 0.0, Y: 0.0 })
    Seed = Track(uint32(7))
    Refraction = Track(0.58)
    Mode = Track(int32(1))
    DraggingControl = false
    DraggingField = false
    FieldDragStart = Point{ X: 0.0, Y: 0.0 }
    FieldRotationStart = Point{ X: 0.0, Y: 0.0 }
    OrbPosition = Point{ X: 0.0, Y: 0.0 }
    OrbInitialized = false
    let shaderPath = Path.Combine(AppContext.BaseDirectory, "liquid_glass.frag.spv")
    Glass = ShaderEffect(File.ReadAllBytes(shaderPath), true, 96.0F)
    UpdateGlass()
  }

  private func Clamp(value float64) float64 {
    if value < 0.0 { return 0.0 }
    if value > 1.0 { return 1.0 }
    return value
  }

  private func ClampPitch(value float64) float64 {
    if value < -1.35 { return -1.35 }
    if value > 1.35 { return 1.35 }
    return value
  }

  private func UpdateGlass() {
    let amount = Refraction.Value
    Glass.SetParameter(0, Vector4(
      float32(0.65 + amount * 1.1),
      1.52F,
      0.0F,
      1.0F))
  }

  private func NormalizedRect(handle ElementHandle, root ElementRect) Vector4 {
    if !handle.IsMounted { return Vector4{} }
    let rect = handle.BorderBox
    let width = root.Width > 1.0 ? root.Width : 1.0
    let height = root.Height > 1.0 ? root.Height : 1.0
    return Vector4(
      float32((rect.X - root.X) / width),
      float32((rect.Y - root.Y) / height),
      float32(rect.Width / width),
      float32(rect.Height / height))
  }

  private func FallbackRect(
    x float64,
    y float64,
    width float64,
    height float64,
    root ElementRect) Vector4{
      let rootWidth = root.Width > 1.0 ? root.Width : 1.0
      let rootHeight = root.Height > 1.0 ? root.Height : 1.0
      return Vector4(
        float32(x / rootWidth),
        float32(y / rootHeight),
        float32(width / rootWidth),
        float32(height / rootHeight))
    }

  private func RoundedRectDistance(
    point Point,
    rect Vector4,
    width float64,
    height float64) float64{
      if rect.Z <= 0.0F || rect.W <= 0.0F { return 1000000.0 }
      let rectWidth = float64(rect.Z) * width
      let rectHeight = float64(rect.W) * height
      let halfWidth = rectWidth * 0.5
      let halfHeight = rectHeight * 0.5
      let radius = Math.Min(rectWidth, rectHeight) * 0.5
      let centerX = float64(rect.X) * width + halfWidth
      let centerY = float64(rect.Y) * height + halfHeight
      let qx = Math.Abs(point.X - centerX) - Math.Max(halfWidth - radius, 0.0)
      let qy = Math.Abs(point.Y - centerY) - Math.Max(halfHeight - radius, 0.0)
      let outsideX = Math.Max(qx, 0.0)
      let outsideY = Math.Max(qy, 0.0)
      return Math.Sqrt(outsideX * outsideX + outsideY * outsideY)
      +Math.Min(Math.Max(qx, qy), 0.0) - radius
    }

  private func GlassEdgeGap(
    width float64,
    height float64,
    modeRect Vector4,
    actionRect Vector4,
    sliderRect Vector4,
    collapsedRect Vector4) float64{
      var distance = RoundedRectDistance(OrbPosition, modeRect, width, height)
      distance = Math.Min(distance,
        RoundedRectDistance(OrbPosition, actionRect, width, height))
      distance = Math.Min(distance,
        RoundedRectDistance(OrbPosition, sliderRect, width, height))
      distance = Math.Min(distance,
        RoundedRectDistance(OrbPosition, collapsedRect, width, height))
      return Math.Max(distance - 36.0, 0.0)
    }

  internal func SyncGlassGeometry() {
    if !LavaCell.Root.IsMounted { return }
    let root = LavaCell.Root.BorderBox
    let width = root.Width > 1.0 ? root.Width : 1.0
    let height = root.Height > 1.0 ? root.Height : 1.0
    let railWidth = Math.Min(width * 0.92, 660.0)
    let railX = width - 16.0 - railWidth
    let rowY = height - 218.0
    let rowContentWidth = Math.Max(0.0, railWidth - 10.0)
    let modeWidth = rowContentWidth * 292.0 / 642.0
    let actionWidth = rowContentWidth - modeWidth
    var modeRect = NormalizedRect(LavaCell.ModeSurface, root)
    var actionRect = NormalizedRect(LavaCell.ActionSurface, root)
    var sliderRect = NormalizedRect(LavaCell.SliderSurface, root)
    var collapsedRect = NormalizedRect(LavaCell.CollapsedSurface, root)
    if Expanded.Value {
      if modeRect.Z <= 0.0F {
        modeRect = FallbackRect(railX, rowY, modeWidth, 64.0, root)
      }
      if actionRect.Z <= 0.0F {
        actionRect = FallbackRect(
          railX + modeWidth + 10.0,
          rowY,
          actionWidth,
          64.0,
          root)
      }
      if sliderRect.Z <= 0.0F {
        sliderRect = FallbackRect(railX, rowY + 74.0, railWidth, 48.0, root)
      }
      collapsedRect = Vector4{}
    } else {
      modeRect = Vector4{}
      actionRect = Vector4{}
      sliderRect = Vector4{}
      if collapsedRect.Z <= 0.0F {
        collapsedRect = FallbackRect(width - 72.0, height - 160.0, 56.0, 64.0, root)
      }
    }
    if !OrbInitialized {
      let modeX = float64(modeRect.X) * width
      let modeY = float64(modeRect.Y) * height
      OrbPosition = Point{ X: modeX + 22.0, Y: modeY - 28.0 }
      OrbInitialized = true
    }
    OrbPosition = Point{
      X: Math.Max(0.0, Math.Min(width, OrbPosition.X)),
      Y: Math.Max(0.0, Math.Min(height, OrbPosition.Y)),
    }
    let edgeGap = GlassEdgeGap(width, height,
      modeRect, actionRect, sliderRect, collapsedRect)
    Glass.SetParameter(1, Vector4(
      1.0F,
      0.0F,
      float32(6.0 / height),
      0.0F))
    Glass.SetParameter(2, Vector4(
      float32(OrbPosition.X / width),
      float32(OrbPosition.Y / height),
      float32(36.0 / height),
      1.0F))
    Glass.SetParameter(3, modeRect)
    Glass.SetParameter(4, actionRect)
    Glass.SetParameter(5, sliderRect)
    Glass.SetParameter(6, collapsedRect)
    Glass.SetParameter(7, Vector4(
      float32(edgeGap / height),
      float32(48.0 / height),
      float32(8.0 / height),
      float32(4.0 / height)))
  }

  private func MoveOrb(event PointerEvent) {
    let root = LavaCell.Root.BorderBox
    OrbPosition = Point{
      X: event.WindowPosition.X - root.X,
      Y: event.WindowPosition.Y - root.Y,
    }
    OrbInitialized = true
    SyncGlassGeometry()
  }

  private func TrackValue(position Point, handle ElementHandle) float64 {
    let width = handle.BorderBox.Width > 1.0 ? handle.BorderBox.Width : 1.0
    return Clamp(position.X / width)
  }

  private func UpdateRefraction(position Point) {
    Refraction.Value = TrackValue(position, FlowTrack)
    UpdateGlass()
  }

  private func BeginSlider(event PointerEvent) {
    event.PreventDefault()
    if event.Button != PointerButton.Primary { return }
    DraggingControl = true
    UpdateRefraction(event.Position)
    event.Capture()
  }

  private func MoveSlider(event PointerEvent) {
    if !DraggingControl { return }
    event.PreventDefault()
    UpdateRefraction(event.Position)
  }

  private func EndSlider(event PointerEvent) {
    if !DraggingControl { return }
    event.PreventDefault()
    UpdateRefraction(event.Position)
    DraggingControl = false
    event.ReleaseCapture()
  }

  private func CancelSlider(event PointerEvent) {
    if !DraggingControl { return }
    DraggingControl = false
    event.ReleaseCapture()
  }

  private func ToggleRail() {
    Expanded.Value = !Expanded.Value
    SyncGlassGeometry()
  }

  private func ToggleRainbow() {
    Rainbow.Value = !Rainbow.Value
  }

  private func SelectMode(value int32) {
    Mode.Value = value
    if value == 0 {
      Flow.Value = 0.24
      Form.Value = 0.42
      Light.Value = 0.54
      Hue.Value = 0.58
      Rainbow.Value = false
    } else if value == 1 {
      Flow.Value = 0.48
      Form.Value = 0.56
      Light.Value = 0.64
      Hue.Value = 0.62
      Rainbow.Value = false
    } else {
      Flow.Value = 0.62
      Form.Value = 0.68
      Light.Value = 0.78
      Hue.Value = 0.66
      Rainbow.Value = true
    }
  }

  private func RerollField() {
    Seed.Value = Seed.Value + 1u
    Form.Value = 0.38 + float64(Seed.Value % 37u) / 100.0
    Hue.Value = float64(Seed.Value % 91u) / 100.0
  }

  private func UpdateRotation(position Point) {
    let width = Surface.BorderBox.Width > 1.0 ? Surface.BorderBox.Width : 1.0
    let height = Surface.BorderBox.Height > 1.0 ? Surface.BorderBox.Height : 1.0
    let yaw = FieldRotationStart.X + (position.X - FieldDragStart.X) / width * 6.28318530718
    let pitch = FieldRotationStart.Y + (position.Y - FieldDragStart.Y) / height * 3.0
    Rotation.Value = Point{ X: yaw, Y: ClampPitch(pitch) }
  }

  private func BeginField(event PointerEvent) {
    event.PreventDefault()
    if event.Button != PointerButton.Primary { return }
    DraggingField = true
    FieldDragStart = event.Position
    FieldRotationStart = Rotation.Value
    event.Capture()
  }

  private func MoveField(event PointerEvent) {
    if !DraggingField { return }
    event.PreventDefault()
    UpdateRotation(event.Position)
  }

  private func EndField(event PointerEvent) {
    if !DraggingField { return }
    event.PreventDefault()
    UpdateRotation(event.Position)
    DraggingField = false
    event.ReleaseCapture()
  }

  private func CancelField(event PointerEvent) {
    if !DraggingField { return }
    DraggingField = false
    event.ReleaseCapture()
  }

  internal func RequireExpanded(value bool) {
    if Expanded.Value != value {
      throw InvalidOperationException("Glass controls expansion state did not update")
    }
  }

  internal func RequireRainbow(value bool) {
    if Rainbow.Value != value {
      throw InvalidOperationException("Glass spectrum toggle did not update")
    }
  }

  internal func RefractionForSmoke() float64 -> Refraction.Value

  internal func RequireRefractionChanged(previous float64) {
    if Refraction.Value == previous {
      throw InvalidOperationException("Glass refraction slider did not update")
    }
  }

  internal func ModeForSmoke() int32 -> Mode.Value

  internal func SeedForSmoke() uint32 -> Seed.Value

  internal func RotationForSmoke() Point -> Rotation.Value

  internal func OrbForSmoke() Point -> OrbPosition

  internal func RequireOrbChanged(previous Point) {
    if Math.Abs(OrbPosition.X - previous.X) <= 0.001
      && Math.Abs(OrbPosition.Y - previous.Y) <= 0.001 {
        throw InvalidOperationException("Liquid glass orb did not follow the pointer")
      }
  }

  internal func RequireRotationChanged(previous Point) {
    if Math.Abs(Rotation.Value.X - previous.X) <= 0.001
      && Math.Abs(Rotation.Value.Y - previous.Y) <= 0.001 {
        throw InvalidOperationException("Lava field rotation did not update")
      }
  }

  internal func RequireRotationAt(expected Point) {
    if Math.Abs(Rotation.Value.X - expected.X) > 0.001
      || Math.Abs(Rotation.Value.Y - expected.Y) > 0.001 {
        throw InvalidOperationException("Lava field rotation did not persist")
      }
  }

  private func GlassLabel(key string, content string, size float64 = 10.0) Blob -> Text {
    Key: key,
    Content: content,
    FontFamily: "IBM Plex Mono",
    FontSize: size,
    FontWeight: 650,
    Color: Color.Rgb(242, 245, 255),
    LetterSpacing: 0.45,
    TextAlign: TextAlign.Center,
  }

  private func ModeButton(key string, label string, value int32, handle ElementHandle) Blob {
    let selected = Mode.Value == value
    let fill = selected
    ? LinearGradient(145.0,
      Color.Rgba(255, 188, 154, 76),
      Color.Rgba(182, 66, 38, 48)) : LinearGradient(145.0, Color.Transparent, Color.Transparent)
    let hoverFill = selected
    ? LinearGradient(145.0,
      Color.Rgba(255, 208, 180, 104),
      Color.Rgba(194, 72, 42, 66)) : LinearGradient(145.0,
        Color.Rgba(255, 255, 255, 24),
        Color.Rgba(255, 255, 255, 5))
    return Button{
      Key: key,
      Width: 92,
      Height: 54,
      FlexShrink: 1,
      Handle: handle,
      Cursor: Cursor.Pointer,
      BorderRadius: 27,
      BackgroundColor: Color.Transparent,
      BackgroundGradient: fill,
      Hover: Style{
        BackgroundGradient: hoverFill,
      },
      Active: Style{
        BackgroundGradient: LinearGradient(145.0,
          Color.Rgba(174, 68, 44, 78),
          Color.Rgba(112, 42, 32, 58)),
        Transform: PanelTransform{ Scale: 0.94 },
      },
      Focus: Style{ BackgroundGradient: hoverFill },
      TransitionMs: 110,
      OnClick: func() { SelectMode(value) },
      Children: { GlassLabel(key + "-label", label, 11.0) },
    }
  }

  private func ModeGroup() Blob -> Container {
    Key: "glass-mode-wrap",
    Width: 292,
    MaxWidth: Length.Percent(100),
    Height: 64,
    FlexShrink: 1,
    Position: PositionType.Relative,
    Children: {
      Container{
        Key: "glass-mode-group",
        Position: PositionType.Absolute,
        Left: 0,
        Top: 0,
        Width: Length.Percent(100),
        Height: 64,
        Padding: 5,
        Gap: 5,
        FlexDirection: FlexDirection.Row,
        AlignItems: AlignItems.Center,
        BorderRadius: 32,
        BackgroundColor: Color.Transparent,
        Handle: LavaCell.ModeSurface,
        Children: {
          ModeButton("glass-mode-calm", "CALM", 0, LavaCell.CalmMode),
          ModeButton("glass-mode-melt", "MELT", 1, LavaCell.MeltMode),
          ModeButton("glass-mode-prism", "PRISM", 2, LavaCell.PrismMode),
        },
      },
    },
  }

  private func RerollButton() Blob -> Button {
    Key: "glass-reroll",
    Width: 120,
    Height: 64,
    FlexShrink: 1,
    Handle: LavaCell.Reroll,
    Cursor: Cursor.Pointer,
    BorderRadius: 32,
    BackgroundColor: Color.Transparent,
    BackgroundGradient: LinearGradient(145.0,
      Color.Rgba(255, 164, 120, 54),
      Color.Rgba(154, 50, 30, 34)),
    Hover: Style{
      BackgroundGradient: LinearGradient(145.0,
        Color.Rgba(255, 190, 148, 94),
        Color.Rgba(180, 60, 34, 58)),
    },
    Active: Style{
      BackgroundGradient: LinearGradient(145.0,
        Color.Rgba(172, 66, 44, 104),
        Color.Rgba(96, 34, 28, 76)),
    },
    Focus: Style{
      BackgroundGradient: LinearGradient(145.0,
        Color.Rgba(255, 198, 160, 92),
        Color.Rgba(174, 58, 34, 54)),
    },
    TransitionMs: 100,
    OnClick: func() { RerollField() },
    Children: { GlassLabel("glass-reroll-label", "REROLL", 11.0) },
  }

  private func SpectrumToggle() Blob {
    let active = Rainbow.Value
    let fill = active
    ? LinearGradient(145.0,
      Color.Rgba(164, 190, 255, 62),
      Color.Rgba(62, 88, 174, 32)) : LinearGradient(145.0, Color.Transparent, Color.Transparent)
    return Button{
      Key: "glass-spectrum",
      Width: 150,
      Height: 64,
      FlexShrink: 1,
      PaddingLeft: 16,
      PaddingRight: 12,
      Gap: 10,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      JustifyContent: JustifyContent.SpaceBetween,
      Handle: LavaCell.RainbowToggle,
      Cursor: Cursor.Pointer,
      BorderRadius: 32,
      BackgroundColor: Color.Transparent,
      BackgroundGradient: fill,
      Hover: Style{
        BackgroundGradient: LinearGradient(145.0,
          Color.Rgba(226, 234, 255, 68),
          Color.Rgba(96, 118, 190, 28)),
      },
      Active: Style{
        BackgroundGradient: LinearGradient(145.0,
          Color.Rgba(112, 136, 202, 92),
          Color.Rgba(54, 68, 122, 54)),
      },
      Focus: Style{
        BackgroundGradient: LinearGradient(145.0,
          Color.Rgba(218, 230, 255, 64),
          Color.Rgba(76, 98, 172, 30)),
      },
      TransitionMs: 110,
      OnClick: func() { ToggleRainbow() },
      Children: {
        GlassLabel("glass-spectrum-label", "COLOR", 11.0),
        Container{
          Key: "glass-spectrum-track",
          Width: 42,
          Height: 24,
          Padding: 3,
          AlignItems: active ? AlignItems.FlexEnd : AlignItems.FlexStart,
          BorderRadius: 12,
          BackgroundColor: active
          ? Color.Rgba(148, 181, 255, 180) : Color.Rgba(12, 16, 28, 120),
          Children: {
            Container{
              Key: "glass-spectrum-thumb",
              Width: 18,
              Height: 18,
              BorderRadius: 9,
              BackgroundColor: Color.Rgb(247, 249, 255),
            },
          },
        },
      },
    }
  }

  private func CollapseButton(key string, handle ElementHandle) Blob -> Button {
    Key: key,
    Width: 56,
    Height: 64,
    FlexShrink: 1,
    Handle: handle,
    Cursor: Cursor.Pointer,
    BorderRadius: 28,
    BackgroundColor: Color.Transparent,
    Hover: Style{ BackgroundColor: Color.Rgba(230, 237, 255, 70) },
    Active: Style{ BackgroundColor: Color.Rgba(104, 122, 162, 94) },
    Focus: Style{
      BackgroundGradient: LinearGradient(145.0,
        Color.Rgba(218, 230, 255, 58),
        Color.Rgba(76, 98, 172, 26)),
    },
    TransitionMs: 100,
    OnClick: func() { ToggleRail() },
    Children: { GlassLabel(key + "-label", Expanded.Value ? "×" : "+", 18) },
  }

  private func ActionGroup() Blob -> Container {
    Key: "glass-action-wrap",
    Width: 350,
    MaxWidth: Length.Percent(100),
    Height: 64,
    FlexShrink: 1,
    Position: PositionType.Relative,
    Children: {
      Container{
        Key: "glass-action-group",
        Position: PositionType.Absolute,
        Left: 0,
        Top: 0,
        Width: Length.Percent(100),
        Height: 64,
        Gap: 10,
        FlexDirection: FlexDirection.Row,
        BorderRadius: 32,
        BackgroundColor: Color.Transparent,
        Handle: LavaCell.ActionSurface,
        Children: {
          RerollButton(),
          SpectrumToggle(),
          CollapseButton("glass-collapse", LavaCell.Toggle),
        },
      },
    },
  }

  private func CollapsedControl() Blob -> Container {
    Key: "glass-collapsed-wrap",
    Width: 56,
    Height: 64,
    Position: PositionType.Relative,
    Children: {
      Container{
        Key: "glass-collapsed-surface",
        Position: PositionType.Absolute,
        Left: 0,
        Top: 0,
        Width: 56,
        Height: 64,
        BorderRadius: 28,
        BackgroundColor: Color.Transparent,
        Handle: LavaCell.CollapsedSurface,
        Children: { CollapseButton("glass-expand", LavaCell.CollapsedToggle) },
      },
    },
  }

  private func RefractionSlider() Blob {
    let value = Refraction.Value
    return Container{
      Key: "glass-refraction-wrap",
      Width: Length.Percent(100),
      Height: 48,
      Position: PositionType.Relative,
      Children: {
        Container{
          Key: "glass-refraction",
          Position: PositionType.Absolute,
          Left: 0,
          Top: 0,
          Width: Length.Percent(100),
          Height: 48,
          PaddingLeft: 16,
          PaddingRight: 16,
          Gap: 14,
          FlexDirection: FlexDirection.Row,
          AlignItems: AlignItems.Center,
          BorderRadius: 24,
          BackgroundColor: Color.Transparent,
          Handle: LavaCell.SliderSurface,
          Children: {
            Container{
              Key: "glass-refraction-label-wrap",
              Width: 108,
              Height: 24,
              Children: { GlassLabel("glass-refraction-label", "REFRACT", 11.0) },
            },
            Container{
              Key: "glass-refract-track",
              FlexGrow: 1,
              MinWidth: 0,
              Height: 10,
              Position: PositionType.Relative,
              Handle: LavaCell.FlowTrack,
              Cursor: Cursor.Pointer,
              BorderRadius: 5,
              BackgroundColor: Color.Rgba(4, 8, 18, 82),
              OnPointerDown: (event PointerEvent) -> { BeginSlider(event) },
              OnPointerMove: (event PointerEvent) -> { MoveSlider(event) },
              OnPointerUp: (event PointerEvent) -> { EndSlider(event) },
              OnPointerCancel: (event PointerEvent) -> { CancelSlider(event) },
              Children: {
                Container{
                  Key: "glass-refract-fill",
                  Position: PositionType.Absolute,
                  Left: 0,
                  Top: 0,
                  Width: Length.Percent(value * 100.0),
                  Height: Length.Percent(100),
                  BorderRadius: 5,
                  BackgroundColor: Color.Rgba(196, 218, 255, 180),
                },
                Container{
                  Key: "glass-refract-thumb",
                  Position: PositionType.Absolute,
                  Left: Length.Percent(value * 100.0),
                  Top: -7,
                  Width: 24,
                  Height: 24,
                  BorderRadius: 12,
                  BackgroundColor: Color.Rgb(248, 250, 255),
                  BorderWidth: 1,
                  BorderStyle: BorderStyle.Solid,
                  BorderColor: Color.Rgba(145, 180, 255, 150),
                },
              },
            },
          },
        },
      },
    }
  }

  private func Rail() Blob {
    let children = List[Blob](2)
    if Expanded.Value {
      children.Add(Container{
        Key: "glass-controls-row",
        Width: Length.Percent(100),
        MinHeight: 64,
        Gap: 10,
        FlexDirection: FlexDirection.Row,
        Children: {
          ModeGroup(),
          ActionGroup(),
        },
      })
      children.Add(RefractionSlider())
    } else {
      children.Add(CollapsedControl())
    }
    return Container{
      Key: "glass-controls",
      Width: Expanded.Value ? Length.Percent(92) : Length(56),
      MaxWidth: 660,
      Position: PositionType.Absolute,
      Right: 16,
      Bottom: 96,
      Gap: 10,
      FlexDirection: FlexDirection.Column,
      Overflow: Overflow.Visible,
      Handle: LavaCell.RailHandle,
      Children: children,
    }
  }

  private func GlassField() Blob -> Container {
    Key: "glass-field",
    Position: PositionType.Absolute,
    Left: 0,
    Top: 0,
    Width: Length.Percent(100),
    Height: Length.Percent(100),
    HitTestSelf: false,
    BackgroundColor: Color.Transparent,
    ShaderEffect: Glass,
  }

  override func Build() Blob -> Container {
    Key: "lava-root",
    Width: Length.Percent(100),
    Height: Length.Percent(100),
    MinWidth: 0,
    MinHeight: 0,
    Position: PositionType.Relative,
    Overflow: Overflow.Hidden,
    Handle: LavaCell.Root,
    BackgroundColor: Color.Rgb(25, 24, 23),
    OnPointerMove: (event PointerEvent) -> { MoveOrb(event) },
    Children: {
      LavaShowcaseFactory.Surface(
        Flow.Value,
        Form.Value,
        Blend.Value,
        Light.Value,
        Hue.Value,
        Rainbow.Value,
        Rotation.Value,
        Seed.Value,
        LavaCell.Surface,
        (event PointerEvent) -> { BeginField(event) },
        (event PointerEvent) -> { MoveField(event) },
        (event PointerEvent) -> { EndField(event) },
        (event PointerEvent) -> { CancelField(event) }),
      GlassField(),
      Rail(),
    },
  }
}
