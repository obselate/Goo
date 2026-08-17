#!/usr/bin/env bash
set -euo pipefail

output="${1:?usage: build-text-native-linux-x64.sh OUTPUT_DIRECTORY}"
script_dir="$(CDPATH= cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
repo_root="$(CDPATH= cd -- "$script_dir/../.." && pwd)"
manifest="$repo_root/tools/Goo.TextNative/manifest.json"
bridge_source="$repo_root/proofs/Goo.VulkanProof/Native/goo_text_native.c"
hb_url='https://github.com/harfbuzz/harfbuzz/releases/download/14.3.1/harfbuzz-14.3.1.tar.xz'
hb_sha256='9dae9538aae2ffdf70cec31f2c27bf68e2aaeeae3112688467697d5faf6194f7'
ft_url='https://download.savannah.gnu.org/releases/freetype/freetype-2.14.3.tar.xz'
ft_sha256='36bc4f1cc413335368ee656c42afca65c5a3987e8768cc28cf11ba775e785a5f'
for command_name in curl sha256sum tar meson ninja readelf strip file python3; do
  command -v "$command_name" >/dev/null || { printf 'required command missing: %s\n' "$command_name" >&2; exit 1; }
done
[[ -f "$bridge_source" ]]
python3 - "$manifest" "$hb_sha256" "$ft_sha256" <<'PY'
import json
import sys
from pathlib import Path

manifest = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
if manifest["source"]["harfbuzz"]["archiveSha256"] != sys.argv[2]:
    raise SystemExit("HarfBuzz manifest hash drift")
if manifest["source"]["freetype"]["archiveSha256"] != sys.argv[3]:
    raise SystemExit("FreeType manifest hash drift")
if manifest["outputs"]["linux-x64"] != {
    "harfbuzz": "libgoo-harfbuzz.so",
    "freetype": "libgoo-freetype.so",
    "bridge": "libgoo-text-native.so",
}:
    raise SystemExit("Linux output name drift")
PY
work="$(mktemp -d -t goo-text-native-linux.XXXXXX)"
trap 'rm -rf -- "$work"' EXIT
mkdir -p "$output"
output="$(CDPATH= cd -- "$output" && pwd)"
find "$output" -maxdepth 1 -type f \( -name 'libharfbuzz.so' -o -name 'libfreetype.so' -o -name 'libgoo-text.so' \) -delete
curl -fsSL --retry 3 --retry-delay 2 "$hb_url" -o "$work/harfbuzz.tar.xz"
printf '%s  %s\n' "$hb_sha256" "$work/harfbuzz.tar.xz" | sha256sum -c -
curl -fsSL --retry 3 --retry-delay 2 "$ft_url" -o "$work/freetype.tar.xz"
printf '%s  %s\n' "$ft_sha256" "$work/freetype.tar.xz" | sha256sum -c -
tar -xJf "$work/harfbuzz.tar.xz" -C "$work"
tar -xJf "$work/freetype.tar.xz" -C "$work"
export SOURCE_DATE_EPOCH=0
export CFLAGS="-O3 -g0 -ffile-prefix-map=$work=."
export CXXFLAGS="$CFLAGS"
export LDFLAGS='-Wl,--build-id=none'
common_options=(--prefix=/usr --libdir=lib --buildtype=release --default-library=shared --wrap-mode=nodownload)
freetype_options=(-Dharfbuzz=disabled -Dbrotli=disabled -Dbzip2=disabled -Dpng=disabled -Dtests=disabled -Derror_strings=false -Dmmap=enabled -Dzlib=disabled '-Dc_link_args=-Wl,-soname,libgoo-freetype.so')
harfbuzz_options=(-Dglib=disabled -Dgobject=disabled -Dcairo=disabled -Dchafa=disabled -Dpng=disabled -Dzlib=disabled -Dicu=disabled -Dgraphite=disabled -Dgraphite2=disabled -Dfreetype=disabled -Dfontations=disabled -Dgdi=disabled -Ddirectwrite=disabled -Dcoretext=disabled -Dharfrust=disabled -Dkbts=disabled -Dwasm=disabled -Draster=disabled -Dvector=disabled -Dgpu=disabled -Dsubset=disabled -Dtests=disabled -Dintrospection=disabled -Ddocs=disabled -Ddoc_tests=false -Dutilities=disabled -Dbenchmark=disabled -Dgpu_demo=disabled -Dwith_libstdcxx=false '-Dc_link_args=-Wl,-soname,libgoo-harfbuzz.so')
meson setup "$work/freetype-build" "$work/freetype-2.14.3" "${common_options[@]}" "${freetype_options[@]}"
ninja -C "$work/freetype-build" -j"$(getconf _NPROCESSORS_ONLN 2>/dev/null || printf 2)"
meson setup "$work/harfbuzz-build" "$work/harfbuzz-14.3.1" "${common_options[@]}" "${harfbuzz_options[@]}"
ninja -C "$work/harfbuzz-build" -j"$(getconf _NPROCESSORS_ONLN 2>/dev/null || printf 2)"
freetype_library="$(find "$work/freetype-build" -type f -name 'libfreetype.so.*' -print | LC_ALL=C sort | tail -n 1)"
harfbuzz_library="$(find "$work/harfbuzz-build" -type f -name 'libharfbuzz.so.*' -print | LC_ALL=C sort | tail -n 1)"
[[ -n "$freetype_library" && -n "$harfbuzz_library" ]]
freetype_output="$output/libgoo-freetype.so"
harfbuzz_output="$output/libgoo-harfbuzz.so"
install -m 0755 "$freetype_library" "$freetype_output"
install -m 0755 "$harfbuzz_library" "$harfbuzz_output"
strip --strip-unneeded "$freetype_output"
strip --strip-unneeded "$harfbuzz_output"
file "$freetype_output" | grep -Eq 'ELF 64-bit.*x86-64'
file "$harfbuzz_output" | grep -Eq 'ELF 64-bit.*x86-64'
readelf --dynamic "$freetype_output" | grep -Eq 'SONAME.*\[libgoo-freetype\.so\]'
readelf --dynamic "$harfbuzz_output" | grep -Eq 'SONAME.*\[libgoo-harfbuzz\.so\]'
if readelf --dynamic "$freetype_output" | grep -Fq 'libharfbuzz'; then
  printf 'FreeType unexpectedly links HarfBuzz\n' >&2
  exit 1
