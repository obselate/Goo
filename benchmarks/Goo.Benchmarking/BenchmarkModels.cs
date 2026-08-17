using System.Text.Json.Serialization;

namespace Goo.Benchmarking;

public sealed class BenchmarkMetricSamples
{
    public BenchmarkMetricSamples()
    {
    }

    public BenchmarkMetricSamples(string metricId, string unit, IReadOnlyList<double> samples)
    {
        MetricId = metricId ?? throw new ArgumentNullException(nameof(metricId));
        Unit = unit ?? throw new ArgumentNullException(nameof(unit));
        Samples = samples?.ToList() ?? throw new ArgumentNullException(nameof(samples));
    }

    public BenchmarkMetricSamples(string metricId, string unit, IReadOnlyList<long> samples)
        : this(metricId, unit, samples?.Select(static sample => (double)sample).ToArray()
            ?? throw new ArgumentNullException(nameof(samples)))
    {
    }

    public string MetricId { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    public List<double> Samples { get; init; } = [];

    [JsonIgnore]
    public int SampleCount => Samples?.Count ?? 0;
}

public sealed class BenchmarkWorkloadRun
{
    public BenchmarkWorkloadRun()
    {
    }

    public BenchmarkWorkloadRun(string workloadId, string revision,
        IReadOnlyList<BenchmarkMetricSamples> metrics,
        int warmupCount = BenchmarkProtocol.WarmupCount,
        int measuredCount = BenchmarkProtocol.MeasuredCount)
    {
        WorkloadId = workloadId ?? throw new ArgumentNullException(nameof(workloadId));
        Revision = revision ?? throw new ArgumentNullException(nameof(revision));
        Metrics = metrics?.ToList() ?? throw new ArgumentNullException(nameof(metrics));
        WarmupCount = warmupCount;
        MeasuredCount = measuredCount;
    }

    public string WorkloadId { get; init; } = string.Empty;
    public string Revision { get; init; } = string.Empty;
    public int WarmupCount { get; init; } = BenchmarkProtocol.WarmupCount;
    public int MeasuredCount { get; init; } = BenchmarkProtocol.MeasuredCount;
    public List<BenchmarkMetricSamples> Metrics { get; init; } = [];
}

public sealed class BenchmarkFailure
{
    public BenchmarkFailure()
    {
    }

    public BenchmarkFailure(string type, string message, string? workloadId = null, string? stackTrace = null)
    {
        Type = type ?? throw new ArgumentNullException(nameof(type));
        Message = message ?? throw new ArgumentNullException(nameof(message));
        WorkloadId = workloadId;
        StackTrace = stackTrace;
    }

    public string? WorkloadId { get; init; }
    public string Type { get; init; } = string.Empty;
    public string Message { get; init; } = string.Empty;
    public string? StackTrace { get; init; }
}

public sealed class BenchmarkChildRun
{
    public BenchmarkChildRun()
    {
    }

    public BenchmarkChildRun(
        string suite,
        string baselineId,
        string baselineKey,
        int processIndex,
        IReadOnlyList<BenchmarkWorkloadRun> workloads,
        BenchmarkProvenance? provenance = null,
        string? parentBaselineId = null,
        string status = "passed",
        int exitCode = 0)
    {
        Suite = suite ?? throw new ArgumentNullException(nameof(suite));
        BaselineId = baselineId ?? throw new ArgumentNullException(nameof(baselineId));
        BaselineKey = baselineKey ?? throw new ArgumentNullException(nameof(baselineKey));
        ProcessIndex = processIndex;
        Workloads = workloads?.ToList() ?? throw new ArgumentNullException(nameof(workloads));
        Provenance = provenance ?? new BenchmarkProvenance();
        ParentBaselineId = parentBaselineId;
        Status = status ?? throw new ArgumentNullException(nameof(status));
        ExitCode = exitCode;
    }

