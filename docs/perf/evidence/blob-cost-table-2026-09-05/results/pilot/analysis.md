# Sparse Blob cost table

1 fresh processes per Blob, 1,000 cells, 50 warmup frames and 100 measured frames. Validation: enabled.

| Blob | Cold CPU low/worst ms | Cold alloc low/worst B | Warm CPU P50/P95/P99 ms | Warm alloc P50/P95 B/frame | Managed/RSS/PSS MiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Container | 11.033 / 13.903 | 2,808 / 159,216 | 2.624 / 3.693 / 4.345 | 664 / 664 | 6.22 / 183.6 / 124.5 |
| Button | 5.165 / 13.905 | 1,120 / 159,672 | 2.638 / 4.434 / 5.515 | 1,120 / 1,120 | 6.37 / 180.7 / 121.6 |
| Text | 9.297 / 24.525 | 74,912 / 855,584 | 2.083 / 3.215 / 3.642 | 776 / 776 | 10.05 / 204.2 / 144.9 |
| TextEntry | 38.611 / 43.169 | 75,432 / 654,800 | 15.616 / 19.080 / 20.602 | 824 / 1,080 | 11.53 / 209.5 / 150.3 |
| TextEditor | 37.263 / 47.603 | 76,088 / 655,544 | 16.411 / 18.459 / 24.466 | 968 / 1,160 | 13.76 / 215.1 / 155.9 |
| Image | 6.660 / 24.293 | 156,528 / 990,720 | 3.009 / 3.728 / 4.076 | 640 / 640 | 7.63 / 201.6 / 142.3 |
| Shape | 7.334 / 23.177 | 4,344 / 765,384 | 3.746 / 5.052 / 7.641 | 3,888 / 3,888 | 6.44 / 183.3 / 124.0 |

Cold values are medians of the 1 process-level lows and worsts, each computed from two post-initial-render frames. Warm CPU and allocation values are medians of process-level quantiles. Managed, RSS, and PSS are medians from the same post-measurement forced-GC checkpoint. Detailed minimum and maximum process values remain in analysis.json.

## GPU companion

| Blob | Main P50/P99 ms | Upload P50/P99 ms | Vulkan allocated MiB |
| --- | ---: | ---: | ---: |
| Container | 0.004 / 0.014 | 0.000 / 0.000 | 6.0 |
| Button | 0.004 / 0.014 | 0.000 / 0.000 | 6.0 |
| Text | 0.024 / 0.058 | 0.000 / 0.000 | 6.0 |
| TextEntry | 0.421 / 0.444 | 0.000 / 0.000 | 8.0 |
| TextEditor | 0.421 / 0.484 | 0.000 / 0.000 | 8.0 |
| Image | 0.004 / 0.013 | 0.000 / 0.000 | 22.0 |
| Shape | 0.148 / 0.151 | 0.000 / 0.000 | 6.0 |

Main is the outer renderer timestamp scope. It excludes presentation and separate upload timing, and it may enclose effects and offscreen work. Do not sum stage timings. Vulkan allocated MiB is Goo-tracked Vulkan allocation across memory types at the measured endpoint, not physical VRAM residency.
