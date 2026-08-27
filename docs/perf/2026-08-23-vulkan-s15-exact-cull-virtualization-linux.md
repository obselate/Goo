# Vulkan S15 exact cull and virtualization Linux qualification

Date: 2026-08-23

Cross-renderer policy: any Skia or reconstructed-control data in dated before-state sections below is
historical archive context only. It is not a control, denominator, threshold, release gate, or claim.
Clean-source Vulkan results govern current regressions.

Status: local discrete-Linux implementation and qualification complete. All eight clean-source Q10 rows, actual-NVIDIA visual routes, resize-DPI, first-usable-frame P95, native SDL polling acceptance, true idle, package, dependency, fallback, NativeAOT, validation, and Linux S07 Effects/Offscreen T03/T04 integration pass. Wayland presentation feedback is deferred under S16-D03 with nominal refresh as fallback. Remaining work is external hardware.

## Verdict

The six-step implementation passes every runnable gate in its approved scope.

- Focused exact clipped-text culling reduced process-median P50 by 74.358%, P95 by 74.922%, allocation by 64.747%, and Paint time by 79.609%.
- Focused virtualization reduced process-median P50 by 40.235%, P95 by 35.412%, allocation by 52.529%, and Tree time by 84.173% relative to the complete-tree cull-enabled arm.
- Full NativeAOT virtualization reduced P95 by 87.455% relative to the complete-tree cull-disabled control. This exceeds the required 20% large-table threshold.
- Focused pixel, structure, mutation, recycling, resize, close, Vulkan validation, and sustained lifetime gates pass.
- Linux S07 Effects/Offscreen stage scopes and T03/T04 integration pass the local validation-layer and recovery contract. Windows repeat remains open.
- No public Goo API changed.

S15 now has clean-source table, topology, small-animation, text-editing, image-effects, resize-DPI, three-window, and true-idle evidence from one commit and NativeAOT binary. Every row passes its local contract and absolute budget. First-usable-frame, synthetic input handoff, native SDL polling, stage validation, package, and lifecycle gates pass. Wayland presentation feedback is deferred under S16-D03. The clean Vulkan results are the regression references.

## Source state

- Branch: `gaps-and-reductions`
- Base HEAD: `8354cebd872796f03d9aabb50a25657658ea39eb`
- The implementation was measured from the uncommitted working tree.
- All A, B, and C timing processes used the same TestRelease binary.
- That binary contained a temporary switch only inside the unrelated S14 rounded-overflow gate. The switch was unreachable from every StocksGrid timing route. It was removed from source after it proved the S14 failure independent of exact culling.

## Environment

- Linux 7.1.8-1-cachyos
- AMD Ryzen 7 3700X
- NVIDIA GeForce RTX 3080 with driver 610.57.04
- 10,240 MiB GPU memory
- .NET SDK 10.0.111
- SDL Wayland surface on `wayland-0`

## Protocol

Each arm used three fresh serial processes. Process order rotated as A, B, C then B, C, A then C, A, B.

Common settings:

- Release JIT TestRelease fixture
- Retained renderer arm
- Explicit two-axis StocksGrid clipping
- 4,900 logical items in a 70 by 70 grid
- Seed 42
- 10% mutation requests with replacement
- 1280 by 720 logical window
- VSync disabled
- 59 workload warmups
- 240 measured frames
- Vulkan validation disabled during timing

| Arm | Tree | Exact cull | Overscan | Purpose |
|---|---|---|---:|---|
| A | complete | disabled | 0 | Explicit-clip semantic control |
| B | complete | enabled | 0 | Isolate the pre-shape exact return |
| C | virtualized | enabled | 1 | Add bounded Cell mounting and recycling |

Explicit clipping is not byte-identical to the original legacy StocksGrid output. The first difference is at framebuffer byte 15,632. The fixture therefore preserves `clip=legacy` as its default and uses the separate `clip=explicit` arm for A, B, and C. This follows the plan fallback and does not relabel a semantic change as an optimization.

## Correctness gates

The exact clipped-text gate passed:

```text
s15-text-viewport-cull-gate: exact_outside=1 partial_full_shape=1 mutation_reveal=1 fallback=1 pixel_equality=1 resize=1 close=1
```

The StocksGrid virtualization gate passed:

```text
s15-stocks-grid-virtualization-gate: cull_modes=2 stops=9 explicit_clip=1 complete=4900 virtual_pool=989 zero_overscan=1 mutation=1 stale_slot=1 uniqueness=1 churn=1 resize=1 close=1
```

The virtualization gate byte-compared complete and virtualized output across its scroll corpus. It covered both cull modes, nine scroll stops, far jumps, offscreen mutation and reveal, recycled slot identity, one-cell overscan, zero overscan, pool uniqueness, capacity growth, capacity reuse, resize, and close.

The S09R pixel gate, S15 retention gate, and S15 text transport gate passed. Earlier actual-NVIDIA `rounded_text` and COLR failures were first-use publication timing combined with a diagnostics classification defect: text bytes remained pending upload on frames 1 and 2, redraw was correctly requested, final pixels rendered, yet Paint permanently recorded unsupported Content. Paint now consumes a per-call publication-pending flag from VulkanTextScene for Text, TextEntry, and TextEditor. Permanent unsupported diagnostics and retained snapshot incompleteness remain intentional. Current source passes the actual-NVIDIA rounded-overflow route 3 of 3 processes and the effects/COLR route 3 of 3 processes, and both routes pass with `__GL_SHADER_DISK_CACHE=0`.

The protected-text rendering blocker was traced to Paint invoking specialized entry and editor emitters directly, bypassing generic `VulkanTextScene.Emit` and leaving `activeNodeSegments` unset. Routing Entry and Editor through generic `Emit` and privatizing the specialized emitters restores cache activation. Current source passes actual-NVIDIA protected-text 3 of 3 processes and CPU Lavapipe protected-text, covering grapheme masking, visual geometry, clipboard, IME, semantics, and close.

## Per-process timing

Times are nanoseconds except for the FrameProfiler columns, which are milliseconds. Allocation is managed bytes per measured frame.

| Round | Arm | P50 | P95 | Max | Allocation | Profile total | Tree | Paint |
|---:|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | A | 33,524,370 | 35,843,873 | 62,262,144 | 2,964,518 | 34.071 | 2.448 | 31.528 |
| 1 | B | 8,596,198 | 9,198,684 | 18,217,959 | 1,045,082 | 8.396 | 1.936 | 6.373 |
| 1 | C | 5,012,340 | 5,908,260 | 17,741,402 | 496,113 | 4.999 | 0.292 | 4.627 |
| 2 | B | 8,518,312 | 12,897,729 | 22,741,580 | 1,045,082 | 8.933 | 2.120 | 6.719 |
| 2 | C | 6,428,862 | 7,902,700 | 20,334,099 | 496,113 | 6.363 | 0.394 | 5.871 |
| 2 | A | 33,335,423 | 37,469,118 | 62,430,001 | 2,964,518 | 33.909 | 2.365 | 31.445 |
| 3 | C | 5,137,537 | 6,069,063 | 18,127,019 | 496,113 | 5.083 | 0.314 | 4.694 |
| 3 | A | 37,790,483 | 50,433,893 | 77,385,771 | 2,964,518 | 39.057 | 2.510 | 36.432 |
| 3 | B | 8,744,077 | 9,396,527 | 19,625,363 | 1,045,082 | 8.500 | 1.984 | 6.429 |

