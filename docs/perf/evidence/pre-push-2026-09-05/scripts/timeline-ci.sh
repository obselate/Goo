#!/usr/bin/env bash
set -euo pipefail
export PATH="/tmp/goo-weston-runtime/usr/bin:$PATH"
export LD_LIBRARY_PATH=/tmp/goo-weston-runtime/usr/lib:/tmp/goo-weston-runtime/usr/lib/weston
export WESTON_MODULE_MAP=headless-backend.so=/tmp/goo-weston-runtime/usr/lib/libweston-15/headless-backend.so
export XDG_CONFIG_HOME=/tmp/goo-weston-qa-config
export SDL_VIDEODRIVER=wayland
export LIBGL_ALWAYS_SOFTWARE=1
export VK_DRIVER_FILES=/usr/share/vulkan/icd.d/lvp_icd.json
export VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation
.github/scripts/with-headless-wayland.sh env GOO_VK_DIAGNOSTICS=1 GOO_TIMELINE_COMPLETION_SMOKE=1 dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.AsyncReadbackSmoke.dll
