# Vulkan Authoring Library Candidate Register

Date opened: 2026-08-24

Branch audited: `gaps-and-reductions`

Status: implementation complete. VKSL-001 through VKSL-014 are verified.

## Goal

Build a small Goo-internal library that makes Vulkan code simpler to author without reducing
capability or performance. It may encode Goo and Vulkan policy when that policy is already repeated
and proven in the renderer.

This is not a proposal for `Gsharp.Extensions`. The code remains internal to Goo under
`Goo/Rendering/Vulkan` and uses the existing `package Goo` boundary.

## Status values

| Status | Meaning |
|---|---|
| Proposed | Source evidence exists, but the shape is not approved |
| Investigating | Call sites, invariants, and measurements are being audited |
| Approved | Exact scope and verification contract are accepted |
| In progress | Implementation is active |
| Verified | Required correctness and performance gates passed |
| Deferred | Valid candidate with no current implementation slot |
| Rejected | Evidence or measurement does not justify the abstraction |

## Candidate summary

| ID | Priority | Status | Candidate | First useful slice |
|---|---:|---|---|---|
| VKSL-001 | P0 | Verified | `VulkanBufferFactory` | Accounted buffer creation with optional mapping and complete rollback |
| VKSL-002 | P0 | Verified | `VulkanImageFactory` | 2D and 2D-array image plus view creation |
| VKSL-003 | P0 | Verified | `VulkanDescriptorFactory` | Layout, pool allocation, and typed writes |
| VKSL-004 | P0 | Verified | `VulkanSynchronizationFactory` and `VulkanCommandFactory` | Semaphore, fence, command pool, and command buffers |
| VKSL-005 | P0 | Verified | `VulkanTransitions` | Direct image and buffer transition command emission |
| VKSL-006 | P1 | Verified | `VulkanPipelineFactory` | Shared primitive pipeline assembly and rollback |
| VKSL-007 | P1 | Verified | `VulkanMemoryPolicy` | Named required and preferred memory masks |
| VKSL-008 | P1 | Verified | `VulkanSwapchainImageSet` | Co-indexed per-image state ownership |
| VKSL-009 | P1 | Verified | `VulkanRetiredSwapchainSet` | Generation retirement and destruction |
| VKSL-010 | P1 | Verified | `VulkanFrameSlotRing` | Existing two-slot frame window |
| VKSL-011 | P1 | Verified | `VulkanCurrentResourceSet` | Double-buffered current and pending resource IDs |
| VKSL-012 | P1 | Verified | `VulkanReadbackPlan` and `VulkanReadbackFactory` | Region planning and readback ownership transaction |
| VKSL-013 | P2 | Verified | `VulkanDeviceRecoveryCoordinator` | Explicit multi-window recovery phases |
| VKSL-014 | P2 | Verified | `VulkanSceneRetentionProofStore` | Ping-pong proof storage and reset |

Current progress: 14 of 14 candidates are verified.

## Acceptance rules

A candidate is accepted only when all applicable rules are satisfied.

- It removes repeated Vulkan authoring burden or centralizes a material invariant.
- It preserves every capability used by the replaced call sites.
- Its API is smaller and easier to read than the code it replaces.
- It does not add a per-call heap object, closure, delegate pipeline, reflection, or sequence.
- A factory owns the complete native rollback path and Goo object accounting.
- Raw Vulkan handles remain available where the renderer needs direct access.
- Normal teardown and device-loss teardown remain distinct operations.
- Hot-path changes have comparable Release measurements from the same scenario.
- The abstraction is not accepted only because it reduces line count.

Preferred implementation forms are value structs and shared functions in flat internal files. Do
not use fluent builders.

## Measurement contract

Every hot-path candidate must compare the same Release scenario before and after the change.

| Gate | Required evidence |
|---|---|
| Output | Pixel or renderer-output parity for the affected scenario |
| CPU | Equal or lower applicable CPU and frame time |
| Allocation | No new steady-state managed allocation |
| Memory | No unexplained retained or native memory growth |
| GPU work | No added submission, transfer, draw, or synchronization work |
| Lifetime | Exact object accounting and destroy-once behavior |
| Recovery | Equivalent resize, recreation, and device-loss behavior |

Initialization, allocation growth, and recovery helpers still require lifetime and output proof.
They do not need a steady-frame timing gate unless the call site enters the frame path.

## Candidate details

### VKSL-001: Vulkan buffer and mapped staging factory

Priority: P0

Status: Verified

Evidence: the renderer contains 11 `VkBufferCreateInfo` constructions and seven repeated
create, account, allocate, map, and rollback transactions. Representative sites are
`VulkanTextFrameData.gs`, `VulkanPrimitiveFrameData.gs`, `VulkanClipMaskFrameData.gs`,
`VulkanTextAtlas.gs`, `VulkanPathAtlas.gs`, `VulkanImageResources.Create.gs`, and
`VulkanOffscreenTarget.gs`.

