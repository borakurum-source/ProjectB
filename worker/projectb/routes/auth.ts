import { requireInternalUser } from "../auth";
import type { ProjectBEnv } from "../env";
import { json, notFound } from "../http";

export async function handleAuthRequest(request: Request, env: ProjectBEnv): Promise<Response> {
  const pathname = new URL(request.url).pathname;
  if (request.method === "GET" && pathname === "/api/auth/me") {
    const user = await requireInternalUser(request, env);
    return user instanceof Response ? user : json(200, { user });
  }
  if (request.method === "GET" && pathname === "/api/auth/sign-in") {
    return Response.redirect(new URL("/signin-with-chatgpt?return_to=%2F", request.url), 302);
  }
  if (request.method === "GET" && pathname === "/api/auth/sign-out") {
    return Response.redirect(new URL("/signout-with-chatgpt?return_to=%2F", request.url), 302);
  }
  return notFound();
}
