using System;
using System.Collections.Generic;
using System.Threading;
using Goo.InternalTextInterop;
using Hexa.NET.SDL3;
using Xunit;

[Trait("Category", "NativeBoundary")]
public sealed class WindowSdlHostTests
{
    [Fact]
    public void PointerEventsMatchSdl3TouchAndPenAbi()
    {
        Assert.True(Enum.IsDefined(SDLEventType.FingerDown));
        Assert.True(Enum.IsDefined(SDLEventType.FingerMotion));
        Assert.True(Enum.IsDefined(SDLEventType.FingerUp));
        Assert.True(Enum.IsDefined(SDLEventType.FingerCanceled));
        Assert.True(Enum.IsDefined(SDLEventType.PenDown));
        Assert.True(Enum.IsDefined(SDLEventType.PenMotion));
        Assert.True(Enum.IsDefined(SDLEventType.PenUp));
        Assert.True(Enum.IsDefined(SDLEventType.PenButtonDown));
        Assert.True(Enum.IsDefined(SDLEventType.PenButtonUp));
        Assert.True(Enum.IsDefined(SDLEventType.PenAxis));
        Assert.True(Enum.IsDefined(SDLEventType.PenProximityOut));

        Assert.Equal(typeof(long), typeof(SDLTouchFingerEvent).GetField("TouchID")!.FieldType);
        Assert.Equal(typeof(long), typeof(SDLTouchFingerEvent).GetField("FingerID")!.FieldType);
        Assert.Equal(typeof(float), typeof(SDLTouchFingerEvent).GetField("X")!.FieldType);
        Assert.Equal(typeof(float), typeof(SDLTouchFingerEvent).GetField("Y")!.FieldType);
        Assert.Equal(typeof(float), typeof(SDLTouchFingerEvent).GetField("Pressure")!.FieldType);
        Assert.Equal(typeof(uint), typeof(SDLTouchFingerEvent).GetField("WindowID")!.FieldType);

        Assert.Equal(typeof(uint), typeof(SDLPenTouchEvent).GetField("Which")!.FieldType);
        Assert.Equal(typeof(uint), typeof(SDLPenMotionEvent).GetField("Which")!.FieldType);
        Assert.Equal(typeof(uint), typeof(SDLPenMotionEvent).GetField("PenState")!.FieldType);
        Assert.Equal(typeof(uint), typeof(SDLPenAxisEvent).GetField("Which")!.FieldType);
        Assert.Equal(typeof(SDLPenAxis), typeof(SDLPenAxisEvent).GetField("Axis")!.FieldType);
        Assert.Equal(typeof(float), typeof(SDLPenAxisEvent).GetField("Value")!.FieldType);
        Assert.Equal(typeof(uint), typeof(SDLPenButtonEvent).GetField("WindowID")!.FieldType);
        Assert.Equal(typeof(uint), typeof(SDLPenButtonEvent).GetField("Which")!.FieldType);
        Assert.Equal(typeof(uint), typeof(SDLPenButtonEvent).GetField("PenState")!.FieldType);
        Assert.Equal(typeof(float), typeof(SDLPenButtonEvent).GetField("X")!.FieldType);
        Assert.Equal(typeof(float), typeof(SDLPenButtonEvent).GetField("Y")!.FieldType);
        Assert.Equal(typeof(byte), typeof(SDLPenButtonEvent).GetField("Button")!.FieldType);
        Assert.Equal(typeof(SDLTouchFingerEvent), typeof(SDLEvent).GetField("Tfinger")!.FieldType);
        Assert.Equal(typeof(SDLPenTouchEvent), typeof(SDLEvent).GetField("Ptouch")!.FieldType);
        Assert.Equal(typeof(SDLPenMotionEvent), typeof(SDLEvent).GetField("Pmotion")!.FieldType);
        Assert.Equal(typeof(SDLPenButtonEvent), typeof(SDLEvent).GetField("Pbutton")!.FieldType);
        Assert.Equal(typeof(SDLPenAxisEvent), typeof(SDLEvent).GetField("Paxis")!.FieldType);

        Assert.True(SdlHost.IsSyntheticMouse(uint.MaxValue));
        Assert.True(SdlHost.IsSyntheticMouse(uint.MaxValue - 1));
        Assert.False(SdlHost.IsSyntheticMouse(0));
        Assert.True(SdlHost.IsSyntheticTouch(-1));
        Assert.True(SdlHost.IsSyntheticTouch(-2));
        Assert.False(SdlHost.IsSyntheticTouch(0));
    }

