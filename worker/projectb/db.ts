import { neon } from "@neondatabase/serverless";

import type { ProjectBEnv } from "./env";

export type SqlExecutor = ((strings: TemplateStringsArray, ...values: unknown[]) => Promise<Record<string, unknown>[]>) & {
  transaction?: <T>(fn: (sql: SqlExecutor) => Promise<T>) => Promise<T>;
};

export interface WorkspaceData {
  clients: Record<string, unknown>[];
}

export function createSql(env: Pick<ProjectBEnv, "DATABASE_URL">): SqlExecutor {
  if (!env.DATABASE_URL) {
    throw new Error("Database is not configured");
  }
  let client: SqlExecutor | undefined;
  const sql = (async (strings: TemplateStringsArray, ...values: unknown[]) => {
    client ??= neon(env.DATABASE_URL!) as unknown as SqlExecutor;
    return client(strings, ...values);
  }) as SqlExecutor;
  return sql;
}

export async function getWorkspace(sql: SqlExecutor, ownerId: string): Promise<WorkspaceData> {
  const clients = await sql`select * from clients where owner_id = ${ownerId} order by created_at desc`;
  return { clients };
}

export function camelize<T extends Record<string, unknown>>(row: T): Record<string, unknown> {
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [
    key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()),
    value,
  ]));
}

export async function ownsClient(sql: SqlExecutor, ownerId: string, clientId: string): Promise<boolean> {
  if (!ownerId || !clientId) return false;
  const rows = await sql`select id from clients where id = ${clientId} and owner_id = ${ownerId} limit 1`;
  return rows.length > 0;
}

export async function assertOwnedClient(sql: SqlExecutor, ownerId: string, clientId: string): Promise<void> {
  if (!(await ownsClient(sql, ownerId, clientId))) throw new Error("Client not found");
}

export async function assertOwnedPrompt(sql: SqlExecutor, ownerId: string, clientId: string, promptId: string): Promise<void> {
  const rows = await sql`select id from prompts where id = ${promptId} and client_id = ${clientId} and owner_id = ${ownerId} limit 1`;
  if (!rows[0]) throw new Error("Prompt not found");
}

export async function assertOwnedCycle(sql: SqlExecutor, ownerId: string, clientId: string, cycleId: string): Promise<void> {
  const rows = await sql`select id from run_cycles where id = ${cycleId} and client_id = ${clientId} and owner_id = ${ownerId} limit 1`;
  if (!rows[0]) throw new Error("Run cycle not found");
}

export async function assertOwnedDiagnostic(sql: SqlExecutor, ownerId: string, clientId: string, diagnosticId: string): Promise<void> {
  const rows = await sql`select id from diagnostics where id = ${diagnosticId} and client_id = ${clientId} and owner_id = ${ownerId} limit 1`;
  if (!rows[0]) throw new Error("Diagnostic not found");
}

export async function listClients(sql: SqlExecutor, ownerId: string) {
  return (await getWorkspace(sql, ownerId)).clients.map(camelize);
}

export async function listInternalClients(sql: SqlExecutor, ownerId: string) {
  return listClients(sql, ownerId);
}

export async function listPrompts(sql: SqlExecutor, ownerId: string, clientId: string) {
  const rows = await sql`select * from prompts where client_id = ${clientId} and owner_id = ${ownerId} order by created_at asc`;
  return rows.map(camelize);
}

export async function listRuns(sql: SqlExecutor, ownerId: string, clientId: string) {
  const rows = await sql`select * from runs where client_id = ${clientId} and owner_id = ${ownerId} order by run_at desc`;
  return rows.map(camelize);
}

export async function listDiagnostics(sql: SqlExecutor, ownerId: string, clientId: string) {
  const rows = await sql`select * from diagnostics where client_id = ${clientId} and owner_id = ${ownerId} order by created_at desc`;
  return rows.map(camelize);
}

export async function listActions(sql: SqlExecutor, ownerId: string, clientId: string) {
  const rows = await sql`select * from actions where client_id = ${clientId} and owner_id = ${ownerId} order by created_at desc`;
  return rows.map(camelize);
}

