using System;
using Goo.InternalTextInterop;
using SkiaSharp;
using Xunit;

namespace Goo.Tests.Rendering;

public sealed class TextShapingResourceTests
{
    [Fact]
    public void ShapeRunReleasesTransferredResourcesWhenShapingThrows()
    {
        var releaseCount = 0;
        var resource = new TypefaceResource(
            SKTypeface.FromFamilyName("DejaVu Sans"),
            () => releaseCount++);
        var lease = resource.Lease();

        try
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => ShapeWithInvalidContext(resource, lease));
            resource.Release();
            Assert.Equal(1, releaseCount);
        }
        finally
        {
            lease.Dispose();
            resource.Release();
        }
    }

    private static void ShapeWithInvalidContext(TypefaceResource resource, TypefaceLease lease)
    {
        var cursor = 0f;
        var extra = 0f;
        var hasCluster = false;
        using var run = TextShaping.ShapeRun(
            "a",
            resource.Typeface,
            16f,
            false,
            0,
            0f,
            ref cursor,
            ref extra,
            ref hasCluster,
            "a",
            -1,
            false,
            lease);
    }
}
