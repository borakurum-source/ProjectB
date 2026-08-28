import { requireInternalUser } from "../auth";
import { camelize, createSql, type SqlExecutor } from "../db";
import type { ProjectBEnv } from "../env";
import { json, notFound } from "../http";
import { isResponse } from "../providers";
import { measureRun } from "../services/runMeasurement";

type Item = Record<string, unknown>;

function validId(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(value) ? value : undefined;
}

function error(message: string, status = 400) { return json(status, { error: message }); }

export function cycleProgress(cycle: Record<string, unknown>) {
  return {
    completed: Number(cycle.completedRunCount ?? 0),
    total: Number(cycle.expectedRunCount ?? 0),
    callsCompleted: Number(cycle.callCount ?? 0),
    callsTotal: Number(cycle.expectedCallCount ?? 0),
  };
}

export function isCycleStale(cycle: Record<string, unknown>, now = new Date().toISOString(), maxAgeMs = 15 * 60_000): boolean {
  if (cycle.status !== "pending" && cycle.status !== "running") return false;
  const startedAt = new Date(String(cycle.startedAt ?? "")).getTime();
  const nowMs = new Date(now).getTime();
  return Number.isFinite(startedAt) && Number.isFinite(nowMs) && nowMs - startedAt > maxAgeMs;
}

export async function getCycleStatus(sql: SqlExecutor, ownerId: string, id: string) {
  const rows = await sql`select * from run_cycles where id = ${id} and owner_id = ${ownerId} limit 1`;
  return rows[0] ? camelize(rows[0]) : undefined;
}

async function saveRun(sql: SqlExecutor, run: Item) {
  await sql`insert into runs (id, owner_id, client_id, cycle_id, prompt_id, engine, model, run_index, answer_text, grounding_sources, grounding_chunks, web_search_queries, brand_mentioned, brand_cited, position, prominence, mentioned_brands, ordered_list, ranked_names, recommended_entity_type, answer_format, error) values (${run.id}, ${run.ownerId}, ${run.clientId}, ${run.cycleId}, ${run.promptId}, ${run.engine}, ${run.model}, ${run.runIndex}, ${run.answerText}, ${JSON.stringify(run.groundingSources)}::jsonb, ${JSON.stringify(run.groundingChunks)}::jsonb, ${JSON.stringify(run.webSearchQueries)}::jsonb, ${run.brandMentioned}, ${run.brandCited}, ${run.position}, ${run.prominence}, ${JSON.stringify(run.mentionedBrands)}::jsonb, ${run.orderedList}, ${JSON.stringify(run.rankedNames)}::jsonb, ${run.recommendedEntityType}, ${run.answerFormat}, ${run.error})`;
}

async function executeCycle(env: ProjectBEnv, cycleId: string, ownerId: string, client: Item, prompts: Item[], runsPerPrompt: number) {
  const sql = createSql(env);
  try {
    await sql`update run_cycles set status = 'running' where id = ${cycleId} and owner_id = ${ownerId}`;
    let calls = 0;
    let completedRuns = 0;
    for (const prompt of prompts) {
      for (let index = 0; index < runsPerPrompt; index += 1) {
        const result = await measureRun(env, { promptText: String(prompt.text ?? ""), client });
        calls += 2;
        if (isResponse(result)) throw new Error("Gemini measurement request failed");
        const run: Item = {
          id: crypto.randomUUID(), ownerId, clientId: String(client.id), cycleId, promptId: String(prompt.id), engine: "gemini-grounded", model: "gemini-2.5-flash", runIndex: index,
          answerText: result.answerText, groundingSources: result.groundingSources, groundingChunks: result.groundingChunks, webSearchQueries: result.webSearchQueries,
          brandMentioned: result.brandMentioned, brandCited: result.brandCited,
          position: result.position, prominence: result.prominence, mentionedBrands: result.mentionedBrands, orderedList: result.orderedList, rankedNames: result.rankedNames, recommendedEntityType: result.recommendedEntityType, answerFormat: result.answerFormat, error: null,
        };
        await saveRun(sql, run);
        completedRuns += 1;
        await sql`update run_cycles set call_count = ${calls}, completed_run_count = ${completedRuns} where id = ${cycleId} and owner_id = ${ownerId}`;
      }
    }
    await sql`update run_cycles set status = 'completed', completed_at = now(), call_count = ${calls}, completed_run_count = ${completedRuns}, error = null where id = ${cycleId} and owner_id = ${ownerId}`;
  } catch (_cause) {
    await sql`update run_cycles set status = case when completed_run_count > 0 then 'partial' else 'failed' end, completed_at = now(), error = 'One or more measurement requests failed' where id = ${cycleId} and owner_id = ${ownerId}`;
  }
}

