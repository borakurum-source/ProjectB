import { Client, Prompt, RunCycle, Run, Diagnostic, ActionItem, PageAnalysis, AppSettings } from '../types';
import { DEMO_CLIENT, DEMO_PROMPTS, DEMO_RUN_CYCLES, DEMO_RUNS, DEMO_DIAGNOSTICS, DEMO_ACTIONS, DEMO_PAGE_ANALYSES } from '../data/demoData';

export interface PersistenceAdapter {
  save<T extends { id: string }>(collection: string, id: string, data: T): Promise<void>;
  load<T>(collection: string, id: string): Promise<T | null>;
  list<T>(collection: string, filterOwnerId?: string): Promise<T[]>;
  delete(collection: string, id: string): Promise<void>;
  saveAll<T extends { id: string }>(collection: string, items: T[]): Promise<void>;
}

export class LocalStorageAdapter implements PersistenceAdapter {
  private getStorageKey(collection: string): string {
    return `rag_signal_${collection}`;
  }

  async save<T extends { id: string }>(collection: string, id: string, data: T): Promise<void> {
    const list = await this.list<T>(collection);
    const existingIndex = list.findIndex((item: any) => item.id === id);
    if (existingIndex >= 0) {
      list[existingIndex] = data;
    } else {
      list.push(data);
    }
    localStorage.setItem(this.getStorageKey(collection), JSON.stringify(list));
  }

  async load<T>(collection: string, id: string): Promise<T | null> {
    const list = await this.list<T & { id: string }>(collection);
    const item = list.find((i) => i.id === id);
    return item || null;
  }

  async list<T>(collection: string, filterOwnerId?: string): Promise<T[]> {
    try {
      const raw = localStorage.getItem(this.getStorageKey(collection));
      if (!raw) return [];
      const parsed: T[] = JSON.parse(raw);
      if (filterOwnerId) {
        return (parsed as any[]).filter((item) => item.ownerId === filterOwnerId);
      }
      return parsed;
    } catch {
      return [];
    }
  }

  async delete(collection: string, id: string): Promise<void> {
    const list = await this.list<{ id: string }>(collection);
    const filtered = list.filter((i) => i.id !== id);
    localStorage.setItem(this.getStorageKey(collection), JSON.stringify(filtered));
  }

  async saveAll<T extends { id: string }>(collection: string, items: T[]): Promise<void> {
    localStorage.setItem(this.getStorageKey(collection), JSON.stringify(items));
  }
}

export interface AppStoreData {
  clients: Client[];
  prompts: Prompt[];
  runCycles: RunCycle[];
  runs: Run[];
  diagnostics: Diagnostic[];
  actions: ActionItem[];
  pageAnalyses: PageAnalysis[];
  settings: AppSettings;
}

export class AppStore {
  private adapter: PersistenceAdapter;

  constructor(adapter: PersistenceAdapter = new LocalStorageAdapter()) {
    this.adapter = adapter;
  }

  async initializeWithDefaults(): Promise<AppStoreData> {
    // No auto-seeded demo data: a fresh workspace starts empty and the app should
    // route the user into onboarding to create a real, live-measured client. Demo
    // data is opt-in only, via the explicit "Reset Calibrated Demo Workspace" action
    // in Settings — never silently injected on load. See spec §5: NO FAKE DATA, EVER.
    return this.loadAll();
  }

  async loadAll(): Promise<AppStoreData> {
    const [clients, prompts, runCycles, runs, diagnostics, actions, pageAnalyses, rawSettings] =
      await Promise.all([
        this.adapter.list<Client>('clients'),
        this.adapter.list<Prompt>('prompts'),
        this.adapter.list<RunCycle>('runCycles'),
        this.adapter.list<Run>('runs'),
        this.adapter.list<Diagnostic>('diagnostics'),
        this.adapter.list<ActionItem>('actions'),
        this.adapter.list<PageAnalysis>('pageAnalyses'),
        this.adapter.load<AppSettings>('settings', 'global_settings'),
      ]);

    const settings: AppSettings = rawSettings || {
      defaultRunsPerPrompt: 3,
      activeEngine: 'gemini-grounded',
      scheduledCycleFrequency: 'weekly',
    };

    return {
      clients,
      prompts,
      runCycles,
      runs,
      diagnostics,
      actions,
      pageAnalyses,
      settings,
    };
  }

