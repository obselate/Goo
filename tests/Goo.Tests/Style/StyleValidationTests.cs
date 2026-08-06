using Goo;
using Xunit;

public class StyleValidationTests
{
    [Fact]
    public void ConstructionNormalizesAndValidates()
    {
        Assert.True(new StyleFixtures().StyleConstructionContract());
    }
}
