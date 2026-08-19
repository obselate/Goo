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
        if node.HasTextShadowState && HasBlurredTextShadow(node.TextShadows) {
            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextShadows,
                VulkanSceneUnsupportedPrimitive.TextShadow)
        }
        if node.HasTextStrokeState {
            let width = node.TextStrokeWidth
            if width.HasMagnitude
                && (width.Unit != LengthUnit.Px
                    || width.Px > VulkanTextScene.MaximumStrokeWidth)
                && !transparent(node.TextStrokeColor) {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextStrokeWidth,
                    VulkanSceneUnsupportedPrimitive.TextStroke)
            }
        }
        if node.Kind != NodeKind.Text
            && node.Kind != NodeKind.Entry
            && node.Kind != NodeKind.Editor
            && node.TextDecoration != TextDecoration.None {
            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextDecoration,
                VulkanSceneUnsupportedPrimitive.Text)
        }
        if node.Kind == NodeKind.Text && PassiveTextPresentations.Read(node) != nil {
            RecordUnsupportedRichTextFields(node)
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
            }
            case NodeKind.Editor {
                if let state = node.EditorState {
                    if EditorHasSlots(state) {
                        RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.EditorSlots,
                            VulkanSceneUnsupportedPrimitive.TextEditor)
                    }
                    RecordUnsupportedEditorTextFields(node)
                }
            }
            case _ { }
        }
    }

    private func RecordUnsupportedRichTextFields(node Node) {
        let layout = TextLayouts.For(node, TextLayouts.ContentWidth(node))
        guard let rich = layout.Rich else { return }
        var shadows = node.HasTextShadowState && HasBlurredTextShadow(node.TextShadows)
        var stroke = node.TextStrokeWidth.Px > VulkanTextScene.MaximumStrokeWidth
            && !transparent(node.TextStrokeColor)
        for line in rich.Lines {
            for run in line.Runs {
                let style = run.Style
                if !stroke && style.StrokeWidth > VulkanTextScene.MaximumStrokeWidth
                    && !transparent(style.StrokeColor) {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextStrokeWidth,
                        VulkanSceneUnsupportedPrimitive.TextStroke)
                    stroke = true
                }
                if !shadows && HasBlurredTextShadow(style.Shadows) {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextShadows,
                        VulkanSceneUnsupportedPrimitive.TextShadow)
                    shadows = true
                }
            }
        }
    }

    private func RecordUnsupportedEditorTextFields(node Node) {
        let layout = TextEditorLayouts.For(node, TextLayouts.ContentWidth(node),
            TextLayouts.ContentHeight(node))
        var shadows = node.HasTextShadowState && HasBlurredTextShadow(node.TextShadows)
        var stroke = node.TextStrokeWidth.Px > VulkanTextScene.MaximumStrokeWidth
            && !transparent(node.TextStrokeColor)
        for line in layout.Lines {
            for run in line.Runs {
                let style = run.Style
                if !stroke && style.StrokeWidth > VulkanTextScene.MaximumStrokeWidth
                    && !transparent(style.StrokeColor) {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextStrokeWidth,
                        VulkanSceneUnsupportedPrimitive.TextStroke)
                    stroke = true
                }
                if !shadows && HasBlurredTextShadow(style.Shadows) {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextShadows,
                        VulkanSceneUnsupportedPrimitive.TextShadow)
                    shadows = true
                }
            }
        }
    }

    private func HasBlurredTextShadow(shadows BoxShadowStack?) bool {
        var index int32 = 0
        let count = textShadowCount(shadows)
        while index < count {
            if textShadowAt(shadows, index).Blur.Px > 0.0F {
                return true
            }
            index = index + 1
        }
        return false
    }

    private func HasSharpTextShadow(shadows BoxShadowStack?) bool {
        var index int32 = 0
        let count = textShadowCount(shadows)
        while index < count {
            let shadow = textShadowAt(shadows, index)
            if shadow.Color.A > 0.0F && shadow.Blur.Px <= 0.0F {
                return true
            }
            index = index + 1
        }
        return false
    }

    private func RecordColorEffectsSkipped(node Node) {
        var shadow = false
        var stroke = false
        if node.HasTextShadowState && HasSharpTextShadow(node.TextShadows) {
            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextShadows,
                VulkanSceneUnsupportedPrimitive.TextShadow)
            shadow = true
        }
        if node.HasTextStrokeState && node.TextStrokeWidth.Unit == LengthUnit.Px
            && node.TextStrokeWidth.Px > 0.0F && !transparent(node.TextStrokeColor) {
            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextStrokeWidth,
                VulkanSceneUnsupportedPrimitive.TextStroke)
            stroke = true
        }
        if node.Kind == NodeKind.Text {
            let layout = TextLayouts.For(node, TextLayouts.ContentWidth(node))
            if let rich = layout.Rich {
                for line in rich.Lines {
                    for run in line.Runs {
                        let style = run.Style
                        if !shadow && HasSharpTextShadow(style.Shadows) {
                            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextShadows,
                                VulkanSceneUnsupportedPrimitive.TextShadow)
                            shadow = true
                        }
                        if !stroke && style.StrokeWidth > 0.0F && !transparent(style.StrokeColor) {
                            RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextStrokeWidth,
                                VulkanSceneUnsupportedPrimitive.TextStroke)
                            stroke = true
                        }
                    }
                }
            }
        } else if node.Kind == NodeKind.Editor {
            let layout = TextEditorLayouts.For(node, TextLayouts.ContentWidth(node),
                TextLayouts.ContentHeight(node))
            for line in layout.Lines {
                for run in line.Runs {
                    let style = run.Style
                    if !shadow && HasSharpTextShadow(style.Shadows) {
                        RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextShadows,
                            VulkanSceneUnsupportedPrimitive.TextShadow)
                        shadow = true
                    }
                    if !stroke && style.StrokeWidth > 0.0F && !transparent(style.StrokeColor) {
                        RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.TextStrokeWidth,
                            VulkanSceneUnsupportedPrimitive.TextStroke)
                        stroke = true
                    }
                }
            }
        }
    }

    private func TextEntrySupported(node Node) bool {
        return textScene != nil
    }

    private func TextEditorSupported(node Node) bool {
        guard let state = node.EditorState else { return false }
        return textScene != nil && !EditorHasSlots(state)
    }

    private func EditorHasSlots(state TextEditorRenderState) bool {
        var layerIndex int32 = 0
        while layerIndex < state.LayerCount {
            let layer = state.Layer(layerIndex)
            for projection in layer.ReadProjections() {
                if projection.Kind == TextProjectionKind.InlineSlot
                    || projection.Kind == TextProjectionKind.BlockSlot {
                    return true
                }
            }
            layerIndex = layerIndex + 1
        }
        return false
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
        transformIndex int32,
        axisAligned bool,
        clipDepth int32) {
        PaintBoxShadows(node, bounds, opacity, transformIndex, axisAligned)
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
                let emitted = renderer.Emit(frame, node, opacity, transformIndex)
                if renderer.ConsumeColorEffectSkipped() {
                    RecordColorEffectsSkipped(node)
                }
                if renderer.ConsumeColorGlyphFallback() {
                    RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.Content,
                        VulkanSceneUnsupportedPrimitive.Text)
                }
                if !emitted {
                    MarkUnsupported(node, VulkanSceneUnsupportedKind.Text,
                        VulkanSceneUnsupportedField.Content,
                        VulkanSceneUnsupportedPrimitive.Text)
                    unsupportedNodeCount = unsupportedNodeCount + 1
                }
            }
        }
        if node.Kind == NodeKind.Entry {
            if let renderer = textScene {
                if TextEntrySupported(node)
                    && TextClipSupported(node, axisAligned, clipDepth) {
                    let emitted = renderer.EmitEntry(frame, node, opacity, transformIndex)
                    if renderer.ConsumeColorEffectSkipped() {
                        RecordColorEffectsSkipped(node)
                    }
                    if renderer.ConsumeColorGlyphFallback() {
                        RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.Content,
                            VulkanSceneUnsupportedPrimitive.TextEntry)
                    }
                    if !emitted {
                        MarkUnsupported(node, VulkanSceneUnsupportedKind.Entry,
                            VulkanSceneUnsupportedField.Content,
                            VulkanSceneUnsupportedPrimitive.TextEntry)
                        unsupportedNodeCount = unsupportedNodeCount + 1
                    }
                }
            }
        }
        if node.Kind == NodeKind.Editor {
            if let renderer = textScene {
                if TextEditorSupported(node)
                    && TextClipSupported(node, axisAligned, clipDepth) {
                    let emitted = renderer.EmitEditor(frame, node, opacity, transformIndex)
                    if renderer.ConsumeColorEffectSkipped() {
                        RecordColorEffectsSkipped(node)
                    }
                    if renderer.ConsumeColorGlyphFallback() {
                        RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.Content,
                            VulkanSceneUnsupportedPrimitive.TextEditor)
                    }
                    if !emitted {
                        MarkUnsupported(node, VulkanSceneUnsupportedKind.Editor,
                            VulkanSceneUnsupportedField.Content,
                            VulkanSceneUnsupportedPrimitive.TextEditor)
                        unsupportedNodeCount = unsupportedNodeCount + 1
                    }
                }
            }
        }
    }

    private func TextClipSupported(node Node, axisAligned bool, clipDepth int32) bool {
        var supported = true
        var marked = false
        if !axisAligned {
            MarkTextClipUnsupported(node, VulkanSceneUnsupportedPrimitive.RectClipNonAxisAligned)
            marked = true
            supported = false
        }
        if clipDepth >= MaxRectClipDepth {
            if marked {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.Content,
                    VulkanSceneUnsupportedPrimitive.RectClipDepth)
            } else {
                MarkTextClipUnsupported(node, VulkanSceneUnsupportedPrimitive.RectClipDepth)
            }
            supported = false
        }
        return supported
    }

    private func MarkTextClipUnsupported(
        node Node,
        primitive VulkanSceneUnsupportedPrimitive) {
        if node.Kind == NodeKind.Entry {
            MarkUnsupported(node, VulkanSceneUnsupportedKind.Entry,
                VulkanSceneUnsupportedField.Content, primitive)
            unsupportedNodeCount = unsupportedNodeCount + 1
        } else if node.Kind == NodeKind.Editor {
            MarkUnsupported(node, VulkanSceneUnsupportedKind.Editor,
                VulkanSceneUnsupportedField.Content, primitive)
            unsupportedNodeCount = unsupportedNodeCount + 1
        }
    }

    private func PaintBoxShadows(
        node Node,
        bounds ConservativeBounds,
        opacity float32,
        transformIndex int32,
        axisAligned bool) {
        let count = boxShadowCount(node.BoxShadows)
        if count == 0 {
            return
        }
        let supportedOwner = node.Kind == NodeKind.Container || node.Kind == NodeKind.Button
        let supportedContext = supportedOwner
            && axisAligned
            && !node.HasClipPath
            && node.OverflowX == Overflow.Visible
            && node.OverflowY == Overflow.Visible
        var index = count - 1
        while index >= 0 {
            let shadow = boxShadowAt(node.BoxShadows, index)
            let validGeometry = Finite(shadow.OffsetX.Value)
                && Finite(shadow.OffsetY.Value)
                && Finite(shadow.Blur.Value)
                && Finite(shadow.Spread.Value)
                && shadow.Blur.Value >= 0.0F
            if !supportedOwner || !supportedContext || shadow.Inset || !validGeometry {
                RecordUnsupportedDetail(node, VulkanSceneUnsupportedField.BoxShadows,
                    VulkanSceneUnsupportedPrimitive.BoxShadow)
            } else if shadow.Color.A > 0.0F && !bounds.IsEmpty {
                frame.AddShadow(ShadowRecord{
                    Bounds: bounds,
                    RadiusTopLeft: Radius(node.BorderTopLeftRadius, node.BorderRadius, bounds),
                    RadiusTopRight: Radius(node.BorderTopRightRadius, node.BorderRadius, bounds),
                    RadiusBottomRight: Radius(node.BorderBottomRightRadius, node.BorderRadius, bounds),
                    RadiusBottomLeft: Radius(node.BorderBottomLeftRadius, node.BorderRadius, bounds),
                    OffsetX: shadow.OffsetX.Px,
                    OffsetY: shadow.OffsetY.Px,
                    Spread: shadow.Spread.Px,
                    Blur: shadow.Blur.Px,
                    Color: EffectiveColor(shadow.Color, opacity),
                    MaskId: ResourceId{},
                    Inset: false,
                    TransformIndex: transformIndex,
                })
            }
            index = index - 1
        }
    }

    private func ExpandedChunkBounds(
        node Node,
        bounds ConservativeBounds,
        eligible bool) ConservativeBounds {
        let count = boxShadowCount(node.BoxShadows)
        if bounds.IsEmpty {
            return bounds
        }
        var result = bounds
        if eligible {
            var index int32 = 0
            while index < count {
                let shadow = boxShadowAt(node.BoxShadows, index)
                if !shadow.Inset && shadow.Color.A > 0.0F
                    && Finite(shadow.OffsetX.Value)
                    && Finite(shadow.OffsetY.Value)
                    && Finite(shadow.Blur.Value)
                    && Finite(shadow.Spread.Value)
                    && shadow.Blur.Value >= 0.0F {
                    let spread = shadow.Spread.Px > 0.0F ? shadow.Spread.Px : 0.0F
                    let extent = shadow.Blur.Px + spread
                    let candidate = ConservativeBounds{
                        X: bounds.X + shadow.OffsetX.Px - extent,
                        Y: bounds.Y + shadow.OffsetY.Px - extent,
                        Width: bounds.Width + extent + extent,
                        Height: bounds.Height + extent + extent,
                    }
                    result = UnionBounds(result, candidate)
                }
                index = index + 1
            }
        }
        if node.Kind == NodeKind.Text {
            let pad = TextEffectChunkPad(node)
            if pad > 0.0F { result = result.Inflate(pad) }
        }
        return result
    }

    private func TextEffectChunkPad(node Node) float32 {
        var result = textPaintPad(node.TextStrokeWidth.Px, node.TextShadows)
        let layout = TextLayouts.For(node, TextLayouts.ContentWidth(node))
        if let rich = layout.Rich {
            for line in rich.Lines {
                if line.PaintPad > result { result = line.PaintPad }
            }
        }
        return result
    }

    private func ShadowContextSupported(node Node) bool {
        if node.Kind != NodeKind.Container && node.Kind != NodeKind.Button {
            return false
        }
        if node.HasClipPath
            || node.OverflowX != Overflow.Visible
            || node.OverflowY != Overflow.Visible {
            return false
        }
        if !node.HasVisualTransform {
            return true
        }
        let matrix = TransformGeometry.Matrix(node)
        return Finite(matrix.B) && Finite(matrix.C)
            && matrix.B == 0.0F && matrix.C == 0.0F
    }

    private func UnionBounds(left ConservativeBounds, right ConservativeBounds) ConservativeBounds {
        let x = left.X < right.X ? left.X : right.X
        let y = left.Y < right.Y ? left.Y : right.Y
        let rightEdge = left.Right > right.Right ? left.Right : right.Right
        let bottomEdge = left.Bottom > right.Bottom ? left.Bottom : right.Bottom
        return ConservativeBounds{
            X: x,
            Y: y,
            Width: rightEdge - x,
            Height: bottomEdge - y,
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
