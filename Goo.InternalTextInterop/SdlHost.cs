using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using Hexa.NET.SDL3;

namespace Goo.InternalTextInterop;

internal enum SdlHostState
{
    Normal,
    Minimized,
    Maximized,
    Fullscreen,
}

internal enum SdlHostRenderer
{
    Gpu,
    Raster,
}

internal enum SdlHitResult
{
    Normal,
    Draggable,
    TopLeft,
    Top,
    TopRight,
    Right,
    BottomRight,
    Bottom,
    BottomLeft,
    Left,
}

internal enum SdlHostKey
{
    Unknown,
    Space,
    Apostrophe,
    Comma,
    Minus,
    Period,
    Slash,
    Number0,
    Number1,
    Number2,
    Number3,
    Number4,
    Number5,
    Number6,
    Number7,
    Number8,
    Number9,
    Semicolon,
    Equal,
    A,
    B,
    C,
    D,
    E,
    F,
    G,
    H,
    I,
    J,
    K,
    L,
    M,
    N,
    O,
    P,
    Q,
    R,
    S,
    T,
    U,
    V,
    W,
    X,
    Y,
    Z,
    LeftBracket,
    BackSlash,
    RightBracket,
    GraveAccent,
    World1,
    World2,
    Escape,
    Enter,
    Tab,
    Backspace,
    Insert,
    Delete,
    Right,
    Left,
    Down,
    Up,
    PageUp,
    PageDown,
    Home,
    End,
    CapsLock,
    ScrollLock,
    NumLock,
    PrintScreen,
    Pause,
    F1,
    F2,
    F3,
    F4,
    F5,
    F6,
    F7,
    F8,
    F9,
    F10,
    F11,
    F12,
    F13,
    F14,
    F15,
    F16,
    F17,
    F18,
    F19,
    F20,
    F21,
    F22,
    F23,
    F24,
    Keypad0,
    Keypad1,
    Keypad2,
    Keypad3,
    Keypad4,
    Keypad5,
    Keypad6,
    Keypad7,
    Keypad8,
    Keypad9,
    KeypadDecimal,
    KeypadDivide,
    KeypadMultiply,
    KeypadSubtract,
    KeypadAdd,
    KeypadEnter,
    KeypadEqual,
    ShiftLeft,
    ControlLeft,
    AltLeft,
    SuperLeft,
    ShiftRight,
    ControlRight,
    AltRight,
    SuperRight,
    Menu,
}

internal readonly record struct SdlHostModifiers(bool Alt, bool Shift, bool Ctrl, bool Super);

internal enum SdlHostPointerButton
{
    None,
    Primary,
    Secondary,
    Middle,
    Back,
    Forward,
}

internal enum SdlHostPointerDevice
{
    Mouse,
    Touch,
    Pen,
}

internal enum SdlHostCursor
{
    Default,
    Pointer,
    Text,
    Crosshair,
    Move,
    NotAllowed,
    Wait,
    Progress,
    ResizeHorizontal,
    ResizeVertical,
    ResizeNorthwestSoutheast,
    ResizeNortheastSouthwest,
    ResizeNorthwest,
    ResizeNorth,
    ResizeNortheast,
    ResizeEast,
    ResizeSoutheast,
    ResizeSouth,
    ResizeSouthwest,
    ResizeWest,
}

[Flags]
internal enum SdlHostPointerButtons
{
    None = 0,
    Primary = 1,
    Secondary = 2,
    Middle = 4,
    Back = 8,
    Forward = 16,
}

internal sealed unsafe class SdlHost : IDisposable
{
    private const long MousePointerId = 0;
    private const uint TouchMouseId = uint.MaxValue;
    private const uint PenMouseId = uint.MaxValue - 1;
    private const long MouseTouchId = -1;
    private const long PenTouchId = -2;
    private const int GlContextCoreProfileBit = 0x00000001;
    private const int GlContextCompatibilityProfileBit = 0x00000002;
    private const int GlContextForwardCompatibleFlagBit = 0x00000001;
    private const int GlContextDebugFlagBit = 0x00000002;
    private const int GlContextRobustAccessFlagBit = 0x00000004;
    private const int GlContextNoErrorFlagBit = 0x00000008;
    private const int GlContextProtectedContentFlagBit = 0x00000010;
    private const int GlContextHarmlessFlags =
        GlContextForwardCompatibleFlagBit |
        GlContextDebugFlagBit |
        GlContextRobustAccessFlagBit |
        GlContextNoErrorFlagBit |
        GlContextProtectedContentFlagBit;
    private const int MaxGlErrorDrainCount = 16;
    private const uint GlNoError = 0;
    private const uint GlBackLeft = 0x0402;
    private const uint GlDoublebuffer = 0x0C32;
    private const uint GlSampleBuffers = 0x80A8;
    private const uint GlSamples = 0x80A9;
    private const uint GlFramebuffer = 0x8D40;
    private const uint GlFramebufferAttachmentColorEncoding = 0x8210;
    private const uint GlFramebufferAttachmentRedSize = 0x8212;
    private const uint GlFramebufferAttachmentGreenSize = 0x8213;
    private const uint GlFramebufferAttachmentBlueSize = 0x8214;
    private const uint GlFramebufferAttachmentAlphaSize = 0x8215;
    private const uint GlSrgb = 0x8C40;
    private const uint GlSrgb8Alpha8 = 0x8C43;
    private const uint GlContextProfileMask = 0x9126;
    private const uint GlMajorVersion = 0x821B;
    private const uint GlMinorVersion = 0x821C;
    private const uint GlContextFlags = 0x821E;
    private const int EglConfigCaveat = 0x3027;
    private const int EglNone = 0x3038;
    private const int EglRenderBuffer = 0x3086;
    private const int EglGlColorspace = 0x309D;
    private const int EglBackBuffer = 0x3084;
    private const int EglGlColorspaceSrgb = 0x3089;
    private const string RequestedGlConfiguration =
        "OpenGL 3.3 core, RGBA8, double-buffered, accelerated, MSAA 0, stencil >= 8, sRGB";

    private readonly Func<int, int, SdlHitResult> hitTest;
    private readonly SDLHitTest hitTestDelegate;
    private readonly SdlHostRenderer renderer;
    private SDLWindowPtr window;
    private SDLGLContext context;
    private GlViewport? viewport;
    private uint windowId;
    private bool disposed;
    private bool runtimeOwned;
    private bool textInputActive;
    private bool hitTestEnabled;
    private SdlHostPointerButtons pointerButtons;
    private readonly Dictionary<TouchContactKey, long> touchPointers = new();
    private Dictionary<long, float>? penPressures;
    private long nextTouchPointerId = long.MinValue;

    public SdlHost(
        string title,
        int width,
        int height,
        int x,
        int y,
        bool positionSet,
        SdlHostState state,
        bool decorated,
        bool resizable,
        bool transparent,
        SdlHostRenderer renderer,
        bool vsync,
        Func<int, int, SdlHitResult> hitTest)
    {
        this.hitTest = hitTest;
        hitTestDelegate = HitTest;
        this.renderer = renderer;
        SdlRuntime.Acquire();
        runtimeOwned = true;

        try
        {
            CreateWindow(title, width, height, transparent);
            windowId = SDL.GetWindowID(window);
            if (windowId == 0)
                ThrowSdl("SDL_GetWindowID");
            SdlRuntime.Register(windowId, Dispatch);

            if (positionSet && CanMove)
                Require(SDL.SetWindowPosition(window, x, y), "SDL_SetWindowPosition");

            SetBorder(decorated, resizable);
            SetState(state);
            SetVSync(vsync);
            RefreshMetrics();
            RefreshPosition();

            if (renderer == SdlHostRenderer.Gpu)
            {
                var address = GetProcAddress("glViewport");
                if (address == IntPtr.Zero)
                    throw new InvalidOperationException("SDL_GL_GetProcAddress did not provide glViewport.");
                viewport = Marshal.GetDelegateForFunctionPointer<GlViewport>(address);
            }
        }
        catch
        {
            Dispose();
            throw;
        }
    }

    public event Action<int, int, int, int>? MetricsChanged;
    public event Action<int, int>? Moved;
    public event Action<SdlHostState>? StateChanged;
    public event Action<bool>? FocusChanged;
    public event Action? CloseRequested;
    public event Action? Exposed;
    public event Action<long, SdlHostPointerDevice, float, float, SdlHostPointerButtons, float, SdlHostModifiers>? PointerMoved;
    public event Action<long, SdlHostPointerDevice, float, float, SdlHostPointerButton, SdlHostPointerButtons, float, SdlHostModifiers>? PointerPressed;
    public event Action<long, SdlHostPointerDevice, float, float, SdlHostPointerButton, SdlHostPointerButtons, float, SdlHostModifiers>? PointerReleased;
    public event Action<long, SdlHostPointerDevice>? PointerCanceled;
    public event Action<float, float, float, float, SdlHostModifiers>? Wheel;
    public event Action<SdlHostKey, SdlHostModifiers>? KeyPressed;
    public event Action<SdlHostKey, SdlHostModifiers>? KeyReleased;
    public event Action<string>? TextEntered;
    public event Action<string, int, int>? TextEditing;
    public event Action<IReadOnlyList<string>, int, bool>? TextEditingCandidates;
    public event Action? TextCompositionCanceled;

    public int LogicalWidth { get; private set; }
    public int LogicalHeight { get; private set; }
    public int FramebufferWidth { get; private set; }
    public int FramebufferHeight { get; private set; }
    public int X { get; private set; }
    public int Y { get; private set; }
    internal SdlHostRenderer Renderer => renderer;
    internal bool IsTextInputActive => textInputActive;
    public bool IsClosing { get; private set; }
    public SdlGlConfiguration GlConfiguration { get; private set; }
    public bool CanMove
    {
        get
        {
            ThrowIfDisposed();
            return !IsWayland();
        }
    }

    public bool NativeResizable
    {
        get
        {
            ThrowIfDisposed();
            return (SDL.GetWindowFlags(window) & (ulong)SDLWindowFlags.Resizable) != 0;
        }
    }

    public void PollEvents()
    {
        ThrowIfDisposed();
        SdlRuntime.PollEvents();
        RefreshMetricsIfChanged();
    }

