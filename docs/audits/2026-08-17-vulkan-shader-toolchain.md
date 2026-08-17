# Vulkan shader toolchain audit

Status: shader-toolchain and S08 shader artifact closure implemented and verified on Linux on 2026-08-17. Windows runtime qualification is deferred until a Windows 11 VM is available.

The build-only tool is `tools/Goo.ShaderGen`. It has no project reference from Goo core, no runtime compiler, and no runtime package. It emits checked-in SPIR-V and a deterministic manifest for the S08 runtime to consume later.

## Pinned toolchain

- Vulkan SDK: `1.4.357.0`.
- Compiler: Google Shaderc `v2026.3`, commit `ef2c68b4871a3c399a0808321b51379847a54673`, executable `glslc`.
- Front end: KhronosGroup glslang `16.4.0`, commit `168d452a4f460d24b588fed08477a81c44ee27a1`.
- Validator: KhronosGroup SPIRV-Tools `2026.3`, commit `b707790a898e44038547df54580022fc1cf89c3d`, executable `spirv-val`.
- SPIR-V headers: KhronosGroup SPIRV-Headers, SDK `1.4.357.0` commit `29981f65241605e08b0ede4cfeb999fe3b723c6a`.
- Vulkan registry: KhronosGroup Vulkan-Headers, SDK `1.4.357.0` commit `e3b1eec08173d6b825cd3ac88c885a63b621504a1`, `vk.xml` SHA-256 `264d0d7350e37d70c82407fb430d085040fc01a9a961d43dec8c2d6ed1dfd183`.

The SDK archives and exact SHA-256 values are recorded in the source manifest:

| RID | Archive | SHA-256 |
| --- | --- | --- |
| linux-x64 | `vulkansdk-linux-x86_64-1.4.357.0.tar.xz` | `0f09bf6a0625e346bf004be70b92907e934a4c76606b323441b2baf3a5a0e66d` |
| win-x64 | `vulkansdk-windows-X64-1.4.357.0.exe` | `81f474711e9042f4cd22b31b2f7a8870db2e428b21586fb43dd80150be97310d` |

## Compile contract

Sources are GLSL `450 core`. Each stage is passed an explicit stage flag. The exact compiler flags are:

```text
--target-env=vulkan1.3 --target-spv=spv1.6 -std=450core -O -Werror -fshader-stage=<vertex|fragment>
```

Validation uses:

```text
spirv-val --target-env vulkan1.3 <generated.spv>
```

The shaders are a solid quad with no vertex input. The vertex stage uses six `gl_VertexIndex` vertices. The final SPIR-V is reflected during generation and checking. The accepted contract is one `main` entry point with the manifest stage, capability `1` (`Shader`), zero descriptors, exact interface locations and types, and the declared push-constant layout:

- Vertex: no inputs, location `0` `vec4` output, push constants at offset `0`, size `32`.
- Fragment: location `0` `vec4` input, location `0` `vec4` output, no push constants.
- Both modules: SPIR-V `1.6`, capability `1`, descriptor count `0`.

The push-constant members are:

| Member | Type | Offset |
| --- | --- | ---: |
| `rect` | `vec4` | 0 |
| `color` | `vec4` | 16 |

`rect` is `(x, y, width, height)` in NDC. The vertex output and fragment input both use location `0` and type `vec4`. The fragment output uses location `0` and type `vec4`.

## Deterministic layout and hashes

Source files use LF line endings and are stored under `proofs/Goo.VulkanProof/Shaders`:

| File | SHA-256 |
| --- | --- |
| `solid_quad.vert.glsl` | `8036438d2d1ef522d23ef8f2121d2db8e7019546ed094841f98cbb073df95ddd` |
| `solid_quad.frag.glsl` | `e97231f17ab1e568bd56de7d9f0465097c618628ce4c728af096dd77e4c30c3a` |

