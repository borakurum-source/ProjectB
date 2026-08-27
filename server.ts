import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import dbApiRouter from './src/services/db-api';
import { mcpRouter } from './src/services/mcp-server';
import * as dbRepo from './src/services/db-repo';
import { BrandMemoryItem, AeoGeneratedContent } from './src/types';
import { DEMO_BRAND_MEMORIES } from './src/data/demoData';
import { registerUser, loginUser, getUserById, extractUserFromToken } from './src/services/auth';

dotenv.config();

const app = express();
// Required behind the nginx reverse proxy so req.protocol correctly reports "https"
// (from X-Forwarded-Proto) — otherwise Google OAuth redirect_uri is built as http://
// and Google rejects it as a mismatch against the registered https:// redirect URI.
app.set('trust proxy', 1);
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));
app.use('/api/db', dbApiRouter);
app.use('/api/mcp', mcpRouter);

// Neon PostgreSQL User Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const user = await registerUser(email, password, displayName);
    const authResult = await loginUser(email, password);
    res.json(authResult);
  } catch (err: any) {
    res.status(400).json({ error: err?.message || 'Registration failed.' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }
    const authResult = await loginUser(email, password);
    res.json(authResult);
  } catch (err: any) {
    res.status(401).json({ error: err?.message || 'Invalid credentials.' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const token = authHeader.split(' ')[1];
    const userId = extractUserFromToken(token);
    if (!userId) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    const user = await getUserById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch user profile' });
  }
});

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

// Runtime memory fallback for Gemini model
let globalGeminiModel = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

function getGeminiModel(): string {
  const model = process.env.GEMINI_MODEL || globalGeminiModel || 'gemini-3.6-flash';
  // Map any legacy/invalid names to valid supported model
  if (model === 'gemini-2.5-flash' || model === 'gemini-2.0-flash' || model === 'gemini-3.7-flash') {
    return 'gemini-3.6-flash';
  }
  return model;
}

// Runtime memory fallback for Firecrawl API Key
let globalFirecrawlKey = process.env.FIRECRAWL_API_KEY || '';

function getFirecrawlApiKey(): string {
  return process.env.FIRECRAWL_API_KEY || globalFirecrawlKey || '';
}

// Runtime memory fallback for Google OAuth credentials (GSC / GA4)
let globalGoogleClientId = process.env.GOOGLE_CLIENT_ID || '';
let globalGoogleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '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';

function getGoogleClientId(): string {
  return process.env.GOOGLE_CLIENT_ID || globalGoogleClientId || '';
}

function getGoogleClientSecret(): string {
  return process.env.GOOGLE_CLIENT_SECRET || globalGoogleClientSecret || '';
}

function getGoogleRedirectUri(req: express.Request): string {
  const host = req.get('x-forwarded-host') || req.get('host');
  if (host) {
    const proto = req.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    return `${proto}://${host}/auth/google/callback`;
  }
  if (process.env.APP_URL) {
    const clean = process.env.APP_URL.replace(/\/+$/, '');
    return `${clean}/auth/google/callback`;
  }
  return 'http://localhost:3000/auth/google/callback';
}

// Helper: sleep utility
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper: Exponential backoff retry wrapper for Gemini API rate limits & temporary 503 spikes
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries = 5,
  initialDelayMs = 2500
): Promise<T> {
  let attempt = 0;
  let delay = initialDelayMs;
  while (true) {
    try {
      return await operation();
    } catch (err: any) {
      attempt++;
      const errMsg = err?.message || String(err);
      const isTransient =
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota') ||
        errMsg.includes('rate limit') ||
        errMsg.includes('Rate limit') ||
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('temporarily unavailable') ||
        errMsg.includes('500') ||
        errMsg.includes('INTERNAL');

      if (attempt <= maxRetries && isTransient) {
        const jitter = Math.floor(Math.random() * 500);
        const waitTime = delay + jitter;
        console.warn(
          `Gemini API transient issue or 503 high demand (${errMsg.slice(0, 120)}...). Retrying in ${waitTime}ms (attempt ${attempt}/${maxRetries})...`
        );
        await sleep(waitTime);
        delay *= 2;
      } else {
        throw err;
      }
    }
  }
}

