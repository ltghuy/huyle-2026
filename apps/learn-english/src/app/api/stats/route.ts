import { getDb } from "@/server/db";
import { getEnv } from "@/server/env";
import { isDayInRange, MAX_STATS_BODY_BYTES, statsPayloadSchema } from "@/server/stats/stats.schema";
import { recordStats } from "@/server/stats/stats.service";

// Stats must never block or bother the learner, so this always answers 204:
// for a stored report, an invalid one and a failed write alike (spec edge case
// "drop silently"). Nothing from the request is logged.
const noContent = () => new Response(null, { status: 204 });

async function readPayload(request: Request) {
  const text = await request.text();
  if (text.length > MAX_STATS_BODY_BYTES) return undefined;
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return undefined;
  }
  const parsed = statsPayloadSchema.safeParse(body);
  return parsed.success && isDayInRange(parsed.data.day, Date.now()) ? parsed.data : undefined;
}

export async function POST(request: Request) {
  try {
    const payload = await readPayload(request);
    if (payload) await recordStats(getDb(), payload, getEnv().STATS_SALT);
  } catch {
    console.error("Stats write failed");
  }
  return noContent();
}
