package FindingMixedClosedGenericImplicitConversion

struct Length {
  var Value float64
}

func operator implicit (value float64) Length {
  return Length{Value: value}
}

func Track[T any](value T) T {
  return value
}

func Main() int32 {
  let number = Track[int32](1)
  let length = Track[Length](10.0)
  return number == 1 && length.Value == 10.0 ? 0 : 1
}
