# Goo Core Requirements Lock

Date: 2026-08-16

Branch: `gaps-and-reductions`

Stage: S03

Scope: Goo core mechanisms, package behavior, public API reachability, and deterministic Q10
workloads. Consumer applications and reusable controls are evidence only.

## Sources

| Source | Identity | Use |
|---|---|---|
| Goo core | `d250ef38ffc3e1850e19ae519dc61e1410eb03c6` | Core and public API under review |
| Hivemind inventory | SHA-256 `dfb3bcda6376762845eca6cf7583d87e5d0b4616998d6b7d2bea792997c2c222` | 14 foundations, 72 reusable primitives, and 43 composites |
| Avalonia to Goo gap analysis | SHA-256 `ca06e282689df3ce9a52f44707b785cadade2d173d1f0bab4d1b4960fbb8a104` | Framework, adapter, composition, and non-goal triage |
| Hivemind source and fonts | `fd1cea3e54afca9ce5021978aa7a615eb1ab9241` | Product topology, three-window behavior, and deterministic Inter files |
| Uproar95 | `546afdcc41a0d896bceba325f4629f97ab77a7f5` | Multi-window, secret input, font, and scroll-range evidence |
| Q10 workload manifest | `docs/perf/q10-workloads-v1.json`, revision 1 | Stable benchmark configurations and action traces |

The two Hivemind planning documents are untracked in their source repository. Their hashes are the
source identities used by this lock. No Hivemind or Uproar95 source enters Goo core.

## Classification

| ID | Requirement | Classification | Owner | Workload | Decision |
|---|---|---|---|---|---|
| R01 | Windows x64 package assets and native open, input, resize, DPI, close, and reopen | Required Goo core mechanism | Goo | `q10.resize-dpi`, `q10.three-window` | Required for parity with Linux x64 |
| R02 | One process-wide SDL event wait or poll with fair multi-window dispatch | Required Goo core mechanism | Goo | `q10.three-window` | Replace per-window blocking before three-window adoption |
| R03 | Process-global cursor arbitration | Required Goo core mechanism | Goo | `q10.three-window` | Only the focused or pointer-owning window publishes cursor state |
| R04 | Multi-window frame scheduling without serial VSync stalls or unbounded latency | Required Goo core mechanism | Goo | `q10.three-window` | Measure first, then keep scheduling policy internal |
| R05 | Secret text presentation, grapheme-safe mask geometry, IME, selection, clipboard suppression, and semantic redaction | Required Goo core mechanism | Goo | `q10.text-editing` | Reveal controls and credential policy remain outside core |
| R06 | Registration and lifetime of application-supplied font bytes with family, weight, italic, fallback, and disposal | Required Goo core mechanism | Goo | All visual workloads | Use identical pinned Inter bytes on Windows and Linux |
| R07 | Native focus or raise for an existing window | Optional mature-framework nicety | Goo if demanded | `q10.three-window` | Add only if a real singleton-window flow requires it |
| R08 | Public scroll range and metrics | Behavior composable after one missing mechanism | Goo only with a real consumer | `q10.virtual-table` | Admit the smallest range mechanism only with the first draggable scrollbar |
| R09 | Neutral semantic tree and adapter traversal contract | Already satisfied Goo core mechanism | Goo | `q10.virtual-table`, `q10.text-editing` | UIA and AT-SPI object models stay in platform adapters |
| R10 | Virtual list, grid, tree, rich output, DataGrid, charts, markdown, schedules, dialogs, popups, forms, and navigation controls | Behavior composable from public primitives | Separate G# library or consumer | `q10.virtual-table`, `q10.text-editing` | No reusable control enters Goo core |
| R11 | Topology layout, spatial index, culling policy, domain hit behavior, and accessible list alternative | Application-owned control or policy | Consumer | `q10.topology` | Goo supplies paths, transforms, clips, input, and render primitives only |
| R12 | Typed view-model subscriptions, batching, cancellation, stale-result suppression, and state ownership | Application-owned control or policy | Consumer | `q10.virtual-table`, `q10.topology` | Root-wide invalidation is not a Goo requirement |
| R13 | File, folder, and save dialogs plus browser, file, folder, RDP, and UNC launch | Application-owned platform adapter | Consumer or companion library | None | Not a Goo widget or core service |
| R14 | Window persistence, storage, restore validation, monitor clamping, and save policy | Application-owned control or policy | Consumer or optional library | None | Goo exposes live state and applies requested values only |
| R15 | Native owner relationships, native modal forms, full monitor APIs, taskbar polish, custom icons, external file drag and drop, rich clipboard, notifications, and system preference observers | Optional mature-framework nicety | Platform adapter or consumer | None | Does not block core renderer cutover |
| R16 | Runtime SVG decoding | Out of scope | Optional provider | `q10.image-effects` uses compiled or raster fixtures | Compiler-first SVG assets remain approved |
| R17 | CPU raster renderer and live Skia fallback | Out of scope | None | Offscreen Vulkan readback only | Remove atomically at S18 after Vulkan qualification |
| R18 | macOS runtime and packaging | Out of scope | None | None | Windows x64 and Linux x64 are the supported targets |

