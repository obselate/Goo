using Goo;
using Xunit;

public sealed class ScrollbarTests
{
    [Fact]
    public void GeometryRenderingAndVisibilityShareOneContract()
    {
        Assert.True(new ScrollbarFixtures().GeometryRenderingAndVisibilityContract());
    }

    [Fact]
    public void PointerDragUsesImmediateClampedOffsetsAndCancels()
    {
        Assert.True(new ScrollbarFixtures().PointerDragAndCancellationContract());
    }

    [Fact]
    public void WarmThumbDraggingAllocatesNothing()
    {
        Assert.Equal(0, new ScrollbarFixtures().WarmDragBytes());
    }

    [Fact]
    public void PublicMetricsAndJumpExposeCompleteCustomScrollbarMechanism()
    {
        Assert.True(new ScrollbarFixtures().PublicMetricsAndJumpContract());
    }
}
