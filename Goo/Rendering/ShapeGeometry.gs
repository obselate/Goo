package Goo

import System
import System.Runtime.CompilerServices
import Facebook.Yoga
import SkiaSharp

internal struct ShapeMapping {
  internal let Valid bool
  internal let Left float32
  internal let Top float32
  internal let Width float32
  internal let Height float32
  internal let Matrix SKMatrix
}

internal struct ShapePaintGeometry {
  internal let Valid bool
  internal let Mapping ShapeMapping
  internal let Clip SKRect
  internal let CanonicalFill SKPath?
  internal let FinalFill SKPath?
  internal let Stroke SKPath?
  internal let Silhouette SKPath?
}

internal struct ShapeShadowArtifactStats {
  internal let SidecarObjects int32
  internal let NativeWrappers int32
}

internal class ShapeGeometry {
  shared {
    private let values ConditionalWeakTable[Node, ShapeGeometryValue] =
      ConditionalWeakTable[Node, ShapeGeometryValue]()
    private let shadowArtifacts ConditionalWeakTable[Node, ShapeShadowArtifacts] =
      ConditionalWeakTable[Node, ShapeShadowArtifacts]()

    internal func Map(n Node) ShapeMapping {
      let strokeWidth = n.BorderLeftWidth.Px
      let halfStroke = strokeWidth * 0.5F
      let paddingLeft = ResolvedPadding(n, YGEdge.Left)
      let paddingTop = ResolvedPadding(n, YGEdge.Top)
      let paddingRight = ResolvedPadding(n, YGEdge.Right)
      let paddingBottom = ResolvedPadding(n, YGEdge.Bottom)
      let left = n.Rect.X + paddingLeft + halfStroke
      let top = n.Rect.Y + paddingTop + halfStroke
      let width = n.Rect.W - paddingLeft - paddingRight - strokeWidth
      let height = n.Rect.H - paddingTop - paddingBottom - strokeWidth
      let viewBoxWidth = float32(n.ShapePath.ViewBoxWidth)
      let viewBoxHeight = float32(n.ShapePath.ViewBoxHeight)
      if width <= 0.0F || height <= 0.0F || viewBoxWidth <= 0.0F || viewBoxHeight <= 0.0F {
        return ShapeMapping{}
      }
      var scaleX = width / viewBoxWidth
      var scaleY = height / viewBoxHeight
      if n.ShapeFit == ShapeFit.Contain || n.ShapeFit == ShapeFit.Cover {
        let scale = if n.ShapeFit == ShapeFit.Contain {
          scaleX < scaleY ? scaleX : scaleY
        } else {
          scaleX > scaleY ? scaleX : scaleY
        }
        scaleX = scale
        scaleY = scale
      } else if n.ShapeFit == ShapeFit.None {
        scaleX = 1.0F
        scaleY = 1.0F
      }
      let tx = left + (width - viewBoxWidth * scaleX) * 0.5F - float32(n.ShapePath.ViewBoxX) * scaleX
      let ty = top + (height - viewBoxHeight * scaleY) * 0.5F - float32(n.ShapePath.ViewBoxY) * scaleY
      return ShapeMapping{
        Valid: true,
        Left: left,
        Top: top,
        Width: width,
        Height: height,
        Matrix: SKMatrix.CreateScaleTranslation(scaleX, scaleY, tx, ty),
      }
    }

    internal func ClipRect(n Node, mapping ShapeMapping) SKRect {
      let strokeWidth = n.BorderLeftWidth.Px
      let halfStroke = strokeWidth * 0.5F
      return SKRect.Create(mapping.Left - halfStroke, mapping.Top - halfStroke,
        mapping.Width + strokeWidth, mapping.Height + strokeWidth)
    }

    internal func CanonicalFill(n Node, mapping ShapeMapping) SKPath? {
      if !mapping.Valid || !n.ShapePath.HasClosedContour { return nil }
      return value(n).CanonicalFill(n.ShapePath, n.ShapeFillRule, mapping.Matrix)
    }

    internal func FinalFill(n Node, mapping ShapeMapping, effects ShapePathEffectsValue?) SKPath? {
      guard let fill = CanonicalFill(n, mapping) else { return nil }
      return value(n).FinalFill(fill, float32(n.ShapeCornerRadius), effects)
    }

    internal func OpenStroke(n Node, mapping ShapeMapping) SKPath? {
      if !mapping.Valid { return nil }
      return value(n).OpenStroke(n.ShapePath, mapping.Matrix)
    }

    internal func PreparePaint(n Node, hasFill bool, strokeWidth float32, needsSilhouette bool,
      retainShadowArtifacts bool, effects ShapePathEffectsValue?) ShapePaintGeometry {
      let mapping = Map(n)
      if !mapping.Valid {
        Dispose(n)
        return ShapePaintGeometry{}
      }
      let clip = ClipRect(n, mapping)
      let hasStroke = strokeWidth > 0.0F
      if !hasFill && !hasStroke && !needsSilhouette {
        Trim(n, false, false, false, false)
        return ShapePaintGeometry{ Valid: true, Mapping: mapping, Clip: clip }
      }
      let cached = values.GetOrCreateValue(n)
      var canonical SKPath? = nil
      if hasFill { canonical = cached.CanonicalFill(n.ShapePath, n.ShapeFillRule, mapping.Matrix) }
      var final SKPath? = nil
      if let fill = canonical { final = cached.FinalFill(fill, float32(n.ShapeCornerRadius), effects) }
      var stroke SKPath? = nil
      if hasStroke { stroke = cached.OpenStroke(n.ShapePath, mapping.Matrix) }
      cached.Trim(hasFill, hasStroke, needsSilhouette, float32(n.ShapeCornerRadius))
      trimShadowArtifacts(n, retainShadowArtifacts)
      var silhouette SKPath? = nil
      if needsSilhouette {
        silhouette = cached.ShadowSilhouette(final, stroke, strokeWidth, n.ShapeStrokeCap,
          n.ShapeStrokeJoin, float32(n.MiterLimit), float32(n.ShapeCornerRadius), n.Dashes, effects)
      }
      return ShapePaintGeometry{
        Valid: true,
        Mapping: mapping,
        Clip: clip,
        CanonicalFill: canonical,
        FinalFill: final,
        Stroke: stroke,
        Silhouette: silhouette,
      }
    }

    internal func ShadowSilhouette(n Node, mapping ShapeMapping, hasFill bool,
      effects ShapePathEffectsValue?) SKPath? {
      if !mapping.Valid {
        Dispose(n)
        return nil
      }
      let strokeWidth = n.BorderLeftWidth.Px
      if !hasFill && strokeWidth <= 0.0F {
        if values.TryGetValue(n, out var cached) { cached.ClearSilhouette() }
        return nil
      }
      let fill = if hasFill { FinalFill(n, mapping, effects) } else { nil }
      let stroke = if strokeWidth > 0.0F { OpenStroke(n, mapping) } else { nil }
      return value(n).ShadowSilhouette(fill, stroke, strokeWidth, n.ShapeStrokeCap,
        n.ShapeStrokeJoin, float32(n.MiterLimit), float32(n.ShapeCornerRadius), n.Dashes, effects)
    }

    internal func NegativeOuter(n Node, silhouette SKPath, spread float32) SKPath? {
      return shadowValue(n).NegativeOuter(silhouette, spread)
    }

    internal func InsetInverse(n Node, silhouette SKPath, spread float32, offsetX float32,
      offsetY float32, blur float32) SKPath? {
      return shadowValue(n).InsetInverse(silhouette, spread, offsetX, offsetY, blur,
        SKRect.Create(n.Rect.X, n.Rect.Y, n.Rect.W, n.Rect.H))
    }

    internal func Trim(n Node, retainFill bool, retainStroke bool, retainSilhouette bool,
      retainShadowArtifacts bool) {
      if values.TryGetValue(n, out var cached) {
        cached.Trim(retainFill, retainStroke, retainSilhouette, float32(n.ShapeCornerRadius))
      }
      trimShadowArtifacts(n, retainShadowArtifacts)
    }

    // Paths without closed contours keep border-box hit semantics.
    internal func HitTest(n Node, x float32, y float32) bool {
      if !n.ShapePath.HasClosedContour { return true }
      let mapping = Map(n)
      if !mapping.Valid || !ClipRect(n, mapping).Contains(x, y) { return false }
      let effects = n.ShapeCornerRadius > 0.0 ? ShapePathEffects.For(n) : nil
      guard let fill = FinalFill(n, mapping, effects) else { return false }
      return fill.Contains(x, y)
    }

    internal func CachedHitPath(n Node) SKPath? {
      if !n.ShapePath.HasClosedContour { return nil }
      let effects = n.ShapeCornerRadius > 0.0 ? ShapePathEffects.For(n) : nil
      return FinalFill(n, Map(n), effects)
    }

    internal func Dispose(n Node) {
      if values.TryGetValue(n, out var cached) {
        values.Remove(n)
        cached.Dispose()
      }
      if shadowArtifacts.TryGetValue(n, out var artifacts) {
        shadowArtifacts.Remove(n)
        artifacts.Dispose()
      }
    }

    internal func ShadowArtifactStats(n Node) ShapeShadowArtifactStats {
      if !shadowArtifacts.TryGetValue(n, out var artifacts) {
        return ShapeShadowArtifactStats{}
      }
      return ShapeShadowArtifactStats{ SidecarObjects: 1, NativeWrappers: artifacts.NativeWrapperCount() }
    }

    internal func ClearShadowArtifacts(n Node) {
      trimShadowArtifacts(n, false)
    }

    internal func ResolvedPadding(n Node, edge YGEdge) float32 {
      return resolvedEdgePadding(n, edge, n.Rect.W)
    }

    private func value(n Node) ShapeGeometryValue {
      return values.GetOrCreateValue(n)
    }

    private func shadowValue(n Node) ShapeShadowArtifacts {
      return shadowArtifacts.GetOrCreateValue(n)
    }

    private func trimShadowArtifacts(n Node, retain bool) {
      if retain {
        return
      }
      if shadowArtifacts.TryGetValue(n, out var artifacts) {
        shadowArtifacts.Remove(n)
        artifacts.Dispose()
      }
    }
  }
}

