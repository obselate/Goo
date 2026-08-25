package Goo

import System

/// Selects how path geometry maps into the padded layout bounds.
/// Contain is the centered aspect-preserving default.
public enum ShapeFit { Contain; Cover; Fill; None }

/// Selects the rule for filling overlapping path regions.
public enum FillRule { NonZero; EvenOdd }

/// Selects the cap style for stroked paths.
public enum StrokeCap { Butt; Round; Square }

/// Selects the join style for stroked paths.
public enum StrokeJoin { Miter; Round; Bevel }

/// Displays a vector path with fill and one uniform stroke. Side-specific border declarations apply to boxes only.
public class Shape : Blob {
  private var miterLimit float64
  private var cornerRadius float64

  internal override func coreBlob() {
  }

  /// Gets or sets the vector path to display.
  public prop Path VectorPath{ get; init; }
  /// Gets or sets the geometry fit. Cover clips, Fill stretches, and None preserves view-box units.
  public prop Fit ShapeFit{ get; init; }
  /// Gets or sets the fill rule. The default is NonZero.
  public prop FillRule FillRule{ get; init; }
  /// Gets or sets the stroke cap style. The default is Butt.
  public prop StrokeCap StrokeCap{ get; init; }
  /// Gets or sets the stroke join style. The default is Miter.
  public prop StrokeJoin StrokeJoin{ get; init; }
  /// Gets or sets the non-negative finite miter limit. The default is 4.
  public prop MiterLimit float64{
    get { return miterLimit }
    init{
      if !motionFiniteFloat32(value) || value < 0.0 {
        throw ArgumentOutOfRangeException("MiterLimit")
      }
      miterLimit = value
    }
  }
  /// Gets or sets the non-negative finite corner radius in logical pixels.
  public prop CornerRadius float64{
    get { return cornerRadius }
    init{
      if !motionFiniteFloat32(value) || value < 0.0 {
        throw ArgumentOutOfRangeException("CornerRadius")
      }
      cornerRadius = value
    }
  }
  /// Gets or sets the stroke dash pattern.
  public prop Dashes DashPattern? { get; init; }

  /// Creates a shape with default paint options.
  public init() {
    Path = VectorPath.Empty
    Fit = ShapeFit.Contain
    FillRule = FillRule.NonZero
    StrokeCap = StrokeCap.Butt
    StrokeJoin = StrokeJoin.Miter
    miterLimit = 4.0
  }
}