fi
if readelf --dynamic "$harfbuzz_output" | grep -Fq 'libfreetype'; then
  printf 'HarfBuzz unexpectedly links FreeType\n' >&2
  exit 1
fi
meson setup "$work/bridge-build" "$repo_root/tools/Goo.TextNative" \
  --prefix=/usr --libdir=lib --buildtype=release --default-library=shared --wrap-mode=nodownload \
  -Dfreetype_source="$work/freetype-2.14.3" \
  -Dfreetype_build="$work/freetype-build" \
  -Dfreetype_library="$freetype_output" \
  -Dharfbuzz_source="$work/harfbuzz-14.3.1" \
  -Dharfbuzz_build="$work/harfbuzz-build" \
  -Dbridge_source="$bridge_source"
ninja -C "$work/bridge-build" -j"$(getconf _NPROCESSORS_ONLN 2>/dev/null || printf 2)"
bridge_library="$(find "$work/bridge-build" -maxdepth 2 -type f -name 'libgoo-text-native.so*' -print | LC_ALL=C sort | tail -n 1)"
[[ -n "$bridge_library" ]]
bridge_output="$output/libgoo-text-native.so"
install -m 0755 "$bridge_library" "$bridge_output"
strip --strip-unneeded "$bridge_output"
file "$bridge_output" | grep -Eq 'ELF 64-bit.*x86-64'
readelf --dynamic "$bridge_output" | grep -Fq 'Shared library: [libgoo-freetype.so]'
if readelf --dynamic "$bridge_output" | grep -Eiq 'libharfbuzz'; then
  printf 'Goo text bridge unexpectedly links HarfBuzz\n' >&2
  exit 1
fi
for artifact in "$harfbuzz_output" "$freetype_output" "$bridge_output"; do
  versions="$(readelf --version-info "$artifact" | grep -o 'GLIBC_[0-9.]*' | sort -Vu || true)"
  if [[ -n "$versions" ]]; then
    max_glibc="$(printf '%s\n' "$versions" | tail -n 1 | cut -d_ -f2)"
    if [[ "$(printf '%s\n' 2.35 "$max_glibc" | sort -V | tail -n 1)" != '2.35' ]]; then
      printf '%s requires GLIBC_%s; maximum allowed is GLIBC_2.35\n' "$(basename "$artifact")" "$max_glibc" >&2
      exit 1
    fi
  fi
done
python3 "$repo_root/tools/Goo.TextNative/record-build.py" \
  --manifest "$manifest" \
  --target linux-x64 \
  --output "$output" \
  --artifact "harfbuzz=$harfbuzz_output" \
  --artifact "freetype=$freetype_output" \
  --artifact "bridge=$bridge_output"
printf 'Built %s (%s bytes)\n' "$harfbuzz_output" "$(stat -c %s "$harfbuzz_output")"
printf 'Built %s (%s bytes)\n' "$freetype_output" "$(stat -c %s "$freetype_output")"
printf 'Built %s (%s bytes)\n' "$bridge_output" "$(stat -c %s "$bridge_output")"
