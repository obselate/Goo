# Reconciler microbenchmark method

Status: measured. The authoritative final report is [the post-checkpoint report](../../../post-checkpoint-2026-09-05.md). See [micro results](results/final/analysis.md) and [current-driver native results](native-results/final-current-verified/analysis.json). `results/decision.md` and `native-results/final-private` preserve the first comparison and are superseded for final native figures. [Driver provenance](results/native-driver-provenance.md) explains the distinction.

The fixture is injected into baseline, style-only, and keyed-only Goo builds through `Goo.ReconcileBenchmarkFixtures.props`. Build the unchanged driver once against the baseline Goo assembly. Freeze three complete runtime directories with the same driver bytes and only the intended Goo assembly variant. The runner copies and hashes those inputs before timing.

Each comparison uses seven paired fresh-process runs. Pair order alternates baseline/candidate and candidate/baseline. Processes run sequentially with tiered compilation and ReadyToRun disabled, 500 warmup samples, 3,000 measured samples, and a rotated case order. Style samples batch 4,096 calls. Keyed samples time one full `Reconciler.Diff` at 10, 100, and 1,000 children for stable order, half-rotation reorder, and alternating remove/add of the final child.

Timed intervals contain only the comparison batch or `Reconciler.Diff`. Managed allocation intervals use the same scope. Exact child count, order, content, retained-node identity, and structure-effect checks run after each keyed timed interval. Style cases verify numeric mismatch, nil equality, shared text identity, and distinct equal text semantics.

The analyzer reports medians of per-process P50/P95/P99/max values, paired percentage changes, run ranges, and direction counts. It does not claim an aggregate latency percentile. The prospective retention rules reject small or inconsistent effects:

- Style: both nil-equal and shared-text P50 medians improve by at least 3%, with lower candidate time in at least five of seven pairs.
- Keyed: stable 1,000-child P50 median improves by at least 3%, with lower candidate time in at least five of seven pairs, and no reorder or remove/add P50 median regresses by more than 3%.

Allocation changes are reported but are expected to be zero for the style comparison. No RAM, GPU, frame-time, or native-renderer claim follows from this microbenchmark. Run the existing native Container full-mutation companion only if a micro candidate clears its prospective rule, using the same frozen baseline and candidate binaries.

Candidate patches are `patches/style-fastpath.patch` and `patches/keyed-fusion.patch`. Apply each independently to the post-correctness, post-teardown baseline. Do not combine candidates for the decision runs.

The keyed patch is a performance ceiling only. For equal-count reorders it delays `Structure` marking from the pre-loop order scan to the first mismatching item in the incoming loop. If an earlier child callback throws before a later mismatch, the observable failure effects differ from baseline. Reject the exact patch even if it clears the timing screen. A safe preflight fusion would need separate design and measurement.

The archive stores the measured fixture byte-exact as `BenchmarkFixture.gs.txt`. Restore its `.gs` extension when recreating the original temporary build layout. Absolute paths in the fixture props refer to that original layout. The archive omits runtime binaries and retains their hashes in the run manifests.

Recreate the `variants` source files from the baseline plus the independent patches before using the recorded replacement props. The native runner uses the adjacent byte-exact `all_blob_validator.py` and adds support for the two current string-valued memory-source fields. Its validation of workload counts and cleanup is unchanged.
