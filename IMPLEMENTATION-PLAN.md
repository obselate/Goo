# Goo Core Vulkan Implementation Plan

Status: active, S00 through S02 complete, S03 through S05 started

Date: 2026-08-16

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
- HarfBuzz and FreeType with the same required fonts and policy on Windows and Linux.
- CSS-like Yoga flexbox layout.
- A compact typed frame plan with reusable storage and no steady-frame allocation.
- Retained clean scene segments, stable GPU ranges, and per-swapchain-image damage history.
- One process Vulkan instance and device with independent per-window presentation state.
- Request-driven Vulkan offscreen readback for diagnostics.
- A simple public G# API that does not expose Vulkan, SDL, FreeType, HarfBuzz, or native handles.
- NativeAOT packages that meet all Q10 visual, performance, memory, lifecycle, dependency, and size
  gates.

Hivemind, Uproar95, and Goo.Workbench are reference inputs. This plan does not implement Hivemind,
application controls, persistence, storage, restore policy, or monitor policy.

## 2. Execution rules

### 2.1 Product cutover rule

The Vulkan implementation can be developed and measured in a non-shipping proof target. That target
is not a Goo backend and is not referenced by the Goo runtime package.

The first production integration of direct Vulkan into Goo must also remove:

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

1. Use the current accepted baseline.
2. Run the same Release NativeAOT scenario.
3. Record total frame behavior, not only the changed internal stage.
4. Reject a change that exceeds a Q10 regression limit.
5. Store an accepted Vulkan result as the next chained baseline.

Do not weaken a gate, select a slower historical result, or rebase the immutable Skia floor.

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
| C02 | No Vulkan, SDL, HarfBuzz, FreeType, GPU, or native handle crosses the public Goo API |
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
| C14 | Vulkan proof code remains outside the shipping Goo runtime until the atomic cutover stage |

## 4. Dependency graph

```text
S00 scope and evidence lock
  -> S01 exact G# 0.4.1 restore
  -> S02 isolated G# migration and historical finding audit
  -> S03 package, API, requirements, and workload lock
  -> S04 frozen qualifying Skia baseline
  -> S05 Vulkan capability and build-toolchain contract
  -> S06 generated binding and SDL Vulkan loader
  -> S07 diagnostics and evidence spine
  -> S08 shared runtime, allocator, one-window WSI, and offscreen target
  -> S09 typed frame plan and basic pipelines
  -> S10 resource, shader, upload, and lifetime system
  -> S11 common text stack
  -> S12 image provider and decoded-pixel path
  -> S13 reopen O03, implement arbitrary paths, then compile SVG assets
  -> S14 compositing, effects, readback, and O16 AA selection
  -> S15 retained segments and per-image damage
  -> S16 multi-window scheduling and bounded recovery
  -> S17 remaining required Goo core mechanisms and platform adapters
  -> S18 atomic Goo cutover and Skia runtime removal
  -> S19 Windows/Linux qualification and package release gate
```

S11 and S12 can run in parallel after S10. All other arrows are hard ordering constraints unless the
lead records evidence that a dependency is not real.

## 5. Phase summary

