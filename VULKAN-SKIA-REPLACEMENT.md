# Replacing Skia with Vulkan in Goo

Status: evidence draft for review

Date: 2026-08-16

Branch: `gaps-and-reductions`

Purpose: determine what Goo loses when Skia is removed, what Vulkan replaces directly, and what
additional subsystems are required. This document does not select the renderer command model,
repaint strategy, binding, font stack, codec stack, or implementation schedule.

Preferred outcome: Vulkan without Skia. Skia removal is not approved until the loss and replacement
inventory is accepted.

GPUI is a reference only. It is not a guide, dependency, or target architecture.

## Direct answer

Vulkan can replace Skia's GPU backend. It cannot replace Skia's 2D engine by itself.

Vulkan directly provides GPU devices, queues, buffers, images, samplers, shaders, rasterization,
compute, fixed-function blending, scissor, stencil, multisampling, offscreen targets,
synchronization, copies, and presentation.

Skia currently provides the higher-level services built on top of those facilities: canvas state,
paths, stroke expansion, path boolean operations, clipping semantics, text and font integration,
glyph drawing, image decoding, gradients, shadows, blur, opacity groups, advanced blends, offscreen
color conversion, CPU raster diagnostics, resource caching, and native object lifetime.

Removing Skia is feasible without changing declarative Goo. It means Goo must become the 2D engine
and must use narrowly chosen font and image services where Vulkan has no answer.

## Current Skia reach

The production source currently contains:

| Measurement | Current result |
|---|---:|
| Production files referencing Skia | 24 |
| Unique `SK*` symbols | 44 |
| Total `SK*` references | 534 |
| Lines in files with direct Skia use | 6,480 |
| Raw Linux x64 `libSkiaSharp.so` package asset | 11,783,800 bytes |
| Raw Windows x64 `libSkiaSharp.dll` package asset available in the local cache | 12,272,440 bytes |
| Raw Linux x64 HarfBuzz native asset | 2,935,200 bytes |
| Raw Windows x64 HarfBuzz native asset available in the local cache | 2,038,072 bytes |

The file count is not the replacement size. Many files contain reusable Goo behavior mixed with
Skia types. The native file sizes are raw package assets, not final stripped RID output.

## What Vulkan can offer Goo

| Capability | What it enables | Limit |
|---|---|---|
| Explicit devices, queues, and command buffers | One shared process GPU runtime, controlled submission, and per-window scheduling | Goo owns every synchronization and recovery rule |
| Buffers and images | Persistent geometry, atlases, upload-only-when-dirty resources, offscreen layers, readback | Goo owns allocation, lifetime, eviction, barriers, and image layouts |
| Graphics and compute shaders | Analytic UI primitives, gradients, masks, blur, compositing, path experiments | Vulkan supplies no UI algorithms or semantics |
| Fixed-function rasterization | Triangles, stencil, scissor, depth, standard source-over blending, MSAA | Curves, strokes, path AA, rounded clips, and advanced blends are not automatic |
| Samplers and mipmaps | Image and glyph atlas sampling, anisotropy where supported | Decode, premultiplication, color conversion, and cache policy remain external |
| Dynamic rendering | Simpler attachment setup for UI passes | It does not create a canvas, scene, or retained renderer |
| Timestamp queries | Direct GPU stage measurement | Queue timestamp support must be queried |
| Memory heap visibility | Explicit allocation accounting | `VK_EXT_memory_budget` is optional and advisory |
| Incremental-present hints | The compositor may skip unchanged presentation regions | It is optional, it does not avoid rendering, and it still requires valid retained image contents |
| Device and surface errors | Explicit out-of-date, surface-loss, and device-loss reporting | Vulkan does not recover the renderer or rebuild resources |

These are opportunities, not automatic wins. Direct Vulkan can remove Skia wrapper churn and allow
more persistent GPU data, but Goo must prove total frame, memory, startup, and binary improvements.

## What Vulkan does not provide

