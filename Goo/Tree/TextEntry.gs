package Goo

import System

/// Defines an editable single-line text element.
public class TextEntry : Blob {
  internal override func coreBlob() {
  }

  /// Gets the value used while the entry is not focused.
  public prop Value string { get; init; }
  /// Gets the placeholder shown for an empty value.
  public prop Placeholder string { get; init; }
  /// Gets the action that receives each edited value.
  public prop OnChange Action[string]? { get; init; }
  /// Gets the action that receives the submitted value.
  public prop OnSubmit Action[string]? { get; init; }
  /// Gets the selection highlight color.
  public prop SelectionColor Color { get; init; }

  /// Initializes an empty text entry with the default selection highlight.
  public init() {
    Value = ""
    Placeholder = ""
    SelectionColor = Color.FromNormalized(0.25F, 0.45F, 1.0F, 0.35F)
  }
}
