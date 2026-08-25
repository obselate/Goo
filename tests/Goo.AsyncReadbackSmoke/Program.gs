package GooAsyncReadbackSmoke

import System
import System.Diagnostics
import System.IO
import System.Collections.Generic
import System.Threading
import Goo
import GooS09RFixture
import GooS14Fixture

class S14ReadbackSmokeCell : Cell {
  shared {
    let Root ElementHandle = ElementHandle{}
  }

  override func Build() Blob -> Container {
    Width: Length.Percent(100),
    Height: Length.Percent(100),
    Handle: S14ReadbackSmokeCell.Root,
    Position: PositionType.Relative,
    BackgroundColor: Color.Rgb(12, 20, 32),
    Children: {
      Container{
        Position: PositionType.Absolute,
        Left: 8,
        Top: 8,
        Width: 48,
        Height: 40,
        Opacity: 0.5,
        Children: {
          Container{
            Width: Length.Percent(100),
            Height: Length.Percent(100),
            BackgroundColor: Color.Rgb(220, 40, 64),
          },
          Container{
            Width: Length.Percent(100),
            Height: Length.Percent(100),
            BackgroundColor: Color.Rgb(40, 80, 220),
          },
        },
      },
    },
  }
}

class S15RetentionCell : Cell {
  private var ColorChanged State[bool]
  private var BoundsChanged State[bool]
  private var ExtraVisible State[bool]
  private var UnsupportedFeature State[bool]
  private var ParentColorChanged State[bool]
  private var ParentUnsupportedFeature State[bool]
  private var BorderColorChanged State[bool]
  private var BorderUnsupportedFeature State[bool]

  shared {
    let Root ElementHandle = ElementHandle{}
    let StableTop ElementHandle = ElementHandle{}
    let MutatedBox ElementHandle = ElementHandle{}
    let StableBottom ElementHandle = ElementHandle{}
    let RoundedBox ElementHandle = ElementHandle{}
    let BorderLeaf ElementHandle = ElementHandle{}
  }

  init() {
    ColorChanged = Track(false)
    BoundsChanged = Track(false)
    ExtraVisible = Track(false)
    UnsupportedFeature = Track(false)
    ParentColorChanged = Track(false)
    ParentUnsupportedFeature = Track(false)
    BorderColorChanged = Track(false)
    BorderUnsupportedFeature = Track(false)
  }

  func MutateBox() {
    ColorChanged.Value = true
  }

  func MutateBounds() {
    BoundsChanged.Value = true
  }

  func MutateParentBox() {
    ParentColorChanged.Value = true
  }

  func ToggleExtra() {
    ExtraVisible.Value = !ExtraVisible.Value
  }

  func ToggleUnsupportedFeature() {
    UnsupportedFeature.Value = !UnsupportedFeature.Value
  }

  func ToggleParentUnsupportedFeature() {
    ParentUnsupportedFeature.Value = !ParentUnsupportedFeature.Value
  }

  func MutateBorder() {
    BorderColorChanged.Value = true
  }

  func ToggleBorderUnsupportedFeature() {
    BorderUnsupportedFeature.Value = !BorderUnsupportedFeature.Value
  }

  override func Build() Blob {
    let children = List[Blob](6)
    children.Add(Container{
      Key: "s15-stable-top",
      Position: PositionType.Absolute,
      Left: 8,
      Top: 8,
      Width: 64,
      Height: 32,
      Handle: S15RetentionCell.StableTop,
      BackgroundColor: Color.Rgb(42, 112, 188),
    })
    children.Add(Container{
      Key: "s15-mutated-box",
      Position: PositionType.Absolute,
      Left: if BoundsChanged.Value { 104 } else { 88 },
      Top: 8,
      Width: 64,
      Height: 32,
      Handle: S15RetentionCell.MutatedBox,
      BackgroundColor: if ColorChanged.Value {
        Color.Rgb(40, 220, 96)
      } else {
        Color.Rgb(220, 40, 64)
      },
    })
    children.Add(Container{
      Key: "s15-stable-bottom",
      Position: PositionType.Absolute,
      Left: 8,
      Top: 56,
      Width: 64,
      Height: 32,
      Handle: S15RetentionCell.StableBottom,
      BackgroundColor: Color.Rgb(196, 224, 88),
    })
    children.Add(Container{
      Key: "s15-rounded-box",
      Position: PositionType.Absolute,
      Left: 88,
      Top: 56,
      Width: 64,
      Height: 32,
      Handle: S15RetentionCell.RoundedBox,
      BorderTopLeftRadius: 4,
      BorderTopRightRadius: 8,
      BorderBottomRightRadius: 12,
      BorderBottomLeftRadius: 16,
      OverflowX: if UnsupportedFeature.Value { Overflow.Hidden } else { Overflow.Visible },
      BackgroundColor: Color.Rgb(72, 180, 212),
    })
    children.Add(Container{
      Key: "s15-border-leaf",
      Position: PositionType.Absolute,
      Left: 168,
      Top: 8,
      Width: 64,
      Height: 32,
      Handle: S15RetentionCell.BorderLeaf,
      BorderStyle: BorderStyle.Solid,
      BorderTopWidth: 2,
      BorderRightWidth: 3,
      BorderBottomWidth: 4,
      BorderLeftWidth: 5,
      BorderRadius: if BorderUnsupportedFeature.Value { 6 } else { 0 },
      BorderTopColor: if BorderColorChanged.Value {
        Color.Rgb(248, 196, 48)
      } else {
        Color.Rgb(232, 96, 72)
      },
      BorderRightColor: Color.Rgb(96, 224, 128),
      BorderBottomColor: Color.Rgb(72, 144, 232),
      BorderLeftColor: Color.Rgb(224, 184, 72),
    })
    if ExtraVisible.Value {
      children.Add(Container{
        Key: "s15-extra-box",
        Position: PositionType.Absolute,
        Left: 168,
        Top: 56,
        Width: 64,
        Height: 32,
        BackgroundColor: Color.Rgb(128, 72, 220),
      })
    }
    return Container{
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      Handle: S15RetentionCell.Root,
      Position: PositionType.Relative,
      BackgroundColor: if ParentColorChanged.Value {
        Color.Rgb(18, 30, 48)
      } else {
        Color.Rgb(12, 20, 32)
      },
      OverflowX: if ParentUnsupportedFeature.Value {
        Overflow.Hidden
      } else {
        Overflow.Visible
      },
      Children: children,
    }
  }
}

class S17AccessibilityAdapter : AccessibilityAdapter {
  internal var Tree AccessibilityTree?
  internal var Updates int32

  public func Update(tree AccessibilityTree) {
    Tree = tree
    Updates++
  }
}

class S17ProtectedTextCell : Cell {
  shared {
    let Entry ElementHandle = ElementHandle{}
    let Control ElementHandle = ElementHandle{}
  }

  internal var LastValue string
  internal var CompositionText string
  internal var CompositionCount int32

  init() {
    LastValue = ""
    CompositionText = ""
  }

  override func Build() Blob -> Container {
    Width: 320,
    Height: 96,
    Position: PositionType.Relative,
    BackgroundColor: Color.Rgb(12, 20, 32),
    Children: {
      TextEntry{
        Handle: S17ProtectedTextCell.Entry,
        Position: PositionType.Absolute,
        Left: 0,
        Top: 0,
        Width: 320,
        Height: 44,
        Padding: 6,
        FontFamily: "S17GateFont",
        FontSize: 20,
        Color: Color.Rgb(240, 244, 248),
        Value: "a\u0301👨‍👩‍👧‍👦b",
        Password: true,
        Accessibility: Accessibility{ Value: "metadata-secret" },
        OnChange: func(value string) { LastValue = value },
        OnTextComposition: func(value TextCompositionEvent) {
          CompositionText = value.Text
          CompositionCount++
        },
      },
      TextEntry{
        Handle: S17ProtectedTextCell.Control,
        Position: PositionType.Absolute,
        Left: 0,
        Top: 48,
        Width: 320,
        Height: 44,
        Padding: 6,
        FontFamily: "S17GateFont",
        FontSize: 20,
        Color: Color.Rgb(240, 244, 248),
        Value: "•••",
        Accessibility: Accessibility{ Hidden: true },
      },
    },
  }
}

class S17CoreBehaviorCell : Cell {
  private var disabled State[bool]
  private var motion Anim[float64]

  shared {
    let Target ElementHandle = ElementHandle{}
    let ScrollViewport ElementHandle = ElementHandle{}
    let ScrollLeaf ElementHandle = ElementHandle{}
    let MotionBox ElementHandle = ElementHandle{}
  }

  internal var PointerEnterCount int32
  internal var PointerLeaveCount int32
  internal var PointerDownCount int32
  internal var PointerUpCount int32
  internal var ClickCount int32
  internal var FocusCount int32
  internal var BlurCount int32
  internal var KeyDownCount int32
  internal var KeyUpCount int32
  internal var TargetWheelCount int32
  internal var ScrollWheelCount int32

  init() {
    disabled = Track(false)
    motion = Animate(0.0)
  }

  internal func DisableTarget() {
    disabled.Value = true
  }

  internal func StartMotion() {
    motion.To(64.0)
  }

  internal prop MotionRunning bool{ get { return motion.Running } }

  override func Build() Blob -> Container {
    Width: 320,
    Height: 176,
    Position: PositionType.Relative,
    BackgroundColor: Color.Rgb(12, 20, 32),
    Children: {
      Button{
        Handle: S17CoreBehaviorCell.Target,
        Position: PositionType.Absolute,
        Left: 8,
        Top: 8,
        Width: 96,
        Height: 64,
        Focusable: true,
        Disabled: disabled.Value,
        BackgroundColor: Color.Rgb(208, 48, 64),
        BorderWidth: 4,
        BorderColor: Color.Rgb(24, 32, 48),
        Hover: Style{ BackgroundColor: Color.Rgb(48, 208, 96) },
        Active: Style{ BackgroundColor: Color.Rgb(64, 96, 232) },
        Focus: Style{ BorderColor: Color.Rgb(248, 196, 48) },
        DisabledStyle: Style{
          BackgroundColor: Color.Rgb(112, 120, 132),
          BorderColor: Color.Rgb(80, 88, 100),
        },
        TransitionMs: 100,
        TransitionProperties: []TransitionProperty{ TransitionProperty.BackgroundColor },
        Accessibility: Accessibility{
          Role: AccessibilityRole.Button,
          Name: "S17 action",
        },
        OnPointerEnter: func(value PointerEvent) { PointerEnterCount++ },
        OnPointerLeave: func(value PointerEvent) { PointerLeaveCount++ },
        OnPointerDown: func(value PointerEvent) { PointerDownCount++ },
        OnPointerUp: func(value PointerEvent) { PointerUpCount++ },
        OnClick: func() { ClickCount++ },
        OnFocus: func(value FocusEvent) { FocusCount++ },
        OnBlur: func(value FocusEvent) { BlurCount++ },
        OnKeyDown: func(value KeyEvent) { KeyDownCount++ },
        OnKeyUp: func(value KeyEvent) { KeyUpCount++ },
        OnWheel: func(value WheelEvent) { TargetWheelCount++ },
      },
      Container{
        Handle: S17CoreBehaviorCell.MotionBox,
        Position: PositionType.Absolute,
        Left: 144.0 + motion.Value,
        Top: 8,
        Width: 32,
        Height: 32,
        BackgroundColor: Color.Rgb(72, 144, 232),
      },
      Container{
        Handle: S17CoreBehaviorCell.ScrollViewport,
        Position: PositionType.Absolute,
        Left: 8,
        Top: 88,
        Width: 120,
        Height: 72,
        OverflowY: Overflow.Scroll,
        BackgroundColor: Color.Rgb(24, 32, 48),
        Children: {
          Container{
            Handle: S17CoreBehaviorCell.ScrollLeaf,
            Width: 120,
            Height: 176,
            BackgroundColor: Color.Rgb(96, 176, 216),
            OnWheel: func(value WheelEvent) { ScrollWheelCount++ },
          },
        },
      },
    },
  }
}

func S14Require(condition bool, message string) {
  if !condition {
    throw InvalidOperationException(message)
  }
}

func S14Field(line string, name string) uint64? {
  let marker = "\"" + name + "\":"
  let fieldIndex = line.IndexOf(marker)
  if fieldIndex < 0 {
    return nil
  }
  let valueStart = fieldIndex + marker.Length
  let remaining = line.Substring(valueStart)
  let commaIndex = remaining.IndexOf(",")
  let valueText = if commaIndex < 0 {
    remaining.TrimEnd('}')
  } else {
    remaining.Substring(0, commaIndex)
  }
  try {
    return UInt64.Parse(valueText)
  } catch (error Exception) {
    return nil
  }
}

func S14Counter(diagnostics string, name string) uint64 {
  let marker = "\"kind\":\"counters\""
  let countersIndex = diagnostics.LastIndexOf(marker)
  if countersIndex < 0 {
    return 0uL
  }
  let lineEnd = diagnostics.IndexOf("\n", countersIndex)
  let line = if lineEnd < 0 {
    diagnostics.Substring(countersIndex)
  } else {
    diagnostics.Substring(countersIndex, lineEnd - countersIndex)
  }
  let value = S14Field(line, name)
  return if let result = value { result } else { 0uL }
}

func S14DiagnosticExcerpt(diagnostics string, kind string) string {
  let marker = "{\"kind\":\"" + kind + "\""
  let start = diagnostics.LastIndexOf(marker)
  if start < 0 {
    return "missing"
  }
  let lineEnd = diagnostics.IndexOf("\n", start)
  let line = if lineEnd < 0 {
    diagnostics.Substring(start)
  } else {
    diagnostics.Substring(start, lineEnd - start)
  }
  if line.Length > 512 {
    return line.Substring(0, 512)
  }
  return line
}

func S14EnvCount(name string, fallback int32, maximum int32) int32 {
  let text = Environment.GetEnvironmentVariable(name)
  if text == nil || text == "" {
    return fallback
  }
  var value int32
  try {
    value = int32(UInt64.Parse(text!!))
  } catch (error Exception) {
    throw InvalidOperationException(name + " must be an integer")
  }
  if value < 0 || value > maximum {
    throw InvalidOperationException(name + " is outside the supported range")
  }
  return value
}

func S14TicksToNs(ticks int64) int64 -> int64(float64(ticks) * 1000000000.0 / float64(Stopwatch.Frequency))

func S14Percentile(values []int64, percentile float64) int64 {
  let sorted = [values.Length]int64
  Array.Copy(values, sorted, values.Length)
  Array.Sort(sorted)
  let rawIndex = int32(Math.Ceiling(float64(sorted.Length) * percentile)) - 1
  let index = if rawIndex < 0 { 0 } else if rawIndex >= sorted.Length { sorted.Length - 1 } else { rawIndex }
  return sorted[index]
}

func S14Max(values []int64) int64 {
  var maximum int64 = 0L
  var index int32 = 0
  while index < values.Length {
    if values[index] > maximum {
      maximum = values[index]
    }
    index = index + 1
  }
  return maximum
}

func S14OpenCell(root S14ReadbackSmokeCell) Window {
  let opened = Window{
    Title: "Goo S14 async readback",
    Width: 64,
    Height: 64,
    VSync: false,
    Root: root,
  }
  opened.Open()
  return opened
}

func S14ReadbackArm() string {
  let arm = Environment.GetEnvironmentVariable("GOO_S14_READBACK_ARM")
  if arm == "active" {
    return "active"
  }
  if arm == "disabled" || arm == nil || arm == "" {
    return "disabled"
  }
  throw InvalidOperationException("GOO_S14_READBACK_ARM must be active or disabled")
}

func S14AwaitReadbackReady(window Window, timeoutMs int32) {
  let timeoutTicks = int64(float64(Stopwatch.Frequency) * float64(timeoutMs) / 1000.0)
  let start = Stopwatch.GetTimestamp()
  while Stopwatch.GetTimestamp() - start < timeoutTicks {
    let status = WindowReadbackTestFixture.Poll(window)
    if status == VkConstants.VK_SUCCESS {
      return
    }
    S14Require(status == VkConstants.VK_NOT_READY,
      "S14 readback completion failed: " + status.ToString())
    Thread.Yield()
  }
  throw InvalidOperationException("S14 readback did not become ready within the timeout")
}

func S14RequestReadbackUntilAccepted(window Window, width uint32, height uint32) {
  let timeoutTicks = int64(float64(Stopwatch.Frequency) * 1.0)
  let start = Stopwatch.GetTimestamp()
  var status = WindowReadbackTestFixture.Request(window, width, height)
  while status == VulkanReadbackRequestStatus.Busy
    || status == VulkanReadbackRequestStatus.NotReady{
      if Stopwatch.GetTimestamp() - start >= timeoutTicks {
        throw InvalidOperationException(
          "S14 readback request did not become accepted within the timeout")
      }
      WindowReadbackTestFixture.Pump(window, 0.0)
      Thread.Yield()
      status = WindowReadbackTestFixture.Request(window, width, height)
    }
  S14Require(status == VulkanReadbackRequestStatus.Accepted,
    "S14 readback request was not accepted: " + status.ToString())
}

func S14TakeReadback(window Window) VulkanReadbackResult {
  let result = WindowReadbackTestFixture.Take(window)
  if let ready = result {
    return ready
  }
  throw InvalidOperationException("S14 readback result was unavailable after completion")
}

func S14BeginReadback(window Window) int64 {
  let requestStart = Stopwatch.GetTimestamp()
  S14RequestReadbackUntilAccepted(window, 64u, 64u)
  return requestStart
}

func S14FinishReadback(window Window, requestStart int64) int64 {
  S14AwaitReadbackReady(window, 1000)
  let readyTicks = Stopwatch.GetTimestamp()
  let latency = readyTicks - requestStart
  S14TakeReadback(window)
  return latency
}

func S14Pixel(pixels []uint8, x int32, y int32, channel int32) uint8 {
  let index = (y * 64 + x) * 4 + channel
  return pixels[index]
}

func S14ValidateReadbackResult(result VulkanReadbackResult) {
  S14Require(result.Width == 64u && result.Height == 64u,
    "S14 readback result extent is not 64x64")
  S14Require(result.RowBytes == 256u,
    "S14 readback result row bytes are not 256")
  S14Require(int32(result.Format) == 43,
    "S14 readback result format is not VK_FORMAT_R8G8B8A8_SRGB")
  S14Require(result.Generation > 0uL && result.SubmissionSerial > 0uL,
    "S14 readback result identity is invalid")
  S14Require(result.Premultiplied && !result.OriginBottomLeft && result.SrgbEncoded,
    "S14 readback result metadata is invalid")
  let pixels = result.Pixels
  S14Require(pixels.Length == 16384,
    "S14 readback result byte count is not 64x64 RGBA8")
  let topLeft = S14Pixel(pixels, 0, 0, 0).ToString()
  +"/" + S14Pixel(pixels, 0, 0, 1).ToString()
  +"/" + S14Pixel(pixels, 0, 0, 2).ToString()
  +"/" + S14Pixel(pixels, 0, 0, 3).ToString()
  S14Require((S14Pixel(pixels, 0, 0, 0) == uint8(12)
      || S14Pixel(pixels, 0, 0, 0) == uint8(13))
      && S14Pixel(pixels, 0, 0, 1) == uint8(20)
      && S14Pixel(pixels, 0, 0, 2) == uint8(32)
      && S14Pixel(pixels, 0, 0, 3) == uint8(255),
    "S14 readback top-left pixel is incorrect: " + topLeft)
  let center = S14Pixel(pixels, 32, 32, 0).ToString()
  +"/" + S14Pixel(pixels, 32, 32, 1).ToString()
  +"/" + S14Pixel(pixels, 32, 32, 2).ToString()
  +"/" + S14Pixel(pixels, 32, 32, 3).ToString()
  S14Require(Math.Abs(int32(S14Pixel(pixels, 32, 32, 0)) - 161) <= 1
      && Math.Abs(int32(S14Pixel(pixels, 32, 32, 1)) - 32) <= 1
      && Math.Abs(int32(S14Pixel(pixels, 32, 32, 2)) - 51) <= 1
      && S14Pixel(pixels, 32, 32, 3) == uint8(255),
    "S14 readback center pixel is incorrect: " + center)
}

func S14ValidateCommonDiagnostics(diagnostics string) {
  S14ValidateCommonDiagnostics(diagnostics, 0uL)
}