| Missing service | Required replacement |
|---|---|
| Canvas save and restore stack | Goo-owned state traversal or command representation |
| Paths, arcs, fill rules, and curve flattening | Goo geometry or a path library |
| Stroke expansion, joins, caps, miter, dashes, and corner effects | Goo geometry or a path library |
| Path union, difference, offset, and containment | CPU path algebra and hit-test geometry |
| Font discovery and fallback | Cross-platform font catalog or platform adapters |
| Text shaping and bidi | Keep Goo layout and `Unicode.Bidi`, then use HarfBuzz directly or another shaper |
| Glyph rasterization and hinting | FreeType, DirectWrite, another scaler, or Goo GPU outline rendering |
| Color emoji rendering | Bitmap, COLR, SVG, and paint-graph handling |
| Image decoding and encoding | Application-supplied pixels or selected codecs |
| SVG parsing and rendering | Precompiled assets or an optional static SVG service |
| Shadows, blur, and filters | Goo shader and offscreen-pass implementations |
| Group opacity | Isolated offscreen layer and composite pass |
| Advanced blend modes | Shader composites or optional device features with a portable fallback |
| CPU raster fallback | Separate CPU renderer or removal of that diagnostic contract |
| Layout, invalidation, culling, and virtualization | Existing Goo systems, not renderer services |

## Exact responsibility map

### GPU target, surface, and presentation

Current Skia ownership:

- `Goo.InternalTextInterop/SdlRenderTarget.cs` exposes an `SKCanvas` target.
- `SdlGpuRenderTarget` owns `GRGlInterface`, `GRContext`, `GRBackendRenderTarget`, and `SKSurface`.
- Resize rebuilds the Skia target and linear color-space surface.
- Flush uses the Ganesh context. Presentation uses the SDL OpenGL swap.
- `WaylandShmRasterTarget.cs` uses a CPU Skia surface and converts linear RGBA16 to sRGB BGRA8.

Vulkan replacement:

- SDL supplies required instance extensions, loader access, surface creation, and presentation
  support queries.
- Goo owns the Vulkan instance, device, queues, surface, swapchain, image views, frame resources,
  command buffers, semaphores, fences, resize, presentation, and failure policy.
- Vulkan does not replace the Wayland SHM CPU raster target. That path needs a separate decision.

Risk: medium. This is substantial lifecycle work, but it is a bounded and well-specified problem.

### Canvas state, transforms, culling, clips, opacity, and blends

Current Skia ownership:

- `Goo/Rendering/Painter.gs` depends on canvas save and restore, local clip bounds, transforms,
  `SaveLayer`, and 15 non-normal blend modes.
- Rect, rounded-rect, path, axis, and difference clips are mixed with Goo culling rules.
- Opacity applies to a complete node and child group, not to individual draw colors.

Vulkan replacement:

- Rectangular clips use scissor.
- Rounded and arbitrary clips need analytic coverage, stencil, alpha masks, or offscreen images.
- Group opacity needs an isolated image and one composite.
- Source-over and simple factors use core blending.
- Multiply, screen, overlay, HSL modes, and other advanced operations need shader composites or the
  optional `VK_EXT_blend_operation_advanced` with a portable fallback.
- Goo retains its CPU traversal, transforms, clip bounds, and culling semantics.

Risk: high because nested clips, group boundaries, advanced blends, and antialiasing interact.

### Boxes, borders, gradients, and shadows

Current Skia ownership:

- `Painter.Box.gs` draws per-edge colors and widths, four radii, solid, dotted, and dashed borders,
  outlines, fills, images, outer shadows, and inset shadows.
- `GradientSkia.gs` builds linear and radial multi-stop shaders.
- `SKMaskFilter` supplies blur.

Vulkan replacement:

- Instanced analytic quads can cover solid boxes, four radii, per-edge borders, and common outlines.
- Fragment shaders or a small stop texture can cover linear and radial multi-stop gradients.
- Rounded-rectangle shadows can use an analytic distance shader.
- Arbitrary and inset shadows need masks plus blur and composite passes.
- Dotted and dashed borders need geometry or shader phase rules.

