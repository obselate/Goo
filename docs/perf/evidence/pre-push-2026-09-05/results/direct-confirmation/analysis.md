# Paired benchmark analysis

Lane A: `staged`. Lane B: `direct`.

Reported P50, P95, P99, and maximum aggregates are medians of independent run-level values. They are not percentiles computed from pooled samples and are not percentiles of percentiles. Paired changes compare B with A within the same pair before taking the median change.

## short: full

| Metric | Median run A | Median run B | Median paired B vs A |
| --- | ---: | ---: | ---: |
| p50_ns | 2856525.000 | 40466557.500 | 1315.887% |
| p95_ns | 3641084.000 | 42801665.000 | 1130.752% |
| p99_ns | 4013316.000 | 46007299.500 | 1053.685% |
| max_ns | 4530115.000 | 48914042.500 | 1016.765% |
| alloc_B_frame | 512585.000 | 512586.000 | 0.000% |
| alloc_p50_B | 512568.000 | 512568.000 | 0.000% |
| alloc_p99_B | 512568.000 | 512568.000 | 0.000% |

Paired changes:

- Pair 1: p50_ns=1317.499%, p95_ns=1160.767%, p99_ns=1035.439%
- Pair 2: p50_ns=1282.430%, p95_ns=948.154%, p99_ns=857.374%
- Pair 3: p50_ns=1314.275%, p95_ns=1100.738%, p99_ns=1071.931%
- Pair 4: p50_ns=1337.230%, p95_ns=1298.362%, p99_ns=1166.414%

## short: sparse

| Metric | Median run A | Median run B | Median paired B vs A |
| --- | ---: | ---: | ---: |
| p50_ns | 1303888.000 | 22199325.000 | 1601.225% |
| p95_ns | 1869239.000 | 23400153.500 | 1159.701% |
| p99_ns | 2318225.000 | 25587331.500 | 1025.734% |
| max_ns | 3784865.500 | 26404778.000 | 581.282% |
| alloc_B_frame | 512585.000 | 512585.000 | 0.000% |
| alloc_p50_B | 512568.000 | 512568.000 | 0.000% |
| alloc_p99_B | 512568.000 | 512568.000 | 0.000% |

Paired changes:

- Pair 1: p50_ns=1616.933%, p95_ns=1194.186%, p99_ns=920.401%
- Pair 2: p50_ns=1595.767%, p95_ns=1124.052%, p99_ns=1071.908%
- Pair 3: p50_ns=1606.683%, p95_ns=1390.407%, p99_ns=1178.247%
- Pair 4: p50_ns=1584.269%, p95_ns=1125.217%, p99_ns=979.559%

## short: unchanged

| Metric | Median run A | Median run B | Median paired B vs A |
| --- | ---: | ---: | ---: |
| p50_ns | 1187889.500 | 21978883.500 | 1750.635% |
| p95_ns | 1643153.000 | 24393636.500 | 1360.792% |
| p99_ns | 1967579.000 | 25462331.500 | 1194.200% |
| max_ns | 3199576.500 | 26116880.500 | 723.079% |
| alloc_B_frame | 512585.000 | 512585.000 | 0.000% |
| alloc_p50_B | 512568.000 | 512568.000 | 0.000% |
| alloc_p99_B | 512568.000 | 512568.000 | 0.000% |

Paired changes:

- Pair 1: p50_ns=1792.111%, p95_ns=1649.195%, p99_ns=1455.639%
- Pair 2: p50_ns=1767.841%, p95_ns=1355.377%, p99_ns=1213.290%
- Pair 3: p50_ns=1666.065%, p95_ns=1366.207%, p99_ns=1175.111%
- Pair 4: p50_ns=1733.430%, p95_ns=1354.127%, p99_ns=1045.665%

