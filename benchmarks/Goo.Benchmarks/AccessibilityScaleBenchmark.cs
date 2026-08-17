using System.Diagnostics;
using Goo;

internal static class AccessibilityScaleBenchmark
{
    private const int Samples = 7;
    private const int Iterations = 1_000;
    private const double CpuBudgetUs = 1_667.0;
    private const long DirtyAllocationBudget = 2_048;
    private const long TextEntryAllocationBudget = 3_744;
    private const long TextTotalAllocationBudget = TextEntryAllocationBudget + DirtyAllocationBudget;

    private static readonly BenchmarkWorkloadDefinition Unchanged = new(
        "accessibility.unchanged-frame",
        "retained semantic tree with no change.", "1", "operation");
    private static readonly BenchmarkWorkloadDefinition NoOpWheel = new(
        "accessibility.no-op-wheel",
        "wheel delivery over a target without a handler or scroll range.", "1", "operation");
    private static readonly BenchmarkWorkloadDefinition HoverBoundary = new(
        "accessibility.hover-boundary",
        "hover transition across one semantic boundary.", "1", "operation");
    private static readonly BenchmarkWorkloadDefinition FocusChange = new(
        "accessibility.focus-change",
        "focus alternation on the visible TextEntry.", "1", "operation");
    private static readonly BenchmarkWorkloadDefinition TextWithoutAdapter = new(
        "accessibility.text-edit-without-adapter",
        "TextEntry edit on a 1,001-node tree with adapter delivery disabled.", "1", "operation");
    private static readonly BenchmarkWorkloadDefinition TextActiveAdapter = new(
        "accessibility.text-edit-active-adapter",
        "TextEntry edit on a 1,001-node tree with active adapter delivery.", "1", "operation");
    private static readonly BenchmarkWorkloadDefinition ScrollStep = new(
        "accessibility.scroll-step",
        "one scroll increment through the retained semantic tree.", "1", "operation");
    private static readonly BenchmarkWorkloadDefinition SemanticDeclaration = new(
        "accessibility.semantic-declaration-change",
        "one semantic declaration change with retained adapter delivery.", "1", "operation");
    private static readonly BenchmarkWorkloadDefinition EquivalentRebuild = new(
        "accessibility.equivalent-semantic-rebuild",
        "equivalent semantic rebuild without adapter change.", "1", "operation");
    private static readonly BenchmarkWorkloadDefinition AdapterDelivery = new(
        "accessibility.retained-adapter-update",
        "retained accessibility adapter delivery without a tree rebuild.", "1", "operation");

    internal static bool TryRun(string[] args)
    {
        if (Array.IndexOf(args, "--accessibility") < 0)
        {
            return false;
        }

        CoreBenchmarkRun? run = Array.IndexOf(args, "--json") >= 0
            ? new CoreBenchmarkRun("accessibility")
            : null;
        try
        {
            Run(run);
            run?.Complete();
        }
        catch (Exception exception)
        {
            run?.Fail(exception);
            Environment.ExitCode = 1;
        }
        finally
        {
            if (run is not null)
            {
                CoreBenchmarkProtocol.Write(run);
            }
        }
        return true;
    }

    private static void Run(CoreBenchmarkRun? run)
    {
        RunRow(Unchanged, "accessibility unchanged frame", fixtures => fixtures.StepUnchanged(), 0, run);
        RunRow(NoOpWheel, "accessibility no-op wheel", fixtures => fixtures.StepNoOpWheel(), 0, run);
        RunRow(HoverBoundary, "accessibility hover boundary", fixtures => fixtures.StepHoverBoundary(), DirtyAllocationBudget, run);
        RunRow(FocusChange, "accessibility focus change", fixtures => fixtures.StepFocusChange(), DirtyAllocationBudget, run);
        RunTextEditPair(run);
        RunRow(ScrollStep, "accessibility scroll step", fixtures => fixtures.StepScroll(), DirtyAllocationBudget, run);
        RunRow(SemanticDeclaration, "accessibility semantic declaration change",
            fixtures => fixtures.StepSemanticDeclarationChange(), DirtyAllocationBudget, run);
        RunRow(EquivalentRebuild, "accessibility equivalent semantic rebuild only",
            fixtures => fixtures.StepEquivalentSemanticRebuild(), DirtyAllocationBudget, run);
        RunRow(AdapterDelivery, "accessibility retained adapter update only",
            fixtures => fixtures.StepAdapterDeliveryOnly(), DirtyAllocationBudget, run);
    }

