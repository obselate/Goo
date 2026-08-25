package FindingPackageConstZero

import System

func Check() int32 {
  return Expected == 42 ? 0 : 1
}

Environment.Exit(Check())
