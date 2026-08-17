# Goo Gaps and Reductions Plan

Status: architecture Q&A accepted except O16, which remains a later measured AA decision. S12-I01 versioned stable ImageSourceProvider contract accepted. The locked text stack now has an active non-shipping Vulkan proof exercising the proposed Goo-internal provider boundary. The proof is partially implemented and its remaining gates are listed below. Goo product integration has not started. Goo.InternalTextInterop remains live until the atomic Vulkan cutover.

Date: 2026-08-17

Branch: `gaps-and-reductions`

This artifact records the accepted architecture direction and the work that remains before Goo
product integration and shipping. The larger
`GAPS-AND-REDUCTIONS.md` file is supporting research, not an approved architecture decision. The
completed Skia responsibility inventory is in `VULKAN-SKIA-REPLACEMENT.md`.

Review this document by referring to the IDs. Mark an item accurate, inaccurate, missing, or in the
wrong order.

Scope boundary: this plan covers Goo core and official Goo packages only. Hivemind, Uproar95, and
Goo.Workbench are external references for requirements, workloads, visual quality, and performance.
Reusable compositions belong to consumer code or separate G# libraries.

Language boundary: Goo core and Goo-owned runtime helpers are G# only. C# remains allowed in tests,
benchmarks, development tools, external packages, and large vendored dependencies such as Yoga.Net.

## 1. Locked requirements

| ID | Requirement |
|---|---|
| L01 | Upgrade Goo to the official G# 0.4.1 release before making renderer or framework architecture changes |
| L02 | Recheck historical G# findings because partial-member provenance and other compiler fixes may allow old Goo workarounds to be removed |
| L03 | Vulkan is the eventual GPU path. The plan does not need to justify adopting Vulkan |
| L04 | Remove Skia from Goo and official packages in the first direct Vulkan implementation boundary. Do not retain a temporary or permanent Skia backend |
| L05 | GPUI is a reference for comparison, not a guide, dependency, or target architecture |
| L06 | Preserve declarative G# Goo authoring with a simple API |
| L07 | Keep CSS-like Yoga flexbox layout |
| L08 | Support Windows x64 and Linux x64. macOS is not required |
| L09 | Use the current Hivemind UI as a visual-quality, performance, scale, and behavior reference for Goo core |
| L10 | Minimize CPU use, allocations, retained memory, GPU memory, native dependencies, and installed binary size |
| L11 | Investigate alternatives to rebuilding or repainting an entire window for every dirty frame |
| L12 | Use the Hivemind UI inventory to identify Avalonia versus Goo core gaps. Hivemind implementation and migration are outside this plan |
| L13 | Triage each gap into a required Goo core mechanism, behavior composable from public primitives, or mature-framework nicety |
| L14 | Audit Uproar95's multi-window work for quality. Its persistence code is consumer-side evidence only |
| L15 | Keep new tests minimal. Add end-to-end behaviors and measured hot-path regressions, not a test for every internal function |
| L16 | Do the work on `gaps-and-reductions` |
| L17 | Structural changes inside Goo are allowed if they improve the result. The declarative API must stay simple |
| L18 | Review the remaining architecture decisions one at a time in the stated Q&A order |
| L19 | A candidate dependency or technique is not selected until its Q&A decision is accepted |
| L20 | Use the same locked text provider, shaping, registered font inputs, fallback policy, glyph composition, and Vulkan resource behavior on Windows and Linux |
| L21 | Limit this plan and its implementation to Goo core. Hivemind is only a requirements and benchmark reference corpus |
| L22 | Use the newest qualifying Skia benchmark results as the frozen historical baseline, then continually improve accepted Vulkan results from that floor |
| L23 | Goo core and Goo-owned runtime helpers contain only G# source. C# tests, benchmarks, tools, packages, and vendors remain allowed |

## 2. Decision register

All immediate Q&A decisions are accepted. O02 locks the text stack below. O03 selects a Goo-owned or
freely redistributable implementation direction for arbitrary vector paths, subject to the recorded
implementation gates. O15 is outside Goo core.
O16 remains a later proof decision because its AA method needs Vulkan measurements.

| ID | Decision | Status | Accepted direction or remaining scope |
|---|---|---|---|
| O01 | Skia transition and removal gate | Accepted | Remove Skia with the first direct Vulkan implementation. No live oracle, Ganesh Vulkan, fallback, or hybrid |
| O02 | Text and font stack | Accepted | Use runtime `.ttf`/`.otf`/`.ttc`/`.otc` inputs with a trimmed vendored HarfBuzz 14.3.1 core plus `hb-gpu` behind a stable Goo-internal provider ABI. Use .NET 10 `StringInfo` graphemes initially, `Unicode.Bidi` 0.3.18 with a pinned Unicode 16 profile, and generated G# UAX #14, UAX #29, Scripts, and ScriptExtensions tables. Goo owns itemization, registered-font-first fallback, layout, wrapping, editing, caret, selection, hit testing, and IME. Vulkan consumes `hb-gpu` encoded monochrome and COLR/CPAL v0/v1 glyph resources through Goo-owned pipelines. Exact parity requires identical registered font bytes and fallback order; system catalog discovery is optional best effort. Defer CBDT/CBLC, `sbix`, SVG fonts, and language hyphenation. Do not use FreeType, ICU, ClearType, platform text rasterizers, or a CPU text raster path. Text AA remains O16. The stack must pass source, license, ABI, resource, corpus, visual-quality, performance, allocation, lifecycle, package, and Windows/Linux gates |
| O03 | Path geometry and hit testing | Accepted | Use a Goo-owned or freely redistributable curve, band, fill, stroke, and Vulkan implementation. Goo owns curve conversion, CPU hit testing, clipping, paint composition, caching, and lifetime |
| O04 | Image codecs and SVG ownership | Accepted | Optional codec providers plus build-time compiled SVG assets. No required runtime SVG parser |
| S12-I01 | Versioned stable `ImageSourceProvider` contract | Accepted | Nonzero monotonic `uint64` versions, immutable per-version results, version-snapshot leases, owner-thread notifications, targeted invalidation, and cache identities independent of sampling and layout |
| O05 | CPU raster diagnostics | Accepted | Remove the product CPU renderer. Use request-driven Vulkan offscreen readback |
| O06 | Internal renderer command boundary | Accepted | Compact typed frame plan with reusable typed arrays, ordered references, and stable resource IDs. Evidence can reopen the direction |
| O07 | Dirty-frame and retained-resource model | Accepted | Retained typed segments and GPU ranges plus per-swapchain-image damage history. No separate backing image or framebuffer tile cache |
| O08 | Vulkan binding and allocation | Accepted | Pinned-registry narrow G# binding plus a Goo-owned resource-specific block suballocator |
| O09 | Multi-window GPU ownership and recovery | Accepted | One process Vulkan instance and device with shared resources, per-window presentation state, and bounded recovery |
| O10 | Quantitative adoption thresholds | Accepted | Frozen latest Skia baseline, chained Vulkan improvement baselines, and independent hard gates |
| O11 | Window persistence ownership | Accepted | Goo exposes live window primitives only. Persistence and restore policy stay outside core |
| O12 | Goo accessibility and platform adapter depth | Accepted | Goo core owns neutral semantics and the adapter contract. Windows UIA and Linux AT-SPI live in platform adapters |
| O13 | Core versus composed control boundary | Accepted | Controls use public primitives directly or live in a separate G# library. They do not enter core |
| O14 | When Goo core dependencies can be removed | Accepted | Remove each dependency after its final Goo-core consumer is replaced and relevant Windows and Linux gates pass. Skia follows O01 |
| O15 | Hivemind cutover coverage | Out of scope | Application migration and release staging are not Goo core decisions |
| O16 | MSAA and antialiasing strategy | Later | Compare AA methods in the Vulkan proof, then ship one fixed cross-platform policy without runtime modes or automatic strategy switching |

