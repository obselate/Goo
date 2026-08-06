package Goo

import System
import SkiaSharp

internal class VectorPathSkia {
  shared {
    internal func ToSkia(path VectorPath) SKPath {
      let result = SKPath()
      for i in 0 ... path.CommandCount {
        appendCommand(result, path.CommandAt(i))
      }
      return result
    }

    internal func ClosedContoursToSkia(path VectorPath) SKPath {
      let result = SKPath()
      var contour SKPath? = nil
      for i in 0 ... path.CommandCount {
        let command = path.CommandAt(i)
        if command.Kind == VectorPathCommandKind.MoveTo {
          if let previous = contour { previous.Dispose() }
          let next = SKPath()
          appendCommand(next, command)
          contour = next
        } else if command.Kind == VectorPathCommandKind.Close {
          if let closed = contour {
            closed.Close()
            result.AddPath(closed, SKPathAddMode.Append)
            closed.Dispose()
            contour = nil
          }
        } else if let current = contour {
          appendCommand(current, command)
        }
      }
      if let remaining = contour { remaining.Dispose() }
      return result
    }

    private func appendCommand(path SKPath, command VectorPathCommand) {
      switch command.Kind {
        case VectorPathCommandKind.MoveTo { path.MoveTo(float32(command.X1), float32(command.Y1)) }
        case VectorPathCommandKind.LineTo { path.LineTo(float32(command.X1), float32(command.Y1)) }
        case VectorPathCommandKind.QuadraticTo {
          path.QuadTo(float32(command.X1), float32(command.Y1), float32(command.X2), float32(command.Y2))
        }
        case VectorPathCommandKind.CubicTo {
          path.CubicTo(float32(command.X1), float32(command.Y1), float32(command.X2), float32(command.Y2),
            float32(command.X3), float32(command.Y3))
        }
        case VectorPathCommandKind.ArcTo {
          let size = command.LargeArc ? SKPathArcSize.Large : SKPathArcSize.Small
          let direction = command.SweepClockwise ? SKPathDirection.Clockwise : SKPathDirection.CounterClockwise
          path.ArcTo(float32(command.RadiusX), float32(command.RadiusY), float32(command.RotationDegrees),
            size, direction, float32(command.X1), float32(command.Y1))
        }
        case VectorPathCommandKind.Close { path.Close() }
        default { throw NotSupportedException("VectorPathSkia.appendCommand: unhandled path command") }
      }
    }
  }
}
