# Goo DevTools

Goo DevTools is the standalone native inspector for Goo applications. It is local-first and uses a versioned diagnostics transport so the inspector UI is independent of the target process transport.

The app discovers live Goo targets by reading `goo.devtools/1` descriptors. It connects to the newest live endpoint and keeps reads on a background worker so the Goo UI thread stays responsive. If no endpoint is available, the app shows a disconnected target. Fixture data is opt-in with `--sample` or `GOO_DEVTOOLS_SAMPLE=1`.

## Install

The standalone inspector is distributed as the `Goo.DevTools.App` .NET tool and installs the `goo-devtools` command. Its generated dependency graph pins Goo 0.4.2, and the tool package carries the resolved Goo managed and platform runtime assets needed at launch without copying Goo source or implementation files into this project.

```sh
dotnet tool install --global Goo.DevTools.App --version 0.4.2
goo-devtools
```

To install from a checkout, pack the inspector with the compatible Linux SDL payload, then install the local package:

```sh
dotnet pack apps/Goo.DevTools/Goo.DevTools.gsproj -c Release -o artifacts/packages -p:GooLinuxSdlPath=/absolute/path/to/libSDL3.so
dotnet tool install --global Goo.DevTools.App --version 0.4.2 --add-source artifacts/packages
```

The CLI package is separate: `Goo.DevTools` installs `goo`, while `Goo.DevTools.App` installs `goo-devtools`.

## Protocol boundary

`DiagnosticsProtocol.gs` defines the first wire vocabulary:

- `DiagnosticProtocolVersion`
- `DiagnosticCapabilities`
- `DiagnosticEndpoint`
- `DiagnosticMessage`
- `DiagnosticTransport`
- `DiagnosticPipeTransport`
- `DiagnosticDisconnectedTransport`
- `SampleDiagnosticTransport`

`DiagnosticEndpointDiscovery` uses the same descriptor locations as the Goo CLI: `GOO_DEVTOOLS_DIR`, the project `.goo/devtools` directory, XDG runtime directories, Windows local application data, and temporary Goo directories. `--pipe <name>` and `--pid <pid>` select or directly attach to one endpoint.

`DiagnosticPipeTransport` connects to the named pipe and sends the `goo.devtools/1` hello. It requests snapshots, polls snapshots at 100 ms intervals, and queues JSON-lines messages for the UI. The session accepts full and delta snapshots, remote selection and hover updates, logs, events, and capture responses. Unknown fields and capability names are ignored.

UI actions send `inspect.enter`, `inspect.exit`, `select`, `clear`, `override`, `reset`, and `capture` requests. `logs` and `events` requests are sent after hello when the target advertises those capabilities. Capture polling continues until the target returns `pending: false`.

## Run

```text
goo-devtools
goo-devtools --attach --pipe <name> --pid <pid>
goo-devtools --sample
```

For source builds, `dotnet run --project apps/Goo.DevTools/Goo.DevTools.gsproj` uses the same live discovery path. Add `-- --sample` to run with fixture data.

The app targets `net10.0` and references Goo 0.4.2.
