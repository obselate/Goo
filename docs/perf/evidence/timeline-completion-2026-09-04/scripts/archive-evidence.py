#!/usr/bin/env python3
import argparse
import difflib
import gzip
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess
import tempfile
import time


ROOT = Path("/home/xaz/Projects/goo-gsharp")
WORK = Path("/tmp/goo-timeline")
BEFORE = WORK / "before"
DEST = ROOT / "docs/perf/evidence/timeline-completion-2026-09-04"
LARGE_LOG_BYTES = 64 * 1024
BASELINE_OMISSIONS = {
    "tests/Goo.VulkanProof/Generated/Vulkan.Generated.gs":
        "pre-task generated file was not captured; excluded from task.patch",
}
CONFIRMED_NEW = {"tests/Goo.AsyncReadbackSmoke/TimelineCompletionSmoke.gs"}


def sha256(path):
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_bytes(path, content):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
        stream.write(content)
        temporary = Path(stream.name)
    os.replace(temporary, path)


def write_text(path, content):
    write_bytes(path, content.encode())


def command(*arguments):
    result = subprocess.run(arguments, cwd=ROOT, check=True,
                            stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                            text=True)
    return result.stdout.strip()


def active_final_runner():
    own_pid = os.getpid()
    needles = ("verify-final.py", "verify-lru.py", "timestamp-lru-")
    for process in Path("/proc").iterdir():
        if not process.name.isdigit() or int(process.name) == own_pid:
            continue
        try:
            command_line = (process / "cmdline").read_bytes().replace(b"\0", b" ").decode()
        except (FileNotFoundError, PermissionError, UnicodeDecodeError):
            continue
        if any(needle in command_line for needle in needles):
            return command_line
    return None


def result_evidence(include_final):
    evidence = {}
    native = WORK / "native-results.json"
    if native.exists():
        for name, code in json.loads(native.read_text()).items():
            evidence[name + ".log"] = code
    contention = WORK / "timestamp-contention-results.json"
    if contention.exists():
        runs = json.loads(contention.read_text())
        if runs:
            candidate, baseline = runs[0]
            evidence["timestamp-contention-1-candidate.log"] = candidate
            evidence["timestamp-contention-1-baseline.log"] = baseline
    if include_final:
        final_native = WORK / "final-native-results.json"
        if not final_native.exists():
            raise SystemExit("final-native-results.json is missing")
        final_native_values = json.loads(final_native.read_text())
        expected_lanes = {
            "timeline", "readback", "metrics", "retention",
            "pipeline-identity", "queue-isolation", "live-pacing",
        }
        if set(final_native_values) != expected_lanes:
            raise SystemExit("final native results are incomplete")
        for name, code in final_native_values.items():
            evidence[name + "-lru-final.log"] = code
        timestamp = WORK / "timestamp-lru-results.json"
        if not timestamp.exists():
            raise SystemExit("timestamp-lru-results.json is missing")
        timestamp_values = json.loads(timestamp.read_text())
        if len(timestamp_values) != 4:
            raise SystemExit("timestamp LRU results are incomplete")
        for index, values in enumerate(timestamp_values):
            for name, code in values.items():
                evidence[f"timestamp-lru-{index}-{name}.log"] = code
        reported = WORK / "root-final-results.json"
        if reported.exists():
            evidence.update(json.loads(reported.read_text()))
    return evidence


def build_diff(changed_files):
    chunks = []
    source_hashes = []
    for relative in changed_files:
        before = BEFORE / relative
        after = ROOT / relative
        before_bytes = before.read_bytes() if before.exists() else b""
        after_bytes = after.read_bytes() if after.exists() else b""
        source_hashes.append({
            "path": relative,
            "baseline_classification": (
                "omitted_pre_task_file" if relative in BASELINE_OMISSIONS
                else "confirmed_new_file" if relative in CONFIRMED_NEW
                else "captured"
            ),
            "baseline_note": BASELINE_OMISSIONS.get(relative),
            "included_in_task_patch": relative not in BASELINE_OMISSIONS,
            "before_exists": before.exists(),
            "before_sha256": sha256(before) if before.exists() else None,
            "before_bytes": len(before_bytes) if before.exists() else None,
            "after_exists": after.exists(),
            "after_sha256": sha256(after) if after.exists() else None,
            "after_bytes": len(after_bytes) if after.exists() else None,
        })
        if relative in BASELINE_OMISSIONS:
            continue
        before_lines = before_bytes.decode(errors="surrogateescape").splitlines(True)
        after_lines = after_bytes.decode(errors="surrogateescape").splitlines(True)
        chunks.extend(difflib.unified_diff(
            before_lines, after_lines,
            fromfile="a/" + relative, tofile="b/" + relative,
        ))
    return "".join(chunks).encode(errors="surrogateescape"), source_hashes