    /// <summary>
    /// Blocks up to <paramref name="timeoutMs"/> for the next native event (or a
    /// <see cref="Wake"/> call), then drains any remaining queued events.
    /// </summary>
    public void WaitEvents(int timeoutMs)
    {
        ThrowIfDisposed();
        SdlRuntime.WaitEvents(timeoutMs);
        RefreshMetricsIfChanged();
    }

    /// <summary>
    /// Unblocks a thread parked in <see cref="WaitEvents"/>. Safe to call from
    /// any thread, matching <c>Cell.Rebuild</c>'s cross-thread contract --
    /// including a call landing concurrently with <c>Window.Close()</c>
    /// disposing this instance, which is silently a no-op rather than an
    /// <see cref="ObjectDisposedException"/> on an arbitrary caller thread.
    /// </summary>
    public void Wake()
    {
        if (disposed)
            return;
        SdlRuntime.Wake();
    }

    public void SetTitle(string value)
    {
        ThrowIfDisposed();
        Require(SDL.SetWindowTitle(window, value), "SDL_SetWindowTitle");
    }

    public void SetSize(int width, int height)
    {
        ThrowIfDisposed();
        Require(SDL.SetWindowSize(window, width, height), "SDL_SetWindowSize");
    }

    public void SetPosition(int x, int y)
    {
        ThrowIfDisposed();
        if (CanMove)
            Require(SDL.SetWindowPosition(window, x, y), "SDL_SetWindowPosition");
    }

