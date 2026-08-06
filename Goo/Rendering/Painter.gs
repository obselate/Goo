package Goo

import System
import System.Collections.Generic
import System.Runtime.CompilerServices
import Goo.InternalTextInterop
import SkiaSharp

internal struct GradientShaderKey {
  internal var Source Gradient
  internal var Width float32
  internal var Height float32
}

internal struct BoxDashEffectKey {
  internal var Style BorderStyle
  internal var Width float32
}

internal struct PaintCullState {
  internal var Left float32
  internal var Top float32
  internal var Right float32
  internal var Bottom float32
  internal var Active bool
}

internal class CullDisabledMarker {
}

internal class BoxPaintScratch {
  internal var Path SKPath?
  internal var RoundRect SKRoundRect?
  internal var Radii []?SKPoint
  internal var DashEffects Dictionary[BoxDashEffectKey, SKPathEffect]?
}

internal class GradientShaderKeyComparer : IEqualityComparer[GradientShaderKey] {
  shared {
    internal let Instance GradientShaderKeyComparer = GradientShaderKeyComparer()
  }

  public func Equals(left GradientShaderKey, right GradientShaderKey) bool {
    return Object.ReferenceEquals(left.Source, right.Source)
      && left.Width == right.Width && left.Height == right.Height
  }

  public func GetHashCode(value GradientShaderKey) int32 {
    return HashCode.Combine(
      RuntimeHelpers.GetHashCode(value.Source), value.Width, value.Height)
  }
}

internal class BoxDashEffectKeyComparer : IEqualityComparer[BoxDashEffectKey] {
  shared {
    internal let Instance BoxDashEffectKeyComparer = BoxDashEffectKeyComparer()
  }

  public func Equals(left BoxDashEffectKey, right BoxDashEffectKey) bool {
    return left.Style == right.Style && left.Width == right.Width
  }

  public func GetHashCode(value BoxDashEffectKey) int32 {
    return HashCode.Combine(int32(value.Style), value.Width)
  }
}

internal partial class Painter {
  shared {
    private let gradientShaderCacheLimit int32 = 64
    private let boxDashEffectCacheLimit int32 = 64
    private let shapeOuterShadowSpreadMiterLimit float32 = 4.0F
    private let shapeOuterShadowRasterPad float32 = 2.0F
    private let cullDisabledPainters ConditionalWeakTable[Painter, CullDisabledMarker] =
      ConditionalWeakTable[Painter, CullDisabledMarker]()
  }

  private var reusablePaint SKPaint?
  private var blurFilters Dictionary[float32, SKMaskFilter]?
  private var gradientShaders Dictionary[GradientShaderKey, SKShader]?
  // Required differential oracle for the culling release gate.
  internal prop CullDisabled bool {
    get { return cullDisabledPainters.TryGetValue(this, out var marker) }
    init {
      if value {
        let marker = cullDisabledPainters.GetOrCreateValue(this)
      } else {
        cullDisabledPainters.Remove(this)
      }
    }
  }

  internal func Paint(root Node, canvas SKCanvas) {
    let saveCount = canvas.SaveCount
    var boxScratch BoxPaintScratch? = nil
    try {
      let clip = canvas.LocalClipBounds
      var cull = PaintCullState{
        Left: clip.Left,
        Top: clip.Top,
        Right: clip.Right,
        Bottom: clip.Bottom,
        Active: !CullDisabled,
      }
      paintNode(root, canvas, ref cull, ref boxScratch)
    } finally {
      try {
        canvas.RestoreToCount(saveCount)
      } finally {
        try {
          if let paint = reusablePaint {
            reusablePaint = nil
            paint.Dispose()
          }
        } finally {
          try {
            disposeBlurFilters()
          } finally {
            try {
              disposeBoxScratch(ref boxScratch)
            } finally {
              disposeGradientShaders()
            }
          }
        }
      }
    }
  }

  private func resetPaint() SKPaint {
    if let paint = reusablePaint {
      paint.Reset()
      return paint
    }
    let paint = SKPaint()
    reusablePaint = paint
    return paint
  }

  internal func resetBoxPath(ref scratch BoxPaintScratch?, fillType SKPathFillType) SKPath {
    let value = boxPaintScratch(ref scratch)
    if value.Path == nil {
      value.Path = SKPath()
    }
    guard let path = value.Path else {
      throw InvalidOperationException("Painter.resetBoxPath: missing path")
    }
    path.Reset()
    path.FillType = fillType
    return path
  }

