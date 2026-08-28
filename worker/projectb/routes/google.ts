import { requireInternalUser } from "../auth";
import { camelize, createSql } from "../db";
import type { ProjectBEnv } from "../env";
import { json, notFound } from "../http";
import { decryptSecret, encryptSecret, signGoogleState, verifyGoogleState } from "../crypto";

type Row = Record<string, unknown>;
const scopes = ["openid", "email", "https://www.googleapis.com/auth/webmasters.readonly", "https://www.googleapis.com/auth/analytics.readonly"];
const callbackPath = "/api/auth/google/callback";
const cleanError = () => json(502, { error: "Google request failed" });
const configured = (env: ProjectBEnv) => Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.TOKEN_ENCRYPTION_KEY && env.APP_URL);

function redirectUri(env: ProjectBEnv) { return `${String(env.APP_URL).replace(/\/$/, "")}${callbackPath}`; }

async function googleJson(url: string, init: RequestInit): Promise<Row> {
  const controller = new AbortController(); const timer = setTimeout(() => controller.abort(), 20_000);
  try {
    const response = await fetch(url, { ...init, signal: controller.signal });
    if (!response.ok) throw new Error(`Google returned ${response.status}`);
    const value = await response.json(); if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid Google response");
    return value as Row;
  } finally { clearTimeout(timer); }
}

async function integration(env: ProjectBEnv, ownerId: string): Promise<Row | undefined> {
  const rows = await createSql(env)`select * from google_integrations where owner_id = ${ownerId} limit 1`;
  return rows[0] ? camelize(rows[0]) : undefined;
}

function publicStatus(row: Row | undefined, env: ProjectBEnv) {
  return {
    clientIdConfigured: Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET), tokenEncryptionConfigured: Boolean(env.TOKEN_ENCRYPTION_KEY), redirectUri: env.APP_URL ? redirectUri(env) : undefined,
    gscConnected: Boolean(row?.gscConnected), ga4Connected: Boolean(row?.ga4Connected), userEmail: row?.userEmail ?? undefined,
    selectedGscSite: row?.selectedGscSite ?? "", selectedGa4PropertyId: row?.selectedGa4PropertyId ?? "",
    availableGscSites: Array.isArray(row?.availableGscSites) ? row?.availableGscSites : [], availableGa4Properties: Array.isArray(row?.availableGa4Properties) ? row?.availableGa4Properties : [], lastSyncAt: row?.lastSyncAt ?? undefined,
  };
}

