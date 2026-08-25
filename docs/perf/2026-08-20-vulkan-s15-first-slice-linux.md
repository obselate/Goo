# Vulkan S15 first-slice Linux measurement

Date: 2026-08-20

Status: exploratory first-slice evidence. This is not the S15 exit benchmark.

## Scope

This record covers the current strict retained solid, rounded, and border leaf paths, the eligible
child-bearing parent own-box path, conservative damage and partial replay, and the primitive SSBO
dirty-range slice. The historical
60-process data below measures retained damage only. The fresh leaf data is a current-binary retained-
versus-output-neutral-generic control, not a historical pre/post product-binary comparison or a
full-frame/GPU result. No long benchmark harness is retained.

The historical workload contains 1,000 stable-topology boxes in a 40 by 25 grid. Solid and rounded
boxes were measured separately. Each active frame changes the first 1, 100, 500, or 1,000 boxes. Idle
is also measured. The logical window is 640 by 208. The Wayland scale produced a 960 by 312 framebuffer
with a 299,520-pixel full area.

Each cell uses three isolated processes per arm, 30 warmup frames, and 120 measured frames. Arm order
alternates in the second repetition. Vulkan diagnostics were enabled; validation was not part of the
timing run. The fixed diagnostics ring retained the final 29 MainPass timestamps for active cells
and 33 for idle cells. All 60 processes completed, all 7,200 timed frames were present, 1,788 MainPass
timestamps were retained, and Vulkan reported zero result failures.

Host:

- Linux 7.1.8-1-cachyos
- AMD Ryzen 7 3700X
- NVIDIA GeForce RTX 3080, driver 610.57.04
- .NET SDK 10.0.111
- SDL Wayland surface on `wayland-0`

## Exact retained leaf checkpoints

The solid and rounded path admits only strict leaf `Container` and `Button` nodes with box paint. The
leaf must have no children and no gradients, images, borders, outlines, shadows, text effects, clips,
transforms, scroll, opacity context, blend, interaction state, or other non-default state.

An exact hit appends the cached logical solid or rounded record directly to the reusable `SceneFrame`.
An exact miss performs a direct exact rebuild of that leaf record and refreshes the owner state in
place. Hit validity uses stable owner/node identity, `ScenePaintVersion`, bit-exact logical bounds,
node kind, packed color, opacity, and rounded radii. Generic `ContentKey` and `TopologyKey` hashes are
not used to validate exact leaf records or exact-rebuild damage. Exact misses record the old and new
bounds directly for damage.

The border-only path admits a transparent leaf `Container` or `Button` with a solid square per-edge
border. At least one edge must be visible and every edge color must be finite. An exact hit appends one
cached logical `PerEdgeBorderRecord`. Exact comparison covers bounds, all four widths, all four zero
radii, all four packed colors, style, and transform index. Rounded or otherwise unsupported border
state clears the retained record and uses generic compilation. Restoring the strict square state
recaptures the exact record. One border scene draw expands to as many as four primitive records. The
one-edge mutation gate proves one dirty 128-byte record without claiming one GPU border record in
total. The accepted hot path checks common eligibility once, constructs the exact border record once,
and passes that same record to exact comparison or direct rebuild.

The TestRelease fixture directly records the exact last successfully presented image index, its
acquired applied version, the pending version assigned by that present, and whether that acquisition
promoted pending state. It pairs this state with `activeDamageRegion` and `activePartialRedraw` and
does not reconstruct damage from `sceneVersion - 1`. Pixel assertions are a separate offscreen replay
oracle, not a swapchain-image readback claim.

Generic chunk digests are only fast prefilters. Partial-safe generic reuse additionally requires exact
retained draw metadata, bit-exact solid, rounded, or per-edge border scalar records, bounds, and
resource identities, so a digest collision cannot suppress damage or reuse stale records.

## Child-bearing parent own-box checkpoint

An eligible child-bearing `Container` or `Button` can retain and directly rebuild only its own solid or
rounded box record. The record uses the same exact owner identity, `ScenePaintVersion`, bit-exact logical
bounds, node kind, packed color, opacity, and radii checks as the strict leaf path. A parent hit or
rebuild then recursively compiles children through the generic path. Child data is never retained in
the parent record.

