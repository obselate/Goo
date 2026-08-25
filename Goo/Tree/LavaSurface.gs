package Goo

internal sealed class LavaSurface : Blob {
  internal override func coreBlob() {
  }

  internal prop Flow float64{ get; init; }
  internal prop Form float64{ get; init; }
  internal prop Blend float64{ get; init; }
  internal prop Light float64{ get; init; }
  internal prop Hue float64{ get; init; }
  internal prop Rainbow bool{ get; init; }
  internal prop Rotation Point{ get; init; }
  internal prop Seed uint32{ get; init; }

  internal init() {
    Flow = 0.42
    Form = 0.52
    Blend = 0.64
    Light = 0.78
    Hue = 0.08
    Rainbow = false
    Rotation = Point{}
    Seed = 1u
  }
}
