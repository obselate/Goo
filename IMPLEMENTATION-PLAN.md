# Goo Core Remaining Implementation Plan

Status: active. This file contains only current gaps, unresolved specifications, qualification work,
and release gates.

Current audited baseline: branch `gaps-and-reductions`, 2026-08-25 after the
canonical S15 workload and lifecycle pass, the Q10 manifest expansion, the
q10.text-editing, startup/input-latency, and resize-DPI follow-ups, completed
Linux S07 Effects/Offscreen timestamp integration into T03/T04, combined
`ShaderEffect` plus non-normal `BlendMode` qualification, and Vulkan
`TextEditor` inline/block child-slot qualification.
The S09R primitive, S11 text, S12 image, and S13 path/compiled-vector Linux
implementations are complete. Linux S14 has qualified mixed-axis and rounded
overflow clipping, request-only asynchronous readback, the accepted effect
stack, all public blend modes, and bounded layer lifecycle. S20 adds the
qualified generic precompiled fragment `ShaderEffect` mechanism and internal
nested-layer composition with non-normal blend modes. General masks and a
higher-level filter API are intentional current non-goals: Simulation plus
`ClipPath` or `ShaderEffect` covers animated reveals, and `ShaderEffect` remains
the filter mechanism.
S15 retained-scene, damage, transport, lifecycle, and current Q10 workload
mechanisms are implemented. S07 Effects/Offscreen stage timestamps and Linux
T03/T04 integration are complete, with the Windows repeat still open.
The current five-process actual-NVIDIA final protocol has 8/8 official Linux
workload rows: true-idle, small-animation, virtual-table, topology, text-editing,
image-effects, resize-DPI, and three-window.
The resize-DPI follow-up uses five isolated NativeAOT processes with 300 warmups
and 2,000 measured frames. Every process completes the repeated
1.0 -> 1.5 -> 2.0 -> 1.5 -> 1.0 active-swapchain cycle, submits and presents
exactly 2,000 measured frames, uses both slots, reports zero validation, result,
and fatal failures, closes cleanly, and restores output scale 1.5. Process-median
CPU P50/P95/P99 is `0.137319/1.618522/2.430012 ms`; GPU Main P95 is
`0.113664 ms`.
Five-process rows use 300 warmups and 2,000 measured samples. All eight current
rows pass their exact local contracts and absolute budgets. Sparse/full box rows
remain additional stress evidence, not official Q10 workload coverage.
The q10.text-editing follow-up NativeAOT binary is 5,708,704 bytes with SHA-256
`7751034df36fd2f83db3ef13a175728fddc03f8d875100b05b1b325149324065`.
The q10.text-editing follow-up measures CPU P50/P95/P99 `0.497938/0.552471/0.701151 ms` versus
accepted recorded Skia P95 `0.461491 ms`. The new P95 delta is `+0.090980 ms` or `+19.714%`,
which passes the exact larger-of-3%-or-0.1-ms gate by `0.009020 ms`; GPU P95 is `0.054272 ms`
and allocation P50 is `63,184 B`. The prior current CPU result was `1.201987/1.320821/1.504447 ms`,
so this follow-up reduces CPU P50/P95/P99 by `58.574%/58.172%/53.395%`.
The exact retained-segment fast hit and cached renderer-validation proof apply to Text and TextEditor
only. TextEntry stays on full segment generation and full renderer validation because cached Entry
proof repeatedly lost S17 protected-mask pixels. The active cache remains strong across atlas publication
for the same reason. Repository search found no in-place shaped-payload writer, which is the
shape-reference identity assumption.
Text editing no longer blocks the general frame-time gate. It remains slower than accepted Skia at P95;
no Vulkan-over-Skia claim is made.
The 2026-08-24 startup/readback and synthetic input-latency follow-up uses five fresh
Linux NativeAOT processes on actual NVIDIA hardware, 300 warmups, and 2,000 input samples per process.
Its binary is 5,733,280 bytes with SHA-256
`d0c6a3968681fd0a2675aaf7c6d45c9ba40c8597d131401b5a918e6346047bc6`.
Every process exited 0 with zero validation, result-failure, and fatal failures. Its startup frame has
positive metrics, a mounted invariant root, exactly one submit and present, a present-fence observation,
and a successful non-background readback. Across the five independent processes, the nearest-rank
first-usable-frame P95 is `255.212748 ms` from managed entry and `252.771895 ms` from `Window.Open`
to successful `vkQueuePresentKHR` handoff. Completion-observed upper-bound P95 is `255.238026 ms`
and `252.797173 ms`. This current Vulkan result is the regression reference; disposition of the
missing historical Skia startup distribution remains a final Q&A decision.
The synthetic injection-to-present-handoff result is P50/P95/P99/worst
`0.381620/1.348723/1.625866/1.974053 ms`, so the `37.333334 ms` P95 limit passes.
Completion-observed input upper bounds are P50/P95/P99/worst
`1.571202/6.193419/7.986581/21.262635 ms`.
The clean-source Linux matrix uses commit
`6d4d92e8b0046d51cc5520caa3fccd048d367332` and one 5,815,728-byte NativeAOT binary with SHA-256
`78a459e81fab78630bdd3372454643fed6d79e366879ba4a138281aa0b08aff3`.
All 40 workload processes pass exact local contracts, absolute frame budgets, diagnostics, cleanup,
and warm-resource rules. Five isolated true-idle processes pass at median `0.0997%` of one core with
zero UI/GPU work or allocation. The clean package is 3,783,856 bytes; the validated Linux bundle is
10,087,660 bytes and contains only the three accepted native payloads. Raw evidence and hashes are
`artifacts/reports/s15-q10/clean-linux-6d4d92e-summary.json` and
`clean-linux-6d4d92e-SHA256SUMS`.
Full Q10 remains open only on accepted GPU-memory and binary/package comparison policy and Windows
qualification. Wayland presentation-time feedback remains deferred under S16-D03; nominal display
refresh is the accepted fallback.
Local discrete-Linux implementation and T01-T05 qualification are complete. The remaining hardware
matrix is Windows, Linux integrated GPU, and a second real DPI scale.

After the current-host T01-T05 pass, the remaining program is qualification and release closure:

- Clean-source work: one eight-workload Linux matrix with final provenance and artifact hashes.
- External hardware work: Windows x64 parity, Linux integrated-GPU qualification, and a second real
  DPI scale.
- Final decisions after actionable evidence: irrecoverable historical comparison baselines,
  Goo-reserved GPU-memory attribution, and the frozen binary/package denominator.

Section 9 is the current execution order.

## 1. One current source of truth

This is the only document that tracks current implementation status and remaining work for the Goo
core Vulkan program.

- `PLAN-FOR-REVIEW.md` is the accepted architecture and decision register.
- `IMPLEMENTATION-HISTORY.md` has a historical preamble and continuing stage-history section,
  followed by the byte-identical complete pre-reduction implementation-plan snapshot. It preserves
  completed work, stale sequencing, proof evidence, and prior stage text. The frozen snapshot payload
  SHA-256 is
  `502992f75a4ad76bd9a30a1603b33f3e2ddcdbabd75300259e20414084d610f3`.
- `GAPS-AND-REDUCTIONS.md` is supporting research and the original roadmap. Its
  `Non-negotiable contract` remains an external release invariant, not a progress tracker.
- `docs/audits/2026-08-16-goo-core-requirements.md` owns requirement classifications R01-R18.
- `docs/plans/2026-08-16-gaps-and-reductions-working-state.md` is the immutable entry-state record.
- Performance documents under `docs/perf/` are evidence and baseline inputs.
- `VULKAN-AUTHORING-LIBRARY.md` tracks the parallel Goo-internal Vulkan authoring-library work.
  That work simplifies implementation but does not change stage completion or release dependencies.

If this file conflicts with `PLAN-FOR-REVIEW.md`, the accepted decision wins and this file must be
corrected before implementation continues.

When a stage passes its exit gate, remove it from this file and add its commits, evidence, and reopen
condition to the `Continuing stage history` section of `IMPLEMENTATION-HISTORY.md` in the same change.
Do not edit the frozen pre-reduction snapshot in that file.

## 2. Preserved constraints

These are implementation boundaries, not remaining tasks.

- Scope is Goo core and official Goo packages only.
- Goo core and Goo-owned runtime helpers remain G# only.
- C# remains allowed in tests, benchmarks, development tools, external packages, and large vendored
  dependencies such as Yoga.Net.
- Direct Vulkan remains the only product renderer. Do not restore Skia, OpenGL, CPU raster, or a
  fallback renderer.
- Windows x64 and Linux Wayland x64 are required. macOS is out of scope.
- Layout remains CSS-like Yoga flexbox.
- Vulkan, SDL, text-provider handles, and renderer internals remain absent from the public API.
- Controls composable from Goo primitives remain in consumer code or a separate G# library.
- Goo does not own persistence, storage, restore validation, monitor clamping, or application policy.
- Runtime SVG decoding is not required. The initial SVG path is a build-time compiler.
- Antialiasing ends with one fixed cross-platform product policy.
- Vulkan gradients intentionally support two through four stops. Larger public gradients remain
  diagnosed and emit no draw. Reopen this limit only with a bounded variable-stop buffer and a passing
  many-stop T02 capture.
- The existing external release invariant in `GAPS-AND-REDUCTIONS.md` and release CI keeps official
  Windows x64 and Linux x64 application RIDs within the current 20 MiB installed-size cap. This is
  not a Q10 decision and changes only through an explicit release-contract decision.
- Tests remain minimal and end to end. Add coverage only for public behavior or a real hot-path,
  lifetime, package, or recovery regression.
- Probes are permitted only when documentation, existing logs, and durable E2E evidence cannot answer
  the question. Delete a probe immediately after recording its result.

## 3. Current remaining-work ledger

| Stage | Current state | Next gate |
|---|---|---|
| S07 product diagnostics | Linux implementation and T03/T04 integration complete: upload, main, effects, and offscreen timestamps are asynchronous and fence-owned; disabled diagnostics remain allocation-free | Repeat package, validation, and NativeAOT qualification on Windows |
| S10R shared Vulkan resources | Complete for the Linux substrate used by current allocator/upload/image/text/shared-immutable owners | S11-S14 qualify owner-specific pressure, LRU, cache, and recovery; S19 repeats the substrate and lifecycle gates on Windows |
| S11 text completion | Linux implementation and qualification complete | Windows repeats the gates in S19 |
| S14 compositing, effects, readback, and AA | Linux-complete for its accepted scope; S20 separately completed generic precompiled fragment effects. General masks and a higher-level filter API are intentional non-goals | Final cross-platform T02 evidence and Windows qualification remain S19; reopen O16 only on measured failure |
| S15 retained scene and damage | Retention, damage, transport, Linux lifecycle, first-usable-frame, synthetic input handoff, actual SDL polling, and all 8/8 clean-source official Linux workload rows pass. The matrix uses commit `6d4d92e`, one NativeAOT binary, exact hashes, clean validation, and accepted nominal-refresh fallback | Run Windows and external hardware matrices, then resolve irrecoverable baseline, GPU-memory, and binary/package policy through Q&A |
| S16 shared runtime and window behavior | Complete for the local discrete-Linux core scope. S19 qualification removed normal-close device-wide idle, passed 1,000 operations, 10 injected surface losses, 3 device losses across three live windows, and qualified queue-call isolation and offscreen failure propagation | External Windows and integrated-GPU repeats only; no local D01, D02, or D04 blocker remains |
| S19 release qualification | Local discrete-Linux T01-T05 and the clean-source eight-workload matrix pass. API contracts pass 10/10, core behavior passes 262/262, package and bundle validation pass, and no fallback renderer is present | Run Windows x64, Linux integrated-GPU, and second-real-DPI qualification |
| S20 generic retained shader effects | Implemented and qualified on Linux with two bounded constructors, eight retained parameter slots, 0 B warm allocation, no warm Vulkan resource creation, and internal nested-layer composition with non-normal `BlendMode` | Repeat T02, recovery, package, and NativeAOT qualification on Windows |

