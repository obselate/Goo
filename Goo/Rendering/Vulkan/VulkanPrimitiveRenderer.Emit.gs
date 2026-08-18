package Goo

import System
import System.IO
import System.Runtime.InteropServices

internal unsafe partial class VulkanPrimitiveRenderer : IDisposable {
    private func ValidateChunk(frame SceneFrame, value SceneChunk) {
        if value.FirstDraw < 0 || value.DrawCount < 0
            || value.FirstDraw > frame.DrawRefCount
            || value.DrawCount > frame.DrawRefCount - value.FirstDraw {
            throw ArgumentOutOfRangeException("scene chunk draw range")
        }
        if value.FirstResource < 0 || value.ResourceCount < 0
            || value.FirstResource > frame.ResourceRefCount
            || value.ResourceCount > frame.ResourceRefCount - value.FirstResource {
            throw ArgumentOutOfRangeException("scene chunk resource range")
        }
        ValidateBounds(value.Bounds)
    }

    private func ValidateRectClip(frame SceneFrame, value RectClipRecord, extent VkExtent2D) {
        ResolveRectClip(frame, value, extent)
    }

    private func ResolveRectClip(frame SceneFrame, value RectClipRecord, extent VkExtent2D) PrimitiveClip {
        ValidateBounds(value.Bounds)
        ValidateTransformIndex(frame, value.TransformIndex)
        if value.ParentIndex < -1 || value.ParentIndex >= frame.RectClipCount {
            throw ArgumentOutOfRangeException("clip parent index")
        }
        let transform = ResolveTransform(frame, value.TransformIndex)
        if transform.B != 0.0F || transform.C != 0.0F {
            throw NotSupportedException("Vulkan primitive renderer requires axis-aligned rectangular clips")
        }
        return ResolveClip(value.Bounds, transform, extent)
    }

    private func ValidateGradientStops(frame SceneFrame, start int32, count int32) {
        if count < 2 || count > MaxGradientStops || start < 0
            || start > frame.GradientStopCount - count {
            throw NotSupportedException("Vulkan primitive renderer requires two to four gradient stops")
        }
        let first = frame.GradientStops[start]
        let second = frame.GradientStops[start + 1]
        ValidateFinite(first.Offset, "gradient stop offset")
        ValidateFinite(second.Offset, "gradient stop offset")
        if first.Offset < 0.0F || first.Offset > 1.0F
            || second.Offset < 0.0F || second.Offset > 1.0F
            || first.Offset > second.Offset {
            throw ArgumentOutOfRangeException("gradient stop range")
        }
        if count >= 3 {
            let third = frame.GradientStops[start + 2]
            ValidateFinite(third.Offset, "gradient stop offset")
            if third.Offset < 0.0F || third.Offset > 1.0F || second.Offset > third.Offset {
                throw ArgumentOutOfRangeException("gradient stop range")
            }
        }
        if count >= 4 {
            let fourth = frame.GradientStops[start + 3]
            ValidateFinite(fourth.Offset, "gradient stop offset")
            if fourth.Offset < 0.0F || fourth.Offset > 1.0F {
                throw ArgumentOutOfRangeException("gradient stop range")
            }
            if count >= 3 {
                let third = frame.GradientStops[start + 2]
                if third.Offset > fourth.Offset {
                    throw ArgumentOutOfRangeException("gradient stop range")
                }
            }
        }
    }

    private func ValidateTransformRecord(value TransformRecord, count int32) {
        ValidateFinite(value.A, "transform a")
        ValidateFinite(value.B, "transform b")
        ValidateFinite(value.C, "transform c")
        ValidateFinite(value.D, "transform d")
        ValidateFinite(value.TX, "transform tx")
        ValidateFinite(value.TY, "transform ty")
        if value.ParentIndex < -1 || value.ParentIndex >= count {
            throw ArgumentOutOfRangeException("transform parent index")
        }
    }

    private func ValidateTransformIndex(frame SceneFrame, index int32) {
        if index < -1 || index >= frame.TransformCount {
            throw ArgumentOutOfRangeException("transform index")
        }
    }

    private func ValidateBounds(value ConservativeBounds) {
        ValidateFinite(value.X, "bounds x")
        ValidateFinite(value.Y, "bounds y")
        ValidateFinite(value.Width, "bounds width")
        ValidateFinite(value.Height, "bounds height")
        ValidateFinite(value.Right, "bounds right")
        ValidateFinite(value.Bottom, "bounds bottom")
        if value.Width < 0.0F || value.Height < 0.0F {
            throw ArgumentOutOfRangeException("bounds size")
        }
    }

    private func ValidateOpacity(value float32) {
        ValidateFinite(value, "opacity")
        if value < 0.0F || value > 1.0F {
            throw ArgumentOutOfRangeException("opacity")
        }
    }

    private func ValidateRadius(value float32) {
        ValidateFinite(value, "radius")
        if value < 0.0F {
            throw ArgumentOutOfRangeException("radius")
        }
    }

    private func ValidateFinite(value float32, name string) {
        if Single.IsNaN(value) || Single.IsInfinity(value) {
            throw ArgumentException("Vulkan primitive renderer requires finite values", name)
        }
    }

