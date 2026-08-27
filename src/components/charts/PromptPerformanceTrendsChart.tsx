import { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { CycleAggregate, Run, Prompt, Client, IntentLayer } from '../../types';
import {
  TrendingUp,
  Table,
  BarChart2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Filter,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
} from 'lucide-react';

interface PromptPerformanceTrendsChartProps {
  cycles: CycleAggregate[];
  runs: Run[];
  prompts: Prompt[];
  client: Client;
  maxCycles?: number;
  onInspectPrompt?: (promptId: string) => void;
}

// Distinct high-contrast palette for prompt trajectory lines (accessible, anti-slop)
const LINE_COLORS = [
  '#4F46E5', // Indigo
  '#059669', // Emerald
  '#D97706', // Amber
  '#DB2777', // Pink
  '#0284C7', // Sky
  '#7C3AED', // Violet
  '#EA580C', // Orange
  '#0D9488', // Teal
  '#475569', // Slate
  '#DC2626', // Red
];

export function PromptPerformanceTrendsChart({
  cycles,
  runs,
  prompts,
  client,
  maxCycles = 5,
  onInspectPrompt,
}: PromptPerformanceTrendsChartProps) {
  const [viewMode, setViewMode] = useState<'chart' | 'table'>('chart');
  const [selectedPromptIds, setSelectedPromptIds] = useState<string[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [intentFilter, setIntentFilter] = useState<string>('ALL');
  const [metricType, setMetricType] = useState<'mentionRate' | 'citationRate'>('mentionRate');

  // Sort cycles chronologically (oldest to newest) and take the last maxCycles (5)
  const sortedCycles = useMemo(() => {
    return [...cycles]
      .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
      .slice(-maxCycles);
  }, [cycles, maxCycles]);

  // Categories and Intents available for filtering
  const categories = useMemo(() => {
    const cats = Array.from(new Set(prompts.map((p) => p.category).filter(Boolean)));
    return cats.sort();
  }, [prompts]);

  const intents = useMemo(() => {
    const ints = Array.from(new Set(prompts.map((p) => p.intentLayer).filter(Boolean)));
    return ints.sort();
  }, [prompts]);

  // Filter prompts according to category & intent
  const filteredPrompts = useMemo(() => {
    return prompts.filter((p) => {
      if (categoryFilter !== 'ALL' && p.category !== categoryFilter) return false;
      if (intentFilter !== 'ALL' && p.intentLayer !== intentFilter) return false;
      return true;
    });
  }, [prompts, categoryFilter, intentFilter]);

  // Active prompts to plot (if selectedPromptIds is empty, show top 5 active prompts)
  const activePromptList = useMemo(() => {
    if (selectedPromptIds.length > 0) {
      return filteredPrompts.filter((p) => selectedPromptIds.includes(p.id));
    }
    // Default to top 5 filtered prompts (prefer active ones)
    return [...filteredPrompts]
      .sort((a, b) => (b.active ? 1 : 0) - (a.active ? 1 : 0))
      .slice(0, 5);
  }, [filteredPrompts, selectedPromptIds]);

  // Compute per-prompt mention & citation rates for each cycle
  const { promptStats, chartData, overallTrendData } = useMemo(() => {
    if (sortedCycles.length === 0) {
      return { promptStats: [], chartData: [], overallTrendData: [] };
    }

    // Per-prompt time series calculation
    const promptStatsList = filteredPrompts.map((p) => {
      const cyclePoints = sortedCycles.map((cycle, idx) => {
        const cycleRuns = runs.filter(
          (r) => r.cycleId === cycle.cycleId && r.promptId === p.id
        );
        const sampleSize = cycleRuns.length;
        const mentionCount = cycleRuns.filter((r) => r.brandMentioned).length;
        const citationCount = cycleRuns.filter((r) => r.brandCited).length;
        const mentionRate = sampleSize > 0 ? Math.round((mentionCount / sampleSize) * 100) : null;
        const citationRate = sampleSize > 0 ? Math.round((citationCount / sampleSize) * 100) : null;

        return {
          cycleId: cycle.cycleId,
          cycleIndex: idx + 1,
          startedAt: cycle.startedAt,
          sampleSize,
          mentionCount,
          citationCount,
          mentionRate,
          citationRate,
        };
      });

      const measuredPoints = cyclePoints.filter((cp) => cp.mentionRate !== null);
      const firstMeasured = measuredPoints[0];
      const latestMeasured = measuredPoints[measuredPoints.length - 1];

      const mentionDelta =
        firstMeasured && latestMeasured && measuredPoints.length > 1
          ? (latestMeasured.mentionRate ?? 0) - (firstMeasured.mentionRate ?? 0)
          : 0;

      const citationDelta =
        firstMeasured && latestMeasured && measuredPoints.length > 1
          ? (latestMeasured.citationRate ?? 0) - (firstMeasured.citationRate ?? 0)
          : 0;

      const totalRuns = cyclePoints.reduce((acc, c) => acc + c.sampleSize, 0);
      const totalMentions = cyclePoints.reduce((acc, c) => acc + c.mentionCount, 0);
      const overallAvgMentionRate =
        totalRuns > 0 ? Math.round((totalMentions / totalRuns) * 100) : 0;

      return {
        prompt: p,
        cyclePoints,
        measuredCount: measuredPoints.length,
        firstMeasured,
        latestMeasured,
        mentionDelta,
        citationDelta,
        totalRuns,
        overallAvgMentionRate,
      };
    });

    // Recharts Data Series: one data object per cycle
    const dataSeries = sortedCycles.map((cycle, idx) => {
      const dateObj = new Date(cycle.startedAt);
      const dateLabel = isNaN(dateObj.getTime())
        ? `Cycle ${idx + 1}`
        : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

      const cycleRuns = runs.filter((r) => r.cycleId === cycle.cycleId);
      const totalCycleRuns = cycleRuns.length || cycle.totalRuns || 0;
      const overallMentionPct = Math.round((cycle.overallMentionRate ?? 0) * 100);
      const overallCitationPct = Math.round((cycle.overallCitationRate ?? 0) * 100);

      const dataPoint: Record<string, any> = {
        cycleId: cycle.cycleId,
        dateLabel,
        fullDate: cycle.startedAt,
        cycleIndex: idx + 1,
        totalCycleRuns,
        overallMentionRate: overallMentionPct,
        overallCitationRate: overallCitationPct,
      };

      // Populate each prompt's rate for this cycle
      filteredPrompts.forEach((p) => {
        const pRuns = cycleRuns.filter((r) => r.promptId === p.id);
        const sample = pRuns.length;
        const mentions = pRuns.filter((r) => r.brandMentioned).length;
        const citations = pRuns.filter((r) => r.brandCited).length;
        
        dataPoint[`prompt_${p.id}_mention`] = sample > 0 ? Math.round((mentions / sample) * 100) : null;
        dataPoint[`prompt_${p.id}_citation`] = sample > 0 ? Math.round((citations / sample) * 100) : null;
        dataPoint[`prompt_${p.id}_sample`] = sample;
      });

      return dataPoint;
    });

    return {
      promptStats: promptStatsList,
      chartData: dataSeries,
      overallTrendData: dataSeries,
    };
  }, [sortedCycles, runs, filteredPrompts]);

  const togglePromptSelection = (id: string) => {
    setSelectedPromptIds((prev) => {
      if (prev.includes(id)) {
        return prev.filter((pId) => pId !== id);
      }
      if (prev.length >= 8) {
        return prev; // Cap at 8 simultaneous lines for visual clarity
      }
      return [...prev, id];
    });
  };

  const handleSelectAllFiltered = () => {
    setSelectedPromptIds(filteredPrompts.slice(0, 6).map((p) => p.id));
  };

  const handleClearSelection = () => {
    setSelectedPromptIds([]);
  };

  if (sortedCycles.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-6 text-center text-[#6B7280] dark:text-[#94A3B8] text-xs">
        <Layers className="w-8 h-8 mx-auto text-[#9CA3AF] dark:text-[#64748B] mb-2 opacity-50" />
        <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">No Run Cycles Recorded Yet</p>
        <p className="text-[11px] mt-1 text-[#6B7280] dark:text-[#94A3B8]">
          Execute a grounded run cycle to track prompt performance trajectories (mention rate vs time).
        </p>
      </div>
    );
  }

  // Custom Tooltip for Recharts
  const CustomTrendsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#111827] text-white p-3.5 text-xs border border-[#374151] rounded shadow-xl font-sans space-y-2 z-50 max-w-sm">
          <div className="font-bold text-xs border-b border-[#374151] pb-1.5 flex items-center justify-between gap-4">
            <span className="text-[#F8FAFC]">{label} ({new Date(data.fullDate).toLocaleDateString()})</span>
            <span className="font-mono text-[10px] text-[#9CA3AF]">
              n={data.totalCycleRuns} total runs
            </span>
          </div>

          <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
            {/* Overall Brand Average */}
            <div className="flex items-center justify-between gap-3 text-[11px] pb-1 border-b border-[#374151]/50">
              <span className="text-[#9CA3AF] flex items-center gap-1.5 font-medium">
                <span className="w-2 h-2 rounded-full bg-white/70" />
                Overall Brand Avg:
              </span>
              <span className="font-mono font-bold text-white">
                {metricType === 'mentionRate' ? data.overallMentionRate : data.overallCitationRate}%
              </span>
            </div>

            {/* Display each plotted prompt */}
            {activePromptList.map((p, idx) => {
              const key = metricType === 'mentionRate' ? `prompt_${p.id}_mention` : `prompt_${p.id}_citation`;
              const val = data[key];
              const sample = data[`prompt_${p.id}_sample`] || 0;
              const color = LINE_COLORS[idx % LINE_COLORS.length];

              if (val === null || val === undefined) return null;

              return (
                <div key={p.id ? `tt_${p.id}` : `tt_idx_${idx}`} className="flex items-center justify-between gap-3 text-[11px]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-[#E5E7EB] truncate max-w-[190px]" title={p.text}>
                      {p.text}
                    </span>
                  </div>
                  <div className="font-mono font-bold shrink-0 text-right">
                    <span className="text-white">{val}%</span>{' '}
                    <span className="text-[10px] text-[#9CA3AF] font-normal">(n={sample})</span>
                  </div>
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
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[#4338CA] dark:text-[#818CF8]">
              <TrendingUp className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
                Prompt Performance Trends (Last {sortedCycles.length} Cycles)
              </h3>
            </div>
            <span className="text-[10px] text-[#4B5563] dark:text-[#94A3B8] bg-[#F3F4F6] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] px-2 py-0.5 font-mono">
              Recharts Multi-Cycle Trajectory • {filteredPrompts.length} Prompts
            </span>
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Tracking individual prompt mention rates over time to identify improving vs trailing query positions.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* Metric Selector (Mention Rate vs Citation Rate) */}
          <div className="inline-flex border border-[#D1D5DB] dark:border-[#334155] p-0.5 bg-[#F9FAFB] dark:bg-[#1E293B] rounded-xs text-[11px]">
            <button
              onClick={() => setMetricType('mentionRate')}
              className={`px-2.5 py-1 font-bold uppercase tracking-wider transition-colors ${
                metricType === 'mentionRate'
                  ? 'bg-white dark:bg-[#0F172A] text-[#4338CA] dark:text-[#818CF8] shadow-xs border border-[#E5E7EB] dark:border-[#334155]'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
              }`}
            >
              Mention Rate (%)
            </button>
            <button
              onClick={() => setMetricType('citationRate')}
              className={`px-2.5 py-1 font-bold uppercase tracking-wider transition-colors ${
                metricType === 'citationRate'
                  ? 'bg-white dark:bg-[#0F172A] text-[#059669] dark:text-[#34D399] shadow-xs border border-[#E5E7EB] dark:border-[#334155]'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
              }`}
            >
              Citation Rate (%)
            </button>
          </div>

          {/* View Toggle */}
          <button
            onClick={() => setViewMode(viewMode === 'chart' ? 'table' : 'chart')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] bg-white dark:bg-[#0F172A] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B] border border-[#D1D5DB] dark:border-[#334155] rounded shadow-xs transition-colors"
          >
            {viewMode === 'chart' ? <Table className="w-3.5 h-3.5" /> : <BarChart2 className="w-3.5 h-3.5" />}
            {viewMode === 'chart' ? 'Table View' : 'Recharts View'}
          </button>
        </div>
      </div>

      {/* Filter Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-[#F9FAFB] dark:bg-[#1E293B]/50 p-2.5 border border-[#E5E7EB] dark:border-[#1E293B]">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#94A3B8] font-semibold text-[11px]">
            <Filter className="w-3.5 h-3.5 text-[#4338CA] dark:text-[#818CF8]" />
            <span>Category:</span>
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2 py-1 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] text-[#111827] dark:text-[#F8FAFC] text-[11px] rounded font-medium focus:outline-hidden"
          >
            <option value="ALL">All Categories ({prompts.length})</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex items-center gap-1.5 text-[#6B7280] dark:text-[#94A3B8] font-semibold text-[11px] ml-2">
            <span>Intent:</span>
          </div>
          <select
            value={intentFilter}
            onChange={(e) => setIntentFilter(e.target.value)}
            className="px-2 py-1 bg-white dark:bg-[#0F172A] border border-[#D1D5DB] dark:border-[#334155] text-[#111827] dark:text-[#F8FAFC] text-[11px] rounded font-medium focus:outline-hidden"
          >
            <option value="ALL">All Intents</option>
            {intents.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </div>

        {/* Prompt Selection Presets */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
            Plotting: <strong>{activePromptList.length}</strong> of {filteredPrompts.length} prompts
          </span>
          <button
            onClick={handleSelectAllFiltered}
            className="text-[10px] font-bold uppercase text-[#4338CA] dark:text-[#818CF8] hover:underline"
          >
            Top 6
          </button>
          {selectedPromptIds.length > 0 && (
            <button
              onClick={handleClearSelection}
              className="text-[10px] font-bold uppercase text-[#6B7280] dark:text-[#94A3B8] hover:underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Prompts Quick-Select Chips */}
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto py-1">
        {filteredPrompts.map((p, idx) => {
          const isSelected = activePromptList.some((ap) => ap.id === p.id);
          const color = isSelected
            ? LINE_COLORS[activePromptList.findIndex((ap) => ap.id === p.id) % LINE_COLORS.length]
            : undefined;

          return (
            <button
              key={p.id ? `chip_${p.id}` : `chip_idx_${idx}`}
              onClick={() => togglePromptSelection(p.id)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium border rounded transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] border-[#111827] dark:border-[#818CF8] font-bold shadow-xs'
                  : 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border-[#E5E7EB] dark:border-[#334155] hover:border-[#9CA3AF]'
              }`}
              title={`Click to toggle line on chart: "${p.text}"`}
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: color || '#9CA3AF' }}
              />
              <span className="truncate max-w-[160px]">{p.text}</span>
            </button>
          );
        })}
      </div>

      {viewMode === 'chart' ? (
        /* Recharts Multi-Line Visualization */
        <div className="w-full pt-2">
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.2} />

                <XAxis
                  dataKey="dateLabel"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />

                <YAxis
                  domain={[0, 100]}
                  unit="%"
                  tick={{ fontSize: 11, fill: '#6B7280' }}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />

                <Tooltip content={<CustomTrendsTooltip />} />

                {/* Overall Brand Average Reference Line (Dotted) */}
                <Line
                  type="monotone"
                  dataKey={metricType === 'mentionRate' ? 'overallMentionRate' : 'overallCitationRate'}
                  name="Overall Brand Avg"
                  stroke="#94A3B8"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  dot={{ r: 3, fill: '#94A3B8' }}
                />

                {/* Prompt Specific Trajectory Lines */}
                {activePromptList.map((p, idx) => {
                  const dataKey = metricType === 'mentionRate' ? `prompt_${p.id}_mention` : `prompt_${p.id}_citation`;
                  const color = LINE_COLORS[idx % LINE_COLORS.length];

                  return (
                    <Line
                      key={p.id ? `line_${p.id}` : `line_idx_${idx}`}
                      type="monotone"
                      dataKey={dataKey}
                      name={p.text}
                      stroke={color}
                      strokeWidth={2.5}
                      connectNulls={true}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: '#FFFFFF', fill: color }}
                      dot={{ r: 4, strokeWidth: 1.5, stroke: '#FFFFFF', fill: color }}
                    />
                  );
                })}
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#F3F4F6] dark:border-[#1E293B] text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-[#94A3B8] inline-block border-t border-dashed border-[#94A3B8]" />
                Dashed Line = Overall Brand Average
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#4F46E5] inline-block" />
                Solid Lines = Selected Tracked Prompts
              </span>
            </div>
            <span className="font-mono">
              Sample Range: {chartData[0]?.dateLabel} → {chartData[chartData.length - 1]?.dateLabel}
            </span>
          </div>
        </div>
      ) : (
        /* Accessible Table Fallback */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B]">
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] min-w-[240px]">
                  Tracked Prompt
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Category / Intent
                </th>
                {sortedCycles.map((c, i) => {
                  const dateObj = new Date(c.startedAt);
                  const label = isNaN(dateObj.getTime())
                    ? `C${i + 1}`
                    : `${dateObj.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' })} ${dateObj.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
                  return (
                    <th
                      key={c.cycleId ? `th_cycle_${c.cycleId}_${i}` : `th_cycle_${i}`}
                      className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center"
                    >
                      {label}
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  5-Cycle Net Trend
                </th>
                <th className="py-2.5 px-2 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  Total Runs
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
              {promptStats.map((ps, psIdx) => {
                const delta = metricType === 'mentionRate' ? ps.mentionDelta : ps.citationDelta;

                return (
                  <tr key={ps.prompt.id ? `tr_ps_${ps.prompt.id}_${psIdx}` : `tr_ps_idx_${psIdx}`} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B]">
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-[#111827] dark:text-[#F8FAFC]">
                        {ps.prompt.text}
                      </div>
                      <div className="text-[10px] text-[#9CA3AF] font-mono">
                        ID: {ps.prompt.id} • Active: {ps.prompt.active ? 'Yes' : 'Paused'}
                      </div>
                    </td>
                    <td className="py-2.5 px-2">
                      <div className="text-[10px] font-semibold text-[#374151] dark:text-[#CBD5E1]">
                        {ps.prompt.category}
                      </div>
                      <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] font-mono">
                        {ps.prompt.intentLayer}
                      </div>
                    </td>

                    {/* Rates per cycle */}
                    {ps.cyclePoints.map((cp, cpIdx) => {
                      const rate = metricType === 'mentionRate' ? cp.mentionRate : cp.citationRate;
                      const count = metricType === 'mentionRate' ? cp.mentionCount : cp.citationCount;

                      return (
                        <td key={cp.cycleId ? `td_cp_${ps.prompt.id}_${cp.cycleId}_${cpIdx}` : `td_cp_${ps.prompt.id}_${cpIdx}`} className="py-2.5 px-2 text-center">
                          {rate !== null ? (
                            <span
                              className={`font-mono text-[11px] font-bold px-1.5 py-0.5 border ${
                                rate >= 80
                                  ? 'bg-[#111827] dark:bg-[#6366F1] text-white border-[#111827] dark:border-[#6366F1]'
                                  : rate >= 50
                                  ? 'bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4338CA] dark:text-[#A5B4FC] border-[#C7D2FE] dark:border-[#3730A3]'
                                  : rate > 0
                                  ? 'bg-[#F9FAFB] dark:bg-[#1E293B] text-[#374151] dark:text-[#CBD5E1] border-[#E5E7EB] dark:border-[#334155]'
                                  : 'bg-white dark:bg-[#0F172A] text-[#9CA3AF] border-transparent'
                              }`}
                            >
                              {rate}% ({count}/{cp.sampleSize})
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF] dark:text-[#64748B] text-[10px]">—</span>
                          )}
                        </td>
                      );
                    })}

                    {/* Net Trend Badge */}
                    <td className="py-2.5 px-3 text-center">
                      {ps.measuredCount <= 1 ? (
                        <span className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] font-mono">Baseline (1 cycle)</span>
                      ) : delta > 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 bg-[#ECFDF5] dark:bg-[#064E3B]/40 text-[#065F46] dark:text-[#6EE7B7] border border-[#A7F3D0] dark:border-[#047857]">
                          <ArrowUpRight className="w-3 h-3" /> +{delta}%
                        </span>
                      ) : delta < 0 ? (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#991B1B]">
                          <ArrowDownRight className="w-3 h-3" /> {delta}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-bold uppercase px-1.5 py-0.5 bg-[#F3F4F6] dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#334155]">
                          <Minus className="w-3 h-3" /> Stable
                        </span>
                      )}
                    </td>

                    {/* Total Sample Size */}
                    <td className="py-2.5 px-2 text-center font-mono text-[#6B7280] dark:text-[#94A3B8]">
                      n={ps.totalRuns}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