    public void SetState(SdlHostState value)
    {
        ThrowIfDisposed();
        if (value is SdlHostState.Normal or SdlHostState.Minimized or SdlHostState.Maximized)
            Require(SDL.SetWindowFullscreen(window, false), "SDL_SetWindowFullscreen");
        switch (value)
        {
            case SdlHostState.Normal:
                Require(SDL.RestoreWindow(window), "SDL_RestoreWindow");
                break;
            case SdlHostState.Minimized:
                Require(SDL.MinimizeWindow(window), "SDL_MinimizeWindow");
                break;
            case SdlHostState.Maximized:
                Require(SDL.MaximizeWindow(window), "SDL_MaximizeWindow");
                break;
            case SdlHostState.Fullscreen:
                Require(SDL.SetWindowFullscreen(window, true), "SDL_SetWindowFullscreen");
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(value));
        }
    }

    public void SetBorder(bool decorated, bool resizable)
    {
        ThrowIfDisposed();
        if (!decorated)
            EnableHitTest();

        Require(SDL.SetWindowBordered(window, decorated), "SDL_SetWindowBordered");
        Require(SDL.SetWindowResizable(window, resizable), "SDL_SetWindowResizable");

        if (decorated)
            DisableHitTest();
    }

    public void SetVSync(bool value)
    {
        ThrowIfDisposed();
        if (renderer == SdlHostRenderer.Raster)
            return;

        var requestedInterval = value ? 1 : 0;
        MakeCurrent();
        Require(SDL.GLSetSwapInterval(requestedInterval), "SDL_GL_SetSwapInterval");

        var actualInterval = 0;
        Require(SDL.GLGetSwapInterval(ref actualInterval), "SDL_GL_GetSwapInterval");
        if (actualInterval != requestedInterval)
            throw new InvalidOperationException(
                $"SDL_GL_SetSwapInterval requested {requestedInterval}, but SDL reports {actualInterval}.");
    }

    public void SetCursor(SdlHostCursor value)
    {
        ThrowIfDisposed();
        if (SDL.GetMouseFocus() != window)
            return;
        SdlRuntime.SetCursor(value);
    }

    public void Show()
    {
        ThrowIfDisposed();
        Require(SDL.ShowWindow(window), "SDL_ShowWindow");
    }

    public bool StartTextInput()
    {
        ThrowIfDisposed();
        if (textInputActive)
            return true;
        if (!SDL.StartTextInput(window))
            return false;
        textInputActive = true;
        return true;
    }

    public void StopTextInput()
    {
        ThrowIfDisposed();
        if (!textInputActive)
            return;
        Require(SDL.StopTextInput(window), "SDL_StopTextInput");
        textInputActive = false;
    }

    public bool SetImeArea(int x, int y, int width, int height, int cursor)
    {
        ThrowIfDisposed();
        if (!textInputActive)
            return false;
        var area = new SDLRect(x, y, width, height);
        return SDL.SetTextInputArea(window, in area, cursor);
    }

    public string GetClipboardText()
    {
        ThrowIfDisposed();
        return SDL.GetClipboardTextS();
    }

    public void SetClipboardText(string value)
    {
        ThrowIfDisposed();
        Require(SDL.SetClipboardText(value), "SDL_SetClipboardText");
    }

    public IntPtr GetProcAddress(string name)
    {
        ThrowIfDisposed();
        RequireRenderer(SdlHostRenderer.Gpu, "SdlHost.GetProcAddress");
        return (IntPtr)SDL.GLGetProcAddress(name);
    }

    public void MakeCurrent()
    {
        ThrowIfDisposed();
        RequireRenderer(SdlHostRenderer.Gpu, "SdlHost.MakeCurrent");
        Require(SDL.GLMakeCurrent(window, context), "SDL_GL_MakeCurrent");
    }

    public void SwapBuffers()
    {
        ThrowIfDisposed();
        RequireRenderer(SdlHostRenderer.Gpu, "SdlHost.SwapBuffers");
        Require(SDL.GLSwapWindow(window), "SDL_GL_SwapWindow");
    }

    public void Viewport(int width, int height)
    {
        ThrowIfDisposed();
        RequireRenderer(SdlHostRenderer.Gpu, "SdlHost.Viewport");
        viewport?.Invoke(0, 0, width, height);
    }

    internal void GetWaylandSurface(out IntPtr display, out IntPtr surface)
    {
        ThrowIfDisposed();
        RequireRenderer(SdlHostRenderer.Raster, "SdlHost.GetWaylandSurface");
        if (!IsWayland())
            throw new PlatformNotSupportedException(
                $"The raster renderer does not support SDL video driver '{SDL.GetCurrentVideoDriverS()}'.");

        var properties = SDL.GetWindowProperties(window);
        display = (IntPtr)SDL.GetPointerProperty(
            properties,
            "SDL.window.wayland.display",
            IntPtr.Zero);
        surface = (IntPtr)SDL.GetPointerProperty(
            properties,
            "SDL.window.wayland.surface",
            IntPtr.Zero);
        if (display == IntPtr.Zero || surface == IntPtr.Zero)
            throw new InvalidOperationException("SDL did not expose its Wayland display and surface.");
    }

    public void Dispose()
    {
        if (disposed)
            return;
        SdlRuntime.RequireMainThread("SdlHost.Dispose");
        disposed = true;
        if (windowId != 0)
        {
            SdlRuntime.Unregister(windowId);
            windowId = 0;
        }

        if (textInputActive && !window.IsNull)
        {
            SDL.StopTextInput(window);
            textInputActive = false;
        }
        if (hitTestEnabled && !window.IsNull)
        {
            SDL.SetWindowHitTest(window, (SDLHitTest?)null!, 0);
            hitTestEnabled = false;
        }
        if (!context.IsNull)
        {
            SDL.GLDestroyContext(context);
            context = SDLGLContext.Null;
        }
        if (!window.IsNull)
        {
            SDL.DestroyWindow(window);
            window = SDLWindowPtr.Null;
        }
        if (runtimeOwned)
        {
            runtimeOwned = false;
            SdlRuntime.Release();
        }
    }

    private void CreateWindow(string title, int width, int height, bool transparent)
    {
        if (renderer == SdlHostRenderer.Raster && transparent)
            throw new NotSupportedException("The raster renderer does not support transparent windows.");
        if (renderer == SdlHostRenderer.Gpu)
            ConfigureGl();

        var flags = BuildWindowFlags(transparent, renderer);
        window = SDL.CreateWindow(title, width, height, (ulong)flags);
        if (window.IsNull)
            ThrowSdl("SDL_CreateWindow");

        if (renderer == SdlHostRenderer.Raster)
            return;

        context = SDL.GLCreateContext(window);
        if (context.IsNull)
            ThrowSdl("SDL_GL_CreateContext");
        Require(SDL.GLMakeCurrent(window, context), "SDL_GL_MakeCurrent");
        GlConfiguration = QueryGlConfiguration();
    }

    private void EnableHitTest()
    {
        if (hitTestEnabled)
            return;
        Require(SDL.SetWindowHitTest(window, hitTestDelegate, 0), "SDL_SetWindowHitTest");
        hitTestEnabled = true;
    }

    private void DisableHitTest()
    {
        if (!hitTestEnabled)
            return;
        Require(SDL.SetWindowHitTest(window, (SDLHitTest?)null!, 0), "SDL_SetWindowHitTest");
        hitTestEnabled = false;
    }

    // No MSAA: Skia paints with analytic AA, and multisampled default
    // framebuffers multiply VRAM by the sample count at 4K.
    private static void ConfigureGl()
    {
        SDL.GLResetAttributes();
        SetGlAttribute(SDLGLAttr.RedSize, 8);
        SetGlAttribute(SDLGLAttr.GreenSize, 8);
        SetGlAttribute(SDLGLAttr.BlueSize, 8);
        SetGlAttribute(SDLGLAttr.AlphaSize, 8);
        SetGlAttribute(SDLGLAttr.Doublebuffer, 1);
        SetGlAttribute(SDLGLAttr.DepthSize, 0);
        SetGlAttribute(SDLGLAttr.StencilSize, 8);
        SetGlAttribute(SDLGLAttr.Multisamplebuffers, 0);
        SetGlAttribute(SDLGLAttr.Multisamplesamples, 0);
        SetGlAttribute(SDLGLAttr.AcceleratedVisual, 1);
        SetGlAttribute(SDLGLAttr.FramebufferSrgbCapable, 1);
        SetGlAttribute(SDLGLAttr.ContextMajorVersion, 3);
        SetGlAttribute(SDLGLAttr.ContextMinorVersion, 3);
        SetGlAttribute(SDLGLAttr.ContextProfileMask, SDL.SDL_GL_CONTEXT_PROFILE_CORE);
    }

    internal static SDLWindowFlags BuildWindowFlags(bool transparent, SdlHostRenderer renderer)
    {
        var flags = SDLWindowFlags.HighPixelDensity |
            SDLWindowFlags.Hidden |
            SDLWindowFlags.Resizable;
        if (renderer == SdlHostRenderer.Gpu)
            flags |= SDLWindowFlags.Opengl;
        return transparent ? flags | SDLWindowFlags.Transparent : flags;
    }

    private void RequireRenderer(SdlHostRenderer required, string operation)
    {
        if (renderer != required)
        {
            var name = required == SdlHostRenderer.Gpu ? "GPU" : "raster";
            throw new InvalidOperationException($"{operation} requires the {name} renderer.");
        }
    }

    private static void SetGlAttribute(SDLGLAttr attribute, int value)
    {
        Require(SDL.GLSetAttribute(attribute, value), "SDL_GL_SetAttribute");
    }

    /// <summary>Requires the main thread and a current GL context while it queries GL and EGL state.</summary>
    private SdlGlConfiguration QueryGlConfiguration()
    {
        var sdlMajor = GetGlAttribute(SDLGLAttr.ContextMajorVersion);
        var sdlMinor = GetGlAttribute(SDLGLAttr.ContextMinorVersion);
        var sdlProfile = GetGlAttribute(SDLGLAttr.ContextProfileMask);
        var sdlFlags = GetGlAttribute(SDLGLAttr.ContextFlags);
        var sdlRed = GetGlAttribute(SDLGLAttr.RedSize);
        var sdlGreen = GetGlAttribute(SDLGLAttr.GreenSize);
        var sdlBlue = GetGlAttribute(SDLGLAttr.BlueSize);
        var sdlAlpha = GetGlAttribute(SDLGLAttr.AlphaSize);
        var depth = GetGlAttribute(SDLGLAttr.DepthSize);
        var stencil = GetGlAttribute(SDLGLAttr.StencilSize);
        var sdlDoubleBuffered = GetGlAttribute(SDLGLAttr.Doublebuffer) != 0;
        var sdlAccelerated = GetGlAttribute(SDLGLAttr.AcceleratedVisual) != 0;
        var sdlSampleBuffers = GetGlAttribute(SDLGLAttr.Multisamplebuffers);
        var sdlSamples = GetGlAttribute(SDLGLAttr.Multisamplesamples);
        var sdlSrgbCapable = GetGlAttribute(SDLGLAttr.FramebufferSrgbCapable) != 0;
        var isWayland = IsWayland();
        var sdlActual =
            $"GL {sdlMajor}.{sdlMinor}, profile 0x{sdlProfile:X}, flags 0x{sdlFlags:X}, " +
            $"RGBA {sdlRed}/{sdlGreen}/{sdlBlue}/{sdlAlpha}, depth {depth}, stencil {stencil}, " +
            $"SDL double-buffered {sdlDoubleBuffered}, accelerated {sdlAccelerated}, " +
            $"MSAA {sdlSampleBuffers}x{sdlSamples}, sRGB {sdlSrgbCapable}.";

        string? sdlFailure = null;
        if (sdlRed != 8 || sdlGreen != 8 || sdlBlue != 8 || sdlAlpha != 8)
            sdlFailure = "SDL did not grant RGBA8.";
        else if (!isWayland && !sdlAccelerated)
            sdlFailure = "SDL did not grant an accelerated visual.";
        else if (sdlSampleBuffers != 0 || sdlSamples != 0)
            sdlFailure = "SDL did not disable MSAA.";
        else if (stencil < 8)
            sdlFailure = "SDL did not grant at least 8 stencil bits.";
        else if (!sdlSrgbCapable)
            sdlFailure = "SDL did not grant an sRGB-capable visual.";

        if (sdlFailure is not null)
            ThrowUnsupportedGlConfiguration(sdlActual, sdlFailure);

        var getError = LoadGlFunction<GlGetError>("glGetError");
        var getBoolean = LoadGlFunction<GlGetBooleanv>("glGetBooleanv");
        var getInteger = LoadGlFunction<GlGetIntegerv>("glGetIntegerv");
        var getFramebufferAttachmentParameter =
            LoadGlFunction<GlGetFramebufferAttachmentParameteriv>("glGetFramebufferAttachmentParameteriv");

        var major = GetGlInteger(getInteger, getError, GlMajorVersion);
        var minor = GetGlInteger(getInteger, getError, GlMinorVersion);
        var profile = GetGlInteger(getInteger, getError, GlContextProfileMask);
        var flags = GetGlInteger(getInteger, getError, GlContextFlags);
        var glDoubleBuffered = GetGlBoolean(getBoolean, getError, GlDoublebuffer);
        var eglRenderBuffer = 0;
        var eglColorSpace = 0;
        var eglConfigCaveat = 0;
        if (isWayland)
            QueryWaylandEglConfiguration(out eglRenderBuffer, out eglColorSpace, out eglConfigCaveat);
        var doubleBuffered = glDoubleBuffered || eglRenderBuffer == EglBackBuffer;
        var accelerated = isWayland ? eglConfigCaveat == EglNone : sdlAccelerated;
        var red = GetFramebufferAttachmentParameter(
            getFramebufferAttachmentParameter, getError, GlFramebufferAttachmentRedSize);
        var green = GetFramebufferAttachmentParameter(
            getFramebufferAttachmentParameter, getError, GlFramebufferAttachmentGreenSize);
        var blue = GetFramebufferAttachmentParameter(
            getFramebufferAttachmentParameter, getError, GlFramebufferAttachmentBlueSize);
        var alpha = GetFramebufferAttachmentParameter(
            getFramebufferAttachmentParameter, getError, GlFramebufferAttachmentAlphaSize);
        var colorEncoding = GetFramebufferAttachmentParameter(
            getFramebufferAttachmentParameter, getError, GlFramebufferAttachmentColorEncoding);
        var sampleBuffers = GetGlInteger(getInteger, getError, GlSampleBuffers);
        var samples = GetGlInteger(getInteger, getError, GlSamples);

        var configuration = new SdlGlConfiguration(
            major,
            minor,
            profile,
            flags,
            red,
            green,
            blue,
            alpha,
            depth,
            stencil,
            doubleBuffered,
            sdlDoubleBuffered,
            glDoubleBuffered,
            accelerated,
            sdlAccelerated,
            sampleBuffers,
            samples,
            sdlSrgbCapable,
            colorEncoding,
            IsRgba8(red, green, blue, alpha) &&
                (colorEncoding == GlSrgb || (isWayland && eglColorSpace == EglGlColorspaceSrgb))
                ? GlSrgb8Alpha8
                : 0,
            eglRenderBuffer,
            eglColorSpace,
            eglConfigCaveat);

        ValidateGlConfiguration(
            configuration,
            isWayland,
            sdlRed,
            sdlGreen,
            sdlBlue,
            sdlAlpha,
            sdlSampleBuffers,
            sdlSamples);
        return configuration;
    }

    private static void ValidateGlConfiguration(
        SdlGlConfiguration configuration,
        bool isWayland,
        int sdlRed,
        int sdlGreen,
        int sdlBlue,
        int sdlAlpha,
        int sdlSampleBuffers,
        int sdlSamples)
    {
        if (!IsAtLeastGl33(configuration.ContextMajorVersion, configuration.ContextMinorVersion) ||
            !IsCoreProfile(configuration.ContextProfileMask))
        {
            ThrowUnsupportedGlConfiguration(configuration, "OpenGL did not grant 3.3 core or newer.");
        }
        if (!HasHarmlessContextFlags(configuration.ContextFlags))
        {
            ThrowUnsupportedGlConfiguration(
                configuration,
                $"OpenGL reported unsupported context flags 0x{configuration.ContextFlags:X}.");
        }
        if (configuration.RedBits != sdlRed || configuration.GreenBits != sdlGreen ||
            configuration.BlueBits != sdlBlue || configuration.AlphaBits != sdlAlpha)
        {
            ThrowUnsupportedGlConfiguration(
                configuration,
                $"SDL reports RGBA {sdlRed}/{sdlGreen}/{sdlBlue}/{sdlAlpha}.");
        }
        if (configuration.SampleBuffers != sdlSampleBuffers || configuration.Samples != sdlSamples)
        {
            ThrowUnsupportedGlConfiguration(
                configuration,
                $"SDL reports MSAA {sdlSampleBuffers}x{sdlSamples}.");
        }
        if (configuration.RedBits != 8 || configuration.GreenBits != 8 ||
            configuration.BlueBits != 8 || configuration.AlphaBits != 8)
        {
            ThrowUnsupportedGlConfiguration(configuration, "The default framebuffer is not RGBA8.");
        }
        if (!configuration.DoubleBuffered)
            ThrowUnsupportedGlConfiguration(configuration, "The default framebuffer is not double-buffered.");
        if (!configuration.Accelerated)
        {
            ThrowUnsupportedGlConfiguration(
                configuration,
                isWayland
                    ? "Wayland EGL did not grant an EGL_CONFIG_CAVEAT-free configuration."
                    : "SDL did not grant an accelerated visual.");
        }
        if (configuration.SampleBuffers != 0 || configuration.Samples != 0)
            ThrowUnsupportedGlConfiguration(configuration, "The default framebuffer has MSAA enabled.");
        if (configuration.StencilBits < 8)
            ThrowUnsupportedGlConfiguration(configuration, "The default framebuffer has fewer than 8 stencil bits.");
        if (!configuration.SdlSrgbCapable)
            ThrowUnsupportedGlConfiguration(configuration, "SDL did not grant an sRGB-capable visual.");
        if (configuration.FramebufferColorEncoding != GlSrgb &&
            configuration.EglColorSpace != EglGlColorspaceSrgb)
        {
            ThrowUnsupportedGlConfiguration(
                configuration,
                "The default framebuffer is not sRGB encoded by OpenGL or Wayland EGL.");
        }
        if (isWayland && configuration.EglRenderBuffer != EglBackBuffer)
            ThrowUnsupportedGlConfiguration(configuration, "Wayland EGL did not grant EGL_BACK_BUFFER.");
        if (isWayland && configuration.EglColorSpace != EglGlColorspaceSrgb)
            ThrowUnsupportedGlConfiguration(configuration, "Wayland EGL did not grant EGL_GL_COLORSPACE_SRGB.");
        if (isWayland && configuration.EglConfigCaveat != EglNone)
            ThrowUnsupportedGlConfiguration(configuration, "Wayland EGL did not grant EGL_CONFIG_CAVEAT=EGL_NONE.");
    }

    private static bool IsAtLeastGl33(int major, int minor) => major > 3 || (major == 3 && minor >= 3);

    private static bool IsCoreProfile(int profile) =>
        (profile & GlContextCoreProfileBit) != 0 &&
        (profile & GlContextCompatibilityProfileBit) == 0;

    private static bool HasHarmlessContextFlags(int flags) =>
        (flags & ~GlContextHarmlessFlags) == 0;

    private static bool IsRgba8(int red, int green, int blue, int alpha) =>
        red == 8 && green == 8 && blue == 8 && alpha == 8;

    private static void ThrowUnsupportedGlConfiguration(object actual, string reason)
    {
        throw new InvalidOperationException(
            $"Goo could not use the OpenGL default framebuffer: {reason} " +
            $"Requested {RequestedGlConfiguration}; actual {actual}");
    }

    private static int GetGlAttribute(SDLGLAttr attribute)
    {
        var value = 0;
        Require(SDL.GLGetAttribute(attribute, ref value), $"SDL_GL_GetAttribute({attribute})");
        return value;
    }

    internal static bool IsWayland() => string.Equals(
        SDL.GetCurrentVideoDriverS(), "wayland", StringComparison.OrdinalIgnoreCase);

    private unsafe void QueryWaylandEglConfiguration(
        out int renderBuffer,
        out int colorSpace,
        out int configCaveat)
    {
        var getCurrentContext = LoadEglFunction<EglGetCurrentContext>("eglGetCurrentContext");
        var getConfigAttrib = LoadEglFunction<EglGetConfigAttrib>("eglGetConfigAttrib");
        var queryContext = LoadEglFunction<EglQueryContext>("eglQueryContext");
        var querySurface = LoadEglFunction<EglQuerySurface>("eglQuerySurface");
        var display = SDL.EGLGetCurrentDisplay();
        var context = getCurrentContext();
        var config = SDL.EGLGetCurrentConfig();
        var surface = SDL.EGLGetWindowSurface(window);
        if (display == null || context == null || config == null || surface == null)
            throw new InvalidOperationException("EGL has no current Wayland display, context, config, or window surface.");

        if (getConfigAttrib(display, config, EglConfigCaveat, out configCaveat) == 0)
            throw new InvalidOperationException("eglGetConfigAttrib(EGL_CONFIG_CAVEAT) failed.");
        if (queryContext(display, context, EglRenderBuffer, out renderBuffer) == 0)
            throw new InvalidOperationException("eglQueryContext(EGL_RENDER_BUFFER) failed.");
        if (querySurface(display, surface, EglGlColorspace, out colorSpace) == 0)
            throw new InvalidOperationException("eglQuerySurface(EGL_GL_COLORSPACE) failed.");
    }

    /// <summary>Requires the main thread and a current GL context.</summary>
    private T LoadGlFunction<T>(string name) where T : Delegate
    {
        var address = GetProcAddress(name);
        if (address == IntPtr.Zero)
            throw new InvalidOperationException($"SDL_GL_GetProcAddress did not provide {name}.");
        return Marshal.GetDelegateForFunctionPointer<T>(address);
    }

    /// <summary>Requires the main thread and a current GL context.</summary>
    private static T LoadEglFunction<T>(string name) where T : Delegate
    {
        var address = (IntPtr)SDL.EGLGetProcAddress(name);
        if (address == IntPtr.Zero)
            throw new InvalidOperationException($"SDL_EGL_GetProcAddress did not provide {name}.");
        return Marshal.GetDelegateForFunctionPointer<T>(address);
    }

    private static int GetGlInteger(GlGetIntegerv getInteger, GlGetError getError, uint pname)
    {
        ClearGlErrors(getError);
        getInteger(pname, out var value);
        ThrowGlError(getError, $"glGetIntegerv(0x{pname:X})");
        return value;
    }

    private static bool GetGlBoolean(GlGetBooleanv getBoolean, GlGetError getError, uint pname)
    {
        ClearGlErrors(getError);
        getBoolean(pname, out var value);
        ThrowGlError(getError, $"glGetBooleanv(0x{pname:X})");
        return value != 0;
    }

    private static int GetFramebufferAttachmentParameter(
        GlGetFramebufferAttachmentParameteriv getParameter,
        GlGetError getError,
        uint pname)
    {
        ClearGlErrors(getError);
        getParameter(GlFramebuffer, GlBackLeft, pname, out var value);
        ThrowGlError(getError, $"glGetFramebufferAttachmentParameteriv(0x{pname:X})");
        return value;
    }

    /// <summary>Drains one queued GL error per call, bounded by MaxGlErrorDrainCount.</summary>
    private static void ClearGlErrors(GlGetError getError)
    {
        for (var count = 0; count < MaxGlErrorDrainCount; count++)
        {
            if (getError() == GlNoError)
                return;
        }
        throw new InvalidOperationException(
            $"OpenGL error state did not clear after {MaxGlErrorDrainCount} glGetError calls.");
    }

    private static void ThrowGlError(GlGetError getError, string operation)
    {
        var error = getError();
        if (error != GlNoError)
            throw new InvalidOperationException($"{operation} failed with OpenGL error 0x{error:X}.");
    }

    /// <summary>Copies SDL-owned event strings before native dispatch returns.</summary>
    /// <remarks>An empty editing string represents composition cancellation.</remarks>
    private void Dispatch(SDLEvent nativeEvent)
    {
        var type = (SDLEventType)nativeEvent.Type;
        if (type is SDLEventType.Quit or SDLEventType.Terminating)
        {
            RequestClose();
            return;
        }

        if (IsWindowEvent(type))
        {
            if (nativeEvent.Window.WindowID == windowId)
                DispatchWindow(type, nativeEvent.Window);
            return;
        }

        switch (type)
        {
            case SDLEventType.MouseMotion when
                nativeEvent.Motion.WindowID == windowId &&
                !IsSyntheticMouse(nativeEvent.Motion.Which):
                pointerButtons = MapPointerButtons(nativeEvent.Motion.State);
                PointerMoved?.Invoke(
                    MousePointerId,
                    SdlHostPointerDevice.Mouse,
                    nativeEvent.Motion.X,
                    nativeEvent.Motion.Y,
                    pointerButtons,
                    MousePressure(pointerButtons),
                    MapModifiers(SDL.GetModState()));
                break;
            case SDLEventType.MouseButtonDown when
                nativeEvent.Button.WindowID == windowId &&
                !IsSyntheticMouse(nativeEvent.Button.Which):
                var pressed = MapPointerButton(nativeEvent.Button.Button);
                if (pressed == SdlHostPointerButton.None)
                    break;
                pointerButtons |= ToPointerButtons(pressed);
                PointerPressed?.Invoke(
                    MousePointerId,
                    SdlHostPointerDevice.Mouse,
                    nativeEvent.Button.X,
                    nativeEvent.Button.Y,
                    pressed,
                    pointerButtons,
                    MousePressure(pointerButtons),
                    MapModifiers(SDL.GetModState()));
                break;
            case SDLEventType.MouseButtonUp when
                nativeEvent.Button.WindowID == windowId &&
                !IsSyntheticMouse(nativeEvent.Button.Which):
                var released = MapPointerButton(nativeEvent.Button.Button);
                if (released == SdlHostPointerButton.None)
                    break;
                pointerButtons &= ~ToPointerButtons(released);
                PointerReleased?.Invoke(
                    MousePointerId,
                    SdlHostPointerDevice.Mouse,
                    nativeEvent.Button.X,
                    nativeEvent.Button.Y,
                    released,
                    pointerButtons,
                    MousePressure(pointerButtons),
                    MapModifiers(SDL.GetModState()));
                break;
            case SDLEventType.MouseWheel when nativeEvent.Wheel.WindowID == windowId:
                var direction = nativeEvent.Wheel.Direction == SDLMouseWheelDirection.Flipped ? -1f : 1f;
                Wheel?.Invoke(
                    nativeEvent.Wheel.MouseX,
                    nativeEvent.Wheel.MouseY,
                    nativeEvent.Wheel.X * direction,
                    nativeEvent.Wheel.Y * direction,
                    MapModifiers(SDL.GetModState()));
                break;
            case SDLEventType.FingerDown when
                nativeEvent.Tfinger.WindowID == windowId &&
                !IsSyntheticTouch(nativeEvent.Tfinger.TouchID):
                PointerPressed?.Invoke(
                    GetTouchPointerId(nativeEvent.Tfinger.TouchID, nativeEvent.Tfinger.FingerID),
                    SdlHostPointerDevice.Touch,
                    TouchX(nativeEvent.Tfinger.X),
                    TouchY(nativeEvent.Tfinger.Y),
                    SdlHostPointerButton.Primary,
                    SdlHostPointerButtons.Primary,
                    NormalizePressure(nativeEvent.Tfinger.Pressure),
                    MapModifiers(SDL.GetModState()));
                break;
            case SDLEventType.FingerMotion when
                nativeEvent.Tfinger.WindowID == windowId &&
                !IsSyntheticTouch(nativeEvent.Tfinger.TouchID):
                if (TryGetTouchPointerId(nativeEvent.Tfinger.TouchID, nativeEvent.Tfinger.FingerID, out var touchId))
                    PointerMoved?.Invoke(
                        touchId,
                        SdlHostPointerDevice.Touch,
                        TouchX(nativeEvent.Tfinger.X),
                        TouchY(nativeEvent.Tfinger.Y),
                        SdlHostPointerButtons.Primary,
                        NormalizePressure(nativeEvent.Tfinger.Pressure),
                        MapModifiers(SDL.GetModState()));
                break;
            case SDLEventType.FingerUp when
                nativeEvent.Tfinger.WindowID == windowId &&
                !IsSyntheticTouch(nativeEvent.Tfinger.TouchID):
                ReleaseTouchPointer(nativeEvent.Tfinger, false);
                break;
            case SDLEventType.FingerCanceled when
                nativeEvent.Tfinger.WindowID == windowId &&
                !IsSyntheticTouch(nativeEvent.Tfinger.TouchID):
                ReleaseTouchPointer(nativeEvent.Tfinger, true);
                break;
            case SDLEventType.PenDown when nativeEvent.Ptouch.WindowID == windowId:
                var penDownButtons = PenButtons(nativeEvent.Ptouch.PenState) | SdlHostPointerButtons.Primary;
                PointerPressed?.Invoke(
                    nativeEvent.Ptouch.Which,
                    SdlHostPointerDevice.Pen,
                    nativeEvent.Ptouch.X,
                    nativeEvent.Ptouch.Y,
                    SdlHostPointerButton.Primary,
                    penDownButtons,
                    PenPressure(nativeEvent.Ptouch.Which),
                    MapModifiers(SDL.GetModState()));
                break;
            case SDLEventType.PenMotion when nativeEvent.Pmotion.WindowID == windowId:
                var penMotionButtons = PenButtons(nativeEvent.Pmotion.PenState);
                PointerMoved?.Invoke(
                    nativeEvent.Pmotion.Which,
                    SdlHostPointerDevice.Pen,
                    nativeEvent.Pmotion.X,
                    nativeEvent.Pmotion.Y,
                    penMotionButtons,
                    PenPressure(nativeEvent.Pmotion.Which),
                    MapModifiers(SDL.GetModState()));
                break;
            case SDLEventType.PenUp when nativeEvent.Ptouch.WindowID == windowId:
                var penUpButtons = PenButtons(nativeEvent.Ptouch.PenState) & ~SdlHostPointerButtons.Primary;
                PointerReleased?.Invoke(
                    nativeEvent.Ptouch.Which,
                    SdlHostPointerDevice.Pen,
                    nativeEvent.Ptouch.X,
                    nativeEvent.Ptouch.Y,
                    SdlHostPointerButton.Primary,
                    penUpButtons,
                    PenPressure(nativeEvent.Ptouch.Which),
                    MapModifiers(SDL.GetModState()));
                break;
            case SDLEventType.PenAxis when nativeEvent.Paxis.WindowID == windowId:
                if (nativeEvent.Paxis.Axis == SDLPenAxis.Pressure)
                    (penPressures ??= new())[nativeEvent.Paxis.Which] =
                        NormalizePressure(nativeEvent.Paxis.Value);
                break;
            case SDLEventType.PenButtonDown when nativeEvent.Pbutton.WindowID == windowId:
                DispatchPenButton(nativeEvent.Pbutton, true);
                break;
            case SDLEventType.PenButtonUp when nativeEvent.Pbutton.WindowID == windowId:
                DispatchPenButton(nativeEvent.Pbutton, false);
                break;
            case SDLEventType.PenProximityOut when
                nativeEvent.Pproximity.WindowID == 0 || nativeEvent.Pproximity.WindowID == windowId:
                penPressures?.Remove(nativeEvent.Pproximity.Which);
                PointerCanceled?.Invoke(nativeEvent.Pproximity.Which, SdlHostPointerDevice.Pen);
                break;
            case SDLEventType.KeyDown when
                nativeEvent.Key.WindowID == windowId &&
                nativeEvent.Key.Repeat == 0:
                KeyPressed?.Invoke(
                    MapKey(nativeEvent.Key.Scancode),
                    MapModifiers(nativeEvent.Key.Mod));
                break;
            case SDLEventType.KeyUp when nativeEvent.Key.WindowID == windowId:
                KeyReleased?.Invoke(
                    MapKey(nativeEvent.Key.Scancode),
                    MapModifiers(nativeEvent.Key.Mod));
                break;
            case SDLEventType.TextInput when nativeEvent.Text.WindowID == windowId:
                var text = Marshal.PtrToStringUTF8((nint)nativeEvent.Text.Text);
                if (!string.IsNullOrEmpty(text))
                    TextEntered?.Invoke(text);
                break;
            case SDLEventType.TextEditing when nativeEvent.Edit.WindowID == windowId:
                var editing = Marshal.PtrToStringUTF8((nint)nativeEvent.Edit.Text) ?? string.Empty;
                if (editing.Length == 0)
                    TextCompositionCanceled?.Invoke();
                else
                {
                    ConvertCompositionRange(
                        editing,
                        nativeEvent.Edit.Start,
                        nativeEvent.Edit.Length,
                        out var selectionStart,
                        out var selectionLength);
                    TextEditing?.Invoke(editing, selectionStart, selectionLength);
                }
                break;
            case SDLEventType.TextEditingCandidates when
                nativeEvent.EditCandidates.WindowID == windowId:
                var candidates = CopyCandidates(nativeEvent.EditCandidates);
                var selectedCandidate = nativeEvent.EditCandidates.SelectedCandidate;
                if (selectedCandidate < 0 || selectedCandidate >= candidates.Length)
                    selectedCandidate = -1;
                TextEditingCandidates?.Invoke(
                    Array.AsReadOnly(candidates),
                    selectedCandidate,
                    nativeEvent.EditCandidates.Horizontal != 0);
                break;
        }
    }

    /// <summary>Copies SDL-owned candidate strings before native dispatch returns.</summary>
    private static string[] CopyCandidates(SDLTextEditingCandidatesEvent nativeEvent)
    {
        if (nativeEvent.Candidates == null || nativeEvent.NumCandidates <= 0)
            return [];

        var candidates = new string[nativeEvent.NumCandidates];
        for (var i = 0; i < candidates.Length; i++)
            candidates[i] = Marshal.PtrToStringUTF8((nint)nativeEvent.Candidates[i]) ?? string.Empty;
        return candidates;
    }

    /// <summary>Converts and normalizes SDL UTF-8 codepoint ranges to UTF-16 code units.</summary>
    internal static void ConvertCompositionRange(
        string text,
        int characterStart,
        int characterLength,
        out int utf16Start,
        out int utf16Length)
    {
        if (characterStart < 0 || characterLength < 0)
        {
            utf16Start = 0;
            utf16Length = 0;
            return;
        }

        var scalarCount = 0;
        foreach (var _ in text.EnumerateRunes())
            scalarCount++;
        if (characterStart > scalarCount || characterLength > scalarCount - characterStart)
        {
            utf16Start = 0;
            utf16Length = 0;
            return;
        }

        utf16Start = Utf16Offset(text, characterStart);
        var utf16End = Utf16Offset(text, characterStart + characterLength);
        utf16Length = utf16End - utf16Start;
    }

    /// <summary>Converts an SDL UTF-8 codepoint offset to a UTF-16 code-unit offset.</summary>
    private static int Utf16Offset(string text, int characterOffset)
    {
        if (characterOffset <= 0)
            return 0;

        var scalar = 0;
        var utf16 = 0;
        foreach (var rune in text.EnumerateRunes())
        {
            if (scalar == characterOffset)
                break;
            utf16 += rune.Utf16SequenceLength;
            scalar++;
        }
        return utf16;
    }

    private void DispatchWindow(SDLEventType type, SDLWindowEvent nativeEvent)
    {
        switch (type)
        {
            case SDLEventType.WindowMoved:
                X = nativeEvent.Data1;
                Y = nativeEvent.Data2;
                Moved?.Invoke(X, Y);
                RefreshMetrics();
                RaiseMetrics();
                break;
            case SDLEventType.WindowResized:
                LogicalWidth = nativeEvent.Data1;
                LogicalHeight = nativeEvent.Data2;
                RefreshFramebuffer();
                RaiseMetrics();
                break;
            case SDLEventType.WindowPixelSizeChanged:
                FramebufferWidth = nativeEvent.Data1;
                FramebufferHeight = nativeEvent.Data2;
                RefreshLogical();
                RaiseMetrics();
                break;
            case SDLEventType.WindowDisplayChanged:
            case SDLEventType.WindowDisplayScaleChanged:
                RefreshMetrics();
                RaiseMetrics();
                break;
            case SDLEventType.WindowMinimized:
                StateChanged?.Invoke(SdlHostState.Minimized);
                break;
            case SDLEventType.WindowMaximized:
                StateChanged?.Invoke(SdlHostState.Maximized);
                break;
            case SDLEventType.WindowRestored:
                StateChanged?.Invoke(SdlHostState.Normal);
                break;
            case SDLEventType.WindowEnterFullscreen:
                StateChanged?.Invoke(SdlHostState.Fullscreen);
                break;
            case SDLEventType.WindowLeaveFullscreen:
                StateChanged?.Invoke(SdlHostState.Normal);
                break;
            case SDLEventType.WindowFocusGained:
                FocusChanged?.Invoke(true);
                break;
            case SDLEventType.WindowFocusLost:
                pointerButtons = SdlHostPointerButtons.None;
                FocusChanged?.Invoke(false);
                break;
            case SDLEventType.WindowCloseRequested:
                RequestClose();
                break;
            case SDLEventType.WindowExposed:
                Exposed?.Invoke();
                break;
        }
    }

    private static bool IsWindowEvent(SDLEventType type)
    {
        return type >= SDLEventType.WindowFirst && type <= SDLEventType.WindowLast;
    }

    private void RefreshMetrics()
    {
        RefreshLogical();
        RefreshFramebuffer();
    }

    private void RefreshMetricsIfChanged()
    {
        var logicalWidth = LogicalWidth;
        var logicalHeight = LogicalHeight;
        var framebufferWidth = FramebufferWidth;
        var framebufferHeight = FramebufferHeight;
        RefreshMetrics();
        if (logicalWidth != LogicalWidth ||
            logicalHeight != LogicalHeight ||
            framebufferWidth != FramebufferWidth ||
            framebufferHeight != FramebufferHeight)
        {
            RaiseMetrics();
        }
    }

    private void RefreshLogical()
    {
        var width = 0;
        var height = 0;
        Require(SDL.GetWindowSize(window, ref width, ref height), "SDL_GetWindowSize");
        LogicalWidth = width;
        LogicalHeight = height;
    }

    private void RefreshFramebuffer()
    {
        var width = 0;
        var height = 0;
        Require(SDL.GetWindowSizeInPixels(window, ref width, ref height),
            "SDL_GetWindowSizeInPixels");
        FramebufferWidth = width;
        FramebufferHeight = height;
    }

    private void RefreshPosition()
    {
        var x = 0;
        var y = 0;
        Require(SDL.GetWindowPosition(window, ref x, ref y), "SDL_GetWindowPosition");
        X = x;
        Y = y;
    }

    private void RaiseMetrics()
    {
        MetricsChanged?.Invoke(
            LogicalWidth,
            LogicalHeight,
            FramebufferWidth,
            FramebufferHeight);
    }

    // With a subscriber the close request is only reported; the subscriber
    // decides and calls BeginClose. Without one the window closes directly.
    private void RequestClose()
    {
        if (IsClosing)
            return;
        var handler = CloseRequested;
        if (handler is not null)
        {
            handler();
            return;
        }
        IsClosing = true;
    }

    public void BeginClose()
    {
        ThrowIfDisposed();
        IsClosing = true;
    }

    private SDLHitTestResult HitTest(SDLWindow* _, SDLPoint* point, void* __) =>
        EvaluateHitTest(hitTest, point->X, point->Y);

    internal static SDLHitTestResult EvaluateHitTest(
        Func<int, int, SdlHitResult> hitTest,
        int x,
        int y)
    {
        try
        {
            return hitTest(x, y) switch
            {
                SdlHitResult.Normal => SDLHitTestResult.Normal,
                SdlHitResult.Draggable => SDLHitTestResult.Draggable,
                SdlHitResult.TopLeft => SDLHitTestResult.ResizeTopleft,
                SdlHitResult.Top => SDLHitTestResult.ResizeTop,
                SdlHitResult.TopRight => SDLHitTestResult.ResizeTopright,
                SdlHitResult.Right => SDLHitTestResult.ResizeRight,
                SdlHitResult.BottomRight => SDLHitTestResult.ResizeBottomright,
                SdlHitResult.Bottom => SDLHitTestResult.ResizeBottom,
                SdlHitResult.BottomLeft => SDLHitTestResult.ResizeBottomleft,
                SdlHitResult.Left => SDLHitTestResult.ResizeLeft,
                _ => SDLHitTestResult.Normal,
            };
        }
        catch (Exception)
        {
            return SDLHitTestResult.Normal;
        }
    }

    private static SdlHostModifiers MapModifiers(ushort value)
    {
        return new SdlHostModifiers(
            (value & (SDL.SDL_KMOD_LALT | SDL.SDL_KMOD_RALT)) != 0,
            (value & (SDL.SDL_KMOD_LSHIFT | SDL.SDL_KMOD_RSHIFT)) != 0,
            (value & (SDL.SDL_KMOD_LCTRL | SDL.SDL_KMOD_RCTRL)) != 0,
            (value & (SDL.SDL_KMOD_LGUI | SDL.SDL_KMOD_RGUI)) != 0);
    }

    private static SdlHostPointerButton MapPointerButton(byte button)
    {
        return button switch
        {
            SDL.SDL_BUTTON_LEFT => SdlHostPointerButton.Primary,
            SDL.SDL_BUTTON_RIGHT => SdlHostPointerButton.Secondary,
            SDL.SDL_BUTTON_MIDDLE => SdlHostPointerButton.Middle,
            SDL.SDL_BUTTON_X1 => SdlHostPointerButton.Back,
            SDL.SDL_BUTTON_X2 => SdlHostPointerButton.Forward,
            _ => SdlHostPointerButton.None,
        };
    }

    private static SdlHostPointerButtons MapPointerButtons(uint state)
    {
        var buttons = SdlHostPointerButtons.None;
        if ((state & NativePointerMask(SDL.SDL_BUTTON_LEFT)) != 0)
            buttons |= SdlHostPointerButtons.Primary;
        if ((state & NativePointerMask(SDL.SDL_BUTTON_RIGHT)) != 0)
            buttons |= SdlHostPointerButtons.Secondary;
        if ((state & NativePointerMask(SDL.SDL_BUTTON_MIDDLE)) != 0)
            buttons |= SdlHostPointerButtons.Middle;
        if ((state & NativePointerMask(SDL.SDL_BUTTON_X1)) != 0)
            buttons |= SdlHostPointerButtons.Back;
        if ((state & NativePointerMask(SDL.SDL_BUTTON_X2)) != 0)
            buttons |= SdlHostPointerButtons.Forward;
        return buttons;
    }

    internal static bool IsSyntheticMouse(uint which)
    {
        return which is TouchMouseId or PenMouseId;
    }

    internal static bool IsSyntheticTouch(long touchId)
    {
        return touchId is MouseTouchId or PenTouchId;
    }

    private float TouchX(float normalizedX)
    {
        return normalizedX * LogicalWidth;
    }

    private float TouchY(float normalizedY)
    {
        return normalizedY * LogicalHeight;
    }

    private long GetTouchPointerId(long touchId, long fingerId)
    {
        var key = new TouchContactKey(touchId, fingerId);
        if (touchPointers.TryGetValue(key, out var pointerId))
            return pointerId;
        if (nextTouchPointerId == -1)
            throw new InvalidOperationException("SDL touch pointer ID space is exhausted.");
        pointerId = nextTouchPointerId++;
        touchPointers.Add(key, pointerId);
        return pointerId;
    }

    private bool TryGetTouchPointerId(long touchId, long fingerId, out long pointerId)
    {
        return touchPointers.TryGetValue(new TouchContactKey(touchId, fingerId), out pointerId);
    }

    private void ReleaseTouchPointer(SDLTouchFingerEvent touch, bool canceled)
    {
        var key = new TouchContactKey(touch.TouchID, touch.FingerID);
        if (!touchPointers.Remove(key, out var pointerId))
            return;
        if (canceled)
        {
            PointerCanceled?.Invoke(pointerId, SdlHostPointerDevice.Touch);
            return;
        }
        PointerReleased?.Invoke(
            pointerId,
            SdlHostPointerDevice.Touch,
            TouchX(touch.X),
            TouchY(touch.Y),
            SdlHostPointerButton.Primary,
            SdlHostPointerButtons.None,
            NormalizePressure(touch.Pressure),
            MapModifiers(SDL.GetModState()));
    }

    private static SdlHostPointerButtons PenButtons(uint state)
    {
        var buttons = SdlHostPointerButtons.None;
        if ((state & (uint)SDLPenInputFlags.Down) != 0)
            buttons |= SdlHostPointerButtons.Primary;
        if ((state & (uint)SDLPenInputFlags.Button1) != 0)
            buttons |= SdlHostPointerButtons.Secondary;
        if ((state & (uint)SDLPenInputFlags.Button2) != 0)
            buttons |= SdlHostPointerButtons.Middle;
        if ((state & (uint)SDLPenInputFlags.Button3) != 0)
            buttons |= SdlHostPointerButtons.Back;
        if ((state & (uint)SDLPenInputFlags.Button4) != 0)
            buttons |= SdlHostPointerButtons.Forward;
        return buttons;
    }

    private void DispatchPenButton(SDLPenButtonEvent pen, bool down)
    {
        var button = MapPenButton(pen.Button);
        if (button == SdlHostPointerButton.None)
            return;
        var buttons = PenButtons(pen.PenState);
        if (down)
            buttons |= ToPointerButtons(button);
        else
            buttons &= ~ToPointerButtons(button);
        var dispatch = down ? PointerPressed : PointerReleased;
        dispatch?.Invoke(
            pen.Which,
            SdlHostPointerDevice.Pen,
            pen.X,
            pen.Y,
            button,
            buttons,
            PenPressure(pen.Which),
            MapModifiers(SDL.GetModState()));
    }

    private static float MousePressure(SdlHostPointerButtons buttons) =>
        (buttons & SdlHostPointerButtons.Primary) != 0 ? 1f : 0f;

    private float PenPressure(long penId) =>
        penPressures is not null && penPressures.TryGetValue(penId, out var pressure)
            ? pressure
            : 0f;

    private static float NormalizePressure(float pressure)
    {
        if (float.IsNaN(pressure) || pressure <= 0f)
            return 0f;
        return pressure >= 1f ? 1f : pressure;
    }

    private static SdlHostPointerButton MapPenButton(byte button)
    {
        return button switch
        {
            1 => SdlHostPointerButton.Secondary,
            2 => SdlHostPointerButton.Middle,
            3 => SdlHostPointerButton.Back,
            4 => SdlHostPointerButton.Forward,
            _ => SdlHostPointerButton.None,
        };
    }

    private static SdlHostPointerButtons ToPointerButtons(SdlHostPointerButton button)
    {
        return button switch
        {
            SdlHostPointerButton.Primary => SdlHostPointerButtons.Primary,
            SdlHostPointerButton.Secondary => SdlHostPointerButtons.Secondary,
            SdlHostPointerButton.Middle => SdlHostPointerButtons.Middle,
            SdlHostPointerButton.Back => SdlHostPointerButtons.Back,
            SdlHostPointerButton.Forward => SdlHostPointerButtons.Forward,
            _ => SdlHostPointerButtons.None,
        };
    }

    private static uint NativePointerMask(int button)
    {
        return 1u << (button - 1);
    }

    private readonly record struct TouchContactKey(long TouchId, long FingerId);

    private static SdlHostKey MapKey(SDLScancode key)
    {
        return key switch
        {
            SDLScancode.Space => SdlHostKey.Space,
            SDLScancode.Apostrophe => SdlHostKey.Apostrophe,
            SDLScancode.Comma => SdlHostKey.Comma,
            SDLScancode.Minus => SdlHostKey.Minus,
            SDLScancode.Period => SdlHostKey.Period,
            SDLScancode.Slash => SdlHostKey.Slash,
            SDLScancode.Scancode0 => SdlHostKey.Number0,
            SDLScancode.Scancode1 => SdlHostKey.Number1,
            SDLScancode.Scancode2 => SdlHostKey.Number2,
            SDLScancode.Scancode3 => SdlHostKey.Number3,
            SDLScancode.Scancode4 => SdlHostKey.Number4,
            SDLScancode.Scancode5 => SdlHostKey.Number5,
            SDLScancode.Scancode6 => SdlHostKey.Number6,
            SDLScancode.Scancode7 => SdlHostKey.Number7,
            SDLScancode.Scancode8 => SdlHostKey.Number8,
            SDLScancode.Scancode9 => SdlHostKey.Number9,
            SDLScancode.Semicolon => SdlHostKey.Semicolon,
            SDLScancode.Equals => SdlHostKey.Equal,
            SDLScancode.A => SdlHostKey.A,
            SDLScancode.B => SdlHostKey.B,
            SDLScancode.C => SdlHostKey.C,
            SDLScancode.D => SdlHostKey.D,
            SDLScancode.E => SdlHostKey.E,
            SDLScancode.F => SdlHostKey.F,
            SDLScancode.G => SdlHostKey.G,
            SDLScancode.H => SdlHostKey.H,
            SDLScancode.I => SdlHostKey.I,
            SDLScancode.J => SdlHostKey.J,
            SDLScancode.K => SdlHostKey.K,
            SDLScancode.L => SdlHostKey.L,
            SDLScancode.M => SdlHostKey.M,
            SDLScancode.N => SdlHostKey.N,
            SDLScancode.O => SdlHostKey.O,
            SDLScancode.P => SdlHostKey.P,
            SDLScancode.Q => SdlHostKey.Q,
            SDLScancode.R => SdlHostKey.R,
            SDLScancode.S => SdlHostKey.S,
            SDLScancode.T => SdlHostKey.T,
            SDLScancode.U => SdlHostKey.U,
            SDLScancode.V => SdlHostKey.V,
            SDLScancode.W => SdlHostKey.W,
            SDLScancode.X => SdlHostKey.X,
            SDLScancode.Y => SdlHostKey.Y,
            SDLScancode.Z => SdlHostKey.Z,
            SDLScancode.Leftbracket => SdlHostKey.LeftBracket,
            SDLScancode.Backslash => SdlHostKey.BackSlash,
            SDLScancode.Rightbracket => SdlHostKey.RightBracket,
            SDLScancode.Grave => SdlHostKey.GraveAccent,
            SDLScancode.International1 => SdlHostKey.World1,
            SDLScancode.International2 => SdlHostKey.World2,
            SDLScancode.Escape => SdlHostKey.Escape,
            SDLScancode.Return => SdlHostKey.Enter,
            SDLScancode.Tab => SdlHostKey.Tab,
            SDLScancode.Backspace => SdlHostKey.Backspace,
            SDLScancode.Insert => SdlHostKey.Insert,
            SDLScancode.Delete => SdlHostKey.Delete,
            SDLScancode.Right => SdlHostKey.Right,
            SDLScancode.Left => SdlHostKey.Left,
            SDLScancode.Down => SdlHostKey.Down,
            SDLScancode.Up => SdlHostKey.Up,
            SDLScancode.Pageup => SdlHostKey.PageUp,
            SDLScancode.Pagedown => SdlHostKey.PageDown,
            SDLScancode.Home => SdlHostKey.Home,
            SDLScancode.End => SdlHostKey.End,
            SDLScancode.Capslock => SdlHostKey.CapsLock,
            SDLScancode.Scrolllock => SdlHostKey.ScrollLock,
            SDLScancode.Numlockclear => SdlHostKey.NumLock,
            SDLScancode.Printscreen => SdlHostKey.PrintScreen,
            SDLScancode.Pause => SdlHostKey.Pause,
            SDLScancode.F1 => SdlHostKey.F1,
            SDLScancode.F2 => SdlHostKey.F2,
            SDLScancode.F3 => SdlHostKey.F3,
            SDLScancode.F4 => SdlHostKey.F4,
            SDLScancode.F5 => SdlHostKey.F5,
            SDLScancode.F6 => SdlHostKey.F6,
            SDLScancode.F7 => SdlHostKey.F7,
            SDLScancode.F8 => SdlHostKey.F8,
            SDLScancode.F9 => SdlHostKey.F9,
            SDLScancode.F10 => SdlHostKey.F10,
            SDLScancode.F11 => SdlHostKey.F11,
            SDLScancode.F12 => SdlHostKey.F12,
            SDLScancode.F13 => SdlHostKey.F13,
            SDLScancode.F14 => SdlHostKey.F14,
            SDLScancode.F15 => SdlHostKey.F15,
            SDLScancode.F16 => SdlHostKey.F16,
            SDLScancode.F17 => SdlHostKey.F17,
            SDLScancode.F18 => SdlHostKey.F18,
            SDLScancode.F19 => SdlHostKey.F19,
            SDLScancode.F20 => SdlHostKey.F20,
            SDLScancode.F21 => SdlHostKey.F21,
            SDLScancode.F22 => SdlHostKey.F22,
            SDLScancode.F23 => SdlHostKey.F23,
            SDLScancode.F24 => SdlHostKey.F24,
            SDLScancode.Kp0 => SdlHostKey.Keypad0,
            SDLScancode.Kp1 => SdlHostKey.Keypad1,
            SDLScancode.Kp2 => SdlHostKey.Keypad2,
            SDLScancode.Kp3 => SdlHostKey.Keypad3,
            SDLScancode.Kp4 => SdlHostKey.Keypad4,
            SDLScancode.Kp5 => SdlHostKey.Keypad5,
            SDLScancode.Kp6 => SdlHostKey.Keypad6,
            SDLScancode.Kp7 => SdlHostKey.Keypad7,
            SDLScancode.Kp8 => SdlHostKey.Keypad8,
            SDLScancode.Kp9 => SdlHostKey.Keypad9,
            SDLScancode.KpPeriod => SdlHostKey.KeypadDecimal,
            SDLScancode.KpDivide => SdlHostKey.KeypadDivide,
            SDLScancode.KpMultiply => SdlHostKey.KeypadMultiply,
            SDLScancode.KpMinus => SdlHostKey.KeypadSubtract,
            SDLScancode.KpPlus => SdlHostKey.KeypadAdd,
            SDLScancode.KpEnter => SdlHostKey.KeypadEnter,
            SDLScancode.KpEquals => SdlHostKey.KeypadEqual,
            SDLScancode.Lshift => SdlHostKey.ShiftLeft,
            SDLScancode.Lctrl => SdlHostKey.ControlLeft,
            SDLScancode.Lalt => SdlHostKey.AltLeft,
            SDLScancode.Lgui => SdlHostKey.SuperLeft,
            SDLScancode.Rshift => SdlHostKey.ShiftRight,
            SDLScancode.Rctrl => SdlHostKey.ControlRight,
            SDLScancode.Ralt => SdlHostKey.AltRight,
            SDLScancode.Rgui => SdlHostKey.SuperRight,
            SDLScancode.Application or SDLScancode.Menu => SdlHostKey.Menu,
            _ => SdlHostKey.Unknown,
        };
    }

    private static void Require(bool result, string operation)
    {
        if (!result)
            ThrowSdl(operation);
    }

    private static void ThrowSdl(string operation)
    {
        throw new InvalidOperationException($"{operation} failed: {SDL.GetErrorS()}");
    }

    private void ThrowIfDisposed([CallerMemberName] string operation = "")
    {
        SdlRuntime.RequireMainThread(operation, "SdlHost.");
        ObjectDisposedException.ThrowIf(disposed, this);
    }

    [UnmanagedFunctionPointer(CallingConvention.Winapi)]
    private delegate void GlViewport(int x, int y, int width, int height);

    [UnmanagedFunctionPointer(CallingConvention.Winapi)]
    private delegate void GlGetIntegerv(uint pname, out int value);

    [UnmanagedFunctionPointer(CallingConvention.Winapi)]
    private delegate void GlGetBooleanv(uint pname, out byte value);

    [UnmanagedFunctionPointer(CallingConvention.Winapi)]
    private delegate void GlGetFramebufferAttachmentParameteriv(
        uint target,
        uint attachment,
        uint pname,
        out int value);

    [UnmanagedFunctionPointer(CallingConvention.Winapi)]
    private delegate uint GlGetError();

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private unsafe delegate void* EglGetCurrentContext();

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private unsafe delegate uint EglGetConfigAttrib(void* display, void* config, int attribute, out int value);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private unsafe delegate uint EglQueryContext(void* display, void* context, int attribute, out int value);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private unsafe delegate uint EglQuerySurface(void* display, void* surface, int attribute, out int value);

}

