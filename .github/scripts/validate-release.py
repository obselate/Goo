#!/usr/bin/env python3
import argparse
import hashlib
import json
from pathlib import Path
import re
import struct
import subprocess
import tempfile
import zipfile

ROOT = Path(__file__).resolve().parents[2]
MAX_BYTES = 20_971_520
MAX_GLIBC = (2, 27)
WINDOWS_SDL_SHA256 = "2632e21625861a0dc106f2b1abb649e610d8be88534ba74c76a763abe5aefaa3"
WINDOWS_SDL_IMPORTS = {
    "ADVAPI32.dll", "GDI32.dll", "IMM32.dll", "KERNEL32.dll", "OLEAUT32.dll",
    "SETUPAPI.dll", "SHELL32.dll", "USER32.dll", "VERSION.dll", "WINMM.dll",
    "ole32.dll",
}
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
    "contentFiles/any/any/Vulkan/Shaders/Authoring/goo_effect.glsl",
    "contentFiles/any/any/Vulkan/Shaders/Authoring/goo_effect.slang",
    "contentFiles/any/any/Vulkan/Runtime/HarfBuzz-COPYING.txt",
    "contentFiles/any/any/Vulkan/Shaders/analytic.vert.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_blend.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_shadow.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_border.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_linear4.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_radial4.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_sampled_image.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/analytic_solid.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/clip_mask.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/clip_mask.vert.spv",
    "contentFiles/any/any/Vulkan/Shaders/hb_gpu.vert.spv",
    "contentFiles/any/any/Vulkan/Shaders/hb_gpu_draw.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/hb_gpu_paint.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/lava.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/harfbuzz-14.3.1.provenance.json",
    "contentFiles/any/any/Vulkan/Runtime/MoltenVK-LICENSE.txt",
    "contentFiles/any/any/Vulkan/Shaders/path_band.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/path_band.vert.spv",
    "contentFiles/any/any/Vulkan/Shaders/shader-manifest.json",
    "contentFiles/any/any/Vulkan/Shaders/solid_quad.frag.spv",
    "contentFiles/any/any/Vulkan/Shaders/solid_quad.vert.spv",
    "runtimes/linux-x64/native/libSDL3.so",
    "runtimes/linux-x64/native/libgoo-harfbuzz-gpu.so",
    "runtimes/linux-x64/native/libgoo-harfbuzz.so",
    "runtimes/linux-x64/native/text-native-build.json",
    "runtimes/osx-arm64/native/libMoltenVK.dylib",
    "runtimes/osx-arm64/native/libSDL3.dylib",
    "runtimes/osx-arm64/native/libgoo-harfbuzz-gpu.dylib",
    "runtimes/osx-arm64/native/libgoo-harfbuzz.dylib",
    "runtimes/osx-arm64/native/text-native-build.json",
    "runtimes/win-x64/native/goo-harfbuzz-gpu.dll",
    "runtimes/win-x64/native/goo-harfbuzz.dll",
    "runtimes/win-x64/native/SDL3.dll",
    "runtimes/win-x64/native/text-native-build.json",
    "tools/net10.0/any/Goo.ShaderEffectTool.deps.json",
    "tools/net10.0/any/Goo.ShaderEffectTool.dll",
    "tools/net10.0/any/Goo.ShaderEffectTool.runtimeconfig.json",
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
    "Vulkan/Shaders/analytic_blend.frag.spv",
    "Vulkan/Shaders/analytic_shadow.frag.spv",
    "Vulkan/Shaders/analytic_border.frag.spv",
    "Vulkan/Shaders/analytic_linear4.frag.spv",
    "Vulkan/Shaders/analytic_radial4.frag.spv",
    "Vulkan/Shaders/analytic_sampled_image.frag.spv",
    "Vulkan/Shaders/analytic_solid.frag.spv",
    "Vulkan/Shaders/clip_mask.frag.spv",
    "Vulkan/Shaders/clip_mask.vert.spv",
    "Vulkan/Shaders/hb_gpu.vert.spv",
    "Vulkan/Shaders/hb_gpu_draw.frag.spv",
    "Vulkan/Shaders/hb_gpu_paint.frag.spv",
    "Vulkan/Shaders/lava.frag.spv",
    "Vulkan/Shaders/harfbuzz-14.3.1.provenance.json",
    "Vulkan/Shaders/path_band.frag.spv",
    "Vulkan/Shaders/path_band.vert.spv",
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
SYMBOL_FILES = {
    "_rels/.rels",
    "Goo.nuspec",
    "[Content_Types].xml",
    "lib/net10.0/Yoga.Net.pdb",
}


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
            "maximum is GLIBC_2.27")


