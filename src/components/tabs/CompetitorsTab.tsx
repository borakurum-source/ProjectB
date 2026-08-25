import { useState, useMemo } from 'react';
import { Client, PromptAggregate, CycleAggregate, Prompt, Run } from '../../types';
import { CompetitorHeatmap } from '../charts/CompetitorHeatmap';
import { CitationDensityHeatmap } from '../charts/CitationDensityHeatmap';
import { Sparkles, Smile, Meh, Frown } from 'lucide-react';

interface CompetitorsTabProps {
  client: Client;
  promptAggregates: PromptAggregate[];
  latestCycle: CycleAggregate | null;
  prompts: Prompt[];
  runs?: Run[];
  onDiagnosePrompt: (prompt: Prompt) => void;
  onInspectPrompt: (promptId: string) => void;
}

export function CompetitorsTab({
  client,
  promptAggregates,
  latestCycle,
  prompts,
  runs = [],
  onDiagnosePrompt,
  onInspectPrompt,
}: CompetitorsTabProps) {
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>(
    client.competitorBrands[0] || ''
  );
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'ECOMMERCE' | 'NO ECOMMERCE'>('ALL');

  // Map category for each competitor
  const getCategory = (brand: string, domain: string): 'ECOMMERCE' | 'NO ECOMMERCE' => {
    const found = client.categorizedCompetitors?.find(
      (c) => c.brand.toLowerCase() === brand.toLowerCase() || c.domain.toLowerCase() === domain.toLowerCase()
    );
    if (found) return found.category;
    // Default heuristic fallback if missing
    return 'ECOMMERCE';
  };

  // Compute sentiment distribution per brand
  const sentimentStats = useMemo(() => {
    const stats: Record<string, { positive: number; neutral: number; negative: number; total: number }> = {};
    
    const allBrands = [client.brandName, ...client.competitorBrands];
    allBrands.forEach((b) => {
      stats[b] = { positive: 0, neutral: 0, negative: 0, total: 0 };
    });

    runs.forEach((r) => {
      r.mentionedBrands?.forEach((mb) => {
        const brandName = mb.name;
        const matched = allBrands.find((b) => b.toLowerCase() === brandName.toLowerCase()) || brandName;
        if (!stats[matched]) {
          stats[matched] = { positive: 0, neutral: 0, negative: 0, total: 0 };
        }
        stats[matched].total += 1;
        const s = mb.sentiment?.toLowerCase();
        if (s === 'positive') stats[matched].positive += 1;
        else if (s === 'negative') stats[matched].negative += 1;
        else stats[matched].neutral += 1;
      });
    });

    return stats;
  }, [client, runs]);

  // Compute stats for all competitors
  const allCompetitorStats = useMemo(() => {
    return client.competitorBrands.map((brand, idx) => {
      const domain = client.competitorDomains[idx] || '';
      const category = getCategory(brand, domain);
      const sov = latestCycle?.shareOfVoice[brand]?.share ?? 0;
      const mentions = latestCycle?.shareOfVoice[brand]?.mentionCount ?? 0;

      // Total prompt count where this competitor is mentioned in >= 50% runs
      const dominantPromptsCount = promptAggregates.filter(
        (pa) => (pa.competitorMentionRates[brand]?.rate ?? 0) >= 0.5
      ).length;

      return {
        brand,
        domain,
        category,
        sov,
        mentions,
        dominantPromptsCount,
      };
    });
  }, [client, latestCycle, promptAggregates]);

  const filteredCompetitors = useMemo(() => {
    if (categoryFilter === 'ALL') return allCompetitorStats;
    return allCompetitorStats.filter((c) => c.category === categoryFilter);
  }, [allCompetitorStats, categoryFilter]);

  const ecommerceCount = useMemo(
    () => allCompetitorStats.filter((c) => c.category === 'ECOMMERCE').length,
    [allCompetitorStats]
  );
  const noEcommerceCount = useMemo(
    () => allCompetitorStats.filter((c) => c.category === 'NO ECOMMERCE').length,
    [allCompetitorStats]
  );

  // Identify direct gap prompts: where selected competitor has mentionRate >= 0.5, but client is 0%
  const directGapPrompts = promptAggregates.filter((pa) => {
    const compRate = pa.competitorMentionRates[selectedCompetitor]?.rate ?? 0;
    return compRate >= 0.5 && pa.mentionRate === 0;
  });

  return (
    <div className="space-y-6">
      {/* Category Filter Bar */}
      <div className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] p-3 flex flex-wrap items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
            Competitor Segment Filter:
          </span>
          <div className="flex items-center gap-1 bg-[#F3F4F6] dark:bg-[#0F172A] p-0.5 rounded border border-[#E5E7EB] dark:border-[#334155]">
            <button
              onClick={() => setCategoryFilter('ALL')}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                categoryFilter === 'ALL'
                  ? 'bg-[#111827] dark:bg-[#4338CA] text-white shadow-xs'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-white'
              }`}
            >
              All ({allCompetitorStats.length})
            </button>
            <button
              onClick={() => setCategoryFilter('ECOMMERCE')}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                categoryFilter === 'ECOMMERCE'
                  ? 'bg-[#0284C7] text-white shadow-xs'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#0284C7]'
              }`}
            >
              Ecommerce ({ecommerceCount})
            </button>
            <button
              onClick={() => setCategoryFilter('NO ECOMMERCE')}
              className={`px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                categoryFilter === 'NO ECOMMERCE'
                  ? 'bg-[#7C3AED] text-white shadow-xs'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#7C3AED]'
              }`}
            >
              No Ecommerce ({noEcommerceCount})
            </button>
          </div>
        </div>
        <div className="text-[11px] font-mono text-[#6B7280] dark:text-[#94A3B8]">
          Showing {filteredCompetitors.length} of {allCompetitorStats.length} Competitors
        </div>
      </div>

      {/* Competitor Profile Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {filteredCompetitors.map((comp) => {
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
              <div className="flex items-start justify-between gap-1">
                <div>
                  <span className={`font-bold text-xs uppercase tracking-wider block ${isSelected ? 'text-white' : 'text-[#111827]'}`}>
                    {comp.brand}
                  </span>
                  <span className={`text-[10px] inline-block font-mono mt-0.5 px-1 py-0.2 ${isSelected ? 'bg-white/20 text-white' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                    {comp.domain}
                  </span>
                </div>
                <span
                  className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-xs shrink-0 tracking-wider font-mono ${
                    comp.category === 'ECOMMERCE'
                      ? isSelected ? 'bg-[#0284C7] text-white' : 'bg-[#E0F2FE] text-[#0369A1] border border-[#BAE6FD]'
                      : isSelected ? 'bg-[#7C3AED] text-white' : 'bg-[#F3E8FF] text-[#6B21A8] border border-[#E9D5FF]'
                  }`}
                >
                  {comp.category === 'ECOMMERCE' ? 'ECOMMERCE' : 'NO ECOMMERCE'}
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

      {/* Brand Sentiment Analysis */}
      <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
          <div>
            <h3 className="font-bold text-sm text-[#111827] flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#7C3AED]" /> Brand Sentiment & Positioning Breakdown
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Sentiment breakdown of brand mentions in grounded AI answers
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(Object.entries(sentimentStats) as Array<[string, { positive: number; neutral: number; negative: number; total: number }]>)
            .map(([brand, s]) => {
              const isClient = brand.toLowerCase() === client.brandName.toLowerCase();
              const posPct = s.total > 0 ? Math.round((s.positive / s.total) * 100) : 0;
              const neuPct = s.total > 0 ? Math.round((s.neutral / s.total) * 100) : 0;
              const negPct = s.total > 0 ? Math.round((s.negative / s.total) * 100) : 0;

            return (
              <div
                key={brand}
                className={`p-3 border rounded-xs space-y-2 ${
                  isClient ? 'bg-[#ECFDF5]/30 border-[#A7F3D0]' : 'bg-[#F9FAFB] border-[#E5E7EB]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-[#111827]">{brand}</span>
                  {isClient && (
                    <span className="text-[10px] font-bold bg-[#065F46] text-white px-1.5 py-0.2 rounded-xs">CLIENT</span>
                  )}
                </div>

                <div className="text-[11px] text-[#6B7280] flex items-center justify-between font-mono">
                  <span>{s.total} Total Mentions</span>
                  <span className="font-bold text-[#10B981]">{posPct}% Positive</span>
                </div>

                {/* Stacked bar ratio */}
                <div className="w-full h-2.5 bg-[#E5E7EB] rounded-full overflow-hidden flex">
                  <div style={{ width: `${posPct}%` }} className="bg-[#10B981]" title={`Positive: ${s.positive}`} />
                  <div style={{ width: `${neuPct}%` }} className="bg-[#9CA3AF]" title={`Neutral/Mixed: ${s.neutral}`} />
                  <div style={{ width: `${negPct}%` }} className="bg-[#EF4444]" title={`Negative: ${s.negative}`} />
                </div>

                <div className="flex items-center justify-between text-[10px] text-[#4B5563] pt-1 font-mono">
                  <span className="flex items-center gap-0.5"><Smile className="w-3 h-3 text-[#10B981]" /> {s.positive}</span>
                  <span className="flex items-center gap-0.5"><Meh className="w-3 h-3 text-[#6B7280]" /> {s.neutral}</span>
                  <span className="flex items-center gap-0.5"><Frown className="w-3 h-3 text-[#EF4444]" /> {s.negative}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Citation Density Heatmap (Active Brand vs Competitors) */}
      <CitationDensityHeatmap
        client={client}
        promptAggregates={promptAggregates}
        prompts={prompts}
        runs={runs}
        onInspectPrompt={onInspectPrompt}
        onDiagnosePrompt={onDiagnosePrompt}
      />

      {/* Competitor Correlation Matrix & SOV Heatmap */}
      <CompetitorHeatmap
        promptAggregates={promptAggregates}
        client={client}
        onInspectPrompt={onInspectPrompt}
      />
    </div>
  );
}
