# Changelog

## Unreleased

### Changed

- Goo core now targets the pinned G# 0.4.1 SDK and uses direct Vulkan 1.3
  rendering through the SDL3 Wayland host. Yoga remains the layout engine, and
  Goo-owned production code remains G#.
- The text path now uses the private HarfBuzz 14.3.1/hb-gpu payload and generated
  Unicode data for shaping, fallback, segmentation, line breaking, and text
  geometry.
- S09R-S11 Linux work now covers typed primitives, transforms and clips,
  gradients and borders, retained image and text resources, registered-font
  fallback, editor and IME geometry, color text, multi-atlas residency and
  eviction, and device-generation recovery.
- S13 Linux work now covers retained quadratic paths, solid and gradient or
  sampled-image path paints, strokes, rounded geometry, arbitrary path clips,
  exact path revisions, fence-safe path resource lifecycle, partial dirty-word
  uploads on safe range reuse, and serial-safe clip-mask stale eviction with
  pressure diagnostics.
- Added the build-time `Goo.SvgCompiler` 0.2.0 tool and GCV1 v1 assets for
  deterministic static, controlled-animation, and compatible-morph SVGs.
  Goo loads immutable G# asset views and supports retained transform, opacity,
  color, stroke, keyframe, loop, and morph playback.
- Fractional EvenOdd path evaluation solves roots once per candidate, evaluates
  both ray directions in one traversal, keeps four bounded distance arrays, and
  selects monotonic bands with a boundary-preserving binary search. Saturated
  roots still fold into parity and overflow still uses the original exact
  O(k^2) traversal. The final path-band shader is 91,752 bytes.
- Internal request-only Vulkan readback now qualifies the complete S09R public
  primitive region without adding a public capture API.
- Rounded two-axis hidden and scrolling overflow now clips node content and
  descendants through retained per-node quadratic paths and the Vulkan mask
  atlas. Static geometry reuses its path identity and mask region.
- Shader generation now fails when any production SPIR-V module or the
  production manifest differs from the generated mirror.
- `TextEntry.Password` now presents one bullet per extended grapheme cluster,
  maps source editing and element-handle geometry through the masked display,
  blocks copy and cut, accepts paste and committed IME text, and redacts value,
  selection, and caret accessibility output.
- Expanded the S15 manifest workload implementation to include small-animation,
  text-editing, image-effects, and three-window workloads alongside the canonical
  table, topology, and mutation runners. All 20 workload processes pass exact local
  contracts and absolute performance budgets.
- The q10.text-editing fast-hit follow-up applies the exact retained-segment hit and cached
  renderer-validation proof to Text and TextEditor only. TextEntry stays on full segment generation
  and full renderer validation because cached Entry proof repeatedly lost S17 protected-mask pixels;
  the active cache remains strong across atlas publication. Current CPU P50/P95/P99 is
  `0.497938/0.552471/0.701151 ms`, GPU P95 is `0.054272 ms`, and allocation P50 is `63,184 B`.
  Repository search found no in-place shaped-payload writer, which is the shape-reference identity assumption.
  Five NativeAOT processes all exited 0 with zero validation, result-failure, or fatal failures;
  Release and async TestRelease warnings-as-errors, CoreBehavior `261 passed`, protected-text,
  text-transport, text-viewport-cull, effects/COLR NativeAOT, and diff-check verification passed.
- JIT TestRelease image-effects isolation recorded full P50 `5.471 ms`, static `3.533 ms` with
  Paint about `3.366 ms`, eight mutations `4.759 ms`, one same-size replacement `5.254 ms` with
  `1.077 ms` layout from `ImageLayouts.Refresh` marking Yoga dirty on `DecodedImage` identity change,
  and `5.456 ms` with all non-normal blend layers disabled. Pixel generation plus immutable
  `ImageSource` copying creates two `262,144-byte` arrays; the full 256-card, 1,316-draw
  compile/record path, not the eight blend layers, dominates CPU. This is a follow-up target only.

