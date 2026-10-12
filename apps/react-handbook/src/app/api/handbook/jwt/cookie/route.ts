import { parseBody } from "@/lib/http";
import { cookieSetSchema } from "@/server/handbook/jwt/jwt.schema";
import { clearCookieHeader, setCookieHeader } from "@/server/handbook/jwt/cookie-lab.service";

// Sets (POST) or clears (DELETE) the storage demo's HttpOnly token cookie.
export async function POST(request: Request) {
  const body = await parseBody(request, cookieSetSchema);
  if ("response" in body) return body.response;
  return Response.json({ data: { sameSite: body.data.sameSite } }, { headers: { "Cache-Control": "no-store", "Set-Cookie": setCookieHeader(body.data.sameSite) } });
}

export function DELETE() {
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store", "Set-Cookie": clearCookieHeader() } });
}
