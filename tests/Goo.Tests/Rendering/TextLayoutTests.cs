using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using Goo;
using Goo.InternalTextInterop;
using SkiaSharp;
using Xunit;

public sealed class TextLayoutTests
{
    [RequiresTextFixtureFact]
    public void ScriptsAndSpacingShapeAndPaint()
    {
        Assert.True(new RenderingFixtures().TextLayoutShapesAndPaints());
    }

    [RequiresTextFixtureFact]
    public void WrappedRtlParagraphKeepsBaseDirectionAcrossLines()
    {
        Assert.True(new RenderingFixtures().WrappedRtlParagraphKeepsBaseDirectionAcrossLines());
    }

    [RequiresTextFixtureFact]
    public void ShapedTextOwnershipSurvivesSiblingDisposal()
    {
        Assert.True(new RenderingFixtures().ShapedTextOwnershipSurvivesSiblingDisposal());
    }

    [RequiresTextFixtureFact]
    public void WrapAndEllipsisKeepLogicalLayout()
    {
        Assert.Equal(0, new RenderingFixtures().StaticTextWrapAndTrimmingFailure());
    }

    [RequiresTextFixtureFact]
    public void MaxLinesCapsWrapsBreaksAndEllipsis()
    {
        Assert.Equal(0, new RenderingFixtures().StaticTextMaxLinesFailure());
    }

    [RequiresTextFixtureFact]
    public void TransformPrecedesLayoutAndSkipsEntries()
    {
        var culture = CultureInfo.CurrentCulture;
        var uiCulture = CultureInfo.CurrentUICulture;
        try
        {
            CultureInfo.CurrentCulture = new CultureInfo("tr-TR");
            CultureInfo.CurrentUICulture = new CultureInfo("tr-TR");
            Assert.True(new RenderingFixtures().StaticTextTransformContract());
        }
        finally
        {
            CultureInfo.CurrentCulture = culture;
            CultureInfo.CurrentUICulture = uiCulture;
        }
    }

    [RequiresTextFixtureFact]
    public void TextDecorationPaintsStaticEntryAndPlaceholderText()
    {
        Assert.True(new RenderingFixtures().TextDecorationPaintContract());
    }

    [Fact]
    public void TextChangesReleaseResourcesAndSurviveChurn()
    {
        Assert.True(new RenderingFixtures().TextLayoutCacheContracts());
    }

    [Fact]
    public void TextFlowHandlesOverflowBreaksExactFitsAndFinalLines()
    {
        var firstOverflow = TextFlow.Consider(0, 0, -1, false, 1, 6, 5, false);
        Assert.Equal(1, firstOverflow.Fit);
        Assert.Equal(-1, firstOverflow.Preferred);
        Assert.True(firstOverflow.Overflowed);
        Assert.False(firstOverflow.Stop);
        Assert.Equal(1, TextFlow.Resolve(0, firstOverflow.Fit, firstOverflow.Preferred,
            firstOverflow.Overflowed));

        var preferred = TextFlow.Consider(0, 0, -1, false, 1, 4, 5, true);
        var afterPreferred = TextFlow.Consider(0, preferred.Fit, preferred.Preferred,
            preferred.Overflowed, 2, 8, 5, false);
        Assert.True(afterPreferred.Stop);
        Assert.Equal(1, TextFlow.Resolve(0, afterPreferred.Fit, afterPreferred.Preferred,
            afterPreferred.Overflowed));

        var exact = TextFlow.Consider(0, 0, -1, false, 1, 5, 5, false);
        Assert.False(exact.Overflowed);
        Assert.Equal(1, TextFlow.Resolve(0, exact.Fit, exact.Preferred, exact.Overflowed));

        var final = TextFlow.Consider(2, 2, -1, false, 3, 4, 5, false);
        Assert.False(final.Overflowed);
        Assert.Equal(3, TextFlow.Resolve(2, final.Fit, final.Preferred, final.Overflowed));
    }

