namespace Goo.Benchmarking;

public delegate BenchmarkChildRun BenchmarkChildRunFactory(int processIndex);

public delegate string BenchmarkChildJsonFactory(int processIndex);

public delegate BenchmarkProcessOutput BenchmarkProcessFactory(int processIndex);

public static class BenchmarkBatchValidator
{
    public static BenchmarkBatchResult ValidateAndAggregate(
        IEnumerable<BenchmarkChildRun> runs,
        BenchmarkBatchValidationOptions? options = null,
        IReadOnlyList<BenchmarkArtifact>? rawArtifacts = null)
    {
        ArgumentNullException.ThrowIfNull(runs);
        options ??= new BenchmarkBatchValidationOptions();
        var runList = runs.ToList();
        var errors = ValidateRuns(runList, options);
        if (errors.Count != 0)
        {
            throw new BenchmarkValidationException(errors);
        }

        var orderedRuns = runList.OrderBy(static run => run.ProcessIndex).ToList();
        var first = orderedRuns[0];
        var pooledWorkloads = BuildPooledWorkloads(orderedRuns, options);
        var summaries = orderedRuns.Select(BuildSummary).ToList();
        var manifestWithoutHash = new BenchmarkBatchManifest
        {
            Suite = first.Suite,
            BaselineId = first.BaselineId,
            BaselineKey = first.BaselineKey,
            ParentBaselineId = first.ParentBaselineId,
            WorkloadManifestSha256 = first.Provenance.WorkloadManifestSha256,
            Provenance = first.Provenance,
            ProcessCount = options.RequiredProcesses,
            WarmupCount = options.WarmupCount,
            MeasuredCountPerRun = options.MeasuredCount,
            PooledMeasuredCount = checked(options.RequiredProcesses * options.MeasuredCount),
            Runs = summaries,
            Workloads = pooledWorkloads,
            RawArtifacts = rawArtifacts?.ToList() ?? [],
        };
        var manifest = new BenchmarkBatchManifest
        {
            SchemaVersion = manifestWithoutHash.SchemaVersion,
            Schema = manifestWithoutHash.Schema,
            ProtocolVersion = manifestWithoutHash.ProtocolVersion,
            Suite = manifestWithoutHash.Suite,
            BaselineId = manifestWithoutHash.BaselineId,
            BaselineKey = manifestWithoutHash.BaselineKey,
            ParentBaselineId = manifestWithoutHash.ParentBaselineId,
            WorkloadManifestSha256 = manifestWithoutHash.WorkloadManifestSha256,
            Provenance = manifestWithoutHash.Provenance,
            ProcessCount = manifestWithoutHash.ProcessCount,
            WarmupCount = manifestWithoutHash.WarmupCount,
            MeasuredCountPerRun = manifestWithoutHash.MeasuredCountPerRun,
            PooledMeasuredCount = manifestWithoutHash.PooledMeasuredCount,
            Runs = manifestWithoutHash.Runs,
            Workloads = manifestWithoutHash.Workloads,
            RawArtifacts = manifestWithoutHash.RawArtifacts,
            ContentHash = manifestWithoutHash.ComputeContentHash(),
        };
        return new BenchmarkBatchResult(orderedRuns, pooledWorkloads, manifest);
    }

    public static void ValidateManifest(BenchmarkBatchManifest manifest, string? artifactDirectory = null)
    {
        ArgumentNullException.ThrowIfNull(manifest);
        var errors = new List<string>();
        if (!manifest.VerifyContentHash())
        {
            errors.Add("manifest content hash is missing or invalid");
        }
        if (manifest.SchemaVersion != BenchmarkProtocol.SchemaVersion)
        {
            errors.Add($"manifest schema version must be {BenchmarkProtocol.SchemaVersion}");
        }
        if (!string.Equals(manifest.Schema, BenchmarkProtocol.ManifestSchema, StringComparison.Ordinal))
        {
            errors.Add("manifest schema does not match");
        }
        if (!string.Equals(manifest.ProtocolVersion, BenchmarkProtocol.ProtocolVersion, StringComparison.Ordinal))
        {
            errors.Add("manifest protocol version does not match");
        }
        if (string.IsNullOrWhiteSpace(manifest.Suite))
        {
            errors.Add("manifest suite is missing");
        }
        if (string.IsNullOrWhiteSpace(manifest.BaselineId))
        {
            errors.Add("manifest baselineId is missing");
        }
        if (string.IsNullOrWhiteSpace(manifest.BaselineKey))
        {
            errors.Add("manifest baselineKey is missing");
        }
        if (string.IsNullOrWhiteSpace(manifest.WorkloadManifestSha256))
        {
            errors.Add("manifest workloadManifestSha256 is missing");
        }
        if (manifest.ProcessCount != BenchmarkProtocol.RequiredProcesses)
        {
            errors.Add($"manifest process count must be {BenchmarkProtocol.RequiredProcesses}");
        }
        if (manifest.WarmupCount != BenchmarkProtocol.WarmupCount)
        {
            errors.Add($"manifest warmup count must be {BenchmarkProtocol.WarmupCount}");
        }
        if (manifest.MeasuredCountPerRun != BenchmarkProtocol.MeasuredCount)
        {
            errors.Add($"manifest measured count must be {BenchmarkProtocol.MeasuredCount}");
        }
        if (manifest.PooledMeasuredCount != BenchmarkProtocol.PooledMeasuredCount)
        {
            errors.Add($"manifest pooled measured count must be {BenchmarkProtocol.PooledMeasuredCount}");
        }
        if (manifest.Provenance is null)
        {
            errors.Add("manifest provenance is missing");
        }
        else
        {
            ValidateProvenance(manifest.Provenance, "manifest", errors);
            if (!string.Equals(manifest.Provenance.WorkloadManifestSha256,
                manifest.WorkloadManifestSha256, StringComparison.Ordinal))
            {
                errors.Add("manifest provenance workload hash does not match");
            }
        }
        var summaries = manifest.Runs ?? [];
        if (summaries.Count != BenchmarkProtocol.RequiredProcesses)
        {
            errors.Add($"manifest must contain exactly {BenchmarkProtocol.RequiredProcesses} run summaries");
        }
        ValidateRunSummaries(summaries, manifest.Provenance, errors);
        ValidatePooledWorkloads(manifest.Workloads ?? [], summaries, errors);
        ValidateRawArtifacts(manifest, manifest.RawArtifacts ?? [], artifactDirectory, errors);
        if (errors.Count != 0)
        {
            throw new BenchmarkValidationException(errors);
        }
    }

