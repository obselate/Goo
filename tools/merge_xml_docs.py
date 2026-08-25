#!/usr/bin/env python3
import argparse
import os
from pathlib import Path
import tempfile
import xml.etree.ElementTree as ElementTree


def load_members(path: Path) -> list[ElementTree.Element]:
    root = ElementTree.parse(path).getroot()
    if root.tag != "doc":
        raise SystemExit(f"XML documentation root must be <doc>: {path}")
    members = root.find("members")
    if members is None:
        raise SystemExit(f"XML documentation has no <members>: {path}")
    return list(members)


def equivalent(left: ElementTree.Element, right: ElementTree.Element) -> bool:
    if left.tag != right.tag or left.attrib != right.attrib:
        return False
    if (left.text or "").split() != (right.text or "").split():
        return False
    if len(left) != len(right):
        return False
    return all(equivalent(a, b) for a, b in zip(left, right))


def merge(generated: Path, supplement: Path) -> None:
    tree = ElementTree.parse(generated)
    root = tree.getroot()
    if root.tag != "doc":
        raise SystemExit(f"XML documentation root must be <doc>: {generated}")
    members = root.find("members")
    if members is None:
        raise SystemExit(f"XML documentation has no <members>: {generated}")
    existing = {
        member.attrib["name"]: member
        for member in members
        if "name" in member.attrib
    }
    for member in load_members(supplement):
        name = member.attrib.get("name")
        if not name:
            raise SystemExit(f"Supplement member has no name: {supplement}")
        if name in existing:
            if not equivalent(existing[name], member):
                raise SystemExit(f"Conflicting XML documentation member: {name}")
            continue
        existing[name] = member
    members[:] = [existing[name] for name in sorted(existing)]
    ElementTree.indent(tree, space="    ")
    with tempfile.NamedTemporaryFile(
        mode="wb", dir=generated.parent, prefix=f".{generated.name}.", delete=False
    ) as temporary:
        temporary_path = Path(temporary.name)
        tree.write(temporary, encoding="utf-8", xml_declaration=True)
    os.replace(temporary_path, generated)


parser = argparse.ArgumentParser()
parser.add_argument("--generated", required=True, type=Path)
parser.add_argument("--supplement", required=True, type=Path)
arguments = parser.parse_args()
if not arguments.generated.is_file():
    raise SystemExit(f"Generated XML documentation is missing: {arguments.generated}")
if not arguments.supplement.is_file():
    raise SystemExit(f"XML documentation supplement is missing: {arguments.supplement}")
merge(arguments.generated, arguments.supplement)
