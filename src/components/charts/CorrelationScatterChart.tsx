import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { CycleAggregate } from '../../types';
import { Activity } from 'lucide-react';

interface GscSeriesItem {
  date: string;
  clicks: number;
  impressions: number;
}

interface CorrelationScatterChartProps {
  cycles: CycleAggregate[];
}

// Finds the GSC day closest to a cycle's start date — cycles run sporadically
// (on-demand), GSC data is daily, so there's rarely an exact date match.
function nearestGscDay(series: GscSeriesItem[], targetDate: Date): GscSeriesItem | null {
  if (series.length === 0) return null;
  let best = series[0];
  let bestDiff = Math.abs(new Date(series[0].date).getTime() - targetDate.getTime());
  for (const item of series) {
    const diff = Math.abs(new Date(item.date).getTime() - targetDate.getTime());
    if (diff < bestDiff) {
      best = item;
      bestDiff = diff;
    }
  }
  return best;
}

export function CorrelationScatterChart({ cycles }: CorrelationScatterChartProps) {
  const [gscSeries, setGscSeries] = useState<GscSeriesItem[]>([]);
  const [gscConnected, setGscConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metric, setMetric] = useState<'clicks' | 'impressions'>('clicks');

  useEffect(() => {
    fetch('/api/integrations/gsc/data')
      .then((res) => (res.ok ? res.json() : { connected: false, series: [] }))
      .then((data) => {
        setGscConnected(Boolean(data.connected));
        setGscSeries(data.series || []);
      })
      .catch(() => setGscConnected(false))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs animate-pulse">
        <div className="h-4 bg-[#F3F4F6] dark:bg-[#1E293B] w-1/3 rounded"></div>
        <div className="h-40 bg-[#F9FAFB] dark:bg-[#1E293B]/40 rounded border border-[#E5E7EB] dark:border-[#334155] mt-3"></div>
      </div>
    );
  }

  if (!gscConnected) {
    return (
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-6 text-center text-xs text-[#6B7280] dark:text-[#94A3B8]">
        Connect Google Search Console in Settings to correlate AI mention rate with organic search performance.
      </div>
    );
  }

  if (cycles.length === 0) {
    return (
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-6 text-center text-xs text-[#6B7280] dark:text-[#94A3B8]">
        No completed run cycles yet to correlate with search performance. Run a measurement cycle first.
      </div>
    );
  }

  const points = cycles
    .map((cycle) => {
      const day = nearestGscDay(gscSeries, new Date(cycle.startedAt));
      if (!day) return null;
      return {
        cycleId: cycle.cycleId,
        date: new Date(cycle.startedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        gscValue: metric === 'clicks' ? day.clicks : day.impressions,
        mentionRate: Math.round((cycle.overallMentionRate ?? 0) * 100),
        runs: cycle.totalRuns,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <div>
          <h3 className="font-bold text-sm text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-[#7C3AED]" />
            AI Mention Rate vs Organic {metric === 'clicks' ? 'Clicks' : 'Impressions'} Correlation
          </h3>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Each point is one measurement cycle — mention rate on that date vs. the nearest day's GSC {metric}.
          </p>
        </div>
        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setMetric('clicks')}
            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
              metric === 'clicks'
                ? 'bg-[#111827] dark:bg-[#4338CA] text-white'
                : 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#334155]'
            }`}
          >
            Clicks
          </button>
          <button
            onClick={() => setMetric('impressions')}
            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
              metric === 'impressions'
                ? 'bg-[#111827] dark:bg-[#4338CA] text-white'
                : 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#334155]'
            }`}
          >
            Impressions
          </button>
        </div>
      </div>

      {points.length === 0 ? (
        <div className="text-center text-xs text-[#6B7280] dark:text-[#94A3B8] py-8">
          No overlapping GSC data for the dates of your run cycles yet.
        </div>
      ) : (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis
                type="number"
                dataKey="gscValue"
                name={metric === 'clicks' ? 'GSC Clicks' : 'GSC Impressions'}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                label={{ value: metric === 'clicks' ? 'GSC Clicks' : 'GSC Impressions', position: 'insideBottom', offset: -5, fontSize: 11, fill: '#6B7280' }}
              />
              <YAxis
                type="number"
                dataKey="mentionRate"
                name="AI Mention Rate"
                unit="%"
                domain={[0, 100]}
                tick={{ fontSize: 11, fill: '#6B7280' }}
                label={{ value: 'AI Mention Rate (%)', angle: -90, position: 'insideLeft', fontSize: 11, fill: '#6B7280' }}
              />
              <ZAxis dataKey="runs" range={[80, 260]} name="Runs" />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                contentStyle={{ fontSize: 12, borderRadius: 4 }}
                formatter={(value: any, name: string) => [value, name]}
                labelFormatter={() => ''}
              />
              <Scatter data={points} fill="#7C3AED" fillOpacity={0.75} />
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
