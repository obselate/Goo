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
dotnet new install Goo.Templates --version 0.4.0

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

## Tool requirements

The quick start needs only the .NET SDK and platform runtime requirements. Goo
packages its internal SPIR-V and its ShaderEffect build adapter. It does not
compile shaders at runtime.

Install the following version-locked tools only when a project declares a
`<GooShaderEffect>` source:

- [Slang 2026.16](https://github.com/shader-slang/slang/releases/tag/v2026.16).
  Set `SLANG_SDK` to the extracted SDK root or add its `bin` directory to
  `PATH`.
- [Vulkan SDK 1.4.357.0](https://vulkan.lunarg.com/sdk/home), including
  SPIRV-Tools 2026.3. Set `VULKAN_SDK` to the platform SDK root or add its
  `bin` directory to `PATH` so Goo can find `spirv-val`.

Both toolchains are supported on Linux x64 and Windows x64. Goo rejects other
tool versions so shader artifacts remain deterministic. See the
[ShaderEffect build guide](https://github.com/obselate/goo/blob/main/docs/api/rendering.md#apply-fragment-shaders-to-retained-elements)
for project configuration. Regenerating Goo's internal shaders also requires
`glslc` 2026.3 from the same Vulkan SDK.

SVG conversion is a separate optional tool:

```sh
dotnet tool install --global Goo.SvgCompiler --version 0.4.0
goo-svgc input.svg output.gcv1
```

The [SVG compiler guide](https://github.com/obselate/goo/blob/main/tools/Goo.SvgCompiler/README.md) documents the
accepted SVG subset.

## Platform requirements

Goo ships Windows x64 and Linux x64 runtime assets. Both require Vulkan 1.3 with
`VK_KHR_swapchain`, timeline semaphores, synchronization2, dynamic rendering,
and `R16G16B16A16_SINT` uniform texel buffers.

Windows has been tested on Windows 11 with current vendor Vulkan drivers. A
minimum supported Windows version has not yet been established.

Linux requires:

- Linux 6.6 or newer
- glibc 2.27 or newer
- A native Wayland 1.18 or newer session
- A Vulkan driver for the active GPU
- At least one TrueType or OpenType sans-serif font, such as DejaVu Sans

Surface and swapchain maintenance extensions are used when available but are
not required.

## Documentation

- [API reference](https://github.com/obselate/goo/tree/main/docs/api)
- [Tests and verification](https://github.com/obselate/goo/blob/main/tests/README.md)
- [Release notes](https://github.com/obselate/goo/blob/main/CHANGELOG.md)
- [Third-party notices](https://github.com/obselate/goo/blob/main/THIRD-PARTY-NOTICES.md)

## Developer tooling

Goo DevTools provides the local development loop for starting, attaching to,
capturing, and diagnosing a Goo application:

```sh
dotnet tool install --global Goo.DevTools --version 0.4.0
dotnet tool install --global Goo.DevTools.App --version 0.4.0
goo dev --project path/to/App.gsproj
goo attach --latest
goo capture --latest --output frame.png
goo doctor --project path/to/App.gsproj
```

`Goo.DevTools` installs the `goo` CLI. `Goo.DevTools.App` installs the standalone `goo-devtools` inspector.
Neither package is required to build or run a Goo application.

The [DevTools guide](https://github.com/obselate/goo/tree/main/docs/devtools) documents endpoint discovery and the
local-only protocol. The [VS Code extension](https://github.com/obselate/goo/tree/main/integrations/vscode) adds IDE
commands and source navigation. Rider users can import the [External Tools
profile](https://github.com/obselate/goo/blob/main/integrations/rider/GooDevTools.xml).

## Publish

Use `win-x64` on Windows or `linux-x64` on Linux. Framework-dependent publish:

```sh
dotnet publish -c Release -r win-x64 --self-contained false
```

Self-contained publish:

```sh
dotnet publish -c Release -r win-x64 --self-contained true
```

NativeAOT publish:

```sh
dotnet publish -c Release -r win-x64 --self-contained true -p:PublishAot=true
```

Replace `win-x64` with `linux-x64` on Linux. NativeAOT does not support
cross-OS compilation. Install the target platform's [NativeAOT
prerequisites](https://learn.microsoft.com/dotnet/core/deploying/native-aot/)
before publishing. On Windows this includes the Visual Studio C++ desktop
workload. On Ubuntu this includes `clang` and `zlib1g-dev`.

## Troubleshooting

- Run `goo doctor --project path/to/App.gsproj` to check the .NET SDK, project,
  diagnostics directory, endpoint, and optional inspector.
- If window creation reports no Vulkan device, install the current GPU driver
  and confirm that `vulkaninfo` can see Vulkan 1.3 and the required features.
- On Linux, run from a native Wayland session and confirm `WAYLAND_DISPLAY` is
  set. X11 and XWayland are not supported.
- If text initialization cannot find a font, install a TrueType or OpenType
  sans-serif font such as DejaVu Sans.
- ShaderEffect compiler or validator version errors mean `SLANG_SDK`,
  `VULKAN_SDK`, or `PATH` resolves a tool version other than the pinned one.

## Build from source

```sh
git clone https://github.com/obselate/goo.git
cd goo
dotnet build Goo/Goo.gsproj -c Release
```

See [CONTRIBUTING.md](https://github.com/obselate/goo/blob/main/CONTRIBUTING.md) for source dependencies, focused tests,
native payload packaging, and the release-parity workflow.

Goo is available under the [MIT License](https://github.com/obselate/goo/blob/main/LICENSE).
