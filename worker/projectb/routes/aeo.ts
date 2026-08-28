import { requireInternalUser } from "../auth";
import { assertOwnedClient, camelize, createSql } from "../db";
import type { ProjectBEnv } from "../env";
import { json, notFound } from "../http";
import { callGemini, isResponse, parseJsonObject } from "../providers";
import { buildAeoPrompt } from "../prompts";

type Item = Record<string, unknown>;
const idPattern = /^[a-zA-Z0-9_-]{1,160}$/;
const bad = (message: string) => json(400, { error: message });

async function body(request: Request): Promise<Item> { const value = await request.json(); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(); return value as Item; }

async function list(env: ProjectBEnv, ownerId: string, clientId: string) {
  const sql = createSql(env);
  await assertOwnedClient(sql, ownerId, clientId);
  return (await sql`select * from aeo_contents where client_id = ${clientId} order by created_at desc`).map(camelize);
}

function slug(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 80) || "aeo-content"; }

async function generate(request: Request, env: ProjectBEnv, ownerId: string): Promise<Response> {
  let data: Item; try { data = await body(request); } catch { return bad("Invalid JSON body"); }
  const clientId = typeof data.clientId === "string" && idPattern.test(data.clientId) ? data.clientId : undefined;
  const contentType = typeof data.contentType === "string" ? data.contentType : "";
  if (!clientId || !contentType) return bad("clientId and contentType are required");
  try {
    const sql = createSql(env);
    await assertOwnedClient(sql, ownerId, clientId);
    const memories = await sql`select id, title, content, key_facts from brand_memories where client_id = ${clientId} order by updated_at desc limit 15`;
    const source = memories.map(camelize);
    const prompt = buildAeoPrompt({ contentType, topic: String(data.targetPromptText ?? data.customTopic ?? ""), competitor: String(data.targetCompetitor ?? ""), language: String(data.language ?? ""), memories: source });
    const raw = await callGemini(env, prompt, { json: true }); if (isResponse(raw)) return raw;
    const generated = parseJsonObject(raw); if (!generated || !String(generated.markdownBody ?? "").trim()) return json(502, { error: "Provider returned invalid content" });
    const content = { id: crypto.randomUUID(), clientId, targetPromptText: String(data.targetPromptText ?? "") || null, contentType, title: String(generated.title ?? data.customTopic ?? contentType).slice(0, 300), metaDescription: String(generated.metaDescription ?? "").slice(0, 500), targetH2s: Array.isArray(generated.targetH2s) ? generated.targetH2s.map(String).slice(0, 20) : [], markdownBody: String(generated.markdownBody).slice(0, 100_000), structuredDataJsonLd: String(generated.structuredDataJsonLd ?? ""), usedMemoryIds: source.map((item) => String(item.id)), usedMemoryTitles: source.map((item) => String(item.title)), factCheckStatus: source.length ? "Verified with Brand Memory" : "Requires Verification" };
    const contentSlug = slug(content.title);
    await sql`insert into aeo_contents (id, client_id, target_prompt_text, content_type, title, slug, meta_description, target_h2s, markdown_body, structured_data_json_ld, used_memory_ids, used_memory_titles, fact_check_status, created_at) values (${content.id}, ${clientId}, ${content.targetPromptText}, ${content.contentType}, ${content.title}, ${contentSlug}, ${content.metaDescription}, ${JSON.stringify(content.targetH2s)}::jsonb, ${content.markdownBody}, ${content.structuredDataJsonLd}, ${JSON.stringify(content.usedMemoryIds)}::jsonb, ${JSON.stringify(content.usedMemoryTitles)}::jsonb, ${content.factCheckStatus}, now())`;
    return json(201, { content: { ...content, slug: contentSlug, createdAt: new Date().toISOString() } });
  } catch { return json(500, { error: "Database request failed" }); }
}

export async function handleAeoRequest(request: Request, env: ProjectBEnv): Promise<Response> {
  const user = await requireInternalUser(request, env); if (user instanceof Response) return user;
  const path = new URL(request.url).pathname;
  if (request.method === "POST" && path === "/api/aeo-content/generate") return generate(request, env, user.id);
  const id = /^\/api\/aeo-content\/([a-zA-Z0-9_-]{1,160})$/.exec(path)?.[1];
  if (request.method === "GET" && id) {
    try { return json(200, { items: await list(env, user.id, id) }); } catch { return json(404, { error: "Client not found" }); }
  }
  if (request.method === "DELETE" && id) {
    try {
      const rows = await createSql(env)`delete from aeo_contents where id = ${id} and client_id in (select id from clients where owner_id = ${user.id}) returning id`;
      return json(200, { deleted: rows.length > 0 });
    } catch { return json(500, { error: "Database request failed" }); }
  }
  return notFound();
}
