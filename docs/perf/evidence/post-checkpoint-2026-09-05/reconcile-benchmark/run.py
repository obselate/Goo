#!/usr/bin/env python3
import argparse
import hashlib
import json
import os
import platform
import shutil
import subprocess
import sys
import time
from pathlib import Path

PREFIX = "reconcile-benchmark:"
COMPLETE = "reconcile-benchmark-complete:"
EXPECTED = {
    *(('style', name, 0) for name in ('nil-equal', 'numeric-mismatch', 'shared-text', 'distinct-equal-text')),
    *(("keyed", name, count) for count in (10, 100, 1000) for name in ("stable", "reorder", "remove-add")),
}


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_line(line):
    fields = {}
    for token in line[len(PREFIX):].strip().split():
        key, value = token.split("=", 1)
        fields[key] = value
    return fields


def snapshot_host():
    result = {
        "time_unix_ns": time.time_ns(),
        "platform": platform.platform(),
        "python": sys.version,
        "loadavg": list(os.getloadavg()),
    }
    for name, path in (
        ("cpu_online", "/sys/devices/system/cpu/online"),
        ("cpu_governor", "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"),
        ("cpu_frequency_khz", "/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq"),
    ):
        try:
            result[name] = Path(path).read_text().strip()
        except OSError:
            result[name] = None
    return result


def prepare_runtime(app_runtime, goo_dir, destination):
    if destination.exists():
        shutil.rmtree(destination)
    shutil.copytree(app_runtime, destination)
    goo = goo_dir / "Goo.dll"
    if not goo.is_file():
        raise RuntimeError(f"missing {goo}")
    shutil.copy2(goo, destination / "Goo.dll")
    pdb = goo_dir / "Goo.pdb"
    if pdb.is_file():
        shutil.copy2(pdb, destination / "Goo.pdb")


def command_for(runtime, cpu):
    native = runtime / "Goo.ReconcileBenchmark"
    if native.is_file():
        command = [str(native)]
    else:
        command = ["dotnet", str(runtime / "Goo.ReconcileBenchmark.dll")]
    if cpu is not None:
        command = ["taskset", "-c", str(cpu), *command]
    return command


def run_one(runtime, lane, comparison, pair, order, args, raw_dir):
    env = {key: value for key, value in os.environ.items() if not key.startswith("GOO_")}
    env.update({
        "GOO_RECON_WARMUP": str(args.warmup),
        "GOO_RECON_SAMPLES": str(args.samples),
        "GOO_RECON_STYLE_BATCH": str(args.style_batch),
        "GOO_RECON_ORDER_SEED": str(pair * 5),
        "DOTNET_TieredCompilation": "0",
        "COMPlus_TieredCompilation": "0",
        "COMPlus_ReadyToRun": "0",
    })
    before = snapshot_host()
    started = time.time_ns()
    completed = subprocess.run(
        command_for(runtime, args.cpu),
        cwd=runtime,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=args.timeout,
    )
    ended = time.time_ns()
    after = snapshot_host()
    name = f"{comparison}-pair{pair:02d}-{order}-{lane}.log"
    log = raw_dir / name
    log.write_text(completed.stdout)
    if completed.returncode != 0:
        raise RuntimeError(f"{name} exited {completed.returncode}")
    rows = [parse_line(line) for line in completed.stdout.splitlines() if line.startswith(PREFIX)]
    keys = {(row["category"], row["case"], int(row["count"])) for row in rows}
    if keys != EXPECTED or len(rows) != len(EXPECTED):
        raise RuntimeError(f"{name} emitted an invalid case set")
    if sum(line.startswith(COMPLETE) for line in completed.stdout.splitlines()) != 1:
        raise RuntimeError(f"{name} did not emit one completion marker")
    for row in rows:
        if int(row["warmup"]) != args.warmup or int(row["samples"]) != args.samples:
            raise RuntimeError(f"{name} emitted the wrong sample configuration")
        expected_batch = args.style_batch if row["category"] == "style" else 1
        if int(row["batch"]) != expected_batch:
            raise RuntimeError(f"{name} emitted the wrong batch size")
        if any(int(row[key]) < 0 for key in (
            "cpu_p50_ns", "cpu_p95_ns", "cpu_p99_ns", "cpu_max_ns",
            "alloc_p50_B", "alloc_p95_B", "alloc_p99_B", "alloc_total_B")):
            raise RuntimeError(f"{name} emitted a negative metric")
    return {
        "comparison": comparison,
        "pair": pair,
        "order": order,
        "lane": lane,
        "log": str(log.relative_to(args.output)),
        "log_sha256": sha256(log),
        "started_unix_ns": started,
        "ended_unix_ns": ended,
        "duration_ns": ended - started,
        "host_before": before,
        "host_after": after,
        "rows": rows,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--app-runtime", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--style", type=Path, required=True)
    parser.add_argument("--keyed", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--pairs", type=int, default=7)
    parser.add_argument("--warmup", type=int, default=500)
    parser.add_argument("--samples", type=int, default=3000)
    parser.add_argument("--style-batch", type=int, default=4096)
    parser.add_argument("--cpu", type=int)
    parser.add_argument("--timeout", type=int, default=900)
    args = parser.parse_args()
    if args.pairs < 1 or args.warmup < 0 or args.samples < 1 or args.style_batch < 1:
        parser.error("invalid run counts")
    if args.output.exists():
        parser.error("output directory already exists")
    args.output.mkdir(parents=True)
    raw_dir = args.output / "raw"
    runtime_dir = args.output / "runtimes"
    raw_dir.mkdir()
    runtime_dir.mkdir()
    lane_sources = {"baseline": args.baseline, "style": args.style, "keyed": args.keyed}
    for lane, source in lane_sources.items():
        prepare_runtime(args.app_runtime.resolve(), source.resolve(), runtime_dir / lane)
    app_hashes = {lane: sha256(runtime_dir / lane / "Goo.ReconcileBenchmark.dll") for lane in lane_sources}
    if len(set(app_hashes.values())) != 1:
        raise RuntimeError("driver binaries differ across lanes")
    goo_hashes = {lane: sha256(runtime_dir / lane / "Goo.dll") for lane in lane_sources}
    if goo_hashes["baseline"] == goo_hashes["style"] or goo_hashes["baseline"] == goo_hashes["keyed"]:
        raise RuntimeError("candidate Goo.dll matches baseline")
    manifest = {
        "schema": 1,
        "configuration": {
            "pairs": args.pairs,
            "warmup": args.warmup,
            "samples": args.samples,
            "style_batch": args.style_batch,
            "cpu": args.cpu,
            "tiered_compilation": False,
            "ready_to_run": False,
            "fresh_process_per_lane_run": True,
            "timings_sequential": True,
        },
        "app_sha256": app_hashes["baseline"],
        "goo_sha256": goo_hashes,
        "initial_host": snapshot_host(),
        "runs": [],
    }
    for comparison, candidate in (("style", "style"), ("keyed", "keyed")):
        for pair in range(args.pairs):
            order = ["baseline", candidate] if pair % 2 == 0 else [candidate, "baseline"]
            for ordinal, lane in enumerate(order):
                manifest["runs"].append(run_one(
                    runtime_dir / lane, lane, comparison, pair, ordinal, args, raw_dir))
                (args.output / "runs.json").write_text(json.dumps(manifest, indent=2) + "\n")
    manifest["final_host"] = snapshot_host()
    (args.output / "runs.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()
