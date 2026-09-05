#!/usr/bin/env python3

import json
import re
import sys

pattern = re.compile(
    r"^liquid-glass-alpha-sample: x=(\d+) discontinuity=(\d+)/(\d+)/(\d+)/(\d+) opaque=(\d+)/(\d+)/(\d+)/(\d+)$"
)


def load(path):
    samples = {}
    with open(path, encoding="utf-8") as source:
        for line in source:
            match = pattern.match(line.rstrip("\n"))
            if match is None:
                continue
            values = [int(value) for value in match.groups()]
            samples[values[0]] = {
                "discontinuity": values[1:5],
                "opaque": values[5:9],
            }
    if sorted(samples) != list(range(32, 64)):
        raise RuntimeError(f"incomplete sample set: {path}")
    return samples


baseline = load(sys.argv[1])
fixed = load(sys.argv[2])
opaque_equal = all(baseline[x]["opaque"] == fixed[x]["opaque"] for x in baseline)
transparent_equal = all(
    baseline[x]["discontinuity"] == fixed[x]["discontinuity"]
    for x in range(43, 64)
)
result = {
    "baseline": {str(x): baseline[x] for x in (32, 33, 34, 43)},
    "fixed": {str(x): fixed[x] for x in (32, 33, 34, 43)},
    "opaque_samples": len(baseline),
    "opaque_byte_identical": opaque_equal,
    "transparent_samples": 21,
    "transparent_byte_identical": transparent_equal,
    "x34_blue_delta": fixed[34]["discontinuity"][2] - baseline[34]["discontinuity"][2],
}
if not opaque_equal or not transparent_equal or result["x34_blue_delta"] >= 0:
    raise RuntimeError(json.dumps(result, sort_keys=True))
print(json.dumps(result, indent=2, sort_keys=True))
