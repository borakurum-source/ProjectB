import type { ProjectBEnv } from "./env";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function encryptionKey(env: Pick<ProjectBEnv, "TOKEN_ENCRYPTION_KEY">): Promise<CryptoKey> {
  if (!env.TOKEN_ENCRYPTION_KEY) throw new Error("Token encryption is not configured");
  const hash = await crypto.subtle.digest("SHA-256", encoder.encode(env.TOKEN_ENCRYPTION_KEY));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptSecret(value: string, env: Pick<ProjectBEnv, "TOKEN_ENCRYPTION_KEY">): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await encryptionKey(env);
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoder.encode(value)));
  return `v1:${bytesToBase64(iv)}:${bytesToBase64(ciphertext)}`;
}

export async function decryptSecret(value: string, env: Pick<ProjectBEnv, "TOKEN_ENCRYPTION_KEY">): Promise<string> {
  const [version, encodedIv, encodedCiphertext] = value.split(":");
  if (version !== "v1" || !encodedIv || !encodedCiphertext) throw new Error("Invalid encrypted value");
  const plaintext = await crypto.subtle.decrypt({ name: "AES-GCM", iv: base64ToBytes(encodedIv) }, await encryptionKey(env), base64ToBytes(encodedCiphertext));
  return decoder.decode(plaintext);
}

export interface GoogleState { ownerId: string; clientId?: string; expiresAt: number; }

export async function signGoogleState(state: GoogleState, env: Pick<ProjectBEnv, "TOKEN_ENCRYPTION_KEY">): Promise<string> {
  return encryptSecret(JSON.stringify(state), env);
}

export async function verifyGoogleState(state: string, ownerId: string, env: Pick<ProjectBEnv, "TOKEN_ENCRYPTION_KEY">): Promise<GoogleState | undefined> {
  try {
    const value = JSON.parse(await decryptSecret(state, env)) as GoogleState;
    return value.ownerId === ownerId && Number.isFinite(value.expiresAt) && value.expiresAt >= Date.now() ? value : undefined;
  } catch { return undefined; }
}