    private func RequireRecordIndex(index int32, count int32, name string) {
        if index < 0 || index >= count {
            throw ArgumentOutOfRangeException(name)
        }
    }

    private func EmitSolid(
        commandBuffer VkCommandBuffer,
        extent VkExtent2D,
        bounds ConservativeBounds,
        radiusTopLeft float32,
        radiusTopRight float32,
        radiusBottomRight float32,
        radiusBottomLeft float32,
        color uint32,
        opacity float32,
        transformIndex int32,
        frame SceneFrame) {
        ValidateBounds(bounds)
        ValidateRadius(radiusTopLeft)
        ValidateRadius(radiusTopRight)
        ValidateRadius(radiusBottomRight)
        ValidateRadius(radiusBottomLeft)
        ValidateOpacity(opacity)
        ValidateTransformIndex(frame, transformIndex)
        let transform = ResolveTransform(frame, transformIndex)
        if bounds.IsEmpty {
            return
        }
        EmitSolidResolved(commandBuffer, extent, bounds, radiusTopLeft, radiusTopRight,
            radiusBottomRight, radiusBottomLeft, color, opacity, transform)
    }

    private func EmitSolidResolved(
        commandBuffer VkCommandBuffer,
        extent VkExtent2D,
        bounds ConservativeBounds,
        radiusTopLeft float32,
        radiusTopRight float32,
        radiusBottomRight float32,
        radiusBottomLeft float32,
        color uint32,
        opacity float32,
        transform PrimitiveTransform) {
        var push = AnalyticSolidPushConstants{}
        FillTransform(&push, bounds, transform, extent)
        push.radii_x = radiusTopLeft
        push.radii_y = radiusTopRight
        push.radii_z = radiusBottomRight
        push.radii_w = radiusBottomLeft
        let packed = PackColor(color, opacity)
        push.packedColors_x = packed.Rgb
        push.packedColors_w = packed.Alpha
        BindAndDraw(commandBuffer, solidPipeline, *void(&push))
    }

    private func EmitBorder(
        commandBuffer VkCommandBuffer,
        extent VkExtent2D,
        value PerEdgeBorderRecord,
        frame SceneFrame) {
        let bounds = value.Bounds
        ValidateBounds(bounds)
        ValidateRadius(value.TopWidth)
        ValidateRadius(value.RightWidth)
        ValidateRadius(value.BottomWidth)
        ValidateRadius(value.LeftWidth)
        ValidateRadius(value.RadiusTopLeft)
        ValidateRadius(value.RadiusTopRight)
        ValidateRadius(value.RadiusBottomRight)
        ValidateRadius(value.RadiusBottomLeft)
        ValidateTransformIndex(frame, value.TransformIndex)
        let transform = ResolveTransform(frame, value.TransformIndex)
        if bounds.IsEmpty {
            return
        }
        let topWidth = ClampLength(value.TopWidth, bounds.Height)
        let bottomWidth = ClampLength(value.BottomWidth, Max(bounds.Height - topWidth, 0.0F))
        let rightWidth = ClampLength(value.RightWidth, bounds.Width)
        let leftWidth = ClampLength(value.LeftWidth, Max(bounds.Width - rightWidth, 0.0F))
        if value.Style != uint32(int32(BorderStyle.Solid))
            && value.Style != uint32(int32(BorderStyle.Dashed))
            && value.Style != uint32(int32(BorderStyle.Dotted)) {
            throw NotSupportedException("Vulkan primitive renderer received an unknown border style")
        }
        let rounded = value.RadiusTopLeft > 0.0F || value.RadiusTopRight > 0.0F
            || value.RadiusBottomRight > 0.0F || value.RadiusBottomLeft > 0.0F
        if value.Style != uint32(int32(BorderStyle.Solid)) || rounded {
            var push = AnalyticBorderPushConstants{}
            FillTransform(&push, bounds, transform, extent)
            push.widths_x = topWidth
            push.widths_y = rightWidth
            push.widths_z = bottomWidth
            push.widths_w = leftWidth
            push.radii_x = value.RadiusTopLeft
            push.radii_y = value.RadiusTopRight
            push.radii_z = value.RadiusBottomRight
            push.radii_w = value.RadiusBottomLeft
            push.params_x = 0.0F
            push.params_y = bounds.Width
            push.params_z = bounds.Width + bounds.Height
            push.params_w = bounds.Width + bounds.Height + bounds.Width
            let top = PackColor(value.TopColor, 1.0F)
            let right = PackColor(value.RightColor, 1.0F)
            let bottom = PackColor(value.BottomColor, 1.0F)
            let left = PackColor(value.LeftColor, 1.0F)
            push.packedColors_x = top.Rgb
            push.packedColors_y = right.Rgb
            push.packedColors_z = bottom.Rgb
            push.packedColors_w = PackAlphaTriplet(top.Alpha, right.Alpha, bottom.Alpha)
            push.packedColorsExtra_x = left.Rgb
            push.packedColorsExtra_y = left.Alpha
            push.packedColorsExtra_z = 0u
            push.packedColorsExtra_w = value.Style
            BindAndDraw(commandBuffer, borderPipeline, *void(&push))
            return
        }
        let interiorHeight = Max(bounds.Height - topWidth - bottomWidth, 0.0F)
        if topWidth > 0.0F {
            EmitSolidResolved(commandBuffer, extent, ConservativeBounds{
                X: bounds.X,
                Y: bounds.Y,
                Width: bounds.Width,
                Height: topWidth,
            }, 0.0F, 0.0F, 0.0F, 0.0F, value.TopColor, 1.0F, transform)
        }
        if rightWidth > 0.0F && interiorHeight > 0.0F {
            EmitSolidResolved(commandBuffer, extent, ConservativeBounds{
                X: bounds.X + bounds.Width - rightWidth,
                Y: bounds.Y + topWidth,
                Width: rightWidth,
                Height: interiorHeight,
            }, 0.0F, 0.0F, 0.0F, 0.0F, value.RightColor, 1.0F, transform)
        }
        if bottomWidth > 0.0F {
            EmitSolidResolved(commandBuffer, extent, ConservativeBounds{
                X: bounds.X,
                Y: bounds.Y + bounds.Height - bottomWidth,
                Width: bounds.Width,
                Height: bottomWidth,
            }, 0.0F, 0.0F, 0.0F, 0.0F, value.BottomColor, 1.0F, transform)
        }
        if leftWidth > 0.0F && interiorHeight > 0.0F {
            EmitSolidResolved(commandBuffer, extent, ConservativeBounds{
                X: bounds.X,
                Y: bounds.Y + topWidth,
                Width: leftWidth,
                Height: interiorHeight,
            }, 0.0F, 0.0F, 0.0F, 0.0F, value.LeftColor, 1.0F, transform)
        }
    }

