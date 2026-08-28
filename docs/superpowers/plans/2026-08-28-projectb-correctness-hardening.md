# ProjectB Correctness Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make RAGSIGNAL’s measured data, tenant boundaries, persistence, background execution, and 3D memory visualization truthful and resilient without reintroducing canceled third-party provider integrations.

**Architecture:** Keep Gemini Grounded as the only visibility engine. Split each run into a grounded answer call followed by validated structured extraction, then compute all metrics in TypeScript. Centralize client ownership checks in the worker data layer, add relational integrity and durable cycle metadata, and keep UI state synchronized with explicit error and loading states.

**Tech Stack:** TypeScript, React, Cloudflare Worker routes, Neon Postgres via `@neondatabase/serverless`, Gemini 2.5 Flash, Firecrawl, Node test runner, Vite/Vinext.

**Spec:** Existing RAGSIGNAL measurement contract in `worker/projectb/prompts.ts` and the confirmed audit findings from 2026-08-28.

## Global Constraints

- Use the tracked prompt verbatim for the grounded call.
- Execute exactly two model calls per run: grounded answer, then structured extraction without tools.
- Compute mention, citation, share-of-voice, volatility, competitor, source-frequency, position, and prominence deterministically in TypeScript.
- Never use Ubersuggest, Otterly, or Ahrefs data; remove their active provider capability and stale tests.
- Every client-scoped read/write/delete must verify the authenticated owner.
- Do not silently fall back to demo data or mask provider/database errors.
- Preserve accessible chart table fallbacks and show the actual sample denominator.
- Write a failing regression test before each production-code change, run it red, implement the smallest fix, then run it green.

### Task 1: Correct grounded-run measurement semantics

**Files:**
- Create: `worker/projectb/services/runMeasurement.ts`
- Modify: `worker/projectb/providers.ts`
- Modify: `worker/projectb/routes/runs.ts`
- Test: `tests/projectb-runs-measurement.test.mjs`

**Interfaces:**
- `callGroundedGemini(env, prompt)` returns answer text and publisher metadata while preserving redirect URLs only for click-through.
- `callStructuredExtraction(env, input)` returns validated `mentionedBrands`, `orderedList`, `rankedNames`, `recommendedEntityType`, and `answerFormat`.
- `measureRun(...)` combines both calls and performs deterministic domain matching and position/prominence calculation.

- [ ] Write a failing test proving the tracked prompt is sent verbatim and that one run produces two provider calls.
- [ ] Write a failing test proving publisher domain comes from `web.title`/publisher metadata rather than the Vertex redirect hostname.
- [ ] Write a failing test proving structured extraction data is persisted and invalid extraction is rejected explicitly.
- [ ] Run `node --test tests/projectb-runs-measurement.test.mjs`; confirm the new tests fail for the current one-call implementation.
- [ ] Implement the two-call service with server-side response validation and deterministic metric calculation.
- [ ] Update `executeCycle` to use the service, preserve raw answer/source provenance, and record per-run errors without fabricated metrics.
- [ ] Run the focused test and then `npm test`; confirm all pass.

### Task 2: Enforce owner isolation and relational integrity

**Files:**
- Modify: `worker/projectb/db.ts`
- Modify: `worker/projectb/routes/data.ts`
- Modify: `worker/projectb/routes/memory.ts`
- Modify: `worker/projectb/routes/aeo.ts`
- Modify: `worker/projectb/routes/analysis.ts`
- Modify: `worker/projectb/routes/runs.ts`
- Create: `db/migrations/202608280002_owner_integrity.sql`
- Test: `tests/projectb-ownership.test.mjs`

**Interfaces:**
- `ownsClient(sql, ownerId, clientId)` is the only client authorization primitive.
- All list, insert, update, and delete helpers accept the authenticated owner and include it in SQL predicates.
- Run start validates that the supplied client and every prompt belong to the same owner/client pair.

- [ ] Write failing tests for cross-owner list, save, delete, memory, AEO, page-analysis, and run-start requests.
- [ ] Run the focused tests and confirm they fail against unscoped queries and raw deletes.
- [ ] Change list/save/delete helpers and all routes to require ownership; remove the empty-owner bypass.
- [ ] Make client listing owner-scoped; do not return every internal client.
- [ ] Add foreign keys with `ON DELETE CASCADE` for child tables after checking existing orphan counts.
- [ ] Add migration-time checks for orphan rows and fail safely if unexpected orphan data exists.
- [ ] Run Neon integrity queries and the focused tests, then `npm test`.

### Task 3: Make writes and page analyses durable

**Files:**
- Modify: `worker/projectb/routes/data.ts`
- Modify: `worker/projectb/App.tsx`
- Modify: `worker/projectb/routes/analysis.ts`
- Create: `worker/projectb/db.ts` transaction helper if required by the deployed driver
- Test: `tests/projectb-persistence.test.mjs`

**Interfaces:**
- `batch-sync` executes client and prompt writes in one database transaction.
- `GET /api/db/page-analyses?clientId=...` returns owner-scoped saved analyses.
- Browser writes check HTTP status, retain local state only after success, and show a visible error with retry context.

