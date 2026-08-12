package Goo

import System.Collections.Generic
import Goo.InternalTextInterop
import SkiaSharp

internal partial class Painter {
  internal func paintText(n Node, canvas SKCanvas) {
    let x = TextLayouts.ContentLeft(n)
    let y = TextLayouts.ContentTop(n)
    let width = TextLayouts.ContentWidth(n)
    let layout = TextLayouts.For(n, width)
    let trims = n.TextTrimming == TextTrimming.Ellipsis
      && (n.TextWrap == TextWrap.NoWrap || layout.Clamped)
    let clipX = trims || n.OverflowX != Overflow.Visible
    let clipY = n.OverflowY != Overflow.Visible
    let clips = clipX || clipY
    if clips {
      canvas.Save()
      applyAxisClip(
        canvas,
        SKRect.Create(x, y, width, TextLayouts.ContentHeight(n)),
        clipX,
        clipY)
    }
    if let rich = layout.Rich {
      paintRichText(n, layout, rich, canvas, x, y, width)
    } else {
      paintPlainText(n, layout, canvas, x, y, width)
    }
    if clips {
      canvas.Restore()
    }
  }

  private func paintPlainText(n Node, layout TextLayout, canvas SKCanvas, contentX float32,
    contentY float32, contentWidth float32) {
    let natural = layout.Descent - layout.Ascent
    let lineHeight = TextLayouts.resolvedLineHeight(n)
    let clip = canvas.LocalClipBounds
    let stroke = resolvePx(n.TextStrokeWidth)
    let pad = textPaintPad(stroke, n.TextShadows)
    for i in 0 ... layout.Lines.Count {
      let line = layout.Lines[i]
      guard let shape = line.Shape else { continue }
      let leading = (lineHeight - natural) * 0.5F
      let baseline = contentY + float32(i) * lineHeight + leading - layout.Ascent
      let lineTop = contentY + float32(i) * lineHeight
      let lineBottom = lineTop + lineHeight
      var paintTop = baseline + layout.Ascent
      if baseline + shape.InkTop < paintTop { paintTop = baseline + shape.InkTop }
      if lineTop < paintTop { paintTop = lineTop }
      var paintBottom = baseline + textDecorationBottom(n.TextDecoration, layout.Ascent,
        layout.Descent)
      if baseline + shape.InkBottom > paintBottom { paintBottom = baseline + shape.InkBottom }
      if lineBottom > paintBottom { paintBottom = lineBottom }
      if !CullDisabled && (paintTop - pad > clip.Bottom || paintBottom + pad < clip.Top) {
        continue
      }
      let x = contentX + TextLayouts.lineOffset(n, line, contentWidth)
      paintNodeText(n, shape, canvas, x, baseline, 1.0F)
    }
  }

  private func paintRichText(n Node, layout TextLayout, rich TextRichLayout,
    canvas SKCanvas, contentX float32, contentY float32, contentWidth float32) {
    let clip = canvas.LocalClipBounds
    var top = contentY
    for i in 0 ... rich.Lines.Count {
      let line = rich.Lines[i]
      let source = layout.Lines[i]
      let rtl = if let shaped = source.Shape { shaped.RightToLeft } else { false }
      let x = contentX + TextLayouts.lineOffset(n, line.Width, rtl, contentWidth)
      let baseline = top + (line.Height - (line.Descent - line.Ascent)) * 0.5F - line.Ascent
      let pad = line.PaintPad
      var paintTop = baseline + line.PaintTop
      if top < paintTop { paintTop = top }
      var paintBottom = baseline + line.PaintBottom
      let lineBottom = top + line.Height
      if lineBottom > paintBottom { paintBottom = lineBottom }
      if !CullDisabled && (paintTop - pad > clip.Bottom || paintBottom + pad < clip.Top) {
        top = top + line.Height
        continue
      }
      for runIndex in 0 ... line.Runs.Count {
        let run = line.Runs[runIndex]
        paintRichTextRun(run, canvas, x + run.X, baseline)
      }
      top = top + line.Height
    }
  }

