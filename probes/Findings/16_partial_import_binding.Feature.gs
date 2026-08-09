// G# BUG: Partial-type field type clauses bind through the primary part's imports, not their own file's imports.
// This file sorts first ordinally ("F" < "g"), so it is the primary part. It does not import System.Text.
package FindingPartialImportBinding

import System

public partial class Holder {
  public func Touch() {
  }
}

func Main() int32 {
  let holder = Holder()
  holder.Fill()
  return holder.Text() == "ok" ? 0 : 1
}

// Source: gsharp/docs/adr/0144-partial-types.md - the merge design claims imports are compilation-global. They are per-file.
// Source: gsharp/docs/adr/0144-partial-types.md section D - parts order by (source file path ordinal, span start). The first is primary.
// Tested SDK: Gsharp.NET.Sdk 0.3.362 and 0.3.633. Both fail identically.
// Expected: the whole program builds. The failure is reported in 16_partial_import_binding.gs.
