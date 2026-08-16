using SkiaSharp;

namespace Goo.InternalTextInterop;

internal sealed class ShapedRun : IDisposable
{
    public ShapedRun(string text, SKTypeface typeface, SKFont font, ushort[] glyphs, SKPoint[] points,
        uint[] clusters, int logicalStart, bool rightToLeft, float visualStart, float visualEnd,
        bool ownsTypeface, TypefaceLease? typefaceLease)
    {
        Text = text;
        Typeface = typeface;
        Font = font;
        Glyphs = glyphs;
        Points = points;
        Clusters = clusters;
        LogicalStart = logicalStart;
        RightToLeft = rightToLeft;
        VisualStart = visualStart;
        VisualEnd = visualEnd;
        OwnsTypeface = ownsTypeface;
        TypefaceLease = typefaceLease;
        if (glyphs.Length != 0)
        {
            using var builder = new SKTextBlobBuilder();
            builder.AddPositionedRun(glyphs, font, points);
            Blob = builder.Build();
        }
    }

    public string Text { get; }
    public SKTypeface Typeface { get; }
    public SKFont Font { get; }
    public ushort[] Glyphs { get; }
    public SKPoint[] Points { get; }
    public uint[] Clusters { get; }
    public int LogicalStart { get; }
    public bool RightToLeft { get; }
    public float VisualStart { get; }
    public float VisualEnd { get; }
    public SKTextBlob? Blob { get; }
    public bool OwnsTypeface { get; }
    private TypefaceLease? TypefaceLease { get; }

    internal ShapedRun? Slice(int start, int end)
    {
        var glyphs = new List<ushort>();
        var points = new List<SKPoint>();
        var clusters = new List<uint>();
        var firstGlyph = -1;
        var lastGlyph = -1;
        for (var glyph = 0; glyph < Clusters.Length;)
        {
            var cluster = Clusters[glyph];
            var next = glyph + 1;
            while (next < Clusters.Length && Clusters[next] == cluster)
                next++;
            var absoluteStart = LogicalStart + checked((int)cluster);
            if (absoluteStart >= start && absoluteStart < end)
            {
                if (firstGlyph < 0)
                    firstGlyph = glyph;
                lastGlyph = next;
                for (var i = glyph; i < next; i++)
                {
                    glyphs.Add(Glyphs[i]);
                    points.Add(Points[i]);
                    clusters.Add(Clusters[i]);
                }
            }
            glyph = next;
        }
        if (glyphs.Count == 0)
            return null;

        var lease = TypefaceLease?.Duplicate();
        var typeface = lease?.Typeface ?? TextShaping.MatchOrFromFamily(Typeface.FamilyName, Typeface.FontStyle);
        var font = TextShaping.CreateFont(typeface, Font.Size);
        var visualStart = firstGlyph == 0 ? VisualStart : Points[firstGlyph].X;
        var visualEnd = lastGlyph == Points.Length ? VisualEnd : Points[lastGlyph].X;
        return new ShapedRun(Text, typeface, font, glyphs.ToArray(), points.ToArray(),
            clusters.ToArray(), LogicalStart, RightToLeft, visualStart, visualEnd,
            lease is null, lease);
    }

    public void Dispose()
    {
        Blob?.Dispose();
        Font.Dispose();
        if (TypefaceLease is not null)
            TypefaceLease.Dispose();
        else if (OwnsTypeface)
            Typeface.Dispose();
    }
}
