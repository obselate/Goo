package GooAsyncReadbackSmoke

import System
import System.IO
import System.Runtime.InteropServices
import Goo
import Hexa.NET.SDL3

class S15SdlAcceptanceCell : Cell {
  internal let Target ElementHandle = ElementHandle{}
  internal let Entry ElementHandle = ElementHandle{}

  internal var PointerCount int32
  internal var KeyDownCount int32
  internal var KeyUpCount int32
  internal var TextCount int32
  internal var CommittedText string

  init() {
    PointerCount = 0
    KeyDownCount = 0
    KeyUpCount = 0
    TextCount = 0
    CommittedText = ""
  }

  private func RecordPointer() {
    PointerCount = PointerCount + 1
    Rebuild()
  }

  private func RecordKeyDown() {
    KeyDownCount = KeyDownCount + 1
    Rebuild()
  }

  private func RecordKeyUp() {
    KeyUpCount = KeyUpCount + 1
    Rebuild()
  }

  private func RecordText(value string) {
    TextCount = TextCount + 1
    CommittedText = value
    Rebuild()
  }

  override func Build() Blob -> Container {
    Width: 320,
    Height: 160,
    Position: PositionType.Relative,
    BackgroundColor: Color.Rgb(12, 20, 32),
    Children: {
      Button{
        Key: "s15-sdl-target",
        Handle: Target,
        Position: PositionType.Absolute,
        Left: 16,
        Top: 16,
        Width: 128,
        Height: 56,
        Focusable: true,
        BackgroundColor: Color.Rgb(48, 96, 160),
        BorderWidth: 2,
        BorderColor: Color.Rgb(120, 168, 224),
        Focus: Style{ BorderColor: Color.Rgb(255, 220, 120) },
        OnClick: func() { RecordPointer() },
      },
      TextEntry{
        Key: "s15-sdl-entry",
        Handle: Entry,
        Position: PositionType.Absolute,
        Left: 16,
        Top: 88,
        Width: 240,
        Height: 44,
        Padding: 6,
        Focusable: true,
        Value: "",
        BackgroundColor: Color.Rgb(20, 30, 44),
        Color: Color.Rgb(224, 232, 244),
        SelectionColor: Color.Rgba(48, 96, 160, 180),
        OnKeyDown: func(value KeyEvent) { RecordKeyDown() },
        OnKeyUp: func(value KeyEvent) { RecordKeyUp() },
        OnTextInput: func(value string) { RecordText(value) },
      },
    },
  }
}

unsafe func S15SdlPushPointerPair(windowId uint32, x float32, y float32) int32 {
  var accepted int32 = 0
  var down = SDLEvent{
    Type: uint32(SDLEventType.MouseButtonDown),
    Button: SDLMouseButtonEvent{
      Type: SDLEventType.MouseButtonDown,
      WindowID: windowId,
      Which: 0u,
      Button: uint8(SDL.SDL_BUTTON_LEFT),
      Down: uint8(1),
      Clicks: uint8(1),
      X: x,
      Y: y,
    },
  }
  if SDL.PushEvent(&down) {
    accepted = accepted + 1
  }
  var up = SDLEvent{
    Type: uint32(SDLEventType.MouseButtonUp),
    Button: SDLMouseButtonEvent{
      Type: SDLEventType.MouseButtonUp,
      WindowID: windowId,
      Which: 0u,
      Button: uint8(SDL.SDL_BUTTON_LEFT),
      Down: uint8(0),
      Clicks: uint8(1),
      X: x,
      Y: y,
    },
  }
  if SDL.PushEvent(&up) {
    accepted = accepted + 1
  }
  return accepted
}

