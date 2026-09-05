#!/usr/bin/env python3
import argparse
import hashlib
import json
import shutil
import struct
import sys
import tempfile
import xml.etree.ElementTree as element_tree
from pathlib import Path


EFFECTS = (
    "wolfenstein",
    "chrome_sdf",
    "corridor",
    "radial_light",
    "ripple",
    "terminal_glass",
    "liquid_glass",
    "volumetric",
    "dither",
    "aurora",
    "iridescent_silk",
    "crt",
)
COMPILER = {
    "project": "shader-slang/slang",
    "version": "2026.16",
    "commit": "2c6ca521d2c38e7ab67c63293351bc88eb747340",
    "platform": "linux-x64-glibc-2.27",
    "archiveSha256": "b9c5e195ce9a7124147d47febe78b7f8c59c96829add50b0938bd04b8056fb88",
    "executableSha256": "17272094a0dfde5dfc1534c5583cfbb36cb540edc6a88198aa9ebbca0c2fc336",
    "runtimeSha256": "e7ac31add0058c5b2a5406be803d38d3e750a4717ab6f425f98530cf791467c8",
    "arguments": [
        "-lang", "slang", "<source>", "-I", "<authoring>", "-entry", "main",
        "-stage", "fragment", "-target", "spirv", "-capability", "SPIRV_1_6",
        "-matrix-layout-row-major", "-fp-mode", "precise", "-O2", "-Wall",
        "-Wpedantic", "-warnings-as-errors", "all", "-restrictive-capability-check",
        "-diagnostic-color", "never", "-std", "2026", "-o", "<output>",
    ],
}
VALIDATOR = {
    "project": "KhronosGroup/SPIRV-Tools",
    "version": "2026.3",
    "commit": "b707790a898e44038547df54580022fc1cf89c3d",
    "sdk": "1.4.357.0",
}


