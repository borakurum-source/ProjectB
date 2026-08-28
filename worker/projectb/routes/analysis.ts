import { requireInternalUser } from "../auth";
import { assertOwnedClient, createSql } from "../db";
import type { ProjectBEnv } from "../env";
import { json, notFound } from "../http";
import { callFirecrawl, callGemini, isResponse, parseJsonObject, providerFailure, validHttpUrl } from "../providers";
import { buildDiagnosticPrompt, buildFanoutPrompt, buildMentionExtractionPrompt, buildProfilePrompt, buildPromptDiscoveryPrompt } from "../prompts";

type Payload = Record<string, unknown>;

async function body(request: Request): Promise<Payload> {
  const value = await request.json();
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid JSON body");
  return value as Payload;
}

function invalid(message: string): Response {
  return json(400, { error: message });
}

function identifier(value: unknown): string | undefined {
  return typeof value === "string" && /^[a-zA-Z0-9_-]{1,160}$/.test(value) ? value : undefined;
}

function clientFrom(payload: Payload): Payload | undefined {
  const client = payload.client;
  return client && typeof client === "object" && !Array.isArray(client) ? client as Payload : undefined;
}

function clientSummary(client: Payload | undefined): string {
  if (!client) return "";
  return ["brandName", "domain", "industry", "market", "language", "positioning", "targetAudience", "productsServices", "competitorBrands"]
    .map((key) => `${key}: ${typeof client[key] === "string" ? client[key] : JSON.stringify(client[key] ?? "")}`)
    .join("\n");
}

async function geminiJson(env: ProjectBEnv, prompt: string): Promise<Payload | Response> {
  const text = await callGemini(env, prompt, { json: true });
  if (isResponse(text)) return text;
  const value = parseJsonObject(text);
  return value ?? providerFailure(new Error("Gemini returned invalid JSON"));
}

export async function firecrawlSearch(request: Request, env: ProjectBEnv): Promise<Response> {
  try {
    const payload = await body(request);
    const query = typeof payload.query === "string" ? payload.query.trim() : "";
    if (!query || query.length > 500) return invalid("A valid query is required");
    const result = await callFirecrawl(env, "/v2/search", { query, limit: Math.min(Number(payload.limit) || 5, 10), ...(payload.scrapeOptions ? { scrapeOptions: payload.scrapeOptions } : {}) });
    return isResponse(result) ? result : json(200, result);
  } catch (error) {
    return providerFailure(error);
  }
}

async function firecrawlUrl(request: Request, env: ProjectBEnv, path: "/v2/scrape" | "/v2/map"): Promise<Response> {
  try {
    const payload = await body(request);
    const url = validHttpUrl(payload.url);
    if (!url) return invalid("A valid http(s) URL is required");
    const result = await callFirecrawl(env, path, path === "/v2/scrape"
      ? { url, formats: Array.isArray(payload.formats) ? payload.formats.slice(0, 4) : ["markdown"] }
      : { url, limit: Math.min(Number(payload.limit) || 50, 200) });
    return isResponse(result) ? result : json(200, result);
  } catch (error) {
    return providerFailure(error);
  }
}

async function fetchPage(request: Request): Promise<Response> {
  try {
    const payload = await body(request);
    const url = validHttpUrl(payload.url);
    if (!url) return invalid("A valid http(s) URL is required");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { signal: controller.signal, redirect: "follow", headers: { "user-agent": "RAGSIGNAL/1.0 (+internal analysis)" } });
      const html = (await response.text()).slice(0, 500_000);
      return json(200, { url: response.url, status: response.status, html, xRobotsTag: response.headers.get("X-Robots-Tag") ?? "" });
    } finally {
      clearTimeout(timeout);
    }
  } catch (error) {
    return providerFailure(error);
  }
}

async function robotsTxtStatus(pageUrl: string): Promise<"allowed" | "blocked" | "unknown"> {
  try {
    const origin = new URL(pageUrl).origin;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5_000);
    try {
      const response = await fetch(`${origin}/robots.txt`, { signal: controller.signal, redirect: "follow", headers: { "user-agent": "RAGSIGNAL/1.0 (+internal analysis)" } });
      if (!response.ok) return "unknown";
      const lines = (await response.text()).split(/\r?\n/).map((line) => line.trim().toLowerCase());
      let wildcard = false;
      let blocked = false;
      for (const line of lines) {
        if (line.startsWith("user-agent:")) wildcard = line.slice("user-agent:".length).trim() === "*";
        else if (wildcard && line.startsWith("disallow:")) {
          const path = line.slice("disallow:".length).trim();
          if (path === "/") blocked = true;
        } else if (line && !line.startsWith("#") && !line.startsWith("allow:") && !line.startsWith("disallow:")) {
          wildcard = false;
        }
      }
      return blocked ? "blocked" : "allowed";
    } finally { clearTimeout(timeout); }
  } catch { return "unknown"; }
}

