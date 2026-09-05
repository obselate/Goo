using System;
using System.Reflection;
using System.Runtime.CompilerServices;
using Goo;
using Xunit;

public class StyleResolutionTests
{
    [Fact]
    public void StyleEntryHasOnePayloadReference()
    {
        Assert.Equal(32, Unsafe.SizeOf<StyleEntry>());
    }

    [Fact]
    public void InlineAndSpilledDeclarationsPreserveOrderAndDuplicateWrites()
    {
        Assert.True(new StyleFixtures().DeclarationInlineSpillOrderContract());
    }

    [Fact]
    public void ReusableStylesComposeInOrderAndCanClearGradients()
    {
        Assert.True(new StyleFixtures().OrderedCompositionAndGradientClearContract());
    }

    [Fact]
    public void EqualStateDeclarationsRetainTheirLogAndChangedOverlaysResolve()
    {
        Assert.True(new StyleFixtures().StateStyleRetentionAndEqualityContract());
    }

    [Fact]
    public void ClipPathValidatesAndResolves()
    {
        Assert.Throws<System.ArgumentException>(() =>
            _ = new Style { ClipPath = new PathBuilder().MoveTo(0, 0).Build() });
        Assert.True(new StyleFixtures().ClipPathResolutionStorageAndSnapContract());
    }

    [Fact]
    public void StyleCascadeResetsToDefaults()
    {
        Assert.True(new StyleFixtures().ResolvePrecedenceAndResetContract());
    }

    [Fact]
    public void LogicalEdgesFollowDirection()
    {
        Assert.True(new StyleFixtures().DirectionAndLogicalEdgeContract());
    }

    [Fact]
    public void EdgeShorthandsFollowCascadeOrder()
    {
        Assert.True(new StyleFixtures().ShorthandLogicalCascadeContract());
    }

    [Fact]
    public void BoxShadowsCopyAndReset()
    {
        Assert.True(new StyleFixtures().BoxShadowPrecedenceCopyAndResetContract());
    }

    [Fact]
    public void TextShadowsValidateValues()
    {
        Assert.True(new StyleFixtures().TextShadowValueValidationContract());
    }

    [Fact]
    public void TextShadowsInheritAndClear()
    {
        Assert.True(new StyleFixtures().TextShadowResolutionStorageAndDiffContract());
    }

    [Fact]
    public void TextStrokeValidatesAndResolves()
    {
        Assert.Throws<System.ArgumentOutOfRangeException>(() =>
            _ = new Style { TextStrokeWidth = -1 });
        Assert.Throws<System.ArgumentException>(() =>
            _ = new Style { TextStrokeWidth = Length.Percent(10) });
        Assert.Throws<System.ArgumentException>(() =>
            _ = new Style { TextStrokeWidth = Length.Auto });
        Assert.Throws<System.ArgumentOutOfRangeException>(() =>
            _ = new Style { TextStrokeWidth = double.NaN });
        Assert.True(new StyleFixtures().TextStrokeResolutionStorageAndDiffContract());
    }

    [Fact]
    public void AxisOverflowResets()
    {
        Assert.True(new StyleFixtures().AxisOverflowPrecedenceAndResetContract());
    }

    [Fact]
    public void BorderEdgesHonorCascadeAndReset()
    {
        Assert.True(new StyleFixtures().BorderEdgePrecedenceResetAndMaskContract());
    }

    [Fact]
    public void ShapeStrokeUsesUniformBorders()
    {
        Assert.True(new StyleFixtures().ShapeStrokeShorthandResolutionContract());
    }

    [Fact]
    public void TypographyInheritsAndOverrides()
    {
        Assert.True(new StyleFixtures().TypographyInheritanceContract());
    }

    [Fact]
    public void TextTransformInvalidatesLayout()
    {
        Assert.True(new StyleFixtures().TextTransformInheritanceStateAndCacheContract());
    }

    [Fact]
    public void TextWrapInheritsAndTextTrimmingResets()
    {
        Assert.True(new StyleFixtures().TextWrapAndTrimmingStateInheritanceContract());
    }

    [Fact]
    public void TextMaxLinesUpdatesLayout()
    {
        Assert.Throws<System.ArgumentOutOfRangeException>(() =>
            _ = new Style { TextMaxLines = -1 });
        Assert.True(new StyleFixtures().TextMaxLinesResolutionStateAndCacheContract());
    }

    [Fact]
    public void OutlineDoesNotInherit()
    {
        Assert.True(new StyleFixtures().OutlineStateResetTransitionAndStorageContract());
    }

    [Fact]
    public void VisibilityDoesNotInherit()
    {
        Assert.True(new StyleFixtures().VisibilityStateResetTransitionAndStorageContract());
    }

    [Fact]
    public void TextDecorationInheritsAndClears()
    {
        Assert.True(new StyleFixtures().TextDecorationInheritanceStateAndStorageContract());
    }

    [Fact]
    public void CursorInheritsAcrossStateAndLocalReset()
    {
        Assert.True(new StyleFixtures().CursorInheritanceAndResetContract());
    }

    [Fact]
    public void ZIndexOrdersAndResets()
    {
        Assert.True(new StyleFixtures().ZIndexRangeStateAndResetContract());
    }

    [Fact]
    public void TransformNormalizesAndTransitions()
    {
        Assert.True(new StyleFixtures().TransformStateTransitionAndGeometryContract());

        var identity = default(PanelTransform);
        var equivalent = new PanelTransform
        {
            TranslateX = 0,
            Scale = 1,
        };
        Assert.True(identity == equivalent);
        Assert.True(((object)identity).Equals(equivalent));
        Assert.Equal(identity.GetHashCode(), equivalent.GetHashCode());

        var fullTurn = new PanelTransform { Rotate = 360 };
        Assert.True(fullTurn != identity);
        Assert.False(((object)fullTurn).Equals(identity));

        var percentZero = new PanelTransform { TranslateX = Length.Percent(0) };
        Assert.True(percentZero != identity);
        Assert.True(percentZero.TranslateX.IsPercent);
    }

    [Fact]
    public void EveryStyleFieldHasAResolverContract()
    {
        var styleField = typeof(Style).Assembly.GetType("Goo.StyleField", throwOnError: true)!;
        var contract = typeof(StyleFixtures).GetMethod(
            "StyleFieldExhaustivenessContract",
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic);
        Assert.NotNull(contract);

        var fixtures = new StyleFixtures();
        foreach (var field in Enum.GetValues(styleField))
        {
            Assert.True((bool)contract!.Invoke(fixtures, new[] { field })!, field.ToString());
        }
    }

}
