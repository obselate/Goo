using System;
using System.IO;
using Goo;
using SkiaSharp;
using Xunit;

[CollectionDefinition("Image decoding", DisableParallelization = true)]
public sealed class ImageDecodingCollection
{
}

[Collection("Image decoding")]
public sealed class ImageRenderingTests
{
    [Fact]
    public void DecodedImagesUseIntrinsicSizingFitAndBlobSurface()
    {
        using var image = TempImage.Create();

        Assert.True(new ImageFixtures().DecodedImageSurface(image.Path));
    }

    [Fact]
    public void EmptyImagePathDoesNotCreateARequest()
    {
        Assert.True(new ImageFixtures().EmptyPathContract());
    }

    [Fact]
    public void RequestsSharePathsAndFailuresKeepLayout()
    {
        using var image = TempImage.Create();
        var relative = Path.GetRelativePath(Environment.CurrentDirectory, image.Path);
        var missing = Path.Combine(image.Directory, "missing.png");

        Assert.True(new ImageFixtures().ImageCanonicalPathContract(image.Path, relative, missing));
    }

    [Fact]
    public void AttachedImagesStayPaintableAfterCacheEviction()
    {
        Assert.True(new ImageFixtures().ByteEvictionKeepsAttachedImagePaintable());
    }

    [Fact]
    public void CompletionUpdatesLayoutAndIgnoresRemovals()
    {
        var missing = Path.Combine(
            Path.GetTempPath(),
            "goo-image-tests",
            Guid.NewGuid().ToString("N"),
            "missing.png");

        Assert.True(new ImageFixtures().ImageCompletionContract(missing));
    }

    [Fact]
    public void OwnedSourcesShareAcrossImageAndBackgroundUntilBothUnmount()
    {
        Assert.True(new ImageFixtures().OwnedSourcesShareLifetimeAndPaint());
    }

    [Fact]
    public void ProviderSourcesReleaseStaleBindingsAndContainFailures()
    {
        Assert.True(new ImageFixtures().ProviderReplacementCompletionFailureAndReleaseContract());
    }

    [Fact]
    public void OwnedSourceInputIsExactAndOverflowSafe()
    {
        Assert.True(new ImageFixtures().OwnedSourceInputContract());
    }

    [Fact]
    public void OwnedSourceCopiesPixelsAtConstruction()
    {
        Assert.True(new ImageFixtures().OwnedSourceCopiesPixels());
    }

    [Fact]
    public void OwnedSourceAndLeaseSynchronizationCostStaysBounded()
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

    [Fact]
    public void ThrowingCompletionCallbackLeavesLeaseReleasable()
    {
        Assert.True(new ImageFixtures().CompletionCallbackExceptionLeavesLeaseReleasable());
    }

    [Fact]
    public void OwnedSourceRejectsClrNullInputs()
    {
        Assert.Throws<ArgumentNullException>(() => new ImageSource(1, 1, null!));
        using var lease = new ImageSourceLease();
        Assert.Throws<ArgumentNullException>(() => lease.Complete(null!));
    }

    [Fact]
    public void ProviderCompletionReconcilesThroughWindowAndDisposedLeasesFail()
    {
        Assert.True(new ImageFixtures().ProviderWindowCompletionAndDisposedLeaseContract());
    }

    private sealed class TempImage : IDisposable
    {
        private TempImage(string directory, string path)
        {
            Directory = directory;
            Path = path;
        }

        public string Directory { get; }
        public string Path { get; }

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
