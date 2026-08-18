package Goo

import System

internal partial class SceneFrame {
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

    internal prop Chunks []SceneChunk { get { return chunks } }
    internal prop ChunkCount int32 { get { return chunkCount } }
    internal prop DrawRefs []DrawRef { get { return drawRefs } }
    internal prop DrawRefCount int32 { get { return drawRefCount } }
    internal prop ResourceRefs []ResourceId { get { return resourceRefs } }
    internal prop ResourceRefCount int32 { get { return resourceRefCount } }
    internal prop SolidBoxes []SolidBoxRecord { get { return solidBoxes } }
    internal prop SolidBoxCount int32 { get { return solidBoxCount } }
    internal prop RoundedBoxes []RoundedBoxRecord { get { return roundedBoxes } }
    internal prop RoundedBoxCount int32 { get { return roundedBoxCount } }
    internal prop PerEdgeBorders []PerEdgeBorderRecord { get { return perEdgeBorders } }
    internal prop PerEdgeBorderCount int32 { get { return perEdgeBorderCount } }
    internal prop GradientStops []GradientStopRecord { get { return gradientStops } }
    internal prop GradientStopCount int32 { get { return gradientStopCount } }
    internal prop LinearGradients []LinearGradientRecord { get { return linearGradients } }
    internal prop LinearGradientCount int32 { get { return linearGradientCount } }
    internal prop RadialGradients []RadialGradientRecord { get { return radialGradients } }
    internal prop RadialGradientCount int32 { get { return radialGradientCount } }
    internal prop CachedImages []CachedImageRefRecord { get { return cachedImages } }
    internal prop CachedImageCount int32 { get { return cachedImageCount } }
    internal prop CachedGlyphRuns []CachedGlyphRunRefRecord { get { return cachedGlyphRuns } }
    internal prop CachedGlyphRunCount int32 { get { return cachedGlyphRunCount } }
    internal prop PathMeshes []PrebuiltPathMeshRefRecord { get { return pathMeshes } }
    internal prop PathMeshCount int32 { get { return pathMeshCount } }
    internal prop Transforms []TransformRecord { get { return transforms } }
    internal prop TransformCount int32 { get { return transformCount } }
    internal prop RectClips []RectClipRecord { get { return rectClips } }
    internal prop RectClipCount int32 { get { return rectClipCount } }
    internal prop Shadows []ShadowRecord { get { return shadows } }
    internal prop ShadowCount int32 { get { return shadowCount } }
    internal prop Underlines []UnderlineRecord { get { return underlines } }
    internal prop UnderlineCount int32 { get { return underlineCount } }
    internal prop CustomMeshes []CustomMeshRecord { get { return customMeshes } }
    internal prop CustomMeshCount int32 { get { return customMeshCount } }
    internal prop Layers []LayerRecord { get { return layers } }
    internal prop LayerCount int32 { get { return layerCount } }
    internal prop ActiveChunk int32 { get { return activeChunk } }
    internal prop GrowthOperations uint64 { get { return growthOperations } }
    internal prop RecordOperations uint64 { get { return recordOperations } }
    internal prop Counters ScenePlanCounters {
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

    internal func AddRectClipBegin(value RectClipRecord) int32 {
        return AddRectClip(value, true)
    }

    internal func AddRectClipEnd(value RectClipRecord) int32 {
        return AddRectClip(value, false)
    }

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

    internal func AddLayerBegin(value LayerRecord) int32 {
        return AddLayer(value, true)
    }

    internal func AddLayerEnd(value LayerRecord) int32 {
        return AddLayer(value, false)
    }

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

}
