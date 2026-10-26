import { parseBody } from "@/lib/http";
import { broadcastTyping } from "@/server/practices/realtime-chat/chat.room";
import { typingBodySchema } from "@/server/practices/realtime-chat/chat.schema";

export async function POST(request: Request) {
  const body = await parseBody(request, typingBodySchema);
  if ("response" in body) return body.response;
  const { authorId, authorName, typing } = body.data;
  broadcastTyping(authorId, authorName, typing);
  return new Response(null, { status: 204 });
}
