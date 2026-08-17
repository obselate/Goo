using System.Globalization;
using System.Text.RegularExpressions;

namespace Goo.Benchmarking;

public static class BenchmarkS04Qualification
{
    private static readonly Regex HexHash = new("^[0-9a-fA-F]{64}$", RegexOptions.CultureInvariant);
    private static readonly Regex CommitHash = new("^[0-9a-fA-F]{40}$|^[0-9a-fA-F]{64}$", RegexOptions.CultureInvariant);

    public static void Validate(BenchmarkBatchManifest manifest, string artifactRoot)
    {
        ArgumentNullException.ThrowIfNull(manifest);
        var errors = new List<string>();
        var root = ResolveArtifactRoot(artifactRoot, errors);

        try
        {
            BenchmarkBatchValidator.ValidateManifest(manifest, root);
        }
        catch (BenchmarkValidationException exception)
        {
            errors.AddRange(exception.Errors.Select(static error => $"batch: {error}"));
        }

        if (manifest.ValidationErrorCount != 0)
        {
            errors.Add("manifest validationErrorCount must be zero");
        }

        ValidateGates(manifest.Gates ?? [], manifest.Provenance?.Backend, errors);
        ValidateArtifactCollection(manifest.VisualArtifacts ?? [], root, "visual", errors);
        ValidateArtifactCollection(manifest.PackageArtifacts ?? [], root, "package", errors);
        ValidateArtifactCollection(manifest.SourceConfigurationArtifacts ?? [], root, "source/configuration", errors);
        ValidateProvenance(manifest, root, errors);
        ValidateProcessIds(manifest, root, errors);
        ValidateBaselineIdentity(manifest, errors);

        if (errors.Count != 0)
        {
            throw new BenchmarkValidationException(errors.Distinct(StringComparer.Ordinal).ToList());
        }
    }

    public static string ComputeBaselineKey(BenchmarkBatchManifest manifest)
    {
        ArgumentNullException.ThrowIfNull(manifest);
        var provenance = manifest.Provenance ?? new BenchmarkProvenance();
        var display = provenance.Display ?? new BenchmarkDisplayConfiguration();
        var workloadMaterial = string.Join(
            "\n",
            (manifest.Workloads ?? [])
                .OrderBy(static workload => workload.WorkloadId, StringComparer.Ordinal)
                .Select(static workload => string.Join(
                    "\n",
                    workload.WorkloadId,
                    workload.Revision,
                    string.Join(
                        "|",
                        (workload.Metrics ?? [])
                            .OrderBy(static metric => metric.MetricId, StringComparer.Ordinal)
                            .Select(static metric => string.Join(
                                ":",
                                metric.MetricId,
                                metric.Unit))))));
        var material = string.Join(
            "\n",
            manifest.ProtocolVersion,
            provenance.Os,
            provenance.Rid,
            provenance.Cpu,
            provenance.Gpu,
            provenance.Driver,
            provenance.DriverState,
            provenance.PowerMode,
            display.LogicalWidth?.ToString(CultureInfo.InvariantCulture),
            display.LogicalHeight?.ToString(CultureInfo.InvariantCulture),
            display.FramebufferWidth?.ToString(CultureInfo.InvariantCulture),
            display.FramebufferHeight?.ToString(CultureInfo.InvariantCulture),
            display.ContentScaleX?.ToString("R", CultureInfo.InvariantCulture),
            display.ContentScaleY?.ToString("R", CultureInfo.InvariantCulture),
            display.RefreshHz?.ToString("R", CultureInfo.InvariantCulture),
            display.PixelFormat,
            display.ColorSpace,
            workloadMaterial);
        return $"goo-gsharp.s04.{BenchmarkHashes.Sha256(material)[..32]}";
    }

