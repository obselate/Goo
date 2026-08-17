using System.Text.Json.Serialization;

namespace Goo.Benchmarking;

[JsonSourceGenerationOptions(
    GenerationMode = JsonSourceGenerationMode.Metadata,
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true,
    UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
    DefaultIgnoreCondition = JsonIgnoreCondition.Never,
    WriteIndented = false)]
[JsonSerializable(typeof(BenchmarkMetricSamples))]
[JsonSerializable(typeof(BenchmarkWorkloadRun))]
[JsonSerializable(typeof(BenchmarkFailure))]
[JsonSerializable(typeof(BenchmarkChildRun))]
[JsonSerializable(typeof(BenchmarkProvenance))]
[JsonSerializable(typeof(BenchmarkNativeAotSettings))]
[JsonSerializable(typeof(BenchmarkDisplayConfiguration))]
[JsonSerializable(typeof(BenchmarkFileHash))]
[JsonSerializable(typeof(BenchmarkMetricAggregate))]
[JsonSerializable(typeof(BenchmarkPooledMetric))]
[JsonSerializable(typeof(BenchmarkPooledWorkload))]
[JsonSerializable(typeof(BenchmarkRunSummary))]
[JsonSerializable(typeof(BenchmarkWorkloadSummary))]
[JsonSerializable(typeof(BenchmarkArtifact))]
[JsonSerializable(typeof(BenchmarkBatchManifest))]
internal partial class BenchmarkJsonContext : JsonSerializerContext
{
}

[JsonSourceGenerationOptions(
    GenerationMode = JsonSourceGenerationMode.Metadata,
    PropertyNamingPolicy = JsonKnownNamingPolicy.CamelCase,
    PropertyNameCaseInsensitive = true,
    UnmappedMemberHandling = JsonUnmappedMemberHandling.Disallow,
    DefaultIgnoreCondition = JsonIgnoreCondition.Never,
    WriteIndented = true)]
[JsonSerializable(typeof(BenchmarkMetricSamples))]
[JsonSerializable(typeof(BenchmarkWorkloadRun))]
[JsonSerializable(typeof(BenchmarkFailure))]
[JsonSerializable(typeof(BenchmarkChildRun))]
[JsonSerializable(typeof(BenchmarkProvenance))]
[JsonSerializable(typeof(BenchmarkNativeAotSettings))]
[JsonSerializable(typeof(BenchmarkDisplayConfiguration))]
[JsonSerializable(typeof(BenchmarkFileHash))]
[JsonSerializable(typeof(BenchmarkMetricAggregate))]
[JsonSerializable(typeof(BenchmarkPooledMetric))]
[JsonSerializable(typeof(BenchmarkPooledWorkload))]
[JsonSerializable(typeof(BenchmarkRunSummary))]
[JsonSerializable(typeof(BenchmarkWorkloadSummary))]
[JsonSerializable(typeof(BenchmarkArtifact))]
[JsonSerializable(typeof(BenchmarkBatchManifest))]
internal partial class BenchmarkJsonIndentedContext : JsonSerializerContext
{
}