## Process medians

| Metric | A | B | C |
|---|---:|---:|---:|
| Frame P50 ns | 33,524,370 | 8,596,198 | 5,137,537 |
| Frame P95 ns | 37,469,118 | 9,396,527 | 6,069,063 |
| Frame max ns | 62,430,001 | 19,625,363 | 18,127,019 |
| Managed B/frame | 2,964,518 | 1,045,082 | 496,113 |
| Profile total ms | 34.071 | 8.500 | 5.083 |
| Tree ms | 2.448 | 1.984 | 0.314 |
| Reconcile ms | 2.094 | 1.542 | 0.274 |
| Build ms | 0.661 | 0.446 | 0.084 |
| Diff ms | 0.857 | 0.631 | 0.108 |
| Style ms | 0.481 | 0.478 | 0.085 |
| Input Tree ms | 0.363 | 0.429 | 0.038 |
| Render ms | 31.619 | 6.514 | 4.767 |
| Paint ms | 31.528 | 6.429 | 4.694 |
| Target begin ms | 0.059 | 0.056 | 0.052 |
| Present ms | 0.036 | 0.028 | 0.025 |

The timing output did not emit separate plan compile, command lifecycle, Submit, or asynchronous GPU main-pass percentiles for these processes. The table reports only emitted stage values.

## Allocation, structure, and lifetime

| Metric | A | B | C |
|---|---:|---:|---:|
| Profile total allocation B | 2,962,468 | 1,043,032 | 494,063 |
| Tree allocation B | 666,790 | 666,790 | 117,820 |
| Reconcile allocation B | 666,710 | 666,710 | 117,740 |
| Build allocation B | 666,550 | 666,550 | 117,580 |
| Diff allocation B | 160 | 160 | 160 |
| Render and Paint allocation B | 2,295,678 | 376,242 | 376,242 |
| Stock Cell Builds | 144,269 | 144,269 | 25,660 |
| Mounted Cells | 4,900 | 4,900 | 989 |
| Text layout requests | 4,900 | 800 | 800 |
| Exact text culls | 0 | 4,100 | 61 |
| Driver heap usage B | 93,253,632 | 63,893,504 | 63,893,504 |
| Vulkan object allocations | 642 | 642 | 642 |
| Vulkan device-memory allocations | 8 | 8 | 8 |

Every timing process reported these stable resource bounds:

- Vulkan object allocation count: 642
- Vulkan device-memory allocation count: 8
- Text atlas peak resident bytes: 262,144
- Image peak resident bytes: 0
- Vulkan object count after close: 0
- Vulkan device-memory bytes after close: 0

The timing output did not emit RSS samples or intermediate resource checkpoints. These results prove equal final creation counts across arms and complete close cleanup. They do not prove a sustained RSS or resource plateau.

## Measured deltas

Reductions use the control arm as the denominator.

| Comparison | Metric | Reduction |
|---|---|---:|
| B versus A | P50 | 74.358% |
| B versus A | P95 | 74.922% |
| B versus A | Allocation | 64.747% |
| B versus A | Paint | 79.609% |
| C versus B | P50 | 40.235% |
| C versus B | P95 | 35.412% |
| C versus B | Allocation | 52.529% |
| C versus B | Tree | 84.173% |
| C versus A | P95 | 83.803% |

B removes 4,100 of 4,900 text layout requests and does not change complete-tree Cell Build count. C keeps visible text layout requests at 800 while reducing mounted Cells from 4,900 to the calculated worst-case pool bound of 989.

## Raw log hashes

These are SHA-256 hashes of complete captured process logs. They are not framebuffer hashes.

| Round | Arm | SHA-256 | Bytes |
|---:|---|---|---:|
| 1 | A | `b6c385bb6d6661dc5155493221e0a00d70df5b35b1cca1fd4a5968e7f90d2589` | 268,553 |
| 1 | B | `9e3695106311387e51dc587b68cfcc6fe8f509f9885db0ec4979ae038c318d0c` | 268,397 |
| 1 | C | `31a1cbaabfcd79a96419b2c75d51f039705372036416d693852a3f418b254b05` | 268,216 |
| 2 | B | `3153b6f7a24c47378d264a3f1aa1995858aac21369c9a7bceaa1836062b65b0f` | 268,393 |
| 2 | C | `b5b2868c740bd91431429bc3e01772b393c31f9bb9c299379d234417bb9bc3aa` | 268,263 |
| 2 | A | `22874169fced532cdd5c1a7e292cb36b4466dd23ff436f97ceadf5ad72af189e` | 268,556 |
| 3 | C | `0a57272357234d6032332459751e1bccfd87a5835d46204641c19d42f187d5d5` | 268,232 |
| 3 | A | `a135ea4f4f3f2f3e90bdb28a37371fa07fbd2827080c052dc043c58d3a5664a8` | 268,580 |
| 3 | B | `4024cf1cb26024b6ebb39d6cf65f182d8c8b21b9b2d03ab8c72227a99f54b805` | 268,407 |

## Full NativeAOT protocol

The full matrix used the final source state after all temporary S14 probes were removed.

- NativeAOT Release
- Five fresh processes per arm
- 300 warmup frames
- 2,000 measured frames
- Rotated process order
- Same published native binary for A, B, and C
- Same workload, viewport, seed, explicit clipping, and validation-off timing policy as the focused protocol

NativeAOT publish completed with exit code 0:

```text
dotnet publish tests/Goo.AsyncReadbackSmoke/Goo.AsyncReadbackSmoke.gsproj -c Release -r linux-x64 --self-contained true -p:PublishAot=true -p:TreatWarningsAsErrors=true -p:GooLinuxSdlPath=/home/xaz/Projects/goo-gsharp/artifacts/native/libSDL3.so -p:IncludeTestFixtures=true -p:GooTestFixturesProps=/home/xaz/Projects/goo-gsharp/tests/Goo.AsyncReadbackSmoke/Goo.AsyncReadbackFixtures.props
```

### NativeAOT per-process timing

