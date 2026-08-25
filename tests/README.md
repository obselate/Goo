# Tests

Goo release verification uses focused behavior, ABI, Vulkan, recovery, and
package-consumer lanes.

## Core behavior suite

`tests/Goo.CoreBehaviorTests` preserves the backend-neutral public behavior and
allocation contracts from the retired broad suite without SkiaSharp or
`Goo.InternalTextInterop`:

```sh
dotnet test tests/Goo.CoreBehaviorTests/Goo.CoreBehaviorTests.csproj -c Release
```

## API contract suite

Public API contract verification runs through `tests/Goo.ApiContractTests`:

```sh
dotnet test tests/Goo.ApiContractTests/Goo.ApiContractTests.csproj -c Release
```

The suite enforces the approved public API baseline in `PublicApi.approved.txt`,
disallows unapproved public additions or breaks, and validates complete XML documentation.

Fixture-bearing projects share `Goo/bin/TestRelease`. Use `-t:Rebuild` when switching between
`Goo.CoreBehaviorTests`, `Goo.AsyncReadbackSmoke`, `Goo.FailedIdleSmoke`, and
`Goo.ImageUploadStatePerf` so the selected explicit `GooTestFixturesProps` import replaces the
previous project's fixture assembly.

## Focused lanes

| Lane | Entry point | Scope |
| --- | --- | --- |
| API contract | `Goo.ApiContractTests` | Public API approval baseline and XML documentation completeness |
| Core behavior | `Goo.CoreBehaviorTests` | 261 backend-neutral Cell, reconciliation, Yoga, style, motion, input, text, accessibility, and allocation contracts |
| Goo build | `Goo/Goo.gsproj` | Release build with warnings treated as errors |
| Vulkan text provider ABI | `Goo.VulkanAbiSmoke` | Provider capacity, buffer bounds, reuse, disposal, registered-font cache budget |
| Vulkan damage-journal ABI | `Goo.VulkanAbiSmoke` with `GOO_VK_DAMAGE_JOURNAL=1` | Exact scale/extent physical keys, scale-plus-mutation full fallback, bounded logical damage, eviction gap, reset, and abandoned version |
| Vulkan text shaping | `Goo.VulkanProof` with `GOO_VK_TEXT_E2E=1` | Metrics, shaping, features, variations, collections |
| Vulkan color text | `Goo.VulkanProof` with `GOO_VK_TEXT_PAINT_E2E=1` | COLRv0 and COLRv1 paint encoding |
| Vulkan text effects | `Goo.VulkanProof` with `GOO_VK_TEXT_EFFECT_READBACK=1` | Vulkan text stroke and sharp shadow readback |
| Vulkan color readback | `Goo.VulkanProof` with `GOO_VK_TEXT_PAINT_READBACK=1` | Vulkan color glyph readback |
| Failed-idle recovery | `Goo.FailedIdleSmoke` | Three windows, target-owned close, 1,000 lifecycle operations, retained-resource plateau, 10 surface losses, 3 device losses, recovered text/images/layers, and clean shutdown |
| Registered-font package lane | `Goo.PackageSmoke` with `GOO_REGISTERED_FONT_SMOKE=1` | Fresh packed consumer font corpus |
| Text-controls package lane | `Goo.PackageSmoke` with `GOO_NATIVE_TEXT_CONTROLS_SMOKE=1` | CJK, RTL, combining marks, ligatures, editor, IME, geometry, and window reopen |
| Text-atlas package lane | `Goo.PackageSmoke` with `GOO_NATIVE_TEXT_ATLAS_SMOKE=1` and `GOO_VK_TEXT_ATLAS_BYTES=8192` | Small-page pressure, upload, eviction, retirement, and bounded residency |
| Image-pressure package lane | `Goo.PackageSmoke` with `GOO_NATIVE_IMAGE_PRESSURE_SMOKE=1` | Image byte-budget plateau, eviction, retirement, and zero GPU image state after close |
| S09R primitive package lane | `Goo.PackageSmoke` with `GOO_NATIVE_S09R_SMOKE=1` | Public boxes, borders, gradients, transforms, rectangular clips, scrolling, stacking, visibility, opacity, diagnostics, and close |
| S13 path package lane | `Goo.PackageSmoke` with `GOO_NATIVE_S13_PATH_SMOKE=1` | NonZero and EvenOdd paths, rounded fill and stroke, path clips, pointer geometry, path pressure, partial range reuse, and cleanup |
| S13 clip-mask package lane | `Goo.PackageSmoke` with `GOO_NATIVE_S13_CLIP_MASK_SMOKE=1` | Serial-safe clip-mask atlas pressure, stale-region eviction, pressure diagnostics, and bounded cleanup |
| S13 compiled-vector package lane | `Goo.PackageSmoke` with `GOO_NATIVE_S13_COMPILED_VECTOR_SMOKE=1` | GCV1 static, controlled animation, compatible morph playback, retained path lifecycle, and warm allocation |
| S14 async readback fixture | `Goo.AsyncReadbackSmoke` | TestRelease friend fixture, explicit 64x64 regional pixel/lifecycle gate, and bounded disabled/active timing arms |
| S09R Vulkan pixel gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S09R_PIXEL_GATE=1` | Two full-frame captures of the shared public primitive scene before and after scroll |
| S14 rounded-overflow gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S14_ROUNDED_OVERFLOW_GATE=1` | Rounded hidden and scrolling overflow, child clipping, public scroll, two full-frame captures, and cleanup |
| S15 retained-damage and primitive SSBO gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S15_RETENTION_GATE=1` | Strict leaf solid/rounded and transparent square solid per-edge border hits and rebuilds, eligible child-bearing Container/Button own-box retention, recursive generic child compilation, fallback and recapture, direct presented-image state, separate offscreen-replay pixels, scale/extent fallback, old/new bounds union damage, topology add/remove full redraw, clean chunk reuse, per-image version promotion, 128-byte primitive SSBO dirty ranges across two window slots, no-clip typed payload retention, and cleanup |
| S15 legacy StocksGrid control | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S15_STOCKS_GRID=1` | Recovered 4,900-cell text workload with retained versus forced-full timing, damage, chunk, allocation, and primitive-upload evidence |
| S15 StocksGrid virtualization gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S15_STOCKS_VIRTUALIZATION_GATE=1` | Complete versus fixed-pool virtualized 4,900-item readback equality across fractional, adjacent, diagonal, boundary, far-jump, mutation, zero-overscan, churn, and viewport-capacity traces with enabled and disabled exact clipped-text culling |
| S15 Q10 gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S15_Q10_GATE=1` and `GOO_S15_Q10_WORKLOAD=table\|topology\|boxes-sparse\|boxes-full\|small-animation\|text-editing\|image-effects\|resize-dpi\|three-window\|true-idle` | Five-process NativeAOT Q10 workloads with 300 warmups and 2,000 measured frames, CPU/GPU percentiles, exact submit/present, resource, and external power evidence; three-window and true-idle use their special routes; resize-DPI records the active-WSI block |
| S15 Q10 stage timestamp gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S15_Q10_STAGE_TIMESTAMP_GATE=1` | Five-process NativeAOT validation-layer `image-effects` route with fixed Effects and Offscreen GPU scopes, exact frame correlation, zero drops, and T03/T04 stage evidence |
| S15 Q10 startup/input latency gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S15_Q10_LATENCY_GATE=1` | Five fresh NativeAOT processes with 300 warmups and 2,000 synthetic pointer, key, and committed-text injections; successful `vkQueuePresentKHR` handoff latency gate plus present-fence completion-observed upper bounds; SDL acceptance and display feedback are not measured |
| S16 deterministic pacing gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S16_FRAME_PACING_GATE=1` | Fractional 60, 144, and 60000/1001 Hz deadlines, display-change reset, deferred frame retry, invalid-sample retention, uncapped benchmark seam, and present-mode selection |
| S16 VSync transition gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S16_VSYNC_GATE=1` | Real per-window FIFO to VSync-off mode selection and back to FIFO across swapchain generations |
| S16 live frame-pacing gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S16_LIVE_FRAME_PACING_GATE=1` | Focused VSync-off active-versus-idle pacing, display-rate cap, initial idle suppression, and clean close |
| S16 queue-isolation gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S16_QUEUE_ISOLATION_GATE=1` | Three VSync-off windows, targeted submit/present holds, sibling posted service, retryable enqueue, convergence, and clean close |
| S17 core-behavior gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S17_CORE_BEHAVIOR_GATE=1` | Pointer, keyboard, focus, hover, active and disabled styles, wheel scrolling, motion, transitions, element handles, and neutral semantics |
| S17 protected-text gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S17_PROTECTED_TEXT_GATE=1` | Grapheme mask geometry, source/display mapping, element handles, protected clipboard policy, IME commit, semantic redaction, and masked selection coordinates |
| TextEditor slot gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_TEXT_EDITOR_SLOTS_GATE=1` | Inline and block slot Vulkan presentation, shared content clipping after scroll, retained editor text, unsupported-scene diagnostics, and cleanup |
| S19 true-idle gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S19_IDLE_GATE=1` | Five isolated nested-KWin scale-1 processes, three-second warm-up, 60-second observation, zero UI or GPU work, zero managed or Vulkan allocation, and less than 0.5% of one CPU core |
| S20 retained shader-effect gate | `Goo.AsyncReadbackSmoke` with `GOO_NATIVE_S20_SHADER_EFFECT_GATE=1` | Ordinary Button source isolation, backdrop sampling, backdrop-outset coverage, rounded clipping, pointer activation, parameter invalidation, resize, display scale, device recovery, zero-allocation warm updates, no warm Vulkan resource creation, and cleanup |
| S16 three-window package smoke | `Goo.PackageSmoke` with `GOO_NATIVE_MULTIWINDOW_SMOKE=1` | Three live windows, shared scheduler dispatch, minimized sibling, posted work, owner-close continuity, and clean close |

