package Goo.VulkanProof

import System

internal enum SceneResourceKind {
  None;
  Image;
  Sampler;
  GlyphRun;
  Atlas;
  PathMesh;
  Mesh;
  Brush;
  Mask;
  Pipeline;
  OffscreenTarget;
}

internal struct ResourceId {
  internal var Kind SceneResourceKind
  internal var LogicalId uint64
  internal var Version uint64

  internal prop IsValid bool{
    get -> Kind != SceneResourceKind.None && LogicalId != 0uL && Version != 0uL
  }
}

internal struct ConservativeBounds {
  internal var X float32
  internal var Y float32
  internal var Width float32
  internal var Height float32

  internal prop Right float32{
    get -> X + Width
  }

  internal prop Bottom float32{
    get -> Y + Height
  }

  internal prop IsEmpty bool{
    get -> Width <= 0.0F || Height <= 0.0F
  }

  internal func Inflate(amount float32) ConservativeBounds -> ConservativeBounds {
    X: X - amount,
    Y: Y - amount,
    Width: Width + amount + amount,
    Height: Height + amount + amount,
  }
}

internal enum SceneDrawKind {
  SolidBox;
  RoundedBox;
  PerEdgeBorder;
  LinearGradient;
  RadialGradient;
  CachedImage;
  CachedGlyphRun;
  PrebuiltPathMesh;
  Transform;
  RectClipBegin;
  RectClipEnd;
  Shadow;
  Underline;
  CustomMesh;
  LayerBegin;
  LayerEnd;
}

internal struct DrawRef {
  internal var Kind SceneDrawKind
  internal var Index int32
  internal var Flags uint32
}

internal struct SceneChunk {
  internal var OwnerId uint64
  internal var Version uint64
  internal var Bounds ConservativeBounds
  internal var FirstDraw int32
  internal var DrawCount int32
  internal var FirstResource int32
  internal var ResourceCount int32
  internal var Dirty bool
}

internal struct SolidBoxRecord {
  internal var Bounds ConservativeBounds
  internal var Color uint32
  internal var Opacity float32
  internal var TransformIndex int32
}

internal struct RoundedBoxRecord {
  internal var Bounds ConservativeBounds
  internal var RadiusTopLeft float32
  internal var RadiusTopRight float32
  internal var RadiusBottomRight float32
  internal var RadiusBottomLeft float32
  internal var Color uint32
  internal var Opacity float32
  internal var TransformIndex int32
}

internal struct PerEdgeBorderRecord {
  internal var Bounds ConservativeBounds
  internal var TopWidth float32
  internal var RightWidth float32
  internal var BottomWidth float32
  internal var LeftWidth float32
  internal var RadiusTopLeft float32
  internal var RadiusTopRight float32
  internal var RadiusBottomRight float32
  internal var RadiusBottomLeft float32
  internal var TopColor uint32
  internal var RightColor uint32
  internal var BottomColor uint32
  internal var LeftColor uint32
  internal var Style uint32
  internal var TransformIndex int32
}

internal struct GradientStopRecord {
  internal var Offset float32
  internal var Color uint32
}

internal struct LinearGradientRecord {
  internal var Bounds ConservativeBounds
  internal var RadiusTopLeft float32
  internal var RadiusTopRight float32
  internal var RadiusBottomRight float32
  internal var RadiusBottomLeft float32
  internal var StartX float32
  internal var StartY float32
  internal var EndX float32
  internal var EndY float32
  internal var StopStart int32
  internal var StopCount int32
  internal var Opacity float32
  internal var TransformIndex int32
}

internal struct RadialGradientRecord {
  internal var Bounds ConservativeBounds
  internal var RadiusTopLeft float32
  internal var RadiusTopRight float32
  internal var RadiusBottomRight float32
  internal var RadiusBottomLeft float32
  internal var CenterX float32
  internal var CenterY float32
  internal var RadiusX float32
  internal var RadiusY float32
  internal var StopStart int32
  internal var StopCount int32
  internal var Opacity float32
  internal var TransformIndex int32
}

internal struct CachedImageRefRecord {
  internal var Bounds ConservativeBounds
  internal var ImageId ResourceId
  internal var SamplerId ResourceId
  internal var SourceX float32
  internal var SourceY float32
  internal var SourceWidth float32
  internal var SourceHeight float32
  internal var Opacity float32
  internal var Sampling uint32
  internal var TransformIndex int32
}

internal struct CachedGlyphRunRefRecord {
  internal var Bounds ConservativeBounds
  internal var GlyphRunId ResourceId
  internal var AtlasId ResourceId
  internal var GlyphId uint32
  internal var AtlasTexelOffset uint32
  internal var AtlasTexelCount uint32
  internal var GlyphMinX float32
  internal var GlyphMinY float32
  internal var GlyphMaxX float32
  internal var GlyphMaxY float32
  internal var Color uint32
  internal var RenderMode uint32
  internal var EffectMode uint32
  internal var EffectRadius float32
  internal var TransformIndex int32
}

internal struct PrebuiltPathMeshRefRecord {
  internal var Bounds ConservativeBounds
  internal var MeshId ResourceId
  internal var FillBrushId ResourceId
  internal var StrokeBrushId ResourceId
  internal var FillRule uint32
  internal var StrokeWidth float32
  internal var StrokeColor uint32
  internal var TransformIndex int32
}

