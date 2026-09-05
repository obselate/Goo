#!/usr/bin/env python3
import argparse
import datetime as dt
import gzip
import hashlib
import json
import os
from pathlib import Path
import platform
import shutil
import subprocess

KINDS = ("container", "button", "text", "text-entry", "text-editor", "image", "shape")
MODE = "sparse"
PREFIX = "all-blob-benchmark:"
TEXT_KEYS = {
    "kind", "mode", "cpu_scope", "gpu_scope", "post_gc_managed_source",
    "post_gc_linux_source",
}
REQUIRED = {
    "kind", "mode", "count", "warmup", "samples", "frame_samples",
    "root_build_count", "initial_leaf_build_count", "cold_observations",
    "cold_cpu_0_ns", "cold_cpu_1_ns", "cold_cpu_min_ns", "cold_cpu_max_ns",
    "cold_managed_alloc_0_B", "cold_managed_alloc_1_B",
    "cold_managed_alloc_min_B", "cold_managed_alloc_max_B",
    "cold_leaf_build_count", "cold_mutation_count", "warm_leaf_build_count",
    "measured_leaf_build_count", "warm_mutation_count", "measured_mutation_count",
    "cpu_scope", "cpu_p50_ns", "cpu_p95_ns", "cpu_p99_ns", "cpu_max_ns",
    "measured_loop_wall_ns", "process_cpu_ns", "managed_alloc_p50_B",
    "managed_alloc_p95_B", "managed_alloc_p99_B", "managed_alloc_total_B",
    "alloc_B_frame", "working_set_start_B", "working_set_end_B",
    "working_set_peak_B", "private_memory_start_B", "private_memory_end_B",
    "private_memory_peak_B", "managed_heap_start_B", "managed_heap_end_B",
    "managed_heap_peak_B", "managed_retained_post_gc_B", "managed_retained_peak_B",
    "post_gc_managed_retained_B", "post_gc_linux_rss_B", "post_gc_linux_pss_B",
    "post_gc_linux_smaps_available", "post_gc_managed_source", "post_gc_linux_source",
    "goo_allocator_start_B", "goo_allocator_end_B", "goo_allocator_peak_B",
    "vk_allocated_start_B", "vk_allocated_end_B", "vk_allocated_peak_B",
    "cache_start_B", "cache_end_B", "cache_peak_B", "image_resident_start_B",
    "image_resident_end_B", "image_resident_peak_B", "text_resident_start_B",
    "text_resident_end_B", "text_resident_peak_B", "readback_pool_resident_before_close_B",
    "gpu_supported", "gpu_scope", "gpu_main_samples", "gpu_main_p50_ns",
    "gpu_main_p99_ns", "gpu_main_dropped_samples", "gpu_upload_samples",
    "gpu_upload_p50_ns", "gpu_upload_p99_ns", "gpu_effects_samples",
    "gpu_effects_p50_ns", "gpu_effects_p99_ns", "gpu_offscreen_samples",
    "gpu_offscreen_p50_ns", "gpu_offscreen_p99_ns", "gpu_dropped_scope_count",
    "gpu_excludes_present", "gpu_main_may_include_effects",
    "gpu_main_may_include_offscreen", "gpu_stage_totals_comparable",
    "submit_delta", "present_delta", "slot0", "slot1", "both_slots", "close",
    "readback_pool_cleanup_B", "cleanup_allocator_B", "cleanup_vk_allocated_B",
    "cleanup_vulkan_objects", "button_text_child",
}


def sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_json(path, value):
    path = Path(path)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")
    os.replace(temporary, path)


def capture(command):
    try:
        result = subprocess.run(command, text=True, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, timeout=30, check=False)
        return {"command": command, "exit_code": result.returncode,
                "stdout": result.stdout.strip(), "stderr": result.stderr.strip()}
    except (OSError, subprocess.TimeoutExpired) as error:
        return {"command": command, "error": str(error)}


def cpu_line():
    try:
        return Path("/proc/stat").read_text().splitlines()[0]
    except (OSError, IndexError) as error:
        return {"error": str(error)}


def machine_state():
    query = ("index,uuid,name,driver_version,pstate,temperature.gpu,power.draw,"
             "clocks.current.graphics,clocks.current.memory,utilization.gpu,"
             "utilization.memory,memory.used,memory.total")
    return {
        "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "load_average": list(os.getloadavg()),
        "proc_stat_cpu": cpu_line(),
        "nvidia_smi": capture([
            "nvidia-smi", f"--query-gpu={query}", "--format=csv,noheader,nounits"
        ]),
    }


