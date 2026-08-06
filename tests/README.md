# Tests

`Goo.Tests` has three selectable lanes:

| Lane | Filter | Scope |
| --- | --- | --- |
| Core | `Category!=Performance&Category!=NativeBoundary` | Fast, deterministic, headless behavior |
| Performance | `Category=Performance` | 37 deterministic allocation and storage gates |
| Native boundary | `Category=NativeBoundary` | Deterministic SDL ABI and host-adapter behavior |

Run a lane from the repository root:

```sh
dotnet test tests/Goo.Tests/Goo.Tests.csproj -c Release --filter 'Category!=Performance&Category!=NativeBoundary'
dotnet test tests/Goo.Tests/Goo.Tests.csproj -c Release --filter 'Category=Performance'
dotnet test tests/Goo.Tests/Goo.Tests.csproj -c Release --filter 'Category=NativeBoundary'
```

Live desktop integration is a platform release check, not a headless unit test.
`Goo.PackageSmoke` consumes the packed package from `artifacts/packages` using its
own NuGet configuration and a clean package cache in CI. Packing requires the
Ubuntu-22.04-built SDL asset:

```sh
.github/scripts/build-sdl-linux-x64.sh artifacts/native/libSDL3.so
dotnet pack Goo/Goo.gsproj -c Release -o artifacts/packages \
  -p:GooLinuxSdlPath="$PWD/artifacts/native/libSDL3.so"
```

## Contract inventory

The discovered fully qualified test names are the contract inventory:

```sh
dotnet test tests/Goo.Tests/Goo.Tests.csproj -c Release --list-tests
```

Each name states a distinct behavior and outcome. Keep a test only when it protects a
public contract, a native-resource lifetime, a measured release budget, or a credible
historical regression.

## Linux x64 release inventory

| Lane | Cases | Scope |
| --- | ---: | --- |
| Core | 426 | Deterministic behavior and public contracts |
| Performance | 37 | Deterministic allocation and storage budgets |
| Native boundary | 25 | Deterministic SDL ABI and host adapters |
| Full suite | 488 | All selectable lanes |

The performance lane has no wall-clock assertions. Tests remain under the top-level
`tests` directory, and Goo packages exclude the complete directory. Probes and local
applications are not part of the repository, suite, or package.
