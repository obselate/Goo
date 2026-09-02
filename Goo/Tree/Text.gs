package Goo

/// Defines a text element.
public class Text : Blob {
  internal override func coreBlob() {
  }

  /// Gets the displayed text.
  public prop Content string{ get; init; }
  /// Gets ordered passive inline styles in UTF-16 source offsets.
  /// A cluster uses the style at its logical start. Later ranges override earlier fields.
  public prop StyleRanges []TextStyleRange{
    get -> PassiveTextRangeBlobs.Read(this)
    init -> PassiveTextRangeBlobs.Write(this, value)
  }
  internal prop StyleRangeValues [] ? TextStyleRange{
    get -> HasPassiveTextRanges ? PassiveTextRangeBlobs.Values(this) : nil
  }

  /// Initializes a text element with empty content.
  public init() {
    Content = ""
  }

  /// Initializes a text element with the displayed content.
  /// @param content The displayed text.
  public init(content string) {
    Content = content
  }
}
