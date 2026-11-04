// One live Arena room (feature 023), a Durable Object named by the room code.
// No `import "server-only"`: this module is bundled by wrangler into the custom
// worker, where that package's default export throws.
//
// T001 spike: an echo room that proves sockets hibernate and an alarm wakes the
// object. T011 replaces the body with the real room.
import { DurableObject } from "cloudflare:workers";
import { normalize } from "@/learning/normalize";

export class ArenaRoom extends DurableObject<CloudflareEnv> {
  fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
    const { 0: client, 1: server } = new WebSocketPair();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ joinedAt: Date.now() });
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const text = typeof message === "string" ? message : new TextDecoder().decode(message);
    if (text === "alarm") {
      await this.ctx.storage.setAlarm(Date.now() + 2_000);
      ws.send("alarm-set");
      return;
    }
    const attachment = ws.deserializeAttachment() as { joinedAt: number } | null;
    ws.send(JSON.stringify({ echo: normalize(text), joinedAt: attachment?.joinedAt ?? null, sockets: this.ctx.getWebSockets().length }));
  }

  alarm(): void {
    for (const ws of this.ctx.getWebSockets()) ws.send("alarm-fired");
  }

  webSocketClose(ws: WebSocket, code: number): void {
    ws.close(code, "closing");
  }
}
