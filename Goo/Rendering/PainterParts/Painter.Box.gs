package Goo

import System
import SkiaSharp

internal partial class Painter {
  // Paint order: outer shadows, background, inset shadows, then per-edge border.
  internal func paintContainer(n Node, canvas SKCanvas, ref boxScratch BoxPaintScratch?) {
    let rect = SKRect.Create(n.Rect.X, n.Rect.Y, n.Rect.W, n.Rect.H)
    paintOuterBoxShadows(n, canvas, ref boxScratch)
    paintBackground(canvas, rect, n, ref boxScratch)
    paintInsetBoxShadows(n, canvas, rect, ref boxScratch)
    paintBorder(n, canvas, rect, ref boxScratch)
  }

  internal func paintBorder(n Node, canvas SKCanvas, rect SKRect, ref boxScratch BoxPaintScratch?) {
    let left = borderPixels(n.BorderLeftWidth)
    let top = borderPixels(n.BorderTopWidth)
    let right = borderPixels(n.BorderRightWidth)
    let bottom = borderPixels(n.BorderBottomWidth)
    if left <= 0.0F && top <= 0.0F && right <= 0.0F && bottom <= 0.0F {
      return
    }
    if n.BorderStyle != BorderStyle.Solid {
      paintStrokedBorder(n, canvas, rect, ref boxScratch)
      return
    }
    let borderColor = n.BorderLeftColor.ToSkia()
    if n.BorderTopLeftRadius.Unit == LengthUnit.Unset
      && n.BorderTopRightRadius.Unit == LengthUnit.Unset
      && n.BorderBottomRightRadius.Unit == LengthUnit.Unset
      && n.BorderBottomLeftRadius.Unit == LengthUnit.Unset
      && left == top && left == right && left == bottom
      && borderColor == n.BorderTopColor.ToSkia()
      && borderColor == n.BorderRightColor.ToSkia()
      && borderColor == n.BorderBottomColor.ToSkia() {
      paintUniformSolidBorder(n, canvas, rect, left, borderColor, ref boxScratch)
      return
    }

    var innerLeft = rect.Left + left
    var innerTop = rect.Top + top
    var innerRight = rect.Right - right
    var innerBottom = rect.Bottom - bottom
    if innerRight < innerLeft {
      let center = (rect.Left + rect.Right) * 0.5F
      innerLeft = center
      innerRight = center
    }
    if innerBottom < innerTop {
      let center = (rect.Top + rect.Bottom) * 0.5F
      innerTop = center
      innerBottom = center
    }

    // Side quads meet at max(border, scaled radius) so their union covers the ring's arcs.
    var tl = nonNegative(cornerPx(n.BorderTopLeftRadius, n.BorderRadius))
    var tr = nonNegative(cornerPx(n.BorderTopRightRadius, n.BorderRadius))
    var br = nonNegative(cornerPx(n.BorderBottomRightRadius, n.BorderRadius))
    var bl = nonNegative(cornerPx(n.BorderBottomLeftRadius, n.BorderRadius))
    // Mirrors SkRRect radius clamping: one uniform scale keeps adjacent radii within each edge.
    var scale = 1.0F
    scale = edgeRadiusScale(scale, rect.Width, tl, tr)
    scale = edgeRadiusScale(scale, rect.Height, tr, br)
    scale = edgeRadiusScale(scale, rect.Width, bl, br)
    scale = edgeRadiusScale(scale, rect.Height, tl, bl)
    tl = tl * scale
    tr = tr * scale
    br = br * scale
    bl = bl * scale
    var meetTLx = rect.Left + MathF.Max(left, tl)
    var meetTLy = rect.Top + MathF.Max(top, tl)
    var meetTRx = rect.Right - MathF.Max(right, tr)
    var meetTRy = rect.Top + MathF.Max(top, tr)
    var meetBRx = rect.Right - MathF.Max(right, br)
    var meetBRy = rect.Bottom - MathF.Max(bottom, br)
    var meetBLx = rect.Left + MathF.Max(left, bl)
    var meetBLy = rect.Bottom - MathF.Max(bottom, bl)
    let centerX = (rect.Left + rect.Right) * 0.5F
    let centerY = (rect.Top + rect.Bottom) * 0.5F
    if meetTRx < meetTLx {
      meetTLx = centerX
      meetTRx = centerX
    }
    if meetBRx < meetBLx {
      meetBLx = centerX
      meetBRx = centerX
    }
    if meetBLy < meetTLy {
      meetTLy = centerY
      meetBLy = centerY
    }
    if meetBRy < meetTRy {
      meetTRy = centerY
      meetBRy = centerY
    }

    canvas.Save()
    if hasRadius(n) {
      let outer = boxRoundRect(ref boxScratch, rect, n)
      canvas.ClipRoundRect(outer, SKClipOperation.Intersect, true)
    } else {
      canvas.ClipRect(rect, SKClipOperation.Intersect, true)
    }
    if innerRight > innerLeft && innerBottom > innerTop {
      let innerRect = SKRect.Create(innerLeft, innerTop, innerRight - innerLeft, innerBottom - innerTop)
      if hasRadius(n) {
        let inner = buildInnerBorderRoundRect(ref boxScratch, innerRect, n, left, top, right, bottom)
        canvas.ClipRoundRect(inner, SKClipOperation.Difference, true)
      } else {
        canvas.ClipRect(innerRect, SKClipOperation.Difference, true)
      }
    }

    let builder = resetBoxBuilder(ref boxScratch, SKPathFillType.Winding)
    let paint = resetPaint()
    paint.IsAntialias = true
    paint.Style = SKPaintStyle.Fill
    if left > 0.0F {
      builder.MoveTo(rect.Left, rect.Top)
      builder.LineTo(meetTLx, meetTLy)
      builder.LineTo(meetBLx, meetBLy)
      builder.LineTo(rect.Left, rect.Bottom)
      builder.Close()
      using let side = builder.Detach()!!
      paint.Color = SKColor(n.BorderLeftColor.ToSkia())
      canvas.DrawPath(side, paint)
    }
    if top > 0.0F {
      builder.MoveTo(rect.Left, rect.Top)
      builder.LineTo(rect.Right, rect.Top)
      builder.LineTo(meetTRx, meetTRy)
      builder.LineTo(meetTLx, meetTLy)
      builder.Close()
      using let side = builder.Detach()!!
      paint.Color = SKColor(n.BorderTopColor.ToSkia())
      canvas.DrawPath(side, paint)
    }
    if right > 0.0F {
      builder.MoveTo(rect.Right, rect.Top)
      builder.LineTo(rect.Right, rect.Bottom)
      builder.LineTo(meetBRx, meetBRy)
      builder.LineTo(meetTRx, meetTRy)
      builder.Close()
      using let side = builder.Detach()!!
      paint.Color = SKColor(n.BorderRightColor.ToSkia())
      canvas.DrawPath(side, paint)
    }
    if bottom > 0.0F {
      builder.MoveTo(rect.Left, rect.Bottom)
      builder.LineTo(meetBLx, meetBLy)
      builder.LineTo(meetBRx, meetBRy)
      builder.LineTo(rect.Right, rect.Bottom)
      builder.Close()
      using let side = builder.Detach()!!
      paint.Color = SKColor(n.BorderBottomColor.ToSkia())
      canvas.DrawPath(side, paint)
    }
    canvas.Restore()
  }

