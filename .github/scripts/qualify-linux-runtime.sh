#!/usr/bin/env bash
set -euo pipefail

bundle="${1:?usage: qualify-linux-runtime.sh BUNDLE_DIRECTORY}"
bundle="$(realpath "$bundle")"
dotnet="${DOTNET:-dotnet}"
kernel="$(uname -r)"
architecture="$(uname -m)"
libc="$(getconf GNU_LIBC_VERSION)"
window_smoke="${GOO_COMPAT_WINDOW_SMOKE:-0}"

[[ "$architecture" == "x86_64" ]]
if [[ -n "${GOO_EXPECT_KERNEL_PREFIX:-}" ]]; then
  [[ "$kernel" == "$GOO_EXPECT_KERNEL_PREFIX"* ]]
fi
if [[ -n "${GOO_EXPECT_GLIBC:-}" ]]; then
  [[ "$libc" == "glibc $GOO_EXPECT_GLIBC" ]]
fi

for file in libSDL3.so libgoo-harfbuzz.so libgoo-harfbuzz-gpu.so; do
  test -f "$bundle/$file"
  ldd "$bundle/$file" >/dev/null
done

env LD_LIBRARY_PATH="$bundle${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
  "$dotnet" "$bundle/Goo.PackageSmoke.dll"

if [[ "$window_smoke" == "1" ]]; then
  script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
  GOO_WESTON_RENDERER="${GOO_WESTON_RENDERER:-gl}" \
    "$script_dir/with-headless-wayland.sh" env \
      SDL_VIDEODRIVER=wayland \
      GOO_VK_DISABLE_SWAPCHAIN_MAINTENANCE=1 \
      GOO_MULTI_WINDOW_SMOKE=1 \
      LD_LIBRARY_PATH="$bundle${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" \
      "$dotnet" "$bundle/Goo.PackageSmoke.dll"
fi

printf '{"schema":1,"architecture":"%s","kernel":"%s","libc":"%s","windowSmoke":%s}\n' \
  "$architecture" "$kernel" "$libc" "$([[ "$window_smoke" == "1" ]] && printf true || printf false)"