  private func paintRichTextRun(run TextPaintRun, canvas SKCanvas, x float32,
    baseline float32) {
    if let shape = run.Shape {
      let segments = if run.Style.Decoration != TextDecoration.None {
        TextPaintDecorations.Get(run)
      } else { nil }
      let decoration = if segments != nil { run.Style.Decoration } else { TextDecoration.None }
      paintTextEffects(shape, run.Style.Color, decoration, run.Style.StrokeWidth,
        run.Style.StrokeColor, run.Style.Shadows, segments, canvas, x, baseline, 1.0F)
    }
  }

  private func paintResolvedText(shape ShapedText, style TextResolvedStyle,
    segments []?float32, canvas SKCanvas, x float32, baseline float32) {
    paintTextEffects(shape, style.Color, style.Decoration, style.StrokeWidth,
      style.StrokeColor, style.Shadows, segments, canvas, x, baseline, 1.0F)
  }

  private func paintNodeText(n Node, shape ShapedText, canvas SKCanvas, x float32,
    baseline float32, alpha float32) {
    let width = resolvePx(n.TextStrokeWidth)
    paintTextEffects(shape, n.Color, n.TextDecoration, width, n.TextStrokeColor,
      n.TextShadows, nil, canvas, x, baseline, alpha)
  }

  private func paintTextEffects(shape ShapedText, color Color, decoration TextDecoration,
    strokeWidth float32, strokeColor Color, shadows BoxShadowStack?, segments []?float32,
    canvas SKCanvas, x float32, baseline float32, alpha float32) {
    let shadowCount = textShadowCount(shadows)
    for var i = shadowCount; i > 0; i-- {
      let shadow = textShadowAt(shadows, i - 1)
      if shadow.Color.A <= 0.0F { continue }
      let shadowPaint = resetPaint()
      let shadowColor = Color.FromNormalized(shadow.Color.R, shadow.Color.G,
        shadow.Color.B, shadow.Color.A * alpha)
      shadowPaint.Color = SKColor(shadowColor.ToSkia())
      shadowPaint.IsAntialias = true
      let blur = resolvePx(shadow.Blur)
      if blur > 0.0F { shadowPaint.MaskFilter = blurFilter(blur) }
      TextShaping.Paint(shape, canvas, shadowPaint, x + resolvePx(shadow.OffsetX),
        baseline + resolvePx(shadow.OffsetY))
    }
    if strokeWidth > 0.0F {
      let stroke = resetPaint()
      let visibleStroke = Color.FromNormalized(strokeColor.R, strokeColor.G, strokeColor.B,
        strokeColor.A * alpha)
      stroke.Color = SKColor(visibleStroke.ToSkia())
      stroke.IsAntialias = true
      stroke.Style = SKPaintStyle.Stroke
      stroke.StrokeWidth = strokeWidth
      stroke.StrokeJoin = SKStrokeJoin.Round
      TextShaping.Paint(shape, canvas, stroke, x, baseline)
    }
    let paint = resetPaint()
    let visibleColor = Color.FromNormalized(color.R, color.G, color.B, color.A * alpha)
    paint.Color = SKColor(visibleColor.ToSkia())
    paint.IsAntialias = true
    TextShaping.Paint(shape, canvas, paint, x, baseline)
    if decoration != TextDecoration.None {
      if let values = segments {
      var i int32 = 0
        while i + 1 < values.Length {
          TextLayouts.PaintDecoration(decoration, canvas, paint, x + values[i], baseline,
            values[i + 1] - values[i], shape.Ascent, shape.Descent)
          i = i + 2
        }
      } else {
        TextLayouts.PaintDecoration(decoration, canvas, paint, x, baseline, shape.Width,
          shape.Ascent, shape.Descent)
      }
    }
  }