unsafe func S15SdlPushKeyPair(windowId uint32) int32 {
  var accepted int32 = 0
  var down = SDLEvent{
    Type: uint32(SDLEventType.KeyDown),
    Key: SDLKeyboardEvent{
      Type: SDLEventType.KeyDown,
      WindowID: windowId,
      Which: 0u,
      Scancode: SDLScancode.A,
      Key: 0,
      Mod: uint16(SDLKeymod.None),
      Raw: uint16(0),
      Down: uint8(1),
      Repeat: uint8(0),
    },
  }
  if SDL.PushEvent(&down) {
    accepted = accepted + 1
  }
  var up = SDLEvent{
    Type: uint32(SDLEventType.KeyUp),
    Key: SDLKeyboardEvent{
      Type: SDLEventType.KeyUp,
      WindowID: windowId,
      Which: 0u,
      Scancode: SDLScancode.A,
      Key: 0,
      Mod: uint16(SDLKeymod.None),
      Raw: uint16(0),
      Down: uint8(0),
      Repeat: uint8(0),
    },
  }
  if SDL.PushEvent(&up) {
    accepted = accepted + 1
  }
  return accepted
}

unsafe func S15SdlPushText(windowId uint32, value string, out polled int32) bool {
  polled = 0
  let storage = Marshal.StringToCoTaskMemUTF8(value)
  try {
    var event = SDLEvent{
      Type: uint32(SDLEventType.TextInput),
      Text: SDLTextInputEvent{
        Type: SDLEventType.TextInput,
        WindowID: windowId,
        Text: *byte(storage),
      },
    }
    let accepted = SDL.PushEvent(&event)
    if accepted {
      polled = WindowReadbackTestFixture.PumpNativeEventsForTest()
    }
    return accepted
  } finally {
    Marshal.FreeCoTaskMem(storage)
  }
}

func S15SdlRequireInputFrame(before VulkanDiagnosticCounterSnapshot,
  after VulkanDiagnosticCounterSnapshot, kind string) {
    S14Require(after.submitCount == before.submitCount + 1uL
        && after.presentCount == before.presentCount + 1uL,
      "S15 SDL " + kind + " input did not submit and present exactly once")
  }

