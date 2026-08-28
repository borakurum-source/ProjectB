import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";
import { readFile } from "node:fs/promises";

test("browser API requests include the authenticated session cookie", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    root,
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
  const originalFetch = globalThis.fetch;
  let receivedInit;
  globalThis.fetch = async (_input, init) => {
    receivedInit = init;
    return new Response(JSON.stringify({ ok: true }), {
      headers: { "content-type": "application/json" },
    });
  };
  try {
    const { apiFetch } = await vite.ssrLoadModule(
      "/features/projectb/services/api.ts",
    );
    assert.deepEqual(await apiFetch("/api/health"), { ok: true });
    assert.equal(receivedInit.credentials, "include");
  } finally {
    globalThis.fetch = originalFetch;
    await vite.close();
  }
});

test("health requests are handled before the application renderer", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    root,
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
  try {
    const { handleApiRequest } = await vite.ssrLoadModule(
      "/worker/projectb/router.ts",
    );
    const response = await handleApiRequest(
      new Request("https://projectb.test/api/health"),
      {},
      { waitUntil() {} },
    );
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.ok, true);
    assert.equal(body.service, "ragsignal");
    assert.equal(body.geminiModel, "gemini-2.5-flash");
  } finally {
    await vite.close();
  }
});

test("the current Sites user is exposed through the internal auth endpoint", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    root,
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
  try {
    const { handleApiRequest } = await vite.ssrLoadModule(
      "/worker/projectb/router.ts",
    );
    const response = await handleApiRequest(
      new Request("https://projectb.test/api/auth/me", {
        headers: { "oai-authenticated-user-email": "bora@ragsignal.com" },
      }),
      { INTERNAL_EMAIL_ALLOWLIST: "bora@ragsignal.com" },
      { waitUntil() {} },
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).user.email, "bora@ragsignal.com");
  } finally {
    await vite.close();
  }
});

test("workspace hydration loads persisted page analyses for the active client", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const source = await readFile(new URL("../features/projectb/App.tsx", import.meta.url), "utf8");
  assert.match(source, /fetch\(`\/api\/db\/page-analyses\?clientId=/);
  assert.match(source, /setPageAnalyses\(/);
});

test("onboarding assigns the authenticated owner instead of a shared seed owner", async () => {
  const source = await readFile(new URL("../features/projectb/App.tsx", import.meta.url), "utf8");
  assert.match(source, /ownerId:\s*user\.id/);
  const modal = await readFile(new URL("../features/projectb/components/OnboardingModal.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(modal, /ownerId:\s*['"]default-owner['"] /);
});
