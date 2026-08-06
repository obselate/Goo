using System;
using System.Linq;
using Goo;
using SkiaSharp;
using Xunit;

public sealed class CullTests
{
    [Fact]
    public void CullingMatchesUnculledPixels()
    {
        foreach (var scrollY in new[] { 0f, 56f })
        foreach (var scale in new[] { 1f, 1.5f })
        {
            var culled = Render(scrollY, scale, false);
            var reference = Render(scrollY, scale, true);
            Assert.True(culled.AsSpan().SequenceEqual(reference),
                $"pixel mismatch: scroll={scrollY}, scale={scale}");
        }
    }

    [Fact]
    public void TallTextLineCullingMatchesUnculledPixels()
    {
        foreach (var scrollY in new[] { 0f, 480f, 1500f })
        foreach (var scale in new[] { 1f, 1.5f })
        {
            var culled = Render(MountTallText(scrollY), scale, false);
            var reference = Render(MountTallText(scrollY), scale, true);
            Assert.True(culled.AsSpan().SequenceEqual(reference),
                $"pixel mismatch: scroll={scrollY}, scale={scale}");
        }
    }

    [Fact]
    public void ShapeBoundsKeepVisibleEffectsAndSkipFullyOutsideShapes()
    {
        var root = MountEffectShapes();
        var culled = Render(root, 1, false);
        var reference = Render(root, 1, true);

        Assert.True(culled.AsSpan().SequenceEqual(reference));
        var leftShadow = Pixel(root, 4, 28, false);
        var rightShadow = Pixel(root, 120, 28, false);
        Assert.True(leftShadow.Blue > 0 && leftShadow.Blue > leftShadow.Red,
            "positive-offset blue shadow did not enter the clip");
        Assert.True(rightShadow.Red > 0 && rightShadow.Green > 0 && rightShadow.Blue == 0,
            "negative-offset yellow shadow did not enter the clip");
        Assert.True(RecordedBytes(root, false) < RecordedBytes(root, true),
            "culled recording did not remove fully outside shape draw commands");
        TextLayouts.DisposeTree(root);
    }

    [Fact]
    public void AcuteShapeShadowMiterKeepsItsAntialiasedClipPixel()
    {
        var root = MountAcuteMiterShadow();
        var culled = Render(root, 1, false);
        var reference = Render(root, 1, true);

        Assert.True(culled.AsSpan().SequenceEqual(reference));
        var tip = Pixel(root, 0, 32, false);
        Assert.True(tip.Red > 0 && tip.Red > tip.Green && tip.Red > tip.Blue,
            "acute positive-spread miter did not enter the clip");
        Assert.True(RecordedBytes(root, false) < RecordedBytes(root, true),
            "culled recording did not remove the fully outside shape draw commands");
        TextLayouts.DisposeTree(root);
    }

    private static byte[] Render(float scrollY, float scale, bool cullDisabled)
    {
        return Render(Mount(scrollY), scale, cullDisabled);
    }

    private static byte[] Render(Node root, float scale, bool cullDisabled)
    {
        const int width = 128;
        const int height = 72;
        var info = new SKImageInfo((int)(width * scale), (int)(height * scale),
            SKColorType.Srgba8888, SKAlphaType.Premul);
        using var surface = SKSurface.Create(info);
        surface.Canvas.Clear(SKColors.Black);
        surface.Canvas.Scale(scale, scale);
        new Painter { CullDisabled = cullDisabled }.Paint(root, surface.Canvas);
        surface.Canvas.Flush();
        using var image = surface.Snapshot();
        using var bitmap = SKBitmap.FromImage(image);
        return bitmap.Bytes;
    }

