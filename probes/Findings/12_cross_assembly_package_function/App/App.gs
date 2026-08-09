// G# BUG: Importing a referenced package does not make its public package-level functions resolvable.
package FindingCrossAssemblyPackageFunctionApp

import FindingCrossAssemblyPackageFunction

func Main() int32 {
  return Answer() == 42 ? 0 : 1
}

// Source: gsharp/website/docs/guide/declarations-and-packages.md:21-32 - An import can name a G# package.
// Source: gsharp/website/docs/tutorials/project-and-packages.md:32-60 - Importing a package permits an unqualified call to its function in one assembly.
// Tested SDK: Gsharp.NET.Sdk 0.3.633.
// Compiler source inspected at commit 454cf6908ebc4bdc40853c012142b206aa8620b4.
// Same-compilation control: Moving Answer into this project makes the same call build and Main return 0.
// Project-reference control: Importing a public class hoists its public shared Answer method, and the unqualified call returns 0.
// CLR control: Library.dll contains a public static Answer method. The producer emits the required callable metadata.
// C# distinction: C# has no reusable public namespace-level function declaration.
// C# top-level local functions are program implementation details, not exported namespace members.
// C# analogue: Put Answer on a public static class, then use `using static Namespace.Functions`; the unqualified call builds across assemblies.
// C# non-analogue: `using Namespace` alone does not hoist static class methods. G# package functions require G# package-import semantics.
// Conclusion: This is a G# package-metadata import gap, not missing C# namespace-import behavior.
// Suspected source: gsharp/src/Core/CodeAnalysis/Binding/BoundScope.cs:650-703 resolves imported types and type-level static imports only.
// Suspected source: gsharp/src/Core/CodeAnalysis/Binding/OverloadResolver.CallBinding.cs:730-823 searches declared functions and explicit type imports, but not the referenced package's <Program> methods.
// Cause: Same-compilation functions are present in BoundScope. A referenced assembly exposes only CLR metadata, and the binder does not reconstruct public <Program> methods as package functions.
// Qualified control: FindingCrossAssemblyPackageFunction.Answer() also fails because a package or CLR namespace is not an expression receiver.
// Duplicate search: GitHub keyword searches found no matching open or closed DavidObando/gsharp issue on 2026-08-07.
// Expected: App builds and Main returns 0.
// Actual: Library builds, but App fails with GS0130: Function 'Answer' doesn't exist.
// Filed upstream 2026-08-09: https://github.com/DavidObando/gsharp/issues/3334
