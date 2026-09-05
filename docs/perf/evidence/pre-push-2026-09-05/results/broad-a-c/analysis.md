# Broad paired benchmark analysis

C is compared with A within each alternating-order pair. Aggregate P50, P95, P99, P99.9, and maximum values are medians of independent run-level statistics. They are not pooled-sample percentiles or new distribution percentiles.

## image-effects

| Metric | Median run A | Median run C | Median paired C vs A | C lower/equal/higher |
| --- | ---: | ---: | ---: | ---: |
| p50_ns | 6210313.500 | 6167863.500 | -1.439% | 4/0/2 |
| p95_ns | 7500029.500 | 7650539.000 | -0.534% | 3/0/3 |
| p99_ns | 9279284.000 | 9300193.500 | -0.775% | 4/0/2 |
| p999_ns | 11913876.000 | 11710783.500 | -2.440% | 4/0/2 |
| max_ns | 12690385.000 | 12771563.000 | 1.128% | 2/0/4 |
| alloc_B_frame | 650953.000 | 650678.500 | -0.042% | 6/0/0 |
| alloc_p50_B | 650368.000 | 650368.000 | 0.000% | 0/6/0 |
| alloc_p99_B | 654360.000 | 652772.000 | -0.243% | 6/0/0 |
| vk_object_alloc_delta | 6560.000 | 5346.000 | -18.506% | 6/0/0 |
| vk_device_alloc_delta | 0.000 | 0.000 | n/a | 0/6/0 |

Paired CPU percentile changes:

- Pair 1: p50_ns=-4.358%, p95_ns=-2.591%, p99_ns=-4.320%, p999_ns=-4.692%
- Pair 2: p50_ns=-1.309%, p95_ns=-1.560%, p99_ns=-2.482%, p999_ns=-3.860%
- Pair 3: p50_ns=2.242%, p95_ns=0.493%, p99_ns=3.069%, p999_ns=2.100%
- Pair 4: p50_ns=-1.569%, p95_ns=-3.685%, p99_ns=-0.777%, p999_ns=-3.753%
- Pair 5: p50_ns=-1.776%, p95_ns=6.034%, p99_ns=-0.773%, p999_ns=-1.127%
- Pair 6: p50_ns=0.948%, p95_ns=7.125%, p99_ns=3.439%, p999_ns=2.350%

## shader-effect

| Metric | Median run A | Median run C | Median paired C vs A | C lower/equal/higher |
| --- | ---: | ---: | ---: | ---: |
| p50_ns | 361180.500 | 359212.000 | 1.221% | 2/0/4 |
| p95_ns | 729160.000 | 723239.000 | -2.615% | 3/0/3 |
| p99_ns | 1668655.500 | 1576662.500 | -3.670% | 5/0/1 |
| p999_ns | 2081604.500 | 2103215.000 | 7.961% | 2/0/4 |
| max_ns | 2418224.000 | 2278761.500 | 2.782% | 3/0/3 |
| alloc_B_frame | 0.000 | 0.000 | n/a | 0/6/0 |
| alloc_p50_B | 0.000 | 0.000 | n/a | 0/6/0 |
| alloc_p99_B | 0.000 | 0.000 | n/a | 0/6/0 |

Paired CPU percentile changes:

- Pair 1: p50_ns=2.446%, p95_ns=-19.197%, p99_ns=-12.463%, p999_ns=-26.839%
- Pair 2: p50_ns=0.732%, p95_ns=-13.170%, p99_ns=-3.927%, p999_ns=12.964%
- Pair 3: p50_ns=2.173%, p95_ns=12.071%, p99_ns=-1.366%, p999_ns=9.431%
- Pair 4: p50_ns=-5.560%, p95_ns=7.940%, p99_ns=-7.109%, p999_ns=12.753%
- Pair 5: p50_ns=-1.429%, p95_ns=-13.456%, p99_ns=-3.414%, p999_ns=-17.674%
- Pair 6: p50_ns=1.709%, p95_ns=18.564%, p99_ns=11.336%, p999_ns=6.491%

