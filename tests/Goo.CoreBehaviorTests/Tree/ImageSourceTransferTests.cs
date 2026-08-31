using Goo;
using Xunit;

public sealed class ImageSourceTransferTests
{
    [Fact]
    public void FinalLeaseReturnsTransferredBufferExactlyOnce()
    {
        var pixels = new byte[] { 1, 2, 3, 255 };
        var released = 0;
        var source = ImageSource.Transfer(1, 1, pixels, () => released++);
        var first = source.Acquire();
        var second = source.Acquire();

        var decoded = Assert.IsType<DecodedImage>(first.Result());
        Assert.Same(pixels, decoded.Pixels());
        Assert.Same(decoded, second.Result());

        source.Dispose();
        Assert.Equal(0, released);
        first.Dispose();
        Assert.Equal(0, released);
        second.Dispose();
        Assert.Equal(1, released);

        source.Dispose();
        first.Dispose();
        second.Dispose();
        Assert.Equal(1, released);
    }

    [Fact]
    public void RejectedTransferDoesNotConsumeOwnership()
    {
        var released = 0;

        Assert.Throws<System.ArgumentException>(() =>
            ImageSource.Transfer(2, 1, new byte[4], () => released++));
        Assert.Equal(0, released);
    }

    [Fact]
    public void TransferRequiresReleaseCallback()
    {
        Assert.Throws<System.ArgumentNullException>(() =>
            ImageSource.Transfer(1, 1, new byte[4], null!));
    }

    [Fact]
    public void ReleaseCallbackFailureDoesNotEscapeCleanup()
    {
        var source = ImageSource.Transfer(1, 1, new byte[4],
            () => throw new System.InvalidOperationException("release"));

        source.Dispose();
        source.Dispose();
    }
}