internal struct TransformRecord {
  internal var A float32
  internal var B float32
  internal var C float32
  internal var D float32
  internal var TX float32
  internal var TY float32
  internal var ParentIndex int32
}

internal struct RectClipRecord {
  internal var Bounds ConservativeBounds
  internal var TransformIndex int32
  internal var ParentIndex int32
}

internal struct ShadowRecord {
  internal var Bounds ConservativeBounds
  internal var RadiusTopLeft float32
  internal var RadiusTopRight float32
  internal var RadiusBottomRight float32
  internal var RadiusBottomLeft float32
  internal var OffsetX float32
  internal var OffsetY float32
  internal var Spread float32
  internal var Blur float32
  internal var Color uint32
  internal var MaskId ResourceId
  internal var Inset bool
  internal var TransformIndex int32
}

internal struct UnderlineRecord {
  internal var Bounds ConservativeBounds
  internal var Thickness float32
  internal var Color uint32
  internal var Mode uint32
  internal var TransformIndex int32
}

internal struct CustomMeshRecord {
  internal var Bounds ConservativeBounds
  internal var MeshId ResourceId
  internal var PipelineId ResourceId
  internal var VertexCount uint32
  internal var IndexCount uint32
  internal var Topology uint32
  internal var Opacity float32
  internal var TransformIndex int32
}

internal struct LayerRecord {
  internal var Bounds ConservativeBounds
  internal var Opacity float32
  internal var BlendMode uint32
  internal var OffscreenTargetId ResourceId
  internal var Flags uint32
  internal var TransformIndex int32
}

internal struct ScenePlanCounters {
  internal var GrowthOperations uint64
  internal var RecordOperations uint64
  internal var DrawReferenceOperations uint64
  internal var ResourceReferenceOperations uint64
  internal var ChunkOperations uint64
  internal var ResetOperations uint64
}

internal class SceneFrame {
  private const DefaultCapacity int32 = 8
  private const HashOffset uint64 = 1469598103934665603uL
  private const HashPrime uint64 = 1099511628211uL

  private var chunks []SceneChunk
  private var chunkCount int32
  private var drawRefs []DrawRef
  private var drawRefCount int32
  private var resourceRefs []ResourceId
  private var resourceRefCount int32
  private var solidBoxes []SolidBoxRecord
  private var solidBoxCount int32
  private var roundedBoxes []RoundedBoxRecord
  private var roundedBoxCount int32
  private var perEdgeBorders []PerEdgeBorderRecord
  private var perEdgeBorderCount int32
  private var gradientStops []GradientStopRecord
  private var gradientStopCount int32
  private var linearGradients []LinearGradientRecord
  private var linearGradientCount int32
  private var radialGradients []RadialGradientRecord
  private var radialGradientCount int32
  private var cachedImages []CachedImageRefRecord
  private var cachedImageCount int32
  private var cachedGlyphRuns []CachedGlyphRunRefRecord
  private var cachedGlyphRunCount int32
  private var pathMeshes []PrebuiltPathMeshRefRecord
  private var pathMeshCount int32
  private var transforms []TransformRecord
  private var transformCount int32
  private var rectClips []RectClipRecord
  private var rectClipCount int32
  private var shadows []ShadowRecord
  private var shadowCount int32
  private var underlines []UnderlineRecord
  private var underlineCount int32
  private var customMeshes []CustomMeshRecord
  private var customMeshCount int32
  private var layers []LayerRecord
  private var layerCount int32

  private var activeChunk int32
  private var growthOperations uint64
  private var recordOperations uint64
  private var drawReferenceOperations uint64
  private var resourceReferenceOperations uint64
  private var chunkOperations uint64
  private var resetOperations uint64

  internal convenience init() {
    init(DefaultCapacity)
  }

  internal init(capacity int32) {
    if capacity <= 0 || capacity > Int32.MaxValue {
      throw ArgumentOutOfRangeException("capacity")
    }
    chunks = [capacity]SceneChunk
    drawRefs = [capacity]DrawRef
    resourceRefs = [capacity]ResourceId
    solidBoxes = [capacity]SolidBoxRecord
    roundedBoxes = [capacity]RoundedBoxRecord
    perEdgeBorders = [capacity]PerEdgeBorderRecord
    gradientStops = [capacity]GradientStopRecord
    linearGradients = [capacity]LinearGradientRecord
    radialGradients = [capacity]RadialGradientRecord
    cachedImages = [capacity]CachedImageRefRecord
    cachedGlyphRuns = [capacity]CachedGlyphRunRefRecord
    pathMeshes = [capacity]PrebuiltPathMeshRefRecord
    transforms = [capacity]TransformRecord
    rectClips = [capacity]RectClipRecord
    shadows = [capacity]ShadowRecord
    underlines = [capacity]UnderlineRecord
    customMeshes = [capacity]CustomMeshRecord
    layers = [capacity]LayerRecord
    activeChunk = -1
  }

