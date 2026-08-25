# Goo Core Implementation History

Status: historical. This file does not track current work. Use `IMPLEMENTATION-PLAN.md` for current
status and remaining implementation.

This archive preserves the complete implementation plan before the active-only reduction on
2026-08-17. The frozen payload starts at the second H1, `Goo Core Vulkan Implementation Plan`, and
runs to EOF. It is byte-identical to the original file. Its SHA-256 was
`502992f75a4ad76bd9a30a1603b33f3e2ddcdbabd75300259e20414084d610f3`.

Completed milestones include the G# 0.4.1 migration and findings audit, requirements and baseline
locks, Vulkan capability and generated ABI work, proof runtime, typed scene and resource foundations,
the direct Vulkan-only/G#-only product cutover at `711fc39`, and initial production text rendering at
`95d172f`. The archived plan below retains its original status language for evidence only.

## Continuing stage history

Add post-reduction completed-stage records in this section, above the divider. Do not edit or append
to the frozen snapshot below.

No post-reduction stage has completed across both required RIDs. S10R's scoped Linux substrate and the
S09R primitive, S11 text, and S12 image Linux implementations are complete. S14 is Linux-complete for
its current scope, including the accepted O16 policy. S17's remaining core mechanism implementation
and Linux requalification are complete. S20 generic retained shader effects are implemented and
qualified on Linux. Current-host T01, T02, T04, and Linux T05 pass. T03 stage/resource and
deterministic scale-1 three-window checks pass, while full T03 remains blocked on the resize-DPI
frame-120 product defect and clean-source evidence. The external Windows, integrated-GPU, and
second-real-DPI hardware matrix remains. The frozen snapshot below
intentionally retains its historical pre-acceptance O16 wording.

### 2026-08-24 current-host T01-T05 checkpoint

- T01 passes from a fresh current-source snapshot: XML merge source completeness, warnings-as-errors build, pack, framework package consumer, and canonical isolated README package compilation.
- T02 passes seven current NVIDIA Wayland package lanes with Khronos validation. Text atlas records 6 evictions and 6 retirements. Path records 3 pressure events, 10 evictions, and 8 reused ranges. Clip mask records 6 pressure events and 24 evictions. Registered fonts, text controls, image pressure, and compiled vectors also pass.
- Fixed shared-queue host synchronization by deferring fence polling, reset, wait, and destruction while queue-worker submit/present calls remain outstanding. The strict two-window path pressure route reproduces no threading validation error after the change.
- Fixed path-atlas tail reuse. Adjacent free ranges coalesce, a safely free tail lowers queued/published prefixes, and actual later consumption alone increments reuse and marks the reused words dirty for upload.
- T03 stage/resource checks pass at 2,000 stage samples and one million image-upload state iterations with zero warm or managed allocation. `.github/scripts/with-kwin-scale-one.sh` provides a reversible verified scale-1 environment on KWin. The canonical 300/2,000 three-window route passes with exact metrics, 2,033 submit/present operations, clean-window zero work, both slots, independent close, zero final resources, and validation clean.
- Resize-DPI uses the same verified environment and reaches exact `1280x720`, `2304x1296`, and `3840x2160` framebuffer states. It is no longer environment-blocked; repeated swapchain shrink/recreate fails the second return to state 0 at frame 120.
- Raw display evidence is `artifacts/reports/deterministic-kwin-scale-one.json`.
- T04 passes 3 windows, 1,000 operations, 10 surface losses, 3 device losses, resource plateau, validation, and post-recovery stage timestamps. API contracts pass 10/10 and core behavior passes 261/261.
- Linux T05 passes generated ABI drift, package/bundle validation, and package-consumer NativeAOT default/window smoke. The package is `3,781,217` bytes with SHA-256 `df9718a48cae0200b75c79253c45be670ddbb2759f067009b974126791625411`. The `5,487,496`-byte NativeAOT executable has SHA-256 `1383ee1231817d13e1a4fce44efa9e31fc1c1c39f258e65a0a0a05a042cd6ace`.
- Raw evidence is `artifacts/reports/t01-t05-current-host.json`.

### 2026-08-24 S07 Effects/Offscreen timestamps and T03/T04 integration

- Kept the existing Upload and Main timestamps. Added Effects scopes around eight backdrop copies and eight composites, and Offscreen scopes around eight layer subtree passes. Main and Upload remain scope-0 wrappers. Dedicated offscreen readback timing now uses graphics-queue timestamp validity directly instead of incorrectly requiring compute timestamp support.
- Fixed the diagnostics query capacity at 2 frame slots x 4 stages x 16 scopes x 2 queries = 256 queries. Stage resolution is asynchronous and fence-owned, with no wait-bit query.
- The final five-process NativeAOT validation-layer protocol used an NVIDIA RTX 3080 with driver 610.57.04 on `wayland-0`, the `image-effects` workload, 300 warmups, and 2,000 samples. All five processes exited 0.
- Median Effects P50/P95/P99/Worst was `207872/218112/948224/1359872 ns`; median Offscreen was `73728/77824/79872/404480 ns`. Every frame reported Effects `scopeCount=16` and Offscreen `scopeCount=8`, with zero drops, exact completed-frame correlation, zero warm Vulkan object and device-memory allocations, and clean validation.
- The NativeAOT binary was `5,757,936` bytes with SHA-256 `57aeae31abc6214c770f643695a3c407a017cf7098c6691f2d0659f24a5a5c99`. Raw logs are `artifacts/reports/s15-q10/stage-timestamp-final-run-{1..5}.log`.
- The canonical dynamic Q10 five-process route after instrumentation reported CPU P50/P95/P99 `5,151,040/5,816,795/7,675,581 ns` and GPU Main P50/P95/P99 `1,553,408/2,023,424/2,296,832 ns`, versus accepted pre-stage `846,848/933,888/946,176 ns`. The diagnostics-enabled query-write tax is `+83.434%/+116.667%/+142.749%`, not an unqualified production regression. Raw logs are `artifacts/reports/s15-q10/stage-timestamp-q10-final-run-{1..5}.log`.
- T04 FailedIdle validation passed 1,000 operations, 10 surface losses, and 3 device losses. After final recovery it emitted `stage_timestamps=1` following a positive Effects event and a successful Offscreen event; sub-resolution Offscreen durations may quantize to zero. The JIT validation stage gate also passed 2,000 samples. `artifacts/reports/s15-q10/summary.json` already contains `stage_timestamp_followup`.
- Disabled diagnostics still create no query pool or timestamp commands, so the measured GPU query-write tax does not apply when diagnostics are disabled. Linux S07 implementation and T03/T04 integration are complete. Windows repeat remains open.

### 2026-08-24 S15 startup, readback, and synthetic input latency follow-up

- Added internal bounded presentation-retirement state: 64 presentation records, 64 completed
  presentation records, and eight retired-generation records. Successful presents receive monotonic
  present IDs. A pending token is attached only after successful `vkQueuePresentKHR` completion,
  callbacks are stored by token rather than callback order, and present IDs plus handoff timestamps
  remain monotonic by token. No public API changed.
- `VK_EXT_swapchain_maintenance1` present fences now provide a later UI-thread
  completion-observed timestamp. That timestamp is an upper bound because polling observes the fence
  after it signals. A route without present-fence support is named `present-handoff-only`, not
  completion observation. Retired generation records and their presentation records are removed after
  their completed anchor, and failed, abandoned, recovery, and device-loss paths cancel pending
  latency tokens.
- The follow-up used five fresh Linux NativeAOT processes on actual NVIDIA hardware, 300 warmups,
  and 2,000 pointer, key, or committed-text input samples per process. The binary was 5,733,280
  bytes with SHA-256
  `d0c6a3968681fd0a2675aaf7c6d45c9ba40c8597d131401b5a918e6346047bc6`. Every process exited 0 with
  zero validation, result-failure, and fatal failures, 2,001 unique tokens, exact one-frame startup
  submit/present, exact 300-frame warmup submit/present, and exact 2,000-frame input submit/present
  deltas.
- Each process proved startup/readback usability with positive logical and framebuffer metrics, a
  mounted invariant root, one startup present-fence observation, and a successful startup readback
  pixel check. On this route, managed-entry to successful `vkQueuePresentKHR` handoff was median
  `226.193175 ms`; window-open to handoff was median `225.551726 ms`. The corresponding
  completion-observed upper bounds were `226.218353 ms` and `225.576904 ms`. These are qualified
  managed-entry/window-open to present-handoff values, not a first-usable-frame P95.
- Synthetic injection-to-present-handoff P50/P95/P99/worst was
  `0.381620/1.348723/1.625866/1.974053 ms` against a `37.333334 ms` P95 limit, so the synthetic
  handoff gate passed. Completion-observed upper bounds were
  `1.571202/6.193419/7.986581/21.262635 ms` P50/P95/P99/worst and are not the handoff gate.
  Per-kind handoff P50/P95/P99 was pointer `0.346123/0.476438/0.529628 ms`, key
  `0.339610/0.461310/0.518588 ms`, and committed text `0.747760/1.567176/1.711557 ms`.
- The fixture applied causal pointer, key, and committed-text mutations. Each input changed only
  its matching counter and one rendered generation. Synthetic `WindowReadbackFixture` injection
  bypassed SDL polling. Actual SDL acceptance and Wayland presentation-time feedback remain open.
- Raw evidence is `artifacts/reports/s15-q10/summary.json` and
  `artifacts/reports/s15-q10/latency-final-run-*.log`.

### 2026-08-24 VKSL-007 Vulkan memory policy

- Added the value-typed `VulkanMemoryPolicy` with the three exact required and preferred mask pairs
  already used by production. Buffer and image factories and allocator entry points now accept one
  policy value while retaining the selector's required-bit filter and preferred-bit scoring.
- Migrated 15 allocation sites: six device-local required, seven host-visible coherent-cached, and
  two device-local required-preferred. The two device-local forms remain distinct to preserve owner
  intent. No object, branch, builder, callback, collection, or per-call allocation was added.
- Release and TestRelease product warnings-as-errors builds, package creation, isolated package
  consumption, offscreen readback, primitive, registered-font, image-pressure, path, clip-mask, warm
  shader-effect, and FailedIdle qualification passed on NVIDIA/Wayland. FailedIdle completed 1,000
  operations, ten surface losses, and three device losses with exact final cleanup.

### 2026-08-24 VKSL-006 Vulkan pipeline factory

- Added `VulkanPipelineFactory` for accounted shader-module, pipeline-layout, and Goo fixed-state
  dynamic-rendering graphics-pipeline creation with complete native and accounting rollback.
- Migrated both graphics-pipeline implementations, all five pipeline-layout transactions, file-backed
  shader modules, and dynamic shader-effect modules from `VulkanSharedPrimitiveState`. Existing
  owners retain shader selection, descriptor and push-range policy, eager or lazy creation, caches,
  teardown, and recovery.
- Raw shader-module, pipeline-layout, and graphics-pipeline construction now remains only in the
  factory and ABI declarations. The implementation adds no builder, callback, collection, delegate,
  or per-call managed object.
- Release and TestRelease warnings-as-errors builds, package creation, and fresh isolated consumer
  publication passed. NVIDIA/Wayland runtime qualification passed TestRelease S09R, S14 effects,
  rounded overflow, warm shader effects, packaged S09R, S13 path, S13 clip mask, and FailedIdle.
  FailedIdle completed 1,000 operations, ten surface losses, and three device losses with zero final
  image and layer residency.

### 2026-08-24 VKSL-005 Vulkan transitions

- Added `VulkanTransitions` for allocation-free image and buffer barrier command emission. Callers
  retain every resource, range, layout, stage, and access policy while the helper owns complete
  zero-initialized native records, ignored queue-family indices, and dependency wiring.
- Passed the unmanaged `vkCmdPipelineBarrier2` function pointer instead of copying the device dispatch
  table. Official G# aggressive-inlining support is applied to the color-range, image, and buffer
  helpers.
- Migrated all 14 image barriers, four buffer barriers, and 18 dependencies. Raw construction remains
  only in the helper and Vulkan ABI declarations.
- Release and TestRelease warnings-as-errors builds, strict lint, package creation, and a fresh
  isolated package-consumer build passed. NVIDIA/Wayland runtime qualification passed S09R, S14
  readback, image pressure, registered-font text, S13 path, S13 clip-mask, S20 warm effects, and
  FailedIdle. FailedIdle completed 1,000 operations, ten surface losses, and three device losses with
  zero final frame, image, and layer state.
- Three-process S20 comparison used 60 warmups and 500 measured frames per process. Median P50 changed
  from 497,488 ns to 488,231 ns. Median P95 changed from 577,378 ns to 583,781 ns inside overlapping
  run ranges. Managed allocation, Vulkan allocation, compile, record, draw, and layer work remained
  identical.

### 2026-08-24 VKSL-004 Vulkan synchronization and command factories

- Added `VulkanSynchronizationFactory` for accounted semaphore and fence creation and
  `VulkanCommandFactory` for rollback-safe command-pool creation plus command-buffer allocation.
  The split keeps synchronization and command-resource responsibilities explicit.
- Migrated frame-slot semaphores and fences, swapchain render semaphores and present fences, and the
  window command-pool plus two-command-buffer transaction. Existing owners retain handles, normal
  teardown, device-loss teardown, and submission policy.
- Kept `VulkanOffscreenTarget` inline because it records each exact `VkResult` and creates the command
  pool and command buffer at different points in its diagnostic transaction.
- Release and TestRelease warnings-as-errors builds, package creation, and fresh isolated consumer
  publication passed. NVIDIA/Wayland runtime qualification passed S09R pixel, package S09R, and
  FailedIdle lanes. FailedIdle completed 1,000 operations, ten surface losses, and three device losses
  with no normal-close device idle and zero final image and layer residency.

### 2026-08-24 VKSL-001 through VKSL-003 Vulkan authoring factories

- Added Goo-internal buffer, image, and descriptor factories under `Goo/Rendering/Vulkan` without
  changing the public API or moving ownership, teardown, recovery, capacity, or generation policy
  out of existing renderer types.
- VKSL-001 centralizes accounted buffer creation, allocation, optional mapping, and complete rollback.
  VKSL-002 centralizes image, image-view, allocation, and rollback transactions. VKSL-003 centralizes
  descriptor layout, pool, set-allocation, accounting, rollback, and the three renderer write shapes.
- Exact-result diagnostic transactions remain inline where the factory exception contract would lose
  required `VkResult` evidence. Normal teardown and device-loss teardown remain separate.
- Release warnings-as-errors, package, isolated consumer, strict lint, and NVIDIA/Wayland runtime
  qualification covered package, text, image pressure, path, clip-mask, shader-effect warm, and
  FailedIdle recovery lanes. Normal lanes ended with zero validation errors, result failures, live
  Vulkan objects, and device memory. FailedIdle passed ten surface losses and three device losses with
  exact cleanup.
- The remaining authoring-library candidates and their current status are tracked in
  `VULKAN-AUTHORING-LIBRARY.md`. They do not change the core release dependency graph.

### 2026-08-24 S15 q10.text-editing fast hit and image-effects diagnosis

- The exact fast hit applies to `Text` and `TextEditor` only. `VulkanTextScene` reuses a positional
  per-node `VulkanRetainedTextSegment` only when the `ShapedText` reference, font size, line
  origin and baseline, packed color, effect mode and parameters, composed parent transform, active
  clip chain, and atlas generation match exactly. A miss keeps the prior glyph generation and exact
  record comparison path.
- `TextEntry` stays on full segment generation and full renderer validation because cached Entry
  proof repeatedly lost S17 protected-mask pixels. The active cache remains strong across atlas
  publication for the same reason. Repository search found no in-place shaped-payload writer,
  which is the shape-reference identity assumption.
- Each segment run retains its maximum normal/effect `ByteRangeEnd`. Fast-hit protection marks each
  referenced atlas active and verifies the run byte bound against the published atlas prefix,
  replacing the prior per-glyph residency scan.
- Eligible `Text` and `TextEditor` segments cache the renderer's full run/glyph structural proof by
  segment version plus atlas generation. Per-reference ID, version, count, clip, bounds, and global
  instance-range checks still run on every call, and the cached prepass still resolves every run.
  Omitting per-run `Resolve` or enabling the proof for `TextEntry` lost protected-mask pixels.
- The follow-up binary is 5,708,704 bytes with SHA-256
  `7751034df36fd2f83db3ef13a175728fddc03f8d875100b05b1b325149324065`. Five isolated NativeAOT
  text processes used 300 warmups and 2,000 measured frames. Process-median CPU P50/P95/P99 was
  `0.497938/0.552471/0.701151 ms`, GPU P95 was `0.054272 ms`, and allocation P50 was `63,184 B`.
  Compared with the prior current CPU `1.201987/1.320821/1.504447 ms`, reductions were
  `58.574%/58.172%/53.395%` for P50/P95/P99.
  Accepted recorded Skia P95 is `0.461491 ms`; the new result is `+0.090980 ms` or `+19.714%`,
  passing the exact larger-of-3%-or-0.1-ms gate by `0.009020 ms`. This does not claim Vulkan is
  faster than Skia.
- All five processes exited 0 with zero validation, result-failure, or fatal failures. Release
  warnings-as-errors, async TestRelease warnings-as-errors, CoreBehavior `261 passed`,
  protected-text NativeAOT, text-transport NativeAOT, text-viewport-cull NativeAOT, effects/COLR
  NativeAOT, and diff-check verification passed.
- Raw evidence is `artifacts/reports/s15-q10/summary.json` and
  `artifacts/reports/s15-q10/text-fast-hit-final-run-*.log`.
- Image-effects component isolation is JIT TestRelease only, with 300 warmups and 480 measured
  frames, not official NativeAOT qualification. Full current P50 was `5.471 ms`; static scene
  P50 was `3.533 ms` with Paint about `3.366 ms`; eight mutations only were `4.759 ms`; one
  same-size replacement was `5.254 ms` with `1.077 ms` layout because `ImageLayouts.Refresh`
  marks Yoga dirty whenever `DecodedImage` identity changes. Disabling all non-normal blend layers
  gave `5.456 ms`, only `0.015 ms` below full. Pixel generation plus immutable `ImageSource`
  copying creates two `262,144-byte` arrays. The dominant CPU cost is the full 256-card,
  1,316-draw scene compile/record path, not the eight blend layers. This remains an optimization
  target and is not claimed fixed.

### 2026-08-24 S15 manifest expansion and Q10 workload qualification

- Implemented and measured the next official Q10 workload suite covering small-animation,
  text-editing, image-effects, and three-window workloads alongside the true-idle baseline and
  canonical virtual table, topology, and mutation workloads.
- Final current NativeAOT binary: 5,708,704 bytes, SHA-256
  `50595ae3be03c22fb42c1adea40801d5a511718f6acdda1ec0622a603eb4171f`.
- Measured across five isolated current-binary processes per workload with 300 warmups and 2,000
  samples each on actual NVIDIA hardware:
  - `small-animation`: CPU P50/P95/P99 `0.528/0.610/0.853 ms`, GPU P95 `0.026 ms`.
  - `text-editing`: CPU P50/P95/P99 `1.202/1.321/1.504 ms`, GPU P95 `0.096 ms`.
  - `image-effects`: CPU P50/P95/P99 `5.283/6.001/7.690 ms`, GPU P95 `0.934 ms`.
  - `three-window`: CPU P50/P95/P99 `0.648/1.463/1.652 ms`, GPU P95 `0.022 ms`.
