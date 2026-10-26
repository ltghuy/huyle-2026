import { jsonError, parseBody } from "@/lib/http";
import { saveRequestSchema } from "@/server/practices/toast-notifications/save.schema";
import { simulateSave } from "@/server/practices/toast-notifications/save.service";

export async function POST(request: Request) {
  const parsed = await parseBody(request, saveRequestSchema);
  if ("response" in parsed) return parsed.response;

  const result = await simulateSave(parsed.data);
  if (!result) return jsonError("Simulated server failure", 500);
  return Response.json({ data: result });
}