export async function listPageAnalyses(sql: SqlExecutor, ownerId: string, clientId: string) {
  const rows = await sql`select * from page_analyses where client_id = ${clientId} and owner_id = ${ownerId} order by analyzed_at desc`;
  return rows.map(camelize);
}

export async function deleteOwnedPrompt(sql: SqlExecutor, ownerId: string, id: string): Promise<boolean> {
  const rows = await sql`delete from prompts where id = ${id} and owner_id = ${ownerId} returning id`;
  return rows.length > 0;
}

export async function deleteOwnedClient(sql: SqlExecutor, ownerId: string, id: string): Promise<boolean> {
  const rows = await sql`delete from clients where id = ${id} and owner_id = ${ownerId} returning id`;
  return rows.length > 0;
}

export async function listProviderSnapshots(sql: SqlExecutor, ownerId: string, clientId: string) {
  const rows = await sql`select * from provider_snapshots where owner_id = ${ownerId} and client_id = ${clientId} order by captured_at desc`;
  return rows.map(camelize);
}

const snapshotProviders = new Set([
  "gemini-grounded",
  "firecrawl",
]);

const snapshotStatuses = new Set(["available", "not_configured", "unavailable", "failed"]);

export async function saveProviderSnapshot(sql: SqlExecutor, ownerId: string, snapshot: Record<string, unknown>) {
  const id = String(snapshot.id ?? crypto.randomUUID());
  const clientId = String(snapshot.clientId ?? "");
  const provider = String(snapshot.provider ?? "");
  const status = String(snapshot.status ?? "");
  const capturedAt = String(snapshot.capturedAt ?? "");
  const runsPerPrompt = snapshot.runsPerPrompt == null ? null : Number(snapshot.runsPerPrompt);

  if (!clientId || !capturedAt) throw new Error("Provider snapshot clientId and capturedAt are required");
  if (!snapshotProviders.has(provider)) throw new Error("Provider snapshot provider is invalid");
  if (!snapshotStatuses.has(status)) throw new Error("Provider snapshot status is invalid");
  if (runsPerPrompt != null && (!Number.isInteger(runsPerPrompt) || runsPerPrompt < 1 || runsPerPrompt > 5)) {
    throw new Error("Provider snapshot runsPerPrompt must be between 1 and 5");
  }
  if (!(await ownsClient(sql, ownerId, clientId))) throw new Error("Client not found");
  const existing = await sql`select owner_id, client_id from provider_snapshots where id = ${id} limit 1`;
  if (existing[0] && (String(existing[0].owner_id ?? "") !== ownerId || String(existing[0].client_id ?? "") !== clientId)) throw new Error("Provider snapshot not found");

  await sql`insert into provider_snapshots (id, owner_id, client_id, provider, status, captured_at, prompt_set_fingerprint, prompt_count, runs_per_prompt, engine_label, metrics, raw_payload, source_url, error)
    values (${id}, ${ownerId}, ${clientId}, ${provider}, ${status}, ${capturedAt}, ${snapshot.promptSetFingerprint == null ? null : String(snapshot.promptSetFingerprint)}, ${snapshot.promptCount == null ? null : Number(snapshot.promptCount)}, ${runsPerPrompt}, ${snapshot.engineLabel == null ? null : String(snapshot.engineLabel)}, ${JSON.stringify(snapshot.metrics ?? {})}::jsonb, ${JSON.stringify(snapshot.rawPayload ?? {})}::jsonb, ${snapshot.sourceUrl == null ? null : String(snapshot.sourceUrl)}, ${snapshot.error == null ? null : String(snapshot.error)})
    on conflict (id) do update set status = excluded.status, captured_at = excluded.captured_at, prompt_set_fingerprint = excluded.prompt_set_fingerprint, prompt_count = excluded.prompt_count, runs_per_prompt = excluded.runs_per_prompt, engine_label = excluded.engine_label, metrics = excluded.metrics, raw_payload = excluded.raw_payload, source_url = excluded.source_url, error = excluded.error`;

  return { ...snapshot, id, ownerId, clientId };
}