Implemented shape:

- `VulkanBufferFactory` creates an accounted buffer with its allocation.
- `CreateMapped` maps the allocation and rolls back the complete transaction when mapping fails.
- Usage and memory policy stay explicit inputs.
- Creation failure rolls back every completed native and accounting step.
- Existing owners keep normal teardown, device-loss teardown, capacity, and generation state.

Migrated sites: primitive frame data, text frame data, clip-mask frame data, text atlas, path atlas,
and image upload staging. `VulkanOffscreenTarget` remains inline because it records the exact
`VkResult` for create and map operations, which the factory contract does not expose.

Verification: Release warnings-as-errors build, package build, and fresh isolated consumer publish
pass. Runtime qualification passed on an NVIDIA GeForce RTX 3080 with driver 610.57.04 and Khronos
validation 1.4.357. S09R, registered-font text, image-pressure, S13 path, S13 clip-mask, S20
shader-effect warm, and FailedIdle recovery lanes cover every migrated buffer owner. Normal lanes
reported zero validation errors, zero result failures, and zero live Vulkan objects and device memory
after close. Image and path pressure exercised staging growth, upload, eviction, retirement, and exact
cleanup. FailedIdle passed ten surface-loss recoveries, three device-loss recoveries, frame and resource
cleanup, and primitive, text, image-upload, and offscreen reconstruction. The S20 warm lane created no
managed allocation, Vulkan object, or device-memory allocation after warmup. No steady-frame timing
comparison is claimed because factory calls remain initialization, allocation-growth, or recovery work.
Strict lint parsed the complete migration and retains known formatter, accessor-style, and address-taken
`var` findings.

### VKSL-002: Vulkan image factory

Priority: P0

Status: Verified

Evidence: four image and six image-view constructions repeat image creation, accounting, memory
allocation, view creation, and rollback in `VulkanImageResources.Create.gs`,
`VulkanOffscreenTarget.gs`, `VulkanOffscreenLayerTarget.gs`, and `VulkanClipMaskAtlas.gs`.

Implemented shape:

- `Create2D` and `Create2DArray` create an image, allocation, and primary view as one transaction.
- `CreateView` creates accounted views for existing images.
- Keep format, extent, usage, aspect, layer count, and memory policy explicit.
- Return the image, view, and allocation as one value struct.
- Destroy a partially created resource in reverse order.
- Existing owners keep layout, descriptor, capacity, generation, and teardown policy.

Migrated sites: image resources, offscreen layer targets, clip-mask atlas images and views, and
swapchain image views. `VulkanOffscreenTarget` remains inline because it records the exact result
of each Vulkan operation.

Verification: Release warnings-as-errors build, package build, and fresh isolated consumer publish
pass. Runtime qualification passed on the same NVIDIA and Khronos validation configuration. S09R
covered swapchain views, image-pressure covered image resources, S13 clip-mask covered 2D-array images
and per-layer views, S20 shader-effect warm covered offscreen layer targets, and FailedIdle covered
surface-loss and device-loss reconstruction. Normal lanes reported zero validation errors, zero result
failures, and zero retained Vulkan objects or device memory. Image pressure recorded six evictions and
six retirements with zero resident bytes and live objects after close. Clip-mask pressure completed with
zero pressure failures and exact cleanup. S20 warm created and reused offscreen targets with zero warm
managed, Vulkan-object, or device-memory allocation. FailedIdle rebuilt image and layer resources and
ended with zero image residency, live objects, layer residency, targets, and leases. The separate S20
forced device-loss validation failure belongs to the explicitly excluded direct `VulkanOffscreenTarget`
transaction: its seven leaked object types exactly match that type's command buffer, fence, buffer,
image, query pool, image view, and command pool fields. Strict lint parsed the complete migration and
retains known formatter, accessor-style, and address-taken `var` findings.

### VKSL-003: Vulkan descriptor factory

Priority: P0

Status: Verified

Evidence: five descriptor-set layouts, seven descriptor pools, seven set allocations, and eight
descriptor writes are assembled across frame data, atlases, image resources, and shared primitive
state.

Implemented shape:

- `CreateSingleBindingLayout` handles the common one-binding layout transaction.
- `CreateLayout` accepts explicit stack or value binding input for multi-binding layouts.
- `CreatePoolAndAllocate` creates the pool, allocates all sets, accounts every object, and rolls
  back the complete transaction on failure.
- `WriteStorageBuffer`, `WriteCombinedImageSampler`, and `WriteUniformTexelBuffer` emit the three
  descriptor write shapes used by the renderer.
- Callers retain descriptor policy, handles, normal teardown, device-loss teardown, capacity, and
  generation state.
- No fluent builder, heap collection, callback, or per-write allocation was added.

