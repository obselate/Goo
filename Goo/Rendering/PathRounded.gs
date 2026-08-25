package Goo

import System
import System.Collections.Generic
import System.Runtime.CompilerServices

private data struct RoundedPoint(X float64, Y float64) { }

private sealed class PathRoundedEntry {
  internal let ScaleX float32
  internal let ScaleY float32
  internal let Radius float64
  internal let GeometryRevision uint64
  internal let Path VectorPath

  internal init(scaleX float32, scaleY float32, radius float64, geometryRevision uint64,
      path VectorPath) {
    ScaleX = scaleX
    ScaleY = scaleY
    Radius = radius
    GeometryRevision = geometryRevision
    Path = path
  }
}

private sealed class RoundedContourState {
  internal let Output List[VectorPathCommand]
  internal let ScaleX float32
  internal let ScaleY float32
  internal let Radius float64
  internal let MovePoint RoundedPoint
  internal let MoveMapped RoundedPoint
  internal var LastCorner RoundedPoint
  internal var LastCornerMapped RoundedPoint
  internal var FirstStep RoundedPoint
  internal var PreviousKind VectorPathCommandKind
  internal var PreviousIsValid bool

  internal init(output List[VectorPathCommand], scaleX float32, scaleY float32,
      radius float64, movePoint RoundedPoint, moveMapped RoundedPoint,
      previousIsValid bool) {
    Output = output
    ScaleX = scaleX
    ScaleY = scaleY
    Radius = radius
    MovePoint = movePoint
    MoveMapped = moveMapped
    LastCorner = movePoint
    LastCornerMapped = moveMapped
    FirstStep = RoundedPoint(0.0, 0.0)
    PreviousKind = VectorPathCommandKind.MoveTo
    PreviousIsValid = previousIsValid
  }
}

internal sealed class PathRoundedCache {
  private const MaximumEntriesPerSource int32 = 8
  private let entries ConditionalWeakTable[VectorPathData, List[PathRoundedEntry]]
  private let gate object

  shared {
    internal let Shared PathRoundedCache = PathRoundedCache()
  }

  internal init() {
    entries = ConditionalWeakTable[VectorPathData, List[PathRoundedEntry]]()
    gate = Object()
  }

  internal func Resolve(path VectorPath, mapping PathMapping, radius float64) VectorPath {
    if radius <= 0.0 {
      return path
    }
    guard let data = path.payload else { return VectorPath.Empty }
    if data.NormalizedOwner != nil { return path }
    if !mapping.Valid || !Finite64(mapping.ScaleX) || !Finite64(mapping.ScaleY)
        || mapping.ScaleX <= 0.0F || mapping.ScaleY <= 0.0F
        || !Finite64(radius) || radius > float64(Single.MaxValue) {
      return VectorPath.Empty
    }
    lock (gate) {
      if entries.TryGetValue(data, out var existing) {
        let found = Find(existing, mapping.ScaleX, mapping.ScaleY, radius, data.GeometryRevision)
        if let value = found {
          return value.Path
        }
      }
      let built = Build(path, data, mapping.ScaleX, mapping.ScaleY, radius)
      let entry = PathRoundedEntry(mapping.ScaleX, mapping.ScaleY, radius,
        data.GeometryRevision, built)
      if entries.TryGetValue(data, out var bucket) {
        if bucket.Count >= MaximumEntriesPerSource {
          bucket.RemoveAt(0)
        }
        bucket.Add(entry)
      } else {
        let created = List[PathRoundedEntry]()
        created.Add(entry)
        entries.Add(data, created)
      }
      return built
    }
  }

  private func Find(values List[PathRoundedEntry], scaleX float32, scaleY float32,
      radius float64, geometryRevision uint64) PathRoundedEntry? {
    var index int32 = 0
    while index < values.Count {
      let value = values[index]
      if value.ScaleX == scaleX && value.ScaleY == scaleY && value.Radius == radius
          && value.GeometryRevision == geometryRevision {
        return value
      }
      index++
    }
    return nil
  }