async function authorizedToken(env: ProjectBEnv, ownerId: string): Promise<{ token: string; row: Row } | Response> {
  const row = await integration(env, ownerId);
  if (!row?.accessToken || !row?.refreshToken) return json(409, { error: "Google is not connected" });
  try {
    const now = Date.now(); const expiry = Date.parse(String(row.expiresAt ?? ""));
    if (Number.isFinite(expiry) && expiry > now + 60_000) return { token: await decryptSecret(String(row.accessToken), env), row };
    const refresh = await decryptSecret(String(row.refreshToken), env);
    const refreshed = await googleJson("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, refresh_token: refresh, grant_type: "refresh_token" }) });
    const token = String(refreshed.access_token ?? ""); if (!token) throw new Error("No access token");
    const encrypted = await encryptSecret(token, env); const expiresAt = new Date(Date.now() + Math.max(60, Number(refreshed.expires_in) || 3600) * 1000).toISOString();
    await createSql(env)`update google_integrations set access_token = ${encrypted}, expires_at = ${expiresAt}, updated_at = now() where owner_id = ${ownerId}`;
    return { token, row: { ...row, accessToken: encrypted, expiresAt } };
  } catch { return cleanError(); }
}

async function discoverGoogleResources(accessToken: string) {
  const headers = { authorization: `Bearer ${accessToken}` };
  const [sitesResult, propertiesResult, userResult] = await Promise.allSettled([
    googleJson("https://searchconsole.googleapis.com/webmasters/v3/sites", { headers }),
    googleJson("https://analyticsadmin.googleapis.com/v1beta/properties", { headers }),
    googleJson("https://www.googleapis.com/oauth2/v3/userinfo", { headers }),
  ]);
  const sites = sitesResult.status === "fulfilled" && Array.isArray(sitesResult.value.siteEntry) ? sitesResult.value.siteEntry.map((entry) => entry && typeof entry === "object" ? String((entry as Row).siteUrl ?? "") : "").filter(Boolean) : [];
  const properties = propertiesResult.status === "fulfilled" && Array.isArray(propertiesResult.value.properties) ? propertiesResult.value.properties.map((entry) => entry && typeof entry === "object" ? ({ id: String((entry as Row).name ?? "").replace(/^properties\//, ""), displayName: String((entry as Row).displayName ?? "") }) : undefined).filter(Boolean) : [];
  const email = userResult.status === "fulfilled" ? String(userResult.value.email ?? "") || null : null;
  return { sites, properties, email };
}

async function oauthUrl(request: Request, env: ProjectBEnv, ownerId: string): Promise<Response> {
  if (!configured(env)) return json(503, { error: "Google OAuth is not fully configured" });
  const clientId = new URL(request.url).searchParams.get("clientId") ?? undefined;
  const state = await signGoogleState({ ownerId, clientId, expiresAt: Date.now() + 10 * 60_000 }, env);
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.search = new URLSearchParams({ client_id: env.GOOGLE_CLIENT_ID!, redirect_uri: redirectUri(env), response_type: "code", scope: scopes.join(" "), access_type: "offline", prompt: "consent", state }).toString();
  return json(200, { url: url.toString() });
}

async function callback(request: Request, env: ProjectBEnv, ownerId: string): Promise<Response> {
  if (!configured(env)) return json(503, { error: "Google OAuth is not fully configured" });
  const url = new URL(request.url); const code = url.searchParams.get("code"); const state = url.searchParams.get("state");
  if (!code || !state) return json(400, { error: "Google authorization was not completed" });
  if (!await verifyGoogleState(state, ownerId, env)) return json(403, { error: "OAuth state is invalid or expired" });
  try {
    const tokens = await googleJson("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ code, client_id: env.GOOGLE_CLIENT_ID!, client_secret: env.GOOGLE_CLIENT_SECRET!, redirect_uri: redirectUri(env), grant_type: "authorization_code" }) });
    const access = String(tokens.access_token ?? ""); const refresh = String(tokens.refresh_token ?? ""); if (!access || !refresh) throw new Error("No OAuth token");
    const resources = await discoverGoogleResources(access); const expiresAt = new Date(Date.now() + Math.max(60, Number(tokens.expires_in) || 3600) * 1000).toISOString();
    await createSql(env)`insert into google_integrations (id, owner_id, gsc_connected, ga4_connected, user_email, available_gsc_sites, available_ga4_properties, access_token, refresh_token, expires_at, updated_at) values (${ownerId}, ${ownerId}, ${resources.sites.length > 0}, ${resources.properties.length > 0}, ${resources.email}, ${JSON.stringify(resources.sites)}::jsonb, ${JSON.stringify(resources.properties)}::jsonb, ${await encryptSecret(access, env)}, ${await encryptSecret(refresh, env)}, ${expiresAt}, now()) on conflict (id) do update set gsc_connected = excluded.gsc_connected, ga4_connected = excluded.ga4_connected, user_email = excluded.user_email, available_gsc_sites = excluded.available_gsc_sites, available_ga4_properties = excluded.available_ga4_properties, access_token = excluded.access_token, refresh_token = excluded.refresh_token, expires_at = excluded.expires_at, updated_at = now()`;
    return Response.redirect(`${String(env.APP_URL).replace(/\/$/, "")}/?google=connected`, 302);
  } catch { return cleanError(); }
}

async function config(request: Request, env: ProjectBEnv, ownerId: string): Promise<Response> {
  try {
    const data = await request.json() as Row; const selectedGscSite = typeof data.selectedGscSite === "string" ? data.selectedGscSite.slice(0, 2000) : null; const selectedGa4PropertyId = typeof data.selectedGa4PropertyId === "string" ? data.selectedGa4PropertyId.slice(0, 200) : null;
    await createSql(env)`update google_integrations set selected_gsc_site = ${selectedGscSite}, selected_ga4_property_id = ${selectedGa4PropertyId}, updated_at = now() where owner_id = ${ownerId}`;
    return json(200, { success: true });
  } catch { return json(500, { error: "Database request failed" }); }
}

async function gscData(env: ProjectBEnv, ownerId: string, days: number): Promise<Response> {
  const auth = await authorizedToken(env, ownerId); if (auth instanceof Response) return auth;
  const site = String(auth.row.selectedGscSite ?? ""); if (!site) return json(409, { error: "Select a Search Console property" });
  try {
    const endDate = new Date(); const startDate = new Date(Date.now() - days * 86_400_000);
    const report = await googleJson(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`, { method: "POST", headers: { authorization: `Bearer ${auth.token}`, "content-type": "application/json" }, body: JSON.stringify({ startDate: startDate.toISOString().slice(0, 10), endDate: endDate.toISOString().slice(0, 10), dimensions: ["date"], rowLimit: 500 }) });
    const series = Array.isArray(report.rows) ? report.rows.map((row) => row && typeof row === "object" ? { date: String((row as Row).keys?.[0] ?? ""), clicks: Number((row as Row).clicks ?? 0), impressions: Number((row as Row).impressions ?? 0), ctr: Number((row as Row).ctr ?? 0), position: Number((row as Row).position ?? 0) } : undefined).filter(Boolean) : [];
    return json(200, { connected: true, series });
  } catch { return cleanError(); }
}

async function ga4Report(env: ProjectBEnv, ownerId: string, days: number, mode: "trend" | "landing"): Promise<Response> {
  const auth = await authorizedToken(env, ownerId); if (auth instanceof Response) return auth;
  const property = String(auth.row.selectedGa4PropertyId ?? "").replace(/^properties\//, ""); if (!property) return json(409, { error: "Select a GA4 property" });
  try {
    const body = mode === "trend" ? { dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }], dimensions: [{ name: "date" }], metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "conversions" }], limit: 500 } : { dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }], dimensions: [{ name: "landingPagePlusQueryString" }], metrics: [{ name: "sessions" }, { name: "activeUsers" }, { name: "conversions" }], limit: 100 };
    const report = await googleJson(`https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(property)}:runReport`, { method: "POST", headers: { authorization: `Bearer ${auth.token}`, "content-type": "application/json" }, body: JSON.stringify(body) });
    const rows = Array.isArray(report.rows) ? report.rows : [];
    if (mode === "trend") return json(200, { connected: true, series: rows.map((row) => { const item = row as Row; const dims = Array.isArray(item.dimensionValues) ? item.dimensionValues as Row[] : []; const metrics = Array.isArray(item.metricValues) ? item.metricValues as Row[] : []; const date = String(dims[0]?.value ?? ""); return { date: /^\d{8}$/.test(date) ? `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6)}` : date, sessions: Number(metrics[0]?.value ?? 0), users: Number(metrics[1]?.value ?? 0), conversions: Number(metrics[2]?.value ?? 0) }; }) });
    return json(200, { connected: true, landingPages: rows.map((row) => { const item = row as Row; const dims = Array.isArray(item.dimensionValues) ? item.dimensionValues as Row[] : []; const metrics = Array.isArray(item.metricValues) ? item.metricValues as Row[] : []; return { page: String(dims[0]?.value ?? ""), sessions: Number(metrics[0]?.value ?? 0), users: Number(metrics[1]?.value ?? 0), conversions: Number(metrics[2]?.value ?? 0) }; }) });
  } catch { return cleanError(); }
}

export async function handleGoogleRequest(request: Request, env: ProjectBEnv): Promise<Response> {
  const user = await requireInternalUser(request, env); if (user instanceof Response) return user;
  const path = new URL(request.url).pathname; const days = Math.min(Math.max(Number(new URL(request.url).searchParams.get("days")) || 90, 1), 365);
  if (request.method === "GET" && path === "/api/auth/google/url") return oauthUrl(request, env, user.id);
  if (request.method === "GET" && path === callbackPath) return callback(request, env, user.id);
  if (request.method === "GET" && path === "/api/integrations/google/status") { try { return json(200, publicStatus(await integration(env, user.id), env)); } catch { return json(500, { error: "Database request failed" }); } }
  if (request.method === "POST" && path === "/api/integrations/google/config") return config(request, env, user.id);
  if (request.method === "POST" && path === "/api/integrations/google/disconnect") { try { await createSql(env)`delete from google_integrations where owner_id = ${user.id}`; return json(200, { disconnected: true }); } catch { return json(500, { error: "Database request failed" }); } }
  if (request.method === "GET" && (path === "/api/integrations/gsc/data" || path === "/api/integrations/gsc/insights")) return gscData(env, user.id, days);
  if (request.method === "GET" && (path === "/api/integrations/ga4/data" || path === "/api/integrations/ga4/trend")) return ga4Report(env, user.id, days, "trend");
  if (request.method === "GET" && path === "/api/integrations/ga4/ai-landing-pages") return ga4Report(env, user.id, days, "landing");
  return notFound();
}
