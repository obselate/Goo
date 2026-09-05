#!/usr/bin/env python3
import argparse
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import platform
import subprocess

PREFIXES = {
    "shader-effect": "shader-effect-benchmark:",
    "image-effects": "performance:",
}


def sha256(path):
    value = hashlib.sha256()
    with open(path, "rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


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


def machine_state():
    query = ("index,uuid,name,driver_version,pstate,temperature.gpu,power.draw,"
             "clocks.current.graphics,clocks.current.memory,utilization.gpu,"
             "utilization.memory,memory.used,memory.total")
    return {
        "timestamp_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "nvidia_smi": capture([
            "nvidia-smi", f"--query-gpu={query}", "--format=csv,noheader,nounits"
        ]),
        "load_average": list(os.getloadavg()),
    }


def parse_line(output, workload):
    prefix = PREFIXES[workload]
    lines = [line.strip() for line in output.splitlines()
             if line.strip().startswith(prefix)]
    if len(lines) != 1:
        raise ValueError(f"expected one {prefix!r} line, found {len(lines)}")
    values = {}
    for token in lines[0][len(prefix):].strip().split():
        if "=" not in token:
            raise ValueError(f"malformed summary token {token!r}")
        key, raw = token.split("=", 1)
        if key in values and values[key] != raw:
            raise ValueError(f"conflicting duplicate key {key!r}")
        try:
            values[key] = int(raw)
        except ValueError:
            values[key] = raw
    return values, lines[0]


def require(values, key, expected, errors):
    actual = values.get(key)
    if actual != expected:
        errors.append(f"{key}: expected {expected!r}, got {actual!r}")


def validate_shader(values, warmup, samples):
    errors = []
    for key, expected in {
        "warmup": warmup, "samples": samples, "alloc_total_B": 0,
        "alloc_p95_B": 0, "alloc_worst_B": 0, "vk_objects": 0,
        "device_memory": 0, "plan": samples, "record": samples, "close": 1,
    }.items():
        require(values, key, expected, errors)
    for key in ("frame_p50_ns", "frame_p95_ns", "frame_p99_ns",
                "frame_p999_ns", "frame_worst_ns", "draws", "layer_passes",
                "layer_composites"):
        if not isinstance(values.get(key), int) or values[key] < 0:
            errors.append(f"{key}: expected a nonnegative integer, got {values.get(key)!r}")
    if values.get("draws", 0) <= 0 or values.get("layer_passes", 0) <= 0 \
            or values.get("layer_composites", 0) <= 0:
        errors.append("shader benchmark did not execute draw and layer paths")
    metrics = {
        "p50_ns": values.get("frame_p50_ns"),
        "p95_ns": values.get("frame_p95_ns"),
        "p99_ns": values.get("frame_p99_ns"),
        "p999_ns": values.get("frame_p999_ns"),
        "max_ns": values.get("frame_worst_ns"),
        "alloc_B_frame": 0 if samples == 0 else values.get("alloc_total_B", 0) // samples,
        "alloc_p50_B": 0,
        "alloc_p99_B": values.get("alloc_p95_B"),
    }
    return errors, metrics


def validate_image(values, warmup, samples):
    errors = []
    for key, expected in {
        "workload": "image-effects", "seed": 668265263, "logical": 256,
        "visible": 256, "mounted": 256, "mounted_bound": 256, "mutations": 8,
        "warmup": warmup, "samples": samples, "vk_device_alloc_delta": 0,
        "plan_delta": samples,
        "record_delta": samples, "submit_delta": samples,
        "present_delta": samples, "both_slots": 1, "close": 1,
    }.items():
        require(values, key, expected, errors)
    for key in ("cpu_p50_ns", "cpu_p95_ns", "cpu_p99_ns", "cpu_p999_ns",
                "cpu_worst_ns", "managed_alloc_total_B", "managed_alloc_p50_B",
                "managed_alloc_p99_B", "draw_delta", "layer_passes"):
        if key == "layer_passes":
            continue
        if not isinstance(values.get(key), int) or values[key] < 0:
            errors.append(f"{key}: expected a nonnegative integer, got {values.get(key)!r}")
    if values.get("draw_delta", 0) <= 0:
        errors.append("image-effects benchmark did not execute draws")
    if not isinstance(values.get("vk_object_alloc_delta"), int) \
            or values["vk_object_alloc_delta"] < 0:
        errors.append("vk_object_alloc_delta must be a nonnegative integer")
    metrics = {
        "p50_ns": values.get("cpu_p50_ns"),
        "p95_ns": values.get("cpu_p95_ns"),
        "p99_ns": values.get("cpu_p99_ns"),
        "p999_ns": values.get("cpu_p999_ns"),
        "max_ns": values.get("cpu_worst_ns"),
        "alloc_B_frame": 0 if samples == 0 else values.get("managed_alloc_total_B", 0) // samples,
        "alloc_p50_B": values.get("managed_alloc_p50_B"),
        "alloc_p99_B": values.get("managed_alloc_p99_B"),
        "vk_object_alloc_delta": values.get("vk_object_alloc_delta"),
        "vk_device_alloc_delta": values.get("vk_device_alloc_delta"),
    }
    return errors, metrics


