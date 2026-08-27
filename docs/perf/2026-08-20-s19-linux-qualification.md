# S19 Linux x64 qualification

Date: 2026-08-21

Status: final local discrete-Linux core and S19 qualification. External release matrix remains.

## Candidate

| Field | Value |
|---|---|
| Branch | `gaps-and-reductions` |
| Source commit | `8354cebd872796f03d9aabb50a25657658ea39eb` |
| Source state | Dirty working tree, final core capture |
| RID | `linux-x64` |
| Host | CachyOS, Linux 7.1.8 |
| SDK | .NET SDK 10.0.111 |
| NativeAOT build host | Ubuntu 22.04 container, .NET SDK 10.0.302, glibc 2.35 |
| GPU | NVIDIA GeForce RTX 3080, discrete |
| Driver | 610.57.04 |
| Vulkan | 1.4.341 |
| Device UUID | `9be224e6-73f9-e2db-e5aa-4932a59b2b57` |
| Desktop | KDE Wayland through `/run/user/1000/wayland-0` |
| Controlled idle compositor | Weston 15.0.1 headless, 1920 x 1080, Vulkan renderer |
| Validation | `VK_LAYER_KHRONOS_validation` |

The controlled idle compositor used the same RTX 3080 Vulkan device. It isolated true-idle
measurements from unrelated desktop expose events. Interactive text input used KDE because the
headless desktop shell did not provide `zwp_text_input_v3`.

## Result by durable target

| Target | Linux result | Evidence |
|---|---|---|
| T01 package consumer | Pass | Fresh NuGet restore, framework-dependent publish, default startup, typed cell behavior, all 11 consumer lanes, and all 11 NativeAOT lanes passed |
| T02 visual/readback corpus | Pass for available Linux corpus | ABI, scene, text, text-paint, S09R, registered fonts, controls, atlas pressure, image pressure, paths, clip masks, compiled vectors, effects, and protected text passed with accepted diagnostics |
| T03 hot-path harness | Pass for the accepted local Linux performance iteration | True idle passed. The post-core baseline and accepted P04 strict-leaf Text control passed on the discrete host. P04 uses exact cached glyph paint-bound viewport culling and a non-boxing internal `VulkanTextAtlasGlyphKey`; no public API changed |
| T04 lifecycle/recovery | Pass for local discrete-Linux core | Three windows, 1,000 operations, plateau, 10 injected surface losses, 3 device losses, input, protected text, accessibility, validation, queue isolation, and offscreen failure propagation passed. External Windows and integrated-GPU repeats remain |
| T05 package/NativeAOT report | Pass for Linux | Dependencies, licenses, hashes, size, native closure, GLIBC floor, source boundary, and forbidden payload scan recorded below |

## Accepted P04 strict-leaf text iteration

P04 is the accepted local Linux performance iteration. It culls strict leaf `Text` only when an exact
cached glyph paint bound is available, and uses a non-boxing internal `VulkanTextAtlasGlyphKey`. It
adds no public API and does not extend hardware coverage.

The 4,900-cell full control used 300 warmup and 2,000 measured frames. Median CPU P50/P95 was
`18.077680/18.809680 ms`, worst was `62.564055 ms`, allocation was `2,820,666 B/frame`, and `3,711`
offscreen items were skipped. The baseline was `35.022465/53.240000 ms`, worst `78.539000 ms`, and
`6,109,729 B/frame`.

The short GPU control median reported CPU P50/P95 `18.043688/19.618076 ms`, Main GPU P50/P95
`2.366464/2.612224 ms`, `2,815,146 B/frame`, and `3,373,177` draws. Its baseline was CPU
`35.723980/55.554462 ms`, Main GPU `7.949312/12.897280 ms`, `6,076,094 B/frame`, and `13,900,767`
draws. The disabled-readback S14 hot path remained `0 B` at P95 and maximum. Full P04 evidence is in
`2026-08-21-vulkan-performance-p04-exact-text-cull-key-accepted.md`.

## True idle

Each row is an isolated process with a 3 second compositor warm-up followed by a 60 second
observation. All five runs recorded zero rebuild, layout, plan, upload, command-record, submit,
present, managed-allocation, Vulkan-object-allocation, and device-memory-allocation deltas.

