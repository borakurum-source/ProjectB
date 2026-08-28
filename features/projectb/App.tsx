import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAuth } from './context/AuthContext';
import { useGlobalSync } from './hooks/useGlobalSync';
import { LoginPage } from './components/LoginPage';
import { selectActiveClient } from './workspace';
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
import { BrandMemoryTab } from './components/tabs/BrandMemoryTab';
import { AeoStudioTab } from './components/tabs/AeoStudioTab';
import { SearchInsightsTab } from './components/tabs/SearchInsightsTab';
import { MarketTrendsTab } from './components/tabs/MarketTrendsTab';
import { ActionsTab } from './components/tabs/ActionsTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { RunCycleModal } from './components/RunCycleModal';
import { RunInspectorModal } from './components/RunInspectorModal';
import { DiagnosticModal } from './components/DiagnosticModal';
import { OpportunityModal } from './components/OpportunityModal';
import { ReportModal } from './components/ReportModal';
import { OnboardingModal } from './components/OnboardingModal';
import { FileText, Play, Loader2 } from 'lucide-react';
type TabId = 'Overview' | 'Prompts' | 'Competitors' | 'Pages' | 'BrandMemory' | 'AeoStudio' | 'MarketTrends' | 'SearchInsights' | 'Actions' | 'Settings';

const TAB_PATHS: Record<TabId, string> = {
  Overview: '/',
  Prompts: '/prompts',
  Competitors: '/competitors',
  Pages: '/pages',
  BrandMemory: '/brand-memory',
  AeoStudio: '/aeo-studio',
  MarketTrends: '/market-trends',
  SearchInsights: '/search-insights',
  Actions: '/actions',
  Settings: '/settings',
};

function tabFromPath(pathname: string): TabId {
  const entry = (Object.entries(TAB_PATHS) as [TabId, string][]).find(([, path]) => path === pathname);
  return entry ? entry[0] : 'Overview';
}

