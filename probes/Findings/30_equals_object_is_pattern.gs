package FindingEqualsObjectIsPattern

struct Money {
  var Cents int32

  func Equals(obj object?) bool {
    return obj is Money other && Cents == other.Cents
  }
}

func Main() int32 {
  let a = Money{ Cents: 100 }
  let b = Money{ Cents: 100 }
  let c = Money{ Cents: 200 }
  let boxed object = a
  return boxed.Equals(b) && !boxed.Equals(c) && !boxed.Equals("not money") ? 0 : 1
}
