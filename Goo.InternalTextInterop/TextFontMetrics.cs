namespace Goo.InternalTextInterop;

internal sealed class TextFontMetrics
{
    public TextFontMetrics(float ascent, float descent)
    {
        Ascent = ascent;
        Descent = descent;
    }

    public float Ascent { get; }
    public float Descent { get; }
}
