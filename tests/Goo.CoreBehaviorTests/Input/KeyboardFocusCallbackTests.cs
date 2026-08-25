using Goo;
using Xunit;

public sealed class KeyboardFocusCallbackTests
{
    [Fact]
    public void KeyboardCallbacksBubbleStopAndRepeat()
    {
        Assert.True(new InputFixtures().KeyboardCallbacksBubbleStopAndRepeat());
    }

    [Fact]
    public void KeyboardDefaultPreventionKeepsExistingDefaultsCorrect()
    {
        Assert.True(new InputFixtures().KeyboardDefaultPreventionPreservesTextAndButtonRelease());
    }

    [Fact]
    public void KeyboardCallbackFailuresCleanUpState()
    {
        Assert.True(new InputFixtures().KeyboardCallbackFailuresCleanUpAndKeepQueuedSuffix());
    }

    [Fact]
    public void CallbackReplacementUsesNewestDelegateWithoutInputInvalidation()
    {
        Assert.True(new InputFixtures().CallbackReplacementUsesNewestDelegateWithoutInputEffect());
    }

    [Fact]
    public void RoutedKeyCallbackRebuildCanStayPresentationIdle()
    {
        Assert.True(new InputFixtures().RoutedKeyCallbackRebuildStaysPresentationIdle());
    }

    [Fact]
    public void GenericTextCallbackRebuildCanStayPresentationIdle()
    {
        Assert.True(new InputFixtures().GenericTextCallbackRebuildStaysPresentationIdle());
    }

    [Fact]
    public void FocusCallbacksCoverForcedLossAndReentry()
    {
        Assert.True(new InputFixtures().FocusCallbacksCoverUnavailableRemovalAndReentry());
    }
}
