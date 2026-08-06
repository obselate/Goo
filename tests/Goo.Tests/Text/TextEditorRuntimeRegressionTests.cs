using Goo;
using SkiaSharp;
using Xunit;

public sealed class TextEditorRuntimeRegressionTests
{
    [RequiresTextFixtureFact]
    public void BlockSlotsDoNotPaintObjectReplacementGlyphs()
    {
        var document = new TextDocument("X");
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        layer.SetBlockSlot("block", new TextRange(0, 1), new Container
        {
            Width = 120.0,
            Height = 24.0,
            BackgroundColor = Color.Transparent,
        });
        var node = Mount(new TextEditor(document, controller, [layer])
        {
            Width = 120.0,
            Height = 40.0,
            FontFamily = "DejaVu Sans",
            FontSize = 20.0,
            Color = Color.Rgb(255, 0, 0),
        });
        new Layout().Calculate(node, 120, 40);

        using var image = new Painter().RenderOffscreen(node, 120, 40);

        Assert.False(HasRed(image));
    }

    [Fact]
    public void BlockSlotsAreClippedToTheEditorViewport()
    {
        var document = new TextDocument("zero\none\ntwo\nX\nfour");
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        layer.SetBlockSlot("block", new TextRange(13, 1), new Container
        {
            Width = 160.0,
            Height = 14.0,
            BackgroundColor = Color.Rgb(0, 255, 0),
        });
        var root = Mount(new Container
        {
            Width = 160.0,
            Height = 100.0,
            BackgroundColor = Color.Black,
            Children =
            [
                new TextEditor(document, controller, [layer])
                {
                    Key = "editor",
                    Width = 160.0,
                    Height = 22.0,
                    OverscanLines = 4,
                },
            ],
        });
        new Layout().Calculate(root, 160, 100);

        using var image = new Painter().RenderOffscreen(root, 160, 100);

        Assert.False(HasGreenBelow(image, (int)(root.Children[0].Rect.Y + root.Children[0].Rect.H)));
    }

    [Fact]
    public void InlineSlotsPaintOnce()
    {
        var document = new TextDocument("a X");
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        layer.SetInlineSlot("ready", new TextRange(2, 1), new Container
        {
            Width = 24.0,
            Height = 16.0,
            BackgroundColor = Color.FromNormalized(0, 1, 0, 0.5f),
        });
        var root = Mount(new Container
        {
            Width = 120.0,
            Height = 32.0,
            BackgroundColor = Color.Black,
            Children =
            [
                new TextEditor(document, controller, [layer])
                {
                    Key = "editor",
                    Width = 120.0,
                    Height = 32.0,
                },
            ],
        });
        new Layout().Calculate(root, 120, 32);
        var slot = Assert.Single(root.Children[0].Children);

        using var image = new Painter().RenderOffscreen(root, 120, 32);
        using var bitmap = SKBitmap.FromImage(image);
        var color = bitmap.GetPixel((int)slot.Rect.X + 4, (int)slot.Rect.Y + 4);

        Assert.InRange(color.Red, (byte)0, (byte)19);
        Assert.InRange(color.Blue, (byte)0, (byte)19);
        Assert.InRange(color.Green, (byte)151, (byte)214);
    }

    [Fact]
    public void InlineSlotsKeepSizeAndRebaseOnTheTextLine()
    {
        var document = new TextDocument("first X");
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        layer.SetInlineSlot("ready", new TextRange(6, 1), new Container
        {
            Width = 24.0,
            Height = 16.0,
        });
        var node = Mount(new TextEditor(document, controller, [layer])
        {
            Width = 160.0,
            Height = 40.0,
        });
        var yoga = new Layout();
        yoga.Calculate(node, 160, 40);

        var first = TextEditorLayouts.For(node, 160, 40);
        var firstLine = Assert.Single(first.Lines);
        var firstSlot = Assert.Single(firstLine.Slots);
        Assert.Equal(24, firstSlot.Width);
        Assert.True(firstSlot.X > 0);
        Assert.Equal(24, Assert.Single(node.Children).Rect.W);

        document.Apply(new TextChange(new TextRange(0, 0), "p "));

        var rebased = TextEditorLayouts.For(node, 160, 40);
        var rebasedLine = Assert.Single(rebased.Lines);
        var rebasedSlot = Assert.Single(rebasedLine.Slots);
        Assert.Equal(0, rebasedLine.DisplayStart);
        Assert.True(rebasedSlot.X > firstSlot.X);
        Assert.Equal(new TextRange(8, 1), layer.Projections[0].Range);
    }

    [Fact]
    public void BlockSlotsKeepDeclaredHeight()
    {
        var document = new TextDocument("X");
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        layer.SetBlockSlot("block", new TextRange(0, 1), new Container
        {
            Height = 18.0,
        });
        var node = Mount(new TextEditor(document, controller, [layer])
        {
            Width = 160.0,
            Height = 80.0,
        });

        new Layout().Calculate(node, 160, 80);

        var slot = Assert.Single(node.Children);
        Assert.Equal(160, slot.Rect.W);
        Assert.Equal(18, slot.Rect.H);
    }