The Vulkan lanes run under headless Wayland with
`VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation`. CI requires that validation layer
and the Mesa Vulkan software driver to be present before running validation-enabled lanes.
The S19 discrete-host qualification used a locally extracted Khronos validation layer and a
controlled Weston Vulkan compositor. Earlier S16 evidence below remains non-validation evidence.

## Local build and proof commands

Build SDL first when a target opens a window:

```sh
.github/scripts/build-sdl-linux-x64.sh artifacts/native/libSDL3.so
dotnet build Goo/Goo.gsproj -c Release -p:TreatWarningsAsErrors=true
dotnet build tests/Goo.VulkanAbiSmoke/Goo.VulkanAbiSmoke.csproj -c Release \
  -p:TreatWarningsAsErrors=true \
  -p:GooLinuxSdlPath="$PWD/artifacts/native/libSDL3.so"
dotnet build proofs/Goo.VulkanProof/Goo.VulkanProof.gsproj -c Release \
  -p:TreatWarningsAsErrors=true
dotnet build tests/Goo.FailedIdleSmoke/Goo.FailedIdleSmoke.gsproj -c Release \
  -p:TreatWarningsAsErrors=true \
  -p:GooLinuxSdlPath="$PWD/artifacts/native/libSDL3.so"
dotnet build tests/Goo.AsyncReadbackSmoke/Goo.AsyncReadbackSmoke.gsproj -c Release -t:Rebuild \
  -p:TreatWarningsAsErrors=true \
  -p:GooLinuxSdlPath="$PWD/artifacts/native/libSDL3.so" \
  -p:IncludeTestFixtures=true \
  -p:GooTestFixturesProps="$PWD/tests/Goo.AsyncReadbackSmoke/Goo.AsyncReadbackFixtures.props"
```

Run the ABI and recovery lanes:

```sh
dotnet tests/Goo.VulkanAbiSmoke/bin/Release/net10.0/Goo.Tests.dll
SDL_VIDEODRIVER=wayland LIBGL_ALWAYS_SOFTWARE=1 \
  VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation \
  .github/scripts/with-headless-wayland.sh env GOO_VK_DIAGNOSTICS=1 \
  dotnet tests/Goo.FailedIdleSmoke/bin/Release/net10.0/Goo.Tests.dll
```

