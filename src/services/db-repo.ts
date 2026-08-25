import { query, queryOne, execute } from './database';
import { Client, Prompt, RunCycle, Run, Diagnostic, ActionItem, PageAnalysis, AppSettings } from '../types';

// Clients
export async function getClient(id: string): Promise<Client | null> {
  const result = await queryOne<any>('SELECT * FROM clients WHERE id = $1', [id]);
  return result ? normalizeClient(result) : null;
}

export async function listClientsByOwner(ownerId: string): Promise<Client[]> {
  const results = await query<any>('SELECT * FROM clients WHERE "ownerId" = $1 ORDER BY "createdAt" DESC', [ownerId]);
  return results.map(normalizeClient);
}

export async function saveClient(client: Client): Promise<void> {
  await execute(
    `INSERT INTO clients (id, "ownerId", "brandName", aliases, domain, "competitorDomains", "competitorBrands",
     "categorizedCompetitors", industry, market, language, city, "shortSummary", positioning, "detailedDescription",
     "targetAudience", "productsServices", "keyDifferentiators", "isDemo", "defaultRunsPerPrompt",
     "scheduledCycleFrequency", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
     ON CONFLICT (id) DO UPDATE SET
     "brandName" = $3, aliases = $4, domain = $5, "competitorDomains" = $6, "competitorBrands" = $7,
     "categorizedCompetitors" = $8, industry = $9, market = $10, language = $11, city = $12, "shortSummary" = $13,
     positioning = $14, "detailedDescription" = $15, "targetAudience" = $16, "productsServices" = $17,
     "keyDifferentiators" = $18, "isDemo" = $19, "defaultRunsPerPrompt" = $20, "scheduledCycleFrequency" = $21,
     "updatedAt" = $23`,
    [
      client.id, client.ownerId, client.brandName, client.aliases, client.domain,
      client.competitorDomains, client.competitorBrands, JSON.stringify(client.categorizedCompetitors || []),
      client.industry, client.market, client.language, client.city, client.shortSummary, client.positioning,
      client.detailedDescription, client.targetAudience, client.productsServices, client.keyDifferentiators,
      client.isDemo, client.defaultRunsPerPrompt, client.scheduledCycleFrequency,
      client.createdAt, new Date().toISOString()
    ]
  );
}

// Prompts
export async function getPrompt(id: string): Promise<Prompt | null> {
  return queryOne<Prompt>('SELECT * FROM prompts WHERE id = $1', [id]);
}

export async function listPromptsByClient(clientId: string): Promise<Prompt[]> {
  return query<Prompt>('SELECT * FROM prompts WHERE "clientId" = $1 ORDER BY "createdAt" ASC', [clientId]);
}

export async function savePrompt(prompt: Prompt): Promise<void> {
  await execute(
    `INSERT INTO prompts (id, "ownerId", "clientId", text, "intentLayer", category, active, "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (id) DO UPDATE SET
     text = $4, "intentLayer" = $5, category = $6, active = $7, "updatedAt" = $9`,
    [
      prompt.id, prompt.ownerId, prompt.clientId, prompt.text, prompt.intentLayer,
      prompt.category, prompt.active, prompt.createdAt, new Date().toISOString()
    ]
  );
}

export async function savePrompts(prompts: Prompt[]): Promise<void> {
  for (const prompt of prompts) {
    await savePrompt(prompt);
  }
}

export async function deletePrompt(id: string): Promise<void> {
  await execute('DELETE FROM prompts WHERE id = $1', [id]);
}

// Run Cycles
export async function getRunCycle(id: string): Promise<RunCycle | null> {
  return queryOne<RunCycle>('SELECT * FROM run_cycles WHERE id = $1', [id]);
}

export async function listRunCyclesByClient(clientId: string): Promise<RunCycle[]> {
  return query<RunCycle>('SELECT * FROM run_cycles WHERE "clientId" = $1 ORDER BY "startedAt" DESC', [clientId]);
}

export async function saveRunCycle(cycle: RunCycle): Promise<void> {
  await execute(
    `INSERT INTO run_cycles (id, "ownerId", "clientId", "startedAt", "completedAt", engines, "runsPerPrompt", status, "callCount", error, "isRetest", "retestedActionId")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
     ON CONFLICT (id) DO UPDATE SET
     "completedAt" = $5, status = $8, "callCount" = $9, error = $10, "updatedAt" = CURRENT_TIMESTAMP`,
    [
      cycle.id, cycle.ownerId, cycle.clientId, cycle.startedAt, cycle.completedAt,
      cycle.engines, cycle.runsPerPrompt, cycle.status, cycle.callCount, cycle.error,
      cycle.isRetest, cycle.retestedActionId
    ]
  );
}

// Runs
export async function getRun(id: string): Promise<Run | null> {
  const result = await queryOne<any>('SELECT * FROM runs WHERE id = $1', [id]);
  return result ? normalizeRun(result) : null;
}

export async function listRunsByCycle(cycleId: string): Promise<Run[]> {
  const results = await query<any>('SELECT * FROM runs WHERE "cycleId" = $1 ORDER BY "runAt" DESC', [cycleId]);
  return results.map(normalizeRun);
}

