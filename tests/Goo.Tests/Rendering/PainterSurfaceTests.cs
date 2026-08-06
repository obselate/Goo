using Goo;
using Xunit;

public sealed class PainterSurfaceTests
{
    [Fact]
    public void PainterRendersBoxesTextAndClipping()
    {
        Assert.True(new RenderingFixtures().PainterRendersSurfaceContracts());
    }

    [Fact]
    public void OffscreenPaintingUsesLinearLight()
    {
        var pixels = new RenderingFixtures().PainterUsesLinearOffscreenColors();

        Assert.InRange(pixels[0] & 0xFFu, 186u, 189u);
        Assert.Equal(0xFF000000u, pixels[0] & 0xFFFFFF00u);
        Assert.Equal(0xFF1E3C5Au, pixels[1]);
    }

    [Fact]
    public void ShadowsFollowBoxAndShapeGeometry()
    {
        var fixtures = new RenderingFixtures();
        Assert.True(fixtures.PainterPlacesShadows());
        Assert.True(fixtures.BoxShadowStackAndInsetContract());
        Assert.True(fixtures.ShapeShadowContract());
        Assert.True(fixtures.ShapeShadowStackAndInsetPixelContract());
    }
}