- All 20 workload processes passed exact local contracts and absolute performance budgets.
- In the three-window workload, global submit/present delta is 2033 (2000 selected frames + 33 actual
  focus-loss dirty renders), while clean local window slots remained unchanged.
- Five isolated nested-KWin scale-1 true-idle processes ran 60 seconds with zero work/allocation and a
  median CPU load of `0.1078%` of one core.
- Relative text-editing regression vs. accepted Skia baseline: text editing has an accepted recorded
  Skia P95 of `0.461491 ms`; current P95 regresses by `186.207%` despite `28.207%` lower P50
  allocation.
- The resize/DPI lane is implemented but blocked on active Wayland/WSI hardware behavior (cannot
  complete exact 1.0/1.5/2.0 swapchain cycle and fails returning to state 0 at frame 60).
- Linux final-protocol coverage stands at 7 of 8 measured current rows. Full Q10 qualification is
  not claimed; source remains dirty.

### 2026-08-23 S15 canonical workload and lifecycle closeout attempt

- Added one durable NativeAOT S15 harness for the canonical 100,000-row by
  12-column virtual table, 5,000-node and 15,000-edge topology, one-of-1,000
  mutation, and full 1,000-box mutation workloads. It records CPU and GPU
  P50/P95/P99/P99.9/worst, managed allocation, retained managed memory, RSS,
  private memory and private dirty, GC collections and pause time, Vulkan
  memory/resource counters, exact submit/present counts, and external power
  proxy.
- The initial Weston Pixman matrix selected the Lavapipe CPU ICD, not the RTX
  3080, and is retained only as discarded environment evidence. The final
  current-binary actual-NVIDIA matrix used five isolated NativeAOT processes per
  workload, 300 warmups, and 2,000 measured frames on KDE Wayland.
  Process-median CPU P50/P95/P99 was `1.247/1.531/3.151 ms` for table,
  `1.641/2.309/4.171 ms` for topology, `1.625/2.106/2.398 ms` for sparse box
  mutation, and `3.749/4.471/5.399 ms` for full mutation. Median GPU P95 was
  `0.305`, `0.161`, `0.010`, and `0.077 ms`. All 40,000 measured frames
  submitted and presented exactly once, with zero warm Vulkan object or
  device-memory allocation.
- Extended the compact failed-idle program to prove both primitive and text
  frame slots, accepted serials, surface-loss continuity, complete device-loss
  reconstruction, post-recovery unseen-text upload, warm zero-copy reuse, and
  zero frame state after close. The Khronos validation run passed the existing
  1,000 operations, ten surface losses, three device losses, and all new S15
  tokens.
- Reconstructed the same canonical public workloads against frozen Skia product
  commit `9d28533`. The optimized actual-NVIDIA table and topology CPU P95 are
  64.957 and 67.874 percent lower. This is not the missing pre-removal recorded
  baseline.
- Lazy first-use material and clip-mask pipelines removed unused hardware-driver
  compiler state. CPU physical devices retain eager materialization so the
  complete cold S14 effects route remains bounded. Against the reconstructed
  control, table retained managed memory, working-set peak, and end private-dirty
  are 42.394, 36.740, and 34.919 percent lower. Topology is 34.112, 35.353, and
  43.437 percent lower.
- Full Q10 memory does not pass. The reconstructed Skia control has no comparable
  Goo-reserved GPU-memory metric. The non-attributable final whole-device proxy
  differs by 9.137 and 10.115 percent, so it cannot satisfy the five-percent
  gate. Full exit also lacks qualifying pre-removal table/topology and
  binary/package records.
- First-use text atlas publication returned `!emitted` with `redrawRequired` on
  frames 1-2, where Paint previously misclassified pending publication as
  unsupported Content. Per-call `publicationPending` now distinguishes
  Text/TextEntry/TextEditor transient publication while permanent unsupported
  diagnostics and incomplete retained snapshots remain.
- Direct `EmitEntry` and `EmitEditor` calls bypassed generic `VulkanTextScene.Emit`
  and left `activeNodeSegments` unset, which broke retained text segments for
  protected text and editors. `VulkanSceneCompiler.Paint` now routes Text,
  TextEntry, and TextEditor through generic `Emit`, and specialized emitters are
  private. Local actual-NVIDIA protected-text passes 3/3, rounded-overflow passes
  3/3, and effects/COLR passes 3/3, alongside cache-disabled passes, CPU Lavapipe
  passes, CoreBehavior 261/261, focused S17 core/text-cull/text-transport/NVIDIA
  FailedIdle passes, zero-warning builds, and approved code review.

### 2026-08-23 focused backend-neutral behavior consolidation

- Moved 261 backend-neutral Cell, reconciliation, Yoga, style, motion, input,
  text, accessibility, and allocation contracts into
  `tests/Goo.CoreBehaviorTests`, with explicit fixture imports and no SkiaSharp
  or `Goo.InternalTextInterop` dependency.
- Deleted the stale 87-file `tests/Goo.Tests` project after preserving the
  backend-neutral contracts and using the focused API/XML and Vulkan gates for
  migrated or duplicate coverage. Added the new Release warnings-as-errors lane
  to CI.
- The migrated pointer-transform contract exposed length-independent
  collinearity tolerance in `PathGeometry.pointOnEdge`. Boundary tolerance now
  scales with edge length, so tiny tessellation edges do not classify distant
  points as lying on a shape.
- The focused suite passes 261 of 261 tests. The deterministic current
  allocation baselines are 192 B for an empty Blob, 1,240 B for an empty Node,
  3,424 B for an empty Window, 106,664 B for the one-MiB editor semantic edit,
  and 259,584 B for 64 intrinsic text-entry edits.

### 2026-08-22 S19 API contract extraction and legacy-suite audit

- Moved the public API approval baseline and complete XML documentation checks into the focused
  `tests/Goo.ApiContractTests` project and added that Release warnings-as-errors gate to CI.
- The first focused run found that G# emitted an internal `ShaderEffect.Changed` event as public
  metadata. Replaced the event with private callback storage and internal subscription methods, then
  verified the intended four-member `ShaderEffect` contract. All 10 focused contract tests pass.
- Classified the 87 legacy suite files as 3 migrated contract files, 31 backend-coupled files, 12
  current-gate duplicates, 37 backend-neutral behavior files, and 4 infrastructure files. The suite
  remains until the 37 backend-neutral files are migrated or explicitly retired.
- Removed the default stale fixture import and the obsolete Dependabot path. Deleted only generated
  `Goo.InternalTextInterop` build artifacts. No tracked helper source existed.

### 2026-08-21 S20 generic retained shader effects Linux completion

- Added one compositional `ShaderEffect` mechanism for defensively owned precompiled fragment SPIR-V.
  `Style.ShaderEffect` applies it to an element and retained subtree without changing layout, hit
  testing, accessibility, transforms, or clipping. Goo exposes no Vulkan handles, descriptors,
  pipelines, compiler objects, or specialized effect widgets.
- The current public surface is one type and four members: constructors for ordinary/backdrop use and
  bounded backdrop outset, allocation-free `SetParameter(int32, Vector4)` over eight retained slots,
  and init-only `Style.ShaderEffect`. Backdrop outset is finite, nonnegative, capped at 256 logical
  pixels, and valid only for backdrop sampling.
- The fixed ABI binds source, optional backdrop, Goo primitive data, Goo clip data, and a 128-byte
  parameter block. The process-shared device-generation pipeline cache is bounded to 32 live program
  identities per target format. The existing offscreen layer pool owns isolation, copying, target
  reuse, clipping, submission lifetime, resize, recovery, and teardown.
- Five isolated Release NativeAOT runs with 300 warmup and 2,000 measured changed frames reported
  `0 B` managed allocation and no warm Vulkan object or device-memory creation. Median CPU was P50
  `187,934 ns`, P95 `255,271 ns`, P99 `314,052 ns`, and P99.9 `448,736 ns`. The comparable S14
  control stayed within the accepted 3 percent limit.
- The accepted JIT and NativeAOT gates passed ordinary source isolation, backdrop sampling, rounded
  clipping, pointer input, resize, display scale, device recovery, package-only sidecar loading, and
  cleanup. The later focused gate also covers bounded backdrop outset. The fixed authoring include and
  SPIR-V sidecar are packaged without a runtime compiler.
- P01 through P03 were rejected allocation experiments. P04 is the accepted Linux result in
  `docs/perf/2026-08-21-vulkan-shader-effects-p04-accepted-linux.md`. Non-normal `BlendMode` plus
  `ShaderEffect`, general masks, and higher-level filters remain separate contract work. Windows T02,
  recovery, package, and NativeAOT repeats remain in S19.

### 2026-08-21 Final local discrete-Linux core qualification and accepted P04 performance iteration

- The final local Linux core wave passed Release WAE, focused S09R/S14/S15/S16/S17, failed-idle,
  ABI, damage-journal, shader, validation, package-consumer, dependency, GLIBC, NativeAOT, and staged
  native-smoke lanes on the RTX 3080 host. S16-D02 is locally complete: one FIFO worker owns the
  physical queue, submit/present calls are isolated from window threads, retryable deferral converges,
  and offscreen device loss clears shared-lease/readback storage. Three binary runs reported
  `accepted=1 device_loss=1 storage_cleared=1 close=1`.
- Five isolated 60-second true-idle runs used 0.0904%, 0.0874%, 0.0938%, 0.0925%, and 0.0914% of one
  CPU core. Each recorded zero rebuild, layout, plan, upload, record, submit, present, managed bytes,
  Vulkan objects, and device-memory allocations, with `close=1`. The final core package is 3,682,963
  bytes, and the staged Linux bundle is 9,911,025 bytes.
- The Linux core completion wave and local S19 qualification are closed on the available discrete host.
  The remaining external matrix is Windows, Linux integrated GPU, clean-clone restore/build, and a
  second real DPI scale. The public API documentation freeze repair and post-core baseline are complete.
- P04 is accepted for strict leaf `Text`: exact cached glyph paint-bound viewport culling and a
  non-boxing `VulkanTextAtlasGlyphKey`, with no public API change. In the 4,900-cell full control
  using 300 warmup and 2,000 measured frames, CPU P50/P95 was `18.077680/18.809680 ms`, worst was
  `62.564055 ms`, allocation was `2,820,666 B/frame`, and `3,711` items were skipped. The baseline
  was `35.022465/53.240000 ms`, worst `78.539000 ms`, and `6,109,729 B/frame`.
- The short GPU control median reported CPU P50/P95 `18.043688/19.618076 ms`, Main GPU
  `2.366464/2.612224 ms`, `2,815,146 B/frame`, and `3,373,177` draws. The baseline was
  CPU `35.723980/55.554462 ms`, Main GPU `7.949312/12.897280 ms`, `6,076,094 B/frame`, and
  `13,900,767` draws. The disabled-readback S14 hot path remains `0 B` at P95 and maximum.
  Full P04 evidence is in
  `docs/perf/2026-08-21-vulkan-performance-p04-exact-text-cull-key-accepted.md`.
- P05 established a five-process 1,000-record primitive-staging control at `1.104663/1.413635 ms`
  CPU P50/P95 and `544,586 B/frame`. P06's extra pre-copy comparison removed 128,000 mapped stores
  but regressed P50/P95 by `1.971%/0.564%`. P07 combined comparison and dirty-range construction into
  one pass and removed the second scan, but still changed P50/P95 by `+0.076%/+0.328%`. Both candidates
  were rejected and removed because neither produced an absolute end-to-end improvement. Evidence is
  in `docs/perf/2026-08-21-vulkan-performance-p05-primitive-staging-before.md`,
  `docs/perf/2026-08-21-vulkan-performance-p06-primitive-staging-copy-skip-rejected.md`, and
  `docs/perf/2026-08-21-vulkan-performance-p07-primitive-staging-single-pass-rejected.md`.

### 2026-08-20 S19 Linux discrete-host qualification

- The available Linux x64 discrete-host lanes passed on an RTX 3080 with driver 610.57.04, Vulkan
  1.4.341, .NET SDK 10.0.111, and Khronos validation. Five isolated true-idle processes each observed
  60 seconds with zero rebuild, layout, render, upload, record, submit, present, managed allocation,
  Vulkan object allocation, and device-memory allocation. CPU use was 0.0870% through 0.1054% of one
  core.
- Normal sibling close now waits target-owned frame and maintenance presentation fences. It uses
  device-wide idle only for final runtime destruction or the safe fallback when present fences are
  unavailable. The three-window close gate added zero device-idle calls and left both siblings usable.
- The compact recovery gate passed three live windows, 1,000 lifecycle operations, retained-resource
  plateau, 10 injected surface losses, 3 sequential shared-runtime device losses, recovered text and
  image upload, offscreen layer reconstruction, independent close, zero stale final resource state,
  and zero validation errors. S17's input, protected-text, and neutral-accessibility gates also passed
  in the same Linux qualification wave.
- Proof host-write visibility and offscreen target barriers were corrected. Device-loss abandonment
  now releases offscreen image, view, and allocator state. The external path-pressure fixture now uses
  six bounded pump pairs per phase and passed three isolated framework-dependent processes.
- The failed-idle project now rebuilds its fixture-bearing Goo reference. Recovery waits for a
  successful submit from the recovering window, so shared sibling activity cannot satisfy the gate.
  Three consecutive fresh-build validation processes passed after the correction. A fourth passed
  after the ABI fixture build and recovery rebuild were executed in the collision-prone order.
- The final NuGet package is 3,675,706 bytes with SHA-256
  `047aefc229a5b08fea28bba115e0d90de8c57fa82648273f3c15b10727efdca0`. The staged Linux bundle is
  9,896,177 bytes. Its `Goo.dll` is 2,409,984 bytes with SHA-256
  `ebd458056a67a43b87570f9c235d83c31bb8112c6eefacc569723e26f30faa95`.
- The Ubuntu 22.04 NativeAOT executable is 5,367,936 bytes with SHA-256
  `8c9b8e8af53f55825918551fe9a0ead8c1428a364f6cb07783de96baa94ec4c2`, uses at most GLIBC 2.34,
  and passed all 11 package-consumer lanes. The exact final framework-dependent consumer passed the
  same 11 lanes. No vulnerable managed package or forbidden payload was found.
- Local S19 qualification is complete on the available discrete Linux host. Windows, integrated Linux,
  clean-clone restore/build, and second-real-DPI coverage remain external. D01, D02, and D04 are local
  completions with external repeats only. Idle and lifecycle evidence does not justify another
  retained-renderer mechanism. P04 closes the strict-leaf text viewport issue for the measured workload.
- Full evidence and exact deferrals are in
  `docs/perf/2026-08-20-s19-linux-qualification.md`.

### 2026-08-20 S17 remaining core mechanisms

- Added the non-breaking `TextEntry.Password bool` public property, defaulting to false. Protected
  entries retain the source value for `Value`, `OnChange`, and `OnSubmit`, but shape and render one
  U+2022 bullet per extended grapheme cluster. Source and mask coordinate maps keep caret movement,
  selection, hit testing, IME placement, and `ElementHandle` text geometry aligned.
- Protected copy and cut are handled no-ops. Paste remains enabled. IME preedit stays transient and is
  not retained or shaped as entry content. Committed text enters once and updates the mask once.
- Neutral accessibility semantics always redact a protected entry, including when a consumer supplies
  explicit value metadata. The semantic selection and caret use mask coordinates, and incoming neutral
  selection actions map back to source grapheme boundaries.
- The live Linux protected-text gate passed with `graphemes=3,8`, exact mask/control pixel equality,
  geometry, clipboard, IME, semantic redaction, masked selection coordinates, diagnostics, and clean
  close. The live core-behavior gate passed pointer, keyboard, focus, hover, active and disabled style
  states, wheel scrolling, motion, transitions, public handle geometry, neutral actions and states,
  diagnostics, and clean close.
- A fresh `Goo.0.2.0` package built with warnings treated as errors and restored through an isolated
  NuGet cache. Its Wayland text-controls lane passed with `mounted=1 focused=1 pumps=12 selection=1
  composition=1 caretFollow=1 reopen=1 drawCount=807 close=1`. Its S09R lane passed with `mounted=1
  scroll=1 drawCount=81 planCompileCount=3 recordCount=3 close=1`.
- The public API baseline and generated API documentation include `TextEntry.Password`. The changelog
  and release-lane guide record the behavior and the two S17 gates.
- O12 and R09 remain authoritative: Goo owns the neutral semantic tree and adapter contract. UIA and
  AT-SPI object models remain platform-adapter work outside the current core renderer wave. Native
  focus or raise remains optional because no accepted flow requires it. A public scroll range remains
  conditional because current public scrolling primitives passed requalification.
- Windows behavior and packaging repeat in S19. Reopen S17 only if that qualification finds a core
  contract defect or an accepted consumer proves one of the conditional mechanisms is required.

### 2026-08-20 S16 shared runtime and window behavior first scheduling slice

- The accepted S16 contract is implemented as one process-wide fair scheduler with per-window
  high-resolution fractional deadlines. Cadence derives from the current SDL display, supports
  different and fractional refresh rates, resets on display, mode, and lifecycle changes, and retains
  the last valid display sample through transient invalid queries. Timer-only scheduler service banks
  simulation time for the next frame while wall time remains exact.
- Dirty idle windows submit zero frames after initial work. Minimized, occluded, zero-framebuffer,
  unavailable-swapchain, and GPU-deferred windows are skipped in the implemented polling paths and do
  not delay siblings. Closing the owner window does not strand live siblings.
- `Window.VSync` is public and per-window and now reaches swapchain recreation. `true` selects FIFO;
  `false` selects Immediate, then Mailbox, then FIFO, never FIFO_RELAXED. Both modes remain display-rate
  paced under `Window.Run`. Manual `Pump` and `PumpScheduled` remain caller-paced. The internal uncapped
  benchmark seam remains private.
- Frame-slot fence/acquire waits and swapchain-recreation presentation waits now poll and defer. This
  first-slice record predates the final local S19 close-isolation and queue-worker qualification below.
- Final integrated deterministic pacing output is `rates=60,144,60000/1001 anchored=1 reset=1 defer=1
  uncapped=1 presentModes=1`. The real VSync transition output is `initial=fifo off=immediate
  generations=3 close=1`. The live two-window VSync-off gate ran for 552 ms at 144.001 Hz with 62
  active submissions, 2 idle submissions, and an 88-submission bound. The fresh three-window package
  smoke output is `presentCount=6, resultFailureCount=0, validationErrorCount=0, fatalCode=0` with zero
  resources. Default readback and S09R/S14 passed. No performance improvement is claimed.
- No Vulkan validation layer is installed in the current Linux environment. The accepted first Linux
  scheduling scope was complete at this checkpoint. Final local close isolation, queue-worker behavior,
  recovery, and S19 qualification are recorded in the 2026-08-21 entry above; only the external matrix
  remains.

### 2026-08-20 S15 retained scene and damage first slice

- Scene chunks now carry stable owner, topology, and content identities. The generic partial-safe path
  uses those digests only as prefilters, then requires exact retained draw metadata, bit-exact solid,
  rounded, or per-edge border scalar records, bounds, and resource identities before reuse. The compiler still rebuilds
  the CPU typed arrays on each demanded frame and writes one staging candidate. The new primitive SSBO
  slice uses 128-byte std430 records,
  device-local storage, mapped staging, two fence-safe per-window slots, and one offscreen slot.
