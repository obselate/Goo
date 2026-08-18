package GooPackageSmoke

import System
import System.IO
import System.Threading
import Goo

class SmokeCell : Cell {
  internal var TextValue State[string]
  internal var PressureSource State[ImageSourceProvider]
  internal var PressureEnabled State[bool]
  private var ImageProvider ImageSourceProvider?
  private var BackgroundProvider ImageSourceProvider?

  shared {
    let Root ElementHandle = ElementHandle{}
    let Viewport ElementHandle = ElementHandle{}
    let ScrollLeaf ElementHandle = ElementHandle{}
    let SharedImageSource ImageSource = ImageSource(2, 2, []uint8{
      255, 72, 72, 255,
      72, 224, 128, 255,
      72, 128, 224, 255,
      236, 196, 72, 255,
    })
  }

  init() {
    TextValue = Track("Goo Vulkan text")
    PressureSource = Track[ImageSourceProvider](SmokeCell.SharedImageSource)
    PressureEnabled = Track(false)
    ImageProvider = nil
    BackgroundProvider = nil
  }

  init(imageProvider ImageSourceProvider, backgroundProvider ImageSourceProvider) {
    TextValue = Track("Goo Vulkan text")
    PressureSource = Track[ImageSourceProvider](SmokeCell.SharedImageSource)
    PressureEnabled = Track(false)
    ImageProvider = imageProvider
    BackgroundProvider = backgroundProvider
  }

  internal func SetPressureSource(source ImageSourceProvider) {
    PressureSource.Value = source
    PressureEnabled.Value = true
  }