func S14ValidateCommonDiagnostics(diagnostics string, expectedResultFailureCount uint64) {
  S14Require(!diagnostics.Contains("\"kind\":\"fatal\""),
    "S14 render emitted a fatal diagnostic: "
    +S14DiagnosticExcerpt(diagnostics, "fatal")
    +" validation=" + S14DiagnosticExcerpt(diagnostics, "validation")
    +" validationError=" + S14DiagnosticExcerpt(diagnostics, "\"severity\":4096"))
  S14Require(S14Counter(diagnostics, "validationErrorCount") == 0uL,
    "S14 render validation error counter is nonzero: "
    +S14DiagnosticExcerpt(diagnostics, "validation"))
  let resultFailureCount = S14Counter(diagnostics, "resultFailureCount")
  S14Require(resultFailureCount == expectedResultFailureCount,
    "S14 render result failure count is " + resultFailureCount.ToString()
    +", expected " + expectedResultFailureCount.ToString())
  S14Require(S14Counter(diagnostics, "vulkanObjectCount") == 0uL,
    "S14 render leaked Vulkan objects")
}

func RunS14ReadbackSmoke() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let root = S14ReadbackSmokeCell{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  Console.SetError(capturedError)
  var window Window? = nil
  var requestReadyNs int64 = 0L
  var residentBeforeClose uint64 = 0uL
  try {
    let opened = S14OpenCell(root)
    window = opened
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    var frame int32 = 0
    while frame < 8 {
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      frame = frame + 1
    }
    S14Require(S14ReadbackSmokeCell.Root.IsMounted
        && S14ReadbackSmokeCell.Root.BorderBox.Width == 64.0
        && S14ReadbackSmokeCell.Root.BorderBox.Height == 64.0,
      "S14 render smoke did not retain 64x64 geometry")
    let requestStart = S14BeginReadback(opened)
    S14AwaitReadbackReady(opened, 1000)
    let readyTicks = Stopwatch.GetTimestamp()
    let result = S14TakeReadback(opened)
    S14ValidateReadbackResult(result)
    requestReadyNs = S14TicksToNs(readyTicks - requestStart)
    S14Require(requestReadyNs > 0L, "S14 readback request-to-ready latency is not positive")
    S14Require(WindowReadbackTestFixture.RequestCount(opened) == 1uL
        && WindowReadbackTestFixture.CompletionCount(opened) == 1uL,
      "S14 readback request and completion counts are incorrect")
    residentBeforeClose = WindowReadbackTestFixture.ResidentResourceBytes(opened)
    S14Require(residentBeforeClose >= 16384uL,
      "S14 readback staging resources are not resident after completion")
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "S14 render smoke window did not close")
  } finally {
    Console.SetError(originalError)
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  Console.WriteLine("s14-readback: frames=9 width=64 height=64 row_bytes=256"
    +" bytes=16384 origin=top-left premultiplied=1 request_ready_ns="
    +requestReadyNs.ToString() + " resource_resident_before_close="
    +residentBeforeClose.ToString() + " resource_resident_after_close=0 cleanup=1 close=1")
}

func RunD02OffscreenFailureGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let root = S14ReadbackSmokeCell{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  Console.SetError(capturedError)
  var window Window? = nil
  var accepted = false
  var deviceLoss = false
  var storageCleared = false
  var close = false
  try {
    let opened = S14OpenCell(root)
    window = opened
    let staged = WindowReadbackTestFixture.Request(opened, 64u, 64u)
    S14Require(staged == VulkanReadbackRequestStatus.NotReady,
      "D02 offscreen failure request did not stage the window prerequisite")
    WindowReadbackTestFixture.DrainWindowQueue(opened, 2000)
    VulkanSharedRuntime.FailNextGraphicsSubmissionForTest()
    let retry = WindowReadbackTestFixture.Request(opened, 64u, 64u)
    accepted = retry == VulkanReadbackRequestStatus.Accepted
    S14Require(accepted,
      "D02 offscreen failure retry was not accepted: " + retry.ToString())
    let timeoutTicks = int64(float64(Stopwatch.Frequency) * 2.0)
    let start = Stopwatch.GetTimestamp()
    var result = WindowReadbackTestFixture.Poll(opened)
    while result == VkConstants.VK_NOT_READY {
      if Stopwatch.GetTimestamp() - start >= timeoutTicks {
        throw InvalidOperationException("D02 offscreen failure did not complete within the timeout")
      }
      WindowReadbackTestFixture.Pump(opened, 0.0)
      Thread.Yield()
      result = WindowReadbackTestFixture.Poll(opened)
    }
    deviceLoss = result == VkConstants.VK_ERROR_DEVICE_LOST
    S14Require(deviceLoss,
      "D02 offscreen failure did not report VK_ERROR_DEVICE_LOST: " + result.ToString())
    storageCleared = WindowReadbackTestFixture.ResidentResourceBytes(opened) == 0uL
    S14Require(storageCleared,
      "D02 offscreen failure left readback storage resident")
    let followup = WindowReadbackTestFixture.Request(opened, 64u, 64u)
    S14Require(followup != VulkanReadbackRequestStatus.Busy,
      "D02 offscreen failure left a readback request Busy")
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(opened.IsOpen,
      "D02 offscreen failure window did not recover before close")
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    close = !opened.IsOpen
    S14Require(close, "D02 offscreen failure window did not close")
  } finally {
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
    Console.SetError(originalError)
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics, 1uL)
  Console.WriteLine("d02-offscreen-failure-gate: accepted=" + (if accepted { "1" } else { "0" })
    +" device_loss=" + (if deviceLoss { "1" } else { "0" })
    +" storage_cleared=" + (if storageCleared { "1" } else { "0" })
    +" close=" + (if close { "1" } else { "0" }))
}

func S14RunCalibration(values []int64) {
  var index int32 = 0
  var sink int64 = 0L
  while index < values.Length {
    let beforeBytes = GC.GetAllocatedBytesForCurrentThread()
    let start = Stopwatch.GetTimestamp()
    sink = sink + beforeBytes
    let end = Stopwatch.GetTimestamp()
    let afterBytes = GC.GetAllocatedBytesForCurrentThread()
    sink = sink + afterBytes
    values[index] = end - start
    index = index + 1
  }
  if sink == 0L {
    throw InvalidOperationException("S14 timing calibration did not execute")
  }
}

func RunS14ReadbackMeasure() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let arm = S14ReadbackArm()
  let warmup = S14EnvCount("GOO_S14_READBACK_WARMUP", 8, 64)
  let samplesCount = S14EnvCount("GOO_S14_READBACK_SAMPLES", 64, 512)
  S14Require(samplesCount > 0, "GOO_S14_READBACK_SAMPLES must be positive")
  let frameTicks = [samplesCount]int64
  let frameAllocations = [samplesCount]int64
  let timerOverhead = [samplesCount]int64
  let requestReadyTicks = [samplesCount]int64
  let requestCpuTicks = [samplesCount]int64
  let normalRecordTicks = [samplesCount]int64
  let completionObservedTicks = [samplesCount]int64
  let cpuCopyTicks = [samplesCount]int64
  let objectCreateDeltas = [samplesCount]uint64
  let objectDestroyDeltas = [samplesCount]uint64
  let requestAllocations = [samplesCount]int64
  let completionAllocations = [samplesCount]int64
  let totalAllocations = [samplesCount]int64
  let gpuSceneReplayValues = [samplesCount]int64
  let gpuCopyValues = [samplesCount]int64
  let root = S14ReadbackSmokeCell{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  Console.SetError(capturedError)
  var window Window? = nil
  var warmAllocated int64 = 0L
  var requestCountBeforeSamples uint64 = 0uL
  var completionCountBeforeSamples uint64 = 0uL
  var requestCountAfterSamples uint64 = 0uL
  var completionCountAfterSamples uint64 = 0uL
  var takeCountAfterSamples uint64 = 0uL
  var residentPeak uint64 = 0uL
  var residentBeforeClose uint64 = 0uL
  var requestedBytes uint64 = 0uL
  var warmupObjectCreateDelta uint64 = 0uL
  var gpuTimingSampleCount int32 = 0
  try {
    let opened = S14OpenCell(root)
    window = opened
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    let warmStartBytes = GC.GetAllocatedBytesForCurrentThread()
    var warmIndex int32 = 0
    while warmIndex < warmup {
      if arm == "active" {
        let requestStart = S14BeginReadback(opened)
        S14FinishReadback(opened, requestStart)
        let timing = WindowReadbackTestFixture.Timing(opened)
        warmupObjectCreateDelta = warmupObjectCreateDelta + timing.ObjectCreateDelta
      } else {
        WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      }
      warmIndex = warmIndex + 1
    }
    warmAllocated = GC.GetAllocatedBytesForCurrentThread() - warmStartBytes
    requestCountBeforeSamples = WindowReadbackTestFixture.RequestCount(opened)
    completionCountBeforeSamples = WindowReadbackTestFixture.CompletionCount(opened)
    residentPeak = WindowReadbackTestFixture.ResidentResourceBytes(opened)
    var sampleIndex int32 = 0
    while sampleIndex < samplesCount {
      let beforeBytes = GC.GetAllocatedBytesForCurrentThread()
      let start = Stopwatch.GetTimestamp()
      var requestStart int64 = 0L
      if arm == "active" {
        requestStart = S14BeginReadback(opened)
      } else {
        WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      }
      let end = Stopwatch.GetTimestamp()
      let afterRequestBytes = GC.GetAllocatedBytesForCurrentThread()
      frameTicks[sampleIndex] = end - start
      requestAllocations[sampleIndex] = afterRequestBytes - beforeBytes
      frameAllocations[sampleIndex] = requestAllocations[sampleIndex]
      if arm == "active" {
        let beforeCompletionBytes = GC.GetAllocatedBytesForCurrentThread()
        S14AwaitReadbackReady(opened, 1000)
        let readyTicks = Stopwatch.GetTimestamp()
        S14TakeReadback(opened)
        let afterTakeBytes = GC.GetAllocatedBytesForCurrentThread()
        completionAllocations[sampleIndex] = afterTakeBytes - beforeCompletionBytes
        totalAllocations[sampleIndex] = afterTakeBytes - beforeBytes
        takeCountAfterSamples = takeCountAfterSamples + 1uL
        let timing = WindowReadbackTestFixture.Timing(opened)
        S14Require(timing.ReadyTicks >= timing.RequestStartTicks
            && timing.RecordTicks >= timing.RequestStartTicks
            && timing.SubmitTicks >= timing.RecordTicks
            && timing.CpuCopyStartTicks >= timing.SubmitTicks
            && timing.CpuCopyEndTicks >= timing.CpuCopyStartTicks
            && timing.ReadyTicks >= timing.CpuCopyEndTicks,
          "S14 active measurement timing snapshot is invalid")
        normalRecordTicks[sampleIndex] = timing.RecordTicks - timing.RequestStartTicks
        requestCpuTicks[sampleIndex] = timing.SubmitTicks - timing.RequestStartTicks
        completionObservedTicks[sampleIndex] = timing.CpuCopyStartTicks - timing.RequestStartTicks
        requestReadyTicks[sampleIndex] = timing.ReadyTicks - timing.RequestStartTicks
        S14Require(readyTicks >= timing.ReadyTicks,
          "S14 active measurement ready timestamp is invalid")
        cpuCopyTicks[sampleIndex] = timing.CpuCopyEndTicks - timing.CpuCopyStartTicks
        objectCreateDeltas[sampleIndex] = timing.ObjectCreateDelta
        objectDestroyDeltas[sampleIndex] = timing.ObjectDestroyDelta
        requestedBytes = uint64(timing.RequestedByteSize)
        if timing.GpuTimingAvailable {
          gpuSceneReplayValues[gpuTimingSampleCount] =
          int64(timing.GpuSceneReplayNanoseconds)
          gpuCopyValues[gpuTimingSampleCount] = int64(timing.GpuCopyNanoseconds)
          gpuTimingSampleCount = gpuTimingSampleCount + 1
        }
      }
      let resident = WindowReadbackTestFixture.ResidentResourceBytes(opened)
      if resident > residentPeak {
        residentPeak = resident
      }
      sampleIndex = sampleIndex + 1
    }
    requestCountAfterSamples = WindowReadbackTestFixture.RequestCount(opened)
    completionCountAfterSamples = WindowReadbackTestFixture.CompletionCount(opened)
    residentBeforeClose = WindowReadbackTestFixture.ResidentResourceBytes(opened)
    S14RunCalibration(timerOverhead)
    S14Require(S14ReadbackSmokeCell.Root.IsMounted,
      "S14 readback measurement lost the root mount")
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "S14 readback measurement window did not close")
  } finally {
    Console.SetError(originalError)
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  let frameNs = [samplesCount]int64
  let allocationValues = [samplesCount]int64
  let requestAllocationValues = [samplesCount]int64
  let completionAllocationValues = [samplesCount]int64
  let totalAllocationValues = [samplesCount]int64
  let overheadNs = [samplesCount]int64
  let requestCpuNs = [samplesCount]int64
  let normalRecordNs = [samplesCount]int64
  let completionObservedNs = [samplesCount]int64
  let requestReadyNs = [samplesCount]int64
  let cpuCopyNs = [samplesCount]int64
  var objectCreateDeltaTotal uint64 = warmupObjectCreateDelta
  var objectDestroyDeltaTotal uint64 = 0uL
  var index int32 = 0
  while index < samplesCount {
    frameNs[index] = S14TicksToNs(frameTicks[index])
    allocationValues[index] = frameAllocations[index]
    requestAllocationValues[index] = requestAllocations[index]
    completionAllocationValues[index] = completionAllocations[index]
    totalAllocationValues[index] = totalAllocations[index]
    overheadNs[index] = S14TicksToNs(timerOverhead[index])
    normalRecordNs[index] = S14TicksToNs(normalRecordTicks[index])
    requestCpuNs[index] = S14TicksToNs(requestCpuTicks[index])
    completionObservedNs[index] = S14TicksToNs(completionObservedTicks[index])
    requestReadyNs[index] = S14TicksToNs(requestReadyTicks[index])
    cpuCopyNs[index] = S14TicksToNs(cpuCopyTicks[index])
    objectCreateDeltaTotal = objectCreateDeltaTotal + objectCreateDeltas[index]
    objectDestroyDeltaTotal = objectDestroyDeltaTotal + objectDestroyDeltas[index]
    index = index + 1
  }
  var gpuTimingAvailable bool = false
  var gpuSceneReplayP95 int64 = 0L
  var gpuSceneReplayMax int64 = 0L
  var gpuCopyP95 int64 = 0L
  var gpuCopyMax int64 = 0L
  if gpuTimingSampleCount > 0 {
    let gpuSceneTimingValues = [gpuTimingSampleCount]int64
    let gpuCopyTimingValues = [gpuTimingSampleCount]int64
    var gpuIndex int32 = 0
    while gpuIndex < gpuTimingSampleCount {
      gpuSceneTimingValues[gpuIndex] = gpuSceneReplayValues[gpuIndex]
      gpuCopyTimingValues[gpuIndex] = gpuCopyValues[gpuIndex]
      gpuIndex = gpuIndex + 1
    }
    gpuTimingAvailable = true
    gpuSceneReplayP95 = S14Percentile(gpuSceneTimingValues, 0.95)
    gpuSceneReplayMax = S14Max(gpuSceneTimingValues)
    gpuCopyP95 = S14Percentile(gpuCopyTimingValues, 0.95)
    gpuCopyMax = S14Max(gpuCopyTimingValues)
  }
  let frameP50 = S14Percentile(frameNs, 0.50)
  let frameP95 = S14Percentile(frameNs, 0.95)
  let frameP99 = S14Percentile(frameNs, 0.99)
  let frameP999 = S14Percentile(frameNs, 0.999)
  let overheadP95 = S14Percentile(overheadNs, 0.95)
  let allocationP95 = S14Percentile(allocationValues, 0.95)
  let allocationMax = S14Max(allocationValues)
  var requestAllocationP95 int64 = 0L
  var completionAllocationP95 int64 = 0L
  var totalAllocationP95 int64 = 0L
  if arm == "active" {
    requestAllocationP95 = S14Percentile(requestAllocationValues, 0.95)
    completionAllocationP95 = S14Percentile(completionAllocationValues, 0.95)
    totalAllocationP95 = S14Percentile(totalAllocationValues, 0.95)
  }
  var requestReadyP95 int64 = 0L
  var requestReadyMax int64 = 0L
  var normalRecordP95 int64 = 0L
  var normalRecordMax int64 = 0L
  var requestCpuP95 int64 = 0L
  var requestCpuMax int64 = 0L
  var completionObservedP95 int64 = 0L
  var completionObservedMax int64 = 0L
  var cpuCopyP95 int64 = 0L
  var cpuCopyMax int64 = 0L
  if arm == "active" {
    normalRecordP95 = S14Percentile(normalRecordNs, 0.95)
    normalRecordMax = S14Max(normalRecordNs)
    requestReadyP95 = S14Percentile(requestReadyNs, 0.95)
    requestReadyMax = S14Max(requestReadyNs)
    requestCpuP95 = S14Percentile(requestCpuNs, 0.95)
    requestCpuMax = S14Max(requestCpuNs)
    completionObservedP95 = S14Percentile(completionObservedNs, 0.95)
    completionObservedMax = S14Max(completionObservedNs)
    cpuCopyP95 = S14Percentile(cpuCopyNs, 0.95)
    cpuCopyMax = S14Max(cpuCopyNs)
  }
  let requestDelta = requestCountAfterSamples - requestCountBeforeSamples
  let completionDelta = completionCountAfterSamples - completionCountBeforeSamples
  let takeDelta = takeCountAfterSamples
  if arm == "active" {
    S14Require(requestDelta == uint64(samplesCount),
      "S14 active measurement request count is incomplete")
    S14Require(completionDelta == uint64(samplesCount),
      "S14 active measurement completion count is incomplete")
    S14Require(takeDelta == uint64(samplesCount),
      "S14 active measurement result take count is incomplete")
    S14Require(requestedBytes == 16384uL,
      "S14 active measurement requested region byte size is incorrect")
    S14Require(residentBeforeClose > 0uL && residentPeak == residentBeforeClose,
      "S14 active measurement readback residency did not reuse one pool slot")
  } else {
    S14Require(requestDelta == 0uL && completionDelta == 0uL && takeDelta == 0uL,
      "S14 disabled measurement performed readback work")
    S14Require(residentPeak == 0uL && residentBeforeClose == 0uL,
      "S14 disabled measurement retained readback resources")
  }
  let requireZero = Environment.GetEnvironmentVariable("GOO_S14_REQUIRE_ZERO_ALLOC") == "1"
  if requireZero && arm == "disabled" {
    S14Require(allocationMax == 0L,
      "S14 disabled warm frame allocated managed memory")
  }
  Console.WriteLine("s14-readback-measure: arm=" + arm
    +" warmup=" + warmup.ToString()
    +" samples=" + samplesCount.ToString()
    +" frame_p50_ns=" + frameP50.ToString()
    +" frame_p95_ns=" + frameP95.ToString()
    +" frame_p99_ns=" + frameP99.ToString()
    +" frame_p999_ns=" + frameP999.ToString()
    +" frame_max_ns=" + S14Max(frameNs).ToString()
    +" harness_p95_ns=" + overheadP95.ToString()
    +" alloc_p95_B=" + allocationP95.ToString()
    +" alloc_max_B=" + allocationMax.ToString()
    +" request_alloc_p95_B=" + requestAllocationP95.ToString()
    +" completion_alloc_p95_B=" + completionAllocationP95.ToString()
    +" total_request_alloc_p95_B=" + totalAllocationP95.ToString()
    +" warm_alloc_B=" + warmAllocated.ToString()
    +" readback_request_delta=" + requestDelta.ToString()
    +" readback_completion_delta=" + completionDelta.ToString()
    +" readback_take_delta=" + takeDelta.ToString()
    +" normal_scene_record_cpu_p95_ns=" + normalRecordP95.ToString()
    +" normal_scene_record_cpu_max_ns=" + normalRecordMax.ToString()
    +" request_submit_cpu_p95_ns=" + requestCpuP95.ToString()
    +" request_submit_cpu_max_ns=" + requestCpuMax.ToString()
    +" completion_observed_before_copy_p95_ns=" + completionObservedP95.ToString()
    +" completion_observed_before_copy_max_ns=" + completionObservedMax.ToString()
    +" request_ready_after_copy_p95_ns=" + requestReadyP95.ToString()
    +" request_ready_after_copy_max_ns=" + requestReadyMax.ToString()
    +" cpu_copy_p95_ns=" + cpuCopyP95.ToString()
    +" cpu_copy_max_ns=" + cpuCopyMax.ToString()
    +" gpu_timing_available=" + (if gpuTimingAvailable { "1" } else { "0" })
    +" gpu_timing_samples=" + gpuTimingSampleCount.ToString()
    +" gpu_scene_replay_p95_ns=" + gpuSceneReplayP95.ToString()
    +" gpu_scene_replay_max_ns=" + gpuSceneReplayMax.ToString()
    +" gpu_copy_p95_ns=" + gpuCopyP95.ToString()
    +" gpu_copy_max_ns=" + gpuCopyMax.ToString()
    +" requested_bytes=" + (if arm == "active" { "16384" } else { "0" })
    +" requested_bytes_snapshot=" + requestedBytes.ToString()
    +" resource_create_delta=" + objectCreateDeltaTotal.ToString()
    +" resource_destroy_delta=" + objectDestroyDeltaTotal.ToString()
    +" resource_resident_peak_B=" + residentPeak.ToString()
    +" resource_resident_before_close_B=" + residentBeforeClose.ToString()
    +" resource_resident_after_close_B=0"
    +" render_path=" + (if arm == "active" { "readback_request" } else { "forced" }))
}

