// The Worker's entry (feature 023): Arena sockets go to their room, everything
// else to the Next.js app that OpenNext builds into `.open-next/worker.js`.
// `.open-next/worker.js` exists only after `opennextjs-cloudflare build`, so this must be a
// ts-ignore: a ts-expect-error would itself fail once the file has been built.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import handler from "./.open-next/worker.js";

export { ArenaRoom } from "./src/server/arena/room";

const SOCKET_PATH = "/api/arena/socket";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === SOCKET_PATH) {
      if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing room code", { status: 400 });
      return env.ARENA_ROOM.getByName(code).fetch(request);
    }
    return handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareEnv>;
