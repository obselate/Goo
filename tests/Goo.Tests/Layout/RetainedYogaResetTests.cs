using Goo;
using Xunit;

public sealed class RetainedYogaResetTests
{
    [Theory]
    [InlineData(0)]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(4)]
    public void DiffClearsEachRetainedYogaStyleFamily(int family)
    {
        Assert.True(new LayoutFixtures().RetainedYogaReset(family));
    }
}