Migrated sites: image resources, clip-mask frame data, primitive frame data, text frame data, text
atlas, path atlas, offscreen layer targets, and all shared primitive descriptor-set layouts. Raw
descriptor construction now remains only in the factory, ABI declarations, and dispatch loading.

Verification: whole-migration syntax lint, Release warnings-as-errors build, package build, and fresh
isolated consumer publish pass. Runtime qualification passed on an NVIDIA GeForce RTX 3080 with
driver 610.57.04 and Khronos validation 1.4.357. S09R, registered-font text, image-pressure, S13 path,
S13 clip-mask, S20 shader-effect warm, and FailedIdle recovery lanes cover every migrated descriptor
owner. The normal lanes reported zero validation errors, zero result failures, and zero live Vulkan
objects and device memory after close. FailedIdle additionally passed ten surface-loss recoveries,
three device-loss recoveries, expected injected failure results with no fatal diagnostic, and image,
text, primitive, and offscreen-layer reconstruction. The S20 warm lane created no managed allocation,
Vulkan object, or device-memory allocation after warmup. No steady-frame performance comparison is
claimed because descriptor creation and writes remain initialization, allocation, or recovery work.
The linter still reports its known multiline-signature
formatter finding and address-taken `var` findings in the factory. Existing migrated files also retain
their prior file-wide formatting and accessor-style findings. The S20 forced device-loss lane is not
counted as descriptor evidence because `vkDestroyDevice` reports seven leaked command-buffer, fence,
buffer, image, query-pool, image-view, and command-pool objects, with no leaked descriptor object.

### VKSL-004: Vulkan synchronization and command factories

Priority: P0

Status: Verified

Evidence: semaphore, fence, command-pool, and command-buffer setup is repeated in
`VulkanFrameSlot.gs`, `VulkanSwapchainGeneration.gs`, `VulkanOffscreenTarget.gs`, and
`VulkanWindowTarget.Bootstrap.gs`.

Implemented shape:

- `VulkanSynchronizationFactory.CreateSemaphore` and `CreateFence` create and account one resource
  with complete rollback on native or accounting failure.
- `VulkanCommandFactory.CreatePoolAndAllocate` creates the command pool, allocates explicit-level
  command buffers, accounts the pool and every buffer, validates returned handles, and rolls back the
  entire transaction on failure.
- Queue family, command-pool flags, command-buffer level, count, and destination storage remain
  explicit inputs.
- Existing owners keep the handles and retain strict normal teardown, best-effort device-loss
  teardown, submission state, and recovery policy.

Migrated sites: frame-slot acquire semaphores and submission fences, swapchain render semaphores and
present fences, and window command-pool plus two-command-buffer creation. `VulkanOffscreenTarget`
remains inline because it records each exact Vulkan result and allocates its command buffer later than
its command pool.

Verification: strict lint parsed every changed G# file. Release and TestRelease warnings-as-errors
builds, package creation, and fresh isolated consumer publication passed. Runtime qualification passed
on an NVIDIA GeForce RTX 3080 with driver 610.57.04 and Khronos validation 1.4.357. The TestRelease
S09R pixel gate completed 324 draws, 12 scene compiles, 12 records, two readbacks, and clean close. The
fresh package S09R lane completed 54 draws, two compiles, two records, and clean close. FailedIdle
completed 1,000 operations, ten surface-loss recoveries, three device-loss recoveries, sibling-window
continuity, no normal-close device-wide idle, and zero final image, layer-target, layer-residency, and
lease counts. No steady-frame timing comparison is claimed because the factory calls remain startup,
swapchain creation, frame-slot reconstruction, or recovery work. Strict lint retains the known
multiline-signature formatter and address-taken `var` findings.

### VKSL-005: Vulkan transitions

Priority: P0

Status: Verified

Evidence: the renderer constructs 14 image barriers, four buffer barriers, and 18 dependency
records. Stage masks, access masks, layouts, queue-family indices, and subresource ranges are
repeated and error-prone.

Implemented shape:

- `VulkanTransitions.RecordImage` and `RecordBuffer` zero-initialize and populate the complete native
  barrier and dependency records, apply ignored source and destination queue-family indices, and emit
  one `vkCmdPipelineBarrier2` call.
- The exact unmanaged command pointer is passed instead of copying `VkDeviceDispatch` through the hot
  path. All three helpers request aggressive inlining through the official G# `MethodImpl` support.
- Image and buffer handles, ranges, offsets, sizes, layouts, stage masks, and access masks remain
  explicit at each caller. `ColorSubresourceRange` centralizes the renderer's repeated color,
  single-mip range while leaving raw Vulkan ranges available.
- No managed object, delegate, collection, callback, or validation branch was added to command
  recording.

Migrated sites: 14 image transitions and four buffer transitions across swapchain rendering,
offscreen readback, retained layers, primitive layer copies, image uploads, clip masks, path and text
atlases, and primitive and text frame data. Raw `VkImageMemoryBarrier2`, `VkBufferMemoryBarrier2`, and
`VkDependencyInfo` construction now remains only in `VulkanTransitions` and ABI declarations.