  private func Build(path VectorPath, data VectorPathData, scaleX float32,
      scaleY float32, radius float64) VectorPath {
    let source = data.Commands
    let output = List[VectorPathCommand]()
    var contourStart int32 = 0
    while contourStart < source.Length {
      if source[contourStart].Kind != VectorPathCommandKind.MoveTo {
        return VectorPath.Empty
      }
      var contourEnd = contourStart + 1
      while contourEnd < source.Length
          && source[contourEnd].Kind != VectorPathCommandKind.MoveTo {
        contourEnd++
      }
      let closeIndex = if contourEnd > contourStart + 1
          && source[contourEnd - 1].Kind == VectorPathCommandKind.Close {
        contourEnd - 1
      } else {
        -1
      }
      let contentEnd = if closeIndex >= 0 { closeIndex - 1 } else { contourEnd - 1 }
      if !BuildContour(source, contourStart, contentEnd, closeIndex >= 0,
          scaleX, scaleY, radius, output) {
        return VectorPath.Empty
      }
      contourStart = contourEnd
    }
    return VectorPath.Create(output.ToArray(), path.ViewBoxX, path.ViewBoxY,
      path.ViewBoxWidth, path.ViewBoxHeight)
  }

  private func BuildContour(source []VectorPathCommand, moveIndex int32,
      contentEnd int32, closed bool, scaleX float32, scaleY float32,
      radius float64, output List[VectorPathCommand]) bool {
    if contentEnd < moveIndex + 1 {
      output.Add(source[moveIndex])
      if closed {
        output.Add(VectorPathCommand{ Kind: VectorPathCommandKind.Close })
      }
      return true
    }
    let move = source[moveIndex]
    let movePoint = RoundedPoint(move.X1, move.Y1)
    let moveMapped = MapPoint(movePoint, scaleX, scaleY)
    guard let mappedMove = moveMapped else { return false }
    let state = RoundedContourState(output, scaleX, scaleY, radius, movePoint,
      mappedMove, !closed)
    if !closed {
      output.Add(move)
    }

    var index = moveIndex + 1
    while index <= contentEnd {
      let command = source[index]
      switch command.Kind {
        case VectorPathCommandKind.LineTo {
          let endpoint = RoundedPoint(command.X1, command.Y1)
          guard let mappedEndpoint = MapPoint(endpoint, scaleX, scaleY) else { return false }
          if !AppendLine(state, endpoint, mappedEndpoint) { return false }
        }
        case VectorPathCommandKind.QuadraticTo {
          let endpoint = RoundedPoint(command.X2, command.Y2)
          guard let mapped = MapPoint(endpoint, scaleX, scaleY) else { return false }
          if !state.PreviousIsValid {
            output.Add(source[moveIndex])
            state.PreviousIsValid = true
          }
          output.Add(command)
          state.LastCorner = endpoint
          state.LastCornerMapped = mapped
          state.FirstStep = RoundedPoint(0.0, 0.0)
          state.PreviousKind = VectorPathCommandKind.QuadraticTo
        }
        case VectorPathCommandKind.CubicTo {
          let endpoint = RoundedPoint(command.X3, command.Y3)
          guard let mapped = MapPoint(endpoint, scaleX, scaleY) else { return false }
          if !state.PreviousIsValid {
            output.Add(source[moveIndex])
            state.PreviousIsValid = true
          }
          output.Add(command)
          state.LastCorner = endpoint
          state.LastCornerMapped = mapped
          state.FirstStep = RoundedPoint(0.0, 0.0)
          state.PreviousKind = VectorPathCommandKind.CubicTo
        }
        case VectorPathCommandKind.ArcTo {
          let endpoint = RoundedPoint(command.X1, command.Y1)
          guard let mapped = MapPoint(endpoint, scaleX, scaleY) else { return false }
          let start = if state.PreviousKind == VectorPathCommandKind.MoveTo {
            state.MovePoint
          } else {
            state.LastCorner
          }
          if start.X == endpoint.X && start.Y == endpoint.Y {
            break
          }
          if command.RadiusX <= 0.0 || command.RadiusY <= 0.0 {
            if !AppendLine(state, endpoint, mapped) { return false }
          } else {
            if !state.PreviousIsValid {
              output.Add(source[moveIndex])
              state.PreviousIsValid = true
            }
            if !AppendArc(state, start, endpoint, command) {
              return false
            }
            state.LastCorner = endpoint
            state.LastCornerMapped = mapped
            state.FirstStep = RoundedPoint(0.0, 0.0)
            state.PreviousKind = VectorPathCommandKind.ArcTo
          }
        }
        case _ {
          return false
        }
      }
      index++
    }
    if closed {
      let needsSyntheticClose = state.LastCorner.X != state.MovePoint.X
        || state.LastCorner.Y != state.MovePoint.Y
      if needsSyntheticClose {
        if !AppendLine(state, state.MovePoint, state.MoveMapped) { return false }
      }
      if state.FirstStep.X != 0.0 || state.FirstStep.Y != 0.0 {
        guard let sourceStep = UnmapPoint(
            RoundedPoint(state.LastCornerMapped.X + state.FirstStep.X,
              state.LastCornerMapped.Y + state.FirstStep.Y), scaleX, scaleY) else {
          return false
        }
        guard let sourceLast = UnmapPoint(state.LastCornerMapped, scaleX, scaleY) else {
          return false
        }
        output.Add(VectorPathCommand{
          Kind: VectorPathCommandKind.QuadraticTo,
          X1: sourceLast.X,
          Y1: sourceLast.Y,
          X2: sourceStep.X,
          Y2: sourceStep.Y,
        })
      }
      output.Add(VectorPathCommand{ Kind: VectorPathCommandKind.Close })
    } else if state.PreviousIsValid {
      guard let sourceLast = UnmapPoint(state.LastCornerMapped, scaleX, scaleY) else {
        return false
      }
      output.Add(VectorPathCommand{
        Kind: VectorPathCommandKind.LineTo,
        X1: sourceLast.X,
        Y1: sourceLast.Y,
      })
    }
    return true
  }

