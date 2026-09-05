#!/usr/bin/env python3
import argparse
import hashlib
import importlib.util
import json
import os
import shutil
import statistics
import subprocess
import time
from pathlib import Path


def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def load_validator(path):
    spec = importlib.util.spec_from_file_location("all_blob_runner", path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    module.TEXT_KEYS |= {"post_gc_managed_source", "post_gc_linux_source"}
    return module


def prepare(app, goo, destination):
    shutil.copytree(app, destination)
    shutil.copy2(goo / "Goo.dll", destination / "Goo.dll")


def machine_state():
    state = {"time_unix_ns": time.time_ns(), "loadavg": list(os.getloadavg())}
    for key, path in (
        ("cpu_frequency_khz", "/sys/devices/system/cpu/cpu0/cpufreq/scaling_cur_freq"),
        ("cpu_governor", "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor"),
    ):
        try:
            state[key] = Path(path).read_text().strip()
        except OSError:
            state[key] = None
    return state


def run_one(runtime, lane, pair, order, args, validator, logs):
    env = {key: value for key, value in os.environ.items()
           if not key.startswith("GOO_") and key not in ("VK_INSTANCE_LAYERS", "VK_LAYER_PATH")}
    env.update({
        "WAYLAND_DISPLAY": args.wayland,
        "GOO_VK_DIAGNOSTICS": "1",
        "GOO_ALL_BLOB_BENCHMARK": "1",
        "GOO_ALL_BLOB_KIND": "container",
        "GOO_ALL_BLOB_MODE": "full",
        "GOO_ALL_BLOB_WARMUP": str(args.warmup),
        "GOO_ALL_BLOB_SAMPLES": str(args.samples),
    })
    before = machine_state()
    started = time.time_ns()
    result = subprocess.run(
        [str(runtime / "Goo.AsyncReadbackSmoke")],
        cwd=runtime,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        timeout=args.timeout,
    )
    ended = time.time_ns()
    text = result.stdout.decode("utf-8", errors="replace")
    log = logs / f"pair{pair:02d}-{order}-{lane}.log"
    log.write_text(text)
    if result.returncode != 0:
        raise RuntimeError(f"{log.name} exited {result.returncode}")
    markers = [value for value in ("unhandled exception", "validation error", "device lost", "fatal error") if value in text.lower()]
    if markers:
        raise RuntimeError(f"{log.name} contains {markers}")
    values, summary = validator.parse_summary(text)
    validator.validate(values, {"kind": "container", "mode": "full", "warmup": args.warmup, "samples": args.samples})
    return {
        "pair": pair,
        "order": order,
        "lane": lane,
        "started_unix_ns": started,
        "ended_unix_ns": ended,
        "duration_ns": ended - started,
        "host_before": before,
        "host_after": machine_state(),
        "log": str(log.relative_to(args.output)),
        "log_sha256": sha256(log),
        "summary": summary,
        "metrics": values,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--app-runtime", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, required=True)
    parser.add_argument("--style", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--wayland", default="goo-reconcile-benchmark")
    parser.add_argument("--pairs", type=int, default=5)
    parser.add_argument("--warmup", type=int, default=300)
    parser.add_argument("--samples", type=int, default=2000)
    parser.add_argument("--timeout", type=int, default=900)
    args = parser.parse_args()
    if args.output.exists():
        parser.error("output exists")
    args.output.mkdir(parents=True)
    logs = args.output / "logs"
    runtimes = args.output / "runtimes"
    logs.mkdir()
    runtimes.mkdir()
    prepare(args.app_runtime.resolve(), args.baseline.resolve(), runtimes / "baseline")
    prepare(args.app_runtime.resolve(), args.style.resolve(), runtimes / "style")
    app_hashes = {lane: sha256(runtimes / lane / "Goo.AsyncReadbackSmoke.dll") for lane in ("baseline", "style")}
    if len(set(app_hashes.values())) != 1:
        raise RuntimeError("application binary mismatch")
    goo_hashes = {lane: sha256(runtimes / lane / "Goo.dll") for lane in ("baseline", "style")}
    if len(set(goo_hashes.values())) != 2:
        raise RuntimeError("Goo candidate matches baseline")
    validator = load_validator(Path(__file__).with_name("all_blob_validator.py"))
    result = {
        "schema": 1,
        "scope": "native whole host-frame wall time for 1000 Container blobs under full mutation",
        "gpu_scope": "main-pass is diagnostic only and excludes presentation",
        "configuration": {"pairs": args.pairs, "warmup": args.warmup, "samples": args.samples, "validation": False, "wayland": args.wayland, "sequential": True, "fresh_process": True},
        "app_sha256": app_hashes["baseline"],
        "goo_sha256": goo_hashes,
        "runs": [],
    }
    for pair in range(args.pairs):
        order = ("baseline", "style") if pair % 2 == 0 else ("style", "baseline")
        for ordinal, lane in enumerate(order):
            result["runs"].append(run_one(runtimes / lane, lane, pair, ordinal, args, validator, logs))
            (args.output / "runs.json").write_text(json.dumps(result, indent=2) + "\n")
    paired = []
    for pair in range(args.pairs):
        rows = {row["lane"]: row["metrics"] for row in result["runs"] if row["pair"] == pair}
        item = {"pair": pair}
        for field in ("cpu_p50_ns", "cpu_p95_ns", "cpu_p99_ns", "managed_alloc_p50_B", "managed_alloc_p99_B", "gpu_main_p50_ns", "gpu_main_p99_ns"):
            baseline = rows["baseline"][field]
            style = rows["style"][field]
            item[field] = {"baseline": baseline, "style": style, "change_pct": None if baseline == 0 else (style - baseline) * 100.0 / baseline}
        paired.append(item)
    analysis = {"pairs": paired, "metrics": {}}
    for field in paired[0]:
        if field == "pair":
            continue
        bases = [row[field]["baseline"] for row in paired]
        styles = [row[field]["style"] for row in paired]
        changes = [row[field]["change_pct"] for row in paired if row[field]["change_pct"] is not None]
        analysis["metrics"][field] = {
            "baseline_median_of_process_stat": statistics.median(bases),
            "style_median_of_process_stat": statistics.median(styles),
            "paired_change_pct_median": statistics.median(changes) if changes else None,
            "style_lower_pairs": sum(s < b for b, s in zip(bases, styles)),
            "baseline_range": [min(bases), max(bases)],
            "style_range": [min(styles), max(styles)],
        }
    (args.output / "analysis.json").write_text(json.dumps(analysis, indent=2) + "\n")


if __name__ == "__main__":
    main()