## 3. Current evidence that constrains the plan

These are observed facts. They do not select the future renderer.

| ID | Current evidence |
|---|---|
| E01 | Goo currently uses Skia Ganesh OpenGL through SDL3, with a separate raster diagnostic path |
| E02 | The current renderer sleeps without demand. The problem is work after a dirty frame is accepted, not continuous idle repaint |
| E03 | The rejected Skia FBO damage experiment reduced some paint work but lost on total frame time and flush cost. That result applies to that mechanism, not every possible Vulkan retention design |
| E04 | Current GPUI can replay clean CPU scene ranges, but its GPU renderers still clear and replay a full dirty frame |
| E05 | GPUI uses different renderer and text stacks by platform. It is not evidence that Goo should copy that split |
| E06 | Older requirements requested 8x MSAA with fallback, while the current renderer has no active MSAA. O16 now requires proof measurements followed by one fixed cross-platform AA policy without runtime fallback |
| E07 | Historical source and size estimates are planning evidence only. They are not approved budgets |
| E08 | Vulkan provides the GPU substrate. It does not provide a canvas, paths, font services, codecs, filters, a scene, invalidation, or cache policy |
| E09 | Current production Skia reach is 24 files, 44 unique `SK*` symbols, 534 references, and 6,480 lines in files with direct Skia use |
| E10 | Goo can retain Yoga, `Unicode.Bidi` 0.3.18, its text and editing state, the public `VectorPath` source model, and the `ImageSourceProvider` pixel boundary |
| E11 | The highest-risk Skia losses are text and color emoji, path expansion and algebra, group opacity and advanced blends, masks and shadows, and color-space parity |
| E12 | Removing Skia can remove its raw native package asset, but replacement font, path, codec, and allocation dependencies reduce the net size gain |

### Renderer direction after the replacement inventory

The accepted final backend is a Goo-owned Vulkan renderer without Skia in the live renderer or
official runtime packages. O01 approves Skia removal in the first direct Vulkan implementation
boundary.

Vulkan replaces the GPU target, resource, shader, raster, synchronization, copy, offscreen, and
presentation layer. It does not replace Skia's 2D engine. Goo must provide the renderer state,
primitives, clipping, compositing, caching, lifetime, and recovery rules. Narrow specialist services
can provide the font, geometry, and codec work that Vulkan does not define.

The locked text path targets runtime OpenType inputs with a trimmed vendored HarfBuzz 14.3.1 core plus
`hb-gpu` and a stable versioned Goo-internal provider ABI. Ship the native core and `hb-gpu` together as a
private Goo runtime payload per RID, with no external HarfBuzz installation. HarfBuzz provides table
parsing, shaping, metrics, variation coordinates, coverage, outline extraction, and COLR/CPAL paint
traversal. `hb-gpu` encodes monochrome and COLR/CPAL v0/v1 glyph data into compact CPU blobs and
provides shader source. Goo compiles the pinned GLSL-compatible shader source into SPIR-V at build time
and ships validated SPIR-V only. Goo owns the
Vulkan texel-buffer atlas (`VkBufferView`), descriptors, pipelines, draw ranges, synchronization,
cache lifetime, and device-loss rebuild. The proof has no OpenGL dependency and no CPU text raster
fallback. Its G# provider directly P/Invokes the vendored upstream HarfBuzz and `hb-gpu` C ABIs to
exercise the proposed boundary. The locked stable versioned provider ABI is not implemented yet. The
private RID payload is built from the pinned upstream source archive. No Goo-owned C or C# runtime
helper or shim is introduced.

The runtime accepts `.ttf`, `.otf`, `.ttc`, and `.otc` bytes. .NET 10 `StringInfo` is the initial
grapheme implementation. `Unicode.Bidi` 0.3.18 and generated G# UAX #14, UAX #29, Scripts, and
ScriptExtensions tables use the pinned Unicode 16 supported behavior profile. Goo owns mixed-run
itemization, registered-font-first fallback, paragraph layout, wrapping, ellipsis, caret, selection,
hit testing, and IME geometry. Exact parity is defined by identical registered font bytes, variation
settings, shaping options, Unicode 16 profile, and explicit fallback order on Windows x64 and Linux
x64. System font catalog discovery is optional best effort and is not an exact-parity input.

The initial glyph set is monochrome analytical outlines plus COLR/CPAL v0/v1. CBDT/CBLC, `sbix`, SVG
fonts, and language-specific hyphenation are deferred. FreeType, ICU, DirectWrite, Fontconfig,
ClearType, platform text rasterizers, and CPU text rasterization are not allowed. Text antialiasing
remains the O16 measured policy decision. The locked provider ABI must use caller-owned buffers and
workspaces, stable versioned results, and no public text-engine handles. It must reconstruct encoded
glyph data, SPIR-V resources, descriptors, and dependent draw ranges from registered font bytes and
logical text state after device loss.

The earlier HarfBuzz/FreeType proof and public Slug shader references are superseded evidence only.
They make no compatibility claim for Goo's Vulkan text path and are not runtime dependencies, fallback
paths, or implementation candidates. DirectWrite,
Fontconfig, Vulkan Memory Allocator, Lyon, Kurbo, Clipper2, Wuffs, stb, resvg, and other named options
remain outside the accepted stack. GPUI remains a comparison source only.

