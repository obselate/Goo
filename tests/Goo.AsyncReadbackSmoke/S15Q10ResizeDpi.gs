package GooAsyncReadbackSmoke

import System
import Goo

class S15Q10ResizeDpiRoot : Cell {
  shared {
    const S15Q10ResizeDpiSeed uint64 = 374761393uL
    const S15Q10ResizeDpiStates int32 = 3
    const S15Q10ResizeDpiTransitionFrames int32 = 20
    const S15Q10ResizeDpiLeafCount int32 = 4
    const S15Q10ResizeDpiState0Width int32 = 1280
    const S15Q10ResizeDpiState0Height int32 = 720
    const S15Q10ResizeDpiState0Scale float64 = 1.0
    const S15Q10ResizeDpiState1Width int32 = 1536
    const S15Q10ResizeDpiState1Height int32 = 864
    const S15Q10ResizeDpiState1Scale float64 = 1.5
    const S15Q10ResizeDpiState2Width int32 = 1920
    const S15Q10ResizeDpiState2Height int32 = 1080
    const S15Q10ResizeDpiState2Scale float64 = 2.0
    let BoxHandle ElementHandle = ElementHandle{}
    let TextHandle ElementHandle = ElementHandle{}
    let ImageHandle ElementHandle = ElementHandle{}
    let TransformedHandle ElementHandle = ElementHandle{}
  }

  private let seed uint64
  private let imageSource ImageSource
  private var imageSourceDisposed bool
  private var stateIndex int32
  private var logicalWidth int32
  private var logicalHeight int32
  private var scale float64
  private var framebufferWidth int32
  private var framebufferHeight int32
  private var marker int32
  private var revision int32

  prop Seed uint64 { get { return seed } }
  prop Root Cell { get { return this } }
  prop LogicalCount int64 { get { return int64(S15Q10ResizeDpiLeafCount) } }
  prop LogicalEdges int32 { get { return 0 } }
  prop VisibleEdges int32 { get { return 0 } }
  prop VisibleCount int32 { get { return S15Q10ResizeDpiLeafCount } }
  prop MountedCount int32 { get { return S15Q10ResizeDpiLeafCount } }
  prop MountedBound int32 { get { return S15Q10ResizeDpiLeafCount } }
  prop Width int32 { get { return logicalWidth } }
  prop Height int32 { get { return logicalHeight } }
  prop MutationCount int32 { get { return 1 } }
  prop StateIndex int32 { get { return stateIndex } }
  prop Scale float64 { get { return scale } }
  prop FramebufferWidth int32 { get { return framebufferWidth } }
  prop FramebufferHeight int32 { get { return framebufferHeight } }
  prop Marker int32 { get { return marker } }
  prop Revision int32 { get { return revision } }

  init(initialSeed uint64) {
    seed = initialSeed
    stateIndex = 0
    logicalWidth = S15Q10ResizeDpiState0Width
    logicalHeight = S15Q10ResizeDpiState0Height
    scale = S15Q10ResizeDpiState0Scale
    framebufferWidth = int32(float64(logicalWidth) * scale)
    framebufferHeight = int32(float64(logicalHeight) * scale)
    marker = MarkerFor(0, 0)
    revision = 0
    imageSource = BuildImageSource()
    imageSourceDisposed = false
  }
  func DisposeSource() {
    if imageSourceDisposed {
      return
    }
    imageSourceDisposed = true
    imageSource.Dispose()
  }

  private func MarkerFor(frame int32, nextRevision int32) int32 {
    let frameValue = if frame < 0 {
      uint64(-int64(frame))
    } else {
      uint64(frame)
    }
    let revisionValue = if nextRevision < 0 {
      uint64(-int64(nextRevision))
    } else {
      uint64(nextRevision)
    }
    let mixed = (frameValue * 2654435761uL
      + revisionValue * 2246822519uL + seed) & 2147483647uL
    return int32(mixed)
  }

