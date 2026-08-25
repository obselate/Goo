using Goo;
using Xunit;

public sealed class CellLifecycleTests
{
    [Fact]
    public void DirectCellCompositionAddsNoLayoutOrPaintNode()
    {
        Assert.True(new CellFixtures().DirectCompositionAddsNoRenderNode());
    }

    [Fact]
    public void CellsDisposeOnceAcrossUnmountPaths()
    {
        Assert.True(new CellFixtures().DisposesEachUnmountedCellExactlyOnce());
    }
}
