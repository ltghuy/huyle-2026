import { env } from "@/server/env";

export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    app: env.APP_NAME,
    timestamp: new Date().toISOString(),
  });
}
