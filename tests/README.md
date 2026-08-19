# Tests

Goo release verification uses a small set of focused build, ABI, Vulkan, recovery,
and package-consumer lanes. The stale `Goo.Tests` xUnit project is not a release gate.

## Legacy suite

`tests/Goo.Tests` is legacy and currently stale. It still references SkiaSharp,
`Goo.InternalTextInterop`, and old text paths. Do not use its selectable lanes or
historical case counts as current release coverage. Remove or migrate that project
after the Vulkan test surface is complete.

## Focused lanes

| Lane | Entry point | Scope |
| --- | --- | --- |
| Goo build | `Goo/Goo.gsproj` | Release build with warnings treated as errors |
| Vulkan text provider ABI | `Goo.VulkanAbiSmoke` | Provider capacity, buffer bounds, reuse, disposal, registered-font cache budget |
| Vulkan text shaping | `Goo.VulkanProof` with `GOO_VK_TEXT_E2E=1` | Metrics, shaping, features, variations, collections |
| Vulkan color text | `Goo.VulkanProof` with `GOO_VK_TEXT_PAINT_E2E=1` | COLRv0 and COLRv1 paint encoding |
| Vulkan text effects | `Goo.VulkanProof` with `GOO_VK_TEXT_EFFECT_READBACK=1` | Vulkan text stroke and sharp shadow readback |
| Vulkan color readback | `Goo.VulkanProof` with `GOO_VK_TEXT_PAINT_READBACK=1` | Vulkan color glyph readback |
| Failed-idle recovery | `Goo.FailedIdleSmoke` | Surface loss, device recovery, post-recovery text, geometry, and clean shutdown |
| Registered-font package lane | `Goo.PackageSmoke` with `GOO_REGISTERED_FONT_SMOKE=1` | Fresh packed consumer font corpus |
| Text-controls package lane | `Goo.PackageSmoke` with `GOO_NATIVE_TEXT_CONTROLS_SMOKE=1` | CJK, RTL, combining marks, ligatures, editor, IME, geometry, and window reopen |
| Text-atlas package lane | `Goo.PackageSmoke` with `GOO_NATIVE_TEXT_ATLAS_SMOKE=1` and `GOO_VK_TEXT_ATLAS_BYTES=8192` | Small-page pressure, upload, eviction, retirement, and bounded residency |
| Image-pressure package lane | `Goo.PackageSmoke` with `GOO_NATIVE_IMAGE_PRESSURE_SMOKE=1` | Image byte-budget plateau, eviction, retirement, and zero GPU image state after close |

The Vulkan lanes run under headless Wayland with
`VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation`. CI requires that validation layer
and the Mesa Vulkan software driver to be present before running them.

## Local build and proof commands

Build SDL first when a target opens a window:

```sh
.github/scripts/build-sdl-linux-x64.sh artifacts/native/libSDL3.so
dotnet build Goo/Goo.gsproj -c Release -p:TreatWarningsAsErrors=true
dotnet build tests/Goo.VulkanAbiSmoke/Goo.VulkanAbiSmoke.csproj -c Release \
  -p:TreatWarningsAsErrors=true \
  -p:GooLinuxSdlPath="$PWD/artifacts/native/libSDL3.so"
dotnet build proofs/Goo.VulkanProof/Goo.VulkanProof.gsproj -c Release \
  -p:TreatWarningsAsErrors=true
dotnet build tests/Goo.FailedIdleSmoke/Goo.FailedIdleSmoke.gsproj -c Release \
  -p:TreatWarningsAsErrors=true \
  -p:GooLinuxSdlPath="$PWD/artifacts/native/libSDL3.so"
```

Run the ABI and recovery lanes:

```sh
dotnet tests/Goo.VulkanAbiSmoke/bin/Release/net10.0/Goo.Tests.dll
SDL_VIDEODRIVER=wayland LIBGL_ALWAYS_SOFTWARE=1 \
  VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation \
  .github/scripts/with-headless-wayland.sh env GOO_VK_DIAGNOSTICS=1 \
  dotnet tests/Goo.FailedIdleSmoke/bin/Release/net10.0/Goo.Tests.dll
```

Run a Vulkan proof text lane by changing the requested variable:

```sh
export SDL_VIDEODRIVER=wayland
export LIBGL_ALWAYS_SOFTWARE=1
export VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation
export LD_LIBRARY_PATH="$PWD/artifacts/native${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
.github/scripts/with-headless-wayland.sh env GOO_VK_TEXT_E2E=1 \
  dotnet proofs/Goo.VulkanProof/bin/Release/net10.0/Goo.VulkanProof.dll
```

Use `GOO_VK_TEXT_PAINT_E2E`, `GOO_VK_TEXT_EFFECT_READBACK`, or
`GOO_VK_TEXT_PAINT_READBACK` for the other proof lanes.

## Fresh package consumer

Pack and publish the consumer before running package lanes:

```sh
dotnet pack Goo/Goo.gsproj -c Release -o artifacts/packages \
  -p:TreatWarningsAsErrors=true \
  -p:GooLinuxSdlPath="$PWD/artifacts/native/libSDL3.so"
dotnet publish tests/Goo.PackageSmoke/Goo.PackageSmoke.gsproj -c Release \
  -r linux-x64 --self-contained false -p:UseAppHost=false \
  --configfile tests/Goo.PackageSmoke/NuGet.config -o artifacts/publish
```

Run the three package lanes sequentially under headless Wayland with
`GOO_VK_DIAGNOSTICS=1`. The atlas lane also requires
`GOO_VK_TEXT_ATLAS_BYTES=8192`:

```sh
SDL_VIDEODRIVER=wayland LIBGL_ALWAYS_SOFTWARE=1 \
  VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation \
  .github/scripts/with-headless-wayland.sh env \
  GOO_VK_DIAGNOSTICS=1 GOO_REGISTERED_FONT_SMOKE=1 \
  dotnet artifacts/publish/Goo.PackageSmoke.dll
```

Replace `GOO_REGISTERED_FONT_SMOKE=1` with
`GOO_NATIVE_TEXT_CONTROLS_SMOKE=1`, or with
`GOO_NATIVE_TEXT_ATLAS_SMOKE=1 GOO_VK_TEXT_ATLAS_BYTES=8192`.
Use `GOO_NATIVE_IMAGE_PRESSURE_SMOKE=1` for the image cache pressure lane.

Stage the minimal release bundle after the focused package lanes:

```sh
.github/scripts/stage-linux-x64.sh \
  artifacts/publish artifacts/linux-x64 artifacts/symbols
```

The normal package validation, release bundle allowlist, and non-S11 package smoke
remain separate release checks.
