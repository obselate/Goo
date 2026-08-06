using Goo;
using Xunit;

public sealed class ScrollInteractionTests
{
    [Fact]
    public void NestedWheelUsesDeepestScrollable()
    {
        Assert.True(new InputFixtures().NestedWheelOwnershipAndBoundary());
    }

    [Fact]
    public void UnhandledWheelDoesNotChangePresentation()
    {
        Assert.True(new InputFixtures().UnhandledWheelStaysPresentationIdle());
    }

    [Fact]
    public void OffsetSurvivesStateDrivenRebuild()
    {
        Assert.True(new InputFixtures().ScrollStateSurvivesRebuild());
    }

    [Fact]
    public void AxisOverflowSeparatesWheelRoutingAndHitClipping()
    {
        Assert.True(new InputFixtures().AxisOverflowInteractionContract());
    }

    [Fact]
    public void MacWheelUsesTenPointUnits()
    {
        Assert.True(new InputFixtures().MacWheelUnitScrollsTenPerUnit());
    }
}
