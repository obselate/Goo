# Goo Core Remaining Implementation Plan

Status: active. This file contains only current gaps, unresolved specifications, qualification work,
and release gates.

Current audited baseline: commit `95d172f` on branch `gaps-and-reductions`, 2026-08-17.

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
| S07 product diagnostics | Partial, Linux runtime slice qualified | Wire the remaining exact Q10 facts, then pass the disabled-allocation and recovery gates |
| S09R public primitive parity | Partial | Complete public behavior qualification and Linux/Windows gates for the supported primitive region |
| S10R shared Vulkan resources | Partial, Linux pressure/object/budget and shared-text slices qualified | Complete common lifetime, pressure/LRU, pipeline/cache ownership, budget, and recovery qualification |
| S11 text completion | Partial | Complete multi-atlas, eviction, font, editor, resource, and recovery corpus passes |
| S12 image integration | Partial, provider path, owner-thread publication, and v1-v4/failure lifecycle qualified | Complete cache pressure/LRU, shared pipeline/cache ownership, recovery, and Windows qualification |
| S13 paths and compiled SVG | Missing | Paths, clips, hit testing, strokes, and compiled SVG pass |
| S14 compositing, effects, readback, and AA | Missing | Effects and async readback pass and O16 selects one AA policy |
| S15 retained scene and damage | Missing | Dirty work is proportional to changed segments and sparse gates pass |
| S16 shared runtime and window behavior | Partial, Linux resize/runtime slice qualified | Window audit closes, shared multi-window scheduling works, and recovery passes |
| S17 remaining core mechanisms | Partial | Required protected text, accessibility, focus, and scroll mechanisms pass |
| S19 release qualification | Missing | Both RIDs pass T01-T05 and every final acceptance gate |

No stage fully closes. General recovery, remaining shared resources, Windows qualification, and the
final T01-T05 gates remain open. No hard blocker currently prevents non-Windows implementation.
Windows hardware qualification remains deferred until the Windows 11 VM exists. O16 remains a
deliberate post-measurement decision.

## 4. Active dependency order

```text
S07 product diagnostics
  -> S09R public primitive parity
  -> S10R shared Vulkan resource and memory closure
  -> S11 text completion and S12 image integration in parallel
  -> S13 paths and compiled SVG
  -> S14 compositing, effects, async readback, and AA selection
  -> S15 retained scene and damage
  -> S16 shared runtime and window behavior
  -> S17 remaining core mechanisms
  -> S19 final Windows/Linux qualification
```

S07 may land incrementally. S11 and S12 may run in parallel after shared renderer/resource contracts
are stable. A later stage may start early only when it does not depend on an unresolved contract.

## 5. Active stage specifications

### S07. Add product Vulkan diagnostics

Current state:

- Product Goo has fixed numeric events, bounded trace/result/validation rings, atomic counters,
  classified Vulkan results, bounded fatal snapshots, and sealed NDJSON output.
- Upload and main-pass timestamps are asynchronous, fence-owned, and resolved without a wait bit.
  Effects and offscreen timestamps remain unavailable until those passes exist.
- Disabled diagnostics create no trace storage, validation callback/messenger, debug-utils dispatch,
  query pool, or timestamp commands. The Linux package smoke emits exactly zero bytes when disabled.
- The current registered-font Linux JIT package smoke exited 0. Its normal final capture reported
  `heapBudgetAvailable 1`, `heapBudgetSampleCurrent 0`, `heapBudget 56,243,946,496`,
  `driverHeapUsage 31,227,904`, `vulkanObjectAllocationCount 617`,
  `vulkanDeviceMemoryAllocationCount 4`, `vulkanObjectCount 0`, `vulkanDeviceMemoryBytes 0`,
  `cacheBytes 0`, `allocatorBytes 0`, `validationErrorCount 0`, `resultFailureCount 0`, and
  `fatalCode 0`. Diagnostics-disabled stdout and stderr were both zero bytes.
- The current package is `3,086,893` bytes with SHA-256
  `f9a58c45725c002dfcc1cdca84951bafcf7322aaf771b46fade5bb9cae518d29`. Goo.dll is `1,338,368`
  bytes with SHA-256 `b58ec0b7c6f8960a16a49247336e377c055f4d99a7b37bc3baa11cc0131f12b0`.
  The qualified SDL payload is `1,504,752` bytes with SHA-256
  `943fb58b939ed726a4aab7dd1225c5f75fd3d690d124a30f893a1b29b9f2de4c`.
- The current registered-font Linux NativeAOT smoke passed. Its executable is `3,810,056` bytes
  with SHA-256 `eb4b157d240e42946243333f17c1cbe9c8b41321fbc575c5563568db8474891e`, its complete
  output directory is `15,068,244` bytes, and its tar is `7,104,938` bytes with SHA-256
  `6e418a2841e5a38d3e6c772623c1007951572b2a1a08ea73953e2cdebf9947e`.
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
- The product CPU profiler is connected to the product Vulkan trace. Exact ownership and qualification
  of remaining resource, damage, budget, recovery, and readback counters is still incomplete.

Work:

1. Wire exact Vulkan device-memory allocation, descriptor-change, pipeline-change, damage, heap-budget,
   device-recovery, and readback counters through their owning S10R, S14, S15, and S16 contracts.
   The command-byte field is unavailable and must remain omitted rather than published as a measured
   zero. Do not publish other unknown values as measured zeroes.
2. Add effects and offscreen timestamp ownership when S14 adds those passes.
3. Keep benchmark and runtime identities stable. Keep process-wide device facts and recovery
   generations on the shared S16 runtime owner.
4. Fold the disabled managed-allocation gate into T03 and the fatal/device-loss exercise into T04.
5. Repeat package, validation, and NativeAOT qualification on Windows when the Windows 11 VM exists.

Exit:

- Disabled diagnostics allocate zero managed memory and create no Vulkan diagnostics resource.
- Enabled diagnostics can explain every T02-T04 failure without a permanent probe.
- Product logs contain no protected text, arbitrary application strings, or unbounded payloads.

### S09R. Close public primitive and scene-compiler gaps

Current state:

- Solid and rounded boxes render.
- Solid, dashed, and dotted per-edge borders render through the public primitive path.
- Linear and radial gradients support two through four stops with bounded reusable storage, preserve
  the supplied stop count, support rounded container geometry, and honor hard-stop semantics. This
  is implemented and Linux-qualified. The public `Gradient` API accepts any stop count of two or
  more, but Vulkan explicitly classifies counts above four as unsupported and emits no gradient draw.
  They are not current many-stop parity.
- Revisit note: the four-stop cap is owned by S09R. Reopen it only after a variable-stop buffer and
  shader path exists and the many-stop T02 capture passes.
- Exact bounded fixed-enum unsupported details identify the public node, Blob, field, and primitive
  for unsupported compiler surfaces. This is implemented and Linux-qualified.
- Layout-owned scroll offsets are applied once. Rectangular overflow clips are emitted only for
  both-axis, axis-aligned, zero-radius, depth-bounded cases; mixed-axis, rounded, non-axis-aligned,
  and depth-overflow clips remain explicitly unsupported. These scroll and overflow correctness
  fixes are implemented and Linux-qualified.
- Group opacity and advanced clips remain unsupported and are owned by S14.
- Public `Image`, `Shape`, `TextEntry`, and `TextEditor` nodes remain outside this stage and are owned
  by S11-S14.
- Windows qualification remains deferred with the Windows 11 VM.

Work:

1. Qualify the supported solid, dashed, and dotted border styles and explicitly classify any future
   unsupported style before it enters the public contract.
2. Qualify transform composition, stacking order, visibility, leaf opacity, scroll transforms,
   and nested rectangular clips through the public compiler path.
3. Route each remaining public paint field to S11-S14 or classify it as an accepted non-goal. Do not
   silently ignore a public field.
4. Repeat the Linux-qualified public-path and package qualification on Windows when the Windows 11
   VM exists.

Exit:

- The T02 basic region covers boxes, radii, per-edge borders, required border styles, supported
  two-to-four-stop gradients, transforms, rectangular clips, scrolling, stacking, visibility, and
  element opacity.
- The supported basic region has zero unsupported nodes and primitives.
- Warm compilation and recording reuse storage and allocate zero managed memory.

### S10R. Complete shared Vulkan resource and memory contracts

Current state:

- Production Goo has a generated narrow binding, allocator, registry, upload ring, descriptor tables,
  image resources, text atlas, generation records, and fence retirement foundations.
- Pooled noncoherent mappings track owner-relative written/read ranges and use atom-aligned placement
  and bounded flush/invalidate ranges.
- These parts are not yet one qualified common resource contract across text, images, paths,
  offscreen layers, shaders, and multiple windows. Superseded provider image versions now retain
  provider/source identity per GPU entry, retire through existing last-use/upload fences while preserving
  in-flight descriptors, and drop superseded logical registry records after retirement. Current cache
  entries retain LRU behavior. Linux image pressure and LRU retirement are qualified, but the general
  shared-resource pressure plateau, remaining shared pipeline/cache ownership, and complete generation
  recovery remain gaps.
- Current normal registered-font JIT capture reported heap budget available `1`, current sample `0`,
  budget `56,243,946,496`, driver usage `31,227,904`, 617 Vulkan object allocations, 4 Vulkan device
  memory allocations, and zero live objects, device memory bytes, cache bytes, allocator bytes,
  validation errors, result failures, and fatal code. The pressure and three multiwindow passes came
  from the immediately preceding package recorded in S07 and are not exact current-font package
  evidence.
- Failed-idle terminal safety retains target and runtime resources and the exact `VkResult`, blocks
  new publication, leases, and submissions, and avoids unsafe destruction after a failed wait. Forced
  failed-idle injection is Linux-qualified. Actual generation reconstruction remains open.
- The text descriptor-set layout, three text shader modules, text pipeline layout, and two format-keyed
  text pipelines are process-shared. Mutable atlas state remains per-window. Dynamic
  `VK_EXT_memory_budget` is optional, uses a fixed 16-heap table, is enforced before native allocations,
  and publishes an explicit null when unavailable. This behavior is Linux-qualified.
- Exact `VkResult` values are preserved, and lost runtimes reject new leases and submission serials.

Work:

1. Consolidate internal contracts for allocation, registry identity, upload ranges, descriptor
   publication, device generations, byte budgets, pressure, eviction, and fence-safe retirement.
2. Honor memory type bits, alignment, dedicated-allocation requirements, `bufferImageGranularity`,
   `nonCoherentAtomSize`, device allocation limits, and heap budgets on both required platforms. Linux
   now uses optional `VK_EXT_memory_budget` across a fixed 16-heap table, enforces available budget before
   native allocations, and publishes explicit null when unavailable. Windows qualification remains open.
3. Qualify bounded atom-aligned mapped ranges on coherent and noncoherent memory with the exact
   written or read range.
4. Publish a GPU resource or descriptor only after its upload has completed. Keep prior storage and
   descriptor bindings immutable until every submission that can reference them has retired.
5. Complete general resource pressure accounting and qualify the bounded LRU plateau across shared resources.
   The Linux image-pressure slice is qualified at 259 evictions and 259 retirements, but the full shared
   resource and Windows gate remains open.
6. Complete process-shared ownership for remaining immutable device-level pipelines, samplers, descriptors,
   and caches without moving per-window swapchain state out of S16 ownership. Linux now shares the text
   descriptor-set layout, three text shader modules, text pipeline layout, and two format-keyed text
   pipelines. Mutable atlas state remains per-window.
7. Reconstruct resources from retained logical sources after device generation replacement and qualify
   the recovery path. Preserve exact `VkResult` values and reject new leases and submission serials from
   lost runtimes while completing terminal teardown and recovery.
8. Keep warm unchanged-resource frames free of managed allocation, Vulkan object creation, pipeline
   creation, and device-memory allocation.

Exit:

- Text, image, path, offscreen, and shader resources use the same lifetime and accounting rules.
- Upload visibility, descriptor publication, eviction, retirement, and device-loss reconstruction
  pass T02-T04 with zero stale reference or overwrite.
- Atom-aware mapped ranges pass validation on coherent and noncoherent memory.
- Budget and lifetime counters return to the accepted post-warm bounds.

### S11. Complete the accepted HarfBuzz and hb-gpu text stack

Current state:

- Plain monochrome `Text` nodes render through the production Vulkan path.
- HarfBuzz 14.3.1 and `hb-gpu` native payloads and SPIR-V are packaged for Linux x64 and Windows x64.
- Initial shaping, line layout, bidi use, and a single text atlas exist. Deterministic declared
  mixed installed-font fallback with merged metrics is implemented.
- Unicode 16.0 is pinned through generated exact LineBreak property data with 2,898 ranges and
  context data with 616 ranges. The stateful UAX #14 pair rules pass the official Unicode 16.0
  LineBreakTest corpus with 16,672 cases and zero failures, including UTF-16 offsets, CRLF, and
  mandatory-break semantics.
- Extended grapheme segmentation is implemented in the internal G# `UnicodeGraphemes` service using
  1,481 compact generated Unicode 16.0 ranges for Grapheme_Cluster_Break, InCB, and
  Extended_Pictographic. The official GraphemeBreakTest corpus passes 1,093 cases with zero failures.
  `TextGeometry` and `TextShaping` no longer depend on runtime `StringInfo` segmentation. The
  generated grapheme source is 157,724 bytes with SHA-256
  `68b417df53b79bd61cd73db80fd4cbac03d54577e8523b103c77df4aee09c50c`.
- `TextGeometry.HitTest` uses an allocation-free O(log n) lower-bound search over X-sorted stops.
- Public owned G# `FontSource` registration supports 64 MiB font bytes and 16 variation bounds,
  face validation, registered-first deterministic selection, zero-copy registry resolution, cache
  identity generations, and disposal lifetime. The registered primary and fallback Wayland JIT/AOT
  smoke passed.
- The product-linked versioned Vulkan text provider ABI is qualified by a focused Linux Release
  WAE smoke. Shaping and glyph encoding return `CapacityExceeded` with the exact required size,
  retry into caller-owned buffers, preserve sentinels, reuse warm workspaces, and return `Disposed`
  after provider disposal. The smoke reported `shapeRequired=9 glyphRequired=2880 warmReuse=1 disposed=1`.
- Rich text is rejected.
- `TextEntry` and `TextEditor` are rejected by the scene compiler.
- Full registered-font corpus, style, collection, and variation qualification remains open, as do
  Scripts tables, editor geometry, color glyphs, multi-atlas residency, eviction, identity
  reclamation, and device-loss reconstruction.

Locked direction:

- Follow O02 in `PLAN-FOR-REVIEW.md`: trimmed vendored HarfBuzz 14.3.1 core plus `hb-gpu`,
  `Unicode.Bidi` 0.3.18, and generated Unicode 16 text tables owned by Goo.
- Do not add FreeType, ICU, platform text rasterizers, ClearType, a CPU glyph raster path, or public
  text-engine handles.
- Public Slug shader research is superseded evidence, not the active text implementation.

Work:

1. Qualify the registered `.ttf`, `.otf`, `.ttc`, and `.otc` corpus across styles, collections, and
   variation coordinates while preserving deterministic registered-font-first fallback and merged
   metrics.
