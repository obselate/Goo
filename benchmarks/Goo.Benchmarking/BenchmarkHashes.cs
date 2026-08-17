using System.Security.Cryptography;
using System.Text;

namespace Goo.Benchmarking;

public static class BenchmarkHashes
{
    public static string Sha256(ReadOnlySpan<byte> data) =>
        Convert.ToHexString(SHA256.HashData(data)).ToLowerInvariant();

    public static string Sha256Hex(ReadOnlySpan<byte> data) => Sha256(data);

    public static string Sha256(string text)
    {
        ArgumentNullException.ThrowIfNull(text);
        return Sha256(Encoding.UTF8.GetBytes(text));
    }

    public static string Sha256Hex(string text) => Sha256(text);

    public static string Sha256(Stream stream)
    {
        ArgumentNullException.ThrowIfNull(stream);
        return Convert.ToHexString(SHA256.HashData(stream)).ToLowerInvariant();
    }

    public static string Sha256File(string path)
    {
        ArgumentNullException.ThrowIfNull(path);
        using var stream = File.OpenRead(path);
        return Sha256(stream);
    }

    public static string Sha256CanonicalJson<T>(T value) =>
        Sha256(BenchmarkJson.SerializeCanonicalUtf8(value));
}