  // Box, then clipped content shifted by EditScrollX: selection, text or placeholder, caret.
  internal func paintEntry(n Node, canvas SKCanvas, ref boxScratch BoxPaintScratch?) {
    paintContainer(n, canvas, ref boxScratch)
    let contentX = TextLayouts.ContentLeft(n)
    let contentY = TextLayouts.ContentTop(n)
    let contentWidth = TextLayouts.ContentWidth(n)
    let contentHeight = TextLayouts.ContentHeight(n)
    canvas.Save()
    canvas.ClipRect(SKRect.Create(contentX, contentY, contentWidth, contentHeight), SKClipOperation.Intersect, true)
    let m = TextMetrics()
    let bufferShape = m.BufferShape(n)
    let lineH = bufferShape.Descent - bufferShape.Ascent
    let topY = contentY + (contentHeight - lineH) * 0.5F
    let baselineY = topY - bufferShape.Ascent
    let bufferX = m.EntryOriginX(n, bufferShape)
    let e = Edit()
    let s = EditState{ Text: n.Buffer, Caret: n.Caret, Anchor: n.Anchor }
    if n.Focused && e.HasSelection(s) {
      let sp = resetPaint()
      sp.Color = SKColor(n.SelectionColor.ToSkia())
      sp.IsAntialias = true
      let segments = bufferShape.SelectionRects(e.SelStart(s), e.SelEnd(s))
      paintSelectionRects(canvas, sp, bufferX, topY, lineH, segments)
    }
    if n.Buffer != "" {
      paintNodeText(n, bufferShape, canvas, bufferX, baselineY, 1.0F)
    } else if n.Placeholder != "" {
      using let placeholderShape = m.Shape(n, n.Placeholder)
      let placeholderX = m.EntryOriginX(n, placeholderShape)
      paintNodeText(n, placeholderShape, canvas, placeholderX, baselineY, 0.45F)
    }
    if n.Focused && caretVisible(n) {
      let cx = bufferX + bufferShape.CaretX(n.Caret, int32(n.CaretAffinity))
      let cp = resetPaint()
      cp.Color = SKColor(n.Color.ToSkia())
      cp.IsAntialias = true
      canvas.DrawRect(SKRect.Create(cx, topY, 1.5F, lineH), cp)
    }
    canvas.Restore()
  }

