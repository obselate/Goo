using Goo;
using Xunit;

public sealed class DragDropTests
{
    [Fact]
    public void ThresholdNegotiationTargetingAndClickContract()
    {
        Assert.True(new DragDropFixtures().ThresholdNegotiationTargetingAndClickContract());
    }

    [Fact]
    public void CancellationContactAndCleanupContract()
    {
        Assert.True(new DragDropFixtures().CancellationContactAndCleanupContract());
    }

    [Fact]
    public void RemovalDisableAndResetContract()
    {
        Assert.True(new DragDropFixtures().RemovalDisableAndResetContract());
    }

    [Fact]
    public void CallbackFailureTerminatesAndDoesNotRetry()
    {
        Assert.True(new DragDropFixtures().CallbackFailureTerminatesAndDoesNotRetry());
    }

    [Fact]
    public void DropMutationAndPayloadOwnershipContract()
    {
        Assert.True(new DragDropFixtures().DropMutationAndPayloadOwnershipContract());
    }

    [Fact]
    public void ArbitrationReentrantResetAndCaptureCleanupContract()
    {
        Assert.True(new DragDropFixtures().ArbitrationReentrantResetAndCaptureCleanupContract());
    }

    [Fact]
    public void DescriptorReplacementRequeriesStationarySession()
    {
        Assert.True(new DragDropFixtures().DescriptorReplacementRequeriesStationarySession());
    }

    [Fact]
    public void WarmNoDragDrainAllocatesZero()
    {
        Assert.Equal(0, new DragDropFixtures().WarmNoDragDrainAllocatesZero());
    }
}
