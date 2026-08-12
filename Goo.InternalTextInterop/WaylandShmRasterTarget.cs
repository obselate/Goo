using System.Runtime.InteropServices;
using SkiaSharp;

namespace Goo.InternalTextInterop;

internal sealed unsafe class WaylandShmRasterTarget : SdlRenderTarget
{
    private const int BufferCount = 3;
    private readonly IntPtr display;
    private readonly IntPtr windowSurface;
    private readonly IntPtr shm;
    private WaylandRasterBuffer[] buffers = [];
    private SKSurface? paintSurface;
    private IntPtr paintPixels;
    private IntPtr presentationPixels;
    private nuint mappedLength;
    private WaylandRasterBuffer? current;
    private int width;
    private int height;
    private bool disposed;

    public WaylandShmRasterTarget(SdlHost host)
    {
        host.GetWaylandSurface(out display, out windowSurface);
        shm = WaylandNative.BindShm(display);
    }

    public SKCanvas Canvas
    {
        get
        {
            if (current is null || paintSurface is null)
                throw new InvalidOperationException("The raster render target has no active frame.");
            return paintSurface.Canvas;
        }
    }

    public void BeginFrame()
    {
        ThrowIfDisposed();
        if (buffers.Length == 0)
            throw new InvalidOperationException("The raster render target has not been sized.");
        if (current is not null)
            return;

        while (current is null)
        {
            foreach (var buffer in buffers)
            {
                if (!buffer.Busy)
                {
                    current = buffer;
                    break;
                }
            }
            if (current is null)
                WaylandNative.Roundtrip(display);
        }
    }

    public bool Resize(int width, int height)
    {
        ThrowIfDisposed();
        if (width <= 0 || height <= 0)
            return false;
        if (buffers.Length != 0 && this.width == width && this.height == height)
            return true;

        ReleaseBuffers();
        try
        {
            var stride = checked(width * 4);
            var bufferLength = checked(stride * height);
            mappedLength = checked((nuint)(bufferLength * BufferCount));
            var fd = LinuxMemory.Create(mappedLength);
            try
            {
                presentationPixels = LinuxMemory.Map(fd, mappedLength);
                var pool = WaylandNative.CreateShmPool(shm, fd, checked((int)mappedLength));
                try
                {
                    var next = new WaylandRasterBuffer[BufferCount];
                    try
                    {
                        for (var index = 0; index < BufferCount; index++)
                        {
                            var offset = checked(index * bufferLength);
                            var nativeBuffer = WaylandNative.CreateBuffer(
                                pool,
                                offset,
                                width,
                                height,
                                stride);
                            try
                            {
                                next[index] = new WaylandRasterBuffer(
                                    nativeBuffer,
                                    presentationPixels + offset);
                            }
                            catch
                            {
                                WaylandNative.DestroyBuffer(nativeBuffer);
                                throw;
                            }
                        }
                        buffers = next;
                    }
                    catch
                    {
                        foreach (var buffer in next)
                            buffer?.Dispose();
                        throw;
                    }
                }
                finally
                {
                    WaylandNative.DestroyShmPool(pool);
                }
            }
            finally
            {
                LinuxMemory.Close(fd);
            }
            var paintStride = checked(width * 8);
            var paintLength = checked((nuint)(paintStride * height));
            paintPixels = (IntPtr)NativeMemory.Alloc(paintLength);
            paintSurface = RasterColorPipeline.WrapLinearPaintSurface(
                paintPixels,
                width,
                height,
                paintStride);
            this.width = width;
            this.height = height;
            return true;
        }
        catch
        {
            ReleaseBuffers();
            return false;
        }
    }

    public void Flush()
    {
    }

    public void Present()
    {
        ThrowIfDisposed();
        var buffer = current
            ?? throw new InvalidOperationException("The raster render target has no active frame.");
        RasterColorPipeline.ConvertLinearRgba16ToSrgbBgra8(
            paintPixels,
            buffer.Pixels,
            checked(width * height));
        buffer.Busy = true;
        WaylandNative.Attach(windowSurface, buffer.Native, width, height);
        WaylandNative.Flush(display);
        current = null;
    }

    public void Dispose()
    {
        if (disposed)
            return;
        disposed = true;
        try
        {
            ReleaseBuffers();
        }
        finally
        {
            WaylandNative.DestroyProxy(shm);
        }
    }

    private void ReleaseBuffers()
    {
        current = null;
        paintSurface?.Dispose();
        paintSurface = null;
        if (paintPixels != IntPtr.Zero)
        {
            NativeMemory.Free((void*)paintPixels);
            paintPixels = IntPtr.Zero;
        }
        foreach (var buffer in buffers)
            buffer.Dispose();
        buffers = [];
        var mappedPixels = presentationPixels;
        var mappedSize = mappedLength;
        try
        {
            if (mappedPixels != IntPtr.Zero)
                LinuxMemory.Unmap(mappedPixels, mappedSize);
        }
        finally
        {
            presentationPixels = IntPtr.Zero;
            mappedLength = 0;
            width = 0;
            height = 0;
        }
    }

