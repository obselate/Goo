# ShaderEffect Authoring Audit

Date: 2026-08-24

Branch audited: `gaps-and-reductions`

Status: SEA-001 verified, SEA-002 compiler core qualified, SEA-004 compiler path verified,
build integration pending

## Result

Goo's internal renderer currently authors GLSL 450. The runtime consumes SPIR-V and is
source-language neutral, but the internal build generator, manifest, and include are hard-coded for
GLSL.

ShaderEffect authoring will use one pinned `slangc` build-time compiler path. Slang is the default
source language. The same adapter can accept HLSL and GLSL compatibility inputs because `slangc`
officially supports all three source languages. Every input must produce SPIR-V 1.6 and pass the same
Goo ABI reflection and validation gates.

Recommended source policy:

| Source | Goo today | ShaderEffect compiler | Disposition |
|---|---|---|---|
| Slang | Not supported by Goo | Pinned `slangc` direct SPIR-V target | Default authoring language |
| HLSL | Not supported by Goo | The same pinned `slangc` | Compatibility input |
| GLSL | Used by Goo's internal renderer | The same pinned `slangc` with `-allow-glsl` | Compatibility input only |
| SPIR-V | Accepted by `ShaderEffect` at runtime | Pinned `spirv-val` plus Goo reflection | Language-neutral artifact input |

Do not add separate `glslc` or DXC ShaderEffect adapters. A single compiler lock, invocation model,
diagnostic policy, and provenance shape is smaller and easier to reproduce. Keep Goo's existing
internal renderer shaders on the pinned `glslc` generator until a separate migration proves a benefit.

## Current Goo path

### Runtime

`Goo/Rendering/ShaderEffect.gs` accepts precompiled fragment SPIR-V as `[]uint8`. Construction checks:

- byte count and four-byte alignment
- SPIR-V magic
- SPIR-V version 1.0 through 1.6
- nonzero ID bound
- zero schema word

It does not reflect or validate:

- fragment stage and `main` entry point
- input and output locations
- descriptor sets, bindings, or descriptor kinds
- 128-byte push-constant layout
- required capabilities and extensions
- Goo's premultiplied linear output contract

The first complete native compatibility check therefore occurs when Vulkan creates the pipeline in
`Goo/Rendering/Vulkan/VulkanSharedPrimitiveState.gs`. An invalid but well-formed SPIR-V header can
survive `ShaderEffect` construction and fail later during rendering.

### GLSL authoring surface

`Goo/Shaders/Authoring/goo_effect.glsl` supplies the complete fixed ABI and asks the author to define:

```glsl
vec4 gooEffect(vec2 uv, vec4 source, vec4 backdrop);
```

The include owns source and backdrop sampling, primitive lookup, clip coverage, parameter storage,
coverage multiplication, and final output. The consumer effect owns only `gooEffect`.

The showcase compiles `apps/Goo.Showcase/Shaders/liquid_glass.frag.glsl` outside the app, copies the
SPIR-V sidecar to output, loads it with `File.ReadAllBytes`, and updates unnamed numeric parameter
slots with `ShaderEffect.SetParameter`.

### Internal generator

`tools/Goo.ShaderGen` is deterministic for Goo's production shaders, but it is not a general effect
compiler:

- `ValidateManifest` requires `target.language` to equal `glsl`.
- The compiler must be the exact pinned `glslc` build.
- Temporary sources always use the `.glsl` suffix.
- Compiler flags contain GLSL-specific `-std=450core`.
- The manifest must contain exactly 18 named shaders and 13 named pipelines.
- Every shader and pipeline identity is hard-coded in `Program.cs`.
- Generated artifacts are mirrored into Goo's production shader directory.

Do not expose this generator to consumers. Its production drift checks and Goo renderer manifest are a
different responsibility from compiling an application-owned effect.

## Fixed Goo effect ABI

All language adapters must produce SPIR-V with this exact reflected interface.

| Contract | Required value |
|---|---|
| Stage | Fragment |
| Entry point | `main` |
| Source input | Location 0, two-component floating-point UV |
| Clip draw ordinal | Location 2, flat unsigned integer |
| Primitive record ordinal | Location 3, flat unsigned integer |
| Output | Location 0, four-component floating-point color |
| Source texture | Set 0, binding 0, combined image sampler |
| Backdrop texture | Set 1, binding 0, combined image sampler |
| Primitive records | Set 2, binding 0, read-only storage buffer, 128-byte stride |
| Clip-mask atlas | Set 3, binding 0, combined 2D-array image sampler |
| Clip-chain words | Set 3, binding 1, read-only storage buffer |
| Parameters | Fragment push constants, eight `vec4` values, 128 bytes |
| Target | Vulkan 1.3, SPIR-V 1.6 |
| Color | Premultiplied linear output, source-over composition |

The reflected SPIR-V interface is authoritative. Source declarations and compiler-specific binding
syntax are not authoritative.

## Slang compiler adapter

