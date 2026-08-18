package Goo

import System

internal partial class SceneFrame {
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
            || start > gradientStopCount || count > gradientStopCount - start {
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

    private func Mix(hash uint64, value uint64) uint64 {
        return (hash ^ value) * HashPrime
    }

    private func HashFloat(hash uint64, value float32) uint64 {
        return Mix(hash, uint64(uint32(BitConverter.SingleToInt32Bits(value))))
    }

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
