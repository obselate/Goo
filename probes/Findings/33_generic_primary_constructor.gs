package FindingGenericPrimaryConstructor

class RefKeeper[T class](_kept T) {
  func Kept() T {
    return _kept
  }
}

class Fixture {
  shared {
    func Run() bool {
      let keeper = RefKeeper[string]("pinned")
      return keeper.Kept() == "pinned"
    }
  }
}

func Main() int32 {
  return Fixture.Run() ? 0 : 1
}
