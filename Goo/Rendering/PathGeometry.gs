package Goo

import System
import System.Collections.Generic
import System.Runtime.CompilerServices

internal data struct PathQuadratic {
  internal let X0 float32
  internal let Y0 float32
  internal let CX float32
  internal let CY float32
  internal let X1 float32
  internal let Y1 float32
}

internal data struct PathContour {
  internal let Start int32
  internal let End int32
  internal let Closed bool
}

internal data struct PathEdge {
  internal let X0 float32
  internal let Y0 float32
  internal let X1 float32
  internal let Y1 float32
}

internal data struct PathMapping {
  internal let Valid bool
  internal let ScaleX float32
  internal let ScaleY float32
  internal let TranslateX float32
  internal let TranslateY float32
  internal let Left float32
  internal let Top float32
  internal let Width float32
  internal let Height float32
}

internal class PathGeometry {
  internal let Quadratics []PathQuadratic
  internal let Contours []PathContour
  internal let Edges []PathEdge
  internal let HasClosedContour bool
  internal let MinX float32
  internal let MinY float32
  internal let MaxX float32
  internal let MaxY float32

  internal init(quadratics []PathQuadratic, contours []PathContour, edges []PathEdge,
    hasClosedContour bool, minX float32, minY float32, maxX float32, maxY float32) {
    Quadratics = quadratics
    Contours = contours
    Edges = edges
    HasClosedContour = hasClosedContour
    MinX = minX
    MinY = minY
    MaxX = maxX
    MaxY = maxY
  }

