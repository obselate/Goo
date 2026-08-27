package Goo

internal class ClipPathGeometry {
  shared {
    internal func Contains(n Node, x float32, y float32) bool {
      if !n.HasClipPath { return true }
      guard let clip = ClipPaths.Get(n) else {
        return true
      }
      if x < n.Rect.X || y < n.Rect.Y
        || x >= n.Rect.X + n.Rect.W || y >= n.Rect.Y + n.Rect.H{
          return false
        }
      let mapping = PathGeometry.Map(clip.Path, clip.Fit,
        n.Rect.X, n.Rect.Y, n.Rect.W, n.Rect.H)
      if !mapping.Valid || mapping.ScaleX == 0.0F || mapping.ScaleY == 0.0F {
        return false
      }
      let localX = (x - mapping.TranslateX) / mapping.ScaleX
      let localY = (y - mapping.TranslateY) / mapping.ScaleY
      return PathGeometry.For(clip.Path).Contains(localX, localY, clip.FillRule)
    }

  }
}
