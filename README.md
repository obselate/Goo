<p align="center">
  <img src="https://raw.githubusercontent.com/obselate/goo/main/docs/assets/goo-readme-banner.gif" alt="Goo" width="1200">
</p>

<p align="center">A retained desktop UI framework for G#, rendered directly with Vulkan.</p>

<p align="center">
  <a href="https://github.com/obselate/goo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/obselate/goo/ci.yml?branch=main&amp;style=flat-square&amp;label=ci" alt="CI status"></a>
  <a href="https://www.nuget.org/packages/Goo/"><img src="https://img.shields.io/nuget/v/Goo?style=flat-square" alt="NuGet version"></a>
  <a href="https://github.com/obselate/goo/blob/main/LICENSE"><img src="https://img.shields.io/github/license/obselate/goo?style=flat-square" alt="MIT license"></a>
</p>

Goo applications describe UI as ordinary G# objects. Goo retains mounted state, rebuilds only dirty `Cell` boundaries, lays out with Yoga, and renders through Vulkan 1.3.

## Quick start

Install the [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
and meet the [platform requirements](#platform-requirements), then:

```sh
dotnet new install Goo.Templates@0.4.0

mkdir hello-goo
cd hello-goo
dotnet new goo
```

Replace `Program.gs` with the example below, then run:

```sh
dotnet run
```

The template restores the G# SDK and Goo package through NuGet. A separate G#
compiler, SDL, HarfBuzz, or shader compiler installation is not required for
this starter application.

## Example

```gsharp
package CounterApp

import Goo

class Counter : Cell {
  private var count int32

  override func Build() Blob -> Container {
    Width: Length.Percent(100),
    Height: Length.Percent(100),
    Padding: 24,
    Gap: 12,
    BorderRadius: 16,
    BackgroundColor: Color.Rgb(24, 31, 43),
    Children: {
      Text{
        Content: "Count: " + count.ToString(),
        FontSize: 24,
        Color: Color.Rgb(244, 247, 255),
      },
      Button{
        Padding: 10,
        BorderRadius: 10,
        BackgroundColor: Color.Rgb(74, 125, 255),
        OnClick: () -> { count++ },
        Children: {
          Text{ Content: "Add one", Color: Color.White },
        },
      },
    },
  }
}

func Main() {
  Window.ConfigureApplication("Counter", "1.0.0", "com.example.counter")
  Window{ Title: "Counter", Width: 320, Height: 180, Root: Counter{} }.Run()
}
```

`Cell` owns local state. Event handlers invalidate their owning Cell automatically, so changing `count` rebuilds only this component.

## Platforms

Goo ships runtime assets for Windows x64 and Linux x64. Both require a Vulkan
1.3 driver.

- Windows x64 is tested on Windows 11 with current vendor Vulkan drivers. The
  minimum supported Windows version is not yet established.
- Linux x64 requires Linux 6.6 or newer, glibc 2.27 or newer, a native Wayland
  1.18 or newer session, and a TrueType or OpenType sans-serif font. X11 and
  XWayland are not supported.

## Further reading

- [API documentation](https://github.com/obselate/goo/tree/main/docs/api)
- [DevTools](https://github.com/obselate/goo/tree/main/docs/devtools)
- [Shader effects](https://github.com/obselate/goo/blob/main/docs/api/rendering.md#apply-fragment-shaders-to-retained-elements)
- [Testing and verification](https://github.com/obselate/goo/blob/main/tests/README.md)
- [Contributing and source builds](https://github.com/obselate/goo/blob/main/CONTRIBUTING.md)
- [Release notes](https://github.com/obselate/goo/blob/main/CHANGELOG.md)