- S07 Effects and Offscreen GPU timestamp scopes now wrap the actual backdrop-copy, composite, and layer-subtree pass ranges. Existing Upload and Main timestamps remain. The fixed diagnostics pool is 2 frame slots x 4 stages x 16 scopes x 2 queries = 256 queries, with scope-0 Upload/Main wrappers, asynchronous fence-owned resolution, and no wait-bit query. Dedicated offscreen readback timing now uses graphics-queue timestamp validity directly instead of incorrectly requiring compute timestamp support. Linux T03/T04 integration is complete; the Windows repeat remains open.

- Current-host T01, T02, T04, and Linux T05 pass. T03 stage/resource and deterministic scale-1 three-window checks pass, while full T03 remains blocked on the resize-DPI frame-120 product defect and one clean-source eight-workload matrix.
- Fresh-source completeness now includes `tools/merge_xml_docs.py`. The README package validator accepts generated API-page fences while retaining exact README example drift checks and isolated package compilation. Vulkan proof generation now includes `VkImageCopy` and `vkCmdCopyImage`.
- Package smoke close uses one bounded queue-progress helper. Text, path, and clip-mask corpora create deterministic pressure without relaxing eviction, retirement, reuse, cleanup, or validation gates.
- Host fence polling/reset/wait/destruction now defers while the shared queue worker has submit/present calls outstanding. Path-atlas free tails safely reenter append allocation with publication-prefix rollback, dirty upload marking, and reuse accounting on consumption.
- Linux T05 validates a `3,781,217`-byte package with SHA-256 `df9718a48cae0200b75c79253c45be670ddbb2759f067009b974126791625411` and a `5,487,496`-byte package-consumer NativeAOT executable with SHA-256 `1383ee1231817d13e1a4fce44efa9e31fc1c1c39f258e65a0a0a05a042cd6ace`. Default and native-window NativeAOT smokes pass. Raw evidence is `artifacts/reports/t01-t05-current-host.json`.
- Added `.github/scripts/with-kwin-scale-one.sh`. It validates a named connected KWin output through `kscreen-doctor --json`, sets and verifies scale 1, forwards exact child arguments, and restores/re-verifies the original scale after success, failure, or handled signal.
- The canonical three-window route now passes 300 warmups and 2,000 measured frames under the wrapper with exact 1:1 metrics, 2,033 submit/present operations, both frame slots, independent close, zero final resources, and clean validation.
- Resize-DPI is no longer display-environment blocked. It reaches exact 1.0/1.5/2.0 framebuffer states, then fails repeated swapchain shrink/recreate returning to state 0 at frame 120. Raw evidence is `artifacts/reports/deterministic-kwin-scale-one.json`.

- Completed the local Linux S15 retained-scene mechanisms, canonical virtual-table,
  topology, sparse/full mutation, scroll, retained-text, and lifecycle harnesses.
  Lazy first-use hardware material and clip-mask pipelines bring retained
  managed memory, RSS, and private dirty below the reconstructed historical
  control. First-use text atlas publication-pending frames are no longer
  misclassified as unsupported Content: Text, TextEntry, and TextEditor now use
  per-call publicationPending, while permanent failures are unchanged.
  Direct `EmitEntry` and `EmitEditor` calls bypassed the per-node retained-segment
  cache; `VulkanSceneCompiler.Paint` now routes all Text, Entry, and Editor nodes
  through generic `Emit`, and specialized emitters are private.
  CPU devices retain eager cold materialization. Full Q10 exit remains
  blocked because the Skia control has no comparable Goo-reserved GPU-memory
  metric, the final whole-device proxy differs by more than five percent, and no
  qualifying table/topology or binary/package result was recorded before
  removal.
- Moved 261 backend-neutral behavior and allocation contracts into the focused
  `Goo.CoreBehaviorTests` CI lane, then removed the stale 87-file `Goo.Tests`
  project, its Skia and `Goo.InternalTextInterop` coverage, duplicates, and old
  project infrastructure.
- Path boundary hit testing now scales its collinearity tolerance by edge length.
  Tiny tessellation edges no longer classify distant points as lying on a shape.
- Moved the API approval and XML documentation checks into the focused
  `Goo.ApiContractTests` CI lane. The migration removed an unintended public
  `ShaderEffect.Changed` metadata event.

