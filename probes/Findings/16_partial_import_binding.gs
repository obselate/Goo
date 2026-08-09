// G# BUG: This part imports System.Text and declares a StringBuilder field, yet the field type fails GS0113.
// Method bodies in this same file bind StringBuilder correctly. Only the field type clause resolves
// through the primary part's import scope, because the merged type's parent SyntaxTree is the primary part's.
package FindingPartialImportBinding

import System
import System.Text

public partial class Holder {
  var sb StringBuilder?

  public func Fill() {
    let local = StringBuilder()
    local.Append("ok")
    sb = local
  }

  public func Text() string {
    return sb?.ToString() ?? ""
  }
}

// Source: gsharp/docs/adr/0144-partial-types.md - "is sound only because imports" are "compilation-global (BindGlobalScope binds
// every tree's ImportSyntax into one shared scope)". That invariant is false in the shipped compiler: imports are per-file.
// Source: gsharp/docs/adr/0150-source-decomposition-conventions.md - dotted ClassName.Feature file naming is the repository idiom.
// Ordinal hazard: "Name.Feature.gs" sorts before "Name.gs", so adopting the ADR-0150 naming makes the Feature file primary.
// Tested SDK: Gsharp.NET.Sdk 0.3.362 and 0.3.633. Both fail identically.
// Body control: let local = StringBuilder() inside Fill binds without error in this same file.
// Import-duplication control: adding import System.Text to the primary part makes the whole program build and Main return 0.
// Suspected source: gsharp/src/Core/CodeAnalysis/Binding/PartialTypeMerger.cs merges every part's member nodes under a synthetic
// parent whose SyntaxTree is the primary part's, so field type clauses resolve through the primary part's per-file import scope.
// Method bodies keep their own SyntaxTree and bind correctly.
// Duplicate search 2026-08-09: no matching open or closed DavidObando/gsharp issue found.
// Expected: the field type StringBuilder? binds through this file's import System.Text and Main returns 0.
// Actual: GS0113 Type 'StringBuilder' doesn't exist on the field, with cascading GS0125 Variable 'sb' doesn't exist at every use.
// Filed upstream 2026-08-09: https://github.com/DavidObando/gsharp/issues/3336
