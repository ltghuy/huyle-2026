import { parseBody } from "@/lib/http";
import { attackSchema } from "@/server/handbook/jwt/jwt.schema";
import { runAttack } from "@/server/handbook/jwt/token-lab.service";

export async function POST(request: Request) {
  const body = await parseBody(request, attackSchema);
  if ("response" in body) return body.response;
  return Response.json({ data: runAttack(body.data.attack, body.data.checks) }, { headers: { "Cache-Control": "no-store" } });
}
