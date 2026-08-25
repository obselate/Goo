package FindingReleaseOptimizeFlag

import System.Diagnostics

class Marker {}

func Main() int32 {
  let attributes = typeof(Marker).Assembly.GetCustomAttributes(typeof(DebuggableAttribute), false)
  if attributes.Length != 1 {
    return 2
  }
  if let debug = attributes[0] as DebuggableAttribute {
    return debug.IsJITOptimizerDisabled ? 1 : 0
  }
  return 2
}
