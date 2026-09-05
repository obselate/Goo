#!/usr/bin/env python3
import argparse
import datetime as dt
import gzip
import hashlib
import json
import os
from pathlib import Path
import platform
import re
import shutil
import subprocess
import sys
import time

PREFIX = "retained-primitive-staging:"
WORKLOADS = ("unchanged", "sparse", "full")
PERCENTILE_KEYS = ("p50_ns", "p95_ns", "p99_ns", "max_ns")
REQUIRED_KEYS = {
    "samples", "workload", "record_count", "byte_count", "p50_ns", "p95_ns",
    "p99_ns", "max_ns", "alloc_B_frame", "alloc_total_B", "alloc_p50_B",
    "alloc_p99_B", "measured_cpu_written_B", "measured_cpu_compared_B",
    "measured_submitted_transfer_B", "measured_cpu_write_operations",
    "measured_dirty_records", "planned_transfer_B", "dirty", "ranges",
    "cpu_write_operations", "requested_flush_bytes", "submitted_transfer_bytes",
    "recorded_copy_commands", "recorded_barriers", "full_upload", "slot0", "slot1",
    "both_slots", "close",
}
INTEGER_KEYS = REQUIRED_KEYS - {"workload"}


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def atomic_json(path, value):
    path = Path(path)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n")
    os.replace(tmp, path)


def command_capture(command):
    try:
        p = subprocess.run(command, text=True, stdout=subprocess.PIPE,
                           stderr=subprocess.PIPE, timeout=30, check=False)
        return {"command": command, "exit_code": p.returncode,
                "stdout": p.stdout.strip(), "stderr": p.stderr.strip()}
    except (OSError, subprocess.TimeoutExpired) as e:
        return {"command": command, "error": str(e)}


def gpu_state():
    query = ("index,uuid,name,driver_version,pstate,temperature.gpu,power.draw,"
             "clocks.current.graphics,clocks.current.memory,utilization.gpu,"
             "utilization.memory,memory.used,memory.total")
    return {
        "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "nvidia_smi": command_capture([
            "nvidia-smi", f"--query-gpu={query}", "--format=csv,noheader,nounits"
        ]),
        "load_average": list(os.getloadavg()),
    }


def environment_snapshot(config, lanes):
    paths = [
        "/sys/devices/system/cpu/cpu0/cpufreq/scaling_governor",
        "/sys/devices/system/cpu/intel_pstate/no_turbo",
        "/proc/driver/nvidia/version",
        "/proc/cmdline",
    ]
    files = {}
    for item in paths:
        p = Path(item)
        if p.exists():
            try:
                files[item] = p.read_text().strip()
            except OSError as e:
                files[item] = {"error": str(e)}
    return {
        "created_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "hostname": platform.node(),
        "platform": platform.platform(),
        "uname": list(platform.uname()),
        "python": platform.python_version(),
        "display": os.environ.get("DISPLAY"),
        "wayland_display": os.environ.get("WAYLAND_DISPLAY"),
        "desktop": os.environ.get("XDG_CURRENT_DESKTOP"),
        "session_type": os.environ.get("XDG_SESSION_TYPE"),
        "inherited_vk_instance_layers": os.environ.get("VK_INSTANCE_LAYERS"),
        "files": files,
        "initial_gpu_state": gpu_state(),
        "lane_binaries": lanes,
        "config": config,
    }


def parse_summary(text):
    lines = [line.strip() for line in text.splitlines()
             if line.strip().startswith(PREFIX)]
    if len(lines) != 1:
        raise ValueError(f"expected exactly one {PREFIX!r} line, found {len(lines)}")
    payload = lines[0][len(PREFIX):].strip()
    values = {}
    for token in payload.split():
        if "=" not in token:
            raise ValueError(f"malformed summary token {token!r}")
        key, value = token.split("=", 1)
        if key in values and values[key] != value:
            raise ValueError(f"conflicting duplicate key {key!r}")
        values[key] = value
    missing = sorted(REQUIRED_KEYS - values.keys())
    if missing:
        raise ValueError("missing summary keys: " + ", ".join(missing))
    for key in INTEGER_KEYS:
        try:
            values[key] = int(values[key])
        except ValueError as e:
            raise ValueError(f"non-integer {key}={values[key]!r}") from e
    return values, lines[0]


def expected_dirty(workload, samples):
    return {"unchanged": 0, "sparse": samples, "full": samples * 1000}[workload]


def expected_transfer_per_frame(workload):
    return {"unchanged": 0, "sparse": 128, "full": 128000}[workload]


