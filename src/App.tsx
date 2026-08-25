import { useState, useMemo, useEffect } from 'react';
import {
  Client,
  Prompt,
  Run,
  CycleAggregate,
  ActionItem,
  PageAnalysis,
  Diagnostic,
  EngineId,
  ActionStatus,
} from './types';
import { computePromptAggregate, computeCycleAggregate } from './utils/metrics';
import { Navbar } from './components/Navbar';
import { OverviewTab } from './components/tabs/OverviewTab';
import { PromptsTab } from './components/tabs/PromptsTab';
import { CompetitorsTab } from './components/tabs/CompetitorsTab';
import { PagesTab } from './components/tabs/PagesTab';
import { SearchInsightsTab } from './components/tabs/SearchInsightsTab';
import { ActionsTab } from './components/tabs/ActionsTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { RunCycleModal } from './components/RunCycleModal';
import { RunInspectorModal } from './components/RunInspectorModal';
import { DiagnosticModal } from './components/DiagnosticModal';
import { OpportunityModal } from './components/OpportunityModal';
import { ReportModal } from './components/ReportModal';
import { OnboardingModal } from './components/OnboardingModal';
import { FileText, Play } from 'lucide-react';

// Single-tenant for now: everything is scoped to this owner in the Neon DB
// (see src/services/db-api.ts, mounted at /api/db in server.ts).
const OWNER_ID = 'default-owner';

type TabId = 'Overview' | 'Prompts' | 'Competitors' | 'Pages' | 'SearchInsights' | 'Actions' | 'Settings';

const TAB_PATHS: Record<TabId, string> = {
  Overview: '/',
  Prompts: '/prompts',
  Competitors: '/competitors',
  Pages: '/pages',
  SearchInsights: '/search-insights',
  Actions: '/actions',
  Settings: '/settings',
};

function tabFromPath(pathname: string): TabId {
  const entry = (Object.entries(TAB_PATHS) as [TabId, string][]).find(([, path]) => path === pathname);
  return entry ? entry[0] : 'Overview';
}