| Stage | Outcome | Primary gate |
|---|---|---|
| S00 | Scope, authority, dirty state, and evidence inputs are locked | No unrelated work or conflicting source of truth |
| S01 | Exact G# 0.4.1 SDK restores without hidden local state | Clean-clone package consumer succeeds |
| S02 | Current migration and historical workarounds have evidence | Build, behavior, API, and package shape remain stable |
| S03 | Core requirements and deterministic workloads are fixed | Every reference gap is classified and owned |
| S04 | Complete immutable Skia floor exists | Both platforms have qualifying Q10 manifests |
| S05 | Vulkan capability and toolchain manifests are pinned | Target GPUs expose the required common surface |
| S06 | Narrow generated Vulkan ABI and SDL loader work | Validation-clean loader and surface proof on both platforms |
| S07 | Backend-neutral logs, counters, and manifests exist | Disabled diagnostics allocate nothing |
| S08 | Runtime, allocator, offscreen target, and one-window WSI work | Clear, quad, resize, and retirement are validation-clean |
| S09 | Typed plan drives the representative basic slice | Stable digest, correct pixels, zero warm allocation |
| S10 | Resource, shader, upload, and lifetime systems plateau | No warm resource creation or unbounded cache growth |
| S11 | HarfBuzz and FreeType replace Skia text services | Required text corpus matches on Windows and Linux |
| S12 | Backend-neutral images replace Skia decoding ownership | Async provider and cache behavior pass |
| S13 | Accepted O03 path solution and compiled SVG assets work | Required path, clip, hit-test, and SVG corpus passes |
| S14 | Effects and async readback work and one AA policy is accepted | O16 is closed with measured evidence |
| S15 | Sparse updates use retained ranges and image history | Required sparse P95 improvement passes |
| S16 | Shared-device multi-window lifecycle and recovery work | Q10 lifecycle endurance passes |
| S17 | Remaining approved core mechanisms and platform adapters work | Required credential, semantics, accessibility, focus, and scroll contracts pass |
| S18 | Direct Vulkan becomes Goo's only product renderer | Skia and CPU raster are absent and the G#-only runtime boundary remains intact |
| S19 | Both RIDs pass all release gates | Accepted Vulkan manifest becomes the next baseline |

### 5.1 Accepted-decision coverage

| Decision | Implementation stages |
|---|---|
| O01 Skia transition | S08-S16 use a non-shipping proof. S18 is the first product Vulkan integration and removes Skia atomically |
| O02 text stack | S11 uses one HarfBuzz and FreeType policy and identical required inputs on both platforms |
| O03 paths | S13 stops for Q&A when arbitrary paths become the real blocker |
| O04 images and SVG | S12 owns decoded pixels and providers. S13 adds build-time compiled SVG assets |
| O05 diagnostics | S08 and S14 use Vulkan offscreen readback. S18 removes CPU raster and raster-only APIs |
| O06 renderer boundary | S09 implements and measures the compact typed frame plan |
| O07 dirty frames | S15 implements retained chunks, stable GPU ranges, and per-image damage history |
| O08 binding and allocation | S05-S06 generate the narrow binding. S08 and S10 implement the Goo allocator |
| O09 multi-window ownership | S08 establishes shared ownership. S16 implements scheduling and bounded recovery |
| O10 adoption gates | S04 freezes Skia. S19 qualifies and chains accepted Vulkan results |
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
- `PLAN-FOR-REVIEW.md` records Q1, Q2, and Q4 through Q10 as accepted, Q3 as deferred,
  O01 through O14 as accepted, O15 as out of scope, and O16 as later.

Work:

1. Record HEAD, branch, dirty file list, selected SDK, package inputs, and existing plan artifacts.
2. Treat existing dirty files as user-owned unless their changes are explicitly assigned.
3. Record the exact files in the current G# 0.4.1 migration.
4. Create a requirements-to-stage matrix from the accepted decision IDs.
5. Mark O03 and O16 as explicit stop gates, not background implementation choices.

Required specification:

- No Vulkan, public API redesign, renderer removal, or runtime-helper migration is mixed into G#
  0.4.1 stabilization.
- `Goo.InternalTextInterop` remains the verified Skia baseline implementation through the
  non-shipping Vulkan proof. Its responsibilities move to G# only when their replacements satisfy
  the S18 atomic cutover entry gates.
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
8. Preserve `Goo.InternalTextInterop` and its current responsibilities as part of the verified Skia
   baseline.
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
- Text shaping, native resource lifetime, renderer behavior, and package shape stay equivalent.
- The final G#-only Goo-owned runtime boundary remains mandatory at S18. S02 does not move or delete
  the current helper merely to recreate temporary Skia and OpenGL behavior in G#.

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

### S04. Freeze the qualifying Skia baseline

Work:

1. Preserve existing Skia results as historical evidence.
2. Select the newest complete qualifying record independently for each workload and metric.
3. Capture only missing Q10 workloads, platforms, provenance, and metrics before Skia removal.
4. Store raw results, visual captures, diffs, package inventories, and SHA-256 hashes in a durable
  baseline manifest.
5. Assign a stable `baselineId` and `baselineKey`. The key includes OS/RID, GPU, driver, graphics
  implementation, workload, metric, and protocol.
