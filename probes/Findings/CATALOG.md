# G# finding coverage

## Scope

- Findings 01 through 18 were present before this sweep.
- Findings 19 through 57 were added for documented gaps found in repository documents and nram bug records.
- `PASS` means the regression case succeeds on the pinned SDK.
- `REPRO` means the pinned SDK reproduces the documented failure.
- `CONTROL` means the general minimal case succeeds, but the original integration-specific failure is not isolated.
- `DIAGNOSTIC` means the former compiler crash is now a stable compiler diagnostic.

## Sweep result

| Result | Count |
|---|---:|
| Verified reproduction on the documented SDK | 16 |
| Still reproduced on SDK 0.4.59 | 13 |
| Resolved on SDK 0.4.59 | 3 |
| Passing regression | 17 |
| Non-reproducing control | 5 |
| Stable diagnostic | 1 |

## Existing coverage

| IDs | Coverage | Source |
|---|---|---|
| 01-18 | Pre-existing compiler and cross-assembly findings | [`docs/audits/2026-08-16-gsharp-0.4.1-findings.md`](../../docs/audits/2026-08-16-gsharp-0.4.1-findings.md) and source metadata in each probe |

## Added coverage

| ID | Finding | SDK | Result | Source |
|---:|---|---:|---|---|
| 19 | Cross-assembly inherited generic member substitution | 0.4.59 | PASS, Release exit 0 | 0.4.1 audit Finding 19 |
| 20 | Mixed closed generic calls with implicit conversion | 0.4.59 | PASS, Release exit 0 | [`2026-08-03-gsharp-sync-audit.md`](../../docs/plans/2026-08-03-gsharp-sync-audit.md) |
| 21 | Explicit enum-base parser crash | 0.4.59 | DIAGNOSTIC, GS0005 and GS0125, no GS9998 | [`2026-08-03-gsharp-sync-audit.md`](../../docs/plans/2026-08-03-gsharp-sync-audit.md) |
| 22 | Object spread loses a write-only property | 0.4.59 | REPRO, build passes and assertion exits 1 | [`docs/api/style.md`](../../docs/api/style.md) |
| 23 | `return await` emission | 0.4.59 | PASS, Release exit 0 | [`ADR-0023`](../../gsharp/docs/adr/0023-async-state-machine.md), issue 132 |
| 24 | `await` inside `try` and `catch` | 0.4.59 | PASS, Release exit 0 | [`ADR-0023`](../../gsharp/docs/adr/0023-async-state-machine.md), issue 136 |
| 25 | `await` inside `try` and `finally` | 0.4.59 | PASS, Release exit 0 and cleanup runs | [`ADR-0023`](../../gsharp/docs/adr/0023-async-state-machine.md), issue 137 |
| 26 | Span ref-return element read and write | 0.4.59 | PASS, Release exit 0 | [`ADR-0056`](../../gsharp/docs/adr/0056-span-consumption-v1.md) |
| 27 | Slice-to-Span conversion in argument position | 0.4.59 | PASS, Release exit 0 | [`ADR-0056`](../../gsharp/docs/adr/0056-span-consumption-v1.md) |
| 28 | Boxed and nullable pattern subjects | 0.4.59 | PASS, Release exit 0 | [`cs2gs coverage matrix`](../../gsharp/docs/cs2gs-coverage-matrix.md), issue 1923 |
| 29 | `Index`-typed range local | 0.4.59 | PASS, Release exit 0 | [`cs2gs coverage matrix`](../../gsharp/docs/cs2gs-coverage-matrix.md), issue 1894 |
| 30 | `Equals(object)` with an `is` pattern | 0.4.59 | PASS, Release exit 0 | [`cs2gs coverage matrix`](../../gsharp/docs/cs2gs-coverage-matrix.md), issue 1917 |
| 31 | Async lambda | 0.4.59 | PASS, Release exit 0 | [`cs2gs coverage matrix`](../../gsharp/docs/cs2gs-coverage-matrix.md), issue 1919 |
| 32 | Data-class `with` initializer | 0.4.59 | PASS, Release exit 0 | [`cs2gs coverage matrix`](../../gsharp/docs/cs2gs-coverage-matrix.md), issue 1892 |
| 33 | Generic class primary constructor | 0.4.59 | PASS, Release exit 0 | [`cs2gs coverage matrix`](../../gsharp/docs/cs2gs-coverage-matrix.md), issue 1920 |
| 34 | Array and string range expressions | 0.4.59 | PASS, Release exit 0 | [`cs2gs coverage matrix`](../../gsharp/docs/cs2gs-coverage-matrix.md), issue 1896 |
| 35 | Target-typed collection conversion | 0.4.59 | PASS, Release exit 0 | [`cs2gs coverage matrix`](../../gsharp/docs/cs2gs-coverage-matrix.md), issue 1897 |
| 36 | Bound pattern variable | 0.4.59 | PASS, Release exit 0 | [`ADR-0115`](../../gsharp/docs/adr/0115-csharp-to-gsharp-migration-tool.md), issue 993 |
| 37 | `ReadOnlySpan` field in a ref struct | 0.4.59 | PASS, Release exit 0 | [`ADR-0056`](../../gsharp/docs/adr/0056-span-consumption-v1.md), issues 375 and 382 |
| 38 | Mixed numeric equality invalid IL | 0.3.319 | REPRO, `InvalidProgramException`, exit 134 | nram compiler bug record |
| 39 | `Enum.HasFlag` invalid IL | 0.3.319 | REPRO, `InvalidProgramException`, exit 134 | nram compiler bug record |
| 40 | Package-level constant reads as zero | 0.3.319 | REPRO, assertion exits 1 | nram compiler bug record |
| 41 | Imported blittable CLR struct pointer rejected | 0.3.319 | REPRO, GS0398 | nram compiler bug record |
| 42 | Object initializer does not target-type an untyped lambda | 0.3.319 | REPRO, GS0155 and GS0304 | nram compiler bug record |
| 43 | `InternalsVisibleTo` ignored by a G# consumer | 0.3.319 | REPRO, GS0158 | nram compiler bug record |
| 44 | Struct interface getter type load failure | 0.3.633 | CONTROL, Release exit 0 | nram compiler bug record |
| 45 | Release `Optimize` flag ignored | 0.3.362 | REPRO, optimizer-disabled assertion exits 1 | nram SDK bug record |
| 46 | Missing `dotnet watch` prerequisite target | 0.3.633 | REPRO, MSB4057 | nram SDK bug record |
| 47 | Nullable imported data-struct equality invalid IL | 0.3.633 | REPRO, Debug exits 0 and Release throws `InvalidProgramException` | nram compiler bug record |
| 48 | Direct `**int8` indexing invalid IL | 0.4.1 | CONTROL, JIT and NativeAOT exit 0 | nram Vulkan interop bug record |
| 49 | Explicit `nil` for an imported nullable reference field | 0.3.633 | REPRO, GS0155 | nram compiler bug record |
| 50 | Raw-pointer parameters in an unmanaged function-pointer type | 0.4.1 | CONTROL, Release exit 0 | nram Vulkan interop bug record |
| 51 | Direct invocation of a function-pointer field | 0.4.1 | REPRO, GS0159 | nram Vulkan interop bug record |
| 52 | Imported type name shadowed by a same-named field | 0.3.633 | CONTROL, Release exit 0 | nram compiler bug record |
| 53 | Variadic named-delegate array element token | 0.4.59 | REPRO, GS9998 `InvalidCastException`; current main reports `NotSupportedException` | nram compiler bug record |
| 54 | Imported `IParsable[T]` static constrained dispatch | 0.4.59 | REPRO, GS0333 | nram compiler bug record |
| 55 | Class-to-interface smart-cast member access | 0.3.319 | REPRO, GS0159 | nram compiler bug record |
| 56 | Shared member resolves to a file-level function | 0.3.633 | REPRO, build passes and assertion exits 1 | nram compiler bug record |
| 57 | Imported nested type member binding | 0.3.362 | CONTROL, Release exit 0 | nram `SKShaper.Result` interop record |