    public int SchemaVersion { get; init; } = BenchmarkProtocol.SchemaVersion;
    public string Schema { get; init; } = BenchmarkProtocol.ChildRunSchema;
    public string Suite { get; init; } = string.Empty;
    public string Status { get; init; } = "passed";
    public string BaselineId { get; init; } = string.Empty;
    public string BaselineKey { get; init; } = string.Empty;
    public string? ParentBaselineId { get; init; }
    public int ProcessIndex { get; init; }
    public int? ProcessId { get; init; }
    public int? ExitCode { get; init; } = 0;
    public BenchmarkProvenance Provenance { get; init; } = new();
    public List<BenchmarkWorkloadRun> Workloads { get; init; } = [];
    public BenchmarkFailure? Failure { get; init; }

    public static BenchmarkChildRun Failed(
        string suite,
        string baselineId,
        string baselineKey,
        int processIndex,
        string type,
        string message,
        BenchmarkProvenance? provenance = null,
        string? parentBaselineId = null,
        string? workloadId = null,
        string? stackTrace = null) => new()
        {
            Suite = suite,
            BaselineId = baselineId,
            BaselineKey = baselineKey,
            ProcessIndex = processIndex,
            ParentBaselineId = parentBaselineId,
            Provenance = provenance ?? new BenchmarkProvenance(),
            Status = "failed",
            ExitCode = 1,
            Failure = new BenchmarkFailure(type, message, workloadId, stackTrace),
        };
}

public sealed class BenchmarkProvenance
{
    public string? SourceCommit { get; init; }
    public bool? SourceDirty { get; init; }
    public string? WorkloadManifestSha256 { get; init; }
    public string? BenchmarkBinarySha256 { get; init; }
    public BenchmarkNativeAotSettings? NativeAotSettings { get; init; }
    public string? NativeAotBinarySha256 { get; init; }
    public string? GSharpSdkPackage { get; init; }
    public string? GSharpSdkDigest { get; init; }
    public string? DotnetRuntime { get; init; }
    public string? Os { get; init; }
    public string? Kernel { get; init; }
    public string? Rid { get; init; }
    public string? Cpu { get; init; }
    public string? Gpu { get; init; }
    public string? GraphicsDeviceEvidenceSource { get; init; }
    public string? Driver { get; init; }
    public string? DriverEvidenceSource { get; init; }
    public string? DriverState { get; init; }
    public string? Backend { get; init; }
    public string? GraphicsImplementation { get; init; }
    public string? GraphicsImplementationEvidenceSource { get; init; }
    public string? PowerMode { get; init; }
    public string? PowerEvidenceSource { get; init; }
    public BenchmarkDisplayConfiguration? Display { get; init; }
    public string? PresentMode { get; init; }
    public string? ObservedPresentSetting { get; init; }
    public string? PresentEvidenceSource { get; init; }
    public string? WaylandCompositor { get; init; }
    public string? WaylandSession { get; init; }
    public string? SdlVideoDriver { get; init; }
    public string? WaylandSessionId { get; init; }
    public string? WaylandSessionEvidenceSource { get; init; }
    public string? WaylandSocket { get; init; }
    public string? WaylandSocketEvidenceSource { get; init; }
    public string? WaylandRuntimeDirectory { get; init; }
    public string? WaylandRuntimeEvidenceSource { get; init; }
    public string? WaylandCompositorEvidenceSource { get; init; }
    public List<BenchmarkFileHash>? FontFiles { get; init; }
    public string? FontFallback { get; init; }
    public string? FontRasterOptions { get; init; }
    public string? FontEvidenceSource { get; init; }
    public BenchmarkArtifact? BuildSidecarArtifact { get; init; }
    public string? ExactCommand { get; init; }
    public string? BuildConfiguration { get; init; }
    public int? ProcessCount { get; init; } = BenchmarkProtocol.RequiredProcesses;
    public int? WarmupCount { get; init; } = BenchmarkProtocol.WarmupCount;
    public int? MeasuredCount { get; init; } = BenchmarkProtocol.MeasuredCount;
}

public sealed class BenchmarkNativeAotSettings
{
    public bool? Enabled { get; init; }
    public string? Configuration { get; init; }
    public string? RuntimeIdentifier { get; init; }
    public bool? PublishTrimmed { get; init; }
    public bool? StripSymbols { get; init; }
    public bool? SelfContained { get; init; }
    public bool? InvariantGlobalization { get; init; }
    public string? IlcOptimizationPreference { get; init; }
    public string? AdditionalSettings { get; init; }
}

public sealed class BenchmarkBuildSidecar
{
    public string? Configuration { get; init; }
    public string? TargetFramework { get; init; }
    public string? RuntimeIdentifier { get; init; }
    public string? SdkIdentity { get; init; }
    public string? CompilerIdentity { get; init; }
    public string? RuntimePackIdentity { get; init; }
    public bool? NativeAot { get; init; }
    public bool? PublishTrimmed { get; init; }
    public bool? StripSymbols { get; init; }
    public bool? SelfContained { get; init; }
    public bool? InvariantGlobalization { get; init; }
    public string? IlcOptimizationPreference { get; init; }
    public string? OutputPath { get; init; }
    public long? OutputBytes { get; init; }
    public string? OutputSha256 { get; init; }
    public string? GSharpSdkPackage { get; init; }
    public string? GSharpSdkDigest { get; init; }
}

public sealed class BenchmarkDisplayConfiguration
{
    public int? LogicalWidth { get; init; }
    public int? LogicalHeight { get; init; }
    public int? FramebufferWidth { get; init; }
    public int? FramebufferHeight { get; init; }
    public double? ContentScaleX { get; init; }
    public double? ContentScaleY { get; init; }
    public double? DpiX { get; init; }
    public double? DpiY { get; init; }
    public string? EvidenceSource { get; init; }
    public int? Width { get; init; }
    public int? Height { get; init; }
    public double? RefreshHz { get; init; }
    public double? Dpi { get; init; }
    public string? PixelFormat { get; init; }
    public string? ColorSpace { get; init; }
}

public sealed class BenchmarkFileHash
{
    public BenchmarkFileHash()
    {
    }

