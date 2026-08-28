import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("..", import.meta.url);

test("onboarding never promotes fabricated fallback data after a failed crawl", async () => {
  const source = await readFile(new URL("features/projectb/components/OnboardingModal.tsx", root), "utf8");
  assert.doesNotMatch(source, /Fallback transition to step 2/);
  assert.doesNotMatch(source, /setStep\(2\);\s*}\s*finally/s);
  assert.match(source, /crawlError/);
});

test("interactive provider actions check non-2xx responses before mutating state", async () => {
  const aeo = await readFile(new URL("features/projectb/components/tabs/AeoStudioTab.tsx", root), "utf8");
  const prompts = await readFile(new URL("features/projectb/components/tabs/PromptsTab.tsx", root), "utf8");
  const pages = await readFile(new URL("features/projectb/components/tabs/PagesTab.tsx", root), "utf8");
  assert.match(aeo, /if \(!res\.ok\)/);
  assert.match(prompts, /if \(!res\.ok\)/);
  assert.match(pages, /if \(!res\.ok\)/);
});

test("quality gates keep visibility measurement and provider scope explicit", async () => {
  const providers = await readFile(new URL("worker/projectb/db.ts", root), "utf8");
  const runs = await readFile(new URL("worker/projectb/routes/runs.ts", root), "utf8");
  const graph = await readFile(new URL("features/projectb/services/brandMemoryGraph.ts", root), "utf8");
  assert.match(providers, /gemini-grounded/);
  assert.match(providers, /firecrawl/);
  assert.doesNotMatch(providers, /ubersuggest|otterly|ahrefs/i);
  assert.match(runs, /expectedCallCount = expectedRunCount \* 2/);
  assert.match(runs, /measureRun\(env/);
  assert.match(graph, /nodes\.push/);
});

test("reports never invent sample sizes, URL citations, trends, or model names", async () => {
  const report = await readFile(new URL("features/projectb/services/reportData.ts", root), "utf8");
  const overview = await readFile(new URL("features/projectb/components/tabs/OverviewTab.tsx", root), "utf8");
  const inspector = await readFile(new URL("features/projectb/components/RunInspectorModal.tsx", root), "utf8");
  assert.doesNotMatch(report, /runsCount\s*\|\|\s*3/);
  assert.doesNotMatch(report, /clientTopUrls\.push/);
  assert.doesNotMatch(report, /trend:\s*['"]↑/);
  assert.match(report, /engineLabel:\s*['"]Gemini Grounded['"]/);
  assert.doesNotMatch(overview, /Gemini 2\.5\/3\.7/);
  assert.doesNotMatch(inspector, /gemini-3\.7-flash/);
});

test("child writes cannot cross-link records from another client or owner", async () => {
  const db = await readFile(new URL("worker/projectb/db.ts", root), "utf8");
  const data = await readFile(new URL("worker/projectb/routes/data.ts", root), "utf8");
  assert.match(db, /assertOwnedPrompt/);
  assert.match(db, /assertOwnedCycle/);
  assert.match(db, /assertOwnedDiagnostic/);
  assert.match(db, /existing.*owner_id.*client_id/s);
  assert.match(data, /savePromptBatch/);
  assert.doesNotMatch(data, /for \(const prompt of prompts\) await savePrompt/);
});

test("workspace reads surface authorization/database failures instead of rendering an empty fake state", async () => {
  const app = await readFile(new URL("features/projectb/App.tsx", root), "utf8");
  assert.match(app, /if \(!res\.ok\)/);
  assert.match(app, /setPersistenceError\(/);
  assert.match(app, /pRes\.ok.*rRes\.ok.*dRes\.ok/s);
});

test("trend and competitor views do not invent baselines or categories", async () => {
  const trends = await readFile(new URL("features/projectb/components/tabs/MarketTrendsTab.tsx", root), "utf8");
  const competitors = await readFile(new URL("features/projectb/components/tabs/CompetitorsTab.tsx", root), "utf8");
  assert.doesNotMatch(trends, /Fallback empty data point/);
  assert.doesNotMatch(trends, /baseline-0/);
  assert.doesNotMatch(trends, /totalRuns = .*\|\| .*\|\| 1/);
  assert.doesNotMatch(competitors, /return 'ECOMMERCE';/);
});

test("Brand Brain sync ingests only observed run evidence and profile facts", async () => {
  const memoryRoute = await readFile(new URL("worker/projectb/routes/memory.ts", root), "utf8");
  const memoryTab = await readFile(new URL("features/projectb/components/tabs/BrandMemoryTab.tsx", root), "utf8");
  assert.match(memoryRoute, /from runs where client_id/);
  assert.match(memoryRoute, /run_cycle_insight/);
  assert.match(memoryRoute, /ai_perception_insight/);
  assert.doesNotMatch(memoryTab, /Web \+ GSC \+ AI Perceptions/);
});

test("overview keeps share of voice and volatility unavailable before measurement", async () => {
  const overview = await readFile(new URL("features/projectb/components/tabs/OverviewTab.tsx", root), "utf8");
  assert.doesNotMatch(overview, /clientSov\s*=.*\?\?\s*0/);
  assert.match(overview, /Not measured/);
});
