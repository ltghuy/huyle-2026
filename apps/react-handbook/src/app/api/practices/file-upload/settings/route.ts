import { parseBody } from "@/lib/http";
import { settingsSchema } from "@/server/practices/file-upload/upload.schema";
import { getSettings, updateSettings } from "@/server/practices/file-upload/upload.store";

export function GET() {
  return Response.json({ data: getSettings() });
}

export async function PUT(request: Request) {
  const body = await parseBody(request, settingsSchema.partial());
  if ("response" in body) return body.response;
  return Response.json({ data: updateSettings(body.data) });
}
