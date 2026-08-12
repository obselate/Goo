using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using Goo;
using Goo.InternalTextInterop;
using SkiaSharp;
using Xunit;

[Trait("Category", "Performance")]
public sealed class AllocationTests
{
    [Fact]
    public void LeafUpdateAtScaleStaysWithinBudget()
    {
        var bytes = new PerformanceFixtures().CellScaleLeafChangeBytes(200);

        Assert.InRange(bytes, 0, 20_000);
    }

    [Fact]
    public void MotionSweepStaysWithinBudget()
    {
        var bytes = new PerformanceFixtures().MotionTickBytes();

        Assert.InRange(bytes, 0, 256);
    }

    [Fact]
    public void BlobDeclarationsStayWithinInlineAndSpillAllocationBudgets()
    {
        var fixtures = new PerformanceFixtures();
        fixtures.PrepareBuildAllocation();
        for (var i = 0; i < 8; i++)
        {
            Assert.Equal(0, fixtures.BuildEmptyContainer());
            Assert.Equal(0, fixtures.BuildEmptyCell());
            Assert.Equal(1, fixtures.BuildOneEntryStyle());
            Assert.Equal(4, fixtures.BuildFourEntryStyle());
            Assert.Equal(5, fixtures.BuildFiveEntryStyle());
            Assert.Equal(6, fixtures.BuildStyledContainer());
            Assert.Equal(2, fixtures.BuildTreeChildCount());
        }

        Assert.Equal(192, Measure(fixtures.BuildEmptyContainer, out _));
        Assert.Equal(192, Measure(fixtures.BuildEmptyCell, out _));
        Assert.InRange(Measure(fixtures.BuildOneEntryStyle, out _), 0, 184);
        Assert.InRange(Measure(fixtures.BuildFourEntryStyle, out _), 0, 184);
        Assert.InRange(Measure(fixtures.BuildFiveEntryStyle, out _), 0, 368);
        Assert.InRange(Measure(fixtures.BuildStyledContainer, out _), 0, 536);
        Assert.InRange(Measure(fixtures.BuildTreeChildCount, out _), 0, 1_032);
    }

    [Fact]
    public void WarmGradientPaintStaysWithinBudget()
    {
        var fixtures = new PerformanceFixtures();
        var shared = fixtures.PrepareLinearGradientPaint(600);
        var distinct = fixtures.PrepareDistinctLinearGradientPaint(600);
        var shapes = fixtures.PrepareDistinctShapeGradientPaint(32);
        var capacity = fixtures.PrepareDistinctShapeGradientPaint(66);
        Assert.Equal(600, fixtures.GradientPaintChildCount(shared));
        Assert.Equal(600, fixtures.GradientPaintChildCount(distinct));
        Assert.Equal(32, fixtures.GradientPaintChildCount(shapes));
        Assert.Equal(66, fixtures.GradientPaintChildCount(capacity));
        using var sharedSurface = SKSurface.Create(new SKImageInfo(800, 600));
        using var distinctSurface = SKSurface.Create(new SKImageInfo(800, 600));
        using var shapeSurface = SKSurface.Create(new SKImageInfo(800, 600));
        using var capacitySurface = SKSurface.Create(new SKImageInfo(800, 600));
        Assert.NotNull(sharedSurface);
        Assert.NotNull(distinctSurface);
        Assert.NotNull(shapeSurface);
        Assert.NotNull(capacitySurface);
        for (var i = 0; i < 8; i++)
        {
            shared.PaintTo(sharedSurface!.Canvas);
            distinct.PaintTo(distinctSurface!.Canvas);
            shapes.PaintTo(shapeSurface!.Canvas);
            capacity.PaintTo(capacitySurface!.Canvas);
        }

        var sharedBytes = MeasurePaint(shared, sharedSurface!);
        var distinctBytes = MeasurePaint(distinct, distinctSurface!);
        var shapeBytes = MeasurePaint(shapes, shapeSurface!);
        var capacityBytes = MeasurePaint(capacity, capacitySurface!);
        Console.WriteLine(
            $"gradient-paint shared={sharedBytes} B/{MedianPaintMicros(shared, sharedSurface!):F2} us, " +
            $"distinct={distinctBytes} B/{MedianPaintMicros(distinct, distinctSurface!):F2} us, " +
            $"shapes={shapeBytes} B/{MedianPaintMicros(shapes, shapeSurface!):F2} us, " +
            $"capacity={capacityBytes} B/{MedianPaintMicros(capacity, capacitySurface!):F2} us");
        Assert.InRange(sharedBytes, 0, 1_024);
        Assert.InRange(distinctBytes, 0, 1_024);
        Assert.InRange(shapeBytes, 0, 1_024);
        Assert.InRange(capacityBytes, 0, 12_000);
        Assert.Equal(1, shared.GradientShaderCountForTests);
        Assert.Equal(1, distinct.GradientShaderCountForTests);
        Assert.Equal(32, shapes.GradientShaderCountForTests);
        Assert.Equal(64, capacity.GradientShaderCountForTests);
        try
        {
            shared.Close();
            distinct.Close();
            shapes.Close();
            capacity.Close();
        }
        finally
        {
            Assert.Equal(0, shared.GradientShaderCountForTests);
            Assert.Equal(0, distinct.GradientShaderCountForTests);
            Assert.Equal(0, shapes.GradientShaderCountForTests);
            Assert.Equal(0, capacity.GradientShaderCountForTests);
        }
    }

