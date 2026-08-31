#!/usr/bin/env bash
set -euo pipefail

publish="${1:?usage: stage-windows-x64-nativeaot.sh PUBLISH_DIR BUNDLE_DIR SYMBOLS_DIR}"
bundle="${2:?usage: stage-windows-x64-nativeaot.sh PUBLISH_DIR BUNDLE_DIR SYMBOLS_DIR}"
symbols="${3:?usage: stage-windows-x64-nativeaot.sh PUBLISH_DIR BUNDLE_DIR SYMBOLS_DIR}"

runtime_files=(
  Goo.PackageSmoke.exe
  SDL3.dll
  goo-harfbuzz-gpu.dll
  goo-harfbuzz.dll
  text-native-build.json
  run-windows-qualification.ps1
)
vulkan_files=(
  Vulkan/Runtime/HarfBuzz-COPYING.txt
  Vulkan/Shaders/analytic.vert.spv
  Vulkan/Shaders/analytic_blend.frag.spv
  Vulkan/Shaders/analytic_border.frag.spv
  Vulkan/Shaders/analytic_linear4.frag.spv
  Vulkan/Shaders/analytic_radial4.frag.spv
  Vulkan/Shaders/analytic_sampled_image.frag.spv
  Vulkan/Shaders/analytic_shadow.frag.spv
  Vulkan/Shaders/analytic_solid.frag.spv
  Vulkan/Shaders/clip_mask.frag.spv
  Vulkan/Shaders/clip_mask.vert.spv
  Vulkan/Shaders/harfbuzz-14.3.1.provenance.json
  Vulkan/Shaders/hb_gpu.vert.spv
  Vulkan/Shaders/hb_gpu_draw.frag.spv
  Vulkan/Shaders/hb_gpu_paint.frag.spv
  Vulkan/Shaders/lava.frag.spv
  Vulkan/Shaders/path_band.frag.spv
  Vulkan/Shaders/path_band.vert.spv
  Vulkan/Shaders/shader-manifest.json
  Vulkan/Shaders/solid_quad.frag.spv
  Vulkan/Shaders/solid_quad.vert.spv
)

rm -rf "$bundle" "$symbols"
mkdir -p "$bundle" "$symbols"
for name in "${runtime_files[@]}" "${vulkan_files[@]}"; do
  test -f "$publish/$name"
  install -Dm0644 "$publish/$name" "$bundle/$name"
done
chmod 0755 "$bundle/Goo.PackageSmoke.exe"
install -m0644 tests/Goo.PackageSmoke/WINDOWS-QUALIFICATION.txt "$bundle/WINDOWS-QUALIFICATION.txt"
install -m0644 "$publish/Goo.PackageSmoke.pdb" "$symbols/Goo.PackageSmoke.pdb"
(
  cd "$bundle"
  find . -mindepth 1 -type f ! -name SHA256SUMS \
    -printf '%P\n' | LC_ALL=C sort | xargs sha256sum >SHA256SUMS
)