    private func EmitLinear(
        commandBuffer VkCommandBuffer,
        extent VkExtent2D,
        value LinearGradientRecord,
        frame SceneFrame) {
        ValidateBounds(value.Bounds)
        ValidateFinite(value.StartX, "linear gradient start x")
        ValidateFinite(value.StartY, "linear gradient start y")
        ValidateFinite(value.EndX, "linear gradient end x")
        ValidateFinite(value.EndY, "linear gradient end y")
        ValidateRadius(value.RadiusTopLeft)
        ValidateRadius(value.RadiusTopRight)
        ValidateRadius(value.RadiusBottomRight)
        ValidateRadius(value.RadiusBottomLeft)
        ValidateOpacity(value.Opacity)
        ValidateTransformIndex(frame, value.TransformIndex)
        ValidateGradientStops(frame, value.StopStart, value.StopCount)
        let transform = ResolveTransform(frame, value.TransformIndex)
        if value.Bounds.IsEmpty {
            return
        }
        var push = AnalyticLinear4PushConstants{}
        FillTransform(&push, value.Bounds, transform, extent)
        push.radii_x = value.RadiusTopLeft
        push.radii_y = value.RadiusTopRight
        push.radii_z = value.RadiusBottomRight
        push.radii_w = value.RadiusBottomLeft
        let width = Max(value.Bounds.Width, 0.0001F)
        let height = Max(value.Bounds.Height, 0.0001F)
        push.params_x = (value.StartX - value.Bounds.X) / width
        push.params_y = (value.StartY - value.Bounds.Y) / height
        push.params_z = (value.EndX - value.Bounds.X) / width
        push.params_w = (value.EndY - value.Bounds.Y) / height
        FillLinearStops(&push, frame, value.StopStart, value.StopCount, value.Opacity)
        BindAndDraw(commandBuffer, linearPipeline, *void(&push))
    }

    private func EmitRadial(
        commandBuffer VkCommandBuffer,
        extent VkExtent2D,
        value RadialGradientRecord,
        frame SceneFrame) {
        ValidateBounds(value.Bounds)
        ValidateFinite(value.CenterX, "radial gradient center x")
        ValidateFinite(value.CenterY, "radial gradient center y")
        ValidateRadius(value.RadiusX)
        ValidateRadius(value.RadiusY)
        ValidateRadius(value.RadiusTopLeft)
        ValidateRadius(value.RadiusTopRight)
        ValidateRadius(value.RadiusBottomRight)
        ValidateRadius(value.RadiusBottomLeft)
        ValidateOpacity(value.Opacity)
        ValidateTransformIndex(frame, value.TransformIndex)
        ValidateGradientStops(frame, value.StopStart, value.StopCount)
        let transform = ResolveTransform(frame, value.TransformIndex)
        if value.Bounds.IsEmpty {
            return
        }
        var push = AnalyticRadial4PushConstants{}
        FillTransform(&push, value.Bounds, transform, extent)
        push.radii_x = value.RadiusTopLeft
        push.radii_y = value.RadiusTopRight
        push.radii_z = value.RadiusBottomRight
        push.radii_w = value.RadiusBottomLeft
        let width = Max(value.Bounds.Width, 0.0001F)
        let height = Max(value.Bounds.Height, 0.0001F)
        push.params_x = (value.CenterX - value.Bounds.X) / width
        push.params_y = (value.CenterY - value.Bounds.Y) / height
        push.params_z = Max(value.RadiusX / width, 0.0001F)
        push.params_w = Max(value.RadiusY / height, 0.0001F)
        FillRadialStops(&push, frame, value.StopStart, value.StopCount, value.Opacity)
        BindAndDraw(commandBuffer, radialPipeline, *void(&push))
    }

