import { requireInternalUser } from "../auth";
import type { ProjectBEnv } from "../env";
import { json, notFound } from "../http";

const toolNames = ["list_clients", "list_prompts", "list_runs", "list_diagnostics", "list_actions", "analyze_page", "search_brand_memory"];

export async function handleMcpRequest(request: Request, env: ProjectBEnv): Promise<Response> {
  const user = await requireInternalUser(request, env); if (user instanceof Response) return user;
  const path = new URL(request.url).pathname; const origin = new URL(request.url).origin;
  if (request.method === "GET" && path === "/api/mcp/info") {
    return json(200, { name: "RAGSIGNAL", protocolVersion: "2025-06-18", endpoints: { sse: `${origin}/api/mcp/sse`, messages: `${origin}/api/mcp/messages`, rpc: `${origin}/api/mcp/rpc` }, capabilities: { tools: toolNames }, configInstructions: { claudeDesktop: { mcpServers: { ragsignal: { url: `${origin}/api/mcp/sse` } } } } });
  }
  if (request.method === "POST" && (path === "/api/mcp/rpc" || path === "/api/mcp/messages")) {
    const message = await request.json().catch(() => ({})) as Record<string, unknown>;
    if (message.method === "tools/list") return json(200, { jsonrpc: "2.0", id: message.id ?? null, result: { tools: toolNames.map((name) => ({ name, description: `RAGSIGNAL internal ${name.replaceAll("_", " ")} tool`, inputSchema: { type: "object", properties: {} } })) } });
    return json(200, { jsonrpc: "2.0", id: message.id ?? null, error: { code: -32601, message: "This MCP method is not available in the Sites deployment" } });
  }
  if (request.method === "GET" && path === "/api/mcp/sse") return new Response("event: endpoint\ndata: /api/mcp/messages\n\n", { headers: { "content-type": "text/event-stream", "cache-control": "no-cache" } });
  return notFound();
}
