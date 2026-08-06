using Goo;
using Xunit;

public sealed class TextInputPrimitivesTests
{
    [Fact]
    public void GenericCallbacksReceiveUtf16SafeCompositionAndCandidatePayloads()
        => Assert.True(new TextInputPrimitivesFixtures().GenericCallbacksReceiveNormalizedUtf16Payloads());

    [Fact]
    public void StaleTextEventsDropAcrossTransfersIncludingFocusCycles()
        => Assert.True(new TextInputPrimitivesFixtures().StaleTextEventsDropAcrossTransfersAndFocusCycles());

    [Fact]
    public void BuiltInDefaultsPrecedeObserversAndObserverFailuresRetainSuffix()
        => Assert.True(new TextInputPrimitivesFixtures().BuiltInDefaultsPrecedeThrowingObserversAndRetainQueuedSuffix());

    [Fact]
    public void DisabledHiddenAndRemovedFocusedClientsDropQueuedText()
        => Assert.True(new TextInputPrimitivesFixtures().UnavailableOrRemovedFocusedClientsDropQueuedText());

    [Fact]
    public void TextCallbackStateIsOptIn()
        => Assert.True(new TextInputPrimitivesFixtures().TextCallbackStateStaysAbsentUntilConfigured());

    [Fact]
    public void KeyboardAndTextCallbacksSynchronizeTogetherOnOneDiff()
        => Assert.True(new TextInputPrimitivesFixtures().SameDiffKeyboardAndTextCallbacksStaySynchronized());

    [Fact]
    public void MountedCustomContainerReceivesTextImeAndOwnsItsImeArea()
        => Assert.True(new TextInputPrimitivesFixtures().MountedCustomContainerContract());

    [Fact]
    public void NativeTextInputTransitionsRemainIdempotentAcrossClientChanges()
        => Assert.True(new TextInputPrimitivesFixtures().NativeTextInputLifecycleContract());
}
