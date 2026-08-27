import { useState } from 'react';
import { CycleAggregate, Client } from '../../types';
import { TrendAnalyzer } from '../../services/trends';
import { Table, BarChart2, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, Globe, Layers } from 'lucide-react';

interface ShareOfVoiceChartProps {
  cycles: CycleAggregate[];
  clientBrand: string;
  competitorBrands: string[];
  clientDomain?: string;
  client?: Client;
  maxCycles?: number;
}

const BRAND_COLORS = [
  { stroke: '#111827', fill: '#111827', label: 'Client' },       // Black/Charcoal (Client)
  { stroke: '#10B981', fill: '#D1FAE5', label: 'Competitor 1' }, // Emerald
  { stroke: '#6B7280', fill: '#F3F4F6', label: 'Competitor 2' }, // Slate
  { stroke: '#F59E0B', fill: '#FEF3C7', label: 'Competitor 3' }, // Amber
  { stroke: '#8B5CF6', fill: '#EDE9FE', label: 'Competitor 4' }, // Purple
];

export function ShareOfVoiceChart({
  cycles,
  clientBrand,
  competitorBrands,
  clientDomain,
  client,
  maxCycles = 5,
}: ShareOfVoiceChartProps) {
  const [showTable, setShowTable] = useState(false);
  const [metricMode, setMetricMode] = useState<'sov' | 'citation_mention'>('sov');

  const activeClient: Client = client || {
    id: 'temp',
    ownerId: 'default',
    brandName: clientBrand,
    aliases: [clientBrand],
    domain: clientDomain || `${clientBrand.toLowerCase()}.com`,
    competitorBrands,
    competitorDomains: competitorBrands.map((c) => `${c.toLowerCase()}.com`),
    industry: 'Software',
    market: 'Global',
    language: 'English',
    createdAt: new Date().toISOString(),
  };

  const trendResult = TrendAnalyzer.analyze(cycles, activeClient, maxCycles);
  const { dataPoints, trackedBrands, summary } = trendResult;

  if (dataPoints.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-6 text-center text-[#6B7280] dark:text-[#94A3B8] text-xs">
        No completed run cycles available to compute historical trends.
      </div>
    );
  }

  // Width & height calculation for SVG multi-line chart
  const width = 640;
  const height = 220;
  const padding = { top: 20, right: 30, bottom: 35, left: 45 };
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;

  const xStep = dataPoints.length > 1 ? graphWidth / (dataPoints.length - 1) : graphWidth / 2;

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs transition-colors">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
              {metricMode === 'sov' ? 'Historical Share of Voice Trend' : 'Mention & Citation Rate Trajectory'}
            </h3>
            <span className="text-[10px] text-[#4B5563] dark:text-[#CBD5E1] bg-[#F3F4F6] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] px-2 py-0.5 font-mono">
              Last {dataPoints.length} Cycles (n={summary.totalHistoricalRuns} runs)
            </span>
            {summary.sovTrajectory === 'Improving' && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] px-1.5 py-0.5">
                <ArrowUpRight className="w-2.5 h-2.5" /> +{Math.round(summary.sovChange * 100)}% SOV
              </span>
            )}
            {summary.sovTrajectory === 'Declining' && (
              <span className="inline-flex items-center gap-0.5 text-[9px] font-bold uppercase bg-[#FEF2F2] dark:bg-[#450A0A] text-[#991B1B] dark:text-[#FCA5A5] border border-[#FECACA] dark:border-[#7F1D1D] px-1.5 py-0.5">
                <ArrowDownRight className="w-2.5 h-2.5" /> {Math.round(summary.sovChange * 100)}% SOV
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            {metricMode === 'sov'
              ? 'Deterministic brand mention count / total detected brand mentions across run cycles'
              : 'Grounded model visibility vs verified publisher domain citations over time'}
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Mode Switcher */}
          <div className="inline-flex border border-[#D1D5DB] dark:border-[#334155] p-0.5 bg-[#F9FAFB] dark:bg-[#1E293B]">
            <button
              onClick={() => setMetricMode('sov')}
              className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                metricMode === 'sov'
                  ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] shadow-xs border border-[#E5E7EB] dark:border-[#334155]'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
              }`}
            >
              Share of Voice
            </button>
            <button
              onClick={() => setMetricMode('citation_mention')}
              className={`px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${
                metricMode === 'citation_mention'
                  ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] shadow-xs border border-[#E5E7EB] dark:border-[#334155]'
                  : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
              }`}
            >
              Citation & Mention
            </button>
          </div>

          <button
            onClick={() => setShowTable(!showTable)}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] bg-white dark:bg-[#1E293B] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#D1D5DB] dark:border-[#334155] rounded shadow-xs transition-colors"
            title="Toggle accessible table view"
          >
            {showTable ? <BarChart2 className="w-3.5 h-3.5" /> : <Table className="w-3.5 h-3.5" />}
            {showTable ? 'Chart' : 'Table'}
          </button>
        </div>
      </div>

      {showTable ? (
        /* Accessible Table Fallback */
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] dark:border-[#1E293B] bg-[#F9FAFB] dark:bg-[#1E293B]/50">
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Cycle Date
                </th>
                <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                  Sample Size
                </th>
                {metricMode === 'sov' ? (
                  trackedBrands.map((brand) => (
                    <th key={brand} className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                      {brand} {brand === clientBrand && '(Client)'}
                    </th>
                  ))
                ) : (
                  <>
                    <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                      Mention Rate ({clientBrand})
                    </th>
                    <th className="py-2.5 px-3 font-bold text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8]">
                      Citation Rate ({activeClient.domain})
                    </th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#1E293B]">
              {dataPoints.map((dp) => (
                <tr key={dp.cycleId} className="hover:bg-[#F9FAFB] dark:hover:bg-[#1E293B]/50 transition-colors">
                  <td className="py-2.5 px-3 font-medium text-[#111827] dark:text-[#F8FAFC]">
                    {dp.formattedDate}
                  </td>
                  <td className="py-2.5 px-3 text-[#6B7280] dark:text-[#94A3B8] font-mono">n={dp.totalRuns}</td>
                  {metricMode === 'sov' ? (
                    trackedBrands.map((brand) => {
                      const sov = brand === clientBrand ? dp.clientSov : dp.competitorSovs[brand] ?? 0;
                      return (
                        <td key={brand} className="py-2.5 px-3 font-mono text-[#374151] dark:text-[#CBD5E1]">
                          {Math.round(sov * 100)}%
                        </td>
                      );
                    })
                  ) : (
                    <>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#111827] dark:text-[#F8FAFC]">
                        {Math.round(dp.clientMentionRate * 100)}%
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#059669] dark:text-[#10B981]">
                        {Math.round(dp.clientCitationRate * 100)}%
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        /* Multi-Line SVG Trend Chart */
        <div>
          {/* Legend */}
          <div className="flex flex-wrap items-center gap-4 mb-3 text-xs">
            {metricMode === 'sov' ? (
              trackedBrands.map((brand, idx) => {
                const color = BRAND_COLORS[idx % BRAND_COLORS.length];
                return (
                  <div key={brand} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color.stroke }} />
                    <span className={brand === clientBrand ? 'font-bold text-[#111827] dark:text-[#F8FAFC]' : 'text-[#6B7280] dark:text-[#94A3B8]'}>
                      {brand} {brand === clientBrand && '(Client)'}
                    </span>
                  </div>
                );
              })
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#111827] dark:bg-[#F8FAFC]" />
                  <span className="font-bold text-[#111827] dark:text-[#F8FAFC]">Mention Rate ({clientBrand})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#059669] dark:bg-[#10B981]" />
                  <span className="font-bold text-[#059669] dark:text-[#10B981]">Domain Citation Rate ({activeClient.domain})</span>
                </div>
              </>
            )}
          </div>

          <div className="relative w-full overflow-x-auto">
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto max-h-56">
              {/* Y Axis Gridlines & Labels */}
              {[0, 0.25, 0.5, 0.75, 1.0].map((val) => {
                const y = padding.top + graphHeight - val * graphHeight;
                return (
                  <g key={`y-grid-${val}`}>
                    <line
                      x1={padding.left}
                      y1={y}
                      x2={width - padding.right}
                      y2={y}
                      className="stroke-[#E5E7EB] dark:stroke-[#1E293B]"
                      strokeDasharray="3 3"
                    />
                    <text
                      x={padding.left - 8}
                      y={y + 3}
                      textAnchor="end"
                      fontSize="10"
                      className="fill-[#9CA3AF] dark:fill-[#64748B]"
                      fontFamily="monospace"
                    >
                      {Math.round(val * 100)}%
                    </text>
                  </g>
                );
              })}

              {/* Mode: Share of Voice Lines */}
              {metricMode === 'sov' &&
                trackedBrands.map((brand, brandIdx) => {
                  const color = BRAND_COLORS[brandIdx % BRAND_COLORS.length];
                  const points = dataPoints.map((dp, i) => {
                    const sov = brand === clientBrand ? dp.clientSov : dp.competitorSovs[brand] ?? 0;
                    const x = dataPoints.length === 1 ? padding.left + graphWidth / 2 : padding.left + i * xStep;
                    const y = padding.top + graphHeight - sov * graphHeight;
                    return { x, y, sov, totalRuns: dp.totalRuns, date: dp.formattedDate };
                  });

                  const pathData = points.reduce((acc, p, i) => {
                    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                  }, '');

                  return (
                    <g key={`brand-line-${brand}-${brandIdx}`}>
                      <path
                        d={pathData}
                        fill="none"
                        stroke={color.stroke}
                        strokeWidth={brand === clientBrand ? 2.5 : 1.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {points.map((p, pIdx) => (
                        <circle
                          key={`point-${brand}-${pIdx}`}
                          cx={p.x}
                          cy={p.y}
                          r={brand === clientBrand ? 4 : 3}
                          fill={color.stroke}
                          className="stroke-white dark:stroke-[#0F172A]"
                          strokeWidth="1.5"
                        >
                          <title>{`${brand}: ${Math.round(p.sov * 100)}% (n=${p.totalRuns}) on ${p.date}`}</title>
                        </circle>
                      ))}
                    </g>
                  );
                })}

              {/* Mode: Citation & Mention Rate Lines */}
              {metricMode === 'citation_mention' && (
                <g key="citation-mention-group">
                  {/* Mention Rate Line */}
                  {(() => {
                    const points = dataPoints.map((dp, i) => {
                      const rate = dp.clientMentionRate;
                      const x = dataPoints.length === 1 ? padding.left + graphWidth / 2 : padding.left + i * xStep;
                      const y = padding.top + graphHeight - rate * graphHeight;
                      return { x, y, rate, totalRuns: dp.totalRuns, date: dp.formattedDate };
                    });
                    const pathData = points.reduce((acc, p, i) => {
                      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                    }, '');
                    return (
                      <g key="mention-rate-line">
                        <path
                          d={pathData}
                          fill="none"
                          className="stroke-[#111827] dark:stroke-[#6366F1]"
                          strokeWidth={2.5}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {points.map((p, pIdx) => (
                          <circle
                            key={`mention-pt-${pIdx}`}
                            cx={p.x}
                            cy={p.y}
                            r={4}
                            className="fill-[#111827] dark:fill-[#6366F1] stroke-white dark:stroke-[#0F172A]"
                            strokeWidth="1.5"
                          >
                            <title>{`Mention Rate: ${Math.round(p.rate * 100)}% (n=${p.totalRuns}) on ${p.date}`}</title>
                          </circle>
                        ))}
                      </g>
                    );
                  })()}

                  {/* Citation Rate Line */}
                  {(() => {
                    const points = dataPoints.map((dp, i) => {
                      const rate = dp.clientCitationRate;
                      const x = dataPoints.length === 1 ? padding.left + graphWidth / 2 : padding.left + i * xStep;
                      const y = padding.top + graphHeight - rate * graphHeight;
                      return { x, y, rate, totalRuns: dp.totalRuns, date: dp.formattedDate };
                    });
                    const pathData = points.reduce((acc, p, i) => {
                      return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
                    }, '');
                    return (
                      <g key="citation-rate-line">
                        <path
                          d={pathData}
                          fill="none"
                          className="stroke-[#059669] dark:stroke-[#10B981]"
                          strokeWidth={2.5}
                          strokeDasharray="4 4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        {points.map((p, pIdx) => (
                          <circle
                            key={`citation-pt-${pIdx}`}
                            cx={p.x}
                            cy={p.y}
                            r={4}
                            className="fill-[#059669] dark:fill-[#10B981] stroke-white dark:stroke-[#0F172A]"
                            strokeWidth="1.5"
                          >
                            <title>{`Citation Rate: ${Math.round(p.rate * 100)}% (n=${p.totalRuns}) on ${p.date}`}</title>
                          </circle>
                        ))}
                      </g>
                    );
                  })()}
                </g>
              )}

              {/* X Axis Labels */}
              {dataPoints.map((dp, i) => {
                const x = dataPoints.length === 1 ? padding.left + graphWidth / 2 : padding.left + i * xStep;
                return (
                  <text
                    key={`x-label-${dp.cycleId || i}-${i}`}
                    x={x}
                    y={height - 8}
                    textAnchor="middle"
                    fontSize="10"
                    className="fill-[#6B7280] dark:fill-[#94A3B8]"
                  >
                    {dp.formattedDate} (n={dp.totalRuns})
                  </text>
                );
              })}
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}