    private static Node MountTallText(float scrollY)
    {
        var lines = string.Join("\n",
            Enumerable.Range(0, 200).Select(static i => $"line {i} of the tall column"));
        var root = new Reconciler { Res = new Resolver() }.Mount(new Container
        {
            Width = 128,
            Height = 72,
            BackgroundColor = Color.Black,
            Children =
            [
                new Container
                {
                    Width = 128,
                    Height = 72,
                    OverflowY = Overflow.Scroll,
                    Children =
                    [
                        new Text
                        {
                            Content = lines,
                            Width = 128,
                            FontSize = 8,
                            Color = Color.White,
                            TextDecoration = TextDecoration.Underline,
                            TextShadow = new TextShadow
                            {
                                OffsetX = 2,
                                OffsetY = 10,
                                Blur = 6,
                                Color = Color.Rgb(0, 96, 200),
                            },
                        },
                        new Text
                        {
                            Content = lines,
                            Width = 128,
                            FontSize = 8,
                            Color = Color.Rgb(220, 220, 80),
                            TextStrokeWidth = 2,
                            TextStrokeColor = Color.Rgb(200, 40, 40),
                        },
                    ],
                },
            ],
        });
        var layout = new Layout();
        layout.Calculate(root, 128, 72);
        var viewport = root.Children[0];
        viewport.ScrollY = scrollY;
        viewport.ScrollTargetY = scrollY;
        layout.RefreshRects(root);
        return root;
    }

    private static Node Mount(float scrollY)
    {
        var content = new Container
        {
            Position = PositionType.Relative,
            Width = 280,
            Height = 180,
            Transform = new PanelTransform { TranslateX = 3, TranslateY = 2 },
            Children =
            [
                new Container
                {
                    Position = PositionType.Absolute,
                    Left = -22,
                    Top = 8,
                    Width = 42,
                    Height = 34,
                    BackgroundColor = Color.Rgb(200, 60, 60),
                    BoxShadow = new BoxShadow
                    {
                        OffsetX = 6,
                        OffsetY = 4,
                        Blur = 8,
                        Spread = 4,
                        Color = Color.Rgb(0, 0, 128),
                    },
                },
                new Text
                {
                    Content = "overflowing text near the right clip edge",
                    Position = PositionType.Absolute,
                    Left = 102,
                    Top = 48,
                    Width = 24,
                    Height = 12,
                    FontSize = 8,
                    Color = Color.White,
                },
                new Container
                {
                    Position = PositionType.Absolute,
                    Left = 40,
                    Top = 92,
                    Width = 52,
                    Height = 30,
                    BackgroundColor = Color.Rgb(60, 200, 60),
                    ClipPath = new PathBuilder(0, 0, 1, 1)
                        .MoveTo(0, 0).LineTo(1, 0).LineTo(0, 1).Close().Build(),
                },
                new Shape
                {
                    Position = PositionType.Absolute,
                    Left = 108,
                    Top = 118,
                    Width = 44,
                    Height = 36,
                },
                new Container
                {
                    Position = PositionType.Absolute,
                    Left = 240,
                    Top = 150,
                    Width = 32,
                    Height = 24,
                    BackgroundColor = Color.White,
                },
            ],
        };
        var root = new Reconciler { Res = new Resolver() }.Mount(new Container
        {
            Width = 128,
            Height = 72,
            BackgroundColor = Color.Black,
            Children =
            [
                new Container
                {
                    Width = 128,
                    Height = 72,
                    OverflowY = Overflow.Scroll,
                    Children = [content],
                },
            ],
        });
        var layout = new Layout();
        layout.Calculate(root, 128, 72);
        var viewport = root.Children[0];
        viewport.ScrollY = scrollY;
        viewport.ScrollTargetY = scrollY;
        layout.RefreshRects(root);
        return root;
    }

