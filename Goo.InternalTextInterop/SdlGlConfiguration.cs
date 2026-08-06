namespace Goo.InternalTextInterop;

internal readonly struct SdlGlConfiguration
{
    public SdlGlConfiguration(
        int contextMajorVersion,
        int contextMinorVersion,
        int contextProfileMask,
        int contextFlags,
        int redBits,
        int greenBits,
        int blueBits,
        int alphaBits,
        int depthBits,
        int stencilBits,
        bool doubleBuffered,
        bool sdlDoubleBuffered,
        bool glDoubleBuffered,
        bool accelerated,
        bool sdlAccelerated,
        int sampleBuffers,
        int samples,
        bool sdlSrgbCapable,
        int framebufferColorEncoding,
        uint framebufferFormat,
        int eglRenderBuffer,
        int eglColorSpace,
        int eglConfigCaveat)
    {
        ContextMajorVersion = contextMajorVersion;
        ContextMinorVersion = contextMinorVersion;
        ContextProfileMask = contextProfileMask;
        ContextFlags = contextFlags;
        RedBits = redBits;
        GreenBits = greenBits;
        BlueBits = blueBits;
        AlphaBits = alphaBits;
        DepthBits = depthBits;
        StencilBits = stencilBits;
        DoubleBuffered = doubleBuffered;
        SdlDoubleBuffered = sdlDoubleBuffered;
        GlDoubleBuffered = glDoubleBuffered;
        Accelerated = accelerated;
        SdlAccelerated = sdlAccelerated;
        SampleBuffers = sampleBuffers;
        Samples = samples;
        SdlSrgbCapable = sdlSrgbCapable;
        FramebufferColorEncoding = framebufferColorEncoding;
        FramebufferFormat = framebufferFormat;
        EglRenderBuffer = eglRenderBuffer;
        EglColorSpace = eglColorSpace;
        EglConfigCaveat = eglConfigCaveat;
    }

    public int ContextMajorVersion { get; }
    public int ContextMinorVersion { get; }
    public int ContextProfileMask { get; }
    public int ContextFlags { get; }
    public int RedBits { get; }
    public int GreenBits { get; }
    public int BlueBits { get; }
    public int AlphaBits { get; }
    public int DepthBits { get; }
    public int StencilBits { get; }
    public bool DoubleBuffered { get; }
    public bool SdlDoubleBuffered { get; }
    public bool GlDoubleBuffered { get; }
    public bool Accelerated { get; }
    public bool SdlAccelerated { get; }
    public int SampleBuffers { get; }
    public int Samples { get; }
    public bool SdlSrgbCapable { get; }
    public int FramebufferColorEncoding { get; }
    public uint FramebufferFormat { get; }
    /// <summary>Gets EGL_RENDER_BUFFER on Wayland/EGL, or 0 on other backends.</summary>
    public int EglRenderBuffer { get; }
    /// <summary>Gets EGL_GL_COLORSPACE on Wayland/EGL, or 0 on other backends.</summary>
    public int EglColorSpace { get; }
    /// <summary>Gets EGL_CONFIG_CAVEAT on Wayland/EGL, or 0 on other backends.</summary>
    public int EglConfigCaveat { get; }

    public override string ToString()
    {
        return $"GL {ContextMajorVersion}.{ContextMinorVersion}, profile 0x{ContextProfileMask:X}, " +
            $"flags 0x{ContextFlags:X}, RGBA {RedBits}/{GreenBits}/{BlueBits}/{AlphaBits}, " +
            $"depth {DepthBits}, stencil {StencilBits}, double-buffered {DoubleBuffered}, " +
            $"SDL double-buffered {SdlDoubleBuffered}, GL double-buffered {GlDoubleBuffered}, " +
            $"accelerated {Accelerated}, SDL accelerated {SdlAccelerated}, MSAA {SampleBuffers}x{Samples}, " +
            $"SDL sRGB {SdlSrgbCapable}, framebuffer encoding 0x{FramebufferColorEncoding:X}, " +
            $"format 0x{FramebufferFormat:X}, EGL render buffer 0x{EglRenderBuffer:X}, " +
            $"EGL colorspace 0x{EglColorSpace:X}, EGL config caveat 0x{EglConfigCaveat:X}.";
    }
}
