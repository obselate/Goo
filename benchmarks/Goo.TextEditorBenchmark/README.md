# TextEditor benchmark

This headless benchmark measures TextEditor semantic commands, queued input,
retained updates, and raster paint. The default case matches the Gallery
TextEditor card's document, reactive presentation policy, slots, and styling in
a fixed 800 by 520 headless viewport. It does not include the surrounding page.

```bash
dotnet build benchmarks/Goo.TextEditorBenchmark/Goo.TextEditorBenchmark.csproj \
  -c Release -t:Rebuild

DOTNET_TieredCompilation=0 DOTNET_TC_QuickJit=0 \
dotnet run --project benchmarks/Goo.TextEditorBenchmark/Goo.TextEditorBenchmark.csproj \
  -c Release --no-build -- --iterations 500
```

Use `--document-mb 1`, `10`, or `50` for large plain documents. Add
`--deep-scroll` to put the caret and viewport near 80 percent of the document.
Use `--stage semantic`, `queued`, `retained`, `paint`, or `unchanged` to run
one pipeline stage. `--stage presentation` reports the default Gallery
layer's defensive public snapshots separately from its document rebase and
consumer synchronization. It is an attribution profile, not a frame score.
Each result reports the first operation, p50, p95, p99, maximum latency,
allocation, missed 60 Hz frame budgets, 50 ms stalls, and generation 0/1/2
collection counts.

For the tracked 1 MiB and Gallery release baselines, rebuild Release, then run
each command in three separate, non-overlapping processes. Keep both tiering
settings disabled. Use the middle of the three process p50 values. The exact
environment, command policy, current rows, and allocation gates are in
`docs/perf/RELEASE-BASELINE.md`.