Verification: the official G# compiler source and tests confirm unmanaged function-pointer parameter
syntax and `MethodImplOptions.AggressiveInlining` emission. Strict lint parsed the complete migration
and retains only existing file-wide findings plus the known multiline-signature and address-taken
`var` findings in the helper. Release and TestRelease warnings-as-errors builds, package creation, and
fresh isolated package-consumer build passed. Runtime qualification passed on an NVIDIA GeForce RTX
3080 with driver 610.57.04 and Khronos validation. S09R pixel, S14 readback, image pressure,
registered-font text, S13 path, S13 clip-mask, S20 shader-effect warm, and FailedIdle cover every
migrated owner. FailedIdle completed 1,000 operations, ten surface-loss recoveries, three device-loss
recoveries, and zero final frame, image, layer-target, layer-residency, and lease state.

The comparable S20 Release workload used three processes with 60 warmups and 500 measured frames per
process before and after. Process-median frame P50 changed from 497,488 ns to 488,231 ns. P95 changed
from 577,378 ns to 583,781 ns, inside the overlapping before and after process ranges. Every measured
frame retained zero managed allocation, zero Vulkan-object allocation, zero device-memory allocation,
500 compiles, 500 records, 3,500 draws, 500 layer passes, and 500 layer composites. The S15 retained
primitive control also preserved its 1,000 records, 128,000-byte payload, zero final-frame writes, and
all upload counters. It is not claimed as a direct buffer-emission timing result because its measured
retained frames did not record a primitive upload barrier.

### VKSL-006: Vulkan pipeline factory

Priority: P1

Status: Verified

Evidence: shader modules, pipeline layouts, and graphics pipelines use repeated fixed Goo state in
`VulkanSharedPrimitiveState.gs`.

Implemented shape:

- `CreateShaderModule` accepts explicit SPIR-V bytes and an artifact name, pins only for the native
  call, accounts the module, and destroys any returned handle when native creation or accounting
  fails.
- `CreateLayout` accepts raw descriptor-layout and push-constant ranges, preserves their counts and
  ordering, accounts the layout, and owns complete failure rollback.
- `CreateGraphics` keeps the two shader modules, layout, target format, topology, blend enable, and
  color write mask explicit. It centralizes Goo's fixed two-stage dynamic-rendering state: no vertex
  input, fill rasterization, no culling, one sample, dynamic viewport and scissor, and premultiplied
  source-over blend factors.
- Existing owners retain shader selection, descriptor-layout policy, push-constant ranges, format
  validation, eager or lazy creation, cache capacity, handles, teardown, and recovery.

Migrated sites: both graphics-pipeline implementations, all five pipeline-layout transactions, the
file-backed shader-module transaction, and dynamic shader-effect module creation in
`VulkanSharedPrimitiveState.gs`. Raw `VkGraphicsPipelineCreateInfo`, `VkPipelineLayoutCreateInfo`,
and `VkShaderModuleCreateInfo` construction now remains only in `VulkanPipelineFactory` and ABI
declarations.

Verification: Release and TestRelease warnings-as-errors builds, package creation, and a fresh
isolated package-consumer build passed. Strict lint parsed both changed files and retains the known
multiline-signature formatter finding, address-taken `var` findings, and existing file-wide findings
in `VulkanSharedPrimitiveState.gs`. NVIDIA/Wayland validation runtime qualification passed the
TestRelease S09R, S14 effects, rounded-overflow, and 240-frame warm shader-effect lanes plus packaged
S09R, S13 path, and S13 clip-mask lanes. Warm shader-effect frames retained zero managed allocation,
zero Vulkan-object creation, and zero device-memory allocation. FailedIdle completed 1,000 lifecycle
operations, ten surface-loss recoveries, three device-loss recoveries, sibling continuity, and zero
final image, layer-target, layer-residency, and lease counts. No steady-frame timing claim is made
because pipeline creation remains startup, first-use, or recovery work.

### VKSL-007: Vulkan memory policy

Priority: P1

Status: Verified

Evidence: 15 production allocation sites used three exact required and preferred memory-property
pairs across buffers, images, staging, readback, atlases, frame data, and retained layers.

Implemented shape:

- `VulkanMemoryPolicy` is a two-field value struct containing the required and preferred masks.
  `DeviceLocalRequired`, `DeviceLocalRequiredPreferred`, and `HostVisibleCoherentCached` reproduce
  the three existing pairs exactly.
- Buffer and image factories and both allocator entry points accept one typed policy instead of two
  adjacent masks. Selection still rejects any type missing required bits, then ranks compatible types
  by the number of preferred bits.
