using System.Threading;
using SkiaSharp;

namespace Goo.InternalTextInterop;

internal sealed class ShapedText : IDisposable
{
    private readonly List<ShapedRun> runs;
    private readonly string text;
    private TextGeometry? geometry;
    private bool disposed;

    public ShapedText(string text, List<ShapedRun> runs, float width, float ascent, float descent,
        bool rightToLeft)
    {
        this.runs = runs;
        this.text = text;
        Width = width;
        Ascent = ascent;
        Descent = descent;
        RightToLeft = rightToLeft;
        HasRightToLeftRun = runs.Any(static run => run.RightToLeft);
        var inkTop = 0f;
        var inkBottom = 0f;
        foreach (var run in runs)
        {
            if (run.Blob is not { } blob)
                continue;
            var bounds = blob.Bounds;
            if (bounds.Top < inkTop)
                inkTop = bounds.Top;
            if (bounds.Bottom > inkBottom)
                inkBottom = bounds.Bottom;
        }
        InkTop = inkTop;
        InkBottom = inkBottom;
    }

    public float Width { get; }
    public float Ascent { get; }
    public float Descent { get; }
    public bool RightToLeft { get; }
    public bool HasRightToLeftRun { get; }
    /// Gets the conservative top ink extent relative to the baseline.
    internal float InkTop { get; }
    /// Gets the conservative bottom ink extent relative to the baseline.
    internal float InkBottom { get; }
    internal string[] Families => runs.Select(static run => run.Typeface.FamilyName).ToArray();
    internal string[] Texts => runs.Select(static run => run.Text).ToArray();
    internal bool HasMissingGlyph => runs.Any(static run => run.Glyphs.Contains((ushort)0));
    internal bool IsDisposedForTests => disposed;
    internal int GlyphCount => runs.Sum(static run => run.Glyphs.Length);

    public ShapedText Slice(int start, int end)
    {
        start = Math.Clamp(start, 0, text.Length);
        end = Math.Clamp(end, start, text.Length);
        var selected = new List<ShapedRun>();
        foreach (var run in runs)
        {
            var slice = run.Slice(start, end);
            if (slice is not null)
                selected.Add(slice);
        }
        return new ShapedText(text, selected, Width, Ascent, Descent, RightToLeft);
    }

    public float CaretX(int index, int affinity) => Geometry().CaretX(index, affinity);
    public TextHit HitTest(float x) => Geometry().HitTest(x);
    public void PrepareGeometry() => _ = Geometry();
    public TextHit MoveCaret(int index, int affinity, int delta) => Geometry().Move(index, affinity, delta);
    public TextHit LineEdge(bool end) => Geometry().LineEdge(end);
    public TextHit Collapse(int index, int affinity, int anchorIndex, int anchorAffinity, int delta) =>
        Geometry().Collapse(index, affinity, anchorIndex, anchorAffinity, delta);
    public float[] SelectionRects(int start, int end) => Geometry().SelectionRects(start, end);

    public int SelectionRectCount(int start, int end) => Geometry().SelectionRectCount(start, end);

    public int CopySelectionRects(int start, int end, int rectOffset, Span<float> destination) =>
        Geometry().CopySelectionRects(start, end, rectOffset, destination);

    internal void Paint(SKCanvas canvas, SKPaint paint, float x, float y)
    {
        foreach (var run in runs)
        {
            if (run.Blob is not { } blob)
                continue;
            canvas.DrawText(blob, x, y, paint);
        }
    }

    public void Dispose()
    {
        if (disposed)
            return;
        disposed = true;
        foreach (var run in runs)
            run.Dispose();
    }

    private TextGeometry Geometry()
    {
        var current = Volatile.Read(ref geometry);
        if (current is not null)
            return current;
        var built = TextGeometry.Build(text, runs, Width, RightToLeft);
        return Interlocked.CompareExchange(ref geometry, built, null) ?? built;
    }
}
