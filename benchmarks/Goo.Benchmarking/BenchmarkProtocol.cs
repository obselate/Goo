namespace Goo.Benchmarking;

public static class BenchmarkProtocol
{
    public const int RequiredProcesses = 5;
    public const int WarmupCount = 300;
    public const int MeasuredCount = 2_000;
    public const int PooledMeasuredCount = RequiredProcesses * MeasuredCount;
    public const int WarmupOperations = WarmupCount;
    public const int MeasuredOperations = MeasuredCount;
    public const int SchemaVersion = 1;
    public const string ChildRunSchema = "goo.benchmarking.child-run.v1";
    public const string ManifestSchema = "goo.benchmarking.manifest.v1";
    public const string ProtocolVersion = "goo.benchmarking.protocol.v1";
}
