package FindingStructInterfaceGetter

interface ValueReader {
  prop Value int32 { get; }
}

struct PlainValue : ValueReader {
  var Stored int32

  prop Value int32 {
    get {
      return Stored
    }
  }
}

data struct DataValue : ValueReader {
  var Stored int32

  prop Value int32 {
    get {
      return Stored
    }
  }
}

func Main() int32 {
  let plain ValueReader = PlainValue{ Stored: 42 }
  let data ValueReader = DataValue{ Stored: 42 }
  return plain.Value == 42 && data.Value == 42 ? 0 : 1
}
