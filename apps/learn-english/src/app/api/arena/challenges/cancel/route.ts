import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireUser } from "@/server/auth/session";
import { ARENA_MESSAGES as MESSAGES, cancelChallengeBodySchema } from "@/server/arena/arena.schema";
import { cancelChallenge } from "@/server/arena/challenge.service";
import { error, readBody } from "@/server/arena/request";

// "Hủy", or the host left the room (feature 035, AC-010): closes the friend's toast.
export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const body = await readBody(request, cancelChallengeBodySchema);
  if ("response" in body) return body.response;
  try {
    await cancelChallenge(getCloudflareContext().env.LEARNER_LINK, { ...body.data, hostId: session.user.id });
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("Challenge cancel failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}