  override func Build() Blob {
    let imageSource ImageSourceProvider = if PressureEnabled.Value {
      PressureSource.Value
    } else if let source = ImageProvider {
      source
    } else {
      SmokeCell.SharedImageSource
    }
    let backgroundSource ImageSourceProvider = if PressureEnabled.Value {
      SmokeCell.SharedImageSource
    } else if let source = BackgroundProvider {
      source
    } else {
      SmokeCell.SharedImageSource
    }
    return Container{
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      Handle: SmokeCell.Root,
      Padding: 12,
      Gap: 8,
      Position: PositionType.Relative,
      BackgroundColor: Color.Rgb(12, 20, 32),
      Children: {
        Text{
          Content: TextValue.Value,
          FontSize: 24,
          Color: Color.White,
        },
        Container{
          Width: 224,
          Height: 48,
          BackgroundImageSource: backgroundSource,
          BackgroundImageFit: ImageFit.Cover,
          BorderStyle: BorderStyle.Solid,
          BorderTopWidth: 2,
          BorderRightWidth: 2,
          BorderBottomWidth: 2,
          BorderLeftWidth: 2,
          BorderTopColor: Color.Rgb(236, 128, 64),
          BorderRightColor: Color.Rgb(128, 236, 96),
          BorderBottomColor: Color.Rgb(64, 160, 236),
          BorderLeftColor: Color.Rgb(212, 96, 212),
          Children: {
            Image{
              Width: 96,
              Height: 48,
              Source: imageSource,
              Fit: ImageFit.Contain,
            },
          },
        },
        Container{
          Width: 224,
          Height: 48,
          BorderRadius: 12,
          BackgroundGradient: LinearGradient(90.0, []GradientStop{
            GradientStop{ Offset: 0.0, Color: Color.Rgb(24, 68, 132) },
            GradientStop{ Offset: 0.3, Color: Color.Rgb(46, 126, 196) },
            GradientStop{ Offset: 0.7, Color: Color.Rgb(88, 172, 210) },
            GradientStop{ Offset: 1.0, Color: Color.Rgb(38, 92, 152) },
          }),
        },
        Container{
          Width: 224,
          Height: 48,
          BorderRadius: 12,
          BackgroundGradient: RadialGradient(0.5, 0.5, 0.5, []GradientStop{
            GradientStop{ Offset: 0.0, Color: Color.Rgb(232, 178, 78) },
            GradientStop{ Offset: 1.0, Color: Color.Rgb(128, 54, 92) },
          }),
        },
        Container{
          Width: 224,
          Height: 20,
          BorderStyle: BorderStyle.Dashed,
          BorderTopWidth: 3,
          BorderRightWidth: 4,
          BorderBottomWidth: 2,
          BorderLeftWidth: 5,
          BorderTopColor: Color.Rgb(224, 72, 72),
          BorderRightColor: Color.Rgb(72, 224, 128),
          BorderBottomColor: Color.Rgb(72, 128, 224),
          BorderLeftColor: Color.Rgb(224, 184, 72),
        },
        Container{
          Width: 224,
          Height: 20,
          BorderStyle: BorderStyle.Dotted,
          BorderTopWidth: 2,
          BorderRightWidth: 3,
          BorderBottomWidth: 4,
          BorderLeftWidth: 3,
          BorderTopColor: Color.Rgb(236, 128, 64),
          BorderRightColor: Color.Rgb(128, 236, 96),
          BorderBottomColor: Color.Rgb(64, 160, 236),
          BorderLeftColor: Color.Rgb(212, 96, 212),
        },
        Container{
          Position: PositionType.Absolute,
          Left: 236,
          Top: 8,
          Width: 72,
          Height: 156,
          Children: {
            Container{
              Position: PositionType.Absolute,
              Width: 28,
              Height: 28,
              Transform: PanelTransform{ TranslateX: 2, TranslateY: 2 },
              Children: {
                Container{
                  Width: 12,
                  Height: 12,
                  Transform: PanelTransform{ TranslateX: 3, TranslateY: 3 },
                  BackgroundColor: Color.Rgb(46, 126, 196),
                },
              },
            },
            Container{
              Position: PositionType.Absolute,
              Top: 36,
              Width: 64,
              Height: 48,
              Overflow: Overflow.Scroll,
              Handle: SmokeCell.Viewport,
              Children: {
                Container{
                  Width: 120,
                  Height: 40,
                  Overflow: Overflow.Hidden,
                  Children: {
                    Container{
                      Width: 20,
                      Height: 20,
                      Handle: SmokeCell.ScrollLeaf,
                      BackgroundColor: Color.Rgb(28, 180, 92),
                    },
                  },
                },
              },
            },
            Container{
              Position: PositionType.Absolute,
              Top: 90,
              Width: 16,
              Height: 16,
              Visibility: Visibility.Hidden,
              BackgroundColor: Color.Rgb(210, 30, 30),
            },
            Container{
              Position: PositionType.Absolute,
              Left: 20,
              Top: 90,
              Width: 16,
              Height: 16,
              Opacity: 0.5,
              BackgroundColor: Color.Rgb(220, 180, 20),
            },
            Container{
              Position: PositionType.Absolute,
              Left: 40,
              Width: 24,
              Height: 24,
              ZIndex: -1,
              BackgroundColor: Color.Rgb(20, 60, 220),
            },
            Container{
              Position: PositionType.Absolute,
              Left: 40,
              Width: 24,
              Height: 24,
              ZIndex: 1,
              BackgroundColor: Color.Rgb(220, 40, 40),
            },
          },
        },
      }
    }
  }
}

class RegisteredFontSmokeCell : Cell {
  shared {
    let Root ElementHandle = ElementHandle{}
  }

  override func Build() Blob {
    return Container{
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      Handle: RegisteredFontSmokeCell.Root,
      Children: {
        Text{
          Content: "A a",
          FontFamily: "GooSmokePrimary,GooSmokeFallback",
          FontSize: 28,
          Color: Color.White,
        },
      },
    }
  }
}

public class VersionedImageProvider : ImageSourceProvider {
  private let gate object
  private var version uint64
  private var currentLease ImageSourceLease?
  private var staleLease ImageSourceLease?
  private var acquireCount int32
  private var releasedCount int32

  init() {
    gate = Object()
    version = 1uL
  }

  public prop ContentVersion uint64 {
    get {
      var result uint64
      lock gate { result = version }
      return result
    }
  }

  public event ContentChanged Action

  public prop AcquireCount int32 {
    get {
      var result int32
      lock gate { result = acquireCount }
      return result
    }
  }

