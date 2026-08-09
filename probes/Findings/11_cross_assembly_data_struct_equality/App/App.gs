// G# BUG: Equality between values of an imported G# data struct causes a compiler ICE.
// The same expression builds when Color is in the current compilation.
package FindingImportedEqualityApp

import FindingImportedEquality

func IsWhite(stopColor Color) bool {
  return stopColor == Color.White
}

func Main() int32 {
  return IsWhite(Color.White) ? 0 : 1
}

// Source: gsharp/docs/adr/0029-data-struct-synthesized-members.md:26-32 - Data structs expose equality operators.
// Source: gsharp/docs/adr/0034-imported-clr-interop.md:21-33 - Imported operator overloads bind through their op_* methods.
// Source: gsharp/website/docs/ref/spec.md:1341-1344 - Imported metadata operator overloads are supported.
// Tested SDK: Gsharp.NET.Sdk 0.3.362.
// Tested: gsc commit 451ca6b0c4d2063752dac4bd9425e038b3cdc910.
// Decompiled with ilspycmd 10.1.1: referenced Library.dll contains the required public op_Equality method.
// CLR control: Equivalent C# library and app bind cross-assembly record-struct equality and return 0.
// Control: Moving Color into this compilation makes the same G# equality expression build and return 0.
// Suspected source: gsharp/src/Core/CodeAnalysis/Binding/ClrOperatorResolution.cs:90-130 fails while resolving the imported G# Color symbols.
// Upstream duplicate: issue #2866 reports the same cross-assembly synthesized equality ICE for a data class.
// Fixed upstream: PR #2872 covers imported data classes and data structs, merged as cde6f2a6a4ae36408386300b1634dcd40422fed7.
// Local compiler note: tested commit 451ca6b predates remote main 648f876, which contains the fix.
// Expected: App builds and Main returns 0.
// Actual: App fails with GS9998 KeyNotFoundException: key 'Color' is absent from a compiler dictionary.