internal class ShapeGeometryValue {
  internal var Fill SKPath?
  internal var RoundedFill SKPath?
  internal var Stroke SKPath?
  internal var Silhouette SKPath?

  private var fillSource VectorPath
  private var fillRule FillRule
  private var fillScaleX float32
  private var fillScaleY float32
  private var fillTransX float32
  private var fillTransY float32
  private var hasFillKey bool

  private var roundedSource SKPath?
  private var roundedRadius float32
  private var roundedCorner SKPathEffect?

  private var strokeSource VectorPath
  private var strokeScaleX float32
  private var strokeScaleY float32
  private var strokeTransX float32
  private var strokeTransY float32
  private var hasStrokeKey bool

  private var silhouetteFill SKPath?
  private var silhouetteStroke SKPath?
  private var silhouetteWidth float32
  private var silhouetteCap StrokeCap
  private var silhouetteJoin StrokeJoin
  private var silhouetteMiter float32
  private var silhouetteCorner float32
  private var silhouetteDash DashPattern?
  private var silhouetteCornerEffect SKPathEffect?
  private var silhouetteDashEffect SKPathEffect?
  private var silhouetteComposedEffect SKPathEffect?
  private var hasSilhouetteKey bool

  internal func CanonicalFill(source VectorPath, rule FillRule, matrix SKMatrix) SKPath {
    if hasFillKey && Object.ReferenceEquals(fillSource.payload, source.payload) && fillRule == rule
      && sameMatrix(fillScaleX, fillScaleY, fillTransX, fillTransY, matrix) {
      if let retained = Fill { return retained }
    }
    using let native = VectorPathSkia.ClosedContoursToSkia(source)
    using let builder = SKPathBuilder()
    builder.FillType = rule == FillRule.EvenOdd ? SKPathFillType.EvenOdd : SKPathFillType.Winding
    builder.AddPath(native, in matrix, SKPathAddMode.Append)
    let next = builder.Detach()!!
    let prior = Fill
    Fill = next
    fillSource = source
    fillRule = rule
    fillScaleX = matrix.ScaleX
    fillScaleY = matrix.ScaleY
    fillTransX = matrix.TransX
    fillTransY = matrix.TransY
    hasFillKey = true
    ClearRoundedFill()
    ClearSilhouette()
    prior?.Dispose()
    return next
  }

