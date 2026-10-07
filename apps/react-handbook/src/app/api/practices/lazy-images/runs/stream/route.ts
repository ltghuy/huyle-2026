import { z } from "zod";

import { jsonError } from "@/lib/http";
import { runQuerySchema } from "@/server/practices/lazy-images/photos.schema";
import { getRunStats } from "@/server/practices/lazy-images/photos.service";

const CHECK_MS = 250;
const encoder = new TextEncoder();

/**
 * Server-sent stats for one run, pushed when they change. One long-lived
 * connection, opened before the images start, so the numbers keep flowing
 * even while image requests occupy the browser's other connections (a
 * polled request would queue behind them).
 */
export function GET(request: Request) {
  const query = runQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success) return jsonError("Validation failed", 422, z.treeifyError(query.error));
  const { run } = query.data;
  if (!getRunStats(run)) return jsonError("Unknown run", 404);

  let close = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      let last = "";
      const check = () => {
        const stats = getRunStats(run);
        if (!stats) return close();
        const json = JSON.stringify(stats);
        if (json === last) return;
        last = json;
        try {
          controller.enqueue(encoder.encode(`data: ${json}\n\n`));
        } catch {
          close();
        }
      };
      const timer = setInterval(check, CHECK_MS);
      close = () => {
        if (!open) return;
        open = false;
        clearInterval(timer);
        request.signal.removeEventListener("abort", close);
        try {
          controller.close();
        } catch {
          // Already closed by the client.
        }
      };
      request.signal.addEventListener("abort", close);
      check();
    },
    cancel() {
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store",
      Connection: "keep-alive",
    },
  });
}
