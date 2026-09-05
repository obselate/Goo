using System.Collections;
using System.Numerics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using Goo;
using GooGallery;
using Hexa.NET.SDL3;

static class InputQa
{
    const BindingFlags Hidden = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;

    [DllImport("SDL3", EntryPoint = "SDL_GetWindows", CallingConvention = CallingConvention.Cdecl)]
    static extern unsafe nint* GetWindows(int* count);

    [DllImport("SDL3", EntryPoint = "SDL_GetWindowID", CallingConvention = CallingConvention.Cdecl)]
    static extern uint GetWindowId(nint window);

    [DllImport("SDL3", EntryPoint = "SDL_free", CallingConvention = CallingConvention.Cdecl)]
    static extern void Free(nint value);

    static object Value(object target, string name) =>
        target.GetType().GetProperty(name, Hidden)?.GetValue(target)
        ?? target.GetType().GetField(name, Hidden)?.GetValue(target)
        ?? throw new MissingMemberException(target.GetType().FullName, name);

    static T Field<T>(object target, string name) =>
        (T)(target.GetType().GetField(name, Hidden)?.GetValue(target)
        ?? throw new MissingFieldException(target.GetType().FullName, name));

    static IEnumerable<object> Nodes(object node)
    {
        yield return node;
        foreach (var child in (IEnumerable)Value(node, "Children"))
            foreach (var nested in Nodes(child!))
                yield return nested;
    }

    static object NodeByKey(Window window, string key)
    {
        var root = Value(window, "Tree");
        return Nodes(root).Single(node =>
            (string?)node.GetType().GetProperty("Key", Hidden)!.GetValue(node) == key);
    }

    static object PointerSurface(Window window)
    {
        var root = Value(window, "Tree");
        return Nodes(root).Single(node =>
            node.GetType().GetProperty("OnPointerMove", Hidden)?.GetValue(node) != null);
    }

    static object Panel(Window window)
    {
        var root = Value(window, "Tree");
        return Nodes(root).Select(node =>
            node.GetType().GetProperty("Fiber", Hidden)?.GetValue(node))
            .Single(value => value?.GetType().Name == "GlassMaterialPanelCell")!;
    }

    static (float X, float Y, float Width, float Height) Rect(object node)
    {
        var rect = Value(node, "Rect");
        return ((float)Value(rect, "X"), (float)Value(rect, "Y"),
                (float)Value(rect, "W"), (float)Value(rect, "H"));
    }

    static Vector4 Parameter(object effect, int slot) =>
        Field<Vector4[]>(effect, "parameters")[slot];

    static ulong Version(object effect) => Field<ulong>(effect, "version");

    static void Pump(Window window, int count)
    {
        for (var index = 0; index < count; index++)
            window.Pump(1.0 / 60.0);
    }

    static unsafe uint SdlWindowId()
    {
        var count = 0;
        var windows = GetWindows(&count);
        if (windows == null || count != 1)
        {
            if (windows != null) Free((nint)windows);
            throw new InvalidOperationException($"Expected one SDL window, found {count}");
        }
        var result = GetWindowId(windows[0]);
        Free((nint)windows);
        return result;
    }

    static unsafe void Move(uint windowId, float x, float y)
    {
        var motion = new SDLEvent
        {
            Type = (uint)SDLEventType.MouseMotion,
            Motion = new SDLMouseMotionEvent
            {
                Type = SDLEventType.MouseMotion,
                WindowID = windowId,
                Which = 0,
                State = 0,
                X = x,
                Y = y,
            },
        };
        if (!SDL.PushEvent(&motion))
            throw new InvalidOperationException("SDL mouse motion injection failed");
    }

    static unsafe void Click(uint windowId, float x, float y)
    {
        var down = new SDLEvent
        {
            Type = (uint)SDLEventType.MouseButtonDown,
            Button = new SDLMouseButtonEvent
            {
                Type = SDLEventType.MouseButtonDown,
                WindowID = windowId,
                Which = 0,
                Button = (byte)SDL.SDL_BUTTON_LEFT,
                Down = 1,
                Clicks = 1,
                X = x,
                Y = y,
            },
        };
        var up = down;
        up.Type = (uint)SDLEventType.MouseButtonUp;
        up.Button.Type = SDLEventType.MouseButtonUp;
        up.Button.Down = 0;
        if (!SDL.PushEvent(&down) || !SDL.PushEvent(&up))
            throw new InvalidOperationException("SDL mouse click injection failed");
    }

    static void MoveWithin(Window window, uint windowId, double x, double y)
    {
        var surface = Rect(PointerSurface(window));
        Move(windowId, surface.X + surface.Width * (float)x,
             surface.Y + surface.Height * (float)y);
        Pump(window, 4);
    }

    static void ClickKey(Window window, uint windowId, string key)
    {
        var rect = Rect(NodeByKey(window, key));
        Click(windowId, rect.X + rect.Width * 0.5f, rect.Y + rect.Height * 0.5f);
        Pump(window, 4);
    }

    static void Require(bool condition, string message)
    {
        if (!condition) throw new InvalidOperationException(message);
    }