def parse_summary(text):
    lines = [line.strip() for line in text.splitlines() if line.strip().startswith(PREFIX)]
    if len(lines) != 1:
        raise ValueError(f"expected exactly one {PREFIX!r} line, found {len(lines)}")
    values = {}
    for token in lines[0][len(PREFIX):].strip().split():
        if "=" not in token:
            raise ValueError(f"malformed summary token {token!r}")
        key, raw = token.split("=", 1)
        if key in values and values[key] != raw:
            raise ValueError(f"conflicting duplicate key {key!r}")
        if key in TEXT_KEYS:
            values[key] = raw
        else:
            try:
                values[key] = int(raw)
            except ValueError as error:
                raise ValueError(f"non-integer {key}={raw!r}") from error
    missing = sorted(REQUIRED - values.keys())
    if missing:
        raise ValueError("missing keys: " + ", ".join(missing))
    return values, lines[0]


def validate(values, item):
    errors = []

    def exact(key, expected):
        if values.get(key) != expected:
            errors.append(f"{key}: expected {expected!r}, got {values.get(key)!r}")

    exact("kind", item["kind"])
    exact("mode", MODE)
    exact("count", 1000)
    exact("warmup", item["warmup"])
    exact("samples", item["samples"])
    exact("frame_samples", item["samples"])
    exact("root_build_count", 1)
    exact("initial_leaf_build_count", 1000)
    exact("cold_observations", 2)
    exact("cold_leaf_build_count", 2)
    exact("cold_mutation_count", 2)
    exact("warm_leaf_build_count", item["warmup"])
    exact("measured_leaf_build_count", item["samples"])
    exact("warm_mutation_count", item["warmup"])
    exact("measured_mutation_count", item["samples"])
    exact("cpu_scope", "host-frame-wall")
    exact("gpu_supported", 1)
    exact("gpu_scope", "main-pass")
    exact("gpu_main_samples", item["samples"])
    exact("gpu_main_dropped_samples", 0)
    exact("gpu_dropped_scope_count", 0)
    exact("gpu_excludes_present", 1)
    exact("gpu_main_may_include_effects", 1)
    exact("gpu_main_may_include_offscreen", 1)
    exact("gpu_stage_totals_comparable", 0)
    exact("submit_delta", item["samples"])
    exact("present_delta", item["samples"])
    exact("slot0", 1)
    exact("slot1", 1)
    exact("both_slots", 1)
    exact("close", 1)
    exact("readback_pool_cleanup_B", 0)
    exact("cleanup_allocator_B", 0)
    exact("cleanup_vk_allocated_B", 0)
    exact("cleanup_vulkan_objects", 0)
    exact("button_text_child", 0)
    exact("post_gc_linux_smaps_available", 1)
    exact("post_gc_managed_source", "GC.GetTotalMemory(true)")
    exact("post_gc_linux_source", "/proc/self/smaps_rollup")
    if values["cold_cpu_min_ns"] != min(values["cold_cpu_0_ns"], values["cold_cpu_1_ns"]):
        errors.append("cold_cpu_min_ns does not match observations")
    if values["cold_cpu_max_ns"] != max(values["cold_cpu_0_ns"], values["cold_cpu_1_ns"]):
        errors.append("cold_cpu_max_ns does not match observations")
    cold_alloc = (values["cold_managed_alloc_0_B"], values["cold_managed_alloc_1_B"])
    if values["cold_managed_alloc_min_B"] != min(cold_alloc):
        errors.append("cold_managed_alloc_min_B does not match observations")
    if values["cold_managed_alloc_max_B"] != max(cold_alloc):
        errors.append("cold_managed_alloc_max_B does not match observations")
    if values["managed_retained_post_gc_B"] != values["post_gc_managed_retained_B"]:
        errors.append("managed retained compatibility fields differ")
    if values["post_gc_linux_pss_B"] > values["post_gc_linux_rss_B"]:
        errors.append("post-GC PSS exceeds RSS")
    if values["alloc_B_frame"] != values["managed_alloc_total_B"] // item["samples"]:
        errors.append("alloc_B_frame does not equal managed_alloc_total_B // samples")
    for key in REQUIRED - TEXT_KEYS:
        if values[key] < 0:
            errors.append(f"{key}: negative value {values[key]}")
    for stage in ("upload", "effects", "offscreen"):
        count = values[f"gpu_{stage}_samples"]
        if count == 0 and (values[f"gpu_{stage}_p50_ns"] != 0
                           or values[f"gpu_{stage}_p99_ns"] != 0):
            errors.append(f"gpu_{stage} reports timing with zero samples")
    if errors:
        raise ValueError("; ".join(errors))


