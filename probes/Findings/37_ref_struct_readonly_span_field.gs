package FindingRefStructReadonlySpanField

import System

ref struct Window {
  var data ReadOnlySpan[int32]
}

func FirstLength(window Window) int32 {
  return window.data.Length
}

func Main() int32 {
  let values []int32 = []int32{ 10, 20, 30 }
  let span ReadOnlySpan[int32] = values
  let window Window = Window{ data: span }
  return FirstLength(window) == 3 ? 0 : 1
}
