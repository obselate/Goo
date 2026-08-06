package Goo

import System

internal data struct TransformPoint {
  internal var Valid bool
  internal var X float32
  internal var Y float32
}

internal data struct Affine2D {
  internal var A float32
  internal var B float32
  internal var C float32
  internal var D float32
  internal var TX float32
  internal var TY float32
}

internal data struct TransformBounds {
  internal var X float32
  internal var Y float32
  internal var W float32
  internal var H float32
}

internal class TransformGeometry {
  shared {
    internal func Matrix(n Node) Affine2D {
      guard let value = Transforming.Get(n) else {
        return Affine2D{ A: 1.0F, D: 1.0F }
      }
      // Fixed pipeline: scale, then skew, then rotation (translation applies last).
      let sx = value.Scale * value.ScaleX
      let sy = value.Scale * value.ScaleY
      let a = (value.Cos - value.Sin * value.TanY) * sx
      let b = (value.Cos * value.TanX - value.Sin) * sy
      let c = (value.Sin + value.Cos * value.TanY) * sx
      let d = (value.Sin * value.TanX + value.Cos) * sy
      let ox = n.Rect.X + resolve(value.OriginX, n.Rect.W)
      let oy = n.Rect.Y + resolve(value.OriginY, n.Rect.H)
      let tx = resolve(value.TranslateX, n.Rect.W)
      let ty = resolve(value.TranslateY, n.Rect.H)
      return Affine2D{
        A: a, B: b, C: c, D: d,
        TX: ox + tx - a * ox - b * oy,
        TY: oy + ty - c * ox - d * oy,
      }
    }

    internal func Unmap(n Node, x float32, y float32) TransformPoint {
      if !n.HasVisualTransform {
        return TransformPoint{ Valid: true, X: x, Y: y }
      }
      let m = Matrix(n)
      let determinant = m.A * m.D - m.B * m.C
      if !finite(determinant) || MathF.Abs(determinant) <= 0.000000000001F {
        return TransformPoint{}
      }
      let px = x - m.TX
      let py = y - m.TY
      let mappedX = (m.D * px - m.B * py) / determinant
      let mappedY = (-m.C * px + m.A * py) / determinant
      if !finite(mappedX) || !finite(mappedY) { return TransformPoint{} }
      return TransformPoint{ Valid: true, X: mappedX, Y: mappedY }
    }

    internal func Map(n Node, x float32, y float32) TransformPoint {
      if !n.HasVisualTransform {
        return TransformPoint{ Valid: true, X: x, Y: y }
      }
      let m = Matrix(n)
      let mappedX = m.A * x + m.B * y + m.TX
      let mappedY = m.C * x + m.D * y + m.TY
      if !finite(mappedX) || !finite(mappedY) { return TransformPoint{} }
      return TransformPoint{ Valid: true, X: mappedX, Y: mappedY }
    }

    internal func WindowToNode(n Node, x float32, y float32) TransformPoint {
      let point = if let parent = n.Parent { WindowToNode(parent, x, y) } else { TransformPoint{ Valid: true, X: x, Y: y } }
      if !point.Valid { return point }
      return Unmap(n, point.X, point.Y)
    }

    internal func NodeToWindow(n Node, x float32, y float32) TransformPoint {
      let point = Map(n, x, y)
      if !point.Valid { return point }
      return if let parent = n.Parent { nodePointToWindow(parent, point.X, point.Y) } else { point }
    }

    internal func BoundsToWindow(n Node) TransformBounds {
      return BoundsToWindow(n, n.Rect.X, n.Rect.Y, n.Rect.W, n.Rect.H)
    }

    internal func BoundsToWindow(n Node, x float32, y float32, width float32,
      height float32) TransformBounds {
      let p0 = NodeToWindow(n, x, y)
      let p1 = NodeToWindow(n, x + width, y)
      let p2 = NodeToWindow(n, x, y + height)
      let p3 = NodeToWindow(n, x + width, y + height)
      if !p0.Valid || !p1.Valid || !p2.Valid || !p3.Valid {
        return TransformBounds{ X: x, Y: y, W: width, H: height }
      }
      let left = min4(p0.X, p1.X, p2.X, p3.X)
      let top = min4(p0.Y, p1.Y, p2.Y, p3.Y)
      let right = max4(p0.X, p1.X, p2.X, p3.X)
      let bottom = max4(p0.Y, p1.Y, p2.Y, p3.Y)
      return TransformBounds{ X: left, Y: top, W: right - left, H: bottom - top }
    }

    private func nodePointToWindow(n Node, x float32, y float32) TransformPoint {
      let point = Map(n, x, y)
      if !point.Valid { return point }
      return if let parent = n.Parent { nodePointToWindow(parent, point.X, point.Y) } else { point }
    }

    private func finite(value float32) bool {
      return !Single.IsNaN(value) && !Single.IsInfinity(value)
    }

    private func resolve(value Length, basis float32) float32 {
      return value.Unit == LengthUnit.Percent ? basis * value.Value / 100.0F : value.Value
    }

    private func min4(a float32, b float32, c float32, d float32) float32 {
      var result = a < b ? a : b
      if c < result { result = c }
      if d < result { result = d }
      return result
    }

    private func max4(a float32, b float32, c float32, d float32) float32 {
      var result = a > b ? a : b
      if c > result { result = c }
      if d > result { result = d }
      return result
    }
  }
}
