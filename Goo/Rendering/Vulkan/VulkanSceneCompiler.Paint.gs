package Goo

import System

internal partial class VulkanSceneCompiler {
    private func ValidateViewport(width float32, height float32) {
        if !Finite(width) || !Finite(height) || width < 0.0F || height < 0.0F {
            throw ArgumentOutOfRangeException("viewport")
        }
    }

    private func NodeBounds(node Node) ConservativeBounds {
        let rect = node.Rect
        let x = Finite(rect.X) ? rect.X : 0.0F
        let y = Finite(rect.Y) ? rect.Y : 0.0F
        let width = Finite(rect.W) && rect.W > 0.0F ? rect.W : 0.0F
        let height = Finite(rect.H) && rect.H > 0.0F ? rect.H : 0.0F
        return ConservativeBounds{ X: x, Y: y, Width: width, Height: height }
    }

    private func EffectiveOpacity(parent float32, value float64) float32 {
        if !Finite(parent) || Double.IsNaN(value) || Double.IsInfinity(value) {
            return 0.0F
        }
        let local = float32(value)
        if !Finite(local) {
            return 0.0F
        }
        if local <= 0.0F || parent <= 0.0F {
            return 0.0F
        }
        let boundedLocal = local >= 1.0F ? 1.0F : local
        let product = parent * boundedLocal
        if product >= 1.0F { return 1.0F }
        return product <= 0.0F ? 0.0F : product
    }

    private func AddNodeTransform(node Node, parentIndex int32) VulkanSceneTransformState {
        if !node.HasVisualTransform {
            return VulkanSceneTransformState{ Index: parentIndex, AxisAligned: true }
        }
        let matrix = TransformGeometry.Matrix(node)
        let record = TransformRecord{
            A: matrix.A,
            B: matrix.C,
            C: matrix.B,
            D: matrix.D,
            TX: matrix.TX,
            TY: matrix.TY,
            ParentIndex: parentIndex,
        }
        let index = frame.AddTransform(record)
        return VulkanSceneTransformState{
            Index: index,
            AxisAligned: matrix.B == 0.0F && matrix.C == 0.0F,
        }
    }

