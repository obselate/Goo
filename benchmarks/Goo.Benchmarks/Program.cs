using System.Diagnostics;
using Goo;
using SkiaSharp;

if (CoreBenchmarkBatch.TryRun(args))
{
    return;
}

if (StocksGridBenchmark.TryRun(args))
{
    return;
}

if (NodeStorageBenchmark.TryRun(args))
{
    return;
}

if (ShapeEffectsBenchmark.TryRun(args))
{
    return;
}

if (BoxEffectsBenchmark.TryRun(args))
{
    return;
}

if (AccessibilityScaleBenchmark.TryRun(args))
{
    return;
}

long sink = 0;

if (Array.IndexOf(args, "--core") >= 0 && Array.IndexOf(args, "--json") >= 0)
{
    var run = new CoreBenchmarkRun();
    try
    {
        RunCorePerformanceEvidence(ref sink, run);
        run.Complete();
    }
    catch (Exception exception)
    {
        run.Fail(exception);
        Environment.ExitCode = 1;
    }
    finally
    {
        GC.KeepAlive(sink);
        CoreBenchmarkProtocol.Write(run);
    }

    return;
}

var probes = new PerformanceFixtures();

if (Array.IndexOf(args, "--core") >= 0)
{
    RunCorePerformanceEvidence(ref sink);
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--core-raster") >= 0)
{
    RunCoreRasterPerformanceEvidence(ref sink);
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--core-input") >= 0)
{
    RunCoreInputPerformanceEvidence(ref sink);
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--build-allocation") >= 0)
{
    probes.PrepareBuildAllocation();
    probes.BuildEmptyContainer();
    probes.BuildEmptyCell();
    probes.BuildOneEntryStyle();
    probes.BuildFourEntryStyle();
    probes.BuildFiveEntryStyle();
    probes.BuildStyledContainer();
    probes.BuildTreeChildCount();
    sink += Bench("build empty Container", 10_000, () => probes.BuildEmptyContainer());
    sink += Bench("build empty Cell", 10_000, () => probes.BuildEmptyCell());
    sink += Bench("build Style with one declaration", 10_000, () => probes.BuildOneEntryStyle());
    sink += Bench("build Style with four declarations", 10_000, () => probes.BuildFourEntryStyle());
    sink += Bench("build Style with five declarations", 10_000, () => probes.BuildFiveEntryStyle());
    sink += Bench("build styled Container", 10_000, () => probes.BuildStyledContainer());
    sink += Bench("build three-node Blob tree", 10_000, () => probes.BuildTreeChildCount());
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--text-flow") >= 0)
{
    if (probes.PrepareTextTrimmingWidthCache() < 1)
    {
        throw new InvalidOperationException("text trimming width cache did not produce a line");
    }
    probes.StepTextTrimmingWidthCache();
    sink += Bench("cached ellipsis width selection", 100_000,
        () => probes.StepTextTrimmingWidthCache());
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--text-transform") >= 0)
{
    if (probes.PrepareTextTransformCacheHits() < 2)
    {
        throw new InvalidOperationException("text transform cache probes did not produce layouts");
    }
    sink += MotionBench("TextTransform.None cached TextLayouts.For", 100_000, null,
        () => probes.StepTextTransformNoneCacheHit());
    sink += MotionBench("TextTransform.Uppercase cached TextLayouts.For", 100_000, null,
        () => probes.StepTextTransformUppercaseCacheHit());
    probes.PrepareTextTransformFlip();
    if (probes.StepTextTransformFlip() < 1)
    {
        throw new InvalidOperationException("text transform flip did not rebuild the static text layout");
    }
    sink += MotionBench("flip TextTransform and rebuild static text layout", 1_000,
        probes.PrepareTextTransformFlip, () => probes.StepTextTransformFlip());
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--direction") >= 0)
{
    if (probes.PrepareDirectionTextCacheHits() < 2)
    {
        throw new InvalidOperationException("direction text cache probes did not produce layouts");
    }
    sink += MotionBench("Direction.Auto pure-LTR cached TextLayouts.For", 100_000, null,
        () => probes.StepDirectionLtrCacheHit());
    sink += MotionBench("Direction.Auto mixed-bidi cached TextLayouts.For", 100_000, null,
        () => probes.StepDirectionMixedCacheHit());
    sink += MotionBench("uncached pure-LTR text layout", 500, probes.PrepareDirectionColdBuilds,
        () => probes.StepDirectionColdLtrBuild());
    sink += MotionBench("uncached mixed-bidi text layout", 500, probes.PrepareDirectionColdBuilds,
        () => probes.StepDirectionColdMixedBuild());

    var ltrPaint = probes.PrepareDirectionTextPaint(600, false);
    var mixedPaint = probes.PrepareDirectionTextPaint(600, true);
    using var ltrSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var mixedSurface = SKSurface.Create(new SKImageInfo(800, 600));
    ltrPaint.PaintTo(ltrSurface.Canvas);
    mixedPaint.PaintTo(mixedSurface.Canvas);
    sink += MotionBenchPaint("paint 600 cached pure-LTR texts", 500, ltrPaint, ltrSurface.Canvas);
    sink += MotionBenchPaint("paint 600 cached mixed-bidi texts", 500, mixedPaint, mixedSurface.Canvas);
    sink += MotionBench("mount 1,000 physical-edge boxes", 10, null,
        () => probes.MountDirectionTree(1_000, false));
    sink += MotionBench("mount 1,000 RTL logical-edge boxes", 10, null,
        () => probes.MountDirectionTree(1_000, true));
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--gradient") >= 0)
{
    var flat = probes.PrepareFlatFillPaint(600);
    var linear = probes.PrepareLinearGradientPaint(600);
    var radial = probes.PrepareRadialGradientPaint(600);
    var boundary = probes.PrepareDistinctLinearGradientPaint(66);
    var distinct = probes.PrepareDistinctLinearGradientPaint(600);
    using var flatSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var linearSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var radialSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var boundarySurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var distinctSurface = SKSurface.Create(new SKImageInfo(800, 600));
    if (probes.GradientPaintChildCount(flat) != 600
        || probes.GradientPaintChildCount(linear) != 600
        || probes.GradientPaintChildCount(radial) != 600
        || probes.GradientPaintChildCount(boundary) != 66
        || probes.GradientPaintChildCount(distinct) != 600)
    {
        throw new InvalidOperationException("gradient paint probe did not mount the expected fill count");
    }
    flat.PaintTo(flatSurface.Canvas);
    linear.PaintTo(linearSurface.Canvas);
    radial.PaintTo(radialSurface.Canvas);
    boundary.PaintTo(boundarySurface.Canvas);
    distinct.PaintTo(distinctSurface.Canvas);
    sink += BenchPaint("paint 600 flat fills", 500, flat, flatSurface.Canvas);
    sink += BenchPaint("paint 600 shared-instance linear gradients", 500, linear, linearSurface.Canvas);
    sink += BenchPaint("paint 600 shared-instance radial gradients", 500, radial, radialSurface.Canvas);
    sink += BenchPaint("paint 66 equal distinct linear gradients at cache boundary", 500, boundary, boundarySurface.Canvas);
    sink += BenchPaint("paint 600 equal distinct linear gradients with 64-entry cache cap", 500, distinct, distinctSurface.Canvas);
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--scroll-paint") >= 0)
{
    const int rows = 160;
    var window = probes.PrepareScrollPaint(rows);
    var tree = window.Tree ?? throw new InvalidOperationException("scroll paint fixture did not mount");
    if (tree.Children.Count != rows * 70 || tree.ScrollY <= 0)
    {
        throw new InvalidOperationException("scroll paint fixture has the wrong shape or offset");
    }
    using var culledSurface = SKSurface.Create(new SKImageInfo(1280, 720));
    using var referenceSurface = SKSurface.Create(new SKImageInfo(1280, 720));
    var culledPainter = new Painter();
    var referencePainter = new Painter { CullDisabled = true };
    culledPainter.Paint(tree, culledSurface.Canvas);
    referencePainter.Paint(tree, referenceSurface.Canvas);
    sink += MotionBench("paint scrolled content (culled)", 100, null, () =>
    {
        culledPainter.Paint(tree, culledSurface.Canvas);
        return 1;
    });
    sink += MotionBench("paint scrolled content (culling disabled)", 100, null, () =>
    {
        referencePainter.Paint(tree, referenceSurface.Canvas);
        return 1;
    });

    var tallWindow = probes.PrepareTallTextPaint(4_000);
    var tallTree = tallWindow.Tree ?? throw new InvalidOperationException("tall text fixture did not mount");
    if (tallTree.ScrollY <= 0)
    {
        throw new InvalidOperationException("tall text fixture has no scroll offset");
    }
    using var tallCulledSurface = SKSurface.Create(new SKImageInfo(1280, 720));
    using var tallReferenceSurface = SKSurface.Create(new SKImageInfo(1280, 720));
    var tallCulledPainter = new Painter();
    var tallReferencePainter = new Painter { CullDisabled = true };
    tallCulledPainter.Paint(tallTree, tallCulledSurface.Canvas);
    tallReferencePainter.Paint(tallTree, tallReferenceSurface.Canvas);
    sink += MotionBench("paint tall text 4,000 lines (line culled)", 100, null, () =>
    {
        tallCulledPainter.Paint(tallTree, tallCulledSurface.Canvas);
        return 1;
    });
    sink += MotionBench("paint tall text 4,000 lines (culling disabled)", 100, null, () =>
    {
        tallReferencePainter.Paint(tallTree, tallReferenceSurface.Canvas);
        return 1;
    });
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--background-image") >= 0)
{
    var flat = probes.PrepareFlatFillPaint(600);
    var shared = probes.PrepareBackgroundImagePaint(600, false);
    var owned = probes.PrepareOwnedBackgroundImagePaint(600);
    var boundary = probes.PrepareBackgroundImagePaint(129, true);
    using var flatSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var sharedSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var ownedSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var boundarySurface = SKSurface.Create(new SKImageInfo(800, 600));
    if (probes.BackgroundImagePaintChildCount(shared) != 600
        || probes.BackgroundImagePaintChildCount(owned) != 600
        || probes.BackgroundImagePaintChildCount(boundary) != 129)
    {
        throw new InvalidOperationException("background image paint probe mounted the wrong node count");
    }
    flat.PaintTo(flatSurface.Canvas);
    shared.PaintTo(sharedSurface.Canvas);
    owned.PaintTo(ownedSurface.Canvas);
    boundary.PaintTo(boundarySurface.Canvas);
    sink += BenchPaint("paint 600 flat fills", 500, flat, flatSurface.Canvas);
    sink += BenchPaint("paint 600 shared-path background images", 500, shared, sharedSurface.Canvas);
    sink += BenchPaint("paint 600 shared-owned background images", 500, owned, ownedSurface.Canvas);
    sink += BenchPaint("paint 129 distinct background images across cache boundary", 500, boundary, boundarySurface.Canvas);
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--outline") >= 0)
{
    var plain = probes.PrepareOutlinePaint(400, false);
    var outlined = probes.PrepareOutlinePaint(400, true);
    using var plainSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var outlinedSurface = SKSurface.Create(new SKImageInfo(800, 600));
    plain.PaintTo(plainSurface.Canvas);
    outlined.PaintTo(outlinedSurface.Canvas);
    sink += BenchPaint("paint 400 plain boxes", 2_000, plain, plainSurface.Canvas);
    sink += BenchPaint("paint 400 outlined boxes", 2_000, outlined, outlinedSurface.Canvas);
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--clip-path") >= 0)
{
    var clippedPaint = probes.PrepareClipPathPaint(400, true);
    var plainPaint = probes.PrepareClipPathPaint(400, false);
    var clippedHit = probes.PrepareClipPathHit(1_000, true);
    var plainHit = probes.PrepareClipPathHit(1_000, false);
    var clippedFingerprint = probes.PrepareClipPathPaint(1_000, true);
    var plainFingerprint = probes.PrepareClipPathPaint(1_000, false);
    using var clippedSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var plainSurface = SKSurface.Create(new SKImageInfo(800, 600));
    if (probes.ClipPathPaintChildCount(clippedPaint) != 400
        || probes.ClipPathPaintChildCount(plainPaint) != 400
        || probes.ClipPathHit(clippedHit) != 1
        || probes.ClipPathHit(plainHit) != 1)
    {
        throw new InvalidOperationException("clip path probe did not mount or route as expected");
    }
    clippedPaint.PaintTo(clippedSurface.Canvas);
    plainPaint.PaintTo(plainSurface.Canvas);
    probes.ClipPathFingerprint(clippedFingerprint);
    probes.ClipPathFingerprint(plainFingerprint);
    sink += MotionBenchPaint("paint 400 plain boxes after clip cache initialization", 100, plainPaint, plainSurface.Canvas);
    sink += MotionBenchPaint("paint 400 clipped boxes", 100, clippedPaint, clippedSurface.Canvas);
    sink += MotionBench("hit plain 1,000-node tree after clip cache initialization", 500, null,
        () => probes.ClipPathHit(plainHit));
    sink += MotionBench("hit clipped 1,000-node tree", 500, null,
        () => probes.ClipPathHit(clippedHit));
    sink += MotionBench("fingerprint 1,000 plain boxes", 100, null,
        () => probes.ClipPathFingerprint(plainFingerprint));
    sink += MotionBench("fingerprint 1,000 clipped boxes", 100, null,
        () => probes.ClipPathFingerprint(clippedFingerprint));
    sink += MotionBench("mount 1,000 plain boxes", 10, null,
        () => probes.MountClipPathTree(1_000, false));
    sink += MotionBench("mount 1,000 clipped boxes", 10, null,
        () => probes.MountClipPathTree(1_000, true));
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--text-decoration") >= 0)
{
    var plain = probes.PrepareTextDecorationPaint(600, TextDecoration.None);
    var underline = probes.PrepareTextDecorationPaint(600, TextDecoration.Underline);
    var combined = probes.PrepareTextDecorationPaint(600,
        TextDecoration.Underline | TextDecoration.LineThrough);
    using var plainSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var underlineSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var combinedSurface = SKSurface.Create(new SKImageInfo(800, 600));
    plain.PaintTo(plainSurface.Canvas);
    underline.PaintTo(underlineSurface.Canvas);
    combined.PaintTo(combinedSurface.Canvas);
    sink += BenchPaint("paint 600 plain texts", 500, plain, plainSurface.Canvas);
    sink += BenchPaint("paint 600 underlined texts", 500, underline, underlineSurface.Canvas);
    sink += BenchPaint("paint 600 combined-decoration texts", 500, combined, combinedSurface.Canvas);
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--text-shadow") >= 0)
{
    var plain = probes.PrepareTextShadowPaint(600, Array.Empty<TextShadow>(), false);
    var sharp = probes.PrepareTextShadowPaint(600, new[]
    {
        new TextShadow { OffsetX = 1, OffsetY = 1, Blur = 0, Color = Color.Black },
    }, true);
    var blurred = probes.PrepareTextShadowPaint(600, new[]
    {
        new TextShadow { OffsetY = 3, Blur = 8, Color = Color.Black.WithAlpha(0.65) },
    }, true);
    var stacked = probes.PrepareTextShadowPaint(600, new[]
    {
        new TextShadow { OffsetX = 1, OffsetY = 1, Blur = 2, Color = Color.Black.WithAlpha(0.9) },
        new TextShadow { OffsetY = 3, Blur = 8, Color = Color.Black.WithAlpha(0.55) },
        new TextShadow { OffsetY = 8, Blur = 16, Color = Color.Rgb(60, 130, 246).WithAlpha(0.35) },
    }, true);
    var plainFingerprint = probes.PrepareTextShadowPaint(1_000, Array.Empty<TextShadow>(), false);
    var stackedFingerprint = probes.PrepareTextShadowPaint(1_000, new[]
    {
        new TextShadow { OffsetY = 3, Blur = 8, Color = Color.Black.WithAlpha(0.65) },
    }, true);
    using var plainSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var sharpSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var blurredSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var stackedSurface = SKSurface.Create(new SKImageInfo(800, 600));
    plain.PaintTo(plainSurface.Canvas);
    sharp.PaintTo(sharpSurface.Canvas);
    blurred.PaintTo(blurredSurface.Canvas);
    stacked.PaintTo(stackedSurface.Canvas);
    probes.TextShadowFingerprint(plainFingerprint);
    probes.TextShadowFingerprint(stackedFingerprint);
    sink += BenchPaint("paint 600 cached texts without shadows", 500, plain, plainSurface.Canvas);
    sink += BenchPaint("paint 600 sharp text shadows", 500, sharp, sharpSurface.Canvas);
    sink += BenchPaint("paint 600 one blurred text shadow", 500, blurred, blurredSurface.Canvas);
    sink += BenchPaint("paint 600 three blurred text shadows", 500, stacked, stackedSurface.Canvas);
    sink += Bench("fingerprint 1,000 plain texts", 100, () => probes.TextShadowFingerprint(plainFingerprint));
    sink += Bench("fingerprint 1,000 inherited text shadows", 100,
        () => probes.TextShadowFingerprint(stackedFingerprint));
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--text-stroke") >= 0)
{
    var plain = probes.PrepareTextStrokePaint(600, 0, Color.Transparent, false);
    var thin = probes.PrepareTextStrokePaint(600, 1, Color.Black, true);
    var thick = probes.PrepareTextStrokePaint(600, 3, Color.Black, true);
    var entryPlain = probes.PrepareTextStrokeEntryPaint(200, 0, 0);
    var entryStroke = probes.PrepareTextStrokeEntryPaint(200, 3, 0);
    var entrySpacedPlain = probes.PrepareTextStrokeEntryPaint(200, 0, 1);
    var entrySpaced = probes.PrepareTextStrokeEntryPaint(200, 3, 1);
    var plainFingerprint = probes.PrepareTextStrokePaint(1_000, 0, Color.Transparent, false);
    var strokeFingerprint = probes.PrepareTextStrokePaint(1_000, 2, Color.Black, true);
    using var plainSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var thinSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var thickSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var entryPlainSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var entryStrokeSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var entrySpacedPlainSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var entrySpacedSurface = SKSurface.Create(new SKImageInfo(800, 600));
    plain.PaintTo(plainSurface.Canvas);
    thin.PaintTo(thinSurface.Canvas);
    thick.PaintTo(thickSurface.Canvas);
    entryPlain.PaintTo(entryPlainSurface.Canvas);
    entryStroke.PaintTo(entryStrokeSurface.Canvas);
    entrySpacedPlain.PaintTo(entrySpacedPlainSurface.Canvas);
    entrySpaced.PaintTo(entrySpacedSurface.Canvas);
    probes.TextStrokeFingerprint(plainFingerprint);
    probes.TextStrokeFingerprint(strokeFingerprint);
    sink += BenchPaint("paint 600 cached texts without strokes", 500, plain, plainSurface.Canvas);
    sink += BenchPaint("paint 600 cached texts with 1 px strokes", 500, thin, thinSurface.Canvas);
    sink += BenchPaint("paint 600 cached texts with 3 px strokes", 500, thick, thickSurface.Canvas);
    sink += BenchPaint("paint 200 plain text entries", 500, entryPlain, entryPlainSurface.Canvas);
    sink += BenchPaint("paint 200 stroked text entries", 500, entryStroke, entryStrokeSurface.Canvas);
    sink += BenchPaint("paint 200 letter-spaced plain text entries", 500, entrySpacedPlain, entrySpacedPlainSurface.Canvas);
    sink += BenchPaint("paint 200 letter-spaced stroked text entries", 500, entrySpaced, entrySpacedSurface.Canvas);
    sink += Bench("fingerprint 1,000 plain texts", 100,
        () => probes.TextStrokeFingerprint(plainFingerprint));
    sink += Bench("fingerprint 1,000 inherited text strokes", 100,
        () => probes.TextStrokeFingerprint(strokeFingerprint));
    sink += MotionBench("mount 1,000 plain texts", 10, null,
        () => probes.MountTextStrokeTree(1_000, false));
    sink += MotionBench("mount 1,000 inherited text strokes", 10, null,
        () => probes.MountTextStrokeTree(1_000, true));
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--visibility") >= 0)
{
    var visible = probes.PrepareVisibilityTraversal(1_000, false);
    var hidden = probes.PrepareVisibilityTraversal(1_000, true);
    using var visibleSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var hiddenSurface = SKSurface.Create(new SKImageInfo(800, 600));
    visible.PaintTo(visibleSurface.Canvas);
    hidden.PaintTo(hiddenSurface.Canvas);
    if (probes.VisibilityHit(visible) != 1 || probes.VisibilityHit(hidden) != 1)
    {
        throw new InvalidOperationException("visibility traversal did not fall through to the underlay");
    }
    sink += MotionBenchPaint("paint visible 1,000-node subtree", 1_000, visible, visibleSurface.Canvas);
    sink += MotionBenchPaint("paint hidden 1,000-node subtree", 1_000, hidden, hiddenSurface.Canvas);
    sink += MotionBench("hit visible 1,000-node subtree", 10_000, null,
        () => probes.VisibilityHit(visible));
    sink += MotionBench("hit hidden 1,000-node subtree", 10_000, null,
        () => probes.VisibilityHit(hidden));
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--transform") >= 0)
{
    var plainPaint = probes.PrepareTransformPaint(400, false);
    var transformedPaint = probes.PrepareTransformPaint(400, true);
    var plainAncestorPaint = probes.PrepareTransformAncestorPaint(400, false);
    var transformedAncestorPaint = probes.PrepareTransformAncestorPaint(400, true);
    var plainHit = probes.PrepareTransformHit(1_000, false);
    var transformedHit = probes.PrepareTransformHit(1_000, true);
    var plainDispatch = new PerformanceFixtures();
    var transformedDispatch = new PerformanceFixtures();
    var hoverBurst = new PerformanceFixtures();
    var capturedBurst = new PerformanceFixtures();
    var touchBurst = new PerformanceFixtures();
    var penBurst = new PerformanceFixtures();
    var plainFingerprint = probes.PrepareTransformPaint(1_000, false);
    var transformedFingerprint = probes.PrepareTransformPaint(1_000, true);
    using var plainPaintSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var transformedPaintSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var plainAncestorSurface = SKSurface.Create(new SKImageInfo(800, 600));
    using var transformedAncestorSurface = SKSurface.Create(new SKImageInfo(800, 600));
    plainPaint.PaintTo(plainPaintSurface.Canvas);
    transformedPaint.PaintTo(transformedPaintSurface.Canvas);
    plainAncestorPaint.PaintTo(plainAncestorSurface.Canvas);
    transformedAncestorPaint.PaintTo(transformedAncestorSurface.Canvas);
    if (probes.TransformHit(plainHit) != 1 || probes.TransformHit(transformedHit) != 1)
    {
        throw new InvalidOperationException("transform traversal did not fall through to the underlay");
    }
    plainDispatch.PrepareTransformPointerDispatch(100, false);
    transformedDispatch.PrepareTransformPointerDispatch(100, true);
    hoverBurst.PreparePointerBurst(1, false);
    capturedBurst.PreparePointerBurst(2, true);
    touchBurst.PreparePointerBurst(3, false);
    penBurst.PreparePointerBurst(4, false);
    if (plainDispatch.TransformPointerDispatch() != 1 || transformedDispatch.TransformPointerDispatch() != 1)
    {
        throw new InvalidOperationException("transform pointer dispatch did not reach the leaf");
    }
    if (hoverBurst.PointerBurst() != 1 || capturedBurst.PointerBurst() != 1
        || touchBurst.PointerBurst() != 1 || penBurst.PointerBurst() != 1)
    {
        throw new InvalidOperationException("queued pointer burst did not reach every target callback");
    }
    probes.TransformFingerprint(plainFingerprint);
    probes.TransformFingerprint(transformedFingerprint);
    probes.PrepareTransformStyleUpdate();
    if (probes.StepTransformStyleUpdate() != 1)
    {
        throw new InvalidOperationException("style transform update did not apply");
    }
    probes.PrepareTransformMotionUpdate();
    if (probes.StepTransformMotionUpdate() != 1)
    {
        throw new InvalidOperationException("Motion-driven transform update did not apply");
    }
    sink += MotionBenchPaint("paint 400 plain boxes", 100, plainPaint, plainPaintSurface.Canvas);
    sink += MotionBenchPaint("paint 400 transformed boxes", 100, transformedPaint, transformedPaintSurface.Canvas);
    sink += MotionBenchPaint("paint 400 boxes under plain ancestor", 100, plainAncestorPaint, plainAncestorSurface.Canvas);
    sink += MotionBenchPaint("paint 400 boxes under one transformed ancestor", 100, transformedAncestorPaint, transformedAncestorSurface.Canvas);
    sink += MotionBench("hit plain 1,000-node transform tree", 500, null,
        () => probes.TransformHit(plainHit));
    sink += MotionBench("hit transformed 1,000-node transform tree", 500, null,
        () => probes.TransformHit(transformedHit));
    sink += MotionBench("pointer move dispatch plain depth 100", 1_000, null,
        () => plainDispatch.TransformPointerDispatch());
    sink += MotionBench("pointer move dispatch transformed depth 100", 1_000, null,
        () => transformedDispatch.TransformPointerDispatch());
    sink += MotionBench("queued mouse hover burst, 64 moves", 1_000, null,
        () => hoverBurst.PointerBurst());
    sink += MotionBench("queued captured mouse burst, 64 moves", 1_000, null,
        () => capturedBurst.PointerBurst());
    sink += MotionBench("queued touch burst, 64 moves", 1_000, null,
        () => touchBurst.PointerBurst());
    sink += MotionBench("queued pen burst, 64 moves", 1_000, null,
        () => penBurst.PointerBurst());
    sink += MotionBench("fingerprint plain 1,000-node transform tree", 100, null,
        () => probes.TransformFingerprint(plainFingerprint));
    sink += MotionBench("fingerprint transformed 1,000-node transform tree", 100, null,
        () => probes.TransformFingerprint(transformedFingerprint));
    sink += MotionBench("style transform update", 1_000, probes.PrepareTransformStyleUpdate,
        () => probes.StepTransformStyleUpdate());
    sink += MotionBench("Motion-driven transform update", 1_000, probes.PrepareTransformMotionUpdate,
        () => probes.StepTransformMotionUpdate());
    sink += MotionBench("mount 1,000 plain transform boxes", 10, null,
        () => probes.MountTransformTree(1_000, false));
    sink += MotionBench("mount 1,000 transformed boxes", 10, null,
        () => probes.MountTransformTree(1_000, true));
    sink += MotionBench("mount 1,000 boxes under plain ancestor", 10, null,
        () => probes.MountTransformAncestorTree(1_000, false));
    sink += MotionBench("mount 1,000 boxes under one transformed ancestor", 10, null,
        () => probes.MountTransformAncestorTree(1_000, true));
    GC.KeepAlive(sink);
    return;
}

if (Array.IndexOf(args, "--motion") >= 0)
{
    RunMotionBenchmarks(probes, ref sink);
    GC.KeepAlive(sink);
    return;
}

var beforeInit = GC.GetAllocatedBytesForCurrentThread();
var initClock = Stopwatch.StartNew();
var nodes = probes.PrepareScale(200);
initClock.Stop();
Console.WriteLine($"initial mount ({nodes} nodes): {GC.GetAllocatedBytesForCurrentThread() - beforeInit:N0} B, {initClock.Elapsed.TotalMilliseconds:F1} ms");
PrintRam("after initial mount");

probes.StepScaleIdle();
sink += Bench($"idle frame at {nodes} nodes (forced layout)", 10_000, () => probes.StepScaleIdle());
sink += Bench($"idle pump at {nodes} nodes (fingerprint oracle)", 10_000,
    () => probes.scaleWindow!.UpdateTreeForPresentation(1.0 / 60.0) ? 1 : 0);
var scaleWindow = probes.scaleWindow!;
scaleWindow.UpdateTree(1.0 / 60.0);
scaleWindow.markFrameRendered();
sink += Bench($"idle pump at {nodes} nodes (render gate)", 10_000, () =>
{
    scaleWindow.UpdateTree(1.0 / 60.0);
    if (!scaleWindow.RenderPending())
    {
        return 0;
    }
    scaleWindow.markFrameRendered();
    return 1;
});
PrintRam("after idle loops");

probes.StepScaleDirty();
sink += Bench($"active frame at {nodes} nodes (list rebuild)", 2_000, () => probes.StepScaleDirty());
PrintRam("after monolithic active loop");
var componentizedNodes = probes.PrepareComponentizedScale(200);
if (componentizedNodes != nodes)
{
    throw new InvalidOperationException($"componentized scale node count was {componentizedNodes}, expected {nodes}");
}
var componentizedWarmupTick = probes.StepComponentizedScaleDirty();
if (componentizedWarmupTick < 1 || !probes.ComponentizedScaleFirstLabelMatches(componentizedWarmupTick))
{
    throw new InvalidOperationException("componentized scale did not update the first row label");
}
sink += Bench($"active frame at {componentizedNodes} nodes (componentized row rebuild)", 2_000,
    () => probes.StepComponentizedScaleDirty());
var componentizedCallbackNodes = probes.PrepareComponentizedCallbackScale(200);
if (componentizedCallbackNodes != nodes)
{
    throw new InvalidOperationException($"callback componentized scale node count was {componentizedCallbackNodes}, expected {nodes}");
}
var componentizedCallbackWarmupTick = probes.StepComponentizedCallbackScaleDirty();
if (componentizedCallbackWarmupTick < 1 || !probes.ComponentizedCallbackScaleFirstLabelMatches(componentizedCallbackWarmupTick))
{
    throw new InvalidOperationException("callback componentized scale did not update the first row label");
}
sink += Bench($"active frame at {componentizedCallbackNodes} nodes (componentized callback row rebuild)", 2_000,
    () => probes.StepComponentizedCallbackScaleDirty());
PrintRam("after componentized active loop");

var deepNodes = probes.PrepareDeepScale(200);
if (deepNodes != 201)
{
    throw new InvalidOperationException($"deep scale node count was {deepNodes}, expected 201");
}
probes.StepDeepScaleDirty();
sink += Bench($"active frame at {deepNodes} nodes (deep-narrow chain rebuild)", 2_000,
    () => probes.StepDeepScaleDirty());
PrintRam("after deep-narrow active loop");

using var paintSurface = SKSurface.Create(new SKImageInfo(1280, 720));
var paintCanvas = paintSurface.Canvas;
scaleWindow.PaintTo(paintCanvas);
sink += BenchPaint($"paint at {nodes} nodes (raster 1280x720)", 500, scaleWindow, paintCanvas);
sink += Bench($"dirty frame + paint at {nodes} nodes", 500, () =>
{
    probes.StepScaleDirty();
    scaleWindow.PaintTo(paintCanvas);
    scaleWindow.markFrameRendered();
    return 1;
});
PrintRam("after paint loops");

Console.WriteLine($"leaf Cell change (800x600 card probe): {probes.CellScaleLeafChangeBytes(200):N0} B");
Console.WriteLine($"intrinsic text reflow: {probes.CellScaleIntrinsicTextReflowBytes(200):N0} B");

probes.BuildTreeChildCount();
sink += Bench("blob-tree rebuild", 1_000, () => probes.BuildTreeChildCount());

probes.PrepareSteadyFrame();
probes.StepSteadyFrame();
sink += Bench("full frame", 1_000, () => probes.StepSteadyFrame());

probes.StepLayoutOnlyFrame();
sink += Bench("clean frame", 1_000, () => probes.StepLayoutOnlyFrame());

probes.PrepareHoverFlip();
probes.StepHoverFlip();
sink += Bench("hover flip", 1_000, () => probes.StepHoverFlip());

probes.PrepareZeroZIndexTraversal();
probes.StepZeroZIndexTraversal();
sink += Bench("zero z-index traversal", 10_000, () => probes.StepZeroZIndexTraversal());

probes.PrepareActiveZIndexTraversal();
probes.StepActiveZIndexTraversal();
sink += Bench("cached active z-index traversal", 10_000, () => probes.StepActiveZIndexTraversal());

probes.PrepareAnimatingFrame();
probes.StepAnimatingFrame();
sink += Bench("animating frame", 1_000, () => probes.StepAnimatingFrame());

probes.PrepareScrollFrame();
probes.StepScrollFrame();
sink += Bench("scroll frame", 1_000, () => probes.StepScrollFrame());

probes.PrepareTyping();
for (var i = 0; i < 5; i++)
{
    sink += probes.StepTyping();
}
var beforeKey = GC.GetAllocatedBytesForCurrentThread();
var keyClock = Stopwatch.StartNew();
sink += probes.StepTyping();
keyClock.Stop();
Console.WriteLine($"keystroke: {keyClock.Elapsed.TotalMicroseconds:F1} us, {GC.GetAllocatedBytesForCurrentThread() - beforeKey:N0} B");

GC.KeepAlive(sink);

static long Bench(string workload, int iters, Func<long> step)
{
    long acc = 0;
    var beforeAlloc = GC.GetAllocatedBytesForCurrentThread();
    var clock = Stopwatch.StartNew();
    for (var i = 0; i < iters; i++)
    {
        acc += step();
    }
    clock.Stop();
    var perAlloc = (GC.GetAllocatedBytesForCurrentThread() - beforeAlloc) / iters;
    var perUs = clock.Elapsed.TotalMicroseconds / iters;
    Console.WriteLine($"{workload}: {perUs:F1} us, {perAlloc:N0} B per frame");
    return acc;
}

static long BenchPaint(string workload, int iters, Window paintable, SKCanvas canvas)
{
    return Bench(workload, iters, () =>
    {
        paintable.PaintTo(canvas);
        return 1;
    });
}

static void RunCorePerformanceEvidence(ref long sink, CoreBenchmarkRun? run = null)
{
    var historicalCore = run?.IsCore == true;
    RunCoreInputPerformanceEvidence(ref sink, run, historicalCore);

    RunCoreRasterPerformanceEvidence(ref sink, run, historicalCore);
}

static void RunCoreRasterPerformanceEvidence(
    ref long sink,
    CoreBenchmarkRun? run = null,
    bool historicalCore = false)
{
    const int rows = 200;
    const int nodes = 1_001;
    run?.SetActiveWorkload(CoreBenchmarkWorkloads.Raster);
    var raster = new PerformanceFixtures();
    var paintable = raster.PrepareScalePaint(rows);
    using var surface = SKSurface.Create(new SKImageInfo(1280, 720))
        ?? throw new InvalidOperationException("core raster benchmark surface creation failed");
    paintable.PaintTo(surface.Canvas);
    sink += MotionBenchPaint("raster paint, 1,001 nodes at 1280x720", 500, paintable, surface.Canvas,
        Capture(run, CoreBenchmarkWorkloads.Raster, "raster", rows, nodes), historicalCore, historicalCore ? 1 : 0);
}

static void RunCoreInputPerformanceEvidence(
    ref long sink,
    CoreBenchmarkRun? run = null,
    bool historicalCore = false)
{
    const int rows = 200;
    const int nodes = 1_001;

    run?.SetActiveWorkload(CoreBenchmarkWorkloads.Monolithic);
    var monolithic = new PerformanceFixtures();
    if (monolithic.PrepareScale(rows) != nodes || monolithic.StepScaleDirty() != 1)
    {
        throw new InvalidOperationException("monolithic core workload did not mount or update");
    }
    sink += MotionBench("active frame, monolithic 1,001-node list rebuild", 2_000, null,
        () => monolithic.StepScaleDirty(),
        Capture(run, CoreBenchmarkWorkloads.Monolithic, "monolithic", rows, nodes),
        historicalCore,
        historicalCore ? 1 : 0);

    run?.SetActiveWorkload(CoreBenchmarkWorkloads.Componentized);
    var componentized = new PerformanceFixtures();
    if (componentized.PrepareComponentizedScale(rows) != nodes)
    {
        throw new InvalidOperationException("componentized core workload did not mount");
    }
    var tick = componentized.StepComponentizedScaleDirty();
    if (tick < 1 || !componentized.ComponentizedScaleFirstLabelMatches(tick))
    {
        throw new InvalidOperationException("componentized core workload did not update its first row");
    }
    sink += MotionBench("active frame, componentized 1,001-node row rebuild", 2_000, null,
        () => componentized.StepComponentizedScaleDirty(),
        Capture(run, CoreBenchmarkWorkloads.Componentized, "componentized", rows, nodes),
        historicalCore,
        historicalCore ? 1 : 0);

    run?.SetActiveWorkload(CoreBenchmarkWorkloads.CallbackComponentized);
    var componentizedCallbacks = new PerformanceFixtures();
    if (componentizedCallbacks.PrepareComponentizedCallbackScale(rows) != nodes)
    {
        throw new InvalidOperationException("callback componentized core workload did not mount");
    }
    tick = componentizedCallbacks.StepComponentizedCallbackScaleDirty();
    if (tick < 1 || !componentizedCallbacks.ComponentizedCallbackScaleFirstLabelMatches(tick))
    {
        throw new InvalidOperationException("callback componentized core workload did not update its first row");
    }
    sink += MotionBench("active frame, componentized 1,001-node callback row rebuild", 2_000, null,
        () => componentizedCallbacks.StepComponentizedCallbackScaleDirty(),
        Capture(run, CoreBenchmarkWorkloads.CallbackComponentized, "componentized-callback", rows, nodes),
        historicalCore,
        historicalCore ? 1 : 0);

}

static Action<CoreBenchmarkSampleSet>? Capture(
    CoreBenchmarkRun? run,
    string workloadId,
    string variant,
    int rows,
    int nodes) => run is null
        ? null
        : samples => run.Add(workloadId, variant, rows, nodes, samples);

static void RunMotionBenchmarks(PerformanceFixtures probes, ref long sink)
{
    sink += MotionBench("motion construct 1,000 float64 anims", 100, null,
        () => probes.MotionConstructFloat64(1_000));
    sink += MotionBench("motion construct 1,000 Point anims", 100, null,
        () => probes.MotionConstructPoint(1_000));
    sink += MotionBench("motion construct 1,000 Color anims", 100, null,
        () => probes.MotionConstructColor(1_000));

    sink += MotionBench("motion retarget float64 ordinary", 10_000, probes.PrepareMotionRetargets,
        () => probes.MotionRetargetFloat64Ordinary());
    sink += MotionBench("motion retarget Point ordinary", 10_000, probes.PrepareMotionRetargets,
        () => probes.MotionRetargetPointOrdinary());
    sink += MotionBench("motion retarget Color ordinary", 10_000, probes.PrepareMotionRetargets,
        () => probes.MotionRetargetColorOrdinary());
    sink += MotionBench("motion retarget float64 uniform velocity", 10_000, probes.PrepareMotionRetargets,
        () => probes.MotionRetargetFloat64Uniform());
    sink += MotionBench("motion retarget Point uniform velocity", 10_000, probes.PrepareMotionRetargets,
        () => probes.MotionRetargetPointUniform());
    sink += MotionBench("motion retarget Color uniform velocity", 10_000, probes.PrepareMotionRetargets,
        () => probes.MotionRetargetColorUniform());
    sink += MotionBench("motion retarget float64 component velocity", 10_000, probes.PrepareMotionRetargets,
        () => probes.MotionRetargetFloat64Components());
    sink += MotionBench("motion retarget Point component velocity", 10_000, probes.PrepareMotionRetargets,
        () => probes.MotionRetargetPointComponents());
    sink += MotionBench("motion retarget Color component velocity", 10_000, probes.PrepareMotionRetargets,
        () => probes.MotionRetargetColorComponents());

    sink += MotionBench("motion active tick + Value float64", 10_000, probes.PrepareMotionActiveFloat64,
        () => probes.MotionActiveFloat64TickAndValue());
    sink += MotionBench("motion active tick + Value Point", 10_000, probes.PrepareMotionActivePoint,
        () => probes.MotionActivePointTickAndValue());
    sink += MotionBench("motion active tick + Value Color", 10_000, probes.PrepareMotionActiveColor,
        () => probes.MotionActiveColorTickAndValue());

    var mass = MotionOneShot("motion 1,000 mass completions", probes.PrepareMotionMassCompletion, 1_000,
        () => probes.MotionMassCompletionSweep());
    if (mass != 0)
    {
        throw new InvalidOperationException("mass completion retained active animations");
    }
    sink += mass;

    var mixed = MotionOneShot("motion 1,000 alternating mixed completions", probes.PrepareMotionMixedCompletion, 1_000,
        () => probes.MotionMixedCompletionSweep());
    if (mixed != 1)
    {
        throw new InvalidOperationException("mixed completion removed every animation");
    }
    sink += mixed;
}

static long MotionBench(
    string workload,
    int iters,
    Action? prepare,
    Func<long> step,
    Action<CoreBenchmarkSampleSet>? completed = null,
    bool historicalCore = false,
    int initialWarmupOperations = 0)
{
    prepare?.Invoke();
    if (historicalCore)
    {
        if (initialWarmupOperations < 0
            || initialWarmupOperations > CoreBenchmarkProtocol.WarmupOperations)
        {
            throw new ArgumentOutOfRangeException(nameof(initialWarmupOperations));
        }

        long acc = 0;
        var completedWarmups = initialWarmupOperations;
        while (completedWarmups < CoreBenchmarkProtocol.WarmupOperations)
        {
            acc += step();
            completedWarmups++;
        }

        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
        var micros = new double[CoreBenchmarkProtocol.MeasuredOperations];
        var allocations = new long[CoreBenchmarkProtocol.MeasuredOperations];
        for (var sample = 0; sample < micros.Length; sample++)
        {
            var beforeAlloc = GC.GetAllocatedBytesForCurrentThread();
            var startTimestamp = Stopwatch.GetTimestamp();
            acc += step();
            micros[sample] = Stopwatch.GetElapsedTime(startTimestamp).TotalMicroseconds;
            allocations[sample] = GC.GetAllocatedBytesForCurrentThread() - beforeAlloc;
        }
        completed?.Invoke(new CoreBenchmarkSampleSet(workload, 1, micros, allocations));
        var aggregates = CoreBenchmarkStatistics.Double(micros);
        var allocationAggregates = CoreBenchmarkStatistics.Long(allocations);
        Console.WriteLine(
            $"{workload}: p50 {aggregates.P50:F2} us, p95 {aggregates.P95:F2} us, "
            + $"p99 {aggregates.P99:F2} us, p99.9 {aggregates.P999:F2} us, "
            + $"worst {aggregates.Worst:F2} us, {allocationAggregates.P50:N0} B per operation");
        return acc;
    }

    const int Samples = 7;
    var legacyMicros = new double[Samples];
    var legacyAllocations = new long[Samples];
    long legacyAcc = 0;
    legacyAcc += step();
    for (var sample = 0; sample < Samples; sample++)
    {
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
        var beforeAlloc = GC.GetAllocatedBytesForCurrentThread();
        var clock = Stopwatch.StartNew();
        for (var i = 0; i < iters; i++)
        {
            legacyAcc += step();
        }
        clock.Stop();
        legacyMicros[sample] = clock.Elapsed.TotalMicroseconds / iters;
        legacyAllocations[sample] = (GC.GetAllocatedBytesForCurrentThread() - beforeAlloc) / iters;
    }
    completed?.Invoke(new CoreBenchmarkSampleSet(workload, iters, legacyMicros, legacyAllocations));
    Array.Sort(legacyMicros);
    Array.Sort(legacyAllocations);
    Console.WriteLine($"{workload}: median {legacyMicros[Samples / 2]:F2} us, {legacyAllocations[Samples / 2]:N0} B per operation");
    return legacyAcc;
}

static long MotionBenchPaint(
    string workload,
    int iters,
    Window paintable,
    SKCanvas canvas,
    Action<CoreBenchmarkSampleSet>? completed = null,
    bool historicalCore = false,
    int initialWarmupOperations = 0)
{
    return MotionBench(workload, iters, null, () =>
    {
        paintable.PaintTo(canvas);
        return 1;
    }, completed, historicalCore, initialWarmupOperations);
}

static long MotionOneShot(string workload, Action<int> prepare, int count, Func<long> step)
{
    const int Samples = 7;
    var micros = new double[Samples];
    var allocations = new long[Samples];
    long result = 0;
    prepare(count);
    step();
    for (var sample = 0; sample < Samples; sample++)
    {
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
        prepare(count);
        var beforeAlloc = GC.GetAllocatedBytesForCurrentThread();
        var clock = Stopwatch.StartNew();
        result = step();
        clock.Stop();
        micros[sample] = clock.Elapsed.TotalMicroseconds;
        allocations[sample] = GC.GetAllocatedBytesForCurrentThread() - beforeAlloc;
    }
    Array.Sort(micros);
    Array.Sort(allocations);
    Console.WriteLine($"{workload}: median {micros[Samples / 2]:F2} us, {allocations[Samples / 2]:N0} B per sweep");
    return result;
}

static void PrintRam(string label)
{
    var heap = GC.GetTotalMemory(forceFullCollection: true);
    using var p = Process.GetCurrentProcess();
    p.Refresh();
    Console.WriteLine($"[ram] {label}: managed {heap / 1048576.0:F1} MB, rss {p.WorkingSet64 / 1048576.0:F1} MB");
}