    private static void ValidateProvenance(
        BenchmarkProvenance provenance,
        string scope,
        List<string> errors)
    {
        if (provenance.ProcessCount != BenchmarkProtocol.RequiredProcesses)
        {
            errors.Add($"{scope} provenance process count must be {BenchmarkProtocol.RequiredProcesses}");
        }
        if (provenance.WarmupCount != BenchmarkProtocol.WarmupCount)
        {
            errors.Add($"{scope} provenance warmup count must be {BenchmarkProtocol.WarmupCount}");
        }
        if (provenance.MeasuredCount != BenchmarkProtocol.MeasuredCount)
        {
            errors.Add($"{scope} provenance measured count must be {BenchmarkProtocol.MeasuredCount}");
        }
    }

    private static void ValidateRunSummaries(
        IReadOnlyList<BenchmarkRunSummary> summaries,
        BenchmarkProvenance? manifestProvenance,
        List<string> errors)
    {
        var indices = new HashSet<int>();
        var first = summaries.FirstOrDefault(static summary => summary is not null);
        var expectedProvenance = first?.Provenance is null
            ? null
            : BenchmarkJson.SerializeCanonical(first.Provenance);
        var expectedWorkloads = first is null
            ? new Dictionary<string, SummaryWorkloadSignature>(StringComparer.Ordinal)
            : SummaryWorkloadSignatures(first.Workloads ?? [], errors, "first run summary");
        foreach (var summary in summaries)
        {
            if (summary is null)
            {
                errors.Add("manifest contains a missing run summary");
                continue;
            }
            if (summary.ProcessIndex < 0 || summary.ProcessIndex >= BenchmarkProtocol.RequiredProcesses)
            {
                errors.Add($"manifest run summary process index {summary.ProcessIndex} is outside 0..4");
            }
            if (!indices.Add(summary.ProcessIndex))
            {
                errors.Add($"manifest has duplicate run summary process index {summary.ProcessIndex}");
            }
            if (!string.Equals(summary.Status, "passed", StringComparison.Ordinal))
            {
                errors.Add($"manifest run summary process {summary.ProcessIndex} is not passed");
            }
            if (summary.Provenance is null)
            {
                errors.Add($"manifest run summary process {summary.ProcessIndex} provenance is missing");
            }
            else
            {
                ValidateProvenance(summary.Provenance, $"run {summary.ProcessIndex}", errors);
                var provenanceJson = BenchmarkJson.SerializeCanonical(summary.Provenance);
                if (expectedProvenance is not null
                    && !string.Equals(expectedProvenance, provenanceJson, StringComparison.Ordinal))
                {
                    errors.Add($"manifest run summary process {summary.ProcessIndex} provenance does not match");
                }
                if (manifestProvenance is not null
                    && !string.Equals(BenchmarkJson.SerializeCanonical(manifestProvenance), provenanceJson,
                        StringComparison.Ordinal))
                {
                    errors.Add($"manifest run summary process {summary.ProcessIndex} provenance differs from manifest provenance");
                }
            }
            ValidateSummaryWorkloads(summary, expectedWorkloads, errors);
        }
        foreach (var index in Enumerable.Range(0, BenchmarkProtocol.RequiredProcesses))
        {
            if (!indices.Contains(index))
            {
                errors.Add($"manifest is missing run summary process index {index}");
            }
        }
    }

    private static void ValidateSummaryWorkloads(
        BenchmarkRunSummary summary,
        IReadOnlyDictionary<string, SummaryWorkloadSignature> expected,
        List<string> errors)
    {
        var workloads = summary.Workloads ?? [];
        if (workloads.Count == 0)
        {
            errors.Add($"manifest run summary process {summary.ProcessIndex} has no workloads");
            return;
        }
        var seen = new HashSet<string>(StringComparer.Ordinal);
        foreach (var workload in workloads)
        {
            if (workload is null)
            {
                errors.Add($"manifest run summary process {summary.ProcessIndex} contains a missing workload");
                continue;
            }
            if (!seen.Add(workload.WorkloadId))
            {
                errors.Add($"manifest run summary process {summary.ProcessIndex} has duplicate workload {workload.WorkloadId}");
            }
            if (!expected.TryGetValue(workload.WorkloadId, out var signature))
            {
                errors.Add($"manifest run summary process {summary.ProcessIndex} has unexpected workload {workload.WorkloadId}");
                continue;
            }
            if (!string.Equals(workload.Revision, signature.Revision, StringComparison.Ordinal))
            {
                errors.Add($"manifest run summary workload {workload.WorkloadId} revision does not match");
            }
            if (workload.WarmupCount != BenchmarkProtocol.WarmupCount
                || workload.MeasuredCount != BenchmarkProtocol.MeasuredCount)
            {
                errors.Add($"manifest run summary workload {workload.WorkloadId} counts do not match");
            }
            var metrics = workload.Metrics ?? [];
            if (metrics.Count == 0)
            {
                errors.Add($"manifest run summary workload {workload.WorkloadId} has no metrics");
                continue;
            }
            var seenMetrics = new HashSet<string>(StringComparer.Ordinal);
            foreach (var metric in metrics)
            {
                if (metric is null)
                {
                    errors.Add($"manifest run summary workload {workload.WorkloadId} contains a missing metric");
                    continue;
                }
                if (!seenMetrics.Add(metric.MetricId))
                {
                    errors.Add($"manifest run summary workload {workload.WorkloadId} has duplicate metric {metric.MetricId}");
                }
                if (!signature.Metrics.TryGetValue(metric.MetricId, out var unit))
                {
                    errors.Add($"manifest run summary workload {workload.WorkloadId} has unexpected metric {metric.MetricId}");
                }
                else if (!string.Equals(metric.Unit, unit, StringComparison.Ordinal))
                {
                    errors.Add($"manifest run summary workload {workload.WorkloadId} metric {metric.MetricId} unit does not match");
                }
                if (metric.SampleCount != BenchmarkProtocol.MeasuredCount)
                {
                    errors.Add($"manifest run summary workload {workload.WorkloadId} metric {metric.MetricId} count does not match");
                }
            }
            foreach (var metricId in signature.Metrics.Keys)
            {
                if (!seenMetrics.Contains(metricId))
                {
                    errors.Add($"manifest run summary workload {workload.WorkloadId} is missing metric {metricId}");
                }
            }
        }
        foreach (var workloadId in expected.Keys)
        {
            if (!seen.Contains(workloadId))
            {
                errors.Add($"manifest run summary process {summary.ProcessIndex} is missing workload {workloadId}");
            }
        }
    }

