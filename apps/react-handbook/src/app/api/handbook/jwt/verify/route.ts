import { parseBody } from "@/lib/http";
import { verifySchema } from "@/server/handbook/jwt/jwt.schema";
import { verifyToken } from "@/server/handbook/jwt/token-lab.service";

export async function POST(request: Request) {
  const body = await parseBody(request, verifySchema);
  if ("response" in body) return body.response;
  return Response.json({ data: verifyToken(body.data.token) }, { headers: { "Cache-Control": "no-store" } });
}