def validate_summary(values, lane, workload, samples):
    errors = []
    def eq(key, expected):
        if values.get(key) != expected:
            errors.append(f"{key}: expected {expected!r}, got {values.get(key)!r}")

    eq("samples", samples)
    eq("workload", workload)
    eq("record_count", 1000)
    eq("byte_count", 128000)
    eq("slot0", 1)
    eq("slot1", 1)
    eq("both_slots", 1)
    eq("close", 1)
    eq("measured_cpu_written_B", samples * 128000)
    eq("measured_cpu_write_operations", samples * 1000)
    eq("measured_dirty_records", expected_dirty(workload, samples))
    eq("cpu_write_operations", 1000)
    eq("dirty", {"unchanged": 0, "sparse": 1, "full": 1000}[workload])

    compared = values["measured_cpu_compared_B"]
    if workload == "unchanged":
        if compared != samples * 128000:
            errors.append(f"measured_cpu_compared_B: expected {samples * 128000}, got {compared}")
    elif workload == "sparse":
        low = samples * (999 * 128 + 4)
        high = samples * 128000
        if not low <= compared <= high:
            errors.append(f"measured_cpu_compared_B: expected [{low}, {high}], got {compared}")
    else:
        low = samples * 1000 * 4
        high = samples * 128000
        if not low <= compared <= high:
            errors.append(f"measured_cpu_compared_B: expected [{low}, {high}], got {compared}")

    transfer_mode = lane.get("transfer_mode", "staged")
    per_frame_transfer = expected_transfer_per_frame(workload) if transfer_mode == "staged" else 0
    eq("planned_transfer_B", per_frame_transfer)
    eq("measured_submitted_transfer_B", samples * per_frame_transfer)
    eq("submitted_transfer_bytes", per_frame_transfer)
    eq("ranges", 0 if transfer_mode == "direct" or workload == "unchanged" else 1)
    expected_commands = 0 if transfer_mode == "direct" or workload == "unchanged" else 1
    eq("recorded_copy_commands", expected_commands)
    eq("recorded_barriers", expected_commands)
    eq("full_upload", 0)
    expected_flush = 128000 if transfer_mode == "direct" else expected_transfer_per_frame(workload)
    eq("requested_flush_bytes", expected_flush)

    mode_fields = ("requested_upload_mode", "upload_mode", "upload_fallback")
    require_modes = lane.get("require_mode_fields", True)
    if require_modes:
        missing = [key for key in mode_fields if key not in values]
        if missing:
            errors.append("missing mode keys: " + ", ".join(missing))
        else:
            eq("requested_upload_mode", lane["expected_requested_mode"])
            eq("upload_mode", lane["expected_actual_mode"])
            eq("upload_fallback", lane.get("expected_fallback", "None"))
    elif any(key in values for key in mode_fields):
        for key in mode_fields:
            if key not in values:
                errors.append(f"partial optional mode fields, missing {key}")
        if all(key in values for key in mode_fields):
            if "expected_requested_mode" in lane:
                eq("requested_upload_mode", lane["expected_requested_mode"])
            if "expected_actual_mode" in lane:
                eq("upload_mode", lane["expected_actual_mode"])
            if "expected_fallback" in lane:
                eq("upload_fallback", lane["expected_fallback"])

    for key in PERCENTILE_KEYS + ("alloc_B_frame", "alloc_total_B", "alloc_p50_B", "alloc_p99_B"):
        if values[key] < 0:
            errors.append(f"{key}: negative value {values[key]}")
    if values["alloc_B_frame"] != values["alloc_total_B"] // samples:
        errors.append("alloc_B_frame does not equal integer alloc_total_B / samples")
    if errors:
        raise ValueError("; ".join(errors))


def lane_metadata(lane, executable_name, harness_dll):
    runtime = Path(lane["runtime"]).resolve()
    exe = runtime / executable_name
    harness = runtime / harness_dll
    goo = runtime / "Goo.dll"
    for p in (runtime, exe, harness, goo):
        if not p.exists():
            raise FileNotFoundError(p)
    return {
        "name": lane["name"], "runtime": str(runtime),
        "executable": str(exe), "executable_sha256": sha256(exe),
        "harness_dll": str(harness), "harness_dll_sha256": sha256(harness),
        "goo_dll": str(goo), "goo_dll_sha256": sha256(goo),
    }


