# Authoritative layers-off GPU fragment measurements, 2026-09-05

These results supersede the validation-enabled timing values in `docs/perf/evidence/non-uat-2026-09-05/gpu-validation-enabled`. That archive remains correctness evidence only.

Hardware: AMD Ryzen 7 3700X, NVIDIA GeForce RTX 3080, driver 610.57.04, private KWin Wayland compositor `goo-nonuat`, 3840x2160, scale 1. Each result combines three fresh processes with 300 warmup frames and 1,000 measured frames per process. `VK_INSTANCE_LAYERS`, loader enable variables, and implicit-layer enable variables were absent. `VK_LOADER_LAYERS_DISABLE=~implicit~` forced all 10 discovered implicit layers off. The loader proof selected the RTX 3080 and did not activate `VK_LAYER_KHRONOS_validation`.

Goo diagnostics, exact completed-frame timestamp matching, visible raster checks, packed-path checks, readback, and cleanup remained enabled. All 63 timing processes resolved every requested timestamp, recorded zero dropped scopes, passed raster/path assertions, and closed cleanly. The raw evidence contains 45,000 path Main samples, 18,000 glass Main samples, and 18,000 glass Effects samples. Values below are combined 3,000-frame P50/P95/P99/worst in milliseconds.

## Dense single-band path

The fixture uses valid distinct nested rectangle contours with EvenOdd fill. Packed encoder inspection proves actual curve, band, candidate, and fractional-root counts at the sampled pixel. Center, outside, and fractional-edge pixels are validated.

| Size | Covered pixels | Contours | Curves | Bands | Candidates | Fractional roots | Overflow | Main P50 | P95 | P99 | Worst |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 256x256 | 57,121 | 1 | 4 | 2 | 3 | 1 | No | 0.037 | 0.043 | 0.044 | 0.070 |
| 256x256 | 57,121 | 17 | 68 | 9 | 34 | 17 | No | 0.301 | 0.340 | 0.365 | 0.385 |
| 256x256 | 57,121 | 31 | 124 | 12 | 62 | 31 | No | 0.743 | 0.799 | 0.827 | 0.877 |
| 256x256 | 57,121 | 33 | 132 | 12 | 66 | 33 | Yes | 4.752 | 5.290 | 5.359 | 5.629 |
| 256x256 | 57,121 | 65 | 260 | 17 | 130 | 65 | Yes | 17.592 | 18.054 | 18.460 | 19.953 |
| 512x512 | 245,025 | 1 | 4 | 2 | 3 | 1 | No | 0.130 | 0.140 | 0.158 | 0.168 |
| 512x512 | 245,025 | 31 | 124 | 12 | 62 | 31 | No | 1.289 | 1.404 | 1.421 | 1.448 |
| 512x512 | 245,025 | 33 | 132 | 12 | 66 | 33 | Yes | 7.069 | 8.045 | 8.184 | 9.106 |
| 1024x1024 | 1,014,049 | 1 | 4 | 2 | 3 | 1 | No | 0.507 | 0.537 | 0.546 | 0.554 |
| 1024x1024 | 1,014,049 | 31 | 124 | 12 | 62 | 31 | No | 2.308 | 3.287 | 3.371 | 3.550 |
| 1024x1024 | 1,014,049 | 33 | 132 | 12 | 66 | 33 | Yes | 13.640 | 15.755 | 17.985 | 19.507 |

The 65-root case stops at 256x256 because candidate P50 is already above 16.67 ms. No larger 65-root case was run.

## Retained overflow fallback

The retained shader orders only roots below 0.5 pixel after the 32-root array overflows, then reconstructs distant amount-1 roots from total parity collected in the first pass. The fallback remains quadratic in fractional roots.

| Contours | Control P50 ms | Candidate P50 ms | Change | Measured fixture PPM equal |
|---:|---:|---:|---:|---:|
| 1 | 0.0348 | 0.0369 | +5.88% | Yes |
| 31 | 0.7434 | 0.7434 | +0.00% | Yes |
| 33 | 7.3073 | 4.7524 | -34.96% | Yes |
| 65 | 27.3347 | 17.5923 | -35.64% | Yes |

The measured no-overflow trade is +2.048 microseconds at 1 root and 0.000 microseconds at 31 roots. The overflow stress gain is 34.96% at 33 roots and 35.64% at 65 roots. Capture equality applies to these measured fixtures only.

## Glass

The effect covers the stated area over deterministic opaque red and blue stripes with Gallery parameters and a 24-pixel inset. Main includes the nested Effects scope. Do not add Main and Effects.

| Material | Window | Covered pixels | Main P50 | P95 | P99 | Worst | Effects P50 | P95 | P99 | Worst |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Liquid | 640x480 | 255,744 | 0.047 | 0.049 | 0.050 | 0.078 | 0.031 | 0.032 | 0.033 | 0.058 |
| Liquid | 1120x760 | 763,264 | 0.114 | 0.116 | 0.133 | 0.146 | 0.077 | 0.079 | 0.083 | 0.108 |
| Liquid | 1920x1080 | 1,931,904 | 0.269 | 0.272 | 0.282 | 0.300 | 0.185 | 0.188 | 0.189 | 0.215 |
| Terminal | 640x480 | 255,744 | 0.038 | 0.039 | 0.040 | 0.067 | 0.022 | 0.023 | 0.024 | 0.046 |
| Terminal | 1120x760 | 763,264 | 0.089 | 0.091 | 0.097 | 0.131 | 0.052 | 0.053 | 0.054 | 0.081 |
| Terminal | 1920x1080 | 1,931,904 | 0.201 | 0.205 | 0.206 | 0.231 | 0.120 | 0.123 | 0.123 | 0.151 |

