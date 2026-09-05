using System;
using System.Buffers.Binary;
using Goo;
using Xunit;

public sealed class ShaderEffectDataTests
{
    private static readonly byte[] MinimalSpirv =
    {
        3, 2, 35, 7,
        0, 0, 1, 0,
        0, 0, 0, 0,
        1, 0, 0, 0,
        0, 0, 0, 0
    };

    [Fact]
    public void PublicationsAdvanceMonotonicallyAndPreserveLastGoodValue()
    {
        using var data = new ShaderEffectData(new byte[] { 1, 2, 3, 4 });

        Assert.Equal(4, data.ByteLength);
        Assert.Equal(1UL, data.ContentVersion);

        data.Publish(new byte[] { 5, 6, 7, 8, 9 });

        Assert.Equal(5, data.ByteLength);
        Assert.Equal(2UL, data.ContentVersion);
        Assert.Throws<ArgumentOutOfRangeException>(() => data.Publish(Array.Empty<byte>()));
        Assert.Equal(5, data.ByteLength);
        Assert.Equal(2UL, data.ContentVersion);
    }

    [Fact]
    public void TransferCallbacksRunAfterEachOwnedPublicationIsReleased()
    {
        int releaseCount = 0;
        var data = ShaderEffectData.Transfer(new byte[] { 1, 2, 3, 4 }, () => releaseCount++);

        data.PublishTransferred(new byte[] { 5, 6, 7, 8 }, () => releaseCount++);
        Assert.Equal(1, releaseCount);

        data.Dispose();
        Assert.Equal(2, releaseCount);
        Assert.True(data.IsDisposed);
        Assert.Equal(0, data.ByteLength);
        Assert.Throws<ObjectDisposedException>(() => data.Publish(new byte[] { 9 }));
    }

    [Fact]
    public void ShaderEffectsBindFourFixedDataSlotsIdempotently()
    {
        var effect = new ShaderEffect(new ShaderEffectProgram(Program(MinimalSpirv)));
        using var data = new ShaderEffectData(new byte[] { 1, 2, 3, 4 });

        Assert.True(effect.SetData(0, data));
        Assert.False(effect.SetData(0, data));
        Assert.True(effect.SetData(3, data));
        Assert.True(effect.SetData(0, null));
        Assert.Throws<ArgumentOutOfRangeException>(() => effect.SetData(-1, data));
        Assert.Throws<ArgumentOutOfRangeException>(() => effect.SetData(4, data));

        effect.ElapsedSeconds = 12.5;
        Assert.Equal(12.5, effect.ElapsedSeconds);

        Assert.Throws<ArgumentOutOfRangeException>(() => effect.ElapsedSeconds = double.MaxValue);
        Assert.Throws<ArgumentOutOfRangeException>(() => effect.ElapsedSeconds = double.PositiveInfinity);
        Assert.Throws<ArgumentOutOfRangeException>(() => effect.ElapsedSeconds = double.NaN);
        Assert.Throws<ArgumentOutOfRangeException>(() => effect.ElapsedSeconds = -1.0);
        Assert.Equal(12.5, effect.ElapsedSeconds);
    }

    private static byte[] Program(byte[] spirv)
    {
        byte[] result = new byte[20 + spirv.Length];
        BinaryPrimitives.WriteUInt32LittleEndian(result.AsSpan(0, 4), 0x46464547);
        BinaryPrimitives.WriteUInt32LittleEndian(result.AsSpan(4, 4), 1);
        BinaryPrimitives.WriteUInt32LittleEndian(result.AsSpan(8, 4), 1);
        BinaryPrimitives.WriteUInt32LittleEndian(result.AsSpan(12, 4), 0x56505356);
        BinaryPrimitives.WriteUInt32LittleEndian(result.AsSpan(16, 4), (uint)spirv.Length);
        spirv.CopyTo(result, 20);
        return result;
    }
}
