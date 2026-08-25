# Goo LAVA + Liquid Glass

LAVA is a full-window Vulkan field with shader-backed controls. Primary-drag the field to orbit it. Use the glass toggle group, REROLL button, COLOR switch, and REFRACT slider. The controls sample and distort the live Vulkan backdrop through one shared precompiled fragment shader.

The project compiles `Shaders/liquid_glass.frag.glsl` through the `GooShaderEffect` MSBuild item. The build requires Slang 2026.16 and SPIRV-Tools 2026.3 from Vulkan SDK 1.4.357.0 on `PATH`, or through `SLANG_SDK` and `VULKAN_SDK`.

```sh
dotnet run --project apps/Goo.Showcase/Goo.Showcase.gsproj -c Release
```

```sh
GOO_SHOWCASE_SMOKE=1 dotnet run --project apps/Goo.Showcase/Goo.Showcase.gsproj -c Release
```
