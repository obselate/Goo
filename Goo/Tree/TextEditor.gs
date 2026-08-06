package Goo

import System

/// Defines a retained multiline text editor.
public class TextEditor : Blob {
  private let document TextDocument
  private let controller TextEditorController
  private var layers []TextPresentationLayer
  private var overscanLines int32

  internal override func coreBlob() {
  }

  /// Gets the edited document.
  public prop Document TextDocument { get { return document } }
  /// Gets the per-view editing controller.
  public prop Controller TextEditorController { get { return controller } }
  /// Gets the ordered presentation layers.
  public prop Layers []TextPresentationLayer {
    get { return copyEditorLayers(layers) }
    init {
      validateEditorLayers(document, value)
      layers = copyEditorLayers(value)
    }
  }
  internal prop LayerValues []TextPresentationLayer { get { return layers } }
  /// Gets whether editing commands are disabled.
  public prop ReadOnly bool { get; init; }
  /// Gets the placeholder shown for an empty document.
  public prop Placeholder string { get; init; }
  /// Gets the selection highlight color.
  public prop SelectionColor Color { get; init; }
  /// Gets the caret color.
  public prop CaretColor Color { get; init; }
  /// Gets the current-line highlight color.
  public prop CurrentLineColor Color { get; init; }
  /// Gets the logical-line overscan used by viewport layout.
  public prop OverscanLines int32 {
    get { return overscanLines }
    init {
      if value < 0 { throw ArgumentOutOfRangeException("OverscanLines") }
      overscanLines = value
    }
  }
  /// Gets the callback that receives committed document changes.
  public prop OnChange Action[TextDocumentChange]? { get; init; }
  /// Gets the callback invoked by an accepted submit command.
  public prop OnSubmit Action? { get; init; }

  /// Creates an editor without presentation layers.
  /// @param document The document to edit.
  /// @param controller The per-view controller bound to the document.
  public convenience init(document TextDocument, controller TextEditorController) {
    init(document, controller, []TextPresentationLayer{})
  }

  /// Creates an editor without presentation layers and attaches a mounted handle.
  /// @param document The document to edit.
  /// @param controller The per-view controller bound to the document.
  /// @param handle The consumer-owned mounted element handle.
  public convenience init(document TextDocument, controller TextEditorController,
    handle ElementHandle?) {
    init(document, controller, []TextPresentationLayer{}, handle)
  }

  /// Creates an editor with ordered presentation layers and a mounted handle.
  /// @param document The document to edit.
  /// @param controller The per-view controller bound to the document.
  /// @param layers The ordered presentation layers.
  /// @param handle The consumer-owned mounted element handle.
  public convenience init(document TextDocument, controller TextEditorController,
    layers []TextPresentationLayer, handle ElementHandle?) {
    init(document, controller, layers)
    Handle = handle
  }

  /// Creates an editor with ordered presentation layers.
  /// @param document The document to edit.
  /// @param controller The per-view controller bound to the document.
  /// @param layers The ordered presentation layers.
  public init(document TextDocument, controller TextEditorController,
    layers []TextPresentationLayer) {
    if document == nil { throw ArgumentNullException("document") }
    if controller == nil { throw ArgumentNullException("controller") }
    if controller.Document != document {
      throw ArgumentException("The controller must use the editor document", "controller")
    }
    this.document = document
    this.controller = controller
    validateEditorLayers(document, layers)
    this.layers = copyEditorLayers(layers)
    Placeholder = ""
    SelectionColor = Color.FromNormalized(0.25F, 0.45F, 1.0F, 0.35F)
    CaretColor = Color.White
    CurrentLineColor = Color.Transparent
    overscanLines = 3
  }
}

internal func copyEditorLayers(values []TextPresentationLayer) []TextPresentationLayer {
  return values.Clone() as []TextPresentationLayer
}

internal func validateEditorLayers(document TextDocument, values []TextPresentationLayer) {
  for i in 0 ... values.Length {
    if values[i] == nil { throw ArgumentNullException("layers") }
    if values[i].Document != document {
      throw ArgumentException("Every presentation layer must use the editor document", "layers")
    }
  }
}

internal func validateEditorLayerOverlaps(values []TextPresentationLayer) {
  for i in 0 ... values.Length {
    for projection in values[i].ReadProjections() {
      for priorLayer in 0 ... i {
        for prior in values[priorLayer].ReadProjections() {
          if rangesEditorOverlap(projection.Range, prior.Range) {
            throw ArgumentException("Layout-affecting projections cannot overlap", "layers")
          }
        }
      }
    }
  }
}

internal func rangesEditorOverlap(left TextRange, right TextRange) bool {
  if left.Length == 0 || right.Length == 0 { return false }
  return left.Start < right.Start + right.Length && right.Start < left.Start + left.Length
}
