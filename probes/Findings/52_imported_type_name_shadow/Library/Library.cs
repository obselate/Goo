namespace FindingTypeShadowLibrary;

public class Box
{
    public int Width { get; init; }
}

public sealed class Overlay : Box
{
    public bool IsOpen { get; init; }
}
