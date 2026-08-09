// G# BUG: A captured generic input plus init()-constrained construction emits invalid IL.
// The synthesized closure omits one method type parameter but Invoke still uses its MVar slot.
package FindingGenericCapturedLambda

open class Box {
}

open class Box[T any] : Box {
  var Value T = default(T)
}

class IntBox : Box[int32] {
}

class Descriptor {
  var Factory (() -> Box)?
}

func Make[T any, TBox Box[T] init()](input T) Descriptor {
  return Descriptor{
    Factory: func() Box {
      let value = TBox()
      value.Value = input
      return value
    },
  }
}

func Main() int32 {
  let descriptor = Make[int32, IntBox](7)
  guard let factory = descriptor.Factory else { return 1 }
  let value = factory() as IntBox
  return value.Value == 7 ? 0 : 2
}

// Source: gsharp/website/docs/ref/spec.md:361 - init()-constrained construction lowers to Activator.CreateInstance<T>().
// Source: gsharp/website/docs/ref/spec.md:735,891 - Lambdas share the closure pipeline and may capture outer locals.
// Source: gsharp/docs/adr/0087-reified-generics-emit-audit.md:176-198 - Var/MVar ownership and MemberRef shape must remain valid.
// Tested SDK: Gsharp.NET.Sdk 0.3.362, latest published on 2026-07-30.
// Tested gsc: 451ca6b0c4d2063752dac4bd9425e038b3cdc910 and remote main 648f87606aab10b7a6d4fd6f558f10712a25b792.
// Decompiled with ilspycmd 10.1.1: the closure has only <T>, but Invoke uses undeclared !!1 for TBox.
// Invalid IL: Invoke declares local !!1 and calls Activator.CreateInstance<!!1>() despite having no method type parameters.
// CLR control: Equivalent C# emits a display class with <T,TBox>, uses !TBox, and returns 0.
// Suspected source: gsharp/src/Core/CodeAnalysis/Emit/ClosureEmitter.cs:399-418 omits body-only TBox from closure reification.
// Remote overlap: closed issue #1477 required closure reification to include type parameters referenced by the lambda body.
// Classification: residual or incomplete #1477 case, not a duplicate of Findings 02, 03, or 06.
// Build: succeeds with 0 warnings and 0 errors.
// Expected: Main returns 0 after the closure constructs IntBox and assigns Value.
// Actual: execution throws BadImageFormatException in the synthesized closure Invoke method.
// Status: FIXED in Gsharp.NET.Sdk 0.3.633, re-verified 2026-08-09. The probe builds and Main returns 0.
// Control: the identical probe still exits 134 on 0.3.362. Do not file upstream.
