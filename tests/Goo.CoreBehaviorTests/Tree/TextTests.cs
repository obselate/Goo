using Goo;
using Xunit;

public sealed class TextTests
{
    [Fact]
    public void ContentConstructorSetsDisplayedText()
    {
        Assert.Equal("hello", new Text("hello").Content);
    }
}