  internal func FinalFill(fill SKPath, radius float32, effects ShapePathEffectsValue?) SKPath {
    if radius <= 0.0F {
      if RoundedFill != nil {
        ClearRoundedFill()
        ClearSilhouette()
      }
      return fill
    }
    let corner = cornerEffectFor(effects)
    if Object.ReferenceEquals(roundedSource, fill) && roundedRadius == radius
      && Object.ReferenceEquals(roundedCorner, corner) {
      if let retained = RoundedFill { return retained }
    }
    using let paint = SKPaint()
    paint.Style = SKPaintStyle.Fill
    paint.PathEffect = corner
    guard let next = paint.GetFillPath(fill) else {
      throw InvalidOperationException("ShapeGeometryValue.FinalFill: SKPaint.GetFillPath failed")
    }
    next.FillType = fill.FillType
    let prior = RoundedFill
    RoundedFill = next
    roundedSource = fill
    roundedRadius = radius
    roundedCorner = corner
    ClearSilhouette()
    prior?.Dispose()
    return next
  }

  internal func OpenStroke(source VectorPath, matrix SKMatrix) SKPath {
    if hasStrokeKey && Object.ReferenceEquals(strokeSource.payload, source.payload)
      && sameMatrix(strokeScaleX, strokeScaleY, strokeTransX, strokeTransY, matrix) {
      if let retained = Stroke { return retained }
    }
    using let native = VectorPathSkia.ToSkia(source)
    using let builder = SKPathBuilder()
    builder.AddPath(native, in matrix, SKPathAddMode.Append)
    let next = builder.Detach()!!
    let prior = Stroke
    Stroke = next
    strokeSource = source
    strokeScaleX = matrix.ScaleX
    strokeScaleY = matrix.ScaleY
    strokeTransX = matrix.TransX
    strokeTransY = matrix.TransY
    hasStrokeKey = true
    ClearSilhouette()
    prior?.Dispose()
    return next
  }

