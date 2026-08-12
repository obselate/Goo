package Goo

import System
import SkiaSharp

internal struct ShapeShadowPresence {
  internal var Outer bool
  internal var Inset bool
  internal var RetainArtifacts bool
}

internal partial class Painter {
  internal func paintShape(n Node, canvas SKCanvas) {
    let image = backgroundImage(n)
    let gradient = shapeGradient(n)
    let hasPaintedFill = shapeHasFill(n, image, gradient)
    let strokeWidth = resolvePx(n.BorderLeftWidth)
    let activeDashes = hasDashes(n)
    let needsEffects = shapeNeedsEffects(n, hasPaintedFill, strokeWidth, activeDashes)
    let effects = if needsEffects { ShapePathEffects.For(n) } else { nil }
    let shadows = shapeShadowPresence(n)
    let geometry = ShapeGeometry.PreparePaint(n, hasPaintedFill, strokeWidth,
      shadows.Outer || shadows.Inset, shadows.RetainArtifacts, effects)
    if !geometry.Valid {
      return
    }

    if shadows.Outer {
      if let silhouette = geometry.Silhouette { paintShapeOuterShadows(n, canvas, silhouette) }
    }
    canvas.Save()
    try {
      canvas.ClipRect(geometry.Clip, SKClipOperation.Intersect, true)
      if let fill = geometry.FinalFill {
        if !fill.IsEmpty {
          if let g = gradient {
            guard let bounds = geometry.CanonicalFill else {
              throw InvalidOperationException("Painter.paintShape: missing canonical fill")
            }
            let paint = resetPaint()
            paint.IsAntialias = true
            let shader = cachedGradientShader(g, bounds.TightBounds)
            paint.Shader = shader
            canvas.DrawPath(fill, paint)
          } else if isApplied(n, StyleField.BackgroundColor) {
            let paint = resetPaint()
            paint.Color = SKColor(n.BackgroundColor.ToSkia())
            paint.IsAntialias = true
            canvas.DrawPath(fill, paint)
          }
          if let background = image {
            guard let bounds = geometry.CanonicalFill else {
              throw InvalidOperationException("Painter.paintShape: missing canonical fill")
            }
            paintShapeBackgroundImage(canvas, fill, bounds.TightBounds, background, n.BackgroundImageFit)
          }
        }
      }
      if shadows.Inset {
        if let silhouette = geometry.Silhouette { paintShapeInsetShadows(n, canvas, silhouette) }
      }
      if strokeWidth > 0.0F {
        if let path = geometry.Stroke {
          let stroke = resetPaint()
          stroke.Color = SKColor(n.BorderLeftColor.ToSkia())
          stroke.IsAntialias = true
          stroke.Style = SKPaintStyle.Stroke
          stroke.StrokeWidth = strokeWidth
          stroke.StrokeCap = skStrokeCap(n.ShapeStrokeCap)
          stroke.StrokeJoin = skStrokeJoin(n.ShapeStrokeJoin)
          stroke.StrokeMiter = float32(n.MiterLimit)
          if activeDashes {
            if float32(n.ShapeCornerRadius) > 0.0F {
              stroke.PathEffect = composedEffect(effects)
            } else {
              stroke.PathEffect = dashEffect(effects)
            }
          } else if float32(n.ShapeCornerRadius) > 0.0F {
            stroke.PathEffect = cornerEffect(effects)
          }
          canvas.DrawPath(path, stroke)
        }
      }
    } finally {
      canvas.Restore()
    }
  }

  internal func paintShapeBackgroundImage(canvas SKCanvas, clip SKPath, bounds SKRect,
    image DecodedImage, fit ImageFit) {
    if bounds.Width <= 0.0F || bounds.Height <= 0.0F {
      return
    }
    canvas.Save()
    try {
      canvas.ClipPath(clip, SKClipOperation.Intersect, true)
      drawImage(image, canvas, fittedImageRect(bounds, image, fit))
    } finally {
      canvas.Restore()
    }
  }

  private func paintShapeOuterShadows(n Node, canvas SKCanvas, silhouette SKPath) {
    if silhouette.IsEmpty {
      return
    }
    let count = boxShadowCount(n.BoxShadows)
    for var i = count; i > 0; i-- {
      let shadow = boxShadowAt(n.BoxShadows, i - 1)
      if !shadow.Inset { paintShapeOuterShadow(n, canvas, silhouette, shadow) }
    }
  }

  internal func paintShapeOuterShadow(n Node, canvas SKCanvas, silhouette SKPath, shadow BoxShadow) {
    if shadow.Color.A <= 0.0F {
      return
    }
    let spread = resolvePx(shadow.Spread)
    if spread < 0.0F {
      guard let eroded = ShapeGeometry.NegativeOuter(n, silhouette, spread) else {
        return
      }
      if eroded.IsEmpty {
        return
      }
      canvas.Save()
      try {
        canvas.Translate(resolvePx(shadow.OffsetX), resolvePx(shadow.OffsetY))
        let paint = shapeShadowPaint(shadow)
        canvas.DrawPath(eroded, paint)
      } finally {
        canvas.Restore()
      }
      return
    }

    canvas.Save()
    try {
      canvas.Translate(resolvePx(shadow.OffsetX), resolvePx(shadow.OffsetY))
      let paint = shapeShadowPaint(shadow)
      if spread > 0.0F {
        paint.Style = SKPaintStyle.StrokeAndFill
        paint.StrokeWidth = spread * 2.0F
        paint.StrokeJoin = SKStrokeJoin.Miter
        paint.StrokeMiter = shapeOuterShadowSpreadMiterLimit
      }
      canvas.DrawPath(silhouette, paint)
    } finally {
      canvas.Restore()
    }
  }

