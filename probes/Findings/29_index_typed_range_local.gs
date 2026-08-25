package FindingIndexTypedRangeLocal

import System

func Main() int32 {
  let values = []int32{1, 2, 3, 4, 5}
  let third Index = Index(3, true)
  return values[third] == 3 ? 0 : 1
}
