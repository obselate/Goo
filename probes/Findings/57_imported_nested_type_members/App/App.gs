package FindingNestedTypeApp

import FindingNestedTypeLibrary

func Main() int32 {
  let result = Shaper().Shape()
  return result.Width == 12.5F ? 0 : 1
}
