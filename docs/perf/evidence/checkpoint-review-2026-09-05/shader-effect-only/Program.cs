using System.Collections;
using System.Numerics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text.Json;
using Goo;
using Hexa.NET.SDL3;

sealed class EffectOnlyCell : Cell
{
    internal readonly ShaderEffect Liquid;
    internal readonly ShaderEffect Terminal;
    internal bool TerminalMode;
    internal EffectOnlyCell(ShaderEffect liquid, ShaderEffect terminal) { Liquid = liquid; Terminal = terminal; }
    public override Blob Build() => new Container
    {
        Width = 640.0,
        Height = 480.0,
        Children =
        {
            new Container { Key = "toggle", Width = 240.0, Height = 100.0, HitTestSelf = true,
                OnClick = () => { TerminalMode = true; Rebuild(); } },
            new Container { Key = "effect", Width = 480.0, Height = 300.0,
                ShaderEffect = TerminalMode ? Terminal : Liquid },
        },
    };
}

static class Proof
{
    const BindingFlags Hidden = BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public;
    [DllImport("SDL3", EntryPoint = "SDL_GetWindows", CallingConvention = CallingConvention.Cdecl)]
    static extern unsafe nint* GetWindows(int* count);
    [DllImport("SDL3", EntryPoint = "SDL_GetWindowID", CallingConvention = CallingConvention.Cdecl)]
    static extern uint GetWindowId(nint window);
    [DllImport("SDL3", EntryPoint = "SDL_free", CallingConvention = CallingConvention.Cdecl)]
    static extern void Free(nint value);
    static object? Value(object target, string name)
    {
        var property = target.GetType().GetProperty(name, Hidden);
        if (property != null) return property.GetValue(target);
        var field = target.GetType().GetField(name, Hidden);
        if (field != null) return field.GetValue(target);
        throw new MissingMemberException(target.GetType().FullName, name);
    }
    static IEnumerable<object> Nodes(object node)
    {
        yield return node;
        foreach (var child in (IEnumerable)Value(node, "Children")!)
            foreach (var nested in Nodes(child!)) yield return nested;
    }
    static object NodeByKey(Window window, string key)
    {
        var root = Value(window, "Tree")!;
        return Nodes(root).Single(node => (string?)node.GetType().GetProperty("Key", Hidden)!.GetValue(node) == key);
    }
    static (float X, float Y, float Width, float Height) Rect(object node)
    {
        var rect = Value(node, "Rect")!;
        return ((float)Value(rect, "X")!, (float)Value(rect, "Y")!,
            (float)Value(rect, "W")!, (float)Value(rect, "H")!);
    }
    static void Pump(Window window, int count)
    {
        for (var index = 0; index < count; index++) window.Pump(1.0 / 60.0);
    }
    static unsafe uint SdlWindowId()
    {
        var count = 0;
        var windows = GetWindows(&count);
        if (windows == null || count != 1) throw new InvalidOperationException($"Expected one SDL window, found {count}");
        var result = GetWindowId(windows[0]);
        Free((nint)windows);
        return result;
    }
    static unsafe void Click(uint windowId, float x, float y)
    {
        var down = new SDLEvent { Type = (uint)SDLEventType.MouseButtonDown,
            Button = new SDLMouseButtonEvent { Type = SDLEventType.MouseButtonDown, WindowID = windowId,
                Button = (byte)SDL.SDL_BUTTON_LEFT, Down = 1, Clicks = 1, X = x, Y = y } };
        var up = down;
        up.Type = (uint)SDLEventType.MouseButtonUp;
        up.Button.Type = SDLEventType.MouseButtonUp;
        up.Button.Down = 0;
        if (!SDL.PushEvent(&down) || !SDL.PushEvent(&up)) throw new InvalidOperationException("SDL click failed");
    }
    public static int Main()
    {
        Window.ConfigureApplication("Shader Switch Proof", "1.0.0", "io.github.obselate.goo.shader-switch-proof");
        var runtime = "/tmp/goo-glass-aa/runtime";
        var liquidProgram = ShaderEffectProgram.Load(Path.Combine(runtime, "Shaders", "liquid_glass.goo-effect"));
        var terminalProgram = ShaderEffectProgram.Load(Path.Combine(runtime, "Shaders", "terminal_glass.goo-effect"));
        var liquid = new ShaderEffect(liquidProgram, true, 24.0f);
        var terminal = new ShaderEffect(terminalProgram, true, 24.0f);
        liquid.SetParameter(4, new Vector4(1, 1, 0, 1));
        terminal.SetParameter(4, new Vector4(1, 1, 0, 1));
        var cell = new EffectOnlyCell(liquid, terminal);
        var window = new Window { Title = "Shader Switch Proof", Width = 640, Height = 480, Root = cell };
        window.Open();
        Pump(window, 10);
        var effectNode = NodeByKey(window, "effect");
        var before = (ShaderEffect?)Value(effectNode, "ShaderEffect");
        var button = Rect(NodeByKey(window, "toggle"));
        Click(SdlWindowId(), button.X + button.Width / 2, button.Y + button.Height / 2);
        Pump(window, 5);
        var after = (ShaderEffect?)Value(effectNode, "ShaderEffect");
        var stale = ReferenceEquals(before, after);
        var result = new { marker = stale ? "fail-before:mounted-effect-unchanged" : "mounted-effect-changed",
            privateModeTerminal = cell.TerminalMode, beforeIsLiquid = ReferenceEquals(before, liquid),
            afterIsLiquid = ReferenceEquals(after, liquid), afterIsTerminal = ReferenceEquals(after, terminal) };
        File.WriteAllText("/tmp/goo-checkpoint-audit/shader-switch-proof/isolated/result.json",
            JsonSerializer.Serialize(result, new JsonSerializerOptions { WriteIndented = true }) + "\n");
        Console.WriteLine(JsonSerializer.Serialize(result));
        window.RequestClose();
        Pump(window, 30);
        if (window.IsOpen) throw new InvalidOperationException("Window did not close");
        return stale && cell.TerminalMode && ReferenceEquals(before, liquid) ? 3 : 1;
    }
}