func S09RPixelIndex(width uint32, x int32, y int32) int32 -> int32((uint64(y) * uint64(width) + uint64(x)) * 4uL)

func S09RLogicalPixel(pixels []uint8, width uint32, metrics WindowMetrics,
  x float64, y float64) []uint8{
    let scaleX = if metrics.DisplayScaleX > 0.0 { metrics.DisplayScaleX } else { 1.0 }
    let scaleY = if metrics.DisplayScaleY > 0.0 { metrics.DisplayScaleY } else { 1.0 }
    let px = int32(Math.Floor(x * scaleX))
    let py = int32(Math.Floor(y * scaleY))
    let index = S09RPixelIndex(width, px, py)
    return []uint8{
      pixels[index],
      pixels[index + 1],
      pixels[index + 2],
      pixels[index + 3],
    }
  }

func S09RPixelText(pixel []uint8) string -> pixel[0].ToString() + "/" + pixel[1].ToString() + "/"
+pixel[2].ToString() + "/" + pixel[3].ToString()

func S09RNear(pixel []uint8, red uint8, green uint8, blue uint8,
  tolerance int32) bool -> Math.Abs(int32(pixel[0]) - int32(red)) <= tolerance
  && Math.Abs(int32(pixel[1]) - int32(green)) <= tolerance
  && Math.Abs(int32(pixel[2]) - int32(blue)) <= tolerance
  && pixel[3] >= uint8(240)

func S09RRequirePixelNear(pixels []uint8, width uint32, metrics WindowMetrics,
  x float64, y float64, red uint8, green uint8, blue uint8, tolerance int32,
  name string) {
    let pixel = S09RLogicalPixel(pixels, width, metrics, x, y)
    if !S09RNear(pixel, red, green, blue, tolerance) {
      throw InvalidOperationException("S09R pixel " + name + " at "
        +x.ToString() + "," + y.ToString() + " was "
        +S09RPixelText(pixel))
    }
  }

func S09RRequirePixelDifferent(pixels []uint8, width uint32, metrics WindowMetrics,
  x float64, y float64, red uint8, green uint8, blue uint8, tolerance int32,
  name string) {
    let pixel = S09RLogicalPixel(pixels, width, metrics, x, y)
    let distance = Math.Abs(int32(pixel[0]) - int32(red))
    +Math.Abs(int32(pixel[1]) - int32(green))
    +Math.Abs(int32(pixel[2]) - int32(blue))
    if distance <= tolerance {
      throw InvalidOperationException("S09R pixel " + name
        +" did not change: " + S09RPixelText(pixel))
    }
  }

func S09RRequireBorderPattern(pixels []uint8, width uint32,
  metrics WindowMetrics, left int32, right int32, name string) {
    var painted int32 = 0
    var gaps int32 = 0
    var x = left
    while x <= right {
      let pixel = S09RLogicalPixel(pixels, width, metrics, float64(x), 11.0)
      if S09RNear(pixel, uint8(232), uint8(96), uint8(72), 24) {
        painted = painted + 1
      } else if S09RNear(pixel, uint8(12), uint8(20), uint8(32), 16) {
        gaps = gaps + 1
      }
      x = x + 1
    }
    if painted == 0 || gaps == 0 {
      throw InvalidOperationException("S09R " + name
        +" did not contain both painted coverage and gaps")
    }
  }

func S09RRequireBlended(pixels []uint8, width uint32,
  metrics WindowMetrics, x float64, y float64, name string) {
    let pixel = S09RLogicalPixel(pixels, width, metrics, x, y)
    if pixel[0] <= uint8(12) || pixel[0] >= uint8(232)
      || pixel[1] <= uint8(20) || pixel[1] >= uint8(196)
      || pixel[2] <= uint8(32) || pixel[2] >= uint8(48)
      || pixel[3] != uint8(255) {
        throw InvalidOperationException("S09R pixel " + name + " was "
          +S09RPixelText(pixel))
      }
  }

func S14RequireTextCoverage(pixels []uint8, width uint32, metrics WindowMetrics,
  left int32, top int32, right int32, bottom int32, name string) {
    var covered int32 = 0
    var y = top
    while y <= bottom {
      var x = left
      while x <= right {
        let pixel = S09RLogicalPixel(pixels, width, metrics, float64(x), float64(y))
        if pixel[0] >= uint8(180) && pixel[1] >= uint8(180)
          && pixel[2] >= uint8(180) && pixel[3] >= uint8(240) {
            covered = covered + 1
          }
        x = x + 1
      }
      y = y + 1
    }
    if covered < 3 {
      throw InvalidOperationException("S14 text " + name
        +" did not produce white coverage: " + covered.ToString())
    }
  }

func S14RequireColorCoverage(pixels []uint8, width uint32, metrics WindowMetrics,
  left int32, top int32, right int32, bottom int32, name string) {
    var covered int32 = 0
    var y = top
    while y <= bottom {
      var x = left
      while x <= right {
        let pixel = S09RLogicalPixel(pixels, width, metrics, float64(x), float64(y))
        if pixel[3] >= uint8(240)
          && (pixel[0] > uint8(48) || pixel[1] > uint8(48) || pixel[2] > uint8(48)) {
            covered = covered + 1
          }
        x = x + 1
      }
      y = y + 1
    }
    if covered < 3 {
      throw InvalidOperationException("S14 color glyph " + name
        +" did not produce coverage: " + covered.ToString())
    }
  }

func S09RValidateResult(result VulkanReadbackResult, metrics WindowMetrics) {
  let expectedBytes = uint64(result.Width) * uint64(result.Height) * 4uL
  S14Require(result.Width == uint32(metrics.FramebufferWidth)
      && result.Height == uint32(metrics.FramebufferHeight),
    "S09R readback extent does not match the framebuffer")
  S14Require(result.RowBytes == result.Width * 4u,
    "S09R readback row bytes are incorrect")
  S14Require(uint64(result.Pixels.Length) == expectedBytes,
    "S09R readback byte count is incorrect")
  S14Require(int32(result.Format) == 43 && result.Premultiplied
      && !result.OriginBottomLeft && result.SrgbEncoded,
    "S09R readback metadata is incorrect")
  S14Require(result.Generation > 0uL && result.SubmissionSerial > 0uL,
    "S09R readback identity is invalid")
}

func S09RReadback(window Window, metrics WindowMetrics) VulkanReadbackResult {
  S14Require(metrics.FramebufferWidth > 0 && metrics.FramebufferHeight > 0,
    "S09R framebuffer metrics are invalid")
  S14RequestReadbackUntilAccepted(window, uint32(metrics.FramebufferWidth),
    uint32(metrics.FramebufferHeight))
  S14AwaitReadbackReady(window, 10000)
  let result = S14TakeReadback(window)
  S09RValidateResult(result, metrics)
  return result
}

func S15RequireOutsideStable(before []uint8, after []uint8, width uint32,
  height uint32, left int32, top int32, right int32, bottom int32) {
    var y uint32 = 0u
    while y < height {
      var x uint32 = 0u
      while x < width {
        let outside = int32(x) < left || int32(x) >= right
          || int32(y) < top || int32(y) >= bottom
        if outside {
          let index = int32((y * width + x) * 4u)
          var channel int32 = 0
          while channel < 4 {
            if Math.Abs(int32(before[index + channel])
              -int32(after[index + channel])) > 1 {
                throw InvalidOperationException("S15 retained scene changed a pixel outside the mutation")
              }
            channel = channel + 1
          }
        }
        x = x + 1u
      }
      y = y + 1u
    }
  }

func S15RequireBorderPayload(state VulkanSceneRetentionTestSnapshot,
  bounds ElementRect, scaleX float64, scaleY float64, radiusScale float64,
  topWidth float64, rightWidth float64, bottomWidth float64, leftWidth float64,
  radius float64, topColor uint32, rightColor uint32, bottomColor uint32,
  leftColor uint32, style uint32, name string) {
    S14Require(state.BorderLeafFound && state.BorderLeafCount == 1u
        && Math.Abs(float64(state.BorderLeafBoundsX) - bounds.X * scaleX) <= 0.01
        && Math.Abs(float64(state.BorderLeafBoundsY) - bounds.Y * scaleY) <= 0.01
        && Math.Abs(float64(state.BorderLeafBoundsWidth) - bounds.Width * scaleX) <= 0.01
        && Math.Abs(float64(state.BorderLeafBoundsHeight) - bounds.Height * scaleY) <= 0.01
        && Math.Abs(float64(state.BorderLeafTopWidth) - topWidth * scaleY) <= 0.01
        && Math.Abs(float64(state.BorderLeafRightWidth) - rightWidth * scaleX) <= 0.01
        && Math.Abs(float64(state.BorderLeafBottomWidth) - bottomWidth * scaleY) <= 0.01
        && Math.Abs(float64(state.BorderLeafLeftWidth) - leftWidth * scaleX) <= 0.01
        && Math.Abs(float64(state.BorderLeafRadiusTopLeft) - radius * radiusScale) <= 0.01
        && Math.Abs(float64(state.BorderLeafRadiusTopRight) - radius * radiusScale) <= 0.01
        && Math.Abs(float64(state.BorderLeafRadiusBottomRight) - radius * radiusScale) <= 0.01
        && Math.Abs(float64(state.BorderLeafRadiusBottomLeft) - radius * radiusScale) <= 0.01
        && state.BorderLeafTopColor == topColor
        && state.BorderLeafRightColor == rightColor
        && state.BorderLeafBottomColor == bottomColor
        && state.BorderLeafLeftColor == leftColor
        && state.BorderLeafStyle == style
        && state.BorderLeafTransformIndex == -1,
      "S15 " + name + " did not preserve the exact per-edge border payload")
  }

