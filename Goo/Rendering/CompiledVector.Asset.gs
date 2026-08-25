package Goo

import System
import System.Collections.Generic

internal sealed class CompiledVectorLinearGradient : Gradient {
  private let stops IReadOnlyList[GradientStop]
  private let x0 float64
  private let y0 float64
  private let x1 float64
  private let y1 float64
  private let contentHash int32

  public prop Stops IReadOnlyList[GradientStop] { get { return stops } }
  internal prop X0 float64 { get { return x0 } }
  internal prop Y0 float64 { get { return y0 } }
  internal prop X1 float64 { get { return x1 } }
  internal prop Y1 float64 { get { return y1 } }
  internal prop ContentHashForCache int32 { get { return contentHash } }

  internal init(x0 float64, y0 float64, x1 float64, y1 float64,
    stops []GradientStop) {
    this.x0 = x0
    this.y0 = y0
    this.x1 = x1
    this.y1 = y1
    this.stops = validateGradientStops(stops)
    contentHash = computeGradientContentHash4(3, x0, y0, x1, y1, this.stops)
  }
}

internal sealed class CompiledVectorRadialGradient : Gradient {
  private let stops IReadOnlyList[GradientStop]
  private let centerX float64
  private let centerY float64
  private let radiusX float64
  private let radiusY float64
  private let contentHash int32

  public prop Stops IReadOnlyList[GradientStop] { get { return stops } }
  internal prop CenterX float64 { get { return centerX } }
  internal prop CenterY float64 { get { return centerY } }
  internal prop RadiusX float64 { get { return radiusX } }
  internal prop RadiusY float64 { get { return radiusY } }
  internal prop ContentHashForCache int32 { get { return contentHash } }

  internal init(centerX float64, centerY float64, radiusX float64,
    radiusY float64, stops []GradientStop) {
    this.centerX = centerX
    this.centerY = centerY
    this.radiusX = radiusX
    this.radiusY = radiusY
    this.stops = validateGradientStops(stops)
    contentHash = computeGradientContentHash4(4, centerX, centerY, radiusX, radiusY, this.stops)
  }
}

public sealed class CompiledVectorAsset {
  private const MaxRenderDepth int32 = 1024
  private let value CompiledVector
  private let cachedPaths []VectorPath
  private let cachedPathReady []bool
  private let cachedClipPaths []VectorPath
  private let cachedClipPathReady []bool
  private let cachedGradients []Gradient?
  private let cachedGradientReady []bool
  private let cachedDashes []DashPattern?
  private let cachedDashReady []bool
  private let cachedPathLock object

  public init(bytes []uint8) {
    value = CompiledVector.Load(bytes)
    cachedPaths = [value.NodeCount]VectorPath
    cachedPathReady = [value.NodeCount]bool
    cachedClipPaths = [value.ClipCount]VectorPath
    cachedClipPathReady = [value.ClipCount]bool
    cachedGradients = [value.PaintCount]Gradient?
    cachedGradientReady = [value.PaintCount]bool
    cachedDashes = [value.StrokeCount]DashPattern?
    cachedDashReady = [value.StrokeCount]bool
    cachedPathLock = Object()
  }

  shared {
    public func Load(bytes []uint8) CompiledVectorAsset {
      return CompiledVectorAsset(bytes)
    }

    public func TryLoad(bytes []uint8) CompiledVectorAsset? {
      guard let parsed = CompiledVector.TryLoad(bytes) else { return nil }
      return CompiledVectorAsset(parsed)
    }
  }

  private init(parsed CompiledVector) {
    value = parsed
    cachedPaths = [value.NodeCount]VectorPath
    cachedPathReady = [value.NodeCount]bool
    cachedClipPaths = [value.ClipCount]VectorPath
    cachedClipPathReady = [value.ClipCount]bool
    cachedGradients = [value.PaintCount]Gradient?
    cachedGradientReady = [value.PaintCount]bool
    cachedDashes = [value.StrokeCount]DashPattern?
    cachedDashReady = [value.StrokeCount]bool
    cachedPathLock = Object()
  }

