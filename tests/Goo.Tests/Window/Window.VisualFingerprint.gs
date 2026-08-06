package Goo

import System
import System.Runtime.CompilerServices

// Test and benchmark oracle. This file is linked only into test Goo builds.
public partial class Window {
  internal func UpdateTreeForPresentation(dt float64) bool {
    let before = visualFingerprint()
    UpdateTree(dt)
    return before != visualFingerprint()
  }

  internal func visualFingerprint() uint64 {
    guard let n = node else { return 0 }
    return fingerprintNode(n, uint64(1469598103934665603))
  }

  private func fingerprintNode(n Node, seed uint64) uint64 {
    var h = mix(seed, uint64(int32(n.Kind)))
    let paintInputState = n.PaintInputState
    h = mix(h, uint64(paintInputState))
    h = mix(h, uint64(n.ZIndex))
    if paintInputState != 0 { return h }
    h = hashRect(h, n.Rect)
    h = mix(h, uint64(int32(n.OverflowX)))
    h = mix(h, uint64(int32(n.OverflowY)))
    h = hashDouble(h, n.Opacity)
    h = mix(h, uint64(int32(n.BlendMode)))
    let transformed = n.HasVisualTransform
    h = mix(h, transformed ? uint64(1) : uint64(0))
    if transformed {
      if let value = Transforming.Get(n) {
        h = hashLength(h, value.TranslateX)
        h = hashLength(h, value.TranslateY)
        h = hashFloat(h, value.Rotate)
        h = hashFloat(h, value.Scale)
        h = hashFloat(h, value.ScaleX)
        h = hashFloat(h, value.ScaleY)
        h = hashFloat(h, value.SkewX)
        h = hashFloat(h, value.SkewY)
        h = hashLength(h, value.OriginX)
        h = hashLength(h, value.OriginY)
      }
    }
    let clipsPath = n.HasClipPath
    if clipsPath {
      h = mix(h, uint64(1))
      if let clip = ClipPaths.Get(n) {
        h = mix(h, clip.Path.Hash)
        h = mix(h, uint64(int32(clip.Fit)))
      }
    }
    let background = applied(n, StyleField.BackgroundColor)
    h = mix(h, background ? uint64(1) : uint64(0))
    if background { h = hashColor(h, n.BackgroundColor) }
    let gradient = applied(n, StyleField.BackgroundGradient) && n.BackgroundGradient != nil
    h = mix(h, gradient ? uint64(1) : uint64(0))
    if gradient {
      if let value = n.BackgroundGradient { h = hashGradient(h, value) }
    }
    let backgroundPath = BackgroundImageLayouts.Path(n)
    var backgroundSource ImageSourceProvider?
    if applied(n, StyleField.BackgroundImageSource) {
      backgroundSource = BackgroundImageLayouts.Source(n)
    }
    let sourceImage = backgroundSource != nil
    let backgroundImage = sourceImage
      || (applied(n, StyleField.BackgroundImage) && backgroundPath != "")
    h = mix(h, sourceImage ? uint64(2) : backgroundImage ? uint64(1) : uint64(0))
    if backgroundImage {
      if let source = backgroundSource {
        h = mix(h, uint64(RuntimeHelpers.GetHashCode(source)))
      } else {
        h = hashString(h, backgroundPath)
      }
      h = mix(h, uint64(int32(n.BackgroundImageFit)))
      if let image = BackgroundImageLayouts.Image(n) {
        h = mix(h, image.IsValid ? uint64(1) : uint64(2))
        h = mix(h, uint64(image.Width))
        h = mix(h, uint64(image.Height))
      } else {
        h = mix(h, uint64(0))
      }
    }
    let border = if n.Kind == NodeKind.Shape {
      borderVisible(n.BorderLeftWidth)
    } else {
      borderVisible(n.BorderLeftWidth) || borderVisible(n.BorderTopWidth)
        || borderVisible(n.BorderRightWidth) || borderVisible(n.BorderBottomWidth)
    }
    h = mix(h, border ? uint64(1) : uint64(0))
    if border {
      if n.Kind == NodeKind.Shape {
        h = hashLength(h, n.BorderLeftWidth)
        h = hashColor(h, n.BorderLeftColor)
      } else {
        h = mix(h, uint64(int32(n.BorderStyle)))
        h = hashLength(h, n.BorderLeftWidth)
        h = hashLength(h, n.BorderTopWidth)
        h = hashLength(h, n.BorderRightWidth)
        h = hashLength(h, n.BorderBottomWidth)
        h = hashColor(h, n.BorderLeftColor)
        h = hashColor(h, n.BorderTopColor)
        h = hashColor(h, n.BorderRightColor)
        h = hashColor(h, n.BorderBottomColor)
      }
    }
    let shadow = applied(n, StyleField.BoxShadows)
    h = mix(h, shadow ? uint64(1) : uint64(0))
    if shadow {
      let count = boxShadowCount(n.BoxShadows)
      h = mix(h, uint64(count))
      for i in 0 ... count {
        let value = boxShadowAt(n.BoxShadows, i)
        h = hashColor(h, value.Color)
        h = hashLength(h, value.OffsetX)
        h = hashLength(h, value.OffsetY)
        h = hashLength(h, value.Blur)
        h = hashLength(h, value.Spread)
        h = mix(h, value.Inset ? uint64(1) : uint64(0))
      }
    }
    var outline OutlineValue? = nil
    if n.Kind != NodeKind.Shape && n.HasOutlineState { outline = Outlining.Get(n) }
    var outlined = false
    if let value = outline {
      outlined = borderVisible(value.Width) && value.Color.A > 0.0F
      if outlined {
        h = mix(h, uint64(1))
        h = hashLength(h, value.Width)
        h = hashColor(h, value.Color)
        h = hashLength(h, value.Offset)
      }
    }
    let corners = background || gradient || backgroundImage || border || shadow || outlined
      || n.Kind == NodeKind.Image
      || ((n.Kind == NodeKind.Container || n.Kind == NodeKind.Button)
        && (n.OverflowX != Overflow.Visible || n.OverflowY != Overflow.Visible))
    h = mix(h, corners ? uint64(1) : uint64(0))
    if corners {
      h = hashLength(h, n.BorderRadius)
      h = hashLength(h, n.BorderTopLeftRadius)
      h = hashLength(h, n.BorderTopRightRadius)
      h = hashLength(h, n.BorderBottomLeftRadius)
      h = hashLength(h, n.BorderBottomRightRadius)
    }
    if n.Kind == NodeKind.Text {
      h = hashText(h, n, n.Content)
    } else if n.Kind == NodeKind.Entry {
      h = hashEntry(h, n)
    } else if n.Kind == NodeKind.Shape {
      h = hashShape(h, n)
    } else if n.Kind == NodeKind.Image {
      h = hashImage(h, n)
    }
    if n.OverflowX == Overflow.Scroll || n.OverflowY == Overflow.Scroll {
      h = hashFloat(h, n.ScrollX)
      h = hashFloat(h, n.ScrollY)
      h = hashFloat(h, n.ContentW)
      h = hashFloat(h, n.ContentH)
      h = hashFloat(h, n.ScrollBarAlpha)
    }
    for i in 0 ... n.Children.Count { h = fingerprintNode(n.Children[i], h) }
    return h
  }