    private static Dictionary<string, SummaryWorkloadSignature> SummaryWorkloadSignatures(
        IReadOnlyList<BenchmarkWorkloadSummary> workloads,
        List<string> errors,
        string scope)
    {
        var result = new Dictionary<string, SummaryWorkloadSignature>(StringComparer.Ordinal);
        foreach (var workload in workloads)
        {
            if (workload is null)
            {
                errors.Add($"{scope} contains a missing workload");
                continue;
            }
            var metrics = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var metric in workload.Metrics ?? [])
            {
                if (metric is null)
                {
                    errors.Add($"{scope} workload {workload.WorkloadId} contains a missing metric");
                    continue;
                }
                if (!metrics.TryAdd(metric.MetricId, metric.Unit))
                {
                    errors.Add($"{scope} workload {workload.WorkloadId} has duplicate metric {metric.MetricId}");
                }
            }
            if (!result.TryAdd(workload.WorkloadId,
                new SummaryWorkloadSignature(workload.Revision, metrics)))
            {
                errors.Add($"{scope} has duplicate workload {workload.WorkloadId}");
            }
        }
        return result;
    }

    private static void ValidatePooledWorkloads(
        IReadOnlyList<BenchmarkPooledWorkload> workloads,
        IReadOnlyList<BenchmarkRunSummary> summaries,
        List<string> errors)
    {
        var expected = summaries.FirstOrDefault(static summary => summary is not null);
        var expectedSignatures = expected is null
            ? new Dictionary<string, SummaryWorkloadSignature>(StringComparer.Ordinal)
            : SummaryWorkloadSignatures(expected.Workloads ?? [], errors, "run summary");
        if (workloads.Count == 0)
        {
            errors.Add("manifest has no pooled workloads");
        }
        var seenWorkloads = new HashSet<string>(StringComparer.Ordinal);
        foreach (var workload in workloads)
        {
            if (workload is null)
            {
                errors.Add("manifest contains a missing pooled workload");
                continue;
            }
            if (!seenWorkloads.Add(workload.WorkloadId))
            {
                errors.Add($"manifest has duplicate pooled workload {workload.WorkloadId}");
            }
            if (!expectedSignatures.TryGetValue(workload.WorkloadId, out var signature))
            {
                errors.Add($"manifest has unexpected pooled workload {workload.WorkloadId}");
                continue;
            }
            if (!string.Equals(workload.Revision, signature.Revision, StringComparison.Ordinal))
            {
                errors.Add($"manifest pooled workload {workload.WorkloadId} revision does not match");
            }
            if (workload.RunCount != BenchmarkProtocol.RequiredProcesses
                || workload.WarmupCount != BenchmarkProtocol.WarmupCount
                || workload.MeasuredCount != BenchmarkProtocol.PooledMeasuredCount)
            {
                errors.Add($"manifest pooled workload {workload.WorkloadId} counts do not match");
            }
            var metrics = workload.Metrics ?? [];
            if (metrics.Count == 0)
            {
                errors.Add($"manifest pooled workload {workload.WorkloadId} has no metrics");
                continue;
            }
            var seenMetrics = new HashSet<string>(StringComparer.Ordinal);
            foreach (var metric in metrics)
            {
                if (metric is null)
                {
                    errors.Add($"manifest pooled workload {workload.WorkloadId} contains a missing metric");
                    continue;
                }
                if (!seenMetrics.Add(metric.MetricId))
                {
                    errors.Add($"manifest pooled workload {workload.WorkloadId} has duplicate metric {metric.MetricId}");
                }
                if (!signature.Metrics.TryGetValue(metric.MetricId, out var unit))
                {
                    errors.Add($"manifest pooled workload {workload.WorkloadId} has unexpected metric {metric.MetricId}");
                    continue;
                }
                if (!string.Equals(metric.Unit, unit, StringComparison.Ordinal))
                {
                    errors.Add($"manifest pooled workload {workload.WorkloadId} metric {metric.MetricId} unit does not match");
                }
                ValidatePooledMetric(workload, metric, errors);
            }
            foreach (var metricId in signature.Metrics.Keys)
            {
                if (!seenMetrics.Contains(metricId))
                {
                    errors.Add($"manifest pooled workload {workload.WorkloadId} is missing metric {metricId}");
                }
            }
        }
        foreach (var workloadId in expectedSignatures.Keys)
        {
            if (!seenWorkloads.Contains(workloadId))
            {
                errors.Add($"manifest is missing pooled workload {workloadId}");
            }
        }
    }

    private static void ValidatePooledMetric(
        BenchmarkPooledWorkload workload,
        BenchmarkPooledMetric metric,
        List<string> errors)
    {
        var samples = metric.Samples ?? [];
        if (samples.Count != BenchmarkProtocol.PooledMeasuredCount)
        {
            errors.Add($"manifest pooled workload {workload.WorkloadId} metric {metric.MetricId} has {samples.Count} samples");
            return;
        }
        if (metric.Aggregate is null)
        {
            errors.Add($"manifest pooled workload {workload.WorkloadId} metric {metric.MetricId} aggregate is missing");
            return;
        }
        BenchmarkMetricAggregate expected;
        try
        {
            expected = BenchmarkStatistics.Aggregate(
                new BenchmarkMetricSamples(metric.MetricId, metric.Unit, samples));
        }
        catch (ArgumentException exception)
        {
            errors.Add($"manifest pooled workload {workload.WorkloadId} metric {metric.MetricId}: {exception.Message}");
            return;
        }
        if (metric.Aggregate.SampleCount != BenchmarkProtocol.PooledMeasuredCount)
        {
            errors.Add($"manifest pooled workload {workload.WorkloadId} metric {metric.MetricId} aggregate count does not match");
        }
        if (!string.Equals(metric.Aggregate.MetricId, expected.MetricId, StringComparison.Ordinal)
            || !string.Equals(metric.Aggregate.Unit, expected.Unit, StringComparison.Ordinal)
            || metric.Aggregate.SampleCount != expected.SampleCount
            || metric.Aggregate.Min != expected.Min
            || metric.Aggregate.P50 != expected.P50
            || metric.Aggregate.P95 != expected.P95
            || metric.Aggregate.P99 != expected.P99
            || metric.Aggregate.P999 != expected.P999
            || metric.Aggregate.Worst != expected.Worst)
        {
            errors.Add($"manifest pooled workload {workload.WorkloadId} metric {metric.MetricId} aggregate does not match raw samples");
        }
    }

    private static void ValidateRawArtifacts(
        BenchmarkBatchManifest manifest,
        IReadOnlyList<BenchmarkArtifact> artifacts,
        string? artifactDirectory,
        List<string> errors)
    {
        if (artifacts.Count != BenchmarkProtocol.RequiredProcesses)
        {
            errors.Add($"manifest must contain exactly {BenchmarkProtocol.RequiredProcesses} raw artifacts");
        }
        var paths = new HashSet<string>(StringComparer.Ordinal);
        var pathsByProcess = new Dictionary<int, string>();
        var root = artifactDirectory is null ? null : Path.GetFullPath(artifactDirectory);
        foreach (var artifact in artifacts)
        {
            if (artifact is null)
            {
                errors.Add("manifest contains a missing raw artifact");
                continue;
            }
            if (string.IsNullOrWhiteSpace(artifact.Path))
            {
                errors.Add("raw artifact path is missing");
                continue;
            }
            if (!paths.Add(artifact.Path))
            {
                errors.Add($"duplicate raw artifact path: {artifact.Path}");
            }
            var processIndex = -1;
            for (var index = 0; index < BenchmarkProtocol.RequiredProcesses; index++)
            {
                if (string.Equals(artifact.Path, $"run-{index:D2}.json", StringComparison.Ordinal))
                {
                    processIndex = index;
                    break;
                }
            }
            if (processIndex < 0)
            {
                errors.Add($"raw artifact path must be run-00.json through run-04.json: {artifact.Path}");
            }
            else if (!pathsByProcess.TryAdd(processIndex, artifact.Path))
            {
                errors.Add($"duplicate raw artifact process index {processIndex}");
            }
            if (Path.IsPathFullyQualified(artifact.Path) || Path.IsPathRooted(artifact.Path))
            {
                errors.Add($"raw artifact path must be relative: {artifact.Path}");
                continue;
            }
            if (artifact.Bytes is null || artifact.Bytes.Value < 0)
            {
                errors.Add($"raw artifact byte length is missing: {artifact.Path}");
            }
            if (string.IsNullOrWhiteSpace(artifact.Sha256))
            {
                errors.Add($"raw artifact hash is missing: {artifact.Path}");
            }
            if (root is null)
            {
                continue;
            }
            try
            {
                var path = Path.GetFullPath(Path.Combine(root, artifact.Path));
                if (!IsWithin(root, path))
                {
                    errors.Add($"raw artifact path escapes artifact directory: {artifact.Path}");
                    continue;
                }
                if (HasSymlinkComponent(root, path))
                {
                    errors.Add($"raw artifact path contains a symlink: {artifact.Path}");
                    continue;
                }
                if (!File.Exists(path))
                {
                    errors.Add($"raw artifact is missing: {artifact.Path}");
                    continue;
                }
                var info = new FileInfo(path);
                if (artifact.Bytes is not null && info.Length != artifact.Bytes.Value)
                {
                    errors.Add($"raw artifact byte length mismatch: {artifact.Path}");
                }
                var digest = BenchmarkHashes.Sha256File(path);
                if (!string.Equals(digest, artifact.Sha256, StringComparison.OrdinalIgnoreCase))
                {
                    errors.Add($"raw artifact hash mismatch: {artifact.Path}");
                }
                if (processIndex >= 0 && pathsByProcess.TryGetValue(processIndex, out var mappedPath)
                    && string.Equals(mappedPath, artifact.Path, StringComparison.Ordinal))
                {
                    pathsByProcess[processIndex] = path;
                }
            }
            catch (Exception exception)
            {
                errors.Add($"raw artifact validation failed for {artifact.Path}: {exception.Message}");
            }
        }
        foreach (var index in Enumerable.Range(0, BenchmarkProtocol.RequiredProcesses))
        {
            if (!pathsByProcess.ContainsKey(index))
            {
                errors.Add($"manifest is missing raw artifact run-{index:D2}.json");
            }
        }
        if (root is null || pathsByProcess.Count != BenchmarkProtocol.RequiredProcesses)
        {
            return;
        }

        var runs = new Dictionary<int, BenchmarkChildRun>();
        foreach (var index in Enumerable.Range(0, BenchmarkProtocol.RequiredProcesses))
        {
            if (!pathsByProcess.TryGetValue(index, out var path) || !File.Exists(path))
            {
                continue;
            }
            try
            {
                var run = BenchmarkJson.DeserializeChildRun(File.ReadAllText(path));
                runs.Add(index, run);
                if (run.ProcessIndex != index)
                {
                    errors.Add($"raw artifact run-{index:D2}.json process index {run.ProcessIndex} does not match {index}");
                }
            }
            catch (Exception exception)
            {
                errors.Add($"raw artifact deserialization failed for run-{index:D2}.json: {exception.Message}");
            }
        }
        if (runs.Count != BenchmarkProtocol.RequiredProcesses)
        {
            return;
        }

        var firstSummary = (manifest.Runs ?? []).FirstOrDefault(static summary => summary is not null);
        var expectedRevisions = firstSummary is null
            ? null
            : SummaryWorkloadSignatures(firstSummary.Workloads ?? [], errors, "manifest run summary")
                .ToDictionary(static pair => pair.Key, static pair => pair.Value.Revision, StringComparer.Ordinal);
        errors.AddRange(ValidateRuns(
            runs.Values.OrderBy(static run => run.ProcessIndex).ToList(),
            new BenchmarkBatchValidationOptions
            {
                RequiredProcesses = BenchmarkProtocol.RequiredProcesses,
                WarmupCount = BenchmarkProtocol.WarmupCount,
                MeasuredCount = BenchmarkProtocol.MeasuredCount,
                Suite = manifest.Suite,
                Schema = BenchmarkProtocol.ChildRunSchema,
                BaselineId = manifest.BaselineId,
                BaselineKey = manifest.BaselineKey,
                ParentBaselineId = manifest.ParentBaselineId,
                WorkloadRevisions = expectedRevisions,
            }));
        ValidateRawRunSummaries(manifest, runs, errors);
        ValidateRawPooledSamples(manifest, runs, errors);
    }

    private static void ValidateRawRunSummaries(
        BenchmarkBatchManifest manifest,
        IReadOnlyDictionary<int, BenchmarkChildRun> runs,
        List<string> errors)
    {
        var summaries = (manifest.Runs ?? [])
            .Where(static summary => summary is not null)
            .GroupBy(static summary => summary.ProcessIndex)
            .ToDictionary(static group => group.Key, static group => group.First());
        foreach (var index in Enumerable.Range(0, BenchmarkProtocol.RequiredProcesses))
        {
            if (!runs.TryGetValue(index, out var run) || !summaries.TryGetValue(index, out var summary))
            {
                continue;
            }
            if (!string.Equals(run.Status, summary.Status, StringComparison.Ordinal))
            {
                errors.Add($"raw artifact run-{index:D2}.json status does not match run summary");
            }
            if (run.Provenance is null || summary.Provenance is null)
            {
                if (run.Provenance is not null || summary.Provenance is not null)
                {
                    errors.Add($"raw artifact run-{index:D2}.json provenance does not match run summary");
                }
            }
            else if (!string.Equals(
                BenchmarkJson.SerializeCanonical(run.Provenance),
                BenchmarkJson.SerializeCanonical(summary.Provenance),
                StringComparison.Ordinal))
            {
                errors.Add($"raw artifact run-{index:D2}.json provenance does not match run summary");
            }
            ValidateRawWorkloadsAgainstSummary(run, summary, errors);
        }
    }

    private static void ValidateRawWorkloadsAgainstSummary(
        BenchmarkChildRun run,
        BenchmarkRunSummary summary,
        List<string> errors)
    {
        var rawWorkloads = (run.Workloads ?? [])
            .Where(static workload => workload is not null)
            .GroupBy(static workload => workload.WorkloadId)
            .ToDictionary(static group => group.Key, static group => group.First(), StringComparer.Ordinal);
        var summaryWorkloads = (summary.Workloads ?? [])
            .Where(static workload => workload is not null)
            .GroupBy(static workload => workload.WorkloadId)
            .ToDictionary(static group => group.Key, static group => group.First(), StringComparer.Ordinal);
        foreach (var workloadId in rawWorkloads.Keys.Union(summaryWorkloads.Keys, StringComparer.Ordinal))
        {
            if (!rawWorkloads.TryGetValue(workloadId, out var rawWorkload)
                || !summaryWorkloads.TryGetValue(workloadId, out var summaryWorkload))
            {
                errors.Add($"raw artifact process {run.ProcessIndex} workload {workloadId} does not match run summary");
                continue;
            }
            if (!string.Equals(rawWorkload.Revision, summaryWorkload.Revision, StringComparison.Ordinal)
                || rawWorkload.WarmupCount != summaryWorkload.WarmupCount
                || rawWorkload.MeasuredCount != summaryWorkload.MeasuredCount)
            {
                errors.Add($"raw artifact process {run.ProcessIndex} workload {workloadId} metadata does not match run summary");
            }
            var rawMetrics = (rawWorkload.Metrics ?? [])
                .Where(static metric => metric is not null)
                .GroupBy(static metric => metric.MetricId)
                .ToDictionary(static group => group.Key, static group => group.First(), StringComparer.Ordinal);
            var summaryMetrics = (summaryWorkload.Metrics ?? [])
                .Where(static metric => metric is not null)
                .GroupBy(static metric => metric.MetricId)
                .ToDictionary(static group => group.Key, static group => group.First(), StringComparer.Ordinal);
            foreach (var metricId in rawMetrics.Keys.Union(summaryMetrics.Keys, StringComparer.Ordinal))
            {
                if (!rawMetrics.TryGetValue(metricId, out var rawMetric)
                    || !summaryMetrics.TryGetValue(metricId, out var summaryMetric))
                {
                    errors.Add($"raw artifact process {run.ProcessIndex} workload {workloadId} metric {metricId} does not match run summary");
                    continue;
                }
                BenchmarkMetricAggregate aggregate;
                try
                {
                    aggregate = BenchmarkStatistics.Aggregate(rawMetric);
                }
                catch (ArgumentException exception)
                {
                    errors.Add($"raw artifact process {run.ProcessIndex} workload {workloadId} metric {metricId}: {exception.Message}");
                    continue;
                }
                if (!string.Equals(rawMetric.Unit, summaryMetric.Unit, StringComparison.Ordinal)
                    || !AggregatesEqual(aggregate, summaryMetric))
                {
                    errors.Add($"raw artifact process {run.ProcessIndex} workload {workloadId} metric {metricId} aggregate does not match run summary");
                }
            }
        }
    }

    private static void ValidateRawPooledSamples(
        BenchmarkBatchManifest manifest,
        IReadOnlyDictionary<int, BenchmarkChildRun> runs,
        List<string> errors)
    {
        var pooledWorkloads = (manifest.Workloads ?? [])
            .Where(static workload => workload is not null)
            .GroupBy(static workload => workload.WorkloadId)
            .ToDictionary(static group => group.Key, static group => group.First(), StringComparer.Ordinal);
        foreach (var workloadEntry in pooledWorkloads)
        {
            var workloadId = workloadEntry.Key;
            var pooledWorkload = workloadEntry.Value;
            var pooledMetrics = (pooledWorkload.Metrics ?? [])
                .Where(static metric => metric is not null)
                .GroupBy(static metric => metric.MetricId)
                .ToDictionary(static group => group.Key, static group => group.First(), StringComparer.Ordinal);
            foreach (var metricEntry in pooledMetrics)
            {
                var metricId = metricEntry.Key;
                var pooledMetric = metricEntry.Value;
                var samples = new List<double>(BenchmarkProtocol.PooledMeasuredCount);
                var complete = true;
                foreach (var index in Enumerable.Range(0, BenchmarkProtocol.RequiredProcesses))
                {
                    if (!runs.TryGetValue(index, out var run))
                    {
                        complete = false;
                        continue;
                    }
                    var workload = (run.Workloads ?? []).FirstOrDefault(item =>
                        item is not null && string.Equals(item.WorkloadId, workloadId, StringComparison.Ordinal));
                    var metric = workload?.Metrics?.FirstOrDefault(item =>
                        item is not null && string.Equals(item.MetricId, metricId, StringComparison.Ordinal));
                    if (metric is null)
                    {
                        errors.Add($"raw artifact process {index} is missing workload {workloadId} metric {metricId}");
                        complete = false;
                        continue;
                    }
                    samples.AddRange(metric.Samples ?? []);
                }
                if (!complete)
                {
                    continue;
                }
                var pooledSamples = pooledMetric.Samples ?? [];
                if (samples.Count != pooledSamples.Count
                    || samples.Where((sample, index) => sample != pooledSamples[index]).Any())
                {
                    errors.Add($"raw artifact samples for workload {workloadId} metric {metricId} do not match pooled samples");
                }
                try
                {
                    var aggregate = BenchmarkStatistics.Aggregate(metricId, pooledMetric.Unit, samples);
                    if (pooledMetric.Aggregate is null || !AggregatesEqual(aggregate, pooledMetric.Aggregate))
                    {
                        errors.Add($"raw artifact aggregate for workload {workloadId} metric {metricId} does not match pooled aggregate");
                    }
                }
                catch (ArgumentException exception)
                {
                    errors.Add($"raw artifact pooled workload {workloadId} metric {metricId}: {exception.Message}");
                }
            }
        }
    }

    private static bool AggregatesEqual(BenchmarkMetricAggregate left, BenchmarkMetricAggregate right) =>
        string.Equals(left.MetricId, right.MetricId, StringComparison.Ordinal)
        && string.Equals(left.Unit, right.Unit, StringComparison.Ordinal)
        && left.SampleCount == right.SampleCount
        && left.Min == right.Min
        && left.P50 == right.P50
        && left.P95 == right.P95
        && left.P99 == right.P99
        && left.P999 == right.P999
        && left.Worst == right.Worst;

    private static bool HasSymlinkComponent(string root, string path)
    {
        var normalizedRoot = Path.GetFullPath(root);
        var relative = Path.GetRelativePath(normalizedRoot, path);
        var components = relative.Split([Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar],
            StringSplitOptions.RemoveEmptyEntries);
        var current = normalizedRoot;
        var rootInfo = new DirectoryInfo(current);
        if (rootInfo.LinkTarget is not null || (rootInfo.Attributes & FileAttributes.ReparsePoint) != 0)
        {
            return true;
        }
        for (var index = 0; index < components.Length; index++)
        {
            current = Path.Combine(current, components[index]);
            var directory = new DirectoryInfo(current);
            if (directory.LinkTarget is not null
                || (directory.Exists && (directory.Attributes & FileAttributes.ReparsePoint) != 0))
            {
                return true;
            }
            var file = new FileInfo(current);
            if (file.LinkTarget is not null
                || (file.Exists && (file.Attributes & FileAttributes.ReparsePoint) != 0))
            {
                return true;
            }
        }
        return false;
    }

    private sealed record SummaryWorkloadSignature(
        string Revision,
        IReadOnlyDictionary<string, string> Metrics);

    private static List<string> ValidateRuns(
        IReadOnlyList<BenchmarkChildRun> runs,
        BenchmarkBatchValidationOptions options)
    {
        var errors = new List<string>();
        if (options.RequiredProcesses != BenchmarkProtocol.RequiredProcesses)
        {
            errors.Add($"required process count must be {BenchmarkProtocol.RequiredProcesses}");
        }
        if (options.WarmupCount != BenchmarkProtocol.WarmupCount)
        {
            errors.Add($"warmup count must be {BenchmarkProtocol.WarmupCount}");
        }
        if (options.MeasuredCount != BenchmarkProtocol.MeasuredCount)
        {
            errors.Add($"measured count must be {BenchmarkProtocol.MeasuredCount}");
        }
        if (runs.Count != options.RequiredProcesses)
        {
            errors.Add($"expected exactly {options.RequiredProcesses} child runs, found {runs.Count}");
        }
        var duplicateIndices = runs.Where(static run => run is not null)
            .GroupBy(static run => run.ProcessIndex)
            .Where(static group => group.Count() > 1)
            .Select(static group => group.Key);
        foreach (var duplicateIndex in duplicateIndices)
        {
            errors.Add($"duplicate process index {duplicateIndex}");
        }
        var missingIndices = Enumerable.Range(0, options.RequiredProcesses)
            .Except(runs.Where(static run => run is not null).Select(static run => run.ProcessIndex));
        foreach (var missingIndex in missingIndices)
        {
            errors.Add($"missing process index {missingIndex}");
        }

        var first = runs.FirstOrDefault(static run => run is not null);
        if (first is null)
        {
            errors.Add("child runs are missing");
            return errors;
        }

        var expectedSuite = options.Suite ?? first.Suite;
        var expectedSchema = options.Schema ?? first.Schema;
        var expectedBaselineId = options.BaselineId ?? first.BaselineId;
        var expectedBaselineKey = options.BaselineKey ?? first.BaselineKey;
        var expectedParentBaselineId = options.ParentBaselineId ?? first.ParentBaselineId;
        var expectedProvenance = first.Provenance is null
            ? null
            : BenchmarkJson.SerializeCanonical(first.Provenance);
        if (first.Provenance is null)
        {
            errors.Add("first child run provenance is missing");
        }
        var expectedWorkloads = options.WorkloadRevisions
            ?? WorkloadRevisions(first.Workloads ?? [], errors, "first child run");
        var expectedMetrics = MetricSignatures(first.Workloads ?? [], errors, "first child run");

        foreach (var run in runs)
        {
            if (run is null)
            {
                errors.Add("child run is missing");
                continue;
            }
            if (run.ProcessIndex < 0 || run.ProcessIndex >= options.RequiredProcesses)
            {
                errors.Add($"process index {run.ProcessIndex} is outside 0..{options.RequiredProcesses - 1}");
            }
            if (!string.Equals(run.Status, "passed", StringComparison.Ordinal))
            {
                errors.Add($"process {run.ProcessIndex} is not passed");
            }
            if (run.Failure is not null)
            {
                errors.Add($"process {run.ProcessIndex} contains a failure record");
            }
            if (run.ExitCode != 0)
            {
                errors.Add($"process {run.ProcessIndex} exit code must be exactly 0");
            }
            if (run.SchemaVersion != BenchmarkProtocol.SchemaVersion)
            {
                errors.Add($"process {run.ProcessIndex} schema version is {run.SchemaVersion}");
            }
            if (!string.Equals(run.Schema, expectedSchema, StringComparison.Ordinal))
            {
                errors.Add($"process {run.ProcessIndex} schema does not match");
            }
            if (!string.Equals(run.Suite, expectedSuite, StringComparison.Ordinal))
            {
                errors.Add($"process {run.ProcessIndex} suite does not match");
            }
            if (!string.Equals(run.BaselineId, expectedBaselineId, StringComparison.Ordinal))
            {
                errors.Add($"process {run.ProcessIndex} baselineId does not match");
            }
            if (!string.Equals(run.BaselineKey, expectedBaselineKey, StringComparison.Ordinal))
            {
                errors.Add($"process {run.ProcessIndex} baselineKey does not match");
            }
            if (!string.Equals(run.ParentBaselineId, expectedParentBaselineId, StringComparison.Ordinal))
            {
                errors.Add($"process {run.ProcessIndex} parentBaselineId does not match");
            }
            if (string.IsNullOrWhiteSpace(run.BaselineId))
            {
                errors.Add($"process {run.ProcessIndex} baselineId is missing");
            }
            if (string.IsNullOrWhiteSpace(run.BaselineKey))
            {
                errors.Add($"process {run.ProcessIndex} baselineKey is missing");
            }
            if (run.Provenance is null)
            {
                errors.Add($"process {run.ProcessIndex} provenance is missing");
            }
            else
            {
                ValidateProvenance(run.Provenance, $"process {run.ProcessIndex}", errors);
                if (expectedProvenance is not null
                    && !string.Equals(expectedProvenance, BenchmarkJson.SerializeCanonical(run.Provenance),
                        StringComparison.Ordinal))
                {
                    errors.Add($"process {run.ProcessIndex} provenance does not match");
                }
            }
            ValidateWorkloads(run, expectedWorkloads, expectedMetrics, options, errors);
        }

        return errors;
    }

    private static void ValidateWorkloads(
        BenchmarkChildRun run,
        IReadOnlyDictionary<string, string> expectedWorkloads,
        IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> expectedMetrics,
        BenchmarkBatchValidationOptions options,
        List<string> errors)
    {
        var workloads = run.Workloads ?? [];
        if (workloads.Count == 0)
        {
            errors.Add($"process {run.ProcessIndex} has no workloads");
            return;
        }
        var duplicateWorkloads = workloads.Where(static workload => workload is not null)
            .GroupBy(static workload => workload.WorkloadId)
            .Where(static group => group.Count() > 1)
            .Select(static group => group.Key);
        foreach (var duplicateWorkload in duplicateWorkloads)
        {
            errors.Add($"process {run.ProcessIndex} has duplicate workload {duplicateWorkload}");
        }
        var workloadIds = workloads.Where(static workload => workload is not null)
            .Select(static workload => workload.WorkloadId).ToHashSet(StringComparer.Ordinal);
        foreach (var expected in expectedWorkloads)
        {
            if (!workloadIds.Contains(expected.Key))
            {
                errors.Add($"process {run.ProcessIndex} is missing workload {expected.Key}");
            }
        }
        foreach (var workload in workloads)
        {
            if (workload is null)
            {
                errors.Add($"process {run.ProcessIndex} contains a missing workload");
                continue;
            }
            if (!expectedWorkloads.TryGetValue(workload.WorkloadId, out var revision))
            {
                errors.Add($"process {run.ProcessIndex} has unexpected workload {workload.WorkloadId}");
            }
            else if (!string.Equals(workload.Revision, revision, StringComparison.Ordinal))
            {
                errors.Add($"process {run.ProcessIndex} workload {workload.WorkloadId} revision does not match");
            }
            if (workload.WarmupCount != options.WarmupCount)
            {
                errors.Add($"process {run.ProcessIndex} workload {workload.WorkloadId} warmup count is {workload.WarmupCount}");
            }
            if (workload.MeasuredCount != options.MeasuredCount)
            {
                errors.Add($"process {run.ProcessIndex} workload {workload.WorkloadId} measured count is {workload.MeasuredCount}");
            }
            expectedMetrics.TryGetValue(workload.WorkloadId, out var metrics);
            ValidateMetrics(run, workload, metrics, options, errors);
        }
    }

    private static void ValidateMetrics(
        BenchmarkChildRun run,
        BenchmarkWorkloadRun workload,
        IReadOnlyDictionary<string, string>? expectedMetrics,
        BenchmarkBatchValidationOptions options,
        List<string> errors)
    {
        var metrics = workload.Metrics ?? [];
        if (metrics.Count == 0)
        {
            errors.Add($"process {run.ProcessIndex} workload {workload.WorkloadId} has no metrics");
            return;
        }
        var duplicateMetrics = metrics.Where(static metric => metric is not null)
            .GroupBy(static metric => metric.MetricId)
            .Where(static group => group.Count() > 1)
            .Select(static group => group.Key);
        foreach (var duplicateMetric in duplicateMetrics)
        {
            errors.Add($"process {run.ProcessIndex} workload {workload.WorkloadId} has duplicate metric {duplicateMetric}");
        }
        foreach (var metric in metrics)
        {
            if (metric is null)
            {
                errors.Add($"process {run.ProcessIndex} workload {workload.WorkloadId} contains a missing metric");
                continue;
            }
            if (expectedMetrics is null || !expectedMetrics.TryGetValue(metric.MetricId, out var unit))
            {
                errors.Add($"process {run.ProcessIndex} workload {workload.WorkloadId} has unexpected metric {metric.MetricId}");
            }
            else if (!string.Equals(metric.Unit, unit, StringComparison.Ordinal))
            {
                errors.Add($"process {run.ProcessIndex} workload {workload.WorkloadId} metric {metric.MetricId} unit does not match");
            }
            var samples = metric.Samples ?? [];
            if (metric.SampleCount != options.MeasuredCount)
            {
                errors.Add($"process {run.ProcessIndex} workload {workload.WorkloadId} metric {metric.MetricId} has {metric.SampleCount} samples");
                continue;
            }
            try
            {
                BenchmarkStatistics.ValidateFinite(samples, metric.MetricId);
            }
            catch (ArgumentException exception)
            {
                errors.Add($"process {run.ProcessIndex} workload {workload.WorkloadId}: {exception.Message}");
            }
        }
        if (expectedMetrics is not null)
        {
            var actualIds = metrics.Where(static metric => metric is not null)
                .Select(static metric => metric.MetricId)
                .ToHashSet(StringComparer.Ordinal);
            foreach (var metricId in expectedMetrics.Keys)
            {
                if (!actualIds.Contains(metricId))
                {
                    errors.Add($"process {run.ProcessIndex} workload {workload.WorkloadId} is missing metric {metricId}");
                }
            }
        }
    }

    private static IReadOnlyDictionary<string, string> WorkloadRevisions(
        IReadOnlyList<BenchmarkWorkloadRun> workloads,
        List<string> errors,
        string context)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var workload in workloads)
        {
            if (workload is null)
            {
                errors.Add($"{context} contains a missing workload");
                continue;
            }
            if (!result.TryAdd(workload.WorkloadId, workload.Revision))
            {
                errors.Add($"{context} has duplicate workload {workload.WorkloadId}");
            }
        }
        return result;
    }

    private static IReadOnlyDictionary<string, IReadOnlyDictionary<string, string>> MetricSignatures(
        IReadOnlyList<BenchmarkWorkloadRun> workloads,
        List<string> errors,
        string context)
    {
        var result = new Dictionary<string, IReadOnlyDictionary<string, string>>(StringComparer.Ordinal);
        foreach (var workload in workloads)
        {
            if (workload is null)
            {
                errors.Add($"{context} contains a missing workload");
                continue;
            }
            var metrics = new Dictionary<string, string>(StringComparer.Ordinal);
            foreach (var metric in workload.Metrics ?? [])
            {
                if (metric is null)
                {
                    errors.Add($"{context} workload {workload.WorkloadId} contains a missing metric");
                    continue;
                }
                if (!metrics.TryAdd(metric.MetricId, metric.Unit))
                {
                    errors.Add($"{context} workload {workload.WorkloadId} has duplicate metric {metric.MetricId}");
                }
            }
            result[workload.WorkloadId] = metrics;
        }
        return result;
    }

    private static List<BenchmarkPooledWorkload> BuildPooledWorkloads(
        IReadOnlyList<BenchmarkChildRun> runs,
        BenchmarkBatchValidationOptions options)
    {
        var first = runs[0];
        var firstWorkloads = first.Workloads ?? [];
        var result = new List<BenchmarkPooledWorkload>(firstWorkloads.Count);
        foreach (var firstWorkload in firstWorkloads)
        {
            var firstMetrics = firstWorkload.Metrics ?? [];
            var metrics = new List<BenchmarkPooledMetric>(firstMetrics.Count);
            foreach (var firstMetric in firstMetrics)
            {
                var pooled = new List<double>(options.RequiredProcesses * options.MeasuredCount);
                foreach (var run in runs)
                {
                    var workload = (run.Workloads ?? []).Single(item =>
                        string.Equals(item.WorkloadId, firstWorkload.WorkloadId, StringComparison.Ordinal));
                    var metric = (workload.Metrics ?? []).Single(item =>
                        string.Equals(item.MetricId, firstMetric.MetricId, StringComparison.Ordinal));
                    pooled.AddRange(metric.Samples ?? []);
                }
                if (pooled.Count != BenchmarkProtocol.PooledMeasuredCount)
                {
                    throw new BenchmarkValidationException([
                        $"workload {firstWorkload.WorkloadId} metric {firstMetric.MetricId} pooled sample count is {pooled.Count}"]);
                }
                metrics.Add(new BenchmarkPooledMetric(firstMetric.MetricId, firstMetric.Unit, pooled));
            }
            result.Add(new BenchmarkPooledWorkload(firstWorkload.WorkloadId, firstWorkload.Revision, metrics));
        }
        return result;
    }

    private static BenchmarkRunSummary BuildSummary(BenchmarkChildRun run) => new()
    {
        ProcessIndex = run.ProcessIndex,
        Status = run.Status,
        Provenance = run.Provenance,
        Workloads = (run.Workloads ?? []).Select(workload => new BenchmarkWorkloadSummary
        {
            WorkloadId = workload.WorkloadId,
            Revision = workload.Revision,
            WarmupCount = workload.WarmupCount,
            MeasuredCount = workload.MeasuredCount,
            Metrics = (workload.Metrics ?? []).Select(BenchmarkStatistics.Aggregate).ToList(),
        }).ToList(),
    };

    private static bool IsWithin(string root, string path)
    {
        var normalizedRoot = Path.TrimEndingDirectorySeparator(root) + Path.DirectorySeparatorChar;
        return path.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase)
            || string.Equals(path, Path.TrimEndingDirectorySeparator(root), StringComparison.OrdinalIgnoreCase);
    }
}

