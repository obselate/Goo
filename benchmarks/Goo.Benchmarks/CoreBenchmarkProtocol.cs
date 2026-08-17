using System.Diagnostics;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using System.Text.Json;
using System.Text.Json.Serialization;

internal static class CoreBenchmarkWorkloads
{
    internal const string Monolithic = "core.scale.active.monolithic";
    internal const string Componentized = "core.scale.active.componentized";
    internal const string CallbackComponentized = "core.scale.active.componentized-callback";
    internal const string Raster = "core.scale.paint.raster";
    internal static readonly string[] Required =
    [
        Monolithic,
        Componentized,
        CallbackComponentized,
        Raster,
    ];

    internal static BenchmarkWorkloadDefinition Definition(string workloadId) => workloadId switch
    {
        Monolithic => new(workloadId, "root rebuild of 200 rows and 1,001 retained nodes.", "core-cpu-allocation-r1", "frame"),
        Componentized => new(workloadId, "keyed first-row Cell update on the same retained tree.", "core-cpu-allocation-r1", "frame"),
        CallbackComponentized => new(workloadId, "componentized tree with one OnClick callback per row.", "core-cpu-allocation-r1", "frame"),
        Raster => new(workloadId, "warm retained 1,001-node tree on a 1280x720 Skia surface.", "core-cpu-allocation-r1", "frame"),
        _ => throw new ArgumentOutOfRangeException(nameof(workloadId), workloadId, "unknown core workload"),
    };

    internal static string Variant(string workloadId) => workloadId switch
    {
        Monolithic => "monolithic",
        Componentized => "componentized",
        CallbackComponentized => "componentized-callback",
        Raster => "raster",
        _ => throw new ArgumentOutOfRangeException(nameof(workloadId), workloadId, "unknown core workload"),
    };

    internal static string Name(string workloadId) => workloadId switch
    {
        Monolithic => "active frame, monolithic 1,001-node list rebuild",
        Componentized => "active frame, componentized 1,001-node row rebuild",
        CallbackComponentized => "active frame, componentized 1,001-node callback row rebuild",
        Raster => "raster paint, 1,001 nodes at 1280x720",
        _ => throw new ArgumentOutOfRangeException(nameof(workloadId), workloadId, "unknown core workload"),
    };

}

internal class CoreBenchmarkRun
{
    internal CoreBenchmarkRun()
        : this("core")
    {
    }

    internal CoreBenchmarkRun(string suite)
    {
        Suite = suite;
        Attempt = new CoreBenchmarkAttempt();
        Provenance = BenchmarkProvenance.Resolve(suite);
        SchemaVersion = suite == "core" ? 2 : 1;
        Schema = suite == "core" ? "goo-gsharp.core.cpu-allocation.historical.run.v1" : "goo-benchmark.run.v1";
        BaselineId = suite == "core" ? CoreBenchmarkProtocol.BaselineId() : null;
        if (suite == "core")
        {
            var seed = CoreBenchmarkProtocolMetadata.Resolve(
                BaselineId!,
                string.Empty,
                Provenance.Configuration,
                Provenance.GooConfiguration);
            BaselineKey = CoreBenchmarkProtocol.DeriveBaselineKey(Provenance, seed);
            Protocol = CoreBenchmarkProtocolMetadata.Resolve(
                BaselineId!,
                BaselineKey,
                Provenance.Configuration,
                Provenance.GooConfiguration);
        }
        else
        {
            BaselineKey = null;
            Protocol = null;
        }
    }

    public int SchemaVersion { get; }
    public string Schema { get; }
    public string Suite { get; }
    public string Status { get; private set; } = "running";
    public string? BaselineId { get; }
    public string? BaselineKey { get; }
    public string? ParentBaselineId { get; } = null;
    public bool QualifiesS04Q10 { get; } = false;
    public CoreBenchmarkProtocolMetadata? Protocol { get; }
    public CoreBenchmarkAttempt Attempt { get; }
    public BenchmarkProvenance Provenance { get; }
    public List<CoreBenchmarkWorkload> Workloads { get; } = [];
    public CoreBenchmarkFailure? Failure { get; private set; }

    internal bool IsCore => Suite == "core";

    internal void SetActiveWorkload(string workloadId) => Attempt.ActiveWorkloadId = workloadId;

    internal void Add(string workloadId, string variant, int rows, int nodes, CoreBenchmarkSampleSet samples)
    {
        ValidateSamples(samples);
        Workloads.Add(CoreBenchmarkWorkload.Create(
            CoreBenchmarkWorkloads.Definition(workloadId), variant, rows, nodes, samples));
    }

    internal void Add(BenchmarkWorkloadDefinition definition, string variant, int rows, int nodes,
        CoreBenchmarkSampleSet samples)
    {
        ValidateSamples(samples);
        Workloads.Add(CoreBenchmarkWorkload.Create(definition, variant, rows, nodes, samples));
    }

    internal void Complete()
    {
        if (IsCore)
        {
            if (Workloads.Count != CoreBenchmarkWorkloads.Required.Length
                || !CoreBenchmarkWorkloads.Required.All(id => Workloads.Any(workload => workload.WorkloadId == id)))
            {
                throw new InvalidOperationException("core historical run did not produce the required workloads");
            }
        }
        Status = "passed";
        Attempt.Complete(0);
    }

    internal void Fail(Exception exception)
    {
        Status = "failed";
        Failure = new CoreBenchmarkFailure(
            Attempt.ActiveWorkloadId,
            exception.GetType().FullName ?? exception.GetType().Name,
            exception.Message,
            exception.StackTrace);
        Attempt.Complete(1);
    }

    private void ValidateSamples(CoreBenchmarkSampleSet samples)
    {
        if (IsCore && (samples.CpuUs.Length != CoreBenchmarkProtocol.MeasuredOperations
            || samples.AllocationBytes.Length != CoreBenchmarkProtocol.MeasuredOperations))
        {
            throw new InvalidOperationException(
                $"core workload {samples.Name} must contain {CoreBenchmarkProtocol.MeasuredOperations} samples");
        }
    }
}

internal sealed class CoreBenchmarkProtocolMetadata
{
    private CoreBenchmarkProtocolMetadata(
        string exactCommand,
        int? processIndex,
        string baselineId,
        string baselineKey,
        string configuration,
        string gooConfiguration)
    {
        ExactCommand = exactCommand;
        ProcessIndex = processIndex;
        BaselineId = baselineId;
        BaselineKey = baselineKey;
        Configuration = configuration;
        GooConfiguration = gooConfiguration;
    }

    public string ProtocolSchema { get; } = "goo-gsharp.core.cpu-allocation.historical.protocol.v1";
    public string MetricSchema { get; } = "goo-gsharp.core.cpu-allocation.historical.metrics.v1";
    public string WorkloadSchema { get; } = "goo-gsharp.core.cpu-allocation.historical.workload.v1";
    public string WorkloadRevision { get; } = "core-cpu-allocation-r1";
    public int RequiredProcesses { get; } = CoreBenchmarkProtocol.RequiredProcesses;
    public int WarmupOperations { get; } = CoreBenchmarkProtocol.WarmupOperations;
    public int MeasuredOperations { get; } = CoreBenchmarkProtocol.MeasuredOperations;
    public string Configuration { get; }
    public string GooConfiguration { get; }
    public string Backend { get; } = "Skia";
    public string ExactCommand { get; }
    public int? ProcessIndex { get; }
    public string BaselineId { get; }
    public string BaselineKey { get; }
    public bool QualifiesS04Q10 { get; } = false;