  private func paintUniformSolidBorder(n Node, canvas SKCanvas, rect SKRect, width float32, color uint32,
    ref boxScratch BoxPaintScratch?) {
    let innerRect = SKRect.Create(rect.Left + width, rect.Top + width, rect.Width - width * 2.0F,
      rect.Height - width * 2.0F)
    var radius = nonNegative(resolvePx(n.BorderRadius))
    var scale = 1.0F
    scale = edgeRadiusScale(scale, rect.Width, radius, radius)
    scale = edgeRadiusScale(scale, rect.Height, radius, radius)
    radius = radius * scale
    let paint = resetPaint()
    paint.IsAntialias = true
    paint.Style = SKPaintStyle.Fill
    paint.Color = SKColor(color)
    if innerRect.Width <= 0.0F || innerRect.Height <= 0.0F {
      if radius > 0.0F {
        canvas.DrawRoundRect(rect, radius, radius, paint)
      } else {
        canvas.DrawRect(rect, paint)
      }
      return
    }
    let outer = resetBoxRoundRect(ref boxScratch, rect, radius, radius, radius, radius)
    let innerRadius = insetRadius(radius, width, width)
    let inner = resetBoxRoundRect2(ref boxScratch, innerRect, innerRadius, innerRadius, innerRadius, innerRadius)
    canvas.DrawRoundRectDifference(outer, inner, paint)
  }

