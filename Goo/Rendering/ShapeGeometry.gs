package Goo

import Facebook.Yoga

internal class ShapeGeometry {
  shared {
    internal func HitTest(n Node, x float32, y float32) bool {
      if !n.ShapePath.HasClosedContour { return true }
      let strokeWidth = n.BorderLeftWidth.Px
      let halfStroke = strokeWidth * 0.5F
      let paddingLeft = resolveEdgePadding(n, YGEdge.Left, n.Rect.W)
      let paddingTop = resolveEdgePadding(n, YGEdge.Top, n.Rect.W)
      let paddingRight = resolveEdgePadding(n, YGEdge.Right, n.Rect.W)
      let paddingBottom = resolveEdgePadding(n, YGEdge.Bottom, n.Rect.W)
      let left = n.Rect.X + paddingLeft + halfStroke
      let top = n.Rect.Y + paddingTop + halfStroke
      let width = n.Rect.W - paddingLeft - paddingRight - strokeWidth
      let height = n.Rect.H - paddingTop - paddingBottom - strokeWidth
      if width <= 0.0F || height <= 0.0F
        || x < left - halfStroke || y < top - halfStroke
        || x >= left + width + halfStroke || y >= top + height + halfStroke {
        return false
      }
      let mapping = PathGeometry.Map(n.ShapePath, n.ShapeFit, left, top, width, height)
      if !mapping.Valid || mapping.ScaleX == 0.0F || mapping.ScaleY == 0.0F {
        return false
      }
      let localX = (x - mapping.TranslateX) / mapping.ScaleX
      let localY = (y - mapping.TranslateY) / mapping.ScaleY
      return PathGeometry.For(n.ShapePath).Contains(localX, localY, n.ShapeFillRule)
    }

    internal func Dispose(n Node) { }

    internal func ClearShadowArtifacts(n Node) { }
  }
}
