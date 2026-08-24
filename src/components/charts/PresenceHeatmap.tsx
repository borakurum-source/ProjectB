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
    if (rate === 0) return 'bg-[#F9FAFB] text-[#9CA3AF] border border-[#E5E7EB]';
    if (isClient) {
      if (rate >= 0.8) return 'bg-[#111827] text-white font-medium border border-[#111827]';
      if (rate >= 0.5) return 'bg-[#374151] text-white font-medium border border-[#374151]';
      return 'bg-[#E5E7EB] text-[#111827] border border-[#D1D5DB]';
    }
    // Competitor shades (cool slate tones)
    if (rate >= 0.8) return 'bg-[#4B5563] text-white font-medium border border-[#4B5563]';
    if (rate >= 0.5) return 'bg-[#9CA3AF] text-white font-medium border border-[#9CA3AF]';
    return 'bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]';
  };

  return (
    <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b border-[#F3F4F6]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
              Prompt × Brand Presence Heatmap
            </h3>
            <span className="text-[10px] bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] px-2 py-0.5 font-bold uppercase tracking-wider">
              Flagship View
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Cell value = mentionRate shaded from 0.0 to 1.0 with sample size (n). Click any prompt to inspect raw model responses.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowTable(!showTable)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#111827] bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] rounded shadow-xs transition-colors"
          >
            {showTable ? <Grid className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
            {showTable ? 'Heatmap View' : 'Table View'}
          </button>
        </div>
      </div>

      {/* Heatmap Legend */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs mb-3 pb-3 border-b border-[#F3F4F6]">
        <span className="text-[#6B7280] font-bold text-[10px] uppercase tracking-wider">Rate Scale:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-[#F9FAFB] border border-[#E5E7EB] inline-block" />
          <span className="text-[#4B5563] text-xs">0%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-[#E5E7EB] border border-[#D1D5DB] inline-block" />
          <span className="text-[#4B5563] text-xs">1–49%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-[#374151] inline-block" />
          <span className="text-[#4B5563] text-xs">50–79%</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3.5 h-3.5 bg-[#111827] inline-block" />
          <span className="text-[#111827] text-xs font-semibold">80–100%</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[10px] font-bold uppercase tracking-wider">
            <AlertCircle className="w-3 h-3 text-[#D97706]" /> Volatile
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
              className="p-3.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xs space-y-2.5 active:bg-[#F3F4F6] cursor-pointer"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="font-semibold text-xs text-[#111827] leading-snug">
                  {pa.promptText}
                </div>
                <div className="shrink-0">
                  {pa.volatility ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] text-[9px] font-bold uppercase tracking-wider">
                      <AlertCircle className="w-2.5 h-2.5" /> Volatile
                    </span>
                  ) : pa.mentionRate === 1 ? (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-[9px] font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-2.5 h-2.5" /> 100%
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white text-[#6B7280] border border-[#E5E7EB] text-[9px] font-bold uppercase tracking-wider">
                      <XCircle className="w-2.5 h-2.5 text-[#9CA3AF]" /> 0%
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-[#6B7280]">
                <span className="bg-white border border-[#E5E7EB] px-1.5 py-0.5 font-medium text-[#374151]">
                  {pa.intentLayer}
                </span>
                <span>• {pa.category}</span>
                <span>• n={pa.runsCount}</span>
                {pa.citationCount > 0 && (
                  <span className="text-[#065F46] bg-[#ECFDF5] px-1.5 py-0.5 border border-[#A7F3D0] font-mono">
                    Cited in {pa.citationCount}/{pa.runsCount}
                  </span>
                )}
              </div>

              {/* Client & Competitor Mention Bars */}
              <div className="space-y-1.5 pt-1 border-t border-[#E5E7EB]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-[#111827] flex items-center gap-1">
                    <span className="w-2 h-2 bg-[#111827] inline-block rounded-full" />
                    {client.brandName} (Client)
                  </span>
                  <span className="font-mono font-bold text-[#111827]">
                    {Math.round(pa.mentionRate * 100)}% ({pa.mentionCount}/{pa.runsCount})
                  </span>
                </div>
                <div className="w-full bg-[#E5E7EB] h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-[#111827] h-full rounded-full"
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
                        className="bg-white p-1.5 border border-[#E5E7EB] flex items-center justify-between text-[11px]"
                      >
                        <span className="text-[#6B7280] truncate mr-1">{comp}</span>
                        <span className="font-mono font-semibold text-[#111827]">
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
            <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
              <th className="py-3 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] min-w-[280px]">
                Tracked Prompt Query
              </th>
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] w-24">
                Intent
              </th>
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] w-20 text-center">
                Runs (n)
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-3 px-3 font-bold text-[10px] uppercase tracking-wider text-center min-w-[130px] ${
                    col.isClient
                      ? 'bg-[#F3F4F6] text-[#111827] border-x border-[#E5E7EB]'
                      : 'text-[#6B7280]'
                  }`}
                >
                  {col.label}
                </th>
              ))}
              <th className="py-3 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] w-24 text-center">
                Stability
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB]">
            {promptAggregates.map((pa) => {
              return (
                <tr
                  key={pa.promptId}
                  className="hover:bg-[#F9FAFB] transition-colors group cursor-pointer"
                  onClick={() => onInspectPrompt && onInspectPrompt(pa.promptId)}
                >
                  <td className="py-3 px-3">
                    <div className="font-medium text-[#111827] group-hover:text-black transition-colors">
                      {pa.promptText}
                    </div>
                    <div className="text-[11px] text-[#6B7280] mt-0.5 flex items-center gap-2">
                      <span>{pa.category}</span>
                      {pa.citationCount > 0 && (
                        <span className="text-[#065F46] bg-[#ECFDF5] px-1.5 py-0.5 rounded-[2px] text-[10px] font-mono border border-[#A7F3D0]">
                          Cited in {pa.citationCount}/{pa.runsCount} runs
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-2 text-[#4B5563]">
                    <span className="px-2 py-0.5 bg-[#F3F4F6] border border-[#E5E7EB] text-[#374151] text-[11px]">
                      {pa.intentLayer}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-[#6B7280] font-mono text-center">
                    n={pa.runsCount}
                  </td>

                  {/* Client Column */}
                  <td className="p-1.5 border-x border-[#E5E7EB] bg-[#F9FAFB]/50">
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
                      <span className="text-[#9CA3AF] text-[11px]">—</span>
                    ) : pa.volatility ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[10px] font-bold uppercase tracking-wider">
                        <AlertCircle className="w-3 h-3 text-[#D97706]" /> Volatile
                      </span>
                    ) : pa.mentionRate === 1 ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-[10px] font-bold uppercase tracking-wider">
                        <CheckCircle2 className="w-3 h-3 text-[#059669]" /> Stable (100%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] text-[10px] font-bold uppercase tracking-wider">
                        <XCircle className="w-3 h-3 text-[#9CA3AF]" /> 0% (Missing)
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