  internal func edgeRadiusScale(current float32, edge float32, a float32, b float32) float32 {
    let sum = a + b
    if sum <= edge {
      return current
    }
    let value = edge / sum
    return value < current ? value : current
  }

  // Dashed/Dotted stroke one centerline ring with the top border width and color.
  internal func paintStrokedBorder(n Node, canvas SKCanvas, rect SKRect, ref boxScratch BoxPaintScratch?) {
    let width = borderPixels(n.BorderTopWidth)
    if width <= 0.0F || n.BorderTopColor.A <= 0.0F {
      return
    }
    let inset = width * 0.5F
    let center = SKRect.Create(rect.Left + inset, rect.Top + inset, rect.Width - width, rect.Height - width)
    if center.Width <= 0.0F || center.Height <= 0.0F {
      return
    }
    let dotted = n.BorderStyle == BorderStyle.Dotted
    if let effect = boxDashEffect(ref boxScratch, n.BorderStyle, width) {
      paintStrokedBorderWithEffect(n, canvas, center, inset, width, dotted, effect, ref boxScratch)
      return
    }
    using let effect = createBoxDashEffect(n.BorderStyle, width)
    paintStrokedBorderWithEffect(n, canvas, center, inset, width, dotted, effect, ref boxScratch)
  }

  private func paintStrokedBorderWithEffect(n Node, canvas SKCanvas, center SKRect, inset float32,
    width float32, dotted bool, effect SKPathEffect, ref boxScratch BoxPaintScratch?) {
    let paint = resetPaint()
    paint.Color = SKColor(n.BorderTopColor.ToSkia())
    paint.IsAntialias = true
    paint.Style = SKPaintStyle.Stroke
    paint.StrokeWidth = width
    paint.StrokeCap = dotted ? SKStrokeCap.Round : SKStrokeCap.Butt
    paint.PathEffect = effect
    try {
      if hasRadius(n) {
        let rr = buildOutlineRoundRect(ref boxScratch, center, n, -inset)
        canvas.DrawRoundRect(rr, paint)
      } else {
        canvas.DrawRect(center, paint)
      }
    } finally {
      paint.PathEffect = nil
    }
  }

  internal func paintOutline(n Node, canvas SKCanvas, ref boxScratch BoxPaintScratch?) {
    if n.Kind == NodeKind.Shape {
      return
    }
    guard let outline = Outlining.Get(n) else {
      return
    }
    let width = resolvePx(outline.Width)
    if width <= 0.0F || outline.Color.A <= 0.0F {
      return
    }

    let offset = resolvePx(outline.Offset)
    let centerInflate = offset + width * 0.5F
    let centerRect = outlineRect(n, centerInflate)
    if centerRect.Width <= 0.0F || centerRect.Height <= 0.0F {
      return
    }

    let paint = resetPaint()
    paint.Color = SKColor(outline.Color.ToSkia())
    paint.IsAntialias = true
    paint.Style = SKPaintStyle.Stroke
    paint.StrokeWidth = width
    if n.BorderTopLeftRadius.Unit == LengthUnit.Unset
      && n.BorderTopRightRadius.Unit == LengthUnit.Unset
      && n.BorderBottomRightRadius.Unit == LengthUnit.Unset
      && n.BorderBottomLeftRadius.Unit == LengthUnit.Unset {
      let radius = nonNegative(resolvePx(n.BorderRadius) + centerInflate)
      if radius > 0.0F {
        canvas.DrawRoundRect(centerRect, radius, radius, paint)
      } else {
        canvas.DrawRect(centerRect, paint)
      }
      return
    }
    let center = buildOutlineRoundRect(ref boxScratch, centerRect, n, centerInflate)
    canvas.DrawRoundRect(center, paint)
  }

