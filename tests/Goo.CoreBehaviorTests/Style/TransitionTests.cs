using System;
using Goo;
using Xunit;

public class TransitionTests
{
    [Fact]
    public void ValuesInterpolateRetargetAndLand()
    {
        Assert.True(new StyleFixtures().TransitionInterpolationAndRetargetContract());
    }

    [Fact]
    public void ShadowListsInterpolateAndSnapInsetChanges()
    {
        Assert.True(new StyleFixtures().BoxShadowTransitionContract());
    }

    [Fact]
    public void DelayAndSelectionControlTimingAndScope()
    {
        Assert.True(new StyleFixtures().TransitionDelayAndPropertySelectionContract());
    }

    [Fact]
    public void BorderShorthandsTransitionShapeStroke()
    {
        Assert.True(new StyleFixtures().ShapeStrokeTransitionContract());
    }

    [Fact]
    public void PropertiesValidateAndKeepStableDefaults()
    {
        Assert.True(new StyleFixtures().TransitionDeclarationContract());
    }

    [Fact]
    public void PropertiesRoundTripExceptAll()
    {
        var tested = 0;
        foreach (var property in Enum.GetValues<TransitionProperty>())
        {
            if (property == TransitionProperty.All)
            {
                continue;
            }

            var roundTrip = new Container
            {
                TransitionProperties = new[] { property },
            }.TransitionProperties;

            Assert.Single(roundTrip);
            Assert.Equal(property, roundTrip[0]);
            tested++;
        }

        Assert.Equal(Enum.GetValues<TransitionProperty>().Length - 1, tested);
    }

    [Fact]
    public void EdgeShorthandsSelectPhysicalSides()
    {
        Assert.True(new StyleFixtures().ShorthandTransitionSelectionContract());
    }

    [Fact]
    public void SideBorderTransitionsDoNotAnimateShapeStroke()
    {
        Assert.True(new StyleFixtures().ShapeSideTransitionSelectorsSnapUniformStrokeContract());
    }

    [Fact]
    public void BlobEasingReachesMountedTransition()
    {
        Assert.True(new StyleFixtures().TransitionBlobEasingContract());
    }

    [Fact]
    public void DiscreteValuesSnapAndReturnToDefaults()
    {
        Assert.True(new StyleFixtures().TransitionSnapAndResetContract());
    }

    [Fact]
    public void StateOnlyComplexValuesTransitionBackToDefaults()
    {
        Assert.True(new StyleFixtures().StateOnlyTransitionFallbackContract());
    }

    [Fact]
    public void RetargetKeepsStartingTiming()
    {
        Assert.True(new StyleFixtures().TransitionTimingSnapshotContract());
    }

}
