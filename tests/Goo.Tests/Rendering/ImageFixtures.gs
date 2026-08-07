package Goo

import SkiaSharp
import System.Threading.Tasks
import Goo.InternalTextInterop

internal class ImageFixtures {
  func DecodedImageSurface(path string) bool {
    ImageDecoding.ResetForTests()
    defer ImageDecoding.ResetForTests()
    let intrinsicRoot = mountChild(Image{ Path: path, AlignSelf: AlignSelf.FlexStart })
    defer TextLayouts.DisposeTree(intrinsicRoot)
    let intrinsic = intrinsicRoot.Children[0]
    if !waitForDecode(intrinsic) { return false }
    Layout().Calculate(intrinsicRoot, 200.0F, 200.0F)
    let widthRoot = mountChild(Image{ Path: path, Width: 40, AlignSelf: AlignSelf.FlexStart })
    defer TextLayouts.DisposeTree(widthRoot)
    let width = widthRoot.Children[0]
    let heightRoot = mountChild(Image{ Path: path, Height: 15, AlignSelf: AlignSelf.FlexStart })
    defer TextLayouts.DisposeTree(heightRoot)
    let height = heightRoot.Children[0]
    let fixedRoot = mountChild(Image{ Path: path, Width: 40, Height: 30, AlignSelf: AlignSelf.FlexStart })
    defer TextLayouts.DisposeTree(fixedRoot)
    let fixed = fixedRoot.Children[0]
    if !waitForDecode(width) || !waitForDecode(height) || !waitForDecode(fixed) { return false }
    Layout().Calculate(widthRoot, 200.0F, 200.0F)
    Layout().Calculate(heightRoot, 200.0F, 200.0F)
    Layout().Calculate(fixedRoot, 200.0F, 200.0F)
    for fit in []ImageFit{ ImageFit.Contain, ImageFit.Cover, ImageFit.Fill, ImageFit.None } {
      using let image = render(path, fit, 0)
      if !fitPasses(image, fit) { return false }
    }
    using let padded = render(path, ImageFit.Fill, 5)
    using let rounded = renderSurface(path, 0, 10, 1.0)
    using let translucent = renderSurface(path, 0, 0, 0.5)
    let result = intrinsic.Rect.W == 20.0F && intrinsic.Rect.H == 10.0F
      && width.Rect.W == 40.0F && width.Rect.H == 20.0F
      && height.Rect.W == 30.0F && height.Rect.H == 15.0F
      && fixed.Rect.W == 40.0F && fixed.Rect.H == 30.0F
      && isBlack(padded, 3, 20) && isRed(padded, 10, 20)
      && isBlack(rounded, 1, 1) && isRed(rounded, 10, 20)
      && isHalfRed(translucent, 10, 20)
    return result
  }
  func EmptyPathContract() bool {
    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    defer ImageDecoding.ResetForTests()
    let rec = Reconciler{ Res: Resolver{} }
    let root = rec.Mount(Container{ Width: 100, Height: 100, Children: {
      Image{ Path: "synthetic-before-empty", Fit: ImageFit.Contain, AlignSelf: AlignSelf.FlexStart } } })
    defer TextLayouts.DisposeTree(root)
    let image = root.Children[0]
    guard let request = image.ImageRequest else { return false }
    if !request.Wait().IsValid { return false }
    ImageLayouts.Refresh(image)
    Layout().Calculate(root, 100.0F, 100.0F)
    let hadNaturalSize = image.Rect.W == 20.0F && image.Rect.H == 10.0F
    let retained = rec.Diff(root, Container{ Width: 100, Height: 100,
      Children: { Image{ Path: "", Fit: ImageFit.Fill, AlignSelf: AlignSelf.FlexStart } } })
    Layout().Calculate(retained, 100.0F, 100.0F)
    return retained == root && hadNaturalSize
      && image.ImageFit == ImageFit.Fill
      && image.ImageRequest == nil && image.ImageCompletion == nil && image.DecodedImage == nil
      && image.Rect.W == 0.0F && image.Rect.H == 0.0F
  }

