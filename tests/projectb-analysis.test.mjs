import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

async function load(module) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({ appType: "custom", configFile: false, root, server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } } });
  return { vite, value: await vite.ssrLoadModule(module) };
}

test("returns a safe 503 when Firecrawl is not configured", async () => {
  const { vite, value: { firecrawlSearch } } = await load("/worker/projectb/routes/analysis.ts");
  try {
    const response = await firecrawlSearch(
      new Request("https://projectb.test/api/firecrawl/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: "catering" }),
      }),
      {},
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Firecrawl is not configured" });
  } finally { await vite.close(); }
});

test("never returns a provider key in an error response", async () => {
  const { vite, value: { providerFailure } } = await load("/worker/projectb/providers.ts");
  try {
    const response = providerFailure(new Error("upstream failed: sk-secret-value"));
    assert.equal(response.status, 502);
    assert.doesNotMatch(JSON.stringify(await response.json()), /API_KEY|sk-secret-value|pplx-/i);
  } finally { await vite.close(); }
});

test("Gemini requests use the current API-key header and trim copied whitespace", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, init) => {
    request = { url: String(url), headers: init.headers, body: JSON.parse(init.body) };
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), {
      headers: { "content-type": "application/json" },
    });
  };
  const { vite, value: { callGemini } } = await load("/worker/projectb/providers.ts");
  try {
    assert.equal(await callGemini({ GEMINI_API_KEY: "  copied-key\n" }, "Return a short answer."), "ok");
    assert.equal(request.url, "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent");
    assert.equal(request.headers["x-goog-api-key"], "copied-key");
    assert.equal(request.url.includes("key="), false);
  } finally {
    globalThis.fetch = originalFetch;
    await vite.close();
  }
});

test("Gemini provider errors identify invalid requests without exposing upstream details", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({
    error: { code: 400, message: "API key not valid: secret-key-value" },
  }), { status: 400, headers: { "content-type": "application/json" } });
  const { vite, value: { callGemini } } = await load("/worker/projectb/providers.ts");
  try {
    const response = await callGemini({ GEMINI_API_KEY: "secret-key-value" }, "Return JSON.");
    assert.equal(response.status, 502);
    const body = await response.json();
    assert.match(body.error, /Gemini rejected the request/i);
    assert.doesNotMatch(JSON.stringify(body), /secret-key-value|API_KEY/i);
  } finally {
    globalThis.fetch = originalFetch;
    await vite.close();
  }
});

test("run-cycle status binds its query to the authenticated owner", async () => {
  const { vite, value: { getCycleStatus } } = await load("/worker/projectb/routes/runs.ts");
  const calls = [];
  const sql = async (strings, ...values) => { calls.push(values); return []; };
  try {
    assert.equal(await getCycleStatus(sql, "user-1", "cycle-1"), undefined);
    assert.deepEqual(calls[0], ["cycle-1", "user-1"]);
  } finally { await vite.close(); }
});

test("run-cycle status reports run progress separately from provider call count", async () => {
  const { vite, value: { cycleProgress } } = await load("/worker/projectb/routes/runs.ts");
  try {
    assert.deepEqual(cycleProgress({ expectedRunCount: 6, expectedCallCount: 12, completedRunCount: 2, callCount: 4 }), {
      completed: 2,
      total: 6,
      callsCompleted: 4,
      callsTotal: 12,
    });
  } finally { await vite.close(); }
});

test("run-cycle creation records the complete expected workload", async () => {
  const source = await (await import("node:fs/promises")).readFile(new URL("../worker/projectb/routes/runs.ts", import.meta.url), "utf8");
  assert.match(source, /expected_run_count/);
  assert.match(source, /expected_call_count/);
  assert.match(source, /completed_run_count/);
});

test("page signals parse JSON-LD @graph and emit the six-dimension status vocabulary", async () => {
  const { vite, value: { pageSignals, pageAnalysisStatuses } } = await load("/worker/projectb/routes/analysis.ts");
  try {
    const signals = pageSignals('<h1>RAG Signal</h1><h2>What is it?</h2><p>RAG Signal measures AI visibility.</p><script type="application/ld+json">{"@graph":[{"@type":"Organization"}]}</script>');
    assert.deepEqual(signals.schemaTypes, ["Organization"]);
    assert.equal(signals.hasClearHeadingAnswers, true);
    assert.deepEqual(pageAnalysisStatuses, ["Strong", "Adequate", "Weak", "Missing", "Unknown"]);
  } finally { await vite.close(); }
});

test("run-cycle lifecycle marks abandoned jobs stale instead of completed", async () => {
  const { vite, value: { isCycleStale } } = await load("/worker/projectb/routes/runs.ts");
  try {
    assert.equal(isCycleStale({ status: "running", startedAt: "2026-08-28T00:00:00.000Z" }, "2026-08-28T00:30:00.000Z"), true);
    assert.equal(isCycleStale({ status: "completed", startedAt: "2026-08-28T00:00:00.000Z" }, "2026-08-28T00:30:00.000Z"), false);
  } finally { await vite.close(); }
});
