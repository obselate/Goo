package Goo

import System
import System.Collections.Generic

internal data struct VulkanTextAtlasGlyphKey(Family string, Provider VulkanTextProvider, GlyphId uint32) { }

internal sealed class VulkanTextSceneAtlasState {
    private const InitialByteCapacity int32 = 4096
    private const InitialKeyCapacity int32 = 64
    internal var Atlas VulkanTextAtlas
    internal var Identity ResourceId
    internal var Bytes []uint8
    internal var Keys []VulkanTextAtlasGlyphKey
    internal var NextByteOffset uint32
    internal var PublishedBytePrefix uint32
    internal var QueuedBytePrefix uint32
    internal var QueuedUploadSequence uint64
    internal var UploadQueued bool
    internal var KeyCount int32

    internal init(nativeAtlas VulkanTextAtlas, identity ResourceId) {
        Atlas = nativeAtlas
        Identity = identity
        if nativeAtlas.ByteSize > uint64(Int32.MaxValue) {
            throw ArgumentOutOfRangeException("nativeAtlas")
        }
        var byteCapacity = InitialByteCapacity
        if nativeAtlas.ByteSize < uint64(byteCapacity) {
            byteCapacity = int32(nativeAtlas.ByteSize)
        }
        Bytes = [byteCapacity]uint8
        var keyCapacity = InitialKeyCapacity
        let maxKeyCapacity = int32(nativeAtlas.ByteSize / 8uL)
        if maxKeyCapacity < keyCapacity {
            keyCapacity = maxKeyCapacity
        }
        Keys = [keyCapacity]VulkanTextAtlasGlyphKey
    }

    internal func Reset(nativeAtlas VulkanTextAtlas, identity ResourceId) {
        Atlas = nativeAtlas
        Identity = identity
        NextByteOffset = 0u
        PublishedBytePrefix = 0u
        QueuedBytePrefix = 0u
        QueuedUploadSequence = 0uL
        UploadQueued = false
        KeyCount = 0
    }

    internal func EnsureByteCapacity(required uint32) {
        if required <= uint32(Bytes.Length) {
            return
        }
        if uint64(required) > Atlas.ByteSize || required > uint32(Int32.MaxValue) {
            throw InvalidOperationException("Vulkan text atlas byte range exceeds managed array limits")
        }
        var capacity = Bytes.Length
        if capacity == 0 {
            capacity = InitialByteCapacity
        }
        while uint64(capacity) < uint64(required) {
            if capacity > Int32.MaxValue / 2 {
                capacity = int32(required)
            } else {
                capacity = capacity * 2
            }
        }
        if uint64(capacity) > Atlas.ByteSize {
            capacity = int32(Atlas.ByteSize)
        }
        let next = [capacity]uint8
        Array.Copy(Bytes, next, int32(NextByteOffset))
        Bytes = next
    }

    internal func EnsureKeyCapacity(required int32) {
        if required <= Keys.Length {
            return
        }
        let maxCapacity = int32(Atlas.ByteSize / 8uL)
        if required > maxCapacity {
            throw InvalidOperationException("Vulkan text atlas glyph key capacity is exhausted")
        }
        var capacity = Keys.Length
        if capacity == 0 {
            capacity = InitialKeyCapacity
        }
        while capacity < required {
            if capacity > Int32.MaxValue / 2 {
                capacity = required
            } else {
                capacity = capacity * 2
            }
        }
        if capacity > maxCapacity {
            capacity = maxCapacity
        }
        let next = [capacity]VulkanTextAtlasGlyphKey
        Array.Copy(Keys, next, KeyCount)
        Keys = next
    }