func RunS15RetentionGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let root = S15RetentionCell{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  var window Window? = nil
  var initialResult VulkanReadbackResult? = nil
  var mutatedResult VulkanReadbackResult? = nil
  var boundsResult VulkanReadbackResult? = nil
  var topologyAddResult VulkanReadbackResult? = nil
  var topologyRemoveResult VulkanReadbackResult? = nil
  var borderMutationResult VulkanReadbackResult? = nil
  var parentMutationResult VulkanReadbackResult? = nil
  var initialState VulkanSceneRetentionTestSnapshot{}
  var warmState VulkanSceneRetentionTestSnapshot{}
  var parentMutatedState VulkanSceneRetentionTestSnapshot{}
  var parentUnsupportedState VulkanSceneRetentionTestSnapshot{}
  var parentRecapturedState VulkanSceneRetentionTestSnapshot{}
  var mutatedState VulkanSceneRetentionTestSnapshot{}
  var boundsState VulkanSceneRetentionTestSnapshot{}
  var unsupportedState VulkanSceneRetentionTestSnapshot{}
  var recapturedState VulkanSceneRetentionTestSnapshot{}
  var recapturedWarmState VulkanSceneRetentionTestSnapshot{}
  var topologyAddState VulkanSceneRetentionTestSnapshot{}
  var topologyRemoveState VulkanSceneRetentionTestSnapshot{}
  var borderMutationState VulkanSceneRetentionTestSnapshot{}
  var borderUnsupportedState VulkanSceneRetentionTestSnapshot{}
  var borderRecapturedState VulkanSceneRetentionTestSnapshot{}
  var borderWarmState VulkanSceneRetentionTestSnapshot{}
  var finalState VulkanSceneRetentionTestSnapshot{}
  var initialPrimitive VulkanPrimitiveFrameRetentionTestSnapshot{}
  var warmPrimitive VulkanPrimitiveFrameRetentionTestSnapshot{}
  var mutatedPrimitive VulkanPrimitiveFrameRetentionTestSnapshot{}
  var topologyAddPrimitive VulkanPrimitiveFrameRetentionTestSnapshot{}
  var topologyRemovePrimitive VulkanPrimitiveFrameRetentionTestSnapshot{}
  var borderWarmPrimitive VulkanPrimitiveFrameRetentionTestSnapshot{}
  var borderMutatedPrimitive VulkanPrimitiveFrameRetentionTestSnapshot{}
  try {
    let opened = Window{
      Title: "Goo S15 retained scene gate",
      Width: 240,
      Height: 140,
      VSync: false,
      Root: root,
    }
    window = opened
    Console.SetError(capturedError)
    opened.Open()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    let metrics = WindowReadbackTestFixture.Metrics(opened)
    S14Require(metrics.LogicalWidth == 240 && metrics.LogicalHeight == 140,
      "S15 retained scene metrics are incorrect")
    let scaleX = if metrics.DisplayScaleX > 0.0 { metrics.DisplayScaleX } else { 1.0 }
    let scaleY = if metrics.DisplayScaleY > 0.0 { metrics.DisplayScaleY } else { 1.0 }
    let radiusScale = if scaleX < scaleY { scaleX } else { scaleY }
    let roundedBounds = S15RetentionCell.RoundedBox.BorderBox
    let borderBounds = S15RetentionCell.BorderLeaf.BorderBox
    let roundedColor = (uint32(72) << 24) | (uint32(180) << 16)
    | (uint32(212) << 8) | uint32(255)
    let initialMutatedColor = (uint32(220) << 24) | (uint32(40) << 16)
    | (uint32(64) << 8) | uint32(255)
    let changedMutatedColor = (uint32(40) << 24) | (uint32(220) << 16)
    | (uint32(96) << 8) | uint32(255)
    let initialBorderTopColor = (uint32(232) << 24) | (uint32(96) << 16)
    | (uint32(72) << 8) | uint32(255)
    let changedBorderTopColor = (uint32(248) << 24) | (uint32(196) << 16)
    | (uint32(48) << 8) | uint32(255)
    let borderRightColor = (uint32(96) << 24) | (uint32(224) << 16)
    | (uint32(128) << 8) | uint32(255)
    let borderBottomColor = (uint32(72) << 24) | (uint32(144) << 16)
    | (uint32(232) << 8) | uint32(255)
    let borderLeftColor = (uint32(224) << 24) | (uint32(184) << 16)
    | (uint32(72) << 8) | uint32(255)
    let solidBorderStyle = uint32(int32(BorderStyle.Solid))
    S14Require(S15RetentionCell.Root.IsMounted
        && S15RetentionCell.MutatedBox.IsMounted
        && S15RetentionCell.RoundedBox.IsMounted
        && S15RetentionCell.BorderLeaf.IsMounted,
      "S15 retained scene did not mount the mutation box")
    initialState = WindowReadbackTestFixture.SceneRetention(opened)
    S14Require(initialState.ActiveSceneVersion > 0uL
        && initialState.SceneVersion == initialState.ActiveSceneVersion
        && initialState.AcquiredImageState
        && initialState.FullRedraw
        && !initialState.PartialRedraw
        && initialState.DamageWidth == metrics.FramebufferWidth
        && initialState.DamageHeight == metrics.FramebufferHeight,
      "S15 first use did not force a full redraw")
    S14Require(initialState.DirtyChunkCount > 0u
        && initialState.PendingImageCount == 1u
        && initialState.ActivePendingSceneVersion == initialState.ActiveSceneVersion
        && initialState.PendingSceneVersion == initialState.ActiveSceneVersion,
      "S15 first use did not publish the scene to the acquired image")
    S14Require(initialState.AppliedImageCount == 0u
        && initialState.PromotedImageCount == 0u
        && initialState.ActiveAppliedSceneVersion == 0uL,
      "S15 first use promoted a scene before presentation")
    S14Require(initialState.RetainedLeafTotalCount == 4uL
        && initialState.RetainedLeafHitCount == 0uL
        && initialState.RetainedLeafRebuildCount == 4uL
        && initialState.RetainedLeafFallbackCount == 0uL
        && initialState.RetainedLeafInvalidationCount == 0uL,
      "S15 first use did not rebuild the exact solid and rounded leaves")
    S14Require(initialState.RetainedParentBoxTotalCount == 1uL
        && initialState.RetainedParentBoxHitCount == 0uL
        && initialState.RetainedParentBoxRebuildCount == 1uL
        && initialState.RetainedParentBoxFallbackCount == 0uL
        && initialState.RetainedParentBoxInvalidationCount == 0uL,
      "S15 first use did not rebuild the retained parent box")
    S14Require(initialState.RetainedBorderTotalCount == 1uL
        && initialState.RetainedBorderHitCount == 0uL
        && initialState.RetainedBorderRebuildCount == 1uL
        && initialState.RetainedBorderFallbackCount == 0uL
        && initialState.RetainedBorderInvalidationCount == 0uL,
      "S15 first use did not rebuild the exact solid border leaf")
    S14Require(initialState.RoundedLeafCount == 1u
        && Math.Abs(float64(initialState.RoundedLeafBoundsX)
          -roundedBounds.X * scaleX) <= 0.01
        && Math.Abs(float64(initialState.RoundedLeafBoundsY)
          -roundedBounds.Y * scaleY) <= 0.01
        && Math.Abs(float64(initialState.RoundedLeafBoundsWidth)
          -roundedBounds.Width * scaleX) <= 0.01
        && Math.Abs(float64(initialState.RoundedLeafBoundsHeight)
          -roundedBounds.Height * scaleY) <= 0.01
        && Math.Abs(float64(initialState.RoundedLeafRadiusTopLeft) - 4.0 * radiusScale) <= 0.01
        && Math.Abs(float64(initialState.RoundedLeafRadiusTopRight) - 8.0 * radiusScale) <= 0.01
        && Math.Abs(float64(initialState.RoundedLeafRadiusBottomRight) - 12.0 * radiusScale) <= 0.01
        && Math.Abs(float64(initialState.RoundedLeafRadiusBottomLeft) - 16.0 * radiusScale) <= 0.01
        && initialState.RoundedLeafColor == roundedColor
        && Math.Abs(float64(initialState.RoundedLeafOpacity) - 1.0) <= 0.01,
      "S15 first use did not emit the exact rounded kind, bounds, color, opacity, and radii")
    S14Require(initialState.MutatedSolidLeafFound
        && Math.Abs(float64(initialState.MutatedSolidLeafBoundsX) - 88.0 * scaleX) <= 0.01
        && Math.Abs(float64(initialState.MutatedSolidLeafBoundsY) - 8.0 * scaleY) <= 0.01
        && Math.Abs(float64(initialState.MutatedSolidLeafBoundsWidth) - 64.0 * scaleX) <= 0.01
        && Math.Abs(float64(initialState.MutatedSolidLeafBoundsHeight) - 32.0 * scaleY) <= 0.01
        && initialState.MutatedSolidLeafColor == initialMutatedColor
        && Math.Abs(float64(initialState.MutatedSolidLeafOpacity) - 1.0) <= 0.01,
      "S15 first use did not emit the exact solid leaf payload")
    S15RequireBorderPayload(initialState, borderBounds, scaleX, scaleY, radiusScale,
      2.0, 3.0, 4.0, 5.0, 0.0, initialBorderTopColor, borderRightColor,
      borderBottomColor, borderLeftColor, solidBorderStyle, "first-use border")
    initialPrimitive = WindowReadbackTestFixture.PrimitiveFrameRetention(opened)
    S14Require(initialPrimitive.SlotIndex == 0 || initialPrimitive.SlotIndex == 1,
      "S15 first primitive frame used an invalid slot")
    S14Require(initialPrimitive.RecordCount > 1
        && initialPrimitive.ByteCount
      == uint64(initialPrimitive.RecordCount) * 128uL
        && initialPrimitive.FullUpload
        && initialPrimitive.DirtyRecordCount == initialPrimitive.RecordCount
        && initialPrimitive.UploadRangeCount == 1
        && initialPrimitive.WrittenBytes == initialPrimitive.ByteCount
        && initialPrimitive.SkippedBytes == 0uL
        && initialPrimitive.MappedWrites == 1uL
        && initialPrimitive.Flushes == 1uL
        && initialPrimitive.RetainedReuse == 0uL,
      "S15 first primitive frame did not force a full upload")
    initialResult = S09RReadback(opened, metrics)
    S09RRequirePixelNear(initialResult!!.Pixels, initialResult!!.Width, metrics,
      120.0, 24.0, uint8(220), uint8(40), uint8(64), 4, "initial_mutated_box")
    S09RRequirePixelNear(initialResult!!.Pixels, initialResult!!.Width, metrics,
      200.0, 9.0, uint8(232), uint8(96), uint8(72), 8, "initial_border_top")
    S09RRequirePixelNear(initialResult!!.Pixels, initialResult!!.Width, metrics,
      200.0, 9.0, uint8(232), uint8(96), uint8(72), 8, "initial_border_top")
    S09RRequirePixelNear(initialResult!!.Pixels, initialResult!!.Width, metrics,
      230.0, 24.0, uint8(96), uint8(224), uint8(128), 8, "initial_border_right")
    S09RRequirePixelNear(initialResult!!.Pixels, initialResult!!.Width, metrics,
      200.0, 38.0, uint8(72), uint8(144), uint8(232), 8, "initial_border_bottom")
    S09RRequirePixelNear(initialResult!!.Pixels, initialResult!!.Width, metrics,
      170.0, 24.0, uint8(224), uint8(184), uint8(72), 8, "initial_border_left")

    var sawPrimitiveSlot0 bool = false
    var sawPrimitiveSlot1 bool = false
    var sawPrimitiveSlot0Clean bool = false
    var sawPrimitiveSlot1Clean bool = false
    var primitiveWarmupFrame int32 = 0
    while primitiveWarmupFrame < 12
      && (!sawPrimitiveSlot0Clean || !sawPrimitiveSlot1Clean) {
        WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
        let nextPrimitive = WindowReadbackTestFixture.PrimitiveFrameRetention(opened)
        warmPrimitive = nextPrimitive
        if nextPrimitive.RecordCount > 0 {
          let clean = !nextPrimitive.FullUpload
            && nextPrimitive.WrittenBytes == 0uL
            && nextPrimitive.SkippedBytes == nextPrimitive.ByteCount
            && nextPrimitive.DirtyRecordCount == 0
            && nextPrimitive.UploadRangeCount == 0
            && nextPrimitive.MappedWrites == 1uL
            && nextPrimitive.Flushes == 0uL
            && nextPrimitive.RetainedReuse
          == uint64(nextPrimitive.RecordCount)
          if nextPrimitive.SlotIndex == 0 {
            sawPrimitiveSlot0 = true
            if clean {
              sawPrimitiveSlot0Clean = true
            }
          } else if nextPrimitive.SlotIndex == 1 {
            sawPrimitiveSlot1 = true
            if clean {
              sawPrimitiveSlot1Clean = true
            }
          }
        }
        primitiveWarmupFrame = primitiveWarmupFrame + 1
      }
    S14Require(sawPrimitiveSlot0 && sawPrimitiveSlot1
        && sawPrimitiveSlot0Clean && sawPrimitiveSlot1Clean
        && warmPrimitive.RecordCount == initialPrimitive.RecordCount
        && warmPrimitive.ByteCount == initialPrimitive.ByteCount,
      "S15 unchanged primitive content did not retain both frame slots")
    warmState = WindowReadbackTestFixture.SceneRetention(opened)
    let warmLeafTotal = warmState.RetainedLeafTotalCount
    -initialState.RetainedLeafTotalCount
    let warmLeafHits = warmState.RetainedLeafHitCount
    -initialState.RetainedLeafHitCount
    S14Require(warmLeafTotal > 0uL
        && warmLeafHits == warmLeafTotal
        && warmState.RetainedLeafRebuildCount
      == initialState.RetainedLeafRebuildCount
        && warmState.RetainedLeafFallbackCount
      == initialState.RetainedLeafFallbackCount
        && warmState.RetainedLeafInvalidationCount
      == initialState.RetainedLeafInvalidationCount,
      "S15 unchanged leaves did not produce exact warm solid and rounded hits")
    let warmParentTotal = warmState.RetainedParentBoxTotalCount
    -initialState.RetainedParentBoxTotalCount
    let warmParentHits = warmState.RetainedParentBoxHitCount
    -initialState.RetainedParentBoxHitCount
    S14Require(warmParentTotal > 0uL
        && warmParentHits == warmParentTotal
        && warmState.RetainedParentBoxRebuildCount
      == initialState.RetainedParentBoxRebuildCount
        && warmState.RetainedParentBoxFallbackCount
      == initialState.RetainedParentBoxFallbackCount
        && warmState.RetainedParentBoxInvalidationCount
      == initialState.RetainedParentBoxInvalidationCount,
      "S15 warm parent box did not hit while continuing into generic children")
    let warmBorderTotal = warmState.RetainedBorderTotalCount
    -initialState.RetainedBorderTotalCount
    let warmBorderHits = warmState.RetainedBorderHitCount
    -initialState.RetainedBorderHitCount
    S14Require(warmBorderTotal > 0uL
        && warmBorderHits == warmBorderTotal
        && warmState.RetainedBorderRebuildCount
      == initialState.RetainedBorderRebuildCount
        && warmState.RetainedBorderFallbackCount
      == initialState.RetainedBorderFallbackCount
        && warmState.RetainedBorderInvalidationCount
      == initialState.RetainedBorderInvalidationCount,
      "S15 unchanged border leaf did not produce exact warm hits")
    S15RequireBorderPayload(warmState, borderBounds, scaleX, scaleY, radiusScale,
      2.0, 3.0, 4.0, 5.0, 0.0, initialBorderTopColor, borderRightColor,
      borderBottomColor, borderLeftColor, solidBorderStyle, "warm border")
    S14Require(warmState.RoundedLeafCount == initialState.RoundedLeafCount
        && Math.Abs(float64(warmState.RoundedLeafBoundsX)
          -roundedBounds.X * scaleX) <= 0.01
        && Math.Abs(float64(warmState.RoundedLeafBoundsY)
          -roundedBounds.Y * scaleY) <= 0.01
        && Math.Abs(float64(warmState.RoundedLeafBoundsWidth)
          -roundedBounds.Width * scaleX) <= 0.01
        && Math.Abs(float64(warmState.RoundedLeafBoundsHeight)
          -roundedBounds.Height * scaleY) <= 0.01
        && Math.Abs(float64(warmState.RoundedLeafRadiusTopLeft) - 4.0 * radiusScale) <= 0.01
        && Math.Abs(float64(warmState.RoundedLeafRadiusTopRight) - 8.0 * radiusScale) <= 0.01
        && Math.Abs(float64(warmState.RoundedLeafRadiusBottomRight) - 12.0 * radiusScale) <= 0.01
        && Math.Abs(float64(warmState.RoundedLeafRadiusBottomLeft) - 16.0 * radiusScale) <= 0.01
        && warmState.RoundedLeafColor == roundedColor
        && Math.Abs(float64(warmState.RoundedLeafOpacity) - 1.0) <= 0.01,
      "S15 warm rounded leaf did not preserve exact emitted payload")

    root.MutateBox()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    mutatedPrimitive = WindowReadbackTestFixture.PrimitiveFrameRetention(opened)
    S14Require(mutatedPrimitive.RecordCount == warmPrimitive.RecordCount
        && mutatedPrimitive.ByteCount == warmPrimitive.ByteCount
        && !mutatedPrimitive.FullUpload
        && mutatedPrimitive.DirtyRecordCount == 1
        && mutatedPrimitive.UploadRangeCount == 1
        && mutatedPrimitive.WrittenBytes == 128uL
        && mutatedPrimitive.SkippedBytes == mutatedPrimitive.ByteCount - 128uL
        && mutatedPrimitive.MappedWrites == 1uL
        && mutatedPrimitive.Flushes == 1uL
        && mutatedPrimitive.RetainedReuse
      == uint64(mutatedPrimitive.RecordCount - 1),
      "S15 one-box mutation did not upload one dirty primitive record")
    mutatedState = WindowReadbackTestFixture.SceneRetention(opened)
    let colorLeafTotal = mutatedState.RetainedLeafTotalCount
    -warmState.RetainedLeafTotalCount
    let colorLeafHits = mutatedState.RetainedLeafHitCount
    -warmState.RetainedLeafHitCount
    let colorLeafRebuilds = mutatedState.RetainedLeafRebuildCount
    -warmState.RetainedLeafRebuildCount
    let colorLeafInvalidations = mutatedState.RetainedLeafInvalidationCount
    -warmState.RetainedLeafInvalidationCount
    S14Require(colorLeafTotal > 0uL
        && colorLeafRebuilds == 1uL
        && colorLeafHits == colorLeafTotal - 1uL
        && colorLeafInvalidations == 1uL
        && mutatedState.RetainedLeafFallbackCount
      == warmState.RetainedLeafFallbackCount,
      "S15 color mutation did not miss exactly one leaf with clean siblings retained")
    S14Require(mutatedState.MutatedSolidLeafFound
        && Math.Abs(float64(mutatedState.MutatedSolidLeafBoundsX) - 88.0 * scaleX) <= 0.01
        && Math.Abs(float64(mutatedState.MutatedSolidLeafBoundsY) - 8.0 * scaleY) <= 0.01
        && Math.Abs(float64(mutatedState.MutatedSolidLeafBoundsWidth) - 64.0 * scaleX) <= 0.01
        && Math.Abs(float64(mutatedState.MutatedSolidLeafBoundsHeight) - 32.0 * scaleY) <= 0.01
        && mutatedState.MutatedSolidLeafColor == changedMutatedColor
        && Math.Abs(float64(mutatedState.MutatedSolidLeafOpacity) - 1.0) <= 0.01,
      "S15 color mutation did not emit the current packed solid payload")
    let changedLeft = int32(Math.Floor(88.0 * scaleX))
    let changedTop = int32(Math.Floor(8.0 * scaleY))
    let changedRight = int32(Math.Ceiling(152.0 * scaleX))
    let changedBottom = int32(Math.Ceiling(40.0 * scaleY))
    S14Require(mutatedState.ActiveSceneVersion > initialState.ActiveSceneVersion
        && mutatedState.SceneVersion == mutatedState.ActiveSceneVersion
        && mutatedState.AcquiredImageState
        && mutatedState.ActiveAppliedSceneVersion < mutatedState.ActiveSceneVersion
        && mutatedState.PartialRedraw
        && !mutatedState.FullRedraw
        && mutatedState.DamageWidth < metrics.FramebufferWidth
        && mutatedState.DamageHeight < metrics.FramebufferHeight
        && mutatedState.DamageX <= changedLeft
        && mutatedState.DamageY <= changedTop
        && mutatedState.DamageX + mutatedState.DamageWidth >= changedRight
        && mutatedState.DamageY + mutatedState.DamageHeight >= changedBottom,
      "S15 box mutation did not produce bounded partial damage: scene="
      +mutatedState.SceneVersion.ToString() + " active="
      +mutatedState.ActiveSceneVersion.ToString() + " acquired="
      +mutatedState.AcquiredImageState.ToString() + " applied="
      +mutatedState.ActiveAppliedSceneVersion.ToString() + " partial="
      +mutatedState.PartialRedraw.ToString() + " full="
      +mutatedState.FullRedraw.ToString() + " damage="
      +mutatedState.DamageX.ToString() + ","
      +mutatedState.DamageY.ToString() + ","
      +mutatedState.DamageWidth.ToString() + ","
      +mutatedState.DamageHeight.ToString() + " framebuffer="
      +metrics.FramebufferWidth.ToString() + "x"
      +metrics.FramebufferHeight.ToString() + " warmPartial="
      +warmState.PartialRedraw.ToString() + " warmFull="
      +warmState.FullRedraw.ToString() + " warmDamage="
      +warmState.DamageX.ToString() + "," + warmState.DamageY.ToString() + ","
      +warmState.DamageWidth.ToString() + ","
      +warmState.DamageHeight.ToString() + " warmDirty="
      +warmState.DirtyChunkCount.ToString() + " warmReused="
      +warmState.ReusedChunkCount.ToString() + " mutatedDirty="
      +mutatedState.DirtyChunkCount.ToString() + " mutatedReused="
      +mutatedState.ReusedChunkCount.ToString())
    S14Require(mutatedState.DirtyChunkCount > 0u
        && mutatedState.ReusedChunkCount > 0u,
      "S15 box mutation did not retain clean chunks")
    S14Require(mutatedState.PendingImageCount == 1u
        && mutatedState.ActivePendingSceneVersion == mutatedState.ActiveSceneVersion
        && mutatedState.PendingSceneVersion == mutatedState.ActiveSceneVersion,
      "S15 box mutation did not publish its scene version to the acquired image")
    mutatedResult = S09RReadback(opened, metrics)
    S09RRequirePixelNear(mutatedResult!!.Pixels, mutatedResult!!.Width, metrics,
      120.0, 24.0, uint8(40), uint8(220), uint8(96), 4, "mutated_box")
    S15RequireOutsideStable(initialResult!!.Pixels, mutatedResult!!.Pixels,
      mutatedResult!!.Width, mutatedResult!!.Height,
      changedLeft, changedTop, changedRight, changedBottom)

    root.MutateBounds()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    boundsState = WindowReadbackTestFixture.SceneRetention(opened)
    let boundsLeafTotal = boundsState.RetainedLeafTotalCount
    -mutatedState.RetainedLeafTotalCount
    let boundsLeafHits = boundsState.RetainedLeafHitCount
    -mutatedState.RetainedLeafHitCount
    let boundsLeafRebuilds = boundsState.RetainedLeafRebuildCount
    -mutatedState.RetainedLeafRebuildCount
    let boundsLeafInvalidations = boundsState.RetainedLeafInvalidationCount
    -mutatedState.RetainedLeafInvalidationCount
    S14Require(boundsLeafTotal > 0uL
        && boundsLeafRebuilds == 1uL
        && boundsLeafHits == boundsLeafTotal - 1uL
        && boundsLeafInvalidations == 1uL
        && boundsState.RetainedLeafFallbackCount
      == mutatedState.RetainedLeafFallbackCount,
      "S15 bounds mutation did not rebuild exactly one leaf with clean siblings retained")
    S14Require(boundsState.MutatedSolidLeafFound
        && Math.Abs(float64(boundsState.MutatedSolidLeafBoundsX) - 104.0 * scaleX) <= 0.01
        && Math.Abs(float64(boundsState.MutatedSolidLeafBoundsY) - 8.0 * scaleY) <= 0.01
        && Math.Abs(float64(boundsState.MutatedSolidLeafBoundsWidth) - 64.0 * scaleX) <= 0.01
        && Math.Abs(float64(boundsState.MutatedSolidLeafBoundsHeight) - 32.0 * scaleY) <= 0.01
        && boundsState.MutatedSolidLeafColor == changedMutatedColor
        && Math.Abs(float64(boundsState.MutatedSolidLeafOpacity) - 1.0) <= 0.01,
      "S15 bounds mutation did not emit the exact moved solid payload")
    let movedBounds = S15RetentionCell.MutatedBox.BorderBox
    S14Require(movedBounds.Width > 0.0 && movedBounds.Height > 0.0,
      "S15 bounds mutation lost the moved box geometry")
    let movedLeft = int32(Math.Floor(movedBounds.X * scaleX))
    let movedTop = int32(Math.Floor(movedBounds.Y * scaleY))
    let movedRight = int32(Math.Ceiling((movedBounds.X + movedBounds.Width) * scaleX))
    let movedBottom = int32(Math.Ceiling((movedBounds.Y + movedBounds.Height) * scaleY))
    let damageLeft = if changedLeft < movedLeft { changedLeft } else { movedLeft }
    let unionRight = if changedRight > movedRight { changedRight } else { movedRight }
    let damageRight = if unionRight > metrics.FramebufferWidth {
      metrics.FramebufferWidth
    } else {
      unionRight
    }
    let damageTop = if changedTop < movedTop { changedTop } else { movedTop }
    let unionBottom = if changedBottom > movedBottom { changedBottom } else { movedBottom }
    let damageBottom = if unionBottom > metrics.FramebufferHeight {
      metrics.FramebufferHeight
    } else {
      unionBottom
    }
    S14Require(boundsState.ActiveSceneVersion > mutatedState.ActiveSceneVersion
        && boundsState.SceneVersion == boundsState.ActiveSceneVersion
        && boundsState.AcquiredImageState
        && boundsState.ActiveAppliedSceneVersion < boundsState.ActiveSceneVersion
        && boundsState.PartialRedraw
        && !boundsState.FullRedraw
        && boundsState.DamageWidth < metrics.FramebufferWidth
        && boundsState.DamageHeight < metrics.FramebufferHeight
        && boundsState.DamageX <= damageLeft
        && boundsState.DamageY <= damageTop
        && boundsState.DamageX + boundsState.DamageWidth >= damageRight
        && boundsState.DamageY + boundsState.DamageHeight >= damageBottom,
      "S15 bounds mutation did not damage both old and new bounds: x="
      +boundsState.DamageX.ToString() + " y=" + boundsState.DamageY.ToString()
      +" w=" + boundsState.DamageWidth.ToString() + " h="
      +boundsState.DamageHeight.ToString() + " oldLeft=" + changedLeft.ToString()
      +" oldRight=" + changedRight.ToString() + " newLeft=" + movedLeft.ToString()
      +" newRight=" + movedRight.ToString() + " unionLeft=" + damageLeft.ToString()
      +" unionRight=" + unionRight.ToString() + " clippedRight="
      +damageRight.ToString() + " unionTop=" + damageTop.ToString()
      +" unionBottom=" + unionBottom.ToString() + " clippedBottom="
      +damageBottom.ToString() + " partial="
      +boundsState.PartialRedraw.ToString())
    boundsResult = S09RReadback(opened, metrics)
    S09RRequirePixelNear(boundsResult!!.Pixels, boundsResult!!.Width, metrics,
      136.0, 24.0, uint8(40), uint8(220), uint8(96), 4, "bounds_mutated_box")
    S09RRequirePixelNear(boundsResult!!.Pixels, boundsResult!!.Width, metrics,
      96.0, 24.0, uint8(12), uint8(20), uint8(32), 8, "bounds_old_only_background")
    S15RequireOutsideStable(mutatedResult!!.Pixels, boundsResult!!.Pixels,
      boundsResult!!.Width, boundsResult!!.Height,
      damageLeft, damageTop, damageRight, damageBottom)

    root.ToggleUnsupportedFeature()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    unsupportedState = WindowReadbackTestFixture.SceneRetention(opened)
    let unsupportedLeafFallbacks = unsupportedState.RetainedLeafFallbackCount
    -boundsState.RetainedLeafFallbackCount
    let unsupportedLeafInvalidations = unsupportedState.RetainedLeafInvalidationCount
    -boundsState.RetainedLeafInvalidationCount
    S14Require(unsupportedLeafFallbacks == 1uL
        && unsupportedLeafInvalidations == 1uL
        && unsupportedState.AcquiredImageState
        && unsupportedState.FullRedraw
        && !unsupportedState.PartialRedraw
        && unsupportedState.DamageWidth == metrics.FramebufferWidth
        && unsupportedState.DamageHeight == metrics.FramebufferHeight,
      "S15 unsupported leaf feature did not force one generic fallback and full damage"
      +" fallbackDelta=" + unsupportedLeafFallbacks.ToString()
      +" invalidationDelta=" + unsupportedLeafInvalidations.ToString()
      +" acquired=" + unsupportedState.AcquiredImageState.ToString()
      +" full=" + unsupportedState.FullRedraw.ToString()
      +" partial=" + unsupportedState.PartialRedraw.ToString()
      +" damageX=" + unsupportedState.DamageX.ToString()
      +" damageY=" + unsupportedState.DamageY.ToString()
      +" damageWidth=" + unsupportedState.DamageWidth.ToString()
      +" damageHeight=" + unsupportedState.DamageHeight.ToString()
      +" framebufferWidth=" + metrics.FramebufferWidth.ToString()
      +" framebufferHeight=" + metrics.FramebufferHeight.ToString())

    root.ToggleUnsupportedFeature()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    recapturedState = WindowReadbackTestFixture.SceneRetention(opened)
    let recapturedLeafRebuilds = recapturedState.RetainedLeafRebuildCount
    -unsupportedState.RetainedLeafRebuildCount
    let recapturedLeafInvalidations = recapturedState.RetainedLeafInvalidationCount
    -unsupportedState.RetainedLeafInvalidationCount
    S14Require(recapturedLeafRebuilds == 1uL
        && recapturedLeafInvalidations == 0uL
        && recapturedState.RetainedLeafFallbackCount
      == unsupportedState.RetainedLeafFallbackCount,
      "S15 unsupported leaf removal did not safely recapture the rounded leaf")
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    recapturedWarmState = WindowReadbackTestFixture.SceneRetention(opened)
    let recapturedWarmLeafTotal = recapturedWarmState.RetainedLeafTotalCount
    -recapturedState.RetainedLeafTotalCount
    let recapturedWarmLeafHits = recapturedWarmState.RetainedLeafHitCount
    -recapturedState.RetainedLeafHitCount
    S14Require(recapturedWarmLeafTotal > 0uL
        && recapturedWarmLeafHits == recapturedWarmLeafTotal
        && recapturedWarmState.RetainedLeafRebuildCount
      == recapturedState.RetainedLeafRebuildCount,
      "S15 rounded leaf did not return to exact warm retention after fallback"
      +" warmTotalDelta=" + recapturedWarmLeafTotal.ToString()
      +" warmHitDelta=" + recapturedWarmLeafHits.ToString()
      +" recapturedRebuilds="
      +recapturedState.RetainedLeafRebuildCount.ToString()
      +" warmRebuilds="
      +recapturedWarmState.RetainedLeafRebuildCount.ToString()
      +" recapturedFallbacks="
      +recapturedState.RetainedLeafFallbackCount.ToString()
      +" warmFallbacks="
      +recapturedWarmState.RetainedLeafFallbackCount.ToString()
      +" recapturedInvalidations="
      +recapturedState.RetainedLeafInvalidationCount.ToString()
      +" warmInvalidations="
      +recapturedWarmState.RetainedLeafInvalidationCount.ToString()
      +" dirty=" + recapturedWarmState.DirtyChunkCount.ToString()
      +" reused=" + recapturedWarmState.ReusedChunkCount.ToString()
      +" acquired=" + recapturedWarmState.AcquiredImageState.ToString()
      +" full=" + recapturedWarmState.FullRedraw.ToString()
      +" partial=" + recapturedWarmState.PartialRedraw.ToString()
      +" damageX=" + recapturedWarmState.DamageX.ToString()
      +" damageY=" + recapturedWarmState.DamageY.ToString()
      +" damageWidth=" + recapturedWarmState.DamageWidth.ToString()
      +" damageHeight=" + recapturedWarmState.DamageHeight.ToString()
      +" framebufferWidth=" + metrics.FramebufferWidth.ToString()
      +" framebufferHeight=" + metrics.FramebufferHeight.ToString())
    S14Require(recapturedWarmState.RoundedLeafCount == initialState.RoundedLeafCount
        && recapturedWarmState.RoundedLeafColor == roundedColor
        && Math.Abs(float64(recapturedWarmState.RoundedLeafRadiusTopLeft)
          -4.0 * radiusScale) <= 0.01
        && Math.Abs(float64(recapturedWarmState.RoundedLeafRadiusTopRight)
          -8.0 * radiusScale) <= 0.01
        && Math.Abs(float64(recapturedWarmState.RoundedLeafRadiusBottomRight)
          -12.0 * radiusScale) <= 0.01
        && Math.Abs(float64(recapturedWarmState.RoundedLeafRadiusBottomLeft)
          -16.0 * radiusScale) <= 0.01,
      "S15 rounded leaf recapture did not restore its exact payload")

    root.ToggleExtra()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    topologyAddPrimitive = WindowReadbackTestFixture.PrimitiveFrameRetention(opened)
    S14Require(topologyAddPrimitive.RecordCount != mutatedPrimitive.RecordCount
        && topologyAddPrimitive.ByteCount
      == uint64(topologyAddPrimitive.RecordCount) * 128uL
        && topologyAddPrimitive.FullUpload
        && topologyAddPrimitive.DirtyRecordCount == topologyAddPrimitive.RecordCount
        && topologyAddPrimitive.UploadRangeCount == 1
        && topologyAddPrimitive.WrittenBytes == topologyAddPrimitive.ByteCount
        && topologyAddPrimitive.SkippedBytes == 0uL
        && topologyAddPrimitive.MappedWrites == 1uL
        && topologyAddPrimitive.Flushes == 1uL
        && topologyAddPrimitive.RetainedReuse == 0uL,
      "S15 topology add did not force a full primitive upload")
    topologyAddState = WindowReadbackTestFixture.SceneRetention(opened)
    S14Require(topologyAddState.FullRedraw
        && topologyAddState.AcquiredImageState
        && !topologyAddState.PartialRedraw
        && topologyAddState.DamageWidth == metrics.FramebufferWidth
        && topologyAddState.DamageHeight == metrics.FramebufferHeight
        && topologyAddState.RetainedLeafTotalCount
      -recapturedWarmState.RetainedLeafTotalCount == 5uL
        && topologyAddState.RetainedLeafHitCount
      -recapturedWarmState.RetainedLeafHitCount == 4uL
        && topologyAddState.RetainedLeafRebuildCount
      -recapturedWarmState.RetainedLeafRebuildCount == 1uL,
      "S15 topology add did not force full damage")
    topologyAddResult = S09RReadback(opened, metrics)
    S09RRequirePixelNear(topologyAddResult!!.Pixels, topologyAddResult!!.Width, metrics,
      200.0, 72.0, uint8(128), uint8(72), uint8(220), 6, "topology_added_box")

    root.ToggleExtra()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    topologyRemovePrimitive = WindowReadbackTestFixture.PrimitiveFrameRetention(opened)
    S14Require(topologyRemovePrimitive.RecordCount == mutatedPrimitive.RecordCount
        && topologyRemovePrimitive.ByteCount
      == uint64(topologyRemovePrimitive.RecordCount) * 128uL
        && topologyRemovePrimitive.FullUpload
        && topologyRemovePrimitive.DirtyRecordCount == topologyRemovePrimitive.RecordCount
        && topologyRemovePrimitive.UploadRangeCount == 1
        && topologyRemovePrimitive.WrittenBytes == topologyRemovePrimitive.ByteCount
        && topologyRemovePrimitive.SkippedBytes == 0uL
        && topologyRemovePrimitive.MappedWrites == 1uL
        && topologyRemovePrimitive.Flushes == 1uL
        && topologyRemovePrimitive.RetainedReuse == 0uL,
      "S15 topology remove did not force a full primitive upload")
    topologyRemoveState = WindowReadbackTestFixture.SceneRetention(opened)
    S14Require(topologyRemoveState.FullRedraw
        && topologyRemoveState.AcquiredImageState
        && !topologyRemoveState.PartialRedraw
        && topologyRemoveState.DamageWidth == metrics.FramebufferWidth
        && topologyRemoveState.DamageHeight == metrics.FramebufferHeight,
      "S15 topology remove did not force full damage: partial="
      +topologyRemoveState.PartialRedraw.ToString() + " x="
      +topologyRemoveState.DamageX.ToString() + " y="
      +topologyRemoveState.DamageY.ToString() + " w="
      +topologyRemoveState.DamageWidth.ToString() + " h="
      +topologyRemoveState.DamageHeight.ToString())
    S14Require(topologyRemoveState.RetainedLeafTotalCount
      -topologyAddState.RetainedLeafTotalCount > 0uL
        && topologyRemoveState.RetainedLeafHitCount
      -topologyAddState.RetainedLeafHitCount
      == topologyRemoveState.RetainedLeafTotalCount
      -topologyAddState.RetainedLeafTotalCount
        && topologyRemoveState.RetainedLeafRebuildCount
      == topologyAddState.RetainedLeafRebuildCount,
      "S15 topology remove did not retain the unchanged leaves")

    topologyRemoveResult = S09RReadback(opened, metrics)
    S09RRequirePixelNear(topologyRemoveResult!!.Pixels, topologyRemoveResult!!.Width, metrics,
      200.0, 72.0, uint8(12), uint8(20), uint8(32), 8, "topology_removed_background")

    var borderWarmReady bool = false
    var borderSawSlot0 bool = false
    var borderSawSlot1 bool = false
    var borderSawSlot0Clean bool = false
    var borderSawSlot1Clean bool = false
    var borderWarmupFrame int32 = 0
    while borderWarmupFrame < 12
      && (!borderSawSlot0Clean || !borderSawSlot1Clean) {
        WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
        borderWarmPrimitive = WindowReadbackTestFixture.PrimitiveFrameRetention(opened)
        if borderWarmPrimitive.RecordCount > 0 {
          let clean = !borderWarmPrimitive.FullUpload
            && borderWarmPrimitive.RecordCount >= 9
            && borderWarmPrimitive.WrittenBytes == 0uL
            && borderWarmPrimitive.SkippedBytes == borderWarmPrimitive.ByteCount
            && borderWarmPrimitive.DirtyRecordCount == 0
            && borderWarmPrimitive.UploadRangeCount == 0
            && borderWarmPrimitive.RetainedReuse
          == uint64(borderWarmPrimitive.RecordCount)
          if borderWarmPrimitive.SlotIndex == 0 {
            borderSawSlot0 = true
            if clean {
              borderSawSlot0Clean = true
            }
          } else if borderWarmPrimitive.SlotIndex == 1 {
            borderSawSlot1 = true
            if clean {
              borderSawSlot1Clean = true
            }
          }
        }
        borderWarmupFrame = borderWarmupFrame + 1
      }
    borderWarmReady = borderSawSlot0 && borderSawSlot1
      && borderSawSlot0Clean && borderSawSlot1Clean
    S14Require(borderWarmReady,
      "S15 border warm primitive expansion did not retain its clean records")
    borderWarmState = WindowReadbackTestFixture.SceneRetention(opened)

    root.MutateBorder()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    borderMutatedPrimitive = WindowReadbackTestFixture.PrimitiveFrameRetention(opened)
    S14Require(borderMutatedPrimitive.RecordCount == borderWarmPrimitive.RecordCount
        && borderMutatedPrimitive.ByteCount == borderWarmPrimitive.ByteCount
        && !borderMutatedPrimitive.FullUpload
        && borderMutatedPrimitive.RecordCount >= 9
        && borderMutatedPrimitive.DirtyRecordCount == 1
        && borderMutatedPrimitive.UploadRangeCount == 1
        && borderMutatedPrimitive.WrittenBytes == 128uL
        && borderMutatedPrimitive.SkippedBytes
      == borderMutatedPrimitive.ByteCount - 128uL
        && borderMutatedPrimitive.RetainedReuse
      == uint64(borderMutatedPrimitive.RecordCount - 1),
      "S15 one-edge border mutation did not upload one expanded solid-border record")
    borderMutationState = WindowReadbackTestFixture.SceneRetention(opened)
    let borderMutationTotal = borderMutationState.RetainedBorderTotalCount
    -borderWarmState.RetainedBorderTotalCount
    let borderMutationHits = borderMutationState.RetainedBorderHitCount
    -borderWarmState.RetainedBorderHitCount
    let borderMutationRebuilds = borderMutationState.RetainedBorderRebuildCount
    -borderWarmState.RetainedBorderRebuildCount
    let borderMutationInvalidations = borderMutationState.RetainedBorderInvalidationCount
    -borderWarmState.RetainedBorderInvalidationCount
    let borderMutationLeafTotal = borderMutationState.RetainedLeafTotalCount
    -borderWarmState.RetainedLeafTotalCount
    let borderMutationLeafHits = borderMutationState.RetainedLeafHitCount
    -borderWarmState.RetainedLeafHitCount
    S14Require(borderMutationTotal > 0uL
        && borderMutationRebuilds == 1uL
        && borderMutationHits == borderMutationTotal - 1uL
        && borderMutationInvalidations == 1uL
        && borderMutationState.RetainedBorderFallbackCount
      == borderWarmState.RetainedBorderFallbackCount
        && borderMutationLeafTotal > 0uL
        && borderMutationLeafHits == borderMutationLeafTotal
        && borderMutationState.RetainedLeafRebuildCount
      == borderWarmState.RetainedLeafRebuildCount
        && borderMutationState.RetainedLeafFallbackCount
      == borderWarmState.RetainedLeafFallbackCount
        && borderMutationState.RetainedLeafInvalidationCount
      == borderWarmState.RetainedLeafInvalidationCount
        && borderMutationState.RetainedParentBoxTotalCount
      > borderWarmState.RetainedParentBoxTotalCount
        && borderMutationState.RetainedParentBoxHitCount
      -borderWarmState.RetainedParentBoxHitCount
      == borderMutationState.RetainedParentBoxTotalCount
      -borderWarmState.RetainedParentBoxTotalCount
        && borderMutationState.RetainedParentBoxRebuildCount
      == borderWarmState.RetainedParentBoxRebuildCount
        && borderMutationState.RetainedParentBoxFallbackCount
      == borderWarmState.RetainedParentBoxFallbackCount
        && borderMutationState.RetainedParentBoxInvalidationCount
      == borderWarmState.RetainedParentBoxInvalidationCount,
      "S15 border color mutation did not isolate one exact border rebuild")
    S15RequireBorderPayload(borderMutationState, borderBounds, scaleX, scaleY, radiusScale,
      2.0, 3.0, 4.0, 5.0, 0.0, changedBorderTopColor, borderRightColor,
      borderBottomColor, borderLeftColor, solidBorderStyle, "mutated border")
    let borderDamageLeft = int32(Math.Floor(borderBounds.X * scaleX))
    let borderDamageTop = int32(Math.Floor(borderBounds.Y * scaleY))
    let borderDamageRight = int32(Math.Ceiling(
      (borderBounds.X + borderBounds.Width) * scaleX))
    let borderDamageBottom = int32(Math.Ceiling(
      (borderBounds.Y + borderBounds.Height) * scaleY))
    S14Require(borderMutationState.AcquiredImageState
        && borderMutationState.PartialRedraw
        && !borderMutationState.FullRedraw
        && borderMutationState.DamageWidth < metrics.FramebufferWidth
        && borderMutationState.DamageHeight < metrics.FramebufferHeight
        && borderMutationState.DamageX <= borderDamageLeft
        && borderMutationState.DamageY <= borderDamageTop
        && borderMutationState.DamageX + borderMutationState.DamageWidth
      >= borderDamageRight
        && borderMutationState.DamageY + borderMutationState.DamageHeight
      >= borderDamageBottom,
      "S15 border color mutation did not produce bounded acquired-image damage"
      +" acquired=" + borderMutationState.AcquiredImageState.ToString()
      +" partial=" + borderMutationState.PartialRedraw.ToString()
      +" full=" + borderMutationState.FullRedraw.ToString()
      +" sceneVersion=" + borderMutationState.SceneVersion.ToString()
      +" activeVersion=" + borderMutationState.ActiveSceneVersion.ToString()
      +" appliedVersion="
      +borderMutationState.ActiveAppliedSceneVersion.ToString()
      +" pendingVersion="
      +borderMutationState.ActivePendingSceneVersion.ToString()
      +" damageX=" + borderMutationState.DamageX.ToString()
      +" damageY=" + borderMutationState.DamageY.ToString()
      +" damageWidth=" + borderMutationState.DamageWidth.ToString()
      +" damageHeight=" + borderMutationState.DamageHeight.ToString()
      +" expectedX=" + borderDamageLeft.ToString()
      +" expectedY=" + borderDamageTop.ToString()
      +" expectedRight=" + borderDamageRight.ToString()
      +" expectedBottom=" + borderDamageBottom.ToString()
      +" framebufferWidth=" + metrics.FramebufferWidth.ToString()
      +" framebufferHeight=" + metrics.FramebufferHeight.ToString()
      +" dirty=" + borderMutationState.DirtyChunkCount.ToString()
      +" reused=" + borderMutationState.ReusedChunkCount.ToString())
    borderMutationResult = S09RReadback(opened, metrics)
    S09RRequirePixelNear(borderMutationResult!!.Pixels, borderMutationResult!!.Width, metrics,
      200.0, 9.0, uint8(248), uint8(196), uint8(48), 8, "mutated_border_top")
    S09RRequirePixelNear(borderMutationResult!!.Pixels, borderMutationResult!!.Width, metrics,
      230.0, 24.0, uint8(96), uint8(224), uint8(128), 8, "mutated_border_right")
    S09RRequirePixelNear(borderMutationResult!!.Pixels, borderMutationResult!!.Width, metrics,
      200.0, 38.0, uint8(72), uint8(144), uint8(232), 8, "mutated_border_bottom")
    S09RRequirePixelNear(borderMutationResult!!.Pixels, borderMutationResult!!.Width, metrics,
      170.0, 24.0, uint8(224), uint8(184), uint8(72), 8, "mutated_border_left")
    S15RequireOutsideStable(topologyRemoveResult!!.Pixels,
      borderMutationResult!!.Pixels, borderMutationResult!!.Width,
      borderMutationResult!!.Height, borderDamageLeft, borderDamageTop,
      borderDamageRight, borderDamageBottom)

    root.ToggleBorderUnsupportedFeature()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    borderUnsupportedState = WindowReadbackTestFixture.SceneRetention(opened)
    let borderFallbacks = borderUnsupportedState.RetainedBorderFallbackCount
    -borderMutationState.RetainedBorderFallbackCount
    let borderFallbackInvalidations = borderUnsupportedState.RetainedBorderInvalidationCount
    -borderMutationState.RetainedBorderInvalidationCount
    S14Require(borderFallbacks == 1uL
        && borderFallbackInvalidations == 1uL
        && borderUnsupportedState.AcquiredImageState
        && borderUnsupportedState.FullRedraw
        && !borderUnsupportedState.PartialRedraw
        && borderUnsupportedState.DamageWidth == metrics.FramebufferWidth
        && borderUnsupportedState.DamageHeight == metrics.FramebufferHeight,
      "S15 rounded border fallback did not force full acquired-image damage")
    S15RequireBorderPayload(borderUnsupportedState, borderBounds, scaleX, scaleY,
      radiusScale, 2.0, 3.0, 4.0, 5.0, 6.0, changedBorderTopColor,
      borderRightColor, borderBottomColor, borderLeftColor, solidBorderStyle,
      "rounded border fallback")

    root.ToggleBorderUnsupportedFeature()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    borderRecapturedState = WindowReadbackTestFixture.SceneRetention(opened)
    let borderRecapturedRebuilds = borderRecapturedState.RetainedBorderRebuildCount
    -borderUnsupportedState.RetainedBorderRebuildCount
    let borderRecapturedInvalidations = borderRecapturedState.RetainedBorderInvalidationCount
    -borderUnsupportedState.RetainedBorderInvalidationCount
    S14Require(borderRecapturedRebuilds == 1uL
        && borderRecapturedInvalidations == 0uL
        && borderRecapturedState.RetainedBorderFallbackCount
      == borderUnsupportedState.RetainedBorderFallbackCount,
      "S15 rounded border removal did not recapture the exact border leaf")
    S15RequireBorderPayload(borderRecapturedState, borderBounds, scaleX, scaleY,
      radiusScale, 2.0, 3.0, 4.0, 5.0, 0.0, changedBorderTopColor,
      borderRightColor, borderBottomColor, borderLeftColor, solidBorderStyle,
      "recaptured border")
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    borderWarmState = WindowReadbackTestFixture.SceneRetention(opened)
    let recapturedBorderTotal = borderWarmState.RetainedBorderTotalCount
    -borderRecapturedState.RetainedBorderTotalCount
    let recapturedBorderHits = borderWarmState.RetainedBorderHitCount
    -borderRecapturedState.RetainedBorderHitCount
    S14Require(recapturedBorderTotal > 0uL
        && recapturedBorderHits == recapturedBorderTotal
        && borderWarmState.RetainedBorderRebuildCount
      == borderRecapturedState.RetainedBorderRebuildCount
        && borderWarmState.RetainedBorderFallbackCount
      == borderRecapturedState.RetainedBorderFallbackCount
        && borderWarmState.RetainedBorderInvalidationCount
      == borderRecapturedState.RetainedBorderInvalidationCount,
      "S15 recaptured border leaf did not return to exact warm hits")
    S15RequireBorderPayload(borderWarmState, borderBounds, scaleX, scaleY, radiusScale,
      2.0, 3.0, 4.0, 5.0, 0.0, changedBorderTopColor, borderRightColor,
      borderBottomColor, borderLeftColor, solidBorderStyle, "recaptured warm border")

    root.MutateParentBox()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    parentMutatedState = WindowReadbackTestFixture.SceneRetention(opened)
    let parentMutationTotal = parentMutatedState.RetainedParentBoxTotalCount
    -borderWarmState.RetainedParentBoxTotalCount
    let parentMutationHits = parentMutatedState.RetainedParentBoxHitCount
    -borderWarmState.RetainedParentBoxHitCount
    let parentMutationRebuilds = parentMutatedState.RetainedParentBoxRebuildCount
    -borderWarmState.RetainedParentBoxRebuildCount
    let parentMutationInvalidations = parentMutatedState.RetainedParentBoxInvalidationCount
    -borderWarmState.RetainedParentBoxInvalidationCount
    let parentMutationLeafTotal = parentMutatedState.RetainedLeafTotalCount
    -borderWarmState.RetainedLeafTotalCount
    let parentMutationLeafHits = parentMutatedState.RetainedLeafHitCount
    -borderWarmState.RetainedLeafHitCount
    let parentMutationBorderTotal = parentMutatedState.RetainedBorderTotalCount
    -borderWarmState.RetainedBorderTotalCount
    let parentMutationBorderHits = parentMutatedState.RetainedBorderHitCount
    -borderWarmState.RetainedBorderHitCount
    S14Require(parentMutationTotal > 0uL
        && parentMutationRebuilds == 1uL
        && parentMutationInvalidations == 1uL
        && parentMutationHits == parentMutationTotal - 1uL
        && parentMutationLeafTotal > 0uL
        && parentMutationLeafHits == parentMutationLeafTotal
        && parentMutationBorderTotal > 0uL
        && parentMutationBorderHits == parentMutationBorderTotal
        && parentMutatedState.RetainedBorderRebuildCount
      == borderWarmState.RetainedBorderRebuildCount
        && parentMutatedState.RetainedBorderFallbackCount
      == borderWarmState.RetainedBorderFallbackCount
        && parentMutatedState.RetainedBorderInvalidationCount
      == borderWarmState.RetainedBorderInvalidationCount,
      "S15 parent mutation did not rebuild one own box and continue exact children")
    parentMutationResult = S09RReadback(opened, metrics)
    S09RRequirePixelNear(parentMutationResult!!.Pixels, parentMutationResult!!.Width, metrics,
      200.0, 72.0, uint8(18), uint8(30), uint8(48), 8, "parent_mutated_background")
    S09RRequirePixelNear(parentMutationResult!!.Pixels, parentMutationResult!!.Width, metrics,
      200.0, 9.0, uint8(248), uint8(196), uint8(48), 8, "recaptured_border_top")
    S09RRequirePixelNear(parentMutationResult!!.Pixels, parentMutationResult!!.Width, metrics,
      230.0, 24.0, uint8(96), uint8(224), uint8(128), 8, "recaptured_border_right")
    S09RRequirePixelNear(parentMutationResult!!.Pixels, parentMutationResult!!.Width, metrics,
      200.0, 38.0, uint8(72), uint8(144), uint8(232), 8, "recaptured_border_bottom")
    S09RRequirePixelNear(parentMutationResult!!.Pixels, parentMutationResult!!.Width, metrics,
      170.0, 24.0, uint8(224), uint8(184), uint8(72), 8, "recaptured_border_left")

    root.ToggleParentUnsupportedFeature()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    parentUnsupportedState = WindowReadbackTestFixture.SceneRetention(opened)
    let parentFallbacks = parentUnsupportedState.RetainedParentBoxFallbackCount
    -parentMutatedState.RetainedParentBoxFallbackCount
    let parentFallbackInvalidations = parentUnsupportedState.RetainedParentBoxInvalidationCount
    -parentMutatedState.RetainedParentBoxInvalidationCount
    let genericChildFallbacks = parentUnsupportedState.RetainedLeafFallbackCount
    -parentMutatedState.RetainedLeafFallbackCount
    let genericBorderFallbacks = parentUnsupportedState.RetainedBorderFallbackCount
    -parentMutatedState.RetainedBorderFallbackCount
    let genericBorderInvalidations = parentUnsupportedState.RetainedBorderInvalidationCount
    -parentMutatedState.RetainedBorderInvalidationCount
    S14Require(parentFallbacks == 1uL
        && parentFallbackInvalidations == 1uL
        && genericChildFallbacks == 4uL
        && genericBorderFallbacks == 1uL
        && genericBorderInvalidations == 1uL
        && parentUnsupportedState.MutatedSolidLeafFound
        && parentUnsupportedState.FullRedraw
        && !parentUnsupportedState.PartialRedraw,
      "S15 parent fallback did not continue through generic child compilation")

    root.ToggleParentUnsupportedFeature()
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    parentRecapturedState = WindowReadbackTestFixture.SceneRetention(opened)
    let parentRecapturedRebuilds = parentRecapturedState.RetainedParentBoxRebuildCount
    -parentUnsupportedState.RetainedParentBoxRebuildCount
    let parentRecapturedLeafRebuilds = parentRecapturedState.RetainedLeafRebuildCount
    -parentUnsupportedState.RetainedLeafRebuildCount
    let parentRecapturedBorderRebuilds = parentRecapturedState.RetainedBorderRebuildCount
    -parentUnsupportedState.RetainedBorderRebuildCount
    let parentRecapturedBorderInvalidations = parentRecapturedState.RetainedBorderInvalidationCount
    -parentUnsupportedState.RetainedBorderInvalidationCount
    S14Require(parentRecapturedRebuilds == 1uL
        && parentRecapturedLeafRebuilds == 4uL
        && parentRecapturedBorderRebuilds == 1uL
        && parentRecapturedBorderInvalidations == 0uL
        && parentRecapturedState.RetainedParentBoxFallbackCount
      == parentUnsupportedState.RetainedParentBoxFallbackCount
        && parentRecapturedState.RetainedParentBoxInvalidationCount
      == parentUnsupportedState.RetainedParentBoxInvalidationCount,
      "S15 parent fallback did not recapture the own box and children")

    finalState = mutatedState
    var frame int32 = 0
    while frame < 8 && finalState.ActiveAppliedSceneVersion == 0uL {
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      finalState = WindowReadbackTestFixture.SceneRetention(opened)
      frame = frame + 1
    }
    S14Require(finalState.AcquiredImageState
        && finalState.PromotedImageCount == 1u
        && finalState.ActiveAppliedSceneVersion > 0uL,
      "S15 acquired swapchain image scene version was never promoted")
    S14Require(finalState.PendingImageCount == 1u
        && finalState.ActivePendingSceneVersion == finalState.ActiveSceneVersion
        && finalState.PendingSceneVersion == finalState.ActiveSceneVersion,
      "S15 acquired image scene version was not left pending after presentation")
    S14Require(WindowReadbackTestFixture.RequestCount(opened) == 7uL
        && WindowReadbackTestFixture.CompletionCount(opened) == 7uL,
      "S15 readback lifecycle counts are incorrect")

    var clipFrame VulkanClipMaskRetentionTestSnapshot =
    WindowReadbackTestFixture.ClipMaskRetention(opened)
    var priorClipSlot int32 = -1
    var alternatedClipSlots bool = false
    var sawClipSlot0 bool = false
    var sawClipSlot1 bool = false
    var warmupBoundReady bool = false
    var warmupMappedWrites uint64 = 0uL
    var warmupFlushes uint64 = 0uL
    var clipWarmupFrame int32 = 0
    while clipWarmupFrame < 12
      && (!warmupBoundReady || !alternatedClipSlots || !clipFrame.Retained) {
        WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
        let nextClipFrame = WindowReadbackTestFixture.ClipMaskRetention(opened)
        if nextClipFrame.ByteCount > 0uL {
          if priorClipSlot >= 0 && priorClipSlot != nextClipFrame.SlotIndex {
            alternatedClipSlots = true
          }
          priorClipSlot = nextClipFrame.SlotIndex
          if nextClipFrame.SlotIndex == 0 {
            sawClipSlot0 = true
          } else if nextClipFrame.SlotIndex == 1 {
            sawClipSlot1 = true
          }
          if sawClipSlot0 && sawClipSlot1 && !warmupBoundReady {
            warmupBoundReady = true
            warmupMappedWrites = nextClipFrame.TotalMappedWrites
            warmupFlushes = nextClipFrame.TotalFlushes
          }
        }
        clipFrame = nextClipFrame
        clipWarmupFrame = clipWarmupFrame + 1
      }
    S14Require(warmupBoundReady && alternatedClipSlots
        && sawClipSlot0 && sawClipSlot1 && clipFrame.RetentionEligible
        && clipFrame.Retained && clipFrame.RetentionValid,
      "S15 clip frame slots did not alternate and retain the eligible payload")
    S14Require(clipFrame.WrittenBytes == 0uL
        && clipFrame.MappedWrites == 0uL
        && clipFrame.Flushes == 0uL
        && clipFrame.SkippedBytes == clipFrame.ByteCount
        && clipFrame.SkippedBytes > 0uL
        && clipFrame.RetainedReuse > 0uL
        && clipFrame.MaskCount == 0
        && clipFrame.ClipChainCount == 1
        && clipFrame.LayerCount == 0,
      "S15 retained clip frame payload evidence is invalid: slot="
      +clipFrame.SlotIndex.ToString() + " bytes="
      +clipFrame.ByteCount.ToString() + " skipped="
      +clipFrame.SkippedBytes.ToString())
    S14Require(clipFrame.TotalMappedWrites > 0uL
        && clipFrame.TotalFlushes > 0uL
        && clipFrame.TotalMappedWrites <= warmupMappedWrites
        && clipFrame.TotalFlushes <= warmupFlushes
        && clipFrame.TotalWrittenBytes > 0uL
        && clipFrame.TotalSkippedBytes > 0uL
        && clipFrame.TotalRetainedReuse > 0uL,
      "S15 clip frame cumulative retention evidence is invalid: mapped="
      +clipFrame.TotalMappedWrites.ToString() + " flushes="
      +clipFrame.TotalFlushes.ToString() + " warmupMapped="
      +warmupMappedWrites.ToString() + " warmupFlushes="
      +warmupFlushes.ToString())
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "S15 retained scene window did not close")
    S14Require(WindowReadbackTestFixture.ResidentResourceBytes(opened) == 0uL,
      "S15 retained scene readback resources remain resident after close")
  } finally {
    Console.SetError(originalError)
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  S14Require(!diagnostics.Contains("\"event\":325")
      && !diagnostics.Contains("\"event\":326"),
    "S15 retained scene emitted unsupported-scene diagnostics")
  let damageCount = S14Counter(diagnostics, "damageCount")
  let dirtyChunkCount = S14Counter(diagnostics, "dirtyChunkCount")
  let reusedChunkCount = S14Counter(diagnostics, "reusedChunkCount")
  let drawCount = S14Counter(diagnostics, "drawCount")
  let recordCount = S14Counter(diagnostics, "recordCount")
  let clipFrameWrittenBytes = S14Counter(diagnostics, "clipFrameWrittenBytes")
  let clipFrameSkippedBytes = S14Counter(diagnostics, "clipFrameSkippedBytes")
  let clipFrameMappedWrites = S14Counter(diagnostics, "clipFrameMappedWrites")
  let clipFrameFlushes = S14Counter(diagnostics, "clipFrameFlushes")
  let clipFrameRetainedReuse = S14Counter(diagnostics, "clipFrameRetainedReuse")
  let clipFrameRetained = S14Counter(diagnostics, "clipFrameRetained")
  S14Require(clipFrameWrittenBytes > 0uL
      && clipFrameSkippedBytes > 0uL
      && clipFrameMappedWrites > 0uL
      && clipFrameFlushes > 0uL
      && clipFrameRetainedReuse > 0uL
      && clipFrameRetained == 1uL,
    "S15 diagnostics did not emit clip payload retention evidence: written="
    +clipFrameWrittenBytes.ToString() + " skipped="
    +clipFrameSkippedBytes.ToString() + " mapped="
    +clipFrameMappedWrites.ToString() + " flushes="
    +clipFrameFlushes.ToString() + " reuse="
    +clipFrameRetainedReuse.ToString() + " retained="
    +clipFrameRetained.ToString())
  S14Require(damageCount >= 2uL && drawCount > 0uL && recordCount > 0uL
      && reusedChunkCount > 0uL,
    "S15 diagnostics did not retain render and damage evidence: damage="
    +damageCount.ToString() + " dirty=" + dirtyChunkCount.ToString()
    +" reused=" + reusedChunkCount.ToString() + " draw=" + drawCount.ToString()
    +" record=" + recordCount.ToString())
  Console.WriteLine("s15-retention-gate: first_use_full=1 box_mutation=1 partial_damage=1"
    +" parent_own_box=1"
    +" bounds_old_background=1 topology_add_full=1 topology_remove_full=1"
    +" exact_leaf_solid_rounded=1 exact_color_miss=1 exact_bounds_miss=1"
    +" exact_border_leaf=1"
    +" unsupported_fallback_recapture=1"
    +" primitive_first_full=1 primitive_slots=2 primitive_warm_copy_zero=1"
    +" primitive_staging_candidate=1"
    +" primitive_mutation_dirty=1 primitive_mutation_written="
    +mutatedPrimitive.WrittenBytes.ToString()
    +" primitive_topology_full=1 image_version_promotion=1 damageCount="
    +damageCount.ToString() + " dirtyChunkCount=" + dirtyChunkCount.ToString()
    +" reusedChunkCount=" + reusedChunkCount.ToString()
    +" drawCount=" + drawCount.ToString() + " recordCount="
    +recordCount.ToString() + " clipWritten="
    +clipFrameWrittenBytes.ToString() + " clipSkipped="
    +clipFrameSkippedBytes.ToString() + " clipMapped="
    +clipFrameMappedWrites.ToString() + " clipFlushes="
    +clipFrameFlushes.ToString() + " clipReuse="
    +clipFrameRetainedReuse.ToString() + " clipRetained="
    +clipFrameRetained.ToString() + " close=1")
}

