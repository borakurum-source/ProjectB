import assert from "node:assert/strict";
import test from "node:test";

test("creates the SQL client only from the runtime DATABASE_URL", async () => {
  const { createSql } = await import("../worker/projectb/db.ts");
  const sql = createSql({ DATABASE_URL: "postgresql://runtime-value" });
  assert.equal(typeof sql, "function");
});

test("workspace query binds the authenticated owner id", async () => {
  const { getWorkspace } = await import("../worker/projectb/db.ts");
  const calls = [];
  const fakeSql = Object.assign(async (strings, ...values) => {
    calls.push({ strings, values });
    return [];
  }, { transaction: async (fn) => fn(fakeSql) });

  await getWorkspace(fakeSql, "user-1");
  assert.deepEqual(calls[0].values, ["user-1"]);
});

test("Brand Memory list scopes its read to the requested client", async () => {
  const { createServer } = await import("vite");
  const { fileURLToPath } = await import("node:url");
  const vite = await createServer({ appType: "custom", configFile: false, root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } } });
  try {
    const { listBrandMemory } = await vite.ssrLoadModule("/worker/projectb/routes/memory.ts");
    const calls = [];
    const fakeSql = async (strings, ...values) => { calls.push(values); return [{ id: "memory-1", client_id: "client-1" }]; };
    const items = await listBrandMemory(fakeSql, "owner-1", "client-1");
    assert.equal(items[0].clientId, "client-1");
    assert.deepEqual(calls[0], ["client-1", "owner-1"]);
  } finally { await vite.close(); }
});

test("client-scoped list helpers bind both the authenticated owner and client", async () => {
  const { listPrompts, listRuns, listDiagnostics, listActions } = await import("../worker/projectb/db.ts");
  const calls = [];
  const fakeSql = async (_strings, ...values) => { calls.push(values); return []; };

  await listPrompts(fakeSql, "owner-1", "client-1");
  await listRuns(fakeSql, "owner-1", "client-1");
  await listDiagnostics(fakeSql, "owner-1", "client-1");
  await listActions(fakeSql, "owner-1", "client-1");

  for (const values of calls) {
    assert.deepEqual(values, ["client-1", "owner-1"]);
  }
});

test("saving a prompt rejects a client owned by another user", async () => {
  const { savePrompt } = await import("../worker/projectb/db.ts");
  const calls = [];
  const fakeSql = async (_strings, ...values) => { calls.push(values); return []; };

  await assert.rejects(
    savePrompt(fakeSql, "owner-1", { id: "prompt-1", clientId: "client-1", text: "Question", intentLayer: "Commercial", category: "Core" }),
    /Client not found/i,
  );
  assert.deepEqual(calls[0], ["client-1", "owner-1"]);
  assert.equal(calls.length, 1);
});

test("saving a client rejects an existing client owned by another user", async () => {
  const { saveClient } = await import("../worker/projectb/db.ts");
  const fakeSql = async () => [{ id: "client-1", owner_id: "owner-2" }];

  await assert.rejects(
    saveClient(fakeSql, "owner-1", { id: "client-1", brandName: "Other", domain: "other.example", industry: "Software", market: "Global", language: "English" }),
    /Client not found/i,
  );
});

test("Provider snapshot list scopes its read to the authenticated owner and client", async () => {
  const { listProviderSnapshots } = await import("../worker/projectb/db.ts");
  const calls = [];
  const fakeSql = async (strings, ...values) => {
    calls.push(values);
    return [{ id: "snapshot-1", owner_id: "user-1", client_id: "client-1" }];
  };

  const snapshots = await listProviderSnapshots(fakeSql, "user-1", "client-1");

  assert.equal(snapshots[0].clientId, "client-1");
  assert.deepEqual(calls[0], ["user-1", "client-1"]);
});

test("Provider snapshot writes verify client ownership before persisting source data", async () => {
  const { saveProviderSnapshot } = await import("../worker/projectb/db.ts");
  const calls = [];
  const fakeSql = async (strings, ...values) => {
    calls.push(values);
    return calls.length === 1 ? [{ id: "client-1" }] : [];
  };

  const snapshot = await saveProviderSnapshot(fakeSql, "user-1", {
    id: "snapshot-1",
    clientId: "client-1",
    provider: "gemini-grounded",
    status: "available",
    capturedAt: "2026-08-28T00:00:00.000Z",
    promptSetFingerprint: "prompt-set-a",
    promptCount: 15,
    engineLabel: "Gemini",
    metrics: { visibility: 0.2 },
    rawPayload: { source: "Gemini" },
  });

  assert.equal(snapshot.ownerId, "user-1");
  assert.equal(snapshot.clientId, "client-1");
  assert.deepEqual(calls[0], ["client-1", "user-1"]);
  assert.equal(calls[2][1], "user-1");
  assert.equal(calls[2][2], "client-1");
});
