import type { ProjectBEnv } from "./env";
import { json } from "./http";
import { buildMentionExtractionPrompt, RAGSIGNAL_SYSTEM_INSTRUCTION } from "./prompts";

const PROVIDER_TIMEOUT_MS = 25_000;

type ProviderName = "Firecrawl" | "Gemini" | "Perplexity";

class ProviderHttpError extends Error {
  constructor(
    readonly provider: ProviderName,
    readonly status: number,
  ) {
    super(`${provider} returned HTTP ${status}`);
    this.name = "ProviderHttpError";
  }
}

function providerErrorMessage(error: unknown): string {
  if (!(error instanceof ProviderHttpError)) return "Provider request failed";
  const { provider, status } = error;
  if (provider === "Gemini") {
    if (status === 401 || status === 403) return "Gemini API key was rejected. Update the Gemini API key in Site settings.";
    if (status === 429) return "Gemini quota or rate limit reached. Try again shortly.";
    if (status >= 500) return "Gemini is temporarily unavailable. Try again shortly.";
    if (status === 400) return "Gemini rejected the request (HTTP 400). Check the API key and request format.";
  }
  if (provider === "Firecrawl") {
    if (status === 401 || status === 403) return "Firecrawl API key was rejected. Update the Firecrawl API key in Site settings.";
    if (status === 429) return "Firecrawl quota or rate limit reached. Try again shortly.";
    if (status >= 500) return "Firecrawl is temporarily unavailable. Try again shortly.";
  }
  return `${provider} request failed (HTTP ${status}).`;
}

export function providerFailure(error: unknown): Response {
  // Provider responses often include request details. Never pass them to the browser.
  const message = providerErrorMessage(error);
  if (error instanceof ProviderHttpError) {
    console.warn(`[${error.provider}] request failed with HTTP ${error.status}`);
  }
  return json(502, { error: message });
}

export function providerUnavailable(name: ProviderName): Response {
  return json(503, { error: `${name} is not configured` });
}

export function validHttpUrl(value: unknown): string | undefined {
  if (typeof value !== "string" || value.length > 2_000) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : undefined;
  } catch {
    return undefined;
  }
}

export async function requestJson(
  input: string,
  init: RequestInit,
  provider?: ProviderName,
): Promise<Record<string, unknown>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const response = await fetch(input, { ...init, signal: controller.signal });
    if (!response.ok) throw new ProviderHttpError(provider ?? "Gemini", response.status);
    const payload = await response.json();
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      throw new Error("Provider returned an invalid response");
    }
    return payload as Record<string, unknown>;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callFirecrawl(
  env: ProjectBEnv,
  path: "/v2/search" | "/v2/scrape" | "/v2/map",
  payload: Record<string, unknown>,
): Promise<Record<string, unknown> | Response> {
  const firecrawlKey = env.FIRECRAWL_API_KEY?.trim();
  if (!firecrawlKey) return providerUnavailable("Firecrawl");
  try {
    return await requestJson(`https://api.firecrawl.dev${path}`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${firecrawlKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(payload),
    }, "Firecrawl");
  } catch (error) {
    return providerFailure(error);
  }
}

function textFromGemini(payload: Record<string, unknown>): string {
  const candidates = Array.isArray(payload.candidates) ? payload.candidates : [];
  const content = candidates[0] && typeof candidates[0] === "object"
    ? (candidates[0] as Record<string, unknown>).content
    : undefined;
  const parts = content && typeof content === "object" && Array.isArray((content as Record<string, unknown>).parts)
    ? (content as Record<string, unknown>).parts as unknown[]
    : [];
  return parts.map((part) => part && typeof part === "object" ? String((part as Record<string, unknown>).text ?? "") : "").join("\n").trim();
}

export async function callGemini(
  env: ProjectBEnv,
  prompt: string,
  options: { json?: boolean; temperature?: number; systemInstruction?: string; responseSchema?: Record<string, unknown> } = {},
): Promise<string | Response> {
  const geminiKey = env.GEMINI_API_KEY?.trim();
  if (!geminiKey) return providerUnavailable("Gemini");
  try {
    const payload = await requestJson(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: options.systemInstruction ?? RAGSIGNAL_SYSTEM_INSTRUCTION }] },
          contents: [{ role: "user", parts: [{ text: prompt.slice(0, 40_000) }] }],
          generationConfig: {
            temperature: options.temperature ?? 0.2,
            ...(options.json ? { responseMimeType: "application/json" } : {}),
            ...(options.responseSchema ? { responseSchema: options.responseSchema } : {}),
          },
        }),
      },
      "Gemini",
    );
    const text = textFromGemini(payload);
    if (!text) throw new Error("Gemini returned no text");
    return text;
  } catch (error) {
    return providerFailure(error);
  }
}