Unsupported parent state clears the retained parent and uses generic compilation for the parent and its
children. Restoring eligible state recaptures the own-box record. The focused TestRelease fixture covers
parent hit, one parent mutation and direct rebuild, generic child continuation, unsupported fallback,
and recapture. Its final evidence includes `parent_own_box=1`.

Swapchain maintenance is mandatory at physical-device selection. The unsafe no-fence fallback is
retired. Windows qualification remains S19.

The damage journal now stores exact float-bit scale keys and physical framebuffer extent per scene
version. Any scale or extent transition forces full damage, including scale plus mutation. Full-redraw
frames record their physical key before the full override, so later reacquisition of an older image
does not turn an absent key into a false scale transition. Normal-blend solid, rounded, and square
solid per-edge border scenes are partial-safe without swapchain transfer-source support. Actual
unsupported non-normal blends retain the full fallback. The new
`GOO_VK_DAMAGE_JOURNAL=1` ABI gate reports:

`VULKAN_DAMAGE_JOURNAL_GATE sameKey=1 scale=1 extent=1 scaleMutation=1 scaleTransition=1 unchangedKey=1 mutationUnchanged=1 logicalBounded=1 evictionGap=1 reset=1 abandoned=1`

## Primitive SSBO dirty-range slice

Analytic primitive payloads use 128-byte std430 records in device-local storage. Mapped staging feeds
the storage buffer. Window targets use two fence-safe slots; the offscreen target uses one. Each slot
keeps exact accepted record history, committed only after accepted submission or reconciliation.
Buffer growth and device loss invalidate that history. First use, buffer generation changes, and
record-count changes force full uploads. Otherwise exact record comparison coalesces consecutive dirty
records into 128-byte copy ranges.

Clean frames still rebuild the CPU scene and write one staging candidate, but issue zero GPU copy
ranges and zero flushes. The one-box mutation and one-edge border mutation each prove one dirty record,
one copy range, 128 copied bytes, and one flush. Topology add forces a full primitive upload, and both
window slots clean-reuse.

The real Wayland TestRelease gate reported:

`s15-retention-gate: first_use_full=1 box_mutation=1 partial_damage=1 parent_own_box=1 bounds_old_background=1 topology_add_full=1 topology_remove_full=1 exact_leaf_solid_rounded=1 exact_color_miss=1 exact_bounds_miss=1 exact_border_leaf=1 unsupported_fallback_recapture=1 primitive_first_full=1 primitive_slots=2 primitive_warm_copy_zero=1 primitive_staging_candidate=1 primitive_mutation_dirty=1 primitive_mutation_written=128 primitive_topology_full=1 image_version_promotion=1 damageCount=28 dirtyChunkCount=0 reusedChunkCount=7 drawCount=198 recordCount=28 clipWritten=3664 clipSkipped=6336 clipMapped=10 clipFlushes=10 clipReuse=18 clipRetained=1 close=1`

## MainPass GPU results

Values are the median of three process P95 values. Negative delta is faster.

| Primitive | Changed boxes | Forced full P95 | Retained P95 | Delta |
|---|---:|---:|---:|---:|
| Solid | 0 | 0.046 ms | 0.046 ms | 0.0% |
| Solid | 1 | 0.046 ms | 0.004 ms | -91.1% |
| Solid | 100 | 0.046 ms | 0.009 ms | -80.0% |
| Solid | 500 | 0.046 ms | 0.026 ms | -44.4% |
| Solid | 1,000 | 0.046 ms | 0.046 ms | 0.0% |
| Rounded | 0 | 0.046 ms | 0.046 ms | 0.0% |
| Rounded | 1 | 0.046 ms | 0.004 ms | -91.1% |
| Rounded | 100 | 0.046 ms | 0.010 ms | -77.8% |
| Rounded | 500 | 0.046 ms | 0.026 ms | -44.4% |
| Rounded | 1,000 | 0.046 ms | 0.046 ms | 0.0% |

Damage classification matched the workload:

| Changed boxes | Dirty chunks | Reused chunks | Damage pixels | Frame area |
|---:|---:|---:|---:|---:|
| 1 | 1 | 1,001 | 288 | 0.10% |
| 100 | 100 | 902 | 34,560 | 11.54% |
| 500 | 500 | 502 | 149,760 | 50.00% |
| 1,000 | 1,000 | 2 | 288,000 | 96.15% |