| Round | Arm | P50 ns | P95 ns | Max ns | Allocation B/frame |
|---:|---|---:|---:|---:|---:|
| 1 | A | 40,238,781 | 45,271,643 | 120,754,243 | 3,025,122 |
| 1 | B | 11,478,428 | 13,175,529 | 42,407,269 | 1,054,378 |
| 1 | C | 6,712,610 | 7,393,674 | 18,152,625 | 504,568 |
| 2 | B | 12,080,774 | 13,793,423 | 48,035,822 | 1,054,378 |
| 2 | C | 6,811,186 | 7,965,042 | 20,101,961 | 504,568 |
| 2 | A | 45,487,105 | 63,601,096 | 171,179,557 | 3,025,122 |
| 3 | C | 7,476,700 | 10,017,031 | 20,360,817 | 504,568 |
| 3 | A | 47,333,472 | 66,951,580 | 124,721,736 | 3,025,122 |
| 3 | B | 12,515,572 | 17,193,704 | 44,449,172 | 1,054,378 |
| 4 | A | 43,544,065 | 60,636,267 | 107,271,312 | 3,025,122 |
| 4 | C | 7,428,869 | 10,844,080 | 30,569,216 | 504,568 |
| 4 | B | 12,386,188 | 16,297,944 | 42,698,950 | 1,054,378 |
| 5 | B | 12,126,067 | 14,327,128 | 43,334,098 | 1,054,378 |
| 5 | A | 44,930,948 | 68,404,832 | 127,641,668 | 3,025,122 |
| 5 | C | 6,653,417 | 7,978,465 | 18,264,271 | 504,568 |

### NativeAOT process medians

| Metric | A | B | C |
|---|---:|---:|---:|
| Frame P50 ns | 44,930,948 | 12,126,067 | 6,811,186 |
| Frame P95 ns | 63,601,096 | 14,327,128 | 7,978,465 |
| Frame max ns | 124,721,736 | 43,334,098 | 20,101,961 |
| Managed B/frame | 3,025,122 | 1,054,378 | 504,568 |
| Profile total ms | 48.275 | 11.296 | 6.706 |
| Tree ms | 2.831 | 2.284 | 0.396 |
| Reconcile ms | 2.387 | 1.915 | 0.326 |
| Build ms | 0.610 | 0.466 | 0.085 |
| Diff ms | 1.185 | 0.880 | 0.147 |
| Style ms | 0.632 | 0.573 | 0.105 |
| Input Tree ms | 0.440 | 0.372 | 0.066 |
| Render ms | 45.036 | 9.042 | 6.308 |
| Paint ms | 44.916 | 8.957 | 6.230 |
| Target begin ms | 0.076 | 0.058 | 0.052 |
| Present ms | 0.039 | 0.026 | 0.025 |
| Stock Cell Builds | 1,077,436 | 1,077,436 | 189,818 |
| Mounted Cells | 4,900 | 4,900 | 989 |
| Text layout requests | 4,900 | 800 | 800 |
| Exact text culls | 0 | 4,100 | 61 |
| Driver heap usage B | 93,253,632 | 63,893,504 | 63,893,504 |
| Vulkan object allocations | 642 | 642 | 642 |
| Vulkan device-memory allocations | 8 | 8 | 8 |

Every full process closed with zero live Vulkan objects and zero live Vulkan device-memory bytes. Every process reported 262,144 peak text-atlas resident bytes and zero peak image resident bytes.

### NativeAOT measured deltas

| Comparison | Metric | Reduction |
|---|---|---:|
| B versus A | P50 | 73.012% |
| B versus A | P95 | 77.473% |
| B versus A | Allocation | 65.146% |
| B versus A | Paint | 80.058% |
| C versus B | P50 | 43.830% |
| C versus B | P95 | 44.312% |
| C versus B | Allocation | 52.145% |
| C versus B | Tree | 82.662% |
| C versus A | P95 | 87.455% |

### NativeAOT raw log hashes

| Round | Arm | SHA-256 | Bytes |
|---:|---|---|---:|
| 1 | A | `4a606854ed7c3fce492d819b7c5486749bef1c0e339251abe5e99d7a3f5e30a6` | 276,508 |
| 1 | B | `4c8f84dbf5e23dbf10e5548de92520d6435d1ad9fc30c39014cd9bf3f3d1cb1c` | 276,317 |
| 1 | C | `c9b27b44439dbbb0737cb74ed5a0c688854e97ebdc0ed54f850bedcc7a280b4b` | 276,135 |
| 2 | B | `518f50b853c394c514b7704144734fc38862b6f0ca8ec0f3f27f21173cf6ceaa` | 276,329 |
| 2 | C | `9d7bfb09e4f68e462f64b32a0443a5881430a48040feb3160e1456e3abaccd82` | 276,171 |
| 2 | A | `b61783f706c9c01f9dcc0bec2a3a83cba45626bd5c384c7ce7b076e7dc3bf224` | 276,544 |
| 3 | C | `dd8bfc236a8cf3277d3ddce995134e02d4227b5f9e38e5fa24bea0f035f82a73` | 276,228 |
| 3 | A | `ef3de5e823cc3c4d8e7bcfa78e22f85406c7bb732e995a37131c50b843235ff0` | 276,545 |
| 3 | B | `18af1ff3ecea046ba79190257ffd5fd51be09c043d83d21d5f62946e495c8ddd` | 276,343 |
| 4 | A | `960f9080f4b72c3af3ec138e563744a8d184f4525c3759194ae893e521e0d240` | 276,471 |
| 4 | C | `2d61dbf7fa5afa62d2d4985e621cd9526b23cccf7b72867eaa5056d973c74c53` | 276,146 |
| 4 | B | `b0b7bb84aeb04d5515f189005497b756aab5c2bb29de148e04d19a5137537b7c` | 276,345 |
| 5 | B | `14e6f3096e3fbd0f4314ac7743ec2ba95b2881835db64cf789efea4b16074e4c` | 276,268 |
| 5 | A | `4285d918534f4f26fb5d0ed3353b1d5b62bbabcc815ccc150d29828e6511524e` | 276,520 |
| 5 | C | `80055e77c6c58fa6be03bbbafb6ababffeb1963dbb0bef09478f53373923bc1e` | 276,095 |

## Vulkan validation

The workstation did not have `VK_LAYER_KHRONOS_validation` installed. The official Arch `vulkan-validation-layers` 1.4.357.0-1 package was extracted under `/tmp` without changing the system installation. `VK_LAYER_PATH` and `LD_LIBRARY_PATH` selected that local layer.

Both NativeAOT gates completed with exit code 0 and zero validation errors:

| Gate | Result | SHA-256 | Bytes |
|---|---|---|---:|
| Exact clipped text | `exact_outside=1 partial_full_shape=1 mutation_reveal=1 fallback=1 pixel_equality=1 resize=1 close=1` | `28c4538c00277792b520800c973952f2d007bd83f0119c11d1b576e1659c3430` | 129 |
| StocksGrid virtualization | `cull_modes=2 stops=9 explicit_clip=1 complete=4900 virtual_pool=989 zero_overscan=1 mutation=1 stale_slot=1 uniqueness=1 churn=1 resize=1 close=1` | `a899f300242ad8f59b442d960edb3ac7868d63ac4c0b7fd7609af163d0a61dee` | 1,130,529 |

## Sustained lifetime

One additional NativeAOT C process used 300 warmup frames and 2,000 measured frames while `/proc` RSS was sampled every 200 ms.

