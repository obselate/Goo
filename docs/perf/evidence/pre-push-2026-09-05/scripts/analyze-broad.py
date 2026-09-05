#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from statistics import median

METRICS = ("p50_ns", "p95_ns", "p99_ns", "p999_ns", "max_ns",
           "alloc_B_frame", "alloc_p50_B", "alloc_p99_B")
OPTIONAL_METRICS = ("vk_object_alloc_delta", "vk_device_alloc_delta")


def change(a, b):
    return None if a == 0 else (b - a) * 100.0 / a


def shown(value):
    if value is None:
        return "n/a"
    if isinstance(value, float):
        return f"{value:.3f}"
    return str(value)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("runs_json")
    parser.add_argument("--output", required=True)
    parser.add_argument("--expected-pairs", type=int, default=6)
    args = parser.parse_args()
    source = Path(args.runs_json).resolve()
    runs = json.loads(source.read_text())["runs"]
    if not runs or not all(run.get("validated") for run in runs):
        raise ValueError("analysis requires validated completed runs")
    lanes = sorted({run["lane"] for run in runs})
    if lanes != ["A-pre-pipeline", "C-post-timeline"]:
        raise ValueError(f"unexpected lanes {lanes}")
    keyed = {(run["pair"], run["workload"], run["lane"]): run for run in runs}
    workloads = sorted({run["workload"] for run in runs})
    if workloads != ["image-effects", "shader-effect"]:
        raise ValueError(f"unexpected workloads {workloads}")
    report = {
        "source": str(source),
        "comparison": "C post-timeline pre-direct versus A pre-pipeline identity",
        "method": "medians of independent run-level values and within-pair changes",
        "groups": [],
    }
    markdown = [
        "# Broad paired benchmark analysis", "",
        "C is compared with A within each alternating-order pair. Aggregate P50, P95, P99, P99.9, and maximum values are medians of independent run-level statistics. They are not pooled-sample percentiles or new distribution percentiles.", "",
    ]
    for workload in workloads:
        pairs = sorted({run["pair"] for run in runs if run["workload"] == workload})
        if pairs != list(range(1, args.expected_pairs + 1)):
            raise ValueError(f"{workload} pairs are {pairs}, expected 1..{args.expected_pairs}")
        metrics = METRICS + tuple(
            metric for metric in OPTIONAL_METRICS
            if all(metric in run["metrics"] for run in runs if run["workload"] == workload))
        entries = []
        for pair in pairs:
            a = keyed.get((pair, workload, "A-pre-pipeline"))
            c = keyed.get((pair, workload, "C-post-timeline"))
            if a is None or c is None:
                raise ValueError(f"incomplete pair {pair} for {workload}")
            entries.append({
                "pair": pair,
                "a": {metric: a["metrics"][metric] for metric in metrics},
                "c": {metric: c["metrics"][metric] for metric in metrics},
                "c_minus_a": {metric: c["metrics"][metric] - a["metrics"][metric]
                              for metric in metrics},
                "paired_percent_change": {
                    metric: change(a["metrics"][metric], c["metrics"][metric])
                    for metric in metrics
                },
            })
        a_median = {metric: median(entry["a"][metric] for entry in entries)
                    for metric in metrics}
        c_median = {metric: median(entry["c"][metric] for entry in entries)
                    for metric in metrics}
        paired_median = {
            metric: median(value for value in
                           (entry["paired_percent_change"][metric] for entry in entries)
                           if value is not None)
            if any(entry["paired_percent_change"][metric] is not None for entry in entries)
            else None
            for metric in metrics
        }
        directions = {
            metric: {
                "c_lower": sum(entry["c"][metric] < entry["a"][metric] for entry in entries),
                "equal": sum(entry["c"][metric] == entry["a"][metric] for entry in entries),
                "c_higher": sum(entry["c"][metric] > entry["a"][metric] for entry in entries),
            }
            for metric in metrics
        }
        report["groups"].append({
            "workload": workload, "pair_count": len(entries),
            "median_run_value_a": a_median, "median_run_value_c": c_median,
            "median_within_pair_percent_change": paired_median,
            "paired_direction_counts": directions, "pairs": entries,
        })
        markdown += [
            f"## {workload}", "",
            "| Metric | Median run A | Median run C | Median paired C vs A | C lower/equal/higher |",
            "| --- | ---: | ---: | ---: | ---: |",
        ]
        for metric in metrics:
            direction = directions[metric]
            suffix = "" if paired_median[metric] is None else "%"
            markdown.append(
                f"| {metric} | {shown(a_median[metric])} | {shown(c_median[metric])} | "
                f"{shown(paired_median[metric])}{suffix} | {direction['c_lower']}/"
                f"{direction['equal']}/{direction['c_higher']} |")
        markdown += ["", "Paired CPU percentile changes:", ""]
        for entry in entries:
            fields = ", ".join(
                f"{metric}={shown(entry['paired_percent_change'][metric])}%"
                for metric in ("p50_ns", "p95_ns", "p99_ns", "p999_ns"))
            markdown.append(f"- Pair {entry['pair']}: {fields}")
        markdown.append("")
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    (output / "analysis.json").write_text(json.dumps(report, indent=2, sort_keys=True) + "\n")
    (output / "analysis.md").write_text("\n".join(markdown) + "\n")
    print("analysis_complete")


if __name__ == "__main__":
    main()