## Typed clip payload retention

The no-clip typed payload path now retains two fence-safe per-slot payloads. A frame is eligible only
when `ClipMaskCount=0`, `ClipChainCount=1`, and `LayerCount=0`, with matching draw count, byte count,
capacity, and buffer generation. The first use of a slot writes and flushes. A matching later use skips
the mapped write and flush while keeping descriptor updates. Masks, layers, count or size changes,
capacity or buffer recreation, abort, recovery, and device loss invalidate retention and fall back to
the full write path.

The payload byte count and descriptor range are bounded by the physical
`VkPhysicalDeviceProperties.limits.maxStorageBufferRange` carried through `VulkanSharedRuntime`.
Both window and offscreen renderer paths use that value. Before any int32 indexing or cast, the
combined word count is checked with uint64 arithmetic:

`totalWords = 4 + 12 * DrawRefCount + 12 * ClipMaskCount <= Int32.MaxValue`

Each count is independently bounded by `floor(Int32.MaxValue / 12) = 178,956,970`, and
`byteCount = totalWords * 4` must also fit the physical storage-buffer range. No guessed numeric
limit is used.

The Linux S15 TestRelease gate passed with the stronger bounds, topology, and primitive assertions
shown above. Goo and `Goo.AsyncReadbackSmoke` Release warnings-as-errors builds reported 0 warnings
and 0 errors. Default async readback, the S09R pixel gate, S14 effects, rounded overflow, FailedIdle,
and proof scene readback passed on the real Wayland run. This evidence makes no Vulkan validation or
Windows qualification claim. The effects gate's Shape outer-shadow sample uses x128, outside the
x126 shape edge. The prior x129 sample was in the lavapipe blur tail and could fail without a product
rendering error.

The durable assertions prove that old bounds clear to the background, bounds changes damage the old-plus-new
union, and topology add or remove uses a full redraw.

The effects and rounded-overflow gates also passed.

A hostile lifetime review also closed the offscreen failure paths used by readback. Accepted work now
reconciles clip and layer bookkeeping before teardown, failed unsubmitted work aborts or abandons on
device loss, and adopted or reused requests drain, retry, or release their shared lease exactly once.
The default readback and failed-idle recovery gates passed after this fix.

## Historical retained-damage data

The historical 60-process matrix covered 7,200 frames. All 60 processes exited cleanly with zero
result failures. Each 1,000-box process used 151 frames, with exactly 2 mapped writes and flushes,
149 retained reuses, `96,224` written bytes, and `7,168,688` skipped bytes. Retained-versus-full
MainPass GPU results stayed 91.1% faster for 1 changed box, 77.8% for 100, 44.4% for 500, and 0%
for 1,000. This measures retained damage only. It does not measure the primitive SSBO slice, a
historical pre/post product-binary comparison, or a full-frame/GPU result.

## Fresh retained-leaf control

The final fresh benchmark includes the exact generic chunk proof and compares the current retained
compiler with an output-neutral generic fallback in the same binary. Each workload uses six
case-isolated fresh processes in ABBAAB order, three per arm, with 30 warmups and 120 samples. Every
case has 1,000 leaves. All cells allocate `0 B`, match output hashes, and report 1,002 chunks and 1,000
draws. Each timing is the median of the three process medians. Positive values use the generic arm as
the denominator and mean retained is faster. These are CPU scene-compile timings only, not historical
pre/post product-binary results or full-frame/GPU results.

| Workload | Retained P50/P95 ns | Generic P50/P95 ns | P50 improvement | P95 improvement |
|---|---:|---:|---:|---:|
| Static solid | `342847 / 1392620` | `414902 / 1741497` | `+17.367%` | `+20.033%` |
| Static rounded | `344850 / 1828806` | `425272 / 1851494` | `+18.911%` | `+1.225%` |
| Mutation N1 | `341269 / 1635493` | `550027 / 1752275` | `+37.954%` | `+6.665%` |
| Mutation N100 | `352074 / 1475689` | `412738 / 1761991` | `+14.698%` | `+16.249%` |
| Mutation N500 | `377742 / 1580629` | `552973 / 1908469` | `+31.689%` | `+17.178%` |
| Mutation N1000 | `360736 / 1503526` | `416175 / 1720959` | `+13.321%` | `+12.634%` |