2. Generate and pin Scripts and ScriptExtensions tables, then qualify their consumers.
3. Complete editor geometry, caret location, hit testing, selection, and IME geometry.
4. Complete versioned bounded atlas generations with dynamic additions, multi-atlas residency, byte
   budgets, eviction, batching, identity reclamation, and fence-safe retirement.
   Do not publish glyph references before their uploads complete. Do not overwrite prior atlas
   storage until every frame-slot submission that can reference it has retired.
5. Render passive rich text, decorations, text stroke, text shadows, selection, caret, placeholder,
   `TextEntry`, and `TextEditor` through Vulkan.
6. Complete monochrome and required COLR/CPAL v0/v1 paths. CBDT/CBLC, `sbix`, SVG fonts, and language
   hyphenation remain deferred unless a required corpus case changes O02.
7. Reconstruct every text resource after device generation replacement.

Minimal E2E corpus:

- One primary Latin registered font and one registered fallback font.
- CJK, RTL, combining marks, ligatures, grapheme boundaries, and one required color glyph.
- Rich spans, wrapping, trimming, alignment, decoration, stroke, and shadow.
- Entry and multiline editor caret, selection, hit testing, IME geometry, and UTF-16 mapping.
- Dynamic glyph discovery after multiple presented frames.
- Atlas growth, eviction, close/reopen, and one device-loss reconstruction.

Exit:

- The same registered font bytes and fallback order pass on Windows and Linux.
- No missing glyph, stale atlas, unbounded cache, steady allocation, or native lifetime failure occurs.
- Text placement and visual output meet the final acceptance thresholds.
- Source, license, reproducibility, provider ABI, NativeAOT, device-loss, package, lifecycle,
  performance, allocation, and both-RID gates pass independently.

### S12. Connect public images to Vulkan

Current state:

- Public `ImageSourceProvider`, `ImageSource`, and lease types exist.
- The product window target and scene compiler wire provider-backed `Image` and background images
  through decoded pixels, image resources, uploads, descriptors, sampling, and fit modes.
- A fresh Linux Wayland package smoke passed direct `Image` and `BackgroundImage` v1 completion, a
  monotonic v2 bump and reacquire, stale completion rejection, and exact lease release on close.
- The same smoke advanced both providers to v3, failed them, pumped twice with no retry or reacquire at
  the unchanged version, then advanced to v4 with exactly one release and reacquire, completion, and
  release on close.
- The fresh v1-v4 Wayland package smoke preserved the same provider/version/format CPU logical ID across
  device generations, reclaimed older CPU identity records for strictly newer versions across formats,
  rejected rollback, and never reused a logical ID.
- The bounded weak provider-record table swept dead providers and reclaimed their CPU image identities
  without numeric ID reuse. The v1-v4 packaged Wayland smoke passed twice.
- Superseded provider image versions retain provider/source identity per GPU entry, retire through existing
  last-use/upload fences while preserving in-flight descriptors, and drop superseded logical registry
  records only after retirement. Current cache entries retain LRU behavior.
- File decoding remains a stub and belongs in optional providers.
- Decode may run off the UI thread, but provider completion and `ContentChanged` publication are
  marshalled to the provider owner thread; the current async package smoke passed this contract.
- General cache pressure/LRU plateau, shared pipeline/cache ownership, and device recovery remain
  incomplete.

Work:

1. Key decoded pixels by provider identity and content version. Key Vulkan images by those fields plus
   device generation and format. Keep sampler, fit, transform, opacity, and destination size outside
   the image key.
2. Keep sampler, fit, transform, opacity, destination size, and scene resource IDs outside the image
   identity key while sharing immutable device-level image pipeline and sampler state.
3. Bound decoded and GPU caches by bytes, retain current-entry LRU behavior, and qualify a pressure/eviction
   plateau.
4. Rehydrate images after device generation replacement and qualify device recovery.
5. Keep raster file codecs in optional providers or packages. Do not add a mandatory Goo codec stack.

Exit:

- T02 covers provider images, background images, nearest and linear sampling, fit modes, async
  completion, version changes, failure, and targeted invalidation.
- Decode and upload do not block the UI thread.
- Warm reuse allocates zero managed memory and cache use plateaus.
- Close, reopen, eviction, and device recovery preserve lifetime correctness.

### S13. Implement arbitrary paths and compiled SVG assets

Current state:

- Public `VectorPath`, `PathBuilder`, and `Shape` APIs exist.
- Shape hit testing is only a bounds check.
- The scene compiler marks `Shape` unsupported.
- The production renderer throws for `PrebuiltPathMesh`.
- No compiled SVG asset format or player exists.

Work:

1. Select or implement the accepted open, freely redistributable path representation and Vulkan
   pipeline without adding a dead or proprietary dependency.
2. Normalize line, quadratic, cubic, and elliptical-arc input into one deterministic retained source.
3. Support NonZero and EvenOdd fill, strokes, caps, joins, miter limits, dashes, and required corner
   effects.
4. Generate retained caller-owned geometry or curve resources only when path content changes. Do no
   geometry generation during submission or paint.
5. Derive CPU bounds and hit testing from the same normalized source.
6. Support arbitrary path clips through retained bounded mask resources.
7. Compose paths with solid, gradient, and image paints.
8. Add stable resource IDs, byte budgets, cache accounting, fence-safe retirement, and device-loss
   reconstruction.