  private func hashText(h uint64, n Node, content string) uint64 {
    if content == "" { return mix(h, 0) }
    var next = hashString(h, content)
    next = hashFont(next, n)
    next = mix(next, uint64(int32(n.TextWrap)))
    next = mix(next, uint64(int32(n.TextTrimming)))
    next = mix(next, uint64(n.TextMaxLines))
    next = mix(next, uint64(int32(n.TextTransform)))
    next = hashColor(next, n.Color)
    next = hashTextStroke(next, n)
    next = hashTextShadows(next, n)
    return hashPadding(next, n)
  }

  private func hashEntry(h uint64, n Node) uint64 {
    var next = hashString(h, n.Buffer)
    next = hashString(next, n.Placeholder)
    next = hashFont(next, n)
    next = hashColor(next, n.Color)
    if n.Buffer != "" || n.Placeholder != "" {
      next = hashTextStroke(next, n)
      next = hashTextShadows(next, n)
    }
    next = hashPadding(next, n)
    next = hashFloat(next, n.EditScrollX)
    let selected = n.Focused && n.Caret != n.Anchor
    let caret = n.Focused && n.BlinkT - Math.Floor(n.BlinkT) < 0.5
    next = mix(next, selected ? uint64(1) : uint64(0))
    next = mix(next, caret ? uint64(1) : uint64(0))
    if selected || caret {
      next = mix(next, uint64(n.Caret))
      next = mix(next, uint64(int32(n.CaretAffinity)))
    }
    if selected {
      next = mix(next, uint64(n.Anchor))
      next = mix(next, uint64(int32(n.AnchorAffinity)))
      next = hashColor(next, n.SelectionColor)
    }
    return next
  }

  private func hashTextShadows(h uint64, n Node) uint64 {
    let count = textShadowCount(n.TextShadows)
    var next = mix(h, uint64(count))
    for i in 0 ... count {
      let shadow = textShadowAt(n.TextShadows, i)
      next = hashColor(next, shadow.Color)
      next = hashLength(next, shadow.OffsetX)
      next = hashLength(next, shadow.OffsetY)
      next = hashLength(next, shadow.Blur)
    }
    return next
  }