    private static Node MountEffectShapes()
    {
        var path = UnitSquarePath();
        var dashes = new DashPattern(new[] { 8.0, 8.0 }, 0);
        var root = new Reconciler { Res = new Resolver() }.Mount(new Container
        {
            Width = 128,
            Height = 72,
            BackgroundColor = Color.Black,
            Children =
            [
                new Shape
                {
                    Position = PositionType.Absolute,
                    Left = -56,
                    Top = 16,
                    Width = 24,
                    Height = 24,
                    Path = path,
                    BackgroundColor = Color.Rgb(220, 40, 40),
                    BoxShadow = new BoxShadow
                    {
                        OffsetX = 42,
                        Blur = 3,
                        Color = Color.Rgb(0, 120, 255),
                    },
                },
                new Shape
                {
                    Position = PositionType.Absolute,
                    Left = 160,
                    Top = 16,
                    Width = 24,
                    Height = 24,
                    Path = path,
                    BackgroundColor = Color.Rgb(40, 220, 40),
                    BoxShadow = new BoxShadow
                    {
                        OffsetX = -52,
                        Blur = 2,
                        Color = Color.Rgb(255, 220, 0),
                    },
                },
                new Shape
                {
                    Position = PositionType.Absolute,
                    Left = 180,
                    Top = 4,
                    Width = 24,
                    Height = 24,
                    Path = path,
                    BorderWidth = 4,
                    BorderColor = Color.White,
                    CornerRadius = 8,
                    Dashes = dashes,
                },
                new Shape
                {
                    Position = PositionType.Absolute,
                    Left = 20,
                    Top = 44,
                    Width = 20,
                    Height = 20,
                    Path = path,
                    BackgroundColor = Color.Rgb(180, 80, 220),
                    Transform = new PanelTransform { TranslateX = 200 },
                },
            ],
        });
        new Layout().Calculate(root, 128, 72);
        return root;
    }

    private static Node MountAcuteMiterShadow()
    {
        var acute = new PathBuilder()
            .MoveTo(0, 0)
            .LineTo(1, 0.5)
            .LineTo(0, 1)
            .Close()
            .Build();
        var root = new Reconciler { Res = new Resolver() }.Mount(new Container
        {
            Width = 128,
            Height = 72,
            BackgroundColor = Color.Black,
            Children =
            [
                new Shape
                {
                    Position = PositionType.Absolute,
                    Left = -48.5,
                    Top = 20,
                    Width = 480,
                    Height = 260,
                    Path = acute,
                    Fit = ShapeFit.Fill,
                    BackgroundColor = Color.Black,
                    Transform = new PanelTransform { Scale = 0.1 },
                    TransformOriginX = 0,
                    TransformOriginY = 0,
                    BoxShadow = new BoxShadow
                    {
                        Spread = 4,
                        Color = Color.Rgb(255, 0, 0),
                    },
                },
                new Shape
                {
                    Position = PositionType.Absolute,
                    Left = 160,
                    Top = 24,
                    Width = 20,
                    Height = 20,
                    Path = UnitSquarePath(),
                    BackgroundColor = Color.Rgb(0, 255, 0),
                },
            ],
        });
        new Layout().Calculate(root, 128, 72);
        return root;
    }

    private static long RecordedBytes(Node root, bool cullDisabled)
    {
        using var recorder = new SKPictureRecorder();
        var canvas = recorder.BeginRecording(SKRect.Create(0, 0, 128, 72));
        new Painter { CullDisabled = cullDisabled }.Paint(root, canvas);
        using var picture = recorder.EndRecording();
        using var data = picture.Serialize();
        return data.Size;
    }

    private static SKColor Pixel(Node root, int x, int y, bool cullDisabled)
    {
        using var surface = SKSurface.Create(new SKImageInfo(128, 72));
        surface.Canvas.Clear(SKColors.Black);
        new Painter { CullDisabled = cullDisabled }.Paint(root, surface.Canvas);
        using var image = surface.Snapshot();
        using var bitmap = SKBitmap.FromImage(image);
        return bitmap.GetPixel(x, y);
    }

    private static VectorPath UnitSquarePath() => new PathBuilder()
        .MoveTo(0, 0)
        .LineTo(1, 0)
        .LineTo(1, 1)
        .LineTo(0, 1)
        .Close()
        .Build();
}