## Platform gaps

| Area | Windows x64 | Linux x64 |
|---|---|---|
| Native package | Missing qualifying current package and NativeAOT capture | Existing package path, final G# 0.4.1 NativeAOT capture pending |
| Window runtime | Real packaged proof pending | Wayland proof pending because no compositor is available on this host |
| Vulkan qualification | Integrated and discrete configurations pending | Discrete device census recorded, integrated device pending, real SDL surface and present pending |
| Accessibility adapter | UIA is a platform adapter and is not part of this core renderer wave | AT-SPI is a platform adapter and is not part of this core renderer wave |
| Fonts | Load pinned application bytes through the common Goo font contract | Load the same pinned application bytes through the common Goo font contract |

## Renderer API reachability

The approved S18 breaking removal includes `WindowRenderer`, `Window.Renderer`, and raster-only
surfaces. No removal occurs in S03.

| Consumer | Reachability | S18 migration |
|---|---|---|
| `../goo-projects/apps/Goo.Workbench` | Explicit `WindowRenderer.Raster` selection | Remove the selection and use the sole Vulkan renderer |
| Goo public API baseline and documentation | `WindowRenderer.Gpu`, `WindowRenderer.Raster`, and `Window.Renderer` are recorded | Remove only during the approved S18 API update |
| Goo tests and historical benchmark tools | Raster selection and raster surfaces are used as Skia evidence | Freeze evidence first, then delete raster-only verification at S18 |
| `../gex`, `../Hivemind-Goo`, `../uproar95`, and inspected OddTool sources | No direct `WindowRenderer` or `Window.Renderer` use found | No source migration identified |
| Unknown external package consumers | Cannot be enumerated locally | Publish as an intentional breaking change with the Vulkan-only migration |

## Package consumer contract

`tests/Goo.PackageSmoke` is T01. It must consume the freshly packed Goo artifact, mount a generic
external cell, compile and execute imported `Cell<TInput>.ShouldRebuild` and typed `Build(input)`
overrides, and retain the native open, pump, close smoke. It must not resolve the published Goo
0.2.0 package during stage verification.

## Workload ownership

`docs/perf/q10-workloads-v1.json` is the authoritative S03 workload lock. Each result manifest must
copy its workload ID and revision and must record the tested Goo commit. All random data comes from
the recorded seed. A runner may change implementation without changing the workload only when the
generated data, action trace, dimensions, DPI phases, font bytes, and expected visible behavior stay
identical.

The true-idle workload follows the separate Q10 idle protocol. It opens and settles normally, then
records 60 seconds with no synthetic frames or input. The other workloads use five isolated
processes, 300 warmup frames, and 2,000 measured frames.

## S03 disposition

- Every observed reference gap has an owner and classification.
- Goo core remains limited to inaccessible mechanisms and existing defects.
- Consumer controls, application state, persistence, storage, and product policy remain outside
  core.
- Windows and Linux gaps remain separate.
- The workload contract is locked, but S04 still must implement or pin a clean-clone reproducible
  harness and capture qualifying evidence.
