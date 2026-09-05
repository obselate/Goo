#!/usr/bin/env python3
import argparse
import csv
import json
from pathlib import Path
from statistics import median

KINDS = ("container", "text", "image", "shape", "button", "text-entry", "text-editor")
MODES = ("unchanged", "sparse", "full")
MIB = 1024.0 * 1024.0

METRICS = {
    "cpu_p50_ms": ("cpu_p50_ns", 1_000_000.0),
    "cpu_p99_ms": ("cpu_p99_ns", 1_000_000.0),
    "measured_loop_wall_s": ("measured_loop_wall_ns", 1_000_000_000.0),
    "process_cpu_s": ("process_cpu_ns", 1_000_000_000.0),
    "alloc_B_frame": ("alloc_B_frame", 1.0),
    "rss_peak_MiB": ("working_set_peak_B", MIB),
    "private_peak_MiB": ("private_memory_peak_B", MIB),
    "managed_heap_peak_MiB": ("managed_heap_peak_B", MIB),
    "managed_retained_peak_MiB": ("managed_retained_peak_B", MIB),
    "managed_retained_post_gc_MiB": ("managed_retained_post_gc_B", MIB),
    "gpu_main_p50_ms": ("gpu_main_p50_ns", 1_000_000.0),
    "gpu_main_p99_ms": ("gpu_main_p99_ns", 1_000_000.0),
    "vk_allocated_peak_MiB": ("vk_allocated_peak_B", MIB),
    "cache_peak_MiB": ("cache_peak_B", MIB),
    "image_resident_peak_MiB": ("image_resident_peak_B", MIB),
    "text_resident_peak_MiB": ("text_resident_peak_B", MIB),
    "readback_pool_resident_before_close_MiB": ("readback_pool_resident_before_close_B", MIB),
}


def converted(run, metric):
    source, divisor = METRICS[metric]
    return run["metrics"][source] / divisor


def stats(values):
    return {"median": median(values), "minimum": min(values), "maximum": max(values)}


def shown(value, digits=3):
    return f"{value:.{digits}f}"


