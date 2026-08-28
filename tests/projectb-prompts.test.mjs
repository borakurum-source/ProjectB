import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";
import { fileURLToPath } from "node:url";

async function loadPrompts() {
  const vite = await createServer({
    appType: "custom",
    configFile: false,
    root: fileURLToPath(new URL("..", import.meta.url)),
    server: { middlewareMode: true, hmr: false, watch: { ignored: ['**/.sites-runtime/**'] } },
  });
  return { vite, prompts: await vite.ssrLoadModule("/worker/projectb/prompts.ts") };
}

test("AEO prompt restricts claims to supplied Brand Memory and requests citation-ready structure", async () => {
  const { vite, prompts } = await loadPrompts();
  try {
    const prompt = prompts.buildAeoPrompt({
      contentType: "faq_schema_page",
      topic: "AI visibility",
      competitor: "",
      language: "English",
      memories: [{ title: "Approved service", content: "RAGSIGNAL measures grounded AI mentions." }],
    });
    assert.match(prompt, /Use only the supplied Brand Memory/i);
    assert.match(prompt, /do not invent facts, statistics, customers, or citations/i);
    assert.match(prompt, /citation-ready/i);
    assert.match(prompt, /Approved service/);
  } finally { await vite.close(); }
});

test("diagnostic prompt requires evidence-aware recommendations rather than unsupported certainty", async () => {
  const { vite, prompts } = await loadPrompts();
  try {
    const prompt = prompts.buildDiagnosticPrompt({ client: "brandName: RAGSIGNAL", prompt: "best AEO agency", runs: [] });
    assert.match(prompt, /Insufficient evidence/i);
    assert.match(prompt, /do not claim causation/i);
    assert.match(prompt, /observedEvidence/i);
  } finally { await vite.close(); }
});

test("Gemini content calls attach the central RAGSIGNAL system instruction server-side", async () => {
  const { vite, prompts } = await loadPrompts();
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (_url, init) => {
    requestBody = JSON.parse(init.body);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "ok" }] } }] }), { headers: { "content-type": "application/json" } });
  };
  try {
    const { callGemini } = await vite.ssrLoadModule("/worker/projectb/providers.ts");
    assert.equal(await callGemini({ GEMINI_API_KEY: "test-key" }, "Write a short brief."), "ok");
    assert.match(requestBody.systemInstruction.parts[0].text, /RAGSIGNAL/);
    assert.match(requestBody.systemInstruction.parts[0].text, /Never invent facts/i);
    assert.equal(requestBody.contents[0].parts[0].text, "Write a short brief.");
    assert.equal(requestBody.systemInstruction.parts[0].text, prompts.RAGSIGNAL_SYSTEM_INSTRUCTION);
  } finally {
    globalThis.fetch = originalFetch;
    await vite.close();
  }
});
