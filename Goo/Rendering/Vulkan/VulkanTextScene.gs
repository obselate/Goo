package Goo

import System
import System.Collections.Generic

internal data struct VulkanTextAtlasGlyphKey(Family string, Provider VulkanTextProvider, GlyphId uint32) { }

internal sealed class VulkanTextSceneAtlasState {
    internal var Atlas VulkanTextAtlas
    internal var Identity ResourceId
    internal let Bytes []uint8
    internal let Keys []VulkanTextAtlasGlyphKey
    internal var NextByteOffset uint32
    internal var PublishedBytePrefix uint32
    internal var QueuedBytePrefix uint32
    internal var UploadQueued bool
    internal var KeyCount int32

    internal init(nativeAtlas VulkanTextAtlas, identity ResourceId) {
        Atlas = nativeAtlas
        Identity = identity
        if nativeAtlas.ByteSize > uint64(Int32.MaxValue) {
            throw ArgumentOutOfRangeException("nativeAtlas")
        }
        Bytes = [int32(nativeAtlas.ByteSize)]uint8
        Keys = [int32(nativeAtlas.ByteSize / 8uL)]VulkanTextAtlasGlyphKey
    }

    internal func Reset(nativeAtlas VulkanTextAtlas, identity ResourceId) {
        Atlas = nativeAtlas
        Identity = identity
        NextByteOffset = 0u
        PublishedBytePrefix = 0u
        QueuedBytePrefix = 0u
        UploadQueued = false
        KeyCount = 0
    }

    internal func AddKey(key VulkanTextAtlasGlyphKey) {
        if KeyCount >= Keys.Length {
            throw InvalidOperationException("Vulkan text atlas glyph key capacity is exhausted")
        }
        Keys[KeyCount] = key
        KeyCount = KeyCount + 1
    }
}

internal sealed class VulkanTextAtlasGlyph {
    internal prop AtlasId ResourceId { get; init; }
    internal prop ByteOffset uint32 { get; init; }
    internal prop ByteLength uint32 { get; init; }
    internal prop Scale int32 { get; init; }
    internal prop Extents VulkanTextGlyphExtents { get; init; }
    internal prop RenderMode uint32 { get; init; }

    internal init() {
    }
}

internal unsafe sealed class VulkanTextScene {
    private let atlasSet VulkanTextAtlasSet
    private let states []VulkanTextSceneAtlasState?
    private let glyphs Dictionary[VulkanTextAtlasGlyphKey, VulkanTextAtlasGlyph]
    private let glyphWorkspace VulkanTextProviderWorkspace
    private let activeAtlasUse []bool
    private var stateCount int32
    private var capacityExhausted bool
    private var redrawRequired bool
    private var completedGlobalSubmissionSerial uint64

    internal prop Atlas VulkanTextAtlas { get { return atlasSet.AtlasAt(0) } }
    internal prop Atlases VulkanTextAtlasSet { get { return atlasSet } }
    internal prop PublishedBytePrefix uint32 {
        get { return if stateCount == 0 { 0u } else { states[0]!!.PublishedBytePrefix } }
    }
    internal prop NextByteOffset uint32 {
        get { return if stateCount == 0 { 0u } else { states[0]!!.NextByteOffset } }
    }
    internal prop RedrawRequired bool { get { return redrawRequired } }

    internal init(nativeAtlases VulkanTextAtlasSet) {
        if nativeAtlases == nil {
            throw ArgumentNullException("nativeAtlases")
        }
        atlasSet = nativeAtlases
        states = [nativeAtlases.AtlasSlotCapacity]VulkanTextSceneAtlasState?
        glyphs = Dictionary[VulkanTextAtlasGlyphKey, VulkanTextAtlasGlyph]()
        activeAtlasUse = [nativeAtlases.AtlasSlotCapacity]bool
        let atlasBytes = nativeAtlases.AtlasAt(0).ByteSize
        if atlasBytes > uint64(Int32.MaxValue) {
            throw ArgumentOutOfRangeException("nativeAtlases")
        }
        glyphWorkspace = VulkanTextProviderWorkspace([int32(atlasBytes)]uint8)
        EnsureAtlasStates()
    }