- Each slot keeps exact accepted record history and commits it only after accepted submission or
  submission reconciliation. Buffer growth and device loss invalidate history. First use, buffer
  generation changes, and record-count changes force full uploads. Exact record comparison coalesces
  consecutive dirty records into 128-byte ranges. Clean frames issue zero GPU copy ranges and zero
  flushes while still rebuilding the CPU scene and writing one staging candidate.
- Each window now owns a bounded scene damage journal. Each swapchain image owns pending and applied
  scene versions. Successful presentation records pending state, and reacquisition of defined image
  contents promotes it to applied state.
- The accepted CPU retained leaf slice is strict: leaf `Container` and `Button` nodes with solid or
  rounded box paint can append an exact cached record on a direct hit. An exact miss performs a direct
  exact rebuild and refreshes the owner record. Exact validity uses owner/node identity,
  `ScenePaintVersion`, bit-exact logical bounds, node kind, packed color, opacity, and radii. Generic
  `ContentKey` or `TopologyKey` hashes do not validate exact leaf records or exact-rebuild damage.
- The strict border-only extension admits a transparent leaf `Container` or `Button` with a solid,
  square per-edge border. It caches one exact logical `PerEdgeBorderRecord`, including bounds, four
  widths, four zero radii, four packed colors, style, and transform index. Unsupported rounded border
  state clears the record, uses generic compilation, and recaptures when square eligibility returns.
  One retained scene draw expands to as many as four primitive records. The focused gate changes one
  edge color and proves one dirty 128-byte primitive record, bounded damage, exact pixels for all four
  edges, generic fallback, recapture, and a final warm hit. It emits `exact_border_leaf=1`.
  The accepted hot path checks common eligibility once, constructs the exact record once, and passes
  the same value to exact comparison or direct rebuild.
- The strict own-box extension also admits a child-bearing `Container` or `Button` when its own paint
  is an eligible solid or rounded box. Only the parent's own logical record is retained or directly
  rebuilt. Children always recurse through generic compilation. Unsupported parent state clears the
  retained record, uses generic parent and child fallback, and recaptures when eligibility returns.
  The focused fixture covers parent hit, rebuild, fallback, child continuation, and recapture and
  emits `parent_own_box=1`.
- Stable-topology solid and rounded boxes plus square solid per-edge borders can clear and replay one
  coalesced damage region in original visual order. All unproven dependencies retain the required
  full-redraw fallback.
- The damage journal stores exact scale float bits and physical extent per version. Scale or extent
  changes force full damage, including scale plus mutation. TestRelease directly records the exact
  last successfully presented image index, acquired applied version, assigned pending version, and
  promotion result. This state is paired with the actual frame damage and is not a `sceneVersion - 1`
  reconstruction. Pixel checks remain a separate offscreen replay oracle. Full-redraw frames now
  record their physical key before the full override, so reacquiring an older swapchain image does
  not invent a scale transition. Partial-safe classification does not depend on swapchain
  transfer-source support for normal-blend solid and rounded scenes. Actual unsupported non-normal
  blend use still forces the existing full fallback.
- The new `GOO_VK_DAMAGE_JOURNAL=1` ABI gate passes same-key, scale-only, extent-only, independent
  scale-transition, unchanged-key no-damage, unchanged-key mutation, bounded logical mutation,
  eviction-gap, reset, and abandoned-version cases.
- The stronger Linux TestRelease gate passed with `first_use_full=1`, `box_mutation=1`,
  `partial_damage=1`, `bounds_old_background=1`, `topology_add_full=1`, `topology_remove_full=1`,
  `exact_leaf_solid_rounded=1`, `exact_color_miss=1`, `exact_bounds_miss=1`, `exact_border_leaf=1`,
  `unsupported_fallback_recapture=1`, `parent_own_box=1`,
  `primitive_first_full=1`, `primitive_slots=2`, `primitive_warm_copy_zero=1`,
  `primitive_staging_candidate=1`, `primitive_mutation_dirty=1`, `primitive_mutation_written=128`,
  `primitive_topology_full=1`, `image_version_promotion=1`, `damageCount=28`,
  `dirtyChunkCount=0`, `reusedChunkCount=7`, `drawCount=198`, `recordCount=28`,
  `clipWritten=3664`, `clipSkipped=6336`, `clipMapped=10`, `clipFlushes=10`, `clipReuse=18`,
  `clipRetained=1`, `close=1`. It proves old bounds clear to the background, old-plus-new bounds
  union damage, topology full redraw, and the primitive one-box result of one dirty record, one range,
  128 copied bytes, and one flush. Both window slots clean-reuse. The effects and rounded-overflow
  gates also passed.
- The no-clip typed payload slice retains two fence-safe per-slot payloads. Frames are eligible only for
  zero masks, one clip chain, zero layers, and matching draw count, byte count, capacity, and buffer
  generation. First use, masks, layers, changes, abort, recovery, and device loss use the write and
  flush fallback. The physical `maxStorageBufferRange` is carried through `VulkanSharedRuntime` to
  both window and offscreen paths. uint64 validation bounds combined words to `Int32.MaxValue` and
  payload bytes to that physical range before int32 indexing or casts.
- Hostile review closed offscreen accepted-submit reconciliation, failed-submit reset, device-loss,
  adopted-request, reused-request, and close-retry lifetime paths. Final review found the paths safe,
  and the default readback plus failed-idle recovery gates passed after the fix.
- Historical 60-process Linux data covered 7,200 frames with 60 clean exits and zero result failures.
  It measures retained damage only: each 1,000-box process used 151 frames with exactly 2 mapped
  writes and flushes, 149 retained reuses, `96,224` written bytes, and `7,168,688` skipped bytes.
  Retained-versus-full MainPass GPU results stayed 91.1% faster for 1 changed box, 77.8% for 100,
  44.4% for 500, and 0% for 1,000. This historical matrix is not a pre/post product-binary or
  full-frame/GPU comparison. No long benchmark harness is retained. The method and results are in
  `docs/perf/2026-08-20-vulkan-s15-first-slice-linux.md`.
- The final fresh current-binary control includes exact generic chunk proof and compares the retained
  leaf compiler with an output-neutral generic fallback. Each workload uses six case-isolated fresh
  processes in ABBAAB order, three per arm, with 30 warmups and 120 samples over 1,000 leaves. Every
  cell allocates `0 B`, matches output hashes, and reports 1,002 chunks and 1,000 draws. Improvement
  relative to the generic control is `+17.367%` P50 and `+20.033%` P95 for static solid, `+18.911%`
  and `+1.225%` for static rounded, `+37.954%` and `+6.665%` for mutation N1, `+14.698%` and
  `+16.249%` for N100, `+31.689%` and `+17.178%` for N500, and `+13.321%` and `+12.634%` for N1000.
- An intermediate before direct exact rebuilds reported N1000 `-13.618%` P50 and `-44.275%` P95. It
  was rejected and is not accepted evidence. The current control is CPU scene-compile timing only,
  not a historical pre/post product binary or a full-frame/GPU result.
- An exploratory current-binary, plan-only ABBAAB control used 1,000 eligible parent boxes and 1,000
  generic-compiled children, with 30 warmups and 120 samples per process. Both arms produced hash
  `10921959993146536336`, 2,002 chunks, 2,000 draws, and `0 B` allocations at P50 and P95.

  | Fresh process | Retained P50/P95 ns | Generic P50/P95 ns |
  |---|---:|---:|
  | 1 | `2067689 / 2574675` | `2713707 / 3939820` |
  | 2 | `2017164 / 2655698` | `2724658 / 3069288` |
  | 3 | `740817 / 2794309` | `2695764 / 2936678` |

  The median cross-process improvement was `+25.668%` P50 and `+13.475%` P95 for retained versus
  generic. Record, submit, GPU, and full-frame evidence was unavailable. This makes no Q10 or Skia
  claim and retains no long benchmark harness.
- A current-binary plan-only ABBAAB border control used 1,000 transparent square solid four-sided
  border leaves, 30 warmups, and 120 samples per fresh process. Both arms produced hash
  `5436057910800725072`, 1,002 chunks, 1,000 scene draws, and `0 B` allocations. Those draws expand
  to 4,000 primitive records. Median retained P50/P95 was `1882942 / 1972601 ns`. Median generic
  P50/P95 was `2043204 / 2202644 ns`. Retained was `+7.844%` faster at P50 and `+10.444%` faster at
  P95. Record, submit, GPU, and full-frame evidence was unavailable. This makes no Q10 or Skia claim
  and retains no long benchmark harness.
- The corrected border control before the one-record hot-path optimization measured retained
  `1967740 / 2718316 ns` and generic `2376561 / 2518809 ns`. Its `+17.202%` P50 improvement came with
  a `-7.921%` P95 regression, so it was rejected. Removing duplicate width resolution and repeated
  finite/visibility work produced the accepted result above.
- The legacy 4,900-cell StocksGrid workload was recovered into the TestRelease fixture and measured
  with six current-binary ABBAAB processes, 30 warmups, and 120 samples per process. Both normal S15
  and forced-full arms produced full redraws for all 120 measured frames, 4,902 dirty chunks, zero
  reused chunks, and `6,075,995 B/frame` of current-thread allocation. Median normal versus
  forced-full total-frame P50/P95 was `35.040/56.016 ms` versus `35.517/56.015 ms`. Each process
  recorded 739,900 text fallbacks. This is pre-P04 historical evidence, not a current claim about the
  strict-leaf text workload. P04 supersedes it with exact cached-glyph paint-bound viewport culling.
- Goo and `Goo.AsyncReadbackSmoke` Release warnings-as-errors builds reported 0 warnings and 0 errors.
  Default async readback, the S09R pixel gate, S14 effects, rounded overflow, FailedIdle, and proof
  scene readback passed on the real Wayland run. No Vulkan validation or Windows qualification claim
  is made. The effects gate's Shape outer-shadow probe moved from x129 to x128, still outside the
  x126 shape edge, after the old point landed in the lavapipe blur tail and produced a false negative.
- Swapchain maintenance is mandatory at physical-device selection. The unsafe no-fence fallback is
  retired. Windows qualification remains S19.
- At this historical checkpoint S15's broader Q10 virtual-table/topology harness and general retained
  resource/range work were not yet closed. The later P04 entry above closes the measured strict-leaf
  text viewport issue. No validation or external hardware claim is made by this checkpoint.

### 2026-08-19 S14 Linux clipping, compositing, and effects continuation

- Mixed-axis `OverflowX` and `OverflowY` now use retained square path-mask strips on the visible axis.
  Rounded hidden and scrolling masks, scrolling offsets, affine transforms, nested arbitrary clips,
  text, image content, stable IDs, and ancestor chains remain intact. The focused Linux gate passed
  horizontal and vertical mixed overflow, eight corner samples, and three asynchronous readbacks with
  `readbackCount=3`, `drawCount=488`, `planCompileCount=14`, `recordCount=14`, and clean close.
- The readback failure caused by independent clip-mask atlas generation is fixed. Mixed-axis atlas
  growth can advance its internal generation without matching the shared runtime generation. Clip frame
  descriptors own that generation, and the offscreen target no longer rejects a valid readback.
- Container and Button BoxShadow stacks now pass outer, inset, and stacked pixel assertions with
  reverse-list order, signed spread, non-negative blur, rounded geometry, opacity, affine transforms,
  active ancestor clip chains, conservative bounds, and collapsed inset-hole handling.
- Shape fill and stroke silhouettes now use retained masks for outer and inset shadows. Blurred plain,
  rich/editor, and COLR text shadows use retained monochrome glyph resources and a bounded nine-sample
  Gaussian approximation. Shape morphology and high-radius text blur remain documented visual-quality
  follow-ups.
- Vulkan outlines now pass the focused effects pixel assertion for non-Shape nodes with width, color,
  offset, rounded geometry, opacity, transforms, and expanded conservative bounds.
- Nested normal group opacity and all 15 non-normal public blend modes use bounded sampled layers.
  Sequential source and backdrop targets reuse safely within one command buffer without raising the
  pool cap. Parent and nested active targets remain leased through submission and recovery.
- The consolidated local Wayland effects gate passes Container, Button, and Shape outer/inset shadows,
  blurred plain and COLR text shadows, outline, nested group opacity, representative Multiply, Screen,
  Overlay, and Difference blends, rounded and arbitrary clips, transforms, COLR, two readbacks, and
  clean close. It reported `layerPassCount=72`, `layerCompositeCount=72`, `layerCreateCount=8`,
  `drawCount=964`, `planCompileCount=12`, and `recordCount=12`.
- Goo, `Goo.AsyncReadbackSmoke`, and `Goo.FailedIdleSmoke` Release warnings-as-errors builds pass. The
  mixed-axis gate still reports `readbackCount=3`, `drawCount=488`, `planCompileCount=14`, and
  `recordCount=14`. The failed-idle gate reports `create=7`, `pass=11`, `composite=11`, zero layer
  failures, and zero final resident targets or leases.
- The existing-surface audit filled the public `BoxShadow` gap for `Text`, `TextEntry`, `TextEditor`,
  and `Image` through the retained analytic rectangular shadow path. The consolidated effects gate now
  includes one unobscured Text box-shadow pixel assertion in the x160..272, y108..136 region and passes
  with `shadows=container,button,text,shape,outer,inset,stacked=1`, `readbackCount=2`,
  `layerPassCount=72`, `layerCompositeCount=72`, `layerCreateCount=8`, `drawCount=964`,
  `planCompileCount=12`, `recordCount=12`, and `close=1`.
- Shape Outline remains excluded by the public contract because Shapes do not paint box outlines. SDL
  Vulkan loader acquisition now occurs before SDL window creation, with a host-owned lease reused by
  target bootstrap and recovery and released after window teardown.
- Ubuntu 22.04.5 validation under Weston, lavapipe, and Khronos layers passes the same effects and
  mixed-axis gates with no validation, result, or fatal Vulkan error. The Ubuntu failed-idle lane still
  has its pre-existing image upload/final-release assertion failure, with no Vulkan validation or
  layer-lifecycle failure, and remains outside this S14 change.
- The final Linux x64 stripped NativeAOT effects gate passes. Its executable is `4,489,488` bytes with
  SHA-256 `048e7d6c9d6e60d94f8556b1160cf25fee0f66afa169f95667d8a0498cf2723a`.
- The LayerSubtreeBounds audit found conservative transformed subtree and shadow unions without active
  viewport or ancestor-clip intersection. This can over-allocate clipped opacity or blend layers, but
  the current effects gate reports zero layer-pool failures. Bounds tightening is deferred as a bounded
  resource-safety follow-up.
- Linux O16 capability and baseline evidence is recorded in
  `docs/perf/2026-08-19-vulkan-aa-o16-linux.md`. The fixed analytic-coverage policy is accepted for
  both required platforms; general masks, filters, and custom effects remain future planned work, and
  Windows qualification remains in S19.

### 2026-08-19 S14 O16 fixed analytic-coverage policy

- O16 is accepted: Goo ships one fixed analytic-coverage antialiasing policy shared by Windows and
  Linux. All product Vulkan targets and pipelines remain single-sampled. No MSAA, runtime AA modes,
  per-window AA settings, fallback chains, or automatic strategy switching are permitted.
- This supersedes the older Skia/OpenGL 8x-MSAA request and fallback direction. The proof-only layered
  MSAA4 candidate retained analytic coverage, raised the GPU median from `10,528 ns` to `14,176 ns`
  (`+34.65%`), added two resources, and used a nominal `65,536 B` intermediate attachment. It was
  rejected as a product direction; the comparison code was ephemeral and deleted.
- S14 is Linux-complete for its current implementation scope. This record does not claim Windows
  verification. Final T02 visual/performance/memory evidence and Windows qualification remain S19
  release gates and may reopen O16 only on a measured failure of the accepted policy.

### 2026-08-19 S14 Linux rounded overflow clipping

- Both-axis rounded `Overflow.Hidden` and `Overflow.Scroll` now use the retained S13 path-mask atlas.
  Each node owns one mutable unit-viewbox path with 12 quadratic segments. Unchanged geometry reuses
  the same arrays, path identity, encoded bands, and mask region without rebuilding a temporary path.
- Rounded overflow has a distinct stable-ID namespace below the shape-paint namespace. Normal scene
  owner IDs are capped below both mask domains. Radius or layout changes update the existing geometry
  revision and dirty the retained mask region without creating a new logical path identity.
- Node backgrounds, borders, and shadows keep their native analytic coverage. The rounded mask applies
  to node-owned image or text content and descendants, while an axis-aligned rectangular scissor keeps
  raster work bounded. Affine rounded clipping uses the mask without an invalid screen-space scissor.
- The focused public G# gate covers rounded square-Shape self-content, a scrolling viewport with an
  overflowing descendant, eight corner samples, public scrolling, two full-frame async readbacks,
  and clean close. The local NVIDIA Wayland run and Khronos 1.4.357 validation run each reported
  118 draws, 12 plan compiles,
  12 command records, two readbacks, zero unsupported-scene events, and clean Vulkan teardown.
- Mixed-axis overflow and effect interaction remain active S14 work. Windows qualification remains in
  S19.

### 2026-08-19 S09R Linux public primitive completion

- One shared public G# scene now drives the fresh NuGet package smoke and the TestRelease-only Vulkan
  readback gate. It covers solid and rounded boxes, solid, dashed, and dotted per-edge borders,
  two-stop radial and four-stop linear gradients, nested transforms, rectangular clips, scrolling,
  visibility, leaf opacity, and overlapping stack order.
- The pixel gate captures the complete DPI-scaled framebuffer twice through the internal request-only
  readback seam. Interior samples use bounded channel tolerances, dashed and dotted borders require
  both coverage and gaps, and the second capture proves a scrolling leaf moved while its clipped
  sliver remained visible.
- Two normal local Wayland runs and one run with Khronos validation passed. The final validated run
  reported two readbacks, positive draw, plan-compile, and record work, zero unsupported-scene events,
  zero validation or result failures, and zero live Vulkan objects after close.
- A fresh `Goo.0.2.0.nupkg` consumer passed `GOO_NATIVE_S09R_SMOKE=1` with `drawCount=108`,
  `planCompileCount=4`, `recordCount=4`, mounted geometry, scroll-once public geometry, and clean close.
  The production compiler and typed scene-recording gates remain zero-allocation.
- Two through four gradient stops remain the supported bounded contract. Larger stop counts are
  diagnosed and emit no draw. Windows repeats the public package and pixel matrix in S19.

### 2026-08-19 S13 Linux path and compiled-vector completion

- Public line, quadratic, cubic, and elliptical-arc paths normalize into retained quadratic geometry.
  The same normalized source drives adaptive CPU bounds, fill containment, stroke outlines, hit testing,
  and Vulkan analytic-band encoding for NonZero and EvenOdd fills.
- The Vulkan path pipeline uses generated and validated SPIR-V, affine-aware outside-fringe coverage,
  scale-aware root tolerances, endpoint ownership, and ordered fractional EvenOdd intersections.
  Solid, linear-gradient, radial-gradient, and sampled-image path paints render through the production
  package without Skia or CPU rasterization.
