package GooAsyncReadbackSmoke

import System
import Goo


data struct S15Q10ImageEffectsCardInput {
  internal var Seed uint64
  internal var Index int32
  internal var Row int32
  internal var Column int32
  internal var ImageSlot int32
  internal var Provider ImageSourceProvider
  internal var Revision int32
  internal var Radius float64
  internal var BorderWidth float64
  internal var Opacity float64
  internal var ShadowBlur float64
  internal var ShadowSpread float64
  internal var Blend BlendMode
}


class S15Q10ImageEffectsProvider : ImageSourceProvider {
  private var source ImageSource
  private var version uint64
  private var disposed bool

  init(initial ImageSource) {
    source = initial
    version = 1uL
    disposed = false
  }

  public prop ContentVersion uint64 { get { return version } }
  public event ContentChanged Action

  public func Acquire() ImageSourceLease {
    return source.Acquire()
  }

  internal prop Width int32 { get { return source.Width } }
  internal prop Height int32 { get { return source.Height } }

  internal func Replace(next ImageSource) {
    if disposed {
      next.Dispose()
      throw ObjectDisposedException("S15Q10ImageEffectsProvider")
    }
    if version == UInt64.MaxValue {
      next.Dispose()
      throw InvalidOperationException("Image provider content version overflow")
    }
    let prior = source
    source = next
    version = version + 1uL
    try {
      let changed = ContentChanged
      changed?.Invoke()
    } finally {
      prior.Dispose()
    }
  }
  internal func DisposeSource() {
    if disposed {
      return
    }
    disposed = true
    source.Dispose()
  }
}


func S15Q10ImageEffectsPhase(seed uint64, index int32, revision int32, modulus int32) int32 {
  let value = (seed
    + uint64(index) * 2654435761uL
    + uint64(revision) * 2246822519uL) % uint64(modulus)
  return int32(value)
}


func S15Q10ImageEffectsPixels(seed uint64, slot int32, revision int32) []uint8 {
  let pixels = [256 * 256 * 4]uint8
  var pixel int32 = 0
  while pixel < 256 * 256 {
    let x = pixel % 256
    let y = pixel / 256
    let phase = seed
      + uint64(slot) * 2654435761uL
      + uint64(revision) * 2246822519uL
      + uint64(x) * 3266489917uL
      + uint64(y) * 668265263uL
    let offset = pixel * 4
    pixels[offset] = uint8((phase + 31uL) % 224uL + 16uL)
    pixels[offset + 1] = uint8((phase + uint64(x * 13 + y * 7) + 67uL) % 224uL + 16uL)
    pixels[offset + 2] = uint8((phase + uint64(x * 5 + y * 17) + 109uL) % 224uL + 16uL)
    pixels[offset + 3] = uint8(255)
    pixel = pixel + 1
  }
  return pixels
}


func S15Q10ImageEffectsOpacity(seed uint64, index int32, revision int32) float64 {
  return 0.68 + float64(S15Q10ImageEffectsPhase(seed, index, revision, 13)) * 0.02
}


func S15Q10ImageEffectsRadius(seed uint64, index int32, revision int32) float64 {
  return 5.0 + float64(S15Q10ImageEffectsPhase(seed, index, revision, 8))
}


func S15Q10ImageEffectsBorderWidth(seed uint64, index int32, revision int32) float64 {
  return 1.0 + float64(S15Q10ImageEffectsPhase(seed, index, revision, 3))
}


func S15Q10ImageEffectsShadowBlur(seed uint64, index int32, revision int32) float64 {
  return 3.0 + float64(S15Q10ImageEffectsPhase(seed, index, revision, 7))
}


func S15Q10ImageEffectsShadowSpread(seed uint64, index int32, revision int32) float64 {
  return float64(S15Q10ImageEffectsPhase(seed, index, revision, 3))
}
func S15Q10ImageEffectsRoundedClip(seed uint64, index int32) bool {
  return S15Q10ImageEffectsPhase(seed, index, 0, 256) < 8
}


func S15Q10ImageEffectsBlend(seed uint64, index int32, revision int32) BlendMode {
  let value = S15Q10ImageEffectsPhase(seed, index, 0, 256)
  if value >= 8 {
    return BlendMode.Normal
  }
  switch value % 4 {
    case 0 { return BlendMode.Multiply }
    case 1 { return BlendMode.Screen }
    case 2 { return BlendMode.Overlay }
    default { return BlendMode.Difference }
  }
}