  internal prop Chunks []SceneChunk{ get -> chunks }
  internal prop ChunkCount int32{ get -> chunkCount }
  internal prop DrawRefs []DrawRef{ get -> drawRefs }
  internal prop DrawRefCount int32{ get -> drawRefCount }
  internal prop ResourceRefs []ResourceId{ get -> resourceRefs }
  internal prop ResourceRefCount int32{ get -> resourceRefCount }
  internal prop SolidBoxes []SolidBoxRecord{ get -> solidBoxes }
  internal prop SolidBoxCount int32{ get -> solidBoxCount }
  internal prop RoundedBoxes []RoundedBoxRecord{ get -> roundedBoxes }
  internal prop RoundedBoxCount int32{ get -> roundedBoxCount }
  internal prop PerEdgeBorders []PerEdgeBorderRecord{ get -> perEdgeBorders }
  internal prop PerEdgeBorderCount int32{ get -> perEdgeBorderCount }
  internal prop GradientStops []GradientStopRecord{ get -> gradientStops }
  internal prop GradientStopCount int32{ get -> gradientStopCount }
  internal prop LinearGradients []LinearGradientRecord{ get -> linearGradients }
  internal prop LinearGradientCount int32{ get -> linearGradientCount }
  internal prop RadialGradients []RadialGradientRecord{ get -> radialGradients }
  internal prop RadialGradientCount int32{ get -> radialGradientCount }
  internal prop CachedImages []CachedImageRefRecord{ get -> cachedImages }
  internal prop CachedImageCount int32{ get -> cachedImageCount }
  internal prop CachedGlyphRuns []CachedGlyphRunRefRecord{ get -> cachedGlyphRuns }
  internal prop CachedGlyphRunCount int32{ get -> cachedGlyphRunCount }
  internal prop PathMeshes []PrebuiltPathMeshRefRecord{ get -> pathMeshes }
  internal prop PathMeshCount int32{ get -> pathMeshCount }
  internal prop Transforms []TransformRecord{ get -> transforms }
  internal prop TransformCount int32{ get -> transformCount }
  internal prop RectClips []RectClipRecord{ get -> rectClips }
  internal prop RectClipCount int32{ get -> rectClipCount }
  internal prop Shadows []ShadowRecord{ get -> shadows }
  internal prop ShadowCount int32{ get -> shadowCount }
  internal prop Underlines []UnderlineRecord{ get -> underlines }
  internal prop UnderlineCount int32{ get -> underlineCount }
  internal prop CustomMeshes []CustomMeshRecord{ get -> customMeshes }
  internal prop CustomMeshCount int32{ get -> customMeshCount }
  internal prop Layers []LayerRecord{ get -> layers }
  internal prop LayerCount int32{ get -> layerCount }
  internal prop ActiveChunk int32{ get -> activeChunk }
  internal prop GrowthOperations uint64{ get -> growthOperations }
  internal prop RecordOperations uint64{ get -> recordOperations }
  internal prop Counters ScenePlanCounters{
    get {
      return ScenePlanCounters{
        GrowthOperations: growthOperations,
        RecordOperations: recordOperations,
        DrawReferenceOperations: drawReferenceOperations,
        ResourceReferenceOperations: resourceReferenceOperations,
        ChunkOperations: chunkOperations,
        ResetOperations: resetOperations,
      }
    }
  }

  internal func Reset() {
    RequireClosedChunk()
    chunkCount = 0
    drawRefCount = 0
    resourceRefCount = 0
    solidBoxCount = 0
    roundedBoxCount = 0
    perEdgeBorderCount = 0
    gradientStopCount = 0
    linearGradientCount = 0
    radialGradientCount = 0
    cachedImageCount = 0
    cachedGlyphRunCount = 0
    pathMeshCount = 0
    transformCount = 0
    rectClipCount = 0
    shadowCount = 0
    underlineCount = 0
    customMeshCount = 0
    layerCount = 0
    activeChunk = -1
    resetOperations = resetOperations + 1uL
  }

  internal func ResetForReuse() {
    Reset()
  }

  internal func BeginChunk(ownerId uint64, version uint64, bounds ConservativeBounds, dirty bool) int32 {
    if activeChunk >= 0 {
      throw InvalidOperationException("SceneFrame has an open chunk")
    }
    if ownerId == 0uL {
      throw ArgumentOutOfRangeException("ownerId")
    }
    if version == 0uL {
      throw ArgumentOutOfRangeException("version")
    }
    GrowChunks(NextCount(chunkCount))
    let index = chunkCount
    chunks[index] = SceneChunk{
      OwnerId: ownerId,
      Version: version,
      Bounds: bounds,
      FirstDraw: drawRefCount,
      DrawCount: 0,
      FirstResource: resourceRefCount,
      ResourceCount: 0,
      Dirty: dirty,
    }
    chunkCount = NextCount(chunkCount)
    activeChunk = index
    chunkOperations = chunkOperations + 1uL
    return index
  }

  internal func EndChunk() {
    if activeChunk < 0 || activeChunk >= chunkCount {
      throw InvalidOperationException("SceneFrame has no open chunk")
    }
    let chunk = chunks[activeChunk]
    chunks[activeChunk] = SceneChunk{
      OwnerId: chunk.OwnerId,
      Version: chunk.Version,
      Bounds: chunk.Bounds,
      FirstDraw: chunk.FirstDraw,
      DrawCount: drawRefCount - chunk.FirstDraw,
      FirstResource: chunk.FirstResource,
      ResourceCount: resourceRefCount - chunk.FirstResource,
      Dirty: chunk.Dirty,
    }
    activeChunk = -1
  }

  internal func AddResourceReference(value ResourceId) int32 {
    RequireOpenChunk()
    if !value.IsValid {
      throw ArgumentOutOfRangeException("value")
    }
    return AppendResourceReference(value)
  }