6. Chain later accepted Vulkan records through `parentBaselineId` for the same complete baseline
  key. Never compare results from different GPUs or drivers as a baseline pair.
7. Make the benchmark harness reproducible by tracking it in this repository or pinning its external
  source commit and immutable digest.
8. Preserve the 2026-08-07 G# 0.3.633 Skia result as historical evidence, but capture the final
  current-Skia Q10 floor with the exact selected G# 0.4.1 SDK wherever compiler, runtime, workload, or
  metric behavior can differ.
9. Update the benchmark protocol schema, producer, parser, and Workbench ingestion for five isolated
  runs and all Q10 provenance before accepting any new baseline.
10. Retain accepted manifests and raw evidence in tracked evidence storage or immutable retained CI
  artifacts. Scratch files, local Workbench history, and unretained CI output do not qualify.

Qualifying provenance:

- Source commit and dirty state.
- Workload ID and revision.
- Build configuration and NativeAOT settings.
- G# SDK package and digest.
- .NET runtime.
- OS and kernel.
- CPU, GPU, driver, driver state, graphics API/backend, and graphics implementation.
- Power mode.
- Display configuration, resolution, refresh rate, DPI, pixel format, and color space.
- Present mode and, on Linux, Wayland compositor and session identity.
- Font files and hashes.
- Font fallback and raster options.
- Run count, warmup count, measured frame count, and exact command.

Protocol:

- Release NativeAOT.
- Five isolated processes.
- 300 warmup frames.
- 2,000 measured frames.
- P50, P95, P99, P99.9, and worst.
- Preserve all five per-run distributions. Concatenate the 10,000 valid measured samples for the
  aggregate percentiles. Do not use median-of-three, median-of-medians, or percentile averaging.
- Report every per-run percentile and the pooled percentile. Any invalid or incomplete run invalidates
  the result.
- Measurement noise is the larger of 3 percent or 0.1 ms.
- Windows and Linux records remain separate.

Recorded metrics:

- Input, state propagation, reconciliation, Yoga, frame-plan or paint construction, resource
  preparation, upload, command recording, GPU passes, submit, present wait, and total frame time.
- Managed allocations and GC pauses.
- Managed heap, private dirty memory, RSS, and Goo-reserved GPU memory.
- Upload bytes, command bytes, draw calls, pipeline changes, barriers, and render passes.
- Startup and first usable frame.
- Input-to-present latency.
- Installed bytes and mandatory native library count.

Permanent verification:

- T02 fixed visual corpus capture using the current Skia renderer.
- T03 fixed reference hot-path benchmark.
- Capture the pre-cutover T04 three-window action subset without Vulkan-only surface/device-loss
  injection. The full T04 recovery contract applies after S18.
- Capture T05 baseline package and NativeAOT contents for both RIDs. The Skia-absence assertion
  applies only after S18.

Exit:

- Every required Skia workload and Q10 metric has a valid immutable manifest on both platforms.
- Raw artifacts, source/configuration inputs, manifests, and their hashes are durably retained.
- The manifest itself is content-hashed and immutable after acceptance.
- The frozen Skia floor cannot be edited by later Vulkan runs.

Reopen when:

- Provenance is missing, environments are mixed, noise is excessive, or a required workload is not
  reproducible.

### S05. Lock Vulkan capability and build-toolchain contracts

Entry:

- S04 baseline manifests are complete.

Work:

1. Audit one integrated and one discrete GPU on Windows and Linux.
2. Select the lowest common Vulkan capability set that supports the accepted renderer design.
3. Pin one Khronos `vk.xml` revision.
4. Pin the offline shader compiler and SPIR-V target environment.
5. Define the exact generated-binding surface and extension policy.
6. Define the shader manifest schema, resource binding model, push constants, formats, and pipeline
  variants.
7. Record required, optional, and forbidden features.

Required capability policy:

- Required features must exist on all four qualification configurations.
- Surface and swapchain support are required.
- Dynamic rendering, synchronization2, and timeline semaphore behavior may be required through the
  chosen core version or exact extensions after the audit.
