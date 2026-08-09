// G# BUG: A top-level ternary in an interpolation hole collides with format syntax.
// The colon is parsed as a format separator instead of the ternary operator.
package FindingInterpolationTernary

let ok = true
let text = "${ok ? 1 : 2}"

// Source: gsharp/website/docs/ref/spec.md:94-108 - Interpolation holes accept expressions, including a ternary.
// Source: gsharp/website/docs/ref/spec.md:1697-1699 - The hole grammar contains a full Expression before optional format syntax.
// Source: gsharp/docs/adr/0062-generalized-ternary-expression.md:24-30 - A ternary is valid in any expression position.
// Tested SDKs: Gsharp.NET.Sdk 0.3.319 and 0.3.362. Both reproduce this result.
// Tested: gsc commit 451ca6b0c4d2063752dac4bd9425e038b3cdc910.
// Control: Parenthesizing the ternary keeps its colon below the hole scanner's top level.
// Suspected source: gsharp/src/Core/CodeAnalysis/Syntax/Parser.Expressions.Literals.cs:1435-1503 treats the first top-level colon as format syntax.
// Expected: the build succeeds and text is "1".
// Actual: the build fails with two GS0005 diagnostics at EOF, expecting a colon and an identifier.