def schedule(rounds, warmup, samples):
    runs = []
    ordinal = 0
    for round_index in range(rounds):
        shift = (round_index * 2) % len(KINDS)
        order = KINDS[shift:] + KINDS[:shift]
        for kind in order:
            ordinal += 1
            runs.append({"ordinal": ordinal, "round": round_index + 1, "kind": kind,
                         "mode": MODE, "warmup": warmup, "samples": samples})
    return runs


def runtime_metadata(runtime, executable, harness):
    paths = {"executable": runtime / executable, "harness_dll": runtime / harness,
             "goo_dll": runtime / "Goo.dll"}
    for path in paths.values():
        if not path.is_file():
            raise FileNotFoundError(path)
    return {"runtime": str(runtime),
            **{name: str(path) for name, path in paths.items()},
            **{name + "_sha256": sha256(path) for name, path in paths.items()}}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--runtime", default="/tmp/goo-blob-table/runtime")
    parser.add_argument("--output")
    parser.add_argument("--phase", choices=("pilot", "final"), default="final")
    parser.add_argument("--rounds", type=int)
    parser.add_argument("--warmup", type=int)
    parser.add_argument("--samples", type=int)
    parser.add_argument("--timeout", type=int, default=900)
    parser.add_argument("--wayland-display", default=os.environ.get("WAYLAND_DISPLAY", "goo-blob-table-qa"))
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--plan-only", action="store_true")
    parser.add_argument("--validation", action=argparse.BooleanOptionalAction, default=False)
    parser.add_argument("--compress-threshold", type=int, default=102400)
    args = parser.parse_args()
    defaults = {"pilot": (1, 50, 100), "final": (5, 300, 2000)}
    default_rounds, default_warmup, default_samples = defaults[args.phase]
    rounds = args.rounds if args.rounds is not None else default_rounds
    warmup = args.warmup if args.warmup is not None else default_warmup
    samples = args.samples if args.samples is not None else default_samples
    if rounds < 1 or not 1 <= warmup <= 2000 or not 1 <= samples <= 10000:
        raise ValueError("rounds must be positive, warmup 1..2000, samples 1..10000")
    output = Path(args.output or f"/tmp/goo-blob-table/results/{args.phase}").resolve()
    plan = schedule(rounds, warmup, samples)
    output.mkdir(parents=True, exist_ok=True)
    plan_doc = {"phase": args.phase, "rounds": rounds, "warmup": warmup,
                "samples": samples, "mode": MODE, "validation": args.validation,
                "wayland_display": args.wayland_display, "runs": plan}
    atomic_json(output / "plan.json", plan_doc)
    if args.plan_only:
        print(f"planned {len(plan)} sequential processes in {output}")
        return
    runtime = Path(args.runtime).resolve()
    executable = "Goo.AsyncReadbackSmoke"
    harness = "Goo.AsyncReadbackSmoke.dll"
    binaries = runtime_metadata(runtime, executable, harness)
    removed_names = sorted(name for name in os.environ
                           if name.startswith("GOO_") or name in ("VK_INSTANCE_LAYERS", "VK_LAYER_PATH"))
    environment_path = output / "environment.json"
    environment_doc = {
        "created_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "hostname": platform.node(), "platform": platform.platform(),
        "python": platform.python_version(), "display": os.environ.get("DISPLAY"),
        "host_wayland_display": os.environ.get("WAYLAND_DISPLAY"),
        "effective_wayland_display": args.wayland_display,
        "cleared_environment_names": removed_names, "validation_enabled": args.validation,
        "effective_vk_instance_layers": "VK_LAYER_KHRONOS_validation" if args.validation else None,
        "initial_state": machine_state(), "binaries": binaries, "plan": plan_doc,
    }
    if not environment_path.exists():
        atomic_json(environment_path, environment_doc)
    results_path = output / "runs.json"
    configuration = {"phase": args.phase, "rounds": rounds, "warmup": warmup,
                     "samples": samples, "mode": MODE, "validation": args.validation,
                     "wayland_display": args.wayland_display}
    state = {"configuration": configuration, "binaries": binaries, "runs": []}
    if args.resume and results_path.exists():
        state = json.loads(results_path.read_text())
        if state.get("configuration") != configuration or state.get("binaries") != binaries:
            raise ValueError("resume configuration or binary hash mismatch")
    elif results_path.exists():
        raise FileExistsError(f"{results_path} exists; use --resume or a clean output")
    completed = {(run["round"], run["kind"]) for run in state["runs"] if run.get("validated")}
    logs = output / "logs"
    snapshots = output / "state"
    logs.mkdir(exist_ok=True)
    snapshots.mkdir(exist_ok=True)
    for item in plan:
        key = (item["round"], item["kind"])
        if key in completed:
            continue
        if runtime_metadata(runtime, executable, harness) != binaries:
            raise RuntimeError("frozen runtime binaries changed during the benchmark")
        run_id = f"{item['ordinal']:03d}-r{item['round']}-{item['kind']}-sparse"
        atomic_json(snapshots / f"{run_id}.pre.json", {"run": item, "state": machine_state()})
        environment = os.environ.copy()
        for name in list(environment):
            if name.startswith("GOO_"):
                environment.pop(name, None)
        environment.pop("VK_INSTANCE_LAYERS", None)
        environment.pop("VK_LAYER_PATH", None)
        if args.validation:
            environment["VK_INSTANCE_LAYERS"] = "VK_LAYER_KHRONOS_validation"
        environment.update({
            "WAYLAND_DISPLAY": args.wayland_display,
            "GOO_VK_DIAGNOSTICS": "1", "GOO_ALL_BLOB_BENCHMARK": "1",
            "GOO_ALL_BLOB_KIND": item["kind"], "GOO_ALL_BLOB_MODE": MODE,
            "GOO_ALL_BLOB_WARMUP": str(item["warmup"]),
            "GOO_ALL_BLOB_SAMPLES": str(item["samples"]),
        })
        started = dt.datetime.now(dt.timezone.utc)
        process = subprocess.run([str(runtime / executable)], cwd=runtime, env=environment,
                                 stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                 timeout=args.timeout, check=False)
        ended = dt.datetime.now(dt.timezone.utc)
        text = process.stdout.decode("utf-8", errors="replace")
        log = logs / f"{run_id}.log"
        log.write_text(text)
        atomic_json(snapshots / f"{run_id}.post.json", {"run": item, "state": machine_state()})
        if process.returncode != 0:
            raise RuntimeError(f"{run_id} exited {process.returncode}; see {log}")
        markers = [value for value in ("unhandled exception", "validation error", "device lost", "fatal error")
                   if value in text.lower()]
        if markers:
            raise RuntimeError(f"{run_id} contains failure markers {markers}; see {log}")
        values, summary = parse_summary(text)
        validate(values, item)
        record = dict(item)
        record.update({"validated": True, "started_utc": started.isoformat(),
                       "ended_utc": ended.isoformat(),
                       "wall_seconds": (ended - started).total_seconds(),
                       "validation_enabled": args.validation,
                       "log": str(log.relative_to(output)), "summary": summary,
                       "metrics": values})
        state["runs"].append(record)
        atomic_json(results_path, state)
        print(f"validated {run_id}", flush=True)
    for log in sorted(logs.glob("*.log")):
        if log.stat().st_size < args.compress_threshold:
            continue
        compressed = log.with_suffix(".log.gz")
        with log.open("rb") as source, compressed.open("wb") as raw:
            with gzip.GzipFile(filename="", mode="wb", compresslevel=9,
                               fileobj=raw, mtime=0) as destination:
                shutil.copyfileobj(source, destination)
        log.unlink()
        for record in state["runs"]:
            if record["log"] == str(log.relative_to(output)):
                record["log"] = str(compressed.relative_to(output))
    atomic_json(results_path, state)
    actual = {(run["round"], run["kind"]) for run in state["runs"] if run.get("validated")}
    expected = {(run["round"], run["kind"]) for run in plan}
    if runtime_metadata(runtime, executable, harness) != binaries:
        raise RuntimeError("frozen runtime binaries changed during the benchmark")
    atomic_json(output / "complete.json", {
        "completed_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "run_count": len(expected), "all_validated": actual == expected,
    })


if __name__ == "__main__":
    main()