- `VK_EXT_swapchain_maintenance1`, memory budget reporting, and incremental present remain optional
  capabilities with correctness-preserving fallbacks inside the Vulkan design.
- Optional vendor blend, descriptor, or presentation features cannot be correctness dependencies.
- Runtime shader compilation is forbidden.

Required generated artifacts:

- Pinned registry manifest and hash.
- Deterministic narrow binding manifest.
- Shader manifest and compiler provenance.
- Checked-in G# binding output.
- Checked-in or reproducibly generated SPIR-V with hashes.

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
- Text, glyph atlas, image, and path resources.
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

- This is a non-shipping Vulkan proof target.
- Goo's product renderer remains Skia until S18.
- The proof is not selectable through the public API and is not packed.

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

Work:

1. Implement generation-safe logical resource registry.
2. Implement persistent buffer ranges, staging rings, images, samplers, descriptors, and atlases.
3. Implement bounded pipeline, glyph, image, mesh, and offscreen caches.
4. Implement fence-safe retirement and GPU-generation invalidation.
5. Store or reference a logical reconstruction source for every GPU resource.
6. Warm required pipelines outside measured steady frames.

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

### S11. Replace text services with common HarfBuzz and FreeType behavior

Keep:

- `Unicode.Bidi`.
- Goo paragraph and editor layout.
- Line breaking, caret, selection, hit testing, and editing geometry.

Replace:

- `SKTypeface`.
- `SKFont`.
- `SKShaper`.
- `SKTextBlob`.
- `SKFontManager`.
- Skia-backed shaped-run and glyph caches.

Required specification:

- Application-supplied font bytes are the authoritative font source.
- Goo owns fallback order and face metadata.
- HarfBuzz produces glyph IDs, clusters, advances, and offsets.
- FreeType provides face metrics, extents, hinting, and rasterization on both platforms.
- The same font bytes, library versions, variation coordinates, load flags, hinting, raster mode,
  fallback order, and glyph composition apply on both platforms.
- Glyph atlas keys include face version, glyph ID, size, DPI, variation, hinting, render mode, and
  color mode.
- Atlas memory is byte-bounded and fence-safe.
- DirectWrite and Fontconfig may later provide optional system font discovery. They are not required
  shaping, fallback, or raster authorities.
- Required color emoji forms are identified from the corpus and implemented with identical assets.
- Pin HarfBuzz and FreeType versions, source/native asset provenance, build options, license inputs,
  and per-RID hashes.
- Goo owns narrow G# NativeAOT bindings and native-handle lifetime. No Goo-owned C# text interop
  remains in core.
- ABI size, call, face lifetime, buffer lifetime, and shutdown behavior pass on both RIDs before text
  integration exits.

Text corpus:

- Primary Latin font.
- Fallback.
- CJK.
- RTL.
- Combining marks.
- Ligatures.
- Variable weight.
- Caret, selection, hit test, and IME geometry.
- Required color emoji forms.

Permanent verification:

- Extend the text region of T02.
- Retain existing tests that prove public text/editor behavior.
- Do not add one test per glyph, script, or font table.

Ephemeral probe:

- P05 load the fixed fonts on Windows and Linux and record face IDs, metrics, variations, glyph
  bitmap modes, raster dimensions, and color-glyph paths. Delete the probe afterward.

Logs:

- Font source and face key.
- Fallback decision and missing glyph.
- Shaping run and glyph count.
- Glyph atlas miss, upload, eviction, and byte total.
- Color glyph path.

Exit:

- T02 text and editor behavior passes on both platforms.
- Placement stays within 0.5 logical pixels.
- Required font and color emoji behavior is identical by policy and input.
- Pinned native assets, G# bindings, NativeAOT calls, and handle lifetime pass on both RIDs.

Reopen when:

- A required font format cannot be reconstructed without a new optional parser or dependency.

### S12. Replace image ownership with decoded pixels and providers

Required specification:

- `ImageSourceProvider` remains the public boundary.
- Goo core owns immutable premultiplied RGBA pixels, intrinsic size, async completion, invalidation,
  fit, sampling, lazy GPU upload, and byte-bounded caching.
