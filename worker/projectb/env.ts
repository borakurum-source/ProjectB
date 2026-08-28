export interface ProjectBEnv {
  DATABASE_URL?: string;
  NEON_AUTH_URL?: string;
  INTERNAL_EMAIL_ALLOWLIST?: string;
  TOKEN_ENCRYPTION_KEY?: string;
  GEMINI_API_KEY?: string;
  PERPLEXITY_API_KEY?: string;
  FIRECRAWL_API_KEY?: string;
  GOOGLE_CLIENT_ID?: string;
  GOOGLE_CLIENT_SECRET?: string;
  APP_URL?: string;
}

export function requiredEnv(
  env: ProjectBEnv,
  key: keyof ProjectBEnv,
): string {
  const value = env[key];
  if (!value) {
    throw new Error(`${key} is not configured`);
  }
  return value;
}
