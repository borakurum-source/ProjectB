import { Client, PromptAggregate, CycleAggregate, ActionItem, Diagnostic } from '../types';
import { X, Printer, Download, CheckCircle2, AlertTriangle, ArrowUpRight, BarChart3 } from 'lucide-react';

interface ReportModalProps {
  client: Client;
  cycleAggregate: CycleAggregate | null;
  promptAggregates: PromptAggregate[];
  actions: ActionItem[];
  diagnostics: Diagnostic[];
  onClose: () => void;
}

export function ReportModal({
  client,
  cycleAggregate,
  promptAggregates,
  actions,
  diagnostics,
  onClose,
}: ReportModalProps) {
  const handlePrint = () => {
    window.print();
  };

  const mentionRate = cycleAggregate ? Math.round(cycleAggregate.overallMentionRate * 100) : 0;
  const citationRate = cycleAggregate ? Math.round(cycleAggregate.overallCitationRate * 100) : 0;
  const totalRuns = cycleAggregate?.totalRuns || 0;
  const promptsCount = promptAggregates.length;

  return (
    <div className="fixed inset-0 z-50 bg-[#111827]/80 backdrop-blur-xs flex items-center justify-center p-4 print:p-0 print:bg-white print:static print:inset-auto">
      <div className="bg-white border border-[#E5E7EB] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden shadow-2xl print:max-h-none print:h-auto print:border-none print:shadow-none">
        {/* Modal Toolbar (hidden in print) */}
        <div className="px-6 py-3 border-b border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-[#111827] text-white">
              Executive Report
            </span>
            <span className="text-xs text-[#6B7280]">Print-Ready B2B AI Visibility Briefing</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 bg-[#111827] hover:bg-black text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print / Save PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-[#9CA3AF] hover:text-[#111827] transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Document Body */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 print:p-0 print:overflow-visible text-[#111827]">
          {/* Header */}
          <div className="border-b border-[#111827] pb-6 flex items-start justify-between">
            <div>
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#6B7280] mb-1">
                RAG SIGNAL • AEO & GEO VISIBILITY AUDIT
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-[#111827]">
                AI Answer Visibility & Citation Analysis
              </h1>
              <div className="text-sm text-[#4B5563] mt-1 font-mono">
                Client: <strong>{client.brandName}</strong> ({client.domain}) • Industry: {client.industry}
              </div>
            </div>
            <div className="text-right text-xs font-mono text-[#6B7280]">
              <div>Report Date: {new Date().toLocaleDateString()}</div>
              <div>Engine: Gemini Grounded (Google Search)</div>
              <div>Sample Size: n={totalRuns} total runs</div>
            </div>
          </div>

          {/* Section 1: Executive KPI Scorecard */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
              1. Grounded Run Cycle Performance
            </h2>
            <div className="grid grid-cols-4 gap-4">
              <div className="p-4 border border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="text-[10px] font-bold uppercase text-[#6B7280]">Mention Rate</div>
                <div className="text-2xl font-bold text-[#111827] mt-1 font-mono">{mentionRate}%</div>
                <div className="text-[10px] text-[#6B7280] mt-0.5">Sample: n={totalRuns} runs</div>
              </div>

              <div className="p-4 border border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="text-[10px] font-bold uppercase text-[#6B7280]">Citation Rate</div>
                <div className="text-2xl font-bold text-[#111827] mt-1 font-mono">{citationRate}%</div>
                <div className="text-[10px] text-[#6B7280] mt-0.5">Domain in grounding chunks</div>
              </div>

              <div className="p-4 border border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="text-[10px] font-bold uppercase text-[#6B7280]">Active Prompts</div>
                <div className="text-2xl font-bold text-[#111827] mt-1 font-mono">{promptsCount}</div>
                <div className="text-[10px] text-[#6B7280] mt-0.5">Commercial & Evaluative</div>
              </div>

              <div className="p-4 border border-[#E5E7EB] bg-[#F9FAFB]">
                <div className="text-[10px] font-bold uppercase text-[#6B7280]">Volatile Queries</div>
                <div className="text-2xl font-bold text-[#D97706] mt-1 font-mono">
                  {cycleAggregate?.volatilityCount ?? 0}
                </div>
                <div className="text-[10px] text-[#6B7280] mt-0.5">Non-deterministic (0 &lt; rate &lt; 1)</div>
              </div>
            </div>
          </div>

          {/* Section 2: Prompt Presence Breakdown */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
              2. Tracked Queries Presence & Competitor Dispersion
            </h2>
            <div className="border border-[#E5E7EB] overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  <tr>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-[#6B7280]">Tracked Query</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-[#6B7280]">Intent</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-[#6B7280] text-center">
                      Mention Rate
                    </th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-[#6B7280] text-center">
                      Citation Rate
                    </th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-[#6B7280]">Rank</th>
                    <th className="py-2.5 px-3 font-bold uppercase text-[10px] text-[#6B7280]">Leading Competitors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {promptAggregates.map((pa) => {
                    const topComps = Object.entries(pa.competitorMentionRates)
                      .filter(([_, data]) => data.rate > 0)
                      .map(([comp, data]) => `${comp} (${Math.round(data.rate * 100)}%)`)
                      .join(', ');

                    return (
                      <tr key={pa.promptId} className="hover:bg-[#F9FAFB]">
                        <td className="py-2.5 px-3 font-medium text-[#111827] max-w-xs truncate">{pa.promptText}</td>
                        <td className="py-2.5 px-3 font-mono text-[10px] text-[#6B7280]">{pa.intentLayer}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-center">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[11px] ${
                              pa.mentionRate >= 0.66
                                ? 'bg-[#ECFDF5] text-[#065F46]'
                                : pa.mentionRate > 0
                                ? 'bg-[#FEF3C7] text-[#D97706]'
                                : 'bg-[#FEF2F2] text-[#991B1B]'
                            }`}
                          >
                            {Math.round(pa.mentionRate * 100)}% (n={pa.runsCount})
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-center">
                          {Math.round(pa.citationRate * 100)}%
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[#6B7280]">
                          {pa.avgPosition ? `#${pa.avgPosition}` : 'prose'}
                        </td>
                        <td className="py-2.5 px-3 text-[#4B5563] text-[11px]">
                          {topComps || <span className="text-[#9CA3AF] italic">None detected</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 3: High Priority Implementation Actions */}
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#6B7280] mb-3">
              3. Recommended GEO / AEO Implementations (Max 5 High-Impact Actions)
            </h2>
            <div className="space-y-3">
              {actions.slice(0, 5).map((action, idx) => (
                <div key={action.id} className="border border-[#E5E7EB] p-4 bg-[#F9FAFB]">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-[#6B7280]">#{idx + 1}</span>
                        <h3 className="text-xs font-bold text-[#111827]">{action.title}</h3>
                        <span className="px-1.5 py-0.2 bg-[#111827] text-white text-[9px] font-bold uppercase font-mono">
                          {action.priority} Priority
                        </span>
                      </div>
                      <p className="text-xs text-[#4B5563] mt-1">{action.why}</p>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 bg-white border border-[#E5E7EB] text-xs font-mono text-[#111827]">
                    <div className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider mb-1">
                      Exact Recommendation:
                    </div>
                    {action.exactRecommendation}
                  </div>

                  <div className="mt-2 text-[11px] text-[#6B7280] flex items-center justify-between font-mono">
                    <span>Validation: {action.validation}</span>
                    <span>Status: {action.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#E5E7EB] pt-4 text-[10px] text-[#9CA3AF] font-mono flex items-center justify-between">
            <span>RAG Signal Methodology: Deterministic Multi-Run Evaluation</span>
            <span>https://{client.domain} • Confidential Client Briefing</span>
          </div>
        </div>
      </div>
    </div>
  );
}