def selected_logs(include_final):
    logs = []
    for path in sorted(WORK.glob("*.log")):
        name = path.name
        if "lru" in name and not include_final:
            continue
        first = path.stat()
        time.sleep(0.01)
        second = path.stat()
        if first.st_size != second.st_size or first.st_mtime_ns != second.st_mtime_ns:
            continue
        logs.append(path)
    return logs


def copy_log(path, result_codes):
    compress = (path.stat().st_size >= LARGE_LOG_BYTES
                or path.name.startswith("offscreen-failure")
                or path.name.startswith("timestamp-contention"))
    destination_name = path.name + (".gz" if compress else "")
    destination = DEST / "logs" / destination_name
    data = path.read_bytes()
    if compress:
        destination.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.NamedTemporaryFile(dir=destination.parent, delete=False) as stream:
            with gzip.GzipFile(filename=path.name, mode="wb", fileobj=stream,
                               mtime=0) as compressed:
                compressed.write(data)
            temporary = Path(stream.name)
        os.replace(temporary, destination)
    else:
        write_bytes(destination, data)
    code = result_codes.get(path.name)
    if code is not None:
        state = "pass" if code == 0 else "fail"
        basis = "recorded process exit code"
    elif b"Build succeeded." in data or b"Passed!" in data:
        state = "success-output"
        basis = "log success marker; exit code was not recorded"
    elif b"Unhandled exception." in data or b"Build FAILED." in data:
        state = "failure-output"
        basis = "log failure marker; exit code was not recorded"
    else:
        state = "diagnostic"
        basis = "no process exit code was recorded"
    return {
        "source": str(path),
        "archive": "logs/" + destination_name,
        "source_bytes": len(data),
        "archive_sha256": sha256(destination),
        "compressed": compress,
        "status": state,
        "recorded_exit_code": code,
        "evidence": basis,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--include-final", action="store_true")
    args = parser.parse_args()
    if args.include_final:
        active = active_final_runner()
        if active:
            raise SystemExit("final verification is still running: " + active)
    changed_files = json.loads((WORK / "changed-files.json").read_text())
    task_diff, source_hashes = build_diff(changed_files)
    result_codes = result_evidence(args.include_final)
    DEST.mkdir(parents=True, exist_ok=True)
    (DEST / "scripts").mkdir(parents=True, exist_ok=True)
    if (DEST / "logs").exists():
        shutil.rmtree(DEST / "logs")
    (DEST / "logs").mkdir(parents=True, exist_ok=True)
    write_bytes(DEST / "task.patch", task_diff)
    write_text(DEST / "source-hashes.json",
               json.dumps(source_hashes, indent=2, sort_keys=True) + "\n")
    shutil.copy2(WORK / "changed-files.json", DEST / "changed-files.json")
    shutil.copy2(WORK / "initial-status.txt", DEST / "initial-status.txt")
    write_text(DEST / "current-status.txt", command("git", "status", "--short") + "\n")

    binaries = []
    binary_paths = (
        ("candidate-async-smoke",
         ROOT / "tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.AsyncReadbackSmoke.dll"),
        ("candidate-async-framework",
         ROOT / "tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.dll"),
        ("candidate-failed-idle-smoke",
         ROOT / "tests/Goo.FailedIdleSmoke/bin/Release/net10.0/Goo.FailedIdleSmoke.dll"),
        ("candidate-failed-idle-framework",
         ROOT / "tests/Goo.FailedIdleSmoke/bin/Release/net10.0/Goo.dll"),
        ("baseline-async-smoke", WORK / "baseline-runtime/Goo.AsyncReadbackSmoke.dll"),
        ("baseline-async-framework", WORK / "baseline-runtime/Goo.dll"),
    )
    for label, path in binary_paths:
        binaries.append({
            "label": label,
            "path": str(path.relative_to(ROOT)) if path.is_relative_to(ROOT) else str(path),
            "bytes": path.stat().st_size,
            "sha256": sha256(path),
            "modified_ns": path.stat().st_mtime_ns,
        })
    write_text(DEST / "binary-hashes.json",
               json.dumps(binaries, indent=2, sort_keys=True) + "\n")
    generated = ROOT / "tests/Goo.VulkanProof/Generated/Vulkan.Generated.gs"
    regenerated = WORK / "Vulkan.Generated.check.gs"
    generated_parity = {
        "current_path": str(generated.relative_to(ROOT)),
        "current_sha256": sha256(generated),
        "regenerated_path": str(regenerated),
        "regenerated_sha256": sha256(regenerated),
        "byte_equal": generated.read_bytes() == regenerated.read_bytes(),
        "baseline_note": BASELINE_OMISSIONS[str(generated.relative_to(ROOT))],
        "proof_log": "logs/generator-check.log",
    }
    write_text(DEST / "generated-proof-parity.json",
               json.dumps(generated_parity, indent=2, sort_keys=True) + "\n")

    script_names = (
        "verify-lru.py", "verify-final.py", "run-ci.sh",
        "validate_timeline_abi.py", "mirror_timeline_abi.py",
        "layer-lru.patch", "performance-diagnostics-hotpath.patch",
    )
    for name in script_names:
        source = WORK / name
        if source.exists():
            shutil.copy2(source, DEST / "scripts" / name)
    shutil.copy2(Path(__file__), DEST / "scripts/archive-evidence.py")
    environment = {
        "captured_at_utc": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "repository": str(ROOT),
        "git_head": command("git", "rev-parse", "HEAD"),
        "dotnet_version": command("dotnet", "--version"),
        "kernel": platform.release(),
        "machine": platform.machine(),
        "archive_mode": "completed-plus-final" if args.include_final else "completed-only",
        "excluded_active_pattern": None if args.include_final else "*lru*",
    }
    write_text(DEST / "scripts/environment.json",
               json.dumps(environment, indent=2, sort_keys=True) + "\n")

    log_records = [copy_log(path, result_codes)
                   for path in selected_logs(args.include_final)]
    for name in ("native-results.json", "timestamp-contention-results.json"):
        source = WORK / name
        if source.exists():
            shutil.copy2(source, DEST / "logs" / name)
    if args.include_final:
        for name in ("final-native-results.json", "timestamp-lru-results.json",
                     "root-final-results.json"):
            shutil.copy2(WORK / name, DEST / "logs" / name)
    abi_logs = [entry["archive"] for entry in log_records
                if Path(entry["source"]).name in ("abi-parity.log", "abi-smoke.log")]
    manifest = {
        "scope": "shared graphics timeline migration",
        "task_diff": {
            "path": "task.patch",
            "sha256": sha256(DEST / "task.patch"),
            "bytes": len(task_diff),
            "baseline": str(BEFORE),
        },
        "changed_file_count": len(changed_files),
        "source_hashes": "source-hashes.json",
        "generated_proof_parity": "generated-proof-parity.json",
        "binary_hashes": "binary-hashes.json",
        "initial_status": "initial-status.txt",
        "current_status": "current-status.txt",
        "abi_proof_logs": abi_logs,
        "logs": log_records,
        "final_results_included": args.include_final,
        "status_policy": "pass/fail requires a recorded process exit code; other states describe log content only",
    }
    write_text(DEST / "verification.json",
               json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "destination": str(DEST),
        "changed_files": len(changed_files),
        "logs": len(log_records),
        "compressed_logs": sum(1 for entry in log_records if entry["compressed"]),
        "final_results_included": args.include_final,
    }, sort_keys=True))


if __name__ == "__main__":
    main()