Risk: medium for normal Hivemind boxes. High for complete CSS-like parity.

### Arbitrary paths and CPU geometry

Current Skia ownership:

- `VectorPathSkia.gs` converts Goo line, quadratic, cubic, arc, and close commands to `SKPath`.
- `ShapeGeometry.gs` uses fill rules, `SKPaint.GetFillPath`, stroke expansion, corner and dash path
  effects, path union and difference, transformed caches, silhouettes, negative spread, and inset
  shadow geometry.
- `ClipPathGeometry.gs` and input hit testing use CPU path containment.

Vulkan replacement:

- Common UI primitives should avoid path tessellation and use analytic shaders.
- Public arbitrary `VectorPath` still requires curve flattening, fill tessellation, stroke
  expansion, fill rules, joins, caps, miter, dashes, corner effects, path algebra, and CPU hit tests.
- Vulkan can render the resulting triangles or masks. It provides none of the geometry production.
- Candidate helpers include Lyon through a native boundary, smaller polygon tessellators, or
  Goo-owned algorithms. No candidate is selected.

Risk: very high. This is the hardest non-text Skia replacement.

### Text and fonts

Reusable Goo behavior:

- Bidi paragraph resolution and visual runs.
- Grapheme-aware letter spacing and line breaking.
- Text wrapping, trimming, alignment, editing, selection, caret, and hit-test geometry.
- Shaped-run caches and public text APIs.

Current Skia ownership:

- `TextShaping.cs` uses `SKFontManager`, `SKTypeface`, `SKFont`, font metrics, family matching,
  per-grapheme fallback, and `SKShaper`.
- `ShapedRun.cs` owns positioned glyphs, `SKTextBlob`, ink bounds, fonts, and typeface lifetime.
- Painting uses `SKCanvas.DrawText` plus Skia stroke, shadow, and clip behavior.

Vulkan replacement:

- Keep `Unicode.Bidi` and the reusable Goo text layout.
- HarfBuzz can produce glyph IDs, clusters, advances, and offsets. It does not provide font
  discovery, fallback, paragraph layout, or ordinary hinted rasterization.
- A font system must provide face discovery, metrics, fallback, variable-font selection, glyph
  extents, and glyph rasterization.
- The normal fast path is glyph masks or color glyphs in bounded Vulkan atlases.
- FreeType is the main cross-platform rasterizer candidate.
- Windows DirectWrite is a font-discovery and color-font candidate, but it creates a platform split.
- Color emoji needs explicit bitmap, COLR, SVG, and paint-graph policy.

Risk: very high. Font fallback, low-DPI hinting, color emoji, caret geometry, and lifetime are the
largest visual and behavioral risks.

### Images and codecs

Reusable Goo behavior:

- `ImageSourceProvider`, immutable premultiplied RGBA ownership, async completion, leases, fit, and
  invalidation.
- Decode worker and byte-budget ideas can remain if built-in path decoding remains.

Current Skia ownership:

- `SKData` and `SKImage.FromEncodedData` decode file paths.
- `SKImage` owns decoded pixels and GPU upload.
- Skia supplies Mitchell cubic magnification and 16-tap minification sampling.

Vulkan replacement:

- `VkImage`, staging buffers, samplers, mipmaps, and shaders replace upload and sampling.
- Vulkan has no file decoder, encoder, EXIF handling, animation, or ICC management.
- Goo already lets applications supply premultiplied RGBA through `ImageSourceProvider`. General
  codecs do not automatically belong in Goo core.
- Hivemind currently accepts PNG, JPEG, GIF, and BMP chat images and owns SVG assets. Its real asset
  and hostile-input requirements must determine codecs.
- Wuffs, stb, resvg, managed libraries, or application-owned decoding remain candidates. None is
  selected.

Risk: low if Goo core accepts decoded pixels only. Medium to high if core preserves general path
decoding, animated images, SVG, and untrusted attachments.

### Offscreen rendering, readback, color, and diagnostics

Current Skia ownership:

- `Painter.RenderOffscreen` creates a linear surface, paints, snapshots, converts to sRGB, and
  returns an image. In this checkout it is test-oriented, not dead.
- The live GPU and raster paths use linear color-space surfaces.
- Rendering fixtures use Skia bitmaps and recorders for pixel inspection.
- External Goo tools use internal `PaintTo(SKCanvas)` and Skia PNG encoding.

Vulkan replacement:

- Offscreen `VkImage` targets, explicit resolve, copies, row handling, mapped readback, and color
  conversion.
- PNG or other output requires an encoder outside Vulkan.
- Test capture must move to backend-neutral pixels rather than Skia objects.
- A CPU raster diagnostic renderer remains a separate decision.

Risk: medium for screenshots. High for exact linear-light and antialias parity across all targets.

## Hardest losses in order

1. Font discovery, fallback, hinting, glyph rasterization, ink bounds, and color emoji.
2. Stroke expansion, path effects, boolean path operations, antialiased path clips, and CPU hit tests.
3. Group opacity and 15 advanced blend modes.
4. Arbitrary outer and inset shadows, blur, and nested masks.
5. Exact linear-light blending, sRGB output conversion, and cross-target pixel consistency.
6. General image decoding, SVG, encoding, and hostile-input policy if Goo keeps those services.
7. CPU raster diagnostics and current Skia-based capture tools.

Drawing solid boxes, rounded boxes, images, ordinary glyph atlas quads, and simple gradients is not
the risky part.

## Candidate replacement stack

This is a candidate list for the decision process, not a selected architecture.

| Subsystem | Candidate | Current disposition |
|---|---|---|
| Window and input | SDL3 | Keep. Use its Vulkan WSI boundary |
| Layout | Yoga | Keep |
| Bidi | `Unicode.Bidi` | Keep |
| Text shaping | HarfBuzz | Keep, but remove the Skia adapter if Skia leaves |
| Font rasterization | FreeType | Leading cross-platform candidate |
| Windows font catalog | DirectWrite adapter or Goo file catalog | Open |
| Linux font catalog | Fontconfig or Goo file catalog | Open |
| Vulkan allocation | Vulkan Memory Allocator or narrow Goo allocator | Open |
| Path tessellation | Lyon, smaller polygon tools, or Goo implementation | Open |
| Image input | Application-supplied `ImageSourceProvider` first | Existing and smallest core |
| Untrusted codecs | Wuffs or another maintained decoder | Open after format audit |
| Trusted small assets and PNG output | stb or another narrow codec | Open |
| Static SVG | Precompile assets or optional resvg service | Open |

### Poor foundations for the live renderer

| Candidate | Reason |
|---|---|
| GPUI | Reference framework only. Its architecture and platform choices are not Goo requirements |
| Vello | Alpha, Rust and WGPU stack, compute requirement, open blur, memory, and glyph-cache work |
| ThorVG GPU | Uses WebGPU rather than a direct Vulkan ownership model |
| vkvg | Vulkan and C are attractive, but the project calls itself alpha and still exposes incomplete optimization and effect work |
| resvg or tiny-skia | Useful static SVG CPU path, not a live Vulkan UI renderer |
| SDL GPU | Cross-platform abstraction rather than direct Vulkan control. Still open only if direct ownership loses a measured gate |

## Expected gains if Skia is removed

Potential gains:

- Remove the 11.78 MB raw Linux x64 and 12.27 MB raw Windows x64 native Skia package assets before
  replacement dependency costs.
- Remove SkiaSharp managed bindings and native wrapper allocation from the live hot path.
- Own primitive batching, persistent resources, upload policy, cache byte budgets, and frame
  scheduling.
- Use analytic shaders for common UI shapes rather than general path construction.
- Measure GPU work directly with Vulkan queries.
- Avoid paying for Skia features Goo does not expose.

Costs and risks:

- Goo owns a graphics engine, not only a backend.
- Replacement font, codec, allocator, and path dependencies reduce the binary saving.
- Driver validation, synchronization, memory, device loss, and platform qualification become Goo
  responsibilities.