export async function saveRuns(runs: Run[]): Promise<void> {
  for (const run of runs) {
    await execute(
      `INSERT INTO runs (id, "ownerId", "clientId", "cycleId", "promptId", engine, model, "runIndex", "runAt", "answerText",
       "groundingSources", "groundingChunks", "webSearchQueries", "brandMentioned", "brandCited", position, prominence,
       "mentionedBrands", "orderedList", "rankedNames", "recommendedEntityType", "answerFormat", error)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
       ON CONFLICT (id) DO UPDATE SET
       "answerText" = $10, "groundingSources" = $11, "groundingChunks" = $12, "brandMentioned" = $14, "brandCited" = $15,
       position = $16, prominence = $17, "mentionedBrands" = $18, "orderedList" = $19, "rankedNames" = $20,
       "answerFormat" = $22, error = $23, "updatedAt" = CURRENT_TIMESTAMP`,
      [
        run.id, run.ownerId, run.clientId, run.cycleId, run.promptId, run.engine, run.model, run.runIndex,
        run.runAt, run.answerText, JSON.stringify(run.groundingSources), JSON.stringify(run.groundingChunks),
        run.webSearchQueries, run.brandMentioned, run.brandCited, run.position, run.prominence,
        JSON.stringify(run.mentionedBrands), run.orderedList, run.rankedNames, run.recommendedEntityType,
        run.answerFormat, run.error
      ]
    );
  }
}

// Diagnostics
export async function getDiagnostic(id: string): Promise<Diagnostic | null> {
  const result = await queryOne<any>('SELECT * FROM diagnostics WHERE id = $1', [id]);
  return result ? normalizeDiagnostic(result) : null;
}

export async function listDiagnosticsByClient(clientId: string): Promise<Diagnostic[]> {
  const results = await query<any>('SELECT * FROM diagnostics WHERE "clientId" = $1 ORDER BY "createdAt" DESC', [clientId]);
  return results.map(normalizeDiagnostic);
}

export async function saveDiagnostic(diag: Diagnostic): Promise<void> {
  await execute(
    `INSERT INTO diagnostics (id, "ownerId", "clientId", "promptId", "cycleId", dimensions, "observedEvidence", "likelyGap", confidence, "recommendedActionSummary", "validationMethod", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     ON CONFLICT (id) DO UPDATE SET
     dimensions = $6, "observedEvidence" = $7, "likelyGap" = $8, confidence = $9, "recommendedActionSummary" = $10, "validationMethod" = $11, "updatedAt" = $13`,
    [
      diag.id, diag.ownerId, diag.clientId, diag.promptId, diag.cycleId,
      JSON.stringify(diag.dimensions), diag.observedEvidence, diag.likelyGap, diag.confidence,
      diag.recommendedActionSummary, diag.validationMethod, diag.createdAt, new Date().toISOString()
    ]
  );
}

// Action Items
export async function getActionItem(id: string): Promise<ActionItem | null> {
  const result = await queryOne<any>('SELECT * FROM action_items WHERE id = $1', [id]);
  return result ? normalizeActionItem(result) : null;
}

export async function listActionItemsByClient(clientId: string): Promise<ActionItem[]> {
  const results = await query<any>('SELECT * FROM action_items WHERE "clientId" = $1 ORDER BY "createdAt" DESC', [clientId]);
  return results.map(normalizeActionItem);
}

export async function saveActionItem(action: ActionItem): Promise<void> {
  await execute(
    `INSERT INTO action_items (id, "ownerId", "clientId", "diagnosticId", "promptIds", title, why, evidence, "exactRecommendation",
     priority, impact, effort, validation, status, "pageUrl", "implementedAt", "baselineMentionRate", "retestMentionRate",
     "baselineCitationRate", "retestCitationRate", "baselinePosition", "retestPosition", "retestDate", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
     ON CONFLICT (id) DO UPDATE SET
     title = $6, why = $7, evidence = $8, "exactRecommendation" = $9, priority = $10, impact = $11, effort = $12,
     validation = $13, status = $14, "pageUrl" = $15, "implementedAt" = $16, "baselineMentionRate" = $17, "retestMentionRate" = $18,
     "baselineCitationRate" = $19, "retestCitationRate" = $20, "baselinePosition" = $21, "retestPosition" = $22, "retestDate" = $23, "updatedAt" = $25`,
    [
      action.id, action.ownerId, action.clientId, action.diagnosticId, action.promptIds, action.title,
      action.why, JSON.stringify(action.evidence), action.exactRecommendation, action.priority, action.impact,
      action.effort, action.validation, action.status, action.pageUrl, action.implementedAt, action.baselineMentionRate,
      action.retestMentionRate, action.baselineCitationRate, action.retestCitationRate, action.baselinePosition,
      action.retestPosition, action.retestDate, action.createdAt, new Date().toISOString()
    ]
  );
}

export async function saveActionItems(actions: ActionItem[]): Promise<void> {
  for (const action of actions) {
    await saveActionItem(action);
  }
}