- Exit code: 0
- Runtime: 17.03 seconds
- RSS samples: 85
- Post-load first-quartile median: 267,164 KiB
- Post-load final-quartile median: 243,196 KiB
- Last-half linear slope: -141.55 KiB/s
- Final driver heap usage: 63,893,504 B
- Final Vulkan object allocations: 642
- Final Vulkan device-memory allocations: 8
- Live Vulkan objects after close: 0
- Live Vulkan device-memory bytes after close: 0
- Peak text-atlas resident bytes: 262,144
- Raw log SHA-256: `3306cf030d89377128038b70aa61c37bc0e749d42c4b550508c45a4a35b37c83`
- Raw log bytes: 276,094

The five full C processes and the sustained process reported identical Vulkan creation counts, driver heap usage, and text-atlas peak. RSS fell after collection and remained below its post-load first-half level. This passes the StocksGrid sustained memory and resource plateau check.

## Q10 state

The final Vulkan workloads used five isolated Release NativeAOT processes per
workload, 300 warmups, 2,000 measured frames, fixed 1/60-second updates, the KDE
Wayland compositor, and the NVIDIA ICD on the RTX 3080. Every measured frame
submitted and presented exactly once. Every process added zero warm Vulkan
objects and zero device-memory allocations.

The earlier Weston Pixman matrix selected the Lavapipe CPU ICD. Its raw logs
remain in the artifact directory, but it is not hardware evidence and is not the
final Q10 matrix.

| Workload | CPU P50 | CPU P95 | CPU P99 | CPU worst | GPU P95 | Managed B/frame |
|---|---:|---:|---:|---:|---:|---:|
| 100,000-row, 12-column table | 1.247 ms | 1.531 ms | 3.151 ms | 5.825 ms | 0.305 ms | 322,168 |
| 5,000-node, 15,000-edge topology | 1.641 ms | 2.309 ms | 4.171 ms | 9.457 ms | 0.161 ms | 462,576 |
| One-of-1,000 box mutation | 1.625 ms | 2.106 ms | 2.398 ms | 4.064 ms | 0.010 ms | 512,568 |
| Full 1,000-box mutation | 3.749 ms | 4.471 ms | 5.399 ms | 7.481 ms | 0.077 ms | 512,568 |

The table mounts 45 physical rows for 1.2 million logical cells, scrolls 17 rows
per frame, and mutates ten seeded visible cells. Topology keeps at most 400 of
5,000 nodes and only edges whose endpoints are visible. All four workloads
remain under the 8.33 ms CPU/GPU P95 and 16.67 ms CPU P99 limits.

Managed retained memory is collected outside measured frame timing with a full
collection at both boundaries. Hardware devices create material and clip-mask
pipelines on first use to avoid compiler state for unused draw kinds. CPU
physical devices retain eager materialization so the complete cold effects route
remains bounded.

| Workload | Metric | Reconstructed Skia | Current Vulkan | Change |
|---|---|---:|---:|---:|
| Table | Managed retained end | 7,451,904 B | 4,292,760 B | -42.394% |
| Table | Working-set peak | 345,436,160 B | 218,521,600 B | -36.740% |
| Table | Private-dirty end | 100,642,816 B | 65,499,136 B | -34.919% |
| Table | Whole-device GPU memory max | 3,568 MiB | 3,894 MiB | +9.137% |
| Topology | Managed retained end | 11,566,032 B | 7,620,672 B | -34.112% |
| Topology | Working-set peak | 382,742,528 B | 247,431,168 B | -35.353% |
| Topology | Private-dirty end | 118,231,040 B | 66,875,392 B | -43.437% |
| Topology | Whole-device GPU memory max | 3,559 MiB | 3,919 MiB | +10.115% |

Retained managed memory, working-set peak, and private-dirty memory are below the
reconstructed control. Full Q10 memory does not pass. The control has no
comparable Goo-reserved GPU-memory metric, and the non-attributable whole-device
proxy differs by more than five percent. Table and topology CPU P95 are 64.957
and 67.874 percent lower than that control. Current process-group median power
P50 was 162.10 W for table, 160.94 W for topology, 149.32 W for sparse mutation,
and 119.50 W for full mutation. Power remains an external whole-device proxy,
not process attribution.

No canonical table, topology, or qualifying binary/package result was recorded
before Skia removal. The temporary NativeAOT control uses frozen Skia product
commit `9d285338575da99a4f26f059311aa783c2e0b742`; it remains useful reconstructed
evidence, not the missing accepted record. The current NVIDIA effects/COLR and
rounded-overflow pixel routes pass 3 of 3 processes each. The manifest expansion
below records seven of eight current Linux final-protocol rows as before-state
evidence. At that time, full Q10 exit remained open on the blocked resize-DPI row,
accepted baseline provenance, comparable Goo-reserved GPU-memory evidence,
real SDL acceptance and display-feedback evidence for the complete manifest,
clean-source evidence, and Windows evidence.

The current NativeAOT binary is 5,708,704 bytes with SHA-256
`50595ae3be03c22fb42c1adea40801d5a511718f6acdda1ec0622a603eb4171f`.
Exact per-process lines, raw-log hashes, time bounds, memory counters, GC pause
totals, and power samples are in `artifacts/reports/s15-q10/summary.json`.

The separate isolated 60-second NativeAOT true-idle run passes zero rebuild,
layout, plan, upload, record, submit, present, managed allocation, Vulkan object
allocation, and device-memory allocation at a median 0.1078 percent of one core. The
three-window lifecycle gate also passes 1,000 operations, ten surface losses,
three device losses, primitive/text reconstruction, warm slot reuse, recovered
text, independent close, and zero validation errors.

## Q10 manifest expansion

The 2026-08-24 manifest expansion used the final dirty source tree and the
published NativeAOT binary recorded in `artifacts/reports/s15-q10/summary.json`.
The protocol was five isolated NVIDIA processes per workload, 300 warmup frames,
2,000 measured frames, fixed 1/60-second updates, Vulkan on `wayland-0`, and the
RTX 3080 with driver 610.57.04. The final binary is 5,708,704 bytes with SHA-256
`50595ae3be03c22fb42c1adea40801d5a511718f6acdda1ec0622a603eb4171f`.
This section is retained as the 2026-08-24 before-state evidence. The follow-up below does not replace its binary identity or measurements.

Seven of the eight official manifest workloads have current Linux final-protocol
rows. The four expansion workloads below passed all five processes, their exact
local contracts, and their absolute CPU/GPU budgets: 20 of 20 processes and
40,000 measured frames.

Times are process medians. CPU and GPU values are milliseconds.

| Workload | CPU P50 | CPU P95 | CPU P99 | GPU P95 | Result |
|---|---:|---:|---:|---:|---|
| Small animation | 0.528 | 0.610 | 0.853 | 0.026 | Pass |
| Text editing | 1.202 | 1.321 | 1.504 | 0.096 | Pass; recorded-baseline regression |
| Image effects | 5.283 | 6.001 | 7.690 | 0.934 | Pass |
| Three-window | 0.648 | 1.463 | 1.652 | 0.022 | Pass |

