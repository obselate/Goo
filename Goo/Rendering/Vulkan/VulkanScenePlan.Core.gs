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
    private var cachedTextSegments []CachedTextSegmentRefRecord
    private var cachedTextSegmentCount int32
    private var analyticPathBands []AnalyticPathBandRecord
    private var analyticPathBandCount int32
    private var transforms []TransformRecord
    private var transformCount int32
    private var rectClips []RectClipRecord
    private var rectClipCount int32
    private var clipMasks []ClipMaskRecord
    private var clipMaskCount int32
    private var clipChains []ClipChainRecord
    private var clipChainCount int32
    private var shadows []ShadowRecord
    private var shadowCount int32
    private var underlines []UnderlineRecord
    private var underlineCount int32
    private var lavas []LavaRecord
    private var lavaCount int32
    private var customMeshes []CustomMeshRecord
    private var customMeshCount int32
    private var layers []LayerRecord
    private var layerCount int32
    private var shaderEffects []ShaderEffectRecord
    private var shaderEffectCount int32

    private var activeChunk int32
    private var activeClipChainId int32
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
        cachedTextSegments = [capacity]CachedTextSegmentRefRecord
        analyticPathBands = [capacity]AnalyticPathBandRecord
        transforms = [capacity]TransformRecord
        rectClips = [capacity]RectClipRecord
        clipMasks = [capacity]ClipMaskRecord
        clipChains = [capacity]ClipChainRecord
        shadows = [capacity]ShadowRecord
        underlines = [capacity]UnderlineRecord
        lavas = [capacity]LavaRecord
        customMeshes = [capacity]CustomMeshRecord
        layers = [capacity]LayerRecord
        shaderEffects = [capacity]ShaderEffectRecord
        activeChunk = -1
        activeClipChainId = 0
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
    internal prop CachedTextSegments []CachedTextSegmentRefRecord { get { return cachedTextSegments } }
    internal prop CachedTextSegmentCount int32 { get { return cachedTextSegmentCount } }
    internal prop AnalyticPathBands []AnalyticPathBandRecord { get { return analyticPathBands } }
    internal prop AnalyticPathBandCount int32 { get { return analyticPathBandCount } }
    internal prop Transforms []TransformRecord { get { return transforms } }
    internal prop TransformCount int32 { get { return transformCount } }
    internal prop RectClips []RectClipRecord { get { return rectClips } }
    internal prop RectClipCount int32 { get { return rectClipCount } }
    internal prop ClipMasks []ClipMaskRecord { get { return clipMasks } }
    internal prop ClipMaskCount int32 { get { return clipMaskCount } }
    internal prop ClipChains []ClipChainRecord { get { return clipChains } }
    internal prop ClipChainCount int32 { get { return clipChainCount } }
    internal prop Shadows []ShadowRecord { get { return shadows } }
    internal prop ShadowCount int32 { get { return shadowCount } }
    internal prop Underlines []UnderlineRecord { get { return underlines } }
    internal prop UnderlineCount int32 { get { return underlineCount } }
    internal prop Lavas []LavaRecord { get { return lavas } }
    internal prop LavaCount int32 { get { return lavaCount } }
    internal prop CustomMeshes []CustomMeshRecord { get { return customMeshes } }
    internal prop CustomMeshCount int32 { get { return customMeshCount } }
    internal prop Layers []LayerRecord { get { return layers } }
    internal prop LayerCount int32 { get { return layerCount } }
    internal prop ShaderEffects []ShaderEffectRecord { get { return shaderEffects } }
    internal prop ShaderEffectCount int32 { get { return shaderEffectCount } }
    internal prop ActiveChunk int32 { get { return activeChunk } }
    internal prop ActiveClipChainId int32 { get { return activeClipChainId } }
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
        var shaderIndex int32 = 0
        while shaderIndex < shaderEffectCount {
            shaderEffects[shaderIndex] = ShaderEffectRecord{}
            shaderIndex = shaderIndex + 1
        }
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
        cachedTextSegmentCount = 0
        analyticPathBandCount = 0
        transformCount = 0
        rectClipCount = 0
        clipMaskCount = 0
        clipChainCount = 1
        clipChains[0] = ClipChainRecord{
            StableId: 0uL,
            ParentIndex: -1,
            MaskIndex: -1,
            Depth: 0,
            Flags: uint32(SceneClipChainFlags.None),
            ContentKey: 0uL,
        }
        shadowCount = 0
        underlineCount = 0
        lavaCount = 0
        customMeshCount = 0
        layerCount = 0
        shaderEffectCount = 0
        activeChunk = -1
        activeClipChainId = 0
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
            RetentionState: SceneChunkRetentionState.Generic,
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
        let completedChunk = activeChunk
        let chunk = chunks[completedChunk]
        chunks[completedChunk] = SceneChunk{
            OwnerId: chunk.OwnerId,
            Version: chunk.Version,
            Bounds: chunk.Bounds,
            FirstDraw: chunk.FirstDraw,
            DrawCount: drawRefCount - chunk.FirstDraw,
            FirstResource: chunk.FirstResource,
            ResourceCount: resourceRefCount - chunk.FirstResource,
            ContentKey: 0uL,
            TopologyKey: 0uL,
            Dirty: chunk.Dirty,
            RetentionState: chunk.RetentionState,
        }
        activeChunk = -1
        let finalized = chunks[completedChunk]
        chunks[completedChunk] = SceneChunk{
            OwnerId: finalized.OwnerId,
            Version: finalized.Version,
            Bounds: finalized.Bounds,
            FirstDraw: finalized.FirstDraw,
            DrawCount: finalized.DrawCount,
            FirstResource: finalized.FirstResource,
            ResourceCount: finalized.ResourceCount,
            ContentKey: chunk.RetentionState == SceneChunkRetentionState.ExactLeafHit
                ? 0uL
                : ChunkContentDigest(completedChunk),
            TopologyKey: chunk.RetentionState == SceneChunkRetentionState.ExactLeafHit
                ? 0uL
                : ChunkTopologyDigest(completedChunk),
            Dirty: finalized.Dirty,
            RetentionState: finalized.RetentionState,
        }
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
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.SolidBox, Index: index, Flags: 0u, ClipChainId: 0 })
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
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.RoundedBox, Index: index, Flags: 0u, ClipChainId: 0 })
        return index
    }

    internal func AppendRetainedSolidLeaf(ownerId uint64, version uint64,
        bounds ConservativeBounds, value SolidBoxRecord) int32 {
        let chunk = BeginChunk(ownerId, version, bounds, true)
        AddSolidBox(value)
        EndChunk()
        chunks[chunk].RetentionState = SceneChunkRetentionState.ExactLeafHit
        return chunk
    }

    internal func AppendRetainedRoundedLeaf(ownerId uint64, version uint64,
        bounds ConservativeBounds, value RoundedBoxRecord) int32 {
        let chunk = BeginChunk(ownerId, version, bounds, true)
        AddRoundedBox(value)
        EndChunk()
        chunks[chunk].RetentionState = SceneChunkRetentionState.ExactLeafHit
        return chunk
    }

    internal func AppendRetainedBorderLeaf(ownerId uint64, version uint64,
        bounds ConservativeBounds, value PerEdgeBorderRecord) int32 {
        let chunk = BeginChunk(ownerId, version, bounds, true)
        AddPerEdgeBorder(value)
        EndChunk()
        chunks[chunk].RetentionState = SceneChunkRetentionState.ExactLeafHit
        return chunk
    }

    internal func AddPerEdgeBorder(value PerEdgeBorderRecord) int32 {
        RequireOpenChunk()
        ValidateTransformIndex(value.TransformIndex)
        GrowPerEdgeBorders(NextCount(perEdgeBorderCount))
        let index = perEdgeBorderCount
        perEdgeBorders[index] = value
        perEdgeBorderCount = NextCount(perEdgeBorderCount)
        recordOperations = recordOperations + 1uL
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.PerEdgeBorder, Index: index, Flags: 0u, ClipChainId: 0 })
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
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.LinearGradient, Index: index, Flags: 0u, ClipChainId: 0 })
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
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.RadialGradient, Index: index, Flags: 0u, ClipChainId: 0 })
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
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.CachedImage, Index: index, Flags: 0u, ClipChainId: 0 })
        return index
    }

    internal func AddCachedTextSegment(value CachedTextSegmentRefRecord) int32 {
        RequireOpenChunk()
        guard let segment = value.Segment else {
            throw ArgumentNullException("segment")
        }
        if value.SegmentId == 0uL || value.SegmentId != segment.Id
            || value.SegmentVersion == 0uL || value.SegmentVersion != segment.Version
            || value.GlyphCount <= 0 || value.GlyphCount != segment.GlyphCount
            || value.ClipChainId < 0 || value.ClipChainId != segment.ClipChainId
            || value.FirstInstance != -1
            || segment.AtlasGeneration == 0uL
            || segment.RecordCount != segment.GlyphCount
            || segment.RecordCount <= 0 || segment.RecordCount > segment.Records.Length
            || segment.GlyphResourceCount != segment.GlyphCount
            || segment.GlyphResourceCount > segment.GlyphResources.Length
            || segment.GlyphAtlasTexelOffsets.Length < segment.GlyphCount
            || segment.GlyphAtlasTexelCounts.Length < segment.GlyphCount
            || segment.GlyphEffectAtlasTexelOffsets.Length < segment.GlyphCount
            || segment.GlyphEffectAtlasTexelCounts.Length < segment.GlyphCount
            || segment.RunCount <= 0 || segment.RunCount > segment.Runs.Length {
            throw ArgumentException("cached text segment is invalid")
        }
        ValidateTextBounds(value.Bounds)
        ValidateTextBounds(segment.Bounds)
        if value.Bounds.X != segment.Bounds.X || value.Bounds.Y != segment.Bounds.Y
            || value.Bounds.Width != segment.Bounds.Width
            || value.Bounds.Height != segment.Bounds.Height {
            throw ArgumentException("cached text segment bounds do not match")
        }
        var glyphIndex int32 = 0
        while glyphIndex < segment.GlyphCount {
            let glyphResource = segment.GlyphResources[glyphIndex]
            if !glyphResource.IsValid || glyphResource.Kind != SceneResourceKind.GlyphRun {
                throw ArgumentException("cached text segment glyph resource is invalid")
            }
            ValidateTextInstance(segment.Records[glyphIndex], value.ClipChainId)
            AppendResourceReference(glyphResource)
            glyphIndex = glyphIndex + 1
        }
        var runIndex int32 = 0
        var expectedFirst int32 = 0
        while runIndex < segment.RunCount {
            let run = segment.Runs[runIndex]
            if run.FirstInstance != expectedFirst
                || run.InstanceCount <= 0
                || run.InstanceCount > segment.GlyphCount - expectedFirst
                || !run.AtlasId.IsValid || run.AtlasId.Kind != SceneResourceKind.Atlas
                || run.PipelineKind > 1u {
                throw ArgumentException("cached text segment run is invalid")
            }
            expectedFirst = expectedFirst + run.InstanceCount
            AppendResourceReference(run.AtlasId)
            runIndex = runIndex + 1
        }
        if expectedFirst != segment.GlyphCount {
            throw ArgumentException("cached text segment run count is invalid")
        }
        GrowCachedTextSegments(NextCount(cachedTextSegmentCount))
        let index = cachedTextSegmentCount
        cachedTextSegments[index] = value
        cachedTextSegmentCount = NextCount(cachedTextSegmentCount)
        recordOperations = recordOperations + 1uL
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.CachedTextSegment, Index: index,
            Flags: 0u, ClipChainId: value.ClipChainId })
        return index
    }


    internal func AddAnalyticPathBand(value AnalyticPathBandRecord) int32 {
        RequireOpenChunk()
        ValidateTransformIndex(value.TransformIndex)
        if value.AtlasWordCount == 0u {
            throw ArgumentOutOfRangeException("atlas word count")
        }
        if value.ScaleX == 0.0F || value.ScaleY == 0.0F {
            throw ArgumentOutOfRangeException("path scale")
        }
        GrowAnalyticPathBands(NextCount(analyticPathBandCount))
        let index = analyticPathBandCount
        analyticPathBands[index] = value
        analyticPathBandCount = NextCount(analyticPathBandCount)
        recordOperations = recordOperations + 1uL
        AppendResourceIfValid(value.PathId)
        AppendResourceIfValid(value.AtlasId)
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.AnalyticPathBand, Index: index, Flags: 0u, ClipChainId: 0 })
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
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.Transform, Index: index, Flags: 0u, ClipChainId: 0 })
        return index
    }

    internal func AddRectClipBegin(value RectClipRecord) int32 {
        return AddRectClip(value, true)
    }

    internal func AddRectClipEnd(value RectClipRecord) int32 {
        return AddRectClip(value, false)
    }

    internal func AddClipMask(value ClipMaskRecord) int32 {
        RequireOpenChunk()
        ValidateTransformIndex(value.TransformIndex)
        if value.AtlasWordCount == 0u || !value.PathId.IsValid || !value.AtlasId.IsValid {
            throw ArgumentOutOfRangeException("clip mask resources")
        }
        GrowClipMasks(NextCount(clipMaskCount))
        let index = clipMaskCount
        clipMasks[index] = value
        clipMaskCount = NextCount(clipMaskCount)
        recordOperations = recordOperations + 1uL
        AppendResourceIfValid(value.PathId)
        AppendResourceIfValid(value.AtlasId)
        return index
    }

    internal func AddClipChain(value ClipChainRecord) int32 {
        RequireOpenChunk()
        ValidateClipChainParentIndex(value.ParentIndex)
        if value.Depth <= 0 || value.Depth > 8
            || value.MaskIndex < 0 || value.MaskIndex >= clipMaskCount {
            throw ArgumentOutOfRangeException("clip chain")
        }
        GrowClipChains(NextCount(clipChainCount))
        let index = clipChainCount
        clipChains[index] = value
        clipChainCount = NextCount(clipChainCount)
        recordOperations = recordOperations + 1uL
        return index
    }

    internal func AddZeroClipChain(parentIndex int32, stableId uint64, contentKey uint64) int32 {
        RequireOpenChunk()
        ValidateClipChainParentIndex(parentIndex)
        let parentDepth = parentIndex == 0 ? 0 : clipChains[parentIndex].Depth
        if parentDepth >= 8 {
            throw ArgumentOutOfRangeException("clip chain depth")
        }
        GrowClipChains(NextCount(clipChainCount))
        let index = clipChainCount
        clipChains[index] = ClipChainRecord{
            StableId: stableId,
            ParentIndex: parentIndex,
            MaskIndex: -1,
            Depth: parentDepth + 1,
            Flags: uint32(SceneClipChainFlags.Zero),
            ContentKey: contentKey,
        }
        clipChainCount = NextCount(clipChainCount)
        recordOperations = recordOperations + 1uL
        return index
    }

    internal func SetActiveClipChain(value int32) {
        ValidateClipChainIndex(value)
        activeClipChainId = value
    }

    internal func AddShadow(value ShadowRecord) int32 {
        RequireOpenChunk()
        ValidateTransformIndex(value.TransformIndex)
        if value.MaskIndex < -1 || value.MaskIndex >= clipMaskCount {
            throw ArgumentOutOfRangeException("shadow mask index")
        }
        GrowShadows(NextCount(shadowCount))
        let index = shadowCount
        shadows[index] = value
        shadowCount = NextCount(shadowCount)
        recordOperations = recordOperations + 1uL
        AppendResourceIfValid(value.MaskId)
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.Shadow, Index: index, Flags: 0u,
            ClipChainId: activeClipChainId })
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
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.Underline, Index: index, Flags: 0u, ClipChainId: 0 })
        return index
    }

    internal func AddLava(value LavaRecord) int32 {
        RequireOpenChunk()
        ValidateTransformIndex(value.TransformIndex)
        GrowLavas(NextCount(lavaCount))
        let index = lavaCount
        lavas[index] = value
        lavaCount = NextCount(lavaCount)
        recordOperations = recordOperations + 1uL
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.Lava, Index: index, Flags: 0u,
            ClipChainId: 0 })
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
        AppendDrawRef(DrawRef{ Kind: SceneDrawKind.CustomMesh, Index: index, Flags: 0u, ClipChainId: 0 })
        return index
    }

    internal func AddLayerBegin(value LayerRecord) int32 {
        return AddLayer(value, true)
    }

    internal func AddLayerEnd(value LayerRecord) int32 {
        return AddLayer(value, false)
    }

    internal func AddShaderEffect(value ShaderEffectSnapshot) int32 {
        RequireOpenChunk()
        if value.Program == nil || value.ProgramId == 0uL || value.Version == 0uL {
            throw ArgumentException("shader effect snapshot is invalid")
        }
        GrowShaderEffects(NextCount(shaderEffectCount))
        let index = shaderEffectCount
        shaderEffects[index] = ShaderEffectRecord{
            Program: value.Program,
            ProgramId: value.ProgramId,
            Version: value.Version,
            SamplesBackdrop: value.SamplesBackdrop,
            Parameter0: value.Parameter0,
            Parameter1: value.Parameter1,
            Parameter2: value.Parameter2,
            Parameter3: value.Parameter3,
            Parameter4: value.Parameter4,
            Parameter5: value.Parameter5,
            Parameter6: value.Parameter6,
            Parameter7: value.Parameter7,
        }
        shaderEffectCount = NextCount(shaderEffectCount)
        recordOperations = recordOperations + 1uL
        return index
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

    internal func GrowCachedTextSegments(required int32) {
        if required <= cachedTextSegments.Length { return }
        let next = GrowthCapacity(cachedTextSegments.Length, required)
        let expanded = [next]CachedTextSegmentRefRecord
        var index int32 = 0
        while index < cachedTextSegmentCount {
            expanded[index] = cachedTextSegments[index]
            index = index + 1
        }
        cachedTextSegments = expanded
        growthOperations = growthOperations + 1uL
    }


    internal func GrowAnalyticPathBands(required int32) {
        if required <= analyticPathBands.Length { return }
        let next = GrowthCapacity(analyticPathBands.Length, required)
        let expanded = [next]AnalyticPathBandRecord
        var index int32 = 0
        while index < analyticPathBandCount {
            expanded[index] = analyticPathBands[index]
            index = index + 1
        }
        analyticPathBands = expanded
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

    internal func GrowClipMasks(required int32) {
        if required <= clipMasks.Length { return }
        let next = GrowthCapacity(clipMasks.Length, required)
        let expanded = [next]ClipMaskRecord
        var index int32 = 0
        while index < clipMaskCount {
            expanded[index] = clipMasks[index]
            index = index + 1
        }
        clipMasks = expanded
        growthOperations = growthOperations + 1uL
    }

    internal func GrowClipChains(required int32) {
        if required <= clipChains.Length { return }
        let next = GrowthCapacity(clipChains.Length, required)
        let expanded = [next]ClipChainRecord
        var index int32 = 0
        while index < clipChainCount {
            expanded[index] = clipChains[index]
            index = index + 1
        }
        clipChains = expanded
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

    internal func GrowLavas(required int32) {
        if required <= lavas.Length { return }
        let next = GrowthCapacity(lavas.Length, required)
        let expanded = [next]LavaRecord
        var index int32 = 0
        while index < lavaCount {
            expanded[index] = lavas[index]
            index = index + 1
        }
        lavas = expanded
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

    internal func GrowShaderEffects(required int32) {
        if required <= shaderEffects.Length { return }
        let next = GrowthCapacity(shaderEffects.Length, required)
        let expanded = [next]ShaderEffectRecord
        var index int32 = 0
        while index < shaderEffectCount {
            expanded[index] = shaderEffects[index]
            index = index + 1
        }
        shaderEffects = expanded
        growthOperations = growthOperations + 1uL
    }

    private func ValidateTextBounds(value ConservativeBounds) {
        if Single.IsNaN(value.X) || Single.IsInfinity(value.X)
            || Single.IsNaN(value.Y) || Single.IsInfinity(value.Y)
            || Single.IsNaN(value.Width) || Single.IsInfinity(value.Width)
            || Single.IsNaN(value.Height) || Single.IsInfinity(value.Height)
            || value.Width <= 0.0F || value.Height <= 0.0F {
            throw ArgumentException("cached text segment bounds are invalid")
        }
    }

    private func ValidateTextInstance(
        value HbGpuTextInstanceRecord,
        clipChainId int32) {
        if Single.IsNaN(value.transform_m00) || Single.IsInfinity(value.transform_m00)
            || Single.IsNaN(value.transform_m01) || Single.IsInfinity(value.transform_m01)
            || Single.IsNaN(value.transform_m02) || Single.IsInfinity(value.transform_m02)
            || Single.IsNaN(value.transform_m03) || Single.IsInfinity(value.transform_m03)
            || Single.IsNaN(value.transform_m10) || Single.IsInfinity(value.transform_m10)
            || Single.IsNaN(value.transform_m11) || Single.IsInfinity(value.transform_m11)
            || Single.IsNaN(value.transform_m12) || Single.IsInfinity(value.transform_m12)
            || Single.IsNaN(value.transform_m13) || Single.IsInfinity(value.transform_m13)
            || Single.IsNaN(value.transform_m20) || Single.IsInfinity(value.transform_m20)
            || Single.IsNaN(value.transform_m21) || Single.IsInfinity(value.transform_m21)
            || Single.IsNaN(value.transform_m22) || Single.IsInfinity(value.transform_m22)
            || Single.IsNaN(value.transform_m23) || Single.IsInfinity(value.transform_m23)
            || Single.IsNaN(value.transform_m30) || Single.IsInfinity(value.transform_m30)
            || Single.IsNaN(value.transform_m31) || Single.IsInfinity(value.transform_m31)
            || Single.IsNaN(value.transform_m32) || Single.IsInfinity(value.transform_m32)
            || Single.IsNaN(value.transform_m33) || Single.IsInfinity(value.transform_m33) {
            throw ArgumentException("cached text segment transform is invalid")
        }
        if value.glyphBounds_x >= value.glyphBounds_z
            || value.glyphBounds_y >= value.glyphBounds_w
            || Single.IsNaN(value.glyphBounds_x)
            || Single.IsInfinity(value.glyphBounds_x)
            || Single.IsNaN(value.glyphBounds_y)
            || Single.IsInfinity(value.glyphBounds_y)
            || Single.IsNaN(value.glyphBounds_z)
            || Single.IsInfinity(value.glyphBounds_z)
            || Single.IsNaN(value.glyphBounds_w)
            || Single.IsInfinity(value.glyphBounds_w)
            || value.glyphInput_y > 3u
            || value.glyphInput_z != uint32(clipChainId)
            || Single.IsNaN(value.foreground_x)
            || Single.IsInfinity(value.foreground_x)
            || Single.IsNaN(value.foreground_y)
            || Single.IsInfinity(value.foreground_y)
            || Single.IsNaN(value.foreground_z)
            || Single.IsInfinity(value.foreground_z)
            || Single.IsNaN(value.foreground_w)
            || Single.IsInfinity(value.foreground_w)
            || value.foreground_w < 0.0F || value.foreground_w > 1.0F
            || Single.IsNaN(value.effectParams_x)
            || Single.IsInfinity(value.effectParams_x)
            || value.effectParams_x < 0.0F {
            throw ArgumentException("cached text segment instance is invalid")
        }
    }

}
