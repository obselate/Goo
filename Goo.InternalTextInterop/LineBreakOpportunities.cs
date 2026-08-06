using System.Buffers;
using System.Globalization;
using System.Text;

namespace Goo.InternalTextInterop;

/// <summary>Breaks use a practical UAX #14 subset at UAX #29 grapheme boundaries.</summary>
/// <remarks>Hard lines, spaces, discretionary punctuation, and CJK break; non-breaking and punctuation pairs do not.</remarks>
internal sealed class LineBreakMap
{
    internal LineBreakMap(int[] offsets, int[] mandatoryOffsets)
    {
        Offsets = offsets;
        MandatoryOffsets = mandatoryOffsets;
    }

    public int[] Offsets { get; }
    public int[] MandatoryOffsets { get; }

    public bool CanBreak(int utf16Offset) => Array.BinarySearch(Offsets, utf16Offset) >= 0;

    public bool IsMandatory(int utf16Offset) => Array.BinarySearch(MandatoryOffsets, utf16Offset) >= 0;
}

internal static class LineBreakOpportunities
{
    public static LineBreakMap Resolve(string text)
    {
        ArgumentNullException.ThrowIfNull(text);
        if (text.Length == 0)
            return new LineBreakMap([0], []);

        var rawStarts = StringInfo.ParseCombiningCharacters(text);
        var rawClusters = new List<LineBreakCluster>(rawStarts.Length);
        for (var i = 0; i < rawStarts.Length; i++)
        {
            var start = rawStarts[i];
            var end = i + 1 < rawStarts.Length ? rawStarts[i + 1] : text.Length;
            rawClusters.Add(Classify(text, start, end));
        }

        var clusters = CoalesceCrLf(rawClusters);
        var offsets = new List<int>(clusters.Count);
        var mandatoryOffsets = new List<int>();
        for (var i = 0; i < clusters.Count; i++)
        {
            var current = clusters[i];
            var mandatory = current.Class == LineBreakClass.Mandatory;
            var allowed = mandatory || i == clusters.Count - 1
                || AllowsBreak(current, clusters[i + 1]);
            if (!allowed)
                continue;

            offsets.Add(current.End);
            if (mandatory)
                mandatoryOffsets.Add(current.End);
        }

        return new LineBreakMap(offsets.ToArray(), mandatoryOffsets.ToArray());
    }

    private static List<LineBreakCluster> CoalesceCrLf(List<LineBreakCluster> rawClusters)
    {
        var clusters = new List<LineBreakCluster>(rawClusters.Count);
        for (var i = 0; i < rawClusters.Count; i++)
        {
            var current = rawClusters[i];
            if (current.IsCarriageReturn && i + 1 < rawClusters.Count && rawClusters[i + 1].IsLineFeed)
            {
                clusters.Add(new LineBreakCluster(current.Start, rawClusters[i + 1].End,
                    LineBreakClass.Mandatory, false, false));
                i++;
                continue;
            }
            clusters.Add(current);
        }
        return clusters;
    }

    private static bool AllowsBreak(LineBreakCluster before, LineBreakCluster after)
    {
        if (after.Class is LineBreakClass.Mandatory or LineBreakClass.Space or LineBreakClass.ZeroWidth)
            return false;
        if (before.Class is LineBreakClass.NonBreaking or LineBreakClass.WordJoiner
            || after.Class is LineBreakClass.NonBreaking or LineBreakClass.WordJoiner)
            return false;
        if (before.Class is LineBreakClass.Space or LineBreakClass.ZeroWidth)
            return true;
        if (before.Class is LineBreakClass.Opening or LineBreakClass.Quote
            || after.Class is LineBreakClass.Closing or LineBreakClass.Quote)
            return false;
        if (before.Class is LineBreakClass.Hyphen or LineBreakClass.Slash)
            return true;
        return before.Class == LineBreakClass.Cjk || after.Class == LineBreakClass.Cjk;
    }

    private static LineBreakCluster Classify(string text, int start, int end)
    {
        var cursor = start;
        var count = 0;
        var scalar = 0;
        var @class = LineBreakClass.Ordinary;
        while (cursor < end)
        {
            if (Rune.DecodeFromUtf16(text.AsSpan(cursor, end - cursor), out var rune, out var consumed)
                != OperationStatus.Done)
                throw new ArgumentException("Text must contain valid UTF-16.", nameof(text));

            count++;
            scalar = rune.Value;
            @class = MoreRestrictive(@class, Classify(rune));
            cursor += consumed;
        }

        return new LineBreakCluster(start, end, @class, count == 1 && scalar == '\r',
            count == 1 && scalar == '\n');
    }

