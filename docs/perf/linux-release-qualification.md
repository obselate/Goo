# Linux release qualification

Goo is qualified on Linux x64 in a native Wayland session. Vulkan correctness runs use Khronos validation. Performance claims use actual NVIDIA hardware, never software Vulkan.

## Reference system

- Linux x64
- AMD Ryzen 7 3700X
- NVIDIA GeForce RTX 3080
- NVIDIA driver 610.57.04
- .NET 10
- Vulkan validation 1.4.357

## Current 0.5.0 candidate evidence

| Area | Result |
| --- | --- |
| Public API and documentation tests | 12 passed |
| Core behavior tests | 317 passed |
| Drag and drop regression groups | 8 passed |
| Native Vulkan gates | Queue wake and isolation, effect replacement and recovery, pending-readback close, clip capture, liquid alpha, vector quality, and image readback passed |
| Generated shaders | 18 checks passed with production and generated artifacts synchronized |
| Builds and source checks | Framework consumers built with zero warnings or errors; strict G# lint and diff checks passed |

The [non-UAT follow-up](non-uat-followup-2026-09-05.md) is the current integrated correctness and GPU report. Its final GPU timings disable validation and all discovered implicit Vulkan layers, use three fresh processes per case, and match 1,000 completed timestamp samples to frame IDs after 300 warmup frames. The 33-contour EvenOdd fallback Main P50 changed from 7.307 to 4.752 ms, and the 65-contour case changed from 27.335 to 17.592 ms. The larger case still exceeds a 16.67 ms frame budget. At 1920 by 1080, liquid and terminal glass Effects P50 measured 0.185 and 0.120 ms. Main includes the nested Effects scope, so those values must not be added.

The [all-Blob report](all-blobs-2026-09-05.md) records current per-element CPU, allocation, GPU, and draw behavior. The [post-checkpoint report](post-checkpoint-2026-09-05.md) records the retained style shortcut: the 1,000-Container full-update host-frame P50 changed from 3.012 to 2.694 ms with allocation unchanged. These are workload-specific results on the reference system, not general latency guarantees.

## Historical 0.3.0 package baseline

The values below belong to the published 0.3.0 qualification. They are retained for comparison and do not describe the pending 0.5.0 package artifacts.

| Area | Historical result |
| --- | --- |
| Official performance workloads | 8 of 8 passed |
| Text editing CPU P50/P95/P99 | 0.498 / 0.552 / 0.701 ms |
| True-idle CPU use | 0.0997% of one core |
| Warm managed allocation | 0 B where required |
| Warm Vulkan allocation | 0 objects and 0 device-memory allocations where required |
| Goo package | 3,826,694 bytes |
| Linux bundle | 10,162,146 bytes |
| Bundle native libraries | SDL3, HarfBuzz, hb-gpu |

The 0.5.0 package and bundle sizes must come from the exact release candidate produced by CI. Do not reuse the historical sizes as release metadata.

## Reproduce

The public CI workflow builds the library, regenerates documentation, runs portable Vulkan checks, runs API and behavior tests, packs Goo, publishes clean managed and NativeAOT package consumers, and validates the Linux bundle.

Hardware-only checks live in the focused projects documented in [`tests/README.md`](../../tests/README.md). Record the GPU, driver, runtime, warmup, and sample count with every result.

## Remaining qualification

- Windows x64 physical-GPU runtime
- Linux integrated GPU
- A second real display scale
- Physical macOS arm64 hardware

These open environments do not weaken the qualified Linux x64 result.