export const pageAnalysisStatuses = ["Strong", "Adequate", "Weak", "Missing", "Unknown"] as const;

export function isValidPageAnalysis(value: Payload): boolean {
  return Boolean(
    identifier(value.id) &&
    identifier(value.clientId) &&
    validHttpUrl(value.url) &&
    pageAnalysisStatuses.includes(value.extractabilityStatus as typeof pageAnalysisStatuses[number]) &&
    pageAnalysisStatuses.includes(value.entityClarityStatus as typeof pageAnalysisStatuses[number]) &&
    Array.isArray(value.detectedSchemaTypes) &&
    Array.isArray(value.findings),
  );
}

function textContent(value: string): string {
  return value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

export function pageSignals(html: string) {
  const h1 = textContent(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
  const h2Count = (html.match(/<h2\b/gi) ?? []).length;
  const headingAnswers = [...html.matchAll(/<h2\b[^>]*>[\s\S]*?<\/h2>([\s\S]*?)(?=<h2\b|$)/gi)]
    .map((match) => textContent(match[1]).slice(0, 500)).filter((answer) => answer.length >= 30);
  const schema = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => match[1]).filter(Boolean);
  const schemaTypes = schema.flatMap((entry) => {
    try {
      const parsed = JSON.parse(entry) as Payload | Payload[];
      const values = Array.isArray(parsed) ? parsed : [parsed];
      return values.flatMap((item) => {
        const graph = Array.isArray(item?.["@graph"]) ? item["@graph"] as Payload[] : [];
        return [item, ...graph].flatMap((node) => typeof node?.["@type"] === "string" ? [node["@type"]] : Array.isArray(node?.["@type"]) ? node["@type"].map(String) : []);
      });
    } catch { return []; }
  });
  const visibleText = textContent(html);
  return {
    h1,
    h2Count,
    schemaTypes: [...new Set(schemaTypes)],
    hasComparisonTable: /<table\b/i.test(html),
    hasClearHeadingAnswers: headingAnswers.length > 0,
    contentLength: visibleText.length,
  };
}

async function pageCheck(request: Request, mode: "crawlability" | "schema"): Promise<Response> {
  const fetched = await fetchPage(request);
  if (!fetched.ok) return fetched;
  const value = await fetched.json() as Payload;
  const html = String(value.html ?? "");
  if (mode === "schema") {
    const signals = pageSignals(html);
    return json(200, { url: value.url, hasSchema: signals.schemaTypes.length > 0, schemaTypes: signals.schemaTypes, rawJsonLdCount: (html.match(/application\/ld\+json/gi) ?? []).length });
  }
  const metaBlocked = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*(noindex|none)/i.test(html);
  const headerBlocked = /(?:noindex|none)/i.test(String(value.xRobotsTag ?? ""));
  const robotsStatus = await robotsTxtStatus(String(value.url));
  const blocked = metaBlocked || headerBlocked || robotsStatus === "blocked";
  return json(200, { url: value.url, status: value.status, crawlable: Number(value.status) < 400 && !blocked, robotsBlocked: blocked, metaRobotsBlocked: metaBlocked, xRobotsTag: value.xRobotsTag ?? "", robotsTxt: robotsStatus, contentLength: html.length });
}

async function analyzePage(request: Request, env: ProjectBEnv, ownerId: string): Promise<Response> {
  const payload = await body(request);
  const url = validHttpUrl(payload.url);
  const client = clientFrom(payload);
  const clientId = identifier(client?.id ?? payload.clientId);
  if (!url || !clientId) return invalid("A valid URL and client id are required");
  try { await assertOwnedClient(createSql(env), ownerId, clientId); } catch { return json(404, { error: "Client not found" }); }
  let html = typeof payload.rawHtml === "string" ? payload.rawHtml.slice(0, 500_000) : "";
  if (!html) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(url, { signal: controller.signal, redirect: "follow", headers: { "user-agent": "RAGSIGNAL/1.0 (+internal analysis)" } });
      if (!response.ok) return json(502, { error: `Page fetch failed with HTTP ${response.status}` });
      html = (await response.text()).slice(0, 500_000);
    } finally { clearTimeout(timeout); }
  }
  const signals = pageSignals(html);
  const extractabilityStatus = signals.contentLength === 0
    ? "Unknown"
    : signals.h1 && signals.schemaTypes.length > 0 && signals.hasClearHeadingAnswers
      ? "Strong"
      : signals.h1 && (signals.schemaTypes.length > 0 || signals.hasClearHeadingAnswers || signals.hasComparisonTable)
        ? "Adequate"
        : signals.h1 || signals.schemaTypes.length > 0 || signals.hasComparisonTable
          ? "Weak"
          : "Missing";
  const entityClarityStatus = signals.h1 && signals.schemaTypes.length > 0 ? "Strong" : signals.h1 ? "Adequate" : "Missing";
  const findings = [
    { dimension: "Entity Clarity", observation: signals.h1 ? `H1: ${signals.h1}` : "No descriptive H1 was detected.", concreteSuggestion: signals.h1 ? "Keep the primary entity name in the H1 and page title." : "Add one descriptive H1 naming the entity and its primary offering." },
    { dimension: "Structured Information", observation: signals.schemaTypes.length ? `Detected JSON-LD: ${signals.schemaTypes.join(", ")}` : "No JSON-LD schema was detected.", concreteSuggestion: signals.schemaTypes.length ? "Validate schema fields and keep them aligned with visible page content." : "Add Organization/Product/FAQPage JSON-LD only where it matches visible content." },
    { dimension: "Answer Extractability", observation: signals.hasClearHeadingAnswers ? "At least one H2 is followed by a substantive answer block." : "No substantive H2 answer block was detected.", concreteSuggestion: signals.hasClearHeadingAnswers ? "Keep direct answers immediately below question-style headings." : "Add question-style H2 headings followed by 1–3 factual sentences." },
    { dimension: "Content Coverage", observation: signals.hasComparisonTable ? "A semantic HTML table was detected." : "No semantic comparison table was detected.", concreteSuggestion: signals.hasComparisonTable ? "Label table headers and keep values machine-readable." : "Add a semantic comparison table when the page answers comparative prompts." },
  ];
  const analysis = {
    id: crypto.randomUUID(), clientId, url, analyzedAt: new Date().toISOString(),
    extractabilityStatus,
    hasSchemaMarkup: signals.schemaTypes.length > 0, hasStructuredSchema: signals.schemaTypes.length > 0,
    detectedSchemaTypes: signals.schemaTypes, hasComparisonTables: signals.hasComparisonTable, hasComparisonTable: signals.hasComparisonTable,
    hasClearHeadingAnswers: signals.hasClearHeadingAnswers, entityClarityStatus,
    actionableRecommendations: [!signals.h1 && "Add a descriptive H1.", !signals.schemaTypes.length && "Add relevant JSON-LD structured data.", signals.h2Count < 2 && "Use clear question-and-answer H2 sections."].filter(Boolean),
    contentLength: signals.contentLength, h1: signals.h1, h2Count: signals.h2Count, findings,
  };
  if (!isValidPageAnalysis(analysis)) return json(500, { error: "Page analysis validation failed" });
  try {
    const sql = createSql(env);
    await sql`insert into page_analyses (id, owner_id, client_id, url, analyzed_at, extractability_score, extractability_status, has_schema_markup, has_structured_schema, detected_schema_types, has_comparison_tables, has_comparison_table, has_clear_heading_answers, entity_clarity_status, actionable_recommendations, content_length, h1, h2_count, findings) values (${analysis.id}, ${ownerId}, ${clientId}, ${url}, now(), null, ${analysis.extractabilityStatus}, ${analysis.hasSchemaMarkup}, ${analysis.hasStructuredSchema}, ${JSON.stringify(analysis.detectedSchemaTypes)}::jsonb, ${analysis.hasComparisonTables}, ${analysis.hasComparisonTable}, ${analysis.hasClearHeadingAnswers}, ${analysis.entityClarityStatus}, ${JSON.stringify(analysis.actionableRecommendations)}::jsonb, ${analysis.contentLength}, ${analysis.h1}, ${analysis.h2Count}, ${JSON.stringify(analysis.findings)}::jsonb)`;
  } catch (error) { return providerFailure(error); }
  return json(200, { analysis });
}

