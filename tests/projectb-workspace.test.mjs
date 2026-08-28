import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

test("an empty Neon workspace has no fabricated active client", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    root,
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
  try {
    const { selectActiveClient } = await vite.ssrLoadModule(
      "/features/projectb/workspace.ts",
    );
    assert.equal(selectActiveClient([], "missing"), undefined);
    assert.deepEqual(
      selectActiveClient([{ id: "client-1", brandName: "RAG Signal" }], "client-1"),
      { id: "client-1", brandName: "RAG Signal" },
    );
  } finally {
    await vite.close();
  }
});
