import { db as sqlDb } from '../db/index.ts';
import * as schema from '../db/schema.ts';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import {
  Client,
  Prompt,
  RunCycle,
  Run,
  Diagnostic,
  ActionItem,
  PageAnalysis,
  AppSettings,
  BrandMemoryItem,
  AeoGeneratedContent,
  GoogleIntegrationState
} from '../types';
import {
  DEMO_CLIENT,
  FILMFOLK_CLIENT,
  FILMFOLK_PROMPTS,
  DEMO_PROMPTS,
} from '../data/demoData';

// DISK BACKUP ENGINE
const STORAGE_DIR = path.join(process.cwd(), '.data_storage');
if (!fs.existsSync(STORAGE_DIR)) {
  try {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  } catch (e) {}
}

function loadDiskCollection<T>(filename: string, initialMap: Map<string, T>): Map<string, T> {
  const filePath = path.join(STORAGE_DIR, filename);
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      if (Array.isArray(data)) {
        data.forEach((item: any) => {
          if (item && item.id) {
            initialMap.set(item.id, item);
          }
        });
      }
    } catch (e) {
      console.warn(`[DiskStorage] Failed to read ${filename}:`, e);
    }
  }
  return initialMap;
}

function saveDiskCollection<T>(filename: string, map: Map<string, T>): void {
  const filePath = path.join(STORAGE_DIR, filename);
  try {
    const items = Array.from(map.values());
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
  } catch (e) {
    console.warn(`[DiskStorage] Failed to save ${filename}:`, e);
  }
}

// IN-MEMORY CACHE (Backed by Neon PostgreSQL + Local Sync)
const memClients = loadDiskCollection<Client>('clients.json', new Map<string, Client>([
  [DEMO_CLIENT.id, { ...DEMO_CLIENT, ownerId: 'user-snacksforparty', isDemo: false }],
  [FILMFOLK_CLIENT.id, { ...FILMFOLK_CLIENT, ownerId: 'default-owner', isDemo: false }],
]));
const memPrompts = loadDiskCollection<Prompt>('prompts.json', new Map<string, Prompt>([
  ...DEMO_PROMPTS.map(p => [p.id, { ...p }] as [string, Prompt]),
  ...FILMFOLK_PROMPTS.map(p => [p.id, { ...p }] as [string, Prompt]),
]));
const memRuns = loadDiskCollection<Run>('runs.json', new Map<string, Run>());
const memRunCycles = loadDiskCollection<RunCycle>('run_cycles.json', new Map<string, RunCycle>());
const memDiagnostics = loadDiskCollection<Diagnostic>('diagnostics.json', new Map<string, Diagnostic>());
const memActions = loadDiskCollection<ActionItem>('actions.json', new Map<string, ActionItem>());
const memPageAnalyses = loadDiskCollection<PageAnalysis>('page_analyses.json', new Map<string, PageAnalysis>());
const memBrandMemories = loadDiskCollection<BrandMemoryItem>('brand_memories.json', new Map<string, BrandMemoryItem>());
const memAeoContents = loadDiskCollection<AeoGeneratedContent>('aeo_contents.json', new Map<string, AeoGeneratedContent>());
const memSettings = loadDiskCollection<AppSettings>('settings.json', new Map<string, AppSettings>());
let memGoogleIntegration: GoogleIntegrationState | null = null;

// Initial Neon PostgreSQL Hydration on Server Boot
async function hydrateFromNeon(): Promise<void> {
  try {
    console.log('⚡ [Neon Hydration] Syncing in-memory cache with Neon PostgreSQL...');
    const clientRows = await sqlDb.select().from(schema.clients);
    clientRows.forEach(row => {
      memClients.set(row.id, {
        id: row.id,
        ownerId: row.ownerId,
        brandName: row.brandName,
        aliases: (row.aliases as string[]) || [],
        domain: row.domain,
        competitorDomains: (row.competitorDomains as string[]) || [],
        competitorBrands: (row.competitorBrands as string[]) || [],
        categorizedCompetitors: (row.categorizedCompetitors as any) || undefined,
        industry: row.industry,
        market: row.market,
        language: row.language,
        city: row.city || undefined,
        shortSummary: row.shortSummary || undefined,
        positioning: row.positioning || undefined,
        detailedDescription: row.detailedDescription || undefined,
        targetAudience: row.targetAudience || undefined,
        productsServices: row.productsServices || undefined,
        keyDifferentiators: row.keyDifferentiators || undefined,
        isDemo: row.isDemo || false,
        defaultRunsPerPrompt: row.defaultRunsPerPrompt || 3,
        scheduledCycleFrequency: (row.scheduledCycleFrequency as any) || 'off',
        autoRunIntervalDays: row.autoRunIntervalDays || undefined,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      });
    });

    const promptRows = await sqlDb.select().from(schema.prompts);
    promptRows.forEach(row => {
      memPrompts.set(row.id, {
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        text: row.text,
        intentLayer: row.intentLayer as any,
        category: row.category,
        active: row.active,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      });
    });

    const memoryRows = await sqlDb.select().from(schema.brandMemories);
    memoryRows.forEach(row => {
      memBrandMemories.set(row.id, {
        id: row.id,
        clientId: row.clientId,
        title: row.title,
        entityType: row.entityType as any,
        sourceUrl: row.sourceUrl || undefined,
        sourceType: (row.sourceType as any) || 'crawler',
        content: row.content,
        keyFacts: (row.keyFacts as string[]) || [],
        embedding: (row.embedding as number[]) || undefined,
        relevanceScore: row.relevanceScore ?? undefined,
        confidence: (row.confidence as any) || 'High',
        tags: (row.tags as string[]) || [],
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
      });
    });

    console.log(`✅ [Neon Hydration] Loaded ${clientRows.length} clients, ${promptRows.length} prompts, and ${memoryRows.length} brand memories from Neon PostgreSQL.`);
  } catch (err) {
    console.warn('[Neon Hydration] Warning during startup hydration:', err);
  }
}

// Hydrate on boot
hydrateFromNeon();

export function getIsQuotaExceeded(): boolean {
  return false; // Neon PostgreSQL has generous compute & storage with no daily write unit quota!
}

// ====== Clients ======
export async function getClient(id: string): Promise<Client | null> {
  try {
    const rows = await sqlDb.select().from(schema.clients).where(eq(schema.clients.id, id));
    if (rows.length > 0) {
      const row = rows[0];
      const client: Client = {
        id: row.id,
        ownerId: row.ownerId,
        brandName: row.brandName,
        aliases: (row.aliases as string[]) || [],
        domain: row.domain,
        competitorDomains: (row.competitorDomains as string[]) || [],
        competitorBrands: (row.competitorBrands as string[]) || [],
        categorizedCompetitors: (row.categorizedCompetitors as any) || undefined,
        industry: row.industry,
        market: row.market,
        language: row.language,
        city: row.city || undefined,
        shortSummary: row.shortSummary || undefined,
        positioning: row.positioning || undefined,
        detailedDescription: row.detailedDescription || undefined,
        targetAudience: row.targetAudience || undefined,
        productsServices: row.productsServices || undefined,
        keyDifferentiators: row.keyDifferentiators || undefined,
        isDemo: row.isDemo || false,
        defaultRunsPerPrompt: row.defaultRunsPerPrompt || 3,
        scheduledCycleFrequency: (row.scheduledCycleFrequency as any) || 'off',
        autoRunIntervalDays: row.autoRunIntervalDays || undefined,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      };
      memClients.set(id, client);
      return client;
    }
  } catch (err) {
    console.warn('[Neon getClient] Falling back to memory:', err);
  }
  return memClients.get(id) || null;
}