The full service-by-service map, candidate evidence, and replacement proof corpus are in
`VULKAN-SKIA-REPLACEMENT.md`.

### Implemented non-shipping Vulkan text proof state

This is proof status only. It is not Goo product integration, and it does not retire
`Goo.InternalTextInterop`. That path remains live as the current Skia baseline until the atomic
Vulkan cutover passes its gates.

The proof provider is implemented in G# and directly P/Invokes the pinned upstream HarfBuzz and
`hb-gpu` C ABIs to exercise the proposed Goo-internal provider boundary. It carries pinned,
reproducible, source-built Linux x64 and Windows x64 payloads. Linux JIT and NativeAOT execution are
covered. Windows cross-build and package validation are prepared, but Windows runtime execution is
deferred by the user. The locked stable versioned provider ABI is not implemented by this proof.

The proof payload has no FreeType, no Goo-owned C shim, and no bitmap shader path. Shaping uses
UTF-16 input and reports UTF-16 clusters. The explicit provider contract covers face index,
variation coordinates, direction, script, language, feature records, flags, and cluster level.

The proof compiles and validates precompiled `hb-gpu` SPIR-V, uses bounded Vulkan texel-atlas
records, and has real Vulkan readbacks for analytical monochrome glyphs and COLRv0 and COLRv1
glyphs. The deterministic CPAL sRGB-to-linear Q15 vendor patch is applied. sRGB and blend format
gates are present. The recording hot paths report zero managed allocations.

Remaining text proof gates, not completed features:

- Registered-font fallback and mixed-run itemization.
- Stable versioned provider ABI with bounded caller-owned output buffers, workspaces, and explicit
  status values.
- `Unicode.Bidi` integration and generated Unicode 16 tables.
- Full layout, editing, caret, selection, hit-testing, and IME corpus coverage.
- Multi-atlas residency, cache policy, and batching behavior.
- Device-loss reconstruction of text resources and dependent draw ranges.
- Windows runtime execution and runtime lifecycle validation.
- Final color-policy details beyond the current CPAL conversion and format gates.
- O16 fixed cross-platform antialiasing policy and measurement.

## 4. Work sequence

### P0. Approve the plan

1. Correct this artifact.
2. Lock the order of work.
3. Record the locked text stack in O02/Q2 and the Goo-owned vector direction in O03/Q3, then review any later
   evidence-triggered decisions one at a time in the Q&A ledger.
4. Record accepted answers in this artifact before they affect later work.
5. Do not start Goo product architecture changes before this review is complete. Non-shipping proof
   work remains separately identified from product integration.

Exit: the requirements, open questions, evidence, and decision points match the user's intent.

### P1. Complete the G# 0.4.1 upgrade

1. Pin `Gsharp.NET.Sdk/0.4.1` from NuGet.org.
2. Verify release tag `v0.4.1`, source commit
   `d670ac98c03e0b0f7c9ac965f5fa3914712f09de`, and package SHA-256
   `fa379d5d68c2286afaee2d429dfad4585cfa25fe8495916cb7d5b41837099e63`.
3. Make the exact G# 0.4.1 SDK restore reproducible without a local feed.
4. Map commits from the previously used G# version through 0.4.1.
5. Rebuild every historical compiler finding against the exact selected version.
6. Map each fixed finding to current Goo source.
7. Remove a workaround only when a focused package or runtime probe proves it is obsolete.
8. Keep `Goo.InternalTextInterop` intact as the current Skia baseline until its responsibilities are
   replaced and the atomic Vulkan cutover gates pass.
9. Keep renderer behavior, runtime-helper migration, and public API changes out of this upgrade.
10. Capture clean build, package, API, startup, idle, frame, allocation, memory, and binary baselines.

Exit: a clean clone restores, builds, packages, and runs the current Goo behavior with G# 0.4.1,
with the current helper and package shape preserved. The final direct Vulkan cutover removes the
legacy Goo-owned C# helper after all required replacements pass; the locked text provider introduces
no new Goo-owned C# runtime helper. External C# vendors such as Yoga.Net remain unchanged.

### P2. Establish the Goo core and platform requirements

1. Treat the Hivemind UI inventory as a reference corpus for Goo core capability, scale, behavior,
   visual quality, and performance.
2. For every surface and component, record behavior, state, input, accessibility, data scale, visual
   effects, window usage, and performance sensitivity.
3. Classify every Avalonia gap as a required Goo core mechanism, composable from public Goo
   primitives, or a framework nicety not needed in core.
4. Audit Uproar95 multi-window, aggregate pumping, DPI, focus, close and reopen, surface lifecycle,
   and live state ownership with actual end-to-end runs.
5. Record Windows gaps separately from Linux gaps.
6. Do not design or implement Hivemind application code or a reusable control library in this plan.

Exit: every reference gap is classified as a required Goo core mechanism, publicly composable
behavior, or out of scope. No Avalonia feature is copied only because Avalonia has it.

### P3. Measure the current rendering pipeline

Separate these costs before proposing a replacement:

1. Application state propagation and Cell rebuild.
2. Reconciliation and retained-tree updates.
3. Yoga layout.
4. Paint or scene construction.
5. Native wrapper allocation and resource preparation.
6. GPU upload and command construction.
7. GPU rendering, flush, presentation, and compositor wait.

Use the newest complete and valid Skia result for each workload as the frozen historical baseline.
A qualifying result must identify the source commit, build, G# SDK, runtime, OS, driver, hardware,
power mode, resolution, DPI, and benchmark protocol. If the newest stored result lacks a required
Q10 workload or metric, capture that missing Skia result before removing the renderer. Do not select
an older or slower Skia result to lower the bar.

Measure idle, a small animated scene, a large virtualized table, a Hivemind-derived topology
workload, text editing, image-heavy content, resize, and three active windows. Record P50, P95, P99,
P99.9, and worst total frame time, stage times, allocations, retained memory, GPU memory, upload
bytes, draw calls, startup, and installed bytes.

Keep the frozen Skia baseline permanently. Each accepted Vulkan result becomes the next regression
baseline for later Vulkan work. A later result cannot regress beyond the accepted Q10 noise allowance
without explicit Q&A. Never rebase the Skia floor from a weaker Vulkan result.

Exit: the dominant costs are known. A paint-stage improvement is not accepted as a total-frame
improvement without the full measurement.

### P4. Prove the direct Vulkan replacement boundary

Direct Vulkan is the primary feasibility track. These proofs establish what Goo must own before any
production backend work starts.

