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

    [Fact]
    public void KeyedRetirementContinuesAfterDisposeFailures()
    {
        Assert.True(new CellFixtures().KeyedRetirementContinuesAfterDisposeFailures());
    }

    [Fact]
    public void PositionalRetirementContinuesAfterDisposeFailures()
    {
        Assert.True(new CellFixtures().PositionalRetirementContinuesAfterDisposeFailures());
    }

    [Fact]
    public void WindowCloseCompletesAfterCleanupFailures()
    {
        Assert.True(new CellFixtures().WindowCloseCompletesAfterCleanupFailures());
    }
}
