import { useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import { CycleAggregate, Client } from '../../types';
import { Table, BarChart2, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, Activity, ShieldCheck, CheckCircle2 } from 'lucide-react';

interface PerformanceTrendsChartProps {
  cycles: CycleAggregate[];
  client: Client;
  maxCycles?: number;
}

export function PerformanceTrendsChart({
  cycles,
  client,
  maxCycles = 5,
}: PerformanceTrendsChartProps) {
  const [showTable, setShowTable] = useState(false);

  // Sort cycles chronologically (oldest to newest) and take last maxCycles (5)
  const sortedCycles = [...cycles]
    .sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime())
    .slice(-maxCycles);

  if (sortedCycles.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-6 text-center text-[#6B7280] dark:text-[#94A3B8] text-xs">
        <Activity className="w-8 h-8 mx-auto text-[#9CA3AF] dark:text-[#64748B] mb-2 opacity-50" />
        <p className="font-semibold text-[#111827] dark:text-[#F8FAFC]">No Completed Run Cycles Yet</p>
        <p className="text-[11px] mt-1 text-[#6B7280] dark:text-[#94A3B8]">
          Execute a grounded run cycle to record aggregate mention rate trajectories across execution cycles.
        </p>
      </div>
    );
  }

  // Format chart data points
  const chartData = sortedCycles.map((cycle, idx) => {
    const dateObj = new Date(cycle.startedAt);
    const formattedDate = isNaN(dateObj.getTime())
      ? `Cycle ${idx + 1}`
      : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    const shortDate = isNaN(dateObj.getTime())
      ? `C${idx + 1}`
      : dateObj.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

    const mentionRatePct = Math.round((cycle.overallMentionRate ?? 0) * 100);
    const citationRatePct = Math.round((cycle.overallCitationRate ?? 0) * 100);
    const totalRuns = cycle.totalRuns || 0;

    return {
      cycleId: cycle.cycleId,
      cycleIndex: idx + 1,
      dateLabel: shortDate,
      fullFormattedDate: formattedDate,
      fullDate: cycle.startedAt,
      mentionRate: mentionRatePct,
      citationRate: citationRatePct,
      totalRuns,
      mentionCount: Math.round((cycle.overallMentionRate ?? 0) * totalRuns),
      citationCount: Math.round((cycle.overallCitationRate ?? 0) * totalRuns),
    };
  });

  const firstPoint = chartData[0];
  const latestPoint = chartData[chartData.length - 1];

  const mentionDiff = latestPoint ? latestPoint.mentionRate - (firstPoint?.mentionRate ?? 0) : 0;
  const citationDiff = latestPoint ? latestPoint.citationRate - (firstPoint?.citationRate ?? 0) : 0;

  // Average mention rate over the 5 cycles
  const avgMentionRate = Math.round(
    chartData.reduce((acc, c) => acc + c.mentionRate, 0) / chartData.length
  );

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[#111827] text-white p-3.5 text-xs border border-[#374151] rounded shadow-xl font-sans space-y-2 z-50 min-w-[220px]">
          <div className="font-bold text-xs border-b border-[#374151] pb-1.5 flex items-center justify-between gap-4">
            <span className="text-[#F8FAFC]">Cycle #{data.cycleIndex} ({data.fullFormattedDate})</span>
            <span className="font-mono text-[10px] text-[#9CA3AF]">n={data.totalRuns} runs</span>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-medium text-[#A5B4FC]">
                <span className="w-2 h-2 rounded-full bg-[#6366F1]" />
                Aggregate Mention Rate:
              </span>
              <span className="font-mono font-bold text-white text-sm">{data.mentionRate}%</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 font-medium text-[#6EE7B7]">
                <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                Domain Citation Rate:
              </span>
              <span className="font-mono font-bold text-white text-sm">{data.citationRate}%</span>
            </div>
          </div>
          <div className="text-[10px] text-[#9CA3AF] pt-1.5 border-t border-[#374151]/50 font-mono flex items-center justify-between">
            <span>Mentions: {data.mentionCount}/{data.totalRuns}</span>
            <span>Citations: {data.citationCount}/{data.totalRuns}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-[#4338CA] dark:text-[#818CF8]">
              <Activity className="w-4 h-4" />
              <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
                Aggregate Mention Rate vs Time (Last {chartData.length} Cycles)
              </h3>
            </div>
            <span className="text-[10px] text-[#4B5563] dark:text-[#94A3B8] bg-[#F3F4F6] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] px-2 py-0.5 font-mono">
              Platform Trajectory • n={chartData.reduce((acc, c) => acc + c.totalRuns, 0)} total grounded runs
            </span>

            {/* Trajectory Badges */}
            {chartData.length > 1 ? (
              mentionDiff > 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4338CA] dark:text-[#A5B4FC] border border-[#C7D2FE] dark:border-[#3730A3] px-1.5 py-0.5">
                  <ArrowUpRight className="w-2.5 h-2.5" /> Net Mention Shift +{mentionDiff}%
                </span>
              ) : mentionDiff < 0 ? (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-[#FEF2F2] dark:bg-[#7F1D1D]/30 text-[#991B1B] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#991B1B] px-1.5 py-0.5">
                  <ArrowDownRight className="w-2.5 h-2.5" /> Net Mention Shift {mentionDiff}%
                </span>
              ) : (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-[#F3F4F6] dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#334155] px-1.5 py-0.5">
                  <Minus className="w-2.5 h-2.5" /> Stable Trajectory
                </span>
              )
            ) : null}
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-1">
            Tracking historical aggregate brand presence over time across all prompt runs for <strong>{client.brandName}</strong> ({client.domain}).
          </p>
        </div>

        {/* View Toggle */}
        <button
          onClick={() => setShowTable(!showTable)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] bg-white dark:bg-[#0F172A] hover:bg-[#F3F4F6] dark:hover:bg-[#1E293B] border border-[#D1D5DB] dark:border-[#334155] rounded shadow-xs transition-colors shrink-0"
        >
          {showTable ? <BarChart2 className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
          {showTable ? 'Recharts View' : 'Table Fallback'}
        </button>
      </div>

      {showTable ? (
        /* Accessible Table Fallback */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B]">
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Execution Cycle / Timestamp
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  Sample Size (n)
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  Aggregate Mention Rate
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  Domain Citation Rate
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] text-center">
                  Cycle Stage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
              {chartData.map((dp, i) => (
                <tr key={dp.cycleId} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B]">
                  <td className="py-2.5 px-3 font-semibold text-[#111827] dark:text-[#F8FAFC]">
                    Cycle #{dp.cycleIndex} — <span className="font-normal text-[#6B7280] dark:text-[#94A3B8]">{dp.fullFormattedDate}</span>
                  </td>
                  <td className="py-2.5 px-3 text-[#6B7280] dark:text-[#94A3B8] font-mono text-center">
                    n={dp.totalRuns} runs
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#4338CA] dark:text-[#818CF8] text-center">
                    {dp.mentionRate}% ({dp.mentionCount}/{dp.totalRuns})
                  </td>
                  <td className="py-2.5 px-3 font-mono font-bold text-[#059669] dark:text-[#34D399] text-center">
                    {dp.citationRate}% ({dp.citationCount}/{dp.totalRuns})
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {i === chartData.length - 1 ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#4338CA] dark:text-[#A5B4FC] border border-[#C7D2FE] dark:border-[#3730A3]">
                        Current Latest
                      </span>
                    ) : i === 0 ? (
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 bg-[#F3F4F6] dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#334155]">
                        Initial Baseline
                      </span>
                    ) : (
                      <span className="text-[10px] text-[#9CA3AF] dark:text-[#64748B] font-mono">Cycle #{dp.cycleIndex}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Recharts Visualization */
        <div className="w-full pt-2">
          {/* Legend */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#6366F1]" />
                <span className="font-bold text-[#111827] dark:text-[#F8FAFC]">
                  Aggregate Mention Rate ({client.brandName})
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#10B981]" />
                <span className="font-bold text-[#10B981] dark:text-[#34D399]">
                  Domain Citation Rate ({client.domain})
                </span>
              </div>
            </div>

            <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] font-mono flex items-center gap-3">
              <span>5-Cycle Average: <strong>{avgMentionRate}%</strong></span>
              <span>Sample Range: {firstPoint?.dateLabel} → {latestPoint?.dateLabel}</span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 15, right: 15, left: -15, bottom: 5 }}>
                <defs>
                  <linearGradient id="mentionGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366F1" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#6366F1" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="citationGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>

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

                <Tooltip content={<CustomTooltip />} />

                {/* 5-Cycle Average Reference Line */}
                <ReferenceLine
                  y={avgMentionRate}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  label={{
                    value: `Avg: ${avgMentionRate}%`,
                    position: 'insideTopRight',
                    fill: '#94A3B8',
                    fontSize: 10,
                  }}
                />

                {/* Subtle Area Fills */}
                <Area
                  type="monotone"
                  dataKey="mentionRate"
                  stroke="none"
                  fill="url(#mentionGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="citationRate"
                  stroke="none"
                  fill="url(#citationGrad)"
                />

                {/* Line 1: Brand Mention Rate */}
                <Line
                  type="monotone"
                  dataKey="mentionRate"
                  name="Aggregate Mention Rate"
                  stroke="#6366F1"
                  strokeWidth={3}
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#FFFFFF', fill: '#4338CA' }}
                  dot={{ r: 4.5, strokeWidth: 2, stroke: '#FFFFFF', fill: '#6366F1' }}
                />

                {/* Line 2: Domain Citation Rate */}
                <Line
                  type="monotone"
                  dataKey="citationRate"
                  name="Domain Citation Rate"
                  stroke="#10B981"
                  strokeWidth={3}
                  strokeDasharray="4 4"
                  activeDot={{ r: 7, strokeWidth: 2, stroke: '#FFFFFF', fill: '#047857' }}
                  dot={{ r: 4.5, strokeWidth: 2, stroke: '#FFFFFF', fill: '#10B981' }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
}