def validate_config(config):
    if not isinstance(config.get("short_pairs"), int) or config["short_pairs"] < 2:
        raise ValueError("short_pairs must be at least 2")
    if not 1 <= config.get("short_warmup", 0) <= 2000 or not 1 <= config.get("short_samples", 0) <= 10000:
        raise ValueError("short warmup/samples exceed harness bounds")
    if tuple(config.get("short_workloads", [])) != WORKLOADS:
        raise ValueError("short_workloads must be unchanged, sparse, full in that order")
    if config.get("long_pairs") != 4:
        raise ValueError("long_pairs must be exactly 4")
    if config.get("long_warmup") != 2000 or config.get("long_samples") != 10000:
        raise ValueError("long phase must use 2000 warmup and 10000 samples")
    long_workloads = config.get("long_workloads", [])
    if not long_workloads or any(w not in WORKLOADS for w in long_workloads):
        raise ValueError("long_workloads must contain benchmark workloads")
    lanes = config.get("lanes", [])
    if len(lanes) != 2 or lanes[0]["name"] == lanes[1]["name"]:
        raise ValueError("exactly two distinctly named lanes are required")
    for lane in lanes:
        if lane.get("transfer_mode") not in ("staged", "direct"):
            raise ValueError("each lane transfer_mode must be staged or direct")
        if lane.get("mode") not in (None, "staged", "direct"):
            raise ValueError("lane mode must be null, staged, or direct")
    if config.get("decision_policy") == "direct_upload":
        if lanes[0].get("transfer_mode") != "staged" or lanes[1].get("transfer_mode") != "direct":
            raise ValueError("direct_upload policy requires staged lane A and direct lane B")
        if long_workloads != ["unchanged"]:
            raise ValueError("direct_upload policy fixes the long tail workload to unchanged")


