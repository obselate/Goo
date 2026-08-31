# Changelog

## Unreleased

### Added

- Added four bounded, retained `ShaderEffectData` inputs with copy or ownership-transfer publication and shader authoring helpers.
- Added ownership-transfer construction for immutable `ImageSource` pixels with final-retirement callbacks.

## 0.3.0 - 2026-08-28

Goo 0.3.0 moves production rendering to Vulkan, broadens the Linux native ABI
to glibc 2.27, and qualifies Linux 6.6 or newer.

### Changed

- Replaced the Skia renderer with a direct Vulkan 1.3 renderer for Linux Wayland.
- Moved production hosting, text, images, paths, effects, windowing, diagnostics, and recovery into Goo-owned G# code.
- Added retained scene compilation, bounded GPU resource caches, damage tracking, asynchronous readback, and multi-window scheduling.
- Added native HarfBuzz shaping and GPU text paint with registered fonts, fallback, color glyphs, text editing, and IME geometry.
- Added retained images, vector paths, rounded clipping, borders, gradients, shadows, blend modes, scrolling, and draggable scrollbars.
- Lowered the Linux native ABI floor to glibc 2.27 and qualified Linux 6.6 or newer.
- Made Vulkan surface and swapchain maintenance extensions optional with an idle-safe compatibility path.

### Added

- Build-time SVG compilation into retained GCV1 vector assets.
- Build-time Slang and GLSL ShaderEffect compilation with deterministic SPIR-V validation.
- Package and NativeAOT verification for the public API, native libraries, shaders, and clean consumers.

### Verification

- Linux x64 passes public API, framework behavior, package, Vulkan validation, lifecycle, and performance checks.
- Accepted Linux evidence is summarized in [`docs/perf/linux-release-qualification.md`](docs/perf/linux-release-qualification.md).

### Pending

- Windows x64 runtime qualification.
- Linux integrated-GPU qualification.
- A second real display-scale qualification.

## 0.2.0 - 2026-08-07

### Changed

- SkiaSharp and SkiaSharp.HarfBuzz upgraded from 3.116.0 to 4.151.1, moving
  Skia from m116 to m151.
- HarfBuzzSharp and HarfBuzzSharp.NativeAssets.Linux upgraded from 8.3.1.1 to
  14.2.1.2, moving HarfBuzz from 8.3.1 to 14.2.1.
- Removed the SkiaSharp 3.x duplicate Linux native alias cleanup from
  `Goo.targets`; SkiaSharp 4.x ships a single canonical `libSkiaSharp.so`.
- Internal path construction migrated from the deprecated mutable `SKPath`
  API to `SKPathBuilder`, ahead of SkiaSharp removing its compatibility
  shim. Uniform solid borders and inset box shadows now paint through
  `SKCanvas.DrawRoundRectDifference`, making rounded solid borders about
  3x faster and removing the shim's per-paint allocation overhead. Public
  API is unchanged.

## 0.1.0 - 2026-08-07

Goo 0.1.0 is the first public release of the retained, declarative UI framework
for G# and .NET 10.

### Included

- Declarative Blob trees with keyed Cell invalidation and retained reconciliation.
- Yoga layout, Skia rendering, shapes, images, text, and style transitions.
- Keyboard, pointer, focus, scroll, clipboard, and generic text or IME input.
- Stable element handles, accessibility semantics, and a UI-thread dispatcher.
- Passive styled text and a retained multiline text editor.
- XML documentation and generated per-area API reference pages.

### Release constraints

- The supported platform is `linux-x64` with glibc 2.35 or newer on a native
  Wayland session. X11 and XWayland are not supported.
- Windows, macOS, and Linux ARM64 are not supported by 0.1.0.
- Custom IME candidate presentation is application-owned in 0.1.0.

### Compatibility

- Target framework: .NET 10.
- G# SDK: 0.3.633.
- Package version: 0.1.0.
- License: MIT.
