import { CycleAggregate, Client } from '../types';

export interface TrendDataPoint {
  cycleId: string;
  startedAt: string;
  formattedDate: string;
  totalRuns: number;
  clientSov: number;
  clientMentionRate: number;
  clientCitationRate: number;
  competitorSovs: Record<string, number>;
  volatilityCount: number;
}

export interface TrendSummary {
  cycleCount: number;
  totalHistoricalRuns: number;
  sovChange: number; // Delta from oldest to latest in window
  citationRateChange: number; // Delta from oldest to latest in window
  mentionRateChange: number; // Delta from oldest to latest in window
  sovTrajectory: 'Improving' | 'Declining' | 'Stable';
  citationTrajectory: 'Improving' | 'Declining' | 'Stable';
  latestClientSov: number;
  latestCitationRate: number;
  topCompetitorTrend: {
    brand: string;
    currentSov: number;
    change: number;
  } | null;
}

export interface TrendAnalysisResult {
  dataPoints: TrendDataPoint[];
  trackedBrands: string[];
  summary: TrendSummary;
}

/**
 * TrendAnalyzer Service
 * Computes deterministic historical Share of Voice, Citation Rate, and Mention Rate
 * trajectories from stored cycleAggregates over a configurable cycle window (default: last 5 cycles).
 */
export class TrendAnalyzer {
  /**
   * Analyzes historical trends across up to `maxCycles` run cycles.
   */
  public static analyze(
    cycles: CycleAggregate[],
    client: Client,
    maxCycles = 5
  ): TrendAnalysisResult {
    if (!cycles || cycles.length === 0) {
      return {
        dataPoints: [],
        trackedBrands: [client.brandName, ...client.competitorBrands.slice(0, 4)],
        summary: {
          cycleCount: 0,
          totalHistoricalRuns: 0,
          sovChange: 0,
          citationRateChange: 0,
          mentionRateChange: 0,
          sovTrajectory: 'Stable',
          citationTrajectory: 'Stable',
          latestClientSov: 0,
          latestCitationRate: 0,
          topCompetitorTrend: null,
        },
      };
    }

    // Sort chronologically ascending
    const sorted = [...cycles].sort(
      (a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()
    );

    // Take the last N cycles
    const windowedCycles = sorted.slice(-maxCycles);
    const trackedBrands = [client.brandName, ...client.competitorBrands.slice(0, 4)];

    const dataPoints: TrendDataPoint[] = windowedCycles.map((cycle) => {
      const clientSov = cycle.shareOfVoice[client.brandName]?.share ?? 0;
      const competitorSovs: Record<string, number> = {};

      for (const comp of client.competitorBrands.slice(0, 4)) {
        competitorSovs[comp] = cycle.shareOfVoice[comp]?.share ?? 0;
      }

      const dateObj = new Date(cycle.startedAt);
      const formattedDate = dateObj.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });

      return {
        cycleId: cycle.cycleId,
        startedAt: cycle.startedAt,
        formattedDate,
        totalRuns: cycle.totalRuns,
        clientSov,
        clientMentionRate: cycle.overallMentionRate,
        clientCitationRate: cycle.overallCitationRate,
        competitorSovs,
        volatilityCount: cycle.volatilityCount,
      };
    });

    // Compute deterministic deltas
    const oldest = dataPoints[0];
    const latest = dataPoints[dataPoints.length - 1];

    const sovChange =
      dataPoints.length > 1
        ? Math.round((latest.clientSov - oldest.clientSov) * 100) / 100
        : 0;

    const citationRateChange =
      dataPoints.length > 1
        ? Math.round((latest.clientCitationRate - oldest.clientCitationRate) * 100) / 100
        : 0;

    const mentionRateChange =
      dataPoints.length > 1
        ? Math.round((latest.clientMentionRate - oldest.clientMentionRate) * 100) / 100
        : 0;

    const sovTrajectory: 'Improving' | 'Declining' | 'Stable' =
      sovChange >= 0.05 ? 'Improving' : sovChange <= -0.05 ? 'Declining' : 'Stable';

    const citationTrajectory: 'Improving' | 'Declining' | 'Stable' =
      citationRateChange >= 0.05
        ? 'Improving'
        : citationRateChange <= -0.05
        ? 'Declining'
        : 'Stable';

    // Identify top competitor trend
    let topCompetitorTrend: { brand: string; currentSov: number; change: number } | null = null;
    if (client.competitorBrands.length > 0) {
      const topCompBrand = client.competitorBrands[0];
      const currentCompSov = latest.competitorSovs[topCompBrand] ?? 0;
      const oldestCompSov = oldest.competitorSovs[topCompBrand] ?? 0;
      const compChange =
        dataPoints.length > 1
          ? Math.round((currentCompSov - oldestCompSov) * 100) / 100
          : 0;

      topCompetitorTrend = {
        brand: topCompBrand,
        currentSov: currentCompSov,
        change: compChange,
      };
    }

    const totalHistoricalRuns = windowedCycles.reduce((sum, c) => sum + c.totalRuns, 0);

    return {
      dataPoints,
      trackedBrands,
      summary: {
        cycleCount: windowedCycles.length,
        totalHistoricalRuns,
        sovChange,
        citationRateChange,
        mentionRateChange,
        sovTrajectory,
        citationTrajectory,
        latestClientSov: latest.clientSov,
        latestCitationRate: latest.clientCitationRate,
        topCompetitorTrend,
      },
    };
  }

  /**
   * Helper to compute correlation between Client SOV and Competitor SOV across cycles.
   */
  public static computeSovCorrelation(
    cycles: CycleAggregate[],
    clientBrand: string,
    competitorBrand: string
  ): number {
    if (!cycles || cycles.length < 2) return 0;

    const clientValues = cycles.map((c) => c.shareOfVoice[clientBrand]?.share ?? 0);
    const compValues = cycles.map((c) => c.shareOfVoice[competitorBrand]?.share ?? 0);

    const n = clientValues.length;
    const meanClient = clientValues.reduce((a, b) => a + b, 0) / n;
    const meanComp = compValues.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomClient = 0;
    let denomComp = 0;

    for (let i = 0; i < n; i++) {
      const diffClient = clientValues[i] - meanClient;
      const diffComp = compValues[i] - meanComp;
      numerator += diffClient * diffComp;
      denomClient += diffClient * diffClient;
      denomComp += diffComp * diffComp;
    }

    const denominator = Math.sqrt(denomClient * denomComp);
    if (denominator === 0) return 0;

    return Math.round((numerator / denominator) * 100) / 100;
  }
}