1. Prove SDL Vulkan window creation, swapchain ownership, resize, synchronization, presentation,
   surface loss, and declared device-loss handling on Windows and Linux.
2. Prove common UI paths with boxes, per-edge borders, gradients, images, transforms, clipping,
   offscreen targets, readback, and transparent composition.
3. Prove the highest-risk losses before broad primitive coverage. Include registered-font fallback and
   supported COLR/CPAL v0/v1 color glyphs, stroked arbitrary paths, path clips and hit tests, opacity
   groups, advanced blends, masked shadow spread and inset behavior, nested masks, and color-space parity.
4. For text proof, use the locked provider with runtime `.ttf`/`.otf`/`.ttc`/`.otc` inputs, identical
   registered font bytes, variation settings, shaping options, Unicode 16 profile, fallback order,
   and expected geometry on both platforms. Compile its pinned shader source to SPIR-V and prove the
   Vulkan atlas resources, descriptor bindings, resource lifetime, and device-loss reconstruction.
5. Run the fixed proof scene and Hivemind-derived reference hot paths against captured visual and
   performance baselines plus the approved Goo core behavior contract.
6. Report Windows and Linux feature coverage, unsupported behavior, pixel differences, total frame time,
   CPU and GPU time, allocation, memory, upload, startup, input latency, and final RID contents.
7. Treat this as one end-to-end proof corpus, not one test per primitive or subsystem.

The first direct Vulkan implementation boundary removes the Skia renderer, Skia source integration,
managed packages, native assets, and package contents. Do not build Ganesh Vulkan, a permanent
hybrid, or a live Skia oracle. O06 and O07 define the accepted command and retention boundaries.

Exit: direct Vulkan replacement feasibility is measured, the uncovered Skia services are explicit,
and the accepted O03 open path direction has implementation evidence.

### P5. Evaluate whole-window work independently

Vulkan does not itself solve coarse invalidation or full-target redraw. Evaluate these as separate
layers:

| Layer | Candidate reduction |
|---|---|
| Application | Smaller Cells, source-local invalidation, stable keys, batching, structural virtualization |
| Layout | Retain Yoga state and relayout only affected roots |
| Scene construction | Reuse clean typed frame-plan segments and rebuild only dirty segments |
| Upload | Keep immutable resources and clean primitive ranges resident. Upload only changed ranges and resources |
| GPU drawing | Apply accumulated damage to each acquired swapchain image and draw intersecting segments in visual order |
| Presentation | Present only on demand. Use incremental-present regions as optional hints, never as a correctness dependency |

The GPUI audit is reference material only. Its scene ranges, batching, atlases, virtualization,
demand-driven drawing, and recovery behavior are hypotheses to measure in Goo. They are not Goo
requirements, recommendations, or a platform architecture. GPUI still clears and replays the full
dirty frame, which also does not select full replay or damage rendering for Goo.

Exit: choose the least complex model that wins total frame time and resource gates on the approved
reference workloads.

### P6. Implement the approved Goo foundation

Only after P4 and P5 decisions:

1. Implement the chosen UI-to-renderer boundary.
2. Implement direct Vulkan ownership with no Skia backend or fallback.
3. Implement shared or per-window GPU ownership as approved.
4. Implement the locked text provider only after its source, license, reproducibility, ABI, resource,
   corpus, visual, performance, allocation, lifecycle, package, and Windows/Linux gates pass. Do not
   add a temporary text backend or fallback.
5. Add required image, path, clip, layer, effect, readback, and recovery paths.
6. Preserve declarative G# authoring and Yoga behavior.
7. Keep public additions limited to mechanisms that consumers cannot compose themselves.
8. Validate Windows and Linux continuously against the P3 baseline.

Exit: the direct Vulkan backend passes its visual, performance, resource, lifecycle, and package
gates.

### P7. Complete the required Goo core mechanisms

1. Implement only mechanisms that consumers cannot compose through the public primitive API.
2. Prove that representative reusable controls can be composed without private Goo access. Do not
   build or package those controls as part of this plan.
3. Keep application models, services, persistence, storage, platform policy, and product-specific
   composites outside Goo core.
4. Prioritize core windowing, input, text, scrolling, virtualization mechanisms, accessibility,
   rendering, resources, and lifecycle behavior exposed by the approved reference inventory.
5. Use Hivemind-derived scales and interaction traces in benchmark fixtures without adding Hivemind
   application code.

Exit: every approved core gap is implemented on Windows and Linux, or the required behavior is proven
composable from the public Goo API.

### P8. Package and qualify Goo core

1. Remove an old Goo dependency only after its final core consumer is replaced and the approved gates
   pass.
2. Verify that Goo and its official packages contain no Skia source integration, managed assembly,
   native asset, or runtime dependency.
3. Publish RID-specific Windows and Linux packages and measure their real installed contents.
4. Run the approved NativeAOT, lifecycle, visual, performance, and package smoke coverage.

Exit: Goo core and its official packages pass the approved Windows and Linux release gates.

## 5. Vulkan replacement decision matrix

Compare the direct Vulkan proof to captured baselines and the approved Goo core behavior contract.
Do not score from architectural preference.

| Gate | Required comparison |
|---|---|
| Visual coverage | Text, CJK, RTL, emoji, images, SVG, paths, borders, gradients, clips, opacity, blends, shadows, transparency, DPI |
| Total performance | P50 and P95 total frame and input latency on fixed scenes and Hivemind-derived reference flows |
| CPU and allocation | Rebuild, layout, scene, upload, native calls, steady allocation |
| Memory | Managed heap, private dirty memory, RSS, GPU allocations, cache bounds, three-window duplication |
| Idle | No unnecessary rebuild, layout, render, submit, present, or steady allocation |
| Binary | Managed, native, shader, binding, font, codec, and RID-specific installed bytes |
| Lifetime | Resize, minimize, restore, close, reopen, surface loss, device loss policy, resource release |
| Platform | Windows x64 and Linux Wayland x64 with the same public G# behavior |
| Complexity | Handwritten code, generated code, native dependencies, platform splits, debugging burden |
| Transition | Goo implementation duplication, fallback duration, and reversibility |

The direct renderer does not pass solely because it uses Vulkan, removes Skia, has fewer source
lines, or improves one internal timing stage.

## 6. Minimal verification plan

These are the proposed new gates. Existing useful tests remain, but the renderer change does not add broad
unit coverage.

1. One G# 0.4.1 clean package consumer end-to-end run.
2. One fixed renderer visual scene used by the direct Vulkan proof.
3. One Hivemind-derived large-data and topology hot-path run.
4. One Windows and one Linux three-window end-to-end run.
5. One resize, minimize, restore, close, reopen, and declared device-loss run.
6. One RID package and NativeAOT size report per supported platform.
7. Focused compiler probes only for G# findings whose disposition changes Goo source.