def schedule(config, selected_phases):
    phases = [
        ("pilot", 1, config["short_workloads"], 300, 200),
        ("confirmation", 3, config["short_workloads"], 300, 500),
        ("short", config["short_pairs"], config["short_workloads"],
         config["short_warmup"], config["short_samples"]),
        ("long", config["long_pairs"], config["long_workloads"],
         config["long_warmup"], config["long_samples"]),
    ]
    lanes = config["lanes"]
    result = []
    ordinal = 0
    for phase, pairs, workloads, warmup, samples in phases:
        if phase not in selected_phases:
            continue
        for pair in range(1, pairs + 1):
            rotated = workloads[(pair - 1) % len(workloads):] + workloads[:(pair - 1) % len(workloads)]
            order = lanes if pair % 2 == 1 else list(reversed(lanes))
            for workload in rotated:
                for lane in order:
                    ordinal += 1
                    result.append({
                        "ordinal": ordinal, "phase": phase, "pair": pair,
                        "workload": workload, "warmup": warmup, "samples": samples,
                        "lane": lane["name"],
                    })
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("config")
    ap.add_argument("--plan-only", action="store_true")
    ap.add_argument("--resume", action="store_true")
    ap.add_argument("--phases", default="pilot,short,long")
    args = ap.parse_args()
    config_path = Path(args.config).resolve()
    config = json.loads(config_path.read_text())
    validate_config(config)
    output = Path(config["output"]).resolve()
    output.mkdir(parents=True, exist_ok=True)
    canonical = json.dumps(config, sort_keys=True, separators=(",", ":")).encode()
    config_sha = hashlib.sha256(canonical).hexdigest()
    exe_name = config.get("executable", "Goo.AsyncReadbackSmoke")
    harness_dll = config.get("harness_dll", "Goo.AsyncReadbackSmoke.dll")
    metadata = {lane["name"]: lane_metadata(lane, exe_name, harness_dll)
                for lane in config["lanes"]}
    lane_values = list(metadata.values())
    if lane_values[0]["executable_sha256"] != lane_values[1]["executable_sha256"]:
        raise ValueError("lane executables differ; paired comparison requires the same app binary")
    if lane_values[0]["harness_dll_sha256"] != lane_values[1]["harness_dll_sha256"]:
        raise ValueError("lane harness DLLs differ; paired comparison requires the same app binary")
    selected_phases = tuple(value.strip() for value in args.phases.split(",") if value.strip())
    if not selected_phases or any(value not in ("pilot", "confirmation", "short", "long") for value in selected_phases):
        raise ValueError("phases must be a comma-separated subset of pilot,confirmation,short,long")
    plan = schedule(config, selected_phases)
    atomic_json(output / ("plan-" + "-".join(selected_phases) + ".json"),
                {"config_sha256": config_sha, "runs": plan})
    if args.plan_only:
        print(f"planned {len(plan)} sequential runs in {output}")
        return
    env_path = output / "environment.json"
    if not env_path.exists():
        atomic_json(env_path, environment_snapshot(config, metadata))
    results_path = output / "runs.json"
    state = {"config_sha256": config_sha, "runs": []}
    if args.resume and results_path.exists():
        state = json.loads(results_path.read_text())
        if state.get("config_sha256") != config_sha:
            raise ValueError("resume config hash mismatch")
    completed = {(r["phase"], r["pair"], r["workload"], r["lane"])
                 for r in state["runs"] if r.get("validated")}
    lanes = {lane["name"]: lane for lane in config["lanes"]}
    timeout = int(config.get("timeout_seconds", 900))
    logs = output / "logs"
    states = output / "state"
    logs.mkdir(exist_ok=True)
    states.mkdir(exist_ok=True)
    for item in plan:
        key = (item["phase"], item["pair"], item["workload"], item["lane"])
        if key in completed:
            continue
        lane = lanes[item["lane"]]
        runtime = Path(lane["runtime"]).resolve()
        run_id = (f"{item['ordinal']:03d}-{item['phase']}-p{item['pair']}-"
                  f"{item['workload']}-{item['lane']}")
        state_doc = {"run": item, "pre": gpu_state()}
        atomic_json(states / f"{run_id}.pre.json", state_doc)
        env = os.environ.copy()
        env.pop("VK_INSTANCE_LAYERS", None)
        env.pop("VK_LAYER_PATH", None)
        for name in list(env):
            if name.startswith("GOO_"):
                env.pop(name, None)
        env.update({
            "GOO_VK_DIAGNOSTICS": "1",
            "GOO_PRIMITIVE_UPLOAD_BENCHMARK": "1",
            "GOO_PRIMITIVE_UPLOAD_WORKLOAD": item["workload"],
            "GOO_PRIMITIVE_UPLOAD_WARMUP": str(item["warmup"]),
            "GOO_PRIMITIVE_UPLOAD_SAMPLES": str(item["samples"]),
        })
        if lane.get("mode") is not None:
            env["GOO_PRIMITIVE_UPLOAD_MODE"] = lane["mode"]
        env.update({str(k): str(v) for k, v in lane.get("environment", {}).items()})
        start = dt.datetime.now(dt.timezone.utc)
        p = subprocess.run([str(runtime / exe_name)], cwd=runtime, env=env,
                           stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                           timeout=timeout, check=False)
        end = dt.datetime.now(dt.timezone.utc)
        text = p.stdout.decode("utf-8", errors="replace")
        log_path = logs / f"{run_id}.log"
        log_path.write_text(text)
        post = gpu_state()
        atomic_json(states / f"{run_id}.post.json", {"run": item, "post": post})
        if p.returncode != 0:
            raise RuntimeError(f"{run_id} exited {p.returncode}; see {log_path}")
        values, summary = parse_summary(text)
        validate_summary(values, lane, item["workload"], item["samples"])
        record = dict(item)
        record.update({
            "validated": True,
            "start_utc": start.isoformat(), "end_utc": end.isoformat(),
            "wall_seconds": (end - start).total_seconds(),
            "log": str(log_path.relative_to(output)), "summary": summary,
            "metrics": values,
            "runtime": str(runtime), "goo_dll_sha256": metadata[item["lane"]]["goo_dll_sha256"],
        })
        state["runs"].append(record)
        atomic_json(results_path, state)
        print(f"validated {run_id}", flush=True)
    if config.get("compress_logs", True):
        for p in sorted(logs.glob("*.log")):
            if p.stat().st_size < int(config.get("compress_threshold_bytes", 102400)):
                continue
            gz = p.with_suffix(p.suffix + ".gz")
            with p.open("rb") as src, gz.open("wb") as raw:
                with gzip.GzipFile(filename="", mode="wb", compresslevel=9,
                                   fileobj=raw, mtime=0) as dst:
                    shutil.copyfileobj(src, dst)
            p.unlink()
            for record in state["runs"]:
                if record["log"] == str(p.relative_to(output)):
                    record["log"] = str(gz.relative_to(output))
        atomic_json(results_path, state)
    atomic_json(output / ("complete-" + "-".join(selected_phases) + ".json"), {
        "config_sha256": config_sha, "completed_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "run_count": len(state["runs"]), "all_validated": len(state["runs"]) == len(plan),
    })

if __name__ == "__main__":
    main()