- Visual parity will take deliberate work, especially text, paths, blends, color, and shadows.
- Source size and maintenance burden will increase even if the installed binary shrinks.

No performance or binary improvement is accepted until measured in final RID output and real
Hivemind workloads.

## Replacement proof before commitment

Use one fixed proof scene with:

- Four-radius boxes and per-edge solid, dotted, and dashed borders.
- Multi-stop linear and radial gradients.
- Outer and inset box shadows.
- Arbitrary filled and stroked paths with both fill rules, joins, caps, dashes, corners, and shadows.
- Rect, rounded, path, nested, and difference clips.
- Group opacity and all public blend modes.
- Inter, system fallback, CJK, RTL, combining marks, ligatures, variable weights, selection, caret,
  monochrome text, and color emoji.
- PNG, JPEG, GIF, BMP, RGBA provider images, fit modes, magnification, and minification.
- Transform, offscreen render, screenshot readback, transparent window, and required DPI scales.

Report exact feature coverage, fallback use, pixel differences, P50 and P95 total frame time, CPU
time, GPU time, allocation, RSS, private dirty memory, GPU memory, upload bytes, startup, input
latency, and final RID contents on Windows and Linux.

This is one end-to-end proof corpus, not one test per feature.

## Decision now resolved

Preferred target: remove Skia from the live Vulkan renderer if the replacement proof passes.

Not resolved:

- Whether Skia remains a temporary oracle or diagnostic during development.
- Which font rasterizer and discovery model replaces Skia.
- Which path geometry implementation replaces Skia PathOps and stroke expansion.
- Whether Goo keeps any built-in file decoders.
- Whether a CPU raster path remains a product requirement.
- The internal renderer command model.
- The final repaint and retained-resource strategy.
- The Vulkan binding and allocator choices.

## Q&A order after this inventory

1. Skia transition and removal gate.
2. Text and font stack.
3. Path geometry and hit testing.
4. Image codecs and SVG ownership.
5. CPU raster diagnostics.
6. Internal renderer command boundary.
7. Dirty-frame and retained-resource model.
8. Vulkan binding and allocation.
9. Multi-window GPU ownership and recovery.
10. Quantitative adoption gates.

## Primary sources

- Vulkan rendering and pipelines: <https://docs.vulkan.org/spec/latest/chapters/pipelines.html>
- Vulkan fragment operations: <https://docs.vulkan.org/spec/latest/chapters/fragops.html>
- Vulkan resources: <https://docs.vulkan.org/spec/latest/chapters/resources.html>
- Vulkan synchronization: <https://docs.vulkan.org/spec/latest/chapters/synchronization.html>
- Vulkan WSI: <https://docs.vulkan.org/spec/latest/chapters/VK_KHR_surface/wsi.html>
- Vulkan advanced blending: <https://docs.vulkan.org/refpages/latest/refpages/source/VK_EXT_blend_operation_advanced.html>
- Vulkan incremental present: <https://docs.vulkan.org/refpages/latest/refpages/source/VK_KHR_incremental_present.html>
- Vulkan memory budget: <https://docs.vulkan.org/refpages/latest/refpages/source/VK_EXT_memory_budget.html>
- SDL3 Vulkan boundary: <https://wiki.libsdl.org/SDL3/CategoryVulkan>
- HarfBuzz shaping and rendering boundary: <https://harfbuzz.github.io/glyphs-and-rendering.html>
- FreeType glyph retrieval and color behavior: <https://freetype.org/freetype2/docs/reference/ft2-glyph_retrieval.html>
- FreeType color glyph layers: <https://freetype.org/freetype2/docs/reference/ft2-layer_management.html>
- Vello project status: <https://github.com/linebender/vello>
- ThorVG project and backends: <https://github.com/thorvg/thorvg>
- vkvg project status: <https://github.com/jpbruyere/vkvg>
- resvg project status: <https://github.com/linebender/resvg>
- Wuffs project status: <https://github.com/google/wuffs>
