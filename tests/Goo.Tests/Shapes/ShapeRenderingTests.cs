using Goo;
using Xunit;

public sealed class ShapeRenderingTests
{
    [Fact]
    public void RendersFillsStrokesFitsArcsAndCorners()
        => Assert.True(new ShapeFixtures().ShapeRenderingContract());

    [Fact]
    public void StrokesUseUniformBorderShorthands()
        => Assert.True(new ShapeFixtures().ShapeStrokeShorthandContract());

    [Fact]
    public void HitTestingUsesFillAndOcclusion()
    {
        var fixtures = new ShapeFixtures();
        Assert.True(fixtures.ShapeHitContract());
        Assert.True(fixtures.ShapeRoundedOcclusionContract());
    }

    [Fact]
    public void GeometryChangesReleaseNativePaths()
        => Assert.True(new ShapeFixtures().ShapeNativeCacheLifetimeContract());

    [Fact]
    public void RoundedDashedShapesKeepOuterShadowPaintOrder()
        => Assert.True(new ShapeFixtures().RoundedDashedShadowContract());

    [Fact]
    public void FlexSizeComesFromTheViewBox()
        => Assert.True(new ShapeFixtures().ShapeFlexLayoutContract());
}
