# Goo pre-push paired benchmark runner

`run_benchmark.py` executes GPU workloads sequentially. It never builds. Each comparison uses two runtime lanes and refuses to start unless their native launcher and `Goo.AsyncReadbackSmoke.dll` hashes match. The Goo DLL may differ. A direct-mode comparison can point both lanes at one frozen runtime and vary only `GOO_PRIMITIVE_UPLOAD_MODE`.

A pilot uses one balanced pair for each workload with 300 warmup and 200 measured frames. It checks runtime and gross direct-memory cost before the full run and is excluded from final analysis. The fixed short phase uses six paired runs for `unchanged`, `sparse`, and `full`, with 300 warmup frames and 2,000 measured frames. Pair order alternates A/B then B/A, and workload order rotates by pair. The fixed long phase uses four paired `unchanged` runs with 2,000 warmup and 10,000 measured frames because prior candidate tail concerns occurred on unchanged whole frames. Every run is a separate process.

If the pilot exposes a gross regression, the bounded rejection path uses three fresh balanced pairs for every workload with 300 warmup and 500 measured frames. It rejects only when every P50, P95, and P99 direction is worse across all nine comparisons. Any mixed direction is inconclusive and requires the original full plan. This shortened dataset cannot make direct mode the default or retain it on performance grounds.

The runner removes inherited `GOO_*`, `VK_INSTANCE_LAYERS`, and `VK_LAYER_PATH` values, then sets only the benchmark route, workload, counts, diagnostics, and lane mode. Validation layers are not part of timed runs. It captures binary hashes, host/session state, and lightweight NVIDIA state before and after every run. Logs and state are written incrementally. `--resume` continues only when the canonical config hash matches. `--plan-only` validates binaries and writes the schedule without launching the app.

Each output line is parsed from the legacy `retained-primitive-staging:` prefix. Duplicate keys are accepted only when their values match. The runner requires 1,000 records, 128,000 bytes, both frame slots, close, workload/sample identity, exact dirty totals, exact CPU written bytes and operations, bounded compared bytes, and allocation consistency. Staged measured transfer totals must be 0, 128, or 128,000 bytes per frame for unchanged, sparse, or full. Direct measured transfer, planned transfer, upload ranges, copy commands, and barriers must be zero, with no fallback and exact selected mode. Direct requested flush coverage is 128,000 bytes per frame because the encoder writes all records. These checks happen after each run before it is admitted to `runs.json`.

`analyze_benchmark.py` reports medians of independent run-level P50, P95, P99, maximum, and allocation values. These are not pooled-sample percentiles and are not presented as percentiles of percentiles. It also reports each within-pair B-versus-A change and the median paired change.

The direct-upload decision rule is fixed before measurement and uses sign consistency without an effect-size cutoff. Direct becomes a default candidate only if every short and long paired P99 is lower, every short-workload median P50/P95/P99 is lower, and median allocation does not rise. It is rejected only if all four long unchanged P99 values and all three short median P99 values are higher. Mixed evidence retains direct as opt-in with staged default. A default-candidate result still needs engineering review.

Run the direct comparison after root copies the frozen runtime:

```sh
cp /tmp/goo-prepush/config.example.json /tmp/goo-prepush/config.direct.json
$EDITOR /tmp/goo-prepush/config.direct.json
/tmp/goo-prepush/run_benchmark.py /tmp/goo-prepush/config.direct.json --plan-only
/tmp/goo-prepush/run_benchmark.py /tmp/goo-prepush/config.direct.json --phases pilot
/tmp/goo-prepush/run_benchmark.py /tmp/goo-prepush/config.direct.json --phases confirmation
/tmp/goo-prepush/run_benchmark.py /tmp/goo-prepush/config.direct.json --phases short,long --resume
/tmp/goo-prepush/analyze_benchmark.py /tmp/goo-prepush/results/direct-upload/runs.json \
  --output /tmp/goo-prepush/results/direct-upload --lane-a staged --lane-b direct \
  --decision-policy direct_upload
```

For a pre-pipeline or pre-timeline comparison, copy this config to a separate output directory, point lanes at root-provided frozen runtimes, set both lane modes and transfer modes to `staged`, and set `decision_policy` to `none`. Keep the same harness executable and DLL in both runtime directories. Set `require_mode_fields` to false only for a legacy harness that emits the full required metric set without mode fields. If the old Goo DLL cannot load under the same harness binary, do not combine results from a different harness into this paired dataset.
