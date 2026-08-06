using System;
using Goo;
using Goo.InternalTextInterop;
using Xunit;

namespace Goo.Tests.Rendering;

public sealed class BidiTextTests
{
    private const string Family = "DejaVu Sans";

    [Fact]
    public void MixedParagraphShapesResolvedRunsInVisualOrder()
    {
        using var shaped = TextShaping.Shape("abc \u05D0\u05D1\u05D2", Family, 20f, 400, false, 0f, 0);

        Assert.False(shaped.RightToLeft);
        Assert.Equal(["abc ", "\u05D0\u05D1\u05D2"], TextShaping.RunTexts(shaped));
        Assert.True(shaped.CaretX(4, 1) > shaped.CaretX(7, 0));
    }

    [Fact]
    public void BaseDirectionsSurviveLineSplitting()
    {
        using var explicitRtl = TextShaping.Shape("abc", Family, 20f, 400, false, 0f, 2);
        using var secondLine = TextShaping.ShapeLine("\u05D0\u05D1\u05D2 abc", 4, 3,
            Family, 20f, 400, false, 0f, 0);

        Assert.True(explicitRtl.RightToLeft);
        Assert.True(secondLine.RightToLeft);
        Assert.Equal(["abc"], TextShaping.RunTexts(secondLine));
    }

