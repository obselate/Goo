package FindingNullableFieldApp

import FindingNullableFieldLibrary

func Main() int32 {
  let first = Badge{ Content: nil }
  let second = first with{ Content = nil }
  return second.Content == nil ? 0 : 1
}
