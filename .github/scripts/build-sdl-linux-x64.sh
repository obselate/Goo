#!/usr/bin/env bash
set -euo pipefail

output="${1:?usage: build-sdl-linux-x64.sh OUTPUT_PATH}"
version="3.4.0"
sha256="082cbf5f429e0d80820f68dc2b507a94d4cc1b4e70817b119bbb8ec6a69584b8"
work="$(mktemp -d)"
trap 'rm -rf -- "$work"' EXIT

curl -fsSL "https://github.com/libsdl-org/SDL/releases/download/release-${version}/SDL3-${version}.tar.gz" \
  -o "$work/SDL3.tar.gz"
printf '%s  %s\n' "$sha256" "$work/SDL3.tar.gz" | sha256sum -c -
mkdir "$work/src"
tar -xzf "$work/SDL3.tar.gz" -C "$work/src" --strip-components=1

# Ubuntu 22.04 ships an older wayland-scanner schema.
find "$work/src/wayland-protocols" -type f -name '*.xml' \
  -exec sed -i 's/ deprecated-since="[^"]*"//g' {} +

cmake -S "$work/src" -B "$work/build" -G Ninja \
  -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_FLAGS_RELEASE=-Os \
  -DCMAKE_INSTALL_PREFIX="$work/install" \
  -DSDL_AUDIO=OFF \
  -DSDL_CAMERA=OFF \
  -DSDL_DIALOG=OFF \
  -DSDL_GPU=OFF \
  -DSDL_HAPTIC=OFF \
  -DSDL_HIDAPI=OFF \
  -DSDL_JOYSTICK=OFF \
  -DSDL_KMSDRM=OFF \
  -DSDL_OPENGL=OFF \
  -DSDL_OPENGLES=OFF \
  -DSDL_POWER=OFF \
  -DSDL_RENDER=OFF \
  -DSDL_SENSOR=OFF \
  -DSDL_SHARED=ON \
  -DSDL_STATIC=OFF \
  -DSDL_TEST_LIBRARY=OFF \
  -DSDL_TRAY=OFF \
  -DSDL_VULKAN=ON \
  -DSDL_WAYLAND=ON \
  -DSDL_X11=OFF
cmake --build "$work/build"
cmake --install "$work/build" --strip

install -D -m 0644 "$(readlink -f "$work/install/lib/libSDL3.so")" "$output"
max_glibc="$(readelf --version-info "$output" | grep -o 'GLIBC_[0-9.]*' | sort -Vu | tail -1 | cut -d_ -f2)"
if [[ "$(printf '%s\n' 2.35 "$max_glibc" | sort -V | tail -1)" != "2.35" ]]; then
  printf 'libSDL3.so requires glibc %s; maximum allowed is 2.35\n' "$max_glibc" >&2
  exit 1
fi
printf 'Built %s (%s bytes, GLIBC <= %s)\n' \
  "$output" "$(stat -c %s "$output")" "$max_glibc"
