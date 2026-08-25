package FindingMixedNumericEquality

class Holder {
  var Value float64
}

func Main() int32 {
  let integer int32 = 7
  let decimal float64 = 7.0
  let first = integer == decimal
  let holder = Holder{ Value: 7.0 }
  let second = holder.Value == 7
  return first && second ? 0 : 1
}
