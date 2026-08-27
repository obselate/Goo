# Vulkan shader effects P04 Linux

Date: 2026-08-21
Branch: `gaps-and-reductions`
Commit: `8354cebd872796f03d9aabb50a25657658ea39eb` plus dirty S20 work
Status: accepted on Linux

## Change

- Cache the immutable SDL native window handle when the Vulkan target is created.
- Read the immutable process UI-thread identity with `Volatile.Read` instead of taking the global SDL
  monitor for every main-thread guard. The existing SDL main-thread check and failure behavior remain.
- Do not enqueue an SDL wake when retained invalidation already runs on the UI thread. Background
  invalidation still wakes the scheduler.

These changes remove monitor inflation from changed-frame diagnostics, cursor maintenance, and shader
parameter invalidation. They add no public API.

## Configuration

- Linux 7.1.8-1-cachyos
- AMD Ryzen 7 3700X, 8 cores and 16 threads
- NVIDIA GeForce RTX 3080, driver 610.57.04
- Vulkan instance 1.4.357, device API 1.4.341
- Device UUID `9be224e6-73f9-e2db-e5aa-4932a59b2b57`
- .NET SDK 10.0.111
- Release NativeAOT, diagnostics enabled, VSync off
- 192 by 128 logical and framebuffer pixels, display scale 1
- Five isolated processes, 300 warm-up frames, 2,000 measured frames

## Shader-effect result

| Run | P50 | P95 | P99 | P99.9 | Worst | Managed allocation |
|---:|---:|---:|---:|---:|---:|---:|
| 1 | 188,245 ns | 255,271 ns | 311,036 ns | 448,736 ns | 1,997,374 ns | 0 B |
| 2 | 187,934 ns | 273,385 ns | 320,624 ns | 446,211 ns | 451,652 ns | 0 B |
| 3 | 190,799 ns | 350,651 ns | 3,059,157 ns | 7,447,708 ns | 9,363,790 ns | 0 B |
| 4 | 182,785 ns | 252,416 ns | 314,052 ns | 398,612 ns | 466,700 ns | 0 B |
| 5 | 173,547 ns | 246,575 ns | 309,874 ns | 490,214 ns | 1,775,417 ns | 0 B |
| Median | 187,934 ns | 255,271 ns | 314,052 ns | 448,736 ns | 1,775,417 ns | 0 B |

Every process also reported:

- 0 B allocation P95 and worst
- 0 warm Vulkan object creation
- 0 warm Vulkan device-memory allocation
- 2,000 plans and 2,000 command records
- 12,000 draws
- 2,000 layer passes and 2,000 layer composites

The one noisy third process remained within the 8.33 ms P95 and 16.67 ms P99 limits. No GPU
timestamp result was available, so this record makes no GPU-time claim.

## Existing-effects control

The unchanged S14 effects scene retained exactly 72 layer passes, 72 composites, 8 layer creations,
964 draws, 12 plans, 12 records, and 2 readbacks per process.

| Run | Wall | User CPU | System CPU |
|---:|---:|---:|---:|
| 1 | 0.828 s | 0.529 s | 0.283 s |
| 2 | 0.808 s | 0.519 s | 0.273 s |
| 3 | 0.791 s | 0.504 s | 0.265 s |
| Median | 0.808 s | 0.519 s | 0.273 s |

Against P00, median wall changed from 0.800 s to 0.808 s, user CPU from 0.507 s to
0.519 s, and system CPU from 0.278 s to 0.273 s. The changes are +1.00 percent,
+2.37 percent, and -1.80 percent. They remain inside the 3 percent control limit.

## Cost balance

- A changed control uses one bounded offscreen layer pass and one composite.
- The measured scene records six draws per changed frame.
- Backdrop copy cost is opt-in through the constructor. Source-only effects skip it.
- The device-generation cache is bounded to 32 effect program identities per target format.
- Cold cost includes the defensive SPIR-V copy, one pipeline per used program and format, and retained
  layer targets. Warm parameter animation creates none of them.
- At this P04 measurement, the public change was one type and three members: the constructor,
  `SetParameter`, and `Style.ShaderEffect`. The measured surface was 115 exported types and 1,249
  public members and enum values.
- The current branch later added the bounded
  `ShaderEffect(byte[], bool samplesBackdrop, float32 backdropOutset)` constructor. Its focused
  functional gate is separate from this P04 performance record, so the measurements above are not
  retroactively attributed to the larger surface.

## Functional and distribution evidence

The JIT and NativeAOT S20 gates both passed source isolation, backdrop sampling, rounded clipping,
pointer activation, resize, display scale, injected device loss and recovery, and cleanup. The gate
reported 0 B for direct parameter mutation and no warm Vulkan allocation.

The post-change NativeAOT S19 regression observed 60,001 ms of true idle with zero rebuild, layout,
plan, upload, record, submit, present, managed allocation, Vulkan object allocation, and device-memory
allocation. CPU use was 0.1780 percent of one core. The final-package three-window scheduler smoke also
passed after restore from a fresh package cache.

- Direct gate NativeAOT binary: 5,314,128 B
- Package-only NativeAOT consumer: 1,262,784 B
- Fragment SPIR-V sidecar: 5,600 B
- Packaged authoring include: 3,929 B
- Packaged Goo implementation assembly: 2,449,920 B
- Packaged Linux SDL library: 1,504,752 B
- NuGet package SHA-256: `75095448fd02abd18a581570e2fe4576978dc61f66888cc3a44cbcbb8463df56`
- Direct NativeAOT SHA-256: `3163a1fdbbdeb6789aebe34bccaea0199d5a78bd74adfe0c9a4a7b9eb778953c`
- Package-only NativeAOT SHA-256: `bb669b3fbfd229f502770748f143e6acaffe63bd5ea6c9ac556880da251311b7`
- Release Goo SHA-256: `2cad40671c10b399e2d8c39573329bda61add2d31fc1e1b30d4ff598f200d70c`
- Public API baseline SHA-256: `2a7ecc5acf3b84e74bb924ef198d0561e53e8fdca7cd0921f8f32dcfb541f01e`
- Control SPIR-V SHA-256: `b496243fc209bc03e608d53ccb570f4986c1f14859cbd6b9c294699875445c7e`

The package-only consumer restored Goo from the packed artifact, published with NativeAOT, loaded the
5,600-byte fragment sidecar, constructed `ShaderEffect`, and changed a parameter successfully.

## Decision

Accepted on Linux. The generic control shader path meets the 0 B warm allocation gate, creates no
warm Vulkan resources, preserves existing effect work and timing within limit, and keeps the public
surface to the minimum compositional contract.