public sealed class BenchmarkBatchRunner
{
    public BenchmarkBatchResult RunSequential(
        BenchmarkChildRunFactory childFactory,
        BenchmarkBatchValidationOptions? options = null,
        string? artifactDirectory = null)
    {
        ArgumentNullException.ThrowIfNull(childFactory);
        var directory = PrepareArtifactDirectory(artifactDirectory);
        var runs = new List<BenchmarkChildRun>(BenchmarkProtocol.RequiredProcesses);
        var artifacts = new List<BenchmarkArtifact>(BenchmarkProtocol.RequiredProcesses);
        for (var processIndex = 0; processIndex < BenchmarkProtocol.RequiredProcesses; processIndex++)
        {
            var run = childFactory(processIndex)
                ?? throw new BenchmarkValidationException([$"child factory returned null for process {processIndex}"]);
            runs.Add(run);
            if (directory is not null)
            {
                artifacts.Add(WriteChild(directory, processIndex, run));
            }
        }
        var result = BenchmarkBatchValidator.ValidateAndAggregate(runs, options, artifacts);
        if (directory is not null)
        {
            WriteManifest(directory, result.Manifest);
        }
        return result;
    }

    public BenchmarkBatchResult RunSequentialJson(
        BenchmarkChildJsonFactory childFactory,
        BenchmarkBatchValidationOptions? options = null,
        string? artifactDirectory = null)
    {
        ArgumentNullException.ThrowIfNull(childFactory);
        var directory = PrepareArtifactDirectory(artifactDirectory);
        var runs = new List<BenchmarkChildRun>(BenchmarkProtocol.RequiredProcesses);
        var artifacts = new List<BenchmarkArtifact>(BenchmarkProtocol.RequiredProcesses);
        for (var processIndex = 0; processIndex < BenchmarkProtocol.RequiredProcesses; processIndex++)
        {
            var json = childFactory(processIndex)
                ?? throw new BenchmarkValidationException([$"child factory returned null for process {processIndex}"]);
            var run = BenchmarkJson.DeserializeChildRun(json);
            runs.Add(run);
            if (directory is not null)
            {
                artifacts.Add(WriteJson(directory, processIndex, json));
            }
        }
        var result = BenchmarkBatchValidator.ValidateAndAggregate(runs, options, artifacts);
        if (directory is not null)
        {
            WriteManifest(directory, result.Manifest);
        }
        return result;
    }