    private static LineBreakClass MoreRestrictive(LineBreakClass prior, LineBreakClass candidate)
    {
        if (candidate is LineBreakClass.Mandatory or LineBreakClass.NonBreaking or LineBreakClass.WordJoiner)
            return candidate;
        if (prior is LineBreakClass.Mandatory or LineBreakClass.NonBreaking or LineBreakClass.WordJoiner)
            return prior;
        return candidate == LineBreakClass.Ordinary ? prior : candidate;
    }

    private static LineBreakClass Classify(Rune rune)
    {
        var value = rune.Value;
        if (value is '\r' or '\n' or 0x000B or 0x000C or 0x0085 or 0x2028 or 0x2029)
            return LineBreakClass.Mandatory;
        if (value is 0x00A0 or 0x2007 or 0x202F)
            return LineBreakClass.NonBreaking;
        if (value == 0x2060)
            return LineBreakClass.WordJoiner;
        if (value == 0x200B)
            return LineBreakClass.ZeroWidth;
        if (Rune.IsWhiteSpace(rune))
            return LineBreakClass.Space;
        if (IsHyphen(value))
            return LineBreakClass.Hyphen;
        if (value is '/' or '\\')
            return LineBreakClass.Slash;
        if (IsOpeningPunctuation(value))
            return LineBreakClass.Opening;
        if (IsClosingPunctuation(value))
            return LineBreakClass.Closing;
        if (IsQuotation(value))
            return LineBreakClass.Quote;
        return IsCjk(value) ? LineBreakClass.Cjk : LineBreakClass.Ordinary;
    }

    private static bool IsHyphen(int value) => value is '-' or 0x00AD or 0x058A or 0x05BE or 0x1400 or 0x1806
        or 0x2010 or 0x2011 or 0x2012 or 0x2013 or 0x2014 or 0x2E17 or 0x30A0 or 0xFE63 or 0xFF0D;

    private static bool IsOpeningPunctuation(int value) => value is '(' or '[' or '{' or 0x00AB or 0x2039
        or 0x3008 or 0x300A or 0x300C or 0x300E or 0x3010 or 0x3014 or 0x3016 or 0x3018 or 0x301A
        or 0xFF08 or 0xFF3B or 0xFF5B;

    private static bool IsClosingPunctuation(int value) => value is ',' or '.' or ':' or ';' or '!' or '?'
        or '%' or ')' or ']' or '}' or 0x00BB or 0x203A or 0x2026 or 0x3001 or 0x3002 or 0x3009 or 0x300B
        or 0x300D or 0x300F or 0x3011 or 0x3015 or 0x3017 or 0x3019 or 0x301B or 0xFF01 or 0xFF09
        or 0xFF0C or 0xFF0E or 0xFF1A or 0xFF1B or 0xFF1F or 0xFF3D or 0xFF5D;

    private static bool IsQuotation(int value) => value is '"' or '\'' or 0x2018 or 0x2019 or 0x201C or 0x201D
        or 0x300C or 0x300D or 0x300E or 0x300F;

    private static bool IsCjk(int value) => value is >= 0x1100 and <= 0x11FF
        or >= 0x2E80 and <= 0x2FDF
        or >= 0x3040 and <= 0x30FF
        or >= 0x3100 and <= 0x312F
        or >= 0x3130 and <= 0x318F
        or >= 0x31A0 and <= 0x31FF
        or >= 0x3400 and <= 0x4DBF
        or >= 0x4E00 and <= 0x9FFF
        or >= 0xAC00 and <= 0xD7A3
        or >= 0xF900 and <= 0xFAFF
        or >= 0x20000 and <= 0x2FA1F;

    private readonly record struct LineBreakCluster(int Start, int End, LineBreakClass Class,
        bool IsCarriageReturn, bool IsLineFeed);

    private enum LineBreakClass : byte
    {
        Ordinary,
        Mandatory,
        Space,
        NonBreaking,
        WordJoiner,
        ZeroWidth,
        Hyphen,
        Slash,
        Cjk,
        Opening,
        Closing,
        Quote,
    }
}