def pe_imports(path: Path) -> set[str]:
    result = subprocess.run(
        ["objdump", "-p", str(path)], text=True,
        stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    if result.returncode != 0:
        raise SystemExit(f"could not inspect PE imports: {path}")
    return set(re.findall(r"DLL Name:\s+(\S+)", result.stdout))


def pe_debug_entries(data: bytes) -> list[tuple[int, int, bytes]]:
    if len(data) < 64 or data[:2] != b"MZ":
        raise SystemExit("managed assembly is not a PE image")
    pe = struct.unpack_from("<I", data, 60)[0]
    if pe + 24 > len(data) or data[pe:pe + 4] != b"PE\0\0":
        raise SystemExit("managed assembly has no PE header")
    section_count = struct.unpack_from("<H", data, pe + 6)[0]
    optional_size = struct.unpack_from("<H", data, pe + 20)[0]
    optional = pe + 24
    magic = struct.unpack_from("<H", data, optional)[0]
    directory = optional + (96 if magic == 0x10B else 112 if magic == 0x20B else -1)
    if directory < optional or directory + 56 > len(data):
        raise SystemExit("managed assembly has an invalid optional header")
    debug_rva, debug_size = struct.unpack_from("<II", data, directory + 48)
    sections = optional + optional_size
    debug_offset = None
    for index in range(section_count):
        section = sections + index * 40
        if section + 40 > len(data):
            raise SystemExit("managed assembly has an invalid section table")
        virtual_size, virtual_address, raw_size, raw_offset = struct.unpack_from("<IIII", data, section + 8)
        if virtual_address <= debug_rva < virtual_address + max(virtual_size, raw_size):
            debug_offset = raw_offset + debug_rva - virtual_address
            break
    if debug_offset is None or debug_offset + debug_size > len(data) or debug_size % 28 != 0:
        raise SystemExit("managed assembly has an invalid debug directory")
    entries: list[tuple[int, int, bytes]] = []
    for index in range(debug_size // 28):
        entry = debug_offset + index * 28
        timestamp = struct.unpack_from("<I", data, entry + 4)[0]
        entry_type = struct.unpack_from("<I", data, entry + 12)[0]
        size = struct.unpack_from("<I", data, entry + 16)[0]
        raw_offset = struct.unpack_from("<I", data, entry + 24)[0]
        if size > 0 and raw_offset + size > len(data):
            raise SystemExit("managed assembly has invalid debug data")
        entries.append((entry_type, timestamp, data[raw_offset:raw_offset + size]))
    return entries


def pe_debug_types(data: bytes) -> set[int]:
    return {entry_type for entry_type, _, _ in pe_debug_entries(data)}


def portable_pdb_identity(data: bytes) -> tuple[bytes, bytes]:
    if len(data) < 24 or data[:4] != b"BSJB":
        raise SystemExit("symbol file is not a portable PDB")
    position = 16 + struct.unpack_from("<I", data, 12)[0]
    position = (position + 3) & ~3
    if position + 4 > len(data):
        raise SystemExit("portable PDB has an invalid metadata header")
    _, stream_count = struct.unpack_from("<HH", data, position)
    position += 4
    pdb_offset = None
    for _ in range(stream_count):
        if position + 8 > len(data):
            raise SystemExit("portable PDB has an invalid stream table")
        offset, size = struct.unpack_from("<II", data, position)
        position += 8
        try:
            end = data.index(0, position)
        except ValueError as error:
            raise SystemExit("portable PDB has an unterminated stream name") from error
        name = data[position:end].decode("utf-8")
        position = (end + 4) & ~3
        if offset + size > len(data):
            raise SystemExit("portable PDB stream exceeds the file")
        if name == "#Pdb":
            pdb_offset = offset
    if pdb_offset is None or pdb_offset + 20 > len(data):
        raise SystemExit("portable PDB has no valid #Pdb stream")
    identity = data[pdb_offset:pdb_offset + 20]
    canonical = bytearray(data)
    canonical[pdb_offset:pdb_offset + 20] = bytes(20)
    return identity, hashlib.sha256(canonical).digest()


def validate_symbols(package_path: Path, symbols_path: Path) -> None:
    with zipfile.ZipFile(package_path) as package, zipfile.ZipFile(symbols_path) as symbols:
        names = set(symbols.namelist())
        variable = {
            name for name in names
            if name.startswith("package/services/metadata/core-properties/")
            and name.endswith(".psmdcp")
        }
        unexpected = names - SYMBOL_FILES - variable
        missing = SYMBOL_FILES - names
        if unexpected or missing or len(variable) != 1:
            raise SystemExit(
                f"symbol package allowlist mismatch; missing={sorted(missing)}, "
                f"unexpected={sorted(unexpected)}, metadata={sorted(variable)}")
        for pdb_name in sorted(name for name in names if name.endswith(".pdb")):
            dll_name = pdb_name[:-4] + ".dll"
            if dll_name not in package.namelist():
                raise SystemExit(f"symbol package has no matching assembly: {pdb_name}")
            identity, checksum = portable_pdb_identity(symbols.read(pdb_name))
            entries = pe_debug_entries(package.read(dll_name))
            codeview = [(timestamp, raw) for entry_type, timestamp, raw in entries if entry_type == 2]
            checksums = [raw for entry_type, _, raw in entries if entry_type == 19]
            if len(codeview) != 1 or len(checksums) != 1:
                raise SystemExit(f"assembly debug records are incomplete: {dll_name}")
            timestamp, codeview_data = codeview[0]
            if len(codeview_data) < 24 or codeview_data[:4] != b"RSDS":
                raise SystemExit(f"assembly CodeView record is invalid: {dll_name}")
            if identity != codeview_data[4:20] + struct.pack("<I", timestamp):
                raise SystemExit(f"PDB identity does not match assembly: {pdb_name}")
            algorithm, separator, recorded = checksums[0].partition(b"\0")
            if separator != b"\0" or algorithm != b"SHA256" or recorded != checksum:
                raise SystemExit(f"PDB checksum does not match assembly: {pdb_name}")
    print(f"Symbols OK: {symbols_path.stat().st_size} bytes")


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
        package_sources = {
            "README.md": ROOT / "docs/nuget-readme.md",
            "CHANGELOG.md": ROOT / "CHANGELOG.md",
            "LICENSE": ROOT / "LICENSE",
            "THIRD-PARTY-NOTICES.md": ROOT / "THIRD-PARTY-NOTICES.md",
        }
        for name, source in package_sources.items():
            if archive.read(name) != source.read_bytes():
                raise SystemExit(f"package {name} differs from the release tree")
        if 17 not in pe_debug_types(archive.read("lib/net10.0/Goo.dll")):
            raise SystemExit("packaged Goo.dll does not contain embedded debug symbols")
        if archive.read("buildTransitive/Goo.targets") != (ROOT / "Goo/Goo.targets").read_bytes():
            raise SystemExit("packaged Goo.targets differs from the release tree")
        if archive.read("contentFiles/any/any/Vulkan/Runtime/MoltenVK-LICENSE.txt") != (ROOT / "Goo/Runtime/Vulkan/MoltenVK-LICENSE.txt").read_bytes():
            raise SystemExit("packaged MoltenVK license differs from the release tree")
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
            windows_target = Path(directory) / "SDL3.dll"
            windows_target.write_bytes(
                archive.read("runtimes/win-x64/native/SDL3.dll"))
            if windows_target.read_bytes()[:2] != b"MZ":
                raise SystemExit("packaged SDL3.dll is not a PE library")
            if digest(windows_target) != WINDOWS_SDL_SHA256:
                raise SystemExit("packaged SDL3.dll does not match the pinned SDL release")
            imports = pe_imports(windows_target)
            if imports != WINDOWS_SDL_IMPORTS:
                raise SystemExit(f"unexpected SDL3.dll imports: {sorted(imports)}")
            macos_names = (
                "libMoltenVK.dylib",
                "libSDL3.dylib",
                "libgoo-harfbuzz-gpu.dylib",
                "libgoo-harfbuzz.dylib",
            )
            for name in macos_names:
                data = archive.read(f"runtimes/osx-arm64/native/{name}")
                if data[:4] != b"\xcf\xfa\xed\xfe":
                    raise SystemExit(f"packaged {name} is not a thin arm64 Mach-O library")
            text_native = json.loads(
                archive.read("runtimes/osx-arm64/native/text-native-build.json"))
            if text_native.get("buildEvidence", {}).get("target") != "osx-arm64":
                raise SystemExit("packaged macOS text-native provenance target is invalid")
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


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--package", required=True, type=Path)
    parser.add_argument("--symbols", required=True, type=Path)
    parser.add_argument("--bundle", required=True, type=Path)
    args = parser.parse_args()
    sdl_digest = validate_package(args.package)
    validate_symbols(args.package, args.symbols)
    validate_bundle(args.bundle, sdl_digest)


if __name__ == "__main__":
    main()