    public BenchmarkBatchResult RunSequentialProcesses(
        BenchmarkProcessFactory processFactory,
        BenchmarkBatchValidationOptions? options = null,
        string? artifactDirectory = null)
    {
        ArgumentNullException.ThrowIfNull(processFactory);
        var directory = PrepareArtifactDirectory(artifactDirectory);
        var runs = new List<BenchmarkChildRun>(BenchmarkProtocol.RequiredProcesses);
        var artifacts = new List<BenchmarkArtifact>(BenchmarkProtocol.RequiredProcesses);
        for (var processIndex = 0; processIndex < BenchmarkProtocol.RequiredProcesses; processIndex++)
        {
            var output = processFactory(processIndex)
                ?? throw new BenchmarkValidationException([$"process factory returned null for process {processIndex}"]);
            if (output.ExitCode != 0)
            {
                throw new BenchmarkValidationException([
                    $"process {processIndex} exited with code {output.ExitCode}"]);
            }
            var run = BenchmarkJson.DeserializeChildRun(output.StandardOutput);
            runs.Add(run);
            if (directory is not null)
            {
                artifacts.Add(WriteJson(directory, processIndex, output.StandardOutput));
            }
        }
        var result = BenchmarkBatchValidator.ValidateAndAggregate(runs, options, artifacts);
        if (directory is not null)
        {
            WriteManifest(directory, result.Manifest);
        }
        return result;
    }

