// G# BUG: An explicit class constructor ignores its declared accessibility.
// An internal init() is emitted as a public CLR constructor.
package FindingConstructorAccessibility

public class InternalConstructor {
  internal init() {
  }
}

func Main() int32 {
  let constructors = typeof(InternalConstructor).GetConstructors(
    System.Reflection.BindingFlags.Instance |
    System.Reflection.BindingFlags.Public |
    System.Reflection.BindingFlags.NonPublic)
  return constructors.Length == 1 && constructors[0].IsAssembly && !constructors[0].IsPublic ? 0 : 1
}

// Source: gsharp/docs/adr/0003-oo-surface.md:24-25 - Class constructors respect visibility modifiers.
// Source: gsharp/docs/adr/0006-visibility.md:21-27 - internal maps to CLR assembly visibility.
// Tested SDK: Gsharp.NET.Sdk 0.3.362, latest published on 2026-07-30.
// Tested gsc: 451ca6b0c4d2063752dac4bd9425e038b3cdc910 and remote main 648f87606aab10b7a6d4fd6f558f10712a25b792.
// Decompiled with ilspycmd 10.1.1: G# emits `.method public ... .ctor()`.
// CLR control: Equivalent C# emits `.method assembly ... .ctor()` and returns 0.
// Suspected source: gsharp/src/Core/CodeAnalysis/Emit/TypeDefEmitter.cs:1646-1693 hardcodes MethodAttributes.Public.
// Remote audit 2026-07-30: no duplicate in 1,155 issues; #2067 checks inaccessible ctor calls, not emitted visibility.
// Build: succeeds with 0 warnings and 0 errors.
// Expected: Main returns 0 because the constructor is assembly-visible and not public.
// Actual: Main returns 1 because reflection reports IsPublic=true and IsAssembly=false.
// Status: FIXED in Gsharp.NET.Sdk 0.3.633, re-verified 2026-08-09. The probe builds and Main returns 0.
// Control: the identical probe still returns 1 on 0.3.362. Do not file upstream.