func RunS09RPixelGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let root = S09RSmokeCell{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  var window Window? = nil
  var initialResult VulkanReadbackResult? = nil
  var scrolledResult VulkanReadbackResult? = nil
  try {
    let opened = Window{
      Title: "Goo S09R Vulkan pixel gate",
      Width: 400,
      Height: 220,
      VSync: false,
      Root: root,
    }
    window = opened
    Console.SetError(capturedError)
    opened.Open()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    var frame int32 = 0
    while frame < 8 {
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      frame = frame + 1
    }
    let metrics = WindowReadbackTestFixture.Metrics(opened)
    S14Require(metrics.LogicalWidth == 400 && metrics.LogicalHeight == 220,
      "S09R logical window metrics are incorrect")
    S14Require(S09RSmokeCell.Root.IsMounted
        && S09RSmokeCell.ScrollViewport.IsMounted
        && S09RSmokeCell.ScrollLeaf.IsMounted,
      "S09R pixel gate did not mount required handles")
    initialResult = S09RReadback(opened, metrics)
    let initialPixels = initialResult!!.Pixels
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      30.0, 25.0, uint8(42), uint8(112), uint8(188), 4, "solid")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      130.0, 25.0, uint8(82), uint8(176), uint8(112), 4, "rounded")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      95.0, 11.0, uint8(12), uint8(20), uint8(32), 4, "rounded_corner")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      215.0, 11.0, uint8(232), uint8(96), uint8(72), 6, "solid_border_top")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      249.0, 25.0, uint8(96), uint8(224), uint8(128), 6, "solid_border_right")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      215.0, 45.0, uint8(72), uint8(144), uint8(232), 6, "solid_border_bottom")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      181.0, 25.0, uint8(224), uint8(184), uint8(72), 6, "solid_border_left")
    S09RRequireBorderPattern(initialPixels, initialResult!!.Width, metrics,
      266, 318, "dashed border")
    S09RRequireBorderPattern(initialPixels, initialResult!!.Width, metrics,
      336, 388, "dotted border")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      15.0, 80.0, uint8(27), uint8(75), uint8(140), 10, "linear_gradient_start")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      50.0, 80.0, uint8(46), uint8(126), uint8(196), 8, "linear_gradient_mid")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      95.0, 80.0, uint8(83), uint8(163), uint8(203), 8, "linear_gradient_stop")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      125.0, 80.0, uint8(44), uint8(102), uint8(159), 10, "linear_gradient_end")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      200.0, 86.0, uint8(232), uint8(178), uint8(78), 8, "radial_gradient_center")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      145.0, 86.0, uint8(137), uint8(64), uint8(91), 14, "radial_gradient_edge")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      276.0, 64.0, uint8(24), uint8(42), uint8(72), 8, "transform_outer")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      290.0, 78.0, uint8(196), uint8(224), uint8(88), 8, "transform_inner")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      30.0, 148.0, uint8(52), uint8(196), uint8(112), 8, "scroll_leaf")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      105.0, 148.0, uint8(12), uint8(20), uint8(32), 8, "rect_clip")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      120.0, 155.0, uint8(12), uint8(20), uint8(32), 8, "hidden_leaf")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      202.0, 142.0, uint8(36), uint8(76), uint8(208), 8, "back_stack")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      220.0, 165.0, uint8(220), uint8(48), uint8(48), 8, "front_stack")
    S09RRequireBlended(initialPixels, initialResult!!.Width, metrics,
      160.0, 158.0, "opacity_leaf")
    let beforeOffset = S09RSmokeCell.ScrollViewport.ScrollOffset.X
    S14Require(S09RSmokeCell.ScrollViewport.ScrollTo(24.0, 0.0),
      "S09R scroll request was rejected")
    WindowReadbackTestFixture.ForceRender(opened, 0.05)
    let afterOffset = S09RSmokeCell.ScrollViewport.ScrollOffset.X
    S14Require(afterOffset > beforeOffset,
      "S09R scroll offset did not advance")
    scrolledResult = S09RReadback(opened, metrics)
    let scrolledPixels = scrolledResult!!.Pixels
    S09RRequirePixelDifferent(scrolledPixels, scrolledResult!!.Width, metrics,
      30.0, 148.0, uint8(52), uint8(196), uint8(112), 12, "scroll_leaf")
    S09RRequirePixelNear(scrolledPixels, scrolledResult!!.Width, metrics,
      12.0, 148.0, uint8(52), uint8(196), uint8(112), 12, "scroll_clip_sliver")
    S14Require(WindowReadbackTestFixture.RequestCount(opened) == 2uL
        && WindowReadbackTestFixture.CompletionCount(opened) == 2uL,
      "S09R readback lifecycle counts are incorrect")
    let residentBeforeClose = WindowReadbackTestFixture.ResidentResourceBytes(opened)
    S14Require(residentBeforeClose >= uint64(scrolledResult!!.Pixels.Length),
      "S09R readback resources are not resident before close")
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "S09R pixel gate window did not close")
    S14Require(WindowReadbackTestFixture.ResidentResourceBytes(opened) == 0uL,
      "S09R readback resources remain resident after close")
  } finally {
    Console.SetError(originalError)
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  S14Require(!diagnostics.Contains("\"event\":325")
      && !diagnostics.Contains("\"event\":326"),
    "S09R pixel gate emitted unsupported-scene diagnostics")
  let drawCount = S14Counter(diagnostics, "drawCount")
  let planCompileCount = S14Counter(diagnostics, "planCompileCount")
  let recordCount = S14Counter(diagnostics, "recordCount")
  let readbackCount = S14Counter(diagnostics, "readbackCount")
  S14Require(drawCount > 0uL && planCompileCount > 0uL && recordCount > 0uL
      && readbackCount == 2uL,
    "S09R pixel gate did not record the expected render and readback work")
  Console.WriteLine("s09r-pixel-gate: boxes=1 borders=solid,dashed,dotted gradients=2,4"
    +" transforms=1 clips=1 scroll=1 visibility=1 opacity=1 stacking=1"
    +" drawCount=" + drawCount.ToString()
    +" planCompileCount=" + planCompileCount.ToString()
    +" recordCount=" + recordCount.ToString()
    +" readbackCount=" + readbackCount.ToString() + " close=1")
}

