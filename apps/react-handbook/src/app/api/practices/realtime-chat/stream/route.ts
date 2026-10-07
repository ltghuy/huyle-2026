import { z } from "zod";

import { jsonError } from "@/lib/http";
// Imported for its side effect: bots start when the first stream connects.
import "@/server/practices/realtime-chat/chat.bots";
import { subscribe } from "@/server/practices/realtime-chat/chat.room";
import { streamQuerySchema, type StreamEvent } from "@/server/practices/realtime-chat/chat.schema";

const PING_MS = 15_000;
const encoder = new TextEncoder();

function format({ type, data }: StreamEvent) {
  const id = type === "message" ? `id: ${data.seq}\n` : "";
  return encoder.encode(`event: ${type}\n${id}data: ${JSON.stringify(data)}\n\n`);
}

export function GET(request: Request) {
  const parsed = streamQuerySchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return jsonError("Validation failed", 422, z.treeifyError(parsed.error));
  const { tabId, after } = parsed.data;

  let close = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let open = true;
      let unsubscribe = () => {};

      close = () => {
        if (!open) return;
        open = false;
        clearInterval(ping);
        unsubscribe();
        request.signal.removeEventListener("abort", close);
        try {
          controller.close();
        } catch {
          // Already closed by the client.
        }
      };
      // A client that vanished without aborting makes enqueue throw: treat it as closed.
      const push = (chunk: Uint8Array) => {
        if (!open) return;
        try {
          controller.enqueue(chunk);
        } catch {
          close();
        }
      };

      // Declared before anything can call close().
      const ping = setInterval(() => push(encoder.encode(": ping\n\n")), PING_MS);
      const subscription = subscribe({ tabId, send: (event) => push(format(event)), close }, after);
      unsubscribe = subscription.unsubscribe;
      for (const event of subscription.backlog) push(format(event));
      request.signal.addEventListener("abort", close);
    },
    cancel() {
      close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
