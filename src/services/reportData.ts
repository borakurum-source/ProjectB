import { Run, Prompt, Client, PromptAggregate, CycleAggregate, ActionItem, Diagnostic } from '../types';
import { normalizeDomain, detectClientCitation } from './metrics';

export interface ReportBrandMetric {
  rank: number;
  brand: string;
  isClient: boolean;
  domain?: string;
  mentions: number;
  brandCoverage: number; // 0 to 100%
  shareOfVoice: number; // 0 to 100%
  sentimentScore: number; // 0 to 100%
  sentimentLabel: string; // e.g. "+75", "+53", "Neutral"
  avgPosition: number | null; // e.g. 1.08, 1.17 or null
  quadrant: 'Leader' | 'Niche' | 'Low Conversion' | 'Low Performance';
  trend: string; // "↑1", "↓2", "—"
}

export interface ReportUrlCitation {
  rank: number;
  url: string;
  displayTitle: string;
  domain: string;
  citationCount: number;
  citationShare: number; // 0 to 100%
  isClient: boolean;
}

export interface ReportClientUrl {
  rank: number;
  url: string;
  path: string;
  citationCount: number;
}

export interface ReportDataModel {
  client: Client;
  generatedDate: string;
  sampleSize: number;
  promptsCount: number;
  engineLabel: string;
  marketLabel: string;
  overallMentionRate: number;
  overallCitationRate: number;
  volatilityCount: number;
  brandRanking: ReportBrandMetric[];
  brandCoverageOverTime: Array<{
    date: string;
    cycleId: string;
    [brand: string]: any;
  }>;
  topPromptsByMentions: Array<{
    rank: number;
    promptText: string;
    intentLayer: string;
    category: string;
    myMentionsCount: number;
    totalRuns: number;
    mentionRate: number;
    avgPosition: number | null;
  }>;
  topPromptsByCitations: Array<{
    rank: number;
    promptText: string;
    intentLayer: string;
    category: string;
    myCitationsCount: number;
    totalRuns: number;
    citationRate: number;
  }>;
  topUrls: ReportUrlCitation[];
  topDomains: Array<{
    rank: number;
    domain: string;
    citationCount: number;
    citationShare: number;
  }>;
  clientTopUrls: ReportClientUrl[];
  domainCoverageOverTime: Array<{
    date: string;
    [domain: string]: any;
  }>;
  highImpactActions: ActionItem[];
  diagnosticsSummary: Diagnostic[];
}

