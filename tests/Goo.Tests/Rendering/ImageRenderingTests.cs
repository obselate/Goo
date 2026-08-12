using System;
using System.Collections.Generic;
using System.IO;
using System.Threading;
using System.Threading.Tasks;
using Goo;
using Goo.InternalTextInterop;
using SkiaSharp;
using Xunit;

[CollectionDefinition("Image decoding", DisableParallelization = true)]
public sealed class ImageDecodingCollection { }
[Collection("Image decoding")] public sealed class ImageRenderingTests
{
    [Fact] public void DecodedImagesUseIntrinsicSizingFitAndBlobSurface() =>
        WithImage(image => Assert.True(new ImageFixtures().DecodedImageSurface(image.Path)));
    [Fact] public void EmptyImagePathDoesNotCreateARequest() => Assert.True(new ImageFixtures().EmptyPathContract());
    [Fact] public void RequestsSharePathsAndFailuresKeepLayout() =>
        WithImage(image => Assert.True(new ImageFixtures().ImageCanonicalPathContract(
            image.Path,
            Path.GetRelativePath(Environment.CurrentDirectory, image.Path),
            Path.Combine(image.Directory, "missing.png"))));
    [Fact] public void AttachedImagesStayPaintableAfterCacheEviction() =>
        Assert.True(new ImageFixtures().ByteEvictionKeepsAttachedImagePaintable());
    [Fact] public void CompletionUpdatesLayoutAndIgnoresRemovals() =>
        Assert.True(new ImageFixtures().ImageCompletionContract(Path.Combine(
            Path.GetTempPath(),
            "goo-image-tests",
            Guid.NewGuid().ToString("N"),
            "missing.png")));
    [Fact] public void OwnedSourcesShareAcrossImageAndBackgroundUntilBothUnmount() =>
        Assert.True(new ImageFixtures().OwnedSourcesShareLifetimeAndPaint());
    [Fact] public void ProviderSourcesReleaseStaleBindingsAndContainFailures() =>
        Assert.True(new ImageFixtures().ProviderReplacementCompletionFailureAndReleaseContract());
    [Fact] public void OwnedSourceInputIsExactAndOverflowSafe() => Assert.True(new ImageFixtures().OwnedSourceInputContract());
    [Fact] public void OwnedSourceCopiesPixelsAtConstruction() => Assert.True(new ImageFixtures().OwnedSourceCopiesPixels());
    [Fact] public void OwnedSourceAndLeaseSynchronizationCostStaysBounded()
    {
        var pixels = new byte[] { 255, 0, 0, 255 };
        for (var i = 0; i < 8; i++)
        {
            using var source = new ImageSource(1, 1, pixels);
            using var lease = source.Acquire();
        }
        var before = GC.GetAllocatedBytesForCurrentThread();
        using (var source = new ImageSource(1, 1, pixels))
        using (var lease = source.Acquire())
        {
        }
        var bytes = GC.GetAllocatedBytesForCurrentThread() - before;
        Assert.Equal(408, bytes);
    }
    [Fact] public void ThrowingCompletionCallbackLeavesLeaseReleasable() =>
        Assert.True(new ImageFixtures().CompletionCallbackExceptionLeavesLeaseReleasable());
    [Fact] public void OwnedSourceRejectsClrNullInputs()
    {
        Assert.Throws<ArgumentNullException>(() => new ImageSource(1, 1, null!));
        using var lease = new ImageSourceLease();
        Assert.Throws<ArgumentNullException>(() => lease.Complete(null!));
    }
    [Fact] public void ProviderCompletionReconcilesThroughWindowAndDisposedLeasesFail() =>
        Assert.True(new ImageFixtures().ProviderWindowCompletionAndDisposedLeaseContract());
    [Fact]
    public void SyntheticDecodeAdmissionUsesExactlyTwoWorkers()
    {
        ImageDecoding.ResetForTests();
        ImageDecoding.UseSyntheticDecoderForTests(true);
        var gate = new TaskCompletionSource<bool>(TaskCreationOptions.RunContinuationsAsynchronously);
        ImageDecoding.SetDecodeGateForTests(gate.Task);
        var requests = new List<ImageRequest>();
        const int requestCount = 5;
        try
        {
            for (var i = 0; i < requestCount; i++)
                requests.Add(ImageDecoding.Request($"synthetic-admission-{i}"));

            Assert.True(SpinWait.SpinUntil(
                () => ImageDecoding.PendingDecodeCountForTests()
                    == requestCount - ImageDecoding.DecodeWorkerCountForTests(),
                TimeSpan.FromSeconds(2)));
            Assert.Equal(2, ImageDecoding.DecodeWorkerCountForTests());
            Assert.Equal(requestCount - 2, ImageDecoding.PendingDecodeCountForTests());

            gate.SetResult(true);
            foreach (var request in requests)
                Assert.True(request.Wait().IsValid);
        }
        finally
        {
            gate.TrySetResult(true);
            foreach (var request in requests)
            {
                try
                {
                    request.Wait();
                }
                catch
                {
                }
                request.Release();
            }
            ImageDecoding.ClearDecodeGateForTests();
            ImageDecoding.ResetForTests();
        }
    }
    private static void WithImage(Action<TempImage> check)
    {
        using var image = TempImage.Create();
        check(image);
    }
    private sealed class TempImage(string directory, string path) : IDisposable
    {
        public string Directory { get; } = directory;
        public string Path { get; } = path;
        public static TempImage Create()
        {
            var directory = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "goo-image-tests", Guid.NewGuid().ToString("N"));
            System.IO.Directory.CreateDirectory(directory);
            var path = System.IO.Path.Combine(directory, "fixture.png");
            using var bitmap = new SKBitmap(20, 10, SKColorType.Rgba8888, SKAlphaType.Premul);
            using var canvas = new SKCanvas(bitmap);
            canvas.Clear(SKColors.Red);
            using var blue = new SKPaint { Color = SKColors.Blue };
            canvas.DrawRect(SKRect.Create(10, 0, 10, 10), blue);
            using var image = SKImage.FromBitmap(bitmap);
            using var data = image.Encode(SKEncodedImageFormat.Png, 100);
            using var stream = File.OpenWrite(path);
            data.SaveTo(stream);
            return new TempImage(directory, path);
        }
        public void Dispose()
        {
            if (System.IO.Directory.Exists(Directory))
                System.IO.Directory.Delete(Directory, true);
        }
    }
}
