<p align="center">
  <img src="docs/assets/goo-readme-banner.gif" alt="Goo" width="1200">
</p>

<p align="center">A declarative desktop UI framework for G#.</p>

<p align="center">
  <a href="https://github.com/obselate/goo/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/obselate/goo/ci.yml?branch=main&amp;style=flat-square&amp;label=ci&amp;labelColor=090B10&amp;color=478AD1" alt="CI status"></a>
  <a href="https://www.nuget.org/packages/Goo/"><img src="https://img.shields.io/nuget/v/Goo?style=flat-square&amp;labelColor=090B10&amp;color=478AD1" alt="NuGet version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/obselate/goo?style=flat-square&amp;labelColor=090B10&amp;color=6CBC5F" alt="MIT license"></a>
</p>

Goo is a retained UI framework with a small, direct core. Applications describe
fresh UI trees in ordinary G#. Goo retains runtime state, rebuilds dirty `Cell`
boundaries, lays out with Yoga, and renders with Skia.

Applications keep full control over their visual identity.

## Install

1. Install the
   [latest .NET 10 SDK](https://dotnet.microsoft.com/en-us/download/dotnet/10.0).
2. Set up
   [`Gsharp.NET.Sdk`](https://www.nuget.org/packages/Gsharp.NET.Sdk/) using the
   [G# SDK guide](https://github.com/DavidObando/gsharp/blob/main/docs/sdk-usage.md).
3. Acquire Goo using one of the following methods.

From [NuGet](https://www.nuget.org/packages/Goo/) with the .NET CLI:

```sh
dotnet add package Goo --version 0.2.0
```

Using `PackageReference`:

```xml
<PackageReference Include="Goo" Version="0.2.0" />
```

As a prebuilt Linux x64 archive, download
[`Goo.0.2.0-linux-x64.tar.gz`](https://github.com/obselate/goo/releases/download/v0.2.0/Goo.0.2.0-linux-x64.tar.gz)
and its
[`SHA-256 checksum`](https://github.com/obselate/goo/releases/download/v0.2.0/Goo.0.2.0-linux-x64.tar.gz.sha256)
from [GitHub Releases](https://github.com/obselate/goo/releases).

From source:

```sh
git clone https://github.com/obselate/goo.git
cd goo
dotnet build Goo/Goo.gsproj --configuration Release
```

Update an existing source checkout with `git pull --ff-only`.

The first release supports `linux-x64` on glibc 2.35 or newer. It requires a
native Wayland session and the system Fontconfig runtime (`libfontconfig1` on
Ubuntu). X11 and XWayland backends are outside the 0.1 release.

## Documentation

- [API reference](https://github.com/obselate/goo/tree/main/docs/api)
- [Accessibility](https://github.com/obselate/goo/blob/main/docs/api/accessibility.md)
- [Cell and component state](https://github.com/obselate/goo/blob/main/docs/api/cell.md)
- [Input](https://github.com/obselate/goo/blob/main/docs/api/input.md)
- [Layout](https://github.com/obselate/goo/blob/main/docs/api/layout.md)
- [Motion](https://github.com/obselate/goo/blob/main/docs/api/motion.md)
- [Rendering](https://github.com/obselate/goo/blob/main/docs/api/rendering.md)
- [Shapes](https://github.com/obselate/goo/blob/main/docs/api/shapes.md)
- [Style](https://github.com/obselate/goo/blob/main/docs/api/style.md)
- [Text](https://github.com/obselate/goo/blob/main/docs/api/text.md)
- [Text editor](https://github.com/obselate/goo/blob/main/docs/api/text-editor.md)
- [Tree](https://github.com/obselate/goo/blob/main/docs/api/tree.md)
- [Window](https://github.com/obselate/goo/blob/main/docs/api/window.md)
- [Release notes](https://github.com/obselate/goo/blob/main/CHANGELOG.md)
- [GitHub releases](https://github.com/obselate/goo/releases)

The package includes `Goo.xml` for editor documentation.

## Build a component

```csharp
package App

import Goo

class Counter : Cell {
  private var count int32

  public override func Build() Blob ->
    Container {
      Width: 320,
      Padding: 24,
      Gap: 12,
      BorderRadius: 16,
      BackgroundColor: "#181f2b",
      Children: {
        Text {
          Content: "Count: $count",
          FontSize: 24,
          Color: "#f4f7ff",
        },
        Button {
          Padding: 10,
          BorderRadius: 10,
          BackgroundColor: "#4a7dff",
          OnClick: () -> count++,
          Children: { 
            Text { 
              Content: "Add one", Color: "#ffffff" 
            } 
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

`Cell` owns state and defines the rebuild boundary. Its `Build` method returns a
new tree of lightweight `Blob` descriptions. Goo compares that tree with the
retained runtime nodes, then schedules the layout and paint work caused by the
change.

## What Goo optimizes for

- **Primitives** Layout, text, images, vector paths, input, motion, editing,
  accessibility, and windows form a public surface for application-level
  composition.
- **G# Best practices** Components use classes, functions, loops, typed values, and
  ordinary control flow.
- **Frame discipline** Retained nodes, scoped invalidation, reusable caches,
  and allocation budgets keep CPU time and memory traffic visible.

Themes, design systems, and widget libraries live in application code or
reusable packages. The core provides base primitives for creating applications via composition and widgets.

## Credits

Goo uses Skia through SkiaSharp for drawing and text. 
Layout uses Meta Yoga through the vendored Yoga.Net port. 

See the [third-party notices](THIRD-PARTY-NOTICES.md)
for versions and license terms.

## License

Goo is available under the [MIT License](LICENSE).
