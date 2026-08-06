using Goo;
using Xunit;

public sealed class TextEntryRenderingTests
{
    [Fact]
    public void TextEntryPaintsInteractiveAlignedAndClippedStates()
    {
        Assert.True(new RenderingFixtures().TextEntryHonorsMetricsAndClipsContent());
    }
}