async function promptDiscovery(request: Request, env: ProjectBEnv, variant: "discover" | "opportunities"): Promise<Response> {
  const payload = await body(request); const client = clientFrom(payload) ?? payload;
  if (!String(client.brandName ?? "").trim()) return invalid("brandName is required");
  const result = await geminiJson(env, buildPromptDiscoveryPrompt({ variant, client: clientSummary(client) }));
  if (isResponse(result)) return result;
  const prompts = Array.isArray(result.prompts) ? result.prompts.filter((item) => item && typeof item === "object").slice(0, 20) : [];
  return json(200, { prompts, ...(variant === "discover" ? { discoveredPrompts: prompts } : {}) });
}

async function extractMentions(request: Request, env: ProjectBEnv): Promise<Response> {
  const payload = await body(request);
  const answer = typeof payload.answerText === "string" ? payload.answerText.slice(0, 25_000) : "";
  if (!answer) return invalid("answerText is required");
  const result = await geminiJson(env, buildMentionExtractionPrompt({ answer, brand: String(payload.clientBrand ?? ""), aliases: payload.clientAliases ?? [], competitors: payload.competitorBrands ?? [] }));
  return isResponse(result) ? result : json(200, result);
}

async function profile(request: Request, env: ProjectBEnv): Promise<Response> {
  const payload = await body(request);
  const domain = validHttpUrl(String(payload.domain ?? "").includes("://") ? payload.domain : `https://${String(payload.domain ?? "")}`);
  if (!String(payload.brandName ?? "").trim() || !domain) return invalid("brandName and domain are required");
  const result = await geminiJson(env, buildProfilePrompt({ brandName: String(payload.brandName), domain, industry: String(payload.industry ?? ""), market: String(payload.market ?? ""), language: String(payload.language ?? "") }));
  return isResponse(result) ? result : json(200, { profile: result });
}