| Run | Duration, ms | CPU use, one core |
|---:|---:|---:|
| 1 | 60,001 | 0.0904% |
| 2 | 60,002 | 0.0874% |
| 3 | 60,001 | 0.0938% |
| 4 | 60,002 | 0.0925% |
| 5 | 60,001 | 0.0914% |

The maximum was 0.0938%, below the 0.5% gate.

## Lifecycle and recovery

The final validation run reported:

```text
normal-close: three-windows=1 device-idle-delta=0 siblings-usable=1
lifecycle: windows=3 operations=1000 plateau=1 independent=1
surface-loss: injected=10 observed=10 siblings-usable=1
device-loss: count=3 recovered=3 siblings-usable=1
```

Each injected surface loss recovered. All three sequential device losses rebuilt the shared runtime
and advanced its generation. Recovered text, image upload, and offscreen layer reconstruction passed. Final image
residency, image live objects, layer bytes, layer targets, and layer leases were zero. Closing one
window while siblings remained live added zero `vkDeviceWaitIdle` calls.

After the fixture timing correction, the fresh-build recovery executable passed three consecutive
validation processes with the same required result. A fourth validation process passed after the ABI
fixture build and recovery rebuild were executed in the collision-prone order.

The S17 interaction gates separately passed pointer, keyboard, focus, hover, active, disabled, wheel,
scroll, motion, transitions, handle geometry, neutral accessibility actions, protected grapheme
mapping, protected pixels, clipboard suppression, IME commit, semantic redaction, and close cleanup.

## S16-D02 queue and offscreen failure qualification

The final queue worker gate held one target in submit and present, required both sibling trees and posted
work to advance, consumed one enqueue deferral, retried, converged without duplicate target work, and
closed cleanly. Three fresh validation processes passed. The offscreen failure gate separately propagated
`VK_ERROR_DEVICE_LOST` through the shared lease and readback poll, cleared target storage, and closed.
Each of its three final binary runs reported:

```text
d02-offscreen-failure-gate: accepted=1 device_loss=1 storage_cleared=1 close=1
```

This closes the local Linux S16-D02 core mechanism. It does not close external Windows or integrated-GPU
qualification.

## Distribution report

| Artifact | Bytes | SHA-256 |
|---|---:|---|
| `Goo.0.2.0.nupkg` | 3,682,963 | `20fa1bb543ffd1294b1e36947b89c046340f0e99180b38eb0b3dba586559e99b` |
| Linux bundle | 9,911,025 | Per-file hashes are in `artifacts/linux-x64-core-final/SHA256SUMS` |
| Linux bundle `Goo.dll` | 2,424,832 | `f4118551633d84df013c0d5599b652c3ecb5b7df940eff33b4401d87aa619407` |
| NativeAOT executable | 5,367,936 | `8c9b8e8af53f55825918551fe9a0ead8c1428a364f6cb07783de96baa94ec4c2` (prior final-v2 capture) |
| Complete NativeAOT output | 17,095,609 | Includes fixture fonts and native debug output |

The final core package expands to 9,768,426 bytes. The Linux bundle and complete NativeAOT output remain below
the 20 MiB application-RID cap. The NativeAOT executable is a stripped x86-64 ELF for GNU/Linux 3.2,
uses at most `GLIBC_2.34`, and dynamically requires only `libm`, `libc`, and the ELF loader. Its
application directory supplies `libSDL3.so`, `libgoo-harfbuzz.so`, and
`libgoo-harfbuzz-gpu.so`.

Resolved managed packages are `Hexa.NET.SDL3` 1.2.17, `Unicode.Bidi` 0.3.18, and transitive
`HexaGen.Runtime` 1.1.24. The vulnerability query found no vulnerable packages. The package contains
`LICENSE`, `THIRD-PARTY-NOTICES.md`, and `HarfBuzz-COPYING.txt`. Goo core contains zero `.cs` files.
The payload scan found zero Skia, OpenGL, software ICD, validation-layer, shader-compiler, proof,
test, or Goo-owned C# entries.

The NuGet package intentionally carries Linux and Windows HarfBuzz runtime assets, as required by the
current package allowlist. The staged `linux-x64` application contains Linux assets only. S19's
cross-RID package wording and the current multi-RID NuGet contract conflict. The Windows wave must
either approve the multi-RID NuGet contract or define separate RID-specific NuGet packages.

## Corrections made during qualification

