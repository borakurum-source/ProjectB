import { useState, useEffect } from 'react';
import { Prompt, Client, EngineId } from '../types';
import { X, Play, Calculator } from 'lucide-react';

interface RunCycleModalProps {
  prompts: Prompt[];
  client: Client;
  defaultRunsPerPrompt: number;
  activeEngine: EngineId;
  onConfirm: (config: { promptIds: string[]; runsPerPrompt: number; engine: EngineId }) => void;
  onClose: () => void;
  isExecuting: boolean;
  progressStatus?: string;
}

export function RunCycleModal({
  prompts,
  client,
  defaultRunsPerPrompt,
  activeEngine,
  onConfirm,
  onClose,
  isExecuting,
  progressStatus,
}: RunCycleModalProps) {
  const activePrompts = prompts.filter((p) => p.active);
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>(
    activePrompts.map((p) => p.id)
  );
  const [runsPerPrompt, setRunsPerPrompt] = useState<number>(defaultRunsPerPrompt || 3);
  const [engine, setEngine] = useState<EngineId>(activeEngine || 'gemini-grounded');
  const [isPerplexityConfigured, setIsPerplexityConfigured] = useState(false);

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (data?.perplexityApiKeyConfigured) {
          setIsPerplexityConfigured(true);
        }
      })
      .catch(() => {});
  }, []);

  // Exact arithmetic calculation
  const promptCount = selectedPromptIds.length;
  const enginesCount = 1;
  const callsPerRun = 2; // Call 1 (Grounded Answer) + Call 2 (Semantic Schema Extraction)
  const totalApiCalls = promptCount * runsPerPrompt * enginesCount * callsPerRun;

  const togglePrompt = (id: string) => {
    if (selectedPromptIds.includes(id)) {
      setSelectedPromptIds(selectedPromptIds.filter((pId) => pId !== id));
    } else {
      setSelectedPromptIds([...selectedPromptIds, id]);
    }
  };

  const selectAll = () => {
    if (selectedPromptIds.length === activePrompts.length) {
      setSelectedPromptIds([]);
    } else {
      setSelectedPromptIds(activePrompts.map((p) => p.id));
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/70 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#111827] dark:bg-[#4338CA] text-white">
                Measurement Cycle Configuration
              </span>
              <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono">Atomic Unit of Measurement</span>
            </div>
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC]">Execute New Grounded Run Cycle</h2>
          </div>
          {!isExecuting && (
            <button
              onClick={onClose}
              className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC] p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {isExecuting ? (
            <div className="py-12 text-center space-y-4">
              <div className="w-12 h-12 border-2 border-[#111827] dark:border-[#818CF8] border-t-transparent rounded-full animate-spin mx-auto" />
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">
                  Executing Grounded Run Cycle in Progress
                </h3>
                <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1 font-mono">
                  {progressStatus || 'Running Call 1 (Search Grounding) & Call 2 (Semantic Extraction)...'}
                </p>
              </div>
              <div className="bg-[#F9FAFB] dark:bg-[#1E293B] p-3 border border-[#E5E7EB] dark:border-[#334155] max-w-md mx-auto text-xs text-[#6B7280] dark:text-[#94A3B8]">
                Executing {totalApiCalls} total API requests ({promptCount} prompts × {runsPerPrompt} runs × 2 calls). Please keep this window open.
              </div>
            </div>
          ) : (
            <>
              {/* Cost & API Call Confirmation Box */}
              <div className="bg-[#111827] dark:bg-[#1E1B4B] text-white p-4 font-mono text-xs shadow-xs border border-[#111827] dark:border-[#3730A3]">
                <div className="flex items-center justify-between text-slate-300 border-b border-white/20 pb-2 mb-2">
                  <span className="flex items-center gap-1.5 font-sans font-bold text-white text-xs uppercase tracking-wider">
                    <Calculator className="w-4 h-4 text-white" /> Exact API Call Budget
                  </span>
                  <span className="text-[10px] bg-white/20 text-white font-bold uppercase tracking-wider px-2 py-0.5">
                    Two-Call Model
                  </span>
                </div>
                <div className="text-center py-2">
                  <div className="text-3xl font-bold text-white">
                    {totalApiCalls} <span className="text-xs font-normal text-slate-400">Total API Calls</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    {promptCount} prompts × {runsPerPrompt} runs per prompt × {enginesCount} engine × 2 calls = {totalApiCalls} requests
                  </div>
                </div>
                <div className="border-t border-white/20 pt-2 text-[10px] text-slate-400 flex items-center justify-between">
                  <span>{engine === 'perplexity-sonar' ? 'Call 1: Perplexity Sonar Grounded' : 'Call 1: Gemini Grounded with Google Search'}</span>
                  <span>Call 2: Gemini JSON Extraction</span>
                </div>
              </div>

              {/* Configuration Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Runs Per Prompt N (1 to 5) */}
                <div className="border border-[#E5E7EB] dark:border-[#1E293B] p-3.5 bg-[#F9FAFB] dark:bg-[#1E293B]/50">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
                    Sample Size (Runs per Prompt N)
                  </label>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mb-2">
                    Default N = 3. Higher N reduces non-deterministic variance.
                  </p>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRunsPerPrompt(n)}
                        className={`flex-1 py-1.5 rounded text-xs font-mono font-bold uppercase tracking-wider transition-colors border ${
                          runsPerPrompt === n
                            ? 'bg-[#111827] dark:bg-[#4338CA] text-white border-[#111827] dark:border-[#4338CA] shadow-xs'
                            : 'bg-white dark:bg-[#0F172A] border-[#D1D5DB] dark:border-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B]'
                        }`}
                      >
                        N={n}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Engine Selector */}
                <div className="border border-[#E5E7EB] dark:border-[#1E293B] p-3.5 bg-[#F9FAFB] dark:bg-[#1E293B]/50">
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] mb-1">
                    Visibility Engine
                  </label>
                  <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mb-2">
                    Engines are measured independently, never averaged.
                  </p>
                  <div className="space-y-1.5">
                    <button
                      type="button"
                      onClick={() => setEngine('gemini-grounded')}
                      className={`w-full py-1.5 px-2.5 rounded text-xs flex items-center justify-between transition-colors border ${
                        engine === 'gemini-grounded'
                          ? 'bg-[#111827] dark:bg-[#4338CA] text-white border-[#111827] dark:border-[#4338CA] font-bold uppercase tracking-wider'
                          : 'bg-white dark:bg-[#0F172A] border-[#D1D5DB] dark:border-[#334155] text-[#374151] dark:text-[#CBD5E1]'
                      }`}
                    >
                      <span>Gemini Grounded</span>
                      <span className="text-[10px] opacity-80">Active</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEngine('perplexity-sonar')}
                      disabled={!isPerplexityConfigured}
                      className={`w-full py-1.5 px-2.5 rounded text-xs flex items-center justify-between transition-colors border ${
                        engine === 'perplexity-sonar'
                          ? 'bg-[#111827] dark:bg-[#4338CA] text-white border-[#111827] dark:border-[#4338CA] font-bold uppercase tracking-wider'
                          : isPerplexityConfigured
                          ? 'bg-white dark:bg-[#0F172A] border-[#D1D5DB] dark:border-[#334155] text-[#374151] dark:text-[#CBD5E1] hover:bg-[#F9FAFB]'
                          : 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#9CA3AF] dark:text-[#64748B] border-[#E5E7EB] dark:border-[#334155] cursor-not-allowed uppercase tracking-wider'
                      }`}
                      title={isPerplexityConfigured ? 'Select Perplexity Sonar Engine' : 'Configure Perplexity API key in Settings to enable'}
                    >
                      <span>Perplexity Sonar</span>
                      <span className="text-[10px] opacity-80">
                        {isPerplexityConfigured ? (engine === 'perplexity-sonar' ? 'Active' : 'Ready') : 'Key Required in Settings'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Prompts Selection List */}
              <div className="border border-[#E5E7EB] dark:border-[#1E293B] p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1]">
                    Select Tracked Prompts ({selectedPromptIds.length}/{activePrompts.length} selected)
                  </label>
                  <button
                    type="button"
                    onClick={selectAll}
                    className="text-[11px] font-bold uppercase tracking-wider text-[#111827] dark:text-[#818CF8] hover:underline"
                  >
                    {selectedPromptIds.length === activePrompts.length ? 'Deselect All' : 'Select All Active'}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto space-y-1.5 divide-y divide-[#F3F4F6] dark:divide-[#1E293B] pr-1">
                  {activePrompts.map((p) => {
                    const isSelected = selectedPromptIds.includes(p.id);
                    return (
                      <div
                        key={p.id}
                        onClick={() => togglePrompt(p.id)}
                        className={`pt-1.5 flex items-start gap-2.5 cursor-pointer p-1 rounded hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B] transition-colors ${
                          isSelected ? 'text-[#111827] dark:text-[#F8FAFC] font-semibold' : 'text-[#6B7280] dark:text-[#94A3B8]'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 rounded border-[#D1D5DB] dark:border-[#334155] text-[#111827] dark:text-[#4338CA] focus:ring-[#111827]"
                        />
                        <div className="flex-1 text-xs">
                          <div>{p.text}</div>
                          <div className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] font-mono">{p.category} • {p.intentLayer}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!isExecuting && (
          <div className="px-6 py-3 border-t border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex items-center justify-between">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 border border-[#D1D5DB] dark:border-[#334155] hover:bg-[#F3F4F6] dark:hover:bg-[#0F172A] rounded text-xs font-bold uppercase tracking-wider text-[#374151] dark:text-[#CBD5E1] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selectedPromptIds.length === 0) return;
                onConfirm({
                  promptIds: selectedPromptIds,
                  runsPerPrompt,
                  engine,
                });
              }}
              disabled={selectedPromptIds.length === 0}
              className="px-5 py-1.5 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] disabled:bg-[#D1D5DB] dark:disabled:bg-[#334155] text-white rounded text-xs font-bold uppercase tracking-wider shadow-xs transition-colors inline-flex items-center gap-2"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Execute Run Cycle ({totalApiCalls} Calls)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
