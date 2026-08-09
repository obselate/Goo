// G# BUG: A valueless return in a one-line block fails to parse.
// The compiler reports GS0122 and GS0005 at the closing brace.
package FindingValuelessInlineReturn

func Stop(value bool) {
  if value { return }
}

Stop(true)

// Source: gsharp/website/docs/ref/spec.md:1250-1252 - A return statement may have no expression.
// Source: gsharp/website/docs/ref/spec.md:1617 - The return expression is optional in the grammar.
// Source: gsharp/website/docs/guide/expressions-and-statements.md:119-121 - return may return zero expressions.
// Tested SDKs: Gsharp.NET.Sdk 0.3.319 and 0.3.362. Both reproduce this result.
// Tested: gsc commit 451ca6b0c4d2063752dac4bd9425e038b3cdc910.
// Control: Moving the closing brace to the next line avoids the parser failure.
// Suspected source: gsharp/src/Core/CodeAnalysis/Syntax/Parser.Statements.cs:1263-1288 parses an expression after any same-line return.
// Expected: the build succeeds and Stop returns without a value.
// Actual: GS0122 rejects an expression after return, then GS0005 rejects the closing brace.
