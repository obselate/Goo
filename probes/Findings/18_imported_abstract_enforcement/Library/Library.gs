// G# BUG: A concrete external subclass of this class compiles without overriding the internal abstract member.
// Build App.gs as a separate project that references this library.
package FindingImportedAbstractEnforcement

public open class Renderer {
  internal open func Prepare();

  public func Run() {
    Prepare()
  }
}

// Source: gsharp/website/docs/ref/spec.md:316 - a concrete subclass must override every inherited abstract member (GS0387).
// Tested SDK: Gsharp.NET.Sdk 0.3.362 and 0.3.633.
// Emit control: the internal abstract member emits an assembly-only abstract CLR method. The metadata boundary is sound.
// Expected: this library builds. The failure is in App.gs.
// Actual: the library builds with 0 warnings and 0 errors.