  func ImageCanonicalPathContract(absolute string, relative string, missing string) bool {
    ImageDecoding.ResetForTests()
    defer ImageDecoding.ResetForTests()
    if !negativeCacheKeepsDeclaredBox(missing) { return false }
    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    if !canonicalCacheRetainsImageNode(absolute, relative) { return false }
    return true
  }
  private func negativeCacheKeepsDeclaredBox(path string) bool {
    let first = Reconciler{ Res: Resolver{} }.Mount(Image{ Path: path, Width: 40, Height: 30 })
    defer TextLayouts.DisposeTree(first)
    let second = Reconciler{ Res: Resolver{} }.Mount(Image{ Path: path, Width: 40, Height: 30 })
    defer TextLayouts.DisposeTree(second)
    guard let firstRequest = first.ImageRequest else { return false }
    guard let secondRequest = second.ImageRequest else { return false }
    firstRequest.Wait()
    secondRequest.Wait()
    ImageLayouts.Refresh(first)
    ImageLayouts.Refresh(second)
    Layout().Calculate(first, 100.0F, 100.0F)
    Layout().Calculate(second, 100.0F, 100.0F)
    let result = firstRequest == secondRequest && !firstRequest.Result.IsValid
      && first.Rect.W == 40.0F && first.Rect.H == 30.0F
    return result
  }
  private func canonicalCacheRetainsImageNode(absolute string, relative string) bool {
    let rec = Reconciler{ Res: Resolver{} }
    let left = rec.Mount(Image{ Key: "image", Path: absolute, Fit: ImageFit.Contain })
    defer TextLayouts.DisposeTree(left)
    let right = rec.Mount(Image{ Path: relative })
    defer TextLayouts.DisposeTree(right)
    guard let leftRequest = left.ImageRequest else { return false }
    guard let rightRequest = right.ImageRequest else { return false }
    leftRequest.Wait()
    rightRequest.Wait()
    ImageLayouts.Refresh(left)
    ImageLayouts.Refresh(right)
    let retained = rec.Diff(left, Image{ Key: "image", Path: absolute, Fit: ImageFit.Cover })
    let result = leftRequest == rightRequest && left.DecodedImage == right.DecodedImage
      && retained == left && retained.Kind == NodeKind.Image && retained.ImageFit == ImageFit.Cover
    return result
  }
  func ByteEvictionKeepsAttachedImagePaintable() bool {
    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    defer ImageDecoding.ResetForTests()
    let path = "synthetic-byte-eviction"
    let image = Reconciler{ Res: Resolver{} }.Mount(Image{
      Path: path, Width: 40, Height: 20,
    })
    defer TextLayouts.DisposeTree(image)
    let request = ImageDecoding.Request(path)
    ImageDecoding.SetCacheByteBudgetForTests(0)
    let decoded = request.Wait().IsValid
    let evicted = ImageDecoding.CacheCountForTests() == 0
      && ImageDecoding.CachedDecodedBytesForTests() == 0
    request.Release()
    let refreshed = ImageLayouts.Refresh(image)
    Layout().Calculate(image, 40.0F, 20.0F)
    using let painted = Painter().RenderOffscreen(image, 40, 20)
    let visible = isRed(painted, 10, 10) && isBlue(painted, 30, 10)
    return decoded && evicted && refreshed && visible
  }
  func ImageCompletionContract(missing string) bool {
    ImageDecoding.ResetForTests()
    ImageDecoding.UseSyntheticDecoderForTests(true)
    defer ImageDecoding.ResetForTests()
    let gate = TaskCompletionSource[bool]()
    ImageDecoding.SetDecodeGateForTests(gate.Task)
    let cell = ImageCompletionCell{}
    let window = Window{ Root: cell, Width: 100, Height: 100 }
    defer window.Close()
    window.UpdateTree()
    guard let tree = window.Tree else { return false }
    let image = tree.Children[0]
    guard let request = image.ImageRequest else { return false }
    guard let registration = image.ImageCompletion else { return false }
    gate.SetResult(true)
    request.Wait()
    registration.Wait()
    window.UpdateTree()
    let intrinsic = image.Rect.W == 20.0F && image.Rect.H == 10.0F
    let hit = Hit().Topmost(tree, 5.0F, 5.0F) == image
    let failedGate = TaskCompletionSource[bool]()
    ImageDecoding.SetDecodeGateForTests(failedGate.Task)
    ImageDecoding.UseSyntheticDecoderForTests(false)
    cell.Path = missing
    cell.Rebuild()
    window.UpdateTree()
    guard let failedRequest = image.ImageRequest else { return false }
    guard let failedRegistration = image.ImageCompletion else { return false }
    let retained = image.Rect.W == 20.0F && image.Rect.H == 10.0F
    failedGate.SetResult(true)
    failedRequest.Wait()
    failedRegistration.Wait()
    window.UpdateTree()
    let collapsed = image.Rect.W == 0.0F && image.Rect.H == 0.0F
    let pendingGate = TaskCompletionSource[bool]()
    ImageDecoding.SetDecodeGateForTests(pendingGate.Task)
    ImageDecoding.UseSyntheticDecoderForTests(true)
    cell.Path = "synthetic-pending-removal"
    cell.ShowImage = true
    cell.Rebuild()
    window.UpdateTree()
    let pendingImage = tree.Children[0]
    guard let pendingRequest = pendingImage.ImageRequest else { return false }
    guard let pendingRegistration = pendingImage.ImageCompletion else { return false }
    pendingGate.SetResult(true)
    pendingRequest.Wait()
    pendingRegistration.Wait()
    cell.ShowImage = false
    cell.Rebuild()
    window.UpdateTree()
    let dropped = tree.Children[0].Kind == NodeKind.Text
    return intrinsic && hit && retained && collapsed && dropped
  }
  func OwnedSourcesShareLifetimeAndPaint() bool {
    let source = sourceImage()
    let rec = Reconciler{ Res: Resolver{} }
    let node = rec.Mount(Image{ Width: 40, Height: 20, Fit: ImageFit.Fill,
      Source: source, BackgroundImageSource: source })
    Layout().Calculate(node, 40.0F, 20.0F)
    using let beforeDispose = Painter().RenderOffscreen(node, 40, 20)
    let mounted = source.ActiveLeases == 2 && node.DecodedImage != nil
      && BackgroundImageLayouts.Image(node) != nil
    source.Dispose()
    Layout().Calculate(node, 40.0F, 20.0F)
    using let afterOwnerDispose = Painter().RenderOffscreen(node, 40, 20)
    let retained = source.IsDisposed && source.ActiveLeases == 2 && node.DecodedImage != nil
      && BackgroundImageLayouts.Image(node) != nil
    let replacement = rec.Diff(node, Text{ Content: "replacement" })
    let released = source.ActiveLeases == 0 && replacement.Kind == NodeKind.Text
    TextLayouts.DisposeTree(replacement)
    return mounted && retained && released
  }
  func ProviderReplacementCompletionFailureAndReleaseContract() bool {
    let first = TestImageSourceProvider{}
    let second = TestImageSourceProvider{}
    let successful = sourceImage()
    let rec = Reconciler{ Res: Resolver{} }
    let node = rec.Mount(Image{ Key: "image", Source: first, AlignSelf: AlignSelf.FlexStart })
    guard let stale = first.Lease else { return false }
    let retained = rec.Diff(node, Image{ Key: "image", Source: second,
      AlignSelf: AlignSelf.FlexStart })
    guard let active = second.Lease else { return false }
    let staleRejected = stale.IsDisposed && first.Releases == 1 && !stale.Complete(successful)
    let completed = active.Complete(successful)
    ImageLayouts.Refresh(node)
    Layout().Calculate(node, 100.0F, 100.0F)
    let ready = retained == node && completed && node.DecodedImage != nil
      && first.Acquires == 1 && second.Acquires == 1
    let failedProvider = TestImageSourceProvider{ ThrowOnRelease: true }
    let failed = rec.Diff(node, Image{ Key: "image", Source: failedProvider,
      AlignSelf: AlignSelf.FlexStart })
    guard let failedLease = failedProvider.Lease else { return false }
    let failureCompleted = failedLease.Fail()
    ImageLayouts.Refresh(node)
    Layout().Calculate(node, 100.0F, 100.0F)
    let collapsed = failed == node && failureCompleted && node.DecodedImage == nil
    let replacement = rec.Diff(node, Text{ Content: "replacement" })
    let released = failedLease.IsDisposed && failedProvider.Releases == 1
      && replacement.Kind == NodeKind.Text
    successful.Dispose()
    TextLayouts.DisposeTree(replacement)
    return staleRejected && ready && collapsed && released
  }
  func OwnedSourceInputContract() bool {
    var shortRejected bool
    var overflowRejected bool
    try {
      ImageSource(2, 1, []uint8{ 0, 0, 0, 0 })
    } catch (error ArgumentException) {
      shortRejected = true
    }
    try {
      ImageSource(Int32.MaxValue, Int32.MaxValue, []uint8{})
    } catch (error ArgumentOutOfRangeException) {
      overflowRejected = true
    }
    let source = sourceImage()
    let lease = source.Acquire()
    source.Dispose()
    let retained = lease.IsComplete && !lease.IsFailed && source.ActiveLeases == 1
    lease.Dispose()
    return shortRejected && overflowRejected && retained && source.ActiveLeases == 0
  }
  func OwnedSourceCopiesPixels() bool {
    let pixels = []uint8{ 255, 0, 0, 255 }
    let source = ImageSource(1, 1, pixels)
    pixels[0] = 0
    pixels[3] = 0
    let node = Reconciler{ Res: Resolver{} }.Mount(Image{ Source: source, Width: 20, Height: 20, Fit: ImageFit.Fill })
    Layout().Calculate(node, 20.0F, 20.0F)
    using let painted = Painter().RenderOffscreen(node, 20, 20)
    let copied = isRed(painted, 10, 10)
    TextLayouts.DisposeTree(node)
    source.Dispose()
    return copied
  }
  func CompletionCallbackExceptionLeavesLeaseReleasable() bool {
    let source = sourceImage()
    let lease = ImageSourceLease()
    var invoked bool
    lease.OnCompleted(func() {
      invoked = true
      throw InvalidOperationException("completion")
    })
    var threw bool
    try {
      lease.Complete(source)
    } catch (error InvalidOperationException) {
      threw = true
    }
    let completed = threw && invoked && lease.IsComplete && !lease.IsFailed
      && source.ActiveLeases == 1
    lease.Dispose()
    let released = lease.IsDisposed && source.ActiveLeases == 0
    source.Dispose()
    return completed && released
  }
  func ProviderWindowCompletionAndDisposedLeaseContract() bool {
    let provider = TestImageSourceProvider{}
    let cell = ImageSourceWindowCell{ Provider: provider }
    let window = Window{ Root: cell, Width: 100, Height: 100 }
    window.UpdateTree()
    guard let tree = window.Tree else { return false }
    let image = tree.Children[0]
    guard let lease = provider.Lease else { return false }
    let source = sourceImage()
    let completed = lease.Complete(source)
    window.UpdateTree()
    let updated = completed && image.DecodedImage != nil
      && image.Rect.W == 2.0F && image.Rect.H == 1.0F
    window.Close()
    let released = lease.IsDisposed && provider.Releases == 1 && source.ActiveLeases == 0
    source.Dispose()
    let disposedProvider = TestImageSourceProvider{ ReturnDisposed: true }
    let node = Reconciler{ Res: Resolver{} }.Mount(Image{ Source: disposedProvider })
    let failed = (node.ImageLease?.IsComplete ?? false) && (node.ImageLease?.IsFailed ?? false)
    TextLayouts.DisposeTree(node)
    return updated && released && failed
  }
  private func sourceImage() ImageSource { return ImageSource(2, 1, []uint8{ 255, 0, 0, 255, 0, 0, 255, 255 }) }

