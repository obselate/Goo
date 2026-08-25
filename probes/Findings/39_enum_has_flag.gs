package FindingEnumHasFlag

import System.Reflection

func Main() int32 {
  let value = BindingFlags.Public | BindingFlags.Instance
  return value.HasFlag(BindingFlags.Public) && !value.HasFlag(BindingFlags.NonPublic) ? 0 : 1
}
