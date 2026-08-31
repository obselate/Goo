# Windows release qualification

Status: implemented packaging and qualification lane, not yet qualified on real GPU hardware.

## Architecture decision

Windows uses the same public `Window` API and the same internal SDL 3 host, Vulkan renderer, input translation, clipboard, cursor, and IME boundary as Linux. Goo does not expose a backend selector or public platform adapter. Add internal per-OS services only when an OS-owned capability such as UI Automation, dialogs, tray integration, or notifications requires one.

This keeps the surface consistent with ADR-0001, ADR-0003, ADR-0004, and ADR-0005. A Windows support claim still requires evidence from the published package on Windows. The package now carries the pinned SDL 3.4.0 `SDL3.dll` beside the existing Windows HarfBuzz payloads. Source builds use a .NET XML documentation merger and do not require Python.

## Evidence lanes

| Lane | Purpose | Claim boundary |
| --- | --- | --- |
| Windows 11 QEMU plus lavapipe | Software Vulkan behavior, package closure, NativeAOT startup, deterministic regressions | No GPU performance claim |
| Windows 11 plus physical GPU | WSI, resize, minimize and restore, multi-window scheduling, native image lifetime, frame timing, allocation timing | Required before Windows is marked qualified |

The real-GPU bundle runs one 1,280 by 720 end-to-end dirty-frame workload with VSync disabled after 32 warmup frames and records 240 samples. It reports P50, P95, P99, maximum frame time, throughput, and managed allocation percentiles. It also runs primitive, resize and state, and multi-window behavior lanes. Goo diagnostics record the Vulkan physical device and final counters. Compare results only within the same lane and driver class. Do not compare lavapipe timing to physical GPU timing.

## Software baseline

The 2026-08-31 QEMU run used Windows 11 build 26200.9168, Microsoft Basic Display Adapter, and llvmpipe with LLVM 21.1.8 through Vulkan 1.4.335. All four NativeAOT lanes passed. The dirty-frame CPU submission workload measured 41.3 us P50, 52.7 us P95, 63.8 us P99, 65.9 us maximum, and 13,600 B managed allocation P50 and P95. This is regression evidence for the software lane only.

## Artifact

`artifacts/Goo.0.3.0-windows-x64-nativeaot.zip` is a self-contained NativeAOT package consumer. Run `run-windows-qualification.ps1` from a normal signed-in Windows desktop and return the complete timestamped results directory.
