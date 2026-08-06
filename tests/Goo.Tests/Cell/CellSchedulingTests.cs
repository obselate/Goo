using Goo;
using Xunit;

public sealed class CellSchedulingTests
{
    [Fact]
    public void EqualInputSkipsAndChangedInputSchedulesOneBuild()
    {
        Assert.True(new CellFixtures().InputEqualitySchedulesOneBuild());
    }

    [Fact]
    public void SemanticInputEquivalenceKeepsTheNewestCallback()
    {
        Assert.True(new CellFixtures().SemanticInputEquivalenceKeepsNewestCallback());
    }

    [Fact]
    public void ThrowingInputEquivalenceRetriesTheSameSnapshot()
    {
        Assert.True(new CellFixtures().ThrowingInputEquivalenceRetriesSameSnapshot());
    }

    [Fact]
    public void DirtySiblingCellsEachRebuildOnceInOneUpdate()
    {
        Assert.True(new CellFixtures().DirtySiblingsRebuildOnceInOneUpdate());
    }
    [Fact]
    public void FailedSiblingRebuildResubmitsRemainingDirtySiblings()
    {
        Assert.True(new CellFixtures().DirtySiblingFailureResubmitsRemaining());
    }


    [Fact]
    public void RepeatedRebuildRequestsCoalesce()
    {
        Assert.True(new CellFixtures().RepeatedRebuildRequestsCoalesce());
    }

    [Fact]
    public void DirtyParentRunsBeforeAndSubsumesDirtyChild()
    {
        Assert.True(new CellFixtures().DirtyParentRunsBeforeAndSubsumesDirtyChild());
    }

    [Fact]
    public void RemovedQueuedCellIsNotRebuiltAndDisposesOnce()
    {
        Assert.True(new CellFixtures().RemovedQueuedCellIsNotRebuiltAndDisposesOnce());
    }

    [Fact]
    public void RebuildRequestedDuringTransactionRunsOnNextUpdate()
    {
        Assert.True(new CellFixtures().RebuildRequestedDuringTransactionRunsOnNextUpdate());
    }
}
