// G# BUG: The XML documentation emitter omits public enum and interface type entries and
// writes a malformed DocID for a function-type parameter. Class and member docs emit correctly.
// Verify by reading obj/Release/net10.0/17_xml_doc_omissions.xml after a build.
package FindingXmlDocOmissions

/// Names a paint color.
public enum Color {
  Red,
  Green
}

/// Greets a caller.
public interface Greeter {
  /// Produces the greeting line.
  func Greet() string;
}

/// Hosts documented members.
public class Widget {
  /// Runs the supplied callback.
  /// @param callback The callback to run.
  public func Configure(callback ((int32) -> void)?) {
    callback?(1)
  }
}

func Main() int32 {
  return 0
}

// Source: gsharp/docs/adr/0057-documentation-comments.md - the wire format is standard .NET XML documentation.
// Source: docs on ECMA-334 annex D DocID grammar - every documented public type gets a T: entry.
// Tested SDK: Gsharp.NET.Sdk 0.3.362 and 0.3.633. Both emit identical XML with identical omissions.
// Note: the SDK writes the XML file to obj without copying it to bin. Goo carries a local _PopulateGooDocFileItems target as a workaround.
// Suspected source: gsharp/src/Core/CodeAnalysis/Compilation/Compilation.cs:652 passes only program.Structs and top-level functions
// to DocumentationFileEmitter.Emit. EnumSymbol and InterfaceSymbol are separate TypeSymbol subclasses and never reach the emitter.
// Suspected source: gsharp/src/Core/CodeAnalysis/Documentation/SymbolDocumentationIdProvider.cs:201-204 wraps every NullableTypeSymbol
// in System.Nullable`1{...}, including reference types, and mixes backtick arity with the brace-list closed-generic form.
// Duplicate search 2026-08-09: closed #855 covers only the DocumentationFile path, closed #393 covers hover-side DocID reading. Neither is this.
// Build: succeeds with 0 warnings and 0 errors.
// Expected: the XML contains T: entries for Color, Greeter, and Widget, an M: entry for Greet,
// and an M: entry for Configure whose parameter uses a well-formed closed generic DocID such as System.Action{System.Int32}.
// Actual: the Color and Greeter T: entries and the Greet M: entry are missing. The Configure DocID emits
// System.Nullable`1{System.Action{System.Int32}}: a reference-type delegate wrapped in Nullable`1, and
// backtick arity mixed with the brace-list closed-generic form. C# emits System.Action{System.Int32} for Action<int>?.
// Filed upstream 2026-08-09: https://github.com/DavidObando/gsharp/issues/3337
