# Goo in-app drag/drop verification

- `core-focused-rerun.log`: focused drag/drop tests passed, 8 of 8.
- `core-full-final-rerun.log`: full Core behavior suite passed, 317 of 317.
- `api-full.log`: public API and documentation contracts passed, 12 of 12.
- `api-docs-generate.log`: generated 15 API pages from the Release XML output.
- `gallery-build-rerun.log`: Gallery Release build passed with 0 warnings and 0 errors using `SLANG_SDK=/tmp/goo-slang-2026.16`.
- `gslint-final-source-rerun.log`: scoped strict G# lint passed with the repository GL0005 and GL0006 severity exclusions.
- `git diff --check`: passed with no output.
- Default Blob and Node retained allocation assertions remain unchanged. The drag coordinator adds 48 bytes per Window for session and candidate references and scalars. Its target hit path allocates lazily on the first accepted drag. A warmed coordinator with no drag allocates 0 bytes across 1,000 drains.

Earlier failed logs are retained to show the fixed payload fixture lifetime ambiguity, missing pinned Slang environment, Gallery smart-cast syntax error, fixture nullability error, and initial eager drag hit-path allocation.
