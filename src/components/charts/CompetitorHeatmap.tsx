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
    if (rate === 0) return 'bg-[#FEF2F2] text-[#991B1B] border-[#FEE2E2]';
    if (rate < 0.5) return 'bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]';
    if (rate < 0.8) return 'bg-[#D1FAE5] text-[#065F46] border-[#A7F3D0]';
    return 'bg-[#10B981] text-white font-bold border-[#059669]';
  };

  const getCompetitorShade = (rate: number) => {
    if (rate === 0) return 'bg-[#F9FAFB] text-[#9CA3AF] border-[#E5E7EB]';
    if (rate < 0.5) return 'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]';
    if (rate < 0.8) return 'bg-[#E5E7EB] text-[#111827] font-semibold border-[#D1D5DB]';
    return 'bg-[#374151] text-white font-bold border-[#1F2937]';
  };

  return (
    <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F3F4F6]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
              Competitor Correlation Matrix & SOV Heatmap
            </h3>
            <span className="text-[10px] text-[#4B5563] bg-[#F3F4F6] border border-[#E5E7EB] px-2 py-0.5 font-mono">
              n={totalRuns} runs total
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Cross-query head-to-head comparison of {client.brandName} vs. {competitors.join(', ')}
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Intent Filter */}
          <select
            value={selectedIntent}
            onChange={(e) => setSelectedIntent(e.target.value)}
            className="text-xs bg-white border border-[#D1D5DB] rounded px-2.5 py-1 text-[#374151] font-medium"
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
            className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider text-[#111827] bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] rounded shadow-xs transition-colors"
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
                isWinning ? 'bg-[#F0FDF4] border-[#BBF7D0]' : 'bg-[#F9FAFB] border-[#E5E7EB]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#111827] truncate" title={comp}>
                  vs. {comp}
                </span>
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.2 uppercase ${
                    isWinning
                      ? 'bg-[#10B981] text-white'
                      : 'bg-[#E5E7EB] text-[#4B5563]'
                  }`}
                >
                  {isWinning ? 'Client Leads' : 'Competitor Leads'}
                </span>
              </div>

              <div className="mt-2 flex items-baseline justify-between">
                <div className="text-lg font-bold font-mono text-[#111827]">{winRate}%</div>
                <div className="text-[11px] text-[#6B7280] font-mono">
                  {stat.clientWins}W - {stat.competitorWins}L - {stat.ties}T
                </div>
              </div>

              <div className="mt-1 text-[10px] text-[#6B7280] flex justify-between font-mono">
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
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th
                  onClick={() => {
                    if (sortBy === 'promptText') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('promptText');
                      setSortOrder('asc');
                    }
                  }}
                  className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] cursor-pointer hover:text-[#111827]"
                >
                  <div className="flex items-center gap-1">
                    <span>Tracked Prompt</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                  </div>
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] w-24">
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
                  className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#111827] bg-[#EEF2FF] border-x border-[#E0E7FF] text-center cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{client.brandName} (Client)</span>
                    <ArrowUpDown className="w-3 h-3 text-[#4F46E5]" />
                  </div>
                </th>
                {competitors.map((comp) => (
                  <th
                    key={comp}
                    className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-center"
                  >
                    {comp}
                  </th>
                ))}
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] text-center">
                  Advantage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {sortedPrompts.length === 0 ? (
                <tr>
                  <td colSpan={competitors.length + 4} className="py-8 text-center text-[#9CA3AF]">
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
                      className="hover:bg-[#F9FAFB] cursor-pointer transition-colors"
                      onClick={() => onInspectPrompt && onInspectPrompt(pa.promptId)}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-[#111827] max-w-sm sm:max-w-md truncate" title={pa.promptText}>
                          {pa.promptText}
                        </div>
                        <div className="text-[10px] text-[#9CA3AF] font-mono">
                          Category: {pa.category}
                        </div>
                      </td>

                      <td className="py-2.5 px-2">
                        <span className="px-1.5 py-0.5 bg-[#F3F4F6] text-[#4B5563] text-[10px] font-mono uppercase font-semibold">
                          {pa.intentLayer}
                        </span>
                      </td>

                      {/* Client Mention Cell */}
                      <td className="py-2.5 px-3 text-center bg-[#EEF2FF]/40 border-x border-[#E0E7FF]">
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
                          <span className="px-2 py-0.5 bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] text-[10px] font-bold uppercase">
                            Client +{Math.round((clientRate - topComp.rate) * 100)}%
                          </span>
                        )}
                        {clientAdvantage === 'Competitor' && (
                          <span className="px-2 py-0.5 bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA] text-[10px] font-bold uppercase">
                            {topComp.name} +{Math.round((topComp.rate - clientRate) * 100)}%
                          </span>
                        )}
                        {clientAdvantage === 'Tie' && (
                          <span className="px-2 py-0.5 bg-[#FEF3C7] text-[#92400E] border border-[#FDE68A] text-[10px] font-bold uppercase">
                            Co-Present ({Math.round(clientRate * 100)}%)
                          </span>
                        )}
                        {clientAdvantage === 'None' && (
                          <span className="text-[#9CA3AF] text-[10px] italic">
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
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">
                  Prompt Text
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">
                  Intent
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">
                  Sample Size
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">
                  {client.brandName}
                </th>
                {competitors.map((comp) => (
                  <th key={comp} className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280]">
                    {comp}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {sortedPrompts.map((pa) => (
                <tr key={pa.promptId} className="hover:bg-[#F9FAFB]">
                  <td className="py-2.5 px-3 font-medium text-[#111827]">{pa.promptText}</td>
                  <td className="py-2.5 px-3 font-mono text-[#6B7280]">{pa.intentLayer}</td>
                  <td className="py-2.5 px-3 font-mono text-[#6B7280]">n={pa.runsCount}</td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#111827]">
                    {Math.round(pa.mentionRate * 100)}% ({pa.mentionCount} runs)
                  </td>
                  {competitors.map((comp) => {
                    const data = pa.competitorMentionRates[comp];
                    return (
                      <td key={comp} className="py-2.5 px-3 font-mono text-[#4B5563]">
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
      <div className="mt-4 pt-3 border-t border-[#F3F4F6] flex flex-wrap items-center justify-between text-xs text-[#6B7280]">
        <div className="flex items-center gap-3">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[#374151]">Presence Key:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#10B981] inline-block border border-[#059669]" />
            <span className="text-[11px]">80-100%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#D1FAE5] inline-block border border-[#A7F3D0]" />
            <span className="text-[11px]">50-79%</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#FEF3C7] inline-block border border-[#FDE68A]" />
            <span className="text-[11px]">1-49% (Volatile)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#FEF2F2] inline-block border border-[#FEE2E2]" />
            <span className="text-[11px]">0% (Missing)</span>
          </div>
        </div>

        <div className="text-[11px] font-mono text-[#9CA3AF]">
          Click any row to open Run Inspector
        </div>
      </div>
    </div>
  );
}
