package FindingSliceToSpanArgumentConversion

import System

func Read(values ReadOnlySpan[int32]) int32 {
  return values[0] + values[1]
}

func Write(values Span[int32]) {
  values[0] = 99
}

func Main() int32 {
  let values = []int32{10, 20}
  let total = Read(values)
  Write(values)
  return total == 30 && values[0] == 99 ? 0 : 1
}
