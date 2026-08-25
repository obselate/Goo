package FindingPointerPointerIndexApp

import FindingPointerPointerIndexBridge

unsafe func Main() int32 {
  let values = Load()
  return values[0][0] == int8(42) ? 0 : 1
}
