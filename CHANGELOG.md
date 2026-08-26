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
- Vulkan scrolling now renders shared-geometry horizontal and vertical thumbs,
  supports primary-pointer dragging with immediate clamped offsets, and exposes
  `ElementHandle.ScrollRange`, `ElementMetrics.ScrollRange`, and
  `ElementHandle.JumpTo`. `Blob.ScrollbarVisibility` selects auto-fading,
  always-visible, or hidden built-in chrome without disabling scrolling.
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

- Current-host T01, T02, T04, and Linux T05 pass. T03 stage/resource, deterministic scale-1 three-window, and five-process resize-DPI checks pass, while full T03 remains partial on one clean-source eight-workload matrix.
- Fresh-source completeness now includes `tools/merge_xml_docs.py`. The README package validator accepts generated API-page fences while retaining exact README example drift checks and isolated package compilation. Vulkan proof generation now includes `VkImageCopy` and `vkCmdCopyImage`.
- Package smoke close uses one bounded queue-progress helper. Text, path, and clip-mask corpora create deterministic pressure without relaxing eviction, retirement, reuse, cleanup, or validation gates.
- Host fence polling/reset/wait/destruction now defers while the shared queue worker has submit/present calls outstanding. Path-atlas free tails safely reenter append allocation with publication-prefix rollback, dirty upload marking, and reuse accounting on consumption.
- Linux T05 validates a `3,781,217`-byte package with SHA-256 `df9718a48cae0200b75c79253c45be670ddbb2759f067009b974126791625411` and a `5,487,496`-byte package-consumer NativeAOT executable with SHA-256 `1383ee1231817d13e1a4fce44efa9e31fc1c1c39f258e65a0a0a05a042cd6ace`. Default and native-window NativeAOT smokes pass. Raw evidence is `artifacts/reports/t01-t05-current-host.json`.
- Added `.github/scripts/with-kwin-scale-one.sh`. It validates a named connected KWin output through `kscreen-doctor --json`, sets and verifies scale 1, forwards exact child arguments, and restores/re-verifies the original scale after success, failure, or handled signal.
- The canonical three-window route now passes 300 warmups and 2,000 measured frames under the wrapper with exact 1:1 metrics, 2,033 submit/present operations, both frame slots, independent close, zero final resources, and clean validation.
- Five isolated direct-KWin scale-1 resize-DPI processes now complete the repeated 1.0/1.5/2.0 active-swapchain cycle after the lost-retry correction. CPU P50/P95/P99 process medians are `0.137319/1.618522/2.430012 ms`; GPU Main P95 is `0.113664 ms`. Every run has exact 2,000 submit/present deltas, both slots, clean validation/result/fatal streams, close, and output-scale restore. Raw evidence is `artifacts/reports/deterministic-kwin-scale-one.json` and `artifacts/reports/s15-q10/resize-dpi-final-run-{1..5}.log`.
- `ShaderEffect` now composes with non-normal `BlendMode` through two internal layers. The inner effect processes the isolated subtree, backdrop-sampling effects borrow the original parent capture, and the outer layer blends the result. No public API changed. The NativeAOT gate passes Multiply pixels, interaction, resize, display scale, injected recovery, zero-allocation parameter updates, zero warm Vulkan resource creation, and cleanup. Its 300/2,000 benchmark reports CPU P50/P95/P99 `0.241085/0.365820/0.601514 ms`, 0 B allocation, and 6,000 layer passes and composites.
- General masks and a higher-level filter API are intentional current non-goals. Simulation supplies animation values, `ClipPath` supplies hard spatial clipping, and `ShaderEffect` supplies soft or procedural reveals and pixel filters. General masks reopen only for required external alpha or luminance mask data. Higher-level filters reopen only for an accepted no-shader-authoring convenience layer.
- `TextEditor` inline and block child slots now render through the compiler-owned editor content clip. Slot children inherit clipping and bounds through scrolling and nested layers, and unsupported clip contexts never paint them unclipped. No public API or Vulkan resource contract changed.

- Completed the local Linux S15 retained-scene mechanisms, canonical virtual-table,
  topology, sparse/full mutation, scroll, retained-text, and lifecycle harnesses.
  Lazy first-use hardware material and clip-mask pipelines keep retained managed
  memory, RSS, private dirty, and Vulkan allocations bounded. First-use text atlas
  publication-pending frames are no longer misclassified as unsupported Content:
  Text, TextEntry, and TextEditor use per-call publicationPending while permanent
  failures are unchanged. `VulkanSceneCompiler.Paint` routes Text, Entry, and
  Editor through generic `Emit`; specialized emitters are private. CPU devices
  retain eager cold materialization. The clean commit `6d4d92e` results are the
  Vulkan regression references.
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
  mutations. A separate focused gate now pushes mouse, key, and committed UTF-8 text through
  `SDL_PushEvent` and consumes them only through product `SdlRuntime.PumpEvents` and
  `SdlHost.Dispatch`. Wayland presentation feedback remains deferred under S16-D03.
- Froze the complete Linux implementation at commit `6d4d92e` and ran one clean-source matrix with a single 5,815,728-byte NativeAOT binary. All eight official workloads pass across 40 processes with exact hashes, clean diagnostics, warm-resource and absolute-frame budgets, cleanup, package, dependency, fallback, memory, and provenance evidence.
- Removed every active Vulkan-versus-Skia comparison gate. Other-renderer measurements remain historical only. Clean-source Vulkan workload, startup, memory, package, bundle, and NativeAOT results now govern regressions alongside absolute correctness and resource budgets.

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
- The q10.text-editing fast-hit follow-up reduced Vulkan CPU P50/P95/P99 from
  `1.201987/1.320821/1.504447 ms` to `0.497938/0.552471/0.701151 ms`
  (`58.574%/58.172%/53.395%` reductions). GPU P95 is `0.054272 ms` and allocation
  P50 is `63,184 B`.
