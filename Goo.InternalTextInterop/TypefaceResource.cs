using SkiaSharp;
using SkiaSharp.HarfBuzz;

namespace Goo.InternalTextInterop;

internal sealed class TypefaceResource
{
    private readonly Action released;
    private int references = 1;
    private bool disposed;
    private SKShaper? shaper;

    internal TypefaceResource(SKTypeface typeface, Action released)
    {
        Typeface = typeface;
        this.released = released;
    }

    internal SKTypeface Typeface { get; }

    internal SKShaper Shaper
    {
        get
        {
            lock (this)
            {
                if (disposed)
                    throw new ObjectDisposedException(nameof(TypefaceResource));
                return shaper ??= new SKShaper(Typeface);
            }
        }
    }

    internal TypefaceLease Lease()
    {
        lock (this)
        {
            if (disposed)
                throw new ObjectDisposedException(nameof(TypefaceResource));
            references++;
        }
        return new TypefaceLease(this);
    }

    internal void Release()
    {
        lock (this)
        {
            if (disposed)
                return;
            references--;
            if (references != 0)
                return;
            disposed = true;
        }
        shaper?.Dispose();
        Typeface.Dispose();
        released();
    }
}
