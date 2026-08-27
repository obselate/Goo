# Linux release qualification

Goo is qualified on Linux x64 in a native Wayland session. Vulkan correctness runs use Khronos validation. Performance claims use actual NVIDIA hardware, never software Vulkan.

## Reference system

- Linux x64
- AMD Ryzen 7 3700X
- NVIDIA GeForce RTX 3080
- NVIDIA driver 610.57.04
- .NET 10
- Vulkan validation 1.4.357

## Current evidence

| Area | Result |
| --- | --- |
| Public API tests | 10 passed |
| Core behavior tests | 266 passed |
| Official performance workloads | 8 of 8 passed |
| Text editing CPU P50/P95/P99 | 0.498 / 0.552 / 0.701 ms |
| True-idle CPU use | 0.0997% of one core |
| Warm managed allocation | 0 B where required |
| Warm Vulkan allocation | 0 objects and 0 device-memory allocations where required |
| Package | 3,826,694 bytes |
| Linux bundle | 10,162,146 bytes |
| Bundle native libraries | SDL3, HarfBuzz, hb-gpu |

Performance workloads use 300 warmup frames and 2,000 measured frames unless the workload states otherwise. The exact workload definitions are in [`performance-workloads.json`](performance-workloads.json).

## Reproduce

The public CI workflow builds the library, regenerates documentation, runs portable Vulkan checks, runs API and behavior tests, packs Goo, publishes a clean package consumer, and validates the Linux bundle.

Hardware-only checks live in the focused projects documented in [`tests/README.md`](../../tests/README.md). Record the GPU, driver, runtime, warmup, and sample count with every result.

## Remaining qualification

- Windows x64 runtime
- Linux integrated GPU
- A second real display scale

These open environments do not weaken the qualified Linux x64 result.
