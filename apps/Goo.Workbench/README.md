# Workbench

Native Goo mockup of the [corporate UI studies](../../../design-aesthetics/THEMES.md). Compare Division, Instrument, and Registry using the three theme tabs above the header. Switching preserves the workspace state. Division opens by default. Use `WORKBENCH_THEME=Instrument` or `WORKBENCH_THEME=Registry` to choose the initial variant.

The shared project workspace includes search, status filters, a detail inspector, task toggles, and in-memory sample creation.

```sh
dotnet run --project apps/Goo.Workbench/Goo.Workbench.gsproj -c Release
```

Run from the Goo repository root. Use `WORKBENCH_WIDTH=600` for a narrow initial window. Resize across 1120 and 760 logical pixels to switch between three columns, two columns, and a single pane. Select a project to open narrow details. Back to projects or Escape returns to the list. Tab and Shift+Tab navigate controls. Enter or Space activates a button.

Search matches project names and types without case sensitivity. Filters use task completion state. Tasks toggle and update the row, count, and progress bar. Add sample project creates a session-only item and selects it. Compact rows changes row density. Nothing is saved or read from project locations. The displayed locations are sample data.

Fonts are bundled static IBM Plex Sans Regular/Semibold and Plex Mono Regular from the supplied design assets. Licenses are in [Assets/OFL.txt](Assets/OFL.txt) and [Assets/OFL-Mono.txt](Assets/OFL-Mono.txt).

## Architecture

| Layer | Files | Responsibility |
| --- | --- | --- |
| Composition root | [Program.gs](Program.gs) | Register fonts, construct the service and view, open the native window |
| Models | [ProjectItem](Models/ProjectItem.gs), [ProjectTask](Models/ProjectTask.gs), [WorkspaceState](Models/WorkspaceState.gs) | Domain data, completion state, search/filter/selection state. No Goo dependencies or element handles |
| Services | [WorkspaceService](Services/WorkspaceService.gs) | Seed session data, query/filter/select projects, add samples, toggle tasks, notify the view |
| Views | [WorkbenchView](Views/WorkbenchView.gs), [WorkbenchFocus](Views/WorkbenchFocus.gs) | Compose the screen, project state into inputs, own theme/density/resize state, manage focus handles and subscription lifetime |
| Components | [Navigation](Components/Navigation/NavigationCell.gs), [projects](Components/Projects/ProjectListCell.gs), [tasks](Components/Tasks/TaskPanelCell.gs), [theme](Components/Design/Theme.gs) | Keyed typed Cells with local input snapshots and explicit callbacks. Each Cell lives in its own feature file, with local or explicitly shared input types |
| Verification | [Smoke](Verification/Smoke.gs), [rebuild boundaries](Verification/CellBoundaries.gs) | Native interaction checks, opt-in rebuild assertions, and update-cost measurements |

Services depend on models. Views depend on services, models, and components. Components depend on domain data and rendering helpers, and emit callbacks. Components never reach into a root view or service. Element handles live in the view and arrive as explicit component inputs.

`WorkspaceService.Changed` invalidates the small composition view. Typed input equality then skips unaffected Cells. Search, result counts, project information, status, location, task progress, and individual rows have separate boundaries. Project task revisions expose changes behind a retained model reference. Immutable project metadata and explicit completion values keep unchanged rows stable.

`ComponentBuilds` is an opt-in component diagnostic used by the boundary check. Recording is disabled during normal use. The check proves that selecting a project rebuilds exactly the two affected project rows while chrome, search, counts, and footer stay unchanged. Toggling a task rebuilds only its task row and affected progress/row content. Searching preserves the unchanged visible row and inspector.

The service owns only session data. No persistence, network backend, custom renderer, or dependency-injection framework is introduced.

Current build status, previews, and runtime limitations are in the [verification report](../../../design-aesthetics/VERIFICATION.md). Use `--no-build` with the run command to launch the verified local binary while Goo vector work is in progress.

## Validation

```sh
gslint --strict --severity GL0006=none apps/Goo.Workbench
dotnet build apps/Goo.Workbench/Goo.Workbench.gsproj -c Release
WORKBENCH_SMOKE=1 dotnet run --project apps/Goo.Workbench/Goo.Workbench.gsproj -c Release --no-build
WORKBENCH_SMOKE=1 WORKBENCH_VERIFY_CELLS=1 dotnet run --project apps/Goo.Workbench/Goo.Workbench.gsproj -c Release --no-build
python3 ../design-aesthetics/verify.py
```

Leave `GOO_DEVTOOLS` unset for normal interaction. For diagnostics, launch with `GOO_DEVTOOLS=1`. Use the repository's Goo.DevTools CLI to request a tree snapshot or PNG capture. Accessibility declarations do not establish native screen-reader support. Startup and frame-time targets in the design system require separate measurements.

The lint command disables only GL0006, which requests code documentation comments. This sample follows the workspace convention of keeping documentation outside code. The smoke check routes actions through the native accessibility tree and checks search, filters, task state, density, resize, and focus restoration. It does not emulate physical keyboard input.

## Interaction measurement

```sh
WORKBENCH_SMOKE=1 WORKBENCH_BENCH=1 GOO_FRAME_PROFILE=1 dotnet run --project apps/Goo.Workbench/Goo.Workbench.gsproj -c Release --no-build
```

Run without `GOO_DEVTOOLS`. The benchmark sends native accessibility actions and measures action dispatch plus one window pump. It emits CSV lines for 320 selections, filters, and theme changes. Discard the first 64 samples per group for warm comparisons. The pump can update the tree without presenting when the native surface is throttled, so this measures UI update cost, not physical click-to-display latency. See the [performance report](../../../design-aesthetics/PERFORMANCE.md).