    internal static CoreBenchmarkProtocolMetadata Resolve(
        string baselineId,
        string baselineKey,
        string configuration,
        string gooConfiguration,
        string? exactCommand = null,
        int? processIndex = null) => new(
        exactCommand
            ?? Environment.GetEnvironmentVariable("GOO_BENCHMARK_EXACT_COMMAND")
            ?? Environment.CommandLine,
        processIndex ?? ProcessIndexFromEnvironment(),
        baselineId,
        baselineKey,
        configuration,
        gooConfiguration);

    private static int? ProcessIndexFromEnvironment() =>
        int.TryParse(Environment.GetEnvironmentVariable("GOO_BENCHMARK_PROCESS_INDEX"), out var index)
            ? index
            : null;
}

internal sealed class CoreBenchmarkAttempt
{
    internal CoreBenchmarkAttempt()
    {
        StartedAtUtc = DateTimeOffset.UtcNow;
        ProcessId = Environment.ProcessId;
        Runtime = RuntimeInformation.FrameworkDescription;
        Os = RuntimeInformation.OSDescription;
        Architecture = RuntimeInformation.ProcessArchitecture.ToString();
        Cpu = BenchmarkProvenance.CpuModel();
        TieredCompilation = Environment.GetEnvironmentVariable("DOTNET_TieredCompilation");
        QuickJit = Environment.GetEnvironmentVariable("DOTNET_TC_QuickJit");
    }

    public int Number { get; } = 1;
    public int ProcessId { get; }
    public DateTimeOffset StartedAtUtc { get; }
    public DateTimeOffset? CompletedAtUtc { get; private set; }
    public int? ExitCode { get; private set; }
    public string Runtime { get; }
    public string Os { get; }
    public string Architecture { get; }
    public string Cpu { get; }
    public string? TieredCompilation { get; }
    public string? QuickJit { get; }

    [JsonIgnore]
    internal string? ActiveWorkloadId { get; set; }

    internal void Complete(int exitCode)
    {
        CompletedAtUtc = DateTimeOffset.UtcNow;
        ExitCode = exitCode;
    }
}

internal sealed class CoreBenchmarkWorkload
{
    private CoreBenchmarkWorkload(
        string workloadId,
        string variant,
        string name,
        string description,
        string revision,
        string metricSemantic,
        int rows,
        int nodes,
        int iterations,
        IReadOnlyList<CoreBenchmarkSample> samples,
        CoreBenchmarkAggregates aggregates)
    {
        WorkloadId = workloadId;
        Variant = variant;
        Name = name;
        Description = description;
        Revision = revision;
        MetricSemantic = metricSemantic;
        Rows = rows;
        Nodes = nodes;
        Iterations = iterations;
        SampleCount = samples.Count;
        Samples = samples;
        Aggregates = aggregates;
    }

    public string WorkloadId { get; }
    public string Variant { get; }
    public string Name { get; }
    public string Description { get; }
    public string Revision { get; }
    public string MetricSemantic { get; }
    public int Rows { get; }
    public int Nodes { get; }
    public int Iterations { get; }
    public int SampleCount { get; }
    public CoreBenchmarkUnits Units { get; } = new();
    public IReadOnlyList<CoreBenchmarkSample> Samples { get; }
    public CoreBenchmarkAggregates Aggregates { get; }

    internal static CoreBenchmarkWorkload Create(
        BenchmarkWorkloadDefinition definition,
        string variant,
        int rows,
        int nodes,
        CoreBenchmarkSampleSet sampleSet)
    {
        if (sampleSet.CpuUs.Length != sampleSet.AllocationBytes.Length)
        {
            throw new InvalidOperationException($"workload {definition.Id} has unpaired samples");
        }

        var samples = new CoreBenchmarkSample[sampleSet.CpuUs.Length];
        for (var index = 0; index < samples.Length; index++)
        {
            samples[index] = new CoreBenchmarkSample(
                index,
                sampleSet.CpuUs[index],
                sampleSet.AllocationBytes[index]);
        }

        var aggregates = new CoreBenchmarkAggregates(
            CoreBenchmarkStatistics.Double(sampleSet.CpuUs),
            CoreBenchmarkStatistics.Long(sampleSet.AllocationBytes));
        return new CoreBenchmarkWorkload(
            definition.Id,
            variant,
            sampleSet.Name,
            definition.Description,
            definition.Revision,
            definition.MetricSemantic,
            rows,
            nodes,
            sampleSet.Iterations,
            samples,
            aggregates);
    }
}

internal sealed class CoreBenchmarkUnits
{
    public string Cpu { get; } = "microseconds_per_operation";
    public string Allocation { get; } = "bytes_per_operation";
}

internal readonly record struct CoreBenchmarkSample(int SampleIndex, double CpuUs, long AllocationBytes);

internal readonly record struct CoreBenchmarkAggregates(
    CoreBenchmarkDoubleAggregate CpuUs,
    CoreBenchmarkLongAggregate AllocationBytes);

internal sealed class CoreBenchmarkDoubleAggregate
{
    internal CoreBenchmarkDoubleAggregate(
        double min,
        double p50,
        double p95,
        double p99,
        double p999,
        double worst)
    {
        Min = min;
        P50 = p50;
        P95 = p95;
        P99 = p99;
        P999 = p999;
        Worst = worst;
    }

    public double Min { get; }
    public double Median => P50;
    public double P50 { get; }
    public double P95 { get; }
    public double P99 { get; }
    [JsonPropertyName("p99_9")]
    public double P999 { get; }
    public double Worst { get; }
    public double Max => Worst;
}

internal sealed class CoreBenchmarkLongAggregate
{
    internal CoreBenchmarkLongAggregate(
        long min,
        long p50,
        long p95,
        long p99,
        long p999,
        long worst)
    {
        Min = min;
        P50 = p50;
        P95 = p95;
        P99 = p99;
        P999 = p999;
        Worst = worst;
    }

    public long Min { get; }
    public long Median => P50;
    public long P50 { get; }
    public long P95 { get; }
    public long P99 { get; }
    [JsonPropertyName("p99_9")]
    public long P999 { get; }
    public long Worst { get; }
    public long Max => Worst;
}

internal readonly record struct CoreBenchmarkSampleSet(
    string Name,
    int Iterations,
    double[] CpuUs,
    long[] AllocationBytes);

internal readonly record struct BenchmarkWorkloadDefinition(
    string Id,
    string Description,
    string Revision,
    string MetricSemantic);

internal sealed record CoreBenchmarkFailure(
    string? WorkloadId,
    string Type,
    string Message,
    string? StackTrace);

internal static class CoreBenchmarkStatistics
{
    internal static CoreBenchmarkDoubleAggregate Double(IReadOnlyList<double> values)
    {
        if (values.Count == 0)
        {
            throw new InvalidOperationException("cannot calculate percentiles for an empty CPU sample set");
        }

        var sorted = values.ToArray();
        Array.Sort(sorted);
        return new CoreBenchmarkDoubleAggregate(
            sorted[0],
            sorted[Rank(sorted.Length, 0.50)],
            sorted[Rank(sorted.Length, 0.95)],
            sorted[Rank(sorted.Length, 0.99)],
            sorted[Rank(sorted.Length, 0.999)],
            sorted[^1]);
    }

