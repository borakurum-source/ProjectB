import { useState } from 'react';
import { Client, PromptAggregate, CycleAggregate, ActionItem, Prompt, Run } from '../../types';
import { ShareOfVoiceChart } from '../charts/ShareOfVoiceChart';
import { PerformanceTrendsChart } from '../charts/PerformanceTrendsChart';
import { PromptPerformanceTrendsChart } from '../charts/PromptPerformanceTrendsChart';
import { PresenceHeatmap } from '../charts/PresenceHeatmap';
import { CompetitorHeatmap } from '../charts/CompetitorHeatmap';
import { DomainLeaderboard } from '../charts/DomainLeaderboard';
import { GscGa4VisibilityChart } from '../charts/GscGa4VisibilityChart';
import { CorrelationScatterChart } from '../charts/CorrelationScatterChart';
import { Radio, AlertCircle, ArrowUpRight, CheckCircle2, ShieldCheck, Play, ArrowRight, Grid, LayoutList, TrendingUp, Activity } from 'lucide-react';

interface OverviewTabProps {
  client: Client;
  promptAggregates: PromptAggregate[];
  cycleAggregates: CycleAggregate[];
  latestCycle: CycleAggregate | null;
  actions: ActionItem[];
  prompts: Prompt[];
  runs?: Run[];
  onInspectPrompt: (promptId: string) => void;
  onOpenRunModal: () => void;
  onNavigateTab: (tab: 'Prompts' | 'Competitors' | 'Pages' | 'Actions') => void;
  onClearDemoData?: () => void;
}

