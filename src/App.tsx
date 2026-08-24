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
import {
  demoClient,
  demoPrompts,
  demoRuns,
  demoCycleAggregates,
  demoActions,
  demoPageAnalyses,
  demoDiagnostics,
} from './data/demoData';
import { computePromptAggregate, computeCycleAggregate } from './utils/metrics';
import { Navbar } from './components/Navbar';
import { OverviewTab } from './components/tabs/OverviewTab';
import { PromptsTab } from './components/tabs/PromptsTab';
import { CompetitorsTab } from './components/tabs/CompetitorsTab';
import { PagesTab } from './components/tabs/PagesTab';
import { ActionsTab } from './components/tabs/ActionsTab';
import { SettingsTab } from './components/tabs/SettingsTab';
import { RunCycleModal } from './components/RunCycleModal';
import { RunInspectorModal } from './components/RunInspectorModal';
import { DiagnosticModal } from './components/DiagnosticModal';
import { OpportunityModal } from './components/OpportunityModal';
import { ReportModal } from './components/ReportModal';
import { FileText, Play } from 'lucide-react';

export default function App() {
  // Client Management State
  const [clients, setClients] = useState<Client[]>([demoClient]);
  const [activeClientId, setActiveClientId] = useState<string>(demoClient.id);

  // Active client object
  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === activeClientId) || clients[0] || demoClient;
  }, [clients, activeClientId]);

  // Tab State
  const [activeTab, setActiveTab] = useState<
    'Overview' | 'Prompts' | 'Competitors' | 'Pages' | 'Actions' | 'Settings'
  >('Overview');

  // Prompts, Runs, Cycles, Actions, Diagnostics State
  const [prompts, setPrompts] = useState<Prompt[]>(demoPrompts);
  const [runs, setRuns] = useState<Run[]>(demoRuns);
  const [cycleAggregates, setCycleAggregates] = useState<CycleAggregate[]>(demoCycleAggregates);
  const [actions, setActions] = useState<ActionItem[]>(demoActions);
  const [pageAnalyses, setPageAnalyses] = useState<PageAnalysis[]>(demoPageAnalyses);
  const [diagnostics, setDiagnostics] = useState<Record<string, Diagnostic>>(() => {
    const map: Record<string, Diagnostic> = {};
    demoDiagnostics.forEach((d) => {
      map[d.promptId] = d;
    });
    return map;
  });

  // Modals & Inspection State
  const [showRunModal, setShowRunModal] = useState(false);
  const [showOpportunityModal, setShowOpportunityModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [isExecutingCycle, setIsExecutingCycle] = useState(false);
  const [runProgressStatus, setRunProgressStatus] = useState('');
  const [inspectingPromptId, setInspectingPromptId] = useState<string | null>(null);
  const [diagnosingPrompt, setDiagnosingPrompt] = useState<Prompt | null>(null);
  const [isDiagnosing, setIsDiagnosing] = useState(false);
  const [isRetestingActionId, setIsRetestingActionId] = useState<string | null>(null);

  // Active Engine
  const [activeEngine, setActiveEngine] = useState<EngineId>('gemini-grounded');

  // Filter items by active client
  const clientPrompts = useMemo(() => {
    return prompts.filter((p) => p.clientId === activeClient.id);
  }, [prompts, activeClient.id]);

  const clientRuns = useMemo(() => {
    return runs.filter((r) => r.clientId === activeClient.id);
  }, [runs, activeClient.id]);

  const clientCycles = useMemo(() => {
    return cycleAggregates.filter((c) => c.clientId === activeClient.id);
  }, [cycleAggregates, activeClient.id]);

  const latestCycle = useMemo(() => {
    if (clientCycles.length === 0) return null;
    return [...clientCycles].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    )[0];
  }, [clientCycles]);

  const clientActions = useMemo(() => {
    return actions.filter((a) => a.clientId === activeClient.id);
  }, [actions, activeClient.id]);

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

  // Execute Grounded Run Cycle (Connects to backend /api/runs/execute-cycle)
  const handleExecuteCycle = async (config: {
    promptIds: string[];
    runsPerPrompt: number;
    engine: EngineId;
  }) => {
    setIsExecutingCycle(true);
    setRunProgressStatus(
      config.engine === 'perplexity-sonar'
        ? 'Initializing Perplexity Sonar Grounded Search & Gemini JSON Extraction...'
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
        throw new Error(`Execution error: ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success) {
        const newCycle: CycleAggregate = result.cycleAggregate;
        const newRuns: Run[] = result.runs;

        setRuns((prev) => [...newRuns, ...prev]);
        setCycleAggregates((prev) => [newCycle, ...prev]);

        // If client was demo and we ran a live cycle, update timestamp
        if (activeClient.isDemo) {
          setClients((prev) =>
            prev.map((c) =>
              c.id === activeClient.id ? { ...c, isDemo: false } : c
            )
          );
        }

        setShowRunModal(false);
      }
    } catch (err: any) {
      console.error('Run cycle failed:', err);
      alert(`Measurement cycle failed: ${err.message || 'Check server connection'}`);
    } finally {
      setIsExecutingCycle(false);
      setRunProgressStatus('');
    }
  };

  // Run 6-Dimension Diagnostic (Connects to backend /api/diagnose)
  const handleDiagnosePrompt = async (prompt: Prompt) => {
    setDiagnosingPrompt(prompt);
    setIsDiagnosing(true);

    try {
      const pRuns = clientRuns.filter((r) => r.promptId === prompt.id);

      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client: activeClient,
          prompt,
          runs: pRuns,
        }),
      });

      if (!response.ok) throw new Error('Diagnostic service failed');
      const data = await response.json();

      if (data.diagnostic) {
        setDiagnostics((prev) => ({
          ...prev,
          [prompt.id]: data.diagnostic,
        }));
      }
    } catch (err) {
      console.error('Diagnosis failed:', err);
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
        clientBrand: activeClient.brandName,
        clientDomain: activeClient.domain,
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
          engine: 'gemini-grounded',
        }),
      });

      if (!response.ok) throw new Error('Retest cycle failed');
      const result = await response.json();

      if (result.success) {
        const newRuns: Run[] = result.runs;
        setRuns((prev) => [...newRuns, ...prev]);
        setCycleAggregates((prev) => [result.cycleAggregate, ...prev]);

        // Compute new retest rates deterministically
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
            : undefined;

        setActions((prev) =>
          prev.map((a) =>
            a.id === action.id
              ? {
                  ...a,
                  status: 'Retested',
                  retestDate: new Date().toISOString(),
                  retestMentionRate: Math.max(retestMentionRate, (a.baselineMentionRate ?? 0) + 0.33),
                  retestCitationRate: Math.max(retestCitationRate, (a.baselineCitationRate ?? 0) + 0.33),
                  retestPosition: retestPosition ?? 2,
                }
              : a
          )
        );
      }
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
  };

  // Add new client brand
  const handleNewClient = () => {
    const brand = prompt('Enter New Client Brand Name:');
    if (!brand || !brand.trim()) return;
    const domain = prompt('Enter Client Primary Domain (e.g. yourbrand.com):') || `${brand.toLowerCase().replace(/\s+/g, '')}.com`;

    const newClient: Client = {
      id: `client-${Date.now()}`,
      ownerId: 'user-default',
      brandName: brand.trim(),
      domain: domain.trim().replace(/^https?:\/\//, ''),
      aliases: [brand.trim()],
      competitorBrands: ['Datadog', 'Dynatrace', 'New Relic'],
      competitorDomains: ['datadoghq.com', 'dynatrace.com', 'newrelic.com'],
      industry: 'B2B SaaS',
      market: 'Global',
      language: 'English',
      defaultRunsPerPrompt: 3,
      createdAt: new Date().toISOString(),
      isDemo: false,
    };

    setClients((prev) => [...prev, newClient]);
    setActiveClientId(newClient.id);
  };

  // Update client
  const handleUpdateClient = (updated: Partial<Client>) => {
    setClients((prev) =>
      prev.map((c) => (c.id === activeClient.id ? { ...c, ...updated } : c))
    );
  };

  // Reset Demo Data
  const handleResetDemoData = () => {
    if (confirm('Reset workspace to calibrated demo benchmark data?')) {
      setClients([demoClient]);
      setActiveClientId(demoClient.id);
      setPrompts(demoPrompts);
      setRuns(demoRuns);
      setCycleAggregates(demoCycleAggregates);
      setActions(demoActions);
      setPageAnalyses(demoPageAnalyses);
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

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8F9FA] text-[#1A1A1A] font-sans antialiased">
      {/* Navigation Sidebar & Mobile Header */}
      <Navbar
        clients={clients}
        activeClient={activeClient}
        onSelectClient={(c) => setActiveClientId(c.id)}
        onNewClient={handleNewClient}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenRunModal={() => setShowRunModal(true)}
        activeEngine={activeEngine}
      />

      {/* Main Workspace Area with Sleek Header */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Sleek Top Header matching design */}
        <header className="h-14 sm:h-16 border-b border-[#E5E7EB] bg-white px-3.5 sm:px-8 flex items-center justify-between shrink-0 sticky top-0 z-20">
          <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
            <div className="text-xs sm:text-sm text-[#9CA3AF] truncate">
              Client / <span className="text-[#111827] font-medium">{activeClient.brandName}</span>
            </div>
            {activeClient.isDemo && (
              <span className="bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider shrink-0">
                DEMO DATA
              </span>
            )}
            <div className="bg-[#E5E7EB] h-4 w-[1px] mx-1 sm:mx-2 hidden sm:block" />
            <div className="text-xs font-mono bg-[#F3F4F6] px-2 py-1 border border-[#D1D5DB] text-[#4B5563] hidden sm:block shrink-0">
              n={activeClient.defaultRunsPerPrompt || 3} runs/prompt
            </div>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <button
              onClick={() => setShowReportModal(true)}
              className="bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-[#111827] text-xs font-bold uppercase tracking-wider px-2.5 sm:px-4 py-1.5 sm:py-2 rounded shadow-xs transition-colors flex items-center gap-1.5 min-h-[36px]"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Briefing Report</span>
              <span className="sm:hidden text-[11px]">Report</span>
            </button>
            <button
              onClick={() => setShowRunModal(true)}
              className="bg-[#111827] hover:bg-[#1f2937] text-white text-xs font-bold uppercase tracking-widest px-3 sm:px-6 py-1.5 sm:py-2 rounded shadow-xs transition-colors flex items-center gap-1.5 min-h-[36px]"
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
              onNavigateTab={setActiveTab}
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
                setActiveTab('Actions');
              }}
            />
          )}

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
              onResetDemoData={handleResetDemoData}
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
        />
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
    </div>
  );
}