    internal static CoreBenchmarkLongAggregate Long(IReadOnlyList<long> values)
    {
        if (values.Count == 0)
        {
            throw new InvalidOperationException("cannot calculate percentiles for an empty allocation sample set");
        }

        var sorted = values.ToArray();
        Array.Sort(sorted);
        return new CoreBenchmarkLongAggregate(
            sorted[0],
            sorted[Rank(sorted.Length, 0.50)],
            sorted[Rank(sorted.Length, 0.95)],
            sorted[Rank(sorted.Length, 0.99)],
            sorted[Rank(sorted.Length, 0.999)],
            sorted[^1]);
    }

    private static int Rank(int count, double percentile) =>
        Math.Clamp((int)Math.Ceiling(count * percentile) - 1, 0, count - 1);
}

internal static class CoreBenchmarkProtocol
{
    internal const int RequiredProcesses = 5;
    internal const int WarmupOperations = 300;
    internal const int MeasuredOperations = 2_000;
    internal const int PooledOperations = RequiredProcesses * MeasuredOperations;
    internal const string OutputPrefix = "GOO_CORE_CPU_JSON_V1 ";
    internal const string AccessibilityOutputPrefix = "GOO_ACCESSIBILITY_JSON_V1 ";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false,
    };

    internal static void Write(CoreBenchmarkRun run)
    {
        try
        {
            Console.WriteLine(OutputPrefixFor(run.Suite) + JsonSerializer.Serialize(run, JsonOptions));
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine($"benchmark JSON serialization failed: {exception.Message}");
            Console.WriteLine(OutputPrefixFor(run.Suite) + "{\"schemaVersion\":1,\"suite\":\"" + run.Suite + "\",\"status\":\"failed\",\"workloads\":[],\"failure\":{\"type\":\"serialization\",\"message\":\"serialization failed\"}}");
        }
    }

    internal static JsonSerializerOptions JsonOptionsForBatch() => new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    internal static string OutputPrefixFor(string suite) => suite switch
    {
        "core" => OutputPrefix,
        "accessibility" => AccessibilityOutputPrefix,
        _ => throw new ArgumentOutOfRangeException(nameof(suite), suite, "unknown benchmark suite"),
    };

    internal static string BaselineId() =>
        Environment.GetEnvironmentVariable("GOO_BENCHMARK_BASELINE_ID")?.Trim() is { Length: > 0 } value
            ? value
            : $"core-cpu-allocation-historical-{DateTimeOffset.UtcNow:yyyyMMddTHHmmssfffZ}-{Guid.NewGuid():N}";

    internal static string DeriveBaselineKey(
        BenchmarkProvenance provenance,
        CoreBenchmarkProtocolMetadata protocol)
    {
        var material = string.Join(
            "|",
            "goo-gsharp.core.cpu-allocation.historical.v1",
            "qualifiesS04Q10=false",
            provenance.ProtocolVersion,
            provenance.GooRevision,
            provenance.GooDirty,
            provenance.Untracked,
            provenance.GooVersion,
            provenance.GsharpSdk,
            provenance.Configuration,
            provenance.GooConfiguration,
            provenance.Os,
            provenance.Rid,
            provenance.Cpu,
            provenance.Gpu,
            provenance.Driver,
            provenance.BenchmarkBinarySha256,
            provenance.SourceInputSha256,
            protocol.ProtocolSchema,
            protocol.MetricSchema,
            protocol.WorkloadSchema,
            protocol.WorkloadRevision,
            protocol.RequiredProcesses,
            protocol.WarmupOperations,
            protocol.MeasuredOperations,
            protocol.Configuration,
            protocol.GooConfiguration,
            protocol.Backend,
            "cpuUs:microseconds_per_operation",
            "allocationBytes:bytes_per_operation",
            "p50,p95,p99,p99_9,worst",
            string.Join(",", CoreBenchmarkWorkloads.Required));
        return "goo-gsharp.core.cpu-allocation.historical." + Sha256Text(material)[..16];
    }

    internal static string Sha256Text(string value) =>
        Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(value))).ToLowerInvariant();

}

internal sealed class BenchmarkProvenance
{
    private BenchmarkProvenance(string gooRevision, bool gooDirty, string gooVersion, string gsharpSdk,
        string workloadRevision, string protocolVersion, string os, string rid, string cpu, string gpu,
        string driver, bool untracked, string configuration, string gooConfiguration,
        string benchmarkBinarySha256, string sourceInputSha256)
    {
        GooRevision = gooRevision;
        GooDirty = gooDirty;
        GooVersion = gooVersion;
        GsharpSdk = gsharpSdk;
        WorkloadRevision = workloadRevision;
        ProtocolVersion = protocolVersion;
        Os = os;
        Rid = rid;
        Cpu = cpu;
        Gpu = gpu;
        Driver = driver;
        Untracked = untracked;
        Configuration = configuration;
        GooConfiguration = gooConfiguration;
        BenchmarkBinarySha256 = benchmarkBinarySha256;
        SourceInputSha256 = sourceInputSha256;
    }

    public string ProtocolVersion { get; }
    public string GooRevision { get; }
    public bool GooDirty { get; }
    public string GooVersion { get; }
    public string GsharpSdk { get; }
    public string WorkloadRevision { get; }
    public string Os { get; }
    public string Rid { get; }
    public string Cpu { get; }
    public string Gpu { get; }
    public string Driver { get; }
    public bool Untracked { get; }
    public string Configuration { get; }
    public string GooConfiguration { get; }
    public string BenchmarkBinarySha256 { get; }
    public string SourceInputSha256 { get; }
    public string Backend { get; } = "Skia";
    public string? VisualHash { get; } = null;
    public string? PackageHash { get; } = null;
    public bool QualifiesS04Q10 { get; } = false;

