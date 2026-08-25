# Goo Gaps and Reductions Roadmap

Audit date: 2026-08-16

Branch: `gaps-and-reductions`

Scope: Goo core G# 0.4.1 adoption, Windows and Linux support, render architecture, runtime resource
use, package size, and source reduction. Hivemind and Uproar95 appear only as external requirements,
workload, and behavior evidence. Consumer application implementation is out of scope. This is
supporting research. `PLAN-FOR-REVIEW.md` remains authoritative.

The final Goo core and Goo-owned runtime helpers are G# only. During the non-shipping Vulkan proof,
`Goo.InternalTextInterop` remains intact as part of the verified Skia baseline. C# remains allowed
in tests, benchmarks, development tools, external packages, and large vendored dependencies such as
Yoga.Net.

## Decision summary

1. Pin the official `Gsharp.NET.Sdk/0.4.1` release before changing Goo architecture.
2. Keep the public declarative G# API and Yoga layout model.
3. Vulkan is the final GPU path. Build a Goo-owned typed scene and a purpose-built Vulkan renderer
   for Windows and Linux. Do not spend the migration on a Ganesh Vulkan bridge that is removed with
   Skia.
4. Keep Vulkan work in a non-shipping proof until it passes the complete gates. The first product
   Vulkan integration removes Skia, OpenGL, and CPU raster atomically. No live oracle, hybrid, or
   fallback ships.
5. Do not retry the rejected Ganesh damage-clipped repaint. A later direct Vulkan retained-backing
   experiment is a different mechanism and needs its own total-frame and memory proof.
6. Use Hivemind-scale traces to test Goo core invalidation and virtualization mechanisms. Do not
   modify Hivemind or implement consumer controls in this work.
7. Add Windows x64 packaging and a real Windows runtime proof. Current Goo packaging is Linux-only.
8. Port only the useful parts of Uproar95. Its multi-window, password, font, and scroll work is
   evidence, not merge-ready code.
9. Reduce binary size first by replacing the 2.5 MB general SDL binding with a narrow internal
   binding for the 75 SDL members Goo uses.
10. Start the direct Vulkan device, swapchain, and typed-scene proof independently of consumer
    applications. Compare it against frozen reference workloads before the atomic product cutover.
11. Keep DataGrid, TreeView, charts, markdown, schedule, dialogs, and Hivemind domain controls out
    of Goo core. They are G# component-library or application code.

## Non-negotiable contract

| Area | Required result |
|---|---|
| Public UI model | Declarative G# with `Cell.Build() Blob`, local rebuilds, keyed composition, and simple constructors |
| Layout | Yoga flexbox, including wrapping, percentage sizing, min and max constraints, overflow, and absolute placement |
| Platforms | Windows x64 and Linux x64. macOS is out of scope |
| Rendering | Same or better visual quality than current Hivemind at supported DPI scales |
| Idle behavior | No rebuild, layout, paint, flush, swap, or steady allocation without demand |
| Large data | Mounted UI is bounded by viewport plus overscan, not total item count |
| Distribution | RID-specific assets and the existing 20 MiB installed-size cap per official Goo application RID |
| Compatibility | Backend experiments make no public G# or Yoga API change |
| Tests | Minimal end-to-end behavior and hot-path gates only |

## Source inventory

| Source | Evidence used |
|---|---|
| G# release | Official `v0.4.1` at `d670ac98c03e0b0f7c9ac965f5fa3914712f09de`; NuGet package SHA-256 `fa379d5d68c2286afaee2d429dfad4585cfa25fe8495916cb7d5b41837099e63` |
| G# compiler probes | The last temporary run used development SDK `0.4.7-gbf2602b6e7`; rerun all findings against official 0.4.1 before changing workarounds |
| Current Goo | Cell, Reconciler, Resolver, Yoga layout, Painter, text and image caches, SDL host, GPU and raster targets, packaging |
| Goo performance history | Release baselines, StocksGrid profiles, retained-memory probes, release-size probes, and the rejected partial-repaint experiment |
| Hivemind | 45 Avalonia surfaces, 3 windows, 22 dialogs, 2 custom-drawn controls, current C# Goo port, and 129 target contracts |
| Uproar95 | Aggregate window pump, application window registry, password entry, packaged fonts, and scroll-range fork changes |
| Renderer research | Official Skia, SDL3, Vulkan, and Wayland documentation, local SkiaSharp binary inspection, and current Zed GPUI source at `b2d9c2e122fbc408d42276b4456243ba4f90f181` |

## Consumer scope

| Consumer class | Included scope and constraint |
|---|---|
| Current repository | `Goo`, package smoke, focused contracts and behavior, probes, tools, and vendored Yoga |
| Excluded compile input | None |
| Exact external project references | `../goo-projects` applications, components, benchmarks, probes, tests, and tools plus `../psone-research/gootools/OddTool` |
| Exact package consumer | `../gex`, currently pinned to NuGet `Goo` 0.2.0 |
| External reference evidence | `../Hivemind-Goo` and `../uproar95`. Use them only for requirements, workloads, behavior, and API reachability evidence. Do not modify them |
| Locked compatibility surface | `tests/Goo.ApiContractTests/PublicApi.approved.txt` |
| Known renderer selection | `../goo-projects/apps/Goo.Workbench` explicitly selects `WindowRenderer.Raster` |
| Unknown consumers | Any package or source consumer not present on this machine. No public API removal is allowed until its reachability is established |

The renderer migration changes internal scene and target contracts. It keeps the public Blob, Cell,
style, Yoga, and `WindowRenderer` surfaces stable. External consumer risk is therefore concentrated
in behavior, packaging, and visual parity rather than source compatibility.

The Hivemind component source of truth remains:

- `../Hivemind-Goo/Docs/UI_COMPONENT_INVENTORY.md`
- `../Hivemind-Goo/Docs/AVALONIA_GOO_GAP_ANALYSIS.md`

That inventory contains 14 foundations, 72 reusable primitives, and 43 Hivemind composites. The
129 contracts are adoption scope. They are not 129 Goo core types.

## Current architecture

```text
G# Blob and Cell declarations
  -> dirty Cell queue
  -> retained Fiber and Node reconciliation
  -> Resolver style effects
  -> Yoga retained layout
  -> binary visual-dirty decision
  -> full canvas clear
  -> retained tree Painter traversal
  -> Skia Ganesh OpenGL flush
  -> SDL swap
```

The common description that Goo repaints continuously is wrong. `Window.Pump` blocks in SDL event
waiting when there is no demand. Bare pointer moves can remain visually quiet. Idle scheduling is
already close to the desired design.

The actual cost is narrower. Once any visual change is accepted, `PaintTo` clears the surface and
Painter traverses the retained tree. The presentation surface is then swapped. Reconciliation and
Yoga already retain state and can skip work, but visual invalidation has category provenance rather
than spatial or retained-paint provenance.

## G# 0.4 adoption

### Locked release

The migration pins official `Gsharp.NET.Sdk/0.4.1` from NuGet.org. Release tag `v0.4.1` resolves to
commit `d670ac98c03e0b0f7c9ac965f5fa3914712f09de`. The package SHA-256 is
`fa379d5d68c2286afaee2d429dfad4585cfa25fe8495916cb7d5b41837099e63`.

The clean-clone gate must restore those exact package bytes without `artifacts/packages`, another
local feed, or the nested G# checkout. Do not silently fall back to another 0.4 build.

### Required source changes already present

The candidate working state touched 22 tracked files at audit entry, currently `+201/-153`. It
includes the compatibility migration and the quality and allocation corrections needed to preserve
the existing gates:

