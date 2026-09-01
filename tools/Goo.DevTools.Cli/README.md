# Goo DevTools CLI

`Goo.DevTools` installs the `goo` command. It starts a Goo project with the diagnostics launch hint, Goo automatically attaches each window when it opens, discovers local Goo endpoints, attaches to the versioned JSON-lines protocol, requests captures, and checks the local setup. `DevTools.Attach(window)` remains available for advanced manual control.

```sh
dotnet tool install --global Goo.DevTools
goo dev --inspector --watch -- dotnet run --project App.gsproj
goo attach --latest
goo capture --latest --output frame.png
goo doctor
```

The CLI does not scan arbitrary processes. Goo windows publish one endpoint descriptor below `GOO_DEVTOOLS_DIR`, `.goo/devtools`, or the platform runtime directory. Set `GOO_DEVTOOLS_INSPECTOR` to the standalone Goo DevTools executable or DLL when it is not on `PATH`.

The tool is MIT licensed.