func RunS15SdlAcceptanceGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let root = S15SdlAcceptanceCell{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  var window Window? = nil
  var acceptedEvents int32 = 0
  var nativePollSeen bool = false
  var submitCount uint64 = 0uL
  var presentCount uint64 = 0uL
  try {
    Console.SetError(capturedError)
    let opened = Window{
      Title: "Goo S15 SDL acceptance",
      Width: 320,
      Height: 160,
      VSync: false,
      Root: root,
    }
    window = opened
    opened.Open()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(root.Target.IsMounted
        && root.Entry.IsMounted,
      "S15 SDL acceptance scene did not mount")
    let windowId = WindowReadbackTestFixture.SdlWindowId(opened)
    S14Require(windowId != 0u, "S15 SDL acceptance did not obtain a live SDL window ID")
    S14Require(root.Entry.Focus(), "S15 SDL acceptance TextEntry did not accept focus")
    WindowReadbackTestFixture.ForceRender(opened, 0.0)

    let targetBounds = root.Target.BorderBox
    let pointerX = float32(targetBounds.X + targetBounds.Width * 0.5)
    let pointerY = float32(targetBounds.Y + targetBounds.Height * 0.5)
    let pointerBefore = WindowReadbackTestFixture.DiagnosticCounters(opened)
    let pointerAccepted = S15SdlPushPointerPair(windowId, pointerX, pointerY)
    acceptedEvents = acceptedEvents + pointerAccepted
    S14Require(pointerAccepted == 2, "S15 SDL pointer events were not accepted by SDL")
    let pointerPolled = WindowReadbackTestFixture.PumpNativeEventsForTest()
    nativePollSeen = nativePollSeen || pointerPolled > 0
    S14Require(pointerPolled > 0, "S15 SDL pointer events were not polled")
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    let pointerAfter = WindowReadbackTestFixture.DiagnosticCounters(opened)
    S15SdlRequireInputFrame(pointerBefore, pointerAfter, "pointer")
    submitCount = submitCount + pointerAfter.submitCount - pointerBefore.submitCount
    presentCount = presentCount + pointerAfter.presentCount - pointerBefore.presentCount
    S14Require(root.PointerCount == 1
        && root.KeyDownCount == 0
        && root.KeyUpCount == 0
        && root.TextCount == 0
        && root.CommittedText == "",
      "S15 SDL pointer callback was not isolated")

    S14Require(root.Entry.Focus(), "S15 SDL acceptance TextEntry did not refocus")
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    let keyBefore = WindowReadbackTestFixture.DiagnosticCounters(opened)
    let keyAccepted = S15SdlPushKeyPair(windowId)
    acceptedEvents = acceptedEvents + keyAccepted
    S14Require(keyAccepted == 2, "S15 SDL key events were not accepted by SDL")
    let keyPolled = WindowReadbackTestFixture.PumpNativeEventsForTest()
    nativePollSeen = nativePollSeen || keyPolled > 0
    S14Require(keyPolled > 0, "S15 SDL key events were not polled")
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    let keyAfter = WindowReadbackTestFixture.DiagnosticCounters(opened)
    S15SdlRequireInputFrame(keyBefore, keyAfter, "key")
    submitCount = submitCount + keyAfter.submitCount - keyBefore.submitCount
    presentCount = presentCount + keyAfter.presentCount - keyBefore.presentCount
    S14Require(root.PointerCount == 1
        && root.KeyDownCount == 1
        && root.KeyUpCount == 1
        && root.TextCount == 0
        && root.CommittedText == "",
      "S15 SDL key callback was not isolated")

    let textBefore = WindowReadbackTestFixture.DiagnosticCounters(opened)
    let textAccepted = S15SdlPushText(windowId, "é", out var textPolled)
    if textAccepted {
      acceptedEvents = acceptedEvents + 1
    }
    S14Require(textAccepted, "S15 SDL text event was not accepted by SDL")
    nativePollSeen = nativePollSeen || textPolled > 0
    S14Require(textPolled > 0, "S15 SDL text event was not polled")
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    let textAfter = WindowReadbackTestFixture.DiagnosticCounters(opened)
    S15SdlRequireInputFrame(textBefore, textAfter, "text")
    submitCount = submitCount + textAfter.submitCount - textBefore.submitCount
    presentCount = presentCount + textAfter.presentCount - textBefore.presentCount
    S14Require(root.PointerCount == 1
        && root.KeyDownCount == 1
        && root.KeyUpCount == 1
        && root.TextCount == 1
        && root.CommittedText == "é",
      "S15 SDL committed text callback was not isolated: pointer="
      +root.PointerCount.ToString() + " keyDown=" + root.KeyDownCount.ToString()
      +" keyUp=" + root.KeyUpCount.ToString() + " text=" + root.TextCount.ToString()
      +" value=" + root.CommittedText)

    S14Require(acceptedEvents == 5, "S15 SDL acceptance did not accept all five input events")
    S14Require(submitCount == 3uL && presentCount == 3uL,
      "S15 SDL input render totals were not exact")
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "S15 SDL acceptance window did not close")
    S14Require(WindowReadbackTestFixture.ResidentResourceBytes(opened) == 0uL,
      "S15 SDL acceptance readback resources remain resident after close")
  } finally {
    if let opened = window {
      if opened.IsOpen {
        opened.RequestClose()
        WindowReadbackTestFixture.ForceRender(opened, 0.0)
      }
    }
    Console.SetError(originalError)
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  S14Require(!diagnostics.Contains("\"event\":325")
      && !diagnostics.Contains("\"event\":326"),
    "S15 SDL acceptance emitted unsupported-scene diagnostics")
  S14Require(nativePollSeen, "S15 SDL acceptance did not enter the native polling path")
  Console.WriteLine("s15-sdl-acceptance-gate: sdl_poll=1 pointer=1 key=1 text=1"
    +" submit=3 present=3 close=1")
}
