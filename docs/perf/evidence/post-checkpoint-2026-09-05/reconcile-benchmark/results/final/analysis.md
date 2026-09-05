# Reconciler benchmark analysis

Median of independently measured per-process percentiles and paired percent changes. No percentile of percentiles is claimed.

Prospective decision: style retain, keyed retain.

| Comparison | Case | Count | P50 baseline ns | P50 candidate ns | Paired change | Lower pairs | Alloc P50 baseline/candidate B |
|---|---:|---:|---:|---:|---:|---:|---:|
| style | distinct-equal-text | 0 | 232889 | 236736 | +1.652% | 0/7 | 0/0 |
| style | nil-equal | 0 | 163208 | 35006 | -78.551% | 7/7 | 0/0 |
| style | numeric-mismatch | 0 | 34996 | 34025 | -2.775% | 5/7 | 0/0 |
| style | shared-text | 0 | 221497 | 34996 | -84.200% | 7/7 | 0/0 |
| keyed | remove-add | 10 | 8997 | 8976 | -0.344% | 4/7 | 0/0 |
| keyed | remove-add | 100 | 29956 | 29125 | -2.095% | 5/7 | 0/0 |
| keyed | remove-add | 1000 | 242718 | 239853 | -1.627% | 4/7 | 0/0 |
| keyed | reorder | 10 | 2535 | 2494 | -1.584% | 6/7 | 0/0 |
| keyed | reorder | 100 | 23143 | 22913 | -2.078% | 4/7 | 0/0 |
| keyed | reorder | 1000 | 240354 | 237558 | -1.784% | 4/7 | 0/0 |
| keyed | stable | 10 | 2625 | 2545 | -3.810% | 6/7 | 0/0 |
| keyed | stable | 100 | 23795 | 22913 | -3.747% | 6/7 | 0/0 |
| keyed | stable | 1000 | 239982 | 234492 | -3.668% | 7/7 | 0/0 |

Style timings are batch duration. Divide by the configured style batch for ns per comparison. Keyed timings cover one complete reconciliation only. Validation runs outside timed and allocation intervals.
