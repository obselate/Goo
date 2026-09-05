#!/usr/bin/env python3
import argparse
import csv
import json
import statistics
from pathlib import Path

CPU_FIELDS = ("cpu_p50_ns", "cpu_p95_ns", "cpu_p99_ns", "cpu_max_ns")
ALLOC_FIELDS = ("alloc_p50_B", "alloc_p95_B", "alloc_p99_B", "alloc_total_B")


def median(values):
    return statistics.median(values)


def row_key(row):
    return row["category"], row["case"], int(row["count"])


def delta(candidate, baseline):
    if baseline == 0:
        return None
    return (candidate - baseline) * 100.0 / baseline


def summarize(manifest, comparison, baseline_lane, candidate_lane):
    runs = [run for run in manifest["runs"] if run["comparison"] == comparison]
    by_pair = {}
    for run in runs:
        by_pair.setdefault(run["pair"], {})[run["lane"]] = {
            row_key(row): row for row in run["rows"]
        }
    output = []
    keys = sorted(next(iter(by_pair.values()))[baseline_lane])
    for key in keys:
        if comparison == "style" and key[0] != "style":
            continue
        if comparison == "keyed" and key[0] != "keyed":
            continue
        pairs = []
        for pair in sorted(by_pair):
            base = by_pair[pair][baseline_lane][key]
            cand = by_pair[pair][candidate_lane][key]
            values = {"pair": pair}
            for field in CPU_FIELDS + ALLOC_FIELDS:
                b = int(base[field])
                c = int(cand[field])
                values[field] = {"baseline": b, "candidate": c, "change_pct": delta(c, b)}
            pairs.append(values)
        summary = {"category": key[0], "case": key[1], "count": key[2], "pairs": pairs}
        for field in CPU_FIELDS + ALLOC_FIELDS:
            bases = [item[field]["baseline"] for item in pairs]
            candidates = [item[field]["candidate"] for item in pairs]
            changes = [item[field]["change_pct"] for item in pairs if item[field]["change_pct"] is not None]
            summary[field] = {
                "baseline_median_of_process_stat": median(bases),
                "candidate_median_of_process_stat": median(candidates),
                "paired_change_pct_median": median(changes) if changes else None,
                "candidate_lower_pairs": sum(c < b for b, c in zip(bases, candidates)),
                "candidate_equal_pairs": sum(c == b for b, c in zip(bases, candidates)),
                "candidate_higher_pairs": sum(c > b for b, c in zip(bases, candidates)),
                "baseline_range": [min(bases), max(bases)],
                "candidate_range": [min(candidates), max(candidates)],
            }
        output.append(summary)
    return output


def decision(analysis):
    style = {(row["case"], row["count"]): row for row in analysis["style"]}
    keyed = {(row["case"], row["count"]): row for row in analysis["keyed"]}
    style_targets = [style[("nil-equal", 0)]["cpu_p50_ns"], style[("shared-text", 0)]["cpu_p50_ns"]]
    style_retain = all(
        item["paired_change_pct_median"] is not None
        and item["paired_change_pct_median"] <= -3.0
        and item["candidate_lower_pairs"] >= 5
        for item in style_targets
    )
    keyed_primary = keyed[("stable", 1000)]["cpu_p50_ns"]
    keyed_regressions = [
        keyed[(case, count)]["cpu_p50_ns"]["paired_change_pct_median"]
        for count in (10, 100, 1000)
        for case in ("reorder", "remove-add")
    ]
    keyed_retain = (
        keyed_primary["paired_change_pct_median"] is not None
        and keyed_primary["paired_change_pct_median"] <= -3.0
        and keyed_primary["candidate_lower_pairs"] >= 5
        and all(value is not None and value <= 3.0 for value in keyed_regressions)
    )
    return {
        "style": "retain" if style_retain else "reject",
        "keyed": "retain" if keyed_retain else "reject",
        "policy": {
            "style": "Both nil-equal and shared-text process-P50 medians improve by at least 3%, with candidate lower in at least 5 of 7 pairs.",
            "keyed": "Stable 1000-child process-P50 median improves by at least 3%, candidate is lower in at least 5 of 7 pairs, and no reorder/remove-add process-P50 median regresses by more than 3%.",
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("results", type=Path)
    args = parser.parse_args()
    manifest = json.loads((args.results / "runs.json").read_text())
    analysis = {
        "schema": 1,
        "method": "Median of independently measured per-process percentiles and paired percent changes. No percentile of percentiles is claimed.",
        "style": summarize(manifest, "style", "baseline", "style"),
        "keyed": summarize(manifest, "keyed", "baseline", "keyed"),
    }
    analysis["decision"] = decision(analysis)
    (args.results / "analysis.json").write_text(json.dumps(analysis, indent=2) + "\n")
    with (args.results / "analysis.csv").open("w", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["comparison", "category", "case", "count", "metric", "baseline_median", "candidate_median", "paired_change_pct_median", "lower_pairs", "equal_pairs", "higher_pairs"])
        for comparison in ("style", "keyed"):
            for row in analysis[comparison]:
                for metric in CPU_FIELDS + ALLOC_FIELDS:
                    value = row[metric]
                    writer.writerow([comparison, row["category"], row["case"], row["count"], metric, value["baseline_median_of_process_stat"], value["candidate_median_of_process_stat"], value["paired_change_pct_median"], value["candidate_lower_pairs"], value["candidate_equal_pairs"], value["candidate_higher_pairs"]])
    lines = [
        "# Reconciler benchmark analysis",
        "",
        analysis["method"],
        "",
        f"Prospective decision: style {analysis['decision']['style']}, keyed {analysis['decision']['keyed']}.",
        "",
        "| Comparison | Case | Count | P50 baseline ns | P50 candidate ns | Paired change | Lower pairs | Alloc P50 baseline/candidate B |",
        "|---|---:|---:|---:|---:|---:|---:|---:|",
    ]
    for comparison in ("style", "keyed"):
        for row in analysis[comparison]:
            cpu = row["cpu_p50_ns"]
            alloc = row["alloc_p50_B"]
            change = cpu["paired_change_pct_median"]
            change_text = "n/a" if change is None else f"{change:+.3f}%"
            lines.append(f"| {comparison} | {row['case']} | {row['count']} | {cpu['baseline_median_of_process_stat']} | {cpu['candidate_median_of_process_stat']} | {change_text} | {cpu['candidate_lower_pairs']}/7 | {alloc['baseline_median_of_process_stat']}/{alloc['candidate_median_of_process_stat']} |")
    lines.extend(["", "Style timings are batch duration. Divide by the configured style batch for ns per comparison. Keyed timings cover one complete reconciliation only. Validation runs outside timed and allocation intervals."])
    (args.results / "analysis.md").write_text("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
