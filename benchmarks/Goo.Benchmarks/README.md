# Goo benchmarks

## Core CPU/allocation historical candidate

`--core` without `--json` keeps the existing human-readable microbenchmark mode.
`--core-input` and `--core-raster` also keep their existing behavior.

`--core --json` is one historical core CPU/allocation candidate child run. It executes the monolithic,
componentized, callback-componentized, and raster workloads. Each workload
performs exactly 300 warmup operations, then retains exactly 2,000 individual
CPU and allocation samples in operation order. It reports p50, p95, p99,
p99.9, and worst for both metrics. The JSON includes the workload, revision,
protocol, metric schema, baseline ID and key, null parent baseline ID, Skia
backend, Goo revision, OS, RID, CPU, GPU and driver provenance, Release
or TestRelease benchmark and Goo assembly configurations, exact child command,
and `GOO_BENCHMARK_PROCESS_INDEX`. It records
`qualifiesS04Q10=false`; this harness is historical CPU/allocation evidence
and is not an S04 Q10 baseline. Visual and package hashes are explicitly
`null` for this CPU harness.

Build and run the five-process historical candidate batch:

```bash
dotnet build benchmarks/Goo.Benchmarks/Goo.Benchmarks.csproj -c Release -t:Rebuild --no-restore -warnaserror

dotnet benchmarks/Goo.Benchmarks/bin/Release/net10.0/Goo.Benchmarks.dll \
  --core-batch /tmp/goo-gsharp-core-cpu-allocation-historical
```

`--core-batch` launches five sequential isolated `--core --json` children
from the built assembly with tiering and QuickJIT disabled. It rejects failed,
incomplete, or mismatched children. The output directory contains
`run-00.json` through `run-04.json`, each raw child JSON document, and
`manifest.json`. The manifest stores per-run percentile results, pooled
percentiles computed from exactly 10,000 raw samples per workload without
percentile averaging, the launched process ID for every run, and the SHA-256
of every raw artifact. The manifest also carries a content SHA-256 and a
complete historical baseline key derived from the available provenance,
workload set, metrics, and protocol. The batch requires an empty output
directory.

## Accessibility scale evidence

`--accessibility` mounts one root plus 1,000 retained descendants. The
descendants are 995 static `Text` nodes, a hover target, a 96 px `TextEntry`,
a scroll container and its child, and a mutable semantic target. A counting
adapter is active for application rows. The seven application rows are
unchanged frame, unhandled wheel, hover boundary, focus change, one TextEntry
edit, scroll step, and one semantic `Name` declaration change. The text row
runs first without an adapter, then with the active adapter. Two controls
isolate an equivalent semantic rebuild with no adapter delivery and direct
delivery of the retained tree with no semantic rebuild.

```bash
DOTNET_TieredCompilation=0 DOTNET_TC_QuickJit=0 \
dotnet benchmarks/Goo.Benchmarks/bin/Release/net10.0/Goo.Benchmarks.dll --accessibility
```

Run three separate Release processes. The changed non-text rows and the
rebuild-only control must remain at or below 1,667 us and 2,048 B per
operation. The unchanged and unhandled-wheel rows must remain at 0 B. The
paired text row must keep its no-adapter baseline at or below 3,744 B, its
active total at or below 5,792 B, and its active minus baseline allocation at
or below 2,048 B. The active text row must remain at or below 1,667 us.

## Shape and box effect evidence

`--shape-effects` measures negative outer spread, inset, positive outer
spread, rounded dashed stroke, and no-shadow fill/stroke/clip Shape rows.
`--box-effects` measures rounded border, dashed border, outline, outer shadow,
and inset shadow rows.

```bash
DOTNET_TieredCompilation=0 DOTNET_TC_QuickJit=0 \
dotnet benchmarks/Goo.Benchmarks/bin/Release/net10.0/Goo.Benchmarks.dll --shape-effects

DOTNET_TieredCompilation=0 DOTNET_TC_QuickJit=0 \
dotnet benchmarks/Goo.Benchmarks/bin/Release/net10.0/Goo.Benchmarks.dll --box-effects
```

Every row uses 200 visible effect nodes in one stable retained tree. The root
makes the retained count 201. Each row uses the same 800x600 raster surface.
All shadows, radii, dashes, borders, and outlines are visible in the viewport.
The tree mounts and lays out once. Two complete paints per painter warm cached
Shape geometry and rounded or dashed effect state before measurement. Each
sample then clears the surface, paints the complete retained tree, and flushes
it. The timed path includes per-frame clipping, shadows, border or outline
work, and rasterization. It excludes mount, reconciliation, layout, and cache
setup.

Before recording CPU evidence, prove equal optimized JIT mode for both legs.
The TestRelease fixture dependencies must compile with `/optimize+`, and the
tested `Goo.Painter` entry method must disassemble as `FullOpts` with tiering
disabled. Do not compare a direct Release control with a MinOpts Goo assembly.

Each process takes seven GC-separated samples of 250 complete paints. Output
lists every CPU and managed-allocation sample, visible and retained node count,
and paints per sample. The row budget is at most 166.7 us and 1,024 B per
complete paint. If the direct total is at or below 166.7 us, Goo total must
also be at or below 166.7 us. If direct exceeds 166.7 us, the paired median
overhead must be at or below 166.7 us. Goo allocation must stay at or below
1,024 B. A Goo total more than 5% above direct prints a root-review flag. It
is not an automatic failure.

Shape and Box samples are paired by index and alternate first painter order.
Before timing, their direct controls must match Goo exactly over all 480,000
pixels of the 800x600 surface. Each output records Goo and direct samples,
allocations, node counts, paired deltas, paired median overhead, and order. The
direct controls do not retain geometry beyond Goo after warmup. Run three
separate processes and use the median of their medians. Box painting may use
lazy scratch during one `Painter.Paint` call for paths, round rects, and dash
effects. The scratch is disposed before that call returns and does not add
retained Node or Window storage.

## StocksGrid

`--stocks-grid` implements Microsoft.UI.Reactor's fixed 70x70 StocksGrid workload.
It is a live SDL3 and GPU benchmark, not a headless reconciliation microbenchmark.

```bash
dotnet run --project benchmarks/Goo.Benchmarks/Goo.Benchmarks.csproj -c Release -- \
  --stocks-grid --percent 10 --duration 10
```

The workload matches Reactor's core inputs:

- 4,900 live cells arranged as 70 columns by 70 rows
- deterministic random seed 42
- one update tick every 33 ms
- 10%, 50%, or 100% random mutation with replacement
- 64x18 cells, 8 px text, 2x1 padding, ellipsis, and price direction color
- identical stock symbols, price initialization, mutation, and formatting

The default is fullscreen with VSync, matching Reactor's stress applications.
Use `--windowed` for development, `--no-vsync` for a CPU ceiling, `--json` for
machine-readable output, and `--profile` for Goo's internal frame profiler.

`Total Renders` is Goo's logical completed-update count. For the cross-framework
metric, collect OS presents on Windows and calculate:

```text
effective refresh/sec = min(logical renders/sec, OS presents/sec)
```

The reference workload and methodology are in
[Microsoft.UI.Reactor's stress_perf suite](https://github.com/microsoft/microsoft-ui-reactor/tree/main/tests/stress_perf).

## Virtualized list

The 500,000-item case is a separate benchmark. It measures virtualization,
recycling, scrolling, and frame-time tails while keeping the live node count
bounded. Do not substitute a 500,000-node tree. Add this benchmark after the
established Goo virtual-list design is ported to the current G# implementation.
