using System.Diagnostics;
using Goo;
using SkiaSharp;

internal static class ShapeEffectsBenchmark
{
    private const int ViewportWidth = EffectBenchmarkSupport.ViewportWidth;
    private const int ViewportHeight = EffectBenchmarkSupport.ViewportHeight;
    private const int VisibleNodes = EffectBenchmarkSupport.VisibleNodes;
    private const int RetainedNodes = EffectBenchmarkSupport.RetainedNodes;
    private const int Samples = 7;
    private const int PaintsPerSample = 250;
    private const double CpuBudgetUs = 166.7;
    private const long AllocationBudgetBytes = 1_024;

    internal static bool TryRun(string[] args)
    {
        var diagnosticSelector = args.FirstOrDefault(static value => value.StartsWith("--shape-effects-diagnostic=", StringComparison.Ordinal));
        if (Array.IndexOf(args, "--shape-effects-diagnostic") >= 0 || diagnosticSelector is not null)
        {
            RunDiagnostics(diagnosticSelector is null ? null : diagnosticSelector["--shape-effects-diagnostic=".Length..]);
            return true;
        }

        var selector = args.FirstOrDefault(static value => value.StartsWith("--shape-effect=", StringComparison.Ordinal));
        if (Array.IndexOf(args, "--shape-effects") < 0 && selector is null)
        {
            return false;
        }

        Run(selector is null ? null : selector["--shape-effect=".Length..]);
        return true;
    }

    private static void Run(string? selector)
    {
        var path = UnitSquarePath();
        var dashes = new DashPattern(new[] { 6.0, 4.0 }, 0.0);
        using var surface = SKSurface.Create(new SKImageInfo(ViewportWidth, ViewportHeight))
            ?? throw new InvalidOperationException("shape effects benchmark surface creation failed");

        var results = new List<ShapeEffectBenchmarkPair>();
        if (Selected(selector, "negative")) results.Add(MeasurePair(new ShapePaintCase("shape negative outer-spread shadow", path, dashes,
                ShapeEffect.NegativeOuterSpreadShadow), new DirectShapeEffectControl(
                "shape negative outer-spread shadow direct Skia", DirectShapeEffect.NegativeOuterSpreadShadow), surface.Canvas));
        if (Selected(selector, "inset")) results.Add(MeasurePair(new ShapePaintCase("shape inset shadow", path, dashes,
                ShapeEffect.InsetShadow), new DirectShapeEffectControl(
                "shape inset shadow direct Skia", DirectShapeEffect.InsetShadow), surface.Canvas));
        if (Selected(selector, "positive")) results.Add(MeasurePair(new ShapePaintCase("shape positive outer-spread shadow", path, dashes,
                ShapeEffect.PositiveOuterSpreadShadow), new DirectShapeEffectControl(
                "shape positive outer-spread shadow direct Skia", DirectShapeEffect.PositiveOuterSpreadShadow), surface.Canvas));
        if (Selected(selector, "rounded-dashed")) results.Add(MeasurePair(new ShapePaintCase("shape rounded dashed stroke", path, dashes,
                ShapeEffect.RoundedDashedStroke), new DirectShapeEffectControl(
                "shape rounded dashed stroke direct Skia", DirectShapeEffect.RoundedDashedStroke), surface.Canvas));
        if (Selected(selector, "no-shadow")) results.Add(MeasurePair(new ShapePaintCase("shape no-shadow fill/stroke/clip", path, dashes,
                ShapeEffect.NoShadow), new DirectShapeEffectControl(
                "shape no-shadow fill/stroke/clip direct Skia", DirectShapeEffect.NoShadow), surface.Canvas, false));

        ValidateBudget(results);
    }

    private static void RunDiagnostics(string? selector)
    {
        var path = UnitSquarePath();
        var dashes = new DashPattern(new[] { 6.0, 4.0 }, 0.0);
        using var surface = SKSurface.Create(new SKImageInfo(ViewportWidth, ViewportHeight))
            ?? throw new InvalidOperationException("shape effect diagnostic surface creation failed");

        if (Selected(selector, "negative")) MeasureDiagnostic("shape negative outer-spread shadow", path, dashes,
            ShapeEffect.NegativeOuterSpreadShadow, DirectShapeEffect.NegativeOuterSpreadShadow, surface.Canvas);
        if (Selected(selector, "inset")) MeasureDiagnostic("shape inset shadow", path, dashes,
            ShapeEffect.InsetShadow, DirectShapeEffect.InsetShadow, surface.Canvas);
        if (Selected(selector, "no-shadow")) MeasureDiagnostic("shape no-shadow fill/stroke/clip", path, dashes,
            ShapeEffect.NoShadow, DirectShapeEffect.NoShadow, surface.Canvas);
    }