  internal func paintEditor(n Node, canvas SKCanvas) {
    guard let state = n.EditorState else {
      return
    }
    let contentX = TextLayouts.ContentLeft(n)
    let contentY = TextLayouts.ContentTop(n)
    let contentWidth = TextLayouts.ContentWidth(n)
    let contentHeight = TextLayouts.ContentHeight(n)
    let layout = TextEditorLayouts.For(n, contentWidth, contentHeight)
    let controller = state.Controller.State()
    let scrollX = float32(controller.ScrollTargetX)
    let scrollY = float32(controller.ScrollTargetY)
    canvas.Save()
    canvas.ClipRect(SKRect.Create(contentX, contentY, contentWidth, contentHeight),
      SKClipOperation.Intersect, true)

    let active = controller.Selection.Active.Offset
    if controller.Focused && n.EditorCurrentLineColor.A > 0.0F {
      let linePaint = resetPaint()
      linePaint.Color = SKColor(n.EditorCurrentLineColor.ToSkia())
      if let line = TextEditorLayouts.LineForPosition(layout, controller.Selection.Active) {
        canvas.DrawRect(SKRect.Create(contentX, contentY + line.Top - scrollY,
          contentWidth, line.Height), linePaint)
      }
    }

    let selectionStart = controller.Selection.Anchor.Offset < controller.Selection.Active.Offset
      ? controller.Selection.Anchor.Offset : controller.Selection.Active.Offset
    let selectionEnd = controller.Selection.Anchor.Offset < controller.Selection.Active.Offset
      ? controller.Selection.Active.Offset : controller.Selection.Anchor.Offset
    if controller.Focused && selectionStart != selectionEnd {
      let selectionPaint = resetPaint()
      selectionPaint.Color = SKColor(n.SelectionColor.ToSkia())
      selectionPaint.IsAntialias = true
      for line in layout.Lines {
        paintEditorRange(line, canvas, selectionPaint, contentX - scrollX,
          contentY - scrollY, contentWidth, n, selectionStart, selectionEnd)
      }
    }

    if controller.Focused {
      if let composition = controller.Composition {
        if composition.SelectionLength > 0 {
          let compositionPaint = resetPaint()
          compositionPaint.Color = SKColor(n.SelectionColor.ToSkia())
          compositionPaint.IsAntialias = true
          for line in layout.Lines {
            paintCompositionSelection(line, canvas, compositionPaint, contentX - scrollX,
              contentY - scrollY, contentWidth, n, composition)
          }
        }
      }
    }

    let textPaint = resetPaint()
    textPaint.Color = SKColor(n.Color.ToSkia())
    textPaint.IsAntialias = true
    for line in layout.Lines {
      let natural = line.Descent - line.Ascent
      let leading = (line.Height - natural) * 0.5F
      let baseline = contentY + line.Top - scrollY + leading - line.Ascent
      if line.Runs.Count != 0 {
        for run in line.Runs {
          if let shape = run.Shape {
            paintEditorRun(shape, run.Style, canvas, contentX
              + TextEditorLayouts.editorLineOffset(n, line, contentWidth) - scrollX + run.X, baseline)
          }
        }
      } else if line.Slots.Count == 0 {
        guard let shape = line.Shape else { continue }
        paintEditorRun(shape, line.Paragraph.BaseStyle!!, canvas,
          contentX + TextEditorLayouts.editorLineOffset(n, line, contentWidth) - scrollX, baseline)
      }
    }
    if state.Document.Length == 0 && controller.Composition == nil && n.Placeholder != "" {
      let natural = layout.Descent - layout.Ascent
      let leading = (layout.LineHeight - natural) * 0.5F
      let placeholderColor = Color.FromNormalized(n.Color.R, n.Color.G, n.Color.B, n.Color.A * 0.45F)
      if let placeholder = state.Placeholder(n) {
        let placeholderPaint = resetPaint()
        placeholderPaint.Color = SKColor(placeholderColor.ToSkia())
        placeholderPaint.IsAntialias = true
        TextShaping.Paint(placeholder, canvas, placeholderPaint, contentX - scrollX,
          contentY + leading - layout.Ascent)
      }
    }
    if controller.Focused && selectionStart == selectionEnd && caretVisible(n) {
      let rect = TextEditorLayouts.CaretRect(n, controller.Selection.Active)
      let caretPaint = resetPaint()
      caretPaint.Color = SKColor(n.EditorCaretColor.ToSkia())
      caretPaint.IsAntialias = true
      canvas.DrawRect(SKRect.Create(n.Rect.X + rect.X, n.Rect.Y + rect.Y, rect.W, rect.H), caretPaint)
    }
    canvas.Restore()
  }

  private func paintEditorRun(shape ShapedText, style TextResolvedStyle,
    canvas SKCanvas, x float32, baseline float32) {
    paintResolvedText(shape, style, nil, canvas, x, baseline)
  }

  private func paintSelectionRects(canvas SKCanvas, paint SKPaint, originX float32,
    originY float32, height float32, segments IReadOnlyList[float32]) {
    var i int32 = 0
    while i + 1 < segments.Count {
      canvas.DrawRect(SKRect.Create(originX + segments[i], originY,
        segments[i + 1] - segments[i], height), paint)
      i = i + 2
    }
  }