    [Fact]
    public void WarmBackgroundImagePaintStaysWithinBudget()
    {
        var fixtures = new PerformanceFixtures();
        var window = fixtures.PrepareBackgroundImagePaint(600, false);
        Assert.Equal(600, fixtures.BackgroundImagePaintChildCount(window));
        using var surface = SKSurface.Create(new SKImageInfo(800, 600));
        Assert.NotNull(surface);
        for (var i = 0; i < 8; i++)
            window.PaintTo(surface!.Canvas);

        Assert.InRange(MeasurePaint(window, surface!), 0, 256);
    }

    [Fact]
    public void WarmOwnedBackgroundImagePaintStaysAtExactBudget()
    {
        var fixtures = new PerformanceFixtures();
        var window = fixtures.PrepareOwnedBackgroundImagePaint(600);
        Assert.Equal(600, fixtures.BackgroundImagePaintChildCount(window));
        using var surface = SKSurface.Create(new SKImageInfo(800, 600));
        Assert.NotNull(surface);
        for (var i = 0; i < 8; i++)
            window.PaintTo(surface!.Canvas);

        Assert.Equal(88, MeasurePaint(window, surface!));
        window.Close();
    }

    [Fact]
    public void WarmClipPathPaintAndHitStayWithinBudget()
    {
        var fixtures = new PerformanceFixtures();
        var paint = fixtures.PrepareClipPathPaint(200, true);
        var hit = fixtures.PrepareClipPathHit(1_000, true);
        Assert.Equal(200, fixtures.ClipPathPaintChildCount(paint));
        using var surface = SKSurface.Create(new SKImageInfo(800, 600));
        Assert.NotNull(surface);
        for (var i = 0; i < 5; i++)
        {
            paint.PaintTo(surface!.Canvas);
            Assert.Equal(1, fixtures.ClipPathHit(hit));
        }

        Assert.InRange(MeasurePaint(paint, surface!), 0, 256);
        var hitBytes = Measure(() => fixtures.ClipPathHit(hit), out var hitResult);
        Assert.Equal(1, hitResult);
        Assert.InRange(hitBytes, 0, 256);
    }

    [Fact]
    public void TransformedPointerDispatchStaysWithinBudget()
    {
        var fixtures = new PerformanceFixtures();
        fixtures.PrepareTransformPointerDispatch(100, true);
        for (var i = 0; i < 5; i++)
            Assert.Equal(1, fixtures.TransformPointerDispatch());

        var bytes = Measure(fixtures.TransformPointerDispatch, out var result);
        Assert.Equal(1, result);
        Assert.Equal(0, bytes);
    }