Use `slangc` with its direct SPIR-V target. Slang officially supports Vulkan SPIR-V and SPIR-V 1.6
capability selection. Its command-line interface accepts `slang`, `hlsl`, and `glsl` source languages
and emits SPIR-V directly.

Provide a Goo effect module for native Slang source. Pin the exact compiler release, binary hashes,
target, capability, language standard, optimization mode, matrix layout, warning policy, and
diagnostic format. Select the source language explicitly instead of relying on file extension. Enable
`-allow-glsl` only for a GLSL compatibility input.

The selected lock is Slang 2026.16 at commit
`2c6ca521d2c38e7ab67c63293351bc88eb747340`. Linux x64 uses the official glibc 2.27 archive with
SHA-256 `b9c5e195ce9a7124147d47febe78b7f8c59c96829add50b0938bd04b8056fb88`. Windows x64 uses the
official archive with SHA-256 `7fa1e69d68706ed18cc679270bc3a2e4a3f7400d9f7bf393564fad3b3bc03e25`.

Slang provides modules, generics, interfaces, and HLSL-compatible syntax without changing Goo's
runtime. The compiler remains build-time only. Runtime and package outputs contain no Slang libraries.

## Language-neutral build pipeline

```text
Slang, HLSL, or GLSL source
  -> pinned slangc adapter
  -> SPIR-V 1.6
  -> spirv-val for Vulkan 1.3
  -> Goo effect ABI reflection
  -> capability and extension allowlist
  -> deterministic artifact manifest
  -> application output or package
```

The common post-compile stages must reject:

- wrong stage or entry point
- missing, extra, or wrong descriptor bindings
- wrong input or output locations and types
- wrong push-constant size, offsets, or types
- unapproved SPIR-V capabilities or extensions
- unsupported Vulkan feature requirements
- malformed SPIR-V
- compiler warnings
- output drift for the same pinned compiler, inputs, and flags

Runtime packages contain only validated SPIR-V and compact provenance. They do not contain compilers,
source parsers, reflection libraries, or validation layers.

## Smallest useful implementation

### SEA-001: language-neutral effect validator

Status: Verified

Build a separate effect tool that accepts an existing `.spv`, runs `spirv-val`, reflects the fixed Goo
effect ABI, checks the capability allowlist, and emits a small provenance manifest.

Implemented in `tools/Goo.ShaderEffectTool`. The tool provides:

```text
validate INPUT.spv OUTPUT.json
check INPUT.spv MANIFEST.json
selfcheck INPUT.spv
```

The validator requires pinned SPIRV-Tools 2026.3 from Vulkan SDK 1.4.357.0, Vulkan 1.3 validation,
SPIR-V 1.6, the exact five-descriptor Goo ABI, exact interface locations and types, the 128-byte
primitive record, the 128-byte parameter block, the 2D source and backdrop images, the 2D-array clip
image, and only the `Shader` and optional `ImageQuery` capabilities. Every SPIR-V extension is rejected
except promoted `SPV_KHR_storage_buffer_storage_class`, which native Slang emits for storage buffers.

The real Liquid Glass effect passes. The self-check rejects wrong stage, location, descriptor set,
descriptor binding, push layout, image shape, added capability, added extension, and malformed module
variants. Two independent manifest writes were byte-identical.

This closes the late-failure hole for artifacts passed through the tool without selecting a source
language or changing Goo's public runtime API. Direct `ShaderEffect` construction can still bypass the
build-time validator. The `GooShaderEffect` build item added by SEA-002 is the validated authoring path.

### SEA-002: Slang build adapter

Status: Compiler core and MSBuild integration verified, native Slang runtime pixel proof pending

Add native Slang source compilation through pinned `slangc`, then feed its output through SEA-001.
Integrate it as an opt-in build item and copy only the validated `.spv` and provenance to application
output.

This is the first complete ShaderEffect author workflow. Prove the Goo module with one reference
effect and deterministic output.

`tools/Goo.ShaderEffectTool compile` now accepts native `.slang` source, the Goo authoring root, a
SPIR-V output, and a provenance output. It verifies the exact compiler executable and runtime hashes,
uses explicit Slang 2026, SPIR-V 1.6, fragment stage, precise floating point, row-major layout, `-O2`,
strict capability checks, and warnings as errors, then passes the output through SEA-001. The packaged
`goo_effect.slang` module owns the same fixed ABI as the GLSL include and exposes `gooEffect` plus
indexed `gooParameter` access.

Two clean native Slang reference compilations produced identical SPIR-V and provenance bytes. The
output passed Vulkan 1.3 `spirv-val`, exact Goo ABI reflection, and the nine-case invalid-module
self-check. Slang emits `SPV_KHR_storage_buffer_storage_class`; the validator now allows only that
promoted storage-buffer extension while retaining rejection of every other extension.

