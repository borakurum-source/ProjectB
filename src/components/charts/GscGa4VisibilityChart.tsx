import { useState, useEffect } from 'react';
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
  } | null>(null);

  const [ga4Data, setGa4Data] = useState<{
    connected: boolean;
    aiReferrals: Ga4ReferralItem[];
    totalSessions: number;
    totalUsers: number;
    totalConversions: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [metricView, setMetricView] = useState<'clicks' | 'sessions' | 'impressions'>('clicks');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [gscRes, ga4Res] = await Promise.all([
        fetch(`/api/integrations/gsc/data?siteUrl=${encodeURIComponent('https://' + clientDomain)}`),
        fetch(`/api/integrations/ga4/data`),
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
  const maxMetricVal = Math.max(...series.map((s) => (metricView === 'clicks' ? s.clicks : s.impressions)), 1);

  return (
    <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs space-y-4">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#F3F4F6]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm text-[#111827]">
              Chart: AI Visibility vs Search Performance (GSC & GA4)
            </h3>
            {gscData?.connected ? (
              <span className="text-[10px] bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                GSC & GA4 CONNECTED
              </span>
            ) : (
              <span className="text-[10px] bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] px-1.5 py-0.5 font-bold uppercase tracking-wider">
                CALIBRATED DATA
              </span>
            )}
          </div>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Correlating Grounded AI Mention Rates ({Math.round(overallMentionRate * 100)}%, n={totalRuns}) with Search Console Organic Performance & GA4 AI Referral Sessions
          </p>
        </div>

        <div className="flex items-center gap-1.5 self-start sm:self-auto">
          <button
            onClick={() => setMetricView('clicks')}
            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
              metricView === 'clicks' ? 'bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
            }`}
          >
            GSC Clicks
          </button>
          <button
            onClick={() => setMetricView('impressions')}
            className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
              metricView === 'impressions' ? 'bg-[#111827] text-white' : 'bg-[#F3F4F6] text-[#4B5563] hover:bg-[#E5E7EB]'
            }`}
          >
            Impressions
          </button>
          <button
            onClick={fetchData}
            title="Refresh GSC & GA4 data"
            className="p-1 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#374151] rounded transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Card 1: GSC Organic Clicks */}
        <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Search className="w-3 h-3 text-[#2563EB]" /> GSC Total Clicks
            </span>
            <span className="font-mono text-[10px] text-[#2563EB] font-bold">Search Console</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#111827]">
            {(gscData?.totalClicks || 0).toLocaleString()}
          </div>
          <div className="text-[11px] text-[#6B7280]">
            {(gscData?.totalImpressions || 0).toLocaleString()} Organic Impressions
          </div>
        </div>

        {/* Card 2: GA4 AI Referral Sessions */}
        <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <Globe className="w-3 h-3 text-[#059669]" /> GA4 AI Referrals
            </span>
            <span className="font-mono text-[10px] text-[#059669] font-bold">Analytics 4</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#111827]">
            {(ga4Data?.totalSessions || 0).toLocaleString()} <span className="text-xs text-[#6B7280] font-normal">sessions</span>
          </div>
          <div className="text-[11px] text-[#6B7280]">
            {(ga4Data?.totalConversions || 0)} AI Conversions
          </div>
        </div>

        {/* Card 3: AI Grounded Visibility */}
        <div className="p-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xs space-y-1">
          <div className="flex items-center justify-between text-xs text-[#6B7280]">
            <span className="font-bold uppercase tracking-wider text-[10px] flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-[#7C3AED]" /> AI Mention Rate
            </span>
            <span className="font-mono text-[10px] text-[#7C3AED] font-bold">n={totalRuns}</span>
          </div>
          <div className="text-lg font-bold font-mono text-[#111827]">
            {Math.round(overallMentionRate * 100)}%
          </div>
          <div className="text-[11px] text-[#6B7280]">
            Grounded Answer Presence
          </div>
        </div>
      </div>

      {/* Comparative Bar Chart Visualization */}
      <div className="space-y-2 pt-2">
        <div className="flex items-center justify-between text-xs text-[#6B7280] px-1 font-bold uppercase tracking-wider text-[10px]">
          <span>Date</span>
          <span>{metricView === 'clicks' ? 'GSC Organic Clicks' : 'GSC Impressions'}</span>
        </div>

        <div className="space-y-2">
          {series.map((item) => {
            const val = metricView === 'clicks' ? item.clicks : item.impressions;
            const pct = Math.round((val / maxMetricVal) * 100);

            return (
              <div key={item.date} className="p-2 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xs space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] font-bold text-[#374151]">{item.date}</span>
                  <div className="flex items-center gap-3 font-mono text-[11px]">
                    <span className="font-bold text-[#111827]">
                      {val.toLocaleString()} {metricView}
                    </span>
                    <span className="text-[#6B7280]">CTR: {(item.ctr * 100).toFixed(1)}%</span>
                    <span className="text-[#6B7280]">Pos: {item.position}</span>
                  </div>
                </div>
                <div className="w-full bg-[#E5E7EB] h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#2563EB] transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GA4 AI Traffic Sources Table */}
      <div className="pt-3 border-t border-[#F3F4F6] space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-xs text-[#111827] uppercase tracking-wider flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5 text-[#059669]" />
            GA4 AI Search Traffic Sources Breakdown
          </span>
          <span className="text-[10px] font-mono text-[#6B7280]">Total Users: {ga4Data?.totalUsers || 0}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {(ga4Data?.aiReferrals || []).map((ref) => (
            <div key={ref.sourceDomain} className="p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xs space-y-1">
              <div className="font-bold text-xs text-[#111827] font-mono">{ref.sourceDomain}</div>
              <div className="flex items-center justify-between text-[11px] text-[#4B5563]">
                <span>{ref.sessions} sessions</span>
                <span className="font-bold text-[#059669]">{ref.conversions} conv</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