    private static void MeasureDiagnostic(string name, VectorPath path, DashPattern dashes, ShapeEffect gooEffect,
        DirectShapeEffect directEffect, SKCanvas canvas)
    {
        var assertEffectPixels = gooEffect != ShapeEffect.NoShadow;
        var aToB = MeasurePair(new ShapePaintCase($"{name} Goo", path, dashes, gooEffect),
            new DirectShapeEffectControl($"{name} direct Skia", directEffect), canvas, assertEffectPixels);
        var gooToGoo = MeasurePair(new ShapePaintCase($"{name} Goo same-case first", path, dashes, gooEffect),
            new ShapePaintCase($"{name} Goo same-case second", path, dashes, gooEffect), canvas, assertEffectPixels);
        var directToDirect = MeasurePair(new DirectShapeEffectControl($"{name} direct same-case first", directEffect),
            new DirectShapeEffectControl($"{name} direct same-case second", directEffect), canvas, assertEffectPixels);
        var prepared = MeasurePreparedGooPathDirect(name, path, dashes, gooEffect, canvas, assertEffectPixels);
        Console.WriteLine($"{name} paired diagnostic: Goo/direct {aToB.PairedMedianDeltaUs:F2} us; "
            + $"Goo/Goo {gooToGoo.PairedMedianDeltaUs:F2} us; "
            + $"direct/direct {directToDirect.PairedMedianDeltaUs:F2} us; "
            + $"Goo/prepared-Goo-path direct {prepared.PairedMedianDeltaUs:F2} us");
    }

    private static ShapeEffectBenchmarkPair MeasurePreparedGooPathDirect(string name, VectorPath path,
        DashPattern dashes, ShapeEffect effect, SKCanvas canvas, bool assertEffectPixels)
    {
        var goo = new ShapePaintCase($"{name} Goo prepared-path source", path, dashes, effect);
        return MeasurePair(goo, goo.CreatePreparedDirectControl($"{name} prepared-Goo-path direct"), canvas,
            assertEffectPixels);
    }

    private static bool Selected(string? selector, string name) => selector is null || selector == name;

    private static ShapeEffectBenchmarkPair MeasurePair(IEffectPaintCase goo, IEffectPaintCase direct, SKCanvas canvas,
        bool assertEffectPixels = true)
    {
        using (goo)
        using (direct)
        {
            EffectBenchmarkSupport.AssertEquivalentPixels(goo, direct);
            var pair = MeasurePaired(goo, direct, canvas, assertEffectPixels);
            Console.WriteLine(pair.Format());
            return pair;
        }
    }

    private static ShapeEffectBenchmarkPair MeasurePaired(IEffectPaintCase first, IEffectPaintCase second, SKCanvas canvas,
        bool assertEffectPixels)
    {
        ValidateCase(first);
        ValidateCase(second);
        if (assertEffectPixels)
        {
            EffectBenchmarkSupport.AssertVisiblePixels(first);
            EffectBenchmarkSupport.AssertVisiblePixels(second);
        }

        long sink = first.Paint(canvas);
        sink += second.Paint(canvas);
        sink += first.Paint(canvas);
        sink += second.Paint(canvas);
        var firstMicros = new double[Samples];
        var firstAllocations = new long[Samples];
        var secondMicros = new double[Samples];
        var secondAllocations = new long[Samples];
        var orders = new string[Samples];
        for (var sample = 0; sample < Samples; sample++)
        {
            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
            var firstBeforeSecond = (sample & 1) != 0;
            orders[sample] = firstBeforeSecond ? "second-first" : "first-first";
            if (firstBeforeSecond)
            {
                MeasureSample(second, canvas, secondMicros, secondAllocations, sample, ref sink);
                MeasureSample(first, canvas, firstMicros, firstAllocations, sample, ref sink);
            }
            else
            {
                MeasureSample(first, canvas, firstMicros, firstAllocations, sample, ref sink);
                MeasureSample(second, canvas, secondMicros, secondAllocations, sample, ref sink);
            }
        }

        GC.KeepAlive(sink);
        var firstResult = new ShapeEffectBenchmarkResult(first.Name, first.VisibleNodeCount,
            first.RetainedNodeCount, firstMicros, firstAllocations);
        var secondResult = new ShapeEffectBenchmarkResult(second.Name, second.VisibleNodeCount,
            second.RetainedNodeCount, secondMicros, secondAllocations);
        return new ShapeEffectBenchmarkPair(firstResult, secondResult, orders);
    }