At 1920x1080, Effects P50 is 0.185 ms for Liquid and 0.120 ms for Terminal. Both visual shaders remain unchanged apart from the verified liquid alpha correction. Speculative tap reduction is rejected.

## Provenance

- `control_app_dll`: `127ed8a5ff2bc53b65f51c609578a981c6542d76e1ff84ddd36b05aff5a0e3e8` (/tmp/goo-nonuat-2026-09-05/gpu/path-candidate/runtime-ab/control/Goo.AsyncReadbackSmoke.dll)
- `control_app_pdb`: `244681d9516ae1d8d2dd8d8e1064f6be731af896ea3ca5f9de0ba5d8fdf0517c` (/tmp/goo-nonuat-2026-09-05/gpu/path-candidate/runtime-ab/control/Goo.AsyncReadbackSmoke.pdb)
- `control_goo_dll`: `a5782bc002bfb584d0512cfe099626fca6bba0339600fc75baeed5d8412b70d9` (/tmp/goo-nonuat-2026-09-05/gpu/path-candidate/runtime-ab/control/Goo.dll)
- `control_path_source`: `4028f811e1ad789b5b26b9d2d34663bd770334b298ba908e5f4c17f667e0bfbc` (/tmp/goo-nonuat-2026-09-05/gpu/layers-off/provenance/control-path_band.frag.slang)
- `control_path_spv`: `ff8ba0f3b071f3d3f62c8b0ee0fb596558f493f4a23e3139d7c1b71a305d4c2c` (/tmp/goo-nonuat-2026-09-05/gpu/path-candidate/runtime-ab/control/Vulkan/Shaders/path_band.frag.spv)
- `control_clip_spv`: `f3d6946d46cbb78a9c8c4e098369a0fa4ab69f18cd9f157271578f7898b4208f` (/tmp/goo-nonuat-2026-09-05/gpu/path-candidate/runtime-ab/control/Vulkan/Shaders/clip_mask.frag.spv)
- `control_manifest`: `a51b2705bc7a50f6bab5fab77a9c8e1bcdb237403ead47b9ac5c82958e0a8556` (/tmp/goo-nonuat-2026-09-05/gpu/path-candidate/runtime-ab/control/Vulkan/Shaders/shader-manifest.json)
- `candidate_path_source`: `bec23e8fb1ba1e8cf614a27e19a325417da6a7c677472d87725c2d33ffed3d47` (/tmp/goo-nonuat-2026-09-05/gpu/layers-off/provenance/candidate-path_band.frag.slang)
- `candidate_path_spv`: `d35f24052632ec03b9436cb64963d6cd6b6707a4da1a8f3309d45ca35d5ad03f` (/tmp/goo-nonuat-2026-09-05/gpu/path-candidate/runtime-ab/candidate/Vulkan/Shaders/path_band.frag.spv)
- `candidate_clip_spv`: `44d9055153c9bba0822b0eec624473a2468ba30835e6c8d7ec81ed90f3ba8c08` (/tmp/goo-nonuat-2026-09-05/gpu/path-candidate/runtime-ab/candidate/Vulkan/Shaders/clip_mask.frag.spv)
- `candidate_manifest`: `37177b52f4d05909ad932a08597b447dd15ebae2b0c6905dc3b378443707d582` (/tmp/goo-nonuat-2026-09-05/gpu/path-candidate/runtime-ab/candidate/Vulkan/Shaders/shader-manifest.json)
- `fixed_liquid_source`: `980664a89a5a0601ce15e56d0730bf90415f7713176a203ebe4a002248fc44a5` (/tmp/goo-nonuat-2026-09-05/gpu/shaders/final-correctness/liquid_glass.frag.slang)
- `fixed_liquid_bundle`: `03b910c31e733ba17990d7f77a4c3400f6fcac9eea3a2b65d8baa0650f132fc7` (/tmp/goo-nonuat-2026-09-05/gpu/shaders/final-correctness/liquid_glass.goo-effect)
- `terminal_source`: `262322989a958707c678acc49a5f9e98a44688dfd727165e8d724c3e8999d3b2` (/tmp/goo-nonuat-2026-09-05/gpu/shaders/final-correctness/terminal_glass.frag.slang)
- `terminal_bundle`: `f25adebefb6563663fec681f4027e40a395bdced41ece691b6d4b8a8a8614758` (/tmp/goo-nonuat-2026-09-05/gpu/shaders/final-correctness/terminal_glass.goo-effect)
- `run_script`: `4f0d249769599814dcc5edff040b7a1b9f10bad795a2edac40fb80021f7f8255` (/tmp/goo-nonuat-2026-09-05/gpu/layers-off/run.sh)
- `loader_proof_log`: `2e0d7d8a8479d82732f2cbd576138fe6e5af3df9da4166638508d2ea9fed9e9d` (/tmp/goo-nonuat-2026-09-05/gpu/layers-off/results-v2/layer-proof/proof.log)

The control and candidate app DLL, PDB, and Goo DLL are byte-identical. Only path SPIR-V, shared clip-mask SPIR-V, and their manifest differ in the A/B runtime. Root reports the integrated ShaderGen check, vector quality, clip-mask, queue isolation, effect recovery, readback close, liquid alpha, Core 317/317, API 12/12, Release builds, and strict lint all passed before this timing run.
