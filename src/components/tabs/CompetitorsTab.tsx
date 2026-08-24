import { useState } from 'react';
import { Client, PromptAggregate, CycleAggregate, Prompt } from '../../types';
import { CompetitorHeatmap } from '../charts/CompetitorHeatmap';
import { Sparkles } from 'lucide-react';

interface CompetitorsTabProps {
  client: Client;
  promptAggregates: PromptAggregate[];
  latestCycle: CycleAggregate | null;
  prompts: Prompt[];
  onDiagnosePrompt: (prompt: Prompt) => void;
  onInspectPrompt: (promptId: string) => void;
}

export function CompetitorsTab({
  client,
  promptAggregates,
  latestCycle,
  prompts,
  onDiagnosePrompt,
  onInspectPrompt,
}: CompetitorsTabProps) {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>(
    client.competitorBrands[0] || ''
  );

  // Compute stats for all competitors
  const competitorStats = client.competitorBrands.map((brand, idx) => {
    const domain = client.competitorDomains[idx] || '';
    const sov = latestCycle?.shareOfVoice[brand]?.share ?? 0;
    const mentions = latestCycle?.shareOfVoice[brand]?.mentionCount ?? 0;

    // Total prompt count where this competitor is mentioned in >= 50% runs
    const dominantPromptsCount = promptAggregates.filter(
      (pa) => (pa.competitorMentionRates[brand]?.rate ?? 0) >= 0.5
    ).length;

    return {
      brand,
      domain,
      sov,
      mentions,
      dominantPromptsCount,
    };
  });

  // Identify direct gap prompts: where selected competitor has mentionRate >= 0.5, but client is 0%
  const directGapPrompts = promptAggregates.filter((pa) => {
    const compRate = pa.competitorMentionRates[selectedCompetitor]?.rate ?? 0;
    return compRate >= 0.5 && pa.mentionRate === 0;
  });

  return (
    <div className="space-y-6">
      {/* Competitor Profile Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {competitorStats.map((comp) => {
          const isSelected = selectedCompetitor === comp.brand;
          return (
            <div
              key={comp.brand}
              onClick={() => setSelectedCompetitor(comp.brand)}
              className={`p-4 border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-[#111827] text-white border-[#111827] shadow-sm'
                  : 'bg-white border-[#E5E7EB] hover:border-[#111827] shadow-xs'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`font-bold text-xs uppercase tracking-wider ${isSelected ? 'text-white' : 'text-[#111827]'}`}>
                  {comp.brand}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 font-mono ${isSelected ? 'bg-white/20 text-white' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                  {comp.domain}
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className={`text-2xl font-bold font-mono ${isSelected ? 'text-white' : 'text-[#111827]'}`}>
                  {Math.round(comp.sov * 100)}%
                </span>
                <span className={`text-[11px] uppercase tracking-wider ${isSelected ? 'text-slate-300' : 'text-[#6B7280]'}`}>
                  Share of Voice
                </span>
              </div>
              <div className={`mt-2 text-[11px] border-t pt-2 ${isSelected ? 'border-white/20 text-slate-300' : 'border-[#F3F4F6] text-[#6B7280]'}`}>
                {comp.mentions} mentions • Dominates {comp.dominantPromptsCount} prompts
              </div>
            </div>
          );
        })}
      </div>

      {/* Deep-Dive Gap Matrix for Selected Competitor */}
      <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F3F4F6]">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
                Direct Visibility Gap Matrix vs {selectedCompetitor}
              </h3>
              <span className="text-[10px] bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] px-2 py-0.5 font-bold uppercase tracking-wider">
                {directGapPrompts.length} Immediate Gaps Identified
              </span>
            </div>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Prompts where <strong>{selectedCompetitor}</strong> is actively cited and mentioned (≥50% runs), but <strong>{client.brandName}</strong> has 0% mention rate.
            </p>
          </div>
        </div>

        {directGapPrompts.length === 0 ? (
          <div className="p-8 text-center bg-[#F9FAFB] border border-[#E5E7EB]">
            <div className="text-xs font-bold text-[#111827]">
              No critical 0% vs ≥50% gaps detected against {selectedCompetitor}.
            </div>
            <div className="text-xs text-[#6B7280] mt-1">
              Client brand has baseline visibility across the competitor's dominant prompts.
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] min-w-[280px]">
                    Gap Query
                  </th>
                  <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">
                    Intent
                  </th>
                  <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-center">
                    Sample (n)
                  </th>
                  <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-center">
                    {client.brandName} (Client)
                  </th>
                  <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-center">
                    {selectedCompetitor}
                  </th>
                  <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {directGapPrompts.map((pa) => {
                  const promptObj = prompts.find((p) => p.id === pa.promptId);
                  const compData = pa.competitorMentionRates[selectedCompetitor] || { rate: 0, count: 0 };

                  return (
                    <tr key={pa.promptId} className="hover:bg-[#F9FAFB]">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#111827]">{pa.promptText}</div>
                        <div className="text-[10px] text-[#9CA3AF] font-mono mt-0.5">{pa.category}</div>
                      </td>
                      <td className="py-2.5 px-2 text-[#6B7280]">{pa.intentLayer}</td>
                      <td className="py-2.5 px-2 text-center font-mono text-[#6B7280]">n={pa.runsCount}</td>

                      {/* Client Rate */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#FEF2F2] text-[#DC2626] border border-[#FECACA]">
                          0% (0/{pa.runsCount})
                        </span>
                      </td>

                      {/* Competitor Rate */}
                      <td className="py-2.5 px-3 text-center">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">
                          {Math.round(compData.rate * 100)}% ({compData.count}/{pa.runsCount})
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => onInspectPrompt(pa.promptId)}
                          className="px-2.5 py-1 bg-white hover:bg-[#F3F4F6] text-[#111827] border border-[#D1D5DB] text-[10px] font-bold uppercase tracking-wider transition-colors shadow-xs"
                        >
                          Inspect Runs
                        </button>
                        {promptObj && (
                          <button
                            onClick={() => onDiagnosePrompt(promptObj)}
                            className="px-2.5 py-1 bg-[#111827] hover:bg-black text-white text-[10px] font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1 shadow-xs"
                          >
                            <Sparkles className="w-3 h-3" /> Diagnose Gap
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Competitor Correlation Matrix & SOV Heatmap */}
      <CompetitorHeatmap
        promptAggregates={promptAggregates}
        client={client}
        onInspectPrompt={onInspectPrompt}
      />
    </div>
  );
}
