package Goo

import Goo.InternalTextInterop
import SkiaSharp

internal class RenderingFixtures {
  func PainterRendersSurfaceContracts() bool {
    let bordered = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 40, Height: 40,
      BackgroundColor: Color.Rgb(0, 0, 255), BorderWidth: 4, BorderColor: Color.Rgb(255, 0, 0) })
    Layout().Calculate(bordered, 40.0F, 40.0F)
    using let borderImage = Painter().RenderOffscreen(bordered, 40, 40)
    if !isRed(borderImage, 1, 20) || !isBlue(borderImage, 20, 20) { return false }

    let rounded = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 40, Height: 40,
      BackgroundColor: Color.Rgb(0, 0, 255), BorderTopLeftRadius: 16 })
    Layout().Calculate(rounded, 40.0F, 40.0F)
    using let roundImage = Painter().RenderOffscreen(rounded, 40, 40)
    if isBlue(roundImage, 1, 1) || !isBlue(roundImage, 38, 38) { return false }

    let translucent = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 40, Height: 40,
      BackgroundColor: Color.Rgb(0, 0, 255), Opacity: 0.5 })
    Layout().Calculate(translucent, 40.0F, 40.0F)
    using let opacityImage = Painter().RenderOffscreen(translucent, 40, 40)
    let blue = pixel(opacityImage, 20, 20).Blue
    if blue <= 180 || blue >= 195 { return false }

    let clamped = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 20, Height: 20, BackgroundColor: Color.Rgba(382, -128, 128, 255),
    })
    Layout().Calculate(clamped, 20.0F, 20.0F)
    using let clampedImage = Painter().RenderOffscreen(clamped, 20, 20)
    let clampedPixel = pixel(clampedImage, 10, 10)
    if clampedPixel.Red != 255 || clampedPixel.Green != 0 || clampedPixel.Blue != 128 { return false }

    let transparent = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 20, Height: 20, BackgroundColor: Color.Rgb(0, 255, 0), Children: {
        Container{ Width: 20, Height: 20, BackgroundColor: Color.Transparent },
      },
    })
    Layout().Calculate(transparent, 20.0F, 20.0F)
    using let transparentImage = Painter().RenderOffscreen(transparent, 20, 20)
    if !isGreen(transparentImage, 10, 10) { return false }

    let text = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "Hi", Width: 80, Height: 30, Color: Color.White,
      BackgroundColor: Color.Rgb(255, 0, 0),
    })
    Layout().Calculate(text, 80.0F, 30.0F)
    using let textImage = Painter().RenderOffscreen(text, 80, 30)
    return isRed(textImage, 75, 15) && countInkDifferentFrom(textImage, SKColor(255, 0, 0, 255)) > 0
  }

  func TextDecorationPaintContract() bool {
    let plain = decoratedText(TextDecoration.None)
    let underline = decoratedText(TextDecoration.Underline)
    let strike = decoratedText(TextDecoration.LineThrough)
    let combined = decoratedText(TextDecoration(3))
    let plainInk = nonBlackCount(plain)
    let underlineInk = nonBlackCount(underline)
    let strikeInk = nonBlackCount(strike)
    let combinedInk = nonBlackCount(combined)
    if underlineInk <= plainInk || strikeInk <= plainInk
      || combinedInk <= underlineInk || combinedInk <= strikeInk {
      return false
    }

    let entryPlain = decoratedEntry("Goo", TextDecoration.None)
    let entryUnderline = decoratedEntry("Goo", TextDecoration.Underline)
    let placeholderPlain = decoratedEntry("", TextDecoration.None)
    let placeholderUnderline = decoratedEntry("", TextDecoration.Underline)
    return nonBlackCount(entryUnderline) > nonBlackCount(entryPlain)
      && nonBlackCount(placeholderUnderline) > nonBlackCount(placeholderPlain)
  }

  private func decoratedText(decoration TextDecoration) Node {
    let n = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "Goo", Width: 160, Height: 50, FontFamily: "DejaVu Sans",
      FontSize: 24, Color: Color.White, TextDecoration: decoration,
    })
    Layout().Calculate(n, 160.0F, 50.0F)
    return n
  }

  private func decoratedEntry(value string, decoration TextDecoration) Node {
    let n = Reconciler{ Res: Resolver{} }.Mount(TextEntry{
      Value: value, Placeholder: "hint", Width: 160, Height: 50,
      FontFamily: "DejaVu Sans", FontSize: 24, Color: Color.White,
      TextDecoration: decoration,
    })
    Layout().Calculate(n, 160.0F, 50.0F)
    return n
  }

  func PainterUsesLinearOffscreenColors() []uint32 {
    let blendRoot = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 4, Height: 4, Children: {
      Container{ Width: 4, Height: 4, BackgroundColor: Color.Rgb(0, 0, 255), Opacity: 0.5 },
    } })
    Layout().Calculate(blendRoot, 4.0F, 4.0F)
    using let blendImage = Painter().RenderOffscreen(blendRoot, 4, 4)
    using let blendBitmap = SKBitmap.FromImage(blendImage)

    let solidRoot = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 4, Height: 4, BackgroundColor: Color.Rgb(30, 60, 90),
    })
    Layout().Calculate(solidRoot, 4.0F, 4.0F)
    using let solidImage = Painter().RenderOffscreen(solidRoot, 4, 4)
    using let solidBitmap = SKBitmap.FromImage(solidImage)
    return []uint32{ uint32(blendBitmap.GetPixel(2, 2)), uint32(solidBitmap.GetPixel(2, 2)) }
  }

  func PainterPlacesShadows() bool {
    let shadowRoot = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 60, Height: 60, Padding: 10, Children: {
      Container{ Width: 20, Height: 20, BackgroundColor: Color.Rgb(0, 0, 255),
        BoxShadow: BoxShadow{ OffsetX: 6, OffsetY: 6, Blur: 2, Color: Color.White } },
    } })
    Layout().Calculate(shadowRoot, 60.0F, 60.0F)
    using let shadowImage = Painter().RenderOffscreen(shadowRoot, 60, 60)
    if !hasInk(shadowImage, 33, 33) { return false }

    let collapsed = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 20, Height: 20, BoxShadow: BoxShadow{ Spread: -12, Color: Color.White },
    })
    Layout().Calculate(collapsed, 20.0F, 20.0F)
    using let collapsedImage = Painter().RenderOffscreen(collapsed, 20, 20)
    return !hasInk(collapsedImage, 10, 10)
  }

  func BoxShadowStackAndInsetContract() bool {
    let stacked = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 60,
      Height: 60,
      Padding: 20,
      BackgroundColor: Color.Black,
      Children: {
        Container{
          Width: 20,
          Height: 20,
          BackgroundColor: Color.Black,
          BoxShadows: []BoxShadow{
            BoxShadow{ OffsetX: 10, OffsetY: 10, Color: Color.Rgb(255, 0, 0) },
            BoxShadow{ OffsetX: 10, OffsetY: 10, Color: Color.Rgb(0, 0, 255) },
          },
        },
      },
    })
    Layout().Calculate(stacked, 60.0F, 60.0F)
    using let stackedImage = Painter().RenderOffscreen(stacked, 60, 60)
    if !isRed(stackedImage, 45, 45) {
      return false
    }

    let inset = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 30,
      Height: 30,
      BackgroundColor: Color.White,
      BorderWidth: 3,
      BorderColor: Color.Rgb(0, 0, 255),
      BoxShadow: BoxShadow{ Inset: true, OffsetX: 4, Color: Color.Rgb(255, 0, 0) },
    })
    Layout().Calculate(inset, 30.0F, 30.0F)
    using let insetImage = Painter().RenderOffscreen(inset, 30, 30)
    if !isBlue(insetImage, 1, 15) || !isRed(insetImage, 4, 15)
      || !isWhite(insetImage, 15, 15) {
      return false
    }

    let shaped = Reconciler{ Res: Resolver{} }.Mount(Shape{
      Width: 100,
      Height: 100,
      Path: circlePath(),
      BackgroundColor: Color.Rgb(255, 0, 0),
      BoxShadow: BoxShadow{ Inset: true, OffsetX: 15, Color: Color.White },
    })
    Layout().Calculate(shaped, 100.0F, 100.0F)
    using let shapedImage = Painter().RenderOffscreen(shaped, 100, 100)
    return isWhite(shapedImage, 10, 50)
      && isRed(shapedImage, 50, 50)
      && isBlack(shapedImage, 5, 5)
  }

  func ShapeShadowStackAndInsetPixelContract() bool {
    let node = Reconciler{ Res: Resolver{} }.Mount(Shape{
      Width: 100, Height: 100,
      Path: circlePath(),
      BackgroundColor: Color.Rgb(255, 0, 0),
      BorderWidth: 4,
      BorderColor: Color.Rgb(0, 255, 0),
      BoxShadows: []BoxShadow{
        BoxShadow{ OffsetX: 15, OffsetY: 15, Color: Color.White },
        BoxShadow{ Inset: true, OffsetX: 15, Color: Color.Rgb(0, 0, 255) },
      },
    })
    Layout().Calculate(node, 100.0F, 100.0F)
    using let image = Painter().RenderOffscreen(node, 100, 100)
    return isWhite(image, 95, 80)
      && isBlue(image, 10, 50)
      && isRed(image, 50, 50)
      && isGreen(image, 50, 1)
      && isBlack(image, 5, 5)
  }

  func ShapeShadowContract() bool {
    // Sharp offset shadow: white along the displaced circle silhouette only.
    // A box-rect halo would ink (20, 95); path shadows must leave it black.
    using let offsetImage = renderShadowCircle(BoxShadow{ OffsetX: 15, OffsetY: 15, Color: Color.White })
    if !isRed(offsetImage, 50, 50) || !isWhite(offsetImage, 95, 80)
      || !isBlack(offsetImage, 20, 95) || !isBlack(offsetImage, 5, 5) {
      return false
    }

    using let spreadImage = renderShadowCircle(BoxShadow{ Spread: 10, Color: Color.White })
    if !isWhite(spreadImage, 88, 88) || !isRed(spreadImage, 50, 50) {
      return false
    }

    using let insetImage = renderShadowCircle(BoxShadow{
      OffsetX: 15, OffsetY: 15, Spread: -10, Color: Color.White,
    })
    if !isWhite(insetImage, 90, 85) || !isBlack(insetImage, 95, 95)
      || !isRed(insetImage, 50, 50) {
      return false
    }

    let openLine = Reconciler{ Res: Resolver{} }.Mount(Shape{ Width: 100, Height: 100,
      Path: PathBuilder().MoveTo(0.2, 0.5).LineTo(0.8, 0.5).Build(),
      BorderWidth: 4, BorderColor: Color.Rgb(0, 0, 255),
      BoxShadow: BoxShadow{ OffsetX: 15, OffsetY: 15, Color: Color.White } })
    Layout().Calculate(openLine, 100.0F, 100.0F)
    using let openImage = Painter().RenderOffscreen(openLine, 100, 100)
    return isWhite(openImage, 65, 65) && isBlack(openImage, 95, 95)
      && isBlack(openImage, 5, 5) && isBlue(openImage, 50, 50)
  }

  private func renderShadowCircle(shadow BoxShadow) SKImage {
    let node = Reconciler{ Res: Resolver{} }.Mount(Shape{ Width: 100, Height: 100,
      Path: circlePath(),
      BackgroundColor: Color.Rgb(255, 0, 0),
      BoxShadow: shadow })
    Layout().Calculate(node, 100.0F, 100.0F)
    return Painter().RenderOffscreen(node, 100, 100)
  }

  private func circlePath() VectorPath {
    return PathBuilder()
      .MoveTo(0.5, 0.0)
      .ArcTo(0.5, 0.5, 0.0, false, true, 0.5, 1.0)
      .ArcTo(0.5, 0.5, 0.0, false, true, 0.5, 0.0)
      .Close()
      .Build()
  }

  func TextLayoutShapesAndPaints() bool {
    if !textMeasurementAndInvalidationContracts() { return false }
    if !textScriptAndAlignmentContracts() { return false }

    using let primary = TextShaping.Shape("a", "DejaVu Sans,Noto Color Emoji", 16.0F, 400, false, 0.0F, false)
    let primaryFamilies = TextShaping.RunFamilies(primary)
    if primaryFamilies.Length != 1 || primaryFamilies[0] != "DejaVu Sans" { return false }

    using let fallback = TextShaping.Shape("😀á", "Noto Color Emoji,DejaVu Sans", 16.0F, 400, false, 0.0F, false)
    let families = TextShaping.RunFamilies(fallback)
    let texts = TextShaping.RunTexts(fallback)
    return families.Length == 2 && families[0] != families[1]
      && texts.Length == 2 && texts[1] == "á"
  }

  func StaticTextWrapAndTrimmingFailure() int32 {
    if !staticTextWrapContracts() { return 1 }
    if !staticTextEllipsisContracts() { return 2 }
    if !staticTextEllipsisPaintContracts() { return 3 }
    if !staticTextModeInvalidationContracts() { return 4 }
    if !staticTextEllipsisReusesNodeLayout() { return 5 }
    return 0
  }

  func StaticTextMaxLinesFailure() int32 {
    if !staticTextMaxLinesLayoutContracts() { return 1 }
    if !staticTextMaxLinesCacheAndShapingContracts() { return 2 }
    if !staticTextMaxLinesPaintContracts() { return 3 }
    if !entryTextMaxLinesContract() { return 4 }
    return 0
  }

  func StaticTextTransformContract() bool {
    let upper = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "i I é É", Width: 100, FontFamily: "DejaVu Sans", FontSize: 20,
      TextTransform: TextTransform.Uppercase,
    })
    let upperLayout = TextLayouts.For(upper, 100.0F)
    if upper.Content != "i I é É" || upperLayout.Content != "i I é É"
      || upperLayout.Lines.Count != 1 || upperLayout.Lines[0].Content != "I I É É" {
      return false
    }

    let lower = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "i I é É", Width: 100, FontFamily: "DejaVu Sans", FontSize: 20,
      TextTransform: TextTransform.Lowercase,
    })
    let lowerLayout = TextLayouts.For(lower, 100.0F)
    if lower.Content != "i I é É" || lowerLayout.Content != "i I é É"
      || lowerLayout.Lines.Count != 1 || lowerLayout.Lines[0].Content != "i i é é" {
      return false
    }

    return staticTextTransformWrapAndTrimContract() && entryTextTransformContract()
  }

  private func staticTextTransformWrapAndTrimContract() bool {
    let wrapped = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "mmmm mmmm", Width: 74, FontFamily: "DejaVu Sans", FontSize: 20,
      TextTransform: TextTransform.Uppercase,
    })
    let expectedWrapped = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "MMMM MMMM", Width: 74, FontFamily: "DejaVu Sans", FontSize: 20,
    })
    let trimmed = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "mmmmmm", Width: 45, FontFamily: "DejaVu Sans", FontSize: 20,
      TextWrap: TextWrap.NoWrap, TextTrimming: TextTrimming.Ellipsis,
      TextTransform: TextTransform.Uppercase,
    })
    let expectedTrimmed = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "MMMMMM", Width: 45, FontFamily: "DejaVu Sans", FontSize: 20,
      TextWrap: TextWrap.NoWrap, TextTrimming: TextTrimming.Ellipsis,
    })
    return sameLineContents(TextLayouts.For(wrapped, 74.0F), TextLayouts.For(expectedWrapped, 74.0F))
      && sameLineContents(TextLayouts.For(trimmed, 45.0F), TextLayouts.For(expectedTrimmed, 45.0F))
  }

  private func entryTextTransformContract() bool {
    using let valuePlain = entryTextTransformImage("i I", "", TextTransform.None)
    using let valueTransformed = entryTextTransformImage("i I", "", TextTransform.Uppercase)
    using let placeholderPlain = entryTextTransformImage("", "i I", TextTransform.None)
    using let placeholderTransformed = entryTextTransformImage("", "i I", TextTransform.Uppercase)
    return samePixels(valuePlain, valueTransformed)
      && samePixels(placeholderPlain, placeholderTransformed)
  }

  private func entryTextTransformImage(value string, placeholder string, transform TextTransform) SKImage {
    let n = Reconciler{ Res: Resolver{} }.Mount(TextEntry{
      Value: value, Placeholder: placeholder, Width: 100, Height: 40,
      FontFamily: "DejaVu Sans", FontSize: 20, Color: Color.White,
      TextTransform: transform,
    })
    Layout().Calculate(n, 100.0F, 40.0F)
    return Painter().RenderOffscreen(n, 100, 40)
  }

  private func sameLineContents(left TextLayout, right TextLayout) bool {
    if left.Lines.Count != right.Lines.Count { return false }
    for i in 0 ... left.Lines.Count {
      if left.Lines[i].Content != right.Lines[i].Content { return false }
    }
    return true
  }

  private func staticTextWrapContracts() bool {
    let wrapped = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "alpha beta gamma",
      Width: 55,
      FontFamily: "DejaVu Sans",
      FontSize: 16,
    })
    let wrappedLayout = TextLayouts.For(wrapped, 55.0F)
    if wrappedLayout.Lines.Count <= 1 { return false }

    let hardLines = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "a  b\r\n\rz",
      Width: 25,
      FontFamily: "DejaVu Sans",
      FontSize: 16,
      TextWrap: TextWrap.NoWrap,
    })
    let hardLayout = TextLayouts.For(hardLines, 25.0F)
    if hardLayout.Lines.Count != 3
      || hardLayout.Lines[0].Content != "a  b"
      || hardLayout.Lines[1].Content != ""
      || hardLayout.Lines[2].Content != "z" {
      return false
    }

    let ignored = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "alpha beta gamma",
      Width: 55,
      FontFamily: "DejaVu Sans",
      FontSize: 16,
      TextTrimming: TextTrimming.Ellipsis,
    })
    let ignoredLayout = TextLayouts.For(ignored, 55.0F)
    return ignoredLayout.Lines.Count > 1
  }

  private func staticTextMaxLinesLayoutContracts() bool {
    let unlimited = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "one\ntwo\nthree",
      FontFamily: "DejaVu Sans",
      FontSize: 16,
    })
    let unlimitedLayout = TextLayouts.For(unlimited, -1.0F)
    if unlimited.TextMaxLines != 0 || unlimitedLayout.Lines.Count != 3
      || unlimitedLayout.Clamped {
      return false
    }

    let wrapped = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "alpha beta gamma delta epsilon",
      Width: 55,
      FontFamily: "DejaVu Sans",
      FontSize: 16,
      TextMaxLines: 2,
    })
    let wrappedLayout = TextLayouts.For(wrapped, 55.0F)
    if wrappedLayout.Lines.Count != 2 || !wrappedLayout.Clamped
      || wrappedLayout.Height != 2.0F * TextLayouts.resolvedLineHeight(wrapped) {
      return false
    }

    let hard = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "first\nsecond\nthird",
      FontFamily: "DejaVu Sans",
      FontSize: 16,
      TextWrap: TextWrap.NoWrap,
      TextTrimming: TextTrimming.Ellipsis,
      TextMaxLines: 2,
    })
    let hardLayout = TextLayouts.For(hard, 200.0F)
    if hardLayout.Lines.Count != 2 || !hardLayout.Clamped
      || hardLayout.Lines[1].Content != "second…" {
      return false
    }

    let exact = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "one\ntwo",
      FontFamily: "DejaVu Sans",
      FontSize: 16,
      TextTrimming: TextTrimming.Ellipsis,
      TextMaxLines: 2,
    })
    let exactLayout = TextLayouts.For(exact, 200.0F)
    if exactLayout.Lines.Count != 2 || exactLayout.Clamped
      || exactLayout.Lines[1].Content != "two" {
      return false
    }

    let unconstrained = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "i\nhidden",
      FontFamily: "DejaVu Sans",
      FontSize: 16,
      TextTrimming: TextTrimming.Ellipsis,
      TextMaxLines: 1,
    })
    let unconstrainedLayout = TextLayouts.For(unconstrained, -1.0F)
    if unconstrainedLayout.Lines[0].Content != "i…"
      || unconstrainedLayout.Width != unconstrainedLayout.Lines[0].DisplayWidth
      || unconstrainedLayout.Width <= TextShaping.Measure("i", unconstrained.FontFamily, 16.0F,
        400, false, 0.0F, false) {
      return false
    }

    let omitted = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "short\nWWWWWWWWWWWWWWWWWWWW",
      FontFamily: "DejaVu Sans",
      FontSize: 16,
      TextMaxLines: 1,
    })
    let omittedLayout = TextLayouts.For(omitted, -1.0F)
    return omittedLayout.Lines.Count == 1 && omittedLayout.Clamped
      && omittedLayout.Width == omittedLayout.Lines[0].Width
      && omittedLayout.Width < TextShaping.Measure("WWWWWWWWWWWWWWWWWWWW", omitted.FontFamily,
        16.0F, 400, false, 0.0F, false)
  }

  private func staticTextMaxLinesCacheAndShapingContracts() bool {
    let node = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "one\ntwo\nthree",
      FontFamily: "DejaVu Sans",
      FontSize: 16,
      TextMaxLines: 1,
    })
    let one = TextLayouts.For(node, 100.0F)
    node.TextMaxLines = 2
    let two = TextLayouts.For(node, 100.0F)
    if one == two || one.TextMaxLines != 1 || two.TextMaxLines != 2
      || two.Lines.Count != 2 {
      return false
    }

    let bounded = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "visible\nhidden-a\nhidden-b",
      FontFamily: "DejaVu Sans",
      FontSize: 16,
      TextMaxLines: 1,
    })
    let boundedLayout = TextLayouts.For(bounded, -1.0F)
    return boundedLayout.Lines.Count == 1 && boundedLayout.Clamped
  }

  private func staticTextMaxLinesPaintContracts() bool {
    let clipped = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "A\nB",
      Width: 4,
      Height: 24,
      FontFamily: "DejaVu Sans",
      FontSize: 20,
      Color: Color.White,
      Overflow: Overflow.Visible,
      TextTrimming: TextTrimming.Ellipsis,
      TextMaxLines: 1,
    })
    Layout().Calculate(clipped, 60.0F, 30.0F)
    using let image = Painter().RenderOffscreen(clipped, 60, 30)
    return !rowHasInk(image, 4, 60)
  }

  private func entryTextMaxLinesContract() bool {
    using let unlimited = entryTextMaxLinesImage(0)
    using let capped = entryTextMaxLinesImage(1)
    return samePixels(unlimited, capped)
  }

  private func entryTextMaxLinesImage(maxLines int32) SKImage {
    let n = Reconciler{ Res: Resolver{} }.Mount(TextEntry{
      Value: "first\nsecond",
      Width: 100,
      Height: 40,
      FontFamily: "DejaVu Sans",
      FontSize: 20,
      Color: Color.White,
      TextMaxLines: maxLines,
    })
    Layout().Calculate(n, 100.0F, 40.0F)
    return Painter().RenderOffscreen(n, 100, 40)
  }

  private func staticTextEllipsisContracts() bool {
    if TextLayouts.isRtl("Ж שלום") || !TextLayouts.isRtl("שלום Ж") {
      return false
    }
    let exactNode = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "exact fit",
      FontFamily: "DejaVu Sans",
      FontSize: 18,
      TextWrap: TextWrap.NoWrap,
      TextTrimming: TextTrimming.Ellipsis,
    })
    let unconstrained = TextLayouts.For(exactNode, -1.0F)
    let exact = TextLayouts.For(exactNode, unconstrained.Width)
    if exact.Lines.Count != 1 || exact.Lines[0].Content != "exact fit"
      || exact.Lines[0].DisplayWidth != exact.Lines[0].Width {
      return false
    }

    let grapheme = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "A👨‍👩‍👧‍👦B",
      FontFamily: "DejaVu Sans,Noto Color Emoji",
      FontSize: 18,
      TextWrap: TextWrap.NoWrap,
      TextTrimming: TextTrimming.Ellipsis,
    })
    let prefixWidth = TextShaping.Measure("A…", grapheme.FontFamily, 18.0F, 400, false, 0.0F, false)
    let graphemeLayout = TextLayouts.For(grapheme, prefixWidth + 0.1F)
    if graphemeLayout.Lines[0].Content != "A…"
      || graphemeLayout.Width <= prefixWidth
      || graphemeLayout.Lines[0].DisplayWidth > prefixWidth + 0.1F {
      return false
    }
    let tiny = TextLayouts.For(grapheme, 0.1F)
    if tiny.Lines[0].Content != "…" || tiny.Content != "A👨‍👩‍👧‍👦B" {
      return false
    }

    let rtl = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "שלוםעולם",
      FontFamily: "DejaVu Sans",
      FontSize: 18,
      TextWrap: TextWrap.NoWrap,
      TextTrimming: TextTrimming.Ellipsis,
    })
    let rtlWidth = TextShaping.Measure("של…", rtl.FontFamily, 18.0F, 400, false, 0.0F, true) + 0.1F
    let rtlLayout = TextLayouts.For(rtl, rtlWidth)
    let display = rtlLayout.Lines[0].Content
    return display.Length > 0 && display[display.Length - 1] == 0x2026
      && rtlLayout.Lines[0].DisplayWidth <= rtlWidth
      && rtlLayout.Lines[0].Width > rtlLayout.Lines[0].DisplayWidth
  }

  func ShapedTextOwnershipSurvivesSiblingDisposal() bool {
    let a = TextShaping.Shape("ownership probe", "DejaVu Sans", 16.0F, 400, false, 0.0F, 1)
    let b = TextShaping.Shape("ownership probe", "DejaVu Sans", 16.0F, 400, false, 0.0F, 1)
    if a == b { return false }
    a.Dispose()
    a.Dispose()
    if b.Width <= 0.0F { return false }
    let hit = b.HitTest(1.0F)
    b.Dispose()
    return hit.Index >= 0
  }

  func WrappedRtlParagraphKeepsBaseDirectionAcrossLines() bool {
    let text = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "שלום עולם שלום עולם",
      FontFamily: "DejaVu Sans",
      FontSize: 18,
    })
    let narrow = TextShaping.Measure("שלום עולם", "DejaVu Sans", 18.0F, 400, false, 0.0F, true) + 2.0F
    let layout = TextLayouts.For(text, narrow)
    if layout.Lines.Count < 2 { return false }
    for line in layout.Lines {
      guard let shaped = line.Shape else { return false }
      if !shaped.RightToLeft { return false }
    }
    return true
  }

  private func staticTextEllipsisPaintContracts() bool {
    let clipped = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "WWWWWWWWWWWW",
      Width: 44,
      Height: 18,
      FontFamily: "DejaVu Sans",
      FontSize: 20,
      Color: Color.White,
      Overflow: Overflow.Visible,
      TextWrap: TextWrap.NoWrap,
      TextTrimming: TextTrimming.Ellipsis,
    })
    Layout().Calculate(clipped, 120.0F, 40.0F)
    using let clippedImage = Painter().RenderOffscreen(clipped, 120, 40)
    if !rowHasInk(clippedImage, 0, 44) || rowHasInk(clippedImage, 44, 120) {
      return false
    }

    let aligned = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "WWWWWWWWWWWW",
      Width: 80,
      Height: 30,
      FontFamily: "DejaVu Sans",
      FontSize: 20,
      Color: Color.White,
      TextAlign: TextAlign.Right,
      TextWrap: TextWrap.NoWrap,
      TextTrimming: TextTrimming.Ellipsis,
    })
    Layout().Calculate(aligned, 120.0F, 40.0F)
    using let alignedImage = Painter().RenderOffscreen(aligned, 120, 40)
    return rowHasInk(alignedImage, 55, 80) && !rowHasInk(alignedImage, 80, 120)
  }

  private func staticTextModeInvalidationContracts() bool {
    let rec = Reconciler{ Res: Resolver{} }
    var root = rec.Mount(Container{ Width: 55, Children: {
      Text{
        Key: "text",
        Content: "alpha beta gamma",
        FontFamily: "DejaVu Sans",
        FontSize: 16,
      },
    } })
    let layout = Layout()
    layout.Calculate(root, 100.0F, 200.0F)
    let node = root.Children[0]
    guard let wrapped = node.TextLayout else { return false }
    if wrapped.Lines.Count <= 1 { return false }

    root = rec.Diff(root, Container{ Width: 55, Children: {
      Text{
        Key: "text",
        Content: "alpha beta gamma",
        FontFamily: "DejaVu Sans",
        FontSize: 16,
        TextWrap: TextWrap.NoWrap,
      },
    } })
    layout.Calculate(root, 100.0F, 200.0F)
    guard let unwrapped = node.TextLayout else { return false }
    if unwrapped == wrapped || unwrapped.Lines.Count != 1 || node.Rect.H >= 30.0F { return false }
    let logicalWidth = unwrapped.Width

    root = rec.Diff(root, Container{ Width: 55, Children: {
      Text{
        Key: "text",
        Content: "alpha beta gamma",
        FontFamily: "DejaVu Sans",
        FontSize: 16,
        TextWrap: TextWrap.NoWrap,
        TextTrimming: TextTrimming.Ellipsis,
      },
    } })
    layout.Calculate(root, 100.0F, 200.0F)
    guard let trimmed = node.TextLayout else { return false }
    return trimmed != unwrapped && trimmed.Width == logicalWidth
      && trimmed.Lines[0].Content != trimmed.Content
      && TextLayouts.For(node, TextLayouts.ContentWidth(node)) == trimmed
  }

  private func staticTextEllipsisReusesNodeLayout() bool {
    let node = Reconciler{ Res: Resolver{} }.Mount(Text{
      Content: "layout-reuse-abcdefghijklmnopqrstuv",
      FontFamily: "DejaVu Sans",
      FontSize: 16,
      TextWrap: TextWrap.NoWrap,
      TextTrimming: TextTrimming.Ellipsis,
    })
    let first = TextLayouts.For(node, 55.0F)
    let second = TextLayouts.For(node, 55.0F)
    let display = first.Lines[0].Content
    return first == second && display.Length > 0 && display[display.Length - 1] == 0x2026
  }

  func TextLayoutCacheContracts() bool {
    if !styleRemovalInvalidatesLayouts() || !replacementAndRemovalDisposeLayouts() { return false }
    if !churnRetainsActiveLayout() { return false }

    let root = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 120.0, Children: {
      Text{
        Content: "retained face", FontFamily: "DejaVu Sans,live-fixture",
        FontSize: 16.0, Color: Color.White,
      },
    } })
    Layout().Calculate(root, 120.0F, 80.0F)
    let text = root.Children[0]
    guard let retained = text.TextLayout else { return false }
    let beforeDisposals = TextShaping.PrimaryFaceDisposalsForTests()
    let capacity = TextShaping.PrimaryFaceCacheCapacityForTests()
    let churn = capacity * 2 + 4
    for i in 0 ... churn {
      TextShaping.Metrics("DejaVu Sans,fixture-$i", 16.0F, 400, false)
    }
    using let image = Painter().RenderOffscreen(root, 120, 80)
    let result = TextLayouts.For(text, 120.0F) == retained
      && TextShaping.PrimaryFaceCacheCountForTests() > 0
      && TextShaping.PrimaryFaceCacheCountForTests() <= capacity
      && TextShaping.PrimaryFaceDisposalsForTests() > beforeDisposals
      && countInk(image) > 0 && text.TextLayout == retained
    TextLayouts.DisposeTree(root)
    return result
  }

  private func textMeasurementAndInvalidationContracts() bool {
    let stacked = Reconciler{ Res: Resolver{} }.Mount(Container{ Children: {
      Text{ Content: "big", FontSize: 28.0 },
      Text{ Content: "small", FontSize: 16.0 },
    } })
    Layout().Calculate(stacked, 200.0F, 200.0F)
    let first = stacked.Children[0]
    let second = stacked.Children[1]
    if first.Rect.H <= 0.0F || second.Rect.H <= 0.0F || second.Rect.Y < first.Rect.Y + first.Rect.H {
      TextLayouts.DisposeTree(stacked)
      return false
    }
    TextLayouts.DisposeTree(stacked)

    let wrapped = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 80.0, Children: {
      Text{ Content: "alpha beta gamma", FontSize: 16.0, Color: Color.White },
    } })
    Layout().Calculate(wrapped, 80.0F, 200.0F)
    let wrappedText = wrapped.Children[0]
    guard let wrappedLayout = wrappedText.TextLayout else {
      TextLayouts.DisposeTree(wrapped)
      return false
    }
    using let wrappedImage = Painter().RenderOffscreen(wrapped, 80, 200)
    if wrappedLayout.Lines.Count <= 1 || wrappedText.Rect.H <= 16.0F
      || wrappedText.TextLayout != wrappedLayout || countInk(wrappedImage) == 0 {
      TextLayouts.DisposeTree(wrapped)
      return false
    }
    TextLayouts.DisposeTree(wrapped)

    let whitespace = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 200.0, Children: {
      Text{ Content: "a  b\n\nc", FontSize: 16.0 },
    } })
    Layout().Calculate(whitespace, 200.0F, 200.0F)
    guard let whitespaceLayout = whitespace.Children[0].TextLayout else {
      TextLayouts.DisposeTree(whitespace)
      return false
    }
    let whitespaceValid = whitespaceLayout.Lines.Count == 3
      && whitespaceLayout.Lines[0].Content == "a  b"
      && whitespaceLayout.Lines[1].Content == ""
      && whitespaceLayout.Lines[2].Content == "c"
    TextLayouts.DisposeTree(whitespace)
    if !whitespaceValid { return false }

    let reconciler = Reconciler{ Res: Resolver{} }
    let dirty = reconciler.Mount(Container{ Width: 100.0, Children: {
      Text{ Key: "text", Content: "one", FontSize: 16.0 },
    } })
    let layout = Layout()
    layout.Calculate(dirty, 100.0F, 200.0F)
    let dirtyText = dirty.Children[0]
    let initialHeight = dirtyText.Rect.H
    reconciler.Diff(dirty, Container{ Width: 100.0, Children: {
      Text{ Key: "text", Content: "one\ntwo", FontSize: 24.0 },
    } })
    layout.Calculate(dirty, 100.0F, 200.0F)
    let dirtyValid = dirtyText.Rect.H > initialHeight * 2.0F
    TextLayouts.DisposeTree(dirty)
    if !dirtyValid { return false }

    let plainRoot = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 300.0, Children: {
      Text{ Content: "áb", FontSize: 20.0 },
    } })
    let spacedRoot = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 300.0, Children: {
      Text{ Content: "áb", FontSize: 20.0, LetterSpacing: 20.0 },
    } })
    layout.Calculate(plainRoot, 300.0F, 100.0F)
    layout.Calculate(spacedRoot, 300.0F, 100.0F)
    guard let plainLayout = plainRoot.Children[0].TextLayout else {
      TextLayouts.DisposeTree(plainRoot)
      TextLayouts.DisposeTree(spacedRoot)
      return false
    }
    guard let spacedLayout = spacedRoot.Children[0].TextLayout else {
      TextLayouts.DisposeTree(plainRoot)
      TextLayouts.DisposeTree(spacedRoot)
      return false
    }
    let delta = spacedLayout.Width - plainLayout.Width
    TextLayouts.DisposeTree(plainRoot)
    TextLayouts.DisposeTree(spacedRoot)
    return delta > 19.0F && delta < 21.0F
  }

  private func textScriptAndAlignmentContracts() bool {
    let cjkRoot = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 35.0, Children: {
      Text{ Content: "日本語日本語", FontSize: 16.0, Color: Color.White },
    } })
    let rtlRoot = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 120.0, Children: {
      Text{ Content: "שלום", FontSize: 20.0, Color: Color.White },
    } })
    Layout().Calculate(cjkRoot, 35.0F, 200.0F)
    Layout().Calculate(rtlRoot, 120.0F, 80.0F)
    guard let cjkLayout = cjkRoot.Children[0].TextLayout else {
      TextLayouts.DisposeTree(cjkRoot)
      TextLayouts.DisposeTree(rtlRoot)
      return false
    }
    using let rtlImage = Painter().RenderOffscreen(rtlRoot, 120, 80)
    let scriptsValid = cjkLayout.Lines.Count > 1 && countInk(rtlImage) > 0
    TextLayouts.DisposeTree(cjkRoot)
    TextLayouts.DisposeTree(rtlRoot)
    if !scriptsValid { return false }

    let centered = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 200, Height: 40, Children: {
      Text{ Content: "hi", FontSize: 20, Color: Color.White, TextAlign: TextAlign.Center },
    } })
    Layout().Calculate(centered, 200.0F, 40.0F)
    using let centeredImage = Painter().RenderOffscreen(centered, 200, 40)
    if rowHasInkBefore(centeredImage, 60) || !rowHasInk(centeredImage, 60, 140) {
      TextLayouts.DisposeTree(centered)
      return false
    }
    TextLayouts.DisposeTree(centered)

    let spaced = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 200, Height: 40, Children: {
      Text{ Content: "WW", FontSize: 20, Color: Color.White, LetterSpacing: 60, TextAlign: TextAlign.Center },
    } })
    Layout().Calculate(spaced, 200.0F, 40.0F)
    using let spacedImage = Painter().RenderOffscreen(spaced, 200, 40)
    let spacedValid = rowHasInk(spacedImage, 30, 65)
    TextLayouts.DisposeTree(spaced)
    return spacedValid
  }

  private func styleRemovalInvalidatesLayouts() bool {
    let rec = Reconciler{ Res: Resolver{} }
    let family = rec.Mount(Text{ Content: "text", FontFamily: "DejaVu Sans" })
    TextLayouts.For(family, 100.0F)
    rec.Diff(family, Text{ Content: "text" })
    if family.TextLayout != nil { return false }

    let size = rec.Mount(Text{ Content: "text", FontSize: 24.0 })
    TextLayouts.For(size, 100.0F)
    rec.Diff(size, Text{ Content: "text" })
    if size.TextLayout != nil { return false }

    let weight = rec.Mount(Text{ Content: "text", FontWeight: 700.0 })
    TextLayouts.For(weight, 100.0F)
    rec.Diff(weight, Text{ Content: "text" })
    if weight.TextLayout != nil { return false }

    let style = rec.Mount(Text{ Content: "text", FontStyle: FontStyle.Italic })
    TextLayouts.For(style, 100.0F)
    rec.Diff(style, Text{ Content: "text" })
    if style.TextLayout != nil { return false }

    let spacing = rec.Mount(Text{ Content: "text", LetterSpacing: 2.0 })
    TextLayouts.For(spacing, 100.0F)
    rec.Diff(spacing, Text{ Content: "text" })
    if spacing.TextLayout != nil { return false }

    let lineHeight = rec.Mount(Text{ Content: "text", LineHeight: 1.7 })
    TextLayouts.For(lineHeight, 100.0F)
    rec.Diff(lineHeight, Text{ Content: "text" })
    return lineHeight.TextLayout == nil
  }

  private func replacementAndRemovalDisposeLayouts() bool {
    let rec = Reconciler{ Res: Resolver{} }
    let replaced = rec.Mount(Container{ Children: { Text{ Key: "text", Content: "old" } } })
    let old = replaced.Children[0]
    TextLayouts.For(old, 100.0F)
    rec.Diff(replaced, Container{ Children: { Container{ Key: "text" } } })
    if old.TextLayout != nil {
      TextLayouts.DisposeTree(replaced)
      return false
    }

    let removed = rec.Mount(Container{ Children: { Text{ Key: "text", Content: "old" } } })
    let stale = removed.Children[0]
    TextLayouts.For(stale, 100.0F)
    rec.Diff(removed, Container{ Children: {} })
    let result = stale.TextLayout == nil
    TextLayouts.DisposeTree(replaced)
    TextLayouts.DisposeTree(removed)
    return result
  }

  private func churnRetainsActiveLayout() bool {
    let rec = Reconciler{ Res: Resolver{} }
    let root = rec.Mount(Container{ Width: 120.0, Children: {
      Text{ Key: "keep", Content: "retained", FontSize: 16.0, Color: Color.White },
      Text{ Key: "churn", Content: "0", FontSize: 16.0 },
    } })
    let layout = Layout()
    layout.Calculate(root, 120.0F, 100.0F)
    let retained = root.Children[0]
    for i in 0 ... 520 {
      rec.Diff(root, Container{ Width: 120.0, Children: {
        Text{ Key: "keep", Content: "retained", FontSize: 16.0, Color: Color.White },
        Text{ Key: "churn", Content: "item-$i", FontSize: 16.0 },
      } })
      layout.Calculate(root, 120.0F, 100.0F)
    }
    using let image = Painter().RenderOffscreen(root, 120, 100)
    let result = retained.TextLayout != nil && countInk(image) > 0
    TextLayouts.DisposeTree(root)
    return result
  }

  func TextEntryHonorsMetricsAndClipsContent() bool {
    if !entryInteractivePaintContracts() { return false }

    let lineBox = Reconciler{ Res: Resolver{} }.Mount(TextEntry{ FontSize: 20.0, LineHeight: 1.5, Width: 100.0 })
    Layout().Calculate(lineBox, 200.0F, 100.0F)
    if lineBox.Rect.H != 30.0F { return false }

    let centered = Reconciler{ Res: Resolver{} }.Mount(TextEntry{
      Value: "WW", Width: 200.0, Height: 30.0, FontSize: 20.0, TextAlign: TextAlign.Center,
    })
    Layout().Calculate(centered, 200.0F, 40.0F)
    let metrics = TextMetrics()
    using let centeredShape = metrics.Shape(centered, centered.Buffer)
    if metrics.EntryOriginX(centered, centeredShape) <= TextLayouts.ContentLeft(centered) + 50.0F { return false }

    let right = Reconciler{ Res: Resolver{} }.Mount(TextEntry{
      Placeholder: "WW", Width: 200.0, Height: 30.0, FontSize: 20.0, TextAlign: TextAlign.Right,
    })
    Layout().Calculate(right, 200.0F, 40.0F)
    using let rightShape = metrics.Shape(right, right.Placeholder)
    if metrics.EntryOriginX(right, rightShape) <= TextLayouts.ContentLeft(right) + 100.0F { return false }

    let spaced = Reconciler{ Res: Resolver{} }.Mount(TextEntry{
      Value: "WW", Width: 200.0, Height: 30.0, FontSize: 20.0, LetterSpacing: 40, TextAlign: TextAlign.Center,
    })
    spaced.Focused = true
    spaced.Caret = 2
    spaced.Anchor = 2
    Layout().Calculate(spaced, 200.0F, 40.0F)
    using let spacedShape = metrics.Shape(spaced, spaced.Buffer)
    let origin = metrics.EntryOriginX(spaced, spacedShape)
    let gap = spacedShape.CaretX(1, int32(TextAffinity.Downstream))
    PointerInput().HandlePress(spaced, Resolver{}, TextInput(), 0.0, origin + gap, spaced.Rect.Y + spaced.Rect.H * 0.5F)
    if spaced.Caret != 1 { return false }

    let overflow = Reconciler{ Res: Resolver{} }.Mount(TextEntry{
      Value: "WW", Width: 50.0, Height: 30.0, FontSize: 20.0, LetterSpacing: 20, TextAlign: TextAlign.Right,
    })
    Layout().Calculate(overflow, 50.0F, 40.0F)
    using let overflowShape = metrics.Shape(overflow, overflow.Buffer)
    if metrics.EntryOriginX(overflow, overflowShape) != TextLayouts.ContentLeft(overflow) { return false }
    overflow.Caret = overflow.Buffer.Length
    FollowCaret(overflow)
    if overflow.EditScrollX <= 0.0F { return false }
    overflow.Caret = 0
    FollowCaret(overflow)
    if overflow.EditScrollX != 0.0F { return false }

    let clipped = Reconciler{ Res: Resolver{} }.Mount(TextEntry{
      Value: "WWWWWWWW", Width: 80.0, Height: 40.0, Padding: 10, BorderWidth: 4,
      BorderColor: Color.Rgb(255, 0, 0), Color: Color.Transparent, SelectionColor: Color.Rgb(0, 0, 255),
    })
    clipped.Focused = true
    clipped.Anchor = 0
    clipped.Caret = clipped.Buffer.Length
    clipped.BlinkT = 0.6
    Layout().Calculate(clipped, 80.0F, 40.0F)
    let contentX = int32(TextLayouts.ContentLeft(clipped))
    let contentY = int32(TextLayouts.ContentTop(clipped))
    let contentRight = TextLayouts.ContentLeft(clipped) + TextLayouts.ContentWidth(clipped)
    let contentBottom = TextLayouts.ContentTop(clipped) + TextLayouts.ContentHeight(clipped)
    using let clippedImage = Painter().RenderOffscreen(clipped, 80, 40)
    if !isBlue(clippedImage, contentX + 1, contentY + 1)
      || !isRed(clippedImage, 1, 20) || !isRed(clippedImage, 78, 20)
      || dominantColorOutside(clippedImage, TextLayouts.ContentLeft(clipped), TextLayouts.ContentTop(clipped),
        contentRight, contentBottom, false) != 0 {
      return false
    }

    let caret = Reconciler{ Res: Resolver{} }.Mount(TextEntry{
      Value: "WWWWWWWW", Width: 80.0, Height: 40.0, Padding: 10, BorderWidth: 4,
      BorderColor: Color.Rgb(255, 0, 0), Color: Color.Rgb(0, 255, 0),
    })
    caret.Focused = true
    caret.Anchor = caret.Buffer.Length
    caret.Caret = caret.Buffer.Length
    caret.BlinkT = 0.0
    Layout().Calculate(caret, 80.0F, 40.0F)
    FollowCaret(caret)
    using let caretImage = Painter().RenderOffscreen(caret, 80, 40)
    return dominantColorInside(caretImage, TextLayouts.ContentLeft(caret), TextLayouts.ContentTop(caret),
      TextLayouts.ContentLeft(caret) + TextLayouts.ContentWidth(caret),
      TextLayouts.ContentTop(caret) + TextLayouts.ContentHeight(caret), true) > 0
      && dominantColorOutside(caretImage, TextLayouts.ContentLeft(caret), TextLayouts.ContentTop(caret),
        TextLayouts.ContentLeft(caret) + TextLayouts.ContentWidth(caret),
        TextLayouts.ContentTop(caret) + TextLayouts.ContentHeight(caret), true) == 0
  }

  private func entryInteractivePaintContracts() bool {
    let caretVisible = entryPaintNode("ab", true, 2, 2, 0.0)
    let caretHidden = entryPaintNode("ab", true, 2, 2, 0.6)
    let selected = entryPaintNode("abc", true, 3, 0, 0.6)
    let collapsed = entryPaintNode("abc", true, 3, 3, 0.6)
    let placeholder = entryPaintNode("", false, 0, 0, 0.0)
    let unfocused = entryPaintNode("ab", false, 2, 0, 0.0)
    let focused = entryPaintNode("ab", true, 2, 0, 0.6)
    let result = nonBlackCount(caretVisible) > nonBlackCount(caretHidden)
      && nonBlackCount(selected) > nonBlackCount(collapsed)
      && nonBlackCount(placeholder) > 0
      && nonBlackCount(focused) > nonBlackCount(unfocused)
    TextLayouts.DisposeTree(caretVisible)
    TextLayouts.DisposeTree(caretHidden)
    TextLayouts.DisposeTree(selected)
    TextLayouts.DisposeTree(collapsed)
    TextLayouts.DisposeTree(placeholder)
    TextLayouts.DisposeTree(unfocused)
    TextLayouts.DisposeTree(focused)
    return result
  }

  private func entryPaintNode(value string, focused bool, caret int32, anchor int32, blink float64) Node {
    let n = Reconciler{ Res: Resolver{} }.Mount(TextEntry{
      Value: value, Placeholder: "hint", Width: 120.0, Height: 30.0,
      FontSize: 16.0, LineHeight: 1.5, Color: Color.Rgb(255, 0, 0),
    })
    n.Focused = focused
    n.Caret = caret
    n.Anchor = anchor
    n.BlinkT = blink
    Layout().Calculate(n, 200.0F, 100.0F)
    return n
  }

  private func nonBlackCount(n Node) int32 {
    using let image = Painter().RenderOffscreen(n, 200, 100)
    return countInk(image)
  }

  private func samePixels(left SKImage, right SKImage) bool {
    if left.Width != right.Width || left.Height != right.Height { return false }
    using let leftBitmap = SKBitmap.FromImage(left)
    using let rightBitmap = SKBitmap.FromImage(right)
    for y in 0 ... left.Height {
      for x in 0 ... left.Width {
        if leftBitmap.GetPixel(x, y) != rightBitmap.GetPixel(x, y) { return false }
      }
    }
    return true
  }

  internal func pixel(image SKImage, x int32, y int32) SKColor {
    using let bitmap = SKBitmap.FromImage(image)
    return bitmap.GetPixel(x, y)
  }

  internal func isRed(image SKImage, x int32, y int32) bool {
    let c = pixel(image, x, y)
    return c.Red >= 245 && c.Green <= 10 && c.Blue <= 10
  }

  internal func isBlue(image SKImage, x int32, y int32) bool {
    let c = pixel(image, x, y)
    return c.Blue >= 245 && c.Red <= 10 && c.Green <= 10
  }

  internal func isGreen(image SKImage, x int32, y int32) bool {
    let c = pixel(image, x, y)
    return c.Green >= 245 && c.Red <= 10 && c.Blue <= 10
  }

  internal func isBlack(image SKImage, x int32, y int32) bool {
    let c = pixel(image, x, y)
    return c.Red <= 10 && c.Green <= 10 && c.Blue <= 10
  }

  internal func isWhite(image SKImage, x int32, y int32) bool {
    let c = pixel(image, x, y)
    return c.Red >= 245 && c.Green >= 245 && c.Blue >= 245
  }

  internal func hasInk(image SKImage, x int32, y int32) bool {
    let c = pixel(image, x, y)
    return c.Red > 10 || c.Green > 10 || c.Blue > 10
  }

  internal func rowHasInkBefore(image SKImage, xEnd int32) bool {
    using let bitmap = SKBitmap.FromImage(image)
    for x in 0 ... xEnd {
      for y in 0 ... image.Height {
        let c = bitmap.GetPixel(x, y)
        if c.Red > 10 || c.Green > 10 || c.Blue > 10 { return true }
      }
    }
    return false
  }

  internal func rowHasInk(image SKImage, xStart int32, xEnd int32) bool {
    using let bitmap = SKBitmap.FromImage(image)
    for x in xStart ... xEnd {
      for y in 0 ... image.Height {
        let c = bitmap.GetPixel(x, y)
        if c.Red > 10 || c.Green > 10 || c.Blue > 10 { return true }
      }
    }
    return false
  }

  internal func countInk(image SKImage) int32 {
    using let bitmap = SKBitmap.FromImage(image)
    var count int32 = 0
    for y in 0 ... image.Height {
      for x in 0 ... image.Width {
        let c = bitmap.GetPixel(x, y)
        if c.Red > 10 || c.Green > 10 || c.Blue > 10 { count = count + 1 }
      }
    }
    return count
  }

  internal func countInkDifferentFrom(image SKImage, background SKColor) int32 {
    using let bitmap = SKBitmap.FromImage(image)
    var count int32 = 0
    for y in 0 ... image.Height {
      for x in 0 ... image.Width {
        if uint32(bitmap.GetPixel(x, y)) != uint32(background) { count = count + 1 }
      }
    }
    return count
  }

  internal func dominantColorInside(image SKImage, left float32, top float32,
      right float32, bottom float32, green bool) int32 {
    using let bitmap = SKBitmap.FromImage(image)
    var count int32 = 0
    for y in 0 ... image.Height {
      for x in 0 ... image.Width {
        let px = float32(x) + 0.5F
        let py = float32(y) + 0.5F
        if px >= left && px < right && py >= top && py < bottom
          && dominantColor(bitmap.GetPixel(x, y), green) {
          count = count + 1
        }
      }
    }
    return count
  }

  internal func dominantColorOutside(image SKImage, left float32, top float32,
      right float32, bottom float32, green bool) int32 {
    using let bitmap = SKBitmap.FromImage(image)
    var count int32 = 0
    for y in 0 ... image.Height {
      for x in 0 ... image.Width {
        let px = float32(x) + 0.5F
        let py = float32(y) + 0.5F
        let inside = px >= left && px < right && py >= top && py < bottom
        if !inside && dominantColor(bitmap.GetPixel(x, y), green) {
          count = count + 1
        }
      }
    }
    return count
  }

  internal func dominantColor(color SKColor, green bool) bool {
    if green {
      return int32(color.Green) > int32(color.Red) + 40
        && int32(color.Green) > int32(color.Blue) + 40
    }
    return int32(color.Blue) > int32(color.Red) + 40
      && int32(color.Blue) > int32(color.Green) + 40
  }
}
