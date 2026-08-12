namespace Goo.InternalTextInterop;

internal readonly record struct SdlGlConfiguration(
    int ContextMajorVersion,
    int ContextMinorVersion,
    int ContextProfileMask,
    int ContextFlags,
    int RedBits,
    int GreenBits,
    int BlueBits,
    int AlphaBits,
    int DepthBits,
    int StencilBits,
    bool DoubleBuffered,
    bool SdlDoubleBuffered,
    bool GlDoubleBuffered,
    bool Accelerated,
    bool SdlAccelerated,
    int SampleBuffers,
    int Samples,
    bool SdlSrgbCapable,
    int FramebufferColorEncoding,
    uint FramebufferFormat,
    /// <summary>EGL_RENDER_BUFFER on Wayland/EGL, or 0 on other backends.</summary>
    int EglRenderBuffer,
    /// <summary>EGL_GL_COLORSPACE on Wayland/EGL, or 0 on other backends.</summary>
    int EglColorSpace,
    /// <summary>EGL_CONFIG_CAVEAT on Wayland/EGL, or 0 on other backends.</summary>
    int EglConfigCaveat)
{
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