    public BenchmarkFileHash(string name, string sha256)
    {
        Name = name ?? throw new ArgumentNullException(nameof(name));
        Sha256 = sha256 ?? throw new ArgumentNullException(nameof(sha256));
    }

    public string Name { get; init; } = string.Empty;
    public string Sha256 { get; init; } = string.Empty;
}

public sealed class BenchmarkMetricAggregate
{
    public BenchmarkMetricAggregate()
    {
    }

    internal BenchmarkMetricAggregate(string metricId, string unit, IReadOnlyList<double> samples)
    {
        MetricId = metricId;
        Unit = unit;
        SampleCount = samples.Count;
        Min = samples.Min();
        P50 = BenchmarkStatistics.NearestRank(samples, 0.50);
        P95 = BenchmarkStatistics.NearestRank(samples, 0.95);
        P99 = BenchmarkStatistics.NearestRank(samples, 0.99);
        P999 = BenchmarkStatistics.NearestRank(samples, 0.999);
        Worst = samples.Max();
    }

    public string MetricId { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    public int SampleCount { get; init; }
    public double Min { get; init; }
    public double P50 { get; init; }
    public double P95 { get; init; }
    public double P99 { get; init; }
    [JsonPropertyName("p99_9")]
    public double P999 { get; init; }
    public double Worst { get; init; }

    [JsonIgnore]
    public double Median => P50;

    [JsonIgnore]
    public double P99_9 => P999;

    [JsonIgnore]
    public double Max => Worst;
}

public sealed class BenchmarkPooledMetric
{
    public BenchmarkPooledMetric()
    {
    }

    internal BenchmarkPooledMetric(string metricId, string unit, IReadOnlyList<double> samples)
    {
        MetricId = metricId;
        Unit = unit;
        Samples = samples.ToList();
        Aggregate = new BenchmarkMetricAggregate(metricId, unit, Samples);
    }

