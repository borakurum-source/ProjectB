import { json } from "../http";
import type { ProjectBEnv } from "../env";

export function health(env: ProjectBEnv = {}): Response {
  return json(200, {
    ok: true,
    service: "ragsignal",
    firecrawlApiKeyConfigured: Boolean(env.FIRECRAWL_API_KEY),
    geminiConfigured: Boolean(env.GEMINI_API_KEY),
    geminiModel: "gemini-2.5-flash",
  });
}