  private func BuildImageSource() ImageSource {
    const width int32 = 32
    const height int32 = 32
    let pixels = [32 * 32 * 4]uint8
    var pixel int32 = 0
    while pixel < width * height {
      let x = pixel % width
      let y = pixel / width
      let phase = seed + uint64(x) * 3266489917uL
        + uint64(y) * 668265263uL
      let offset = pixel * 4
      pixels[offset] = uint8((phase + 31uL) % 192uL + 32uL)
      pixels[offset + 1] = uint8((phase + uint64(x * 7 + y * 13) + 67uL) % 192uL + 32uL)
      pixels[offset + 2] = uint8((phase + uint64(x * 17 + y * 5) + 109uL) % 192uL + 32uL)
      pixels[offset + 3] = uint8(255)
      pixel = pixel + 1
    }
    return ImageSource(width, height, pixels)
  }

  private func ApplyState(nextState int32) {
    stateIndex = nextState
    if nextState == 0 {
      logicalWidth = S15Q10ResizeDpiState0Width
      logicalHeight = S15Q10ResizeDpiState0Height
      scale = S15Q10ResizeDpiState0Scale
    } else if nextState == 1 {
      logicalWidth = S15Q10ResizeDpiState1Width
      logicalHeight = S15Q10ResizeDpiState1Height
      scale = S15Q10ResizeDpiState1Scale
    } else {
      logicalWidth = S15Q10ResizeDpiState2Width
      logicalHeight = S15Q10ResizeDpiState2Height
      scale = S15Q10ResizeDpiState2Scale
    }
    framebufferWidth = int32(float64(logicalWidth) * scale)
    framebufferHeight = int32(float64(logicalHeight) * scale)
  }

  func Transition(frame int32) {
    let nextState = (frame / S15Q10ResizeDpiTransitionFrames)
      % S15Q10ResizeDpiStates
    if nextState != stateIndex {
      ApplyState(nextState)
    }
  }

  func Advance(frame int32) {
    if revision == Int32.MaxValue {
      throw InvalidOperationException("Resize DPI revision overflow")
    }
    revision = revision + 1
    marker = MarkerFor(frame, revision)
    Rebuild()
  }

  private func IsFinite(value float64) bool {
    return !Double.IsNaN(value) && !Double.IsInfinity(value)
  }

  private func FiniteGeometry(handle ElementHandle) bool {
    let bounds = handle.BorderBox
    return IsFinite(bounds.X) && IsFinite(bounds.Y)
      && IsFinite(bounds.Width) && IsFinite(bounds.Height)
      && bounds.Width >= 0.0 && bounds.Height >= 0.0
  }

  private func ExpectedState(frame int32) int32 {
    return (frame / S15Q10ResizeDpiTransitionFrames)
      % S15Q10ResizeDpiStates
  }

  func Invariant() bool {
    if stateIndex < 0 || stateIndex >= S15Q10ResizeDpiStates
      || logicalWidth <= 0 || logicalHeight <= 0
      || !IsFinite(scale) || scale <= 0.0
      || framebufferWidth != int32(float64(logicalWidth) * scale)
      || framebufferHeight != int32(float64(logicalHeight) * scale)
      || LogicalCount != int64(S15Q10ResizeDpiLeafCount)
      || LogicalEdges != 0
      || VisibleEdges != 0
      || VisibleCount < 0 || VisibleCount > MountedBound
      || MountedCount < 0 || MountedCount > MountedBound
      || MountedBound != S15Q10ResizeDpiLeafCount
      || MutationCount != 1
      || revision < 0 || marker < 0
      || !FiniteGeometry(BoxHandle)
      || !FiniteGeometry(TextHandle)
      || !FiniteGeometry(ImageHandle)
      || !FiniteGeometry(TransformedHandle) {
      return false
    }
    let expectedWidth = if stateIndex == 0 {
      S15Q10ResizeDpiState0Width
    } else if stateIndex == 1 {
      S15Q10ResizeDpiState1Width
    } else {
      S15Q10ResizeDpiState2Width
    }
    let expectedHeight = if stateIndex == 0 {
      S15Q10ResizeDpiState0Height
    } else if stateIndex == 1 {
      S15Q10ResizeDpiState1Height
    } else {
      S15Q10ResizeDpiState2Height
    }
    let expectedScale = if stateIndex == 0 {
      S15Q10ResizeDpiState0Scale
    } else if stateIndex == 1 {
      S15Q10ResizeDpiState1Scale
    } else {
      S15Q10ResizeDpiState2Scale
    }
    let stateCycle = ExpectedState(0) == 0
      && ExpectedState(19) == 0
      && ExpectedState(20) == 1
      && ExpectedState(39) == 1
      && ExpectedState(40) == 2
      && ExpectedState(59) == 2
      && ExpectedState(60) == 0
    return logicalWidth == expectedWidth
      && logicalHeight == expectedHeight
      && scale == expectedScale
      && Width == logicalWidth
      && Height == logicalHeight
      && FramebufferWidth > 0
      && FramebufferHeight > 0
      && stateCycle
  }

