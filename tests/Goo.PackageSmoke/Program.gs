package GooPackageSmoke

import System
import Goo

class SmokeCell : Cell {
  override func Build() Blob {
    return Container{
      Width: 320,
      Height: 180,
      Padding: 12,
      Gap: 8,
      BackgroundColor: Color.Rgb(12, 20, 32),
      Children: {
        Text{
          Content: "Goo Vulkan text",
          FontSize: 24,
          Color: Color.White,
        },
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

  if Environment.GetEnvironmentVariable("GOO_NATIVE_PLAYGROUND") == "1" {
    window.Run()
  } else if Environment.GetEnvironmentVariable("GOO_NATIVE_SMOKE") == "1" {
    window.Open()
    window.Pump(0.0)
    window.Background = Color.Rgb(16, 24, 36)
    window.Pump(0.0)
    window.RequestClose()
    window.Pump(0.0)
    if window.IsOpen {
      throw InvalidOperationException("Native smoke window did not close")
    }
  }
}
