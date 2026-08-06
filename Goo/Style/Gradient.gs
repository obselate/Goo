package Goo

import System
import System.Collections.Generic
import System.Collections.ObjectModel

/// Specifies one immutable gradient color stop.
public data struct GradientStop {
  private var offset float64
  private var color Color

  /// Gets the stop position from 0 through 1.
  public prop Offset float64 {
    get { return offset }
    init {
      if Double.IsNaN(value) || Double.IsInfinity(value) || value < 0.0 || value > 1.0 {
        throw ArgumentOutOfRangeException("Offset")
      }
      offset = value
    }
  }

  /// Gets the stop color.
  public prop Color Color {
    get { return color }
    init { color = value }
  }
}

/// Paints a background with interpolated color stops.
public sealed interface Gradient {
  /// Gets the ordered color stops.
  prop Stops IReadOnlyList[GradientStop] { get; }
}

/// Paints a straight-line gradient at an angle.
public class LinearGradient : Gradient {
  private let stops IReadOnlyList[GradientStop]
  private let angle float64

  /// Gets the ordered color stops.
  public prop Stops IReadOnlyList[GradientStop] { get { return stops } }
  /// Gets the direction in degrees. Zero points up and positive angles turn clockwise.
  public prop Angle float64 { get { return angle } }

  /// Creates a top-to-bottom linear gradient from evenly spread colors.
  /// @param colors At least two colors, spread evenly from 0 through 1.
  public init(colors ...Color) {
    angle = 180.0
    stops = spreadGradientColors(colors)
  }

  /// Creates an angled linear gradient from evenly spread colors.
  /// @param angle The finite direction in degrees. Zero points up and positive angles turn clockwise.
  /// @param colors At least two colors, spread evenly from 0 through 1.
  public init(angle float64, colors ...Color) {
    this.angle = validateGradientAngle(angle)
    stops = spreadGradientColors(colors)
  }

  /// Creates an angled linear gradient from explicit stops.
  /// @param angle The finite direction in degrees. Zero points up and positive angles turn clockwise.
  /// @param stops At least two stops with non-decreasing offsets.
  public init(angle float64, stops []GradientStop) {
    this.angle = validateGradientAngle(angle)
    this.stops = validateGradientStops(stops)
  }
}

/// Paints a circular gradient from a normalized center.
public class RadialGradient : Gradient {
  private let stops IReadOnlyList[GradientStop]
  private let centerX float64
  private let centerY float64
  private let radius float64

  /// Gets the ordered color stops.
  public prop Stops IReadOnlyList[GradientStop] { get { return stops } }
  /// Gets the normalized horizontal center from 0 through 1.
  public prop CenterX float64 { get { return centerX } }
  /// Gets the normalized vertical center from 0 through 1.
  public prop CenterY float64 { get { return centerY } }
  /// Gets the normalized radius above 0 and at most 1.
  public prop Radius float64 { get { return radius } }

  /// Creates a centered radial gradient from evenly spread colors.
  /// @param colors At least two colors, spread evenly from 0 through 1.
  public init(colors ...Color) {
    centerX = 0.5
    centerY = 0.5
    radius = 0.5
    stops = spreadGradientColors(colors)
  }

  /// Creates a radial gradient from explicit geometry and stops.
  /// @param centerX The normalized horizontal center from 0 through 1.
  /// @param centerY The normalized vertical center from 0 through 1.
  /// @param radius The normalized radius above 0 and at most 1.
  /// @param stops At least two stops with non-decreasing offsets.
  public init(centerX float64, centerY float64, radius float64, stops []GradientStop) {
    this.centerX = validateGradientCenter(centerX, "centerX")
    this.centerY = validateGradientCenter(centerY, "centerY")
    this.radius = validateGradientRadius(radius)
    this.stops = validateGradientStops(stops)
  }
}

internal func spreadGradientColors(colors []Color) IReadOnlyList[GradientStop] {
  if colors.Length < 2 {
    throw ArgumentException("colors must contain at least two colors", "colors")
  }
  let list = List[GradientStop]()
  for i in 0 ... colors.Length {
    list.Add(GradientStop{ Offset: float64(i) / float64(colors.Length - 1), Color: colors[i] })
  }
  return ReadOnlyCollection[GradientStop](list)
}

internal func validateGradientStops(stops []GradientStop) IReadOnlyList[GradientStop] {
  if stops.Length < 2 {
    throw ArgumentException("stops must contain at least two stops", "stops")
  }
  let list = List[GradientStop]()
  for i in 0 ... stops.Length {
    if i > 0 && stops[i].Offset < stops[i - 1].Offset {
      throw ArgumentException("stops must have non-decreasing offsets", "stops")
    }
    list.Add(stops[i])
  }
  return ReadOnlyCollection[GradientStop](list)
}

internal func validateGradientAngle(value float64) float64 {
  if Double.IsNaN(value) || Double.IsInfinity(value) || Single.IsInfinity(float32(value)) {
    throw ArgumentOutOfRangeException("angle")
  }
  return value
}

internal func validateGradientCenter(value float64, name string) float64 {
  if Double.IsNaN(value) || Double.IsInfinity(value) || value < 0.0 || value > 1.0 {
    throw ArgumentOutOfRangeException(name)
  }
  return value
}

internal func validateGradientRadius(value float64) float64 {
  if Double.IsNaN(value) || Double.IsInfinity(value) || value <= 0.0 || value > 1.0 {
    throw ArgumentOutOfRangeException("radius")
  }
  return value
}