    private void ThrowIfDisposed()
    {
        ObjectDisposedException.ThrowIf(disposed, this);
    }
}

internal sealed class WaylandRasterBuffer : IDisposable
{
    private GCHandle handle;

    public WaylandRasterBuffer(IntPtr native, IntPtr pixels)
    {
        Native = native;
        Pixels = pixels;
        handle = GCHandle.Alloc(this);
        try
        {
            WaylandNative.AddBufferListener(native, GCHandle.ToIntPtr(handle));
        }
        catch
        {
            handle.Free();
            throw;
        }
    }

    public IntPtr Native { get; private set; }
    public IntPtr Pixels { get; }
    public bool Busy { get; set; }

    public void Dispose()
    {
        var native = Native;
        Native = IntPtr.Zero;
        try
        {
            if (native != IntPtr.Zero)
                WaylandNative.DestroyBuffer(native);
        }
        finally
        {
            if (handle.IsAllocated)
                handle.Free();
        }
    }
}

internal static class RasterColorPipeline
{
    private static readonly byte[] LinearToSrgb = CreateLinearToSrgb();

    public static SKSurface WrapLinearPaintSurface(
        IntPtr pixels,
        int width,
        int height,
        int stride)
    {
        using var colorSpace = SKColorSpace.CreateSrgbLinear();
        var info = new SKImageInfo(
            width,
            height,
            SKColorType.Rgba16161616,
            SKAlphaType.Opaque,
            colorSpace);
        return SKSurface.Create(info, pixels, stride)
            ?? throw new InvalidOperationException("Skia could not wrap the linear raster buffer.");
    }

    public static unsafe void ConvertLinearRgba16ToSrgbBgra8(
        IntPtr source,
        IntPtr destination,
        int pixelCount)
    {
        if (pixelCount < 0)
            throw new ArgumentOutOfRangeException(nameof(pixelCount));
        _ = checked(pixelCount * 4);
        var sourceValues = (ushort*)source;
        var destinationValues = (uint*)destination;
        var unrolledPixelCount = pixelCount - pixelCount % 4;
        var index = 0;
        for (; index < unrolledPixelCount; index += 4)
        {
            var red = LinearToSrgb[sourceValues[0]];
            var green = LinearToSrgb[sourceValues[1]];
            var blue = LinearToSrgb[sourceValues[2]];
            destinationValues[0] = 0xFF000000u
                | (uint)red << 16
                | (uint)green << 8
                | blue;
            sourceValues += 4;
            destinationValues++;

            red = LinearToSrgb[sourceValues[0]];
            green = LinearToSrgb[sourceValues[1]];
            blue = LinearToSrgb[sourceValues[2]];
            destinationValues[0] = 0xFF000000u
                | (uint)red << 16
                | (uint)green << 8
                | blue;
            sourceValues += 4;
            destinationValues++;

            red = LinearToSrgb[sourceValues[0]];
            green = LinearToSrgb[sourceValues[1]];
            blue = LinearToSrgb[sourceValues[2]];
            destinationValues[0] = 0xFF000000u
                | (uint)red << 16
                | (uint)green << 8
                | blue;
            sourceValues += 4;
            destinationValues++;

            red = LinearToSrgb[sourceValues[0]];
            green = LinearToSrgb[sourceValues[1]];
            blue = LinearToSrgb[sourceValues[2]];
            destinationValues[0] = 0xFF000000u
                | (uint)red << 16
                | (uint)green << 8
                | blue;
            sourceValues += 4;
            destinationValues++;
        }

        for (; index < pixelCount; index++)
        {
            var red = LinearToSrgb[sourceValues[0]];
            var green = LinearToSrgb[sourceValues[1]];
            var blue = LinearToSrgb[sourceValues[2]];
            destinationValues[0] = 0xFF000000u
                | (uint)red << 16
                | (uint)green << 8
                | blue;
            sourceValues += 4;
            destinationValues++;
        }
    }

    private static byte[] CreateLinearToSrgb()
    {
        var values = new byte[ushort.MaxValue + 1];
        for (var index = 0; index < values.Length; index++)
        {
            var linear = index / (double)ushort.MaxValue;
            var srgb = linear <= 0.0031308
                ? linear * 12.92
                : 1.055 * Math.Pow(linear, 1.0 / 2.4) - 0.055;
            values[index] = (byte)Math.Clamp(
                Math.Round(srgb * byte.MaxValue),
                byte.MinValue,
                byte.MaxValue);
        }
        return values;
    }
}
