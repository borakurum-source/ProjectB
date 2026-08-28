import { requireInternalUser } from "../auth";
import { createSql, deleteOwnedClient, deleteOwnedPrompt, listActions, listClients, listDiagnostics, listPageAnalyses, listPrompts, listProviderSnapshots, listRuns, saveAction, saveBatchSync, saveClient, saveDiagnostic, savePrompt, savePromptBatch, saveProviderSnapshot } from "../db";
import type { ProjectBEnv } from "../env";
import { json, notFound } from "../http";

async function body(request: Request): Promise<Record<string, unknown>> {
  return request.json() as Promise<Record<string, unknown>>;
}

function errorResponse(error: unknown) {
  const message = error instanceof Error ? error.message : "Request failed";
  const status = /required|not found/i.test(message) ? 400 : 500;
  return json(status, { error: status === 500 ? "Database request failed" : message });
}

export async function handleDataRequest(request: Request, env: ProjectBEnv): Promise<Response> {
  const user = await requireInternalUser(request, env);
  if (user instanceof Response) return user;

  try {
    const sql = createSql(env);
    const url = new URL(request.url);
    const path = url.pathname.replace("/api/db", "");
    const clientId = url.searchParams.get("clientId") ?? "";

    if (request.method === "GET" && path === "/clients") return json(200, await listClients(sql, user.id));
    if (request.method === "GET" && path === "/prompts") return clientId ? json(200, await listPrompts(sql, user.id, clientId)) : json(400, { error: "clientId query parameter required" });
    if (request.method === "GET" && path === "/runs") return clientId ? json(200, await listRuns(sql, user.id, clientId)) : json(400, { error: "clientId query parameter required" });
    if (request.method === "GET" && path === "/diagnostics") return clientId ? json(200, await listDiagnostics(sql, user.id, clientId)) : json(400, { error: "clientId query parameter required" });
    if (request.method === "GET" && path === "/actions") return clientId ? json(200, await listActions(sql, user.id, clientId)) : json(400, { error: "clientId query parameter required" });
    if (request.method === "GET" && path === "/page-analyses") return clientId ? json(200, await listPageAnalyses(sql, user.id, clientId)) : json(400, { error: "clientId query parameter required" });
    if (request.method === "GET" && path === "/provider-snapshots") return clientId ? json(200, await listProviderSnapshots(sql, user.id, clientId)) : json(400, { error: "clientId query parameter required" });

    if (request.method === "POST" && path === "/clients") return json(200, await saveClient(sql, user.id, await body(request)));
    if (request.method === "POST" && path === "/prompts") return json(200, await savePrompt(sql, user.id, await body(request)));
    if (request.method === "POST" && path === "/diagnostics") return json(200, await saveDiagnostic(sql, user.id, await body(request)));
    if (request.method === "POST" && path === "/actions") return json(200, await saveAction(sql, user.id, await body(request)));
    if (request.method === "POST" && path === "/provider-snapshots") return json(200, await saveProviderSnapshot(sql, user.id, await body(request)));
    if (request.method === "POST" && path === "/prompts/batch") {
      const payload = await body(request);
      const prompts = Array.isArray(payload.prompts) ? payload.prompts : [];
      return json(200, await savePromptBatch(env, user.id, prompts as Array<Record<string, unknown>>));
    }
    if (request.method === "POST" && path === "/batch-sync") {
      const payload = await body(request);
      if (!payload.client || typeof payload.client !== "object" || !(payload.client as Record<string, unknown>).id) return json(400, { error: "client.id is required" });
      const prompts = Array.isArray(payload.prompts) ? payload.prompts : [];
      const client = await saveBatchSync(env, user.id, payload.client as Record<string, unknown>, prompts as Array<Record<string, unknown>>);
      return json(200, { success: true, clientId: client.id });
    }
    if (request.method === "DELETE" && path.startsWith("/prompts/")) {
      const id = path.slice("/prompts/".length);
      return json(200, { deleted: await deleteOwnedPrompt(sql, user.id, id) });
    }
    if (request.method === "DELETE" && path.startsWith("/clients/")) {
      const id = path.slice("/clients/".length);
      return json(200, { deleted: await deleteOwnedClient(sql, user.id, id) });
    }
    return notFound();
  } catch (error) {
    return errorResponse(error);
  }
}