Run the focused damage-journal ABI gate with:

```sh
GOO_VK_DAMAGE_JOURNAL=1 dotnet tests/Goo.VulkanAbiSmoke/bin/Release/net10.0/Goo.Tests.dll
```

It reports
`VULKAN_DAMAGE_JOURNAL_GATE sameKey=1 scale=1 extent=1 scaleMutation=1
logicalBounded=1 evictionGap=1 reset=1 abandoned=1`.

Run the S16 deterministic and transition gates with the TestRelease fixture:

```sh
GOO_NATIVE_S16_FRAME_PACING_GATE=1 \
  dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
GOO_NATIVE_S16_VSYNC_GATE=1 \
  SDL_VIDEODRIVER=wayland \
  .github/scripts/with-headless-wayland.sh env \
  dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
```

The deterministic gate reports
`s16-frame-pacing-gate: rates=60,144,60000/1001 anchored=1 reset=1 defer=1 uncapped=1 presentModes=1`.
The transition gate reports the selected VSync-off mode and the three swapchain generations.

Run the S17 core-behavior and protected-text gates with the same TestRelease fixture:

```sh
SDL_VIDEODRIVER=wayland \
  .github/scripts/with-headless-wayland.sh env \
  GOO_VK_DIAGNOSTICS=1 GOO_NATIVE_S17_CORE_BEHAVIOR_GATE=1 \
  dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
SDL_VIDEODRIVER=wayland \
  .github/scripts/with-headless-wayland.sh env \
  GOO_VK_DIAGNOSTICS=1 GOO_NATIVE_S17_PROTECTED_TEXT_GATE=1 \
  dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
```

They report
`s17-core-behavior-gate: pointer=1 focus=1 hover=1 active=1 disabled=1 keyboard=1 wheel=1 scroll=1 motion=1 transitions=1 handles=1 semantics=1 close=1`
and
`s17-protected-text-gate: graphemes=3,8 visual=1 geometry=1 clipboard=1 ime=1 semantics=1 close=1`.

Run the S19 true-idle gate in the isolated nested-KWin scale-1 compositor used by
the final Q10 route:

```sh
Q10_BINARY=/path/to/published/Goo.Tests
SDL_VIDEODRIVER=wayland WAYLAND_DISPLAY=wayland-goo-q10 \
  GOO_NATIVE_S19_IDLE_GATE=1 GOO_VK_DIAGNOSTICS=1 \
  GOO_S19_IDLE_WARMUP_MS=3000 GOO_S19_IDLE_DURATION_MS=60000 \
  "$Q10_BINARY"
```

The accepted final route used the published NativeAOT `Goo.Tests` executable
instead of the JIT DLL shown above. It ran five isolated processes for 60
seconds. Every process recorded zero rebuild, layout, plan, upload, record,
submit, present, managed allocation, Vulkan object allocation, and
device-memory allocation. CPU use was 0.1024% through 0.1093% of one core,
with a five-process median of 0.1078%.

Run the generic retained shader-effect gate with:

```sh
GOO_NATIVE_S20_SHADER_EFFECT_GATE=1 GOO_VK_DIAGNOSTICS=1 \
  dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
GOO_NATIVE_S20_SHADER_EFFECT_BENCHMARK=1 GOO_VK_DIAGNOSTICS=1 \
  GOO_S20_SHADER_EFFECT_WARMUP=300 GOO_S20_SHADER_EFFECT_SAMPLES=2000 \
  dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
```

The gate compiles its test fragment from the packaged `goo_effect.glsl` ABI, applies it to a normal
Button, captures source and backdrop results with backdrop-outset coverage, exercises pointer
activation, resize, display scale, and device recovery, then checks that warm parameter mutation
allocates 0 B and creates no Vulkan object or device-memory allocation.

The live gate uses the same TestRelease assembly under headless Wayland:

```sh
SDL_VIDEODRIVER=wayland \
  .github/scripts/with-headless-wayland.sh env \
  GOO_VK_DIAGNOSTICS=1 GOO_NATIVE_S16_LIVE_FRAME_PACING_GATE=1 \
  dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
```

It observes a VSync-off active animated window beside a clean idle window. The integrated run reported
`s16-live-frame-pacing-gate: active_vsync=0 elapsed_ms=552 rate_hz=144.001 active=62 idle=2 cap=88 close=1`.
Owner-close sibling continuity is covered by the separate three-window package smoke.

Run a Vulkan proof text lane by changing the requested variable:

```sh
export SDL_VIDEODRIVER=wayland
export LIBGL_ALWAYS_SOFTWARE=1
export VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation
export LD_LIBRARY_PATH="$PWD/artifacts/native${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
.github/scripts/with-headless-wayland.sh env GOO_VK_TEXT_E2E=1 \
  dotnet proofs/Goo.VulkanProof/bin/Release/net10.0/Goo.VulkanProof.dll
```

Use `GOO_VK_TEXT_PAINT_E2E`, `GOO_VK_TEXT_EFFECT_READBACK`, or
`GOO_VK_TEXT_PAINT_READBACK` for the other proof lanes.

## Fresh package consumer

Pack and publish the consumer before running package lanes:

```sh
dotnet pack Goo/Goo.gsproj -c Release -o artifacts/packages \
  -p:TreatWarningsAsErrors=true \
  -p:GooLinuxSdlPath="$PWD/artifacts/native/libSDL3.so"
dotnet publish tests/Goo.PackageSmoke/Goo.PackageSmoke.gsproj -c Release \
  -r linux-x64 --self-contained false -p:UseAppHost=false \
  --configfile tests/Goo.PackageSmoke/NuGet.config -o artifacts/publish
```

Run the focused package lanes sequentially under headless Wayland with
`GOO_VK_DIAGNOSTICS=1`. The atlas lane also requires
`GOO_VK_TEXT_ATLAS_BYTES=8192`:

```sh
SDL_VIDEODRIVER=wayland LIBGL_ALWAYS_SOFTWARE=1 \
  VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation \
  .github/scripts/with-headless-wayland.sh env \
  GOO_VK_DIAGNOSTICS=1 GOO_REGISTERED_FONT_SMOKE=1 \
  dotnet artifacts/publish/Goo.PackageSmoke.dll
```

Replace `GOO_REGISTERED_FONT_SMOKE=1` with
`GOO_NATIVE_TEXT_CONTROLS_SMOKE=1`, or with
`GOO_NATIVE_TEXT_ATLAS_SMOKE=1 GOO_VK_TEXT_ATLAS_BYTES=8192`.
Use `GOO_NATIVE_IMAGE_PRESSURE_SMOKE=1` for the image cache pressure lane.
Use `GOO_NATIVE_S09R_SMOKE=1` for the S09R public primitive lane.
Use `GOO_NATIVE_S13_PATH_SMOKE=1`, `GOO_NATIVE_S13_CLIP_MASK_SMOKE=1`, or
`GOO_NATIVE_S13_COMPILED_VECTOR_SMOKE=1` for the S13 package lanes.

Run the S14 readback fixture from the TestRelease product assembly. The fixture
uses the existing `Goo.Tests` friend assembly, includes a TestRelease-only partial
Window fixture, and does not add a public readback API:

```sh
SDL_VIDEODRIVER=wayland VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation \
  .github/scripts/with-headless-wayland.sh env \
  GOO_VK_DIAGNOSTICS=1 \
  dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
```

The correctness mode forces an initial render and eight fixed-delta rendered
frames through the TestRelease-only Window fixture. It then requests only the
explicit top-left `X=0,Y=0,Width=64,Height=64` region, polls with a wall-clock
timeout and `Thread.Yield`, and takes one result. It checks the 64x64 root
geometry, result extent/row bytes/format/origin/alpha metadata, deterministic
top-left and center RGBA pixels (with actual RGBA values in assertion failures),
zero validation and result failures, request/completion counts, resident readback
bytes, and clean close. The current local NVIDIA/Wayland contract is
top-left `12-13/20/32/255` and center `161/32/51/255` from the half-opacity
red-over-background fixture; the one-LSB RGB tolerance covers observed linear/sRGB
quantization. The fixture uses friend access in the TestRelease
product assembly; it adds no public readback API and does not enable production
env-driven capture.

Set `GOO_NATIVE_S09R_PIXEL_GATE=1` on the same command to run the S09R gate. It
reuses the exact public scene compiled by the package consumer, captures the
DPI-scaled full framebuffer before and after scrolling, and checks boxes,
radii, solid, dashed, and dotted per-edge borders, two- and four-stop gradients,
nested transforms, rectangular clips, scrolling, visibility, opacity, stacking,
readback lifecycle, unsupported-scene diagnostics, and clean Vulkan teardown.
The fixture remains TestRelease-only and adds no public readback API.

Set `GOO_NATIVE_S15_RETENTION_GATE=1` on the same command to run the first S15
gate. It checks strict leaf `Container` and `Button` solid and rounded direct
hits, direct exact rebuilds, one-color and bounds misses, generic unsupported
fallback and recapture, old-bounds clearing, old-plus-new bounds union damage,
topology add/remove full-redraw fallback, dirty and reused chunk classification,
pending and applied swapchain image versions, unchanged pixels outside the
mutation, and clean readback and window teardown. Exact leaf validity uses owner
identity, `ScenePaintVersion`, bit-exact logical bounds, packed payload, and radii.
Generic `ContentKey` and `TopologyKey` hashes do not validate exact leaf records
or exact-rebuild damage. On the generic partial-safe path they are only fast
prefilters. Reuse also requires exact retained draw metadata, bit-exact solid,
rounded, or per-edge border records, bounds, and resource identities.

The border-only case is a transparent leaf `Container` or `Button` with a solid
square per-edge border. Exact validity covers all four widths, all four zero
radii, all four packed colors, style, transform index, bounds, node kind, and
`ScenePaintVersion`. The gate checks initial and changed pixels, changes one top
edge color, proves one dirty 128-byte primitive record, verifies unchanged pixels
outside the border bounds, forces a generic rounded-border fallback, recaptures
the square border, and finishes on an exact warm hit. One retained border scene
draw can expand to four primitive records.

The same gate covers an eligible child-bearing `Container` or `Button` own solid
or rounded box. A parent hit or direct rebuild retains only the parent's own
record, then recursively compiles children through the generic path. Unsupported
parent state uses generic parent and child compilation and recaptures when the
own-box eligibility returns. Parent hit, mutation, warm hit, child continuation,
fallback, and recapture are represented by `parent_own_box=1` in the final gate
evidence.

The fixture directly records the exact last successfully presented image index,
its acquired applied version, the pending version assigned by that present, and
whether that acquisition promoted pending state. It pairs that state with the
actual frame damage and does not reconstruct damage from `sceneVersion - 1`.
Pixel assertions are a separate offscreen replay oracle, not a swapchain-image
readback claim. The
damage journal stores exact float-bit scale keys and physical framebuffer extent
per version, and any scale or extent transition forces full damage, including
scale plus mutation. Full-redraw frames record the current physical key before
the full override so a later image reacquisition cannot manufacture a scale
transition. Normal-blend solid, rounded, and square solid per-edge border scenes
do not depend on swapchain transfer-source support for partial safety. Actual
unsupported non-normal blends still use the full fallback.

Swapchain maintenance is mandatory at physical-device selection. The unsafe
no-fence fallback is retired. Windows qualification remains S19.

The gate also checks first-use writes and flushes, fence-safe no-clip typed
payload retention across both slots, and a 128-byte std430 primitive SSBO with
device-local storage and mapped staging. Window targets use two fence-safe slots
and offscreen uses one. Exact accepted per-slot history is committed only after
accepted submission or reconciliation. Buffer growth and device loss invalidate
history. First use, buffer generation changes, and record-count changes force
full upload. Exact record comparison coalesces consecutive dirty records into
128-byte ranges. Clean frames issue zero GPU copy ranges and zero flushes while
writing one staging candidate. Masks, layers, changed payload shape, abort,
recovery, and device loss use the invalidating fallback. Clips, transforms,
resources, layers, and effects remain full-redraw dependencies in this slice.

