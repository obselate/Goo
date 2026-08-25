package FindingObjectInitializerDelegateLambda

class Holder {
  var Callback ((int32) -> void)?
}

func Main() int32 {
  var seen int32 = 0
  let holder = Holder{ Callback: (value) -> { seen = value } }
  holder.Callback?(42)
  return seen == 42 ? 0 : 1
}
