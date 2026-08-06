using Goo;
using SkiaSharp;
using Xunit;

public sealed class ClipPathRenderingTests
{
    [Fact]
    public void ClipPathsMaskNodesAndDescendants()
    {
        var root = Mount(new Container
        {
            Width = 120,
            Height = 100,
            BackgroundColor = Color.Black,
            Children = new Blob[]
            {
                new Container
                {
                    Position = PositionType.Relative,
                    Width = 100,
                    Height = 100,
                    Padding = 20,
                    BackgroundColor = Color.Rgb(255, 0, 0),
                    ClipPath = LeftHalf(),
                    Children = new Blob[]
                    {
                        new Container
                        {
                            Position = PositionType.Absolute,
                            Left = 25,
                            Top = 25,
                            Width = 100,
                            Height = 50,
                            BackgroundColor = Color.Rgb(0, 0, 255),
                        },
                    },
                },
            },
        }, 120, 100);

        using var image = new Painter().RenderOffscreen(root, 120, 100);
        Assert.Equal(new SKColor(255, 0, 0), Pixel(image, 10, 10));
        Assert.Equal(new SKColor(0, 0, 255), Pixel(image, 30, 30));
        Assert.Equal(new SKColor(0, 0, 0), Pixel(image, 60, 30));
        Assert.Equal(new SKColor(0, 0, 0), Pixel(image, 90, 10));
    }

    [Fact]
    public void NestedClipsIntersectWithinTheBorderBox()
    {
        var nested = Mount(new Container
        {
            Width = 100,
            Height = 100,
            BackgroundColor = Color.Black,
            Children = new Blob[]
            {
                new Container
                {
                    Position = PositionType.Relative,
                    Width = 100,
                    Height = 100,
                    BackgroundColor = Color.Rgb(255, 0, 0),
                    ClipPath = LeftHalf(),
                    Children = new Blob[]
                    {
                        new Container
                        {
                            Position = PositionType.Absolute,
                            Left = 0,
                            Top = 0,
                            Width = 100,
                            Height = 100,
                            BackgroundColor = Color.Rgb(0, 0, 255),
                            ClipPath = TopHalf(),
                        },
                    },
                },
            },
        }, 100, 100);

        using var nestedImage = new Painter().RenderOffscreen(nested, 100, 100);
        Assert.Equal(new SKColor(0, 0, 255), Pixel(nestedImage, 25, 25));
        Assert.Equal(new SKColor(255, 0, 0), Pixel(nestedImage, 25, 75));
        Assert.Equal(new SKColor(0, 0, 0), Pixel(nestedImage, 75, 25));
    }

    [Theory]
    [InlineData(ShapeFit.Fill, 30, 30, 10, 50)]
    [InlineData(ShapeFit.Contain, 30, 50, 30, 30)]
    [InlineData(ShapeFit.Cover, 10, 30, 50, 10)]
    [InlineData(ShapeFit.None, 50, 50, 30, 50)]
    public void FitModesMapTheClip(ShapeFit fit, int blueX, int blueY, int blackX, int blackY)
    {
        var root = Mount(new Container
        {
            Width = 100,
            Height = 100,
            BackgroundColor = Color.Black,
            Children = new Blob[]
            {
                new Container
                {
                    Width = 100,
                    Height = 100,
                    ClipPath = InsetRect(),
                    ClipPathFit = fit,
                    Children = new Blob[]
                    {
                        new Container
                        {
                            Width = 100,
                            Height = 100,
                            BackgroundColor = Color.Rgb(0, 0, 255),
                        },
                    },
                },
            },
        }, 100, 100);

        using var image = new Painter().RenderOffscreen(root, 100, 100);
        Assert.True(Pixel(image, blueX, blueY).Blue > 0);
        Assert.Equal(SKColors.Black, Pixel(image, blackX, blackY));
    }

    private static Node Mount(Container blob, float width, float height)
    {
        var root = new Reconciler { Res = new Resolver() }.Mount(blob);
        new Layout().Calculate(root, width, height);
        return root;
    }

    private static SKColor Pixel(SKImage image, int x, int y)
    {
        using var bitmap = SKBitmap.FromImage(image);
        return bitmap.GetPixel(x, y);
    }

    private static VectorPath LeftHalf() => new PathBuilder(0, 0, 1, 1)
        .MoveTo(0, 0).LineTo(0.5, 0).LineTo(0.5, 1).LineTo(0, 1).Close().Build();

    private static VectorPath TopHalf() => new PathBuilder(0, 0, 1, 1)
        .MoveTo(0, 0).LineTo(1, 0).LineTo(1, 0.5).LineTo(0, 0.5).Close().Build();

    private static VectorPath InsetRect() => new PathBuilder(0, 0, 2, 1)
        .MoveTo(0.5, 0.25).LineTo(1.5, 0.25).LineTo(1.5, 0.75).LineTo(0.5, 0.75).Close().Build();
}
