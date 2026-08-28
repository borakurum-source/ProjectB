import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

async function load(module) {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    root,
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
  return { vite, value: await vite.ssrLoadModule(module) };
}

test("Brand Memory rejects a client that is not owned by the authenticated user", async () => {
  const { vite, value: { listBrandMemory } } = await load("/worker/projectb/routes/memory.ts");
  const calls = [];
  const fakeSql = async (_strings, ...values) => { calls.push(values); return []; };
  try {
    await assert.rejects(listBrandMemory(fakeSql, "owner-1", "client-2"), /Client not found/i);
    assert.deepEqual(calls[0], ["client-2", "owner-1"]);
  } finally { await vite.close(); }
});

test("client listing is scoped to the authenticated owner", async () => {
  const { listClients } = await import("../worker/projectb/db.ts");
  const calls = [];
  const fakeSql = async (_strings, ...values) => { calls.push(values); return []; };
  await listClients(fakeSql, "owner-1");
  assert.deepEqual(calls[0], ["owner-1"]);
});