    [Fact]
    public void PlainPointerDispatchStaysAllocationFree()
    {
        var fixtures = new PerformanceFixtures();
        fixtures.PrepareTransformPointerDispatch(100, false);
        for (var i = 0; i < 5; i++)
            Assert.Equal(1, fixtures.TransformPointerDispatch());

        var bytes = Measure(fixtures.TransformPointerDispatch, out var result);
        Assert.Equal(1, result);
        Assert.Equal(0, bytes);
    }

    [Fact]
    public void QueuedPointerBurstsDeliverEveryMoveWithoutAllocating()
    {
        AssertBurst(1, false);
        AssertBurst(2, true);
        AssertBurst(3, false);
        AssertBurst(4, false);
    }

    [Fact]
    public void SparseElementMetricsKeepUnsubscribedAndWarmNotificationPathsAllocationFree()
    {
        var fixtures = new ElementHandleFixtures();
        Assert.Equal(0, fixtures.NoHandleDiffBytes());
        Assert.Equal(0, fixtures.HandleNoSubscriptionDiffBytes());
        Assert.Equal(0, fixtures.HandleNoSubscriptionFrameBytes());
        Assert.Equal(0, fixtures.MetricsNotificationBytes());
    }

    [Fact]
    public void KeyboardDispatchStaysWithinPointerBudget()
    {
        var fixtures = new PerformanceFixtures();
        fixtures.PrepareKeyboardDispatch();
        for (var i = 0; i < 5; i++)
            Assert.Equal(i + 1, fixtures.KeyboardDispatch());

        var bytes = Measure(fixtures.KeyboardDispatch, out var result);
        Assert.Equal(6, result);
        Assert.Equal(0, bytes);
    }

    [Fact]
    public void GenericTextCallbacksKeepDefaultDeclarationAndStableDiffCostsUnchanged()
    {
        var fixtures = new TextInputPrimitivesFixtures();

        Assert.Equal(192, fixtures.TextCallbackOptOutDeclarationBytes());
        Assert.Equal(0, fixtures.TextCallbackOptOutStableDiffBytes());
    }

    [Fact]
    public void RoundedShapeHitTraversalStaysWithinBudget()
    {
        var bytes = new ShapeFixtures().ShapeHitTraversalBytes();

        Assert.InRange(bytes, 0, 256);
    }

    [Fact]
    public void MonolithicActiveFrameStaysWithinBudget()
    {
        var fixtures = new PerformanceFixtures();
        Assert.Equal(1_001, fixtures.PrepareScale(200));
        for (var i = 0; i < 8; i++)
            Assert.Equal(1, fixtures.StepScaleDirty());

        var bytes = Measure(fixtures.StepScaleDirty, out var result);

        Assert.Equal(1, result);
        Assert.InRange(bytes, 0, 410_000);
    }

    [Fact]
    public void ComponentizedActiveFrameStaysWithinBudget()
    {
        var fixtures = new PerformanceFixtures();
        Assert.Equal(1_001, fixtures.PrepareComponentizedScale(200));
        for (var i = 0; i < 8; i++)
        {
            var tick = fixtures.StepComponentizedScaleDirty();
            Assert.True(tick > 0 && fixtures.ComponentizedScaleFirstLabelMatches(tick));
        }

        var bytes = Measure(fixtures.StepComponentizedScaleDirty, out var result);

        Assert.True(result > 0 && fixtures.ComponentizedScaleFirstLabelMatches(result));
        Assert.InRange(bytes, 0, 38_000);
    }