    internal func BeginCompile(completedSerial uint64) {
        redrawRequired = false
        capacityExhausted = false
        completedGlobalSubmissionSerial = completedSerial
        Array.Clear(activeAtlasUse, 0, activeAtlasUse.Length)
    }

    internal func PrepareUpload() {
        EnsureAtlasStates()
        var stateIndex int32 = 0
        while stateIndex < states.Length {
            if atlasSet.IsActive(stateIndex) {
                guard let state = states[stateIndex] else {
                    throw InvalidOperationException("Vulkan text atlas state is not resident")
                }
                if state.UploadQueued && !state.Atlas.UploadPending {
                    state.PublishedBytePrefix = state.QueuedBytePrefix
                    state.QueuedBytePrefix = state.PublishedBytePrefix
                    state.UploadQueued = false
                }
                if !state.Atlas.UploadPending {
                    if state.NextByteOffset < state.PublishedBytePrefix {
                        throw InvalidOperationException("Vulkan text atlas published prefix is invalid")
                    }
                    if state.NextByteOffset != state.PublishedBytePrefix {
                        let uploadByteOffset = state.PublishedBytePrefix
                        let uploadByteCount = state.NextByteOffset - uploadByteOffset
                        fixed source *uint8 = state.Bytes {
                            if !state.Atlas.QueueUpload(source, uint64(uploadByteOffset),
                                uint64(uploadByteCount)) {
                                throw InvalidOperationException("Vulkan text atlas upload was not queued")
                            }
                        }
                        state.QueuedBytePrefix = state.NextByteOffset
                        state.UploadQueued = true
                    }
                }
            }
            stateIndex = stateIndex + 1
        }
    }

    internal func RestoreUpload() {
        var stateIndex int32 = 0
        while stateIndex < states.Length {
            if atlasSet.IsActive(stateIndex) {
                guard let state = states[stateIndex] else {
                    throw InvalidOperationException("Vulkan text atlas state is not resident")
                }
                let stats = state.Atlas.Stats
                if state.UploadQueued && !stats.UploadSubmitted {
                    state.QueuedBytePrefix = state.PublishedBytePrefix
                    state.UploadQueued = false
                }
            }
            stateIndex = stateIndex + 1
        }
    }

    internal func Emit(
        frame SceneFrame,
        node Node,
        opacity float32,
        parentTransformIndex int32) bool {
        if node.Color.A <= 0.0F || opacity <= 0.0F {
            return true
        }
        let layout = TextLayouts.For(node, TextLayouts.ContentWidth(node))
        if layout.Rich != nil {
            return false
        }
        let contentX = TextLayouts.ContentLeft(node)
        let contentY = TextLayouts.ContentTop(node)
        let contentWidth = TextLayouts.ContentWidth(node)
        let lineHeight = TextLayouts.resolvedLineHeight(node)
        let natural = layout.Descent - layout.Ascent
        let leading = (lineHeight - natural) * 0.5F
        let color = Color.FromNormalized(node.Color.R, node.Color.G, node.Color.B,
            node.Color.A * opacity).ToPackedRgba()
        var lineIndex int32 = 0
        while lineIndex < layout.Lines.Count {
            let line = layout.Lines[lineIndex]
            guard let shape = line.Shape else {
                lineIndex = lineIndex + 1
                continue
            }
            let baseline = contentY + float32(lineIndex) * lineHeight + leading - layout.Ascent
            let lineX = contentX + TextLayouts.lineOffset(node, line, contentWidth)
            for run in shape.Runs {
                var glyphIndex int32 = 0
                while glyphIndex < run.Glyphs.Length {
                    let glyphId = run.Glyphs[glyphIndex]
                    if glyphId != 0u {
                        guard let glyph = GetGlyph(run, glyphId) else {
                            redrawRequired = true
                            glyphIndex = glyphIndex + 1
                            continue
                        }
                        MarkActiveAtlas(glyph)
                        if !CanRender(glyph) {
                            redrawRequired = true
                            glyphIndex = glyphIndex + 1
                            continue
                        }
                        let extents = glyph.Extents
                        let minX = float32(extents.XBearing)
                        let minY = float32(extents.YBearing + extents.Height)
                        let maxX = float32(extents.XBearing + extents.Width)
                        let maxY = float32(extents.YBearing)
                        if glyph.ByteLength != 0u && maxX > minX && maxY > minY {
                            if glyph.Scale <= 0 {
                                return false
                            }
                            let scale = layout.FontSize / float32(glyph.Scale)
                            let point = run.Points[glyphIndex]
                            let originX = lineX + point.X
                            let originY = baseline - point.Y
                            let glyphMinX = originX + minX * scale
                            let glyphMinY = originY - maxY * scale
                            let glyphMaxX = originX + maxX * scale
                            let glyphMaxY = originY - minY * scale
                            let bounds = ConservativeBounds{
                                X: glyphMinX,
                                Y: glyphMinY,
                                Width: glyphMaxX - glyphMinX,
                                Height: glyphMaxY - glyphMinY,
                            }
                            frame.AddCachedGlyphRun(CachedGlyphRunRefRecord{
                                Bounds: bounds,
                                GlyphRunId: ResourceId{
                                    Kind: SceneResourceKind.GlyphRun,
                                    LogicalId: glyph.AtlasId.LogicalId,
                                    Version: uint64(glyph.ByteOffset / 8u) + 1uL,
                                },
                                AtlasId: glyph.AtlasId,
                                GlyphId: glyphId,
                                AtlasTexelOffset: glyph.ByteOffset / 8u,
                                AtlasTexelCount: glyph.ByteLength / 8u,
                                GlyphMinX: minX,
                                GlyphMinY: minY,
                                GlyphMaxX: maxX,
                                GlyphMaxY: maxY,
                                Color: color,
                                RenderMode: glyph.RenderMode,
                                TransformIndex: frame.AddTransform(TransformRecord{
                                    A: scale,
                                    B: 0.0F,
                                    C: 0.0F,
                                    D: -scale,
                                    TX: originX,
                                    TY: originY,
                                    ParentIndex: parentTransformIndex,
                                }),
                            })
                        }
                    }
                    glyphIndex = glyphIndex + 1
                }
            }
            lineIndex = lineIndex + 1
        }
        return true
    }

