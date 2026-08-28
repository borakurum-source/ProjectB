import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

const env = {
  NEON_AUTH_URL: "https://auth.example.test",
  INTERNAL_EMAIL_ALLOWLIST: "bora@ragsignal.com, team@ragsignal.com",
};

const requestFor = (email) =>
  new Request("https://projectb.test/api/auth/me", {
    headers: { "x-test-email": email },
  });

const fakeSession = async (request) => {
  const email = request.headers.get("x-test-email");
  return email
    ? { user: { id: `id:${email}`, email, name: "Internal User" } }
    : null;
};

test("allows a verified listed email", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    root,
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
  try {
    const { requireInternalUser } = await vite.ssrLoadModule(
      "/worker/projectb/auth.ts",
    );
    const result = await requireInternalUser(
      requestFor("BORA@RAGSIGNAL.COM"),
      env,
      fakeSession,
    );
    assert.equal(result.email, "bora@ragsignal.com");
    assert.equal(result.id, "id:BORA@RAGSIGNAL.COM");
  } finally {
    await vite.close();
  }
});

test("rejects an authenticated but unlisted email", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    root,
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
  try {
    const { requireInternalUser } = await vite.ssrLoadModule(
      "/worker/projectb/auth.ts",
    );
    const result = await requireInternalUser(
      requestFor("outside@example.com"),
      env,
      fakeSession,
    );
    assert.ok(result instanceof Response);
    assert.equal(result.status, 403);
    assert.deepEqual(await result.json(), { error: "Access denied" });
  } finally {
    await vite.close();
  }
});

test("rejects a Sites-authenticated user outside the single-account allowlist", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    root,
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
  try {
    const { requireInternalUser } = await vite.ssrLoadModule(
      "/worker/projectb/auth.ts",
    );
    const request = new Request("https://projectb.test/api/auth/me", {
      headers: { "oai-authenticated-user-email": "internal.member@example.com" },
    });
    const result = await requireInternalUser(request, env, async () => null);
    assert.ok(result instanceof Response);
    assert.equal(result.status, 403);
  } finally {
    await vite.close();
  }
});

test("allows the listed Sites owner account", async () => {
  const root = fileURLToPath(new URL("..", import.meta.url));
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    root,
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
  try {
    const { requireInternalUser } = await vite.ssrLoadModule(
      "/worker/projectb/auth.ts",
    );
    const request = new Request("https://projectb.test/api/auth/me", {
      headers: { "oai-authenticated-user-email": "bora@ragsignal.com" },
    });
    const result = await requireInternalUser(request, env, async () => null);
    assert.equal(result.email, "bora@ragsignal.com");
    assert.equal(result.id, "site:bora@ragsignal.com");
  } finally {
    await vite.close();
  }
});
