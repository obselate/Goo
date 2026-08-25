using Goo;
using Xunit;

public sealed class IncrementalReconciliationTests
{
    [Fact]
    public void IncrementalUpdatesRebuildOnlyLiveRequiredCells()
    {
        var fixtures = new TreeFixtures();
        Assert.True(fixtures.LeafDirtyUpdateContract());
        Assert.True(fixtures.DirtyAncestorContract());
        Assert.True(fixtures.RemovedDirtyContract());
    }
}
