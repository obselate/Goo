package FindingTypeShadowApp

import FindingTypeShadowLibrary

class Host {
  public var Overlay Overlay

  init() {
    Overlay = Overlay{ IsOpen: true, Width: 7 }
  }

  func Read() bool {
    return Overlay.IsOpen && Overlay.Width == 7
  }
}

func Main() int32 {
  return Host().Read() ? 0 : 1
}
