// G# BUG: A plain struct cannot declare a valid CLR Object virtual override.
// override func ToString() is rejected before an assembly can be emitted.
package FindingStructObjectOverride

struct Value {
  var Number int32

  override func ToString() string {
    return Number.ToString()
  }
}

func Main() int32 {
  return Value{ Number: 7 }.ToString() == "7" ? 0 : 1
}

// Source: gsharp/website/docs/ref/spec.md:316 - Plain structs may declare in-body instance methods.
// Source: gsharp/docs/adr/0029-data-struct-synthesized-members.md:26-32 - G# value types override CLR Object virtuals.
// Source: gsharp/docs/adr/0029-data-struct-synthesized-members.md:79-85 - A value-type ToString can reuse the Object vtable slot.
// Tested SDK: Gsharp.NET.Sdk 0.3.362, latest published on 2026-07-30.
// Tested gsc: 451ca6b0c4d2063752dac4bd9425e038b3cdc910 and remote main 648f87606aab10b7a6d4fd6f558f10712a25b792.
// Decompile control: no G# assembly is emitted; equivalent C# IL contains virtual Value::ToString.
// CLR control: Equivalent C# builds, emits a valid constrained Object call, and returns 0.
// Suspected source: gsharp/src/Core/CodeAnalysis/Binding/ExternalClrOverrideResolver.cs:139-156 excludes structs from the Object fallback.
// Remote audit 2026-07-30: no exact duplicate; #2443 and #2486 fix class override lookup and leave value types out.
// Expected: the build succeeds and Main returns 0.
// Actual: the build fails with GS0183 because no matching open base method is found.