  public prop ReleasedCount int32 {
    get {
      var result int32
      lock gate { result = releasedCount }
      return result
    }
  }

  public func Acquire() ImageSourceLease {
    let lease = ImageSourceLease()
    lease.Released += func() {
      lock gate { releasedCount = releasedCount + 1 }
    }
    lock gate {
      if let current = currentLease { staleLease = current }
      currentLease = lease
      acquireCount = acquireCount + 1
    }
    return lease
  }

  public func CompleteCurrent(source ImageSource) bool {
    var lease ImageSourceLease?
    lock gate {
      lease = currentLease
      if let current = currentLease { staleLease = current }
      currentLease = nil
    }
    guard let current = lease else { return false }
    return current.Complete(source)
  }

  public func CompleteStale(source ImageSource) bool {
    var lease ImageSourceLease?
    lock gate { lease = staleLease }
    guard let current = lease else { return false }
    return current.Complete(source)
  }

  public func FailCurrent() bool {
    var lease ImageSourceLease?
    lock gate {
      lease = currentLease
      if let current = currentLease { staleLease = current }
      currentLease = nil
    }
    guard let current = lease else { return false }
    return current.Fail()
  }

  public func CompleteAndAdvanceAsync(source ImageSource) Thread {
    let worker = Thread(func() {
      CompleteCurrent(source)
      Advance()
    })
    worker.Start()
    return worker
  }

  public func Advance() {
    var changed Action?
    lock gate {
      if version == UInt64.MaxValue { throw InvalidOperationException("Image provider version overflow") }
      version = version + 1uL
      changed = ContentChanged
    }
    changed?.Invoke()
  }
}

class PressureImageProvider : ImageSourceProvider, IDisposable {
  private let source ImageSource
  private var acquireCount int32
  private var releasedCount int32

  init(nativeSource ImageSource) {
    source = nativeSource
  }

  public prop ContentVersion uint64 { get { return 1uL } }
  public event ContentChanged Action
  public prop AcquireCount int32 { get { return Interlocked.CompareExchange(&acquireCount, 0, 0) } }
  public prop ReleasedCount int32 { get { return Interlocked.CompareExchange(&releasedCount, 0, 0) } }

  public func Acquire() ImageSourceLease {
    let lease = source.Acquire()
    Interlocked.Increment(&acquireCount)
    lease.Released += func() { Interlocked.Increment(&releasedCount) }
    return lease
  }

  public func Dispose() {
    source.Dispose()
  }
}

func CreatePressureImage(width int32, height int32, seed uint8) PressureImageProvider {
  let pixels = [width * height * 4]uint8
  var index int32 = 0
  while index < pixels.Length {
    pixels[index] = seed
    pixels[index + 1] = uint8(96)
    pixels[index + 2] = uint8(224)
    pixels[index + 3] = uint8(255)
    index = index + 4
  }
  return PressureImageProvider(ImageSource(width, height, pixels))
}

func PumpPressureSwap(window Window, root SmokeCell,
  prior PressureImageProvider, next PressureImageProvider) {
  root.SetPressureSource(next)
  var pumps int32 = 0
  while pumps < 6 {
    window.Pump(0.016)
    pumps = pumps + 1
  }
  if !window.IsOpen || next.AcquireCount == 0
    || prior.ReleasedCount != prior.AcquireCount {
    throw InvalidOperationException("Native image pressure swap did not settle")
  }
  prior.Dispose()
}

func RunImagePressureSmoke(window Window, root SmokeCell, initial PressureImageProvider) {
  var current = initial
  var index int32 = 1
  while index < 257 {
    let next = CreatePressureImage(1, 1, uint8(index % 251))
    PumpPressureSwap(window, root, current, next)
    current = next
    index = index + 1
  }
  index = 0
  while index < 17 {
    let next = CreatePressureImage(1024, 1024, uint8(index % 251))
    PumpPressureSwap(window, root, current, next)
    current = next
    index = index + 1
  }
  if !window.IsOpen || current.AcquireCount == current.ReleasedCount {
    throw InvalidOperationException("Native image pressure smoke closed or lost its current lease")
  }
  window.RequestClose()
  window.Pump(0.0)
  if window.IsOpen || current.ReleasedCount != current.AcquireCount {
    throw InvalidOperationException("Native image pressure smoke did not release its final lease")
  }
  current.Dispose()
}

