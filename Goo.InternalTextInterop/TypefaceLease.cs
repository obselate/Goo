using System.Threading;
using SkiaSharp;
using SkiaSharp.HarfBuzz;

namespace Goo.InternalTextInterop;

internal sealed class TypefaceLease : IDisposable
{
    private TypefaceResource? resource;

    internal TypefaceLease(TypefaceResource resource)
    {
        this.resource = resource;
    }

    internal SKTypeface Typeface => resource?.Typeface
        ?? throw new ObjectDisposedException(nameof(TypefaceLease));

    internal SKShaper Shaper => resource?.Shaper
        ?? throw new ObjectDisposedException(nameof(TypefaceLease));

    internal TypefaceLease Duplicate() => (resource
        ?? throw new ObjectDisposedException(nameof(TypefaceLease))).Lease();

    public void Dispose()
    {
        Interlocked.Exchange(ref resource, null)?.Release();
    }
}
