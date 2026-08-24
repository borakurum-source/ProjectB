import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initializer for Gemini client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required on the server.');
    }
    geminiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return geminiClient;
}

// Runtime memory fallback for Perplexity API Key
let globalPerplexityKey = process.env.PERPLEXITY_API_KEY || '';

function getPerplexityApiKey(): string {
  return process.env.PERPLEXITY_API_KEY || globalPerplexityKey || '';
}

// -------------------------------------------------------------
// Helper: Extract domain from title / string
// -------------------------------------------------------------
function extractDomain(title: string | undefined, uri: string | undefined): string | null {
  if (title) {
    const match = title.match(/(?:https?:\/\/)?(?:www\.)?([a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\.[a-zA-Z]{2,})?)/i);
    if (match && match[1]) return match[1].toLowerCase();
    
    // Check pipe / hyphen / colon separators (e.g. "G2 | Best APM Tools" or "Datadog Docs")
    const parts = title.split(/[|\-:]/).map(p => p.trim());
    for (const part of parts) {
      if (/\.(com|org|io|net|dev|ai|co)/i.test(part)) {
        const pMatch = part.match(/([a-zA-Z0-9-]+\.[a-zA-Z]{2,})/i);
        if (pMatch) return pMatch[1].toLowerCase();
      }
    }
  }
  if (uri) {
    try {
      const parsed = new URL(uri);
      if (parsed.hostname && !parsed.hostname.includes('vertexaisearch') && !parsed.hostname.includes('google.com')) {
        return parsed.hostname.replace(/^www\./, '').toLowerCase();
      }
    } catch {
      // ignore
    }
  }
  return null;
}

function matchDomainExact(sourceDomain: string | null, targetDomain: string): boolean {
  if (!sourceDomain || !targetDomain) return false;
  const s = sourceDomain.toLowerCase().replace(/^www\./, '').trim();
  const t = targetDomain.toLowerCase().replace(/^www\./, '').trim();
  return s === t || s.endsWith('.' + t) || t.endsWith('.' + s);
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Health check & environment status
app.get('/api/health', (req, res) => {
  const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
  const hasPerplexityKey = Boolean(getPerplexityApiKey());
  res.json({
    status: 'ok',
    apiKeyConfigured: hasGeminiKey,
    perplexityApiKeyConfigured: hasPerplexityKey,
    defaultEngine: 'gemini-grounded',
    availableEngines: [
      { id: 'gemini-grounded', label: 'Gemini Grounded', supportsGrounding: true, enabled: true },
      { id: 'perplexity-sonar', label: 'Perplexity Sonar', supportsGrounding: true, enabled: hasPerplexityKey }
    ]
  });
});

// Configure or check Perplexity API key
app.post('/api/settings/perplexity-key', (req, res) => {
  const { apiKey } = req.body;
  if (typeof apiKey === 'string') {
    globalPerplexityKey = apiKey.trim();
    if (globalPerplexityKey) {
      process.env.PERPLEXITY_API_KEY = globalPerplexityKey;
    }
  }
  const configured = Boolean(getPerplexityApiKey());
  res.json({
    status: 'ok',
    configured,
  });
});

// Dedicated Call 1 Endpoint: Gemini Grounded with Google Search (Verbatim Prompt)
app.post('/api/gemini/run', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt text.' });
    }

    const ai = getGemini();
    const call1Response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt, // Verbatim prompt, zero prepended bias
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const answerText = call1Response.text || '';
    const groundingSources: { uri: string; displayTitle: string; resolvedDomain: string | null }[] = [];
    const webSearchQueries: string[] = [];

    const candidate = call1Response.candidates?.[0];
    const groundingMetadata = candidate?.groundingMetadata;
    const rawChunks = groundingMetadata?.groundingChunks || [];

    if (groundingMetadata?.webSearchQueries) {
      webSearchQueries.push(...groundingMetadata.webSearchQueries);
    }

    if (groundingMetadata?.groundingChunks) {
      for (const chunk of groundingMetadata.groundingChunks) {
        if (chunk.web) {
          const uri = chunk.web.uri || '';
          const displayTitle = chunk.web.title || uri;
          const resolvedDomain = extractDomain(chunk.web.title, chunk.web.uri);
          groundingSources.push({
            uri,
            displayTitle,
            resolvedDomain,
          });
        }
      }
    }

    res.json({
      model: 'gemini-2.5-flash',
      answerText,
      groundingSources,
      groundingChunks: rawChunks,
      webSearchQueries,
    });
  } catch (err: any) {
    console.error('Call 1 Gemini Grounded error:', err);
    res.status(500).json({ error: err?.message || 'Call 1 execution failed.' });
  }
});