    [Fact]
    public void TextEditingEventsMatchSdl3Abi()
    {
        Assert.True(Enum.IsDefined(SDLEventType.TextEditing));
        Assert.True(Enum.IsDefined(SDLEventType.TextEditingCandidates));

        Assert.Equal(typeof(uint), typeof(SDLTextEditingEvent).GetField("WindowID")!.FieldType);
        Assert.True(typeof(SDLTextEditingEvent).GetField("Text")!.FieldType.IsPointer);
        Assert.Equal(typeof(int), typeof(SDLTextEditingEvent).GetField("Start")!.FieldType);
        Assert.Equal(typeof(int), typeof(SDLTextEditingEvent).GetField("Length")!.FieldType);

        Assert.Equal(typeof(uint), typeof(SDLTextEditingCandidatesEvent).GetField("WindowID")!.FieldType);
        var candidates = typeof(SDLTextEditingCandidatesEvent).GetField("Candidates")!.FieldType;
        Assert.True(candidates.IsPointer);
        Assert.True(candidates.GetElementType()!.IsPointer);
        Assert.Equal(typeof(int),
            typeof(SDLTextEditingCandidatesEvent).GetField("NumCandidates")!.FieldType);
        Assert.Equal(typeof(int),
            typeof(SDLTextEditingCandidatesEvent).GetField("SelectedCandidate")!.FieldType);
        Assert.Equal(typeof(byte),
            typeof(SDLTextEditingCandidatesEvent).GetField("Horizontal")!.FieldType);

        Assert.Equal(typeof(SDLTextEditingEvent), typeof(SDLEvent).GetField("Edit")!.FieldType);
        Assert.Equal(
            typeof(SDLTextEditingCandidatesEvent),
            typeof(SDLEvent).GetField("EditCandidates")!.FieldType);
    }

    [Theory]
    [InlineData("a😀b", 0, 3, 0, 4)]
    [InlineData("a😀b", 1, 1, 1, 2)]
    [InlineData("a😀b", 2, 1, 3, 1)]
    [InlineData("a😀b", -1, -1, 0, 0)]
    [InlineData("a😀b", -1, 0, 0, 0)]
    [InlineData("a😀b", 0, -1, 0, 0)]
    [InlineData("a😀b", 3, 1, 0, 0)]
    [InlineData("a😀b", 2, 2, 0, 0)]
    public void CompositionRangesConvertFromScalarsToUtf16(
        string text,
        int nativeStart,
        int nativeLength,
        int expectedStart,
        int expectedLength)
    {
        SdlHost.ConvertCompositionRange(
            text,
            nativeStart,
            nativeLength,
            out var actualStart,
            out var actualLength);

        Assert.Equal(expectedStart, actualStart);
        Assert.Equal(expectedLength, actualLength);
    }

    [Fact]
    public void ApplicationMetadataReachesSdl()
    {
        Assert.Throws<ArgumentException>(() =>
            Goo.Window.ConfigureApplication("", "0.1.0", "io.github.obselate.goo.tests"));
        Assert.Throws<ArgumentException>(() =>
            Goo.Window.ConfigureApplication("Goo Tests", "", "io.github.obselate.goo.tests"));
        Assert.Throws<ArgumentException>(() =>
            Goo.Window.ConfigureApplication("Goo Tests", "0.1.0", ""));

        Goo.Window.ConfigureApplication("Goo Tests", "0.1.0", "io.github.obselate.goo.tests");

        Assert.Equal("Goo Tests", SDL.GetAppMetadataPropertyS("SDL.app.metadata.name"));
        Assert.Equal("0.1.0", SDL.GetAppMetadataPropertyS("SDL.app.metadata.version"));
        Assert.Equal(
            "io.github.obselate.goo.tests",
            SDL.GetAppMetadataPropertyS("SDL.app.metadata.identifier"));
        Assert.Throws<InvalidOperationException>(() =>
            Goo.Window.ConfigureApplication("Other", "0.1.0", "io.github.obselate.other"));
    }