No remaining stage is complete end to end across both RIDs. S10R closes only the
Linux substrate for owners that exist before S14. Local discrete-Linux implementation
and qualification are complete. S15 and S19 now wait on external hardware and final
comparison-policy decisions. Q&A owns irrecoverable historical comparison evidence.
Final T02 or Windows evidence may reopen O16 only on measured failure.

### 3.1 Vulkan authoring-library progress

VKSL-001 `VulkanBufferFactory`, VKSL-002 `VulkanImageFactory`, and VKSL-003
`VulkanDescriptorFactory` are implemented and runtime-qualified. VKSL-004 synchronization and
command-resource creation and VKSL-005 transition command emission are also implemented and
runtime-qualified. VKSL-006 pipeline creation, VKSL-007 typed memory policy, VKSL-008 co-indexed
swapchain image ownership, VKSL-009 swapchain-generation retirement, VKSL-010 exact two-slot frame
ownership, VKSL-011 current resource sets, VKSL-012 readback planning and ownership, VKSL-013
multi-window device recovery coordination, and VKSL-014 scene retention proof storage are
implemented and runtime-qualified. The 14-item candidate register is complete
and must pass the acceptance and measurement rules in
`VULKAN-AUTHORING-LIBRARY.md` before implementation.

This work is independent of the core stage dependency graph. Each accepted slice preserves existing
ownership, teardown, recovery, capability, and performance behavior.

### 3.2 Actual remaining release gaps

- S15 current retention, lifecycle, absolute-frame, first-usable-frame, SDL polling acceptance, and
  all eight official workload rows pass on the clean-source Linux NVIDIA protocol. One commit, binary,
  package set, report set, and hash manifest provide final local provenance. Wayland presentation
  feedback remains deferred under S16-D03 with nominal refresh as the accepted fallback.
- Cross-RID parity and final Windows package qualification remain S19 work.

The fixed two-through-four-stop gradient limit, 4-pixel text-stroke limit, excluded bitmap/SVG font
formats, language hyphenation, platform accessibility adapters, and consumer-level widgets are
intentional accepted boundaries. They are not unfinished current core work unless new evidence reopens
their decisions.

## 4. Active dependency order

```text
S07 Linux diagnostics and T03/T04 -> Windows repeat
S15 Q10 clean Linux 8/8 -> Windows matrix -> baseline Q&A -> S15 exit
S19 clean Linux T01-T05 -> Windows, integrated-GPU, and second-real-DPI repeats
S20 Windows repeat         -> S19 cross-RID T02 and T05
```

S07 and S15 may land incrementally. First-usable-frame, synthetic input handoff, and actual SDL
polling acceptance gates pass. Wayland presentation feedback is deferred under S16-D03 and nominal
display refresh remains the accepted fallback. S20 uses the S14 bounded layer owner and is
Linux-qualified. Windows platform, lifecycle, visual, package, and
NativeAOT qualification remains in S19. General masks reopen only for a
required external alpha/luminance mask source; higher-level filters reopen only
if Goo adopts a no-shader-authoring convenience layer.

## 5. Active stage specifications

### S07. Add product Vulkan diagnostics

Current state:

- Product Goo has fixed numeric events, bounded trace/result/validation rings, atomic counters,
  classified Vulkan results, bounded fatal snapshots, and sealed NDJSON output.
- Upload and main-pass timestamps remain asynchronous, fence-owned, and resolved without a wait bit. Effects and offscreen timestamps now wrap their actual pass command ranges.
- The fixed diagnostics query pool has 2 frame slots x 4 stages x 16 scopes x 2 queries = 256 queries. Effects scopes cover 8 backdrop copies and 8 composites. Offscreen scopes cover 8 layer subtree passes. Main and Upload are scope-0 wrappers.
- Stage resolution is asynchronous and fence-owned. No wait-bit query is used.
- Disabled diagnostics create no trace storage, validation callback/messenger, debug-utils dispatch, query pool, or timestamp commands. The Linux package smoke emits exactly zero bytes when disabled.
- The latest registered-font Linux JIT diagnostics smoke exited 0. Its final capture reported
  `heapBudgetAvailable 1`, `heapBudgetSampleCurrent 0`, `heapBudget 57,928,942,592`,
  `driverHeapUsage 26,443,776`, `vulkanObjectAllocationCount 597`,
  `vulkanDeviceMemoryAllocationCount 3`, `vulkanObjectCount 0`, `vulkanDeviceMemoryBytes 0`,
  `cacheBytes 0`, `allocatorBytes 0`, `validationErrorCount 0`, `resultFailureCount 0`, and
  `fatalCode 0`.
- The final core package is `3,682,963` bytes with SHA-256
  `20fa1bb543ffd1294b1e36947b89c046340f0e99180b38eb0b3dba586559e99b`. The staged Linux bundle is
  `9,911,025` bytes. Its Goo.dll is `2,424,832` bytes with SHA-256
  `f4118551633d84df013c0d5599b652c3ecb5b7df940eff33b4401d87aa619407`.
  The qualified SDL payload is `1,504,752` bytes with SHA-256
  `943fb58b939ed726a4aab7dd1225c5f75fd3d690d124a30f893a1b29b9f2de4c`.
- The latest Linux NativeAOT text-controls smoke passed. Its executable is `4,418,544` bytes with
  SHA-256 `a8f08dc645bd4ea88018063453ef511bd3757c729e2a63da92d16228f2707093`, and its complete
  32-file output directory is `16,414,316` bytes.
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
- Image resource diagnostics now report exact resident bytes and live object count without overwriting the
  text cache byte count.
- The product CPU profiler is connected to the product Vulkan trace. Device-memory, descriptor, pipeline, damage, heap-budget, recovery, readback, owner-resource, and retained-frame counters are present. All four timestamp stages are wired: Upload and Main wrappers plus Effects and Offscreen pass scopes.

Linux S07/T03 stage-timestamp qualification:

- Final five-process NativeAOT validation-layer protocol: NVIDIA RTX 3080, driver 610.57.04, `wayland-0`, `image-effects`, 300 warmups, and 2,000 samples. All five processes exited 0. Median Effects P50/P95/P99/Worst was `207872/218112/948224/1359872 ns`; median Offscreen was `73728/77824/79872/404480 ns`.
- Every frame reported Effects `scopeCount=16` and Offscreen `scopeCount=8`, with zero drops, exact completed-frame correlation, zero warm Vulkan object and device-memory allocations, and clean validation.
- The NativeAOT binary was `5,757,936` bytes with SHA-256 `57aeae31abc6214c770f643695a3c407a017cf7098c6691f2d0659f24a5a5c99`. Raw logs are `artifacts/reports/s15-q10/stage-timestamp-final-run-{1..5}.log`.
- The canonical dynamic Q10 five-process route after instrumentation reported CPU P50/P95/P99 `5,151,040/5,816,795/7,675,581 ns` and GPU Main P50/P95/P99 `1,553,408/2,023,424/2,296,832 ns`, versus accepted pre-stage `846,848/933,888/946,176 ns`. The diagnostics-enabled query-write tax is `+83.434%/+116.667%/+142.749%`. This is not an unqualified production regression. Raw logs are `artifacts/reports/s15-q10/stage-timestamp-q10-final-run-{1..5}.log`.
- T04 FailedIdle validation passed 1,000 operations, 10 surface losses, and 3 device losses. After final recovery it emitted `stage_timestamps=1` following a positive Effects event and a successful Offscreen event; sub-resolution Offscreen durations may quantize to zero. The JIT validation stage gate also passed 2,000 samples. `artifacts/reports/s15-q10/summary.json` contains `stage_timestamp_followup`.

Work:

1. Repeat package, validation, and NativeAOT qualification on Windows when the Windows 11 VM exists.

Exit:

- Linux S07 diagnostics, T03 stage metrics, and T04 recovery integration pass the recorded local contract.
- Disabled diagnostics allocate zero managed memory and create no Vulkan diagnostics resource.
- Enabled diagnostics can explain every T02-T04 failure without a permanent probe.
- Product logs contain no protected text, arbitrary application strings, or unbounded payloads.
- Windows qualification remains open.

### S10R. Complete shared Vulkan resource and memory contracts

Current state:

- Production Goo has a generated narrow binding, allocator, registry, upload ring, descriptor tables,
  image resources, text atlas, generation records, and fence retirement foundations.
- Pooled noncoherent mappings track owner-relative written/read ranges and use atom-aligned placement
  and bounded flush/invalidate ranges.
- The Linux substrate is complete for the current allocator, upload, identity/registry, descriptor,
  image, text-atlas, and existing shared-immutable owners. It covers memory admission, upload visibility,
  generation tags, immutable publication, byte counters, pressure admission, and fence-safe retirement.
  Superseded provider image versions retain provider/source identity per GPU entry, retire through existing
  last-use/upload fences while preserving in-flight descriptors, and drop superseded logical registry
  records after retirement. Current image cache entries retain LRU behavior.
- Path and compiled-SVG resources, offscreen/effect/readback resources, and future shader/resource caches
  are intentionally outside S10R and are owned by S13/S14. The completed Linux S11-S13 owner-specific
  text and image contracts are recorded in `IMPLEMENTATION-HISTORY.md`.
- Current normal registered-font JIT capture reported heap budget available `1`, current sample `0`,
  budget `56,243,946,496`, driver usage `31,227,904`, 617 Vulkan object allocations, 4 Vulkan device
  memory allocations, and zero live objects, device memory bytes, cache bytes, allocator bytes,
  validation errors, result failures, and fatal code. The pressure and three multiwindow passes came
  from the immediately preceding package recorded in S07 and are not exact current-font package
  evidence.
- Failed-idle terminal safety retains target and runtime resources and the exact `VkResult`, blocks
  new publication, leases, and submissions, and avoids unsafe destruction after a failed wait. Forced
  failed-idle injection is Linux-qualified. The strengthened focused Linux recovery gate is present in
  the current uncommitted worktree and is the scoped current-owner recovery evidence; it is not a final
  package or both-RID gate.
- The text descriptor-set layout, three text shader modules, text pipeline layout, and two format-keyed
  text pipelines are process-shared. Mutable atlas state remains per-window. Dynamic
  `VK_EXT_memory_budget` is optional, uses a fixed 16-heap table, is enforced before native allocations,
  and publishes an explicit null when unavailable. This behavior is Linux-qualified.
- Exact `VkResult` values are preserved, and lost runtimes reject new leases and submission serials.

Work:

1. Keep the substrate contracts for current owners explicit: allocation, registry identity, upload
   ranges, descriptor publication, device generations, byte counters, pressure admission, and
   fence-safe retirement.
2. Qualify Linux memory type bits, alignment, dedicated-allocation requirements, `bufferImageGranularity`,
   `nonCoherentAtomSize`, device allocation limits, and heap budgets. Linux uses optional
   `VK_EXT_memory_budget` across a fixed 16-heap table, enforces available budget before native
   allocations, and publishes explicit null when unavailable. Windows repeats this qualification in S19.