export async function saveClient(sql: SqlExecutor, ownerId: string, client: Record<string, unknown>) {
  const id = String(client.id ?? "");
  if (!id) throw new Error("Client id is required");
  const existing = await sql`select owner_id from clients where id = ${id} limit 1`;
  if (existing[0] && String(existing[0].owner_id ?? "") !== ownerId) throw new Error("Client not found");
  const aliases = JSON.stringify(client.aliases ?? []);
  const competitorDomains = JSON.stringify(client.competitorDomains ?? []);
  const competitorBrands = JSON.stringify(client.competitorBrands ?? []);
  const categorizedCompetitors = client.categorizedCompetitors == null ? null : JSON.stringify(client.categorizedCompetitors);
  await sql`insert into clients (id, owner_id, brand_name, aliases, domain, competitor_domains, competitor_brands, categorized_competitors, industry, market, language, city, short_summary, positioning, detailed_description, target_audience, products_services, key_differentiators, is_demo, default_runs_per_prompt, scheduled_cycle_frequency, auto_run_interval_days)
    values (${id}, ${ownerId}, ${String(client.brandName ?? "")}, ${aliases}::jsonb, ${String(client.domain ?? "")}, ${competitorDomains}::jsonb, ${competitorBrands}::jsonb, ${categorizedCompetitors}::jsonb, ${String(client.industry ?? "")}, ${String(client.market ?? "")}, ${String(client.language ?? "")}, ${client.city == null ? null : String(client.city)}, ${client.shortSummary == null ? null : String(client.shortSummary)}, ${client.positioning == null ? null : String(client.positioning)}, ${client.detailedDescription == null ? null : String(client.detailedDescription)}, ${client.targetAudience == null ? null : String(client.targetAudience)}, ${client.productsServices == null ? null : String(client.productsServices)}, ${client.keyDifferentiators == null ? null : String(client.keyDifferentiators)}, false, ${Number(client.defaultRunsPerPrompt ?? 3)}, ${String(client.scheduledCycleFrequency ?? "off")}, ${client.autoRunIntervalDays == null ? null : Number(client.autoRunIntervalDays)})
    on conflict (id) do update set brand_name = excluded.brand_name, aliases = excluded.aliases, domain = excluded.domain, competitor_domains = excluded.competitor_domains, competitor_brands = excluded.competitor_brands, categorized_competitors = excluded.categorized_competitors, industry = excluded.industry, market = excluded.market, language = excluded.language, city = excluded.city, short_summary = excluded.short_summary, positioning = excluded.positioning, detailed_description = excluded.detailed_description, target_audience = excluded.target_audience, products_services = excluded.products_services, key_differentiators = excluded.key_differentiators, default_runs_per_prompt = excluded.default_runs_per_prompt, scheduled_cycle_frequency = excluded.scheduled_cycle_frequency, auto_run_interval_days = excluded.auto_run_interval_days`;
  return { ...client, ownerId, isDemo: false };
}