  override func Build() Blob {
    let markerPhase = marker % 160
    let markerColor = Color.Rgb(
      48 + markerPhase,
      72 + (markerPhase * 3) % 128,
      112 + (markerPhase * 5) % 112)
    let markerWidth = float64(logicalWidth) * 0.18
    let markerHeight = float64(logicalHeight) * 0.14
    let labelWidth = float64(logicalWidth) * 0.44
    let labelHeight = float64(logicalHeight) * 0.12
    let imageWidth = float64(logicalWidth) * 0.25
    let imageHeight = float64(logicalHeight) * 0.34
    let transformWidth = float64(logicalWidth) * 0.16
    let transformHeight = float64(logicalHeight) * 0.16
    let canvas = Container{
      Key: "q10-resize-dpi-canvas",
      Position: PositionType.Absolute,
      Left: 0.0,
      Top: 0.0,
      Width: logicalWidth,
      Height: logicalHeight,
      BackgroundColor: Color.Rgb(8, 13, 22),
      Children: {
        Container{
          Key: "q10-resize-dpi-box",
          Position: PositionType.Absolute,
          Left: float64(logicalWidth) * 0.08,
          Top: float64(logicalHeight) * 0.12,
          Width: markerWidth,
          Height: markerHeight,
          Handle: BoxHandle,
          BorderRadius: 8.0,
          BackgroundColor: markerColor,
        },
        Text{
          Key: "q10-resize-dpi-text",
          Position: PositionType.Absolute,
          Left: float64(logicalWidth) * 0.34,
          Top: float64(logicalHeight) * 0.14,
          Width: labelWidth,
          Height: labelHeight,
          Handle: TextHandle,
          Content: "Resize DPI state " + stateIndex.ToString(),
          FontSize: 24.0,
          Color: Color.Rgb(224, 232, 244),
        },
        Image{
          Key: "q10-resize-dpi-image",
          Position: PositionType.Absolute,
          Left: float64(logicalWidth) * 0.08,
          Top: float64(logicalHeight) * 0.42,
          Width: imageWidth,
          Height: imageHeight,
          Handle: ImageHandle,
          Source: imageSource,
          Fit: ImageFit.Cover,
        },
        Container{
          Key: "q10-resize-dpi-transformed",
          Position: PositionType.Absolute,
          Left: float64(logicalWidth) * 0.62,
          Top: float64(logicalHeight) * 0.48,
          Width: transformWidth,
          Height: transformHeight,
          Handle: TransformedHandle,
          Transform: PanelTransform{
            Rotate: 9.0 + float64(stateIndex) * 7.0,
            Scale: 0.92 + scale * 0.03,
          },
          TransformOriginX: Length.Percent(50),
          TransformOriginY: Length.Percent(50),
          BorderRadius: 12.0,
          BackgroundColor: Color.Rgb(88, 172, 224),
        },
      },
    }
    return Container{
      Key: "q10-resize-dpi-root",
      Width: logicalWidth,
      Height: logicalHeight,
      Position: PositionType.Relative,
      OverflowX: Overflow.Hidden,
      OverflowY: Overflow.Hidden,
      Children: { canvas },
    }
  }
}