    [Fact]
    public void TextFlowKeepsStaticGraphemeAndEditorUtf16BoundariesEquivalent()
    {
        const string text = "😀x";
        var starts = StringInfo.ParseCombiningCharacters(text);
        var staticFlow = TextFlow.Consider(0, 0, -1, false, 1, 6, 5, false);
        var editorFlow = TextFlow.Consider(0, 0, -1, false, starts[1], 6, 5, false);

        Assert.Equal(1, TextFlow.Resolve(0, staticFlow.Fit, staticFlow.Preferred,
            staticFlow.Overflowed));
        Assert.Equal(starts[1], TextFlow.Resolve(0, editorFlow.Fit, editorFlow.Preferred,
            editorFlow.Overflowed));
        Assert.Equal("😀", text.Substring(0, starts[1]));
    }

    [Fact]
    public void TextAnalysisKeepsTrailingAndRepeatedParagraphs()
    {
        foreach (var (content, lines) in new[]
        {
            ("a\n", 2),
            ("a\r\n", 2),
            ("a\n\n", 3),
            ("", 1),
        })
        {
            var node = new Reconciler { Res = new Resolver() }.Mount(new Text
            {
                Content = content,
                FontFamily = "DejaVu Sans",
                FontSize = 20,
            });

            Assert.Equal(lines, TextLayouts.For(node, 300f).Lines.Count);
            TextLayouts.DisposeTree(node);
        }
    }

    [Fact]
    public void PlainStyleRangesGetterIsAllocationFreeAfterWarmup()
    {
        var text = new Text();
        _ = text.StyleRanges;

        var before = GC.GetAllocatedBytesForCurrentThread();
        TextStyleRange[]? ranges = null;
        for (var i = 0; i < 32; i++)
            ranges = text.StyleRanges;
        var bytes = GC.GetAllocatedBytesForCurrentThread() - before;

        Assert.Equal(0, bytes);
        Assert.Empty(ranges!);
    }