    internal static BenchmarkProvenance Resolve(string suite)
    {
        var root = GooRoot();
        var revision = root is null ? "unavailable" : Git(root, "rev-parse", "HEAD") ?? "unavailable";
        var status = root is null ? null : Git(root, "status", "--porcelain", "--untracked-files=all");
        var dirty = !string.IsNullOrWhiteSpace(status);
        var untracked = status?.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries)
            .Any(line => line.StartsWith("??", StringComparison.Ordinal)) == true;
        var gooAssembly = DiscoverGooAssembly();
        var version = gooAssembly?.GetName().Version?.ToString() ?? "unavailable";
        var sdk = root is null ? "unavailable" : DiscoverGsharpSdk(root);
        var benchmarkAssembly = Assembly.GetExecutingAssembly();
        var configuration = ConfigurationFromPath(benchmarkAssembly.Location);
        var gooConfiguration = DiscoverGooConfiguration(root, configuration, gooAssembly);
        if (suite == "core")
        {
            RequireOptimizedConfiguration("benchmark", configuration);
            RequireOptimizedConfiguration("Goo", gooConfiguration);
        }
        return new BenchmarkProvenance(
            revision,
            dirty,
            version,
            sdk,
            suite == "core" ? "core-cpu-allocation-r1" : suite + "-r1",
            suite == "core" ? "goo-gsharp.core.cpu-allocation.historical.protocol.v1" : "goo-benchmark-v2",
            RuntimeInformation.OSDescription,
            RuntimeInformation.RuntimeIdentifier,
            CpuModel(),
            GpuModel(),
            GpuDriver(),
            untracked,
            configuration,
            gooConfiguration,
            HashFile(benchmarkAssembly.Location),
            ComputeSourceInputSha256(root));
    }

    internal static void RequireOptimizedConfiguration(string label, string configuration)
    {
        if (!configuration.Equals("Release", StringComparison.Ordinal)
            && !configuration.Equals("TestRelease", StringComparison.Ordinal))
        {
            throw new InvalidOperationException(
                $"{label} assembly configuration {configuration} is not an optimized Release or TestRelease build");
        }
    }

    internal static string ConfigurationFromPath(string? path)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            return "unavailable";
        }

        foreach (var segment in path.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar,
                     StringSplitOptions.RemoveEmptyEntries))
        {
            if (segment.Equals("Release", StringComparison.Ordinal)
                || segment.Equals("TestRelease", StringComparison.Ordinal))
            {
                return segment;
            }
        }
        return "unavailable";
    }

    internal static string CpuModel()
    {
        const string cpuInfo = "/proc/cpuinfo";
        if (File.Exists(cpuInfo))
        {
            foreach (var line in File.ReadLines(cpuInfo))
            {
                if (line.StartsWith("model name", StringComparison.Ordinal))
                {
                    var separator = line.IndexOf(':');
                    if (separator >= 0)
                    {
                        return line[(separator + 1)..].Trim();
                    }
                }
            }
        }
        return Environment.GetEnvironmentVariable("PROCESSOR_IDENTIFIER")?.Trim() is { Length: > 0 } model
            ? model
            : "unavailable";
    }

    private static string EnvironmentOrUnavailable(params string[] names)
    {
        foreach (var name in names)
        {
            if (Environment.GetEnvironmentVariable(name)?.Trim() is { Length: > 0 } value)
            {
                return value;
            }
        }
        return "unavailable";
    }

    private static string GpuModel() =>
        DiscoverHardware(
            "nvidia-smi",
            ["GOO_BENCHMARK_GPU", "GPU", "GPU_MODEL"],
            "--query-gpu=name",
            "--format=csv,noheader");

    private static string GpuDriver() =>
        DiscoverHardware(
            "nvidia-smi",
            ["GOO_BENCHMARK_DRIVER", "GPU_DRIVER", "DRIVER"],
            "--query-gpu=driver_version",
            "--format=csv,noheader");

    private static string DiscoverHardware(
        string executable,
        IReadOnlyList<string> environmentNames,
        params string[] arguments)
    {
        foreach (var name in environmentNames)
        {
            if (Environment.GetEnvironmentVariable(name)?.Trim() is { Length: > 0 } value)
            {
                return value;
            }
        }

        try
        {
            var start = new ProcessStartInfo(executable)
            {
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
            };
            foreach (var argument in arguments)
            {
                start.ArgumentList.Add(argument);
            }
            using var process = Process.Start(start);
            if (process is null)
            {
                return "unavailable";
            }
            var output = process.StandardOutput.ReadToEnd();
            process.WaitForExit();
            if (process.ExitCode == 0 && output.Trim().Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries)
                .FirstOrDefault() is { Length: > 0 } discovered)
            {
                return discovered.Trim();
            }
        }
        catch (Exception)
        {
        }
        return "unavailable";
    }

    private static string? GooRoot()
    {
        foreach (var start in new[] { Environment.CurrentDirectory, AppContext.BaseDirectory })
        {
            var directory = new DirectoryInfo(start);
            while (directory is not null)
            {
                var sibling = Path.GetFullPath(Path.Combine(directory.FullName, "..", "goo-gsharp"));
                if (File.Exists(Path.Combine(sibling, "Goo", "Goo.gsproj")))
                {
                    return sibling;
                }
                if (File.Exists(Path.Combine(directory.FullName, "Goo", "Goo.gsproj")))
                {
                    return directory.FullName;
                }
                directory = directory.Parent;
            }
        }
        return null;
    }

    private static string DiscoverGsharpSdk(string root)
    {
        var project = Path.Combine(root, "Goo", "Goo.gsproj");
        var match = Regex.Match(File.ReadAllText(project), "Sdk=\"(Gsharp\\.NET\\.Sdk/[^\"]+)\"");
        return match.Success ? match.Groups[1].Value : "unavailable";
    }

    private static Assembly? DiscoverGooAssembly()
    {
        try
        {
            return Assembly.Load("Goo");
        }
        catch (Exception)
        {
            return null;
        }
    }

    private static string DiscoverGooConfiguration(
        string? root,
        string benchmarkConfiguration,
        Assembly? gooAssembly)
    {
        if (root is not null)
        {
            var benchmarkProject = Path.Combine(root, "benchmarks", "Goo.Benchmarks", "Goo.Benchmarks.csproj");
            if (File.Exists(benchmarkProject))
            {
                var match = Regex.Match(
                    File.ReadAllText(benchmarkProject),
                    "AdditionalProperties=\"[^\"]*Configuration=([^;\"]+)");
                if (match.Success)
                {
                    return match.Groups[1].Value.Replace("$(Configuration)", benchmarkConfiguration, StringComparison.Ordinal);
                }
            }
        }
        return ConfigurationFromPath(gooAssembly?.Location);
    }

    private static string HashFile(string path)
    {
        try
        {
            return File.Exists(path)
                ? Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(path))).ToLowerInvariant()
                : "unavailable";
        }
        catch (Exception)
        {
            return "unavailable";
        }
    }

    private static string ComputeSourceInputSha256(string? root)
    {
        if (root is null)
        {
            return "unavailable";
        }

        var sourceRoot = Path.Combine(root, "benchmarks", "Goo.Benchmarks");
        if (!Directory.Exists(sourceRoot))
        {
            return "unavailable";
        }

        try
        {
            using var hash = IncrementalHash.CreateHash(HashAlgorithmName.SHA256);
            foreach (var path in Directory.EnumerateFiles(sourceRoot, "*", SearchOption.AllDirectories)
                         .Where(path => !path.Split(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar,
                             StringSplitOptions.RemoveEmptyEntries).Any(segment =>
                             segment.Equals("bin", StringComparison.OrdinalIgnoreCase)
                             || segment.Equals("obj", StringComparison.OrdinalIgnoreCase)))
                         .Where(path => path.EndsWith(".cs", StringComparison.OrdinalIgnoreCase)
                             || path.EndsWith(".csproj", StringComparison.OrdinalIgnoreCase)
                             || path.EndsWith(".props", StringComparison.OrdinalIgnoreCase)
                             || path.EndsWith(".targets", StringComparison.OrdinalIgnoreCase)
                             || path.EndsWith(".md", StringComparison.OrdinalIgnoreCase))
                         .OrderBy(path => path, StringComparer.Ordinal))
            {
                var relative = Path.GetRelativePath(sourceRoot, path).Replace('\\', '/');
                hash.AppendData(Encoding.UTF8.GetBytes(relative + "\n"));
                hash.AppendData(File.ReadAllBytes(path));
            }
            return Convert.ToHexString(hash.GetHashAndReset()).ToLowerInvariant();
        }
        catch (Exception)
        {
            return "unavailable";
        }
    }

    private static string? Git(string root, params string[] arguments)
    {
        try
        {
            var start = new ProcessStartInfo("git")
            {
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                CreateNoWindow = true,
            };
            start.ArgumentList.Add("-C");
            start.ArgumentList.Add(root);
            foreach (var argument in arguments)
            {
                start.ArgumentList.Add(argument);
            }
            using var process = Process.Start(start);
            if (process is null)
            {
                return null;
            }
            var output = process.StandardOutput.ReadToEnd();
            process.WaitForExit();
            return process.ExitCode == 0 ? output.Trim() : null;
        }
        catch (Exception)
        {
            return null;
        }
    }
}