    private static string? PrepareArtifactDirectory(string? artifactDirectory)
    {
        if (artifactDirectory is null)
        {
            return null;
        }
        var directory = Path.GetFullPath(artifactDirectory);
        Directory.CreateDirectory(directory);
        if (Directory.EnumerateFileSystemEntries(directory).Any())
        {
            throw new BenchmarkValidationException(["artifact directory must be empty"]);
        }
        return directory;
    }

    private static BenchmarkArtifact WriteChild(string directory, int processIndex, BenchmarkChildRun run)
    {
        var json = BenchmarkJson.SerializeCanonical(run);
        return WriteJson(directory, processIndex, json);
    }

    private static BenchmarkArtifact WriteJson(string directory, int processIndex, string json)
    {
        var path = Path.Combine(directory, $"run-{processIndex:D2}.json");
        File.WriteAllText(path, BenchmarkJson.ExtractJson(json));
        return new BenchmarkArtifact(
            Path.GetFileName(path),
            BenchmarkHashes.Sha256File(path),
            new FileInfo(path).Length);
    }

    private static void WriteManifest(string directory, BenchmarkBatchManifest manifest)
    {
        var path = Path.Combine(directory, "manifest.json");
        File.WriteAllText(path, BenchmarkJson.SerializeCanonical(manifest));
        var reloaded = BenchmarkJson.DeserializeManifest(File.ReadAllText(path));
        BenchmarkManifestVerifier.Validate(reloaded, directory);
    }
}

public static class BenchmarkManifestVerifier
{
    public static void Validate(BenchmarkBatchManifest manifest, string? artifactDirectory = null) =>
        BenchmarkBatchValidator.ValidateManifest(manifest, artifactDirectory);
}
