package Goo

import System.Collections.Generic

/// Specifies a UTF-16 range with a Start offset and Length.
public data struct TextRange(Start int32, Length int32) { }

/// Specifies one ordered passive Text Style over a Range in source UTF-16 offsets.
/// Later overlapping ranges override earlier fields. Use Text.TextTransform for transformations.
public data struct TextStyleRange(Range TextRange, Style Style) { }

/// Specifies a caret position with an Offset and Affinity.
public data struct TextPosition(Offset int32, Affinity TextAffinity) { }

/// Specifies an Anchor and Active position for one text selection.
public data struct TextSelection(Anchor TextPosition, Active TextPosition) { }

/// Specifies one replacement with a Range and InsertedText.
public data struct TextChange(Range TextRange, InsertedText string) { }

/// Describes a transaction with BeforeVersion, AfterVersion, and Changes.
public data struct TextDocumentChange(BeforeVersion int64, AfterVersion int64,
  Changes IReadOnlyList[TextChange]) { }

internal func freezeTextChanges(values []TextChange) IReadOnlyList[TextChange] -> Array.AsReadOnly(values)
