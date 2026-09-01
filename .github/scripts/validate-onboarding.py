#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
import re
import subprocess
import xml.etree.ElementTree as element_tree

ROOT = Path(__file__).resolve().parents[2]
EXPECTED_PACKAGE_IDS = {
    "Goo",
    "Goo.DevTools",
    "Goo.DevTools.App",
    "Goo.SvgCompiler",
    "Goo.Templates",
}
VERSION_TEXT_FILES = {
    "apps/Goo.DevTools/DiagnosticWire.gs",
    "apps/Goo.DevTools/Program.gs",
    "apps/Goo.DevTools/README.md",
    "apps/Goo.Gallery/Program.gs",
    "apps/Goo.WindowsDemo/Program.gs",
    "docs/devtools/README.md",
    "docs/devtools/protocol.md",
    "integrations/rider/README.md",
    "integrations/vscode/README.md",
    "templates/Goo.Templates/README.md",
    "tools/Goo.DevTools.Cli/CliApplication.cs",
    "tools/Goo.DevTools.Cli/ProtocolConnection.cs",
    "tools/Goo.SvgCompiler/README.md",
}


def fail(message: str) -> None:
    raise SystemExit(message)


def tracked_files() -> list[str]:
    result = subprocess.run(
        ["git", "ls-files", "-z"],
        cwd=ROOT,
        check=True,
        stdout=subprocess.PIPE,
    )
    return [item.decode() for item in result.stdout.split(b"\0") if item]


def markdown_prose(text: str) -> str:
    lines: list[str] = []
    fenced = False
    for line in text.splitlines():
        if line.lstrip().startswith("```"):
            fenced = not fenced
            continue
        if not fenced:
            lines.append(line)
    return "\n".join(lines)


def project_versions(version: str, files: list[str]) -> None:
    package_ids: set[str] = set()
    for relative in files:
        if not relative.endswith((".csproj", ".gsproj")):
            continue
        root = element_tree.parse(ROOT / relative).getroot()
        package_id = root.findtext(".//PackageId")
        project_version = root.findtext(".//Version")
        if package_id and package_id.startswith("Goo"):
            package_ids.add(package_id)
            if project_version != version:
                fail(f"{relative}: package version is {project_version}, expected {version}")
        for reference in root.findall(".//PackageReference"):
            if reference.get("Include") == "Goo" and reference.get("Version") != version:
                fail(f"{relative}: Goo reference is {reference.get('Version')}, expected {version}")
    if package_ids != EXPECTED_PACKAGE_IDS:
        fail(f"Goo package IDs differ: found={sorted(package_ids)} expected={sorted(EXPECTED_PACKAGE_IDS)}")


def template_version(version: str) -> None:
    path = ROOT / "templates/Goo.Templates/content/.template.config/template.json"
    document = json.loads(path.read_text(encoding="utf-8"))
    symbol = document["symbols"]["goo-version"]
    if symbol.get("defaultValue") != version or symbol.get("replaces") != version:
        fail(f"{path.relative_to(ROOT)}: template Goo version must be {version}")


def release_text(version: str) -> None:
    workflow = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8")
    if f"  GOO_VERSION: {version}\n" not in workflow:
        fail(".github/workflows/ci.yml: GOO_VERSION differs")
    changelog = (ROOT / "CHANGELOG.md").read_text(encoding="utf-8")
    if not re.search(rf"^## {re.escape(version)} - \d{{4}}-\d{{2}}-\d{{2}}$", changelog, re.MULTILINE):
        fail(f"CHANGELOG.md: release heading for {version} is missing")
    readme = (ROOT / "README.md").read_text(encoding="utf-8")
    required = {
        f"dotnet new install Goo.Templates --version {version}",
        f"dotnet tool install --global Goo.DevTools --version {version}",
        f"dotnet tool install --global Goo.DevTools.App --version {version}",
        f"dotnet tool install --global Goo.SvgCompiler --version {version}",
        "Windows has been tested on Windows 11",
        "minimum supported Windows version has not yet been established",
        "## Troubleshooting",
    }
    missing = sorted(item for item in required if item not in readme)
    if missing:
        fail(f"README.md: required onboarding text is missing: {missing}")
    if "Windows requires Windows 11" in readme:
        fail("README.md: Windows 11 must be a tested environment, not a minimum requirement")
    readme_prose = markdown_prose(readme)
    relative_links = [
        target for target in re.findall(r"!?\[[^\]\n]*\]\(([^)\n]+)\)", readme_prose)
        if not target.startswith(("#", "http://", "https://"))
    ]
    relative_html = [
        target for target in re.findall(r"(?:href|src)=\"([^\"]+)\"", readme_prose)
        if not target.startswith(("#", "http://", "https://"))
    ]
    if relative_links or relative_html:
        fail(f"README.md: NuGet cannot resolve relative links: {relative_links + relative_html}")
    for relative in VERSION_TEXT_FILES:
        text = (ROOT / relative).read_text(encoding="utf-8")
        if version not in text:
            fail(f"{relative}: current release version {version} is missing")
        unexpected = sorted(set(re.findall(r"\b0\.\d+\.\d+\b", text)) - {version})
        if unexpected:
            fail(f"{relative}: stale Goo versions remain: {unexpected}")


def markdown_links(files: list[str]) -> None:
    failures: list[str] = []
    pattern = re.compile(r"!?\[[^\]\n]*\]\(([^)\n]+)\)")
    for relative in files:
        if not relative.endswith(".md") or relative.startswith("vendor/"):
            continue
        path = ROOT / relative
        text = markdown_prose(path.read_text(encoding="utf-8"))
        for target in pattern.findall(text):
            target = target.strip().split(maxsplit=1)[0].strip("<>")
            if not target or target.startswith(("#", "http://", "https://", "mailto:")):
                continue
            local = target.split("#", 1)[0]
            destination = (path.parent / local).resolve()
            if not destination.exists():
                failures.append(f"{relative}: {target}")
    if failures:
        fail("broken local Markdown links:\n" + "\n".join(failures))


parser = argparse.ArgumentParser()
parser.add_argument("--version", required=True)
args = parser.parse_args()
tracked = tracked_files()
project_versions(args.version, tracked)
template_version(args.version)
release_text(args.version)
markdown_links(tracked)
print(f"Onboarding metadata OK: Goo {args.version}, {len(EXPECTED_PACKAGE_IDS)} packages")