Raw process P50/P95 nanoseconds:

- Static solid retained: `390436/1392620`, `338839/1484984`, `342847/1329273`.
- Static solid generic: `391072/1741497`, `414902/1714761`, `448200/1816669`.
- Static rounded retained: `338789/2321150`, `405310/1828806`, `344850/1415973`.
- Static rounded generic: `432145/1851494`, `425272/1874278`, `421650/1798475`.
- Mutation N1 retained: `329226/1403911`, `493771/1635493`, `341269/1693039`.
- Mutation N1 generic: `576793/1739868`, `435452/1752275`, `550027/1824701`.
- Mutation N100 retained: `352074/1418746`, `351848/1475689`, `410970/1862864`.
- Mutation N100 generic: `402649/1761991`, `439930/1716726`, `412738/1771130`.
- Mutation N500 retained: `414206/1756583`, `377742/1415606`, `355315/1580629`.
- Mutation N500 generic: `422141/1734533`, `552973/2160191`, `583070/1908469`.
- Mutation N1000 retained: `366506/1517591`, `360736/1445844`, `358430/1503526`.
- Mutation N1000 generic: `1603985/2077373`, `414812/1695778`, `416175/1720959`.

An earlier intermediate before direct exact rebuilds reported mutation N1000 at `-13.618%` P50 and
`-44.275%` P95. It was rejected and is not accepted evidence. No long benchmark harness is retained.

## Exploratory child-bearing parent own-box control

This is a current-binary, plan-only ABBAAB control with 1,000 eligible parent boxes and 1,000 generic-
compiled children. Each fresh process used 30 warmups and 120 samples. Both arms produced the identical
output hash `10921959993146536336`, 2,002 chunks, 2,000 draws, and `0 B` allocations at P50 and P95.
These are raw process P50/P95 nanoseconds.

| Fresh process | Retained P50/P95 ns | Generic P50/P95 ns |
|---|---:|---:|
| 1 | `2067689 / 2574675` | `2713707 / 3939820` |
| 2 | `2017164 / 2655698` | `2724658 / 3069288` |
| 3 | `740817 / 2794309` | `2695764 / 2936678` |

The median cross-process improvement is `+25.668%` P50 and `+13.475%` P95 for retained versus generic.
Record, submit, GPU, and full-frame evidence is unavailable. This plan-only control makes no Q10 or
Skia claim and retains no long benchmark harness.

## Exact border leaf control

This is a current-binary, plan-only ABBAAB control with 1,000 transparent square solid four-sided
border leaves. Each fresh process used 30 warmups and 120 samples. The retained arm used the exact
border cache. The output-neutral generic arm set interaction state so the same border records were
compiled through the generic path. Both arms produced hash `5436057910800725072`, 1,002 chunks, 1,000
scene draws, and `0 B` allocations at P50 and P95. The 1,000 border scene draws expand to exactly
4,000 primitive records in the renderer. These are raw process P50/P95 nanoseconds.

| ABBAAB process | Arm | P50/P95 ns |
|---:|---|---:|
| 1 | Retained | `1882942 / 1972601` |
| 2 | Generic | `2067600 / 2202644` |
| 3 | Generic | `2043204 / 2758402` |
| 4 | Retained | `1891517 / 1966840` |
| 5 | Retained | `1876800 / 2196473` |
| 6 | Generic | `2040889 / 2167308` |

The median-of-three retained result is `1882942 / 1972601 ns`. The generic result is
`2043204 / 2202644 ns`. Retained compilation is `+7.844%` faster at P50 and `+10.444%` faster at P95.
Retained counters were `150000` total, `149000` hits, `1000` rebuilds, `0` fallbacks, and `0`
invalidations. Generic counters were `150000` total and `150000` fallbacks. Record, submit, GPU, and
full-frame evidence is unavailable. This makes no Q10 or Skia claim and retains no long benchmark
harness.

The corrected pre-optimization rerun measured retained `1967740 / 2718316 ns` and generic
`2376561 / 2518809 ns`. Retained improved P50 by `17.202%` but regressed P95 by `7.921%`. That result
was rejected. The accepted implementation removes repeated width resolution and finite/visibility
checks and constructs one exact record after base eligibility.