  public prop Version uint16 { get { return value.Version } }
  public prop Flags uint32 { get { return value.Flags } }
  public prop ByteCount int32 { get { return value.ByteCount } }
  public prop ViewBoxX float32 { get { return value.ViewBoxX } }
  public prop ViewBoxY float32 { get { return value.ViewBoxY } }
  public prop ViewBoxWidth float32 { get { return value.ViewBoxWidth } }
  public prop ViewBoxHeight float32 { get { return value.ViewBoxHeight } }
  public prop NodeCount int32 { get { return value.NodeCount } }
  public prop ContourCount int32 { get { return value.ContourCount } }
  public prop CurveCount int32 { get { return value.CurveCount } }
  public prop MorphCurveCount int32 { get { return value.MorphCurveCount } }
  public prop PaintCount int32 { get { return value.PaintCount } }
  public prop StrokeCount int32 { get { return value.StrokeCount } }
  public prop ClipCount int32 { get { return value.ClipCount } }
  public prop TrackCount int32 { get { return value.TrackCount } }
  public prop KeyframeCount int32 { get { return value.KeyframeCount } }

  public func PathForNode(index int32) VectorPath {
    return CachedPathForNode(index)
  }

  internal func PlayerNodeAt(index int32) CompiledVectorNodeView {
    return value.NodeAt(index)
  }

  internal func PlayerPaintAt(index int32) CompiledVectorPaintView {
    return value.PaintAt(index)
  }

  internal func PlayerStrokeAt(index int32) CompiledVectorStrokeView {
    return value.StrokeAt(index)
  }

  internal func PlayerTrackAt(index int32) CompiledVectorTrackView {
    return value.TrackAt(index)
  }

  internal func PlayerMorphKeyframeAt(index int32) CompiledVectorMorphKeyframeView {
    return value.MorphKeyframeAt(index)
  }

  internal func PlayerMorphCurveAt(index int32) CompiledVectorMorphCurveView {
    return value.MorphCurveAt(index)
  }

  internal func PlayerPathForNode(index int32) VectorPath {
    return CachedPathForNode(index)
  }

  internal func PlayerMutablePathForNode(index int32) VectorPath {
    return value.MutablePathForNode(index)
  }

  internal prop HasPlaybackTracks bool {
    get {
      return value.TrackCount != 0
    }
  }

  internal func PlayerKeyframeAt(index int32) CompiledVectorKeyframeView {
    return value.KeyframeAt(index)
  }

  internal func PlayerDashValueAt(index int32) float32 {
    return value.DashValueAt(index)
  }

  public func Render(key string?) Blob {
    return Cell.Mount[CompiledVectorAsset, CompiledVectorDisplayCell](key, this)
  }

  public func Render() Blob {
    return Render(nil)
  }

  internal func BuildStaticTree() Container {
    let width = float64(value.ViewBoxWidth)
    let height = float64(value.ViewBoxHeight)
    let result = Container{
      Width: width,
      Height: height,
      Position: PositionType.Relative,
    }
    var index int32 = 0
    while index < value.NodeCount {
      let node = value.NodeAt(index)
      if !node.HasParent {
        result.Children.Add(BuildNode(index, 1.0F, 0))
      }
      index++
    }
    return result
  }

  internal func CachedPathForNode(index int32) VectorPath {
    if index < 0 || index >= cachedPaths.Length {
      throw ArgumentOutOfRangeException("index")
    }
    if cachedPathReady[index] {
      return cachedPaths[index]
    }
    lock cachedPathLock {
      if cachedPathReady[index] {
        return cachedPaths[index]
      }
      let path = value.PathForNode(index)
      cachedPaths[index] = path
      cachedPathReady[index] = true
      return path
    }
  }

