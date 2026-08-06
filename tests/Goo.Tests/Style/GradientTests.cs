using System;
using Goo;
using Xunit;

public sealed class GradientTests
{
    [Fact]
    public void GradientPublicConstructionAndValidation()
    {
        var linear = new LinearGradient(Color.Rgb(26, 42, 108), Color.Rgb(178, 31, 31));
        Assert.Equal(180.0, linear.Angle);
        Assert.Equal(0.0, linear.Stops[0].Offset);
        Assert.Equal(1.0, linear.Stops[1].Offset);

        var stops = new[]
        {
            new GradientStop { Offset = 0.0, Color = Color.Black },
            new GradientStop { Offset = 1.0, Color = Color.White },
        };
        Assert.Throws<ArgumentException>(() => new LinearGradient(Color.White));
        Assert.Throws<ArgumentException>(() => new LinearGradient(90.0, new[] { stops[1], stops[0] }));
        Assert.Throws<ArgumentOutOfRangeException>(() => new GradientStop { Offset = double.NaN });
        Assert.Throws<ArgumentOutOfRangeException>(() => new RadialGradient(0.5, 1.1, 0.5, stops));
    }
}
