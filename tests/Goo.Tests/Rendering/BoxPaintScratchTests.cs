using System.Linq;
using Goo;
using SkiaSharp;
using Xunit;

public sealed class BoxPaintScratchTests
{
    [Theory]
    [InlineData(BoxEffect.RoundedBorder)]
    [InlineData(BoxEffect.DashedBorder)]
    [InlineData(BoxEffect.InsetShadow)]
    public void BoxScratchInvalidatedBoxesMatchFreshFullSurfacePixels(BoxEffect effect)
    {
        var reconciler = new Reconciler { Res = new Resolver() };
        var root = reconciler.Mount(Box(effect, alternate: false));
        new Layout().Calculate(root, 80, 64);
        var painter = new Painter();

        var first = Paint(painter, root);
        var replay = Paint(painter, root);
        Assert.Equal(first, replay);

        root = reconciler.Diff(root, Box(effect, alternate: true));
        new Layout().Calculate(root, 80, 64);
        var invalidated = Paint(painter, root);
        Assert.False(first.SequenceEqual(invalidated));

        var fresh = new Reconciler { Res = new Resolver() }.Mount(Box(effect, alternate: true));
        new Layout().Calculate(fresh, 80, 64);
        var expected = Paint(new Painter(), fresh);
        Assert.Equal(expected, invalidated);
    }

    private static Container Box(BoxEffect effect, bool alternate) => new()
    {
        Width = 80,
        Height = 64,
        BackgroundColor = Color.Rgb(42, 104, 180),
        BorderRadius = effect == BoxEffect.InsetShadow ? (alternate ? 16 : 12) : (alternate ? 14 : 10),
        BorderWidth = effect == BoxEffect.InsetShadow ? 3 : 4,
        BorderStyle = effect == BoxEffect.DashedBorder ? BorderStyle.Dashed : BorderStyle.Solid,
        BorderColor = Color.Rgb(190, 220, 255),
        BoxShadow = effect == BoxEffect.InsetShadow
            ? new BoxShadow
            {
                Inset = true,
                OffsetX = alternate ? 5 : 3,
                OffsetY = 2,
                Blur = 4,
                Spread = alternate ? 1 : 2,
                Color = Color.Rgba(0, 0, 0, 144),
            }
            : default,
    };

    private static byte[] Paint(Painter painter, Node root)
    {
        using var image = painter.RenderOffscreen(root, 80, 64);
        using var bitmap = SKBitmap.FromImage(image);
        return bitmap.Bytes.ToArray();
    }

    public enum BoxEffect
    {
        RoundedBorder,
        DashedBorder,
        InsetShadow,
    }
}
