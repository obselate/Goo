# Goo DevTools

Goo DevTools is local and opt-in. The `goo` .NET tool starts a Goo application with a diagnostics launch hint, Goo automatically attaches each window when it opens, and the tool finds live Goo endpoints, attaches to one window endpoint, requests a capture, and launches the standalone inspector when it is installed. `DevTools.Attach(window)` remains available for advanced manual control.

## Install

For a released tool:

```sh
dotnet tool install --global Goo.DevTools --version 0.4.0
dotnet tool install --global Goo.DevTools.App --version 0.4.0
```

`Goo.DevTools` installs the `goo` CLI. `Goo.DevTools.App` installs the standalone `goo-devtools` inspector used by `--inspector`.

For a checkout build:

```sh
dotnet pack tools/Goo.DevTools.Cli/Goo.DevTools.Cli.csproj -c Release -o artifacts/devtools
dotnet tool install --global Goo.DevTools --add-source artifacts/devtools --version 0.4.0
```

Create a project from the template:

```sh
dotnet new install Goo.Templates@0.4.0
dotnet new goo --name HelloGoo
```

## Daily loop

Start a project through `dotnet watch` with an explicit diagnostics environment:

```sh
goo dev --inspector --watch --project HelloGoo/HelloGoo.gsproj
```

Or provide the application command after `--`:

```sh
goo dev --inspector --watch -- dotnet run --project HelloGoo/HelloGoo.gsproj
```

Attach to one window endpoint:

```sh
goo attach --latest
goo attach --pid 12345 --json
```

Request a screenshot:

```sh
goo capture --latest --output frame.png
```

The CLI prints a restart-required message when `dotnet watch` reports an edit that cannot be applied by Hot Reload. Changes to G# metadata or project shape may still require a process restart. The CLI reconnects only when the application republishes a descriptor.

## Runtime directory

Each diagnostics-enabled window publishes one JSON endpoint descriptor. Discovery checks `GOO_DEVTOOLS_DIR`, `<project>/.goo/devtools`, `$XDG_RUNTIME_DIR/goo`, `$XDG_RUNTIME_DIR/goo-devtools`, and the platform local runtime directory. Set `GOO_DEVTOOLS_DIR` in a launch profile when the application and tools use a shared location.

The standalone inspector is found from `GOO_DEVTOOLS_INSPECTOR`, `goo-devtools` on `PATH`, or the repository DevTools app output. The CLI reports the exact missing path and does not claim an inspector is available when it is not.

## IDEs

The VS Code extension in `integrations/vscode` calls the same CLI and opens source files from explicit user-selected paths. Package it with `npx @vscode/vsce package integrations/vscode`, then install the generated `.vsix`. Rider uses the external-tool profile in `integrations/rider` and does not require a separate plugin.

## Protocol

See [protocol.md](protocol.md) for descriptor fields and the versioned JSON-lines messages used by the standalone app, CLI, and IDE integrations.