internal static class CoreBenchmarkBatch
{
    private const int ChildTimeoutMilliseconds = 180_000;

    internal static bool TryRun(string[] args)
    {
        var index = Array.IndexOf(args, "--core-batch");
        if (index < 0)
        {
            return false;
        }

        try
        {
            if (index != 0 || args.Length != 2 || string.IsNullOrWhiteSpace(args[1]))
            {
                throw new ArgumentException("usage: --core-batch <output-directory>");
            }

            Run(args[1]);
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine($"core batch failed: {exception.Message}");
            Environment.ExitCode = 1;
        }

        return true;
    }

    private static void Run(string outputDirectory)
    {
        var directory = Path.GetFullPath(outputDirectory);
        Directory.CreateDirectory(directory);
        if (Directory.EnumerateFileSystemEntries(directory).Any())
        {
            throw new InvalidOperationException("core batch output directory must be empty");
        }

        var assembly = ResolveAssembly();
        var dotnet = ResolveDotnet();
        var baselineId = CoreBenchmarkProtocol.BaselineId();
        var exactCommand = CommandLine(dotnet, assembly, "--core", "--json");
        var provenance = BenchmarkProvenance.Resolve("core");
        var seed = CoreBenchmarkProtocolMetadata.Resolve(
            baselineId,
            string.Empty,
            provenance.Configuration,
            provenance.GooConfiguration,
            exactCommand,
            null);
        var baselineKey = CoreBenchmarkProtocol.DeriveBaselineKey(provenance, seed);
        var protocol = CoreBenchmarkProtocolMetadata.Resolve(
            baselineId,
            baselineKey,
            provenance.Configuration,
            provenance.GooConfiguration,
            exactCommand,
            null);
        var children = new List<CoreBenchmarkChildResult>();
        var artifacts = new List<CoreBenchmarkBatchRun>();
        var processIds = new HashSet<int>();
        string? provenanceFingerprint = null;

        for (var processIndex = 0; processIndex < CoreBenchmarkProtocol.RequiredProcesses; processIndex++)
        {
            var childProcess = LaunchChild(dotnet, assembly, baselineId, baselineKey, exactCommand, processIndex);
            if (!processIds.Add(childProcess.ProcessId))
            {
                throw new InvalidOperationException($"child {processIndex} reused process id {childProcess.ProcessId}");
            }
            var artifactPath = Path.Combine(directory, $"run-{processIndex:D2}.json");
            File.WriteAllText(artifactPath, childProcess.Json);
            var digest = Convert.ToHexString(SHA256.HashData(File.ReadAllBytes(artifactPath))).ToLowerInvariant();
            var child = ReadChild(
                childProcess.Json,
                processIndex,
                childProcess.ProcessId,
                baselineId,
                baselineKey,
                exactCommand,
                provenance,
                protocol.Configuration,
                protocol.GooConfiguration);
            provenanceFingerprint ??= child.ProvenanceFingerprint;
            if (child.ProvenanceFingerprint != provenanceFingerprint)
            {
                throw new InvalidOperationException($"child {processIndex} provenance does not match prior children");
            }
            children.Add(child);
            artifacts.Add(new CoreBenchmarkBatchRun(
                processIndex,
                childProcess.ProcessId,
                Path.GetFileName(artifactPath),
                digest,
                child.Workloads.Values
                    .Select(workload => new CoreBenchmarkBatchRunWorkload(
                        workload.WorkloadId,
                        workload.CpuUsAggregate,
                        workload.AllocationBytesAggregate))
                .ToArray()));
        }

        if (children.Count != CoreBenchmarkProtocol.RequiredProcesses
            || processIds.Count != CoreBenchmarkProtocol.RequiredProcesses)
        {
            throw new InvalidOperationException("core batch did not produce five unique child processes");
        }

        var pooled = Pool(children);
        var manifest = new CoreBenchmarkBatchManifest(
            baselineId,
            baselineKey,
            protocol,
            provenance,
            artifacts,
            pooled);
        var manifestPath = Path.Combine(directory, "manifest.json");
        var options = CoreBenchmarkProtocol.JsonOptionsForBatch();
        var content = JsonSerializer.Serialize(manifest, options);
        manifest.SetManifestSha256(CoreBenchmarkProtocol.Sha256Text(content));
        File.WriteAllText(manifestPath, JsonSerializer.Serialize(manifest, options));
        Console.WriteLine($"core batch manifest: {manifestPath}");
    }

    private static CoreBenchmarkChildProcess LaunchChild(
        string dotnet,
        string assembly,
        string baselineId,
        string baselineKey,
        string exactCommand,
        int processIndex)
    {
        var start = new ProcessStartInfo(dotnet)
        {
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = Environment.CurrentDirectory,
        };
        start.ArgumentList.Add(assembly);
        start.ArgumentList.Add("--core");
        start.ArgumentList.Add("--json");
        start.Environment["DOTNET_TieredCompilation"] = "0";
        start.Environment["DOTNET_TC_QuickJit"] = "0";
        start.Environment["GOO_BENCHMARK_BASELINE_ID"] = baselineId;
        start.Environment["GOO_BENCHMARK_BASELINE_KEY"] = baselineKey;
        start.Environment["GOO_BENCHMARK_EXACT_COMMAND"] = exactCommand;
        start.Environment["GOO_BENCHMARK_PROCESS_INDEX"] = processIndex.ToString();
        using var process = Process.Start(start)
            ?? throw new InvalidOperationException("could not start core benchmark child");
        var processId = process.Id;
        var stdoutTask = process.StandardOutput.ReadToEndAsync();
        var stderrTask = process.StandardError.ReadToEndAsync();
        if (!process.WaitForExit(ChildTimeoutMilliseconds))
        {
            try
            {
                process.Kill(entireProcessTree: true);
            }
            catch (InvalidOperationException)
            {
            }
            process.WaitForExit(10_000);
            throw new InvalidOperationException(
                $"child {processIndex} exceeded the {ChildTimeoutMilliseconds}ms timeout and was killed");
        }
        Task.WaitAll(stdoutTask, stderrTask);
        var stdout = stdoutTask.Result;
        var stderr = stderrTask.Result;
        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException(
                $"child {processIndex} exited {process.ExitCode}: {stderr.Trim()}");
        }