  internal func outlineRect(n Node, inflate float32) SKRect {
    return SKRect.Create(
      n.Rect.X - inflate,
      n.Rect.Y - inflate,
      n.Rect.W + inflate * 2.0F,
      n.Rect.H + inflate * 2.0F)
  }

  internal func buildOutlineRoundRect(ref boxScratch BoxPaintScratch?, rect SKRect, n Node, inflate float32) SKRoundRect {
    let tl = nonNegative(cornerPx(n.BorderTopLeftRadius, n.BorderRadius) + inflate)
    let tr = nonNegative(cornerPx(n.BorderTopRightRadius, n.BorderRadius) + inflate)
    let br = nonNegative(cornerPx(n.BorderBottomRightRadius, n.BorderRadius) + inflate)
    let bl = nonNegative(cornerPx(n.BorderBottomLeftRadius, n.BorderRadius) + inflate)
    return resetBoxRoundRect(ref boxScratch, rect, tl, tr, br, bl)
  }

  internal func boxRoundRect(ref boxScratch BoxPaintScratch?, rect SKRect, n Node) SKRoundRect {
    let tl = cornerPx(n.BorderTopLeftRadius, n.BorderRadius)
    let tr = cornerPx(n.BorderTopRightRadius, n.BorderRadius)
    let br = cornerPx(n.BorderBottomRightRadius, n.BorderRadius)
    let bl = cornerPx(n.BorderBottomLeftRadius, n.BorderRadius)
    return resetBoxRoundRect(ref boxScratch, rect, tl, tr, br, bl)
  }

  internal func buildInnerBorderRoundRect(ref boxScratch BoxPaintScratch?,
    rect SKRect, n Node, left float32, top float32, right float32, bottom float32) SKRoundRect {
    let tl = insetRadius(cornerPx(n.BorderTopLeftRadius, n.BorderRadius), left, top)
    let tr = insetRadius(cornerPx(n.BorderTopRightRadius, n.BorderRadius), right, top)
    let br = insetRadius(cornerPx(n.BorderBottomRightRadius, n.BorderRadius), right, bottom)
    let bl = insetRadius(cornerPx(n.BorderBottomLeftRadius, n.BorderRadius), left, bottom)
    return resetBoxRoundRect(ref boxScratch, rect, tl, tr, br, bl)
  }

  internal func borderPixels(width Length) float32 {
    return width.Unit == LengthUnit.Px ? width.Value : 0.0F
  }

  // Gradient wins over BackgroundColor. The image layers over either fill.
  internal func paintBackground(canvas SKCanvas, rect SKRect, n Node, ref boxScratch BoxPaintScratch?) {
    var filled = false
    if isApplied(n, StyleField.BackgroundGradient) {
      if let gradient = n.BackgroundGradient {
        let paint = resetPaint()
        paint.IsAntialias = true
        let localRect = SKRect.Create(0.0F, 0.0F, rect.Width, rect.Height)
        if let shader = cachedGradientShader(gradient, rect.Width, rect.Height) {
          paint.Shader = shader
          paintLocalBackground(canvas, rect, localRect, n, paint, ref boxScratch)
        } else {
          using let shader = GradientSkia.ToShader(gradient, localRect)
          paint.Shader = shader
          try {
            paintLocalBackground(canvas, rect, localRect, n, paint, ref boxScratch)
          } finally {
            paint.Shader = nil
          }
        }
        filled = true
      }
    }
    if !filled && isApplied(n, StyleField.BackgroundColor) {
      let paint = resetPaint()
      paint.Color = SKColor(n.BackgroundColor.ToSkia())
      paint.IsAntialias = true
      fillRect(canvas, rect, n, paint, ref boxScratch)
    }
    paintBackgroundImage(n, canvas, rect, ref boxScratch)
  }

  private func paintLocalBackground(canvas SKCanvas, rect SKRect, localRect SKRect, n Node, paint SKPaint,
    ref boxScratch BoxPaintScratch?) {
    canvas.Save()
    try {
      canvas.Translate(rect.Left, rect.Top)
      fillRect(canvas, localRect, n, paint, ref boxScratch)
    } finally {
      canvas.Restore()
    }
  }

