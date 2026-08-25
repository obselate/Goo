package FindingBoundPatternVariable

open class Shape {
}

class Circle : Shape {
  var Radius float64
}

func Area(shape Shape) float64 {
  if shape is Circle circle {
    return circle.Radius
  }
  return 0.0
}

func Main() int32 {
  let shape Shape = Circle{ Radius: 3.5 }
  return Area(shape) == 3.5 ? 0 : 1
}
