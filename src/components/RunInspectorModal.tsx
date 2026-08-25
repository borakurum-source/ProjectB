import { useState } from 'react';
import { Prompt, Run, Client, GroundingSource } from '../types';
import {
  X,
  ExternalLink,
  Globe,
  Search,
  CheckCircle2,
  XCircle,
  Layers,
  Code2,
  Copy,
  Check,
  Filter,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';

interface RunInspectorModalProps {
  prompt: Prompt;
  runs: Run[];
  client: Client;
  onClose: () => void;
  onDiagnose?: (prompt: Prompt) => void;
}

export function RunInspectorModal({
  prompt,
  runs,
  client,
  onClose,
  onDiagnose,
}: RunInspectorModalProps) {
  const [selectedRunIdx, setSelectedRunIdx] = useState(0);
  const [sourceSearchTerm, setSourceSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'formatted' | 'raw_json'>('formatted');
  const [copiedJson, setCopiedJson] = useState(false);

  const promptRuns = runs.filter((r) => r.promptId === prompt.id);
  const activeRun = promptRuns[selectedRunIdx] || promptRuns[0];

  // Helper to categorize domain
  const getDomainType = (sourceDomain: string | null, displayTitle: string) => {
    const sDomain = (sourceDomain || '').toLowerCase();
    const sTitle = displayTitle.toLowerCase();
    const cDomain = client.domain.toLowerCase();

    if (sDomain.includes(cDomain) || cDomain.includes(sDomain) || sTitle.includes(client.brandName.toLowerCase())) {
      return { type: 'client', label: 'Client Domain', color: 'bg-[#111827] dark:bg-[#6366F1] text-white border-[#111827] dark:border-[#6366F1]' };
    }

    for (const comp of client.competitorBrands) {
      if (sTitle.includes(comp.toLowerCase()) || sDomain.includes(comp.toLowerCase())) {
        return { type: 'competitor', label: `Competitor (${comp})`, color: 'bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border-[#FDE68A] dark:border-[#78350F]' };
      }
    }

    for (const compDomain of client.competitorDomains) {
      if (sDomain.includes(compDomain.toLowerCase()) || compDomain.toLowerCase().includes(sDomain)) {
        return { type: 'competitor', label: 'Competitor Domain', color: 'bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border-[#FDE68A] dark:border-[#78350F]' };
      }
    }

    return { type: 'third-party', label: 'External Source', color: 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#CBD5E1] border-[#E5E7EB] dark:border-[#334155]' };
  };

  // Combine groundingSources with any raw groundingChunks
  const sourcesList: GroundingSource[] = (activeRun?.groundingSources && activeRun.groundingSources.length > 0)
    ? activeRun.groundingSources
    : (activeRun?.groundingChunks || []).map((chunk: any) => ({
        displayTitle: chunk.web?.title || chunk.web?.uri || 'Unresolved Source',
        uri: chunk.web?.uri,
        redirectUri: chunk.web?.uri,
        resolvedDomain: chunk.web?.title || null,
      }));

  const filteredSources = sourcesList.filter((s) => {
    if (!sourceSearchTerm.trim()) return true;
    const term = sourceSearchTerm.toLowerCase();
    return (
      s.displayTitle.toLowerCase().includes(term) ||
      (s.resolvedDomain && s.resolvedDomain.toLowerCase().includes(term)) ||
      (s.uri && s.uri.toLowerCase().includes(term))
    );
  });

  const handleCopyJson = () => {
    if (!activeRun) return;
    const rawPayload = {
      runId: activeRun.id,
      prompt: prompt.text,
      engine: activeRun.engine,
      model: activeRun.model,
      webSearchQueries: activeRun.webSearchQueries || [],
      groundingSources: activeRun.groundingSources || [],
      groundingChunks: activeRun.groundingChunks || [],
      answerText: activeRun.answerText,
      brandMentioned: activeRun.brandMentioned,
      brandCited: activeRun.brandCited,
      position: activeRun.position,
      prominence: activeRun.prominence,
      mentionedBrands: activeRun.mentionedBrands,
    };
    navigator.clipboard.writeText(JSON.stringify(rawPayload, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/70 dark:bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#111827] dark:bg-[#6366F1] text-white">
                Run Inspector & Source Verifier
              </span>
              <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono">
                {promptRuns.length} runs executed ({promptRuns[0]?.engine === 'gemini-grounded' ? 'Gemini Grounded' : promptRuns[0]?.engine || 'Gemini Grounded'})
              </span>
            </div>
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#F8FAFC]">{prompt.text}</h2>
            <div className="flex items-center gap-3 text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
              <span>Category: {prompt.category}</span>
              <span>•</span>
              <span>Intent: {prompt.intentLayer}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#111827] dark:hover:text-[#F8FAFC] p-1.5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Run Selector Tabs & View Mode Controls */}
        {promptRuns.length > 0 && (
          <div className="px-6 py-2.5 border-b border-[#E5E7EB] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-bold uppercase tracking-wider">Select Run:</span>
              <div className="flex items-center gap-1.5">
                {promptRuns.map((r, idx) => (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRunIdx(idx)}
                    className={`px-3 py-1 text-xs font-mono font-bold uppercase tracking-wider transition-colors flex items-center gap-1.5 border ${
                      selectedRunIdx === idx
                        ? 'bg-[#111827] dark:bg-[#6366F1] text-white border-[#111827] dark:border-[#6366F1] shadow-xs'
                        : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border-[#E5E7EB] dark:border-[#334155] hover:bg-[#F3F4F6] dark:hover:bg-[#334155]'
                    }`}
                  >
                    <span>Run #{r.runIndex}</span>
                    {r.brandMentioned ? (
                      <span className="w-2 h-2 rounded-full bg-[#10B981]" title="Brand Mentioned" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-[#D1D5DB] dark:bg-[#64748B]" title="Brand Missing" />
                    )}
                    {r.brandCited && (
                      <span className="text-[9px] bg-white/20 px-1 py-0.2 rounded text-white" title="Domain Cited">
                        CITED
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Toggle Formatted vs Raw JSON */}
              <div className="inline-flex border border-[#D1D5DB] dark:border-[#334155] p-0.5 bg-[#F9FAFB] dark:bg-[#1E293B]">
                <button
                  onClick={() => setViewMode('formatted')}
                  className={`px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    viewMode === 'formatted'
                      ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] shadow-xs border border-[#E5E7EB] dark:border-[#334155]'
                      : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  Formatted
                </button>
                <button
                  onClick={() => setViewMode('raw_json')}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider transition-colors ${
                    viewMode === 'raw_json'
                      ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] shadow-xs border border-[#E5E7EB] dark:border-[#334155]'
                      : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                  }`}
                >
                  <Code2 className="w-3 h-3" />
                  Raw JSON
                </button>
              </div>

              {onDiagnose && (
                <button
                  onClick={() => {
                    onClose();
                    onDiagnose(prompt);
                  }}
                  className="px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] bg-[#F9FAFB] dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#D1D5DB] dark:border-[#334155] transition-colors shadow-xs"
                >
                  Run 6-D Diagnostic
                </button>
              )}
            </div>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!activeRun ? (
            <div className="text-center text-[#6B7280] dark:text-[#94A3B8] py-12 text-sm">
              No runs recorded yet for this prompt.
            </div>
          ) : viewMode === 'raw_json' ? (
            /* Raw JSON Inspection Mode */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-[#111827] dark:text-[#818CF8]" />
                  <h3 className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] uppercase tracking-wider">
                    Raw Grounding & LLM Execution Payload (Run #{activeRun.runIndex})
                  </h3>
                </div>
                <button
                  onClick={handleCopyJson}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono font-bold bg-[#F9FAFB] dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#D1D5DB] dark:border-[#334155] text-[#111827] dark:text-[#F8FAFC] transition-colors"
                >
                  {copiedJson ? <Check className="w-3.5 h-3.5 text-[#059669] dark:text-[#34D399]" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJson ? 'Copied Payload' : 'Copy JSON'}
                </button>
              </div>
              <pre className="bg-[#111827] dark:bg-[#020617] text-white dark:text-[#F1F5F9] p-4 font-mono text-xs leading-relaxed overflow-x-auto max-h-[60vh] border border-[#111827] dark:border-[#1E293B] select-text">
                {JSON.stringify(
                  {
                    runId: activeRun.id,
                    promptId: activeRun.promptId,
                    promptText: prompt.text,
                    engine: activeRun.engine,
                    model: activeRun.model,
                    runAt: activeRun.runAt,
                    webSearchQueries: activeRun.webSearchQueries || [],
                    groundingSources: activeRun.groundingSources || [],
                    groundingChunks: activeRun.groundingChunks || [],
                    brandMentioned: activeRun.brandMentioned,
                    brandCited: activeRun.brandCited,
                    position: activeRun.position,
                    prominence: activeRun.prominence,
                    mentionedBrands: activeRun.mentionedBrands || [],
                    answerText: activeRun.answerText,
                    error: activeRun.error,
                  },
                  null,
                  2
                )}
              </pre>
            </div>
          ) : (
            <>
              {/* Top Summary Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Brand Mentioned</div>
                  <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
                    {activeRun.brandMentioned ? (
                      <span className="text-[#065F46] dark:text-[#34D399] flex items-center gap-1">
                        <CheckCircle2 className="w-4 h-4 text-[#059669] dark:text-[#34D399]" /> Mentioned in Text
                      </span>
                    ) : (
                      <span className="text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-1">
                        <XCircle className="w-4 h-4 text-[#9CA3AF] dark:text-[#64748B]" /> Not Mentioned
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Domain Cited</div>
                  <div className="mt-1 flex items-center gap-1.5 font-bold text-xs">
                    {activeRun.brandCited ? (
                      <span className="text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-4 h-4 text-[#111827] dark:text-[#818CF8]" /> {client.domain} Cited
                      </span>
                    ) : (
                      <span className="text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-1">
                        <XCircle className="w-4 h-4 text-[#9CA3AF] dark:text-[#64748B]" /> Domain Not Cited
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Rank Position</div>
                  <div className="mt-1 font-mono font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">
                    {activeRun.position !== null ? `#${activeRun.position} (Ordered)` : 'null (Prose)'}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] dark:text-[#64748B]">Deterministic integer rule</div>
                </div>

                <div className="bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-3.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] flex items-center gap-1">
                    <span>Prominence</span>
                    <span className="text-[9px] bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] px-1 font-bold">Exp.</span>
                  </div>
                  <div className="mt-1 font-mono font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">
                    {activeRun.prominence !== null ? `${Math.round(activeRun.prominence * 100)}%` : 'N/A'}
                  </div>
                  <div className="text-[10px] text-[#9CA3AF] dark:text-[#64748B]">offset / answerLength</div>
                </div>
              </div>

              {/* Call 1: Grounded Answer Text */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#111827] dark:bg-[#6366F1]" />
                    <h3 className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] uppercase tracking-wider">
                      Call 1 — Verbatim Grounded Answer Text (Model: {activeRun.model || 'gemini-3.6-flash'})
                    </h3>
                  </div>
                  <span className="text-xs text-[#9CA3AF] dark:text-[#64748B] font-mono">
                    {new Date(activeRun.runAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="bg-[#111827] dark:bg-[#020617] text-white dark:text-[#F1F5F9] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap select-text border border-[#111827] dark:border-[#1E293B]">
                  {activeRun.answerText || activeRun.error || 'No text output.'}
                </div>
              </div>

              {/* Grounding Search Queries (Engine Triggered Queries) */}
              <div className="bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-4">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-[#E5E7EB] dark:border-[#334155]">
                  <div className="flex items-center gap-2">
                    <Search className="w-4 h-4 text-[#111827] dark:text-[#818CF8]" />
                    <h3 className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] uppercase tracking-wider">
                      Web Search Queries Triggered by Engine ({activeRun.webSearchQueries?.length || 0})
                    </h3>
                  </div>
                  <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] font-mono">
                    Autonomous search queries dispatched during grounding
                  </span>
                </div>

                {activeRun.webSearchQueries && activeRun.webSearchQueries.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeRun.webSearchQueries.map((query, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-2 bg-white dark:bg-[#0F172A] p-2.5 border border-[#E5E7EB] dark:border-[#334155] hover:border-[#D1D5DB] transition-colors"
                      >
                        <span className="font-mono text-[#6B7280] dark:text-[#94A3B8] text-[10px] font-bold bg-[#F3F4F6] dark:bg-[#1E293B] px-1.5 py-0.5 border border-[#E5E7EB] dark:border-[#334155] shrink-0">
                          #{i + 1}
                        </span>
                        <span className="font-medium text-xs text-[#111827] dark:text-[#F8FAFC] break-words">{query}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-xs text-[#9CA3AF] dark:text-[#64748B] italic p-3 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155]">
                    No search queries recorded for this run.
                  </div>
                )}
              </div>

              {/* Grounding Sources & Chunks Verification */}
              <div className="bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 pb-2 border-b border-[#E5E7EB] dark:border-[#334155]">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-[#111827] dark:text-[#818CF8]" />
                    <div>
                      <h3 className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] uppercase tracking-wider">
                        Grounding Sources & Chunk Verification ({sourcesList.length} sources)
                      </h3>
                      <p className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
                        Specific pages & publisher domains cited in the LLM's grounding response
                      </p>
                    </div>
                  </div>

                  {/* Filter source list */}
                  {sourcesList.length > 3 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-2.5 top-2" />
                      <input
                        type="text"
                        placeholder="Filter sources or domains..."
                        value={sourceSearchTerm}
                        onChange={(e) => setSourceSearchTerm(e.target.value)}
                        className="text-xs pl-8 pr-3 py-1 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] rounded w-56 text-[#111827] dark:text-[#F8FAFC] placeholder-[#9CA3AF]"
                      />
                    </div>
                  )}
                </div>

                {filteredSources.length > 0 ? (
                  <div className="space-y-2.5">
                    {filteredSources.map((source, i) => {
                      const domainMeta = getDomainType(source.resolvedDomain, source.displayTitle);
                      return (
                        <div
                          key={i}
                          className="bg-white dark:bg-[#0F172A] p-3 border border-[#E5E7EB] dark:border-[#334155] hover:border-[#CBD5E1] transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-bold bg-[#F3F4F6] dark:bg-[#1E293B] px-1.5 py-0.5 border border-[#E5E7EB] dark:border-[#334155]">
                                  Chunk #{i + 1}
                                </span>
                                <span
                                  className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 border ${domainMeta.color}`}
                                >
                                  {domainMeta.label}
                                </span>
                                <h4 className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">{source.displayTitle}</h4>
                              </div>

                              <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] font-mono flex items-center gap-2">
                                <span>Resolved Domain: <strong>{source.resolvedDomain || 'Unresolved source'}</strong></span>
                              </div>

                              {source.uri && (
                                <div className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] font-mono truncate max-w-2xl mt-0.5 flex items-center gap-1">
                                  <span>Vertex Search URI:</span>
                                  <span className="text-[#6B7280] dark:text-[#94A3B8] truncate">{source.uri}</span>
                                </div>
                              )}
                            </div>

                            {source.uri && (
                              <a
                                href={source.uri}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 px-2 py-1 bg-[#F9FAFB] dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] text-[#111827] dark:text-[#F8FAFC] border border-[#D1D5DB] dark:border-[#334155] text-[11px] font-semibold transition-colors shrink-0 ml-2 shadow-xs"
                                title="Open Vertex AI search redirect link"
                              >
                                <span>Open Source</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-xs text-[#9CA3AF] dark:text-[#64748B] italic p-4 bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155] text-center">
                    {sourceSearchTerm ? 'No sources match your filter.' : 'No grounding chunks retrieved.'}
                  </div>
                )}
              </div>

              {/* Call 2: Structured Semantic Extraction Details */}
              <div className="bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#111827] dark:text-[#818CF8]" />
                    <h3 className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] uppercase tracking-wider">
                      Call 2 — Structured Semantic Extraction
                    </h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#6B7280] dark:text-[#94A3B8]">
                    <span>Format: <strong className="text-[#111827] dark:text-[#F8FAFC] font-mono">{activeRun.answerFormat}</strong></span>
                    <span>•</span>
                    <span>Ordered List: <strong className="text-[#111827] dark:text-[#F8FAFC] font-mono">{activeRun.orderedList ? 'true' : 'false'}</strong></span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#334155]">
                    <thead>
                      <tr className="bg-[#F9FAFB] dark:bg-[#1E293B] border-b border-[#E5E7EB] dark:border-[#334155]">
                        <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Brand Name</th>
                        <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Type</th>
                        <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Sentiment</th>
                        <th className="py-2 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">Verbatim Quote / Context</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#334155]">
                      {activeRun.mentionedBrands && activeRun.mentionedBrands.length > 0 ? (
                        activeRun.mentionedBrands.map((m, idx) => (
                          <tr key={idx} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B]/60">
                            <td className="py-2 px-3 font-semibold text-[#111827] dark:text-[#F8FAFC]">{m.name}</td>
                            <td className="py-2 px-3">
                              {m.isClient ? (
                                <span className="bg-[#111827] dark:bg-[#6366F1] text-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  Client
                                </span>
                              ) : m.isKnownCompetitor ? (
                                <span className="bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#78350F] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  Competitor
                                </span>
                              ) : (
                                <span className="bg-[#F3F4F6] dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#334155] px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                                  Detected Brand
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider border ${
                                  m.sentiment === 'Positive' || m.sentiment === 'positive'
                                    ? 'bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border-[#A7F3D0] dark:border-[#065F46]'
                                    : m.sentiment === 'Negative' || m.sentiment === 'negative'
                                    ? 'bg-[#FEF2F2] dark:bg-[#7F1D1D] text-[#DC2626] dark:text-[#FCA5A5] border-[#FECACA] dark:border-[#991B1B]'
                                    : 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border-[#E5E7EB] dark:border-[#334155]'
                                }`}
                              >
                                {m.sentiment}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[#4B5563] dark:text-[#CBD5E1] italic">
                              "{m.verbatimQuote}"
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-3 text-center text-[#9CA3AF] dark:text-[#64748B]">
                            No brand entities extracted from text.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B] flex items-center justify-between">
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono">
            RAG Signal Deterministic Grounding Verifier • Port 3000
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#111827] dark:bg-[#6366F1] hover:bg-black dark:hover:bg-[#4F46E5] text-white rounded text-xs font-bold uppercase tracking-wider transition-colors shadow-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}