func S15Q10ImageEffectsColor(seed uint64, index int32, revision int32, channel int32) Color {
  let value = S15Q10ImageEffectsPhase(
    seed + uint64(channel) * 131uL, index, revision, 176)
  let red = 48 + (value * 5) % 176
  let green = 40 + (value * 7 + channel * 17) % 176
  let blue = 56 + (value * 11 + channel * 23) % 176
  return Color.Rgb(red, green, blue)
}


func S15Q10ImageEffectsGradient(seed uint64, index int32, revision int32) LinearGradient {
  return LinearGradient(90.0, []GradientStop{
    GradientStop{
      Offset: 0.0,
      Color: S15Q10ImageEffectsColor(seed, index, revision, 0),
    },
    GradientStop{
      Offset: 0.5,
      Color: S15Q10ImageEffectsColor(seed, index, revision, 1),
    },
    GradientStop{
      Offset: 1.0,
      Color: S15Q10ImageEffectsColor(seed, index, revision, 2),
    },
  })
}


open class S15Q10ImageEffectsCard : Cell[S15Q10ImageEffectsCardInput] {
  protected override func Build(input S15Q10ImageEffectsCardInput) Blob {
    let borderColor = S15Q10ImageEffectsColor(
      input.Seed, input.Index, input.Revision, 3)
    let shadowColor = Color.Rgba(0, 0, 0, 172)
    let overlay = Container{
      Position: PositionType.Absolute,
      Left: 0.0,
      Top: 0.0,
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      Opacity: 0.24,
      BackgroundGradient: S15Q10ImageEffectsGradient(
        input.Seed, input.Index, input.Revision),
      BlendMode: input.Blend,
    }
    return Container{
      Position: PositionType.Absolute,
      Left: float64(input.Column) * 120.0,
      Top: float64(input.Row) * 67.5,
      Width: 120.0,
      Height: 67.5,
      BorderRadius: input.Radius,
      Overflow: if S15Q10ImageEffectsRoundedClip(input.Seed, input.Index) {
        Overflow.Hidden
      } else {
        Overflow.Visible
      },

      BorderStyle: BorderStyle.Solid,
      BorderWidth: input.BorderWidth,
      BorderColor: borderColor,
      BoxShadow: BoxShadow{
        OffsetX: 2.0,
        OffsetY: 3.0,
        Blur: input.ShadowBlur,
        Spread: input.ShadowSpread,
        Color: shadowColor,
      },
      Opacity: 1.0,
      BlendMode: BlendMode.Normal,
      BackgroundGradient: S15Q10ImageEffectsGradient(
        input.Seed, input.Index, input.Revision),
      Children: {
        Image{
          Width: Length.Percent(100),
          Height: Length.Percent(100),
          Source: input.Provider,
          Fit: ImageFit.Cover,
          Opacity: input.Opacity,
        },
        overlay,
      },
    }
  }
}


class S15Q10ImageEffectsRoot : Cell {
  shared {
    const S15Q10ImageEffectsSeed uint64 = 668265263uL
    const S15Q10ImageEffectsWidth int32 = 1920
    const S15Q10ImageEffectsHeight int32 = 1080
    const S15Q10ImageEffectsProviders int32 = 64
    const S15Q10ImageEffectsCards int32 = 256
    const S15Q10ImageEffectsMutations int32 = 8
  }

  private let seed uint64
  private let providers []S15Q10ImageEffectsProvider
  private let cardKeys []string
  private let cardRevisions []int32
  private let mutationIndices []int32
  private var replacementSlot int32
  private var advanceOrdinal int32

  internal prop LogicalCount int64 { get { return int64(S15Q10ImageEffectsCards) } }
  internal prop LogicalEdges int32 { get { return 0 } }
  internal prop VisibleCount int32 { get { return S15Q10ImageEffectsCards } }
  internal prop MountedCount int32 { get { return S15Q10ImageEffectsCards } }
  internal prop MountedBound int32 { get { return S15Q10ImageEffectsCards } }
  internal prop Width int32 { get { return S15Q10ImageEffectsWidth } }
  internal prop Height int32 { get { return S15Q10ImageEffectsHeight } }
  internal prop MutationCount int32 { get { return S15Q10ImageEffectsMutations } }