export async function saveDiagnostic(sql: SqlExecutor, ownerId: string, diagnostic: Record<string, unknown>) {
  const id = String(diagnostic.id ?? crypto.randomUUID());
  const clientId = String(diagnostic.clientId ?? ""); const promptId = String(diagnostic.promptId ?? ""); const cycleId = String(diagnostic.cycleId ?? "");
  if (!clientId || !promptId || !cycleId) throw new Error("Diagnostic clientId, promptId, and cycleId are required");
  await assertOwnedClient(sql, ownerId, clientId);
  await assertOwnedPrompt(sql, ownerId, clientId, promptId);
  await assertOwnedCycle(sql, ownerId, clientId, cycleId);
  const existing = await sql`select owner_id, client_id from diagnostics where id = ${id} limit 1`;
  if (existing[0] && (String(existing[0].owner_id ?? "") !== ownerId || String(existing[0].client_id ?? "") !== clientId)) throw new Error("Diagnostic not found");
  await sql`insert into diagnostics (id, owner_id, client_id, prompt_id, cycle_id, dimensions, observed_evidence, likely_gap, confidence, recommended_action_summary, validation_method) values (${id}, ${ownerId}, ${clientId}, ${promptId}, ${cycleId}, ${JSON.stringify(diagnostic.dimensions ?? {})}::jsonb, ${String(diagnostic.observedEvidence ?? "")}, ${String(diagnostic.likelyGap ?? "")}, ${String(diagnostic.confidence ?? "Medium")}, ${String(diagnostic.recommendedActionSummary ?? "")}, ${String(diagnostic.validationMethod ?? "")}) on conflict (id) do update set dimensions = excluded.dimensions, observed_evidence = excluded.observed_evidence, likely_gap = excluded.likely_gap, confidence = excluded.confidence, recommended_action_summary = excluded.recommended_action_summary, validation_method = excluded.validation_method`;
  return { ...diagnostic, id, ownerId };
}

export async function saveAction(sql: SqlExecutor, ownerId: string, action: Record<string, unknown>) {
  const id = String(action.id ?? crypto.randomUUID()); const clientId = String(action.clientId ?? "");
  if (!clientId) throw new Error("Action clientId is required");
  await assertOwnedClient(sql, ownerId, clientId);
  const promptIds = Array.isArray(action.promptIds) ? action.promptIds.map(String) : [];
  for (const promptId of promptIds) await assertOwnedPrompt(sql, ownerId, clientId, promptId);
  if (action.diagnosticId != null) await assertOwnedDiagnostic(sql, ownerId, clientId, String(action.diagnosticId));
  const existing = await sql`select owner_id, client_id from actions where id = ${id} limit 1`;
  if (existing[0] && (String(existing[0].owner_id ?? "") !== ownerId || String(existing[0].client_id ?? "") !== clientId)) throw new Error("Action not found");
  await sql`insert into actions (id, owner_id, client_id, diagnostic_id, prompt_ids, title, why, evidence, exact_recommendation, priority, impact, effort, validation, status, page_url, implemented_at, baseline_mention_rate, retest_mention_rate, baseline_citation_rate, retest_citation_rate, baseline_position, retest_position, retest_date) values (${id}, ${ownerId}, ${clientId}, ${action.diagnosticId == null ? null : String(action.diagnosticId)}, ${JSON.stringify(action.promptIds ?? [])}::jsonb, ${String(action.title ?? "")}, ${String(action.why ?? "")}, ${JSON.stringify(action.evidence ?? [])}::jsonb, ${String(action.exactRecommendation ?? "")}, ${String(action.priority ?? "Medium")}, ${String(action.impact ?? "Medium")}, ${String(action.effort ?? "Medium")}, ${String(action.validation ?? "")}, ${String(action.status ?? "open")}, ${action.pageUrl == null ? null : String(action.pageUrl)}, ${action.implementedAt == null ? null : String(action.implementedAt)}, ${action.baselineMentionRate == null ? null : Number(action.baselineMentionRate)}, ${action.retestMentionRate == null ? null : Number(action.retestMentionRate)}, ${action.baselineCitationRate == null ? null : Number(action.baselineCitationRate)}, ${action.retestCitationRate == null ? null : Number(action.retestCitationRate)}, ${action.baselinePosition == null ? null : Number(action.baselinePosition)}, ${action.retestPosition == null ? null : Number(action.retestPosition)}, ${action.retestDate == null ? null : String(action.retestDate)}) on conflict (id) do update set diagnostic_id = excluded.diagnostic_id, prompt_ids = excluded.prompt_ids, title = excluded.title, why = excluded.why, evidence = excluded.evidence, exact_recommendation = excluded.exact_recommendation, priority = excluded.priority, impact = excluded.impact, effort = excluded.effort, validation = excluded.validation, status = excluded.status, page_url = excluded.page_url, implemented_at = excluded.implemented_at, baseline_mention_rate = excluded.baseline_mention_rate, retest_mention_rate = excluded.retest_mention_rate, baseline_citation_rate = excluded.baseline_citation_rate, retest_citation_rate = excluded.retest_citation_rate, baseline_position = excluded.baseline_position, retest_position = excluded.retest_position, retest_date = excluded.retest_date`;
  return { ...action, id, ownerId };
}