func RunS14RoundedOverflowGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let fontPath = Path.Combine(AppContext.BaseDirectory, "VendSans-VariableFont_wght.ttf")
  S14Require(File.Exists(fontPath), "S14 text font asset is missing")
  let font = FontSource("S14GateFont", 400, false, File.ReadAllBytes(fontPath))
  font.Register()
  let root = S14RoundedOverflowCell{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  var window Window? = nil
  var initialResult VulkanReadbackResult? = nil
  var axisScrolledResult VulkanReadbackResult? = nil
  var verticalScrolledResult VulkanReadbackResult? = nil
  try {
    let opened = Window{
      Title: "Goo S14 mixed-axis clip gate",
      Width: 400,
      Height: 190,
      VSync: false,
      Root: root,
    }
    window = opened
    Console.SetError(capturedError)
    opened.Open()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    var frame int32 = 0
    while frame < 8 {
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      frame = frame + 1
    }
    let metrics = WindowReadbackTestFixture.Metrics(opened)
    S14Require(metrics.LogicalWidth == 400 && metrics.LogicalHeight == 190,
      "S14 mixed-axis clip logical window metrics are incorrect")
    S14Require(S14RoundedOverflowCell.Root.IsMounted
        && S14RoundedOverflowCell.HorizontalViewport.IsMounted
        && S14RoundedOverflowCell.HorizontalContent.IsMounted
        && S14RoundedOverflowCell.HorizontalStripe.IsMounted
        && S14RoundedOverflowCell.VerticalViewport.IsMounted
        && S14RoundedOverflowCell.VerticalContent.IsMounted
        && S14RoundedOverflowCell.VerticalStripe.IsMounted
        && S14RoundedOverflowCell.RoundedHidden.IsMounted
        && S14RoundedOverflowCell.RoundedText.IsMounted
        && S14RoundedOverflowCell.RoundedImage.IsMounted
        && S14RoundedOverflowCell.RoundedScroll.IsMounted
        && S14RoundedOverflowCell.RoundedScrollContent.IsMounted
        && S14RoundedOverflowCell.RoundedScrollStripe.IsMounted
        && S14RoundedOverflowCell.ClipOuter.IsMounted
        && S14RoundedOverflowCell.ClipInner.IsMounted
        && S14RoundedOverflowCell.TransformLeaf.IsMounted,
      "S14 mixed-axis clip gate did not mount required handles")
    S14Require(S14RoundedOverflowCell.HorizontalContent.BorderBox.Width
      > S14RoundedOverflowCell.HorizontalViewport.BorderBox.Width
        && S14RoundedOverflowCell.VerticalContent.BorderBox.Height
      > S14RoundedOverflowCell.VerticalViewport.BorderBox.Height
        && S14RoundedOverflowCell.RoundedScrollContent.BorderBox.Width
      > S14RoundedOverflowCell.RoundedScroll.BorderBox.Width,
      "S14 mixed-axis clip gate did not retain overflowing child geometry")
    initialResult = S09RReadback(opened, metrics)
    let initialPixels = initialResult!!.Pixels
    let horizontalBounds = S14RoundedOverflowCell.HorizontalViewport.BorderBox
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      horizontalBounds.X - 1.0, horizontalBounds.Y - 1.0,
      uint8(12), uint8(20), uint8(32), 8, "horizontal_background")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      68.0, 30.0, uint8(52), uint8(196), uint8(112), 8, "horizontal_initial")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      20.0, 70.0, uint8(52), uint8(196), uint8(112), 8, "horizontal_vertical_visible")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      180.0, 30.0, uint8(228), uint8(160), uint8(64), 8, "vertical_initial")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      268.0, 30.0, uint8(228), uint8(160), uint8(64), 8, "vertical_horizontal_visible")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      9.0, 85.0, uint8(12), uint8(20), uint8(32), 8, "rounded_hidden_top_left")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      130.0, 85.0, uint8(12), uint8(20), uint8(32), 8, "rounded_hidden_top_right")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      9.0, 178.0, uint8(12), uint8(20), uint8(32), 8, "rounded_hidden_bottom_left")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      130.0, 178.0, uint8(12), uint8(20), uint8(32), 8, "rounded_hidden_bottom_right")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      24.0, 130.0, uint8(228), uint8(64), uint8(72), 8, "rounded_hidden_center")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      91.0, 141.0, uint8(248), uint8(72), uint8(72), 28, "image_top_left")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      120.0, 166.0, uint8(236), uint8(196), uint8(72), 28, "image_bottom_right")
    S14RequireTextCoverage(initialPixels, initialResult!!.Width, metrics,
      18, 96, 98, 128, "rounded_text")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      149.0, 85.0, uint8(12), uint8(20), uint8(32), 8, "rounded_scroll_top_left")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      270.0, 85.0, uint8(12), uint8(20), uint8(32), 8, "rounded_scroll_top_right")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      149.0, 178.0, uint8(12), uint8(20), uint8(32), 8, "rounded_scroll_bottom_left")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      270.0, 178.0, uint8(12), uint8(20), uint8(32), 8, "rounded_scroll_bottom_right")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      210.0, 130.0, uint8(52), uint8(196), uint8(112), 8, "rounded_scroll_initial")
    let outerBounds = S14RoundedOverflowCell.ClipOuter.BorderBox
    let innerBounds = S14RoundedOverflowCell.ClipInner.BorderBox
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      290.0, 86.0, uint8(12), uint8(20), uint8(32), 8, "outer_clip_corner")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      outerBounds.X + outerBounds.Width * 0.30,
      outerBounds.Y + outerBounds.Height * 0.25,
      uint8(32), uint8(96), uint8(144), 12, "inner_clip_outside")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      innerBounds.X + innerBounds.Width * 0.25,
      innerBounds.Y + innerBounds.Height * 0.75,
      uint8(160), uint8(64), uint8(192), 16, "inner_clip_inside")
    S09RRequirePixelNear(initialPixels, initialResult!!.Width, metrics,
      340.0, 130.0, uint8(236), uint8(196), uint8(72), 24, "transformed_leaf")
    let horizontalBefore = S14RoundedOverflowCell.HorizontalViewport.ScrollOffset.X
    let roundedBefore = S14RoundedOverflowCell.RoundedScroll.ScrollOffset.X
    S14Require(S14RoundedOverflowCell.HorizontalViewport.ScrollTo(80.0, 0.0),
      "S14 horizontal scroll request was rejected")
    S14Require(S14RoundedOverflowCell.RoundedScroll.ScrollTo(80.0, 0.0),
      "S14 rounded scroll request was rejected")
    WindowReadbackTestFixture.ForceRender(opened, 0.05)
    let horizontalAfter = S14RoundedOverflowCell.HorizontalViewport.ScrollOffset.X
    let roundedAfter = S14RoundedOverflowCell.RoundedScroll.ScrollOffset.X
    S14Require(horizontalAfter > horizontalBefore && roundedAfter > roundedBefore,
      "S14 horizontal scroll offsets did not advance")
    axisScrolledResult = S09RReadback(opened, metrics)
    let axisScrolledPixels = axisScrolledResult!!.Pixels
    let horizontalViewportBoundsAfter = S14RoundedOverflowCell.HorizontalViewport.BorderBox
    let horizontalStripeBoundsAfter = S14RoundedOverflowCell.HorizontalStripe.BorderBox
    let horizontalStripeSampleX = if horizontalStripeBoundsAfter.X
    > horizontalViewportBoundsAfter.X{
      horizontalStripeBoundsAfter.X + 4.0
    } else {
      horizontalViewportBoundsAfter.X + 4.0
    }
    let horizontalStripeSampleY = horizontalViewportBoundsAfter.Y
    +horizontalViewportBoundsAfter.Height * 0.5
    let roundedStripeBoundsAfter = S14RoundedOverflowCell.RoundedScrollStripe.BorderBox
    let roundedViewportBoundsAfter = S14RoundedOverflowCell.RoundedScroll.BorderBox
    let roundedStripeSampleX = if roundedStripeBoundsAfter.X
    > roundedViewportBoundsAfter.X{
      roundedStripeBoundsAfter.X + 4.0
    } else {
      roundedViewportBoundsAfter.X + 4.0
    }
    let roundedStripeSampleY = roundedViewportBoundsAfter.Y
    +roundedViewportBoundsAfter.Height * 0.5
    S09RRequirePixelNear(axisScrolledPixels, axisScrolledResult!!.Width, metrics,
      horizontalStripeSampleX, horizontalStripeSampleY,
      uint8(72), uint8(128), uint8(224), 8, "horizontal_scrolled")
    S09RRequirePixelNear(axisScrolledPixels, axisScrolledResult!!.Width, metrics,
      20.0, 70.0, uint8(52), uint8(196), uint8(112), 8, "horizontal_y_visible_after")
    S09RRequirePixelNear(axisScrolledPixels, axisScrolledResult!!.Width, metrics,
      roundedStripeSampleX, roundedStripeSampleY,
      uint8(72), uint8(128), uint8(224), 8, "rounded_scroll_after")
    let verticalBefore = S14RoundedOverflowCell.VerticalViewport.ScrollOffset.Y
    S14Require(S14RoundedOverflowCell.VerticalViewport.ScrollTo(0.0, 80.0),
      "S14 vertical scroll request was rejected")
    WindowReadbackTestFixture.ForceRender(opened, 0.05)
    let verticalAfter = S14RoundedOverflowCell.VerticalViewport.ScrollOffset.Y
    S14Require(verticalAfter > verticalBefore,
      "S14 vertical scroll offset did not advance")
    verticalScrolledResult = S09RReadback(opened, metrics)
    let verticalScrolledPixels = verticalScrolledResult!!.Pixels
    let verticalViewportBoundsAfter = S14RoundedOverflowCell.VerticalViewport.BorderBox
    let verticalStripeBoundsAfter = S14RoundedOverflowCell.VerticalStripe.BorderBox
    let verticalStripeSampleX = verticalViewportBoundsAfter.X
    +verticalViewportBoundsAfter.Width * 0.5
    let verticalStripeSampleY = if verticalStripeBoundsAfter.Y
    > verticalViewportBoundsAfter.Y{
      verticalStripeBoundsAfter.Y + 4.0
    } else {
      verticalViewportBoundsAfter.Y + 4.0
    }
    S09RRequirePixelNear(verticalScrolledPixels, verticalScrolledResult!!.Width, metrics,
      verticalStripeSampleX, verticalStripeSampleY,
      uint8(196), uint8(88), uint8(200), 8, "vertical_scrolled")
    S09RRequirePixelNear(verticalScrolledPixels, verticalScrolledResult!!.Width, metrics,
      268.0, 30.0, uint8(228), uint8(160), uint8(64), 8, "vertical_x_visible_after")
    S14Require(WindowReadbackTestFixture.RequestCount(opened) == 3uL
        && WindowReadbackTestFixture.CompletionCount(opened) == 3uL,
      "S14 rounded overflow readback lifecycle counts are incorrect")
    let residentBeforeClose = WindowReadbackTestFixture.ResidentResourceBytes(opened)
    S14Require(residentBeforeClose >= uint64(verticalScrolledResult!!.Pixels.Length),
      "S14 rounded overflow readback resources are not resident before close")
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "S14 rounded overflow gate window did not close")
    S14Require(WindowReadbackTestFixture.ResidentResourceBytes(opened) == 0uL,
      "S14 rounded overflow readback resources remain resident after close")
  } finally {
    Console.SetError(originalError)
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
    font.Dispose()
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  S14Require(!diagnostics.Contains("\"event\":325")
      && !diagnostics.Contains("\"event\":326"),
    "S14 mixed-axis clip gate emitted unsupported-scene diagnostics")
  let drawCount = S14Counter(diagnostics, "drawCount")
  let planCompileCount = S14Counter(diagnostics, "planCompileCount")
  let recordCount = S14Counter(diagnostics, "recordCount")
  let readbackCount = S14Counter(diagnostics, "readbackCount")
  S14Require(drawCount > 0uL && planCompileCount > 0uL && recordCount > 0uL
      && readbackCount == 3uL,
    "S14 mixed-axis clip gate did not record expected render and readback work")
  Console.WriteLine("s14-mixed-axis-clip-gate: horizontal=1 vertical=1 nested_clip=1"
    +" transform=1 text=1 image=1 rounded_hidden=1 rounded_scroll=1 corners=8"
    +" readbackCount=" + readbackCount.ToString()
    +" drawCount=" + drawCount.ToString()
    +" planCompileCount=" + planCompileCount.ToString()
    +" recordCount=" + recordCount.ToString() + " close=1")
}