  async resetToDemo(): Promise<void> {
    await Promise.all([
      this.adapter.saveAll('clients', [DEMO_CLIENT]),
      this.adapter.saveAll('prompts', DEMO_PROMPTS),
      this.adapter.saveAll('runCycles', DEMO_RUN_CYCLES),
      this.adapter.saveAll('runs', DEMO_RUNS),
      this.adapter.saveAll('diagnostics', DEMO_DIAGNOSTICS),
      this.adapter.saveAll('actions', DEMO_ACTIONS),
      this.adapter.saveAll('pageAnalyses', DEMO_PAGE_ANALYSES),
      this.adapter.save('settings', 'global_settings', {
        id: 'global_settings',
        defaultRunsPerPrompt: 3,
        activeEngine: 'gemini-grounded',
        scheduledCycleFrequency: 'weekly',
      } as any),
    ]);
  }

  async saveClient(client: Client): Promise<void> {
    await this.adapter.save('clients', client.id, client);
  }

  async savePrompt(prompt: Prompt): Promise<void> {
    await this.adapter.save('prompts', prompt.id, prompt);
  }

  async savePrompts(prompts: Prompt[]): Promise<void> {
    await this.adapter.saveAll('prompts', prompts);
  }

  async deletePrompt(id: string): Promise<void> {
    await this.adapter.delete('prompts', id);
  }

  async saveRunCycle(cycle: RunCycle): Promise<void> {
    await this.adapter.save('runCycles', cycle.id, cycle);
  }

  async saveRuns(runs: Run[]): Promise<void> {
    const existing = await this.adapter.list<Run>('runs');
    const merged = [...existing.filter((r) => !runs.some((newR) => newR.id === r.id)), ...runs];
    await this.adapter.saveAll('runs', merged);
  }

  async saveDiagnostic(diag: Diagnostic): Promise<void> {
    await this.adapter.save('diagnostics', diag.id, diag);
  }

  async saveAction(action: ActionItem): Promise<void> {
    await this.adapter.save('actions', action.id, action);
  }

  async saveActions(actions: ActionItem[]): Promise<void> {
    await this.adapter.saveAll('actions', actions);
  }

  async savePageAnalysis(analysis: PageAnalysis): Promise<void> {
    await this.adapter.save('pageAnalyses', analysis.id, analysis);
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    await this.adapter.save('settings', 'global_settings', { ...settings, id: 'global_settings' } as any);
  }

  exportDataJson(data: AppStoreData): string {
    return JSON.stringify(data, null, 2);
  }

  async importDataJson(jsonString: string): Promise<AppStoreData> {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid JSON format for import');
    }

    if (Array.isArray(parsed.clients)) await this.adapter.saveAll('clients', parsed.clients);
    if (Array.isArray(parsed.prompts)) await this.adapter.saveAll('prompts', parsed.prompts);
    if (Array.isArray(parsed.runCycles)) await this.adapter.saveAll('runCycles', parsed.runCycles);
    if (Array.isArray(parsed.runs)) await this.adapter.saveAll('runs', parsed.runs);
    if (Array.isArray(parsed.diagnostics)) await this.adapter.saveAll('diagnostics', parsed.diagnostics);
    if (Array.isArray(parsed.actions)) await this.adapter.saveAll('actions', parsed.actions);
    if (Array.isArray(parsed.pageAnalyses)) await this.adapter.saveAll('pageAnalyses', parsed.pageAnalyses);
    if (parsed.settings) await this.saveSettings(parsed.settings);

    return this.loadAll();
  }
}

export const appStore = new AppStore();