Do not add one test per primitive, Vulkan result code, component state, or internal helper.

## 7. Items explicitly not approved by this draft

- Retaining Skia source integration, packages, native assets, or a runnable backend after direct
  Vulkan implementation begins.
- Building Ganesh Vulkan, a permanent hybrid, or a live Skia oracle.
- Starting the direct Vulkan implementation before this review and the required proofs are accepted.
- Using full-frame replay as the final renderer.
- Using a separate full-window backing image or framebuffer tile cache as the initial retention model.
- Handwriting Vulkan ABI structs, constants, or command signatures instead of generating them from
  the pinned Khronos registry.
- Adding a proprietary or paid text or vector SDK, closed headers or tools, or a non-redistributable
  runtime artifact to Goo. The locked HarfBuzz provider, generated Unicode tables, vector path,
  asset, and Vulkan implementations must pass their source, license, ABI, resource, corpus, and
  both-RID gates before shipping. FreeType, ICU, DirectWrite, Fontconfig, ClearType, platform text
  rasterizers, CPU text rasterization, Vulkan Memory Allocator, Lyon, Kurbo, Clipper2, Wuffs, stb,
  and resvg are not part of the accepted stack.
- Replacing the current image or SVG stack before its accepted implementation gate.
- Copying GPUI's renderer or its Windows and Linux platform split.
- Moving composed controls or application-specific behavior into Goo core.
- Changing or removing Avalonia or other Hivemind application dependencies in this Goo core plan.
- Any exact source-line estimate or delivery-wave schedule.
- Changing the accepted Q10 thresholds or rebasing the frozen Skia floor without explicit Q&A.
- Treating the renderer conclusion in `GAPS-AND-REDUCTIONS.md` as approved.

## 8. Decision Q&A ledger

Review one question at a time. Do not use a recommended answer as an accepted answer.

| Order | Decision | Status |
|---:|---|---|
| Q1 | Skia transition and removal gate | Accepted |
| Q2 | Text and font stack | Accepted |
| Q3 | Path geometry and hit testing | Accepted |
| Q4 | Image codecs and SVG ownership | Accepted |
| S12-I01 | Versioned stable ImageSourceProvider contract | Accepted |
| Q5 | CPU raster diagnostics | Accepted |
| Q6 | Internal renderer command boundary | Accepted |
| Q7 | Dirty-frame and retained-resource model | Accepted |
| Q8 | Vulkan binding and allocation | Accepted |
| Q9 | Multi-window GPU ownership and recovery | Accepted |
| Q10 | Quantitative adoption gates | Accepted |

### Q1. Skia transition and removal gate

Accepted answer: gut Skia out. The first direct Vulkan implementation boundary removes the current
renderer integration, SkiaSharp packages, native assets, and official-package contents. Goo will not
keep a temporary OpenGL oracle, build Ganesh Vulkan, or retain a fallback or hybrid.

Direct Vulkan is accepted when required reference rendering has no regressions on Windows and Linux.
Captured visual and performance evidence remains usable, but Skia is not kept runnable for live
comparison. Q10 defines the quantitative performance, memory, and package gates.

### Q2. Text and font stack

Accepted answer: lock a Vulkan-compatible runtime text stack behind a stable Goo-internal provider
ABI. Goo vendors a trimmed HarfBuzz 14.3.1 core plus `hb-gpu` as a private native payload per RID.
The provider ABI hides all HarfBuzz handles and experimental `hb-gpu` APIs from public G# code. Build
without FreeType, ICU, GLib, platform integrations, bitmap/vector/raster helpers, subsetting,
utilities, or other unused modules. No proprietary SDK, paid runtime, closed headers or tools, or
non-redistributable artifact may enter Goo.

The proof provider is implemented in G# and directly P/Invokes the vendored upstream HarfBuzz and
`hb-gpu` C ABIs to exercise the proposed boundary. The locked stable versioned provider ABI remains
unimplemented. The private RID payload is built from the pinned upstream source archive. No Goo-owned
C or C# runtime helper or shim is introduced, and no text-engine handle crosses the public API.

The provider accepts runtime `.ttf`, `.otf`, `.ttc`, and `.otc` bytes. HarfBuzz owns OpenType table
parsing, shaping, glyph metrics, variation coordinates, coverage, outline extraction, and COLR/CPAL
paint traversal. `hb-gpu` encodes monochrome outlines and COLR/CPAL v0/v1 paint data into compact CPU
blobs and supplies the shader source. Goo compiles the pinned GLSL-compatible shader source into
SPIR-V at build time and ships validated SPIR-V only. Goo owns the Vulkan atlas resources, descriptors, pipelines, draw ranges, synchronization,
cache lifetime, and device-loss rebuild. The atlas binding is a Vulkan texel buffer (`VkBufferView`)
using the signed-integer format required by the pinned encoder. No OpenGL API, bitmap glyph rasterizer,
CPU text rasterizer, platform rasterizer, or ClearType path is used.

The initial grapheme implementation is .NET 10 `StringInfo`. `Unicode.Bidi` 0.3.18 is vendored for
bidi, with the initial supported behavior profile pinned to Unicode 16. Build-time generators emit G#
tables from the same profile for UAX #14 line breaking, UAX #29 word breaking, Scripts, and
ScriptExtensions. Goo owns mixed-run itemization, registered-font-first fallback, paragraph layout,
wrapping, ellipsis, caret, selection, hit testing, and IME geometry. Exact parity is defined by
identical registered font bytes, variation settings, shaping options, Unicode 16 profile, and explicit
fallback order on Windows x64 and Linux x64. System font catalog discovery is optional best effort and
is not an exact-parity input.

Initial glyph support is monochrome analytical outlines plus COLR/CPAL v0/v1. CBDT/CBLC, `sbix`, SVG
fonts, and language-specific hyphenation are deferred. Text antialiasing remains the O16 measured
policy decision. The locked provider ABI must use caller-owned buffers and workspaces, stable versioned
results, explicit status values, and no public text-engine handles. Reconstruct encoded glyph data,
SPIR-V resources, descriptors, and dependent draw ranges from registered font bytes and logical text
state after device loss.

