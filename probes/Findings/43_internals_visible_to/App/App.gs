package FindingInternalsVisibleToApp

import FindingInternalsVisibleTo

func Main() int32 {
  let value = Secret()
  return value.Value == 42 ? 0 : 1
}