- Added the missing host-write to shader-read buffer barrier in the proof renderer and the required
  pre-rendering target barrier.
- Released offscreen image, view, and allocator state on device-loss abandonment.
- Replaced normal sibling close device-wide idle with target-owned frame and presentation fence waits,
  retaining device idle only for final runtime destruction or the safe maintenance-fence fallback.
- Added a deterministic true-idle gate with exact diagnostic, allocation, and CPU assertions.
- Extended the recovery regression to 1,000 lifecycle operations, a retained-resource plateau, 10
  synthetic surface losses, and 3 sequential device losses across three live windows. Each injected
  loss now waits for a successful submit from the recovering window instead of counting shared-window
  activity.
- Made the external path-pressure fixture use six bounded pump pairs per phase. Three isolated final
  runs then passed without retry.
- Corrected README example selection so only blocks containing a `Cell` class are compiled.

## Remaining gates

- Windows x64 feature, lifecycle, validation, package, dependency, NativeAOT, and performance repeats.
- Linux integrated-GPU qualification. This host exposes only one discrete GPU.
- A clean-clone restore and build from the exact candidate.
- Automated DPI movement on a second real scale.
- The legacy shadow and image proof readback assertions remain stale. Current S14 effects and package
  image-pressure gates are the accepted product evidence.

## S15 reopen decision

The idle and lifecycle results do not justify another retained-renderer mechanism. Do not reopen S15
for another primitive SSBO or generalized retained range. P04 is accepted for strict leaf `Text`: exact
cached glyph paint-bound viewport culling and a non-boxing internal `VulkanTextAtlasGlyphKey` close the
measured strict-leaf text full-redraw issue without a public API change.

The post-core primitive-staging audit did not add another retained mechanism. P06 and P07 each removed
128,000 mapped staging stores from the measured clean 1,000-record frame, but neither improved total
CPU P50/P95 and neither changed allocation or GPU uploads. Both candidates were removed. The P05
control and separate P06/P07 rejection records are retained under `docs/perf/`.

Reopen only on new measured evidence. The remaining external matrix is Windows, Linux integrated GPU,
clean-clone restore/build, and a second real DPI scale. These are not local Linux core blockers.

## Raw evidence

Raw final-core logs are under `artifacts/reports/core-linux/`. The accepted true-idle files are
`s19-idle-core-final-run-{1..5}.txt`; the accepted queue-isolation files are
`s16-queue-isolation-final-binary-run-{1..3}.txt`; the accepted offscreen failure files are
`d02-offscreen-failure-core-final-binary-run-{1..3}.txt`; and the lifecycle/recovery files are
`failed-idle-core-final-binary-run-{1..3}.txt`. The final S17 and focused S09R/S14/S15 logs use the
same `core-final` naming in that directory. SHA-256 values for the idle and D02 logs are recorded in
the audit handoff and can be reproduced with `sha256sum`.

| Raw file | SHA-256 |
|---|---|
| `s19-idle-core-final-run-1.txt` | `27b1bbd9bac2490d4122b531c1a7d407f8a4ef83c59148527c6c64a0a3dfbde9` |
| `s19-idle-core-final-run-2.txt` | `2834ee94ea18c13a3c2547a8fa353d7f04ea11388c946c951762d3991d7e5f71` |
| `s19-idle-core-final-run-3.txt` | `3e9544ea50361b17bbf9253367a1741b922248d7145d99f8e2faa4245204c1bb` |
| `s19-idle-core-final-run-4.txt` | `ba29de8fbe6ae5e3902159a6b61438b08a134751d87ccde6529e7ecd4368037a` |
| `s19-idle-core-final-run-5.txt` | `66a6fdbfbee927d2651ca57a7bd87573fb54de467047b0b92a0725b5d64fe27a` |
| `d02-offscreen-failure-core-final-binary-run-1.txt` | `9b6c8b998ac7eae88b149b0a67cf6e7419d271fd16ef761ecbf7aa04b7f64642` |
| `d02-offscreen-failure-core-final-binary-run-2.txt` | `9b6c8b998ac7eae88b149b0a67cf6e7419d271fd16ef761ecbf7aa04b7f64642` |
| `d02-offscreen-failure-core-final-binary-run-3.txt` | `9b6c8b998ac7eae88b149b0a67cf6e7419d271fd16ef761ecbf7aa04b7f64642` |
