#!/usr/bin/env python3
import argparse
import csv
import json
from pathlib import Path
from statistics import median

KINDS = ("container", "button", "text", "text-entry", "text-editor", "image", "shape")
DISPLAY = {"container": "Container", "button": "Button", "text": "Text",
           "text-entry": "TextEntry", "text-editor": "TextEditor",
           "image": "Image", "shape": "Shape"}
MIB = 1024.0 * 1024.0


def aggregate(values):
    return {"median": median(values), "minimum": min(values), "maximum": max(values)}


def ms(value):
    return value / 1_000_000.0


def mib(value):
    return value / MIB


def fmt(value, digits=3):
    return f"{value:.{digits}f}"


def fmt_int(value):
    return f"{value:,.0f}"


def run_value(run, key, divisor=1.0):
    return run["metrics"][key] / divisor


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("runs_json")
    parser.add_argument("--output", required=True)
    parser.add_argument("--expected-rounds", type=int)
    args = parser.parse_args()
    source = Path(args.runs_json).resolve()
    document = json.loads(source.read_text())
    runs = document["runs"]
    if not runs or not all(run.get("validated") for run in runs):
        raise ValueError("analysis requires completed validated runs")
    validation_values = {run.get("validation_enabled", False) for run in runs}
    if len(validation_values) != 1:
        raise ValueError("analysis cannot mix validation-enabled and timing runs")
    validation_enabled = next(iter(validation_values))
    rounds = sorted({run["round"] for run in runs})
    expected_rounds = args.expected_rounds or len(rounds)
    if rounds != list(range(1, expected_rounds + 1)):
        raise ValueError(f"rounds are {rounds}, expected 1..{expected_rounds}")
    expected = {(round_number, kind, "sparse") for round_number in rounds for kind in KINDS}
    actual = {(run["round"], run["kind"], run["mode"]) for run in runs}
    if actual != expected or len(runs) != len(expected):
        raise ValueError("run matrix is incomplete or duplicated")
    groups = []
    for kind in KINDS:
        group_runs = sorted((run for run in runs if run["kind"] == kind), key=lambda run: run["round"])
        cold_cpu_low_ms = [ms(run["metrics"]["cold_cpu_min_ns"]) for run in group_runs]
        cold_cpu_worst_ms = [ms(run["metrics"]["cold_cpu_max_ns"]) for run in group_runs]
        cold_alloc_low_B = [run["metrics"]["cold_managed_alloc_min_B"] for run in group_runs]
        cold_alloc_worst_B = [run["metrics"]["cold_managed_alloc_max_B"] for run in group_runs]
        warm = {
            "cpu_p50_ms": aggregate([run_value(run, "cpu_p50_ns", 1_000_000.0) for run in group_runs]),
            "cpu_p95_ms": aggregate([run_value(run, "cpu_p95_ns", 1_000_000.0) for run in group_runs]),
            "cpu_p99_ms": aggregate([run_value(run, "cpu_p99_ns", 1_000_000.0) for run in group_runs]),
            "alloc_p50_B_frame": aggregate([run_value(run, "managed_alloc_p50_B") for run in group_runs]),
            "alloc_p95_B_frame": aggregate([run_value(run, "managed_alloc_p95_B") for run in group_runs]),
        }
        memory = {
            "managed_MiB": aggregate([run_value(run, "post_gc_managed_retained_B", MIB) for run in group_runs]),
            "rss_MiB": aggregate([run_value(run, "post_gc_linux_rss_B", MIB) for run in group_runs]),
            "pss_MiB": aggregate([run_value(run, "post_gc_linux_pss_B", MIB) for run in group_runs]),
        }
        gpu = {
            "main_p50_ms": aggregate([run_value(run, "gpu_main_p50_ns", 1_000_000.0) for run in group_runs]),
            "main_p99_ms": aggregate([run_value(run, "gpu_main_p99_ns", 1_000_000.0) for run in group_runs]),
            "upload_p50_ms": aggregate([run_value(run, "gpu_upload_p50_ns", 1_000_000.0) for run in group_runs]),
            "upload_p99_ms": aggregate([run_value(run, "gpu_upload_p99_ns", 1_000_000.0) for run in group_runs]),
            "vulkan_allocated_MiB": aggregate([run_value(run, "vk_allocated_end_B", MIB) for run in group_runs]),
        }
        per_run = []
        for run in group_runs:
            per_run.append({
                "round": run["round"], "log": run["log"],
                "cold_cpu_ms": [ms(run["metrics"][f"cold_cpu_{index}_ns"]) for index in range(2)],
                "cold_alloc_B": [run["metrics"][f"cold_managed_alloc_{index}_B"] for index in range(2)],
                "warm_cpu_ms": {name: run["metrics"][f"cpu_{name}_ns"] / 1_000_000.0
                                for name in ("p50", "p95", "p99")},
                "warm_alloc_B_frame": {name: run["metrics"][f"managed_alloc_{name}_B"]
                                       for name in ("p50", "p95")},
                "post_gc_memory_MiB": {
                    "managed": mib(run["metrics"]["post_gc_managed_retained_B"]),
                    "rss": mib(run["metrics"]["post_gc_linux_rss_B"]),
                    "pss": mib(run["metrics"]["post_gc_linux_pss_B"]),
                },
                "gpu": {
                    stage: {"samples": run["metrics"][f"gpu_{stage}_samples"],
                            "p50_ms": run["metrics"][f"gpu_{stage}_p50_ns"] / 1_000_000.0,
                            "p99_ms": run["metrics"][f"gpu_{stage}_p99_ns"] / 1_000_000.0}
                    for stage in ("main", "upload", "effects", "offscreen")
                },
                "vulkan_allocated_MiB": mib(run["metrics"]["vk_allocated_end_B"]),
            })
        groups.append({
            "kind": kind, "blob": DISPLAY[kind], "run_count": len(group_runs),
            "cold": {
                "observation_count": len(group_runs) * 2,
                "cpu_low_ms": aggregate(cold_cpu_low_ms),
                "cpu_worst_ms": aggregate(cold_cpu_worst_ms),
                "alloc_low_B": aggregate(cold_alloc_low_B),
                "alloc_worst_B": aggregate(cold_alloc_worst_B),
            },
            "warm": warm, "post_gc_memory": memory, "gpu_companion": gpu,
            "runs": per_run,
        })
    result = {
        "source": str(source), "run_count": len(runs), "rounds": expected_rounds,
        "validation_enabled": validation_enabled, "mode": "sparse", "count": 1000,
        "cold_aggregation": "Each process contributes the minimum and maximum of its two post-initial-render cold observations. The table reports the median process-level low and worst; ranges retain the minimum and maximum process-level values.",
        "warm_aggregation": "Median across independent process-level P50/P95/P99 values. Ranges retain the minimum and maximum process-level value.",
        "memory_aggregation": "Median and range across the same post-measurement, post-GC checkpoint in each process.",
        "gpu_scope": {
            "primary": "Outer main-pass timestamp scope, excluding presentation and separate upload scope.",
            "nesting": "Main may enclose effects and offscreen work. Stage timings must not be summed.",
            "vulkan_allocated": "Goo-tracked Vulkan allocations across memory types at the measured endpoint, not physical VRAM residency.",
        },
        "groups": groups,
    }
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    (output / "analysis.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    table_columns = ["Blob", "Cold CPU low ms", "Cold CPU worst ms", "Cold alloc low B",
                     "Cold alloc worst B", "Warm CPU P50 ms", "Warm CPU P95 ms",
                     "Warm CPU P99 ms", "Warm alloc P50 B/frame",
                     "Warm alloc P95 B/frame", "Managed MiB", "RSS MiB", "PSS MiB"]
    with (output / "table.csv").open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=table_columns)
        writer.writeheader()
        for group in groups:
            writer.writerow({
                "Blob": group["blob"],
                "Cold CPU low ms": group["cold"]["cpu_low_ms"]["median"],
                "Cold CPU worst ms": group["cold"]["cpu_worst_ms"]["median"],
                "Cold alloc low B": group["cold"]["alloc_low_B"]["median"],
                "Cold alloc worst B": group["cold"]["alloc_worst_B"]["median"],
                "Warm CPU P50 ms": group["warm"]["cpu_p50_ms"]["median"],
                "Warm CPU P95 ms": group["warm"]["cpu_p95_ms"]["median"],
                "Warm CPU P99 ms": group["warm"]["cpu_p99_ms"]["median"],
                "Warm alloc P50 B/frame": group["warm"]["alloc_p50_B_frame"]["median"],
                "Warm alloc P95 B/frame": group["warm"]["alloc_p95_B_frame"]["median"],
                "Managed MiB": group["post_gc_memory"]["managed_MiB"]["median"],
                "RSS MiB": group["post_gc_memory"]["rss_MiB"]["median"],
                "PSS MiB": group["post_gc_memory"]["pss_MiB"]["median"],
            })
    with (output / "gpu-companion.csv").open("w", newline="") as stream:
        columns = ["Blob", "GPU main P50 ms", "GPU main P99 ms",
                   "GPU upload P50 ms", "GPU upload P99 ms",
                   "Vulkan allocated MiB"]
        writer = csv.DictWriter(stream, fieldnames=columns)
        writer.writeheader()
        for group in groups:
            gpu = group["gpu_companion"]
            writer.writerow({"Blob": group["blob"],
                             "GPU main P50 ms": gpu["main_p50_ms"]["median"],
                             "GPU main P99 ms": gpu["main_p99_ms"]["median"],
                             "GPU upload P50 ms": gpu["upload_p50_ms"]["median"],
                             "GPU upload P99 ms": gpu["upload_p99_ms"]["median"],
                             "Vulkan allocated MiB": gpu["vulkan_allocated_MiB"]["median"]})
    lines = [
        "# Sparse Blob cost table", "",
        f"{expected_rounds} fresh processes per Blob, 1,000 cells, {document['configuration']['warmup']} warmup frames and {document['configuration']['samples']} measured frames. Validation: {'enabled' if validation_enabled else 'disabled'}.", "",
        "| Blob | Cold CPU low/worst ms | Cold alloc low/worst B | Warm CPU P50/P95/P99 ms | Warm alloc P50/P95 B/frame | Managed/RSS/PSS MiB |",
        "| --- | ---: | ---: | ---: | ---: | ---: |",
    ]
    for group in groups:
        cold = group["cold"]
        warm = group["warm"]
        memory = group["post_gc_memory"]
        lines.append("| " + " | ".join((
            group["blob"],
            f"{fmt(cold['cpu_low_ms']['median'])} / {fmt(cold['cpu_worst_ms']['median'])}",
            f"{fmt_int(cold['alloc_low_B']['median'])} / {fmt_int(cold['alloc_worst_B']['median'])}",
            f"{fmt(warm['cpu_p50_ms']['median'])} / {fmt(warm['cpu_p95_ms']['median'])} / {fmt(warm['cpu_p99_ms']['median'])}",
            f"{fmt_int(warm['alloc_p50_B_frame']['median'])} / {fmt_int(warm['alloc_p95_B_frame']['median'])}",
            f"{fmt(memory['managed_MiB']['median'], 2)} / {fmt(memory['rss_MiB']['median'], 1)} / {fmt(memory['pss_MiB']['median'], 1)}",
        )) + " |")
    lines += ["", f"Cold values are medians of the {expected_rounds} process-level lows and worsts, each computed from two post-initial-render frames. Warm CPU and allocation values are medians of process-level quantiles. Managed, RSS, and PSS are medians from the same post-measurement forced-GC checkpoint. Detailed minimum and maximum process values remain in analysis.json.", "",
              "## GPU companion", "",
              "| Blob | Main P50/P99 ms | Upload P50/P99 ms | Vulkan allocated MiB |", "| --- | ---: | ---: | ---: |"]
    for group in groups:
        gpu = group["gpu_companion"]
        lines.append(f"| {group['blob']} | {fmt(gpu['main_p50_ms']['median'])} / {fmt(gpu['main_p99_ms']['median'])} | {fmt(gpu['upload_p50_ms']['median'], 6)} / {fmt(gpu['upload_p99_ms']['median'], 6)} | {fmt(gpu['vulkan_allocated_MiB']['median'], 1)} |")
    lines += ["", "Main is the outer renderer timestamp scope. It excludes presentation and separate upload timing, and it may enclose effects and offscreen work. Do not sum stage timings. Vulkan allocated MiB is Goo-tracked Vulkan allocation across memory types at the measured endpoint, not physical VRAM residency.", ""]
    (output / "analysis.md").write_text("\n".join(lines))
    print(f"analyzed {len(runs)} runs into {output}")


if __name__ == "__main__":
    main()