  internal func ShadowSilhouette(fill SKPath?, stroke SKPath?, width float32, cap StrokeCap,
    join StrokeJoin, miter float32, corner float32, dashes DashPattern?, effects ShapePathEffectsValue?) SKPath {
    let dash = activeDash(dashes)
    let cornerEffect = effects?.Corner
    let dashEffect = effects?.Dash
    let composed = effects?.Composed
    if hasSilhouetteKey && Object.ReferenceEquals(silhouetteFill, fill)
      && Object.ReferenceEquals(silhouetteStroke, stroke) && silhouetteWidth == width
      && silhouetteCap == cap && silhouetteJoin == join && silhouetteMiter == miter
      && silhouetteCorner == corner && Object.ReferenceEquals(silhouetteDash, dash)
      && Object.ReferenceEquals(silhouetteCornerEffect, cornerEffect)
      && Object.ReferenceEquals(silhouetteDashEffect, dashEffect)
      && Object.ReferenceEquals(silhouetteComposedEffect, composed) {
      if let retained = Silhouette { return retained }
    }

    var next SKPath? = nil
    try {
      if let finalFill = fill {
        if !finalFill.IsEmpty { next = SKPath(finalFill) }
      }
      if width > 0.0F {
        if let source = stroke {
          using let paint = SKPaint()
          paint.Style = SKPaintStyle.Stroke
          paint.StrokeWidth = width
          paint.StrokeCap = skCap(cap)
          paint.StrokeJoin = skJoin(join)
          paint.StrokeMiter = miter
          if dash != nil {
            if corner > 0.0F {
              paint.PathEffect = composedEffect(effects)
            } else {
              paint.PathEffect = dashPathEffect(effects)
            }
          } else if corner > 0.0F {
            paint.PathEffect = cornerEffectFor(effects)
          }
          guard let geometry = paint.GetFillPath(source) else {
            throw InvalidOperationException("ShapeGeometryValue.ShadowSilhouette: SKPaint.GetFillPath failed")
          }
          using let ownedGeometry = geometry
          if !ownedGeometry.IsEmpty {
            if let current = next {
              if let combined = current.Op(ownedGeometry, SKPathOp.Union) {
                current.Dispose()
                next = combined
              }
            } else {
              next = SKPath(ownedGeometry)
            }
          }
        }
      }
    } catch (error Exception) {
      next?.Dispose()
      throw error
    }

    let resolved = next ?? SKPath()
    let prior = Silhouette
    Silhouette = resolved
    silhouetteFill = fill
    silhouetteStroke = stroke
    silhouetteWidth = width
    silhouetteCap = cap
    silhouetteJoin = join
    silhouetteMiter = miter
    silhouetteCorner = corner
    silhouetteDash = dash
    silhouetteCornerEffect = cornerEffect
    silhouetteDashEffect = dashEffect
    silhouetteComposedEffect = composed
    hasSilhouetteKey = true
    prior?.Dispose()
    return resolved
  }

