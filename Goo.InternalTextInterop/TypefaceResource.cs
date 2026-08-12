using SkiaSharp;
using SkiaSharp.HarfBuzz;

namespace Goo.InternalTextInterop;

internal sealed class TypefaceResource
{
    private readonly Action released;
    private RefCount refCount = new();
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
                if (refCount.Disposed)
                    throw new ObjectDisposedException(nameof(TypefaceResource));
                return shaper ??= new SKShaper(Typeface);
            }
        }
    }

    internal TypefaceLease Lease()
    {
        lock (this)
            refCount.Retain(nameof(TypefaceResource));
        return new TypefaceLease(this);
    }

    internal void Release()
    {
        bool last;
        lock (this)
            last = refCount.ReleaseAndDispose();
        if (!last)
            return;
        shaper?.Dispose();
        Typeface.Dispose();
        released();
    }
}
