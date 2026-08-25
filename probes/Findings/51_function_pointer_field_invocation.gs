package FindingFunctionPointerFieldInvocation

unsafe struct Dispatch {
  var Apply unmanaged[Cdecl](int32) -> int32
}

unsafe func Main() int32 {
  let dispatch = Dispatch{}
  return dispatch.Apply(41)
}
