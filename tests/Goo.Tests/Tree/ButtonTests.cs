using Goo;
using Xunit;

public sealed class ButtonTests
{
    [Fact]
    public void ButtonKeepsSemanticIdentityAndAuthorStyles()
    {
        Assert.True(new TreeFixtures().ButtonSemanticPrimitiveContract());
    }

    [Fact]
    public void ButtonKeepsImplicitDefaultsBeforeSpilledAuthorStyles()
    {
        Assert.True(new TreeFixtures().ButtonStyleSpillContract());
    }
}