func RunS14EffectsGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let fontPath = Path.Combine(AppContext.BaseDirectory, "VendSans-VariableFont_wght.ttf")
  let colorFontPath = Path.Combine(AppContext.BaseDirectory, "HarfBuzz-chromacheck-colr.ttf")
  S14Require(File.Exists(fontPath), "S14 effects text font asset is missing")
  S14Require(File.Exists(colorFontPath), "S14 effects color font asset is missing")
  let font = FontSource("S14GateFont", 400, false, File.ReadAllBytes(fontPath))
  let colorFont = FontSource("S14Color", 400, false, File.ReadAllBytes(colorFontPath))
  font.Register()
  colorFont.Register()
  let root = S14EffectsCell{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  var window Window? = nil
  var firstResult VulkanReadbackResult? = nil
  var secondResult VulkanReadbackResult? = nil
  try {
    let opened = Window{
      Title: "Goo S14 Vulkan effects gate",
      Width: 440,
      Height: 270,
      VSync: false,
      Root: root,
    }
    window = opened
    Console.SetError(capturedError)
    opened.Open()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    var frame int32 = 0
    while frame < 8 {
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      frame = frame + 1
    }
    let metrics = WindowReadbackTestFixture.Metrics(opened)
    S14Require(metrics.LogicalWidth == 440 && metrics.LogicalHeight == 270,
      "S14 effects logical window metrics are incorrect")
    S14Require(S14EffectsCell.Root.IsMounted
        && S14EffectsCell.ShadowContainer.IsMounted
        && S14EffectsCell.ShadowButton.IsMounted
        && S14EffectsCell.ShapeShadow.IsMounted
        && S14EffectsCell.GroupOuter.IsMounted
        && S14EffectsCell.GroupInner.IsMounted
        && S14EffectsCell.ClipViewport.IsMounted
        && S14EffectsCell.ClipLeaf.IsMounted
        && S14EffectsCell.ColorGlyph.IsMounted
        && S14EffectsCell.BlendMultiply.IsMounted
        && S14EffectsCell.BlendScreen.IsMounted
        && S14EffectsCell.BlendOverlay.IsMounted
        && S14EffectsCell.BlendDifference.IsMounted,
      "S14 effects gate did not mount required handles")
    S14Require(S14EffectsCell.ShadowContainer.BorderBox.Width == 112.0
        && S14EffectsCell.ShadowButton.BorderBox.Height == 88.0
        && S14EffectsCell.GroupOuter.BorderBox.Width == 154.0
        && S14EffectsCell.ClipViewport.BorderBox.Height == 112.0,
      "S14 effects gate retained incorrect geometry")
    firstResult = S09RReadback(opened, metrics)
    let firstPixels = firstResult!!.Pixels
    S09RRequirePixelNear(firstPixels, firstResult!!.Width, metrics,
      70.0, 60.0, uint8(44), uint8(92), uint8(132), 20, "container_fill")
    S09RRequirePixelNear(firstPixels, firstResult!!.Width, metrics,
      200.0, 60.0, uint8(36), uint8(116), uint8(84), 20, "button_fill")
    S09RRequirePixelDifferent(firstPixels, firstResult!!.Width, metrics,
      130.0, 76.0, uint8(12), uint8(20), uint8(32), 18, "container_outer_shadow")
    S09RRequirePixelDifferent(firstPixels, firstResult!!.Width, metrics,
      200.0, 108.0, uint8(12), uint8(20), uint8(32), 2, "button_outer_shadow")
    S09RRequirePixelDifferent(firstPixels, firstResult!!.Width, metrics,
      18.0, 60.0, uint8(44), uint8(92), uint8(132), 16, "container_inset_shadow")
    S09RRequirePixelDifferent(firstPixels, firstResult!!.Width, metrics,
      128.0, 119.0, uint8(12), uint8(20), uint8(32), 12, "shape_outer_shadow")
    S09RRequirePixelDifferent(firstPixels, firstResult!!.Width, metrics,
      70.0, 108.0, uint8(72), uint8(128), uint8(224), 12, "shape_inset_shadow")
    S09RRequirePixelNear(firstPixels, firstResult!!.Width, metrics,
      70.0, 9.0, uint8(232), uint8(196), uint8(72), 48, "container_outline")
    let groupPixel = S09RLogicalPixel(firstPixels, firstResult!!.Width, metrics, 286.0, 42.0)
    S14Require(groupPixel[0] > uint8(70) && groupPixel[2] < uint8(170),
      "S14 group opacity outer paint is missing: " + S09RPixelText(groupPixel))
    let groupOverlap = S09RLogicalPixel(firstPixels, firstResult!!.Width, metrics, 330.0, 60.0)
    S14Require(groupOverlap[2] > groupOverlap[0]
        && groupOverlap[2] > uint8(48) && groupOverlap[0] > uint8(12),
      "S14 nested group opacity overlap is incorrect: " + S09RPixelText(groupOverlap))
    S09RRequirePixelNear(firstPixels, firstResult!!.Width, metrics,
      15.0, 133.0, uint8(12), uint8(20), uint8(32), 20, "clip_corner")
    let clipPixel = S09RLogicalPixel(firstPixels, firstResult!!.Width, metrics, 72.0, 188.0)
    S14Require(clipPixel[0] > uint8(120) && clipPixel[1] > uint8(100)
        && clipPixel[2] < uint8(140),
      "S14 transformed clip leaf is missing: " + S09RPixelText(clipPixel))
    S14RequireColorCoverage(firstPixels, firstResult!!.Width, metrics,
      178, 144, 274, 230, "colr")
    S09RRequirePixelDifferent(firstPixels, firstResult!!.Width, metrics,
      310.0, 110.0, uint8(13), uint8(20), uint8(32), 2, "blurred_text_shadow")
    S09RRequirePixelDifferent(firstPixels, firstResult!!.Width, metrics,
      270.0, 123.0, uint8(12), uint8(20), uint8(32), 8, "text_box_shadow")
    let multiplyPixel = S09RLogicalPixel(firstPixels, firstResult!!.Width, metrics, 44.0, 254.0)
    let screenPixel = S09RLogicalPixel(firstPixels, firstResult!!.Width, metrics, 150.0, 254.0)
    let overlayPixel = S09RLogicalPixel(firstPixels, firstResult!!.Width, metrics, 256.0, 254.0)
    let differencePixel = S09RLogicalPixel(firstPixels, firstResult!!.Width, metrics, 362.0, 254.0)
    S14Require(multiplyPixel[0] > uint8(40)
        && multiplyPixel[2] > uint8(40)
        && Math.Abs(int32(multiplyPixel[0]) - int32(multiplyPixel[2])) <= 8
        && screenPixel[0] > multiplyPixel[0]
        && overlayPixel[2] > uint8(40)
        && differencePixel[0] > uint8(70),
      "S14 blend overlap matrix is incorrect: multiply=" + S09RPixelText(multiplyPixel)
      +" screen=" + S09RPixelText(screenPixel)
      +" overlay=" + S09RPixelText(overlayPixel)
      +" difference=" + S09RPixelText(differencePixel))
    WindowReadbackTestFixture.ForceRender(opened, 0.05)
    secondResult = S09RReadback(opened, metrics)
    S14Require(secondResult!!.Pixels.Length == firstResult!!.Pixels.Length,
      "S14 effects repeated readback extent changed")
    S14Require(WindowReadbackTestFixture.RequestCount(opened) == 2uL
        && WindowReadbackTestFixture.CompletionCount(opened) == 2uL,
      "S14 effects readback lifecycle counts are incorrect")
    let residentBeforeClose = WindowReadbackTestFixture.ResidentResourceBytes(opened)
    S14Require(residentBeforeClose >= uint64(secondResult!!.Pixels.Length),
      "S14 effects readback resources are not resident before close")
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "S14 effects gate window did not close")
    S14Require(WindowReadbackTestFixture.ResidentResourceBytes(opened) == 0uL,
      "S14 effects resources remain resident after close")
  } finally {
    Console.SetError(originalError)
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
    colorFont.Dispose()
    font.Dispose()
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  S14Require(!diagnostics.Contains("\"event\":325")
      && !diagnostics.Contains("\"event\":326"),
    "S14 effects gate emitted unsupported-scene diagnostics")
  let drawCount = S14Counter(diagnostics, "drawCount")
  let planCompileCount = S14Counter(diagnostics, "planCompileCount")
  let recordCount = S14Counter(diagnostics, "recordCount")
  let readbackCount = S14Counter(diagnostics, "readbackCount")
  let layerPassCount = S14Counter(diagnostics, "layerPoolPassCount")
  let layerCompositeCount = S14Counter(diagnostics, "layerPoolCompositeCount")
  let layerCreateCount = S14Counter(diagnostics, "layerPoolCreateCount")
  let layerFailureCount = S14Counter(diagnostics, "layerPoolFailureCount")
  let layerPressureFailureCount = S14Counter(diagnostics, "layerPoolPressureFailureCount")
  let layerResidentBytes = S14Counter(diagnostics, "layerPoolResidentBytes")
  let layerTargetCount = S14Counter(diagnostics, "layerPoolTargetCount")
  let layerLeasedCount = S14Counter(diagnostics, "layerPoolLeasedCount")
  S14Require(drawCount > 0uL && planCompileCount > 0uL && recordCount > 0uL
      && readbackCount == 2uL,
    "S14 effects gate did not record expected render and readback work")
  S14Require(layerPassCount > 0uL && layerCompositeCount > 0uL && layerCreateCount > 0uL,
    "S14 effects gate did not record layer pass lifecycle")
  S14Require(layerFailureCount == 0uL && layerPressureFailureCount == 0uL,
    "S14 effects gate recorded a layer pool failure")
  S14Require(layerResidentBytes == 0uL && layerTargetCount == 0uL && layerLeasedCount == 0uL,
    "S14 effects gate left layer pool resources resident after close")
  Console.WriteLine("s14-effects-gate: shadows=container,button,text,shape,outer,inset,stacked=1"
    +" text_shadow_blur=plain,colr=1 outline=1 group_opacity=nested=1"
    +" blend=multiply,screen,overlay,difference=1"
    +" clip=rounded,arbitrary transform=1 colr=1 readbackCount=" + readbackCount.ToString()
    +" layerPassCount=" + layerPassCount.ToString()
    +" layerCompositeCount=" + layerCompositeCount.ToString()
    +" layerCreateCount=" + layerCreateCount.ToString()
    +" drawCount=" + drawCount.ToString()
    +" planCompileCount=" + planCompileCount.ToString()
    +" recordCount=" + recordCount.ToString() + " close=1")
}