def lane_metadata(lane, executable, harness):
    runtime = Path(lane["runtime"]).resolve()
    paths = {
        "executable": runtime / executable,
        "harness": runtime / harness,
        "goo": runtime / "Goo.dll",
        "effect_asset": runtime / "control_effect.frag.goo-effect",
    }
    for path in paths.values():
        if not path.is_file():
            raise FileNotFoundError(path)
    return {"name": lane["name"], "scope": lane["scope"], "runtime": str(runtime),
            **{name + "_sha256": sha256(path) for name, path in paths.items()}}


def schedule(lanes, workloads, pairs, warmup, samples):
    result = []
    ordinal = 0
    for pair in range(1, pairs + 1):
        ordered_lanes = lanes if pair % 2 == 1 else list(reversed(lanes))
        ordered_workloads = workloads[pair % len(workloads):] + workloads[:pair % len(workloads)]
        for workload in ordered_workloads:
            for lane in ordered_lanes:
                ordinal += 1
                result.append({"ordinal": ordinal, "phase": "broad", "pair": pair,
                               "workload": workload, "warmup": warmup,
                               "samples": samples, "lane": lane["name"]})
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", default="/tmp/goo-prepush/results/broad-a-c")
    parser.add_argument("--lane-a", default="/tmp/goo-pipeline-identity/baseline-runtime")
    parser.add_argument("--lane-c", default="/tmp/goo-direct-upload/baseline-runtime")
    parser.add_argument("--pairs", type=int, default=6)
    parser.add_argument("--warmup", type=int, default=300)
    parser.add_argument("--samples", type=int, default=2000)
    parser.add_argument("--timeout", type=int, default=900)
    parser.add_argument("--resume", action="store_true")
    parser.add_argument("--plan-only", action="store_true")
    args = parser.parse_args()
    if args.pairs < 2 or not 1 <= args.warmup <= 300 or not 1 <= args.samples <= 2000:
        raise ValueError("pairs must be >=2, warmup 1..300, samples 1..2000")
    lanes = [
        {"name": "A-pre-pipeline", "scope": "pre-pipeline-identity", "runtime": args.lane_a},
        {"name": "C-post-timeline", "scope": "post-timeline-pre-direct", "runtime": args.lane_c},
    ]
    workloads = ["shader-effect", "image-effects"]
    executable = "Goo.AsyncReadbackSmoke"
    harness = "Goo.AsyncReadbackSmoke.dll"
    metadata = {lane["name"]: lane_metadata(lane, executable, harness) for lane in lanes}
    assets = {value["effect_asset_sha256"] for value in metadata.values()}
    if len(assets) != 1:
        raise ValueError("control effect artifacts differ between lanes")
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    plan = schedule(lanes, workloads, args.pairs, args.warmup, args.samples)
    design = {
        "comparison": "A pre-pipeline identity versus C post-timeline pre-direct",
        "harness_policy": "each frozen runtime uses its matching harness",
        "source_identity_basis": "ShaderEffectSmoke.gs was independently reported byte-identical across scopes",
        "asset_identity_sha256": next(iter(assets)),
        "pairs": args.pairs, "warmup": args.warmup, "samples": args.samples,
        "workloads": workloads, "lanes": metadata,
    }
    atomic_json(output / "plan.json", {"design": design, "runs": plan})
    if args.plan_only:
        print(f"planned {len(plan)} sequential runs in {output}")
        return
    environment = {
        "created_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "hostname": platform.node(), "platform": platform.platform(),
        "python": platform.python_version(), "wayland_display": os.environ.get("WAYLAND_DISPLAY"),
        "display": os.environ.get("DISPLAY"),
        "inherited_vk_instance_layers": os.environ.get("VK_INSTANCE_LAYERS"),
        "initial_state": machine_state(), "design": design,
    }
    if not (output / "environment.json").exists():
        atomic_json(output / "environment.json", environment)
    result_path = output / "runs.json"
    state = {"design": design, "runs": []}
    if args.resume and result_path.exists():
        state = json.loads(result_path.read_text())
        if state.get("design") != design:
            raise ValueError("resume design mismatch")
    completed = {(run["pair"], run["workload"], run["lane"])
                 for run in state["runs"] if run.get("validated")}
    lane_index = {lane["name"]: lane for lane in lanes}
    logs = output / "logs"
    states = output / "state"
    logs.mkdir(exist_ok=True)
    states.mkdir(exist_ok=True)
    for item in plan:
        key = (item["pair"], item["workload"], item["lane"])
        if key in completed:
            continue
        lane = lane_index[item["lane"]]
        runtime = Path(lane["runtime"]).resolve()
        run_id = f"{item['ordinal']:03d}-p{item['pair']}-{item['workload']}-{item['lane']}"
        atomic_json(states / f"{run_id}.pre.json", {"run": item, "state": machine_state()})
        environment = os.environ.copy()
        environment.pop("VK_INSTANCE_LAYERS", None)
        environment.pop("VK_LAYER_PATH", None)
        for name in list(environment):
            if name.startswith("GOO_"):
                environment.pop(name, None)
        environment["GOO_VK_DIAGNOSTICS"] = "1"
        if item["workload"] == "shader-effect":
            environment["GOO_SHADER_EFFECT_BENCHMARK"] = "1"
            environment["GOO_SHADER_EFFECT_WARMUP"] = str(item["warmup"])
            environment["GOO_SHADER_EFFECT_SAMPLES"] = str(item["samples"])
        else:
            environment["GOO_PERFORMANCE_SMOKE"] = "1"
            environment["GOO_PERF_WORKLOAD"] = "image-effects"
            environment["GOO_PERF_WARMUP"] = str(item["warmup"])
            environment["GOO_PERF_SAMPLES"] = str(item["samples"])
        started = dt.datetime.now(dt.timezone.utc)
        process = subprocess.run([str(runtime / executable)], cwd=runtime, env=environment,
                                 stdout=subprocess.PIPE, stderr=subprocess.STDOUT,
                                 timeout=args.timeout, check=False)
        ended = dt.datetime.now(dt.timezone.utc)
        text = process.stdout.decode("utf-8", errors="replace")
        log = logs / f"{run_id}.log"
        log.write_text(text)
        atomic_json(states / f"{run_id}.post.json", {"run": item, "state": machine_state()})
        if process.returncode != 0:
            raise RuntimeError(f"{run_id} exited {process.returncode}; see {log}")
        lowered = text.lower()
        forbidden = ("unhandled exception", "validation error", "device lost", "fatal error")
        found = [token for token in forbidden if token in lowered]
        if found:
            raise RuntimeError(f"{run_id} contains failure markers {found}; see {log}")
        values, summary = parse_line(text, item["workload"])
        if item["workload"] == "shader-effect":
            errors, metrics = validate_shader(values, item["warmup"], item["samples"])
        else:
            errors, metrics = validate_image(values, item["warmup"], item["samples"])
        if errors:
            raise ValueError(f"{run_id}: " + "; ".join(errors))
        record = dict(item)
        record.update({
            "validated": True, "scope": lane["scope"], "runtime": str(runtime),
            "goo_dll_sha256": metadata[item["lane"]]["goo_sha256"],
            "harness_dll_sha256": metadata[item["lane"]]["harness_sha256"],
            "started_utc": started.isoformat(), "ended_utc": ended.isoformat(),
            "wall_seconds": (ended - started).total_seconds(),
            "log": str(log.relative_to(output)), "summary": summary,
            "metrics": metrics, "counters": values,
        })
        state["runs"].append(record)
        atomic_json(result_path, state)
        print(f"validated {run_id}", flush=True)
    selected = {(run["pair"], run["workload"], run["lane"])
                for run in state["runs"] if run.get("validated")}
    required = {(run["pair"], run["workload"], run["lane"]) for run in plan}
    atomic_json(output / "complete.json", {
        "completed_utc": dt.datetime.now(dt.timezone.utc).isoformat(),
        "run_count": len(required), "all_validated": required.issubset(selected),
    })


if __name__ == "__main__":
    main()
