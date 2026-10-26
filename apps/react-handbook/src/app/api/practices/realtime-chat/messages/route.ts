import { z } from "zod";

import { jsonError, parseBody } from "@/lib/http";
import { onUserMessage } from "@/server/practices/realtime-chat/chat.bots";
import { getHistory, postMessage, simulateNetwork } from "@/server/practices/realtime-chat/chat.room";
import {
  historyQuerySchema,
  networkQuerySchema,
  sendBodySchema,
} from "@/server/practices/realtime-chat/chat.schema";

function query<T extends z.ZodType>(request: Request, schema: T) {
  return schema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
}

export async function GET(request: Request) {
  const parsed = query(request, historyQuerySchema);
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));

  const { before, latencyMs, failRate } = parsed.data;
  await simulateNetwork(latencyMs);
  if (Math.random() < failRate) return jsonError("Simulated server failure", 500);
  return Response.json({ data: getHistory(before) });
}

export async function POST(request: Request) {
  const network = query(request, networkQuerySchema);
  if (!network.success) return jsonError("Validation failed", 422, z.treeifyError(network.error));
  const body = await parseBody(request, sendBodySchema);
  if ("response" in body) return body.response;

  const { latencyMs, failRate } = network.data;
  await simulateNetwork(latencyMs);
  const failed = Math.random() < failRate;
  // Half of the simulated failures happen before storing, half after:
  // the second kind is a lost response, which only an idempotent retry survives.
  if (failed && Math.random() < 0.5) return jsonError("Simulated server failure", 500);

  const { message, created } = postMessage(body.data);
  if (created) onUserMessage(message);
  if (failed) return jsonError("Simulated server failure (response lost)", 500);
  return Response.json({ data: message }, { status: created ? 201 : 200 });
}