    private static void ValidateCase(IEffectPaintCase paintCase)
    {
        if (paintCase.VisibleNodeCount != VisibleNodes || paintCase.RetainedNodeCount != RetainedNodes)
        {
            throw new InvalidOperationException($"{paintCase.Name} mounted {paintCase.VisibleNodeCount} visible and "
                + $"{paintCase.RetainedNodeCount} retained nodes");
        }
    }

    private static void MeasureSample(IEffectPaintCase paintCase, SKCanvas canvas, double[] micros,
        long[] allocations, int sample, ref long sink)
    {
        var beforeAlloc = GC.GetAllocatedBytesForCurrentThread();
        var clock = Stopwatch.StartNew();
        for (var paint = 0; paint < PaintsPerSample; paint++)
        {
            sink += paintCase.Paint(canvas);
        }
        clock.Stop();
        micros[sample] = clock.Elapsed.TotalMicroseconds / PaintsPerSample;
        allocations[sample] = (GC.GetAllocatedBytesForCurrentThread() - beforeAlloc)
            / PaintsPerSample;
    }

    private static void ValidateBudget(IEnumerable<ShapeEffectBenchmarkPair> results)
    {
        var failures = new List<string>();
        foreach (var pair in results)
        {
            var result = pair.Goo;
            var direct = pair.Direct;
            var cpuFailure = direct.MedianUs <= CpuBudgetUs
                ? result.MedianUs > CpuBudgetUs
                : pair.PairedMedianDeltaUs > CpuBudgetUs;
            if (result.MedianAllocation > AllocationBudgetBytes || cpuFailure)
            {
                failures.Add($"{result.Name}: Goo {result.MedianUs:F2} us, {result.MedianAllocation:N0} B; "
                    + $"direct {direct.MedianUs:F2} us; paired overhead {pair.PairedMedianDeltaUs:F2} us");
            }
        }

        if (failures.Count != 0)
        {
            throw new InvalidOperationException($"shape effect A/B budget failed ({CpuBudgetUs:F1} us, "
                + $"{AllocationBudgetBytes:N0} B): {string.Join("; ", failures)}");
        }
    }

    private static VectorPath UnitSquarePath() => new PathBuilder()
        .MoveTo(0.0, 0.0)
        .LineTo(1.0, 0.0)
        .LineTo(1.0, 1.0)
        .LineTo(0.0, 1.0)
        .Close()
        .Build();

    private sealed class ShapePaintCase : IEffectPaintCase
    {
        private readonly Node _root;
        private readonly Painter _painter;
        private readonly ShapeEffect _effect;
        private bool _disposed;

