using Goo;
using Xunit;

public sealed class TextEntryLifecycleTests
{
    [Fact]
    public void TextEntryFocusWinsOverControlledValue()
    {
        Assert.True(new TreeFixtures().TextEntryControlledValueContract());
    }
}
