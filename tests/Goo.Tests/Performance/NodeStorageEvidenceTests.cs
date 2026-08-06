using Goo;
using Xunit;

public sealed class NodeStorageEvidenceTests
{
    [Fact]
    public void MountedKindCensusCoversEveryConcreteBlob()
    {
        using var source = new ImageSource(1, 1, [255, 0, 0, 255]);
        using var controller = new TextEditorController(new TextDocument("editor"));
        var root = new Reconciler { Res = new Resolver() }.Mount(new Container
        {
            Children =
            [
                new Container(),
                new Button(),
                new Text { Content = "text" },
                new TextEntry { Value = "entry" },
                new TextEditor(controller.Document, controller),
                new Shape { Path = UnitSquarePath() },
                new Image { Source = source },
            ],
        });

        try
        {
            Assert.Equal(NodeKind.Container, root.Kind);
            Assert.Collection(root.Children,
                node => Assert.Equal(NodeKind.Container, node.Kind),
                node => Assert.Equal(NodeKind.Button, node.Kind),
                node => Assert.Equal(NodeKind.Text, node.Kind),
                node => Assert.Equal(NodeKind.Entry, node.Kind),
                node => Assert.Equal(NodeKind.Editor, node.Kind),
                node => Assert.Equal(NodeKind.Shape, node.Kind),
                node => Assert.Equal(NodeKind.Image, node.Kind));
        }
        finally
        {
            TextLayouts.DisposeTree(root);
        }
    }

    private static VectorPath UnitSquarePath() => new PathBuilder()
        .MoveTo(0, 0).LineTo(1, 0).LineTo(1, 1).LineTo(0, 1).Close().Build();
}
