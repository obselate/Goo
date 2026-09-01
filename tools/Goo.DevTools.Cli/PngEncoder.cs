using System.Buffers.Binary;
using System.IO.Compression;

namespace Goo.DevTools.Cli;

internal static class PngEncoder
{
    private static readonly byte[] Signature = [137, 80, 78, 71, 13, 10, 26, 10];

    public static byte[] Encode(byte[] rgba, int width, int height, int stride)
    {
        if (width <= 0 || height <= 0)
            throw new CliException("The endpoint returned an RGBA capture with invalid dimensions.");
        var rowBytes = checked(width * 4);
        if (stride < rowBytes || rgba.LongLength < (long)stride * height)
            throw new CliException("The endpoint returned an RGBA capture with an invalid stride or payload length.");

        using var output = new MemoryStream();
        output.Write(Signature);
        Span<byte> header = stackalloc byte[13];
        BinaryPrimitives.WriteUInt32BigEndian(header[0..4], checked((uint)width));
        BinaryPrimitives.WriteUInt32BigEndian(header[4..8], checked((uint)height));
        header[8] = 8;
        header[9] = 6;
        WriteChunk(output, "IHDR", header);

        byte[] compressed;
        using (var encoded = new MemoryStream())
        {
            using (var zlib = new ZLibStream(encoded, CompressionLevel.SmallestSize, leaveOpen: true))
            {
                var row = new byte[rowBytes + 1];
                for (var y = 0; y < height; y++)
                {
                    row[0] = 0;
                    CopyUnpremultipliedRow(rgba, checked(y * stride), row.AsSpan(1, rowBytes));
                    zlib.Write(row, 0, row.Length);
                }
            }

            compressed = encoded.ToArray();
        }

        WriteChunk(output, "IDAT", compressed);
        WriteChunk(output, "IEND", []);
        return output.ToArray();
    }

    public static bool IsPng(ReadOnlySpan<byte> value)
    {
        return value.Length >= Signature.Length && value[..Signature.Length].SequenceEqual(Signature);
    }

    private static void WriteChunk(Stream output, string type, ReadOnlySpan<byte> data)
    {
        Span<byte> length = stackalloc byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(length, checked((uint)data.Length));
        output.Write(length);
        var typeBytes = System.Text.Encoding.ASCII.GetBytes(type);
        output.Write(typeBytes);
        output.Write(data);
        Span<byte> checksum = stackalloc byte[4];
        BinaryPrimitives.WriteUInt32BigEndian(checksum, Crc32(typeBytes, data));
        output.Write(checksum);
    }

    private static uint Crc32(ReadOnlySpan<byte> type, ReadOnlySpan<byte> data)
    {
        var crc = 0xffffffffu;
        foreach (var value in type)
            crc = Update(crc, value);
        foreach (var value in data)
            crc = Update(crc, value);
        return ~crc;
    }

    private static uint Update(uint crc, byte value)
    {
        crc ^= value;
        for (var bit = 0; bit < 8; bit++)
            crc = (crc >> 1) ^ (0xedb88320u & (uint)-(int)(crc & 1));
        return crc;
    }

    private static void CopyUnpremultipliedRow(byte[] rgba, int offset, Span<byte> row)
    {
        for (var index = 0; index < row.Length; index += 4)
        {
            var alpha = rgba[offset + index + 3];
            row[index + 3] = alpha;
            if (alpha == 0)
            {
                row[index] = 0;
                row[index + 1] = 0;
                row[index + 2] = 0;
                continue;
            }

            if (alpha == byte.MaxValue)
            {
                row[index] = rgba[offset + index];
                row[index + 1] = rgba[offset + index + 1];
                row[index + 2] = rgba[offset + index + 2];
                continue;
            }

            row[index] = Unpremultiply(rgba[offset + index], alpha);
            row[index + 1] = Unpremultiply(rgba[offset + index + 1], alpha);
            row[index + 2] = Unpremultiply(rgba[offset + index + 2], alpha);
        }
    }

    private static byte Unpremultiply(byte value, byte alpha)
    {
        var result = (value * 255 + alpha / 2) / alpha;
        return (byte)Math.Min(result, byte.MaxValue);
    }
}