- Retained strokes cover butt, round, and square caps, miter, round, and bevel joins, miter limits,
  dash offsets, closed seams, and tiny intervals. Exact-scale outlines flatten at 0.25 logical-pixel
  tolerance and retain at most eight variants per source. CPU hit testing uses the same outline and
  shared conservative miter extent. Retained `Shape.CornerRadius` uses the shared rounded silhouette
  for fill rendering, stroke generation, and hit testing.
- Arbitrary `ClipPath` rendering uses per-window retained R8 coverage-mask atlases with an RGBA8
  fallback, stable mask identity, two-slot frame data, eight-mask ancestor chains, abort-safe image
  layouts, and resize/device-loss reconstruction.
- Path identities use exact logical ID plus geometry revision ownership. The process-shared 256 KiB
  path atlas has per-window references, upload-before-publication, redraw fanout, fence-safe eviction,
  free-range reuse, path diagnostics, cleanup, and device-loss reconstruction. Safe range reuse queues
  only the bounded dirty word interval or its union with the unpublished suffix. Abort-before-reclaim,
  fence-overlap, upload-before-publication, and noncoherent flush gates remain enforced.
- The latest fresh-package Khronos Wayland path gate mounted and closed cleanly with
  `pressureEvents=3`, `eviction=10`, `retiredWords=0`, `reuse=8`, and `close=1`.
- The final fresh-package Khronos Wayland compiled-vector gate reported `static=1500`,
  `animatedTracks=7`, `morphCurves=12`, `plan=25`, `record=25`, `draw=460`, `pathRetired=6338`,
  `pathReuse=59`, and `mounted=1`. The warm `PATH_MORPH_GATE` reported `allocated=0`.
- GCV1 v1 is an 11-section little-endian compiled-vector format. `Goo.SvgCompiler` 0.2.0 owns
  build-time SVG parsing, normalization, paint lowering, animation filtering, topology validation,
  and deterministic output. Static, controlled-animation, and compatible-morph fixtures compile to
  unchanged repeated SHA-256 output. Goo consumes immutable G# asset views and retained transform,
  opacity, color, stroke, keyframe, loop, and morph playback.
- The clip-mask atlas is limited to 32 MiB per window and now has serial-safe stale-region eviction
  keyed by completed submission serials. Active and in-flight mask usage remains protected. The
  package pressure lane records pressure events, eviction counts, pressure failures, resident bytes,
  region counts, and cleanup, and requires pressure and eviction without pressure failures. Eight
  simultaneous full-screen 4K masks remain unqualified. Fractional EvenOdd evaluation now stores
  and insertion-sorts up to 32 roots in bounded local storage, folds saturated roots into parity,
  and falls back to the original exact O(k^2) traversal on overflow. The final exact-semantics shader
  solves each candidate's roots once, evaluates both ray directions in one candidate traversal, keeps
  only four bounded distance arrays, and selects monotonic bands with a boundary-preserving binary
  search. NonZero ordering and the exact EvenOdd overflow path are unchanged. The final
  `path_band.frag.spv` is `91,752` bytes with SHA-256
  `77abc9860c16f672c7d6d3d3e9524c13bc58cf814124d139034edcabd82e01d8`.
- The exact local Linux Wayland and NVIDIA RTX 3080 Release 512-hole gate used one 1,800 by 1,800
  EvenOdd path, 180 demand-active frames, and the retained final 30 MainPass timestamp samples.
  The reproduced pre-change P95 was `14.759936 ms`. Three final runs measured MainPass P95
  `7.779328 ms`, `7.833600 ms`, and `7.835648 ms`; their P99 values were `7.814144 ms`,
  `7.838720 ms`, and `7.836672 ms`. All pass the `8.33 ms` P95 and `16.67 ms` P99 gates with
  zero managed allocation, validation errors, result failures, fatal records, or dropped validation
  messages. This is a `46.9%` P95 reduction from the reproduced baseline. The bounded diagnostics
  rings retained the final 30 samples and reported the expected trace/result overwrites from the
  180-frame run.
- The durable ABI gate retains the deterministic 256-hole corpus with `1,028` curves, `13,508` words,
  32 horizontal and vertical bands, 64 warm encodes, stable identity, and zero managed allocation.
  The temporary 512-hole harness and exact temporary artifacts were deleted after recording evidence.
- Ubuntu 22.04, Weston 9.0.0, lavapipe, and `VK_LAYER_KHRONOS_validation` 1.3.204 passed the final
  fresh-package path, clip-mask, and compiled-vector lanes. The local stripped NativeAOT
  compiled-vector executable is `5,277,640` bytes with SHA-256
  `f0c036636785aaa4539859d26a407ef0695ea3ad5523a86528cd110b7285e4e3`; its 37-file directory is
  `19,458,308` bytes. The final NuGet package is `3,636,905` bytes with SHA-256
  `d409d60e47673dc39ba43409aca2cf8eeb49993d7866c5ca9ed6243ed6fe7085`. Its RID-specific consumer
  passed the path, clip-mask, and compiled-vector lanes. The validated 38-file minimal Linux bundle is
  `9,779,787` bytes. Windows repeats the complete matrix in S19.
- The production shader mirror now byte-matches all 17 generated SPIR-V modules and the manifest.
  `Goo.ShaderGen check` enforces both generated determinism and the production mirror. Synchronizing
  eight stale production modules exposed one false-positive Shape shadow sample from the old
  rectangular shader; the corrected sample targets the actual offset diamond tip. S09R primitives,
  rounded overflow, and the complete S14 effects readback gate pass with the synchronized shaders.

### 2026-08-19 S12 Linux image completion

- Provider-backed direct and background images now use owner-thread completion, monotonic content
  versions, stale-completion rejection, terminal failure at a fixed version, targeted invalidation, and
  exact lease release. The v1-v4 package lifecycle, weak provider sweep, logical ID stability, rollback
  rejection, fit modes, and asynchronous publication gates pass.
- Providers own decoded immutable premultiplied RGBA pixels. Goo retains active leases and does not add
  a duplicate decoded-image cache. File codecs and runtime path decoding remain optional providers.
  Product image sampling is fixed linear. Sampler choice stays outside the public API and image identity.
- The process-shared Vulkan image owner keys resources by provider, source, version, format, and device
  generation. It shares immutable pipeline and sampler state, bounds GPU residency at 64 MiB, preserves
  current references, evicts by LRU, retires through upload and last-use fences, and reconstructs after
  device generation replacement.
- The fresh isolated-package Wayland pressure gate reported a 67,108,864-byte budget, 62,914,580 peak
  resident bytes, 551 peak image-subsystem objects, six evictions, six retirements, and zero resident
  bytes and live image objects after close.
- The focused Linux recovery gate reported a 16-byte image reupload into generation 2 after injected
  device loss, a 16-byte resident peak, 519 peak image-subsystem objects, and zero image residency and
  live objects after close. It also preserved the existing text, surface-loss, terminal failed-idle, and
  second-open rejection checks.
- Warm sampled-image proof recording remains allocation-free and the retained nearest/linear proof
  digests remain `2726448270383127845` and `10848324327350558369`. Nearest sampling is internal proof
  capability, not a public product mode. Windows repeats provider, pressure, recovery, package, and
  lifecycle qualification in S19.

### 2026-08-19 S11 Linux text completion

- The accepted private HarfBuzz 14.3.1 and hb-gpu stack is implemented and qualified on Linux. It
  includes registered TrueType, CFF OpenType, TTC, and OTC fonts; style, variation, collection, and
  fallback selection; Unicode 16 segmentation and scripts; bidi; passive and rich text; entry/editor
  behavior; caret, selection, scrolling, and IME geometry; COLR/CPAL v0/v1; sharp shadows; and text
  stroke through 4 pixels. Goo core contains no C# and no runtime `StringInfo` dependency.
- Text residency uses a bounded eight-page LRU atlas set with stable identities, upload-before-
  publication, fence-safe recycle and retirement, aggregate process diagnostics, and device-generation
  reconstruction. The 8 KiB pressure lane reported eight pages, 65,536 resident bytes, 40 live atlas
  objects, 97,704 recorded upload bytes, six evictions, six retirements, 136 draws, and clean close.
- The focused provider ABI reported `shapeRequired=9`, `glyphRequired=2880`, warm workspace reuse, and
  disposed rejection. The text-controls lane passed CJK, RTL, combining, ligatures, wrapping, rich
  presentation, selection, composition, caret follow, window reopen, 807 draws, and clean close.
- Khronos validation passed the registered-font package lane and two-window failed-idle recovery with
  zero validation errors, result failures, or fatal records. Recovery reported one surface and device
  recovery, 124,664 atlas upload bytes, 180 draws, ten presents, restored text and geometry, and terminal
  second-open rejection. The synthetic submission-loss hook drains the real healthy device only in the
  test path. Product device-loss cleanup follows ordered child, device, messenger, and instance
  destruction.
- The final package is `3,264,796` bytes with SHA-256
  `44bc9d28ad5d4744d22920a97addd73c1ba130607d8fe467301b1b64500a0e0a`. Goo.dll is `1,919,488`
  bytes with SHA-256 `c0bbcbca178feb649641772826470e53acc66c60f928c0edcf940f9da3f21d64`.
  The 33-file staged Linux bundle is `8,633,982` bytes. The validation-active NativeAOT text-controls
  executable is `4,418,544` bytes with SHA-256
  `a8f08dc645bd4ea88018063453ef511bd3757c729e2a63da92d16228f2707093`; its 32-file output is
  `16,414,316` bytes.
- Exact post-recycle pixels, blurred text shadows, and COLR paint effects remain with S14. Inline and
  block editor slots wait for child clip lifetime. The 4-pixel stroke limit is fixed until evidence
  reopens it. CBDT/CBLC, sbix, SVG fonts, and hyphenation remain outside the accepted corpus. Windows
  repeats the package, corpus, atlas, recovery, and NativeAOT gates in S19.

### 2026-08-18 Linux qualification subgates

- S10R's Linux substrate is complete for the current allocator, upload, identity/registry, descriptor,
  image, text-atlas, and existing shared-immutable owners. The scope covers memory admission, upload
  visibility, generation tags, immutable publication, byte counters, pressure admission, and fence-safe
  retirement. Future text/image cache and atlas policy remains with S11/S12; path, compiled-SVG,
  offscreen/effect/readback, and other future-owner recovery remains with S13/S14. Windows repeats the
  substrate and lifecycle qualification in S19.

- The current package is `3,086,893` bytes with SHA-256
  `f9a58c45725c002dfcc1cdca84951bafcf7322aaf771b46fade5bb9cae518d29`. Goo.dll is `1,338,368`
  bytes with SHA-256 `b58ec0b7c6f8960a16a49247336e377c055f4d99a7b37bc3baa11cc0131f12b0`. The
  qualified SDL payload is `1,504,752` bytes with SHA-256
  `943fb58b939ed726a4aab7dd1225c5f75fd3d690d124a30f893a1b29b9f2de4c`.
- The current registered-font JIT smoke exited 0. Its normal final capture reported
  `heapBudgetAvailable 1`, `heapBudgetSampleCurrent 0`, `heapBudget 56,243,946,496`,
  `driverHeapUsage 31,227,904`, `vulkanObjectAllocationCount 617`,
  `vulkanDeviceMemoryAllocationCount 4`, `vulkanObjectCount 0`, `vulkanDeviceMemoryBytes 0`,
  `cacheBytes 0`, `allocatorBytes 0`, `validationErrorCount 0`, `resultFailureCount 0`, and
  `fatalCode 0`. Diagnostics-disabled stdout and stderr were both zero bytes.
- The current registered-font NativeAOT smoke passed. Its executable is `3,810,056` bytes with
  SHA-256 `eb4b157d240e42946243333f17c1cbe9c8b41321fbc575c5563568db8474891e`, its complete output
  directory is `15,068,244` bytes, and its tar is `7,104,938` bytes with SHA-256
  `6e418a2841e5a38d3e6c772623c1007951572b2a1a08ea73953e2cdebf9947e`. Its final capture reported
  budget available `1`, current sample `0`, budget `56,245,191,680`, driver usage `23,101,440`,
  582 Vulkan object allocations, 3 Vulkan device memory allocations, and zero live objects, device
  memory bytes, cache bytes, allocator bytes, validation errors, result failures, and fatal code.
- The immediately preceding package was `3,081,321` bytes with SHA-256
  `26ba8b49db6c96cd0ce3f1f89d9c4df118fb50db73b2a10c07c861a6fa437ca2`. Its Goo.dll was
  `1,328,128` bytes with SHA-256 `d6eb2faa9a210454263da40eacb08247bcb73b87b209c4475ae0f69e5744129c`.
  Its pressure final capture reported `heapBudgetAvailable 1`, `heapBudgetSampleCurrent 0`,
  `heapBudget 56,410,145,792`, `driverHeapUsage 91,979,776`,
  `vulkanObjectAllocationCount 1163`, `vulkanDeviceMemoryAllocationCount 21`,
  `vulkanObjectCount 0`, `vulkanDeviceMemoryBytes 0`, `cacheBytes 0`, `allocatorBytes 0`,
  `imageEvictionCount 259`, `imageRetirementCount 259`, and zero validation, result-failure, and
  fatal counters. Three multiwindow passes also used that package. These are not exact current-font
  package evidence.
- The text descriptor-set layout, three text shader modules, text pipeline layout, and two format-keyed
  text pipelines are process-shared. Mutable atlas state remains per-window. Dynamic
  `VK_EXT_memory_budget` is optional, uses a fixed 16-heap table, is enforced before native allocations,
  and publishes explicit null when unavailable. This behavior is Linux-qualified.
- Failed-idle terminal safety now retains target and runtime resources and the exact `VkResult`, blocks
  new publication, leases, and submissions, and avoids unsafe destruction after a failed wait. The current
  uncommitted Linux `Goo.FailedIdleSmoke` gate uses a live text and image cell across two windows, injects
  surface loss, graphics-submission failure, and failed device idle, then checks ordered recovery,
  upload, and present diagnostics, `VK_ERROR_DEVICE_LOST`, and terminal second-open rejection. This is
  current uncommitted Linux evidence only, not final package/release or Windows qualification. Exact
  `VkResult` values remain preserved, and lost runtimes reject new leases and submission serials.
- S11 now has deterministic declared mixed installed-font fallback with merged metrics, generated
  exact Unicode 16.0 LineBreak data with 2,898 ranges and context data with 616 ranges, and
  stateful UAX #14 pair rules that pass the official Unicode 16.0 LineBreakTest corpus with 16,672
  cases and zero failures. The pass includes UTF-16 offsets, CRLF, and mandatory-break semantics.
  Pinned UAX #29 extended grapheme segmentation is implemented in the internal G# service with
  1,481 compact generated ranges spanning Grapheme_Cluster_Break, InCB, and Extended_Pictographic;
  the official GraphemeBreakTest corpus passed 1,093 cases with zero failures. The generated
  grapheme source is 157,724 bytes with SHA-256
  `68b417df53b79bd61cd73db80fd4cbac03d54577e8523b103c77df4aee09c50c`, and product geometry and
  shaping no longer use runtime `StringInfo` segmentation. Release Goo.dll is 1,720,832 bytes,
  a +152,064-byte delta from the pre-UAX29 1,568,768-byte baseline.
  `TextGeometry` hit testing is allocation-free O(log n). Public owned G# `FontSource` registration
  has 64 MiB and 16-variation bounds, face validation, registered-first deterministic selection,
  zero-copy registry resolution, cache identity generations, and disposal lifetime. The current
  registered primary and fallback Wayland JIT/AOT smoke passed. The product-linked versioned
  provider ABI Release WAE smoke passed with caller-owned shaping and glyph buffers, exact capacity
  retry, sentinel preservation, warm workspace reuse, and disposed status. It reported
  `shapeRequired=9 glyphRequired=2880 warmReuse=1 disposed=1`. Full registered-font corpus/style/
  collection/variation qualification, Scripts, editor, color, multi-atlas/eviction/recovery remain
  open.
- The S10R Linux substrate scope is complete for current owners. S11-S14 still own text/image/path/
  offscreen-specific pressure, LRU, cache, and recovery qualification; Windows qualification and final
  T01-T05 gates remain open.

---

# Goo Core Vulkan Implementation Plan

Status: active direct product cutover. On 2026-08-17 Xaz approved removing Skia and Goo-owned C# before Vulkan parity is complete. Temporary local build and runtime breakage is accepted. Vulkan proof components now move into Goo core in dependency order. The acceptance gate is a working Goo window rendered only by Vulkan. No Skia, OpenGL, CPU raster, or fallback backend may remain.

Date: 2026-08-17

Branch: `gaps-and-reductions`

Authority: accepted decisions in `PLAN-FOR-REVIEW.md`

Supporting evidence:

- `GAPS-AND-REDUCTIONS.md`
- `VULKAN-SKIA-REPLACEMENT.md`
- `docs/perf/RELEASE-BASELINE.md`
- `docs/perf/2026-08-07-skia4-premigration-baseline.md`

If this artifact conflicts with an accepted decision in `PLAN-FOR-REVIEW.md`, the accepted decision
wins and this artifact must be corrected before implementation continues.

## 1. Required outcome

Deliver a small, declarative G# Goo core with:

- Direct Vulkan rendering on Windows x64 and Linux Wayland x64.
- No Skia renderer, Skia package, Skia native asset, Ganesh path, CPU renderer, or fallback backend.
- Goo core and every Goo-owned runtime helper are authored in G# only.
- C# remains allowed in tests, benchmarks, development tools, external packages, and large vendored
  dependencies such as Yoga.Net.
- OpenType inputs with a Goo-owned or freely redistributable text and arbitrary-vector implementation
  on Windows and Linux. Shipping remains blocked on the open source, license, ABI, resource, corpus,
  quality, performance, and both-RID gates.
- Slug's algorithm patent has been dedicated to the public domain. Adopt its two official
  MIT/Apache-2.0 HLSL reference shaders as the rendering-stage upstream. They may be vendored, ported,
  or compiled with required notice and credit, but Goo does not depend on a Slug CPU runtime, SDK,
  headers, OpenType tools, or `.slug` asset tooling.
- CSS-like Yoga flexbox layout.
- A compact typed frame plan with reusable storage and no steady-frame allocation.
- Retained clean scene segments, stable GPU ranges, and per-swapchain-image damage history.
- One process Vulkan instance and device with independent per-window presentation state.
- Request-driven Vulkan offscreen readback for diagnostics.
- A simple public G# API that does not expose Vulkan, SDL, the selected text engine, or native
  handles.
- NativeAOT packages that meet all Q10 visual, performance, memory, lifecycle, dependency, and size
  gates.

Hivemind, Uproar95, and Goo.Workbench are reference inputs. This plan does not implement Hivemind,
application controls, persistence, storage, restore policy, or monitor policy.

## 2. Execution rules

### 2.1 Product cutover rule

The prior atomic-cutover sequencing rule is superseded. Remove the old backend first, accept a
temporarily broken local branch, then move the proven Vulkan components into Goo core and restore
working behavior in dependency order. Do not retain a selectable or hidden compatibility backend.

The direct Vulkan cutover removes:

- The Skia renderer and all product `SK*` references.
- SkiaSharp and SkiaSharp.HarfBuzz package references.
- Skia native assets and package targets.
- The OpenGL Ganesh target.
- The Wayland shared-memory CPU raster target.
- Product CPU readback and conversion code.
- The `WindowRenderer` and `Window.Renderer` compatibility surface approved for removal by Q5.

