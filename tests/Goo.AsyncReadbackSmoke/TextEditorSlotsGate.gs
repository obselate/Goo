package GooAsyncReadbackSmoke

import System
import System.IO
import Goo

class TextEditorSlotsGateCell : Cell {
  shared {
    let Editor ElementHandle = ElementHandle{}
    let InlineSlot ElementHandle = ElementHandle{}
    let BlockSlot ElementHandle = ElementHandle{}
  }

  internal let Document TextDocument
  internal let Controller TextEditorController
  private let presentation TextPresentationLayer

  init() {
    Document = TextDocument("A [[inline]] Z\n[[block]]\nline 3\nline 4\nline 5\nline 6")
    Controller = TextEditorController(Document)
    presentation = TextPresentationLayer(Document)
    presentation.SetInlineSlot("inline", TextRange(2, 10), Container{
      Handle: TextEditorSlotsGateCell.InlineSlot,
      Width: 56,
      Height: 20,
      BackgroundColor: Color.Rgb(52, 204, 112),
    })
    presentation.SetBlockSlot("block", TextRange(15, 9), Container{
      Handle: TextEditorSlotsGateCell.BlockSlot,
      Width: 220,
      Height: 32,
      BackgroundColor: Color.Rgb(232, 152, 48),
    })
  }

  override func Build() Blob ->
  Container{
    Width: Length.Percent(100),
    Height: Length.Percent(100),
    Position: PositionType.Relative,
    BackgroundColor: Color.Rgb(12, 20, 32),
    Children: {
      TextEditor(Document, Controller, []TextPresentationLayer{ presentation }){
        Handle = TextEditorSlotsGateCell.Editor,
        Position = PositionType.Absolute,
        Left = 24,
        Top = 20,
        Width = 260,
        Height = 92,
        Padding = 12,
        FontFamily = "TextEditorSlotsGateFont",
        FontSize = 18,
        LineHeight = 1.0,
        OverscanLines = 0,
        BackgroundColor = Color.Rgb(24, 40, 64),
        Color = Color.Rgb(232, 238, 248),
      },
    },
  }

  internal func DisposeOwned() {
    presentation.Dispose()
    Controller.Dispose()
  }
}

func RunTextEditorSlotsGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let fontPath = Path.Combine(AppContext.BaseDirectory, "VendSans-VariableFont_wght.ttf")
  S14Require(File.Exists(fontPath), "Text editor slot font asset is missing")
  let font = FontSource("TextEditorSlotsGateFont", 400, false, File.ReadAllBytes(fontPath))
  font.Register()
  let cell = TextEditorSlotsGateCell{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  var window Window? = nil
  try {
    let opened = Window{
      Title: "Goo text editor slots gate",
      Width: 320,
      Height: 150,
      VSync: false,
      Root: cell,
    }
    window = opened
    Console.SetError(capturedError)
    opened.Open()
    var frame int32
    while frame < 8 {
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      frame++
    }
    let metrics = WindowReadbackTestFixture.Metrics(opened)
    S14Require(metrics.LogicalWidth == 320 && metrics.LogicalHeight == 150,
      "Text editor slot window metrics are incorrect")
    S14Require(TextEditorSlotsGateCell.Editor.IsMounted
        && TextEditorSlotsGateCell.InlineSlot.IsMounted
        && TextEditorSlotsGateCell.BlockSlot.IsMounted,
      "Text editor slot gate did not mount all handles")
    let editorContent = TextEditorSlotsGateCell.Editor.ContentBox
    let inlineBefore = TextEditorSlotsGateCell.InlineSlot.BorderBox
    let blockBefore = TextEditorSlotsGateCell.BlockSlot.BorderBox
    S14Require(inlineBefore.X >= editorContent.X
        && inlineBefore.X + inlineBefore.Width <= editorContent.X + editorContent.Width
        && inlineBefore.Y >= editorContent.Y
        && inlineBefore.Y + inlineBefore.Height <= editorContent.Y + editorContent.Height,
      "Inline editor slot is outside the initial content bounds")
    S14Require(blockBefore.X >= editorContent.X
        && blockBefore.X + blockBefore.Width <= editorContent.X + editorContent.Width
        && blockBefore.Y >= editorContent.Y
        && blockBefore.Y + blockBefore.Height <= editorContent.Y + editorContent.Height,
      "Block editor slot is outside the initial content bounds")
    let initial = S09RReadback(opened, metrics)
    S09RRequirePixelNear(initial.Pixels, initial.Width, metrics,
      inlineBefore.X + inlineBefore.Width * 0.5,
      inlineBefore.Y + inlineBefore.Height * 0.5,
      uint8(52), uint8(204), uint8(112), 8, "text_editor_inline_slot")
    S09RRequirePixelNear(initial.Pixels, initial.Width, metrics,
      blockBefore.X + blockBefore.Width * 0.5,
      blockBefore.Y + blockBefore.Height * 0.5,
      uint8(232), uint8(152), uint8(48), 8, "text_editor_block_slot")
    S14Require(WindowReadbackTestFixture.SceneRetention(opened).TextSegmentCount > 0,
      "Text editor slot scene did not retain editor text")

    var warmScroll int32
    while warmScroll < 8 {
      cell.Controller.ScrollTo(0.0, (warmScroll & 1) == 0 ? 12.0 : 0.0)
      WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
      warmScroll++
    }
    let countersBeforeScroll = WindowReadbackTestFixture.DiagnosticCounters(opened)
    cell.Controller.ScrollTo(0.0, 12.0)
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    let countersAfterScroll = WindowReadbackTestFixture.DiagnosticCounters(opened)
    S14Require(countersAfterScroll.vulkanObjectAllocationCount
        == countersBeforeScroll.vulkanObjectAllocationCount
        && countersAfterScroll.vulkanDeviceMemoryAllocationCount
          == countersBeforeScroll.vulkanDeviceMemoryAllocationCount,
      "Text editor slot scroll created Vulkan resources")
    let inlineAfter = TextEditorSlotsGateCell.InlineSlot.BorderBox
    S14Require(inlineAfter.Y < editorContent.Y
        && inlineAfter.Y + inlineAfter.Height > editorContent.Y,
      "Scrolled inline editor slot does not cross the content boundary")
    let scrolled = S09RReadback(opened, metrics)
    let inlineSampleX = inlineAfter.X + inlineAfter.Width * 0.5
    S09RRequirePixelNear(scrolled.Pixels, scrolled.Width, metrics,
      inlineSampleX, editorContent.Y - 4.0,
      uint8(24), uint8(40), uint8(64), 8, "text_editor_slot_clipped")
    S09RRequirePixelNear(scrolled.Pixels, scrolled.Width, metrics,
      inlineSampleX, editorContent.Y + 4.0,
      uint8(52), uint8(204), uint8(112), 8, "text_editor_slot_visible")

    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "Text editor slot gate window did not close")
    S14Require(WindowReadbackTestFixture.ResidentResourceBytes(opened) == 0uL,
      "Text editor slot resources remain resident after close")
  } finally {
    Console.SetError(originalError)
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
    cell.DisposeOwned()
    font.Dispose()
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  S14Require(!diagnostics.Contains("\"event\":325")
      && !diagnostics.Contains("\"event\":326"),
    "Text editor slot gate emitted unsupported-scene diagnostics")
  Console.WriteLine("text-editor-slots-gate: inline=1 block=1 clip=1 text=1"
    + " warmVkAlloc=0 close=1")
}
