namespace Goo.Benchmarking;

public static class BenchmarkProtocol
{
    public const int RequiredProcesses = 5;
    public const int WarmupCount = 300;
    public const int MeasuredCount = 2_000;
    public const int PooledMeasuredCount = RequiredProcesses * MeasuredCount;
    public const int WarmupOperations = WarmupCount;
    public const int MeasuredOperations = MeasuredCount;
    public const int SchemaVersion = 2;
    public const string ChildRunSchema = "goo.benchmarking.child-run.v2";
    public const string ManifestSchema = "goo.benchmarking.manifest.v2";
    public const string ProtocolVersion = "goo.benchmarking.protocol.v2";
    public const string RequiredGSharpSdkPackage = "Gsharp.NET.Sdk/0.4.1";
    public const string RequiredGSharpSdkDigest = "fa379d5d68c2286afaee2d429dfad4585cfa25fe8495916cb7d5b41837099e63";
    public static readonly IReadOnlyList<string> RequiredQ10GateIds =
    [
        "feature",
        "strict-pixels",
        "aa-effect-pixels",
        "placement",
        "general-frame-time",
        "sparse-workloads",
        "absolute-frame-budget",
        "input",
        "startup",
        "memory",
        "binary",
        "dependencies",
        "native-surface",
        "product-language",
        "validation",
        "idle",
        "idle-cpu",
        "warm-resource",
        "lifecycle",
        "plateau",
        "platform-matrix",
        "fallback",
    ];
}