- Decoding stays off the UI thread.
- Raster file decoders are optional providers or packages.
- Applications own allowed formats, hostile-input limits, and attachment policy.
- No Skia image object remains in the core image lifetime.
- Cache identity includes provider content version and sampling-relevant data.
- Vulkan images retire only after fence completion.

Permanent verification:

- Extend T02 with one decoded provider image and sampling cases.
- Fold async completion, invalidation, eviction, and close/reopen into T04.
- Keep backend-neutral public image lifecycle tests.
- Do not add one test per codec or image format.

Logs:

- Provider ID, content version, decode completion, pixel bytes, upload bytes, residency, cache bytes,
  eviction, and invalidation.

Exit:

- Provider image behavior is correct on both platforms.
- Decode and upload do not block the UI thread.
- Cache and GPU memory plateau.

Reopen when:

- A required core behavior depends on a specific file codec. Return codec ownership to Q4 Q&A.

### S13. Reopen O03, implement arbitrary paths, then compile SVG assets

Entry:

- Analytic primitives and prebuilt path meshes already work.
- Arbitrary paths are now the actual blocker.

Mandatory decision step:

1. Reopen O03 with measured requirements and candidates.
2. Compare only candidates that meet the current path contract and target performance.
3. Record the accepted path implementation before adding its dependency or code.

Required path contract:

- Line, quadratic, cubic, and arc flattening.
- Fill rules.
- Stroke expansion.
- Caps, joins, miter limits, dashes, and required corner effects.
- Boolean operations and offset/inset behavior where current Goo behavior requires them.
- Path clips.
- CPU hit testing from the same retained geometry source.
- Stable mesh IDs and conservative bounds.
- No geometry generation during submission or paint.
- Explicit mesh byte budgets and fence-safe retirement.

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

- P06 only if candidate documentation and logs cannot answer a path correctness or performance
  question. Delete it after O03 evidence is recorded.

Exit:

- O03 is accepted.
- Required path, hit-test, clip, and compiled SVG behavior passes T02 and T03.

Reopen when:

- The selected implementation misses a required operation or violates frame, memory, allocation, or
  binary gates.

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

- Sparse large-table and topology P95 improve by at least 20 percent over frozen Skia.
- Pixels remain correct when optional incremental-present hints are ignored.
- No total-frame, present, memory, hitch, or power-proxy regression exceeds Q10 noise.

Reopen when:

- The retained model loses on total frame, hitches, memory, or power proxy after reasonable coalescing
  and dependency optimization. Return evidence to O07 Q&A.

### S16. Implement shared-device multi-window scheduling and bounded recovery

Required ownership:

- One process instance, physical device, logical device, allocator, queue set, pipelines, shaders,
  samplers, atlases, and shared resources.
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
- Three-window sparse-change P95 is at least 20 percent faster than the matching frozen Skia
  baseline, with no total-frame, memory, hitch, present, or power-proxy regression beyond Q10.

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

### S18. Perform the atomic Goo production cutover

Entry:

- S08 through S16 proof components pass T02, T03, and T04.
- S17 required core mechanisms and platform adapters pass their exit gates.
- O03 and O16 are accepted.
- No required renderer behavior still depends on Skia.
- T02 through T04 and every applicable Q10 workload have been rerun after S17. Pre-S17 evidence does
  not satisfy this entry gate.
- Every Q10 gate measurable in the non-shipping proof passes on both platforms. Final product
  dependency, package, NativeAOT size, and product-source gates remain for this cutover and S19.

Atomic work:

1. Integrate the typed scene compiler and Vulkan runtime into Goo.
2. Replace `Painter.PaintTo(SKCanvas)` and the `SdlRenderTarget` product path.
3. Remove all production `SK*` integration.
4. Remove SkiaSharp, SkiaSharp.HarfBuzz, native Skia assets, and Ganesh/OpenGL targets.
5. Remove the Wayland shared-memory raster target and raster conversion.
6. Remove `WindowRenderer`, `Window.Renderer`, and raster-only verification as approved by Q5.
7. Move every still-required `Goo.InternalTextInterop` responsibility to the proven G# runtime
   implementation, then delete the C# helper project and assembly.