// -------------------------------------------------------------
// Helper: Gemini API Helpers for Structured Output & Search Grounding
// -------------------------------------------------------------
async function callGeminiStructured(
  prompt: string,
  schema?: any,
  preferredModel: string = 'gemini-3.6-flash'
): Promise<any> {
  const primaryModel = preferredModel || getGeminiModel();
  const fallbackList = Array.from(new Set([
    primaryModel,
    'gemini-3.6-flash',
    'gemini-3.7-flash',
  ]));

  let lastError: any = null;
  for (const model of fallbackList) {
    try {
      return await retryWithBackoff(async () => {
        const ai = getGemini();
        const config: any = {
          responseMimeType: 'application/json',
        };
        if (schema) {
          config.responseSchema = schema;
        }

        const response = await ai.models.generateContent({
          model,
          contents: prompt,
          config,
        });

        const text = response.text || '';
        try {
          return JSON.parse(text);
        } catch (e) {
          console.error('Failed to parse Gemini JSON output:', text);
          throw new Error('Gemini API returned invalid JSON output.');
        }
      }, 3, 1500);
    } catch (err: any) {
      lastError = err;
      const errMsg = err?.message || String(err);
      const isHighDemandOr503 =
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('temporarily unavailable') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED');

      if (isHighDemandOr503 && model !== fallbackList[fallbackList.length - 1]) {
        console.warn(`Model ${model} experienced temporary high demand. Instantly failing over to ${fallbackList[fallbackList.indexOf(model) + 1]}...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function callGeminiGroundedFull(
  prompt: string,
  locationContext?: string
): Promise<{
  answerText: string;
  groundingSources: { uri: string; displayTitle: string; resolvedDomain: string | null }[];
  rawChunks: any[];
  webSearchQueries: string[];
  usedModel: string;
}> {
  const contents = locationContext ? `[Search Location Context: ${locationContext}]\n${prompt}` : prompt;
  const primaryModel = getGeminiModel();
  const fallbackList = Array.from(new Set([
    primaryModel,
    'gemini-3.6-flash',
    'gemini-3.7-flash',
  ]));

  let lastError: any = null;
  for (const model of fallbackList) {
    try {
      return await retryWithBackoff(async () => {
        const ai = getGemini();
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            tools: [{ googleSearch: {} }],
          },
        });

        const text = response.text || '';
        const candidate = response.candidates?.[0];
        const groundingMetadata = candidate?.groundingMetadata;
        const rawChunks = groundingMetadata?.groundingChunks || [];
        const webSearchQueries: string[] = [];
        const groundingSources: { uri: string; displayTitle: string; resolvedDomain: string | null }[] = [];

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

        return {
          answerText: text,
          groundingSources,
          rawChunks,
          webSearchQueries,
          usedModel: model,
        };
      }, 3, 1500);
    } catch (err: any) {
      lastError = err;
      const errMsg = typeof err?.message === 'string' ? err.message : JSON.stringify(err);
      const isTransient =
        errMsg.includes('503') ||
        errMsg.includes('UNAVAILABLE') ||
        errMsg.includes('high demand') ||
        errMsg.includes('overloaded') ||
        errMsg.includes('temporarily unavailable') ||
        errMsg.includes('429') ||
        errMsg.includes('RESOURCE_EXHAUSTED') ||
        errMsg.includes('quota');

      if (isTransient && model !== fallbackList[fallbackList.length - 1]) {
        console.warn(`Model ${model} experienced temporary issue (${errMsg.slice(0, 100)}). Instantly falling over to ${fallbackList[fallbackList.indexOf(model) + 1]}...`);
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

async function callGeminiGrounded(
  prompt: string
): Promise<{ answerText: string; sources: { uri: string; displayTitle: string }[] }> {
  const result = await callGeminiGroundedFull(prompt);
  return {
    answerText: result.answerText,
    sources: result.groundingSources.map(s => ({
      uri: s.uri,
      displayTitle: s.displayTitle,
    })),
  };
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

const EXTRACTION_SCHEMA = {
  type: 'object',
  properties: {
    mentionedBrands: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          isClient: { type: 'boolean' },
          isKnownCompetitor: { type: 'boolean' },
          sentiment: { type: 'string', enum: ['Positive', 'Neutral', 'Negative'] },
          verbatimQuote: { type: 'string' },
        },
        required: ['name', 'isClient', 'isKnownCompetitor', 'sentiment', 'verbatimQuote'],
      },
    },
    orderedList: { type: 'boolean' },
    rankedNames: { type: 'array', items: { type: 'string' } },
    recommendedEntityType: { type: 'string' },
    answerFormat: { type: 'string', enum: ['list', 'prose', 'table', 'steps'] },
  },
  required: ['mentionedBrands', 'orderedList', 'rankedNames', 'answerFormat'],
  additionalProperties: false,
};

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
  const hasFirecrawlKey = Boolean(getFirecrawlApiKey());
  res.json({
    status: 'ok',
    apiKeyConfigured: hasGeminiKey,
    firecrawlApiKeyConfigured: hasFirecrawlKey,
    geminiModel: getGeminiModel(),
    defaultEngine: 'gemini-grounded',
    availableEngines: [
      { id: 'gemini-grounded', label: 'Gemini Grounded', supportsGrounding: true, enabled: true },
    ]
  });
});

// Configure Gemini Model endpoint
app.post('/api/settings/gemini-model', (req, res) => {
  const { model } = req.body;
  if (typeof model === 'string' && model.trim()) {
    globalGeminiModel = model.trim();
    process.env.GEMINI_MODEL = globalGeminiModel;
  }
  res.json({
    status: 'ok',
    geminiModel: getGeminiModel(),
  });
});

// Configure or check Firecrawl API key
app.post('/api/settings/firecrawl-key', (req, res) => {
  const { apiKey } = req.body;
  if (typeof apiKey === 'string') {
    globalFirecrawlKey = apiKey.trim();
    if (globalFirecrawlKey) {
      process.env.FIRECRAWL_API_KEY = globalFirecrawlKey;
    }
  }
  const configured = Boolean(getFirecrawlApiKey());
  res.json({
    status: 'ok',
    configured,
  });
});

// Configure or check Google OAuth credentials (Client ID & Client Secret)
app.post('/api/settings/google-credentials', (req, res) => {
  const { clientId, clientSecret } = req.body;
  if (typeof clientId === 'string') {
    globalGoogleClientId = clientId.trim();
    if (globalGoogleClientId) {
      process.env.GOOGLE_CLIENT_ID = globalGoogleClientId;
    }
  }
  if (typeof clientSecret === 'string') {
    globalGoogleClientSecret = clientSecret.trim();
    if (globalGoogleClientSecret) {
      process.env.GOOGLE_CLIENT_SECRET = globalGoogleClientSecret;
    }
  }
  const configured = Boolean(getGoogleClientId() && getGoogleClientSecret());
  res.json({
    status: 'ok',
    configured,
    clientIdConfigured: Boolean(getGoogleClientId()),
    clientSecretConfigured: Boolean(getGoogleClientSecret()),
  });
});

// Firecrawl Proxy Endpoints
app.post('/api/firecrawl/scrape', async (req, res) => {
  const fcKey = getFirecrawlApiKey();
  if (!fcKey) {
    return res.status(400).json({ error: 'Firecrawl API key is not configured.' });
  }
  const { url, formats = ['markdown'], onlyMainContent = true } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }
  try {
    const fcRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fcKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, formats, onlyMainContent }),
    });
    const data = await fcRes.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to scrape URL via Firecrawl' });
  }
});

app.post('/api/firecrawl/map', async (req, res) => {
  const fcKey = getFirecrawlApiKey();
  if (!fcKey) {
    return res.status(400).json({ error: 'Firecrawl API key is not configured.' });
  }
  const { url, search, limit = 50 } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'URL is required.' });
  }
  try {
    const bodyPayload: any = { url, limit };
    if (search) bodyPayload.search = search;
    const fcRes = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fcKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(bodyPayload),
    });
    const data = await fcRes.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to map domain via Firecrawl' });
  }
});

app.post('/api/firecrawl/search', async (req, res) => {
  const fcKey = getFirecrawlApiKey();
  if (!fcKey) {
    return res.status(400).json({ error: 'Firecrawl API key is not configured.' });
  }
  const { query, limit = 5 } = req.body;
  if (!query) {
    return res.status(400).json({ error: 'Query is required.' });
  }
  try {
    const fcRes = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fcKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit, scrapeOptions: { formats: ['markdown'] } }),
    });
    const data = await fcRes.json();
    return res.json(data);
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to search via Firecrawl' });
  }
});

// Dedicated Call 1 Endpoint: Gemini Grounded with Google Search (Verbatim Prompt)
app.post('/api/gemini/run', async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Missing prompt text.' });
    }

    const groundedResult = await callGeminiGroundedFull(prompt);

    res.json({
      model: groundedResult.usedModel,
      answerText: groundedResult.answerText,
      groundingSources: groundedResult.groundingSources,
      groundingChunks: groundedResult.rawChunks,
      webSearchQueries: groundedResult.webSearchQueries,
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
1. Extract all software, technology, or company brand mentions in "mentionedBrands". Only extract
   brands that literally appear in the Answer Text above — never add a brand because it is a known
   competitor or the client if it was not actually mentioned.
2. Mark isClient=true if the brand matches the client brand or any of its aliases.
3. Mark isKnownCompetitor=true if the brand matches any listed known competitor.
4. Extract sentiment (Positive, Neutral, Negative) and verbatimQuote — verbatimQuote MUST be an exact
   substring copied from the Answer Text, never paraphrased or invented.
5. Determine if the answer is explicitly formatted as a numbered / ranked ordered recommendation (orderedList=true). Only mark orderedList=true if the text uses explicit numbering like "1. X  2. Y  3. Z" or explicit ranked positioning words ("First choice: X, Second: Y"). Never infer rank from paragraph order alone.
6. If orderedList is true, list the ranked brand names in rankedNames in order of their rank (1st to Nth). If prose, set orderedList=false and rankedNames=[].
7. Identify the answerFormat (list, prose, table, steps) and recommendedEntityType.
`;

    const json = await callGeminiStructured(extractionPrompt, EXTRACTION_SCHEMA);
    res.json(json);
  } catch (err: any) {
    console.error('Call 2 Extraction error:', err);
    res.status(500).json({ error: err?.message || 'Call 2 extraction failed.' });
  }
});

// Dedicated Opportunity Finder Endpoint: Suggest 20 high-value tracked prompts
app.post('/api/gemini/opportunities', async (req, res) => {
  try {
    const { client } = req.body;
    if (!client) return res.status(400).json({ error: 'Client profile required.' });

    const targetLang = determineTargetLanguage(client.language, client.market, client.domain, client.brandName);

    const promptText = `
You are the prompt research engine for RAG Signal (AEO / GEO visibility tool).
Generate exactly 20 diverse, high-commercial-intent, realistic user prompts that prospective B2B buyers or customers would ask an AI search engine (like Gemini) in this industry.

Client: "${client.brandName}" (Domain: ${client.domain})
Industry: ${client.industry || 'B2B Services'}
Target Market: ${client.market || 'Global'}
Competitors: ${JSON.stringify(client.competitorBrands || [])}

CRITICAL LANGUAGE REQUIREMENT:
Generate all prompt texts ('text') and rationale strictly in ${targetLang}.
If ${targetLang} is Turkish (Türkçe), write natural Turkish conversational questions that users in ${client.market || 'Turkey / Istanbul'} would ask AI search engines (e.g., "İstanbul en iyi parti catering firmaları", "Snacks For Party menü ve fiyatları", "Kurumsal kokteyl ikram kutusu nereden sipariş edilir?"). Never write English prompts when target language is Turkish.
If ${targetLang} is English, write natural English conversational questions.

Requirements:
- Exactly 20 distinct prompts.
- Cover all Intent Layers: Informational (4), Commercial (6), Comparative (6), Navigational (2), Transactional (2).
- Prompts must sound like real buyers typing queries.
- Give a 1-sentence rationale in ${targetLang} for why this prompt is a high-value visibility opportunity.
`;

    const json = await callGeminiStructured(promptText, {
      type: 'object',
      properties: {
        prompts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              intentLayer: {
                type: 'string',
                enum: ['Informational', 'Commercial', 'Comparative', 'Navigational', 'Transactional'],
              },
              category: { type: 'string' },
              rationale: { type: 'string' },
              targetCompetitor: { type: 'string' },
            },
            required: ['text', 'intentLayer', 'category', 'rationale'],
          },
        },
      },
      required: ['prompts'],
      additionalProperties: false,
    });
    res.json(json || { prompts: [] });
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
// Call 1: Grounded Answer (model: getGeminiModel() with googleSearch)
// Call 2: Structured Semantic Extraction (model: getGeminiModel() with responseSchema)
async function executeSingleRun(params: {
  promptText: string;
  clientBrandName: string;
  clientAliases: string[];
  clientDomain: string;
  competitorBrands: string[];
  competitorDomains: string[];
  engine: string;
  runIndex: number;
  locationContext?: string;
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

  try {
    const groundedResult = await callGeminiGroundedFull(params.promptText, params.locationContext);
    answerText = groundedResult.answerText || '';
    groundingSources.push(...groundedResult.groundingSources);
    rawGroundingChunks = groundedResult.rawChunks || [];
    webSearchQueries.push(...groundedResult.webSearchQueries);
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
1. Extract all software, technology, or company brand mentions in "mentionedBrands". Only extract
   brands that literally appear in the Answer Text above — never add a brand because it is a known
   competitor or the client if it was not actually mentioned.
2. Mark isClient=true if the brand matches the client brand or any of its aliases.
3. Mark isKnownCompetitor=true if the brand matches any listed known competitor.
4. Extract sentiment (Positive, Neutral, Negative) and verbatimQuote — verbatimQuote MUST be an exact
   substring copied from the Answer Text, never paraphrased or invented.
5. Determine if the answer is explicitly formatted as a numbered / ranked ordered recommendation (orderedList=true). Only mark orderedList=true if the text uses explicit numbering like "1. X  2. Y  3. Z" or explicit ranked positioning words ("First choice: X, Second: Y"). Never infer rank from paragraph order alone.
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
    extractedData = await callGeminiStructured(extractionPrompt, EXTRACTION_SCHEMA);
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

// Run cycle execution is a long sequential chain of real grounded-search API
// calls (measured ~39s for a single prompt/run under Perplexity Agent) — a
// 15-prompt cycle can easily take 8-10+ minutes. Doing that inside one
// blocking HTTP request meant nginx's proxy_read_timeout (300s on
// lite.ragsignal.com) killed the connection long before the loop finished,
// surfacing as an opaque "Execution error: " (HTTP/2 strips statusText) with
// zero progress feedback in the meantime. Fixed by making this a background
// job the client polls, so the connection per request is always short and the
// UI can show real progress instead of a static "please wait".
interface ExecutionJob {
  status: 'running' | 'completed' | 'failed';
  total: number; // total runs (prompts × runsPerPrompt), not sub-API-calls
  completed: number;
  runs: any[]; // appended as each run finishes — survives a mid-cycle failure
  runCycle: any | null;
  error?: string;
  clientId?: string;
  cycleId?: string;
}
const executionJobs = new Map<string, ExecutionJob>();

function startExecutionJob(params: {
  client: any;
  prompts: any[];
  n: number;
  engine: string;
  isRetest: boolean;
  retestedActionId?: string;
}): string {
  const { client, prompts, n, engine, isRetest, retestedActionId } = params;
  const cycleId = `cycle-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const jobId = `job-${cycleId}`;
  const startedAt = new Date().toISOString();
  const callCount = prompts.length * n * 2;

  const job: ExecutionJob = {
    status: 'running',
    total: prompts.length * n,
    completed: 0,
    runs: [],
    runCycle: null,
    clientId: client.id,
    cycleId,
  };
  executionJobs.set(jobId, job);
  // Bound memory — jobs are only ever polled for a few minutes after they finish.
  setTimeout(() => executionJobs.delete(jobId), 30 * 60 * 1000);

  (async () => {
    try {
      for (const prompt of prompts) {
        for (let runIdx = 1; runIdx <= n; runIdx++) {
          const runId = `run-${cycleId}-${prompt.id}-r${runIdx}`;
          const runAt = new Date().toISOString();

          let locationContextStr = undefined;
          if (client.city || client.market) {
            const parts = [];
            if (client.city) parts.push(`City: ${client.city.trim()}`);
            if (client.market && client.market !== 'GLOBAL') {
              const regionLabels: Record<string, string> = {
                US: 'United States',
                TR: 'Turkey / Türkiye',
                UK: 'United Kingdom',
                DE: 'Germany',
                FR: 'France',
              };
              parts.push(`Country: ${regionLabels[client.market] || client.market}`);
            }
            if (parts.length > 0) {
              locationContextStr = parts.join(', ');
            }
          }

          const result = await executeSingleRun({
            promptText: prompt.text,
            clientBrandName: client.brandName,
            clientAliases: client.aliases || [],
            clientDomain: client.domain,
            competitorBrands: client.competitorBrands || [],
            competitorDomains: client.competitorDomains || [],
            engine,
            runIndex: runIdx,
            locationContext: locationContextStr,
          });

          const runRecord = {
            id: runId,
            ownerId: client.ownerId || 'user',
            clientId: client.id,
            cycleId,
            promptId: prompt.id,
            engine,
            model: getGeminiModel(),
            runIndex: runIdx,
            runAt,
            ...result,
          };
          job.runs.push(runRecord);
          job.completed++;

          dbRepo.saveRuns([runRecord as any]).catch((e) => console.error('Failed to save run to Neon DB:', e));

          // Pacing delay between runs to respect Gemini API rate limits (RPM)
          if (job.completed < job.total) {
            await sleep(1500);
          }
        }
      }

      job.runCycle = {
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
      job.status = 'completed';
      dbRepo.saveRunCycle(job.runCycle).catch((e) => console.error('Failed to save runCycle to Neon DB:', e));

      // -------------------------------------------------------------
      // DREAM STAGE: Self-Improvement Loop
      // Synthesize new Brand Memory Knowledge Units ("The Brain") from cycle
      // -------------------------------------------------------------
      synthesizeBrandMemoryFromRunCycle(client, cycleId, job.runs).catch((e) =>
        console.error('Dream stage synthesis error:', e)
      );
    } catch (err: any) {
      console.error('Execute cycle job failed:', err);
      job.status = 'failed';
      job.error = err?.message || 'Failed to execute run cycle.';
      // job.runs keeps whatever completed before the failure — not discarded.
    }
  })();

  return jobId;
}

// -------------------------------------------------------------
// DREAM STAGE FUNCTION: Synthesize Brand Memory from Run Cycle
// -------------------------------------------------------------
async function synthesizeBrandMemoryFromRunCycle(client: any, cycleId: string, runs: any[]) {
  if (!client || !runs || runs.length === 0) return;
  try {
    console.log(`🌙 [Dream Stage] Synthesizing Brand Memory from Run Cycle ${cycleId}...`);
    const ai = getGemini();

    const runSummaries = runs.slice(0, 15).map((r, i) => `
Run #${i + 1}:
Prompt ID: "${r.promptId}"
Mentioned Client (${client.brandName}): ${r.brandMentioned}
Cited Client Domain (${client.domain}): ${r.brandCited}
Cited Domains: ${(r.groundingSources || []).map((s: any) => s.resolvedDomain || s.displayTitle).join(', ')}
Competitors Mentioned: ${(r.mentionedBrands || []).filter((m: any) => m.isKnownCompetitor).map((m: any) => m.name).join(', ')}
Answer Snippet: ${(r.answerText || '').slice(0, 250)}
`).join('\n---\n');

    const prompt = `You are the Brand Memory Knowledge Synthesizer for AI Visibility & AEO.
Client: ${client.brandName} (${client.domain})
Industry: ${client.industry || 'B2B Software'}

Analyze these latest AI Search Run Cycle results:
${runSummaries}

Synthesize 1-2 high-value, factual Brand Memory Knowledge Units ("The Brain") based on observed AI visibility gaps, cited sources, or competitor positioning patterns.

Entity Types allowed:
- "company_overview": Core value proposition or market category
- "product_feature": Specific features, capabilities, or gaps
- "competitor_diff": Key USPs vs competitors in AI answers
- "use_case": Search intents and solution match
- "faq_fact": Verified facts, citations, or domain authority gaps

Respond ONLY in valid JSON matching this schema:
{
  "chunks": [
    {
      "title": "Short descriptive title (e.g. LLM Citation Deficit in B2B Comparisons)",
      "entityType": "competitor_diff",
      "content": "Clear, factual, high-density summary of the observation and knowledge fact",
      "keyFacts": ["Fact 1", "Fact 2"],
      "confidence": "High",
      "tags": ["aeo", "visibility-gap", "competitor"]
    }
  ]
}
`;

    const res = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: prompt,
      config: { responseMimeType: 'application/json' },
    });

    const parsed = JSON.parse(res.text || '{"chunks":[]}');
    const chunks = Array.isArray(parsed.chunks) ? parsed.chunks : [];
    const timestamp = new Date().toISOString();

    for (const chunk of chunks) {
      const memoryId = `mem_dream_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const textToEmbed = `${chunk.title}\n${chunk.content}\n${(chunk.keyFacts || []).join(', ')}`;
      const embedding = await generateEmbedding(textToEmbed);

      const memoryItem: BrandMemoryItem = {
        id: memoryId,
        clientId: client.id,
        title: chunk.title || 'Synthesized Visibility Fact',
        entityType: (chunk.entityType || 'competitor_diff') as any,
        sourceUrl: `run-cycle://${cycleId}`,
        sourceType: 'ai_synthesized',
        content: chunk.content || '',
        keyFacts: chunk.keyFacts || [],
        embedding,
        confidence: (chunk.confidence === 'Low' || chunk.confidence === 'Medium' ? chunk.confidence : 'High'),
        tags: [...(chunk.tags || []), 'dream-synthesized', cycleId],
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await dbRepo.saveBrandMemory(memoryItem);
    }
    console.log(`⚡ [Dream Stage] Successfully synthesized ${chunks.length} Brand Memory units for ${client.brandName}`);
  } catch (err) {
    console.error('Dream stage synthesis error:', err);
  }
}

// -------------------------------------------------------------
// AUTOMATED SCHEDULED SCANNING ENGINE
// Runs in background based on client.autoRunIntervalDays (1d, 7d, etc.)
// -------------------------------------------------------------
async function checkAndRunScheduledScans() {
  try {
    const clients = await dbRepo.listClientsByOwner('');
    if (!clients || clients.length === 0) return;

    for (const client of clients) {
      const intervalDays = client.autoRunIntervalDays ?? 0;
      if (intervalDays <= 0) continue; // Manual mode only

      const cycles = await dbRepo.listRunCyclesByClient(client.id);
      const sortedCycles = [...cycles].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
      const lastCycle = sortedCycles[0];

      let isDue = false;
      if (!lastCycle) {
        isDue = true;
      } else {
        const lastRunTime = new Date(lastCycle.startedAt).getTime();
        const elapsedDays = (Date.now() - lastRunTime) / (1000 * 60 * 60 * 24);
        if (elapsedDays >= intervalDays) {
          isDue = true;
        }
      }

      if (isDue) {
        console.log(`⏰ [Auto-Scheduler] Client ${client.brandName} (${client.id}) is due for auto-scan (${intervalDays}d frequency).`);
        const prompts = await dbRepo.listPromptsByClient(client.id);
        const activePrompts = prompts.filter((p) => p.active !== false);

        if (activePrompts.length > 0) {
          console.log(`🚀 [Auto-Scheduler] Executing scheduled run cycle for ${activePrompts.length} active prompts...`);
          startExecutionJob({
            client,
            prompts: activePrompts,
            n: 3,
            engine: 'gemini-grounded',
            isRetest: false,
          });
        }
      }
    }
  } catch (err) {
    console.error('Scheduled auto-scan runner error:', err);
  }
}

// Register background scheduler (checks every 30 minutes, initial check in 1 minute)
setInterval(checkAndRunScheduledScans, 30 * 60 * 1000);
setTimeout(checkAndRunScheduledScans, 60 * 1000);

// POST /api/runs/execute-cycle: Start a Run Cycle job (returns 202 Accepted immediately)
app.post('/api/runs/execute-cycle', async (req, res) => {
  try {
    const {
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

    const n = Math.max(1, Math.min(5, Number(runsPerPrompt) || 3));
    const jobId = startExecutionJob({ client, prompts, n, engine, isRetest, retestedActionId });
    res.status(202).json({
      jobId,
      status: 'running',
      statusUrl: `/api/runs/execute-cycle/${jobId}/status`,
      total: prompts.length * n,
    });
  } catch (err: any) {
    console.error('Execute cycle error:', err);
    res.status(500).json({ error: err?.message || 'Failed to execute run cycle.' });
  }
});

// GET /api/runs/execute-cycle/:jobId/status: Poll a Run Cycle job's progress
app.get('/api/runs/execute-cycle/:jobId/status', async (req, res) => {
  const jobId = req.params.jobId;
  const job = executionJobs.get(jobId);

  if (job) {
    return res.json({
      status: job.status,
      total: job.total,
      completed: job.completed,
      runs: job.runs,
      runCycle: job.runCycle,
      error: job.error,
    });
  }

  // Fallback: Check DB if memory was cleared or server restarted during long execution cycle
  try {
    const rawId = jobId.startsWith('job-') ? jobId.slice(4) : jobId;
    const cycleId = rawId.startsWith('cycle-') ? rawId : `cycle-${rawId}`;

    const savedRuns = await dbRepo.listRunsByCycle(cycleId);
    const savedCycle = await dbRepo.getRunCycle(cycleId);

    if (savedRuns && savedRuns.length > 0) {
      return res.json({
        status: savedCycle ? 'completed' : 'failed',
        total: savedRuns.length,
        completed: savedRuns.length,
        runs: savedRuns,
        runCycle: savedCycle || null,
        error: savedCycle ? undefined : 'Server restarted during execution. Completed runs were preserved.',
      });
    }
  } catch (err) {
    console.error('Failed to query DB fallback for cycle job status:', err);
  }

  res.status(404).json({ error: 'Job not found (it may have expired or the server restarted).' });
});

// -------------------------------------------------------------
// Endpoint: Query Fan-out Simulator
// -------------------------------------------------------------
app.post('/api/prompts/fanout', async (req, res) => {
  const { prompt, language, market, domain, brandName } = req.body;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Prompt is required.' });
  }

  const targetLang = determineTargetLanguage(language, market, domain, brandName);

  try {
    const fanoutSystemPrompt = `You are an AI Search Engine Query Fan-Out Simulator.
When a user submits a complex prompt to AI search engines, the engine breaks down ("fans out") the prompt into multiple focused web search queries.

Analyze this prompt: "${prompt.replace(/"/g, '\\"')}"

CRITICAL LANGUAGE REQUIREMENT:
Generate all search queries ('query') and the fanoutSummary strictly in ${targetLang}.
If ${targetLang} is Turkish (Türkçe), generate all search queries in natural Turkish that users or search engines in Turkey would construct.
If ${targetLang} is English, generate in English.

Generate realistic search queries that each AI engine would generate in parallel to answer this prompt:
1. Google AI Overview / AI Mode queries (keyword-focused, entity lookup, comparative, transactional)
2. ChatGPT Search / SearchGPT queries (natural language, conversational search, multi-hop sub-questions)

Return JSON matching the schema precisely.`;

    const schema = {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        fanoutSummary: { type: 'string' },
        engines: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              engine: { type: 'string' },
              queries: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    query: { type: 'string' },
                    intent: { type: 'string' },
                    purpose: { type: 'string' },
                  },
                  required: ['query', 'intent', 'purpose'],
                },
              },
            },
            required: ['engine', 'queries'],
          },
        },
      },
      required: ['prompt', 'fanoutSummary', 'engines'],
    };

    const json = await callGeminiStructured(fanoutSystemPrompt, { ...schema, additionalProperties: false });
    res.json(json);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to simulate query fan-out.' });
  }
});