  internal func resetBoxRoundRect(ref scratch BoxPaintScratch?, rect SKRect, topLeft float32, topRight float32,
    bottomRight float32, bottomLeft float32) SKRoundRect {
    let value = boxPaintScratch(ref scratch)
    if value.RoundRect == nil {
      value.RoundRect = SKRoundRect()
    }
    if value.Radii == nil {
      value.Radii = []SKPoint{ SKPoint(0.0F, 0.0F), SKPoint(0.0F, 0.0F),
        SKPoint(0.0F, 0.0F), SKPoint(0.0F, 0.0F) }
    }
    guard let roundRect = value.RoundRect else {
      throw InvalidOperationException("Painter.resetBoxRoundRect: missing round rect")
    }
    let radii = value.Radii!!
    radii[0] = SKPoint(topLeft, topLeft)
    radii[1] = SKPoint(topRight, topRight)
    radii[2] = SKPoint(bottomRight, bottomRight)
    radii[3] = SKPoint(bottomLeft, bottomLeft)
    roundRect.SetRectRadii(rect, radii)
    return roundRect
  }

  internal func boxDashEffect(ref scratch BoxPaintScratch?, style BorderStyle, width float32) SKPathEffect? {
    let key = BoxDashEffectKey{ Style: style, Width: width }
    let value = boxPaintScratch(ref scratch)
    if let effects = value.DashEffects {
      if effects.TryGetValue(key, out var existing) {
        return existing
      }
      if effects.Count >= boxDashEffectCacheLimit {
        return nil
      }
    } else {
      value.DashEffects = Dictionary[BoxDashEffectKey, SKPathEffect](4, BoxDashEffectKeyComparer.Instance)
    }
    let created = createBoxDashEffect(style, width)
    guard let effects = value.DashEffects else {
      created.Dispose()
      throw InvalidOperationException("Painter.boxDashEffect: missing cache")
    }
    effects.Add(key, created)
    return created
  }

  internal func createBoxDashEffect(style BorderStyle, width float32) SKPathEffect {
    let dotted = style == BorderStyle.Dotted
    let intervals = []float32{ dotted ? 0.0F : width * 3.0F, width * 2.0F }
    guard let created = SKPathEffect.CreateDash(intervals, 0.0F) else {
      throw NotSupportedException("Painter.createBoxDashEffect: CreateDash failed")
    }
    return created
  }

  private func boxPaintScratch(ref scratch BoxPaintScratch?) BoxPaintScratch {
    if scratch == nil {
      scratch = BoxPaintScratch()
    }
    return scratch!!
  }

  private func disposeBoxScratch(ref scratch BoxPaintScratch?) {
    guard let value = scratch else {
      return
    }
    scratch = nil
    if let path = value.Path {
      value.Path = nil
      path.Dispose()
    }
    if let roundRect = value.RoundRect {
      value.RoundRect = nil
      value.Radii = nil
      roundRect.Dispose()
    }
    if let effects = value.DashEffects {
      value.DashEffects = nil
      for effect in effects.Values {
        effect.Dispose()
      }
    }
  }

  private func blurFilter(blur float32) SKMaskFilter {
    let sigma = blur * 0.5F
    if let filters = blurFilters {
      if filters.TryGetValue(sigma, out var existing) {
        return existing
      }
    }
    guard let created = SKMaskFilter.CreateBlur(SKBlurStyle.Normal, sigma) else {
      throw NotSupportedException("Painter.blurFilter: SKMaskFilter.CreateBlur failed")
    }
    if blurFilters == nil {
      blurFilters = Dictionary[float32, SKMaskFilter](4)
    }
    if let filters = blurFilters {
      filters.Add(sigma, created)
    }
    return created
  }

  private func disposeBlurFilters() {
    if let filters = blurFilters {
      blurFilters = nil
      for filter in filters.Values {
        filter.Dispose()
      }
    }
  }

  private func cachedGradientShader(gradient Gradient, width float32, height float32) SKShader? {
    let key = GradientShaderKey{ Source: gradient, Width: width, Height: height }
    if let shaders = gradientShaders {
      if shaders.TryGetValue(key, out var existing) {
        return existing
      }
      if shaders.Count >= gradientShaderCacheLimit {
        return nil
      }
    }
    let created = GradientSkia.ToShader(gradient, SKRect.Create(0.0F, 0.0F, width, height))
    if gradientShaders == nil {
      gradientShaders = Dictionary[GradientShaderKey, SKShader](4, GradientShaderKeyComparer.Instance)
    }
    if let shaders = gradientShaders {
      shaders.Add(key, created)
    }
    return created
  }