8. Remove obsolete Skia-internal tests instead of porting them one-for-one.
9. Wire Vulkan offscreen readback into the backend-neutral visual corpus.
10. Update official package contents, dependency metadata, API baseline, XML documentation, and
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
- Search Goo core and Goo-owned runtime-helper source for authored C#.
- Verify mandatory native-library count does not increase.

Exit:

- Direct Vulkan is Goo's only product renderer.
- Skia, OpenGL Ganesh, CPU raster, and Goo-owned C# runtime code are absent.
- All focused tests and package checks pass.

Reopen when:

- Any behavior requires a fallback, any package contains Skia, or any target platform fails.

### S19. Qualify Windows/Linux packages and establish the next baseline

Qualification matrix:

- Windows x64 integrated GPU.
- Windows x64 discrete GPU.
- Linux Wayland x64 integrated GPU.
- Linux Wayland x64 discrete GPU.
- Software Vulkan only for deterministic CI and headless capture. Software-ICD results cannot satisfy
  Q10 hardware gates, become an accepted Q10 baseline, or replace any hardware result.

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
- SDL, HarfBuzz, FreeType, Vulkan loader usage, shaders, and selected optional codec contents are
  explicit.
- Generator, shader compiler, probes, validation layers, software ICD, and unused SDL binding surface
  do not ship.
- License and third-party notices match actual contents.

Exit:

- Every final acceptance gate in section 12 passes independently.
- Raw manifests and artifact hashes are stored.
- The accepted Vulkan result points to its parent baseline and becomes the next regression baseline.
- The immutable Skia floor remains unchanged.

## 7. Minimal durable verification system

Only these durable verification targets may be added or expanded for this renderer program.

| ID | Durable target | Required behavior |
|---|---|---|
| T01 | Clean G# package consumer | Freshly packed Goo, `Cell.Mount`, cross-assembly generic `ShouldRebuild`, restore, compile, NativeAOT, open, pump, close |
| T02 | One visual and async readback corpus | Boxes, borders, gradients, text, fallback, CJK, RTL, emoji, images, paths, clips, transforms, opacity, blend, effects, DPI, SVG |
| T03 | One reference hot-path harness | Idle, animation, sparse table, topology, text editing, images/effects, resize, three windows, stage and resource metrics |
| T04 | One lifecycle and recovery program per platform | Pre-cutover three-window action baseline, then final 1,000 operations, 10 surface losses, 3 device losses, input, protected text, accessibility traversal, plateau, validation |
| T05 | One package and NativeAOT report per RID | Frozen Skia baseline contents, then final dependencies, native libraries, installed bytes, startup, Skia absence, and Goo core/runtime-helper C# source absence |

T02 capture contract:

- Each case pins logical size, pixel width and height, DPI, font/input hashes, color space, and expected
  origin.
- Readback is tightly defined row-major, top-left-origin, premultiplied RGBA8. Row stride is recorded.
- The manifest records whether channel bytes are sRGB encoded and the exact Vulkan target format and
  conversion path.
- Strict regions and AA/effect regions use explicit masks generated from the scene contract. Masks
  are reviewed, pinned, and content-hashed before the Skia reference is frozen.
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
| P05 | Do fixed HarfBuzz and FreeType inputs produce the required matching font facts? |
| P06 | Which O03 path candidate meets an observed blocker when existing evidence is insufficient? |

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

1. Reject mismatched provenance or environment.
2. Check restore, compile, package contents, RID, NativeAOT, and dependencies.
3. Check validation, result codes, synchronization, generations, and retirement.
4. Classify pixel differences as geometry, text, color, AA/effect, or nondeterminism.
5. Check window ownership, damage history, and stale swapchain state.
6. Check managed, native, and GPU allocation and cache plateau.
7. Use stage times and GPU timestamps to locate performance regressions.
8. Re-run the same isolated workload under the same manifest.
9. Use one ephemeral probe only if logs and the E2E corpus cannot answer the remaining question.

## 10. Baseline and artifact schema

Every benchmark result must include:

- `baselineId`.
- `baselineKey` containing OS/RID, GPU/driver/implementation, workload, metric, and protocol.
- `parentBaselineId` for Vulkan results.
- Backend and renderer revision.
- Platform and hardware provenance.
- Workload ID and revision.
- Protocol version.
- Metric schema version.
- Pass/fail result for every Q10 gate.
- Raw result artifact paths and SHA-256 hashes.
- Visual reference, capture, mask, and diff hashes.
- Package inventory and hashes.
- Manifest hash and every source/configuration input hash.
- Validation error count.
- Notes for intentional present wait and first-use separation.

Selection rules:

- Pick the newest complete qualifying Skia result per workload and metric.
- Capture only missing facts before cutover.
- Never pick an older or slower result to lower the floor.
- Compare each Vulkan result only to the immutable Skia floor and immediate accepted Vulkan parent
  with the same complete baseline key.
- A Vulkan result can match its parent within Q10 noise.
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
| B00B | Historical finding matrix | Isolated migration and fresh-package consumer | Requirements/workload manifest | S02-S03 pass before baseline capture starts |
| B00C | Windows Skia capture | Linux Skia capture | Manifest/parser verifier | S04 immutable qualifying baselines pass |
| B01A | Vulkan capability census | Shader compiler/SPIR-V provenance | Trace and evidence schema | S05 manifests and schemas are locked |
| B01B | Vulkan registry generator | SDL loader bootstrap and surface probe | Generated-output drift verifier | S06 generated ABI and loader pass |
| B01C | Runtime diagnostics implementation | Five-run baseline ingestion/parser | Validation and fatal-snapshot path | S07 consumes S06 IDs and passes disabled-allocation gate |
| B02 | Allocator and resource model | Offscreen target and one-window WSI | Shader sources, SPIR-V, and manifest | Clear and quad proof is validation-clean |
| B03A | Typed frame-plan layout | Read-only semantic-digest fixture | Read-only counting/benchmark fixture | Frame-plan layout and IDs are locked |
| B03B | Scene compiler | Basic pipeline recorder | T02/T03 harness integration | S09 basic slice and zero-allocation gate pass |
| B04A | Resource/cache implementation | Read-only lifetime and budget audit | Rehydration/plateau harness | S10 resource IDs and lifetime are locked before consumers start |
| B04B | HarfBuzz and FreeType service | Image provider and decoded-pixel lifetime | Text/image parity corpus | S11-S12 consume the locked resource contract |
| B05A | Accepted O03 path implementation | Path hit-test and clip integration | Path mesh benchmark and visual fixture | S13 path contract passes before SVG integration starts |
| B05B | Compiled SVG asset tool/runtime | Compositing and effects | Async readback and AA-independent T02 fixture | Effects/readback pass and the AA comparison corpus is ready |
| B06A | AA candidate lane 1 | AA candidate lane 2 | AA comparison harness | O16 is accepted, comparison-only paths are deleted, and final T02 passes |
| B06B | Retained segment/damage implementation | Sparse workload measurement | Damage-journal lifecycle scenarios | S15 single-window sparse gates pass |
| B06C | Multi-window scheduler | Recovery-injection harness | WSI/resource lifetime audit | S16 three-window and recovery gates pass |
| B07 | Protected text mechanism | UIA and AT-SPI adapters | Public-composition and remaining-core-gap proof | S17 contains only required non-composable mechanisms |
| B08A | Read-only Skia deletion inventory | Read-only API migration inventory | Read-only final package manifest | Lead performs S18 atomic integration once |
| B08B | Windows hardware qualification | Linux hardware qualification | RID package/dependency/source audit | S19 passes after the atomic cutover |

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
| Sparse workloads | Table, topology, and three-window sparse P95 are at least 20 percent faster than frozen Skia |
| Absolute frame budget | P95 is at most 8.33 ms and P99 is at most 16.67 ms, excluding intentional present wait |
| Input | P95 input-to-present is at most two refresh intervals plus 4 ms and does not regress |
| Startup | P95 first usable frame does not regress beyond noise |
| Memory | Managed heap, private dirty memory, RSS, and Goo-reserved GPU memory each stay within 5 percent |
| Binary | Each Windows and Linux NativeAOT output is at least 8 MiB smaller than frozen Skia |
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

- O03 needs a path dependency or technique selection.
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
baseline.
