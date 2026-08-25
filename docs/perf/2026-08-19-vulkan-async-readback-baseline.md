# Vulkan asynchronous readback baseline, 2026-08-19

Purpose: preserve the first S14 request-only Vulkan readback measurements for matched future A/B
optimization runs. This is implementation evidence, not a release gate. Compare only equivalent
hardware, driver, display, workload, build, and runtime conditions.

## Configuration

- Branch: `gaps-and-reductions`
- Source HEAD: `8354cebd872796f03d9aabb50a25657658ea39eb`
- Source state: dirty with the uncommitted S13 and S14 implementation
- Build: Release fixture against the TestRelease Goo product assembly, `net10.0`
- .NET SDK: 10.0.111
- OS: CachyOS Linux, kernel 7.1.8-1-cachyos, x86_64
- Session: Wayland
- GPU: NVIDIA GeForce RTX 3080
- Driver: 610.57.04
- Renderer: direct Vulkan
- Workload: one static cell, one explicit top-left 64x64 readback region, eight warmup operations,
  64 measured operations
- Readback result: 16,384-byte top-left premultiplied sRGB RGBA8 payload
- Render target: 96x96 private `VK_FORMAT_R8G8B8A8_SRGB` image
- Staging target: 64x64 region with 256-byte rows

## Command

Run each arm in a fresh process and repeat each arm three times:

```sh
env GOO_S14_READBACK_MODE=measure \
  GOO_S14_READBACK_WARMUP=8 \
  GOO_S14_READBACK_SAMPLES=64 \
  GOO_S14_READBACK_ARM=active \
  GOO_VK_DIAGNOSTICS=1 \
  ./tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests
```

Replace `active` with `disabled` for the control arm. The active request renders the same static cell
once, so the harness does not add another render. The disabled arm performs forced Window renders
only. The harness reports its own timer cost and does not subtract it.

## Active arm raw results

All timing values are nanoseconds. Each row is one fresh process with 64 measured captures.

| Run | Frame p50 | Frame p95 | Frame p99/max | Normal record p95/max | Request-submit p95/max | Completion observed p95/max | Ready p95/max |
|---|---:|---:|---:|---:|---:|---:|---:|
| 1 | 6,899,431 | 7,118,885 | 7,234,853 | 6,995,532 / 7,047,911 | 7,117,643 / 7,233,922 | 7,189,859 / 7,272,775 | 7,191,021 / 7,273,957 |
| 2 | 6,870,988 | 7,056,167 | 7,474,686 | 6,919,278 / 7,300,928 | 7,055,184 / 7,473,854 | 7,131,739 / 7,512,206 | 7,133,372 / 7,513,319 |
| 3 | 6,871,168 | 7,152,639 | 8,797,220 | 6,938,485 / 8,573,829 | 7,149,613 / 8,794,596 | 7,202,783 / 8,854,138 | 7,204,817 / 8,856,092 |

| Run | CPU copy p95/max | GPU scene replay p95/max | GPU copy p95/max | Harness p95 |
|---|---:|---:|---:|---:|
| 1 | 1,433 / 2,264 | 6,240 / 6,496 | 3,040 / 3,168 | 30 |
| 2 | 1,473 / 1,994 | 6,240 / 6,496 | 2,848 / 3,296 | 30 |
| 3 | 2,023 / 2,305 | 6,080 / 6,304 | 2,848 / 3,264 | 30 |

| Run | Request allocation p95 B | Completion allocation p95 B | Total allocation p95 B | Warmup allocation B |
|---|---:|---:|---:|---:|
| 1 | 240 | 18,952 | 19,192 | 154,072 |
| 2 | 240 | 18,688 | 18,928 | 153,896 |
| 3 | 240 | 18,512 | 18,752 | 160,056 |

Each active run reported:

- 64 accepted requests, 64 completions, and 64 taken results
- 19 accounted first-use Vulkan object creations
- 53,248 nominal resident resource bytes for the 96x96 image plus 64x64 staging region
- no per-capture object destruction after warmup
- resource cleanup on close

## Active aggregate reference

The aggregate is the median of the three process P95 values.

| Metric | Reference |
|---|---:|
| Normal scene record CPU | 6.938 ms |
| Request through submit CPU | 7.118 ms |
| Completion observed before managed copy | 7.190 ms |
| Request ready after managed copy | 7.191 ms |
| GPU scene replay | 6.240 us |
| GPU image-to-buffer copy | 2.848 us |
| CPU copy | 1.473 us |
| Request allocation | 240 B |
| Completion allocation | 18,688 B |
| Total request allocation | 18,928 B |
| Result payload | 16,384 B |
| Nominal resource residency | 53,248 B |

## Disabled arm raw results

All timing values are nanoseconds. Each row is one fresh process with 64 measured frames.

| Run | Frame p50 | Frame p95 | Frame p99/max | Harness p95 | Measured allocation p95/max B | Warmup allocation B |
|---|---:|---:|---:|---:|---:|---:|
| 1 | 6,952,662 | 7,360,270 | 7,925,246 | 30 | 0 / 0 | 96 |
| 2 | 6,942,583 | 7,293,444 | 8,041,395 | 30 | 0 / 0 | 96 |
| 3 | 6,914,219 | 7,194,087 | 7,321,658 | 30 | 0 / 0 | 96 |

Every disabled run reported zero requests, completions, takes, Vulkan readback resource creations,
and readback residency. Frame timing is compositor and present sensitive. Do not subtract the active
and disabled frame values as a precise readback cost.

## Process memory sample

One paired process sample read `/proc/<pid>/smaps_rollup` every 5 ms from an external sampler. It is
a noisy process-level peak and is not a stable gate.

| Arm | RSS KiB | PSS KiB | Private KiB |
|---|---:|---:|---:|
| Disabled | 193,708 | 104,955 | 87,628 |
| Active | 195,956 | 106,701 | 89,292 |
| Active minus disabled | +2,248 | +1,746 | +1,664 |

The current reduction target is duplicate request-owned renderer and driver state. Re-run several
fresh paired processes before treating any later memory delta as real.

## Correctness evidence

- The result contract is 64x64, 256 row bytes, RGBA8 sRGB, top-left origin, and premultiplied alpha.
- The representative top-left pixel is `12-13/20/32/255`; red permits one LSB for linear/sRGB
  quantization. The center pixel is `161/32/51/255` from the half-opacity red-over-background
  fixture.
- Correctness passed twice normally and once with Khronos validation.
- Close reported zero validation errors, result failures, and live Vulkan objects.

## Comparison rules

- Keep the host, GPU, driver, display scale, source workload, build mode, warmup, and sample count
  fixed.
- Compare the three independent process P95 values and their median, not one process alone.
- Treat lifecycle, allocation, result payload, and nominal residency as the stable first gates.
- Treat frame timing as environment-sensitive and the process-memory sample as diagnostic only.
- Record later optimization results in a new dated file. Do not overwrite this baseline.
