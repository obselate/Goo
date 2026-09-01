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

## Quick start

Install [.NET 10](https://dotnet.microsoft.com/download/dotnet/10.0), then:

```sh
dotnet new install Goo.Templates # once

mkdir hello-goo
cd hello-goo
dotnet new goo
```

Replace `Program.gs` with the example below, then run:

```sh
dotnet run
```

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
  Window{ Title: "Counter", Width: 320, Height: 180, Root: Counter{} }.Run()
}
```

`Cell` owns local state. Event handlers invalidate their owning Cell automatically, so changing `count` rebuilds only this component.

## What G# allows with Goo

Goo trees are ordinary values. Dynamic children use `for`, `if`, `if let`, and
inferred CLR `out var` directly:

```gsharp
package ProjectMenuApp

import System
import System.Collections.Generic
import Goo

class ProjectMenu : Cell {
  private let projects []string = []string{ "Goo", "Gex", "SharpTUI" }
  private var visibleText string = "2"
  private var selected string? = nil

  override func Build() Blob {
    var visible = projects.Length
    if Int32.TryParse(visibleText, out var parsed) {
      visible = Math.Clamp(parsed, 0, projects.Length)
    }

    let children = List[Blob](visible + 2)
    for index in 0 ... visible {
      let project = projects[index]
      children.Add(Button{
        Key: project,
        Padding: 10,
        BorderRadius: 8,
        BackgroundColor: Color.Rgb(54, 92, 168),
        OnClick: func() { selected = project },
        Children: { Text{ Content: project, Color: Color.White } },
      })
    }
    if visible < projects.Length {
      children.Add(Text{
        Key: "more",
        Color: Color.Rgb(174, 184, 204),
        Content: (projects.Length - visible).ToString() + " more",
      })
    }
    if let project = selected {
      children.Add(Text{
        Key: "selected",
        Content: "Selected: " + project,
        Color: Color.Rgb(112, 170, 255),
      })
    }

    return Container{
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      Padding: 20,
      Gap: 8,
      BackgroundColor: Color.Rgb(20, 27, 39),
      Children: children,
    }
  }
}

func Main() {
  Window.ConfigureApplication("Projects", "1.0.0", "com.example.projects")
  Window{ Title: "Projects", Width: 360, Height: 240, Root: ProjectMenu{} }.Run()
}
```

## Included

- Yoga flexbox layout
- Text, images, vector paths, gradients, shadows, clipping, and blend modes
- Pointer, keyboard, focus, scrolling, text entry, and multiline editing
- Motion and retained component state
- Accessibility semantics
- Multi-window Vulkan rendering
- Build-time SVG and ShaderEffect tooling

## Linux requirements

- x86-64
- Linux 6.6 or newer
- glibc 2.27 or newer
- Wayland 1.18 or newer
- Vulkan 1.3 with `VK_KHR_swapchain`, timeline semaphores, synchronization2,
  dynamic rendering, and `R16G16B16A16_SINT` uniform texel buffers

Surface and swapchain maintenance extensions are used when available but are
not required.

## Documentation

- [API reference](docs/api/)
- [Tests and verification](tests/README.md)
- [Release notes](CHANGELOG.md)
- [Third-party notices](THIRD-PARTY-NOTICES.md)

## Developer tooling

Goo DevTools provides the local development loop for starting, attaching to,
capturing, and diagnosing a Goo application:

```sh
dotnet tool install --global Goo.DevTools
dotnet tool install --global Goo.DevTools.App
goo dev --project path/to/App.gsproj
goo attach --latest
goo capture --latest --output frame.png
```

`Goo.DevTools` installs the `goo` CLI. `Goo.DevTools.App` installs the standalone `goo-devtools` inspector.

The [DevTools guide](docs/devtools/) documents endpoint discovery and the
local-only protocol. The [VS Code extension](integrations/vscode/) adds IDE
commands and source navigation. Rider users can import the [External Tools
profile](integrations/rider/GooDevTools.xml).

## Build from source

```sh
git clone https://github.com/obselate/goo.git
cd goo
dotnet build Goo/Goo.gsproj -c Release
```

Goo is available under the [MIT License](LICENSE).