  internal func AddSolidBox(value SolidBoxRecord) int32 {
    RequireOpenChunk()
    ValidateTransformIndex(value.TransformIndex)
    GrowSolidBoxes(NextCount(solidBoxCount))
    let index = solidBoxCount
    solidBoxes[index] = value
    solidBoxCount = NextCount(solidBoxCount)
    recordOperations = recordOperations + 1uL
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.SolidBox, Index: index, Flags: 0u })
    return index
  }

  internal func AddRoundedBox(value RoundedBoxRecord) int32 {
    RequireOpenChunk()
    ValidateTransformIndex(value.TransformIndex)
    GrowRoundedBoxes(NextCount(roundedBoxCount))
    let index = roundedBoxCount
    roundedBoxes[index] = value
    roundedBoxCount = NextCount(roundedBoxCount)
    recordOperations = recordOperations + 1uL
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.RoundedBox, Index: index, Flags: 0u })
    return index
  }

  internal func AddPerEdgeBorder(value PerEdgeBorderRecord) int32 {
    RequireOpenChunk()
    ValidateTransformIndex(value.TransformIndex)
    GrowPerEdgeBorders(NextCount(perEdgeBorderCount))
    let index = perEdgeBorderCount
    perEdgeBorders[index] = value
    perEdgeBorderCount = NextCount(perEdgeBorderCount)
    recordOperations = recordOperations + 1uL
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.PerEdgeBorder, Index: index, Flags: 0u })
    return index
  }

  internal func AddGradientStop(value GradientStopRecord) int32 {
    RequireOpenChunk()
    GrowGradientStops(NextCount(gradientStopCount))
    let index = gradientStopCount
    gradientStops[index] = value
    gradientStopCount = NextCount(gradientStopCount)
    recordOperations = recordOperations + 1uL
    return index
  }

  internal func AddLinearGradient(value LinearGradientRecord) int32 {
    RequireOpenChunk()
    ValidateGradientRange(value.StopStart, value.StopCount)
    ValidateTransformIndex(value.TransformIndex)
    GrowLinearGradients(NextCount(linearGradientCount))
    let index = linearGradientCount
    linearGradients[index] = value
    linearGradientCount = NextCount(linearGradientCount)
    recordOperations = recordOperations + 1uL
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.LinearGradient, Index: index, Flags: 0u })
    return index
  }

  internal func AddRadialGradient(value RadialGradientRecord) int32 {
    RequireOpenChunk()
    ValidateGradientRange(value.StopStart, value.StopCount)
    ValidateTransformIndex(value.TransformIndex)
    GrowRadialGradients(NextCount(radialGradientCount))
    let index = radialGradientCount
    radialGradients[index] = value
    radialGradientCount = NextCount(radialGradientCount)
    recordOperations = recordOperations + 1uL
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.RadialGradient, Index: index, Flags: 0u })
    return index
  }

  internal func AddCachedImage(value CachedImageRefRecord) int32 {
    RequireOpenChunk()
    ValidateTransformIndex(value.TransformIndex)
    GrowCachedImages(NextCount(cachedImageCount))
    let index = cachedImageCount
    cachedImages[index] = value
    cachedImageCount = NextCount(cachedImageCount)
    recordOperations = recordOperations + 1uL
    AppendResourceIfValid(value.ImageId)
    AppendResourceIfValid(value.SamplerId)
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.CachedImage, Index: index, Flags: 0u })
    return index
  }

  internal func AddCachedGlyphRun(value CachedGlyphRunRefRecord) int32 {
    RequireOpenChunk()
    ValidateTransformIndex(value.TransformIndex)
    if value.AtlasTexelCount == 0u {
      throw ArgumentOutOfRangeException("atlas texel count")
    }
    GrowCachedGlyphRuns(NextCount(cachedGlyphRunCount))
    let index = cachedGlyphRunCount
    cachedGlyphRuns[index] = value
    cachedGlyphRunCount = NextCount(cachedGlyphRunCount)
    recordOperations = recordOperations + 1uL
    AppendResourceIfValid(value.GlyphRunId)
    AppendResourceIfValid(value.AtlasId)
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.CachedGlyphRun, Index: index, Flags: 0u })
    return index
  }

  internal func AddPrebuiltPathMesh(value PrebuiltPathMeshRefRecord) int32 {
    RequireOpenChunk()
    ValidateTransformIndex(value.TransformIndex)
    GrowPathMeshes(NextCount(pathMeshCount))
    let index = pathMeshCount
    pathMeshes[index] = value
    pathMeshCount = NextCount(pathMeshCount)
    recordOperations = recordOperations + 1uL
    AppendResourceIfValid(value.MeshId)
    AppendResourceIfValid(value.FillBrushId)
    AppendResourceIfValid(value.StrokeBrushId)
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.PrebuiltPathMesh, Index: index, Flags: 0u })
    return index
  }

  internal func AddTransform(value TransformRecord) int32 {
    RequireOpenChunk()
    ValidateTransformParentIndex(value.ParentIndex)
    GrowTransforms(NextCount(transformCount))
    let index = transformCount
    transforms[index] = value
    transformCount = NextCount(transformCount)
    recordOperations = recordOperations + 1uL
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.Transform, Index: index, Flags: 0u })
    return index
  }

  internal func AddRectClipBegin(value RectClipRecord) int32 -> AddRectClip(value, true)

  internal func AddRectClipEnd(value RectClipRecord) int32 -> AddRectClip(value, false)

  internal func AddShadow(value ShadowRecord) int32 {
    RequireOpenChunk()
    ValidateTransformIndex(value.TransformIndex)
    GrowShadows(NextCount(shadowCount))
    let index = shadowCount
    shadows[index] = value
    shadowCount = NextCount(shadowCount)
    recordOperations = recordOperations + 1uL
    AppendResourceIfValid(value.MaskId)
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.Shadow, Index: index, Flags: 0u })
    return index
  }

  internal func AddUnderline(value UnderlineRecord) int32 {
    RequireOpenChunk()
    ValidateTransformIndex(value.TransformIndex)
    GrowUnderlines(NextCount(underlineCount))
    let index = underlineCount
    underlines[index] = value
    underlineCount = NextCount(underlineCount)
    recordOperations = recordOperations + 1uL
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.Underline, Index: index, Flags: 0u })
    return index
  }

  internal func AddCustomMesh(value CustomMeshRecord) int32 {
    RequireOpenChunk()
    ValidateTransformIndex(value.TransformIndex)
    GrowCustomMeshes(NextCount(customMeshCount))
    let index = customMeshCount
    customMeshes[index] = value
    customMeshCount = NextCount(customMeshCount)
    recordOperations = recordOperations + 1uL
    AppendResourceIfValid(value.MeshId)
    AppendResourceIfValid(value.PipelineId)
    AppendDrawRef(DrawRef{ Kind: SceneDrawKind.CustomMesh, Index: index, Flags: 0u })
    return index
  }

  internal func AddLayerBegin(value LayerRecord) int32 -> AddLayer(value, true)

  internal func AddLayerEnd(value LayerRecord) int32 -> AddLayer(value, false)

  internal func GrowChunks(required int32) {
    if required <= chunks.Length { return }
    let next = GrowthCapacity(chunks.Length, required)
    let expanded = [next]SceneChunk
    var index int32 = 0
    while index < chunkCount {
      expanded[index] = chunks[index]
      index = index + 1
    }
    chunks = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowDrawRefs(required int32) {
    if required <= drawRefs.Length { return }
    let next = GrowthCapacity(drawRefs.Length, required)
    let expanded = [next]DrawRef
    var index int32 = 0
    while index < drawRefCount {
      expanded[index] = drawRefs[index]
      index = index + 1
    }
    drawRefs = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowResourceRefs(required int32) {
    if required <= resourceRefs.Length { return }
    let next = GrowthCapacity(resourceRefs.Length, required)
    let expanded = [next]ResourceId
    var index int32 = 0
    while index < resourceRefCount {
      expanded[index] = resourceRefs[index]
      index = index + 1
    }
    resourceRefs = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowSolidBoxes(required int32) {
    if required <= solidBoxes.Length { return }
    let next = GrowthCapacity(solidBoxes.Length, required)
    let expanded = [next]SolidBoxRecord
    var index int32 = 0
    while index < solidBoxCount {
      expanded[index] = solidBoxes[index]
      index = index + 1
    }
    solidBoxes = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowRoundedBoxes(required int32) {
    if required <= roundedBoxes.Length { return }
    let next = GrowthCapacity(roundedBoxes.Length, required)
    let expanded = [next]RoundedBoxRecord
    var index int32 = 0
    while index < roundedBoxCount {
      expanded[index] = roundedBoxes[index]
      index = index + 1
    }
    roundedBoxes = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowPerEdgeBorders(required int32) {
    if required <= perEdgeBorders.Length { return }
    let next = GrowthCapacity(perEdgeBorders.Length, required)
    let expanded = [next]PerEdgeBorderRecord
    var index int32 = 0
    while index < perEdgeBorderCount {
      expanded[index] = perEdgeBorders[index]
      index = index + 1
    }
    perEdgeBorders = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowGradientStops(required int32) {
    if required <= gradientStops.Length { return }
    let next = GrowthCapacity(gradientStops.Length, required)
    let expanded = [next]GradientStopRecord
    var index int32 = 0
    while index < gradientStopCount {
      expanded[index] = gradientStops[index]
      index = index + 1
    }
    gradientStops = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowLinearGradients(required int32) {
    if required <= linearGradients.Length { return }
    let next = GrowthCapacity(linearGradients.Length, required)
    let expanded = [next]LinearGradientRecord
    var index int32 = 0
    while index < linearGradientCount {
      expanded[index] = linearGradients[index]
      index = index + 1
    }
    linearGradients = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowRadialGradients(required int32) {
    if required <= radialGradients.Length { return }
    let next = GrowthCapacity(radialGradients.Length, required)
    let expanded = [next]RadialGradientRecord
    var index int32 = 0
    while index < radialGradientCount {
      expanded[index] = radialGradients[index]
      index = index + 1
    }
    radialGradients = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowCachedImages(required int32) {
    if required <= cachedImages.Length { return }
    let next = GrowthCapacity(cachedImages.Length, required)
    let expanded = [next]CachedImageRefRecord
    var index int32 = 0
    while index < cachedImageCount {
      expanded[index] = cachedImages[index]
      index = index + 1
    }
    cachedImages = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowCachedGlyphRuns(required int32) {
    if required <= cachedGlyphRuns.Length { return }
    let next = GrowthCapacity(cachedGlyphRuns.Length, required)
    let expanded = [next]CachedGlyphRunRefRecord
    var index int32 = 0
    while index < cachedGlyphRunCount {
      expanded[index] = cachedGlyphRuns[index]
      index = index + 1
    }
    cachedGlyphRuns = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowPathMeshes(required int32) {
    if required <= pathMeshes.Length { return }
    let next = GrowthCapacity(pathMeshes.Length, required)
    let expanded = [next]PrebuiltPathMeshRefRecord
    var index int32 = 0
    while index < pathMeshCount {
      expanded[index] = pathMeshes[index]
      index = index + 1
    }
    pathMeshes = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowTransforms(required int32) {
    if required <= transforms.Length { return }
    let next = GrowthCapacity(transforms.Length, required)
    let expanded = [next]TransformRecord
    var index int32 = 0
    while index < transformCount {
      expanded[index] = transforms[index]
      index = index + 1
    }
    transforms = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowRectClips(required int32) {
    if required <= rectClips.Length { return }
    let next = GrowthCapacity(rectClips.Length, required)
    let expanded = [next]RectClipRecord
    var index int32 = 0
    while index < rectClipCount {
      expanded[index] = rectClips[index]
      index = index + 1
    }
    rectClips = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowShadows(required int32) {
    if required <= shadows.Length { return }
    let next = GrowthCapacity(shadows.Length, required)
    let expanded = [next]ShadowRecord
    var index int32 = 0
    while index < shadowCount {
      expanded[index] = shadows[index]
      index = index + 1
    }
    shadows = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowUnderlines(required int32) {
    if required <= underlines.Length { return }
    let next = GrowthCapacity(underlines.Length, required)
    let expanded = [next]UnderlineRecord
    var index int32 = 0
    while index < underlineCount {
      expanded[index] = underlines[index]
      index = index + 1
    }
    underlines = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowCustomMeshes(required int32) {
    if required <= customMeshes.Length { return }
    let next = GrowthCapacity(customMeshes.Length, required)
    let expanded = [next]CustomMeshRecord
    var index int32 = 0
    while index < customMeshCount {
      expanded[index] = customMeshes[index]
      index = index + 1
    }
    customMeshes = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func GrowLayers(required int32) {
    if required <= layers.Length { return }
    let next = GrowthCapacity(layers.Length, required)
    let expanded = [next]LayerRecord
    var index int32 = 0
    while index < layerCount {
      expanded[index] = layers[index]
      index = index + 1
    }
    layers = expanded
    growthOperations = growthOperations + 1uL
  }

  internal func SemanticDigest() uint64 {
    RequireClosedChunk()
    var hash = HashOffset
    hash = Mix(hash, uint64(chunkCount))
    var index int32 = 0
    while index < chunkCount {
      let chunk = chunks[index]
      hash = HashBounds(hash, chunk.Bounds)
      hash = Mix(hash, uint64(chunk.DrawCount))
      hash = Mix(hash, uint64(chunk.ResourceCount))
      index = index + 1
    }
    hash = Mix(hash, uint64(drawRefCount))
    index = 0
    while index < drawRefCount {
      let value = drawRefs[index]
      hash = Mix(hash, uint64(int32(value.Kind)))
      hash = Mix(hash, uint64(value.Index))
      hash = Mix(hash, uint64(value.Flags))
      index = index + 1
    }
    hash = Mix(hash, uint64(resourceRefCount))
    index = 0
    while index < resourceRefCount {
      hash = HashResource(hash, resourceRefs[index])
      index = index + 1
    }
    hash = Mix(hash, uint64(solidBoxCount))
    index = 0
    while index < solidBoxCount {
      let value = solidBoxes[index]
      hash = HashBounds(hash, value.Bounds)
      hash = Mix(hash, uint64(value.Color))
      hash = HashFloat(hash, value.Opacity)
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(roundedBoxCount))
    index = 0
    while index < roundedBoxCount {
      let value = roundedBoxes[index]
      hash = HashBounds(hash, value.Bounds)
      hash = HashFloat(hash, value.RadiusTopLeft)
      hash = HashFloat(hash, value.RadiusTopRight)
      hash = HashFloat(hash, value.RadiusBottomRight)
      hash = HashFloat(hash, value.RadiusBottomLeft)
      hash = Mix(hash, uint64(value.Color))
      hash = HashFloat(hash, value.Opacity)
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(perEdgeBorderCount))
    index = 0
    while index < perEdgeBorderCount {
      let value = perEdgeBorders[index]
      hash = HashBounds(hash, value.Bounds)
      hash = HashFloat(hash, value.TopWidth)
      hash = HashFloat(hash, value.RightWidth)
      hash = HashFloat(hash, value.BottomWidth)
      hash = HashFloat(hash, value.LeftWidth)
      if value.RadiusTopLeft != 0.0F || value.RadiusTopRight != 0.0F
        || value.RadiusBottomRight != 0.0F || value.RadiusBottomLeft != 0.0F {
          hash = Mix(hash, 1uL)
          hash = HashFloat(hash, value.RadiusTopLeft)
          hash = HashFloat(hash, value.RadiusTopRight)
          hash = HashFloat(hash, value.RadiusBottomRight)
          hash = HashFloat(hash, value.RadiusBottomLeft)
        }
      hash = Mix(hash, uint64(value.TopColor))
      hash = Mix(hash, uint64(value.RightColor))
      hash = Mix(hash, uint64(value.BottomColor))
      hash = Mix(hash, uint64(value.LeftColor))
      hash = Mix(hash, uint64(value.Style))
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(gradientStopCount))
    index = 0
    while index < gradientStopCount {
      let value = gradientStops[index]
      hash = HashFloat(hash, value.Offset)
      hash = Mix(hash, uint64(value.Color))
      index = index + 1
    }
    hash = Mix(hash, uint64(linearGradientCount))
    index = 0
    while index < linearGradientCount {
      let value = linearGradients[index]
      hash = HashBounds(hash, value.Bounds)
      hash = HashFloat(hash, value.RadiusTopLeft)
      hash = HashFloat(hash, value.RadiusTopRight)
      hash = HashFloat(hash, value.RadiusBottomRight)
      hash = HashFloat(hash, value.RadiusBottomLeft)
      hash = HashFloat(hash, value.StartX)
      hash = HashFloat(hash, value.StartY)
      hash = HashFloat(hash, value.EndX)
      hash = HashFloat(hash, value.EndY)
      hash = Mix(hash, uint64(value.StopStart))
      hash = Mix(hash, uint64(value.StopCount))
      hash = HashFloat(hash, value.Opacity)
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(radialGradientCount))
    index = 0
    while index < radialGradientCount {
      let value = radialGradients[index]
      hash = HashBounds(hash, value.Bounds)
      hash = HashFloat(hash, value.RadiusTopLeft)
      hash = HashFloat(hash, value.RadiusTopRight)
      hash = HashFloat(hash, value.RadiusBottomRight)
      hash = HashFloat(hash, value.RadiusBottomLeft)
      hash = HashFloat(hash, value.CenterX)
      hash = HashFloat(hash, value.CenterY)
      hash = HashFloat(hash, value.RadiusX)
      hash = HashFloat(hash, value.RadiusY)
      hash = Mix(hash, uint64(value.StopStart))
      hash = Mix(hash, uint64(value.StopCount))
      hash = HashFloat(hash, value.Opacity)
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(cachedImageCount))
    index = 0
    while index < cachedImageCount {
      let value = cachedImages[index]
      hash = HashBounds(hash, value.Bounds)
      hash = HashResource(hash, value.ImageId)
      hash = HashResource(hash, value.SamplerId)
      hash = HashFloat(hash, value.SourceX)
      hash = HashFloat(hash, value.SourceY)
      hash = HashFloat(hash, value.SourceWidth)
      hash = HashFloat(hash, value.SourceHeight)
      hash = HashFloat(hash, value.Opacity)
      hash = Mix(hash, uint64(value.Sampling))
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(cachedGlyphRunCount))
    index = 0
    while index < cachedGlyphRunCount {
      let value = cachedGlyphRuns[index]
      hash = HashBounds(hash, value.Bounds)
      hash = HashResource(hash, value.GlyphRunId)
      hash = HashResource(hash, value.AtlasId)
      hash = Mix(hash, uint64(value.GlyphId))
      hash = Mix(hash, uint64(value.AtlasTexelOffset))
      hash = Mix(hash, uint64(value.AtlasTexelCount))
      hash = HashFloat(hash, value.GlyphMinX)
      hash = HashFloat(hash, value.GlyphMinY)
      hash = HashFloat(hash, value.GlyphMaxX)
      hash = HashFloat(hash, value.GlyphMaxY)
      hash = Mix(hash, uint64(value.Color))
      hash = Mix(hash, uint64(value.RenderMode))
      hash = Mix(hash, uint64(value.EffectMode))
      hash = HashFloat(hash, value.EffectRadius)
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(pathMeshCount))
    index = 0
    while index < pathMeshCount {
      let value = pathMeshes[index]
      hash = HashBounds(hash, value.Bounds)
      hash = HashResource(hash, value.MeshId)
      hash = HashResource(hash, value.FillBrushId)
      hash = HashResource(hash, value.StrokeBrushId)
      hash = Mix(hash, uint64(value.FillRule))
      hash = HashFloat(hash, value.StrokeWidth)
      hash = Mix(hash, uint64(value.StrokeColor))
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(transformCount))
    index = 0
    while index < transformCount {
      let value = transforms[index]
      hash = HashFloat(hash, value.A)
      hash = HashFloat(hash, value.B)
      hash = HashFloat(hash, value.C)
      hash = HashFloat(hash, value.D)
      hash = HashFloat(hash, value.TX)
      hash = HashFloat(hash, value.TY)
      hash = Mix(hash, uint64(value.ParentIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(rectClipCount))
    index = 0
    while index < rectClipCount {
      let value = rectClips[index]
      hash = HashBounds(hash, value.Bounds)
      hash = Mix(hash, uint64(value.TransformIndex))
      hash = Mix(hash, uint64(value.ParentIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(shadowCount))
    index = 0
    while index < shadowCount {
      let value = shadows[index]
      hash = HashBounds(hash, value.Bounds)
      hash = HashFloat(hash, value.RadiusTopLeft)
      hash = HashFloat(hash, value.RadiusTopRight)
      hash = HashFloat(hash, value.RadiusBottomRight)
      hash = HashFloat(hash, value.RadiusBottomLeft)
      hash = HashFloat(hash, value.OffsetX)
      hash = HashFloat(hash, value.OffsetY)
      hash = HashFloat(hash, value.Spread)
      hash = HashFloat(hash, value.Blur)
      hash = Mix(hash, uint64(value.Color))
      hash = HashResource(hash, value.MaskId)
      hash = Mix(hash, value.Inset ? 1uL : 0uL)
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(underlineCount))
    index = 0
    while index < underlineCount {
      let value = underlines[index]
      hash = HashBounds(hash, value.Bounds)
      hash = HashFloat(hash, value.Thickness)
      hash = Mix(hash, uint64(value.Color))
      hash = Mix(hash, uint64(value.Mode))
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(customMeshCount))
    index = 0
    while index < customMeshCount {
      let value = customMeshes[index]
      hash = HashBounds(hash, value.Bounds)
      hash = HashResource(hash, value.MeshId)
      hash = HashResource(hash, value.PipelineId)
      hash = Mix(hash, uint64(value.VertexCount))
      hash = Mix(hash, uint64(value.IndexCount))
      hash = Mix(hash, uint64(value.Topology))
      hash = HashFloat(hash, value.Opacity)
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    hash = Mix(hash, uint64(layerCount))
    index = 0
    while index < layerCount {
      let value = layers[index]
      hash = HashBounds(hash, value.Bounds)
      hash = HashFloat(hash, value.Opacity)
      hash = Mix(hash, uint64(value.BlendMode))
      hash = HashResource(hash, value.OffscreenTargetId)
      hash = Mix(hash, uint64(value.Flags))
      hash = Mix(hash, uint64(value.TransformIndex))
      index = index + 1
    }
    return hash
  }

  private func AddRectClip(value RectClipRecord, begin bool) int32 {
    RequireOpenChunk()
    ValidateTransformIndex(value.TransformIndex)
    ValidateRectClipParentIndex(value.ParentIndex)
    GrowRectClips(NextCount(rectClipCount))
    let index = rectClipCount
    rectClips[index] = value
    rectClipCount = NextCount(rectClipCount)
    recordOperations = recordOperations + 1uL
    AppendDrawRef(DrawRef{
      Kind: begin ? SceneDrawKind.RectClipBegin : SceneDrawKind.RectClipEnd,
      Index: index,
      Flags: 0u,
    })
    return index
  }

  private func AddLayer(value LayerRecord, begin bool) int32 {
    RequireOpenChunk()
    ValidateTransformIndex(value.TransformIndex)
    GrowLayers(NextCount(layerCount))
    let index = layerCount
    layers[index] = value
    layerCount = NextCount(layerCount)
    recordOperations = recordOperations + 1uL
    AppendResourceIfValid(value.OffscreenTargetId)
    AppendDrawRef(DrawRef{
      Kind: begin ? SceneDrawKind.LayerBegin : SceneDrawKind.LayerEnd,
      Index: index,
      Flags: 0u,
    })
    return index
  }

  private func AppendDrawRef(value DrawRef) int32 {
    RequireOpenChunk()
    GrowDrawRefs(NextCount(drawRefCount))
    let index = drawRefCount
    drawRefs[index] = value
    drawRefCount = NextCount(drawRefCount)
    drawReferenceOperations = drawReferenceOperations + 1uL
    return index
  }

  private func AppendResourceReference(value ResourceId) int32 {
    RequireOpenChunk()
    GrowResourceRefs(NextCount(resourceRefCount))
    let index = resourceRefCount
    resourceRefs[index] = value
    resourceRefCount = NextCount(resourceRefCount)
    resourceReferenceOperations = resourceReferenceOperations + 1uL
    return index
  }

  private func AppendResourceIfValid(value ResourceId) {
    if value.IsValid {
      AppendResourceReference(value)
    }
  }

  private func RequireOpenChunk() {
    if activeChunk < 0 || activeChunk >= chunkCount {
      throw InvalidOperationException("SceneFrame requires an open chunk")
    }
  }

  private func RequireClosedChunk() {
    if activeChunk >= 0 {
      throw InvalidOperationException("SceneFrame has an open chunk")
    }
  }

  private func NextCount(current int32) int32 {
    if current >= Int32.MaxValue {
      throw OverflowException("SceneFrame count overflow")
    }
    return current + 1
  }

  private func ValidateGradientRange(start int32, count int32) {
    if start < 0 || count < 2 || count > 4
      || start > gradientStopCount || count > gradientStopCount - start{
        throw ArgumentOutOfRangeException("gradient stop range")
      }
  }

  private func ValidateTransformIndex(index int32) {
    if index == -1 { return }
    if index < 0 || index >= transformCount {
      throw ArgumentOutOfRangeException("transform index")
    }
  }

  private func ValidateTransformParentIndex(index int32) {
    ValidateTransformIndex(index)
  }

  private func ValidateRectClipParentIndex(index int32) {
    if index == -1 { return }
    if index < 0 || index >= rectClipCount {
      throw ArgumentOutOfRangeException("rect clip parent index")
    }
  }

  private func GrowthCapacity(current int32, required int32) int32 {
    if required <= current { return current }
    var next = current
    while next < required {
      if next > Int32.MaxValue / 2 {
        next = required
        break
      }
      next = next * 2
    }
    return next
  }

  private func Mix(hash uint64, value uint64) uint64 -> (hash ^ value) * HashPrime

  private func HashFloat(hash uint64, value float32) uint64 -> Mix(hash, uint64(uint32(BitConverter.SingleToInt32Bits(value))))

  private func HashResource(hash uint64, value ResourceId) uint64 {
    var result = Mix(hash, uint64(int32(value.Kind)))
    result = Mix(result, value.LogicalId)
    return Mix(result, value.Version)
  }

  private func HashBounds(hash uint64, value ConservativeBounds) uint64 {
    var result = HashFloat(hash, value.X)
    result = HashFloat(result, value.Y)
    result = HashFloat(result, value.Width)
    return HashFloat(result, value.Height)
  }
}