  shared {
    private let cache ConditionalWeakTable[VectorPathData, PathGeometry] =
      ConditionalWeakTable[VectorPathData, PathGeometry]()
    private let PathGeometryCacheLock object = Object()
    private let emptyGeometry PathGeometry = PathGeometry(
      []PathQuadratic{}, []PathContour{}, []PathEdge{}, false, 0.0F, 0.0F, 0.0F, 0.0F)

    internal func For(path VectorPath) PathGeometry {
      guard let source = path.payload else { return emptyGeometry }
      if cache.TryGetValue(source, out var value) { return value }
      lock (PathGeometryCacheLock) {
        if cache.TryGetValue(source, out var retained) { return retained }
        let built = build(source)
        cache.Add(source, built)
        return built
      }
    }

    internal func Map(path VectorPath, fit ShapeFit, left float32, top float32,
      width float32, height float32) PathMapping {
      let viewBoxWidth = float32(path.ViewBoxWidth)
      let viewBoxHeight = float32(path.ViewBoxHeight)
      if width <= 0.0F || height <= 0.0F || viewBoxWidth <= 0.0F || viewBoxHeight <= 0.0F {
        return PathMapping{}
      }
      var scaleX = width / viewBoxWidth
      var scaleY = height / viewBoxHeight
      if fit == ShapeFit.Contain || fit == ShapeFit.Cover {
        let scale = if fit == ShapeFit.Contain {
          scaleX < scaleY ? scaleX : scaleY
        } else {
          scaleX > scaleY ? scaleX : scaleY
        }
        scaleX = scale
        scaleY = scale
      } else if fit == ShapeFit.None {
        scaleX = 1.0F
        scaleY = 1.0F
      }
      let translateX = left + (width - viewBoxWidth * scaleX) * 0.5F
        - float32(path.ViewBoxX) * scaleX
      let translateY = top + (height - viewBoxHeight * scaleY) * 0.5F
        - float32(path.ViewBoxY) * scaleY
      return PathMapping{
        Valid: finite(scaleX) && finite(scaleY) && finite(translateX) && finite(translateY),
        ScaleX: scaleX,
        ScaleY: scaleY,
        TranslateX: translateX,
        TranslateY: translateY,
        Left: left,
        Top: top,
        Width: width,
        Height: height,
      }
    }

    private func build(source VectorPathData) PathGeometry {
      let builder = PathGeometryBuilder()
      for i in 0 ... source.Commands.Length {
        builder.Consume(source.Commands[i])
      }
      return builder.Build()
    }

    private func includePoint(ref minX float32, ref minY float32, ref maxX float32,
      ref maxY float32, ref hasPoint bool, x float32, y float32) {
      if !finite(x) || !finite(y) { return }
      if !hasPoint {
        minX = x
        minY = y
        maxX = x
        maxY = y
        hasPoint = true
        return
      }
      if x < minX { minX = x }
      if y < minY { minY = y }
      if x > maxX { maxX = x }
      if y > maxY { maxY = y }
    }

    private func quadraticValue(a float32, b float32, c float32, t float32) float32 {
      return (a * t + b) * t + c
    }

    private func includeQuadratic(ref minX float32, ref minY float32, ref maxX float32,
      ref maxY float32, ref hasPoint bool, q PathQuadratic) {
      includePoint(ref minX, ref minY, ref maxX, ref maxY, ref hasPoint, q.X0, q.Y0)
      includePoint(ref minX, ref minY, ref maxX, ref maxY, ref hasPoint, q.X1, q.Y1)
      let ax = q.X0 - 2.0F * q.CX + q.X1
      let bx = 2.0F * (q.CX - q.X0)
      if MathF.Abs(ax) > 0.000001F {
        let tx = -bx / (2.0F * ax)
        if tx > 0.0F && tx < 1.0F {
          includePoint(ref minX, ref minY, ref maxX, ref maxY, ref hasPoint,
            quadraticValue(ax, bx, q.X0, tx), quadraticValue(
              q.Y0 - 2.0F * q.CY + q.Y1,
              2.0F * (q.CY - q.Y0), q.Y0, tx))
        }
      }
      let ay = q.Y0 - 2.0F * q.CY + q.Y1
      let by = 2.0F * (q.CY - q.Y0)
      if MathF.Abs(ay) > 0.000001F {
        let ty = -by / (2.0F * ay)
        if ty > 0.0F && ty < 1.0F {
          includePoint(ref minX, ref minY, ref maxX, ref maxY, ref hasPoint,
            quadraticValue(ax, bx, q.X0, ty), quadraticValue(ay, by, q.Y0, ty))
        }
      }
    }

    internal func Create(quadratics []PathQuadratic, contours []PathContour) PathGeometry {
      let edges = List[PathEdge]()
      var hasClosed = false
      for i in 0 ... contours.Length {
        let contour = contours[i]
        if !contour.Closed { continue }
        hasClosed = true
        for j in contour.Start ... contour.End {
          appendEdges(quadratics[j], edges)
        }
      }

      var minX = 0.0F
      var minY = 0.0F
      var maxX = 0.0F
      var maxY = 0.0F
      var hasPoint = false
      for i in 0 ... quadratics.Length {
        includeQuadratic(ref minX, ref minY, ref maxX, ref maxY, ref hasPoint, quadratics[i])
      }
      if !hasPoint {
        minX = 0.0F
        minY = 0.0F
        maxX = 0.0F
        maxY = 0.0F
      }
      return PathGeometry(quadratics, contours, edges.ToArray(), hasClosed,
        minX, minY, maxX, maxY)
    }

    private func appendEdges(q PathQuadratic, edges List[PathEdge]) {
      let steps int32 = 8
      var previousX = q.X0
      var previousY = q.Y0
      let last = steps + 1
      for i in 1 ... last {
        let t = float32(i) / float32(steps)
        let inverse = 1.0F - t
        let x = inverse * inverse * q.X0 + 2.0F * inverse * t * q.CX + t * t * q.X1
        let y = inverse * inverse * q.Y0 + 2.0F * inverse * t * q.CY + t * t * q.Y1
        edges.Add(PathEdge{ X0: previousX, Y0: previousY, X1: x, Y1: y })
        previousX = x
        previousY = y
      }
    }

    private func finite(value float32) bool {
      return !Single.IsNaN(value) && !Single.IsInfinity(value)
    }
  }