    [Fact]
    public void NoWrapEllipsisKeepsExactFitAndGraphemeBoundaries()
    {
        Assert.False(TextLayouts.isRtl("Ж שלום"));
        Assert.True(TextLayouts.isRtl("שלום Ж"));
        var exactNode = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = "exact fit",
            FontFamily = "DejaVu Sans",
            FontSize = 18,
            TextWrap = TextWrap.NoWrap,
            TextTrimming = TextTrimming.Ellipsis,
        });
        var unconstrained = TextLayouts.For(exactNode, -1f);
        var exact = TextLayouts.For(exactNode, unconstrained.Width);
        Assert.Equal("exact fit", Assert.Single(exact.Lines).Content);
        Assert.Equal(exact.Lines[0].DisplayWidth, exact.Lines[0].Width, 3);

        var grapheme = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = "A👨‍👩‍👧‍👦B",
            FontFamily = "DejaVu Sans,Noto Color Emoji",
            FontSize = 18,
            TextWrap = TextWrap.NoWrap,
            TextTrimming = TextTrimming.Ellipsis,
        });
        var prefix = TextShaping.Measure("A…", grapheme.FontFamily, 18f, 400, false, 0f, false);
        var layout = TextLayouts.For(grapheme, prefix + .1f);
        Assert.Equal("A…", Assert.Single(layout.Lines).Content);
        Assert.True(layout.Width > prefix);
        Assert.True(layout.Lines[0].DisplayWidth <= prefix + .1f);
        var tiny = TextLayouts.For(grapheme, .1f);
        Assert.Equal("…", Assert.Single(tiny.Lines).Content);
        Assert.Equal("A👨‍👩‍👧‍👦B", tiny.Content);

        var rtl = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = "שלוםעולם",
            FontFamily = "DejaVu Sans",
            FontSize = 18,
            TextWrap = TextWrap.NoWrap,
            TextTrimming = TextTrimming.Ellipsis,
        });
        var rtlWidth = TextShaping.Measure("של…", rtl.FontFamily, 18f, 400, false, 0f, true) + .1f;
        var rtlLayout = TextLayouts.For(rtl, rtlWidth);
        var rtlLine = Assert.Single(rtlLayout.Lines);
        Assert.EndsWith("…", rtlLine.Content, StringComparison.Ordinal);
        Assert.True(rtlLine.DisplayWidth <= rtlWidth);
        Assert.True(rtlLine.Width > rtlLine.DisplayWidth);
    }

    [Fact]
    public void PassiveRangesUseOrderedStylesWithoutEditorState()
    {
        var ranges = new[]
        {
            new TextStyleRange(new TextRange(0, 4), new Style { Color = Color.Rgb(255, 0, 0) }),
            new TextStyleRange(new TextRange(1, 2), new Style
            {
                Color = Color.Rgb(0, 0, 255),
                FontWeight = 700,
                TextDecoration = TextDecoration.Underline,
            }),
        };
        var text = new Text
        {
            Content = "abcd",
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            StyleRanges = ranges,
        };
        ranges[0] = new TextStyleRange(new TextRange(), new Style());
        var snapshot = text.StyleRanges;
        Assert.Equal(new TextRange(0, 4), snapshot[0].Range);

        var node = new Reconciler { Res = new Resolver() }.Mount(text);
        var layout = TextLayouts.For(node, 300f);
        var rich = Assert.IsType<TextRichLayout>(layout.Rich);
        var line = Assert.Single(rich.Lines);
        Assert.Equal(3, line.Runs.Count);
        Assert.Equal(Color.Rgb(255, 0, 0), line.Runs[0].Style.Color);
        Assert.Equal(Color.Rgb(0, 0, 255), line.Runs[1].Style.Color);
        Assert.Equal(700d, line.Runs[1].Style.FontWeight);
        Assert.Equal(TextDecoration.Underline, line.Runs[1].Style.Decoration);
        Assert.Null(node.EditorController);
        Assert.Null(node.EditorState);
        Assert.Throws<ArgumentNullException>(() => new Text { StyleRanges = null! });
        Assert.Throws<ArgumentException>(() => new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = "ß",
            StyleRanges = new[]
            {
                new TextStyleRange(new TextRange(0, 1), new Style
                {
                    TextTransform = TextTransform.Uppercase,
                }),
            },
        }));
    }

    [Fact]
    public void PassiveColorRangeRefreshesRunsWithoutRebuildingBaseLayout()
    {
        var firstRanges = new[]
        {
            new TextStyleRange(new TextRange(5, 5), new Style { Color = Color.Rgb(255, 0, 0) }),
        };
        var reconciler = new Reconciler { Res = new Resolver() };
        var node = reconciler.Mount(new Text
        {
            Content = "hello world",
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            StyleRanges = firstRanges,
        });
        var before = TextLayouts.For(node, 300f);
        var baseShape = before.Lines[0].Shape;
        var beforeRich = before.Rich;

        var secondRanges = new[]
        {
            new TextStyleRange(new TextRange(5, 5), new Style { Color = Color.Rgb(0, 0, 255) }),
        };
        node = reconciler.Diff(node, new Text
        {
            Content = "hello world",
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            StyleRanges = secondRanges,
        });
        var after = TextLayouts.For(node, 300f);

        Assert.Same(before, after);
        Assert.Same(baseShape, after.Lines[0].Shape);
        Assert.NotSame(beforeRich, after.Rich);
        Assert.Equal(Color.Rgb(0, 0, 255), after.Rich!.Lines[0].Runs[1].Style.Color);

        node = reconciler.Diff(node, new Text
        {
            Content = "hello world",
            FontFamily = "DejaVu Sans",
            FontSize = 20,
        });
        var removed = TextLayouts.For(node, 300f);
        Assert.Same(after, removed);
        Assert.Same(baseShape, removed.Lines[0].Shape);
        Assert.Null(removed.Rich);
    }

    [Fact]
    public void PassiveRangeColorBoundariesPreserveMixedBidiWidth()
    {
        const string content = "abc سلام world";
        var plain = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = content,
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            Direction = Direction.Auto,
        });
        var styled = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = content,
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            Direction = Direction.Auto,
            StyleRanges = new[]
            {
                new TextStyleRange(new TextRange(6, 3), new Style { Color = Color.Rgb(255, 0, 0) }),
            },
        });

        var plainLine = Assert.Single(TextLayouts.For(plain, 300f).Lines);
        var styledLayout = TextLayouts.For(styled, 300f);
        Assert.Equal(plainLine.DisplayWidth, styledLayout.Rich!.Lines[0].Width, 3);
    }

    [RequiresTextFixtureFact]
    public void PassiveRangeInsideSurrogatePairUsesClusterStartStyle()
    {
        var plain = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = "😀x",
            FontFamily = "DejaVu Sans",
            FontSize = 20,
        });
        var node = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = "😀x",
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            StyleRanges = new[]
            {
                new TextStyleRange(new TextRange(1, 1), new Style
                {
                    Color = Color.Rgb(255, 0, 0),
                    FontSize = 48,
                    FontWeight = 900,
                    TextDecoration = TextDecoration.Underline,
                }),
            },
        });

        var plainLayout = TextLayouts.For(plain, -1f);
        var styledLayout = TextLayouts.For(node, -1f);
        var runs = styledLayout.Rich!.Lines[0].Runs;

        Assert.Equal(1, TextShaping.GlyphCount(runs[0].Shape!));
        Assert.Equal(0, TextShaping.GlyphCount(runs[1].Shape!));
        Assert.Equal(Color.Black, runs[0].Style.Color);
        Assert.Equal(Color.Rgb(255, 0, 0), runs[1].Style.Color);
        Assert.Null(TextPaintDecorations.Get(runs[1]));
        Assert.Equal(plainLayout.Lines[0].DisplayWidth, styledLayout.Rich.Lines[0].Width, 3);
        using var expected = PaintClusterInteriorText(false);
        using var actual = PaintClusterInteriorText(true);
        for (var y = 0; y < expected.Height; y++)
        for (var x = 0; x < expected.Width; x++)
            Assert.Equal(expected.GetPixel(x, y), actual.GetPixel(x, y));
        Assert.Empty(RedPixels(actual));
        TextLayouts.DisposeTree(plain);
        TextLayouts.DisposeTree(node);
    }

    [Fact]
    public void SameColorPassiveRangeMatchesPlainMixedBidiPixels()
    {
        using var plain = PaintStaticText(false);
        using var styled = PaintStaticText(true);

        Assert.Equal(plain.Width, styled.Width);
        Assert.Equal(plain.Height, styled.Height);
        for (var y = 0; y < plain.Height; y++)
        for (var x = 0; x < plain.Width; x++)
            Assert.Equal(plain.GetPixel(x, y), styled.GetPixel(x, y));
    }

    [Fact]
    public void PassiveRangeEffectsKeepSelectedGlyphInkBeyondTheBoundary()
    {
        using var shadow = PaintEffect(Effect.Shadow);
        var shadowPixels = RedPixels(shadow.Bitmap).ToArray();
        Assert.NotEmpty(shadowPixels);
        Assert.True(shadowPixels.Max() > shadow.End + 3f);
        Assert.True(shadowPixels.Max() <= shadow.End + 40f);

        using var stroke = PaintEffect(Effect.Stroke);
        var strokePixels = RedPixels(stroke.Bitmap).ToArray();
        Assert.NotEmpty(strokePixels);
        Assert.True(strokePixels.Min() < stroke.Start - 1f);
        Assert.True(strokePixels.Min() >= stroke.Start - 12f);
    }

    [Fact]
    public void SlicedClustersHaveOneOwnerAcrossStyleBoundaries()
    {
        AssertSlicedPixelsMatchFull("fi", 1);
        AssertSlicedPixelsMatchFull("e\u0301", 1);
    }

    [RequiresTextFixtureFact]
    public void WidthAffectingStylesInsideClustersMatchPlainText()
    {
        AssertClusterInteriorStyleMatchesPlainText("fi", 1);
        AssertClusterInteriorStyleMatchesPlainText("e\u0301", 1);
        AssertClusterInteriorStyleMatchesPlainText("😀x", 1);
    }

    [RequiresTextFixtureFact]
    public void FallbackSlicesKeepTheirExactFaceAfterSiblingDisposal()
    {
        var full = TextShaping.Shape("\U0001F600a\U0001F600", "Noto Color Emoji", 48, 400, false, 0, 1);
        var left = TextShaping.Slice(full, 2, 3);
        var right = TextShaping.Slice(full, 2, 3);
        try
        {
            var family = Assert.Single(TextShaping.RunFamilies(full), value =>
                !string.Equals(value, "Noto Color Emoji", StringComparison.OrdinalIgnoreCase));
            Assert.Equal([family], TextShaping.RunFamilies(left));
            Assert.Equal([family], TextShaping.RunFamilies(right));
            using var expected = PaintShape(right);
            full.Dispose();
            left.Dispose();
            using var actual = PaintShape(right);
            for (var y = 0; y < expected.Height; y++)
            for (var x = 0; x < expected.Width; x++)
                Assert.Equal(expected.GetPixel(x, y), actual.GetPixel(x, y));
        }
        finally
        {
            full.Dispose();
            left.Dispose();
            right.Dispose();
        }
    }

    [Fact]
    public void ManyPassiveColorRangesRetainOneGlyphSet()
    {
        var content = string.Concat(Enumerable.Repeat("abcdefgh", 32));
        var red = new Style { Color = Color.Rgb(255, 0, 0) };
        var blue = new Style { Color = Color.Rgb(0, 0, 255) };
        var ranges = Enumerable.Range(0, content.Length)
            .Select(i => new TextStyleRange(new TextRange(i, 1), i % 2 == 0 ? red : blue))
            .ToArray();
        var node = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = content,
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            StyleRanges = ranges,
        });

        var before = GC.GetAllocatedBytesForCurrentThread();
        var layout = TextLayouts.For(node, -1f);
        var bytes = GC.GetAllocatedBytesForCurrentThread() - before;
        var baseGlyphs = TextShaping.GlyphCount(Assert.Single(layout.Lines).Shape!);
        var richGlyphs = layout.Rich!.Lines[0].Runs
            .Sum(run => TextShaping.GlyphCount(run.Shape!));
        TextLayouts.DisposeTree(node);

        Assert.Equal(baseGlyphs, richGlyphs);
        Assert.InRange(bytes, 0, 550000);
    }

    [Fact]
    public void EqualPassiveRangeRebuildSkipsLayoutAndMappingAllocations()
    {
        var style = new Style { Color = Color.Rgb(255, 0, 0) };
        var content = string.Concat(Enumerable.Repeat("abc def ghi jkl mno pqr ", 8));
        var ranges = Enumerable.Range(0, 32)
            .Select(i => new TextStyleRange(new TextRange(i * 6, 3), style))
            .ToArray();
        var reconciler = new Reconciler { Res = new Resolver() };
        var node = reconciler.Mount(new Text
        {
            Content = content,
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            StyleRanges = ranges,
        });
        TextLayouts.For(node, 300f);
        for (var i = 0; i < 8; i++)
            node = reconciler.Diff(node, new Text
            {
                Content = content,
                FontFamily = "DejaVu Sans",
                FontSize = 20,
                StyleRanges = ranges,
            });

        var before = GC.GetAllocatedBytesForCurrentThread();
        node = reconciler.Diff(node, new Text
        {
            Content = content,
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            StyleRanges = ranges,
        });
        var bytes = GC.GetAllocatedBytesForCurrentThread() - before;

        Assert.Equal(5480, bytes);
        Assert.NotNull(TextLayouts.For(node, 300f).Rich);
    }

    [Fact]
    public void PassiveRichRunsDisposeOnRefreshInvalidationRemovalAndRetirement()
    {
        var reconciler = new Reconciler { Res = new Resolver() };
        var node = reconciler.Mount(StyledText(Color.Rgb(255, 0, 0)));
        var first = FirstRichShape(node);

        node = reconciler.Diff(node, StyledText(Color.Rgb(0, 0, 255)));
        Assert.True(first.IsDisposedForTests);
        var refreshed = FirstRichShape(node);

        node = reconciler.Diff(node, StyledText(Color.Rgb(0, 0, 255), 700));
        Assert.True(refreshed.IsDisposedForTests);
        var invalidated = FirstRichShape(node);

        node = reconciler.Diff(node, new Text
        {
            Content = "abc سلام world",
            FontFamily = "DejaVu Sans",
            FontSize = 20,
        });
        Assert.True(invalidated.IsDisposedForTests);

        node = reconciler.Diff(node, StyledText(Color.Rgb(255, 0, 0)));
        var retired = FirstRichShape(node);
        TextLayouts.DisposeTree(node);
        Assert.True(retired.IsDisposedForTests);
    }

    [Fact]
    public void WarmPassiveRichTextPaintHasNoExtraAllocation()
    {
        var window = new Window
        {
            Width = 320,
            Height = 80,
            Root = new RichTextCell(),
        };
        window.UpdateTree();
        using var surface = SKSurface.Create(new SKImageInfo(320, 80));
        Assert.NotNull(surface);
        for (var i = 0; i < 8; i++)
            window.PaintTo(surface!.Canvas);

        var before = GC.GetAllocatedBytesForCurrentThread();
        window.PaintTo(surface!.Canvas);
        var bytes = GC.GetAllocatedBytesForCurrentThread() - before;

        Assert.Equal(88, bytes);
        window.Close();
    }

    [Fact]
    public void PlainTextConstructionRemainsFieldFree()
    {
        for (var i = 0; i < 8; i++)
            _ = new Text();

        var before = GC.GetAllocatedBytesForCurrentThread();
        _ = new Text();
        var bytes = GC.GetAllocatedBytesForCurrentThread() - before;

        Assert.Equal(152, bytes);
    }

    private sealed class RichTextCell : Cell
    {
        public override Blob Build() => new Text
        {
            Content = "abc سلام world",
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            StyleRanges = new[]
            {
                new TextStyleRange(new TextRange(4, 4), new Style
                {
                    Color = Color.Rgb(255, 0, 0),
                    TextDecoration = TextDecoration.Underline,
                }),
            },
        };
    }

    private static Text StyledText(Color color, double? weight = null)
    {
        var style = weight.HasValue
            ? new Style { Color = color, FontWeight = weight.Value }
            : new Style { Color = color };
        return new Text
        {
            Content = "abc سلام world",
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            StyleRanges = new[]
            {
                new TextStyleRange(new TextRange(4, 4), style),
            },
        };
    }

    private static ShapedText FirstRichShape(Node node) =>
        TextLayouts.For(node, 320f).Rich!.Lines[0].Runs[0].Shape!;

    private static SKBitmap PaintStaticText(bool styled)
    {
        var window = new Window
        {
            Width = 320,
            Height = 80,
            Root = new SameColorTextCell(styled),
        };
        window.UpdateTree();
        using var surface = SKSurface.Create(new SKImageInfo(320, 80));
        Assert.NotNull(surface);
        surface!.Canvas.Clear(SKColors.Transparent);
        window.PaintTo(surface.Canvas);
        using var image = surface.Snapshot();
        var result = SKBitmap.FromImage(image);
        window.Close();
        return result;
    }

    private static SKBitmap PaintClusterInteriorText(bool styled)
    {
        var window = new Window
        {
            Width = 160,
            Height = 100,
            Root = new ClusterInteriorTextCell(styled),
        };
        window.UpdateTree();
        using var surface = SKSurface.Create(new SKImageInfo(160, 100));
        Assert.NotNull(surface);
        surface!.Canvas.Clear(SKColors.Transparent);
        window.PaintTo(surface.Canvas);
        using var image = surface.Snapshot();
        var result = SKBitmap.FromImage(image);
        window.Close();
        return result;
    }

    private static void AssertClusterInteriorStyleMatchesPlainText(string content, int start)
    {
        var plain = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = content,
            FontFamily = "DejaVu Sans",
            FontSize = 20,
        });
        var styled = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = content,
            FontFamily = "DejaVu Sans",
            FontSize = 20,
            StyleRanges = new[]
            {
                new TextStyleRange(new TextRange(start, 1), new Style
                {
                    FontSize = 48,
                    FontWeight = 900,
                }),
            },
        });
        try
        {
            var plainLayout = TextLayouts.For(plain, -1f);
            var styledLayout = TextLayouts.For(styled, -1f);
            Assert.Equal(plainLayout.Lines[0].DisplayWidth, styledLayout.Rich!.Lines[0].Width, 3);
            using var expected = PaintClusterInteriorStyle(content, start, false);
            using var actual = PaintClusterInteriorStyle(content, start, true);
            for (var y = 0; y < expected.Height; y++)
            for (var x = 0; x < expected.Width; x++)
                Assert.Equal(expected.GetPixel(x, y), actual.GetPixel(x, y));
        }
        finally
        {
            TextLayouts.DisposeTree(plain);
            TextLayouts.DisposeTree(styled);
        }
    }

    private static SKBitmap PaintClusterInteriorStyle(string content, int start, bool styled)
    {
        var window = new Window
        {
            Width = 160,
            Height = 100,
            Root = new ClusterInteriorStyleCell(content, start, styled),
        };
        window.UpdateTree();
        using var surface = SKSurface.Create(new SKImageInfo(160, 100));
        Assert.NotNull(surface);
        surface!.Canvas.Clear(SKColors.Transparent);
        window.PaintTo(surface.Canvas);
        using var image = surface.Snapshot();
        var result = SKBitmap.FromImage(image);
        window.Close();
        return result;
    }

    private static void AssertSlicedPixelsMatchFull(string text, int boundary)
    {
        using var full = TextShaping.Shape(text, "DejaVu Sans", 48, 400, false, 0, 1);
        using var left = TextShaping.Slice(full, 0, boundary);
        using var right = TextShaping.Slice(full, boundary, text.Length);
        Assert.Equal(TextShaping.GlyphCount(full),
            TextShaping.GlyphCount(left) + TextShaping.GlyphCount(right));
        using var expected = PaintShape(full);
        using var actual = PaintShapes(left, right);
        for (var y = 0; y < expected.Height; y++)
        for (var x = 0; x < expected.Width; x++)
            Assert.Equal(expected.GetPixel(x, y), actual.GetPixel(x, y));
    }

    private static SKBitmap PaintShape(ShapedText shape)
    {
        using var surface = SKSurface.Create(new SKImageInfo(160, 80));
        Assert.NotNull(surface);
        surface!.Canvas.Clear(SKColors.Transparent);
        using var paint = new SKPaint { Color = SKColors.White, IsAntialias = true };
        TextShaping.Paint(shape, surface.Canvas, paint, 10, 55);
        using var image = surface.Snapshot();
        return SKBitmap.FromImage(image);
    }

    private static SKBitmap PaintShapes(ShapedText first, ShapedText second)
    {
        using var surface = SKSurface.Create(new SKImageInfo(160, 80));
        Assert.NotNull(surface);
        surface!.Canvas.Clear(SKColors.Transparent);
        using var paint = new SKPaint { Color = SKColors.White, IsAntialias = true };
        TextShaping.Paint(first, surface.Canvas, paint, 10, 55);
        TextShaping.Paint(second, surface.Canvas, paint, 10, 55);
        using var image = surface.Snapshot();
        return SKBitmap.FromImage(image);
    }

    private static EffectPaint PaintEffect(Effect effect)
    {
        var window = new Window
        {
            Width = 320,
            Height = 100,
            Root = new EffectTextCell(effect),
        };
        window.UpdateTree();
        var node = Assert.IsType<Node>(window.Tree);
        var layout = TextLayouts.For(node, 320f);
        var line = Assert.Single(layout.Rich!.Lines);
        var run = effect == Effect.Shadow
            ? Assert.Single(line.Runs, value => value.Style.Shadows is not null)
            : Assert.Single(line.Runs, value => value.Style.StrokeWidth > 0);
        using var surface = SKSurface.Create(new SKImageInfo(320, 100));
        Assert.NotNull(surface);
        surface!.Canvas.Clear(SKColors.Transparent);
        window.PaintTo(surface.Canvas);
        using var image = surface.Snapshot();
        var shape = run.Shape!;
        var x = TextLayouts.ContentLeft(node) + run.X;
        var start = shape.CaretX(run.DisplayStart, (int)TextAffinity.Downstream);
        var end = shape.CaretX(run.DisplayStart + run.DisplayLength, (int)TextAffinity.Downstream);
        var result = new EffectPaint(SKBitmap.FromImage(image), x + Math.Min(start, end),
            x + Math.Max(start, end));
        window.Close();
        return result;
    }

    private static IEnumerable<float> RedPixels(SKBitmap bitmap)
    {
        for (var y = 0; y < bitmap.Height; y++)
        for (var x = 0; x < bitmap.Width; x++)
        {
            var pixel = bitmap.GetPixel(x, y);
            if (pixel.Red > 200 && pixel.Green < 60 && pixel.Blue < 60 && pixel.Alpha > 0)
                yield return x;
        }
    }

    private sealed class SameColorTextCell(bool styled) : Cell
    {
        public override Blob Build()
        {
            if (styled)
            {
                return new Text
                {
                    Content = "abc سلام world",
                    FontFamily = "DejaVu Sans",
                    FontSize = 20,
                    Color = Color.Rgb(255, 255, 255),
                    Direction = Direction.Auto,
                    StyleRanges = new[]
                    {
                        new TextStyleRange(new TextRange(6, 3), new Style
                        {
                            Color = Color.Rgb(255, 255, 255),
                        }),
                    },
                };
            }
            return new Text
            {
                Content = "abc سلام world",
                FontFamily = "DejaVu Sans",
                FontSize = 20,
                Color = Color.Rgb(255, 255, 255),
                Direction = Direction.Auto,
            };
        }
    }

    private sealed class ClusterInteriorTextCell(bool styled) : Cell
    {
        public override Blob Build()
        {
            if (styled)
            {
                return new Text
                {
                    Content = "😀x",
                    FontFamily = "DejaVu Sans",
                    FontSize = 20,
                    StyleRanges = new[]
                    {
                        new TextStyleRange(new TextRange(1, 1), new Style
                        {
                            Color = Color.Rgb(255, 0, 0),
                            FontSize = 48,
                            FontWeight = 900,
                            TextDecoration = TextDecoration.Underline,
                        }),
                    },
                };
            }
            return new Text
            {
                Content = "😀x",
                FontFamily = "DejaVu Sans",
                FontSize = 20,
            };
        }
    }

    private sealed class ClusterInteriorStyleCell(string content, int start, bool styled) : Cell
    {
        public override Blob Build()
        {
            if (styled)
            {
                return new Text
                {
                    Content = content,
                    FontFamily = "DejaVu Sans",
                    FontSize = 20,
                    StyleRanges = new[]
                    {
                        new TextStyleRange(new TextRange(start, 1), new Style
                        {
                            FontSize = 48,
                            FontWeight = 900,
                        }),
                    },
                };
            }
            return new Text
            {
                Content = content,
                FontFamily = "DejaVu Sans",
                FontSize = 20,
            };
        }
    }

    private sealed class EffectTextCell(Effect effect) : Cell
    {
        public override Blob Build() => new Text
        {
            Content = "ab",
            FontFamily = "DejaVu Sans",
            FontSize = 48,
            Color = Color.Rgb(255, 255, 255),
            StyleRanges = new[]
            {
                effect == Effect.Shadow
                    ? new TextStyleRange(new TextRange(0, 1), new Style
                    {
                        TextShadow = new TextShadow
                        {
                            OffsetX = 24,
                            Color = Color.Rgb(255, 0, 0),
                        },
                    })
                    : new TextStyleRange(new TextRange(1, 1), new Style
                    {
                        TextStrokeWidth = 20,
                        TextStrokeColor = Color.Rgb(255, 0, 0),
                    }),
            },
        };
    }

    private enum Effect
    {
        Shadow,
        Stroke,
    }

    private sealed class EffectPaint(SKBitmap bitmap, float start, float end) : IDisposable
    {
        public SKBitmap Bitmap => bitmap;
        public float Start => start;
        public float End => end;
        public void Dispose() => bitmap.Dispose();
    }

}

[AttributeUsage(AttributeTargets.Method)]
public sealed class RequiresTextFixtureFactAttribute : FactAttribute
{
    public RequiresTextFixtureFactAttribute()
    {
        if (!HasFamily("DejaVu Sans") || !HasFamily("Noto Color Emoji"))
            Skip = "Requires DejaVu Sans and Noto Color Emoji.";
    }

    private static bool HasFamily(string name) => SKFontManager.Default.FontFamilies
        .Any(family => string.Equals(family, name, StringComparison.OrdinalIgnoreCase));
}
