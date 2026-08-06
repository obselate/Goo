using Goo;
using SkiaSharp;
using Xunit;

public sealed class ShapeFastPathTests
{
    [Fact]
    public void MountedZeroAndPxPaddingUseDeclaredValues()
    {
        var zero = Mount(new Shape { Width = 100, Height = 100, Path = UnitSquarePath(), Padding = 0 }, 100, 100);
        var px = Mount(new Shape { Width = 100, Height = 100, Path = UnitSquarePath(), Padding = 12 }, 100, 100);
        try
        {
            AssertMap(ShapeGeometry.Map(zero), 0, 0, 100, 100);
            AssertMap(ShapeGeometry.Map(px), 12, 12, 76, 76);
        }
        finally
        {
            TextLayouts.DisposeTree(zero);
            TextLayouts.DisposeTree(px);
        }
    }

    [Fact]
    public void ShorthandAndPerEdgePaddingKeepTheirResolvedGeometry()
    {
        var shorthand = Mount(new Shape { Width = 100, Height = 100, Path = UnitSquarePath(), Padding = 12 }, 100, 100);
        var edges = Mount(new Shape
        {
            Width = 100,
            Height = 100,
            Path = UnitSquarePath(),
            PaddingLeft = 1,
            PaddingTop = 2,
            PaddingRight = 3,
            PaddingBottom = 4,
        }, 100, 100);
        try
        {
            AssertMap(ShapeGeometry.Map(shorthand), 12, 12, 76, 76);
            AssertMap(ShapeGeometry.Map(edges), 1, 2, 96, 94);
        }
        finally
        {
            TextLayouts.DisposeTree(shorthand);
            TextLayouts.DisposeTree(edges);
        }
    }

    [Fact]
    public void PercentPaddingUsesYogaResolutionAcrossReconciledLayoutStyleChanges()
    {
        var reconciler = new Reconciler { Res = new Resolver() };
        var root = reconciler.Mount(PercentPaddingRoot(200));
        try
        {
            var layout = new Layout();
            layout.Calculate(root, 200, 100);
            var shape = root.Children[0];
            AssertMap(ShapeGeometry.Map(shape), 20, 20, 60, 60);

            var retainedRoot = reconciler.Diff(root, PercentPaddingRoot(300));
            Assert.Same(root, retainedRoot);
            Assert.Same(shape, retainedRoot.Children[0]);

            layout.Calculate(retainedRoot, 300, 100);
            AssertMap(ShapeGeometry.Map(retainedRoot.Children[0]), 30, 30, 40, 40);
        }
        finally
        {
            TextLayouts.DisposeTree(root);
        }
    }

    [Fact]
    public void ShapeImageFastPathSkipsAbsentSourceAndPaintsOwnedPixelsInShapeGeometry()
    {
        var absent = Mount(new Shape
        {
            Width = 20,
            Height = 10,
            Path = UnitSquarePath(),
            Fit = ShapeFit.Fill,
        }, 20, 10);
        var source = new ImageSource(1, 1, [255, 0, 0, 255]);
        var present = Mount(new Shape
        {
            Width = 20,
            Height = 10,
            Path = UnitSquarePath(),
            Fit = ShapeFit.Fill,
            BackgroundImageSource = source,
            BackgroundImageFit = ImageFit.Fill,
        }, 20, 10);
        try
        {
            using var absentImage = new Painter().RenderOffscreen(absent, 20, 10);
            using var presentImage = new Painter().RenderOffscreen(present, 20, 10);
            Assert.False(absent.HasBackgroundImageState);
            Assert.True(present.HasBackgroundImageState);
            AssertMap(ShapeGeometry.Map(present), 0, 0, 20, 10);
            Assert.Equal(SKColors.Black, Pixel(absentImage, 4, 5));
            Assert.Equal(SKColors.Red, Pixel(presentImage, 4, 5));
            Assert.Equal(SKColors.Red, Pixel(presentImage, 15, 5));
        }
        finally
        {
            TextLayouts.DisposeTree(absent);
            TextLayouts.DisposeTree(present);
            source.Dispose();
        }
    }

    private static Node Mount(Shape shape, float width, float height)
    {
        var node = new Reconciler { Res = new Resolver() }.Mount(shape);
        new Layout().Calculate(node, width, height);
        return node;
    }

    private static Container PercentPaddingRoot(float width) => new()
    {
        Width = width,
        Height = 100,
        Children =
        [
            new Shape
            {
                Key = "retained-shape",
                Width = 100,
                Height = 100,
                Path = UnitSquarePath(),
                Padding = Length.Percent(10),
            },
        ],
    };

    private static void AssertMap(ShapeMapping map, float left, float top, float width, float height)
    {
        Assert.True(map.Valid);
        Assert.Equal(left, map.Left);
        Assert.Equal(top, map.Top);
        Assert.Equal(width, map.Width);
        Assert.Equal(height, map.Height);
    }

    private static VectorPath UnitSquarePath() => new PathBuilder()
        .MoveTo(0, 0).LineTo(1, 0).LineTo(1, 1).LineTo(0, 1).Close().Build();

    private static SKColor Pixel(SKImage image, int x, int y)
    {
        using var bitmap = SKBitmap.FromImage(image);
        return bitmap.GetPixel(x, y);
    }
}
