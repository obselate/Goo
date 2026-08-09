// G# BUG: A consumer assembly cannot override generic base methods after closing T over a consumer-owned type.
// Build App.gs as a separate project that references this library.
package FindingCrossAssemblyGenericOverride

public open class Converter[T] {
  public open func Read(item T, data []float64);
  public open func Write(data []float64) T;
}

// Source: gsharp/website/docs/ref/spec.md:316 - a body-less open func is the canonical G# spelling of an abstract method.
// Tested SDK: Gsharp.NET.Sdk 0.3.362 and 0.3.633.
// Expected: this library builds and exports Converter[T] with two abstract members.
// Actual: the library builds with 0 warnings and 0 errors. The failure is in App.gs.