The final Linux gate reports
`s15-retention-gate: first_use_full=1 box_mutation=1 partial_damage=1
bounds_old_background=1 topology_add_full=1 topology_remove_full=1
exact_leaf_solid_rounded=1 exact_color_miss=1 exact_bounds_miss=1 exact_border_leaf=1
unsupported_fallback_recapture=1 parent_own_box=1
primitive_first_full=1 primitive_slots=2 primitive_warm_copy_zero=1
primitive_staging_candidate=1 primitive_mutation_dirty=1
primitive_mutation_written=128 primitive_topology_full=1
image_version_promotion=1 damageCount=28 dirtyChunkCount=0 reusedChunkCount=7
drawCount=198 recordCount=28 clipWritten=3664 clipSkipped=6336 clipMapped=10
clipFlushes=10 clipReuse=18 clipRetained=1 close=1`. The one-box and one-edge
border mutations each prove one dirty record, one range, 128 copied bytes, and
one flush. Topology add forces a full primitive upload, and both window slots
clean-reuse. Goo and
`Goo.AsyncReadbackSmoke` Release warnings-as-errors builds reported 0 warnings and
0 errors. Default async readback, the S09R pixel gate, S14 effects, rounded
overflow, FailedIdle, and proof scene readback passed on the real Wayland run. This
is not S15 completion, Windows qualification, or Vulkan validation evidence. The
effects gate samples the Shape outer shadow at x128, outside its x126 edge. The
former x129 point was in the lavapipe blur tail and could produce a false negative.

The opt-in legacy StocksGrid control uses 4,900 mounted local text Cells, seed 42,
490 mutation requests per frame with replacement, 30 warmups, and 120 measured
frames. Run one fresh process with `GOO_S15_STOCKS_ARM=retained`, then repeat with
`full`:

```sh
GOO_NATIVE_S15_STOCKS_GRID=1 GOO_S15_STOCKS_ARM=retained \
  GOO_S15_STOCKS_WARMUP=30 GOO_S15_STOCKS_SAMPLES=120 \
  SDL_VIDEODRIVER=wayland WAYLAND_DISPLAY=wayland-0 \
  GOO_VK_DIAGNOSTICS=1 \
  dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
```

The 2026-08-20 ABBAAB run produced zero partial frames and zero reused chunks in
both arms. All 4,902 chunks were dirty, current-thread allocation was
`6,075,995 B/frame`, and
median retained versus full total-frame P50/P95 was `35.040/56.016 ms` versus
`35.517/56.015 ms`. This is legacy StocksGrid evidence, not Q10 or a direct
Vulkan-versus-Ganesh comparison. No validation or Windows claim is made.

The focused StocksGrid virtualization gate runs both exact-cull modes and keeps
the renderer arm independent from the tree mode. The benchmark accepts
`GOO_S15_STOCKS_TREE=complete|virtualized`,
`GOO_S15_STOCKS_CULL=enabled|disabled`,
`GOO_S15_STOCKS_CLIP=legacy|explicit` with default `legacy`, and
`GOO_S15_STOCKS_OVERSCAN` with default `1`. The focused A/B/C profiles set
`GOO_S15_STOCKS_CLIP=explicit`. The legacy default remains available as the
semantic control. The virtualized arm keeps a fixed physical pool sized by the
viewport formula, suppresses offscreen Cell Builds, and reports logical,
visible, mounted, peak, reassignment, mutation, range, pool, and exact-text
counters:

```sh
GOO_NATIVE_S15_STOCKS_VIRTUALIZATION_GATE=1 \
  GOO_VK_DIAGNOSTICS=1 \
  SDL_VIDEODRIVER=wayland WAYLAND_DISPLAY=wayland-0 \
  dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
```

The profiling lane uses the same command with
`GOO_NATIVE_S15_STOCKS_GRID=1`, `GOO_S15_STOCKS_ARM=retained|full`,
`GOO_S15_STOCKS_TREE=complete|virtualized`,
`GOO_S15_STOCKS_CULL=enabled|disabled`,
`GOO_S15_STOCKS_CLIP=legacy|explicit`, and optional
`GOO_S15_STOCKS_OVERSCAN=0|1`.
The benchmark drains native SDL events before every warmup and measured frame,
outside the measured frame interval, so long Wayland runs continue answering
compositor events without charging ambient event work to the renderer sample.

The canonical Q10 frame lane uses Release NativeAOT with 300 warmups, 2,000
measured frames, fixed 1/60-second updates, and five isolated processes per
workload. Set `Q10_BINARY` to the published NativeAOT `Goo.Tests` executable:

```sh
Q10_BINARY=/path/to/published/Goo.Tests
SDL_VIDEODRIVER=wayland WAYLAND_DISPLAY=wayland-0 \
  GOO_NATIVE_S15_Q10_GATE=1 GOO_S15_Q10_WORKLOAD=table \
  GOO_S15_Q10_WARMUP=300 GOO_S15_Q10_SAMPLES=2000 \
  GOO_VK_DIAGNOSTICS=1 \
  "$Q10_BINARY"
```

Run the dedicated S07 Effects/Offscreen stage timestamp gate with the final
five-process NativeAOT validation-layer protocol:

```sh
Q10_BINARY=/path/to/published/Goo.Tests
SDL_VIDEODRIVER=wayland WAYLAND_DISPLAY=wayland-0 \
  VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation \
  GOO_NATIVE_S15_Q10_STAGE_TIMESTAMP_GATE=1 \
  GOO_S15_Q10_WORKLOAD=image-effects \
  GOO_S15_Q10_WARMUP=300 GOO_S15_Q10_SAMPLES=2000 \
  GOO_VK_DIAGNOSTICS=1 \
  "$Q10_BINARY"
```

Run the command in five fresh NativeAOT processes on the NVIDIA RTX 3080 with
driver 610.57.04 and `wayland-0`. Each process uses the `image-effects`
workload, 300 warmup frames, and exactly 2,000 measured samples. Keep the
validation layer enabled for this route.