  private func mountChild(child Image) Node {
    return Reconciler{ Res: Resolver{} }.Mount(Container{ Width: 200, Height: 200, Children: { child } })
  }
  private func waitForDecode(n Node) bool {
    guard let request = n.ImageRequest else { return false }
    let decoded = request.Wait()
    ImageLayouts.Refresh(n)
    return decoded.IsValid
  }
  private func render(path string, fit ImageFit, padding float64) SKImage {
    let n = Reconciler{ Res: Resolver{} }.Mount(Image{
      Path: path, Fit: fit, Width: 40, Height: 40, Padding: padding, BackgroundColor: Color.Black })
    return renderNode(n)
  }
  private func renderSurface(path string, padding float64, radius float64, opacity float64) SKImage {
    let n = Reconciler{ Res: Resolver{} }.Mount(Image{
      Path: path, Fit: ImageFit.Fill, Width: 40, Height: 40, Padding: padding,
      BorderRadius: radius, BorderWidth: 2, BorderColor: Color.White,
      BackgroundColor: Color.Black, Opacity: opacity })
    return renderNode(n)
  }
  private func renderNode(n Node) SKImage {
    defer TextLayouts.DisposeTree(n)
    waitForDecode(n)
    Layout().Calculate(n, 40.0F, 40.0F)
    return Painter().RenderOffscreen(n, 40, 40)
  }
  private func pixel(image SKImage, x int32, y int32) SKColor {
    using let bitmap = SKBitmap.FromImage(image)
    return bitmap.GetPixel(x, y)
  }
  private func fitPasses(image SKImage, fit ImageFit) bool {
    if fit == ImageFit.Contain { return isBlack(image, 20, 5) && isRed(image, 10, 20) && isBlue(image, 30, 20) }
    if fit == ImageFit.Cover { return isRed(image, 2, 20) && isBlue(image, 37, 20) }
    if fit == ImageFit.Fill { return isRed(image, 10, 20) && isBlue(image, 30, 20) }
    return isBlack(image, 0, 20) && isRed(image, 12, 20) && isBlue(image, 28, 20)
  }
  private func isRgb(image SKImage, x int32, y int32, redMin int32, redMax int32, blueMin int32, blueMax int32) bool {
    let color = pixel(image, x, y)
    return color.Red >= redMin && color.Red <= redMax && color.Green <= 10 && color.Blue >= blueMin && color.Blue <= blueMax
  }
  private func isRed(image SKImage, x int32, y int32) bool { return isRgb(image, x, y, 245, 255, 0, 10) }
  private func isBlue(image SKImage, x int32, y int32) bool { return isRgb(image, x, y, 0, 10, 245, 255) }
  private func isBlack(image SKImage, x int32, y int32) bool { return isRgb(image, x, y, 0, 10, 0, 10) }
  private func isHalfRed(image SKImage, x int32, y int32) bool { return isRgb(image, x, y, 186, 189, 0, 10) }
}
internal class ImageCompletionCell : Cell {
  internal var Path string
  internal var ShowImage bool
  init() {
    Path = "synthetic-completion"
    ShowImage = true
  }
  override func Build() Blob {
    if ShowImage { return Container{ Width: 100, Height: 100, Children: { Image{ Key: "image", Path: Path, AlignSelf: AlignSelf.FlexStart } } } }
    return Container{ Width: 100, Height: 100, Children: { Text{ Key: "replacement", Content: "replacement" } } }
  }
}
internal class TestImageSourceProvider : ImageSourceProvider {
  internal var Lease ImageSourceLease?
  internal var Acquires int32
  internal var Releases int32
  internal prop ThrowOnRelease bool { get; set; }
  internal prop ReturnDisposed bool { get; set; }
  func Acquire() ImageSourceLease {
    Acquires = Acquires + 1
    let lease = ImageSourceLease()
    lease.Released += func() {
      Releases = Releases + 1
      if ThrowOnRelease { throw InvalidOperationException("release") }
    }
    if ReturnDisposed { lease.Dispose() }
    Lease = lease
    return lease
  }
}
internal class ImageSourceWindowCell : Cell {
  internal prop Provider TestImageSourceProvider { get; set; }
  override func Build() Blob { return Container{ Width: 100, Height: 100, Children: { Image{ Key: "image", Source: Provider, AlignSelf: AlignSelf.FlexStart } } } }
}
