import { useState, useMemo } from 'react';
import { PromptAggregate, Client, IntentLayer } from '../../types';
import { Table, LayoutGrid, ArrowUpDown, Filter, ShieldCheck, Trophy, AlertTriangle } from 'lucide-react';

interface CompetitorHeatmapProps {
  promptAggregates: PromptAggregate[];
  client: Client;
  onInspectPrompt?: (promptId: string) => void;
}

export function CompetitorHeatmap({
  promptAggregates,
  client,
  onInspectPrompt,
}: CompetitorHeatmapProps) {
  const [showTable, setShowTable] = useState(false);
  const [selectedIntent, setSelectedIntent] = useState<string>('ALL');
  const [selectedCompetitor, setSelectedCompetitor] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'clientRate' | 'promptText' | 'delta'>('clientRate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const competitors = client.competitorBrands.slice(0, 4);

  // Filter prompts
  const filteredPrompts = useMemo(() => {
    return promptAggregates.filter((pa) => {
      if (selectedIntent !== 'ALL' && pa.intentLayer !== selectedIntent) {
        return false;
      }
      return true;
    });
  }, [promptAggregates, selectedIntent]);

  // Compute Head-to-Head win/loss stats against each competitor
  const competitorStats = useMemo(() => {
    const stats: Record<
      string,
      {
        clientWins: number;
        competitorWins: number;
        ties: number;
        bothMissing: number;
        total: number;
        avgClientRate: number;
        avgCompRate: number;
      }
    > = {};

    for (const comp of competitors) {
      let clientWins = 0;
      let competitorWins = 0;
      let ties = 0;
      let bothMissing = 0;
      let clientSum = 0;
      let compSum = 0;

      for (const pa of filteredPrompts) {
        const clientRate = pa.mentionRate;
        const compRate = pa.competitorMentionRates[comp]?.rate ?? 0;
        clientSum += clientRate;
        compSum += compRate;

        if (clientRate === 0 && compRate === 0) {
          bothMissing++;
        } else if (clientRate > compRate) {
          clientWins++;
        } else if (compRate > clientRate) {
          competitorWins++;
        } else {
          ties++;
        }
      }

      const count = filteredPrompts.length || 1;
      stats[comp] = {
        clientWins,
        competitorWins,
        ties,
        bothMissing,
        total: filteredPrompts.length,
        avgClientRate: Math.round((clientSum / count) * 100) / 100,
        avgCompRate: Math.round((compSum / count) * 100) / 100,
      };
    }

    return stats;
  }, [filteredPrompts, competitors]);

  // Sort prompts
  const sortedPrompts = useMemo(() => {
    return [...filteredPrompts].sort((a, b) => {
      if (sortBy === 'promptText') {
        return sortOrder === 'asc'
          ? a.promptText.localeCompare(b.promptText)
          : b.promptText.localeCompare(a.promptText);
      }

      if (sortBy === 'delta') {
        // Delta against primary competitor or average
        const primaryComp = competitors[0];
        const deltaA = a.mentionRate - (a.competitorMentionRates[primaryComp]?.rate ?? 0);
        const deltaB = b.mentionRate - (b.competitorMentionRates[primaryComp]?.rate ?? 0);
        return sortOrder === 'asc' ? deltaA - deltaB : deltaB - deltaA;
      }

      // Default clientRate
      return sortOrder === 'asc' ? a.mentionRate - b.mentionRate : b.mentionRate - a.mentionRate;
    });
  }, [filteredPrompts, sortBy, sortOrder, competitors]);

  const totalRuns = promptAggregates.reduce((acc, p) => acc + p.runsCount, 0);

  // Cell shade color generators
  const getClientShade = (rate: number) => {
    if (rate === 0) return 'bg-[#F9FAFB] dark:bg-[#1E293B]/40 text-[#9CA3AF] dark:text-[#64748B] border-[#E5E7EB] dark:border-[#334155]';
    if (rate < 0.5) return 'bg-[#EEF2FF] dark:bg-[#312E81]/50 text-[#4338CA] dark:text-[#A5B4FC] border-[#C7D2FE] dark:border-[#4338CA]';
    if (rate < 0.8) return 'bg-[#4338CA] text-white font-semibold border-[#3730A3]';
    return 'bg-[#111827] dark:bg-[#6366F1] text-white font-bold border-[#111827] dark:border-[#6366F1]';
  };

  const getCompetitorShade = (rate: number) => {
    if (rate === 0) return 'bg-[#F9FAFB] dark:bg-[#1E293B]/40 text-[#9CA3AF] dark:text-[#64748B] border-[#E5E7EB] dark:border-[#334155]';
    if (rate < 0.5) return 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#CBD5E1] border-[#E5E7EB] dark:border-[#334155]';
    if (rate < 0.8) return 'bg-[#E5E7EB] dark:bg-[#475569] text-[#111827] dark:text-[#F8FAFC] font-semibold border-[#D1D5DB] dark:border-[#64748B]';
    return 'bg-[#374151] dark:bg-[#64748B] text-white font-bold border-[#1F2937] dark:border-[#64748B]';
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
              Competitor Correlation Matrix & SOV Heatmap
            </h3>
            <span className="text-[10px] text-[#4B5563] dark:text-[#CBD5E1] bg-[#F3F4F6] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] px-2 py-0.5 font-mono">
              n={totalRuns} runs total
            </span>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Cross-query head-to-head comparison of {client.brandName} vs. {competitors.join(', ')}
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Intent Filter */}
          <select
            value={selectedIntent}
            onChange={(e) => setSelectedIntent(e.target.value)}
            className="text-xs bg-white dark:bg-[#1E293B] border border-[#D1D5DB] dark:border-[#334155] rounded px-2.5 py-1 text-[#374151] dark:text-[#F8FAFC] font-medium"
          >
            <option value="ALL">All Intents ({promptAggregates.length})</option>
            <option value="Informational">Informational</option>
            <option value="Commercial">Commercial</option>
            <option value="Comparative">Comparative</option>
            <option value="Navigational">Navigational</option>
            <option value="Transactional">Transactional</option>
          </select>

          {/* Toggle View */}
          <button
            onClick={() => setShowTable(!showTable)}
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#D1D5DB] dark:border-[#334155] rounded shadow-xs transition-colors"
          >
            {showTable ? <LayoutGrid className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
            {showTable ? 'Matrix View' : 'Table View'}
          </button>
        </div>
      </div>

      {/* Head-to-Head Win/Loss Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        {competitors.map((comp) => {
          const stat = competitorStats[comp];
          if (!stat) return null;

          const winRate =
            stat.total > 0 ? Math.round((stat.clientWins / stat.total) * 100) : 0;
          const isWinning = stat.clientWins > stat.competitorWins;

          return (
            <div
              key={comp}
              className={`p-3 border transition-colors ${
                isWinning 
                  ? 'bg-[#F0FDF4] dark:bg-[#064E3B]/40 border-[#BBF7D0] dark:border-[#065F46]' 
                  : 'bg-[#F9FAFB] dark:bg-[#1E293B]/50 border-[#E5E7EB] dark:border-[#334155]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC] truncate" title={comp}>
                  vs. {comp}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 uppercase ${
                    isWinning
                      ? 'bg-[#10B981] text-white'
                      : 'bg-[#E5E7EB] dark:bg-[#334155] text-[#4B5563] dark:text-[#CBD5E1]'
                  }`}
                >
                  {isWinning ? 'Client Leads' : 'Competitor Leads'}
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-lg font-bold font-mono text-[#111827] dark:text-[#F8FAFC]">{winRate}%</div>
                <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] font-mono">
                  {stat.clientWins}W - {stat.competitorWins}L - {stat.ties}T
                </div>
              </div>

              <div className="mt-1 text-[10px] text-[#6B7280] dark:text-[#94A3B8] flex justify-between font-mono">
                <span>Avg: {Math.round(stat.avgClientRate * 100)}% ({client.brandName})</span>
                <span>{Math.round(stat.avgCompRate * 100)}% ({comp})</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Matrix / Heatmap View */}
      {!showTable ? (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B]/50">
                <th
                  onClick={() => {
                    if (sortBy === 'promptText') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('promptText');
                      setSortOrder('asc');
                    }
                  }}
                  className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] cursor-pointer hover:text-[#111827] dark:hover:text-[#F8FAFC]"
                >
                  <div className="flex items-center gap-1">
                    <span>Tracked Prompt</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF] dark:text-[#64748B]" />
                  </div>
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] w-24">
                  Intent
                </th>
                <th
                  onClick={() => {
                    if (sortBy === 'clientRate') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('clientRate');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] bg-[#EEF2FF] dark:bg-[#312E81]/40 border-x border-[#E0E7FF] dark:border-[#3730A3] text-center cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{client.brandName} (Client)</span>
                    <ArrowUpDown className="w-3 h-3 text-[#4F46E5] dark:text-[#818CF8]" />
                  </div>
                </th>
                {competitors.map((comp) => (
                  <th
                    key={comp}
                    className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center"
                  >
                    {comp}
                  </th>
                ))}
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  Advantage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
              {sortedPrompts.length === 0 ? (
                <tr>
                  <td colSpan={competitors.length + 4} className="py-8 text-center text-[#9CA3AF] dark:text-[#64748B]">
                    No prompts match the selected filter.
                  </td>
                </tr>
              ) : (
                sortedPrompts.map((pa) => {
                  const clientRate = pa.mentionRate;
                  const topComp = competitors.reduce(
                    (best, comp) => {
                      const rate = pa.competitorMentionRates[comp]?.rate ?? 0;
                      return rate > best.rate ? { name: comp, rate } : best;
                    },
                    { name: 'None', rate: 0 }
                  );

                  const clientAdvantage =
                    clientRate > topComp.rate
                      ? 'Client'
                      : topComp.rate > clientRate
                      ? 'Competitor'
                      : clientRate > 0
                      ? 'Tie'
                      : 'None';

                  return (
                    <tr
                      key={pa.promptId}
                      className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B]/50 cursor-pointer transition-colors"
                      onClick={() => onInspectPrompt && onInspectPrompt(pa.promptId)}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#111827] dark:text-[#F8FAFC] max-w-sm sm:max-w-md truncate" title={pa.promptText}>
                          {pa.promptText}
                        </div>
                        <div className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] font-mono">
                          Category: {pa.category}
                        </div>
                      </td>

                      <td className="py-2.5 px-2">
                        <span className="px-1.5 py-0.5 bg-[#F3F4F6] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#CBD5E1] border border-transparent dark:border-[#334155] text-[10px] font-mono uppercase font-semibold">
                          {pa.intentLayer}
                        </span>
                      </td>

                      {/* Client Mention Cell */}
                      <td className="py-2.5 px-3 text-center bg-[#EEF2FF]/40 dark:bg-[#312E81]/20 border-x border-[#E0E7FF] dark:border-[#3730A3]">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-mono rounded border ${getClientShade(
                            clientRate
                          )}`}
                        >
                          {Math.round(clientRate * 100)}%
                        </span>
                      </td>

                      {/* Competitor Cells */}
                      {competitors.map((comp) => {
                        const compRate = pa.competitorMentionRates[comp]?.rate ?? 0;
                        return (
                          <td key={comp} className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 text-xs font-mono rounded border ${getCompetitorShade(
                                compRate
                              )}`}
                            >
                              {Math.round(compRate * 100)}%
                            </span>
                          </td>
                        );
                      })}

                      {/* Advantage Badge */}
                      <td className="py-2.5 px-3 text-center font-mono text-xs">
                        {clientAdvantage === 'Client' && (
                          <span className="px-2 py-0.5 bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] text-[10px] font-bold uppercase">
                            Client +{Math.round((clientRate - topComp.rate) * 100)}%
                          </span>
                        )}
                        {clientAdvantage === 'Competitor' && (
                          <span className="px-2 py-0.5 bg-[#FEF2F2] dark:bg-[#450A0A] text-[#991B1B] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#7F1D1D] text-[10px] font-bold uppercase">
                            {topComp.name} +{Math.round((topComp.rate - clientRate) * 100)}%
                          </span>
                        )}
                        {clientAdvantage === 'Tie' && (
                          <span className="px-2 py-0.5 bg-[#FEF3C7] dark:bg-[#78350F] text-[#92400E] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#B45309] text-[10px] font-bold uppercase">
                            Co-Present ({Math.round(clientRate * 100)}%)
                          </span>
                        )}
                        {clientAdvantage === 'None' && (
                          <span className="text-[#9CA3AF] dark:text-[#64748B] text-[10px] italic">
                            Neither (0%)
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      ) : (
        /* Accessible Data Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B]/50">
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Prompt Text
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Intent
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Sample Size
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  {client.brandName}
                </th>
                {competitors.map((comp) => (
                  <th key={comp} className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                    {comp}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
              {sortedPrompts.map((pa) => (
                <tr key={pa.promptId} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B]/50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-[#111827] dark:text-[#F8FAFC]">{pa.promptText}</td>
                  <td className="py-2.5 px-3 font-mono text-[#6B7280] dark:text-[#94A3B8]">{pa.intentLayer}</td>
                  <td className="py-2.5 px-3 font-mono text-[#6B7280] dark:text-[#94A3B8]">n={pa.runsCount}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#111827] dark:text-[#F8FAFC]">
                    {Math.round(pa.mentionRate * 100)}% ({pa.mentionCount} runs)
                  </td>
                  {competitors.map((comp) => {
                    const data = pa.competitorMentionRates[comp];
                    return (
                      <td key={comp} className="py-2.5 px-3 font-mono text-[#4B5563] dark:text-[#CBD5E1]">
                        {Math.round((data?.rate ?? 0) * 100)}% ({data?.count ?? 0} runs)
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Heatmap Legend */}
      <div className="mt-4 pt-3 border-t border-[#F3F4F6] dark:border-[#1E293B] flex flex-wrap items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8]">
        <div className="flex items-center gap-3">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[#374151] dark:text-[#CBD5E1]">Presence Key:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#10B981] inline-block border border-[#059669]" />
            <span className="text-[11px]">80-100%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#D1FAE5] dark:bg-[#064E3B] inline-block border border-[#A7F3D0] dark:border-[#065F46]" />
            <span className="text-[11px]">50-79%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#FEF3C7] dark:bg-[#78350F] inline-block border border-[#FDE68A] dark:border-[#B45309]" />
            <span className="text-[11px]">1-49% (Volatile)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#FEF2F2] dark:bg-[#450A0A] inline-block border border-[#FEE2E2] dark:border-[#7F1D1D]" />
            <span className="text-[11px]">0% (Missing)</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-[#9CA3AF] dark:text-[#64748B]">
          Click any row to open Run Inspector
        </div>
      </div>
    </div>
  );
}