    [Fact]
    public void CallbackComponentizedActiveFrameStaysWithinBudget()
    {
        var fixtures = new PerformanceFixtures();
        Assert.Equal(1_001, fixtures.PrepareComponentizedCallbackScale(200));
        for (var i = 0; i < 8; i++)
        {
            var tick = fixtures.StepComponentizedCallbackScaleDirty();
            Assert.True(tick > 0 && fixtures.ComponentizedCallbackScaleFirstLabelMatches(tick));
        }

        var bytes = Measure(fixtures.StepComponentizedCallbackScaleDirty, out var result);

        Assert.True(result > 0 && fixtures.ComponentizedCallbackScaleFirstLabelMatches(result));
        Assert.InRange(bytes, 0, 38_000);
    }

    [Fact]
    public void UnhandledWheelStaysAllocationFreeAfterWarmup()
    {
        var fixtures = new PerformanceFixtures();
        fixtures.PrepareUnhandledWheel();
        for (var i = 0; i < 8; i++)
            Assert.Equal(0, fixtures.StepUnhandledWheel());

        var bytes = Measure(fixtures.StepUnhandledWheel, out var result);

        Assert.Equal(0, result);
        Assert.Equal(0, bytes);
    }

    [Fact]
    public void EmptyDispatcherDrainStaysAllocationFree()
    {
        Assert.Equal(0, new WindowFixtures().EmptyDispatcherDrainBytes());
    }

    [Fact]
    public void RasterPaintAtScaleStaysWithinBudget()
    {
        var window = new PerformanceFixtures().PrepareScalePaint(200);
        using var surface = SKSurface.Create(new SKImageInfo(1280, 720));
        Assert.NotNull(surface);
        for (var i = 0; i < 8; i++)
            window.PaintTo(surface!.Canvas);

        Assert.InRange(MeasurePaint(window, surface!), 0, 192);
    }

    [Fact]
    public void WarmRasterColorConversionStaysAllocationFree()
    {
        const int pixelCount = 1_024;
        var source = Marshal.AllocHGlobal(pixelCount * 8);
        var destination = Marshal.AllocHGlobal(pixelCount * 4);
        try
        {
            for (var index = 0; index < pixelCount * 4; index++)
                Marshal.WriteInt16(source, index * 2, unchecked((short)(index * 257)));

            Action convert = () => RasterColorPipeline.ConvertLinearRgba16ToSrgbBgra8(
                source,
                destination,
                pixelCount);
            convert();
            for (var warmup = 0; warmup < 8; warmup++)
                convert();

            Assert.NotEqual(0, Marshal.ReadInt32(destination));
            Assert.Equal(0, Measure(convert));
        }
        finally
        {
            Marshal.FreeHGlobal(destination);
            Marshal.FreeHGlobal(source);
        }
    }

    [Fact]
    public void OneMiBEditorSemanticEditStaysWithinBudget()
    {
        using var editor = new EditorAllocationCase();
        for (var i = 0; i < 8; i++)
            Assert.True(editor.SemanticEdit() > 0);

        var bytes = Measure(editor.SemanticEdit, out var version);

        Assert.True(version > 0);
        Assert.InRange(bytes, 0, 82_500);
    }

    [Fact]
    public void OneMiBEditorUpdateAndPaintStaysWithinBudget()
    {
        using var editor = new EditorAllocationCase();
        for (var i = 0; i < 8; i++)
            Assert.True(editor.EditUpdateAndPaint() > 0);

        var bytes = Measure(editor.EditUpdateAndPaint, out var version);

        Assert.True(version > 0);
        Assert.InRange(bytes, 0, 83_500);
    }

    [Fact]
    public void OneMiBEditorUnchangedUpdateAndPaintStaysWithinBudget()
    {
        using var editor = new EditorAllocationCase();
        for (var i = 0; i < 8; i++)
            Assert.True(editor.UpdateAndPaint() > 0);

        var bytes = Measure(editor.UpdateAndPaint, out var version);

        Assert.True(version > 0);
        Assert.InRange(bytes, 0, 1_024);
    }

