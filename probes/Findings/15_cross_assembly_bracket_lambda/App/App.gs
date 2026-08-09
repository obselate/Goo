// G# BUG: Calling an imported generic method with an explicit type-argument bracket plus a lambda fails GS0159.
package FindingCrossAssemblyBracketLambdaApp

import FindingCrossAssemblyBracketLambda

public class FancyWidget : Widget {
  public var Level int32
}

func Main() int32 {
  let widget = Util.Apply[FancyWidget]((w) -> {
    w.Name = "ok"
    w.Level = 3
  })
  return widget.Name == "ok" && widget.Level == 3 ? 0 : 1
}

// Source: gsharp/website/docs/guide/expressions-and-statements.md:17 - generic calls use bracketed type arguments.
// Source: gsharp/website/docs/guide/expressions-and-statements.md:35 - lambda literals target-type the delegate parameter.
// Tested SDK: Gsharp.NET.Sdk 0.3.319, 0.3.362, and 0.3.633.
// Same-assembly control: moving Widget and Util into this project makes the identical call build and Main return 0.
// Inference control: dropping the bracket, Util.Apply((w FancyWidget) -> { ... }), builds across the assembly boundary. That is the workaround.
// Nil control: Util.Apply[FancyWidget](nil) with the bracket and no lambda builds across the assembly boundary.
// The failure needs all three together: assembly import, explicit bracket, and a lambda argument.
// Downstream impact: this hit Goo's Cell.Mount and Cell.MountSeeded component-composition API for every consumer.
// Expected: App builds and Main returns 0.
// Actual on 0.3.319 and 0.3.362: build fails with GS0159: Cannot find function Apply, plus cascading errors on dependent expressions.
// Bracket-only control on 0.3.319: my earlier [T init()] shape without the imported base-type constraint built fine.
// The constraint naming the imported base class is a required ingredient.
// Status: FIXED in Gsharp.NET.Sdk 0.3.633. The probe builds clean and Main returns 0. Do not file upstream.
