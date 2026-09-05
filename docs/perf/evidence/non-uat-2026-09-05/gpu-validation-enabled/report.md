# GPU fragment measurements, 2026-09-05

Hardware: AMD Ryzen 7 3700X, NVIDIA GeForce RTX 3080, driver 610.57.04, private KWin Wayland compositor `goo-nonuat`, 3840x2160, scale 1. Each result combines three fresh processes with 300 warmup frames and 1,000 measured frames per process. Vulkan timestamps are tied to exact completed frame IDs. All runs used `VK_LAYER_KHRONOS_validation`, resolved every requested timestamp, recorded zero dropped scopes, produced valid visible raster output, and closed cleanly. Numbers are combined 3,000-frame P50/P95/P99/worst in milliseconds.

## Dense single-band path result

The fixture authors odd counts of distinct, valid, nested rectangle contours with `EvenOdd` fill. Packed payload inspection uses the encoder output and actual Fit transform at physical pixel `(8, height/2)`. Forward and reverse candidate counts match, candidates are within `[2*contours, 4*contours]`, and exact vertical fractional roots equal the contour count. Captured pixels validate outside background, center fill, and a fractional edge distinct from both.

| Size | Covered pixels | Contours | Curves | Bands | Selected candidates | Fractional roots | Overflow | Main P50 | P95 | P99 | Worst |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 256x256 | 57,121 | 1 | 4 | 2 | 3 | 1 | No | 0.037 | 0.043 | 0.050 | 0.072 |
| 256x256 | 57,121 | 17 | 68 | 9 | 34 | 17 | No | 0.301 | 0.342 | 0.366 | 0.383 |
| 256x256 | 57,121 | 31 | 124 | 12 | 62 | 31 | No | 0.751 | 0.804 | 0.829 | 0.882 |
| 256x256 | 57,121 | 33 | 132 | 12 | 66 | 33 | Yes | 4.751 | 5.286 | 5.357 | 5.509 |
| 256x256 | 57,121 | 65 | 260 | 17 | 130 | 65 | Yes | 17.606 | 18.186 | 18.621 | 19.345 |
| 512x512 | 245,025 | 1 | 4 | 2 | 3 | 1 | No | 0.131 | 0.160 | 0.171 | 0.203 |
| 512x512 | 245,025 | 31 | 124 | 12 | 62 | 31 | No | 1.276 | 1.390 | 1.412 | 1.437 |
| 512x512 | 245,025 | 33 | 132 | 12 | 66 | 33 | Yes | 6.927 | 7.972 | 8.113 | 9.044 |
| 1024x1024 | 1,014,049 | 1 | 4 | 2 | 3 | 1 | No | 0.520 | 0.584 | 0.621 | 0.655 |
| 1024x1024 | 1,014,049 | 31 | 124 | 12 | 62 | 31 | No | 2.274 | 3.260 | 3.377 | 3.488 |
| 1024x1024 | 1,014,049 | 33 | 132 | 12 | 66 | 33 | Yes | 13.548 | 15.628 | 17.913 | 18.983 |

The 65-root case was stopped at 256x256 because its retained candidate already exceeds a 16.67 ms frame at P50. No larger 65-root cases were run.

## Retained fallback change

The retained change orders only roots with distance below 0.5 after the 32-root array overflows. Distant roots all contribute an exact amount of 1, so the shader reconstructs their effect from the total parity already collected by the first pass. The fallback remains quadratic in the number of fractional roots.

| Contours | Control P50 ms | Candidate P50 ms | Change | Measured fixture PPM equal |
|---:|---:|---:|---:|---:|
| 1 | 0.0348 | 0.0369 | +5.88% | Yes |
| 31 | 0.7434 | 0.7506 | +0.96% | Yes |
| 33 | 7.1424 | 4.7514 | -33.48% | Yes |
| 65 | 26.8728 | 17.6056 | -34.49% | Yes |