        internal ShapePaintCase(string name, VectorPath path, DashPattern dashes, ShapeEffect effect,
            bool cullDisabled = false)
        {
            Name = name;
            _effect = effect;
            _painter = new Painter { CullDisabled = cullDisabled };
            var children = new List<Blob>(VisibleNodes);
            for (var index = 0; index < VisibleNodes; index++)
            {
                var column = index % 20;
                var row = index / 20;
                var shape = new Shape
                {
                    Key = $"shape-{index}",
                    Position = PositionType.Absolute,
                    Left = 10 + column * 39.0,
                    Top = 10 + row * 50.0,
                    Width = 28,
                    Height = 34,
                    Path = path,
                    Fit = ShapeFit.Fill,
                    BackgroundColor = Color.Rgb(42, 104, 180),
                    BorderWidth = effect == ShapeEffect.RoundedDashedStroke ? 3 : 2,
                    BorderColor = Color.Rgb(190, 220, 255),
                    CornerRadius = effect == ShapeEffect.RoundedDashedStroke ? 5 : 0,
                    StrokeCap = effect == ShapeEffect.RoundedDashedStroke ? StrokeCap.Round : StrokeCap.Butt,
                    StrokeJoin = effect == ShapeEffect.RoundedDashedStroke ? StrokeJoin.Round : StrokeJoin.Miter,
                    Dashes = effect == ShapeEffect.RoundedDashedStroke ? dashes : null,
                    BoxShadow = effect switch
                    {
                        ShapeEffect.NegativeOuterSpreadShadow => new BoxShadow
                        {
                            OffsetX = 3,
                            OffsetY = 2,
                            Blur = 4,
                            Spread = -3,
                            Color = Color.Rgba(0, 0, 0, 144),
                        },
                        ShapeEffect.InsetShadow => new BoxShadow
                        {
                            OffsetX = 3,
                            OffsetY = 2,
                            Blur = 4,
                            Spread = 2,
                            Inset = true,
                            Color = Color.Rgba(0, 0, 0, 144),
                        },
                        ShapeEffect.PositiveOuterSpreadShadow => new BoxShadow
                        {
                            OffsetX = 3,
                            OffsetY = 2,
                            Blur = 4,
                            Spread = 3,
                            Color = Color.Rgba(0, 0, 0, 144),
                        },
                        _ => default,
                    },
                };
                children.Add(shape);
            }

            var reconciler = new Reconciler { Res = new Resolver() };
            _root = reconciler.Mount(new Container
            {
                Width = ViewportWidth,
                Height = ViewportHeight,
                Children = children,
            });
            new Layout().Calculate(_root, ViewportWidth, ViewportHeight);
            VisibleNodeCount = _root.Children.Count;
            RetainedNodeCount = CountNodes(_root);
        }

        public string Name { get; }
        public int VisibleNodeCount { get; }
        public int RetainedNodeCount { get; }
        public EffectPixelRegion EffectRegion => _effect is ShapeEffect.NegativeOuterSpreadShadow
            or ShapeEffect.PositiveOuterSpreadShadow ? EffectPixelRegion.OutsideBody : EffectPixelRegion.InsideBody;

        internal PreparedGooPathDirectControl CreatePreparedDirectControl(string name)
        {
            using var surface = SKSurface.Create(new SKImageInfo(ViewportWidth, ViewportHeight))
                ?? throw new InvalidOperationException("prepared Goo path surface creation failed");
            Paint(surface.Canvas);
            return new PreparedGooPathDirectControl(name, _root.Children, _effect);
        }

        public long Paint(SKCanvas canvas)
        {
            canvas.Clear(EffectBenchmarkSupport.Background);
            _painter.Paint(_root, canvas);
            canvas.Flush();
            return RetainedNodeCount;
        }

        public void PaintReference(SKCanvas canvas)
        {
            canvas.Clear(EffectBenchmarkSupport.Background);
            using var fill = new SKPaint { Color = new SKColor(42, 104, 180), IsAntialias = true };
            using var stroke = new SKPaint { Color = new SKColor(190, 220, 255), IsAntialias = true,
                Style = SKPaintStyle.Stroke, StrokeWidth = _effect == ShapeEffect.RoundedDashedStroke ? 3 : 2 };
            for (var index = 0; index < VisibleNodes; index++)
            {
                var column = index % 20;
                var row = index / 20;
                var width = _effect == ShapeEffect.RoundedDashedStroke ? 3f : 2f;
                var rect = SKRect.Create(10 + column * 39f + width * .5f, 10 + row * 50f + width * .5f,
                    28 - width, 34 - width);
                canvas.Save();
                canvas.ClipRect(SKRect.Create(10 + column * 39f, 10 + row * 50f, 28, 34), SKClipOperation.Intersect, true);
                canvas.DrawRect(rect, fill);
                canvas.DrawRect(rect, stroke);
                canvas.Restore();
            }
            canvas.Flush();
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }

