// G# BUG: Overriding an imported generic base's members with T closed over a local type fails GS0185.
package FindingCrossAssemblyGenericOverrideApp

import FindingCrossAssemblyGenericOverride

public class Payload {
  public var Value float64
}

public class PayloadConverter : Converter[Payload] {
  public override func Read(item Payload, data []float64) {
    item.Value = data[0]
  }
  public override func Write(data []float64) Payload {
    return Payload{ Value: data[0] }
  }
}

func Main() int32 {
  let conv Converter[Payload] = PayloadConverter()
  let payload = conv.Write([]float64{ 1.5 })
  conv.Read(payload, []float64{ 2.5 })
  return payload.Value == 2.5 ? 0 : 1
}

// Source: gsharp/website/docs/guide/types-and-values.md - a class closes an imported generic base over any accessible type.
// Tested SDK: Gsharp.NET.Sdk 0.3.362 and 0.3.633. Both fail identically.
// Main delta: no commit in v0.3.633..d6e477fe touches imported-generic override matching, so current main is also affected.
// Same-assembly control: moving Converter[T] into this project makes the identical overrides build and Main return 0.
// Primitive control: DoubleConverter : Converter[float64] with matching overrides builds and runs across the assembly boundary.
// The failure needs a consumer-owned type argument for the imported generic base.
// Workaround used in Goo: expose an opaque concrete generic class configured with callback function values instead of overrides.
// Suspected source: gsharp/src/Core/CodeAnalysis/Binding/DeclarationBinder.Functions.cs:1346 override matching compares against
// the imported base's un-substituted signature instead of substituting the consumer's type argument first.
// Duplicate search 2026-08-09: closed #1055 is the same substitution failure, fixed for same-assembly constructed generic bases
// on 2026-06-24. No open or closed issue covers the imported-assembly base case. File as a cross-assembly residual of #1055.
// Expected: App builds and Main returns 0.
// Actual: build fails with GS0185 on both overrides. The compiler does not match the imported generic slots after substituting the local type.
// Filed upstream 2026-08-09: https://github.com/DavidObando/gsharp/issues/3335
