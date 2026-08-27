<p align="center">
  <img src="docs/assets/goo-readme-banner.gif" alt="Goo" width="1200">
</p>

<p align="center">A retained desktop UI framework for G#, rendered directly with Vulkan.</p>

<p align="center">
  <a href="https://github.com/obselate/goo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/obselate/goo/ci.yml?branch=main&amp;style=flat-square&amp;label=ci" alt="CI status"></a>
  <a href="https://www.nuget.org/packages/Goo/"><img src="https://img.shields.io/nuget/v/Goo?style=flat-square" alt="NuGet version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/obselate/goo?style=flat-square" alt="MIT license"></a>
</p>

Goo applications describe UI as ordinary G# objects. Goo retains mounted state, rebuilds only dirty `Cell` boundaries, lays out with Yoga, and renders through Vulkan 1.3.

## Install

Goo targets .NET 10 and uses [`Gsharp.NET.Sdk`](https://www.nuget.org/packages/Gsharp.NET.Sdk/).

```sh
dotnet add package Goo --version 0.2.0
```

## Example

```gsharp
package CounterApp

import Goo

class Counter : Cell {
  private var count int32

  override func Build() Blob -> Container {
    Width: 320,
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
        OnClick: func() { count++ },
        Children: {
          Text{ Content: "Add one", Color: Color.White },
        },
      },
    },
  }
}

func Main() {
  Window.ConfigureApplication("Counter", "1.0.0", "com.example.counter")
  Window{ Title: "Counter", Root: Counter{} }.Run()
}
```

`Cell` owns local state. Event handlers invalidate their owning Cell automatically, so changing `count` rebuilds only this component.

## Included

- Yoga flexbox layout
- Text, images, vector paths, gradients, shadows, clipping, and blend modes
- Pointer, keyboard, focus, scrolling, text entry, and multiline editing
- Motion and retained component state
- Accessibility semantics
- Multi-window Vulkan rendering
- Build-time SVG and ShaderEffect tooling

## Platform status

Linux x64 with glibc 2.35 or newer in a native Wayland session is currently qualified. Windows x64 qualification is still in progress.

## Documentation

- [API reference](docs/api/)
- [Tests and verification](tests/README.md)
- [Release notes](CHANGELOG.md)
- [Third-party notices](THIRD-PARTY-NOTICES.md)

## Build from source

```sh
git clone https://github.com/obselate/goo.git
cd goo
dotnet build Goo/Goo.gsproj -c Release
```

Goo is available under the [MIT License](LICENSE).