    public string MetricId { get; init; } = string.Empty;
    public string Unit { get; init; } = string.Empty;
    public List<double> Samples { get; init; } = [];
    public BenchmarkMetricAggregate Aggregate { get; init; } = new();
}

public sealed class BenchmarkPooledWorkload
{
    public BenchmarkPooledWorkload()
    {
    }

    internal BenchmarkPooledWorkload(string workloadId, string revision,
        IReadOnlyList<BenchmarkPooledMetric> metrics)
    {
        WorkloadId = workloadId;
        Revision = revision;
        RunCount = BenchmarkProtocol.RequiredProcesses;
        WarmupCount = BenchmarkProtocol.WarmupCount;
        MeasuredCount = BenchmarkProtocol.PooledMeasuredCount;
        Metrics = metrics.ToList();
    }

    public string WorkloadId { get; init; } = string.Empty;
    public string Revision { get; init; } = string.Empty;
    public int RunCount { get; init; }
    public int WarmupCount { get; init; }
    public int MeasuredCount { get; init; }
    public List<BenchmarkPooledMetric> Metrics { get; init; } = [];
}

public sealed class BenchmarkRunSummary
{
    public int ProcessIndex { get; init; }
    public int? ProcessId { get; init; }
    public string Status { get; init; } = string.Empty;
    public BenchmarkProvenance Provenance { get; init; } = new();
    public List<BenchmarkWorkloadSummary> Workloads { get; init; } = [];
}

public sealed class BenchmarkWorkloadSummary
{
    public string WorkloadId { get; init; } = string.Empty;
    public string Revision { get; init; } = string.Empty;
    public int WarmupCount { get; init; }
    public int MeasuredCount { get; init; }
    public List<BenchmarkMetricAggregate> Metrics { get; init; } = [];
}

public sealed class BenchmarkArtifact
{
    public BenchmarkArtifact()
    {
    }

    public BenchmarkArtifact(string path, string sha256, long? bytes = null)
    {
        Path = path ?? throw new ArgumentNullException(nameof(path));
        Sha256 = sha256 ?? throw new ArgumentNullException(nameof(sha256));
        Bytes = bytes;
    }

    public string Path { get; init; } = string.Empty;
    public string Sha256 { get; init; } = string.Empty;
    public long? Bytes { get; init; }
}

public sealed class BenchmarkGateResult
{
    public string GateId { get; init; } = string.Empty;
    public string Status { get; init; } = string.Empty;
    public string? EvidenceSource { get; init; }
    public string? Details { get; init; }
}

public sealed class BenchmarkBatchManifest
{
    public int SchemaVersion { get; init; } = BenchmarkProtocol.SchemaVersion;
    public string Schema { get; init; } = BenchmarkProtocol.ManifestSchema;
    public string ProtocolVersion { get; init; } = BenchmarkProtocol.ProtocolVersion;
    public string Suite { get; init; } = string.Empty;
    public string BaselineId { get; init; } = string.Empty;
    public string BaselineKey { get; init; } = string.Empty;
    public string? ParentBaselineId { get; init; }
    public string? WorkloadManifestSha256 { get; init; }
    public int ProcessCount { get; init; } = BenchmarkProtocol.RequiredProcesses;
    public int WarmupCount { get; init; } = BenchmarkProtocol.WarmupCount;
    public int MeasuredCountPerRun { get; init; } = BenchmarkProtocol.MeasuredCount;
    public int PooledMeasuredCount { get; init; } = BenchmarkProtocol.PooledMeasuredCount;
    public List<BenchmarkRunSummary> Runs { get; init; } = [];
    public List<BenchmarkPooledWorkload> Workloads { get; init; } = [];
    public List<BenchmarkArtifact> RawArtifacts { get; init; } = [];
    public List<BenchmarkArtifact> VisualArtifacts { get; init; } = [];
    public List<BenchmarkArtifact> PackageArtifacts { get; init; } = [];
    public List<BenchmarkArtifact> SourceConfigurationArtifacts { get; init; } = [];
    public List<BenchmarkGateResult> Gates { get; init; } = [];
    public int ValidationErrorCount { get; init; }
    public BenchmarkProvenance Provenance { get; init; } = new();
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public string? ContentHash { get; init; }

