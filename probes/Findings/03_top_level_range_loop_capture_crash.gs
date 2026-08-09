// G# BUG: A range-loop closure at top-level scope crashes the compiler.
// Compilation reports GS9998 because the loop variable has no local slot.
package FindingTopLevelRangeCapture

var callback = () -> { return -1 }
for i in 0 ... 1 {
  callback = () -> { return i }
}
let result = callback()

// Source: gsharp/website/docs/guide/expressions-and-statements.md:95-107 - Ellipsis ranges are supported loop forms.
// Source: gsharp/website/docs/ref/spec.md:735 - Arrow lambdas support captured variables.
// Source: gsharp/website/docs/tooling/compiler-architecture.md:43-51 - Top-level statements lower into a synthesized entry point.
// Tested SDKs: Gsharp.NET.Sdk 0.3.319 and 0.3.362. Both reproduce this result.
// Tested: gsc commit 451ca6b0c4d2063752dac4bd9425e038b3cdc910.
// Failure site: gsharp/src/Core/CodeAnalysis/Emit/MethodBodyEmitter.MemberAccess.cs:99-109.
// Suspected source: gsharp/src/Core/CodeAnalysis/Lowering/CaptureBoxingRewriter.cs has no BoundForEllipsisStatement capture-box rewrite.
// Expected: the build succeeds and result is 0.
// Actual: the build fails with GS9998: Variable 'i' has no local slot or parameter index in the current method.
