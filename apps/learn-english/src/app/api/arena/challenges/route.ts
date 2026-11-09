import { getCloudflareContext } from "@opennextjs/cloudflare";
import { requireUser } from "@/server/auth/session";
import { getDb } from "@/server/db";
import { ARENA_MESSAGES as MESSAGES, challengeBodySchema } from "@/server/arena/arena.schema";
import { playerName } from "@/server/arena/arena.service";
import { sendChallenge, type ChallengeResult } from "@/server/arena/challenge.service";
import { error, json, readBody } from "@/server/arena/request";
import { isThrottled } from "@/server/social/request";

const REFUSED: Record<Extract<ChallengeResult, { ok: false }>["reason"], { message: string; status: number }> = {
  "not-friend": { message: MESSAGES.notFriend, status: 404 },
  "not-host": { message: MESSAGES.notHost, status: 403 },
  "seat-taken": { message: MESSAGES.seatTaken, status: 409 },
};

// "Thách đấu" from the waiting room (feature 035, AC-003): `{ state }` says whether the friend sees it.
// Throttled with friend requests (SOCIAL_LIMITER), so challenges never use up a learner's room creates and joins.
export async function POST(request: Request) {
  const session = await requireUser(request);
  if ("response" in session) return session.response;
  const body = await readBody(request, challengeBodySchema);
  if ("response" in body) return body.response;
  if (await isThrottled(request)) return error(MESSAGES.throttled, 429);

  try {
    const { ARENA_ROOM, LEARNER_LINK } = getCloudflareContext().env;
    const host = { id: session.user.id, name: playerName(body.data.name, session.user), image: session.user.image };
    const result = await sendChallenge(getDb(), ARENA_ROOM, LEARNER_LINK, { code: body.data.code, friendId: body.data.friendId, host });
    if (!result.ok) return error(REFUSED[result.reason].message, REFUSED[result.reason].status);
    return json({ state: result.state }, 200);
  } catch (cause) {
    console.error("Challenge failed:", cause);
    return error(MESSAGES.unavailable, 503);
  }
}
