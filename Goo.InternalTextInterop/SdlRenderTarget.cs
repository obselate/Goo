using SkiaSharp;

namespace Goo.InternalTextInterop;

internal interface SdlRenderTarget : IDisposable
{
    SKCanvas Canvas { get; }
    void BeginFrame();
    bool Resize(int width, int height);
    void Flush();
    void Present();
}

internal static class SdlRenderTargetFactory
{
    public static SdlRenderTarget Create(SdlHost host) => host.Renderer switch
    {
        SdlHostRenderer.Gpu => new SdlGpuRenderTarget(host),
        SdlHostRenderer.Raster => new WaylandShmRasterTarget(host),
        _ => throw new ArgumentOutOfRangeException(nameof(host.Renderer)),
    };
}

internal sealed class SdlGpuRenderTarget : SdlRenderTarget
{
    private readonly SdlHost host;
    private readonly GRContext context;
    private GRBackendRenderTarget? target;
    private SKSurface? surface;
    private int width;
    private int height;

    public SdlGpuRenderTarget(SdlHost host)
    {
        this.host = host;
        using var glInterface = GRGlInterface.Create(host.GetProcAddress)
            ?? throw new InvalidOperationException("Window initialization could not create a Skia OpenGL interface.");
        context = GRContext.CreateGl(glInterface)
            ?? throw new InvalidOperationException("Window initialization could not create a Skia GPU context.");
    }

    public SKCanvas Canvas => surface?.Canvas
        ?? throw new InvalidOperationException("The GPU render target has not been sized.");

    public void BeginFrame() => host.MakeCurrent();

    public bool Resize(int width, int height)
    {
        if (width <= 0 || height <= 0)
            return false;
        if (surface is not null && this.width == width && this.height == height)
            return true;

        host.MakeCurrent();
        host.Viewport(width, height);
        surface?.Dispose();
        surface = null;
        target?.Dispose();
        target = null;
        context.ResetContext(GRGlBackendState.All);

        var gl = host.GlConfiguration;
        var framebufferInfo = new GRGlFramebufferInfo(0, gl.FramebufferFormat);
        var nextTarget = new GRBackendRenderTarget(
            width,
            height,
            gl.Samples,
            gl.StencilBits,
            framebufferInfo);
        try
        {
            using var colorSpace = SKColorSpace.CreateSrgbLinear();
            var nextSurface = SKSurface.Create(
                context,
                nextTarget,
                GRSurfaceOrigin.BottomLeft,
                SKColorType.Srgba8888,
                colorSpace);
            if (nextSurface is null)
            {
                nextTarget.Dispose();
                return false;
            }
            target = nextTarget;
            surface = nextSurface;
            this.width = width;
            this.height = height;
            return true;
        }
        catch
        {
            nextTarget.Dispose();
            return false;
        }
    }

    public void Flush() => context.Flush();

    public void Present() => host.SwapBuffers();

    public void Dispose()
    {
        surface?.Dispose();
        surface = null;
        target?.Dispose();
        target = null;
        context.Dispose();
        width = 0;
        height = 0;
    }
}
