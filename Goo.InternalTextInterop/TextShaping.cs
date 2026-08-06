using System.Buffers;
using System.Globalization;
using System.Text;
using HarfBuzzSharp;
using SkiaSharp;
using SkiaSharp.HarfBuzz;
using BidiInfo = Unicode.Bidi.BidiInfo;
using BidiLevel = Unicode.Bidi.Level;
using BidiRange = Unicode.Bidi.TextRange;

namespace Goo.InternalTextInterop;

internal static class TextShaping
{
    private static readonly Dictionary<(string Families, int Weight, bool Italic), TypefaceResource> PrimaryFaces = [];
    private static readonly Queue<(string Families, int Weight, bool Italic)> PrimaryFaceOrder = [];
    private static readonly object PrimaryFacesLock = new();
    private const int PrimaryFaceCacheCapacity = 64;
    private static int primaryFaceDisposals;

    internal static TextFontMetrics Metrics(string families, float size, int weight, bool italic)
    {
        using var typeface = ResolveCachedPrimary(families, weight, italic);
        using var font = CreateFont(typeface.Typeface, size);
        return new TextFontMetrics(font.Metrics.Ascent, font.Metrics.Descent);
    }

    internal static float Measure(string text, string families, float size, int weight, bool italic,
        float letterSpacing, bool rtl)
        => Measure(text, families, size, weight, italic, letterSpacing, rtl ? 2 : 1);

    internal static float Measure(string text, string families, float size, int weight, bool italic,
        float letterSpacing, int direction)
    {
        using var shaped = Shape(text, families, size, weight, italic, letterSpacing, direction);
        return shaped.Width;
    }

    internal static float MeasureLine(string paragraph, int start, int length, string families,
        float size, int weight, bool italic, float letterSpacing, int direction)
    {
        using var shaped = ShapeLine(paragraph, start, length, families, size, weight, italic,
            letterSpacing, direction);
        return shaped.Width;
    }

    internal static float MeasureLineUncached(string paragraph, int start, int length, string families,
        float size, int weight, bool italic, float letterSpacing, int direction)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(start);
        ArgumentOutOfRangeException.ThrowIfNegative(length);
        if (start > paragraph.Length - length)
            throw new ArgumentOutOfRangeException(nameof(length));
        if ((uint)direction > 2)
            throw new ArgumentOutOfRangeException(nameof(direction));

