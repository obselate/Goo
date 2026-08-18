package Goo

internal partial class VulkanWindowTarget {
    private func ScaleFrame(frame SceneFrame, scaleX float32, scaleY float32) {
        if scaleX == 1.0F && scaleY == 1.0F {
            return
        }
        var index int32 = 0
        while index < frame.ChunkCount {
            let value = frame.Chunks[index]
            frame.Chunks[index] = SceneChunk{
                OwnerId: value.OwnerId,
                Version: value.Version,
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                FirstDraw: value.FirstDraw,
                DrawCount: value.DrawCount,
                FirstResource: value.FirstResource,
                ResourceCount: value.ResourceCount,
                Dirty: value.Dirty,
            }
            index = index + 1
        }
        index = 0
        while index < frame.SolidBoxCount {
            let value = frame.SolidBoxes[index]
            frame.SolidBoxes[index] = SolidBoxRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                Color: value.Color,
                Opacity: value.Opacity,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.RoundedBoxCount {
            let value = frame.RoundedBoxes[index]
            frame.RoundedBoxes[index] = RoundedBoxRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                RadiusTopLeft: ScaleRadius(value.RadiusTopLeft, scaleX, scaleY),
                RadiusTopRight: ScaleRadius(value.RadiusTopRight, scaleX, scaleY),
                RadiusBottomRight: ScaleRadius(value.RadiusBottomRight, scaleX, scaleY),
                RadiusBottomLeft: ScaleRadius(value.RadiusBottomLeft, scaleX, scaleY),
                Color: value.Color,
                Opacity: value.Opacity,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.PerEdgeBorderCount {
            let value = frame.PerEdgeBorders[index]
            frame.PerEdgeBorders[index] = PerEdgeBorderRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                TopWidth: value.TopWidth * scaleY,
                RightWidth: value.RightWidth * scaleX,
                BottomWidth: value.BottomWidth * scaleY,
                LeftWidth: value.LeftWidth * scaleX,
                TopColor: value.TopColor,
                RightColor: value.RightColor,
                BottomColor: value.BottomColor,
                LeftColor: value.LeftColor,
                Style: value.Style,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.LinearGradientCount {
            let value = frame.LinearGradients[index]
            frame.LinearGradients[index] = LinearGradientRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                StartX: value.StartX * scaleX,
                StartY: value.StartY * scaleY,
                EndX: value.EndX * scaleX,
                EndY: value.EndY * scaleY,
                StopStart: value.StopStart,
                StopCount: value.StopCount,
                Opacity: value.Opacity,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.RadialGradientCount {
            let value = frame.RadialGradients[index]
            frame.RadialGradients[index] = RadialGradientRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                CenterX: value.CenterX * scaleX,
                CenterY: value.CenterY * scaleY,
                RadiusX: value.RadiusX * scaleX,
                RadiusY: value.RadiusY * scaleY,
                StopStart: value.StopStart,
                StopCount: value.StopCount,
                Opacity: value.Opacity,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.CachedImageCount {
            let value = frame.CachedImages[index]
            frame.CachedImages[index] = CachedImageRefRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                ImageId: value.ImageId,
                SamplerId: value.SamplerId,
                SourceX: value.SourceX,
                SourceY: value.SourceY,
                SourceWidth: value.SourceWidth,
                SourceHeight: value.SourceHeight,
                Opacity: value.Opacity,
                Sampling: value.Sampling,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.CachedGlyphRunCount {
            let value = frame.CachedGlyphRuns[index]
            if value.TransformIndex >= 0 {
                let transform = frame.Transforms[value.TransformIndex]
                frame.Transforms[value.TransformIndex] = TransformRecord{
                    A: transform.A * scaleX,
                    B: transform.B * scaleY,
                    C: transform.C * scaleX,
                    D: transform.D * scaleY,
                    TX: transform.TX,
                    TY: transform.TY,
                    ParentIndex: transform.ParentIndex,
                }
            }
            frame.CachedGlyphRuns[index] = CachedGlyphRunRefRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                GlyphRunId: value.GlyphRunId,
                AtlasId: value.AtlasId,
                GlyphId: value.GlyphId,
                AtlasTexelOffset: value.AtlasTexelOffset,
                AtlasTexelCount: value.AtlasTexelCount,
                GlyphMinX: value.GlyphMinX,
                GlyphMinY: value.GlyphMinY,
                GlyphMaxX: value.GlyphMaxX,
                GlyphMaxY: value.GlyphMaxY,
                Color: value.Color,
                RenderMode: value.RenderMode,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.PathMeshCount {
            let value = frame.PathMeshes[index]
            frame.PathMeshes[index] = PrebuiltPathMeshRefRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                MeshId: value.MeshId,
                FillBrushId: value.FillBrushId,
                StrokeBrushId: value.StrokeBrushId,
                FillRule: value.FillRule,
                StrokeWidth: ScaleRadius(value.StrokeWidth, scaleX, scaleY),
                StrokeColor: value.StrokeColor,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.TransformCount {
            let value = frame.Transforms[index]
            frame.Transforms[index] = TransformRecord{
                A: value.A,
                B: value.B,
                C: value.C,
                D: value.D,
                TX: value.TX * scaleX,
                TY: value.TY * scaleY,
                ParentIndex: value.ParentIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.RectClipCount {
            let value = frame.RectClips[index]
            frame.RectClips[index] = RectClipRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                TransformIndex: value.TransformIndex,
                ParentIndex: value.ParentIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.ShadowCount {
            let value = frame.Shadows[index]
            frame.Shadows[index] = ShadowRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                RadiusTopLeft: ScaleRadius(value.RadiusTopLeft, scaleX, scaleY),
                RadiusTopRight: ScaleRadius(value.RadiusTopRight, scaleX, scaleY),
                RadiusBottomRight: ScaleRadius(value.RadiusBottomRight, scaleX, scaleY),
                RadiusBottomLeft: ScaleRadius(value.RadiusBottomLeft, scaleX, scaleY),
                OffsetX: value.OffsetX * scaleX,
                OffsetY: value.OffsetY * scaleY,
                Spread: ScaleRadius(value.Spread, scaleX, scaleY),
                Blur: ScaleRadius(value.Blur, scaleX, scaleY),
                Color: value.Color,
                MaskId: value.MaskId,
                Inset: value.Inset,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.UnderlineCount {
            let value = frame.Underlines[index]
            frame.Underlines[index] = UnderlineRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                Thickness: ScaleRadius(value.Thickness, scaleX, scaleY),
                Color: value.Color,
                Mode: value.Mode,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.CustomMeshCount {
            let value = frame.CustomMeshes[index]
            frame.CustomMeshes[index] = CustomMeshRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                MeshId: value.MeshId,
                PipelineId: value.PipelineId,
                VertexCount: value.VertexCount,
                IndexCount: value.IndexCount,
                Topology: value.Topology,
                Opacity: value.Opacity,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
        index = 0
        while index < frame.LayerCount {
            let value = frame.Layers[index]
            frame.Layers[index] = LayerRecord{
                Bounds: ScaleBounds(value.Bounds, scaleX, scaleY),
                Opacity: value.Opacity,
                BlendMode: value.BlendMode,
                OffscreenTargetId: value.OffscreenTargetId,
                Flags: value.Flags,
                TransformIndex: value.TransformIndex,
            }
            index = index + 1
        }
    }

    private func ScaleBounds(value ConservativeBounds, scaleX float32, scaleY float32) ConservativeBounds {
        return ConservativeBounds{
            X: value.X * scaleX,
            Y: value.Y * scaleY,
            Width: value.Width * scaleX,
            Height: value.Height * scaleY,
        }
    }

    private func ScaleRadius(value float32, scaleX float32, scaleY float32) float32 {
        return value * (scaleX < scaleY ? scaleX : scaleY)
    }
}
