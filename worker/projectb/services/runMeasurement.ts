import { callGroundedGemini, callStructuredGemini, isResponse, parseJsonObject, type GroundedGeminiResult } from "../providers";

type ClientInput = {
  id: unknown;
  brandName: unknown;
  aliases?: unknown;
  domain?: unknown;
  competitorBrands?: unknown;
};

type Extraction = {
  mentionedBrands: Array<{
    name: string;
    isClient: boolean;
    isKnownCompetitor: boolean;
    sentiment: "Positive" | "Neutral" | "Negative";
    verbatimQuote: string;
  }>;
  orderedList: boolean;
  rankedNames: string[];
  recommendedEntityType?: string;
  answerFormat: "list" | "prose" | "table" | "steps";
};

export interface MeasuredRun {
  answerText: string;
  groundingSources: GroundedGeminiResult["groundingSources"];
  groundingChunks: unknown[];
  webSearchQueries: string[];
  brandMentioned: boolean;
  brandCited: boolean;
  position: number | null;
  prominence: number | null;
  mentionedBrands: Extraction["mentionedBrands"];
  orderedList: boolean;
  rankedNames: string[];
  recommendedEntityType: string | null;
  answerFormat: Extraction["answerFormat"];
}

function strings(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean) : [];
}

function normalizeDomain(value: unknown): string {
  let domain = String(value ?? "").trim().toLowerCase();
  domain = domain.replace(/^[a-z]+:\/\//i, "").split(/[/?#:]/)[0].replace(/^www\./, "");
  return domain;
}

function escaped(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
}

function containsName(text: string, name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  try {
    return new RegExp(`(?:^|[^\\p{L}\\p{N}])${escaped(trimmed)}(?=$|[^\\p{L}\\p{N}])`, "iu").test(text);
  } catch {
    return text.toLocaleLowerCase().includes(trimmed.toLocaleLowerCase());
  }
}

function validateExtraction(text: string, answerText: string, client: ClientInput, aliases: string[], competitors: string[]): Extraction {
  const value = parseJsonObject(text);
  if (!value || !Array.isArray(value.mentionedBrands)) throw new Error("Structured extraction is missing mentionedBrands");

  const clientNames = [String(client.brandName ?? ""), ...aliases].filter(Boolean);
  const competitorNames = competitors.filter(Boolean);
  const mentionedBrands = value.mentionedBrands.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const name = String(row.name ?? "").trim();
    if (!name || !containsName(answerText, name)) return [];
    const rawSentiment = String(row.sentiment ?? "Neutral").toLowerCase();
    const sentiment = rawSentiment === "positive" ? "Positive" : rawSentiment === "negative" ? "Negative" : "Neutral";
    return [{
      name,
      isClient: clientNames.some((candidate) => containsName(name, candidate) || containsName(candidate, name)),
      isKnownCompetitor: competitorNames.some((candidate) => containsName(name, candidate) || containsName(candidate, name)),
      sentiment: sentiment as "Positive" | "Neutral" | "Negative",
      verbatimQuote: String(row.verbatimQuote ?? "").trim(),
    }];
  });

  const answerFormat = ["list", "prose", "table", "steps"].includes(String(value.answerFormat))
    ? String(value.answerFormat) as Extraction["answerFormat"]
    : "prose";
  const rankedNames = strings(value.rankedNames);
  const orderedList = Boolean(value.orderedList) && rankedNames.length > 0;

  return {
    mentionedBrands,
    orderedList,
    rankedNames,
    recommendedEntityType: value.recommendedEntityType == null ? undefined : String(value.recommendedEntityType),
    answerFormat,
  };
}

export async function measureRun(
  env: Parameters<typeof callGroundedGemini>[0],
  input: { promptText: string; client: ClientInput },
): Promise<MeasuredRun | Response> {
  const grounded = await callGroundedGemini(env, input.promptText);
  if (isResponse(grounded)) return grounded;

  const aliases = strings(input.client.aliases);
  const competitors = strings(input.client.competitorBrands);
  const extraction = await callStructuredGemini(env, {
    answerText: grounded.answerText,
    clientBrand: String(input.client.brandName ?? ""),
    clientAliases: aliases,
    competitorBrands: competitors,
  });
  if (isResponse(extraction)) return extraction;

  const validated = validateExtraction(extraction, grounded.answerText, input.client, aliases, competitors);
  const clientNames = [String(input.client.brandName ?? ""), ...aliases].filter(Boolean);
  const firstMention = clientNames
    .map((name) => ({ name, index: grounded.answerText.toLocaleLowerCase().indexOf(name.toLocaleLowerCase()) }))
    .filter((match) => match.index >= 0)
    .sort((a, b) => a.index - b.index)[0]?.index;
  const clientDomain = normalizeDomain(input.client.domain);
  const brandCited = grounded.groundingSources.some((source) => {
    const sourceDomain = normalizeDomain(source.resolvedDomain || source.displayTitle);
    return Boolean(sourceDomain && clientDomain && (sourceDomain === clientDomain || sourceDomain.endsWith(`.${clientDomain}`)));
  });
  const rankedPosition = validated.orderedList
    ? validated.rankedNames.findIndex((name) => clientNames.some((candidate) => containsName(name, candidate) || containsName(candidate, name)))
    : -1;

  return {
    answerText: grounded.answerText,
    groundingSources: grounded.groundingSources,
    groundingChunks: grounded.groundingChunks,
    webSearchQueries: grounded.webSearchQueries,
    brandMentioned: firstMention !== undefined,
    brandCited,
    position: rankedPosition >= 0 ? rankedPosition + 1 : null,
    prominence: firstMention === undefined ? null : Math.round((firstMention / Math.max(1, grounded.answerText.length)) * 10000) / 10000,
    mentionedBrands: validated.mentionedBrands,
    orderedList: validated.orderedList,
    rankedNames: validated.rankedNames,
    recommendedEntityType: validated.recommendedEntityType ?? null,
    answerFormat: validated.answerFormat,
  };
}