        var lines = stdout.Split(['\r', '\n'], StringSplitOptions.RemoveEmptyEntries)
            .Where(line => line.StartsWith(CoreBenchmarkProtocol.OutputPrefix, StringComparison.Ordinal))
            .ToArray();
        if (lines.Length != 1)
        {
            throw new InvalidOperationException(
                $"child {processIndex} produced {lines.Length} core JSON records");
        }
        return new CoreBenchmarkChildProcess(
            processId,
            lines[0][CoreBenchmarkProtocol.OutputPrefix.Length..].Trim());
    }

    private static string ResolveAssembly()
    {
        var assembly = typeof(CoreBenchmarkRun).Assembly.Location;
        if (string.IsNullOrWhiteSpace(assembly))
        {
            assembly = Environment.GetCommandLineArgs()[0];
        }
        if (!File.Exists(assembly))
        {
            throw new FileNotFoundException("built Goo.Benchmarks assembly was not found", assembly);
        }
        return Path.GetFullPath(assembly);
    }

    private static string ResolveDotnet() =>
        Environment.GetEnvironmentVariable("DOTNET_HOST_PATH")?.Trim() is { Length: > 0 } path
            ? path
            : "dotnet";

    private static string CommandLine(string dotnet, string assembly, params string[] arguments) =>
        string.Join(" ", new[] { Quote(dotnet), Quote(assembly) }.Concat(arguments));

    private static string Quote(string value) =>
        value.Contains(' ') || value.Contains('\t')
            ? "\"" + value.Replace("\"", "\\\"") + "\""
            : value;

    private static CoreBenchmarkChildResult ReadChild(
        string json,
        int expectedProcessIndex,
        int expectedProcessId,
        string expectedBaselineId,
        string expectedBaselineKey,
        string expectedCommand,
        BenchmarkProvenance expectedProvenance,
        string expectedConfiguration,
        string expectedGooConfiguration)
    {
        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        RequireInt(root, "schemaVersion", 2);
        RequireString(root, "schema", "goo-gsharp.core.cpu-allocation.historical.run.v1");
        RequireString(root, "suite", "core");
        RequireString(root, "status", "passed");
        RequireString(root, "baselineId", expectedBaselineId);
        RequireString(root, "baselineKey", expectedBaselineKey);
        RequireNull(root, "parentBaselineId");
        RequireBool(root, "qualifiesS04Q10", false);

        var attempt = Required(root, "attempt");
        RequireInt(attempt, "number", 1);
        RequireInt(attempt, "processId", expectedProcessId);
        RequireTimestamp(attempt, "startedAtUtc");
        RequireTimestamp(attempt, "completedAtUtc");
        RequireInt(attempt, "exitCode", 0);
        RequireStringNonEmpty(attempt, "runtime");
        RequireStringNonEmpty(attempt, "os");
        RequireStringNonEmpty(attempt, "architecture");
        RequireStringNonEmpty(attempt, "cpu");
        RequireString(attempt, "tieredCompilation", "0");
        RequireString(attempt, "quickJit", "0");

        var provenance = Required(root, "provenance");
        RequireString(provenance, "protocolVersion", expectedProvenance.ProtocolVersion);
        RequireString(provenance, "gooRevision", expectedProvenance.GooRevision);
        RequireBool(provenance, "gooDirty", expectedProvenance.GooDirty);
        RequireString(provenance, "gooVersion", expectedProvenance.GooVersion);
        RequireString(provenance, "gsharpSdk", expectedProvenance.GsharpSdk);
        RequireString(provenance, "workloadRevision", expectedProvenance.WorkloadRevision);
        RequireString(provenance, "os", expectedProvenance.Os);
        RequireString(provenance, "rid", expectedProvenance.Rid);
        RequireString(provenance, "cpu", expectedProvenance.Cpu);
        RequireString(provenance, "gpu", expectedProvenance.Gpu);
        RequireString(provenance, "driver", expectedProvenance.Driver);
        RequireBool(provenance, "untracked", expectedProvenance.Untracked);
        RequireString(provenance, "configuration", expectedConfiguration);
        RequireString(provenance, "gooConfiguration", expectedGooConfiguration);
        RequireString(provenance, "backend", "Skia");
        RequireString(provenance, "benchmarkBinarySha256", expectedProvenance.BenchmarkBinarySha256);
        RequireString(provenance, "sourceInputSha256", expectedProvenance.SourceInputSha256);
        RequireHash(provenance, "benchmarkBinarySha256");
        RequireHash(provenance, "sourceInputSha256");
        RequireNull(provenance, "visualHash");
        RequireNull(provenance, "packageHash");
        RequireBool(provenance, "qualifiesS04Q10", false);
        var provenanceFingerprint = ProvenanceFingerprint(provenance);

        var protocol = Required(root, "protocol");
        RequireString(protocol, "protocolSchema", "goo-gsharp.core.cpu-allocation.historical.protocol.v1");
        RequireString(protocol, "metricSchema", "goo-gsharp.core.cpu-allocation.historical.metrics.v1");
        RequireString(protocol, "workloadSchema", "goo-gsharp.core.cpu-allocation.historical.workload.v1");
        RequireString(protocol, "workloadRevision", "core-cpu-allocation-r1");
        RequireInt(protocol, "requiredProcesses", CoreBenchmarkProtocol.RequiredProcesses);
        RequireInt(protocol, "warmupOperations", CoreBenchmarkProtocol.WarmupOperations);
        RequireInt(protocol, "measuredOperations", CoreBenchmarkProtocol.MeasuredOperations);
        RequireString(protocol, "configuration", expectedConfiguration);
        RequireString(protocol, "gooConfiguration", expectedGooConfiguration);
        RequireString(protocol, "backend", "Skia");
        RequireString(protocol, "exactCommand", expectedCommand);
        RequireInt(protocol, "processIndex", expectedProcessIndex);
        RequireString(protocol, "baselineId", expectedBaselineId);
        RequireString(protocol, "baselineKey", expectedBaselineKey);
        RequireBool(protocol, "qualifiesS04Q10", false);

        var workloads = new Dictionary<string, CoreBenchmarkChildWorkload>(StringComparer.Ordinal);
        foreach (var workload in Required(root, "workloads").EnumerateArray())
        {
            var id = RequiredString(workload, "workloadId");
            if (!CoreBenchmarkWorkloads.Required.Contains(id, StringComparer.Ordinal)
                || !workloads.TryAdd(id, ReadWorkload(workload)))
            {
                throw new InvalidOperationException($"child {expectedProcessIndex} has an invalid or duplicate workload {id}");
            }
        }

        if (workloads.Count != CoreBenchmarkWorkloads.Required.Length
            || CoreBenchmarkWorkloads.Required.Any(id => !workloads.ContainsKey(id)))
        {
            throw new InvalidOperationException($"child {expectedProcessIndex} has an incomplete workload set");
        }

        return new CoreBenchmarkChildResult(workloads, provenanceFingerprint);
    }

    private static CoreBenchmarkChildWorkload ReadWorkload(JsonElement workload)
    {
        var id = RequiredString(workload, "workloadId");
        var definition = CoreBenchmarkWorkloads.Definition(id);
        RequireString(workload, "variant", CoreBenchmarkWorkloads.Variant(id));
        RequireString(workload, "name", CoreBenchmarkWorkloads.Name(id));
        RequireString(workload, "description", definition.Description);
        RequireString(workload, "revision", definition.Revision);
        RequireString(workload, "metricSemantic", definition.MetricSemantic);
        RequireInt(workload, "rows", 200);
        RequireInt(workload, "nodes", 1_001);
        RequireInt(workload, "iterations", 1);
        var sampleCount = RequiredInt(workload, "sampleCount");
        if (sampleCount != CoreBenchmarkProtocol.MeasuredOperations)
        {
            throw new InvalidOperationException(
                $"{id} reported {sampleCount} samples instead of {CoreBenchmarkProtocol.MeasuredOperations}");
        }

        var units = Required(workload, "units");
        RequireString(units, "cpu", "microseconds_per_operation");
        RequireString(units, "allocation", "bytes_per_operation");

        var sampleElements = Required(workload, "samples").EnumerateArray().ToArray();
        if (sampleElements.Length != sampleCount)
        {
            throw new InvalidOperationException($"{id} sample count does not match its sample array");
        }

        var cpu = new double[sampleCount];
        var allocation = new long[sampleCount];
        for (var index = 0; index < sampleElements.Length; index++)
        {
            var sample = sampleElements[index];
            RequireInt(sample, "sampleIndex", index);
            cpu[index] = RequiredDouble(sample, "cpuUs");
            allocation[index] = RequiredLong(sample, "allocationBytes");
            if (!double.IsFinite(cpu[index]) || cpu[index] < 0)
            {
                throw new InvalidOperationException($"{id} sample {index} has an invalid CPU value");
            }
            if (allocation[index] < 0)
            {
                throw new InvalidOperationException($"{id} sample {index} has a negative allocation value");
            }
        }

        var aggregates = Required(workload, "aggregates");
        var expectedCpu = CoreBenchmarkStatistics.Double(cpu);
        var expectedAllocation = CoreBenchmarkStatistics.Long(allocation);
        ValidateDoubleAggregate(aggregates, "cpuUs", expectedCpu);
        ValidateLongAggregate(aggregates, "allocationBytes", expectedAllocation);
        return new CoreBenchmarkChildWorkload(
            id,
            cpu,
            allocation,
            expectedCpu,
            expectedAllocation);
    }

    private static IReadOnlyList<CoreBenchmarkBatchPooledWorkload> Pool(
        IReadOnlyList<CoreBenchmarkChildResult> children)
    {
        var result = new List<CoreBenchmarkBatchPooledWorkload>(CoreBenchmarkWorkloads.Required.Length);
        foreach (var id in CoreBenchmarkWorkloads.Required)
        {
            var cpu = new double[CoreBenchmarkProtocol.RequiredProcesses * CoreBenchmarkProtocol.MeasuredOperations];
            var allocation = new long[cpu.Length];
            var offset = 0;
            foreach (var child in children)
            {
                var workload = child.Workloads[id];
                workload.CpuUs.CopyTo(cpu, offset);
                workload.AllocationBytes.CopyTo(allocation, offset);
                offset += workload.CpuUs.Length;
            }

            if (offset != CoreBenchmarkProtocol.RequiredProcesses * CoreBenchmarkProtocol.MeasuredOperations)
            {
                throw new InvalidOperationException($"{id} pooled sample count is {offset}");
            }
            result.Add(new CoreBenchmarkBatchPooledWorkload(
                id,
                offset,
                CoreBenchmarkStatistics.Double(cpu),
                CoreBenchmarkStatistics.Long(allocation)));
        }
        return result;
    }

    private static JsonElement Required(JsonElement element, string name)
    {
        if (!element.TryGetProperty(name, out var value))
        {
            throw new InvalidOperationException($"JSON property {name} is missing");
        }
        return value;
    }

    private static string RequiredString(JsonElement element, string name)
    {
        var value = Required(element, name);
        if (value.ValueKind != JsonValueKind.String || string.IsNullOrWhiteSpace(value.GetString()))
        {
            throw new InvalidOperationException($"JSON property {name} is not a non-empty string");
        }
        return value.GetString()!;
    }

    private static void RequireString(JsonElement element, string name, string expected)
    {
        if (RequiredString(element, name) != expected)
        {
            throw new InvalidOperationException($"JSON property {name} does not match {expected}");
        }
    }

    private static void RequireStringNonEmpty(JsonElement element, string name) =>
        _ = RequiredString(element, name);

    private static void RequireBool(JsonElement element, string name, bool expected)
    {
        var value = Required(element, name);
        if (value.ValueKind != JsonValueKind.True && value.ValueKind != JsonValueKind.False)
        {
            throw new InvalidOperationException($"JSON property {name} is not a boolean");
        }
        if (value.GetBoolean() != expected)
        {
            throw new InvalidOperationException($"JSON property {name} does not match {expected}");
        }
    }

    private static void RequireInt(JsonElement element, string name, int expected)
    {
        if (Required(element, name).ValueKind != JsonValueKind.Number
            || Required(element, name).GetInt32() != expected)
        {
            throw new InvalidOperationException($"JSON property {name} does not match {expected}");
        }
    }

    private static void RequireNull(JsonElement element, string name)
    {
        if (Required(element, name).ValueKind != JsonValueKind.Null)
        {
            throw new InvalidOperationException($"JSON property {name} must be null");
        }
    }

    private static void RequireTimestamp(JsonElement element, string name)
    {
        var value = RequiredString(element, name);
        if (!DateTimeOffset.TryParse(value, out _))
        {
            throw new InvalidOperationException($"JSON property {name} is not a timestamp");
        }
    }

    private static void RequireHash(JsonElement element, string name)
    {
        var value = RequiredString(element, name);
        if (value != "unavailable" && !Regex.IsMatch(value, "^[0-9a-f]{64}$", RegexOptions.CultureInvariant))
        {
            throw new InvalidOperationException($"JSON property {name} is not a lowercase SHA-256 digest");
        }
    }

    private static int RequiredInt(JsonElement element, string name)
    {
        var value = Required(element, name);
        if (value.ValueKind != JsonValueKind.Number)
        {
            throw new InvalidOperationException($"JSON property {name} is not an integer");
        }
        return value.GetInt32();
    }

    private static long RequiredLong(JsonElement element, string name)
    {
        var value = Required(element, name);
        if (value.ValueKind != JsonValueKind.Number)
        {
            throw new InvalidOperationException($"JSON property {name} is not an integer");
        }
        return value.GetInt64();
    }

    private static double RequiredDouble(JsonElement element, string name)
    {
        var value = Required(element, name);
        if (value.ValueKind != JsonValueKind.Number)
        {
            throw new InvalidOperationException($"JSON property {name} is not a number");
        }
        var number = value.GetDouble();
        if (!double.IsFinite(number))
        {
            throw new InvalidOperationException($"JSON property {name} is not finite");
        }
        return number;
    }

    private static string ProvenanceFingerprint(JsonElement provenance) => string.Join(
        "|",
        RequiredString(provenance, "protocolVersion"),
        RequiredString(provenance, "gooRevision"),
        Required(provenance, "gooDirty").GetBoolean(),
        RequiredString(provenance, "gooVersion"),
        RequiredString(provenance, "gsharpSdk"),
        RequiredString(provenance, "workloadRevision"),
        RequiredString(provenance, "os"),
        RequiredString(provenance, "rid"),
        RequiredString(provenance, "cpu"),
        RequiredString(provenance, "gpu"),
        RequiredString(provenance, "driver"),
        Required(provenance, "untracked").GetBoolean(),
        RequiredString(provenance, "configuration"),
        RequiredString(provenance, "gooConfiguration"),
        RequiredString(provenance, "backend"),
        RequiredString(provenance, "benchmarkBinarySha256"),
        RequiredString(provenance, "sourceInputSha256"),
        Required(provenance, "visualHash").ValueKind,
        Required(provenance, "packageHash").ValueKind,
        Required(provenance, "qualifiesS04Q10").GetBoolean());

    private static void ValidateDoubleAggregate(
        JsonElement aggregates,
        string name,
        CoreBenchmarkDoubleAggregate expected)
    {
        var value = Required(aggregates, name);
        if (!NearlyEqual(value, "min", expected.Min)
            || !NearlyEqual(value, "median", expected.Median)
            || !NearlyEqual(value, "p50", expected.P50)
            || !NearlyEqual(value, "p95", expected.P95)
            || !NearlyEqual(value, "p99", expected.P99)
            || !NearlyEqual(value, "p99_9", expected.P999)
            || !NearlyEqual(value, "worst", expected.Worst)
            || !NearlyEqual(value, "max", expected.Max))
        {
            throw new InvalidOperationException($"{name} aggregate does not match its raw samples");
        }
    }

    private static void ValidateLongAggregate(
        JsonElement aggregates,
        string name,
        CoreBenchmarkLongAggregate expected)
    {
        var value = Required(aggregates, name);
        if (RequiredLong(value, "min") != expected.Min
            || RequiredLong(value, "median") != expected.Median
            || RequiredLong(value, "p50") != expected.P50
            || RequiredLong(value, "p95") != expected.P95
            || RequiredLong(value, "p99") != expected.P99
            || RequiredLong(value, "p99_9") != expected.P999
            || RequiredLong(value, "worst") != expected.Worst
            || RequiredLong(value, "max") != expected.Max)
        {
            throw new InvalidOperationException($"{name} aggregate does not match its raw samples");
        }
    }

    private static bool NearlyEqual(JsonElement element, string name, double expected) =>
        Math.Abs(RequiredDouble(element, name) - expected) <= Math.Max(1e-9, Math.Abs(expected) * 1e-9);
}