3. Qualify bounded atom-aligned mapped ranges on coherent and noncoherent memory with the exact
   written or read range.
4. Publish current image/text resources or descriptors only after upload completion. Keep prior storage
   and descriptor bindings immutable until every submission that can reference them has retired.
5. Preserve bounded current image/text-atlas counters and retirement behavior qualified by S11/S12.
6. Preserve process-shared ownership for the existing immutable pipelines, samplers, descriptors, and
   caches without moving per-window atlas or swapchain state out of its owner. Mutable atlas state remains
   per-window.
7. Use the strengthened Linux recovery gate to qualify current image/text rehydration after generation
   replacement, exact `VkResult` preservation, stale-generation rejection, terminal teardown, and
   post-recovery upload/publication. Completed path recovery belongs to S13. Future offscreen recovery
   belongs to S14.
8. Keep warm unchanged current-owner frames free of managed allocation, Vulkan object creation, pipeline
   creation, and device-memory allocation.

Exit:

- Current Linux allocator/upload/image/text/shared-immutable owners use the substrate lifetime,
  publication, accounting, and fence-retirement rules.
- The strengthened Linux recovery gate records current image/text rehydration, new-generation
  upload/publication, stale-reference rejection, exact result preservation, two-window recovery, and
  terminal second-loss behavior without a fatal event.
- Atom-aware mapped ranges pass validation on coherent and noncoherent memory.
- Current-owner budget and lifetime counters return to the accepted post-warm bounds. Owner-specific
  path, offscreen, effect/readback, cache, and recovery gates are S11-S14 work; Windows repeats the
  substrate and lifecycle gates in S19.

### S11. Complete the accepted HarfBuzz and hb-gpu text stack

Current state:

- The Linux implementation is complete for the accepted text stack. Goo owns a trimmed private
  HarfBuzz 14.3.1 plus `hb-gpu` runtime, `Unicode.Bidi` 0.3.18, and generated Unicode 16 line-break,
  grapheme, Scripts, and ScriptExtensions data. Goo core has no runtime `StringInfo` dependency.
- Registered `.ttf`, `.otf`, `.ttc`, and `.otc` fonts cover style, collection, variation, primary,
  and fallback selection. The dictionary-owned font cache is bounded to 32 MiB and 64 entries while
  active provider leases remain independently owned.
- Passive and rich text, `TextEntry`, and multiline rich `TextEditor` render through Vulkan. The
  product path covers CJK, RTL, combining marks, ligatures, wrapping, replacements, hidden spans,
  caret and selection geometry, focus-follow scrolling, active IME composition, rich presentation
  layers, decorations, sharp text shadows, and text stroke through 4 pixels.
- `TextEditor` inline and block child slots share one compiler-owned content clip with editor text.
  Slot children inherit its clip index, depth, and intersected bounds through scroll, nested layers,
  resize, and DPI changes. Unsupported clip contexts skip both editor content and slot children rather
  than painting them unclipped. No public API, shader, descriptor, or Vulkan resource contract changed.
  The Khronos-validation gate passes inline/block pixels, scrolled boundary clipping, retained editor
  text, zero unsupported diagnostics, zero warm Vulkan allocation, cleanup, and close.
- Monochrome glyphs and required COLR/CPAL v0/v1 color glyphs use the same Vulkan text path.
- Text residency uses a bounded eight-page LRU atlas set with stable identities, dynamic discovery,
  upload-before-publication, fence-safe recycle and retirement, byte and live-object diagnostics,
  and generation reconstruction after device loss. Managed per-page storage grows from a small
  bounded initial allocation instead of eagerly allocating the full native page size.
- The final Linux WAE, fresh-package, Khronos-validation, recovery, lifecycle, shader, release-bundle,
  and NativeAOT qualification passed. The current core package and staged bundle sizes are recorded in
  S07 and the S19 qualification document. The earlier text-controls NativeAOT size remains historical
  evidence for that consumer lane.

Locked direction:

- Follow O02 in `PLAN-FOR-REVIEW.md`: trimmed vendored HarfBuzz 14.3.1 core plus `hb-gpu`,
  `Unicode.Bidi` 0.3.18, and generated Unicode 16 text tables owned by Goo.
- Do not add FreeType, ICU, platform text rasterizers, ClearType, a CPU glyph raster path, or public
  text-engine handles.
- Public Slug shader research is superseded evidence, not the active text implementation.

Remaining work and explicit limitations:

1. Text stroke is intentionally capped at 4 pixels. Reopen only with visual and performance evidence
   for a different fixed product limit.
2. CBDT/CBLC, `sbix`, SVG fonts, and language hyphenation remain outside the accepted corpus unless a
   required product case reopens O02.
3. Repeat the same package, provider, corpus, atlas, recovery, slot, and NativeAOT gates on Windows in
   S19.

### S14. Implement compositing, effects, async readback, and one AA policy (Linux scope complete)

Current state:

- This stage consumes the S10R Linux substrate and owns offscreen/effect/readback resource pooling,
  versioning, byte budgets, fence-safe retirement, and reconstruction.
- Linux `Container` and `Button` BoxShadow stacks cover outer and inset shadows, reverse-list ordering,
  signed spread, non-negative blur, rounded geometry, opacity, affine transforms, active ancestor clip
  chains, conservative bounds, and collapsed inset holes. Shape fill and stroke silhouettes use retained
  masks for outer and inset shadows. Shape blur and spread remain bounded atlas morphology
  approximations, and separate fill and stroke silhouettes can accumulate alpha where they overlap.
- Existing public `BoxShadow` and `BoxShadows` on `Text`, `TextEntry`, `TextEditor`, and `Image` now use
  the same bounded analytic rectangular shadow path without unsupported-field diagnostics. The
  consolidated effects gate includes one unobscured Text box-shadow pixel assertion at the open
  x160..272, y108..136 fixture region.
- Shape Outline remains intentionally unpainted. The public API documents that Shape does not paint box
  outlines, and the Vulkan outline path excludes Shape rather than treating it as a missing renderer
  feature.
- Blurred plain, rich/editor, and COLR text shadows use retained monochrome glyph resources and a fixed
  nine-sample Gaussian approximation. It is not a full separable Gaussian and remains subject to later
  high-radius and transformed visual comparison.
- Vulkan outlines now render for non-Shape nodes with width, color, offset, rounded geometry, opacity,
  transforms, and conservative bounds. The focused effects gate passes the outline pixel assertion.
- Arbitrary `ClipPath` and both-axis rounded `Overflow.Hidden` and `Overflow.Scroll` clipping use the
  retained path-mask atlas. Rounded overflow retains one mutable 12-quadratic unit path per node,
  preserves stable identity across resize and radius changes, applies to node content and descendants,
  and keeps an axis-aligned rectangular scissor as a coarse bound.
- Mixed-axis `OverflowX` and `OverflowY` use retained square path-mask strips on the visible axis while
  preserving rounded masks, scrolling, transforms, stable IDs, and ancestor chains. The Linux gate
  covers horizontal and vertical mixed overflow, nested arbitrary clips, affine transforms, text, image,
  rounded hidden and scrolling content, eight corner samples, and three asynchronous readbacks. The
  latest run reported `readbackCount=3`, `drawCount=488`, `planCompileCount=14`, `recordCount=14`, and
  clean close with no fatal, validation, result-failure, or unsupported-scene diagnostics.
- Mixed-axis mask growth has an independent clip-atlas generation. The offscreen readback target no
  longer rejects a valid atlas generation that differs from the shared runtime generation; clip frame
  data owns the atlas generation and descriptor update.
- Nested normal group opacity now renders the subtree at unit opacity into a bounded sampled layer and
  composites the layer once with local opacity. The separate fence-safe `VulkanOffscreenLayerPool`
  tracks leases, resident bytes, target count, creation, reuse, pass, composite, pressure, and failure
  events, and collects on swapchain recreation and close.
- Linux SDL hosts acquire the SDL Vulkan loader before creating a Vulkan window and release the
  host-owned loader lease after window teardown. Vulkan target bootstrap and recovery reuse that lease,
  so Wayland window creation and recovery do not race the loader lifecycle.
- COLR fill plus stroke and shadow effects pass the focused Linux color-glyph assertion.
- All 15 non-normal public `BlendMode` values lower to portable source/backdrop composition. The Linux
  gate covers Multiply, Screen, Overlay, and Difference with deterministic overlap pixels. Bounded
  backdrop copies, nested layers, same-command target reuse, transfer transitions, and final teardown
  pass without pool pressure failure.
- The consolidated effects and mixed-axis gates also pass on Ubuntu 22.04.5 under Weston, lavapipe,
  and Khronos validation. The effects run reports 72 layer passes, 72 composites, eight layer-target
  creations, 964 draws, two readbacks, and clean close. The mixed-axis run reports 488 draws, three
  readbacks, and clean close. Neither run reports a validation, result, or fatal Vulkan error.
- Product readback is an internal, owner-thread, request-only one-slot facility. It replays the normal
  scene into a private `VK_FORMAT_R8G8B8A8_SRGB` image, copies an explicit region to a host-visible
  staging buffer, completes through a fence, and returns top-left premultiplied sRGB RGBA8. The fixed
  format is admitted only with optimal-tiling color-attachment, blend, and transfer-source support.
- The readback slot retains request-time extent across resize, pins shared image/text/path/clip owners
  through a runtime lease, drains after successful device idle, and abandons explicitly on device loss.
  It has a 64 MiB nominal image-plus-staging budget and no swapchain transfer-source dependency.
- A TestRelease friend gate requests, polls, and takes one 64x64 region through the product seam. It
  passes twice on local Wayland and once with Khronos validation, with exact metadata and bounded
  one-LSB linear/sRGB pixel tolerance, zero validation errors, zero result failures, and zero live
  Vulkan objects after close.
- Three isolated 64-sample active runs reported median P95 values of 6.938 ms for normal scene record,
  7.118 ms through offscreen submission, 7.190 ms when completion was observed before managed copy,
  and 7.191 ms when the result was ready. Dedicated GPU timestamps reported 6.240 microseconds for
  scene replay and 2.848 microseconds for image-to-buffer copy. CPU copy reported 1.473 microseconds.
- Warm active captures allocate 240 bytes through request and a median 18,688 bytes through completion
  for the 16,384-byte result payload. One 96x96 image plus the requested 64x64 staging region retains
  53,248 nominal resource bytes and reuses one slot. First use creates 19 accounted Vulkan objects.
  A single paired process sample measured active minus disabled at about 2.2 MiB RSS, 1.7 MiB PSS,
  and 1.6 MiB private memory; duplicate request-owned renderer/driver state remains a reduction target.
- Three isolated disabled runs performed zero requests, completions, takes, resource creates, retained
  readback bytes, and measured-frame managed allocation. The eight-frame warmup loop allocated 96
  bytes total. Frame P95 varied from 7.194 to 7.360 ms. Frame timing is compositor/present sensitive
  and is not a subtractable readback-cost estimate.
- `docs/perf/2026-08-19-vulkan-async-readback-baseline.md` preserves the six raw runs, aggregate
  reference, process-memory sample, provenance, and matched comparison rules for later optimization.
