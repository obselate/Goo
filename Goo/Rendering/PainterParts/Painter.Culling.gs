package Goo

internal struct CullBounds {
  internal var XBounded bool
  internal var Left float32
  internal var Right float32
  internal var YBounded bool
  internal var Top float32
  internal var Bottom float32
}

internal partial class Painter {
  internal func selfBounds(n Node) CullBounds {
    var left = n.Rect.X
    var top = n.Rect.Y
    var right = n.Rect.X + n.Rect.W
    var bottom = n.Rect.Y + n.Rect.H
    var xBounded = true
    var yBounded = true
    var needsShapeOuterShadowRasterPad = false

    if n.HasClipPath {
      return transformedBounds(n, left, top, right, bottom, true, true)
    }
    if n.Kind == NodeKind.Shape {
      let mapping = ShapeGeometry.Map(n)
      let image = backgroundImage(n)
      let hasFill = shapeHasFill(n, image, shapeGradient(n))
      let strokeWidth = resolvePx(n.BorderLeftWidth)
      let hasOuterShadows = hasOuterBoxShadows(n)
      if !hasOuterShadows {
        ShapeGeometry.Trim(n, hasFill, strokeWidth > 0.0F, false, false)
        let clip = ShapeGeometry.ClipRect(n, mapping)
        left = clip.Left
        top = clip.Top
        right = clip.Right
        bottom = clip.Bottom
      } else {
        let dashed = hasDashes(n)
        let needsEffects = shapeNeedsEffects(n, hasFill, strokeWidth, dashed)
        let effects = if needsEffects { ShapePathEffects.For(n) } else { nil }
        ShapeGeometry.Trim(n, hasFill, strokeWidth > 0.0F, true, true)
        if let silhouette = ShapeGeometry.ShadowSilhouette(n, mapping, hasFill, effects) {
          if !silhouette.IsEmpty {
            let bounds = silhouette.TightBounds
            left = bounds.Left
            top = bounds.Top
            right = bounds.Right
            bottom = bounds.Bottom
            let expanded = expandShapeOuterShadows(n, left, top, right, bottom)
            left = expanded.Left
            top = expanded.Top
            right = expanded.Right
            bottom = expanded.Bottom
            needsShapeOuterShadowRasterPad = true
          }
        }
      }
    } else {
      let count = boxShadowCount(n.BoxShadows)
      for var i = count; i > 0; i-- {
        let shadow = boxShadowAt(n.BoxShadows, i - 1)
        if shadow.Inset || shadow.Color.A <= 0.0F { continue }
        let blur = resolvePx(shadow.Blur)
        let spread = resolvePx(shadow.Spread)
        let extend = (spread > 0.0F ? spread : 0.0F) + (blur > 0.0F ? blur * 2.0F + 2.0F : 0.0F)
        let ox = resolvePx(shadow.OffsetX)
        let oy = resolvePx(shadow.OffsetY)
        if n.Rect.X + ox - extend < left { left = n.Rect.X + ox - extend }
        if n.Rect.Y + oy - extend < top { top = n.Rect.Y + oy - extend }
        if n.Rect.X + n.Rect.W + ox + extend > right { right = n.Rect.X + n.Rect.W + ox + extend }
        if n.Rect.Y + n.Rect.H + oy + extend > bottom { bottom = n.Rect.Y + n.Rect.H + oy + extend }
      }
      if n.Kind == NodeKind.Text {
        xBounded = (n.TextTrimming == TextTrimming.Ellipsis && n.TextWrap == TextWrap.NoWrap)
          || n.OverflowX != Overflow.Visible
        yBounded = n.OverflowY != Overflow.Visible
      }
    }

    if n.HasOutlineState {
      if let outline = Outlining.Get(n) {
        let width = resolvePx(outline.Width)
        if width > 0.0F && outline.Color.A > 0.0F {
          let offset = resolvePx(outline.Offset)
          let inflate = offset > -width ? offset + width : 0.0F
          if n.Rect.X - inflate < left { left = n.Rect.X - inflate }
          if n.Rect.Y - inflate < top { top = n.Rect.Y - inflate }
          if n.Rect.X + n.Rect.W + inflate > right { right = n.Rect.X + n.Rect.W + inflate }
          if n.Rect.Y + n.Rect.H + inflate > bottom { bottom = n.Rect.Y + n.Rect.H + inflate }
        }
      }
    }
    var bounds = transformedBounds(n, left, top, right, bottom, xBounded, yBounded)
    if needsShapeOuterShadowRasterPad {
      bounds.Left = bounds.Left - shapeOuterShadowRasterPad
      bounds.Top = bounds.Top - shapeOuterShadowRasterPad
      bounds.Right = bounds.Right + shapeOuterShadowRasterPad
      bounds.Bottom = bounds.Bottom + shapeOuterShadowRasterPad
    }
    return bounds
  }

  internal func cullOutside(b CullBounds, left float32, top float32,
    right float32, bottom float32) bool {
    if b.XBounded && (b.Right <= left || b.Left >= right) { return true }
    if b.YBounded && (b.Bottom <= top || b.Top >= bottom) { return true }
    return false
  }

  private func expandShapeOuterShadows(n Node, left float32, top float32,
    right float32, bottom float32) CullBounds {
    var result = CullBounds{ XBounded: true, Left: left, Right: right,
      YBounded: true, Top: top, Bottom: bottom }
    let count = boxShadowCount(n.BoxShadows)
    for var i = count; i > 0; i-- {
      let shadow = boxShadowAt(n.BoxShadows, i - 1)
      if shadow.Inset || shadow.Color.A <= 0.0F { continue }
      let spread = resolvePx(shadow.Spread)
      let blur = resolvePx(shadow.Blur)
      let spreadExtend = spread > 0.0F ? spread * shapeOuterShadowSpreadMiterLimit : 0.0F
      let blurExtend = blur > 0.0F ? blur * 2.0F + 2.0F : 0.0F
      let extend = spreadExtend + blurExtend
      let ox = resolvePx(shadow.OffsetX)
      let oy = resolvePx(shadow.OffsetY)
      let shadowLeft = left + ox - extend
      let shadowTop = top + oy - extend
      let shadowRight = right + ox + extend
      let shadowBottom = bottom + oy + extend
      if shadowLeft < result.Left { result.Left = shadowLeft }
      if shadowTop < result.Top { result.Top = shadowTop }
      if shadowRight > result.Right { result.Right = shadowRight }
      if shadowBottom > result.Bottom { result.Bottom = shadowBottom }
    }
    return result
  }

  private func transformedBounds(n Node, left float32, top float32, right float32,
    bottom float32, xBounded bool, yBounded bool) CullBounds {
    if n.HasVisualTransform {
      let mapped = TransformGeometry.BoundsToWindow(n, left, top, right - left, bottom - top)
      return CullBounds{ XBounded: xBounded, Left: mapped.X, Right: mapped.X + mapped.W,
        YBounded: yBounded, Top: mapped.Y, Bottom: mapped.Y + mapped.H }
    }
    return CullBounds{ XBounded: xBounded, Left: left, Right: right,
      YBounded: yBounded, Top: top, Bottom: bottom }
  }
}