## Upstream filing verification

- Public package: Gsharp.NET.Sdk 0.4.59, SHA-256 `9f473d06364f6859ab124b90c0013a25f83d21c2bbf707be70cc4a7c06f9e1c8`.
- Current upstream main: commit `bdd42dae19222d8c610939c874dec8d6edd50599`, locally packed as Gsharp.NET.Sdk 0.4.210.
- The current upstream solution built with 0 warnings and 0 errors.
- Eleven actionable findings reproduced on both toolchains. Findings 38 and 47 share one equality-lowering issue, producing ten submitted issues.
- Finding 22 is specified behavior under ADR-0148. Structural projection reads only public readable source members and explicit spread may leave unmatched writable target members at defaults.
- Finding 46 is fixed on current main by closed issue [#3339](https://github.com/DavidObando/gsharp/issues/3339). `dotnet watch` loaded the project, enabled G# hot reload, built successfully, and waited for changes.

| Findings | Upstream issue |
|---|---|
| 38, 47 | [#3518: equality lowering emits invalid IL](https://github.com/DavidObando/gsharp/issues/3518) |
| 40 | [#3519: cross-file package const reads as zero](https://github.com/DavidObando/gsharp/issues/3519) |
| 41 | [#3520: imported blittable struct rejected as pointer pointee](https://github.com/DavidObando/gsharp/issues/3520) |
| 42 | [#3521: object initializer does not target-type lambda](https://github.com/DavidObando/gsharp/issues/3521) |
| 49 | [#3522: imported nullable field rejects nil](https://github.com/DavidObando/gsharp/issues/3522) |
| 51 | [#3523: function-pointer field cannot be invoked](https://github.com/DavidObando/gsharp/issues/3523) |
| 53 | [#3524: variadic named delegate crashes emit](https://github.com/DavidObando/gsharp/issues/3524) |
| 54 | [#3525: imported IParsable constraint loses static TryParse](https://github.com/DavidObando/gsharp/issues/3525) |
| 55 | [#3526: concrete class does not smart-cast to interface](https://github.com/DavidObando/gsharp/issues/3526) |
| 56 | [#3527: shared call binds package function](https://github.com/DavidObando/gsharp/issues/3527) |

## Excluded records

| Record | Disposition |
|---|---|
| `range` used as an identifier | Language rule, not a compiler defect |
| Default value of a data struct with reference fields | CLR default-value behavior |
| File-based `#:` directives | Unsupported feature, not a compiler defect |
| Concurrent projects writing the same output directory | Build workflow collision, not a compiler defect |
| GS9100 with an incomplete reference closure | Documented advisory behavior |
| Unsafe-context and `as` conversion reports | Documented language rules |
| Partial-import configuration report | Failure was not isolated from project configuration |
| Package `let` in a P/Invoke-only file | Failure was not narrowed to a compiler defect |
| Nullable property flow narrowing | Mutable getters make the proposed narrowing unsound |
| Formatter and Goo runtime reports | Outside compiler and SDK finding scope |

## Verification protocol

- Use `dotnet build <project> -c Release -t:Rebuild -p:TreatWarningsAsErrors=true`.
- Use `dotnet run --project <project> -c Release --no-build` only after that rebuild succeeds.
- Findings 47 and 48 have additional Debug and NativeAOT checks stated in the table.
- Finding 46 uses `dotnet msbuild <project> -t:_CheckCompileDesignTimePrerequisite`.
- Use a forced rebuild because the single-file projects share the `probes/Findings/obj` and `probes/Findings/bin` directories.
