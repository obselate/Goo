#!/usr/bin/env python3
import argparse
import json
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

KINDS = ("container", "text", "image", "shape", "button", "text-entry", "text-editor")
MODES = ("unchanged", "sparse", "full")
LABELS = {
    "container": "Container", "text": "Text", "image": "Image", "shape": "Shape",
    "button": "Button", "text-entry": "Text Entry", "text-editor": "Text Editor",
}
COLORS = {"unchanged": "#4C78A8", "sparse": "#F2A541", "full": "#D1495B"}


def group_index(document):
    return {(group["kind"], group["mode"]): group for group in document["groups"]}


def draw_panel(axis, groups, metric, title, ylabel, symlog=False):
    positions = np.arange(len(KINDS), dtype=float)
    width = 0.24
    for mode_index, mode in enumerate(MODES):
        values = [groups[(kind, mode)]["aggregates"][metric] for kind in KINDS]
        centers = positions + (mode_index - 1) * width
        medians = np.array([value["median"] for value in values])
        lower = np.array([value["median"] - value["minimum"] for value in values])
        upper = np.array([value["maximum"] - value["median"] for value in values])
        axis.bar(centers, medians, width, label=mode, color=COLORS[mode],
                 edgecolor="#20242A", linewidth=0.45, zorder=2)
        axis.errorbar(centers, medians, yerr=np.vstack((lower, upper)), fmt="none",
                      ecolor="#20242A", elinewidth=0.8, capsize=2.5, capthick=0.8, zorder=3)
    axis.set_title(title, loc="left", fontsize=12, fontweight="bold")
    axis.set_ylabel(ylabel)
    axis.set_xticks(positions, [LABELS[kind] for kind in KINDS], rotation=24, ha="right")
    axis.grid(axis="y", color="#D8DCE2", linewidth=0.7, alpha=0.8, zorder=0)
    axis.spines[["top", "right"]].set_visible(False)
    if symlog:
        axis.set_yscale("symlog", linthresh=1.0)
        axis.axhline(0, color="#59616C", linewidth=0.7)
        largest = max(groups[(kind, mode)]["aggregates"][metric]["maximum"] for kind in KINDS for mode in MODES)
        axis.set_ylim(0, largest * 2.0)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--analysis", default="/tmp/goo-all-blobs/results/final/analysis.json")
    parser.add_argument("--output", default="/tmp/goo-all-blobs/results/final")
    parser.add_argument("--allocations", action=argparse.BooleanOptionalAction, default=True)
    args = parser.parse_args()
    analysis_path = Path(args.analysis).resolve()
    document = json.loads(analysis_path.read_text())
    if document.get("rounds") != 3 or document.get("run_count") != 63:
        raise ValueError("overview requires the final 3-round, 63-run analysis")
    if document.get("validation_enabled"):
        raise ValueError("overview requires validation-off timing results")
    groups = group_index(document)
    expected = {(kind, mode) for kind in KINDS for mode in MODES}
    if set(groups) != expected:
        raise ValueError("analysis does not contain the complete 7 x 3 matrix")
    panels = [
        ("cpu_p50_ms", "Host frame CPU P50", "Milliseconds", False),
        ("rss_peak_MiB", "Sampled peak RSS", "MiB", False),
        ("gpu_main_p50_ms", "GPU main-pass P50", "Milliseconds", False),
    ]
    if args.allocations:
        panels.append(("alloc_B_frame", "Managed allocation per frame", "Bytes / frame", True))
    rows = 2 if len(panels) == 4 else 1
    columns = 2 if len(panels) == 4 else 3
    matplotlib.rcParams.update({
        "font.family": "DejaVu Sans", "font.size": 9.5,
        "axes.facecolor": "#FAFBFC", "figure.facecolor": "white",
        "svg.hashsalt": "goo-all-blobs-2026-09-05",
    })
    figure, axes = plt.subplots(rows, columns, figsize=(16, 9.5 if rows == 2 else 5.6),
                                constrained_layout=False)
    figure.subplots_adjust(left=0.06, right=0.985, bottom=0.12, top=0.85, hspace=0.40, wspace=0.16)
    axes = np.atleast_1d(axes).reshape(-1)
    for axis, panel in zip(axes, panels):
        draw_panel(axis, groups, *panel)
    handles, labels = axes[0].get_legend_handles_labels()
    figure.legend(handles, labels, ncol=3, loc="upper center", bbox_to_anchor=(0.5, 0.92),
                  frameon=False)
    figure.suptitle("Goo public Blob benchmark", fontsize=18, fontweight="bold", y=0.98)
    figure.text(0.5, 0.938,
                "1,000 retained cells | 300 warmup frames | 2,000 measured frames | 3 independent processes per kind and mode",
                ha="center", va="top", fontsize=10, color="#4C5562")
    figure.text(0.5, 0.025,
                "Bars are medians; whiskers span minimum to maximum run values. GPU main-pass excludes presentation and upload, and may enclose effects/offscreen. RSS is sampled, not continuously profiled.",
                ha="center", va="bottom", fontsize=8.5, color="#59616C")
    output = Path(args.output).resolve()
    output.mkdir(parents=True, exist_ok=True)
    metadata = {"Creator": "goo-all-blobs plot.py", "Date": None}
    figure.savefig(output / "overview.png", dpi=180, bbox_inches="tight",
                   metadata={"Software": "goo-all-blobs plot.py"})
    figure.savefig(output / "overview.svg", bbox_inches="tight", metadata=metadata)
    plt.close(figure)


if __name__ == "__main__":
    main()
