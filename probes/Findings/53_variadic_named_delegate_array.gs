package FindingVariadicNamedDelegateArray

delegate Spec(value float64) float64;

func Apply(value float64, specs ... Spec) float64 {
  return specs[0](value)
}

func Main() int32 {
  let result = Apply(3.0, (value float64) -> value * 2.0)
  return result == 6.0 ? 0 : 1
}
