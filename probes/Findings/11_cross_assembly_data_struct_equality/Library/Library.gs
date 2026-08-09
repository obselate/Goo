// G# BUG: Imported G# data-struct equality crashes the consuming compiler.
// Build App.gs as a separate project that references this library.
package FindingImportedEquality

public data struct Color {
  private var r float32

  public prop R float32 { get { return r } }

  shared {
    public prop White Color { get { return Color{ r: 1.0F } } }
  }
}

// Source: gsharp/docs/adr/0029-data-struct-synthesized-members.md:26-32 - A data struct emits public op_Equality and op_Inequality.
// Tested SDK: Gsharp.NET.Sdk 0.3.362.
// Tested: gsc commit 451ca6b0c4d2063752dac4bd9425e038b3cdc910.
// Decompiled with ilspycmd 10.1.1: Library.dll contains public static Color::op_Equality(Color, Color).
// Build: succeeds with 0 warnings and 0 errors.
// Expected: referenced G# and CLR consumers can bind the emitted equality operator.
// Actual: the failure occurs only when the G# App project binds == across the assembly boundary.
