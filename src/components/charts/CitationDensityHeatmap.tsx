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
import { Client, PromptAggregate, Prompt, Run, GroundingSource, EngineId } from '../../types';
import { detectClientCitation, normalizeDomain } from '../../services/metrics';
import {
  BarChart2,
  LayoutGrid,
  Table,
  ArrowUpDown,
  Flame,
  AlertCircle,
  Filter,
  Zap,
  Cpu,
  Layers,
  CheckCircle2,
  TrendingUp,
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

const ENGINE_COLORS: Record<string, string> = {
  'Gemini Grounded': '#6366F1', // Indigo
  'Perplexity Sonar': '#10B981', // Emerald
};

export function CitationDensityHeatmap({
  client,
  promptAggregates,
  prompts,
  runs,
  onInspectPrompt,
  onDiagnosePrompt,
}: CitationDensityHeatmapProps) {
  const [viewMode, setViewMode] = useState<'heatmap' | 'recharts' | 'table'>('heatmap');
  const [selectedIntent, setSelectedIntent] = useState<string>('ALL');
  const [selectedEngine, setSelectedEngine] = useState<'ALL' | EngineId>('ALL');
  const [isEngineOverlay, setIsEngineOverlay] = useState<boolean>(false);
  const [sortBy, setSortBy] = useState<'clientDensity' | 'promptText' | 'gap' | 'engineDelta'>('clientDensity');
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

  // Filter runs by selected engine if overlay is inactive
  const filteredRuns = useMemo(() => {
    if (isEngineOverlay || selectedEngine === 'ALL') {
      return runs;
    }
    return runs.filter((r) => r.engine === selectedEngine);
  }, [runs, selectedEngine, isEngineOverlay]);

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
        const promptRuns = filteredRuns.filter((r) => r.promptId === pa.promptId);
        const totalSampleSize = promptRuns.length || pa.runsCount || 1;

        if (isEngineOverlay) {
          // Engine Overlay Mode calculations (Gemini Grounded vs Perplexity Sonar)
          const geminiRuns = promptRuns.filter((r) => r.engine === 'gemini-grounded');
          const perplexityRuns = promptRuns.filter((r) => r.engine === 'perplexity-sonar');

          const geminiSampleSize = geminiRuns.length || 1;
          const perplexitySampleSize = perplexityRuns.length || 1;

          let geminiClientCount = 0;
          geminiRuns.forEach((r) => {
            if (checkRunCitation(r, client.domain, client.brandName)) {
              geminiClientCount++;
            }
          });

          let perplexityClientCount = 0;
          perplexityRuns.forEach((r) => {
            if (checkRunCitation(r, client.domain, client.brandName)) {
              perplexityClientCount++;
            }
          });

          const geminiClientPct = Math.round((geminiClientCount / geminiSampleSize) * 100);
          const perplexityClientPct = Math.round((perplexityClientCount / perplexitySampleSize) * 100);
          const engineDelta = geminiClientPct - perplexityClientPct;

          let dominantEngine: 'Gemini Lead' | 'Perplexity Lead' | 'Parity' | '0% Citation' = 'Parity';
          if (geminiClientPct > perplexityClientPct) dominantEngine = 'Gemini Lead';
          else if (perplexityClientPct > geminiClientPct) dominantEngine = 'Perplexity Lead';
          else if (geminiClientPct === 0 && perplexityClientPct === 0) dominantEngine = '0% Citation';

          // Compute max competitor citation rate across both engines for gap analysis
          let maxCompPct = 0;
          topCompetitors.forEach((comp) => {
            let compCount = 0;
            promptRuns.forEach((r) => {
              if (checkRunCitation(r, comp.domain, comp.brand)) compCount++;
            });
            const compPct = Math.round((compCount / totalSampleSize) * 100);
            if (compPct > maxCompPct) maxCompPct = compPct;
          });

          const rechartsRow: Record<string, any> = {
            promptId: pa.promptId,
            promptText: pa.promptText,
            shortPrompt: pa.promptText.length > 32 ? pa.promptText.slice(0, 32) + '...' : pa.promptText,
            intentLayer: pa.intentLayer,
            category: pa.category,
            sampleSize: totalSampleSize,
            geminiSampleSize,
            perplexitySampleSize,
            geminiClientCount,
            perplexityClientCount,
            'Gemini Grounded': geminiClientPct,
            'Perplexity Sonar': perplexityClientPct,
            engineDelta,
            dominantEngine,
            maxCompPct,
            gap: Math.max(0, maxCompPct - Math.max(geminiClientPct, perplexityClientPct)),
          };

          return rechartsRow;
        }

        // Standard Mode calculations (All Entities across selected engine)
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
    filteredRuns,
    isEngineOverlay,
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
      if (sortBy === 'engineDelta' && isEngineOverlay) {
        return sortOrder === 'asc' ? a.engineDelta - b.engineDelta : b.engineDelta - a.engineDelta;
      }
      // Default: clientDensity
      if (isEngineOverlay) {
        const aVal = Math.max(a['Gemini Grounded'] || 0, a['Perplexity Sonar'] || 0);
        const bVal = Math.max(b['Gemini Grounded'] || 0, b['Perplexity Sonar'] || 0);
        return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const clientA = a[client.brandName] || 0;
      const clientB = b[client.brandName] || 0;
      return sortOrder === 'asc' ? clientA - clientB : clientB - clientA;
    });
  }, [densityData, sortBy, sortOrder, client, isEngineOverlay]);

  // Calculate summary metrics across all prompts
  const summaryMetrics = useMemo(() => {
    if (densityData.length === 0) return { engineStats: {}, entityStats: {} };

    if (isEngineOverlay) {
      let geminiSum = 0;
      let perplexitySum = 0;
      let geminiLeadCount = 0;
      let perplexityLeadCount = 0;

      densityData.forEach((row) => {
        geminiSum += row['Gemini Grounded'] || 0;
        perplexitySum += row['Perplexity Sonar'] || 0;
        if (row.dominantEngine === 'Gemini Lead') geminiLeadCount++;
        if (row.dominantEngine === 'Perplexity Lead') perplexityLeadCount++;
      });

      const geminiAvg = Math.round(geminiSum / densityData.length);
      const perplexityAvg = Math.round(perplexitySum / densityData.length);
      const delta = geminiAvg - perplexityAvg;

      return {
        isOverlay: true,
        engineStats: {
          geminiAvg,
          perplexityAvg,
          delta,
          geminiLeadCount,
          perplexityLeadCount,
        },
      };
    }

    // Standard mode entity totals
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
      isOverlay: false,
      entityStats: entityTotals,
    };
  }, [densityData, isEngineOverlay, allTrackedEntities]);

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

          {isEngineOverlay ? (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-[#6366F1]">
                  <span className="w-2 h-2 rounded-full bg-[#6366F1] inline-block" />
                  Gemini Grounded:
                </span>
                <span className="font-bold text-white">
                  {row['Gemini Grounded']}% ({row.geminiClientCount}/{row.geminiSampleSize})
                </span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="flex items-center gap-1.5 text-[#10B981]">
                  <span className="w-2 h-2 rounded-full bg-[#10B981] inline-block" />
                  Perplexity Sonar:
                </span>
                <span className="font-bold text-white">
                  {row['Perplexity Sonar']}% ({row.perplexityClientCount}/{row.perplexitySampleSize})
                </span>
              </div>
              <div className="border-t border-[#374151] pt-1 text-[10px] text-[#9CA3AF] flex justify-between">
                <span>Engine Advantage:</span>
                <span className="font-bold text-white font-mono">{row.dominantEngine} ({row.engineDelta > 0 ? `+${row.engineDelta}% Gemini` : row.engineDelta < 0 ? `+${Math.abs(row.engineDelta)}% Perplexity` : 'Equal'})</span>
              </div>
            </div>
          ) : (
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
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
      {/* Header & Control Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[#059669] dark:text-[#34D399]">
              <Flame className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
                Citation Density Matrix
              </h3>
            </div>
            <span className="text-[10px] text-[#4B5563] dark:text-[#94A3B8] bg-[#F3F4F6] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] px-2 py-0.5 font-mono">
              {isEngineOverlay
                ? 'Engine Performance Overlay Active'
                : selectedEngine === 'ALL'
                ? 'All Visibility Engines'
                : selectedEngine === 'gemini-grounded'
                ? 'Gemini Grounded Only'
                : 'Perplexity Sonar Only'}{' '}
              • n={filteredRuns.length} runs
            </span>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Visualizing domain citation rates in grounded AI responses for <strong>{client.brandName}</strong> ({client.domain}) vs top market competitors across tracked prompt queries.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Engine Selector Dropdown */}
          <div className="flex items-center gap-1 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#D1D5DB] dark:border-[#334155] rounded px-2 py-1">
            <Cpu className="w-3.5 h-3.5 text-[#6366F1]" />
            <select
              value={selectedEngine}
              disabled={isEngineOverlay}
              onChange={(e) => setSelectedEngine(e.target.value as any)}
              className="text-xs bg-transparent text-[#374151] dark:text-[#CBD5E1] font-medium focus:outline-hidden cursor-pointer disabled:opacity-50"
            >
              <option value="ALL">All Engines (Combined)</option>
              <option value="gemini-grounded">Gemini Grounded</option>
              <option value="perplexity-sonar">Perplexity Sonar</option>
            </select>
          </div>

          {/* Engine Performance Overlay Toggle Button */}
          <button
            onClick={() => setIsEngineOverlay(!isEngineOverlay)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded border transition-all cursor-pointer ${
              isEngineOverlay
                ? 'bg-[#4338CA] text-white border-[#3730A3] shadow-xs'
                : 'bg-white dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border-[#D1D5DB] dark:border-[#334155] hover:bg-[#F9FAFB]'
            }`}
            title="Toggle Engine Performance Overlay mode (Gemini Grounded vs Perplexity Sonar)"
          >
            <Zap className={`w-3.5 h-3.5 ${isEngineOverlay ? 'text-amber-300 fill-amber-300' : 'text-[#6366F1]'}`} />
            Engine Overlay
          </button>

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
          <div className="flex items-center bg-[#F3F4F6] dark:bg-[#1E293B] p-0.5 rounded border border-[#E5E7EB] dark:border-[#334155]">
            <button
              onClick={() => setViewMode('heatmap')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                viewMode === 'heatmap'
                  ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Heatmap
            </button>
            <button
              onClick={() => setViewMode('recharts')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                viewMode === 'recharts'
                  ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] shadow-xs'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827]'
              }`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Recharts Bar
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
      {isEngineOverlay ? (
        /* Engine Performance Comparison Header Cards */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {/* Gemini Grounded Card */}
          <div className="p-3 bg-[#EEF2FF] dark:bg-[#312E81]/30 border border-[#C7D2FE] dark:border-[#4338CA] rounded-xs">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs text-[#3730A3] dark:text-[#A5B4FC]">
                Gemini Grounded
              </span>
              <span className="text-[9px] font-mono text-[#4338CA] dark:text-[#C7D2FE] bg-white/60 dark:bg-black/30 px-1.5 py-0.5 rounded">
                googleSearch
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-[#1E1B4B] dark:text-[#F8FAFC]">
                {summaryMetrics.engineStats?.geminiAvg}%
              </span>
              <span className="text-[10px] uppercase text-[#4338CA] dark:text-[#A5B4FC]">
                Avg Citation Rate
              </span>
            </div>
            <div className="mt-1.5 text-[10px] text-[#4338CA] dark:text-[#A5B4FC] border-t border-[#C7D2FE] dark:border-[#4338CA] pt-1.5 flex justify-between font-mono">
              <span>Leads in {summaryMetrics.engineStats?.geminiLeadCount} prompts</span>
            </div>
          </div>

          {/* Perplexity Sonar Card */}
          <div className="p-3 bg-[#ECFDF5] dark:bg-[#064E3B]/30 border border-[#A7F3D0] dark:border-[#047857] rounded-xs">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs text-[#065F46] dark:text-[#6EE7B7]">
                Perplexity Sonar
              </span>
              <span className="text-[9px] font-mono text-[#047857] dark:text-[#A7F3D0] bg-white/60 dark:bg-black/30 px-1.5 py-0.5 rounded">
                sonar-pro
              </span>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-[#064E3B] dark:text-[#F8FAFC]">
                {summaryMetrics.engineStats?.perplexityAvg}%
              </span>
              <span className="text-[10px] uppercase text-[#047857] dark:text-[#6EE7B7]">
                Avg Citation Rate
              </span>
            </div>
            <div className="mt-1.5 text-[10px] text-[#047857] dark:text-[#6EE7B7] border-t border-[#A7F3D0] dark:border-[#047857] pt-1.5 flex justify-between font-mono">
              <span>Leads in {summaryMetrics.engineStats?.perplexityLeadCount} prompts</span>
            </div>
          </div>

          {/* Engine Differential Card */}
          <div className="p-3 bg-white dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] rounded-xs">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">
                Engine Differential
              </span>
              <TrendingUp className="w-3.5 h-3.5 text-[#6366F1]" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-[#111827] dark:text-[#F8FAFC]">
                {summaryMetrics.engineStats?.delta && summaryMetrics.engineStats.delta > 0
                  ? `+${summaryMetrics.engineStats.delta}%`
                  : `${summaryMetrics.engineStats?.delta}%`}
              </span>
              <span className="text-[10px] uppercase text-[#6B7280] dark:text-[#94A3B8]">
                Gemini vs Sonar Gap
              </span>
            </div>
            <div className="mt-1.5 text-[10px] text-[#6B7280] dark:text-[#94A3B8] border-t border-[#E5E7EB] dark:border-[#334155] pt-1.5 font-mono">
              {summaryMetrics.engineStats?.delta && summaryMetrics.engineStats.delta > 0
                ? 'Gemini Grounded yields higher citations'
                : summaryMetrics.engineStats?.delta && summaryMetrics.engineStats.delta < 0
                ? 'Perplexity Sonar yields higher citations'
                : 'Equal citation parity across engines'}
            </div>
          </div>

          {/* Engine Parity Stats */}
          <div className="p-3 bg-[#F9FAFB] dark:bg-[#1E293B]/50 border border-[#E5E7EB] dark:border-[#334155] rounded-xs">
            <div className="flex items-center justify-between gap-1">
              <span className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC]">
                Cross-Engine Coverage
              </span>
              <Layers className="w-3.5 h-3.5 text-[#059669]" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold font-mono text-[#111827] dark:text-[#F8FAFC]">
                {Math.round(
                  (((summaryMetrics.engineStats?.geminiLeadCount || 0) +
                    (summaryMetrics.engineStats?.perplexityLeadCount || 0)) /
                    (densityData.length || 1)) *
                    100
                )}
                %
              </span>
              <span className="text-[10px] uppercase text-[#6B7280] dark:text-[#94A3B8]">
                Prompts Discovered
              </span>
            </div>
            <div className="mt-1.5 text-[10px] text-[#6B7280] dark:text-[#94A3B8] border-t border-[#E5E7EB] dark:border-[#334155] pt-1.5 font-mono">
              Tracked across 2 engine architectures
            </div>
          </div>
        </div>
      ) : (
        /* Standard Entity Leaderboard Cards */
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
                    <span className="text-[9px] font-mono text-[#6B7280] dark:text-[#94A3B8] truncate" title={entity.domain}>
                      {entity.domain}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-baseline justify-between">
                  <span className="text-2xl font-bold font-mono text-[#111827] dark:text-[#F8FAFC]">
                    {stats.avgPct}%
                  </span>
                  <span className="text-[10px] uppercase text-[#6B7280] dark:text-[#94A3B8]">
                    Avg Citation
                  </span>
                </div>

                <div className="mt-1.5 text-[10px] text-[#6B7280] dark:text-[#94A3B8] border-t border-[#E5E7EB] dark:border-[#334155] pt-1.5 flex justify-between font-mono">
                  <span>Cited in {stats.citedPromptsCount}/{densityData.length} prompts</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

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
                  className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] cursor-pointer hover:text-[#111827] dark:hover:text-[#F8FAFC]"
                >
                  <div className="flex items-center gap-1">
                    <span>Tracked Prompt</span>
                    <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                  </div>
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] w-20">
                  Intent
                </th>

                {isEngineOverlay ? (
                  /* Engine Overlay Columns */
                  <>
                    <th
                      onClick={() => {
                        setSortBy('clientDensity');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#4338CA] dark:text-[#A5B4FC] bg-[#EEF2FF] dark:bg-[#312E81]/30 border-x border-[#C7D2FE] dark:border-[#4338CA] text-center cursor-pointer"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Gemini Grounded</span>
                        <ArrowUpDown className="w-3 h-3 text-[#6366F1]" />
                      </div>
                    </th>
                    <th
                      onClick={() => {
                        setSortBy('clientDensity');
                        setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                      }}
                      className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#065F46] dark:text-[#6EE7B7] bg-[#ECFDF5] dark:bg-[#064E3B]/30 border-r border-[#A7F3D0] dark:border-[#047857] text-center cursor-pointer"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Perplexity Sonar</span>
                        <ArrowUpDown className="w-3 h-3 text-[#10B981]" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                      Top Competitor Max
                    </th>
                    <th
                      onClick={() => {
                        if (sortBy === 'engineDelta') {
                          setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
                        } else {
                          setSortBy('engineDelta');
                          setSortOrder('desc');
                        }
                      }}
                      className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center cursor-pointer"
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span>Engine Advantage</span>
                        <ArrowUpDown className="w-3 h-3 text-[#9CA3AF]" />
                      </div>
                    </th>
                  </>
                ) : (
                  /* Standard Mode Columns */
                  <>
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
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
              {sortedDensityData.length === 0 ? (
                <tr>
                  <td colSpan={isEngineOverlay ? 6 : allTrackedEntities.length + 3} className="py-8 text-center text-[#9CA3AF]">
                    No prompt queries available for the selected intent filter.
                  </td>
                </tr>
              ) : (
                sortedDensityData.map((row) => {
                  if (isEngineOverlay) {
                    const geminiPct = row['Gemini Grounded'] || 0;
                    const ppxPct = row['Perplexity Sonar'] || 0;

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

                        {/* Gemini Grounded Citation Cell */}
                        <td className="py-2.5 px-3 text-center bg-[#EEF2FF]/40 dark:bg-[#312E81]/20 border-x border-[#C7D2FE]/60 dark:border-[#4338CA]/40">
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-mono rounded border ${getCitationShade(
                              geminiPct,
                              true
                            )}`}
                            title={`Gemini Grounded domain citations: ${row.geminiClientCount}/${row.geminiSampleSize} runs`}
                          >
                            {geminiPct}% ({row.geminiClientCount}/{row.geminiSampleSize})
                          </span>
                        </td>

                        {/* Perplexity Sonar Citation Cell */}
                        <td className="py-2.5 px-3 text-center bg-[#ECFDF5]/40 dark:bg-[#064E3B]/20 border-r border-[#A7F3D0]/60 dark:border-[#047857]/40">
                          <span
                            className={`inline-block px-2.5 py-1 text-xs font-mono rounded border ${getCitationShade(
                              ppxPct,
                              true
                            )}`}
                            title={`Perplexity Sonar domain citations: ${row.perplexityClientCount}/${row.perplexitySampleSize} runs`}
                          >
                            {ppxPct}% ({row.perplexityClientCount}/{row.perplexitySampleSize})
                          </span>
                        </td>

                        {/* Top Competitor Max */}
                        <td className="py-2.5 px-3 text-center font-mono text-xs text-[#4B5563] dark:text-[#CBD5E1]">
                          {row.maxCompPct}%
                        </td>

                        {/* Engine Advantage */}
                        <td className="py-2.5 px-3 text-center font-mono text-xs">
                          {row.dominantEngine === 'Gemini Lead' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#EEF2FF] dark:bg-[#312E81]/40 text-[#4338CA] dark:text-[#A5B4FC] border border-[#C7D2FE] dark:border-[#4338CA] text-[10px] font-bold uppercase">
                              Gemini (+{row.engineDelta}%)
                            </span>
                          ) : row.dominantEngine === 'Perplexity Lead' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#ECFDF5] dark:bg-[#064E3B]/40 text-[#065F46] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#047857] text-[10px] font-bold uppercase">
                              Sonar (+{Math.abs(row.engineDelta)}%)
                            </span>
                          ) : row.dominantEngine === 'Parity' ? (
                            <span className="px-2 py-0.5 bg-[#F3F4F6] dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border border-[#E5E7EB] text-[10px] font-bold uppercase">
                              Equal Parity
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF] text-[10px] italic">0% Citation</span>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  // Standard Mode Row
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
            <span>
              {isEngineOverlay
                ? 'Engine Citation Density Comparison (Gemini Grounded vs Perplexity Sonar) per prompt'
                : 'Comparative Citation Density (%) per prompt query'}
            </span>
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

                {isEngineOverlay ? (
                  <>
                    <Bar
                      dataKey="Gemini Grounded"
                      name="Gemini Grounded"
                      fill="#6366F1"
                      radius={[3, 3, 0, 0]}
                    />
                    <Bar
                      dataKey="Perplexity Sonar"
                      name="Perplexity Sonar"
                      fill="#10B981"
                      radius={[3, 3, 0, 0]}
                    />
                  </>
                ) : (
                  allTrackedEntities.map((entity) => (
                    <Bar
                      key={entity.brand}
                      dataKey={entity.brand}
                      name={`${entity.brand} (${entity.domain})`}
                      fill={entity.color}
                      radius={[3, 3, 0, 0]}
                    />
                  ))
                )}
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
                {isEngineOverlay ? (
                  <>
                    <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#4338CA] dark:text-[#A5B4FC]">
                      Gemini Citation Rate
                    </th>
                    <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#065F46] dark:text-[#6EE7B7]">
                      Perplexity Citation Rate
                    </th>
                    <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                      Engine Delta
                    </th>
                  </>
                ) : (
                  allTrackedEntities.map((e) => (
                    <th key={e.brand} className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                      {e.brand} Citation Rate
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
              {sortedDensityData.map((row) => (
                <tr key={row.promptId} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B]">
                  <td className="py-2.5 px-3 font-medium text-[#111827] dark:text-[#F8FAFC]">{row.promptText}</td>
                  <td className="py-2.5 px-3 font-mono text-[#6B7280] dark:text-[#94A3B8]">{row.intentLayer}</td>
                  <td className="py-2.5 px-3 font-mono text-[#6B7280] dark:text-[#94A3B8]">n={row.sampleSize}</td>
                  {isEngineOverlay ? (
                    <>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#4338CA] dark:text-[#A5B4FC]">
                        {row['Gemini Grounded']}% ({row.geminiClientCount}/{row.geminiSampleSize})
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#065F46] dark:text-[#6EE7B7]">
                        {row['Perplexity Sonar']}% ({row.perplexityClientCount}/{row.perplexitySampleSize})
                      </td>
                        <td className="py-2.5 px-3 font-mono font-bold text-[#111827] dark:text-[#F8FAFC]">
                        {row.engineDelta > 0 ? `+${row.engineDelta}% Gemini` : row.engineDelta < 0 ? `+${Math.abs(row.engineDelta)}% Sonar` : '0% Parity'}
                      </td>
                    </>
                  ) : (
                    allTrackedEntities.map((e) => {
                      const data = row.brandDensityMap[e.brand];
                      return (
                        <td key={e.brand} className="py-2.5 px-3 font-mono font-bold text-[#111827] dark:text-[#F8FAFC]">
                          {data?.percentage || 0}% ({data?.count || 0}/{row.sampleSize} runs)
                        </td>
                      );
                    })
                  )}
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
            {isEngineOverlay ? 'Engine Legend:' : 'Citation Density Key:'}
          </span>
          {isEngineOverlay ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#6366F1] inline-block rounded-xs" />
                <span className="text-[11px] font-medium text-[#374151] dark:text-[#CBD5E1]">Gemini Grounded</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 bg-[#10B981] inline-block rounded-xs" />
                <span className="text-[11px] font-medium text-[#374151] dark:text-[#CBD5E1]">Perplexity Sonar</span>
              </div>
            </>
          ) : (
            <>
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
            </>
          )}
        </div>

        <div className="text-[10px] font-mono text-[#9CA3AF]">
          Click any row to inspect run details
        </div>
      </div>
    </div>
  );
}