- Added bounded internal presentation-token and completion history plus retired-generation records.
  Successful `vkQueuePresentKHR` handoff timestamps and present IDs are tracked monotonically by token,
  while completion callbacks are stored by token even when they arrive out of order. Retired-generation
  records and their presentation records are cleaned after the completed anchor, and failed or
  abandoned paths cancel pending latency. `VK_EXT_swapchain_maintenance1` completion observation is
  reported as an upper bound from later UI-thread polling. A route without present-fence support is
  named `present-handoff-only`, not completion observation. No public API changed.
- Added startup/readback usability proof and causal synthetic pointer, key, and committed-text
  mutations. Each mutation changes only its matching counter and one rendered generation. The
  `WindowReadbackFixture` route bypasses SDL polling; actual SDL acceptance and Wayland
  presentation-time feedback remain open.

### Verification

- Current Linux x64 native Wayland qualification passes the fresh-package
  window, resize, resource, text, provider-ABI, atlas, and recovery smoke
  lanes with warnings treated as errors.
- Focused Vulkan proof lanes cover text shaping, color glyphs, sharp text
  effects, shader assets, path pressure and lifecycle, compiled-vector playback,
  and warm-path allocation checks. The latest fresh-package Khronos Wayland
  gates reported path `pressureEvents=3`, `eviction=10`, `reuse=8`, `close=1`,
  and compiled-vector `static=1500`, `animatedTracks=7`, `morphCurves=12`,
  `plan=25`, `record=25`, `draw=460`, `pathRetired=6338`, `pathReuse=59`,
  `mounted=1`.
- The final S13 Linux NativeAOT compiled-vector executable is `5,277,640`
  bytes with a 37-file output of `19,458,308` bytes, below the 20 MiB cap.
- The q10.text-editing follow-up NativeAOT Linux binary is 5,708,704 bytes (SHA-256
  `7751034df36fd2f83db3ef13a175728fddc03f8d875100b05b1b325149324065`).
- The 2026-08-24 startup/readback and synthetic input-latency follow-up binary is 5,733,280 bytes
  with SHA-256 `d0c6a3968681fd0a2675aaf7c6d45c9ba40c8597d131401b5a918e6346047bc6`.
- The original 2026-08-24 S15 manifest expansion measured actual NVIDIA hardware across five isolated
  processes per workload, 300 warmups, and 2,000 samples each:
  - `small-animation`: CPU P50/P95/P99 `0.528/0.610/0.853 ms`, GPU P95 `0.026 ms`.
  - `text-editing`: CPU P50/P95/P99 `1.202/1.321/1.504 ms`, GPU P95 `0.096 ms`.
  - `image-effects`: CPU P50/P95/P99 `5.283/6.001/7.690 ms`, GPU P95 `0.934 ms`.
  - `three-window`: CPU P50/P95/P99 `0.648/1.463/1.652 ms`, GPU P95 `0.022 ms`.
  Global submit/present delta in three-window was 2033 (2000 selected frames + 33
  actual focus-loss dirty renders) with unchanged clean local slots.
- Five isolated nested-KWin scale-1 true-idle processes ran 60 seconds with zero
  work/allocation and median 0.1078% CPU core utilization.
- The q10.text-editing fast-hit follow-up reduced current CPU P50/P95/P99 from
  `1.201987/1.320821/1.504447 ms` to `0.497938/0.552471/0.701151 ms`
  (`58.574%/58.172%/53.395%` reductions). GPU P95 is `0.054272 ms` and allocation P50 is
  `63,184 B`. Accepted recorded Skia P95 is `0.461491 ms`; the new result is `+0.090980 ms`
  or `+19.714%`, which passes the exact larger-of-3%-or-0.1-ms gate by `0.009020 ms`. This
  does not claim Vulkan is faster than Skia.
- Five fresh Linux NativeAOT processes on actual NVIDIA hardware used 300 warmups and 2,000
  pointer, key, or committed-text input samples each. All exited 0 with zero validation,
  result-failure, or fatal failures, 2,001 unique tokens each, exact one-frame startup and
  300-frame warmup submit/present deltas, and exact 2,000-frame input submit/present deltas.
  Startup/readback usability passed with positive logical/framebuffer metrics, a mounted invariant
  root, one startup present-fence observation, and a successful startup readback pixel check.