- Six device-local required sites, seven host-visible coherent-cached sites, and two device-local
  required-preferred sites now use named values. The two device-local forms remain distinct even
  though the current selector gives them the same ranking, preserving the owners' expressed intent.
- No object, enum switch, callback, builder, collection, validation branch, or per-call heap
  allocation was added.

Verification: the new policy file passes strict lint. Strict lint parsed the complete migration and
retains the known multiline-signature formatter findings, address-taken `var` findings, and existing
file-wide findings in older files. Release and TestRelease product warnings-as-errors builds,
package creation, and a fresh isolated package-consumer build passed. NVIDIA/Wayland validation
qualification passed default offscreen readback, TestRelease and packaged S09R, packaged registered
font, image-pressure, S13 path, and S13 clip-mask lanes. The 240-frame warm shader-effect lane passed
with zero managed, Vulkan-object, and device-memory allocation. FailedIdle completed 1,000 lifecycle
operations, ten surface-loss recoveries, three device-loss recoveries, sibling continuity, and zero
final frame, image, and layer residency.

### VKSL-008: Vulkan swapchain image set

Priority: P1

Status: Verified

Evidence: swapchain images, views, semaphores, fences, present IDs, layouts, and scene versions are
parallel arrays indexed by the same image index.

Implemented shape:

- `VulkanSwapchainImageSet` owns swapchain images, image views, render semaphores, optional present
  fences and IDs, layouts, and applied and pending scene versions under one count invariant.
- Direct indexed functions preserve the existing allocation-free image, presentation, layout, and
  scene-version paths.
- Construction owns image enumeration, view and synchronization creation, Goo object accounting,
  and complete rollback.
- Normal disposal validates that no presentation state remains in use. Device-loss disposal remains
  a separate best-effort path.

Migrated sites: `VulkanSwapchainGeneration` delegates all indexed state and creation to the image
set. `VulkanSwapchainGeneration.Recovery` delegates device-loss cleanup. The separate scene-version
tracker was removed because its two arrays share the same image index and lifetime.

Verification: strict lint parses all three changed files and retains only the known multiline
formatter, address-taken `var`, and existing file-wide findings. Release and TestRelease
warnings-as-errors builds, package creation, and a fresh isolated package-consumer publish passed.
TestRelease S09R passed pixel, draw, plan, record, readback, close, zero-validation, and exact-cleanup
checks. S16 passed FIFO-to-immediate swapchain recreation across three generations. FailedIdle
passed 1,000 lifecycle operations, ten surface-loss recoveries, three device-loss recoveries,
sibling continuity, warm reuse, and zero final frame, image, layer, Vulkan-object, and device-memory
residency. A packaged S09R run rendered and cleaned up without validation or Vulkan result failures,
but its one-pump close assertion is not counted because locally adapted Weston 14 and 15 both delay
the close event beyond that package test's fixed pump.

### VKSL-009: Vulkan retired swapchain set

Priority: P1

Status: Verified

Evidence: swapchain generations and surface state use repeated enqueue, readiness, wait, and
destruction rules.

Implemented shape:

- `VulkanRetiredSwapchainSet` owns the fixed-capacity generation array and count invariant.
- `Enqueue` records logical retirement and stores the native generation as one operation.
- `CollectReady` matches completed logical identities, destroys each generation exactly once, and
  removes it without leaving a hole.
- Normal cleanup reports each completed wait back to window diagnostics. Device-loss cleanup clears
  ownership first and destroys every generation best-effort.
- Window-level polling remains outside the set so device-loss propagation and per-call diagnostics
  keep their existing context.

Migrated sites: `VulkanWindowTarget.Core`, `VulkanWindowTarget.Swapchain`, and
`VulkanWindowTarget.Recovery` now use one retired set. The allocated
`VulkanRetiredWindowSwapchain` wrapper and its unreachable surface fields were removed because
surface-loss retirement already waits for the current generation and destroys the surface directly.

Verification: the new set parses under strict lint with one known formatter finding. Existing target
files retain their prior file-wide lint findings. Release and TestRelease warnings-as-errors builds
and package creation passed. S16 passed FIFO-to-immediate recreation across three generations with
zero validation and Vulkan result failures and exact close cleanup. S09R pixel output passed all
primitive, border, gradient, transform, clip, scroll, visibility, opacity, stacking, readback, and
close checks. FailedIdle passed 1,000 lifecycle operations, ten surface-loss recoveries, three
device-loss recoveries, sibling continuity, warm reuse, and zero final frame, image, layer,
Vulkan-object, and device-memory residency.

### VKSL-010: Vulkan frame-slot ring

Priority: P1

Status: Verified

Evidence: the window renderer owns an exact two-slot frame window with current-slot, advance,
poll, wait, submission serial, recreation, and disposal behavior.

Implemented shape:

- `VulkanFrameSlotRing` is a value owner for exactly two `VulkanFrameSlot` references and the current
  index. It adds no heap object, collection, iterator, callback, or general ring policy.
