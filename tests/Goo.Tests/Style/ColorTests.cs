using System;
using Goo;
using Xunit;

public class ColorTests
{
    [Fact]
    public void CanonicalizesAndRejectsInvalidInput()
    {
        var transparent = default(Color);
        Assert.Equal(0f, transparent.R);
        Assert.Equal(0f, transparent.G);
        Assert.Equal(0f, transparent.B);
        Assert.Equal(0f, transparent.A);

        var expected = Color.Rgba(255, 136, 0, 204);
        Assert.Equal(Color.Rgb(255, 136, 0), Color.Parse("#f80"));
        Assert.Equal(expected, Color.Parse("#f80c"));
        Assert.Equal(Color.Rgb(255, 136, 0), Color.Parse("#ff8800"));
        Assert.Equal(expected, Color.Parse("#ff8800cc"));

        Color implicitColor = "ReD";
        Assert.Equal(Color.Rgb(255, 0, 0), implicitColor);

        var clamped = Color.Rgba(-10, 512, 128, 999);
        Assert.Equal(0f, clamped.R);
        Assert.Equal(1f, clamped.G);
        Assert.Equal(128f / 255f, clamped.B, 4);
        Assert.Equal(1f, clamped.A);
        Assert.Equal(1f, Color.Rgb(12, 34, 56).WithAlpha(2.0).A);
        Assert.Throws<ArgumentOutOfRangeException>(() => Color.Black.WithAlpha(double.NaN));

        foreach (var text in new[] { "#12", "#ggg", "rgb(1, 2, 3)" })
        {
            Assert.Null(Color.TryParse(text));
            Assert.Throws<FormatException>(() => Color.Parse(text));
        }
    }
}