// Page Analyses
export async function getPageAnalysis(id: string): Promise<PageAnalysis | null> {
  const result = await queryOne<any>('SELECT * FROM page_analyses WHERE id = $1', [id]);
  return result ? normalizePageAnalysis(result) : null;
}

export async function listPageAnalysesByClient(clientId: string): Promise<PageAnalysis[]> {
  const results = await query<any>('SELECT * FROM page_analyses WHERE "clientId" = $1 ORDER BY "analyzedAt" DESC', [clientId]);
  return results.map(normalizePageAnalysis);
}

export async function savePageAnalysis(analysis: PageAnalysis): Promise<void> {
  await execute(
    `INSERT INTO page_analyses (id, "ownerId", "clientId", url, "targetPrompt", "analyzedAt", "extractabilityScore", "extractabilityStatus",
     "hasSchemaMarkup", "hasStructuredSchema", "detectedSchemaTypes", "hasComparisonTables", "hasClearHeadingAnswers", "entityClarityStatus",
     "actionableRecommendations", "contentLength", h1, "h2Count", findings)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
     ON CONFLICT (id) DO UPDATE SET
     "targetPrompt" = $5, "extractabilityScore" = $7, "extractabilityStatus" = $8, "hasSchemaMarkup" = $9,
     "hasStructuredSchema" = $10, "detectedSchemaTypes" = $11, "hasComparisonTables" = $12, "hasClearHeadingAnswers" = $13,
     "entityClarityStatus" = $14, "actionableRecommendations" = $15, "contentLength" = $16, h1 = $17, "h2Count" = $18,
     findings = $19, "updatedAt" = CURRENT_TIMESTAMP`,
    [
      analysis.id, analysis.ownerId, analysis.clientId, analysis.url, analysis.targetPrompt, analysis.analyzedAt,
      analysis.extractabilityScore, analysis.extractabilityStatus, analysis.hasSchemaMarkup, analysis.hasStructuredSchema,
      analysis.detectedSchemaTypes, analysis.hasComparisonTables, analysis.hasClearHeadingAnswers, analysis.entityClarityStatus,
      JSON.stringify(analysis.actionableRecommendations), analysis.contentLength, analysis.h1, analysis.h2Count,
      JSON.stringify(analysis.findings)
    ]
  );
}

// Settings
export async function getSettings(ownerId?: string): Promise<AppSettings | null> {
  const id = ownerId ? `owner_${ownerId}` : 'global_settings';
  const result = await queryOne<any>('SELECT * FROM app_settings WHERE id = $1', [id]);
  return result ? normalizeSettings(result) : null;
}

export async function saveSettings(settings: AppSettings, ownerId?: string): Promise<void> {
  const id = ownerId ? `owner_${ownerId}` : 'global_settings';
  await execute(
    `INSERT INTO app_settings (id, "ownerId", "defaultRunsPerPrompt", "activeEngine", "perplexityApiKey", "scheduledCycleFrequency", "createdAt", "updatedAt")
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE SET
     "defaultRunsPerPrompt" = $3, "activeEngine" = $4, "perplexityApiKey" = $5, "scheduledCycleFrequency" = $6, "updatedAt" = $8`,
    [
      id, ownerId, settings.defaultRunsPerPrompt, settings.activeEngine, settings.perplexityApiKey,
      settings.scheduledCycleFrequency, new Date().toISOString(), new Date().toISOString()
    ]
  );
}

// Normalization helpers
function normalizeClient(row: any): Client {
  return {
    ...row,
    categorizedCompetitors: typeof row.categorizedCompetitors === 'string' ? JSON.parse(row.categorizedCompetitors) : row.categorizedCompetitors,
  };
}

function normalizeRun(row: any): Run {
  return {
    ...row,
    groundingSources: typeof row.groundingSources === 'string' ? JSON.parse(row.groundingSources) : row.groundingSources,
    groundingChunks: typeof row.groundingChunks === 'string' ? JSON.parse(row.groundingChunks) : row.groundingChunks,
    mentionedBrands: typeof row.mentionedBrands === 'string' ? JSON.parse(row.mentionedBrands) : row.mentionedBrands,
  };
}

function normalizeDiagnostic(row: any): Diagnostic {
  return {
    ...row,
    dimensions: typeof row.dimensions === 'string' ? JSON.parse(row.dimensions) : row.dimensions,
  };
}

function normalizeActionItem(row: any): ActionItem {
  return {
    ...row,
    evidence: typeof row.evidence === 'string' ? JSON.parse(row.evidence) : row.evidence,
  };
}

function normalizePageAnalysis(row: any): PageAnalysis {
  return {
    ...row,
    findings: typeof row.findings === 'string' ? JSON.parse(row.findings) : row.findings,
  };
}

function normalizeSettings(row: any): AppSettings {
  return {
    defaultRunsPerPrompt: row.defaultRunsPerPrompt,
    activeEngine: row.activeEngine,
    perplexityApiKey: row.perplexityApiKey,
    scheduledCycleFrequency: row.scheduledCycleFrequency,
  };
}
