using System.Diagnostics;
using System.Runtime.CompilerServices;
using System.Runtime.InteropServices;
using System.Text;
using Goo;
using Goo.Benchmarking;

if (Q10TextEditingBenchmark.TryRun(args))
{
    return;
}

Console.Error.WriteLine("usage: --workload q10.text-editing --json or --batch <output-directory>");
Environment.ExitCode = 2;

internal static class Q10TextEditingBenchmark
{
    private const string WorkloadId = "q10.text-editing";
    private const string WorkloadRevision = "2";
    private const string Suite = "q10.text-editing";
    private const string DefaultBaselinePrefix = "goo-gsharp-q10-text-editing-r2";
    private const uint Seed = 3266489917u;
    private const int TotalUtf8Bytes = 1_048_576;
    private const int FullLineBytes = 96;
    private const int FullLineTextBytes = 95;
    private const int FinalLineTextBytes = 64;
    private const int VisibleLines = 32;
    private const int WindowWidth = 1280;
    private const int WindowHeight = 720;
    private const int LineHeightPixels = 20;
    private const double FixedDeltaSeconds = 1.0 / 60.0;
    private const string Alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ";
    private const string InsertText = "x";
    private const string AssemblyFileName = "Goo.Q10TextBenchmark.dll";
    private const int ChildTimeoutMilliseconds = 300_000;

    internal static bool TryRun(string[] args)
    {
        if (Array.IndexOf(args, "--workload") < 0)
        {
            return false;
        }

        try
        {
            ParseAndRun(args);
        }
        catch (Exception exception)
        {
            Console.Error.WriteLine($"q10 text-editing failed: {exception.Message}");
            Environment.ExitCode = 1;
        }

        return true;
    }

    private static void ParseAndRun(string[] args)
    {
        var workloadIndex = Array.IndexOf(args, "--workload");
        if (workloadIndex < 0 || workloadIndex + 1 >= args.Length
            || !string.Equals(args[workloadIndex + 1], WorkloadId, StringComparison.Ordinal))
        {
            throw new ArgumentException("usage: --workload q10.text-editing --json or --batch <output-directory>");
        }

        var batchIndex = Array.IndexOf(args, "--batch");
        var jsonIndex = Array.IndexOf(args, "--json");
        if (batchIndex >= 0)
        {
            if (jsonIndex >= 0 || batchIndex + 1 >= args.Length || batchIndex + 2 != args.Length)
            {
                throw new ArgumentException("usage: --workload q10.text-editing --batch <output-directory>");
            }
            RunBatch(args[batchIndex + 1]);
            return;
        }

        if (jsonIndex < 0 || args.Length != 3)
        {
            throw new ArgumentException("usage: --workload q10.text-editing --json");
        }

        RunChild();
    }

    private static void RunChild()
    {
        var source = GenerateDocument();
        ValidateGeneratedDocument(source);
        using var fixture = new Q10WindowFixture(source);
        fixture.Open();
        var provenance = CreateProvenance(fixture.Metrics);
        var baselineId = BaselineId(provenance);
        var baselineKey = BaselineKey(provenance);
        fixture.RunWarmups();
        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
        var samples = fixture.RunMeasured();
        var run = new BenchmarkChildRun(
            Suite,
            baselineId,
            baselineKey,
            ProcessIndex(),
            [new BenchmarkWorkloadRun(
                WorkloadId,
                WorkloadRevision,
                [
                    new BenchmarkMetricSamples("total-us", "microseconds", samples.TotalMicroseconds),
                    new BenchmarkMetricSamples("managed-allocation-bytes", "bytes", samples.ManagedAllocationBytes),
                ])],
            provenance,
            null,
            "passed",
            0)
        {
            ProcessId = Environment.ProcessId,
        };
        Console.WriteLine(BenchmarkJson.SerializeCanonical(run));
    }

    private static void RunBatch(string outputDirectory)
    {
        if (RuntimeFeature.IsDynamicCodeSupported)
        {
            throw new InvalidOperationException(
                "q10 batch manifests require a published NativeAOT executable");
        }
        var baselineId = CreateBatchBaselineId();
        var baselineKey = BaselineKey();
        var exactCommand = ExactChildCommand();
        var options = new BenchmarkBatchValidationOptions
        {
            Suite = Suite,
            Schema = BenchmarkProtocol.ChildRunSchema,
            BaselineId = baselineId,
            BaselineKey = baselineKey,
            WorkloadRevisions = new Dictionary<string, string>(StringComparer.Ordinal)
            {
                [WorkloadId] = WorkloadRevision,
            },
        };
        var runner = new BenchmarkBatchRunner();
        var result = runner.RunSequentialProcesses(
            processIndex => LaunchChild(processIndex, baselineId, baselineKey, exactCommand),
            options,
            outputDirectory);
        Console.WriteLine(Path.Combine(Path.GetFullPath(outputDirectory), "manifest.json"));
        GC.KeepAlive(result);
    }