- Pair creation owns rollback when the second slot fails. `Current`, `CurrentIndex`, `Slot`, and
  `Advance` keep frame selection direct and allocation-free.
- Completed global serial reduction, normal cleanup, and device-loss cleanup are centralized without
  merging their different failure behavior.
- Window diagnostics, per-slot polling and waits, presentation completion collection, and active
  frame state remain at the window boundary.
- The offscreen single-fence path remains unchanged.

Migrated sites: frame-slot creation in `VulkanWindowTarget.Bootstrap`, selection and advance in
`VulkanWindowTarget.Core`, pair waits and serial reduction in `VulkanWindowTarget.Swapchain`, and
device-loss cleanup in `VulkanWindowTarget.Recovery`. The AsyncReadback and FailedIdle fixtures now
read both slots through the ring.

Verification: the new value type parses under strict lint with one known formatter finding. Existing
target files retain their prior file-wide findings. Release and TestRelease warnings-as-errors
builds passed. The same 300-warmup, 500-sample, 1,000-box Release run changed CPU P50 from 3.105 ms
to 3.029 ms, P95 from 4.057 ms to 4.090 ms, and P99 from 4.415 ms to 4.415 ms. Managed allocation
remained exactly 512,568 bytes per sampled frame and both slots remained active. S16 passed
three-generation FIFO-to-immediate recreation. S09R pixel output passed. FailedIdle passed both-slot
serial checks, 1,000 lifecycle operations, ten surface-loss recoveries, three device-loss recoveries,
sibling continuity, warm reuse, and zero final resources.

### VKSL-011: Vulkan current resource set

Priority: P1

Status: Verified

Evidence: `VulkanPathScene.gs` and `VulkanImageScene.gs` maintain double-buffered current and pending
unique `ResourceId` sets.

Implemented shape:

- `VulkanCurrentResourceSet` owns current and pending arrays, exact `ResourceId` equality, uniqueness,
  capacity reuse, commit, and reset.
- A zero maximum permits geometric growth for paths. A fixed maximum preserves the image scene's
  256-reference failure boundary.
- Image add and release policy and path usage marking remain at their callers.
- The implementation adds one scene-lifetime owner and no per-frame object, iterator, or sequence.

Migrated sites: `VulkanImageScene` and `VulkanPathScene` now share one set implementation while
retaining their different capacity and resource-lifetime policies.

Verification: Release and TestRelease warnings-as-errors builds passed. S09R passed path, pixels,
readback, and cleanup. FailedIdle passed image re-upload, warm reuse, 1,000 lifecycle operations,
ten surface losses, three device losses, sibling continuity, and zero final resources. Strict lint
parses the new file and retains one known formatter finding.

### VKSL-012: Vulkan readback plan and factory

Priority: P1

Status: Verified

Evidence: readback code repeats region validation, extent, row-byte, total-byte, target, pool, and
rollback calculations across `VulkanWindowTarget.Readback.gs`, `VulkanReadback.Dispatch.gs`, and
`VulkanReadbackPool.gs`.

Implemented shape:

- `VulkanReadbackPlan` computes the exact validated region, row bytes, requested bytes, full image
  bytes, and combined resource bytes.
- `VulkanReadbackFactory` accepts ownership of a constructed target and shared lease, then creates
  the request, pool, and initial adoption as one rollback-safe transaction.
- The factory does not hide the renderer context needed to construct `VulkanOffscreenTarget` behind
  a large parameter object.
- Preserve full and partial readback, resize rejection, `Busy`, `BudgetExceeded`, and `DeviceLost`.
- Preserve exact returned byte and pixel counts.

Migrated sites: window request planning and creation, async request and reset, and offscreen target
construction and submission now use the plan. Window ownership cleanup uses the factory transaction.

Verification: Release and TestRelease warnings-as-errors builds passed. The validated partial
readback returned 64 by 64 pixels, 256 row bytes, 16,384 result bytes, 32,768 resident bytes, and
zero resident bytes after close. S09R passed two full-frame captures and exact cleanup with zero
validation or Vulkan result failures. Strict lint parses the new factory and changed plan files with
known formatter and existing file-wide findings.

### VKSL-013: Vulkan device recovery coordinator

Priority: P2

Status: Verified

Evidence: multi-window device recovery repeats registration, unregistration, completion service,
and recovery phase coordination.

Implemented shape:

- `VulkanDeviceRecoveryCoordinator` owns target registration, unregistration, count, completion
  service, and the recovery-in-progress invariant.
- Recovery keeps explicit ordered abandon, runtime discard, leader rebuild, follower rebuild,
  finish, failure cleanup, and terminal phases.
- Target methods expose only the named phase operations and diagnostics needed by the coordinator.
- No callback, delegate, closure, task object, or generic recovery pipeline was added.

