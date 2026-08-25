package FindingSharedMemberNameResolution

class Checks {
  shared {
    private var count int32

    private func check() {
      count++
    }

    public func Run() int32 {
      check()
      return count
    }
  }
}

func Main() int32 {
  return Checks.Run() == 1 ? 0 : 1
}
