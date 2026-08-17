# Q10 text editing benchmark

This production-reference benchmark runs the revision 2 1 MiB text editing workload
through the public Goo API. Each operation alternates
TextEditorController.Insert("x") and DeleteBackward(), then calls live
Window.Pump for retained update, Skia paint, and native present.

Build and run one JIT child:

    dotnet build benchmarks/Goo.Q10TextBenchmark/Goo.Q10TextBenchmark.csproj \
      -c Release -t:Rebuild
    SDL_VIDEO_WAYLAND_MODE_SCALING=0 \
    DOTNET_TieredCompilation=0 DOTNET_TC_QuickJit=0 \
    dotnet run --project benchmarks/Goo.Q10TextBenchmark/Goo.Q10TextBenchmark.csproj \
      -c Release --no-build -- --workload q10.text-editing --json

JIT supports the `--json` diagnostic smoke run only. A batch manifest requires a
published NativeAOT executable.

Publish and run NativeAOT for linux-x64:

    dotnet publish benchmarks/Goo.Q10TextBenchmark/Goo.Q10TextBenchmark.csproj \
      -c Release -r linux-x64 -p:PublishAot=true
    SDL_VIDEO_WAYLAND_MODE_SCALING=0 \
    benchmarks/Goo.Q10TextBenchmark/bin/Release/net10.0/linux-x64/publish/Goo.Q10TextBenchmark \
      --workload q10.text-editing --json

Run five isolated sequential linux-x64 children and write content-hashed raw artifacts:

    batch=$(mktemp -d /tmp/goo-q10-batch.XXXXXX)
    SDL_VIDEO_WAYLAND_MODE_SCALING=0 \
    benchmarks/Goo.Q10TextBenchmark/bin/Release/net10.0/linux-x64/publish/Goo.Q10TextBenchmark \
      --workload q10.text-editing --batch "$batch"

Publish and run NativeAOT for win-x64 in PowerShell:

    dotnet publish benchmarks/Goo.Q10TextBenchmark/Goo.Q10TextBenchmark.csproj `
      -c Release -r win-x64 -p:PublishAot=true
    .\benchmarks\Goo.Q10TextBenchmark\bin\Release\net10.0\win-x64\publish\Goo.Q10TextBenchmark.exe `
      --workload q10.text-editing --json

Run five isolated sequential win-x64 children in PowerShell:

    $batch = Join-Path $env:TEMP "goo-q10-batch"
    New-Item -ItemType Directory -Force $batch | Out-Null
    .\benchmarks\Goo.Q10TextBenchmark\bin\Release\net10.0\win-x64\publish\Goo.Q10TextBenchmark.exe `
      --workload q10.text-editing --batch $batch