- [ ] Write a failing test proving a failed prompt write rolls back the onboarding batch.
- [ ] Write a failing test proving page analyses survive a fresh hydration request.
- [ ] Write a failing test proving a non-2xx save does not remain silently “saved” in local state.
- [ ] Run focused tests red.
- [ ] Implement transaction-backed batch sync, page-analysis list route, hydration, and explicit write error handling.
- [ ] Normalize the onboarding owner ID from the authenticated session instead of hardcoded `default-owner`.
- [ ] Run focused tests and `npm test`.

### Task 4: Fix run-cycle accounting and lifecycle recovery

**Files:**
- Modify: `worker/projectb/routes/runs.ts`
- Modify: `features/projectb/App.tsx`
- Modify: `features/projectb/components/RunCycleModal.tsx`
- Create: `worker/projectb/db.ts` cycle metadata helper if needed
- Test: `tests/projectb-cycle-accounting.test.mjs`

**Interfaces:**
- Each cycle stores `prompt_count`, `expected_run_count`, `expected_call_count`, and separate `completed_runs`/`completed_calls` semantics.
- Status returns the same denominator shown in the confirmation modal.
- Failed or stale cycles expose a recoverable error state and never appear as completed.

- [ ] Write failing tests for `15 prompts × 3 runs × 2 calls = 90 requests`, progress denominator, and partial failure state.
- [ ] Run focused tests red.
- [ ] Add cycle metadata migration and use it in start/status/update paths.
- [ ] Update polling and modal progress to distinguish completed runs from provider calls.
- [ ] Add stale-cycle detection/retry guidance without fabricating completed runs.
- [ ] Run focused tests and `npm test`.

### Task 5: Validate page analysis methodology

**Files:**
- Modify: `worker/projectb/routes/analysis.ts`
- Modify: `features/projectb/types.ts`
- Modify: `features/projectb/components/tabs/PagesTab.tsx`
- Test: `tests/projectb-page-analysis.test.mjs`

- [ ] Write failing tests for qualitative six-dimension statuses, robots.txt/X-Robots-Tag handling, and no synthetic score output.
- [ ] Run focused tests red.
- [ ] Replace the invented numeric extractability score with evidence-backed statuses and explicit unknown states.
- [ ] Check HTTP status, meta robots, `X-Robots-Tag`, and robots.txt separately.
- [ ] Validate analysis JSON before persistence.
- [ ] Run focused tests and `npm test`.

### Task 6: Repair 3D neural matrix behavior and state transitions

**Files:**
- Modify: `features/projectb/components/BrandNeuralBrain3D.tsx`
- Modify: `features/projectb/components/tabs/BrandMemoryTab.tsx`
- Modify: `features/projectb/services/brandMemoryGraph.ts`
- Test: `tests/brand-memory-graph.test.mjs`
- Test: `tests/ui-components.test.mjs`

- [ ] Write failing tests for link filtering, synapse count, client-switch reset, and graph entity-type coverage.
- [ ] Run focused tests red.
- [ ] Filter links by target/source entity type while preserving the brand hub only when relevant.
- [ ] Display `links.length` for synapse counts and add labels for all supported entity types.
- [ ] Reset selected item, crawl URL, and transient notices on client change; show fetch errors visibly.
- [ ] Stabilize callback identity, add `ResizeObserver`, and scale canvas backing resolution by `devicePixelRatio`.
- [ ] Run focused tests and `npm test`.

### Task 7: Remove canceled provider capability and stale artifacts

**Files:**
- Modify: `features/projectb/types.ts`
- Modify: `worker/projectb/db.ts`
- Modify: `features/projectb/services/providerSnapshots.ts`
- Modify: `tests/provider-snapshots.test.mjs`
- Create: `db/migrations/202608280003_remove_canceled_providers.sql`

- [ ] Write a failing test proving canceled providers are rejected and cannot be listed as active capabilities.
- [ ] Run focused tests red.
- [ ] Remove Ubersuggest, Otterly, and Ahrefs from runtime types, accepted values, and comparison tests while keeping Gemini Grounded and Firecrawl where still used.
- [ ] Keep the existing provider snapshot table only for allowed providers or migrate it safely without deleting unrelated data.
- [ ] Run focused tests and `npm test`.

### Task 8: Add end-to-end quality gates and production verification

**Files:**
- Create: `tests/projectb-quality-gates.test.mjs`
- Modify: `package.json` only if a focused quality command is needed

- [ ] Add tests for no-owner leakage, no fabricated metrics, exact call budget, persistence after hydration, and 3D graph non-empty rendering inputs.
- [ ] Run the focused suite red before implementation of any missing gate.
- [ ] Run `npm test` and record the complete pass count.
- [ ] Run a fresh Sites preview/production smoke check for login, client switching, run-cycle modal, pages persistence, and 3D synapses.
- [ ] Verify Neon row counts, orphan counts, and provider snapshot counts after migrations.
- [ ] Report any unverified external-provider behavior explicitly instead of claiming full completion.
