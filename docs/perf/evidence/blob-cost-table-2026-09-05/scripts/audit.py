#!/usr/bin/env python3
import argparse
import gzip
import hashlib
import json
from pathlib import Path
from statistics import median

KINDS = ("container", "button", "text", "text-entry", "text-editor", "image", "shape")
TEXT_KEYS = {"kind", "mode", "cpu_scope", "gpu_scope", "post_gc_managed_source", "post_gc_linux_source"}
FAILURE_TEXT = ("unhandled exception", "validation error", "validation warning", "vuid-", "device lost", "fatal error")
AGGREGATES = {
    "warm": {
        "cpu_p50_ms": ("cpu_p50_ns", 1_000_000.0),
        "cpu_p95_ms": ("cpu_p95_ns", 1_000_000.0),
        "cpu_p99_ms": ("cpu_p99_ns", 1_000_000.0),
        "alloc_p50_B_frame": ("managed_alloc_p50_B", 1.0),
        "alloc_p95_B_frame": ("managed_alloc_p95_B", 1.0),
    },
    "post_gc_memory": {
        "managed_MiB": ("post_gc_managed_retained_B", 1048576.0),
        "rss_MiB": ("post_gc_linux_rss_B", 1048576.0),
        "pss_MiB": ("post_gc_linux_pss_B", 1048576.0),
    },
    "gpu_companion": {
        "main_p50_ms": ("gpu_main_p50_ns", 1_000_000.0),
        "main_p99_ms": ("gpu_main_p99_ns", 1_000_000.0),
        "upload_p50_ms": ("gpu_upload_p50_ns", 1_000_000.0),
        "upload_p99_ms": ("gpu_upload_p99_ns", 1_000_000.0),
        "vulkan_allocated_MiB": ("vk_allocated_end_B", 1048576.0),
    },
}


def sha256(path):
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def read_log(path):
    if path.suffix == ".gz":
        with gzip.open(path, "rt", encoding="utf-8", errors="replace") as stream:
            return stream.read()
    return path.read_text(errors="replace")


def parse_summary(line):
    prefix = "all-blob-benchmark:"
    if not line.startswith(prefix):
        raise ValueError("recorded summary has the wrong prefix")
    values = {}
    for token in line[len(prefix):].strip().split():
        key, raw = token.split("=", 1)
        value = raw if key in TEXT_KEYS else int(raw)
        if key in values:
            raise ValueError(f"duplicate summary key {key}")
        values[key] = value
    return values


def stats(values):
    return {"median": median(values), "minimum": min(values), "maximum": max(values)}