export function OverviewTab({
  client,
  promptAggregates,
  cycleAggregates,
  latestCycle,
  actions,
  prompts,
  runs = [],
  onInspectPrompt,
  onOpenRunModal,
  onNavigateTab,
  onClearDemoData,
}: OverviewTabProps) {
  const [heatmapMode, setHeatmapMode] = useState<'standard' | 'correlation'>('standard');
  const [trendsMode, setTrendsMode] = useState<'aggregate' | 'prompts'>('aggregate');

  const totalRunsInLatest = latestCycle?.totalRuns ?? 0;
  const clientSov = latestCycle?.shareOfVoice?.[client.brandName]?.share ?? 0;
  const mentionRate = latestCycle?.overallMentionRate ?? 0;
  const citationRate = latestCycle?.overallCitationRate ?? 0;
  const volatileCount = latestCycle?.volatilityCount ?? 0;

  const topCompetitor = (client.competitorBrands || [])
    .map((comp) => ({
      brand: comp,
      share: latestCycle?.shareOfVoice?.[comp]?.share ?? 0,
    }))
    .sort((a, b) => b.share - a.share)[0];

  const pendingActions = actions.filter((a) => a.status !== 'Retested');

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Live Measurement Callout when no cycles exist yet */}
      {totalRunsInLatest === 0 && (
        <div className="bg-[#F8FAFC] dark:bg-[#0F172A] border border-[#CBD5E1] dark:border-[#334155] p-5 text-sm text-[#1E293B] dark:text-[#F8FAFC] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xs">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="bg-[#111827] dark:bg-[#4338CA] text-white font-bold px-2 py-0.5 text-[10px] tracking-wider uppercase">
                100% CANLI VERİ
              </span>
              <strong className="text-sm font-semibold">{client.brandName} İçin İlk Canlı AI Görünürlük Döngüsünü Başlatın</strong>
            </div>
            <p className="text-xs text-[#64748B] dark:text-[#94A3B8]">
              RAG Signal yapay/tahmini veri üretmez. Google Search ile güçlendirilmiş Gemini 2.5/3.7 motorunda her prompt için gerçek zamanlı $n=3$ arama gerçekleştirip marka görünürlüğünü ve kaynak domainleri çıkarır.
            </p>
          </div>
          <button
            onClick={onOpenRunModal}
            className="px-4 py-2.5 bg-[#111827] dark:bg-[#4338CA] hover:bg-[#1f2937] dark:hover:bg-[#3730A3] text-white font-bold uppercase tracking-wider text-xs shrink-0 inline-flex items-center gap-2 shadow-xs transition-colors"
          >
            <Play className="w-4 h-4 fill-white" />
            Canlı Döngü Başlat ({prompts.filter(p => p.active).length} Prompt × 3)
          </button>
        </div>
      )}

      {/* KPI Cards Row (2-col mobile, 4-col desktop) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Mention Rate */}
        <div className="bg-white dark:bg-[#0F172A] p-3.5 sm:p-5 border border-[#E5E7EB] dark:border-[#1E293B] shadow-2xs">
          <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-1 font-bold truncate">
            Avg Mention Rate
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#111827] dark:text-[#F8FAFC]">
            {Math.round(mentionRate * 100)}%{' '}
            <span className="text-[10px] sm:text-xs font-mono text-[#9CA3AF] dark:text-[#64748B] font-normal">
              (n={totalRunsInLatest})
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 truncate">
            {Math.round(mentionRate * totalRunsInLatest)} of {totalRunsInLatest} runs
          </div>
        </div>

        {/* Citation Rate */}
        <div className="bg-white dark:bg-[#0F172A] p-3.5 sm:p-5 border border-[#E5E7EB] dark:border-[#1E293B] shadow-2xs">
          <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-1 font-bold truncate">
            Avg Citation Rate
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#111827] dark:text-[#F8FAFC]">
            {Math.round(citationRate * 100)}%{' '}
            <span className="text-[10px] sm:text-xs font-mono text-[#9CA3AF] dark:text-[#64748B] font-normal">
              (n={totalRunsInLatest})
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 truncate">
            Cited in {Math.round(citationRate * totalRunsInLatest)} runs
          </div>
        </div>

        {/* Share of Voice */}
        <div className="bg-white dark:bg-[#0F172A] p-3.5 sm:p-5 border border-[#E5E7EB] dark:border-[#1E293B] shadow-2xs">
          <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-1 font-bold truncate">
            Share of Voice
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#10B981] dark:text-[#34D399]">
            {Math.round(clientSov * 100)}%{' '}
            <span className="text-[10px] sm:text-xs font-mono text-[#9CA3AF] dark:text-[#64748B] font-normal">
              (n={totalRunsInLatest})
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 truncate">
            Rival: {topCompetitor?.brand || 'N/A'} ({Math.round((topCompetitor?.share ?? 0) * 100)}%)
          </div>
        </div>

        {/* Volatility Score */}
        <div className="bg-white dark:bg-[#0F172A] p-3.5 sm:p-5 border border-[#E5E7EB] dark:border-[#1E293B] shadow-2xs">
          <div className="text-[10px] text-[#6B7280] dark:text-[#94A3B8] uppercase tracking-wider mb-1 font-bold truncate">
            Volatility Score
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#F59E0B] dark:text-[#FBBF24]">
            {volatileCount > 0 ? (volatileCount >= 3 ? 'High' : 'Medium') : 'Stable'}{' '}
            <span className="text-[10px] sm:text-xs font-mono text-[#9CA3AF] dark:text-[#64748B] font-normal">
              ({volatileCount})
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#6B7280] dark:text-[#94A3B8] mt-1 truncate">
            {prompts.filter((p) => p.active).length} active prompts
          </div>
        </div>
      </section>

      {/* Performance Trends Section (Recharts: Prompt performance trends vs time over last 5 cycles) */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">
              Trends View:
            </span>
            <div className="inline-flex w-full sm:w-auto border border-[#D1D5DB] dark:border-[#334155] p-0.5 bg-[#F9FAFB] dark:bg-[#1E293B] rounded-xs">
              <button
                onClick={() => setTrendsMode('aggregate')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors ${
                  trendsMode === 'aggregate'
                    ? 'bg-white dark:bg-[#0F172A] text-[#4338CA] dark:text-[#818CF8] shadow-xs border border-[#E5E7EB] dark:border-[#334155]'
                    : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <Activity className="w-3.5 h-3.5 shrink-0" />
                <span className="sm:hidden">Aggregate (5C)</span>
                <span className="hidden sm:inline">Historical Aggregate Mention Rate (5 Cycles)</span>
              </button>
              <button
                onClick={() => setTrendsMode('prompts')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors ${
                  trendsMode === 'prompts'
                    ? 'bg-white dark:bg-[#0F172A] text-[#4338CA] dark:text-[#818CF8] shadow-xs border border-[#E5E7EB] dark:border-[#334155]'
                    : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                <span className="sm:hidden">Per-Prompt (5C)</span>
                <span className="hidden sm:inline">Per-Prompt Trajectories (5 Cycles)</span>
              </button>
            </div>
          </div>
        </div>

        {trendsMode === 'prompts' ? (
          <PromptPerformanceTrendsChart
            cycles={cycleAggregates}
            runs={runs}
            prompts={prompts}
            client={client}
            maxCycles={5}
            onInspectPrompt={onInspectPrompt}
          />
        ) : (
          <PerformanceTrendsChart
            cycles={cycleAggregates}
            client={client}
            maxCycles={5}
          />
        )}
      </section>

      {/* Flagship View: Prompt × Brand Presence Heatmap & Competitor Matrix Toggle */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC]">
              Heatmap:
            </span>
            <div className="inline-flex w-full sm:w-auto border border-[#D1D5DB] dark:border-[#334155] p-0.5 bg-[#F9FAFB] dark:bg-[#1E293B] rounded-xs">
              <button
                onClick={() => setHeatmapMode('standard')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors ${
                  heatmapMode === 'standard'
                    ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] shadow-xs border border-[#E5E7EB] dark:border-[#334155]'
                    : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Prompt Presence</span>
              </button>
              <button
                onClick={() => setHeatmapMode('correlation')}
                className={`flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-colors ${
                  heatmapMode === 'correlation'
                    ? 'bg-white dark:bg-[#0F172A] text-[#111827] dark:text-[#F8FAFC] shadow-xs border border-[#E5E7EB] dark:border-[#334155]'
                    : 'text-[#6B7280] dark:text-[#94A3B8] hover:text-[#111827] dark:hover:text-[#F8FAFC]'
                }`}
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Competitor Matrix</span>
              </button>
            </div>
          </div>
        </div>

        {heatmapMode === 'standard' ? (
          <PresenceHeatmap
            promptAggregates={promptAggregates}
            client={client}
            onInspectPrompt={onInspectPrompt}
          />
        ) : (
          <CompetitorHeatmap
            promptAggregates={promptAggregates}
            client={client}
            onInspectPrompt={onInspectPrompt}
          />
        )}
      </section>

      {/* Charts Grid: Share of Voice Trend & Citation Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ShareOfVoiceChart
          cycles={cycleAggregates}
          clientBrand={client.brandName}
          competitorBrands={client.competitorBrands}
          clientDomain={client.domain}
          client={client}
          maxCycles={5}
        />

        <DomainLeaderboard
          leaderboard={latestCycle?.leaderboardDomains || []}
          totalRuns={totalRunsInLatest}
          clientDomain={client.domain}
          competitorDomains={client.competitorDomains}
        />
      </div>

      {/* GSC & GA4 Organic Search vs AI Visibility Chart */}
      <GscGa4VisibilityChart
        clientDomain={client.domain}
        overallMentionRate={mentionRate}
        totalRuns={totalRunsInLatest}
      />

      {/* AI Mention Rate vs Organic Search Correlation */}
      <CorrelationScatterChart cycles={cycleAggregates} />

      {/* High-Priority Actions & Diagnostic Highlights */}
      <div className="bg-white dark:bg-[#0F172A] border border-[#E5E7EB] dark:border-[#1E293B] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F3F4F6] dark:border-[#1E293B]">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827] dark:text-[#F8FAFC]">
              High-Impact Implementable Actions
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#94A3B8] mt-0.5">
              Concrete content & structured schema changes diagnosed from observed grounding gaps
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('Actions')}
            className="text-xs font-bold uppercase tracking-wider text-[#111827] dark:text-[#F8FAFC] hover:text-[#374151] dark:hover:text-[#CBD5E1] flex items-center gap-1 transition-colors"
          >
            View All ({actions.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingActions.length === 0 ? (
          <div className="text-xs text-[#6B7280] dark:text-[#94A3B8] p-6 bg-[#F9FAFB] dark:bg-[#1E293B] border border-[#E5E7EB] dark:border-[#334155] text-center">
            All diagnosed actions have been implemented and retested.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingActions.slice(0, 3).map((action) => (
              <div
                key={action.id}
                className="p-4 border border-[#E5E7EB] dark:border-[#334155] bg-[#F9FAFB] dark:bg-[#1E293B] hover:bg-white dark:hover:bg-[#0F172A] transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px] border ${
                          action.priority === 'Critical'
                            ? 'bg-[#FEE2E2] dark:bg-[#7F1D1D] text-[#991B1B] dark:text-[#FCA5A5] border-[#FECACA] dark:border-[#991B1B]'
                            : action.priority === 'High'
                            ? 'bg-[#FEF3C7] dark:bg-[#78350F] text-[#D97706] dark:text-[#FDE68A] border-[#FDE68A] dark:border-[#D97706]'
                            : 'bg-[#EEF2FF] dark:bg-[#1E1B4B] text-[#1E40AF] dark:text-[#A5B4FC] border-[#DBEAFE] dark:border-[#3730A3]'
                        }`}
                      >
                        {action.priority}
                      </span>
                      <span className="text-xs font-bold text-[#111827] dark:text-[#F8FAFC]">{action.title}</span>
                    </div>
                    <p className="text-xs text-[#374151] dark:text-[#CBD5E1] line-clamp-2">{action.exactRecommendation}</p>
                    <div className="text-[11px] text-[#6B7280] dark:text-[#94A3B8] font-mono">
                      Target: {action.promptIds.join(', ')} • Effort: {action.effort} • Impact: {action.impact}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('Actions')}
                    className="px-3 py-1.5 bg-white dark:bg-[#0F172A] hover:bg-[#F3F4F6] dark:hover:bg-[#334155] border border-[#D1D5DB] dark:border-[#334155] text-xs font-semibold text-[#111827] dark:text-[#F8FAFC] shrink-0 transition-colors shadow-xs"
                  >
                    Open Action
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

