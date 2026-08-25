---
name: allocation-balance-audit
description: Audit Goo's retained Cell, Blob, Yoga, and direct-Vulkan paths for bounded allocation trades that improve total CPU, GPU, frame-time, or retained-memory cost. Use for zero-allocation hot-path reviews, retained-resource lifetimes, cache and pool costs, and allocation-led API constraints. Do not use for general cleanup without a measured total-cost trade.
---

# Goo allocation balance audit

Find measured cases where a current zero-allocation path transfers an unacceptable cost to CPU, GPU, retained memory, recovery complexity, or consumer code. Produce evidence, not optimization ideas.

Default to a read-only audit. Do not edit product code, API baselines, generated documentation, plans, or performance evidence unless the user separately authorizes that work.

## Read first

- Repository `AGENTS.md`, then `gsharp/website/docs/guide/effective-gsharp.md`.
- `IMPLEMENTATION-PLAN.md`, especially S15, the durable T01-T05 gates, logging requirements, Q10, and current Linux qualification state.
- The relevant source path through `Cell` and `Blob` reconciliation, Yoga layout, scene compilation, Vulkan frame slots, submission, presentation, and recovery.
- Existing focused tests, Release performance evidence under `docs/perf/`, and the exact current API contract if a finding touches public ownership or invalidation.

The current plan records Linux core-mechanism qualification, not full Q10 virtual-table/topology qualification. Do not describe a focused Linux result as Q10, full-frame/GPU evidence, validation evidence, or Windows qualification unless that exact evidence exists.

## Non-negotiable architecture

- Goo is retained: application `Cell` state produces `Blob` declarations, reconciliation owns mounted nodes, Yoga owns CSS-like layout, and direct Vulkan owns rendering. Do not propose a second retained tree, a CPU raster fallback, Skia, OpenGL, or public renderer handles.
- Vulkan, SDL, Yoga, text-provider handles, scene records, descriptor state, staging buffers, and device lifetimes remain internal. A public change must restore composition that existing public `Cell`/`Blob` primitives cannot express, with evidence from distinct consumers.
- Keep hot paths allocation-free by default: steady warm frame, input dispatch, layout, reconciliation, scene compilation, command recording, submit, and present. Warm resources must also avoid Vulkan-object, pipeline, and device-memory creation.
- Account for managed allocation, GC pauses, retained managed memory, RSS/private dirty memory, GPU-reserved bytes, upload bytes, CPU time, GPU time, frame percentiles, hitches, draw and descriptor churn, and power proxy when applicable. State where every cost moves.
- A resource retained across submission needs an owner, exact mutation key, byte budget, invalidation rule, accepted-submission/presentation lifetime, fence-safe retirement, generation behavior, and device-loss recovery rule.

## Audit order

When API reduction is also requested, complete this audit first. Give the API audit one allocation ledger containing every accepted, rejected, and deferred candidate, its current source fingerprint, frequency class, current B/op, displaced cost, simplest allocation-free alternative, bounded-allocation trigger, lifetime, churn guard, and required regression gates.

## Find and trace leads

Run `scripts/find_candidates.sh <repository>` from this skill directory. It is read-only lead generation, not evidence. Inspect hits in context and trace all phases:

1. Cell/Blob construction and reconciliation.
2. Yoga layout and invalidation propagation.
3. Scene record generation, staging/upload, command recording, submit, and present.
4. Stable warm frames plus sparse, full, topology, resize/DPI, source replacement, close, surface loss, device loss, and recovery.

Prioritize retained `List`, array, dictionary, cache, pool, frame-slot, upload, glyph, image, path, clip, and scratch storage; stable trees repeatedly rescanned or rebuilt; broad invalidation; and rare resize/reload/compaction boundaries. Treat a `Clear()` that retains capacity, a cache that has no budget, and a clean frame that still walks stable state as leads only.

## Candidate validity gate

Accept a candidate only when all apply:

1. The representative current path and its allocation are measured, including a true 0 B claim when made.
2. Source identifies the mechanism and the displaced CPU, memory, GPU, invalidation, or caller cost.
3. The proposed allocation or retention is bounded, has an explicit trigger and lifetime, and cannot churn under alternating workloads.
4. The simplest allocation-free alternative was measured first and did not obtain the gain.
5. Both variants preserve pixels, input, accessibility, retained-tree semantics, and state transitions.
6. The comparison reports an absolute total-result improvement, not only a ratio or one microbenchmark.
7. Submission, resize/DPI, abort, surface loss, device loss, and recovery keep resource identity and retirement safe when the candidate reaches Vulkan.
8. The proposal stays inside Goo core's boundary. Otherwise document the consumer-composition case and hand it to the API audit.

Reject a candidate that merely moves allocation to construction, pooling, caching, a caller, or a later frame without measuring that destination. Reject a per-frame allocation trade unless end-to-end evidence shows a bounded, better result and Q10 gates remain met.

## Measure

Start with existing Release gates. Use a temporary spike outside the working tree only when no equivalent gate exists.

- Record commit, dirty state, RID, OS, runtime, SDK, NativeAOT mode, GPU, driver, Vulkan API/device, power mode, display/DPI, workload, seed, warmup, samples, validation state, and artifact hashes.
- For final Q10 evidence, use five isolated Release NativeAOT processes with 300 warmup and 2,000 measured frames unless the accepted workload record specifies otherwise. Use the same fixture for both variants.
- Report P50/P95/P99/P99.9/worst CPU and GPU time, allocation, GC pauses, retained managed memory, RSS/private dirty memory, GPU bytes, upload bytes, draw and descriptor changes, and recovery/resource counters when applicable.
- Separate construction, mutation/update, steady warm, first use, resize/DPI, topology, and teardown/recovery. Measure sparse and full mutation plus the adversarial retention shape.
- Keep one evidence document per accepted measurement iteration. It must name the source fingerprint, workload and environment, raw process results, equivalence oracle, metric deltas, failures, and verdict. Do not overwrite a prior iteration or compress distinct workloads into an unlabeled aggregate.

Use focused evidence for a focused claim. Q10 requires its complete virtual-table, topology, text, image/effect, resize/DPI, and three-window scope and must satisfy the plan's hard frame, memory, idle, warm-resource, lifecycle, and pixel gates.

## Frequency classes

- `hot`: per input event, frame, layout, reconcile, compile, record, submit, or present. Preserve zero managed allocation and warm Vulkan creation.
- `warm`: content mutation, animation step, sparse update, or periodic refresh. A small bounded allocation is possible only with reuse and churn evidence.
- `boundary`: resize, DPI change, source replacement, cache compaction, close, recovery, or device generation change. Prefer the best measured total result with explicit hysteresis and safe retirement.

## Report

Return one table of valid candidates with source path, lifecycle phase, frequency, current mechanism, displaced cost, proposed boundary, bounds, evidence, Q10 status, and verdict. Include rejected/deferred leads with the failed gate, the smallest safe next slice, the required test/performance gate, and the allocation ledger for `api-surface-reduction-audit`.

Use clickable source links. Label facts measured, source-supported, or design judgment.
