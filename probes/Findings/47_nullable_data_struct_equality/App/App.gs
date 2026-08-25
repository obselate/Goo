package FindingNullableDataStructEqualityApp

import FindingNullableDataStructEquality

class Holder {
  private var current Identifier?

  public func Equal(next Identifier?) bool {
    return this.current == next
  }
}

func Main() int32 {
  let holder = Holder()
  return holder.Equal(nil) ? 0 : 1
}
