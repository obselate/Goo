package Goo

import System
import System.Collections.Generic

/// Defines an element that contains child blobs.
public class Container : Blob {
  internal override func coreBlob() {
  }

  /// Gets the mutable child list.
  /// Give all siblings stable keys, or give no sibling a key.
  public prop Children IList[Blob] { get; init; }
  /// Reports whether scroll content stays pinned to the bottom.
  public prop PinToBottom bool { get; init; }
  // Window-domain marker; authored through WindowDragRegion, not directly.
  internal prop DragsWindow bool { get; set }
  /// Reports whether the container itself participates in pointer hit testing.
  public prop HitTestSelf bool { get; init; }

  /// Initializes an empty child collection.
  public init() {
    Children = List[Blob]()
    HitTestSelf = true
  }
}
