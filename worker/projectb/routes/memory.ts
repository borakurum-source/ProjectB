import { requireInternalUser } from "../auth";
import { assertOwnedClient, camelize, createSql } from "../db";
import type { ProjectBEnv } from "../env";
import { json, notFound } from "../http";
import { callFirecrawl, callGemini, isResponse, validHttpUrl } from "../providers";
import { buildBrandMemoryAnswerPrompt } from "../prompts";

type Item = Record<string, unknown>;
const idPattern = /^[a-zA-Z0-9_-]{1,160}$/;
const arrayOfStrings = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.slice(0, 1000)).slice(0, 100) : [];
const invalid = (message: string) => json(400, { error: message });

async function payload(request: Request): Promise<Item> {
  const value = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid JSON body");
  return value as Item;
}

export async function listBrandMemory(sql: ReturnType<typeof createSql>, ownerId: string, clientId: string) {
  await assertOwnedClient(sql, ownerId, clientId);
  const rows = await sql`select * from brand_memories where client_id = ${clientId} order by updated_at desc`;
  return rows.map(camelize);
}

async function insert(sql: ReturnType<typeof createSql>, ownerId: string, input: Item) {
  await assertOwnedClient(sql, ownerId, String(input.clientId));
  const item = {
    id: crypto.randomUUID(), clientId: String(input.clientId), title: String(input.title).slice(0, 300), entityType: String(input.entityType).slice(0, 100), sourceUrl: input.sourceUrl ? String(input.sourceUrl).slice(0, 2000) : null,
    sourceType: String(input.sourceType ?? "manual").slice(0, 100), content: String(input.content).slice(0, 100_000), keyFacts: arrayOfStrings(input.keyFacts), tags: arrayOfStrings(input.tags),
    confidence: ["High", "Medium", "Low"].includes(String(input.confidence)) ? String(input.confidence) : "High",
  };
  await sql`insert into brand_memories (id, client_id, title, entity_type, source_url, source_type, content, key_facts, confidence, tags, created_at, updated_at) values (${item.id}, ${item.clientId}, ${item.title}, ${item.entityType}, ${item.sourceUrl}, ${item.sourceType}, ${item.content}, ${JSON.stringify(item.keyFacts)}::jsonb, ${item.confidence}, ${JSON.stringify(item.tags)}::jsonb, now(), now())`;
  return { ...item, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
}

async function upsertDerivedMemory(sql: ReturnType<typeof createSql>, ownerId: string, input: Item) {
  await assertOwnedClient(sql, ownerId, String(input.clientId));
  const title = String(input.title).slice(0, 300);
  const sourceType = String(input.sourceType ?? "ai_synthesized").slice(0, 100);
  const existing = await sql`select id from brand_memories where client_id = ${String(input.clientId)} and title = ${title} and source_type = ${sourceType} order by updated_at desc limit 1`;
  const keyFacts = arrayOfStrings(input.keyFacts);
  const tags = arrayOfStrings(input.tags);
  const content = String(input.content).slice(0, 100_000);
  const confidence = ["High", "Medium", "Low"].includes(String(input.confidence)) ? String(input.confidence) : "High";
  if (existing[0]) {
    const id = String(existing[0].id);
    await sql`update brand_memories set content = ${content}, key_facts = ${JSON.stringify(keyFacts)}::jsonb, confidence = ${confidence}, tags = ${JSON.stringify(tags)}::jsonb, updated_at = now() where id = ${id} and client_id = ${String(input.clientId)}`;
    return { id, clientId: String(input.clientId), title, entityType: String(input.entityType), sourceUrl: input.sourceUrl ? String(input.sourceUrl) : null, sourceType, content, keyFacts, tags, confidence, updatedAt: new Date().toISOString() };
  }
  return insert(sql, ownerId, { ...input, title, sourceType, content, keyFacts, tags, confidence });
}

async function crawl(request: Request, env: ProjectBEnv, ownerId: string): Promise<Response> {
  let data: Item; try { data = await payload(request); } catch { return invalid("Invalid JSON body"); }
  const clientId = typeof data.clientId === "string" && idPattern.test(data.clientId) ? data.clientId : undefined;
  const url = validHttpUrl(data.url); if (!clientId || !url) return invalid("A valid clientId and URL are required");
  const scraped = await callFirecrawl(env, "/v2/scrape", { url, formats: ["markdown"] });
  if (isResponse(scraped)) return scraped;
  const scrapeData = scraped.data && typeof scraped.data === "object" ? scraped.data as Item : scraped;
  const content = String(scrapeData.markdown ?? scrapeData.content ?? "").slice(0, 100_000);
  if (!content.trim()) return json(502, { error: "Provider returned no indexable content" });
  try {
    const item = await insert(createSql(env), ownerId, { clientId, title: String((scrapeData.metadata as Item | undefined)?.title ?? new URL(url).hostname), entityType: "citation_source", sourceUrl: url, sourceType: String(data.sourceType ?? "crawler"), content, keyFacts: [], tags: ["crawl"] });
    return json(201, { item });
  } catch { return json(500, { error: "Database request failed" }); }
}

async function manual(request: Request, env: ProjectBEnv, ownerId: string): Promise<Response> {
  let data: Item; try { data = await payload(request); } catch { return invalid("Invalid JSON body"); }
  if (typeof data.clientId !== "string" || !idPattern.test(data.clientId) || !String(data.title ?? "").trim() || !String(data.entityType ?? "").trim() || !String(data.content ?? "").trim()) return invalid("clientId, title, entityType, and content are required");
  try { return json(201, { item: await insert(createSql(env), ownerId, { ...data, sourceType: "manual" }) }); } catch { return json(500, { error: "Database request failed" }); }
}

async function ask(request: Request, env: ProjectBEnv, ownerId: string): Promise<Response> {
  let data: Item; try { data = await payload(request); } catch { return invalid("Invalid JSON body"); }
  const clientId = typeof data.clientId === "string" && idPattern.test(data.clientId) ? data.clientId : undefined;
  const question = typeof data.question === "string" ? data.question.trim().slice(0, 4000) : "";
  if (!clientId || !question) return invalid("clientId and question are required");
  try {
    const items = await listBrandMemory(createSql(env), ownerId, clientId);
    const sources = items.slice(0, 12).map((item) => ({ id: item.id, title: item.title, sourceUrl: item.sourceUrl }));
    const context = items.slice(0, 12).map((item) => `[${String(item.title)}]\n${String(item.content).slice(0, 5000)}`).join("\n\n");
    const answer = await callGemini(env, buildBrandMemoryAnswerPrompt({ question, context }));
    return isResponse(answer) ? answer : json(200, { answer, sources });
  } catch { return json(500, { error: "Database request failed" }); }
}

async function sync(request: Request, env: ProjectBEnv, ownerId: string): Promise<Response> {
  let data: Item; try { data = await payload(request); } catch { return invalid("Invalid JSON body"); }
  const clientId = typeof data.clientId === "string" && idPattern.test(data.clientId) ? data.clientId : undefined;
  if (!clientId) return invalid("clientId is required");
  try {
    const sql = createSql(env); const rows = await sql`select brand_name, domain, positioning, target_audience, products_services, key_differentiators from clients where id = ${clientId} and owner_id = ${ownerId} limit 1`;
    if (!rows[0]) return json(404, { error: "Client not found" });
    const client = camelize(rows[0]);
    const content = [client.positioning, client.targetAudience, client.productsServices, client.keyDifferentiators].filter(Boolean).join("\n");
    const syncedItems: Item[] = [];
    if (content) {
      syncedItems.push(await upsertDerivedMemory(sql, ownerId, { clientId, title: `${String(client.brandName)} cross-functional profile`, entityType: "company_overview", sourceType: "ai_synthesized", content, keyFacts: [String(client.domain ?? "")], tags: ["client-profile"] }));
    }

    // Feed observed Gemini Grounded run evidence back into the brain. This is
    // deterministic and provenance-preserving: no LLM is called and no
    // unavailable GSC/GA4 signal is represented as if it existed.
    const runRows = await sql`select brand_mentioned, brand_cited, mentioned_brands, grounding_sources from runs where client_id = ${clientId} and owner_id = ${ownerId} order by run_at desc limit 100`;
    if (runRows.length > 0) {
      const mentionCount = runRows.filter((row) => row.brand_mentioned === true).length;
      const citationCount = runRows.filter((row) => row.brand_cited === true).length;
      const competitorCounts: Record<string, number> = {};
      const sourceCounts: Record<string, number> = {};
      runRows.forEach((row) => {
        const mentioned = Array.isArray(row.mentioned_brands) ? row.mentioned_brands : [];
        mentioned.forEach((brand) => {
          if (brand && typeof brand === "object" && (brand as Item).isKnownCompetitor === true) {
            const name = String((brand as Item).name ?? "Unknown competitor");
            competitorCounts[name] = (competitorCounts[name] ?? 0) + 1;
          }
        });
        const sources = Array.isArray(row.grounding_sources) ? row.grounding_sources : [];
        const domains = new Set(sources.map((source) => source && typeof source === "object" ? String((source as Item).resolvedDomain ?? (source as Item).displayTitle ?? "Unresolved source") : "Unresolved source"));
        domains.forEach((domain) => { sourceCounts[domain] = (sourceCounts[domain] ?? 0) + 1; });
      });
      const topCompetitors = Object.entries(competitorCounts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([name, count]) => `${name} (${count})`);
      const topSources = Object.entries(sourceCounts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([domain, count]) => `${domain}: ${count} cited runs`);
      const runContent = [
        `Observed Gemini Grounded evidence across ${runRows.length} stored runs.`,
        `Brand mentioned: ${mentionCount}/${runRows.length} runs.`,
        `Client domain cited: ${citationCount}/${runRows.length} runs.`,
        topCompetitors.length ? `Observed competitor mentions: ${topCompetitors.join(", ")}.` : "No known competitor mentions were extracted.",
        topSources.length ? `Most-cited grounding domains: ${topSources.join(", ")}.` : "No grounding domains were resolved.",
      ].join("\n");
      syncedItems.push(await upsertDerivedMemory(sql, ownerId, {
        clientId,
        title: `${String(client.brandName)} Gemini Grounded run evidence`,
        entityType: "ai_perception_insight",
        sourceType: "run_cycle_insight",
        content: runContent,
        keyFacts: [`${mentionCount}/${runRows.length} runs mentioned the brand`, `${citationCount}/${runRows.length} runs cited the client domain`],
        tags: ["run-cycle", "gemini-grounded"],
        confidence: "High",
      }));
    }
    return json(200, { success: true, synced: syncedItems.length, items: syncedItems });
  } catch { return json(500, { error: "Database request failed" }); }
}

export async function handleMemoryRequest(request: Request, env: ProjectBEnv): Promise<Response> {
  const user = await requireInternalUser(request, env); if (user instanceof Response) return user;
  const path = new URL(request.url).pathname;
  if (request.method === "POST" && path === "/api/brand-memory/crawl-and-index") return crawl(request, env, user.id);
  if (request.method === "POST" && path === "/api/brand-memory/manual-entry") return manual(request, env, user.id);
  if (request.method === "POST" && path === "/api/brand-memory/ask") return ask(request, env, user.id);
  if (request.method === "POST" && path === "/api/brand-memory/sync-cross-functional") return sync(request, env, user.id);
  const id = /^\/api\/brand-memory\/([a-zA-Z0-9_-]{1,160})$/.exec(path)?.[1];
  if (request.method === "GET" && id) {
    try { return json(200, { items: await listBrandMemory(createSql(env), user.id, id) }); } catch (error) { return json(/Client not found/i.test(String(error)) ? 404 : 500, { error: /Client not found/i.test(String(error)) ? "Client not found" : "Database request failed" }); }
  }
  if (request.method === "DELETE" && id) {
    try {
      const sql = createSql(env);
      const rows = await sql`delete from brand_memories where id = ${id} and client_id in (select id from clients where owner_id = ${user.id}) returning id`;
      return json(200, { deleted: rows.length > 0 });
    } catch { return json(500, { error: "Database request failed" }); }
  }
  return notFound();
}