The transitive Goo package target now accepts an opt-in `GooShaderEffect` item for `.slang` and
`.glsl` sources. It invokes the packaged build adapter, writes source-identity-isolated `.spv` and
provenance intermediates under `obj`, and registers both as normal build and publish content. The
default target path replaces the source extension with `.spv` while preserving its relative
directory; explicit `TargetPath` metadata overrides it. Incremental builds skip unchanged sources and
recompile when the source, Goo authoring module, or adapter changes. Clean removes generated
intermediates. The package contains the adapter and authoring modules but copies neither them nor the
external compiler toolchains into application output.

A clean external package consumer compiled a native Slang effect, copied only its requested SPIR-V
and provenance paths, published both, skipped an unchanged second compilation without modifying
either intermediate, recompiled after a source timestamp change, and failed its build on a Slang
source error. The Showcase now declares Liquid Glass through `GooShaderEffect` instead of a checked-in
SPIR-V content item.

### SEA-003: HLSL compatibility input

Accept explicit HLSL input through the same adapter. Prove the same ABI and pixel-equivalent output
without adding DXC or another build contract.

### SEA-004: GLSL compatibility input

Accept explicit GLSL input through the same adapter with `-allow-glsl`. This is a migration bridge, not
the recommended authoring language. Prove the same ABI and pixel-equivalent output.

Status: Compiler, ABI, and Showcase runtime paths verified

`tools/Goo.ShaderEffectTool compile` accepts `.glsl`, selects the packaged `goo_effect.glsl` module,
enables `-allow-glsl`, and omits the Slang 2026 language standard used only for native Slang source.
The shared reflection gate accepts Slang's transparent one-member push-constant wrapper only when it
contains one fixed array at offset zero with a tightly matched SPIR-V `ArrayStride`. Arbitrary nested
push-constant structs remain rejected.

`compilecheck SOURCE AUTHORING_ROOT` performs two clean compilations, requires byte-identical SPIR-V
and provenance manifests, validates the exact Goo ABI, and runs the nine invalid-module rejection
cases. Liquid Glass passes this gate as GLSL. Goo's 18 internal renderer shaders remain on the pinned
`glslc` generator. The compatibility audit found that Slang 2026.16 does not preserve the uniform
texel-buffer ABI for the two HarfBuzz fragment inputs, so internal renderer migration remains excluded.

The Slang-produced Liquid Glass SPIR-V also passed the full Showcase smoke under isolated KWin
Wayland, including interactions, resize clamps, 320-frame stability, and deferred close.

## Deliberate exclusions

- runtime shader compilation
- runtime SPIR-V reflection
- exposing Vulkan handles or descriptor layouts publicly
- a shader graph or material graph
- translating one shader source language into another
- converting all built-in Goo shaders to HLSL or Slang
- bundling any compiler toolchain in the Goo runtime package
- generating G# effect wrapper classes before repeated application code proves the need
- automatic parameter packing beyond the fixed eight `Vector4` slots
- development hot reload in the first implementation

## Acceptance gates

| Gate | Required evidence |
|---|---|
| Determinism | Two clean builds with one pinned adapter produce identical SPIR-V and manifest bytes |
| ABI | Reflection exactly matches every fixed Goo effect field |
| Rejection | Wrong binding, location, stage, push size, capability, and malformed SPIR-V fail at build time |
| Output | One reference effect has exact accepted pixels through each implemented source adapter |
| Lifecycle | Resize, DPI, close, surface loss, and device loss retain current cleanup behavior |
| Performance | No change to warm frame allocation, Vulkan object creation, GPU work, or frame timing |
| Packaging | NativeAOT and package output contain SPIR-V and provenance only |
| Toolchain | Compiler and validator versions and hashes match the adapter lock |

Do not add separate runtime tests for compiler parser behavior. Use deterministic build checks, ABI
rejection fixtures, one cross-language pixel corpus, and the existing ShaderEffect lifecycle route.

## Official toolchain sources

- Shaderc states that `glslc` compiles GLSL and HLSL to SPIR-V, and that its HLSL ability is deprecated:
  <https://github.com/google/shaderc>
- DXC supports HLSL to Vulkan SPIR-V and documents its Vulkan mapping and options:
  <https://github.com/microsoft/DirectXShaderCompiler>
- Slang documents direct SPIR-V compilation and target selection:
  <https://github.com/shader-slang/slang/blob/master/docs/user-guide/08-compiling.md>
- The `slangc` command reference lists Slang, HLSL, and GLSL input languages, direct SPIR-V output,
  SPIR-V 1.6 capability selection, warning controls, and the explicit GLSL opt-in:
  <https://github.com/shader-slang/slang/blob/master/docs/command-line-slangc-reference.md>
- Slang documents SPIR-V-specific behavior and stable SPIR-V 1.3 or later support:
  <https://github.com/shader-slang/slang/blob/master/docs/user-guide/a2-01-spirv-target-specific.md>

## Decision

Use native Slang as Goo's default ShaderEffect authoring language. Use one pinned `slangc` adapter for
Slang, HLSL, and GLSL inputs, with explicit language selection and a shared validated SPIR-V boundary.
Do not implement a GLSL-first adapter or a separate DXC adapter. Keep the internal renderer's existing
GLSL and `glslc` path unchanged.