  private func BuildNode(index int32, inheritedOpacity float32, depth int32) Container {
    if depth >= MaxRenderDepth {
      throw InvalidOperationException("Compiled vector render depth exceeded")
    }
    let node = value.NodeAt(index)
    let opacity = inheritedOpacity * node.Opacity
    let width = float64(value.ViewBoxWidth)
    let height = float64(value.ViewBoxHeight)
    let result = Container{
      Key: "node-" + index.ToString(),
      Width: width,
      Height: height,
      Position: PositionType.Absolute,
      Left: 0.0,
      Top: 0.0,
      TransformOriginX: Length.Percent(0.0),
      TransformOriginY: Length.Percent(0.0),
      Transform: NodeTransform(node),
      Opacity: float64(node.Opacity),
    }
    let content = if node.HasClip {
      Container{
        Width: width,
        Height: height,
        Position: PositionType.Absolute,
        Left: 0.0,
        Top: 0.0,
      }
    } else {
      result
    }
    if value.TrackCount != 0 || opacity > 0.0F {
      AddFill(content, index, node, width, height)
      AddStroke(content, index, node, width, height)
      var childIndex = node.FirstChildIndex
      var childEnd = childIndex + node.ChildCount
      while childIndex < childEnd {
        content.Children.Add(BuildNode(int32(childIndex), opacity, depth + 1))
        childIndex++
      }
    }
    if node.HasClip {
      result.Children.Add(WrapClip(int32(node.ClipIndex), content, width, height, 0))
    }
    return result
  }

  private func AddFill(result Container, index int32,
    node CompiledVectorNodeView, width float64, height float64) {
    if !node.HasPaint || node.ContourCount == 0u {
      return
    }
    let paint = value.PaintAt(int32(node.PaintIndex))
    if paint.Opacity <= 0.0F {
      return
    }
    let fillOpacity = clampOpacity(paint.Opacity)
    if fillOpacity <= 0.0F {
      return
    }
    let fillRule = (node.Flags & CompiledVectorLimits.NodeEvenOdd) != 0u
      ? FillRule.EvenOdd : FillRule.NonZero
    if paint.Kind == CompiledVectorPaintKind.Solid {
      result.Children.Add(Shape{
        Key: "fill-" + index.ToString(),
        Path: CachedPathForNode(index),
        Fit: ShapeFit.Fill,
        FillRule: fillRule,
        Width: width,
        Height: height,
        Position: PositionType.Absolute,
        Left: 0.0,
        Top: 0.0,
        BackgroundColor: paint.Color,
        Opacity: float64(fillOpacity),
      })
      return
    }
    guard let gradient = CachedGradientForPaint(int32(node.PaintIndex), paint) else { return }
    result.Children.Add(Shape{
      Key: "fill-" + index.ToString(),
      Path: CachedPathForNode(index),
      Fit: ShapeFit.Fill,
      FillRule: fillRule,
      Width: width,
      Height: height,
      Position: PositionType.Absolute,
      Left: 0.0,
      Top: 0.0,
      BackgroundGradient: gradient,
      Opacity: float64(fillOpacity),
    })
  }

