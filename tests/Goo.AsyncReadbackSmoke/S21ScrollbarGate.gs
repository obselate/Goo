package GooAsyncReadbackSmoke

import System
import System.IO
import Goo

class S21ScrollbarCell : Cell {
  shared {
    let Viewport ElementHandle = ElementHandle{}
  }

  private var visibility ScrollbarVisibility

  init() {
    visibility = ScrollbarVisibility.Always
  }

  internal func HideScrollbar() {
    visibility = ScrollbarVisibility.Hidden
    Rebuild()
  }

  override func Build() Blob -> Container {
    Width: Length.Percent(100),
    Height: Length.Percent(100),
    Position: PositionType.Relative,
    BackgroundColor: Color.Rgb(8, 14, 24),
    Children: {
      Container{
        Handle: S21ScrollbarCell.Viewport,
        Position: PositionType.Absolute,
        Left: 20.0,
        Top: 20.0,
        Width: 100.0,
        Height: 100.0,
        OverflowX: Overflow.Hidden,
        OverflowY: Overflow.Scroll,
        ScrollbarVisibility: visibility,
        Children: {
          Container{
            Width: 100.0,
            Height: 300.0,
            FlexShrink: 0.0,
            BackgroundColor: Color.Rgb(24, 80, 160),
          },
        },
      },
    },
  }
}

func RunS21ScrollbarGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let cell = S21ScrollbarCell{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  var window Window? = nil
  try {
    let opened = Window{
      Title: "Goo S21 scrollbar gate",
      Width: 144,
      Height: 144,
      VSync: false,
      Root: cell,
    }
    window = opened
    Console.SetError(capturedError)
    opened.Open()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    let metrics = WindowReadbackTestFixture.Metrics(opened)
    let scrollRangeValue = S21ScrollbarCell.Viewport.ScrollRange
    S14Require(scrollRangeValue.X == 0.0 && scrollRangeValue.Y == 200.0,
      "S21 scrollbar range was not published")
    let initial = S09RReadback(opened, metrics)
    let initialThumb = S09RLogicalPixel(initial.Pixels, initial.Width, metrics, 116.0, 30.0)
    S14Require(int32(initialThumb[0]) > 150 && int32(initialThumb[1]) > 150
        && int32(initialThumb[2]) > 150,
      "S21 Vulkan scrollbar thumb was not rendered: " + S09RPixelText(initialThumb))

    WindowReadbackTestFixture.S17QueuePointerPress(opened, 116.0, 30.0)
    WindowReadbackTestFixture.S17QueuePointerMove(opened, 116.0, 80.0)
    WindowReadbackTestFixture.S17QueuePointerRelease(opened, 116.0, 80.0)
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    let draggedOffset = S21ScrollbarCell.Viewport.ScrollOffset.Y
    S14Require(draggedOffset > 155.0 && draggedOffset < 157.0,
      "S21 scrollbar drag did not map to the immediate offset")
    let dragged = S09RReadback(opened, metrics)
    let oldThumb = S09RLogicalPixel(dragged.Pixels, dragged.Width, metrics, 116.0, 30.0)
    let movedThumb = S09RLogicalPixel(dragged.Pixels, dragged.Width, metrics, 116.0, 80.0)
    S14Require(int32(oldThumb[2]) > int32(oldThumb[0]) + 60,
      "S21 scrollbar left stale pixels at its old position: " + S09RPixelText(oldThumb))
    S14Require(int32(movedThumb[0]) > 150 && int32(movedThumb[1]) > 150
        && int32(movedThumb[2]) > 150,
      "S21 dragged scrollbar thumb was not rendered at its new position: " + S09RPixelText(movedThumb))

    cell.HideScrollbar()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    let hidden = S09RReadback(opened, metrics)
    let hiddenThumb = S09RLogicalPixel(hidden.Pixels, hidden.Width, metrics, 116.0, 80.0)
    S14Require(int32(hiddenThumb[2]) > int32(hiddenThumb[0]) + 60,
      "S21 hidden scrollbar still rendered its thumb: " + S09RPixelText(hiddenThumb))
    S14Require(S21ScrollbarCell.Viewport.JumpTo(0.0, 200.0),
      "S21 hidden scrollbar disabled programmatic scrolling")
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(S21ScrollbarCell.Viewport.ScrollOffset.Y == 200.0,
      "S21 hidden scrollbar did not preserve immediate scrolling")

    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "S21 scrollbar gate window did not close")
    S14Require(WindowReadbackTestFixture.ResidentResourceBytes(opened) == 0uL,
      "S21 scrollbar resources remain resident after close")
    Console.SetError(originalError)
    S14ValidateCommonDiagnostics(capturedError.ToString())
    Console.WriteLine("S21_SCROLLBAR_GATE_PASS range=200 drag=" + draggedOffset.ToString("F2"))
  } finally {
    Console.SetError(originalError)
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
  }
}
