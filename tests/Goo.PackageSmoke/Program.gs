package GooPackageSmoke

import System
import Goo

public data struct PackageInput {
  public var Value int32
}

public open class PackageInputCell : Cell[PackageInput] {
  protected override func ShouldRebuild(previous PackageInput, next PackageInput) bool {
    return previous.Value != next.Value
  }

  public func VerifyOverride() bool {
    return !ShouldRebuild(PackageInput{ Value: 1 }, PackageInput{ Value: 1 })
      && ShouldRebuild(PackageInput{ Value: 1 }, PackageInput{ Value: 2 })
  }

  protected override func Build(input PackageInput) Blob {
    return Text{ Content: "${input.Value}" }
  }
}

public class PackageFallbackCell : Cell[PackageInput] {
  override func Build() Blob {
    return Text{ Content: "parameterless build" }
  }
}

class SmokeCell : Cell {
  override func Build() Blob {
    return Container{ Children: {
      Cell.Mount[PackageInput, PackageInputCell](
        "package-input",
        PackageInput{ Value: 1 }),
      Cell.Mount[PackageInput, PackageFallbackCell](
        "package-fallback",
        PackageInput{ Value: 2 }),
    } }
  }
}

func Main() {
  let mount = Cell.Mount[PackageInput, PackageInputCell](
    "package-input",
    PackageInput{ Value: 1 })
  let packageInputCell = PackageInputCell{}
  if mount.Key != "package-input" || !packageInputCell.VerifyOverride() {
    throw InvalidOperationException("Package generic Cell contract failed")
  }

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