Generated binaries and the generated manifest are under `proofs/Goo.VulkanProof/Generated/Shaders`:

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| `solid_quad.vert.spv` | 1232 | `1b06771f89e2a446dff2ad8cc26b5b4a1d3d2b7b6f658d07f32c3aeaae12dd66` |
| `solid_quad.frag.spv` | 312 | `0a3563abcb74db08a7263045b7fa23462249ed069cd7289b80c96812ef1db500` |
| `SolidQuadPushConstants.Generated.gs` | 476 | `801ed20e71cc24186daea9e0628253412ed04bb84d1613c8aa2e9b9d64d8b31d` |
| `shader-manifest.json` | 4248 | `db23f3c0b719bb234dd5439c80d9d1a2d48e30ba70234db2433a8fbee58c8657` |

The generated manifest stores source hashes, output hashes, output byte counts, toolchain pins, compile flags, capabilities, descriptor count, and the pipeline interface. It also stores the generated host-packing path, SHA-256, and byte count. `SolidQuadPushConstants.Generated.gs` is generated from the reflected member offsets, types, and size with explicit `FieldOffset` attributes. The generated directory is published transactionally as one artifact set. It is serialized with stable property order, two-space indentation, UTF-8, and a final LF. `.gitattributes` marks GLSL as LF text and SPIR-V as binary.

Reflection runs only in `Goo.ShaderGen` while compiling or checking artifacts. No runtime compiler, SPIR-V reflection dependency, or runtime package is introduced.

## Commands and evidence

Run from the repository root with the pinned SDK on `PATH` or through `VULKAN_SDK`:

```text
dotnet build tools/Goo.ShaderGen/Goo.ShaderGen.csproj -c Release --no-restore -p:WarnAsError=true
dotnet run --project tools/Goo.ShaderGen/Goo.ShaderGen.csproj -c Release --no-build -- generate
dotnet run --project tools/Goo.ShaderGen/Goo.ShaderGen.csproj -c Release --no-build -- check
spirv-val --target-env vulkan1.3 proofs/Goo.VulkanProof/Generated/Shaders/solid_quad.vert.spv
spirv-val --target-env vulkan1.3 proofs/Goo.VulkanProof/Generated/Shaders/solid_quad.frag.spv
dotnet build proofs/Goo.VulkanProof/Goo.VulkanProof.gsproj -c Release --no-restore -p:WarnAsError=true
git diff --check
```

The local executable evidence was:

```text
glslc --version
2026.3
1:1.4.357.0

spirv-val --version
SPIRV-Tools v2026.3 vulkan-sdk-1.4.357.0-0-g9a49b0883
```

The build completed with `0 Warning(s)` and `0 Error(s)`. `generate` completed for both shaders and published the SPIR-V, host packing, and manifest together. A second generation produced identical manifest and host-packing SHA-256 values. `check` regenerated both stages, reflected the final SPIR-V, compared the generated SPIR-V, host packing, and manifest byte-for-byte, and validated the checked-in binaries. Direct `spirv-val`, proof build, and `git diff --check` also completed successfully.

## Official sources

- [LunarG Vulkan SDK 1.4.357.0 configuration](https://vulkan.lunarg.com/sdk/config/1.4.357.0/linux/config.json)
- [LunarG Linux archive checksum](https://vulkan.lunarg.com/sdk/sha/1.4.357.0/linux/vulkan_sdk.tar.xz.json)
- [LunarG Windows archive checksum](https://vulkan.lunarg.com/sdk/sha/1.4.357.0/windows/vulkan_sdk.exe.json)
- [Shaderc pinned SDK commit](https://github.com/google/shaderc/commit/ef2c68b4871a3c399a0808321b51379847a54673)
- [Shaderc project](https://github.com/google/shaderc)
- [Glslang 16.4.0 release](https://github.com/KhronosGroup/glslang/releases/tag/16.4.0)
- [SPIRV-Tools SDK branch](https://github.com/KhronosGroup/SPIRV-Tools/tree/vulkan-sdk-1.4.357.0)
- [Vulkan version and SPIR-V support](https://docs.vulkan.org/guide/latest/versions.html)
