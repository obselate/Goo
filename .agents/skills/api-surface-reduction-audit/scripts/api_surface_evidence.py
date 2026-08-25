#!/usr/bin/env python3

import argparse
import re
from collections import Counter, defaultdict
from pathlib import Path


def arguments():
    parser = argparse.ArgumentParser()
    parser.add_argument("repository", type=Path)
    parser.add_argument("--consumer", action="append", type=Path, default=[])
    return parser.parse_args()


def load_contract(path):
    types = []
    members = Counter()
    kinds = Counter()
    for line in path.read_text(encoding="utf-8").splitlines():
        parts = line.split("|")
        if len(parts) < 2:
            continue
        if parts[0] == "type" and len(parts) >= 4:
            full_name = parts[1]
            short_name = full_name.rsplit(".", 1)[-1].split("`", 1)[0]
            kind = parts[2]
            types.append((full_name, short_name, kind))
            kinds[kind] += 1
        elif parts[0] in {"ctor", "property", "field", "event", "method", "enum"}:
            members[parts[1]] += 1
    return types, members, kinds


def category(relative):
    parts = relative.parts
    lowered = {part.lower() for part in parts}
    if "tests" in lowered or "test" in lowered:
        return "checks"
    if parts and parts[0] == "Goo":
        return "implementation"
    if parts and parts[0] == "Goo.InternalTextInterop":
        return "interop"
    if parts and parts[0] == "docs" and len(parts) > 1 and parts[1] == "api":
        return "generated docs"
    if parts and parts[0] in {"docs", "examples", "proofs"} or relative.name.lower().startswith("readme"):
        return "docs/examples"
    if parts and parts[0] == "tools":
        return "tools"
    return "project"


def source_files(root, external):
    ignored = {
        ".agents", ".git", ".idea", ".venv", ".vs", "bin", "gsharp", "node_modules",
        "obj", "packages", "vendor", "__pycache__",
    }
    suffixes = {".gs", ".cs", ".md"}
    if external:
        roots = [root]
    else:
        roots = [root / name for name in ("Goo", "Goo.InternalTextInterop", "tests", "docs", "tools", "proofs")]
        roots.extend(path for path in (root / "README.md",) if path.is_file())
    for scan_root in roots:
        if scan_root.is_file():
            paths = [scan_root]
        elif scan_root.is_dir():
            paths = scan_root.rglob("*")
        else:
            continue
        for path in paths:
            if not path.is_file() or path.suffix.lower() not in suffixes:
                continue
            relative = path.relative_to(root)
            if any(part in ignored for part in relative.parts):
                continue
            yield path, relative


def scan_root(root, types, external, evidence):
    names = defaultdict(list)
    for full_name, short_name, _ in types:
        names[short_name].append(full_name)
    pattern = re.compile(
        r"(?<![A-Za-z0-9_])(" + "|".join(re.escape(name) for name in sorted(names, key=len, reverse=True))
        + r")(?![A-Za-z0-9_])"
    )
    for path, relative in source_files(root, external):
        try:
            text = path.read_text(encoding="utf-8")
        except UnicodeDecodeError:
            continue
        group = "external" if external else category(relative)
        counts = Counter(match.group(1) for match in pattern.finditer(text))
        for short_name, count in counts.items():
            for full_name in names[short_name]:
                evidence[full_name][group]["files"] += 1
                evidence[full_name][group]["mentions"] += count


def cell(value):
    if not value:
        return "0"
    return f"{value['files']}/{value['mentions']}"


def main():
    args = arguments()
    repository = args.repository.resolve()
    if not repository.is_dir():
        raise SystemExit(f"repository does not exist: {repository}")
    contract = repository / "tests" / "Goo.ApiContractTests" / "PublicApi.approved.txt"
    docs = repository / "docs" / "api"
    if not contract.is_file():
        raise SystemExit(f"missing approved public API contract: {contract}")
    if not docs.is_dir():
        raise SystemExit(f"missing generated API documentation directory: {docs}")

    types, members, kinds = load_contract(contract)
    evidence = defaultdict(lambda: defaultdict(lambda: {"files": 0, "mentions": 0}))
    scan_root(repository, types, False, evidence)
    for consumer in args.consumer:
        consumer = consumer.resolve()
        if not consumer.is_dir():
            raise SystemExit(f"consumer does not exist: {consumer}")
        scan_root(consumer, types, True, evidence)

    print("# Goo public API surface evidence")
    print()
    print(f"- Repository: `{repository}`")
    print(f"- Approved contract: `{contract.relative_to(repository)}`")
    print(f"- Generated API pages: {len(list(docs.glob('*.md')))}")
    print(f"- Exported types: {len(types)}")
    print(f"- Public members and enum values: {sum(members.values())}")
    print("- Type kinds: " + ", ".join(f"{kind}={count}" for kind, count in sorted(kinds.items())))
    print("- Cells are files/mentions. They are textual leads, not proof of external use or removal safety.")
    print()
    print("| Type | Kind | Members | Implementation | Interop | Checks | Docs/examples | Generated docs | Tools | Project | External |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|")
    for full_name, _, kind in types:
        groups = evidence[full_name]
        print(
            f"| `{full_name}` | {kind} | {members[full_name]} | "
            f"{cell(groups['implementation'])} | {cell(groups['interop'])} | {cell(groups['checks'])} | "
            f"{cell(groups['docs/examples'])} | {cell(groups['generated docs'])} | "
            f"{cell(groups['tools'])} | {cell(groups['project'])} | {cell(groups['external'])} |"
        )


if __name__ == "__main__":
    main()