internal sealed class SdlEventRouter<TEvent>
{
    private readonly Dictionary<uint, Action<TEvent>> handlers = [];

    internal void Register(uint windowId, Action<TEvent> handler)
    {
        handlers[windowId] = handler;
    }

    internal void Unregister(uint windowId)
    {
        handlers.Remove(windowId);
    }

    internal void Route(uint windowId, TEvent nativeEvent)
    {
        if (handlers.TryGetValue(windowId, out var handler))
            handler(nativeEvent);
    }

    internal void RouteAll(TEvent nativeEvent)
    {
        foreach (var handler in handlers.Values.ToArray())
            handler(nativeEvent);
    }
}

internal static class SdlRuntime
{
    private const uint RequiredSubsystems =
        (uint)(SDLInitFlags.Video | SDLInitFlags.Events);
    private static readonly object Sync = new();
    private static readonly SdlEventRouter<SDLEvent> Events = new();
    private static int mainThreadId;
    private static int references;
    private static uint wakeEventType;
    private static SDLCursorPtr[]? cursors;
    private static SdlHostCursor currentCursor;
    private static bool applicationConfigured;
    private static string? applicationName;
    private static string? applicationVersion;
    private static string? applicationIdentifier;

    /// <summary>Sets SDL app metadata before SDL_Init, enforced by the runtime-state checks.</summary>
    public static void ConfigureApplication(string name, string version, string identifier)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(name);
        ArgumentException.ThrowIfNullOrWhiteSpace(version);
        ArgumentException.ThrowIfNullOrWhiteSpace(identifier);