export async function savePrompt(sql: SqlExecutor, ownerId: string, prompt: Record<string, unknown>) {
  const id = String(prompt.id ?? "");
  const clientId = String(prompt.clientId ?? "");
  if (!id || !clientId) throw new Error("Prompt id and clientId are required");
  await assertOwnedClient(sql, ownerId, clientId);
  const existing = await sql`select owner_id, client_id from prompts where id = ${id} limit 1`;
  if (existing[0] && (String(existing[0].owner_id ?? "") !== ownerId || String(existing[0].client_id ?? "") !== clientId)) throw new Error("Prompt not found");
  await sql`insert into prompts (id, owner_id, client_id, text, intent_layer, category, active) values (${id}, ${ownerId}, ${clientId}, ${String(prompt.text ?? "")}, ${String(prompt.intentLayer ?? "")}, ${String(prompt.category ?? "")}, ${Boolean(prompt.active ?? true)}) on conflict (id) do update set text = excluded.text, intent_layer = excluded.intent_layer, category = excluded.category, active = excluded.active`;
  return { ...prompt, ownerId };
}

/** Persist a prompt batch atomically so a partial network/database failure cannot split a bulk edit. */
export async function savePromptBatch(
  env: Pick<ProjectBEnv, "DATABASE_URL">,
  ownerId: string,
  prompts: Array<Record<string, unknown>>,
) {
  if (!env.DATABASE_URL) throw new Error("Database is not configured");
  if (!ownerId) throw new Error("Owner id is required");
  const sql = neon(env.DATABASE_URL) as unknown as SqlExecutor;
  for (const prompt of prompts) {
    const id = String(prompt.id ?? "");
    const clientId = String(prompt.clientId ?? "");
    if (!id || !clientId || !String(prompt.text ?? "").trim()) throw new Error("Prompt id, clientId, and text are required");
    const client = await sql`select id from clients where id = ${clientId} and owner_id = ${ownerId} limit 1`;
    if (!client[0]) throw new Error("Client not found");
    const existing = await sql`select owner_id, client_id from prompts where id = ${id} limit 1`;
    if (existing[0] && (String(existing[0].owner_id ?? "") !== ownerId || String(existing[0].client_id ?? "") !== clientId)) throw new Error("Prompt not found");
  }
  const queries = prompts.map((prompt) => sql`insert into prompts (id, owner_id, client_id, text, intent_layer, category, active)
    values (${String(prompt.id)}, ${ownerId}, ${String(prompt.clientId)}, ${String(prompt.text)}, ${String(prompt.intentLayer ?? "")}, ${String(prompt.category ?? "")}, ${Boolean(prompt.active ?? true)})
    on conflict (id) do update set text = excluded.text, intent_layer = excluded.intent_layer, category = excluded.category, active = excluded.active`);
  if (queries.length > 0) await sql.transaction(queries);
  return { saved: prompts.length };
}