- On this route, managed-entry to successful `vkQueuePresentKHR` handoff was median
  `226.193175 ms`, and window-open to handoff was median `225.551726 ms`. The corresponding
  completion-observed upper bounds were `226.218353 ms` and `225.576904 ms`. These are qualified
  managed-entry/window-open to present-handoff values, not a first-usable-frame P95.
- Synthetic injection-to-present-handoff P50/P95/P99/worst was
  `0.381620/1.348723/1.625866/1.974053 ms`; the `37.333334 ms` P95 limit passes. Completion-observed
  upper bounds were `1.571202/6.193419/7.986581/21.262635 ms` P50/P95/P99/worst and are not the
  handoff gate. Per-kind handoff P50/P95/P99 was pointer `0.346123/0.476438/0.529628 ms`, key
  `0.339610/0.461310/0.518588 ms`, and committed text `0.747760/1.567176/1.711557 ms`.
- Raw evidence is `artifacts/reports/s15-q10/summary.json` and
  `artifacts/reports/s15-q10/latency-final-run-*.log`. Actual SDL acceptance and Wayland
  presentation-time feedback remain open.
- Resize/DPI lane is implemented but blocked on active Wayland/WSI swapchain cycle
  state transitions (cannot complete exact 1.0/1.5/2.0 cycle and fails returning to
  state 0 at frame 60).
- Linux final-protocol coverage stands at 7 of 8 measured current rows. The source
  remains dirty and full Q10 is not claimed.

- The final five-process NativeAOT validation-layer stage route used an NVIDIA RTX 3080 with driver 610.57.04 on `wayland-0`, the `image-effects` workload, 300 warmups, and 2,000 samples. All five processes exited 0. Median Effects P50/P95/P99/Worst was `207872/218112/948224/1359872 ns`; median Offscreen was `73728/77824/79872/404480 ns`. Every frame reported Effects `scopeCount=16` and Offscreen `scopeCount=8`, with zero drops, exact completed-frame correlation, zero warm Vulkan object and device-memory allocations, and clean validation. The binary was `5,757,936` bytes with SHA-256 `57aeae31abc6214c770f643695a3c407a017cf7098c6691f2d0659f24a5a5c99`; raw logs are `artifacts/reports/s15-q10/stage-timestamp-final-run-{1..5}.log`.
- The canonical dynamic Q10 five-process route after instrumentation measured CPU P50/P95/P99 `5,151,040/5,816,795/7,675,581 ns` and GPU Main P50/P95/P99 `1,553,408/2,023,424/2,296,832 ns`, versus accepted pre-stage `846,848/933,888/946,176 ns`. The diagnostics-enabled query-write tax is `+83.434%/+116.667%/+142.749%`, not an unqualified production regression. Raw logs are `artifacts/reports/s15-q10/stage-timestamp-q10-final-run-{1..5}.log`.
- T04 FailedIdle validation passed 1,000 operations, 10 surface losses, and 3 device losses, then emitted `stage_timestamps=1` after final recovery following a positive Effects event and a successful Offscreen event; sub-resolution Offscreen durations may quantize to zero. The JIT validation stage gate passed 2,000 samples. `artifacts/reports/s15-q10/summary.json` contains `stage_timestamp_followup`. Disabled diagnostics still create no query pool or timestamp commands, so the measured GPU query-write tax does not apply when diagnostics are disabled. Actual presentation, SDL acceptance, and Wayland presentation-time feedback remain open.

- The final S15 current-binary actual-NVIDIA matrix used five isolated NativeAOT
  processes per workload with 300 warmups and 2,000 measured frames.
  Process-median CPU P50/P95/P99 was `1.247/1.531/3.151 ms` for the
  100,000-row table, `1.641/2.309/4.171 ms` for 5,000-node topology,
  `1.625/2.106/2.398 ms` for one-of-1,000 mutation, and
  `3.749/4.471/5.399 ms` for full mutation. Median GPU P95 was `0.305`,
  `0.161`, `0.010`, and `0.077 ms`. Every run submitted and presented 2,000
  measured frames with zero warm Vulkan object or device-memory allocation. The
  earlier Weston Pixman matrix selected Lavapipe and is not hardware evidence.
