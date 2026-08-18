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
- `VK_EXT_swapchain_maintenance1`, memory budget reporting, and incremental present remain optional
  capabilities with correctness-preserving fallbacks inside the Vulkan design.
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
- O16 needs the final AA policy selection.
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
