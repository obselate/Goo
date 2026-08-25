using Goo;
using Xunit;

public sealed class ClipPathInputTests
{
    [Fact]
    public void ClipPathFiltersPointerInput()
    {
        Assert.True(new ClipPathInputFixtures().NormalPointerAcquisitionRespectsClipPath());
    }

    [Fact]
    public void NestedClipPathsIntersect()
    {
        Assert.True(new ClipPathInputFixtures().NestedClipPathsIntersect());
    }

    [Fact]
    public void TransformedClipPathsMapHits()
    {
        Assert.True(new ClipPathInputFixtures().TransformedClipPathUsesMappedCoordinates());
    }

    [Fact]
    public void PointerCaptureContinuesOutsideClipUntilRelease()
    {
        Assert.True(new ClipPathInputFixtures().CaptureContinuesOutsideClipUntilRelease());
    }
}
