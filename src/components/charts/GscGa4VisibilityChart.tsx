import { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { TrendingUp, Globe, Search, RefreshCw, BarChart2 } from 'lucide-react';

interface GscSeriesItem {
  date: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface Ga4ReferralItem {
  sourceDomain: string;
  sessions: number;
  users: number;
  conversions: number;
}

interface GscGa4VisibilityChartProps {
  clientDomain: string;
  overallMentionRate: number; // 0 to 1
  totalRuns: number;
}

export function GscGa4VisibilityChart({
  clientDomain,
  overallMentionRate,
  totalRuns,
}: GscGa4VisibilityChartProps) {
  const [gscData, setGscData] = useState<{
    connected: boolean;
    series: GscSeriesItem[];
    totalClicks: number;
    totalImpressions: number;
    error?: string;
  } | null>(null);

  const [ga4Data, setGa4Data] = useState<{
    connected: boolean;
    aiReferrals: Ga4ReferralItem[];
    totalSessions: number;
    totalUsers: number;
    totalConversions: number;
    error?: string;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [metricView, setMetricView] = useState<'clicks' | 'sessions' | 'impressions'>('clicks');

  const fetchData = async (fresh = false) => {
    setLoading(true);
    try {
      // No explicit siteUrl — the server falls back to googleTokens.selectedGscSite,
      // the property actually picked in Settings (often "sc-domain:X", not
      // "https://X"; guessing the URL-prefix form here made lookups fail silently
      // and always fall back to the disconnected/"CALIBRATED DATA" state).
      // Responses are cached server-side for 15min — pass fresh=1 to bypass that
      // (the refresh button below does).
      const suffix = fresh ? '?fresh=1' : '';
      const [gscRes, ga4Res] = await Promise.all([
        fetch(`/api/integrations/gsc/data${suffix}`),
        fetch(`/api/integrations/ga4/data${suffix}`),
      ]);
      const gsc = await gscRes.json();
      const ga4 = await ga4Res.json();
      setGscData(gsc);
      setGa4Data(ga4);
    } catch (err) {
      console.error('Error fetching GSC & GA4 chart data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [clientDomain]);

  if (loading) {
    return (
      <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs space-y-3 animate-pulse">
        <div className="h-4 bg-[#F3F4F6] w-1/3 rounded"></div>
        <div className="h-32 bg-[#F9FAFB] rounded border border-[#E5E7EB]"></div>
      </div>
    );
  }

  const series = gscData?.series || [];

  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4 transition-colors">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[#111827] dark:text-[#F8FAFC]">
              Chart: AI Visibility vs Search Performance (GSC & GA4)
            </h3>
            {gscData?.connected ? (
              <span className="text-[10px] bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border border-[#A7F3D0] dark:border-[#065F46] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                GSC & GA4 CONNECTED
              </span>
            ) : (
              <span className="text-[10px] bg-[#F3F4F6] dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border border-[#E5E7EB] dark:border-[#334155] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                CALIBRATED DATA
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            Correlating Grounded AI Mention Rates ({Math.round(overallMentionRate * 100)}%, n={totalRuns}) with Search Console Organic Performance & GA4 AI Referral Sessions
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setMetricView('clicks')}
            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
              metricView === 'clicks' 
                ? 'bg-[#111827] dark:bg-[#6366F1] text-white' 
                : 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#334155]'
            }`}
          >
            GSC Clicks
          </button>
          <button
            onClick={() => setMetricView('impressions')}
            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
              metricView === 'impressions' 
                ? 'bg-[#111827] dark:bg-[#6366F1] text-white' 
                : 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#4B5563] dark:text-[#CBD5E1] hover:bg-[#E5E7EB] dark:hover:bg-[#334155]'
            }`}
          >
            Impressions
          </button>
          <button
            onClick={() => fetchData(true)}
            title="Refresh GSC & GA4 data"
            className="p-1 bg-[#F3F4F6] dark:bg-[#1E293B] hover:bg-[#E5E7EB] dark:hover:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {(gscData?.error || ga4Data?.error) && (
        <div className="text-xs text-[#DC2626] dark:text-[#F87171] bg-[#FEF2F2] dark:bg-[#450A0A] p-3 border border-[#FECACA] dark:border-[#7F1D1D] space-y-0.5">
          {gscData?.error && <div>GSC: {gscData.error}</div>}
          {ga4Data?.error && <div>GA4: {ga4Data.error}</div>}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: GSC Organic Clicks */}
        <div className="p-3 bg-[#F9FAFB] dark:bg-[#1E293B]/50 border border-[#E5E7EB] dark:border-[#1E293B] rounded-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8]">
            <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Search className="w-3 h-3 text-[#2563EB] dark:text-[#60A5FA]" /> GSC Total Clicks
            </span>
            <span className="font-mono text-[10px] text-[#2563EB] dark:text-[#60A5FA] font-bold">Search Console</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#111827] dark:text-[#F8FAFC]">
            {(gscData?.totalClicks || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
            {(gscData?.totalImpressions || 0).toLocaleString()} Organic Impressions
          </div>
        </div>

        {/* Card 2: GA4 AI Referral Sessions */}
        <div className="p-3 bg-[#F9FAFB] dark:bg-[#1E293B]/50 border border-[#E5E7EB] dark:border-[#1E293B] rounded-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8]">
            <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#059669] dark:text-[#34D399]" /> GA4 AI Referrals
            </span>
            <span className="font-mono text-[10px] text-[#059669] dark:text-[#34D399] font-bold">Analytics 4</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#111827] dark:text-[#F8FAFC]">
            {(ga4Data?.totalSessions || 0).toLocaleString()} <span className="text-xs text-[#6B7280] dark:text-[#94A3B8] font-normal">sessions</span>
          </div>
          <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
            {(ga4Data?.totalConversions || 0)} AI Conversions
          </div>
        </div>

        {/* Card 3: AI Grounded Visibility */}
        <div className="p-3 bg-[#F9FAFB] dark:bg-[#1E293B]/50 border border-[#E5E7EB] dark:border-[#1E293B] rounded-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8]">
            <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#7C3AED] dark:text-[#A78BFA]" /> AI Mention Rate
            </span>
            <span className="font-mono text-[10px] text-[#7C3AED] dark:text-[#A78BFA] font-bold">n={totalRuns}</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#111827] dark:text-[#F8FAFC]">
            {Math.round(overallMentionRate * 100)}%
          </div>
          <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8]">
            Grounded Answer Presence
          </div>
        </div>
      </div>

      {/* GSC Trend Chart: metric bars + avg position line */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#94A3B8] px-1 font-bold uppercase tracking-wider text-[10px]">
          <span>{metricView === 'clicks' ? 'GSC Organic Clicks' : 'GSC Impressions'} (bars, left axis)</span>
          <span>Avg Position (line, right axis — lower is better)</span>
        </div>

        {series.length === 0 ? (
          <div className="text-center text-xs text-[#6B7280] dark:text-[#94A3B8] py-8">No Search Console data for this date range yet.</div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={series} margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#94A3B8' }}
                  tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94A3B8' }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" reversed tick={{ fontSize: 11, fill: '#94A3B8' }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 4, backgroundColor: '#0F172A', borderColor: '#334155', color: '#F8FAFC' }}
                  labelFormatter={(d: string) => new Date(d).toLocaleDateString()}
                  formatter={(value: any, name: string) => {
                    if (name === 'CTR') return [`${(value * 100).toFixed(1)}%`, name];
                    return [value, name];
                  }}
                />
                <Bar
                  yAxisId="left"
                  dataKey={metricView}
                  name={metricView === 'clicks' ? 'Clicks' : 'Impressions'}
                  fill="#3B82F6"
                  radius={[2, 2, 0, 0]}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="position"
                  name="Avg Position"
                  stroke="#A78BFA"
                  strokeWidth={2}
                  dot={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* GA4 AI Traffic Sources Table */}
      <div className="pt-3 border-t border-[#F3F4F6] dark:border-[#1E293B] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC] uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-[#059669] dark:text-[#34D399]" />
            GA4 AI Search Traffic Sources Breakdown
          </span>
          <span className="text-[10px] font-mono text-[#6B7280] dark:text-[#94A3B8]">Total Users: {ga4Data?.totalUsers || 0}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {(ga4Data?.aiReferrals || []).map((ref) => (
            <div key={ref.sourceDomain} className="p-2.5 bg-[#F9FAFB] dark:bg-[#1E293B]/50 border border-[#E5E7EB] dark:border-[#1E293B] rounded-xs space-y-1">
              <div className="font-bold text-xs text-[#111827] dark:text-[#F8FAFC] font-mono">{ref.sourceDomain}</div>
              <div className="flex items-center justify-between text-[11px] text-[#4B5563] dark:text-[#CBD5E1]">
                <span>{ref.sessions} sessions</span>
                <span className="font-bold text-[#059669] dark:text-[#34D399]">{ref.conversions} conv</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