// Dedicated Call 2 Endpoint: Structured Semantic Extraction
app.post('/api/gemini/extract', async (req, res) => {
  try {
    const { answerText, clientBrand, clientAliases = [], competitorBrands = [] } = req.body;
    if (!answerText) {
      return res.status(400).json({ error: 'Missing answerText.' });
    }

    const ai = getGemini();
    const extractionPrompt = `
Analyze the following AI-generated answer text to identify all referenced brands, products, organizations, and rank ordering.

Client Brand Name: "${clientBrand}"
Client Aliases: ${JSON.stringify(clientAliases)}
Known Competitors: ${JSON.stringify(competitorBrands)}

Answer Text to parse:
"""
${answerText}
"""

Instructions:
1. Extract all software, technology, or company brand mentions in "mentionedBrands".
2. Mark isClient=true if the brand matches the client brand or any of its aliases.
3. Mark isKnownCompetitor=true if the brand matches any listed known competitor.
4. Extract sentiment (Positive, Neutral, Negative) and the exact verbatimQuote from the text.
5. Determine if the answer is explicitly formatted as a numbered / ranked ordered recommendation (orderedList=true). Only mark orderedList=true if the text uses explicit numbering like "1. X  2. Y  3. Z" or explicit ranked positioning words ("First choice: X, Second: Y").
6. If orderedList is true, list the ranked brand names in rankedNames in order of their rank (1st to Nth). If prose, set orderedList=false and rankedNames=[].
7. Identify the answerFormat (list, prose, table, steps) and recommendedEntityType.
`;

    const call2Response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: extractionPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mentionedBrands: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  isClient: { type: Type.BOOLEAN },
                  isKnownCompetitor: { type: Type.BOOLEAN },
                  sentiment: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Negative'] },
                  verbatimQuote: { type: Type.STRING },
                },
                required: ['name', 'isClient', 'isKnownCompetitor', 'sentiment', 'verbatimQuote'],
              },
            },
            orderedList: { type: Type.BOOLEAN },
            rankedNames: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedEntityType: { type: Type.STRING },
            answerFormat: { type: Type.STRING, enum: ['list', 'prose', 'table', 'steps'] },
          },
          required: ['mentionedBrands', 'orderedList', 'rankedNames', 'answerFormat'],
        },
      },
    });

    const parsed = JSON.parse(call2Response.text || '{}');
    res.json(parsed);
  } catch (err: any) {
    console.error('Call 2 Gemini Extraction error:', err);
    res.status(500).json({ error: err?.message || 'Call 2 extraction failed.' });
  }
});

