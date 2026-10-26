import { z } from "zod";

import { jsonError } from "@/lib/http";
import { dnsParamsSchema } from "@/server/handbook/dns.schema";
import { resolveName } from "@/server/handbook/dns.service";

export async function GET(request: Request) {
  const parsed = dnsParamsSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  const result = await resolveName(parsed.data.name, parsed.data.type);
  if (result === "not-found") return jsonError(`${parsed.data.name} doesn't exist (NXDOMAIN)`, 404);
  if (result === "timeout") return jsonError("The DNS server didn't answer in time", 504);
  return Response.json({ data: result }, { headers: { "Cache-Control": "no-store" } });
}
