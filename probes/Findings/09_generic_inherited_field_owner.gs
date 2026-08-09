// G# BUG: A generic derived class emits an inherited base field against the derived TypeSpec.
// The build succeeds, but the CLR cannot resolve the nonexistent derived field.
package FindingGenericInheritedField

open class Base {
  internal var dirty bool
}

class Derived[T any] : Base {
  func Mark() {
    dirty = true
  }

  func IsDirty() bool {
    return dirty
  }
}

func Main() int32 {
  let value = Derived[int32]()
  value.Mark()
  return value.IsDirty() ? 0 : 1
}

// Source: gsharp/docs/adr/0087-reified-generics-emit-audit.md:194-198 - A generic member reference must use the correct declaring TypeSpec.
// Tested SDK: Gsharp.NET.Sdk 0.3.362, latest published on 2026-07-30.
// Tested gsc: 451ca6b0c4d2063752dac4bd9425e038b3cdc910 and remote main 648f87606aab10b7a6d4fd6f558f10712a25b792.
// Decompiled with ilspycmd 10.1.1: Mark and IsDirty reference Derived`1<!T>::dirty.
// Invalid metadata: dirty is declared on non-generic Base, not on Derived<T>.
// CLR control: Equivalent C# emits Base::Dirty for both field references and returns 0.
// Suspected source: gsharp/src/Core/CodeAnalysis/Emit/MethodBodyEmitter.MemberAccess.cs:1968-2009 selects the generic receiver as field owner.
// Remote audit 2026-07-30: no duplicate in 1,155 issues; #1467 covers adjacent generic TypeSpec encoding, not this field owner.
// Build: succeeds with 0 warnings and 0 errors.
// Expected: Main returns 0 after Mark writes Base.dirty.
// Actual: execution throws MissingFieldException for FindingGenericInheritedField.Derived`1.dirty.