def require(condition, message, errors):
    if not condition:
        errors.append(message)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--results", default="/tmp/goo-blob-table/results/final")
    parser.add_argument("--analysis", default="/tmp/goo-blob-table/results/final/analysis/analysis.json")
    parser.add_argument("--output", default="/tmp/goo-blob-table/final-coverage-audit.json")
    args = parser.parse_args()
    results = Path(args.results).resolve()
    runs_path = results / "runs.json"
    complete_path = results / "complete.json"
    analysis_path = Path(args.analysis).resolve()
    runs_doc = json.loads(runs_path.read_text())
    complete = json.loads(complete_path.read_text())
    analysis = json.loads(analysis_path.read_text())
    runs = runs_doc["runs"]
    errors = []
    expected = {(round_number, kind, "sparse") for round_number in range(1, 6) for kind in KINDS}
    actual = [(run["round"], run["kind"], run["mode"]) for run in runs]
    require(len(runs) == 35, f"run count {len(runs)} != 35", errors)
    require(len(set(actual)) == 35 and set(actual) == expected, "run matrix is incomplete or duplicated", errors)
    require(runs_doc.get("configuration") == {
        "phase": "final", "rounds": 5, "warmup": 300, "samples": 2000,
        "mode": "sparse", "validation": False,
        "wayland_display": runs_doc.get("configuration", {}).get("wayland_display"),
    }, "runner configuration differs from the final sparse contract", errors)
    require(complete.get("run_count") == 35 and complete.get("all_validated") is True,
            "complete.json does not prove 35 validated runs", errors)
    total_cold = 0
    total_measured = 0
    total_gpu_main = 0
    total_submits = 0
    total_presents = 0
    raw_bytes = 0
    raw_hashes = {}
    for run in runs:
        metrics = run["metrics"]
        require(run.get("validated") is True, f"{run.get('ordinal')} is not validated", errors)
        require(run.get("validation_enabled") is False, f"{run.get('ordinal')} enabled validation", errors)
        total_cold += metrics["cold_observations"]
        total_measured += metrics["frame_samples"]
        total_gpu_main += metrics["gpu_main_samples"]
        total_submits += metrics["submit_delta"]
        total_presents += metrics["present_delta"]
        require(metrics["cold_cpu_min_ns"] == min(metrics["cold_cpu_0_ns"], metrics["cold_cpu_1_ns"]),
                f"{run['ordinal']} cold CPU low mismatch", errors)
        require(metrics["cold_cpu_max_ns"] == max(metrics["cold_cpu_0_ns"], metrics["cold_cpu_1_ns"]),
                f"{run['ordinal']} cold CPU worst mismatch", errors)
        allocations = (metrics["cold_managed_alloc_0_B"], metrics["cold_managed_alloc_1_B"])
        require(metrics["cold_managed_alloc_min_B"] == min(allocations),
                f"{run['ordinal']} cold allocation low mismatch", errors)
        require(metrics["cold_managed_alloc_max_B"] == max(allocations),
                f"{run['ordinal']} cold allocation worst mismatch", errors)
        require(metrics["warm_leaf_build_count"] == 300 and metrics["warm_mutation_count"] == 300,
                f"{run['ordinal']} warm coverage mismatch", errors)
        require(metrics["measured_leaf_build_count"] == 2000 and metrics["measured_mutation_count"] == 2000,
                f"{run['ordinal']} measured coverage mismatch", errors)
        require(metrics["gpu_main_samples"] == 2000 and metrics["gpu_main_dropped_samples"] == 0
                and metrics["gpu_dropped_scope_count"] == 0,
                f"{run['ordinal']} GPU Main coverage mismatch", errors)
        require(metrics["submit_delta"] == 2000 and metrics["present_delta"] == 2000,
                f"{run['ordinal']} submit/present coverage mismatch", errors)
        require(metrics["post_gc_managed_source"] == "GC.GetTotalMemory(true)"
                and metrics["post_gc_linux_source"] == "/proc/self/smaps_rollup"
                and metrics["post_gc_linux_smaps_available"] == 1,
                f"{run['ordinal']} memory source mismatch", errors)
        require(metrics["post_gc_linux_pss_B"] <= metrics["post_gc_linux_rss_B"],
                f"{run['ordinal']} PSS exceeds RSS", errors)
        require(metrics["close"] == 1 and metrics["readback_pool_cleanup_B"] == 0
                and metrics["cleanup_allocator_B"] == 0 and metrics["cleanup_vk_allocated_B"] == 0
                and metrics["cleanup_vulkan_objects"] == 0,
                f"{run['ordinal']} cleanup mismatch", errors)
        log_path = results / run["log"]
        text = read_log(log_path)
        raw_bytes += len(text.encode("utf-8"))
        raw_hashes[str(log_path.relative_to(results))] = sha256(log_path)
        summaries = [line.strip() for line in text.splitlines()
                     if line.strip().startswith("all-blob-benchmark:")]
        require(len(summaries) == 1, f"{run['ordinal']} has {len(summaries)} summaries", errors)
        if len(summaries) == 1:
            require(summaries[0] == run["summary"], f"{run['ordinal']} raw summary differs", errors)
            require(parse_summary(summaries[0]) == metrics, f"{run['ordinal']} raw metrics differ", errors)
        lowered = text.lower()
        matched = [marker for marker in FAILURE_TEXT if marker in lowered]
        require(not matched, f"{run['ordinal']} raw log failure markers {matched}", errors)
        json_records = []
        for line in text.splitlines():
            if line.startswith("{"):
                try:
                    json_records.append(json.loads(line))
                except json.JSONDecodeError:
                    errors.append(f"{run['ordinal']} malformed JSON diagnostic line")
        validation_records = [value for value in json_records if value.get("kind") == "validation"]
        warning_traces = [value for value in json_records
                          if value.get("kind") == "trace" and value.get("severity", 0) != 0]
        counters = [value for value in json_records if value.get("kind") == "counters"]
        require(not validation_records, f"{run['ordinal']} emitted validation records", errors)
        require(not warning_traces, f"{run['ordinal']} emitted nonzero-severity traces", errors)
        require(len(counters) == 1, f"{run['ordinal']} has {len(counters)} counter snapshots", errors)
        if len(counters) == 1:
            counter = counters[0]
            for key in ("validationErrorCount", "resultFailureCount", "validationDropped",
                        "validationErrors", "fatalCode", "fatalValue", "vulkanObjectCount",
                        "allocatorBytes", "vulkanDeviceMemoryBytes"):
                require(counter.get(key) == 0, f"{run['ordinal']} counter {key}={counter.get(key)}", errors)
    require(total_cold == 70, f"cold observation total {total_cold} != 70", errors)
    require(total_measured == 70000, f"measured frame total {total_measured} != 70000", errors)
    require(total_gpu_main == 70000, f"GPU Main sample total {total_gpu_main} != 70000", errors)
    require(total_submits == 70000 and total_presents == 70000,
            f"submit/present totals {total_submits}/{total_presents} != 70000/70000", errors)
    require(analysis.get("run_count") == 35 and analysis.get("rounds") == 5
            and analysis.get("mode") == "sparse" and analysis.get("validation_enabled") is False,
            "analysis header differs from final contract", errors)
    groups = {group["kind"]: group for group in analysis.get("groups", [])}
    require(tuple(groups) == KINDS, "analysis group order or coverage differs", errors)
    for kind in KINDS:
        if kind not in groups:
            continue
        source_runs = sorted((run for run in runs if run["kind"] == kind), key=lambda value: value["round"])
        group = groups[kind]
        require(group["run_count"] == 5 and group["cold"]["observation_count"] == 10,
                f"{kind} group cardinality mismatch", errors)
        cold_fields = {
            "cpu_low_ms": ("cold_cpu_min_ns", 1_000_000.0),
            "cpu_worst_ms": ("cold_cpu_max_ns", 1_000_000.0),
            "alloc_low_B": ("cold_managed_alloc_min_B", 1.0),
            "alloc_worst_B": ("cold_managed_alloc_max_B", 1.0),
        }
        for output_key, (metric_key, divisor) in cold_fields.items():
            expected_stats = stats([run["metrics"][metric_key] / divisor for run in source_runs])
            require(group["cold"][output_key] == expected_stats,
                    f"{kind} cold aggregate {output_key} mismatch", errors)
        for section, fields in AGGREGATES.items():
            for output_key, (metric_key, divisor) in fields.items():
                expected_stats = stats([run["metrics"][metric_key] / divisor for run in source_runs])
                require(group[section][output_key] == expected_stats,
                        f"{kind} aggregate {section}.{output_key} mismatch", errors)
    result = {
        "status": "pass" if not errors else "fail",
        "errors": errors,
        "runs": len(runs),
        "rounds_per_blob": 5,
        "cold_observations": total_cold,
        "measured_frames": total_measured,
        "gpu_main_samples": total_gpu_main,
        "submit_count": total_submits,
        "present_count": total_presents,
        "decoded_log_bytes": raw_bytes,
        "raw_log_sha256": raw_hashes,
        "inputs": {
            "runs_json": str(runs_path), "runs_json_sha256": sha256(runs_path),
            "complete_json": str(complete_path), "complete_json_sha256": sha256(complete_path),
            "analysis_json": str(analysis_path), "analysis_json_sha256": sha256(analysis_path),
            "analyzer": "/tmp/goo-blob-table/analyze.py",
            "analyzer_sha256": sha256(Path("/tmp/goo-blob-table/analyze.py")),
        },
        "memory_sources": {
            "managed": "GC.GetTotalMemory(true)",
            "linux_rss_pss": "/proc/self/smaps_rollup",
        },
    }
    output = Path(args.output).resolve()
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    if errors:
        raise SystemExit("audit failed: " + "; ".join(errors))
    print(f"audited {len(runs)} runs, {total_cold} cold observations, {total_measured} measured frames")


if __name__ == "__main__":
    main()
