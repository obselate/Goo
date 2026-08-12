# Changelog

## Unreleased

### Added

- Added an opt-in `Window.Renderer` raster backend for NativeAOT, diagnostics,
  and tools that need to avoid GPU-driver context overhead. GPU remains the
  default. Raster requires Wayland. It paints a 16-bit linear CPU surface and
  presents through three shared-memory buffers without creating OpenGL or EGL
  contexts or an SDL renderer. It is opaque, compositor paced, and cannot be
  combined with `Window.Transparent`.

### Changed

- Window painting retains up to 64 gradient shaders by content and bounds.
  Image decoding uses two fixed queue workers instead of one task per request.
- Raster Wayland damage uses `wl_surface.damage` for protocol versions 1-3 and
  `wl_surface.damage_buffer` for version 4 and later.

### Verification

- Release coverage opens, pumps, resizes, presents, reuses, and reopens raster
  windows, and rejects transparency. Lanes pass 428 core, 38 performance, 32
  native, and 498 total.
- Three Release probe runs measured median conversion at 2.091 ms for 1920x1080
  and 8.268 ms for 3840x2160, down from 3.683 ms and 12.361 ms, with zero
  managed allocation. The targets retain 39.6 MiB and 158.2 MiB. Direct Skia
  conversion measured 27.430 ms and 109.909 ms. Headless core raster paint
  allocates 88 B per operation.

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
