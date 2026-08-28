# ProjectB Sites Port Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy the complete ProjectB workspace on Sites with a Worker-compatible API, the existing RAG Signal Neon database, and internal-team-only access.

**Architecture:** Preserve the ProjectB React workspace and its `/api` contract while moving the Express endpoints into an explicit Worker router. Query the existing Neon schema through the serverless HTTP driver, authenticate through Neon Auth, and keep every credential in Sites runtime secrets rather than source or browser storage.

**Tech Stack:** Vinext, React 19, TypeScript, Cloudflare Workers, `@neondatabase/serverless`, Neon Auth, Google Gemini API, Perplexity Sonar, Firecrawl, Google Search Console and GA4 APIs, Node built-in test runner.

**Spec:** `docs/superpowers/specs/2026-08-27-projectb-sites-port-design.md`

## Global Constraints

- Preserve ProjectB's `/api/...` request and response shapes used by the React interface.
- Sites code must build as an ESM Worker; do not use Express, Node `pg`, `Pool`, filesystem APIs, or raw TCP.
- Use `DATABASE_URL` only from Sites runtime secrets and never include a fallback database URL in code.
- Do not run a seed script, delete existing Neon records, or alter an existing table without a separately approved migration.
- Permit only authenticated Neon Auth users whose normalized email is in `INTERNAL_EMAIL_ALLOWLIST`.
- Remove default demo users, guest access, open registration, Firebase auth, and inline credentials from the live application.
- Do not return OAuth tokens, provider API keys, or database credentials from a route or put them in client bundles or logs.
- Keep `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `FIRECRAWL_API_KEY`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `APP_URL`, and auth values as Sites secrets.
- Do not start browser QA unless Bora explicitly asks for it. Use the production build and route tests as the validation gate.

---

## Target File Structure

```text
app/
  layout.tsx                         # Final title and document metadata
  page.tsx                           # Server entry that mounts the workspace
  projectb-client.tsx                # Client auth bootstrap and workspace shell
