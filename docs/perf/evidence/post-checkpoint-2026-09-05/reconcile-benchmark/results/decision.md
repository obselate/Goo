# Reconciler experiment decision

## Decision

Retain the style payload-identity fast path. Reject the keyed loop fusion.

The style candidate first preserves the four numeric comparisons. When those match, `Object.ReferenceEquals(left.Payload, right.Payload)` returns true before the existing typed payload comparison chain. Distinct payloads continue through the unchanged chain. Untimed guards preserve NaN inequality, shared string equality, and distinct equal string equality.

The keyed candidate passed its prospective performance screen but is not semantically equivalent. For equal-count reorders it delays `Structure` marking until the incoming loop reaches the first mismatch. A callback on an earlier matched child can throw before that point, leaving different failure effects from baseline. The observed 1,000-child stable P50 saving is too small to justify a new exception-safe preflight design in this task.

## Microbenchmark

Seven balanced fresh-process pairs ran for each independent candidate. Every process used the same driver binary, CPU 6, disabled tiered compilation and ReadyToRun, 500 warmup samples, and 3,000 measured samples. Style samples contain 4,096 comparisons. Keyed samples contain one complete reconciliation. Structure and node identity checks ran outside the timed and allocation intervals.

| Case | Baseline median P50 | Candidate median P50 | Median paired change | Direction | Allocation P50 |
|---|---:|---:|---:|---:|---:|
| Style nil payload | 39.846 ns/op | 8.546 ns/op | -78.551% | 7/7 lower | 0 B/batch both |
| Style shared text identity | 54.076 ns/op | 8.544 ns/op | -84.200% | 7/7 lower | 0 B/batch both |
| Style distinct equal text | 56.858 ns/op | 57.797 ns/op | +1.652% | 0/7 lower | 0 B/batch both |
| Keyed stable, 1,000 children | 239.982 us/diff | 234.492 us/diff | -3.668% | 7/7 lower | 0 B/diff both |
| Keyed reorder, 1,000 children | 240.354 us/diff | 237.558 us/diff | -1.784% | 4/7 lower | 0 B/diff both |
| Keyed remove/add, 1,000 children | 242.718 us/diff | 239.853 us/diff | -1.627% | 4/7 lower | 0 B/diff both |

The style win is specific to nil or identical payload references. The distinct equal string path slowed by about 0.94 ns per comparison. It retains exact equality behavior and is a bounded trade.

## Native companion

Five balanced fresh-process pairs ran the existing native AllBlob benchmark on the private KWin socket `goo-post-checkpoint`. Each process rendered 1,000 Container blobs under full mutation for 300 warmup and 2,000 measured frames. Validation layers were off during timing. Diagnostics, exact build and mutation counts, both frame slots, GPU timestamp acceptance, close, and resource cleanup remained enabled.

| Metric | Baseline median of process statistic | Style median | Median paired change | Direction |
|---|---:|---:|---:|---:|
| Host-frame wall P50 | 3.010 ms | 2.659 ms | -11.592% | 5/5 lower |
| Host-frame wall P95 | 3.525 ms | 3.173 ms | -10.052% | 5/5 lower |
| Host-frame wall P99 | 3.757 ms | 3.357 ms | -11.012% | 5/5 lower |
| Managed allocation P50 | 504,160 B/frame | 504,160 B/frame | 0.000% | equal |
| Managed allocation P99 | 504,160 B/frame | 504,160 B/frame | 0.000% | equal |

All 10 native processes passed. They produced 20,000 measured CPU frames and 20,000 accepted Main GPU samples with zero dropped samples. Every close reported allocator bytes, Vulkan allocated bytes, Vulkan objects, and readback-pool bytes at zero.

Main GPU timestamp medians also moved between binaries, but the style change does not alter GPU work. Those values are environment observations and provide no causal GPU-performance claim. The supported result is the repeated host-frame CPU reduction with unchanged managed allocation in this Container/full workload.

## Limits

- The microbenchmark isolates reconciliation and does not measure RAM or GPU work.
- The native companion covers only Container/full mutation. It is not a claim for every Blob type or unchanged/sparse workload.
- Native timing used the active private KWin compositor and a machine load average between 1.85 and 2.26. Balanced ordering limits drift but does not create laboratory isolation.
- Reported summary values are medians of per-process statistics and medians of paired percentage changes. They are not aggregate latency percentiles or statistical significance claims.
- One short desktop-compositor calibration and one interrupted desktop attempt are excluded. Final native results come only from `native-results/final-private`.