The provider must pass source, license, reproducibility, ABI, resource, G# NativeAOT, device-loss,
corpus, visual, performance, allocation, package, lifecycle, and Windows/Linux gates independently.
The permanent corpus includes a primary and fallback font, CJK, RTL, combining marks, ligatures, a
supported COLR/CPAL color glyph, variation settings, UTF-16 offsets, grapheme boundaries, line and
word breaks, caret, selection, hit testing, IME geometry, generated glyph blobs, Vulkan upload,
SPIR-V pipeline use, and one device-loss reconstruction. Use identical source hashes, fallback order,
import options, tolerances, and policy on both RIDs.

Superseded evidence: the earlier HarfBuzz/FreeType proof and public Slug shader references are
archived for historical comparison only. They make no compatibility claim for Goo's Vulkan text path
and are not runtime dependencies, fallback paths, or implementation candidates. Do not extend or ship
them.

Q2 implementation exit: the locked provider and every required component pass source, license,
reproducibility, ABI, resource, G# NativeAOT, device-loss, corpus, visual, performance, allocation,
package, lifecycle, and Windows/Linux gates independently. Until then, the accepted direction remains
unshipped. The superseded evidence above is not used as a runtime implementation or fallback.

Reopen Q2 if either RID lacks a supported provider build, required font behavior is unsupported,
shader-to-SPIR-V integration is not reproducible, Vulkan resource requirements cannot be met, or a new
dependency or policy is required.

### Q3. Path geometry and hit testing

Accepted answer: use a Goo-owned or freely redistributable curve, band, fill, stroke, and Vulkan
implementation for arbitrary Goo paths. The path implementation owns its shader source and SPIR-V
resources and has no dependency on superseded text or shader imports.

Goo retains its immutable `VectorPath` contract. It converts cubic and elliptical-arc commands to
deterministic quadratic sequences when retained geometry changes. The selected implementation
produces caller-owned fill and stroke geometry for NonZero and EvenOdd fills, caps, joins, miter
limits, and dashes. No geometry is generated during submission or paint.

Goo owns CPU bounds and hit testing from the same normalized retained source, arbitrary path clip
integration through cached coverage masks, and coverage composition with solid, multi-stop gradient,
and image paints. S14 owns shadow, inset-shadow, and spread effects through bounded masks. Do not add
Clipper2, Lyon, Kurbo, micro-tess, or another tessellator until an open implementation candidate
passes the source, license, ABI, quality, performance, allocation, and both-RID gates. Reopen Q3 if
measured required Goo behavior needs explicit boolean or offset geometry that the accepted mask path
cannot provide, or if the selected implementation fails the shared contract.

### Q4. Image codecs and SVG ownership

Accepted answer: split image responsibilities. Goo core owns decoded premultiplied RGBA data,
`ImageSourceProvider` integration, asynchronous loading lifecycle, byte-bounded caching, Vulkan
upload, sizing, sampling, and invalidation.

S12-I01 locks the versioned stable provider contract:

- S18 adds `ImageSourceProvider.ContentVersion` as a read-only `uint64` property and
  `ImageSourceProvider.ContentChanged` as a parameterless event. `Acquire()` remains unchanged and
  `ImageSourceLease` gains no public member. This is an intentional breaking change for custom
  provider implementations and requires the approved API baseline and generated documentation to
  change with the product cutover.
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

Raster file decoding belongs in an optional codec provider or package. Applications own allowed
formats, hostile-input limits, and attachment policy. Keep the declarative `Image(path)` API simple
through registered providers.

Use a build-time Goo SVG compiler for icons and a controlled animation subset. Its final output is a
compact Goo vector asset embedded in the application binary. Generated G# is acceptable for an early
compiler spike but is not the final NativeAOT asset format. The shipped application does not require
an SVG XML parser.

The initial compiler supports paths, groups, transforms, opacity, solid paints, basic linear and
radial gradients, strokes, simple clips, transform, opacity, color and stroke animation, and path
morphs with compatible command topology. Resolve and embed permitted external inputs at build time.
Exclude scripts, DOM interaction, runtime CSS selectors, SMIL event semantics, runtime external
references, general masks and filters, and browser-engine behavior.

The compiled asset runtime needs a keyframe and loop player integrated with the retained scene and
resource model selected under Q6 and Q7. Animation must not rebuild the Cell tree on every tick.
Preserve an optional runtime SVG provider extension for applications that later need arbitrary SVG
files, streams, user content, or network assets. Runtime SVG is not part of the initial Goo runtime.

### Q5. CPU raster diagnostics

Accepted answer: do not retain or replace the product CPU raster renderer. Direct Vulkan is Goo's
only product renderer. Remove `WindowRenderer`, `Window.Renderer`, the Wayland shared-memory target,
raster color conversion, and raster-only verification. Validate readback with a Goo-owned visual
probe. Consumer migration remains outside this plan.

Diagnostics and capture render through the same Vulkan pipelines into an offscreen `VkImage`. On
request, transfer the result to a host-visible staging buffer and return raw premultiplied RGBA after
asynchronous fence completion. Do not add readback, synchronization, or allocation to the normal
frame path. Image encoding belongs to the optional Q4 codec providers.

Use a software Vulkan ICD for CI and headless verification when required, not a second Goo renderer.
If no usable product Vulkan ICD is present, fail startup clearly. Do not ship a software Vulkan
compatibility bundle in Goo or its official runtime packages.

Retain one cross-platform end-to-end visual capture and minimal Vulkan readback regression coverage.
Hardware comparisons can use an approved tolerance for vendor antialiasing differences.

### Q6. Internal renderer command boundary

Accepted answer: use a compact typed frame plan as the internal boundary between Goo's retained tree
and Vulkan recording. Compile primitive-family typed arrays, compact ordered draw references, and
stable logical resource IDs. Reuse allocated capacity and require no steady-frame allocation. The
Vulkan recorder does not traverse retained nodes. Do not add a general byte-command interpreter or
per-command object, interface, delegate, or reflection dispatch.

The initial frame plan is transient for each dirty frame. O07 decides whether clean plan segments,
GPU ranges, surfaces, tiles, or other resources become retained. That decision must not change Goo's
public declarative API or the Vulkan recorder's typed input contract.

Use direct retained-node traversal only as the proof control. Compare typed array layouts and compact
ordered-reference representations inside the accepted boundary. Exact struct packing, array shape,
index width, and growth policy remain benchmark-gated implementation details.

All candidates use identical shaders, pipelines, resource content, target formats, synchronization,
and captured output. The shared proof slice includes solid and rounded boxes, gradients, a cached
image, cached glyph runs, a prebuilt path mesh, transforms, nested clips, group opacity, blend, an
offscreen layer, and a shadow. This slice exercises ordering, state transitions, batching, resources,
and first-use pipeline work without rebuilding every renderer feature.