        using var shaped = ShapeUncached(paragraph, start, length, families, size, weight, italic,
            letterSpacing, direction);
        return shaped.Width;
    }

    public static float MeasureLineWithResolution(string paragraph, int start, int length,
        string families, float size, int weight, bool italic, float letterSpacing, int direction,
        BidiResolution? resolution)
    {
        using var shaped = ShapeLine(paragraph, start, length, families, size, weight, italic,
            letterSpacing, direction, resolution);
        return shaped.Width;
    }

    internal static string Ellipsize(string text, string families, float size, int weight, bool italic,
        float letterSpacing, bool rtl, float maxWidth)
        => Ellipsize(text, families, size, weight, italic, letterSpacing, rtl ? 2 : 1, maxWidth);

    internal static string Ellipsize(string text, string families, float size, int weight, bool italic,
        float letterSpacing, int direction, float maxWidth)
    {
        const string ellipsis = "\u2026";
        var baseDirection = BaseDirection(text, direction);
        var elements = StringInfo.ParseCombiningCharacters(text);
        if (elements.Length == 0)
            return ellipsis;
        if (MeasureUncached(ellipsis, families, size, weight, italic, letterSpacing, baseDirection) > maxWidth)
            return ellipsis;

        var low = 0;
        var high = elements.Length;
        while (low < high)
        {
            var middle = low + (high - low + 1) / 2;
            var end = middle < elements.Length ? elements[middle] : text.Length;
            var candidate = text[..end] + ellipsis;
            if (MeasureUncached(candidate, families, size, weight, italic, letterSpacing, baseDirection) <= maxWidth)
                low = middle;
            else
                high = middle - 1;
        }
        var fitEnd = low < elements.Length ? elements[low] : text.Length;
        return text[..fitEnd] + ellipsis;
    }

    internal static ShapedText Shape(string text, string families, float size, int weight, bool italic,
        float letterSpacing, bool rtl)
        => Shape(text, families, size, weight, italic, letterSpacing, rtl ? 2 : 1);

    internal static ShapedText Shape(string text, string families, float size, int weight, bool italic,
        float letterSpacing, int direction)
        => ShapeLine(text, 0, text.Length, families, size, weight, italic, letterSpacing, direction);

    internal static ShapedText ShapeLine(string paragraph, int start, int length, string families,
        float size, int weight, bool italic, float letterSpacing, int direction)
        => ShapeLine(paragraph, start, length, families, size, weight, italic, letterSpacing,
            direction, null);

    internal static ShapedText ShapeLine(string paragraph, int start, int length, string families,
        float size, int weight, bool italic, float letterSpacing, int direction,
        BidiResolution? resolution)
    {
        ArgumentOutOfRangeException.ThrowIfNegative(start);
        ArgumentOutOfRangeException.ThrowIfNegative(length);
        if (start > paragraph.Length - length)
            throw new ArgumentOutOfRangeException(nameof(length));
        if ((uint)direction > 2)
            throw new ArgumentOutOfRangeException(nameof(direction));

        return ShapeUncached(paragraph, start, length, families, size, weight, italic,
            letterSpacing, direction, resolution);
    }

    /// Resolves paragraph bidi state for reuse by per-line shaping.
    internal static BidiResolution ResolveParagraph(string text, int direction)
        => ResolveBidi(text, direction);

    private static ShapedText ShapeUncached(string paragraph, int lineStart, int lineLength,
        string families, float size, int weight, bool italic, float letterSpacing, int direction,
        BidiResolution? paragraphResolution = null)
    {
        var text = paragraph.Substring(lineStart, lineLength);
        using var style = Style(weight, italic);
        using var primary = ResolveCachedPrimary(families, weight, italic);
        using var primaryFont = CreateFont(primary.Typeface, size);
        var metrics = primaryFont.Metrics;
        var ascent = metrics.Ascent;
        var descent = metrics.Descent;

        var runs = new List<ShapedRun>();
        var cursor = 0f;
        var extra = 0f;
        var hasCluster = false;
        var rightToLeft = direction == 2;

        if (lineLength == 0)
            return new ShapedText(text, runs, 0f, ascent, descent, rightToLeft);

        var resolution = paragraphResolution ?? ResolveBidi(paragraph, direction);
        if (resolution.Info is null)
        {
            AppendDirectionalRange(paragraph, lineStart, lineLength, lineStart, false, families,
                style, size, letterSpacing, runs, ref cursor, ref extra, ref hasCluster,
                primary, primaryFont);
            return new ShapedText(text, runs, cursor + extra, ascent, descent, false);
        }

        var bidi = resolution.Info;
        var lineEnd = lineStart + lineLength;
        var paragraphInfo = bidi.Paragraphs.First(info =>
            lineStart >= info.Range.Start && lineEnd <= info.Range.End);
        rightToLeft = paragraphInfo.Level.IsRtl();
        var (_, visualRuns) = bidi.VisualRuns(paragraphInfo, new BidiRange(lineStart, lineEnd));
        foreach (var visualRun in visualRuns)
        {
            AppendDirectionalRange(paragraph, visualRun.Start, visualRun.Length, lineStart,
                bidi.Levels[visualRun.Start].IsRtl(), families, style, size, letterSpacing, runs,
                ref cursor, ref extra, ref hasCluster, primary, primaryFont);
        }
        return new ShapedText(text, runs, cursor + extra, ascent, descent, rightToLeft);
    }

    internal static int BaseDirection(string text, int direction)
    {
        if (direction == 1 || direction == 2)
            return direction;
        return ResolveBidi(text, direction).RightToLeft ? 2 : 1;
    }

    internal static void Paint(ShapedText shaped, SKCanvas canvas, SKPaint paint, float x, float y)
    {
        shaped.Paint(canvas, paint, x, y);
    }

    public static ShapedText Slice(ShapedText shaped, int start, int end) => shaped.Slice(start, end);

    internal static bool HasFamily(string family) => SKFontManager.Default.FontFamilies
        .Any(x => string.Equals(x, family, StringComparison.OrdinalIgnoreCase));

    internal static string[] RunFamilies(ShapedText shaped) => shaped.Families;

    internal static string[] RunTexts(ShapedText shaped) => shaped.Texts;

    internal static bool HasMissingGlyph(ShapedText shaped) => shaped.HasMissingGlyph;

    public static int GlyphCount(ShapedText shaped) => shaped.GlyphCount;

    internal static int PrimaryFaceCacheCountForTests()
    {
        lock (PrimaryFacesLock)
            return PrimaryFaces.Count;
    }

    internal static int PrimaryFaceCacheCapacityForTests() => PrimaryFaceCacheCapacity;

    internal static int PrimaryFaceDisposalsForTests() => Volatile.Read(ref primaryFaceDisposals);


    private static float MeasureUncached(string text, string families, float size, int weight, bool italic,
        float letterSpacing, int direction)
        => MeasureLineUncached(text, 0, text.Length, families, size, weight, italic,
            letterSpacing, direction);

    private static void AppendDirectionalRange(string paragraph, int rangeStart, int rangeLength,
        int lineStart, bool rtl, string families, SKFontStyle style, float size, float letterSpacing,
        List<ShapedRun> runs, ref float cursor, ref float extra, ref bool hasCluster,
        TypefaceLease primary, SKFont primaryFont)
    {
        var text = paragraph.Substring(rangeStart, rangeLength);
        if (primaryFont.ContainsGlyphs(text))
        {
            runs.Add(ShapeRun(text, primary.Typeface, size, rtl, rangeStart - lineStart,
                letterSpacing, ref cursor, ref extra, ref hasCluster,
                paragraph, rangeStart, false, primary.Duplicate()));
            return;
        }

        var names = Families(families);
        var elements = StringInfo.ParseCombiningCharacters(text);
        var groups = new List<(string Text, int Start, SKTypeface Typeface)>();
        var start = 0;
        SKTypeface? face = null;
        for (var i = 0; i < elements.Length; i++)
        {
            var end = i + 1 < elements.Length ? elements[i + 1] : text.Length;
            var element = text.Substring(elements[i], end - elements[i]);
            var next = ResolveElement(element, names, style);
            if (face is null)
            {
                face = next;
                start = elements[i];
                continue;
            }
            if (SameFace(face, next))
            {
                next.Dispose();
                continue;
            }
            groups.Add((text.Substring(start, elements[i] - start), start, face));
            face = next;
            start = elements[i];
        }
        if (face is not null)
            groups.Add((text.Substring(start), start, face));

        var ordered = rtl ? groups.AsEnumerable().Reverse() : groups;
        foreach (var group in ordered)
        {
            var resource = new TypefaceResource(group.Typeface, static () => { });
            var lease = resource.Lease();
            resource.Release();
            runs.Add(ShapeRun(group.Text, group.Typeface, size, rtl,
                rangeStart - lineStart + group.Start, letterSpacing,
                ref cursor, ref extra, ref hasCluster,
                paragraph, rangeStart + group.Start, false, lease));
        }
    }

    private static BidiResolution ResolveBidi(string text, int direction)
    {
        if (text.Length == 0)
            return new BidiResolution(null, direction == 2);
        if (!RequiresBidi(text, direction))
            return new BidiResolution(null, false);
        var defaultLevel = direction switch
        {
            1 => BidiLevel.Ltr(),
            2 => BidiLevel.Rtl(),
            _ => (BidiLevel?)null,
        };
        var info = BidiInfo.New(text, defaultLevel);
        return new BidiResolution(info,
            info.Paragraphs.Count != 0 && info.Paragraphs[0].Level.IsRtl());
    }

    private static bool RequiresBidi(string text, int direction)
    {
        if (direction == 2)
            return text.Length != 0;
        foreach (var rune in text.EnumerateRunes())
        {
            switch (Unicode.Bidi.CharData.BidiClass(rune))
            {
                case Unicode.Bidi.BidiClass.AL:
                case Unicode.Bidi.BidiClass.AN:
                case Unicode.Bidi.BidiClass.FSI:
                case Unicode.Bidi.BidiClass.LRE:
                case Unicode.Bidi.BidiClass.LRI:
                case Unicode.Bidi.BidiClass.LRO:
                case Unicode.Bidi.BidiClass.PDF:
                case Unicode.Bidi.BidiClass.PDI:
                case Unicode.Bidi.BidiClass.R:
                case Unicode.Bidi.BidiClass.RLE:
                case Unicode.Bidi.BidiClass.RLI:
                case Unicode.Bidi.BidiClass.RLO:
                    return true;
            }
        }
        return false;
    }

    internal static ShapedRun ShapeRun(string text, SKTypeface typeface, float size, bool rtl,
        int logicalStart, float letterSpacing, ref float cursor, ref float extra, ref bool hasCluster,
        string? context = null, int contextStart = 0,
        bool ownsTypeface = true, TypefaceLease? typefaceLease = null)
    {
        var visualStart = cursor + extra;
        SKFont? font = null;
        try
        {
            font = CreateFont(typeface, size);
            using var ownedShaper = typefaceLease is null ? new SKShaper(typeface) : null;
            var shaper = ownedShaper ?? typefaceLease!.Shaper;
            using var buffer = new HarfBuzzSharp.Buffer();
            buffer.AddUtf16(context ?? text, contextStart, text.Length);
            buffer.Direction = rtl ? Direction.RightToLeft : Direction.LeftToRight;
            buffer.GuessSegmentProperties();
            SKShaper.Result shaped;
            lock (shaper)
                shaped = shaper.Shape(buffer, font);
            var boundaries = letterSpacing != 0
                ? new HashSet<uint>(StringInfo.ParseCombiningCharacters(text).Select(static x => (uint)x))
                : null;
            var clusters = new uint[shaped.Clusters.Length];
            var glyphs = new ushort[shaped.Codepoints.Length];
            var points = new SKPoint[shaped.Points.Length];
            var hasPrior = false;
            uint prior = 0;
            for (var i = 0; i < glyphs.Length; i++)
            {
                var cluster = checked(shaped.Clusters[i] - (uint)contextStart);
                if (boundaries is not null && (!hasPrior || cluster != prior) && hasCluster && boundaries.Contains(cluster))
                    extra += letterSpacing;
                glyphs[i] = checked((ushort)shaped.Codepoints[i]);
                clusters[i] = cluster;
                points[i] = new SKPoint(cursor + shaped.Points[i].X + extra, shaped.Points[i].Y);
                if (!hasPrior || cluster != prior)
                    hasCluster = true;
                prior = cluster;
                hasPrior = true;
            }
            cursor += shaped.Width;
            return new ShapedRun(text, typeface, font, glyphs, points, clusters, logicalStart,
                rtl, visualStart, cursor + extra, ownsTypeface, typefaceLease);
        }
        catch
        {
            font?.Dispose();
            if (typefaceLease is not null)
                typefaceLease.Dispose();
            else if (ownsTypeface)
                typeface.Dispose();
            throw;
        }
    }

    private static SKTypeface ResolveElement(string text, string[] families, SKFontStyle style)
    {
        var primary = ResolvePrimary(families, style);
        using var font = CreateFont(primary, 16);
        if (font.ContainsGlyphs(text))
            return primary;
        primary.Dispose();
        var scalar = FirstScalar(text);
        return SKFontManager.Default.MatchCharacter(null, style, null, scalar)
            ?? ResolvePrimary(families, style);
    }

    private static SKTypeface ResolvePrimary(string families, int weight, bool italic)
    {
        using var style = Style(weight, italic);
        return ResolvePrimary(Families(families), style);
    }

    private static TypefaceLease ResolveCachedPrimary(string families, int weight, bool italic)
    {
        var key = (families, weight, italic);
        TypefaceResource? evicted = null;
        TypefaceLease lease;
        lock (PrimaryFacesLock)
        {
            if (PrimaryFaces.TryGetValue(key, out var cached))
                return cached.Lease();
            var resource = new TypefaceResource(
                ResolvePrimary(families, weight, italic),
                () => Interlocked.Increment(ref primaryFaceDisposals));
            PrimaryFaces.Add(key, resource);
            PrimaryFaceOrder.Enqueue(key);
            if (PrimaryFaceOrder.Count > PrimaryFaceCacheCapacity)
            {
                var evictedKey = PrimaryFaceOrder.Dequeue();
                if (PrimaryFaces.Remove(evictedKey, out var removed))
                    evicted = removed;
            }
            lease = resource.Lease();
        }
        evicted?.Release();
        return lease;
    }

    private static SKTypeface ResolvePrimary(string[] families, SKFontStyle style)
    {
        var manager = SKFontManager.Default;
        foreach (var family in families)
        {
            if (manager.FontFamilies.Any(x => string.Equals(x, family, StringComparison.OrdinalIgnoreCase)))
                return manager.MatchFamily(family, style) ?? SKTypeface.FromFamilyName(family, style) ?? SKTypeface.Default;
        }
        return SKTypeface.FromFamilyName(null, style) ?? SKTypeface.Default;
    }

    private static SKFont CreateFont(SKTypeface typeface, float size) => new(typeface, size);

    private static SKFontStyle Style(int weight, bool italic) => new(
        (SKFontStyleWeight)weight, SKFontStyleWidth.Normal,
        italic ? SKFontStyleSlant.Italic : SKFontStyleSlant.Upright);

    private static string[] Families(string families) => families.Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);

    private static bool SameFace(SKTypeface a, SKTypeface b) => a.FamilyName == b.FamilyName;

    private static int FirstScalar(string text) => Rune.DecodeFromUtf16(text.AsSpan(), out var rune, out _) == OperationStatus.Done
        ? rune.Value : text[0];
}
