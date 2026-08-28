import { useState, useEffect, ReactNode, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  BarChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
} from 'recharts';
import { Client } from '../../types';
import { Search, FileText, Globe2, Bot, RefreshCw, TrendingUp, Smartphone } from 'lucide-react';

interface GscRow {
  key: string;
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

interface GscInsights {
  connected: boolean;
  queries: GscRow[];
  pages: GscRow[];
  countries: GscRow[];
  devices: GscRow[];
}

interface Ga4LandingPage {
  landingPage: string;
  sessions: number;
  conversions: number;
}

interface GscSeriesItem {
  date: string;
  clicks: number;
  impressions: number;
}

interface Ga4TrendItem {
  date: string;
  sessions: number;
}

interface SearchInsightsTabProps {
  client: Client;
}

const DATE_RANGES: { label: string; days: number }[] = [
  { label: '1 Month', days: 30 },
  { label: '3 Months', days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year', days: 365 },
];

// Simple least-squares linear fit over (index, value) pairs — used to project
// the trend forward. Deliberately the simplest honest method available: no
// seasonality, no external signals, just "if the current trend continues."
// Labeled as a projection everywhere it's shown, never presented as a forecast.
function linearFit(values: number[]): { slope: number; intercept: number } {
  const n = values.length;
  if (n < 2) return { slope: 0, intercept: values[0] || 0 };
  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  values.forEach((y, x) => {
    num += (x - xMean) * (y - yMean);
    den += (x - xMean) * (x - xMean);
  });
  const slope = den === 0 ? 0 : num / den;
  const intercept = yMean - slope * xMean;
  return { slope, intercept };
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function RowsTable({
  rows,
  keyLabel,
  keyFormatter,
}: {
  rows: GscRow[];
  keyLabel: string;
  keyFormatter?: (key: string) => string;
}) {
  if (rows.length === 0) {
    return <div className="text-center text-xs text-[#6B7280] dark:text-[#94A3B8] py-8">No data for this date range yet.</div>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] border-b border-[#E5E7EB] dark:border-[#1E293B]">
            <th className="text-left font-bold py-2 pr-3">{keyLabel}</th>
            <th className="text-right font-bold py-2 px-2">Clicks</th>
            <th className="text-right font-bold py-2 px-2">Impressions</th>
            <th className="text-right font-bold py-2 px-2">CTR</th>
            <th className="text-right font-bold py-2 pl-2">Avg Pos</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className="border-b border-[#F3F4F6] dark:border-[#1E293B] last:border-0">
              <td className="py-1.5 pr-3 font-mono text-[#111827] dark:text-[#F8FAFC] truncate max-w-xs" title={r.key}>
                {keyFormatter ? keyFormatter(r.key) : r.key}
              </td>
              <td className="py-1.5 px-2 text-right font-bold text-[#111827] dark:text-[#F8FAFC]">{r.clicks.toLocaleString()}</td>
              <td className="py-1.5 px-2 text-right text-[#4B5563] dark:text-[#CBD5E1]">{r.impressions.toLocaleString()}</td>
              <td className="py-1.5 px-2 text-right text-[#4B5563] dark:text-[#CBD5E1]">{(r.ctr * 100).toFixed(1)}%</td>
              <td className="py-1.5 pl-2 text-right text-[#4B5563] dark:text-[#CBD5E1]">{r.position}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: typeof Search;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-3">
      <div className="pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
        <h3 className="font-bold text-sm text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5">
          <Icon className="w-4 h-4 text-[#4338CA] dark:text-[#818CF8]" />
          {title}
        </h3>
        <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

const DEVICE_COLORS: Record<string, string> = {
  MOBILE: '#4338CA',
  DESKTOP: '#059669',
  TABLET: '#D97706',
};

export function SearchInsightsTab({ client }: SearchInsightsTabProps) {
  const [days, setDays] = useState(90);
  const [gsc, setGsc] = useState<GscInsights | null>(null);
  const [gscSeries, setGscSeries] = useState<GscSeriesItem[]>([]);
  const [ga4Series, setGa4Series] = useState<Ga4TrendItem[]>([]);
  const [landingPages, setLandingPages] = useState<Ga4LandingPage[]>([]);
  const [connected, setConnected] = useState({ gsc: false, ga4: false });
  const [loading, setLoading] = useState(true);

  const fetchAll = async (fresh = false) => {
    setLoading(true);
    const params = `days=${days}${fresh ? '&fresh=1' : ''}`;
    try {
      const [gscInsightsRes, gscDataRes, ga4TrendRes, ga4LandingRes] = await Promise.all([
        fetch(`/api/integrations/gsc/insights?${params}`),
        fetch(`/api/integrations/gsc/data?${params}`),
        fetch(`/api/integrations/ga4/trend?${params}`),
        fetch(`/api/integrations/ga4/ai-landing-pages?${params}`),
      ]);
      const gscInsights = await gscInsightsRes.json();
      const gscData = await gscDataRes.json();
      const ga4Trend = await ga4TrendRes.json();
      const ga4Landing = await ga4LandingRes.json();

      setGsc(gscInsights);
      setGscSeries(gscData.series || []);
      setGa4Series(ga4Trend.series || []);
      setLandingPages(ga4Landing.landingPages || []);
      setConnected({
        gsc: Boolean(gscInsights.connected || gscData.connected),
        ga4: Boolean(ga4Trend.connected || ga4Landing.connected),
      });
    } catch (err) {
      console.error('Failed to load search insights:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client.id, days]);

  const shortenPage = (path: string) => (path.length > 48 ? path.slice(0, 45) + '...' : path);

  // Merge GSC clicks + GA4 AI-referral sessions into one dated series, then
  // extend both with a linear projection covering ~25% of the selected range.
  const trendChartData = useMemo(() => {
    const byDate = new Map<string, { date: string; clicks?: number; aiSessions?: number }>();
    for (const s of gscSeries) {
      byDate.set(s.date, { ...byDate.get(s.date), date: s.date, clicks: s.clicks });
    }
    for (const s of ga4Series) {
      byDate.set(s.date, { ...byDate.get(s.date), date: s.date, aiSessions: s.sessions });
    }
    const merged = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
    if (merged.length === 0) return [];

    const clicksVals = merged.map((m) => m.clicks ?? 0);
    const aiVals = merged.map((m) => m.aiSessions ?? 0);
    const clicksFit = linearFit(clicksVals);
    const aiFit = linearFit(aiVals);

    const projectionDays = Math.max(7, Math.round(merged.length * 0.25));
    const lastDate = merged[merged.length - 1].date;
    const lastIdx = merged.length - 1;

    const withProjectedFlag = merged.map((m) => ({ ...m, clicksProjected: undefined as number | undefined, aiSessionsProjected: undefined as number | undefined }));
    // Bridge point so the dashed projection line connects to the last real point.
    withProjectedFlag[lastIdx].clicksProjected = withProjectedFlag[lastIdx].clicks;
    withProjectedFlag[lastIdx].aiSessionsProjected = withProjectedFlag[lastIdx].aiSessions;

    const projected = Array.from({ length: projectionDays }, (_, i) => {
      const idx = lastIdx + 1 + i;
      return {
        date: addDays(lastDate, i + 1),
        clicksProjected: Math.max(0, Math.round(clicksFit.slope * idx + clicksFit.intercept)),
        aiSessionsProjected: Math.max(0, Math.round(aiFit.slope * idx + aiFit.intercept)),
      };
    });

    return [...withProjectedFlag, ...projected];
  }, [gscSeries, ga4Series]);

  const clicksTrendDirection = useMemo(() => {
    if (gscSeries.length < 2) return null;
    const fit = linearFit(gscSeries.map((s) => s.clicks));
    return fit.slope;
  }, [gscSeries]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
            Search Insights
          </h2>
          <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
            What Google Search Console & GA4 actually tell you for AEO/GEO: which queries and pages already
            have organic pull, where the audience is, which pages AI assistants are already sending readers
            to, and where the trend is headed.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1 bg-[#F3F4F6] dark:bg-[#1E293B] rounded p-0.5">
            {DATE_RANGES.map((r) => (
              <button
                key={r.days}
                onClick={() => setDays(r.days)}
                className={`px-2.5 py-1 text-xs font-bold uppercase tracking-wider rounded transition-colors ${
                  days === r.days
                    ? 'bg-[#111827] dark:bg-[#4338CA] text-white'
                    : 'text-[#4B5563] dark:text-[#94A3B8] hover:bg-[#E5E7EB] dark:hover:bg-[#334155]'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => fetchAll(true)}
            disabled={loading}
            className="px-3 py-1.5 bg-[#F3F4F6] dark:bg-[#1E293B] hover:bg-[#E5E7EB] dark:hover:bg-[#334155] text-[#374151] dark:text-[#CBD5E1] rounded text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-1.5 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {!loading && !connected.gsc && !connected.ga4 && (
        <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-6 text-center text-xs text-[#6B7280] dark:text-[#94A3B8]">
          Connect Google Search Console & Analytics 4 in Settings to see search insights here.
        </div>
      )}

      {/* AEO / GEO Strategic Roadmap & Synergy Card */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-4">
        <div className="flex items-start justify-between border-b border-[#E5E7EB] dark:border-[#1E293B] pb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest bg-[#F9FAFB] dark:bg-[#1E293B] text-[#111827] dark:text-[#F8FAFC] border border-[#E5E7EB] dark:border-[#334155] rounded">
                GEO / AEO Strategic Guide
              </span>
              <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#94A3B8]">
                How GSC &amp; GA4 Directly Power AI Engine Visibility
              </span>
            </div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">
              Converting Search Console &amp; Analytics Data into AI Search Citations
            </h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="bg-[#F9FAFB] dark:bg-[#1E293B]/60 p-4 border border-[#E5E7EB] dark:border-[#1E293B] rounded space-y-2">
            <div className="font-bold text-xs uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5">
              <Search className="w-3.5 h-3.5 text-[#111827] dark:text-[#CBD5E1]" />
              1. GSC Impression = LLM Candidate
            </div>
            <p className="text-xs text-[#4B5563] dark:text-[#94A3B8] leading-relaxed">
              Gemini, Perplexity ve ChatGPT Search arama dizinlerini kullanır. GSC&apos;de yüksek gösterim (impression) alan sayfalarınız, yapay zeka modellerinin ilk taradığı ve atıf (citation) yaptığı ana kaynaklardır.
            </p>
          </div>

          <div className="bg-[#F9FAFB] dark:bg-[#1E293B]/60 p-4 border border-[#E5E7EB] dark:border-[#1E293B] rounded space-y-2">
            <div className="font-bold text-xs uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5">
              <Bot className="w-3.5 h-3.5 text-[#111827] dark:text-[#CBD5E1]" />
              2. GA4 AI Trafiği = ROI Ölçümü
            </div>
            <p className="text-xs text-[#4B5563] dark:text-[#94A3B8] leading-relaxed">
              ChatGPT, Perplexity ve Gemini yanıtlarındaki bağlantılardan gelen gerçek ziyaretçileri ölçer. AI görünürlüğünüzün doğrudan organik trafiğe ve dönüşüme (conversion) etkisini doğrular.
            </p>
          </div>

          <div className="bg-[#F9FAFB] dark:bg-[#1E293B]/60 p-4 border border-[#E5E7EB] dark:border-[#1E293B] rounded space-y-2">
            <div className="font-bold text-xs uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-[#111827] dark:text-[#CBD5E1]" />
              3. AEO/GEO Fırsat Tespiti
            </div>
            <p className="text-xs text-[#4B5563] dark:text-[#94A3B8] leading-relaxed">
              GSC&apos;de gösterimi yüksek ama LLM atıfı (citation) henüz oluşmamış sayfalar <strong>AEO Öncelikli İyileştirme Hedefidir</strong>. Bu sayfalara karşılaştırma tablosu ve JSON-LD schema eklenmelidir.
            </p>
          </div>
        </div>
      </div>

      {/* Trend + Projection */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs space-y-3">
        <div className="pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B] flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-sm text-[#111827] dark:text-[#F8FAFC] flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#4338CA] dark:text-[#818CF8]" />
              Organic Clicks vs AI Referral Sessions — Trend & Projection
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              Solid = actual. Dashed = linear trend projection from the selected period — a simple
              "if this continues" extrapolation, not a guarantee.
            </p>
          </div>
          {clicksTrendDirection !== null && (
            <span
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded border ${
                clicksTrendDirection > 0
                  ? 'bg-[#ECFDF5] dark:bg-[#064E3B] text-[#065F46] dark:text-[#A7F3D0] border-[#A7F3D0] dark:border-[#065F46]'
                  : clicksTrendDirection < 0
                  ? 'bg-[#FEF2F2] dark:bg-[#7F1D1D] text-[#DC2626] dark:text-[#FCA5A5] border-[#FECACA] dark:border-[#991B1B]'
                  : 'bg-[#F3F4F6] dark:bg-[#1E293B] text-[#6B7280] dark:text-[#94A3B8] border-[#E5E7EB] dark:border-[#334155]'
              }`}
            >
              Clicks trend: {clicksTrendDirection > 0 ? 'Rising' : clicksTrendDirection < 0 ? 'Falling' : 'Flat'}
            </span>
          )}
        </div>

        {trendChartData.length === 0 ? (
          <div className="text-center text-xs text-[#6B7280] dark:text-[#94A3B8] py-10">
            No data for this date range yet.
          </div>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={trendChartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: '#6B7280' }}
                  tickFormatter={(d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  minTickGap={30}
                />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 4 }}
                  labelFormatter={(d: string) => new Date(d).toLocaleDateString()}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line yAxisId="left" type="monotone" dataKey="clicks" name="GSC Clicks" stroke="#2563EB" strokeWidth={2} dot={false} connectNulls />
                <Line yAxisId="left" type="monotone" dataKey="clicksProjected" name="GSC Clicks (projected)" stroke="#2563EB" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
                <Line yAxisId="right" type="monotone" dataKey="aiSessions" name="AI Referral Sessions" stroke="#7C3AED" strokeWidth={2} dot={false} connectNulls />
                <Line yAxisId="right" type="monotone" dataKey="aiSessionsProjected" name="AI Sessions (projected)" stroke="#7C3AED" strokeWidth={2} strokeDasharray="4 4" dot={false} connectNulls />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SectionCard
          icon={Search}
          title="Top Search Queries"
          subtitle={`Last ${days} days — real queries already driving organic clicks to this domain.`}
        >
          <RowsTable rows={gsc?.queries || []} keyLabel="Query" />
        </SectionCard>

        <SectionCard
          icon={FileText}
          title="Top Pages"
          subtitle="Which pages already have organic pull — worth reinforcing with citable, extractable content."
        >
          <RowsTable rows={gsc?.pages || []} keyLabel="Page" keyFormatter={shortenPage} />
        </SectionCard>

        <SectionCard
          icon={Globe2}
          title="Top Countries"
          subtitle="Where the organic audience actually is."
        >
          <RowsTable rows={gsc?.countries || []} keyLabel="Country" keyFormatter={(c) => c.toUpperCase()} />
        </SectionCard>

        <SectionCard
          icon={Smartphone}
          title="Device Breakdown"
          subtitle="Mobile vs desktop split — relevant since AI assistants' own crawlers/browse tools behave more like mobile clients."
        >
          {(gsc?.devices || []).length === 0 ? (
            <div className="text-center text-xs text-[#6B7280] dark:text-[#94A3B8] py-8">No data for this date range yet.</div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={gsc?.devices || []} layout="vertical" margin={{ top: 5, right: 20, bottom: 5, left: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#6B7280' }} allowDecimals={false} />
                  <YAxis type="category" dataKey="key" tick={{ fontSize: 11, fill: '#6B7280' }} width={70} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 4 }} />
                  <Bar dataKey="clicks" name="Clicks" radius={[0, 2, 2, 0]}>
                    {(gsc?.devices || []).map((d) => (
                      <Cell key={d.key} fill={DEVICE_COLORS[d.key] || '#6B7280'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </SectionCard>

        <SectionCard
          icon={Bot}
          title="AI Referral Landing Pages"
          subtitle="GA4 sessions from ChatGPT, Gemini, Perplexity, Claude, Copilot & you.com — which pages they're already sending readers to."
        >
          {landingPages.length === 0 ? (
            <div className="text-center text-xs text-[#6B7280] dark:text-[#94A3B8] py-8">
              No AI-referred sessions in this date range yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wider text-[#6B7280] dark:text-[#94A3B8] border-b border-[#E5E7EB] dark:border-[#1E293B]">
                    <th className="text-left font-bold py-2 pr-3">Landing Page</th>
                    <th className="text-right font-bold py-2 px-2">Sessions</th>
                    <th className="text-right font-bold py-2 pl-2">Conversions</th>
                  </tr>
                </thead>
                <tbody>
                  {landingPages.map((p) => (
                    <tr key={p.landingPage} className="border-b border-[#F3F4F6] dark:border-[#1E293B] last:border-0">
                      <td className="py-1.5 pr-3 font-mono text-[#111827] dark:text-[#F8FAFC] truncate max-w-xs" title={p.landingPage}>
                        {shortenPage(p.landingPage)}
                      </td>
                      <td className="py-1.5 px-2 text-right font-bold text-[#111827] dark:text-[#F8FAFC]">{p.sessions}</td>
                      <td className="py-1.5 pl-2 text-right text-[#4B5563] dark:text-[#CBD5E1]">{p.conversions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