    [Fact]
    public void NativeWindowsRequireOwnerThread()
    {
        using var host = CreateHost("thread-owner", false);
        Exception? mutationError = null;
        Exception? disposeError = null;
        Exception? openError = null;
        Exception? wakeError = null;

        var worker = new Thread(() =>
        {
            try
            {
                host.SetTitle("wrong-thread");
            }
            catch (Exception error)
            {
                mutationError = error;
            }

            try
            {
                host.Dispose();
            }
            catch (Exception error)
            {
                disposeError = error;
            }

            try
            {
                using var other = CreateHost("wrong-thread", false);
            }
            catch (Exception error)
            {
                openError = error;
            }

            try
            {
                host.Wake();
            }
            catch (Exception error)
            {
                wakeError = error;
            }
        });

        worker.Start();
        Assert.True(worker.Join(TimeSpan.FromSeconds(5)));
        Assert.IsType<InvalidOperationException>(mutationError);
        Assert.IsType<InvalidOperationException>(disposeError);
        Assert.IsType<InvalidOperationException>(openError);
        Assert.Null(wakeError);
        host.SetTitle("owner-thread");
    }

    [Fact]
    public void SharedEventsRouteByWindow()
    {
        var router = new SdlEventRouter<int>();
        var first = 0;
        var second = 0;
        router.Register(11, value => first += value);
        router.Register(22, value => second += value);

        router.Route(22, 3);
        Assert.Equal(0, first);
        Assert.Equal(3, second);

        router.RouteAll(2);
        Assert.Equal(2, first);
        Assert.Equal(5, second);

        router.Unregister(22);
        router.Route(22, 7);
        router.RouteAll(1);
        Assert.Equal(3, first);
        Assert.Equal(5, second);
    }

    [Fact]
    public void PollEventsDrainsEntireQueue()
    {
        var events = (uint)SDLInitFlags.Events;
        Assert.True(SDL.InitSubSystem(events), SDL.GetErrorS());
        try
        {
            var eventType = SDL.RegisterEvents(1);
            Assert.NotEqual(uint.MaxValue, eventType);
            for (var i = 0; i < 128; i++)
            {
                var nativeEvent = new SDLEvent { Type = eventType };
                Assert.True(SDL.PushEvent(ref nativeEvent), SDL.GetErrorS());
            }

            SdlRuntime.PollEvents();

            var remaining = default(SDLEvent);
            Assert.Equal(0, SDL.PeepEvents(
                ref remaining,
                1,
                SDLEventAction.Peekevent,
                eventType,
                eventType));
        }
        finally
        {
            SDL.QuitSubSystem(events);
        }
    }

    [Fact]
    public void NativePenButtonEventsRouteToTheOwningHost()
    {
        using var host = CreateHost("pen-button-route", false);
        var observed = new List<(bool Pressed, long Id, SdlHostPointerDevice Device,
            float X, float Y, SdlHostPointerButton Button, SdlHostPointerButtons Buttons)>();
        host.PointerPressed += (id, device, x, y, button, buttons, _, _) =>
            observed.Add((true, id, device, x, y, button, buttons));
        host.PointerReleased += (id, device, x, y, button, buttons, _, _) =>
            observed.Add((false, id, device, x, y, button, buttons));
        var windowId = GetCurrentWindowId();
        var down = new SDLEvent
        {
            Type = (uint)SDLEventType.PenButtonDown,
            Pbutton = new SDLPenButtonEvent
            {
                Type = SDLEventType.PenButtonDown,
                WindowID = windowId,
                Which = 73,
                PenState = (uint)(SDLPenInputFlags.Down | SDLPenInputFlags.Button1),
                X = 41.5F,
                Y = 19.25F,
                Button = 1,
            },
        };
        var up = new SDLEvent
        {
            Type = (uint)SDLEventType.PenButtonUp,
            Pbutton = new SDLPenButtonEvent
            {
                Type = SDLEventType.PenButtonUp,
                WindowID = windowId,
                Which = 73,
                PenState = (uint)SDLPenInputFlags.Down,
                X = 41.5F,
                Y = 19.25F,
                Button = 1,
            },
        };
        Assert.True(SDL.PushEvent(ref down), SDL.GetErrorS());
        Assert.True(SDL.PushEvent(ref up), SDL.GetErrorS());

        SdlRuntime.PollEvents();

        Assert.Equal(2, observed.Count);
        Assert.Equal((true, 73L, SdlHostPointerDevice.Pen, 41.5F, 19.25F,
            SdlHostPointerButton.Secondary,
            SdlHostPointerButtons.Primary | SdlHostPointerButtons.Secondary), observed[0]);
        Assert.Equal((false, 73L, SdlHostPointerDevice.Pen, 41.5F, 19.25F,
            SdlHostPointerButton.Secondary, SdlHostPointerButtons.Primary), observed[1]);
    }