- The official 0.4.1 SDK pin and removal of the local package source.
- Explicit handling for nullable `as` results.
- Partial-file import cleanup now that member provenance is fixed.
- Interop and generic binding adjustments required by current 0.4 semantics.
- Package and native smoke verification notes.

These changes must land as an isolated compiler-adoption change before Vulkan or other Goo core work.
Keep its public API diff at zero except for corrections already required by 0.4 semantics.

### Compiler change groups

| G# 0.4 group | Representative commits | Goo action |
|---|---|---|
| Cross-assembly package imports | `616ee28df` | No API migration. Package functions are usable, but moving stable Goo entry points provides no measured benefit |
| Imported generic substitution | `2b17654a5`, `f2d146e38`, `c57497596`, `b79dd1f2d` | Remove only proven compiler workarounds. Do not redesign callback APIs without a separate benchmark and API review |
| Partial member provenance | `47259d0c1`, `c142afc82`, `049bebf06`, `283efefa6` | Remove duplicate cross-part imports and qualifications that exist only for the old bug |
| XML documentation | `f53f19420`, `90897cff5`, `dc5da3660`, `36146f86e` | Keep Goo's post-compile XML copy target. Content generation is fixed, output copying is not |
| Imported abstract slots | `59e37b6c1`, `660cf7f69`, `11f50948f`, `ded8607b5`, `b9af7136f` | Use ordinary abstract contracts where already designed. No Goo API addition is required |
| Indexed struct addressability | `215f399e3` | Indexed array and slice struct member writes are supported. Map values and non-addressable rvalues remain restricted |
| Maps, zero values, and boxing | `e13adb743`, `67f953ac2`, `78bf6f69a`, `6e1e70703` | Audited with no current Goo source migration. Keep the existing explicit ownership and initialization model |
| Nullable safe casts | `f8b4487ac`, `342db3e6e`, `1815377d4`, `565e8eb05`, `92b0b773a` | Treat every `as` as nullable and use flow binding or explicit assertion |
| Block and pattern syntax | `4df04835a`, `3188af4d6`, `6a8f14b92` | Optional source reduction after the compatibility change lands. No runtime claim without measurement |
| Rectangular arrays | `04ef27b66` | No current Goo need |
| Extension receivers | `170f853c0` | Optional cleanup only where it makes ownership clearer |
| Named arguments | `8eea48f0f` | Use the current colon syntax and remove retired equals syntax if any remains |
| Hot reload | Several development commits | Developer-only. No runtime, package, or Hivemind adoption dependency |
| Compiler self-migration | Several compiler-internal commits | No Goo runtime impact |

### All compiler findings

| # | Finding | Result on 0.4 | Goo consequence |
|---:|---|---|---|
| 01 | Nested struct member write emitted invalid IL | Pass, fixed before 0.3.633 | Addressable field writes are safe. Retain restrictions for map values and other non-addressable rvalues |
| 02 | Range-loop closure reused one slot | Pass, fixed before 0.3.633 | Normal per-iteration capture is safe |
| 03 | Top-level range capture crashed the compiler | Pass, fixed before 0.3.633 | No Goo architecture change |
| 04 | Inline valueless return failed parsing | Pass, fixed before 0.3.633 | Optional syntax cleanup only |
| 05 | Interpolation ternary collided with format syntax | Pass, fixed before 0.3.633 | Parentheses used only for this bug may be removed during style cleanup |
| 06 | Cross-assembly explicit generic lambda failed | Pass, fixed before 0.3.633 | Public generic component APIs can be consumed across the package boundary. Keep delegate-shape limits explicit |
| 07 | Constructor accessibility was ignored | Pass, fixed before 0.3.633 | Internal constructors stay out of the public CLR surface |
| 08 | Captured generic lambda emitted invalid IL | Runtime bug fixed before 0.3.633. Probe source now fails because `as` is nullable | Update the probe to flow-bind the cast. Current Goo migration already follows the new cast rule |
| 09 | Generic inherited field used the wrong owner | Pass, fixed before 0.3.633 | Remove any residual field-owner workaround only after a focused package smoke |
| 10 | Struct `Object` override was rejected | Pass, fixed before 0.3.633 | Value types may use intended overrides. Remove the stale `VectorPath` limitation comment |
| 11 | Imported data-struct equality crashed | Pass, fixed before 0.3.633 | Keep manual `GradientStop` comparison. Compiler correctness did not fix its measured allocation cost |
| 12 | Referenced package functions were invisible | Pass, fixed in the 0.4 delta | Do not move `Cell.Mount` or stable public classes to package functions for style alone |
| 13 | `Action[T]` with a G# struct bound as object | Pass, fixed before 0.3.633 | Keep native G# function callbacks where they are already simpler and allocation-safe |
| 14 | Imported generic overrides failed substitution | Pass, fixed in the 0.4 delta | Do not replace `MotionConverter[T]` callbacks with an abstract hierarchy without a breaking-change case and benchmark |
| 15 | Explicit type arguments plus lambda failed across assemblies | Pass, fixed before 0.3.633 | `Cell.Mount` and `MountSeeded` remain viable package APIs |
| 16 | Partial fields bound through the wrong file imports | Pass, fixed in the 0.4.1 delta | Remove the cross-part interop qualification workaround |
| 17 | Enum and interface XML docs and delegate DocIDs were wrong | Pass for content, fixed in the 0.4 delta | Keep `_PopulateGooDocFileItems` because a clean 0.4 probe still leaves the XML file only under `obj` |
| 18 | Inaccessible imported abstract slots were not enforced | Expected build failure with `GS0387` and `GS0386`, fixed in the 0.4 delta | Bad subclasses now fail at compile time instead of load time |

The official 0.4.1 matrix did not add a test suite to Goo. Findings 01 through 07 and 09 through 17
built and ran successfully. Finding 08 needed only its new nullable-cast syntax. Finding 18 failed
to build as intended. Most historical findings were already fixed at 0.3.633. The newly relevant
0.4 closures are findings 12, 14, and 16 through 18 plus the nullable `as` language change. Exact
digests and dispositions are recorded in `docs/audits/2026-08-16-gsharp-0.4.1-findings.md`.

The repository's nested G# checkout was dirty and 82 commits behind during this audit. It was not
modified. Commit comparison used a separate clean temporary clone containing both endpoints.

### Workaround disposition

| Existing pattern | Decision |
|---|---|
| Fully qualified `Goo.InternalTextInterop.*` names across Window partials | Remove. Per-part imports now bind correctly |
| Explicit nullable flow in Layout, TextDocument, TextEditorController, and Reconciler | Keep. This is required 0.4 semantics, not a workaround |
| Array clone followed by `as []T` | Keep the new explicit copy helpers until clone-cast emit and allocation are measured |
| `_PopulateGooDocFileItems` | Keep now. Remove only if a future clean pack without it still includes `Goo.xml` |
| `Cell.wrapAction`, `MotionConverter`, and generic `Anim` closures | Keep. The compiler fixes do not remove their semantic role |
| `VectorPathData` reference payload | Keep. Style payload and geometry cache identity depend on it |
| `VectorPath` comment claiming structs cannot override CLR virtuals | Remove as stale documentation |

### 0.4 cleanup gate

- Land the isolated 0.4 migration.
- Restore from a clean machine without an untracked local feed.
- Build Release and package with warnings as errors.
- Build one external package consumer that uses `Cell.Mount` and imported generic `ShouldRebuild`
  behavior across the assembly boundary.
- Run the native open, pump, close smoke.
- Build split partial sources without duplicated imports.
- Compare public API and XML docs.
- Do not import the 18 compiler repros into the normal Goo suite.

## Hivemind architecture correction

### Coarse invalidation in the current port

The current Hivemind C# Goo layer invalidates at the root:

- `Views/Goo/VmRebuild.cs` calls the root rebuild for watched property and collection events.
- `MainWindow.cs` attaches that behavior across most pages and collections.
- `MainWindow.Build()` recreates the full visual intent tree.
- `DataGrid.cs` filters, sorts, and materializes full sources.
- Command and Playbook stream subscriptions still route back to a root rebuild.

Do not preserve this architecture in G#. The correct application structure is:

```text
stable application Cell
  -> page Cells
     -> section Cells
        -> virtual viewport
           -> stable keyed row Cells
```

Each adapter owns its subscription, batches source changes, and rebuilds only the smallest Cell that
can express the new state. Selection, focus, and scroll anchors live outside recyclable row Cells.
Use explicit Cell factories for NativeAOT instead of `Activator.CreateInstance` fallback paths.

### Required structural components

| Component | Required behavior | Core or app |
|---|---|---|
| VM adapter | Typed subscriptions, coalesced changes, cancellation, stale-result suppression | Hivemind app |
| Virtual list | Visible items plus overscan, stable keys, anchor preservation, variable or fixed rows | Hivemind component package first |
| Virtual grid | Row and column viewport, resize, reorder, selection, sort, filter, context actions, lazy details | Hivemind component package |
| Virtual tree | Flattened visible hierarchy, expand state, tri-state selection, keyboard navigation | Hivemind component package |
| Virtual rich output | Logs, chat, history, findings, answer files, command and playbook output, diffs | Hivemind component package |
| Topology scene | Versioned geometry, spatial hit index, viewport culling, cached draw data, no paint-time allocation | Hivemind app |
| Aggregate window scheduler | One SDL event wait or poll for all windows, fair dispatch, correct cursor ownership | Goo core |
| Password entry | Masked geometry, copy and cut policy, IME, selection, accessibility redaction | Goo core |
| Packaged fonts | Deterministic family and weight selection with lifetime ownership | Goo core |
| Desktop adapters | File, folder and save dialogs plus browser, file, folder, RDP, and UNC launch | Hivemind platform layer |

### Topology hot path

Topology is the highest-risk custom surface. Its current implementation builds dictionaries, lists,
paths, fonts, and hull geometry during paint, scans all graph objects, and uses linear hit testing.

The replacement must:

1. Run graph layout outside paint.
2. Cache geometry by graph, theme, scale, and layout revision.
3. Keep an R-tree, quadtree, grid, or equivalent spatial hit index.
4. Cull nodes, edges, hulls, and labels by viewport.
5. Store immutable draw data or recorded commands.
6. Allocate nothing on pointer movement or steady repaint after warm-up.
7. Provide a keyboard and accessibility list alternative.

## Windows and multi-window gap

### P0 required

| Gap | Current state | Required change |
|---|---|---|
| Windows native assets | Goo references Linux Skia and HarfBuzz assets and packs only Linux SDL | Add RID-specific Windows x64 Skia, HarfBuzz, and SDL assets with package validation |
| Windows runtime proof | No supported Windows build or packaged startup exists | Run a real packaged Windows x64 open, input, resize, DPI, close, reopen smoke |
| Three-window scheduling | `Pump` is per window and can block on the process-wide SDL queue | Add one aggregate pump with one wait or poll and fair per-window work |
| Cursor ownership | SDL cursor state is process-global | Only the focused or pointer-owning window may publish cursor state |
| Multiple VSync swaps | Sequential windows may each block during present | Measure and prevent multi-window serial VSync stalls or unbounded frame latency |
| Secret input | Canonical Goo has no password mode | Add secure presentation and clipboard behavior, then verify the real credential flow |
| Packaged Inter | Canonical Goo relies on installed fonts | Register packaged font bytes with correct family, weight, fallback, and disposal |
| Native dialogs | No file, folder, or save picker API | Add a Hivemind Windows adapter, not a Goo widget API |

### P1 required for full product quality

- Native focus or raise for reused Command and Playbook windows.
- Windows UI Automation adapter over Goo's neutral accessibility tree.
- Public scroll range with the first real draggable scrollbar consumer.
- Modal focus trap and restoration in the Hivemind overlay system.
- Rich clipboard for Chat file and image payloads.
- Focus stability through list recycling and collection updates.

### Not required for cutover

- Native owner and owned-window policy for ordinary dialogs.
- Native modal dialogs for application forms.
- Persisted window geometry.
- External operating-system file drag and drop.
- Native taskbar polish, custom icons, and full monitor APIs.
- macOS packaging.

Normal Hivemind forms remain Goo overlays. Only Main, Command, and Playbook require native windows.

### Uproar95 quality assessment

| Uproar95 work | What is good | What is not ready |
|---|---|---|
| `Window.PumpAll` | Correctly recognizes one SDL process queue and performs one bounded wait or poll | It still presents windows serially, has no performance proof, and lets each pumped window overwrite the process-global cursor |
| Window registry | Stable keys, generation checks, deterministic close tracking, and app-owned lifetime are sound | Reopening an existing window has only semantic focus intent. There is no native raise or activate |
| Password mode | Blocks copy, redacts accessibility value, and reuses text-entry editing | It masks by UTF-16 `String.Length`, not text elements. It needs grapheme, IME, selection, clipboard, and credential E2E review |
| `FontSource` | Clear registration lifetime and collision detection | One family maps to one typeface and ignores requested weight and italic style. Inter weight selection is not proven |
| `ScrollRange` | A real conversation consumer proves the need and basic contract | Merge it only with the first Hivemind interactive scrollbar and verify recycling and disposal |

Do not copy the Uproar95 Goo fork wholesale. It predates current raster and reduction work and would
reintroduce old code. Port narrow changes onto current Goo and verify each through a real consumer.

## Rendering architecture

### What previous measurements prove

The 4,900-cell StocksGrid baseline attributed about 39.66 ms of a 46.31 ms frame to rendering and
about 6.64 ms to tree work. Swap was about 0.13 ms. At that point paint allocated about 1.605 MB per
frame and reconciliation about 664 KB per frame.

A later componentized active-frame baseline reached about 437.85 microseconds compared with
1,200.06 microseconds for a monolithic rebuild. This validates local Cell boundaries.

The August 4 damage experiment is decisive for the current Ganesh path:

| StocksGrid 10 percent mutation | Full paint | Damage candidate |
|---|---:|---:|
| Damaged area | 100 percent | 12.3 percent |
| Paint | 15.100 ms | 11.387 ms |
| Ganesh flush | 0.337 ms | 4.228 ms |
| Swap | 0.115 ms | 0.092 ms |
| Total | 22.095 ms | 22.672 ms |
| Allocation | 1,157,394 B/frame | 950,116 B/frame |

Per-rectangle paint reached 158 ms per frame. Complex clip boundaries also caused one-byte GPU
antialiasing differences. The implementation was fully reverted. Do not use reduced paint time to
claim success when flush and total time regress.

### Recommended target

Keep full-surface correctness and full-frame presentation. Reduce the work required to construct
that frame:

```text
local Cell invalidation
  -> retained reconciliation and Yoga
  -> versioned Goo scene chunks
  -> typed quad, shadow, path, glyph, image, and layer primitives
  -> overlap-safe batching and bounded GPU resource caches
  -> direct Vulkan full-frame replay and present
```

The current Skia renderer supplies frozen visual, performance, memory, and package evidence before
the proof begins. The Vulkan proof is independent and non-shipping. It consumes the same
deterministic workloads but does not become a selectable Goo backend or call Skia as an oracle or
fallback. The public Blob, Cell, style, and Yoga APIs do not expose either backend.

Priority order:

1. App-local Cells and batched source changes.
2. Structural virtualization.
3. Topology geometry and hit-index retention.
4. Introduce the backend-neutral typed scene in the non-shipping Vulkan proof.
5. Move shaping, glyph rasterization, image decode, path tessellation, and effect preparation out of
   frame submission.
6. Replay clean Cell or view scene ranges instead of repainting their Node subtrees.
7. Add the direct Vulkan backend and analytic common-primitive pipelines.
8. Add fair per-window scheduling and hidden or minimized window throttling.
9. Reach complete required feature coverage in the proof and delete Skia during the atomic product
   cutover only after the removal gate passes.

Scene reuse should attach to stable Cell or view boundaries, not every Node. A broad Node sidecar or
cache field is not justified. Existing storage probes measured ConditionalWeakTable lookup at about
17.8 times direct field access and failed the performance gate for a general Node split.

### Retained-paint experiments

| Experiment | Expected value | Main cost | Gate |
|---|---|---|---|
| Typed flat scene | Replace native wrapper churn and backend-specific paint calls with plain primitive records | New scene compiler | Lower total CPU and allocation with exact Skia output |
| Cell or view scene-range replay | Avoid repeated subtree paint derivation | Cache-key and order maintenance | Clean component work proportional to copied or referenced scene data |
| Persistent scene chunks | Avoid copying clean ranges and re-uploading unchanged instance data | More GPU buffer and lifetime complexity | Win over range replay on real table and topology scenes |
| Bounded cached layer | Avoid repeated expensive group opacity, blend, or path-shadow work | Texture memory and backdrop correctness | Explicit byte budget, dependency tracking, and total-frame proof |
| Overlap-aware batching | Reorder disjoint primitives by pipeline without changing visible order | Conservative bounds and layer barriers | Fewer pipeline and texture binds with exact pixels |
| Direct Vulkan retained backing | Shade only spatial damage, then copy or composite to the swapchain | Backing memory, effect expansion, and per-image history | Later experiment only after full-frame direct Vulkan is stable |

Do not cache every node. Prefer Cell or explicitly detected expensive-subtree boundaries and evict by
actual bytes, not entry count.

### Damage-repaint revisit gate

No implementation work may start without a new mechanism and evidence that addresses the rejected
failure. A valid revisit requires:

- At least three Release processes per variant with the same workload and runtime settings.
- P50 and P95 total-frame improvement, not paint-only improvement.
- No P95 flush or present regression.
- Equal or lower allocation and retained RSS.
- Exact pixels or an explicitly approved visual threshold.
- Windows and Linux driver coverage.
- Clips, transforms, shadows, opacity, text, and images.
- Full reporting of paint, canvas flush, target flush, present, and total.

`SKRegion` damage clips, per-rectangle Skia paint, FBO partial repaint, and clipped Skia clears are
prohibited without this new evidence. A direct Vulkan retained-backing design is not approved by
the old failure, but it is not the same implementation and may be tested after the direct renderer
is complete.

## Renderer choice

| Backend | Role | Resource and size effect | Engineering burden | Decision |
|---|---|---|---|---|
| Skia Ganesh OpenGL | Current GPU baseline and visual oracle | Current 9 to 12 MB native Skia cost | Existing | Transition only |
| Skia raster | Diagnostics and temporary unsupported-feature tile fallback | Keeps native Skia while present | Existing | Transition only |
| Skia Ganesh Vulkan | Short-lived bridge with missing external sync bindings | Keeps Skia and adds bridge work | High | Skip |
| Direct Vulkan 2D | Final Windows and Linux renderer | Removes Skia after replacement text, image, path, and effect work | Very high | Selected |
| SDL3 GPU | Portable GPU abstraction | Adds an abstraction while Vulkan is already fixed | High | Reject |
| Dawn or wgpu | Portable GPU abstraction | Large runtime and backend surface, with non-Vulkan Windows behavior | High | Reject |
| Wayland SHM raster | Linux diagnostics | About 20 bytes per pixel before other caches | Existing | Never Hivemind default |

### Decision on Skia

Skia is not part of the final renderer. Keep the existing product implementation unchanged only
long enough to provide:

- The current production backend while direct Vulkan is incomplete.
- Frozen pixel evidence for differential visual checks.
- The current diagnostic raster path until an approved replacement or removal exists.

Do not build the production Ganesh Vulkan bridge first. That path needs a SkiaSharp extension for
external semaphore wait and signal, present layout state, preferred Vulkan features, and device-loss
reporting. Direct Vulkan owns those responsibilities itself. Building both paths would pay for two
renderer migrations and then delete the first one.

The Vulkan proof has no Skia fallback path. Unsupported required behavior blocks cutover. Full Goo
Skia removal additionally requires either parity or an explicit breaking decision for every public
rendering feature. Silent visual degradation is not acceptable.

### What current GPUI proves

Current Zed GPUI does not use Skia. It owns a typed `Scene` with separate arrays for shadows, quads,
paths, underlines, monochrome glyph or icon sprites, subpixel glyph sprites, color image sprites, and
platform surfaces. A spatial bounds tree assigns the same draw order to non-overlapping primitives.
The renderer can then batch by primitive kind and texture without changing visible overlap order.

GPUI also caches clean view work. A cached view replays its previous prepaint state and scene
operation range into the next frame. This avoids rebuilding that view's element tree and paint
records.

It does not avoid full-target rendering. The current WGPU renderer acquires a surface texture,
clears the full attachment, writes the scene instance arrays, draws every batch, submits, and
presents. Windows does the equivalent through a custom D3D11 renderer. GPUI's performance model is
cheap scene construction, typed batching, atlases, virtualization, and demand-driven frames, not
spatial damage repaint.

Current backend choices are also not Goo's target:

- Linux creates WGPU with Vulkan and OpenGL enabled, preferring Vulkan class adapters.
- Windows uses a separate custom D3D11 renderer and DirectWrite text path.
- macOS uses a separate Metal renderer.
- Linux text uses Cosmic Text and Swash, while Windows and macOS own different platform text stacks.

GPUI also accepts costs Goo should close. Its current atlas grows 1024-pixel textures and frees tiles
only when their keys are explicitly removed. It has no global LRU byte budget. Arbitrary paths are
CPU-tessellated, rasterized into a cleared intermediate GPU target, then copied back into the main
pass. Its dependency set includes WGPU, Cosmic Text, Swash, Lyon, resvg, usvg, Taffy, and separate
platform stacks. The architecture is useful evidence, not a small dependency recipe.

Goo should copy the scene and batching architecture, not the three-backend maintenance shape or the
WGPU dependency.

### GPUI lessons to copy and rework

| Lesson | Goo disposition |
|---|---|
| Framework-owned typed scene between UI and GPU | Copy |
| Plain GPU-facing primitive records | Copy |
| Overlap-aware draw ordering for safe batching | Copy after exact-pixel proof |
| Separate monochrome, subpixel, and color atlases | Copy the split, add byte budgets and eviction |
| Clean view scene-range replay | Rework around Goo Cell and stable retained boundaries |
| Dirty scene construction separate from presentation demand | Copy |
| Shared GPU context and explicit device recovery | Copy |
| Full-target clear and replay on a dirty frame | Use first, then measure |
| Per-frame copying and upload of all scene arrays | Use only as the first simple implementation |
| Rectangular content masks only | Insufficient for Goo |
| Primitive opacity multiplication | Insufficient for CSS group opacity |
| Two-stop linear gradient model | Insufficient for Goo |
| WGPU on Linux and D3D11 on Windows | Reject |
| Mailbox-first presentation and sustained re-presentation after high-rate input | Do not copy by default |

### Goo-owned scene contract

The final boundary is a Goo scene, not `SKCanvas`:

```text
Blob and Cell declarations
  -> retained Fiber and Node reconciliation
  -> Yoga layout and resolved style effects
  -> SceneCompiler
       versioned SceneChunk records
       stable resource IDs
       conservative visual bounds
       clip, transform, and layer state
  -> ordered SceneFrame of chunk references
  -> VulkanRenderer
       dirty resource uploads
       overlap-safe batches
       full-frame render pass
       submit and present
```

The public declarative and Yoga APIs stay unchanged. No Skia, Vulkan, SDL, or GPU handle crosses the
public Goo API.

The minimum scene primitive set is:

| Primitive | Required data |
|---|---|
| Quad | Bounds, four radii, four border widths and colors, border style, solid or gradient brush |
| Shadow | Bounds or mask resource, radii, offset, spread, blur, color, inset flag |
| Glyph | Font face, glyph ID, position, atlas tile, text render mode, color |
| Image | Texture ID, source and destination, sampling, opacity, radii |
| Path | Stable tessellated mesh ID, fill rule, brush, stroke data, visual bounds |
| Underline | Bounds, thickness, color, straight or wavy mode |
| Layer begin and end | Bounds, group opacity, blend mode, offscreen target requirements |
| Clip begin and end | Rect, rounded rect, or path mask plus transform |
| Custom mesh | Bounded Hivemind topology and chart data with an explicit pipeline contract |

Scene records use value data and stable IDs. Native wrappers do not exist on the hot path. Textures,
glyphs, meshes, gradient stops, clip masks, and layer images live in a bounded resource registry.

A `SceneChunk` belongs to a stable Cell, view, or explicitly measured retained boundary. It has a
version, conservative bounds, ordered operations, and resource references. A clean boundary reuses
the prior chunk. A dirty boundary recompiles only its affected records. The first implementation may
copy clean ranges into a frame arena. The next gate is an ordered frame of chunk references with
persistent GPU ranges so unchanged records are neither rebuilt nor uploaded.

Do not attach a renderer sidecar to every Node. Use Cell or view identity and direct hot-path fields
only where measurements justify them.

### Goo gaps beyond GPUI

| Goo feature | Current Skia responsibility | Direct Vulkan requirement |
|---|---|---|
| Per-edge CSS borders | Path construction, difference clips, antialiasing | Analytic quad shader with four widths, colors, styles, and radii |
| Linear and radial gradients with many stops | `SKShader` creation and sampling | Gradient stop buffer, linear and radial shader paths, linear-light color contract |
| Rounded and ordinary overflow clips | Canvas clip stack | Scissor fast path and analytic rounded coverage |
| Arbitrary clip paths | `SKPath` clips | Tessellated or mask clip resources with nested clip composition |
| Group opacity | `SaveLayer` | Bounded offscreen layer and one composite operation |
| Fifteen blend modes | `SKBlendMode` | Fixed blend where possible and shader or offscreen composite for the rest |
| Box, inset, text, and path shadows | Mask filters and path operations | Analytic rectangle shadows plus mask and blur passes for arbitrary geometry |
| Vector fill and stroke | Path fill, stroke expansion, dash and corner effects | Curve flattening, tessellation, stroke joins and caps, dash, corner effect, fill rules |
| Text | Font discovery, fallback, shaping bridge, glyph bounds, blobs, rasterization | Direct HarfBuzz shaping data, font scaler, glyph masks, atlas, fallback and emoji |
| Images | Decode, premultiply, sampling, color conversion | Minimal codec layer, RGBA decode cache, upload, sampling, color handling |
| Transforms | Canvas matrix stack | Per-primitive or chunk transform with conservative transformed bounds |
| Offscreen render and screenshots | Raster `SKSurface` and readback | Vulkan image target, transfer, row conversion, and async readback |
| Raster diagnostics | CPU Skia surface | Keep transitional or replace with a separately justified CPU renderer |
| Shape hit testing | `SKPath.Contains` and cached fill paths | CPU geometry retained from tessellation with a spatial hit index |

GPUI's shader set is a strong starting reference for quads, borders, shadows, glyph sprites, image
sprites, and path batching. It is not feature parity for Goo. In particular, GPUI clips overflow to
rectangles, flattens element opacity into primitive colors, and supports only two-stop linear
gradients. Goo must preserve real group opacity, arbitrary clip paths, radial and multi-stop
gradients, per-edge border colors, and the current blend-mode surface.

### Text and images without Skia

Keep `Unicode.Bidi`. Replace `SkiaSharp.HarfBuzz` with direct `HarfBuzzSharp` use so shaped output is
font face IDs, glyph IDs, clusters, advances, offsets, and retained caret geometry. `SKTextBlob`,
`SKFont`, `SKTypeface`, and `SKFontManager` must disappear from the scene and text caches.

The font replacement needs a measured choice:

| Choice | Benefit | Cost |
|---|---|---|
| One FreeType-based scaler on Windows and Linux | One raster contract and closer cross-platform pixels | Bundled native FreeType and owned font discovery |
| DirectWrite on Windows and FreeType on Linux | Native system fallback and ClearType behavior | Two implementations and platform pixel differences |
| Pure managed scaler | Small native surface | Highest quality, hinting, emoji, and implementation risk |

Use packaged Inter as the first deterministic face. The final path still needs system fallback,
variable weights, CJK, RTL, combining marks, ligatures, grayscale text, optional subpixel text, and
color emoji. Glyph atlas keys include face version, glyph ID, pixel size, DPI scale, subpixel
variant, hinting mode, and render mode. Atlas memory is budgeted by bytes, not entry count.

Replace `SKImage.FromEncodedData` with the smallest decoder set required by the actual Hivemind asset
inventory. Decode to premultiplied RGBA off the UI thread, retain the existing byte-bounded cache,
and upload lazily. Convert stable SVG icons to `VectorPath` or precompiled meshes where practical.
Do not add a general SVG runtime unless a real asset requires it.

Removing native Skia saves about 8.98 MB on the measured Linux RID and about 12.27 MB on the cached
Windows RID before replacement codec and font-scaler costs. HarfBuzz can remain until a smaller
shaper proves equal behavior.

### Direct Vulkan ownership model

Use one process GPU runtime and lightweight per-window surfaces:

```text
Goo Vulkan runtime
  narrow Vulkan procedure table
  VkInstance
  VkPhysicalDevice
  VkDevice
  graphics and presentation queue
  pipeline and descriptor cache
  scene resource registry and bounded atlases
  |
  +-- Window A: SDL window, VkSurfaceKHR, swapchain, frame slots
  +-- Window B: SDL window, VkSurfaceKHR, swapchain, frame slots
  +-- Window C: SDL window, VkSurfaceKHR, swapchain, frame slots
```

SDL supplies required instance extensions, `vkGetInstanceProcAddr`, surface creation, and
presentation support. Goo owns only the Vulkan entry points and structures it uses. Do not add a
general Vulkan package, WGPU, Dawn, or SDL GPU abstraction. Precompile shaders to SPIR-V and include
only required variants.

Start with one graphics and presentation queue family, two frames in flight, FIFO for VSync, and a
single UI-thread submission owner. Each window owns its swapchain, image views, acquire and render
semaphores, completion fences, and per-image state. The process owns shared pipelines, samplers,
atlases, mesh buffers, staging rings, and device-loss state.

The aggregate pump drains SDL once, applies pending Cell work, compiles dirty scene chunks, acquires
dirty windows, records their work, submits without a CPU idle wait, and presents each ready
swapchain. Hidden, minimized, and zero-extent windows do not acquire, submit, or present.

A dirty frame initially does this:

1. Recompile only dirty scene chunks.
2. Resolve new glyph, image, path, gradient, clip, and layer resources.
3. Acquire a swapchain image.
4. Upload only new or changed resources and scene ranges.
5. Clear the target and draw the complete visible scene in overlap-safe batches.
6. Submit while signaling the frame slot fence and render-complete semaphore.
7. Present while waiting on render completion.
8. Preserve the scene and GPU ranges for the next presentation.