- O16 is accepted: one fixed analytic-coverage policy is shared by Windows and Linux. All product
  targets and pipelines remain single-sampled; no MSAA, runtime AA modes, per-window settings,
  fallback chain, or automatic strategy switching is allowed. The local Linux device supports 1x, 2x,
  4x, and 8x color samples, but that capability does not change the accepted policy.
- The ephemeral proof-only layered-MSAA4 A/B ran three times on the same Linux NVIDIA fixture. GPU
  median was `10,528 ns` for analytic coverage and `14,176 ns` for layered MSAA4 (`+34.65%`), with
  18 versus 20 resources and a `65,536 B` nominal MSAA intermediate attachment. Shader validation
  and host runs completed with zero validation or fatal errors, and the comparison code was deleted.
  This retains analytic coverage and therefore is not a pure-MSAA quality or performance comparison,
  and does not complete T02.
- The current Linux x64 stripped NativeAOT effects-gate executable passes and is `4,489,488` bytes with
  SHA-256 `048e7d6c9d6e60d94f8556b1160cf25fee0f66afa169f95667d8a0498cf2723a`.
- The S14 typed declarative Style effect boundary remains accepted. S20 separately adds the bounded
  public `Style.ShaderEffect` integration point for precompiled fragment SPIR-V while keeping Vulkan
  shaders, pipelines, descriptors, compiler objects, and handles internal. General masks and a
  higher-level filter API are intentional non-goals, not S14 blockers.
- `LayerSubtreeBounds` now tightens allocations with a root-space AABB seeded from the active viewport
  and intersected with emitted ancestor rectangular, path, rounded, and mixed clips. The bounded Linux
  Wayland proof verified four targets shrinking from 1800x1350 to 2x2 at 2x DPI, reducing nominal
  layer-pool target storage by exactly `38,879,936` bytes. Final resident targets and leases are zero.

Work:

1. No remaining Linux S14 implementation work. The comparison-only AA code is deleted.
2. Final cross-platform T02 evidence and Windows qualification belong to S19. Reopen O16 only if those
   measurements show a failure of the accepted analytic-coverage policy.

General masks remain unnecessary without an external alpha/luminance mask-source requirement:
Simulation plus `ClipPath` covers hard animated reveals and Simulation plus `ShaderEffect` covers
soft or procedural reveals. `ShaderEffect` remains the only filter mechanism; no higher-level core
API or convenience package is planned. Generic precompiled fragment effects are complete under S20.

Exit:

- The Linux T02 effects and readback region for the current S14 scope meets visual thresholds.
- O16 is accepted and exactly one product AA path remains: fixed analytic coverage with single-sampled
  targets and pipelines. Final cross-platform T02 and Windows qualification remain S19 gates.

### S15. Retain clean scene segments and per-image damage

Current state:

- Demand-driven scheduling can skip an idle frame.
- Strict leaf `Container` and `Button` nodes with solid or rounded box paint now take an exact
  retained path. An exact hit appends the cached logical record directly to the reusable `SceneFrame`.
  An exact miss performs a direct exact rebuild of that leaf record and refreshes its owner state.
  Generic compilation remains the fallback for children, gradients, images, combined background and
  border paint, non-solid or rounded borders, outlines, shadows, clips, transforms, scroll, opacity
  context, blend, and other unsupported state.
- A transparent leaf `Container` or `Button` with a solid square per-edge border can retain and
  directly rebuild its exact logical `PerEdgeBorderRecord`. Exact validity covers bounds, all four
  widths, all four zero radii, all four packed colors, style, transform index, node kind, and
  `ScenePaintVersion`. At least one edge must be visible and every edge color must be finite. One
  retained border scene draw expands to as many as four primitive records. The one-edge color gate
  proves one dirty 128-byte primitive record without claiming one border GPU record in total. The hot
  path checks common eligibility once, constructs the exact border record once, and passes that same
  record to exact comparison or direct rebuild.
- An eligible child-bearing `Container` or `Button` can retain and directly rebuild only its own
  solid or rounded box record. A direct parent hit or rebuild then recursively compiles its children
  through the generic path, so child data is never retained in the parent record. Unsupported parent
  state clears the retained parent, uses the generic parent and child fallback, and recaptures when
  eligibility returns. The focused TestRelease fixture covers parent hit, rebuild, fallback, child
  continuation, and recapture, with `parent_own_box=1` in the gate evidence.
- Exact leaf validity uses stable owner/node identity, `ScenePaintVersion`, bit-exact logical bounds,
  node kind, packed color, opacity, rounded radii, and the exact per-edge border fields above. Generic
  `ContentKey` or `TopologyKey` hashes do not validate exact leaf records or exact-rebuild damage.
  Exact-leaf misses record the old and new bounds directly, so the damage union is not a
  probabilistic hash result.
- A primitive SSBO dirty-range slice uploads 128-byte std430 records from mapped staging into
  device-local storage. Each window has two fence-safe slots; the offscreen target has one.
- Each slot keeps exact accepted per-slot record history. History commits only after accepted
  submission or submission reconciliation. Buffer growth and device loss invalidate the history.
  First use, buffer generation changes, and record-count changes force a full upload. Otherwise exact
  record comparison coalesces consecutive dirty records into 128-byte copy ranges. Clean frames issue
  zero GPU copy ranges and zero flushes while still writing one staging candidate.
- Stable owner, topology, and content keys are fast prefilters on the generic path. Reuse additionally
  requires exact retained draw metadata, bit-exact solid, rounded, or per-edge border scalar records,
  bounds, and resource identities. A digest collision therefore cannot suppress damage or reuse
  stale records. Exact leaf chunks use the direct hit/rebuild state above.
- Each window has a bounded damage journal. Each swapchain image has pending and applied scene versions.
  A successfully presented version becomes applied only when that image is acquired again with defined
  contents.
- The damage journal stores exact float-bit scale keys and physical framebuffer extent per scene
  version. Any scale or extent transition forces full damage, including scale plus mutation. The
  `GOO_VK_DAMAGE_JOURNAL=1` ABI gate covers same-key no damage, scale-only, extent-only,
  scale-plus-mutation full damage, bounded logical mutation, eviction gaps, reset, and abandoned
  versions. Full-redraw frames record their current physical key before the full override, so later
  reacquisition does not treat a missing key as a scale transition.
- Stable-topology solid and rounded boxes can redraw one coalesced damage region in original visual
  order. First use, swapchain replacement, resize, recovery, journal gaps, topology changes, clips,
  transforms, resources, layers, effects, and unknown dependencies still force a full redraw.
- Normal-blend solid, rounded, and square solid per-edge border scenes do not require swapchain
  transfer-source support to remain partial-safe. Actual unsupported non-normal blend use still
  records unsupported state and forces the full fallback.
- The Linux TestRelease lane passes strict solid, rounded, and square solid per-edge border leaf
  rebuilds, exact warm hits, one-color and bounds misses, unsupported fallback and recapture,
  old-plus-new damage, direct state from the actual last successfully presented image, per-image
  version promotion, separate offscreen-replay readback pixels, and clean close. The retained
  no-clip typed payload slice retains two fence-safe per-slot payloads. Eligible frames have no masks,
  one clip chain, and no layers, with matching draw and byte counts, capacity, and buffer generation.
  First use and every ineligible, changed, aborted, recovered, or device-lost path writes and flushes;
  matching later uses skip both operations. This is a first slice, not the S15 exit gate.
- The payload byte count and descriptor range use the physical
  `VkPhysicalDeviceProperties.limits.maxStorageBufferRange` carried through `VulkanSharedRuntime` on
  both window and offscreen paths. uint64 bounds require
  `4 + 12 * DrawRefCount + 12 * ClipMaskCount <= Int32.MaxValue`, with each count independently capped
  at `178,956,970`, and `totalWords * 4 <= maxStorageBufferRange` before int32 indexing or casts.
- The stronger S15 gate passed with `first_use_full=1`, `box_mutation=1`, `partial_damage=1`,
  `bounds_old_background=1`, `topology_add_full=1`, `topology_remove_full=1`,
  `exact_leaf_solid_rounded=1`, `exact_color_miss=1`, `exact_bounds_miss=1`, `exact_border_leaf=1`,
  `unsupported_fallback_recapture=1`, `parent_own_box=1`,
  `primitive_first_full=1`, `primitive_slots=2`, `primitive_warm_copy_zero=1`,
  `primitive_staging_candidate=1`, `primitive_mutation_dirty=1`, `primitive_mutation_written=128`,
  `primitive_topology_full=1`, `image_version_promotion=1`, `damageCount=28`,
  `dirtyChunkCount=0`, `reusedChunkCount=7`, `drawCount=198`, `recordCount=28`,
  `clipWritten=3664`, `clipSkipped=6336`, `clipMapped=10`, `clipFlushes=10`, `clipReuse=18`,
  `clipRetained=1`, and `close=1`.
- The one-box mutation proves one dirty record, one copy range, 128 copied bytes, and one flush.
  Topology add forces a full primitive upload. Both window slots are clean-reused. Goo and
  `Goo.AsyncReadbackSmoke` Release warnings-as-errors builds reported 0 warnings and 0 errors.
- An earlier real-Wayland checkpoint passed default readback, S09R, S14 effects,
  rounded overflow, FailedIdle, and proof-scene readback. A later actual-NVIDIA
  requalification reported zero COLR and `rounded_text` coverage. The root cause
  was classification, not rendering: first-use text-atlas publication returns
  !emitted with redrawRequired on frames one and two, and Paint labeled that
  transient cause unsupported Content permanently. `VulkanTextScene` now exposes
  per-call publicationPending and Paint suppresses unsupported Content only for
  that pending cause; permanent unsupported paths are unchanged. On the current
  RTX 3080 source, rounded overflow passed 3/3 fresh processes and effects/COLR
  passed 3/3 fresh processes, each also passing once with
  `__GL_SHADER_DISK_CACHE=0`, and both pass on CPU Lavapipe. S09R, text viewport
  cull, text transport, and the NVIDIA FailedIdle lifecycle pass. This closes
  the local NVIDIA feature/pixel prerequisite, not complete eight-workload T02
  or Windows coverage.
- The presented-image state oracle directly records the exact successfully presented image index, its
  acquired applied version, the pending version assigned by that present, and whether that acquisition
  promoted pending state. It pairs that state with `activeDamageRegion` and `activePartialRedraw` and
  does not reconstruct damage from `sceneVersion - 1`. Pixel assertions are a separate offscreen
  replay oracle and are not described as swapchain-image readback.
- The historical 60-process data measures retained damage only. It is not a historical pre/post product
  binary comparison or a full-frame/GPU result. No long benchmark harness is retained. See
  `docs/perf/2026-08-20-vulkan-s15-first-slice-linux.md` for that data and the fresh control.

Fresh current-binary retained-leaf control:

- The final current source, including exact generic chunk proof, was compared with an output-neutral
  generic fallback. Each workload used six case-isolated fresh processes in ABBAAB order, three per
  arm, with 30 warmups and 120 samples for 1,000 leaves. All cells allocated `0 B`, matched output
  hashes, and reported 1,002 chunks and 1,000 draws.
- Positive values mean retained was faster than the generic fallback. The CPU scene-compile control is
  not a historical pre/post product-binary comparison and is not a full-frame or GPU result.

| Workload | P50 improvement | P95 improvement |
|---|---:|---:|
| Static solid | `+17.367%` | `+20.033%` |
| Static rounded | `+18.911%` | `+1.225%` |
| Mutation N1 | `+37.954%` | `+6.665%` |
| Mutation N100 | `+14.698%` | `+16.249%` |
| Mutation N500 | `+31.689%` | `+17.178%` |
| Mutation N1000 | `+13.321%` | `+12.634%` |

