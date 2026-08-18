package Goo

internal class ShapeGeometry {
  shared {
    internal func HitTest(n Node, x float32, y float32) bool {
      return x >= n.Rect.X && y >= n.Rect.Y
        && x <= n.Rect.X + n.Rect.W && y <= n.Rect.Y + n.Rect.H
    }

    internal func Dispose(n Node) { }

    internal func ClearShadowArtifacts(n Node) { }
  }
}
