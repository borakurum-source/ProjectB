import { Run, Prompt, Client, MetricValue, PromptAggregate, CycleAggregate } from '../types';

/**
 * Normalizes a domain string by stripping protocols, ports, paths, and leading 'www.'
 */
export function normalizeDomain(rawDomain: string): string {
  if (!rawDomain) return '';
  let domain = rawDomain.trim().toLowerCase();
  // Remove protocol
  domain = domain.replace(/^[a-z]+:\/\//i, '');
  // Remove path, query, hash
  domain = domain.split('/')[0].split('?')[0].split('#')[0];
  // Remove port
  domain = domain.split(':')[0];
  // Remove www.
  domain = domain.replace(/^www\./, '');
  return domain;
}

/**
 * Determines if a source domain matches the client domain (subdomains included, case/www insensitive).
 */
export function detectClientCitation(sourceDomainOrTitle: string | null | undefined, clientDomain: string): boolean {
  if (!sourceDomainOrTitle || !clientDomain) return false;
  const normalizedSource = normalizeDomain(sourceDomainOrTitle);
  const normalizedClient = normalizeDomain(clientDomain);

  if (!normalizedSource || !normalizedClient) return false;

  // Exact match
  if (normalizedSource === normalizedClient) return true;

  // Subdomain match: e.g. docs.acme.com ends with .acme.com
  if (normalizedSource.endsWith(`.${normalizedClient}`)) return true;

  return false;
}

export const matchDomain = detectClientCitation;

/**
 * Assign an integer position ONLY when the answer contains an explicit ordered recommendation.
 * For ordinary prose, position MUST be null.
 */
export function derivePosition(run: Run, brandName: string, aliases: string[] = []): number | null {
  if (!run.orderedList || !run.rankedNames || run.rankedNames.length === 0) {
    return null;
  }

  const allNames = [brandName, ...aliases].map((n) => n.trim().toLowerCase());

  for (let i = 0; i < run.rankedNames.length; i++) {
    const ranked = run.rankedNames[i].trim().toLowerCase();
    if (allNames.some((n) => ranked.includes(n) || n.includes(ranked))) {
      return i + 1; // 1-based index
    }
  }

  return null;
}

/**
 * Prominence: (firstMentionOffset / answerLength), clearly labeled experimental.
 */
export function computeProminence(run: Run, brandName: string, aliases: string[] = []): MetricValue<number | null> {
  if (!run.answerText || run.answerText.length === 0) {
    return { value: null, sampleSize: 1, display: 'N/A (n=1)' };
  }

  const text = run.answerText.toLowerCase();
  const targets = [brandName, ...aliases].map((t) => t.trim().toLowerCase()).filter(Boolean);

  let earliestOffset = -1;
  for (const target of targets) {
    const idx = text.indexOf(target);
    if (idx !== -1) {
      if (earliestOffset === -1 || idx < earliestOffset) {
        earliestOffset = idx;
      }
    }
  }

  if (earliestOffset === -1) {
    return { value: null, sampleSize: 1, display: 'N/A (n=1)' };
  }

  const ratio = Math.round((earliestOffset / run.answerText.length) * 100) / 100;
  return {
    value: ratio,
    sampleSize: 1,
    display: `${Math.round(ratio * 100)}% (n=1)`,
  };
}

/**
 * Mention Rate: runs where brandMentioned / total runs.
 */
export function computeMentionRate(runs: Run[]): MetricValue<number> {
  const sampleSize = runs.length;
  if (sampleSize === 0) {
    return { value: 0, sampleSize: 0, display: '0% (n=0)' };
  }

  const mentionedCount = runs.filter((r) => r.brandMentioned).length;
  const value = Math.round((mentionedCount / sampleSize) * 100) / 100;
  const percentage = Math.round((mentionedCount / sampleSize) * 100);

  return {
    value,
    sampleSize,
    display: `${percentage}% (${mentionedCount}/${sampleSize})`,
  };
}

/**
 * Citation Rate: runs where client domain in groundingSources / total runs.
 */
export function computeCitationRate(runs: Run[], clientDomain: string): MetricValue<number> {
  const sampleSize = runs.length;
  if (sampleSize === 0) {
    return { value: 0, sampleSize: 0, display: '0% (n=0)' };
  }

  const citedCount = runs.filter((r) => {
    if (r.brandCited) return true;
    return r.groundingSources.some((src) =>
      detectClientCitation(src.resolvedDomain || src.displayTitle, clientDomain)
    );
  }).length;

  const value = Math.round((citedCount / sampleSize) * 100) / 100;
  const percentage = Math.round((citedCount / sampleSize) * 100);

  return {
    value,
    sampleSize,
    display: `${percentage}% (${citedCount}/${sampleSize})`,
  };
}

/**
 * Volatility: true when mentionRate is neither 0 nor 1 (unstable visibility).
 */
export function computeVolatility(mentionRate: number): boolean {
  return mentionRate > 0 && mentionRate < 1;
}

/**
 * Share of Voice: brand mention count / total mention count of all detected brands.
 */
export function computeShareOfVoice(
  runs: Run[],
  clientBrand: string,
  competitorBrands: string[]
): Record<string, { share: number; mentionCount: number; sampleSize: number; display: string }> {
  const sampleSize = runs.length;
  const allTrackedBrands = [clientBrand, ...competitorBrands];
  const counts: Record<string, number> = {};
  allTrackedBrands.forEach((b) => (counts[b] = 0));

  let totalBrandMentions = 0;

  for (const run of runs) {
    for (const mention of run.mentionedBrands) {
      const match = allTrackedBrands.find(
        (b) => b.toLowerCase() === mention.name.toLowerCase()
      );
      if (match) {
        counts[match] = (counts[match] || 0) + 1;
        totalBrandMentions++;
      } else if (mention.name) {
        counts[mention.name] = (counts[mention.name] || 0) + 1;
        totalBrandMentions++;
      }
    }
  }

  const result: Record<string, { share: number; mentionCount: number; sampleSize: number; display: string }> = {};

  for (const [brand, count] of Object.entries(counts)) {
    const share = totalBrandMentions > 0 ? Math.round((count / totalBrandMentions) * 100) / 100 : 0;
    const percentage = Math.round(share * 100);
    result[brand] = {
      share,
      mentionCount: count,
      sampleSize,
      display: `${percentage}% (n=${sampleSize})`,
    };
  }

  return result;
}

/**
 * Competitor Mention Rates: same as mentionRate, per competitor brand.
 */
export function computeCompetitorRates(
  runs: Run[],
  competitorBrands: string[]
): Record<string, { rate: number; count: number; sampleSize: number; display: string }> {
  const sampleSize = runs.length;
  const result: Record<string, { rate: number; count: number; sampleSize: number; display: string }> = {};

  for (const comp of competitorBrands) {
    const compLower = comp.toLowerCase();
    const count = runs.filter((r) =>
      r.mentionedBrands.some(
        (m) =>
          m.name.toLowerCase() === compLower ||
          m.name.toLowerCase().includes(compLower)
      )
    ).length;

    const rate = sampleSize > 0 ? Math.round((count / sampleSize) * 100) / 100 : 0;
    const percentage = Math.round(rate * 100);

    result[comp] = {
      rate,
      count,
      sampleSize,
      display: `${percentage}% (${count}/${sampleSize})`,
    };
  }

  return result;
}

/**
 * Citation Domain Leaderboard: how many runs cited a given domain.
 */
export function computeCitationDomainLeaderboard(
  runs: Run[]
): { domain: string; count: number; citationRate: number; sampleSize: number; display: string }[] {
  const sampleSize = runs.length;
  if (sampleSize === 0) return [];

  const domainRunsMap: Record<string, Set<string>> = {};

  for (const run of runs) {
    const citedDomainsInThisRun = new Set<string>();
    for (const src of run.groundingSources) {
      const domain = normalizeDomain(src.resolvedDomain || src.displayTitle);
      if (domain && domain.length > 2 && domain.includes('.')) {
        citedDomainsInThisRun.add(domain);
      }
    }

    citedDomainsInThisRun.forEach((d) => {
      if (!domainRunsMap[d]) domainRunsMap[d] = new Set();
      domainRunsMap[d].add(run.id);
    });
  }

  const leaderboard = Object.entries(domainRunsMap).map(([domain, runSet]) => {
    const count = runSet.size;
    const citationRate = Math.round((count / sampleSize) * 100) / 100;
    const percentage = Math.round(citationRate * 100);
    return {
      domain,
      count,
      citationRate,
      sampleSize,
      display: `${percentage}% (${count}/${sampleSize})`,
    };
  });

  return leaderboard.sort((a, b) => b.count - a.count);
}

/**
 * Computes aggregate metrics for a single prompt across its runs.
 */
export function computePromptAggregate(
  prompt: Prompt,
  promptRuns: Run[],
  client: Client
): PromptAggregate {
  const runsCount = promptRuns.length;

  const mentionMetric = computeMentionRate(promptRuns);
  const citationMetric = computeCitationRate(promptRuns, client.domain);
  const volatility = computeVolatility(mentionMetric.value);

  // Positions & prominence
  const positions = promptRuns
    .map((r) => r.position)
    .filter((p): p is number => p !== null);
  const avgPosition =
    positions.length > 0
      ? Math.round((positions.reduce((a, b) => a + b, 0) / positions.length) * 10) / 10
      : null;

  const prominences = promptRuns
    .map((r) => r.prominence)
    .filter((p): p is number => p !== null);
  const prominence =
    prominences.length > 0
      ? Math.round((prominences.reduce((a, b) => a + b, 0) / prominences.length) * 100) / 100
      : null;

  // Competitor rates
  const compRates = computeCompetitorRates(promptRuns, client.competitorBrands);
  const competitorMentionRates: Record<string, { rate: number; count: number }> = {};
  for (const [c, d] of Object.entries(compRates)) {
    competitorMentionRates[c] = { rate: d.rate, count: d.count };
  }

  // Top source domains for this prompt
  const domainLeaderboard = computeCitationDomainLeaderboard(promptRuns);
  const topSourceDomains = domainLeaderboard.slice(0, 5).map((d) => ({
    domain: d.domain,
    count: d.count,
  }));

  const lastRunAt = promptRuns.length > 0 ? promptRuns[promptRuns.length - 1].runAt : undefined;

  return {
    promptId: prompt.id,
    promptText: prompt.text,
    category: prompt.category,
    intentLayer: prompt.intentLayer,
    runsCount,
    mentionRate: mentionMetric.value,
    mentionCount: Math.round(mentionMetric.value * runsCount),
    citationRate: citationMetric.value,
    citationCount: Math.round(citationMetric.value * runsCount),
    volatility,
    avgPosition,
    prominence,
    competitorMentionRates,
    topSourceDomains,
    lastRunAt,
  };
}

/**
 * Computes prompt aggregates across multiple runs.
 */
export function computePromptAggregates(
  prompts: Prompt[],
  runs: Run[],
  client: Client
): PromptAggregate[] {
  return prompts.map((prompt) => {
    const promptRuns = runs.filter((r) => r.promptId === prompt.id);
    return computePromptAggregate(prompt, promptRuns, client);
  });
}

/**
 * Computes cycle aggregate for a completed run cycle.
 */
export function computeCycleAggregate(
  cycleId: string,
  runs: Run[],
  client: Client
): CycleAggregate {
  const cycleRuns = runs.filter((r) => r.cycleId === cycleId);
  const promptIds = new Set(cycleRuns.map((r) => r.promptId));
  const engine = cycleRuns[0]?.engine || 'gemini-grounded';
  const startedAt = cycleRuns[0]?.runAt || new Date().toISOString();

  const overallMention = computeMentionRate(cycleRuns);
  const overallCitation = computeCitationRate(cycleRuns, client.domain);

  const sovData = computeShareOfVoice(cycleRuns, client.brandName, client.competitorBrands);
  const shareOfVoice: Record<string, { share: number; mentionCount: number }> = {};
  for (const [b, d] of Object.entries(sovData)) {
    shareOfVoice[b] = { share: d.share, mentionCount: d.mentionCount };
  }

  // Count volatile prompts in this cycle
  let volatilityCount = 0;
  promptIds.forEach((pId) => {
    const pRuns = cycleRuns.filter((r) => r.promptId === pId);
    const pMention = computeMentionRate(pRuns);
    if (computeVolatility(pMention.value)) {
      volatilityCount++;
    }
  });

  const leaderboardDomains = computeCitationDomainLeaderboard(cycleRuns);

  return {
    cycleId,
    clientId: client.id,
    engine,
    startedAt,
    totalRuns: cycleRuns.length,
    promptsCount: promptIds.size,
    runsPerPrompt: promptIds.size > 0 ? Math.round(cycleRuns.length / promptIds.size) : 3,
    overallMentionRate: overallMention.value,
    overallCitationRate: overallCitation.value,
    shareOfVoice,
    volatilityCount,
    leaderboardDomains,
  };
}
