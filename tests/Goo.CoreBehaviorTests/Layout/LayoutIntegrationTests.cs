using Goo;
using Xunit;

public sealed class LayoutIntegrationTests
{
    [Fact]
    public void ComposedTreeMapsDeclarationsAndRelayouts()
    {
        Assert.True(new LayoutFixtures().ComposedTreeMapsDeclarationsAndRelayouts());
    }

    [Fact]
    public void LayoutIsStableAcrossRoots()
    {
        Assert.True(new LayoutFixtures().LayoutIsStableAcrossRoots());
    }

    [Fact]
    public void StaticPositionIgnoresInsets()
    {
        Assert.True(new LayoutFixtures().StaticPositionIgnoresInsets());
    }

    [Fact]
    public void LogicalEdgesUseLtrAndRtlLayoutDirections()
    {
        Assert.True(new LayoutFixtures().LogicalEdgesRespectDirection());
    }
}
