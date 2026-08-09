// G# BUG: This explicit generic call fails across the assembly boundary.
// The compiler reports GS0159. Type inference works without [Derived].
package FindingCrossAssemblyApp

class Derived : FindingCrossAssembly.Base {
}

let value = FindingCrossAssembly.Base.Make[Derived](
  (item Derived) -> { item.Value = 5 })

// Source: gsharp/website/docs/ref/spec.md:733-735 - Explicit generic calls and explicitly typed arrow lambdas are supported.
// Source: gsharp/website/docs/ref/spec.md:912 - Lambda target typing applies to user static method arguments.
// Source: gsharp/docs/adr/0119-canonical-arrow-lambda-inference.md:91-100 - User static calls use deferred lambda target typing.
// Tested SDKs: Gsharp.NET.Sdk 0.3.319 and 0.3.362. Both reproduce this result.
// Tested: gsc commit 451ca6b0c4d2063752dac4bd9425e038b3cdc910.
// Controls: Removing [Derived] permits inference, and keeping [Derived] with nil also builds.
// Suspected source: gsharp/src/Core/CodeAnalysis/Symbols/ImportedClassSymbol.cs:200-355 erases same-compilation argument types before overload resolution.
// Expected: the build succeeds and value.Value is 5.
// Actual: Library builds, but App fails with GS0159: Cannot find function Make.