    public static string ComputeBaselineId(BenchmarkBatchManifest manifest)
    {
        ArgumentNullException.ThrowIfNull(manifest);
        var key = ComputeBaselineKey(manifest);
        var material = string.Join(
            "\n",
            key,
            manifest.Provenance.Backend,
            manifest.Provenance.GraphicsImplementation,
            manifest.Provenance.SourceCommit,
            manifest.Provenance.BenchmarkBinarySha256,
            manifest.Provenance.NativeAotBinarySha256,
            manifest.WorkloadManifestSha256);
        return $"goo-gsharp.s04.{BenchmarkHashes.Sha256(material)[..32]}";
    }

    private static string? ResolveArtifactRoot(string? artifactRoot, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(artifactRoot))
        {
            errors.Add("artifact root is missing");
            return null;
        }
        try
        {
            var root = Path.GetFullPath(artifactRoot);
            if (!Directory.Exists(root))
            {
                errors.Add("artifact root does not exist");
                return null;
            }
            var info = new DirectoryInfo(root);
            if (info.LinkTarget is not null || (info.Attributes & FileAttributes.ReparsePoint) != 0)
            {
                errors.Add("artifact root cannot be a symlink or reparse point");
                return null;
            }
            return root;
        }
        catch (Exception exception)
        {
            errors.Add($"artifact root is invalid: {exception.Message}");
            return null;
        }
    }

    private static void ValidateGates(
        IReadOnlyList<BenchmarkGateResult> gates,
        string? backend,
        List<string> errors)
    {
        var required = BenchmarkProtocol.RequiredQ10GateIds;
        if (gates.Count != required.Count)
        {
            errors.Add($"manifest must contain exactly {required.Count} Q10 gate results");
        }
        var ids = new HashSet<string>(StringComparer.Ordinal);
        foreach (var gate in gates)
        {
            if (gate is null)
            {
                errors.Add("manifest contains a missing gate result");
                continue;
            }
            if (!RequireText(gate.GateId, "gate id", errors))
            {
                continue;
            }
            if (!ids.Add(gate.GateId))
            {
                errors.Add($"manifest contains duplicate gate {gate.GateId}");
            }
            var isBaseline = string.Equals(gate.Status, "baseline", StringComparison.Ordinal);
            var isPassed = string.Equals(gate.Status, "passed", StringComparison.Ordinal);
            RequireText(gate.EvidenceSource, $"gate {gate.GateId} evidence source", errors);
            if (!isPassed && !(isBaseline && string.Equals(backend, "Skia", StringComparison.Ordinal)))
            {
                errors.Add($"gate {gate.GateId} has invalid status {gate.Status}");
            }
            if (isBaseline && !string.Equals(backend, "Skia", StringComparison.Ordinal))
            {
                errors.Add($"gate {gate.GateId} baseline status requires Skia evidence");
            }
            if (string.Equals(backend, "Skia", StringComparison.Ordinal) && !isBaseline)
            {
                errors.Add($"gate {gate.GateId} requires baseline status for Skia");
            }
            if (string.Equals(backend, "Vulkan", StringComparison.Ordinal) && !isPassed)
            {
                errors.Add($"gate {gate.GateId} requires passed status for Vulkan");
            }
        }
        foreach (var requiredId in required)
        {
            if (!ids.Contains(requiredId))
            {
                errors.Add($"manifest is missing Q10 gate {requiredId}");
            }
        }
    }

    private static void ValidateArtifactCollection(
        IReadOnlyList<BenchmarkArtifact> artifacts,
        string? artifactRoot,
        string scope,
        List<string> errors)
    {
        if (artifacts.Count == 0)
        {
            errors.Add($"{scope} artifacts are missing");
            return;
        }
        if (artifactRoot is null)
        {
            errors.Add($"{scope} artifacts cannot be verified without an artifact root");
            return;
        }
        var paths = new HashSet<string>(StringComparer.Ordinal);
        foreach (var artifact in artifacts)
        {
            if (artifact is null)
            {
                errors.Add($"{scope} artifact is missing");
                continue;
            }
            if (!paths.Add(artifact.Path))
            {
                errors.Add($"{scope} artifact path is duplicated: {artifact.Path}");
            }
            ValidateArtifact(artifact, artifactRoot, scope, errors);
        }
    }

    private static void ValidateArtifact(
        BenchmarkArtifact artifact,
        string? artifactRoot,
        string scope,
        List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(artifact.Path))
        {
            errors.Add($"{scope} artifact path is missing");
            return;
        }
        if (Path.IsPathFullyQualified(artifact.Path) || Path.IsPathRooted(artifact.Path))
        {
            errors.Add($"{scope} artifact path must be relative: {artifact.Path}");
            return;
        }
        if (!IsSha256(artifact.Sha256))
        {
            errors.Add($"{scope} artifact hash is invalid: {artifact.Path}");
        }
        if (artifact.Bytes is null || artifact.Bytes < 0)
        {
            errors.Add($"{scope} artifact byte length is missing: {artifact.Path}");
        }
        if (artifactRoot is null)
        {
            errors.Add($"{scope} artifact cannot be verified without an artifact root: {artifact.Path}");
            return;
        }
        try
        {
            var root = Path.GetFullPath(artifactRoot);
            var path = Path.GetFullPath(Path.Combine(root, artifact.Path));
            if (!IsWithin(root, path))
            {
                errors.Add($"{scope} artifact path escapes artifact root: {artifact.Path}");
                return;
            }
            if (HasSymlinkComponent(root, path))
            {
                errors.Add($"{scope} artifact path contains a symlink: {artifact.Path}");
                return;
            }
            if (!File.Exists(path))
            {
                errors.Add($"{scope} artifact is missing: {artifact.Path}");
                return;
            }
            var info = new FileInfo(path);
            if (artifact.Bytes is not null && info.Length != artifact.Bytes)
            {
                errors.Add($"{scope} artifact byte length mismatch: {artifact.Path}");
            }
            if (IsSha256(artifact.Sha256)
                && !string.Equals(BenchmarkHashes.Sha256File(path), artifact.Sha256, StringComparison.OrdinalIgnoreCase))
            {
                errors.Add($"{scope} artifact hash mismatch: {artifact.Path}");
            }
        }
        catch (Exception exception)
        {
            errors.Add($"{scope} artifact validation failed for {artifact.Path}: {exception.Message}");
        }
    }

    private static void ValidateProvenance(
        BenchmarkBatchManifest manifest,
        string? artifactRoot,
        List<string> errors)
    {
        var provenance = manifest.Provenance;
        if (provenance is null)
        {
            errors.Add("provenance is missing");
            return;
        }
        if (!RequireText(provenance.SourceCommit, "source commit", errors)
            || !CommitHash.IsMatch(provenance.SourceCommit!))
        {
            errors.Add("source commit is not a full Git object id");
        }
        if (provenance.SourceDirty != false)
        {
            errors.Add("source tree must be explicitly clean");
        }
        RequireHash(provenance.WorkloadManifestSha256, "workload manifest hash", errors);
        RequireHash(provenance.BenchmarkBinarySha256, "benchmark binary hash", errors);
        RequireHash(provenance.NativeAotBinarySha256, "NativeAOT binary hash", errors);
        if (!string.Equals(provenance.GSharpSdkPackage, BenchmarkProtocol.RequiredGSharpSdkPackage, StringComparison.Ordinal))
        {
            errors.Add($"G# SDK package must be {BenchmarkProtocol.RequiredGSharpSdkPackage}");
        }
        if (!string.Equals(provenance.GSharpSdkDigest, BenchmarkProtocol.RequiredGSharpSdkDigest, StringComparison.OrdinalIgnoreCase))
        {
            errors.Add("G# SDK digest is not the required 0.4.1 package digest");
        }
        RequireText(provenance.DotnetRuntime, ".NET runtime", errors);
        RequireText(provenance.Os, "OS", errors);
        RequireText(provenance.Kernel, "kernel", errors);
        RequireText(provenance.Rid, "runtime identifier", errors);
        RequireText(provenance.Cpu, "CPU", errors);
        RequireText(provenance.Gpu, "GPU", errors);
        RequireText(provenance.GraphicsDeviceEvidenceSource, "graphics device evidence source", errors);
        RequireText(provenance.Driver, "graphics driver", errors);
        RequireText(provenance.DriverEvidenceSource, "graphics driver evidence source", errors);
        RequireText(provenance.DriverState, "graphics driver state", errors);
        RequireText(provenance.Backend, "graphics backend", errors);
        RequireText(provenance.GraphicsImplementation, "graphics implementation", errors);
        RequireText(provenance.GraphicsImplementationEvidenceSource, "graphics implementation evidence source", errors);
        RequireText(provenance.PowerMode, "power mode", errors);
        RequireText(provenance.PowerEvidenceSource, "power evidence source", errors);
        RequireText(provenance.ExactCommand, "exact command", errors);
        if (!string.Equals(provenance.BuildConfiguration, "Release", StringComparison.Ordinal))
        {
            errors.Add("build configuration must be Release");
        }
        var aot = provenance.NativeAotSettings;
        if (aot is null)
        {
            errors.Add("NativeAOT settings are missing");
        }
        else
        {
            if (aot.Enabled != true)
            {
                errors.Add("NativeAOT must be enabled");
            }
            if (!string.Equals(aot.Configuration, "Release", StringComparison.Ordinal))
            {
                errors.Add("NativeAOT configuration must be Release");
            }
            RequireText(aot.RuntimeIdentifier, "NativeAOT runtime identifier", errors);
            if (!string.Equals(aot.RuntimeIdentifier, provenance.Rid, StringComparison.Ordinal))
            {
                errors.Add("NativeAOT runtime identifier does not match provenance RID");
            }
            if (aot.PublishTrimmed != true)
            {
                errors.Add("NativeAOT PublishTrimmed must be true");
            }
            if (aot.StripSymbols != true)
            {
                errors.Add("NativeAOT StripSymbols must be true");
            }
            if (aot.SelfContained != true)
            {
                errors.Add("NativeAOT SelfContained must be true");
            }
            if (aot.InvariantGlobalization is null)
            {
                errors.Add("NativeAOT InvariantGlobalization must be explicit");
            }
            if (!string.Equals(aot.IlcOptimizationPreference, "Speed", StringComparison.Ordinal))
            {
                errors.Add("NativeAOT optimization preference must be Speed");
            }
        }

        ValidateDisplay(provenance, errors);
        RequireText(provenance.ObservedPresentSetting, "observed present setting", errors);
        RequireText(provenance.PresentEvidenceSource, "present evidence source", errors);
        var isVulkan = string.Equals(provenance.Backend, "Vulkan", StringComparison.OrdinalIgnoreCase);
        var isOpenGl = !isVulkan
            && (string.Equals(provenance.Backend, "OpenGL", StringComparison.OrdinalIgnoreCase)
                || string.Equals(provenance.Backend, "Skia", StringComparison.OrdinalIgnoreCase)
                || (provenance.GraphicsImplementation?.Contains("OpenGL", StringComparison.OrdinalIgnoreCase) ?? false));
        if (!isVulkan && !isOpenGl)
        {
            errors.Add("graphics backend must identify OpenGL or Vulkan");
        }
        if (isVulkan)
        {
            RequireText(provenance.PresentMode, "Vulkan present mode", errors);
        }
        if (string.Equals(provenance.ObservedPresentSetting, "immediate/no-vsync", StringComparison.OrdinalIgnoreCase)
            || string.Equals(provenance.PresentMode, "immediate/no-vsync", StringComparison.OrdinalIgnoreCase))
        {
            errors.Add("present evidence cannot use the unverified immediate/no-vsync literal");
        }
        RequireText(provenance.FontFallback, "font fallback", errors);
        RequireText(provenance.FontRasterOptions, "font raster options", errors);
        RequireText(provenance.FontEvidenceSource, "font evidence source", errors);
        var fontFiles = provenance.FontFiles;
        if (fontFiles is null || fontFiles.Count == 0)
        {
            errors.Add("font files are missing");
        }
        else
        {
            foreach (var font in fontFiles)
            {
                if (font is null || !RequireText(font.Name, "font file name", errors))
                {
                    continue;
                }
                RequireHash(font.Sha256, $"font file hash {font.Name}", errors);
            }
        }

        RequireText(provenance.SdlVideoDriver, "SDL video driver", errors);
        if (string.Equals(provenance.SdlVideoDriver, "wayland", StringComparison.OrdinalIgnoreCase))
        {
            RequireText(provenance.WaylandSessionId, "Wayland session identity", errors);
            RequireText(provenance.WaylandSessionEvidenceSource, "Wayland session evidence source", errors);
            RequireText(provenance.WaylandSocket, "Wayland socket", errors);
            RequireText(provenance.WaylandSocketEvidenceSource, "Wayland socket evidence source", errors);
            RequireText(provenance.WaylandRuntimeDirectory, "Wayland runtime directory", errors);
            RequireText(provenance.WaylandRuntimeEvidenceSource, "Wayland runtime evidence source", errors);
            RequireText(provenance.WaylandCompositor, "Wayland compositor", errors);
            RequireText(provenance.WaylandCompositorEvidenceSource, "Wayland compositor evidence source", errors);
        }

        var sidecar = provenance.BuildSidecarArtifact;
        if (sidecar is null)
        {
            errors.Add("build sidecar artifact is missing");
        }
        else
        {
            ValidateArtifact(sidecar, artifactRoot, "build sidecar", errors);
            if (!(manifest.SourceConfigurationArtifacts ?? []).Any(artifact =>
                    artifact is not null && string.Equals(artifact.Path, sidecar.Path, StringComparison.Ordinal)
                    && string.Equals(artifact.Sha256, sidecar.Sha256, StringComparison.OrdinalIgnoreCase)))
            {
                errors.Add("build sidecar artifact is not listed as a source/configuration artifact");
            }
        }
        ValidateBuildSidecar(provenance, manifest, artifactRoot, errors);

        var packageArtifacts = manifest.PackageArtifacts ?? [];
        if (!packageArtifacts.Any(artifact => artifact is not null
                && string.Equals(artifact.Sha256, provenance.GSharpSdkDigest, StringComparison.OrdinalIgnoreCase)))
        {
            errors.Add("package artifacts do not contain the required G# SDK package hash");
        }
        var sourceArtifacts = manifest.SourceConfigurationArtifacts ?? [];
        if (!sourceArtifacts.Any(artifact => artifact is not null
                && string.Equals(artifact.Sha256, provenance.WorkloadManifestSha256, StringComparison.OrdinalIgnoreCase)))
        {
            errors.Add("source/configuration artifacts do not contain the workload manifest hash");
        }
        var fontArtifacts = sourceArtifacts.Concat(packageArtifacts).ToList();
        foreach (var font in provenance.FontFiles ?? [])
        {
            if (!fontArtifacts.Any(artifact => artifact is not null
                    && string.Equals(artifact.Sha256, font.Sha256, StringComparison.OrdinalIgnoreCase)))
            {
                errors.Add($"retained artifacts do not contain font file hash {font.Sha256}");
            }
        }
        var allArtifacts = (manifest.VisualArtifacts ?? [])
            .Concat(manifest.PackageArtifacts ?? [])
            .Concat(manifest.SourceConfigurationArtifacts ?? [])
            .Where(static artifact => artifact is not null)
            .ToList();
        if (!allArtifacts.Any(artifact =>
                string.Equals(artifact.Sha256, provenance.BenchmarkBinarySha256, StringComparison.OrdinalIgnoreCase)))
        {
            errors.Add("retained artifacts do not contain the benchmark binary hash");
        }
        if (!allArtifacts.Any(artifact =>
                string.Equals(artifact.Sha256, provenance.NativeAotBinarySha256, StringComparison.OrdinalIgnoreCase)))
        {
            errors.Add("retained artifacts do not contain the NativeAOT binary hash");
        }
    }

    private static void ValidateDisplay(BenchmarkProvenance provenance, List<string> errors)
    {
        var display = provenance.Display;
        if (display is null)
        {
            errors.Add("display configuration is missing");
            return;
        }
        RequirePositive(display.LogicalWidth, "logical display width", errors);
        RequirePositive(display.LogicalHeight, "logical display height", errors);
        RequirePositive(display.FramebufferWidth, "framebuffer width", errors);
        RequirePositive(display.FramebufferHeight, "framebuffer height", errors);
        RequirePositive(display.ContentScaleX, "content scale X", errors);
        RequirePositive(display.ContentScaleY, "content scale Y", errors);
        RequirePositive(display.DpiX, "DPI X", errors);
        RequirePositive(display.DpiY, "DPI Y", errors);
        RequirePositive(display.RefreshHz, "display refresh rate", errors);
        RequireText(display.PixelFormat, "display pixel format", errors);
        RequireText(display.ColorSpace, "display color space", errors);
        RequireText(display.EvidenceSource, "display evidence source", errors);
    }

    private static void ValidateBuildSidecar(
        BenchmarkProvenance provenance,
        BenchmarkBatchManifest manifest,
        string? artifactRoot,
        List<string> errors)
    {
        var sidecarArtifact = provenance.BuildSidecarArtifact;
        if (sidecarArtifact is null)
        {
            errors.Add("build sidecar artifact is missing");
            return;
        }
        if (artifactRoot is null)
        {
            errors.Add("build sidecar model cannot be parsed without an artifact root");
            return;
        }
        BenchmarkBuildSidecar sidecar;
        try
        {
            var sidecarPath = Path.GetFullPath(Path.Combine(artifactRoot, sidecarArtifact.Path));
            if (!IsWithin(artifactRoot, sidecarPath) || HasSymlinkComponent(artifactRoot, sidecarPath))
            {
                errors.Add("build sidecar artifact path is not safe");
                return;
            }
            sidecar = BenchmarkJson.DeserializeBuildSidecar(File.ReadAllText(sidecarPath));
        }
        catch (Exception exception)
        {
            errors.Add($"build sidecar artifact could not be parsed: {exception.Message}");
            return;
        }
        if (!string.Equals(sidecar.Configuration, "Release", StringComparison.Ordinal))
        {
            errors.Add("build sidecar configuration must be Release");
        }
        if (!string.Equals(sidecar.TargetFramework, "net10.0", StringComparison.Ordinal))
        {
            errors.Add("build sidecar target framework must be net10.0");
        }
        RequireText(sidecar.RuntimeIdentifier, "build sidecar runtime identifier", errors);
        if (!string.Equals(sidecar.RuntimeIdentifier, provenance.Rid, StringComparison.Ordinal))
        {
            errors.Add("build sidecar runtime identifier does not match provenance RID");
        }
        RequireText(sidecar.SdkIdentity, "build sidecar SDK identity", errors);
        RequireText(sidecar.CompilerIdentity, "build sidecar compiler identity", errors);
        RequireText(sidecar.RuntimePackIdentity, "build sidecar runtime-pack identity", errors);
        var aot = provenance.NativeAotSettings;
        if (aot is null)
        {
            errors.Add("build sidecar cannot cross-check missing NativeAOT settings");
            return;
        }
        if (!string.Equals(sidecar.Configuration, provenance.BuildConfiguration, StringComparison.Ordinal)
            || !string.Equals(sidecar.Configuration, aot.Configuration, StringComparison.Ordinal))
        {
            errors.Add("build sidecar configuration does not match shared Release settings");
        }
        if (sidecar.NativeAot != true || aot.Enabled != true)
        {
            errors.Add("build sidecar must identify NativeAOT output");
        }
        if (sidecar.PublishTrimmed != aot.PublishTrimmed)
        {
            errors.Add("build sidecar PublishTrimmed does not match NativeAOT settings");
        }
        if (sidecar.StripSymbols != aot.StripSymbols)
        {
            errors.Add("build sidecar StripSymbols does not match NativeAOT settings");
        }
        if (sidecar.SelfContained != aot.SelfContained)
        {
            errors.Add("build sidecar SelfContained does not match NativeAOT settings");
        }
        if (sidecar.InvariantGlobalization != aot.InvariantGlobalization)
        {
            errors.Add("build sidecar InvariantGlobalization does not match NativeAOT settings");
        }
        if (!string.Equals(sidecar.IlcOptimizationPreference, aot.IlcOptimizationPreference, StringComparison.Ordinal))
        {
            errors.Add("build sidecar optimization preference does not match NativeAOT settings");
        }
        if (!RequireText(sidecar.GSharpSdkPackage, "build sidecar G# SDK package", errors)
            || !string.Equals(sidecar.GSharpSdkPackage, provenance.GSharpSdkPackage, StringComparison.Ordinal))
        {
            errors.Add("build sidecar G# SDK package does not match provenance");
        }
        if (!string.Equals(sidecar.GSharpSdkDigest, provenance.GSharpSdkDigest, StringComparison.OrdinalIgnoreCase))
        {
            errors.Add("build sidecar G# SDK digest does not match provenance");
        }
        if (!RequireText(sidecar.OutputPath, "build sidecar output path", errors)
            || Path.IsPathFullyQualified(sidecar.OutputPath!)
            || Path.IsPathRooted(sidecar.OutputPath!))
        {
            errors.Add("build sidecar output path must be relative");
        }
        if (sidecar.OutputBytes is null || sidecar.OutputBytes < 0)
        {
            errors.Add("build sidecar output bytes are missing or invalid");
        }
        RequireHash(sidecar.OutputSha256, "build sidecar output hash", errors);
        if (!string.Equals(sidecar.OutputSha256, provenance.NativeAotBinarySha256, StringComparison.OrdinalIgnoreCase))
        {
            errors.Add("build sidecar output hash does not match NativeAOT binary hash");
        }

        var artifacts = (manifest.VisualArtifacts ?? [])
            .Concat(manifest.PackageArtifacts ?? [])
            .Concat(manifest.SourceConfigurationArtifacts ?? [])
            .Where(static artifact => artifact is not null)
            .ToList();
        var outputArtifact = artifacts.FirstOrDefault(artifact =>
            string.Equals(artifact.Path, sidecar.OutputPath, StringComparison.Ordinal)
            && string.Equals(artifact.Sha256, sidecar.OutputSha256, StringComparison.OrdinalIgnoreCase)
            && artifact.Bytes == sidecar.OutputBytes);
        if (outputArtifact is null)
        {
            errors.Add("build sidecar output is not represented by a matching artifact");
        }
        else
        {
            ValidateArtifact(outputArtifact, artifactRoot, "build output", errors);
        }

    }

    private static void ValidateProcessIds(BenchmarkBatchManifest manifest, string? artifactRoot, List<string> errors)
    {
        var summaries = manifest.Runs ?? [];
        var summaryIds = summaries
            .Where(static summary => summary is not null)
            .Select(static summary => summary.ProcessId)
            .ToList();
        ValidateProcessIdSet(summaryIds, "manifest run summaries", errors);
        if (artifactRoot is null)
        {
            errors.Add("raw child process ids cannot be verified without an artifact root");
            return;
        }
        var root = Path.GetFullPath(artifactRoot);
        var rawIds = new List<int?>();
        foreach (var index in Enumerable.Range(0, BenchmarkProtocol.RequiredProcesses))
        {
            var path = Path.Combine(root, $"run-{index:D2}.json");
            if (!File.Exists(path))
            {
                continue;
            }
            try
            {
                var run = BenchmarkJson.DeserializeChildRun(File.ReadAllText(path));
                rawIds.Add(run.ProcessId);
                var summary = summaries.FirstOrDefault(item => item is not null && item.ProcessIndex == index);
                if (summary is not null && summary.ProcessId != run.ProcessId)
                {
                    errors.Add($"run-{index:D2}.json process id does not match its summary");
                }
            }
            catch (Exception exception)
            {
                errors.Add($"run-{index:D2}.json process id could not be read: {exception.Message}");
            }
        }
        ValidateProcessIdSet(rawIds, "raw child runs", errors);
    }

    private static void ValidateProcessIdSet(IReadOnlyList<int?> ids, string scope, List<string> errors)
    {
        if (ids.Count != BenchmarkProtocol.RequiredProcesses)
        {
            errors.Add($"{scope} must contain exactly {BenchmarkProtocol.RequiredProcesses} process ids");
            return;
        }
        if (ids.Any(static id => id is null or <= 0))
        {
            errors.Add($"{scope} must contain only positive process ids");
        }
        if (ids.Where(static id => id is not null).Distinct().Count() != BenchmarkProtocol.RequiredProcesses)
        {
            errors.Add($"{scope} must contain five distinct process ids");
        }
    }

    private static void ValidateBaselineIdentity(BenchmarkBatchManifest manifest, List<string> errors)
    {
        try
        {
            var expectedKey = ComputeBaselineKey(manifest);
            var expectedId = ComputeBaselineId(manifest);
            if (!string.Equals(manifest.BaselineKey, expectedKey, StringComparison.Ordinal))
            {
                errors.Add("manifest baseline key does not recompute from canonical provenance");
            }
            if (!string.Equals(manifest.BaselineId, expectedId, StringComparison.Ordinal))
            {
                errors.Add("manifest baseline id does not recompute from canonical provenance");
            }
        }
        catch (Exception exception)
        {
            errors.Add($"baseline identity could not be recomputed: {exception.Message}");
        }
    }

    private static bool RequireText(string? value, string name, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(value)
            || string.Equals(value.Trim(), "unknown", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value.Trim(), "unavailable", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value.Trim(), "n/a", StringComparison.OrdinalIgnoreCase))
        {
            errors.Add($"{name} is missing, unknown, or unavailable");
            return false;
        }
        return true;
    }

    private static void RequireHash(string? value, string name, List<string> errors)
    {
        if (string.IsNullOrWhiteSpace(value) || !HexHash.IsMatch(value))
        {
            errors.Add($"{name} is missing or is not a SHA-256 hash");
        }
    }

    private static bool IsSha256(string value) => !string.IsNullOrWhiteSpace(value) && HexHash.IsMatch(value);

    private static void RequirePositive(int? value, string name, List<string> errors)
    {
        if (value is null || value <= 0)
        {
            errors.Add($"{name} must be positive and available");
        }
    }

    private static void RequirePositive(double? value, string name, List<string> errors)
    {
        if (value is null || !double.IsFinite(value.Value) || value <= 0)
        {
            errors.Add($"{name} must be positive and available");
        }
    }

    private static bool IsWithin(string root, string path)
    {
        var normalizedRoot = Path.TrimEndingDirectorySeparator(root) + Path.DirectorySeparatorChar;
        var comparison = OperatingSystem.IsWindows()
            ? StringComparison.OrdinalIgnoreCase
            : StringComparison.Ordinal;
        return path.StartsWith(normalizedRoot, comparison)
            || string.Equals(path, Path.TrimEndingDirectorySeparator(root), comparison);
    }

    private static bool HasSymlinkComponent(string root, string path)
    {
        var normalizedRoot = Path.GetFullPath(root);
        var relative = Path.GetRelativePath(normalizedRoot, path);
        var components = relative.Split([Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar],
            StringSplitOptions.RemoveEmptyEntries);
        var current = normalizedRoot;
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
}