- An earlier intermediate reported mutation N1000 at `-13.618%` P50 and `-44.275%` P95 before
  direct exact rebuilds were added. That intermediate was rejected and is not accepted evidence.
- No validation or Windows claim is made by this checkpoint. The warnings-as-errors build reported
  `0` warnings and `0` errors.

Exploratory child-bearing parent own-box control:

- This is a current-binary, plan-only ABBAAB control with 1,000 eligible parent boxes and 1,000
  generic-compiled children, 30 warmups, and 120 samples per process. Both arms produced the
  identical hash `10921959993146536336`, 2,002 chunks, 2,000 draws, and `0 B` allocations at P50
  and P95.

| Fresh process | Retained P50/P95 ns | Generic P50/P95 ns |
|---|---:|---:|
| 1 | `2067689 / 2574675` | `2713707 / 3939820` |
| 2 | `2017164 / 2655698` | `2724658 / 3069288` |
| 3 | `740817 / 2794309` | `2695764 / 2936678` |

- The median cross-process improvement is `+25.668%` P50 and `+13.475%` P95 for retained versus
  generic. Record, submit, GPU, and full-frame evidence is unavailable. This plan-only control makes
  no Q10 or Skia claim and retains no long benchmark harness.

Exact border leaf control:

- This current-binary plan-only ABBAAB control uses 1,000 transparent square solid four-sided border
  leaves, 30 warmups, and 120 samples per fresh process. Both arms produced hash
  `5436057910800725072`, 1,002 chunks, 1,000 scene draws, and `0 B` allocations. Those scene draws
  expand to 4,000 primitive records.
- The median-of-three retained result is `1882942 / 1972601 ns` P50/P95. The output-neutral generic
  result is `2043204 / 2202644 ns`. Retained compilation is `+7.844%` faster at P50 and `+10.444%`
  faster at P95. Record, submit, GPU, and full-frame evidence is unavailable. This makes no Q10 or
  Skia claim and retains no long benchmark harness.
- The corrected pre-optimization result improved P50 by `17.202%` but regressed P95 by `7.921%` and
  was rejected. The accepted path removes duplicate width resolution and finite/visibility checks.
- The pre-P04 4,900-cell StocksGrid control is retained as historical evidence only. It used six
  current-binary ABBAAB processes, 30 warmups, and 120 samples per process; both arms produced full
  redraws and zero reused chunks. P04 supersedes its text-workload conclusion with the accepted exact
  cached-glyph paint-bound viewport cull for strict leaf `Text` and a non-boxing
  `VulkanTextAtlasGlyphKey`. P04 adds no public API.

Accepted P04 strict-leaf text control:

- The 4,900-cell full control used 300 warmup and 2,000 measured frames. Median CPU P50/P95 was
  `18.077680/18.809680 ms`, worst was `62.564055 ms`, allocation was `2,820,666 B/frame`, and
  `3,711` offscreen items were skipped. The recorded baseline was `35.022465/53.240000 ms`, worst
  `78.539000 ms`, and `6,109,729 B/frame`.
- The short GPU control median reported CPU P50/P95 `18.043688/19.618076 ms`, Main GPU P50/P95
  `2.366464/2.612224 ms`, `2,815,146 B/frame`, and `3,373,177` draws. Its baseline was
  `35.723980/55.554462 ms`, Main GPU `7.949312/12.897280 ms`, `6,076,094 B/frame`, and
  `13,900,767` draws.
- The disabled-readback S14 hot path remains `0 B` at P95 and maximum. This accepted local Linux
  iteration closes the strict-leaf text full-redraw issue; it does not extend hardware coverage.
- Full P04 evidence is in
  `docs/perf/2026-08-21-vulkan-performance-p04-exact-text-cull-key-accepted.md`.

Bounded retained-text checkpoint:

- Wave 2 added owner-side text snapshots, exact emission completeness, atlas generation and residency
  protection, strict eligibility and fingerprints, hit/rebuild/fallback wiring, culled placeholder
  chunks, and partial-replay admission for cached glyph runs and transforms. It unlocked 239-240 partial
  frames out of 240, but CPU time increased and allocation remained about 2.79 MiB/frame at 4,900 cells.
- Wave 4 moved strict offscreen-cull layout lookup through the layout cache, which removed full emission
  for offscreen mutated fixed-pixel text. At 4,900 cells, two short runs measured P50
  `17.512/17.537 ms`, P95 `18.85/19.10 ms`, `2,771,391 B/frame`, 184 dirty chunks, 4,718 reused chunks,
  and 23,647 rebuilds. Total recorded draws fell 33 percent from the wave-3 comparison.
- These are 60-warmup, 240-sample, unvalidated JIT measurements. They are structural and diagnostic
  evidence only. They do not satisfy the five-process NativeAOT Q10 protocol, the 8.33 ms P95 gate,
  allocation limits, or S15 exit conditions. Any later unrecorded probe output is not accepted evidence.
- Exact evidence and non-claims are in
  `docs/perf/2026-08-21-vulkan-s15-text-retention-wave2-linux.md` and
  `docs/perf/2026-08-21-vulkan-s15-text-retention-wave4-linux.md`.

Rejected primitive-staging follow-up:

- P05 measured the unchanged 1,000-record control at `1.104663/1.413635 ms` CPU P50/P95 and
  `544,586 B/frame` across five isolated processes.
- P06 eliminated 128,000 mapped stores but added a second source/history comparison. Median P50/P95
  regressed by `1.971%/0.564%` with no allocation or GPU-upload improvement.
- P07 performed one combined comparison/range pass and removed the later scan. Median P50/P95 still
  changed by `+0.076%/+0.328%`, with allocation and GPU upload unchanged. The audit requires a measured
  absolute total-result improvement, so P06 and P07 were removed. Their separate evidence documents
  remain under `docs/perf/2026-08-21-vulkan-performance-p0{5,6,7}-*.md`.

Q10 blocker ledger (audited 2026-08-25):

- The official manifest in `docs/perf/q10-workloads-v1.json` defines eight
  workloads. The final actual-NVIDIA matrix has 8/8 current Linux official
  rows: true-idle, small-animation, virtual-table, topology, text-editing,
  image-effects, resize-DPI, and three-window, plus two non-manifest box stress rows.
- The five-process resize-DPI follow-up closes the frame-120 active-swapchain
  failure after the lost-retry correction. Each process passes 300 warmups and
  2,000 measured frames with exact submit/present counts, both slots, clean
  diagnostics, close, and scale restore. Raw logs are
  `artifacts/reports/s15-q10/resize-dpi-final-run-{1..5}.log`.
- The clean-source matrix at commit `6d4d92e` supersedes the earlier dirty-tree rows. One NativeAOT
  binary produced all 40 process logs with exact hashes and unchanged source provenance.
- 2026-08-23 targeted pixel requalification on the current RTX 3080 source:
  after fixing the publication-pending misclassification in Paint, rounded
  overflow passed 3/3 fresh processes and effects/COLR passed 3/3 fresh
  processes, each also passing once with `__GL_SHADER_DISK_CACHE=0`; both pass
  on CPU Lavapipe. The protected-text rendering blocker was traced to Paint
  directly calling EmitEntry/EmitEditor, bypassing generic `VulkanTextScene.Emit`
  and leaving `activeNodeSegments` unset; routing Entry/Editor through generic
  `Emit` and making specialized emitters private passed actual-NVIDIA
  protected-text 3/3 processes and CPU Lavapipe protected-text. The current
  final-protocol image/effects row now exists and passes its local contract and absolute budget.
- `docs/perf/2026-08-16-gsharp-0.4.1-skia-baseline-status.md` records the
  accepted clean-source comparison for text editing only. The five-process NativeAOT follow-up measures
  CPU P50/P95/P99 `0.497938/0.552471/0.701151 ms`, GPU P95 `0.054272 ms`, and allocation P50
  `63,184 B`, versus the prior current CPU `1.201987/1.320821/1.504447 ms`.
  Against accepted recorded Skia P95 `0.461491 ms`, the new result is `+0.090980 ms` or `+19.714%`
  and passes the exact larger-of-3%-or-0.1-ms gate by `0.009020 ms`. The exact retained-segment
  fast hit applies to Text and TextEditor only. TextEntry stays on full segment generation and full
  renderer validation because cached Entry proof repeatedly lost S17 protected-mask pixels. The
  active cache remains strong across atlas publication for the same reason. Repository search found
  no in-place shaped-payload writer, which is the shape-reference identity assumption. Table and topology controls are reconstructed from commit
  `9d28533`. No reconstructed result is relabeled as recorded pre-removal evidence.
- The original manifest-expansion measurement remains in `IMPLEMENTATION-HISTORY.md` as historical evidence.
- Exact current results, raw text fast-hit logs, and non-claims are in
  `artifacts/reports/s15-q10/summary.json`,
  `artifacts/reports/s15-q10/text-fast-hit-final-run-*.log`, and
  `docs/perf/2026-08-23-vulkan-s15-exact-cull-virtualization-linux.md`.
- The 2026-08-24 startup/readback and synthetic input-latency follow-up used five fresh Linux
  NativeAOT processes on actual NVIDIA hardware, 300 warmups, and 2,000 input samples per process.
  The binary is 5,733,280 bytes with SHA-256
  `d0c6a3968681fd0a2675aaf7c6d45c9ba40c8597d131401b5a918e6346047bc6`. Every process exited 0 with
  zero validation, result-failure, and fatal failures. The startup frame had one submit/present,
  positive metrics, a mounted invariant root, a present-fence observation, and a successful
  non-background readback. Nearest-rank first-usable-frame P95 across the five processes is
  `255.212748 ms` from managed entry and `252.771895 ms` from `Window.Open` to handoff.
  Completion-observed upper-bound P95 is `255.238026/252.797173 ms`. This establishes the current
  Vulkan regression reference. Synthetic injection-to-present-handoff P50/P95/P99/worst is
  `0.381620/1.348723/1.625866/1.974053 ms`; the `37.333334 ms` P95 limit passes. Completion-observed
  input upper bounds are `1.571202/6.193419/7.986581/21.262635 ms` P50/P95/P99/worst.
- Presentation retirement uses bounded presentation-token and completion history plus bounded retired
  generation records. Successful `vkQueuePresentKHR` handoff timestamps and present IDs are monotonic
  by token, while callbacks are stored by token and may arrive out of order. With
  `VK_EXT_swapchain_maintenance1`, completion-observed timestamps are later UI-thread observations of
  a signaled present fence and are upper bounds. A route without present-fence support is named
  `present-handoff-only`, not completion observation. Retired generation records and their presentation
  records are cleaned after the anchor completes, and failed or abandoned paths cancel pending latency.
- The fixture applies causal pointer, key, and committed-text mutations. Each mutation increments only
  its corresponding counter and one rendered generation, and all five runs preserve the exact per-kind
  handoff medians: pointer `0.346123/0.476438/0.529628 ms`, key `0.339610/0.461310/0.518588 ms`,
  and committed text `0.747760/1.567176/1.711557 ms` P50/P95/P99. A separate Khronos-validation
  gate pushes pointer, key, and committed UTF-8 text through `SDL_PushEvent`, consumes them through
  product `SdlRuntime.PumpEvents` and `SdlHost.Dispatch`, and reports
  `sdl_poll=1 pointer=1 key=1 text=1 submit=3 present=3 close=1`. Wayland presentation feedback
  remains deferred under S16-D03 with nominal refresh as the fallback. Raw evidence is
  `artifacts/reports/s15-q10/summary.json` and
  `artifacts/reports/s15-q10/latency-final-run-*.log`.
