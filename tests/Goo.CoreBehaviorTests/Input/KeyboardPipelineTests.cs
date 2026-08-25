using Goo;
using Xunit;

public sealed class KeyboardPipelineTests
{
    [Fact]
    public void KeyboardQueuePreservesOrderAndRepeat()
    {
        Assert.True(new InputFixtures().KeyboardQueueAndRepeatLifecycle());
    }

    [Fact]
    public void ThrowingKeyboardEventIsNotRetried()
    {
        Assert.True(new InputFixtures().KeyboardDrainConsumesThrowingEventOnceAndRetainsRest());
    }

    [Fact]
    public void FocusedEntryRepeatStopsAfterItBecomesUnavailable()
    {
        Assert.True(new InputFixtures().KeyboardRepeatCancelsWhenFocusedEntryBecomesUnavailable());
    }
}
