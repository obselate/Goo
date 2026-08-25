package FindingRawPointerFunctionPointer

type Severity = int32
type MessageTypes = uint32
type CallbackResult = uint32

unsafe struct Payload {
  var Value int32
}

unsafe struct Dispatch {
  var Callback unmanaged[Cdecl](
    Severity,
    MessageTypes,
    *Payload,
    *void) -> CallbackResult
}

unsafe func Main() int32 {
  return 0
}