  internal func paintBackgroundImage(n Node, canvas SKCanvas, rect SKRect, ref boxScratch BoxPaintScratch?) {
    guard let image = backgroundImage(n) else {
      return
    }
    let destination = fittedImageRect(rect, image, n.BackgroundImageFit)
    canvas.Save()
    try {
      if hasRadius(n) {
        let clip = boxRoundRect(ref boxScratch, rect, n)
        canvas.ClipRoundRect(clip, SKClipOperation.Intersect, true)
      } else {
        canvas.ClipRect(rect, SKClipOperation.Intersect, true)
      }
      drawImage(image, canvas, destination)
    } finally {
      canvas.Restore()
    }
  }

  internal func paintOuterBoxShadows(n Node, canvas SKCanvas, ref boxScratch BoxPaintScratch?) {
    let count = boxShadowCount(n.BoxShadows)
    for var i = count; i > 0; i-- {
      let shadow = boxShadowAt(n.BoxShadows, i - 1)
      if !shadow.Inset {
        paintOuterBoxShadow(n, canvas, shadow, ref boxScratch)
      }
    }
  }

  internal func paintOuterBoxShadow(n Node, canvas SKCanvas, shadow BoxShadow, ref boxScratch BoxPaintScratch?) {
    if shadow.Color.A <= 0.0F {
      return
    }
    let sp = resetPaint()
    sp.Color = SKColor(shadow.Color.ToSkia())
    sp.IsAntialias = true
    let blur = resolvePx(shadow.Blur)
    if blur > 0.0F {
      sp.MaskFilter = blurFilter(blur)
    }
    let offsetX = resolvePx(shadow.OffsetX)
    let offsetY = resolvePx(shadow.OffsetY)
    let spread = resolvePx(shadow.Spread)
    let srect = SKRect.Create(n.Rect.X + offsetX - spread, n.Rect.Y + offsetY - spread,
      n.Rect.W + spread * 2.0F, n.Rect.H + spread * 2.0F)
    if srect.Width <= 0.0F || srect.Height <= 0.0F {
      return
    }
    fillRect(canvas, srect, n, sp, ref boxScratch)
  }

  internal func paintInsetBoxShadows(n Node, canvas SKCanvas, rect SKRect, ref boxScratch BoxPaintScratch?) {
    let count = boxShadowCount(n.BoxShadows)
    if count == 0 {
      return
    }
    let left = borderPixels(n.BorderLeftWidth)
    let top = borderPixels(n.BorderTopWidth)
    let right = borderPixels(n.BorderRightWidth)
    let bottom = borderPixels(n.BorderBottomWidth)
    let padding = insetRect(rect, left, top, right, bottom)
    if padding.Width <= 0.0F || padding.Height <= 0.0F {
      return
    }
    for var i = count; i > 0; i-- {
      let shadow = boxShadowAt(n.BoxShadows, i - 1)
      if shadow.Inset {
        paintInsetBoxShadow(n, canvas, padding, left, top, right, bottom, shadow, ref boxScratch)
      }
    }
  }

  internal func paintInsetBoxShadow(n Node, canvas SKCanvas, padding SKRect,
    left float32, top float32, right float32, bottom float32, shadow BoxShadow, ref boxScratch BoxPaintScratch?) {
    if shadow.Color.A <= 0.0F {
      return
    }
    let blur = resolvePx(shadow.Blur)
    let spread = resolvePx(shadow.Spread)
    let offsetX = resolvePx(shadow.OffsetX)
    let offsetY = resolvePx(shadow.OffsetY)
    let hole = SKRect.Create(
      padding.Left + spread + offsetX,
      padding.Top + spread + offsetY,
      padding.Width - spread * 2.0F,
      padding.Height - spread * 2.0F)
    let margin = blur * 2.0F + MathF.Abs(offsetX) + MathF.Abs(offsetY) + MathF.Abs(spread) + 2.0F
    let outside = SKRect.Create(
      padding.Left - margin, padding.Top - margin,
      padding.Width + margin * 2.0F, padding.Height + margin * 2.0F)
    canvas.Save()
    if hasRadius(n) {
      let clip = buildInnerBorderRoundRect(ref boxScratch, padding, n, left, top, right, bottom)
      canvas.ClipRoundRect(clip, SKClipOperation.Intersect, true)
    } else {
      canvas.ClipRect(padding, SKClipOperation.Intersect, true)
    }
    let paint = resetPaint()
    paint.Color = SKColor(shadow.Color.ToSkia())
    paint.IsAntialias = true
    if blur > 0.0F {
      paint.MaskFilter = blurFilter(blur)
    }
    if hole.Width > 0.0F && hole.Height > 0.0F {
      let outsideRound = resetBoxRoundRect(ref boxScratch, outside, 0.0F, 0.0F, 0.0F, 0.0F)
      let holeRound = if hasRadius(n) {
        buildInsetShadowRoundRect(ref boxScratch, hole, n, left, top, right, bottom, spread)
      } else {
        resetBoxRoundRect2(ref boxScratch, hole, 0.0F, 0.0F, 0.0F, 0.0F)
      }
      canvas.DrawRoundRectDifference(outsideRound, holeRound, paint)
    } else {
      canvas.DrawRect(outside, paint)
    }
    canvas.Restore()
  }

