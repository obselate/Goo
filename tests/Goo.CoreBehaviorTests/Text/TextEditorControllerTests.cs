using System;
using Goo;
using Xunit;

public sealed class TextEditorControllerTests
{
    [Fact]
    public void CommandsEditAndUndo()
    {
        var document = new TextDocument("ab");
        using var controller = new TextEditorController(document)
        {
            Selection = Selection(1, 2),
        };

        Assert.True(controller.Insert("XY"));
        Assert.Equal("aXY", document.GetText());
        Assert.Equal(3, controller.Selection.Active.Offset);
        Assert.True(controller.Undo());
        Assert.Equal("ab", document.GetText());
        Assert.True(controller.Redo());
        Assert.Equal("aXY", document.GetText());
    }

    [Fact]
    public void CommandsCanCancel()
    {
        var document = new TextDocument("text");
        using var controller = new TextEditorController(document);
        controller.OnCommand = args => args.Cancel = args.Command.Kind == TextCommandKind.Insert;

        Assert.False(controller.Insert("!"));
        Assert.Equal("text", document.GetText());
    }

    [Theory]
    [InlineData(TextCommandKind.PageUp)]
    [InlineData(TextCommandKind.PageDown)]
    [InlineData(TextCommandKind.MoveDocumentStart)]
    [InlineData(TextCommandKind.MoveDocumentEnd)]
    public void AdditionalMovementWrappersDispatchSemanticCommands(TextCommandKind kind)
    {
        using var controller = new TextEditorController(new TextDocument("one\ntwo"));
        TextCommand? observed = null;
        controller.OnCommand = args =>
        {
            observed = args.Command;
            args.Cancel = true;
        };

        var handled = kind switch
        {
            TextCommandKind.PageUp => controller.PageUp(true),
            TextCommandKind.PageDown => controller.PageDown(true),
            TextCommandKind.MoveDocumentStart => controller.MoveDocumentStart(true),
            TextCommandKind.MoveDocumentEnd => controller.MoveDocumentEnd(true),
            _ => throw new ArgumentOutOfRangeException(nameof(kind)),
        };

        Assert.False(handled);
        Assert.Equal(kind, observed!.Value.Kind);
        Assert.True(observed.Value.ExtendSelection);
    }

    [Fact]
    public void CompositionCommitsOnce()
    {
        var document = new TextDocument("ab");
        using var controller = new TextEditorController(document)
        {
            Selection = Selection(1, 2),
        };

        Assert.True(controller.BeginComposition());
        Assert.True(controller.UpdateComposition("XY", 0, 2));
        Assert.Equal("ab", document.GetText());
        Assert.Equal("XY", controller.Composition!.Value.Text);
        Assert.True(controller.CommitComposition());
        Assert.Null(controller.Composition);
        Assert.Equal("aXY", document.GetText());
    }

    [Fact]
    public void CompositionRejectsUnsafeBoundaries()
    {
        using var controller = new TextEditorController(new TextDocument());

        Assert.Throws<ArgumentException>(() => controller.UpdateComposition("a\u0301", 1, 0));
        Assert.Throws<ArgumentException>(() => controller.UpdateComposition("\ud83d\ude00", 1, 0));
    }

    [Fact]
    public void ExternalEditsRebaseState()
    {
        var document = new TextDocument("ab");
        using var controller = new TextEditorController(document)
        {
            Selection = Caret(2),
        };

        document.Apply(Change(0, 0, "x"));
        Assert.Equal(3, controller.Selection.Active.Offset);

        controller.BeginComposition();
        document.Apply(Change(0, 0, "!"));

        Assert.Equal(4, controller.Composition!.Value.Range.Start);
        Assert.Equal(0, controller.Composition!.Value.Range.Length);
    }

