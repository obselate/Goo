# Vulkan S16-D02 Linux control

Date: 2026-08-21

Status: accepted pre-change control for queue-call isolation. This is not Q10 evidence and does not
claim a performance improvement.

## Candidate

| Field | Value |
|---|---|
| Branch | `gaps-and-reductions` |
| Source commit | `8354cebd872796f03d9aabb50a25657658ea39eb` |
| Source state | Dirty, 192 entries before repository-local audit skills were added |
| Built assembly SHA-256 | `101035e07f405cd1027409d6c651ea07275af37d18aad1bc55355ada98d48473` |
| Built assembly bytes | `146432` |
| OS | CachyOS, Linux 7.1.8-1-cachyos x86_64 |
| SDK | .NET SDK 10.0.111 |
| GPU | NVIDIA GeForce RTX 3080 |
| Driver | 610.57.04 |
| Vulkan | 1.4.341 |
| Desktop | KDE Wayland through `wayland-0` |
| Validation | `VK_LAYER_KHRONOS_validation` |

The build used the exact dirty product candidate. Repository-local skill files added after the build do
not affect the product or fixture assembly.

## Build

```sh
dotnet build tests/Goo.AsyncReadbackSmoke/Goo.AsyncReadbackSmoke.gsproj \
  -c Release \
  -t:Rebuild \
  -p:TreatWarningsAsErrors=true \
  -p:GooLinuxSdlPath="$PWD/artifacts/native/libSDL3.so" \
  -p:IncludeTestFixtures=true \
  -p:GooTestFixturesProps="$PWD/tests/Goo.AsyncReadbackSmoke/Goo.AsyncReadbackFixtures.props"
```

Result: pass with 0 warnings and 0 errors.

## Workload

Three fresh processes ran the focused S16 live frame-pacing gate. Each process opened one animated
VSync-off window and one clean idle window for 552 ms. The gate bounded active submissions by the
reported display cadence and required the idle window to stop after initial work.

```sh
tool_root="$(head -n 1 /tmp/goo-s19-tools.path)"
validation_root="$tool_root/root"
SDL_VIDEODRIVER=wayland \
WAYLAND_DISPLAY=wayland-0 \
GOO_VK_DIAGNOSTICS=1 \
GOO_NATIVE_S16_LIVE_FRAME_PACING_GATE=1 \
VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation \
VK_LAYER_PATH="$validation_root/usr/share/vulkan/explicit_layer.d" \
LD_LIBRARY_PATH="$validation_root/usr/lib:$PWD/tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0" \
dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
```

## Results

| Process | Elapsed, ms | Reported Hz | Active submits | Idle submits | Submit cap | Managed B | Validation errors | Result failures |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | 552 | 60 | 27 | 2 | 42 | 0 | 0 | 0 |
| 2 | 552 | 60 | 27 | 2 | 42 | 0 | 0 | 0 |
| 3 | 552 | 60 | 27 | 2 | 42 | 0 | 0 | 0 |

Each process recorded 29 plan compilations, command records, submits, and presents. Final counters
reported zero fatal code, zero live device-memory bytes, zero allocator bytes, and zero surface or
device recoveries.

## Raw evidence

| File | SHA-256 |
|---|---|
| `artifacts/reports/core-linux/s16-live-before-run-1.txt` | `2c62921a287a0c9cf5a68c768af07f63ee35e0742c8646db43f730ede7e67b04` |
| `artifacts/reports/core-linux/s16-live-before-run-2.txt` | `c7795240a1ad94fec677e972856be8849d76bfb6a0b00c4f6ba05964bcad99ef` |
| `artifacts/reports/core-linux/s16-live-before-run-3.txt` | `5f2eed9fd3c78372e68bf5fa67c19f3b0c866e9edbec6ab73d1df11fefb56e08` |

## Interpretation

This control establishes deterministic visible scheduler behavior and zero observed main-thread managed
allocation before D02. It does not inject a blocked Vulkan queue call, report GPU timing, or prove
cross-window queue isolation. The D02 gate must add those behavior checks without regressing this
control.
