package Goo

import System
import System.Runtime.CompilerServices
import SkiaSharp

internal struct ClipPathMapping {
  internal let Valid bool
  internal let Matrix SKMatrix
}

internal class ClipPathGeometry {
  shared {
    private let values ConditionalWeakTable[Node, ClipPathGeometryValue] =
      ConditionalWeakTable[Node, ClipPathGeometryValue]()

    internal func Apply(n Node, canvas SKCanvas) {
      if !n.HasClipPath {
        return
      }
      guard let clip = ClipPaths.Get(n) else {
        Dispose(n)
        return
      }
      let rect = borderBox(n)
      canvas.ClipRect(rect, SKClipOperation.Intersect, true)
      canvas.ClipPath(path(n, clip), SKClipOperation.Intersect, true)
    }

    internal func Contains(n Node, x float32, y float32) bool {
      if !n.HasClipPath { return true }
      guard let clip = ClipPaths.Get(n) else {
        Dispose(n)
        return true
      }
      if !borderBox(n).Contains(x, y) {
        return false
      }
      return path(n, clip).Contains(x, y)
    }

    internal func HitTest(n Node, x float32, y float32) bool {
      return Contains(n, x, y)
    }

    internal func Dispose(n Node) {
      if values.TryGetValue(n, out var value) {
        values.Remove(n)
        value.Dispose()
      }
    }

    private func path(n Node, clip ClipPathValue) SKPath {
      let rect = borderBox(n)
      let cached = values.GetOrCreateValue(n)
      if cached.Matches(clip.Path, clip.Fit, rect) {
        if let path = cached.Path {
          return path
        }
      }
      cached.Replace(clip.Path, clip.Fit, rect, build(clip.Path, clip.Fit, rect))
      if let path = cached.Path {
        return path
      }
      throw InvalidOperationException("ClipPathGeometry.path: cache did not retain path")
    }

    private func build(source VectorPath, fit ShapeFit, rect SKRect) SKPath {
      let result = SKPath()
      let mapping = Map(source, fit, rect)
      if !mapping.Valid {
        return result
      }
      using let native = VectorPathSkia.ClosedContoursToSkia(source)
      native.FillType = SKPathFillType.Winding
      let matrix = mapping.Matrix
      native.Transform(in matrix)
      result.AddPath(native, SKPathAddMode.Append)
      result.FillType = SKPathFillType.Winding
      return result
    }

    internal func Map(path VectorPath, fit ShapeFit, rect SKRect) ClipPathMapping {
      let viewBoxWidth = float32(path.ViewBoxWidth)
      let viewBoxHeight = float32(path.ViewBoxHeight)
      if rect.Width <= 0.0F || rect.Height <= 0.0F || viewBoxWidth <= 0.0F || viewBoxHeight <= 0.0F {
        return ClipPathMapping{}
      }
      var scaleX = rect.Width / viewBoxWidth
      var scaleY = rect.Height / viewBoxHeight
      if fit == ShapeFit.Contain || fit == ShapeFit.Cover {
        let scale = if fit == ShapeFit.Contain {
          scaleX < scaleY ? scaleX : scaleY
        } else {
          scaleX > scaleY ? scaleX : scaleY
        }
        scaleX = scale
        scaleY = scale
      } else if fit == ShapeFit.None {
        scaleX = 1.0F
        scaleY = 1.0F
      }
      let tx = rect.Left + (rect.Width - viewBoxWidth * scaleX) * 0.5F - float32(path.ViewBoxX) * scaleX
      let ty = rect.Top + (rect.Height - viewBoxHeight * scaleY) * 0.5F - float32(path.ViewBoxY) * scaleY
      return ClipPathMapping{
        Valid: true,
        Matrix: SKMatrix.CreateScaleTranslation(scaleX, scaleY, tx, ty),
      }
    }

    private func borderBox(n Node) SKRect {
      return SKRect.Create(n.Rect.X, n.Rect.Y, n.Rect.W, n.Rect.H)
    }
  }
}

internal class ClipPathGeometryValue {
  internal var Source VectorPath
  internal var Fit ShapeFit
  internal var Rect SKRect
  internal var Path SKPath?

  internal func Matches(source VectorPath, fit ShapeFit, rect SKRect) bool {
    return Object.ReferenceEquals(Source.payload, source.payload) && Fit == fit
      && Rect.Left == rect.Left && Rect.Top == rect.Top
      && Rect.Width == rect.Width && Rect.Height == rect.Height
  }

  internal func Replace(source VectorPath, fit ShapeFit, rect SKRect, path SKPath) {
    Path?.Dispose()
    Source = source
    Fit = fit
    Rect = rect
    Path = path
  }

  internal func Dispose() {
    Path?.Dispose()
    Path = nil
  }

  deinit {
    Dispose()
  }
}
