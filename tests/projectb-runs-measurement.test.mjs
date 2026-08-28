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

test("a grounded run sends the tracked prompt verbatim and performs structured extraction", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, init) => {
    requests.push({ url, body: JSON.parse(init.body) });
    if (requests.length === 1) {
      return new Response(JSON.stringify({
        candidates: [{
          content: { parts: [{ text: "RAGSIGNAL is a grounded AI visibility platform." }] },
          groundingMetadata: {
            groundingChunks: [{ web: { uri: "https://vertexaisearch.google.com/redirect/abc", title: "docs.ragsignal.com" } }],
            webSearchQueries: ["best AI visibility platform"],
          },
        }],
      }), { headers: { "content-type": "application/json" } });
    }
    return new Response(JSON.stringify({
      candidates: [{ content: { parts: [{ text: JSON.stringify({
        mentionedBrands: [{ name: "RAGSIGNAL", isClient: true, isKnownCompetitor: false, sentiment: "Positive", verbatimQuote: "RAGSIGNAL is a grounded AI visibility platform." }],
        orderedList: true,
        rankedNames: ["RAGSIGNAL"],
        recommendedEntityType: "software",
        answerFormat: "prose",
      }) }] } }],
    }), { headers: { "content-type": "application/json" } });
  };

  const { vite, value: { measureRun } } = await load("/worker/projectb/services/runMeasurement.ts");
  try {
    const result = await measureRun({ GEMINI_API_KEY: "test-key" }, {
      promptText: "best AI visibility platform",
      client: { id: "client-1", brandName: "RAGSIGNAL", aliases: ["RAG Signal"], domain: "ragsignal.com", competitorBrands: ["Other Brand"] },
    });

    assert.equal(requests.length, 2);
    assert.equal(requests[0].body.contents[0].parts[0].text, "best AI visibility platform");
    assert.equal(requests[0].body.tools[0].googleSearch ? true : false, true);
    assert.equal(requests[1].body.tools, undefined);
    assert.equal(requests[1].body.generationConfig.responseMimeType, "application/json");
    assert.ok(requests[1].body.generationConfig.responseSchema);
    assert.equal(result.brandMentioned, true);
    assert.equal(result.brandCited, true);
    assert.equal(result.position, 1);
    assert.equal(result.groundingSources[0].resolvedDomain, "docs.ragsignal.com");
    assert.equal(result.groundingSources[0].uri, "https://vertexaisearch.google.com/redirect/abc");
    assert.equal(result.mentionedBrands[0].name, "RAGSIGNAL");
  } finally {
    globalThis.fetch = originalFetch;
    await vite.close();
  }
});

test("structured extraction rejects malformed model output instead of inventing run metrics", async () => {
  const originalFetch = globalThis.fetch;
  let callCount = 0;
  globalThis.fetch = async (_url, init) => {
    callCount += 1;
    const body = callCount === 1
      ? { candidates: [{ content: { parts: [{ text: "A neutral answer." }] } }] }
      : { candidates: [{ content: { parts: [{ text: JSON.stringify({ orderedList: false }) }] } }] };
    return new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } });
  };

  const { vite, value: { measureRun } } = await load("/worker/projectb/services/runMeasurement.ts");
  try {
    await assert.rejects(
      measureRun({ GEMINI_API_KEY: "test-key" }, {
        promptText: "best AI visibility platform",
        client: { id: "client-1", brandName: "RAGSIGNAL", aliases: [], domain: "ragsignal.com", competitorBrands: [] },
      }),
      /mentionedBrands/i,
    );
  } finally {
    globalThis.fetch = originalFetch;
    await vite.close();
  }
});