    private static void RunTextEditPair(CoreBenchmarkRun? run)
    {
        var intrinsic = MeasureRow(TextWithoutAdapter, "accessibility text edit without adapter",
            fixtures => fixtures.StepTextEditWithoutAdapter(), fixtures => fixtures.PrepareWithoutAdapter(),
            "1,001-node adapter disabled", run);
        var active = MeasureRow(TextActiveAdapter, "accessibility text edit with active adapter",
            fixtures => fixtures.StepTextEdit(), null, "1,001-node active adapter", run);
        if (intrinsic.MedianAllocation > TextEntryAllocationBudget || active.MedianUs > CpuBudgetUs
            || active.MedianAllocation > TextTotalAllocationBudget
            || active.MedianAllocation - intrinsic.MedianAllocation > DirtyAllocationBudget)
        {
            throw new InvalidOperationException("accessibility text edit exceeded the paired budget");
        }
    }

    private static void RunRow(BenchmarkWorkloadDefinition definition, string name,
        Func<AccessibilityScaleFixtures, bool> step, long allocationBudget, CoreBenchmarkRun? run,
        Func<AccessibilityScaleFixtures, int>? prepare = null,
        string context = "1,001-node active adapter")
    {
        var result = MeasureRow(definition, name, step, prepare, context, run);
        if (result.MedianUs > CpuBudgetUs || result.MedianAllocation > allocationBudget)
        {
            throw new InvalidOperationException($"{name} exceeded {CpuBudgetUs:F0} us or "
                + $"{allocationBudget:N0} B");
        }
    }

    private static AccessibilityBenchmarkResult MeasureRow(BenchmarkWorkloadDefinition definition,
        string name,
        Func<AccessibilityScaleFixtures, bool> step, Func<AccessibilityScaleFixtures, int>? prepare,
        string context, CoreBenchmarkRun? run)
    {
        run?.SetActiveWorkload(definition.Id);
        var fixtures = new AccessibilityScaleFixtures();
        if ((prepare ?? (static fixtures => fixtures.Prepare()))(fixtures) != 1_001)
        {
            throw new InvalidOperationException($"{name} did not mount {context}");
        }

        long sink = 0;
        for (var index = 0; index < 16; index++)
        {
            if (!step(fixtures))
            {
                throw new InvalidOperationException($"{name} warmup failed");
            }
            sink += fixtures.TreeVersion();
        }

        var micros = new double[Samples];
        var allocations = new long[Samples];
        for (var sample = 0; sample < Samples; sample++)
        {
            GC.Collect();
            GC.WaitForPendingFinalizers();
            GC.Collect();
            var before = GC.GetAllocatedBytesForCurrentThread();
            var clock = Stopwatch.StartNew();
            for (var index = 0; index < Iterations; index++)
            {
                if (!step(fixtures))
                {
                    throw new InvalidOperationException($"{name} sample failed");
                }
                sink += fixtures.TreeVersion();
            }
            clock.Stop();
            micros[sample] = clock.Elapsed.TotalMicroseconds / Iterations;
            allocations[sample] = (GC.GetAllocatedBytesForCurrentThread() - before) / Iterations;
        }

        run?.Add(definition, "--accessibility", 1_001, 1_001,
            new CoreBenchmarkSampleSet(name, Iterations, micros, allocations));
        var sortedMicros = (double[])micros.Clone();
        var sortedAllocations = (long[])allocations.Clone();
        Array.Sort(sortedMicros);
        Array.Sort(sortedAllocations);
        var medianUs = sortedMicros[Samples / 2];
        var medianAllocation = sortedAllocations[Samples / 2];
        Console.WriteLine($"{name} ({context}): median {medianUs:F2} us, "
            + $"{medianAllocation:N0} B per operation");
        GC.KeepAlive(sink);
        return new AccessibilityBenchmarkResult(medianUs, medianAllocation);
    }

    private readonly record struct AccessibilityBenchmarkResult(double MedianUs, long MedianAllocation);
}