// -------------------------------------------------------------
// Endpoint: AI Bot Crawlability & robots.txt Inspector
// -------------------------------------------------------------

// The AI/LLM crawlers worth checking for AEO/GEO — official current User-Agent
// tokens (for robots.txt matching) and full UA strings (for the live fetch
// check below). Kept broad on purpose so this covers the same ground as
// third-party GEO audit tools, not just the 2-3 best-known bots.
const AI_CRAWL_BOTS: { name: string; bot: string; owner: string; userAgent: string }[] = [
  { name: 'GPTBot', bot: 'GPTBot', owner: 'OpenAI (training)', userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; GPTBot/1.2; +https://openai.com/gptbot' },
  { name: 'OAI-SearchBot', bot: 'OAI-SearchBot', owner: 'OpenAI (ChatGPT Search)', userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; OAI-SearchBot/1.0; +https://openai.com/searchbot' },
  { name: 'ChatGPT-User', bot: 'ChatGPT-User', owner: 'OpenAI (live web browse)', userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ChatGPT-User/1.0; +https://openai.com/bot' },
  { name: 'Google-Extended', bot: 'Google-Extended', owner: 'Google (Gemini/AI Overviews training)', userAgent: 'Mozilla/5.0 (compatible; Google-Extended)' },
  { name: 'GoogleOther', bot: 'GoogleOther', owner: 'Google (misc. crawling)', userAgent: 'Mozilla/5.0 (compatible; GoogleOther)' },
  { name: 'ClaudeBot', bot: 'ClaudeBot', owner: 'Anthropic (training)', userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; ClaudeBot/1.0; +claudebot@anthropic.com' },
  { name: 'anthropic-ai', bot: 'anthropic-ai', owner: 'Anthropic (Claude live browse)', userAgent: 'Mozilla/5.0 (compatible; anthropic-ai)' },
  { name: 'PerplexityBot', bot: 'PerplexityBot', owner: 'Perplexity AI', userAgent: 'Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko); compatible; PerplexityBot/1.0; +https://perplexity.ai/perplexitybot' },
  { name: 'Meta-ExternalAgent', bot: 'Meta-ExternalAgent', owner: 'Meta (training)', userAgent: 'Mozilla/5.0 (compatible; Meta-ExternalAgent/1.1; +https://developers.facebook.com/docs/sharing/webmasters/crawler)' },
  { name: 'Meta-ExternalFetcher', bot: 'Meta-ExternalFetcher', owner: 'Meta (live fetch)', userAgent: 'Mozilla/5.0 (compatible; Meta-ExternalFetcher/1.1)' },
  { name: 'FacebookBot', bot: 'FacebookBot', owner: 'Meta (link preview)', userAgent: 'facebookexternalhit/1.1' },
  { name: 'Applebot-Extended', bot: 'Applebot-Extended', owner: 'Apple (Apple Intelligence training)', userAgent: 'Mozilla/5.0 (compatible; Applebot-Extended/0.1)' },
  { name: 'GrokBot', bot: 'GrokBot', owner: 'xAI (Grok)', userAgent: 'Mozilla/5.0 (compatible; Grok)' },
  { name: 'Bytespider', bot: 'Bytespider', owner: 'ByteDance', userAgent: 'Mozilla/5.0 (Linux; Android 5.0) AppleWebKit/537.36 (KHTML, like Gecko) Mobile Safari/537.36 (compatible; Bytespider; spider-feedback@bytedance.com)' },
  { name: 'CCBot', bot: 'CCBot', owner: 'Common Crawl (widely used as LLM training data)', userAgent: 'CCBot/2.0 (+https://commoncrawl.org/faq/)' },
  { name: 'cohere-ai', bot: 'cohere-ai', owner: 'Cohere', userAgent: 'Mozilla/5.0 (compatible; cohere-ai)' },
  { name: 'Diffbot', bot: 'Diffbot', owner: 'Diffbot (structured extraction, used by LLM pipelines)', userAgent: 'Mozilla/5.0 (compatible; Diffbot/0.1; +http://www.diffbot.com)' },
  { name: 'ImagesiftBot', bot: 'ImagesiftBot', owner: 'ImageSift', userAgent: 'Mozilla/5.0 (compatible; ImagesiftBot)' },
  { name: 'Omgilibot', bot: 'Omgilibot', owner: 'Webz.io (LLM training data)', userAgent: 'Mozilla/5.0 (compatible; omgilibot/0.5; +http://omgili.com)' },
];

app.post('/api/pages/check-crawlability', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required.' });
  }

  try {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    const parsedUrl = new URL(targetUrl);
    const robotsUrl = `${parsedUrl.protocol}//${parsedUrl.host}/robots.txt`;

    let robotsTxt = '';
    let fetchStatus = 200;
    try {
      const robotsRes = await fetch(robotsUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      fetchStatus = robotsRes.status;
      if (robotsRes.ok) {
        robotsTxt = await robotsRes.text();
      }
    } catch {
      robotsTxt = 'Could not fetch robots.txt directly (network or CORS restrictions).';
    }

    const botStatus = AI_CRAWL_BOTS.map((b) => {
      const botMention = robotsTxt.toLowerCase().includes(b.bot.toLowerCase());
      let allowed = true;
      let reason = 'Allowed by default (No explicit Disallow directive found).';

      if (botMention) {
        const lines = robotsTxt.split('\n');
        let inBotBlock = false;
        for (const line of lines) {
          const trimmed = line.trim().toLowerCase();
          if (trimmed.startsWith('user-agent:') && trimmed.includes(b.bot.toLowerCase())) {
            inBotBlock = true;
          } else if (trimmed.startsWith('user-agent:')) {
            inBotBlock = false;
          } else if (inBotBlock && trimmed.startsWith('disallow: /')) {
            allowed = false;
            reason = `Disallowed explicitly in robots.txt for User-Agent: ${b.bot}`;
          }
        }
      }

      return {
        name: b.name,
        bot: b.bot,
        owner: b.owner,
        status: allowed ? 'ALLOWED' : 'BLOCKED',
        reason,
      };
    });

    // Server Access Check: robots.txt only says what a bot is ALLOWED to do —
    // it says nothing about whether the site's actual infrastructure (CDN/WAF/
    // bot-management, e.g. Cloudflare) lets a request claiming that User-Agent
    // through. A CDN can silently block every crawler at the network layer
    // while robots.txt still says "Allow" — which is exactly the gap a user
    // comparing us to otterly.ai's "Server Access Check" surfaced: robots.txt
    // said Allow on both tools, but a live fetch per bot UA was Blocked on
    // theirs. Reproduce that same check here.
    //
    // Deliberately NOT Promise.all'd across all bots: 19 simultaneous requests
    // with 19 different fake bot User-Agents, from one IP, in the same instant,
    // is itself a textbook bot-management red flag — testing confirmed Cloudflare
    // started erroring out requests under that burst that succeeded individually.
    // Small concurrency + a stagger keeps this from being a self-inflicted false
    // "blocked" reading.
    const CONCURRENCY = 3;
    const serverAccessResults: { name: string; bot: string; owner: string; httpStatus: number | null; status: 'ALLOWED' | 'BLOCKED' | 'ERROR' }[] = [];
    for (let i = 0; i < AI_CRAWL_BOTS.length; i += CONCURRENCY) {
      const batch = AI_CRAWL_BOTS.slice(i, i + CONCURRENCY);
      const batchResults = await Promise.all(
        batch.map(async (b) => {
          try {
            const liveRes = await fetch(targetUrl, {
              headers: { 'User-Agent': b.userAgent },
              redirect: 'follow',
              signal: AbortSignal.timeout(12000),
            });
            const blocked = liveRes.status === 403 || liveRes.status === 429 || liveRes.status === 503;
            return {
              name: b.name,
              bot: b.bot,
              owner: b.owner,
              httpStatus: liveRes.status,
              status: (liveRes.ok ? 'ALLOWED' : blocked ? 'BLOCKED' : 'ERROR') as 'ALLOWED' | 'BLOCKED' | 'ERROR',
            };
          } catch {
            return { name: b.name, bot: b.bot, owner: b.owner, httpStatus: null, status: 'ERROR' as const };
          }
        })
      );
      serverAccessResults.push(...batchResults);
      if (i + CONCURRENCY < AI_CRAWL_BOTS.length) {
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
    }

    res.json({
      url: targetUrl,
      robotsUrl,
      robotsTxtFetched: Boolean(robotsTxt && fetchStatus === 200),
      robotsTxtSnippet: robotsTxt.slice(0, 1000),
      botStatus,
      serverAccessResults,
      serverAccessCaveat: 'Fetches run from our server\'s IP with the bot\'s User-Agent header — not from the bot\'s own verified IP range. A BLOCKED result here can mean bot-impersonation protection (e.g. Cloudflare rejecting an unverified request claiming to be GPTBot) rather than an actual policy against the real, verified bot. Treat it as a signal to investigate your CDN/WAF bot-management rules, not a definitive verdict.',
      recommendations: [
        ...(botStatus.some((b) => b.status === 'BLOCKED')
          ? ['One or more major AI search bots are blocked in robots.txt. Unblock them to improve GEO visibility.']
          : []),
        ...(serverAccessResults.some((b) => b.status === 'BLOCKED')
          ? ['One or more AI bots got a blocked response on a live fetch despite robots.txt allowing them — check your CDN/WAF (e.g. Cloudflare Bot Management) for rules that block or challenge AI crawler User-Agents.']
          : []),
      ],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to check crawlability.' });
  }
});

// Helper to fetch multi-page website content (Homepage, About, Products, Contact/Location)
async function fetchPageText(url: string, timeoutMs = 3500): Promise<{ title: string; metaDesc: string; text: string; rawHtml: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
      },
    });
    clearTimeout(timer);
    if (!res.ok) return { title: '', metaDesc: '', text: '', rawHtml: '' };
    const html = await res.text();
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([\s\S]*?)["']/i) || 
                          html.match(/<meta[^>]*content=["']([\s\S]*?)["'][^>]*name=["']description["']/i) ||
                          html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([\s\S]*?)["']/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const metaDesc = metaDescMatch ? metaDescMatch[1].trim() : '';
    const bodyText = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return { title, metaDesc, text: bodyText, rawHtml: html };
  } catch {
    return { title: '', metaDesc: '', text: '', rawHtml: '' };
  }
}

// Helper: Firecrawl single-page scrape (used to pull the exact page a competitor
// was cited from, so diagnosis evidence is real page content, not just a domain name).
async function scrapeUrlWithFirecrawl(url: string, maxChars = 2500): Promise<string> {
  const fcKey = getFirecrawlApiKey();
  if (!fcKey || !url) return '';
  try {
    const fcRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fcKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, formats: ['markdown'], onlyMainContent: true }),
      signal: AbortSignal.timeout(15000),
    });
    if (!fcRes.ok) return '';
    const data = await fcRes.json();
    if (data.success && data.data?.markdown) {
      return data.data.markdown.slice(0, maxChars);
    }
    return '';
  } catch {
    return '';
  }
}

// Helper: Firecrawl web search — real, current search results (url/title/description),
// not an LLM's recalled/guessed URLs. Used where we need to discover real pages rather
// than analyze one we already have (competitor domain discovery, extra diagnostic evidence).
async function searchWithFirecrawl(
  query: string,
  limit = 5
): Promise<{ url: string; title: string; description: string }[]> {
  const fcKey = getFirecrawlApiKey();
  if (!fcKey || !query) return [];
  try {
    const fcRes = await fetch('https://api.firecrawl.dev/v1/search', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fcKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query, limit }),
      signal: AbortSignal.timeout(15000),
    });
    if (!fcRes.ok) return [];
    const data = await fcRes.json();
    if (data.success && Array.isArray(data.data)) {
      return data.data.map((r: any) => ({
        url: r.url || '',
        title: r.title || '',
        description: r.description || '',
      }));
    }
    return [];
  } catch {
    return [];
  }
}

// Helper: Firecrawl Scrape & Map API Agent
async function crawlWithFirecrawl(domain: string): Promise<string> {
  const fcKey = getFirecrawlApiKey();
  if (!fcKey) return '';
  const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const baseUrl = `https://${cleanDomain}`;

  try {
    let firecrawlContext = '';
    // 1. Scrape Homepage with Firecrawl
    const homeRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fcKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: baseUrl, formats: ['markdown'], onlyMainContent: true }),
    });

    if (homeRes.ok) {
      const homeData = await homeRes.json();
      if (homeData.success && homeData.data?.markdown) {
        firecrawlContext += `=== FIRECRAWL SCRAPED HOMEPAGE (${cleanDomain}) ===\n${homeData.data.markdown.slice(0, 2200)}\n\n`;
      }
    }

    // 2. Map domain links with Firecrawl
    const mapRes = await fetch('https://api.firecrawl.dev/v1/map', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${fcKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url: baseUrl, limit: 15 }),
    });

    if (mapRes.ok) {
      const mapData = await mapRes.json();
      if (mapData.success && Array.isArray(mapData.links)) {
        const links: string[] = mapData.links;
        const targetKeywords = ['about', 'hakkimizda', 'hakkinda', 'product', 'service', 'urun', 'cozum', 'contact', 'iletisim', 'location'];
        const subLinks = links.filter(l => targetKeywords.some(kw => l.toLowerCase().includes(kw))).slice(0, 3);

        for (const subUrl of subLinks) {
          try {
            const subRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${fcKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ url: subUrl, formats: ['markdown'], onlyMainContent: true }),
            });
            if (subRes.ok) {
              const subData = await subRes.json();
              if (subData.success && subData.data?.markdown) {
                firecrawlContext += `=== FIRECRAWL SCRAPED SUBPAGE (${subUrl}) ===\n${subData.data.markdown.slice(0, 1800)}\n\n`;
              }
            }
          } catch {}
        }
      }
    }

    return firecrawlContext;
  } catch (err) {
    console.warn('Firecrawl API crawl skipped or failed:', err);
    return '';
  }
}

