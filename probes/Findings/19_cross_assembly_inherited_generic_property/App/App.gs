package FindingPackageBoundaryGenericApp

import FindingPackageBoundaryGeneric

public class Payload {
  public var Value int32
}

public open class ExternalCell : GenericBase[Payload] {
  protected override func ShouldRebuild(previous Payload, next Payload) bool {
    return previous.Value == next.Value
  }

  public func ReadValue() int32 {
    return Input.Value
  }
}

func Main() int32 {
  let cell = ExternalCell()
  cell.Update(Payload{ Value: 7 })
  let same = cell.Matches(Payload{ Value: 3 }, Payload{ Value: 3 })
  return cell.ReadValue() == 7 && same ? 0 : 1
}
