package Goo

import SkiaSharp
import System
import Facebook.Yoga
import System.Collections.Generic

internal class ShapeFixtures {
  func ShapeRenderingContract() bool {
    using let closed = render(Shape{
      Width: 80,
      Height: 80,
      Path: unitSquarePath(),
      BackgroundColor: Color.Rgb(255, 0, 0),
    }, 100, 100)
    using let openImage = render(Shape{
      Width: 100,
      Height: 100,
      Path: openPath(),
      BorderWidth: 6,
      BorderColor: Color.Rgb(0, 0, 255),
      BackgroundColor: Color.Rgb(255, 0, 0),
    }, 100, 100)
    using let contain = renderWide(ShapeFit.Contain)
    using let cover = renderFit(ShapeFit.Cover)
    using let fill = renderFit(ShapeFit.Fill)
    using let none = renderFit(ShapeFit.None)
    using let arc = renderArc()
    using let nonzero = render(Shape{
      Width: 100,
      Height: 100,
      Path: nestedSquaresPath(),
      FillRule: FillRule.NonZero,
      BackgroundColor: Color.Rgb(255, 0, 0),
    }, 100, 100)
    using let evenOdd = render(Shape{
      Width: 100,
      Height: 100,
      Path: nestedSquaresPath(),
      FillRule: FillRule.EvenOdd,
      BackgroundColor: Color.Rgb(0, 0, 255),
    }, 100, 100)
    using let sharp = renderCorner(0.0)
    using let rounded = renderCorner(25.0)
    using let dashedSharp = renderDashedCorner(0.0)
    using let dashedRounded = renderDashedCorner(10.0)

    return isRed(closed, 40, 40) && isBlack(closed, 90, 90)
      && isBlue(openImage, 50, 50) && isBlack(openImage, 50, 40)
      && isGreen(contain, 50, 50) && isBlack(contain, 50, 10)
      && isRed(cover, 10, 50) && isBlack(cover, 60, 50)
      && isBlack(fill, 10, 50) && isRed(fill, 30, 50)
      && isBlack(none, 40, 50) && isRed(none, 47, 50)
      && isMagenta(arc, 50, 30) && isBlack(arc, 50, 70)
      && isRed(nonzero, 50, 50) && isBlack(evenOdd, 50, 50)
      && isRed(sharp, 2, 2) && !isRed(rounded, 2, 2) && isRed(rounded, 50, 2)
      && imagesDifferInCorner(dashedSharp, dashedRounded)
      && isWhite(dashedRounded, 10, 2) && isBlack(dashedRounded, 30, 2)
  }