The implementation keeps the existing Upload and Main timestamps. The fixed
diagnostics query pool is 2 frame slots x 4 stages x 16 scopes x 2 queries =
256 queries. Effects scopes cover 8 backdrop copies and 8 composites. Offscreen
scopes cover 8 layer subtree passes. Main and Upload are scope-0 wrappers.
Resolution is asynchronous and fence-owned. No wait-bit query is used.

The final Linux route had all five processes exit 0. Median Effects
P50/P95/P99/Worst was `207872/218112/948224/1359872 ns`, and median Offscreen
was `73728/77824/79872/404480 ns`. Every frame reported Effects
`scopeCount=16` and Offscreen `scopeCount=8`, with zero drops, exact
completed-frame correlation, zero warm Vulkan object and device-memory
allocations, and clean validation.

The NativeAOT binary was `5,757,936` bytes with SHA-256
`57aeae31abc6214c770f643695a3c407a017cf7098c6691f2d0659f24a5a5c99`. Raw logs
are `artifacts/reports/s15-q10/stage-timestamp-final-run-{1..5}.log`.

The canonical dynamic Q10 five-process route after instrumentation reported
CPU P50/P95/P99 `5,151,040/5,816,795/7,675,581 ns` and GPU Main P50/P95/P99
`1,553,408/2,023,424/2,296,832 ns`, versus accepted pre-stage
`846,848/933,888/946,176 ns`. The diagnostics-enabled query-write tax is
`+83.434%/+116.667%/+142.749%`, not an unqualified production regression.
Raw logs are `artifacts/reports/s15-q10/stage-timestamp-q10-final-run-{1..5}.log`.

T04 FailedIdle validation passed 1,000 operations, 10 surface losses, and 3
device losses. After final recovery it emitted `stage_timestamps=1` following a
positive Effects event and a successful Offscreen event. Sub-resolution
Offscreen durations may quantize to zero. The JIT validation stage gate also
passed 2,000 samples. `artifacts/reports/s15-q10/summary.json` contains
`stage_timestamp_followup`.

Disabled diagnostics still create no query pool or timestamp commands, so the
measured GPU query-write tax does not apply when diagnostics are disabled.
Windows repeat remains open. These GPU
timestamps do not qualify actual presentation. Actual SDL acceptance and
Wayland presentation-time feedback remain open.

The synthetic startup and input latency selector uses the same published
NativeAOT executable:

```sh
Q10_BINARY=/path/to/published/Goo.Tests
SDL_VIDEODRIVER=wayland WAYLAND_DISPLAY=wayland-0 \
  GOO_NATIVE_S15_Q10_LATENCY_GATE=1 GOO_VK_DIAGNOSTICS=1 \
  "$Q10_BINARY"
```

`GOO_NATIVE_S15_Q10_LATENCY_GATE=1` is checked before
`GOO_NATIVE_S15_Q10_GATE=1` and returns after the dedicated latency route. It
does not use `GOO_S15_Q10_WORKLOAD`, `GOO_S15_Q10_WARMUP`, or
`GOO_S15_Q10_SAMPLES`. The route has fixed 300 warmup frames and 2,000 input
samples, cycles through pointer, key, and committed-text fixture injections,
and forces one render per sample. It bypasses SDL polling. Run it in five fresh
processes for the recorded five-process medians. The handoff gate ends at
successful `vkQueuePresentKHR` completion. Present-fence completion observations
are upper bounds from later UI-thread polling, not exact presentation times.
Actual SDL acceptance, Wayland presentation-time feedback, display scanout, and
input-to-photon timing remain open.

The harness accepts these workload values:

| `GOO_S15_Q10_WORKLOAD` | Manifest or fixture values |
|---|---|
| `table` | 100,000 rows by 12 columns, 32 px rows, eight-row overscan, 1,440 by 900, seed 2,654,435,761 |
| `topology` | 5,000 nodes, 15,000 edges, 32 groups, 400-node visible target, 1,920 by 1,080, seed 2,246,822,519 |
| `boxes-sparse` | 1,000 boxes at 1,000 by 640, one seeded box mutation per frame |
| `boxes-full` | 1,000 boxes at 1,000 by 640, all boxes mutated per frame |
| `small-animation` | 200 static cards plus one animated card, 1,280 by 720, seed 1,103,515,245 |
| `text-editing` | Revision 2, 1 MiB UTF-8 corpus, 32 visible lines, 96-byte full lines, 64-byte final line, one-character edit |
| `image-effects` | 64 generated 256 by 256 images and 256 effect cards, 1,920 by 1,080, seed 668,265,263 |
| `resize-dpi` | 1,280 by 720 at scale 1.0, 1,536 by 864 at 1.5, and 1,920 by 1,080 at 2.0; transition every 20 frames |
| `three-window` | Three windows at 1,280 by 800, 960 by 640, and 960 by 640, seed 1,274,126,177; rotate focus every 60 frames |
| `true-idle` | One 1,280 by 720 scale-1 window observed for 60 seconds with no input |

Replace `table` with any selector above. The `three-window` selector dispatches
to a three-window benchmark with one process event pump, focus rotation every
60 measured frames, pointer/keyboard/text input on the selected window, and
submit/present only for dirty windows. Focus-loss dirty renders are accounted
separately from the 2,000 selected-window frames, and clean local frame slots
must remain unchanged.
The `three-window` and `resize-dpi` routes require the current-host KWin scale-1
wrapper `.github/scripts/with-kwin-scale-one.sh` to enforce deterministic display
scale 1 under direct KWin output scale control.

Run the three-window gate under the direct scale-1 wrapper:

```sh
Q10_BINARY=/path/to/published/Goo.Tests
GOO_KWIN_OUTPUT=DP-3 XDG_RUNTIME_DIR=/run/user/1000 WAYLAND_DISPLAY=wayland-0 \
  .github/scripts/with-kwin-scale-one.sh \
  env GOO_NATIVE_S15_Q10_GATE=1 GOO_S15_Q10_WORKLOAD=three-window \
  GOO_S15_Q10_WARMUP=300 GOO_S15_Q10_SAMPLES=2000 \
  GOO_VK_DIAGNOSTICS=1 \
  "$Q10_BINARY"
```