    [Fact]
    public void NativePenPressureStaysPerPenAndClearsOnProximityOut()
    {
        using var host = CreateHost("pen-pressure-route", false);
        var observed = new List<(long Id, float Pressure)>();
        host.PointerMoved += (id, device, _, _, _, pressure, _) =>
        {
            if (device == SdlHostPointerDevice.Pen)
                observed.Add((id, pressure));
        };
        var windowId = GetCurrentWindowId();
        var axisOne = new SDLEvent
        {
            Type = (uint)SDLEventType.PenAxis,
            Paxis = new SDLPenAxisEvent
            {
                Type = SDLEventType.PenAxis,
                WindowID = windowId,
                Which = 11,
                Axis = SDLPenAxis.Pressure,
                Value = 0.25F,
            },
        };
        var axisTwo = new SDLEvent
        {
            Type = (uint)SDLEventType.PenAxis,
            Paxis = new SDLPenAxisEvent
            {
                Type = SDLEventType.PenAxis,
                WindowID = windowId,
                Which = 22,
                Axis = SDLPenAxis.Pressure,
                Value = 0.75F,
            },
        };
        var moveOne = PenMove(windowId, 11);
        var moveTwo = PenMove(windowId, 22);
        var outOne = new SDLEvent
        {
            Type = (uint)SDLEventType.PenProximityOut,
            Pproximity = new SDLPenProximityEvent
            {
                Type = SDLEventType.PenProximityOut,
                WindowID = windowId,
                Which = 11,
            },
        };
        Assert.True(SDL.PushEvent(ref axisOne), SDL.GetErrorS());
        Assert.True(SDL.PushEvent(ref axisTwo), SDL.GetErrorS());
        Assert.True(SDL.PushEvent(ref moveOne), SDL.GetErrorS());
        Assert.True(SDL.PushEvent(ref moveTwo), SDL.GetErrorS());
        Assert.True(SDL.PushEvent(ref outOne), SDL.GetErrorS());
        Assert.True(SDL.PushEvent(ref moveOne), SDL.GetErrorS());
        Assert.True(SDL.PushEvent(ref moveTwo), SDL.GetErrorS());

        SdlRuntime.PollEvents();

        Assert.Equal(new[]
        {
            (11L, 0.25F),
            (22L, 0.75F),
            (11L, 0F),
            (22L, 0.75F),
        }, observed);
    }

    [Fact]
    public void NativeTouchPressureReachesDownMoveAndUp()
    {
        using var host = CreateHost("touch-pressure-route", false);
        var observed = new List<float>();
        host.PointerPressed += (_, device, _, _, _, _, pressure, _) =>
        {
            if (device == SdlHostPointerDevice.Touch)
                observed.Add(pressure);
        };
        host.PointerMoved += (_, device, _, _, _, pressure, _) =>
        {
            if (device == SdlHostPointerDevice.Touch)
                observed.Add(pressure);
        };
        host.PointerReleased += (_, device, _, _, _, _, pressure, _) =>
        {
            if (device == SdlHostPointerDevice.Touch)
                observed.Add(pressure);
        };
        var windowId = GetCurrentWindowId();
        var down = TouchEvent(SDLEventType.FingerDown, windowId, 0.2F);
        var move = TouchEvent(SDLEventType.FingerMotion, windowId, 0.4F);
        var up = TouchEvent(SDLEventType.FingerUp, windowId, 0.6F);
        Assert.True(SDL.PushEvent(ref down), SDL.GetErrorS());
        Assert.True(SDL.PushEvent(ref move), SDL.GetErrorS());
        Assert.True(SDL.PushEvent(ref up), SDL.GetErrorS());

        SdlRuntime.PollEvents();

        Assert.Equal(new[] { 0.2F, 0.4F, 0.6F }, observed);
    }