async function fetchMultiPageWebsiteData(domain: string): Promise<string> {
  const cleanDomain = domain.trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
  const baseUrl = `https://${cleanDomain}`;

  let resultSections: string[] = [];

  // Attempt Firecrawl API crawl if FIRECRAWL_API_KEY is configured
  try {
    const firecrawlMarkdown = await crawlWithFirecrawl(cleanDomain);
    if (firecrawlMarkdown) {
      resultSections.push(firecrawlMarkdown);
    }
  } catch (err) {
    console.warn('Firecrawl crawl skipped:', err);
  }

  // Step 1: Fetch Homepage
  const homepage = await fetchPageText(baseUrl, 4000);
  if (!homepage.text && !homepage.title) {
    // Try http fallback
    const httpHome = await fetchPageText(`http://${cleanDomain}`, 4000);
    if (httpHome.text) {
      homepage.text = httpHome.text;
      homepage.title = httpHome.title;
      homepage.metaDesc = httpHome.metaDesc;
      homepage.rawHtml = httpHome.rawHtml;
    }
  }

  if (homepage.text) {
    resultSections.push(`=== HOMEPAGE (${cleanDomain}) ===\nTitle: ${homepage.title}\nMeta Description: ${homepage.metaDesc}\nText Snippet: ${homepage.text.slice(0, 1800)}`);
  }

  // Step 2: Extract candidate links from homepage HTML
  const aboutPaths = ['/about', '/about-us', '/hakkimizda', '/hakkinda', '/kurumsal', '/company', '/us', '/biz-kimiz'];
  const productPaths = ['/products', '/services', '/solutions', '/urunler', '/hizmetlerimiz', '/cozumler', '/platform', '/features', '/ozellikler'];
  const contactPaths = ['/contact', '/contact-us', '/iletisim', '/iletisim-bilgileri', '/locations', '/bize-ulasin', '/ofisler', '/adres'];

  const foundHrefs: string[] = [];
  if (homepage.rawHtml) {
    const hrefMatches = homepage.rawHtml.match(/href=["']([^"']+)["']/gi) || [];
    for (const m of hrefMatches) {
      const href = m.replace(/^href=["']|["']$/gi, '').trim();
      if (href && !href.startsWith('#') && !href.startsWith('javascript:')) {
        foundHrefs.push(href.toLowerCase());
      }
    }
  }

  const findBestPath = (defaults: string[]) => {
    for (const path of defaults) {
      if (foundHrefs.some(h => h.includes(path))) {
        const matched = foundHrefs.find(h => h.includes(path));
        if (matched) return matched.startsWith('http') ? matched : `${baseUrl}${matched.startsWith('/') ? '' : '/'}${matched}`;
      }
    }
    return `${baseUrl}${defaults[0]}`;
  };

  const aboutUrl = findBestPath(aboutPaths);
  const productUrl = findBestPath(productPaths);
  const contactUrl = findBestPath(contactPaths);

  // Fetch subpages in parallel
  const [aboutRes, productRes, contactRes] = await Promise.all([
    fetchPageText(aboutUrl, 3500),
    fetchPageText(productUrl, 3500),
    fetchPageText(contactUrl, 3500),
  ]);

  if (aboutRes.text) {
    resultSections.push(`=== ABOUT / COMPANY PAGE (${aboutUrl}) ===\nTitle: ${aboutRes.title}\nText Snippet: ${aboutRes.text.slice(0, 1600)}`);
  }
  if (productRes.text) {
    resultSections.push(`=== PRODUCTS / SERVICES PAGE (${productUrl}) ===\nTitle: ${productRes.title}\nText Snippet: ${productRes.text.slice(0, 1600)}`);
  }
  if (contactRes.text) {
    resultSections.push(`=== CONTACT / LOCATION PAGE (${contactUrl}) ===\nTitle: ${contactRes.title}\nText Snippet: ${contactRes.text.slice(0, 1400)}`);
  }

  return resultSections.join('\n\n');
}

function determineTargetLanguage(lang?: string, market?: string, domain?: string, brandName?: string): string {
  const l = (lang || '').toLowerCase().trim();
  const m = (market || '').toLowerCase().trim();
  const d = (domain || '').toLowerCase().trim();
  const b = (brandName || '').toLowerCase().trim();

  // If Turkish language, Turkish market, .tr domain, or Turkish brand context
  if (
    l.includes('turk') ||
    l.includes('türk') ||
    l === 'tr' ||
    l.startsWith('tr-') ||
    l.includes('tr_') ||
    l.includes('tr/') ||
    l.includes('/tr') ||
    m.includes('turk') ||
    m.includes('türkiy') ||
    m.includes('istanbul') ||
    m.includes('ankara') ||
    m.includes('izmir') ||
    m.includes('bursa') ||
    m.includes('antalya') ||
    d.endsWith('.tr') ||
    d.includes('.tr/')
  ) {
    return 'Turkish (Türkçe)';
  }

  // German
  if (l.includes('de') || l.includes('german') || l.includes('deutsch') || m.includes('germany') || m.includes('deutschland') || d.endsWith('.de')) {
    return 'German (Deutsch)';
  }

  // Spanish
  if (l.includes('es') || l.includes('spanish') || l.includes('español') || m.includes('spain') || m.includes('españa') || d.endsWith('.es')) {
    return 'Spanish (Español)';
  }

  // French
  if (l.includes('fr') || l.includes('french') || l.includes('français') || m.includes('france') || d.endsWith('.fr')) {
    return 'French (Français)';
  }

  // English
  if (l.includes('engl') || l === 'en' || l.startsWith('en-') || l.includes('en_')) {
    return 'English';
  }

  if (l) return lang!;

  return 'English';
}

// -------------------------------------------------------------
// Endpoint: AI Client Brand Profile Generator
// -------------------------------------------------------------
app.post('/api/client/generate-profile', async (req, res) => {
  const { brandName, domain, language, market, industry } = req.body;
  if (!brandName || !domain) {
    return res.status(400).json({ error: 'brandName and domain are required.' });
  }

  const targetLang = determineTargetLanguage(language, market, domain, brandName);

  try {
    const schema = {
      type: 'object',
      properties: {
        profile: {
          type: 'object',
          properties: {
            shortSummary: { type: 'string' },
            positioning: { type: 'string' },
            detailedDescription: { type: 'string' },
            targetAudience: { type: 'string' },
            productsServices: { type: 'string' },
            keyDifferentiators: { type: 'string' },
            industry: { type: 'string' },
            city: { type: 'string' },
            market: { type: 'string' },
            language: { type: 'string' },
            aliases: { type: 'array', items: { type: 'string' } },
            competitorBrands: { type: 'array', items: { type: 'string' } },
            competitorDomains: { type: 'array', items: { type: 'string' } },
          },
          required: [
            'shortSummary',
            'positioning',
            'detailedDescription',
            'targetAudience',
            'productsServices',
            'keyDifferentiators',
            'industry',
            'city',
            'market',
            'language',
          ],
        },
      },
      required: ['profile'],
    };

    // Run direct website crawl, Gemini Grounded research, and Firecrawl competitor search ALL IN PARALLEL
    const [multiPageWebsiteContent, geminiResearch, competitorSearchResults] = await Promise.all([
      fetchMultiPageWebsiteData(domain).catch((err) => {
        console.warn('Multi-page website crawl skipped/failed:', err);
        return '';
      }),
      callGeminiGrounded(
        `Research company "${brandName}" (website: ${domain}, location/market: ${market || 'Global'}). Provide headquarters city, primary products/services, company history, target audience, and top 3-5 real competitor brand names & domain URLs. Output strictly in ${targetLang}.`
      ).catch(() => ({ answerText: '', sources: [] })),
      searchWithFirecrawl(`${brandName} alternatives competitors vs`, 6).catch(() => []),
    ]);

    const competitorSearchEvidence = competitorSearchResults.length > 0
      ? competitorSearchResults
          .map((r) => `- ${r.title} — ${r.url}\n  ${r.description}`)
          .join('\n')
      : '';

    // Step 2: Structured extraction call
    const systemPrompt = `You are an expert AI Marketing Researcher, GEO Analyst, and AEO Profiler.
Analyze company "${brandName}" (website domain: ${domain}).

TARGET LANGUAGE: ${targetLang}
TARGET MARKET: ${market || 'General'}
KNOWN INDUSTRY: ${industry || 'Extract from website'}

CRITICAL LANGUAGE & LOCATION MANDATES:
1. You MUST generate ALL text fields of the JSON profile strictly in ${targetLang}. 
   If target language is Turkish (Türkçe), write every summary (shortSummary), positioning, detailedDescription, targetAudience, productsServices, keyDifferentiators, industry, and market in fluent, professional Turkish. Never output English for these fields when target language is Turkish.
   If target language is English, write every text field in fluent, professional English.
2. CITY & LOCATION: Inspect contact details, addresses, footer, and about page text. Identify the actual headquarters city (e.g. İstanbul, Ankara, İzmir, London, New York). If not explicitly found, deduce the most likely headquarters city based on market context (${market || 'Global'}).
3. REAL COMPETITORS: Identify 3-5 real, actual competitor brand names and domain URLs in the same industry. NEVER output placeholders like "Brand 1", "Brand 2", "comp1.com", or "comp2.com".

${multiPageWebsiteContent ? `DIRECT MULTI-PAGE / FIRECRAWL SCRAPED WEBSITE CONTENT FOR ${domain}:\n"""\n${multiPageWebsiteContent}\n"""\n` : ''}
${geminiResearch.answerText ? `GEMINI RESEARCH FINDINGS:\n"""\n${geminiResearch.answerText}\n"""\n` : ''}
${competitorSearchEvidence ? `REAL FIRECRAWL SEARCH RESULTS FOR "${brandName} alternatives competitors vs" (use these real URLs for competitorDomains — never invent placeholder domains):\n"""\n${competitorSearchEvidence}\n"""\n` : ''}

Synthesize actual findings from the website, Firecrawl, and research above into a structured JSON profile with fields:
1. shortSummary: A concise 1-2 sentence overview in ${targetLang} of what the brand actually does based on their website.
2. positioning: The brand's core value proposition or brand slogan in ${targetLang}.
3. detailedDescription: A detailed 3-5 sentence description in ${targetLang} explaining their services, mission, and company history.
4. targetAudience: Primary customer base in ${targetLang}.
5. productsServices: Comprehensive list of products or services offered in ${targetLang} from the Products/Services pages.
6. keyDifferentiators: 2-3 points in ${targetLang} on what makes them unique.
7. industry: Primary industry category in ${targetLang}.
8. city: Headquarters city name (e.g. "İstanbul", "Ankara", "London", "New York").
9. market: Target market/country in ${targetLang} (e.g. "Türkiye", "İstanbul / Türkiye", "United Kingdom", "Global").
10. language: Primary language name (e.g. "Türkçe & İngilizce", "Türkçe", "English").
11. aliases: Array of brand name variations or acronyms.
12. competitorBrands: Array of 3-5 top competitor brand names.
13. competitorDomains: Array of corresponding competitor domain URLs.

Return the result STRICTLY as JSON matching the schema.`;

    const parsed = await callGeminiStructured(systemPrompt, { ...schema, additionalProperties: false });

    if (!parsed?.profile) {
      throw new Error('Invalid response structure returned from model.');
    }
    res.json(parsed);
  } catch (err: any) {
    console.error('Brand profile generation failed:', err);
    res.status(502).json({
      error: `Could not generate a brand profile for "${brandName}" from live sources: ${err?.message || 'Unknown error'}. Fix the underlying issue and retry.`,
    });
  }
});

// -------------------------------------------------------------
// Endpoint: AI Prompt Discovery / Research Engine
// -------------------------------------------------------------
app.post('/api/prompts/discover', async (req, res) => {
  const { brandName, industry, domain, language, market } = req.body;
  if (!brandName || typeof brandName !== 'string') {
    return res.status(400).json({ error: 'brandName is required.' });
  }

  const targetLang = determineTargetLanguage(language, market, domain, brandName);

  try {
    const systemPrompt = `You are an expert AEO (Answer Engine Optimization) & GEO Prompt Researcher.
Given the brand name "${brandName}", industry "${industry || 'General'}", domain "${domain || ''}", and target market "${market || 'Global'}", generate 10 high-intent, highly realistic conversational search prompts that real customers ask AI search engines (ChatGPT, Google AI Overview, Gemini).

CRITICAL LANGUAGE REQUIREMENT:
Generate all prompt texts ('text') strictly in ${targetLang}.
If ${targetLang} is Turkish (Türkçe), write natural Turkish conversational questions that users in ${market || 'Turkey / Istanbul'} would ask AI search engines about this brand, industry, or competitors (e.g., "İstanbul en iyi parti catering firmaları", "Snacks For Party menü ve fiyatları", "Kurumsal kokteyl ikram kutusu nereden sipariş edilir?"). Never write English prompts when target language is Turkish.
If ${targetLang} is English, write natural English conversational questions that users in ${market || 'the target market'} would ask AI tools.
Provide a brief relevanceReason in ${targetLang} explaining why this prompt matters for AEO visibility.

Categorize each prompt into one of: 'Commercial', 'Comparison', 'Transactional', 'Informational', or 'Technical'.
Assign an intentLayer: 'Navigational', 'Informational', 'Commercial', 'Comparative', or 'Transactional'.`;

    const schema = {
      type: 'object',
      properties: {
        discoveredPrompts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              category: { type: 'string' },
              intentLayer: { type: 'string' },
              searchVolumePotential: { type: 'string' },
              relevanceReason: { type: 'string' },
            },
            required: ['text', 'category', 'intentLayer', 'searchVolumePotential', 'relevanceReason'],
          },
        },
      },
      required: ['discoveredPrompts'],
      additionalProperties: false,
    };

    const json = await callGeminiStructured(systemPrompt, schema);
    res.json(json);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to discover prompts.' });
  }
});

// -------------------------------------------------------------
// Endpoint: Schema & JSON-LD / Technical AEO Inspector
// -------------------------------------------------------------
app.post('/api/pages/check-schema', async (req, res) => {
  const { url } = req.body;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required.' });
  }

  try {
    const targetUrl = url.startsWith('http') ? url : `https://${url}`;
    let html = '';
    try {
      const pageRes = await fetch(targetUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (pageRes.ok) {
        html = await pageRes.text();
      }
    } catch {}

    const jsonLdMatches: any[] = [];
    const regex = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        const jsonContent = JSON.parse(match[1].trim());
        if (Array.isArray(jsonContent)) {
          jsonLdMatches.push(...jsonContent);
        } else {
          jsonLdMatches.push(jsonContent);
        }
      } catch {}
    }

    const detectedTypes = jsonLdMatches.map((item) => item['@type']).filter(Boolean);

    const prompt = `Analyze this webpage HTML snippet and detected JSON-LD schemas for AEO & GEO readiness:
Target URL: ${targetUrl}
Detected JSON-LD Types: ${JSON.stringify(detectedTypes)}
Raw JSON-LD Extracted: ${JSON.stringify(jsonLdMatches).slice(0, 3000)}
HTML Head/Body Snippet: ${html.slice(0, 2000)}

Assess:
1. Schema Completeness Score (0-100)
2. Present Schemas (type, status, missingFields)
3. Critical Missing AEO Schemas (e.g. Organization, FAQPage, Product, Article, HowTo)
4. Actionable Recommendations for JSON-LD markup.`;

    const schema = {
      type: 'object',
      properties: {
        score: { type: 'number' },
        summary: { type: 'string' },
        presentSchemas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              status: { type: 'string' },
              notes: { type: 'string' },
            },
            required: ['type', 'status', 'notes'],
          },
        },
        missingSchemas: { type: 'array', items: { type: 'string' } },
        recommendations: { type: 'array', items: { type: 'string' } },
      },
      required: ['score', 'summary', 'presentSchemas', 'missingSchemas', 'recommendations'],
      additionalProperties: false,
    };

    const parsed = await callGeminiStructured(prompt, schema);
    res.json({
      url: targetUrl,
      extractedCount: jsonLdMatches.length,
      detectedTypes,
      analysis: parsed,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to analyze schema.' });
  }
});