export default function App() {
  const { user, loading } = useAuth();

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

  // Client Management State — persisted directly in Cloud SQL / Firestore DB (/api/db/clients)
  const [clients, setClients] = useState<Client[]>([]);
  const [clientsLoaded, setClientsLoaded] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);

  const [activeClientId, setActiveClientId] = useState<string>(() => {
    try {
      const savedId = localStorage.getItem('rag_signal_active_client_id');
      if (savedId) return savedId;
    } catch {}
    return '';
  });

  const getDeletedClientIds = (): string[] => {
    try {
      const raw = localStorage.getItem('rag_signal_deleted_client_ids');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const loadClientsFromDb = useCallback(async () => {
    try {
      const res = await fetch('/api/db/clients');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Client workspace load failed (HTTP ${res.status})`);
      }
      const data: Client[] = await res.json();
      if (Array.isArray(data)) {
        const deletedIds = getDeletedClientIds();
        const filteredData = data.filter((c) => !deletedIds.includes(c.id));
        setClients((prevClients) => {
          const mergedMap = new Map<string, Client>();
          prevClients.forEach((c) => {
            if (!deletedIds.includes(c.id)) {
              const norm = (c.domain || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
              const key = norm || c.id;
              if (!mergedMap.has(key)) mergedMap.set(key, c);
            }
          });
          filteredData.forEach((c) => {
            const norm = (c.domain || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
            const key = norm || c.id;
            mergedMap.set(key, c);
          });

          const mergedList = Array.from(mergedMap.values());
          const savedId = localStorage.getItem('rag_signal_active_client_id');

          setActiveClientId((currentId) => {
            if (currentId && mergedList.some((c) => c.id === currentId)) {
              return currentId;
            }
            const savedClient = mergedList.find((c) => c.id === savedId);
            if (savedClient) return savedClient.id;
            return mergedList[0]?.id || '';
          });

          return mergedList;
        });
      }
      setPersistenceError(null);
    } catch (e: any) {
      setPersistenceError(`Workspace could not be loaded: ${e?.message || 'Database request failed'}`);
    } finally {
      setClientsLoaded(true);
    }
  }, []);

  const handleSelectClient = useCallback((client: Client) => {
    setActiveClientId(client.id);
    try {
      localStorage.setItem('rag_signal_active_client_id', client.id);
    } catch {}
  }, []);

  useEffect(() => {
    if (activeClientId) {
      try {
        localStorage.setItem('rag_signal_active_client_id', activeClientId);
      } catch {}
    }
  }, [activeClientId]);

  useEffect(() => {
    loadClientsFromDb();
  }, [loadClientsFromDb]);

  const persistJson = useCallback(async (path: string, payload: unknown, operation: string): Promise<Response | null> => {
    try {
      const response = await fetch(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      setPersistenceError(null);
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown persistence error';
      setPersistenceError(`${operation} could not be saved: ${message}`);
      return null;
    }
  }, []);

  const persistDelete = useCallback(async (path: string, operation: string): Promise<boolean> => {
    try {
      const response = await fetch(path, { method: 'DELETE' });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || `HTTP ${response.status}`);
      }
      setPersistenceError(null);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown persistence error';
      setPersistenceError(`${operation} could not be deleted: ${message}`);
      return false;
    }
  }, []);

  const saveClientToDb = (client: Client) => {
    void persistJson('/api/db/clients', client, 'Client');
  };

  const saveActionToDb = (action: ActionItem) => {
    void persistJson('/api/db/actions', action, 'Action');
  };

  const saveDiagnosticToDb = (diagnostic: Diagnostic) => {
    void persistJson('/api/db/diagnostics', diagnostic, 'Diagnostic');
  };

  // Active client object — undefined when the workspace has no clients yet.
  const activeClient = useMemo(() => {
    return selectActiveClient(clients, activeClientId);
  }, [clients, activeClientId]);

  // Primary Workspace Data States (Direct Cloud Database Hydration)
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const [cycleAggregates, setCycleAggregates] = useState<CycleAggregate[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);
  const [pageAnalyses, setPageAnalyses] = useState<PageAnalysis[]>([]);
  const [diagnostics, setDiagnostics] = useState<Record<string, Diagnostic>>({});

  // Unified forceRefresh function for live cloud state synchronization
  const forceRefresh = useCallback(async () => {
    await loadClientsFromDb();
    if (!activeClient?.id) return;

    try {
      const [pRes, rRes, dRes, aRes, paRes] = await Promise.all([
        fetch(`/api/db/prompts?clientId=${encodeURIComponent(activeClient.id)}`),
        fetch(`/api/db/runs?clientId=${encodeURIComponent(activeClient.id)}`),
        fetch(`/api/db/diagnostics?clientId=${encodeURIComponent(activeClient.id)}`),
        fetch(`/api/db/actions?clientId=${encodeURIComponent(activeClient.id)}`),
        fetch(`/api/db/page-analyses?clientId=${encodeURIComponent(activeClient.id)}`),
      ]);

      if (![pRes, rRes, dRes, aRes, paRes].every((response) => response.ok)) {
        const failed = [pRes, rRes, dRes, aRes, paRes].find((response) => !response.ok)!;
        const body = await failed.json().catch(() => ({}));
        throw new Error(body.error || `Workspace data refresh failed (HTTP ${failed.status})`);
      }

      if (pRes.ok) {
        const data = await pRes.json();
        if (Array.isArray(data) && data.length > 0) {
          const cleaned = data.filter((p: Prompt) => p.id !== 'prompt-1' && !p.text.includes('Catering/atıştırmalık'));
          setPrompts(cleaned);
        } else {
          setPrompts([]);
        }
      }

      if (rRes.ok) {
        const dbRuns = await rRes.json();
        if (Array.isArray(dbRuns) && dbRuns.length > 0) {
          const sortedRuns = dbRuns.sort((a, b) => new Date(b.runAt).getTime() - new Date(a.runAt).getTime());
          setRuns(sortedRuns);
          const cycleIds = Array.from(new Set(sortedRuns.map((r: Run) => r.cycleId))).filter(Boolean);
          if (cycleIds.length > 0) {
            const aggregates = cycleIds.map((cId) => computeCycleAggregate(cId, sortedRuns, activeClient));
            setCycleAggregates(aggregates.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()));
          } else {
            setCycleAggregates([]);
          }
        } else {
          setRuns([]);
          setCycleAggregates([]);
        }
      }

      if (dRes.ok) {
        const dbDiags = await dRes.json();
        if (Array.isArray(dbDiags) && dbDiags.length > 0) {
          const next: Record<string, Diagnostic> = {};
          dbDiags.forEach((d: Diagnostic) => {
            if (d.promptId) next[d.promptId] = d;
          });
          setDiagnostics(next);
        } else {
          setDiagnostics({});
        }
      }

      if (aRes.ok) {
        const dbActions = await aRes.json();
        if (Array.isArray(dbActions) && dbActions.length > 0) {
          setActions(dbActions);
        } else {
          setActions([]);
        }
      }

      if (paRes.ok) {
        const dbAnalyses = await paRes.json();
        setPageAnalyses(Array.isArray(dbAnalyses) ? dbAnalyses : []);
      }
      setPersistenceError(null);
    } catch (e: any) {
      setPersistenceError(`Workspace data could not be refreshed: ${e?.message || 'Database request failed'}`);
    }
  }, [loadClientsFromDb, activeClient?.id]);

  // Hook for centralized sync (online event, tab focus, custom sync events)
  const { isSyncing, isOnline, triggerRefresh } = useGlobalSync({
    onRefresh: forceRefresh,
  });

  const [internalSyncing, setInternalSyncing] = useState(false);
  const syncStatus = isSyncing || internalSyncing ? 'syncing' : !isOnline ? 'offline' : 'synced';
  const setSyncStatus = (status: 'synced' | 'syncing' | 'offline') => {
    setInternalSyncing(status === 'syncing');
  };

  // Tab State — synced to the URL (see TAB_PATHS) so each tab is a real,
  // shareable, back/forward-navigable address instead of only in-memory state.
  const [activeTab, setActiveTab] = useState<TabId>(() =>
    typeof window === 'undefined' ? 'Overview' : tabFromPath(window.location.pathname),
  );

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

  // Load client-scoped data on activeClient change
  useEffect(() => {
    if (!activeClient) {
      setPrompts([]);
      setRuns([]);
      setCycleAggregates([]);
      setDiagnostics({});
      setActions([]);
      setPageAnalyses([]);
      return;
    }
    forceRefresh();
  }, [activeClient?.id]);

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
  const [activeEngine, setActiveEngine] = useState<EngineId>('gemini-grounded');

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
    if (clientRuns.length > 0) {
      const cycleIds = Array.from(new Set(clientRuns.map((r) => r.cycleId))).filter(Boolean);
      const aggregates = cycleIds.map((cId) => computeCycleAggregate(cId, clientRuns, activeClient));
      return aggregates.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
    }
    return cycleAggregates.filter((c) => c.clientId === activeClient.id);
  }, [clientRuns, cycleAggregates, activeClient]);

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

  // Compute deterministic prompt aggregates from the latest cycle runs (or fallback to prompt's most recent runs)
  const promptAggregates = useMemo(() => {
    return clientPrompts.map((prompt) => {
      let pRuns = latestCycle
        ? clientRuns.filter((r) => r.cycleId === latestCycle.cycleId && r.promptId === prompt.id)
        : [];
      if (pRuns.length === 0) {
        const allPRuns = clientRuns.filter((r) => r.promptId === prompt.id);
        if (allPRuns.length > 0) {
          const latestPromptCycleId = allPRuns[0].cycleId;
          pRuns = allPRuns.filter((r) => r.cycleId === latestPromptCycleId);
        }
      }
      return computePromptAggregate(prompt, pRuns, activeClient);
    });
  }, [clientPrompts, clientRuns, latestCycle, activeClient]);

  // Show Loading Spinner during Auth initialization
  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#090D16] flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-[#D33A2C] animate-spin" />
        <p className="text-xs font-semibold text-[#64748B] dark:text-[#94A3B8] tracking-wider uppercase">
          Initializing RAG SIGNAL Authentication...
        </p>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  // Polls a background run-cycle job started via POST /api/runs/execute-cycle
  // until it finishes. Started as a background job (not one blocking request)
  // because a full cycle's sequential grounded-search calls can take 8-10+
  // minutes for 15 prompts — well past nginx's 300s proxy_read_timeout, which
  // is exactly what silently killed every run cycle before this fix.
  const pollExecutionJob = (jobId: string): Promise<{
    status: 'completed' | 'partial' | 'failed';
    runs: Run[];
    runCycle: { id: string } | null;
    error?: string;
  }> => {
    return new Promise((resolve) => {
      let retryCount = 0;
      const maxRetries = 10;

      const poll = async () => {
        try {
          const res = await fetch(`/api/runs/execute-cycle/${jobId}/status`);
          if (!res.ok) {
            // Retry on 404 (server restart / container boot), 429, or >= 500 up to maxRetries
            if (retryCount < maxRetries) {
              retryCount++;
              const delay = Math.min(1500 * Math.pow(1.3, retryCount), 6000);
              setTimeout(poll, delay);
              return;
            }
            resolve({ status: 'failed', runs: [], runCycle: null, error: `Lost track of the running job (HTTP ${res.status}).` });
            return;
          }
          retryCount = 0; // Reset consecutive error count on successful response
          const data = await res.json();
          setRunProgress({ completed: data.completed, total: data.total });
          if (data.status === 'running') {
            setTimeout(poll, 2000);
          } else {
            resolve(data);
          }
        } catch (err: any) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(poll, 2500);
            return;
          }
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
    setSyncStatus('syncing');
    setRunProgress(null);
    setRunProgressStatus('Initializing Google Search Grounding & Gemini JSON Extraction...');

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
      localStorage.setItem('rag_signal_active_job_id', jobId);
      localStorage.setItem('rag_signal_active_job_client_id', activeClient.id);
      setRunProgress({ completed: 0, total });
      const result = await pollExecutionJob(jobId);

      // Save whatever runs completed even on partial failure — a cycle that dies at
      // run 14/15 shouldn't discard the 14 real measurements it already made.
      if (result.runs && result.runs.length > 0) {
        setRuns((prev) => [...result.runs, ...prev]);

        const cycleId = result.runCycle?.id || result.runs[0]?.cycleId || `cycle-${Date.now()}`;
        const newCycle: CycleAggregate = computeCycleAggregate(cycleId, result.runs, activeClient);
        setCycleAggregates((prev) => [newCycle, ...prev]);
      }

      if (result.status === 'failed' || result.status === 'partial') {
        if (result.runs && result.runs.length > 0) {
          alert(`Run cycle partially completed (${result.runs.length} runs saved): ${result.error || 'Server restarted mid-cycle.'}`);
        } else {
          throw new Error(result.error || 'Run cycle failed partway through.');
        }
      }

      setShowRunModal(false);
    } catch (err: any) {
      console.error('Run cycle failed:', err);
      alert(`Measurement cycle failed: ${err.message || 'Check server connection'}`);
    } finally {
      localStorage.removeItem('rag_signal_active_job_id');
      localStorage.removeItem('rag_signal_active_job_client_id');
      setIsExecutingCycle(false);
      setRunProgressStatus('');
      setRunProgress(null);
      setSyncStatus('synced');
    }
  };

  // Run 6-Dimension Diagnostic (Connects to backend /api/diagnostics/generate)
  const handleDiagnosePrompt = async (prompt: Prompt) => {
    const pRuns = clientRuns.filter((r) => r.promptId === prompt.id);
    setDiagnosingPrompt(prompt);

    if (pRuns.length === 0) {
      // DiagnosticModal will render "Insufficient Measurement Variance" box with Run Cycle trigger
      return;
    }

    setIsDiagnosing(true);
    setSyncStatus('syncing');

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
      const diagObj = data.diagnostic || data;
      if (diagObj) {
        setDiagnostics((prev) => ({
          ...prev,
          [prompt.id]: diagObj,
        }));
        saveDiagnosticToDb(diagObj);
      }
    } catch (err: any) {
      console.error('Diagnosis failed:', err);
      alert(`Diagnosis failed: ${err.message || 'Unknown error'}`);
    } finally {
      setIsDiagnosing(false);
      setSyncStatus('synced');
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
        prev.map((a) => {
          if (a.id === action.id) {
            const updated: ActionItem = {
              ...a,
              status: 'Retested',
              retestDate: new Date().toISOString(),
              retestMentionRate,
              retestCitationRate,
              retestPosition,
            };
            saveActionToDb(updated);
            return updated;
          }
          return a;
        })
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
    void persistJson('/api/db/prompts', newPrompt, 'Prompt');
  };

  // Bulk add prompts
  const handleBulkAddPrompts = (newPromptsData: Omit<Prompt, 'id' | 'createdAt'>[]) => {
    const newPrompts: Prompt[] = newPromptsData.map((d, i) => ({
      ...d,
      id: `p-${Date.now()}-${i}`,
      createdAt: new Date().toISOString(),
    }));
    setPrompts((prev) => [...prev, ...newPrompts]);
    void persistJson('/api/db/prompts/batch', { prompts: newPrompts }, 'Prompt batch');
  };

  // Toggle prompt active status
  const handleTogglePromptActive = (promptId: string) => {
    setPrompts((prev) =>
      prev.map((p) => {
        if (p.id === promptId) {
          const updated = { ...p, active: !p.active };
          void persistJson('/api/db/prompts', updated, 'Prompt');
          return updated;
        }
        return p;
      })
    );
  };

  // Delete prompt
  const handleDeletePrompt = (promptId: string) => {
    setPrompts((prev) => prev.filter((p) => p.id !== promptId));
    void persistDelete(`/api/db/prompts/${promptId}`, 'Prompt');
  };

  // Update prompt fields (for inline title editing)
  const handleUpdatePrompt = (promptId: string, updatedFields: Partial<Prompt>) => {
    setPrompts((prev) =>
      prev.map((p) => {
        if (p.id === promptId) {
          const updated = { ...p, ...updatedFields };
          void persistJson('/api/db/prompts', updated, 'Prompt');
          return updated;
        }
        return p;
      })
    );
  };

  // Add new client brand via Onboarding Modal
  const handleNewClient = () => {
    setShowOnboardingModal(true);
  };

  const handleCompleteOnboarding = async (newClient: Client, autoGeneratePrompts: boolean) => {
    const ownedClient: Client = { ...newClient, ownerId: user.id };
    let seedPrompts: Prompt[] = [];
    if (autoGeneratePrompts) {
      try {
        const res = await fetch('/api/prompts/discover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            brandName: ownedClient.brandName,
            domain: ownedClient.domain,
            industry: ownedClient.industry,
            market: ownedClient.market,
            language: ownedClient.language,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.prompts) && data.prompts.length > 0) {
            seedPrompts = data.prompts.map((p: any, idx: number) => ({
              id: `p-discovered-${Date.now()}-${idx}`,
              ownerId: user.id,
              clientId: ownedClient.id,
              text: p.text,
              category: p.category || 'General',
              intentLayer: p.intentLayer || 'Commercial / Product Evaluation',
              active: true,
              createdAt: new Date().toISOString(),
            }));
          }
        }
      } catch (err) {
        console.warn('Failed to auto-discover seed prompts during onboarding:', err);
      }
    }

    // Atomic transaction for brand profile, language settings, & initial prompts via batch-sync endpoint
    try {
      const response = await persistJson('/api/db/batch-sync', { client: ownedClient, prompts: seedPrompts }, 'Onboarding workspace');
      if (!response) return;
    } catch (e) {
      console.error('Failed atomic batch sync on onboarding:', e);
      setPersistenceError('Onboarding workspace could not be saved. No local state was committed.');
      return;
    }

    setClients((prev) => {
      const normNew = (ownedClient.domain || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
      const filtered = prev.filter((c) => {
        const norm = (c.domain || '').toLowerCase().trim().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '');
        return c.id !== ownedClient.id && norm !== normNew;
      });
      return [...filtered, ownedClient];
    });
    setActiveClientId(ownedClient.id);
    localStorage.setItem('rag_signal_active_client_id', ownedClient.id);
    localStorage.setItem('rag_signal_demo_cleared', 'true');
    if (seedPrompts.length > 0) {
      setPrompts((prev) => [...seedPrompts, ...prev]);
    }
    setShowOnboardingModal(false);
  };

  // Delete client brand workspace
  const handleDeleteClient = async (clientId: string) => {
    const deleted = await persistDelete(`/api/db/clients/${clientId}`, 'Client');
    if (!deleted) return;

    try {
      const deletedIds = getDeletedClientIds();
      if (!deletedIds.includes(clientId)) {
        deletedIds.push(clientId);
        localStorage.setItem('rag_signal_deleted_client_ids', JSON.stringify(deletedIds));
      }
    } catch {}

    setClients((prev) => {
      const remaining = prev.filter((c) => c.id !== clientId);
      if (activeClientId === clientId) {
        if (remaining.length > 0) {
          setActiveClientId(remaining[0].id);
          localStorage.setItem('rag_signal_active_client_id', remaining[0].id);
        } else {
          setActiveClientId('');
          localStorage.removeItem('rag_signal_active_client_id');
          setShowOnboardingModal(true);
        }
      }
      return remaining;
    });
  };

  // Update client atomically via batch-sync endpoint
  const handleUpdateClient = (updated: Partial<Client>) => {
    const updatedClient = { ...activeClient, ...updated };
    setClients((prev) =>
      prev.map((c) => (c.id === activeClient.id ? updatedClient : c))
    );
    void persistJson('/api/db/batch-sync', { client: updatedClient }, 'Client');
  };

  // Reset Demo Data
  // Clear Mockup Data & Setup Real Client Workspace
  const clearDemoWorkspace = () => {
    localStorage.setItem('rag_signal_demo_cleared', 'true');
    localStorage.removeItem('rag_signal_clients');
    localStorage.removeItem('rag_signal_active_client_id');

    // Delete demo benchmark client on backend DB
    void persistDelete('/api/db/clients/client-snacksforparty', 'Demo client');

    // Retain existing real (non-demo) clients if any
    const realClients = clients.filter((c) => !c.isDemo && c.id !== 'client-snacksforparty');
    setClients(realClients);

    if (realClients.length > 0) {
      setActiveClientId(realClients[0].id);
      localStorage.setItem('rag_signal_active_client_id', realClients[0].id);
    } else {
      setActiveClientId('');
      setPrompts([]);
      setRuns([]);
      setCycleAggregates([]);
      setActions([]);
      setPageAnalyses([]);
      setDiagnostics({});
      setShowOnboardingModal(true);
    }
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
          {persistenceError && (
            <div role="alert" className="mb-3 border border-[#FCA5A5] bg-[#FEF2F2] dark:border-[#7F1D1D] dark:bg-[#450A0A]/40 p-3 text-left text-xs text-[#991B1B] dark:text-[#FCA5A5]">
              {persistenceError}
            </div>
          )}
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
        onSelectClient={handleSelectClient}
        onNewClient={handleNewClient}
        onDeleteClient={handleDeleteClient}
        activeTab={activeTab}
        onSelectTab={navigateTab}
        onOpenRunModal={() => setShowRunModal(true)}
        activeEngine={activeEngine}
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        onManualSync={triggerRefresh}
        isSyncing={isSyncing}
        isOnline={isOnline}
      />

      {/* Main Workspace Area with Sleek Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {persistenceError && (
          <div role="alert" className="mx-3.5 mt-3 sm:mx-6 lg:mx-8 rounded border border-[#FCA5A5] bg-[#FEF2F2] px-3 py-2 text-xs text-[#991B1B] dark:border-[#7F1D1D] dark:bg-[#450A0A]/40 dark:text-[#FCA5A5]">
            <div className="flex items-start justify-between gap-3">
              <span>{persistenceError}</span>
              <button type="button" onClick={() => setPersistenceError(null)} className="font-bold uppercase tracking-wider">Dismiss</button>
            </div>
          </div>
        )}
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
            
            {/* Visual Sync Status Indicator */}
            <div
              className={`flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded border transition-all shrink-0 ${
                syncStatus === 'synced'
                  ? 'bg-[#ECFDF5] dark:bg-[#064E3B]/40 text-[#065F46] dark:text-[#A7F3D0] border-[#A7F3D0] dark:border-[#065F46]'
                  : syncStatus === 'syncing'
                  ? 'bg-[#EEF2FF] dark:bg-[#312E81]/40 text-[#4338CA] dark:text-[#C7D2FE] border-[#C7D2FE] dark:border-[#4338CA]'
                  : 'bg-[#FEF2F2] dark:bg-[#7F1D1D]/40 text-[#991B1B] dark:text-[#FCA5A5] border-[#FCA5A5] dark:border-[#7F1D1D]'
              }`}
              title={
                syncStatus === 'synced'
                  ? 'Fully synchronized with Firebase & Cloud SQL'
                  : syncStatus === 'syncing'
                  ? 'Active write / run cycle in progress'
                  : 'Offline mode — local cache active'
              }
            >
              {syncStatus === 'synced' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  <span>Cloud Synced</span>
                </>
              )}
              {syncStatus === 'syncing' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full border border-[#4338CA] dark:border-[#818CF8] border-t-transparent animate-spin" />
                  <span>Syncing...</span>
                </>
              )}
              {syncStatus === 'offline' && (
                <>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444]" />
                  <span>Offline</span>
                </>
              )}
            </div>

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
              runs={clientRuns}
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
              runs={clientRuns}
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
              cycles={clientCycles}
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
              runs={clientRuns}
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
                saveActionToDb(newAct);
                navigateTab('Actions');
              }}
            />
          )}

          {activeTab === 'BrandMemory' && <BrandMemoryTab client={activeClient} />}

          {activeTab === 'AeoStudio' && <AeoStudioTab client={activeClient} />}

          {activeTab === 'MarketTrends' && (
            <MarketTrendsTab
              client={activeClient}
              cycleAggregates={clientCycles}
              prompts={clientPrompts}
              runs={clientRuns}
              onOpenRunModal={() => setShowRunModal(true)}
              onInspectPrompt={(id) => setInspectingPromptId(id)}
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
                  prev.map((a) => {
                    if (a.id === id) {
                      const updated = { ...a, status };
                      saveActionToDb(updated);
                      return updated;
                    }
                    return a;
                  })
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
                saveActionToDb(newAct);
              }}
              isRetestingActionId={isRetestingActionId}
            />
          )}

          {activeTab === 'Settings' && (
            <SettingsTab
              client={activeClient}
              prompts={prompts}
              onUpdateClient={handleUpdateClient}
              onDeleteClient={handleDeleteClient}
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
          className="fixed bottom-16 md:bottom-4 right-3 md:right-4 z-40 bg-[#111827] dark:bg-[#4338CA] text-white px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full shadow-lg text-[11px] sm:text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-black dark:hover:bg-[#3730A3] transition-colors"
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
          runs={clientRuns}
          isLoading={isDiagnosing}
          onGenerate={() => handleDiagnosePrompt(diagnosingPrompt)}
          onOpenRunModal={() => {
            setDiagnosingPrompt(null);
            setShowRunModal(true);
          }}
          onSaveAction={(action) => {
            setActions((prev) => [action, ...prev]);
            saveActionToDb(action);
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
          cycleAggregates={clientCycles}
          promptAggregates={promptAggregates}
          prompts={clientPrompts}
          runs={clientRuns}
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