    private func EmitImage(
        commandBuffer VkCommandBuffer,
        extent VkExtent2D,
        value CachedImageRefRecord,
        frame SceneFrame) {
        if imageResources == nil {
            throw NotSupportedException("Vulkan primitive renderer has no image resources")
        }
        ValidateBounds(value.Bounds)
        ValidateOpacity(value.Opacity)
        ValidateTransformIndex(frame, value.TransformIndex)
        if !value.ImageId.IsValid || value.ImageId.Kind != SceneResourceKind.Image {
            throw ArgumentException("cached image id is not an image")
        }
        if !value.SamplerId.IsValid || value.SamplerId.Kind != SceneResourceKind.Sampler {
            throw ArgumentException("cached image sampler id is not a sampler")
        }
        if value.Sampling != 0u && value.Sampling != 1u {
            throw ArgumentOutOfRangeException("sampling")
        }
        let samplerMode = if value.Sampling == 0u {
            VulkanImageSamplerMode.Nearest
        } else {
            VulkanImageSamplerMode.Linear
        }
        ValidateFinite(value.SourceX, "cached image source x")
        ValidateFinite(value.SourceY, "cached image source y")
        ValidateFinite(value.SourceWidth, "cached image source width")
        ValidateFinite(value.SourceHeight, "cached image source height")
        if value.SourceX < 0.0F || value.SourceY < 0.0F
            || value.SourceWidth <= 0.0F || value.SourceHeight <= 0.0F
            || value.SourceX + value.SourceWidth > 1.0F
            || value.SourceY + value.SourceHeight > 1.0F {
            throw ArgumentOutOfRangeException("cached image source rectangle")
        }
        let lookup = imageResources!!.Lookup(value.ImageId, value.SamplerId, samplerMode,
            resourceGeneration)
        if !lookup.Found || !lookup.Renderable {
            throw InvalidOperationException("Vulkan cached image is not renderable")
        }
        if value.Bounds.IsEmpty {
            return
        }
        let transform = ResolveTransform(frame, value.TransformIndex)
        var push = SampledImagePushConstants{}
        FillTransform(&push, value.Bounds, transform, extent)
        push.radii_x = value.Opacity
        push.params_x = value.SourceX
        push.params_y = value.SourceY
        push.params_z = value.SourceWidth
        push.params_w = value.SourceHeight
        EnsureDescriptorLayout(pipelineLayout)
        let sameDescriptor = sampledDescriptorBound
            && SameResourceId(sampledImageId, value.ImageId)
            && SameResourceId(sampledSamplerId, value.SamplerId)
            && sampledSamplerMode == samplerMode
            && sampledGeneration == resourceGeneration
        if !sameDescriptor {
            imageResources!!.BindDescriptor(commandBuffer, pipelineLayout, value.ImageId,
                value.SamplerId, samplerMode, resourceGeneration)
            recordDescriptorChangeCount++
            sampledDescriptorBound = true
            sampledImageId = value.ImageId
            sampledSamplerId = value.SamplerId
            sampledSamplerMode = samplerMode
            sampledGeneration = resourceGeneration
        }
        if activePipeline != sampledPipeline {
            let bindPipeline = dispatch.vkCmdBindPipeline
            bindPipeline(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS, sampledPipeline)
            recordPipelineChangeCount++
            activePipeline = sampledPipeline
        }
        let pushConstants = dispatch.vkCmdPushConstants
        pushConstants(commandBuffer, pipelineLayout,
            uint32(VkConstants.VK_SHADER_STAGE_VERTEX_BIT)
                | uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT),
            0u, PushConstantSize, *void(&push))
        let draw = dispatch.vkCmdDraw
        draw(commandBuffer, 6u, 1u, 0u, 0u)
    }

    private func EmitText(
        commandBuffer VkCommandBuffer,
        extent VkExtent2D,
        value CachedGlyphRunRefRecord,
        frame SceneFrame) {
        if textAtlases == nil || textPipelineLayout == 0uL {
            throw NotSupportedException("Vulkan primitive renderer has no text atlas pipeline")
        }
        ValidateBounds(value.Bounds)
        ValidateTransformIndex(frame, value.TransformIndex)
        if !value.GlyphRunId.IsValid || value.GlyphRunId.Kind != SceneResourceKind.GlyphRun {
            throw ArgumentException("cached glyph run id is not a glyph run")
        }
        if !value.AtlasId.IsValid || value.AtlasId.Kind != SceneResourceKind.Atlas {
            throw ArgumentException("cached glyph atlas id is not an atlas")
        }
        var selectedPipeline VkPipeline = 0uL
        if value.RenderMode == 2u {
            selectedPipeline = textPipeline
        } else if value.RenderMode == 3u {
            selectedPipeline = textPaintPipeline
        } else {
            throw NotSupportedException("Vulkan text renderer supports only monochrome and COLR paint glyphs")
        }
        if selectedPipeline == 0uL {
            throw NotSupportedException("Vulkan primitive renderer has no selected text pipeline")
        }
        if value.Bounds.IsEmpty {
            return
        }
        let atlas = textAtlases!!.Resolve(value.AtlasId)
        let atlasTexelOffset = uint64(value.AtlasTexelOffset)
        let atlasTexelCount = uint64(value.AtlasTexelCount)
        let atlasTexelTotal = uint64(atlas.TexelCount)
        if atlasTexelCount == 0uL || atlasTexelOffset >= atlasTexelTotal {
            throw ArgumentOutOfRangeException("cached glyph atlas range")
        }
        let atlasTexelAvailable = atlasTexelTotal - atlasTexelOffset
        if atlasTexelCount > atlasTexelAvailable {
            throw ArgumentOutOfRangeException("cached glyph atlas range")
        }
        ValidateFinite(value.GlyphMinX, "cached glyph min x")
        ValidateFinite(value.GlyphMinY, "cached glyph min y")
        ValidateFinite(value.GlyphMaxX, "cached glyph max x")
        ValidateFinite(value.GlyphMaxY, "cached glyph max y")
        if value.GlyphMinX >= value.GlyphMaxX || value.GlyphMinY >= value.GlyphMaxY {
            throw ArgumentOutOfRangeException("cached glyph extents")
        }
        let transform = ResolveTransform(frame, value.TransformIndex)
        let width = float32(extent.width)
        let height = float32(extent.height)
        var push = HbGpuTextPushConstants{}
        push.transform_m00 = 2.0F * transform.A / width
        push.transform_m01 = 2.0F * transform.B / height
        push.transform_m02 = 0.0F
        push.transform_m03 = 0.0F
        push.transform_m10 = 2.0F * transform.C / width
        push.transform_m11 = 2.0F * transform.D / height
        push.transform_m12 = 0.0F
        push.transform_m13 = 0.0F
        push.transform_m20 = 0.0F
        push.transform_m21 = 0.0F
        push.transform_m22 = 1.0F
        push.transform_m23 = 0.0F
        push.transform_m30 = 2.0F * transform.TX / width - 1.0F
        push.transform_m31 = 2.0F * transform.TY / height - 1.0F
        push.transform_m32 = 0.0F
        push.transform_m33 = 1.0F
        push.viewport_x = width
        push.viewport_y = height
        push.viewport_z = 0.0F
        push.viewport_w = 0.0F
        push.glyphBounds_x = value.GlyphMinX
        push.glyphBounds_y = value.GlyphMinY
        push.glyphBounds_z = value.GlyphMaxX
        push.glyphBounds_w = value.GlyphMaxY
        push.glyphInput_x = value.AtlasTexelOffset
        push.glyphInput_y = 0u
        push.glyphInput_z = 0u
        push.glyphInput_w = 0u
        let rgba = int32(value.Color)
        let red = (rgba >> int32(24)) & int32(255)
        let green = (rgba >> int32(16)) & int32(255)
        let blue = (rgba >> int32(8)) & int32(255)
        let alpha = float32(rgba & int32(255)) / 255.0F
        if value.RenderMode == 2u {
            push.foreground_x = linearChannels[red] * alpha
            push.foreground_y = linearChannels[green] * alpha
            push.foreground_z = linearChannels[blue] * alpha
        } else {
            push.foreground_x = linearChannels[red]
            push.foreground_y = linearChannels[green]
            push.foreground_z = linearChannels[blue]
        }
        push.foreground_w = alpha
        EnsureDescriptorLayout(textPipelineLayout)
        if !textDescriptorBound || !SameResourceId(textAtlasId, value.AtlasId) {
            atlas.BindDescriptor(commandBuffer, textPipelineLayout)
            recordDescriptorChangeCount++
            textDescriptorBound = true
            textAtlasId = value.AtlasId
        }
        if activePipeline != selectedPipeline {
            let bindPipeline = dispatch.vkCmdBindPipeline
            bindPipeline(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS, selectedPipeline)
            recordPipelineChangeCount++
            activePipeline = selectedPipeline
        }
        let pushConstants = dispatch.vkCmdPushConstants
        pushConstants(commandBuffer, textPipelineLayout,
            uint32(VkConstants.VK_SHADER_STAGE_VERTEX_BIT)
                | uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT),
            0u, TextPushConstantSize, *void(&push))
        let draw = dispatch.vkCmdDraw
        draw(commandBuffer, 6u, 1u, 0u, 0u)
    }

    private func FillTransform(
        push *AnalyticSolidPushConstants,
        bounds ConservativeBounds,
        transform PrimitiveTransform,
        extent VkExtent2D) {
        push->rect_x = bounds.X
        push->rect_y = bounds.Y
        push->rect_z = bounds.Width
        push->rect_w = bounds.Height
        let width = float32(extent.width)
        let height = float32(extent.height)
        push->transform0_x = 2.0F * transform.A / width
        push->transform0_y = 2.0F * transform.C / width
        push->transform0_z = 2.0F * transform.TX / width - 1.0F
        push->transform0_w = 0.0F
        push->transform1_x = 2.0F * transform.B / height
        push->transform1_y = 2.0F * transform.D / height
        push->transform1_z = 2.0F * transform.TY / height - 1.0F
        push->transform1_w = 0.0F
    }

    private func FillTransform(
        push *AnalyticBorderPushConstants,
        bounds ConservativeBounds,
        transform PrimitiveTransform,
        extent VkExtent2D) {
        push->rect_x = bounds.X
        push->rect_y = bounds.Y
        push->rect_z = bounds.Width
        push->rect_w = bounds.Height
        let width = float32(extent.width)
        let height = float32(extent.height)
        push->transform0_x = 2.0F * transform.A / width
        push->transform0_y = 2.0F * transform.C / width
        push->transform0_z = 2.0F * transform.TX / width - 1.0F
        push->transform0_w = 0.0F
        push->transform1_x = 2.0F * transform.B / height
        push->transform1_y = 2.0F * transform.D / height
        push->transform1_z = 2.0F * transform.TY / height - 1.0F
        push->transform1_w = 0.0F
    }

    private func FillTransform(
        push *AnalyticLinear4PushConstants,
        bounds ConservativeBounds,
        transform PrimitiveTransform,
        extent VkExtent2D) {
        push->rect_x = bounds.X
        push->rect_y = bounds.Y
        push->rect_z = bounds.Width
        push->rect_w = bounds.Height
        let width = float32(extent.width)
        let height = float32(extent.height)
        push->transform0_x = 2.0F * transform.A / width
        push->transform0_y = 2.0F * transform.C / width
        push->transform0_z = 2.0F * transform.TX / width - 1.0F
        push->transform0_w = 0.0F
        push->transform1_x = 2.0F * transform.B / height
        push->transform1_y = 2.0F * transform.D / height
        push->transform1_z = 2.0F * transform.TY / height - 1.0F
        push->transform1_w = 0.0F
    }

    private func FillTransform(
        push *AnalyticRadial4PushConstants,
        bounds ConservativeBounds,
        transform PrimitiveTransform,
        extent VkExtent2D) {
        push->rect_x = bounds.X
        push->rect_y = bounds.Y
        push->rect_z = bounds.Width
        push->rect_w = bounds.Height
        let width = float32(extent.width)
        let height = float32(extent.height)
        push->transform0_x = 2.0F * transform.A / width
        push->transform0_y = 2.0F * transform.C / width
        push->transform0_z = 2.0F * transform.TX / width - 1.0F
        push->transform0_w = 0.0F
        push->transform1_x = 2.0F * transform.B / height
        push->transform1_y = 2.0F * transform.D / height
        push->transform1_z = 2.0F * transform.TY / height - 1.0F
        push->transform1_w = 0.0F
    }

    private func FillTransform(
        push *SampledImagePushConstants,
        bounds ConservativeBounds,
        transform PrimitiveTransform,
        extent VkExtent2D) {
        push->rect_x = bounds.X
        push->rect_y = bounds.Y
        push->rect_z = bounds.Width
        push->rect_w = bounds.Height
        let width = float32(extent.width)
        let height = float32(extent.height)
        push->transform0_x = 2.0F * transform.A / width
        push->transform0_y = 2.0F * transform.C / width
        push->transform0_z = 2.0F * transform.TX / width - 1.0F
        push->transform0_w = 0.0F
        push->transform1_x = 2.0F * transform.B / height
        push->transform1_y = 2.0F * transform.D / height
        push->transform1_z = 2.0F * transform.TY / height - 1.0F
        push->transform1_w = 0.0F
    }

    private func FillLinearStops(
        push *AnalyticLinear4PushConstants,
        frame SceneFrame,
        start int32,
        count int32,
        opacity float32) {
        let first = frame.GradientStops[start]
        let second = frame.GradientStops[start + 1]
        var third = second
        var fourth = second
        if count >= 3 {
            third = frame.GradientStops[start + 2]
        }
        if count >= 4 {
            fourth = frame.GradientStops[start + 3]
        }
        push->stopPositions_x = first.Offset
        push->stopPositions_y = second.Offset
        push->stopPositions_z = third.Offset
        push->stopPositions_w = fourth.Offset
        let packedFirst = PackColor(first.Color, opacity)
        let packedSecond = PackColor(second.Color, opacity)
        let packedThird = PackColor(third.Color, opacity)
        let packedFourth = PackColor(fourth.Color, opacity)
        push->packedColors_x = packedFirst.Rgb
        push->packedColors_y = packedSecond.Rgb
        push->packedColors_z = packedThird.Rgb
        push->packedColors_w = PackAlphaTriplet(packedFirst.Alpha, packedSecond.Alpha, packedThird.Alpha)
        push->packedColorsExtra_x = packedFourth.Rgb
        push->packedColorsExtra_y = packedFourth.Alpha
        push->packedColorsExtra_z = uint32(count)
        push->packedColorsExtra_w = 0u
    }

    private func FillRadialStops(
        push *AnalyticRadial4PushConstants,
        frame SceneFrame,
        start int32,
        count int32,
        opacity float32) {
        let first = frame.GradientStops[start]
        let second = frame.GradientStops[start + 1]
        var third = second
        var fourth = second
        if count >= 3 {
            third = frame.GradientStops[start + 2]
        }
        if count >= 4 {
            fourth = frame.GradientStops[start + 3]
        }
        push->stopPositions_x = first.Offset
        push->stopPositions_y = second.Offset
        push->stopPositions_z = third.Offset
        push->stopPositions_w = fourth.Offset
        let packedFirst = PackColor(first.Color, opacity)
        let packedSecond = PackColor(second.Color, opacity)
        let packedThird = PackColor(third.Color, opacity)
        let packedFourth = PackColor(fourth.Color, opacity)
        push->packedColors_x = packedFirst.Rgb
        push->packedColors_y = packedSecond.Rgb
        push->packedColors_z = packedThird.Rgb
        push->packedColors_w = PackAlphaTriplet(packedFirst.Alpha, packedSecond.Alpha, packedThird.Alpha)
        push->packedColorsExtra_x = packedFourth.Rgb
        push->packedColorsExtra_y = packedFourth.Alpha
        push->packedColorsExtra_z = uint32(count)
        push->packedColorsExtra_w = 0u
    }

    private func BindAndDraw(commandBuffer VkCommandBuffer, pipeline VkPipeline, pushData *void) {
        EnsureDescriptorLayout(pipelineLayout)
        if activePipeline != pipeline {
            let bindPipeline = dispatch.vkCmdBindPipeline
            bindPipeline(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS, pipeline)
            recordPipelineChangeCount++
            activePipeline = pipeline
        }
        let push = dispatch.vkCmdPushConstants
        push(commandBuffer, pipelineLayout,
            uint32(VkConstants.VK_SHADER_STAGE_VERTEX_BIT)
                | uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT),
            0u, PushConstantSize, pushData)
        let draw = dispatch.vkCmdDraw
        draw(commandBuffer, 6u, 1u, 0u, 0u)
    }

    private func EnsureDescriptorLayout(layout VkPipelineLayout) {
        if boundDescriptorLayout == layout {
            return
        }
        boundDescriptorLayout = layout
        sampledDescriptorBound = false
        sampledImageId = ResourceId{}
        sampledSamplerId = ResourceId{}
        sampledSamplerMode = VulkanImageSamplerMode.Nearest
        sampledGeneration = 0uL
        textDescriptorBound = false
        textAtlasId = ResourceId{}
    }

    private func SameResourceId(left ResourceId, right ResourceId) bool {
        return left.Kind == right.Kind
            && left.LogicalId == right.LogicalId
            && left.Version == right.Version
    }

    private func PushClip(commandBuffer VkCommandBuffer, clip PrimitiveClip) {
        if clipDepth >= clipStack.Length {
            throw InvalidOperationException("Vulkan primitive clip stack capacity exceeded")
        }
        var combined = clip
        if clipDepth > 0 {
            let parent = clipStack[clipDepth - 1]
            combined = Intersect(parent, clip)
        }
        clipStack[clipDepth] = combined
        clipDepth = clipDepth + 1
        SetScissor(commandBuffer, combined)
    }

    private func PopClip(commandBuffer VkCommandBuffer) {
        if clipDepth <= 0 {
            throw InvalidOperationException("Vulkan primitive clip stack underflow")
        }
        clipDepth = clipDepth - 1
        if clipDepth > 0 {
            SetScissor(commandBuffer, clipStack[clipDepth - 1])
        } else {
            var full = PrimitiveClip{
                Left: 0,
                Top: 0,
                Right: int32(activeExtent.width),
                Bottom: int32(activeExtent.height),
            }
            SetScissor(commandBuffer, full)
        }
    }

    private func ResolveClip(
        bounds ConservativeBounds,
        transform PrimitiveTransform,
        extent VkExtent2D) PrimitiveClip {
        if bounds.IsEmpty {
            return PrimitiveClip{ Left: 0, Top: 0, Right: 0, Bottom: 0 }
        }
        let x0 = transform.A * bounds.X + transform.C * bounds.Y + transform.TX
        let y0 = transform.B * bounds.X + transform.D * bounds.Y + transform.TY
        let x1 = transform.A * bounds.Right + transform.C * bounds.Bottom + transform.TX
        let y1 = transform.B * bounds.Right + transform.D * bounds.Bottom + transform.TY
        ValidateFinite(x0, "clip x0")
        ValidateFinite(y0, "clip y0")
        ValidateFinite(x1, "clip x1")
        ValidateFinite(y1, "clip y1")
        var leftValue = MathF.Floor(Min(x0, x1))
        var topValue = MathF.Floor(Min(y0, y1))
        var rightValue = MathF.Ceiling(Max(x0, x1))
        var bottomValue = MathF.Ceiling(Max(y0, y1))
        let width = float32(extent.width)
        let height = float32(extent.height)
        if leftValue < 0.0F { leftValue = 0.0F }
        if topValue < 0.0F { topValue = 0.0F }
        if rightValue < 0.0F { rightValue = 0.0F }
        if bottomValue < 0.0F { bottomValue = 0.0F }
        if leftValue > width { leftValue = width }
        if topValue > height { topValue = height }
        if rightValue > width { rightValue = width }
        if bottomValue > height { bottomValue = height }
        if rightValue < leftValue { rightValue = leftValue }
        if bottomValue < topValue { bottomValue = topValue }
        return PrimitiveClip{
            Left: int32(leftValue),
            Top: int32(topValue),
            Right: int32(rightValue),
            Bottom: int32(bottomValue),
        }
    }

    private func Intersect(first PrimitiveClip, second PrimitiveClip) PrimitiveClip {
        var result = PrimitiveClip{}
        result.Left = Max(first.Left, second.Left)
        result.Top = Max(first.Top, second.Top)
        result.Right = Min(first.Right, second.Right)
        result.Bottom = Min(first.Bottom, second.Bottom)
        if result.Right < result.Left { result.Right = result.Left }
        if result.Bottom < result.Top { result.Bottom = result.Top }
        return result
    }

    private func SetScissor(commandBuffer VkCommandBuffer, value PrimitiveClip) {
        var scissor = VkRect2D{}
        scissor.offset = VkOffset2D{}
        scissor.offset.x = value.Left
        scissor.offset.y = value.Top
        var width int32 = value.Right - value.Left
        var height int32 = value.Bottom - value.Top
        if width < 0 { width = 0 }
        if height < 0 { height = 0 }
        scissor.extent.width = uint32(width)
        scissor.extent.height = uint32(height)
        let setScissor = dispatch.vkCmdSetScissor
        setScissor(commandBuffer, 0u, 1u, &scissor)
    }

    private func ResolveTransform(frame SceneFrame, index int32) PrimitiveTransform {
        if index < -1 || index >= frame.TransformCount {
            throw ArgumentOutOfRangeException("transform index")
        }
        var result = PrimitiveTransform{ A: 1.0F, B: 0.0F, C: 0.0F, D: 1.0F, TX: 0.0F, TY: 0.0F }
        var current = index
        var steps int32 = 0
        while current >= 0 {
            if current >= frame.TransformCount || steps >= frame.TransformCount {
                throw InvalidOperationException("Vulkan primitive transform chain is invalid")
            }
            let value = frame.Transforms[current]
            ValidateTransformRecord(value, frame.TransformCount)
            result = Compose(value, result)
            current = value.ParentIndex
            steps = steps + 1
        }
        ValidateFinite(result.A, "resolved transform a")
        ValidateFinite(result.B, "resolved transform b")
        ValidateFinite(result.C, "resolved transform c")
        ValidateFinite(result.D, "resolved transform d")
        ValidateFinite(result.TX, "resolved transform tx")
        ValidateFinite(result.TY, "resolved transform ty")
        return result
    }

    private func Compose(outer TransformRecord, inner PrimitiveTransform) PrimitiveTransform {
        return PrimitiveTransform{
            A: outer.A * inner.A + outer.C * inner.B,
            B: outer.B * inner.A + outer.D * inner.B,
            C: outer.A * inner.C + outer.C * inner.D,
            D: outer.B * inner.C + outer.D * inner.D,
            TX: outer.A * inner.TX + outer.C * inner.TY + outer.TX,
            TY: outer.B * inner.TX + outer.D * inner.TY + outer.TY,
        }
    }

    private func PackColor(value uint32, opacity float32) PackedPrimitiveColor {
        let rgba = int32(value)
        let red = (rgba >> int32(24)) & int32(255)
        let green = (rgba >> int32(16)) & int32(255)
        let blue = (rgba >> int32(8)) & int32(255)
        let alpha = float32(rgba & int32(255)) / 255.0F
        let effectiveAlpha = Clamp01(alpha * opacity)
        let packedRed = Quantize(linearChannels[red] * effectiveAlpha, 2047u)
        let packedGreen = Quantize(linearChannels[green] * effectiveAlpha, 2047u)
        let packedBlue = Quantize(linearChannels[blue] * effectiveAlpha, 1023u)
        let packedAlpha = Quantize(effectiveAlpha, 1023u)
        let packedRgb = uint32(int32(packedRed)
            | (int32(packedGreen) << int32(11))
            | (int32(packedBlue) << int32(22)))
        return PackedPrimitiveColor{ Rgb: packedRgb, Alpha: packedAlpha }
    }

    private func PackAlphaTriplet(first uint32, second uint32, third uint32) uint32 {
        return uint32((int32(first) & int32(1023))
            | ((int32(second) & int32(1023)) << int32(10))
            | ((int32(third) & int32(1023)) << int32(20)))
    }

    private func Quantize(value float32, maximum uint32) uint32 {
        let bounded = Clamp01(value)
        return uint32(int32(bounded * float32(maximum) + 0.5F))
    }

    private func Clamp01(value float32) float32 {
        if value <= 0.0F { return 0.0F }
        if value >= 1.0F { return 1.0F }
        return value
    }

    private func ClampLength(value float32, limit float32) float32 {
        if value <= 0.0F { return 0.0F }
        if value >= limit { return limit }
        return value
    }

    private func Min(first float32, second float32) float32 {
        return MathF.Min(first, second)
    }

    private func Max(first float32, second float32) float32 {
        return MathF.Max(first, second)
    }

    private func Min(first int32, second int32) int32 {
        return first < second ? first : second
    }

    private func Max(first int32, second int32) int32 {
        return first > second ? first : second
    }
}