    private static BenchmarkProcessOutput LaunchChild(
        int processIndex,
        string baselineId,
        string baselineKey,
        string exactCommand)
    {
        var host = Environment.ProcessPath
            ?? throw new InvalidOperationException("process host path is unavailable");
        var assembly = ResolveAssembly();
        var start = new ProcessStartInfo(host)
        {
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true,
            WorkingDirectory = Environment.CurrentDirectory,
        };
        if (IsDotnetHost(host))
        {
            start.ArgumentList.Add(assembly);
        }
        start.ArgumentList.Add("--workload");
        start.ArgumentList.Add(WorkloadId);
        start.ArgumentList.Add("--json");
        start.Environment["DOTNET_TieredCompilation"] = "0";
        start.Environment["DOTNET_TC_QuickJit"] = "0";
        start.Environment["SDL_VIDEO_WAYLAND_MODE_SCALING"] = "0";
        start.Environment["GOO_BENCHMARK_PROCESS_INDEX"] = processIndex.ToString();
        start.Environment["BASELINE_ID"] = baselineId;
        start.Environment["BASELINE_KEY"] = baselineKey;
        start.Environment["GOO_BENCHMARK_BASELINE_ID"] = baselineId;
        start.Environment["GOO_BENCHMARK_BASELINE_KEY"] = baselineKey;
        start.Environment["GOO_BENCHMARK_EXACT_COMMAND"] = exactCommand;
        start.Environment["GOO_BENCHMARK_CONFIGURATION"] = "Release";
        using var process = Process.Start(start)
            ?? throw new InvalidOperationException($"could not start child process {processIndex}");
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
            process.WaitForExit();
            throw new InvalidOperationException(
                $"child process {processIndex} exceeded {ChildTimeoutMilliseconds} ms");
        }
        var stdout = stdoutTask.GetAwaiter().GetResult();
        var stderr = stderrTask.GetAwaiter().GetResult();
        if (process.ExitCode != 0)
        {
            throw new InvalidOperationException(
                $"child process {processIndex} exited {process.ExitCode}: {stderr.Trim()}");
        }
        return new BenchmarkProcessOutput(process.ExitCode, stdout, stderr, process.Id);
    }

    private static string ExactChildCommand()
    {
        var host = Environment.ProcessPath
            ?? throw new InvalidOperationException("process host path is unavailable");
        var assembly = ResolveAssembly();
        return IsDotnetHost(host)
            ? $"{QuoteCommandArgument(host)} {QuoteCommandArgument(assembly)} --workload {WorkloadId} --json"
            : $"{QuoteCommandArgument(host)} --workload {WorkloadId} --json";
    }

    private static string QuoteCommandArgument(string value) =>
        $"\"{value.Replace("\"", "\\\"", StringComparison.Ordinal)}\"";

    private static string ResolveAssembly()
    {
        var processPath = Environment.ProcessPath;
        if (!string.IsNullOrWhiteSpace(processPath)
            && !IsDotnetHost(processPath)
            && File.Exists(processPath))
        {
            return Path.GetFullPath(processPath);
        }
        var assembly = Path.Combine(AppContext.BaseDirectory, AssemblyFileName);
        if (!File.Exists(assembly))
        {
            throw new FileNotFoundException("built q10 text benchmark assembly was not found", assembly);
        }
        return Path.GetFullPath(assembly);
    }

    private static bool IsDotnetHost(string path) =>
        string.Equals(Path.GetFileNameWithoutExtension(path), "dotnet", StringComparison.OrdinalIgnoreCase);

    private static string CreateBatchBaselineId() => BaselineId();

    private static string BaselineId(BenchmarkProvenance? provenance = null) =>
        Environment.GetEnvironmentVariable("BASELINE_ID")?.Trim() is { Length: > 0 } value
            ? value
            : $"{DefaultBaselinePrefix}-{BenchmarkHashes.Sha256(
                BaselineFacts(provenance) + "\n"
                + (provenance?.SourceCommit ?? RunCommand("git", ["rev-parse", "HEAD"]) ?? "unknown") + "\n"
                + (provenance?.BenchmarkBinarySha256 ?? BenchmarkBinaryDigest() ?? "unknown") + "\n"
                + (provenance?.WorkloadManifestSha256 ?? WorkloadManifestDigest() ?? "unknown"))[..16]}";

    private static string BaselineKey(BenchmarkProvenance? provenance = null) =>
        Environment.GetEnvironmentVariable("BASELINE_KEY")?.Trim() is { Length: > 0 } value
            ? value
            : $"goo-gsharp.q10.text-editing.r2.{BenchmarkHashes.Sha256(BaselineFacts(provenance))[..16]}";

    private static string BaselineFacts(BenchmarkProvenance? provenance) => string.Join(
        "\n",
        [
            provenance?.Os ?? RuntimeInformation.OSDescription,
            provenance?.Rid ?? RuntimeInformation.RuntimeIdentifier,
            provenance?.Cpu ?? CpuModel() ?? "unknown",
            provenance?.Gpu ?? GpuModel() ?? "unknown",
            provenance?.Driver ?? GraphicsDriver() ?? "unknown",
            provenance?.Backend ?? "Skia",
            provenance?.GraphicsImplementation ?? "SkiaSharp 4.151.1 OpenGL via SDL3",
            WorkloadId,
            WorkloadRevision,
            "total-us:microseconds",
            "managed-allocation-bytes:bytes",
            BenchmarkProtocol.ProtocolVersion,
            BenchmarkProtocol.ChildRunSchema,
        ]);

    private static string? BenchmarkBinaryDigest()
    {
        var path = ResolveAssembly();
        return File.Exists(path) ? BenchmarkHashes.Sha256File(path) : null;
    }

    private static string? WorkloadManifestDigest()
    {
        var path = FindFile("docs/perf/q10-workloads-v1.json");
        return path is null ? null : BenchmarkHashes.Sha256File(path);
    }

    private static int ProcessIndex()
    {
        var value = Environment.GetEnvironmentVariable("GOO_BENCHMARK_PROCESS_INDEX");
        return string.IsNullOrWhiteSpace(value) ? 0 : int.Parse(value);
    }

    private static string GenerateDocument()
    {
        var fullLineCount = (TotalUtf8Bytes - FinalLineTextBytes) / FullLineBytes;
        var result = new char[TotalUtf8Bytes];
        var state = Seed;
        var offset = 0;
        for (var line = 0; line < fullLineCount; line++)
        {
            for (var character = 0; character < FullLineTextBytes; character++)
            {
                state = NextState(state);
                result[offset++] = Alphabet[(int)(state % (uint)Alphabet.Length)];
            }
            result[offset++] = '\n';
        }
        for (var character = 0; character < FinalLineTextBytes; character++)
        {
            state = NextState(state);
            result[offset++] = Alphabet[(int)(state % (uint)Alphabet.Length)];
        }
        if (offset != TotalUtf8Bytes)
        {
            throw new InvalidOperationException($"generated document has {offset} UTF-16 code units");
        }
        return new string(result);
    }

    private static uint NextState(uint state) =>
        unchecked(state * 1664525u + 1013904223u);

    private static void ValidateGeneratedDocument(string source)
    {
        if (Encoding.UTF8.GetByteCount(source) != TotalUtf8Bytes || source.Length != TotalUtf8Bytes)
        {
            throw new InvalidOperationException("generated document byte count is not 1048576");
        }
        var fullLineCount = (TotalUtf8Bytes - FinalLineTextBytes) / FullLineBytes;
        var offset = 0;
        for (var line = 0; line < fullLineCount; line++)
        {
            for (var character = 0; character < FullLineTextBytes; character++)
            {
                if (Alphabet.IndexOf(source[offset++]) < 0)
                {
                    throw new InvalidOperationException("generated document contains a character outside the alphabet");
                }
            }
            if (source[offset++] != '\n')
            {
                throw new InvalidOperationException("generated document full line is missing LF");
            }
        }
        for (var character = 0; character < FinalLineTextBytes; character++)
        {
            if (Alphabet.IndexOf(source[offset++]) < 0)
            {
                throw new InvalidOperationException("generated document final line contains a character outside the alphabet");
            }
        }
        if (offset != TotalUtf8Bytes || source[^1] == '\n')
        {
            throw new InvalidOperationException("generated document final line is invalid");
        }
    }

    private static BenchmarkProvenance CreateProvenance(WindowMetrics metrics)
    {
        var manifestPath = FindFile("docs/perf/q10-workloads-v1.json");
        var binaryPath = ResolveAssembly();
        var sourceCommit = RunCommand("git", ["rev-parse", "HEAD"]);
        var sourceStatus = RunCommand("git", ["status", "--porcelain", "--untracked-files=all"]);
        var fontFiles = ResolveFontFiles();
        var rid = RuntimeInformation.RuntimeIdentifier;
        var aotEnabled = !RuntimeFeature.IsDynamicCodeSupported;
        return new BenchmarkProvenance
        {
            SourceCommit = sourceCommit,
            SourceDirty = sourceCommit is null ? null : sourceStatus is { Length: > 0 },
            WorkloadManifestSha256 = manifestPath is null ? null : BenchmarkHashes.Sha256File(manifestPath),
            BenchmarkBinarySha256 = File.Exists(binaryPath) ? BenchmarkHashes.Sha256File(binaryPath) : null,
            NativeAotSettings = new BenchmarkNativeAotSettings
            {
                Enabled = aotEnabled,
                Configuration = Environment.GetEnvironmentVariable("GOO_BENCHMARK_CONFIGURATION") ?? "Release",
                RuntimeIdentifier = rid,
                PublishTrimmed = aotEnabled ? true : null,
                StripSymbols = aotEnabled ? true : null,
                InvariantGlobalization = null,
                IlcOptimizationPreference = aotEnabled ? "Speed" : null,
                AdditionalSettings = null,
            },
            NativeAotBinarySha256 = aotEnabled && File.Exists(binaryPath)
                ? BenchmarkHashes.Sha256File(binaryPath)
                : null,
            GSharpSdkPackage = "Gsharp.NET.Sdk/0.4.1",
            GSharpSdkDigest = GsharpSdkDigest(),
            DotnetRuntime = RuntimeInformation.FrameworkDescription,
            Os = RuntimeInformation.OSDescription,
            Kernel = RunCommand("uname", ["-r"]),
            Rid = rid,
            Cpu = CpuModel(),
            Gpu = GpuModel(),
            Driver = GraphicsDriver(),
            DriverState = null,
            Backend = "Skia",
            GraphicsImplementation = "SkiaSharp 4.151.1 OpenGL via SDL3",
            PowerMode = null,
            Display = new BenchmarkDisplayConfiguration
            {
                Width = metrics.LogicalWidth,
                Height = metrics.LogicalHeight,
                RefreshHz = null,
                Dpi = (metrics.DisplayScaleX + metrics.DisplayScaleY) / 2.0,
                PixelFormat = null,
                ColorSpace = null,
            },
            PresentMode = "immediate/no-vsync",
            WaylandCompositor = Environment.GetEnvironmentVariable("XDG_CURRENT_DESKTOP"),
            WaylandSession = Environment.GetEnvironmentVariable("XDG_SESSION_TYPE"),
            FontFiles = fontFiles,
            FontFallback = "Fontconfig fallback for Inter",
            FontRasterOptions = "SkiaSharp antialias with slight hinting",
            ExactCommand = Environment.GetEnvironmentVariable("GOO_BENCHMARK_EXACT_COMMAND")
                ?? Environment.CommandLine,
            BuildConfiguration = Environment.GetEnvironmentVariable("GOO_BENCHMARK_CONFIGURATION") ?? "Release",
            ProcessCount = BenchmarkProtocol.RequiredProcesses,
            WarmupCount = BenchmarkProtocol.WarmupCount,
            MeasuredCount = BenchmarkProtocol.MeasuredCount,
        };
    }

    private static List<BenchmarkFileHash>? ResolveFontFiles()
    {
        var path = RunCommand("fc-match", ["-f", "%{file}", "Inter"]);
        if (path is null || !File.Exists(path))
        {
            return null;
        }
        return [new BenchmarkFileHash(path, BenchmarkHashes.Sha256File(path))];
    }

    private static string? GsharpSdkDigest()
    {
        var profile = Environment.GetFolderPath(Environment.SpecialFolder.UserProfile);
        if (string.IsNullOrWhiteSpace(profile))
        {
            return null;
        }
        var path = Path.Combine(
            profile,
            ".nuget",
            "packages",
            "gsharp.net.sdk",
            "0.4.1",
            "gsharp.net.sdk.0.4.1.nupkg");
        return File.Exists(path) ? BenchmarkHashes.Sha256File(path) : null;
    }

    private static string? FindFile(string relativePath)
    {
        var current = new DirectoryInfo(Environment.CurrentDirectory);
        while (current is not null)
        {
            var path = Path.Combine(current.FullName, relativePath);
            if (File.Exists(path))
            {
                return path;
            }
            current = current.Parent;
        }
        return null;
    }

    private static string? RunCommand(string fileName, IReadOnlyList<string> arguments)
    {
        try
        {
            var start = new ProcessStartInfo(fileName)
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
                return null;
            }
            var output = process.StandardOutput.ReadToEnd().Trim();
            process.WaitForExit();
            return process.ExitCode == 0 && output.Length != 0 ? output : null;
        }
        catch
        {
            return null;
        }
    }

    private static string? CpuModel()
    {
        try
        {
            foreach (var line in File.ReadLines("/proc/cpuinfo"))
            {
                if (line.StartsWith("model name", StringComparison.Ordinal))
                {
                    var separator = line.IndexOf(':');
                    return separator >= 0 ? line[(separator + 1)..].Trim() : line.Trim();
                }
            }
        }
        catch
        {
        }
        return null;
    }

    private static string? GpuModel()
    {
        var output = RunCommand("lspci", ["-mm"]);
        if (output is null)
        {
            return null;
        }
        return output.Split('\n').FirstOrDefault(static line =>
            line.Contains("VGA compatible controller", StringComparison.OrdinalIgnoreCase)
            || line.Contains("3D controller", StringComparison.OrdinalIgnoreCase));
    }

    private static string? GraphicsDriver()
    {
        var output = RunCommand("lspci", ["-k"]);
        if (output is null)
        {
            return null;
        }
        var lines = output.Split('\n');
        for (var index = 0; index < lines.Length; index++)
        {
            if (!lines[index].Contains("VGA compatible controller", StringComparison.OrdinalIgnoreCase)
                && !lines[index].Contains("3D controller", StringComparison.OrdinalIgnoreCase))
            {
                continue;
            }
            for (var child = index + 1; child < lines.Length && lines[child].Length != 0; child++)
            {
                var line = lines[child].Trim();
                const string prefix = "Kernel driver in use:";
                if (line.StartsWith(prefix, StringComparison.Ordinal))
                {
                    return line[prefix.Length..].Trim();
                }
            }
        }
        return null;
    }

    private readonly record struct FrameSample(double TotalMicroseconds, long ManagedAllocationBytes);

    private readonly record struct MeasuredSamples(double[] TotalMicroseconds, long[] ManagedAllocationBytes);

    private sealed class Q10WindowFixture : IDisposable
    {
        private readonly string source;
        private readonly TextDocument document;
        private readonly TextEditorController controller;
        private readonly Window window;
        private WindowMetrics metrics;
        private bool metricsCaptured;
        private bool insertNext = true;
        private int operationCount;
        private bool disposed;

        internal Q10WindowFixture(string source)
        {
            this.source = source;
            document = new TextDocument(source);
            controller = new TextEditorController(document)
            {
                Selection = CollapsedSelection(0),
            };
            var editor = new TextEditor(document, controller)
            {
                Width = 1200,
                Height = VisibleLines * LineHeightPixels,
                AutoFocus = true,
                FontFamily = "Inter",
                FontSize = 20,
                LineHeight = 1.0,
                OverscanLines = 3,
            };
            window = new Window
            {
                Title = "Goo Q10 Text Editing",
                Width = WindowWidth,
                Height = WindowHeight,
                VSync = false,
                Resizable = false,
                Root = new Q10EditorRootCell(editor),
            };
            window.MetricsChanged += CaptureMetrics;
        }

        internal WindowMetrics Metrics =>
            metricsCaptured
                ? metrics
                : throw new InvalidOperationException("q10 window metrics were not captured");

        internal void Open()
        {
            window.Open();
            window.Pump(0.0);
            var actual = Metrics;
            if (actual.LogicalWidth != WindowWidth || actual.LogicalHeight != WindowHeight
                || actual.DisplayScaleX != 1.0 || actual.DisplayScaleY != 1.0)
            {
                throw new InvalidOperationException(
                    $"q10 window metrics were {actual.LogicalWidth}x{actual.LogicalHeight} "
                    + $"at scale {actual.DisplayScaleX}x{actual.DisplayScaleY}");
            }
            if (!window.IsOpen || !controller.IsFocused)
            {
                throw new InvalidOperationException("q10 editor did not open and focus");
            }
            VerifyInitialState();
        }

        internal void RunWarmups()
        {
            for (var sample = 0; sample < BenchmarkProtocol.WarmupCount; sample++)
            {
                RunFrame(insertNext, false);
            }
            if (!insertNext || operationCount != BenchmarkProtocol.WarmupCount
                || document.GetText() != source || controller.Selection.Active.Offset != 0)
            {
                throw new InvalidOperationException("q10 warmup did not restore the source document");
            }
        }

        internal MeasuredSamples RunMeasured()
        {
            var totalMicroseconds = new double[BenchmarkProtocol.MeasuredCount];
            var managedAllocationBytes = new long[BenchmarkProtocol.MeasuredCount];
            for (var sample = 0; sample < BenchmarkProtocol.MeasuredCount; sample++)
            {
                var frame = RunFrame(insertNext, true);
                totalMicroseconds[sample] = frame.TotalMicroseconds;
                managedAllocationBytes[sample] = frame.ManagedAllocationBytes;
            }
            if (!insertNext || operationCount != BenchmarkProtocol.WarmupCount + BenchmarkProtocol.MeasuredCount
                || document.GetText() != source || controller.Selection.Active.Offset != 0)
            {
                throw new InvalidOperationException("q10 measured actions did not restore the source document");
            }
            return new MeasuredSamples(totalMicroseconds, managedAllocationBytes);
        }

        private FrameSample RunFrame(bool insert, bool measured)
        {
            var expectedVersion = document.Version;
            var beforeAllocation = GC.GetAllocatedBytesForCurrentThread();
            var start = Stopwatch.GetTimestamp();
            var changed = insert ? controller.Insert(InsertText) : controller.DeleteBackward();
            if (!changed)
            {
                throw new InvalidOperationException("q10 controller edit was not handled");
            }
            window.Pump(FixedDeltaSeconds);
            var elapsedTicks = Stopwatch.GetTimestamp() - start;
            var allocated = GC.GetAllocatedBytesForCurrentThread() - beforeAllocation;
            VerifyActionState(insert, expectedVersion);
            operationCount++;
            insertNext = !insertNext;
            return measured
                ? new FrameSample(elapsedTicks * (1_000_000.0 / Stopwatch.Frequency), allocated)
                : default;
        }

        private void VerifyActionState(bool inserted, long expectedVersion)
        {
            var expectedLength = source.Length + (inserted ? 1 : 0);
            var expectedOffset = inserted ? 1 : 0;
            var selection = controller.Selection;
            if (!window.IsOpen || document.Length != expectedLength
                || document.Version != expectedVersion + 1
                || selection.Anchor.Offset != expectedOffset
                || selection.Active.Offset != expectedOffset)
            {
                throw new InvalidOperationException("q10 controller edit action was not applied correctly");
            }
        }

        private void VerifyInitialState()
        {
            var selection = controller.Selection;
            if (document.Length != source.Length || document.Version != 0
                || selection.Anchor.Offset != 0 || selection.Active.Offset != 0)
            {
                throw new InvalidOperationException("q10 editor did not start at UTF-16 offset 0");
            }
        }

        private void CaptureMetrics(WindowMetrics value)
        {
            metrics = value;
            metricsCaptured = true;
        }

        public void Dispose()
        {
            if (disposed)
            {
                return;
            }
            disposed = true;
            if (window.IsOpen)
            {
                window.MetricsChanged -= CaptureMetrics;
                window.RequestClose();
                window.Pump(0.0);
            }
            controller.Dispose();
        }

        private static TextSelection CollapsedSelection(int offset) => new(
            new TextPosition(offset, TextAffinity.Downstream),
            new TextPosition(offset, TextAffinity.Downstream));
    }

    private sealed class Q10EditorRootCell(TextEditor editor) : Cell
    {
        public override Blob Build() => new Container
        {
            Width = WindowWidth,
            Height = WindowHeight,
            Padding = (WindowHeight - VisibleLines * LineHeightPixels) / 2,
            BackgroundColor = Color.Rgb(13, 17, 23),
            Color = Color.Rgb(230, 237, 243),
            Children = new List<Blob> { editor },
        };
    }
}