First compare every boundary with fixed command order and identical adjacent-state coalescing. Run
overlap-safe batching as a separate arm so batching does not hide command-boundary cost. Use a
normalized semantic digest and identical offscreen captures to prove equivalent work. A counting
sink isolates traversal, encoding, decoding, and arena growth. The shared Vulkan recorder measures
the end-to-end result.

Run the candidates against Hivemind-scale reference workloads with a large table, topology scene,
text editing, animation, resize, and three active windows. Measure static, sparse-change, scrolling,
and full-change cases.
Separate cold startup and first-use samples from warmed steady-state samples. Use multiple isolated
Release runs with parallel test execution disabled.

Report P50, P95, P99, P99.9, worst, and the full total-frame distribution plus tree traversal,
command construction, batch compilation, Vulkan recording, submission, and GPU time. Also report
managed and native allocation, GC pauses, steady and peak memory, command bytes, upload bytes, draw
calls, pipeline and descriptor
changes, render passes, barriers, idle work, startup, first-use stalls, resize stalls, and final
Windows and Linux NativeAOT contents.

Use asynchronous Vulkan timestamp queries for upload, main rendering, effects, and offscreen passes.
Resolve results after the frame fence. Do not use `vkDeviceWaitIdle`, synchronous readback, or another
forced CPU and GPU synchronization point in the timed frame path.

Reject any proof arm that changes required output or behavior. Reopen O06 only if the direct control
materially dominates the accepted typed plan across the required workloads after reasonable layout
optimization. Return any frame-time, hitch, memory, allocation, or size tradeoff for Q&A instead of
hiding it in a weighted score. Apply the accepted Q10 gates to the raw evidence.

The benchmark belongs to the P4 proof work. It is not production renderer implementation. Q7 remains
responsible for dirty ownership, range retention, GPU residency, retained surfaces, tiles, and damage.

### Q7. Dirty-frame and retained-resource model

Accepted answer: retain clean typed frame-plan segments, stable GPU ranges, and immutable resources.
Rebuild and upload only dirty segments and changed resources. Use explicit byte limits and fence-safe
retirement for GPU resources and required offscreen effect layers.

Each window owns a monotonic scene version and a bounded damage journal. Each swapchain image records
the latest scene version applied to its preserved pixels. When an image is acquired, combine damage
newer than that image's version, expand it for transforms, clips, shadows, opacity, blends, offscreen
effects, and overlapping dependencies, then draw intersecting scene segments in original visual
order. Coalesce excessive regions into a larger region or a full redraw.

Full redraw is the recovery path for first use, swapchain creation or replacement, resize, lost or
undefined image contents, surface or device recovery, journal overflow, and effects whose dependency
bounds cannot be proven. Optional incremental-present regions are performance hints only. Goo keeps
every presented image complete and correct if the presentation engine ignores them.

Do not allocate a separate full-window backing image or implement a framebuffer tile cache in the
initial renderer. Retain only offscreen surfaces already required by visual effects, with explicit
versions and byte bounds. Do not add a general automatic subtree-to-texture cache without later
evidence.

Reopen O07 if the accepted path loses on total frame time, hitches, memory, power proxy, or visual
correctness on the required Windows and Linux workloads after reasonable damage coalescing and
dependency optimization. The rejected Ganesh damage-clipping result does not select this Vulkan
design, but its total-frame and pixel evidence remains a regression warning.

### Q8. Vulkan binding and allocation

Accepted answer: generate a narrow G# Vulkan binding from a pinned Khronos `vk.xml`. Generate only
the approved core and extension surface plus its transitive ABI types. Check the generated G# into
the repository. The generator is a development tool and does not ship in the Goo runtime.

Load the Vulkan entry point through SDL and populate typed global, instance, and device dispatch
tables. Call typed unmanaged function pointers directly from G#. Do not use reflection, delegates,
or dynamic marshaling in the render path. Handwritten interop is limited to the loader bootstrap and
Goo-owned wrappers. Vulkan structs, enums, constants, and command signatures remain generated.

Use a Goo-owned resource-specific block suballocator instead of a general allocator dependency.
Partition blocks by Vulkan memory type and resource class. Use persistently mapped staging rings,
device-local buffer blocks, separate image blocks, and dedicated allocations when Vulkan requires
them or a resource exceeds the block policy. Reclaim ranges only after fence-safe retirement.

The allocator must honor memory type bits, alignment, dedicated-allocation requirements,
`bufferImageGranularity`, `nonCoherentAtomSize`, and device allocation limits. Track explicit heap
budgets and pressure. The steady frame path performs no device-memory allocation and no managed
allocation. Do not implement defragmentation initially.

Keep the allocator and binding behind Goo-owned internal contracts. Reopen the allocator selection
if Windows and Linux driver validation, long-running fragmentation, or measured memory waste proves
the narrow design insufficient. Vulkan Memory Allocator is the contingency, not a shipped
dependency. O10 records the exact final binding and allocator binary cost.

### Q9. Multi-window GPU ownership and recovery

Accepted answer: use one Vulkan instance, physical device, and logical device for the process. Share
the allocator, queues, pipelines, shaders, samplers, curve/band text resources, immutable resources,
and device-level caches across windows. Do not create one Vulkan device per window.

Each window owns its SDL surface, swapchain, image views, presentation synchronization, frame slots,
format, extent, and O07 damage history. Dirty scheduling and presentation remain independent. A
clean, minimized, blocked, resizing, or failed window must not force another window to rebuild or
render. The runtime can move submission to a dedicated render thread later without changing this
ownership model, but the initial implementation does not require that thread.

Resize and `VK_ERROR_OUT_OF_DATE_KHR` recreate only the affected swapchain. Coalesce rapid resize to
the newest extent. A zero-sized minimized window stops acquiring and presenting until it has a valid
extent. `VK_ERROR_SURFACE_LOST_KHR` recreates only that window's SDL surface and swapchain. Closing a
window retires only its presentation resources.

Do not call `vkDeviceWaitIdle` for normal resize, close, or surface recovery. Retire old swapchains
and presentation resources after safe completion. Use `VK_EXT_swapchain_maintenance1` present fences
when available. Otherwise, use acquired-image presentation history and deferred retirement.

Device loss is process-wide. Stop all submissions, advance a GPU generation, discard handles from
the failed generation, re-enumerate physical devices against every live surface, create one new
logical device and shared runtime, rebuild GPU resources from logical sources or providers, recreate
every live swapchain, and force a full redraw for each window.

