using Goo;
using Xunit;

public sealed class TextGeometryTests
{
    [Fact]
    public void StaticTextUsesRetainedWrappedBidiAndTransformedGeometry()
        => Assert.True(new TextGeometryFixtures().StaticTextUsesRetainedWrappedBidiAndTransformedGeometry());

    [Fact]
    public void ElidedTextAndWindowTransformUseVisibleGeometry()
        => Assert.True(new TextGeometryFixtures().ElidedTextAndWindowTransformUseVisibleGeometry());

    [Fact]
    public void EntryUsesVisibleAndContentScrollCoordinates()
        => Assert.True(new TextGeometryFixtures().EntryUsesVisibleAndContentScrollCoordinates());

    [Fact]
    public void EditorUsesStyledProjectedAndVirtualizedGeometry()
        => Assert.True(new TextGeometryFixtures().EditorUsesStyledProjectedAndVirtualizedGeometry());

    [Fact]
    public void UnsupportedAndStaleHandlesReturnFalse()
        => Assert.True(new TextGeometryFixtures().UnsupportedAndStaleHandlesReturnFalse());

    [Fact]
    public void RangeQueriesReportExactCountsForEmptyDestinationsAndRejectInvalidInput()
        => Assert.True(new TextGeometryFixtures().EmptyDestinationAndInvalidArgumentsContract());

    [Fact]
    public void StaticCrLfCaretOffsetsUseRetainedGeometry()
        => Assert.True(new TextGeometryFixtures().CrLfCaretOffsetsUseRetainedStaticGeometry());

    [Fact]
    public void FailedWindowRangeClearsRequired()
        => Assert.True(new TextGeometryFixtures().FailedWindowRangeZeroesRequired());

    [Fact]
    public void StaticGeometryIsDroppedOnDetachAndRebuiltOnlyByNormalLayout()
        => Assert.True(new TextGeometryFixtures().ReattachDropsStaticGeometryUntilNormalLayout());

    [Fact]
    public void LateAttachedEntryAndEditorGeometryIsPreparedBeforeItsFirstQuery()
        => Assert.True(new TextGeometryFixtures().LateAttachEntryAndEditorPrepareGeometry());

    [Fact]
    public void WindowGeometryIncludesTransformedScrolledAncestors()
        => Assert.True(new TextGeometryFixtures().TransformedScrolledAncestorUsesWindowSpace());
}