    static void Checkpoint(Window window, string stage, object proof)
    {
        var root = "/tmp/goo-glass-refinement/input-qa/checkpoints";
        Directory.CreateDirectory(root);
        File.WriteAllText(Path.Combine(root, stage + ".json"),
            JsonSerializer.Serialize(proof, new JsonSerializerOptions { WriteIndented = true }) + "\n");
        if (Environment.GetEnvironmentVariable("GOO_INPUT_QA_CHECKPOINTS") != "1") return;
        var release = Path.Combine(root, "continue-" + stage);
        var deadline = DateTime.UtcNow.AddSeconds(60);
        while (!File.Exists(release) && DateTime.UtcNow < deadline)
        {
            window.Pump(1.0 / 60.0);
            Thread.Sleep(8);
        }
        if (!File.Exists(release)) throw new TimeoutException("Checkpoint was not released: " + stage);
    }

    public static int Main()
    {
        Window.ConfigureApplication("Glass Input QA", "1.0.0", "io.github.obselate.goo.glass-input-qa");
        var runtime = "/tmp/goo-glass-refinement/runtime";
        using var regular = new FontSource("Space Grotesk", 400, false,
            File.ReadAllBytes(Path.Combine(runtime, "SpaceGrotesk-Variable.ttf")));
        using var bold = new FontSource("Space Grotesk", 700, false,
            File.ReadAllBytes(Path.Combine(runtime, "SpaceGrotesk-Variable.ttf")));
        regular.Register();
        bold.Register();
        Environment.SetEnvironmentVariable("GOO_GLASS_MATERIAL", "liquid");
        var window = GlassMaterialWindow.CreateWindow();
        try
        {
            window.Open();
            Pump(window, 10);
            var windowId = SdlWindowId();
            var panel = Panel(window);
            var liquid = Field<ShaderEffect>(panel, "liquidEffect");
            var terminal = Field<ShaderEffect>(panel, "terminalEffect");
            Require(!Field<bool>(panel, "terminalMode"), "Initial material is not liquid");
            var liquidVersion = Version(liquid);
            MoveWithin(window, windowId, 0.78, 0.30);
            var liquidPointer = Parameter(liquid, 1);
            Require(Math.Abs(liquidPointer.X - 0.78f) < 0.02f &&
                    Math.Abs(liquidPointer.Y - 0.30f) < 0.02f,
                    "Liquid pointer parameter did not follow native SDL motion");
            Require(Version(liquid) > liquidVersion, "Liquid effect version did not advance");
            Checkpoint(window, "liquid-pointer", new { mode = "liquid", pointer = liquidPointer,
                pointerXY = new { x = liquidPointer.X, y = liquidPointer.Y },
                effectVersion = Version(liquid), size = new { window.Width, window.Height } });
            ClickKey(window, windowId, "terminal-glass");
            Require(Field<bool>(panel, "terminalMode"), "Terminal button did not switch mode");
            var terminalVersion = Version(terminal);
            MoveWithin(window, windowId, 0.22, 0.72);
            var terminalPointer = Parameter(terminal, 1);
            Require(Math.Abs(terminalPointer.X - 0.22f) < 0.02f &&
                    Math.Abs(terminalPointer.Y - 0.72f) < 0.02f,
                    "Terminal pointer parameter did not follow native SDL motion");
            Require(Version(terminal) > terminalVersion, "Terminal effect version did not advance");
            Checkpoint(window, "terminal-pointer", new { mode = "terminal", pointer = terminalPointer,
                pointerXY = new { x = terminalPointer.X, y = terminalPointer.Y },
                effectVersion = Version(terminal), size = new { window.Width, window.Height } });
            ClickKey(window, windowId, "liquid-glass");
            Require(!Field<bool>(panel, "terminalMode"), "Liquid button did not switch mode");
            window.Width = 640;
            window.Height = 640;
            Pump(window, 12);
            var smallSurface = Rect(PointerSurface(window));
            Require(smallSurface.X >= 0 && smallSurface.Y >= 0 &&
                    smallSurface.X + smallSurface.Width <= 640.5f &&
                    smallSurface.Y + smallSurface.Height <= 640.5f,
                    "Material surface exceeds 640x640 viewport");
            Checkpoint(window, "liquid-small", new { mode = "liquid", surface = smallSurface,
                surfaceRect = new { x = smallSurface.X, y = smallSurface.Y,
                    width = smallSurface.Width, height = smallSurface.Height },
                size = new { window.Width, window.Height } });
            window.RequestClose();
            Pump(window, 30);
            Require(!window.IsOpen, "Window did not close after native input QA");
            var result = new
            {
                status = "pass",
                nativeSdlClicks = 2,
                nativeSdlMoves = 2,
                liquidPointer = new { x = liquidPointer.X, y = liquidPointer.Y },
                terminalPointer = new { x = terminalPointer.X, y = terminalPointer.Y },
                smallSurface = new { x = smallSurface.X, y = smallSurface.Y,
                    width = smallSurface.Width, height = smallSurface.Height },
                close = true,
            };
            File.WriteAllText("/tmp/goo-glass-refinement/input-qa/result.json",
                JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }) + "\n");
            Console.WriteLine("glass-input-qa: pass clicks=2 moves=2 resize=640x640 close=1");
            return 0;
        }
        finally
        {
            if (window.IsOpen) window.RequestClose();
        }
    }
}
