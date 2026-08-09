// G# BUG: A field assignment uses a struct-valued member as its receiver.
// The program compiles, but the CLR rejects the generated instructions.
package FindingNestedFieldWrite

struct Item {
  var Id int32
}

class Holder {
  var Value Item
}

let holder = Holder()
holder.Value.Id = 7

// Source: gsharp/website/docs/ref/spec.md:1664 - The grammar permits assignment through a postfix member expression.
// Source: gsharp/website/docs/ref/spec.md:316 - Structs are value-like types.
// Source: gsharp/docs/adr/0003-oo-surface.md:20 - A struct is lowered to a CLR value type.
// Tested SDKs: Gsharp.NET.Sdk 0.3.319 and 0.3.362. Both reproduce this result.
// Tested: gsc origin/main commit 17feb7b66ae232521fbe9564a64a7d88c9e1fc8a.
// Invalid IL source: FindingNestedFieldWrite.<Program>.<Main>$
// Invalid IL: ldsfld class FindingNestedFieldWrite.Holder FindingNestedFieldWrite.<Program>::holder
// Invalid IL: ldfld valuetype FindingNestedFieldWrite.Item FindingNestedFieldWrite.Holder::Value
// Invalid IL: ldc.i4.7
// Invalid IL: dup
// Invalid IL: stloc.0
// Invalid IL: stfld int32 FindingNestedFieldWrite.Item::Id
// Invalid IL: ldloc.0
// Invalid IL: pop
// Fault: ldfld loads an Item value, but stfld requires the address of the Item.
// Required IL: replace ldfld Holder::Value with ldflda Holder::Value.
// CLR control: C# emits ldflda Holder::Value and prints 7.
// ILVerify 10.0.8 reports success, but the .NET 10.0.10 JIT rejects the method.
// Suspected source: gsharp/src/Core/CodeAnalysis/Emit/MethodBodyEmitter.MemberAccess.cs:631-695.
// Build: succeeds with 0 warnings and 0 errors.
// Expected: holder.Value.Id is 7.
// Actual: System.InvalidProgramException occurs before the assignment completes.