The final warnings-as-errors build reported `0` warnings and `0` errors. This is an exploratory Linux
record only. No validation or Windows qualification claim is made.

## Recovered 4,900-cell StocksGrid control

The legacy live StocksGrid workload was recovered from commit `9d28533`. This is not a locked Q10
workload and is not a direct Vulkan-versus-Ganesh comparison. It preserves the old scene shape and
mutation protocol: 4,900 mounted text cells in a 70 by 70 grid, random seed 42, 490 mutation requests
per frame with replacement, 64 by 18 logical cells, 8 px text, padding, ellipsis, and price-direction
color.

The current TestRelease binary ran six fresh processes in ABBAAB order, three per arm, with 30 warmups
and 120 measured frames. The retained arm used normal S15 damage selection. The full arm set the
output-neutral test-only full-redraw override before every frame. The logical window was 1280 by 720.
The current Wayland scale produced a 1920 by 1080 framebuffer with 2,073,600 pixels. Diagnostics were
enabled without a validation layer. All processes completed with zero Vulkan result failures, zero
surface or device recoveries, and zero live Vulkan objects after close.

Raw total-frame results include source mutation, local Cell reconciliation, scene compilation,
command recording, submission, queue present, and any acquire or compositor wait:

| ABBAAB process | Arm | P50/P95 |
|---:|---|---:|
| 1 | Retained | `34.884 / 54.760 ms` |
| 2 | Full | `35.208 / 56.015 ms` |
| 3 | Full | `36.033 / 56.038 ms` |
| 4 | Retained | `36.184 / 57.299 ms` |
| 5 | Retained | `35.040 / 56.016 ms` |
| 6 | Full | `35.517 / 55.289 ms` |

The diagnostics ring retained the final 26 samples for each CPU and GPU stage in each process. The
table uses the median of the three process P50 or P95 values. Positive improvement means the retained
arm is faster.

| Metric | Retained P50/P95 | Full P50/P95 | P50/P95 improvement |
|---|---:|---:|---:|
| Total frame | `35.040 / 56.016 ms` | `35.517 / 56.015 ms` | `+1.342% / -0.003%` |
| Plan compile CPU | `20.636 / 41.912 ms` | `21.111 / 41.321 ms` | `+2.248% / -1.432%` |
| Command record CPU | `11.395 / 11.456 ms` | `11.430 / 11.548 ms` | `+0.305% / +0.804%` |
| MainPass GPU | `8.452 / 9.564 ms` | `8.042 / 9.305 ms` | `-5.093% / -2.784%` |
| Submit CPU | `0.045 / 0.054 ms` | `0.045 / 0.057 ms` | `-0.202% / +5.750%` |
| Queue present CPU | `0.054 / 0.058 ms` | `0.054 / 0.061 ms` | `+0.318% / +3.691%` |

Both arms measured exactly `6,075,995 B/frame` of current-thread allocation. Every measured frame in
both arms was a full redraw
over all 2,073,600 framebuffer pixels. The last frame had 4,902 dirty chunks, zero reused chunks, and
87,527 draws. Each process recorded exactly 739,900 retained fallbacks, or 4,900 text fallbacks over
all 151 presented frames.

This control shows no retained-scene benefit. Text draws are outside the current partial-safe and
exact-retention set, so the nominal retained arm enters the same full-redraw path as the forced-full
arm. The small mixed deltas above are measurement noise between equivalent full-redraw paths. The
result does not support a Vulkan-versus-Ganesh speed claim. It does prove that the current strict box
slices do not address the old text-heavy full-screen paint problem.

## Decision
The retained solid, rounded, border leaf, and child-bearing own-box slices, damage, chunk, typed
clip-payload, and primitive SSBO slices cover direct exact reuse/rebuild, recursive generic child
compilation, direct presented-image state, separate offscreen replay pixels, and dirty-range write and
flush behavior for their eligible payloads. No Q10 virtual-table/topology harness or frozen reference
exists, so S15 stays open for Q10 virtual table/topology behavior, general retained resources/ranges,
and lifecycle/recovery depth, then Windows S19. The recovered StocksGrid control makes retained text
and glyph resources, viewport-aware scene reduction, and stable text GPU ranges the next measured S15
priority. No validation or Windows claim is made by this record.
