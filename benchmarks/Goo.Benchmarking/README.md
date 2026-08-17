# Goo.Benchmarking

`Goo.Benchmarking` is the shared Release `net10.0` protocol library for Goo
benchmark producers and consumers. It has no Goo core reference.

Each `BenchmarkChildRun` has one process index, stable `baselineId`,
`baselineKey`, optional `parentBaselineId`, and one or more workload records.
Each workload carries an ID, revision, exactly 300 warmups, and exactly 2,000
raw measured samples for every metric. `BenchmarkStatistics` reports nearest
rank p50, p95, p99, p99.9, and worst values.

`BenchmarkBatchRunner.RunSequential`, `RunSequentialJson`, and
`RunSequentialProcesses` execute five children in process-index order. The
validator rejects failed, missing, duplicate, incomplete, or mismatched runs.
It concatenates the five raw distributions into exactly 10,000 samples per
metric before calculating pooled percentiles. It never averages percentiles.

`BenchmarkProvenance` contains nullable fields for source commit and dirty
state, workload manifest and benchmark binary hashes, NativeAOT settings and
binary hash, G# SDK package and digest, .NET runtime, OS and kernel, RID,
CPU/GPU/driver/driver state, backend and graphics implementation, power mode,
display resolution/refresh/DPI/pixel format/color space, present mode, Wayland
compositor/session, font hashes, fallback/raster options, exact command, and
run counts. Leave an unknown field `null`. The library does not invent machine
facts.

`BenchmarkJson.SerializeCanonical` sorts object keys and emits compact UTF-8
JSON. `BenchmarkHashes` provides SHA-256 helpers for bytes, text, streams,
files, and canonical JSON. Batch manifests include per-run summaries, pooled
raw samples, raw artifact hashes, and a content hash. Use
`BenchmarkManifestVerifier.Validate` before accepting a manifest.

```csharp
var runner = new BenchmarkBatchRunner();
var result = runner.RunSequential(index => new BenchmarkChildRun(
    "text-editor",
    baselineId,
    baselineKey,
    index,
    [new BenchmarkWorkloadRun(
        "q10.text-editing",
        "r2",
        [new BenchmarkMetricSamples("total-us", "microseconds", samples)])],
    provenance));
```

Build the library with:

```bash
dotnet build benchmarks/Goo.Benchmarking/Goo.Benchmarking.csproj \
  -c Release -t:Rebuild -warnaserror
```