    private func GetGlyph(run ShapedRun, glyphId uint32) VulkanTextAtlasGlyph? {
        let key = VulkanTextAtlasGlyphKey(run.Family, run.Provider, glyphId)
        var existingFound = false
        if glyphs.TryGetValue(key, out var existing) {
            let existingIndex = atlasSet.FindIndex(existing.AtlasId)
            if existingIndex >= 0 {
                return existing
            }
            existingFound = true
        }
        if capacityExhausted {
            throw InvalidOperationException("Vulkan text atlas capacity is exhausted")
        }
        var renderMode uint32 = 2u
        var providerResult VulkanTextProviderResult
        let hasColorGlyph = (run.Provider.HasColorPaint() && run.Provider.GlyphHasColorPaint(glyphId))
            || (run.Provider.HasColorLayers() && run.Provider.GlyphHasColorLayers(glyphId))
        if hasColorGlyph {
            providerResult = run.Provider.EncodePaintGlyphInto(glyphId, 0u, glyphWorkspace)
            if providerResult.Status == VulkanTextProviderAbi.Success {
                renderMode = 3u
            } else if providerResult.Status == VulkanTextProviderAbi.CapacityExceeded {
                throw InvalidOperationException("Vulkan text color glyph exceeds workspace capacity")
            } else {
                providerResult = run.Provider.EncodeGlyphInto(glyphId, glyphWorkspace)
            }
        } else {
            providerResult = run.Provider.EncodeGlyphInto(glyphId, glyphWorkspace)
        }
        if providerResult.AbiVersion != VulkanTextProviderAbi.Version {
            throw InvalidOperationException("Vulkan text provider ABI version is invalid")
        }
        if providerResult.Status == VulkanTextProviderAbi.CapacityExceeded {
            throw InvalidOperationException("Vulkan text glyph exceeds workspace capacity")
        }
        if providerResult.Status != VulkanTextProviderAbi.Success {
            throw InvalidOperationException("Vulkan text glyph encoding failed")
        }
        if providerResult.Count < 0 || (providerResult.Count & 7) != 0 {
            throw InvalidOperationException("Vulkan text glyph encoding is not texel aligned")
        }
        var state = CurrentState()
        if uint64(state.NextByteOffset) + uint64(providerResult.Count) > state.Atlas.ByteSize
            || state.KeyCount >= state.Keys.Length {
            if atlasSet.AtlasCount >= atlasSet.AtlasSlotCapacity {
                if !RecycleAtlas() {
                    capacityExhausted = true
                    throw InvalidOperationException("Vulkan text atlas capacity is exhausted")
                }
                state = CurrentState()
            } else {
                let newIndex = atlasSet.CreateAtlas()
                EnsureAtlasStates()
                state = states[newIndex]!!
            }
            if uint64(providerResult.Count) > state.Atlas.ByteSize {
                capacityExhausted = true
                throw InvalidOperationException("Vulkan text glyph exceeds atlas capacity")
            }
        }
        let byteOffset = state.NextByteOffset
        if byteOffset > uint32(Int32.MaxValue) {
            throw InvalidOperationException("Vulkan text atlas byte offset exceeds managed array limits")
        }
        if uint64(byteOffset) + uint64(providerResult.Count) > uint64(state.Bytes.Length) {
            throw InvalidOperationException("Vulkan text atlas byte range exceeds managed array limits")
        }
        if state.KeyCount >= state.Keys.Length {
            capacityExhausted = true
            throw InvalidOperationException("Vulkan text atlas glyph key capacity is exhausted")
        }
        Array.Copy(glyphWorkspace.ByteBuffer, 0, state.Bytes, int32(byteOffset), providerResult.Count)
        let result = VulkanTextAtlasGlyph{
            AtlasId: state.Identity,
            ByteOffset: byteOffset,
            ByteLength: uint32(providerResult.Count),
            Scale: glyphWorkspace.GlyphScale,
            Extents: glyphWorkspace.GlyphExtents,
            RenderMode: renderMode,
        }
        if existingFound {
            glyphs[key] = result
        } else {
            glyphs.Add(key, result)
        }
        state.AddKey(key)
        state.NextByteOffset = byteOffset + uint32(providerResult.Count)
        return result
    }

