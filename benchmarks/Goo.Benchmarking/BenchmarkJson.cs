using System.Text.Json;
using System.Text;
using System.Text.Json.Serialization.Metadata;

namespace Goo.Benchmarking;

public static class BenchmarkJson
{
    public static string SerializeCanonical<T>(T value)
    {
        return Encoding.UTF8.GetString(SerializeCanonicalUtf8(value));
    }

    public static byte[] SerializeCanonicalUtf8<T>(T value)
    {
        var input = JsonSerializer.SerializeToUtf8Bytes(value, GetTypeInfo<T>());
        using var document = JsonDocument.Parse(input);
        using var stream = new MemoryStream(input.Length);
        using (var writer = new Utf8JsonWriter(stream, new JsonWriterOptions { Indented = false }))
        {
            WriteCanonical(document.RootElement, writer);
        }
        return stream.ToArray();
    }

    public static string SerializeIndented<T>(T value) =>
        JsonSerializer.Serialize(value, GetIndentedTypeInfo<T>());

    public static T? Deserialize<T>(string json)
    {
        ArgumentNullException.ThrowIfNull(json);
        return JsonSerializer.Deserialize(ExtractJson(json), GetTypeInfo<T>());
    }

    public static BenchmarkChildRun DeserializeChildRun(string json) =>
        Deserialize<BenchmarkChildRun>(json)
        ?? throw new BenchmarkValidationException(["child run JSON was null"]);

    public static BenchmarkBatchManifest DeserializeManifest(string json) =>
        Deserialize<BenchmarkBatchManifest>(json)
        ?? throw new BenchmarkValidationException(["manifest JSON was null"]);

    public static BenchmarkBuildSidecar DeserializeBuildSidecar(string json) =>
        Deserialize<BenchmarkBuildSidecar>(json)
        ?? throw new BenchmarkValidationException(["build sidecar JSON was null"]);

    private static JsonTypeInfo<T> GetTypeInfo<T>() =>
        typeof(T) switch
        {
            var type when type == typeof(BenchmarkMetricSamples) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkMetricSamples,
            var type when type == typeof(BenchmarkWorkloadRun) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkWorkloadRun,
            var type when type == typeof(BenchmarkFailure) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkFailure,
            var type when type == typeof(BenchmarkChildRun) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkChildRun,
            var type when type == typeof(BenchmarkProvenance) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkProvenance,
            var type when type == typeof(BenchmarkNativeAotSettings) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkNativeAotSettings,
            var type when type == typeof(BenchmarkBuildSidecar) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkBuildSidecar,
            var type when type == typeof(BenchmarkDisplayConfiguration) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkDisplayConfiguration,
            var type when type == typeof(BenchmarkFileHash) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkFileHash,
            var type when type == typeof(BenchmarkMetricAggregate) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkMetricAggregate,
            var type when type == typeof(BenchmarkPooledMetric) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkPooledMetric,
            var type when type == typeof(BenchmarkPooledWorkload) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkPooledWorkload,
            var type when type == typeof(BenchmarkRunSummary) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkRunSummary,
            var type when type == typeof(BenchmarkWorkloadSummary) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkWorkloadSummary,
            var type when type == typeof(BenchmarkArtifact) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkArtifact,
            var type when type == typeof(BenchmarkBatchManifest) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonContext.Default.BenchmarkBatchManifest,
            _ => throw new NotSupportedException($"No source-generated JSON metadata exists for {typeof(T).FullName}.")
        };

    private static JsonTypeInfo<T> GetIndentedTypeInfo<T>() =>
        typeof(T) switch
        {
            var type when type == typeof(BenchmarkMetricSamples) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkMetricSamples,
            var type when type == typeof(BenchmarkWorkloadRun) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkWorkloadRun,
            var type when type == typeof(BenchmarkFailure) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkFailure,
            var type when type == typeof(BenchmarkChildRun) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkChildRun,
            var type when type == typeof(BenchmarkProvenance) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkProvenance,
            var type when type == typeof(BenchmarkNativeAotSettings) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkNativeAotSettings,
            var type when type == typeof(BenchmarkBuildSidecar) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkBuildSidecar,
            var type when type == typeof(BenchmarkDisplayConfiguration) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkDisplayConfiguration,
            var type when type == typeof(BenchmarkFileHash) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkFileHash,
            var type when type == typeof(BenchmarkMetricAggregate) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkMetricAggregate,
            var type when type == typeof(BenchmarkPooledMetric) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkPooledMetric,
            var type when type == typeof(BenchmarkPooledWorkload) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkPooledWorkload,
            var type when type == typeof(BenchmarkRunSummary) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkRunSummary,
            var type when type == typeof(BenchmarkWorkloadSummary) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkWorkloadSummary,
            var type when type == typeof(BenchmarkArtifact) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkArtifact,
            var type when type == typeof(BenchmarkBatchManifest) =>
                (JsonTypeInfo<T>)(object)BenchmarkJsonIndentedContext.Default.BenchmarkBatchManifest,
            _ => throw new NotSupportedException($"No source-generated JSON metadata exists for {typeof(T).FullName}.")
        };

    public static string ExtractJson(string output)
    {
        ArgumentNullException.ThrowIfNull(output);
        var trimmed = output.Trim();
        if (trimmed.StartsWith('{'))
        {
            return trimmed;
        }

        var start = trimmed.IndexOf('{');
        if (start < 0)
        {
            throw new BenchmarkValidationException(["benchmark output did not contain a JSON object"]);
        }

        var end = trimmed.LastIndexOf('}');
        if (end < start)
        {
            throw new BenchmarkValidationException(["benchmark output did not contain a complete JSON object"]);
        }
        return trimmed[start..(end + 1)];
    }

    private static void WriteCanonical(JsonElement element, Utf8JsonWriter writer)
    {
        switch (element.ValueKind)
        {
            case JsonValueKind.Object:
                writer.WriteStartObject();
                foreach (var property in element.EnumerateObject().OrderBy(
                    static property => property.Name, StringComparer.Ordinal))
                {
                    writer.WritePropertyName(property.Name);
                    WriteCanonical(property.Value, writer);
                }
                writer.WriteEndObject();
                break;
            case JsonValueKind.Array:
                writer.WriteStartArray();
                foreach (var item in element.EnumerateArray())
                {
                    WriteCanonical(item, writer);
                }
                writer.WriteEndArray();
                break;
            case JsonValueKind.String:
                writer.WriteStringValue(element.GetString());
                break;
            case JsonValueKind.Number:
                writer.WriteRawValue(element.GetRawText(), true);
                break;
            case JsonValueKind.True:
                writer.WriteBooleanValue(true);
                break;
            case JsonValueKind.False:
                writer.WriteBooleanValue(false);
                break;
            case JsonValueKind.Null:
                writer.WriteNullValue();
                break;
            default:
                throw new JsonException($"Unsupported JSON value kind {element.ValueKind}.");
        }
    }
}
