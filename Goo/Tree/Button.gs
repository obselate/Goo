package Goo

import System.Collections.Generic

/// Defines a semantic button container with pointer and keyboard activation.
public class Button : Blob {
  internal override func coreBlob() {
  }

  /// Gets the mutable child list.
  /// Give all siblings stable keys, or give no sibling a key.
  public prop Children IList[Blob]{ get; init; }

  /// Initializes an empty button.
  public init() {
    Children = List[Blob]()
  }
}