        lock (Sync)
        {
            if (applicationConfigured)
            {
                if (string.Equals(applicationName, name, StringComparison.Ordinal) &&
                    string.Equals(applicationVersion, version, StringComparison.Ordinal) &&
                    string.Equals(applicationIdentifier, identifier, StringComparison.Ordinal))
                {
                    return;
                }
                throw new InvalidOperationException(
                    "Goo application metadata is already configured with different values.");
            }
            if (mainThreadId != 0 || SDL.WasInit(0) != 0)
            {
                throw new InvalidOperationException(
                    "Goo application metadata must be configured before SDL initialization.");
            }
            if (!SDL.SetAppMetadata(name, version, identifier))
                throw new InvalidOperationException($"SDL_SetAppMetadata failed: {SDL.GetErrorS()}");

            applicationName = name;
            applicationVersion = version;
            applicationIdentifier = identifier;
            applicationConfigured = true;
        }
    }

    internal static void Register(uint windowId, Action<SDLEvent> handler)
    {
        RequireMainThread("SDL event registration");
        Events.Register(windowId, handler);
    }

    internal static void Unregister(uint windowId)
    {
        RequireMainThread("SDL event unregistration");
        Events.Unregister(windowId);
    }

    internal static void PollEvents()
    {
        RequireMainThread("SDL event polling");
        var nativeEvent = default(SDLEvent);
        while (SDL.PollEvent(ref nativeEvent))
            DispatchOne(nativeEvent);
    }

    // Blocks the calling thread (must be the video-subsystem thread) until an
    // event arrives or timeoutMs elapses, then drains the rest of the queue
    // non-blocking so a burst of events lands in one wake, not one per event.
    internal static void WaitEvents(int timeoutMs)
    {
        RequireMainThread("SDL event waiting");
        var nativeEvent = default(SDLEvent);
        if (SDL.WaitEventTimeout(ref nativeEvent, timeoutMs))
        {
            DispatchOne(nativeEvent);
            PollEvents();
        }
    }

    // Queues a private user event so SDL_WaitEventTimeout returns immediately.
    // It has no window id and is dropped after waking the wait.
    internal static void Wake()
    {
        lock (Sync)
        {
            if (references == 0)
                return;
            var wakeEvent = new SDLEvent { Type = wakeEventType };
            var added = SDL.PeepEvents(ref wakeEvent, 1, SDLEventAction.Addevent, 0, 0);
            if (added != 1)
                throw new InvalidOperationException($"SDL_PeepEvents failed to enqueue wake event: {SDL.GetErrorS()}");
        }
    }

    internal static void SetCursor(SdlHostCursor value)
    {
        RequireMainThread("SDL cursor mutation");
        if ((int)value < (int)SdlHostCursor.Default || (int)value > (int)SdlHostCursor.ResizeWest)
            throw new ArgumentOutOfRangeException(nameof(value));
        if (value == currentCursor)
            return;

        SDLCursorPtr cursor;
        if (value == SdlHostCursor.Default)
        {
            cursor = SDL.GetDefaultCursor();
        }
        else
        {
            cursors ??= new SDLCursorPtr[(int)SdlHostCursor.ResizeWest + 1];
            cursor = cursors[(int)value];
            if (cursor.IsNull)
            {
                cursor = SDL.CreateSystemCursor(MapSystemCursor(value));
                if (cursor.IsNull)
                    throw new InvalidOperationException($"SDL_CreateSystemCursor failed: {SDL.GetErrorS()}");
                cursors[(int)value] = cursor;
            }
        }

        if (!SDL.SetCursor(cursor))
            throw new InvalidOperationException($"SDL_SetCursor failed: {SDL.GetErrorS()}");
        currentCursor = value;
    }

    internal static SDLSystemCursor MapSystemCursor(SdlHostCursor value) => value switch
    {
        SdlHostCursor.Default => SDLSystemCursor.Default,
        SdlHostCursor.Pointer => SDLSystemCursor.Pointer,
        SdlHostCursor.Text => SDLSystemCursor.Text,
        SdlHostCursor.Crosshair => SDLSystemCursor.Crosshair,
        SdlHostCursor.Move => SDLSystemCursor.Move,
        SdlHostCursor.NotAllowed => SDLSystemCursor.NotAllowed,
        SdlHostCursor.Wait => SDLSystemCursor.Wait,
        SdlHostCursor.Progress => SDLSystemCursor.Progress,
        SdlHostCursor.ResizeHorizontal => SDLSystemCursor.EwResize,
        SdlHostCursor.ResizeVertical => SDLSystemCursor.NsResize,
        SdlHostCursor.ResizeNorthwestSoutheast => SDLSystemCursor.NwseResize,
        SdlHostCursor.ResizeNortheastSouthwest => SDLSystemCursor.NeswResize,
        SdlHostCursor.ResizeNorthwest => SDLSystemCursor.NwResize,
        SdlHostCursor.ResizeNorth => SDLSystemCursor.NResize,
        SdlHostCursor.ResizeNortheast => SDLSystemCursor.NeResize,
        SdlHostCursor.ResizeEast => SDLSystemCursor.EResize,
        SdlHostCursor.ResizeSoutheast => SDLSystemCursor.SeResize,
        SdlHostCursor.ResizeSouth => SDLSystemCursor.SResize,
        SdlHostCursor.ResizeSouthwest => SDLSystemCursor.SwResize,
        SdlHostCursor.ResizeWest => SDLSystemCursor.WResize,
        _ => throw new ArgumentOutOfRangeException(nameof(value)),
    };

    private static void DispatchOne(SDLEvent nativeEvent)
    {
        var type = (SDLEventType)nativeEvent.Type;
        if (type is SDLEventType.Quit or SDLEventType.Terminating)
        {
            Events.RouteAll(nativeEvent);
        }
        else if ((SDLEventType)nativeEvent.Type == SDLEventType.PenProximityOut &&
                 nativeEvent.Pproximity.WindowID == 0)
        {
            Events.RouteAll(nativeEvent);
        }
        else if (TryGetWindowId(nativeEvent, out var windowId))
        {
            Events.Route(windowId, nativeEvent);
        }
    }

    public static void Acquire()
    {
        lock (Sync)
        {
            RequireMainThreadLocked("Window.Open");
            if (references == 0)
            {
                var requiresWayland = OperatingSystem.IsLinux();
                if (requiresWayland && !SDL.SetHintWithPriority(
                    SDL.SDL_HINT_VIDEO_DRIVER,
                    "wayland",
                    SDLHintPriority.Override))
                {
                    throw new PlatformNotSupportedException(
                        "Goo requires native Wayland on Linux, but SDL rejected the Wayland video driver selection.");
                }
                SDL.SetHint(SDL.SDL_HINT_MOUSE_FOCUS_CLICKTHROUGH, "1");
                if (!SDL.InitSubSystem(RequiredSubsystems))
                {
                    if (requiresWayland)
                    {
                        throw new PlatformNotSupportedException(
                            $"Goo requires native Wayland on Linux. " +
                            $"SDL could not initialize the Wayland video driver: {SDL.GetErrorS()}");
                    }
                    throw new InvalidOperationException($"SDL_InitSubSystem failed: {SDL.GetErrorS()}");
                }
                RequireMainThreadLocked("Window.Open");
                if (mainThreadId == 0)
                    mainThreadId = Environment.CurrentManagedThreadId;
                if (requiresWayland && !SdlHost.IsWayland())
                {
                    var driver = SDL.GetCurrentVideoDriverS();
                    SDL.QuitSubSystem(RequiredSubsystems);
                    throw new PlatformNotSupportedException(
                        $"Goo requires native Wayland on Linux, but SDL initialized '{driver}'.");
                }
                wakeEventType = SDL.RegisterEvents(1);
                if (wakeEventType == 0 || wakeEventType == uint.MaxValue)
                {
                    SDL.QuitSubSystem(RequiredSubsystems);
                    throw new InvalidOperationException("SDL_RegisterEvents failed to allocate a wake event type.");
                }
            }
            references++;
        }
    }

    public static void Release()
    {
        lock (Sync)
        {
            RequireMainThreadLocked("SDL subsystem release");
            if (references == 0)
                return;
            references--;
            if (references == 0)
            {
                SDL.SetCursor(SDL.GetDefaultCursor());
                if (cursors is not null)
                {
                    foreach (var cursor in cursors)
                    {
                        if (!cursor.IsNull)
                            SDL.DestroyCursor(cursor);
                    }
                    cursors = null;
                }
                currentCursor = SdlHostCursor.Default;
                SDL.QuitSubSystem(RequiredSubsystems);
            }
        }
    }

    internal static void RequireMainThread(string operation, string prefix = "")
    {
        lock (Sync)
            RequireMainThreadLocked(operation, prefix);
    }

    private static void RequireMainThreadLocked(string operation, string prefix = "")
    {
        var currentThreadId = Environment.CurrentManagedThreadId;
        if (mainThreadId != 0 && currentThreadId != mainThreadId)
        {
            var operationText = prefix.Length == 0 ? operation : string.Concat(prefix, operation);
            throw new InvalidOperationException(
                $"{operationText} must run on Goo's main UI thread {mainThreadId}; " +
                $"the current managed thread is {currentThreadId}.");
        }
        if (!SDL.IsMainThread())
        {
            var operationText = prefix.Length == 0 ? operation : string.Concat(prefix, operation);
            throw new InvalidOperationException(
                $"{operationText} must run on SDL's main thread; " +
                $"the current managed thread is {currentThreadId}.");
        }
    }

    private static bool TryGetWindowId(SDLEvent nativeEvent, out uint windowId)
    {
        var type = (SDLEventType)nativeEvent.Type;
        if (type >= SDLEventType.WindowFirst && type <= SDLEventType.WindowLast)
        {
            windowId = nativeEvent.Window.WindowID;
            return windowId != 0;
        }

        windowId = type switch
        {
            SDLEventType.MouseMotion => nativeEvent.Motion.WindowID,
            SDLEventType.MouseButtonDown or SDLEventType.MouseButtonUp =>
                nativeEvent.Button.WindowID,
            SDLEventType.MouseWheel => nativeEvent.Wheel.WindowID,
            SDLEventType.FingerDown or SDLEventType.FingerMotion or SDLEventType.FingerUp
                or SDLEventType.FingerCanceled => nativeEvent.Tfinger.WindowID,
            SDLEventType.PenDown or SDLEventType.PenUp => nativeEvent.Ptouch.WindowID,
            SDLEventType.PenMotion => nativeEvent.Pmotion.WindowID,
            SDLEventType.PenAxis => nativeEvent.Paxis.WindowID,
            SDLEventType.PenButtonDown or SDLEventType.PenButtonUp => nativeEvent.Pbutton.WindowID,
            SDLEventType.PenProximityIn or SDLEventType.PenProximityOut => nativeEvent.Pproximity.WindowID,
            SDLEventType.KeyDown or SDLEventType.KeyUp => nativeEvent.Key.WindowID,
            SDLEventType.TextInput => nativeEvent.Text.WindowID,
            SDLEventType.TextEditing => nativeEvent.Edit.WindowID,
            SDLEventType.TextEditingCandidates => nativeEvent.EditCandidates.WindowID,
            _ => 0,
        };
        return windowId != 0;
    }

}