    private func RecordUnsupportedFields(node Node, bounds ConservativeBounds) {
        if node.HasBackgroundImageState {
            let path = BackgroundImageLayouts.Path(node)
            let source = BackgroundImageLayouts.Source(node)
            if path != "" && source == nil {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.BackgroundImage,
                    VulkanSceneUnsupportedPrimitive.BackgroundImage)
            } else if source != nil && imageScene == nil {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.BackgroundImageSource,
                    VulkanSceneUnsupportedPrimitive.BackgroundImage)
            }
            if ((path != "" && source == nil)
                || (source != nil && imageScene == nil))
                && node.BackgroundImageFit != ImageFit.Cover {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.BackgroundImageFit,
                    VulkanSceneUnsupportedPrimitive.BackgroundImage)
            }
        }
        if node.HasClipPath {
            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ClipPath,
                VulkanSceneUnsupportedPrimitive.ClipPath)
            if ClipPaths.Fit(node) != ShapeFit.Fill {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ClipPathFit,
                    VulkanSceneUnsupportedPrimitive.ClipPath)
            }
        }
        if node.BlendMode != BlendMode.Normal {
            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.BlendMode,
                VulkanSceneUnsupportedPrimitive.Blend)
        }
        if boxShadowCount(node.BoxShadows) != 0 {
            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.BoxShadows,
                VulkanSceneUnsupportedPrimitive.BoxShadow)
        }
        if node.HasOutlineState {
            let width = node.OutlineWidth
            if width.HasMagnitude {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.OutlineWidth,
                    VulkanSceneUnsupportedPrimitive.Outline)
            }
            if !transparent(node.OutlineColor) {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.OutlineColor,
                    VulkanSceneUnsupportedPrimitive.Outline)
            }
            let offset = node.OutlineOffset
            if offset.HasMagnitude {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.OutlineOffset,
                    VulkanSceneUnsupportedPrimitive.Outline)
            }
        }
        if node.HasTextShadowState {
            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextShadows,
                VulkanSceneUnsupportedPrimitive.TextShadow)
        }
        if node.HasTextStrokeState {
            let width = node.TextStrokeWidth
            if width.HasMagnitude {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextStrokeWidth,
                    VulkanSceneUnsupportedPrimitive.TextStroke)
            }
            if !transparent(node.TextStrokeColor) {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextStrokeColor,
                    VulkanSceneUnsupportedPrimitive.TextStroke)
            }
        }
        if node.TextDecoration != TextDecoration.None {
            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextDecoration,
                VulkanSceneUnsupportedPrimitive.Text)
        }
        if node.Kind == NodeKind.Text && PassiveTextPresentations.Read(node) != nil {
            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextStyleRanges,
                VulkanSceneUnsupportedPrimitive.Text)
        }
        if node.BorderStyle != BorderStyle.Solid
            && node.BorderStyle != BorderStyle.Dashed
            && node.BorderStyle != BorderStyle.Dotted
            && HasBorderWidth(node, bounds) {
            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.BorderStyle,
                VulkanSceneUnsupportedPrimitive.Border)
        }
        switch node.Kind {
            case NodeKind.Image {
                let source = node.ImageSource
                if node.ImagePath != "" && source == nil {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ImagePath,
                        VulkanSceneUnsupportedPrimitive.Image)
                } else if source != nil && imageScene == nil {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ImageSource,
                        VulkanSceneUnsupportedPrimitive.Image)
                }
                if ((node.ImagePath != "" && source == nil)
                    || (source != nil && imageScene == nil))
                    && node.ImageFit != ImageFit.Contain {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ImageFit,
                        VulkanSceneUnsupportedPrimitive.Image)
                }
            }
            case NodeKind.Shape {
                if node.ShapePath.CommandCount != 0 {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ShapePath,
                        VulkanSceneUnsupportedPrimitive.Shape)
                }
                if node.ShapeFit != ShapeFit.Contain {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ShapeFit,
                        VulkanSceneUnsupportedPrimitive.Shape)
                }
                if node.ShapeFillRule != FillRule.NonZero {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ShapeFillRule,
                        VulkanSceneUnsupportedPrimitive.Shape)
                }
                if node.BorderLeftWidth.HasMagnitude {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ShapeStrokeWidth,
                        VulkanSceneUnsupportedPrimitive.Shape)
                }
                if !transparent(node.BorderLeftColor) {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ShapeStrokeColor,
                        VulkanSceneUnsupportedPrimitive.Shape)
                }
                if node.ShapeStrokeCap != StrokeCap.Butt {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ShapeStrokeCap,
                        VulkanSceneUnsupportedPrimitive.Shape)
                }
                if node.ShapeStrokeJoin != StrokeJoin.Miter {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ShapeStrokeJoin,
                        VulkanSceneUnsupportedPrimitive.Shape)
                }
                if node.MiterLimit != 4.0 {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ShapeMiterLimit,
                        VulkanSceneUnsupportedPrimitive.Shape)
                }
                if node.ShapeCornerRadius != 0.0 {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ShapeCornerRadius,
                        VulkanSceneUnsupportedPrimitive.Shape)
                }
                if let dashes = node.Dashes {
                    if dashes.Intervals.Count != 0 {
                        RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.ShapeDashes,
                            VulkanSceneUnsupportedPrimitive.Shape)
                    }
                }
            }
            case NodeKind.Entry {
                if node.Buffer != "" {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EntryValue,
                        VulkanSceneUnsupportedPrimitive.TextEntry)
                }
                if node.Placeholder != "" {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EntryPlaceholder,
                        VulkanSceneUnsupportedPrimitive.TextEntry)
                }
                if !node.SelectionColor.Equals(defaultSelectionColor()) {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EntrySelectionColor,
                        VulkanSceneUnsupportedPrimitive.TextEntry)
                }
            }
            case NodeKind.Editor {
                if let state = node.EditorState {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EditorDocument,
                        VulkanSceneUnsupportedPrimitive.TextEditor)
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EditorController,
                        VulkanSceneUnsupportedPrimitive.TextEditor)
                    if state.LayerCount != 0 {
                        RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EditorLayers,
                            VulkanSceneUnsupportedPrimitive.TextEditor)
                    }
                }
                if node.EditorReadOnly {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EditorReadOnly,
                        VulkanSceneUnsupportedPrimitive.TextEditor)
                }
                if node.Placeholder != "" {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EditorPlaceholder,
                        VulkanSceneUnsupportedPrimitive.TextEditor)
                }
                if !node.SelectionColor.Equals(defaultSelectionColor()) {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EditorSelectionColor,
                        VulkanSceneUnsupportedPrimitive.TextEditor)
                }
                if !node.EditorCaretColor.Equals(Color.White) {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EditorCaretColor,
                        VulkanSceneUnsupportedPrimitive.TextEditor)
                }
                if !transparent(node.EditorCurrentLineColor) {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EditorCurrentLineColor,
                        VulkanSceneUnsupportedPrimitive.TextEditor)
                }
                if node.EditorOverscanLines != 3 {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EditorOverscanLines,
                        VulkanSceneUnsupportedPrimitive.TextEditor)
                }
            }
            case _ { }
        }
    }

    private func HasBorderWidth(node Node, bounds ConservativeBounds) bool {
        return ResolveLength(node.BorderTopWidth, MinDimension(bounds)) > 0.0F
            || ResolveLength(node.BorderRightWidth, MinDimension(bounds)) > 0.0F
            || ResolveLength(node.BorderBottomWidth, MinDimension(bounds)) > 0.0F
            || ResolveLength(node.BorderLeftWidth, MinDimension(bounds)) > 0.0F
    }

    private func PaintNode(
        node Node,
        bounds ConservativeBounds,
        opacity float32,
        transformIndex int32) {
        if let gradient = node.BackgroundGradient {
            PaintGradient(node, gradient, bounds, opacity, transformIndex)
        } else {
            PaintSolid(node.BackgroundColor, node, bounds, opacity, transformIndex)
        }
        if let scene = imageScene {
            scene.Emit(
                frame,
                bounds,
                BackgroundImageLayouts.CurrentToken(node),
                node.BackgroundImageFit,
                opacity,
                transformIndex)
        }
        if node.Kind == NodeKind.Image {
            if let scene = imageScene {
                scene.Emit(
                    frame,
                    bounds,
                    ImageLayouts.CurrentToken(node),
                    node.ImageFit,
                    opacity,
                    transformIndex)
            }
        }
        PaintBorder(node, bounds, opacity, transformIndex)
        if node.Kind == NodeKind.Text {
            if let renderer = textScene {
                if !renderer.Emit(frame, node, opacity, transformIndex) {
                    MarkUnsupported(node, VulkanSceneUnsupportedKind.Text,
                        VulkanSceneUnsupportedField.Content,
                        VulkanSceneUnsupportedPrimitive.Text)
                    unsupportedNodeCount = unsupportedNodeCount + 1
                }
            }
        }
    }

    private func PaintSolid(
        color Color,
        node Node,
        bounds ConservativeBounds,
        opacity float32,
        transformIndex int32) {
        if color.A <= 0.0F || opacity <= 0.0F || bounds.IsEmpty {
            return
        }
        if HasRadius(node, bounds) {
            frame.AddRoundedBox(RoundedBoxRecord{
                Bounds: bounds,
                RadiusTopLeft: Radius(node.BorderTopLeftRadius, node.BorderRadius, bounds),
                RadiusTopRight: Radius(node.BorderTopRightRadius, node.BorderRadius, bounds),
                RadiusBottomRight: Radius(node.BorderBottomRightRadius, node.BorderRadius, bounds),
                RadiusBottomLeft: Radius(node.BorderBottomLeftRadius, node.BorderRadius, bounds),
                Color: color.ToPackedRgba(),
                Opacity: opacity,
                TransformIndex: transformIndex,
            })
        } else {
            frame.AddSolidBox(SolidBoxRecord{
                Bounds: bounds,
                Color: color.ToPackedRgba(),
                Opacity: opacity,
                TransformIndex: transformIndex,
            })
        }
    }

    private func PaintBorder(
        node Node,
        bounds ConservativeBounds,
        opacity float32,
        transformIndex int32) {
        let top = ResolveLength(node.BorderTopWidth, MinDimension(bounds))
        let right = ResolveLength(node.BorderRightWidth, MinDimension(bounds))
        let bottom = ResolveLength(node.BorderBottomWidth, MinDimension(bounds))
        let left = ResolveLength(node.BorderLeftWidth, MinDimension(bounds))
        if top <= 0.0F && right <= 0.0F && bottom <= 0.0F && left <= 0.0F {
            return
        }
        if node.BorderStyle != BorderStyle.Solid
            && node.BorderStyle != BorderStyle.Dashed
            && node.BorderStyle != BorderStyle.Dotted {
            MarkUnsupported(VulkanSceneUnsupportedKind.BorderStyle)
            return
        }
        frame.AddPerEdgeBorder(PerEdgeBorderRecord{
            Bounds: bounds,
            TopWidth: top,
            RightWidth: right,
            BottomWidth: bottom,
            LeftWidth: left,
            RadiusTopLeft: Radius(node.BorderTopLeftRadius, node.BorderRadius, bounds),
            RadiusTopRight: Radius(node.BorderTopRightRadius, node.BorderRadius, bounds),
            RadiusBottomRight: Radius(node.BorderBottomRightRadius, node.BorderRadius, bounds),
            RadiusBottomLeft: Radius(node.BorderBottomLeftRadius, node.BorderRadius, bounds),
            TopColor: EffectiveColor(node.BorderTopColor, opacity),
            RightColor: EffectiveColor(node.BorderRightColor, opacity),
            BottomColor: EffectiveColor(node.BorderBottomColor, opacity),
            LeftColor: EffectiveColor(node.BorderLeftColor, opacity),
            Style: uint32(int32(node.BorderStyle)),
            TransformIndex: transformIndex,
        })
    }

    private func PaintGradient(
        node Node,
        gradient Gradient,
        bounds ConservativeBounds,
        opacity float32,
        transformIndex int32) {
        if bounds.IsEmpty {
            return
        }
        let stops = gradient.Stops
        let primitive = switch gradient {
            case linear is LinearGradient: VulkanSceneUnsupportedPrimitive.LinearGradient
            case radial is RadialGradient: VulkanSceneUnsupportedPrimitive.RadialGradient
            case _: VulkanSceneUnsupportedPrimitive.Gradient
        }
        if primitive == VulkanSceneUnsupportedPrimitive.Gradient {
            MarkUnsupported(node, VulkanSceneUnsupportedKind.Gradient,
                VulkanSceneUnsupportedField.BackgroundGradient, primitive)
            return
        }
        if stops.Count < 2 || stops.Count > 4 {
            MarkUnsupported(node, VulkanSceneUnsupportedKind.Gradient,
                VulkanSceneUnsupportedField.BackgroundGradient, primitive)
            return
        }
        let start = frame.GradientStopCount
        var index int32 = 0
        while index < stops.Count {
            let stop = stops[index]
            frame.AddGradientStop(GradientStopRecord{
                Offset: float32(stop.Offset),
                Color: stop.Color.ToPackedRgba(),
            })
            index = index + 1
        }
        switch gradient {
            case linear is LinearGradient {
                let radians = float32(linear.Angle) * MathF.PI / 180.0F
                let dx = MathF.Sin(radians)
                let dy = -MathF.Cos(radians)
                let half = 0.5F * (MathF.Abs(dx) * bounds.Width + MathF.Abs(dy) * bounds.Height)
                let centerX = bounds.X + bounds.Width * 0.5F
                let centerY = bounds.Y + bounds.Height * 0.5F
                frame.AddLinearGradient(LinearGradientRecord{
                    Bounds: bounds,
                    RadiusTopLeft: Radius(node.BorderTopLeftRadius, node.BorderRadius, bounds),
                    RadiusTopRight: Radius(node.BorderTopRightRadius, node.BorderRadius, bounds),
                    RadiusBottomRight: Radius(node.BorderBottomRightRadius, node.BorderRadius, bounds),
                    RadiusBottomLeft: Radius(node.BorderBottomLeftRadius, node.BorderRadius, bounds),
                    StartX: centerX - dx * half,
                    StartY: centerY - dy * half,
                    EndX: centerX + dx * half,
                    EndY: centerY + dy * half,
                    StopStart: start,
                    StopCount: stops.Count,
                    Opacity: opacity,
                    TransformIndex: transformIndex,
                })
                return
            }
            case radial is RadialGradient {
                frame.AddRadialGradient(RadialGradientRecord{
                    Bounds: bounds,
                    RadiusTopLeft: Radius(node.BorderTopLeftRadius, node.BorderRadius, bounds),
                    RadiusTopRight: Radius(node.BorderTopRightRadius, node.BorderRadius, bounds),
                    RadiusBottomRight: Radius(node.BorderBottomRightRadius, node.BorderRadius, bounds),
                    RadiusBottomLeft: Radius(node.BorderBottomLeftRadius, node.BorderRadius, bounds),
                    CenterX: bounds.X + bounds.Width * float32(radial.CenterX),
                    CenterY: bounds.Y + bounds.Height * float32(radial.CenterY),
                    RadiusX: bounds.Width * float32(radial.Radius),
                    RadiusY: bounds.Height * float32(radial.Radius),
                    StopStart: start,
                    StopCount: stops.Count,
                    Opacity: opacity,
                    TransformIndex: transformIndex,
                })
                return
            }
            case _ {
                MarkUnsupported(node, VulkanSceneUnsupportedKind.Gradient,
                    VulkanSceneUnsupportedField.BackgroundGradient,
                    VulkanSceneUnsupportedPrimitive.Gradient)
                return
            }
        }
    }

    private func HasRadius(node Node, bounds ConservativeBounds) bool {
        return Radius(node.BorderTopLeftRadius, node.BorderRadius, bounds) > 0.0F
            || Radius(node.BorderTopRightRadius, node.BorderRadius, bounds) > 0.0F
            || Radius(node.BorderBottomRightRadius, node.BorderRadius, bounds) > 0.0F
            || Radius(node.BorderBottomLeftRadius, node.BorderRadius, bounds) > 0.0F
    }

    private func Radius(value Length, fallback Length, bounds ConservativeBounds) float32 {
        let source = value.HasMagnitude ? value : fallback
        let radius = ResolveLength(source, MinDimension(bounds))
        let limit = MinDimension(bounds) * 0.5F
        return radius > limit ? limit : radius
    }

    private func ResolveLength(value Length, basis float32) float32 {
        if !value.HasMagnitude || !Finite(value.Value) {
            return 0.0F
        }
        let resolved = value.Unit == LengthUnit.Percent
            ? basis * value.Value / 100.0F
            : value.Value
        if !Finite(resolved) || resolved <= 0.0F {
            return 0.0F
        }
        return resolved
    }

    private func MinDimension(bounds ConservativeBounds) float32 {
        return bounds.Width < bounds.Height ? bounds.Width : bounds.Height
    }

    private func EffectiveColor(color Color, opacity float32) uint32 {
        let alpha = color.A * opacity
        return Color.FromNormalized(color.R, color.G, color.B, alpha).ToPackedRgba()
    }

    private func Finite(value float32) bool {
        return !Single.IsNaN(value) && !Single.IsInfinity(value)
    }
}
