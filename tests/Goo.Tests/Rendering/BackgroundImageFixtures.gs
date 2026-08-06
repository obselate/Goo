package Goo

import SkiaSharp
import System.Threading.Tasks
import System.Collections.Generic
import Goo.InternalTextInterop

internal class BackgroundImageFixtures {
  func BoxPaintFitClipLayerAndLayoutContract() bool {
    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    defer ImageDecoding.ResetForTests()

    using let contain = renderBox("synthetic-background-contain", ImageFit.Contain,
      Color.Black, nil, 0.0, 0.0)
    using let cover = renderBox("synthetic-background-cover", ImageFit.Cover,
      Color.Black, nil, 0.0, 0.0)
    using let fill = renderBox("synthetic-background-fill", ImageFit.Fill,
      Color.Black, nil, 0.0, 0.0)
    using let none = renderBox("synthetic-background-none", ImageFit.None,
      Color.Black, nil, 0.0, 0.0)
    if !isBlack(contain, 20, 5) || !isRed(contain, 10, 20) || !isBlue(contain, 30, 20)
      || !isRed(cover, 2, 20) || !isBlue(cover, 37, 20)
      || !isRed(fill, 10, 20) || !isBlue(fill, 30, 20)
      || !isBlack(none, 0, 20) || !isRed(none, 12, 20) || !isBlue(none, 28, 20) {
      return false
    }

    let gradient = LinearGradient(Color.Rgb(255, 0, 0), Color.Rgb(0, 0, 255))
    using let baseGradient = renderBox("", ImageFit.Cover, Color.Rgb(0, 255, 0), gradient, 0.0, 0.0)
    using let layered = renderBox("synthetic-background-layered", ImageFit.Contain,
      Color.Rgb(0, 255, 0), gradient, 0.0, 0.0)
    if uint32(pixel(baseGradient, 20, 5)) != uint32(pixel(layered, 20, 5))
      || !isRed(layered, 10, 20) || !isBlue(layered, 30, 20) {
      return false
    }

    using let rounded = renderBox("synthetic-background-rounded", ImageFit.Fill,
      Color.Black, nil, 10.0, 0.0)
    using let bordered = renderBox("synthetic-background-border", ImageFit.Fill,
      Color.Black, nil, 0.0, 3.0)
    if !isBlack(rounded, 1, 1) || !isRed(rounded, 10, 20)
      || !isWhite(bordered, 1, 20) || !isRed(bordered, 10, 20) {
      return false
    }

    let plain = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 100, Height: 60,
      Children: { Container{ Width: 30, Height: 20 }, Container{ Width: 40, Height: 10 } },
    })
    let decorated = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 100, Height: 60,
      Children: { Container{ Width: 30, Height: 20, BackgroundImage: "synthetic-layout" },
        Container{ Width: 40, Height: 10 } },
    })
    if !waitForBackground(decorated.Children[0], "synthetic-layout") {
      TextLayouts.DisposeTree(plain)
      TextLayouts.DisposeTree(decorated)
      return false
    }
    let layout = Layout()
    layout.Calculate(plain, 100.0F, 60.0F)
    layout.Calculate(decorated, 100.0F, 60.0F)
    let layoutNeutral = sameRect(plain.Rect, decorated.Rect)
      && sameRect(plain.Children[0].Rect, decorated.Children[0].Rect)
      && sameRect(plain.Children[1].Rect, decorated.Children[1].Rect)
    TextLayouts.DisposeTree(plain)
    TextLayouts.DisposeTree(decorated)
    if !layoutNeutral { return false }

    let gate = TaskCompletionSource[bool]()
    ImageDecoding.SetDecodeGateForTests(gate.Task)
    defer ImageDecoding.ClearDecodeGateForTests()
    let pending = Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 40, Height: 20,
      BackgroundImage: "synthetic-background-paint-only" })
    let pendingLayout = Layout()
    pendingLayout.Calculate(pending, 40.0F, 20.0F)
    if pendingLayout.NeedsLayout(pending, 40.0F, 20.0F) {
      TextLayouts.DisposeTree(pending)
      return false
    }
    let request = ImageDecoding.Request("synthetic-background-paint-only")
    gate.SetResult(true)
    let decoded = request.Wait().IsValid
    request.Release()
    let refreshed = BackgroundImageLayouts.Refresh(pending)
    let paintOnly = decoded && refreshed && !pendingLayout.NeedsLayout(pending, 40.0F, 20.0F)
    TextLayouts.DisposeTree(pending)
    return paintOnly
  }

  func ShapePaintsToTightBoundsAndClipsToClosedPath() bool {
    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    defer ImageDecoding.ResetForTests()

    let wide = Reconciler{ Res: Resolver{} }.Mount(Shape{ Width: 100, Height: 100,
      Path: wideRectPath(), BackgroundImage: "synthetic-background-wide", BackgroundImageFit: ImageFit.Fill,
    })
    let circle = Reconciler{ Res: Resolver{} }.Mount(Shape{ Width: 100, Height: 100,
      Path: circlePath(), BackgroundImage: "synthetic-background-circle", BackgroundImageFit: ImageFit.Fill,
    })
    if !waitForBackground(wide, "synthetic-background-wide")
      || !waitForBackground(circle, "synthetic-background-circle") {
      TextLayouts.DisposeTree(wide)
      TextLayouts.DisposeTree(circle)
      return false
    }
    let layout = Layout()
    layout.Calculate(wide, 100.0F, 100.0F)
    layout.Calculate(circle, 100.0F, 100.0F)
    using let wideImage = Painter().RenderOffscreen(wide, 100, 100)
    using let circleImage = Painter().RenderOffscreen(circle, 100, 100)
    let result = isBlack(wideImage, 50, 10) && isRed(wideImage, 20, 50)
      && isBlue(wideImage, 80, 50) && isBlack(wideImage, 50, 90)
      && isBlack(circleImage, 5, 5) && isRed(circleImage, 25, 50) && isBlue(circleImage, 75, 50)
    TextLayouts.DisposeTree(wide)
    TextLayouts.DisposeTree(circle)
    return result
  }

  func StateStyleSnapResetAndSeparateResourceContract() bool {
    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    defer ImageDecoding.ResetForTests()

    let defaults = Node{ Kind: NodeKind.Container }
    if defaults.BackgroundImageFit != ImageFit.Cover || defaults.HasBackgroundImageState
      || BackgroundImageLayouts.Path(defaults) != "" {
      return false
    }

    let resolver = Resolver{}
    let root = Reconciler{ Res: resolver }.Mount(Container{
      Width: 40, Height: 20,
      BackgroundImage: "synthetic-background-base", BackgroundImageFit: ImageFit.Contain,
      TransitionMs: 100.0,
      Hover: Style{ BackgroundImage: "synthetic-background-hover", BackgroundImageFit: ImageFit.Fill },
    })
    if BackgroundImageLayouts.Path(root) != "synthetic-background-base"
      || root.BackgroundImageFit != ImageFit.Contain || resolver.Animating.Count != 0 {
      TextLayouts.DisposeTree(root)
      return false
    }
    root.Hovered = true
    resolver.Invalidate(root, false)
    resolver.Flush()
    if BackgroundImageLayouts.Path(root) != "synthetic-background-hover"
      || root.BackgroundImageFit != ImageFit.Fill || resolver.Animating.Count != 0 {
      TextLayouts.DisposeTree(root)
      return false
    }
    root.Hovered = false
    resolver.Invalidate(root, false)
    resolver.Flush()
    if BackgroundImageLayouts.Path(root) != "synthetic-background-base"
      || root.BackgroundImageFit != ImageFit.Contain || resolver.Animating.Count != 0 {
      TextLayouts.DisposeTree(root)
      return false
    }
    root.BaseStyle = nil
    resolver.Invalidate(root, false)
    resolver.Flush()
    let reset = BackgroundImageLayouts.Path(root) == "" && root.BackgroundImageFit == ImageFit.Cover
      && !root.HasBackgroundImageState && resolver.Animating.Count == 0
    TextLayouts.DisposeTree(root)
    if !reset { return false }

    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    let rec = Reconciler{ Res: Resolver{} }
    let image = rec.Mount(Image{ Key: "image", Path: "synthetic-content",
      BackgroundImage: "synthetic-background", Width: 40, Height: 20 })
    guard let contentRequest = image.ImageRequest else {
      TextLayouts.DisposeTree(image)
      return false
    }
    let backgroundRequest = ImageDecoding.Request("synthetic-background")
    let retained = rec.Diff(image, Image{ Key: "image", Path: "synthetic-content", Width: 40, Height: 20 })
    let separate = contentRequest.Path != backgroundRequest.Path && retained == image
      && image.ImageRequest == contentRequest && BackgroundImageLayouts.Path(image) == ""
      && !image.HasBackgroundImageState
    backgroundRequest.Release()
    TextLayouts.DisposeTree(image)
    return separate
  }

  func AsyncCompletionIgnoresStaleAndRetiredBackgroundResources() bool {
    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    defer ImageDecoding.ResetForTests()

    let changeGate = TaskCompletionSource[bool]()
    ImageDecoding.SetDecodeGateForTests(changeGate.Task)
    defer ImageDecoding.ClearDecodeGateForTests()
    var changedInvalidations int32 = 0
    let changeResolver = Resolver{}
    changeResolver.PaintResourceInvalidated = func() { changedInvalidations = changedInvalidations + 1 }
    let changedRec = Reconciler{ Res: changeResolver }
    let changed = changedRec.Mount(Container{ Width: 40, Height: 20,
      BackgroundImage: "synthetic-background-stale" })
    let stale = ImageDecoding.Request("synthetic-background-stale")
    let retained = changedRec.Diff(changed, Container{ Width: 40, Height: 20,
      BackgroundImage: "synthetic-background-current" })
    let current = ImageDecoding.Request("synthetic-background-current")
    changeGate.SetResult(true)
    let staleDecoded = stale.Wait().IsValid
    let currentDecoded = current.Wait().IsValid
    stale.Release()
    current.Release()
    let staleSafe = retained == changed && staleDecoded && currentDecoded
      && BackgroundImageLayouts.Path(changed) == "synthetic-background-current"
      && BackgroundImageLayouts.Image(changed) != nil && changedInvalidations <= 1
    TextLayouts.DisposeTree(changed)
    if !staleSafe { return false }

    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    let removalGate = TaskCompletionSource[bool]()
    ImageDecoding.SetDecodeGateForTests(removalGate.Task)
    var removedInvalidations int32 = 0
    let removalResolver = Resolver{}
    removalResolver.PaintResourceInvalidated = func() { removedInvalidations = removedInvalidations + 1 }
    let removalRec = Reconciler{ Res: removalResolver }
    let pending = removalRec.Mount(Container{ BackgroundImage: "synthetic-background-removed" })
    let request = ImageDecoding.Request("synthetic-background-removed")
    let replacement = removalRec.Diff(pending, Text{ Content: "replacement" })
    let cleared = pending.Retired && BackgroundImageLayouts.Path(pending) == "" && !pending.HasBackgroundImageState
    removalGate.SetResult(true)
    let decoded = request.Wait().IsValid
    request.Release()
    TextLayouts.DisposeTree(replacement)
    return cleared && decoded && replacement.Kind == NodeKind.Text && removedInvalidations == 0
  }

  func CacheEvictionKeepsAttachedBackgroundPaintable() bool {
    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    defer ImageDecoding.ResetForTests()

    let path = "synthetic-background-byte-eviction"
    let node = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 40, Height: 20, BackgroundImage: path,
    })
    let request = ImageDecoding.Request(path)
    ImageDecoding.SetCacheByteBudgetForTests(0)
    let decoded = request.Wait().IsValid
    let evicted = ImageDecoding.CacheCountForTests() == 0
      && ImageDecoding.CachedDecodedBytesForTests() == 0
    request.Release()
    let refreshed = BackgroundImageLayouts.Refresh(node)
    Layout().Calculate(node, 40.0F, 20.0F)
    using let painted = Painter().RenderOffscreen(node, 40, 20)
    let visible = isRed(painted, 10, 10) && isBlue(painted, 30, 10)
    TextLayouts.DisposeTree(node)
    return decoded && evicted && refreshed && visible
  }

  func ProviderSourcesRespectStatePrecedenceAndLifecycle() bool {
    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    defer ImageDecoding.ResetForTests()

    let provider = TestImageSourceProvider{}
    let resolver = Resolver{}
    let rec = Reconciler{ Res: resolver }
    let root = rec.Mount(Container{ Width: 40, Height: 20,
      BackgroundImage: "synthetic-background-base",
      Hover: Style{ BackgroundImageSource: provider },
      Active: Style{ BackgroundImage: "synthetic-background-active" },
    })
    let base = BackgroundImageLayouts.Path(root) == "synthetic-background-base"
      && BackgroundImageLayouts.Source(root) == nil
    root.Hovered = true
    resolver.Invalidate(root, false)
    resolver.Flush()
    guard let lease = provider.Lease else { return false }
    let hover = BackgroundImageLayouts.Path(root) == "synthetic-background-base"
      && BackgroundImageLayouts.Source(root) == provider && provider.Acquires == 1
    root.Pressed = true
    resolver.Invalidate(root, false)
    resolver.Flush()
    let active = BackgroundImageLayouts.Path(root) == "synthetic-background-active"
      && BackgroundImageLayouts.Source(root) == provider && provider.Acquires == 1
    root.Hovered = false
    resolver.Invalidate(root, false)
    resolver.Flush()
    let released = lease.IsDisposed && provider.Releases == 1
      && BackgroundImageLayouts.Source(root) == nil
      && BackgroundImageLayouts.Path(root) == "synthetic-background-active"
    root.Pressed = false
    resolver.Invalidate(root, false)
    resolver.Flush()
    let reset = BackgroundImageLayouts.Source(root) == nil
      && BackgroundImageLayouts.Path(root) == "synthetic-background-base"
    TextLayouts.DisposeTree(root)
    if !(base && hover && active && released && reset) {
      throw InvalidOperationException("states=" + base.ToString() + "/" + hover.ToString() + "/"
        + active.ToString() + "/" + released.ToString() + "/" + reset.ToString()
        + " path=" + BackgroundImageLayouts.Path(root))
    }
    return base && hover && active && released && reset
  }

  func OwnedSourceUsesTheBackgroundPaintPath() bool {
    let source = ownedSource()
    let root = Reconciler{ Res: Resolver{} }.Mount(Container{
      Width: 40, Height: 20, BackgroundColor: Color.Black,
      BackgroundImageSource: source, BackgroundImageFit: ImageFit.Fill,
      BorderRadius: 4,
    })
    Layout().Calculate(root, 40.0F, 20.0F)
    using let painted = Painter().RenderOffscreen(root, 40, 20)
    let left = pixel(painted, 10, 10)
    let right = pixel(painted, 30, 10)
    let layered = left.Red >= 220 && left.Green <= 10 && left.Blue <= 35
      && right.Blue >= 220 && right.Red <= 35 && right.Green <= 10
    TextLayouts.DisposeTree(root)
    source.Dispose()
    return layered
  }

  func ProviderBackgroundCompletionFailureAndReplacementContract() bool {
    let first = TestImageSourceProvider{}
    let second = TestImageSourceProvider{}
    let source = ownedSource()
    var invalidations int32
    let resolver = Resolver{}
    resolver.PaintResourceInvalidated = func() { invalidations = invalidations + 1 }
    let rec = Reconciler{ Res: resolver }
    let root = rec.Mount(Container{ BackgroundImageSource: first })
    guard let stale = first.Lease else { return false }
    let retained = rec.Diff(root, Container{ BackgroundImageSource: second })
    guard let active = second.Lease else { return false }
    let staleRejected = stale.IsDisposed && first.Releases == 1 && !stale.Complete(source)
    let completed = active.Complete(source)
    let refreshed = BackgroundImageLayouts.Refresh(root)
    let visible = retained == root && completed && refreshed && BackgroundImageLayouts.Image(root) != nil
      && invalidations == 1
    let failureProvider = TestImageSourceProvider{}
    let failed = rec.Diff(root, Container{ BackgroundImageSource: failureProvider })
    guard let failedLease = failureProvider.Lease else { return false }
    let failure = failedLease.Fail()
    BackgroundImageLayouts.Refresh(root)
    let failedResult = failed == root && BackgroundImageLayouts.Image(root) == nil
    let replacement = rec.Diff(root, Text{ Content: "replacement" })
    let released = active.IsDisposed && second.Releases == 1
      && failedLease.IsDisposed && failureProvider.Releases == 1 && replacement.Kind == NodeKind.Text
    source.Dispose()
    TextLayouts.DisposeTree(replacement)
    if !(staleRejected && visible && failure && failedResult && released) {
      throw InvalidOperationException("background=" + staleRejected.ToString() + "/" + visible.ToString()
        + "/" + failure.ToString() + "/" + failedResult.ToString() + "/" + released.ToString()
        + " invalidations=" + invalidations.ToString())
    }
    return staleRejected && visible && failure && failedResult && released
  }

  private func ownedSource() ImageSource {
    return ImageSource(2, 1, []uint8{ 255, 0, 0, 255, 0, 0, 255, 255 })
  }

  private func renderBox(path string, fit ImageFit, color Color, gradient Gradient?, radius float64,
    border float64) SKImage {
    let box = if let g = gradient {
      Container{ Width: 40, Height: 40, BackgroundColor: color, BackgroundGradient: g,
        BackgroundImage: path, BackgroundImageFit: fit,
        BorderRadius: radius, BorderWidth: border, BorderColor: Color.White }
    } else {
      Container{ Width: 40, Height: 40, BackgroundColor: color,
        BackgroundImage: path, BackgroundImageFit: fit,
        BorderRadius: radius, BorderWidth: border, BorderColor: Color.White }
    }
    let n = Reconciler{ Res: Resolver{} }.Mount(box)
    if path != "" { waitForBackground(n, path) }
    Layout().Calculate(n, 40.0F, 40.0F)
    let image = Painter().RenderOffscreen(n, 40, 40)
    TextLayouts.DisposeTree(n)
    return image
  }

  private func waitForBackground(n Node, path string) bool {
    let request = ImageDecoding.Request(path)
    defer request.Release()
    if !request.Wait().IsValid { return false }
    BackgroundImageLayouts.Refresh(n)
    guard let image = BackgroundImageLayouts.Image(n) else { return false }
    return image.IsValid
  }

  private func wideRectPath() VectorPath {
    return PathBuilder(0.0, 0.0, 2.0, 1.0)
      .MoveTo(0.0, 0.0).LineTo(2.0, 0.0).LineTo(2.0, 1.0).LineTo(0.0, 1.0).Close().Build()
  }

  private func circlePath() VectorPath {
    return PathBuilder()
      .MoveTo(0.5, 0.0)
      .ArcTo(0.5, 0.5, 0.0, false, true, 0.5, 1.0)
      .ArcTo(0.5, 0.5, 0.0, false, true, 0.5, 0.0)
      .Close()
      .Build()
  }

  private func sameRect(left Rect, right Rect) bool {
    return left.X == right.X && left.Y == right.Y && left.W == right.W && left.H == right.H
  }

  private func pixel(image SKImage, x int32, y int32) SKColor {
    using let bitmap = SKBitmap.FromImage(image)
    return bitmap.GetPixel(x, y)
  }

  private func isRed(image SKImage, x int32, y int32) bool {
    let color = pixel(image, x, y)
    return color.Red >= 245 && color.Green <= 10 && color.Blue <= 10
  }

  private func isBlue(image SKImage, x int32, y int32) bool {
    let color = pixel(image, x, y)
    return color.Blue >= 245 && color.Red <= 10 && color.Green <= 10
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
