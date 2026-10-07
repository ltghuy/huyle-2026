import { parseBody } from "@/lib/http";
import { getActivity, setActivity } from "@/server/practices/realtime-chat/chat.bots";
import { clearRoom, dropTab } from "@/server/practices/realtime-chat/chat.room";
import { controlBodySchema } from "@/server/practices/realtime-chat/chat.schema";

export function GET() {
  return Response.json({ data: { activity: getActivity() } });
}

export async function POST(request: Request) {
  const body = await parseBody(request, controlBodySchema);
  if ("response" in body) return body.response;

  if (body.data.action === "drop") {
    return Response.json({ data: { dropped: dropTab(body.data.tabId), activity: getActivity() } });
  }
  if (body.data.action === "clear") {
    return Response.json({ data: { cleared: clearRoom(body.data.authorId, body.data.authorName) } });
  }
  return Response.json({ data: { activity: setActivity(body.data.value) } });
}