    [Fact]
    public void ReleaseKeepsConsumerEventSubsystem()
    {
        var events = (uint)SDLInitFlags.Events;
        Assert.True(SDL.InitSubSystem(events), SDL.GetErrorS());
        try
        {
            using (CreateHost("shared-events", false))
            {
            }

            Assert.Equal(events, SDL.WasInit(events));
        }
        finally
        {
            SDL.QuitSubSystem(events);
        }
    }

    [Fact]
    public void SetVSyncTargetsOwningContext()
    {
        using var first = CreateHost("vsync-first", false);
        using var second = CreateHost("vsync-second", true);

        first.MakeCurrent();
        var firstWindowId = GetCurrentWindowId();
        second.MakeCurrent();
        var secondWindowId = GetCurrentWindowId();
        Assert.NotEqual(firstWindowId, secondWindowId);

        first.SetVSync(true);
        Assert.Equal(firstWindowId, GetCurrentWindowId());
        Assert.Equal(1, GetCurrentSwapInterval());

        second.MakeCurrent();
        first.SetVSync(false);
        Assert.Equal(firstWindowId, GetCurrentWindowId());
        Assert.Equal(0, GetCurrentSwapInterval());
    }

    [Fact]
    public void HostReportsGlConfiguration()
    {
        using var host = CreateHost("gl-configuration", false);
        var configuration = host.GlConfiguration;
        var isWayland = SDL.GetCurrentVideoDriverS() == "wayland";
        var sdlAccelerated = 0;
        Assert.True(
            SDL.GLGetAttribute(SDLGLAttr.AcceleratedVisual, ref sdlAccelerated),
            SDL.GetErrorS());

        Assert.True(
            configuration.ContextMajorVersion > 3 ||
            configuration.ContextMajorVersion == 3 && configuration.ContextMinorVersion >= 3);
        Assert.NotEqual(0, configuration.ContextProfileMask & 0x00000001);
        Assert.Equal(8, configuration.RedBits);
        Assert.Equal(8, configuration.GreenBits);
        Assert.Equal(8, configuration.BlueBits);
        Assert.Equal(8, configuration.AlphaBits);
        Assert.True(configuration.DoubleBuffered);
        Assert.True(configuration.Accelerated);
        Assert.Equal(sdlAccelerated != 0, configuration.SdlAccelerated);
        Assert.Equal(0, configuration.SampleBuffers);
        Assert.Equal(0, configuration.Samples);
        Assert.True(configuration.StencilBits >= 8);
        Assert.True(configuration.SdlSrgbCapable);
        Assert.Equal(0x8C43u, configuration.FramebufferFormat);
        if (isWayland)
        {
            Assert.True(configuration.FramebufferColorEncoding is 0x2601 or 0x8C40);
            Assert.Equal(0x3084, configuration.EglRenderBuffer);
            Assert.Equal(0x3089, configuration.EglColorSpace);
            Assert.Equal(0x3038, configuration.EglConfigCaveat);
            Assert.Equal(
                configuration.EglConfigCaveat == 0x3038,
                configuration.Accelerated);
        }
        else
        {
            Assert.Equal(0x8C40, configuration.FramebufferColorEncoding);
            Assert.Equal(configuration.SdlAccelerated, configuration.Accelerated);
        }
    }

    [Fact]
    public void CustomChromeControlsNativeHitTesting()
    {
        using var host = CreateHost("hit-test", false, false);

        Assert.Equal(
            SDLWindowFlags.Borderless,
            GetCurrentWindowFlags() & SDLWindowFlags.Borderless);
        Assert.False(host.NativeResizable);

        host.SetBorder(true, false);
        Assert.Equal(
            (SDLWindowFlags)0,
            GetCurrentWindowFlags() & SDLWindowFlags.Borderless);
        Assert.False(host.NativeResizable);

        host.SetBorder(false, true);
        Assert.Equal(
            SDLWindowFlags.Borderless,
            GetCurrentWindowFlags() & SDLWindowFlags.Borderless);
        Assert.True(host.NativeResizable);
    }

