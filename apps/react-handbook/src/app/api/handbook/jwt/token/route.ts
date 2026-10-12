import { parseBody } from "@/lib/http";
import { issueSchema } from "@/server/handbook/jwt/jwt.schema";
import { issueToken } from "@/server/handbook/jwt/token-lab.service";

export async function POST(request: Request) {
  const body = await parseBody(request, issueSchema);
  if ("response" in body) return body.response;
  return Response.json({ data: { token: issueToken(body.data) } }, { headers: { "Cache-Control": "no-store" } });
}