Out-of-date and suboptimal swapchains rebuild lazily. A zero extent suspends rendering. Surface loss
recreates the SDL Vulkan surface. Device loss invalidates GPU resources, keeps the Goo tree and CPU
scene alive, recreates the process device, and forces one uncached scene-resource pass. The first
release may fail cleanly instead of promising transparent device recovery, but it must not corrupt
the process.

### Whole-window repaint

GPUI does not solve whole-window repaint. Its current renderers clear and draw the full scene on each
presented frame. The useful lesson is that a full redraw can be cheap when:

- Clean UI subtrees replay cached scene data.
- Primitive records are compact.
- Common shapes are analytic and instanced.
- Glyphs and images are atlased.
- Large lists are virtualized.
- Topology data is culled and submitted as a bounded custom mesh.
- The window renders only on demand.

Use that model first. It removes the current managed Painter traversal and native wrapper churn
without taking on backing-store correctness.

A later retained-backing experiment is valid only if real direct Vulkan measurements show fill or
power cost remains material. Render dirty regions into one persistent color image, expand damage for
shadows and layers, query a scene spatial index, then copy or composite the backing image to the
acquired swapchain image. At 3840 x 2160, one RGBA8 backing image costs about 31.6 MiB before
swapchain images, masks, and layers. This is not automatically a resource reduction.

The retained-backing gate requires a real Hivemind scene, Windows and Linux drivers, exact or
approved pixels, lower P50 and P95 total frame time, lower or equal power proxy, and an explicit
private and GPU memory budget. Do not build it to improve a paint-only number.

### Source and package change map

| Area | Required change | Estimated production change |
|---|---|---:|
| `Goo/Rendering` scene compiler | Replace direct `SKCanvas` calls with typed scene records and transition adapter | 1,500 to 2,500 lines |
| Scene chunks and resource IDs | Stable versions, range replay, frame arena, diagnostics | 600 to 1,200 lines |
| Narrow Vulkan interop and SDL WSI | Required entry points, structures, error names, and surface calls | 700 to 1,200 lines |
| Vulkan runtime and swapchains | Device selection, queues, frames, resize, recovery, and multi-window scheduling | 1,800 to 3,000 lines |
| Vulkan renderer and shaders | Batching, buffers, descriptors, quads, shadows, sprites, paths, layers, composites | 2,000 to 3,500 lines |
| Atlas and GPU resources | Glyph, image, mask, mesh, gradient, upload, eviction, byte accounting | 700 to 1,300 lines |
| Text replacement | Font faces, direct shaping, glyph rasterization, fallback, emoji, caret geometry bridge | 1,500 to 3,000 lines |
| Path and clip replacement | Flattening, fill and stroke tessellation, effects, masks, CPU hit geometry | 1,500 to 3,000 lines |
| Image and offscreen replacement | Decode bridge, uploads, readback, screenshots, raster fallback accounting | 500 to 1,000 lines |

Expected gross transition scope is about 10,800 to 19,700 changed or new production lines before
deleting the Skia implementation, assuming existing codecs, an existing font rasterizer, and a
narrow Vulkan binding. Budget about 13,000 to 24,000 if Goo also owns Vulkan declarations, font
rasterization interop, and image codecs. These table rows are planning envelopes with overlapping
text, atlas, path, and renderer responsibilities. They are not an additive source contract. Track
handwritten production code, generated bindings, shader source, native or vendored code, and deleted
Skia code separately. This is consistent with GPUI's current renderer, shader, atlas, scene,
batching, and platform text surface. It is not a 2,000-line swapchain task.

The public G# UI diff is zero. The source tree grows during transition and falls when direct canvas
paint, Skia geometry caches, Skia text wrappers, Ganesh targets, and Skia package plumbing are
removed. The installed binary should shrink materially after Skia removal even if source lines grow.

### Delivery sequence

1. Finish the reproducible G# 0.4 upgrade and preserve current baselines.
2. Define the typed scene, stable resource IDs, bounds contract, and diagnostics.
3. Implement the typed scene in the non-shipping Vulkan proof. Compare deterministic captures with
   the frozen Skia evidence.
4. Add Cell or view scene-range replay. Measure construction time and allocation before adding
   persistent GPU chunks.
5. Add direct Vulkan WSI, device, swapchain, clear, solid quad, resize, close, and reopen on Windows
   and Wayland Linux.
6. Add analytic quads, per-edge borders, gradients, shadows, glyph sprites, images, and rectangular
   clips. This is the first Hivemind shell-capable direct renderer.
7. Replace Skia text shaping integration and glyph rasterization. Prove Inter, system fallback, CJK,
   RTL, combining marks, ligatures, IME, caret geometry, and emoji.
8. Add arbitrary paths, strokes, dashes, clip masks, group opacity, blend modes, text and path
   shadows, offscreen rendering, and screenshots.
9. Add shared-device three-window scheduling, surface loss, device loss behavior, validation, and
   NativeAOT packaging.
10. Run every required Goo workload with complete Vulkan coverage, then run the full Goo visual
    feature gate.
11. Remove SkiaSharp, SkiaSharp.HarfBuzz, native Skia assets, Ganesh targets, and the Goo-owned C#
    runtime helper in one measured product cutover.

Do not make Skia fallback removal depend on a retained-damage renderer. Full-frame direct Vulkan is
the cutover baseline.

### Minimal renderer verification

Keep the renderer tests smaller than the renderer:

1. One fixed visual end-to-end scene that covers boxes, four radii, per-edge borders, multi-stop
   linear and radial gradients, text, images, paths, nested clips, transform, group opacity, blend,
   and shadows at required DPI scales. Compare Skia and direct Vulkan captures.
2. One real Hivemind large-data and topology hot path that records scene construction, dirty chunk
   count, upload bytes, draw calls, GPU time, total frame, allocation, RSS, and GPU memory.
3. One Windows and one Wayland Linux end-to-end run that open Main, Command, and Playbook, resize,
   minimize, restore, render concurrently, close, and reopen.
4. One forced swapchain rebuild and device-loss lifecycle run with validation enabled.
5. One package and NativeAOT run per RID that reports every native and managed payload.

Do not create a unit test for every primitive or Vulkan result code. Use shader compilation checks,
validation layers during development, the one visual scene, real application flows, and the hot-path
benchmark.

### Direct renderer adoption and Skia removal gate

The direct renderer can replace Skia only when all of these pass:

- Required Hivemind scenes produce zero fallback draws.
- Full public Goo rendering coverage either matches or has an approved breaking decision.
- Fixed captures match exactly where stable. Approved antialiasing differences stay within a written
  threshold and are manually reviewed at 100, 125, 150, and 200 percent DPI.
- P95 total frame improves materially in at least two real Hivemind scenes.
- No required scene regresses more than 5 percent in P95 total frame or input latency.
- Steady hot paths allocate nothing after warm-up where practical.
- Startup, first interactive frame, RSS, private dirty memory, GPU memory, and input latency do not
  regress more than 10 percent.
- Idle performs no scene compilation, submit, present, or steady allocation.
- Three windows remain responsive together and do not serialize one VSync wait per window.
- Resize, minimize, restore, close, reopen, surface loss, and the declared device-loss policy are
  validation-clean.
- Official Windows x64 and Linux x64 output stays at or below 20 MiB per RID.
- The public Blob, Cell, style, Yoga, `WindowRenderer.Gpu`, and `Window.Renderer` contracts do not
  change for renderer reasons.