async function start(request: Request, env: ProjectBEnv, waitUntil: (promise: Promise<unknown>) => void, ownerId: string): Promise<Response> {
  let payload: Item;
  try { payload = await request.json() as Item; } catch { return error("Invalid JSON body"); }
  const client = payload.client && typeof payload.client === "object" ? payload.client as Item : undefined;
  const prompts = Array.isArray(payload.prompts) ? payload.prompts.filter((item): item is Item => Boolean(item && typeof item === "object")) : [];
  const clientId = validId(client?.id);
  const runsPerPrompt = Math.min(Math.max(Number(payload.runsPerPrompt) || 1, 1), 5);
  if (!client || !clientId || !prompts.length || prompts.some((prompt) => !validId(prompt.id) || !String(prompt.text ?? "").trim()) || payload.engine !== "gemini-grounded") return error("A client, one or more valid prompts, and gemini-grounded engine are required");
  if (!env.GEMINI_API_KEY) return error("Gemini is not configured", 503);
  const cycleId = crypto.randomUUID();
  try {
    const sql = createSql(env);
    const clientRows = await sql`select * from clients where id = ${clientId} and owner_id = ${ownerId} limit 1`;
    if (!clientRows[0]) return error("Client not found", 404);
    const promptRows = await sql`select * from prompts where client_id = ${clientId} and owner_id = ${ownerId} and active = true order by created_at asc`;
    const promptMap = new Map(promptRows.map((row) => [String(row.id), camelize(row)]));
    const promptIds = prompts.map((prompt) => String(prompt.id));
    if (promptIds.some((id) => !promptMap.has(id))) return error("Prompt not found", 404);
    const canonicalPrompts = promptIds.map((id) => promptMap.get(id)!).filter(Boolean);
    const canonicalClient = camelize(clientRows[0]);
    const expectedRunCount = canonicalPrompts.length * runsPerPrompt;
    const expectedCallCount = expectedRunCount * 2;
    await sql`insert into run_cycles (id, owner_id, client_id, engines, runs_per_prompt, expected_run_count, expected_call_count, completed_run_count, status, call_count, is_retest) values (${cycleId}, ${ownerId}, ${clientId}, ${JSON.stringify(["gemini-grounded"])}::jsonb, ${runsPerPrompt}, ${expectedRunCount}, ${expectedCallCount}, 0, 'pending', 0, false)`;
    waitUntil(executeCycle(env, cycleId, ownerId, canonicalClient, canonicalPrompts, runsPerPrompt));
    return json(202, { jobId: cycleId, total: expectedRunCount, callsTotal: expectedCallCount });
  } catch { return error("Database request failed", 500); }
}

async function status(request: Request, env: ProjectBEnv, ownerId: string, id: string): Promise<Response> {
  try {
    const sql = createSql(env); const cycle = await getCycleStatus(sql, ownerId, id);
    if (!cycle) return error("Run cycle not found", 404);
    if (isCycleStale(cycle)) {
      await sql`update run_cycles set status = 'failed', completed_at = now(), error = 'Run cycle expired before completion' where id = ${id} and owner_id = ${ownerId} and status in ('pending', 'running')`;
      cycle.status = "failed";
      cycle.error = "Run cycle expired before completion";
    }
    const runs = await sql`select * from runs where cycle_id = ${id} and owner_id = ${ownerId} order by run_at asc`;
    const progress = cycleProgress(cycle);
    return json(200, { status: cycle.status, ...progress, runs: runs.map(camelize), runCycle: cycle, error: cycle.error ?? undefined });
  } catch { return error("Database request failed", 500); }
}

export async function handleRunsRequest(request: Request, env: ProjectBEnv, waitUntil: (promise: Promise<unknown>) => void): Promise<Response> {
  const user = await requireInternalUser(request, env); if (user instanceof Response) return user;
  const pathname = new URL(request.url).pathname;
  if (request.method === "POST" && pathname === "/api/runs/execute-cycle") return start(request, env, waitUntil, user.id);
  const match = /^\/api\/runs\/execute-cycle\/([a-zA-Z0-9_-]{1,160})\/status$/.exec(pathname);
  if (request.method === "GET" && match) return status(request, env, user.id, match[1]);
  return notFound();
}