- The final local Linux Wayland and NVIDIA RTX 3080 Release 512-hole gate used
  one 1,800 by 1,800 EvenOdd path over 180 demand-active frames. Three runs
  measured MainPass P95 `7.779328 ms`, `7.833600 ms`, and `7.835648 ms`, down
  `46.9%` from the reproduced `14.759936 ms` baseline. All runs pass the
  8.33 ms P95 and 16.67 ms P99 gates with zero managed allocation, validation
  errors, result failures, fatal records, or dropped validation messages.
- The 256-hole EvenOdd path corpus remains the accepted representative. The
  1024-hole run is not qualified.
- Actual NVIDIA qualification passed rounded-overflow 3/3 and effects/COLR 3/3,
  each including a cache-disabled pass. CPU Lavapipe passed both suites. A
  focused NVIDIA FailedIdle lane passed alongside focused S09R, text culling,
  and text transport checks.
- Actual NVIDIA qualification passed protected-text 3/3, and CPU Lavapipe passed
  protected-text once. CoreBehavior 261/261, S17 core, rounded-overflow,
  effects/COLR, and FailedIdle lanes passed alongside zero-warning builds.
- The S09R Linux gate passed twice on local Wayland and once with Khronos
  validation. Two full-frame captures qualified boxes, radii, solid, dashed,
  and dotted per-edge borders, two- and four-stop gradients, nested transforms,
  rectangular clips, scrolling, visibility, opacity, stacking, readback
  lifecycle, and clean Vulkan teardown. A fresh package consumer also passed
  with 108 draws, four plan compiles, and four command records.
- The S14 rounded-overflow gate passed on local NVIDIA Wayland and with Khronos
  1.4.357 validation. It qualified square-Shape self-content, a scrolling
  viewport with an overflowing child, eight corner samples, two readbacks, and
  clean close with 118 draws, 12 plan compiles, and 12 command records.

### Deferred

- General masks and higher-level filters remain open.
- Inline and block editor child slots remain open.
- Non-normal `BlendMode` plus `ShaderEffect` remains open.
- Active S15 general retention and full Q10 exit remain open (7 of 8 protocol rows qualified; resize/DPI Wayland/WSI hardware cycle blocked). Synthetic injection-to-present-handoff P95 passes on the fixture route, but comparative startup P95, actual SDL acceptance, and Wayland presentation-time feedback remain open.
- Windows, integrated-GPU, second-DPI, and clean-clone release work remain open.

## 0.2.0 - 2026-08-07

### Changed

- SkiaSharp and SkiaSharp.HarfBuzz upgraded from 3.116.0 to 4.151.1, moving
  Skia from m116 to m151.
- HarfBuzzSharp and HarfBuzzSharp.NativeAssets.Linux upgraded from 8.3.1.1 to
  14.2.1.2, moving HarfBuzz from 8.3.1 to 14.2.1.
- Removed the SkiaSharp 3.x duplicate Linux native alias cleanup from
  `Goo.targets`; SkiaSharp 4.x ships a single canonical `libSkiaSharp.so`.
- Internal path construction migrated from the deprecated mutable `SKPath`
  API to `SKPathBuilder`, ahead of SkiaSharp removing its compatibility
  shim. Uniform solid borders and inset box shadows now paint through
  `SKCanvas.DrawRoundRectDifference`, making rounded solid borders about
  3x faster and removing the shim's per-paint allocation overhead. Public
  API is unchanged.

## 0.1.0 - 2026-08-07

Goo 0.1.0 is the first public release of the retained, declarative UI framework
for G# and .NET 10.

### Included

- Declarative Blob trees with keyed Cell invalidation and retained reconciliation.
- Yoga layout, Skia rendering, shapes, images, text, and style transitions.
- Keyboard, pointer, focus, scroll, clipboard, and generic text or IME input.
- Stable element handles, accessibility semantics, and a UI-thread dispatcher.
- Passive styled text and a retained multiline text editor.
- XML documentation and generated per-area API reference pages.

### Release constraints

- The supported platform is `linux-x64` with glibc 2.35 or newer on a native
  Wayland session. X11 and XWayland are not supported.
- Windows, macOS, and Linux ARM64 are not supported by 0.1.0.
- Custom IME candidate presentation is application-owned in 0.1.0.

### Compatibility

- Target framework: .NET 10.
- G# SDK: 0.3.633.
- Package version: 0.1.0.
- License: MIT.