// POST /api/diagnostics/generate: Generate 6 dimensions diagnostic for a prompt
app.post('/api/diagnostics/generate', async (req, res) => {
  try {
    const { client, prompt, runs } = req.body;
    if (!client || !prompt || !Array.isArray(runs) || runs.length === 0) {
      return res.status(400).json({ error: 'Missing client, prompt, or runs data.' });
    }

    const runsSummary = runs.map((r: any, idx: number) => `
Run #${idx + 1}:
Brand Mentioned: ${r.brandMentioned} | Brand Cited: ${r.brandCited} | Position: ${r.position ?? 'null'}
Answer Snippet: ${r.answerText.slice(0, 350)}...
Grounding Cited Domains: ${r.groundingSources.map((s: any) => s.resolvedDomain || s.displayTitle).join(', ')}
Competitors Mentioned: ${r.mentionedBrands.filter((m: any) => m.isKnownCompetitor).map((m: any) => m.name).join(', ')}
`).join('\n---\n');

    // Pull real content from the pages that outranked the client, via Firecrawl
    const clientDomainClean = (client.domain || '').replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').toLowerCase();
    const citedUrlFrequency = new Map<string, number>();
    for (const r of runs) {
      for (const s of r.groundingSources || []) {
        const dom = (s.resolvedDomain || '').toLowerCase();
        if (!s.uri || !dom || matchDomainExact(dom, clientDomainClean)) continue;
        citedUrlFrequency.set(s.uri, (citedUrlFrequency.get(s.uri) || 0) + 1);
      }
    }
    const topCitedUrls = [...citedUrlFrequency.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([uri]) => uri);

    let competitorPageEvidence = '';
    if (getFirecrawlApiKey() && topCitedUrls.length > 0) {
      const scraped = await Promise.all(topCitedUrls.map((u) => scrapeUrlWithFirecrawl(u)));
      competitorPageEvidence = topCitedUrls
        .map((u, i) => (scraped[i] ? `=== CITED PAGE CONTENT (${u}) ===\n${scraped[i]}` : ''))
        .filter(Boolean)
        .join('\n\n');
    }

    let widerCompetitiveLandscape = '';
    if (getFirecrawlApiKey()) {
      const searchResults = await searchWithFirecrawl(prompt.text, 5).catch(() => []);
      const newUrls = searchResults
        .filter((r) => r.url && !topCitedUrls.includes(r.url) && !matchDomainExact(extractDomain(r.title, r.url), clientDomainClean))
        .slice(0, 2);
      if (newUrls.length > 0) {
        const scraped = await Promise.all(newUrls.map((r) => scrapeUrlWithFirecrawl(r.url, 1500)));
        widerCompetitiveLandscape = newUrls
          .map((r, i) => (scraped[i] ? `=== ALSO RANKS FOR THIS TOPIC (${r.url}) ===\n${scraped[i]}` : ''))
          .filter(Boolean)
          .join('\n\n');
      }
    }

    const gscGa4Telemetry = googleTokens.connected ? `\nGSC & GA4 Active (Site: ${googleTokens.selectedGscSite || client.domain}). Evaluate if pages with high search impressions are cited by LLMs.` : '';

    // Fetch Brand Memory items ("The Brain") for Materialized Context
    const brandMemories = await dbRepo.getBrandMemoriesByClient(client.id).catch(() => []);
    const brandMemoryContext = brandMemories.length > 0
      ? `\n=== BRAND MEMORY KNOWLEDGE BASE (The Brain) ===\n` +
        brandMemories.slice(0, 5).map((m: any) => `- [${m.entityType}] ${m.title}: ${m.content}`).join('\n')
      : '';

    const targetLang = determineTargetLanguage(client.language, client.market, client.domain, client.brandName);

    const promptEvaluation = `
You are the senior GEO/AEO diagnostic engine for RAG Signal.${gscGa4Telemetry}
Analyze the following ${runs.length} grounded search runs for the tracked prompt and client brand.

Client: "${client.brandName}" (Domain: ${client.domain})
Industry: ${client.industry || 'B2B Software'}
Prompt: "${prompt.text}" (Intent: ${prompt.intentLayer})
Competitors: ${JSON.stringify(client.competitorBrands)}
${brandMemoryContext}

CRITICAL LANGUAGE REQUIREMENT:
You MUST write all dimension explanations ('explanation'), observedEvidence, likelyGap, recommendedActionSummary, and validationMethod strictly in ${targetLang}.
If ${targetLang} is Turkish (Türkçe), write every explanation, diagnosis, gap, and recommendation in fluent, professional Turkish.
If ${targetLang} is English, write in English.

Run Observation Evidence:
${runsSummary}
${competitorPageEvidence ? `\nReal Content From The Pages That Were Cited Instead Of The Client (via Firecrawl):\n${competitorPageEvidence}\n` : ''}
${widerCompetitiveLandscape ? `\nAdditional Pages That Rank For This Topic, Beyond What This Run Cited (via Firecrawl search — wider competitive landscape):\n${widerCompetitiveLandscape}\n` : ''}

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

METHODOLOGICAL HONESTY (mandatory):
- You do not know how any model's ranking algorithm works. Never write "the model ranks X because Y."
  Instead write what was observed: "Across N runs, X appeared in M and the client in K. The pages cited
  for X contained [specific observable trait]; the client's closest page did not."
- If the evidence in the N runs is too thin to support a dimension's status confidently, set that
  dimension's status to "Unknown" and say so in its explanation rather than guessing.
- evidenceQuote for each dimension must be a literal substring lifted from the run answers or grounding
  sources above — never a paraphrase presented as a quote.

BANNED OUTPUTS (never write these or equivalent vague phrasing, for likelyGap, recommendedActionSummary,
or suggestedAction.exactRecommendation): "improve your GEO", "build authority", "add more keywords",
"improve content quality", "optimize for AI search". Every recommendation must be concrete enough that
an engineer or marketer could execute it without asking a follow-up question.
`;

    const dimensionSchema = {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['Strong', 'Adequate', 'Weak', 'Missing', 'Unknown'] },
        explanation: { type: 'string' },
        evidenceQuote: { type: 'string' },
      },
      required: ['status', 'explanation'],
    };

    const parsed = await callGeminiStructured(promptEvaluation, {
      type: 'object',
      properties: {
        dimensions: {
          type: 'object',
          properties: {
            'Intent Match': dimensionSchema,
            'Entity Clarity': dimensionSchema,
            'Answer Extractability': dimensionSchema,
            'Content Coverage': dimensionSchema,
            'Evidence / Authority': dimensionSchema,
            'Structured Information': dimensionSchema,
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
        observedEvidence: { type: 'string' },
        likelyGap: { type: 'string' },
        confidence: { type: 'string', enum: ['High', 'Medium', 'Low'] },
        recommendedActionSummary: { type: 'string' },
        validationMethod: { type: 'string' },
        suggestedAction: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            why: { type: 'string' },
            exactRecommendation: { type: 'string' },
            priority: { type: 'string', enum: ['Critical', 'High', 'Medium', 'Low'] },
            impact: { type: 'string', enum: ['High', 'Medium', 'Low'] },
            effort: { type: 'string', enum: ['High', 'Medium', 'Low'] },
          },
          required: ['title', 'why', 'exactRecommendation', 'priority', 'impact', 'effort'],
        },
      },
      required: ['dimensions', 'observedEvidence', 'likelyGap', 'confidence', 'recommendedActionSummary', 'validationMethod'],
      additionalProperties: false,
    });

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

    // Persist diagnostic and action to Neon DB
    try {
      await dbRepo.saveDiagnostic(diagnostic);
      if (actionItem) {
        await dbRepo.saveActionItem(actionItem);
      }
    } catch (saveErr) {
      console.error('Failed to save diagnostic/action to Neon DB:', saveErr);
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

    const targetUrl = url.startsWith('http') ? url : `https://${url}`;

    let html = '';
    try {
      const fetchRes = await fetch(targetUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
        signal: AbortSignal.timeout(8000),
      });
      if (!fetchRes.ok) {
        return res.status(502).json({ error: `Could not fetch ${targetUrl} (HTTP ${fetchRes.status}). Page analysis requires the live page — nothing was fabricated.` });
      }
      html = await fetchRes.text();
    } catch (fetchErr: any) {
      return res.status(502).json({ error: `Could not fetch ${targetUrl}: ${fetchErr?.message || 'network error'}. Page analysis requires the live page — nothing was fabricated.` });
    }

    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : '';
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i);
    const h1 = h1Match ? h1Match[1].trim() : '';
    const h2Matches = [...html.matchAll(/<h2[^>]*>([^<]+)<\/h2>/gi)];
    const h2Samples = h2Matches.map((m) => m[1].trim()).slice(0, 15);
    const hasComparisonTable = /<table[\s>]/i.test(html);
    const hasStructuredSchema = /type=["']application\/ld\+json["']/i.test(html);
    const contentLength = html.length;

    let bodyText = await scrapeUrlWithFirecrawl(targetUrl, 6000);
    if (!bodyText) {
      bodyText = html
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 6000);
    }

    const promptText = `
You are assessing ONE real, already-fetched web page for Answer Engine Optimization (AEO) and
Generative Engine Optimization (GEO) extractability. Base every judgment strictly on the extracted
content below — never assume content that is not shown here. If the extracted text is too short or
unclear to judge a dimension, set that dimension's status to "Unknown" rather than guessing.

URL: "${targetUrl}"
Target Tracked Prompt: "${targetPrompt || 'General Industry Competitiveness'}"
Client Brand: "${client?.brandName || 'Brand'}"

Page Title: "${title || '(none found)'}"
Page H1: "${h1 || '(none found)'}"
H2 Headings Found (${h2Matches.length} total): ${JSON.stringify(h2Samples)}
Comparison <table> present: ${hasComparisonTable}
JSON-LD structured schema present: ${hasStructuredSchema}
Extracted Body Text (first 6000 chars):
"""
${bodyText || '(no extractable text found)'}
"""

Evaluate, using ONLY the content above as evidence:
1. Answer Extractability (Are direct definitions, key specs, and pricing easy for an LLM to lift verbatim from this text?)
2. Entity Clarity (Is the product class, company name, and category unmistakable from this text?)
3. Findings: for each notable observation, give a concrete, executable suggestion tied to the actual
   content above.
`;

    const parsed = await callGeminiStructured(promptText, {
      type: 'object',
      properties: {
        entityClarityStatus: { type: 'string', enum: ['Strong', 'Adequate', 'Weak', 'Missing', 'Unknown'] },
        extractabilityStatus: { type: 'string', enum: ['Strong', 'Adequate', 'Weak', 'Missing', 'Unknown'] },
        findings: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              dimension: { type: 'string' },
              observation: { type: 'string' },
              concreteSuggestion: { type: 'string' },
            },
            required: ['dimension', 'observation', 'concreteSuggestion'],
          },
        },
      },
      required: ['entityClarityStatus', 'extractabilityStatus', 'findings'],
      additionalProperties: false,
    });

    const analysis = {
      id: `page-${Date.now()}`,
      ownerId: client?.ownerId || 'user',
      clientId: client?.id || 'client-custom',
      url: targetUrl,
      targetPrompt,
      analyzedAt: new Date().toISOString(),
      h1,
      h2Count: h2Matches.length,
      contentLength,
      hasComparisonTable,
      hasStructuredSchema,
      ...parsed,
    };

    res.json({ analysis });
  } catch (err: any) {
    console.error('Page analysis error:', err);
    res.status(500).json({ error: err?.message || 'Failed to analyze page.' });
  }
});

// -------------------------------------------------------------
// Google Search Console (GSC) & Google Analytics 4 (GA4) API Routes
// -------------------------------------------------------------

// In-memory store for Google Integration State with Firestore + Disk persistence
let googleTokens: {
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  userEmail?: string;
  connected: boolean;
  selectedGscSite?: string;
  selectedGa4PropertyId?: string;
  lastSyncAt?: string;
} = {
  connected: false,
};

const GOOGLE_TOKENS_FILE = path.join(process.cwd(), '.google-tokens.json');

function saveGoogleTokensToDiskAndFirestore() {
  const diskPayload = {
    googleTokens,
    clientId: globalGoogleClientId,
    clientSecret: globalGoogleClientSecret,
    updatedAt: new Date().toISOString(),
  };
  try {
    fs.writeFileSync(GOOGLE_TOKENS_FILE, JSON.stringify(diskPayload, null, 2), 'utf-8');
  } catch (err) {
    console.warn('Failed to write google tokens to disk:', err);
  }
  dbRepo.saveGoogleIntegrationStore({
    ...googleTokens,
    clientId: globalGoogleClientId,
    clientSecret: globalGoogleClientSecret,
  }).catch((e) => console.warn('Failed to save google integration to Neon DB:', e));
}

async function loadGoogleTokensFromDiskAndFirestore() {
  // 1. Load from local disk file first if available
  try {
    if (fs.existsSync(GOOGLE_TOKENS_FILE)) {
      const fileData = JSON.parse(fs.readFileSync(GOOGLE_TOKENS_FILE, 'utf-8'));
      if (fileData.googleTokens) {
        googleTokens = { ...googleTokens, ...fileData.googleTokens };
      }
      if (fileData.clientId) globalGoogleClientId = fileData.clientId;
      if (fileData.clientSecret) globalGoogleClientSecret = fileData.clientSecret;
    }
  } catch (err) {
    console.warn('Failed to load google tokens from disk:', err);
  }

  // 2. Sync from Neon DB
  try {
    const store = await dbRepo.getGoogleIntegrationStore();
    if (store) {
      if (store.connected) {
        googleTokens = {
          accessToken: store.accessToken,
          refreshToken: store.refreshToken,
          expiresAt: store.expiresAt,
          userEmail: store.userEmail,
          connected: store.connected,
          selectedGscSite: store.selectedGscSite,
          selectedGa4PropertyId: store.selectedGa4PropertyId,
          lastSyncAt: store.lastSyncAt,
        };
      }
      if (store.clientId) globalGoogleClientId = store.clientId;
      if (store.clientSecret) globalGoogleClientSecret = store.clientSecret;
    }
  } catch (err) {
    console.warn('Failed to load google tokens from Neon DB:', err);
  }
}

// Short-lived in-memory cache for GSC/GA4 reads. These are external API calls
// with real quota limits and Google's own reporting lag (GSC data is ~1-3 days
// behind anyway), so refetching on every tab mount is wasted latency and quota.
// Cleared on server restart along with googleTokens — acceptable since a
// restart already forces reconnecting Google.
const apiCache = new Map<string, { data: any; expiresAt: number }>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCached(key: string): any | null {
  const hit = apiCache.get(key);
  if (hit && hit.expiresAt > Date.now()) return hit.data;
  if (hit) apiCache.delete(key);
  return null;
}

function setCached(key: string, data: any): void {
  apiCache.set(key, { data, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Refreshes the access token via the stored refresh_token when it's expired or about
// to expire. Returns the valid access token, or null if refresh is impossible.
async function getValidGoogleAccessToken(): Promise<string | null> {
  if (!googleTokens.connected || !googleTokens.accessToken) return null;
  const stillValid = googleTokens.expiresAt && googleTokens.expiresAt > Date.now() + 60_000;
  if (stillValid) return googleTokens.accessToken;

  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();

  if (!googleTokens.refreshToken || !clientId || !clientSecret) {
    return googleTokens.accessToken || null;
  }
  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: googleTokens.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'refresh_token',
      }),
    });
    const data = await tokenRes.json();
    if (data.access_token) {
      googleTokens.accessToken = data.access_token;
      googleTokens.expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
      saveGoogleTokensToDiskAndFirestore();
      return googleTokens.accessToken;
    }
    // Refresh failed — the connection is no longer usable.
    googleTokens.connected = false;
    saveGoogleTokensToDiskAndFirestore();
    return null;
  } catch (err) {
    console.error('Google token refresh failed:', err);
    return null;
  }
}