// Dedicated Opportunity Finder Endpoint: Suggest 20 high-value tracked prompts
app.post('/api/gemini/opportunities', async (req, res) => {
  try {
    const { client } = req.body;
    if (!client) return res.status(400).json({ error: 'Client profile required.' });

    const ai = getGemini();
    const promptText = `
You are the prompt research engine for RAG Signal (AEO / GEO visibility tool).
Generate exactly 20 diverse, high-commercial-intent, realistic user prompts that prospective B2B buyers would ask an AI search engine (like Gemini / Perplexity) in this industry.

Client: "${client.brandName}" (Domain: ${client.domain})
Industry: ${client.industry || 'B2B Software'}
Competitors: ${JSON.stringify(client.competitorBrands || [])}

Requirements:
- Exactly 20 distinct prompts.
- Cover all Intent Layers: Informational (4), Commercial (6), Comparative (6), Navigational (2), Transactional (2).
- Prompts must sound like real buyers typing queries (e.g., "best apm tools for kubernetes", "datadog vs dynatrace pricing comparison", "how to monitor microservices latency").
- Give a 1-sentence rationale for why this prompt is a high-value visibility opportunity.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            prompts: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  intentLayer: {
                    type: Type.STRING,
                    enum: ['Informational', 'Commercial', 'Comparative', 'Navigational', 'Transactional'],
                  },
                  category: { type: Type.STRING },
                  rationale: { type: Type.STRING },
                  targetCompetitor: { type: Type.STRING },
                },
                required: ['text', 'intentLayer', 'category', 'rationale'],
              },
            },
          },
          required: ['prompts'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{ "prompts": [] }');
    res.json(parsed);
  } catch (err: any) {
    console.error('Opportunity finder error:', err);
    res.status(500).json({ error: err?.message || 'Failed to generate prompt opportunities.' });
  }
});

// Deterministic URL Fetcher & Metadata Parser
app.post('/api/url/fetch', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required.' });

    const fetchRes = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!fetchRes.ok) {
      return res.status(fetchRes.status).json({ error: `HTTP ${fetchRes.status} fetching URL` });
    }

    const html = await fetchRes.text();
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';

    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const h1 = h1Match ? h1Match[1].trim() : '';

    const h2Matches = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)];
    const h2s = h2Matches.map(m => m[1].trim()).slice(0, 10);

    const hasTable = /<table[\s>]/i.test(html);
    const hasSchema = /type=["']application\/ld\+json["']/i.test(html);

    res.json({
      url,
      status: fetchRes.status,
      title,
      h1,
      h2Count: h2Matches.length,
      h2Samples: h2s,
      hasTable,
      hasSchema,
      contentLength: html.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch and parse URL.' });
  }
});

// Single Run Execution (The Two-Call Execution Pattern)
// Call 1: Grounded Answer (model: gemini-2.5-flash with googleSearch)
// Call 2: Structured Semantic Extraction (model: gemini-2.5-flash with responseSchema)
async function executeSingleRun(params: {
  promptText: string;
  clientBrandName: string;
  clientAliases: string[];
  clientDomain: string;
  competitorBrands: string[];
  competitorDomains: string[];
  engine: string;
  runIndex: number;
}): Promise<{
  answerText: string;
  groundingSources: { uri: string; displayTitle: string; resolvedDomain: string | null }[];
  groundingChunks?: any[];
  webSearchQueries: string[];
  brandMentioned: boolean;
  brandCited: boolean;
  position: number | null;
  prominence: number | null;
  mentionedBrands: Array<{
    name: string;
    isClient: boolean;
    isKnownCompetitor: boolean;
    sentiment: 'Positive' | 'Neutral' | 'Negative';
    verbatimQuote: string;
  }>;
  orderedList: boolean;
  rankedNames: string[];
  recommendedEntityType?: string;
  answerFormat: 'list' | 'prose' | 'table' | 'steps';
  error: string | null;
}> {
  const ai = getGemini();

  // === CALL 1: GROUNDED ANSWER (Verbatim Prompt, No Bias) ===
  let answerText = '';
  const groundingSources: { uri: string; displayTitle: string; resolvedDomain: string | null }[] = [];
  let rawGroundingChunks: any[] = [];
  const webSearchQueries: string[] = [];

  if (params.engine === 'perplexity-sonar') {
    const perplexityKey = getPerplexityApiKey();
    if (!perplexityKey) {
      return {
        answerText: '',
        groundingSources: [],
        groundingChunks: [],
        webSearchQueries: [],
        brandMentioned: false,
        brandCited: false,
        position: null,
        prominence: null,
        mentionedBrands: [],
        orderedList: false,
        rankedNames: [],
        answerFormat: 'prose',
        error: 'PERPLEXITY_API_KEY is missing. Please configure a Perplexity API key in Settings.',
      };
    }

    try {
      const pRes = await fetch('https://api.perplexity.ai/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${perplexityKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'sonar',
          messages: [{ role: 'user', content: params.promptText }],
        }),
      });

      if (!pRes.ok) {
        const errBody = await pRes.text();
        throw new Error(`Perplexity API HTTP ${pRes.status}: ${errBody}`);
      }

      const pData = await pRes.json();
      answerText = pData.choices?.[0]?.message?.content || '';
      const citations: string[] = pData.citations || [];

      for (const uri of citations) {
        const resolvedDomain = extractDomain(undefined, uri);
        groundingSources.push({
          uri,
          displayTitle: resolvedDomain || uri,
          resolvedDomain,
        });
      }
      webSearchQueries.push(params.promptText);
    } catch (err: any) {
      return {
        answerText: '',
        groundingSources: [],
        groundingChunks: [],
        webSearchQueries: [],
        brandMentioned: false,
        brandCited: false,
        position: null,
        prominence: null,
        mentionedBrands: [],
        orderedList: false,
        rankedNames: [],
        answerFormat: 'prose',
        error: `Call 1 (Perplexity Sonar) failed: ${err?.message || String(err)}`,
      };
    }
  } else {
    try {
      const call1Response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: params.promptText, // Verbatim prompt
        config: {
          tools: [{ googleSearch: {} }],
        },
      });

      answerText = call1Response.text || '';

      // Extract grounding metadata safely
      const candidate = call1Response.candidates?.[0];
      const groundingMetadata = candidate?.groundingMetadata;
      rawGroundingChunks = groundingMetadata?.groundingChunks || [];

      if (groundingMetadata?.webSearchQueries) {
        webSearchQueries.push(...groundingMetadata.webSearchQueries);
      }

      if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
          if (chunk.web) {
            const uri = chunk.web.uri || '';
            const displayTitle = chunk.web.title || uri;
            const resolvedDomain = extractDomain(chunk.web.title, chunk.web.uri);
            groundingSources.push({
              uri,
              displayTitle,
              resolvedDomain,
            });
          }
        }
      }
    } catch (err: any) {
      return {
        answerText: '',
        groundingSources: [],
        groundingChunks: [],
        webSearchQueries: [],
        brandMentioned: false,
        brandCited: false,
        position: null,
        prominence: null,
        mentionedBrands: [],
        orderedList: false,
        rankedNames: [],
        answerFormat: 'prose',
        error: `Call 1 (Grounded Answer) failed: ${err?.message || String(err)}`,
      };
    }
  }

  if (!answerText.trim()) {
    return {
      answerText: '',
      groundingSources,
      groundingChunks: rawGroundingChunks,
      webSearchQueries,
      brandMentioned: false,
      brandCited: false,
      position: null,
      prominence: null,
      mentionedBrands: [],
      orderedList: false,
      rankedNames: [],
      answerFormat: 'prose',
      error: 'Empty response returned from grounding search.',
    };
  }

  // === CALL 2: STRUCTURED EXTRACTION (Schema-driven semantic parser) ===
  const extractionPrompt = `
Analyze the following AI-generated answer text to identify all referenced brands, products, organizations, and rank ordering.

Client Brand Name: "${params.clientBrandName}"
Client Aliases: ${JSON.stringify(params.clientAliases)}
Known Competitors: ${JSON.stringify(params.competitorBrands)}

Answer Text to parse:
"""
${answerText}
"""

Instructions:
1. Extract all software, technology, or company brand mentions in "mentionedBrands".
2. Mark isClient=true if the brand matches the client brand or any of its aliases.
3. Mark isKnownCompetitor=true if the brand matches any listed known competitor.
4. Extract sentiment (Positive, Neutral, Negative) and the short verbatimQuote from the text.
5. Determine if the answer is explicitly formatted as a numbered / ranked ordered recommendation (orderedList=true). Only mark orderedList=true if the text uses explicit numbering like "1. X  2. Y  3. Z" or explicit ranked positioning words ("First choice: X, Second: Y").
6. If orderedList is true, list the ranked brand names in rankedNames in order of their rank (1st to Nth). If prose, set orderedList=false and rankedNames=[].
7. Identify the answerFormat (list, prose, table, steps) and recommendedEntityType.
`;

  let extractedData: any = {
    mentionedBrands: [],
    orderedList: false,
    rankedNames: [],
    recommendedEntityType: 'Software / Service',
    answerFormat: 'prose',
  };

  try {
    const call2Response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: extractionPrompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mentionedBrands: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  isClient: { type: Type.BOOLEAN },
                  isKnownCompetitor: { type: Type.BOOLEAN },
                  sentiment: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Negative'] },
                  verbatimQuote: { type: Type.STRING },
                },
                required: ['name', 'isClient', 'isKnownCompetitor', 'sentiment', 'verbatimQuote'],
              },
            },
            orderedList: { type: Type.BOOLEAN },
            rankedNames: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendedEntityType: { type: Type.STRING },
            answerFormat: { type: Type.STRING, enum: ['list', 'prose', 'table', 'steps'] },
          },
          required: ['mentionedBrands', 'orderedList', 'rankedNames', 'answerFormat'],
        },
      },
    });

    const parsedJson = JSON.parse(call2Response.text || '{}');
    extractedData = parsedJson;
  } catch (err: any) {
    console.error('Call 2 extraction failed, falling back to deterministic text matching:', err);
    // Fallback: check brand in text
    const lower = answerText.toLowerCase();
    const brandMatched = [params.clientBrandName, ...params.clientAliases].some(a => lower.includes(a.toLowerCase()));
    if (brandMatched) {
      extractedData.mentionedBrands.push({
        name: params.clientBrandName,
        isClient: true,
        isKnownCompetitor: false,
        sentiment: 'Neutral',
        verbatimQuote: params.clientBrandName,
      });
    }
  }

  // === DETERMINISTIC POST-PROCESSING IN TYPESCRIPT ===
  // 1. brandMentioned: check if client was identified or in text
  const clientNames = [params.clientBrandName, ...params.clientAliases].map(s => s.toLowerCase());
  const answerLower = answerText.toLowerCase();

  const directTextMention = clientNames.some(alias => {
    // Word boundary check
    const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return regex.test(answerLower);
  });

  const structuredClientMention = (extractedData.mentionedBrands || []).some(
    (m: any) => m.isClient || clientNames.includes(m.name?.toLowerCase())
  );

  const brandMentioned = directTextMention || structuredClientMention;

  // 2. brandCited: check if client domain matches any resolved source domain
  const brandCited = groundingSources.some(source => {
    return matchDomainExact(source.resolvedDomain, params.clientDomain) ||
           matchDomainExact(source.displayTitle, params.clientDomain);
  });

  // 3. Rank Position Rule: integer ONLY if answer contains explicit ordered recommendation
  let position: number | null = null;
  if (extractedData.orderedList && Array.isArray(extractedData.rankedNames) && extractedData.rankedNames.length > 0) {
    const idx = extractedData.rankedNames.findIndex((name: string) => {
      const nLower = name.toLowerCase();
      return clientNames.some(c => nLower.includes(c) || c.includes(nLower));
    });
    if (idx !== -1) {
      position = idx + 1; // 1-indexed
    }
  }

  // 4. Prominence: firstMentionOffset / answerLength
  let prominence: number | null = null;
  if (brandMentioned && answerText.length > 0) {
    let firstOffset = -1;
    for (const name of clientNames) {
      const pos = answerLower.indexOf(name);
      if (pos !== -1 && (firstOffset === -1 || pos < firstOffset)) {
        firstOffset = pos;
      }
    }
    if (firstOffset !== -1) {
      prominence = Math.round((firstOffset / answerText.length) * 100) / 100;
    }
  }

  return {
    answerText,
    groundingSources,
    groundingChunks: rawGroundingChunks,
    webSearchQueries,
    brandMentioned,
    brandCited,
    position,
    prominence,
    mentionedBrands: extractedData.mentionedBrands || [],
    orderedList: Boolean(extractedData.orderedList),
    rankedNames: extractedData.rankedNames || [],
    recommendedEntityType: extractedData.recommendedEntityType,
    answerFormat: extractedData.answerFormat || 'prose',
    error: null,
  };
}

// POST /api/runs/execute-cycle: Execute full Run Cycle
app.post('/api/runs/execute-cycle', async (req, res) => {
  try {
    const {
      clientId,
      client,
      prompts,
      runsPerPrompt = 3,
      engine = 'gemini-grounded',
      isRetest = false,
      retestedActionId,
    } = req.body;

    if (!client || !Array.isArray(prompts) || prompts.length === 0) {
      return res.status(400).json({ error: 'Invalid payload. Missing client or prompts array.' });
    }

    if (engine === 'perplexity-sonar') {
      const pKey = getPerplexityApiKey();
      if (!pKey) {
        return res.status(400).json({
          error: 'Perplexity Sonar engine is currently disabled. Please configure a Perplexity API key in Settings.',
        });
      }
    }

    const n = Math.max(1, Math.min(5, Number(runsPerPrompt) || 3));
    const cycleId = `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const startedAt = new Date().toISOString();
    const callCount = prompts.length * n * 2; // 2 calls per run

    const generatedRuns: any[] = [];

    // Execute runs sequentially per prompt with slight delay to respect rate limits
    for (const prompt of prompts) {
      for (let runIdx = 1; runIdx <= n; runIdx++) {
        const runId = `run-${cycleId}-${prompt.id}-r${runIdx}`;
        const runAt = new Date().toISOString();

        const result = await executeSingleRun({
          promptText: prompt.text,
          clientBrandName: client.brandName,
          clientAliases: client.aliases || [],
          clientDomain: client.domain,
          competitorBrands: client.competitorBrands || [],
          competitorDomains: client.competitorDomains || [],
          engine,
          runIndex: runIdx,
        });

        generatedRuns.push({
          id: runId,
          ownerId: client.ownerId || 'user',
          clientId: client.id,
          cycleId,
          promptId: prompt.id,
          engine,
          model: engine === 'perplexity-sonar' ? 'sonar' : 'gemini-2.5-flash',
          runIndex: runIdx,
          runAt,
          ...result,
        });
      }
    }

    const runCycle = {
      id: cycleId,
      ownerId: client.ownerId || 'user',
      clientId: client.id,
      startedAt,
      completedAt: new Date().toISOString(),
      engines: [engine],
      runsPerPrompt: n,
      status: 'completed',
      callCount,
      isRetest,
      retestedActionId,
    };

    res.json({
      runCycle,
      runs: generatedRuns,
    });
  } catch (err: any) {
    console.error('Execute cycle error:', err);
    res.status(500).json({ error: err?.message || 'Failed to execute run cycle.' });
  }
});