  init() {
    seed = S15Q10ImageEffectsSeed
    providers = [S15Q10ImageEffectsProviders]S15Q10ImageEffectsProvider
    cardKeys = [S15Q10ImageEffectsCards]string
    cardRevisions = [S15Q10ImageEffectsCards]int32
    mutationIndices = [S15Q10ImageEffectsMutations]int32
    var slot int32 = 0
    while slot < S15Q10ImageEffectsProviders {
      providers[slot] = S15Q10ImageEffectsProvider(
        ImageSource(256, 256, S15Q10ImageEffectsPixels(seed, slot, 0)))
      slot = slot + 1
    }
    var index int32 = 0
    while index < S15Q10ImageEffectsCards {
      cardKeys[index] = "q10-image-effects-card-" + index.ToString()
      cardRevisions[index] = 0
      index = index + 1
    }
    let initialBase = int32(seed % uint64(S15Q10ImageEffectsCards))
    var mutation int32 = 0
    while mutation < S15Q10ImageEffectsMutations {
      mutationIndices[mutation] =
        (initialBase + mutation) % S15Q10ImageEffectsCards
      mutation = mutation + 1
    }
    replacementSlot = int32(seed % uint64(S15Q10ImageEffectsProviders))
    advanceOrdinal = 0
  }
  internal func DisposeSources() {
    var slot int32 = 0
    while slot < S15Q10ImageEffectsProviders {
      providers[slot].DisposeSource()
      slot = slot + 1
    }
  }

  internal func Advance(frame int32) {
    if advanceOrdinal == Int32.MaxValue {
      throw InvalidOperationException("Image effects advance ordinal overflow")
    }
    advanceOrdinal = advanceOrdinal + 1
    var frameValue int64 = int64(frame)
    if frameValue < 0 {
      frameValue = -frameValue
    }
    replacementSlot = int32((uint64(frameValue) * 17uL + seed)
      % uint64(S15Q10ImageEffectsProviders))
    providers[replacementSlot].Replace(ImageSource(
      256, 256, S15Q10ImageEffectsPixels(seed, replacementSlot, advanceOrdinal)))
    let mutationBase = int32((seed
      + uint64(advanceOrdinal) * uint64(S15Q10ImageEffectsMutations))
      % uint64(S15Q10ImageEffectsCards))
    var mutation int32 = 0
    while mutation < S15Q10ImageEffectsMutations {
      let index = (mutationBase + mutation) % S15Q10ImageEffectsCards
      mutationIndices[mutation] = index
      cardRevisions[index] = advanceOrdinal
      mutation = mutation + 1
    }
    Rebuild()
  }