    internal func AddKey(key VulkanTextAtlasGlyphKey) {
        EnsureKeyCapacity(KeyCount + 1)
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
    internal const MaximumStrokeWidth float32 = 4.0F
    private const TextEffectFill uint32 = 0u
    private const TextEffectShadow uint32 = 1u
    private const TextEffectStroke uint32 = 2u

    private let atlasSet VulkanTextAtlasSet
    private let states []VulkanTextSceneAtlasState?
    private let glyphs Dictionary[VulkanTextAtlasGlyphKey, VulkanTextAtlasGlyph]
    private let glyphWorkspace VulkanTextProviderWorkspace
    private let entryMetrics TextMetrics
    private let activeAtlasUse []bool
    private var stateCount int32
    private var capacityExhausted bool
    private var redrawRequired bool
    private var colorEffectSkipped bool
    private var colorGlyphFallback bool
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

    internal func ConsumeColorEffectSkipped() bool {
        let result = colorEffectSkipped
        colorEffectSkipped = false
        return result
    }

    internal func ConsumeColorGlyphFallback() bool {
        let result = colorGlyphFallback
        colorGlyphFallback = false
        return result
    }

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
        entryMetrics = TextMetrics()
        EnsureAtlasStates()
    }

    internal func BeginCompile(completedSerial uint64) {
        redrawRequired = false
        capacityExhausted = false
        colorEffectSkipped = false
        colorGlyphFallback = false
        completedGlobalSubmissionSerial = completedSerial
        Array.Clear(activeAtlasUse, 0, activeAtlasUse.Length)
    }

    internal func PublishCompletedUploads() {
        EnsureAtlasStates()
        var stateIndex int32 = 0
        while stateIndex < states.Length {
            if atlasSet.IsActive(stateIndex) {
                guard let state = states[stateIndex] else {
                    throw InvalidOperationException("Vulkan text atlas state is not resident")
                }
                if state.UploadQueued && state.Atlas.CompletedUploadSequence
                    >= state.QueuedUploadSequence {
                    state.PublishedBytePrefix = state.QueuedBytePrefix
                    state.QueuedBytePrefix = state.PublishedBytePrefix
                    state.QueuedUploadSequence = 0uL
                    state.UploadQueued = false
                }
            }
            stateIndex = stateIndex + 1
        }
    }

