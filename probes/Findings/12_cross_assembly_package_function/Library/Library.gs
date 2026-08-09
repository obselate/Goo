// G# BUG: A public package-level function cannot be resolved from a referenced assembly.
// Build App.gs as a separate project that references this library.
package FindingCrossAssemblyPackageFunction

public func Answer() int32 {
  return 42
}

// Source: gsharp/website/docs/guide/declarations-and-packages.md:21-32 - Imports bring packages or CLR namespaces into scope.
// Source: gsharp/website/docs/guide/declarations-and-packages.md:64-73 - G# supports package-level functions.
// Source: gsharp/docs/adr/0028-multi-package-emit.md:25-33 - Each package emits a CLR namespace and a synthetic <Program> static container.
// Tested SDK: Gsharp.NET.Sdk 0.3.633.
// Decompiled with ilspycmd 10.1.1: Library.dll contains public static int32 FindingCrossAssemblyPackageFunction.<Program>::Answer().
// Expected: this library builds and exports Answer as a public package function.
// Actual: the library builds with 0 warnings and 0 errors. The failure is in App.gs.