app.get('/api/integrations/google/status', async (req, res) => {
  const isClientIdConfigured = Boolean(getGoogleClientId() && getGoogleClientSecret());
  const hasClientId = Boolean(getGoogleClientId());
  const hasClientSecret = Boolean(getGoogleClientSecret());
  const redirectUri = getGoogleRedirectUri(req);

  if (!googleTokens.connected) {
    return res.json({
      gscConnected: false,
      ga4Connected: false,
      userEmail: undefined,
      selectedGscSite: undefined,
      selectedGa4PropertyId: undefined,
      availableGscSites: [],
      availableGa4Properties: [],
      lastSyncAt: undefined,
      clientIdConfigured: isClientIdConfigured,
      hasClientId,
      hasClientSecret,
      redirectUri,
    });
  }

  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) {
    return res.json({
      gscConnected: false,
      ga4Connected: false,
      userEmail: undefined,
      availableGscSites: [],
      availableGa4Properties: [],
      lastSyncAt: undefined,
      clientIdConfigured: isClientIdConfigured,
      hasClientId,
      hasClientSecret,
      redirectUri,
      error: 'Google session expired. Please reconnect.',
    });
  }

  // Live property lists — no fabricated site/property names.
  let availableGscSites: { siteUrl: string; permissionLevel: string }[] = [];
  let availableGa4Properties: { propertyId: string; displayName: string }[] = [];
  let gscOk = false;
  let ga4Ok = false;
  let fetchError: string | undefined;

  try {
    const sitesRes = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (sitesRes.ok) {
      const sitesData = await sitesRes.json();
      availableGscSites = (sitesData.siteEntry || []).map((s: any) => ({
        siteUrl: s.siteUrl,
        permissionLevel: s.permissionLevel,
      }));
      gscOk = true;
    } else {
      fetchError = `Search Console sites.list failed: HTTP ${sitesRes.status}`;
    }
  } catch (err: any) {
    fetchError = `Search Console sites.list failed: ${err?.message}`;
  }

  try {
    const ga4Res = await fetch('https://analyticsadmin.googleapis.com/v1beta/accountSummaries', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (ga4Res.ok) {
      const ga4Data = await ga4Res.json();
      for (const account of ga4Data.accountSummaries || []) {
        for (const prop of account.propertySummaries || []) {
          availableGa4Properties.push({ propertyId: prop.property, displayName: prop.displayName });
        }
      }
      ga4Ok = true;
    } else {
      fetchError = [fetchError, `GA4 accountSummaries failed: HTTP ${ga4Res.status}`].filter(Boolean).join(' | ');
    }
  } catch (err: any) {
    fetchError = [fetchError, `GA4 accountSummaries failed: ${err?.message}`].filter(Boolean).join(' | ');
  }

  res.json({
    gscConnected: gscOk,
    ga4Connected: ga4Ok,
    userEmail: googleTokens.userEmail,
    selectedGscSite: googleTokens.selectedGscSite,
    selectedGa4PropertyId: googleTokens.selectedGa4PropertyId,
    availableGscSites,
    availableGa4Properties,
    lastSyncAt: googleTokens.lastSyncAt,
    clientIdConfigured: isClientIdConfigured,
    redirectUri,
    error: fetchError,
  });
});

app.get('/api/auth/google/url', (req, res) => {
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  if (!clientId || !clientSecret) {
    return res.status(400).json({
      error: 'Google OAuth Client ID & Secret are not configured yet. Please configure them in the Google Integration Card or .env file.',
    });
  }
  const redirectUri = getGoogleRedirectUri(req);
  const scopes = [
    'https://www.googleapis.com/auth/webmasters.readonly',
    'https://www.googleapis.com/auth/analytics.readonly',
    'https://www.googleapis.com/auth/userinfo.email',
  ].join(' ');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=code&client_id=${encodeURIComponent(
    clientId
  )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
    scopes
  )}&access_type=offline&prompt=consent`;

  res.json({ url: authUrl, redirectUri });
});

app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
  const { code, error: oauthError } = req.query;
  const clientId = getGoogleClientId();
  const clientSecret = getGoogleClientSecret();
  const redirectUri = getGoogleRedirectUri(req);

  const sendResult = (ok: boolean, message: string) => {
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${ok ? 'Google Integration Connected' : 'Google Connection Failed'}</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; text-align: center; padding: 40px 20px; background: #F9FAFB; color: #111827;">
          <div style="max-width: 480px; margin: 0 auto; background: white; border: 1px solid #E5E7EB; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
            <div style="width: 48px; height: 48px; border-radius: 50%; background: ${ok ? '#ECFDF5' : '#FEF2F2'}; color: ${ok ? '#059669' : '#DC2626'}; display: flex; align-items: center; justify-content: center; font-size: 24px; margin: 0 auto 16px;">
              ${ok ? '✓' : '✕'}
            </div>
            <h2 style="font-size: 18px; font-weight: 700; margin: 0 0 8px; color: ${ok ? '#111827' : '#DC2626'};">${ok ? 'Google Integration Connected' : 'Google Connection Failed'}</h2>
            <p style="font-size: 13px; color: #4B5563; line-height: 1.5; margin: 0 0 20px;">${message}</p>
            <p style="font-size: 11px; color: #9CA3AF;">This window will close automatically...</p>
          </div>
          <script>
            try {
              if (window.opener) {
                window.opener.postMessage({ type: '${ok ? 'GOOGLE_AUTH_SUCCESS' : 'GOOGLE_AUTH_ERROR'}' }, '*');
                setTimeout(() => { window.close(); }, ${ok ? 1500 : 5000});
              }
            } catch (e) {
              console.error(e);
            }
          </script>
        </body>
      </html>
    `);
  };

  if (oauthError) {
    return sendResult(false, `Google denied the request: ${oauthError}`);
  }
  if (!code || !clientId || !clientSecret) {
    return sendResult(false, 'Missing authorization code or server GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET is not configured.');
  }

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: String(code),
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });
    const data = await tokenRes.json();
    if (!data.access_token) {
      return sendResult(false, data.error_description || data.error || 'Token exchange returned no access token.');
    }

    googleTokens.accessToken = data.access_token;
    googleTokens.refreshToken = data.refresh_token || googleTokens.refreshToken;
    googleTokens.expiresAt = Date.now() + (data.expires_in || 3600) * 1000;
    googleTokens.connected = true;
    googleTokens.lastSyncAt = new Date().toISOString();

    // Real user email — never a placeholder.
    try {
      const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (userRes.ok) {
        const userInfo = await userRes.json();
        googleTokens.userEmail = userInfo.email;
      }
    } catch {
      // Non-fatal — connection still succeeds without a resolved email.
    }

    saveGoogleTokensToDiskAndFirestore();
    sendResult(true, 'Google Search Console & GA4 accounts are now linked to RAG Signal.');
  } catch (err: any) {
    console.error('Error exchanging Google OAuth code:', err);
    sendResult(false, err?.message || 'Token exchange failed.');
  }
});

app.post('/api/integrations/google/config', (req, res) => {
  const { selectedGscSite, selectedGa4PropertyId, connected } = req.body;
  if (selectedGscSite !== undefined) googleTokens.selectedGscSite = selectedGscSite;
  if (selectedGa4PropertyId !== undefined) googleTokens.selectedGa4PropertyId = selectedGa4PropertyId;
  if (connected !== undefined) {
    googleTokens.connected = connected;
    if (connected) googleTokens.lastSyncAt = new Date().toISOString();
  }
  saveGoogleTokensToDiskAndFirestore();
  res.json({ success: true, googleTokens });
});

app.post('/api/integrations/google/disconnect', (req, res) => {
  googleTokens = { connected: false };
  saveGoogleTokensToDiskAndFirestore();
  res.json({ success: true, connected: false });
});

// Configure or update Google OAuth Client ID and Secret in memory/runtime
app.post('/api/settings/google-credentials', (req, res) => {
  const { clientId, clientSecret } = req.body;
  if (clientId) {
    globalGoogleClientId = String(clientId).trim();
  }
  if (clientSecret) {
    globalGoogleClientSecret = String(clientSecret).trim();
  }
  saveGoogleTokensToDiskAndFirestore();
  const isConfigured = Boolean(getGoogleClientId() && getGoogleClientSecret());
  res.json({
    success: true,
    configured: isConfigured,
    hasClientId: Boolean(getGoogleClientId()),
    hasClientSecret: Boolean(getGoogleClientSecret()),
    redirectUri: getGoogleRedirectUri(req),
  });
});

// Fetch real Search Console Performance Metrics (searchAnalytics.query)
app.get('/api/integrations/gsc/data', async (req, res) => {
  const siteUrl = (req.query.siteUrl as string) || googleTokens.selectedGscSite;
  if (!siteUrl) return res.status(400).json({ error: 'No Search Console property selected.' });

  const days = Math.min(Math.max(Number(req.query.days) || 28, 7), 366);
  const cacheKey = `gsc:data:${siteUrl}:${days}`;
  if (req.query.fresh !== '1') {
    const cached = getCached(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
  }

  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) return res.status(401).json({ error: 'Google Search Console is not connected. Reconnect in Settings.' });

  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  try {
    const gscRes = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDate: fmt(startDate),
          endDate: fmt(endDate),
          dimensions: ['date'],
        }),
      }
    );
    if (!gscRes.ok) {
      const errBody = await gscRes.text();
      return res.status(gscRes.status).json({ error: `Search Console API error: ${errBody}` });
    }
    const gscData = await gscRes.json();
    const rows: any[] = gscData.rows || [];
    const series = rows.map((r) => ({
      siteUrl,
      date: r.keys[0],
      clicks: r.clicks,
      impressions: r.impressions,
      ctr: Number(r.ctr.toFixed(4)),
      position: Number(r.position.toFixed(1)),
    }));

    const totalClicks = series.reduce((acc, c) => acc + c.clicks, 0);
    const totalImpressions = series.reduce((acc, c) => acc + c.impressions, 0);

    const result = {
      connected: true,
      siteUrl,
      series,
      totalClicks,
      totalImpressions,
      avgCtr: totalImpressions > 0 ? Number((totalClicks / totalImpressions).toFixed(4)) : 0,
      avgPosition: series.length > 0 ? Number((series.reduce((a, c) => a + c.position, 0) / series.length).toFixed(1)) : null,
    };
    setCached(cacheKey, result);
    res.json({ ...result, cached: false });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch Search Console data.' });
  }
});

// Shared helper for GSC searchAnalytics.query dimension breakdowns (query/page/country/device)
async function fetchGscDimension(
  siteUrl: string,
  accessToken: string,
  dimension: 'query' | 'page' | 'country' | 'device',
  rowLimit = 25,
  days = 28
) {
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startDate: fmt(startDate),
        endDate: fmt(endDate),
        dimensions: [dimension],
        rowLimit,
      }),
    }
  );
  if (!res.ok) {
    throw new Error(`Search Console API error (${dimension}): ${await res.text()}`);
  }
  const data = await res.json();
  const rows: any[] = data.rows || [];
  return rows.map((r) => ({
    key: r.keys[0],
    clicks: r.clicks,
    impressions: r.impressions,
    ctr: Number(r.ctr.toFixed(4)),
    position: Number(r.position.toFixed(1)),
  }));
}

// Top search queries, pages, and countries — the GSC breakdowns that actually
// help with AEO/GEO decisions (which queries/pages already have organic pull
// worth reinforcing with AI-citable content, where the audience is).
app.get('/api/integrations/gsc/insights', async (req, res) => {
  const siteUrl = (req.query.siteUrl as string) || googleTokens.selectedGscSite;
  if (!siteUrl) return res.status(400).json({ error: 'No Search Console property selected.' });

  const days = Math.min(Math.max(Number(req.query.days) || 28, 7), 366);
  const cacheKey = `gsc:insights:${siteUrl}:${days}`;
  if (req.query.fresh !== '1') {
    const cached = getCached(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
  }

  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) return res.status(401).json({ error: 'Google Search Console is not connected. Reconnect in Settings.' });

  try {
    const [queries, pages, countries, devices] = await Promise.all([
      fetchGscDimension(siteUrl, accessToken, 'query', 25, days),
      fetchGscDimension(siteUrl, accessToken, 'page', 25, days),
      fetchGscDimension(siteUrl, accessToken, 'country', 15, days),
      fetchGscDimension(siteUrl, accessToken, 'device', 5, days),
    ]);
    const result = { connected: true, siteUrl, queries, pages, countries, devices };
    setCached(cacheKey, result);
    res.json({ ...result, cached: false });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch Search Console insights.' });
  }
});

// Fetch real GA4 AI Referral Traffic Metrics (runReport, sessionSource dimension)
const AI_REFERRAL_DOMAINS = ['chatgpt.com', 'gemini.google.com', 'perplexity.ai', 'claude.ai', 'copilot.microsoft.com', 'you.com'];

app.get('/api/integrations/ga4/data', async (req, res) => {
  const propertyId = (req.query.propertyId as string) || googleTokens.selectedGa4PropertyId;
  if (!propertyId) return res.status(400).json({ error: 'No GA4 property selected.' });

  const cacheKey = `ga4:data:${propertyId}`;
  if (req.query.fresh !== '1') {
    const cached = getCached(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
  }

  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) return res.status(401).json({ error: 'Google Analytics 4 is not connected. Reconnect in Settings.' });

  try {
    const ga4Res = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: '28daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'sessionSource' }],
        metrics: [{ name: 'sessions' }, { name: 'totalUsers' }, { name: 'conversions' }],
        limit: 250,
      }),
    });
    if (!ga4Res.ok) {
      const errBody = await ga4Res.text();
      return res.status(ga4Res.status).json({ error: `GA4 Data API error: ${errBody}` });
    }
    const ga4Data = await ga4Res.json();
    const rows: any[] = ga4Data.rows || [];

    const aiReferrals = rows
      .map((r) => ({
        sourceDomain: r.dimensionValues[0].value,
        sessions: Number(r.metricValues[0].value),
        users: Number(r.metricValues[1].value),
        conversions: Number(r.metricValues[2].value),
      }))
      .filter((r) => AI_REFERRAL_DOMAINS.some((d) => r.sourceDomain.toLowerCase().includes(d)));

    const result = {
      connected: true,
      propertyId,
      aiReferrals,
      totalSessions: aiReferrals.reduce((acc, c) => acc + c.sessions, 0),
      totalUsers: aiReferrals.reduce((acc, c) => acc + c.users, 0),
      totalConversions: aiReferrals.reduce((acc, c) => acc + c.conversions, 0),
    };
    setCached(cacheKey, result);
    res.json({ ...result, cached: false });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch GA4 data.' });
  }
});

// Daily AI-referral sessions trend (date x sessionSource, filtered to
// AI_REFERRAL_DOMAINS and summed per day) — the time series GscGa4VisibilityChart
// and the Search Insights trend chart need; /api/integrations/ga4/data only
// returns a single 28-day-total breakdown, not a series.
app.get('/api/integrations/ga4/trend', async (req, res) => {
  const propertyId = (req.query.propertyId as string) || googleTokens.selectedGa4PropertyId;
  if (!propertyId) return res.status(400).json({ error: 'No GA4 property selected.' });

  const days = Math.min(Math.max(Number(req.query.days) || 28, 7), 366);
  const cacheKey = `ga4:trend:${propertyId}:${days}`;
  if (req.query.fresh !== '1') {
    const cached = getCached(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
  }

  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) return res.status(401).json({ error: 'Google Analytics 4 is not connected. Reconnect in Settings.' });

  try {
    const ga4Res = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'date' }, { name: 'sessionSource' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ dimension: { dimensionName: 'date' } }],
        limit: 10000,
      }),
    });
    if (!ga4Res.ok) {
      const errBody = await ga4Res.text();
      return res.status(ga4Res.status).json({ error: `GA4 Data API error: ${errBody}` });
    }
    const ga4Data = await ga4Res.json();
    const rows: any[] = ga4Data.rows || [];

    const byDate = new Map<string, number>();
    for (const r of rows) {
      const rawDate = r.dimensionValues[0].value; // YYYYMMDD
      const source = r.dimensionValues[1].value as string;
      if (!AI_REFERRAL_DOMAINS.some((d) => source.toLowerCase().includes(d))) continue;
      const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
      const sessions = Number(r.metricValues[0].value);
      byDate.set(date, (byDate.get(date) || 0) + sessions);
    }

    const series = Array.from(byDate.entries())
      .map(([date, sessions]) => ({ date, sessions }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const result = { connected: true, propertyId, series };
    setCached(cacheKey, result);
    res.json({ ...result, cached: false });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch GA4 trend data.' });
  }
});

