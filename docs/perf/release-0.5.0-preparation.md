# Goo 0.5.0 release preparation

The candidate includes the [post-checkpoint fixes](post-checkpoint-2026-09-05.md) and [non-UAT implementation](non-uat-followup-2026-09-05.md). Versioned packages, templates, tools, and onboarding text use 0.5.0. The changelog records API migration details and measured performance limits.

## Release corrections

- Linux CI now invokes sampled-image readback, liquid-glass alpha, and shader-effect replacement/recovery gates.
- Image readback uses expected pixel regions instead of a GPU-specific golden hash. Nearest and linear sampling must differ within a run, and linear output must survive resource rehydration unchanged. The old broken sampled-image shader fails the portable region assertions.
- macOS SDL and text-native builds explicitly target 14.0, matching the existing minimum-version promise. The package validator checks Mach-O architecture, minimum OS, install names, dependency policy, and current text-native provenance. The cached macOS candidate requires 15.0 and is rejected.
- Gallery shader bundles are compiled with the pinned Linux toolchain and transferred to the macOS job with source, authoring, binary, and commit provenance. The macOS publish must validate this artifact before copying it. It does not invoke the Linux/Windows-only Slang compiler.

## Verification and release boundary

Local 0.5.0 verification passes 317 Core tests, 12 API/documentation tests, 10 SVG tests, and the three new native CI gates on lavapipe with Khronos validation. The portable image assertion rejects the old shader as a negative control.

Gallery rebuild passes with Slang unavailable and all 24 precompiled bundle/manifest files copied unchanged. Missing artifacts, a stale commit, modified source, and modified bundle data are rejected. API regeneration is unchanged. Strict G# lint, canonical ShaderGen checks, workflow shell syntax, and the dependency-vulnerability gate pass.

The [verification summary](evidence/release-0.5.0/verification.json), [file hashes](evidence/release-0.5.0/files.json), and [raw evidence archive](evidence/release-0.5.0/verification.tar.gz) preserve local results. Extract the archive into a temporary directory. The expected old-shader failure is recorded separately from successful gates.

These local checks do not qualify a complete release package. A fresh hosted macOS build must produce the corrected native payloads. The existing dependent Linux CI job must then pack and validate all six packages, install and build the generated template, install the developer tools, publish managed and NativeAOT package consumers, and validate native dependencies, symbols, checksums, and bundle size.

Tag only after those jobs pass on the candidate commit. Physical-Mac UAT remains deferred. No new hardware support or broad performance claim is introduced by release preparation.