  private func AddStroke(result Container, index int32,
    node CompiledVectorNodeView, width float64, height float64) {
    if !node.HasStroke || node.ContourCount == 0u {
      return
    }
    let strokeIndex = int32(node.StrokeIndex)
    let stroke = value.StrokeAt(strokeIndex)
    if !stroke.HasPaint || (stroke.Width <= 0.0F && !stroke.HasTrack) {
      return
    }
    let paint = value.PaintAt(int32(stroke.PaintIndex))
    if paint.Kind != CompiledVectorPaintKind.Solid || paint.Opacity <= 0.0F {
      return
    }
    let strokeOpacity = clampOpacity(paint.Opacity)
    if strokeOpacity <= 0.0F {
      return
    }
    let cap = StrokeCap(stroke.Cap)
    let join = StrokeJoin(stroke.Join)
    result.Children.Add(Shape{
      Key: "stroke-" + index.ToString(),
      Path: CachedPathForNode(index),
      Fit: ShapeFit.Fill,
      FillRule: FillRule.NonZero,
      StrokeCap: cap,
      StrokeJoin: join,
      MiterLimit: float64(stroke.MiterLimit),
      Dashes: CachedDashPattern(strokeIndex, stroke),
      BorderWidth: float64(stroke.Width),
      BorderColor: paint.Color,
      Width: width,
      Height: height,
      Position: PositionType.Absolute,
      Left: 0.0,
      Top: 0.0,
      BackgroundColor: Color.Transparent,
      Opacity: float64(strokeOpacity),
    })
  }

  private func CachedGradientForPaint(index int32, paint CompiledVectorPaintView) Gradient? {
    if index < 0 || index >= cachedGradients.Length {
      throw ArgumentOutOfRangeException("index")
    }
    if cachedGradientReady[index] {
      return cachedGradients[index]
    }
    lock cachedPathLock {
      if cachedGradientReady[index] {
        return cachedGradients[index]
      }
      let stops = [int32(paint.StopCount)]GradientStop
      var stopIndex int32 = 0
      while stopIndex < stops.Length {
        let stop = value.PaintStopAt(int32(paint.StopStart) + stopIndex)
        stops[stopIndex] = GradientStop{
          Offset: float64(stop.Offset),
          Color: stop.Color,
        }
        stopIndex++
      }
      let viewBoxX = float64(value.ViewBoxX)
      let viewBoxY = float64(value.ViewBoxY)
      let viewBoxWidth = float64(value.ViewBoxWidth)
      let viewBoxHeight = float64(value.ViewBoxHeight)
      let x0 = (float64(paint.X0) - viewBoxX) / viewBoxWidth
      let y0 = (float64(paint.Y0) - viewBoxY) / viewBoxHeight
      let x1 = (float64(paint.X1) - viewBoxX) / viewBoxWidth
      let y1 = (float64(paint.Y1) - viewBoxY) / viewBoxHeight
      let gradient = if paint.Kind == CompiledVectorPaintKind.LinearGradient {
        CompiledVectorLinearGradient(x0, y0, x1, y1, stops)
      } else {
        CompiledVectorRadialGradient(x0, y0, Math.Abs(x1 - x0), Math.Abs(y1 - y0), stops)
      }
      cachedGradients[index] = gradient
      cachedGradientReady[index] = true
      return gradient
    }
  }

  private func CachedDashPattern(index int32, stroke CompiledVectorStrokeView) DashPattern? {
    if !stroke.HasDashes {
      return nil
    }
    if index < 0 || index >= cachedDashes.Length {
      throw ArgumentOutOfRangeException("index")
    }
    if cachedDashReady[index] {
      return cachedDashes[index]
    }
    lock cachedPathLock {
      if cachedDashReady[index] {
        return cachedDashes[index]
      }
      let intervals = [int32(stroke.DashCount)]float64
      var dashIndex int32 = 0
      while dashIndex < intervals.Length {
        intervals[dashIndex] = float64(value.DashValueAt(int32(stroke.DashStart) + dashIndex))
        dashIndex++
      }
      let pattern = DashPattern(intervals, float64(stroke.DashOffset))
      cachedDashes[index] = pattern
      cachedDashReady[index] = true
      return pattern
    }
  }

  private func CachedClipPath(index int32) VectorPath {
    if index < 0 || index >= cachedClipPaths.Length {
      throw ArgumentOutOfRangeException("index")
    }
    if cachedClipPathReady[index] {
      return cachedClipPaths[index]
    }
    lock cachedPathLock {
      if cachedClipPathReady[index] {
        return cachedClipPaths[index]
      }
      let clip = value.ClipAt(index)
      let path = value.PathForContours(int32(clip.ContourStart), int32(clip.ContourCount))
      cachedClipPaths[index] = path
      cachedClipPathReady[index] = true
      return path
    }
  }

