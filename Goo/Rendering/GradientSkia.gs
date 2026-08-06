package Goo

import System
import SkiaSharp

// Maps normalized gradient geometry onto a target rect as an SKShader.
internal class GradientSkia {
  shared {
    internal func ToShader(gradient Gradient, rect SKRect) SKShader {
      let count = gradient.Stops.Count
      let colors = [count]SKColor
      let positions = [count]float32
      for i in 0 ... count {
        colors[i] = SKColor(gradient.Stops[i].Color.ToSkia())
        positions[i] = float32(gradient.Stops[i].Offset)
      }
      return switch gradient {
        case linear is LinearGradient: linearShader(linear, rect, colors, positions)
        case radial is RadialGradient: radialShader(radial, rect, colors, positions)
        case _: throw NotSupportedException("GradientSkia.ToShader: unhandled gradient kind")
      }
    }

    // CSS gradient line: through the rect center with length |W sin| + |H cos|.
    private func linearShader(gradient LinearGradient, rect SKRect, colors []SKColor, positions []float32) SKShader {
      let radians = gradient.Angle * Math.PI / 180.0
      let dirX = float32(Math.Sin(radians))
      let dirY = float32(-Math.Cos(radians))
      let half = (Math.Abs(dirX * rect.Width) + Math.Abs(dirY * rect.Height)) * 0.5F
      let start = SKPoint(rect.MidX - dirX * half, rect.MidY - dirY * half)
      let end = SKPoint(rect.MidX + dirX * half, rect.MidY + dirY * half)
      guard let shader = SKShader.CreateLinearGradient(start, end, colors, positions, SKShaderTileMode.Clamp) else {
        throw NotSupportedException("GradientSkia.linearShader: SKShader.CreateLinearGradient failed")
      }
      return shader
    }

    private func radialShader(gradient RadialGradient, rect SKRect, colors []SKColor, positions []float32) SKShader {
      let center = SKPoint(rect.Left + float32(gradient.CenterX) * rect.Width,
        rect.Top + float32(gradient.CenterY) * rect.Height)
      let radius = float32(gradient.Radius) * Math.Max(rect.Width, rect.Height)
      guard let shader = SKShader.CreateRadialGradient(center, radius, colors, positions, SKShaderTileMode.Clamp) else {
        throw NotSupportedException("GradientSkia.radialShader: SKShader.CreateRadialGradient failed")
      }
      return shader
    }
  }
}