  private func disposeGradientShaders() {
    if let shaders = gradientShaders {
      gradientShaders = nil
      for shader in shaders.Values {
        shader.Dispose()
      }
    }
  }

  // Opacity < 1 wraps self+children in one SaveLayer; SaveLayer's blend
  // uses only the paint's alpha, so a white paint with alpha=Opacity*255 works.
  internal func paintNode(n Node, canvas SKCanvas, ref cull PaintCullState, ref boxScratch BoxPaintScratch?) {
    if n.PaintInputHidden {
      return
    }
    let transformed = n.HasVisualTransform
    let clipsPath = n.HasClipPath
    let editorClip = n.Kind == NodeKind.Editor
    let clips = editorClip || (n.Kind == NodeKind.Container || n.Kind == NodeKind.Button)
      && (n.OverflowX != Overflow.Visible || n.OverflowY != Overflow.Visible)
    var xBounded = true
    var yBounded = true
    if !clipsPath && n.Kind == NodeKind.Text {
      xBounded = (n.TextTrimming == TextTrimming.Ellipsis && n.TextWrap == TextWrap.NoWrap)
        || n.OverflowX != Overflow.Visible
      yBounded = n.OverflowY != Overflow.Visible
    } else if !clipsPath && n.Kind == NodeKind.Editor {
      xBounded = true
      yBounded = true
    }
    var drawSelf = true
    if cull.Active && (transformed
      || (xBounded && (n.Rect.X + n.Rect.W <= cull.Left || n.Rect.X >= cull.Right))
      || (yBounded && (n.Rect.Y + n.Rect.H <= cull.Top || n.Rect.Y >= cull.Bottom))) {
      let bounds = selfBounds(n)
      if cullOutside(bounds, cull.Left, cull.Top, cull.Right, cull.Bottom) {
        if cullSubtreeBounded(n) {
          return
        }
        drawSelf = false
      }
    }
    let changesCull = transformed || clipsPath || clips
    var savedCull = PaintCullState{}
    if changesCull { savedCull = cull }
    let blended = n.BlendMode != BlendMode.Normal
    let layered = n.Opacity < 1.0 || blended
    if layered {
      using let layerPaint = SKPaint{ Color: SKColor(uint32(clamp255(float32(n.Opacity))) << 24) }
      if blended { layerPaint.BlendMode = skBlendMode(n.BlendMode) }
      canvas.SaveLayer(layerPaint)
    }
    if transformed {
      canvas.Save()
      applyTransform(n, canvas)
      cull.Active = false
    }
    if clipsPath {
      canvas.Save()
      ClipPathGeometry.Apply(n, canvas)
      if cull.Active {
        if n.Rect.X > cull.Left { cull.Left = n.Rect.X }
        if n.Rect.Y > cull.Top { cull.Top = n.Rect.Y }
        if n.Rect.X + n.Rect.W < cull.Right { cull.Right = n.Rect.X + n.Rect.W }
        if n.Rect.Y + n.Rect.H < cull.Bottom { cull.Bottom = n.Rect.Y + n.Rect.H }
      }
    }
    if drawSelf {
      switch n.Kind {
        case NodeKind.Container { paintContainer(n, canvas, ref boxScratch) }
        case NodeKind.Button { paintContainer(n, canvas, ref boxScratch) }
        case NodeKind.Text {
          paintContainer(n, canvas, ref boxScratch)
          paintText(n, canvas)
        }
        case NodeKind.Entry { paintEntry(n, canvas, ref boxScratch) }
        case NodeKind.Editor {
          paintContainer(n, canvas, ref boxScratch)
          paintEditor(n, canvas)
        }
        case NodeKind.Shape { paintShape(n, canvas) }
        case NodeKind.Image {
          paintContainer(n, canvas, ref boxScratch)
          paintImage(n, canvas)
        }
        default { throw NotSupportedException("Painter.paintNode: unhandled NodeKind " + n.Kind.ToString()) }
      }
    }
    if clips {
      canvas.Save()
      if editorClip {
        canvas.ClipRect(SKRect.Create(TextLayouts.ContentLeft(n), TextLayouts.ContentTop(n),
          TextLayouts.ContentWidth(n), TextLayouts.ContentHeight(n)), SKClipOperation.Intersect, true)
      }
      else { applyOverflowClip(n, canvas, ref boxScratch) }
      if cull.Active {
        let clipLeft = editorClip ? TextLayouts.ContentLeft(n) : n.Rect.X
        let clipTop = editorClip ? TextLayouts.ContentTop(n) : n.Rect.Y
        let clipRight = editorClip ? clipLeft + TextLayouts.ContentWidth(n) : n.Rect.X + n.Rect.W
        let clipBottom = editorClip ? clipTop + TextLayouts.ContentHeight(n) : n.Rect.Y + n.Rect.H
        if editorClip || n.OverflowX != Overflow.Visible {
          if clipLeft > cull.Left { cull.Left = clipLeft }
          if clipRight < cull.Right { cull.Right = clipRight }
        }
        if editorClip || n.OverflowY != Overflow.Visible {
          if clipTop > cull.Top { cull.Top = clipTop }
          if clipBottom < cull.Bottom { cull.Bottom = clipBottom }
        }
      }
    }
    let children = Stacking.Children(n)
    for i in 0 ... children.Count {
      paintNode(children[i], canvas, ref cull, ref boxScratch)
    }
    if clips {
      canvas.Restore()
      if drawSelf { paintScrollBars(n, canvas) }
    }
    if drawSelf && n.HasOutlineState { paintOutline(n, canvas, ref boxScratch) }
    if clipsPath {
      canvas.Restore()
    }
    if transformed {
      canvas.Restore()
    }
    if layered {
      canvas.Restore()
    }
    if changesCull { cull = savedCull }
  }