- Five fresh Linux NativeAOT processes on actual NVIDIA hardware used 300 warmups and 2,000
  pointer, key, or committed-text input samples each. All exited 0 with zero validation,
  result-failure, or fatal failures, 2,001 unique tokens each, exact one-frame startup and
  300-frame warmup submit/present deltas, and exact 2,000-frame input submit/present deltas.
  Startup/readback usability passed with positive logical/framebuffer metrics, a mounted invariant
  root, one startup present-fence observation, and a successful startup readback pixel check.
- Across five independent NativeAOT processes, nearest-rank first-usable-frame P95 is
  `255.212748 ms` from managed entry and `252.771895 ms` from `Window.Open` to
  `vkQueuePresentKHR` handoff. Completion-observed upper-bound P95 is
  `255.238026/252.797173 ms`. The startup frame has positive metrics, a mounted invariant root,
  one submit/present, a present-fence observation, and a successful non-background readback.
  This is the current Vulkan startup regression reference.
- Synthetic injection-to-present-handoff P50/P95/P99/worst was
  `0.381620/1.348723/1.625866/1.974053 ms`; the `37.333334 ms` P95 limit passes. Completion-observed
  upper bounds were `1.571202/6.193419/7.986581/21.262635 ms` P50/P95/P99/worst and are not the
  handoff gate. Per-kind handoff P50/P95/P99 was pointer `0.346123/0.476438/0.529628 ms`, key
  `0.339610/0.461310/0.518588 ms`, and committed text `0.747760/1.567176/1.711557 ms`.
- Raw latency evidence is `artifacts/reports/s15-q10/summary.json` and
  `artifacts/reports/s15-q10/latency-final-run-*.log`. The focused native SDL acceptance gate reports
  `sdl_poll=1 pointer=1 key=1 text=1 submit=3 present=3 close=1` with clean Khronos validation.
  Wayland presentation feedback is deferred under S16-D03.
- Five direct-KWin scale-1 resize/DPI processes pass the exact repeated
  1.0/1.5/2.0 active-swapchain cycle after the lost-retry correction.
- Linux final-protocol coverage stands at 8 of 8 measured current rows. The
  source remains dirty and full Q10 is not claimed.

- The final five-process NativeAOT validation-layer stage route used an NVIDIA RTX 3080 with driver 610.57.04 on `wayland-0`, the `image-effects` workload, 300 warmups, and 2,000 samples. All five processes exited 0. Median Effects P50/P95/P99/Worst was `207872/218112/948224/1359872 ns`; median Offscreen was `73728/77824/79872/404480 ns`. Every frame reported Effects `scopeCount=16` and Offscreen `scopeCount=8`, with zero drops, exact completed-frame correlation, zero warm Vulkan object and device-memory allocations, and clean validation. The binary was `5,757,936` bytes with SHA-256 `57aeae31abc6214c770f643695a3c407a017cf7098c6691f2d0659f24a5a5c99`; raw logs are `artifacts/reports/s15-q10/stage-timestamp-final-run-{1..5}.log`.
- The canonical dynamic Q10 five-process route after instrumentation measured CPU P50/P95/P99 `5,151,040/5,816,795/7,675,581 ns` and GPU Main P50/P95/P99 `1,553,408/2,023,424/2,296,832 ns`, versus accepted pre-stage `846,848/933,888/946,176 ns`. The diagnostics-enabled query-write tax is `+83.434%/+116.667%/+142.749%`, not an unqualified production regression. Raw logs are `artifacts/reports/s15-q10/stage-timestamp-q10-final-run-{1..5}.log`.
- T04 FailedIdle validation passed 1,000 operations, 10 surface losses, and 3 device losses, then emitted `stage_timestamps=1` after final recovery following a positive Effects event and a successful Offscreen event; sub-resolution Offscreen durations may quantize to zero. The JIT validation stage gate passed 2,000 samples. `artifacts/reports/s15-q10/summary.json` contains `stage_timestamp_followup`. Disabled diagnostics still create no query pool or timestamp commands. Display scanout timing is not measured; nominal refresh remains the accepted S16-D03 fallback.

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
- The SDL polling acceptance gate passes pointer, key A, and committed `é` events through the native queue, product polling, window-ID routing, input dispatch, exact causal submit/present, validation, cleanup, and close.
- Five clean-source true-idle processes pass 60 seconds with zero rebuild, layout, plan, upload, record, submit, present, managed allocation, Vulkan objects, or device memory at median `0.0997%` of one core. The clean stage route passes 2,000 samples with exact 16/8 Effects/Offscreen scopes, zero drops, zero warm Vulkan allocation, and clean validation.
- The clean Goo package is `3,783,856` bytes, the validated Linux bundle is `10,087,660` bytes with exactly three native payloads, and the package-consumer NativeAOT executable is `5,499,784` bytes. API contracts pass 10/10 and core behavior passes 262/262.

- The Khronos-validation TextEditor slot gate passes inline and block pixels, retained editor text, scrolled boundary clipping, zero unsupported diagnostics, zero warm Vulkan allocation, cleanup, and `close=1`.

### Deferred

- Full S15/Q10 exit now waits only on external hardware qualification.
- Windows, integrated-GPU, and second-DPI qualification remain open.

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