9. Add a build-time SVG compiler that emits a compact embedded Goo vector asset.
10. Support paths, groups, transforms, opacity, solid and basic gradient paints, strokes, simple clips,
    transform/opacity/color/stroke animation, and compatible path morphs.
11. Add a retained keyframe and loop player that does not rebuild the Cell tree each tick.

SVG exclusions:

- No scripts, DOM interaction, runtime CSS selectors, SMIL event semantics, general filters, general
  masks, runtime external references, or browser behavior.
- Runtime SVG decoding remains an optional future provider.

Exit:

- T02 covers one representative fill, stroke, dash, path clip, pointer hit, compiled SVG, and retained
  SVG animation.
- Geometry and resource work is retained, bounded, reconstructable, and allocation-free when warm.
- Any selected path implementation passes source, license, ABI, visual quality, performance,
  allocation, NativeAOT, package, lifecycle, and both-RID gates independently.

### S14. Implement compositing, effects, async readback, and one AA policy

Current state:

- Layer composition, path meshes, shadows, and custom meshes throw in the production renderer.
- Group opacity, rounded and arbitrary clips, outlines, box shadows, text effects, blend modes,
  masks, and filters are not complete.
- Offscreen readback exists only in proof infrastructure.
- O16 has no selected product AA policy.
- Shader support is required, but the exact public shader and effect API is not accepted in
  `PLAN-FOR-REVIEW.md`. `EffectGraph` and `GooShaderPack` are archived candidate names only.

Work:

1. Implement rounded and arbitrary clips using analytic coverage or retained bounded masks.
2. Isolate group opacity when required for correct composition.
3. Implement outlines, box shadows, inset shadows, spread, blur, blend modes, masks, and bounded
   offscreen layers.
4. Pool, version, budget, retire, and reconstruct offscreen resources.
5. Expand conservative bounds for every effect before culling and damage selection.
6. Return the public shader and effect contract to Q&A before adding public API. The contract must be
   typed, declarative, closed by default, and keep raw runtime shader source and unrestricted Vulkan
   capabilities out of the safe public surface.
7. Evaluate precompiled validated fragment-only custom-effect packages with bounded inputs and
   generated parameter blocks as one candidate, not an accepted API.
8. Implement request-only asynchronous Vulkan readback through the normal pipelines and a host-visible
   staging range. Return raw premultiplied RGBA without affecting normal frames.
9. Measure analytic coverage, MSAA, and any viable candidate across boxes, text, paths, clips,
   shadows, effects, memory, startup, first use, and target hardware.
10. Return the evidence to O16, select one cross-platform policy, and delete comparison-only paths.

Exit:

- The complete T02 effects and readback region meets visual thresholds.
- Normal frames create no readback work or synchronization.
- O16 is accepted and exactly one product AA path remains.

### S15. Retain clean scene segments and per-image damage

Current state:

- Demand-driven scheduling can skip an idle frame.
- Every demanded render recompiles and replays the full scene.
- Every compiled chunk is marked dirty.
- No stable GPU range reuse, damage journal, or per-present-image scene history exists.

Work:

1. Retain clean `SceneChunk` records, stable GPU ranges, and immutable resources.
2. Rebuild and upload only dirty chunks and changed resources.
3. Give each window a monotonic scene version and bounded damage journal.
4. Record the latest safely applied scene version for each swapchain image.
5. Commit an image version only after submission and presentation completion is proven.
6. Combine damage newer than the acquired image, expand it for all dependencies, and draw intersecting
   chunks in original visual order.
7. Coalesce excessive regions and use full redraw for first use, replacement, resize, undefined
   contents, recovery, journal overflow, or unknown dependencies.
8. Retain referenced chunks, GPU ranges, and resources until completion makes retirement safe.
9. Keep incremental-present regions optional. Do not add a separate full-window backing image or a
   framebuffer tile cache.

Exit:

- Static, sparse mutation, scroll, full mutation, large table, and topology workloads are correct.
- Sparse large-table and topology P95 improve by at least 20 percent over the recorded Skia reference.
- Total frame time, hitches, memory, present cost, allocation, and power proxy meet Q10.

### S16. Complete the shared runtime and window API/behavior contract

Current state:

- A packaged persistent Linux Vulkan window opens and renders. The current registered-font package is
  `3,086,893` bytes with SHA-256 `f9a58c45725c002dfcc1cdca84951bafcf7322aaf771b46fade5bb9cae518d29`;
  Goo.dll is `1,338,368` bytes with SHA-256
  `b58ec0b7c6f8960a16a49247336e377c055f4d99a7b37bc3baa11cc0131f12b0`.
- The current registered-font Linux JIT smoke passed with normal final
  `heapBudgetAvailable 1`, `heapBudgetSampleCurrent 0`, `heapBudget 56,243,946,496`,
  `driverHeapUsage 31,227,904`, `vulkanObjectAllocationCount 617`,
  `vulkanDeviceMemoryAllocationCount 4`, zero live objects, device memory bytes, cache bytes,
  allocator bytes, validation errors, result failures, and fatal code. Diagnostics-disabled stdout and
  stderr were both zero bytes. The resize path publishes logical and framebuffer metrics, invalidates
  viewport-driven Yoga, input, and accessibility bounds, resizes the Vulkan target, and schedules redraw
  for nonzero restored states.
