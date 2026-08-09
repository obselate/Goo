// G# BUG: An imported generic method with an explicit type-argument bracket plus a lambda argument fails to resolve.
// The generic method's constraint names a base class from this library. Build App.gs as a separate project.
package FindingCrossAssemblyBracketLambda

import System

public open class Widget {
  public var Name string = ""
}

public class Util {
  shared {
    public func Apply[T Widget init()](configure Action[T]?) T {
      let value = T()
      configure?(value)
      return value
    }
  }
}

// Source: gsharp/website/docs/guide/expressions-and-statements.md:17 - generic calls use bracketed type arguments.
// Tested SDK: Gsharp.NET.Sdk 0.3.319, 0.3.362, and 0.3.633.
// Expected: this library builds and exports Util.Apply with the base-type constraint.
// Actual: the library builds with 0 warnings and 0 errors. The failure is in App.gs.
