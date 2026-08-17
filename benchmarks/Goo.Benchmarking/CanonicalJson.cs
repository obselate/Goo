namespace Goo.Benchmarking;

public static class CanonicalJson
{
    public static string Serialize<T>(T value) => BenchmarkJson.SerializeCanonical(value);

    public static byte[] SerializeUtf8<T>(T value) => BenchmarkJson.SerializeCanonicalUtf8(value);
}