  internal func insetRect(rect SKRect, left float32, top float32, right float32, bottom float32) SKRect {
    var innerLeft = rect.Left + left
    var innerTop = rect.Top + top
    var innerRight = rect.Right - right
    var innerBottom = rect.Bottom - bottom
    if innerRight < innerLeft { innerRight = innerLeft }
    if innerBottom < innerTop { innerBottom = innerTop }
    return SKRect.Create(innerLeft, innerTop, innerRight - innerLeft, innerBottom - innerTop)
  }

  internal func buildInsetShadowRoundRect(ref boxScratch BoxPaintScratch?, rect SKRect, n Node,
    left float32, top float32, right float32, bottom float32, spread float32) SKRoundRect {
    let tl = nonNegative(insetRadius(cornerPx(n.BorderTopLeftRadius, n.BorderRadius), left, top) - spread)
    let tr = nonNegative(insetRadius(cornerPx(n.BorderTopRightRadius, n.BorderRadius), right, top) - spread)
    let br = nonNegative(insetRadius(cornerPx(n.BorderBottomRightRadius, n.BorderRadius), right, bottom) - spread)
    let bl = nonNegative(insetRadius(cornerPx(n.BorderBottomLeftRadius, n.BorderRadius), left, bottom) - spread)
    return resetBoxRoundRect2(ref boxScratch, rect, tl, tr, br, bl)
  }

  internal func hasOuterBoxShadows(n Node) bool {
    if !isApplied(n, StyleField.BoxShadows) { return false }
    let count = boxShadowCount(n.BoxShadows)
    for i in 0 ... count {
      let shadow = boxShadowAt(n.BoxShadows, i)
      if !shadow.Inset && shadow.Color.A > 0.0F { return true }
    }
    return false
  }

  internal func hasInsetBoxShadows(n Node) bool {
    if !isApplied(n, StyleField.BoxShadows) { return false }
    let count = boxShadowCount(n.BoxShadows)
    for i in 0 ... count {
      let shadow = boxShadowAt(n.BoxShadows, i)
      if shadow.Inset && shadow.Color.A > 0.0F { return true }
    }
    return false
  }

  // Flat DrawRect when every corner resolves to 0, else a per-corner SKRoundRect.
  internal func fillRect(canvas SKCanvas, rect SKRect, n Node, paint SKPaint, ref boxScratch BoxPaintScratch?) {
    if n.BorderTopLeftRadius.Unit == LengthUnit.Unset
      && n.BorderTopRightRadius.Unit == LengthUnit.Unset
      && n.BorderBottomRightRadius.Unit == LengthUnit.Unset
      && n.BorderBottomLeftRadius.Unit == LengthUnit.Unset {
      let radius = resolvePx(n.BorderRadius)
      if radius > 0.0F {
        canvas.DrawRoundRect(rect, radius, radius, paint)
      } else {
        canvas.DrawRect(rect, paint)
      }
      return
    }
    if !hasRadius(n) {
      canvas.DrawRect(rect, paint)
      return
    }
    let rr = boxRoundRect(ref boxScratch, rect, n)
    canvas.DrawRoundRect(rr, paint)
  }
}
