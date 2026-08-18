package GooPackageSmoke

import System
import Goo

class SmokeCell : Cell {
  override func Build() Blob {
    return Container{
      Width: 320,
      Height: 180,
      BackgroundColor: Color.Rgb(12, 20, 32),
      Children: {
        Container{
          Width: 224,
          Height: 112,
          BorderRadius: 12,
          BackgroundColor: Color.Rgb(38, 92, 152),
        },
      }
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