async function fanout(request: Request, env: ProjectBEnv): Promise<Response> {
  const payload = await body(request); const prompt = typeof payload.prompt === "string" ? payload.prompt.trim() : "";
  if (!prompt) return invalid("prompt is required");
  const result = await geminiJson(env, buildFanoutPrompt(prompt));
  return isResponse(result) ? result : json(200, result);
}

async function diagnostic(request: Request, env: ProjectBEnv): Promise<Response> {
  const payload = await body(request); const prompt = payload.prompt;
  if (!prompt || typeof prompt !== "object") return invalid("prompt is required");
  const result = await geminiJson(env, buildDiagnosticPrompt({ client: clientSummary(clientFrom(payload)), prompt: JSON.stringify(prompt), runs: Array.isArray(payload.runs) ? payload.runs.slice(0, 50) : [] }));
  return isResponse(result) ? result : json(200, result);
}

export async function handleAnalysisRequest(request: Request, env: ProjectBEnv): Promise<Response> {
  const user = await requireInternalUser(request, env); if (user instanceof Response) return user;
  const path = new URL(request.url).pathname;
  if (request.method !== "POST") return notFound();
  if (path === "/api/firecrawl/search") return firecrawlSearch(request, env);
  if (path === "/api/firecrawl/scrape") return firecrawlUrl(request, env, "/v2/scrape");
  if (path === "/api/firecrawl/map") return firecrawlUrl(request, env, "/v2/map");
  if (path === "/api/url/fetch") return fetchPage(request);
  if (path === "/api/pages/check-crawlability") return pageCheck(request, "crawlability");
  if (path === "/api/pages/check-schema") return pageCheck(request, "schema");
  if (path === "/api/pages/analyze") return analyzePage(request, env, user.id);
  if (path === "/api/prompts/discover") return promptDiscovery(request, env, "discover");
  if (path === "/api/gemini/opportunities") return promptDiscovery(request, env, "opportunities");
  if (path === "/api/gemini/extract") return extractMentions(request, env);
  if (path === "/api/client/generate-profile") return profile(request, env);
  if (path === "/api/prompts/fanout") return fanout(request, env);
  if (path === "/api/diagnostics/generate") return diagnostic(request, env);
  return notFound();
}