  private func shapeShadowPaint(shadow BoxShadow) SKPaint {
    let paint = resetPaint()
    paint.Color = SKColor(shadow.Color.ToSkia())
    paint.IsAntialias = true
    let blur = resolvePx(shadow.Blur)
    if blur > 0.0F { paint.MaskFilter = blurFilter(blur) }
    return paint
  }

  private func paintShapeInsetShadows(n Node, canvas SKCanvas, silhouette SKPath) {
    if silhouette.IsEmpty {
      return
    }
    let count = boxShadowCount(n.BoxShadows)
    for var i = count; i > 0; i-- {
      let shadow = boxShadowAt(n.BoxShadows, i - 1)
      if shadow.Inset { paintShapeInsetShadow(n, canvas, silhouette, shadow) }
    }
  }

  internal func paintShapeInsetShadow(n Node, canvas SKCanvas, silhouette SKPath, shadow BoxShadow) {
    if shadow.Color.A <= 0.0F {
      return
    }
    let blur = resolvePx(shadow.Blur)
    let spread = resolvePx(shadow.Spread)
    let offsetX = resolvePx(shadow.OffsetX)
    let offsetY = resolvePx(shadow.OffsetY)
    guard let inverse = ShapeGeometry.InsetInverse(n, silhouette, spread, offsetX, offsetY, blur) else {
      return
    }
    canvas.Save()
    try {
      canvas.ClipPath(silhouette, SKClipOperation.Intersect, true)
      let paint = resetPaint()
      paint.Color = SKColor(shadow.Color.ToSkia())
      paint.IsAntialias = true
      if blur > 0.0F { paint.MaskFilter = blurFilter(blur) }
      canvas.DrawPath(inverse, paint)
    } finally {
      canvas.Restore()
    }
  }

  private func hasDashes(n Node) bool {
    if let dashes = n.Dashes { return dashes.Intervals.Count > 0 }
    return false
  }

  private func shapeGradient(n Node) Gradient? {
    return isApplied(n, StyleField.BackgroundGradient) ? n.BackgroundGradient : nil
  }

  private func shapeHasFill(n Node, image DecodedImage?, gradient Gradient?) bool {
    return (gradient != nil || image != nil || isApplied(n, StyleField.BackgroundColor))
      && n.ShapePath.HasClosedContour
  }

  private func shapeNeedsEffects(n Node, hasFill bool, strokeWidth float32, dashed bool) bool {
    return (float32(n.ShapeCornerRadius) > 0.0F && (hasFill || strokeWidth > 0.0F))
      || (dashed && strokeWidth > 0.0F)
  }

  private func shapeShadowPresence(n Node) ShapeShadowPresence {
    if !isApplied(n, StyleField.BoxShadows) { return ShapeShadowPresence{} }
    var result ShapeShadowPresence
    let count = boxShadowCount(n.BoxShadows)
    for i in 0 ... count {
      let shadow = boxShadowAt(n.BoxShadows, i)
      if shadow.Color.A <= 0.0F { continue }
      if shadow.Inset {
        result.Inset = true
        result.RetainArtifacts = true
      } else {
        result.Outer = true
        if resolvePx(shadow.Spread) < 0.0F { result.RetainArtifacts = true }
      }
    }
    return result
  }

  private func cornerEffect(effects ShapePathEffectsValue?) SKPathEffect {
    guard let value = effects else {
      throw InvalidOperationException("Painter.paintShape: missing corner effects")
    }
    guard let corner = value.Corner else {
      throw InvalidOperationException("Painter.paintShape: missing corner effect")
    }
    return corner
  }

  private func dashEffect(effects ShapePathEffectsValue?) SKPathEffect {
    guard let value = effects else {
      throw InvalidOperationException("Painter.paintShape: missing dash effects")
    }
    guard let dash = value.Dash else {
      throw InvalidOperationException("Painter.paintShape: missing dash effect")
    }
    return dash
  }

  private func composedEffect(effects ShapePathEffectsValue?) SKPathEffect {
    guard let value = effects else {
      throw InvalidOperationException("Painter.paintShape: missing composed effects")
    }
    guard let composed = value.Composed else {
      throw InvalidOperationException("Painter.paintShape: missing composed effect")
    }
    return composed
  }

  internal func skStrokeCap(cap StrokeCap) SKStrokeCap {
    return switch cap {
      case StrokeCap.Butt: SKStrokeCap.Butt
      case StrokeCap.Round: SKStrokeCap.Round
      case StrokeCap.Square: SKStrokeCap.Square
      default: throw NotSupportedException("Painter.skStrokeCap: unhandled StrokeCap")
    }
  }

  internal func skStrokeJoin(join StrokeJoin) SKStrokeJoin {
    return switch join {
      case StrokeJoin.Miter: SKStrokeJoin.Miter
      case StrokeJoin.Round: SKStrokeJoin.Round
      case StrokeJoin.Bevel: SKStrokeJoin.Bevel
      default: throw NotSupportedException("Painter.skStrokeJoin: unhandled StrokeJoin")
    }
  }
}
