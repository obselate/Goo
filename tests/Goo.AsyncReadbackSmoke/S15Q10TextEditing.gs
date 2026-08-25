package GooAsyncReadbackSmoke

import System
import System.Text
import Goo

class S15Q10TextEditingRoot : Cell {
  shared {
    const TextSeed uint64 = 3266489917uL
    const TextByteCount int32 = 1048576
    const FullLineBytes int32 = 96
    const FullLineTextBytes int32 = 95
    const FinalLineTextBytes int32 = 64
    const VisibleLines int32 = 32
    const ViewportWidth int32 = 1280
    const ViewportHeight int32 = 720
    const FullLineCount int32 = 10922
    const SourceLineCount int32 = 10923
    const Alphabet string = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 "
    const EditorKey string = "q10-text-editing-editor"
  }

  private let seed uint64
  private let document TextDocument
  private let controller TextEditorController
  private let sourceLength int32
  private let sourceLineCount int32
  private var operationCount int32
  private var lastFrame int32
  private var hasAdvanced bool
  private var lastOperationAccepted bool

  prop LogicalCount int64 { get { return int64(TextByteCount) } }
  prop LogicalEdges int32 { get { return 0 } }
  prop VisibleCount int32 { get { return VisibleLines } }
  prop MountedCount int32 { get { return 1 } }
  prop MountedBound int32 { get { return VisibleLines } }
  prop Width int32 { get { return ViewportWidth } }
  prop Height int32 { get { return ViewportHeight } }
  prop MutationCount int32 { get { return 1 } }

  init(initialSeed uint64) {
    seed = initialSeed
    let source = GenerateSource(initialSeed)
    document = TextDocument(source)
    sourceLength = document.Length
    sourceLineCount = document.LineCount
    controller = TextEditorController(document)
    operationCount = 0
    lastFrame = 0
    hasAdvanced = false
    lastOperationAccepted = true
  }

  private func GenerateSource(initialSeed uint64) string {
    let builder = StringBuilder(TextByteCount)
    var state = initialSeed
    var line int32 = 0
    while line < FullLineCount {
      var column int32 = 0
      while column < FullLineTextBytes {
        state = (state * 1664525uL + 1013904223uL) & 0xffffffffuL
        builder.Append(Alphabet[int32(state % uint64(Alphabet.Length))])
        column = column + 1
      }
      builder.Append("\n")
      line = line + 1
    }
    var finalColumn int32 = 0
    while finalColumn < FinalLineTextBytes {
      state = (state * 1664525uL + 1013904223uL) & 0xffffffffuL
      builder.Append(Alphabet[int32(state % uint64(Alphabet.Length))])
      finalColumn = finalColumn + 1
    }
    return builder.ToString()
  }

  func Advance(frame int32) {
    let accepted = if (frame & 1) == 0 {
      controller.Insert("x")
    } else {
      controller.DeleteBackward()
    }
    operationCount = operationCount + 1
    lastFrame = frame
    hasAdvanced = true
    lastOperationAccepted = accepted
    Rebuild()
  }

  override func Build() Blob -> TextEditor(document, controller) {
    Key = EditorKey,
    Width = ViewportWidth,
    Height = ViewportHeight,
    FontSize = 20.0,
    LineHeight = 1.125,
    TextWrap = TextWrap.NoWrap,
    BackgroundColor = Color.Rgb(8, 13, 22),
    Color = Color.Rgb(224, 232, 244),
    SelectionColor = Color.Rgba(48, 96, 160, 180),
    CaretColor = Color.Rgb(255, 220, 120),
    OverscanLines = 0,
  }

  func Invariant() bool {
    let expectedLength = if hasAdvanced && (lastFrame & 1) == 0 {
      sourceLength + 1
    } else {
      sourceLength
    }
    let expectedCaret = if hasAdvanced && (lastFrame & 1) == 0 {
      1
    } else {
      0
    }
    let selection = controller.Selection
    let collapsedAtExpected = selection.Anchor.Offset == expectedCaret
      && selection.Active.Offset == expectedCaret
      && selection.Anchor.Offset == selection.Active.Offset
    let operationState = operationCount >= 0
      && (!hasAdvanced || operationCount > 0)
      && lastOperationAccepted
    let sourceState = document.Length == expectedLength
      && document.LineCount == sourceLineCount
    return seed == TextSeed
      && sourceLength == TextByteCount
      && sourceLineCount == SourceLineCount
      && sourceState
      && collapsedAtExpected
      && operationState
      && MountedCount == 1
      && MountedBound == VisibleLines
  }
}
