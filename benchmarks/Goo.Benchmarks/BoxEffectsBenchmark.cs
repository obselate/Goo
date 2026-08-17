using System.Diagnostics;
using Goo;
using SkiaSharp;

internal static class BoxEffectsBenchmark
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
        var selector = args.FirstOrDefault(static value => value.StartsWith("--box-effect=", StringComparison.Ordinal));
        if (Array.IndexOf(args, "--box-effects") < 0 && selector is null)
        {
            return false;
        }

        Run(selector is null ? null : selector["--box-effect=".Length..]);
        return true;
    }

    private static void Run(string? selector)
    {
        using var surface = SKSurface.Create(new SKImageInfo(ViewportWidth, ViewportHeight))
            ?? throw new InvalidOperationException("box effects benchmark surface creation failed");

        var results = new List<BoxEffectBenchmarkPair>();
        if (Selected(selector, "rounded")) results.Add(MeasurePair(new BoxPaintCase("box rounded border", BoxEffect.RoundedBorder),
            new DirectBoxEffectControl("box rounded border direct Skia", DirectBoxEffect.RoundedBorder), surface.Canvas));
        if (Selected(selector, "dashed")) results.Add(MeasurePair(new BoxPaintCase("box dashed border", BoxEffect.DashedBorder),
            new DirectBoxEffectControl("box dashed border direct Skia", DirectBoxEffect.DashedBorder), surface.Canvas));
        if (Selected(selector, "outline")) results.Add(MeasurePair(new BoxPaintCase("box outline", BoxEffect.Outline),
            new DirectBoxEffectControl("box outline direct Skia", DirectBoxEffect.Outline), surface.Canvas));
        if (Selected(selector, "outer")) results.Add(MeasurePair(new BoxPaintCase("box outer shadow", BoxEffect.OuterShadow),
            new DirectBoxEffectControl("box outer shadow direct Skia", DirectBoxEffect.OuterShadow), surface.Canvas));
        if (Selected(selector, "inset")) results.Add(MeasurePair(new BoxPaintCase("box inset shadow", BoxEffect.InsetShadow),
            new DirectBoxEffectControl("box inset shadow direct Skia", DirectBoxEffect.InsetShadow), surface.Canvas));

        ValidateBudget(results);
    }

    private static bool Selected(string? selector, string name) => selector is null || selector == name;

    private static BoxEffectBenchmarkPair MeasurePair(IEffectPaintCase goo, IEffectPaintCase direct, SKCanvas canvas)
    {
        using (goo)
        using (direct)
        {
            EffectBenchmarkSupport.AssertEquivalentPixels(goo, direct);
            var pair = MeasurePaired(goo, direct, canvas);
            Console.WriteLine(pair.Format());
            return pair;
        }
    }

    private static BoxEffectBenchmarkPair MeasurePaired(IEffectPaintCase first, IEffectPaintCase second, SKCanvas canvas)
    {
        ValidateCase(first);
        ValidateCase(second);
        EffectBenchmarkSupport.AssertVisiblePixels(first);
        EffectBenchmarkSupport.AssertVisiblePixels(second);

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
        var firstResult = new BoxEffectBenchmarkResult(first.Name, first.VisibleNodeCount,
            first.RetainedNodeCount, firstMicros, firstAllocations);
        var secondResult = new BoxEffectBenchmarkResult(second.Name, second.VisibleNodeCount,
            second.RetainedNodeCount, secondMicros, secondAllocations);
        Console.WriteLine(firstResult.Format());
        Console.WriteLine(secondResult.Format());
        return new BoxEffectBenchmarkPair(firstResult, secondResult, orders);
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

    private static void ValidateBudget(IEnumerable<BoxEffectBenchmarkPair> results)
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
            throw new InvalidOperationException($"box effect A/B budget failed ({CpuBudgetUs:F1} us, "
                + $"{AllocationBudgetBytes:N0} B): {string.Join("; ", failures)}");
        }
    }

    private sealed class BoxPaintCase : IEffectPaintCase
    {
        private readonly Node _root;
        private readonly Painter _painter = new();
        private readonly BoxEffect _effect;
        private bool _disposed;

        internal BoxPaintCase(string name, BoxEffect effect)
        {
            Name = name;
            _effect = effect;
            var children = new List<Blob>(VisibleNodes);
            for (var index = 0; index < VisibleNodes; index++)
            {
                var column = index % 20;
                var row = index / 20;
                var box = new Container
                {
                    Key = $"box-{index}",
                    Position = PositionType.Absolute,
                    Left = 10 + column * 39.0,
                    Top = 10 + row * 50.0,
                    Width = 28,
                    Height = 34,
                    BackgroundColor = Color.Rgb(42, 104, 180),
                    BorderRadius = effect is BoxEffect.RoundedBorder or BoxEffect.DashedBorder or BoxEffect.Outline ? 8 : 0,
                    BorderWidth = effect is BoxEffect.RoundedBorder or BoxEffect.DashedBorder ? 3 : 0,
                    BorderStyle = effect == BoxEffect.DashedBorder ? BorderStyle.Dashed : BorderStyle.Solid,
                    BorderColor = Color.Rgb(190, 220, 255),
                    OutlineWidth = effect == BoxEffect.Outline ? 2 : 0,
                    OutlineOffset = effect == BoxEffect.Outline ? 2 : 0,
                    OutlineColor = Color.Rgb(255, 190, 96),
                    BoxShadow = effect switch
                    {
                        BoxEffect.OuterShadow => new BoxShadow
                        {
                            OffsetX = 3,
                            OffsetY = 2,
                            Blur = 4,
                            Spread = 2,
                            Color = Color.Rgba(0, 0, 0, 144),
                        },
                        BoxEffect.InsetShadow => new BoxShadow
                        {
                            OffsetX = 3,
                            OffsetY = 2,
                            Blur = 4,
                            Spread = 2,
                            Inset = true,
                            Color = Color.Rgba(0, 0, 0, 144),
                        },
                        _ => default,
                    },
                };
                children.Add(box);
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
        public EffectPixelRegion EffectRegion => _effect is BoxEffect.Outline or BoxEffect.OuterShadow
            ? EffectPixelRegion.OutsideBody : EffectPixelRegion.InsideBody;

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
            for (var index = 0; index < VisibleNodes; index++)
            {
                var column = index % 20;
                var row = index / 20;
                var rect = SKRect.Create(10 + column * 39f, 10 + row * 50f, 28, 34);
                if (_effect is BoxEffect.RoundedBorder or BoxEffect.DashedBorder or BoxEffect.Outline)
                    canvas.DrawRoundRect(rect, 8, 8, fill);
                else
                    canvas.DrawRect(rect, fill);
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

    private readonly record struct BoxEffectBenchmarkResult(string Name, int VisibleNodeCount,
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

    private readonly record struct BoxEffectBenchmarkPair(BoxEffectBenchmarkResult Goo,
        BoxEffectBenchmarkResult Direct, string[] SampleOrders)
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

    private enum BoxEffect
    {
        RoundedBorder,
        DashedBorder,
        Outline,
        OuterShadow,
        InsetShadow,
    }
}
