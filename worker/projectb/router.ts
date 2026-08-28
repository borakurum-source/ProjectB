import type { ProjectBEnv } from "./env";
import { notFound } from "./http";
import { health } from "./routes/health";
import { handleDataRequest } from "./routes/data";
import { handleAuthRequest } from "./routes/auth";
import { handleAnalysisRequest } from "./routes/analysis";
import { handleRunsRequest } from "./routes/runs";
import { handleMemoryRequest } from "./routes/memory";
import { handleAeoRequest } from "./routes/aeo";
import { handleGoogleRequest } from "./routes/google";
import { handleMcpRequest } from "./routes/mcp";

export interface ProjectBContext {
  waitUntil(promise: Promise<unknown>): void;
}

export async function handleApiRequest(
  request: Request,
  _env: ProjectBEnv,
  _ctx: ProjectBContext,
): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (request.method === "GET" && pathname === "/api/health") {
    return health(_env);
  }
  if (pathname.startsWith("/api/auth/google/") || pathname === "/api/auth/google/callback" || pathname.startsWith("/api/integrations/google/") || pathname.startsWith("/api/integrations/gsc/") || pathname.startsWith("/api/integrations/ga4/")) {
    return handleGoogleRequest(request, _env);
  }
  if (pathname.startsWith("/api/auth/")) {
    return handleAuthRequest(request, _env);
  }
  if (pathname.startsWith("/api/db/")) {
    return handleDataRequest(request, _env);
  }
  if (pathname.startsWith("/api/firecrawl/") || pathname.startsWith("/api/gemini/") || pathname.startsWith("/api/url/") || pathname.startsWith("/api/pages/") || pathname.startsWith("/api/prompts/") || pathname.startsWith("/api/client/") || pathname.startsWith("/api/diagnostics/")) {
    return handleAnalysisRequest(request, _env);
  }
  if (pathname.startsWith("/api/runs/")) {
    return handleRunsRequest(request, _env, _ctx.waitUntil.bind(_ctx));
  }
  if (pathname.startsWith("/api/brand-memory/")) {
    return handleMemoryRequest(request, _env);
  }
  if (pathname.startsWith("/api/aeo-content/")) {
    return handleAeoRequest(request, _env);
  }
  if (pathname.startsWith("/api/mcp/")) {
    return handleMcpRequest(request, _env);
  }
  return notFound();
}