  private func WrapClip(index int32, content Container, width float64,
    height float64, depth int32) Container {
    if depth >= MaxRenderDepth {
      throw InvalidOperationException("Compiled vector clip depth exceeded")
    }
    let clip = value.ClipAt(index)
    let inner = if clip.HasParentClip {
      WrapClip(int32(clip.ParentClipIndex), content, width, height, depth + 1)
    } else {
      content
    }
    let result = Container{
      Width: width,
      Height: height,
      Position: PositionType.Absolute,
      Left: 0.0,
      Top: 0.0,
      ClipPath: CachedClipPath(index),
      ClipPathFit: ShapeFit.Fill,
      ClipPathFillRule: FillRule(clip.FillRule),
    }
    result.Children.Add(inner)
    return result
  }

  private func NodeTransform(node CompiledVectorNodeView) PanelTransform {
    let a = node.M11
    let b = node.M12
    let c = node.M21
    let d = node.M22
    let firstLength = MathF.Sqrt(a * a + c * c)
    let epsilon = 0.0000001F
    if firstLength <= epsilon {
      let secondLength = MathF.Sqrt(b * b + d * d)
      if secondLength > epsilon {
        let radians = MathF.Atan2(-b, d)
        return PanelTransform{
          TranslateX: float64(node.TranslateX),
          TranslateY: float64(node.TranslateY),
          Rotate: float64(radians * 180.0F / MathF.PI),
          ScaleX: 0.0,
          ScaleY: float64(secondLength),
        }
      }
      return PanelTransform{
        TranslateX: float64(node.TranslateX),
        TranslateY: float64(node.TranslateY),
        ScaleX: 0.0,
        ScaleY: 0.0,
      }
    }
    let radians = MathF.Atan2(c, a)
    let cosine = MathF.Cos(radians)
    let sine = MathF.Sin(radians)
    let secondScale = cosine * d - sine * b
    if MathF.Abs(secondScale) <= epsilon {
      let secondLength = MathF.Sqrt(b * b + d * d)
      if secondLength > epsilon {
        let alternateRadians = MathF.Atan2(-b, d)
        let alternateCosine = MathF.Cos(alternateRadians)
        let alternateSine = MathF.Sin(alternateRadians)
        let alternateScale = alternateCosine * a + alternateSine * c
        if MathF.Abs(alternateScale) > epsilon {
          let tangentY = (-alternateSine * a + alternateCosine * c) / alternateScale
          return PanelTransform{
            TranslateX: float64(node.TranslateX),
            TranslateY: float64(node.TranslateY),
            Rotate: float64(alternateRadians * 180.0F / MathF.PI),
            ScaleX: float64(alternateScale),
            ScaleY: float64(secondLength),
            SkewY: float64(MathF.Atan(tangentY) * 180.0F / MathF.PI),
          }
        }
      }
      return PanelTransform{
        TranslateX: float64(node.TranslateX),
        TranslateY: float64(node.TranslateY),
        Rotate: float64(radians * 180.0F / MathF.PI),
        ScaleX: float64(firstLength),
        ScaleY: 0.0,
      }
    }
    let tangentX = (cosine * b + sine * d) / secondScale
    return PanelTransform{
      TranslateX: float64(node.TranslateX),
      TranslateY: float64(node.TranslateY),
      Rotate: float64(radians * 180.0F / MathF.PI),
      ScaleX: float64(firstLength),
      ScaleY: float64(secondScale),
      SkewX: float64(MathF.Atan(tangentX) * 180.0F / MathF.PI),
    }
  }

  private func clampOpacity(value float32) float32 {
    if value <= 0.0F { return 0.0F }
    if value >= 1.0F { return 1.0F }
    return value
  }

}
