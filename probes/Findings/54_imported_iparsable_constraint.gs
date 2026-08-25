package FindingImportedIParsableConstraint

import System

func ParseOrNil[T IParsable[T]](text string) T? {
  var value T
  return T.TryParse(text, nil, &value) ? value : nil
}

func Main() int32 {
  let value = ParseOrNil[int32]("42")
  return value != nil ? 0 : 1
}