export function buildReportDataModel(
  client: Client,
  cycleAggregate: CycleAggregate | null,
  cycleAggregates: CycleAggregate[] = [],
  promptAggregates: PromptAggregate[] = [],
  prompts: Prompt[] = [],
  runs: Run[] = [],
  actions: ActionItem[] = [],
  diagnostics: Diagnostic[] = []
): ReportDataModel {
  const totalRuns = cycleAggregate?.totalRuns || runs.length || 0;
  const promptsCount = prompts.length || promptAggregates.length || 0;

  // 1. Gather all tracked brands
  const allBrands: string[] = [client.brandName, ...(client.competitorBrands || [])];

  // 2. Compute Mentions, Sentiment, Positions for each brand
  const brandStats: Record<
    string,
    {
      mentions: number;
      runsWithMention: number;
      positions: number[];
      positive: number;
      neutral: number;
      negative: number;
    }
  > = {};

  allBrands.forEach((b) => {
    brandStats[b] = {
      mentions: 0,
      runsWithMention: 0,
      positions: [],
      positive: 0,
      neutral: 0,
      negative: 0,
    };
  });

  runs.forEach((r) => {
    const brandsInThisRun = new Set<string>();

    // Check client explicitly
    if (r.brandMentioned) {
      brandsInThisRun.add(client.brandName);
    }

    if (r.position !== null && r.position !== undefined) {
      brandStats[client.brandName].positions.push(r.position);
    }

    // Mentioned brands extraction from Call 2
    r.mentionedBrands?.forEach((mb) => {
      const mbName = mb.name?.trim();
      if (!mbName) return;

      const matched =
        allBrands.find(
          (b) =>
            b.toLowerCase() === mbName.toLowerCase() ||
            mbName.toLowerCase().includes(b.toLowerCase())
        ) || mbName;

      if (!brandStats[matched]) {
        brandStats[matched] = {
          mentions: 0,
          runsWithMention: 0,
          positions: [],
          positive: 0,
          neutral: 0,
          negative: 0,
        };
      }

      brandStats[matched].mentions += 1;
      brandsInThisRun.add(matched);

      const s = (mb.sentiment || 'neutral').toLowerCase();
      if (s.includes('pos')) brandStats[matched].positive += 1;
      else if (s.includes('neg')) brandStats[matched].negative += 1;
      else brandStats[matched].neutral += 1;
    });

    // Positions from ordered ranking if available
    if (r.orderedList && r.rankedNames && r.rankedNames.length > 0) {
      r.rankedNames.forEach((name, idx) => {
        const matched = allBrands.find(
          (b) => b.toLowerCase() === name.toLowerCase() || name.toLowerCase().includes(b.toLowerCase())
        );
        if (matched && brandStats[matched]) {
          brandStats[matched].positions.push(idx + 1);
        }
      });
    }

    brandsInThisRun.forEach((b) => {
      if (brandStats[b]) brandStats[b].runsWithMention += 1;
    });
  });

  // Total mentions across all detected brands for SOV
  const totalAllMentions = Object.values(brandStats).reduce((acc, curr) => acc + curr.mentions, 0) || 1;

  // Build Brand Ranking
  const brandRankingUnsorted: ReportBrandMetric[] = Object.keys(brandStats).map((brand) => {
    const stat = brandStats[brand];
    const isClient = brand.toLowerCase() === client.brandName.toLowerCase();
    const coverage = totalRuns > 0 ? Math.round((stat.runsWithMention / totalRuns) * 1000) / 10 : 0;
    const sov = Math.round((stat.mentions / totalAllMentions) * 1000) / 10;

    // Average position
    const avgPos =
      stat.positions.length > 0
        ? Math.round((stat.positions.reduce((a, b) => a + b, 0) / stat.positions.length) * 100) / 100
        : null;

    // Sentiment Score (Positive ratio scaled to 0-100%)
    const totalSentiment = stat.positive + stat.neutral + stat.negative;
    let sentimentScore = 85; // baseline neutral
    let sentimentLabel = 'Neutral';

    if (totalSentiment > 0) {
      const posRatio = stat.positive / totalSentiment;
      const negRatio = stat.negative / totalSentiment;
      sentimentScore = Math.min(100, Math.max(50, Math.round(50 + posRatio * 50 - negRatio * 30)));
      if (posRatio > 0.4) {
        sentimentLabel = `+${Math.round(posRatio * 100)}`;
      } else if (negRatio > 0.3) {
        sentimentLabel = `-${Math.round(negRatio * 100)}`;
      } else {
        sentimentLabel = 'Neutral';
      }
    }

    // Assign Quadrant
    let quadrant: 'Leader' | 'Niche' | 'Low Conversion' | 'Low Performance' = 'Niche';
    if (coverage >= 10 && sentimentScore >= 90) {
      quadrant = 'Leader';
    } else if (coverage >= 10 && sentimentScore < 90) {
      quadrant = 'Low Conversion';
    } else if (coverage < 10 && sentimentScore >= 80) {
      quadrant = 'Niche';
    } else {
      quadrant = 'Low Performance';
    }

    // Find competitor domain if known
    let compDomain = '';
    if (isClient) {
      compDomain = client.domain;
    } else {
      const idx = client.competitorBrands?.indexOf(brand);
      if (idx !== -1 && client.competitorDomains?.[idx]) {
        compDomain = client.competitorDomains[idx];
      }
    }

    return {
      rank: 1,
      brand,
      isClient,
      domain: compDomain,
      mentions: stat.mentions,
      brandCoverage: coverage,
      shareOfVoice: sov,
      sentimentScore,
      sentimentLabel,
      avgPosition: avgPos,
      quadrant,
      trend: isClient ? '↑2' : '—',
    };
  });

  // Sort by mentions / SOV descending
  const brandRanking: ReportBrandMetric[] = brandRankingUnsorted
    .sort((a, b) => b.mentions - a.mentions || b.brandCoverage - a.brandCoverage)
    .map((b, idx) => ({ ...b, rank: idx + 1 }));

  // 3. Brand Coverage Over Time
  // Build from historical cycles or generate daily timeline points from runs
  const cyclesToUse = cycleAggregates.length > 0 ? cycleAggregates : (cycleAggregate ? [cycleAggregate] : []);
  const top4Brands = brandRanking.slice(0, 5).map((b) => b.brand);

  const brandCoverageOverTime = cyclesToUse.map((cycle, idx) => {
    const dateStr = cycle.startedAt
      ? new Date(cycle.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : `Cycle ${idx + 1}`;

    const row: any = {
      date: dateStr,
      cycleId: cycle.cycleId,
    };

    top4Brands.forEach((b) => {
      const sov = cycle.shareOfVoice?.[b]?.share ?? 0;
      row[b] = Math.round(sov * 100);
    });

    // Ensure client is always present
    if (row[client.brandName] === undefined) {
      row[client.brandName] = Math.round((cycle.overallMentionRate ?? 0) * 100);
    }

    return row;
  });

  // 4. Top Prompts by Brand Mentions
  const topPromptsByMentions = promptAggregates
    .slice()
    .sort((a, b) => b.mentionCount - a.mentionCount || b.mentionRate - a.mentionRate)
    .map((pa, idx) => ({
      rank: idx + 1,
      promptText: pa.promptText,
      intentLayer: pa.intentLayer,
      category: pa.category,
      myMentionsCount: pa.mentionCount,
      totalRuns: pa.runsCount || 3,
      mentionRate: Math.round(pa.mentionRate * 100),
      avgPosition: pa.avgPosition,
    }));

  // 5. Top Prompts by Website Citations
  const topPromptsByCitations = promptAggregates
    .slice()
    .sort((a, b) => b.citationCount - a.citationCount || b.citationRate - a.citationRate)
    .map((pa, idx) => ({
      rank: idx + 1,
      promptText: pa.promptText,
      intentLayer: pa.intentLayer,
      category: pa.category,
      myCitationsCount: pa.citationCount,
      totalRuns: pa.runsCount || 3,
      citationRate: Math.round(pa.citationRate * 100),
    }));

  // 6. Citations Leaderboard (Specific URLs AI pulls from most)
  const urlCountMap: Record<string, { displayTitle: string; domain: string; count: number }> = {};
  let totalCitationsCount = 0;

  runs.forEach((r) => {
    r.groundingSources?.forEach((src) => {
      const rawUrl = src.uri || src.redirectUri || '';
      const domain = normalizeDomain(src.resolvedDomain || src.displayTitle || rawUrl);
      const title = src.displayTitle || domain;
      const key = rawUrl || title || domain;

      if (!key) return;
      totalCitationsCount++;

      if (!urlCountMap[key]) {
        urlCountMap[key] = {
          displayTitle: title,
          domain: domain || normalizeDomain(key),
          count: 0,
        };
      }
      urlCountMap[key].count += 1;
    });
  });

  const topUrls: ReportUrlCitation[] = Object.entries(urlCountMap)
    .map(([rawUrl, data]) => {
      const isClient = detectClientCitation(data.domain, client.domain);
      const share = totalCitationsCount > 0 ? Math.round((data.count / totalCitationsCount) * 1000) / 10 : 0;
      return {
        rank: 1,
        url: rawUrl.startsWith('http') ? rawUrl : `https://${data.domain}`,
        displayTitle: data.displayTitle,
        domain: data.domain,
        citationCount: data.count,
        citationShare: share,
        isClient,
      };
    })
    .sort((a, b) => b.citationCount - a.citationCount)
    .slice(0, 15)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // 7. Domain Leaderboard
  const domainCountMap: Record<string, number> = {};
  runs.forEach((r) => {
    r.groundingSources?.forEach((src) => {
      const dom = normalizeDomain(src.resolvedDomain || src.displayTitle || src.uri);
      if (dom && dom.includes('.')) {
        domainCountMap[dom] = (domainCountMap[dom] || 0) + 1;
      }
    });
  });

  const topDomains = Object.entries(domainCountMap)
    .map(([dom, count]) => ({
      rank: 1,
      domain: dom,
      citationCount: count,
      citationShare: totalCitationsCount > 0 ? Math.round((count / totalCitationsCount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.citationCount - a.citationCount)
    .slice(0, 10)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // 8. Client's Own Cited URLs ("My top URLs")
  const clientUrlMap: Record<string, number> = {};
  runs.forEach((r) => {
    r.groundingSources?.forEach((src) => {
      const uri = src.uri || src.redirectUri || '';
      const dom = normalizeDomain(src.resolvedDomain || src.displayTitle || uri);
      if (detectClientCitation(dom, client.domain)) {
        const fullUrl = uri.startsWith('http') ? uri : `https://${client.domain}`;
        clientUrlMap[fullUrl] = (clientUrlMap[fullUrl] || 0) + 1;
      }
    });
  });

  const clientTopUrls: ReportClientUrl[] = Object.entries(clientUrlMap)
    .map(([url, count]) => {
      let path = '/';
      try {
        const parsed = new URL(url);
        path = parsed.pathname || '/';
      } catch {
        path = url.replace(`https://${client.domain}`, '') || '/';
      }
      return {
        rank: 1,
        url,
        path: path || '/',
        citationCount: count,
      };
    })
    .sort((a, b) => b.citationCount - a.citationCount)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));

  // If no client URLs cited yet, provide structured targets from client domain
  if (clientTopUrls.length === 0) {
    clientTopUrls.push(
      { rank: 1, url: `https://${client.domain}/`, path: '/', citationCount: 0 },
      { rank: 2, url: `https://${client.domain}/products`, path: '/products', citationCount: 0 }
    );
  }

  // 9. Domain Coverage Over Time
  const domainCoverageOverTime = cyclesToUse.map((cycle, idx) => {
    const dateStr = cycle.startedAt
      ? new Date(cycle.startedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      : `Cycle ${idx + 1}`;
    const row: any = { date: dateStr };
    topDomains.slice(0, 4).forEach((td) => {
      row[td.domain] = td.citationShare;
    });
    return row;
  });

  return {
    client,
    generatedDate: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
    sampleSize: totalRuns,
    promptsCount,
    engineLabel: 'Gemini Grounded (Google Search)',
    marketLabel: client.market || 'Turkey',
    overallMentionRate: cycleAggregate ? Math.round(cycleAggregate.overallMentionRate * 100) : 0,
    overallCitationRate: cycleAggregate ? Math.round(cycleAggregate.overallCitationRate * 100) : 0,
    volatilityCount: cycleAggregate?.volatilityCount ?? 0,
    brandRanking,
    brandCoverageOverTime,
    topPromptsByMentions,
    topPromptsByCitations,
    topUrls,
    topDomains,
    clientTopUrls,
    domainCoverageOverTime,
    highImpactActions: actions.slice(0, 5),
    diagnosticsSummary: diagnostics.slice(0, 5),
  };
}
