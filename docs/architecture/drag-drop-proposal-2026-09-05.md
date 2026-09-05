# Drag/drop primitive proposal, 2026-09-05

Status: the in-app phase was implemented on 2026-09-05. See the [current input API](../api/input.md). The research below records the design reviewed at commit `80b72f8fcba26b91a3d3d4e1d0a173833751fc60`. Native inbound and outbound drag remain separate future work.

## Decision

Implement an in-app pointer drag/drop coordinator first. Attach one optional `DragSource` descriptor and one optional `DropTarget` descriptor to `Blob`, store their runtime bindings as sparse node metadata, and run the interaction through the existing pointer coordinator. Keep native file/text drops as a later host event. Defer native outbound drag because SDL 3.4.0 does not expose a portable source-side drag API.

The first phase should provide payload transfer, target negotiation, deterministic lifecycle, and cancellation. It should not add a drag ghost, global cursor policy, automatic scrolling, external application transfer, or generic keyboard target navigation.

## Capability at the initial review

At the initial review, Goo had the mechanics needed for an in-app coordinator but no data drag/drop primitive.

- `Goo/Input/PointerEvent.gs:20-118` exposes pointer identity, device, window and local coordinates, buttons, modifiers, propagation control, default prevention, and callback-scoped `Capture()` and `ReleaseCapture()`.
- `Goo/Input/PointerInput.Dispatch.gs:19-80` retains a captured node and initiating button, revalidates that the node remains mounted and input-enabled, and clears capture after the matching button release.
- `Goo/Input/PointerInput.Dispatch.gs:176-253` bubbles pointer callbacks from the hit leaf through its ancestors and computes local coordinates through the current transform.
- `Goo/Input/PointerInput.Dispatch.gs:256-290` and `:305-328` already cancel interaction and release capture on focus loss, tree invalidation, reset, and pointer cancellation.
- Text selection already uses a four logical-pixel movement threshold in `Goo/Input/PointerInput.gs:778-783`.
- The Gallery magnets implement movement manually with `OnPointerDown`, `OnPointerMove`, `OnPointerUp`, `OnPointerCancel`, capture, and release in `apps/Goo.Gallery/Views/StateSurfacesChapter.gs:477-509` and `:670-703`. They separately expose arrow-key movement and an accessibility action. This is the concrete duplicated policy that a library primitive can remove.
- `Goo/Window/WindowParts/Window.DragRegion.gs` only configures native undecorated-window movement through the platform hit-test result `Draggable`. It is unrelated to payload drag/drop.
- `Goo/Platform/WindowHost.gs` has pointer, wheel, key, text, and composition events. `Goo/Platform/Sdl/SdlHost.Events.gs` dispatches those events but ignores SDL drop events.
- `Goo/Input/HitPolicy.gs` and `Goo/Tree/Reconciler.gs:311-340` derive hit participation and input invalidation from attached handlers. Drag source and target descriptors must participate in the same decisions.

Pointer capture in Goo is routing capture within one Goo window. It is not native global mouse capture and cannot implement dragging to another application.

## SDL and platform boundary