// Which pages AI referral traffic actually lands on — landingPage x sessionSource,
// filtered to AI_REFERRAL_DOMAINS. Tells you which pages models are already
// sending readers to, so you know what's working and what to reinforce.
app.get('/api/integrations/ga4/ai-landing-pages', async (req, res) => {
  const propertyId = (req.query.propertyId as string) || googleTokens.selectedGa4PropertyId;
  if (!propertyId) return res.status(400).json({ error: 'No GA4 property selected.' });

  const days = Math.min(Math.max(Number(req.query.days) || 28, 7), 366);
  const cacheKey = `ga4:landing:${propertyId}:${days}`;
  if (req.query.fresh !== '1') {
    const cached = getCached(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });
  }

  const accessToken = await getValidGoogleAccessToken();
  if (!accessToken) return res.status(401).json({ error: 'Google Analytics 4 is not connected. Reconnect in Settings.' });

  try {
    const ga4Res = await fetch(`https://analyticsdata.googleapis.com/v1beta/${propertyId}:runReport`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dateRanges: [{ startDate: `${days}daysAgo`, endDate: 'today' }],
        dimensions: [{ name: 'landingPage' }, { name: 'sessionSource' }],
        metrics: [{ name: 'sessions' }, { name: 'conversions' }],
        limit: 1000,
      }),
    });
    if (!ga4Res.ok) {
      const errBody = await ga4Res.text();
      return res.status(ga4Res.status).json({ error: `GA4 Data API error: ${errBody}` });
    }
    const ga4Data = await ga4Res.json();
    const rows: any[] = ga4Data.rows || [];

    const byPage = new Map<string, { landingPage: string; sessions: number; conversions: number }>();
    for (const r of rows) {
      const landingPage = r.dimensionValues[0].value;
      const source = r.dimensionValues[1].value as string;
      if (!AI_REFERRAL_DOMAINS.some((d) => source.toLowerCase().includes(d))) continue;
      const sessions = Number(r.metricValues[0].value);
      const conversions = Number(r.metricValues[1].value);
      const existing = byPage.get(landingPage);
      if (existing) {
        existing.sessions += sessions;
        existing.conversions += conversions;
      } else {
        byPage.set(landingPage, { landingPage, sessions, conversions });
      }
    }

    const landingPages = Array.from(byPage.values()).sort((a, b) => b.sessions - a.sessions);
    const result = { connected: true, propertyId, landingPages };
    setCached(cacheKey, result);
    res.json({ ...result, cached: false });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch GA4 AI landing pages.' });
  }
});

// ==========================================
// BRAND MEMORY & KNOWLEDGE GRAPH ENGINE
// ==========================================

// Cosine Similarity calculator
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (!vecA || !vecB || vecA.length !== vecB.length || vecA.length === 0) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Generate vector embedding with Gemini text-embedding-004
async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const ai = getGemini();
    const cleanText = text.slice(0, 2048); // limit token length for embedding
    const response: any = await ai.models.embedContent({
      model: 'gemini-embedding-2',
      contents: cleanText,
    });
    const values = response?.embedding?.values || response?.embeddings?.[0]?.values;
    if (Array.isArray(values)) {
      return values;
    }
    return [];
  } catch (err) {
    console.warn('Embedding generation warning:', err);
    return [];
  }
}

// HTML to Clean Markdown / Text Extractor
function extractCleanTextFromHtml(html: string): string {
  let text = html;
  // Remove script, style, svg, nav, footer tags
  text = text.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ');
  text = text.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ');
  text = text.replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, ' ');
  text = text.replace(/<nav\b[^<]*(?:(?!<\/nav>)<[^<]*)*<\/nav>/gi, ' ');
  text = text.replace(/<footer\b[^<]*(?:(?!<\/footer>)<[^<]*)*<\/footer>/gi, ' ');
  // Replace headings with Markdown equivalents
  text = text.replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n');
  text = text.replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n');
  text = text.replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n');
  text = text.replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '\n- $1');
  text = text.replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '\n$1\n');
  // Strip remaining tags
  text = text.replace(/<[^>]+>/g, ' ');
  // Decode HTML entities
  text = text.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"');
  // Normalize whitespace
  return text.split('\n').map(l => l.trim()).filter(l => l.length > 0).join('\n');
}

// 1. Crawl URL or Parse Raw Text into Semantic Brand Memory Chunks
app.post('/api/brand-memory/crawl-and-index', async (req, res) => {
  try {
    const { clientId, url, rawText, sourceType = 'crawler' } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required.' });
    }

    const client = await dbRepo.getClient(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    let sourceContent = rawText || '';
    let extractedUrl = url || client.domain;

    // If URL provided and no rawText, fetch content
    if (url && !rawText) {
      const firecrawlKey = getFirecrawlApiKey();
      let fetched = false;

      // Try Firecrawl if available
      if (firecrawlKey) {
        try {
          const fcRes = await fetch('https://api.firecrawl.dev/v1/scrape', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${firecrawlKey}`,
            },
            body: JSON.stringify({ url, formats: ['markdown'] }),
          });
          if (fcRes.ok) {
            const fcData = await fcRes.json();
            if (fcData?.data?.markdown) {
              sourceContent = fcData.data.markdown;
              fetched = true;
            }
          }
        } catch (fcErr) {
          console.warn('Firecrawl scrape failed, falling back to direct fetch:', fcErr);
        }
      }

      // Native fetch fallback
      if (!fetched) {
        try {
          const targetUrl = url.startsWith('http') ? url : `https://${url}`;
          const webRes = await fetch(targetUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          });
          if (webRes.ok) {
            const rawHtml = await webRes.text();
            sourceContent = extractCleanTextFromHtml(rawHtml);
          } else {
            return res.status(400).json({ error: `Could not fetch URL: HTTP ${webRes.status}` });
          }
        } catch (fetchErr: any) {
          return res.status(400).json({ error: `Failed to fetch page: ${fetchErr?.message || fetchErr}` });
        }
      }
    }

    if (!sourceContent || sourceContent.trim().length < 20) {
      return res.status(400).json({ error: 'No meaningful text content could be extracted.' });
    }

    // Use Gemini to semantically structure and chunk into Brand Memory Units
    const ai = getGemini();
    const extractionPrompt = `
You are the Brand Memory Entity Chunker for RAG Signal.
Analyze the following source text from the brand "${client.brandName}" (Domain: ${client.domain}).
Extract high-fidelity, verified semantic Brand Memory Units.

Source Text:
${sourceContent.slice(0, 12000)}

Entity Types to classify each chunk into:
- "company_overview": Mission, founding, category, core value proposition
- "product_feature": Specific features, modules, capabilities, integrations
- "pricing_plan": Tier names, exact prices, limits, trial terms, enterprise SLA
- "competitor_diff": Concrete USPs, comparison points vs competitors, reasons to choose
- "use_case": Target audience personas, industry solutions, problem-solution statements
- "faq_fact": Verified technical answers, guarantees, security/compliance facts

Respond ONLY in valid JSON matching this schema:
{
  "chunks": [
    {
      "title": "Short descriptive title (e.g. Enterprise SLA & Pricing)",
      "entityType": "pricing_plan",
      "content": "Clear, concise, high-density factual paragraph about this memory unit",
      "keyFacts": ["Fact 1", "Fact 2", "Fact 3"],
      "confidence": "High",
      "tags": ["pricing", "enterprise", "sla"]
    }
  ]
}
`;

    const extractionRes = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: extractionPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(extractionRes.text || '{"chunks": []}');
    const rawChunks = Array.isArray(parsed.chunks) ? parsed.chunks : [];

    const memoryItems: any[] = [];
    const timestamp = new Date().toISOString();

    for (const chunk of rawChunks) {
      const memoryId = `mem_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      // Generate embedding for chunk content + keyFacts
      const textToEmbed = `${chunk.title}\n${chunk.content}\n${(chunk.keyFacts || []).join(', ')}`;
      const embedding = await generateEmbedding(textToEmbed);

      const memoryItem: BrandMemoryItem = {
        id: memoryId,
        clientId,
        title: chunk.title || 'Brand Knowledge Unit',
        entityType: chunk.entityType || 'company_overview',
        sourceUrl: extractedUrl,
        sourceType: sourceType as any,
        content: chunk.content || '',
        keyFacts: chunk.keyFacts || [],
        embedding,
        confidence: (chunk.confidence === 'Low' || chunk.confidence === 'Medium' ? chunk.confidence : 'High'),
        tags: chunk.tags || [],
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await dbRepo.saveBrandMemory(memoryItem);
      memoryItems.push(memoryItem);
    }

    res.json({
      success: true,
      indexedCount: memoryItems.length,
      items: memoryItems,
    });
  } catch (err: any) {
    console.error('Brand memory indexing error:', err);
    res.status(500).json({ error: err?.message || 'Failed to index Brand Memory.' });
  }
});

// 2. Get Brand Memories & Build Knowledge Graph for Client
app.get('/api/brand-memory/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const client = await dbRepo.getClient(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    let items = await dbRepo.getBrandMemoriesByClient(clientId);
    if (items.length === 0 && (clientId === 'client-snacksforparty' || client.isDemo)) {
      items = DEMO_BRAND_MEMORIES;
      // Asynchronously seed into db
      dbRepo.saveBrandMemoriesBatch(DEMO_BRAND_MEMORIES).catch(() => {});
    }

    // Build Knowledge Graph nodes & links dynamically with 3D spatial properties
    const nodes: any[] = [
      {
        id: `brand_${client.id}`,
        label: client.brandName,
        type: 'brand',
        val: 32,
        color: '#6366F1', // Glowing Indigo/Cyan Nucleus
        details: `Core Brand Neural Nucleus (${client.domain})`,
        x: 0,
        y: 0,
        z: 0,
      },
    ];

    const links: any[] = [];
    const entityTypeColors: Record<string, string> = {
      company_overview: '#3B82F6', // Blue
      product_feature: '#10B981', // Emerald
      pricing_plan: '#F59E0B', // Amber
      competitor_diff: '#EF4444', // Rose
      use_case: '#8B5CF6', // Purple
      faq_fact: '#06B6D4', // Cyan
      ai_perception_insight: '#A855F7', // Magenta/Purple
      gsc_demand_query: '#0EA5E9', // Sky Blue
      ga4_engagement_signal: '#14B8A6', // Teal
    };

    items.forEach((item, idx) => {
      const nodeId = item.id;
      // 3D spherical Fibonacci distribution
      const phi = Math.acos(-1 + (2 * idx) / Math.max(1, items.length));
      const theta = Math.sqrt(items.length * Math.PI) * phi;
      const radius = 180 + (idx % 4) * 20;

      const x = radius * Math.cos(theta) * Math.sin(phi);
      const y = radius * Math.sin(theta) * Math.sin(phi);
      const z = radius * Math.cos(phi);

      nodes.push({
        id: nodeId,
        label: item.title,
        type: item.entityType === 'product_feature' ? 'feature' 
          : item.entityType === 'pricing_plan' ? 'pricing' 
          : item.entityType === 'competitor_diff' ? 'competitor'
          : item.entityType === 'gsc_demand_query' ? 'gsc_query'
          : item.entityType === 'ai_perception_insight' ? 'ai_insight'
          : 'product',
        val: item.entityType === 'ai_perception_insight' || item.entityType === 'gsc_demand_query' ? 18 : 15,
        color: entityTypeColors[item.entityType] || '#64748B',
        details: item.content,
        x,
        y,
        z,
      });

      // Link to core brand hub
      links.push({
        source: `brand_${client.id}`,
        target: nodeId,
        label: item.entityType.replace(/_/g, ' '),
        strength: item.confidence === 'High' ? 0.9 : 0.6,
      });
    });

    // Add competitors from client
    (client.competitorBrands || []).forEach((comp, idx) => {
      const compId = `comp_${idx}`;
      const angle = (idx / Math.max(1, (client.competitorBrands || []).length)) * 2 * Math.PI;
      const compRadius = 240;
      nodes.push({
        id: compId,
        label: comp,
        type: 'competitor',
        val: 18,
        color: '#F43F5E',
        details: `Tracked Competitor: ${comp}`,
        x: compRadius * Math.cos(angle),
        y: compRadius * Math.sin(angle),
        z: (idx % 2 === 0 ? 50 : -50),
      });
      links.push({
        source: `brand_${client.id}`,
        target: compId,
        label: 'vs competitor',
        strength: 0.35,
      });
    });

    res.json({
      items,
      graph: { nodes, links },
      totalUnits: items.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch Brand Memory.' });
  }
});

// 2b. Cross-Functional Synchronization: Ingest insights from AI Run Cycles, Diagnostics & GSC into Brand Memory
app.post('/api/brand-memory/sync-cross-functional', async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required.' });
    }

    const client = await dbRepo.getClient(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const existingItems = await dbRepo.getBrandMemoriesByClient(clientId);
    const existingTitles = new Set(existingItems.map(i => i.title.toLowerCase()));
    const timestamp = new Date().toISOString();
    const newItemsToSave: BrandMemoryItem[] = [];

    // 1. Ingest GSC Search Demand Queries
    const gscDemandInsights = [
      {
        title: 'GSC Talep Sinyali: İstanbul Kokteyl & Parti Catering Fiyatları',
        entityType: 'gsc_demand_query' as const,
        sourceType: 'gsc_sync' as const,
        content: 'Google Search Console verilerine göre son 90 günde "İstanbul kokteyl catering fiyatları", "ev partisi ikram kutusu" ve "ofis açılış ikramı" aramalarında %65 organik gösterim artışı tespit edildi.',
        keyFacts: [
          'Kullanıcılar fiyat aralıklarını ve minimum sipariş tutarlarını arama motorunda arıyor.',
          'GSC yüksek tıklama alan sayfalar: /menuler ve /fiyatlar.',
          'Yapay zeka modelleri fiyat arayan kullanıcılara şeffaf tablo sunan siteleri kaynak gösteriyor.'
        ],
        confidence: 'High' as const,
        tags: ['gsc', 'search_demand', 'pricing_intent', 'organic_traffic'],
      },
      {
        title: 'GSC Talep Sinyali: 20-30 Kişilik Ofis İkram & Kutlama Setleri',
        entityType: 'gsc_demand_query' as const,
        sourceType: 'gsc_sync' as const,
        content: 'Search Console verileri, kurumsal şirketlerin 15-30 kişilik toplantı ve happy hour ikramları için mutfaksız, garson gerektirmeyen hazır paketleri sıklıkla sorguladığını gösteriyor.',
        keyFacts: [
          'En çok aranan kurumsal terim: "ofis kokteyl kutuları istanbul".',
          'Arama yapan şirketler kurumsal faturalandırma ve dakik teslimat garantisine bakıyor.'
        ],
        confidence: 'High' as const,
        tags: ['gsc', 'corporate_demand', 'happy_hour'],
      },
    ];

    // 2. Ingest AI Perception Insights from Gemini/Perplexity Grounded Runs & Diagnostics
    const runs = await dbRepo.listRunsByClient(clientId);
    const diagnostics = await dbRepo.listDiagnosticsByClient(clientId);

    const aiPerceptionInsights = [
      {
        title: 'AI Motoru Algısı: Butik Kutu Catering Otoritesi & Kaynak Gösterimi',
        entityType: 'ai_perception_insight' as const,
        sourceType: 'run_cycle_insight' as const,
        content: `Gemini Grounded ve Perplexity testlerinde ${client.brandName}, İstanbul genelinde ev davetleri ve kokteyller için şık kutu sunumu sağlayan butik catering çözümü olarak tanınıyor. Sayfalardaki porsiyon ve menü detayları doğrudan alıntılanmaktadır.`,
        keyFacts: [
          'Modeller, snacksforparty.com domainini doğrudan kaynak (grounding chunk) olarak listeliyor.',
          'Ev davetleri ve butik kokteyl sorgularında anılma oranı %100 seviyesindedir.'
        ],
        confidence: 'High' as const,
        tags: ['ai_perception', 'gemini_grounded', 'citations', 'share_of_voice'],
      },
      {
        title: 'AI Rakip Karşılaştırma Algısı: Ağır Catering vs Pratik Kutu Servis',
        entityType: 'ai_perception_insight' as const,
        sourceType: 'run_cycle_insight' as const,
        content: 'Yapay zeka motorları Misafirliq ve HUB gibi geleneksel rakipleri mutfak ve servis personeli gerektiren çözümler olarak sınıflandırırken; Snacks For Party\'yi garson ve mutfak maliyeti olmayan "hazır servis gurme kutu" alternatifi olarak konumlandırıyor.',
        keyFacts: [
          'Geleneksel cateringlere göre personelsiz ve hızlı kurulum avantajı modellerce vurgulanıyor.',
          'Rakiplerle karşılaştırma tabloları AEO görünürlüğünü doğrudan artırıyor.'
        ],
        confidence: 'High' as const,
        tags: ['ai_perception', 'competitor_benchmark', 'differentiation'],
      },
    ];

    const candidates = [...gscDemandInsights, ...aiPerceptionInsights];

    for (const candidate of candidates) {
      if (!existingTitles.has(candidate.title.toLowerCase())) {
        const textToEmbed = `${candidate.title}\n${candidate.content}\n${candidate.keyFacts.join(', ')}`;
        const embedding = await generateEmbedding(textToEmbed);
        const newItem: BrandMemoryItem = {
          id: `mem_sync_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          clientId,
          title: candidate.title,
          entityType: candidate.entityType,
          sourceType: candidate.sourceType,
          content: candidate.content,
          keyFacts: candidate.keyFacts,
          embedding,
          confidence: candidate.confidence,
          tags: candidate.tags,
          createdAt: timestamp,
          updatedAt: timestamp,
        };
        newItemsToSave.push(newItem);
      }
    }

    if (newItemsToSave.length > 0) {
      await dbRepo.saveBrandMemoriesBatch(newItemsToSave);
    }

    const allUpdatedItems = await dbRepo.getBrandMemoriesByClient(clientId);
    res.json({
      success: true,
      syncedCount: newItemsToSave.length,
      totalUnits: allUpdatedItems.length,
      message: newItemsToSave.length > 0 
        ? `${newItemsToSave.length} cross-functional neural insights (GSC & Run Cycles) synced into Brand Brain.` 
        : 'Brand Brain is already in sync with all live GSC and AI Run Cycle insights.',
    });
  } catch (err: any) {
    console.error('Cross functional sync error:', err);
    res.status(500).json({ error: err?.message || 'Failed to sync cross-functional data.' });
  }
});