    [Fact]
    public void LargeDocumentPresentationSemanticEditStaysWithinBudget()
    {
        using var editor = new LargeDocumentEditorAllocationCase();
        for (var i = 0; i < 8; i++)
            Assert.True(editor.SemanticEdit() > 0);

        var bytes = Measure(editor.SemanticEdit, out var version);

        Assert.True(version > 0);
        Assert.InRange(bytes, 0, 185_000);
    }

    [Fact]
    public void InteractiveTextUpdatesStayWithinBudget()
    {
        var reflowBytes = new PerformanceFixtures().CellScaleIntrinsicTextReflowBytes(200);
        var typing = new PerformanceFixtures();
        typing.PrepareTyping();
        for (var i = 0; i < 5; i++)
            typing.StepTyping();

        var before = GC.GetAllocatedBytesForCurrentThread();
        typing.StepTyping();
        var keystrokeBytes = GC.GetAllocatedBytesForCurrentThread() - before;

        Assert.InRange(reflowBytes, 0, 450_000);
        Assert.InRange(keystrokeBytes, 0, 3_744);
    }

    [Fact]
    public void FirstRetainedTextGeometryQueriesStayAllocationFree()
    {
        var point = new TextGeometryFixtures();
        Assert.Equal(1, point.PrepareWarmStaticGeometryQueries());
        var pointBytes = Measure(point.WarmStaticGeometryPoint, out var pointResult);

        var caret = new TextGeometryFixtures();
        Assert.Equal(1, caret.PrepareWarmStaticGeometryQueries());
        var caretBytes = Measure(caret.WarmStaticGeometryCaret, out var caretResult);

        var range = new TextGeometryFixtures();
        Assert.Equal(1, range.PrepareWarmStaticGeometryQueries());
        var rangeBytes = Measure(range.WarmStaticGeometryRange, out var rangeResult);

        var cached = new TextGeometryFixtures();
        Assert.Equal(1, cached.PrepareCachedStaticGeometryQuery());
        var cachedBytes = Measure(cached.WarmCachedStaticGeometryCaret, out var cachedResult);

        Assert.True(pointResult >= 0);
        Assert.True(caretResult > 0);
        Assert.True(rangeResult > 0);
        Assert.True(cachedResult > 0);
        Assert.Equal(0, pointBytes);
        Assert.Equal(0, caretBytes);
        Assert.Equal(0, rangeBytes);
        Assert.Equal(0, cachedBytes);
    }

    [Fact]
    public void RetainedEntryAndProjectedEditorGeometryQueriesStayAllocationFree()
    {
        var entry = new TextGeometryFixtures();
        Assert.Equal(1, entry.PrepareWarmEntryGeometryRange());
        var entryBytes = Measure(entry.WarmEntryGeometryRange, out var entryResult);

        var editorPoint = new TextGeometryFixtures();
        Assert.Equal(1, editorPoint.PrepareWarmProjectedEditorGeometryQueries());
        var editorPointBytes = Measure(editorPoint.WarmProjectedEditorGeometryPoint, out var editorPointResult);

        var editorRange = new TextGeometryFixtures();
        Assert.Equal(1, editorRange.PrepareWarmProjectedEditorGeometryQueries());
        var editorRangeBytes = Measure(editorRange.WarmProjectedEditorGeometryRange, out var editorRangeResult);

        Assert.True(entryResult > 0);
        Assert.True(editorPointResult >= 0);
        Assert.True(editorRangeResult > 0);
        Assert.Equal(0, entryBytes);
        Assert.Equal(0, editorPointBytes);
        Assert.Equal(0, editorRangeBytes);
    }

    [Fact]
    public void HandledStaticGeometryLayoutHasBoundedSetupAllocation()
    {
        var fixtures = new TextGeometryFixtures();
        fixtures.StaticGeometryLayoutAllocationBytes(false);
        fixtures.StaticGeometryLayoutAllocationBytes(true);

        var unhandled = fixtures.StaticGeometryLayoutAllocationBytes(false);
        var handled = fixtures.StaticGeometryLayoutAllocationBytes(true);
        var delta = handled - unhandled;

        Assert.InRange(delta, 0, 16_384);
    }

