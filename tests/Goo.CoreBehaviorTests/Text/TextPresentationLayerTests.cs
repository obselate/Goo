using System;
using Goo;
using Xunit;

public sealed class TextPresentationLayerTests
{
    [Fact]
    public void StylesUpdateByKeyAndOverlap()
    {
        using var layer = new TextPresentationLayer(new TextDocument("abcdef"));
        var first = new Style();
        var second = new Style();

        layer.SetStyle("syntax", new TextRange(0, 4), first);
        layer.SetStyle("diagnostic", new TextRange(2, 3), second);
        layer.SetStyle("syntax", new TextRange(1, 4), first);

        Assert.Equal(2, layer.ReadStyleSpans().Length);
        Assert.Equal(new TextRange(1, 4), layer.ReadStyleSpans()[0].Range);
        Assert.Equal("diagnostic", layer.ReadStyleSpans()[1].Key);
    }

    [Fact]
    public void ProjectionsRejectOverlapAndRetainSlots()
    {
        using var layer = new TextPresentationLayer(new TextDocument("abcdef"));
        layer.SetReplacement("link", new TextRange(1, 2), "L");

        Assert.Throws<ArgumentException>(() =>
            layer.SetHiddenRange("overlap", new TextRange(2, 2)));

        layer.SetInlineSlot("slot", new TextRange(4, 1), new Text { Content = "first" });
        var retained = layer.ReadProjections()[1];
        layer.SetInlineSlot("slot", new TextRange(4, 1), new Text { Content = "second" });

        Assert.Same(retained, layer.ReadProjections()[1]);
        Assert.Equal("second", Assert.IsType<Text>(retained.Content).Content);
    }

    [Fact]
    public void InternalSnapshotsAreCachedAndInvalidated()
    {
        using var layer = new TextPresentationLayer(new TextDocument("abcdef"));
        layer.SetStyle("style", new TextRange(0, 1), new Style());
        layer.SetHiddenRange("hidden", new TextRange(2, 1));

        Assert.Same(layer.ReadStyleSpans(), layer.ReadStyleSpans());
        Assert.Same(layer.ReadProjections(), layer.ReadProjections());
        var styles = layer.ReadStyleSpans();
        var projections = layer.ReadProjections();
        layer.SetStyle("style", new TextRange(0, 2), new Style());
        layer.SetHiddenRange("hidden", new TextRange(3, 1));

        Assert.NotSame(styles, layer.ReadStyleSpans());
        Assert.NotSame(projections, layer.ReadProjections());
    }

    [Fact]
    public void DocumentChangesRebaseProjections()
    {
        var document = new TextDocument("hello");
        using var layer = new TextPresentationLayer(document);
        layer.SetReplacement("word", new TextRange(1, 3), "x");
        layer.SetStyle("style", new TextRange(1, 3), new Style());

        document.Apply(Change(0, 0, "!"));

        Assert.Equal(new TextRange(2, 3), layer.ReadProjections()[0].Range);
        Assert.Equal(new TextRange(2, 3), layer.ReadStyleSpans()[0].Range);

        document.Apply(Change(2, 3, ""));

        Assert.Empty(layer.ReadProjections());
        Assert.Equal(new TextRange(2, 0), layer.ReadStyleSpans()[0].Range);
    }

    [Fact]
    public void CollapsedStylesDoNotAbsorbASeparatePaste()
    {
        var document = new TextDocument("heading\nbody");
        using var layer = new TextPresentationLayer(document);
        layer.SetStyle("heading", new TextRange(0, 7), new Style());

        document.Apply(Change(0, document.Length, ""));
        document.Apply(Change(0, 0, "heading\nbody"));

        Assert.Equal(new TextRange(document.Length, 0), layer.ReadStyleSpans()[0].Range);
    }

    [Fact]
    public void FullyReplacedStylesDoNotExpandAcrossReplacementText()
    {
        var document = new TextDocument("heading\nbody");
        using var layer = new TextPresentationLayer(document);
        layer.SetStyle("heading", new TextRange(0, 7), new Style());

        document.Apply(Change(0, document.Length, "plain\ntext"));

        Assert.Equal(new TextRange(0, 0), layer.ReadStyleSpans()[0].Range);
    }

    [Fact]
    public void UndoRestoresAStyleCollapsedByDeletion()
    {
        var document = new TextDocument("heading\nbody");
        using var layer = new TextPresentationLayer(document);
        layer.SetStyle("heading", new TextRange(0, 7), new Style());

        document.Apply(Change(0, document.Length, ""));
        Assert.True(document.Undo());

        Assert.Equal(new TextRange(0, 7), layer.ReadStyleSpans()[0].Range);
        Assert.True(document.Redo());
        Assert.Equal(new TextRange(0, 0), layer.ReadStyleSpans()[0].Range);
        Assert.True(document.Undo());
        Assert.Equal(new TextRange(0, 7), layer.ReadStyleSpans()[0].Range);
    }

    [Fact]
    public void UndoRestoresExactProjectionRangeAfterWholeDocumentDeletion()
    {
        var document = new TextDocument("before [[slot]] after");
        using var layer = new TextPresentationLayer(document);
        layer.SetInlineSlot("slot", new TextRange(7, 8), new Text { Content = "Slot" });
        var projection = layer.ReadProjections()[0];

        document.Apply(Change(0, document.Length, ""));
        Assert.True(document.Undo());

        Assert.Same(projection, layer.ReadProjections()[0]);
        Assert.Equal(new TextRange(7, 8), projection.Range);
    }

    [Fact]
    public void ControllerCutAndPasteCannotPromoteAStyleToTheWholeDocument()
    {
        var document = new TextDocument("heading\nbody");
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        layer.SetStyle("heading", new TextRange(0, 7), new Style());
        layer.SetInlineSlot("body", new TextRange(8, 4), new Text { Content = "Body" });

        Assert.True(controller.Execute(Command(TextCommandKind.SelectAll)));
        var copied = controller.Cut();
        Assert.True(controller.Execute(Command(TextCommandKind.Paste, copied)));

        Assert.Equal("heading\nbody", document.GetText());
        Assert.Equal(0, layer.ReadStyleSpans()[0].Range.Length);
        Assert.Empty(layer.ReadProjections());
    }

    private static TextChange Change(int start, int length, string text) => new(
        new TextRange(start, length), text);

    private static TextCommand Command(TextCommandKind kind, string text = "") =>
        new(kind, text, false);
}