  internal func Invariant() bool {
    if seed != S15Q10ImageEffectsSeed
      || providers.Length != S15Q10ImageEffectsProviders
      || cardKeys.Length != S15Q10ImageEffectsCards
      || cardRevisions.Length != S15Q10ImageEffectsCards
      || mutationIndices.Length != S15Q10ImageEffectsMutations {
      return false
    }
    if LogicalCount != int64(S15Q10ImageEffectsCards)
      || LogicalEdges != 0
      || VisibleCount != S15Q10ImageEffectsCards
      || MountedCount != S15Q10ImageEffectsCards
      || MountedBound != S15Q10ImageEffectsCards
      || Width != S15Q10ImageEffectsWidth
      || Height != S15Q10ImageEffectsHeight
      || MutationCount != S15Q10ImageEffectsMutations {
      return false
    }
    if replacementSlot < 0 || replacementSlot >= S15Q10ImageEffectsProviders {
      return false
    }
    var slot int32 = 0
    while slot < S15Q10ImageEffectsProviders {
      if Object.ReferenceEquals(providers[slot], nil)
        || providers[slot].Width != 256
        || providers[slot].Height != 256
        || providers[slot].ContentVersion == 0uL {
        return false
      }
      slot = slot + 1
    }
    var nonNormalCount int32 = 0
    var roundedClipCount int32 = 0
    var index int32 = 0

    while index < S15Q10ImageEffectsCards {
      if cardKeys[index] != "q10-image-effects-card-" + index.ToString()
        || cardRevisions[index] < 0 {
        return false
      }
      let opacity = S15Q10ImageEffectsOpacity(seed, index, cardRevisions[index])
      let radius = S15Q10ImageEffectsRadius(seed, index, cardRevisions[index])
      let borderWidth = S15Q10ImageEffectsBorderWidth(
        seed, index, cardRevisions[index])
      let shadowBlur = S15Q10ImageEffectsShadowBlur(
        seed, index, cardRevisions[index])
      let shadowSpread = S15Q10ImageEffectsShadowSpread(
        seed, index, cardRevisions[index])
      if Double.IsNaN(opacity) || Double.IsInfinity(opacity)
        || opacity <= 0.0 || opacity > 1.0
        || Double.IsNaN(radius) || Double.IsInfinity(radius)
        || radius <= 0.0 || radius > 33.75
        || Double.IsNaN(borderWidth) || Double.IsInfinity(borderWidth)
        || borderWidth <= 0.0 || borderWidth > 4.0
        || Double.IsNaN(shadowBlur) || Double.IsInfinity(shadowBlur)
        || shadowBlur < 0.0 || shadowBlur > 16.0
        || Double.IsNaN(shadowSpread) || Double.IsInfinity(shadowSpread)
        || shadowSpread < 0.0 || shadowSpread > 4.0 {
        return false
      }
      let blend = S15Q10ImageEffectsBlend(seed, index, cardRevisions[index])
      switch blend {
        case BlendMode.Normal { }
        case BlendMode.Multiply {
          nonNormalCount = nonNormalCount + 1
        }
        case BlendMode.Screen {
          nonNormalCount = nonNormalCount + 1
        }
        case BlendMode.Overlay {
          nonNormalCount = nonNormalCount + 1
        }
        case BlendMode.Difference {
          nonNormalCount = nonNormalCount + 1
        }
        default { return false }
      }
      if S15Q10ImageEffectsRoundedClip(seed, index) {
        roundedClipCount = roundedClipCount + 1
      }

      index = index + 1
    }
    if roundedClipCount != S15Q10ImageEffectsMutations
      || nonNormalCount != S15Q10ImageEffectsMutations {
      return false
    }
    var mutation int32 = 0
    while mutation < S15Q10ImageEffectsMutations {
      let index = mutationIndices[mutation]
      if index < 0 || index >= S15Q10ImageEffectsCards
        || cardRevisions[index] != advanceOrdinal {
        return false
      }
      var prior int32 = 0
      while prior < mutation {
        if mutationIndices[prior] == index {
          return false
        }
        prior = prior + 1
      }
      mutation = mutation + 1
    }
    return true
  }

  override func Build() Blob {
    let canvas = Container{
      Key: "q10-image-effects-canvas",
      Position: PositionType.Absolute,
      Left: 0.0,
      Top: 0.0,
      Width: S15Q10ImageEffectsWidth,
      Height: S15Q10ImageEffectsHeight,
      Children: {},
    }
    var index int32 = 0
    while index < S15Q10ImageEffectsCards {
      let row = index / 16
      let column = index % 16
      let imageSlot = index % S15Q10ImageEffectsProviders
      let revision = cardRevisions[index]
      canvas.Children.Add(Cell.Mount[S15Q10ImageEffectsCardInput, S15Q10ImageEffectsCard](
        cardKeys[index],
        S15Q10ImageEffectsCardInput{
          Seed: seed,
          Index: index,
          Row: row,
          Column: column,
          ImageSlot: imageSlot,
          Provider: providers[imageSlot],
          Revision: revision,
          Radius: S15Q10ImageEffectsRadius(seed, index, revision),
          BorderWidth: S15Q10ImageEffectsBorderWidth(seed, index, revision),
          Opacity: S15Q10ImageEffectsOpacity(seed, index, revision),
          ShadowBlur: S15Q10ImageEffectsShadowBlur(seed, index, revision),
          ShadowSpread: S15Q10ImageEffectsShadowSpread(seed, index, revision),
          Blend: S15Q10ImageEffectsBlend(seed, index, revision),
        }))
      index = index + 1
    }
    return Container{
      Width: S15Q10ImageEffectsWidth,
      Height: S15Q10ImageEffectsHeight,
      Position: PositionType.Relative,
      Overflow: Overflow.Hidden,
      BackgroundColor: Color.Rgb(8, 13, 22),
      Children: { canvas },
    }
  }
}