/** Persist a client and its initial prompts in one Neon HTTP transaction. */
export async function saveBatchSync(
  env: Pick<ProjectBEnv, "DATABASE_URL">,
  ownerId: string,
  client: Record<string, unknown>,
  prompts: Array<Record<string, unknown>>,
) {
  if (!env.DATABASE_URL) throw new Error("Database is not configured");
  const clientId = String(client.id ?? "");
  if (!clientId) throw new Error("Client id is required");
  if (!ownerId) throw new Error("Owner id is required");
  for (const prompt of prompts) {
    if (!prompt.id || String(prompt.clientId ?? "") !== clientId) {
      throw new Error("Prompt id and clientId must match the client being synchronized");
    }
  }

  const sql = neon(env.DATABASE_URL!);
  const existing = await sql`select owner_id from clients where id = ${clientId} limit 1`;
  if (existing[0] && String(existing[0].owner_id ?? "") !== ownerId) throw new Error("Client not found");
  for (const prompt of prompts) {
    const promptId = String(prompt.id);
    const existingPrompt = await sql`select owner_id, client_id from prompts where id = ${promptId} limit 1`;
    if (existingPrompt[0] && (String(existingPrompt[0].owner_id ?? "") !== ownerId || String(existingPrompt[0].client_id ?? "") !== clientId)) throw new Error("Prompt not found");
  }

  const aliases = JSON.stringify(client.aliases ?? []);
  const competitorDomains = JSON.stringify(client.competitorDomains ?? []);
  const competitorBrands = JSON.stringify(client.competitorBrands ?? []);
  const categorizedCompetitors = client.categorizedCompetitors == null ? null : JSON.stringify(client.categorizedCompetitors);
  const clientQuery = sql`insert into clients (id, owner_id, brand_name, aliases, domain, competitor_domains, competitor_brands, categorized_competitors, industry, market, language, city, short_summary, positioning, detailed_description, target_audience, products_services, key_differentiators, is_demo, default_runs_per_prompt, scheduled_cycle_frequency, auto_run_interval_days)
    values (${clientId}, ${ownerId}, ${String(client.brandName ?? "")}, ${aliases}::jsonb, ${String(client.domain ?? "")}, ${competitorDomains}::jsonb, ${competitorBrands}::jsonb, ${categorizedCompetitors}::jsonb, ${String(client.industry ?? "")}, ${String(client.market ?? "")}, ${String(client.language ?? "")}, ${client.city == null ? null : String(client.city)}, ${client.shortSummary == null ? null : String(client.shortSummary)}, ${client.positioning == null ? null : String(client.positioning)}, ${client.detailedDescription == null ? null : String(client.detailedDescription)}, ${client.targetAudience == null ? null : String(client.targetAudience)}, ${client.productsServices == null ? null : String(client.productsServices)}, ${client.keyDifferentiators == null ? null : String(client.keyDifferentiators)}, false, ${Number(client.defaultRunsPerPrompt ?? 3)}, ${String(client.scheduledCycleFrequency ?? "off")}, ${client.autoRunIntervalDays == null ? null : Number(client.autoRunIntervalDays)})
    on conflict (id) do update set owner_id = excluded.owner_id, brand_name = excluded.brand_name, aliases = excluded.aliases, domain = excluded.domain, competitor_domains = excluded.competitor_domains, competitor_brands = excluded.competitor_brands, categorized_competitors = excluded.categorized_competitors, industry = excluded.industry, market = excluded.market, language = excluded.language, city = excluded.city, short_summary = excluded.short_summary, positioning = excluded.positioning, detailed_description = excluded.detailed_description, target_audience = excluded.target_audience, products_services = excluded.products_services, key_differentiators = excluded.key_differentiators, default_runs_per_prompt = excluded.default_runs_per_prompt, scheduled_cycle_frequency = excluded.scheduled_cycle_frequency, auto_run_interval_days = excluded.auto_run_interval_days`;

  const promptQueries = prompts.map((prompt) => {
    const promptId = String(prompt.id);
    return sql`insert into prompts (id, owner_id, client_id, text, intent_layer, category, active)
      values (${promptId}, ${ownerId}, ${clientId}, ${String(prompt.text ?? "")}, ${String(prompt.intentLayer ?? "")}, ${String(prompt.category ?? "")}, ${Boolean(prompt.active ?? true)})
      on conflict (id) do update set owner_id = excluded.owner_id, client_id = excluded.client_id, text = excluded.text, intent_layer = excluded.intent_layer, category = excluded.category, active = excluded.active`;
  });

  await sql.transaction([clientQuery, ...promptQueries]);
  return { ...client, ownerId, isDemo: false };
}