internal sealed class CoreBenchmarkChildProcess
{
    internal CoreBenchmarkChildProcess(int processId, string json)
    {
        ProcessId = processId;
        Json = json;
    }

    internal int ProcessId { get; }
    internal string Json { get; }
}

internal sealed class CoreBenchmarkChildResult
{
    internal CoreBenchmarkChildResult(
        Dictionary<string, CoreBenchmarkChildWorkload> workloads,
        string provenanceFingerprint)
    {
        Workloads = workloads;
        ProvenanceFingerprint = provenanceFingerprint;
    }

    internal Dictionary<string, CoreBenchmarkChildWorkload> Workloads { get; }
    internal string ProvenanceFingerprint { get; }
}

internal sealed class CoreBenchmarkChildWorkload
{
    internal CoreBenchmarkChildWorkload(
        string workloadId,
        double[] cpuUs,
        long[] allocationBytes,
        CoreBenchmarkDoubleAggregate cpuAggregate,
        CoreBenchmarkLongAggregate allocationAggregate)
    {
        WorkloadId = workloadId;
        CpuUs = cpuUs;
        AllocationBytes = allocationBytes;
        CpuUsAggregate = cpuAggregate;
        AllocationBytesAggregate = allocationAggregate;
    }

    internal string WorkloadId { get; }
    internal double[] CpuUs { get; }
    internal long[] AllocationBytes { get; }
    internal CoreBenchmarkDoubleAggregate CpuUsAggregate { get; }
    internal CoreBenchmarkLongAggregate AllocationBytesAggregate { get; }
}

