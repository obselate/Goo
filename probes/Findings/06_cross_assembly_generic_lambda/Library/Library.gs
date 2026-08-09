// G# BUG: An explicit generic call with a lambda fails across assemblies.
// Build App.gs as a separate project that references this library.
package FindingCrossAssembly

open class Base {
  var Value int32

  shared {
    func Make[T Base init()](configure ((T) -> void)?) T {
      let value = T()
      if let apply = configure {
        apply(value)
      }
      return value
    }
  }
}

// Source: gsharp/website/docs/ref/spec.md:733 - Generic calls use an explicit bracketed type-argument list.
// Source: gsharp/docs/adr/0087-reified-generics-emit-audit.md:171-174 - User generic calls emit a constructed MethodSpec.
// Tested SDKs: Gsharp.NET.Sdk 0.3.319 and 0.3.362. Both reproduce this result.
// Tested: gsc commit 451ca6b0c4d2063752dac4bd9425e038b3cdc910.
// Expected: this library builds and exposes Base.Make[T] to referenced assemblies.
// Actual: the library builds with 0 warnings and 0 errors. The failure is in App.gs.
