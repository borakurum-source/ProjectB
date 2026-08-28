import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("page analysis keeps qualitative statuses and does not emit a synthetic score", async () => {
  const source = await readFile(new URL("../worker/projectb/routes/analysis.ts", import.meta.url), "utf8");
  assert.match(source, /pageAnalysisStatuses/);
  assert.doesNotMatch(source, /extractabilityScore:\s*score/);
  assert.match(source, /X-Robots-Tag/);
  assert.match(source, /robots\.txt/);
});

test("page analysis findings carry observable evidence and concrete recommendations", async () => {
  const source = await readFile(new URL("../worker/projectb/routes/analysis.ts", import.meta.url), "utf8");
  assert.match(source, /dimension:\s*"Entity Clarity"/);
  assert.match(source, /concreteSuggestion/);
  assert.match(source, /extractabilityStatus/);
  assert.match(source, /isValidPageAnalysis/);
});
