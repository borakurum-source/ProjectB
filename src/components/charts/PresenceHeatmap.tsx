import { useState } from 'react';
import { PromptAggregate, Client } from '../../types';
import { Table, Grid, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';

interface PresenceHeatmapProps {
  promptAggregates: PromptAggregate[];
  client: Client;
  onInspectPrompt?: (promptId: string) => void;
}

export function PresenceHeatmap({
  promptAggregates,
  client,
  onInspectPrompt,
}: PresenceHeatmapProps) {
  const [showTable, setShowTable] = useState(false);

  const columns = [
    { key: client.brandName, label: `${client.brandName} (Client)`, isClient: true },
    ...client.competitorBrands.map((comp) => ({ key: comp, label: comp, isClient: false })),
  ];

  if (promptAggregates.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-500 text-sm">
        No prompt measurements recorded. Run a cycle to generate presence heatmap.
      </div>
    );
  }

  // Helper to get background color based on rate (0 to 1)
  const getCellColor = (rate: number, isClient: boolean) => {
    if (rate === 0) return 'bg-[#F9FAFB] dark:bg-[#1E293B]/40 text-[#9CA3AF] dark:text-[#64748B] border border-[#E5E7EB] dark:border-[#334155]';
    if (isClient) {
      if (rate >= 0.8) return 'bg-[#111827] dark:bg-[#6366F1] text-white font-medium border border-[#111827] dark:border-[#6366F1]';
      if (rate >= 0.5) return 'bg-[#374151] dark:bg-[#4338CA] text-white font-medium border border-[#374151] dark:border-[#4338CA]';
      return 'bg-[#E5E7EB] dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] border border-[#D1D5DB] dark:border-[#334155]';
    }
    // Competitor shades (cool slate tones)
    if (rate >= 0.8) return 'bg-[#4B5563] dark:bg-[#64748B] text-white font-medium border border-[#4B5563] dark:border-[#64748B]';
    if (rate >= 0.5) return 'bg-[#9CA3AF] dark:bg-[#475569] text-white font-medium border border-[#9CA3AF] dark:border-[#475569]';
    return 'bg-[#F3F4F6] dark:bg-[#1E293B]/60 text-[#4B5563] dark:text-[#CBD5E1] border border-[#E5E7EB] dark:border-[#334155]';
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
              Prompt × Brand Presence Heatmap
            </h3>
            <span className="text-[10px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] px-2 py-0.5 font-bold uppercase tracking-wider">
              Flagship View
            </span>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Cell value = mentionRate shaded from 0.0 to 1.0 with sample size (n). Click any prompt to inspect raw model responses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTable(!showTable)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#D1D5DB] dark:border-[#334155] rounded shadow-xs transition-colors"
          >
            {showTable ? <Grid className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
            {showTable ? 'Heatmap View' : 'Table View'}
          </button>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs mb-3 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <span className="text-[#6B7280] dark:text-[#94A3B8] font-bold text-[10px] uppercase tracking-wider">Rate Scale:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-[#F9FAFB] dark:bg-[#1E293B]/40 border border-[#E5E7EB] dark:border-[#334155] inline-block" />
          <span className="text-[#4B5563] dark:text-[#CBD5E1] text-xs">0%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-[#E5E7EB] dark:bg-[#1E293B] border border-[#D1D5DB] dark:border-[#334155] inline-block" />
          <span className="text-[#4B5563] dark:text-[#CBD5E1] text-xs">1–49%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-[#374151] dark:bg-[#4338CA] inline-block" />
          <span className="text-[#4B5563] dark:text-[#CBD5E1] text-xs">50–79%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-[#111827] dark:bg-[#6366F1] inline-block" />
          <span className="text-[#111827] dark:text-[#F8FAFC] text-xs font-semibold">80–100%</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF3C7] dark:bg-[#78350F] text-[#92400E] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#B45309] text-[10px] font-bold uppercase tracking-wider">
            <AlertCircle className="w-3 h-3 text-[#D97706] dark:text-[#FBBF24]" /> Volatile
          </span>
        </div>
      </div>

      {/* Mobile Card List (sm:hidden) */}
      <div className="block sm:hidden space-y-3">
        {promptAggregates.map((pa) => {
          return (
            <div
              key={pa.promptId}
              onClick={() => onInspectPrompt && onInspectPrompt(pa.promptId)}
              className="p-3.5 bg-[#F9FAFB] dark:bg-[#1E293B]/50 border border-[#E5E7EB] dark:border-[#334155] rounded-xs space-y-2.5 active:bg-[#F3F4F6] dark:active:bg-[#334155] cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-xs text-[#111827] dark:text-[#F8FAFC] leading-snug">
                  {pa.promptText}
                </div>
                <div className="shrink-0">
                  {pa.volatility ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#B45309] text-[9px] font-bold uppercase tracking-wider">
                      <AlertCircle className="w-2.5 h-2.5" /> Volatile
                    </span>
                  ) : pa.mentionRate === 1 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] text-[9px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-2.5 h-2.5" /> 100%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#334155] text-[9px] font-bold uppercase tracking-wider">
                      <XCircle className="w-2.5 h-2.5 text-[#9CA3AF] dark:text-[#64748B]" /> 0%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#6B7280] dark:text-[#94A3B8]">
                <span className="bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] px-1.5 py-0.5 font-medium text-[#374151] dark:text-[#CBD5E1]">
                  {pa.intentLayer}
                </span>
                <span>• {pa.category}</span>
                <span>• n={pa.runsCount}</span>
                {pa.citationCount > 0 && (
                  <span className="text-[#065F46] dark:text-[#A7F3D0] bg-[#ECFDF5] dark:bg-[#064E3B] px-1.5 py-0.5 border border-[#A7F3D0] dark:border-[#065F46] font-mono">
                    Cited in {pa.citationCount}/{pa.runsCount}
                  </span>
                )}
              </div>

              {/* Client & Competitor Mention Bars */}
              <div className="space-y-1.5 pt-1 border-t border-[#E5E7EB] dark:border-[#334155]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#111827] dark:bg-[#6366F1] inline-block rounded-full" />
                    {client.brandName} (Client)
                  </span>
                  <span className="font-mono font-bold text-[#111827] dark:text-[#F8FAFC]">
                    {Math.round(pa.mentionRate * 100)}% ({pa.mentionCount}/{pa.runsCount})
                  </span>
                </div>
                <div className="w-full bg-[#E5E7EB] dark:bg-[#334155] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#111827] dark:bg-[#6366F1] h-full rounded-full"
                    style={{ width: `${Math.round(pa.mentionRate * 100)}%` }}
                  />
                </div>

                {/* Top Competitor Mentions */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {client.competitorBrands.map((comp) => {
                    const compData = pa.competitorMentionRates[comp] || { rate: 0, count: 0 };
                    return (
                      <div
                        key={comp}
                        className="bg-white dark:bg-[#1E293B] p-1.5 border border-[#E5E7EB] dark:border-[#334155] flex items-center justify-between text-[11px]"
                      >
                        <span className="text-[#6B7280] dark:text-[#94A3B8] truncate mr-1">{comp}</span>
                        <span className="font-mono font-semibold text-[#111827] dark:text-[#F8FAFC]">
                          {Math.round(compData.rate * 100)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Desktop / Tablet Table View (hidden sm:block) */}
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-xs text-left border-collapse">
          <thead>
            <tr className="border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B]/60">
              <th className="py-3 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] min-w-[280px]">
                Tracked Prompt Query
              </th>
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] w-24">
                Intent
              </th>
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] w-20 text-center">
                Runs (n)
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-3 font-bold text-[10px] uppercase tracking-wider text-center min-w-[130px] ${
                    col.isClient
                      ? 'bg-[#F3F4F6] dark:bg-[#312E81]/30 text-[#111827] dark:text-[#F8FAFC] border-x border-[#E5E7EB] dark:border-[#3730A3]'
                      : 'text-[#6B7280] dark:text-[#94A3B8]'
                  }`}
                >
                  {col.label}
                </th>
              ))}
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] w-24 text-center">
                Stability
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
            {promptAggregates.map((pa) => {
              return (
                <tr
                  key={pa.promptId}
                  className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B]/40 transition-colors group cursor-pointer"
                  onClick={() => onInspectPrompt && onInspectPrompt(pa.promptId)}
                >
                  <td className="py-3 px-3">
                    <div className="font-medium text-[#111827] dark:text-[#F8FAFC] group-hover:text-black dark:group-hover:text-white transition-colors">
                      {pa.promptText}
                    </div>
                    <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-0.5 flex items-center gap-2">
                      <span>{pa.category}</span>
                      {pa.citationCount > 0 && (
                        <span className="text-[#065F46] dark:text-[#A7F3D0] bg-[#ECFDF5] dark:bg-[#064E3B] px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono border border-[#A7F3D0] dark:border-[#065F46]">
                          Cited in {pa.citationCount}/{pa.runsCount} runs
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-[#4B5563] dark:text-[#CBD5E1]">
                    <span className="px-2 py-0.5 bg-[#F3F4F6] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-[#374151] dark:text-[#CBD5E1] text-[11px]">
                      {pa.intentLayer}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-[#6B7280] dark:text-[#94A3B8] font-mono text-center">
                    n={pa.runsCount}
                  </td>

                  {/* Client Column */}
                  <td className="p-1.5 border-x border-[#E5E7EB] dark:border-[#3730A3] bg-[#F9FAFB]/50 dark:bg-[#312E81]/10">
                    <div
                      className={`h-9 flex flex-col items-center justify-center transition-all ${getCellColor(
                        pa.mentionRate,
                        true
                      )}`}
                    >
                      <span className="font-mono text-xs font-semibold">
                        {Math.round(pa.mentionRate * 100)}%
                      </span>
                      <span className="text-[10px] opacity-85 font-mono">
                        {pa.mentionCount}/{pa.runsCount} runs
                      </span>
                    </div>
                  </td>

                  {/* Competitor Columns */}
                  {client.competitorBrands.map((comp) => {
                    const compData = pa.competitorMentionRates[comp] || { rate: 0, count: 0 };
                    return (
                      <td key={comp} className="p-1.5">
                        <div
                          className={`h-9 flex flex-col items-center justify-center ${getCellColor(
                            compData.rate,
                            false
                          )}`}
                        >
                          <span className="font-mono text-xs font-semibold">
                            {Math.round(compData.rate * 100)}%
                          </span>
                          <span className="text-[10px] opacity-80 font-mono">
                            {compData.count}/{pa.runsCount} runs
                          </span>
                        </div>
                      </td>
                    );
                  })}

                  {/* Stability Indicator */}
                  <td className="py-3 px-2 text-center">
                    {pa.runsCount === 0 ? (
                      <span className="text-[#9CA3AF] dark:text-[#64748B] text-[11px]">—</span>
                    ) : pa.volatility ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FEF3C7] dark:bg-[#78350F] text-[#92400E] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#B45309] text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3 text-[#D97706] dark:text-[#FBBF24]" /> Volatile
                      </span>
                    ) : pa.mentionRate === 1 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3 text-[#059669] dark:text-[#34D399]" /> Stable (100%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#F3F4F6] dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#334155] text-[10px] font-bold uppercase tracking-wider">
                        <XCircle className="w-3 h-3 text-[#9CA3AF] dark:text-[#64748B]" /> 0% (Missing)
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
