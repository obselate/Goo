package Goo

import System
import System.Collections.Generic
import System.Runtime.CompilerServices

internal sealed class VulkanTextAtlasGlyph {
    internal prop ByteOffset uint32 { get; init; }
    internal prop ByteLength uint32 { get; init; }
    internal prop Scale int32 { get; init; }
    internal prop Extents VulkanTextGlyphExtents { get; init; }

    internal init() {
    }
}

internal unsafe sealed class VulkanTextScene {
    private const AtlasId uint64 = 1uL
    private let atlas VulkanTextAtlas
    private let bytes []uint8
    private let glyphs Dictionary[string, VulkanTextAtlasGlyph]
    private var nextByteOffset uint32
    private var uploadDirty bool
    private var glyphMembershipFrozen bool

    internal prop Atlas VulkanTextAtlas { get { return atlas } }

    internal init(nativeAtlas VulkanTextAtlas) {
        if nativeAtlas == nil {
            throw ArgumentNullException("nativeAtlas")
        }
        atlas = nativeAtlas
        if nativeAtlas.ByteSize > uint64(Int32.MaxValue) {
            throw ArgumentOutOfRangeException("nativeAtlas")
        }
        bytes = [int32(nativeAtlas.ByteSize)]uint8
        glyphs = Dictionary[string, VulkanTextAtlasGlyph]()
    }

    internal func PrepareUpload() {
        if !uploadDirty || atlas.UploadPending {
            return
        }
        fixed source *uint8 = bytes {
            if !atlas.QueueUpload(source, atlas.ByteSize) {
                throw InvalidOperationException("Vulkan text atlas upload was not queued")
            }
        }
        uploadDirty = false
        glyphMembershipFrozen = true
    }

    internal func RestoreUpload() {
        uploadDirty = true
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
                        guard let glyph = GetGlyph(run, glyphId) else { return false }
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
                            let transformIndex = frame.AddTransform(TransformRecord{
                                A: scale,
                                B: 0.0F,
                                C: 0.0F,
                                D: -scale,
                                TX: originX,
                                TY: originY,
                                ParentIndex: parentTransformIndex,
                            })
                            frame.AddCachedGlyphRun(CachedGlyphRunRefRecord{
                                Bounds: bounds,
                                GlyphRunId: ResourceId{
                                    Kind: SceneResourceKind.GlyphRun,
                                    LogicalId: uint64(glyph.ByteOffset / 8u) + 1uL,
                                    Version: 1uL,
                                },
                                AtlasId: ResourceId{
                                    Kind: SceneResourceKind.Atlas,
                                    LogicalId: AtlasId,
                                    Version: 1uL,
                                },
                                GlyphId: glyphId,
                                AtlasTexelOffset: glyph.ByteOffset / 8u,
                                AtlasTexelCount: glyph.ByteLength / 8u,
                                GlyphMinX: minX,
                                GlyphMinY: minY,
                                GlyphMaxX: maxX,
                                GlyphMaxY: maxY,
                                Color: color,
                                RenderMode: 2u,
                                TransformIndex: transformIndex,
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
        let key = run.Family + "|" + RuntimeHelpers.GetHashCode(run.Font).ToString()
            + "|" + glyphId.ToString()
        if glyphs.TryGetValue(key, out var existing) {
            return existing
        }
        if glyphMembershipFrozen {
            return nil
        }
        let encoded = run.Font.EncodeGlyph(glyphId)
        if (encoded.Bytes.Length & 7) != 0 {
            throw InvalidOperationException("Vulkan text glyph encoding is not texel aligned")
        }
        let required = uint64(nextByteOffset) + uint64(encoded.Bytes.Length)
        if required > atlas.ByteSize {
            throw InvalidOperationException("Vulkan text atlas capacity is exhausted")
        }
        var index int32 = 0
        while index < encoded.Bytes.Length {
            bytes[int32(nextByteOffset) + index] = encoded.Bytes[index]
            index = index + 1
        }
        let result = VulkanTextAtlasGlyph{
            ByteOffset: nextByteOffset,
            ByteLength: uint32(encoded.Bytes.Length),
            Scale: encoded.Scale,
            Extents: encoded.Extents,
        }
        glyphs.Add(key, result)
        nextByteOffset = nextByteOffset + uint32(encoded.Bytes.Length)
        if encoded.Bytes.Length != 0 {
            uploadDirty = true
        }
        return result
    }
}