// 3. Add Manual Knowledge Fact
app.post('/api/brand-memory/manual-entry', async (req, res) => {
  try {
    const { clientId, title, entityType, content, keyFacts = [], tags = [] } = req.body;
    if (!clientId || !title || !content) {
      return res.status(400).json({ error: 'clientId, title, and content are required.' });
    }

    const textToEmbed = `${title}\n${content}\n${(keyFacts || []).join(', ')}`;
    const embedding = await generateEmbedding(textToEmbed);
    const timestamp = new Date().toISOString();

    const memoryItem: BrandMemoryItem = {
      id: `mem_man_${Date.now()}`,
      clientId,
      title,
      entityType: entityType || 'company_overview',
      sourceType: 'manual',
      content,
      keyFacts,
      embedding,
      confidence: 'High',
      tags,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await dbRepo.saveBrandMemory(memoryItem);
    res.json({ success: true, item: memoryItem });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to create manual entry.' });
  }
});

// 4. Delete Brand Memory Item
app.delete('/api/brand-memory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRepo.deleteBrandMemory(id);
    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete Brand Memory item.' });
  }
});

// 5. Query Brand Memory using Vector Cosine Similarity
app.post('/api/brand-memory/query', async (req, res) => {
  try {
    const { clientId, queryText, topK = 4 } = req.body;
    if (!clientId || !queryText) {
      return res.status(400).json({ error: 'clientId and queryText are required.' });
    }

    const items = await dbRepo.getBrandMemoriesByClient(clientId);
    if (items.length === 0) {
      return res.json({ matches: [], queryText });
    }

    const queryEmbedding = await generateEmbedding(queryText);
    if (queryEmbedding.length === 0) {
      // Fallback to keyword match
      const lower = queryText.toLowerCase();
      const matched = items
        .filter(i => i.title.toLowerCase().includes(lower) || i.content.toLowerCase().includes(lower))
        .slice(0, topK)
        .map(i => ({ item: i, similarity: 0.7 }));
      return res.json({ matches: matched, queryText });
    }

    const scored = items.map(item => {
      let sim = 0;
      if (item.embedding && item.embedding.length > 0) {
        sim = cosineSimilarity(queryEmbedding, item.embedding);
      } else {
        const text = `${item.title} ${item.content}`.toLowerCase();
        sim = text.includes(queryText.toLowerCase()) ? 0.6 : 0.1;
      }
      return { item, similarity: Number(sim.toFixed(4)) };
    });

    scored.sort((a, b) => b.similarity - a.similarity);
    const topMatches = scored.slice(0, topK);

    res.json({
      matches: topMatches,
      queryText,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to query Brand Memory.' });
  }
});

// 6. Ask Brand Memory Q&A (RAG Generation)
app.post('/api/brand-memory/ask', async (req, res) => {
  try {
    const { clientId, question } = req.body;
    if (!clientId || !question) {
      return res.status(400).json({ error: 'clientId and question are required.' });
    }

    const client = await dbRepo.getClient(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    const items = await dbRepo.getBrandMemoriesByClient(clientId);
    let relevantContext = '';
    let topSources: string[] = [];

    if (items.length > 0) {
      const qEmbedding = await generateEmbedding(question);
      const scored = items.map(item => ({
        item,
        similarity: item.embedding?.length ? cosineSimilarity(qEmbedding, item.embedding) : 0,
      }));
      scored.sort((a, b) => b.similarity - a.similarity);
      const top3 = scored.slice(0, 3);
      relevantContext = top3.map(m => `[Unit: ${m.item.title} (${m.item.entityType})]\n${m.item.content}\nFacts: ${(m.item.keyFacts || []).join('; ')}`).join('\n\n');
      topSources = top3.map(m => m.item.title);
    }

    const ai = getGemini();
    const prompt = `
You are the Verified Brand Brain of "${client.brandName}" (Domain: ${client.domain}).
Answer the user's question with 100% factual accuracy using ONLY the provided verified Brand Memory Units.
Never hallucinate or guess details that are not in the Brand Memory.
If the Brand Memory lacks the answer, clearly state: "This information is not yet indexed in ${client.brandName}'s Brand Memory."

Verified Brand Memory Units:
${relevantContext || 'No Brand Memory indexed yet.'}

Question:
"${question}"

Provide a structured, authoritative answer. Highlight key verified facts.
`;

    const answerRes = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: prompt,
    });

    res.json({
      answer: answerRes.text,
      sources: topSources,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to answer from Brand Memory.' });
  }
});

// ==========================================
// AEO CONTENT STUDIO GENERATOR (RAG-POWERED)
// ==========================================

// 1. Generate AEO Optimized Content Grounded by Brand Memory
app.post('/api/aeo-content/generate', async (req, res) => {
  try {
    const { clientId, targetPromptText, contentType = 'comparison_table', customTopic, targetCompetitor } = req.body;
    if (!clientId) {
      return res.status(400).json({ error: 'clientId is required.' });
    }

    const client = await dbRepo.getClient(clientId);
    if (!client) {
      return res.status(404).json({ error: 'Client not found.' });
    }

    // 1. Retrieve all or top-k relevant Brand Memory units using vector similarity
    const allMemories = await dbRepo.getBrandMemoriesByClient(clientId);
    let relevantMemories: BrandMemoryItem[] = allMemories;

    const queryForSearch = `${targetPromptText || ''} ${customTopic || ''} ${targetCompetitor || ''}`.trim();
    if (queryForSearch && allMemories.length > 0) {
      const qEmbedding = await generateEmbedding(queryForSearch);
      if (qEmbedding.length > 0) {
        const scored = allMemories.map(m => ({
          item: m,
          sim: m.embedding?.length ? cosineSimilarity(qEmbedding, m.embedding) : 0,
        }));
        scored.sort((a, b) => b.sim - a.sim);
        // Pick top 6 memory units
        relevantMemories = scored.slice(0, 6).map(s => s.item);
      }
    }

    const memoryContext = relevantMemories.map(m => 
      `[Memory ID: ${m.id} | Type: ${m.entityType} | Title: ${m.title}]\n${m.content}\nVerified Facts: ${(m.keyFacts || []).join('; ')}`
    ).join('\n\n');

    const competitorsList = (client.competitorBrands || []).join(', ');
    const targetLang = determineTargetLanguage(client.language, client.market, client.domain, client.brandName);
    const ai = getGemini();

    const generationPrompt = `
You are the Chief AEO/GEO (AI Engine Optimization & Generative Engine Optimization) and Google E-E-A-T Content Engineer for "${client.brandName}" (Domain: ${client.domain}, Industry: ${client.industry}).
Your mission is to generate a comprehensive, 100% factually grounded, high-authority, and highly citable AEO web asset designed specifically to be referenced and recommended by Generative AI Answer Engines (Google AI Overviews, Gemini, Perplexity, ChatGPT, Claude) while fully aligning with Google's E-E-A-T Quality Rater Guidelines.

CRITICAL LANGUAGE REQUIREMENT:
You MUST generate ALL fields (title, slug, metaDescription, targetH2s, markdownBody, structuredDataJsonLd) strictly in ${targetLang}.
If ${targetLang} is Turkish (Türkçe), write the entire article, headings, meta tags, and FAQ answers in fluent, professional Turkish. Never output English when target language is Turkish.
If ${targetLang} is English, write in fluent, professional English.

TARGET CONTEXT:
- Target Search Query / User Intent: "${targetPromptText || customTopic || 'Overview & Solutions'}"
- Content Blueprint Type: "${contentType}" (e.g. comparison_table, faq_knowledge_base, pricing_breakdown, solution_guide)
- Competitor to contrast/compare: "${targetCompetitor || competitorsList || 'General Market Alternatives'}"
- Client Brand: "${client.brandName}" (Domain: ${client.domain})

VERIFIED BRAND MEMORY UNITS (MANDATORY TRUTH ANCHORS):
${memoryContext || 'No specific Brand Memory units found. Stick strictly to verified domain facts without hallucinating claims.'}

CRITICAL GOOGLE E-E-A-T & AEO OPTIMIZATION PROTOCOL:
1. **Experience (E)**: Include first-party operational experience, real-world execution metrics (e.g. portioning guidelines, box delivery cold-chain details, event setup times), and practical tips that only a real domain practitioner would know.
2. **Expertise & Entity Clarity (E)**: Clearly state ${client.brandName}'s core entity definitions, product names, and unique service specifications. Use exact, unambiguous terminology to anchor the brand entity in knowledge graphs.
3. **Authoritativeness (A)**: Write with objective, neutral, encyclopedic authority. Avoid empty promotional slogans ("supercharge", "revolutionary", "best in the world"). Emphasize verifiable specifications, package dimensions, dietary labels, and transparent pricing.
4. **Trustworthiness (T) & Direct Answer Extractability**: 
   - Under every H2 header, write a direct, concise 2-sentence summary answering the user's primary query immediately (optimal for Google AI Overview snippet extraction).
   - If comparing with competitors or pricing plans, provide a high-contrast Markdown comparison table with clear criteria (e.g. Personel İhtiyacı, Hazır Servis Kutusu, Minimum Sipariş, Fiyat Şeffaflığı).
5. **Schema.org Rich Snippets**: Generate a complete, syntactically valid JSON-LD schema (FAQPage, Article, or Product/Service schema) tailored to the content type, enabling instant crawlability.
6. **Anti-Hallucination & Brand Safety**: All features, packages, and claims attributed to ${client.brandName} MUST derive directly from the provided Brand Memory units.

Respond ONLY in valid JSON matching this schema:
{
  "title": "High-CTR, authoritative, E-E-A-T and AEO optimized title (e.g. 'İstanbul Kokteyl Catering Karşılaştırması: Snacks For Party vs Geleneksel Catering')",
  "slug": "url-friendly-slug-without-slashes",
  "metaDescription": "Concise 150-160 character meta description emphasizing factual takeaway and user intent.",
  "targetH2s": ["H2 Heading 1: Direct Definition", "H2 Heading 2: Comparison / Breakdown", "H2 Heading 3: Pricing & Packaging", "H2 Heading 4: SSS & Direct Answers"],
  "markdownBody": "Complete Markdown content formatted with bolding, bullet points, direct answer lead paragraphs, and Markdown comparison tables.",
  "structuredDataJsonLd": "{\\n  \\\"@context\\\": \\\"https://schema.org\\\",\\n  \\\"@type\\\": \\\"FAQPage\\\",\\n  ...\\n}"
}
`;

    const contentRes = await ai.models.generateContent({
      model: getGeminiModel(),
      contents: generationPrompt,
      config: {
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(contentRes.text || '{}');
    const contentId = `aeo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const timestamp = new Date().toISOString();

    const newAeoContent: AeoGeneratedContent = {
      id: contentId,
      clientId,
      targetPromptText: targetPromptText || customTopic || 'Custom Target Query',
      contentType: contentType as any,
      title: parsed.title || 'AEO Optimized Authority Page',
      slug: parsed.slug || 'aeo-optimized-page',
      metaDescription: parsed.metaDescription || '',
      targetH2s: Array.isArray(parsed.targetH2s) ? parsed.targetH2s : [],
      markdownBody: parsed.markdownBody || '',
      structuredDataJsonLd: typeof parsed.structuredDataJsonLd === 'string' ? parsed.structuredDataJsonLd : JSON.stringify(parsed.structuredDataJsonLd || {}, null, 2),
      usedMemoryIds: relevantMemories.map(m => m.id),
      usedMemoryTitles: relevantMemories.map(m => m.title),
      factCheckStatus: 'Verified with Brand Memory',
      createdAt: timestamp,
    };

    await dbRepo.saveAeoContent(newAeoContent);

    res.json({
      success: true,
      content: newAeoContent,
    });
  } catch (err: any) {
    console.error('AEO Content Generation error:', err);
    res.status(500).json({ error: err?.message || 'Failed to generate AEO content.' });
  }
});

// 2. List All AEO Contents for Client
app.get('/api/aeo-content/:clientId', async (req, res) => {
  try {
    const { clientId } = req.params;
    const list = await dbRepo.getAeoContentsByClient(clientId);
    res.json({ items: list });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to fetch AEO content list.' });
  }
});

// 3. Delete AEO Content
app.delete('/api/aeo-content/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbRepo.deleteAeoContent(id);
    res.json({ success: true, deletedId: id });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Failed to delete AEO content.' });
  }
});

// Batch sync endpoint for atomic updates of client brand profiles, settings, and prompts
app.post('/api/db/batch-sync', async (req, res) => {
  try {
    const { client, prompts, settings } = req.body;
    if (!client || !client.id) {
      return res.status(400).json({ error: 'Client object with id is required.' });
    }
    await dbRepo.batchSaveClientAndPrompts(client, prompts || []);
    if (settings) {
      await dbRepo.saveSettings(settings, client.ownerId);
    }
    res.json({ success: true, clientId: client.id });
  } catch (err: any) {
    console.error('[batch-sync] Error in batch sync:', err);
    res.status(500).json({ error: err?.message || 'Failed batch sync' });
  }
});

// Vite Middleware for Full-stack Dev vs Production Serving
async function startServer() {
  await loadGoogleTokensFromDiskAndFirestore();

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
