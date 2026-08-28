import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("batch sync uses a single Neon transaction for client and prompt writes", async () => {
  const db = await readFile(new URL("../worker/projectb/db.ts", import.meta.url), "utf8");
  const route = await readFile(new URL("../worker/projectb/routes/data.ts", import.meta.url), "utf8");
  assert.match(db, /export async function saveBatchSync/);
  assert.match(db, /\.transaction\(/);
  assert.match(route, /saveBatchSync\(/);
});
