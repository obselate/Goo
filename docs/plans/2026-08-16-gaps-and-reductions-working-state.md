# Gaps and Reductions Working-State Lock

Date: 2026-08-16

Branch: `gaps-and-reductions`

Entry HEAD: `705e104dd845a81e29676f7948c1b3a7deeb7dff`

Entry commit: `reduce: dedupe interop host and resource helpers (REDUCTIONS.md phase 2, batch 3)`

## Entry status

The branch was correct, but the working tree was not clean at wave entry. It contained 22 modified
tracked files and four untracked planning artifacts. No entry changes were discarded.

Modified tracked files:

- `.github/scripts/validate-readme-examples.py`
- `.gitignore`
- `CHANGELOG.md`
- `Goo.InternalTextInterop/ShapedRun.cs`
- `Goo.InternalTextInterop/TextShaping.cs`
- `Goo/Accessibility/Accessibility.gs`
- `Goo/Goo.gsproj`
- `Goo/Layout/Layout.gs`
- `Goo/Rendering/ImageLayout.gs`
- `Goo/Rendering/PainterParts/Painter.Shape.gs`
- `Goo/Rendering/TextEditorLayout.gs`
- `Goo/Rendering/TextLayout.gs`
- `Goo/Text/TextDocument.gs`
- `Goo/Text/TextEditorController.gs`
- `Goo/Tree/ImageSource.gs`
- `Goo/Tree/Reconciler.gs`
- `Goo/Tree/TextEditor.gs`
- `Goo/Window/Window.gs`
- `Goo/Window/WindowParts/Window.Host.gs`
- `Goo/Window/WindowParts/Window.Sdl.gs`
- `tests/Goo.PackageSmoke/Goo.PackageSmoke.gsproj`
- `tests/Goo.Tests/Contracts/PublicDocumentationTests.cs`

Untracked planning artifacts:

- `GAPS-AND-REDUCTIONS.md`
- `IMPLEMENTATION-PLAN.md`
- `PLAN-FOR-REVIEW.md`
- `VULKAN-SKIA-REPLACEMENT.md`

The tracked diff at entry was 201 insertions and 153 deletions. It represented the candidate G#
0.4.1 migration, the fixes needed to retain text and allocation gates, and documentation updates.
It did not contain a Vulkan implementation.

## Locked inputs

| Input | Identity |
|---|---|
| G# SDK | `Gsharp.NET.Sdk/0.4.1` |
| G# release tag | `v0.4.1` |
| G# source commit | `d670ac98c03e0b0f7c9ac965f5fa3914712f09de` |
| G# package SHA-256 | `fa379d5d68c2286afaee2d429dfad4585cfa25fe8495916cb7d5b41837099e63` |
| NuGet source | `https://api.nuget.org/v3/index.json` only |
| Authoritative decisions | `PLAN-FOR-REVIEW.md`, SHA-256 `c1e5f801df5e1688c1b42aaf3c28c1462f3731a130bb16999141c5414be62711` |
| Implementation plan | `IMPLEMENTATION-PLAN.md`, SHA-256 `9822fd7317969939f04f1281be2bdb7de209f2128174170f06c12c158a38a7d4` |
| Supporting roadmap | `GAPS-AND-REDUCTIONS.md`, SHA-256 `2a844768eb0cee44ca95b0996f456505352749b521bb1804c279d511aa3d0edb` |
| Skia replacement inventory | `VULKAN-SKIA-REPLACEMENT.md`, SHA-256 `5e61a4629ed6716b834d1ae98a69bf23ff8d08381613d9e2efe1250f8405f520` |
| Release baseline | `docs/perf/RELEASE-BASELINE.md`, SHA-256 `e9900802d0b6723752862d29c13414cb984bd3c3dbec58cfc2f30c6cbbc221fe` |
| Premigration Skia evidence | `docs/perf/2026-08-07-skia4-premigration-baseline.md`, SHA-256 `c92d209f2224552362ffa253ffa455c3eae22874ad30238f3b212fc7828071bc` |

## Boundary correction

`Goo.InternalTextInterop` remains intact through the non-shipping Vulkan proof. It owns the verified
current Skia, SDL, text, image, and native lifetime baseline. Moving those responsibilities to G#
and deleting the C# helper occur only during the S18 atomic product cutover after the replacements
pass their Windows and Linux gates.

The final product boundary is unchanged. Goo core and every Goo-owned runtime helper must be G#
only after S18. External and vendored dependencies such as Yoga.Net may remain C#.

## Excluded local state

The nested `gsharp` checkout was dirty and did not contain the official 0.4.1 tag. It was not used
or modified for the audit. Official history was inspected in a separate temporary clone, and the
compiler matrix restored the exact public NuGet package.

## Lock rule

This working set may be committed only after the exact SDK restore, Release build, package consumer,
historical findings matrix, API and XML documentation checks, and existing behavior and allocation
gates pass. Temporary probes and temporary upstream clones must not enter the repository.