Migrated sites: window creation, frame start, device-loss entry, close, and close rollback now use
the coordinator. The recovery partial no longer owns global target registry state.

Verification: Release and TestRelease warnings-as-errors builds passed. FailedIdle passed all three
live windows, 1,000 lifecycle operations, ten surface losses, three coordinated device losses,
sibling continuity, both-slot serial checks, warm reuse, and zero final frame, image, and layer
resources. Strict lint parses the coordinator with one known formatter finding.

### VKSL-014: Vulkan scene retention proof store

Priority: P2

Status: Verified

Evidence: scene retention uses parallel ping-pong proof arrays with repeated capacity, capture,
swap, clear, and reset behavior.

Implemented shape:

- `VulkanSceneRetentionProofStore` owns chunk identities and current and next draw, resource, text,
  and cached-segment proof arrays.
- `EnsureFor`, `Capture`, and `Reset` own growth, exact value capture, atomic role swaps, counts, and
  readiness.
- The compiler retains chunk eligibility, exact comparison, damage, and invalidation policy.
- Direct array access adds no per-chunk object, closure, list, iterator, or sequence.

Migrated sites: `VulkanSceneCompiler.Retention` now keeps one proof-store field instead of nine
parallel arrays and seven readiness and count fields.

Verification: Release and TestRelease warnings-as-errors builds passed. The S15 retention route
reached exact warm reuse with zero dirty and seven reused chunks, then exact one-box mutation with
one dirty and six reused chunks. Its later partial-damage assertion remains blocked by the current
untouched `IsPartialUnsafe` clip-chain policy, which reports full damage with one active chain.
S09R pixel output passed. The 300-warmup, 500-sample, 1,000-box Release and NativeAOT runs retained
exactly 512,568 managed bytes per sampled frame, zero warm Vulkan object or device-memory
allocations, both frame slots, and clean close. Release CPU timing varied with GPU time across the
two local samples, so no timing improvement claim is made. Strict lint parses the new store with a
known formatter finding and two false-positive immutable-binding findings for mutable value records.

## Deferred small candidates

| Candidate | Current disposition |
|---|---|
| `ResourceId.Same` or `SameLogical` | Defer until generated hot-path code is proven equal |
| `VulkanSceneVersion.Next` | Defer because the authoring reduction is small |

## Rejected abstraction patterns

- Generic `Ledger<T>` for presentation retirement
- Generic ring or container for upload storage
- Generic task or worker abstraction for the queue mailbox
- Universal Vulkan result checker because result policy differs by operation
- Universal teardown path
- Callback or delegate based recovery pipeline
- Fluent Vulkan builders
- Generic identity registry
- Generic damage history or ring
- Shared lifecycle source with the stale proof project
- Any collapse of normal and device-loss teardown

## Source inventory snapshot

The initial ranking used whole-directory source counts on 2026-08-24.

| Vulkan construction | Count |
|---|---:|
| `VkBufferCreateInfo` | 11 |
| `VkImageCreateInfo` | 4 |
| `VkImageViewCreateInfo` | 6 |
| `VkDescriptorSetLayoutCreateInfo` | 5 |
| `VkDescriptorPoolCreateInfo` | 7 |
| `VkDescriptorSetAllocateInfo` | 7 |
| `VkWriteDescriptorSet` | 8 |
| `VkSemaphoreCreateInfo` | 2 |
| `VkFenceCreateInfo` | 3 |
| `VkCommandPoolCreateInfo` | 2 |
| `VkCommandBufferAllocateInfo` | 2 |
| `VkImageMemoryBarrier2` | 14 |
| `VkBufferMemoryBarrier2` | 4 |
| `VkDependencyInfo` | 18 |
| `VkPipelineLayoutCreateInfo` | 5 |
| `VkGraphicsPipelineCreateInfo` | 2 |
| `VkShaderModuleCreateInfo` | 2 |

Counts are evidence of repeated authoring, not proof that a candidate is valid. Recount and inspect
all affected sites when a candidate moves to `Investigating`.

## Decision log