If the gate is incomplete, Skia remains the transition backend. Direct Vulkan does not become a
permanent second backend by default. The target is to finish the replacement and delete the
transition, not maintain both forever.

## Raster backend triage

The Wayland raster target paints into linear RGBA16 and converts into three BGRA8 shared-memory
buffers. Its minimum pixel storage is about 20 bytes per pixel before Skia and compositor overhead.

| Size | Approximate pixel storage per window |
|---|---:|
| 1920 x 1080 | 39.6 MiB |
| 3840 x 2160 | 158.2 MiB |

Measured full conversion was about 2.091 ms at 1080p and 8.268 ms at 4K. This path is useful only
for Linux diagnostics, controlled GPU avoidance, or a separately measured low-resource tool.

- Do not port it to Windows for Hivemind.
- Do not make it the default.
- Keep its code isolated from the GPU target.
- Consider a separate optional package if core output size or maintenance becomes material.
- Remove it before a release only if its approved diagnostics use is withdrawn.

## Binary and memory reductions

### Current dominant files

The staged Linux framework-dependent bundle has been measured around 17 MB before the .NET runtime.
The dominant files are native Skia, HarfBuzz, SDL, and the general SDL managed binding.

| Item | Approximate size | Action |
|---|---:|---|
| Stripped Linux `libSkiaSharp.so` | 8.98 MB | Transition only, remove after direct renderer gate |
| Linux `libHarfBuzzSharp.so` | 2.47 MB | Required for current shaping |
| Staged Linux `libSDL3.so` | 1.58 MB | Keep RID-specific and stripped |
| `Hexa.NET.SDL3.dll` | 2.53 MB | Replace with narrow internal bindings |
| `HexaGen.Runtime.dll` | 21 to 29 KB | Removed with Hexa SDL binding |
| `Goo.dll` | About 696 KB Release | Source cleanup has modest size effect |
| `SkiaSharp.dll` | About 482 KB | Transition only, remove with native Skia |
| `Yoga.Net.dll` | About 126 KB | Required by flexbox contract |
| `HarfBuzzSharp.dll` | About 122 KB | Required |
| `Goo.InternalTextInterop.dll` | About 125 KB | Keep with the frozen Skia baseline, then remove at the atomic Vulkan cutover |
| `Unicode.Bidi.dll` | About 100 KB | Required for bidi text |
| `Gsharp.Extensions.dll` | About 19 to 21 KB | Negligible runtime cost |

Cached Windows x64 native assets are currently about 12.27 MB for Skia, 2.04 MB for HarfBuzz, and
2.68 MB for SDL. Windows must be measured as its own RID. Do not infer its size from Linux.

### Reduction order

1. Ship per-RID assets. Never put Windows and Linux native libraries in one application bundle.
2. Keep `Goo.InternalTextInterop.dll` unchanged during the proof. Move its surviving responsibilities
   into G# and remove it at the atomic Vulkan cutover.
3. Replace Hexa SDL with a generated or hand-audited narrow binding for the 75 used SDL members.
4. Exclude symbols, XML, tests, compiler packages, and unused RID assets from application output.
5. Use explicit Cell factories and AOT-safe adapters so trimming remains available.
6. Package the minimum Inter font set that proves all required weights. Prefer one proven variable
   face over multiple static faces if the selected final font scaler handles it correctly.
7. Remove Skia only after the direct renderer has replaced text, image, geometry, effect, offscreen,
   and diagnostic responsibilities. Measure every replacement dependency and final RID output.

Consumer application dependency removal is outside Goo core and does not count toward these
reductions.

Replacing Hexa increases source lines but should remove about 2.55 MB of managed payload. This is a
good reduction because the product constraint is binary and resource size, not source line count.

### Memory priorities

- Virtualize before shrinking ordinary Node fields.
- Bound decoded images by bytes and entries.
- Bound any retained paint cache by actual native bytes per window.
- Throttle or suspend hidden and minimized windows.
- Put a time or item budget on posted-action draining so bursts cannot monopolize a frame.
- Measure close and reopen cycles for native resource retention.
- Do not use a broad ConditionalWeakTable sidecar to save Node bytes.

## Source reductions after G# 0.4

The existing reductions branch already contains dead-code and duplication batches. Remaining work
must be sorted by product value.

| Candidate | Source effect | Runtime effect | Decision |
|---|---:|---|---|
| Expression-bodied functions and accessors | About 430 lines | None expected | Mechanical cleanup after 0.4 lands |
| Optional binding and pattern syntax | About 28 lines plus clarity | None expected | Use where 0.4 removes old workaround syntax |
| Style-effect mask simplification | Small | Possible hot-path effect | Benchmark before accepting |
| Generic Node sidecar | About 300 to 400 lines | Measured lookup regression | Reject |
| Static Resolver lookup tables | About 150 to 230 lines | Possible hot-path win | Prototype and compare Release baselines |
| Reconciler effect-mask accumulation | About 40 to 60 lines | Possible branch reduction | Do only with public API and frame gates |
| SDL key translation collapse | Up to about 240 lines | Less duplicate mapping | Re-evaluate with the narrow SDL binding |
| Text range-index consolidation | About 75 lines | Possible editor hot-path effect | Defer until editor Hivemind consumers exist |

Source reduction is not a reason to change public API, add allocation, or weaken direct-field hot
paths. G# 0.4 syntax cleanup should be one mechanical change with zero API and performance delta.

## Goo core change budget

| Work | Core size | Public API | Required for Hivemind |
|---|---|---|---|
| G# 0.4 compatibility | Medium, already 17 files | Zero intended | P0 |
| Reproducible 0.4 package | Build and packaging only | Zero | P0 |
| Windows x64 assets and smoke | Small to medium packaging and host work | Zero intended | P0 |
| Aggregate pump and cursor arbitration | Medium Window and SDL host work | One narrow static pump API | P0 for 3 native windows |
| Password entry | Medium text, input, paint, and accessibility work | One `TextEntry` property | P0 |
| Packaged font registration | Medium text interop and lifetime work | One owned font source type | P0 |
| Scroll range | Small ElementHandle work | One read-only metric | P1 |
| Native raise or activate | Small SDL host work | One narrow Window method | P1 if singleton reuse remains |
| Windows UIA | Large platform adapter, neutral core model already exists | Zero or adapter registration only | P1 |
| Virtual list, grid, tree | Large app component work | Zero Goo core by default | P0 app work |
| Typed scene and transition adapter | About 2,100 to 3,700 production lines | Zero | P0 renderer foundation |
| Direct Vulkan renderer and Skia replacement | About 8,700 to 16,000 additional production lines | Zero | Required eventual GPU path |

## Delivery waves

`IMPLEMENTATION-PLAN.md` is the single current status and remaining-work tracker. This roadmap is
historical supporting research, except that its Non-negotiable contract remains an external release
invariant. `IMPLEMENTATION-HISTORY.md` preserves completed execution material. The roadmap originally
grouped the stages into these Goo-core-only waves:

### Wave 0: compiler, requirements, and frozen evidence

- Complete S00 through S04.
- Land the isolated official G# 0.4.1 migration and findings audit.
- Preserve `Goo.InternalTextInterop` and the current Skia renderer as the verified baseline.
- Lock core requirements and deterministic workloads.
- Freeze qualifying Windows and Linux visual, performance, memory, and package evidence.

Exit: the exact SDK, current package behavior, requirements, workloads, and immutable Skia floor are
fully reproducible.

### Wave 1: Vulkan capability and internal ABI

- Complete S05 through S07.
- Record the common Windows and Linux Vulkan capability contract.
- Generate the narrow internal G# Vulkan ABI from pinned registry input.
- Prove SDL Vulkan loading and surface creation on both platforms.
- Establish backend-neutral diagnostics with no disabled-path allocation.