func RunRegisteredFontSmoke() {
  let primaryPath = Path.Combine(AppContext.BaseDirectory, "HarfBuzz-adwaita-colrv1.ttf")
  let fallbackPath = Path.Combine(AppContext.BaseDirectory, "VendSans-VariableFont_wght.ttf")
  if !File.Exists(primaryPath) || !File.Exists(fallbackPath) {
    throw FileNotFoundException("Registered font smoke assets are missing")
  }
  let primaryBytes = File.ReadAllBytes(primaryPath)
  let fallbackBytes = File.ReadAllBytes(fallbackPath)
  let primary = FontSource("GooSmokePrimary", 400, false, primaryBytes)
  let fallback = FontSource("GooSmokeFallback", 400, false, fallbackBytes)
  primaryBytes[0] = 0u
  fallbackBytes[0] = 0u
  try {
    primary.Register()
    fallback.Register()
    if !primary.IsRegistered || !fallback.IsRegistered {
      throw InvalidOperationException("Registered font smoke did not register both sources")
    }
    let root = RegisteredFontSmokeCell{}
    let window = Window{
      Title: "Goo registered font smoke",
      Width: 240,
      Height: 80,
      VSync: false,
      Root: root,
    }
    window.Open()
    window.Pump(0.0)
    if !window.IsOpen || !RegisteredFontSmokeCell.Root.IsMounted
      || RegisteredFontSmokeCell.Root.BorderBox.Width <= 0.0
      || RegisteredFontSmokeCell.Root.BorderBox.Height <= 0.0 {
      throw InvalidOperationException("Registered font smoke did not render its root")
    }
    primary.Dispose()
    fallback.Dispose()
    window.Pump(0.0)
    if !window.IsOpen {
      throw InvalidOperationException("Registered font smoke lost its retained font lease")
    }
    window.RequestClose()
    window.Pump(0.0)
    if window.IsOpen {
      throw InvalidOperationException("Registered font smoke window did not close")
    }
  } finally {
    fallback.Dispose()
    primary.Dispose()
  }
}