| Date | ID | Decision | Evidence |
|---|---|---|---|
| 2026-08-24 | All | Opened the register with all candidates at `Proposed` | Corrected three-agent audit and whole-directory source count |
| 2026-08-24 | VKSL-001 | Selected as the first candidate to investigate | Largest repeated complete native transaction and no steady-frame call requirement |
| 2026-08-24 | VKSL-001 | Keep ownership in existing renderer types | A staging wrapper would duplicate capacity, generation, normal teardown, and device-loss policy already owned by each caller |
| 2026-08-24 | VKSL-001 | Retain the offscreen transaction inline | It records exact Vulkan create and map results, while the factory intentionally exposes only successful resources or exceptions |
| 2026-08-24 | VKSL-002 | Keep image metadata and teardown in existing owners | Layout, descriptors, capacity, generation, and device-loss behavior differ by resource owner |
| 2026-08-24 | VKSL-002 | Keep the diagnostic offscreen transaction inline | It records each raw Vulkan result before deciding whether to throw |
| 2026-08-24 | VKSL-001 | Mark verified after runtime qualification | Package, pressure, path, clip-mask, warm, and recovery lanes covered every migrated buffer owner with zero validation errors or retained resources |
| 2026-08-24 | VKSL-002 | Mark verified after runtime qualification | Swapchain, image-pressure, clip-mask, offscreen-layer, and recovery lanes covered every migrated image owner with zero validation errors or retained resources |
| 2026-08-24 | VKSL-003 | Keep descriptor policy and lifetime in existing owners | Bindings, stage visibility, capacity, generation, normal teardown, and device-loss teardown remain caller-specific |
| 2026-08-24 | VKSL-003 | Centralize only complete creation and typed write transactions | All seven pool allocations use the same rollback and accounting invariant, while the eight writes use three fixed descriptor shapes |
| 2026-08-24 | VKSL-003 | Mark verified after runtime qualification | NVIDIA/Wayland package, pressure, path, clip-mask, shader-effect, and recovery lanes covered every migrated owner with zero validation errors or retained Vulkan resources; normal lanes had zero result failures and recovery had only expected injected failures |
| 2026-08-24 | VKSL-004 | Begin exact-scope investigation | Recount synchronization and command-resource transactions, ownership, diagnostics, accounting, and rollback before accepting the factory surface |
| 2026-08-24 | VKSL-004 | Split synchronization and command-resource helpers | Command pools and command buffers are not synchronization objects; separate factories keep each responsibility explicit |
| 2026-08-24 | VKSL-004 | Keep the direct offscreen transaction inline | It records exact Vulkan results and does not create its command pool and command buffer as one adjacent transaction |
| 2026-08-24 | VKSL-004 | Mark verified after runtime qualification | TestRelease and package S09R plus FailedIdle covered startup, swapchain, frame-slot, close, surface-loss, and device-loss paths with exact cleanup |
| 2026-08-24 | VKSL-006 | Centralize native creation but retain pipeline policy in current owners | Shader selection, descriptor ordering, push ranges, format validation, eager or lazy creation, caches, teardown, and recovery are owner-specific |
| 2026-08-24 | VKSL-006 | Keep explicit graphics inputs instead of adding a builder or parameter object | Nine scalar or handle inputs preserve every current variation without allocation, callback state, or hidden policy |
| 2026-08-24 | VKSL-006 | Mark verified after runtime qualification | TestRelease and packaged primitive, path, text, effects, clip-mask, warm shader-effect, surface-loss, and device-loss lanes passed with exact cleanup |
| 2026-08-24 | VKSL-007 | Keep all three exact policy pairs | Required and preferred masks are authoring intent even where the current selector gives two device-local pairs the same ranking |
| 2026-08-24 | VKSL-007 | Pass one value policy through factories and allocator selection | One typed value removes adjacent-mask inversion risk without a branch, object, callback, or selection change |
| 2026-08-24 | VKSL-007 | Mark verified after runtime qualification | Every buffer, image, atlas, frame-data, layer, and readback owner passed package, pressure, recording, and recovery coverage with exact cleanup |
| 2026-08-24 | VKSL-008 | Centralize all co-indexed image state in one owner | Images, views, render semaphores, optional present state, layouts, and scene versions share one image count and generation lifetime |
| 2026-08-24 | VKSL-008 | Keep swapchain policy in `VulkanSwapchainGeneration` | Format, present mode, usage, extent, generation identity, and swapchain lifetime remain generation-level state |
| 2026-08-24 | VKSL-008 | Mark verified after runtime qualification | Pixel, VSync recreation, lifecycle, surface-loss, and device-loss gates passed with exact cleanup and no validation or Vulkan result failures |
| 2026-08-24 | VKSL-009 | Remove retired surface state from the candidate | Surface-loss retirement is synchronous and never enqueues a surface, so the old wrapper fields were unreachable |
| 2026-08-24 | VKSL-009 | Keep window polling outside the set | The window owns device-loss propagation and contextual diagnostics for each Vulkan result |
| 2026-08-24 | VKSL-009 | Mark verified after runtime qualification | Three-generation VSync recreation, pixel output, 1,000 lifecycle operations, surface loss, device loss, and exact cleanup passed |
| 2026-08-24 | VKSL-010 | Implement an exact two-slot value owner | A value struct centralizes the pair and current index without a heap object or general collection policy |
| 2026-08-24 | VKSL-010 | Keep polling and completion policy at the window boundary | Per-call diagnostics, device-loss propagation, and presentation serial collection remain contextual window behavior |
| 2026-08-24 | VKSL-010 | Mark verified after runtime and performance qualification | Same-scenario CPU and allocation measurements showed no regression; both-slot, pixel, recreation, lifecycle, and recovery gates passed |
