using System;
using Goo;
using Xunit;

public sealed class MotionTests
{
    [Fact]
    public void TweenFactoryUsesExactDurationAndEasing()
    {
        Assert.True(new MotionFixtures().TweenFactoryContract());
        Assert.Throws<ArgumentOutOfRangeException>(() => Motion.Tween(-1.0));
        Assert.Throws<ArgumentOutOfRangeException>(() => Motion.Tween(double.NaN));
        Assert.Throws<ArgumentOutOfRangeException>(() => Motion.Tween(1.0, (Easing)999));
    }

    [Fact]
    public void CallbackAnimationPublishesWithoutRebuilding()
    {
        Assert.True(new MotionFixtures().CallbackAnimationContract());
        Assert.Throws<ArgumentNullException>(() => new Cell().Animate(0.0, (Action<double>)null!));
    }

    [Fact]
    public void RetargetPreservesVelocity()
    {
        Assert.True(new MotionFixtures().RetargetPreservesVelocityContract());
    }

    [Fact]
    public void RetargetAcrossDifferentSpanPreservesRealVelocity()
    {
        Assert.True(new MotionFixtures().RetargetAcrossDifferentSpanPreservesRealVelocityContract());
    }

    [Fact]
    public void LandsAtSimResultNotTarget()
    {
        Assert.True(new MotionFixtures().LandsAtSimResultNotTargetContract());
    }

    [Fact]
    public void ExplicitVelocitySeedsFreshSim()
    {
        Assert.True(new MotionFixtures().ExplicitVelocitySeedsFreshSimContract());
    }

    [Fact]
    public void FinishLandsExactlyOnce()
    {
        Assert.True(new MotionFixtures().FinishLandsExactlyOnTargetContract());
    }

    [Fact]
    public void DisposedCellDeregisters()
    {
        Assert.True(new MotionFixtures().DisposedCellDeregistersContract());
    }

    [Fact]
    public void TimeScaleZeroCompletesInstantly()
    {
        Assert.True(new MotionFixtures().TimeScaleZeroCompletesInstantlyContract());
    }

    [Fact]
    public void PointRetargetCarriesIndependentVelocity()
    {
        Assert.True(new MotionFixtures().PointRetargetCarriesIndependentVelocityContract());
    }

    [Fact]
    public void PointSpecsRouteInConverterOrder()
    {
        Assert.True(new MotionFixtures().PointSpecRoutingContract());
    }

    [Fact]
    public void VelocityRoutesUniformAndComponentSeeds()
    {
        Assert.True(new MotionFixtures().MotionVelocityRoutingContract());
    }

    [Fact]
    public void InvalidVelocityAndSpecInputsLeaveStateUntouched()
    {
        Assert.True(new MotionFixtures().InvalidVelocityAndSpecLeaveStateUntouchedContract());
    }

    [Fact]
    public void ThrowingSpecLeavesAnimationReusable()
    {
        Assert.True(new MotionFixtures().ThrowingSpecLeavesAnimReusableContract());
    }

    [Fact]
    public void TypedColorAnimationHasMidpointAndLanding()
    {
        Assert.True(new MotionFixtures().TypedColorAnimationContract());
    }

    [Fact]
    public void LengthAnimationRejectsInvalidDomains()
    {
        Assert.True(new MotionFixtures().LengthValidationContract());
    }

    [Fact]
    public void SetDuringBuildLeavesAnimationUnchanged()
    {
        Assert.True(new MotionFixtures().SetDuringBuildLeavesAnimUnchangedContract());
    }

    [Fact]
    public void VelocityReportsLiveAndRestingValues()
    {
        Assert.True(new MotionFixtures().VelocityGetterReportsLiveAndRestingVelocityContract());
    }

    [Fact]
    public void VelocityGetterMatchesRetargetSeed()
    {
        Assert.True(new MotionFixtures().VelocityGetterMatchesRetargetSeedContract());
    }

    [Fact]
    public void PointVelocityKeepsDimensions()
    {
        Assert.True(new MotionFixtures().VelocityGetterReportsPerDimensionPointVelocityContract());
    }

    [Fact]
    public void ColorVelocityKeepsComponents()
    {
        Assert.True(new MotionFixtures().VelocityGetterPreservesRawColorComponentsContract());
    }

    [Fact]
    public void MotionVelocityAdditionPreservesShape()
    {
        Assert.True(new MotionFixtures().MotionVelocityAdditionPreservesShapeContract());
    }

    [Fact]
    public void SnapDuringBuildAppliesValue()
    {
        Assert.True(new MotionFixtures().SnapDuringBuildAppliesValueContract());
    }