internal sealed class CoreBenchmarkBatchRun
{
    internal CoreBenchmarkBatchRun(
        int processIndex,
        int processId,
        string artifact,
        string sha256,
        IReadOnlyList<CoreBenchmarkBatchRunWorkload> workloads)
    {
        ProcessIndex = processIndex;
        ProcessId = processId;
        Artifact = artifact;
        Sha256 = sha256;
        Status = "passed";
        Workloads = workloads;
    }

    public int ProcessIndex { get; }
    public int ProcessId { get; }
    public string Artifact { get; }
    public string Sha256 { get; }
    public string Status { get; }
    public IReadOnlyList<CoreBenchmarkBatchRunWorkload> Workloads { get; }
}

internal sealed class CoreBenchmarkBatchRunWorkload
{
    internal CoreBenchmarkBatchRunWorkload(
        string workloadId,
        CoreBenchmarkDoubleAggregate cpuUs,
        CoreBenchmarkLongAggregate allocationBytes)
    {
        WorkloadId = workloadId;
        CpuUs = cpuUs;
        AllocationBytes = allocationBytes;
    }

    public string WorkloadId { get; }
    public CoreBenchmarkDoubleAggregate CpuUs { get; }
    public CoreBenchmarkLongAggregate AllocationBytes { get; }
}

internal sealed class CoreBenchmarkBatchPooledWorkload
{
    internal CoreBenchmarkBatchPooledWorkload(
        string workloadId,
        int sampleCount,
        CoreBenchmarkDoubleAggregate cpuUs,
        CoreBenchmarkLongAggregate allocationBytes)
    {
        WorkloadId = workloadId;
        SampleCount = sampleCount;
        CpuUs = cpuUs;
        AllocationBytes = allocationBytes;
    }

    public string WorkloadId { get; }
    public int SampleCount { get; }
    public CoreBenchmarkDoubleAggregate CpuUs { get; }
    public CoreBenchmarkLongAggregate AllocationBytes { get; }
}

internal sealed class CoreBenchmarkBatchManifest
{
    internal CoreBenchmarkBatchManifest(
        string baselineId,
        string baselineKey,
        CoreBenchmarkProtocolMetadata protocol,
        BenchmarkProvenance provenance,
        IReadOnlyList<CoreBenchmarkBatchRun> runs,
        IReadOnlyList<CoreBenchmarkBatchPooledWorkload> workloads)
    {
        BaselineId = baselineId;
        BaselineKey = baselineKey;
        Protocol = protocol;
        Provenance = provenance;
        Runs = runs;
        Workloads = workloads;
    }

    public string Schema { get; } = "goo-gsharp.core.cpu-allocation.historical.batch.v1";
    public string BaselineId { get; }
    public string BaselineKey { get; }
    public string? ParentBaselineId { get; } = null;
    public bool QualifiesS04Q10 { get; } = false;
    public CoreBenchmarkProtocolMetadata Protocol { get; }
    public BenchmarkProvenance Provenance { get; }
    public IReadOnlyList<CoreBenchmarkBatchRun> Runs { get; }
    public IReadOnlyList<CoreBenchmarkBatchPooledWorkload> Workloads { get; }
    public string? VisualHash { get; } = null;
    public string? PackageHash { get; } = null;
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ManifestSha256 { get; private set; }

    internal void SetManifestSha256(string value) => ManifestSha256 = value;
}
