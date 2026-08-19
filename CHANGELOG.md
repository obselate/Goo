# Changelog

## Unreleased

### Changed

- Goo core now targets the pinned G# 0.4.1 SDK and uses direct Vulkan 1.3
  rendering through the SDL3 Wayland host. Yoga remains the layout engine, and
  Goo-owned production code remains G#.
- The text path now uses the private HarfBuzz 14.3.1/hb-gpu payload and generated
  Unicode data for shaping, fallback, segmentation, line breaking, and text
  geometry.
- S09R-S11 Linux work now covers typed primitives, transforms and clips,
  gradients and borders, retained image and text resources, registered-font
  fallback, editor and IME geometry, color text, multi-atlas residency and
  eviction, and device-generation recovery.

### Verification

- Current Linux x64 native Wayland qualification passes the fresh-package
  window, resize, resource, text, provider-ABI, atlas, and recovery smoke
  lanes with warnings treated as errors.
- Focused Vulkan proof lanes cover text shaping, color glyphs, sharp text
  effects, shader assets, and warm-path allocation checks.

### Deferred

- Windows runtime qualification remains pending.
- Inline and block editor slots, blurred text shadows, COLR effects, and
  product-level asynchronous pixel readback remain deferred to later stages.

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
