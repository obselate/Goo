#!/usr/bin/env python3
import argparse
import hashlib
from pathlib import Path
import re
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
MAX_BYTES = 20_971_520
MAX_GLIBC = (2, 35)
PACKAGE_FILES = {
    "_rels/.rels",
    "Goo.nuspec",
    "lib/net10.0/Yoga.Net.dll",
    "lib/net10.0/Goo.xml",
    "lib/net10.0/Goo.dll",
    "ref/net10.0/Goo.dll",
    "README.md",
    "CHANGELOG.md",
    "LICENSE",
    "THIRD-PARTY-NOTICES.md",
    "buildTransitive/Goo.targets",
    "contentFiles/any/any/Vulkan/Runtime/HarfBuzz-COPYING.txt",
    "contentFiles/any/any/Vulkan/Shaders/analytic.vert.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_border.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_linear4.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_radial4.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_sampled_image.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_solid.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/hb_gpu.vert.spv",
    "contentFiles/any/any/Vulkan/Shaders/hb_gpu_draw.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/hb_gpu_paint.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/harfbuzz-14.3.1.provenance.json",
    "contentFiles/any/any/Vulkan/Shaders/shader-manifest.json",
    "contentFiles/any/any/Vulkan/Shaders/solid_quad.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/solid_quad.vert.spv",
    "runtimes/linux-x64/native/libSDL3.so",
    "runtimes/linux-x64/native/libgoo-harfbuzz-gpu.so",
    "runtimes/linux-x64/native/libgoo-harfbuzz.so",
    "runtimes/linux-x64/native/text-native-build.json",
    "runtimes/win-x64/native/goo-harfbuzz-gpu.dll",
    "runtimes/win-x64/native/goo-harfbuzz.dll",
    "runtimes/win-x64/native/text-native-build.json",
    "[Content_Types].xml",
}
BUNDLE_FILES = {
    "Goo.PackageSmoke.deps.json",
    "Goo.PackageSmoke.dll",
    "Goo.PackageSmoke.runtimeconfig.json",
    "Goo.dll",
    "Gsharp.Extensions.dll",
    "Hexa.NET.SDL3.dll",
    "HexaGen.Runtime.dll",
    "Unicode.Bidi.dll",
    "Yoga.Net.dll",
    "libSDL3.so",
    "libgoo-harfbuzz-gpu.so",
    "libgoo-harfbuzz.so",
    "text-native-build.json",
    "Vulkan/Runtime/HarfBuzz-COPYING.txt",
    "Vulkan/Shaders/analytic.vert.spv",
    "Vulkan/Shaders/analytic_border.frag.spv",
    "Vulkan/Shaders/analytic_linear4.frag.spv",
    "Vulkan/Shaders/analytic_radial4.frag.spv",
    "Vulkan/Shaders/analytic_sampled_image.frag.spv",
    "Vulkan/Shaders/analytic_solid.frag.spv",
    "Vulkan/Shaders/hb_gpu.vert.spv",
    "Vulkan/Shaders/hb_gpu_draw.frag.spv",
    "Vulkan/Shaders/hb_gpu_paint.frag.spv",
    "Vulkan/Shaders/harfbuzz-14.3.1.provenance.json",
    "Vulkan/Shaders/shader-manifest.json",
    "Vulkan/Shaders/solid_quad.frag.spv",
    "Vulkan/Shaders/solid_quad.vert.spv",
    "LICENSE",
    "README.md",
    "CHANGELOG.md",
    "THIRD-PARTY-NOTICES.md",
    "SHA256SUMS",
}
NATIVE_NAMES = {"libSDL3.so", "libgoo-harfbuzz-gpu.so", "libgoo-harfbuzz.so"}


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def glibc_versions(path: Path) -> set[tuple[int, int]]:
    result = subprocess.run(
        ["readelf", "--version-info", str(path)], text=True,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    if result.returncode != 0:
        return set()
    return {
        tuple(map(int, value.split(".")))
        for value in re.findall(r"GLIBC_(\d+\.\d+)", result.stdout)
    }


def require_glibc_floor(path: Path) -> None:
    versions = glibc_versions(path)
    if versions and max(versions) > MAX_GLIBC:
        raise SystemExit(
            f"{path} requires GLIBC_{'.'.join(map(str, max(versions)))}; "
            "maximum is GLIBC_2.35")


def validate_package(path: Path) -> str:
    if path.stat().st_size > MAX_BYTES:
        raise SystemExit(f"NuGet package exceeds 20 MiB: {path.stat().st_size}")
    with zipfile.ZipFile(path) as archive:
        names = set(archive.namelist())
        variable = {
            name for name in names
            if name.startswith("package/services/metadata/core-properties/")
            and name.endswith(".psmdcp")
        }
        unexpected = names - PACKAGE_FILES - variable
        missing = PACKAGE_FILES - names
        if unexpected or missing or len(variable) != 1:
            raise SystemExit(
                f"package allowlist mismatch; missing={sorted(missing)}, "
                f"unexpected={sorted(unexpected)}, metadata={sorted(variable)}")
        for name in ("README.md", "CHANGELOG.md", "LICENSE", "THIRD-PARTY-NOTICES.md"):
            if archive.read(name) != (ROOT / name).read_bytes():
                raise SystemExit(f"package {name} differs from the release tree")
        if archive.read("buildTransitive/Goo.targets") != (ROOT / "Goo/Goo.targets").read_bytes():
            raise SystemExit("packaged Goo.targets differs from the release tree")
        nuspec = archive.read("Goo.nuspec").decode("utf-8-sig")
        dependency = re.search(r'<dependency id="Hexa.NET.SDL3"[^>]+>', nuspec)
        if dependency is None or "Native" not in dependency.group(0):
            raise SystemExit("Hexa.NET.SDL3 native assets are not excluded")
        with tempfile.TemporaryDirectory() as directory:
            target = Path(directory) / "libSDL3.so"
            target.write_bytes(
                archive.read("runtimes/linux-x64/native/libSDL3.so"))
            if not target.read_bytes().startswith(b"\x7fELF"):
                raise SystemExit("packaged libSDL3.so is not an ELF library")
            require_glibc_floor(target)
            sdl_digest = digest(target)
    print(f"Package OK: {path.stat().st_size} bytes")
    return sdl_digest


def parse_checksums(path: Path) -> dict[str, str]:
    checksums: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        match = re.fullmatch(r"([0-9a-f]{64})  ([^\n]+)", line)
        if match is None or match.group(2) in checksums:
            raise SystemExit(f"invalid checksum line: {line!r}")
        checksums[match.group(2)] = match.group(1)
    return checksums


def validate_bundle(path: Path, package_sdl_digest: str) -> None:
    if any(item.is_symlink() for item in path.rglob("*")):
        raise SystemExit("bundle must not contain symlinks")
    files = [item for item in path.rglob("*") if item.is_file()]
    names = {item.relative_to(path).as_posix() for item in files}
    missing = BUNDLE_FILES - names
    unexpected = names - BUNDLE_FILES
    if missing or unexpected:
        raise SystemExit(
            f"bundle allowlist mismatch; missing={sorted(missing)}, "
            f"unexpected={sorted(unexpected)}")
    for name in ("README.md", "CHANGELOG.md", "LICENSE", "THIRD-PARTY-NOTICES.md"):
        if (path / name).read_bytes() != (ROOT / name).read_bytes():
            raise SystemExit(f"bundle {name} differs from the release tree")
    total = sum(item.stat().st_size for item in files)
    if total > MAX_BYTES:
        raise SystemExit(f"bundle exceeds 20 MiB: {total}")

    checksums = parse_checksums(path / "SHA256SUMS")
    expected_checksum_names = BUNDLE_FILES - {"SHA256SUMS"}
    if set(checksums) != expected_checksum_names:
        raise SystemExit("SHA256SUMS allowlist mismatch")
    for name, expected in checksums.items():
        if digest(path / name) != expected:
            raise SystemExit(f"checksum mismatch: {name}")

    native = {name: path / name for name in NATIVE_NAMES}
    hashes: dict[str, list[str]] = {}
    for name, item in native.items():
        if not item.read_bytes().startswith(b"\x7fELF"):
            raise SystemExit(f"native payload is not ELF: {name}")
        hashes.setdefault(digest(item), []).append(name)
        require_glibc_floor(item)
    duplicates = [names for names in hashes.values() if len(names) > 1]
    if duplicates:
        raise SystemExit(f"duplicate native payloads: {duplicates}")
    if digest(native["libSDL3.so"]) != package_sdl_digest:
        raise SystemExit("bundle and package contain different SDL payloads")
    for item in files:
        require_glibc_floor(item)
    print(f"Bundle OK: {total} bytes; native={sorted(native)}")


parser = argparse.ArgumentParser()
parser.add_argument("--package", required=True, type=Path)
parser.add_argument("--bundle", required=True, type=Path)
args = parser.parse_args()
sdl_digest = validate_package(args.package)
validate_bundle(args.bundle, sdl_digest)