  internal func Contains(x float32, y float32, rule FillRule) bool {
    if !HasClosedContour || !finitePoint(x) || !finitePoint(y)
      || x < MinX || x > MaxX || y < MinY || y > MaxY {
      return false
    }
    var winding int32 = 0
    var parity bool = false
    for i in 0 ... Edges.Length {
      let edge = Edges[i]
      if pointOnEdge(edge, x, y) { return true }
      if edge.Y0 <= y && edge.Y1 > y {
        let atX = edge.X0 + (y - edge.Y0) * (edge.X1 - edge.X0) / (edge.Y1 - edge.Y0)
        if atX > x {
          parity = !parity
          winding++
        }
      } else if edge.Y1 <= y && edge.Y0 > y {
        let atX = edge.X1 + (y - edge.Y1) * (edge.X0 - edge.X1) / (edge.Y0 - edge.Y1)
        if atX > x {
          parity = !parity
          winding--
        }
      }
    }
    return rule == FillRule.EvenOdd ? parity : winding != 0
  }

  private func pointOnEdge(edge PathEdge, x float32, y float32) bool {
    let dx = edge.X1 - edge.X0
    let dy = edge.Y1 - edge.Y0
    let px = x - edge.X0
    let py = y - edge.Y0
    let cross = px * dy - py * dx
    let tolerance = 0.0001F * (1.0F + MathF.Abs(dx) + MathF.Abs(dy))
    if MathF.Abs(cross) > tolerance { return false }
    return px * dx + py * dy >= -tolerance
      && px * dx + py * dy <= dx * dx + dy * dy + tolerance
  }

  private func finitePoint(value float32) bool {
    return !Single.IsNaN(value) && !Single.IsInfinity(value)
  }
}

internal class PathGeometryBuilder {
  private let quadratics List[PathQuadratic]
  private let contours List[PathContour]
  private var active bool
  private var closed bool
  private var contourStart int32
  private var currentX float32
  private var currentY float32
  private var startX float32
  private var startY float32

  internal init() {
    quadratics = List[PathQuadratic]()
    contours = List[PathContour]()
  }

  internal func Consume(command VectorPathCommand) {
    switch command.Kind {
      case VectorPathCommandKind.MoveTo { moveTo(float32(command.X1), float32(command.Y1)) }
      case VectorPathCommandKind.LineTo { lineTo(float32(command.X1), float32(command.Y1)) }
      case VectorPathCommandKind.QuadraticTo {
        quadraticTo(float32(command.X1), float32(command.Y1),
          float32(command.X2), float32(command.Y2))
      }
      case VectorPathCommandKind.CubicTo {
        cubicTo(float32(command.X1), float32(command.Y1), float32(command.X2), float32(command.Y2),
          float32(command.X3), float32(command.Y3))
      }
      case VectorPathCommandKind.ArcTo {
        arcTo(float32(command.RadiusX), float32(command.RadiusY),
          float32(command.RotationDegrees), command.LargeArc, command.SweepClockwise,
          float32(command.X1), float32(command.Y1))
      }
      case VectorPathCommandKind.Close { closePath() }
      default { }
    }
  }

  internal func Build() PathGeometry {
    finishContour()
    return PathGeometry.Create(quadratics.ToArray(), contours.ToArray())
  }

  private func moveTo(x float32, y float32) {
    finishContour()
    active = true
    closed = false
    contourStart = quadratics.Count
    currentX = x
    currentY = y
    startX = x
    startY = y
  }

  private func lineTo(x float32, y float32) {
    if !active { return }
    addQuadratic(currentX, currentY, (currentX + x) * 0.5F, (currentY + y) * 0.5F, x, y)
    currentX = x
    currentY = y
  }