There is no runtime backend switch, live Skia oracle, temporary hybrid, or fallback period.

### 2.2 Platform parity rule

Windows and Linux pass independently. Do not average results across operating systems, workloads,
GPUs, or runs.

Required parity includes:

- Public G# behavior.
- Window, input, focus, DPI, and lifecycle behavior.
- Font files, fallback order, shaping, variation coordinates, load flags, hinting, raster mode, and
  glyph composition.
- Color space and readback format.
- Fixed antialiasing policy after O16.
- Failure behavior for missing Vulkan support, surface loss, and device loss.

### 2.3 Scope rule

Add a Goo core mechanism only when a consumer cannot compose the behavior through public primitives.
Reusable controls belong in consumer code or a separate G# library.

### 2.4 Performance rule

Before each hot-path change:

1. Use the recorded Skia reference or the current accepted Vulkan result.
2. Run the same Release NativeAOT scenario.
3. Record total frame behavior, not only the changed internal stage.
4. Reject a change that exceeds a Q10 regression limit.
5. Retain an accepted Vulkan result as the next regression reference.

Do not weaken a gate, select a slower historical result, or replace the recorded Skia reference.

### 2.5 Change ownership rule

- Preserve unrelated dirty work.
- Give parallel agents disjoint file ownership.
- Do not let agents edit shared integration files unless the lead assigns those files.
- The lead reviews and integrates each fan-out batch once.
- Do not use worktrees.
- Do not commit or push unless separately requested.

## 3. Stable internal contracts

These contracts must be accepted before renderer implementation starts.

| ID | Contract |
|---|---|
| C01 | `Cell`, `Blob`, `Style`, declarative authoring, Yoga layout, and input behavior remain public Goo concepts |
| C02 | No Vulkan, SDL, selected text engine, GPU, or native handle crosses the public Goo API |
| C03 | The renderer consumes a typed frame plan and never traverses the retained `Node` tree |
| C04 | Frame records use reusable typed arrays with ordered references. No per-command objects, interfaces, delegates, reflection, or dynamic dispatch |
| C05 | Every logical resource has a stable ID, version, byte charge, GPU generation, and fence-safe retirement state |
| C06 | Every scene segment has stable ownership, a version, ordered operations, resource references, dirty state, and conservative visual bounds |
| C07 | Bounds include transforms, clips, shadows, masks, layers, blend dependencies, and overlap dependencies |
| C08 | Author colors are sRGB. Blending uses one locked color-space policy. Presentation and readback use a documented premultiplied RGBA representation |
| C09 | The normal warm frame allocates no managed memory and creates no Vulkan object, pipeline, or device-memory allocation |
| C10 | Diagnostics are disabled by default and allocate nothing when disabled |
| C11 | Runtime GPU resources can be reconstructed from logical sources after device loss |
| C12 | Public `VectorPath`, `PathBuilder`, `ImageSourceProvider`, text editing, and hit-test behavior remain backend-neutral contracts |
| C13 | Runtime packages contain precompiled SPIR-V only. The registry generator, shader compiler, validation layers, probes, and software ICD do not ship |
| C14 | Promote reusable proof components into Goo core only after removing proof harness behavior and changing their ownership to production Goo |

## 4. Dependency graph

```text
S00 scope and evidence lock
  -> S01 exact G# 0.4.1 restore
  -> S02 isolated G# migration and historical finding audit
  -> S03 package, API, requirements, and workload lock
  -> S04 accept existing recorded Skia benchmark information
  -> S05 Vulkan capability and build-toolchain contract
  -> S06 generated binding and SDL Vulkan loader
  -> S07 diagnostics and evidence spine
  -> S08 shared runtime, allocator, one-window WSI, and offscreen target
  -> S09 typed frame plan and basic pipelines
  -> S10 resource, shader, upload, and lifetime system
  -> S11 qualify the accepted open OpenType text direction and implement the shared service
  -> S12 image provider and decoded-pixel path
  -> S13 integrate the accepted open path direction, then compile SVG assets
  -> S14 compositing, effects, readback, and O16 AA selection
  -> S15 retained segments and per-image damage
  -> S16 multi-window scheduling and bounded recovery
  -> S17 remaining required Goo core mechanisms and platform adapters
  -> S18 clean-break Goo cutover and Vulkan startup restoration
  -> S19 Windows/Linux qualification and package release gate
```

S11 qualification and S12 can run in parallel after S10. S11 text implementation remains blocked
until the accepted open OpenType direction passes its implementation gates. All other arrows are hard ordering
constraints unless the lead records evidence that a dependency is not real.

## 5. Phase summary

| Stage | Outcome | Primary gate |
|---|---|---|
| S00 | Scope, authority, dirty state, and evidence inputs are locked | No unrelated work or conflicting source of truth |
| S01 | Exact G# 0.4.1 SDK restores without hidden local state | Clean-clone package consumer succeeds |
| S02 | Current migration and historical workarounds have evidence | Build, behavior, API, and package shape remain stable |
| S03 | Core requirements and deterministic workloads are fixed | Every reference gap is classified and owned |
| S04 | Existing recorded Skia benchmark information is accepted as the reference | The recorded data is sufficient for the required comparisons |
| S05 | Vulkan capability and toolchain manifests are pinned | Target GPUs expose the required common surface |
| S06 | Narrow generated Vulkan ABI and SDL loader work | Validation-clean loader and surface proof on both platforms |
| S07 | Backend-neutral logs and counters exist | Disabled diagnostics allocate nothing |
| S08 | Runtime, allocator, offscreen target, and one-window WSI work | Clear, quad, resize, and retirement are validation-clean |
| S09 | Typed plan drives the representative basic slice | Stable digest, correct pixels, zero warm allocation |
| S10 | Resource, shader, upload, and lifetime systems plateau | No warm resource creation or unbounded cache growth |
| S11 | Accepted open OpenType text direction is qualified and implemented | Minimal text corpus, resource, ABI, and parity gates pass on Windows and Linux |
| S12 | Backend-neutral images replace Skia decoding ownership | Linux proof qualification and the accepted S12-I01 provider contract are recorded; Windows 11 and S18 public-contract migration remain open |
| S13 | Accepted open path solution and compiled SVG assets work | Required path, clip, hit-test, and SVG corpus passes |
| S14 | Effects and async readback work and one AA policy is accepted | O16 is closed with measured evidence |
| S15 | Sparse updates use retained ranges and image history | Required sparse P95 improvement passes |
| S16 | Shared-device multi-window lifecycle and recovery work | Q10 lifecycle endurance passes |
| S17 | Remaining approved core mechanisms and platform adapters work | Required credential, semantics, accessibility, focus, and scroll contracts pass |
| S18 | Direct Vulkan becomes Goo's only product renderer | Skia and CPU raster are absent and the G#-only runtime boundary remains intact |
| S19 | Both RIDs pass all release gates | Accepted Vulkan result becomes the next regression reference |

### 5.1 Accepted-decision coverage

| Decision | Implementation stages |
|---|---|
| O01 Skia transition | S18 removes Skia first, promotes validated Vulkan components, and accepts temporary local breakage until Vulkan startup is restored |
| O02 text stack | S11 qualifies the accepted open OpenType direction after freezing the existing HarfBuzz/FreeType proof. Shipping requires source, license, redistribution, corpus, ABI, resource, visual-quality, performance, allocation, lifecycle, package, and both-RID gates |
| O03 paths | S13 uses the selected Goo-owned or freely redistributable curve and Vulkan implementation. Goo owns conversion, CPU hit testing, clipping, paint composition, caching, and lifetime |
| O04 images and SVG | S12 owns decoded pixels and providers. S13 adds build-time compiled SVG assets |
| S12-I01 versioned provider | S12 owns immutable per-version results, owner-thread publication and notifications, one-shot version leases, targeted invalidation, and cache/image keys independent of sampling and layout state |
| O05 diagnostics | S08 and S14 use Vulkan offscreen readback. S18 removes CPU raster and raster-only APIs |
| O06 renderer boundary | S09 implements and measures the compact typed frame plan |
| O07 dirty frames | S15 implements retained chunks, stable GPU ranges, and per-image damage history |
| O08 binding and allocation | S05-S06 generate the narrow binding. S08 and S10 implement the Goo allocator |
| O09 multi-window ownership | S08 establishes shared ownership. S16 implements scheduling and bounded recovery |
| O10 adoption gates | S04 accepts existing Skia benchmark information. S19 qualifies Vulkan against the hard gates |
| O11 persistence | S03 classifies persistence, storage, restore validation, monitor clamping, and policy outside core |
| O12 accessibility | S17 completes neutral semantics and required Windows UIA and Linux AT-SPI adapters |
| O13 control boundary | S03 classifies controls outside core. S17 adds only non-composable mechanisms |
| O14 dependency removal | S18 removes dependencies after final consumers are replaced. S19 verifies package absence |
| O15 Hivemind cutover | Out of scope. Hivemind supplies only requirements, workloads, and reference behavior |
| O16 antialiasing | S14 measures candidates, returns to Q&A, and keeps one accepted product policy |

## 6. Detailed implementation stages

### S00. Lock scope, evidence, and working state

Entry:

- Branch is `gaps-and-reductions`.
- `PLAN-FOR-REVIEW.md` records Q1 through Q10 as accepted, O01 through O14 and S12-I01 as accepted,
  O15 as out of scope, and O16 as later.

Work:

1. Record HEAD, branch, dirty file list, selected SDK, package inputs, and existing plan artifacts.
2. Treat existing dirty files as user-owned unless their changes are explicitly assigned.
3. Record the exact files in the current G# 0.4.1 migration.
4. Create a requirements-to-stage matrix from the accepted decision IDs.
5. Mark O16 and any failure of the accepted open text and vector implementation gates as explicit
   stop gates.

Required specification:

- G# 0.4.1 remains the locked compiler baseline for the direct product cutover.
- `Goo.InternalTextInterop` is removed before parity. Required responsibilities move directly into
  G# as Vulkan integration reaches each product surface.
- `PLAN-FOR-REVIEW.md` remains the architecture source of truth.
- Supporting research does not silently become an accepted dependency.

Verification:

- Read-only status, diff, and dependency inventory.
- No new permanent test.

Logging and evidence:

- Branch and commit.
- Dirty paths and their assigned owner.
- SDK version and package digest.
- Current package dependency and native asset list.

Exit:

- Every changed file has an owner and stage.
- No architecture conflict remains between the plan artifacts.

Reopen when:

- A later stage finds an unclassified public behavior or conflicting accepted decision.

### S01. Make exact G# 0.4.1 restore reproducible

Current selected SDK:

- Package: `Gsharp.NET.Sdk/0.4.1`
- Release tag: `v0.4.1`
- Source commit: `d670ac98c03e0b0f7c9ac965f5fa3914712f09de`
- Official NuGet package SHA-256:
  `fa379d5d68c2286afaee2d429dfad4585cfa25fe8495916cb7d5b41837099e63`

Work:

1. Verify the official release tag, commit, NuGet version, and package digest above.
2. Restore the exact release from NuGet.org.
3. Remove the clean-clone dependency on the ignored `artifacts/packages` directory and local feed.
4. Pin the package identity and verify its digest during restore or CI preparation.
5. Update package smoke and CI to use the same package source and identity.
6. Update or validate stale 0.3.633 references in README validation and third-party metadata.
7. Do not replace the exact SDK with a moving 0.4 range.

Likely files:

- `Goo/Goo.gsproj`
- `tests/Goo.PackageSmoke/Goo.PackageSmoke.gsproj`
- `NuGet.Config`
- CI restore configuration
- Release validation scripts
- `.github/scripts/validate-readme-examples.py`
- `THIRD-PARTY-NOTICES.md`

Required specification:

- A clean clone must restore G# 0.4.1 from NuGet.org without the nested G# checkout and without
  pre-existing local packages.
- Local and CI builds must resolve the same package bytes.
- Restore failure must be explicit. No fallback SDK is allowed.

Permanent verification:

- T01 clean package consumer restore, Release build, and run.

Ephemeral probe:

- None.

Logs:

- `dotnet --info`.
- Package ID, version, feed, source commit, and SHA-256.
- RID, OS, and complete compiler diagnostics.

Exit:

- Clean-clone restore and T01 pass with the exact package.
- Source commit and package digest match the values above.
- No hidden local feed is required.

Reopen when:

- The package is unavailable, hash-mismatched, or resolved differently in CI.

### S02. Complete the isolated G# 0.4.1 migration and finding audit

Entry:

- S01 passed with the exact verified SDK package.
- The finding matrix does not use a dirty nested G# checkout or an unverified local SDK.

Work:

1. Finish the current compiler-compatibility migration without renderer behavior or public API changes.
2. Map G# commits from the previously used version through the selected 0.4.1 commit.
3. Map each relevant compiler fix to the current Goo file and symbol that carries its workaround.
4. Rebuild the historical `probes/Findings` matrix in one temporary runner.
5. Record one disposition per historical finding.
6. Remove a Goo workaround only when the exact selected SDK proves it obsolete.
7. Keep a workaround when removal changes allocation, runtime, package, or generated IL behavior.
8. Record which `Goo.InternalTextInterop` responsibilities must be replaced in G#, then remove the
   helper with the Skia backend.
9. Delete the temporary matrix source and output after the disposition record is written.

Expected matrix dispositions to verify:

- Findings 01 through 07 and 09 through 17 compile or run successfully.
- Finding 08 succeeds after changing only the temporary copy to valid nullable-flow syntax.
- Finding 18 fails intentionally with GS0387 and GS0386.
- Keep the `GradientStop` comparison when allocation evidence still justifies it.
- Keep `_PopulateGooDocFileItems` until clean package evidence proves it unnecessary.
- Keep explicit nullable-flow and typed array-copy paths until their replacement is proven safe and
  allocation-neutral.
- Remove the stale `VectorPath` limitation comment only after finding 10 passes independently.
- Any different result is unexplained evidence and blocks the stage.

Required specifications:

- Preserve explicit nullable flow where G# 0.4.1 requires it.
- Preserve typed `Array.Copy` paths until clone and cast emission are proven correct and allocation
  neutral.
- Normalize fixed partial-file imports and redundant namespace qualifications only with evidence.
- Preserve text shaping, runtime behavior, API shape, XML documentation, and package contents.
- Keep the XML documentation packaging target until clean pack evidence proves it unnecessary.
- A compiler fix does not automatically justify deleting an allocation-motivated workaround.
- Yoga.Net and other external or vendored C# dependencies remain unchanged.
- Text shaping and native resource lifetime are restored through the locked Vulkan text stack.
- The G#-only Goo-owned runtime boundary applies throughout the cutover. Do not recreate temporary
  Skia or OpenGL behavior in G#.

Minimal TDD:

- Extend T01 only if a fixed G# behavior is required across the package boundary.
- Run existing backend-neutral behavior tests once after the isolated migration.
- Do not add the historical finding matrix to the normal suite.

Ephemeral probe:

- P01 one temporary finding matrix covering all historical cases.
- Preserve only finding ID, source digest, SDK digest, exit status, expected diagnostics, runtime
  status, relevant IL result, and workaround disposition.

Logs:

- Complete compiler output and warning count.
- API and XML documentation diff.
- Package contents and dependencies.

Exit:

- Exact G# 0.4.1 Release build and package consumer pass.
- All historical findings have explained dispositions.
- The prior-version-through-0.4.1 commit map and finding-to-Goo-symbol map are complete.
- `Goo.InternalTextInterop` remains present and behaviorally equivalent as the current baseline.
- No unapproved API or runtime behavior drift exists.

Reopen when:

- A finding changes unexpectedly or a workaround removal regresses behavior or allocation.

### S03. Lock package behavior, API reachability, requirements, and workloads

Work:

1. Verify pack, XML documentation, external package consumption, and native open/pump/close.
2. Find consumers of `WindowRenderer`, `Window.Renderer`, and raster-only APIs before their approved
  removal.
3. Inventory Hivemind reference surfaces and Uproar95 window behavior against Goo core.
4. Classify every observed gap as:
   - Required Goo core mechanism.
   - Behavior composable from public primitives.
   - Application-owned control or policy.
   - Optional mature-framework nicety.
   - Out of scope.
5. Lock deterministic configurations for every Q10 workload.

Required workloads:

- True idle.
- Small animation.
- Sparse large virtualized table.
- Hivemind-derived topology.
- Text editing.
- Image-heavy and effect-heavy content.
- Resize and DPI transition.
- Three active windows with sparse independent changes.

Required specification:

- Each workload has a stable ID, revision, source commit, data seed, action trace, dimensions, DPI,
  font set, and expected behavior.
- Windows gaps and Linux gaps are recorded separately.
- Hivemind application code and reusable controls do not enter Goo core.
- Removal of `WindowRenderer` and `Window.Renderer` is treated as an approved breaking API change.
  Consumer reachability and migration impact must be recorded before cutover.
- No API or source removal occurs in this stage. The approved removal belongs only to S18.
- T01 consumes the freshly packed Goo artifact and must not resolve the current published Goo 0.2.0
  package.
- T01 exercises `Cell.Mount` and an imported generic `ShouldRebuild` override across the assembly
  boundary.
- T01 mounts the imported generic cell and executes its typed `Build(input)` path during native
  open, pump, and close.
- Release pack, public API, XML documentation, README example validation, and warnings-as-errors all
  pass before this stage exits.

Permanent verification:

- T01 package consumer.
- Existing public API and documentation checks.
- No new per-gap test suite.

Logs:

- Requirement source, owner, classification, and workload mapping.
- Package contents, XML documentation, public API diff, SDL backend, startup, and close result.

Exit:

- Every reference requirement is classified.
- Every required workload is deterministic and reproducible.
- Approved API removals have a known consumer impact.

Reopen when:

- A reference requirement needs a new public Goo mechanism or cannot be represented by the workload
  set.

### S04. Close against existing recorded Skia benchmark information

S04 is closed using the existing recorded Skia benchmark information. It does not create a new
benchmark run, qualifying manifest system, or permanent Skia benchmark, provenance, or trace
infrastructure.

Work:

1. Use the most recent applicable recorded Skia result for each required workload, platform, and
   metric.
2. Use that recorded information as the historical comparison reference for Vulkan results.
3. Keep the accepted Vulkan architecture and hard runtime gates unchanged.
4. Proceed directly to S05 and then S06.
5. Delete any temporary S04 probes, source, binaries, traces, and scratch output immediately.

Reference:

- Existing recorded Skia benchmark information is the only S04 baseline input.
- The 2026-08-07 G# 0.3.633 Skia result remains historical reference information where applicable.
- No new baseline capture, parser, validator, qualifying manifest, or retained S04 evidence store is
  required.

Exit:

- The recorded Skia information is accepted for the comparisons required by the hard runtime gates.
- No S04-specific benchmark, provenance, or trace infrastructure remains.
- S05 can start immediately, followed by S06 after its capability and toolchain contract is locked.

Reopen only if an accepted decision or hard runtime gate changes.

### S05. Lock Vulkan capability and build-toolchain contracts

Entry:

- S04 recorded Skia benchmark information is available as the comparison reference.

Work:

1. Audit one integrated and one discrete GPU on Windows and Linux.
2. Select the lowest common Vulkan capability set that supports the accepted renderer design.
3. Pin one Khronos `vk.xml` revision.
4. Pin the offline shader compiler and SPIR-V target environment.
5. Define the exact generated-binding surface and extension policy.
6. Define the shader manifest schema, resource binding model, push constants, formats, and pipeline
  variants.
7. Define final optimized SPIR-V reflection, generated G# host packing, descriptor schemas, source
  include closure, compiler binary provenance, and atomic artifact publication.
8. Record required, optional, and forbidden features.

Required capability policy:

- Required features must exist on all four qualification configurations.
- Surface and swapchain support are required.
- Dynamic rendering, synchronization2, and timeline semaphore behavior may be required through the
  chosen core version or exact extensions after the audit.
- A negotiated KHR or EXT `surface_maintenance1` and `swapchain_maintenance1` pair is required for
  fence-safe presentation retirement. Memory budget reporting and incremental present remain
  optional capabilities with correctness-preserving fallbacks inside the Vulkan design.
- Optional vendor blend, descriptor, or presentation features cannot be correctness dependencies.
- Runtime shader compilation is forbidden.
- GLSL 450 through the pinned `glslc` toolchain is the built-in Goo source policy. Optional Slang or
  DXC adapters remain build-time inputs to the same language-neutral artifact contract.
- Final SPIR-V, not source declarations, defines the runtime interface. Build validation reflects
  entry points, stages, descriptors, push constants, specialization constants, capabilities, and
  required feature bits.

Required generated artifacts:

- Pinned registry manifest and hash.
- Deterministic narrow binding manifest.
- Shader manifest and compiler provenance.
- Checked-in G# binding output.
- Checked-in or reproducibly generated SPIR-V with hashes.
- Generated G# parameter packing and descriptor-layout metadata derived from final SPIR-V.

Permanent verification:

- No new runtime test.
- Deterministic regeneration and drift checks belong to build validation, not a large unit suite.

Ephemeral probe:

- P02 one capability census across the four qualification configurations.

Exit:

- The common capability set is explicit and supported.
- Build tools are pinned and excluded from runtime packages.

Reopen when:

- A required capability is absent on a target configuration or adds unacceptable package/runtime
  surface.

### S06. Generate the narrow Vulkan ABI and prove the SDL loader

Work:

1. Generate G# structs, enums, constants, result codes, command signatures, and typed dispatch
  tables from pinned `vk.xml`.
2. Generate only the required core and extension surface plus transitive ABI types.
3. Load Vulkan through SDL.
4. Populate global, instance, and device dispatch tables once.
5. Prove required SDL instance extensions, surface creation, and presentation support on Windows and
  Wayland Linux.
6. Keep the loader bootstrap narrow and Goo-owned.

Required specification:

- No handwritten Vulkan ABI structures, constants, or command signatures.
- No general Vulkan binding package in the runtime.
- No reflection, delegate dispatch, dynamic marshaling, or boxed command path.
- G# typed unmanaged function pointers call the Vulkan ABI directly.
- Generated output is deterministic.
- Final SDL interop exposes only the Goo-owned surface. Hexa types do not cross the boundary.
- No Goo core or Goo-owned runtime-helper C# is allowed. A G# compiler limitation blocks the stage
  and returns to Q&A. It does not create a permanent C# exception.

Likely areas:

- A development-only Vulkan generator.
- Checked-in generated G# under an internal Vulkan namespace.
- A narrow SDL Vulkan bootstrap.

Minimal verification:

- Extend T01 so the generated binding compiles through the normal G# SDK package path.

Ephemeral probes:

- P03 one ABI and direct-call probe for sizes, alignments, pointer fields, and selected loader calls.
- P04 one SDL loader, extension, surface, and presentation probe on each platform.
- Delete both probe trees and binaries after evidence is recorded.

Logs:

- Registry revision and generator hash.
- Generated type and command counts and byte size.
- Loader path, extensions, dispatch misses, and presentation queue support.
- Vulkan result codes and validation messages.

Exit:

- Binding compiles and direct calls work on both platforms.
- SDL creates a valid surface with validation-clean dispatch.
- Generated and native payload cost is recorded.

Reopen when:

- G# emits an ABI mismatch, invalid call, allocation, or unsupported NativeAOT path.

### S07. Build the diagnostics and evidence spine

Work:

1. Make the existing frame profiler backend-neutral.
2. Add a bounded preallocated trace ring for renderer events.
3. Add asynchronous GPU timestamp queries resolved after the owning fence.
4. Add validation-message capture and a bounded fatal snapshot.
5. Emit structured NDJSON compatible with benchmark ingestion.
6. Add counters required by Q10 before optimizing the renderer.

Backend-neutral frame stages:

- Event wait and input.
- State propagation.
- Reconciliation.
- Yoga layout.
- Scene/frame-plan construction.
- Dirty compilation and batching.
- Resource preparation and upload.
- Command recording.
- Main, effects, and offscreen GPU passes.
- Submit.
- Intentional present wait.
- Request-driven readback.

Required event categories:

- Runtime and device.
- Window, surface, and swapchain.
- Allocator and resource lifetime.
- Pipeline and shader.
- Frame plan and damage.
- Text, curve/band text resources, image, and path resources.
- Recovery and fatal state.

Required specification:

- Disabled diagnostics perform zero managed allocation and no formatting.
- Disabled diagnostics create no Vulkan query pool, timestamp, debug-label, or trace resource.
- Normal tracing uses numeric or fixed-width value records.
- Per-draw logging is off by default.
- Enabled buffers are bounded and report drops.
- GPU queries never add `vkDeviceWaitIdle`, synchronous readback, or another timed-path stall.
- Validation errors fail proof and qualification runs.

Fatal snapshot contents:

- Recent trace ring.
- Device, driver, enabled feature, and extension facts.
- Window, surface, swapchain, frame-slot, and GPU generation IDs.
- Heap budgets, allocated bytes, retired bytes, and live object counts.
- Last submissions and Vulkan results.

Permanent verification:

- Fold disabled-path allocation into T03.
- Fold validation and fatal-snapshot exercise into T04.
- Do not create one test per log event.

Exit:

- Logs can classify compiler, scene, allocator, synchronization, WSI, GPU, and recovery failures.
- Disabled instrumentation passes zero-allocation checks.

Reopen when:

- Troubleshooting still requires routine source modification or hot-path logging changes.

### S08. Implement the proof runtime, allocator, offscreen target, and one-window WSI

Boundary:

- This began as a non-shipping Vulkan proof target.
- Its validated components are promoted during the active clean-break product cutover.
- Proof harness behavior remains outside the public API and package.

Implementation status on 2026-08-17:

- Commit `4ba96ee` completes the Linux default, requested readback, resize, close/reopen, and
  current-metric WSI recovery paths without device or queue idle.
- Release, Khronos validation with synchronization validation, and stripped NativeAOT pass for the
  default, readback, and automatable lifecycle paths.
- Strict cross-display DPI movement and programmatic unminimize remain real compositor-driven E2E
  deferrals on KDE Wayland. The proof reports these deferrals explicitly and does not synthesize
  success.
- A real `VK_ERROR_SURFACE_LOST_KHR` event still needs an E2E source. Its failed-present fence is
  retained and waited correctly if the driver returns it.
- Windows runtime qualification remains deferred until the Windows 11 VM is available.

Shared runtime specification:

- One process `VkInstance`, physical device, logical device, graphics queue, and presentation-capable
  queue set.
- One GPU generation.
- Shared allocator, descriptors, pipelines, samplers, caches, staging, and resource registry.
- UI-thread submission initially. A later render thread must not change ownership contracts.

Allocator specification:

- Partition by memory type and resource class.
- Separate persistently mapped staging rings, device-local buffer blocks, image blocks, and dedicated
  allocations.
- Honor memory type bits, alignment, dedicated requirements, `bufferImageGranularity`,
  `nonCoherentAtomSize`, allocation count limits, and heap budgets.
- Retire ranges only after fence completion.
- No initial defragmentation.
- No warm-frame device-memory allocation.

Per-window specification:

- One SDL Vulkan surface and swapchain.
- Window-owned image views, frame slots, acquire/render semaphores, fences, format, extent, and
  presentation history.
- Zero-sized and minimized windows do not acquire, submit, or present.
- Out-of-date or suboptimal results rebuild only the affected swapchain.
- Resize coalesces to the newest extent.
- Surface loss recreates only that surface and swapchain.
- Close retires presentation resources after safe completion.
- Normal resize, close, and surface recovery never call `vkDeviceWaitIdle`.

Offscreen specification:

- Create one renderer-owned offscreen color target usable by the proof corpus.
- Clear, render one solid quad, copy through a staging buffer on request, and complete asynchronously.
- Readback is absent from normal presentation work.

Minimal verification:

- Extend T02 with clear and solid-quad readback.
- Fold one-window lifecycle into T04. Do not add a test per Vulkan result code.

Logs:

- Device and queue choice.
- Heap and memory type facts.
- Block, range, fence, and retirement IDs.
- Surface, swapchain, image, frame-slot, and generation IDs.
- Acquire, submit, present, resize, and loss results.

Exit:

- Offscreen clear/readback and one solid quad are correct.
- One-window open, first frame, resize, minimize, restore, DPI change, close, and reopen work on both
  platforms.
- Validation reports zero errors.
- Allocation counters plateau after warmup.

Reopen when:

- A target driver needs a capability outside S05 or allocator waste exceeds the Q10 memory gate.

### S09. Implement the typed frame plan and basic pipeline slice

Implementation status on 2026-08-17:

- Commits `745fa5c`, `0749c8f`, `ccbc41e`, and `6444e21` implement the typed plan, analytic shader
  variants, shader color-precision contract, and basic scene recorder/readback.
- The scene-plan gate records stable digest `14043598012074296026`.
- The 64x64 Vulkan scene readback records digest `3293081366429027451` and the recorder allocates
  `0` managed bytes after warmup.
- Analytic variants use one `112`-byte push-constant ABI. Packed premultiplied-linear colors use
  `R11/G11/B10` RGB fields and `A10` alpha lanes.
- Stage events `300` through `306` cover tree, plan, upload, record, submit, GPU, and present.
- Khronos validation and synchronization validation report `0` errors.
- Linux x64 stripped NativeAOT output is `1,567,656` bytes with SHA-256
  `d3d3e8c6655fd1e8f3816f3bf8d54c7f214d09ba202d16b9659687b7a55b741d`.
- This closes only the representative basic slice. Actual image, glyph, and path resources, rounded
  and arbitrary clips, shadows, and layers remain later stages. Windows runtime qualification remains
  deferred to the Windows 11 VM.

Frame-plan records:

- `SceneFrame`.
- `SceneChunk`.
- `DrawRef`.
- `ResourceId`.
- Typed arrays for quads, borders, gradients, glyphs, images, shadows, underlines, path references,
  custom meshes, clips, and layers.

Each chunk contains:

- Stable owner identity.
- Monotonic version.
- Ordered operations.
- Conservative bounds.
- Resource references.
- Dirty state.

Required specification:

- The scene compiler traverses retained nodes. The Vulkan recorder does not.
- Storage capacity is reused.
- Array growth is explicit, measured, and outside the steady path.
- Stable logical resource IDs do not expose GPU handles.
- Command order is preserved.
- Adjacent compatible state can coalesce.
- Overlap-safe batching is a separate measured optimization.
- A normalized semantic digest proves equivalent scene work.

Initial proof slice:

- Solid and rounded boxes.
- Per-edge borders.
- Multi-stop linear and radial gradients.
- Transforms.
- Nested rectangular clips.
- Stable references for a cached image, cached glyph run, and prebuilt path mesh without requiring
  their final S11 through S13 implementations.
- The S08 clear/quad readback path.

The complete Q6 representative slice adds final images, glyphs, paths, rounded and arbitrary clips,
group opacity, blend, shadow, offscreen layers, and async readback after S14. S09 does not claim that
full gate early.

Pipeline specification:

- Precompiled SPIR-V only.
- Fixed shader manifest with layouts, descriptors, push constants, formats, and variants.
- Bounded caches.
- First-use pipeline work is measured separately.
- One documented color-space contract.

Proof controls:

- Counting sink for traversal, encoding, decoding, and arena growth.
- Semantic digest.
- Fixed-order and overlap-safe batching arms.
- Identical resources, shaders, target formats, and synchronization.

Permanent verification:

- Extend T02 with the basic proof slice.
- Extend T03 with frame-plan construction, allocation, upload, recording, and GPU stages.
- Do not add one test per record or primitive.

Exit:

- The basic-slice digest is stable and implemented basic pixels meet the current applicable
  thresholds.
- Recorder performs zero managed allocation after warmup.
- Stage logs separate tree, plan, upload, record, submit, GPU, and present costs.

Reopen when:

- Direct retained traversal materially wins across required workloads after reasonable typed-layout
  optimization. Return that evidence to O06 Q&A.

### S10. Implement resources, shaders, uploads, and lifetime

Status: complete on 2026-08-17. Commits `1cbe3af` and `920f4e5` close the non-shipping S10 image
resource vertical slice and activate S11.

Qualification evidence:

- Cached image readback digest: `12286913645295596837`.
- The unchanged second render reached a plateau with `0` managed allocation and queued no upload.
- Submitted and resident image retirement both respected fence completion.
- Stale GPU-generation access was rejected before submission, and logical resources rehydrated after
  generation replacement.
- Khronos validation and synchronization validation reported `0` errors and `0` fatal errors.
- Linux x64 NativeAOT output was `1,690,680` bytes with SHA-256
  `44923f77ce793d6e4d1302699446420698de806a4878ccf21f538b4a32039e54`.
- The recorded proof remains non-shipping evidence. Its reusable Vulkan components now move into
  product `Goo/`. Windows runtime qualification remains deferred to the Windows 11 VM.
- Mapped noncoherent memory uses a conservative whole-block flush and invalidate. This is safe and
  non-blocking for S10. Range-granular, atom-aligned operations remain an S14 performance
  optimization and reopen risk if later measurements require them.

Work:

1. Implement generation-safe logical resource registry.
2. Implement persistent buffer ranges, staging rings, images, samplers, descriptors, and resource
   caches.
3. Implement bounded pipeline, selected-text, image, mesh, and offscreen caches.
4. Implement fence-safe retirement and GPU-generation invalidation.
5. Store or reference a logical reconstruction source for every GPU resource.
6. Warm required pipelines outside measured steady frames.

Shader artifact system:

- Goo owns a language-neutral shader artifact model consumed by built-in primitive pipelines,
  compositing and effects, and later trusted custom effect packages.
- Each artifact records a stable shader and variant ID, stage and entry point, final SPIR-V hash,
  reflected interface, parameter block layout, descriptor layout, color and alpha contract,
  capability requirements, fallback variant, pipeline key, and compiler provenance.
- Runtime packages contain only validated SPIR-V, compact manifests, and generated G# packing code.
  They contain no compiler, reflection library, or source parser.
- Development hot reload compiles externally into a temporary content-addressed artifact, validates
  and reflects it, prewarms a compatible pipeline, publishes atomically at a frame boundary, and
  fence-retires the replaced module and pipeline.
- Pipeline caches are device and driver keyed runtime data. They are never treated as portable
  shader artifacts.
- Flutter Impeller is a strong reference for offline shader compilation, predictable pipeline
  construction, explicit render resources, and tooling. It is a reference, not Goo's API or
  architecture guide.

Required specification:

- Resource IDs remain stable across GPU generation changes.
- Stale GPU handles cannot be used after generation change.
- Cache budgets are byte-based, explicit, and logged.
- Eviction cannot release in-flight data.
- Uploads are range-based and report bytes.
- Unchanged resources do not upload.
- Warm frames create no Vulkan objects, pipelines, or device-memory allocations.
- Device recovery can rebuild every required resource without application tree reconstruction.

Permanent verification:

- Fold steady allocation, unchanged-resource, eviction, and plateau behavior into T03 and T04.
- Do not add an allocator or cache unit test per branch.

Logs:

- Logical ID, version, GPU generation, bytes, cache, residency, upload, eviction, fence, and retirement.

Exit:

- Resource and cache use plateaus.
- Stale-generation access is detected before Vulkan submission.
- Required resources rehydrate from logical sources.

Reopen when:

- Fragmentation or memory waste breaks Q10 after reasonable block-policy tuning. VMA is the recorded
  contingency, not a default dependency.

### S11. Qualify the accepted open OpenType text direction

Status:

- O02/Q2 accepts OpenType inputs with a Goo-owned or freely redistributable text and vector
  implementation.
- The existing HarfBuzz core and `hb-gpu` proof is frozen as non-shipping evidence. Its locked,
  trimmed text-provider path moves into Goo without FreeType or a CPU raster fallback.
- The official Slug repository is accepted as the rendering-stage shader upstream. Its algorithm
  patent has been dedicated to the public domain. Its two official MIT/Apache-2.0 HLSL reference
  shaders may be vendored, ported, or compiled with required notice and credit. The public repository
  does not provide a CPU runtime, OpenType ingestion,
  shaping/layout, curve/band builder,
  vector path builder, `.slug` asset tooling, SDK headers, or a Vulkan SPIR-V contract.

Qualification gate:

- Select or implement an open source or freely redistributable stack covering OpenType ingestion,
  shaping, layout, curve and band construction, vector paths, build-time asset compilation, and
  Vulkan resource and shader integration for Windows x64 and Linux x64. No proprietary SDK, paid
  runtime, closed headers or tools, or non-redistributable artifact enters Goo.
- Parse approved `.ttf`/`.otf`/`.ttc`/`.otc` inputs and produce deterministic retained font or compiled
  text assets without requiring a proprietary build tool. Record source hashes, implementation/tool
  hashes, import options, generated-asset hashes, and license provenance.
- Provide shaping, one bidi authority, fallback, variation coordinates, script coverage, line
  breaking, metrics, hit location, and reusable caller-owned output buffers. Preserve Goo's UTF-16
  offsets, fallback order, face metadata, paragraph policy, editor state, caret, selection, hit
  testing, and IME geometry without exposing the selected implementation in the public API.
- Provide curve and band data, or an equivalent Vulkan-ready representation, with documented formats,
  vertex/index layouts, shader inputs, descriptor/resource behavior, error behavior, deterministic
  offline compilation, bounded storage, and reproducible per-RID outputs. The generic bitmap
  glyph-atlas ABI is not reused for analytical outlines.
- Keep asset source hashes, implementation/tool hashes, import options, generated-asset hashes, and
  license provenance. The runtime does not parse arbitrary font bytes unless the selected open design
  explicitly proves that path is required and meets the size and allocation gates.
- Permit Goo to redistribute the required source, binaries, generated shaders, generated assets, and
  build tools under terms compatible with Goo's public packages and downstream applications. Goo's
  core package does not own or redistribute application fonts.
- Pin and vendor the official Slug HLSL reference shaders from `https://github.com/EricLengyel/Slug`
  at commit `be3c13eb7d63f9e8aa5c583e42d92c374cb91d98` as licensed build inputs. Vendor the selected
  license, `NOTICE`, and source hashes beside them. Preserve the required notice or credit.
  Translate them into a licensed GLSL derivative for the existing `glslc` toolchain, or evaluate a
  pinned build-only DXC path later. Neither translation choice is a runtime dependency.
