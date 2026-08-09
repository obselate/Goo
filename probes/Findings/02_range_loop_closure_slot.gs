// G# BUG: A range-loop closure captures one shared variable slot.
// Main must return 0, but the captured variable changes to 3.
package FindingRangeLoopClosureSlot

func Main() int32 {
  var callback = () -> { return -1 }

  for i in 0 ... 3 {
    if i == 0 { callback = () -> { return i } }
  }

  return callback()
}

// Source: gsharp/website/docs/guide/expressions-and-statements.md:95-107 - Ellipsis ranges are supported loop forms.
// Source: gsharp/website/docs/ref/spec.md:735 - Arrow lambdas use the closure capture, lowering, and emit pipeline.
// Source: gsharp/test/Compiler.Tests/Emit/Issue2715ForRangeNestedCaptureEmitTests.cs:85-109 - Escaping loop closures get a fresh capture box per iteration.
// Documentation gap: The numeric ellipsis loop capture lifetime is not specified separately.
// Tested SDKs: Gsharp.NET.Sdk 0.3.319 and 0.3.362. Both reproduce this result.
// Tested: gsc commit 451ca6b0c4d2063752dac4bd9425e038b3cdc910.
// Control: The equivalent collection for-in capture returns the first iteration value.
// Suspected source: gsharp/src/Core/CodeAnalysis/Lowering/CaptureBoxingRewriter.cs:870-905 handles for-in, but not BoundForEllipsisStatement.
// Build: succeeds with 0 warnings and 0 errors.
// Expected: Main returns 0, the value captured during the first iteration.
// Actual: Main returns 3, the shared loop slot value after loop termination.
