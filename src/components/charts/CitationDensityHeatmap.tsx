import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import { Client, PromptAggregate, Prompt, Run, GroundingSource } from '../../types';
import { detectClientCitation, normalizeDomain } from '../../services/metrics';
import {
  BarChart2,
  LayoutGrid,
  Table,
  ArrowUpDown,
  Flame,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface CitationDensityHeatmapProps {
  client: Client;
  promptAggregates: PromptAggregate[];
  prompts: Prompt[];
  runs: Run[];
  onInspectPrompt?: (promptId: string) => void;
  onDiagnosePrompt?: (prompt: Prompt) => void;
}

// Brand color palette for Recharts bars & heatmap accents
const BRAND_COLORS = [
  '#10B981', // Client Emerald (primary)
  '#6366F1', // Indigo (Comp 1)
  '#F59E0B', // Amber (Comp 2)
  '#EC4899', // Pink (Comp 3)
  '#06B6D4', // Cyan (Comp 4)
];

export function CitationDensityHeatmap({
  client,
  promptAggregates,
  runs,
  onInspectPrompt,
}: CitationDensityHeatmapProps) {
  const [viewMode, setViewMode] = useState<'heatmap' | 'recharts' | 'table'>('heatmap');
  const [selectedIntent, setSelectedIntent] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<'clientDensity' | 'promptText' | 'gap'>('clientDensity');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Competitor list paired with domains
  const topCompetitors = useMemo(() => {
    return client.competitorBrands.slice(0, 4).map((brand, idx) => ({
      brand,
      domain: client.competitorDomains[idx] || `${brand.toLowerCase().replace(/\s+/g, '')}.com`,
      color: BRAND_COLORS[(idx + 1) % BRAND_COLORS.length],
    }));
  }, [client]);

  const allTrackedEntities = useMemo(() => {
    return [
      {
        brand: client.brandName,
        domain: client.domain,
        isClient: true,
        color: BRAND_COLORS[0],
      },
      ...topCompetitors.map((c) => ({
        brand: c.brand,
        domain: c.domain,
        isClient: false,
        color: c.color,
      })),
    ];
  }, [client, topCompetitors]);

  // Helper to test if a run cites a domain/brand
  const checkRunCitation = (r: Run, domain: string, brandName: string): boolean => {
    return r.groundingSources.some((src: GroundingSource) => {
      const srcDomain = src.resolvedDomain || src.displayTitle || '';
      if (domain && detectClientCitation(srcDomain, domain)) {
        return true;
      }
      const normSrc = normalizeDomain(srcDomain);
      const normEntity = normalizeDomain(brandName);
      return Boolean(normSrc && normEntity && normSrc.includes(normEntity));
    });
  };

  // Compute Citation Density data per prompt
  const densityData = useMemo(() => {
    return promptAggregates
      .filter((pa) => selectedIntent === 'ALL' || pa.intentLayer === selectedIntent)
      .map((pa) => {
        const promptRuns = runs.filter((r) => r.promptId === pa.promptId);
        const totalSampleSize = promptRuns.length || pa.runsCount || 1;

        const brandDensityMap: Record<
          string,
          { domain: string; count: number; density: number; percentage: number }
        > = {};

        allTrackedEntities.forEach((entity) => {
          let count = 0;
          promptRuns.forEach((r) => {
            if (checkRunCitation(r, entity.domain, entity.brand)) {
              count++;
            }
          });

          const density = totalSampleSize > 0 ? count / totalSampleSize : 0;
          const percentage = Math.round(density * 100);

          brandDensityMap[entity.brand] = {
            domain: entity.domain,
            count,
            density,
            percentage,
          };
        });

        const maxCompPercentage = topCompetitors.reduce((max, c) => {
          const pct = brandDensityMap[c.brand]?.percentage || 0;
          return Math.max(max, pct);
        }, 0);

        const clientPercentage = brandDensityMap[client.brandName]?.percentage || 0;
        const gap = maxCompPercentage - clientPercentage;

        const rechartsRow: Record<string, any> = {
          promptId: pa.promptId,
          promptText: pa.promptText,
          shortPrompt: pa.promptText.length > 32 ? pa.promptText.slice(0, 32) + '...' : pa.promptText,
          intentLayer: pa.intentLayer,
          category: pa.category,
          sampleSize: totalSampleSize,
          gap,
          brandDensityMap,
        };

        allTrackedEntities.forEach((entity) => {
          rechartsRow[entity.brand] = brandDensityMap[entity.brand]?.percentage || 0;
        });

        return rechartsRow;
      });
  }, [
    promptAggregates,
    selectedIntent,
    runs,
    client,
    topCompetitors,
    allTrackedEntities,
  ]);

  // Sort data
  const sortedDensityData = useMemo(() => {
    return [...densityData].sort((a, b) => {
      if (sortBy === 'promptText') {
        return sortOrder === 'asc'
          ? a.promptText.localeCompare(b.promptText)
          : b.promptText.localeCompare(a.promptText);
      }
      if (sortBy === 'gap') {
        return sortOrder === 'asc' ? a.gap - b.gap : b.gap - a.gap;
      }
      const clientA = a[client.brandName] || 0;
      const clientB = b[client.brandName] || 0;
      return sortOrder === 'asc' ? clientA - clientB : clientB - clientA;
    });
  }, [densityData, sortBy, sortOrder, client]);

  // Calculate summary metrics across all prompts
  const summaryMetrics = useMemo(() => {
    if (densityData.length === 0) return { entityStats: {} };

    const entityTotals: Record<string, { sumPct: number; avgPct: number; citedPromptsCount: number }> = {};

    allTrackedEntities.forEach((e) => {
      let sumPct = 0;
      let citedPromptsCount = 0;
      densityData.forEach((row) => {
        const pct = row[e.brand] || 0;
        sumPct += pct;
        if (pct > 0) citedPromptsCount++;
      });
      entityTotals[e.brand] = {
        sumPct,
        avgPct: Math.round(sumPct / densityData.length),
        citedPromptsCount,
      };
    });

    return {
      entityStats: entityTotals,
    };
  }, [densityData, allTrackedEntities]);

  // Cell color shading logic for citation density matrix
  const getCitationShade = (pct: number, isClient: boolean) => {
    if (pct === 0) {
      return isClient
        ? 'bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#FCA5A5] border-[#FEE2E2] dark:border-[#991B1B]/40'
        : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#9CA3AF] dark:text-[#64748B] border-[#E5E7EB] dark:border-[#334155]';
    }
    if (pct < 40) {
      return 'bg-[#FEF3C7] dark:bg-[#78350F]/30 text-[#92400E] dark:text-[#FDE68A] border-[#FDE68A] dark:border-[#78350F]/50';
    }
    if (pct < 75) {
      return isClient
        ? 'bg-[#D1FAE5] dark:bg-[#065F46]/40 text-[#065F46] dark:text-[#6EE7B7] font-semibold border-[#A7F3D0] dark:border-[#047857]'
        : 'bg-[#E0E7FF] dark:bg-[#312E81]/40 text-[#3730A3] dark:text-[#A5B4FC] font-semibold border-[#C7D2FE] dark:border-[#4338CA]';
    }
    return isClient
      ? 'bg-[#10B981] text-white font-bold border-[#059669] shadow-xs'
      : 'bg-[#4338CA] text-white font-bold border-[#3730A3] shadow-xs';
  };

  // Custom Recharts Tooltip
  const CustomRechartsTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const row = payload[0].payload;
      return (
        <div className="bg-[#111827] text-white p-3 text-xs border border-[#374151] rounded shadow-xl max-w-sm font-sans space-y-2 z-50">
          <div className="font-bold border-b border-[#374151] pb-1 flex items-center justify-between gap-3">
            <span className="truncate">{row.promptText}</span>
            <span className="font-mono text-[10px] text-[#9CA3AF]">n={row.sampleSize}</span>
          </div>
          <div className="text-[10px] text-[#9CA3AF] uppercase font-mono">
            Category: {row.category} • Intent: {row.intentLayer}
          </div>

          <div className="space-y-1 pt-1">
            {allTrackedEntities.map((entity) => {
              const bData = row.brandDensityMap[entity.brand];
              const pct = bData?.percentage || 0;
              return (
                <div key={entity.brand} className="flex items-center justify-between text-xs font-mono">
                  <span className="flex items-center gap-1.5" style={{ color: entity.color }}>
                    <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entity.color }} />
                    {entity.brand} ({entity.domain}):
                  </span>
                  <span className="font-bold text-white">
                    {pct}% ({bData?.count || 0}/{row.sampleSize})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-4 sm:p-5 shadow-xs space-y-4">
      {/* Header & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[#059669] dark:text-[#34D399]">
              <Flame className="w-4 h-4" />
              <h2 className="text-sm font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">
                Citation Density Matrix
              </h2>
            </div>
            <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-mono">
              Grounded Answers • Gemini Grounded • n={runs.length} runs
            </span>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Visualizing domain citation rates in grounded AI responses for <strong>{client.brandName}</strong> ({client.domain}) vs top market competitors across tracked prompt queries.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Intent Filter */}
          <div className="flex items-center gap-1 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#D1D5DB] dark:border-[#334155] rounded px-2 py-1">
            <Filter className="w-3 h-3 text-[#6B7280] dark:text-[#94A3B8]" />
            <select
              value={selectedIntent}
              onChange={(e) => setSelectedIntent(e.target.value)}
              className="text-xs bg-transparent text-[#374151] dark:text-[#CBD5E1] font-medium focus:outline-hidden cursor-pointer"
            >
              <option value="ALL">All Intents ({promptAggregates.length})</option>
              <option value="Informational">Informational</option>
              <option value="Commercial">Commercial</option>
              <option value="Comparative">Comparative</option>
              <option value="Navigational">Navigational</option>
              <option value="Transactional">Transactional</option>
            </select>
          </div>

          {/* View Switcher */}
          <div className="inline-flex border border-[#D1D5DB] dark:border-[#334155] p-0.5 bg-[#F9FAFB] dark:bg-[#1E293B] rounded">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                viewMode === 'heatmap'
                  ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Matrix
            </button>
            <button
              onClick={() => setViewMode('recharts')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                viewMode === 'recharts'
                  ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Bar
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827]'
              }`}
            >
              <Table className="w-3.5 h-3.5" /> Table
            </button>
          </div>
        </div>
      </div>

      {/* Summary Leaderboard Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
        {allTrackedEntities.map((entity) => {
          const stats = summaryMetrics.entityStats?.[entity.brand] || { avgPct: 0, citedPromptsCount: 0 };
          return (
            <div
              key={entity.brand}
              className={`p-3 border rounded-xs transition-colors ${
                entity.isClient
                  ? 'bg-[#ECFDF5]/50 dark:bg-[#064E3B]/20 border-[#A7F3D0] dark:border-[#047857]'
                  : 'bg-[#F9FAFB] dark:bg-[#1E293B]/50 border-[#E5E7EB] dark:border-[#334155]'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC] truncate" title={entity.brand}>
                  {entity.brand}
                </span>
                {entity.isClient ? (
                  <span className="text-[9px] font-bold bg-[#065F46] text-white px-1.5 py-0.2 rounded-xs">
                    CLIENT
                  </span>
                ) : (
                  <span className="text-[9px] font-mono text-[#6B7280] dark:text-[#94A3B8] truncate max-w-[90px]">
                    {entity.domain}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-baseline justify-between">
                <span
                  className={`text-xl font-bold font-mono ${
                    entity.isClient ? 'text-[#065F46] dark:text-[#34D399]' : 'text-[#111827] dark:text-[#F8FAFC]'
                  }`}
                >
                  {stats.avgPct}%
                </span>
                <span className="text-[10px] uppercase text-[#6B7280] dark:text-[#94A3B8]">
                  Avg Citation Rate
                </span>
              </div>
              <div className="mt-1.5 text-[10px] text-[#6B7280] dark:text-[#94A3B8] border-t border-[#E5E7EB] dark:border-[#334155] pt-1.5 flex justify-between font-mono">
                <span>Cited in {stats.citedPromptsCount}/{densityData.length} prompts</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* VIEW 1: Heatmap Grid Matrix */}
      {viewMode === 'heatmap' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B]">
                <th
                  onClick={() => {
                    if (sortBy === 'promptText') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('promptText');
                      setSortOrder('asc');
                    }
                  }}
                  className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] cursor-pointer"
                >
                  <div className="flex items-center gap-1">
                    <span>Prompt Query</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                  </div>
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Intent
                </th>
                <th
                  onClick={() => {
                    if (sortBy === 'clientDensity') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('clientDensity');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#065F46] dark:text-[#6EE7B7] bg-[#ECFDF5] dark:bg-[#064E3B]/40 border-x border-[#A7F3D0] dark:border-[#047857] text-center cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>{client.brandName} ({client.domain})</span>
                    <ArrowUpDown className="w-3 h-3 text-[#059669]" />
                  </div>
                </th>
                {topCompetitors.map((comp) => (
                  <th
                    key={comp.brand}
                    className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center"
                  >
                    <div>{comp.brand}</div>
                    <div className="text-[9px] font-mono font-normal text-[#9CA3AF] dark:text-[#64748B]">{comp.domain}</div>
                  </th>
                ))}
                <th
                  onClick={() => {
                    if (sortBy === 'gap') {
                      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                    } else {
                      setSortBy('gap');
                      setSortOrder('desc');
                    }
                  }}
                  className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center cursor-pointer"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Gap Status</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
              {sortedDensityData.length === 0 ? (
                <tr>
                  <td colSpan={allTrackedEntities.length + 3} className="py-8 text-center text-[#9CA3AF]">
                    No prompt queries available for the selected intent filter.
                  </td>
                </tr>
              ) : (
                sortedDensityData.map((row) => {
                  const clientPct = row[client.brandName] || 0;
                  const clientData = row.brandDensityMap[client.brandName];

                  return (
                    <tr
                      key={row.promptId}
                      className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B] cursor-pointer transition-colors"
                      onClick={() => onInspectPrompt && onInspectPrompt(row.promptId)}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-[#111827] dark:text-[#F8FAFC] max-w-sm sm:max-w-md truncate" title={row.promptText}>
                          {row.promptText}
                        </div>
                        <div className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] font-mono">
                          Category: {row.category} • n={row.sampleSize} runs
                        </div>
                      </td>

                      <td className="py-2.5 px-2">
                        <span className="px-1.5 py-0.5 bg-[#F3F4F6] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#94A3B8] text-[10px] font-mono uppercase font-semibold border border-[#E5E7EB] dark:border-[#334155]">
                          {row.intentLayer}
                        </span>
                      </td>

                      {/* Active Client Citation Cell */}
                      <td className="py-2.5 px-3 text-center bg-[#ECFDF5]/30 dark:bg-[#064E3B]/20 border-x border-[#A7F3D0]/60 dark:border-[#047857]/40">
                        <span
                          className={`inline-block px-2.5 py-1 text-xs font-mono rounded border ${getCitationShade(
                            clientPct,
                            true
                          )}`}
                          title={`${client.brandName} domain cited in ${clientData?.count || 0}/${row.sampleSize} runs`}
                        >
                          {clientPct}% ({clientData?.count || 0}/{row.sampleSize})
                        </span>
                      </td>

                      {/* Competitor Citation Cells */}
                      {topCompetitors.map((comp) => {
                        const compPct = row[comp.brand] || 0;
                        const compData = row.brandDensityMap[comp.brand];

                        return (
                          <td key={comp.brand} className="py-2.5 px-3 text-center">
                            <span
                              className={`inline-block px-2.5 py-1 text-xs font-mono rounded border ${getCitationShade(
                                compPct,
                                false
                              )}`}
                              title={`${comp.brand} domain cited in ${compData?.count || 0}/${row.sampleSize} runs`}
                            >
                              {compPct}% ({compData?.count || 0}/{row.sampleSize})
                            </span>
                          </td>
                        );
                      })}

                      {/* Gap Status */}
                      <td className="py-2.5 px-3 text-center font-mono text-xs">
                        {row.gap > 0 && clientPct === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FEF2F2] dark:bg-[#7F1D1D]/40 text-[#DC2626] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#991B1B] text-[10px] font-bold uppercase">
                            <AlertCircle className="w-3 h-3" /> Critical Gap ({row.gap}%)
                          </span>
                        ) : row.gap > 0 ? (
                          <span className="px-2 py-0.5 bg-[#FEF3C7] dark:bg-[#78350F]/40 text-[#D97706] dark:text-[#FDE68A] border border-[#FDE68A] dark:border-[#78350F] text-[10px] font-bold uppercase">
                            Trailing (-{row.gap}%)
                          </span>
                        ) : clientPct > 0 ? (
                          <span className="px-2 py-0.5 bg-[#ECFDF5] dark:bg-[#064E3B]/40 text-[#065F46] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#047857] text-[10px] font-bold uppercase">
                            Client Leads
                          </span>
                        ) : (
                          <span className="text-[#9CA3AF] text-[10px] italic">No Citations</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* VIEW 2: Recharts Bar Chart */}
      {viewMode === 'recharts' && (
        <div className="pt-2 space-y-3">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8]">
            <span>Comparative Citation Density (%) per prompt query</span>
            <span className="font-mono text-[11px]">Sorted by: {sortBy}</span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sortedDensityData} margin={{ top: 10, right: 15, left: -15, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />
                <XAxis
                  dataKey="shortPrompt"
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  interval={0}
                  angle={-15}
                  textAnchor="end"
                />
                <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11, fill: '#6B7280' }} />
                <Tooltip content={<CustomRechartsTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
                  formatter={(value) => <span className="font-medium text-[#374151] dark:text-[#CBD5E1]">{value}</span>}
                />

                {allTrackedEntities.map((entity) => (
                  <Bar
                    key={entity.brand}
                    dataKey={entity.brand}
                    name={`${entity.brand} (${entity.domain})`}
                    fill={entity.color}
                    radius={[3, 3, 0, 0]}
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* VIEW 3: Detailed Table Fallback */}
      {viewMode === 'table' && (
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B]">
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Prompt Query
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Intent
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Sample Size
                </th>
                {allTrackedEntities.map((e) => (
                  <th key={e.brand} className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                    {e.brand} Citation Rate
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
              {sortedDensityData.map((row) => (
                <tr key={row.promptId} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B]">
                  <td className="py-2.5 px-3 font-medium text-[#111827] dark:text-[#F8FAFC]">{row.promptText}</td>
                  <td className="py-2.5 px-3 font-mono text-[#6B7280] dark:text-[#94A3B8]">{row.intentLayer}</td>
                  <td className="py-2.5 px-3 font-mono text-[#6B7280] dark:text-[#94A3B8]">n={row.sampleSize}</td>
                  {allTrackedEntities.map((e) => {
                    const data = row.brandDensityMap[e.brand];
                    return (
                      <td key={e.brand} className="py-2.5 px-3 font-mono font-bold text-[#111827] dark:text-[#F8FAFC]">
                        {data?.percentage || 0}% ({data?.count || 0}/{row.sampleSize} runs)
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer Key */}
      <div className="pt-3 border-t border-[#F3F4F6] dark:border-[#1E293B] flex flex-wrap items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8]">
        <div className="flex items-center gap-3">
          <span className="font-bold uppercase tracking-wider text-[10px] text-[#374151] dark:text-[#CBD5E1]">
            Citation Density Key:
          </span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#10B981] inline-block border border-[#059669]" />
            <span className="text-[11px]">Client Strong (75-100%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#4338CA] inline-block border border-[#3730A3]" />
            <span className="text-[11px]">Competitor High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#FEF3C7] dark:bg-[#78350F]/50 inline-block border border-[#FDE68A]" />
            <span className="text-[11px]">Partial (1-39%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 inline-block border border-[#FEE2E2]" />
            <span className="text-[11px]">0% Citation Gap</span>
          </div>
        </div>

        <div className="text-[10px] font-mono text-[#9CA3AF]">
          Click any row to inspect run details
        </div>
      </div>
    </div>
  );
}
