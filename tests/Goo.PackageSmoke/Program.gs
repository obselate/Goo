package GooPackageSmoke

import System
import Goo

class SmokeCell : Cell {
  override func Build() Blob {
    return Container{
      Padding: 12,
      Children: { Text{ Content: "Goo 0.1.0 package smoke" } },
    }
  }
}

func Main() {
  Window.ConfigureApplication("Goo package smoke", "0.1.0", "io.github.obselate.goo.smoke")
  let window = Window{
    Title: "Goo package smoke test",
    Width: 320,
    Height: 180,
    VSync: false,
    Root: SmokeCell{},
  }
  let velocity = MotionVelocity.Uniform(1.0).Add(MotionVelocity.Uniform(2.0))
  Console.WriteLine("${window.Title}: ${velocity}")

  if Environment.GetEnvironmentVariable("GOO_NATIVE_SMOKE") == "1" {
    window.Open()
    window.Pump(0.0)
    window.RequestClose()
    window.Pump(0.0)
    if window.IsOpen {
      throw InvalidOperationException("Native smoke window did not close")
    }
  }
}