  private func cullSubtreeBounded(n Node) bool {
    if n.Children.Count == 0 { return true }
    if n.HasClipPath { return true }
    if n.Kind == NodeKind.Editor { return true }
    return (n.Kind == NodeKind.Container || n.Kind == NodeKind.Button)
      && n.OverflowX != Overflow.Visible && n.OverflowY != Overflow.Visible
  }

  internal func skBlendMode(mode BlendMode) SKBlendMode {
    switch mode {
      case BlendMode.Multiply { return SKBlendMode.Multiply }
      case BlendMode.Screen { return SKBlendMode.Screen }
      case BlendMode.Overlay { return SKBlendMode.Overlay }
      case BlendMode.Darken { return SKBlendMode.Darken }
      case BlendMode.Lighten { return SKBlendMode.Lighten }
      case BlendMode.ColorDodge { return SKBlendMode.ColorDodge }
      case BlendMode.ColorBurn { return SKBlendMode.ColorBurn }
      case BlendMode.HardLight { return SKBlendMode.HardLight }
      case BlendMode.SoftLight { return SKBlendMode.SoftLight }
      case BlendMode.Difference { return SKBlendMode.Difference }
      case BlendMode.Exclusion { return SKBlendMode.Exclusion }
      case BlendMode.Hue { return SKBlendMode.Hue }
      case BlendMode.Saturation { return SKBlendMode.Saturation }
      case BlendMode.Color { return SKBlendMode.Color }
      case BlendMode.Luminosity { return SKBlendMode.Luminosity }
      case _ { return SKBlendMode.SrcOver }
    }
    return SKBlendMode.SrcOver
  }

  internal func applyTransform(n Node, canvas SKCanvas) {
    let value = TransformGeometry.Matrix(n)
    let matrix = SKMatrix{
      ScaleX: value.A,
      SkewX: value.B,
      TransX: value.TX,
      SkewY: value.C,
      ScaleY: value.D,
      TransY: value.TY,
      Persp2: 1.0F,
    }
    canvas.Concat(in matrix)
  }

  // Rounded clip when the node has a radius so content can't square the corners.
  internal func applyClip(n Node, canvas SKCanvas, ref boxScratch BoxPaintScratch?) {
    let rect = SKRect.Create(n.Rect.X, n.Rect.Y, n.Rect.W, n.Rect.H)
    if !hasRadius(n) {
      canvas.ClipRect(rect, SKClipOperation.Intersect, true)
      return
    }
    let rr = boxRoundRect(ref boxScratch, rect, n)
    canvas.ClipRoundRect(rr, SKClipOperation.Intersect, true)
  }

  internal func applyOverflowClip(n Node, canvas SKCanvas, ref boxScratch BoxPaintScratch?) {
    if n.OverflowX != Overflow.Visible && n.OverflowY != Overflow.Visible {
      applyClip(n, canvas, ref boxScratch)
      return
    }
    applyAxisClip(
      canvas,
      SKRect.Create(n.Rect.X, n.Rect.Y, n.Rect.W, n.Rect.H),
      n.OverflowX != Overflow.Visible,
      n.OverflowY != Overflow.Visible)
  }

