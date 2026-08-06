# TextEditor

`TextEditor` is a retained multiline text view. Its public API does not expose Skia, HarfBuzz, SDL, Unicode.Bidi, or Yoga types.

## Ownership

Goo owns the document storage, view state, shaping, layout, rendering, input, IME state, clipboard access, undo, and redo.

The consumer owns parsing, syntax and WYSIWYG policy, file I/O, persistence, search, backlinks, and application commands.

`TextEntry` is unchanged. Use it for single-line value input.

## Document

Create `TextDocument()` for an empty document or `TextDocument(text)` for existing text. The document does not normalize text or line endings.

`Length`, `TextRange`, `TextPosition`, and `TextSelection` use UTF-16 code-unit offsets. Document changes reject an offset inside a surrogate pair. Controller selections also reject an offset inside a grapheme cluster.

`Apply` commits one replacement. `ApplyTransaction` commits ordered, non-overlapping replacements. Every transaction range refers to the document state before that transaction. One committed transaction increments `Version` once and emits one `Changed` event.

`Changed` is deliberately a multicast event because one shared document can have multiple independent views and tools.

`Snapshot` returns an immutable, thread-safe `TextSnapshot`. `TextSnapshot(document)` captures the same state explicitly. A snapshot retains its version and shares unchanged piece-tree storage with later document versions.

`BeginUndoGroup`, `BreakUndoGroup`, and `EndUndoGroup` control explicit history groups. `Undo` and `Redo` return `false` when no matching history entry exists. A new edit clears redo history.

## Controller

Create one `TextEditorController` for each view. The controller requires a `TextDocument` and can mount in only one retained `TextEditor` at a time.

The controller owns selection, desired horizontal caret position, scroll targets, focus, transient IME composition, overwrite mode, and typing undo groups. Public methods dispatch semantic commands. `OnCommand` runs before default behavior and can cancel it.

`PageUp`, `PageDown`, `MoveDocumentStart`, and `MoveDocumentEnd` wrap their matching semantic commands and accept `extendSelection`.

IME preedit text stays outside `TextDocument`. A commit replaces the active composition range once. Cancellation removes the transient composition without a document edit.

Dispose the controller when its view state is no longer needed.

## Presentation layers

`TextPresentationLayer` is bound to one document. It supports keyed style spans, text replacements, hidden ranges, inline slots, and block slots.

Style spans can overlap. Later layers override earlier fields. Layout projections are atomic and cannot overlap. Cross-layer overlap throws when the view is first reconciled. A later mutation of a mounted layer throws immediately. A projection range rebases after document edits and is removed when its full source range is deleted.

Presentation styles accept inline text fields only. They support color, font family, font size, font style, font weight, letter spacing, line height, text decoration, text shadows, text stroke, direction, and text transform. Paragraph, box, layout, and input fields are rejected. Layout projections require non-empty source ranges.

Projection keys are stable within a layer. Reusing a slot key preserves its retained Goo node identity while its content changes.

Dispose a layer when it no longer needs document change notifications.

## View

`TextEditor(document, controller)` creates a view without presentation layers. `TextEditor(document, controller, layers)` uses the specified layer order. Every layer and the controller must use the same document.

The view supports normal Blob typography, size, padding, border, background, clipping, focus, pointer, and scroll properties. It also provides `ReadOnly`, `Placeholder`, `SelectionColor`, `CaretColor`, `CurrentLineColor`, `OverscanLines`, `OnChange`, and `OnSubmit`.

Bounded viewport layout shapes visible paragraphs plus overscan. Unbounded-height intrinsic measurement can inspect the full document. Goo retains the same shaped line geometry for paint, selection, caret, hit testing, and visual navigation.