  private func AppendLine(state RoundedContourState, endpoint RoundedPoint,
      mappedEndpoint RoundedPoint) bool {
    let start = if state.PreviousKind == VectorPathCommandKind.MoveTo {
      state.MovePoint
    } else {
      state.LastCorner
    }
    let startMapped = if state.PreviousKind == VectorPathCommandKind.MoveTo {
      state.MoveMapped
    } else {
      state.LastCornerMapped
    }
    let dx = mappedEndpoint.X - startMapped.X
    let dy = mappedEndpoint.Y - startMapped.Y
    let length = Math.Sqrt(dx * dx + dy * dy)
    if !Finite64(length) {
      return false
    }
    let step = if length <= state.Radius * 2.0 {
      RoundedPoint(dx * 0.5, dy * 0.5)
    } else if length > 0.0 {
      let factor = state.Radius / length
      RoundedPoint(dx * factor, dy * factor)
    } else {
      RoundedPoint(0.0, 0.0)
    }
    if !state.PreviousIsValid {
      guard let sourceMove = UnmapPoint(
          RoundedPoint(state.MoveMapped.X + step.X, state.MoveMapped.Y + step.Y),
          state.ScaleX, state.ScaleY) else { return false }
      state.Output.Add(VectorPathCommand{
        Kind: VectorPathCommandKind.MoveTo,
        X1: sourceMove.X,
        Y1: sourceMove.Y,
      })
      state.PreviousIsValid = true
    } else {
      guard let sourceStep = UnmapPoint(
          RoundedPoint(startMapped.X + step.X, startMapped.Y + step.Y),
          state.ScaleX, state.ScaleY) else { return false }
      state.Output.Add(VectorPathCommand{
        Kind: VectorPathCommandKind.QuadraticTo,
        X1: start.X,
        Y1: start.Y,
        X2: sourceStep.X,
        Y2: sourceStep.Y,
      })
    }
    if length > state.Radius * 2.0 {
      guard let sourceEnd = UnmapPoint(
          RoundedPoint(mappedEndpoint.X - step.X, mappedEndpoint.Y - step.Y),
          state.ScaleX, state.ScaleY) else { return false }
      state.Output.Add(VectorPathCommand{
        Kind: VectorPathCommandKind.LineTo,
        X1: sourceEnd.X,
        Y1: sourceEnd.Y,
      })
    }
    if state.PreviousKind == VectorPathCommandKind.MoveTo {
      state.FirstStep = step
    }
    state.LastCorner = endpoint
    state.LastCornerMapped = mappedEndpoint
    state.PreviousKind = VectorPathCommandKind.LineTo
    return true
  }