export default function App() {
  // Dark Mode State with localStorage & media query fallback
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('rag_signal_theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('rag_signal_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('rag_signal_theme', 'light');
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  // Client Management State — persisted in Neon (/api/db/clients), not
  // localStorage, so real client data survives across browsers/devices instead
  // of living only in whichever browser last touched it.
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);

  useEffect(() => {
    fetch(`/api/db/clients?ownerId=${encodeURIComponent(OWNER_ID)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setClients(data);
      })
      .catch((e) => console.error('Failed to load clients from DB:', e))
      .finally(() => setClientsLoaded(true));
  }, []);

  const saveClientToDb = (client: Client) => {
    fetch('/api/db/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(client),
    }).catch((e) => console.error('Failed to save client to DB:', e));
  };

  const [activeClientId, setActiveClientId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('rag_signal_active_client_id');
      if (savedId) return savedId;
    } catch {}
    return '';
  });

  // Active client object — undefined when the workspace has no clients yet.
  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === activeClientId) || clients[0];
  }, [clients, activeClientId]);

  // First-run / empty-workspace routing: send the user straight into onboarding
  // to create a real client instead of ever silently showing fabricated data.
  // Gated on clientsLoaded so it doesn't flash onboarding while the DB fetch
  // above is still in flight (clients starts at [] every load).
  useEffect(() => {
    if (clientsLoaded && clients.length === 0) {
      setShowOnboardingModal(true);
    }
  }, [clientsLoaded, clients.length]);

  // Tab State — synced to the URL (see TAB_PATHS) so each tab is a real,
  // shareable, back/forward-navigable address instead of only in-memory state.
  const [activeTab, setActiveTab] = useState<TabId>(() => tabFromPath(window.location.pathname));

  const navigateTab = (tab: TabId) => {
    setActiveTab(tab);
    if (window.location.pathname !== TAB_PATHS[tab]) {
      window.history.pushState(null, '', TAB_PATHS[tab]);
    }
  };

  useEffect(() => {
    const onPopState = () => setActiveTab(tabFromPath(window.location.pathname));
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Prompts are persisted in Neon (/api/db/prompts), scoped by clientId — loaded
  // by the effect below whenever the active client changes. Runs, Cycles,
  // Actions, and Diagnostics still use localStorage persistence.
  const [prompts, setPrompts] = useState<Prompt[]>([]);

  useEffect(() => {
    if (!activeClient) {
      setPrompts([]);
      return;
    }
    fetch(`/api/db/prompts?clientId=${encodeURIComponent(activeClient.id)}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => {
        if (Array.isArray(data)) setPrompts(data);
      })
      .catch((e) => console.error('Failed to load prompts from DB:', e));
  }, [activeClient?.id]);

  const [runs, setRuns] = useState<Run[]>(() => {
    try {
      const saved = localStorage.getItem('rag_signal_runs');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved runs:', e);
    }
    // No fabricated measurement runs — visibility data only comes from real run cycles.
    return [];
  });

  const [cycleAggregates, setCycleAggregates] = useState<CycleAggregate[]>(() => {
    try {
      const saved = localStorage.getItem('rag_signal_cycles');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved cycles:', e);
    }
    return [];
  });

  const [actions, setActions] = useState<ActionItem[]>(() => {
    try {
      const saved = localStorage.getItem('rag_signal_actions');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved actions:', e);
    }
    return [];
  });

  const [pageAnalyses, setPageAnalyses] = useState<PageAnalysis[]>(() => {
    try {
      const saved = localStorage.getItem('rag_signal_page_analyses');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved pageAnalyses:', e);
    }
    return [];
  });

  // Clients are saved to the DB individually at the point of mutation (see
  // handleCompleteOnboarding, handleUpdateClient, etc.) rather than via a
  // blanket effect — a DB upsert needs the specific changed record, not an
  // "overwrite everything" call every time the array reference changes.
  useEffect(() => {
    try {
      localStorage.setItem('rag_signal_active_client_id', activeClientId);
    } catch (e) {
      console.error('Failed to save activeClientId to localStorage:', e);
    }
  }, [activeClientId]);

  // Batch-upsert prompts to the DB whenever the list changes (mirrors the old
  // "save whole array" localStorage effect, just against /api/db instead). A
  // save right after the load effect above just re-upserts the same rows —
  // harmless, since it's an upsert, not an overwrite-and-delete.
  useEffect(() => {
    if (!activeClient || prompts.length === 0) return;
    fetch('/api/db/prompts/batch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompts }),
    }).catch((e) => console.error('Failed to save prompts to DB:', e));
  }, [prompts, activeClient]);

  useEffect(() => {
    try {
      localStorage.setItem('rag_signal_runs', JSON.stringify(runs));
    } catch (e) {
      console.error('Failed to save runs to localStorage:', e);
    }
  }, [runs]);

  useEffect(() => {
    try {
      localStorage.setItem('rag_signal_cycles', JSON.stringify(cycleAggregates));
    } catch (e) {
      console.error('Failed to save cycles to localStorage:', e);
    }
  }, [cycleAggregates]);

  useEffect(() => {
    try {
      localStorage.setItem('rag_signal_actions', JSON.stringify(actions));
    } catch (e) {
      console.error('Failed to save actions to localStorage:', e);
    }
  }, [actions]);

  useEffect(() => {
    try {
      localStorage.setItem('rag_signal_page_analyses', JSON.stringify(pageAnalyses));
    } catch (e) {
      console.error('Failed to save pageAnalyses to localStorage:', e);
    }
  }, [pageAnalyses]);
  const [diagnostics, setDiagnostics] = useState<Record<string, Diagnostic>>(() => {
    try {
      const saved = localStorage.getItem('rag_signal_diagnostics');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch (e) {
      console.error('Failed to parse saved diagnostics:', e);
    }
    // No auto-seeded demo diagnostics — real diagnoses come from /api/diagnostics/generate.
    return {};
  });

  useEffect(() => {
    try {
      localStorage.setItem('rag_signal_diagnostics', JSON.stringify(diagnostics));
    } catch (e) {
      console.error('Failed to save diagnostics to localStorage:', e);
    }
  }, [diagnostics]);

  // Modals & Inspection State
  const [showRunModal, setShowRunModal] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [isExecutingCycle, setIsExecutingCycle] = useState(false);
  const [runProgressStatus, setRunProgressStatus] = useState('');
  const [runProgress, setRunProgress] = useState<{ completed: number; total: number } | null>(null);
  const [inspectingPromptId, setInspectingPromptId] = useState<string | null>(null);
  const [diagnosingPrompt, setDiagnosingPrompt] = useState<Prompt | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isRetestingActionId, setIsRetestingActionId] = useState<string | null>(null);

  // Active Engine
  const [activeEngine, setActiveEngine] = useState<EngineId>('perplexity-sonar');

  // Filter items by active client. activeClient is undefined until a client
  // exists (see the empty-workspace guard below) — these memos run on every
  // render regardless, so they must tolerate that instead of crashing.
  const clientPrompts = useMemo(() => {
    if (!activeClient) return [];
    return prompts.filter((p) => p.clientId === activeClient.id);
  }, [prompts, activeClient]);

  const clientRuns = useMemo(() => {
    if (!activeClient) return [];
    return runs.filter((r) => r.clientId === activeClient.id);
  }, [runs, activeClient]);

  const clientCycles = useMemo(() => {
    if (!activeClient) return [];
    return cycleAggregates.filter((c) => c.clientId === activeClient.id);
  }, [cycleAggregates, activeClient]);

  const latestCycle = useMemo(() => {
    if (clientCycles.length === 0) return null;
    return [...clientCycles].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];
  }, [clientCycles]);

  const clientActions = useMemo(() => {
    if (!activeClient) return [];
    return actions.filter((a) => a.clientId === activeClient.id);
  }, [actions, activeClient]);

  // Compute deterministic prompt aggregates from the latest cycle runs (or all client runs)
  const promptAggregates = useMemo(() => {
    const runsForAgg = latestCycle
      ? clientRuns.filter((r) => r.cycleId === latestCycle.cycleId)
      : clientRuns;

    return clientPrompts.map((prompt) => {
      const pRuns = runsForAgg.filter((r) => r.promptId === prompt.id);
      return computePromptAggregate(prompt, pRuns, activeClient);
    });
  }, [clientPrompts, clientRuns, latestCycle, activeClient]);

  // Polls a background run-cycle job started via POST /api/runs/execute-cycle
  // until it finishes. Started as a background job (not one blocking request)
  // because a full cycle's sequential grounded-search calls can take 8-10+
  // minutes for 15 prompts — well past nginx's 300s proxy_read_timeout, which
  // is exactly what silently killed every run cycle before this fix.
  const pollExecutionJob = (jobId: string): Promise<{
    status: 'completed' | 'failed';
    runs: Run[];
    runCycle: { id: string } | null;
    error?: string;
  }> => {
    return new Promise((resolve) => {
      const poll = async () => {
        try {
          const res = await fetch(`/api/runs/execute-cycle/${jobId}/status`);
          if (!res.ok) {
            resolve({ status: 'failed', runs: [], runCycle: null, error: `Lost track of the running job (HTTP ${res.status}).` });
            return;
          }
          const data = await res.json();
          setRunProgress({ completed: data.completed, total: data.total });
          if (data.status === 'running') {
            setTimeout(poll, 1500);
          } else {
            resolve(data);
          }
        } catch (err: any) {
          resolve({ status: 'failed', runs: [], runCycle: null, error: err?.message || 'Lost connection while polling job status.' });
        }
      };
      poll();
    });
  };

  // Execute Grounded Run Cycle (Connects to backend /api/runs/execute-cycle)
  const handleExecuteCycle = async (config: {
    promptIds: string[];
    runsPerPrompt: number;
    engine: EngineId;
  }) => {
    setIsExecutingCycle(true);
    setRunProgress(null);
    setRunProgressStatus(
      config.engine === 'perplexity-sonar'
        ? 'Initializing Perplexity Agent Grounded Search & Gemini JSON Extraction...'
        : 'Initializing Google Search Grounding & Gemini JSON Extraction...'
    );

    try {
      const targetPrompts = clientPrompts.filter((p) => config.promptIds.includes(p.id));

      const response = await fetch('/api/runs/execute-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: activeClient,
          prompts: targetPrompts,
          runsPerPrompt: config.runsPerPrompt,
          engine: config.engine,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || `Execution error: HTTP ${response.status}`);
      }

      const { jobId, total } = await response.json();
      setRunProgress({ completed: 0, total });
      const result = await pollExecutionJob(jobId);

      // Save whatever runs completed even on failure — a cycle that dies at
      // run 22/30 shouldn't discard the 22 real measurements it already made.
      if (result.runs.length > 0) {
        setRuns((prev) => [...result.runs, ...prev]);
      }

      if (result.status === 'failed') {
        throw new Error(result.error || 'Run cycle failed partway through.');
      }

      const newCycle: CycleAggregate = computeCycleAggregate(result.runCycle!.id, result.runs, activeClient);
      setCycleAggregates((prev) => [newCycle, ...prev]);

      // If client was demo and we ran a live cycle, update timestamp
      if (activeClient.isDemo) {
        const updatedClient = { ...activeClient, isDemo: false };
        setClients((prev) =>
          prev.map((c) => (c.id === activeClient.id ? updatedClient : c))
        );
        saveClientToDb(updatedClient);
      }

      setShowRunModal(false);
    } catch (err: any) {
      console.error('Run cycle failed:', err);
      alert(`Measurement cycle failed: ${err.message || 'Check server connection'}`);
    } finally {
      setIsExecutingCycle(false);
      setRunProgressStatus('');
      setRunProgress(null);
    }
  };

  // Run 6-Dimension Diagnostic (Connects to backend /api/diagnostics/generate)
  const handleDiagnosePrompt = async (prompt: Prompt) => {
    const pRuns = clientRuns.filter((r) => r.promptId === prompt.id);
    // The diagnostic is evidence-backed by design — it needs at least one real
    // measurement run to synthesize from, and correctly refuses to fabricate one.
    // Failing that silently (previously: console.error only, no user feedback)
    // just looked like a broken button, so check and explain upfront instead of
    // round-tripping to the server for a 400.
    if (pRuns.length === 0) {
      alert('This prompt has no measurement runs yet. Run a measurement cycle (Overview → Run Cycle) for it first, then diagnose.');
      return;
    }

    setDiagnosingPrompt(prompt);
    setIsDiagnosing(true);

    try {
      const response = await fetch('/api/diagnostics/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: activeClient,
          prompt,
          runs: pRuns,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || 'Diagnostic service failed');
      }
      const data = await response.json();

      if (data.diagnostic) {
        setDiagnostics((prev) => ({
          ...prev,
          [prompt.id]: data.diagnostic,
        }));
      }
    } catch (err: any) {
      console.error('Diagnosis failed:', err);
      alert(`Diagnosis failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDiagnosing(false);
    }
  };

  // Page Analysis (Connects to backend /api/pages/analyze)
  const handleAnalyzePage = async (url: string, rawHtml?: string): Promise<PageAnalysis> => {
    const response = await fetch('/api/pages/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url,
        rawHtml,
        client: activeClient,
      }),
    });

    if (!response.ok) throw new Error('Page analysis failed');
    const data = await response.json();
    const newAnalysis: PageAnalysis = data.analysis;

    setPageAnalyses((prev) => [newAnalysis, ...prev]);
    return newAnalysis;
  };

  // Retest Action Workflow
  const handleRetestAction = async (action: ActionItem) => {
    setIsRetestingActionId(action.id);
    try {
      const targetPrompts = clientPrompts.filter((p) => action.promptIds.includes(p.id));
      if (targetPrompts.length === 0) {
        alert('No tracked prompts associated with this action item to retest.');
        return;
      }

      const response = await fetch('/api/runs/execute-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: activeClient,
          prompts: targetPrompts,
          runsPerPrompt: 3,
          engine: activeEngine,
        }),
      });

      if (!response.ok) {
        const errBody = await response.json().catch(() => null);
        throw new Error(errBody?.error || `Retest cycle failed: HTTP ${response.status}`);
      }
      const { jobId } = await response.json();
      const result = await pollExecutionJob(jobId);

      if (result.runs.length > 0) {
        setRuns((prev) => [...result.runs, ...prev]);
      }
      if (result.status === 'failed') {
        throw new Error(result.error || 'Retest cycle failed partway through.');
      }

      const newRuns: Run[] = result.runs;
      const newCycle = computeCycleAggregate(result.runCycle!.id, newRuns, activeClient);
      setCycleAggregates((prev) => [newCycle, ...prev]);

      // Real measured retest rates — no artificial floor. A retest that shows no
      // improvement (or a regression) must be shown as exactly that, not bumped
      // up to a guaranteed-looking +33%.
      const retestMentionCount = newRuns.filter((r) => r.brandMentioned).length;
      const retestCitationCount = newRuns.filter((r) => r.brandCited).length;
      const retestMentionRate = newRuns.length > 0 ? retestMentionCount / newRuns.length : 0;
      const retestCitationRate = newRuns.length > 0 ? retestCitationCount / newRuns.length : 0;

      const retestPositions = newRuns
        .map((r) => r.position)
        .filter((p): p is number => p !== null);
      const retestPosition =
        retestPositions.length > 0
          ? Math.round(retestPositions.reduce((a, b) => a + b, 0) / retestPositions.length)
          : null;

      setActions((prev) =>
        prev.map((a) =>
          a.id === action.id
            ? {
                ...a,
                status: 'Retested',
                retestDate: new Date().toISOString(),
                retestMentionRate,
                retestCitationRate,
                retestPosition,
              }
            : a
        )
      );
    } catch (err: any) {
      console.error('Retest error:', err);
      alert(`Retest failed: ${err.message}`);
    } finally {
      setIsRetestingActionId(null);
    }
  };

  // Add single prompt
  const handleAddPrompt = (newPromptData: Omit<Prompt, 'id' | 'createdAt'>) => {
    const newPrompt: Prompt = {
      ...newPromptData,
      id: `p-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setPrompts((prev) => [...prev, newPrompt]);
  };

  // Bulk add prompts
  const handleBulkAddPrompts = (newPromptsData: Omit<Prompt, 'id' | 'createdAt'>[]) => {
    const newPrompts: Prompt[] = newPromptsData.map((d, i) => ({
      ...d,
      id: `p-${Date.now()}-${i}`,
      createdAt: new Date().toISOString(),
    }));
    setPrompts((prev) => [...prev, ...newPrompts]);
  };

  // Toggle prompt active status
  const handleTogglePromptActive = (promptId: string) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === promptId ? { ...p, active: !p.active } : p))
    );
  };

  // Delete prompt
  const handleDeletePrompt = (promptId: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== promptId));
    // The prompts batch-save effect only upserts — it never deletes rows that
    // drop out of the array, so the DB row needs an explicit delete call too.
    fetch(`/api/db/prompts/${promptId}`, { method: 'DELETE' }).catch((e) =>
      console.error('Failed to delete prompt from DB:', e)
    );
  };

  // Update prompt fields (for inline title editing)
  const handleUpdatePrompt = (promptId: string, updatedFields: Partial<Prompt>) => {
    setPrompts((prev) =>
      prev.map((p) => (p.id === promptId ? { ...p, ...updatedFields } : p))
    );
  };

  // Add new client brand via Onboarding Modal
  const handleNewClient = () => {
    setShowOnboardingModal(true);
  };

  const handleCompleteOnboarding = async (newClient: Client, autoGeneratePrompts: boolean) => {
    setClients((prev) => [...prev, newClient]);
    setActiveClientId(newClient.id);
    setShowOnboardingModal(false);
    saveClientToDb(newClient);

    // If requested, auto-discover initial seed prompts for this brand & market
    if (autoGeneratePrompts) {
      try {
        const res = await fetch('/api/prompts/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandName: newClient.brandName,
            domain: newClient.domain,
            industry: newClient.industry,
            market: newClient.market,
            language: newClient.language,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.prompts) && data.prompts.length > 0) {
            const seedPrompts: Prompt[] = data.prompts.map((p: any, idx: number) => ({
              id: `p-discovered-${Date.now()}-${idx}`,
              ownerId: 'default-owner',
              clientId: newClient.id,
              text: p.text,
              category: p.category || 'General',
              intentLayer: p.intentLayer || 'Commercial / Product Evaluation',
              active: true,
              createdAt: new Date().toISOString(),
            }));
            setPrompts((prev) => [...seedPrompts, ...prev]);
          }
        }
      } catch (err) {
        console.warn('Failed to auto-discover seed prompts during onboarding:', err);
      }
    }
  };

  // Update client
  const handleUpdateClient = (updated: Partial<Client>) => {
    const updatedClient = { ...activeClient, ...updated };
    setClients((prev) =>
      prev.map((c) => (c.id === activeClient.id ? updatedClient : c))
    );
    saveClientToDb(updatedClient);
  };

  // Reset Demo Data
  // Clear Mockup Data & Setup Real Client Workspace
  const clearDemoWorkspace = () => {
    localStorage.removeItem('rag_signal_clients');
    localStorage.removeItem('rag_signal_active_client_id');
    localStorage.removeItem('rag_signal_prompts');
    localStorage.removeItem('rag_signal_runs');
    localStorage.removeItem('rag_signal_cycles');
    localStorage.removeItem('rag_signal_actions');
    localStorage.removeItem('rag_signal_page_analyses');
    localStorage.removeItem('rag_signal_diagnostics');

    setClients([]);
    setActiveClientId('');
    setPrompts([]);
    setRuns([]);
    setCycleAggregates([]);
    setActions([]);
    setPageAnalyses([]);
    setDiagnostics({});

    setShowOnboardingModal(true);
  };

  const handleClearDemoDataAndStartReal = () => {
    if (confirm('Clear all demo benchmark data and set up a real client brand workspace?')) {
      clearDemoWorkspace();
    }
  };

  // Export JSON Data
  const handleExportJson = () => {
    const data = {
      client: activeClient,
      prompts: clientPrompts,
      runs: clientRuns,
      cycles: clientCycles,
      actions: clientActions,
      pageAnalyses,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `rag-signal-${activeClient.brandName.toLowerCase()}-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const inspectingPrompt = prompts.find((p) => p.id === inspectingPromptId);

  // Still loading clients from the DB — render nothing rather than flashing the
  // "no client" onboarding screen while the fetch is in flight.
  if (!clientsLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] dark:bg-[#090D16]" />
    );
  }

  // Empty workspace: no client yet. Show onboarding only — never render the main
  // dashboard against an undefined client, and never fall back to fabricated data.
  if (!activeClient) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FA] dark:bg-[#090D16] text-[#1A1A1A] dark:text-[#F1F5F9] font-sans antialiased transition-colors px-4">
        <div className="text-center space-y-2 max-w-sm">
          <div className="text-sm font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">RAG Signal</div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8]">
            No client workspace yet. Set up your brand to start real, live-measured AI visibility runs.
          </p>
          <button
            onClick={() => setShowOnboardingModal(true)}
            className="mt-2 px-4 py-2 bg-[#111827] dark:bg-[#4338CA] text-white rounded text-xs font-bold uppercase tracking-wider"
          >
            Set Up Your Brand
          </button>
        </div>
        <OnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => setShowOnboardingModal(false)}
          onComplete={handleCompleteOnboarding}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8F9FA] dark:bg-[#090D16] text-[#1A1A1A] dark:text-[#F1F5F9] font-sans antialiased transition-colors">
      {/* Navigation Sidebar & Mobile Header */}
      <Navbar
        clients={clients}
        activeClient={activeClient}
        onSelectClient={(c) => setActiveClientId(c.id)}
        onNewClient={handleNewClient}
        activeTab={activeTab}
        onSelectTab={navigateTab}
        onOpenRunModal={() => setShowRunModal(true)}
        activeEngine={activeEngine}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
      />

      {/* Main Workspace Area with Sleek Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sleek Top Header matching design */}
        <header className="h-14 sm:h-16 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] px-3.5 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20 transition-colors">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <div className="text-xs sm:text-sm text-[#9CA3AF] dark:text-[#64748B] truncate">
              Client / <span className="text-[#111827] dark:text-[#F8FAFC] font-medium">{activeClient.brandName}</span>
            </div>
            {activeClient.isDemo && (
              <span className="bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#B45309] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                DEMO DATA
              </span>
            )}
            <div className="bg-[#E5E7EB] dark:bg-[#334155] h-4 w-[1px] mx-1 sm:mx-2 hidden sm:block" />
            <div className="text-xs font-mono bg-[#F3F4F6] dark:bg-[#1E293B] px-2 py-1 border border-[#D1D5DB] dark:border-[#334155] text-[#4B5563] dark:text-[#94A3B8] hidden sm:block shrink-0 rounded">
              n={activeClient.defaultRunsPerPrompt || 3} runs/prompt
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowReportModal(true)}
              className="bg-white dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#D1D5DB] dark:border-[#334155] text-[#111827] dark:text-[#F8FAFC] text-xs font-bold uppercase tracking-wider px-2.5 sm:px-4 py-1.5 sm:py-2 rounded shadow-xs transition-colors flex items-center gap-1.5 min-h-[36px]"
            >
              <FileText className="w-3.5 h-3.5 text-[#4338CA] dark:text-[#818CF8]" />
              <span className="hidden sm:inline">Briefing Report</span>
              <span className="sm:hidden text-[11px]">Report</span>
            </button>
            <button
              onClick={() => setShowRunModal(true)}
              className="bg-[#111827] dark:bg-[#4338CA] hover:bg-[#1f2937] dark:hover:bg-[#3730A3] text-white text-xs font-bold uppercase tracking-widest px-3 sm:px-6 py-1.5 sm:py-2 rounded shadow-xs transition-colors flex items-center gap-1.5 min-h-[36px]"
            >
              <Play className="w-3 h-3 fill-current sm:hidden" />
              <span className="hidden sm:inline">Execute Run Cycle</span>
              <span className="sm:hidden text-[11px]">Run Cycle</span>
            </button>
          </div>
        </header>

        {/* Main Workspace Tab Container */}
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-6 lg:p-8 pb-24 md:pb-8 space-y-5 sm:space-y-6 max-w-7xl w-full mx-auto">
          {activeTab === 'Overview' && (
            <OverviewTab
              client={activeClient}
              promptAggregates={promptAggregates}
              cycleAggregates={clientCycles}
              latestCycle={latestCycle}
              actions={clientActions}
              prompts={clientPrompts}
              onInspectPrompt={(id) => setInspectingPromptId(id)}
              onOpenRunModal={() => setShowRunModal(true)}
              onNavigateTab={navigateTab}
              onClearDemoData={handleClearDemoDataAndStartReal}
            />
          )}

          {activeTab === 'Prompts' && (
            <PromptsTab
              prompts={clientPrompts}
              promptAggregates={promptAggregates}
              client={activeClient}
              onAddPrompt={handleAddPrompt}
              onBulkAddPrompts={handleBulkAddPrompts}
              onToggleActive={handleTogglePromptActive}
              onDeletePrompt={handleDeletePrompt}
              onUpdatePrompt={handleUpdatePrompt}
              onInspectPrompt={(id) => setInspectingPromptId(id)}
              onDiagnosePrompt={handleDiagnosePrompt}
              onOpenOpportunities={() => setShowOpportunityModal(true)}
            />
          )}

          {activeTab === 'Competitors' && (
            <CompetitorsTab
              client={activeClient}
              promptAggregates={promptAggregates}
              latestCycle={latestCycle}
              prompts={clientPrompts}
              runs={clientRuns}
              onDiagnosePrompt={handleDiagnosePrompt}
              onInspectPrompt={(id) => setInspectingPromptId(id)}
            />
          )}

          {activeTab === 'Pages' && (
            <PagesTab
              client={activeClient}
              savedAnalyses={pageAnalyses}
              onAnalyzePage={handleAnalyzePage}
              onSaveActionFromPage={(rec) => {
                const newAct: ActionItem = {
                  id: `action-${Date.now()}`,
                  ownerId: activeClient.ownerId,
                  clientId: activeClient.id,
                  promptIds: clientPrompts.slice(0, 2).map((p) => p.id),
                  title: 'Landing Page Extractability Optimization',
                  why: 'Page lacks structured Q&A headings or JSON-LD schema',
                  evidence: {
                    observedFact: 'Diagnosed via Page Extractability Analyzer',
                  },
                  exactRecommendation: rec,
                  priority: 'High',
                  impact: 'High',
                  effort: 'Low',
                  validation: 'Rerun page extractability test and verify schema resolution',
                  status: 'Todo',
                  createdAt: new Date().toISOString(),
                };
                setActions((prev) => [newAct, ...prev]);
                navigateTab('Actions');
              }}
            />
          )}

          {activeTab === 'SearchInsights' && <SearchInsightsTab client={activeClient} />}

          {activeTab === 'Actions' && (
            <ActionsTab
              actions={clientActions}
              client={activeClient}
              prompts={clientPrompts}
              onUpdateActionStatus={(id, status) => {
                setActions((prev) =>
                  prev.map((a) => (a.id === id ? { ...a, status } : a))
                );
              }}
              onRetestAction={handleRetestAction}
              onCreateAction={(act) => {
                const newAct: ActionItem = {
                  ...act,
                  id: `action-${Date.now()}`,
                  createdAt: new Date().toISOString(),
                };
                setActions((prev) => [newAct, ...prev]);
              }}
              isRetestingActionId={isRetestingActionId}
            />
          )}

          {activeTab === 'Settings' && (
            <SettingsTab
              client={activeClient}
              onUpdateClient={handleUpdateClient}
              onClearDemoData={handleClearDemoDataAndStartReal}
              exportDataJson={handleExportJson}
            />
          )}
        </main>
      </div>

      {/* Run Cycle Configuration & Cost Modal */}
      {showRunModal && (
        <RunCycleModal
          prompts={clientPrompts}
          client={activeClient}
          defaultRunsPerPrompt={activeClient.defaultRunsPerPrompt || 3}
          activeEngine={activeEngine}
          onConfirm={handleExecuteCycle}
          onClose={() => setShowRunModal(false)}
          isExecuting={isExecutingCycle}
          progressStatus={runProgressStatus}
          runProgress={runProgress || undefined}
        />
      )}

      {/* Background run-cycle indicator — visible when the job's still going but
          the modal above was dismissed, so it's never unclear whether it's still running. */}
      {isExecutingCycle && !showRunModal && (
        <button
          onClick={() => setShowRunModal(true)}
          className="fixed bottom-4 right-4 z-40 bg-[#111827] dark:bg-[#4338CA] text-white px-4 py-2.5 rounded-full shadow-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-black dark:hover:bg-[#3730A3] transition-colors"
        >
          <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          Run Cycle: {runProgress ? `${runProgress.completed}/${runProgress.total}` : 'starting...'}
        </button>
      )}

      {/* Run Inspector Modal */}
      {inspectingPrompt && (
        <RunInspectorModal
          prompt={inspectingPrompt}
          runs={clientRuns}
          client={activeClient}
          onClose={() => setInspectingPromptId(null)}
          onDiagnose={handleDiagnosePrompt}
        />
      )}

      {/* 6-Dimension Diagnostic Modal */}
      {diagnosingPrompt && (
        <DiagnosticModal
          prompt={diagnosingPrompt}
          diagnostic={diagnostics[diagnosingPrompt.id] || null}
          client={activeClient}
          isLoading={isDiagnosing}
          onGenerate={() => handleDiagnosePrompt(diagnosingPrompt)}
          onSaveAction={(action) => {
            setActions((prev) => [action, ...prev]);
          }}
          onClose={() => setDiagnosingPrompt(null)}
        />
      )}

      {/* Opportunity Discovery Modal */}
      {showOpportunityModal && (
        <OpportunityModal
          client={activeClient}
          onAddPrompts={(newPrompts) => {
            const items = newPrompts.map((p) => ({
              ...p,
              ownerId: activeClient.ownerId,
              clientId: activeClient.id,
              active: true,
            }));
            handleBulkAddPrompts(items);
          }}
          onClose={() => setShowOpportunityModal(false)}
        />
      )}

      {/* Executive Print-Ready Report Modal */}
      {showReportModal && (
        <ReportModal
          client={activeClient}
          cycleAggregate={latestCycle}
          promptAggregates={promptAggregates}
          actions={clientActions}
          diagnostics={Object.values(diagnostics)}
          onClose={() => setShowReportModal(false)}
        />
      )}

      {/* New Client Onboarding & Website Analysis Modal */}
      <OnboardingModal
        isOpen={showOnboardingModal}
        onClose={() => setShowOnboardingModal(false)}
        onComplete={handleCompleteOnboarding}
      />
    </div>
  );
}