func Main() {
  Window.ConfigureApplication("Goo package smoke", "0.1.0", "io.github.obselate.goo.smoke")
  if Environment.GetEnvironmentVariable("GOO_REGISTERED_FONT_SMOKE") == "1" {
    RunRegisteredFontSmoke()
    return
  }
  if Environment.GetEnvironmentVariable("GOO_NATIVE_MULTIWINDOW_SMOKE") == "1" {
    let firstRoot = Cell{}
    let secondRoot = Cell{}
    let first = Window{
      Title: "Goo package smoke first",
      Width: 160,
      Height: 90,
      VSync: false,
      Root: firstRoot,
    }
    let second = Window{
      Title: "Goo package smoke second",
      Width: 160,
      Height: 90,
      VSync: false,
      Root: secondRoot,
    }
    first.Open()
    second.Open()
    first.Pump(0.0)
    second.Pump(0.0)
    if !first.IsOpen || !second.IsOpen {
      throw InvalidOperationException("Native multi-window smoke did not present both windows")
    }
    first.State = WindowState.Minimized
    second.Background = Color.Rgb(20, 28, 40)
    var secondScheduled int32 = 0
    second.Post(func() {
      Interlocked.Exchange(&secondScheduled, 1)
      first.RequestClose()
    })
    let watchdog = Thread(func() {
      Thread.Sleep(5000)
      if Interlocked.CompareExchange(&secondScheduled, 0, 0) == 0 {
        first.RequestClose()
      }
    })
    watchdog.IsBackground = true
    watchdog.Start()
    first.Run()
    if Interlocked.CompareExchange(&secondScheduled, 0, 0) == 0 {
      second.RequestClose()
      second.Pump(0.0)
      throw InvalidOperationException("Native multi-window scheduler starved the demanded window")
    }
    second.RequestClose()
    second.Pump(0.0)
    if first.IsOpen || second.IsOpen {
      throw InvalidOperationException("Native multi-window smoke windows did not close")
    }
    return
  }
  let nativeSmoke = Environment.GetEnvironmentVariable("GOO_NATIVE_SMOKE") == "1"
  let pressureSmoke = Environment.GetEnvironmentVariable("GOO_NATIVE_IMAGE_PRESSURE_SMOKE") == "1"
  var imageProvider VersionedImageProvider?
  var backgroundProvider VersionedImageProvider?
  var imageV1 ImageSource?
  var imageV2 ImageSource?
  var backgroundV1 ImageSource?
  var backgroundV2 ImageSource?
  if nativeSmoke {
    imageProvider = VersionedImageProvider{}
    backgroundProvider = VersionedImageProvider{}
    imageV1 = ImageSource(2, 2, []uint8{
      255, 64, 64, 255,
      255, 192, 64, 255,
      64, 192, 255, 255,
      64, 96, 255, 255,
    })
    imageV2 = ImageSource(2, 2, []uint8{
      64, 255, 96, 255,
      64, 255, 224, 255,
      192, 64, 255, 255,
      255, 64, 192, 255,
    })
    backgroundV1 = ImageSource(2, 2, []uint8{
      64, 255, 96, 255,
      64, 255, 224, 255,
      192, 64, 255, 255,
      255, 64, 192, 255,
    })
    backgroundV2 = ImageSource(2, 2, []uint8{
      255, 64, 64, 255,
      255, 192, 64, 255,
      64, 192, 255, 255,
      64, 96, 255, 255,
    })
  }
  let smokeRoot = if let provider = imageProvider {
    SmokeCell(provider, backgroundProvider!!)
  } else {
    SmokeCell{}
  }
  var pressureInitial PressureImageProvider?
  if pressureSmoke {
    pressureInitial = CreatePressureImage(1, 1, uint8(1))
    smokeRoot.SetPressureSource(pressureInitial!!)
  }
  let window = Window{
    Title: "Goo package smoke test",
    Width: 320,
    Height: 180,
    VSync: false,
    Root: smokeRoot,
  }

  var latestMetrics WindowMetrics = WindowMetrics{}
  var windowMetricEvents int32
  var minimizedStateEvents int32
  var latestRootMetrics ElementMetrics = ElementMetrics{}
  var rootMetricEvents int32
  window.MetricsChanged += func(value WindowMetrics) {
    latestMetrics = value
    windowMetricEvents = windowMetricEvents + 1
  }
  window.OnStateChange = func(value WindowState) {
    if value == WindowState.Minimized {
      minimizedStateEvents = minimizedStateEvents + 1
    }
  }
  SmokeCell.Root.MetricsChanged += func(value ElementMetrics) {
    latestRootMetrics = value
    rootMetricEvents = rootMetricEvents + 1
  }

  if pressureSmoke {
    let initial = pressureInitial!!
    window.Open()
    window.Pump(0.0)
    if !window.IsOpen || initial.AcquireCount == 0 {
      throw InvalidOperationException("Native image pressure smoke did not mount its initial lease")
    }
    RunImagePressureSmoke(window, smokeRoot, initial)
    return
  } else if Environment.GetEnvironmentVariable("GOO_NATIVE_PLAYGROUND") == "1" {
    window.Run()
  } else if Environment.GetEnvironmentVariable("GOO_NATIVE_SMOKE") == "1" {
    window.Open()
    window.Pump(0.0)
    if !SmokeCell.Viewport.IsMounted || !SmokeCell.ScrollLeaf.IsMounted {
      throw InvalidOperationException("Native smoke public handles did not mount")
    }
    if !SmokeCell.Root.IsMounted || windowMetricEvents == 0 || rootMetricEvents == 0 {
      throw InvalidOperationException("Native smoke resize handles did not report initial metrics")
    }
    if nativeSmoke {
      let image = imageProvider!!
      let background = backgroundProvider!!
      let firstImage = imageV1!!
      let secondImage = imageV2!!
      let firstBackground = backgroundV1!!
      let secondBackground = backgroundV2!!
      if image.ContentVersion != 1uL || background.ContentVersion != 1uL {
        throw InvalidOperationException("Versioned image providers did not start at version one")
      }
      let imageWorker = image.CompleteAndAdvanceAsync(firstImage)
      let backgroundWorker = background.CompleteAndAdvanceAsync(firstBackground)
      var asyncAttempts int32
      while asyncAttempts < 120 && (imageWorker.IsAlive || backgroundWorker.IsAlive) {
        window.Pump(0.016)
        asyncAttempts = asyncAttempts + 1
      }
      imageWorker.Join()
      backgroundWorker.Join()
      window.Pump(0.0)
      if image.ContentVersion != 2uL || background.ContentVersion != 2uL
        || image.AcquireCount != 2 || background.AcquireCount != 2
        || image.ReleasedCount != 1 || background.ReleasedCount != 1 {
        throw InvalidOperationException("Versioned image providers did not marshal async completion and change")
      }
      if image.CompleteStale(firstImage) {
        throw InvalidOperationException("Versioned image stale completion was accepted")
      }
      if !image.CompleteCurrent(secondImage) || !background.CompleteCurrent(secondBackground) {
        throw InvalidOperationException("Versioned image providers rejected the second completion")
      }
      window.Pump(0.0)
      window.Pump(0.0)
      image.Advance()
      background.Advance()
      if image.ContentVersion != 3uL || background.ContentVersion != 3uL
        || image.AcquireCount != 3 || background.AcquireCount != 3
        || image.ReleasedCount != 2 || background.ReleasedCount != 2 {
        throw InvalidOperationException("Versioned image providers did not enter the failed version")
      }
      if !image.FailCurrent() || !background.FailCurrent() {
        throw InvalidOperationException("Versioned image providers did not fail the terminal leases")
      }
      window.Pump(0.0)
      window.Pump(0.0)
      if image.AcquireCount != 3 || background.AcquireCount != 3
        || image.ReleasedCount != 2 || background.ReleasedCount != 2 {
        throw InvalidOperationException("Versioned image providers retried an unchanged failed version")
      }
      image.Advance()
      background.Advance()
      if image.ContentVersion != 4uL || background.ContentVersion != 4uL
        || image.AcquireCount != 4 || background.AcquireCount != 4
        || image.ReleasedCount != 3 || background.ReleasedCount != 3 {
        throw InvalidOperationException("Versioned image providers did not make one recovery transition")
      }
      if !image.CompleteCurrent(secondImage) || !background.CompleteCurrent(secondBackground) {
        throw InvalidOperationException("Versioned image providers rejected the recovery completion")
      }
      window.Pump(0.0)
      window.Pump(0.0)
    }
    let beforeMetrics = latestMetrics
    let beforeRoot = SmokeCell.Root.BorderBox
    let targetWidth int32 = 480
    let targetHeight int32 = 260
    window.Width = targetWidth
    window.Height = targetHeight
    var attempts int32
    var resized bool
    while attempts < 120 && !resized {
      window.Pump(0.016)
      resized = latestMetrics.LogicalWidth == targetWidth
        && latestMetrics.LogicalHeight == targetHeight
        && latestMetrics.FramebufferWidth > 0
        && latestMetrics.FramebufferHeight > 0
      attempts = attempts + 1
    }
    let scaleConsistent = latestMetrics.DisplayScaleX > 0.0
      && latestMetrics.DisplayScaleY > 0.0
      && Math.Abs(float64(latestMetrics.FramebufferWidth)
        - float64(latestMetrics.LogicalWidth) * latestMetrics.DisplayScaleX) < 0.01
      && Math.Abs(float64(latestMetrics.FramebufferHeight)
        - float64(latestMetrics.LogicalHeight) * latestMetrics.DisplayScaleY) < 0.01
    let finalRoot = SmokeCell.Root.BorderBox
    if !resized || !scaleConsistent || !latestRootMetrics.IsMounted
      || finalRoot.Width != float64(targetWidth) || finalRoot.Height != float64(targetHeight)
      || finalRoot.Width == beforeRoot.Width || finalRoot.Height == beforeRoot.Height
      || latestRootMetrics.BorderBox.Width != finalRoot.Width
      || latestRootMetrics.BorderBox.Height != finalRoot.Height
      || latestMetrics.FramebufferWidth == beforeMetrics.FramebufferWidth
        && latestMetrics.FramebufferHeight == beforeMetrics.FramebufferHeight {
      throw InvalidOperationException("Native smoke resize metrics or layout did not settle")
    }
    window.Pump(0.0)
    if !window.IsOpen {
      throw InvalidOperationException("Native smoke resize closed the window")
    }
    let beforeOffset = SmokeCell.Viewport.ScrollOffset.X
    let before = SmokeCell.ScrollLeaf.BorderBox
    if !SmokeCell.Viewport.ScrollTo(24.0, 0.0) {
      throw InvalidOperationException("Native smoke public scroll failed")
    }
    window.Pump(0.05)
    let afterOffset = SmokeCell.Viewport.ScrollOffset.X
    let after = SmokeCell.ScrollLeaf.BorderBox
    let offsetShift = afterOffset - beforeOffset
    let borderShift = before.X - after.X
    if afterOffset <= beforeOffset || after.Y != before.Y
      || after.Width != before.Width || after.Height != before.Height
      || Math.Abs(borderShift - offsetShift) > 0.01 {
      throw InvalidOperationException("Native smoke public scroll geometry was not single-shifted")
    }
    let minimizedStateEventStart = minimizedStateEvents
    window.State = WindowState.Minimized
    attempts = 0
    var minimized bool
    while attempts < 60 && !minimized {
      window.Pump(0.016)
      minimized = minimizedStateEvents > minimizedStateEventStart
      attempts = attempts + 1
    }
    if !window.IsOpen || !minimized || window.State != WindowState.Minimized {
      throw InvalidOperationException("Native smoke window did not report minimized state")
    }
    window.State = WindowState.Normal
    var restored bool
    attempts = 0
    while attempts < 60 && !restored {
      window.Pump(0.016)
      let scaleX = latestMetrics.DisplayScaleX
      let scaleY = latestMetrics.DisplayScaleY
      let scaleConsistent = scaleX > 0.0 && scaleY > 0.0
        && Math.Abs(float64(latestMetrics.FramebufferWidth)
          - float64(latestMetrics.LogicalWidth) * scaleX) < 0.01
        && Math.Abs(float64(latestMetrics.FramebufferHeight)
          - float64(latestMetrics.LogicalHeight) * scaleY) < 0.01
      restored = window.State == WindowState.Normal
        && latestMetrics.FramebufferWidth > 0
        && latestMetrics.FramebufferHeight > 0
        && scaleConsistent
      attempts = attempts + 1
    }
    let restoredRoot = SmokeCell.Root.BorderBox
    if !window.IsOpen || !restored || window.State != WindowState.Normal
      || restoredRoot.Width != float64(latestMetrics.LogicalWidth)
      || restoredRoot.Height != float64(latestMetrics.LogicalHeight)
      || latestRootMetrics.BorderBox.Width != restoredRoot.Width
      || latestRootMetrics.BorderBox.Height != restoredRoot.Height {
      throw InvalidOperationException("Native smoke window did not restore metrics or layout")
    }
    smokeRoot.TextValue.Value = "Goo Vulkan text 2"
    window.Pump(0.0)
    window.Background = Color.Rgb(16, 24, 36)
    window.Pump(0.0)
    window.Background = Color.Rgb(20, 28, 40)
    window.Pump(0.0)
    window.RequestClose()
    window.Pump(0.0)
    if window.IsOpen {
      throw InvalidOperationException("Native smoke window did not close")
    }
    if nativeSmoke {
      let image = imageProvider!!
      let background = backgroundProvider!!
      if image.ReleasedCount != image.AcquireCount
        || background.ReleasedCount != background.AcquireCount {
        throw InvalidOperationException("Versioned image leases did not release on close")
      }
    }
  }
  imageV1?.Dispose()
  imageV2?.Dispose()
  backgroundV1?.Dispose()
  backgroundV2?.Dispose()
}