The three-window global submit/present delta is 2,033: 2,000 selected-window
frames plus 33 actual focus-loss dirty renders. Clean local frame slots remain
unchanged, and clean windows do not submit or present. This accounting is
intentional and is part of the exact route contract.

The special true-idle route used five isolated nested-KWin scale-1 processes for
60 seconds. Every process recorded zero rebuild, layout, plan, upload, record,
submit, present, managed allocation, Vulkan object allocation, and device-memory
allocation. The median CPU use was 0.1078 percent of one core.

The accepted recorded Skia text-editing P95 is 0.461491 ms. Current NVIDIA Vulkan
text editing is 1.320821 ms at P95, a 186.207 percent regression. Its P50 managed
allocation is 63,184 B versus the recorded 88,008 B baseline, a 28.207 percent
reduction. The allocation reduction does not qualify the latency regression away.

At the 2026-08-24 before-state checkpoint, resize/DPI was blocked while returning
to state 0 at frame 60. Historical failure evidence is
`artifacts/reports/s15-q10/manifest-final-nvidia-resize-dpi-blocked.log`
(`SHA-256 9e4bec16e1113457def15b9fed348abb2e5f190fa59a33312d5eda2490a151ae`).
The 2026-08-25 resize-DPI closure below supersedes that status.

## 2026-08-25 resize-DPI closure

The lost-retry correction was republished as a 5,803,424-byte NativeAOT binary
with SHA-256
`3df995cdd4231d569b1c0546e118b0b47dd45307f9df66debeb90a8a1f0e6d60`.
Five isolated processes ran under the direct KWin scale-1 wrapper with 300
warmups and 2,000 measured frames. Every process completed the repeated 1.0,
1.5, and 2.0 active-swapchain cycle, returned to state 0, submitted and
presented exactly 2,000 measured frames, used both frame slots, reported zero
validation, result, and fatal failures, closed cleanly, and restored output
scale 1.5.

Process-median CPU P50/P95/P99 was
`0.137319/1.618522/2.430012 ms`; GPU Main P95 was `0.113664 ms`.
The P95 and P99 absolute frame budgets pass. Raw logs are
`artifacts/reports/s15-q10/resize-dpi-final-run-{1..5}.log`; their hashes and
the aggregate counters are recorded in
`artifacts/reports/s15-q10/summary.json` and
`artifacts/reports/deterministic-kwin-scale-one.json`.

This closes the current Linux resize-DPI product blocker and records eight of
eight current Linux workload rows. It does not claim clean-source, Windows,
actual SDL acceptance, presentation feedback, accepted baseline, attributable
GPU-memory, or package qualification.

Raw per-process evidence is under
`artifacts/reports/s15-q10/summary.json` and the `manifest-final-*` logs. The
summary records `source_dirty: true`; this section makes no clean-source or full
Q10 claim.

## 2026-08-24 text fast-hit and image-effects follow-up

This dated follow-up uses the dirty `gaps-and-reductions` source tree. It records
the current text fast-hit result and a separate image-effects component
diagnosis. The 2026-08-24 manifest expansion above remains the before-state
record. Its 1.320821 ms text P95 is not silently replaced.

### Text editing fast hit

The mechanism is an exact per-node retained-segment fast hit for `Text` and
`TextEditor` only. `VulkanTextScene` reuses a positional
`VulkanRetainedTextSegment` when the `ShapedText` reference, font size, line
origin and baseline, packed color, effect mode and parameters, composed parent
transform, active clip chain, and atlas generation match exactly. Each run
retains its maximum normal/effect `ByteRangeEnd`; a hit marks the atlas active
and verifies that bound against the published atlas prefix. The renderer caches
the full run/glyph structural proof by segment version and atlas generation,
while retaining per-reference validation and a required per-run `Resolve` on
every cached prepass. `VulkanTextFrameData` then reuses slot-local records and
copies only dirty ranges.

`TextEntry` remains on full segment generation and full renderer validation
because cached Entry proof repeatedly lost S17 protected-mask pixels. The active
cache remains strong across atlas publication for the same reason. A repository
search found no in-place shaped payload writer, so the fast hit relies on
shape-reference identity. No public Goo API changed.

The follow-up used five isolated NativeAOT processes on NVIDIA Vulkan at
`wayland-0`, with 300 warmup frames, 2,000 measured frames, fixed 1/60-second
updates (`0.016666666666666666` delta), and the Revision 2, 1 MiB UTF-8 corpus
with 32 visible lines, 96-byte full lines, a 64-byte final line, and one
character edit. The source was dirty. Every process exited 0 with zero
validation errors, zero result failures, and fatal code 0.

The follow-up binary is 5,708,704 bytes with SHA-256
`7751034df36fd2f83db3ef13a175728fddc03f8d875100b05b1b325149324065`.

| Metric | Five-process median |
|---|---:|
| CPU P50 | 0.497938 ms |
| CPU P95 | 0.552471 ms |
| CPU P99 | 0.701151 ms |
| GPU P95 | 0.054272 ms |
| Managed allocation P50 | 63,184 B |

The prior current Vulkan medians are retained as before-state evidence. The
follow-up reductions are:

| Metric | Prior current | Follow-up | Reduction |
|---|---:|---:|---:|
| CPU P50 | 1.201987 ms | 0.497938 ms | 58.574% |
| CPU P95 | 1.320821 ms | 0.552471 ms | 58.172% |
| CPU P99 | 1.504447 ms | 0.701151 ms | 53.395% |
| Managed allocation P50 | 63,184 B | 63,184 B | 0.000% |

The follow-up passes the general frame gate and reduces prior Vulkan P50/P95/P99 by
`58.574%/58.172%/53.395%`. Its measured percentiles become the next Vulkan regression reference
after the clean-source matrix.

Raw evidence is `artifacts/reports/s15-q10/summary.json` under
`text_fast_hit_followup` and
`artifacts/reports/s15-q10/text-fast-hit-final-run-*.log`. The correctness
record has five process exits of 0, zero validation errors, zero result
failures, and fatal code 0 for every process. The same summary records the
NativeAOT protected-text, text-transport, and text-viewport-cull correctness
gates as true. This follow-up does not qualify resize-DPI or claim full Q10.

### Image-effects component diagnosis

This is **JIT TestRelease diagnostic evidence only**, not official NativeAOT
qualification. The isolation used 300 warmups and 480 measured frames per
variant.

| Isolation | CPU P50 | Layout | Paint | Managed allocation P50 |
|---|---:|---:|---:|---:|
| Full current | 5.471426 ms | 1.210 ms | 3.530 ms | 690,568 B |
| Static scene | 3.533135 ms | 0.000 ms | 3.366 ms | 103,760 B |
| Eight effect mutations only | 4.759018 ms | 1.194 ms | 3.355 ms | 162,848 B |
| One image replacement only | 5.254411 ms | 1.077 ms | 3.529 ms | 652,232 B |
| Full without non-normal blend | 5.456443 ms | 1.256 ms | 3.465 ms | 690,568 B |

