import { jsonError, parseBody } from "@/lib/http";
import { csrfActionSchema } from "@/server/handbook/security/security.schema";
import { login, reset } from "@/server/handbook/security/csrf-lab.service";

// The CSRF demo's sign-in (sets the session cookie) and reset.
export async function POST(request: Request) {
  const body = await parseBody(request, csrfActionSchema);
  if ("response" in body) return body.response;
  if (body.data.action === "login") {
    const { state, sid, setCookie } = login(body.data.sameSite, body.data.defence);
    return Response.json({ data: { sid, state } }, { headers: { "Cache-Control": "no-store", "Set-Cookie": setCookie } });
  }
  const state = reset(body.data.sid);
  if (!state) return jsonError("Unknown session.", 404);
  return Response.json({ data: { state } }, { headers: { "Cache-Control": "no-store" } });
}