Run the resize-DPI gate under the direct scale-1 wrapper:

```sh
Q10_BINARY=/path/to/published/Goo.Tests
GOO_KWIN_OUTPUT=DP-3 XDG_RUNTIME_DIR=/run/user/1000 WAYLAND_DISPLAY=wayland-0 \
  .github/scripts/with-kwin-scale-one.sh \
  env GOO_NATIVE_S15_Q10_GATE=1 GOO_S15_Q10_WORKLOAD=resize-dpi \
  GOO_S15_Q10_WARMUP=300 GOO_S15_Q10_SAMPLES=2000 \
  GOO_VK_DIAGNOSTICS=1 \
  "$Q10_BINARY"
```

### Reversible output-scale behavior and prerequisites

- **Environment and Output**: Set `GOO_KWIN_OUTPUT` to an enabled, connected KWin output (on this workstation: `GOO_KWIN_OUTPUT=DP-3`, `XDG_RUNTIME_DIR=/run/user/1000`, `WAYLAND_DISPLAY=wayland-0`).
- **Reversible Scale Control**: The wrapper inspects the current output scale via `kscreen-doctor --json`, sets scale 1, re-verifies scale 1, exports `SDL_VIDEODRIVER=wayland`, executes the command, and restores and re-verifies the original display scale on every exit or signal (`EXIT`, `HUP`, `INT`, `QUIT`, `TERM`). The display will briefly change scale during the run and return to its original scale upon completion.
- **Rejected Alternatives**: `SDL_VIDEO_WAYLAND_MODE_SCALING=0` is ineffective under the installed SDL3. Running under a nested KWin virtual compositor exposes scale 1 but Vulkan clients exit 139 (SIGSEGV). A windowed nested KWin inherits the parent fractional scale. Direct output scale control via `kscreen-doctor` is the verified environment.
- **Current Observed Blockers**: Under direct scale 1, the canonical 300/2,000 three-window run passes with exact scale-1 metrics, 2,033 submit/present, both slots, liveness, resource zero, and `close=1`. The resize-DPI route reaches earlier transitions successfully but still fails the exact native resize returning to state0 at frame 120. This is a product/fixture failure after the environment prerequisite, not an environment setup failure.

The `true-idle` selector dispatches to the S19 idle implementation rather than
the 300/2,000 frame loop. Use the isolated nested-KWin scale-1 command in the S19 section above
for the accepted five-process true-idle result. The final route recorded a
0.1078% median of one CPU core and zero work or allocation.

The current Vulkan frame workloads pass their absolute CPU/GPU, exact
submit/present, and warm resource gates. The text-editing general frame gate
now passes under the dated fast-hit follow-up below. The synthetic
input-injection handoff route also passes its gate. Actual SDL acceptance and
Wayland presentation-time/display feedback remain open. Full Q10 exit remains
blocked by the resize-DPI route and the remaining provenance, memory, package,
clean-source, SDL acceptance/display-feedback, and Windows evidence.
The final 2026-08-24 manifest expansion used the 5,708,704-byte NativeAOT
binary with SHA-256
`50595ae3be03c22fb42c1adea40801d5a511718f6acdda1ec0622a603eb4171f`.
Raw evidence is in `artifacts/reports/s15-q10/summary.json` and the
`manifest-final-*` logs. The source was dirty for that run.

The 2026-08-24 text-editing fast-hit follow-up used five isolated NativeAOT
processes, 300 warmups, and 2,000 measured frames. Its process-median CPU
P50/P95/P99 is `0.497938/0.552471/0.701151 ms`, GPU P95 is `0.054272 ms`,
and managed allocation P50 is `63,184 B`. All five processes exit 0 with zero
validation errors, zero result failures, and `fatal_code=0`. The follow-up
binary is 5,708,704 bytes with SHA-256
`7751034df36fd2f83db3ef13a175728fddc03f8d875100b05b1b325149324065`.

The fast hit applies to `Text` and `TextEditor` only. `TextEntry` remains on
full segment generation and full renderer validation because cached Entry proof
repeatedly lost S17 protected-mask pixels. The active cache remains strong
across atlas publication for the same reason. A repository search found no
in-place shaped payload writer, so shape-reference identity is the assumption.

The prior manifest-expansion binary and text row remain historical before-state
evidence.
Against accepted Skia P95 `0.461491 ms`, the follow-up is `+0.090980 ms`
(`+19.714%`) slower, but passes the exact larger-of-3%-or-0.1-ms threshold:
`max(0.461491 * 1.03, 0.461491 + 0.1) = 0.561491 ms`, leaving
`0.009020 ms` of margin. Do not call the result faster than Skia.

Raw evidence is in `artifacts/reports/s15-q10/summary.json` and
`artifacts/reports/s15-q10/text-fast-hit-final-run-*.log`. The image-effects
component isolation remains JIT TestRelease diagnostic evidence only. It does
not change the official NativeAOT image-effects Pass or approve an image fix
or public API change.

The final fresh benchmark includes exact generic chunk proof and is a current-
binary control of retained compilation against an output-neutral generic
fallback. Each workload uses six case-isolated fresh processes in ABBAAB order,
three per arm, with 30 warmups and 120 samples over 1,000 leaves. Every cell
allocates `0 B`, matches output hashes, and reports 1,002 chunks and 1,000 draws.
Positive values use the generic arm as the denominator and mean retained is
faster than the generic fallback. These are CPU
scene-compile timings, not a historical pre/post product-binary comparison or a
full-frame/GPU result.

| Workload | P50 improvement | P95 improvement |
|---|---:|---:|
| Static solid | `+17.367%` | `+20.033%` |
| Static rounded | `+18.911%` | `+1.225%` |
| Mutation N1 | `+37.954%` | `+6.665%` |
| Mutation N100 | `+14.698%` | `+16.249%` |
| Mutation N500 | `+31.689%` | `+17.178%` |
| Mutation N1000 | `+13.321%` | `+12.634%` |

