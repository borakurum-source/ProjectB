import assert from "node:assert/strict";
import test from "node:test";

const projectMetadata =
  /<title>RAGSIGNAL \| AI Visibility Intelligence<\/title>[\s\S]*<meta(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']Internal RAG Signal AI visibility workspace\.["'])[^>]*>/i;

test("renders RAGSIGNAL production metadata", async () => {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  const response = await worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );

  assert.equal(response.status, 200);
  assert.match(
    response.headers.get("content-type") ?? "",
    /^text\/html\b/i,
  );
  assert.match(await response.text(), projectMetadata);
});
