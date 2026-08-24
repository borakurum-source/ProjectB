import { useState } from 'react';
import { Client, PromptAggregate, CycleAggregate, ActionItem, Prompt } from '../../types';
import { ShareOfVoiceChart } from '../charts/ShareOfVoiceChart';
import { PresenceHeatmap } from '../charts/PresenceHeatmap';
import { CompetitorHeatmap } from '../charts/CompetitorHeatmap';
import { DomainLeaderboard } from '../charts/DomainLeaderboard';
import { Radio, AlertCircle, ArrowUpRight, CheckCircle2, ShieldCheck, Play, ArrowRight, Grid, LayoutList } from 'lucide-react';

interface OverviewTabProps {
  client: Client;
  promptAggregates: PromptAggregate[];
  cycleAggregates: CycleAggregate[];
  latestCycle: CycleAggregate | null;
  actions: ActionItem[];
  prompts: Prompt[];
  onInspectPrompt: (promptId: string) => void;
  onOpenRunModal: () => void;
  onNavigateTab: (tab: 'Prompts' | 'Competitors' | 'Pages' | 'Actions') => void;
}

export function OverviewTab({
  client,
  promptAggregates,
  cycleAggregates,
  latestCycle,
  actions,
  prompts,
  onInspectPrompt,
  onOpenRunModal,
  onNavigateTab,
}: OverviewTabProps) {
  const [heatmapMode, setHeatmapMode] = useState<'standard' | 'correlation'>('standard');

  const totalRunsInLatest = latestCycle?.totalRuns ?? 0;
  const clientSov = latestCycle?.shareOfVoice[client.brandName]?.share ?? 0;
  const mentionRate = latestCycle?.overallMentionRate ?? 0;
  const citationRate = latestCycle?.overallCitationRate ?? 0;
  const volatileCount = latestCycle?.volatilityCount ?? 0;

  const topCompetitor = client.competitorBrands
    .map((comp) => ({
      brand: comp,
      share: latestCycle?.shareOfVoice[comp]?.share ?? 0,
    }))
    .sort((a, b) => b.share - a.share)[0];

  const pendingActions = actions.filter((a) => a.status !== 'Retested');

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Demo client alert banner if applicable */}
      {client.isDemo && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] p-3.5 sm:px-4 sm:py-3 text-xs text-[#92400E] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 rounded-none md:rounded-sm">
          <div className="flex items-start sm:items-center gap-2">
            <span className="bg-[#FEF3C7] text-[#D97706] font-bold px-1.5 py-0.5 rounded-[2px] text-[10px] tracking-wider uppercase border border-[#FDE68A] shrink-0 mt-0.5 sm:mt-0">
              DEMO DATA
            </span>
            <span>
              Viewing enterprise AI visibility benchmark for <strong>{client.brandName}</strong>.
            </span>
          </div>
          <button
            onClick={onOpenRunModal}
            className="px-3 py-1.5 sm:py-1 bg-[#111827] hover:bg-[#1f2937] text-white font-bold uppercase tracking-wider text-[11px] rounded transition-colors shrink-0 self-end sm:self-auto shadow-xs"
          >
            Run Cycle
          </button>
        </div>
      )}

      {/* KPI Cards Row (2-col mobile, 4-col desktop) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Mention Rate */}
        <div className="bg-white p-3.5 sm:p-5 border border-[#E5E7EB] shadow-2xs">
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1 font-bold truncate">
            Avg Mention Rate
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#111827]">
            {Math.round(mentionRate * 100)}%{' '}
            <span className="text-[10px] sm:text-xs font-mono text-[#9CA3AF] font-normal">
              (n={totalRunsInLatest})
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#6B7280] mt-1 truncate">
            {Math.round(mentionRate * totalRunsInLatest)} of {totalRunsInLatest} runs
          </div>
        </div>

        {/* Citation Rate */}
        <div className="bg-white p-3.5 sm:p-5 border border-[#E5E7EB] shadow-2xs">
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1 font-bold truncate">
            Avg Citation Rate
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#111827]">
            {Math.round(citationRate * 100)}%{' '}
            <span className="text-[10px] sm:text-xs font-mono text-[#9CA3AF] font-normal">
              (n={totalRunsInLatest})
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#6B7280] mt-1 truncate">
            Cited in {Math.round(citationRate * totalRunsInLatest)} runs
          </div>
        </div>

        {/* Share of Voice */}
        <div className="bg-white p-3.5 sm:p-5 border border-[#E5E7EB] shadow-2xs">
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1 font-bold truncate">
            Share of Voice
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#10B981]">
            {Math.round(clientSov * 100)}%{' '}
            <span className="text-[10px] sm:text-xs font-mono text-[#9CA3AF] font-normal">
              (n={totalRunsInLatest})
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#6B7280] mt-1 truncate">
            Rival: {topCompetitor?.brand || 'N/A'} ({Math.round((topCompetitor?.share ?? 0) * 100)}%)
          </div>
        </div>

        {/* Volatility Score */}
        <div className="bg-white p-3.5 sm:p-5 border border-[#E5E7EB] shadow-2xs">
          <div className="text-[10px] text-[#6B7280] uppercase tracking-wider mb-1 font-bold truncate">
            Volatility Score
          </div>
          <div className="text-xl sm:text-2xl font-semibold text-[#F59E0B]">
            {volatileCount > 0 ? (volatileCount >= 3 ? 'High' : 'Medium') : 'Stable'}{' '}
            <span className="text-[10px] sm:text-xs font-mono text-[#9CA3AF] font-normal">
              ({volatileCount})
            </span>
          </div>
          <div className="text-[10px] sm:text-[11px] text-[#6B7280] mt-1 truncate">
            {prompts.filter((p) => p.active).length} active prompts
          </div>
        </div>
      </section>

      {/* Flagship View: Prompt × Brand Presence Heatmap & Competitor Matrix Toggle */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-[#111827]">
              Heatmap:
            </span>
            <div className="inline-flex flex-wrap border border-[#D1D5DB] p-0.5 bg-[#F9FAFB] rounded-xs">
              <button
                onClick={() => setHeatmapMode('standard')}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                  heatmapMode === 'standard'
                    ? 'bg-white text-[#111827] shadow-xs border border-[#E5E7EB]'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                <Grid className="w-3.5 h-3.5" />
                <span>Prompt Presence</span>
              </button>
              <button
                onClick={() => setHeatmapMode('correlation')}
                className={`inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1 text-xs font-bold uppercase tracking-wider transition-colors ${
                  heatmapMode === 'correlation'
                    ? 'bg-white text-[#111827] shadow-xs border border-[#E5E7EB]'
                    : 'text-[#6B7280] hover:text-[#111827]'
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

      {/* High-Priority Actions & Diagnostic Highlights */}
      <div className="bg-white border border-[#E5E7EB] p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-[#F3F4F6]">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-[#111827]">
              High-Impact Implementable Actions
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Concrete content & structured schema changes diagnosed from observed grounding gaps
            </p>
          </div>
          <button
            onClick={() => onNavigateTab('Actions')}
            className="text-xs font-bold uppercase tracking-wider text-[#111827] hover:text-[#374151] flex items-center gap-1 transition-colors"
          >
            View All ({actions.length}) <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {pendingActions.length === 0 ? (
          <div className="text-xs text-[#6B7280] p-6 bg-[#F9FAFB] border border-[#E5E7EB] text-center">
            All diagnosed actions have been implemented and retested.
          </div>
        ) : (
          <div className="space-y-3">
            {pendingActions.slice(0, 3).map((action) => (
              <div
                key={action.id}
                className="p-4 border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-white transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[2px] border ${
                          action.priority === 'Critical'
                            ? 'bg-[#FEE2E2] text-[#991B1B] border-[#FECACA]'
                            : action.priority === 'High'
                            ? 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]'
                            : 'bg-[#EEF2FF] text-[#1E40AF] border-[#DBEAFE]'
                        }`}
                      >
                        {action.priority}
                      </span>
                      <span className="text-xs font-bold text-[#111827]">{action.title}</span>
                    </div>
                    <p className="text-xs text-[#374151] line-clamp-2">{action.exactRecommendation}</p>
                    <div className="text-[11px] text-[#6B7280] font-mono">
                      Target: {action.promptIds.join(', ')} • Effort: {action.effort} • Impact: {action.impact}
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateTab('Actions')}
                    className="px-3 py-1.5 bg-white hover:bg-[#F3F4F6] border border-[#D1D5DB] text-xs font-semibold text-[#111827] shrink-0 transition-colors shadow-xs"
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

