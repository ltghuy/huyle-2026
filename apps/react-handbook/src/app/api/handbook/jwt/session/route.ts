import { jsonError, parseBody } from "@/lib/http";
import { sessionActionSchema } from "@/server/handbook/jwt/jwt.schema";
import { login, logout, refresh } from "@/server/handbook/jwt/session-lab.service";

const NO_STORE = { "Cache-Control": "no-store" };

export async function POST(request: Request) {
  const body = await parseBody(request, sessionActionSchema);
  if ("response" in body) return body.response;
  const input = body.data;
  if (input.action === "login") return Response.json({ data: login(input.accessTtl, input.revocation) }, { headers: NO_STORE });
  const result = input.action === "refresh" ? refresh(input.sid, input.refreshToken, input.actor) : logout(input.sid);
  return result.ok ? Response.json({ data: result.data }, { headers: NO_STORE }) : jsonError(result.message, result.status);
}