  internal func ClearSilhouette() {
    let prior = Silhouette
    Silhouette = nil
    silhouetteFill = nil
    silhouetteStroke = nil
    silhouetteDash = nil
    silhouetteCornerEffect = nil
    silhouetteDashEffect = nil
    silhouetteComposedEffect = nil
    hasSilhouetteKey = false
    prior?.Dispose()
  }

  internal func Trim(retainFill bool, retainStroke bool, retainSilhouette bool, radius float32) {
    if !retainFill {
      ClearFill()
    } else if radius <= 0.0F && RoundedFill != nil {
      ClearRoundedFill()
      ClearSilhouette()
    }
    if !retainStroke {
      ClearStroke()
    }
    if !retainSilhouette {
      ClearSilhouette()
    }
  }

  internal func Dispose() {
    ClearSilhouette()
    ClearFill()
    ClearStroke()
  }

  private func ClearFill() {
    ClearRoundedFill()
    ClearSilhouette()
    let prior = Fill
    Fill = nil
    hasFillKey = false
    prior?.Dispose()
  }

  private func ClearStroke() {
    ClearSilhouette()
    let prior = Stroke
    Stroke = nil
    hasStrokeKey = false
    prior?.Dispose()
  }

  private func ClearRoundedFill() {
    let prior = RoundedFill
    RoundedFill = nil
    roundedSource = nil
    roundedCorner = nil
    prior?.Dispose()
  }

  private func sameMatrix(scaleX float32, scaleY float32, transX float32, transY float32,
    matrix SKMatrix) bool {
    return scaleX == matrix.ScaleX && scaleY == matrix.ScaleY
      && transX == matrix.TransX && transY == matrix.TransY
  }

  private func activeDash(dashes DashPattern?) DashPattern? {
    guard let dash = dashes else { return nil }
    return dash.Intervals.Count > 0 ? dash : nil
  }

  private func cornerEffectFor(effects ShapePathEffectsValue?) SKPathEffect {
    guard let value = effects else {
      throw InvalidOperationException("ShapeGeometryValue: missing corner effect")
    }
    guard let corner = value.Corner else {
      throw InvalidOperationException("ShapeGeometryValue: missing corner effect")
    }
    return corner
  }

  private func dashPathEffect(effects ShapePathEffectsValue?) SKPathEffect {
    guard let value = effects else {
      throw InvalidOperationException("ShapeGeometryValue: missing dash effect")
    }
    guard let dash = value.Dash else {
      throw InvalidOperationException("ShapeGeometryValue: missing dash effect")
    }
    return dash
  }

  private func composedEffect(effects ShapePathEffectsValue?) SKPathEffect {
    guard let value = effects else {
      throw InvalidOperationException("ShapeGeometryValue: missing composed effect")
    }
    guard let composed = value.Composed else {
      throw InvalidOperationException("ShapeGeometryValue: missing composed effect")
    }
    return composed
  }

  private func skCap(cap StrokeCap) SKStrokeCap {
    return switch cap {
      case StrokeCap.Butt: SKStrokeCap.Butt
      case StrokeCap.Round: SKStrokeCap.Round
      case StrokeCap.Square: SKStrokeCap.Square
      default: throw NotSupportedException("ShapeGeometryValue: unhandled stroke cap")
    }
  }

  private func skJoin(join StrokeJoin) SKStrokeJoin {
    return switch join {
      case StrokeJoin.Miter: SKStrokeJoin.Miter
      case StrokeJoin.Round: SKStrokeJoin.Round
      case StrokeJoin.Bevel: SKStrokeJoin.Bevel
      default: throw NotSupportedException("ShapeGeometryValue: unhandled stroke join")
    }
  }

  deinit {
    Dispose()
  }
}

internal class ShapeShadowArtifacts {
  private var artifact SKPath?
  private var silhouette SKPath?
  private var inset bool
  private var spread float32
  private var offsetX float32
  private var offsetY float32
  private var blur float32
  private var rectX float32
  private var rectY float32
  private var rectWidth float32
  private var rectHeight float32
  private var hasKey bool

