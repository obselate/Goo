package GooShowcase

import System
import System.Threading
import Goo

private func IsFit(window Window) bool {
  let width = float64(window.Width)
  let height = float64(window.Height)
  let root = LavaCell.Root.BorderBox
  let surface = LavaCell.Surface.BorderBox
  let rail = LavaCell.RailHandle.BorderBox
  return LavaCell.Root.IsMounted && LavaCell.Surface.IsMounted && LavaCell.RailHandle.IsMounted
    && root.Width > 0.0 && root.Height > 0.0
    && Math.Abs(root.Width - width) <= 0.5
    && Math.Abs(root.Height - height) <= 0.5
    && Math.Abs(surface.X - root.X) <= 0.5
    && Math.Abs(surface.Y - root.Y) <= 0.5
    && Math.Abs(surface.Width - root.Width) <= 0.5
    && Math.Abs(surface.Height - root.Height) <= 0.5
    && rail.X >= root.X - 0.5
    && rail.Y >= root.Y - 0.5
    && rail.X + rail.Width <= root.X + root.Width + 0.5
    && rail.Y + rail.Height <= root.Y + root.Height + 0.5
}

private func RequireFit(label string, window Window) {
  if !IsFit(window) {
    throw InvalidOperationException(label + " exceeded its window")
  }
}

private func PumpUntilFit(window Window) {
  var pumps int32 = 0
  while pumps < 60 {
    window.Pump(0.016)
    if IsFit(window) { return }
    Thread.Sleep(4)
    pumps++
  }
  throw InvalidOperationException("Lava surface did not resize to its window")
}

private func Center(rect ElementRect) Point -> Point { X: rect.X + rect.Width * 0.5, Y: rect.Y + rect.Height * 0.5 }

private func Click(window Window, handle ElementHandle) {
  let point = Center(handle.BorderBox)
  window.LavaPointerMove(point.X, point.Y)
  window.LavaPointerPress(point.X, point.Y)
  window.Pump(0.016)
  window.LavaPointerRelease(point.X, point.Y)
  window.Pump(0.016)
}