The optimization has a small consistent cost in the no-overflow fixture and a material gain only in the measured overflow stress cases. It was retained on that explicit trade. The PPM equality applies to this measured fixture, not every possible path.

## Glass result

The panel covers the stated area over deterministic opaque red and blue stripes with the Gallery material parameters and a 24-pixel inset. Main contains the complete main pass and includes the nested Effects scope. Effects isolates the glass effect draw, so the two values must not be added.

| Material | Window | Covered pixels | Main P50 | P95 | P99 | Worst | Effects P50 | P95 | P99 | Worst |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Liquid | 640x480 | 255,744 | 0.048 | 0.050 | 0.059 | 0.080 | 0.032 | 0.032 | 0.039 | 0.061 |
| Liquid | 1120x760 | 763,264 | 0.115 | 0.117 | 0.141 | 0.148 | 0.078 | 0.079 | 0.103 | 0.110 |
| Liquid | 1920x1080 | 1,931,904 | 0.263 | 0.287 | 0.292 | 0.313 | 0.181 | 0.205 | 0.209 | 0.228 |
| Terminal | 640x480 | 255,744 | 0.039 | 0.041 | 0.052 | 0.078 | 0.023 | 0.024 | 0.027 | 0.054 |
| Terminal | 1120x760 | 763,264 | 0.090 | 0.091 | 0.117 | 0.141 | 0.053 | 0.054 | 0.078 | 0.093 |
| Terminal | 1920x1080 | 1,931,904 | 0.200 | 0.217 | 0.228 | 0.244 | 0.119 | 0.123 | 0.147 | 0.158 |

The fixed liquid shader was measured. Fixed and pre-fix liquid bundles produce byte-identical opaque 640x480 captures, SHA-256 `2130c221c4fe9acaa5c366175addccdf2ad39398540eb542dac3542f7004a46e`. The identical-runtime alpha regression fails with the pre-fix bundle and passes with the fixed bundle.

At 1920x1080 the measured Effects P50 is 0.181 ms for Liquid and 0.119 ms for Terminal on this RTX 3080. Both visual shaders are retained without speculative tap reductions.

## Provenance and verification

Fresh benchmark runtime hashes: app DLL `127ed8a5ff2bc53b65f51c609578a981c6542d76e1ff84ddd36b05aff5a0e3e8`, app PDB `244681d9516ae1d8d2dd8d8e1064f6be731af896ea3ca5f9de0ba5d8fdf0517c`, Goo DLL `a5782bc002bfb584d0512cfe099626fca6bba0339600fc75baeed5d8412b70d9`. Fixed liquid bundle `03b910c31e733ba17990d7f77a4c3400f6fcac9eea3a2b65d8baa0650f132fc7`; terminal bundle `f25adebe222dfe7721dbd94457e835ef7b74e099b310488a2276ce55ce1a9db1`. Retained path source `bec23e8fb1ba1e8cf614a27e19a325417da6a7c677472d87725c2d33ffed3d47`; path SPIR-V `d35f24052632ec03b9436cb64963d6cd6b6707a4da1a8f3309d45ca35d5ad03f`; clip-mask SPIR-V `44d9055153c9bba0822b0eec624473a2468ba30835e6c8d7ec81ed90f3ba8c08`; generated and production manifest `37177b52f4d05909ad932a08597b447dd15ebae2b0c6905dc3b378443707d582`.

The generator command was `env SLANG_SDK=/tmp/goo-slang-2026.16 dotnet /home/xaz/Projects/goo-gsharp/tools/Goo.ShaderGen/bin/Release/net10.0/Goo.ShaderGen.dll generate` from the frozen candidate tree. Final repository verification command: `env SLANG_SDK=/tmp/goo-slang-2026.16 dotnet tools/Goo.ShaderGen/bin/Release/net10.0/Goo.ShaderGen.dll check`. Root owns the final native vector quality and clip-mask gate after integration.
