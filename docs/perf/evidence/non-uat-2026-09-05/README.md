# Non-UAT evidence

Start with the [consolidated report](../../non-uat-followup-2026-09-05.md).

- `gpu-layers-off/report.md` is the authoritative performance report. Its adjacent JSON files record pooled and per-process measurements, decisions, validation, and artifact provenance. `gpu-layers-off.tar.gz` contains the raw CSV, logs, captures, scripts, and an archive map.
- `gpu-validation-enabled.tar.gz` preserves the earlier run as historical and correctness evidence. Its adjacent report and JSON are retained unchanged. They are superseded for performance claims. The historical report transcribed the terminal bundle hash incorrectly. The correct measured SHA-256 is `f25adebefb6563663fec681f4027e40a395bdced41ece691b6d4b8a8a8614758`.
- `shader-fixes/` records the sampled-image and liquid-glass alpha regressions and fixes, native pixel checks, generator checks, and runtime provenance.
- `drag-drop/` records the focused and complete Core suites, public API contracts, generated documentation, Gallery build, and sparse-allocation checks. Earlier failed attempts remain visible alongside the named successful final runs.
- `final-verification/` records fresh integrated builds, queue and effect regression gates, readback close, clip capture, liquid alpha, vector quality, canonical ShaderGen check, strict repository lint, and preservation of the prior source patch. Each command has a JSON result and hashed log.
- `environment.json` identifies the host. `integrated-source-artifact-hashes.json` identifies final source and built artifacts. Performance uses separately frozen binaries recorded in the GPU provenance. The integrated native gates use the rebuilt final source.

`SHA256SUMS` covers all adjacent evidence files and both compressed archives. Archive maps record original and stored hashes. Archived G# source has a `.gs.txt` suffix to preserve evidence without including it in source discovery. Large historical PPM and patch files use an inner gzip layer recorded by the map. Extract archives into a temporary directory.