    [Fact]
    public void SlotsOutsideTheContentBoxIgnoreHits()
    {
        var document = new TextDocument("X");
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        layer.SetBlockSlot("block", new TextRange(0, 1), new Container
        {
            Height = 40.0,
        });
        var node = Mount(new TextEditor(document, controller, [layer])
        {
            Width = 100.0,
            Height = 40.0,
            Padding = 10.0,
        });
        new Layout().Calculate(node, 100, 40);

        var hit = new Hit().Topmost(node, 20, 35);

        Assert.Same(node, hit);
    }

    [Fact]
    public void ScrollMovesInlineSlots()
    {
        var document = new TextDocument("slot\none\ntwo\nthree\nfour\nfive");
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        layer.SetInlineSlot("slot", new TextRange(0, 4), new Text { Content = "slot" });
        var cell = new EditorCell(document, controller, [layer]);
        var window = new Window { Root = cell, Width = 200, Height = 40 };
        try
        {
            window.UpdateTree();
            var tree = Assert.IsType<Node>(window.Tree);
            var before = Assert.Single(tree.Children).Rect;

            controller.ScrollTo(0, 5);
            Assert.True(window.UpdateTree(0.0));

            Assert.Equal(before.Y - 5, Assert.Single(tree.Children).Rect.Y);
        }
        finally
        {
            window.Close();
        }
    }

    [RequiresTextFixtureFact]
    public void StyledRunsOwnCaretHitAndSelectionGeometry()
    {
        var document = new TextDocument("# Goo TextEditor");
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        layer.SetStyle("heading", new TextRange(0, document.Length), new Style
        {
            FontSize = 22.0,
            FontWeight = 700.0,
        });
        var node = Mount(new TextEditor(document, controller, [layer])
        {
            Width = 320.0,
            Height = 48.0,
            FontFamily = "DejaVu Sans",
            FontSize = 14.0,
        });
        new Layout().Calculate(node, 320, 48);
        var line = Assert.Single(TextEditorLayouts.For(node, 320, 48).Lines);
        var run = Assert.Single(line.Runs);
        var expectedEnd = run.X + run.Shape!.Width;

        var caret = TextEditorLayouts.CaretRect(node,
            new TextPosition(document.Length, TextAffinity.Downstream));
        var hit = TextEditorLayouts.HitTest(node,
            expectedEnd - 0.1f, line.Top + line.Height * 0.5f);
        var selection = TextEditorLayouts.SelectionRects(line, 0, line.DisplayLength);

        Assert.Equal(expectedEnd, caret.X, 2);
        Assert.Equal(document.Length, hit.Offset);
        Assert.Equal(2, selection.Count);
        Assert.Equal(expectedEnd, selection[1], 2);
    }

    [RequiresTextFixtureFact]
    public void StyledRunsDriveWrappingMeasurement()
    {
        var document = new TextDocument("aaaaaaaaaa");
        using var controller = new TextEditorController(document);
        using var layer = new TextPresentationLayer(document);
        layer.SetStyle("heading", new TextRange(0, document.Length), new Style
        {
            FontSize = 32.0,
            FontWeight = 700.0,
        });
        var node = Mount(new TextEditor(document, controller, [layer])
        {
            Width = 100.0,
            Height = 160.0,
            FontFamily = "DejaVu Sans",
            FontSize = 14.0,
        });

        var layout = TextEditorLayouts.For(node, 100, 160);

        Assert.True(layout.Lines.Count > 1);
        Assert.All(layout.Lines, line => Assert.True(line.Width <= 100.01f));
    }

    private static Node Mount(Blob blob) => new Reconciler { Res = new Resolver() }.Mount(blob);

    private static bool HasGreenBelow(SKImage image, int top)
    {
        using var bitmap = SKBitmap.FromImage(image);
        for (var y = top; y < image.Height; y++)
        for (var x = 0; x < image.Width; x++)
        {
            var color = bitmap.GetPixel(x, y);
            if (color.Green >= 245 && color.Red <= 10 && color.Blue <= 10)
                return true;
        }
        return false;
    }

    private static bool HasRed(SKImage image)
    {
        using var bitmap = SKBitmap.FromImage(image);
        for (var y = 0; y < image.Height; y++)
        for (var x = 0; x < image.Width; x++)
        {
            var color = bitmap.GetPixel(x, y);
            if (color.Red >= 245 && color.Green <= 10 && color.Blue <= 10)
                return true;
        }
        return false;
    }

    private sealed class EditorCell : Cell
    {
        private readonly TextDocument document;
        private readonly TextEditorController controller;
        private readonly TextPresentationLayer[] layers;

        public EditorCell(
            TextDocument document,
            TextEditorController controller,
            TextPresentationLayer[]? layers = null)
        {
            this.document = document;
            this.controller = controller;
            this.layers = layers ?? [];
        }

        public override Blob Build()
        {
            return new TextEditor(document, controller, layers)
            {
                Width = 200.0,
                Height = 40.0,
            };
        }
    }

}
