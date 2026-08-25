---
name: api-surface-reduction-audit
description: Audit Goo's public Cell and Blob framework surface for a smaller coherent API that preserves retained-tree composition, exact API contracts, and Vulkan performance constraints. Use after allocation-balance-audit when asked to reduce, consolidate, redesign, or review Goo's exported API. Do not use for internal cleanup or feature addition.
---

# Goo API surface reduction audit

Find the smallest coherent public API that lets consumers express retained Goo applications without exposing framework choreography or renderer internals. This is read-only until the user explicitly authorizes a compatibility policy and implementation.

## Required order and inputs

Run `allocation-balance-audit` first when the change touches allocation, caching, pooling, invalidation, ownership, resource lifetime, callbacks, snapshots, or retained ranges. Verify that its ledger matches the current source fingerprint and workloads. For every relevant item, mark the cost as preserved, removed, or relocated.

Read repository `AGENTS.md`, `gsharp/website/docs/guide/effective-gsharp.md`, `IMPLEMENTATION-PLAN.md` S15/S19/Q10 sections, and the relevant public API pages under `docs/api/`. Use the Release assembly and these exact contract artifacts, in order:

1. `tests/Goo.ApiContractTests/PublicApi.approved.txt`, the reflection-defined locked surface.
2. Release `Goo.xml` and generated `docs/api/` pages produced by `tools/Goo.ApiDocs`.
3. `tests/Goo.ApiContractTests/PublicApiTests.cs` and `PublicDocumentationTests.cs`.
4. Public G# declarations only when generated artifacts cannot answer the question.

The baseline must state git commit and dirty state, hashes of the approved contract and Release assembly/XML when used, type/member totals, and the documentation generation state. Never hand-edit a generated page. Treat a dirty baseline as a named audit input, not a release contract.

## Core boundary

- Public API is for declarative `Cell`/`Blob` composition, component state, styles, input, semantic accessibility, and window application behavior. Consumers must not coordinate node reconciliation, Yoga layout, scene compilation, Vulkan resource ownership, SDL, shader, descriptor, staging, submission, or recovery.
- Do not add a convenience primitive merely because a single control wants it. Require distinct consumer evidence that current public primitives cannot compose the behavior. Prefer an internal correction, then the smallest public mechanism that restores composition.
- Public G# signatures are explicit and use width-bearing numeric types. Keep helpers internal by default. Verify production behavior through the G# emit or SDK build path, never by C# analogy.
- Any removal, changed signature, base type, interface, mutability, ownership, lifecycle, or documented behavior is a compatibility change. List it exactly and require explicit approval before implementation.

## Establish and map the contract

Run `scripts/api_surface_evidence.py <repository> [--consumer <path>]...` from this skill directory. The script is read-only textual evidence. It does not prove use or removal safety.

Account for each exported type and its public members by capability. For every capability identify primary and alternate entry points, external consumers, owner and lifetime, mutation and invalidation, errors and invalid intermediate states, docs/examples/contracts, retained-tree and accessibility behavior, and any allocation/performance constraints.

Use evidence in this order: real external consumers and production behavior, explicit compatibility commitments and generated contract/docs, authored examples, behavior checks, framework use, then textual counts. Absence of a textual reference is only a lead.

## Candidate gate

A recommended reduction must satisfy all applicable conditions:

1. It names the consumer capability, retained/replaced/removed behavior, and exact public type/member delta.
2. It preserves explicit ownership, lifetime, errors, focus, input, accessibility, rendering, and performance semantics.
3. Before-and-after examples cover one ordinary and one edge case, and identify fewer framework-choreography calls, concepts, invalid states, or duplicate ownership without hiding essential state.
4. Repository and external-consumer evidence includes contrary evidence, migration cost, and the compatibility strategy: hard break, obsolete forwarding member, adapter, or staged removal.
5. It does not move reconciliation, layout, invalidation, caching, GPU lifetime, or undocumented call ordering to application code or an opaque configuration object.
6. It preserves or deliberately replaces each relevant allocation-ledger entry and its regression gates.
7. The required API, documentation, focused behavior, Release/emit, allocation, performance, and Q10 verification is named.

Classify leads as `remove`, `internalize`, `merge`, `replace`, `rename`, `retain`, or `defer`. Defer any candidate supported only by reference counts, with incompatible consumers, or without a credible migration and performance story.

## Vulkan and qualification constraints

Public simplification must not leak or require users to manage direct-Vulkan or Yoga state. If an API changes resource ownership, invalidation, callback delivery, image/text/path data, or retained ranges, re-measure construction, sparse/full mutation, steady warm frame, resize/DPI, topology, close, surface loss, and device loss.

Current Linux qualification is not a complete Q10 or Windows result. Final Q10 claims need the plan's complete virtual-table, topology, text, image/effect, resize/DPI, and three-window workloads plus its hard pixel, frame, memory, idle, warm-resource, lifecycle, and validation gates. Keep one evidence document per measurement iteration with environment, source fingerprint, raw runs, equivalence result, all metrics, and verdict.

## Design and report

For each accepted candidate provide current and proposed exact signatures, public type/member totals, capability preservation, removed concepts and invalid states, ordinary and edge examples with an intent trace (`domain`, `state`, `view`, `framework choreography`), consumer migration counts, allocation-ledger disposition, compatibility plan, and verification commands.

Return baseline inventory, capability map, candidate table, rejected/deferred leads, target surface grouped by capability, ordered migration plan, smallest safe first reduction, and one exact evidence-document requirement for each implementation iteration. Label measured facts, source-supported conclusions, and design judgments.