  private func AppendArc(state RoundedContourState, start RoundedPoint,
      endpoint RoundedPoint, command VectorPathCommand) bool {
    if !SourcePointSafe(start) || !SourcePointSafe(endpoint)
        || !SourcePointSafe(RoundedPoint(command.RadiusX, command.RadiusY))
        || !Finite64(command.RotationDegrees)
        || command.RotationDegrees > float64(Single.MaxValue)
        || command.RotationDegrees < -float64(Single.MaxValue) {
      return false
    }
    let commands = []VectorPathCommand{
      VectorPathCommand{
        Kind: VectorPathCommandKind.MoveTo,
        X1: start.X,
        Y1: start.Y,
      },
      command,
    }
    let temporary = VectorPath.Create(commands, 0.0, 0.0, 1.0, 1.0)
    let quadratics = PathGeometry.For(temporary).Quadratics
    if quadratics.Length == 0 {
      return false
    }
    for index in 0 ... quadratics.Length {
      let quadratic = quadratics[index]
      if !SourcePointSafe(RoundedPoint(quadratic.X0, quadratic.Y0))
          || !SourcePointSafe(RoundedPoint(quadratic.CX, quadratic.CY))
          || !SourcePointSafe(RoundedPoint(quadratic.X1, quadratic.Y1)) {
        return false
      }
      state.Output.Add(VectorPathCommand{
        Kind: VectorPathCommandKind.QuadraticTo,
        X1: float64(quadratic.CX),
        Y1: float64(quadratic.CY),
        X2: float64(quadratic.X1),
        Y2: float64(quadratic.Y1),
      })
    }
    return true
  }

  private func SourcePointSafe(value RoundedPoint) bool {
    return Finite64(value.X) && Finite64(value.Y)
      && value.X <= float64(Single.MaxValue) && value.X >= -float64(Single.MaxValue)
      && value.Y <= float64(Single.MaxValue) && value.Y >= -float64(Single.MaxValue)
  }

  private func MapPoint(value RoundedPoint, scaleX float32, scaleY float32) RoundedPoint? {
    let x = value.X * float64(scaleX)
    let y = value.Y * float64(scaleY)
    if !Finite64(x) || !Finite64(y)
        || x > float64(Single.MaxValue) || x < -float64(Single.MaxValue)
        || y > float64(Single.MaxValue) || y < -float64(Single.MaxValue) {
      return nil
    }
    return RoundedPoint(x, y)
  }

  private func UnmapPoint(value RoundedPoint, scaleX float32, scaleY float32) RoundedPoint? {
    let x = value.X / float64(scaleX)
    let y = value.Y / float64(scaleY)
    if !Finite64(x) || !Finite64(y)
        || x > float64(Single.MaxValue) || x < -float64(Single.MaxValue)
        || y > float64(Single.MaxValue) || y < -float64(Single.MaxValue) {
      return nil
    }
    return RoundedPoint(x, y)
  }

  private func Finite64(value float64) bool {
    return !Double.IsNaN(value) && !Double.IsInfinity(value)
  }
}