    [Fact]
    public void MovementUsesGraphemes()
    {
        var document = new TextDocument("a\ud83d\ude00b");
        using var controller = new TextEditorController(document)
        {
            Selection = Caret(document.Length),
        };

        Assert.True(controller.MoveLeft(false));
        Assert.Equal(3, controller.Selection.Active.Offset);
        Assert.True(controller.MoveLeft(false));
        Assert.Equal(1, controller.Selection.Active.Offset);
        Assert.ThrowsAny<ArgumentException>(() => controller.Selection = Caret(2));
    }

    [Fact]
    public void WordMovementMaterializesOnlyTheNearbyWindow()
    {
        var source = new string('x', 1024 * 1024) + " local word";
        var document = new TextDocument(source);
        using var controller = new TextEditorController(document)
        {
            Selection = Caret(document.Length),
        };

        var before = GC.GetAllocatedBytesForCurrentThread();
        Assert.True(controller.MoveWordLeft(false));
        var allocated = GC.GetAllocatedBytesForCurrentThread() - before;

        Assert.Equal(source.LastIndexOf("word", StringComparison.Ordinal),
            controller.Selection.Active.Offset);
        Assert.True(allocated < 100_000, $"word movement allocated {allocated:N0} bytes");
    }

    [Fact]
    public void DeleteTreatsCrLfAsOneDocumentBoundary()
    {
        var backwardDocument = new TextDocument("a\r\nb");
        using (var backward = new TextEditorController(backwardDocument)
        {
            Selection = Caret(3),
        })
        {
            Assert.True(backward.DeleteBackward());
            Assert.Equal("ab", backwardDocument.GetText());
            Assert.Equal(1, backward.Selection.Active.Offset);
        }

        var forwardDocument = new TextDocument("a\r\nb");
        using var forward = new TextEditorController(forwardDocument)
        {
            Selection = Caret(1),
        };
        Assert.True(forward.DeleteForward());
        Assert.Equal("ab", forwardDocument.GetText());
        Assert.Equal(1, forward.Selection.Active.Offset);
    }

    [Fact]
    public void TypingCoalescesButPasteDoesNot()
    {
        var document = new TextDocument();
        using var controller = new TextEditorController(document);

        controller.Insert("a");
        controller.Insert("b");
        document.Apply(Change(2, 0, "!"));
        controller.Paste("P");
        controller.Insert("c");

        Assert.Equal("ab!Pc", document.GetText());
        Assert.True(controller.Undo());
        Assert.Equal("ab!P", document.GetText());
        Assert.True(controller.Undo());
        Assert.Equal("ab!", document.GetText());
        Assert.True(controller.Undo());
        Assert.Equal("ab", document.GetText());
        Assert.True(controller.Undo());
        Assert.Equal("", document.GetText());
    }

    [Fact]
    public void PasteCreatesSeparateUndoEntries()
    {
        var document = new TextDocument();
        using var controller = new TextEditorController(document);

        controller.Paste("a");
        controller.Paste("b");

        Assert.True(controller.Undo());
        Assert.Equal("a", document.GetText());
        Assert.True(controller.Undo());
        Assert.Equal("", document.GetText());
    }

    [Fact]
    public void NullArgumentsFail()
    {
        Assert.Throws<ArgumentNullException>(() => new TextDocument(null!));
        Assert.Throws<ArgumentNullException>(() => new TextEditorController(null!));
        Assert.Throws<ArgumentNullException>(() => new TextPresentationLayer(null!));

        var document = new TextDocument();
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        Assert.Throws<ArgumentNullException>(() => controller.Insert(null!));
        Assert.Throws<ArgumentNullException>(() => layer.SetReplacement("x", new TextRange(), null!));
        Assert.Throws<ArgumentNullException>(() => layer.SetStyle("x", new TextRange(), null!));
    }

    private static TextSelection Caret(int offset) => new(
        new TextPosition(offset, TextAffinity.Downstream),
        new TextPosition(offset, TextAffinity.Downstream));

    private static TextSelection Selection(int start, int end) => new(
        new TextPosition(start, TextAffinity.Upstream),
        new TextPosition(end, TextAffinity.Downstream));

    private static TextChange Change(int start, int length, string text) => new(
        new TextRange(start, length), text);
}
