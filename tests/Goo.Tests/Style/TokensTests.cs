using System;
using Goo;
using Xunit;

public class TokensTests
{
    [Fact]
    public void TokensAreLexicalAndComposeSynchronousComponents()
    {
        var outer = new AppTokens("outer", 8);
        var inner = new AppTokens("inner", 16);
        var metrics = new MetricsTokens(24);

        var result = Tokens.Scope(outer, () =>
        {
            Assert.Same(outer, Tokens.Get<AppTokens>());
            var nested = Tokens.Scope(inner, () =>
            {
                Assert.Same(inner, Tokens.Get<AppTokens>());
                return Tokens.Scope(metrics, () =>
                {
                    Assert.Same(inner, Tokens.Get<AppTokens>());
                    Assert.Same(metrics, Tokens.Get<MetricsTokens>());
                    return Tokens.Get<AppTokens>().SpaceMedium + Tokens.Get<MetricsTokens>().SidebarWidth;
                });
            });
            Assert.Same(outer, Tokens.Get<AppTokens>());
            return nested;
        });

        Assert.Equal(40, result);
        Assert.Throws<InvalidOperationException>(() => Tokens.Get<AppTokens>());
        Assert.Throws<InvalidOperationException>(() => Tokens.Get<MetricsTokens>());
        Assert.Throws<InvalidOperationException>(() =>
            Tokens.Scope<AppTokens, int>(outer, () => throw new InvalidOperationException("boom")));
        Assert.Throws<InvalidOperationException>(() => Tokens.Get<AppTokens>());
        Assert.True(new StyleFixtures().TokenCompositionContract());
    }

    private sealed record AppTokens(string Surface, int SpaceMedium);

    private sealed record MetricsTokens(int SidebarWidth);
}
