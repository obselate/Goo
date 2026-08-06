using Goo;
using Xunit;

public sealed class SdlKeyAdapterTests
{
    [Fact]
    public void EverySdl3HostKeyMapsToItsGooKey()
    {
        Assert.True(new InputFixtures().Sdl3KeyAdapterMapsAllKeysAndModifiers());
    }
}