    private static long MeasurePaint(Window window, SKSurface surface)
    {
        var before = GC.GetAllocatedBytesForCurrentThread();
        window.PaintTo(surface.Canvas);
        return GC.GetAllocatedBytesForCurrentThread() - before;
    }

    private static double MedianPaintMicros(Window window, SKSurface surface)
    {
        const int samples = 7;
        const int iterations = 16;
        var values = new double[samples];
        for (var sample = 0; sample < samples; sample++)
        {
            var start = Stopwatch.GetTimestamp();
            for (var iteration = 0; iteration < iterations; iteration++)
                window.PaintTo(surface.Canvas);
            values[sample] = (Stopwatch.GetTimestamp() - start) * 1_000_000.0
                / Stopwatch.Frequency / iterations;
        }
        Array.Sort(values);
        return values[samples / 2];
    }

    private static long Measure(Action operation)
    {
        var before = GC.GetAllocatedBytesForCurrentThread();
        operation();
        return GC.GetAllocatedBytesForCurrentThread() - before;
    }

    private static void AssertBurst(int mode, bool transformed)
    {
        var fixtures = new PerformanceFixtures();
        fixtures.PreparePointerBurst(mode, transformed);
        for (var i = 0; i < 5; i++)
            Assert.Equal(1, fixtures.PointerBurst());

        var bytes = Measure(fixtures.PointerBurst, out var result);
        Assert.Equal(1, result);
        Assert.Equal(0, bytes);
    }

    private static long Measure(Func<int> operation, out int result)
    {
        var before = GC.GetAllocatedBytesForCurrentThread();
        result = operation();
        return GC.GetAllocatedBytesForCurrentThread() - before;
    }

    private static long Measure(Func<long> operation, out long result)
    {
        var before = GC.GetAllocatedBytesForCurrentThread();
        result = operation();
        return GC.GetAllocatedBytesForCurrentThread() - before;
    }

    private sealed class EditorAllocationCase : IDisposable
    {
        private const int Width = 800;
        private const int Height = 520;
        private readonly TextDocument document;
        private readonly TextEditorController controller;
        private readonly Window window;
        private readonly SKSurface surface;
        private bool insert = true;

        internal EditorAllocationCase()
        {
            document = new TextDocument(LargeSource());
            controller = new TextEditorController(document)
            {
                Selection = CollapsedSelection(32),
            };
            var editor = new TextEditor(document, controller)
            {
                Width = Length.Percent(100),
                Height = Length.Percent(100),
            };
            window = new Window
            {
                Width = Width,
                Height = Height,
                Root = new EditorRootCell(editor),
            };
            window.UpdateTree();
            window.UpdateTree(0);
            surface = SKSurface.Create(new SKImageInfo(Width, Height))
                ?? throw new InvalidOperationException("editor allocation surface creation failed");
            window.PaintTo(surface.Canvas);
            window.markFrameRendered();
        }

        internal long SemanticEdit()
        {
            var accepted = insert ? controller.Insert("x") : controller.DeleteBackward();
            insert = !insert;
            if (!accepted)
                throw new InvalidOperationException("editor allocation edit was rejected");
            return document.Version;
        }

        internal long EditUpdateAndPaint()
        {
            var version = SemanticEdit();
            UpdateAndPaint();
            return version;
        }

        internal long UpdateAndPaint()
        {
          window.UpdateTree(0);
          window.PaintTo(surface.Canvas);
          window.markFrameRendered();
          return 1;
        }

        public void Dispose()
        {
            if (window.Tree is not null)
                TextLayouts.DisposeTree(window.Tree);
            surface.Dispose();
            controller.Dispose();
        }

        private static TextSelection CollapsedSelection(int offset) => new(
            new TextPosition(offset, TextAffinity.Downstream),
            new TextPosition(offset, TextAffinity.Downstream));