  private func paintEditorRange(line TextEditorVisualLine,
    canvas SKCanvas, paint SKPaint, contentX float32, contentY float32,
    contentWidth float32, n Node, rangeStart int32, rangeEnd int32) {
    if rangeEnd <= line.SourceStart || rangeStart >= line.SourceEnd {
      return
    }
    if line.Shape == nil {
      return
    }
    let start = rangeStart > line.SourceStart ? rangeStart : line.SourceStart
    let end = rangeEnd < line.SourceEnd ? rangeEnd : line.SourceEnd
    let displayStart = TextEditorLayouts.DisplayOffsetForSource(line.Paragraph, start,
      TextAffinity.Downstream) - line.DisplayStart
    let displayEnd = TextEditorLayouts.DisplayOffsetForSource(line.Paragraph, end,
      TextAffinity.Upstream) - line.DisplayStart
    let segments = TextEditorLayouts.SelectionRects(line, displayStart, displayEnd)
    paintSelectionRects(canvas, paint,
      contentX + TextEditorLayouts.editorLineOffset(n, line, contentWidth),
      contentY + line.Top, line.Height, segments)
  }

  private func paintCompositionSelection(line TextEditorVisualLine,
    canvas SKCanvas, paint SKPaint, contentX float32, contentY float32, contentWidth float32,
    n Node, composition TextComposition) {
    if line.Shape == nil {
      return
    }
    for segment in line.Paragraph.Segments {
      if !segment.Composition || composition.SelectionLength == 0 { continue }
      let selectionStart = segment.DisplayStart + composition.SelectionStart
      let selectionEnd = selectionStart + composition.SelectionLength
      let lineStart = line.DisplayStart
      let lineEnd = line.DisplayStart + line.DisplayLength
      let start = selectionStart > lineStart ? selectionStart : lineStart
      let end = selectionEnd < lineEnd ? selectionEnd : lineEnd
      if end <= start { continue }
      let rects = TextEditorLayouts.SelectionRects(line, start - lineStart, end - lineStart)
      paintSelectionRects(canvas, paint,
        contentX + TextEditorLayouts.editorLineOffset(n, line, contentWidth),
        contentY + line.Top, line.Height, rects)
    }
  }

  internal func paintEntryShapeShadows(n Node, canvas SKCanvas, shaped ShapedText,
    startX float32, baselineY float32, alpha float32) {
    let count = textShadowCount(n.TextShadows)
    for var i = count; i > 0; i-- {
      let shadow = textShadowAt(n.TextShadows, i - 1)
      if shadow.Color.A <= 0.0F { continue }
      let color = Color.FromNormalized(
        shadow.Color.R, shadow.Color.G, shadow.Color.B, shadow.Color.A * alpha)
      let paint = resetPaint()
      paint.Color = SKColor(color.ToSkia())
      paint.IsAntialias = true
      let x = startX + resolvePx(shadow.OffsetX)
      let baseline = baselineY + resolvePx(shadow.OffsetY)
      let blur = resolvePx(shadow.Blur)
      if blur > 0.0F { paint.MaskFilter = blurFilter(blur) }
      TextShaping.Paint(shaped, canvas, paint, x, baseline)
      if n.TextDecoration != TextDecoration.None {
        TextLayouts.PaintDecoration(n.TextDecoration, canvas, paint, x, baseline,
          shaped.Width, shaped.Ascent, shaped.Descent)
      }
    }
  }

  internal func paintEntryShapeStroke(n Node, canvas SKCanvas, shaped ShapedText,
    x float32, baseline float32, alpha float32) {
    guard let stroke = TextStroking.Visible(n) else {
      return
    }
    let color = Color.FromNormalized(
      stroke.Color.R, stroke.Color.G, stroke.Color.B, stroke.Color.A * alpha)
    let paint = resetPaint()
    paint.Color = SKColor(color.ToSkia())
    paint.IsAntialias = true
    paint.Style = SKPaintStyle.Stroke
    paint.StrokeWidth = stroke.Width.Value
    paint.StrokeJoin = SKStrokeJoin.Round
    TextShaping.Paint(shaped, canvas, paint, x, baseline)
  }

}