            _disposed = true;
            TextLayouts.DisposeTree(_root);
        }
    }

    private sealed class PreparedGooPathDirectControl : IEffectPaintCase
    {
        private static readonly SKColor FillColor = new(42, 104, 180);
        private static readonly SKColor StrokeColor = new(190, 220, 255);
        private static readonly SKColor ShadowColor = new(0, 0, 0, 144);
        private readonly PreparedGooPathNode[] _nodes;
        private readonly ShapeEffect _effect;

        internal PreparedGooPathDirectControl(string name, IList<Node> nodes, ShapeEffect effect)
        {
            Name = name;
            _effect = effect;
            _nodes = new PreparedGooPathNode[nodes.Count];
            for (var index = 0; index < nodes.Count; index++)
            {
                _nodes[index] = PreparedGooPathNode.Create(nodes[index], effect);
            }
        }

        public string Name { get; }
        public int VisibleNodeCount => _nodes.Length;
        public int RetainedNodeCount => _nodes.Length + 1;
        public EffectPixelRegion EffectRegion => _effect == ShapeEffect.NegativeOuterSpreadShadow
            ? EffectPixelRegion.OutsideBody : EffectPixelRegion.InsideBody;

        public long Paint(SKCanvas canvas)
        {
            canvas.Clear(EffectBenchmarkSupport.Background);
            using var scratch = new DirectSkiaPaintScratch();
            foreach (var node in _nodes)
            {
                node.Paint(canvas, _effect, scratch);
            }
            canvas.Flush();
            return RetainedNodeCount;
        }

        public void PaintReference(SKCanvas canvas)
        {
            canvas.Clear(EffectBenchmarkSupport.Background);
            using var fill = new SKPaint { Color = FillColor, IsAntialias = true };
            using var stroke = new SKPaint { Color = StrokeColor, IsAntialias = true, Style = SKPaintStyle.Stroke,
                StrokeWidth = 2 };
            foreach (var node in _nodes)
            {
                canvas.Save();
                try
                {
                    canvas.ClipRect(node.Clip, SKClipOperation.Intersect, true);
                    canvas.DrawPath(node.Fill, fill);
                    canvas.DrawPath(node.Stroke, stroke);
                }
                finally
                {
                    canvas.Restore();
                }
            }
            canvas.Flush();
        }

        public void Dispose()
        {
        }

        private sealed class PreparedGooPathNode
        {
            private readonly SKPath? _silhouette;
            private readonly SKPath? _negativeOuter;
            private readonly SKPath? _insetInverse;

            private PreparedGooPathNode(SKRect clip, SKPath fill, SKPath stroke, SKPath? silhouette,
                SKPath? negativeOuter, SKPath? insetInverse)
            {
                Clip = clip;
                Fill = fill;
                Stroke = stroke;
                _silhouette = silhouette;
                _negativeOuter = negativeOuter;
                _insetInverse = insetInverse;
            }

            internal SKRect Clip { get; }
            internal SKPath Fill { get; }
            internal SKPath Stroke { get; }

            internal static PreparedGooPathNode Create(Node node, ShapeEffect effect)
            {
                var shadow = effect is ShapeEffect.NegativeOuterSpreadShadow or ShapeEffect.InsetShadow;
                var geometry = ShapeGeometry.PreparePaint(node, true, 2, shadow, shadow, null);
                if (!geometry.Valid || geometry.FinalFill is null || geometry.Stroke is null)
                {
                    throw new InvalidOperationException("prepared Goo path geometry is incomplete");
                }

                SKPath? negativeOuter = null;
                SKPath? insetInverse = null;
                if (effect == ShapeEffect.NegativeOuterSpreadShadow)
                {
                    negativeOuter = ShapeGeometry.NegativeOuter(node, geometry.Silhouette!, -3);
                }
                else if (effect == ShapeEffect.InsetShadow)
                {
                    insetInverse = ShapeGeometry.InsetInverse(node, geometry.Silhouette!, 2, 3, 2, 4);
                }

                return new PreparedGooPathNode(geometry.Clip, geometry.FinalFill, geometry.Stroke,
                    geometry.Silhouette, negativeOuter, insetInverse);
            }

            internal void Paint(SKCanvas canvas, ShapeEffect effect, DirectSkiaPaintScratch scratch)
            {
                if (effect == ShapeEffect.NegativeOuterSpreadShadow && _negativeOuter is { IsEmpty: false })
                {
                    canvas.Save();
                    try
                    {
                        canvas.Translate(3, 2);
                        canvas.DrawPath(_negativeOuter, ShadowPaint(scratch));
                    }
                    finally
                    {
                        canvas.Restore();
                    }
                }

                canvas.Save();
                try
                {
                    canvas.ClipRect(Clip, SKClipOperation.Intersect, true);
                    var fill = scratch.Reset();
                    fill.Color = FillColor;
                    fill.IsAntialias = true;
                    canvas.DrawPath(Fill, fill);
                    if (effect == ShapeEffect.InsetShadow && _insetInverse is not null)
                    {
                        canvas.Save();
                        try
                        {
                            canvas.ClipPath(_silhouette!, SKClipOperation.Intersect, true);
                            canvas.DrawPath(_insetInverse, ShadowPaint(scratch));
                        }
                        finally
                        {
                            canvas.Restore();
                        }
                    }
                    var stroke = scratch.Reset();
                    stroke.Color = StrokeColor;
                    stroke.IsAntialias = true;
                    stroke.Style = SKPaintStyle.Stroke;
                    stroke.StrokeWidth = 2;
                    stroke.StrokeCap = SKStrokeCap.Butt;
                    stroke.StrokeJoin = SKStrokeJoin.Miter;
                    stroke.StrokeMiter = 4;
                    canvas.DrawPath(Stroke, stroke);
                }
                finally
                {
                    canvas.Restore();
                }
            }

            private static SKPaint ShadowPaint(DirectSkiaPaintScratch scratch)
            {
                var paint = scratch.Reset();
                paint.Color = ShadowColor;
                paint.IsAntialias = true;
                paint.MaskFilter = scratch.Blur2;
                return paint;
            }
        }
    }

    private readonly record struct ShapeEffectBenchmarkResult(string Name, int VisibleNodeCount,
        int RetainedNodeCount, double[] SamplesUs, long[] SamplesAllocation)
    {
        internal double MedianUs => Median(SamplesUs);
        internal long MedianAllocation => Median(SamplesAllocation);

        internal string Format() => $"{Name} ({VisibleNodeCount} visible nodes, {RetainedNodeCount} retained nodes, "
            + $"{PaintsPerSample} paints/sample, {Samples} GC-separated samples): CPU "
            + $"[{string.Join(", ", SamplesUs.Select(static value => value.ToString("F2")))}] us/complete paint; "
            + $"managed [{string.Join(", ", SamplesAllocation)}] B/complete paint; median "
            + $"{MedianUs:F2} us, {MedianAllocation:N0} B";

        private static double Median(double[] values)
        {
            var ordered = (double[])values.Clone();
            Array.Sort(ordered);
            return ordered[Samples / 2];
        }

        private static long Median(long[] values)
        {
            var ordered = (long[])values.Clone();
            Array.Sort(ordered);
            return ordered[Samples / 2];
        }
    }

    private readonly record struct ShapeEffectBenchmarkPair(ShapeEffectBenchmarkResult Goo,
        ShapeEffectBenchmarkResult Direct, string[] SampleOrders)
    {
        internal double[] PairedDeltasUs => Goo.SamplesUs.Zip(Direct.SamplesUs,
            static (goo, direct) => goo - direct).ToArray();
        internal double PairedMedianDeltaUs => Median(PairedDeltasUs);
        internal bool RequiresRootReview => Goo.MedianUs > Direct.MedianUs * 1.05;

        internal string Format() => $"{Goo.Name} A/B: Goo median {Goo.MedianUs:F2} us, {Goo.MedianAllocation:N0} B; "
            + $"direct Skia median {Direct.MedianUs:F2} us, {Direct.MedianAllocation:N0} B; "
            + $"paired deltas [{string.Join(", ", PairedDeltasUs.Select(static value => value.ToString("F2")))}] us; "
            + $"paired median overhead {PairedMedianDeltaUs:F2} us; "
            + $">5% total above direct root-review {(RequiresRootReview ? "REQUIRED" : "clear")}; "
            + $"order [{string.Join(", ", SampleOrders)}]";

        private static double Median(double[] values)
        {
            var ordered = (double[])values.Clone();
            Array.Sort(ordered);
            return ordered[Samples / 2];
        }
    }

    private static int CountNodes(Node node)
    {
        var count = 1;
        foreach (var child in node.Children)
        {
            count += CountNodes(child);
        }

        return count;
    }

    private enum ShapeEffect
    {
        NegativeOuterSpreadShadow,
        InsetShadow,
        PositiveOuterSpreadShadow,
        RoundedDashedStroke,
        NoShadow,
    }
}
