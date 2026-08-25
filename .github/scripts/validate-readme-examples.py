#!/usr/bin/env python3
import argparse
import os
from pathlib import Path
import re
import subprocess
import tempfile

parser = argparse.ArgumentParser()
parser.add_argument("--package-dir", required=True, type=Path)
parser.add_argument("--cache", required=True, type=Path)
args = parser.parse_args()

root = Path(__file__).resolve().parents[2]
readme = (root / "README.md").read_text(encoding="utf-8")
blocks = re.findall(r"```([^\n]*)\n(.*?)```", readme, re.DOTALL)
xml = [code.strip() for language, code in blocks if language == "xml"]
component_examples = [
    code.rstrip()
    for language, code in blocks
    if language in {"gsharp", "csharp"}
    and re.search(r"\bclass\s+\w+\s*:\s*Cell\b", code)
]
if xml != ['<PackageReference Include="Goo" Version="0.2.0" />']:
    raise SystemExit("README package example changed unexpectedly")
if len(component_examples) != 1:
    raise SystemExit(
        f"expected one README component block, found {len(component_examples)}"
    )
source = component_examples[0] + "\n"

package_dir = args.package_dir.resolve()
if not (package_dir / "Goo.0.2.0.nupkg").is_file():
    raise SystemExit(f"missing Goo.0.2.0.nupkg in {package_dir}")
args.cache.mkdir(parents=True, exist_ok=True)
temporary_root = os.environ.get("RUNNER_TEMP")
if temporary_root and not Path(temporary_root).is_dir():
    temporary_root = None
with tempfile.TemporaryDirectory(prefix="goo-readme-smoke-", dir=temporary_root) as directory:
    work = Path(directory)
    (work / "ReadmeSmoke.gsproj").write_text(
        '<Project Sdk="Gsharp.NET.Sdk/0.4.1">\n'
        '  <PropertyGroup>\n'
        '    <OutputType>Exe</OutputType>\n'
        '    <TargetFramework>net10.0</TargetFramework>\n'
        '  </PropertyGroup>\n'
        '  <ItemGroup><PackageReference Include="Goo" Version="0.2.0" /></ItemGroup>\n'
        '</Project>\n', encoding="utf-8")
    (work / "Program.gs").write_text(source, encoding="utf-8")
    (work / "NuGet.Config").write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<configuration><packageSources><clear />\n'
        f'<add key="candidate" value="{package_dir}" />\n'
        '<add key="nuget.org" value="https://api.nuget.org/v3/index.json" />\n'
        '</packageSources></configuration>\n', encoding="utf-8")
    environment = os.environ.copy()
    environment["NUGET_PACKAGES"] = str(args.cache.resolve())
    subprocess.run([
        "dotnet", "build", str(work / "ReadmeSmoke.gsproj"),
        "-c", "Release", "--configfile", str(work / "NuGet.Config"),
        "-p:TreatWarningsAsErrors=true", "--nologo", "--verbosity", "minimal",
    ], check=True, env=environment)
print("README examples compile against Goo.0.2.0")