export const structuredExtractionSchema: Record<string, unknown> = {
  type: "object",
  properties: {
    mentionedBrands: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          isClient: { type: "boolean" },
          isKnownCompetitor: { type: "boolean" },
          sentiment: { type: "string", enum: ["Positive", "Neutral", "Negative"] },
          verbatimQuote: { type: "string" },
        },
        required: ["name", "isClient", "isKnownCompetitor", "sentiment", "verbatimQuote"],
      },
    },
    orderedList: { type: "boolean" },
    rankedNames: { type: "array", items: { type: "string" } },
    recommendedEntityType: { type: "string" },
    answerFormat: { type: "string", enum: ["list", "prose", "table", "steps"] },
  },
  required: ["mentionedBrands", "orderedList", "rankedNames", "answerFormat"],
};

export async function callStructuredGemini(
  env: ProjectBEnv,
  input: { answerText: string; clientBrand: string; clientAliases: string[]; competitorBrands: string[] },
): Promise<string | Response> {
  return callGemini(
    env,
    buildMentionExtractionPrompt({
      answer: input.answerText,
      brand: input.clientBrand,
      aliases: input.clientAliases,
      competitors: input.competitorBrands,
    }),
    { json: true, responseSchema: structuredExtractionSchema },
  );
}

export interface GroundedGeminiResult {
  answerText: string;
  groundingSources: Array<{ uri?: string; redirectUri?: string; displayTitle: string; resolvedDomain: string | null }>;
  groundingChunks: unknown[];
  webSearchQueries: string[];
}

function publisherDomain(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) return null;
  const match = text.match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9-]+(?:\.[a-z0-9-]+)+)(?:[/:?#\s]|$)/i);
  return match ? match[1].toLowerCase().replace(/^www\./, "") : null;
}

export async function callGroundedGemini(env: ProjectBEnv, prompt: string): Promise<GroundedGeminiResult | Response> {
  const geminiKey = env.GEMINI_API_KEY?.trim();
  if (!geminiKey) return providerUnavailable("Gemini");
  try {
    const payload = await requestJson(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": geminiKey },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt.slice(0, 30_000) }] }],
          tools: [{ googleSearch: {} }],
          generationConfig: { temperature: 0.2 },
        }),
      },
      "Gemini",
    );
    const candidate = Array.isArray(payload.candidates) && payload.candidates[0] && typeof payload.candidates[0] === "object"
      ? payload.candidates[0] as Record<string, unknown> : {};
    const grounding = candidate.groundingMetadata && typeof candidate.groundingMetadata === "object"
      ? candidate.groundingMetadata as Record<string, unknown> : {};
    const chunks = Array.isArray(grounding.groundingChunks) ? grounding.groundingChunks : [];
    const sources = chunks.map((chunk) => {
      const web = chunk && typeof chunk === "object" && (chunk as Record<string, unknown>).web && typeof (chunk as Record<string, unknown>).web === "object"
        ? (chunk as Record<string, unknown>).web as Record<string, unknown> : {};
      const uri = typeof web.uri === "string" ? web.uri : undefined;
      const displayTitle = String(web.title ?? "Source");
      const resolvedDomain = publisherDomain(web.domain) || publisherDomain(web.title);
      return { uri, redirectUri: typeof web.uri === "string" ? web.uri : undefined, displayTitle, resolvedDomain };
    });
    const answerText = textFromGemini(payload);
    if (!answerText) throw new Error("Gemini returned no text");
    return { answerText, groundingSources: sources, groundingChunks: chunks, webSearchQueries: Array.isArray(grounding.webSearchQueries) ? grounding.webSearchQueries.map(String) : [] };
  } catch (error) {
    return providerFailure(error);
  }
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}

export function parseJsonObject(text: string): Record<string, unknown> | undefined {
  try {
    const value = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ""));
    return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
  } catch {
    return undefined;
  }
}
