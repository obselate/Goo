using Goo;
using Xunit;

[Collection("Image decoding")]
public sealed class BackgroundImageTests
{
    [Fact]
    public void FitsLayerAndClipWithoutLayout()
    {
        Assert.True(new BackgroundImageFixtures().BoxPaintFitClipLayerAndLayoutContract());
    }

    [Fact]
    public void ClosedShapesUseTightBoundsAndPathClipping()
    {
        Assert.True(new BackgroundImageFixtures().ShapePaintsToTightBoundsAndClipsToClosedPath());
    }

    [Fact]
    public void StateStylesSnapResetAndStayIsolated()
    {
        Assert.True(new BackgroundImageFixtures().StateStyleSnapResetAndSeparateResourceContract());
    }

    [Fact]
    public void StaleAsyncCompletionsAreIgnored()
    {
        Assert.True(new BackgroundImageFixtures().AsyncCompletionIgnoresStaleAndRetiredBackgroundResources());
    }

    [Fact]
    public void EvictedImagesRemainPaintable()
    {
        Assert.True(new BackgroundImageFixtures().CacheEvictionKeepsAttachedBackgroundPaintable());
    }

    [Fact]
    public void ProviderSourcesPreservePathStateAndReleaseLeases()
    {
        Assert.True(new BackgroundImageFixtures().ProviderSourcesRespectStatePrecedenceAndLifecycle());
    }

    [Fact]
    public void OwnedSourceUsesTheExistingBackgroundPaintPath()
    {
        Assert.True(new BackgroundImageFixtures().OwnedSourceUsesTheBackgroundPaintPath());
    }

    [Fact]
    public void ProviderBackgroundSourcesCompleteFailAndReplaceDeterministically()
    {
        Assert.True(new BackgroundImageFixtures().ProviderBackgroundCompletionFailureAndReplacementContract());
    }

}