Current follow-up work (not full Q10 qualification):

- `q10.image-effects` component isolation is JIT TestRelease with 300 warmups and 480 measured frames,
  not official NativeAOT qualification. Full current P50 is `5.471 ms`; static scene P50 is
  `3.533 ms` with Paint about `3.366 ms`; eight mutations only are `4.759 ms`; one same-size
  replacement is `5.254 ms` with `1.077 ms` layout because `ImageLayouts.Refresh` marks Yoga dirty
  whenever `DecodedImage` identity changes. Disabling all non-normal blend layers gives `5.456 ms`,
  only `0.015 ms` below full. Pixel generation plus the immutable `ImageSource` copy creates two
  `262,144-byte` arrays. The dominant CPU cost is compiling and recording the full 256-card,
  1,316-draw scene, not the eight blend layers. This remains an optimization target, not a fix or API approval.
- Deferred image-effects fix note: first split direct-image completion invalidation so same-size
  `DecodedImage` replacement schedules Content and Paint without Yoga layout, while intrinsic
  width or height changes still schedule Layout. Re-measure that slice before addressing retained
  compile/record reuse for the static 256-card scene. Preserve public `ImageSource` copy ownership
  and add no public API.


Official workload state (current Linux final-protocol rows: 8/8):

| Workload | State | Current evidence and blocker |
|---|---|---|
| `q10.true-idle` | Measured (clean Linux) | Five isolated nested-KWin scale-1 processes pass 60 seconds with zero work or allocation; median CPU is `0.0997%` of one core. Windows repeat remains missing |
| `q10.small-animation` | Measured (clean Linux) | CPU P50/P95/P99 `0.511/0.554/0.812 ms`, GPU P95 `0.026 ms`; exact submit/present, warm resources, diagnostics, and close pass |
| `q10.virtual-table` | Measured (clean Linux, reconstructed control) | CPU P50/P95/P99 `1.165/1.387/2.808 ms`, GPU P95 `0.164 ms`; exact submit/present, warm resources, process memory, diagnostics, and close pass |
| `q10.topology` | Measured (clean Linux, reconstructed control) | CPU P50/P95/P99 `1.410/1.849/2.384 ms`, GPU P95 `0.121 ms`; exact submit/present, warm resources, process memory, diagnostics, and close pass |
| `q10.text-editing` | Measured (clean Linux, frame gate pass) | CPU P50/P95/P99 `0.486/0.521/0.628 ms`, GPU P95 `0.058 ms`, allocation P50 `61,776 B`; the accepted Skia comparison gate remains passed |
| `q10.image-effects` | Measured (clean Linux) | CPU P50/P95/P99 `5.146/6.049/7.808 ms`, GPU P95 `1.936 ms`; absolute budgets, exact submit/present, diagnostics, and close pass |
| `q10.resize-dpi` | Measured (clean Linux) | CPU P50/P95/P99 `0.129/1.453/2.116 ms`, GPU P95 `0.117 ms`; five repeated active-swapchain cycles pass exact submit/present, both slots, diagnostics, and close |
| `q10.three-window` | Measured (clean Linux) | CPU P50/P95/P99 `0.642/1.461/1.613 ms`, GPU P95 `0.022 ms`; global submit/present delta is 2,033 and clean local slots remain unchanged |

Hard-gate state:

| Gate | State | Exact blocker |
|---|---|---|
| Feature and pixel coverage | Partial | Effects/COLR, rounded-overflow, protected-text, image/effects, and all eight current Linux workload routes pass on the current RTX 3080 source; Windows remains |
| Absolute frame budget | Partial | All eight current Linux workload rows pass their local absolute budgets; Windows remains |
| General frame time | Pass for q10.text-editing | The current text follow-up P95 is `0.552471 ms` versus accepted recorded Skia P95 `0.461491 ms`, a `+0.090980 ms` or `+19.714%` delta, and passes the larger-of-3%-or-0.1-ms gate by `0.009020 ms`. Text editing no longer blocks this gate; provenance and cross-platform blockers remain |
| Relative sparse performance | Blocked | Table and topology controls remain reconstructed and three-window has no accepted recorded comparison; final disposition is Q&A policy |
| Input latency | Pass | Five NativeAOT processes pass synthetic pointer/key/committed-text handoff at P50/P95/P99/worst `0.381620/1.348723/1.625866/1.974053 ms`; the focused native gate separately proves SDL polling acceptance |
| Startup and first-use stalls | Pass (current route) | Five independent NativeAOT processes prove a mounted usable startup frame with exact submit/present, present-fence observation, and non-background readback. Nearest-rank `Window.Open` P95 is `252.771895 ms` to handoff and `252.797173 ms` completion-observed upper bound. This is the current Vulkan regression reference |
| SDL polling acceptance | Pass | `SDL_PushEvent` pointer, key, and committed UTF-8 text events are consumed only through product native polling and dispatch, with exact causal submit/present and clean Khronos validation |
| Wayland presentation feedback | Deferred | Swapchain-maintenance present fences provide completion-observed upper bounds. S16-D03 accepts nominal display refresh as fallback until a supported feedback path is available or cadence fails |
| Managed, RSS, and private-dirty memory | Partial | The clean Linux matrix records current metrics; accepted historical comparisons and Windows remain missing |
| Goo-reserved GPU memory | Blocked | The Skia control recorded no comparable metric. The whole-device proxy is non-attributable; final disposition is Q&A policy |
| Binary and package | Blocked | Clean Linux package and binary evidence pass, but no accepted frozen-Skia denominator proves the required 8 MiB comparison; final disposition is Q&A policy |
| Dependencies and fallback | Partial | Clean Linux package validation passes with exactly three native payloads and no fallback renderer; Windows remains |
| Validation | Partial | Clean Linux stage, package, visual, workload, and lifecycle validation passes; Windows remains |
| Idle and warm resources | Partial | Five clean-source nested-KWin processes pass zero work/allocation at median `0.0997%` of one core; Windows remains |
| Lifecycle and recovery | Partial | Clean Linux lifecycle, resize-DPI, surface loss, and device recovery pass; Windows remains |
| Provenance | Partial | Commit `6d4d92e`, one binary, 40 workload logs, source archive, package set, summary, and SHA-256 manifest close local provenance. Historical comparisons and Windows remain |

Work, in order:

1. Run the equivalent Windows x64 matrix and lifecycle program. Integrated-GPU
   and second-real-DPI repeats remain broader S19 hardware work.
2. Reconstruct any missing frozen-commit controls only as supplementary
   evidence. Record exact GPU-memory and package metrics where technically
   possible without changing their provenance status.
3. Return the remaining historical baseline, Goo-reserved GPU-memory, and
   binary-denominator decisions to Q&A. Do not perform further CPU process-memory
   optimization without a comparable failing metric.
4. Keep incremental-present regions optional. Do not add a separate full-window
   backing image or framebuffer tile cache.

User-decision boundary:

- The accepted five-percent memory contract remains unchanged.
- Reconstructed controls remain reconstructed and do not become recorded
  pre-removal evidence.
- The missing pre-removal evidence cannot be regenerated. After all actionable
  work completes, only explicit Q&A can either keep strict Q10 open or revise
  the accepted comparison contract. No agent may make that policy change.
- Until that decision changes, S15 does not exit.

Exit:

- All eight official workloads pass the fixed five-process NativeAOT protocol
  on Linux and Windows, except where the manifest specifies another process or
  duration contract.
- Feature, strict-pixel, AA/effect-pixel, geometry, absolute frame, startup,
  input-latency, memory, binary, dependency, validation, idle, warm-resource,
  lifecycle, and fallback gates pass with complete provenance.
- Sparse table, topology, and three-window P95 satisfy the accepted comparison
  reference.
- Q&A explicitly resolves every irrecoverable historical comparison gap.

### S16. Complete the shared runtime and window API/behavior contract

Current state:

- A packaged persistent Linux Vulkan window opens and renders. The final core capture package is
  `3,682,963` bytes with SHA-256 `20fa1bb543ffd1294b1e36947b89c046340f0e99180b38eb0b3dba586559e99b`;
  the staged Linux bundle is `9,911,025` bytes and its Goo.dll is `2,424,832` bytes with SHA-256
  `f4118551633d84df013c0d5599b652c3ecb5b7df940eff33b4401d87aa619407`.
- The latest registered-font Linux JIT diagnostics smoke passed with normal final
  `heapBudgetAvailable 1`, `heapBudgetSampleCurrent 0`, `heapBudget 57,928,942,592`,
  `driverHeapUsage 26,443,776`, `vulkanObjectAllocationCount 597`,
  `vulkanDeviceMemoryAllocationCount 3`, zero live objects, device memory bytes, cache bytes,
  allocator bytes, validation errors, result failures, and fatal code. The resize path publishes logical and framebuffer metrics, invalidates
  viewport-driven Yoga, input, and accessibility bounds, resizes the Vulkan target, and schedules redraw
  for nonzero restored states.
- Public `Minimized` to `Normal` passed after the resize, scroll, and image smoke. The minimize callback
  was observed. Restore kept the window open in `Normal` with positive framebuffer metrics, consistent
  scale, and a root `BorderBox` matching the logical viewport. A normal callback and zero framebuffer
  are compositor-dependent and are not required.
- One process-shared Vulkan runtime owns instance, device, allocator, and device-level resources.
  Per-window surface and swapchain state remains window-owned. The current Linux NativeAOT
  text-controls smoke passed with an executable of `4,418,544` bytes and SHA-256
  `a8f08dc645bd4ea88018063453ef511bd3757c729e2a63da92d16228f2707093` and a complete 32-file
  output directory of `16,414,316` bytes.
- The final core package consumer lanes passed registered-font, text controls, text atlas, image pressure,
  S09R, S13 path/clip-mask/compiled-vector, and multiwindow cases with zero result failures and clean
  close. Exact `VkResult` values are preserved and lost runtimes reject new leases and submission serials.
  The bounded shared scheduler, owner-close sibling continuity, queue-call isolation, retry, and offscreen
  device-loss propagation are qualified on the available discrete Linux host.
- Failed-idle terminal safety retains target and runtime resources, preserves the exact `VkResult`,
  blocks new publication, leases, and submissions, and avoids unsafe destruction after a failed wait.
  Forced failed-idle injection is Linux-qualified.
- Per-window surface-loss recovery is Linux-qualified on the current maintenance/present-fence path.
  Same-surface resize passes the old swapchain for safe replacement. Surface loss waits for present
  completion, destroys the old swapchain and Vulkan surface, then recreates both without rebuilding the
  shared runtime or logical device. The focused two-window Wayland smoke exited 0 with zero stderr and
  verified recovery, unaffected second-window use, terminal failed-idle handling, and close. Swapchain
  maintenance is mandatory at physical-device selection. The unsafe no-fence fallback is retired.
  If a diagnostic route lacks present-fence support, name its result `present-handoff-only` and do not
  publish it as completion observation. Windows qualification remains S19.

First scheduling slice:

- The scheduler has one process-wide timing loop with per-window high-resolution fractional deadlines.
  Each window derives nominal cadence from its current SDL display, keeps its own elapsed service time,
  and receives fair rotation when several windows are due. Timer-only service banks simulation time for
  the next permitted frame while wall time remains exact.
