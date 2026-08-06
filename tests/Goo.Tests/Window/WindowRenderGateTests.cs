using Goo;
using Xunit;

public sealed class WindowRenderGateTests
{
    [Fact]
    public void RenderGateTracksVisualChanges()
    {
        Assert.True(new WindowFixtures().RenderGateTracksVisualChanges());
    }

    [Fact]
    public void OwnedBackgroundSourceChangesTheRenderGateFingerprint()
    {
        Assert.True(new WindowFixtures().OwnedBackgroundSourceRepaints());
    }

    [Fact]
    public void CaretBlinkRepaints()
    {
        Assert.True(new WindowFixtures().CaretBlinkRepaints());
    }

    [Fact]
    public void BidiCaretRepaints()
    {
        Assert.True(new WindowFixtures().BidiCaretRepaints());
    }

    [Fact]
    public void NativeTeardownRetainsTree()
    {
        Assert.True(new WindowFixtures().NativeTeardownRetainsTree());
    }
    [Fact]
    public void InvalidDeltasFail()
    {
        Assert.True(new WindowFixtures().InvalidDeltasFail());
    }
}