    private func CanRender(glyph VulkanTextAtlasGlyph) bool {
        let index = atlasSet.FindIndex(glyph.AtlasId)
        if index < 0 || index >= states.Length {
            throw InvalidOperationException("Vulkan text atlas identity is not resident")
        }
        guard let state = states[index] else {
            throw InvalidOperationException("Vulkan text atlas state is not resident")
        }
        let glyphEnd = uint64(glyph.ByteOffset) + uint64(glyph.ByteLength)
        if glyphEnd <= uint64(state.PublishedBytePrefix) {
            return true
        }
        if state.UploadQueued && glyphEnd <= uint64(state.QueuedBytePrefix) {
            return true
        }
        return false
    }

    private func CurrentState() VulkanTextSceneAtlasState {
        EnsureAtlasStates()
        let index = atlasSet.CurrentAtlasIndex
        guard let state = states[index] else {
            throw InvalidOperationException("Vulkan current text atlas state is unavailable")
        }
        return state
    }

    private func EnsureAtlasStates() {
        var index int32 = 0
        while index < states.Length {
            if atlasSet.IsActive(index) && states[index] == nil {
                states[index] = VulkanTextSceneAtlasState(
                    atlasSet.AtlasAt(index), atlasSet.IdentityAt(index))
                stateCount = stateCount + 1
            }
            index = index + 1
        }
    }

    private func RecycleAtlas() bool {
        EnsureAtlasStates()
        let index = atlasSet.FindReclaimable(
            completedGlobalSubmissionSerial, activeAtlasUse)
        if index < 0 {
            return false
        }
        guard let state = states[index] else {
            throw InvalidOperationException("Vulkan reclaimable text atlas state is unavailable")
        }
        let identity = atlasSet.RecycleAtlas(index, completedGlobalSubmissionSerial)
        var keyIndex int32 = 0
        while keyIndex < state.KeyCount {
            glyphs.Remove(state.Keys[keyIndex])
            state.Keys[keyIndex] = VulkanTextAtlasGlyphKey{}
            keyIndex = keyIndex + 1
        }
        state.Reset(atlasSet.AtlasAt(index), identity)
        capacityExhausted = false
        return true
    }

    private func MarkActiveAtlas(glyph VulkanTextAtlasGlyph) {
        let index = atlasSet.FindIndex(glyph.AtlasId)
        if index >= 0 && index < activeAtlasUse.Length {
            activeAtlasUse[index] = true
        }
    }
}
