import { useState, useMemo, useEffect } from 'react';
import { Client, PromptAggregate, CycleAggregate, ActionItem, Diagnostic, Prompt, Run } from '../types';
import {
  X,
  Printer,
  Copy,
  Check,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  FileText,
  Sliders,
  Sparkles,
  TrendingUp,
  Globe,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  BarChart2,
  Layers,
  Search,
  CheckCircle2,
  Share2,
} from 'lucide-react';
import { buildReportDataModel, ReportDataModel } from '../services/reportData';
import { BrandVisibilityQuadrant } from './charts/BrandVisibilityQuadrant';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';

interface ReportModalProps {
  client: Client;
  cycleAggregate: CycleAggregate | null;
  cycleAggregates?: CycleAggregate[];
  promptAggregates: PromptAggregate[];
  prompts?: Prompt[];
  runs?: Run[];
  actions?: ActionItem[];
  diagnostics?: Diagnostic[];
  onClose: () => void;
}

export function ReportModal({
  client,
  cycleAggregate,
  cycleAggregates = [],
  promptAggregates,
  prompts = [],
  runs = [],
  actions = [],
  diagnostics = [],
  onClose,
}: ReportModalProps) {
  // Presentation & Format Modes: 'document' (A4 Multi-page Print View) | 'slides' (16:9 Presentation Deck) | 'summary' (Markdown)
  const [reportFormat, setReportFormat] = useState<'document' | 'slides' | 'summary'>('document');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Section Visibility Toggles for customization
  const [sections, setSections] = useState({
    cover: true,
    brandCoverage: true,
    brandRanking: true,
    topPrompts: true,
    visibilityMatrix: true,
    citationsLeaderboard: true,
    domainCoverage: true,
    promptCitations: true,
    actionPlan: true,
  });

  const reportData: ReportDataModel = useMemo(() => {
    return buildReportDataModel(
      client,
      cycleAggregate,
      cycleAggregates,
      promptAggregates,
      prompts,
      runs,
      actions,
      diagnostics
    );
  }, [client, cycleAggregate, cycleAggregates, promptAggregates, prompts, runs, actions, diagnostics]);

  // Color palette for charts
  const brandColors = ['#10B981', '#6366F1', '#EC4899', '#F59E0B', '#8B5CF6', '#3B82F6', '#14B8A6'];

  const handlePrint = () => {
    window.print();
  };

  const handleCopyMarkdown = () => {
    const md = generateMarkdownSummary(reportData);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard navigation for presentation slides
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (reportFormat === 'slides') {
        if (e.key === 'ArrowRight' || e.key === 'Space') {
          setCurrentSlide((prev) => Math.min(prev + 1, totalSlideCount - 1));
        } else if (e.key === 'ArrowLeft') {
          setCurrentSlide((prev) => Math.max(prev - 1, 0));
        }
      }
      if (e.key === 'Escape' && !isFullscreen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [reportFormat, isFullscreen]);

  // Slides array for 16:9 Presentation mode
  const totalSlideCount = 9;

  return (
    <div
      className={`fixed inset-0 z-50 bg-[#0F172A]/85 dark:bg-black/95 backdrop-blur-xs flex flex-col justify-center items-center p-2 sm:p-4 print:p-0 print:bg-white print:static print:inset-auto ${
        isFullscreen ? 'p-0' : ''
      }`}
    >
      {/* Outer Modal Container */}
      <div
        className={`bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] w-full ${
          isFullscreen ? 'h-full max-w-none rounded-none' : 'max-w-6xl max-h-[95vh] rounded-xl'
        } flex flex-col overflow-hidden shadow-2xl print:max-h-none print:h-auto print:border-none print:shadow-none print:rounded-none`}
      >
        {/* Top Control Bar (Hidden on Print) */}
        <div className="px-4 sm:px-6 py-3 border-b border-[#E2E8F0] dark:border-[#1E293B] bg-white dark:bg-[#0F172A] flex flex-wrap items-center justify-between gap-3 print:hidden">
          {/* Left: Brand & Format Selector */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#111827] dark:bg-[#4338CA] text-white rounded text-xs font-bold uppercase tracking-wider font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>{client.brandName}</span>
            </div>

            {/* View Mode Tabs */}
            <div className="flex items-center bg-[#F1F5F9] dark:bg-[#1E293B] p-0.5 rounded-lg text-xs font-medium text-[#475569] dark:text-[#94A3B8]">
              <button
                onClick={() => setReportFormat('document')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  reportFormat === 'document'
                    ? 'bg-white dark:bg-[#0B1120] text-[#111827] dark:text-[#F8FAFC] shadow-2xs font-bold'
                    : 'hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>PDF Document</span>
              </button>
              <button
                onClick={() => setReportFormat('slides')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  reportFormat === 'slides'
                    ? 'bg-white dark:bg-[#0B1120] text-[#111827] dark:text-[#F8FAFC] shadow-2xs font-bold'
                    : 'hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>16:9 Slides</span>
              </button>
              <button
                onClick={() => setReportFormat('summary')}
                className={`px-3 py-1 rounded-md transition-colors flex items-center gap-1.5 ${
                  reportFormat === 'summary'
                    ? 'bg-white dark:bg-[#0B1120] text-[#111827] dark:text-[#F8FAFC] shadow-2xs font-bold'
                    : 'hover:text-[#111827] dark:hover:text-white'
                }`}
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Briefing Text</span>
              </button>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2">
            {reportFormat === 'slides' && (
              <div className="flex items-center gap-1 bg-[#F1F5F9] dark:bg-[#1E293B] px-2 py-1 rounded text-xs font-mono">
                <button
                  onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))}
                  disabled={currentSlide === 0}
                  className="p-1 text-[#64748B] hover:text-[#111827] disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-1 font-bold">
                  {currentSlide + 1} / {totalSlideCount}
                </span>
                <button
                  onClick={() => setCurrentSlide((p) => Math.min(totalSlideCount - 1, p + 1))}
                  disabled={currentSlide === totalSlideCount - 1}
                  className="p-1 text-[#64748B] hover:text-[#111827] disabled:opacity-30"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            <button
              onClick={handleCopyMarkdown}
              className="px-2.5 py-1.5 bg-[#F1F5F9] dark:bg-[#1E293B] hover:bg-[#E2E8F0] dark:hover:bg-[#334155] text-[#334155] dark:text-[#CBD5E1] text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
              title="Copy markdown text summary for Slack or email"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Summary'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-[#111827] dark:bg-[#4338CA] hover:bg-black dark:hover:bg-[#3730A3] text-white text-xs font-bold uppercase tracking-wider rounded flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / PDF</span>
            </button>

            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1.5 text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition-colors"
              title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#94A3B8] hover:text-[#111827] dark:hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Workspace / Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-10 print:p-0 print:overflow-visible text-[#111827] dark:text-[#F8FAFC]">
          {/* FORMAT 1: DOCUMENT / PRINT MULTI-PAGE VIEW */}
          {reportFormat === 'document' && (
            <div className="space-y-12 print:space-y-0">
              {/* PAGE 1: COVER PAGE */}
              {sections.cover && (
                <div className="report-page bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] p-8 sm:p-14 min-h-[700px] flex flex-col justify-between relative shadow-sm print:border-none print:shadow-none print:p-8 print:min-h-[1000px] page-break-after">
                  {/* Subtle Dot Matrix Background */}
                  <div
                    className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(#111827 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />

                  {/* Top Branding Header */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-[#111827] dark:bg-[#4338CA] rounded-lg flex items-center justify-center text-white font-black text-xs">
                        R
                      </div>
                      <span className="font-bold tracking-tight text-sm text-[#111827] dark:text-[#F8FAFC]">
                        RAG Signal
                      </span>
                    </div>
                    <div className="text-xs font-mono text-[#64748B] dark:text-[#94A3B8]">
                      AEO & GEO Executive Audit
                    </div>
                  </div>

                  {/* Center Hero Title */}
                  <div className="my-auto py-12 text-center z-10 space-y-4">
                    <div className="inline-block px-3 py-1 bg-[#EEF2FF] dark:bg-[#312E81] text-[#4338CA] dark:text-[#C7D2FE] text-xs font-bold uppercase tracking-widest rounded-full">
                      Brand Intelligence Report
                    </div>
                    <h1 className="text-3xl sm:text-5xl font-extrabold text-[#111827] dark:text-[#F8FAFC] tracking-tight max-w-2xl mx-auto">
                      {client.brandName} Brand Report
                    </h1>
                    <p className="text-sm sm:text-base text-[#64748B] dark:text-[#94A3B8]">
                      Generated on {reportData.generatedDate}
                    </p>

                    {/* Report Filters Tag Box */}
                    <div className="pt-8 max-w-xl mx-auto">
                      <div className="text-[11px] font-bold uppercase tracking-wider text-[#94A3B8] mb-3">
                        Report Filters & Parameters
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <span className="px-3 py-1 bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-full text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                          Engine: {reportData.engineLabel}
                        </span>
                        <span className="px-3 py-1 bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-full text-xs font-medium text-[#334155] dark:text-[#CBD5E1] flex items-center gap-1.5">
                          <span>🇹🇷</span>
                          <span>{reportData.marketLabel}</span>
                        </span>
                        <span className="px-3 py-1 bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-full text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                          {reportData.promptsCount} Prompts Tracked
                        </span>
                        <span className="px-3 py-1 bg-[#F1F5F9] dark:bg-[#1E293B] border border-[#E2E8F0] dark:border-[#334155] rounded-full text-xs font-medium text-[#334155] dark:text-[#CBD5E1]">
                          Sample Size: n={reportData.sampleSize} Runs
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer */}
                  <div className="flex items-center justify-between text-xs text-[#94A3B8] border-t border-[#E2E8F0] dark:border-[#1E293B] pt-4 z-10 font-mono">
                    <span>https://{client.domain}</span>
                    <span>Confidential • Prepared for {client.brandName}</span>
                  </div>
                </div>
              )}

              {/* PAGE 2: BRAND COVERAGE OVER TIME & POSITION SUMMARY */}
              {sections.brandCoverage && (
                <div className="report-page bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] p-8 sm:p-10 rounded-lg shadow-sm print:border-none print:shadow-none print:p-8 page-break-after">
                  <PageHeader client={client} date={reportData.generatedDate} />

                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F8FAFC]">
                        Brand Coverage Over Time
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
                        Brand coverage across tracked AI engines — see exactly when each brand entered, climbed, or dropped out of the answer.
                      </p>
                    </div>

                    {/* Chart Container */}
                    <div className="bg-[#F8FAFC] dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#1E293B] p-4 rounded-lg">
                      <div className="h-64 sm:h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={
                              reportData.brandCoverageOverTime.length > 0
                                ? reportData.brandCoverageOverTime
                                : [
                                    { date: '21 Aug', cycleId: 'c1', [client.brandName]: 4, Misafirliq: 18, 'YMK Catering': 12 },
                                    { date: '23 Aug', cycleId: 'c2', [client.brandName]: 7, Misafirliq: 24, 'YMK Catering': 15 },
                                    { date: '25 Aug', cycleId: 'c3', [client.brandName]: 5, Misafirliq: 12, 'YMK Catering': 28 },
                                    { date: '27 Aug', cycleId: 'c4', [client.brandName]: reportData.overallMentionRate, Misafirliq: 17, 'YMK Catering': 16 },
                                  ]
                            }
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" opacity={0.6} />
                            <XAxis dataKey="date" stroke="#94A3B8" fontSize={11} />
                            <YAxis unit="%" stroke="#94A3B8" fontSize={11} domain={[0, 35]} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: '#1E293B',
                                borderColor: '#334155',
                                color: '#FFF',
                                borderRadius: '6px',
                                fontSize: '11px',
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                            <Line
                              type="monotone"
                              dataKey={client.brandName}
                              stroke="#10B981"
                              strokeWidth={3}
                              dot={{ r: 4 }}
                              activeDot={{ r: 6 }}
                              name={`${client.brandName} (Client)`}
                            />
                            {client.competitorBrands.slice(0, 4).map((comp, idx) => (
                              <Line
                                key={comp}
                                type="monotone"
                                dataKey={comp}
                                stroke={brandColors[(idx + 1) % brandColors.length]}
                                strokeWidth={1.75}
                                strokeDasharray="4 2"
                                dot={false}
                              />
                            ))}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Side-by-side KPI Leaderboards (Brand Mentions & Average Position) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      {/* Left: Brand Mentions */}
                      <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg overflow-hidden">
                        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] px-4 py-2.5 border-b border-[#E2E8F0] dark:border-[#334155] font-bold text-xs text-[#334155] dark:text-[#E2E8F0]">
                          Brand Mentions (Total Count)
                        </div>
                        <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
                          {reportData.brandRanking.slice(0, 6).map((b) => (
                            <div
                              key={b.brand}
                              className={`px-4 py-2 flex items-center justify-between ${
                                b.isClient ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-bold' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[#94A3B8] font-mono w-4">#{b.rank}</span>
                                <span>{b.brand}</span>
                                {b.isClient && (
                                  <span className="px-1.5 py-0.2 text-[9px] bg-emerald-500 text-white rounded font-bold uppercase">
                                    You
                                  </span>
                                )}
                              </div>
                              <span className="font-mono font-bold text-[#111827] dark:text-[#F8FAFC]">
                                {b.mentions}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: Average Brand Position */}
                      <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg overflow-hidden">
                        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] px-4 py-2.5 border-b border-[#E2E8F0] dark:border-[#334155] font-bold text-xs text-[#334155] dark:text-[#E2E8F0]">
                          Average Brand Position (Ordered Lists)
                        </div>
                        <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
                          {reportData.brandRanking.slice(0, 6).map((b) => (
                            <div
                              key={b.brand}
                              className={`px-4 py-2 flex items-center justify-between ${
                                b.isClient ? 'bg-emerald-50/50 dark:bg-emerald-950/20 font-bold' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[#94A3B8] font-mono w-4">#{b.rank}</span>
                                <span>{b.brand}</span>
                              </div>
                              <span className="font-mono font-bold text-[#111827] dark:text-[#F8FAFC]">
                                {b.avgPosition ? `#${b.avgPosition}` : 'Prose'}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <PageFooter pageNumber={2} />
                </div>
              )}

              {/* PAGE 3: BRAND RANKING & SHARE OF VOICE LEADERBOARD */}
              {sections.brandRanking && (
                <div className="report-page bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] p-8 sm:p-10 rounded-lg shadow-sm print:border-none print:shadow-none print:p-8 page-break-after">
                  <PageHeader client={client} date={reportData.generatedDate} />

                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F8FAFC]">
                        Brand Ranking & Share of Voice
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
                        The top brands mentioned by AI engines. Ranking is based on total brand mentions across the tracked run cycle.
                      </p>
                    </div>

                    {/* Table */}
                    <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#F8FAFC] dark:bg-[#1E293B] border-b border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8] uppercase text-[10px] font-bold">
                          <tr>
                            <th className="py-3 px-3 w-10 text-center">#</th>
                            <th className="py-3 px-3">Brand Name</th>
                            <th className="py-3 px-3 text-center">Sentiment</th>
                            <th className="py-3 px-3 text-center">Mentions</th>
                            <th className="py-3 px-3 text-center">Brand Coverage</th>
                            <th className="py-3 px-3 text-center">Share of Voice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                          {reportData.brandRanking.map((b) => (
                            <tr
                              key={b.brand}
                              className={`hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/50 ${
                                b.isClient ? 'bg-emerald-50/60 dark:bg-emerald-950/20 font-semibold' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 font-mono text-center text-[#94A3B8]">{b.rank}</td>
                              <td className="py-2.5 px-3 flex items-center gap-2">
                                <span>{b.brand}</span>
                                {b.isClient && (
                                  <span className="px-1.5 py-0.5 text-[9px] bg-emerald-600 text-white rounded font-bold uppercase">
                                    Your Brand
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${
                                    b.sentimentLabel.startsWith('+')
                                      ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  {b.sentimentLabel}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">{b.mentions}</td>
                              <td className="py-2.5 px-3 text-center font-mono">{b.brandCoverage}%</td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-[#4338CA] dark:text-[#818CF8]">
                                {b.shareOfVoice}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <PageFooter pageNumber={3} />
                </div>
              )}

              {/* PAGE 4: TOP PROMPTS BY BRAND MENTIONS */}
              {sections.topPrompts && (
                <div className="report-page bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] p-8 sm:p-10 rounded-lg shadow-sm print:border-none print:shadow-none print:p-8 page-break-after">
                  <PageHeader client={client} date={reportData.generatedDate} />

                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F8FAFC]">
                        Top Prompts by Brand Mentions
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
                        The prompts with the highest {client.brandName} mention count across tracked AI engines in the selected period.
                      </p>
                    </div>

                    <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#F8FAFC] dark:bg-[#1E293B] border-b border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8] uppercase text-[10px] font-bold">
                          <tr>
                            <th className="py-3 px-3 w-10 text-center">Rank</th>
                            <th className="py-3 px-3">Prompt Query</th>
                            <th className="py-3 px-3 text-center">Intent</th>
                            <th className="py-3 px-3 text-center"># of Brand Mentions</th>
                            <th className="py-3 px-3 text-center">Mention Rate</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                          {reportData.topPromptsByMentions.slice(0, 10).map((p) => (
                            <tr key={p.rank} className="hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/50">
                              <td className="py-2.5 px-3 font-mono text-center text-[#94A3B8]">{p.rank}</td>
                              <td className="py-2.5 px-3 font-medium text-[#111827] dark:text-[#F8FAFC]">
                                {p.promptText}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono text-[10px] text-[#64748B]">
                                {p.intentLayer}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                {p.myMentionsCount}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-mono font-bold ${
                                    p.mentionRate >= 66
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                      : p.mentionRate > 0
                                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                                      : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400'
                                  }`}
                                >
                                  {p.mentionRate}% (n={p.totalRuns})
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <PageFooter pageNumber={4} />
                </div>
              )}

              {/* PAGE 5 & 6: BRAND VISIBILITY INDEX (2x2 QUADRANT & TABLE) */}
              {sections.visibilityMatrix && (
                <div className="report-page bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] p-8 sm:p-10 rounded-lg shadow-sm print:border-none print:shadow-none print:p-8 page-break-after">
                  <PageHeader client={client} date={reportData.generatedDate} />

                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F8FAFC]">
                        Brand Visibility Index on AI Search
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
                        Tracked brands ranked by brand coverage in AI answers and likelihood to buy, classified into Leaders, Niche, Low Conversion, or Low Performance quadrants.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left: 2x2 Matrix */}
                      <div className="lg:col-span-7">
                        <BrandVisibilityQuadrant brands={reportData.brandRanking} clientBrand={client.brandName} />
                      </div>

                      {/* Right: Quadrant Classification Table */}
                      <div className="lg:col-span-5 border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg overflow-hidden">
                        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] px-3 py-2 border-b border-[#E2E8F0] dark:border-[#334155] font-bold text-xs text-[#334155] dark:text-[#E2E8F0]">
                          Quadrant Rankings & Trends
                        </div>
                        <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
                          {reportData.brandRanking.slice(0, 9).map((b) => (
                            <div
                              key={b.brand}
                              className={`p-2.5 flex items-center justify-between ${
                                b.isClient ? 'bg-emerald-50/60 dark:bg-emerald-950/20 font-semibold' : ''
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                    b.quadrant === 'Leader'
                                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                                      : b.quadrant === 'Niche'
                                      ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
                                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {b.quadrant}
                                </span>
                                <span className="truncate max-w-[120px]">{b.brand}</span>
                              </div>
                              <div className="flex items-center gap-3 font-mono">
                                <span>{b.brandCoverage}%</span>
                                <span className="text-emerald-600 font-bold">{b.trend}</span>
                                <span className="text-[#64748B]">{b.sentimentScore}%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <PageFooter pageNumber={5} />
                </div>
              )}

              {/* PAGE 7: CITATIONS (THE URLS AI PULLS FROM MOST) */}
              {sections.citationsLeaderboard && (
                <div className="report-page bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] p-8 sm:p-10 rounded-lg shadow-sm print:border-none print:shadow-none print:p-8 page-break-after">
                  <PageHeader client={client} date={reportData.generatedDate} />

                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F8FAFC]">
                        Citations
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
                        The URLs AI pulls from most when answering your tracked prompts. Own them, out-rank them, or earn a spot on the list — the citations are the ranking.
                      </p>
                    </div>

                    <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-[#F8FAFC] dark:bg-[#1E293B] border-b border-[#E2E8F0] dark:border-[#334155] text-[#64748B] dark:text-[#94A3B8] uppercase text-[10px] font-bold">
                          <tr>
                            <th className="py-3 px-3 w-10 text-center">Rank</th>
                            <th className="py-3 px-3">Cited URL / Resource</th>
                            <th className="py-3 px-3 text-center">Citation Share</th>
                            <th className="py-3 px-3 text-center"># of Citations</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B]">
                          {reportData.topUrls.slice(0, 10).map((u) => (
                            <tr
                              key={u.rank}
                              className={`hover:bg-[#F8FAFC] dark:hover:bg-[#1E293B]/50 ${
                                u.isClient ? 'bg-emerald-50/60 dark:bg-emerald-950/20 font-semibold' : ''
                              }`}
                            >
                              <td className="py-2.5 px-3 font-mono text-center text-[#94A3B8]">{u.rank}</td>
                              <td className="py-2.5 px-3 flex items-center gap-2 max-w-md truncate">
                                <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono text-[11px] text-[#2563EB] dark:text-[#60A5FA] truncate">
                                  {u.url}
                                </span>
                                {u.isClient && (
                                  <span className="px-1.5 py-0.2 text-[9px] bg-emerald-600 text-white rounded font-bold uppercase shrink-0">
                                    Your Site
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold text-[#4338CA] dark:text-[#818CF8]">
                                {u.citationShare}%
                              </td>
                              <td className="py-2.5 px-3 text-center font-mono font-bold">
                                {u.citationCount}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <PageFooter pageNumber={6} />
                </div>
              )}

              {/* PAGE 8 & 9: DOMAIN COVERAGE OVER TIME & TOP DOMAINS & MY TOP URLS */}
              {sections.domainCoverage && (
                <div className="report-page bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] p-8 sm:p-10 rounded-lg shadow-sm print:border-none print:shadow-none print:p-8 page-break-after">
                  <PageHeader client={client} date={reportData.generatedDate} />

                  <div className="space-y-6">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F8FAFC]">
                        Domain Coverage Over Time & Trusted Category Sites
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
                        Which domains AI is pulling from most, tracked day over day. Watch who&apos;s climbing into the answer, who&apos;s holding rank, and who&apos;s quietly dropping out.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left: Domain Citations Leaderboard */}
                      <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg overflow-hidden">
                        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] px-4 py-2.5 border-b border-[#E2E8F0] dark:border-[#334155] font-bold text-xs text-[#334155] dark:text-[#E2E8F0]">
                          Top Cited Domains in Category
                        </div>
                        <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
                          {reportData.topDomains.slice(0, 6).map((d) => (
                            <div key={d.domain} className="px-4 py-2 flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[#94A3B8]">#{d.rank}</span>
                                <span className="font-mono font-medium">{d.domain}</span>
                              </div>
                              <div className="flex items-center gap-4 font-mono">
                                <span className="text-[#64748B]">{d.citationShare}% share</span>
                                <span className="font-bold">{d.citationCount} citations</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Right: My Top 3 URLs */}
                      <div className="border border-[#E2E8F0] dark:border-[#1E293B] rounded-lg overflow-hidden">
                        <div className="bg-[#F8FAFC] dark:bg-[#1E293B] px-4 py-2.5 border-b border-[#E2E8F0] dark:border-[#334155] font-bold text-xs text-[#334155] dark:text-[#E2E8F0] flex items-center justify-between">
                          <span>My Top Cited Pages ({client.brandName})</span>
                          <span className="text-[10px] text-emerald-600 font-mono font-bold">
                            {reportData.overallCitationRate}% Citation Rate
                          </span>
                        </div>
                        <div className="divide-y divide-[#E2E8F0] dark:divide-[#1E293B] text-xs">
                          {reportData.clientTopUrls.slice(0, 5).map((cu) => (
                            <div key={cu.url} className="px-4 py-2 flex items-center justify-between">
                              <div className="flex items-center gap-2 truncate max-w-xs">
                                <span className="font-mono text-emerald-600 font-bold">#{cu.rank}</span>
                                <span className="font-mono text-[11px] text-[#2563EB] dark:text-[#60A5FA] truncate">
                                  {cu.url}
                                </span>
                              </div>
                              <span className="font-mono font-bold text-emerald-700 dark:text-emerald-400">
                                {cu.citationCount} citations
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  <PageFooter pageNumber={7} />
                </div>
              )}

              {/* PAGE 10: RECOMMENDED GEO / AEO ACTIONS ROADMAP */}
              {sections.actionPlan && (
                <div className="report-page bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] p-8 sm:p-10 rounded-lg shadow-sm print:border-none print:shadow-none print:p-8 page-break-after">
                  <PageHeader client={client} date={reportData.generatedDate} />

                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F8FAFC]">
                        High-Impact GEO & AEO Implementation Roadmap
                      </h2>
                      <p className="text-xs sm:text-sm text-[#64748B] dark:text-[#94A3B8] mt-1">
                        Specific structural and content optimizations designed to capture citation share and brand mentions in subsequent run cycles.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {reportData.highImpactActions.map((action, idx) => (
                        <div
                          key={action.id}
                          className="border border-[#E2E8F0] dark:border-[#1E293B] p-4 bg-[#F8FAFC] dark:bg-[#1E293B] rounded-lg"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs font-bold text-[#64748B] dark:text-[#94A3B8]">
                                #{idx + 1}
                              </span>
                              <h3 className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#F8FAFC]">
                                {action.title}
                              </h3>
                              <span className="px-1.5 py-0.2 bg-[#111827] dark:bg-[#4338CA] text-white text-[9px] font-bold uppercase font-mono rounded">
                                {action.priority}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-[#64748B]">
                              Status: <strong>{action.status}</strong>
                            </span>
                          </div>

                          <p className="text-xs text-[#4B5563] dark:text-[#CBD5E1] mt-1">{action.why}</p>

                          <div className="mt-2.5 p-2.5 bg-white dark:bg-[#0B1120] border border-[#E2E8F0] dark:border-[#334155] rounded text-xs font-mono text-[#111827] dark:text-[#F8FAFC]">
                            <div className="text-[10px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-wider mb-1">
                              Exact Implementation:
                            </div>
                            {action.exactRecommendation}
                          </div>

                          <div className="mt-2 text-[11px] text-[#64748B] dark:text-[#94A3B8] flex items-center justify-between font-mono">
                            <span>Retest Query: {action.validation}</span>
                            <span>Impact: {action.impact} • Effort: {action.effort}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <PageFooter pageNumber={8} />
                </div>
              )}
            </div>
          )}

          {/* FORMAT 2: 16:9 PRESENTATION SLIDES DECK */}
          {reportFormat === 'slides' && (
            <div className="max-w-5xl mx-auto w-full">
              {/* Slide Container (16:9 Aspect Ratio Card) */}
              <div className="bg-white dark:bg-[#0F172A] border border-[#E2E8F0] dark:border-[#1E293B] rounded-2xl shadow-xl p-8 sm:p-12 min-h-[540px] flex flex-col justify-between relative overflow-hidden transition-all duration-300">
                {/* Slide 1: Cover */}
                {currentSlide === 0 && (
                  <div className="h-full flex flex-col justify-between flex-1 py-8 text-center space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-[#64748B]">
                        Executive AI Visibility Briefing
                      </span>
                      <span className="text-xs font-mono text-[#64748B]">Slide 1 of {totalSlideCount}</span>
                    </div>

                    <div className="my-auto space-y-4">
                      <div className="inline-block px-3 py-1 bg-indigo-50 dark:bg-indigo-950 text-[#4338CA] dark:text-[#A5B4FC] text-xs font-bold uppercase tracking-widest rounded-full font-mono">
                        RAG Signal AEO Report
                      </div>
                      <h1 className="text-4xl sm:text-6xl font-black text-[#111827] dark:text-[#F8FAFC] tracking-tight">
                        {client.brandName} Brand Report
                      </h1>
                      <p className="text-base text-[#64748B] dark:text-[#94A3B8]">
                        Generated on {reportData.generatedDate}
                      </p>

                      <div className="flex flex-wrap justify-center gap-2 pt-4">
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-mono">
                          Engine: {reportData.engineLabel}
                        </span>
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-mono">
                          Market: 🇹🇷 {reportData.marketLabel}
                        </span>
                        <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full text-xs font-mono">
                          {reportData.promptsCount} Prompts (n={reportData.sampleSize} Runs)
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-[#94A3B8] font-mono border-t border-slate-100 dark:border-slate-800 pt-3">
                      https://{client.domain} • Confidential Client Presentation
                    </div>
                  </div>
                )}

                {/* Slide 2: Coverage Over Time */}
                {currentSlide === 1 && (
                  <div className="h-full flex flex-col justify-between flex-1 space-y-4">
                    <SlideHeader
                      title="Brand Coverage Over Time"
                      subtitle="Brand visibility percentage across all tracked AI answers"
                      slideNumber={2}
                      totalSlides={totalSlideCount}
                    />
                    <div className="h-64 w-full my-auto">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reportData.brandCoverageOverTime}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.4} />
                          <XAxis dataKey="date" fontSize={12} />
                          <YAxis unit="%" fontSize={12} domain={[0, 35]} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey={client.brandName}
                            stroke="#10B981"
                            strokeWidth={3.5}
                            name={`${client.brandName} (Client)`}
                          />
                          {client.competitorBrands.slice(0, 3).map((comp, idx) => (
                            <Line
                              key={comp}
                              type="monotone"
                              dataKey={comp}
                              stroke={brandColors[idx + 1]}
                              strokeWidth={2}
                              strokeDasharray="4 2"
                            />
                          ))}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="grid grid-cols-3 gap-4 pt-2 text-center text-xs">
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="text-[#64748B]">Mention Rate</div>
                        <div className="text-lg font-bold font-mono">{reportData.overallMentionRate}%</div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="text-[#64748B]">Citation Rate</div>
                        <div className="text-lg font-bold font-mono">{reportData.overallCitationRate}%</div>
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        <div className="text-[#64748B]">Sample Size</div>
                        <div className="text-lg font-bold font-mono">n={reportData.sampleSize}</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Slide 3: Brand Ranking */}
                {currentSlide === 2 && (
                  <div className="h-full flex flex-col justify-between flex-1 space-y-4">
                    <SlideHeader
                      title="Brand Ranking & Share of Voice"
                      subtitle="Top brands ordered by total AI mentions"
                      slideNumber={3}
                      totalSlides={totalSlideCount}
                    />
                    <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden my-auto">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 dark:bg-slate-800 text-[10px] uppercase font-bold text-slate-500">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Brand Name</th>
                            <th className="py-2.5 px-3 text-center">Sentiment</th>
                            <th className="py-2.5 px-3 text-center">Mentions</th>
                            <th className="py-2.5 px-3 text-center">Coverage</th>
                            <th className="py-2.5 px-3 text-center">Share of Voice</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                          {reportData.brandRanking.slice(0, 6).map((b) => (
                            <tr
                              key={b.brand}
                              className={b.isClient ? 'bg-emerald-50/60 dark:bg-emerald-950/20 font-bold' : ''}
                            >
                              <td className="py-2 px-3 font-mono">{b.rank}</td>
                              <td className="py-2 px-3">{b.brand}</td>
                              <td className="py-2 px-3 text-center font-mono">{b.sentimentLabel}</td>
                              <td className="py-2 px-3 text-center font-mono">{b.mentions}</td>
                              <td className="py-2 px-3 text-center font-mono">{b.brandCoverage}%</td>
                              <td className="py-2 px-3 text-center font-mono text-indigo-600 font-bold">
                                {b.shareOfVoice}%
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Slide 4: Top Prompts */}
                {currentSlide === 3 && (
                  <div className="h-full flex flex-col justify-between flex-1 space-y-4">
                    <SlideHeader
                      title="Top Prompts by Brand Mentions"
                      subtitle="Queries where the brand appeared most frequently"
                      slideNumber={4}
                      totalSlides={totalSlideCount}
                    />
                    <div className="space-y-2 my-auto">
                      {reportData.topPromptsByMentions.slice(0, 5).map((p) => (
                        <div
                          key={p.rank}
                          className="p-3 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-400">#{p.rank}</span>
                            <span className="font-semibold text-slate-800 dark:text-slate-200">{p.promptText}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-mono font-bold">
                              {p.myMentionsCount}/{p.totalRuns} mentions
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Slide 5: Brand Visibility Quadrant */}
                {currentSlide === 4 && (
                  <div className="h-full flex flex-col justify-between flex-1 space-y-4">
                    <SlideHeader
                      title="Brand Visibility Index Matrix"
                      subtitle="2x2 Quadrant mapping brand coverage vs likelihood to buy"
                      slideNumber={5}
                      totalSlides={totalSlideCount}
                    />
                    <div className="my-auto">
                      <BrandVisibilityQuadrant brands={reportData.brandRanking} clientBrand={client.brandName} />
                    </div>
                  </div>
                )}

                {/* Slide 6: Citations */}
                {currentSlide === 5 && (
                  <div className="h-full flex flex-col justify-between flex-1 space-y-4">
                    <SlideHeader
                      title="Citations (Top Sourced URLs)"
                      subtitle="The exact URLs AI answers cite most for your category queries"
                      slideNumber={6}
                      totalSlides={totalSlideCount}
                    />
                    <div className="space-y-2 my-auto">
                      {reportData.topUrls.slice(0, 5).map((u) => (
                        <div
                          key={u.rank}
                          className={`p-3 border rounded-lg flex items-center justify-between text-xs ${
                            u.isClient
                              ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate max-w-lg">
                            <span className="font-mono font-bold text-slate-400">#{u.rank}</span>
                            <span className="font-mono text-blue-600 dark:text-blue-400 truncate">{u.url}</span>
                          </div>
                          <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {u.citationCount} citations ({u.citationShare}%)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Slide 7: Domains & My URLs */}
                {currentSlide === 6 && (
                  <div className="h-full flex flex-col justify-between flex-1 space-y-4">
                    <SlideHeader
                      title="Domain Citations & Client URLs"
                      subtitle="Trusted domain leaderboard and client page citations"
                      slideNumber={7}
                      totalSlides={totalSlideCount}
                    />
                    <div className="grid grid-cols-2 gap-4 my-auto">
                      <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-lg">
                        <div className="font-bold text-xs mb-2">Top Cited Domains</div>
                        <div className="space-y-1 text-xs">
                          {reportData.topDomains.slice(0, 5).map((d) => (
                            <div key={d.domain} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                              <span>{d.domain}</span>
                              <span className="font-mono font-bold">{d.citationCount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="border border-slate-200 dark:border-slate-800 p-4 rounded-lg">
                        <div className="font-bold text-xs mb-2 text-emerald-600">My Cited URLs</div>
                        <div className="space-y-1 text-xs">
                          {reportData.clientTopUrls.slice(0, 5).map((cu) => (
                            <div key={cu.url} className="flex justify-between py-1 border-b border-slate-100 dark:border-slate-800">
                              <span className="truncate max-w-[160px] font-mono">{cu.path}</span>
                              <span className="font-mono font-bold text-emerald-600">{cu.citationCount}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Slide 8: High Impact Actions */}
                {currentSlide === 7 && (
                  <div className="h-full flex flex-col justify-between flex-1 space-y-4">
                    <SlideHeader
                      title="Recommended GEO Action Plan"
                      subtitle="Top concrete actions to capture more AI answer citations"
                      slideNumber={8}
                      totalSlides={totalSlideCount}
                    />
                    <div className="space-y-3 my-auto">
                      {reportData.highImpactActions.slice(0, 3).map((act, idx) => (
                        <div key={act.id} className="p-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs">
                          <div className="flex justify-between items-center font-bold">
                            <span>#{idx + 1} {act.title}</span>
                            <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[10px] uppercase font-mono">
                              {act.priority}
                            </span>
                          </div>
                          <p className="text-slate-600 dark:text-slate-300 mt-1">{act.why}</p>
                          <div className="mt-2 p-2 bg-white dark:bg-slate-900 border rounded font-mono text-[11px]">
                            {act.exactRecommendation}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Slide 9: Back Cover / Conclusion */}
                {currentSlide === 8 && (
                  <div className="h-full flex flex-col justify-between flex-1 py-8 text-center space-y-6">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold uppercase text-[#64748B]">Next Steps</span>
                      <span className="text-xs font-mono text-[#64748B]">Slide 9 of {totalSlideCount}</span>
                    </div>

                    <div className="my-auto space-y-4">
                      <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg">
                        <CheckCircle2 className="w-7 h-7" />
                      </div>
                      <h2 className="text-3xl sm:text-4xl font-extrabold text-[#111827] dark:text-[#F8FAFC]">
                        Ready for Implementation
                      </h2>
                      <p className="text-sm text-[#64748B] dark:text-[#94A3B8] max-w-md mx-auto">
                        Implement the prioritized recommendations, then run an automated retest cycle to verify before/after visibility improvements.
                      </p>
                      <div className="pt-2">
                        <button
                          onClick={handlePrint}
                          className="px-6 py-2.5 bg-[#111827] dark:bg-[#4338CA] text-white rounded-lg font-bold text-xs uppercase tracking-wider shadow-md hover:bg-black transition-colors"
                        >
                          Download Full PDF Report
                        </button>
                      </div>
                    </div>

                    <div className="text-xs text-[#94A3B8] font-mono border-t border-slate-100 dark:border-slate-800 pt-3">
                      RAG Signal AEO Platform • Continuous AI Visibility Monitoring
                    </div>
                  </div>
                )}

                {/* Slide Footer Navigation Controls */}
                <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-4 mt-6">
                  <button
                    onClick={() => setCurrentSlide((p) => Math.max(0, p - 1))}
                    disabled={currentSlide === 0}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold rounded disabled:opacity-30 transition-colors flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Previous</span>
                  </button>

                  {/* Slide Dots Indicator */}
                  <div className="flex items-center gap-1.5">
                    {Array.from({ length: totalSlideCount }).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`w-2.5 h-2.5 rounded-full transition-all ${
                          currentSlide === idx
                            ? 'w-6 bg-[#111827] dark:bg-[#4338CA]'
                            : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                        }`}
                      />
                    ))}
                  </div>

                  <button
                    onClick={() => setCurrentSlide((p) => Math.min(totalSlideCount - 1, p + 1))}
                    disabled={currentSlide === totalSlideCount - 1}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-semibold rounded disabled:opacity-30 transition-colors flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* FORMAT 3: COPYABLE MARKDOWN BRIEFING TEXT */}
          {reportFormat === 'summary' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex items-center justify-between bg-white dark:bg-[#0F172A] p-4 border border-slate-200 dark:border-slate-800 rounded-lg">
                <div>
                  <h3 className="text-sm font-bold">Executive Markdown Briefing</h3>
                  <p className="text-xs text-slate-500">Formatted for instant pasting into Slack, Notion, or client emails.</p>
                </div>
                <button
                  onClick={handleCopyMarkdown}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase rounded flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
                </button>
              </div>

              <div className="p-6 bg-white dark:bg-[#0F172A] border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-xs text-slate-800 dark:text-slate-200 whitespace-pre-wrap select-all leading-relaxed max-h-[550px] overflow-y-auto">
                {generateMarkdownSummary(reportData)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sub-components for Clean Multi-Page Layout
function PageHeader({ client, date }: { client: Client; date: string }) {
  return (
    <div className="flex items-center justify-between border-b border-[#E2E8F0] dark:border-[#1E293B] pb-3 mb-6 font-mono text-[11px] text-[#64748B] dark:text-[#94A3B8]">
      <div className="flex items-center gap-2">
        <span className="font-bold text-[#111827] dark:text-[#F8FAFC]">{client.brandName}</span>
        <span>•</span>
        <span>{client.domain}</span>
      </div>
      <div>{date}</div>
    </div>
  );
}

function PageFooter({ pageNumber }: { pageNumber: number }) {
  return (
    <div className="flex items-center justify-between border-t border-[#E2E8F0] dark:border-[#1E293B] pt-4 mt-8 font-mono text-[10px] text-[#94A3B8]">
      <span>Generated by RAG Signal AEO Intelligence</span>
      <span>Page {pageNumber}</span>
    </div>
  );
}

function SlideHeader({
  title,
  subtitle,
  slideNumber,
  totalSlides,
}: {
  title: string;
  subtitle: string;
  slideNumber: number;
  totalSlides: number;
}) {
  return (
    <div className="flex items-start justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-[#111827] dark:text-[#F8FAFC] tracking-tight">{title}</h2>
        <p className="text-xs text-[#64748B] dark:text-[#94A3B8] mt-0.5">{subtitle}</p>
      </div>
      <span className="text-xs font-mono font-bold text-slate-400">
        Slide {slideNumber} of {totalSlides}
      </span>
    </div>
  );
}

function generateMarkdownSummary(data: ReportDataModel): string {
  return `# 📊 ${data.client.brandName} - AI Engine Visibility Report
**Generated on:** ${data.generatedDate}
**Engine:** ${data.engineLabel} | **Market:** ${data.marketLabel} | **Sample:** n=${data.sampleSize} runs

---

### 1. Executive Performance Metrics
- **Overall Mention Rate:** ${data.overallMentionRate}% (appeared in answers)
- **Overall Citation Rate:** ${data.overallCitationRate}% (domain cited in grounding chunks)
- **Active Prompts Tracked:** ${data.promptsCount}
- **Volatile Queries:** ${data.volatilityCount}

---

### 2. Brand Ranking & Share of Voice
${data.brandRanking
  .slice(0, 5)
  .map(
    (b) =>
      `#${b.rank} **${b.brand}** ${b.isClient ? '(Client)' : ''} — Mentions: ${b.mentions} | Coverage: ${b.brandCoverage}% | SOV: ${b.shareOfVoice}% | Sentiment: ${b.sentimentLabel}`
  )
  .join('\n')}

---

### 3. Top Sourced Citation URLs
${data.topUrls
  .slice(0, 5)
  .map((u) => `#${u.rank} [${u.domain}](${u.url}) — ${u.citationCount} citations (${u.citationShare}%)`)
  .join('\n')}

---

### 4. High-Impact Action Items
${data.highImpactActions
  .slice(0, 3)
  .map(
    (a, i) => `**${i + 1}. ${a.title}** (${a.priority} Priority)
- *Why:* ${a.why}
- *Action:* ${a.exactRecommendation}
- *Retest Prompt:* ${a.validation}
`
  )
  .join('\n')}

---
*Report produced by RAG Signal AEO / GEO Intelligence System.*
`;
}
