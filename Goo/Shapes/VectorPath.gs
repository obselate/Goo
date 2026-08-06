package Goo

import System

internal enum VectorPathCommandKind {
  MoveTo; LineTo; QuadraticTo; CubicTo; ArcTo; Close
}

internal data struct VectorPathCommand {
  internal let Kind VectorPathCommandKind
  internal let X1 float64
  internal let Y1 float64
  internal let X2 float64
  internal let Y2 float64
  internal let X3 float64
  internal let Y3 float64
  internal let RadiusX float64
  internal let RadiusY float64
  internal let RotationDegrees float64
  internal let LargeArc bool
  internal let SweepClockwise bool
}

// Class because G# structs cannot override CLR virtuals; VectorPath's value
// equality and hash flow through this single reference field.
internal class VectorPathData {
  internal let Commands []VectorPathCommand
  internal let Hash uint64
  internal let HasClosedContour bool
  internal let ViewBoxX float64
  internal let ViewBoxY float64
  internal let StoredWidth float64
  internal let StoredHeight float64

  internal init(commands []VectorPathCommand, hash uint64, hasClosedContour bool,
    viewBoxX float64, viewBoxY float64, storedWidth float64, storedHeight float64) {
    Commands = commands
    Hash = hash
    HasClosedContour = hasClosedContour
    ViewBoxX = viewBoxX
    ViewBoxY = viewBoxY
    StoredWidth = storedWidth
    StoredHeight = storedHeight
  }

  public override func Equals(obj object?) bool {
    return switch obj {
      case other is VectorPathData: equalsData(other)
      case _: false
    }
  }

  public override func GetHashCode() int32 {
    return int32((Hash ^ (Hash >> 32)) & uint64(2147483647))
  }

  private func equalsData(other VectorPathData) bool {
    if Hash != other.Hash || Commands.Length != other.Commands.Length
      || ViewBoxX != other.ViewBoxX || ViewBoxY != other.ViewBoxY
      || StoredWidth != other.StoredWidth || StoredHeight != other.StoredHeight {
      return false
    }
    for i in 0 ... Commands.Length {
      if Commands[i] != other.Commands[i] {
        return false
      }
    }
    return true
  }
}

/// Represents an immutable vector path in a top-left coordinate system.
/// Coordinates increase rightward on x and downward on y.
public struct VectorPath {
  internal let payload VectorPathData?

  /// Gets the view-box left coordinate.
  public prop ViewBoxX float64 {
    get {
      guard let d = payload else { return 0.0 }
      return d.ViewBoxX
    }
  }
  /// Gets the view-box top coordinate.
  public prop ViewBoxY float64 {
    get {
      guard let d = payload else { return 0.0 }
      return d.ViewBoxY
    }
  }
  /// Gets the view-box width.
  public prop ViewBoxWidth float64 {
    get {
      guard let d = payload else { return 1.0 }
      return d.StoredWidth == 0.0 ? 1.0 : d.StoredWidth
    }
  }
  /// Gets the view-box height.
  public prop ViewBoxHeight float64 {
    get {
      guard let d = payload else { return 1.0 }
      return d.StoredHeight == 0.0 ? 1.0 : d.StoredHeight
    }
  }

  internal prop CommandCount int32 {
    get {
      guard let d = payload else { return 0 }
      return d.Commands.Length
    }
  }

  internal prop Hash uint64 {
    get {
      guard let d = payload else { return uint64(0) }
      return d.Hash
    }
  }

  internal prop HasClosedContour bool {
    get {
      guard let d = payload else { return false }
      return d.HasClosedContour
    }
  }

  internal func CommandAt(index int32) VectorPathCommand {
    guard let d = payload else {
      throw ArgumentOutOfRangeException("index")
    }
    if index < 0 || index >= d.Commands.Length {
      throw ArgumentOutOfRangeException("index")
    }
    return d.Commands[index]
  }

  shared {
    internal func Create(commands []VectorPathCommand,
      viewBoxX float64, viewBoxY float64, viewBoxWidth float64, viewBoxHeight float64) VectorPath {
      let storedWidth = viewBoxWidth == 1.0 ? 0.0 : viewBoxWidth
      let storedHeight = viewBoxHeight == 1.0 ? 0.0 : viewBoxHeight
      // Empty unit-view-box content collapses to the default Empty value.
      if commands.Length == 0 && viewBoxX == 0.0 && viewBoxY == 0.0
        && storedWidth == 0.0 && storedHeight == 0.0 {
        return VectorPath{}
      }
      var closed = false
      for i in 0 ... commands.Length {
        if commands[i].Kind == VectorPathCommandKind.Close {
          closed = true
        }
      }
      let hash = contentHash(commands, viewBoxX, viewBoxY, storedWidth, storedHeight)
      return VectorPath{
        payload: VectorPathData(commands, hash, closed, viewBoxX, viewBoxY, storedWidth, storedHeight),
      }
    }

    private func contentHash(commands []VectorPathCommand,
      viewBoxX float64, viewBoxY float64, storedWidth float64, storedHeight float64) uint64 {
      var h = uint64(1469598103934665603)
      h = hashDouble(h, viewBoxX)
      h = hashDouble(h, viewBoxY)
      h = hashDouble(h, storedWidth)
      h = hashDouble(h, storedHeight)
      for i in 0 ... commands.Length {
        let c = commands[i]
        h = mix(h, uint64(int32(c.Kind)))
        h = hashDouble(h, c.X1)
        h = hashDouble(h, c.Y1)
        h = hashDouble(h, c.X2)
        h = hashDouble(h, c.Y2)
        h = hashDouble(h, c.X3)
        h = hashDouble(h, c.Y3)
        h = hashDouble(h, c.RadiusX)
        h = hashDouble(h, c.RadiusY)
        h = hashDouble(h, c.RotationDegrees)
        h = mix(h, c.LargeArc ? uint64(1) : uint64(0))
        h = mix(h, c.SweepClockwise ? uint64(1) : uint64(0))
      }
      return h
    }

    private func hashDouble(h uint64, value float64) uint64 {
      let normalized = value == 0.0 ? 0.0 : value
      return mix(h, uint64(BitConverter.DoubleToInt64Bits(normalized)))
    }

    private func mix(h uint64, value uint64) uint64 {
      return (h ^ value) * uint64(1099511628211)
    }

    /// Gets an empty path with a unit view box.
    public prop Empty VectorPath {
      get { return VectorPath{} }
    }
  }
}