export async function listClientsByOwner(ownerId: string): Promise<Client[]> {
  const map = new Map<string, Client>();

  // Populate map with memory clients first
  for (const [id, client] of memClients.entries()) {
    if (!ownerId || client.ownerId === ownerId || client.ownerId === 'default-owner' || client.ownerId === 'user-snacksforparty') {
      map.set(id, client);
    }
  }

  try {
    const rows = await sqlDb.select().from(schema.clients);
    if (rows.length > 0) {
      rows.forEach(row => {
        const client: Client = {
          id: row.id,
          ownerId: row.ownerId,
          brandName: row.brandName,
          aliases: (row.aliases as string[]) || [],
          domain: row.domain,
          competitorDomains: (row.competitorDomains as string[]) || [],
          competitorBrands: (row.competitorBrands as string[]) || [],
          categorizedCompetitors: (row.categorizedCompetitors as any) || undefined,
          industry: row.industry,
          market: row.market,
          language: row.language,
          city: row.city || undefined,
          shortSummary: row.shortSummary || undefined,
          positioning: row.positioning || undefined,
          detailedDescription: row.detailedDescription || undefined,
          targetAudience: row.targetAudience || undefined,
          productsServices: row.productsServices || undefined,
          keyDifferentiators: row.keyDifferentiators || undefined,
          isDemo: row.isDemo || false,
          defaultRunsPerPrompt: row.defaultRunsPerPrompt || 3,
          scheduledCycleFrequency: (row.scheduledCycleFrequency as any) || 'off',
          autoRunIntervalDays: row.autoRunIntervalDays || undefined,
          createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        };
        map.set(client.id, client);
        memClients.set(client.id, client);
      });
    }
  } catch (err) {
    console.warn('[Neon listClientsByOwner] Falling back to memory:', err);
  }

  // Deduplicate clients by normalized domain to prevent duplicate brand cards
  const domainMap = new Map<string, Client>();
  for (const c of map.values()) {
    const normDomain = (c.domain || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
    const key = normDomain || c.id;
    if (!domainMap.has(key)) {
      domainMap.set(key, c);
    }
  }

  return Array.from(domainMap.values());
}

export async function deleteClient(id: string): Promise<void> {
  memClients.delete(id);
  saveDiskCollection('clients.json', memClients);

  // Clean up client prompts from memory store
  for (const [pId, prompt] of memPrompts.entries()) {
    if (prompt.clientId === id) {
      memPrompts.delete(pId);
    }
  }
  saveDiskCollection('prompts.json', memPrompts);

  try {
    await sqlDb.delete(schema.prompts).where(eq(schema.prompts.clientId, id));
    await sqlDb.delete(schema.brandMemories).where(eq(schema.brandMemories.clientId, id));
    await sqlDb.delete(schema.aeoContents).where(eq(schema.aeoContents.clientId, id));
    await sqlDb.delete(schema.clients).where(eq(schema.clients.id, id));
  } catch (err) {
    console.warn('[Neon deleteClient] Error deleting from database:', err);
  }
}

export async function batchSaveClientAndPrompts(client: Client, prompts?: Prompt[]): Promise<void> {
  await saveClient(client);
  if (prompts && prompts.length > 0) {
    await savePrompts(prompts);
  }
}

export async function saveClient(client: Client): Promise<void> {
  memClients.set(client.id, client);
  saveDiskCollection('clients.json', memClients);

  try {
    await sqlDb.insert(schema.clients).values({
      id: client.id,
      ownerId: client.ownerId,
      brandName: client.brandName,
      aliases: client.aliases || [],
      domain: client.domain,
      competitorDomains: client.competitorDomains || [],
      competitorBrands: client.competitorBrands || [],
      categorizedCompetitors: client.categorizedCompetitors || null,
      industry: client.industry,
      market: client.market,
      language: client.language,
      city: client.city || null,
      shortSummary: client.shortSummary || null,
      positioning: client.positioning || null,
      detailedDescription: client.detailedDescription || null,
      targetAudience: client.targetAudience || null,
      productsServices: client.productsServices || null,
      keyDifferentiators: client.keyDifferentiators || null,
      isDemo: client.isDemo || false,
      defaultRunsPerPrompt: client.defaultRunsPerPrompt || 3,
      scheduledCycleFrequency: client.scheduledCycleFrequency || 'off',
      autoRunIntervalDays: client.autoRunIntervalDays || null,
      createdAt: client.createdAt ? new Date(client.createdAt) : new Date(),
    }).onConflictDoUpdate({
      target: schema.clients.id,
      set: {
        brandName: client.brandName,
        aliases: client.aliases || [],
        domain: client.domain,
        competitorDomains: client.competitorDomains || [],
        competitorBrands: client.competitorBrands || [],
        categorizedCompetitors: client.categorizedCompetitors || null,
        industry: client.industry,
        market: client.market,
        language: client.language,
        city: client.city || null,
        shortSummary: client.shortSummary || null,
        positioning: client.positioning || null,
        detailedDescription: client.detailedDescription || null,
        targetAudience: client.targetAudience || null,
        productsServices: client.productsServices || null,
        keyDifferentiators: client.keyDifferentiators || null,
        isDemo: client.isDemo || false,
        defaultRunsPerPrompt: client.defaultRunsPerPrompt || 3,
        scheduledCycleFrequency: client.scheduledCycleFrequency || 'off',
        autoRunIntervalDays: client.autoRunIntervalDays || null,
      }
    });
  } catch (err) {
    console.warn('[Neon saveClient] Error saving to database:', err);
  }
}

// ====== Prompts ======
export async function getPrompt(id: string): Promise<Prompt | null> {
  try {
    const rows = await sqlDb.select().from(schema.prompts).where(eq(schema.prompts.id, id));
    if (rows.length > 0) {
      const row = rows[0];
      const prompt: Prompt = {
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        text: row.text,
        intentLayer: row.intentLayer as any,
        category: row.category,
        active: row.active,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      };
      memPrompts.set(id, prompt);
      return prompt;
    }
  } catch (err) {
    console.warn('[Neon getPrompt] Falling back to memory:', err);
  }
  return memPrompts.get(id) || null;
}

export async function listPromptsByClient(clientId: string): Promise<Prompt[]> {
  try {
    const rows = await sqlDb.select().from(schema.prompts).where(eq(schema.prompts.clientId, clientId));
    if (rows.length > 0) {
      const prompts: Prompt[] = rows.map(row => ({
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        text: row.text,
        intentLayer: row.intentLayer as any,
        category: row.category,
        active: row.active,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      }));
      prompts.forEach(p => memPrompts.set(p.id, p));
      return prompts;
    }
  } catch (err) {
    console.warn('[Neon listPromptsByClient] Falling back to memory:', err);
  }
  const fallback = Array.from(memPrompts.values()).filter(p => !clientId || p.clientId === clientId);
  if (fallback.length > 0) return fallback;
  if (clientId === FILMFOLK_CLIENT.id || clientId === 'client-filmfolk') return FILMFOLK_PROMPTS;
  if (clientId === DEMO_CLIENT.id || clientId === 'client-snacksforparty') return DEMO_PROMPTS;
  return [];
}

export async function savePrompt(prompt: Prompt): Promise<void> {
  memPrompts.set(prompt.id, prompt);
  saveDiskCollection('prompts.json', memPrompts);

  try {
    await sqlDb.insert(schema.prompts).values({
      id: prompt.id,
      ownerId: prompt.ownerId,
      clientId: prompt.clientId,
      text: prompt.text,
      intentLayer: prompt.intentLayer,
      category: prompt.category,
      active: prompt.active ?? true,
      createdAt: prompt.createdAt ? new Date(prompt.createdAt) : new Date(),
    }).onConflictDoUpdate({
      target: schema.prompts.id,
      set: {
        text: prompt.text,
        intentLayer: prompt.intentLayer,
        category: prompt.category,
        active: prompt.active ?? true,
      }
    });
  } catch (err) {
    console.warn('[Neon savePrompt] Error saving to database:', err);
  }
}

export async function savePrompts(promptsList: Prompt[]): Promise<void> {
  if (!promptsList || promptsList.length === 0) return;
  promptsList.forEach(p => { if (p?.id) memPrompts.set(p.id, p); });
  saveDiskCollection('prompts.json', memPrompts);

  try {
    for (const prompt of promptsList) {
      await savePrompt(prompt);
    }
  } catch (err) {
    console.warn('[Neon savePrompts] Error saving batch to database:', err);
  }
}

export async function deletePrompt(id: string): Promise<void> {
  memPrompts.delete(id);
  saveDiskCollection('prompts.json', memPrompts);

  try {
    await sqlDb.delete(schema.prompts).where(eq(schema.prompts.id, id));
  } catch (err) {
    console.warn('[Neon deletePrompt] Error deleting from database:', err);
  }
}

// ====== Run Cycles ======
export async function getRunCycle(id: string): Promise<RunCycle | null> {
  try {
    const rows = await sqlDb.select().from(schema.runCycles).where(eq(schema.runCycles.id, id));
    if (rows.length > 0) {
      const row = rows[0];
      const cycle: RunCycle = {
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : new Date().toISOString(),
        completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : undefined,
        engines: (row.engines as any) || ['gemini-grounded'],
        runsPerPrompt: row.runsPerPrompt,
        status: row.status as any,
        callCount: row.callCount,
        error: row.error || undefined,
        isRetest: row.isRetest || false,
        retestedActionId: row.retestedActionId || undefined,
      };
      memRunCycles.set(id, cycle);
      return cycle;
    }
  } catch (err) {
    console.warn('[Neon getRunCycle] Falling back to memory:', err);
  }
  return memRunCycles.get(id) || null;
}

export async function listRunCyclesByClient(clientId: string): Promise<RunCycle[]> {
  try {
    const rows = await sqlDb.select().from(schema.runCycles).where(eq(schema.runCycles.clientId, clientId));
    if (rows.length > 0) {
      const cycles: RunCycle[] = rows.map(row => ({
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        startedAt: row.startedAt ? new Date(row.startedAt).toISOString() : new Date().toISOString(),
        completedAt: row.completedAt ? new Date(row.completedAt).toISOString() : undefined,
        engines: (row.engines as any) || ['gemini-grounded'],
        runsPerPrompt: row.runsPerPrompt,
        status: row.status as any,
        callCount: row.callCount,
        error: row.error || undefined,
        isRetest: row.isRetest || false,
        retestedActionId: row.retestedActionId || undefined,
      }));
      cycles.forEach(c => memRunCycles.set(c.id, c));
      return cycles.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    }
  } catch (err) {
    console.warn('[Neon listRunCyclesByClient] Falling back to memory:', err);
  }
  const fallback = Array.from(memRunCycles.values()).filter(c => !clientId || c.clientId === clientId);
  if (fallback.length > 0) return fallback.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  return [];
}

export async function saveRunCycle(cycle: RunCycle): Promise<void> {
  memRunCycles.set(cycle.id, cycle);
  saveDiskCollection('run_cycles.json', memRunCycles);

  try {
    await sqlDb.insert(schema.runCycles).values({
      id: cycle.id,
      ownerId: cycle.ownerId,
      clientId: cycle.clientId,
      startedAt: cycle.startedAt ? new Date(cycle.startedAt) : new Date(),
      completedAt: cycle.completedAt ? new Date(cycle.completedAt) : null,
      engines: cycle.engines || ['gemini-grounded'],
      runsPerPrompt: cycle.runsPerPrompt,
      status: cycle.status,
      callCount: cycle.callCount || 0,
      error: cycle.error || null,
      isRetest: cycle.isRetest || false,
      retestedActionId: cycle.retestedActionId || null,
    }).onConflictDoUpdate({
      target: schema.runCycles.id,
      set: {
        completedAt: cycle.completedAt ? new Date(cycle.completedAt) : null,
        engines: cycle.engines || ['gemini-grounded'],
        runsPerPrompt: cycle.runsPerPrompt,
        status: cycle.status,
        callCount: cycle.callCount || 0,
        error: cycle.error || null,
        isRetest: cycle.isRetest || false,
        retestedActionId: cycle.retestedActionId || null,
      }
    });
  } catch (err) {
    console.warn('[Neon saveRunCycle] Error saving to database:', err);
  }
}

export async function saveRunCycles(cyclesList: RunCycle[]): Promise<void> {
  if (!cyclesList || cyclesList.length === 0) return;
  cyclesList.forEach(c => { if (c?.id) memRunCycles.set(c.id, c); });
  saveDiskCollection('run_cycles.json', memRunCycles);
  try {
    for (const cycle of cyclesList) {
      await saveRunCycle(cycle);
    }
  } catch (err) {
    console.warn('[Neon saveRunCycles] Error saving batch:', err);
  }
}

// ====== Runs ======
export async function getRun(id: string): Promise<Run | null> {
  try {
    const rows = await sqlDb.select().from(schema.runs).where(eq(schema.runs.id, id));
    if (rows.length > 0) {
      const row = rows[0];
      const run: Run = {
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        cycleId: row.cycleId,
        promptId: row.promptId,
        engine: row.engine as any,
        model: row.model,
        runIndex: row.runIndex,
        runAt: row.runAt ? new Date(row.runAt).toISOString() : new Date().toISOString(),
        answerText: row.answerText,
        groundingSources: (row.groundingSources as any) || [],
        groundingChunks: (row.groundingChunks as any) || undefined,
        webSearchQueries: (row.webSearchQueries as any) || [],
        brandMentioned: row.brandMentioned,
        brandCited: row.brandCited,
        position: row.position ?? null,
        prominence: row.prominence ?? null,
        mentionedBrands: (row.mentionedBrands as any) || [],
        orderedList: row.orderedList || false,
        rankedNames: (row.rankedNames as any) || [],
        recommendedEntityType: row.recommendedEntityType || undefined,
        answerFormat: (row.answerFormat as any) || 'prose',
        error: row.error || null,
      };
      memRuns.set(id, run);
      return run;
    }
  } catch (err) {
    console.warn('[Neon getRun] Falling back to memory:', err);
  }
  return memRuns.get(id) || null;
}

export async function listRunsByClient(clientId: string): Promise<Run[]> {
  try {
    const rows = await sqlDb.select().from(schema.runs).where(eq(schema.runs.clientId, clientId));
    if (rows.length > 0) {
      const runsList: Run[] = rows.map(row => ({
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        cycleId: row.cycleId,
        promptId: row.promptId,
        engine: row.engine as any,
        model: row.model,
        runIndex: row.runIndex,
        runAt: row.runAt ? new Date(row.runAt).toISOString() : new Date().toISOString(),
        answerText: row.answerText,
        groundingSources: (row.groundingSources as any) || [],
        groundingChunks: (row.groundingChunks as any) || undefined,
        webSearchQueries: (row.webSearchQueries as any) || [],
        brandMentioned: row.brandMentioned,
        brandCited: row.brandCited,
        position: row.position ?? null,
        prominence: row.prominence ?? null,
        mentionedBrands: (row.mentionedBrands as any) || [],
        orderedList: row.orderedList || false,
        rankedNames: (row.rankedNames as any) || [],
        recommendedEntityType: row.recommendedEntityType || undefined,
        answerFormat: (row.answerFormat as any) || 'prose',
        error: row.error || null,
      }));
      runsList.forEach(r => memRuns.set(r.id, r));
      return runsList;
    }
  } catch (err) {
    console.warn('[Neon listRunsByClient] Falling back to memory:', err);
  }
  const fallback = Array.from(memRuns.values()).filter(r => !clientId || r.clientId === clientId);
  if (fallback.length > 0) return fallback;
  return [];
}

export async function listRunsByCycle(cycleId: string): Promise<Run[]> {
  try {
    const rows = await sqlDb.select().from(schema.runs).where(eq(schema.runs.cycleId, cycleId));
    if (rows.length > 0) {
      const runsList: Run[] = rows.map(row => ({
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        cycleId: row.cycleId,
        promptId: row.promptId,
        engine: row.engine as any,
        model: row.model,
        runIndex: row.runIndex,
        runAt: row.runAt ? new Date(row.runAt).toISOString() : new Date().toISOString(),
        answerText: row.answerText,
        groundingSources: (row.groundingSources as any) || [],
        groundingChunks: (row.groundingChunks as any) || undefined,
        webSearchQueries: (row.webSearchQueries as any) || [],
        brandMentioned: row.brandMentioned,
        brandCited: row.brandCited,
        position: row.position ?? null,
        prominence: row.prominence ?? null,
        mentionedBrands: (row.mentionedBrands as any) || [],
        orderedList: row.orderedList || false,
        rankedNames: (row.rankedNames as any) || [],
        recommendedEntityType: row.recommendedEntityType || undefined,
        answerFormat: (row.answerFormat as any) || 'prose',
        error: row.error || null,
      }));
      runsList.forEach(r => memRuns.set(r.id, r));
      return runsList;
    }
  } catch (err) {
    console.warn('[Neon listRunsByCycle] Falling back to memory:', err);
  }
  const fallback = Array.from(memRuns.values()).filter(r => r.cycleId === cycleId);
  return fallback;
}

export async function saveRuns(runsList: Run[]): Promise<void> {
  if (!runsList || runsList.length === 0) return;
  runsList.forEach(r => { if (r?.id) memRuns.set(r.id, r); });
  saveDiskCollection('runs.json', memRuns);

  try {
    for (const run of runsList) {
      await sqlDb.insert(schema.runs).values({
        id: run.id,
        ownerId: run.ownerId,
        clientId: run.clientId,
        cycleId: run.cycleId,
        promptId: run.promptId,
        engine: run.engine,
        model: run.model,
        runIndex: run.runIndex,
        runAt: run.runAt ? new Date(run.runAt) : new Date(),
        answerText: run.answerText,
        groundingSources: run.groundingSources || [],
        groundingChunks: run.groundingChunks || null,
        webSearchQueries: run.webSearchQueries || [],
        brandMentioned: run.brandMentioned,
        brandCited: run.brandCited,
        position: run.position ?? null,
        prominence: run.prominence ?? null,
        mentionedBrands: run.mentionedBrands || [],
        orderedList: run.orderedList || false,
        rankedNames: run.rankedNames || [],
        recommendedEntityType: run.recommendedEntityType || null,
        answerFormat: run.answerFormat || 'prose',
        error: run.error || null,
      }).onConflictDoUpdate({
        target: schema.runs.id,
        set: {
          answerText: run.answerText,
          groundingSources: run.groundingSources || [],
          groundingChunks: run.groundingChunks || null,
          webSearchQueries: run.webSearchQueries || [],
          brandMentioned: run.brandMentioned,
          brandCited: run.brandCited,
          position: run.position ?? null,
          prominence: run.prominence ?? null,
          mentionedBrands: run.mentionedBrands || [],
          orderedList: run.orderedList || false,
          rankedNames: run.rankedNames || [],
          recommendedEntityType: run.recommendedEntityType || null,
          answerFormat: run.answerFormat || 'prose',
          error: run.error || null,
        }
      });
    }
  } catch (err) {
    console.warn('[Neon saveRuns] Error saving runs batch:', err);
  }
}

// ====== Diagnostics ======
export async function getDiagnostic(id: string): Promise<Diagnostic | null> {
  try {
    const rows = await sqlDb.select().from(schema.diagnostics).where(eq(schema.diagnostics.id, id));
    if (rows.length > 0) {
      const row = rows[0];
      const diag: Diagnostic = {
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        promptId: row.promptId,
        cycleId: row.cycleId,
        dimensions: (row.dimensions as any) || {},
        observedEvidence: row.observedEvidence,
        likelyGap: row.likelyGap,
        confidence: row.confidence as any,
        recommendedActionSummary: row.recommendedActionSummary,
        validationMethod: row.validationMethod,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      };
      memDiagnostics.set(id, diag);
      return diag;
    }
  } catch (err) {
    console.warn('[Neon getDiagnostic] Falling back to memory:', err);
  }
  return memDiagnostics.get(id) || null;
}

export async function listDiagnosticsByClient(clientId: string): Promise<Diagnostic[]> {
  try {
    const rows = await sqlDb.select().from(schema.diagnostics).where(eq(schema.diagnostics.clientId, clientId));
    if (rows.length > 0) {
      const diags: Diagnostic[] = rows.map(row => ({
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        promptId: row.promptId,
        cycleId: row.cycleId,
        dimensions: (row.dimensions as any) || {},
        observedEvidence: row.observedEvidence,
        likelyGap: row.likelyGap,
        confidence: row.confidence as any,
        recommendedActionSummary: row.recommendedActionSummary,
        validationMethod: row.validationMethod,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      }));
      diags.forEach(d => memDiagnostics.set(d.id, d));
      return diags;
    }
  } catch (err) {
    console.warn('[Neon listDiagnosticsByClient] Falling back to memory:', err);
  }
  const fallback = Array.from(memDiagnostics.values()).filter(d => !clientId || d.clientId === clientId);
  if (fallback.length > 0) return fallback;
  return [];
}

export async function saveDiagnostic(diag: Diagnostic): Promise<void> {
  memDiagnostics.set(diag.id, diag);
  saveDiskCollection('diagnostics.json', memDiagnostics);

  try {
    await sqlDb.insert(schema.diagnostics).values({
      id: diag.id,
      ownerId: diag.ownerId,
      clientId: diag.clientId,
      promptId: diag.promptId,
      cycleId: diag.cycleId,
      dimensions: diag.dimensions || {},
      observedEvidence: diag.observedEvidence,
      likelyGap: diag.likelyGap,
      confidence: diag.confidence,
      recommendedActionSummary: diag.recommendedActionSummary,
      validationMethod: diag.validationMethod,
      createdAt: diag.createdAt ? new Date(diag.createdAt) : new Date(),
    }).onConflictDoUpdate({
      target: schema.diagnostics.id,
      set: {
        dimensions: diag.dimensions || {},
        observedEvidence: diag.observedEvidence,
        likelyGap: diag.likelyGap,
        confidence: diag.confidence,
        recommendedActionSummary: diag.recommendedActionSummary,
        validationMethod: diag.validationMethod,
      }
    });
  } catch (err) {
    console.warn('[Neon saveDiagnostic] Error saving to database:', err);
  }
}

// ====== Action Items ======
export async function getActionItem(id: string): Promise<ActionItem | null> {
  try {
    const rows = await sqlDb.select().from(schema.actions).where(eq(schema.actions.id, id));
    if (rows.length > 0) {
      const row = rows[0];
      const action: ActionItem = {
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        diagnosticId: row.diagnosticId || undefined,
        promptIds: (row.promptIds as string[]) || [],
        title: row.title,
        why: row.why,
        evidence: (row.evidence as any) || { observedFact: '' },
        exactRecommendation: row.exactRecommendation,
        priority: row.priority as any,
        impact: row.impact as any,
        effort: row.effort as any,
        validation: row.validation,
        status: row.status as any,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        pageUrl: row.pageUrl || undefined,
        implementedAt: row.implementedAt ? new Date(row.implementedAt).toISOString() : undefined,
        baselineMentionRate: row.baselineMentionRate ?? undefined,
        retestMentionRate: row.retestMentionRate ?? undefined,
        baselineCitationRate: row.baselineCitationRate ?? undefined,
        retestCitationRate: row.retestCitationRate ?? undefined,
        baselinePosition: row.baselinePosition ?? undefined,
        retestPosition: row.retestPosition ?? undefined,
        retestDate: row.retestDate ? new Date(row.retestDate).toISOString() : undefined,
      };
      memActions.set(id, action);
      return action;
    }
  } catch (err) {
    console.warn('[Neon getActionItem] Falling back to memory:', err);
  }
  return memActions.get(id) || null;
}

export async function listActionItemsByClient(clientId: string): Promise<ActionItem[]> {
  try {
    const rows = await sqlDb.select().from(schema.actions).where(eq(schema.actions.clientId, clientId));
    if (rows.length > 0) {
      const actionsList: ActionItem[] = rows.map(row => ({
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        diagnosticId: row.diagnosticId || undefined,
        promptIds: (row.promptIds as string[]) || [],
        title: row.title,
        why: row.why,
        evidence: (row.evidence as any) || { observedFact: '' },
        exactRecommendation: row.exactRecommendation,
        priority: row.priority as any,
        impact: row.impact as any,
        effort: row.effort as any,
        validation: row.validation,
        status: row.status as any,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        pageUrl: row.pageUrl || undefined,
        implementedAt: row.implementedAt ? new Date(row.implementedAt).toISOString() : undefined,
        baselineMentionRate: row.baselineMentionRate ?? undefined,
        retestMentionRate: row.retestMentionRate ?? undefined,
        baselineCitationRate: row.baselineCitationRate ?? undefined,
        retestCitationRate: row.retestCitationRate ?? undefined,
        baselinePosition: row.baselinePosition ?? undefined,
        retestPosition: row.retestPosition ?? undefined,
        retestDate: row.retestDate ? new Date(row.retestDate).toISOString() : undefined,
      }));
      actionsList.forEach(a => memActions.set(a.id, a));
      return actionsList;
    }
  } catch (err) {
    console.warn('[Neon listActionItemsByClient] Falling back to memory:', err);
  }
  const fallback = Array.from(memActions.values()).filter(a => !clientId || a.clientId === clientId);
  if (fallback.length > 0) return fallback;
  return [];
}

export async function saveActionItem(action: ActionItem): Promise<void> {
  memActions.set(action.id, action);
  saveDiskCollection('actions.json', memActions);

  try {
    await sqlDb.insert(schema.actions).values({
      id: action.id,
      ownerId: action.ownerId,
      clientId: action.clientId,
      diagnosticId: action.diagnosticId || null,
      promptIds: action.promptIds || [],
      title: action.title,
      why: action.why,
      evidence: action.evidence || { observedFact: '' },
      exactRecommendation: action.exactRecommendation,
      priority: action.priority,
      impact: action.impact,
      effort: action.effort,
      validation: action.validation,
      status: action.status,
      createdAt: action.createdAt ? new Date(action.createdAt) : new Date(),
      pageUrl: action.pageUrl || null,
      implementedAt: action.implementedAt ? new Date(action.implementedAt) : null,
      baselineMentionRate: action.baselineMentionRate ?? null,
      retestMentionRate: action.retestMentionRate ?? null,
      baselineCitationRate: action.baselineCitationRate ?? null,
      retestCitationRate: action.retestCitationRate ?? null,
      baselinePosition: action.baselinePosition ?? null,
      retestPosition: action.retestPosition ?? null,
      retestDate: action.retestDate ? new Date(action.retestDate) : null,
    }).onConflictDoUpdate({
      target: schema.actions.id,
      set: {
        diagnosticId: action.diagnosticId || null,
        promptIds: action.promptIds || [],
        title: action.title,
        why: action.why,
        evidence: action.evidence || { observedFact: '' },
        exactRecommendation: action.exactRecommendation,
        priority: action.priority,
        impact: action.impact,
        effort: action.effort,
        validation: action.validation,
        status: action.status,
        pageUrl: action.pageUrl || null,
        implementedAt: action.implementedAt ? new Date(action.implementedAt) : null,
        baselineMentionRate: action.baselineMentionRate ?? null,
        retestMentionRate: action.retestMentionRate ?? null,
        baselineCitationRate: action.baselineCitationRate ?? null,
        retestCitationRate: action.retestCitationRate ?? null,
        baselinePosition: action.baselinePosition ?? null,
        retestPosition: action.retestPosition ?? null,
        retestDate: action.retestDate ? new Date(action.retestDate) : null,
      }
    });
  } catch (err) {
    console.warn('[Neon saveActionItem] Error saving to database:', err);
  }
}

export async function saveActionItems(actionsList: ActionItem[]): Promise<void> {
  if (!actionsList || actionsList.length === 0) return;
  actionsList.forEach(a => { if (a?.id) memActions.set(a.id, a); });
  saveDiskCollection('actions.json', memActions);

  try {
    for (const action of actionsList) {
      await saveActionItem(action);
    }
  } catch (err) {
    console.warn('[Neon saveActionItems] Error saving batch:', err);
  }
}

// ====== Page Analyses ======
export async function getPageAnalysis(id: string): Promise<PageAnalysis | null> {
  try {
    const rows = await sqlDb.select().from(schema.pageAnalyses).where(eq(schema.pageAnalyses.id, id));
    if (rows.length > 0) {
      const row = rows[0];
      const pa: PageAnalysis = {
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        url: row.url,
        targetPrompt: row.targetPrompt || undefined,
        analyzedAt: row.analyzedAt ? new Date(row.analyzedAt).toISOString() : new Date().toISOString(),
        extractabilityScore: row.extractabilityScore ?? undefined,
        extractabilityStatus: (row.extractabilityStatus as any) || undefined,
        hasSchemaMarkup: row.hasSchemaMarkup ?? undefined,
        hasStructuredSchema: row.hasStructuredSchema ?? undefined,
        detectedSchemaTypes: (row.detectedSchemaTypes as string[]) || undefined,
        hasComparisonTables: row.hasComparisonTables ?? undefined,
        hasComparisonTable: row.hasComparisonTable ?? undefined,
        hasClearHeadingAnswers: row.hasClearHeadingAnswers ?? undefined,
        entityClarityStatus: row.entityClarityStatus as any,
        actionableRecommendations: (row.actionableRecommendations as string[]) || undefined,
        contentLength: row.contentLength ?? undefined,
        h1: row.h1 || undefined,
        h2Count: row.h2Count ?? undefined,
        findings: (row.findings as any) || undefined,
      };
      memPageAnalyses.set(id, pa);
      return pa;
    }
  } catch (err) {
    console.warn('[Neon getPageAnalysis] Falling back to memory:', err);
  }
  return memPageAnalyses.get(id) || null;
}

export async function listPageAnalysesByClient(clientId: string): Promise<PageAnalysis[]> {
  try {
    const rows = await sqlDb.select().from(schema.pageAnalyses).where(eq(schema.pageAnalyses.clientId, clientId));
    if (rows.length > 0) {
      const list: PageAnalysis[] = rows.map(row => ({
        id: row.id,
        ownerId: row.ownerId,
        clientId: row.clientId,
        url: row.url,
        targetPrompt: row.targetPrompt || undefined,
        analyzedAt: row.analyzedAt ? new Date(row.analyzedAt).toISOString() : new Date().toISOString(),
        extractabilityScore: row.extractabilityScore ?? undefined,
        extractabilityStatus: (row.extractabilityStatus as any) || undefined,
        hasSchemaMarkup: row.hasSchemaMarkup ?? undefined,
        hasStructuredSchema: row.hasStructuredSchema ?? undefined,
        detectedSchemaTypes: (row.detectedSchemaTypes as string[]) || undefined,
        hasComparisonTables: row.hasComparisonTables ?? undefined,
        hasComparisonTable: row.hasComparisonTable ?? undefined,
        hasClearHeadingAnswers: row.hasClearHeadingAnswers ?? undefined,
        entityClarityStatus: row.entityClarityStatus as any,
        actionableRecommendations: (row.actionableRecommendations as string[]) || undefined,
        contentLength: row.contentLength ?? undefined,
        h1: row.h1 || undefined,
        h2Count: row.h2Count ?? undefined,
        findings: (row.findings as any) || undefined,
      }));
      list.forEach(pa => memPageAnalyses.set(pa.id, pa));
      return list;
    }
  } catch (err) {
    console.warn('[Neon listPageAnalysesByClient] Falling back to memory:', err);
  }
  const fallback = Array.from(memPageAnalyses.values()).filter(pa => !clientId || pa.clientId === clientId);
  if (fallback.length > 0) return fallback;
  return [];
}

export async function savePageAnalysis(analysis: PageAnalysis): Promise<void> {
  memPageAnalyses.set(analysis.id, analysis);
  saveDiskCollection('page_analyses.json', memPageAnalyses);

  try {
    await sqlDb.insert(schema.pageAnalyses).values({
      id: analysis.id,
      ownerId: analysis.ownerId,
      clientId: analysis.clientId,
      url: analysis.url,
      targetPrompt: analysis.targetPrompt || null,
      analyzedAt: analysis.analyzedAt ? new Date(analysis.analyzedAt) : new Date(),
      extractabilityScore: analysis.extractabilityScore ?? null,
      extractabilityStatus: analysis.extractabilityStatus || null,
      hasSchemaMarkup: analysis.hasSchemaMarkup ?? null,
      hasStructuredSchema: analysis.hasStructuredSchema ?? null,
      detectedSchemaTypes: analysis.detectedSchemaTypes || null,
      hasComparisonTables: analysis.hasComparisonTables ?? null,
      hasComparisonTable: analysis.hasComparisonTable ?? null,
      hasClearHeadingAnswers: analysis.hasClearHeadingAnswers ?? null,
      entityClarityStatus: analysis.entityClarityStatus,
      actionableRecommendations: analysis.actionableRecommendations || null,
      contentLength: analysis.contentLength ?? null,
      h1: analysis.h1 || null,
      h2Count: analysis.h2Count ?? null,
      findings: analysis.findings || null,
    }).onConflictDoUpdate({
      target: schema.pageAnalyses.id,
      set: {
        url: analysis.url,
        targetPrompt: analysis.targetPrompt || null,
        extractabilityScore: analysis.extractabilityScore ?? null,
        extractabilityStatus: analysis.extractabilityStatus || null,
        hasSchemaMarkup: analysis.hasSchemaMarkup ?? null,
        hasStructuredSchema: analysis.hasStructuredSchema ?? null,
        detectedSchemaTypes: analysis.detectedSchemaTypes || null,
        hasComparisonTables: analysis.hasComparisonTables ?? null,
        hasComparisonTable: analysis.hasComparisonTable ?? null,
        hasClearHeadingAnswers: analysis.hasClearHeadingAnswers ?? null,
        entityClarityStatus: analysis.entityClarityStatus,
        actionableRecommendations: analysis.actionableRecommendations || null,
        contentLength: analysis.contentLength ?? null,
        h1: analysis.h1 || null,
        h2Count: analysis.h2Count ?? null,
        findings: analysis.findings || null,
      }
    });
  } catch (err) {
    console.warn('[Neon savePageAnalysis] Error saving to database:', err);
  }
}

// ====== Brand Memory Storage (The Brain / Embeddings & Chunks) ======
export async function saveBrandMemory(item: BrandMemoryItem): Promise<void> {
  memBrandMemories.set(item.id, item);
  saveDiskCollection('brand_memories.json', memBrandMemories);

  try {
    await sqlDb.insert(schema.brandMemories).values({
      id: item.id,
      clientId: item.clientId,
      title: item.title,
      entityType: item.entityType,
      sourceUrl: item.sourceUrl || null,
      sourceType: item.sourceType || 'crawler',
      content: item.content,
      keyFacts: item.keyFacts || [],
      embedding: item.embedding || null,
      relevanceScore: item.relevanceScore ?? null,
      confidence: item.confidence || 'High',
      tags: item.tags || [],
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
      updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
    }).onConflictDoUpdate({
      target: schema.brandMemories.id,
      set: {
        title: item.title,
        entityType: item.entityType,
        sourceUrl: item.sourceUrl || null,
        sourceType: item.sourceType || 'crawler',
        content: item.content,
        keyFacts: item.keyFacts || [],
        embedding: item.embedding || null,
        relevanceScore: item.relevanceScore ?? null,
        confidence: item.confidence || 'High',
        tags: item.tags || [],
        updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date(),
      }
    });
  } catch (err) {
    console.warn('[Neon saveBrandMemory] Error saving to database:', err);
  }
}

export async function saveBrandMemoriesBatch(items: BrandMemoryItem[]): Promise<void> {
  if (!items || items.length === 0) return;
  items.forEach(bm => { if (bm?.id) memBrandMemories.set(bm.id, bm); });
  saveDiskCollection('brand_memories.json', memBrandMemories);

  try {
    for (const item of items) {
      await saveBrandMemory(item);
    }
  } catch (err) {
    console.warn('[Neon saveBrandMemoriesBatch] Error saving batch:', err);
  }
}

export async function getBrandMemoriesByClient(clientId: string): Promise<BrandMemoryItem[]> {
  try {
    const rows = await sqlDb.select().from(schema.brandMemories).where(eq(schema.brandMemories.clientId, clientId));
    if (rows.length > 0) {
      const list: BrandMemoryItem[] = rows.map(row => ({
        id: row.id,
        clientId: row.clientId,
        title: row.title,
        entityType: row.entityType as any,
        sourceUrl: row.sourceUrl || undefined,
        sourceType: (row.sourceType as any) || 'crawler',
        content: row.content,
        keyFacts: (row.keyFacts as string[]) || [],
        embedding: (row.embedding as number[]) || undefined,
        relevanceScore: row.relevanceScore ?? undefined,
        confidence: (row.confidence as any) || 'High',
        tags: (row.tags as string[]) || [],
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: row.updatedAt ? new Date(row.updatedAt).toISOString() : new Date().toISOString(),
      }));
      list.forEach(bm => memBrandMemories.set(bm.id, bm));
      return list;
    }
  } catch (err) {
    console.warn('[Neon getBrandMemoriesByClient] Falling back to memory:', err);
  }
  const fallback = Array.from(memBrandMemories.values()).filter(bm => !clientId || bm.clientId === clientId);
  return fallback;
}

export async function deleteBrandMemory(id: string): Promise<void> {
  memBrandMemories.delete(id);
  saveDiskCollection('brand_memories.json', memBrandMemories);

  try {
    await sqlDb.delete(schema.brandMemories).where(eq(schema.brandMemories.id, id));
  } catch (err) {
    console.warn('[Neon deleteBrandMemory] Error deleting from database:', err);
  }
}

// ====== AEO Generated Content Storage ======
export async function saveAeoContent(item: AeoGeneratedContent): Promise<void> {
  memAeoContents.set(item.id, item);
  saveDiskCollection('aeo_contents.json', memAeoContents);

  try {
    await sqlDb.insert(schema.aeoContents).values({
      id: item.id,
      clientId: item.clientId,
      targetPromptText: item.targetPromptText || null,
      contentType: item.contentType,
      title: item.title,
      slug: item.slug,
      metaDescription: item.metaDescription || null,
      targetH2s: item.targetH2s || [],
      markdownBody: item.markdownBody,
      structuredDataJsonLd: item.structuredDataJsonLd || null,
      usedMemoryIds: item.usedMemoryIds || [],
      usedMemoryTitles: item.usedMemoryTitles || [],
      factCheckStatus: item.factCheckStatus || 'Verified with Brand Memory',
      createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
    }).onConflictDoUpdate({
      target: schema.aeoContents.id,
      set: {
        title: item.title,
        slug: item.slug,
        metaDescription: item.metaDescription || null,
        targetH2s: item.targetH2s || [],
        markdownBody: item.markdownBody,
        structuredDataJsonLd: item.structuredDataJsonLd || null,
        usedMemoryIds: item.usedMemoryIds || [],
        usedMemoryTitles: item.usedMemoryTitles || [],
        factCheckStatus: item.factCheckStatus || 'Verified with Brand Memory',
      }
    });
  } catch (err) {
    console.warn('[Neon saveAeoContent] Error saving to database:', err);
  }
}

export async function getAeoContentsByClient(clientId: string): Promise<AeoGeneratedContent[]> {
  try {
    const rows = await sqlDb.select().from(schema.aeoContents).where(eq(schema.aeoContents.clientId, clientId));
    if (rows.length > 0) {
      const list: AeoGeneratedContent[] = rows.map(row => ({
        id: row.id,
        clientId: row.clientId,
        targetPromptText: row.targetPromptText || undefined,
        contentType: row.contentType as any,
        title: row.title,
        slug: row.slug,
        metaDescription: row.metaDescription || '',
        targetH2s: (row.targetH2s as string[]) || [],
        markdownBody: row.markdownBody,
        structuredDataJsonLd: row.structuredDataJsonLd || '',
        usedMemoryIds: (row.usedMemoryIds as string[]) || [],
        usedMemoryTitles: (row.usedMemoryTitles as string[]) || [],
        factCheckStatus: (row.factCheckStatus as any) || 'Verified with Brand Memory',
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString(),
      }));
      list.forEach(c => memAeoContents.set(c.id, c));
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
  } catch (err) {
    console.warn('[Neon getAeoContentsByClient] Falling back to memory:', err);
  }
  const fallback = Array.from(memAeoContents.values()).filter(aeo => !clientId || aeo.clientId === clientId);
  fallback.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return fallback;
}

export async function deleteAeoContent(id: string): Promise<void> {
  memAeoContents.delete(id);
  saveDiskCollection('aeo_contents.json', memAeoContents);

  try {
    await sqlDb.delete(schema.aeoContents).where(eq(schema.aeoContents.id, id));
  } catch (err) {
    console.warn('[Neon deleteAeoContent] Error deleting from database:', err);
  }
}

// ====== Settings ======
export async function getSettings(ownerId?: string): Promise<AppSettings | null> {
  const id = ownerId ? `owner_${ownerId}` : 'global';
  try {
    const rows = await sqlDb.select().from(schema.settings).where(eq(schema.settings.id, id));
    if (rows.length > 0) {
      const row = rows[0];
      return {
        defaultRunsPerPrompt: row.defaultRunsPerPrompt || 3,
        activeEngine: (row.activeEngine as any) || 'gemini-grounded',
        scheduledCycleFrequency: (row.scheduledCycleFrequency as any) || 'off',
        firecrawlApiKey: row.firecrawlApiKey || undefined,
        perplexityApiKey: row.perplexityApiKey || undefined,
      };
    }
  } catch (err) {
    console.warn('[Neon getSettings] Falling back to memory:', err);
  }
  return memSettings.get(id) || null;
}

export async function saveSettings(settingsData: AppSettings, ownerId?: string): Promise<void> {
  const id = ownerId ? `owner_${ownerId}` : 'global';
  memSettings.set(id, settingsData);
  saveDiskCollection('settings.json', memSettings);

  try {
    await sqlDb.insert(schema.settings).values({
      id,
      defaultRunsPerPrompt: settingsData.defaultRunsPerPrompt || 3,
      activeEngine: settingsData.activeEngine || 'gemini-grounded',
      scheduledCycleFrequency: settingsData.scheduledCycleFrequency || 'off',
      firecrawlApiKey: settingsData.firecrawlApiKey || null,
      perplexityApiKey: settingsData.perplexityApiKey || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: schema.settings.id,
      set: {
        defaultRunsPerPrompt: settingsData.defaultRunsPerPrompt || 3,
        activeEngine: settingsData.activeEngine || 'gemini-grounded',
        scheduledCycleFrequency: settingsData.scheduledCycleFrequency || 'off',
        firecrawlApiKey: settingsData.firecrawlApiKey || null,
        perplexityApiKey: settingsData.perplexityApiKey || null,
        updatedAt: new Date(),
      }
    });
  } catch (err) {
    console.warn('[Neon saveSettings] Error saving to database:', err);
  }
}

// ====== Google Integration ======
export async function getGoogleIntegrationStore(): Promise<GoogleIntegrationState | null> {
  try {
    const rows = await sqlDb.select().from(schema.googleIntegrations).where(eq(schema.googleIntegrations.id, 'global'));
    if (rows.length > 0) {
      const row = rows[0];
      return {
        gscConnected: row.gscConnected || false,
        ga4Connected: row.ga4Connected || false,
        userEmail: row.userEmail || undefined,
        selectedGscSite: row.selectedGscSite || undefined,
        selectedGa4PropertyId: row.selectedGa4PropertyId || undefined,
        availableGscSites: (row.availableGscSites as any) || [],
        availableGa4Properties: (row.availableGa4Properties as any) || [],
        lastSyncAt: row.lastSyncAt ? new Date(row.lastSyncAt).toISOString() : undefined,
        clientId: row.clientId || undefined,
        clientSecret: row.clientSecret || undefined,
        accessToken: row.accessToken || undefined,
        refreshToken: row.refreshToken || undefined,
        expiresAt: row.expiresAt ? Number(row.expiresAt) : undefined,
      };
    }
  } catch (err) {
    console.warn('[Neon getGoogleIntegrationStore] Falling back to memory:', err);
  }
  return memGoogleIntegration;
}

export async function saveGoogleIntegrationStore(data: Partial<GoogleIntegrationState>): Promise<void> {
  memGoogleIntegration = { ...(memGoogleIntegration || { gscConnected: false, ga4Connected: false }), ...data };

  try {
    await sqlDb.insert(schema.googleIntegrations).values({
      id: 'global',
      ownerId: 'default-owner',
      gscConnected: memGoogleIntegration.gscConnected || false,
      ga4Connected: memGoogleIntegration.ga4Connected || false,
      userEmail: memGoogleIntegration.userEmail || null,
      selectedGscSite: memGoogleIntegration.selectedGscSite || null,
      selectedGa4PropertyId: memGoogleIntegration.selectedGa4PropertyId || null,
      availableGscSites: memGoogleIntegration.availableGscSites || null,
      availableGa4Properties: memGoogleIntegration.availableGa4Properties || null,
      lastSyncAt: memGoogleIntegration.lastSyncAt ? new Date(memGoogleIntegration.lastSyncAt) : null,
      clientId: memGoogleIntegration.clientId || null,
      clientSecret: memGoogleIntegration.clientSecret || null,
      accessToken: memGoogleIntegration.accessToken || null,
      refreshToken: memGoogleIntegration.refreshToken || null,
      expiresAt: memGoogleIntegration.expiresAt ? String(memGoogleIntegration.expiresAt) : null,
      updatedAt: new Date(),
    }).onConflictDoUpdate({
      target: schema.googleIntegrations.id,
      set: {
        gscConnected: memGoogleIntegration.gscConnected || false,
        ga4Connected: memGoogleIntegration.ga4Connected || false,
        userEmail: memGoogleIntegration.userEmail || null,
        selectedGscSite: memGoogleIntegration.selectedGscSite || null,
        selectedGa4PropertyId: memGoogleIntegration.selectedGa4PropertyId || null,
        availableGscSites: memGoogleIntegration.availableGscSites || null,
        availableGa4Properties: memGoogleIntegration.availableGa4Properties || null,
        lastSyncAt: memGoogleIntegration.lastSyncAt ? new Date(memGoogleIntegration.lastSyncAt) : null,
        clientId: memGoogleIntegration.clientId || null,
        clientSecret: memGoogleIntegration.clientSecret || null,
        accessToken: memGoogleIntegration.accessToken || null,
        refreshToken: memGoogleIntegration.refreshToken || null,
        expiresAt: memGoogleIntegration.expiresAt ? String(memGoogleIntegration.expiresAt) : null,
        updatedAt: new Date(),
      }
    });
  } catch (err) {
    console.warn('[Neon saveGoogleIntegrationStore] Error saving to database:', err);
  }
}

// ====== Data Purge & Reset Helpers (Real Data Mode) ======
export async function purgeAllMockData(clientId?: string): Promise<{ success: boolean; message: string }> {
  try {
    if (clientId) {
      await sqlDb.execute(sql`DELETE FROM runs WHERE client_id = ${clientId}`);
      await sqlDb.execute(sql`DELETE FROM run_cycles WHERE client_id = ${clientId}`);
      await sqlDb.execute(sql`DELETE FROM diagnostics WHERE client_id = ${clientId}`);
      await sqlDb.execute(sql`DELETE FROM actions WHERE client_id = ${clientId}`);
      await sqlDb.execute(sql`DELETE FROM page_analyses WHERE client_id = ${clientId}`);
      await sqlDb.execute(sql`DELETE FROM brand_memories WHERE client_id = ${clientId}`);
      await sqlDb.execute(sql`DELETE FROM aeo_contents WHERE client_id = ${clientId}`);

      // Clear memory stores for this client
      for (const [id, r] of memRuns.entries()) {
        if (r.clientId === clientId) memRuns.delete(id);
      }
      for (const [id, c] of memRunCycles.entries()) {
        if (c.clientId === clientId) memRunCycles.delete(id);
      }
      for (const [id, d] of memDiagnostics.entries()) {
        if (d.clientId === clientId) memDiagnostics.delete(id);
      }
      for (const [id, a] of memActions.entries()) {
        if (a.clientId === clientId) memActions.delete(id);
      }
      for (const [id, pa] of memPageAnalyses.entries()) {
        if (pa.clientId === clientId) memPageAnalyses.delete(id);
      }
      for (const [id, bm] of memBrandMemories.entries()) {
        if (bm.clientId === clientId) memBrandMemories.delete(id);
      }
      for (const [id, aeo] of memAeoContents.entries()) {
        if (aeo.clientId === clientId) memAeoContents.delete(id);
      }
    } else {
      await sqlDb.execute(sql`DELETE FROM runs`);
      await sqlDb.execute(sql`DELETE FROM run_cycles`);
      await sqlDb.execute(sql`DELETE FROM diagnostics`);
      await sqlDb.execute(sql`DELETE FROM actions`);
      await sqlDb.execute(sql`DELETE FROM page_analyses`);
      await sqlDb.execute(sql`DELETE FROM brand_memories`);
      await sqlDb.execute(sql`DELETE FROM aeo_contents`);

      memRuns.clear();
      memRunCycles.clear();
      memDiagnostics.clear();
      memActions.clear();
      memPageAnalyses.clear();
      memBrandMemories.clear();
      memAeoContents.clear();
    }

    return { success: true, message: `All synthetic/mock run data purged from Neon PostgreSQL. Workspace is in 100% real-data mode.` };
  } catch (err: any) {
    console.warn('[Neon purgeAllMockData] Handled gracefully:', err);
    memRuns.clear();
    memRunCycles.clear();
    memDiagnostics.clear();
    memActions.clear();
    memPageAnalyses.clear();
    memBrandMemories.clear();
    memAeoContents.clear();
    return { success: true, message: `In-memory stores purged.` };
  }
}

// ====== Initial Seed Helper (Real Brand Config & Prompt Set only) ======
export async function seedInitialDemoData(ownerId: string): Promise<Client[]> {
  const realClient: Client = { ...DEMO_CLIENT, ownerId, isDemo: false };
  memClients.set(realClient.id, realClient);
  DEMO_PROMPTS.forEach(p => memPrompts.set(p.id, { ...p, ownerId }));

  try {
    await saveClient(realClient);
    await savePrompts(DEMO_PROMPTS.map(p => ({ ...p, ownerId })));
    return [realClient];
  } catch (err) {
    console.warn('[Neon seedInitialDemoData] Handled gracefully:', err);
    return [realClient];
  }
}