  private func quadraticTo(cx float32, cy float32, x float32, y float32) {
    if !active { return }
    addQuadratic(currentX, currentY, cx, cy, x, y)
    currentX = x
    currentY = y
  }

  private func cubicTo(c1x float32, c1y float32, c2x float32, c2y float32,
    x float32, y float32) {
    if !active { return }
    let startXValue = currentX
    let startYValue = currentY
    let count int32 = 8
    var previousX = startXValue
    var previousY = startYValue
    for i in 0 ... count {
      let t0 = float32(i) / float32(count)
      let t1 = float32(i + 1) / float32(count)
      let a = cubicPoint(startXValue, c1x, c2x, x, t0)
      let b = cubicPoint(startYValue, c1y, c2y, y, t0)
      let c = cubicPoint(startXValue, c1x, c2x, x, t1)
      let d = cubicPoint(startYValue, c1y, c2y, y, t1)
      let dx0 = cubicDerivative(startXValue, c1x, c2x, x, t0)
      let dy0 = cubicDerivative(startYValue, c1y, c2y, y, t0)
      let dx1 = cubicDerivative(startXValue, c1x, c2x, x, t1)
      let dy1 = cubicDerivative(startYValue, c1y, c2y, y, t1)
      let dt = 1.0F / float32(count)
      let q0x = a + dx0 * dt * 0.5F
      let q0y = b + dy0 * dt * 0.5F
      let q1x = c - dx1 * dt * 0.5F
      let q1y = d - dy1 * dt * 0.5F
      addQuadratic(previousX, previousY, (q0x + q1x) * 0.5F, (q0y + q1y) * 0.5F, c, d)
      previousX = c
      previousY = d
    }
    currentX = x
    currentY = y
  }

  private func arcTo(rxInput float32, ryInput float32, rotationDegrees float32,
    largeArc bool, sweep bool, x float32, y float32) {
    if !active { return }
    if currentX == x && currentY == y { return }
    let rx = MathF.Abs(rxInput)
    let ry = MathF.Abs(ryInput)
    if rx <= 0.0F || ry <= 0.0F {
      lineTo(x, y)
      return
    }

    let phi = (rotationDegrees % 360.0F) * MathF.PI / 180.0F
    let cosPhi = MathF.Cos(phi)
    let sinPhi = MathF.Sin(phi)
    let halfDx = (currentX - x) * 0.5F
    let halfDy = (currentY - y) * 0.5F
    let xPrime = cosPhi * halfDx + sinPhi * halfDy
    let yPrime = -sinPhi * halfDx + cosPhi * halfDy
    let rxSquared = rx * rx
    let rySquared = ry * ry
    let xPrimeSquared = xPrime * xPrime
    let yPrimeSquared = yPrime * yPrime
    let lambda = xPrimeSquared / rxSquared + yPrimeSquared / rySquared
    let scaledRx = if lambda > 1.0F { rx * MathF.Sqrt(lambda) } else { rx }
    let scaledRy = if lambda > 1.0F { ry * MathF.Sqrt(lambda) } else { ry }
    let scaledRxSquared = scaledRx * scaledRx
    let scaledRySquared = scaledRy * scaledRy
    let denominator = scaledRxSquared * yPrimeSquared + scaledRySquared * xPrimeSquared
    let numerator = scaledRxSquared * scaledRySquared - denominator
    let ratio = if denominator <= 0.0F { 0.0F } else { MathF.Max(0.0F, numerator / denominator) }
    let sign = largeArc == sweep ? -1.0F : 1.0F
    let factor = sign * MathF.Sqrt(ratio)
    let centerPrimeX = factor * scaledRx * yPrime / scaledRy
    let centerPrimeY = -factor * scaledRy * xPrime / scaledRx
    let midpointX = (currentX + x) * 0.5F
    let midpointY = (currentY + y) * 0.5F
    let centerX = cosPhi * centerPrimeX - sinPhi * centerPrimeY + midpointX
    let centerY = sinPhi * centerPrimeX + cosPhi * centerPrimeY + midpointY
    let unitStartX = (xPrime - centerPrimeX) / scaledRx
    let unitStartY = (yPrime - centerPrimeY) / scaledRy
    let unitEndX = (-xPrime - centerPrimeX) / scaledRx
    let unitEndY = (-yPrime - centerPrimeY) / scaledRy
    let startAngle = MathF.Atan2(unitStartY, unitStartX)
    var delta = MathF.Atan2(unitStartX * unitEndY - unitStartY * unitEndX,
      unitStartX * unitEndX + unitStartY * unitEndY)
    if sweep && delta < 0.0F {
      delta = delta + 2.0F * MathF.PI
    }
    if !sweep && delta > 0.0F {
      delta = delta - 2.0F * MathF.PI
    }
    let count = int32(MathF.Ceiling(MathF.Abs(delta) / (0.5F * MathF.PI)))
    if count <= 0 {
      lineTo(x, y)
      return
    }
    let step = delta / float32(count)
    var previousX = currentX
    var previousY = currentY
    for i in 0 ... count {
      let angle0 = startAngle + step * float32(i)
      let angle1 = if i + 1 == count { startAngle + delta } else { angle0 + step }
      let p0 = ellipsePoint(centerX, centerY, scaledRx, scaledRy, cosPhi, sinPhi, angle0)
      let p1 = ellipsePoint(centerX, centerY, scaledRx, scaledRy, cosPhi, sinPhi, angle1)
      let tangentX = -scaledRx * MathF.Sin(angle0)
      let tangentY = scaledRy * MathF.Cos(angle0)
      let control = MathF.Tan(step * 0.5F)
      let qx = p0.X + control * (cosPhi * tangentX - sinPhi * tangentY)
      let qy = p0.Y + control * (sinPhi * tangentX + cosPhi * tangentY)
      let endX = i + 1 == count ? x : p1.X
      let endY = i + 1 == count ? y : p1.Y
      addQuadratic(previousX, previousY, qx, qy, endX, endY)
      previousX = endX
      previousY = endY
    }
    currentX = x
    currentY = y
  }

