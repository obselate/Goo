using System;
using Goo;
using Xunit;

public sealed class ElementHandleTests
{
    [Fact]
    public void HandlesDetachOnReplacementAndRemount()
        => Assert.True(new ElementHandleFixtures().LifecycleContract());

    [Fact]
    public void HandlesReportBorderAndContentGeometry()
        => Assert.True(new ElementHandleFixtures().GeometryContract());

    [Fact]
    public void HandlesUseTheNormalFocusPath()
        => Assert.True(new ElementHandleFixtures().FocusContract());

    [Fact]
    public void HandlesScrollTargetsAndAncestorsIdempotently()
        => Assert.True(new ElementHandleFixtures().ScrollContract());

    [Fact]
    public void HandlesRejectDuplicateOwnershipAndSurviveCellExpansion()
        => Assert.True(new ElementHandleFixtures().DuplicateAndCellContract());

    [Fact]
    public void HandlesMountEveryPublicPrimitiveKind()
        => Assert.True(new ElementHandleFixtures().PrimitiveMatrixContract());

    [Fact]
    public void HandlesDoNotRetainRetiredTrees()
        => Assert.True(new ElementHandleFixtures().RetiredTreeDoesNotRetainThroughHandle());

    [Fact]
    public void ElementsWithoutHandlesDoNotAllocateDuringAStableDiff()
        => Assert.Equal(0, new ElementHandleFixtures().NoHandleDiffBytes());

    [Fact]
    public void KeyedDiffRollbackRestoresThePriorHandle()
        => Assert.True(new ElementHandleFixtures().KeyedRollbackRestoresHandle());

    [Fact]
    public void HandleMovesAcrossKeyedSiblingsBeforeTheOldOwnerDiffs()
        => Assert.True(new ElementHandleFixtures().KeyedSiblingMoveContract());

    [Fact]
    public void FailedReconciliationDoesNotLeakTheHandleOwnerScope()
        => Assert.True(new ElementHandleFixtures().OwnerScopeFailureContract());

    [Fact]
    public void MetricsReportStableMountLayoutScrollAndDetachSnapshots()
        => Assert.True(new ElementHandleFixtures().MetricsContract());

    [Fact]
    public void MetricsCallbacksDeferRebuildsAndNewSubscriptions()
        => Assert.True(new ElementHandleFixtures().MetricsCallbackRebuildAndBatchContract());

    [Fact]
    public void MetricsDeliverTheFinalDetachedSnapshotDuringClose()
        => Assert.True(new ElementHandleFixtures().MetricsCloseContract());

    [Fact]
    public void VirtualOwnsListAndGridWindowingOverTheCompleteSource()
        => Assert.True(new ElementHandleFixtures().VirtualContract());

    [Fact]
    public void VirtualRejectsInvalidUniformItemExtents()
        => Assert.True(new ElementHandleFixtures().VirtualExtentValidationContract());

    [Fact]
    public void UnsubscribedHandlesDoNotAllocateDuringAStableDiff()
        => Assert.Equal(0, new ElementHandleFixtures().HandleNoSubscriptionDiffBytes());

    [Fact]
    public void UnsubscribedHandlesDoNotAllocateDuringAStableFrame()
        => Assert.Equal(0, new ElementHandleFixtures().HandleNoSubscriptionFrameBytes());

    [Fact]
    public void WarmMetricsNotificationDoesNotAllocate()
        => Assert.Equal(0, new ElementHandleFixtures().MetricsNotificationBytes());

    [Fact]
    public void TextInputAreaRejectsInvalidAndExtremeLogicalRectanglesBeforeMounting()
    {
        var handle = new ElementHandle();

        Assert.False(handle.SetTextInputArea(new ElementRect()));
        Assert.Throws<ArgumentOutOfRangeException>(() => handle.SetTextInputArea(new ElementRect
        {
            X = double.NaN,
        }));
        Assert.Throws<ArgumentOutOfRangeException>(() => handle.SetTextInputArea(new ElementRect
        {
            Width = -1,
        }));
        Assert.Throws<ArgumentOutOfRangeException>(() => handle.SetTextInputArea(new ElementRect
        {
            X = int.MaxValue,
            Width = 1,
        }));
        Assert.Throws<ArgumentOutOfRangeException>(() => handle.SetTextInputArea(new ElementRect
        {
            X = int.MinValue,
            Width = (double)int.MaxValue * 2,
        }));
    }
}