- Dirty idle windows submit zero frames after initial work. Minimized, occluded, zero-framebuffer,
  unavailable-swapchain, or GPU-deferred windows are skipped in the implemented polling paths and do
  query retains the last valid display sample. Direct Wayland presentation-time feedback is absent
  and deferred under S16-D03; nominal display refresh is the accepted fallback.
- `Window.VSync` is public and per-window. Its value now reaches target and swapchain recreation:
  `true` selects FIFO; `false` selects Immediate, then Mailbox, then FIFO, never FIFO_RELAXED. Both
  modes remain display-rate paced under `Window.Run`.
- Frame-slot fence/acquire waits, swapchain-recreation presentation waits, and per-window queue submit
  and present calls now poll or execute on the physical-queue worker instead of blocking the scheduler.
  Normal close uses target-owned frame and presentation fences, retaining device-wide idle for final
  runtime destruction or the safe maintenance-fence fallback.
- The internal uncapped benchmark seam is not public. Direct `Pump` and `PumpScheduled` calls remain
  caller-paced and do not use scheduler deadlines. Closing the owner window does not strand live sibling
  windows. Per-window exception isolation remains outside the accepted local core qualification.
- Deterministic pacing and real VSync transition gates pass. The live VSync-off active-versus-idle gate
  ran for 551-552 ms at 144.05 Hz with 31-32 active submissions, 2 idle submissions, and an 88-submission
  bound. The final queue-isolation and offscreen failure gates passed in three fresh validation processes.
  No performance improvement is claimed by S16.

Window audit:

1. Inventory every public `Window` property, method, event, metric, state transition, and SDL mapping.
2. Classify each behavior as required core, public composition, platform adapter, application policy,
   or mature-framework nicety.
3. Verify the remaining open behavior matrix after the qualified Linux minimize-to-normal path:
   open, initial metrics, native resize, relayout, redraw, DPI movement, focus, blur, fullscreen,
   close, reopen, hidden state, and failure reporting. Bounded programmatic resize and its coherent
   metric/layout/input/accessibility/redraw update are already qualified.
4. Qualify the corrected resize path through native resize, DPI movement, scene compilation, hit testing,
   accessibility bounds, and redraw invalidation in one coherent update.
5. Keep persistence, storage, restore validation, monitor clamping, and save policy outside Goo.

Shared runtime and scheduling:

1. Qualify one process Vulkan instance, physical device, logical device, allocator, queue set, pipelines,
   shaders, samplers, and device-level caches.
2. Keep surface, swapchain, views, frame slots, presentation synchronization, extent, damage journal,
   and image history per window.
3. Use one process SDL event wait or poll with fair dispatch.
4. The local discrete-Linux audit proves that a clean, minimized, resizing, unavailable, deferred, or
   failed window cannot stall another. External platform repeats remain in the matrix.
5. The normal-close `vkDeviceWaitIdle` path is removed from the local Linux core, with target-owned
   frame and presentation fences and no serial VSync waits across windows.
6. Publish cursor state only from the focused or pointer-owning window.
7. Per-window out-of-date and surface-loss recovery without `vkDeviceWaitIdle` is locally qualified.
8. Device-loss stop, generation advance, shared-runtime rebuild, resource rehydration, live-swapchain
   recreation, and full redraw are locally qualified.
9. One automatic rebuild and clear second-loss behavior are locally qualified.

Deferred S16 work:

The accepted local Linux scheduling and recovery slice is closed. S16-D01, S16-D02, and S16-D04 are
local completions with external repeats only. Any remaining S16 entries are external or conditional
reopen records and do not keep S16 active.

Exit:

- The window audit has no unowned required behavior.
- T04 passes three concurrent windows, independent input/rendering, 1,000 lifecycle operations,
  10 surface losses, and 3 device losses.
- One failed or blocked window does not stall another.
- Windows and Linux behavior is equivalent for every required contract.

### S19. Clean up, package, and qualify both supported RIDs

Current state:

- S19 repeats the Linux substrate's memory, device-generation, publication, retirement, and warm-frame
  gates on Windows and owns the cross-RID package and lifecycle qualification.
- The final core Linux package is `3,682,963` bytes with SHA-256
  `20fa1bb543ffd1294b1e36947b89c046340f0e99180b38eb0b3dba586559e99b`; the staged bundle is
  `9,911,025` bytes and Goo.dll is `2,424,832` bytes with SHA-256
  `f4118551633d84df013c0d5599b652c3ecb5b7df940eff33b4401d87aa619407`.
- The latest Linux NativeAOT text-controls executable is `4,418,544` bytes with SHA-256
  `a8f08dc645bd4ea88018063453ef511bd3757c729e2a63da92d16228f2707093`; its complete 32-file output
  directory is `16,414,316` bytes.
- The final core package and staged-native smoke passed the available Linux consumer, shader, dependency,
  vulnerability, GLIBC, and payload-allowlist checks. True idle, lifecycle, recovery, S16-D02 queue
  isolation, S17, and current S09R/S14/S15 focused gates passed on the discrete host. The post-core
  baseline and accepted P04 strict-leaf text performance iteration are complete. Local Linux core and
  S19 qualification are complete on this discrete host. External Windows, integrated Linux, clean-clone,
  and second-real-DPI gates remain incomplete. Current-owner Linux device recovery is qualified by S11.
- Windows runtime qualification is deferred.
- `tests/Goo.ApiContractTests` owns the approved API baseline and XML
  documentation gates and runs in CI with warnings treated as errors.
- `tests/Goo.CoreBehaviorTests` preserves 261 backend-neutral Cell,
  reconciliation, Yoga, style, motion, input, text, accessibility, and
  allocation contracts in a second focused CI lane. The migration exposed and
  fixed length-independent path boundary tolerance for tiny tessellation edges.
- The stale 87-file `tests/Goo.Tests` project is deleted. Its three migrated
  contract files, 31 Skia or `Goo.InternalTextInterop` files, 12 focused-gate
  duplicates, and obsolete project infrastructure no longer remain.
- Active fixture projects pass `GooTestFixturesProps` explicitly. Dependabot no
  longer targets the retired suite.


Current-host T01-T05 checkpoint, 2026-08-24:

- T01 passes from a fresh current-source snapshot. The XML merge helper is included, Goo restores and
  builds with warnings as errors, pack succeeds, framework package publish/default execution succeeds,
  and the canonical isolated README package consumer compiles with zero warnings.
- T02 passes on the current NVIDIA Wayland display with Khronos validation. Registered-font,
  text-controls, text-atlas, image-pressure, path, clip-mask, and compiled-vector package lanes all
  exit 0. Text atlas records 6 evictions and 6 retirements. Path records 3 pressure events, 10
  evictions, and 8 reused ranges. Clip mask records 6 pressure events and 24 evictions. All close and
  cleanup contracts pass.
- T03 passes on clean source commit `6d4d92e`: five processes for each of eight workloads, 300/2,000
  frame protocol where applicable, five isolated 60-second true-idle processes, exact submit/present,
  both frame slots, first-usable-frame, actual SDL polling, resize-DPI, stage timestamps, validation,
  warm resources, process memory, cleanup, and artifact hashes. The clean stage route reports
  Effects P50/P95/P99 `188416/204800/991232 ns` and Offscreen `67584/72704/75776 ns`, with exact
  16/8 scopes, zero drops, zero warm Vulkan allocation, clean validation, and close.
- Linux T05 passes on clean source commit `6d4d92e`. The package is `3,783,856` bytes with SHA-256
  `49ed9d90adfdaed7d082e9d96fbcb830c59fa55bd84cc2eccad592fe9a144fe1`.
  The validated bundle is `10,087,660` bytes with exactly three native payloads. Package-consumer
  NativeAOT publish, default execution, and the native window smoke pass. The executable is
  `5,499,784` bytes with SHA-256
  `abb83f9d4084157ab308ec7c6839997f001d9f81992418ee005768aa8f35b6ca`.
- The fixes publish `merge_xml_docs.py`, align README validation with generated API pages, regenerate
  `VkImageCopy` and `vkCmdCopyImage`, use bounded close/queue progress, serialize host fence access
  against queue-worker calls, make text/path/clip pressure deterministic, and safely reuse coalesced
  path-atlas tail storage.
- Raw evidence is `artifacts/reports/t01-t05-current-host.json`.

Work:

1. Repeat T01-T05 on Windows without building a test base larger than the behavior it protects.
2. Keep README, changelog, API baseline, external API documentation, package metadata, release
   scripts, dependency validation, and third-party notices aligned as the external RID matrix completes.
3. Gate Vulkan and shader generation against pinned inputs and fail on generated drift.
4. Run Windows clean-clone restore, pack, external consumer install, warnings-as-errors, and
   `git diff --check`.
5. Produce the Windows x64 Release NativeAOT package with RID-specific assets and no Linux leakage.
6. Verify Windows SDL, Vulkan loader use, text payloads, shaders, optional providers, licenses, hashes,
   duplicate native payloads, native-library counts, installed size, startup, and source boundaries.
7. Stage the Windows x64 SDL native payload and validate its PE import and dependency closure.
8. Run the remaining external feature and performance protocol on integrated and Windows hardware.
9. Retain raw qualification logs and artifact hashes. Adopt accepted Vulkan results as regression
   references while retaining frozen Skia results as historical evidence.

Exit:

- T01-T05 and every gate in section 8 pass independently on Windows and Linux.
- Official packages contain no Skia, OpenGL, CPU renderer, Goo-owned C#, proof tool, shader compiler,
  generator, validation layer, software ICD, unused SDL binding surface, or cross-RID native asset.
- Documentation and package declarations match the shipped implementation.

### S20. Add generic retained shader effects

Current state:

- Complete and qualified on Linux.
- Liquid Glass is one validation case, not the product abstraction.
- The existing bounded layer compositor already owns source isolation, optional backdrop copies,
  clipping, transforms, pooling, submission lifetime, resize, and recovery.
- P00 is recorded in `docs/perf/2026-08-21-vulkan-shader-effects-p00-baseline-linux.md`.
- P01 through P03 record rejected allocation iterations. P04 is the accepted Linux result in
  `docs/perf/2026-08-21-vulkan-shader-effects-p04-accepted-linux.md`.

Public contract:

- Sealed `ShaderEffect` has `ShaderEffect(byte[], bool samplesBackdrop = false)` and
  `ShaderEffect(byte[], bool samplesBackdrop, float32 backdropOutset)`. Backdrop outset is finite,
  nonnegative, bounded to 256 logical pixels, and valid only when backdrop sampling is enabled.
- `SetParameter(int32, Vector4)` updates eight fixed retained parameter slots without warm allocation.
- Nullable init-only `Style.ShaderEffect` is the single integration point.
- No public Vulkan handles, descriptors, pipelines, compiler objects, renderer nodes, or
  per-control shader types.
- The effect is a layout-neutral post-process over the element and its retained subtree. Goo keeps
  layout, hit testing, accessibility, transforms, rectangular clipping, and layer ownership.
- Fragment modules use one fixed Goo ABI: source at set 0, optional backdrop at set 1, Goo primitive
  data at set 2, Goo clip data at set 3, and eight `vec4` parameter slots in a 128-byte fragment push
  block. Output is premultiplied linear color composed source-over.
- When combined with a non-normal `BlendMode`, `ShaderEffect` runs first over the isolated subtree.
  The resulting source then blends into the original parent backdrop through an outer layer.
  Backdrop-sampling effects borrow that outer capture with identical origin and extent.

