package FindingObjectSpreadWriteOnlySink

class Container {
  private var width int32
  prop Width int32 { set(v) -> width = v }
  prop Height int32 { get; init; }

  init() {
    width = 0
    Height = 0
  }

  func ReadWidth() int32 {
    return width
  }
}

func Main() int32 {
  let preset = Container{Width: 7, Height: 9}
  let copy = Container{...preset}
  return copy.ReadWidth() == 7 && copy.Height == 9 ? 0 : 1
}
