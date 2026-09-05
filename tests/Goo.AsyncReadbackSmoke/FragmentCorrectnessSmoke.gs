package GooAsyncReadbackSmoke

import System
import System.IO
import System.Numerics
import Goo

class FragmentCorrectnessCell : Cell {
  private let crtEffect ShaderEffect

  init(effect ShaderEffect) {
    crtEffect = effect
  }

  override func Build() Blob -> Container {
    Width: Length.Percent(100),
    Height: Length.Percent(100),
    Position: PositionType.Relative,
    BackgroundColor: Color.Transparent,
    Children: {
      Container{
        Position: PositionType.Absolute,
        Left: 0,
        Top: 0,
        Width: 128,
        Height: 128,
        BackgroundColor: Color.Rgb(236, 52, 28),
      },
      WindowReadbackTestFixture.CreateClippedLavaFixture(),
      Container{
        Position: PositionType.Absolute,
        Left: 160,
        Top: 16,
        Width: 640,
        Height: 96,
        BackgroundColor: Color.Transparent,
        ShaderEffect: crtEffect,
        Children: {
          Container{
            Position: PositionType.Absolute,
            Left: 0,
            Top: 0,
            Width: 320,
            Height: 96,
            BackgroundColor: Color.Rgb(8, 32, 248),
          },
        },
      },
    },
  }
}

func RunFragmentCorrectnessSmoke() {
  Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let shaderPath = Path.Combine(AppContext.BaseDirectory, "crt.frag.goo-effect")
  Require(File.Exists(shaderPath), "CRT effect asset is missing")
  let crtEffect = ShaderEffect(ShaderEffectProgram.Load(shaderPath), false)
  crtEffect.SetParameter(2, Vector4(1.0F, 0.0F, 1.0F, 0.0F))
  let capturedError = StringWriter()
  let originalError = Console.Error
  var window Window? = nil
  try {
    let opened = Window{
      Title: "Goo fragment correctness gate",
      Width: 816,
      Height: 128,
      VSync: false,
      Root: FragmentCorrectnessCell(crtEffect),
      Background: Color.Transparent,
    }
    window = opened
    Console.SetError(capturedError)
    opened.Open()
    WindowReadbackTestFixture.ForceRender(opened, 0.0, 10.0)
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667, 10.0)
    let metrics = WindowReadbackTestFixture.Metrics(opened)
    var accepted = WindowReadbackTestFixture.Request(opened,
      uint32(metrics.FramebufferWidth), uint32(metrics.FramebufferHeight))
    if accepted == WindowReadbackRequestStatus.NotReady {
      WindowReadbackTestFixture.DrainWindowQueue(opened, 10000)
      accepted = WindowReadbackTestFixture.Request(opened,
        uint32(metrics.FramebufferWidth), uint32(metrics.FramebufferHeight))
    }
    Require(accepted == WindowReadbackRequestStatus.Accepted,
      "Fragment correctness readback was not accepted: " + accepted.ToString())
    ReadbackAwaitReadbackReady(opened, 10000)
    let frame = ReadbackTakeReadback(opened)
    PrimitiveValidateResult(frame, metrics)
    let lavaOutside = PrimitiveLogicalPixel(frame.Pixels, frame.Width, metrics, 4.0, 64.0)
    let lavaCorner = PrimitiveLogicalPixel(frame.Pixels, frame.Width, metrics, 17.0, 17.0)
    let lavaCenter = PrimitiveLogicalPixel(frame.Pixels, frame.Width, metrics, 64.0, 64.0)
    Require(PrimitiveNear(lavaOutside, 236, 52, 28, 4),
      "Lava backdrop control is invalid: " + PrimitivePixelText(lavaOutside))
    Require(PrimitiveNear(lavaCorner, 236, 52, 28, 4),
      "Clipped Lava did not preserve its destination: " + PrimitivePixelText(lavaCorner))
    Require(lavaCenter[3] == uint8(255)
        && !PrimitiveNear(lavaCenter, 236, 52, 28, 12),
      "Lava opaque interior is invalid: " + PrimitivePixelText(lavaCenter))
    let crtOpaque = PrimitiveLogicalPixel(frame.Pixels, frame.Width, metrics, 476.0, 64.0)
    Require(crtOpaque[2] >= uint8(240) && crtOpaque[3] == uint8(255),
      "CRT opaque source output is invalid: " + PrimitivePixelText(crtOpaque))
    var crtCoverageFound = false
    for x in 480 ... 482 {
      let sample = PrimitiveLogicalPixel(frame.Pixels, frame.Width, metrics, float64(x), 64.0)
      if sample[2] >= uint8(100) && sample[3] >= uint8(64) { crtCoverageFound = true }
    }
    Require(crtCoverageFound, "CRT dispersed color has no matching sampled alpha coverage")
    let crtTransparent = PrimitiveLogicalPixel(frame.Pixels, frame.Width, metrics, 488.0, 64.0)
    Require(crtTransparent[0] <= uint8(2) && crtTransparent[1] <= uint8(2)
        && crtTransparent[2] <= uint8(2) && crtTransparent[3] <= uint8(2),
      "CRT transparent margin is invalid: " + PrimitivePixelText(crtTransparent))
    var crtSamples = ""
    for x in 474 ... 490 {
      let sample = PrimitiveLogicalPixel(frame.Pixels, frame.Width, metrics, float64(x), 64.0)
      if crtSamples.Length > 0 { crtSamples += "," }
      crtSamples += x.ToString() + "=" + PrimitivePixelText(sample)
    }
    Console.WriteLine("fragment-correctness-smoke: lava_outside="
      +PrimitivePixelText(lavaOutside) + " lava_corner=" + PrimitivePixelText(lavaCorner)
      +" lava_center=" + PrimitivePixelText(lavaCenter) + " crt=" + crtSamples)
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    Require(!opened.IsOpen, "Fragment correctness gate window did not close")
    Require(WindowReadbackTestFixture.ResidentResourceBytes(opened) == 0uL,
      "Fragment correctness gate resources remain resident after close")
    Console.SetError(originalError)
    ReadbackValidateCommonDiagnostics(capturedError.ToString())
    Console.WriteLine("fragment-correctness-cleanup: lava_corner="
      +PrimitivePixelText(lavaCorner) + " lava_center=" + PrimitivePixelText(lavaCenter)
      +" crt=" + crtSamples + " validation=0 cleanup=1")
  } finally {
    Console.SetError(originalError)
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
  }
}