  internal func applyAxisClip(canvas SKCanvas, rect SKRect, clipX bool, clipY bool) {
    let current = canvas.LocalClipBounds
    let left = clipX ? rect.Left : current.Left
    let top = clipY ? rect.Top : current.Top
    let right = clipX ? rect.Right : current.Right
    let bottom = clipY ? rect.Bottom : current.Bottom
    canvas.ClipRect(SKRect.Create(left, top, right - left, bottom - top), SKClipOperation.Intersect, true)
  }

  // Overlay thumb: 4px bar inset 2px, min 24px, white at 0.35 x ScrollBarAlpha.
  internal func paintScrollBars(n Node, canvas SKCanvas) {
    if (n.OverflowX != Overflow.Scroll && n.OverflowY != Overflow.Scroll) || n.ScrollBarAlpha <= 0.0F {
      return
    }
    if n.OverflowY == Overflow.Scroll && n.ContentH > n.Rect.H {
      let track = n.Rect.H - 4.0F
      if track > 0.0F && n.Rect.W > 0.0F {
        var thumb = track * n.Rect.H / n.ContentH
        if thumb < 24.0F { thumb = 24.0F }
        if thumb > track { thumb = track }
        let y = n.Rect.Y + 2.0F + (track - thumb) * (n.ScrollY / maxScrollY(n))
        let barWidth = n.Rect.W < 4.0F ? n.Rect.W : 4.0F
        let crossOffset = n.Rect.W > 6.0F ? n.Rect.W - 6.0F : 0.0F
        drawThumb(canvas, n.Rect.X + crossOffset, y, barWidth, thumb, n.ScrollBarAlpha)
      }
    }
    if n.OverflowX == Overflow.Scroll && n.ContentW > n.Rect.W {
      let track = n.Rect.W - 4.0F
      if track > 0.0F && n.Rect.H > 0.0F {
        var thumb = track * n.Rect.W / n.ContentW
        if thumb < 24.0F { thumb = 24.0F }
        if thumb > track { thumb = track }
        let x = n.Rect.X + 2.0F + (track - thumb) * (n.ScrollX / maxScrollX(n))
        let barHeight = n.Rect.H < 4.0F ? n.Rect.H : 4.0F
        let crossOffset = n.Rect.H > 6.0F ? n.Rect.H - 6.0F : 0.0F
        drawThumb(canvas, x, n.Rect.Y + crossOffset, thumb, barHeight, n.ScrollBarAlpha)
      }
    }
  }

  internal func drawThumb(canvas SKCanvas, x float32, y float32, w float32, h float32, alpha float32) {
    let p = resetPaint()
    p.Color = SKColor(uint32(clamp255(alpha * 0.35F)) << 24 | uint32(0x00FFFFFF))
    p.IsAntialias = true
    using let rr = SKRoundRect(SKRect.Create(x, y, w, h), 2.0F)
    canvas.DrawRoundRect(rr, p)
  }

  internal func backgroundImage(n Node) DecodedImage? {
    if !isApplied(n, StyleField.BackgroundImage)
      && !isApplied(n, StyleField.BackgroundImageSource) { return nil }
    guard let image = BackgroundImageLayouts.Image(n) else { return nil }
    return image.IsValid && image.Width > 0 && image.Height > 0 ? image : nil
  }

  internal func fittedImageRect(rect SKRect, image DecodedImage, fit ImageFit) SKRect {
    let sourceWidth = float32(image.Width)
    let sourceHeight = float32(image.Height)
    var width = rect.Width
    var height = rect.Height
    if fit == ImageFit.Contain || fit == ImageFit.Cover {
      let scaleX = rect.Width / sourceWidth
      let scaleY = rect.Height / sourceHeight
      let scale = if fit == ImageFit.Contain {
        scaleX < scaleY ? scaleX : scaleY
      } else {
        scaleX > scaleY ? scaleX : scaleY
      }
      width = sourceWidth * scale
      height = sourceHeight * scale
    } else if fit == ImageFit.None {
      width = sourceWidth
      height = sourceHeight
    }
    return SKRect.Create(rect.Left + (rect.Width - width) * 0.5F,
      rect.Top + (rect.Height - height) * 0.5F, width, height)
  }

