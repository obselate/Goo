using SkiaSharp;

internal interface IEffectPaintCase : IDisposable
{
    string Name { get; }
    int VisibleNodeCount { get; }
    int RetainedNodeCount { get; }
    EffectPixelRegion EffectRegion { get; }
    long Paint(SKCanvas canvas);
    void PaintReference(SKCanvas canvas);
}

internal enum EffectPixelRegion
{
    OutsideBody,
    InsideBody,
}

internal static class EffectBenchmarkSupport
{
    internal const int ViewportWidth = 800;
    internal const int ViewportHeight = 600;
    internal const int VisibleNodes = 200;
    internal const int RetainedNodes = VisibleNodes + 1;
    internal static readonly SKColor Background = new(245, 245, 245);
    private static readonly SKColor Body = new(42, 104, 180);

    internal static void AssertVisiblePixels(IEffectPaintCase paintCase)
    {
        using var surface = SKSurface.Create(new SKImageInfo(ViewportWidth, ViewportHeight))
            ?? throw new InvalidOperationException($"{paintCase.Name} guard surface creation failed");
        using var referenceSurface = SKSurface.Create(new SKImageInfo(ViewportWidth, ViewportHeight))
            ?? throw new InvalidOperationException($"{paintCase.Name} reference guard surface creation failed");
        paintCase.Paint(surface.Canvas);
        paintCase.PaintReference(referenceSurface.Canvas);
        using var image = surface.Snapshot();
        using var referenceImage = referenceSurface.Snapshot();
        using var bitmap = SKBitmap.FromImage(image);
        using var reference = SKBitmap.FromImage(referenceImage);
        var body = 0;
        var effect = 0;
        for (var y = 0; y < ViewportHeight; y++)
        {
            for (var x = 0; x < ViewportWidth; x++)
            {
                var pixel = bitmap.GetPixel(x, y);
                if (pixel == Body)
                {
                    body++;
                }
                else if (pixel != Background && InRegion(paintCase.EffectRegion, x, y)
                    && pixel != reference.GetPixel(x, y))
                {
                    effect++;
                }
            }
        }

        if (body < VisibleNodes * 100 || effect < VisibleNodes)
        {
            throw new InvalidOperationException($"{paintCase.Name} pixel guard failed: {body} body, {effect} effect pixels");
        }
    }

    internal static void AssertEquivalentPixels(IEffectPaintCase goo, IEffectPaintCase direct)
    {
        using var gooSurface = SKSurface.Create(new SKImageInfo(ViewportWidth, ViewportHeight))
            ?? throw new InvalidOperationException($"{goo.Name} equivalence surface creation failed");
        using var directSurface = SKSurface.Create(new SKImageInfo(ViewportWidth, ViewportHeight))
            ?? throw new InvalidOperationException($"{direct.Name} equivalence surface creation failed");
        goo.Paint(gooSurface.Canvas);
        direct.Paint(directSurface.Canvas);
        using var gooImage = gooSurface.Snapshot();
        using var directImage = directSurface.Snapshot();
        using var gooPixels = SKBitmap.FromImage(gooImage);
        using var directPixels = SKBitmap.FromImage(directImage);
        for (var y = 0; y < ViewportHeight; y++)
        {
            for (var x = 0; x < ViewportWidth; x++)
            {
                if (gooPixels.GetPixel(x, y) != directPixels.GetPixel(x, y))
                {
                    throw new InvalidOperationException($"{goo.Name} and {direct.Name} differ at {x}, {y}");
                }
            }
        }
    }

    private static bool InRegion(EffectPixelRegion region, int x, int y)
    {
        var column = (x - 10) / 39;
        var row = (y - 10) / 50;
        var inside = column >= 0 && column < 20 && row >= 0 && row < 10
            && x >= 10 + column * 39 && x < 38 + column * 39
            && y >= 10 + row * 50 && y < 44 + row * 50;
        return region == EffectPixelRegion.InsideBody ? inside : !inside;
    }
}