func S17ValidateVisual(result VulkanReadbackResult, metrics WindowMetrics) {
  let first = S17ProtectedTextCell.Entry.BorderBox
  let second = S17ProtectedTextCell.Control.BorderBox
  let firstX = int32(Math.Round(first.X * metrics.DisplayScaleX))
  let firstY = int32(Math.Round(first.Y * metrics.DisplayScaleY))
  let secondX = int32(Math.Round(second.X * metrics.DisplayScaleX))
  let secondY = int32(Math.Round(second.Y * metrics.DisplayScaleY))
  let width = int32(Math.Round(first.Width * metrics.DisplayScaleX))
  let height = int32(Math.Round(first.Height * metrics.DisplayScaleY))
  let rowWidth = int32(result.Width)
  var coverage int32
  var y int32
  while y < height {
    var x int32
    while x < width {
      let firstIndex = ((firstY + y) * rowWidth + firstX + x) * 4
      let secondIndex = ((secondY + y) * rowWidth + secondX + x) * 4
      var channel int32
      while channel < 4 {
        if Math.Abs(int32(result.Pixels[firstIndex + channel])
          -int32(result.Pixels[secondIndex + channel])) > 1 {
            throw InvalidOperationException("S17 protected Vulkan presentation differs from its mask")
          }
        channel++
      }
      if Math.Abs(int32(result.Pixels[firstIndex]) - 12) > 8
        || Math.Abs(int32(result.Pixels[firstIndex + 1]) - 20) > 8
        || Math.Abs(int32(result.Pixels[firstIndex + 2]) - 32) > 8 {
          coverage++
        }
      x++
    }
    y++
  }
  S14Require(coverage > 20, "S17 protected Vulkan presentation has no glyph coverage")
}

func S17HasAction(node AccessibilityNode, expected AccessibilityAction) bool {
  for action in node.Actions {
    if action == expected { return true }
  }
  return false
}

func S17Advance(window Window, duration float64) {
  var elapsed = 0.0
  while elapsed < duration {
    let step = Math.Min(1.0 / 30.0, duration - elapsed)
    WindowReadbackTestFixture.ForceRender(window, step)
    elapsed = elapsed + step
  }
}

func RunS17CoreBehaviorGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let cell = S17CoreBehaviorCell{}
  let adapter = S17AccessibilityAdapter{}
  let window = Window{ Root: cell, Width: 320, Height: 176, VSync: false }
  let capturedError = StringWriter()
  let originalError = Console.Error
  try {
    Console.SetError(capturedError)
    window.AccessibilityAdapter = adapter
    window.Open()
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    WindowReadbackTestFixture.ForceRender(window, 0.0166666666666667)
    S14Require(S17CoreBehaviorCell.Target.IsMounted
        && S17CoreBehaviorCell.ScrollViewport.IsMounted
        && S17CoreBehaviorCell.ScrollLeaf.IsMounted
        && S17CoreBehaviorCell.MotionBox.IsMounted,
      "S17 core behavior handles did not mount")
    let metrics = WindowReadbackTestFixture.Metrics(window)
    let target = S17CoreBehaviorCell.Target.BorderBox
    let targetX = target.X + target.Width * 0.5
    let targetY = target.Y + target.Height * 0.5
    let borderX = target.X + 1.0
    let initial = S09RReadback(window, metrics)
    S09RRequirePixelNear(initial.Pixels, initial.Width, metrics, targetX, targetY,
      uint8(208), uint8(48), uint8(64), 3, "S17 base state")
    guard let initialSemantic = adapter.Tree?.Root else {
      throw InvalidOperationException("S17 core semantic node is missing")
    }
    S14Require(initialSemantic.Role == AccessibilityRole.Button
        && initialSemantic.Name == "S17 action"
        && !initialSemantic.Disabled
        && !initialSemantic.Focused
        && S17HasAction(initialSemantic, AccessibilityAction.Focus)
        && S17HasAction(initialSemantic, AccessibilityAction.Activate),
      "S17 core semantic contract is incorrect")

    WindowReadbackTestFixture.S17QueuePointerMove(window, targetX, targetY)
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S17Advance(window, 0.05)
    let hoverMid = S09RReadback(window, metrics)
    let hoverMidPixel = S09RLogicalPixel(hoverMid.Pixels, hoverMid.Width, metrics,
      targetX, targetY)
    S14Require(!S09RNear(hoverMidPixel, uint8(208), uint8(48), uint8(64), 3)
        && !S09RNear(hoverMidPixel, uint8(48), uint8(208), uint8(96), 3),
      "S17 hover transition did not produce an intermediate frame: "
      +S09RPixelText(hoverMidPixel))
    S17Advance(window, 0.06)
    let hovered = S09RReadback(window, metrics)
    S09RRequirePixelNear(hovered.Pixels, hovered.Width, metrics, targetX, targetY,
      uint8(48), uint8(208), uint8(96), 3, "S17 hover state")
    S14Require(cell.PointerEnterCount == 1 && cell.PointerLeaveCount == 0,
      "S17 pointer hover lifecycle is incorrect")

    WindowReadbackTestFixture.S17QueuePointerPress(window, targetX, targetY)
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S17Advance(window, 0.11)
    let active = S09RReadback(window, metrics)
    S09RRequirePixelNear(active.Pixels, active.Width, metrics, targetX, targetY,
      uint8(64), uint8(96), uint8(232), 3, "S17 active state")
    S09RRequirePixelNear(active.Pixels, active.Width, metrics, borderX, targetY,
      uint8(248), uint8(196), uint8(48), 3, "S17 focus state")
    S14Require(cell.PointerDownCount == 1 && cell.FocusCount == 1,
      "S17 pointer press or focus callback is incorrect")
    guard let focusedSemantic = adapter.Tree?.Root else {
      throw InvalidOperationException("S17 focused semantic node is missing")
    }
    S14Require(focusedSemantic.Focused, "S17 semantic focus state is incorrect")

    WindowReadbackTestFixture.S17QueuePointerRelease(window, targetX, targetY)
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S17Advance(window, 0.11)
    let released = S09RReadback(window, metrics)
    S09RRequirePixelNear(released.Pixels, released.Width, metrics, targetX, targetY,
      uint8(48), uint8(208), uint8(96), 3, "S17 released hover state")
    S14Require(cell.PointerUpCount == 1 && cell.ClickCount == 1,
      "S17 pointer release or activation callback is incorrect")

    WindowReadbackTestFixture.S17QueueKeyPress(window, Key.Enter)
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S17Advance(window, 0.11)
    let keyboardActive = S09RReadback(window, metrics)
    S09RRequirePixelNear(keyboardActive.Pixels, keyboardActive.Width, metrics,
      targetX, targetY, uint8(64), uint8(96), uint8(232), 3,
      "S17 keyboard active state")
    S14Require(cell.KeyDownCount == 1 && cell.ClickCount == 2,
      "S17 keyboard press or activation callback is incorrect")
    WindowReadbackTestFixture.S17QueueKeyRelease(window, Key.Enter)
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S17Advance(window, 0.11)
    S14Require(cell.KeyUpCount == 1, "S17 keyboard release callback is incorrect")

    guard let actionSemantic = adapter.Tree?.Root else {
      throw InvalidOperationException("S17 action semantic node is missing")
    }
    S14Require(window.PerformAccessibilityAction(actionSemantic.Id,
      AccessibilityActionRequest(AccessibilityAction.Activate))
        && cell.ClickCount == 3,
      "S17 neutral activation did not route through public behavior")
    WindowReadbackTestFixture.ForceRender(window, 0.0)

    WindowReadbackTestFixture.S17QueuePointerMove(window, 300.0, 168.0)
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S17Advance(window, 0.11)
    let focused = S09RReadback(window, metrics)
    S09RRequirePixelNear(focused.Pixels, focused.Width, metrics, targetX, targetY,
      uint8(208), uint8(48), uint8(64), 3, "S17 focus-only background")
    S09RRequirePixelNear(focused.Pixels, focused.Width, metrics, borderX, targetY,
      uint8(248), uint8(196), uint8(48), 3, "S17 retained focus state")
    S14Require(cell.PointerLeaveCount == 1, "S17 pointer leave callback is incorrect")

    let scrollBefore = S17CoreBehaviorCell.ScrollLeaf.BorderBox
    let scrollViewport = S17CoreBehaviorCell.ScrollViewport.BorderBox
    WindowReadbackTestFixture.S17QueueWheel(window,
      scrollViewport.X + scrollViewport.Width * 0.5,
      scrollViewport.Y + scrollViewport.Height * 0.5, 0.0, -1.0)
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S17Advance(window, 0.05)
    let scrollAfter = S17CoreBehaviorCell.ScrollLeaf.BorderBox
    S14Require(cell.ScrollWheelCount == 1
        && S17CoreBehaviorCell.ScrollViewport.ScrollOffset.Y > 0.0
        && scrollAfter.Y < scrollBefore.Y,
      "S17 wheel input did not move the public scroll state")

    let motionBefore = S17CoreBehaviorCell.MotionBox.BorderBox.X
    cell.StartMotion()
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S17Advance(window, 0.09)
    let motionMid = S17CoreBehaviorCell.MotionBox.BorderBox.X
    S17Advance(window, 0.10)
    let motionAfter = S17CoreBehaviorCell.MotionBox.BorderBox.X
    S14Require(motionMid > motionBefore && motionMid < motionBefore + 64.0
        && Math.Abs(motionAfter - (motionBefore + 64.0)) <= 0.01
        && !cell.MotionRunning,
      "S17 motion did not advance and settle through public geometry")

    cell.DisableTarget()
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S17Advance(window, 0.11)
    let disabled = S09RReadback(window, metrics)
    S09RRequirePixelNear(disabled.Pixels, disabled.Width, metrics, targetX, targetY,
      uint8(112), uint8(120), uint8(132), 3, "S17 disabled state")
    S14Require(cell.BlurCount == 1 && !S17CoreBehaviorCell.Target.Focus(),
      "S17 disabled target retained or accepted focus")
    guard let disabledSemantic = adapter.Tree?.Root else {
      throw InvalidOperationException("S17 disabled semantic node is missing")
    }
    S14Require(disabledSemantic.Disabled && !disabledSemantic.Focused
        && disabledSemantic.Actions.Count == 0,
      "S17 disabled semantic state is incorrect")

    let blockedDown = cell.PointerDownCount
    let blockedUp = cell.PointerUpCount
    let blockedClick = cell.ClickCount
    let blockedKeyDown = cell.KeyDownCount
    let blockedKeyUp = cell.KeyUpCount
    let blockedWheel = cell.TargetWheelCount
    WindowReadbackTestFixture.S17QueuePointerMove(window, targetX, targetY)
    WindowReadbackTestFixture.S17QueuePointerPress(window, targetX, targetY)
    WindowReadbackTestFixture.S17QueuePointerRelease(window, targetX, targetY)
    WindowReadbackTestFixture.S17QueueWheel(window, targetX, targetY, 0.0, -1.0)
    WindowReadbackTestFixture.S17QueueKeyPress(window, Key.Enter)
    WindowReadbackTestFixture.S17QueueKeyRelease(window, Key.Enter)
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S14Require(cell.PointerDownCount == blockedDown
        && cell.PointerUpCount == blockedUp
        && cell.ClickCount == blockedClick
        && cell.KeyDownCount == blockedKeyDown
        && cell.KeyUpCount == blockedKeyUp
        && cell.TargetWheelCount == blockedWheel,
      "S17 disabled target accepted input")

    window.RequestClose()
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S14Require(!window.IsOpen, "S17 core behavior gate window did not close")
    S14Require(WindowReadbackTestFixture.ResidentResourceBytes(window) == 0uL,
      "S17 core behavior readback resources remain resident after close")
  } finally {
    if window.IsOpen {
      window.RequestClose()
      WindowReadbackTestFixture.ForceRender(window, 0.0)
    }
    Console.SetError(originalError)
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  S14Require(!diagnostics.Contains("\"event\":325")
      && !diagnostics.Contains("\"event\":326"),
    "S17 core behavior gate emitted unsupported-scene diagnostics")
  Console.WriteLine("s17-core-behavior-gate: pointer=1 focus=1 hover=1 active=1 disabled=1"
    +" keyboard=1 wheel=1 scroll=1 motion=1 transitions=1 handles=1 semantics=1 close=1")
}

func RunS17ProtectedTextGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let fontPath = Path.Combine(AppContext.BaseDirectory, "VendSans-VariableFont_wght.ttf")
  S14Require(File.Exists(fontPath), "S17 text font asset is missing")
  let font = FontSource("S17GateFont", 400, false, File.ReadAllBytes(fontPath))
  font.Register()
  let source = "a\u0301👨‍👩‍👧‍👦b"
  let cell = S17ProtectedTextCell{}
  let adapter = S17AccessibilityAdapter{}
  let window = Window{ Root: cell, Width: 320, Height: 96, VSync: false }
  let capturedError = StringWriter()
  let originalError = Console.Error
  var originalClipboard = ""
  var clipboardChanged bool
  try {
    Console.SetError(capturedError)
    window.AccessibilityAdapter = adapter
    window.Open()
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    WindowReadbackTestFixture.ForceRender(window, 0.0166666666666667)
    S14Require(S17ProtectedTextCell.Entry.IsMounted && S17ProtectedTextCell.Control.IsMounted,
      "S17 protected visual pair did not mount")
    let metrics = WindowReadbackTestFixture.Metrics(window)
    let visual = S09RReadback(window, metrics)
    S17ValidateVisual(visual, metrics)
    S14Require(WindowReadbackTestFixture.S17ValidateInitial(window,
      S17ProtectedTextCell.Entry, source),
      "S17 protected grapheme mapping or geometry is incorrect")

    guard let initialSemantic = adapter.Tree?.Root else {
      throw InvalidOperationException("S17 protected semantic node is missing")
    }
    S14Require(initialSemantic.Value == "•••",
      "S17 protected semantic value was not redacted")
    S14Require(window.PerformAccessibilityAction(initialSemantic.Id,
      AccessibilityActionRequest.SetSelection(1, 1)),
      "S17 protected semantic selection action failed")
    WindowReadbackTestFixture.UpdateTree(window)
    guard let selectedSemantic = adapter.Tree?.Root else {
      throw InvalidOperationException("S17 protected semantic selection was not published")
    }
    S14Require(WindowReadbackTestFixture.S17SelectionMapped(window,
      S17ProtectedTextCell.Entry)
        && selectedSemantic.SelectionStart == 1
        && selectedSemantic.SelectionLength == 1
        && selectedSemantic.Caret == 2,
      "S17 protected semantic coordinates are incorrect")

    S14Require(S17ProtectedTextCell.Entry.Focus(), "S17 protected entry did not focus")
    originalClipboard = window.GetClipboardText()
    window.SetClipboardText("safe")
    clipboardChanged = true
    S14Require(WindowReadbackTestFixture.S17ExerciseInput(window,
      S17ProtectedTextCell.Entry, source)
        && cell.CompositionCount == 1
        && cell.CompositionText == "z\u0301"
        && cell.LastValue == source + "safe" + "z\u0301",
      "S17 protected clipboard or IME behavior is incorrect")
    window.SetClipboardText(originalClipboard)
    clipboardChanged = false

    window.AccessibilityAdapter = nil
    window.AccessibilityAdapter = adapter
    WindowReadbackTestFixture.UpdateTree(window)
    guard let finalSemantic = adapter.Tree?.Root else {
      throw InvalidOperationException("S17 final protected semantic node is missing")
    }
    S14Require(finalSemantic.Value == "••••••••"
        && finalSemantic.SelectionStart == 8
        && finalSemantic.SelectionLength == 0
        && finalSemantic.Caret == 8
        && !finalSemantic.Value.Contains("metadata"),
      "S17 final protected semantic state is incorrect")
    S14Require(S17ProtectedTextCell.Entry.Blur(), "S17 protected entry did not blur")
    window.RequestClose()
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S14Require(!window.IsOpen, "S17 protected gate window did not close")
    S14Require(WindowReadbackTestFixture.ResidentResourceBytes(window) == 0uL,
      "S17 protected readback resources remain resident after close")
  } finally {
    if window.IsOpen {
      if clipboardChanged { window.SetClipboardText(originalClipboard) }
      window.RequestClose()
      WindowReadbackTestFixture.ForceRender(window, 0.0)
    }
    Console.SetError(originalError)
    font.Dispose()
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  S14Require(!diagnostics.Contains("\"event\":325")
      && !diagnostics.Contains("\"event\":326"),
    "S17 protected gate emitted unsupported-scene diagnostics")
  Console.WriteLine("s17-protected-text-gate: graphemes=3,8 visual=1 geometry=1 clipboard=1"
    +" ime=1 semantics=1 close=1")
}

let managedEntryTimestamp = Stopwatch.GetTimestamp()
Window.ConfigureApplication("Goo S14 async readback smoke", "0.1.0", "io.github.obselate.goo.s14.readback")
if Environment.GetEnvironmentVariable("GOO_NATIVE_S15_Q10_LATENCY_GATE") == "1" {
  RunS15Q10LatencyBenchmark(managedEntryTimestamp)
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S15_Q10_STAGE_TIMESTAMP_GATE") == "1" {
  RunS15Q10StageTimestampGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S15_SDL_ACCEPTANCE_GATE") == "1" {
  RunS15SdlAcceptanceGate()
  return
}

if Environment.GetEnvironmentVariable("GOO_NATIVE_S15_Q10_GATE") == "1" {
  RunS15Q10Benchmark()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S19_IDLE_GATE") == "1" {
  RunS19IdleGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S15_Q10_GATE") == "1" {
  RunS15Q10Benchmark()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_D02_OFFSCREEN_FAILURE_GATE") == "1" {
  RunD02OffscreenFailureGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S20_SHADER_EFFECT_GATE") == "1" {
  RunS20ShaderEffectGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S20_SHADER_EFFECT_BENCHMARK") == "1" {
  RunS20ShaderEffectBenchmark()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S17_CORE_BEHAVIOR_GATE") == "1" {
  RunS17CoreBehaviorGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S17_PROTECTED_TEXT_GATE") == "1" {
  RunS17ProtectedTextGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_TEXT_EDITOR_SLOTS_GATE") == "1" {
  RunTextEditorSlotsGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S16_LIVE_FRAME_PACING_GATE") == "1" {
  RunS16LiveFramePacingGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S16_FRAME_PACING_GATE") == "1" {
  RunS16FramePacingGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S16_VSYNC_GATE") == "1" {
  RunS16VSyncTransitionGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S16_QUEUE_ISOLATION_GATE") == "1" {
  RunS16QueueIsolationGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S15_STOCKS_VIRTUALIZATION_GATE") == "1" {
  RunS15StocksGridVirtualizationGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S15_STOCKS_GRID") == "1" {
  RunS15StocksGridBenchmark()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S15_PRIMITIVE_STAGING_BENCHMARK") == "1" {
  RunS15PrimitiveStagingBenchmark()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S15_TEXT_VIEWPORT_CULL_GATE") == "1" {
  RunS15TextViewportCullGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S15_TEXT_TRANSPORT_GATE") == "1" {
  RunS15TextTransportGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S15_RETENTION_GATE") == "1" {
  RunS15RetentionGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S14_EFFECTS_GATE") == "1" {
  RunS14EffectsGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S14_ROUNDED_OVERFLOW_GATE") == "1" {
  RunS14RoundedOverflowGate()
  return
}
if Environment.GetEnvironmentVariable("GOO_NATIVE_S09R_PIXEL_GATE") == "1" {
  RunS09RPixelGate()
  return
}
let mode = Environment.GetEnvironmentVariable("GOO_S14_READBACK_MODE")
if mode == "measure" {
  RunS14ReadbackMeasure()
} else {
  RunS14ReadbackSmoke()
}