    [Fact]
    public void PassiveAndEditorDirectionOverridesReshapeTheFullParagraph()
    {
        const string content = "abc \u05D0\u05D1\u05D2";
        var style = new Style { Direction = Goo.Direction.RightToLeft };
        var staticNode = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = content,
            FontFamily = Family,
            FontSize = 20,
            Direction = Goo.Direction.LeftToRight,
            StyleRanges = new[] { new TextStyleRange(new TextRange(0, content.Length), style) },
        });
        var staticRun = Assert.Single(TextLayouts.For(staticNode, 300).Rich!.Lines[0].Runs);
        var baseNode = new Reconciler { Res = new Resolver() }.Mount(new Text
        {
            Content = content,
            FontFamily = Family,
            FontSize = 20,
            Direction = Goo.Direction.LeftToRight,
        });
        var baseShape = TextLayouts.For(baseNode, 300).Lines[0].Shape!;

        var document = new TextDocument(content);
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        layer.SetStyle("rtl", new TextRange(0, content.Length), style);
        var editorNode = new Reconciler { Res = new Resolver() }.Mount(new TextEditor(document,
            controller, new[] { layer })
        {
            Width = 300,
            Height = 40,
            FontFamily = Family,
            FontSize = 20,
            Direction = Goo.Direction.LeftToRight,
        });
        var editorRun = Assert.Single(TextEditorLayouts.For(editorNode, 300, 40).Lines[0].Runs);

        Assert.False(baseShape.RightToLeft);
        Assert.True(staticRun.Shape!.RightToLeft);
        Assert.True(editorRun.Shape!.RightToLeft);
        Assert.True(staticRun.Shape.HasRightToLeftRun);
        Assert.True(editorRun.Shape.HasRightToLeftRun);
        Assert.Equal([" \u05D0\u05D1\u05D2", "abc"], TextShaping.RunTexts(staticRun.Shape));
        Assert.Equal([" \u05D0\u05D1\u05D2", "abc"], TextShaping.RunTexts(editorRun.Shape));
    }

    [Fact]
    public void RtlEllipsisKeepsLogicalPrefixAndVisualBaseDirection()
    {
        var width = TextShaping.Measure("\u05E9\u05DC\u2026", Family, 20f, 400, false, 0f, 2) + 0.1f;
        var display = TextShaping.Ellipsize("\u05E9\u05DC\u05D5\u05DD\u05E2\u05D5\u05DC\u05DD",
            Family, 20f, 400, false, 0f, 0, width);
        using var shaped = TextShaping.Shape(display, Family, 20f, 400, false, 0f, 0);

        Assert.EndsWith("\u2026", display, StringComparison.Ordinal);
        Assert.True(shaped.RightToLeft);
        Assert.True(shaped.Width <= width);
    }

    [Fact]
    public void EntryKeysFollowVisualStopsAndLogicalEdges()
    {
        var resolver = new Resolver();
        var entry = new Reconciler { Res = resolver }.Mount(new TextEntry
        {
            Value = "abc \u05D0\u05D1\u05D2",
            FontFamily = Family,
            FontSize = 20,
            Direction = Goo.Direction.Auto,
        });
        var input = new TextInput();
        input.SetFocus(resolver, entry);
        var metrics = new TextMetrics();

        var previous = metrics.CaretX(entry, entry.Caret);
        for (var i = 0; i < 8; i++)
        {
            Assert.True(input.HandleKey(entry, resolver, Key.Left, new KeyModifiers()));
            var next = metrics.CaretX(entry, entry.Caret);
            Assert.True(next <= previous + 0.01f, $"Left moved from {previous} to {next}.");
            previous = next;
        }

        Assert.True(input.HandleKey(entry, resolver, Key.Home, new KeyModifiers()));
        Assert.Equal(0, entry.Caret);
        Assert.Equal(TextAffinity.Downstream, entry.CaretAffinity);
        Assert.True(input.HandleKey(entry, resolver, Key.End, new KeyModifiers()));
        Assert.Equal(entry.Buffer.Length, entry.Caret);
        Assert.Equal(TextAffinity.Upstream, entry.CaretAffinity);

        Assert.True(input.HandleKey(entry, resolver, Key.Left, new KeyModifiers { Ctrl = true }));
        Assert.Equal(4, entry.Caret);
        Assert.True(input.HandleKey(entry, resolver, Key.Right, new KeyModifiers { Ctrl = true }));
        Assert.Equal(7, entry.Caret);

        entry.Caret = 6;
        entry.CaretAffinity = TextAffinity.Upstream;
        entry.Anchor = 1;
        entry.AnchorAffinity = TextAffinity.Downstream;
        using var shaped = metrics.Shape(entry, entry.Buffer);
        Assert.True(shaped.SelectionRects(entry.Caret, entry.Anchor).Length >= 4);
    }

    [Fact]
    public void AlignmentAndRtlEllipsisFollowDirection()
    {
        var reconciler = new Reconciler { Res = new Resolver() };
        var start = reconciler.Mount(new Text
        {
            Content = "\u05E9\u05DC\u05D5\u05DD",
            FontFamily = Family,
            FontSize = 20,
            Direction = Goo.Direction.Auto,
            TextAlign = TextAlign.Start,
        });
        var startLayout = TextLayouts.For(start, 200f);
        var startLine = startLayout.Lines[0];
        Assert.True(startLine.Shape!.RightToLeft);
        Assert.Equal(200f - startLine.DisplayWidth,
            TextLayouts.lineOffset(start, startLine, 200f), 3);

        var end = reconciler.Mount(new Text
        {
            Content = "\u05E9\u05DC\u05D5\u05DD",
            FontFamily = Family,
            FontSize = 20,
            Direction = Goo.Direction.Auto,
            TextAlign = TextAlign.End,
            TextWrap = TextWrap.NoWrap,
            TextTrimming = TextTrimming.Ellipsis,
        });
        var endLayout = TextLayouts.For(end, 1f);
        var endLine = endLayout.Lines[0];
        Assert.Equal(0f, TextLayouts.lineOffset(end, endLine, 200f));
        Assert.Equal("\u2026", endLine.Content);
        Assert.True(endLine.Shape!.RightToLeft);
    }

    [Fact]
    public void RtlEntryHitAndFollowCaretUseVisualGeometry()
    {
        var resolver = new Resolver();
        var entry = new Reconciler { Res = resolver }.Mount(new TextEntry
        {
            Value = "\u05E9\u05DC\u05D5\u05DD\u05E2\u05D5\u05DC\u05DD",
            FontFamily = Family,
            FontSize = 20,
            Direction = Goo.Direction.RightToLeft,
        });
        entry.Rect = new Rect { W = 30f, H = 30f };
        var input = new TextInput();
        input.SetFocus(resolver, entry);

        Assert.True(input.HandleKey(entry, resolver, Key.Home, new KeyModifiers()));
        Assert.Equal(0, entry.Caret);
        Assert.True(entry.EditScrollX > 0f);
        var scrolled = entry.EditScrollX;

        Assert.True(input.HandleKey(entry, resolver, Key.End, new KeyModifiers()));
        Assert.Equal(entry.Buffer.Length, entry.Caret);
        Assert.True(entry.EditScrollX < scrolled);

        entry.Rect = new Rect { W = 300f, H = 30f };
        entry.EditScrollX = 0f;
        var metrics = new TextMetrics();
        using var shaped = metrics.Shape(entry, entry.Buffer);
        var hit = metrics.HitAt(entry,
            metrics.EntryOffset(entry, shaped) + shaped.CaretX(0, (int)TextAffinity.Downstream));
        Assert.Equal(0, hit.Index);
    }
}
