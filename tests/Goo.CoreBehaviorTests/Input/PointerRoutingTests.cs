using Goo;
using Xunit;

public sealed class PointerRoutingTests
{
    [Fact]
    public void PointerLifecycleBubblesAndStops()
    {
        Assert.True(new InputFixtures().PointerLifecycleBubblesStopsAndReportsAllMouseButtons());
    }

    [Fact]
    public void PointerCaptureRoutesMiddleDragUntilRelease()
    {
        Assert.True(new InputFixtures().PointerCaptureRoutesMiddleDragUntilRelease());
    }

    [Fact]
    public void TouchContactsKeepIndependentRoutesAndPressedState()
    {
        Assert.True(new InputFixtures().PointerIdentityKeepsContactsIndependent());
    }

    [Fact]
    public void MouseKeepsPrimaryDefaultsWhileTouchIsHeld()
    {
        Assert.True(new InputFixtures().MouseRemainsPrimaryWhileTouchIsHeld());
    }

    [Fact]
    public void PenAndTouchCanReuseTheSameNativeId()
    {
        Assert.True(new InputFixtures().PenIdentityIsDistinctFromTouchIdentity());
    }

    [Fact]
    public void TouchCancelDoesNotClearPreexistingFocus()
    {
        Assert.True(new InputFixtures().TouchCancelRetainsPreexistingFocus());
    }

    [Fact]
    public void TouchPrimaryWaitsForTheEntireDeviceSequence()
    {
        Assert.True(new InputFixtures().TouchPrimaryWaitsForAllContactsToEnd());
    }

    [Fact]
    public void ResetStartsTheNextTouchSequenceWithAPrimaryContact()
    {
        Assert.True(new InputFixtures().PointerResetStartsTheNextTouchSequence());
    }

    [Fact]
    public void PenHoverKeepsContactStateUntilProximityOut()
    {
        Assert.True(new InputFixtures().PenHoverKeepsContactStateUntilCancel());
    }

    [Fact]
    public void PrimaryIdentityAndPressureRemainPerContact()
    {
        Assert.True(new InputFixtures().PointerPrimaryAndPressureContract());
    }

    [Fact]
    public void PointerAndKeyboardPressOwnershipRemainIndependent()
    {
        Assert.True(new InputFixtures().PointerAndKeyboardPressesShareStateSafely());
    }

    [Fact]
    public void ZIndexOrdersHitsWithinBounds()
    {
        Assert.Equal(
            new[]
            {
                "first",
                "first",
                "second",
                "high-parent",
                "clipped-child",
                "",
                "sibling",
                "dynamic",
            },
            new InputFixtures().ZIndexHitOrder());
    }

    [Fact]
    public void TransformsMapPointerInput()
    {
        Assert.True(new InputFixtures().TransformRoutesHitsAndLocalPositions());
    }

    [Fact]
    public void ShapeStrokeHitChangesInvalidateInput()
    {
        Assert.True(new InputFixtures().ShapeStrokeHitChangesInvalidateInputContract());
    }
}
