package FindingClassInterfaceSmartCast

import System

open class Resource {
}

func DisposeIfNeeded(value Resource) bool {
  if value is IDisposable {
    value.Dispose()
    return true
  }
  return false
}

func Main() int32 {
  return 0
}