Exit: the generated ABI, loader, surfaces, and evidence spine pass independently on both platforms.

### Wave 2: proof runtime, typed scene, and resources

- Complete S08 through S10 in a non-shipping proof target.
- Implement shared device ownership, per-window presentation, offscreen readback, allocation,
  resource lifetime, uploads, shaders, and the typed frame plan.
- Keep the product Goo package on its unchanged Skia baseline.

Exit: clear, quad, resize, retirement, semantic digest, and zero warm-allocation gates pass.

### Wave 3: rendering feature parity

- Complete S11 through S14.
- Implement the common HarfBuzz and FreeType text path, backend-neutral images, accepted path work,
  compiled SVG assets, compositing, effects, and asynchronous readback.
- Select one AA policy through measured Windows and Linux evidence.

Exit: the required visual and behavioral corpus passes without a Skia call or fallback in the proof.

### Wave 4: retention, multi-window, and required core mechanisms

- Complete S15 through S17.
- Implement retained clean ranges, per-image damage, fair multi-window scheduling, bounded recovery,
  and only the approved non-composable Goo core mechanisms and platform adapters.

Exit: sparse, three-window, lifecycle, accessibility, focus, credential, and scroll contracts pass.

### Wave 5: atomic product cutover and qualification

- Complete S18 and S19.
- Integrate direct Vulkan once.
- Remove Skia, OpenGL, CPU raster, Hexa SDL, and `Goo.InternalTextInterop` in the same measured product
  boundary after every entry gate passes.
- Qualify Windows x64 and Linux Wayland x64 independently, including NativeAOT and package contents.

Exit: official Goo packages contain one direct Vulkan renderer and no Goo-owned C# runtime code.

## Minimal verification

Keep tests smaller than the implementation. Use existing low-level coverage where it already proves
Goo internals. Add only these adoption tests:

1. One package consumer smoke for G# 0.4, partials, `Cell.Mount`, native open, pump, and close.
2. One Windows three-window end-to-end scenario for Main, Command, and Playbook, including cursor,
   input, resize, close, reopen, and concurrent activity.
3. One credential and typography end-to-end scenario for password redaction, IME, clipboard policy,
   packaged Inter weights, focus, validation, and submit.
4. One real Hivemind large-data hot path that covers local invalidation, virtualization, scrolling,
   topology or streamed output, frame time, allocation, and retained memory.

Use visual captures for fixed resolutions and DPI scales. Do not create a unit test for every
component state.

## Acceptance gates

| Gate | Required evidence |
|---|---|
| Idle | Zero rendered frames after settling and no steady allocation, except scheduled caret or required timer events |
| Locality | A source update rebuilds only its owning Cell or bounded component region |
| Virtualization | Mounted rows are `O(visible + overscan)` and independent of total count |
| Frame time | Scroll and active updates target P95 below 8.33 ms and no routine frame above 16.67 ms |
| Allocation | No steady allocation after warm-up on topology pointer movement and other designated hot paths |
| Multi-window | Main, Command, and Playbook keep bounded frame, present, input, and allocation latency together |
| Visual | 1920 x 1080, 1440 x 900, 1280 x 720 at 100, 125, 150, and 200 percent DPI with no clipping or focus loss |
| Renderer fallback | Zero Skia fallback draws in required Hivemind scenes before direct Vulkan cutover |
| Accessibility | Keyboard traversal, modal trap and restore, roles, names, states, live progress, and Windows UIA at P1 |
| Lifetime | Repeated resize and 1,000 close or reopen cycles retain no stale native resources and stay within 5 percent of baseline RSS |
| Package | RID-specific output, NativeAOT proof, no unused platform assets, no Skia after renderer cutover, 20 MiB official application cap |
| API | No renderer-driven public G# or Yoga diff |

## Explicitly rejected work

- Building a production Skia Ganesh Vulkan bridge before the direct renderer.
- Adding SDL3 GPU, WGPU, Dawn, or a general Vulkan binding when the target is narrow direct Vulkan.
- Treating the Vulkan API alone as a fix for application-wide rebuilds or scene construction.
- Retrying the rejected Ganesh damage-clip design without new evidence.
- Porting the Uproar95 Goo fork wholesale.
- Adding native owner and modal machinery for ordinary Hivemind forms.
- Adding geometry persistence before a real product requirement.
- Moving Hivemind controls into Goo core for convenience.
- Adding broad Node sidecars that lose direct-field hot-path performance.
- Removing current UI source before the Windows, credential, multi-window, virtualization, and visual
  gates pass.

## External references

- Current GPUI scene and primitive batches: <https://github.com/zed-industries/zed/blob/b2d9c2e122fbc408d42276b4456243ba4f90f181/crates/gpui/src/scene.rs>
- Current GPUI overlap-order bounds tree: <https://github.com/zed-industries/zed/blob/b2d9c2e122fbc408d42276b4456243ba4f90f181/crates/gpui/src/bounds_tree.rs>
- Current GPUI clean-view scene replay: <https://github.com/zed-industries/zed/blob/b2d9c2e122fbc408d42276b4456243ba4f90f181/crates/gpui/src/view.rs>
- Current GPUI WGPU full-frame renderer: <https://github.com/zed-industries/zed/blob/b2d9c2e122fbc408d42276b4456243ba4f90f181/crates/gpui_wgpu/src/wgpu_renderer.rs>
- Current GPUI Linux Vulkan or OpenGL selection: <https://github.com/zed-industries/zed/blob/b2d9c2e122fbc408d42276b4456243ba4f90f181/crates/gpui_wgpu/src/wgpu_context.rs>
- Current GPUI Windows D3D11 renderer: <https://github.com/zed-industries/zed/blob/b2d9c2e122fbc408d42276b4456243ba4f90f181/crates/gpui_windows/src/directx_renderer.rs>
- Zed's specialized primitive renderer overview: <https://zed.dev/blog/videogame>
- Zed's frame pacing and buffering findings: <https://zed.dev/blog/120fps>
- Skia surface and context ownership: <https://skia.org/docs/user/api/skcanvas_creation/>
- Skia Vulkan integration and driver warning: <https://skia.org/docs/user/special/vulkan/>
- Skia reference Vulkan swapchain and semaphore path: <https://skia.googlesource.com/skia/+/8b0168e7e0e1/tools/window/VulkanWindowContext.cpp>
- Skia Ganesh wait, present access, mutable state, and device-loss contract: <https://skia.googlesource.com/skia/+/7cfab2b7d44e5cfa31f24f277fbe9a8e6cc3a1cf/include/gpu/ganesh/GrDirectContext.h>
- Skia API, including pictures, regions, and surfaces: <https://skia.org/docs/user/api/>
- SDL3 Vulkan window integration: <https://wiki.libsdl.org/SDL3/CategoryVulkan>
- SDL3 Vulkan surface creation: <https://wiki.libsdl.org/SDL3/SDL_Vulkan_CreateSurface>
- SDL3 Vulkan presentation support query: <https://wiki.libsdl.org/SDL3/SDL_Vulkan_GetPresentationSupport>
- SDL3 GPU model: <https://wiki.libsdl.org/SDL3/CategoryGPU>
- SDL3 GPU device creation: <https://wiki.libsdl.org/SDL3/SDL_CreateGPUDevice>
- Vulkan queue presentation and synchronization contract: <https://registry.khronos.org/vulkan/specs/latest/man/html/vkQueuePresentKHR.html>
- Vulkan incremental present contract: <https://registry.khronos.org/VulkanSC/specs/1.0-extensions/man/html/VkPresentRegionsKHR.html>
- Wayland surface damage and frame callback protocol: <https://wayland.freedesktop.org/docs/html/apa.html>