def span(value, digits=3):
    return (f"{shown(value['median'], digits)} "
            f"[{shown(value['minimum'], digits)}, {shown(value['maximum'], digits)}]")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("runs_json")
    parser.add_argument("--output", required=True)
    parser.add_argument("--expected-rounds", type=int)
    args = parser.parse_args()
    source = Path(args.runs_json).resolve()
    source_doc = json.loads(source.read_text())
    runs = source_doc["runs"]
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
    expected = {(round_number, kind, mode)
                for round_number in rounds for kind in KINDS for mode in MODES}
    actual = {(run["round"], run["kind"], run["mode"]) for run in runs}
    if actual != expected or len(runs) != len(expected):
        raise ValueError("run matrix is incomplete or duplicated")
    groups = []
    for kind in KINDS:
        for mode in MODES:
            group_runs = sorted((run for run in runs if run["kind"] == kind and run["mode"] == mode),
                                key=lambda run: run["round"])
            aggregates = {
                metric: stats([converted(run, metric) for run in group_runs])
                for metric in METRICS
            }
            groups.append({
                "kind": kind, "mode": mode, "run_count": len(group_runs),
                "aggregates": aggregates,
                "runs": [
                    {
                        "round": run["round"], "log": run["log"],
                        "values": {metric: converted(run, metric) for metric in METRICS},
                        "gpu_attribution": {
                            stage: {
                                "samples": run["metrics"][f"gpu_{stage}_samples"],
                                "p50_ms": run["metrics"][f"gpu_{stage}_p50_ns"] / 1_000_000.0,
                                "p99_ms": run["metrics"][f"gpu_{stage}_p99_ns"] / 1_000_000.0,
                            }
                            for stage in ("upload", "effects", "offscreen")
                        },
                    }
                    for run in group_runs
                ],
            })
    result = {
        "source": str(source),
        "rounds": expected_rounds,
        "run_count": len(runs),
        "validation_enabled": validation_enabled,
        "aggregation": "Median, minimum, and maximum of independent run-level values.",
        "percentile_note": "CPU and GPU P50/P99 are computed inside each run from its measured frames. Across-run medians and ranges are not pooled-sample percentiles or new percentiles.",
        "cpu_scope": "Host frame wall time for the measured render loop. Process CPU time and total loop wall time are reported separately.",
        "gpu_scope": {
            "primary": "main-pass",
            "includes": "Outer renderer main-pass scope; it may enclose effects and offscreen work.",
            "excludes": "Presentation and the separately measured upload scope.",
            "upload": "Upload is a separate disjoint attribution scope, not a complete frame time.",
            "stage_totals": "Main, upload, effects, and offscreen timings must not be summed.",
        },
        "memory_scope": {
            "vk_allocated": "Goo-tracked Vulkan allocations across memory types; not a physical VRAM residency measurement.",
            "resident_counters": "Cache, image, and text values are Goo logical resident-byte counters; not driver heap usage.",
            "readback_pool": "Window-target readback-pool bytes captured before close; this is not general Goo or GPU residency.",
        },
        "units": {
            "cpu_p50_ms": "milliseconds", "cpu_p99_ms": "milliseconds",
            "measured_loop_wall_s": "seconds", "process_cpu_s": "seconds",
            "alloc_B_frame": "bytes/frame", "gpu_main_p50_ms": "milliseconds",
            "gpu_main_p99_ms": "milliseconds",
            "rss_peak_MiB": "MiB", "private_peak_MiB": "MiB",
            "managed_heap_peak_MiB": "MiB", "managed_retained_peak_MiB": "MiB",
            "managed_retained_post_gc_MiB": "MiB",
            "vk_allocated_peak_MiB": "MiB",
            "cache_peak_MiB": "MiB", "image_resident_peak_MiB": "MiB",
            "text_resident_peak_MiB": "MiB",
            "readback_pool_resident_before_close_MiB": "MiB",
        },
        "groups": groups,
    }
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    (output / "analysis.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    summary_columns = ["kind", "mode", "run_count"]
    for metric in METRICS:
        summary_columns += [f"{metric}_median", f"{metric}_min", f"{metric}_max"]
    with (output / "summary.csv").open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=summary_columns)
        writer.writeheader()
        for group in groups:
            row = {"kind": group["kind"], "mode": group["mode"],
                   "run_count": group["run_count"]}
            for metric, value in group["aggregates"].items():
                row[f"{metric}_median"] = value["median"]
                row[f"{metric}_min"] = value["minimum"]
                row[f"{metric}_max"] = value["maximum"]
            writer.writerow(row)
    run_columns = ["kind", "mode", "round", "log"] + list(METRICS)
    for stage in ("upload", "effects", "offscreen"):
        run_columns += [f"gpu_{stage}_samples", f"gpu_{stage}_p50_ms", f"gpu_{stage}_p99_ms"]
    with (output / "runs.csv").open("w", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=run_columns)
        writer.writeheader()
        for group in groups:
            for run in group["runs"]:
                row = {"kind": group["kind"], "mode": group["mode"],
                       "round": run["round"], "log": run["log"], **run["values"]}
                for stage, value in run["gpu_attribution"].items():
                    row[f"gpu_{stage}_samples"] = value["samples"]
                    row[f"gpu_{stage}_p50_ms"] = value["p50_ms"]
                    row[f"gpu_{stage}_p99_ms"] = value["p99_ms"]
                writer.writerow(row)
    markdown = [
        "# All public Blob benchmark", "",
        f"{expected_rounds} independent process runs per kind and mode. Validation: {'enabled' if validation_enabled else 'disabled'}. Cells show median [minimum, maximum] across runs.", "",
        "GPU P50/P99 measure the outer main-pass scope. Main may enclose effects and offscreen work and excludes presentation. Upload is reported separately in the per-run artifacts. Do not sum stage timings.", "",
        "| Kind | Mode | CPU P50 ms | CPU P99 ms | Alloc B/frame | RSS peak MiB | Private peak MiB | Retained heap MiB | GPU main P50 ms | GPU main P99 ms | Vulkan allocated peak MiB |",
        "| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |",
    ]
    for group in groups:
        values = group["aggregates"]
        markdown.append("| " + " | ".join((
            group["kind"], group["mode"], span(values["cpu_p50_ms"]),
            span(values["cpu_p99_ms"]), span(values["alloc_B_frame"], 0),
            span(values["rss_peak_MiB"]), span(values["private_peak_MiB"]),
            span(values["managed_retained_peak_MiB"]),
            span(values["gpu_main_p50_ms"]), span(values["gpu_main_p99_ms"]),
            span(values["vk_allocated_peak_MiB"]),
        )) + " |")
    markdown += ["", "## Logical resident counters", "",
                 "| Kind | Mode | Managed heap peak MiB | Readback pool before close MiB | Cache peak MiB | Image resident peak MiB | Text resident peak MiB |",
                 "| --- | --- | ---: | ---: | ---: | ---: | ---: |"]
    for group in groups:
        values = group["aggregates"]
        markdown.append("| " + " | ".join((
            group["kind"], group["mode"], span(values["managed_heap_peak_MiB"]),
            span(values["readback_pool_resident_before_close_MiB"]),
            span(values["cache_peak_MiB"]), span(values["image_resident_peak_MiB"]),
            span(values["text_resident_peak_MiB"]),
        )) + " |")
    markdown += ["", "Vulkan allocated bytes are Goo-tracked allocations across memory types. Cache, image, and text values are Goo logical resident-byte counters. Readback pool is limited to window-target readback resources. None measures physical VRAM residency or driver heap usage.", "", "Per-run values and upload/effects/offscreen attribution diagnostics are in `runs.csv` and `analysis.json`. Across-run summaries are medians and ranges of run-level values; they are not pooled percentiles.", ""]
    (output / "analysis.md").write_text("\n".join(markdown))
    print(f"analyzed {len(runs)} runs into {output}")


if __name__ == "__main__":
    main()
