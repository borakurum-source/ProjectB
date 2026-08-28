import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

async function load(module) {
  const vite = await createServer({ appType: "custom", configFile: false, root: fileURLToPath(new URL("..", import.meta.url)), server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } } });
  return { vite, value: await vite.ssrLoadModule(module) };
}

test("encrypts and restores OAuth tokens without storing plaintext", async () => {
  const { vite, value: { encryptSecret, decryptSecret } } = await load("/worker/projectb/crypto.ts");
  try {
    const token = "refresh-token-value";
    const env = { TOKEN_ENCRYPTION_KEY: "01234567890123456789012345678901" };
    const encrypted = await encryptSecret(token, env);
    assert.notEqual(encrypted, token);
    assert.match(encrypted, /^v1:/);
    assert.equal(await decryptSecret(encrypted, env), token);
  } finally { await vite.close(); }
});

test("rejects OAuth state signed for a different Sites user", async () => {
  const { vite, value: { signGoogleState, verifyGoogleState } } = await load("/worker/projectb/crypto.ts");
  try {
    const env = { TOKEN_ENCRYPTION_KEY: "01234567890123456789012345678901" };
    const state = await signGoogleState({ ownerId: "user-1", clientId: "client-1", expiresAt: Date.now() + 300_000 }, env);
    assert.equal(await verifyGoogleState(state, "user-2", env), undefined);
  } finally { await vite.close(); }
});