        private static string LargeSource()
        {
            const int size = 1024 * 1024;
            const string line = "The quick brown fox jumps over the lazy dog. Goo TextEditor allocation gate 0123456789.\n";
            var result = new StringBuilder(size + line.Length);
            while (result.Length < size)
                result.Append(line);
            result.Length = size;
            return result.ToString();
        }
    }

    private sealed class LargeDocumentEditorAllocationCase : IDisposable
    {
        private const int Width = 800;
        private const int Height = 520;
        private readonly TextDocument document;
        private readonly TextEditorController controller;
        private readonly TextPresentationLayer layer;
        private readonly Window window;
        private readonly SKSurface surface;
        private readonly int editOffset;
        private bool insert = true;

        internal LargeDocumentEditorAllocationCase()
        {
            var source = LargeDocumentSource();
            document = new TextDocument(source);
            controller = new TextEditorController(document);
            layer = new TextPresentationLayer(document);
            Configure(layer, source);
            document.Changed += Synchronize;
            editOffset = source.IndexOf("IME composition target: ", StringComparison.Ordinal)
                + "IME composition target: ".Length;
            controller.Selection = CollapsedSelection(editOffset);
            var editor = new TextEditor(document, controller, new[] { layer })
            {
                Width = Length.Percent(100),
                Height = Length.Percent(100),
            };
            window = new Window
            {
                Width = Width,
                Height = Height,
                Root = new EditorRootCell(editor),
            };
            window.UpdateTree();
            window.UpdateTree(0);
            surface = SKSurface.Create(new SKImageInfo(Width, Height))
                ?? throw new InvalidOperationException("large-document allocation surface creation failed");
            window.PaintTo(surface.Canvas);
            window.markFrameRendered();
        }

        internal long SemanticEdit()
        {
            var accepted = insert ? controller.Insert("x") : controller.DeleteBackward();
            insert = !insert;
            if (!accepted)
                throw new InvalidOperationException("large-document allocation edit was rejected");
            return document.Version;
        }

        public void Dispose()
        {
            document.Changed -= Synchronize;
            if (window.Tree is not null)
                TextLayouts.DisposeTree(window.Tree);
            surface.Dispose();
            layer.Dispose();
            controller.Dispose();
        }

        private void Synchronize(TextDocumentChange _)
        {
            var source = document.GetText();
            RequireStyle("heading", source, "# Goo TextEditor");
            RequireStyle("keyboard", source, "Keyboard checks");
            RequireStyle("unicode", source, "Unicode checks");
            RequireStyle("presentation", source, "Presentation checks");
            RequireProjection("bold.open", TextProjectionKind.Hidden, source, "**bold source**", 0, "");
            RequireProjection("bold.close", TextProjectionKind.Hidden, source, "**bold source**", 13, "");
            RequireStyle("bold.text", source, "**bold source**", 2, 11);
            RequireProjection("status", TextProjectionKind.InlineSlot, source, "[[status]]", 0, "");
            RequireProjection("link", TextProjectionKind.Replacement, source, "https://goo.local/docs", 0,
                "Goo documentation");
            RequireStyle("link.style", source, "https://goo.local/docs");
            RequireProjection("preview", TextProjectionKind.BlockSlot, source, "[[preview]]", 0, "");
        }

        private void RequireStyle(string key, string source, string text, int offset = 0, int length = -1)
        {
            var start = source.IndexOf(text, StringComparison.Ordinal) + offset;
            var range = new TextRange(start, length < 0 ? text.Length : length);
            foreach (var span in layer.StyleSpans)
            {
                if (span.Key == key && span.Range == range)
                    return;
            }
            throw new InvalidOperationException($"missing synchronized style {key}");
        }