  internal func NegativeOuter(source SKPath, value float32) SKPath? {
    if hasKey && !inset && Object.ReferenceEquals(silhouette, source) && spread == value {
      return artifact
    }
    Clear()
    if value >= 0.0F { return nil }
    using let paint = SKPaint()
    paint.Style = SKPaintStyle.Stroke
    paint.StrokeWidth = -value * 2.0F
    guard let edge = paint.GetFillPath(source) else { return nil }
    using let ownedEdge = edge
    guard let next = source.Op(ownedEdge, SKPathOp.Difference) else { return nil }
    retain(next, source, false, value, 0.0F, 0.0F, 0.0F, SKRect{})
    return next
  }

  internal func InsetInverse(source SKPath, value float32, x float32, y float32, blurValue float32,
    rect SKRect) SKPath? {
    if hasKey && inset && Object.ReferenceEquals(silhouette, source) && spread == value
      && offsetX == x && offsetY == y && blur == blurValue && rectX == rect.Left && rectY == rect.Top
      && rectWidth == rect.Width && rectHeight == rect.Height {
      return artifact
    }
    Clear()
    guard let built = insetHole(source, value) else { return nil }
    using let hole = built
    let offset = SKMatrix.CreateTranslation(x, y)
    hole.Transform(in offset)
    let margin = blurValue * 2.0F + MathF.Abs(x) + MathF.Abs(y) + MathF.Abs(value) + 2.0F
    using let outsideBuilder = SKPathBuilder()
    outsideBuilder.AddRect(SKRect.Create(rect.Left - margin, rect.Top - margin,
      rect.Width + margin * 2.0F, rect.Height + margin * 2.0F), SKPathDirection.Clockwise)
    using let outside = outsideBuilder.Detach()!!
    guard let next = outside.Op(hole, SKPathOp.Difference) else { return nil }
    retain(next, source, true, value, x, y, blurValue, rect)
    return next
  }

  private func insetHole(source SKPath, value float32) SKPath? {
    if value > 0.0F {
      using let adjustment = SKPaint()
      adjustment.Style = SKPaintStyle.Stroke
      adjustment.StrokeWidth = value * 2.0F
      guard let edge = adjustment.GetFillPath(source) else { return nil }
      using let ownedEdge = edge
      return source.Op(ownedEdge, SKPathOp.Difference)
    }
    if value < 0.0F {
      using let adjustment = SKPaint()
      adjustment.Style = SKPaintStyle.StrokeAndFill
      adjustment.StrokeWidth = -value * 2.0F
      return adjustment.GetFillPath(source)
    }
    return SKPath(source)
  }

  internal func NativeWrapperCount() int32 {
    return artifact != nil ? 1 : 0
  }

  internal func Dispose() {
    Clear()
  }

  private func retain(next SKPath, source SKPath, isInset bool, value float32, x float32,
    y float32, blurValue float32, rect SKRect) {
    artifact = next
    silhouette = source
    inset = isInset
    spread = value
    offsetX = x
    offsetY = y
    blur = blurValue
    rectX = rect.Left
    rectY = rect.Top
    rectWidth = rect.Width
    rectHeight = rect.Height
    hasKey = true
  }

  private func Clear() {
    let prior = artifact
    artifact = nil
    silhouette = nil
    hasKey = false
    prior?.Dispose()
  }

  deinit {
    Dispose()
  }
}

// Yoga-attached padding when available, else declared Length with percentBasis for Percent.
internal func resolvedEdgePadding(n Node, edge YGEdge, percentBasis float32) float32 {
  let explicit = switch edge {
    case YGEdge.Left: n.PaddingLeft
    case YGEdge.Top: n.PaddingTop
    case YGEdge.Right: n.PaddingRight
    case YGEdge.Bottom: n.PaddingBottom
    default: Length{}
  }
  let value = explicit.Unit == LengthUnit.Unset ? n.Padding : explicit
  if value.Unit == LengthUnit.Px { return value.Value }
  if value.Unit == LengthUnit.Unset { return 0.0F }
  if let yoga = n.Yoga {
    return YGNodeLayoutAPI.YGNodeLayoutGetPadding(yoga, edge)
  }
  return switch value.Unit {
    case LengthUnit.Percent: percentBasis * value.Value / 100.0F
    default: 0.0F
  }
}