  internal func drawImage(image DecodedImage, canvas SKCanvas, destination SKRect) {
    image.Draw(canvas, destination.Left, destination.Top, destination.Width, destination.Height,
      destination.Width < float32(image.Width) || destination.Height < float32(image.Height))
  }

  internal func insetRadius(radius float32, xInset float32, yInset float32) float32 {
    let inset = xInset > yInset ? xInset : yInset
    let result = radius - inset
    return result > 0.0F ? result : 0.0F
  }

  internal func nonNegative(value float32) float32 {
    return value > 0.0F ? value : 0.0F
  }

  internal func isApplied(n Node, f StyleField) bool {
    return styleMaskHas(n.AppliedMask, f)
  }

  internal func hasRadius(n Node) bool {
    return cornerPx(n.BorderTopLeftRadius, n.BorderRadius) > 0.0F
      || cornerPx(n.BorderTopRightRadius, n.BorderRadius) > 0.0F
      || cornerPx(n.BorderBottomLeftRadius, n.BorderRadius) > 0.0F
      || cornerPx(n.BorderBottomRightRadius, n.BorderRadius) > 0.0F
  }

  // Per-corner Length wins when set; an Unset corner falls back to the shorthand BorderRadius.
  internal func cornerPx(corner Length, fallback Length) float32 {
    return corner.Unit == LengthUnit.Unset ? resolvePx(fallback) : resolvePx(corner)
  }

  // SKRoundRectCorner order is UpperLeft, UpperRight, LowerRight, LowerLeft.
  internal func buildRoundRect(rect SKRect, n Node) SKRoundRect {
    let tl = cornerPx(n.BorderTopLeftRadius, n.BorderRadius)
    let tr = cornerPx(n.BorderTopRightRadius, n.BorderRadius)
    let br = cornerPx(n.BorderBottomRightRadius, n.BorderRadius)
    let bl = cornerPx(n.BorderBottomLeftRadius, n.BorderRadius)
    let rr = SKRoundRect()
    rr.SetRectRadii(rect, []SKPoint{ SKPoint(tl, tl), SKPoint(tr, tr), SKPoint(br, br), SKPoint(bl, bl) })
    return rr
  }

  // Only Px is meaningful for BorderRadius/FontSize today; Percent/Auto/Unset
  // fold to 0 rather than inventing a resolution scheme here.
  internal func resolvePx(l Length) float32 {
    return l.Unit == LengthUnit.Px ? l.Value : 0.0F
  }

  // The returned SKImage must outlive the surface it snapshots from, so the
  // surface is disposed via defer after Snapshot() has already copied out.
  internal func RenderOffscreen(root Node, width int32, height int32) SKImage {
    using let linearColorSpace = SKColorSpace.CreateSrgbLinear()
    let linearInfo = SKImageInfo(width, height, SKColorType.Srgba8888, SKAlphaType.Premul, linearColorSpace)
    guard let surface = SKSurface.Create(linearInfo) else {
      throw NotSupportedException("Painter.RenderOffscreen: SKSurface.Create failed")
    }
    defer surface.Dispose()
    guard let canvas = surface.Canvas else {
      throw NotSupportedException("Painter.RenderOffscreen: surface has no canvas")
    }
    canvas.Clear(SKColors.Black)
    Paint(root, canvas)
    canvas.Flush()
    guard let linearImage = surface.Snapshot() else {
      throw NotSupportedException("Painter.RenderOffscreen: Snapshot failed")
    }
    using let source = linearImage
    using let srgbColorSpace = SKColorSpace.CreateSrgb()
    let srgbInfo = SKImageInfo(width, height, SKColorType.Srgba8888, SKAlphaType.Premul, srgbColorSpace)
    guard let srgbSurface = SKSurface.Create(srgbInfo) else {
      throw NotSupportedException("Painter.RenderOffscreen: sRGB surface creation failed")
    }
    defer srgbSurface.Dispose()
    guard let srgbCanvas = srgbSurface.Canvas else {
      throw NotSupportedException("Painter.RenderOffscreen: sRGB surface has no canvas")
    }
    srgbCanvas.DrawImage(source, 0.0F, 0.0F)
    srgbCanvas.Flush()
    guard let image = srgbSurface.Snapshot() else {
      throw NotSupportedException("Painter.RenderOffscreen: sRGB snapshot failed")
    }
    return image
  }
}

internal func caretVisible(n Node) bool {
  return n.BlinkT - Math.Floor(n.BlinkT) < 0.5
}