// POST /api/diagnostics/generate: Generate 6 dimensions diagnostic for a prompt
app.post('/api/diagnostics/generate', async (req, res) => {
  try {
    const { client, prompt, runs } = req.body;
    if (!client || !prompt || !Array.isArray(runs) || runs.length === 0) {
      return res.status(400).json({ error: 'Missing client, prompt, or runs data.' });
    }

    const ai = getGemini();

    const runsSummary = runs.map((r: any, idx: number) => `
Run #${idx + 1}:
Brand Mentioned: ${r.brandMentioned} | Brand Cited: ${r.brandCited} | Position: ${r.position ?? 'null'}
Answer Snippet: ${r.answerText.slice(0, 350)}...
Grounding Cited Domains: ${r.groundingSources.map((s: any) => s.resolvedDomain || s.displayTitle).join(', ')}
Competitors Mentioned: ${r.mentionedBrands.filter((m: any) => m.isKnownCompetitor).map((m: any) => m.name).join(', ')}
`).join('\n---\n');

    const promptEvaluation = `
You are the senior GEO/AEO diagnostic engine for RAG Signal.
Analyze the following ${runs.length} grounded search runs for the tracked prompt and client brand.

Client: "${client.brandName}" (Domain: ${client.domain})
Industry: ${client.industry || 'B2B Software'}
Prompt: "${prompt.text}" (Intent: ${prompt.intentLayer})
Competitors: ${JSON.stringify(client.competitorBrands)}

Run Observation Evidence:
${runsSummary}

Evaluate strictly across the EXACT 6 DIAGNOSIS DIMENSIONS:
1. Intent Match (Does the client's core offering match what the prompt asks for?)
2. Entity Clarity (Does the model recognize the brand and categorize it properly?)
3. Answer Extractability (Can the model easily extract concise, factual answers from client content?)
4. Content Coverage (Is the client missing specific topics, comparison tables, or feature details that competitors have?)
5. Evidence / Authority (Are third-party publications/directories citing the client vs competitors?)
6. Structured Information (Are tables, schemas, or bullet points present in cited content?)

Status for each dimension MUST be one of: "Strong", "Adequate", "Weak", "Missing", "Unknown".

Also formulate:
- observedEvidence (factual, non-speculative synthesis of the N runs)
- likelyGap (specific observable gap explaining why competitors or other domains appeared)
- confidence ("High", "Medium", "Low")
- recommendedActionSummary (clear, concrete recommendation)
- validationMethod (which prompt to retest and expected outcome)
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptEvaluation,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            dimensions: {
              type: Type.OBJECT,
              properties: {
                'Intent Match': {
                  type: Type.OBJECT,
                  properties: {
                    status: { type: Type.STRING, enum: ['Strong', 'Adequate', 'Weak', 'Missing', 'Unknown'] },
                    explanation: { type: Type.STRING },
                    evidenceQuote: { type: Type.STRING },
                  },
                  required: ['status', 'explanation'],
                },
                'Entity Clarity': {
                  type: Type.OBJECT,
                  properties: {
                    status: { type: Type.STRING, enum: ['Strong', 'Adequate', 'Weak', 'Missing', 'Unknown'] },
                    explanation: { type: Type.STRING },
                    evidenceQuote: { type: Type.STRING },
                  },
                  required: ['status', 'explanation'],
                },
                'Answer Extractability': {
                  type: Type.OBJECT,
                  properties: {
                    status: { type: Type.STRING, enum: ['Strong', 'Adequate', 'Weak', 'Missing', 'Unknown'] },
                    explanation: { type: Type.STRING },
                    evidenceQuote: { type: Type.STRING },
                  },
                  required: ['status', 'explanation'],
                },
                'Content Coverage': {
                  type: Type.OBJECT,
                  properties: {
                    status: { type: Type.STRING, enum: ['Strong', 'Adequate', 'Weak', 'Missing', 'Unknown'] },
                    explanation: { type: Type.STRING },
                    evidenceQuote: { type: Type.STRING },
                  },
                  required: ['status', 'explanation'],
                },
                'Evidence / Authority': {
                  type: Type.OBJECT,
                  properties: {
                    status: { type: Type.STRING, enum: ['Strong', 'Adequate', 'Weak', 'Missing', 'Unknown'] },
                    explanation: { type: Type.STRING },
                    evidenceQuote: { type: Type.STRING },
                  },
                  required: ['status', 'explanation'],
                },
                'Structured Information': {
                  type: Type.OBJECT,
                  properties: {
                    status: { type: Type.STRING, enum: ['Strong', 'Adequate', 'Weak', 'Missing', 'Unknown'] },
                    explanation: { type: Type.STRING },
                    evidenceQuote: { type: Type.STRING },
                  },
                  required: ['status', 'explanation'],
                },
              },
              required: [
                'Intent Match',
                'Entity Clarity',
                'Answer Extractability',
                'Content Coverage',
                'Evidence / Authority',
                'Structured Information',
              ],
            },
            observedEvidence: { type: Type.STRING },
            likelyGap: { type: Type.STRING },
            confidence: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
            recommendedActionSummary: { type: Type.STRING },
            validationMethod: { type: Type.STRING },
            suggestedAction: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                why: { type: Type.STRING },
                exactRecommendation: { type: Type.STRING },
                priority: { type: Type.STRING, enum: ['Critical', 'High', 'Medium', 'Low'] },
                impact: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
                effort: { type: Type.STRING, enum: ['High', 'Medium', 'Low'] },
              },
              required: ['title', 'why', 'exactRecommendation', 'priority', 'impact', 'effort'],
            },
          },
          required: ['dimensions', 'observedEvidence', 'likelyGap', 'confidence', 'recommendedActionSummary', 'validationMethod'],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const diagId = `diag-${Date.now()}`;

    const diagnostic = {
      id: diagId,
      ownerId: client.ownerId || 'user',
      clientId: client.id,
      promptId: prompt.id,
      cycleId: runs[0]?.cycleId || 'cycle-latest',
      dimensions: parsed.dimensions,
      observedEvidence: parsed.observedEvidence,
      likelyGap: parsed.likelyGap,
      confidence: parsed.confidence,
      recommendedActionSummary: parsed.recommendedActionSummary,
      validationMethod: parsed.validationMethod,
      createdAt: new Date().toISOString(),
    };

    let actionItem = null;
    if (parsed.suggestedAction) {
      actionItem = {
        id: `action-${Date.now()}`,
        ownerId: client.ownerId || 'user',
        clientId: client.id,
        diagnosticId: diagId,
        promptIds: [prompt.id],
        title: parsed.suggestedAction.title,
        why: parsed.suggestedAction.why,
        evidence: {
          observedFact: parsed.observedEvidence,
          quote: runs[0]?.groundingSources?.[0]?.displayTitle,
          sourceUrl: runs[0]?.groundingSources?.[0]?.uri,
        },
        exactRecommendation: parsed.suggestedAction.exactRecommendation,
        priority: parsed.suggestedAction.priority,
        impact: parsed.suggestedAction.impact,
        effort: parsed.suggestedAction.effort,
        validation: parsed.validationMethod,
        status: 'Todo',
        createdAt: new Date().toISOString(),
        baselineMentionRate: runs.filter((r: any) => r.brandMentioned).length / runs.length,
        baselineCitationRate: runs.filter((r: any) => r.brandCited).length / runs.length,
      };
    }

    res.json({
      diagnostic,
      actionItem,
    });
  } catch (err: any) {
    console.error('Diagnostic error:', err);
    res.status(500).json({ error: err?.message || 'Failed to generate diagnostic.' });
  }
});

// POST /api/pages/analyze: Analyze webpage URL / structure for GEO / AEO extractability
app.post('/api/pages/analyze', async (req, res) => {
  try {
    const { url, targetPrompt, client } = req.body;
    if (!url) return res.status(400).json({ error: 'URL is required.' });

    const ai = getGemini();

    const promptText = `
Analyze this web page URL for Answer Engine Optimization (AEO) and Generative Engine Optimization (GEO):
URL: "${url}"
Target Tracked Prompt: "${targetPrompt || 'General Industry Competitiveness'}"
Client Brand: "${client?.brandName || 'Brand'}"

Evaluate:
1. Answer Extractability (Are direct definitions, key specs, and pricing easy for an LLM to parse?)
2. Entity Clarity (Is the product class, company name, and category unmistakable?)
3. Structured Information (Presence of HTML <table> comparison blocks, JSON-LD Schema.org, or step-by-step procedures)
4. Key findings and concrete code/content recommendations.
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: promptText,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            h1: { type: Type.STRING },
            h2Count: { type: Type.INTEGER },
            contentLength: { type: Type.INTEGER },
            hasComparisonTable: { type: Type.BOOLEAN },
            hasStructuredSchema: { type: Type.BOOLEAN },
            entityClarityStatus: { type: Type.STRING, enum: ['Strong', 'Adequate', 'Weak', 'Missing', 'Unknown'] },
            extractabilityStatus: { type: Type.STRING, enum: ['Strong', 'Adequate', 'Weak', 'Missing', 'Unknown'] },
            findings: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dimension: { type: Type.STRING },
                  observation: { type: Type.STRING },
                  concreteSuggestion: { type: Type.STRING },
                },
                required: ['dimension', 'observation', 'concreteSuggestion'],
              },
            },
          },
          required: [
            'h1',
            'h2Count',
            'contentLength',
            'hasComparisonTable',
            'hasStructuredSchema',
            'entityClarityStatus',
            'extractabilityStatus',
            'findings',
          ],
        },
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    const analysis = {
      id: `page-${Date.now()}`,
      ownerId: client?.ownerId || 'user',
      clientId: client?.id || 'client-custom',
      url,
      targetPrompt,
      analyzedAt: new Date().toISOString(),
      ...parsed,
    };

    res.json({ analysis });
  } catch (err: any) {
    console.error('Page analysis error:', err);
    res.status(500).json({ error: err?.message || 'Failed to analyze page.' });
  }
});

// Vite Middleware for Full-stack Dev vs Production Serving
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`RAG Signal server running on http://localhost:${PORT}`);
  });
}

startServer();
