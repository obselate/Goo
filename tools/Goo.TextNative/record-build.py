import argparse
import hashlib
import json
import os
import re
import subprocess
from pathlib import Path


def command_text(name, args):
    result = subprocess.run([name, *args], check=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
    return result.stdout.splitlines()[0].strip()


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def linux_symbols(path):
    result = subprocess.run(["readelf", "--dyn-syms", "--wide", str(path)], check=True, stdout=subprocess.PIPE, text=True)
    values = set()
    for line in result.stdout.splitlines():
        fields = line.split()
        if len(fields) < 8 or fields[-2] == "UND":
            continue
        name = fields[-1].split("@", 1)[0]
        if re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", name):
            values.add(name)
    return sorted(values)


def linux_needed(path):
    result = subprocess.run(["readelf", "--dynamic", str(path)], check=True, stdout=subprocess.PIPE, text=True)
    return sorted(set(re.findall(r"Shared library: \[([^]]+)\]", result.stdout)))


def windows_symbols(path, tool_prefix):
    result = subprocess.run([f"{tool_prefix}-objdump", "-p", str(path)], check=True, stdout=subprocess.PIPE, text=True)
    values = set()
    active = False
    for line in result.stdout.splitlines():
        if "[Ordinal/Name Pointer] Table" in line:
            active = True
            continue
        if active:
            match = re.search(r"\s+\d+\s+[0-9a-fA-F]+\s+([A-Za-z_][A-Za-z0-9_]*)\s*$", line)
            if match:
                values.add(match.group(1).lstrip("_"))
            elif line.strip() and not line[0].isspace():
                active = False
    return sorted(values)


def windows_needed(path, tool_prefix):
    result = subprocess.run([f"{tool_prefix}-objdump", "-p", str(path)], check=True, stdout=subprocess.PIPE, text=True)
    return sorted(set(re.findall(r"DLL Name: ([^\n]+)", result.stdout)))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True, type=Path)
    parser.add_argument("--target", required=True, choices=("linux-x64", "win-x64"))
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--artifact", required=True, action="append", metavar="NAME=PATH")
    parser.add_argument("--tool-prefix", default="")
    args = parser.parse_args()
    manifest = json.loads(args.manifest.read_text(encoding="utf-8"))
    artifacts = {}
    for spec in args.artifact:
        name, separator, value = spec.partition("=")
        if separator == "" or name not in manifest["outputs"][args.target]:
            raise SystemExit(f"invalid artifact: {spec}")
        path = Path(value)
        if path.name != manifest["outputs"][args.target][name]:
            raise SystemExit(f"{name} output name drift")
        if args.target == "linux-x64":
            symbols = linux_symbols(path)
            needed = linux_needed(path)
        else:
            if not args.tool_prefix:
                raise SystemExit("Windows tool prefix is required")
            symbols = windows_symbols(path, args.tool_prefix)
            needed = windows_needed(path, args.tool_prefix)
        prefixes = {
            "harfbuzz": ("hb_",),
            "freetype": ("FT_",),
            "bridge": ("goo_ft_",),
        }
        symbols = sorted(value for value in symbols if value.startswith(prefixes[name]))
        required = set(manifest["requiredExports"][name])
        missing = sorted(required - set(symbols))
        if missing:
            raise SystemExit(f"{name} export check failed: {', '.join(missing)}")
        artifacts[name] = {
            "file": path.name,
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
            "exports": symbols,
            "needed": needed,
        }
    if set(artifacts) != set(manifest["outputs"][args.target]):
        raise SystemExit("artifact set is incomplete")
    if args.target == "linux-x64":
        compiler = os.environ.get("CC", "cc")
        toolchain = {
            "meson": command_text("meson", ["--version"]),
            "ninja": command_text("ninja", ["--version"]),
            "cc": command_text(compiler, ["--version"]),
            "strip": command_text("strip", ["--version"]),
        }
        linker_flags = "-Wl,--build-id=none"
    else:
        toolchain = {
            "meson": command_text("meson", ["--version"]),
            "ninja": command_text("ninja", ["--version"]),
            "cc": command_text(f"{args.tool_prefix}-gcc", ["--version"]),
            "strip": command_text(f"{args.tool_prefix}-strip", ["--version"]),
        }
        linker_flags = "-Wl,--build-id=none -static-libgcc -static-libstdc++"
    build = dict(manifest["build"])
    build["target"] = args.target
    build["toolchain"] = toolchain
    build["sourceDirectory"] = "temporary"
    build["environment"] = {
        "SOURCE_DATE_EPOCH": "0",
        "CFLAGS": "-O3 -g0 -ffile-prefix-map=<temporary-source-root>=.",
        "CXXFLAGS": "-O3 -g0 -ffile-prefix-map=<temporary-source-root>=.",
        "LDFLAGS": linker_flags,
    }
    if args.target == "win-x64":
        build["crossFile"] = {
            "c": f"{args.tool_prefix}-gcc",
            "cpp": f"{args.tool_prefix}-g++",
            "ar": f"{args.tool_prefix}-ar",
            "nm": f"{args.tool_prefix}-nm",
            "strip": f"{args.tool_prefix}-strip",
            "system": "windows",
            "cpu": "x86_64",
        }
    manifest["buildEvidence"] = build
    manifest["artifacts"] = artifacts
    (args.output / "text-native-build.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