features/projectb/
  App.tsx                            # Adapted upstream ProjectB workspace
  components/**                      # Adapted upstream UI components and charts
  context/AuthContext.tsx            # Neon Auth client session state
  hooks/useGlobalSync.ts             # Existing workspace synchronisation hook
  services/api.ts                    # Authenticated JSON fetch wrapper
  state/**, data/**, types.ts        # Existing display state and types, with no secrets
worker/projectb/
  env.ts                             # Typed runtime environment and required-secret guard
  http.ts                            # JSON, error, request-body and URL helpers
  auth.ts                            # Neon Auth session verification and allowlist guard
  crypto.ts                          # Encrypt/decrypt Google OAuth values stored in Neon
  db.ts                              # Neon HTTP driver factory and safe SQL helpers
  router.ts                           # `/api` route selection and method checks
  routes/
    health.ts                        # Health response without secrets
    clients.ts                       # Clients, prompts and batch-save endpoints
    analysis.ts                      # URL, schema, Gemini, Perplexity and Firecrawl endpoints
    runs.ts                          # Persisted run-cycle creation and status endpoints
    memory.ts                        # Brand Memory endpoints
    aeo.ts                           # AEO content endpoints
    google.ts                        # OAuth, GSC and GA4 endpoints
    settings.ts                      # Non-secret configuration responses
tests/
  helpers/projectb.mjs                # Vite module loader and Worker request fakes
  projectb-runtime.test.mjs          # Runtime guards and router dispatch tests
  projectb-auth.test.mjs             # Session and allowlist tests
  projectb-data.test.mjs             # Neon SQL adapter contract tests
  projectb-analysis.test.mjs         # Provider error and request-normalisation tests
  projectb-google.test.mjs           # Token encryption and OAuth callback tests
```

Upstream source is read through the GitHub connector and copied only into `features/projectb/`; its Node-only server, migration scripts, Firebase adapters and local credential files are not copied into the Sites source tree.

### Task 1: Import the React workspace without its Node-only runtime

**Files:**
- Create: `features/projectb/App.tsx`, `features/projectb/components/**`, `features/projectb/context/AuthContext.tsx`, `features/projectb/hooks/useGlobalSync.ts`, `features/projectb/state/store.ts`, `features/projectb/data/demoData.ts`, `features/projectb/types.ts`, `features/projectb/services/api.ts`
- Modify: `app/page.tsx`, `app/projectb-client.tsx`, `app/globals.css`, `app/layout.tsx`, `package.json`
- Test: `tests/projectb-runtime.test.mjs`

**Interfaces:**
- Consumes: GitHub source files under `borakurum-source/ProjectB/src/` and the `apiFetch(path, init)` function defined in this task.
- Produces: `ProjectBClient` and `apiFetch(path: string, init?: RequestInit): Promise<T>` for all subsequent client work.

- [ ] **Step 1: Write the failing browser API-contract test**

```js
import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

test("browser API requests include the authenticated session cookie", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({ appType: "custom", configFile: false, root, server: { middlewareMode: true } });
  const originalFetch = globalThis.fetch;
  let receivedInit;
  globalThis.fetch = async (_input, init) => {
    receivedInit = init;
    return new Response(JSON.stringify({ ok: true }), { headers: { "content-type": "application/json" } });
  };
  try {
    const { apiFetch } = await vite.ssrLoadModule("/features/projectb/services/api.ts");
    assert.deepEqual(await apiFetch("/api/health"), { ok: true });
    assert.equal(receivedInit.credentials, "include");
  } finally {
    globalThis.fetch = originalFetch;
    await vite.close();
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/projectb-runtime.test.mjs`

Expected: FAIL because `features/projectb/services/api.ts` does not yet exist.

- [ ] **Step 3: Materialize and adapt the frontend source**

Use the GitHub connector's recursive tree and blob reads to copy the React UI files listed above into `features/projectb/`. Do not copy `server.ts`, `src/db/**`, `src/lib/firebase*`, `src/lib/firestoreAdapter.ts`, `src/services/auth.ts`, `src/services/auth-api.ts`, `src/services/db-repo.ts`, `src/services/db-api.ts`, `src/services/mcp-server.ts`, `src/db/migrate-neon.ts`, `.data_storage/**`, or any `.env` content.

Create the single browser API adapter:

```ts
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...init.headers },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}
```

Replace upstream direct `fetch` calls with `apiFetch`, replace Firebase/local demo auth imports with the auth context created in Task 3, and remove all demo-entry buttons. Mount the imported workspace through `app/projectb-client.tsx`; set title to `ProjectB | RAG Signal` and remove `codex-preview` metadata.

- [ ] **Step 4: Run the browser API-contract test**

Run: `node --test tests/projectb-runtime.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the import baseline**

```bash
git add app features tests package.json package-lock.json
git commit -m "feat: import ProjectB workspace shell"
```

### Task 2: Add the Worker router and runtime-secret contract

**Files:**
- Create: `worker/projectb/env.ts`, `worker/projectb/http.ts`, `worker/projectb/router.ts`, `worker/projectb/routes/health.ts`
- Modify: `worker/index.ts`, `package.json`, `tests/projectb-runtime.test.mjs`
- Create: `tests/helpers/projectb.mjs`
- Test: `tests/projectb-runtime.test.mjs`

**Interfaces:**
- Consumes: `Request`, `ExecutionContext`, and the `Env` binding passed to `worker.fetch`.
- Produces: `handleApiRequest(request, env, ctx): Promise<Response>` and `json(status, payload): Response`.

- [ ] **Step 1: Extend the failing router test**

```js
test("health route is dispatched before Vinext rendering", async () => {
  const { handleApiRequest } = await loadWorkerModule("/worker/projectb/router.ts");
  const response = await handleApiRequest(new Request("https://projectb.test/api/health"), {}, { waitUntil() {} });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true, service: "projectb" });
});
```

- [ ] **Step 2: Run the router test to verify it fails**

Run: `node --test tests/projectb-runtime.test.mjs`

Expected: FAIL because the router module is absent.

- [ ] **Step 3: Implement request dispatch and environment validation**

Define the minimum Worker environment:

```ts
export interface ProjectBEnv {
  DATABASE_URL: string;
  NEON_AUTH_URL: string;
  INTERNAL_EMAIL_ALLOWLIST: string;
  TOKEN_ENCRYPTION_KEY: string;
  GEMINI_API_KEY?: string;
  PERPLEXITY_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APP_URL?: string;
}
```

Create the shared test helpers so each test imports source TypeScript through Vite instead of a non-existent transpiled test directory:

```js
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../..", import.meta.url));
const vite = await createServer({ appType: "custom", configFile: false, root, resolve: { alias: { "@": root } }, server: { middlewareMode: true } });
export const loadWorkerModule = (path) => vite.ssrLoadModule(path);
export const envFor = (overrides = {}) => ({
  DATABASE_URL: "postgresql://runtime-value",
  NEON_AUTH_URL: "https://auth.example.test",
  INTERNAL_EMAIL_ALLOWLIST: "bora@ragsignal.com",
  TOKEN_ENCRYPTION_KEY: "test-key-material",
  ...overrides,
});
export const requestFor = (email) => new Request("https://projectb.test/api/auth/me", { headers: { "x-test-email": email } });
```

Route `/api/health` without reading secrets, dispatch all other `/api/` requests through `handleApiRequest`, and return `{ error: "Not found" }` with 404 for unrecognized API paths. In `worker/index.ts`, check `/api/` before image handling and `handler.fetch`.

- [ ] **Step 4: Run the router test**

Run: `node --test tests/projectb-runtime.test.mjs`

Expected: PASS with a 200 health JSON response.

- [ ] **Step 5: Commit the Worker foundation**

```bash
git add worker package.json package-lock.json tests/projectb-runtime.test.mjs
git commit -m "feat: add ProjectB Worker API router"
```

### Task 3: Implement internal-team authentication and session enforcement

**Files:**
- Create: `worker/projectb/auth.ts`, `worker/projectb/routes/auth.ts`
- Modify: `worker/projectb/router.ts`, `features/projectb/context/AuthContext.tsx`, `features/projectb/components/LoginPage.tsx`, `app/projectb-client.tsx`
- Test: `tests/projectb-auth.test.mjs`

**Interfaces:**
- Consumes: `NEON_AUTH_URL`, request cookies, and `INTERNAL_EMAIL_ALLOWLIST`.
- Produces: `requireInternalUser(request, env): Promise<InternalUser | Response>` where `InternalUser` is `{ id: string; email: string; displayName?: string }`.

- [ ] **Step 1: Write the failing allowlist tests**

```js
test("allows a verified listed email", async () => {
  const result = await requireInternalUser(requestFor("bora@ragsignal.com"), envFor(), fakeSession);
  assert.equal(result.email, "bora@ragsignal.com");
});

test("rejects an authenticated but unlisted email", async () => {
  const result = await requireInternalUser(requestFor("outside@example.com"), envFor(), fakeSession);
  assert.equal(result.status, 403);
});
```

- [ ] **Step 2: Run the auth tests to verify they fail**

Run: `node --test tests/projectb-auth.test.mjs`

Expected: FAIL because `requireInternalUser` is not exported.

- [ ] **Step 3: Implement Neon Auth session verification and UI session state**

Implement an injected `getSession(request, env)` adapter that calls the provisioned Neon Auth session endpoint using the request cookie, normalizes the returned email with `trim().toLowerCase()`, and compares it against comma-separated normalized allowlist entries. Route `/api/auth/me` through this guard. Route `/api/auth/login`, `/api/auth/register`, guest entry, and client-side default-user fallbacks must return 404 or be removed.

The client context must fetch `/api/auth/me` during startup and show only an internal sign-in action. It may not write a bearer token or a user object to `localStorage`.

- [ ] **Step 4: Run the auth tests**

Run: `node --test tests/projectb-auth.test.mjs`

Expected: PASS for allow, reject, and no-session cases.

- [ ] **Step 5: Commit the access boundary**

```bash
git add worker/projectb/auth.ts worker/projectb/routes/auth.ts worker/projectb/router.ts features/projectb/context/AuthContext.tsx features/projectb/components/LoginPage.tsx app/projectb-client.tsx tests/projectb-auth.test.mjs
git commit -m "feat: restrict ProjectB to internal authenticated users"
```

### Task 4: Port the core Neon repository and dashboard data routes

**Files:**
- Create: `worker/projectb/db.ts`, `worker/projectb/routes/clients.ts`
- Modify: `worker/projectb/router.ts`, `features/projectb/services/api.ts`, `features/projectb/hooks/useGlobalSync.ts`
- Test: `tests/projectb-data.test.mjs`

**Interfaces:**
- Consumes: `ProjectBEnv.DATABASE_URL` and `requireInternalUser`.
- Produces: `createSql(env): SqlExecutor`, `getWorkspace(ownerId): Promise<WorkspaceData>`, and authenticated clients/prompts/settings batch-save handlers.

- [ ] **Step 1: Write the failing SQL-adapter and ownership tests**

```js
test("creates the SQL client only from the runtime DATABASE_URL", async () => {
  const sql = createSql({ DATABASE_URL: "postgresql://runtime-value" });
  assert.equal(typeof sql, "function");
});

test("workspace query binds the authenticated owner id", async () => {
  const calls = [];
  const fakeSql = Object.assign(async (strings, ...values) => {
    calls.push({ strings, values });
    return [];
  }, { transaction: async (fn) => fn(fakeSql) });
  await getWorkspace(fakeSql, "user-1");
  assert.deepEqual(calls[0].values, ["user-1"]);
});
```

- [ ] **Step 2: Run the data tests to verify they fail**

Run: `node --test tests/projectb-data.test.mjs`

Expected: FAIL because the Worker database module is absent.

- [ ] **Step 3: Implement the database gateway and core routes**

Use `@neondatabase/serverless` HTTP queries; add it to `package.json`. Port only the repository operations required by the workspace load and save flows: clients, prompts, run cycles, runs, diagnostics, actions, page analyses, settings, and Google-integration metadata. Every select and mutation must bind the verified `ownerId`; never trust an owner ID supplied by the browser.

Implement the existing `/api/db/batch-sync` response as `{ success: true, clientId }`, and return 400 when its `client.id` is absent. Do not execute upstream `migrate-neon.ts` or any seed logic.

- [ ] **Step 4: Run the data tests**

Run: `node --test tests/projectb-data.test.mjs`

Expected: PASS and show owner-bound values in the fake SQL call capture.

- [ ] **Step 5: Commit the core data port**

```bash
git add worker/projectb/db.ts worker/projectb/routes/clients.ts worker/projectb/router.ts features/projectb/services/api.ts features/projectb/hooks/useGlobalSync.ts package.json package-lock.json tests/projectb-data.test.mjs
git commit -m "feat: connect ProjectB dashboard to Neon"
```

### Task 5: Port analysis, crawl, provider, and persisted run-cycle APIs

**Files:**
- Create: `worker/projectb/routes/analysis.ts`, `worker/projectb/routes/runs.ts`
- Modify: `worker/projectb/router.ts`, `features/projectb/components/RunCycleModal.tsx`, `features/projectb/components/RunInspectorModal.tsx`
- Test: `tests/projectb-analysis.test.mjs`

**Interfaces:**
- Consumes: `requireInternalUser`, `createSql`, provider secrets, and a validated JSON request body.
- Produces: handlers for `/api/firecrawl/{scrape,map,search}`, `/api/gemini/{run,extract,opportunities}`, `/api/url/fetch`, `/api/prompts/fanout`, `/api/pages/{check-crawlability,check-schema,analyze}`, `/api/client/generate-profile`, `/api/prompts/discover`, `/api/diagnostics/generate`, `/api/runs/execute-cycle`, and `/api/runs/execute-cycle/:jobId/status`.

- [ ] **Step 1: Write the failing provider-configuration tests**

```js
test("returns a safe 503 when Firecrawl is not configured", async () => {
  const response = await firecrawlSearch(requestWithJson({ query: "catering" }), envWithout("FIRECRAWL_API_KEY"));
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "Firecrawl is not configured" });
});

test("never returns a provider key in an error response", async () => {
  const response = providerFailure(new Error("upstream failed"));
  assert.doesNotMatch(JSON.stringify(await response.json()), /API_KEY|sk-|pplx-/i);
});
```

- [ ] **Step 2: Run the analysis tests to verify they fail**

Run: `node --test tests/projectb-analysis.test.mjs`

Expected: FAIL because the provider handlers are absent.

- [ ] **Step 3: Implement provider calls and run-state persistence**

Use Worker `fetch` with a per-request abort signal for each provider. Validate client IDs, URLs, prompt text, and engine choices before creating provider requests. Persist cycle state in the existing `run_cycles` table and use the cycle ID as the returned `jobId`; the status route reads persisted state instead of an in-memory map so deployment restarts do not lose status.

All provider routes call `requireInternalUser` and use environment secrets only. Existing interface fields such as answer text, citations, mentioned brands, diagnostics, and action output must retain their existing JSON names.

- [ ] **Step 4: Run the analysis tests**

Run: `node --test tests/projectb-analysis.test.mjs`

Expected: PASS for safe missing-configuration and redacted-provider-error responses.

- [ ] **Step 5: Commit the analysis port**

```bash
git add worker/projectb/routes/analysis.ts worker/projectb/routes/runs.ts worker/projectb/router.ts features/projectb/components/RunCycleModal.tsx features/projectb/components/RunInspectorModal.tsx tests/projectb-analysis.test.mjs
git commit -m "feat: port ProjectB analysis and run APIs"
```

### Task 6: Port Brand Memory and AEO Studio routes

**Files:**
- Create: `worker/projectb/routes/memory.ts`, `worker/projectb/routes/aeo.ts`
- Modify: `worker/projectb/router.ts`, `features/projectb/components/tabs/BrandMemoryTab.tsx`, `features/projectb/components/tabs/AeoStudioTab.tsx`
- Test: `tests/projectb-data.test.mjs`, `tests/projectb-analysis.test.mjs`

**Interfaces:**
- Consumes: core Neon data gateway, authenticated user, Gemini and Firecrawl providers.
- Produces: all existing `/api/brand-memory/*` and `/api/aeo-content/*` handlers.

- [ ] **Step 1: Write the failing ownership test for a Brand Memory read**

```js
test("Brand Memory list scopes reads to the authenticated owner", async () => {
  const fakeSql = async () => [{ id: "memory-1", clientId: "client-1" }];
  const response = await listBrandMemory(requestFor("user-1"), env, fakeSql, "client-1", { id: "user-1", email: "bora@ragsignal.com" });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).items[0].clientId, "client-1");
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node --test tests/projectb-data.test.mjs`

Expected: FAIL because the Brand Memory route is absent.

- [ ] **Step 3: Implement the knowledge and content endpoints**

Port crawl-and-index, manual entry, cross-functional sync, list, delete, query, and ask operations for Brand Memory. Port AEO generation, list, and delete operations. Resolve the client through the authenticated owner before reading or writing any client ID supplied by the browser. Store embeddings and JSON fields in the existing schema shapes; do not seed the old JSON cache.

- [ ] **Step 4: Run the data and analysis tests**

Run: `node --test tests/projectb-data.test.mjs tests/projectb-analysis.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit the knowledge routes**

```bash
git add worker/projectb/routes/memory.ts worker/projectb/routes/aeo.ts worker/projectb/router.ts features/projectb/components/tabs/BrandMemoryTab.tsx features/projectb/components/tabs/AeoStudioTab.tsx tests/projectb-data.test.mjs tests/projectb-analysis.test.mjs
git commit -m "feat: port Brand Memory and AEO Studio"
```

### Task 7: Secure GSC and GA4 OAuth integration

**Files:**
- Create: `worker/projectb/crypto.ts`, `worker/projectb/routes/google.ts`
- Modify: `worker/projectb/router.ts`, `features/projectb/components/GoogleIntegrationCard.tsx`, `features/projectb/components/tabs/SettingsTab.tsx`
- Test: `tests/projectb-google.test.mjs`

**Interfaces:**
- Consumes: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `TOKEN_ENCRYPTION_KEY`, `APP_URL`, `google_integrations` rows, and authenticated owner.
- Produces: `encryptSecret`, `decryptSecret`, `signGoogleState`, and handlers for `/api/integrations/google/status`, `/api/auth/google/url`, `/api/integrations/google/config`, `/api/integrations/google/disconnect`, `/api/integrations/gsc/{data,insights}`, `/api/integrations/ga4/{data,trend,ai-landing-pages}`.

- [ ] **Step 1: Write the failing encryption and callback validation tests**

```js
test("encrypts and restores an OAuth refresh token without using the source value as ciphertext", async () => {
  const token = "refresh-token-value";
  const cryptoEnv = envFor({ TOKEN_ENCRYPTION_KEY: "01234567890123456789012345678901" });
  const encrypted = await encryptSecret(token, cryptoEnv);
  assert.notEqual(encrypted, token);
  assert.equal(await decryptSecret(encrypted, cryptoEnv), token);
});

test("rejects an OAuth callback whose state owner does not match the session", async () => {
  const state = await signGoogleState({ ownerId: "user-1", clientId: "client-1", expiresAt: Date.now() + 300_000 }, envFor());
  const response = await finishGoogleCallback(requestFor("user-2"), state, envFor(), { id: "user-2", email: "bora@ragsignal.com" });
  assert.equal(response.status, 403);
});
```

- [ ] **Step 2: Run the Google tests to verify they fail**

Run: `node --test tests/projectb-google.test.mjs`

Expected: FAIL because the crypto and callback modules are absent.

- [ ] **Step 3: Implement encrypted token storage and Google data handlers**

Use Web Crypto AES-GCM with a key derived from `TOKEN_ENCRYPTION_KEY`, a new random IV per value, and a `v1:` prefix in stored ciphertext. Bind OAuth state to the authenticated user, requested client, and a short expiry before redirecting to Google. Store encrypted access and refresh values in `google_integrations`; status and data routes never serialize those columns. Replace the upstream UI fields that accepted provider secrets with an administrator-only configuration notice.

- [ ] **Step 4: Run the Google tests**

Run: `node --test tests/projectb-google.test.mjs`

Expected: PASS for encryption round-trip, non-plaintext storage, and mismatched-state denial.

- [ ] **Step 5: Commit Google integration security**

```bash
git add worker/projectb/crypto.ts worker/projectb/routes/google.ts worker/projectb/router.ts features/projectb/components/GoogleIntegrationCard.tsx features/projectb/components/tabs/SettingsTab.tsx tests/projectb-google.test.mjs
git commit -m "feat: secure ProjectB Google integrations"
```

### Task 8: Configure Sites secrets, verify Neon compatibility, and publish

**Files:**
- Modify: `.env.example`, `README.md`, `app/layout.tsx`
- Test: `tests/projectb-runtime.test.mjs`, `tests/projectb-auth.test.mjs`, `tests/projectb-data.test.mjs`, `tests/projectb-analysis.test.mjs`, `tests/projectb-google.test.mjs`

**Interfaces:**
- Consumes: Sites runtime secrets and the existing RAG Signal Neon project.
- Produces: a private deployment whose `APP_URL` is used for OAuth and whose API reaches the existing data.

- [ ] **Step 1: Document the secret names without values**

Write `.env.example` using blank values for `DATABASE_URL`, `NEON_AUTH_URL`, `INTERNAL_EMAIL_ALLOWLIST`, `TOKEN_ENCRYPTION_KEY`, provider values, Google OAuth values, and `APP_URL`. Review the exact diff before staging it and reject any non-empty credential-like value. This is documentation-only configuration work; the observable secret-validation behavior remains covered by Task 2 and the authenticated routes.

- [ ] **Step 2: Configure non-source runtime values and verify the database read path**

Set Sites secrets using the Sites environment tool: `DATABASE_URL` from the selected RAG Signal Neon project, `INTERNAL_EMAIL_ALLOWLIST=bora@ragsignal.com`, `TOKEN_ENCRYPTION_KEY` as a fresh random secret, plus the available provider and Google values. Provision or inspect Neon Auth and set the returned auth URL/configuration as secret values. Before writing any schema, use a read-only Neon table/schema inspection and one read-only query against an existing client.

After the first private deployment supplies its production URL, set `APP_URL` to that URL and add its exact Google OAuth callback address in Google Cloud before enabling the GSC/GA4 connect button.

- [ ] **Step 3: Run all automated validation**

Run: `npm test`

Expected: PASS; production build completes and all five Node test files pass.

- [ ] **Step 4: Commit configuration documentation and prepare the deployment**

```bash
git add .env.example README.md app/layout.tsx tests/projectb-runtime.test.mjs
git commit -m "docs: document ProjectB Sites runtime configuration"
```

Prepare a Sites checkpoint only after this commit and the test command pass. Save and deploy the exact prepared version, then verify its terminal deployment status before reporting the URL.

## Spec Coverage Review

### Task 9: Remediate production dependency findings

**Files:**
- Modify: `package.json`, `package-lock.json`
- Test: `tests/*.test.mjs`

**Interfaces:**
- Consumes: the committed dependency graph and `npm audit --omit=dev` report.
- Produces: a lockfile with no high-severity production dependency finding that can be remediated without an incompatible framework upgrade.

- [ ] **Step 1: Capture the failing audit baseline**

Run: `npm audit --omit=dev --audit-level=high`

Expected: FAIL and identify each high-severity package chain before changing the lockfile.

- [ ] **Step 2: Apply the smallest non-breaking dependency update**

Run: `npm audit fix --omit=dev`

Review `package.json` and `package-lock.json`; do not accept a major framework change without a new build and full test run.

- [ ] **Step 3: Verify behavior and residual findings**

Run: `npm test && npm audit --omit=dev --audit-level=high`

Expected: all tests pass. Document any residual finding whose only remediation requires an incompatible major-version upgrade, then propose the exact upgrade separately.

- [ ] **Step 4: Commit the reviewed remediation**

```bash
git add package.json package-lock.json
git commit -m "chore: remediate ProjectB production dependencies"
```

- Worker-compatible React and API port: Tasks 1–2.

- Worker-compatible React and API port: Tasks 1–2.
- Internal-only authentication, no demo or Firebase access: Task 3.
- Existing Neon schema with no destructive migration: Task 4 and Task 8 read-only validation.
- Analysis, provider, crawl, and persisted run-cycle features: Task 5.
- Brand Memory and AEO Studio: Task 6.
- GSC/GA4 integration with encrypted tokens: Task 7.
- Secret storage, deployment, callback configuration, and production validation: Task 8.

## Consistency Review

- The same `ProjectBEnv`, `requireInternalUser`, `createSql`, and `apiFetch` boundaries are used throughout all tasks.
- Every endpoint task protects routes with authenticated ownership before data access.
- The plan has no placeholder items, no unscoped migration, and no source-level secret values.
