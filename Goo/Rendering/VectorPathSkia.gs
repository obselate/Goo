package Goo

import System
import SkiaSharp

internal class VectorPathSkia {
  shared {
    internal func ToSkia(path VectorPath) SKPath {
      using let builder = SKPathBuilder()
      for i in 0 ... path.CommandCount {
        appendCommand(builder, path.CommandAt(i))
      }
      return builder.Detach()!!
    }

    internal func ClosedContoursToSkia(path VectorPath) SKPath {
      using let builder = SKPathBuilder()
      var start = -1
      for i in 0 ... path.CommandCount {
        let kind = path.CommandAt(i).Kind
        if kind == VectorPathCommandKind.MoveTo {
          start = i
        } else if kind == VectorPathCommandKind.Close && start >= 0 {
          for j in start ... i {
            appendCommand(builder, path.CommandAt(j))
          }
          builder.Close()
          start = -1
        }
      }
      return builder.Detach()!!
    }

    private func appendCommand(builder SKPathBuilder, command VectorPathCommand) {
      switch command.Kind {
        case VectorPathCommandKind.MoveTo { builder.MoveTo(float32(command.X1), float32(command.Y1)) }
        case VectorPathCommandKind.LineTo { builder.LineTo(float32(command.X1), float32(command.Y1)) }
        case VectorPathCommandKind.QuadraticTo {
          builder.QuadTo(float32(command.X1), float32(command.Y1), float32(command.X2), float32(command.Y2))
        }
        case VectorPathCommandKind.CubicTo {
          builder.CubicTo(float32(command.X1), float32(command.Y1), float32(command.X2), float32(command.Y2),
            float32(command.X3), float32(command.Y3))
        }
        case VectorPathCommandKind.ArcTo {
          let size = command.LargeArc ? SKPathArcSize.Large : SKPathArcSize.Small
          let direction = command.SweepClockwise ? SKPathDirection.Clockwise : SKPathDirection.CounterClockwise
          builder.ArcTo(float32(command.RadiusX), float32(command.RadiusY), float32(command.RotationDegrees),
            size, direction, float32(command.X1), float32(command.Y1))
        }
        case VectorPathCommandKind.Close { builder.Close() }
        default { throw NotSupportedException("VectorPathSkia.appendCommand: unhandled path command") }
      }
    }
  }
}