- Public `Minimized` to `Normal` passed after the resize, scroll, and image smoke. The minimize callback
  was observed. Restore kept the window open in `Normal` with positive framebuffer metrics, consistent
  scale, and a root `BorderBox` matching the logical viewport. A normal callback and zero framebuffer
  are compositor-dependent and are not required.
- One process-shared Vulkan runtime owns instance, device, allocator, and device-level resources.
  Per-window surface and swapchain state remains window-owned. The current registered-font Linux
  NativeAOT smoke passed with an executable of `3,810,056` bytes and SHA-256
  `eb4b157d240e42946243333f17c1cbe9c8b41321fbc575c5563568db8474891e`, a complete output directory
  of `15,068,244` bytes, and a `7,104,938`-byte tar with SHA-256
  `6e418a2841e5a38d3e6c772623c1007951572b2a1a08ea73953e2cdebf9947e`. Its final capture reported
  budget available `1`, current sample `0`, budget `56,245,191,680`, driver usage `23,101,440`,
  582 Vulkan object allocations, 3 Vulkan device memory allocations, and zero live objects, device
  memory bytes, cache bytes, allocator bytes, validation errors, result failures, and fatal code.
- The pressure and three multiwindow passes used the immediately preceding package recorded in S07 and
  are not exact current-font package evidence. Exact `VkResult` values are preserved and lost runtimes
  reject new leases and submission serials. Cursor arbitration, independent presentation scheduling,
  device-loss handling, full recovery, and the remaining window behavior matrix are not qualified.
- Failed-idle terminal safety retains target and runtime resources, preserves the exact `VkResult`,
  blocks new publication, leases, and submissions, and avoids unsafe destruction after a failed wait.
  Forced failed-idle injection is Linux-qualified.
- Per-window surface-loss recovery is Linux-qualified on the current maintenance/present-fence path.
  Same-surface resize passes the old swapchain for safe replacement. Surface loss waits for present
  completion, destroys the old swapchain and Vulkan surface, then recreates both without rebuilding the
  shared runtime or logical device. The focused two-window Wayland smoke exited 0 with zero stderr and
  verified recovery, unaffected second-window use, terminal failed-idle handling, and close. Fallback
  retirement without maintenance/present-fence support remains open.

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
4. Prevent a clean, minimized, resizing, blocked, or failed window from stalling another.
5. Avoid serial VSync waits across windows.
6. Publish cursor state only from the focused or pointer-owning window.
7. Qualify per-window out-of-date and surface-loss recovery without `vkDeviceWaitIdle`.
8. On device loss, stop submissions, advance the generation, rebuild one shared runtime, rehydrate
   resources, recreate live swapchains, and force full redraw.
9. Allow one automatic rebuild. A second loss during rebuild is fatal and clear.

Exit:

- The window audit has no unowned required behavior.
- T04 passes three concurrent windows, independent input/rendering, 1,000 lifecycle operations,
  10 surface losses, and 3 device losses.
- One failed or blocked window does not stall another.
- Windows and Linux behavior is equivalent for every required contract.

### S17. Complete remaining required core mechanisms

Current state:

- Pointer, keyboard, focus, wheel, scroll, text/IME routing, motion, style transitions, element handles,
  and neutral accessibility semantics remain in the codebase.
- They have not been requalified end to end after the Vulkan cutover.
- Protected text presentation is missing.
- UIA and AT-SPI adapters are not qualified.
- Native focus or raise and public scroll range remain conditional requirements.

Work:

1. Requalify input, focus, hover, active/disabled style states, wheel, scrolling, clipboard, text/IME,
   motion, transitions, element handles, and neutral semantics through current public behavior.
2. Add protected `TextEntry` presentation as the narrow primitive accepted by R05.
3. Mask by grapheme, preserve editing geometry, block protected copy/cut, redact semantics and logs,
   and avoid duplicate unprotected display strings.
4. Implement Windows UIA and Linux AT-SPI adapters over the neutral semantic tree when required by
   the delivery matrix.
5. Add native focus or raise only if a real accepted flow requires it.
6. Add a read-only scroll-range mechanism only when an external composition proves current public
   primitives cannot provide it safely.
7. Keep reusable controls, dialogs, overlays, themes, navigation, grids, trees, charts, markdown,
   and application policy outside core.

Exit:

- Every R01-R18 item classified as a required Goo core mechanism is implemented or explicitly owned
  by another active stage.
- Every composable behavior is proven without private Goo access.
- Protected values never enter visual, semantic, clipboard, or diagnostic output incorrectly.

### S19. Clean up, package, and qualify both supported RIDs

Current state:

- The current registered-font Linux package is `3,086,893` bytes with SHA-256
  `f9a58c45725c002dfcc1cdca84951bafcf7322aaf771b46fade5bb9cae518d29`; Goo.dll is `1,338,368`
  bytes with SHA-256 `b58ec0b7c6f8960a16a49247336e377c055f4d99a7b37bc3baa11cc0131f12b0`. The
  normal JIT smoke exited 0, and diagnostics-disabled stdout and stderr were both zero bytes.