  private func ellipsePoint(centerX float32, centerY float32, rx float32, ry float32,
    cosPhi float32, sinPhi float32, angle float32) PathPoint {
    let localX = rx * MathF.Cos(angle)
    let localY = ry * MathF.Sin(angle)
    return PathPoint{
      X: centerX + cosPhi * localX - sinPhi * localY,
      Y: centerY + sinPhi * localX + cosPhi * localY,
    }
  }

  private func addQuadratic(x0 float32, y0 float32, cx float32, cy float32,
    x1 float32, y1 float32) {
    quadratics.Add(PathQuadratic{ X0: x0, Y0: y0, CX: cx, CY: cy, X1: x1, Y1: y1 })
  }

  private func closePath() {
    if !active { return }
    if currentX != startX || currentY != startY {
      lineTo(startX, startY)
    }
    closed = true
    finishContour()
  }

  private func finishContour() {
    if !active { return }
    contours.Add(PathContour{ Start: contourStart, End: quadratics.Count, Closed: closed })
    active = false
  }

  private func cubicPoint(p0 float32, p1 float32, p2 float32, p3 float32, t float32) float32 {
    let inverse = 1.0F - t
    return inverse * inverse * inverse * p0 + 3.0F * inverse * inverse * t * p1
      + 3.0F * inverse * t * t * p2 + t * t * t * p3
  }

  private func cubicDerivative(p0 float32, p1 float32, p2 float32, p3 float32, t float32) float32 {
    let inverse = 1.0F - t
    return 3.0F * inverse * inverse * (p1 - p0) + 6.0F * inverse * t * (p2 - p1)
      + 3.0F * t * t * (p3 - p2)
  }
}

internal data struct PathPoint {
  internal let X float32
  internal let Y float32
}
