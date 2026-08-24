import { StructuredExtractionResult, MentionedBrand } from '../types';

export class ExtractionValidationError extends Error {
  constructor(message: string) {
    super(`Extraction schema validation error: ${message}`);
    this.name = 'ExtractionValidationError';
  }
}

export async function extractStructuredMentions(params: {
  answerText: string;
  clientBrand: string;
  clientAliases: string[];
  competitorBrands: string[];
}): Promise<StructuredExtractionResult> {
  const { answerText, clientBrand, clientAliases, competitorBrands } = params;

  if (!answerText || answerText.trim() === '') {
    return {
      mentionedBrands: [],
      orderedList: false,
      rankedNames: [],
      recommendedEntityType: 'unknown',
      answerFormat: 'prose',
    };
  }

  const response = await fetch('/api/gemini/extract', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answerText,
      clientBrand,
      clientAliases,
      competitorBrands,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: 'Extraction service failed' }));
    throw new Error(err.error || `HTTP ${response.status} in structured extraction`);
  }

  const result = await response.json();

  // Validate response shape strictly
  if (!result || typeof result !== 'object') {
    throw new ExtractionValidationError('Response is not a valid JSON object');
  }

  if (!Array.isArray(result.mentionedBrands)) {
    throw new ExtractionValidationError("Missing or invalid 'mentionedBrands' array");
  }

  const validatedMentions: MentionedBrand[] = result.mentionedBrands.map((m: any, idx: number) => {
    if (!m.name || typeof m.name !== 'string') {
      throw new ExtractionValidationError(`Invalid brand name at index ${idx}`);
    }

    let sentiment: 'positive' | 'neutral' | 'negative' | 'Positive' | 'Neutral' | 'Negative' = 'Neutral';
    const s = String(m.sentiment || '').toLowerCase();
    if (s === 'positive') sentiment = 'Positive';
    else if (s === 'negative') sentiment = 'Negative';
    else sentiment = 'Neutral';

    return {
      name: String(m.name).trim(),
      isClient: Boolean(m.isClient),
      isKnownCompetitor: Boolean(m.isKnownCompetitor),
      sentiment,
      verbatimQuote: String(m.verbatimQuote || '').trim(),
    };
  });

  const validFormats = ['list', 'prose', 'table', 'steps'] as const;
  const answerFormat = validFormats.includes(result.answerFormat)
    ? (result.answerFormat as 'list' | 'prose' | 'table' | 'steps')
    : 'prose';

  return {
    mentionedBrands: validatedMentions,
    orderedList: Boolean(result.orderedList),
    rankedNames: Array.isArray(result.rankedNames) ? result.rankedNames.map(String) : [],
    recommendedEntityType: result.recommendedEntityType ? String(result.recommendedEntityType) : undefined,
    answerFormat,
  };
}