  func ShapeStrokeShorthandContract() bool {
    guard let shapeEntries = Shape{ BorderWidth: 6, BorderColor: Color.White }.Entries() else {
      return false
    }
    guard let boxEntries = Container{ BorderWidth: 6, BorderColor: Color.White }.Entries() else {
      return false
    }
    guard let styleEntries = Style{ BorderWidth: 6, BorderColor: Color.White }.Entries() else {
      return false
    }
    if shapeEntries.Count != 8 || boxEntries.Count != 8 || styleEntries.Count != 8 {
      return false
    }

    let blue = Color.Rgb(0, 0, 255)
    let red = Color.Rgb(255, 0, 0)
    let shorthand = Reconciler{ Res: Resolver{} }.Mount(Shape{
      Width: 100, Height: 100, Path: openPath(),
      BorderWidth: 6, BorderColor: blue,
      BorderLeftWidth: 20, BorderTopWidth: 21,
      BorderRightWidth: 22, BorderBottomWidth: 23,
      BorderLeftColor: red, BorderTopColor: red,
      BorderRightColor: red, BorderBottomColor: red,
    })
    Layout().Calculate(shorthand, 100.0F, 100.0F)
    guard let shorthandYoga = shorthand.Yoga else { return false }
    if shorthand.BorderLeftWidth.Value != 6.0F || shorthand.BorderLeftColor.B != 1.0F
      || shorthand.BorderTopWidth.Unit != LengthUnit.Unset
      || YGNodeStyleAPI.YGNodeStyleGetBorder(shorthandYoga, YGEdge.Left) != 6.0F
      || YGNodeStyleAPI.YGNodeStyleGetBorder(shorthandYoga, YGEdge.Top) != 6.0F
      || YGNodeStyleAPI.YGNodeStyleGetBorder(shorthandYoga, YGEdge.Right) != 6.0F
      || YGNodeStyleAPI.YGNodeStyleGetBorder(shorthandYoga, YGEdge.Bottom) != 6.0F {
      return false
    }
    using let shorthandImage = Painter().RenderOffscreen(shorthand, 100, 100)
    if !isBlue(shorthandImage, 50, 50) { return false }

    let edges = Reconciler{ Res: Resolver{} }.Mount(Shape{
      Width: 100, Height: 100, Path: openPath(),
      BorderLeftWidth: 4, BorderTopWidth: 6,
      BorderRightWidth: 8, BorderBottomWidth: 10,
      BorderLeftColor: red, BorderTopColor: red,
      BorderRightColor: red, BorderBottomColor: red,
    })
    Layout().Calculate(edges, 100.0F, 100.0F)
    guard let edgesYoga = edges.Yoga else { return false }
    using let edgesImage = Painter().RenderOffscreen(edges, 100, 100)
    return edges.BorderLeftWidth.Unit == LengthUnit.Unset
      && YGNodeStyleAPI.YGNodeStyleGetBorder(edgesYoga, YGEdge.Left) == 0.0F
      && YGNodeStyleAPI.YGNodeStyleGetBorder(edgesYoga, YGEdge.Top) == 0.0F
      && YGNodeStyleAPI.YGNodeStyleGetBorder(edgesYoga, YGEdge.Right) == 0.0F
      && YGNodeStyleAPI.YGNodeStyleGetBorder(edgesYoga, YGEdge.Bottom) == 0.0F
      && isBlack(edgesImage, 50, 50)
  }

