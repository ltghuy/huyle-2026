import { listFiles } from "@/server/practices/file-upload/upload.store";

export async function GET() {
  return Response.json({ data: await listFiles() });
}
