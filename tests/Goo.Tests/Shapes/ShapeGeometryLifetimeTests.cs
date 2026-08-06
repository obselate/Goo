using System;
using Goo;
using SkiaSharp;
using Xunit;

public sealed class ShapeGeometryLifetimeTests
{
    [Fact]
    public void ReconciliationRemovalDisposesCornerDashAndComposedEffects()
    {
        var reconciler = new Reconciler { Res = new Resolver() };
        var path = UnitSquarePath();
        var node = reconciler.Mount(new Shape
        {
            Path = path,
            CornerRadius = 10,
            Dashes = new DashPattern(new[] { 16.0, 8.0 }, 0),
        });
        var effects = Assert.IsType<ShapePathEffectsValue>(ShapePathEffects.For(node));
        var corner = Assert.IsType<SKPathEffect>(effects.Corner);
        var dash = Assert.IsType<SKPathEffect>(effects.Dash);
        var composed = Assert.IsType<SKPathEffect>(effects.Composed);

        reconciler.Diff(node, new Shape { Path = path });

        Assert.True(Released(corner));
        Assert.True(Released(dash));
        Assert.True(Released(composed));
        TextLayouts.DisposeTree(node);
    }

    [Fact]
    public void ReplacementsRemovalsInvalidMappingAndRetirementDisposeNativeGeometry()
    {
        var node = NewNode();
        var fill = CanonicalFill(node);
        var rounded = Assert.IsType<SKPath>(ShapeGeometry.CachedHitPath(node));
        var stroke = OpenStroke(node);
        var silhouette = ShadowSilhouette(node);
        var effects = Assert.IsType<ShapePathEffectsValue>(ShapePathEffects.For(node));
        var corner = Assert.IsType<SKPathEffect>(effects.Corner);
        var dash = Assert.IsType<SKPathEffect>(effects.Dash);
        var composed = Assert.IsType<SKPathEffect>(effects.Composed);

        node.Rect = new Rect { X = 0, Y = 0, W = 120, H = 100 };
        var replacementFill = CanonicalFill(node);
        var replacementRounded = Assert.IsType<SKPath>(ShapeGeometry.CachedHitPath(node));
        var replacementStroke = OpenStroke(node);
        var replacementSilhouette = ShadowSilhouette(node);

        Assert.True(Released(fill));
        Assert.True(Released(rounded));
        Assert.True(Released(stroke));
        Assert.True(Released(silhouette));
        Assert.NotSame(fill, replacementFill);
        Assert.NotSame(replacementRounded, rounded);
        Assert.NotSame(stroke, replacementStroke);
        Assert.NotSame(silhouette, replacementSilhouette);

        node.Dashes = new DashPattern(new[] { 12.0, 6.0 }, 0);
        var changedEffects = Assert.IsType<ShapePathEffectsValue>(ShapePathEffects.For(node));
        var changedDash = Assert.IsType<SKPathEffect>(changedEffects.Dash);
        var changedComposed = Assert.IsType<SKPathEffect>(changedEffects.Composed);
        var dashedSilhouette = ShadowSilhouette(node);

        Assert.True(Released(corner));
        Assert.True(Released(dash));
        Assert.True(Released(composed));
        Assert.True(Released(replacementSilhouette));
        Assert.NotSame(dash, changedDash);
        Assert.NotSame(composed, changedComposed);

        node.ShapeCornerRadius = 0;
        var sharpFill = Assert.IsType<SKPath>(ShapeGeometry.CachedHitPath(node));
        Assert.True(Released(replacementRounded));
        Assert.NotSame(replacementRounded, sharpFill);

        ShapeGeometry.Trim(node, false, false, false, false);
        Assert.True(Released(sharpFill));
        Assert.True(Released(replacementStroke));
        Assert.True(Released(dashedSilhouette));
        ShapePathEffects.Dispose(node);
        Assert.True(Released(changedDash));
        Assert.True(Released(changedComposed));

        var invalid = CanonicalFill(node);
        node.Rect = new Rect { X = 0, Y = 0, W = 0, H = 100 };
        using (var image = new Painter().RenderOffscreen(node, 100, 100)) { }
        Assert.True(Released(invalid));

        node.Rect = new Rect { X = 0, Y = 0, W = 120, H = 100 };
        var retiredFill = CanonicalFill(node);
        var retiredStroke = OpenStroke(node);
        var retiredSilhouette = ShadowSilhouette(node);
        TextLayouts.DisposeTree(node);

        Assert.True(Released(retiredFill));
        Assert.True(Released(retiredStroke));
        Assert.True(Released(retiredSilhouette));
    }

