// G# BUG: Subclassing an imported base with an inaccessible abstract member gets no compile-time diagnostic.
// The concrete subclass compiles, then instantiation fails with a CLR TypeLoadException.
package FindingImportedAbstractEnforcementApp

import FindingImportedAbstractEnforcement

public class BasicRenderer : Renderer {
}

func Main() int32 {
  let renderer = BasicRenderer()
  renderer.Run()
  return 0
}

// Source: gsharp/website/docs/ref/spec.md:316 - a concrete subclass that inherits an abstract member without overriding it is GS0387.
// C# control: deriving from an imported class with an inaccessible abstract member is a compile error (CS0534 territory), never a runtime fault.
// Tested SDK: Gsharp.NET.Sdk 0.3.362 and 0.3.633. Both fail identically with runtime exit 134.
// Suspected source: GS0387 enforcement in gsharp/src/Core/CodeAnalysis/Binding/DeclarationBinder.Functions.cs walks source-declared
// base members and does not surface an imported base's assembly-only abstract slots to the external subclass check.
// Duplicate search 2026-08-09: no matching open or closed DavidObando/gsharp issue found.
// Build: succeeds with 0 warnings and 0 errors.
// Expected: the build fails with a diagnostic. BasicRenderer cannot satisfy Renderer's internal abstract Prepare slot.
// Actual: the build succeeds with 0 warnings. Instantiating BasicRenderer throws System.TypeLoadException:
// Method 'Prepare' in type 'FindingImportedAbstractEnforcementApp.BasicRenderer' does not have an implementation.
// Filed upstream 2026-08-09: https://github.com/DavidObando/gsharp/issues/3338