  private func hashTextStroke(h uint64, n Node) uint64 {
    guard let stroke = TextStroking.Visible(n) else { return mix(h, uint64(0)) }
    var next = mix(h, uint64(1))
    next = hashLength(next, stroke.Width)
    return hashColor(next, stroke.Color)
  }

  private func hashShape(h uint64, n Node) uint64 {
    var next = mix(h, n.ShapePath.Hash)
    next = mix(next, uint64(int32(n.ShapeFit)))
    next = mix(next, uint64(int32(n.ShapeFillRule)))
    next = mix(next, uint64(int32(n.ShapeStrokeCap)))
    next = mix(next, uint64(int32(n.ShapeStrokeJoin)))
    next = hashDouble(next, n.MiterLimit)
    next = hashDouble(next, n.ShapeCornerRadius)
    next = hashPadding(next, n)
    if let dashes = n.Dashes {
      next = hashDouble(next, dashes.Offset)
      for i in 0 ... dashes.Intervals.Count { next = hashDouble(next, dashes.Intervals[i]) }
    }
    return next
  }

  private func hashImage(h uint64, n Node) uint64 {
    var next = hashString(h, n.ImagePath)
    next = mix(next, uint64(int32(n.ImageFit)))
    next = hashPadding(next, n)
    guard let image = n.DecodedImage else {
      return mix(next, 0)
    }
    next = mix(next, image.IsValid ? uint64(1) : uint64(2))
    next = mix(next, uint64(image.Width))
    return mix(next, uint64(image.Height))
  }

  private func hashFont(h uint64, n Node) uint64 {
    var next = hashString(h, n.FontFamily)
    next = hashLength(next, n.FontSize)
    next = hashDouble(next, n.FontWeight)
    next = mix(next, uint64(int32(n.FontStyle)))
    next = hashLength(next, n.LetterSpacing)
    next = hashDouble(next, n.LineHeight)
    next = mix(next, uint64(int32(n.TextDecoration)))
    next = mix(next, uint64(int32(n.Direction)))
    return mix(next, uint64(int32(n.TextAlign)))
  }

  private func hashPadding(h uint64, n Node) uint64 {
    var next = hashLength(h, n.Padding)
    next = hashLength(next, n.PaddingLeft)
    next = hashLength(next, n.PaddingTop)
    next = hashLength(next, n.PaddingRight)
    return hashLength(next, n.PaddingBottom)
  }

  private func hashRect(h uint64, rect Rect) uint64 {
    var next = hashFloat(h, rect.X)
    next = hashFloat(next, rect.Y)
    next = hashFloat(next, rect.W)
    return hashFloat(next, rect.H)
  }

  private func hashColor(h uint64, color Color) uint64 {
    var next = hashFloat(h, color.R)
    next = hashFloat(next, color.G)
    next = hashFloat(next, color.B)
    return hashFloat(next, color.A)
  }

  private func hashGradient(h uint64, gradient Gradient) uint64 {
    var next = switch gradient {
      case linear is LinearGradient: hashDouble(mix(h, uint64(1)), linear.Angle)
      case radial is RadialGradient: hashDouble(
        hashDouble(hashDouble(mix(h, uint64(2)), radial.CenterX), radial.CenterY), radial.Radius)
      case _: throw NotSupportedException("Window.hashGradient: unhandled gradient kind")
    }
    next = mix(next, uint64(gradient.Stops.Count))
    for i in 0 ... gradient.Stops.Count {
      next = hashDouble(next, gradient.Stops[i].Offset)
      next = hashColor(next, gradient.Stops[i].Color)
    }
    return next
  }

  private func hashLength(h uint64, length Length) uint64 {
    return hashFloat(mix(h, uint64(int32(length.Unit))), length.Value)
  }

  private func hashString(h uint64, value string) uint64 {
    var next = mix(h, uint64(value.Length))
    for i in 0 ... value.Length { next = mix(next, uint64(value[i])) }
    return next
  }

  private func hashFloat(h uint64, value float32) uint64 {
    return mix(h, uint64(uint32(BitConverter.SingleToInt32Bits(value))))
  }

  private func hashDouble(h uint64, value float64) uint64 {
    return mix(h, uint64(BitConverter.DoubleToInt64Bits(value)))
  }

  private func mix(h uint64, value uint64) uint64 {
    return (h ^ value) * uint64(1099511628211)
  }

  private func applied(n Node, field StyleField) bool {
    return styleMaskHas(n.AppliedMask, field)
  }

  private func borderVisible(width Length) bool {
    return width.Unit == LengthUnit.Px && width.Value > 0.0F
  }
}
