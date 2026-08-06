using Goo;
using Xunit;

public sealed class DisplayTests
{
    [Fact]
    public void DisplayNoneRemovesPaintInputFocusAndKeepsState()
    {
        var fixtures = new TreeFixtures();
        Assert.True(fixtures.DisplayNonePaintContract());
        Assert.True(fixtures.DisplayNonePointerContract());
        Assert.True(fixtures.DisplayNoneFocusContract());
        Assert.True(fixtures.DisplayNoneLifecycleContract());
    }

    [Fact]
    public void HiddenVisibilitySkipsPaintInputAndFocus()
    {
        var fixtures = new TreeFixtures();
        Assert.True(fixtures.VisibilityPaintAndLayoutContract());
        Assert.True(fixtures.VisibilityPointerContract());
        Assert.True(fixtures.VisibilityFocusContract());
        Assert.True(fixtures.VisibilityLifecycleContract());
    }
}
