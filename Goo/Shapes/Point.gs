package Goo

/// Represents an immutable two-dimensional point.
public data struct Point {
  private var x float64
  private var y float64

  /// Gets the x coordinate.
  public prop X float64{
    get -> x
    init -> x = value
  }

  /// Gets the y coordinate.
  public prop Y float64{
    get -> y
    init -> y = value
  }
}