The repository pins `Hexa.NET.SDL3` 1.2.17 in `Directory.Packages.props`. Its bundled Linux library identifies itself as SDL 3.4.0. The matching [SDL 3.4.0 event header](https://github.com/libsdl-org/SDL/blob/release-3.4.0/include/SDL3/SDL_events.h#L232-L236) defines inbound `SDL_EVENT_DROP_FILE`, `DROP_TEXT`, `DROP_BEGIN`, `DROP_COMPLETE`, and `DROP_POSITION`. [`SDL_DropEvent`](https://github.com/libsdl-org/SDL/blob/release-3.4.0/include/SDL3/SDL_events.h#L930-L941) carries a destination window, window-relative position, optional source application, and file or text data.

SDL's [drop event implementation](https://github.com/libsdl-org/SDL/blob/release-3.4.0/src/events/SDL_dropevents.c#L30-L94) inserts a begin event when required, retains the last position for later file/text/complete events, and clears that state on completion. SDL's [event queue implementation](https://github.com/libsdl-org/SDL/blob/release-3.4.0/src/events/SDL_events.c#L279-L298) copies and links drop strings to temporary event memory. Goo must copy source and data strings synchronously while dispatching the SDL event if it retains them.

The SDL 3.4.0 public header and API index contain no source-side start-drag function. This is an API-surface inference, not a statement that desktop operating systems cannot initiate drag. SDL supplies portable inbound delivery, while outbound drag requires platform-specific integration.

- Wayland [`wl_data_device.start_drag`](https://wayland.freedesktop.org/docs/html/apa.html#protocol-spec-wl_data_device-request-start_drag) requires a source, origin surface, optional icon surface, and serial from the active implicit grab. The data source advertises MIME types and handles accepted actions, cancellation, and completion. Targets receive enter, motion, leave, and drop through the data-device protocol.
- Windows [`DoDragDrop`](https://learn.microsoft.com/en-us/windows/win32/api/ole2/nf-ole2-dodragdrop) enters the OLE drag loop with an `IDataObject`, `IDropSource`, allowed effects, and an output effect. The [COM drag/drop model](https://learn.microsoft.com/en-us/windows/win32/com/drag-and-drop) requires registered targets and explicit enter, over, leave, drop, cancel, and completion behavior.
- macOS [`NSView.beginDraggingSession`](https://developer.apple.com/documentation/appkit/nsview/begindraggingsession%28with%3Aevent%3Asource%3A%29) requires dragging items, the originating `NSEvent`, and an `NSDraggingSource`, and returns an [`NSDraggingSession`](https://developer.apple.com/documentation/appkit/nsdraggingsession) with its own source lifecycle.

These protocols need native payload representation, MIME or pasteboard negotiation, an icon, operation effects, cancellation, and completion. They should be a separate host capability with explicit platform availability.

## API alternatives

### A. Source and target descriptors on Blob, recommended

```text
Blob.DragSource DragSource?
Blob.DropTarget DropTarget?

DragSource.Create(DragStartEvent) -> DragData?
DragSource.End(DragEndEvent)

DropTarget.Query(DragEvent) -> DragEffect
DropTarget.Changed(DragEvent)
```

`DragData` contains a non-null `object Value` and allowed effects. `DragEffect` has `None`, `Copy`, and `Move`. `DragEvent` identifies `Enter`, `Move`, `Leave`, or `Drop` and carries the payload, pointer identity, device, modifiers, window position, target-local position, allowed effects, and selected effect. `DragEndEvent` reports `Dropped` or `Canceled` and the final effect.

This groups coherent behavior, permits sparse runtime storage, and avoids adding six independent callbacks to every node. A descriptor can be retained and reused across builds. It adds a small descriptor type surface and requires clear rules for updating callback bindings during reconciliation.

### B. Direct Blob callbacks

Add `OnDragStart`, `OnDragEnter`, `OnDragMove`, `OnDragLeave`, `OnDrop`, and `OnDragEnd`, plus source allowed effects.

This matches existing pointer authoring and is immediately discoverable. It expands `Blob`, reconciler copies, node storage, hit policy, and API documentation for every callback. Partial callback combinations are easy to configure incorrectly. It is acceptable if Goo deliberately favors a flat callback surface over sparse metadata, but it is not the smallest runtime footprint.

### C. Imperative start from PointerEvent

Add `PointerEvent.BeginDrag(value, effects)` and only define target callbacks.

This has the smallest source API and gives consumers direct threshold control. It makes every consumer reproduce threshold detection, click suppression, capture, cancellation, and source-end cleanup. It does not satisfy the goal of a library-owned primitive and should not be selected for phase 1.

## Recommended phase 1 semantics

1. On primary-button press over a source, retain a candidate. Do not create or retain its payload yet.
2. Cancel the candidate if the press is released, canceled, disabled, or removed before crossing four logical pixels. Preserve normal click behavior in that case. Escape cancels an active drag.
3. At the threshold, call `DragSource.Create` once. A null result rejects the drag. A result starts the session, captures the source, suppresses the source click, and strongly retains `DragData.Value`.
4. While capture routes pointer callbacks to the source, run a second normal hit test at the window position for drop negotiation. Start with the deepest target and walk ancestors until `Query` returns one effect allowed by the source. `None` rejects that target.
5. Deliver `Leave` once when the selected target changes, then `Enter` once for the new target. Deliver `Move` while it remains selected. Re-hit and re-query when pointer position or modifiers change, after relevant layout or input invalidation while the pointer is stationary, and immediately before release. This prevents a stale target or effect after layout movement, disablement, clipping, or a final modifier change.
6. On primary-button release, use that fresh result to deliver `Drop` once to the current accepting target, then `End(Dropped, effect)` at most once if the source remains mounted. If no target accepts, end as canceled. Goo reports Move but never removes or disposes the payload. The source owns any mutation after successful Move.
7. Cancel on Escape, `PointerCancel`, focus loss, window close, source removal or disable, and an unhandled drag callback exception. If a target is detached, clear it without calling its stale handler. Deliver `Leave` only when the owner is still mounted and valid. Source removal terminates the session without calling a detached source. Consumers clear their own drag presentation state during unmount.
8. Revalidate source and target attachment after every callback because callbacks can rebuild the tree. Resolve callbacks from the current mounted owner rather than retaining callback delegates across rebuilds. Run internal session cleanup exactly once through one `finally` path so callback failure cannot retain capture, payload, or target state. Deliver `End` at most once while the source remains mounted. Rethrow the original callback failure after cleanup.
9. Retain the payload only from accepted start through internal terminal cleanup, including any eligible terminal source callback. Goo never calls `Dispose` on it. All event values are callback-scoped snapshots. A consumer must copy any data it retains.
10. Support one active drag per window. Ignore secondary contacts for starting a session. Preserve the existing pointer-contact tracking so a second pointer cannot end the first pointer's drag.

No drag preview is required. Consumers can rebuild an overlay from source lifecycle state. No automatic edge scroll is required. Correct autoscroll needs a timer while the pointer is stationary, nested-scroll selection, velocity policy, and cancellation integration. Add it only with a concrete control use case.

Generic drag must not compete with existing specialized interactions. Native window drag regions remain owned by the platform hit test and cannot also start data drag. Text selection and scrollbar-thumb drag keep their current priority when they claim the press or capture. A generic candidate may start only from an eligible source on an otherwise unclaimed primary press. Explicit `PreventDefault` or capture by another owner before threshold cancels the candidate. A future control that intentionally makes selected text draggable needs an explicit control-owned bridge rather than implicit arbitration.

The pointer API alone is not an accessible reorder operation. Phase 1 documentation must require an equivalent keyboard and accessibility action where the operation matters. Existing `OnKeyDown` and accessibility actions are sufficient for the Gallery magnet pattern. A generic framework cannot infer target order, insertion meaning, or the correct spoken operation. A later domain control may offer an imperative move operation shared by pointer, keyboard, and accessibility paths.

## Native inbound phase

Add native file/text delivery separately after the in-app phase. `SdlHost` should copy every SDL string during dispatch and accumulate one sequence from Begin through Complete. Preserve multiple file and text items, the last known window-relative position, and the optional source application.

SDL drop events do not carry an accept/reject exchange or a resulting Copy/Move effect. Treat completion as an already-delivered import/open request. Expose it as a window-level native-drop callback first, or route the completed batch to one explicitly marked native-drop target after the host owns the copied batch. Do not feed it into in-app `DragEffect` negotiation. Goo must not open files, dereference paths, or dispose consumer payloads automatically.

Native outbound drag remains out of scope until Goo has a platform-host abstraction for offered formats, lazy data provision, allowed effects, icon surface, cancellation, completion, and capability reporting.

## Verification plan

Use focused end-to-end input tests around the real coordinator and one native integration lane.

- In-app lifecycle: below-threshold click, exact threshold start, one create, at most one end, one drop, exactly one internal cleanup, and correct click suppression.
- Targeting: deepest accepting target, rejecting-child ancestor fallback, clipped and disabled targets, transformed local positions, enter/move/leave order, modifier-driven effect changes, stationary-pointer layout invalidation, and a final release-time re-query.
- Cancellation: Escape, pointer cancel, focus loss, source removal, target removal, window close, and callback exception. Each case must release capture and payload and must not later drop or call a detached owner.
- Arbitration: native window drag, text selection, and scrollbar drag keep their current behavior. Prevented or separately captured presses must not start a generic drag.
- Reentrancy: source and target rebuilds from Create, Query, Changed, Drop, and End. The next callback must use current bindings only when the same mounted owner remains valid.
- Multiple contacts: only the initiating pointer can move, release, or cancel its session.
- Ownership: a weak-reference payload remains alive until internal terminal cleanup, becomes collectible afterward, and is never disposed by Goo.
- Rendering/input regression: preserve queue wake, queue isolation, hit testing, normal capture, scrollbar drag, text selection, and Gallery magnet keyboard behavior.
- Native inbound: one Begin, several Position/File/Text events, Complete, optional null source, multi-item ordering, window routing, synchronous string copy, and close during a sequence. Qualify one real file-manager text/file drop on Linux, Windows, and macOS when those platforms are available.

## Bounded implementation order

1. Add descriptor/event types and sparse node metadata.
2. Add one in-app coordinator state machine to `PointerInput` and integrate drag attachments with hit policy and reconciliation.
3. Convert one Gallery magnet example to prove API size, pointer behavior, and keyboard parity.
4. Run the focused lifecycle and existing input queue gates.
5. Review native inbound SDL batching as a separate change.
6. Do not begin outbound native drag until platform capabilities and at least one real cross-application use case are defined.
