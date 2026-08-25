package Goo

import Facebook.Yoga

internal class ShapeGeometry {
  shared {
    internal func HitTest(n Node, x float32, y float32) bool {
      let strokeWidth = n.BorderLeftWidth.Px
      let halfStroke = strokeWidth * 0.5F
      let strokeExtent = resolveShapeStrokeExtent(strokeWidth, n.ShapeStrokeJoin,
        float32(n.MiterLimit))
      let paddingLeft = resolveEdgePadding(n, YGEdge.Left, n.Rect.W)
      let paddingTop = resolveEdgePadding(n, YGEdge.Top, n.Rect.W)
      let paddingRight = resolveEdgePadding(n, YGEdge.Right, n.Rect.W)
      let paddingBottom = resolveEdgePadding(n, YGEdge.Bottom, n.Rect.W)
      let left = n.Rect.X + paddingLeft + halfStroke
      let top = n.Rect.Y + paddingTop + halfStroke
      let width = n.Rect.W - paddingLeft - paddingRight - strokeWidth
      let height = n.Rect.H - paddingTop - paddingBottom - strokeWidth
      if width <= 0.0F || height <= 0.0F
        || x < left - strokeExtent || y < top - strokeExtent
        || x >= left + width + strokeExtent || y >= top + height + strokeExtent{
          return !n.ShapePath.HasClosedContour && strokeWidth <= 0.0F
        }
      let mapping = PathGeometry.Map(n.ShapePath, n.ShapeFit, left, top, width, height)
      if !mapping.Valid || mapping.ScaleX == 0.0F || mapping.ScaleY == 0.0F {
        return !n.ShapePath.HasClosedContour && strokeWidth <= 0.0F
      }
      let strokeVisible = strokeWidth > 0.0F && n.BorderLeftColor.A > 0.0F
      let shapePath = PathRoundedCache.Shared.Resolve(n.ShapePath, mapping,
        n.ShapeCornerRadius)
      if shapePath.CommandCount == 0 {
        return !n.ShapePath.HasClosedContour && !strokeVisible
      }
      let localX = (x - mapping.TranslateX) / mapping.ScaleX
      let localY = (y - mapping.TranslateY) / mapping.ScaleY
      let fillHit = shapePath.HasClosedContour
        && PathGeometry.For(shapePath).Contains(localX, localY, n.ShapeFillRule)
      if !strokeVisible {
        return fillHit || !shapePath.HasClosedContour
      }
      let outline = PathStrokeCache.Shared.Resolve(shapePath, mapping, strokeWidth,
        n.ShapeStrokeCap, n.ShapeStrokeJoin, float32(n.MiterLimit), n.Dashes)
      let strokeHit = outline.CommandCount != 0
        && PathGeometry.For(outline).Contains(localX, localY, FillRule.NonZero)
      return fillHit || strokeHit
    }

    internal func Dispose(n Node) { }

    internal func ClearShadowArtifacts(n Node) { }
  }
}