Source-grounded findings:

- The full scene has 256 image cards and 1,316 draws. The dominant CPU cost is
  the full scene compile/record path, not the eight blend layers.
- Removing all eight non-normal blend layers changed P50 by only -0.015 ms in
  this isolation. This does not identify an image or blend fix.
- One same-size provider replacement incurs 1.077 ms of layout because
  `ImageLayouts.Refresh` marks Yoga dirty whenever `DecodedImage` identity
  changes today, even when the dimensions remain 256 by 256.
- `S15Q10ImageEffectsPixels` pixel generation plus the `ImageSource` immutable
  copy creates two 262,144-byte arrays per replacement before renderer and tree
  allocation.
- Eight card mutations add about 1.226 ms P50 over the static route, dominated
  by tree and layout work.

Image work remains an identified optimization target. This isolation is not a
failed absolute image-effects gate, is not official NativeAOT qualification,
and does not approve or propose a public ownership API. No image fix is claimed.

## 2026-08-24 NativeAOT startup and synthetic input-injection latency follow-up

This dated follow-up records the Linux NativeAOT startup and synthetic input-injection
latency route on the dirty `gaps-and-reductions` source tree. It adds no public Goo
API and does not make a full-Q10 claim.

### Implementation mechanism and observation contract

`GOO_NATIVE_S15_Q10_LATENCY_GATE=1` selects this internal TestRelease fixture route.
The program captures a managed-entry `Stopwatch` timestamp before opening the window.
The fixture then installs an internal presentation-latency sink and associates one
pending token with each startup or input frame. `VulkanPresentationRetirement`
attaches that token to the next present ID. The handoff timestamp is taken after
successful `vkQueuePresentKHR` completion.

For each input sample, `WindowReadbackFixture` records the injection timestamp,
queues the requested pointer, key, or committed-text mutation, and forces one
render. The synthetic route uses `S17QueuePointerPress`/`S17QueuePointerRelease`,
`S17QueueKeyPress`/`S17QueueKeyRelease`, or `QueueText`. It bypasses SDL polling.
When `VK_EXT_swapchain_maintenance1` present-fence support is available, later
UI-thread polling observes the present fence and emits the completion timestamp.
That timestamp is named `*_completion_observed_upper` because polling occurs after
the signal.

### Protocol and correctness

- Five fresh Release NativeAOT processes ran on the NVIDIA GeForce RTX 3080 over
  `wayland-0` with Vulkan.
- Each process used 300 warmup frames and 2,000 input samples. The input sequence
  contained 667 pointer injections, 667 key injections, and 666 committed text
  injections.
- Every process exited 0 with zero validation errors, zero result failures, and
  fatal code 0. Present-fence support was true.
- Each process produced `startup_sample_count=1`, `input_sample_count=2000`,
  `callbacks_total=2001`, `callbacks_unique=2001` (2,001 unique tokens),
  `input_submit_delta=2000`, and `input_present_delta=2000`. Warmup submit and
  present deltas were exactly 300.
- The correctness record reports `all_processes_exit_zero=true`,
  `all_validation_zero=true`, `all_result_failures_zero=true`,
  `all_fatal_zero=true`, `all_tokens_unique_complete=true`,
  `all_submit_present_exact=true`, and
  `present_completion_callback_order_not_assumed=true`.

### Five-process medians

The source metrics are nanoseconds. Millisecond values below are exact decimal
conversions of those values.

| Exact metric | Five-process median |
|---|---:|
| `managed_entry_to_present_handoff_ns` | 226193175 ns (226.193175 ms) |
| `window_open_to_present_handoff_ns` | 225551726 ns (225.551726 ms) |
| `managed_entry_to_present_completion_observed_upper_ns` | 226218353 ns (226.218353 ms) |
| `window_open_to_present_completion_observed_upper_ns` | 225576904 ns (225.576904 ms) |
| `input_injection_to_present_handoff_p50_ns` | 381620 ns (0.381620 ms) |
| `input_injection_to_present_handoff_p95_ns` | 1348723 ns (1.348723 ms) |
| `input_injection_to_present_handoff_p99_ns` | 1625866 ns (1.625866 ms) |
| `input_injection_to_present_handoff_worst_ns` | 1974053 ns (1.974053 ms) |
| `input_injection_to_present_completion_observed_upper_p50_ns` | 1571202 ns (1.571202 ms) |
| `input_injection_to_present_completion_observed_upper_p95_ns` | 6193419 ns (6.193419 ms) |
| `input_injection_to_present_completion_observed_upper_p99_ns` | 7986581 ns (7.986581 ms) |
| `input_injection_to_present_completion_observed_upper_worst_ns` | 21262635 ns (21.262635 ms) |

### Per-kind handoff medians

Kinds are `1=pointer injection`, `2=key injection`, and `3=committed text
injection`.

| Input kind | Count | P50 | P95 | P99 |
|---|---:|---:|---:|---:|
| Pointer, kind 1 | `input_injection_to_present_handoff_kind1_count=667` | `input_injection_to_present_handoff_kind1_p50_ns=346123` (0.346123 ms) | `input_injection_to_present_handoff_kind1_p95_ns=476438` (0.476438 ms) | `input_injection_to_present_handoff_kind1_p99_ns=529628` (0.529628 ms) |
| Key, kind 2 | `input_injection_to_present_handoff_kind2_count=667` | `input_injection_to_present_handoff_kind2_p50_ns=339610` (0.339610 ms) | `input_injection_to_present_handoff_kind2_p95_ns=461310` (0.461310 ms) | `input_injection_to_present_handoff_kind2_p99_ns=518588` (0.518588 ms) |
| Committed text, kind 3 | `input_injection_to_present_handoff_kind3_count=666` | `input_injection_to_present_handoff_kind3_p50_ns=747760` (0.747760 ms) | `input_injection_to_present_handoff_kind3_p95_ns=1567176` (1.567176 ms) | `input_injection_to_present_handoff_kind3_p99_ns=1711557` (1.711557 ms) |

### Gate arithmetic

The handoff gate is `input_handoff_p95_gate_ns=37333334`. It is two 60 Hz
intervals plus 4 ms:

```text
ceil(2 * 1,000,000,000 / 60 + 4,000,000)
= 37,333,334 ns
= 37.333334 ms
```

The measured value is
`input_injection_to_present_handoff_p95_ns=1348723`, so the comparison is
`1,348,723 ns <= 37,333,334 ns`, with a 35,984,611 ns (35.984611 ms) margin.
The recorded result is `pass=true`. The completion-observed route is explicitly
not part of this gate: `completion_observed_upper_is_not_gated=true`.

### Callback ordering

Completion callbacks can arrive out of token order. The sink stores each sample
at its token index, rejects duplicate or overwritten slots, and validates the
complete token set after settlement. It does not use callback arrival order for
the latency arrays. Present IDs and handoff timestamps are checked as monotonic
by token. The five runs recorded
`completion_callbacks_out_of_order` values of 195, 204, 215, 203, and 224,
while every run retained `callbacks_total=2001`, `callbacks_unique=2001`,
`duplicate_tokens=0`, `overwritten_tokens=0`, and `missing_tokens=0`.

