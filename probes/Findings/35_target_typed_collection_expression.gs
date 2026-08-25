package FindingTargetTypedCollectionExpression

import System.Collections.Generic

func Main() int32 {
  let values = List[int32]{ 10, 20 }
  return values.Count == 2 && values[0] == 10 && values[1] == 20 ? 0 : 1
}
