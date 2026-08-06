using System;
using System.Collections.Generic;
using Goo;
using Xunit;

public sealed class ShapeValidationTests
{
    [Theory]
    [InlineData("path-numbers")]
    [InlineData("path-command")]
    [InlineData("path-sealed")]
    [InlineData("polyline")]
    [InlineData("dash-normalization")]
    [InlineData("dash-solid-offset")]
    [InlineData("dash-invalid")]
    [InlineData("shape-numbers")]
    [InlineData("shape-stroke")]
    public void ShapeInputsRejectInvalidValuesAndNormalizeDashes(string scenario)
    {
        switch (scenario)
        {
            case "path-numbers":
                Assert.Throws<ArgumentOutOfRangeException>(() => new PathBuilder().MoveTo(double.NaN, 0));
                Assert.Throws<ArgumentOutOfRangeException>(() => new PathBuilder().MoveTo(double.PositiveInfinity, 0));
                Assert.Throws<ArgumentOutOfRangeException>(() => new PathBuilder().MoveTo(double.MaxValue, 0));
                Assert.Throws<ArgumentOutOfRangeException>(() => new PathBuilder().MoveTo(0, 0).ArcTo(-1, 1, 0, false, true, 1, 1));
                Assert.Throws<ArgumentOutOfRangeException>(() => new PathBuilder().MoveTo(0, 0).ArcTo(double.MaxValue, 1, 0, false, true, 1, 1));
                Assert.Throws<ArgumentOutOfRangeException>(() => new PathBuilder(0, 0, 0, 1));
                Assert.Throws<ArgumentOutOfRangeException>(() => new PathBuilder(0, 0, double.MaxValue, 1));
                break;
            case "path-command":
                Assert.Throws<InvalidOperationException>(() => new PathBuilder().LineTo(1, 1));
                Assert.Throws<InvalidOperationException>(() => new PathBuilder().QuadraticTo(0, 0, 1, 1));
                Assert.Throws<InvalidOperationException>(() => new PathBuilder().CubicTo(0, 0, 1, 1, 2, 2));
                Assert.Throws<InvalidOperationException>(() => new PathBuilder().ArcTo(1, 1, 0, false, true, 2, 2));
                Assert.Throws<InvalidOperationException>(() => new PathBuilder().Close());
                Assert.Throws<InvalidOperationException>(() => new PathBuilder().MoveTo(0, 0).Close().LineTo(1, 1));
                break;
            case "path-sealed":
                var builder = new PathBuilder().MoveTo(0, 0);
                builder.Build();
                Assert.Throws<InvalidOperationException>(() => builder.LineTo(1, 1));
                Assert.Throws<InvalidOperationException>(() => builder.Build());
                break;
            case "polyline":
                Assert.Throws<ArgumentException>(() => new PathBuilder().Polyline(new[] { new Point { X = 0, Y = 0 } }, false));
                Assert.Throws<ArgumentException>(() => new PathBuilder().Polyline(Array.Empty<Point>(), true));
                Assert.Throws<ArgumentOutOfRangeException>(() => new PathBuilder().Polyline(
                    new[] { new Point { X = double.NaN, Y = 0 }, new Point { X = 1, Y = 1 } }, false));
                break;
            case "dash-normalization":
                var source = new[] { 2.0, 3.0, 5.0 };
                var pattern = new DashPattern(source, 1.5);
                source[0] = 99.0;
                Assert.Equal(new[] { 2.0, 3.0, 5.0, 2.0, 3.0, 5.0 }, pattern.Intervals);
                Assert.Equal(1.5, pattern.Offset);
                var intervals = Assert.IsAssignableFrom<IList<double>>(pattern.Intervals);
                Assert.Throws<NotSupportedException>(() => intervals[0] = 7.0);
                break;
            case "dash-solid-offset":
                Assert.Empty(new DashPattern(Array.Empty<double>(), 0.0).Intervals);
                Assert.Equal(-1.0, new DashPattern(new[] { 1.0, 2.0 }, -1.0).Offset);
                break;
            case "dash-invalid":
                Assert.Throws<ArgumentOutOfRangeException>(() => new DashPattern(new[] { -1.0 }, 0.0));
                Assert.Throws<ArgumentOutOfRangeException>(() => new DashPattern(new[] { double.NaN }, 0.0));
                Assert.Throws<ArgumentOutOfRangeException>(() => new DashPattern(new[] { double.PositiveInfinity }, 0.0));
                Assert.Throws<ArgumentOutOfRangeException>(() => new DashPattern(new[] { double.MaxValue }, 0.0));
                Assert.Throws<ArgumentOutOfRangeException>(() => new DashPattern(new[] { 1.0 }, double.MaxValue));
                Assert.Throws<ArgumentOutOfRangeException>(() => new DashPattern(new[] { 1.0, 2.0 }, double.NaN));
                Assert.Throws<ArgumentOutOfRangeException>(() => new DashPattern(new[] { 1.0, 2.0 }, double.PositiveInfinity));
                Assert.Throws<ArgumentException>(() => new DashPattern(new[] { 0.0, 0.0 }, 0.0));
                break;
            case "shape-numbers":
                Assert.Throws<ArgumentOutOfRangeException>(() => new Shape { MiterLimit = -1.0 });
                Assert.Throws<ArgumentOutOfRangeException>(() => new Shape { MiterLimit = double.MaxValue });
                Assert.Throws<ArgumentOutOfRangeException>(() => new Shape { CornerRadius = -1.0 });
                Assert.Throws<ArgumentOutOfRangeException>(() => new Shape { CornerRadius = double.NaN });
                Assert.Throws<ArgumentOutOfRangeException>(() => new Shape { CornerRadius = double.PositiveInfinity });
                Assert.Throws<ArgumentOutOfRangeException>(() => new Shape { CornerRadius = double.MaxValue });
                break;
            case "shape-stroke":
                Assert.Throws<ArgumentException>(() => new Reconciler { Res = new Resolver() }
                    .Mount(new Shape { BorderWidth = Length.Percent(10) }));
                break;
            default:
                throw new ArgumentOutOfRangeException(nameof(scenario));
        }
    }
}