def sha256(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def relative_files(root):
    return sorted(path.relative_to(root).as_posix() for path in root.rglob("*") if path.is_file())


def expected_payload_files():
    result = ["Authoring/goo_effect.glsl", "Authoring/goo_effect.slang"]
    for effect in EFFECTS:
        result.extend(
            (
                f"Shaders/{effect}.goo-effect",
                f"Shaders/{effect}.goo-effect.json",
                f"Sources/{effect}.frag.slang",
            )
        )
    return sorted(result)


def read_spirv(program):
    data = program.read_bytes()
    require(len(data) >= 20, f"{program}: truncated program")
    magic, schema, count = struct.unpack_from("<III", data)
    require(magic == 0x46464547, f"{program}: invalid program magic")
    require(schema == 1, f"{program}: invalid program schema")
    cursor = 12
    spirv = None
    for _ in range(count):
        require(cursor <= len(data) - 8, f"{program}: truncated artifact table")
        kind, byte_count = struct.unpack_from("<II", data, cursor)
        cursor += 8
        require(cursor <= len(data) - byte_count, f"{program}: truncated artifact")
        value = data[cursor : cursor + byte_count]
        cursor += byte_count
        if kind == 0x56505356:
            require(spirv is None, f"{program}: duplicate Vulkan SPIR-V artifact")
            spirv = value
    require(cursor == len(data), f"{program}: trailing program data")
    require(spirv is not None, f"{program}: missing Vulkan SPIR-V artifact")
    return spirv


def validate_manifest(root, effect):
    program = root / "Shaders" / f"{effect}.goo-effect"
    manifest_path = root / "Shaders" / f"{effect}.goo-effect.json"
    source = root / "Sources" / f"{effect}.frag.slang"
    authoring = root / "Authoring" / "goo_effect.slang"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    require(manifest.get("schema") == 2, f"{manifest_path}: schema must be 2")
    require(manifest.get("abi") == "goo-shader-effect-2", f"{manifest_path}: invalid ABI")
    require(manifest.get("compiler") == COMPILER,
            f"{manifest_path}: compiler identity does not match the pinned Linux toolchain")
    require(manifest.get("validator") == VALIDATOR, f"{manifest_path}: validator identity does not match")
    source_identity = manifest.get("source", {})
    require(source_identity.get("language") == "slang", f"{manifest_path}: source language must be slang")
    require(source_identity.get("sha256") == sha256(source), f"{manifest_path}: source hash does not match")
    require(source_identity.get("authoringSha256") == sha256(authoring),
            f"{manifest_path}: authoring hash does not match")
    artifacts = manifest.get("artifacts")
    require(isinstance(artifacts, list) and len(artifacts) == 1,
            f"{manifest_path}: expected one backend artifact")
    artifact = artifacts[0]
    require(artifact.get("backend") == "vulkan" and artifact.get("format") == "spirv",
            f"{manifest_path}: backend must be Vulkan SPIR-V")
    require(artifact.get("target") == {
        "vulkan": "1.3", "spirv": "1.6", "stage": "fragment", "entryPoint": "main"
    }, f"{manifest_path}: target identity does not match")
    spirv = read_spirv(program)
    binary = artifact.get("binary", {})
    require(binary.get("bytes") == len(spirv), f"{manifest_path}: SPIR-V byte count does not match")
    require(binary.get("sha256") == hashlib.sha256(spirv).hexdigest(),
            f"{manifest_path}: SPIR-V hash does not match")


def build_provenance(root, commit):
    files = []
    for relative in expected_payload_files():
        path = root / relative
        files.append({"path": relative, "bytes": path.stat().st_size, "sha256": sha256(path)})
    return {
        "schema": 1,
        "repositoryCommit": commit,
        "effects": list(EFFECTS),
        "files": files,
    }


def verify(repository, artifact, commit):
    require(len(commit) == 40 and all(character in "0123456789abcdef" for character in commit),
            "repository commit must be a lowercase 40-character SHA-1")
    project = element_tree.parse(repository / "apps" / "Goo.Gallery" / "Goo.Gallery.gsproj")
    project_effects = []
    for item in project.findall(".//GooShaderEffect"):
        source = item.attrib.get("Include", "")
        target = item.attrib.get("TargetPath", "")
        require(source == f"Shaders/{Path(source).stem}.slang",
                f"Gallery shader source has an unsupported name: {source}")
        effect = Path(source).stem.removesuffix(".frag")
        require(source == f"Shaders/{effect}.frag.slang" and target == f"Shaders/{effect}.goo-effect",
                f"Gallery shader mapping is invalid: {source} -> {target}")
        project_effects.append(effect)
    require(tuple(project_effects) == EFFECTS,
            "Gallery shader artifact inventory differs from GooShaderEffect items")
    provenance_path = artifact / "provenance.json"
    require(provenance_path.is_file(), f"{provenance_path}: missing provenance")
    actual_files = relative_files(artifact)
    expected_files = sorted(expected_payload_files() + ["provenance.json"])
    require(actual_files == expected_files, "shader artifact file set does not match the Gallery project")
    provenance = json.loads(provenance_path.read_text(encoding="utf-8"))
    require(provenance == build_provenance(artifact, commit), "shader artifact provenance does not match")
    for effect in EFFECTS:
        source = artifact / "Sources" / f"{effect}.frag.slang"
        repository_source = repository / "apps" / "Goo.Gallery" / "Shaders" / source.name
        require(source.read_bytes() == repository_source.read_bytes(), f"{source}: source differs from checkout")
        validate_manifest(artifact, effect)
    for name in ("goo_effect.glsl", "goo_effect.slang"):
        artifact_authoring = artifact / "Authoring" / name
        repository_authoring = repository / "Goo" / "Shaders" / "Authoring" / name
        require(artifact_authoring.read_bytes() == repository_authoring.read_bytes(),
                f"{artifact_authoring}: authoring module differs from checkout")


def create(repository, compiled, output, commit):
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="goo-gallery-shaders-", dir=output.parent) as temporary_name:
        temporary = Path(temporary_name)
        (temporary / "Shaders").mkdir()
        (temporary / "Sources").mkdir()
        (temporary / "Authoring").mkdir()
        for effect in EFFECTS:
            shutil.copyfile(compiled / f"{effect}.goo-effect", temporary / "Shaders" / f"{effect}.goo-effect")
            shutil.copyfile(compiled / f"{effect}.goo-effect.json", temporary / "Shaders" / f"{effect}.goo-effect.json")
            shutil.copyfile(repository / "apps" / "Goo.Gallery" / "Shaders" / f"{effect}.frag.slang",
                            temporary / "Sources" / f"{effect}.frag.slang")
        for name in ("goo_effect.glsl", "goo_effect.slang"):
            shutil.copyfile(repository / "Goo" / "Shaders" / "Authoring" / name,
                            temporary / "Authoring" / name)
        (temporary / "provenance.json").write_text(
            json.dumps(build_provenance(temporary, commit), indent=2) + "\n",
            encoding="utf-8",
        )
        verify(repository, temporary, commit)
        if output.exists():
            shutil.rmtree(output)
        shutil.copytree(temporary, output)


def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command", required=True)
    create_parser = subparsers.add_parser("create")
    create_parser.add_argument("--repository", type=Path, required=True)
    create_parser.add_argument("--compiled", type=Path, required=True)
    create_parser.add_argument("--output", type=Path, required=True)
    create_parser.add_argument("--commit", required=True)
    verify_parser = subparsers.add_parser("verify")
    verify_parser.add_argument("--repository", type=Path, required=True)
    verify_parser.add_argument("--input", type=Path, required=True)
    verify_parser.add_argument("--commit", required=True)
    arguments = parser.parse_args()
    repository = arguments.repository.resolve()
    if arguments.command == "create":
        create(repository, arguments.compiled.resolve(), arguments.output.resolve(), arguments.commit)
    else:
        verify(repository, arguments.input.resolve(), arguments.commit)
    print(f"Gallery shader artifact {arguments.command} passed")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, json.JSONDecodeError, RuntimeError) as error:
        print(error, file=sys.stderr)
        sys.exit(1)