    public string ComputeContentHash() => BenchmarkHashes.Sha256CanonicalJson(WithoutContentHash());

    public bool VerifyContentHash() =>
        ContentHash is not null &&
        string.Equals(ContentHash, ComputeContentHash(),
            StringComparison.OrdinalIgnoreCase);

    internal BenchmarkBatchManifest WithoutContentHash() => new()
    {
        SchemaVersion = SchemaVersion,
        Schema = Schema,
        ProtocolVersion = ProtocolVersion,
        Suite = Suite,
        BaselineId = BaselineId,
        BaselineKey = BaselineKey,
        ParentBaselineId = ParentBaselineId,
        WorkloadManifestSha256 = WorkloadManifestSha256,
        ProcessCount = ProcessCount,
        WarmupCount = WarmupCount,
        MeasuredCountPerRun = MeasuredCountPerRun,
        PooledMeasuredCount = PooledMeasuredCount,
        Runs = (Runs ?? []).ToList(),
        Workloads = (Workloads ?? []).ToList(),
        RawArtifacts = (RawArtifacts ?? []).ToList(),
        VisualArtifacts = (VisualArtifacts ?? []).ToList(),
        PackageArtifacts = (PackageArtifacts ?? []).ToList(),
        SourceConfigurationArtifacts = (SourceConfigurationArtifacts ?? []).ToList(),
        Gates = (Gates ?? []).ToList(),
        ValidationErrorCount = ValidationErrorCount,
        Provenance = Provenance ?? new(),
    };
}

public sealed class BenchmarkBatchResult
{
    internal BenchmarkBatchResult(
        IReadOnlyList<BenchmarkChildRun> runs,
        IReadOnlyList<BenchmarkPooledWorkload> workloads,
        BenchmarkBatchManifest manifest)
    {
        Runs = runs.ToList();
        Workloads = workloads.ToList();
        Manifest = manifest;
    }

    public List<BenchmarkChildRun> Runs { get; }
    public List<BenchmarkPooledWorkload> Workloads { get; }
    public BenchmarkBatchManifest Manifest { get; }
}

public sealed class BenchmarkBatchValidationOptions
{
    public int RequiredProcesses { get; init; } = BenchmarkProtocol.RequiredProcesses;
    public int WarmupCount { get; init; } = BenchmarkProtocol.WarmupCount;
    public int MeasuredCount { get; init; } = BenchmarkProtocol.MeasuredCount;
    public string? Suite { get; init; }
    public string? Schema { get; init; } = BenchmarkProtocol.ChildRunSchema;
    public string? BaselineId { get; init; }
    public string? BaselineKey { get; init; }
    public string? ParentBaselineId { get; init; }
    public IReadOnlyDictionary<string, string>? WorkloadRevisions { get; init; }
    public IReadOnlyList<BenchmarkArtifact>? VisualArtifacts { get; init; }
    public IReadOnlyList<BenchmarkArtifact>? PackageArtifacts { get; init; }
    public IReadOnlyList<BenchmarkArtifact>? SourceConfigurationArtifacts { get; init; }
    public IReadOnlyList<BenchmarkGateResult>? Gates { get; init; }
    public int ValidationErrorCount { get; init; }
}

public sealed class BenchmarkValidationException : InvalidOperationException
{
    public BenchmarkValidationException(IReadOnlyList<string> errors)
        : base(string.Join("; ", errors))
    {
        Errors = errors.ToList();
    }

    public List<string> Errors { get; }
}

public sealed class BenchmarkProcessOutput
{
    public BenchmarkProcessOutput(int exitCode, string standardOutput, string? standardError = null, int? processId = null)
    {
        ExitCode = exitCode;
        StandardOutput = standardOutput ?? throw new ArgumentNullException(nameof(standardOutput));
        StandardError = standardError;
        ProcessId = processId;
    }

    public int ExitCode { get; }
    public string StandardOutput { get; }
    public string? StandardError { get; }
    public int? ProcessId { get; }
}
