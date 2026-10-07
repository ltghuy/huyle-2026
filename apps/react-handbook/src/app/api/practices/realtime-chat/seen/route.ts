import { parseBody } from "@/lib/http";
import { broadcastSeen } from "@/server/practices/realtime-chat/chat.room";
import { seenBodySchema } from "@/server/practices/realtime-chat/chat.schema";

export async function POST(request: Request) {
  const body = await parseBody(request, seenBodySchema);
  if ("response" in body) return body.response;
  broadcastSeen(body.data.authorId, body.data.upToSeq);
  return new Response(null, { status: 204 });
}
