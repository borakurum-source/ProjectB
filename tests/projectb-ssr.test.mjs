import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

test("ProjectB can render on the Worker without browser globals", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({ appType: "custom", configFile: false, root, server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } } });
  const originalWindow = globalThis.window;
  try {
    delete globalThis.window;
    const { default: ProjectBClient } = await vite.ssrLoadModule("/app/projectb-client.tsx");
    assert.doesNotThrow(() => renderToString(createElement(ProjectBClient)));
  } finally {
    globalThis.window = originalWindow;
    await vite.close();
  }
});