    [Fact]
    public void SnapStopsAnimation()
    {
        Assert.True(new MotionFixtures().SnapStopsRunningAnimationWithoutInvalidateContract());
    }

    [Fact]
    public void InvalidConvertersFailBeforeRegistration()
    {
        Assert.True(new MotionFixtures().InvalidConverterFailsBeforeRegistrationContract());
    }

    [Fact]
    public void SameClockTimeScaleChangeRecomputesValue()
    {
        Assert.True(new MotionFixtures().SameClockScaleChangeRecomputesValueContract());
    }

    [Fact]
    public void CompletionSeedsNextRetarget()
    {
        Assert.True(new MotionFixtures().ForcedCompletionSeedsNextRetargetFromTargetContract());
    }

    [Fact]
    public void DisposalRetainsPartialProgress()
    {
        Assert.True(new MotionFixtures().DisposeRetainsPartialProgressContract());
    }

    [Fact]
    public void NullSpecsLeaveStateUntouched()
    {
        var original = Motion.Default;
        var anim = new Cell().Animate(0.0);
        try
        {
            Motion.Default = null!;
            Assert.Throws<InvalidOperationException>(() => anim.To(1.0));

            Func<double, double, double, Simulation> selected = null!;
            Assert.Throws<ArgumentNullException>(() => anim.To(1.0, selected));

            Func<double, double, double, Simulation> result = (_, _, _) => null!;
            Assert.Throws<InvalidOperationException>(() => anim.To(1.0, result));

            Assert.False(anim.Running);
            Assert.Equal(0.0, anim.Value);
            Assert.Equal(0.0, anim.Target);
        }
        finally
        {
            Motion.Default = original;
        }
    }

    [Fact]
    public void TimeScaleRejectsNonFiniteValues()
    {
        var original = Motion.TimeScale;
        try
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => Motion.TimeScale = double.NaN);
            Assert.Throws<ArgumentOutOfRangeException>(() => Motion.TimeScale = double.PositiveInfinity);
            Assert.Throws<ArgumentOutOfRangeException>(() => Motion.TimeScale = double.NegativeInfinity);
            Assert.Equal(original, Motion.TimeScale);
        }
        finally
        {
            Motion.TimeScale = original;
        }
    }

    [Fact]
    public void WindowOwnsMotionClock()
    {
        Assert.True(new MotionFixtures().WindowOwnsMotionClockContract());
    }

    [Fact]
    public void PreMountAnimationWaitsForWindow()
    {
        Assert.True(new MotionFixtures().PreMountAnimationWaitsForWindowContract());
    }

    [Fact]
    public void ThrowingTickCanRetry()
    {
        Assert.True(new MotionFixtures().PumpThrowingTickRemainsRegisteredContract());
    }

    [Fact]
    public void ReentrantRegistrationIsDeferred()
    {
        Assert.True(new MotionFixtures().PumpDefersReentrantRegistrationContract());
    }

    [Fact]
    public void DeregisteringOneAnimationKeepsOthers()
    {
        Assert.True(new MotionFixtures().PumpDeregisterStopsLaterParticleContract());
    }

    [Fact]
    public void PumpWakesOnFirstAnimation()
    {
        Assert.True(new MotionFixtures().PumpWakesOnlyOnFirstRegistrationContract());
    }

    [Fact]
    public void SetStopsAndAllowsReuse()
    {
        Assert.True(new MotionFixtures().SetStopsAndAllowsReuseContract());
    }

    [Fact]
    public void ClosingOneWindowDoesNotStopAnother()
    {
        Assert.True(new MotionFixtures().CloseIsolatesWindowPumpContract());
    }

    [Fact]
    public void ReentrantSweepFailsFast()
    {
        Assert.True(new MotionFixtures().PumpRejectsReentrantSweepContract());
    }

    [Fact]
    public void PumpExceptionKeepsDeferredRegistration()
    {
        Assert.True(new MotionFixtures().PumpExceptionPreservesDeferredRegistrationContract());
    }

    [Fact]
    public void CellDisposeContinuesAfterAnimationFailure()
    {
        Assert.True(new MotionFixtures().CellDisposeContinuesAfterPositionFailureContract());
    }

    [Fact]
    public void WindowCloseContinuesAfterAnimationFailure()
    {
        Assert.True(new MotionFixtures().WindowCloseContinuesAfterAnimationFailureContract());
    }

    [Fact]
    public void WindowCloseTraversesSiblingCells()
    {
        Assert.True(new MotionFixtures().WindowCloseTraversesSiblingCellsContract());
    }
}
