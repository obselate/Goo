using Goo;
using Xunit;

public sealed class WindowTransparencyTests
{
    [Theory]
    [InlineData(3u, true, 2)]
    [InlineData(3u, false, 1)]
    [InlineData(4u, true, 0)]
    [InlineData(4u, false, 4)]
    public void CompositeAlphaMatchesWindowContract(uint supported, bool transparent, int expected)
    {
        Assert.Equal(expected, VulkanWindowTarget.SelectCompositeAlpha(supported, transparent));
    }
}