  func ShapeHitContract() bool {
    var emptyClicks int32 = 0
    let empty = Reconciler{ Res: Resolver{} }.Mount(Shape{
      Width: 100,
      Height: 100,
      Path: VectorPath.Empty,
      OnClick: func() { emptyClicks = emptyClicks + 1 },
    })
    Layout().Calculate(empty, 100.0F, 100.0F)
    let emptyHits = Hit().DispatchClick(empty, 50.0F, 50.0F) && emptyClicks == 1
      && !Hit().DispatchClick(empty, 100.0F, 100.0F)

    var openClicks int32 = 0
    let openNode = Reconciler{ Res: Resolver{} }.Mount(Shape{
      Width: 100,
      Height: 100,
      Path: openPath(),
      OnClick: func() { openClicks = openClicks + 1 },
    })
    Layout().Calculate(openNode, 100.0F, 100.0F)
    let openHits = Hit().DispatchClick(openNode, 50.0F, 20.0F) && openClicks == 1

    var leftClicks int32 = 0
    var rightClicks int32 = 0
    let adjacent = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 100,
      Height: 100,
      Children: {
        shapeHalf(0.0, 0.5, func() { leftClicks = leftClicks + 1 }),
        shapeHalf(0.5, 1.0, func() { rightClicks = rightClicks + 1 }),
      },
    })
    Layout().Calculate(adjacent, 100.0F, 100.0F)
    let routed = Hit().DispatchClick(adjacent, 25.0F, 50.0F) && leftClicks == 1 && rightClicks == 0
      && Hit().DispatchClick(adjacent, 75.0F, 50.0F) && leftClicks == 1 && rightClicks == 1

    var invalidClicks int32 = 0
    let invalid = Reconciler{ Res: Resolver{} }.Mount(Shape{
      Width: 100,
      Height: 100,
      Padding: 60,
      Path: unitSquarePath(),
      BackgroundColor: Color.Rgb(255, 0, 0),
      OnClick: func() { invalidClicks = invalidClicks + 1 },
    })
    Layout().Calculate(invalid, 100.0F, 100.0F)
    using let invalidImage = Painter().RenderOffscreen(invalid, 100, 100)
    let invalidMisses = !ShapeGeometry.Map(invalid).Valid
      && !Hit().DispatchClick(invalid, 50.0F, 50.0F) && invalidClicks == 0
      && isBlack(invalidImage, 50, 50)

    var clippedClicks int32 = 0
    let clipped = Reconciler{ Res: Resolver{} }.Mount(Shape{
      Width: 100,
      Height: 100,
      Padding: 20,
      Fit: ShapeFit.Cover,
      Path: PathBuilder(0.0, 0.0, 2.0, 1.0)
        .MoveTo(0.0, 0.0).LineTo(2.0, 0.0).LineTo(2.0, 1.0).LineTo(0.0, 1.0).Close().Build(),
      BackgroundColor: Color.Rgb(255, 0, 0),
      OnClick: func() { clippedClicks = clippedClicks + 1 },
    })
    Layout().Calculate(clipped, 100.0F, 100.0F)
    using let clippedImage = Painter().RenderOffscreen(clipped, 100, 100)
    let clipMatches = !Hit().DispatchClick(clipped, 10.0F, 50.0F) && clippedClicks == 0
      && Hit().DispatchClick(clipped, 30.0F, 50.0F) && clippedClicks == 1
      && isBlack(clippedImage, 10, 50) && isRed(clippedImage, 30, 50)

    return emptyHits && openHits && routed && invalidMisses && clipMatches
  }

  func ShapeRoundedOcclusionContract() bool {
    var lowerClicks int32 = 0
    var upperClicks int32 = 0
    let root = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 100,
      Height: 100,
      Children: {
        Button{
          Key: "lower",
          Width: 100,
          Height: 100,
          OnClick: func() { lowerClicks = lowerClicks + 1 },
        },
        Shape{
          Key: "upper",
          Position: PositionType.Absolute,
          Left: 0,
          Top: 0,
          Width: 100,
          Height: 100,
          Path: unitSquarePath(),
          CornerRadius: 30,
          OnClick: func() { upperClicks = upperClicks + 1 },
        },
      },
    })
    Layout().Calculate(root, 100.0F, 100.0F)
    let corner = Hit().DispatchClick(root, 2.0F, 2.0F)
    let center = Hit().DispatchClick(root, 50.0F, 50.0F)
    return corner && center && lowerClicks == 1 && upperClicks == 1
  }

  func ShapeNativeCacheLifetimeContract() bool {
    let node = Node{
      Kind: NodeKind.Shape,
      ShapePath: unitSquarePath(),
      ShapeFit: ShapeFit.Contain,
      ShapeCornerRadius: 10.0,
      Dashes: DashPattern([]float64{ 16.0, 8.0 }, 0.0),
      Rect: Rect{ X: 0.0F, Y: 0.0F, W: 100.0F, H: 100.0F },
    }
    guard let hit = ShapeGeometry.CachedHitPath(node) else { return false }
    guard let effects = ShapePathEffects.For(node) else { return false }
    if !Object.ReferenceEquals(hit, ShapeGeometry.CachedHitPath(node))
      || !Object.ReferenceEquals(effects, ShapePathEffects.For(node)) {
      return false
    }

    node.ShapeCornerRadius = 20.0
    guard let changedHit = ShapeGeometry.CachedHitPath(node) else { return false }
    guard let changedEffects = ShapePathEffects.For(node) else { return false }
    if Object.ReferenceEquals(hit, changedHit) || !Object.ReferenceEquals(effects, changedEffects) {
      return false
    }

    TextLayouts.DisposeTree(node)
    guard let rebuiltHit = ShapeGeometry.CachedHitPath(node) else { return false }
    guard let rebuiltEffects = ShapePathEffects.For(node) else { return false }
    let retired = !Object.ReferenceEquals(changedHit, rebuiltHit)
      && !Object.ReferenceEquals(changedEffects, rebuiltEffects)
    ShapePathEffects.Dispose(node)
    TextLayouts.DisposeTree(node)
    return retired
  }

  func ShapeHitTraversalBytes() int64 {
    let children = List[Blob]()
    children.Add(Button{
      Key: "underlay",
      Width: 100,
      Height: 100,
      OnClick: () -> {},
    })
    let square = unitSquarePath()
    var i int32 = 0
    while i < 1000 {
      children.Add(Shape{
        Key: "shape-$i",
        Position: PositionType.Absolute,
        Left: 0,
        Top: 0,
        Width: 100,
        Height: 100,
        Path: square,
        CornerRadius: 30,
      })
      i++
    }
    let root = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 100,
      Height: 100,
      Children: children,
    })
    Layout().Calculate(root, 100.0F, 100.0F)
    let hit = Hit()
    var warmup int32 = 0
    while warmup < 5 {
      if hit.Topmost(root, 2.0F, 2.0F)?.Key != "underlay" { return -1 }
      warmup++
    }
    let before = GC.GetAllocatedBytesForCurrentThread()
    let target = hit.Topmost(root, 2.0F, 2.0F)
    let bytes = GC.GetAllocatedBytesForCurrentThread() - before
    TextLayouts.DisposeTree(root)
    if target?.Key != "underlay" { return -1 }
    return bytes
  }

  func RoundedDashedShadowContract() bool {
    let node = Reconciler{ Res: Resolver{} }.Mount(Shape{
      Width: 100,
      Height: 100,
      Path: unitSquarePath(),
      CornerRadius: 10.0,
      BorderWidth: 6,
      BorderColor: Color.White,
      BackgroundColor: Color.Rgb(255, 0, 0),
      Dashes: DashPattern([]float64{ 16.0, 16.0 }, 0.0),
      BoxShadow: BoxShadow{ OffsetX: 12, OffsetY: 12, Color: Color.Rgb(0, 0, 255) },
    })
    Layout().Calculate(node, 100.0F, 100.0F)
    let painter = Painter()
    using let first = painter.RenderOffscreen(node, 100, 100)
    using let second = painter.RenderOffscreen(node, 100, 100)
    using let firstBitmap = SKBitmap.FromImage(first)
    using let secondBitmap = SKBitmap.FromImage(second)
    var samePixels = true
    for y in 0 ... 100 {
      for x in 0 ... 100 {
        if uint32(firstBitmap.GetPixel(x, y)) != uint32(secondBitmap.GetPixel(x, y)) {
          samePixels = false
        }
      }
    }
    let painted = samePixels
      && isRed(first, 50, 50)
      && isWhite(first, 10, 2)
      && isBlack(first, 30, 2)
      && isBlue(first, 98, 80)
      && isBlack(first, 2, 2)
    TextLayouts.DisposeTree(node)
    return painted
  }
  func ShapeFlexLayoutContract() bool {
    return shapeColumnFlexContract()
      && shapeRootFlexContract()
      && shapeSizePrecedenceContract()
      && shapeRowFlexContract()
  }

  private func shapeColumnFlexContract() bool {
    var clicks int32 = 0
    let column = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 100,
      Height: 300,
      Children: {
        Shape{
          Path: unitSquarePath(),
          BackgroundColor: Color.Rgb(255, 0, 0),
          OnClick: func() { clicks = clicks + 1 },
        },
        Container{ Height: 50 },
      },
    })
    Layout().Calculate(column, 100.0F, 300.0F)
    let stretched = column.Children[0]
    if stretched.Rect.W != 100.0F || stretched.Rect.H != 100.0F
      || column.Children[1].Rect.Y != 100.0F {
      return false
    }
    using let columnImage = Painter().RenderOffscreen(column, 100, 300)
    let columnWorks = isRed(columnImage, 50, 50) && isBlack(columnImage, 50, 250)
      && Hit().DispatchClick(column, 50.0F, 50.0F) && clicks == 1
      && !Hit().DispatchClick(column, 50.0F, 150.0F) && clicks == 1
    return columnWorks
  }

  private func shapeRootFlexContract() bool {
    let rootShape = Reconciler{ Res: Resolver{} }.Mount(Shape{ Path: unitSquarePath() })
    Layout().Calculate(rootShape, 100.0F, 50.0F)
    return rootShape.Rect.W == 100.0F && rootShape.Rect.H == 50.0F
  }

  private func shapeSizePrecedenceContract() bool {
    let widePath = PathBuilder(0.0, 0.0, 2.0, 1.0)
      .MoveTo(0.0, 0.0).LineTo(2.0, 0.0).LineTo(2.0, 1.0).LineTo(0.0, 1.0).Close().Build()
    let oneDim = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 300,
      Height: 300,
      Children: { Shape{ Width: 80, Path: widePath } },
    })
    Layout().Calculate(oneDim, 300.0F, 300.0F)
    if oneDim.Children[0].Rect.W != 80.0F || oneDim.Children[0].Rect.H != 40.0F {
      return false
    }

    let authored = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 300,
      Height: 300,
      Children: { Shape{ Width: 80, AspectRatio: 4.0, Path: widePath } },
    })
    Layout().Calculate(authored, 300.0F, 300.0F)
    if authored.Children[0].Rect.W != 80.0F || authored.Children[0].Rect.H != 20.0F {
      return false
    }

    let bothDims = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 300,
      Height: 300,
      Children: { Shape{ Width: 80, Height: 30, Path: unitSquarePath() } },
    })
    Layout().Calculate(bothDims, 300.0F, 300.0F)
    if bothDims.Children[0].Rect.W != 80.0F || bothDims.Children[0].Rect.H != 30.0F {
      return false
    }

    let layout = Layout()
    let extreme = PathBuilder(0.0, 0.0, 3.0E38, 1.0E-10)
      .MoveTo(0.0, 0.0).LineTo(1.0, 0.0).Build()
    oneDim.Children[0].ShapePath = extreme
    layout.Calculate(oneDim, 300.0F, 300.0F)
    return oneDim.Children[0].Rect.W == 80.0F && oneDim.Children[0].Rect.H == 0.0F
  }

  private func shapeRowFlexContract() bool {
    let row = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 300,
      Height: 100,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.FlexStart,
      Children: {
        Container{ Width: 50, Height: 100 },
        Shape{ Height: 60, Path: unitSquarePath() },
      },
    })
    Layout().Calculate(row, 300.0F, 100.0F)
    let rowShape = row.Children[1]
    return rowShape.Rect.X == 50.0F && rowShape.Rect.W == 60.0F && rowShape.Rect.H == 60.0F
  }

  private func render(shape Shape, width int32, height int32) SKImage {
    let node = Reconciler{ Res: Resolver{} }.Mount(shape)
    Layout().Calculate(node, float32(width), float32(height))
    return Painter().RenderOffscreen(node, width, height)
  }

  private func renderWide(fit ShapeFit) SKImage {
    let path = PathBuilder(0.0, 0.0, 2.0, 1.0)
      .MoveTo(0.0, 0.0).LineTo(2.0, 0.0).LineTo(2.0, 1.0).LineTo(0.0, 1.0).Close().Build()
    return render(Shape{ Width: 100, Height: 100, Path: path, Fit: fit,
      BackgroundColor: Color.Rgb(0, 255, 0) }, 100, 100)
  }

  private func renderFit(fit ShapeFit) SKImage {
    return render(Shape{ Width: 100, Height: 100, Path: nonzeroViewBoxPath(), Fit: fit,
      BackgroundColor: Color.Rgb(255, 0, 0) }, 100, 100)
  }

  private func renderArc() SKImage {
    let path = PathBuilder(0.0, 0.0, 100.0, 100.0)
      .MoveTo(20.0, 50.0).ArcTo(30.0, 20.0, 0.0, false, true, 80.0, 50.0).Build()
    return render(Shape{ Width: 100, Height: 100, Path: path,
      BorderWidth: 4, BorderColor: Color.Rgb(255, 0, 255) }, 100, 100)
  }

  private func renderCorner(radius float64) SKImage {
    return render(Shape{ Width: 100, Height: 100, Path: unitSquarePath(), CornerRadius: radius,
      BackgroundColor: Color.Rgb(255, 0, 0) }, 100, 100)
  }

  private func renderDashedCorner(radius float64) SKImage {
    return render(Shape{ Width: 100, Height: 100, Path: unitSquarePath(), CornerRadius: radius,
      BorderWidth: 6, BorderColor: Color.White, Dashes: DashPattern([]float64{ 16.0, 16.0 }, 0.0) }, 100, 100)
  }

  private func shapeHalf(startX float64, endX float64, onClick Action) Shape {
    return Shape{
      Position: PositionType.Absolute,
      Left: 0,
      Top: 0,
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      Fit: ShapeFit.Fill,
      Path: halfPath(startX, endX),
      OnClick: onClick,
    }
  }

  private func nonzeroViewBoxPath() VectorPath {
    return PathBuilder(10.0, 20.0, 20.0, 10.0)
      .MoveTo(15.0, 20.0).LineTo(20.0, 20.0).LineTo(20.0, 30.0).LineTo(15.0, 30.0).Close().Build()
  }

  private func unitSquarePath() VectorPath {
    return PathBuilder().Polyline([]Point{
      Point{ X: 0.0, Y: 0.0 }, Point{ X: 1.0, Y: 0.0 },
      Point{ X: 1.0, Y: 1.0 }, Point{ X: 0.0, Y: 1.0 },
    }, true).Build()
  }

  private func openPath() VectorPath {
    return PathBuilder().MoveTo(0.2, 0.5).LineTo(0.8, 0.5).Build()
  }

  private func halfPath(startX float64, endX float64) VectorPath {
    return PathBuilder().Polyline([]Point{
      Point{ X: startX, Y: 0.0 }, Point{ X: endX, Y: 0.0 },
      Point{ X: endX, Y: 1.0 }, Point{ X: startX, Y: 1.0 },
    }, true).Build()
  }

  private func nestedSquaresPath() VectorPath {
    return PathBuilder()
      .MoveTo(0.0, 0.0).LineTo(1.0, 0.0).LineTo(1.0, 1.0).LineTo(0.0, 1.0).Close()
      .MoveTo(0.25, 0.25).LineTo(0.75, 0.25).LineTo(0.75, 0.75).LineTo(0.25, 0.75).Close().Build()
  }

  private func pixel(image SKImage, x int32, y int32) SKColor {
    using let bitmap = SKBitmap.FromImage(image)
    return bitmap.GetPixel(x, y)
  }

  private func imagesDifferInCorner(sharp SKImage, rounded SKImage) bool {
    using let sharpBitmap = SKBitmap.FromImage(sharp)
    using let roundedBitmap = SKBitmap.FromImage(rounded)
    for y in 0 ... 16 {
      for x in 0 ... 16 {
        if uint32(sharpBitmap.GetPixel(x, y)) != uint32(roundedBitmap.GetPixel(x, y)) {
          return true
        }
      }
    }
    return false
  }

  private func isRed(image SKImage, x int32, y int32) bool {
    let color = pixel(image, x, y)
    return color.Red >= 245 && color.Green <= 10 && color.Blue <= 10
  }

  private func isGreen(image SKImage, x int32, y int32) bool {
    let color = pixel(image, x, y)
    return color.Green >= 245 && color.Red <= 10 && color.Blue <= 10
  }

  private func isBlue(image SKImage, x int32, y int32) bool {
    let color = pixel(image, x, y)
    return color.Blue >= 245 && color.Red <= 10 && color.Green <= 10
  }

  private func isMagenta(image SKImage, x int32, y int32) bool {
    let color = pixel(image, x, y)
    return color.Red >= 245 && color.Blue >= 245 && color.Green <= 10
  }

  private func isWhite(image SKImage, x int32, y int32) bool {
    let color = pixel(image, x, y)
    return color.Red >= 245 && color.Green >= 245 && color.Blue >= 245
  }

  private func isBlack(image SKImage, x int32, y int32) bool {
    let color = pixel(image, x, y)
    return color.Red <= 10 && color.Green <= 10 && color.Blue <= 10
  }
}