### Binary and raw evidence

The published binary was `/tmp/goo-q10-latency-aot/Goo.Tests`, 5,733,280 bytes,
with SHA-256
`d0c6a3968681fd0a2675aaf7c6d45c9ba40c8597d131401b5a918e6346047bc6`.
Raw evidence is `artifacts/reports/s15-q10/summary.json`, under the
`latency_followup` key, and
`artifacts/reports/s15-q10/latency-final-run-*.log`.

### 2026-08-25 qualification reconciliation

The five startup samples were already independent cold NativeAOT processes. Applying the repository's
nearest-rank percentile rule closes the current-route first-usable-frame gate. The startup frame has
positive metrics, a mounted invariant root, one submit/present, one present-fence observation, and a
successful non-background readback. P95 is `255.212748 ms` from managed entry and `252.771895 ms`
from `Window.Open` to successful `vkQueuePresentKHR` handoff. Completion-observed upper-bound P95 is
`255.238026/252.797173 ms`. No prior Vulkan startup reference existed, so this result establishes it.

A separate Khronos-validation gate pushes pointer, key A, and committed UTF-8 `é` through
`SDL_PushEvent`, then consumes them only through product `SdlRuntime.PumpEvents` and
`SdlHost.Dispatch`. It reports `sdl_poll=1 pointer=1 key=1 text=1 submit=3 present=3 close=1`
with exact callback isolation and cleanup. Direct Wayland presentation feedback and display scanout
remain unmeasured, but S16-D03 explicitly defers that mechanism and accepts nominal display refresh
until a supported feedback path is available or cadence fails.

### Clean-source eight-workload closure

Commit `6d4d92e8b0046d51cc5520caa3fccd048d367332` supplied one 5,815,728-byte NativeAOT binary
with SHA-256 `78a459e81fab78630bdd3372454643fed6d79e366879ba4a138281aa0b08aff3`.
All 40 workload processes pass. Five isolated true-idle processes report zero UI/GPU work or
allocation at median `0.0997%` of one core. Clean validation passes API 10/10, core behavior 262/262,
the 2,000-sample stage route, seven package Wayland lanes, release validation, package default/window
smokes, and package-consumer NativeAOT. The package is `3,783,856` bytes and the validated bundle is
`10,087,660` bytes with exactly three native payloads.

Canonical evidence is `artifacts/reports/s15-q10/clean-linux-6d4d92e-summary.json`; every raw log,
package, bundle, binary, and source archive hash is in
`artifacts/reports/s15-q10/clean-linux-6d4d92e-SHA256SUMS`.

## 2026-08-24 S07 Effects/Offscreen GPU timestamp qualification

The Linux S07 implementation keeps the existing Upload and Main timestamps and
adds Effects and Offscreen scopes around the actual pass command ranges. Main and
Upload remain scope-0 wrappers. The fixed diagnostics query pool is 2 frame
slots x 4 stages x 16 scopes x 2 queries = 256 queries. Effects covers 8
backdrop copies and 8 composites. Offscreen covers 8 layer subtree passes.
Stage resolution is asynchronous and fence-owned. No wait-bit query is used.

### Final validation-layer protocol

The final route used five fresh NativeAOT processes on an NVIDIA RTX 3080 with
driver 610.57.04 on `wayland-0`. The workload was `image-effects`, with 300
warmup frames and 2,000 measured samples per process. All five processes exited
0. Every frame reported Effects `scopeCount=16` and Offscreen `scopeCount=8`,
with zero drops, exact completed-frame correlation, zero warm Vulkan object and
device-memory allocations, and clean validation.

| Stage | P50 ns | P95 ns | P99 ns | Worst ns |
|---|---:|---:|---:|---:|
| Effects | 207872 | 218112 | 948224 | 1359872 |
| Offscreen | 73728 | 77824 | 79872 | 404480 |

The NativeAOT binary was `5,757,936` bytes with SHA-256
`57aeae31abc6214c770f643695a3c407a017cf7098c6691f2d0659f24a5a5c99`.
Raw logs are
`artifacts/reports/s15-q10/stage-timestamp-final-run-{1..5}.log`.

### Canonical dynamic Q10 diagnostic overhead

The canonical dynamic Q10 five-process route after instrumentation reported:

| Metric | P50 ns | P95 ns | P99 ns |
|---|---:|---:|---:|
| CPU | 5151040 | 5816795 | 7675581 |
| GPU Main | 1553408 | 2023424 | 2296832 |
| Accepted pre-stage GPU Main | 846848 | 933888 | 946176 |

The diagnostics-enabled GPU Main query-write tax is
`+83.434%/+116.667%/+142.749%` at P50/P95/P99. This is an explicit
diagnostics-enabled query-write tax, not an unqualified production regression.
Disabled diagnostics still create no query pool or timestamp commands, so the
measured GPU query-write tax does not apply when diagnostics are disabled.
Raw logs are
`artifacts/reports/s15-q10/stage-timestamp-q10-final-run-{1..5}.log`.

### T03, T04, and JIT integration

The T03 stage gate passed the exact per-frame scope and drop checks above. The
T04 FailedIdle validation run passed 1,000 operations, 10 surface losses, and
3 device losses. After final device recovery it emitted `stage_timestamps=1`
following a positive Effects event and a successful Offscreen event.
Sub-resolution Offscreen durations may quantize to zero. The JIT validation
stage gate also passed 2,000 samples. The existing
`artifacts/reports/s15-q10/summary.json` contains `stage_timestamp_followup`.

### Evidence limits

This completes the local Linux S07 implementation and T03/T04 integration only.
Windows repeat remains open. GPU stage timestamps do not measure actual display
presentation. Actual SDL acceptance and Wayland presentation-time/display
feedback remain open.

## Repository verification

