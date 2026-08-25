package FindingPointerPointerIndexBridge

import FindingPointerPointerIndex

public unsafe func Load() * *int8 {
  return PointerFactory.Get()
}