Allow one automatic rebuild for each device-loss event. A second loss during that rebuild produces a
clear fatal renderer error. Do not loop indefinitely and do not fall back to another renderer.

Verify presentation support when each window opens. If a later surface cannot use the selected
physical device and queue families, fail that window's creation clearly. Do not implement a
multi-device runtime until Windows or Linux hardware evidence proves it necessary.

### Q10. Quantitative adoption gates

Accepted answer: use the newest complete, valid Skia benchmark result for each workload as the
frozen historical baseline. A result qualifies only with the P3 provenance and approved benchmark
protocol. Fill missing metrics before Skia removal. Do not rerun or select Skia results to make the
Vulkan comparison easier.

Each accepted Vulkan result becomes the next regression baseline for later Vulkan work. Keep the
Skia result as the permanent historical floor. A Vulkan result can match the current accepted result
within the noise allowance, but a regression beyond it requires explicit Q&A. Continue recording
improvements instead of replacing the history with one moving number.

#### Measurement protocol

- Use the same machine, OS, driver, power mode, resolution, DPI, and workload.
- Measure Release NativeAOT builds.
- Use five isolated runs with 300 warmup frames and 2,000 measured frames per workload.
- Report P50, P95, P99, P99.9, and worst.
- Treat the larger of three percent or 0.1 ms as measurement noise.
- Make Windows and Linux pass separately. Do not average platforms or workloads.

#### Hard gates

| Area | Required result |
|---|---|
| Feature coverage | All approved Goo behavior passes on Windows and Linux |
| Strict pixels | Maximum absolute RGBA channel delta of one |
| AA and effect pixels | At least 99.9 percent have a maximum channel delta of eight and no channel delta exceeds 24 |
| Geometry and text placement | No displacement greater than 0.5 logical pixels |
| General frame time | No workload percentile regresses beyond the noise allowance |
| Sparse large workloads | P95 frame production is at least 20 percent faster for tables, topology, and three-window sparse changes |
| Absolute frame budget | P95 is at most 8.33 ms and P99 is at most 16.67 ms, excluding intentional presentation wait |
| Input latency | P95 input-to-present is at most two refresh intervals plus 4 ms and is not worse than baseline |
| Startup | P95 first usable frame does not regress beyond the noise allowance |
| Memory | Managed heap, private dirty memory, RSS, and Goo-reserved GPU memory each stay within five percent of baseline |
| Binary | Each Windows and Linux NativeAOT result is at least 8 MiB smaller than the frozen Skia result |
| Dependencies | No Skia asset remains and the mandatory native-library count does not increase |
| Validation | No Vulkan validation error occurs in proof or lifecycle runs |

The 8 MiB binary floor leaves approximately 4 to 5 MiB of the measured gross Skia removal for the
selected text runtime, generated bindings, shaders, and Goo renderer code.

#### Idle and allocation gates

A 60-second true-idle run must show zero rebuild, layout, render, submit, and present operations. It
must also show zero managed allocation, zero Vulkan object or device-memory allocation, and less than
0.5 percent of one CPU core.

Warmed unchanged-resource frames allocate zero managed bytes and create no Vulkan objects,
pipelines, or device-memory allocations.

#### Lifecycle endurance

Use one end-to-end lifecycle program per platform with three concurrent windows, 1,000 combined
resize, DPI, minimize, restore, close, and reopen operations, ten injected surface-loss recoveries,
and three injected device-loss recoveries. Require no deadlock, stale presentation, validation
failure, or lost input. Live Goo-owned resource bytes must return within 2 MiB of the post-warm
baseline. Allocator and cache usage must plateau instead of growing through the run.

This remains one compact end-to-end test. Do not add one test for every Vulkan function or internal
state transition.

#### Hardware and failure policy

Qualify Windows x64 and Linux Wayland x64 on one integrated and one discrete GPU per platform. Use a
software Vulkan implementation only for deterministic CI and headless capture.

There is no weighted score, platform averaging, Skia fallback, or CPU-renderer fallback. Any failed
hard gate blocks adoption or returns the specific tradeoff to Q&A. O16 can approve better AA and
replace its edge reference captures. It cannot weaken geometry, color, performance, or
cross-platform parity gates.

### O11. Window persistence ownership

Accepted answer: Goo core owns only live window primitives, state, metrics, lifecycle events, and the
application of requested values. Goo does not remember window data across process launches or choose
where and how that data is stored.

Persistence means remembering values across launches. Storage is the selected file, database,
registry, or other backing store. Restore validation decides whether saved data is stale, corrupt,
or incompatible. Monitor clamping moves restored bounds into a current display work area. Policy
decides what to save, when to save it, and how a window is identified. These are consumer or optional
library concerns, not Goo core responsibilities.

### O13. Core versus composed control boundary

Accepted answer: Goo core provides reusable primitives and runtime mechanisms. A control that can be
composed from the public primitive API stays in consumer code or an optional separate G# library.
It does not enter Goo core for convenience.

Hivemind provides requirements, workloads, visual references, and performance scales only. Its
components, models, services, persistence, storage, migration, and product policy are outside this
Goo core plan.

### O12. Accessibility ownership and adapter depth

Accepted answer: Goo core owns a platform-neutral semantic tree and the contract used to expose it.
Windows UI Automation and Linux AT-SPI bridges live in platform adapters. Goo core does not embed
platform-specific accessibility object models.

Implement the semantics required by real Goo core primitives. Defer mature-framework extras until a
core primitive or an end-to-end Windows and Linux behavior requires them.

### O14. Goo core dependency removal timing

Accepted answer: remove an old dependency after its final Goo-core consumer has been replaced and
the relevant Windows and Linux feature, behavior, lifecycle, package, and fallback gates pass. Skia
follows the earlier removal boundary accepted under O01.

For the locked text provider, remove any proof-only assets and old text implementation after the
HarfBuzz 14.3.1 plus `hb-gpu` payload, generated Unicode tables, shader-to-SPIR-V build, and Goo
provider have no remaining replacement gaps and pass both RID gates. The superseded evidence named in
Q2 remains historical only. No hidden text fallback is permitted.

### O16. Antialiasing selection constraint

Open constraint: the Vulkan proof can implement competing AA methods only for measurement. Goo will
then select and ship one fixed policy shared by Windows and Linux. Comparison-only paths do not enter
the product renderer. Do not expose runtime AA modes, per-window AA settings, or automatic strategy
switching.

The selected policy must meet the required visual quality, frame-time, memory, and hardware-support
gates. The exact method and sample count remain open until that evidence exists.

Later review after the Vulkan proof:

- The unresolved Vulkan MSAA and antialiasing strategy.
