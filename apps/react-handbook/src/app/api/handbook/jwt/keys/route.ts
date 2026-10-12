import { z } from "zod";

import { jsonError, parseBody } from "@/lib/http";
import { keysActionSchema, keysQuerySchema } from "@/server/handbook/jwt/jwt.schema";
import { addRingKey, getRing, promoteRingKey, retireRingKey, signWithRing, verifyWithRing } from "@/server/handbook/jwt/key-ring.service";

const NO_STORE = { "Cache-Control": "no-store" };

// The rotation demo's published key set (GET) and its key operations (POST).
export function GET(request: Request) {
  const parsed = keysQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  return Response.json({ data: getRing(parsed.data.run) }, { headers: NO_STORE });
}

export async function POST(request: Request) {
  const body = await parseBody(request, keysActionSchema);
  if ("response" in body) return body.response;
  const input = body.data;
  if (input.action === "sign") return Response.json({ data: signWithRing(input.run) }, { headers: NO_STORE });
  if (input.action === "verify") return Response.json({ data: verifyWithRing(input.run, input.token) }, { headers: NO_STORE });
  const result = input.action === "add" ? addRingKey(input.run) : input.action === "promote" ? promoteRingKey(input.run, input.kid) : retireRingKey(input.run, input.kid);
  return result.ok ? Response.json({ data: result.data }, { headers: NO_STORE }) : jsonError(result.message, result.status);
}