    internal func PrepareUpload() {
        EnsureAtlasStates()
        var stateIndex int32 = 0
        while stateIndex < states.Length {
            if atlasSet.IsActive(stateIndex) {
                guard let state = states[stateIndex] else {
                    throw InvalidOperationException("Vulkan text atlas state is not resident")
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
                        state.QueuedUploadSequence = state.Atlas.UploadSequence
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
                    state.QueuedUploadSequence = 0uL
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
        switch node.Kind {
            case NodeKind.Text { return EmitText(frame, node, opacity, parentTransformIndex) }
            case NodeKind.Entry { return EmitEntry(frame, node, opacity, parentTransformIndex) }
            case NodeKind.Editor { return EmitEditor(frame, node, opacity, parentTransformIndex) }
            case _ { return true }
        }
    }

    private func EmitText(
        frame SceneFrame,
        node Node,
        opacity float32,
        parentTransformIndex int32) bool {
        if opacity <= 0.0F { return true }
        let layout = TextLayouts.For(node, TextLayouts.ContentWidth(node))
        let contentX = TextLayouts.ContentLeft(node)
        let contentY = TextLayouts.ContentTop(node)
        let contentWidth = TextLayouts.ContentWidth(node)
        if let rich = layout.Rich {
            var result = true
            var lineY = contentY
            var lineIndex int32 = 0
            while lineIndex < rich.Lines.Count {
                let line = rich.Lines[lineIndex]
                let rtl = if let shape = layout.Lines[lineIndex].Shape {
                    shape.RightToLeft
                } else { false }
                let lineX = contentX + TextLayouts.lineOffset(node, line.Width, rtl, contentWidth)
                let natural = line.Descent - line.Ascent
                let baseline = lineY + (line.Height - natural) * 0.5F - line.Ascent
                for run in line.Runs {
                    guard let shape = run.Shape else { continue }
                    if !EmitShapeWithStyle(frame, shape,
                        run.Style.FontSize, lineX + run.X, baseline,
                        run.Style.Color, opacity, parentTransformIndex,
                        run.Style.StrokeWidth, run.Style.StrokeColor, run.Style.Shadows) {
                        result = false
                        break
                    }
                    if run.Style.Color.A > 0.0F {
                        AddRichDecorations(frame, run, lineX + run.X, baseline,
                            PackedColor(run.Style.Color, opacity), parentTransformIndex)
                    }
                }
                if !result { break }
                lineY = lineY + line.Height
                lineIndex = lineIndex + 1
            }
            return result
        }
        let lineHeight = TextLayouts.resolvedLineHeight(node)
        let natural = layout.Descent - layout.Ascent
        let leading = (lineHeight - natural) * 0.5F
        let color = PackedColor(node.Color, opacity)
        var result = true
        var lineIndex int32 = 0
        while lineIndex < layout.Lines.Count {
            let line = layout.Lines[lineIndex]
            guard let shape = line.Shape else {
                lineIndex = lineIndex + 1
                continue
            }
            let baseline = contentY + float32(lineIndex) * lineHeight + leading - layout.Ascent
            let lineX = contentX + TextLayouts.lineOffset(node, line, contentWidth)
            if !EmitShapeWithStyle(frame, shape, layout.FontSize, lineX, baseline,
                node.Color, opacity, parentTransformIndex, node.TextStrokeWidth.Px,
                node.TextStrokeColor, node.TextShadows) {
                result = false
                break
            }
            if node.Color.A > 0.0F {
                AddPlainDecorations(frame, shape, lineX, baseline, node.TextDecoration,
                    color, parentTransformIndex)
            }
            lineIndex = lineIndex + 1
        }
        return result
    }

    private func AddPlainDecorations(
        frame SceneFrame,
        shape ShapedText,
        lineX float32,
        baseline float32,
        decoration TextDecoration,
        color uint32,
        transformIndex int32) {
        if decoration == TextDecoration.None { return }
        for run in shape.Runs {
            if !HasVisibleGlyph(run) { continue }
            let left = lineX + MathF.Min(run.VisualStart, run.VisualEnd)
            let right = lineX + MathF.Max(run.VisualStart, run.VisualEnd)
            AddDecorationRecords(frame, decoration, left, right, baseline,
                shape.Ascent, shape.Descent, color, transformIndex)
        }
    }

    private func AddRichDecorations(
        frame SceneFrame,
        run TextPaintRun,
        originX float32,
        baseline float32,
        color uint32,
        transformIndex int32) {
        let decoration = run.Style.Decoration
        if decoration == TextDecoration.None { return }
        guard let shape = run.Shape else { return }
        if !HasVisibleGlyphs(shape) { return }
        guard let segments = TextPaintDecorations.Get(run) else { return }
        var index int32 = 0
        while index + 1 < segments.Length {
            let left = originX + segments[index]
            let right = originX + segments[index + 1]
            AddDecorationRecords(frame, decoration, left, right, baseline,
                shape.Ascent, shape.Descent, color, transformIndex)
            index = index + 2
        }
    }

    private func AddDecorationRecords(
        frame SceneFrame,
        decoration TextDecoration,
        left float32,
        right float32,
        baseline float32,
        ascent float32,
        descent float32,
        color uint32,
        transformIndex int32) {
        if decoration == TextDecoration.None || !FiniteValue(left) || !FiniteValue(right)
            || !FiniteValue(baseline) || !FiniteValue(ascent) || !FiniteValue(descent) {
            return
        }
        let minX = MathF.Min(left, right)
        let maxX = MathF.Max(left, right)
        let width = maxX - minX
        if !FiniteValue(width) || width <= 0.0F { return }
        let metricsHeight = descent - ascent
        if !FiniteValue(metricsHeight) || metricsHeight <= 0.0F { return }
        var thickness = metricsHeight * 0.06F
        if !FiniteValue(thickness) { return }
        if thickness < 1.0F { thickness = 1.0F }
        if !FiniteValue(thickness) || thickness <= 0.0F { return }
        let bits = int32(decoration)
        if (bits & int32(TextDecoration.Underline)) != 0 {
            var offset = descent * 0.45F
            if !FiniteValue(offset) { return }
            if offset < thickness { offset = thickness }
            AddUnderlineRecord(frame, minX, baseline + offset, width, thickness,
                color, 0u, transformIndex)
        }
        if (bits & int32(TextDecoration.LineThrough)) != 0 {
            let center = baseline + (ascent + descent) * 0.5F
            AddUnderlineRecord(frame, minX, center - thickness * 0.5F, width, thickness,
                color, 1u, transformIndex)
        }
    }

    private func AddUnderlineRecord(
        frame SceneFrame,
        x float32,
        y float32,
        width float32,
        thickness float32,
        color uint32,
        mode uint32,
        transformIndex int32) {
        if !FiniteValue(x) || !FiniteValue(y) || !FiniteValue(width)
            || !FiniteValue(thickness) || width <= 0.0F || thickness <= 0.0F {
            return
        }
        frame.AddUnderline(UnderlineRecord{
            Bounds: ConservativeBounds{ X: x, Y: y, Width: width, Height: thickness },
            Thickness: thickness,
            Color: color,
            Mode: mode,
            TransformIndex: transformIndex,
        })
    }

    private func HasVisibleGlyph(run ShapedRun) bool {
        var index int32 = 0
        while index < run.Glyphs.Length {
            if run.Glyphs[index] != 0u { return true }
            index = index + 1
        }
        return false
    }

    private func HasVisibleGlyphs(shape ShapedText) bool {
        for run in shape.Runs {
            if HasVisibleGlyph(run) { return true }
        }
        return false
    }

    private func FiniteValue(value float32) bool {
        return !Single.IsNaN(value) && !Single.IsInfinity(value)
    }

    internal func EmitEntry(
        frame SceneFrame,
        node Node,
        opacity float32,
        parentTransformIndex int32) bool {
        if opacity <= 0.0F { return true }
        let bufferShape = entryMetrics.BufferShape(node)
        let shape = if node.Buffer == "" {
            entryMetrics.PlaceholderShape(node)
        } else {
            bufferShape
        }
        let contentX = TextLayouts.ContentLeft(node)
        let contentY = TextLayouts.ContentTop(node)
        let contentHeight = TextLayouts.ContentHeight(node)
        let paintShape = shape ?? bufferShape
        let lineHeight = bufferShape.Descent - bufferShape.Ascent
        let lineTop = contentY + (contentHeight - lineHeight) * 0.5F
        let caretOriginX = entryMetrics.EntryOriginX(node, bufferShape)
        let originX = if node.Buffer == "" {
            contentX + entryMetrics.EntryOffset(node, paintShape)
        } else {
            caretOriginX
        }
        let baseline = lineTop - bufferShape.Ascent
        let clipped = BeginContentClip(frame, node, parentTransformIndex)
        if node.Focused && node.Buffer != "" && node.Caret != node.Anchor
            && node.SelectionColor.A > 0.0F {
            let selection = bufferShape.SelectionRects(node.Caret, node.Anchor)
            AddSelectionBoxes(frame, selection, originX, lineTop, lineHeight,
                node.SelectionColor, opacity, parentTransformIndex)
        }
        var result = true
        let textOpacity = if node.Buffer == "" { opacity * 0.45F } else { opacity }
        let color = PackedColor(node.Color, textOpacity)
        result = EmitShapeWithStyle(frame, paintShape, TextLayouts.fontSize(node),
            originX, baseline, node.Color, textOpacity, parentTransformIndex,
            node.TextStrokeWidth.Px, node.TextStrokeColor, node.TextShadows)
        if result && node.Color.A > 0.0F {
                AddPlainDecorations(frame, paintShape, originX, baseline,
                    node.TextDecoration, color, parentTransformIndex)
        }
        if result && node.Focused && BlinkVisible(node.BlinkT) {
            let caretX = caretOriginX + bufferShape.CaretX(node.Caret, int32(node.CaretAffinity))
            AddSolid(frame, ConservativeBounds{
                X: caretX,
                Y: lineTop,
                Width: 1.5F,
                Height: lineHeight,
            }, node.Color, opacity, parentTransformIndex)
        }
        if clipped { EndContentClip(frame, node, parentTransformIndex) }
        return result
    }

    internal func EmitEditor(
        frame SceneFrame,
        node Node,
        opacity float32,
        parentTransformIndex int32) bool {
        guard let state = node.EditorState else { return false }
        if opacity <= 0.0F { return true }
        let width = TextLayouts.ContentWidth(node)
        let height = TextLayouts.ContentHeight(node)
        let layout = TextEditorLayouts.For(node, width, height)
        for line in layout.Lines {
            if line.Slots.Count != 0 { return false }
        }
        let controller = state.Controller.State()
        let contentX = TextLayouts.ContentLeft(node)
        let contentY = TextLayouts.ContentTop(node)
        let scrollX = float32(controller.ScrollTargetX)
        let scrollY = float32(controller.ScrollTargetY)
        let activeLine = TextEditorLayouts.LineForPosition(layout, controller.Selection.Active)
        let clipped = BeginContentClip(frame, node, parentTransformIndex)
        let placeholder = if state.Document.Length == 0 && controller.Composition == nil {
            state.Placeholder(node)
        } else { nil }
        let selectionStart = controller.Selection.Anchor.Offset < controller.Selection.Active.Offset
            ? controller.Selection.Anchor.Offset : controller.Selection.Active.Offset
        let selectionEnd = controller.Selection.Anchor.Offset > controller.Selection.Active.Offset
            ? controller.Selection.Anchor.Offset : controller.Selection.Active.Offset
        var result = true
        for line in layout.Lines {
            let lineY = contentY + line.Top - scrollY
            let lineX = contentX + TextEditorLayouts.editorLineOffset(node, line, width) - scrollX
            if let current = activeLine {
                if controller.Focused && current == line && node.EditorCurrentLineColor.A > 0.0F {
                    AddSolid(frame, ConservativeBounds{
                        X: contentX,
                        Y: lineY,
                        Width: width,
                        Height: line.Height,
                    }, node.EditorCurrentLineColor, opacity, parentTransformIndex)
                }
            }
            if controller.Focused && selectionStart != selectionEnd
                && line.SourceEnd >= selectionStart
                && line.SourceStart <= selectionEnd {
                let displayStart = TextEditorLayouts.DisplayOffsetForSource(line.Paragraph,
                    selectionStart, TextAffinity.Downstream)
                let displayEnd = TextEditorLayouts.DisplayOffsetForSource(line.Paragraph,
                    selectionEnd, TextAffinity.Upstream)
                var localStart = displayStart - line.DisplayStart
                var localEnd = displayEnd - line.DisplayStart
                if localStart < 0 { localStart = 0 }
                if localEnd > line.DisplayLength { localEnd = line.DisplayLength }
                if localEnd > localStart {
                    let selection = TextEditorLayouts.SelectionRects(line, localStart, localEnd)
                    AddSelectionBoxes(frame, selection, lineX, lineY, line.Height,
                        node.SelectionColor, opacity, parentTransformIndex)
                }
            }
            if controller.Focused {
                if let composition = controller.Composition {
                    var compositionStart int32 = 0
                    var compositionEnd int32 = 0
                    if TextEditorLayouts.CompositionDisplayRange(line, composition,
                        out compositionStart, out compositionEnd)
                        && compositionEnd > compositionStart {
                        let selection = TextEditorLayouts.SelectionRects(line,
                            compositionStart, compositionEnd)
                        AddSelectionBoxes(frame, selection, lineX, lineY, line.Height,
                            node.SelectionColor, opacity, parentTransformIndex)
                    }
                }
            }
            guard let shape = line.Shape, let baseStyle = line.Paragraph.BaseStyle else {
                continue
            }
            let baseline = lineY + (line.Height - (line.Descent - line.Ascent)) * 0.5F
                - line.Ascent
            if line.Runs.Count != 0 {
                for run in line.Runs {
                    guard let runShape = run.Shape else { continue }
                    let color = PackedColor(run.Style.Color, opacity)
                    if !EmitShapeWithStyle(frame, runShape, run.Style.FontSize,
                        lineX + run.X, baseline, run.Style.Color, opacity,
                        parentTransformIndex, run.Style.StrokeWidth,
                        run.Style.StrokeColor, run.Style.Shadows) {
                        result = false
                        break
                    }
                    if run.Style.Color.A > 0.0F {
                        AddRichDecorations(frame, run, lineX + run.X, baseline,
                            color, parentTransformIndex)
                    }
                }
                if !result { break }
            } else {
                let color = PackedColor(baseStyle.Color, opacity)
                if !EmitShapeWithStyle(frame, shape, baseStyle.FontSize, lineX, baseline,
                    baseStyle.Color, opacity, parentTransformIndex, baseStyle.StrokeWidth,
                    baseStyle.StrokeColor, baseStyle.Shadows) {
                    result = false
                    break
                }
                if baseStyle.Color.A > 0.0F {
                    AddPlainDecorations(frame, shape, lineX, baseline,
                        baseStyle.Decoration, color, parentTransformIndex)
                }
            }
        }
        if result {
            if let value = placeholder {
                let line = layout.Lines[0]
                let lineX = contentX + TextLayouts.lineOffset(node, value.Width,
                    value.RightToLeft, width) - scrollX
                let natural = value.Descent - value.Ascent
                let baseline = contentY + line.Top - scrollY
                    + (line.Height - natural) * 0.5F - value.Ascent
                let color = PackedColor(node.Color, opacity * 0.45F)
                if !EmitShapeWithStyle(frame, value, TextLayouts.fontSize(node), lineX,
                    baseline, node.Color, opacity * 0.45F, parentTransformIndex,
                    node.TextStrokeWidth.Px, node.TextStrokeColor, node.TextShadows) {
                    result = false
                } else if node.Color.A > 0.0F {
                        AddPlainDecorations(frame, value, lineX, baseline,
                            node.TextDecoration, color, parentTransformIndex)
                }
            }
        }
        if result && controller.Focused && BlinkVisible(node.BlinkT) {
            let caret = if let composition = controller.Composition {
                TextEditorLayouts.CompositionCaretRect(node, composition)
            } else {
                TextEditorLayouts.CaretRect(node, controller.Selection.Active)
            }
            AddSolid(frame, ConservativeBounds{
                X: node.Rect.X + caret.X,
                Y: node.Rect.Y + caret.Y,
                Width: caret.W,
                Height: caret.H,
            }, node.EditorCaretColor, opacity, parentTransformIndex)
        }
        if clipped { EndContentClip(frame, node, parentTransformIndex) }
        return result
    }

    private func EmitShapeWithStyle(
        frame SceneFrame,
        shape ShapedText,
        fontSize float32,
        lineX float32,
        baseline float32,
        fillColor Color,
        opacity float32,
        parentTransformIndex int32,
        strokeWidth float32,
        strokeColor Color,
        shadows BoxShadowStack?) bool {
        let shadowCount = textShadowCount(shadows)
        var shadowIndex = shadowCount - 1
        while shadowIndex >= 0 {
            let shadow = textShadowAt(shadows, shadowIndex)
            if shadow.Color.A > 0.0F && shadow.Blur.Px <= 0.0F {
                if !EmitGlyphPass(frame, shape, fontSize, lineX, baseline,
                    PackedColor(shadow.Color, opacity), TextEffectShadow, 0.0F,
                    shadow.OffsetX.Px, shadow.OffsetY.Px, parentTransformIndex) {
                    return false
                }
            }
            shadowIndex = shadowIndex - 1
        }
        if strokeWidth > 0.0F && strokeWidth <= MaximumStrokeWidth
            && strokeColor.A > 0.0F {
            if !EmitGlyphPass(frame, shape, fontSize, lineX, baseline,
                PackedColor(strokeColor, opacity), TextEffectStroke, strokeWidth * 0.5F,
                0.0F, 0.0F, parentTransformIndex) {
                return false
            }
        }
        if fillColor.A <= 0.0F {
            return true
        }
        return EmitGlyphPass(frame, shape, fontSize, lineX, baseline,
            PackedColor(fillColor, opacity), TextEffectFill, 0.0F, 0.0F, 0.0F,
            parentTransformIndex)
    }

    private func EmitGlyphPass(
        frame SceneFrame,
        shape ShapedText,
        fontSize float32,
        lineX float32,
        baseline float32,
        color uint32,
        effectMode uint32,
        effectRadiusPixels float32,
        effectOffsetX float32,
        effectOffsetY float32,
        parentTransformIndex int32) bool {
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
                        if glyph.Scale <= 0 { return false }
                        let scale = fontSize / float32(glyph.Scale)
                        if scale <= 0.0F || !FiniteValue(scale) {
                            return false
                        }
                        if effectMode != TextEffectFill && glyph.RenderMode == 3u {
                            colorEffectSkipped = true
                            glyphIndex = glyphIndex + 1
                            continue
                        }
                        let point = run.Points[glyphIndex]
                        let originX = lineX + point.X
                        let originY = baseline - point.Y
                        let effectRadius = if effectMode == TextEffectStroke {
                            effectRadiusPixels / scale
                        } else { 0.0F }
                        let localMinX = minX - effectRadius
                        let localMinY = minY - effectRadius
                        let localMaxX = maxX + effectRadius
                        let localMaxY = maxY + effectRadius
                        let glyphOriginX = if effectMode == TextEffectShadow {
                            originX + effectOffsetX
                        } else { originX }
                        let glyphOriginY = if effectMode == TextEffectShadow {
                            originY + effectOffsetY
                        } else { originY }
                        let glyphMinX = glyphOriginX + localMinX * scale
                        let glyphMinY = glyphOriginY - localMaxY * scale
                        let glyphMaxX = glyphOriginX + localMaxX * scale
                        let glyphMaxY = glyphOriginY - localMinY * scale
                        frame.AddCachedGlyphRun(CachedGlyphRunRefRecord{
                            Bounds: ConservativeBounds{
                                X: glyphMinX,
                                Y: glyphMinY,
                                Width: glyphMaxX - glyphMinX,
                                Height: glyphMaxY - glyphMinY,
                            },
                            GlyphRunId: ResourceId{
                                Kind: SceneResourceKind.GlyphRun,
                                LogicalId: glyph.AtlasId.LogicalId,
                                Version: uint64(glyph.ByteOffset / 8u) + 1uL,
                            },
                            AtlasId: glyph.AtlasId,
                            GlyphId: glyphId,
                            AtlasTexelOffset: glyph.ByteOffset / 8u,
                            AtlasTexelCount: glyph.ByteLength / 8u,
                            GlyphMinX: localMinX,
                            GlyphMinY: localMinY,
                            GlyphMaxX: localMaxX,
                            GlyphMaxY: localMaxY,
                            Color: color,
                            RenderMode: glyph.RenderMode,
                            EffectMode: effectMode,
                            EffectRadius: effectRadius,
                            TransformIndex: frame.AddTransform(TransformRecord{
                                A: scale,
                                B: 0.0F,
                                C: 0.0F,
                                D: -scale,
                                TX: glyphOriginX,
                                TY: glyphOriginY,
                                ParentIndex: parentTransformIndex,
                            }),
                        })
                    }
                }
                glyphIndex = glyphIndex + 1
            }
        }
        return true
    }

    private func BeginContentClip(frame SceneFrame, node Node, transformIndex int32) bool {
        let bounds = ContentBounds(node)
        if bounds.IsEmpty { return false }
        frame.AddRectClipBegin(RectClipRecord{
            Bounds: bounds,
            TransformIndex: transformIndex,
            ParentIndex: -1,
        })
        return true
    }

    private func EndContentClip(frame SceneFrame, node Node, transformIndex int32) {
        frame.AddRectClipEnd(RectClipRecord{
            Bounds: ContentBounds(node),
            TransformIndex: transformIndex,
            ParentIndex: -1,
        })
    }

    private func ContentBounds(node Node) ConservativeBounds {
        return ConservativeBounds{
            X: TextLayouts.ContentLeft(node),
            Y: TextLayouts.ContentTop(node),
            Width: TextLayouts.ContentWidth(node),
            Height: TextLayouts.ContentHeight(node),
        }
    }

    private func AddSelectionBoxes(
        frame SceneFrame,
        values IReadOnlyList[float32],
        originX float32,
        y float32,
        height float32,
        color Color,
        opacity float32,
        transformIndex int32) {
        if color.A <= 0.0F || opacity <= 0.0F { return }
        var index int32 = 0
        while index + 1 < values.Count {
            let left = values[index]
            let right = values[index + 1]
            if right > left {
                AddSolid(frame, ConservativeBounds{
                    X: originX + left,
                    Y: y,
                    Width: right - left,
                    Height: height,
                }, color, opacity, transformIndex)
            }
            index = index + 2
        }
    }

    private func AddSolid(
        frame SceneFrame,
        bounds ConservativeBounds,
        color Color,
        opacity float32,
        transformIndex int32) {
        if color.A <= 0.0F || opacity <= 0.0F || bounds.IsEmpty { return }
        frame.AddSolidBox(SolidBoxRecord{
            Bounds: bounds,
            Color: PackedColor(color, opacity),
            Opacity: 1.0F,
            TransformIndex: transformIndex,
        })
    }

    private func PackedColor(color Color, opacity float32) uint32 {
        return Color.FromNormalized(color.R, color.G, color.B, color.A * opacity).ToPackedRgba()
    }

    private func BlinkVisible(value float64) bool {
        let phase = value - Math.Floor(value)
        return phase < 0.5
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
                colorGlyphFallback = true
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
            || state.KeyCount >= int32(state.Atlas.ByteSize / 8uL) {
            var createdIndex int32 = -1
            if atlasSet.CanCreateAtlas {
                createdIndex = atlasSet.CreateAtlas()
            }
            if createdIndex < 0 {
                if !RecycleAtlas() {
                    capacityExhausted = true
                    throw InvalidOperationException("Vulkan text atlas capacity is exhausted")
                }
                state = CurrentState()
            } else {
                EnsureAtlasStates()
                state = states[createdIndex]!!
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
        let requiredByteCount = byteOffset + uint32(providerResult.Count)
        state.EnsureByteCapacity(requiredByteCount)
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
            if atlasSet.IsActive(index) {
                let identity = atlasSet.IdentityAt(index)
                if let state = states[index] {
                    if !SameIdentity(state.Identity, identity) {
                        RemoveStateGlyphs(state)
                        states[index] = nil
                        stateCount = stateCount - 1
                    }
                }
                if states[index] == nil {
                    states[index] = VulkanTextSceneAtlasState(
                        atlasSet.AtlasAt(index), identity)
                    stateCount = stateCount + 1
                }
            } else if let state = states[index] {
                RemoveStateGlyphs(state)
                states[index] = nil
                stateCount = stateCount - 1
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
        var identity ResourceId
        try {
            identity = atlasSet.RecycleAtlas(index, completedGlobalSubmissionSerial)
        } catch (error Exception) {
            RemoveStateGlyphs(state)
            states[index] = nil
            stateCount = stateCount - 1
            throw error
        }
        RemoveStateGlyphs(state)
        state.Reset(atlasSet.AtlasAt(index), identity)
        capacityExhausted = false
        return true
    }

    private func RemoveStateGlyphs(state VulkanTextSceneAtlasState) {
        var keyIndex int32 = 0
        while keyIndex < state.KeyCount {
            glyphs.Remove(state.Keys[keyIndex])
            state.Keys[keyIndex] = VulkanTextAtlasGlyphKey{}
            keyIndex = keyIndex + 1
        }
        state.KeyCount = 0
    }

    private func SameIdentity(left ResourceId, right ResourceId) bool {
        return left.Kind == right.Kind && left.LogicalId == right.LogicalId
            && left.Version == right.Version
    }

    private func MarkActiveAtlas(glyph VulkanTextAtlasGlyph) {
        let index = atlasSet.FindIndex(glyph.AtlasId)
        if index >= 0 && index < activeAtlasUse.Length {
            activeAtlasUse[index] = true
        }
    }
}
