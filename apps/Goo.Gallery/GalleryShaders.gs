package GooGallery

import System
import System.Collections.Generic
import System.IO
import System.Numerics
import Goo

class GalleryShaderPrograms {
  private let lab[8]ShaderEffect
  private let studio[8]ShaderEffect
  /// Gets the radial light shader effect used by the hero header.
  public let Hero ShaderEffect

  public init() {
    let wolfensteinBytes = File.ReadAllBytes(
      Path.Combine(AppContext.BaseDirectory, "Shaders", "wolfenstein.spv"))
    let chromeBytes = File.ReadAllBytes(
      Path.Combine(AppContext.BaseDirectory, "Shaders", "chrome_sdf.spv"))
    let corridorBytes = File.ReadAllBytes(
      Path.Combine(AppContext.BaseDirectory, "Shaders", "corridor.spv"))
    let radialBytes = File.ReadAllBytes(
      Path.Combine(AppContext.BaseDirectory, "Shaders", "radial_light.spv"))
    let rippleBytes = File.ReadAllBytes(
      Path.Combine(AppContext.BaseDirectory, "Shaders", "ripple.spv"))
    let glassBytes = File.ReadAllBytes(
      Path.Combine(AppContext.BaseDirectory, "Shaders", "glass.spv"))
    let volumetricBytes = File.ReadAllBytes(
      Path.Combine(AppContext.BaseDirectory, "Shaders", "volumetric.spv"))
    let ditherBytes = File.ReadAllBytes(
      Path.Combine(AppContext.BaseDirectory, "Shaders", "dither.spv"))

    lab = [8]ShaderEffect
    studio = [8]ShaderEffect
    lab[0] = ShaderEffect(wolfensteinBytes, samplesBackdrop: false)
    lab[1] = ShaderEffect(chromeBytes, samplesBackdrop: false)
    lab[2] = ShaderEffect(corridorBytes, samplesBackdrop: false)
    lab[3] = ShaderEffect(radialBytes, samplesBackdrop: false)
    lab[4] = ShaderEffect(rippleBytes, samplesBackdrop: false)
    lab[5] = ShaderEffect(glassBytes, samplesBackdrop: true, backdropOutset: 16.0F)
    lab[6] = ShaderEffect(volumetricBytes, samplesBackdrop: false)
    lab[7] = ShaderEffect(ditherBytes, samplesBackdrop: false)

    studio[0] = ShaderEffect(wolfensteinBytes, samplesBackdrop: false)
    studio[1] = ShaderEffect(chromeBytes, samplesBackdrop: false)
    studio[2] = ShaderEffect(corridorBytes, samplesBackdrop: false)
    studio[3] = ShaderEffect(radialBytes, samplesBackdrop: false)
    studio[4] = ShaderEffect(rippleBytes, samplesBackdrop: false)
    studio[5] = ShaderEffect(glassBytes, samplesBackdrop: true, backdropOutset: 16.0F)
    studio[6] = ShaderEffect(volumetricBytes, samplesBackdrop: false)
    studio[7] = ShaderEffect(ditherBytes, samplesBackdrop: false)

    Hero = ShaderEffect(radialBytes, samplesBackdrop: false)
    lab[7].SetParameter(2, Vector4(0.0F, 0.5F, 1.0F, 0.0F))
  }

  /// Gets the Shader Lab effect instance for the specified program index.
  public func Lab(index int32) ShaderEffect -> lab[index]

  /// Gets the Final Synthesis studio effect instance for the specified program index.
  public func Studio(index int32) ShaderEffect -> studio[index]
}

class GalleryClockSimulation : Simulation {
  private let offset float64

  /// Creates a clock simulation that starts at the specified offset.
  /// @param offset initial scalar value for the clock.
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

class WolfensteinCell : Cell {
  private let Canvas ElementHandle
  private let mapRows[16]uint32
  private let clock Anim[float64]
  private var camX float64
  private var camY float64
  private var camAngle float64
  private var lastTime float64
  private var keyW bool
  private var keyA bool
  private var keyS bool
  private var keyD bool
  private var focused bool
  private var dragging bool
  private var pointerX float64
  private var pointerY float64
  private var pointerPressure float64
  private var pointerDown bool

  /// Gets or sets the wolfenstein raycaster shader effect.
  public var Effect ShaderEffect?
  /// Gets or sets the camera field of view in degrees.
  public var Fov float64
  /// Gets or sets the wall shading contrast factor.
  public var Contrast float64
  /// Gets or sets the distance fog density.
  public var Fog float64
  /// Gets or sets whether camera animations and input updates are playing.
  public var Playing bool

  public init() {
    Canvas = ElementHandle{}
    mapRows = [16]uint32{
      0xFFFFu, 0x8001u, 0x8811u, 0x8001u,
      0xFF7Fu, 0x8001u, 0x8811u, 0x8001u,
      0xEFF7u, 0x8001u, 0x8811u, 0x8001u,
      0xFF7Fu, 0x8001u, 0x8811u, 0xFFFFu,
    }
    clock = Animate(0.0)
    clock.To(1000000000.0, (start float64, target float64, velocity float64) -> {
      return GalleryClockSimulation(0.0)
    })
    camX = 2.5
    camY = 2.5
    camAngle = 0.0
    lastTime = 0.0
    keyW = false
    keyA = false
    keyS = false
    keyD = false
    focused = false
    dragging = false
    pointerX = 0.5
    pointerY = 0.5
    pointerPressure = 0.0
    pointerDown = false
    Effect = nil
    Fov = 1.0
    Contrast = 1.0
    Fog = 0.35
    Playing = true
  }

  private func isWall(x int32, y int32) bool {
    if x < 0 || y < 0 || x >= 16 || y >= 16 {
      return true
    }
    let bit = uint32(1) << x
    return (mapRows[y] & bit) != 0u
  }

  private func canOccupy(x float64, y float64) bool {
    let radius = 0.2
    let centerX = int32(Math.Floor(x))
    let centerY = int32(Math.Floor(y))
    let leftX = int32(Math.Floor(x - radius))
    let rightX = int32(Math.Floor(x + radius))
    let topY = int32(Math.Floor(y - radius))
    let bottomY = int32(Math.Floor(y + radius))
    if isWall(centerX, centerY) {
      return false
    }
    if isWall(leftX, centerY) || isWall(rightX, centerY) {
      return false
    }
    if isWall(centerX, topY) || isWall(centerX, bottomY) {
      return false
    }
    return true
  }

  private func keyHandled(key Key) bool -> key == Key.W || key == Key.A || key == Key.S || key == Key.D
    || key == Key.Up || key == Key.Down || key == Key.Left || key == Key.Right

  private func setKey(key Key, value bool) {
    if key == Key.W || key == Key.Up {
      keyW = value
    } else if key == Key.A || key == Key.Left {
      keyA = value
    } else if key == Key.S || key == Key.Down {
      keyS = value
    } else if key == Key.D || key == Key.Right {
      keyD = value
    }
  }

