import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

async function createTestServer() {
  return createServer({
    appType: "custom",
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
}

async function load(module) {
  const vite = await createTestServer();
  return { vite, value: await vite.ssrLoadModule(module) };
}

test("keeps an unavailable provider distinct from a measured zero", async () => {
  const vite = await createTestServer();
  try {
    const snapshots = await vite.ssrLoadModule("/features/projectb/services/providerSnapshots.ts");
    const state = snapshots.classifyProviderSnapshot({
      clientId: "client-1",
      provider: "gemini-grounded",
      status: "unavailable",
      capturedAt: "2026-08-28T00:00:00.000Z",
    });

    assert.equal(state.kind, "unavailable");
    assert.equal(state.label, "Provider unavailable");
    assert.equal(state.canUseAsMetric, false);
  } finally {
    await vite.close();
  }
});

test("marks source snapshots stale without discarding their provenance", async () => {
  const vite = await createTestServer();
  try {
    const snapshots = await vite.ssrLoadModule("/features/projectb/services/providerSnapshots.ts");
    const state = snapshots.classifyProviderSnapshot({
      clientId: "client-1",
      provider: "firecrawl",
      status: "available",
      capturedAt: "2026-08-01T00:00:00.000Z",
      promptSetFingerprint: "prompt-set-a",
      promptCount: 15,
      engineLabel: "Gemini",
    }, { now: "2026-08-28T00:00:00.000Z", maxAgeDays: 14 });

    assert.equal(state.kind, "stale");
    assert.match(state.detail, /15 prompts/);
    assert.equal(state.canUseAsMetric, true);
  } finally {
    await vite.close();
  }
});

test("does not compare provider metrics across different prompt sets", async () => {
  const vite = await createTestServer();
  try {
    const snapshots = await vite.ssrLoadModule("/features/projectb/services/providerSnapshots.ts");
    const comparison = snapshots.canCompareProviderSnapshots(
      {
        clientId: "client-1",
        provider: "gemini-grounded",
        status: "available",
        capturedAt: "2026-08-28T00:00:00.000Z",
        promptSetFingerprint: "prompt-set-a",
        promptCount: 15,
        engineLabel: "Gemini Grounded",
      },
      {
        clientId: "client-1",
        provider: "firecrawl",
        status: "available",
        capturedAt: "2026-08-28T00:00:00.000Z",
        promptSetFingerprint: "prompt-set-b",
        promptCount: 17,
        engineLabel: "Gemini",
      },
    );

    assert.deepEqual(comparison, {
      comparable: false,
      reason: "Prompt sets differ",
    });
  } finally {
    await vite.close();
  }
});

test("canceled third-party providers are not accepted or represented in runtime schema", async () => {
  const { vite, value: { saveProviderSnapshot } } = await load("/worker/projectb/db.ts");
  try {
    const fakeSql = async (strings, ...values) => values[0] === "client-1" ? [{ id: "client-1" }] : [];
    await assert.rejects(
      saveProviderSnapshot(fakeSql, "owner-1", { clientId: "client-1", provider: "ubersuggest-ai-visibility", status: "available", capturedAt: "2026-08-28T00:00:00.000Z" }),
      /provider is invalid/i,
    );
  } finally { await vite.close(); }
});
