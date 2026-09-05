## Measurement scope

Each process mounts 1,000 stable leaf Cells in a 50 by 20 grid inside a 1000 by 640 window. Exactly one Cell changes opacity per frame. The parent builds once. Button has no text child, text variants contain one glyph, Image shares one immutable pixel, and Shape shares one immutable triangle. This workload measures retained surface updates, not text editing, changing image content, or path morphing.

Cold means the first two update frames after one untimed initial render. It does not measure process startup, window opening, or first paint. Low and worst are computed within each process, then the table takes the median of each field across five processes. Warm percentiles are also medians of five process-level percentiles, not pooled percentiles.

CPU is host frame wall time from mutation through rendering and queue reconciliation, including waits. Allocation is managed bytes allocated by the frame thread inside that scope. Managed is GC.GetTotalMemory(true). RSS and PSS come from one /proc/self/smaps_rollup read immediately after that collection, before window close. RSS and PSS therefore share a sampling point. The historical screenshot used Process.WorkingSet64 for RSS. These are fresh measurements, not a controlled speedup comparison against the screenshot.

## Environment and verification

AMD Ryzen 7 3700X, NVIDIA GeForce RTX 3080, NVIDIA driver 610.57.04, Linux 7.2.0-1-cachyos, .NET SDK 10.0.302, Gsharp.NET.Sdk 0.4.1. A dedicated KWin virtual Wayland compositor runs at scale 1. The benchmark disables VSync. The normal desktop remains active, and per-run CPU load and device-wide GPU state are archived. These results are from Linux hardware only.

Seven separate Vulkan-validation runs use 50 warmup frames and 100 measured frames each. The final 35 timing runs disable validation and use 300 warmup frames and 2,000 measured frames each. No builds or other benchmarks run concurrently. Strict G# lint and the Release build pass. Every process checks exact cold/warm/measured Cell build and mutation counts, submit/present counts, complete main-pass GPU samples, both frame slots, no dropped timestamp scopes, and zero tracked allocator bytes, Vulkan allocation bytes, native objects, and readback-pool bytes after close.

## Evidence and reproduction

The evidence directory contains all 42 process logs, raw cold observations, per-run quantiles, paired memory snapshots, CPU/GPU context, source and binary hashes, the task patch, and the runner/analyzer scripts. The prior all-mode benchmark remains unchanged.

Build tests/Goo.AsyncReadbackSmoke/Goo.AsyncReadbackSmoke.gsproj in Release and freeze its output in a separate runtime directory. Run the archived run.py with --phase pilot --validation, then --phase final --no-validation, using --runtime and --wayland-display for that runtime and test compositor. Run analyze.py RUNS_JSON --output OUTPUT --expected-rounds 5 for the final table.