        private void RequireProjection(string key, TextProjectionKind kind, string source,
            string text, int offset, string replacement)
        {
            var start = source.IndexOf(text, StringComparison.Ordinal) + offset;
            var length = kind == TextProjectionKind.Hidden ? 2 : text.Length;
            var range = new TextRange(start, length);
            foreach (var projection in layer.Projections)
            {
                if (projection.Key == key && projection.Kind == kind && projection.Range == range
                    && (kind != TextProjectionKind.Replacement || projection.Text == replacement))
                    return;
            }
            throw new InvalidOperationException($"missing synchronized projection {key}");
        }

        private static void Configure(TextPresentationLayer layer, string source)
        {
            SetStyle(layer, "heading", source, "# Goo TextEditor", Color.Rgb(88, 166, 255), 22);
            SetStyle(layer, "keyboard", source, "Keyboard checks", Color.Rgb(210, 153, 34), 14);
            SetStyle(layer, "unicode", source, "Unicode checks", Color.Rgb(63, 185, 80), 14);
            SetStyle(layer, "presentation", source, "Presentation checks", Color.Rgb(248, 81, 73), 14);
            var bold = source.IndexOf("**bold source**", StringComparison.Ordinal);
            layer.SetHiddenRange("bold.open", new TextRange(bold, 2));
            layer.SetHiddenRange("bold.close", new TextRange(bold + 13, 2));
            layer.SetStyle("bold.text", new TextRange(bold + 2, 11), new Style
            {
                FontWeight = 700,
                TextDecoration = TextDecoration.Underline,
            });
            var status = source.IndexOf("[[status]]", StringComparison.Ordinal);
            layer.SetInlineSlot("status", new TextRange(status, 10), new Text { Content = "READY" });
            var link = source.IndexOf("https://goo.local/docs", StringComparison.Ordinal);
            layer.SetReplacement("link", new TextRange(link, 22), "Goo documentation");
            layer.SetStyle("link.style", new TextRange(link, 22), new Style
            {
                Color = Color.Rgb(88, 166, 255),
                TextDecoration = TextDecoration.Underline,
            });
            var preview = source.IndexOf("[[preview]]", StringComparison.Ordinal);
            layer.SetBlockSlot("preview", new TextRange(preview, 11), new Text { Content = "Preview" });
        }

        private static void SetStyle(TextPresentationLayer layer, string key, string source,
            string text, Color color, double size)
        {
            layer.SetStyle(key, new TextRange(source.IndexOf(text, StringComparison.Ordinal), text.Length),
                new Style { Color = color, FontSize = size, FontWeight = 700 });
        }

        private static TextSelection CollapsedSelection(int offset) => new(
            new TextPosition(offset, TextAffinity.Downstream),
            new TextPosition(offset, TextAffinity.Downstream));

        private static string LargeDocumentSource() => "# Goo TextEditor\n"
            + "\n"
            + "Edit this document. It is backed by a versioned piece tree.\n"
            + "\n"
            + "Keyboard checks\n"
            + "- Shift + arrows extends the selection.\n"
            + "- Ctrl+A/C/X/V tests selection and clipboard.\n"
            + "\n"
            + "Unicode checks\n"
            + "- Emoji cluster: 👩🏽‍💻\n"
            + "- IME composition target: \n"
            + "\n"
            + "Presentation checks\n"
            + "- This has **bold source** with hidden delimiters.\n"
            + "- Status: [[status]]\n"
            + "- Link: https://goo.local/docs\n"
            + "[[preview]]\n";
    }

    private sealed class EditorRootCell(TextEditor editor) : Cell
    {
        public override Blob Build() => new Container
        {
            Width = Length.Percent(100),
            Height = 430,
            Padding = 14,
            BackgroundColor = Color.Rgb(22, 27, 34),
            BorderWidth = 1,
            BorderColor = Color.Rgb(48, 54, 61),
            BorderRadius = 6,
            Overflow = Overflow.Hidden,
            Color = Color.Rgb(230, 237, 243),
            FontFamily = "JetBrains Mono",
            FontSize = 14,
            LineHeight = 1.45,
            Children = [editor],
        };
    }
}
