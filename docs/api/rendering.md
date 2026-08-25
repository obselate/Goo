# Rendering API

Generated from `Goo.xml`. Source declarations supply type ownership and XML-emitter omissions.

Source: [`Goo/Rendering`](../../Goo/Rendering)

## Apply fragment shaders to retained elements

Create one `ShaderEffect` from precompiled fragment SPIR-V and assign it through the ordinary `Style.ShaderEffect` property on a `Container`, `Button`, `Text`, `Image`, `Shape`, or another Blob. Goo renders that element and its subtree into a bounded offscreen layer, runs the fragment program, then composites the result without changing layout, hit testing, accessibility, transforms, or clipping.

```gsharp
import System
import System.IO
import System.Numerics
import Goo

let path = Path.Combine(AppContext.BaseDirectory, "Shaders", "glass.spv")
let effect = ShaderEffect(File.ReadAllBytes(path),
  samplesBackdrop: true,
  backdropOutset: 24.0F)
effect.SetParameter(0, Vector4(0.18F, 0.65F, 0.9F, 1.0F))

let control = Button{
  Width: 180,
  Height: 52,
  BorderRadius: 18,
  ShaderEffect: effect,
}
```

Reuse the same effect instance for controls that share program and parameters. `SetParameter` accepts slots 0 through 7, marks mounted users paint-dirty only when a value changes, and stays allocation-free after construction. Create separate effect instances when controls need independent parameter state.

Author ShaderEffects in native Slang by including Goo's fixed module and implementing `float4 gooEffect(float2 uv, float4 source, float4 backdrop)`. GLSL compatibility sources instead include `goo_effect.glsl` and implement the equivalent `vec4` function.

```slang
#include "goo_effect.slang"

float4 gooEffect(float2 uv, float4 source, float4 backdrop)
{
    return lerp(source, backdrop, gooParameter(0).x);
}
```

Add the source to the G# project:

```xml
<ItemGroup>
  <GooShaderEffect Include="Shaders/glass.slang" />
</ItemGroup>
```

Build requires the pinned Slang 2026.16 compiler through `SLANG_SDK` or `PATH` and SPIRV-Tools 2026.3 from Vulkan SDK 1.4.357.0 through `VULKAN_SDK` or `PATH`. Goo compiles and validates the source during the build, writes deterministic intermediates under `obj`, and copies `Shaders/glass.spv` plus `Shaders/glass.spv.json` provenance to build and publish output. Set `TargetPath` on `GooShaderEffect` to override the relative output path. Unchanged inputs skip compilation. Tool-version mismatches, compiler errors, validation errors, ABI mismatches, and unsupported capabilities fail the build.

The fixed ABI binds the isolated source at set 0, the optional backdrop at set 1, Goo primitive data at set 2, Goo clip data at set 3, and eight `vec4` values in a 128-byte fragment push block. `uv` is normalized to the visible element bounds. `source` and `backdrop` are premultiplied linear colors. Return premultiplied linear color. Goo applies retained clip coverage and element opacity after `gooEffect`. Set `backdropOutset` to the largest displacement or filter radius the shader needs beyond those bounds. When backdrop sampling is disabled, the backdrop argument aliases the source and Goo skips the target copy.

SPIR-V stays a sidecar asset in JIT and NativeAOT builds. Goo packages the build adapter, but neither the adapter, authoring modules, nor compiler toolchains are copied to application output. Goo does not invoke a runtime shader compiler. The first use creates a Vulkan pipeline in a device-generation cache. Warm parameter updates reuse that pipeline and the retained layer pool. One target format supports up to 32 distinct effect program identities per device generation. A non-normal `BlendMode` cannot currently share the same element with `ShaderEffect`.

## `CompiledVectorAsset`

Source:

- [`CompiledVector.Asset.gs`](../../Goo/Rendering/CompiledVector.Asset.gs)

Loads, caches, and renders a validated compiled vector asset.

### `new(System.Byte[])`

Creates an asset from compiled vector bytes.

### `Load(System.Byte[])`

Loads a compiled vector asset and throws when the bytes are invalid.

### `PathForNode(int32)`

Returns the cached path for one asset node.

### `Render`

Creates a retained display cell for this asset.

### `Render(string)`

Creates or updates a retained display cell using the supplied key.

### `TryLoad(System.Byte[])`

Loads a compiled vector asset and returns nil when the bytes are invalid.

### `ByteCount`

Gets the encoded asset byte count.

### `ClipCount`

Gets the number of clip paths.

### `ContourCount`

Gets the number of vector contours.

### `CurveCount`

Gets the number of vector curves.

### `Flags`

Gets the compiled asset flags.

### `KeyframeCount`

Gets the number of animation keyframes.

### `MorphCurveCount`

Gets the number of morph curves.

### `NodeCount`

Gets the number of vector nodes.

### `PaintCount`

Gets the number of paints.

### `StrokeCount`

Gets the number of strokes.

### `TrackCount`

Gets the number of animation tracks.

### `Version`

Gets the compiled asset format version.

### `ViewBoxHeight`

Gets the view box height.

### `ViewBoxWidth`

Gets the view box width.

### `ViewBoxX`

Gets the view box origin on the x axis.

### `ViewBoxY`

Gets the view box origin on the y axis.

## `ShaderEffect`

Source:

- [`ShaderEffect.gs`](../../Goo/Rendering/ShaderEffect.gs)

Owns one precompiled fragment SPIR-V program and its retained parameter state.

### `new(System.Byte[],bool)`

Creates a retained fragment effect from precompiled SPIR-V.

- `fragmentSpirv`: The complete fragment shader module bytes.
- `samplesBackdrop`: Whether Goo copies the existing target behind the element for shader sampling.

### `new(System.Byte[],bool,float32)`

Creates a retained fragment effect with bounded backdrop sampling beyond its visible bounds.

- `fragmentSpirv`: The complete fragment shader module bytes.
- `samplesBackdrop`: Whether Goo copies the existing target behind the element for shader sampling.
- `backdropOutset`: The finite nonnegative logical-pixel distance captured around the element, up to 256.

### `SetParameter(int32,System.Numerics.Vector4)`

Updates one retained shader parameter slot without allocating on the warm path.

- `slot`: The parameter slot from 0 through 7.
- `value`: The four finite parameter values.

Returns: True when the retained value changed.

## `TextAffinity`

Source:

- [`TextMetrics.gs`](../../Goo/Rendering/TextMetrics.gs)

Specifies the visual side of a text position at a directional boundary.

### Values

- `Upstream`
- `Downstream`
