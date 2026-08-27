# Tests

Goo keeps a small set of focused projects. Each project owns one kind of evidence and can run independently from a clean checkout.

## Fast checks

Public API and documentation:

```sh
dotnet test tests/Goo.ApiContractTests/Goo.ApiContractTests.csproj -c Release
```

Framework behavior and allocation contracts:

```sh
dotnet test tests/Goo.CoreBehaviorTests/Goo.CoreBehaviorTests.csproj -c Release
```

Vulkan ABI and data-layout checks:

```sh
dotnet build tests/Goo.VulkanAbiSmoke/Goo.VulkanAbiSmoke.csproj -c Release
dotnet tests/Goo.VulkanAbiSmoke/bin/Release/net10.0/Goo.VulkanAbiSmoke.dll
```

Shader and text proof build:

```sh
dotnet build tests/Goo.VulkanProof/Goo.VulkanProof.gsproj -c Release
```

## Project map

| Project | Purpose |
| --- | --- |
| `Goo.ApiContractTests` | Approved public API and generated XML documentation |
| `Goo.CoreBehaviorTests` | Cells, reconciliation, layout, style, motion, input, text, accessibility, and allocation behavior |
| `Goo.VulkanAbiSmoke` | Vulkan bindings, text-provider ABI, retained path encoding, and upload contracts |
| `Goo.AsyncReadbackSmoke` | Vulkan pixels, clipping, effects, input, pacing, windowing, and performance workloads |
| `Goo.FailedIdleSmoke` | Multi-window lifecycle, surface loss, device loss, recovery, and terminal failure behavior |
| `Goo.PackageSmoke` | Clean NuGet consumer, packaged native assets, and public runtime behavior |
| `Goo.VulkanProof` | Low-level shader, text, image, path, and readback proofs |

## Native requirements

Windowed Vulkan checks require:

- Linux x64
- A Wayland compositor
- Vulkan 1.3
- `VK_EXT_surface_maintenance1` or its KHR equivalent
- `VK_EXT_swapchain_maintenance1` or its KHR equivalent
- Khronos validation layers for validation runs

The hosted CI runner uses software Vulkan for portable proof lanes. Hardware lifecycle and performance qualification runs separately on supported devices.

## Package verification

The complete package flow is defined in [`.github/workflows/ci.yml`](../.github/workflows/ci.yml). It:

1. Builds a glibc-compatible SDL3 library.
2. Builds Goo and verification projects with warnings as errors.
3. Runs portable Vulkan proofs.
4. Runs API and behavior tests.
5. Packs Goo and the SVG compiler.
6. Publishes a clean package consumer.
7. Validates native dependencies, checksums, and the bundle size limit.

That workflow is the authoritative source for native environment variables and exact release commands.

## Evidence rules

- Run Release builds with warnings treated as errors.
- Use a clean package cache for package-consumer checks.
- Enable Khronos validation for Vulkan correctness claims.
- Do not describe software Vulkan results as hardware performance evidence.
- Record hardware, driver, runtime, warmup, and sample counts for performance results.
