using System;
using Goo;
using Xunit;

public sealed class VectorPathTests
{
    [Fact]
    public void VectorPathGrammarAndValueSemantics()
    {
        var empty = VectorPath.Empty;
        Assert.Equal(0d, empty.ViewBoxX);
        Assert.Equal(0d, empty.ViewBoxY);
        Assert.Equal(1d, empty.ViewBoxWidth);
        Assert.Equal(1d, empty.ViewBoxHeight);

        var builder = new PathBuilder(0, 0, 20, 10)
            .MoveTo(0, 0)
            .QuadraticTo(1, 2, 3, 4)
            .CubicTo(5, 6, 7, 8, 9, 10)
            .ArcTo(2, 3, 45, true, false, 11, 12)
            .Close()
            .MoveTo(12, 0)
            .LineTo(20, 10);
        var first = builder.Build();
        Assert.Throws<InvalidOperationException>(() => builder.LineTo(1, 1));
        Assert.Throws<InvalidOperationException>(() => builder.Build());

        var second = BuildPath();
        var differentViewBox = new PathBuilder(0, 0, 30, 10)
            .MoveTo(0, 0)
            .QuadraticTo(1, 2, 3, 4)
            .CubicTo(5, 6, 7, 8, 9, 10)
            .ArcTo(2, 3, 45, true, false, 11, 12)
            .Close()
            .MoveTo(12, 0)
            .LineTo(20, 10)
            .Build();
        var different = new PathBuilder(0, 0, 20, 10).MoveTo(0, 0).LineTo(8, 4).Build();
        Assert.Equal(first, second);
        Assert.Equal(first.GetHashCode(), second.GetHashCode());
        Assert.NotEqual(first, differentViewBox);
        Assert.NotEqual(first, different);

        var positiveZero = new PathBuilder(0d, 0d, 1d, 1d)
            .MoveTo(0d, 0d).LineTo(1d, 1d).Build();
        var negativeZero = new PathBuilder(-0d, -0d, 1d, 1d)
            .MoveTo(-0d, -0d).LineTo(1d, 1d).Build();
        Assert.Equal(positiveZero, negativeZero);
        Assert.Equal(positiveZero.GetHashCode(), negativeZero.GetHashCode());

        var points = new[]
        {
            new Point { X = 0, Y = 0 },
            new Point { X = 4, Y = 0 },
            new Point { X = 4, Y = 3 },
        };
        var open = new PathBuilder(0, 0, 4, 3).Polyline(points, close: false).Build();
        var closed = new PathBuilder(0, 0, 4, 3).Polyline(points, close: true).Build();
        var explicitOpen = new PathBuilder(0, 0, 4, 3).MoveTo(0, 0).LineTo(4, 0).LineTo(4, 3).Build();
        var explicitClosed = new PathBuilder(0, 0, 4, 3).MoveTo(0, 0).LineTo(4, 0).LineTo(4, 3).Close().Build();
        Assert.Equal(explicitOpen, open);
        Assert.Equal(explicitClosed, closed);
        Assert.NotEqual(open, closed);
    }

    private static VectorPath BuildPath() => new PathBuilder(0, 0, 20, 10)
        .MoveTo(0, 0)
        .QuadraticTo(1, 2, 3, 4)
        .CubicTo(5, 6, 7, 8, 9, 10)
        .ArcTo(2, 3, 45, true, false, 11, 12)
        .Close()
        .MoveTo(12, 0)
        .LineTo(20, 10)
        .Build();
}
