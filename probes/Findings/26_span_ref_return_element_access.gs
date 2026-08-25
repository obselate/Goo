package FindingSpanRefReturnElementAccess

import System

func Main() int32 {
  let values = []int32{10, 20, 30}
  let readOnly ReadOnlySpan[int32] = values
  let total = readOnly[0] + readOnly[2]
  var writable Span[int32] = values
  writable[1] = 99
  return total == 40 && values[1] == 99 ? 0 : 1
}
