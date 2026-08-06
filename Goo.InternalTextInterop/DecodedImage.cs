using SkiaSharp;

namespace Goo.InternalTextInterop;

internal sealed class DecodedImage
{
    private readonly SKImage? image;
    private int references = 1;
    private bool disposed;

    private DecodedImage(SKImage? image)
    {
        this.image = image;
        Width = image?.Width ?? 0;
        Height = image?.Height ?? 0;
    }

    public int Width { get; }
    public int Height { get; }
    public bool IsValid => image is not null;

    internal static DecodedImage From(SKImage image) => new(image);

    internal static DecodedImage FromRgba(int width, int height, byte[] pixels)
    {
        var info = new SKImageInfo(width, height, SKColorType.Rgba8888, SKAlphaType.Premul);
        var image = SKImage.FromPixelCopy(info, pixels);
        return image is null ? Failed : From(image);
    }
    internal static DecodedImage Failed { get; } = new(null);

    public void Retain()
    {
        if (image is null)
            return;
        lock (this)
        {
            if (disposed)
                throw new ObjectDisposedException(nameof(DecodedImage));
            references++;
        }
    }

    public void Release()
    {
        if (image is null)
            return;
        lock (this)
        {
            if (disposed)
                return;
            references--;
            if (references != 0)
                return;
            disposed = true;
        }
        image.Dispose();
    }

    public void Draw(SKCanvas canvas, float x, float y, float width, float height, bool minifying)
    {
        if (image is null || width <= 0 || height <= 0)
            return;

        var source = new SKRect(0, 0, Width, Height);
        var destination = new SKRect(x, y, x + width, y + height);
        var sampling = minifying ? MinifyingSampling : MagnifyingSampling;
        canvas.DrawImage(image, source, destination, sampling, null);
    }

    private static readonly SKSamplingOptions MagnifyingSampling = new(SKCubicResampler.Mitchell);
    private static readonly SKSamplingOptions MinifyingSampling = new(16);
}
