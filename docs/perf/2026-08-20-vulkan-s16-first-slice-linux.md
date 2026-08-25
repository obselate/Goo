# Vulkan S16 first slice on Linux

Date: 2026-08-20
Branch: `gaps-and-reductions`
Status: bounded first slice only. S16 is not complete.

## Accepted slice

The public `Window.VSync` property is per-window. The internal cadence for each window is derived from
the display that contains it. One process-wide scheduler owns fractional high-resolution deadlines and
rotates due windows fairly. Dirty idle windows submit zero frames after initial work. Unavailable,
minimized, occluded, or GPU-deferred windows are skipped in the implemented polling paths and do not
delay siblings. Display, mode, and lifecycle changes reset cadence. A transient invalid display query
retains the last valid display sample.

`VSync=true` selects FIFO. `VSync=false` selects Immediate, then Mailbox, then FIFO, and never
FIFO_RELAXED. Both modes are display-rate paced under `Window.Run`. `Pump` and `PumpScheduled` remain
caller-paced. Timer-only scheduler service banks simulation time for the next permitted frame while wall
time remains exact. The uncapped path is an internal benchmark seam.

Frame-slot fence/acquire waits and swapchain-recreation presentation waits now poll and defer. This
bounded behavior does not make queue submit/present non-blocking. Normal window close still invokes
device-wide idle. Closing the owner window does not strand live siblings.

## Evidence

The final integrated deterministic TestRelease gate reported:

```text
s16-frame-pacing-gate: rates=60,144,60000/1001 anchored=1 reset=1 defer=1 uncapped=1 presentModes=1
```

The final integrated real VSync transition gate reported:

```text
s16-vsync-transition-gate: initial=fifo off=immediate generations=3 close=1
```

The fresh final package three-window smoke reported:

```text
presentCount=6 resultFailureCount=0 validationErrorCount=0 fatalCode=0
```

It also left zero resources. Default async readback and the S09R and S14 gates passed. The current
Linux environment has no Vulkan validation layer installed, so these are not validation-layer results.
No performance improvement is claimed.

The focused live gate observes a VSync-off animated window beside a clean idle window and bounds
submissions by the active display rate:

```text
s16-live-frame-pacing-gate: active_vsync=0 elapsed_ms=552 rate_hz=144.001 active=62 idle=2 cap=88 close=1
```

Owner-close sibling continuity is covered by the separate three-window package smoke.

## Remaining work

- Remove the device-wide idle from normal window close.
- Isolate queue submit/present calls that can block the scheduler.
- Add per-window exception isolation.
- Use actual presentation feedback instead of nominal refresh when available.
- Complete the full T04 lifecycle, device, and surface recovery matrix, including the all-live-surface
  recovery audit.
- Qualify cursor arbitration.
- Repeat the contract and recovery gates on Windows in S19.
