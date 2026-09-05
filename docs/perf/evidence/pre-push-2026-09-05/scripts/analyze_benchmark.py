#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
from statistics import median

METRICS = ("p50_ns", "p95_ns", "p99_ns", "max_ns", "alloc_B_frame",
           "alloc_p50_B", "alloc_p99_B")


def percent_change(a, b):
    return None if a == 0 else (b - a) * 100.0 / a


def fmt(value):
    if value is None:
        return "n/a"
    if isinstance(value, float):
        return f"{value:.3f}"
    return str(value)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("runs_json")
    ap.add_argument("--output", required=True)
    ap.add_argument("--lane-a")
    ap.add_argument("--lane-b")
    ap.add_argument("--decision-policy", choices=("none", "direct_upload"), default="none")
    args = ap.parse_args()
    source = Path(args.runs_json).resolve()
    doc = json.loads(source.read_text())
    runs = doc["runs"]
    if not runs or not all(r.get("validated") for r in runs):
        raise ValueError("analysis requires validated completed runs")
    lane_names = sorted({r["lane"] for r in runs})
    a_name = args.lane_a or lane_names[0]
    b_name = args.lane_b or lane_names[1]
    if set(lane_names) != {a_name, b_name}:
        raise ValueError("lane names do not match run data")
    keyed = {(r["phase"], r["pair"], r["workload"], r["lane"]): r for r in runs}
    groups = sorted({(r["phase"], r["workload"]) for r in runs})
    result = {"source": str(source), "lane_a": a_name, "lane_b": b_name,
              "method": "medians of run-level values and within-pair changes",
              "groups": [], "decision": None}
    md = ["# Paired benchmark analysis", "",
          f"Lane A: `{a_name}`. Lane B: `{b_name}`.", "",
          "Reported P50, P95, P99, and maximum aggregates are medians of independent run-level values. They are not percentiles computed from pooled samples and are not percentiles of percentiles. Paired changes compare B with A within the same pair before taking the median change.", ""]
    pair_delta_index = {}
    median_index = {}
    for phase, workload in groups:
        pairs = sorted({r["pair"] for r in runs if r["phase"] == phase and r["workload"] == workload})
        entries = []
        for pair in pairs:
            a = keyed.get((phase, pair, workload, a_name))
            b = keyed.get((phase, pair, workload, b_name))
            if a is None or b is None:
                raise ValueError(f"incomplete pair {phase}/{workload}/{pair}")
            changes = {m: percent_change(a["metrics"][m], b["metrics"][m]) for m in METRICS}
            absolutes = {m: b["metrics"][m] - a["metrics"][m] for m in METRICS}
            entries.append({"pair": pair, "a": {m: a["metrics"][m] for m in METRICS},
                            "b": {m: b["metrics"][m] for m in METRICS},
                            "b_minus_a": absolutes, "paired_percent_change": changes})
        a_medians = {m: median(e["a"][m] for e in entries) for m in METRICS}
        b_medians = {m: median(e["b"][m] for e in entries) for m in METRICS}
        paired_medians = {m: median(e["paired_percent_change"][m] for e in entries
                                    if e["paired_percent_change"][m] is not None)
                          if any(e["paired_percent_change"][m] is not None for e in entries) else None
                          for m in METRICS}
        group = {"phase": phase, "workload": workload, "pair_count": len(entries),
                 "median_run_value_a": a_medians, "median_run_value_b": b_medians,
                 "median_within_pair_percent_change": paired_medians, "pairs": entries}
        result["groups"].append(group)
        median_index[(phase, workload)] = (a_medians, b_medians)
        pair_delta_index[(phase, workload)] = entries
        md += [f"## {phase}: {workload}", "",
               "| Metric | Median run A | Median run B | Median paired B vs A |",
               "| --- | ---: | ---: | ---: |"]
        for metric in METRICS:
            change = paired_medians[metric]
            suffix = "" if change is None else "%"
            md.append(f"| {metric} | {fmt(a_medians[metric])} | {fmt(b_medians[metric])} | {fmt(change)}{suffix} |")
        md += ["", "Paired changes:", ""]
        for entry in entries:
            fields = ", ".join(f"{m}={fmt(entry['paired_percent_change'][m])}%"
                               for m in ("p50_ns", "p95_ns", "p99_ns"))
            md.append(f"- Pair {entry['pair']}: {fields}")
        md.append("")
    if args.decision_policy == "direct_upload":
        expected = {("short", w) for w in ("unchanged", "sparse", "full")} | {("long", "unchanged")}
        confirmation = {("confirmation", w) for w in ("unchanged", "sparse", "full")}
        if expected.issubset(set(median_index)):
            long_entries = pair_delta_index[("long", "unchanged")]
            long_all_better = all(e["b"]["p99_ns"] < e["a"]["p99_ns"] for e in long_entries)
            long_all_worse = all(e["b"]["p99_ns"] > e["a"]["p99_ns"] for e in long_entries)
            short_medians_better = all(
                median_index[("short", w)][1][m] < median_index[("short", w)][0][m]
                for w in ("unchanged", "sparse", "full") for m in ("p50_ns", "p95_ns", "p99_ns"))
            short_p99_all_better = all(
                e["b"]["p99_ns"] < e["a"]["p99_ns"]
                for w in ("unchanged", "sparse", "full")
                for e in pair_delta_index[("short", w)])
            allocation_not_higher = all(
                median_index[key][1]["alloc_B_frame"] <= median_index[key][0]["alloc_B_frame"]
                for key in expected)
            short_p99_all_worse = all(
                median_index[("short", w)][1]["p99_ns"] > median_index[("short", w)][0]["p99_ns"]
                for w in ("unchanged", "sparse", "full"))
            if long_all_better and short_medians_better and short_p99_all_better and allocation_not_higher:
                disposition = "default_candidate"
                rationale = "B is lower in every paired P99, every short-workload median CPU percentile, with no median allocation increase."
            elif long_all_worse and short_p99_all_worse:
                disposition = "reject_candidate"
                rationale = "B is higher in every long unchanged P99 pair and in every short-workload median P99."
            else:
                disposition = "retain_opt_in_staged_default"
                rationale = "Whole-frame tail and CPU direction are mixed, so the evidence does not support default adoption or consistent rejection."
            decision_details = {
                "long_p99_all_better": long_all_better, "long_p99_all_worse": long_all_worse,
                "short_median_p50_p95_p99_all_better": short_medians_better,
                "short_all_pair_p99_better": short_p99_all_better,
                "short_median_p99_all_worse": short_p99_all_worse,
                "median_allocation_not_higher": allocation_not_higher,
            }
            policy = "predeclared full-plan sign-consistency rule with no effect-size cutoff"
        elif confirmation.issubset(set(median_index)):
            entries = [e for w in ("unchanged", "sparse", "full")
                       for e in pair_delta_index[("confirmation", w)]]
            all_cpu_worse = all(
                e["b"][metric] > e["a"][metric]
                for e in entries for metric in ("p50_ns", "p95_ns", "p99_ns"))
            if all_cpu_worse:
                disposition = "reject_candidate"
                rationale = "After a gross pilot regression, B is higher in every P50, P95, and P99 across three balanced confirmation pairs for all workloads."
            else:
                disposition = "inconclusive_requires_full_plan"
                rationale = "The shortened gross-regression confirmation is not directionally unanimous, so it cannot decide default, opt-in, or rejection."
            decision_details = {"confirmation_all_pair_p50_p95_p99_worse": all_cpu_worse}
            policy = "predeclared gross-regression confirmation rule with no effect-size cutoff"
        else:
            raise ValueError("direct_upload decision requires the full plan or all three confirmation workloads")
        result["decision"] = {
            "policy": policy,
            "disposition": disposition, "rationale": rationale,
            **decision_details,
        }
        md += ["## Predeclared direct-upload disposition", "",
               f"**{disposition}**: {rationale}", "",
               "The rule uses only direction consistency. It has no post-hoc effect-size threshold. A shortened confirmation can only reject a gross regression or require the full plan. `default_candidate` still requires engineering review before changing the default.", ""]
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    (output / "analysis.json").write_text(json.dumps(result, indent=2, sort_keys=True) + "\n")
    (output / "analysis.md").write_text("\n".join(md) + "\n")
    print(result["decision"]["disposition"] if result["decision"] else "analysis_complete")

if __name__ == "__main__":
    main()