- The current registered-font NativeAOT executable is `3,810,056` bytes with SHA-256
  `eb4b157d240e42946243333f17c1cbe9c8b41321fbc575c5563568db8474891e`; its complete output directory
  is `15,068,244` bytes and its tar is `7,104,938` bytes with SHA-256
  `6e418a2841e5a38d3e6c772623c1007951572b2a1a08ea73953e2cdebf9947e`. The final capture reported
  budget available `1`, current sample `0`, budget `56,245,191,680`, driver usage `23,101,440`,
  582 Vulkan object allocations, 3 Vulkan device memory allocations, and zero live objects, device
  memory bytes, cache bytes, allocator bytes, validation errors, result failures, and fatal code.
- Pressure and three multiwindow passes used the immediately preceding package recorded in S07. They
  are not exact current-font package evidence. Pinned product shader generation/drift and SPIR-V
  validation passed in this Linux wave. Final diagnostics/performance/Q10, recovery, and Windows gates
  remain incomplete.
- Windows runtime qualification is deferred.
- The legacy broad test project references deleted Skia and helper surfaces.
- README, changelog, generated API material, package metadata, and third-party notices still contain
  stale pre-cutover content.

Work:

1. Delete or consolidate obsolete Skia-internal tests. Preserve only backend-neutral public behavior
   and actual hot-path, lifetime, package, and recovery regressions.
2. Complete T01-T05 without building a test base larger than the behavior it protects.
3. Update README, changelog, API baseline, XML documentation, package metadata, release scripts,
   dependency validation, and third-party notices for the actual Vulkan-only product.
4. Gate Vulkan and shader generation against pinned inputs and fail on generated drift.
5. Run clean-clone restore, pack, external consumer install, warnings-as-errors, and `git diff --check`.
6. Produce Release NativeAOT packages for Windows x64 and Linux x64 with RID-specific assets and no
   cross-RID leakage.
7. Verify SDL, Vulkan loader use, text payloads, shaders, optional providers, licenses, hashes,
   duplicate native payloads, native-library counts, GLIBC compatibility, installed size, startup,
   and source-language boundaries.
8. Stage the Windows x64 SDL native payload and validate its PE import and dependency closure with a
   Windows equivalent of the Linux ELF package validator.
9. Run the complete Q10 protocol on integrated and discrete hardware for each platform.
10. Retain raw qualification logs and artifact hashes. Adopt the accepted Vulkan result as the next
   regression reference while retaining the frozen Skia result as historical evidence.

Exit:

- T01-T05 and every gate in section 8 pass independently on Windows and Linux.
- Official packages contain no Skia, OpenGL, CPU renderer, Goo-owned C#, proof tool, shader compiler,
  generator, validation layer, software ICD, unused SDL binding surface, or cross-RID native asset.
- Documentation and package declarations match the shipped implementation.

## 6. Minimal durable verification

| ID | Remaining durable behavior |
|---|---|
| T01 package consumer | Restore only a freshly packed Goo artifact, mount cross-assembly generic and ordinary Cells, exercise typed `Build(input)` and `ShouldRebuild`, NativeAOT publish, open, pump, and close |
| T02 visual/readback corpus | Public boxes, borders, gradients, text, fallback, CJK, RTL, color glyph, editor, images, paths, clips, transforms, opacity, blend, effects, DPI, protected text, and compiled SVG through async Vulkan readback |
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
| General frame time | No workload percentile regresses beyond the larger of 3 percent or 0.1 ms |
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

Any failed hard gate blocks release or returns the specific tradeoff to Q&A. O16 may replace accepted
AA edge captures after measurement. It cannot weaken geometry, color, parity, performance, memory,
or binary gates.

## 9. Parallel Linux execution model

### Immediate Linux Wayland acceleration cut

The immediate milestone is a reliable Linux Wayland product path, not final framework parity. It is
complete when one packaged Goo application can open one or more persistent Wayland windows, render
the currently supported boxes, gradients, text, and provider images, route input, resize and relayout,
close and reopen, recover one window from surface loss without stalling another, and shut down with no
live Goo-owned Vulkan resources or validation errors.

This milestone includes only:

1. A warnings-as-errors Release build of the current G# core.
2. Stable SDL Wayland event routing, logical and framebuffer resize, redraw scheduling, and window
   lifecycle.
3. Shared Vulkan runtime ownership with per-window swapchains and independent surface-loss recovery.
4. The current supported primitive, registered-font text, and provider-image paths.
5. One focused packaged Linux E2E run covering persistent display, input, resize, two windows, surface
   loss, close, and leak-free shutdown.

The milestone does not wait for compiled SVG, advanced effects, the final AA choice, retained-damage
performance, color-font completion, AT-SPI, Windows qualification, or final T01-T05 release evidence.
Those remain in the ledger and continue in parallel when they do not touch the immediate integration
choke points.

Deferred milestone priority, from highest implementation value to lowest:

| Rank | Deferred milestone | Priority basis | Dependency position |
|---|---|---|---|
| 1 | Retained scene segments and per-image damage | This is the main CPU, allocation, power, and sparse-update reduction | Implement after the frame schema from paths and effects is stable |
| 2 | Windows parity, recovery, and qualification | Windows is a required platform and cannot be released as an untested port | Start as soon as the Windows 11 VM exists |
| 3 | Compositing, effects, offscreen layers, and readback | Required for correct group opacity, clips, shadows, masks, diagnostics, and visual parity | Implement before retained damage and final AA selection |
| 4 | One final AA policy | Required for stable cross-platform visual quality without carrying multiple product paths | Select only after boxes, text, paths, clips, and effects can be measured |
| 5 | Compiled SVG assets and retained animation | High-value asset workflow for icons and animation, but not required for basic Goo rendering | Implement after retained path rendering is stable |
| 6 | Linux AT-SPI adapter | Important platform integration, while the neutral semantic tree and core input remain the first dependency | Implement after neutral semantics are requalified |
| 7 | Color-font completion | Useful for emoji and color glyphs, but not required for the primary Goo UI workload | Implement after monochrome text, editor geometry, and atlas recovery are complete |
| 8 | Final T01-T05 release qualification | Mandatory release closure, but it adds no missing product capability | Run last after both required platforms and every product path are complete |

Importance is not the same as executable order. The next runnable deferred sequence on the current
Linux machine is compositing and effects, final AA evidence, retained damage, compiled SVG, AT-SPI,
and color fonts. Windows moves to the front of active qualification as soon as the VM exists. T01-T05
always remains the final gate.

Immediate critical path:

```text
current G# compile
  -> shared Release build
  -> basic packaged Wayland window
  -> resize and input
  -> two-window noninterference
  -> per-window surface-loss recovery
  -> leak-free close and reopen
```

- Luna Max owns G#, Vulkan lifetime, synchronization, recovery, scene-contract, and performance work.
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

Linux work runs in these exclusive lanes:

| Lane | Exclusive implementation area | Current target |
|---|---|---|
| Text | `Rendering/Text`, `VulkanText*`, `VulkanTextAtlas*` | Close deterministic Unicode, font, atlas, editor, and color-glyph gaps |
| Images | `Image*`, `VulkanImage*` | Close current-set ownership, cache pressure, eviction, and recovery |
| Wayland WSI | `Platform/Sdl`, `VulkanSharedRuntime`, `VulkanWindowTarget*` | Close surface loss, scheduling, lifecycle, and device recovery |
| Paths | `Shapes`, new `VulkanPath*`, path shaders and generators | Build retained geometry, hit testing, clips, and compiled SVG |
| Effects | New offscreen, effect, readback, and effect-shader files | Build composition, blur, shadow, blend, and async readback before O16 |
| Retention | `VulkanScenePlan*` and new segment/damage files | Replace full compile/replay with retained chunks and per-image damage |

`Goo.gsproj`, scene-plan discriminants, scene-compiler dispatch, primitive-renderer dispatch,
window frame/scene dispatch, package-smoke entry points, and this plan are lead-owned choke points.
Workers request integration instead of editing them concurrently.

Execution waves:

1. Three Luna lanes close the current compile blockers and independent S11 text, S13 path/offscreen,
   and S16 Wayland WSI slices. The lead alone merges shared dispatch and owns builds.
2. The lead runs the immediate Linux Wayland critical path above. Failures return only to the owning
   lane, so unrelated lanes keep moving.
3. S12 image recovery, remaining S13 path rendering, and S14 offscreen/readback continue in exclusive
   lanes while the Wayland milestone is qualified.
4. Integrate paths, effects, and text/editor primitives, then build S15 retention against the stable
   frame schema.
5. Run one serialized Release build queue followed by one serialized real-Wayland queue for visual,
   validation, allocation, lifetime, performance, NativeAOT, and binary gates.

OMP dispatch rules for each wave:

- Use fast workers for exact file inventory, generated Unicode or Vulkan data, shader manifest work,
  mechanical fixtures, package manifests, evidence extraction, and read-only diff review.
- Give each worker one bounded output contract and an explicit file allowlist.
- Do not give OMP workers G# syntax repair, Vulkan synchronization, lifetime, recovery, public API, or
  scene-schema decisions.
- Start the next OMP batch while Luna agents implement the prior batch. Review every result before it
  enters a Luna task or the shared tree.

## 10. Stop, defer, and reopen rules

Stop for the user only when progress requires a user decision, new authority, unavailable external
hardware/state, or a capability the team cannot supply. Resolve packages, environment setup, command
errors, missing local dependencies, and ordinary implementation problems without interruption.

When blocked by external hardware or one stage contract:

1. Record the exact deferred gate.
2. Continue every independent stage that remains valid.
3. Do not claim the deferred stage passed.

Return to Q&A when:

- Path implementation evidence requires a new dependency or materially different representation.
- The public shader and effect API is ready to move beyond internal implementation.
- O16 AA evidence requires choosing among viable policies.
- A public mechanism would expand Goo beyond an inaccessible primitive or confirmed core defect.
- Multi-device Vulkan becomes necessary on required hardware.
- A quantitative gate requires an explicit tradeoff instead of an implementation correction.

The program is complete only when this file has no active stage and S19 has moved to
`IMPLEMENTATION-HISTORY.md` with all final evidence.
