using System;
using System.Globalization;
using System.Linq;
using Goo.InternalTextInterop;
using Xunit;

public sealed class LineBreakOpportunitiesTests
{
    [Fact]
    public void BreaksAfterWhitespaceHyphensAndSlashes()
    {
        const string text = "alpha beta-gamma/delta";

        var map = LineBreakOpportunities.Resolve(text);

        Assert.Contains(6, map.Offsets);
        Assert.Contains(11, map.Offsets);
        Assert.Contains(17, map.Offsets);
        Assert.False(map.CanBreak(0));
        Assert.DoesNotContain(5, map.Offsets);
        Assert.DoesNotContain(10, map.Offsets);
        Assert.Equal(text.Length, map.Offsets[^1]);
    }

    [Fact]
    public void MarksHardLinesAndKeepsCrLfAtomic()
    {
        const string text = "a\r\nb\rc\nd\u2028e\u2029f\u0085g";

        var map = LineBreakOpportunities.Resolve(text);

        Assert.Equal([3, 5, 7, 9, 11, 13], map.MandatoryOffsets);
        Assert.DoesNotContain(2, map.Offsets);
        Assert.True(map.IsMandatory(3));
        Assert.True(map.CanBreak(text.Length));
    }

    [Fact]
    public void WrapsCjkButRespectsOpeningAndClosingPunctuation()
    {
        const string text = "漢字、かな。次";

        var map = LineBreakOpportunities.Resolve(text);

        Assert.Contains(1, map.Offsets);
        Assert.DoesNotContain(2, map.Offsets);
        Assert.Contains(3, map.Offsets);
        Assert.DoesNotContain(5, map.Offsets);
        Assert.Contains(6, map.Offsets);
    }

    [Fact]
    public void NeverBreaksInsideSurrogatesOrExtendedGraphemes()
    {
        const string text = "A😀e\u0301👩🏽‍💻B";
        var boundaries = StringInfo.ParseCombiningCharacters(text)
            .Append(text.Length)
            .ToHashSet();

        var map = LineBreakOpportunities.Resolve(text);

        Assert.Equal([text.Length], map.Offsets);
        Assert.All(map.Offsets, offset => Assert.Contains(offset, boundaries));
        Assert.All(map.MandatoryOffsets, offset => Assert.Contains(offset, boundaries));
    }

    [Fact]
    public void KeepsNonBreakingTextTogetherAndRejectsInvalidUtf16()
    {
        var map = LineBreakOpportunities.Resolve("one\u00A0two\u2060three");

        Assert.Equal(["one\u00A0two\u2060three".Length], map.Offsets);
        Assert.Throws<ArgumentException>(() => LineBreakOpportunities.Resolve("a\ud800b"));
    }

    [Fact]
    public void EmptyTextHasOnlyItsEndBoundary()
    {
        var map = LineBreakOpportunities.Resolve(string.Empty);

        Assert.Equal([0], map.Offsets);
        Assert.Empty(map.MandatoryOffsets);
    }
}
