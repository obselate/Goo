# Sparse Blob cost table

5 fresh processes per Blob, 1,000 cells, 300 warmup frames and 2000 measured frames. Validation: disabled.

| Blob | Cold CPU low/worst ms | Cold alloc low/worst B | Warm CPU P50/P95/P99 ms | Warm alloc P50/P95 B/frame | Managed/RSS/PSS MiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Container | 5.010 / 13.616 | 664 / 159,216 | 0.804 / 1.311 / 2.228 | 664 / 664 | 6.50 / 158.1 / 98.9 |
| Button | 5.476 / 14.042 | 1,120 / 159,672 | 0.680 / 1.328 / 2.070 | 1,120 / 1,120 | 6.65 / 161.0 / 101.7 |
| Text | 9.004 / 25.928 | 74,912 / 855,584 | 1.304 / 2.135 / 2.851 | 776 / 776 | 10.32 / 174.0 / 114.9 |
| TextEntry | 27.485 / 30.396 | 75,432 / 654,800 | 3.368 / 4.510 / 5.308 | 824 / 824 | 11.81 / 178.1 / 118.9 |
| TextEditor | 26.113 / 35.232 | 76,088 / 655,544 | 3.852 / 5.027 / 5.754 | 968 / 968 | 14.04 / 182.5 / 123.3 |
| Image | 6.871 / 22.251 | 156,528 / 990,720 | 1.233 / 1.874 / 2.426 | 640 / 640 | 7.91 / 175.7 / 116.5 |
| Shape | 5.105 / 22.019 | 4,344 / 765,384 | 0.981 / 1.589 / 2.205 | 1,776 / 1,776 | 6.72 / 160.7 / 101.5 |

Cold values are medians of the 5 process-level lows and worsts, each computed from two post-initial-render frames. Warm CPU and allocation values are medians of process-level quantiles. Managed, RSS, and PSS are medians from the same post-measurement forced-GC checkpoint. Detailed minimum and maximum process values remain in analysis.json.

## GPU companion

| Blob | Main P50/P99 ms | Upload P50/P99 ms | Vulkan allocated MiB |
| --- | ---: | ---: | ---: |
| Container | 0.004 / 0.015 | 0.000096 / 0.000096 | 6.0 |
| Button | 0.004 / 0.015 | 0.000096 / 0.000096 | 6.0 |
| Text | 0.024 / 0.061 | 0.000096 / 0.000096 | 6.0 |
| TextEntry | 0.410 / 0.436 | 0.000096 / 0.000160 | 8.0 |
| TextEditor | 0.411 / 0.465 | 0.000096 / 0.000160 | 8.0 |
| Image | 0.004 / 0.015 | 0.000096 / 0.000096 | 22.0 |
| Shape | 0.144 / 0.150 | 0.000096 / 0.000224 | 6.0 |

Main is the outer renderer timestamp scope. It excludes presentation and separate upload timing, and it may enclose effects and offscreen work. Do not sum stage timings. Vulkan allocated MiB is Goo-tracked Vulkan allocation across memory types at the measured endpoint, not physical VRAM residency.