  override func Build() Blob {
    let time = clock.Value
    let dt = Math.Clamp(time - lastTime, 0.0, 0.1)
    lastTime = time
    if Playing {
      let directionX = Math.Cos(camAngle)
      let directionY = Math.Sin(camAngle)
      let strafeX = directionY
      let strafeY = -directionX
      var moveX float64 = 0.0
      var moveY float64 = 0.0
      if keyW {
        moveX = moveX + directionX
        moveY = moveY + directionY
      }
      if keyS {
        moveX = moveX - directionX
        moveY = moveY - directionY
      }
      if keyA {
        moveX = moveX + strafeX
        moveY = moveY + strafeY
      }
      if keyD {
        moveX = moveX - strafeX
        moveY = moveY - strafeY
      }
      let moveLength = Math.Sqrt(moveX * moveX + moveY * moveY)
      if moveLength > 0.000001 {
        let speed = 2.2 * dt / moveLength
        let nextX = camX + moveX * speed
        let nextY = camY + moveY * speed
        if canOccupy(nextX, camY) {
          camX = nextX
        }
        if canOccupy(camX, nextY) {
          camY = nextY
        }
      }
    }

    if let effect = Effect {
      let bounds = Canvas.BorderBox
      let playing = if Playing { 1.0F } else { 0.0F }
      let directionX = Math.Cos(camAngle)
      let directionY = Math.Sin(camAngle)
      effect.SetParameter(0, Vector4(
        float32(time),
        float32(bounds.Width),
        float32(bounds.Height),
        playing))
      effect.SetParameter(1, Vector4(
        float32(pointerX),
        float32(pointerY),
        float32(pointerPressure),
        if pointerDown { 1.0F } else { 0.0F }))
      effect.SetParameter(2, Vector4(
        float32(camX),
        float32(camY),
        float32(directionX),
        float32(directionY)))
      effect.SetParameter(3, Vector4(
        float32(Fov),
        float32(Contrast),
        float32(Fog),
        0.0F))
    }

    return Container{
      Width: Length.Percent(100.0),
      AspectRatio: 16.0 / 9.0,
      Handle: Canvas,
      BackgroundColor: GalleryTheme.SurfaceRaised,
      ShaderEffect: Effect,
      Focusable: true,
      Focus: Style{ OutlineWidth: 1.0, OutlineColor: GalleryTheme.BorderStrong },
      OnFocus: func(e FocusEvent) { focused = true },
      OnBlur: func(e FocusEvent) {
        focused = false
        keyW = false
        keyA = false
        keyS = false
        keyD = false
      },
      OnPointerDown: func(e PointerEvent) {
        focused = true
        Canvas.Focus()
        e.Capture()
        e.PreventDefault()
        dragging = true
        let bounds = Canvas.BorderBox
        pointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        pointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        pointerPressure = e.Pressure
        pointerDown = true
        Rebuild()
      },
      OnPointerMove: func(e PointerEvent) {
        if dragging {
          camAngle = camAngle + e.Delta.X * 0.008
        }
        let bounds = Canvas.BorderBox
        pointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        pointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        pointerPressure = e.Pressure
        Rebuild()
      },
      OnPointerUp: func(e PointerEvent) {
        dragging = false
        pointerDown = false
        pointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
      OnPointerCancel: func(e PointerEvent) {
        dragging = false
        pointerDown = false
        pointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
      OnKeyDown: func(e KeyEvent) {
        if keyHandled(e.Key) {
          e.PreventDefault()
          setKey(e.Key, true)
        }
      },
      OnKeyUp: func(e KeyEvent) {
        if keyHandled(e.Key) {
          e.PreventDefault()
          setKey(e.Key, false)
        }
      },
    }
  }
}

class ShaderLabCell : Cell {
  /// Gets or sets the pre-generated mathematical vector and image assets.
  public var Assets GalleryMathAssets?
  /// Gets or sets the compiled shader program suite.
  public var Programs GalleryShaderPrograms?
  /// Gets or sets whether shader animations are currently playing.
  public var Playing bool
  /// Gets or sets whether shader cards use compact single-column sizing.
  public var Compact bool
  /// Gets or sets whether this chapter owns live shader surfaces.
  public prop Active bool{
    get -> active
    set {
      if active == value {
        return
      }
      active = value
      if active && Playing {
        clock.To(baseTime + 1000000000.0,
          (start float64, target float64, velocity float64) -> {
            return GalleryClockSimulation(baseTime)
          })
      } else if !active {
        baseTime = clock.Value
        clock.Set(baseTime)
      }
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
      Rebuild()
    }
  }

  private let clock Anim[float64]
  private let ChromeCanvas ElementHandle
  private let RadialCanvas ElementHandle
  private let RippleCanvas ElementHandle
  private let GlassCanvas ElementHandle
  private let CorridorCanvas ElementHandle
  private var active bool
  private let VolumeCanvas ElementHandle
  private var showcase int32
  private var baseTime float64
  private var chromeYaw float64
  private var chromePitch float64
  private var chromePointerX float64
  private var chromePointerY float64
  private var chromePointerDown bool
  private var chromePointerPressure float64
  private var radialPointerPressure float64
  private var ripplePointerPressure float64
  private var glassPointerPressure float64
  private var chromeDragging bool
  private var radialPointerX float64
  private var radialPointerY float64
  private var radialPointerDown bool
  private var ripplePointerX float64
  private var ripplePointerY float64
  private var ripplePointerDown bool
  private var glassPointerX float64
  private var glassPointerY float64
  private var glassPointerDown bool
  private let rippleX[3]float64
  private let rippleY[3]float64
  private let rippleStart[3]float64
  private let rippleAmplitude[3]float64
  private var rippleCount int32
  private var roughness float64
  private var morph float64
  private var fov float64
  private var contrast float64
  private var fog float64

  public init() {
    Assets = nil
    Programs = nil
    Playing = true
    showcase = 0
    Compact = false
    active = false
    clock = Animate(0.0)
    ChromeCanvas = ElementHandle{}
    RadialCanvas = ElementHandle{}
    RippleCanvas = ElementHandle{}
    CorridorCanvas = ElementHandle{}
    VolumeCanvas = ElementHandle{}
    GlassCanvas = ElementHandle{}
    rippleY = [3]float64
    rippleStart = [3]float64
    rippleAmplitude = [3]float64
    baseTime = 0.0
    chromeYaw = 0.7
    chromePitch = 0.06
    chromePointerX = 0.5
    chromePointerY = 0.5
    chromePointerPressure = 0.0
    chromePointerDown = false
    chromeDragging = false
    radialPointerX = 0.5
    radialPointerY = 0.5
    radialPointerPressure = 0.0
    radialPointerDown = false
    ripplePointerX = 0.5
    ripplePointerY = 0.5
    ripplePointerPressure = 0.0
    ripplePointerDown = false
    glassPointerX = 0.5
    glassPointerY = 0.5
    glassPointerPressure = 0.0
    glassPointerDown = false
    rippleCount = 0
    roughness = 0.25
    morph = 0.4
    fov = 1.0
    contrast = 1.0
    fog = 0.35
  }

  private func frameValue() float32 -> if Playing { 1.0F } else { 0.0F }

  private func writeFrame(
    effect ShaderEffect,
    handle ElementHandle,
    time float64,
    pointerX float64,
    pointerY float64,
    pointerPressure float64,
    pointerDown bool) {
      let bounds = handle.BorderBox
      let down = if pointerDown { 1.0F } else { 0.0F }
      effect.SetParameter(0, Vector4(
        float32(time),
        float32(bounds.Width),
        float32(bounds.Height),
        frameValue()))
      effect.SetParameter(1, Vector4(
        float32(Math.Clamp(pointerX, 0.0, 1.0)),
        float32(Math.Clamp(pointerY, 0.0, 1.0)),
        float32(Math.Clamp(pointerPressure, 0.0, 1.0)),
        down))
    }

  private func frameChildren(name string, hint string, content Blob) Container {
    let children = List[Blob]()
    children.Add(Container{
      Key: "spec-name",
      Children: { GalleryTheme.SpecimenName(name) },
    })
    children.Add(Container{
      Key: "spec-content",
      Children: { content },
    })
    children.Add(GalleryTheme.Hint(hint))
    let frame = GalleryTheme.Frame(children)
    return Container{
      Key: "spec-" + name,
      Width: Length.Percent(100.0),
      Color: Color.Transparent,
      Focusable: true,
      TransitionMs: 100.0,
      Hover: Style{ Color: GalleryTheme.InkSubtle },
      Focus: Style{
        Color: GalleryTheme.InkSubtle,
        OutlineWidth: 1.0,
        OutlineColor: GalleryTheme.BorderStrong,
      },
      Children: { frame },
    }
  }

  private func effectsReady() bool -> Active

  private func activeEffect(effect ShaderEffect) ShaderEffect? {
    if effectsReady() {
      return effect
    }
    return nil
  }

  private func addRipple(x float64, y float64) {
    var index int32 = 2
    while index > 0 {
      rippleX[index] = rippleX[index - 1]
      rippleY[index] = rippleY[index - 1]
      rippleStart[index] = rippleStart[index - 1]
      rippleAmplitude[index] = rippleAmplitude[index - 1]
      index = index - 1
    }
    rippleX[0] = Math.Clamp(x, 0.0, 1.0)
    rippleY[0] = Math.Clamp(y, 0.0, 1.0)
    rippleStart[0] = clock.Value
    rippleAmplitude[0] = 1.0
    if rippleCount < 3 {
      rippleCount = rippleCount + 1
    }
  }

  private func buildChrome(programs GalleryShaderPrograms, time float64) Container {
    let effect = programs.Lab(1)
    writeFrame(effect, ChromeCanvas, time, chromePointerX, chromePointerY,
      chromePointerPressure, chromePointerDown)
    effect.SetParameter(2, Vector4(
      float32(chromeYaw),
      float32(chromePitch),
      float32(roughness),
      float32(morph)))
    return Container{
      Key: if effectsReady() { "chrome-live" } else { "chrome-idle" },
      Width: Length.Percent(100.0),
      AspectRatio: 16.0 / 9.0,
      Handle: ChromeCanvas,
      BackgroundColor: GalleryTheme.SurfaceRaised,
      ShaderEffect: activeEffect(effect),
      Focusable: true,
      Focus: Style{ OutlineWidth: 1.0, OutlineColor: GalleryTheme.BorderStrong },
      OnPointerDown: func(e PointerEvent) {
        e.Capture()
        e.PreventDefault()
        chromeDragging = true
        chromePointerDown = true
        let bounds = ChromeCanvas.BorderBox
        chromePointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        chromePointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        chromePointerPressure = e.Pressure
        Rebuild()
      },
      OnPointerMove: func(e PointerEvent) {
        let bounds = ChromeCanvas.BorderBox
        chromePointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        chromePointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        chromePointerPressure = e.Pressure
        if chromeDragging {
          chromeYaw = chromeYaw + e.Delta.X * 0.008
          chromePitch = Math.Clamp(chromePitch + e.Delta.Y * 0.006, -1.05, 1.05)
        }
        Rebuild()
      },
      OnPointerUp: func(e PointerEvent) {
        chromeDragging = false
        chromePointerDown = false
        chromePointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
      OnPointerCancel: func(e PointerEvent) {
        chromeDragging = false
        chromePointerDown = false
        chromePointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
    }
  }

  private func buildCorridor(programs GalleryShaderPrograms, time float64) Container {
    let effect = programs.Lab(2)
    writeFrame(effect, CorridorCanvas, time, 0.5, 0.5, 0.0, false)
    effect.SetParameter(2, Vector4(0.7F, 0.5F, 0.8F, 0.0F))
    return Container{
      Key: if effectsReady() { "corridor-live" } else { "corridor-idle" },
      Width: Length.Percent(100.0),
      AspectRatio: 16.0 / 9.0,
      Handle: CorridorCanvas,
      BackgroundColor: GalleryTheme.SurfaceRaised,
      ShaderEffect: activeEffect(effect),
    }
  }

  private func buildRadial(programs GalleryShaderPrograms, time float64) Container {
    let effect = programs.Lab(3)
    writeFrame(effect, RadialCanvas, time, radialPointerX, radialPointerY,
      radialPointerPressure, radialPointerDown)
    effect.SetParameter(2, Vector4(0.45F, 0.9F, 2.0F, 0.0F))
    return Container{
      Key: if effectsReady() { "radial-live" } else { "radial-idle" },
      Width: Length.Percent(100.0),
      AspectRatio: 16.0 / 9.0,
      Handle: RadialCanvas,
      BackgroundColor: GalleryTheme.SurfaceRaised,
      ShaderEffect: activeEffect(effect),
      Focusable: true,
      Focus: Style{ OutlineWidth: 1.0, OutlineColor: GalleryTheme.BorderStrong },
      OnPointerDown: func(e PointerEvent) {
        e.Capture()
        e.PreventDefault()
        radialPointerDown = true
        let bounds = RadialCanvas.BorderBox
        radialPointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        radialPointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        radialPointerPressure = e.Pressure
        Rebuild()
      },
      OnPointerMove: func(e PointerEvent) {
        let bounds = RadialCanvas.BorderBox
        radialPointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        radialPointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        radialPointerPressure = e.Pressure
        Rebuild()
      },
      OnPointerUp: func(e PointerEvent) {
        radialPointerDown = false
        radialPointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
      OnPointerCancel: func(e PointerEvent) {
        radialPointerDown = false
        radialPointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
      Children: {
        Text{
          Content: "RADIAL",
          FontSize: 42.0,
          FontWeight: 700.0,
          Color: GalleryTheme.Ink,
          Position: PositionType.Absolute,
          Left: 24.0,
          Top: 28.0,
        },
      },
    }
  }

  private func buildRipple(programs GalleryShaderPrograms, time float64) Container {
    let effect = programs.Lab(4)
    writeFrame(effect, RippleCanvas, time, ripplePointerX, ripplePointerY,
      ripplePointerPressure, ripplePointerDown)
    var index int32 = 0
    while index < 3 {
      let age = if index < rippleCount {
        Math.Max(0.0, time - rippleStart[index])
      } else {
        20.0
      }
      let amplitude = if index < rippleCount {
        rippleAmplitude[index] * Math.Exp(-age * 0.8)
      } else {
        0.0
      }
      effect.SetParameter(2 + index, Vector4(
        float32(rippleX[index]),
        float32(rippleY[index]),
        float32(age),
        float32(amplitude)))
      index = index + 1
    }
    effect.SetParameter(5, Vector4(5.0F, 2.5F, 0.0F, 0.0F))
    let layers = List[Blob]()
    if let assets = Assets {
      layers.Add(Image{
        Key: "source",
        Position: PositionType.Absolute,
        Left: 0.0,
        Top: 0.0,
        Width: Length.Percent(100.0),
        Height: Length.Percent(100.0),
        Source: assets.Mandelbrot,
        Fit: ImageFit.Fill,
      })
    }
    layers.Add(Text{
      Key: "ripple-label",
      Content: "RIPPLE / MEMORY",
      FontSize: 22.0,
      FontWeight: 700.0,
      Color: GalleryTheme.Ink,
      Position: PositionType.Absolute,
      Left: 18.0,
      Top: 20.0,
    })
    return Container{
      Key: if effectsReady() { "ripple-live" } else { "ripple-idle" },
      Width: Length.Percent(100.0),
      AspectRatio: 16.0 / 9.0,
      Handle: RippleCanvas,
      Position: PositionType.Relative,
      BackgroundColor: GalleryTheme.SurfaceRaised,
      ShaderEffect: activeEffect(effect),
      Focusable: true,
      Focus: Style{ OutlineWidth: 1.0, OutlineColor: GalleryTheme.BorderStrong },
      OnPointerDown: func(e PointerEvent) {
        e.Capture()
        e.PreventDefault()
        ripplePointerDown = true
        let bounds = RippleCanvas.BorderBox
        ripplePointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        ripplePointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        ripplePointerPressure = e.Pressure
        addRipple(ripplePointerX, ripplePointerY)
        Rebuild()
      },
      OnPointerMove: func(e PointerEvent) {
        let bounds = RippleCanvas.BorderBox
        ripplePointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        ripplePointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        ripplePointerPressure = e.Pressure
        Rebuild()
      },
      OnPointerUp: func(e PointerEvent) {
        ripplePointerDown = false
        ripplePointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
      OnPointerCancel: func(e PointerEvent) {
        ripplePointerDown = false
        ripplePointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
      Children: layers,
    }
  }

  private func buildGlass(programs GalleryShaderPrograms, time float64) Container {
    let effect = programs.Lab(5)
    writeFrame(effect, GlassCanvas, time, glassPointerX, glassPointerY,
      glassPointerPressure, glassPointerDown)
    effect.SetParameter(2, Vector4(0.4F, 0.3F, 0.5F, 0.0F))
    return Container{
      Key: if effectsReady() { "glass-live" } else { "glass-idle" },
      Width: Length.Percent(100.0),
      AspectRatio: 16.0 / 9.0,
      Handle: GlassCanvas,
      Position: PositionType.Relative,
      BackgroundColor: GalleryTheme.SurfaceRaised,
      ShaderEffect: activeEffect(effect),
      Focusable: true,
      Focus: Style{ OutlineWidth: 1.0, OutlineColor: GalleryTheme.BorderStrong },
      OnPointerDown: func(e PointerEvent) {
        e.Capture()
        e.PreventDefault()
        glassPointerDown = true
        let bounds = GlassCanvas.BorderBox
        glassPointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        glassPointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        glassPointerPressure = e.Pressure
        Rebuild()
      },
      OnPointerMove: func(e PointerEvent) {
        let bounds = GlassCanvas.BorderBox
        glassPointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        glassPointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        glassPointerPressure = e.Pressure
        Rebuild()
      },
      OnPointerUp: func(e PointerEvent) {
        glassPointerDown = false
        glassPointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
      OnPointerCancel: func(e PointerEvent) {
        glassPointerDown = false
        glassPointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
      Children: {
        Container{
          Position: PositionType.Absolute,
          Left: 20.0,
          Top: 22.0,
          Width: 120.0,
          Height: 72.0,
          BackgroundColor: Color.Rgb(76, 139, 158),
        },
        Container{
          Position: PositionType.Absolute,
          Left: 108.0,
          Top: 62.0,
          Width: 104.0,
          Height: 76.0,
          BackgroundColor: Color.Rgb(191, 120, 67),
        },
        Text{
          Content: "GLASS",
          Position: PositionType.Absolute,
          Left: 28.0,
          Top: 32.0,
          FontSize: 34.0,
          FontWeight: 700.0,
          Color: GalleryTheme.Ink,
        },
      },
    }
  }

  private func buildVolume(programs GalleryShaderPrograms, time float64) Container {
    let effect = programs.Lab(6)
    writeFrame(effect, VolumeCanvas, time, 0.5, 0.5, 0.0, false)
    effect.SetParameter(2, Vector4(0.9F, 0.4F, 0.5F, 0.0F))
    return Container{
      Key: if effectsReady() { "volume-live" } else { "volume-idle" },
      Width: Length.Percent(100.0),
      AspectRatio: 16.0 / 9.0,
      Handle: VolumeCanvas,
      BackgroundColor: GalleryTheme.SurfaceRaised,
      ShaderEffect: activeEffect(effect),
    }
  }

  private func buildDither(programs GalleryShaderPrograms) Container {
    let effect = programs.Lab(7)
    return Container{
      Key: if effectsReady() { "dither-live" } else { "dither-idle" },
      Width: Length.Percent(100.0),
      AspectRatio: 16.0 / 9.0,
      BackgroundColor: GalleryTheme.SurfaceRaised,
      ShaderEffect: activeEffect(effect),
      Children: {
        Text{
          Content: "ORDER / SIGNAL",
          Position: PositionType.Absolute,
          Left: 20.0,
          Top: 20.0,
          FontSize: 30.0,
          FontWeight: 700.0,
          Color: GalleryTheme.Ink,
        },
        Text{
          Content: "4 x 4",
          Position: PositionType.Absolute,
          Left: 22.0,
          Bottom: 18.0,
          FontSize: 13.0,
          Color: GalleryTheme.InkMuted,
        },
      },
    }
  }

  private func sliderControl(key string, label string, min float64, max float64,
    value float64, change Action[float64]) Container -> Container{
      Key: "control-" + key,
      Width: Length.Percent(100.0),
      Children: {
        Cell.Mount[GalleryRange](key, func(slider GalleryRange) {
          slider.Label = label
          slider.MinValue = min
          slider.MaxValue = max
          slider.Value = value
          slider.Step = 0.01
          slider.OnChange = change
        }),
      },
    }

  private func selectedSpecimen(programs GalleryShaderPrograms, time float64) Blob {
    if Showcase == 0 {
      var wolf Blob = Container{
        Width: Length.Percent(100.0),
        AspectRatio: 16.0 / 9.0,
        BackgroundColor: GalleryTheme.SurfaceRaised,
      }
      if effectsReady() {
        wolf = Cell.Mount[WolfensteinCell]("wolfenstein-live", func(cell WolfensteinCell) {
          cell.Effect = programs.Lab(0)
          cell.Fov = fov
          cell.Contrast = contrast
          cell.Fog = fog
          cell.Playing = Playing
        })
      }
      return frameChildren(
        "Wolfenstein",
        "W/S move forward and back; A/D strafe; drag to look",
        wolf)
    }
    if Showcase == 1 {
      return frameChildren("Chrome SDF", "Drag to orbit the sculpture", buildChrome(programs, time))
    }
    if Showcase == 2 {
      return frameChildren("Corridor", "Ambient speed, depth, and glow", buildCorridor(programs, time))
    }
    if Showcase == 3 {
      return frameChildren("Radial Light", "Move the source with the pointer", buildRadial(programs, time))
    }
    if Showcase == 4 {
      return frameChildren("Ripple", "Click to seed a wave", buildRipple(programs, time))
    }
    if Showcase == 5 {
      return frameChildren("Glass", "Move across the refractive lens", buildGlass(programs, time))
    }
    if Showcase == 6 {
      return frameChildren("Volumetric", "Watch the density field drift", buildVolume(programs, time))
    }
    return frameChildren("Dither", "A shared 4 x 4 or 8 x 8 Bayer source", buildDither(programs))
  }

  private func buildContent(programs GalleryShaderPrograms) Container {
    let time = if Active { clock.Value } else { baseTime }
    let controls = List[Blob]()
    controls.Add(Container{
      Key: "lab-play",
      Width: Length.Percent(100.0),
      Children: {
        GalleryTheme.GhostButton(
          if Playing { "Pause ambient motion" } else { "Play ambient motion" },
          func() { TogglePlaying() }),
      },
    })
    if Showcase == 0 {
      controls.Add(sliderControl("fov", "FOV", 0.45, 1.25, fov, func(value float64) {
        fov = value
        Rebuild()
      }))
      controls.Add(sliderControl("contrast", "Contrast", 0.5, 1.8, contrast, func(value float64) {
        contrast = value
        Rebuild()
      }))
      controls.Add(sliderControl("fog", "Fog", 0.0, 1.0, fog, func(value float64) {
        fog = value
        Rebuild()
      }))
    } else if Showcase == 1 {
      controls.Add(sliderControl("roughness", "Roughness", 0.0, 1.0, roughness, func(value float64) {
        roughness = value
        Rebuild()
      }))
      controls.Add(sliderControl("morph", "Morph", 0.0, 1.0, morph, func(value float64) {
        morph = value
        Rebuild()
      }))
    }
    return Container{
      Width: Length.Percent(100.0),
      Height: Length.Percent(100.0),
      FlexDirection: FlexDirection.Row,
      Gap: 16.0,
      AlignItems: AlignItems.Center,
      Children: {
        Container{
          Key: "lab-specimen",
          MinWidth: 0.0,
          FlexGrow: 1.0,
          FlexShrink: 1.0,
          Children: { selectedSpecimen(programs, time) },
        },
        Container{
          Key: "lab-controls",
          Width: 280.0,
          MinWidth: 280.0,
          FlexShrink: 0.0,
          FlexDirection: FlexDirection.Column,
          Gap: 12.0,
          Children: controls,
        },
      },
    }
  }

  private func TogglePlaying() {
    if Playing {
      let pausedAt = clock.Value
      baseTime = pausedAt
      Playing = false
      clock.Set(pausedAt)
    } else {
      Playing = true
      if Active {
        clock.To(baseTime + 1000000000.0,
          (start float64, target float64, velocity float64) -> {
            return GalleryClockSimulation(baseTime)
          })
      }
    }
    Rebuild()
  }

  override func Build() Blob {
    if let programs = Programs {
      return buildContent(programs)
    }
    return frameChildren("Shader Lab", "Shader programs are loading", Container{
      Width: Length.Percent(100.0),
      Height: 120.0,
      BackgroundColor: GalleryTheme.SurfaceRaised,
    })
  }
}

class StudioCell : Cell {
  /// Gets or sets the pre-generated mathematical vector and image assets.
  public var Assets GalleryMathAssets?
  /// Gets or sets the compiled shader program suite.
  public var Programs GalleryShaderPrograms?
  /// Gets or sets whether studio cards use compact single-column sizing.
  public var Compact bool
  /// Gets or sets whether this chapter owns its live shader surface.
  public prop Active bool{
    get -> active
    set {
      if active == value {
        return
      }
      active = value
      if active && playing {
        clock.To(baseTime + 1000000000.0,
          (start float64, target float64, velocity float64) -> {
            return GalleryClockSimulation(baseTime)
          })
      } else if !active {
        baseTime = clock.Value
        clock.Set(baseTime)
      }
      Rebuild()
    }
  }

  private let clock Anim[float64]
  private let Canvas ElementHandle
  private var selected int32
  private var title string
  private var playing bool
  private var c0 float64
  private var active bool
  private var c1 float64
  private var c2 float64
  private var palette int32
  private var pointerX float64
  private var pointerY float64
  private var pointerPressure float64
  private var pointerDown bool
  private var ringX[3]float64
  private var ringY[3]float64
  private var ringStart[3]float64
  private var ringCount int32
  private var baseTime float64

  public init() {
    Assets = nil
    Programs = nil
    Compact = false
    active = false
    clock = Animate(0.0)
    Canvas = ElementHandle{}
    selected = 0
    title = "FORM / FIELD"
    playing = true
    c0 = 72.0
    c1 = 1.0
    c2 = 0.35
    palette = 0
    pointerX = 0.5
    pointerY = 0.5
    pointerPressure = 0.0
    pointerDown = false
    ringX = [3]float64
    ringY = [3]float64
    ringStart = [3]float64
    ringCount = 0
    baseTime = 0.0
  }
  private func effectsReady() bool -> Active

  private func activeEffect(effect ShaderEffect) ShaderEffect? {
    if effectsReady() {
      return effect
    }
    return nil
  }

  private func firstLabel() string {
    if selected == 0 {
      return "FOV"
    }
    if selected == 1 {
      return "Orbit"
    }
    if selected == 2 {
      return "Speed"
    }
    if selected == 3 {
      return "Radius"
    }
    if selected == 4 {
      return "Amplitude"
    }
    if selected == 5 {
      return "Refraction"
    }
    if selected == 6 {
      return "Density"
    }
    return "Matrix"
  }

  private func secondLabel() string {
    if selected == 0 {
      return "Contrast"
    }
    if selected == 1 {
      return "Roughness"
    }
    if selected == 2 {
      return "Depth"
    }
    if selected == 3 {
      return "Intensity"
    }
    if selected == 4 {
      return "Frequency"
    }
    if selected == 5 {
      return "Blur"
    }
    if selected == 6 {
      return "Turbulence"
    }
    return "Threshold"
  }

  private func thirdLabel() string {
    if selected == 0 {
      return "Fog"
    }
    if selected == 1 {
      return "Morph"
    }
    if selected == 2 {
      return "Glow"
    }
    if selected == 3 {
      return "Falloff"
    }
    if selected == 4 {
      return "Decay"
    }
    if selected == 5 {
      return "Tint"
    }
    if selected == 6 {
      return "Drift"
    }
    return "Palette"
  }

  private func firstMin() float64 {
    if selected == 0 { return 60.0 }
    if selected == 1 { return 0.0 }
    if selected == 2 { return 0.0 }
    if selected == 3 { return 0.1 }
    if selected == 4 { return 0.0 }
    if selected == 5 { return 0.0 }
    if selected == 6 { return 0.0 }
    return 0.0
  }

  private func firstMax() float64 {
    if selected == 0 { return 100.0 }
    if selected == 1 { return 360.0 }
    if selected == 2 { return 2.0 }
    if selected == 3 { return 0.9 }
    if selected == 4 { return 1.0 }
    if selected == 5 { return 1.0 }
    if selected == 6 { return 2.0 }
    return 1.0
  }

  private func firstStep() float64 {
    if selected == 1 || selected == 7 { return 1.0 }
    return 0.01
  }

  private func secondMin() float64 {
    if selected == 0 { return 0.5 }
    if selected == 1 { return 0.0 }
    if selected == 2 { return 0.0 }
    if selected == 3 { return 0.0 }
    if selected == 4 { return 1.0 }
    if selected == 5 { return 0.0 }
    if selected == 6 { return 0.0 }
    return 0.0
  }

  private func secondMax() float64 {
    if selected == 0 { return 1.5 }
    if selected == 1 { return 1.0 }
    if selected == 2 { return 1.0 }
    if selected == 3 { return 2.0 }
    if selected == 4 { return 12.0 }
    if selected == 5 { return 1.0 }
    if selected == 6 { return 1.0 }
    return 1.0
  }

  private func secondStep() float64 {
    if selected == 4 { return 0.1 }
    return 0.01
  }

  private func thirdMin() float64 {
    if selected == 0 { return 0.0 }
    if selected == 1 { return 0.0 }
    if selected == 2 { return 0.0 }
    if selected == 3 { return 0.5 }
    if selected == 4 { return 0.5 }
    if selected == 5 { return 0.0 }
    if selected == 6 { return 0.0 }
    return 0.0
  }

  private func thirdMax() float64 {
    if selected == 0 { return 1.0 }
    if selected == 1 { return 1.0 }
    if selected == 2 { return 2.0 }
    if selected == 3 { return 4.0 }
    if selected == 4 { return 6.0 }
    if selected == 5 { return 1.0 }
    if selected == 6 { return 1.0 }
    return 1.0
  }

  private func thirdStep() float64 {
    if selected == 7 { return 1.0 }
    return 0.01
  }

  private func resetControls(index int32) {
    if index == 0 {
      c0 = 72.0
      c1 = 1.0
      c2 = 0.35
    } else if index == 1 {
      c0 = 35.0
      c1 = 0.25
      c2 = 0.4
    } else if index == 2 {
      c0 = 0.7
      c1 = 0.5
      c2 = 0.8
    } else if index == 3 {
      c0 = 0.45
      c1 = 0.9
      c2 = 2.0
    } else if index == 4 {
      c0 = 0.35
      c1 = 5.0
      c2 = 2.5
    } else if index == 5 {
      c0 = 0.4
      c1 = 0.3
      c2 = 0.5
    } else if index == 6 {
      c0 = 0.9
      c1 = 0.4
      c2 = 0.5
    } else {
      c0 = 0.0
      c1 = 0.5
      c2 = 1.0
    }
  }

  private func SelectProgram(index int32) {
    if selected == index {
      return
    }
    selected = index
    resetControls(index)
    Rebuild()
  }

  private func selector(label string, index int32) Button {
    let selectedStyle = selected == index
    let background = if selectedStyle { GalleryTheme.Ink } else { GalleryTheme.SurfaceRaised }
    let foreground = if selectedStyle { GalleryTheme.Background } else { GalleryTheme.Ink }
    return Button{
      Key: "program-" + index.ToString(),
      Padding: 9.0,
      BackgroundColor: background,
      BorderWidth: 1.0,
      BorderColor: GalleryTheme.Border,
      BorderRadius: 8.0,
      Focusable: true,
      TransitionMs: 100.0,
      Hover: Style{ BackgroundColor: GalleryTheme.Border },
      Focus: Style{ OutlineWidth: 1.0, OutlineColor: GalleryTheme.BorderStrong },
      Accessibility: Accessibility{
        Role: AccessibilityRole.Button,
        Name: label,
        Selected: selectedStyle,
      },
      OnClick: func() { SelectProgram(index) },
      Children: {
        Text{
          Content: label,
          FontSize: 12.0,
          FontWeight: 600.0,
          Color: foreground,
        },
      },
    }
  }

  private func paletteColor(index int32) Color {
    if palette == 0 {
      if index == 0 { return Color.Rgb(21, 31, 46) }
      if index == 1 { return Color.Rgb(86, 161, 188) }
      return Color.Rgb(170, 195, 208)
    }
    if palette == 1 {
      if index == 0 { return Color.Rgb(52, 27, 18) }
      if index == 1 { return Color.Rgb(213, 131, 56) }
      return Color.Rgb(245, 193, 111)
    }
    if index == 0 { return Color.Rgb(42, 14, 24) }
    if index == 1 { return Color.Rgb(235, 47, 73) }
    return Color.Rgb(255, 177, 61)
  }

  private func paletteButton(label string, index int32) Button {
    let selectedStyle = palette == index
    let background = if selectedStyle { paletteColor(1) } else { GalleryTheme.SurfaceRaised }
    let foreground = if selectedStyle { paletteColor(0) } else { GalleryTheme.Ink }
    return Button{
      Key: "palette-" + index.ToString(),
      Padding: 8.0,
      BackgroundColor: background,
      BorderWidth: 1.0,
      BorderColor: GalleryTheme.Border,
      BorderRadius: 8.0,
      Focusable: true,
      TransitionMs: 100.0,
      Hover: Style{ BackgroundColor: GalleryTheme.Border },
      Focus: Style{ OutlineWidth: 1.0, OutlineColor: GalleryTheme.BorderStrong },
      Accessibility: Accessibility{
        Role: AccessibilityRole.Radio,
        Name: label,
        Selected: selectedStyle,
      },
      OnClick: func() {
        palette = index
        Rebuild()
      },
      Children: {
        Text{
          Content: label,
          FontSize: 12.0,
          FontWeight: 600.0,
          Color: foreground,
        },
      },
    }
  }

  private func addStudioRipple(x float64, y float64) {
    var index int32 = 2
    while index > 0 {
      ringX[index] = ringX[index - 1]
      ringY[index] = ringY[index - 1]
      ringStart[index] = ringStart[index - 1]
      index = index - 1
    }
    ringX[0] = Math.Clamp(x, 0.0, 1.0)
    ringY[0] = Math.Clamp(y, 0.0, 1.0)
    ringStart[0] = clock.Value
    if ringCount < 3 {
      ringCount = ringCount + 1
    }
  }

  private func writeStudioParameters(effect ShaderEffect, time float64, bounds ElementRect) {
    let playValue = if playing { 1.0F } else { 0.0F }
    effect.SetParameter(0, Vector4(
      float32(time),
      float32(bounds.Width),
      float32(bounds.Height),
      playValue))
    effect.SetParameter(1, Vector4(
      float32(pointerX),
      float32(pointerY),
      float32(Math.Clamp(pointerPressure, 0.0, 1.0)),
      if pointerDown { 1.0F } else { 0.0F }))
    if selected == 0 {
      let orbitTime = time * 0.22
      let cameraX = 2.5 + Math.Cos(orbitTime) * 0.28
      let cameraY = 2.5 + Math.Sin(orbitTime) * 0.28
      effect.SetParameter(2, Vector4(
        float32(cameraX),
        float32(cameraY),
        float32(Math.Cos(orbitTime + Math.PI)),
        float32(Math.Sin(orbitTime + Math.PI))))
      effect.SetParameter(3, Vector4(
        float32(Math.Clamp(c0 / 72.0, 0.25, 1.35)),
        float32(c1),
        float32(c2),
        0.0F))
    } else if selected == 1 {
      effect.SetParameter(2, Vector4(
        float32(c0 * Math.PI / 180.0),
        float32((pointerY - 0.5) * 0.35),
        float32(c1),
        float32(c2)))
    } else if selected == 2 {
      effect.SetParameter(2, Vector4(float32(c0), float32(c1), float32(c2), 0.0F))
    } else if selected == 3 {
      effect.SetParameter(2, Vector4(float32(c0), float32(c1), float32(c2), 0.0F))
    } else if selected == 4 {
      effect.SetParameter(5, Vector4(float32(c1), float32(c2), 0.0F, 0.0F))
      var index int32 = 0
      while index < 3 {
        let age = if index < ringCount {
          Math.Max(0.0, time - ringStart[index])
        } else {
          20.0
        }
        let amplitude = if index < ringCount {
          c0
        } else {
          0.0
        }
        effect.SetParameter(2 + index, Vector4(
          float32(ringX[index]),
          float32(ringY[index]),
          float32(age),
          float32(amplitude)))
        index = index + 1
      }
    } else if selected == 5 {
      effect.SetParameter(2, Vector4(float32(c0), float32(c1), float32(c2), 0.0F))
    } else if selected == 6 {
      effect.SetParameter(2, Vector4(float32(c0), float32(c1), float32(c2), 0.0F))
    } else {
      effect.SetParameter(2, Vector4(float32(c0), float32(c1), float32(c2), 0.0F))
    }
  }

  private func compositionCanvas(programs GalleryShaderPrograms, time float64) Container {
    let effect = programs.Studio(selected)
    let bounds = Canvas.BorderBox
    writeStudioParameters(effect, time, bounds)
    let background = paletteColor(0)
    let accent = paletteColor(1)
    let highlight = paletteColor(2)
    let content = List[Blob]()
    if selected == 4 {
      if let assets = Assets {
        content.Add(Image{
          Key: "source",
          Position: PositionType.Absolute,
          Left: 0.0,
          Top: 0.0,
          Width: Length.Percent(100.0),
          Height: Length.Percent(100.0),
          Source: assets.Mandelbrot,
          Fit: ImageFit.Fill,
        })
      }
    }
    content.Add(Text{
      Key: "title",
      Content: title,
      Position: PositionType.Absolute,
      Left: 30.0,
      Top: 28.0,
      FontSize: 48.0,
      FontWeight: 700.0,
      LetterSpacing: -1.0,
      Color: highlight,
    })
    content.Add(Text{
      Key: "program",
      Content: "Goo / " + (selected + 1).ToString("D2"),
      Position: PositionType.Absolute,
      Left: 34.0,
      Top: 92.0,
      FontSize: 13.0,
      FontWeight: 600.0,
      Color: accent,
    })
    content.Add(Container{
      Key: "accent-block",
      Position: PositionType.Absolute,
      Left: 32.0,
      Top: 134.0,
      Width: 120.0,
      Height: 72.0,
      BackgroundColor: accent,
    })
    content.Add(Container{
      Key: "highlight-bar",
      Position: PositionType.Absolute,
      Left: 174.0,
      Top: 134.0,
      Width: 224.0,
      Height: 24.0,
      BackgroundColor: highlight,
    })
    content.Add(Container{
      Key: "accent-bar",
      Position: PositionType.Absolute,
      Left: 174.0,
      Top: 174.0,
      Width: 164.0,
      Height: 32.0,
      BackgroundColor: accent,
    })
    content.Add(Container{
      Key: "swatch",
      Position: PositionType.Absolute,
      Right: 30.0,
      Bottom: 30.0,
      Width: 124.0,
      Height: 64.0,
      BorderWidth: 1.0,
      BorderColor: highlight,
      BackgroundColor: background,
    })
    return Container{
      Key: if effectsReady() { "studio-live" } else { "studio-idle" },
      Width: Length.Percent(100.0),
      AspectRatio: 16.0 / 9.0,
      Handle: Canvas,
      Position: PositionType.Relative,
      BackgroundColor: background,
      ShaderEffect: activeEffect(effect),
      Focusable: true,
      Focus: Style{ OutlineWidth: 1.0, OutlineColor: GalleryTheme.BorderStrong },
      OnPointerDown: func(e PointerEvent) {
        e.Capture()
        e.PreventDefault()
        pointerDown = true
        let bounds = Canvas.BorderBox
        pointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        pointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        pointerPressure = e.Pressure
        if selected == 4 {
          addStudioRipple(pointerX, pointerY)
        }
        Rebuild()
      },
      OnPointerMove: func(e PointerEvent) {
        let bounds = Canvas.BorderBox
        pointerX = Math.Clamp(e.Position.X / Math.Max(bounds.Width, 1.0), 0.0, 1.0)
        pointerY = Math.Clamp(e.Position.Y / Math.Max(bounds.Height, 1.0), 0.0, 1.0)
        pointerPressure = e.Pressure
        Rebuild()
      },
      OnPointerUp: func(e PointerEvent) {
        pointerDown = false
        pointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
      OnPointerCancel: func(e PointerEvent) {
        pointerDown = false
        pointerPressure = 0.0
        e.ReleaseCapture()
        Rebuild()
      },
      Children: content,
    }
  }

  private func buildContent(programs GalleryShaderPrograms) Container {
    let selectors = List[Blob]()
    selectors.Add(selector("Wolfenstein", 0))
    selectors.Add(selector("Chrome", 1))
    selectors.Add(selector("Corridor", 2))
    selectors.Add(selector("Radial", 3))
    selectors.Add(selector("Ripple", 4))
    selectors.Add(selector("Glass", 5))
    selectors.Add(selector("Volumetric", 6))
    selectors.Add(selector("Dither", 7))

    let palettes = List[Blob]()
    palettes.Add(paletteButton("Mineral", 0))
    palettes.Add(paletteButton("Ember", 1))
    palettes.Add(paletteButton("Signal", 2))

    let controls = List[Blob]()
    controls.Add(Container{
      Key: "studio-c0",
      Width: if Compact { Length.Percent(100.0) } else { Length.Percent(48.0) },
      FlexGrow: 0.0,
      FlexShrink: 1.0,
      Children: {
        Cell.Mount[GalleryRange]("studio-c0", func(slider GalleryRange) {
          slider.Label = firstLabel()
          slider.MinValue = firstMin()
          slider.MaxValue = firstMax()
          slider.Value = c0
          slider.Step = firstStep()
          slider.OnChange = func(value float64) {
            c0 = value
            Rebuild()
          }
        }),
      },
    })
    controls.Add(Container{
      Key: "studio-c1",
      Width: if Compact { Length.Percent(100.0) } else { Length.Percent(48.0) },
      FlexGrow: 0.0,
      FlexShrink: 1.0,
      Children: {
        Cell.Mount[GalleryRange]("studio-c1", func(slider GalleryRange) {
          slider.Label = secondLabel()
          slider.MinValue = secondMin()
          slider.MaxValue = secondMax()
          slider.Value = c1
          slider.Step = secondStep()
          slider.OnChange = func(value float64) {
            c1 = value
            Rebuild()
          }
        }),
      },
    })
    controls.Add(Container{
      Key: "studio-c2",
      Width: if Compact { Length.Percent(100.0) } else { Length.Percent(48.0) },
      FlexGrow: 0.0,
      FlexShrink: 1.0,
      Children: {
        Cell.Mount[GalleryRange]("studio-c2", func(slider GalleryRange) {
          slider.Label = thirdLabel()
          slider.MinValue = thirdMin()
          slider.MaxValue = thirdMax()
          slider.Value = c2
          slider.Step = thirdStep()
          slider.OnChange = func(value float64) {
            c2 = value
            Rebuild()
          }
        }),
      },
    })

    let time = if Active { clock.Value } else { baseTime }
    let composition = studioFrame(
      "Composition",
      "The selected program runs over this retained source",
      compositionCanvas(programs, time))
    return Container{
      Width: Length.Percent(100.0),
      Height: Length.Percent(100.0),
      FlexDirection: FlexDirection.Row,
      Gap: 18.0,
      AlignItems: AlignItems.Center,
      Children: {
        Container{
          Key: "studio-panel",
          Width: 380.0,
          MinWidth: 380.0,
          FlexShrink: 0.0,
          FlexDirection: FlexDirection.Column,
          Gap: 14.0,
          Children: {
            Container{
              Key: "studio-selectors",
              FlexDirection: FlexDirection.Row,
              FlexWrap: FlexWrap.Wrap,
              Gap: 8.0,
              Children: selectors,
            },
            Container{
              Key: "studio-editor",
              FlexDirection: FlexDirection.Column,
              Gap: 10.0,
              Children: {
                TextEntry{
                  Key: "title",
                  Value: title,
                  Width: Length.Percent(100.0),
                  Placeholder: "Title",
                  Height: 38.0,
                  PaddingLeft: 10.0,
                  PaddingRight: 10.0,
                  Color: GalleryTheme.Ink,
                  FontSize: 13.0,
                  BackgroundColor: GalleryTheme.SurfaceRaised,
                  BorderRadius: 8.0,
                  BorderWidth: 1.0,
                  BorderColor: GalleryTheme.Border,
                  SelectionColor: GalleryTheme.BorderStrong,
                  Focus: Style{
                    OutlineWidth: 1.0,
                    OutlineColor: GalleryTheme.BorderStrong,
                  },
                  OnChange: func(value string) {
                    title = value
                    Rebuild()
                  },
                },
                Container{
                  Key: "studio-play",
                  Children: {
                    GalleryTheme.GhostButton(
                      if playing { "Pause" } else { "Play" },
                      func() { TogglePlaying() }),
                  },
                },
                Container{
                  Key: "studio-palettes",
                  FlexDirection: FlexDirection.Row,
                  Gap: 8.0,
                  Children: palettes,
                },
              },
            },
            Container{
              Key: "studio-controls",
              FlexDirection: FlexDirection.Row,
              FlexWrap: FlexWrap.Wrap,
              Gap: 14.0,
              Children: controls,
            },
          },
        },
        Container{
          Key: "studio-composition",
          MinWidth: 0.0,
          FlexGrow: 1.0,
          FlexShrink: 1.0,
          Children: { composition },
        },
      },
    }
  }

  private func TogglePlaying() {
    if playing {
      let pausedAt = clock.Value
      baseTime = pausedAt
      playing = false
      clock.Set(pausedAt)
    } else {
      playing = true
      if Active {
        clock.To(baseTime + 1000000000.0,
          (start float64, target float64, velocity float64) -> {
            return GalleryClockSimulation(baseTime)
          })
      }
    }
    Rebuild()
  }

  private func studioFrame(name string, hint string, content Blob) Container {
    let children = List[Blob]()
    children.Add(Container{
      Key: "spec-name",
      Children: { GalleryTheme.SpecimenName(name) },
    })
    children.Add(Container{
      Key: "spec-content",
      Children: { content },
    })
    children.Add(GalleryTheme.Hint(hint))
    let frame = GalleryTheme.Frame(children)
    return Container{
      Key: "studio-" + name,
      Width: Length.Percent(100.0),
      Color: Color.Transparent,
      Focusable: true,
      TransitionMs: 100.0,
      Hover: Style{ Color: GalleryTheme.InkSubtle },
      Focus: Style{
        Color: GalleryTheme.InkSubtle,
        OutlineWidth: 1.0,
        OutlineColor: GalleryTheme.BorderStrong,
      },
      Children: { frame },
    }
  }

  override func Build() Blob {
    if let programs = Programs {
      return buildContent(programs)
    }
    return studioFrame("Final Synthesis", "Shader programs are loading", Container{
      Width: Length.Percent(100.0),
      Height: 120.0,
      BackgroundColor: GalleryTheme.SurfaceRaised,
    })
  }
}
