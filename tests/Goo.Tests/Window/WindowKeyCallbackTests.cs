using Goo;
using Xunit;

public sealed class WindowKeyCallbackTests
{
    [Fact]
    public void KeyCallbackDeliversModifiers()
    {
        Assert.True(new WindowFixtures().KeyCallbackDeliversModifiers());
    }
}