    [Fact]
    public void ShadowArtifactsStaySparseReuseMatchingKeysAndDisposeOnTrimAndRetirement()
    {
        var noShadow = MountShape();
        try
        {
            using var image = new Painter().RenderOffscreen(noShadow, 100, 100);
            AssertArtifactStats(noShadow, 0, 0);
        }
        finally
        {
            TextLayouts.DisposeTree(noShadow);
        }

        var negativeNode = NewShadowNode();
        var negativeSilhouette = ShadowSilhouette(negativeNode);
        var negative = Assert.IsType<SKPath>(ShapeGeometry.NegativeOuter(negativeNode, negativeSilhouette, -4));
        AssertArtifactStats(negativeNode, 1, 1);
        Assert.Same(negative, ShapeGeometry.NegativeOuter(negativeNode, negativeSilhouette, -4));

        var changedNegative = Assert.IsType<SKPath>(ShapeGeometry.NegativeOuter(negativeNode, negativeSilhouette, -6));
        Assert.True(Released(negative));
        Assert.NotSame(negative, changedNegative);
        AssertArtifactStats(negativeNode, 1, 1);

        ShapeGeometry.Trim(negativeNode, false, false, false, false);
        Assert.True(Released(changedNegative));
        AssertArtifactStats(negativeNode, 0, 0);
        TextLayouts.DisposeTree(negativeNode);

        var insetNode = NewShadowNode();
        var insetSilhouette = ShadowSilhouette(insetNode);
        var inset = Assert.IsType<SKPath>(ShapeGeometry.InsetInverse(insetNode, insetSilhouette, 2, 3, 4, 5));
        AssertArtifactStats(insetNode, 1, 1);
        Assert.Same(inset, ShapeGeometry.InsetInverse(insetNode, insetSilhouette, 2, 3, 4, 5));

        var changedInset = Assert.IsType<SKPath>(ShapeGeometry.InsetInverse(insetNode, insetSilhouette, 2, 4, 4, 5));
        Assert.True(Released(inset));
        Assert.NotSame(inset, changedInset);
        AssertArtifactStats(insetNode, 1, 1);
        TextLayouts.DisposeTree(insetNode);
        Assert.True(Released(changedInset));
        AssertArtifactStats(insetNode, 0, 0);
    }

    private static Node NewNode() => new()
    {
        Kind = NodeKind.Shape,
        ShapePath = UnitSquarePath(),
        ShapeFit = ShapeFit.Contain,
        ShapeCornerRadius = 10,
        Dashes = new DashPattern(new[] { 16.0, 8.0 }, 0),
        BorderLeftWidth = new Length { Unit = LengthUnit.Px, Value = 6 },
        ShapeStrokeCap = StrokeCap.Round,
        ShapeStrokeJoin = StrokeJoin.Round,
        Rect = new Rect { X = 0, Y = 0, W = 100, H = 100 },
    };

    private static Node NewShadowNode() => new()
    {
        Kind = NodeKind.Shape,
        ShapePath = UnitSquarePath(),
        Rect = new Rect { X = 0, Y = 0, W = 100, H = 100 },
    };

    private static Node MountShape()
    {
        var node = new Reconciler { Res = new Resolver() }.Mount(new Shape
        {
            Width = 100,
            Height = 100,
            Path = UnitSquarePath(),
            BackgroundColor = Color.White,
        });
        new Layout().Calculate(node, 100, 100);
        return node;
    }

    private static VectorPath UnitSquarePath() => new PathBuilder()
        .MoveTo(0, 0)
        .LineTo(1, 0)
        .LineTo(1, 1)
        .LineTo(0, 1)
        .Close()
        .Build();

    private static SKPath CanonicalFill(Node node)
        => Assert.IsType<SKPath>(ShapeGeometry.CanonicalFill(node, ShapeGeometry.Map(node)));

    private static SKPath OpenStroke(Node node)
        => Assert.IsType<SKPath>(ShapeGeometry.OpenStroke(node, ShapeGeometry.Map(node)));

    private static SKPath ShadowSilhouette(Node node)
        => Assert.IsType<SKPath>(ShapeGeometry.ShadowSilhouette(node, ShapeGeometry.Map(node), true,
            ShapePathEffects.For(node)));

    private static void AssertArtifactStats(Node node, int sidecarObjects, int nativeWrappers)
    {
        var stats = ShapeGeometry.ShadowArtifactStats(node);
        Assert.Equal(sidecarObjects, stats.SidecarObjects);
        Assert.Equal(nativeWrappers, stats.NativeWrappers);
    }

    private static bool Released(SKNativeObject value) => value.Handle == IntPtr.Zero;
}