- Use a narrow opaque-handle C ABI only where a freely redistributable native component requires it.
  G# NativeAOT bindings use caller-owned buffers and workspaces. Goo core and Goo-owned runtime
  helpers remain G#. No text or renderer handle crosses the public G# API.
- On device loss, reconstruct compiled text, curve/band or equivalent resources, descriptors, and
  dependent draw ranges from logical assets and text state.

Open implementation gaps that must remain explicit:

- Variable-font axes, required color glyph forms, script coverage, and shaping parity, especially
  CJK, RTL, combining marks, ligatures, fallback, and language-specific behavior, must be verified
  against the fixed corpus. Marketing claims alone do not close the Goo contract.
- The official Slug repository supplies only reference HLSL shaders and notices. It does not supply a
  CPU runtime, OpenType ingestion, shaping/layout, curve/band builder, vector path builder, `.slug`
  asset tooling, SDK headers, or Vulkan SPIR-V contract. Goo must provide or freely redistribute each
  missing service.
- Existing build tooling is GLSL and `glslc`. Translating the licensed HLSL into a licensed GLSL
  derivative or using pinned build-only DXC is a later implementation choice. Neither is a runtime
  dependency or an accepted selection in S11.

Minimal E2E corpus:

- One primary Latin font and one fallback font.
- CJK, RTL, combining marks, ligatures, and a required color glyph using a supported color format.
- Caret, selection, hit testing, IME geometry, and UTF-16/UTF-8 offset mapping.
- Metrics, line layout, curve/band resource extraction, generated vertex/triangle output, and one
  device-loss reconstruction.
- The same source and generated-asset hashes, fallback order, import options, output tolerances, and
  policy run independently on Windows x64 and Linux x64. This is one behavior corpus, not one test
  per glyph, script, or font table.

Permanent verification:

- Extend the text region of T02 with the minimal corpus above.
- Retain existing tests that prove public text/editor behavior.
- Keep logging for source/resource keys, fallback, shaping/layout counts, curve/band uploads,
  generation changes, and reconstruction. Do not add broad text unit coverage.

Exit:

- The selected open implementation and generated assets are reproducible, and the minimal E2E corpus
  passes independently on Windows x64 and Linux x64.
- Text/editor behavior and placement meet the Q10 gates, with no bitmap atlas in the analytical
  outline path, no steady managed allocation, and no unbounded curve/band or compiled-text cache
  growth. Any separately accepted color-image provider remains explicit under O02/Q2 and S12.
- The selected implementation's ABI, G# NativeAOT calls, lifetime, shutdown, and device-loss rebuild
  pass on both RIDs.
- Until this exit is reached, the frozen HarfBuzz/FreeType proof remains non-shipping evidence only.

Reopen when:

- No open implementation or redistributable artifact satisfies the contract, or either RID lacks a
  supported build.
- Variable axes, required color glyph forms, script coverage, shader integration, or resource
  reconstruction cannot meet the Goo contract without a new dependency or policy decision.
- The selected implementation misses the corpus, visual, performance, allocation, package, or
  device-loss gates. Return to O02/Q2 rather than adding a hidden fallback.

### S12. Replace image ownership with decoded pixels and providers

Status and qualification evidence:

- Local commit `622ee82` adds the proof-only G# image provider/source ownership path with dual nearest/linear Vulkan samplers. Async decoder completions must publish through the provider's constructing thread.
- Linux JIT image E2E recorded nearest digest `2726448270383127845` and linear digest `10848324327350558369`. Warm recording and rehydration reported `allocated=0`; the resident plateau, fence-safe retirement, and logical-source rehydration gates passed.
- Linux x64 NativeAOT produced `1,728,520` bytes with SHA-256 `ec24ac566e4af3aed568059a482e7b017784baf13185b9811a8268e7235edce6`.
- No codec was added. S12-I01 locks the versioned stable `ImageSourceProvider` contract. S12 remains
  open for Windows 11 VM qualification and direct product-contract migration.

S12-I01 accepted contract:

- The direct cutover adds the read-only `ImageSourceProvider.ContentVersion uint64` property and parameterless
  `ImageSourceProvider.ContentChanged` event. `ImageSourceProvider.Acquire()` remains unchanged and
  `ImageSourceLease` gains no public member. Treat the two interface additions as a breaking change
  for custom providers and update the approved API baseline and generated documentation atomically.
- `ContentVersion` is a nonzero, monotonic `uint64`; every content bump advances it. Pixels,
  dimensions, format, and the terminal result are immutable for one version. The public provider
  surface has no `SourceId`.
- Providers publish an explicit change notification on their owner thread. Goo coalesces changes
  per provider and window, then invalidates only bound nodes for that provider.
- Each acquisition creates a one-shot lease with a `ContentVersion` snapshot. A version bump
  releases the old lease and reacquires a fresh snapshot. Completion for a stale snapshot is
  rejected. Failure is terminal for that version; retry requires another version bump.
- Active leases retain their version result. Pixel storage and Vulkan images remain retained until
  active leases and submitted-work fences make release safe.
- The decoded-pixel key is provider identity plus `ContentVersion`. A Vulkan image key additionally
  includes device generation and format. Sampling is separate, so nearest and linear reuse one
  `VkImage`. Fit, transform, opacity, and destination size are not key fields.
- Decode may run off-thread, but publication and notification run on the owner thread. There is no
  polling or runtime hashing, and warm reuse allocates zero managed memory.

Required specification:

- `ImageSourceProvider` remains the public boundary.
- Goo core owns immutable per-version premultiplied RGBA pixels, dimensions, format, terminal result,
  async completion, invalidation, fit, sampling, lazy GPU upload, and byte-bounded caching.
- Decoding stays off the UI thread.
- Raster file decoders are optional providers or packages.
- Applications own allowed formats, hostile-input limits, and attachment policy.
- No Skia image object remains in the core image lifetime.
- Decoded-pixel cache identity is provider identity plus `ContentVersion`. Vulkan image identity
  additionally includes device generation and format. Sampling is separate, so nearest and linear
  reuse the same `VkImage`; fit, transform, opacity, and destination size do not enter either key.
- Vulkan images retire only after fence completion.

Permanent verification:

- Extend T02 with one decoded provider image and sampling cases.
- Fold async completion, invalidation, eviction, and close/reopen into T04.
- Keep backend-neutral public image lifecycle tests.
- Do not add one test per codec or image format.

Logs:

- Provider identity, content version, decode completion, owner-thread publication, pixel bytes, upload
  bytes, residency, cache bytes, leases, eviction, and targeted invalidation.

Exit:

- Provider image behavior is correct on both platforms.
- Decode and upload do not block the UI thread.
- Cache and GPU memory plateau.

Reopen when:

- A required core behavior depends on a specific file codec. Return codec ownership to Q4 Q&A.

### S13. Integrate the accepted open path direction, then compile SVG assets

Entry:

- Analytic primitives and prebuilt path meshes already work.
- Arbitrary paths are now the actual blocker.

Accepted implementation direction:

1. Reuse the S11 selected open adapter, quadratic curve representation, curve/band or equivalent
   resources, shader family, descriptors, cache accounting, retirement, and device-loss reconstruction.
2. Keep Goo's immutable `VectorPath` as the logical source and lower cubic and elliptical arcs to
   deterministic quadratic sequences only when retained geometry changes.
3. Use caller-owned fill and stroke output from the selected open implementation. Generate no path
   geometry during submission or paint.

Required path contract:

- Line and quadratic input plus deterministic cubic and elliptical-arc conversion.
- NonZero and EvenOdd fill rules.
- Selected implementation fill and stroke output in caller-owned retained buffers.
- Caps, joins, miter limits, dashes, and required corner effects.
- Arbitrary path clips through Goo-owned cached coverage masks.
- CPU bounds and hit testing from the same normalized retained geometry source.
- Goo-owned coverage composition with solid, multi-stop gradient, and image paints.
- Shadow, inset-shadow, and spread behavior through S14 bounded masks. Do not add Clipper2 or another
  boolean, offset, or tessellation dependency now. If masks cannot meet measured required Goo
  behavior, return to Q3 before adding anything.
- Stable path-resource IDs and conservative bounds.
- No geometry generation during submission or paint.
- Explicit geometry, curve, and band byte budgets with fence-safe retirement.

Required SVG compiler contract after paths work:

- Build-time compiler only for the initial runtime.
- Compact Goo vector asset embedded in the application binary.
- Paths, groups, transforms, opacity, solid paints, basic linear and radial gradients, strokes, simple
  clips, transform animation, opacity animation, color/stroke animation, and compatible path morphs.
- A keyframe and loop player updates retained resources and does not rebuild the Cell tree each tick.
- No scripts, DOM interaction, runtime CSS selectors, SMIL event semantics, general filters, general
  masks, or runtime external references.
- Runtime SVG decoding remains an optional future provider outside the initial core.

Permanent verification:

- Extend T02 with one representative path, clip, pointer hit, compiled SVG, and retained SVG
  animation case.
- Do not add one test per path command, operation, or SVG element.

Ephemeral probe:

- P06 only if existing documentation and logs cannot answer a path correctness or performance
  question. Delete it after O03 evidence is recorded.

Exit:

- The accepted O03 open path direction passes its implementation gates.
- Required path, hit-test, clip, and compiled SVG behavior passes T02 and T03.

Reopen when:

- The selected implementation misses a required operation or violates frame, memory, allocation, or
  binary gates.
- A measured required Goo behavior needs explicit boolean or offset geometry that S14 masks cannot
  provide. Return to Q3 before adding another dependency.

### S14. Implement compositing, effects, async readback, and select O16 AA

Compositing specification:

- Rect clips use scissor.
- Rounded clips use the selected analytic or bounded-mask policy.
- Arbitrary clips use retained mask resources.
- Group opacity isolates content when required for correct composition.
- Advanced blends use portable shaders or offscreen composition. Vendor blend extensions are not
  required.
- Shadows and blur use bounded offscreen passes.
- Offscreen layers are pooled, versioned, byte-bounded, and reconstructable.
- Effects expand conservative bounds before culling and damage selection.

Declarative shader and effect surface:

- Goo first exposes a typed closed `EffectGraph`, not raw runtime shader source.
- Initial nodes are source, backdrop, transform, opacity, blur, color matrix, saturation, contrast,
  hue, mask, blend, composite, drop shadow, and trusted custom effect package.
- Compilation removes identity nodes, folds opacity and transforms, fuses compatible color work,
  pools transient targets, and treats blur, mask, backdrop reads, isolation, and custom packages as
  pass barriers.
- Every node declares conservative source and output bounds so damage and layer reuse remain exact.
- The first custom shader tier is fragment-only, uses bounded sampled inputs and a fixed generated
  parameter block, and ships as a precompiled `GooShaderPack` artifact.
- Public custom effects do not expose raw descriptor sets, storage images or buffers, atomics,
  buffer device address, subgroups, compute, mesh or task shaders, ray tracing, or arbitrary
  topology.
- SPIR-V validation is correctness validation, not a hostile-code sandbox. Arbitrary third-party
  shader packages are explicitly trusted or unsafe.

Readback specification:

- Render through normal Vulkan pipelines into an offscreen `VkImage`.
- Copy to a host-visible staging range on request.
- Complete asynchronously after a fence.
- Return raw premultiplied RGBA.
- Match the complete T02 channel order, bit depth, transfer function, origin, row-stride,
  target-format, and premultiplication contract.
- Do not allocate or synchronize readback work on normal frames.
- Encoding belongs to an optional codec provider.

O16 decision step:

1. Build an evidence-driven candidate set in the proof target. Analytic coverage and MSAA are known
   candidates, not an approved exclusion of other methods.
2. Measure boxes, text, paths, clips, shadows, effects, memory, GPU time, startup, and first use.
3. Select one fixed cross-platform policy.
4. Delete comparison-only paths.
5. Record the accepted policy in `PLAN-FOR-REVIEW.md` before production integration.

Required specification:

- No runtime AA modes, per-window setting, hardware fallback mode, or automatic switching.
- O16 may replace AA edge reference captures.
- O16 cannot weaken geometry, color, parity, performance, memory, or binary gates.

Permanent verification:

- Complete T02 with effects and async readback.
- Include one validation-enabled effect path in T04.
- Do not add per-effect snapshot suites.

Logs:

- Layer and mask IDs, bounds, pass graph, transitions, readback staging/fence/completion, AA policy,
  sample count, and unsupported counters.

Exit:

- The complete proof corpus passes visual thresholds.
- Readback is absent from normal frame traces.
- O16 is accepted and only one product AA path remains.

Reopen when:

- No candidate passes visual and resource gates on all target GPUs.

### S15. Implement retained segments and per-swapchain-image damage

Entry:

- The full-frame Vulkan proof is correct and measured.
- Effect dependency bounds are defined.

Required specification:

- Retain clean `SceneChunk` records, stable GPU ranges, and immutable resources.
- Rebuild and upload only dirty chunks and changed resources.
- Each window owns a monotonic scene version and bounded damage journal.
- Each swapchain image records the latest scene version applied to its preserved pixels.
- Commit an image's applied scene version only after the rendering submission fence and associated
  presentation complete successfully. Acquire, submit, present, resize, close, surface-loss, or
  device-loss failure leaves the prior version authoritative and forces the required recovery draw.
- Retain every referenced chunk, GPU range, and resource until that completion is proven safe.
- On acquire, combine damage newer than that image's version.
- Expand damage for transforms, clips, shadows, opacity, blends, offscreen effects, and overlap
  dependencies.
- Draw intersecting chunks in original visual order.
- Coalesce excessive regions into a larger region or full redraw.
- Full redraw is required for first use, initial swapchain creation, swapchain replacement, resize,
  undefined contents, surface or device recovery, journal overflow, and unknown dependency bounds.
- Do not add a separate full-window backing image or framebuffer tile cache.
- Incremental-present regions are optional hints only.

Required measurements:

- Static frame.
- Sparse mutation.
- Scroll.
- Full mutation.
- Large table.
- Topology.
- CPU and GPU busy-time or the closest stable platform energy/power proxy.

Permanent verification:

- Extend T03 with single-window sparse table and topology damage behavior.
- Fold journal overflow, full-redraw recovery, and resize/close/device-loss with images in flight into
  T04.
- No unit test per damage region or swapchain image.

Logs:

- Window scene version, image applied version, damage regions, expansion cause, intersected chunks,
  reused chunks, upload bytes, full-redraw reason, and present hints.

Exit:

- Sparse large-table and topology P95 improve by at least 20 percent over the recorded Skia reference.
- Pixels remain correct when optional incremental-present hints are ignored.
- No total-frame, present, memory, hitch, or power-proxy regression exceeds Q10 noise.

Reopen when:

- The retained model loses on total frame, hitches, memory, or power proxy after reasonable coalescing
  and dependency optimization. Return evidence to O07 Q&A.

### S16. Implement shared-device multi-window scheduling and bounded recovery

Required ownership:

- One process instance, physical device, logical device, allocator, queue set, pipelines, shaders,
  samplers, curve/band text resources, and shared resources.
- Each window owns its surface, swapchain, views, frame slots, presentation synchronization, format,
  extent, damage journal, and image history.
- Dirty scheduling and presentation are independent.

Scheduling specification:

- Use one process SDL event wait or poll with fair window dispatch.
- A clean, minimized, resizing, blocked, or failed window cannot force another window to rebuild,
  submit, or wait.
- Avoid serial VSync waits across windows.
- Cursor publication follows the focused or pointer-owning window.
- Opening a window verifies presentation support for its surface.
- An unsupported later surface fails that window clearly. It does not silently create another device.

Recovery specification:

- Out-of-date swapchain affects one window.
- Surface loss recreates one window's surface and swapchain.
- Normal recovery uses fence-safe deferred retirement, not `vkDeviceWaitIdle`.
- Device loss stops all submissions, increments the GPU generation, discards failed handles,
  re-enumerates against every live surface, rebuilds one shared runtime, rehydrates logical resources,
  recreates live swapchains, and forces full redraw.
- Allow one automatic rebuild for each device-loss event.
- A second loss during rebuild is a clear fatal renderer error.
- Never fall back to Skia, CPU raster, or an unbounded recovery loop.

Permanent verification:

- T04 is one compact program per platform with three concurrent windows and:
  - 1,000 combined resize, DPI, minimize, restore, close, and reopen operations.
  - 10 injected surface losses.
  - 3 injected device losses.
  - Concurrent independent rendering and input.

T04 acceptance:

- No deadlock, stale presentation, lost input, validation error, or cross-window forced repaint.
- Live Goo-owned resource bytes return within 2 MiB of post-warm state.
- Allocator and cache use plateau.
- Resize, close, surface loss, and device loss remain safe while images and referenced chunks are in
  flight.
- Three-window sparse-change P95 is at least 20 percent faster than the matching recorded Skia
  reference, with no total-frame, memory, hitch, present, or power-proxy regression beyond Q10.

Logs:

- Window, surface, swapchain, GPU generation, recovery attempt, retirement, rehydration, and fatal
  state.

Exit:

- T04 passes on Windows and Wayland Linux.
- One failed or blocked window does not stall another.

Reopen when:

- Target hardware proves one device cannot present to required live surfaces. Multi-device remains a
  deferred Q&A decision.

### S17. Complete remaining required Goo core mechanisms and platform adapters

Entry:

- S03 has classified every reference requirement.
- S11 text and S16 window contracts are stable.
- Only items classified as required Goo core mechanisms enter this stage.

Known mechanism set:

- Aggregate window scheduling and cursor arbitration are completed by S16.
- Packaged font registration, selection, and lifetime are completed by S11.
- Secret text-entry presentation and input policy if confirmed by the S03 matrix.
- Platform-neutral accessibility semantics required by real Goo primitives.
- Windows UI Automation and Linux AT-SPI adapters over the neutral semantics contract.
- Native window focus or raise if required by the accepted live-window behavior.
- A public scroll-range metric only when a real external composition proves that the current public
  primitives cannot provide it safely.

Secret text-entry specification:

- Mask by text element, not UTF-16 code-unit count.
- Preserve IME, selection, caret, navigation, undo, and editing geometry.
- Block copy and cut of protected values according to the explicit property contract.
- Redact protected values from accessibility output and diagnostic logs.
- Do not retain duplicate unprotected display strings.
- This is one property or narrow primitive mechanism, not a password-field control in core.

Accessibility specification:

- Goo core owns a platform-neutral semantic tree and adapter contract.
- Semantics cover only real Goo primitives and required states, actions, text ranges, focus, and
  bounds.
- Windows UIA and Linux AT-SPI object models remain in platform adapters.
- Adapter object lifetime follows semantic identity and window generation.
- Protected text values are never exposed.
- Virtualized or recycled content does not retain stale semantic identity.
- Mature-framework extras remain deferred until a core primitive or end-to-end behavior requires
  them.

Window and scroll specification:

- Native focus or raise operates on a live window only and reports failure clearly.
- Goo does not persist window identity, bounds, monitor choice, or restore data.
- A scroll-range API, if admitted, is read-only state from the existing scroll mechanism. It does not
  add a scrollbar control or product policy.

Permanent verification:

- If S03 confirms protected text as a core requirement, extend T02 with its geometry, selection, and
  redacted semantic output, and extend T04 with IME and clipboard policy.
- If S03 confirms UIA and AT-SPI adapters as required for this delivery, extend T04 with one real
  adapter traversal per platform.
