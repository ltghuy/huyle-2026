// The Worker's entry (feature 023): Arena sockets go to their room, everything
// else to the Next.js app that OpenNext builds into `.open-next/worker.js`.
// `.open-next/worker.js` exists only after `opennextjs-cloudflare build`, so this must be a
// ts-ignore: a ts-expect-error would itself fail once the file has been built.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import handler from "./.open-next/worker.js";
import { handleArenaSocket } from "./src/server/arena/socket-route";

export { ArenaRoom } from "./src/server/arena/room";
export { LearnerLink } from "./src/server/arena/link";

export default {
  async fetch(request, env, ctx) {
    return (await handleArenaSocket(request, env)) ?? handler.fetch(request, env, ctx);
  },
} satisfies ExportedHandler<CloudflareEnv>;
