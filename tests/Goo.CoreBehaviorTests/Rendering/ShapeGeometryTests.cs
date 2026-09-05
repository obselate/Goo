using Goo;
using Xunit;

public sealed class ShapeGeometryTests
{
    [Fact]
    public void OpenContoursUseImplicitFillClosure()
    {
        Assert.True(new ShapeGeometryFixtures().OpenContoursUseImplicitFillClosure());
    }

    [Fact]
    public void OpenContoursRemainOpenForStrokeConstruction()
    {
        Assert.True(new ShapeGeometryFixtures().OpenContoursRemainOpenForStrokeConstruction());
    }

    [Fact]
    public void MutableOpenContoursRefreshImplicitFillClosure()
    {
        Assert.True(new ShapeGeometryFixtures().MutableOpenContoursRefreshImplicitFillClosure());
    }

    [Fact]
    public void GeneratedStrokeMappingUsesFullShapeBounds()
    {
        Assert.True(new ShapeGeometryFixtures().GeneratedStrokeMappingUsesFullShapeBounds());
    }

    [Fact]
    public void VectorViewportPreservesTranslationAndMapsShapeHits()
    {
        Assert.True(new ShapeGeometryFixtures().VectorViewportPreservesTranslationAndMapsShapeHits());
    }
}
