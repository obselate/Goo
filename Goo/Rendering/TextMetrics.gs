package Goo


/// Specifies the visual side of a text position at a directional boundary.
public enum TextAffinity { Upstream; Downstream }

internal class EntryShapeState {
  internal prop Content string { get; init; }
  internal prop FontFamily string { get; init; }
  internal prop FontSize float32 { get; init; }
  internal prop FontWeight float64 { get; init; }
  internal prop Italic bool { get; init; }
  internal prop Spacing float32 { get; init; }
  internal prop Direction int32 { get; init; }
  internal prop Shape ShapedText? { get; init; }

  internal init() {
    Content = ""
    FontFamily = ""
  }
}

internal class TextMetrics {
  internal func Spacing(n Node) float32 {
    return n.LetterSpacing.Unit == LengthUnit.Px ? n.LetterSpacing.Value : 0.0F
  }

  internal func Shape(n Node, text string) ShapedText {
    return TextAnalyses.ShapeEntry(n, text)
  }

  internal func BufferShape(n Node) ShapedText {
    if let cached = n.EntryShape {
      if let shape = cached.Shape {
        if cached.Content == n.Buffer && cached.FontFamily == n.FontFamily
          && cached.FontSize == TextLayouts.fontSize(n) && cached.FontWeight == n.FontWeight
          && cached.Italic == (n.FontStyle == FontStyle.Italic)
          && cached.Spacing == Spacing(n) && cached.Direction == int32(n.Direction) {
          if n.HasElementHandle {
            shape.PrepareGeometry()
          }
          return shape
        }
        shape.Dispose()
      }
      n.EntryShape = nil
    }
    let shaped = Shape(n, n.Buffer)
    n.EntryShape = EntryShapeState{
      Content: n.Buffer, FontFamily: n.FontFamily, FontSize: TextLayouts.fontSize(n),
      FontWeight: n.FontWeight, Italic: n.FontStyle == FontStyle.Italic,
      Spacing: Spacing(n), Direction: int32(n.Direction), Shape: shaped,
    }
    if n.HasElementHandle {
      shaped.PrepareGeometry()
    }
    return shaped
  }

  internal func CachedBufferShape(n Node) ShapedText? {
    guard let cached = n.EntryShape, let shape = cached.Shape else { return nil }
    if cached.Content != n.Buffer || cached.FontFamily != n.FontFamily
      || cached.FontSize != TextLayouts.fontSize(n) || cached.FontWeight != n.FontWeight
      || cached.Italic != (n.FontStyle == FontStyle.Italic)
      || cached.Spacing != Spacing(n) || cached.Direction != int32(n.Direction) {
      return nil
    }
    return shape
  }

  internal func EntryOffset(n Node, shaped ShapedText) float32 {
    let free = TextLayouts.ContentWidth(n) - shaped.Width
    if free <= 0.0F { return 0.0F }
    return switch n.TextAlign {
      case TextAlign.Center: free * 0.5F
      case TextAlign.Right: free
      case TextAlign.Start: shaped.RightToLeft ? free : 0.0F
      case TextAlign.End: shaped.RightToLeft ? 0.0F : free
      default: 0.0F
    }
  }

  internal func EntryOriginX(n Node, shaped ShapedText) float32 {
    return TextLayouts.ContentLeft(n) + EntryOffset(n, shaped) - n.EditScrollX
  }

  internal func CaretX(n Node, index int32) float32 {
    let shaped = BufferShape(n)
    return shaped.CaretX(index, int32(n.CaretAffinity))
  }

  internal func HitAt(n Node, localX float32) TextHit {
    let shaped = BufferShape(n)
    let contentX = localX - EntryOffset(n, shaped) + n.EditScrollX
    return shaped.HitTest(contentX)
  }

  internal func MoveCaret(n Node, delta int32) TextHit {
    let shaped = BufferShape(n)
    return shaped.MoveCaret(n.Caret, int32(n.CaretAffinity), delta)
  }

  internal func LineEdge(n Node, end bool) TextHit {
    let shaped = BufferShape(n)
    return shaped.LineEdge(end)
  }

  internal func Collapse(n Node, delta int32) TextHit {
    let shaped = BufferShape(n)
    return shaped.Collapse(n.Caret, int32(n.CaretAffinity),
      n.Anchor, int32(n.AnchorAffinity), delta)
  }

  internal func SelectionRects(n Node) []float32 {
    let shaped = BufferShape(n)
    return shaped.SelectionRects(n.Caret, n.Anchor)
  }
}

// Keeps the caret inside the padded view with a 2px margin.
internal func FollowCaret(n Node) {
  let m = TextMetrics()
  let viewW = TextLayouts.ContentWidth(n)
  if viewW <= 0.0F {
    return
  }
  let shaped = m.BufferShape(n)
  if shaped.Width <= viewW {
    n.EditScrollX = 0.0F
    return
  }
  let caretX = shaped.CaretX(n.Caret, int32(n.CaretAffinity))
  var sx = n.EditScrollX
  if caretX - sx > viewW - 2.0F { sx = caretX - viewW + 2.0F }
  if caretX - sx < 2.0F { sx = caretX - 2.0F }
  if sx < 0.0F { sx = 0.0F }
  n.EditScrollX = sx
}
