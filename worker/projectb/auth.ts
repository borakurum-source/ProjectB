import type { ProjectBEnv } from "./env";
import { json } from "./http";

export interface InternalUser {
  id: string;
  email: string;
  displayName?: string;
}

export interface AuthSession {
  user?: {
    id?: string;
    email?: string;
    name?: string;
  };
}

export type SessionResolver = (
  request: Request,
  env: Pick<ProjectBEnv, "NEON_AUTH_URL">,
) => Promise<AuthSession | null>;

function normalizedEmails(value: string | undefined): Set<string> {
  return new Set(
    (value ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
}

function getSitesUser(request: Request): InternalUser | null {
  const email = request.headers.get("oai-authenticated-user-email")?.trim().toLowerCase();
  if (!email) return null;
  const fullName = request.headers.get("oai-authenticated-user-full-name");
  return { id: `site:${email}`, email, displayName: fullName ?? email };
}

export const getNeonSession: SessionResolver = async (request, env) => {
  if (!env.NEON_AUTH_URL) return null;
  const response = await fetch(`${env.NEON_AUTH_URL.replace(/\/$/, "")}/api/auth/get-session`, {
    headers: {
      cookie: request.headers.get("cookie") ?? "",
    },
  });
  if (!response.ok) return null;
  return response.json() as Promise<AuthSession>;
};

export async function requireInternalUser(
  request: Request,
  env: Pick<ProjectBEnv, "NEON_AUTH_URL" | "INTERNAL_EMAIL_ALLOWLIST">,
  getSession: SessionResolver = getNeonSession,
): Promise<InternalUser | Response> {
  const sitesUser = getSitesUser(request);
  // Sites verifies the identity header. The explicit runtime allowlist then
  // narrows that Site access to one designated ChatGPT account.
  if (sitesUser) {
    if (!normalizedEmails(env.INTERNAL_EMAIL_ALLOWLIST).has(sitesUser.email)) {
      return json(403, { error: "Access denied" });
    }
    return sitesUser;
  }
  const session = await getSession(request, env);
  const id = sitesUser?.id ?? session?.user?.id;
  const email = sitesUser?.email ?? session?.user?.email?.trim().toLowerCase();
  if (!id || !email) {
    return json(401, { error: "Authentication required" });
  }
  if (!normalizedEmails(env.INTERNAL_EMAIL_ALLOWLIST).has(email)) {
    return json(403, { error: "Access denied" });
  }
  return {
    id,
    email,
    displayName: sitesUser?.displayName ?? session?.user?.name,
  };
}
