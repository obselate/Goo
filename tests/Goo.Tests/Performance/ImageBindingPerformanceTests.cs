using System;
using System.Diagnostics;
using Goo;
using Xunit;
public sealed class ImageBindingPerformanceTests {
    private const long Warmup = 64, Iterations = 4096, Samples = 7, DirectBudget = 233, BackgroundBudget = 136;
    [Fact]
    public void RetainedImageSourceReplacementHasNoAllocationRegression() {
        using ImageSource first = new(1, 1, new byte[] { 255, 0, 0, 255 }), second = new(1, 1, new byte[] { 0, 0, 255, 255 });
        var reconciler = new Reconciler { Res = new Resolver() };
        var direct = Measure(reconciler, new Image { Key = "image", Source = first }, new Image { Key = "image", Source = second });
        var background = Measure(reconciler, new Container { Key = "background", BackgroundImageSource = first }, new Container { Key = "background", BackgroundImageSource = second });
        Console.WriteLine($"image-binding direct alloc={string.Join(',', direct.bytes)} median-us={direct.us[3]:F2}; background alloc={string.Join(',', background.bytes)} median-us={background.us[3]:F2}");
        Assert.All(direct.bytes, bytes => Assert.InRange(bytes, 0, DirectBudget));
        Assert.All(background.bytes, bytes => Assert.InRange(bytes, 0, BackgroundBudget));
        Assert.All(new[] { first.ActiveLeases, second.ActiveLeases }, leases => Assert.Equal(0, leases));
    }
    private static (long[] bytes, double[] us) Measure(Reconciler reconciler, Blob first, Blob second) {
        Node node = reconciler.Mount(first);
        var (bytes, us) = (new long[(int)Samples], new double[(int)Samples]);
        try {
            for (var sample = 0; sample < Samples; sample++) {
                for (var i = 0; i < Warmup; i++) node = reconciler.Diff(node, (i & 1) == 0 ? first : second);
                GC.Collect(2, GCCollectionMode.Forced, true, true);
                var (before, start) = (GC.GetAllocatedBytesForCurrentThread(), Stopwatch.GetTimestamp());
                for (var i = 0; i < Iterations; i++) node = reconciler.Diff(node, (i & 1) == 0 ? first : second);
                bytes[sample] = (GC.GetAllocatedBytesForCurrentThread() - before) / Iterations;
                us[sample] = (Stopwatch.GetTimestamp() - start) * 1_000_000.0 / Stopwatch.Frequency / Iterations;
            }
            Array.Sort(us);
            return (bytes, us);
        } finally {
            TextLayouts.DisposeTree(node);
        }
    }
}