- If S03 confirms native focus or raise, extend T04 with that behavior.
- If S03 admits a scroll-range mechanism, use one external composition to prove it.
- Do not add one test per semantic role, accessibility property, or text-edit command.

Logs:

- Semantic identity, generation, role, action result, adapter publish/revoke, focus result, and
  protected-value redaction counters.
- Never log protected text content.

Exit:

- Every S03 item classified as a required core mechanism is implemented or already satisfied by an
  earlier stage.
- Every behavior classified as public composition is proven without private Goo access.
- Every platform-adapter traversal required by the S03 matrix passes.
- No application control, persistence, storage, or product policy entered Goo core.

Reopen when:

- A proposed mechanism can be composed from public primitives or requires application policy.

### S18. Perform the clean-break Goo production cutover

Entry:

- The branch is `gaps-and-reductions` and the recorded Skia baseline remains available as evidence.
- Removing the old backend before feature parity is explicitly approved.
- Temporary local build and runtime breakage is accepted.

Ordered cutover work:

1. Integrate the typed scene compiler and Vulkan runtime into Goo.
2. Replace `Painter.PaintTo(SKCanvas)` and the `SdlRenderTarget` product path.
3. Remove all production `SK*` integration.
4. Remove SkiaSharp, SkiaSharp.HarfBuzz, native Skia assets, and Ganesh/OpenGL targets.
5. Remove the Wayland shared-memory raster target and raster conversion.
6. Remove `WindowRenderer`, `Window.Renderer`, and raster-only verification as approved by Q5.
7. Move every still-required `Goo.InternalTextInterop` responsibility to the proven G# runtime
   implementation, then delete the C# helper project and assembly.
8. Remove the frozen non-shipping HarfBuzz/FreeType proof, bridge, native assets, and build metadata
   only after the selected open text implementation has passed both RID gates and no Goo-core
   consumer remains.
9. Remove obsolete Skia-internal tests instead of porting them one-for-one.
10. Wire Vulkan offscreen readback into the backend-neutral visual corpus.
11. Update official package contents, dependency metadata, API baseline, XML documentation, and
   third-party notices.

Required specification:

- Goo has one product renderer.
- The runtime cannot select Skia, OpenGL, CPU raster, or a proof target.
- No fallback draw counter is permitted. Unsupported required behavior blocks cutover.
- Goo core and Goo-owned runtime helpers contain no authored C#.
- C# tests, benchmarks, tools, external packages, and vendored dependencies remain allowed.
- Development tools and test infrastructure do not enter the package.
- The approved public breaking changes are documented.

Permanent verification:

- T01 package consumer with the direct Vulkan Goo package.
- T02 Vulkan visual/readback corpus.
- T03 reference workloads and allocation gates.
- T04 multi-window lifecycle and recovery.
- T05 RID package and NativeAOT inventory.
- Existing backend-neutral public behavior tests.

Removal verification:

- Search product source, generated assets, dependencies, package contents, and NativeAOT outputs for
  Skia names and binaries.
- Verify that frozen HarfBuzz/FreeType proof files and native assets are absent from the shipping
  product only after the selected open text implementation passes both Windows and Linux gates.
- Search Goo core and Goo-owned runtime-helper source for authored C#.
- Verify mandatory native-library count does not increase.

Exit:

- Direct Vulkan is Goo's only product renderer.
- Skia, OpenGL Ganesh, CPU raster, and Goo-owned C# runtime code are absent.
- The approved open OpenType and vector implementation is shipped. No HarfBuzz/FreeType fallback,
  bitmap glyph atlas, or separate tessellator remains.
- All focused tests and package checks pass.

Reopen when:

- Any behavior requires a fallback, any package contains Skia, or any target platform fails.

### S19. Qualify Windows/Linux packages and establish the next regression reference

Qualification matrix:

- Windows x64 integrated GPU.
- Windows x64 discrete GPU.
- Linux Wayland x64 integrated GPU.
- Linux Wayland x64 discrete GPU.
- Software Vulkan only for deterministic CI and headless capture. Software-ICD results cannot satisfy
  Q10 hardware gates, become an accepted Q10 hardware result, or replace any hardware result.

Run:

- Release NativeAOT.
- T01 through T05.
- Full accepted Q10 protocol.
- Validation layers during proof and lifecycle qualification.
- Clean-clone restore, pack, and consumer install.
- `git diff --check` and warnings as errors.
- Existing release allowlists, SHA256SUMS, duplicate native-payload detection, Linux GLIBC 2.35 or
  lower compatibility, and the current 20 MiB package cap unless an explicit accepted gate replaces
  one of them.
- A Windows NativeAOT/package job and Windows dependency validator equivalent to the Linux release
  checks.

Package specification:

- RID-specific native assets only.
- No cross-RID leakage.
- SDL, the selected text runtime, Vulkan loader usage, shaders, consumer-supplied compiled-font
  assets, and selected optional codec contents are explicit.
- The Goo core package does not contain application fonts. Source fonts used only for asset generation,
  shader compiler, generators, probes, validation layers, software ICD, and unused SDL binding surface
  do not ship in the runtime package.
- License and third-party notices match actual contents.

Exit:

- Every final acceptance gate in section 12 passes independently.
- Raw qualification logs and artifact hashes are retained.
- The accepted Vulkan result becomes the next regression reference.
- The recorded Skia reference remains unchanged.

## 7. Minimal durable verification system

Only these durable verification targets may be added or expanded for this renderer program.

| ID | Durable target | Required behavior |
|---|---|---|
| T01 | Clean G# package consumer | Freshly packed Goo, mounted cross-assembly generic cell, typed `Build(input)`, `ShouldRebuild`, restore, compile, NativeAOT, open, pump, close |
| T02 | One visual and async readback corpus | Boxes, borders, gradients, text, fallback, CJK, RTL, emoji, images, paths, clips, transforms, opacity, blend, effects, DPI, SVG |
| T03 | One reference hot-path harness | Idle, animation, sparse table, topology, text editing, images/effects, resize, three windows, stage and resource metrics |
| T04 | One lifecycle and recovery program per platform | Pre-cutover three-window action reference, then final 1,000 operations, 10 surface losses, 3 device losses, input, protected text, accessibility traversal, plateau, validation |
| T05 | One package and NativeAOT report per RID | Recorded Skia package information, then final dependencies, native libraries, installed bytes, startup, Skia absence, and Goo core/runtime-helper C# source absence |

T02 capture contract:

- Each case pins logical size, pixel width and height, DPI, font/input hashes, color space, and expected
  origin.
- Readback is tightly defined row-major, top-left-origin, premultiplied RGBA8. Row stride is recorded.
- The capture record includes whether channel bytes are sRGB encoded and the exact Vulkan target
  format and conversion path.
- Strict regions and AA/effect regions use explicit masks generated from the scene contract. Masks
  are reviewed, pinned, and content-hashed before visual comparison is accepted.
- Strict masks use maximum absolute channel delta 1.
- AA/effect masks require at least 99.9 percent of pixels at maximum channel delta 8 or less and no
  channel delta above 24.
- Geometry and text placement is evaluated separately from pixel masks and remains within 0.5 logical
  pixels.

Existing tests remain only when they prove backend-neutral public behavior or an actual hot-path or
lifetime regression.

Do not add:

- One test per Vulkan command, enum, result, state transition, or helper.
- One test per frame-plan record or renderer primitive.
- One allocator test per block or free-list branch.
- One shader snapshot per pipeline.
- One glyph test per script, font, or font table.
- One image test per codec.
- One path test per command or boolean operation.
- A duplicate Vulkan suite beside a Skia suite.

Test addition gate:

A new permanent test requires at least one of:

- A stable external behavior not already covered by T01 through T05.
- A measured hot-path regression that existing workload coverage cannot catch.
- A lifetime, synchronization, or recovery bug that the lifecycle program cannot reproduce without a
  new scenario.

Each stage records tests added, tests removed, test LOC change, and why the net surface is necessary.
Skia-internal tests are deleted or consolidated. They are not ported one-for-one.

## 8. Ephemeral probe policy

Probes answer unknown toolchain or platform facts. They are not a second test suite.

Rules:

1. Use a probe only after documentation, validation, logs, and existing E2E evidence are insufficient.
2. Ask one narrow question per probe.
3. Create it under a temporary directory or an ignored scratch path.
4. Do not reference it from production projects, solution files, CI, or normal tests.
5. Record the command, source digest, environment, result, and decision.
6. Delete the source, binaries, generated output, and temporary packages immediately after the result
   is integrated.
7. Promote only the smallest E2E or hot-path scenario if the finding is a permanent Goo contract.

Allowed probe classes:

| ID | Question |
|---|---|
| P01 | Which historical G# findings changed under the exact 0.4 SDK? |
| P02 | Which Vulkan core and extension capabilities exist across the four target configurations? |
| P03 | Does G# emit correct Vulkan ABI layouts and direct function-pointer calls? |
| P04 | Does SDL expose the required loader, extensions, surfaces, and presentation support? |
| P05 | Does the selected open text implementation satisfy the minimal text ABI, resource, and parity contract on both RIDs? |
| P06 | Does the selected open path implementation satisfy the accepted O03 contract when existing evidence is insufficient? |

Shader reflection is a deterministic build validation step when generated from the pinned compiler.
It does not require a permanent runtime probe.

## 9. Logging and troubleshooting specification

### 9.1 Default behavior

- Logging and profiling are off.
- Disabled paths allocate nothing and do not format strings.
- The normal frame path never performs synchronous GPU waits or readback for logging.

### 9.2 Enabled behavior

- Use a bounded preallocated ring.
- Store fixed numeric records with stable event IDs.
- Correlate every record with run ID, workload ID, process ID, window ID, frame/sample ID, queue,
  submission, fence, and query range where applicable.
- Record the CPU monotonic clock frequency and origin.
- Record Vulkan timestamp period, valid-bit width, query availability, and CPU/GPU correlation method.
- Record refresh rate, display, present mode, target format/color space, and intentional present waits.
- Convert to NDJSON only during explicit flush or process shutdown.
- Report dropped records.
- Keep high-volume draw detail disabled unless a bounded capture is explicitly requested.

### 9.3 Required counters

- Rebuild, layout, plan compile, upload, record, submit, present, and readback counts.
- Managed allocated bytes.
- Vulkan object and device-memory allocation counts.
- Cache and allocator bytes.
- Dirty and reused chunk counts.
- Upload and command bytes.
- Draw, pipeline, descriptor, pass, and barrier counts.
- Surface and device recovery counts.
- Validation error count.

### 9.4 Failure triage order

1. Reject mismatched run context or environment.
2. Check restore, compile, package contents, RID, NativeAOT, and dependencies.
3. Check validation, result codes, synchronization, generations, and retirement.
4. Classify pixel differences as geometry, text, color, AA/effect, or nondeterminism.
5. Check window ownership, damage history, and stale swapchain state.
6. Check managed, native, and GPU allocation and cache plateau.
7. Use stage times and GPU timestamps to locate performance regressions.
8. Re-run the same isolated workload under the same locked protocol and environment.
9. Use one ephemeral probe only if logs and the E2E corpus cannot answer the remaining question.

## 10. Reference and result records

S04 does not define or require a qualifying manifest system. Existing recorded Skia benchmark
information is the only Skia reference input. Do not add permanent Skia benchmark, provenance, or
trace infrastructure.

Vulkan implementation and release records contain only the information needed to reproduce a hard
gate and diagnose a failure:

- Backend and renderer revision.
- Platform, RID, hardware, workload, metric, and locked protocol.
- Pass or fail result for every applicable Q10 gate.
- Raw logs, captures, and hashes when produced by a durable verification target.
- Validation error count.
- Notes for intentional present waits and first-use separation.

Comparison rules:

- Compare Vulkan results to the existing recorded Skia reference when the workload, platform, and
  metric match.
- Compare later Vulkan results to the most recent accepted result with the same workload, platform,
  metric, and protocol.
- A larger regression requires explicit Q&A.
- Never average platform or workload failures into a passing score.

## 11. Luna Max fan-out and integration plan

The lead owns architecture contracts, shared files, integration, and gate decisions. Luna Max agents
own bounded lanes with disjoint paths.

### 11.1 Required handoff from every agent

- Assigned stage and contract IDs.
- Exact files owned and changed.
- Assumptions.
- Commands run.
- Tests, logs, captures, and benchmark evidence.
- Allocation, package, or binary impact when applicable.
- Remaining risks and reopen conditions.
- Confirmation that no unrelated files were changed.

Agents do not commit. The lead integrates one reviewed batch at a time.

### 11.2 Fan-out batches

Rows execute serially from top to bottom. Only lanes within one row run in parallel. A lead gate must
pass before the next row starts.

| Batch | Luna Max lane A | Luna Max lane B | Luna Max lane C | Lead integration gate |
|---|---|---|---|---|
| B00A | Exact SDK restore and package identity | Read-only requirements provenance | Read-only benchmark-harness provenance | S01 exact SDK identity is verified before findings run |
| B00B | Historical finding matrix | Isolated migration and fresh-package consumer | Requirements/workload manifest | S02-S03 pass before Vulkan capability work starts |
| B01A | Vulkan capability census | Shader compiler/SPIR-V provenance | Trace and evidence schema | S05 manifests and schemas are locked |
| B01B | Vulkan registry generator | SDL loader bootstrap and surface probe | Generated-output drift verifier | S06 generated ABI and loader pass |
| B01C | Runtime diagnostics implementation | Q10 log integration | Validation and fatal-snapshot path | S07 consumes S06 IDs and passes disabled-allocation gate |
| B02 | Allocator and resource model | Offscreen target and one-window WSI | Shader sources, SPIR-V, and manifest | Clear and quad proof is validation-clean |
| B03A | Typed frame-plan layout | Read-only semantic-digest fixture | Read-only counting/benchmark fixture | Frame-plan layout and IDs are locked |
| B03B | Scene compiler | Basic pipeline recorder | T02/T03 harness integration | S09 basic slice and zero-allocation gate pass |
| B04A | Resource/cache implementation | Read-only lifetime and budget audit | Rehydration/plateau harness | S10 resource IDs and lifetime are locked before consumers start |
| B04B | Accepted open OpenType text qualification and service | Image provider and decoded-pixel lifetime | Text/image parity corpus | S11-S12 consume the locked resource contract after the open implementation gates pass |
| B05A | Accepted open path implementation | Path hit-test and clip integration | Path benchmark and visual fixture | S13 path contract passes before SVG integration starts |
| B05B | Compiled SVG asset tool/runtime | Compositing and effects | Async readback and AA-independent T02 fixture | Effects/readback pass and the AA comparison corpus is ready |
| B06A | AA candidate lane 1 | AA candidate lane 2 | AA comparison harness | O16 is accepted, comparison-only paths are deleted, and final T02 passes |
| B06B | Retained segment/damage implementation | Sparse workload measurement | Damage-journal lifecycle scenarios | S15 single-window sparse gates pass |
| B06C | Multi-window scheduler | Recovery-injection harness | WSI/resource lifetime audit | S16 three-window and recovery gates pass |
| B07 | Protected text mechanism | UIA and AT-SPI adapters | Public-composition and remaining-core-gap proof | S17 contains only required non-composable mechanisms |
| B08A | Skia deletion and product Vulkan promotion | G# product API migration | Product package manifest | Lead integrates continuously until the Vulkan window starts |
| B08B | Windows hardware qualification | Linux hardware qualification | RID package/dependency/source audit | S19 passes after direct cutover |

### 11.3 Files reserved for lead integration

Unless explicitly assigned for one batch, the lead owns:

- `Goo/Window/WindowParts/Window.Host.gs`.
- `Goo/Window/WindowParts/Window.Frame.gs`.
- `Goo/Window/WindowParts/Window.Sdl.gs`.
- Product `SdlHost` and render-target replacement.
- Shared runtime/device integration.
- Scene compiler to product renderer wiring.
- Project and package files.
- Public API baseline.
- Final Skia removal and G# language-boundary audit.

### 11.4 Parallelism restrictions

Do not parallelize edits that share:

- Vulkan ABI declarations.
- Resource IDs or lifetime state.
- Frame-plan layouts.
- Descriptor and pipeline layouts.
- Swapchain ownership.
- Project/package files.
- Public API files.

The lead locks these contracts first, then fans out implementations that consume them.

## 12. Final acceptance matrix

All rows are independent hard gates.

| Area | Required result |
|---|---|
| Feature | All approved Goo core behavior passes on Windows and Linux |
| Strict pixels | Maximum absolute RGBA channel delta is 1 |
| AA/effect pixels | At least 99.9 percent have maximum channel delta at most 8 and no channel exceeds 24 |
| Placement | Geometry and text displacement is at most 0.5 logical pixels |
| General frame time | No percentile regresses beyond the larger of 3 percent or 0.1 ms |
| Sparse workloads | Table, topology, and three-window sparse P95 are at least 20 percent faster than the recorded Skia reference |
| Absolute frame budget | P95 is at most 8.33 ms and P99 is at most 16.67 ms, excluding intentional present wait |
| Input | P95 input-to-present is at most two refresh intervals plus 4 ms and does not regress |
| Startup | P95 first usable frame does not regress beyond noise |
| Memory | Managed heap, private dirty memory, RSS, and Goo-reserved GPU memory each stay within 5 percent |
| Binary | Each Windows and Linux NativeAOT output is at least 8 MiB smaller than the recorded Skia reference |
| Dependencies | No Skia source, package, native asset, or runtime payload remains |
| Native surface | Mandatory native-library count does not increase |
| Product language | Goo core and Goo-owned runtime helpers contain only G# source. C# vendors, external packages, tests, benchmarks, and tools remain allowed |
| Validation | Zero Vulkan validation errors in proof and lifecycle runs |
| Idle | 60 seconds has zero rebuild, layout, render, submit, present, managed allocation, Vulkan object allocation, and device-memory allocation |
| Idle CPU | Less than 0.5 percent of one CPU core |
| Warm resource | Zero managed allocation and no Vulkan object, pipeline, or device-memory creation |
| Lifecycle | Three windows complete 1,000 operations, 10 surface losses, and 3 device losses without deadlock, stale present, lost input, or validation failure |
| Plateau | Goo-owned bytes return within 2 MiB of post-warm state and caches plateau |
| Platform matrix | Integrated and discrete GPU pass on Windows x64 and Linux Wayland x64 |
| Fallback | No Skia, OpenGL, CPU renderer, software ICD product bundle, or weighted-score escape exists |

## 13. Explicit stop and reopen gates

Stop implementation and return to Q&A when:

- The accepted open path direction fails a required operation or needs a new dependency or policy.
- The accepted O16 analytic-coverage policy fails a final measured visual, performance, memory, or
  platform gate.
- A required Vulkan capability is absent on a target configuration.
- G# 0.4.1 cannot emit a required ABI or NativeAOT path safely.
- The typed frame plan materially loses to the direct control after reasonable optimization.
- Retained damage loses on total frame behavior after reasonable optimization.
- The narrow allocator fails validation, fragmentation, or memory gates.
- One device cannot support the required live surfaces on target hardware.
- Font or color emoji parity needs a new runtime dependency or policy.
- A package or public API tradeoff exceeds the accepted decisions.
- Any Q10 hard gate fails and the fix requires changing an accepted architecture decision.

Do not hide a failed gate in an average, weighted score, fallback, optional platform result, or weaker
reference.