Remaining work:

1. Repeat the focused visual, interaction, resize, DPI, recovery, package, and NativeAOT gates on
   Windows through S19.
2. Include ordinary, backdrop, bounded-outset, and combined non-normal-blend effects in final
   cross-platform T02 and T05 evidence.

Linux result:

- Five isolated Release NativeAOT runs with 300 warm-up and 2,000 measured changed frames each
  reported 0 B managed allocation and no Vulkan object or device-memory creation.
- Median changed-frame CPU was P50 187,934 ns, P95 255,271 ns, P99 314,052 ns, and P99.9
  448,736 ns. Each frame emitted one bounded layer pass and composite with six draws.
- The S14 effects control kept identical work. Median process wall, user, and system CPU changed by
  +1.00 percent, +2.37 percent, and -1.80 percent from P00.
- JIT and NativeAOT gates passed ordinary Button source isolation, backdrop sampling, rounded clip,
  pointer input, resize, display scale, device recovery, and cleanup.
- The focused Linux NativeAOT gate passes a backdrop-sampling effect combined with Multiply blend,
  original-parent backdrop pixels, rounded clipping, pointer input, resize, display scale, injected
  device recovery, zero-allocation parameter mutation, zero warm Vulkan resource creation, and clean
  layer teardown. Its 300/2,000 benchmark reports CPU P50/P95/P99
  `0.241085/0.365820/0.601514 ms`, 0 B allocation, zero warm Vulkan object or device-memory creation,
  6,000 layer passes and composites, and clean close.
- The package-only NativeAOT consumer is 1,262,784 B with a separate 5,600 B SPIR-V asset.
- Final public delta is one type and four members: two constructors, `SetParameter`, and
  `Style.ShaderEffect`.

Exit:

- One generic shader mechanism serves procedural, SDF, distortion, blur, color, border, and
  glass-like control effects without a specialized public widget.
- Warm unchanged and parameter-animation paths allocate 0 managed bytes and create no Vulkan objects.
- The focused pixel, interaction, lifecycle, recovery, package, and NativeAOT gates pass.
- Comparable S14 control evidence has no final regression beyond the section 8 limit.

## 6. Minimal durable verification

| ID | Remaining durable behavior |
|---|---|
| T01 package consumer | Restore only a freshly packed Goo artifact, mount cross-assembly generic and ordinary Cells, exercise typed `Build(input)` and `ShouldRebuild`, NativeAOT publish, open, pump, and close |
| T02 visual/readback corpus | Public boxes, borders, gradients, text, fallback, CJK, RTL, color glyph, editor, images, paths, clips, transforms, opacity, blend, typed effects, ordinary/backdrop/outset `ShaderEffect`, DPI, protected text, and compiled SVG through async Vulkan readback |
| T03 hot-path harness | True idle, animation, sparse table, topology, text editing, images/effects, resize, and three-window stage/resource metrics |
| T04 lifecycle/recovery | One compact program per platform for input, protected text, accessibility traversal, three windows, 1,000 lifecycle operations, 10 surface losses, 3 device losses, plateau, and validation |
| T05 package/NativeAOT report | Dependencies, native libraries, installed bytes, startup, hashes, license contents, source boundary, and forbidden-payload absence per RID |

T02 capture contract:

- Pin logical size, pixel dimensions, DPI, font/input hashes, color space, origin, row stride, target
  format, conversion path, and premultiplication.
- Use tightly defined top-left row-major premultiplied RGBA8.
- Strict masks permit maximum absolute channel delta 1.
- AA/effect masks require at least 99.9 percent of pixels at maximum channel delta 8 or less and no
  channel delta above 24.
- Geometry and text placement remain within 0.5 logical pixels.

Do not add:

- One test per Vulkan command, enum, result, state transition, helper, glyph, path operation, image
  format, effect node, accessibility property, or window property.
- Duplicate backend suites.
- Permanent probes or Skia infrastructure.
- A test whose only purpose is to preserve an implementation detail.

## 7. Logging and evidence requirements

Every accepted performance or release result records:

- Git commit, dirty state, RID, OS, runtime, SDK, NativeAOT mode, GPU, driver, Vulkan API, device UUID,
  power mode, display topology, DPI, workload ID, seed, warmup, sample count, validation state, and
  relevant artifact hashes.
- P50, P95, P99, P99.9, worst, allocation, GC pauses, retained memory, RSS, GPU memory, upload bytes,
  draw calls, pipeline and descriptor changes, barriers, render passes, CPU/GPU timing, startup,
  first-use stalls, resize stalls, and input-to-present latency where applicable.
- Cache budgets, live/resident/submitted bytes, evictions, retirements, generations, recovery attempts,
  and full-redraw reasons.

Use the same machine, OS, driver, power mode, resolution, DPI, and workload for before/after evidence.
Use five isolated Release NativeAOT runs with 300 warmup frames and 2,000 measured frames unless the
accepted workload record specifies otherwise. Do not average platforms or workloads.

## 8. Final acceptance gates

| Area | Required result |
|---|---|
| Feature coverage | All approved Goo behavior passes on Windows and Linux |
| Strict pixels | Maximum absolute RGBA channel delta 1 |
| AA/effect pixels | At least 99.9 percent have maximum channel delta 8 or less and no channel delta exceeds 24 |
| Geometry/text placement | No displacement greater than 0.5 logical pixels |
| General frame time | No workload percentile regresses beyond the larger of 3 percent or 0.1 ms. The q10.text-editing follow-up P95 is `0.552471 ms` versus accepted recorded Skia P95 `0.461491 ms`, a `+0.090980 ms` or `+19.714%` delta, and passes the exact gate by `0.009020 ms`; text editing no longer blocks this gate. |
| Sparse workloads | Table, topology, and three-window sparse P95 are at least 20 percent faster than the recorded Skia reference |
| Absolute frame budget | P95 at most 8.33 ms and P99 at most 16.67 ms, excluding intentional presentation wait |
| Input latency | P95 at most two refresh intervals plus 4 ms and not worse than baseline |
| Startup | P95 first usable frame does not regress beyond noise |
| Memory | Managed heap, private dirty memory, RSS, and Goo-reserved GPU memory each remain within 5 percent of baseline |
| Binary | Each Windows and Linux NativeAOT result is at least 8 MiB smaller than the frozen Skia result |
| Distribution | The external release invariant, separate from Q10, remains the current 20 MiB installed-size cap per official application RID unless explicitly changed |
| Dependencies | No Skia asset remains and mandatory native-library count does not increase |
| Validation | Zero Vulkan validation errors in visual and lifecycle runs |
| Idle | 60 seconds has zero rebuild, layout, render, submit, present, managed allocation, Vulkan object allocation, and device-memory allocation, using less than 0.5 percent of one CPU core |
| Warm resources | Zero managed allocation and no Vulkan object, pipeline, or device-memory creation |
| Lifecycle | No deadlock, stale presentation, lost input, unbounded recovery, or resource growth. Live Goo-owned bytes return within 2 MiB of post-warm state |
| Fallback | No Skia, OpenGL, CPU renderer, bundled software ICD, or weighted-score escape |

Any failed hard gate blocks release or returns the specific tradeoff to Q&A. Final T02 or Windows
measurements may reopen O16 only on a measured failure of the accepted AA policy. They cannot weaken
geometry, color, parity, performance, memory, or binary gates.

## 9. Current execution order

1. Run the external Windows x64, Linux integrated-GPU, and second-real-DPI
   matrix, including the S07 and S20 Windows repeats.
2. Return the irrecoverable historical baseline, Goo-reserved GPU-memory, and
   binary/package denominator decisions to Q&A, then close S15 and S19 only if
   their exit contracts are satisfied.

Windows hardware qualification remains externally deferred. It does not block independent Linux work.

- The lead implementation agent owns G#, Vulkan lifetime, synchronization, recovery, scene-contract,
  and performance work.
- OMP fast workers own read-only inventory and fully specified mechanical generation, fixture,
  manifest, package, and evidence work. They do not make architecture or public-API decisions.
- The lead agent owns shared contracts, integration order, conflict resolution, verification, and
  explicit file staging.
- Each agent reports exact files, behavior, commands, warnings, failures, allocations, retained bytes,
  artifact hashes, and remaining risks.
- Agents use only the internal collaboration channel for coordination. They must not post messages to
  Uproar or another external service.
- Agents do not edit the same shared contract concurrently.
- Builds that share output directories run sequentially.
- Product integration stays on `gaps-and-reductions`. Do not create worktrees.
- Do not push without explicit user authorization.

`Goo.gsproj`, scene-plan discriminants, scene-compiler dispatch, primitive-renderer dispatch,
window frame/scene dispatch, package-smoke entry points, and this plan are lead-owned choke points.
Workers request integration instead of editing them concurrently.

## 10. Stop, defer, and reopen rules

### Active deferral ledger

| ID | Deferred work | Owner and reopen condition |
|---|---|---|
| S16-D01 | Local discrete-Linux close-isolation gate complete: target-owned frame and presentation fences replaced normal-close device-wide idle, three-window close added zero device-idle calls, and siblings remained usable | External repeat only on Windows or on a Linux driver lacking maintenance present fences |
| S16-D02 | Local discrete-Linux core mechanism complete: one FIFO worker per physical VkQueue, nonblocking window enqueue, submit/present hold isolation, retryable enqueue deferral, and offscreen `VK_ERROR_DEVICE_LOST` propagation with shared-lease/readback storage cleanup. Three final binary runs report `accepted=1 device_loss=1 storage_cleared=1 close=1` | External repeat only on Windows or if a required platform exposes a per-window failure or blocked-call defect |
| S16-D03 | Prefer actual presentation feedback over nominal display refresh when a supported path exists | Reopen on an available supported feedback path or measured nominal-cadence failure. Nominal refresh remains the fallback |
| S16-D04 | Local discrete-Linux S19 gate complete: 1,000 operations with retained-resource plateau, 10 injected surface losses, 3 sequential device losses, three live windows, usable siblings, and zero validation errors | External Windows repeat only; no local Linux core blocker remains |
| S16-D05 | Qualify focused or pointer-owning process-global cursor arbitration | S17 Linux input/focus requalification passed; reopen only if a multi-window cursor flow fails |
| S16-D06 | Repeat the scheduling, recovery, and package evidence on Windows | S19 owns this when Windows hardware is available |

Stop for the user only when progress requires a user decision, new authority, unavailable external
hardware/state, or a capability the team cannot supply. Resolve packages, environment setup, command
errors, missing local dependencies, and ordinary implementation problems without interruption.

When blocked by external hardware or one stage contract:

1. Record the exact deferred gate.
2. Continue every independent stage that remains valid.
3. Do not claim the deferred stage passed.

Return to Q&A when:

- Path implementation evidence requires a new dependency or materially different representation.
- A general mask is reopened for required external alpha/luminance mask data, or a higher-level
  filter layer is reopened to remove shader authoring from consumers.
- Final T02 or Windows measurements show a measured failure of the accepted O16 AA policy.
- A public mechanism would expand Goo beyond an inaccessible primitive or confirmed core defect.
- Multi-device Vulkan becomes necessary on required hardware.
- A quantitative gate requires an explicit tradeoff instead of an implementation correction.

The program is complete only when this file has no active stage and S19 has moved to
`IMPLEMENTATION-HISTORY.md` with all final evidence.