func Main() {
  Window.ConfigureApplication("LAVA", "0.5.0", "io.github.obselate.goo.showcase")
  let root = LavaCell{}
  let window = Window{
    Title: "LAVA",
    Width: 1440,
    Height: 900,
    Background: Color.Rgb(25, 24, 23),
    VSync: true,
    Root: root,
  }
  window.MetricsChanged += func(value WindowMetrics) {
    root.SyncGlassGeometry()
  }
  window.Open()
  PumpUntilFit(window)
  root.SyncGlassGeometry()
  window.Pump(0.016)
  RequireFit("Lava surface", window)
  let capturePath = Environment.GetEnvironmentVariable("GOO_SHOWCASE_CAPTURE")
  if capturePath != nil && capturePath != "" {
    var captureWarmup int32 = 0
    while captureWarmup < 60 {
      window.Pump(0.016)
      Thread.Sleep(4)
      captureWarmup++
    }
    window.CaptureLava(capturePath)
    window.RequestClose()
    window.Pump(0.0)
    Console.WriteLine("showcase-capture: " + capturePath)
    return
  }
  if Environment.GetEnvironmentVariable("GOO_SHOWCASE_SMOKE") == "1" {
    window.Width = 640
    window.Height = 480
    PumpUntilFit(window)
    RequireFit("Compact Lava surface", window)
    let surface = LavaCell.Surface.BorderBox
    let fieldX = surface.X + surface.Width * 0.34
    let fieldY = surface.Y + surface.Height * 0.42
    let initialOrb = root.OrbForSmoke()
    window.LavaPointerMove(fieldX, fieldY)
    window.Pump(0.016)
    root.RequireOrbChanged(initialOrb)
    let fieldProbe = window.LavaHitProbe(fieldX, fieldY)
    if !fieldProbe.StartsWith("Lava:lava-surface:") {
      throw InvalidOperationException("Lava surface did not own field hit testing: " + fieldProbe)
    }
    let toggle = Center(LavaCell.Toggle.BorderBox)
    let toggleProbe = window.LavaHitProbe(toggle.X, toggle.Y)
    if !toggleProbe.StartsWith("Button:glass-collapse:")
      && !toggleProbe.StartsWith("Text:glass-collapse-label:") {
        throw InvalidOperationException("Glass collapse button did not own hit testing: " + toggleProbe)
      }
    let orbBeforeControl = root.OrbForSmoke()
    window.LavaPointerMove(toggle.X, toggle.Y)
    window.Pump(0.016)
    root.RequireOrbChanged(orbBeforeControl)
    Click(window, LavaCell.Toggle)
    root.RequireExpanded(false)
    Click(window, LavaCell.CollapsedToggle)
    root.RequireExpanded(true)
    Click(window, LavaCell.RainbowToggle)
    root.RequireRainbow(true)
    let track = LavaCell.FlowTrack.BorderBox
    let flowProbe = window.LavaHitProbe(track.X + track.Width * 0.2, track.Y + track.Height * 0.5)
    if !flowProbe.StartsWith("Container:glass-refract-track:")
      && !flowProbe.StartsWith("Container:glass-refract-fill:")
      && !flowProbe.StartsWith("Container:glass-refract-thumb:") {
        throw InvalidOperationException("Glass refraction slider did not own hit testing: " + flowProbe)
      }
    let previousRefraction = root.RefractionForSmoke()
    let startX = track.X + track.Width * 0.18
    let endX = track.X + track.Width * 0.82
    let trackY = track.Y + track.Height * 0.5
    window.LavaPointerMove(startX, trackY)
    window.LavaPointerPress(startX, trackY)
    window.Pump(0.016)
    window.LavaPointerMove(endX, trackY)
    window.Pump(0.016)
    window.LavaPointerRelease(endX, trackY)
    window.Pump(0.016)
    root.RequireRefractionChanged(previousRefraction)
    Click(window, LavaCell.CalmMode)
    if root.ModeForSmoke() != 0 {
      throw InvalidOperationException("Glass toggle group did not select CALM")
    }
    Click(window, LavaCell.PrismMode)
    if root.ModeForSmoke() != 2 {
      throw InvalidOperationException("Glass toggle group did not select PRISM")
    }
    let previousSeed = root.SeedForSmoke()
    Click(window, LavaCell.Reroll)
    if root.SeedForSmoke() == previousSeed {
      throw InvalidOperationException("Glass button did not reroll the field")
    }
    let initialRotation = root.RotationForSmoke()
    window.LavaPointerMove(fieldX + surface.Width * 0.1, fieldY + surface.Height * 0.1)
    window.Pump(0.016)
    root.RequireRotationAt(initialRotation)
    let refractionBeforeField = root.RefractionForSmoke()
    window.LavaPointerPress(fieldX, fieldY)
    window.Pump(0.016)
    let railCenter = Center(LavaCell.RailHandle.BorderBox)
    window.LavaPointerMove(railCenter.X, railCenter.Y)
    window.Pump(0.016)
    root.RequireRotationChanged(initialRotation)
    if root.RefractionForSmoke() != refractionBeforeField {
      throw InvalidOperationException("Lava field drag changed glass refraction")
    }
    window.LavaPointerRelease(railCenter.X, railCenter.Y)
    window.Pump(0.016)
    let releasedRotation = root.RotationForSmoke()
    window.LavaPointerMove(fieldX, fieldY)
    window.Pump(0.016)
    root.RequireRotationAt(releasedRotation)
    root.RequireRainbow(true)
    var warmPumps int32 = 0
    while warmPumps < 64 {
      window.Pump(0.016)
      Thread.Sleep(4)
      warmPumps++
    }
    var stabilityPumps int32 = 0
    while stabilityPumps < 320 {
      window.Pump(0.016)
      Thread.Sleep(4)
      stabilityPumps++
    }
    RequireFit("Lava smoke surface", window)
    window.Width = 1920
    window.Height = 1080
    PumpUntilFit(window)
    RequireFit("Large Lava surface", window)
    var resizeStep int32 = 0
    while resizeStep < 48 {
      window.Width = 640 + (resizeStep % 7) * 29
      window.Height = 480 + (resizeStep % 5) * 31
      window.Pump(0.004)
      Thread.Sleep(1)
      resizeStep++
    }
    window.Width = 360
    window.Height = 360
    PumpUntilFit(window)
    RequireFit("Narrow Lava surface", window)
    window.RequestClose()
    var closePumps int32 = 0
    while window.IsOpen && closePumps < 5000 {
      window.Pump(0.0)
      Thread.Sleep(1)
      closePumps++
    }
    if window.IsOpen { throw InvalidOperationException("Lava smoke did not close") }
    Console.WriteLine("showcase-smoke: resize-clamp large-resize rapid-resize narrow-clamp glass orb-follow toggle-group button switch slider collapse expand field-drag rotation 320-frame stability deferred-close")
    return
  }
  window.Run()
}
