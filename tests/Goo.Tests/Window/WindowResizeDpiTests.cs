using Goo;
using Xunit;

public sealed class WindowResizeDpiTests
{
    [Fact]
    public void ResizeAndDpiUpdatePresentation()
    {
        Assert.True(new WindowFixtures().FrameAndResize());
    }

    [Fact]
    public void MetricsReportLogicalSizesAndZeroFramebufferPolicy()
        => Assert.True(new WindowFixtures().MetricsContract());

    [Fact]
    public void WindowMetricsResubscribeGetsANewInitialSnapshot()
        => Assert.True(new WindowFixtures().MetricsResubscribeContract());
}