    [Fact]
    public void CursorAdapterCoversPublicShapes()
    {
        var expected = new[]
        {
            SDLSystemCursor.Default,
            SDLSystemCursor.Pointer,
            SDLSystemCursor.Text,
            SDLSystemCursor.Crosshair,
            SDLSystemCursor.Move,
            SDLSystemCursor.NotAllowed,
            SDLSystemCursor.Wait,
            SDLSystemCursor.Progress,
            SDLSystemCursor.EwResize,
            SDLSystemCursor.NsResize,
            SDLSystemCursor.NwseResize,
            SDLSystemCursor.NeswResize,
            SDLSystemCursor.NwResize,
            SDLSystemCursor.NResize,
            SDLSystemCursor.NeResize,
            SDLSystemCursor.EResize,
            SDLSystemCursor.SeResize,
            SDLSystemCursor.SResize,
            SDLSystemCursor.SwResize,
            SDLSystemCursor.WResize,
        };
        var values = Enum.GetValues<SdlHostCursor>();

        Assert.Equal(expected.Length, values.Length);
        for (var i = 0; i < values.Length; i++)
        {
            Assert.Equal(expected[i], SdlRuntime.MapSystemCursor(values[i]));
        }
        Assert.Throws<ArgumentOutOfRangeException>(
            () => SdlRuntime.MapSystemCursor((SdlHostCursor)(-1)));
    }

    [Fact]
    public void HitTestCallbackMapsResults()
    {
        var result = SdlHost.EvaluateHitTest((_, _) => SdlHitResult.Draggable, 12, 24);

        Assert.Equal(SDLHitTestResult.Draggable, result);
    }

    [Fact]
    public void HitTestExceptionsFallBackToNormal()
    {
        var result = SdlHost.EvaluateHitTest(
            (_, _) => throw new InvalidOperationException("hit-test failure"),
            12,
            24);

        Assert.Equal(SDLHitTestResult.Normal, result);
    }

    [Fact]
    public void TransparencyIsOptIn()
    {
        var opaque = SdlHost.BuildWindowFlags(false);
        var transparent = SdlHost.BuildWindowFlags(true);

        Assert.Equal(opaque | SDLWindowFlags.Transparent, transparent);
        Assert.Equal((SDLWindowFlags)0, opaque & SDLWindowFlags.Transparent);
    }

    private static SdlHost CreateHost(string title, bool vsync, bool decorated = true)
    {
        return new SdlHost(
            title,
            160,
            120,
            0,
            0,
            false,
            SdlHostState.Normal,
            decorated,
            false,
            false,
            vsync,
            (_, _) => SdlHitResult.Normal);
    }

    private static SDLEvent PenMove(uint windowId, uint which)
    {
        return new SDLEvent
        {
            Type = (uint)SDLEventType.PenMotion,
            Pmotion = new SDLPenMotionEvent
            {
                Type = SDLEventType.PenMotion,
                WindowID = windowId,
                Which = which,
                X = 20F,
                Y = 30F,
            },
        };
    }

    private static SDLEvent TouchEvent(SDLEventType type, uint windowId, float pressure)
    {
        return new SDLEvent
        {
            Type = (uint)type,
            Tfinger = new SDLTouchFingerEvent
            {
                Type = type,
                WindowID = windowId,
                TouchID = 31,
                FingerID = 47,
                X = 0.25F,
                Y = 0.5F,
                Pressure = pressure,
            },
        };
    }

    private static int GetCurrentSwapInterval()
    {
        var interval = 0;
        Assert.True(SDL.GLGetSwapInterval(ref interval), SDL.GetErrorS());
        return interval;
    }

    private static uint GetCurrentWindowId()
    {
        var window = SDL.GLGetCurrentWindow();
        Assert.False(window.IsNull);
        var windowId = SDL.GetWindowID(window);
        Assert.NotEqual(0u, windowId);
        return windowId;
    }

    private static SDLWindowFlags GetCurrentWindowFlags()
    {
        var window = SDL.GLGetCurrentWindow();
        Assert.False(window.IsNull);
        return (SDLWindowFlags)SDL.GetWindowFlags(window);
    }
}
