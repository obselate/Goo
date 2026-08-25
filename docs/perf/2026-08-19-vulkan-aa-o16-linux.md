# Vulkan AA O16 Linux evidence, 2026-08-19

Status: Linux evidence and accepted O16 policy. Goo ships one fixed analytic-coverage AA policy shared
by Windows and Linux; all product targets and pipelines remain single-sampled. This document does not
claim Windows verification. Final T02 and Windows qualification remain S19 release gates.

## Current analytic path

- Branch: `gaps-and-reductions`
- Renderer: direct Vulkan on Wayland
- GPU: NVIDIA GeForce RTX 3080
- Driver: NVIDIA 610.57.04
- Vulkan: 1.4.341 device API
- Goo shader manifest: 12 graphics pipelines, all `sampleCount: 1`
- Goo pipeline state: all `VkPipelineMultisampleStateCreateInfo.rasterizationSamples` values are `VK_SAMPLE_COUNT_1_BIT`
- Goo offscreen, layer, image, and clip-mask images are all single-sampled
- Analytic coverage is provided by the fragment shaders and `fwidth`, including rounded solids, borders, gradients, shadows, paths, and text paths

## Linux target support

The local device reports:

- `framebufferColorSampleCounts`: 1, 2, 4, 8
- `sampledImageColorSampleCounts`: 1, 2, 4, 8
- `sampleRateShading`: true
- `standardSampleLocations`: true

This records that MSAA4 and MSAA8 are viable on this device; it does not establish Windows or the full
Linux target matrix. O16 does not select either sample count. Goo does not currently capture sample-count
support in `VulkanSharedDeviceFacts` or diagnostics.

## Existing analytic evidence

The existing S09R Linux pixel gate passed:

```text
s09r-pixel-gate: boxes=1 borders=solid,dashed,dotted gradients=2,4 transforms=1 clips=1 scroll=1 visibility=1 opacity=1 stacking=1 drawCount=324 planCompileCount=12 recordCount=12 readbackCount=2 close=1
```

The existing narrow readback harness was run with 16 warmup operations and 64 samples per fresh process. It is a scene and lifecycle baseline, not a full AA corpus.

| Arm | Frame P50 | Frame P95 | Frame P99/max | GPU scene P95 | GPU copy P95 | Resource peak | Measured allocation P95 |
|---|---:|---:|---:|---:|---:|---:|---:|
| Disabled | 6.923 ms | 7.338 ms | 7.752 ms | n/a | n/a | 0 B | 0 B |
| Active readback | 6.869 ms | 7.154 ms | 7.539 ms | 11.328 us | 3.264 us | 53,248 B | 240 B request |

Active readback also reported 64 requests, 64 completions, 64 result takes, 16,384-byte results, 21,504-byte completion allocation P95, 373,320 bytes warmup allocation, and 40 first-use resource creations across the warmup and measured operations. The harness timer P95 was 30 ns.

## Proof-only analytic/MSAA4 visual A/B

The proof-only candidate was run three times on the same Linux NVIDIA device and fixture. The GPU timestamp medians were:

| Arm | GPU median | Relative to analytic |
|---|---:|---:|
| Analytic | 10,528 ns | baseline |
| MSAA4 | 14,176 ns | +34.65% |

The deterministic readback/resource metrics were:

| Arm | Digest | Background | Shape | Edge | Edge coverage | Resources | Allocated bytes | Nominal MSAA intermediate attachment |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Analytic | 18382439977458986636 | 3,590 | 500 | 6 | 1,205 | 18 | 0 | 0 B |
| MSAA4 | 15462425722322060258 | 3,562 | 474 | 60 | 10,464 | 20 | 0 | 65,536 B |

The proof build, shader validation, and host Vulkan runs completed with zero validation errors and zero fatal errors. The comparison code was ephemeral and has been deleted; only these recorded results remain.

This candidate keeps analytic shader coverage and adds MSAA4, so it measures layered MSAA/double filtering rather than replacement pure-MSAA tessellated geometry. It is sufficient to reject layered MSAA as the product direction because it adds 34.65% to the measured GPU median while retaining the analytic coverage path. It is not evidence for pure-MSAA quality or performance, which still requires a separate no-analytic-coverage shader and matching tessellated geometry.

## Why layered MSAA was not selected by O16

A sample-count-only switch is not a valid pure-MSAA comparison. Goo's rounded boxes and other analytic
primitives draw bounding quads and calculate coverage in the fragment shader. Combining that coverage
with MSAA double-filters it; replacing it requires a separate no-analytic-coverage shader and matching
geometry, plus a multisample color image and resolve image. The proof above rejects layered MSAA because
it raised the GPU median by 34.65% while retaining analytic coverage. The comparison code was deleted.

O16 therefore accepts one fixed analytic-coverage policy shared by Windows and Linux. Product Vulkan
targets and pipelines remain single-sampled, with no MSAA, runtime AA modes, per-window settings,
fallback chain, or automatic strategy switching. This supersedes the older Skia/OpenGL 8x-MSAA request
and fallback direction.

## Rejected layered-MSAA resource delta (historical)

The following storage comparison is retained only as rationale for rejecting the layered candidate. No
product MSAA implementation follows from it.

## Resource delta before implementation

For an RGBA8 color attachment, the multisample intermediate adds the following nominal device-local color storage. The single-sample resolve image remains required, so the product delta is the full intermediate attachment size.

| Extent | Common single-sample resolve target | Added MSAA4 attachment | Added MSAA8 attachment |
|---|---:|---:|---:|
| 64x64 | 16,384 B | 65,536 B | 131,072 B |
| 96x96 | 36,864 B | 147,456 B | 294,912 B |
| 440x270 | 475,200 B | 1,900,800 B | 3,801,600 B |

The exact production cost is higher when swapchain buffering and pooled effect targets are included. Sample-count-only pipeline variants add no SPIR-V bytes. Alternate no-analytic shaders would add shader payloads and pipeline first-use work. Current relevant SPIR-V sizes are 1,816 B for `analytic.vert`, 6,060 B for `analytic_solid.frag`, and 312 B for the existing plain `solid_quad.frag`.

## Result

MSAA4 and MSAA8 are supported by the local Linux GPU, but the layered candidate is rejected by O16.
The proof-only comparison is retained as evidence, while its code has been deleted. Final T02 visual,
performance, and memory gates and later Windows qualification remain S19 release evidence; they do not
claim Windows is verified and may reopen O16 only on a measured failure of the accepted analytic-coverage
policy. No runtime AA setting, fallback policy, or automatic strategy switching is permitted.