An earlier intermediate before direct exact rebuilds reported mutation N1000 at
`-13.618%` P50 and `-44.275%` P95. It was rejected and is not accepted
evidence. No long compiler-only benchmark harness is retained. The durable Q10
lane above supersedes the former missing table/topology route. Windows and a
second real DPI remain S19 work.

The exploratory child-bearing parent own-box control is plan-only and uses the
current binary in ABBAAB order with 1,000 eligible parents and 1,000 generic-
compiled children, 30 warmups, and 120 samples per process. Both arms produce
the identical hash `10921959993146536336`, 2,002 chunks, 2,000 draws, and `0 B`
allocations at P50 and P95. The raw process P50/P95 values are:

| Fresh process | Retained P50/P95 ns | Generic P50/P95 ns |
|---|---:|---:|
| 1 | `2067689 / 2574675` | `2713707 / 3939820` |
| 2 | `2017164 / 2655698` | `2724658 / 3069288` |
| 3 | `740817 / 2794309` | `2695764 / 2936678` |

The median cross-process improvement is `+25.668%` P50 and `+13.475%` P95
for retained versus generic. Record, submit, GPU, and full-frame evidence is
unavailable. This makes no Q10 or Skia claim. No Q10 virtual-table/topology
harness or frozen reference exists, so S15 remains open. No long benchmark
harness is retained.

The exact-border current-binary control is plan-only and uses 1,000 transparent
square solid four-sided border leaves in ABBAAB order, with 30 warmups and 120
samples per process. Both arms produce hash `5436057910800725072`, 1,002 chunks,
1,000 scene draws, and `0 B` allocations. The scene draws expand to 4,000
primitive records. Median retained P50/P95 is `1882942 / 1972601 ns`. Median
generic P50/P95 is `2043204 / 2202644 ns`. Retained compilation is `+7.844%`
faster at P50 and `+10.444%` faster at P95. Record, submit, GPU, and full-frame
evidence is unavailable. This makes no Q10 or Skia claim. No long benchmark
harness is retained.

Set `GOO_NATIVE_S14_ROUNDED_OVERFLOW_GATE=1` on the same command to run the
rounded-overflow gate. It captures rounded hidden and scrolling viewports before
and after a public `ScrollTo`, checks child content and eight clipped corners,
rejects unsupported-scene diagnostics, and verifies readback and window cleanup.

The same lane has an opt-in measurement mode. Run two isolated Release
processes, one for each `GOO_S14_READBACK_ARM` value:

```sh
GOO_S14_READBACK_MODE=measure GOO_S14_READBACK_WARMUP=8 \
  GOO_S14_READBACK_SAMPLES=64 GOO_S14_READBACK_ARM=disabled \
  SDL_VIDEODRIVER=wayland VK_INSTANCE_LAYERS=VK_LAYER_KHRONOS_validation \
  .github/scripts/with-headless-wayland.sh env \
  GOO_VK_DIAGNOSTICS=1 \
  dotnet tests/Goo.AsyncReadbackSmoke/bin/Release/net10.0/Goo.Tests.dll
```

Repeat the command with `GOO_S14_READBACK_ARM=active`. The disabled arm performs
only forced Window renders. The active arm calls the internal TestRelease
`RequestReadback`, `PollReadback`, and `TakeReadbackResult` seam for every sample;
the request itself renders the same static cell once, so the fixture does not add
an extra render to active samples. Both arms use the same cell and explicit
64x64 region, and the run has no production env-driven capture. Warmup defaults
to 8 and is bounded at 64. Samples default to 64 and are bounded at 512.

The measurement allocates sample arrays before warmup and uses fixed
`0.0166666667` delta for disabled renders. Each output reports frame
P50/P95/P99/P99.9/max, disabled hot-path allocations, active request/completion/
total allocations, warm managed bytes, and an empty-timer `harness_p95_ns`.
Harness time is reported, never subtracted. Readback lifecycle fields prove
accepted/completed/taken deltas. CPU timing fields are
`normal_scene_record_cpu_*`, `request_submit_cpu_*`,
`completion_observed_before_copy_*`, `request_ready_after_copy_*`, and
`cpu_copy_*`; GPU fields are dedicated `gpu_scene_replay_*` and `gpu_copy_*`
values when `gpu_timing_available=1`. The line also reports requested region
(staging copy) bytes, Vulkan resource create/destroy deltas, and nominal
combined offscreen-image-plus-staging `resource_resident_*` peak,
before-close, and after-close bytes. Keep the host, driver, power state,
display size, workload, and environment fixed. Frame P95 is compositor and
present sensitive, so do not subtract isolated runs as a precise readback cost.
Use the disabled lifecycle/resource invariants to prove the unused path stays
inactive and the active timing fields to measure completion cost. The README
intentionally does not record a particular benchmark result.

The durable S13 EvenOdd ABI gate uses a deterministic 256-hole corpus with
1,028 curves, 13,508 words, 32 horizontal and vertical bands, and 64 warm
encodes; it requires stable identity and zero managed allocation. The final
local Linux Wayland and NVIDIA RTX 3080 Release 512-hole stress gate used one
1,800 by 1,800 EvenOdd path and 180 demand-active frames. Its reproduced
pre-change MainPass P95 was `14.759936 ms`. Three final runs retained the last
30 MainPass samples and measured P95 `7.779328 ms`, `7.833600 ms`, and
`7.835648 ms`, with P99 `7.814144 ms`, `7.838720 ms`, and `7.836672 ms`.
All runs pass the 8.33 ms P95 and 16.67 ms P99 gates with zero managed
allocation, validation errors, result failures, fatal records, or dropped
validation messages. The bounded trace/result rings reported expected
overwrites during each 180-frame run. The temporary stress harness was removed
after this evidence was recorded.

Stage the minimal release bundle after the focused package lanes:

```sh
.github/scripts/stage-linux-x64.sh \
  artifacts/publish artifacts/linux-x64 artifacts/symbols
```

The normal package validation, release bundle allowlist, and non-S11 package smoke
remain separate release checks.