| Command or gate | Exit | Result |
|---|---:|---|
| `dotnet build Goo/Goo.gsproj -c Release -p:TreatWarningsAsErrors=true` | 0 | 0 warnings and 0 errors |
| AsyncReadback Release rebuild with test fixtures and warnings as errors | 0 | 0 warnings and 0 errors |
| `dotnet test tests/Goo.ApiContractTests/Goo.ApiContractTests.csproj -c Release` | 0 | 10 passed, 0 failed, 0 skipped |
| `dotnet test tests/Goo.CoreBehaviorTests/Goo.CoreBehaviorTests.csproj -c Release` | 0 | 261 passed, 0 failed, 0 skipped |
| Default async readback with Khronos validation | 0 | cleanup and close pass |
| Exact clipped-text gate with Khronos validation | 0 | `exact_outside=1 partial_full_shape=1 mutation_reveal=1 fallback=1 pixel_equality=1 resize=1 close=1` |
| Text transport gate with Khronos validation | 0 | warm zero-write reuse, one dirty range, close |
| StocksGrid virtualization gate with Khronos validation | 0 | `cull_modes=2 stops=9 complete=4900 virtual_pool=989 mutation=1 resize=1 close=1` |
| Failed-idle lifecycle with Khronos validation | 0 | 1,000 operations, 10 surface losses, 3 device losses, S15 slot/rebuild/reuse/close tokens |
| Five-process validation-layer stage timestamp route | 0 | Effects P50/P95/P99/Worst `207872/218112/948224/1359872 ns`; Offscreen `73728/77824/79872/404480 ns`; scopeCount 16/8, zero drops, exact completed-frame correlation, zero warm Vulkan allocations, validation clean |
| Canonical dynamic Q10 stage-timestamp route | 0 | CPU `5151040/5816795/7675581 ns`; GPU Main `1553408/2023424/2296832 ns`; diagnostics-enabled tax `+83.434%/+116.667%/+142.749%`; raw logs recorded |
| T04 post-recovery stage timestamp proof | 0 | FailedIdle passed 1,000 operations, 10 surface losses, 3 device losses, then emitted `stage_timestamps=1` after a positive Effects event and a successful Offscreen event; sub-resolution Offscreen durations may be zero |
| JIT 2,000-sample stage timestamp gate | 0 | Pass |
| Five-process actual-NVIDIA NativeAOT S15 matrix | 0 | 20 of 20 processes and 40,000 measured frames passed |
| Q10 manifest expansion final binary | n/a | 5,708,704 bytes; SHA-256 `50595ae3be03c22fb42c1adea40801d5a511718f6acdda1ec0622a603eb4171f` |
| Q10 manifest expansion process result | 0 | 20 of 20 processes and 40,000 measured frames passed exact local contracts and absolute budgets |
| Three-window focus-loss accounting | 0 | Global submit/present delta 2,033 = 2,000 selected frames + 33 actual focus-loss dirty renders; clean local slots unchanged |
| Five-process nested-KWin true-idle route | 0 | Five 60-second processes passed; zero work/allocation; median 0.1078% of one core |
| Text-editing prior Vulkan result | n/a | P50/P95/P99 `1.201987/1.320821/1.504447 ms` |
| Text-editing fast-hit follow-up | 0 | Five NativeAOT processes passed; CPU P50/P95/P99 `0.497938/0.552471/0.701151 ms`, GPU P95 `0.054272 ms`, allocation P50 `63,184 B`; Vulkan P95 improved `58.172%` |
| Five-process synthetic input-injection latency route | 0 | NativeAOT startup and input handoff gate pass; completion-observed values are upper bounds; native SDL acceptance passes separately |
| Five-process resize/DPI follow-up | 0 | Five NativeAOT processes passed repeated 1.0/1.5/2.0 active-swapchain cycles; CPU median P50/P95/P99 `0.137319/1.618522/2.430012 ms`; GPU P95 `0.113664 ms`; exact submit/present, both slots, diagnostics, close, and scale restore |
| Clean-source Linux Q10 matrix | 0 | 8 of 8 rows and all 40 processes pass from commit `6d4d92e` with one NativeAOT binary and exact hashes |
| Clean-source Vulkan memory reference | 0 | Current managed, RSS, private-dirty, and Goo-accounted Vulkan values recorded in the clean matrix |
| Clean-source Vulkan distribution reference | 0 | Package, bundle, Q10 NativeAOT, package-consumer NativeAOT, native payloads, and hashes recorded |
| Historical cross-renderer data | n/a | Archived only; nongating and noncomparable |
| Current NVIDIA S14 effects gate | 0 | COLR route passes 3 of 3 processes |
| Current NVIDIA S14 rounded-overflow gate | 0 | `rounded_text` route passes 3 of 3 processes |
| Both S14 pixel routes with `__GL_SHADER_DISK_CACHE=0` | 0 | Effects/COLR and rounded-overflow pass with the shader disk cache disabled |
| Protected-text gate | 0 | NVIDIA passes 3/3, CPU Lavapipe passes; grapheme masking, visual geometry, clipboard, IME, semantics, close |
| `git diff --check` | 0 | No output |

The retained-damage gate remains compositor-sensitive. Headless Pixman does not
preserve swapchain image contents for the partial-damage oracle, while headless
GL stops releasing buffers after four forced frames. These environments
correctly take the full fallback or cannot finish that focused oracle. The
current S15 Q10 and lifecycle claims therefore use their dedicated isolated
routes and do not relabel the failed retained-damage environment as a pass.

The implementation adds no public Goo member and does not edit the active
approved API baseline.

## Qualification decision

Keep both implementation changes.

- Exact clipped-text culling passes focused and validation correctness and materially reduces text layout work, Paint time, allocation, P50, and P95 under JIT and NativeAOT.
- Consumer-owned StocksGrid virtualization stays within the 989-Cell bound, passes zero-overscan correctness and validation, and materially reduces Cell Builds, Tree work, allocation, P50, and P95 under JIT and NativeAOT.
- The sustained StocksGrid process shows bounded RSS and stable Vulkan creation counts.
- The Q10 manifest expansion records 20 of 20 NVIDIA NativeAOT processes and 40,000 measured frames passing the exact local contracts and absolute budgets for small animation, text editing, image effects, and three-window.
- The three-window extra 33 focus-loss dirty renders are accounted for explicitly. They do not change the clean-window or clean-slot contract.
- Five isolated nested-KWin scale-1 true-idle processes pass 60 seconds with zero work and allocation at a median 0.1078 percent of one core.
- Linux S07 Effects/Offscreen scopes and T03/T04 integration pass locally. The fixed query capacity, asynchronous fence-owned resolution, exact scope counts, zero-drop correlation, resource gate, and post-recovery proof are recorded above. Windows repeat remains open.
- The GPU Main increase is recorded as an explicit diagnostics-enabled query-write tax. Disabled diagnostics create no query pool or timestamp commands, so this is not an unqualified production regression.
- The dated Vulkan text fast-hit follow-up lowers P95 from `1.320821 ms` to `0.552471 ms`, a `58.172%` improvement, and establishes the next Vulkan regression reference.
- Five isolated direct-KWin resize-DPI processes now complete the repeated 1.0/1.5/2.0 active-swapchain cycle and return to state 0 after the lost-retry correction.
- Five independent NativeAOT startup processes establish first-usable-frame P95 at `255.212748 ms` from managed entry and `252.771895 ms` from `Window.Open`; the usable startup pixel and present-fence contracts pass.
- The focused native SDL gate passes pointer, key, and committed UTF-8 text through product polling and dispatch with exact submit/present, clean Khronos validation, cleanup, and close.
- The clean-source commit `6d4d92e` matrix passes all 40 workload processes, five zero-work true-idle processes, clean validation, package and NativeAOT consumer lanes, release validation, and exact provenance hashes.
- No second renderer, shaping, command-buffer, SSBO, or GPU-culling optimization is authorized by this qualification.
Local discrete-Linux implementation and qualification are complete. Wayland presentation feedback is deferred under S16-D03. Remaining work is external hardware only. This document makes no both-RID claim.
