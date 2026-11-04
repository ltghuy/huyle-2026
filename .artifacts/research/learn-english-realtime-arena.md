---
topic: learn-english-realtime-arena
researched_at: 2026-11-04
version: "wrangler 4.149, @opennextjs/cloudflare (catalog), next 16.3.8"
sources_hash: "c0b82e62bb1c"
ttl_days: 90
keywords:
  - durable-objects
  - websocket
  - hibernation
  - alarms
  - opennext
  - custom-worker
  - free-plan
  - arena
---

# Real-time rooms for the Arena (feature 023) on Cloudflare

> Researched: 2026-11-04 (integration depth: the app deploys to this platform)

## Summary

Durable Objects run on the Workers Free plan, SQLite-backed only, with daily allowances that cover hundreds of duels a day if each room keeps its timers in alarms and lets its WebSockets hibernate. One Durable Object per room can hold both players' sockets, the clock and the answer key, and decide who answered first. OpenNext supports a custom worker entry, so the app's single Worker can export the room class and route the WebSocket upgrade to it before handing every other request to Next.js.

## Key Information

- **Free plan:** Durable Objects are available; only the SQLite storage backend. A new class needs a migration with `new_sqlite_classes`.
- **Free daily allowances** (reset 00:00 UTC): 100,000 requests, 13,000 GB-s duration, 5 million rows read, 100,000 rows written, 5 GB stored in total. Over any of them, "further operations of that type will fail with an error".
- **What counts as a request:** HTTP requests, RPC sessions, incoming WebSocket messages (billed at 20:1), alarm invocations, and one per WebSocket connection. Outgoing messages and protocol pings are free.
- **Alarms:** one alarm per object (a new `setAlarm()` replaces the old one); each `setAlarm()` is billed as one row written; an alarm wakes a hibernated object; at-least-once delivery with retries on uncaught errors; precision not stated.
- **Hibernation:** with `ctx.acceptWebSocket()` and the `webSocketMessage` / `webSocketClose` handlers, an idle object is evicted while sockets stay open. In-memory state is reset and the constructor runs again on the next event. `setTimeout` / `setInterval` keep the object in memory (no hibernation, duration billed).
- **Per-socket state:** `ws.serializeAttachment(value)` (max 16 KiB), read back with `ws.deserializeAttachment()`; `ctx.getWebSockets()` lists the sockets after a wake-up.
- **Limits that matter:** soft 1,000 requests/s per object; CPU 30 s per request by default; received message up to 32 MiB; unlimited objects.
- **OpenNext custom worker:** set wrangler `main` to your own file that imports `./.open-next/worker.js`, uses its `fetch` for everything else, and exports extra classes. The docs show re-exporting OpenNext's own DO classes; exporting your own class works the same way (an export from the entry module), though the page has no example of it.
- **Multi-worker** (a second Worker owning the DO, bound with `script_name`) is documented but marked advanced: it loses `opennextjs-cloudflare deploy`, preview URLs and skew protection.

## Implementation Notes

- **One object per room**, named by the room code (`env.ARENA_ROOM.idFromName(code)` or `getByName(code)`). Creating a room checks the object is unused before handing out the code.
- **Route the upgrade in the custom worker:** if the path is the Arena socket path and `Upgrade: websocket`, forward to the room object; else `handler.fetch`. Next.js route handlers can't be relied on to return a 101 with a socket through OpenNext (not documented), so the socket must not go through Next.js.
- **Sign-in at the socket:** the app's session check (`src/server/auth/session.ts`) runs through `getAuth()`, which reads env and D1 inside the Next.js request context. Rather than run better-auth in the custom worker, have a signed-in Next.js route (`requireUser`) issue a short-lived signed ticket (user id, name, avatar, room code, expiry; HMAC with a Worker secret). The custom worker or the room verifies it with Web Crypto. This keeps one auth seam and needs no Next.js context.
- **Timers as alarms, not `setTimeout`:** the room keeps a single "next deadline" (ready window end, question end, reveal end, reconnect grace end) and one alarm for it. Each alarm handler advances the state machine and sets the next alarm.
- **State that must survive hibernation** goes into the object's storage (phase, round, question index, scores, deadlines, per-question winner) and per-socket identity into attachments. Keep the answer key in storage, never sent before the reveal.
- **"First correct" is the order messages reach the room:** the object processes one event at a time, so the first correct answer it handles wins; later ones see the question already closed.
- **Content and grading:** the room loads the round's items from D1 at match start (rows read are plentiful) and grades with the pure functions in `src/learning/` (normalize, translate accepted wordings), so solo and Arena grading stay the same.
- **Stats:** at match end the room writes the win and loss to D1 (one batch).
- **Budget per best-of-3 duel (estimate):** about 2 connections, up to ~300 incoming messages (≈15 billed requests at 20:1), ~80 alarms, ~150 to 250 rows written. That is roughly 100 requests and 250 rows per duel, so the binding limit is rows written (100,000/day): around 400 full duels a day. Throttle typing signals (one "typing" per question, not per keystroke) and avoid writing storage on every keystroke.

## Gotchas

- `setTimeout` for countdowns silently disables hibernation and bills duration for the whole match; 13,000 GB-s is about 29 hours of a 128 MB object per day, so a few dozen idle rooms left open could use it up.
- After hibernation the constructor runs again: never keep the clock or scores only in class fields.
- Only one alarm per object: setting a second deadline overwrites the first.
- Alarms retry on uncaught errors (up to 6 times with backoff), so handlers must be idempotent (check the phase and deadline before acting).
- Over a free allowance, operations fail outright rather than slow down; the UI needs a Vietnamese "Đấu trường đang quá tải" style error.
- `next dev` doesn't run the custom worker, so WebSockets and the room can't be exercised there. The Arena needs `pnpm cf:preview` (wrangler) for manual and e2e tests.

## Integration Constraints

- **CLI/SDK interface:** wrangler `main` → custom worker file; `durable_objects.bindings: [{ name, class_name }]`; `migrations: [{ tag: "v1", new_sqlite_classes: ["ArenaRoom"] }]`; `pnpm cf:typegen` to refresh `CloudflareEnv`.
- **Environment variables:** a new secret for signing tickets (`wrangler secret put`), plus `.dev.vars` for preview.
- **Runtime constraints:** the room runs in the Workers runtime only; unit-test its state machine as plain TypeScript with the clock and sockets injected, and cover the wiring with e2e on the preview.
- **Error modes:** a missing migration fails deploy; forgetting the class export fails deploy; an exceeded free allowance throws at runtime.

## Recommendations

- One Worker: custom worker entry exporting `ArenaRoom`, routing the Arena socket path to it. Avoid the multi-worker setup.
- Signed ticket from a Next.js route for socket auth.
- Pure state machine in `src/learning/arena/` (no Workers APIs), wrapped by a thin Durable Object class that maps events to it and persists its state.
- Alarms for every deadline; hibernation API for sockets; typing signal sent once per question.

## Uncertainties

Resolved by the T001 spike (2026-11-04):

- **Custom entry with our own Durable Object: works.** `worker.ts` imports `./.open-next/worker.js`, re-exports `ArenaRoom`, and `wrangler.jsonc` `main: "worker.ts"`. `pnpm cf:build`, `opennextjs-cloudflare preview` and `wrangler deploy --dry-run` all accept it; the dry run lists `env.ARENA_ROOM (ArenaRoom)`. Bundle size is unchanged (3,343 KiB gzip vs 3,348 KiB in the 2026-11-04 production deploy).
- **`@/` alias resolves** inside the worker bundle (wrangler's esbuild reads tsconfig `paths`).
- **Hibernation and alarms under preview:** a socket idle for 15 s kept its attachment, and an alarm set from a message fired 2 s later and reached the socket.
- **Harmless warnings:** wrangler warns that internal Durable Objects "will not work in local development" and, during OpenNext's static-asset cache step, that `ArenaRoom` isn't exported (that step loads the config without our entry). The preview runs `worker.ts` and the room works. `next dev` prints the same warnings and still starts; the room is not reachable there.
- **Typecheck without a build:** the import of `.open-next/worker.js` needs `@ts-ignore` (with an eslint exception), because `@ts-expect-error` fails once the file exists.

Still open:

- Free plan per-object storage: the limits table says 10 GB, the FAQ says 1 GB on Free. A room stores kilobytes, so either is fine.
- Alarm precision is not documented. The room also rejects answers whose receive time is past the stored deadline.

## Sources

- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Durable Objects limits](https://developers.cloudflare.com/durable-objects/platform/limits/)
- [WebSockets best practices (hibernation)](https://developers.cloudflare.com/durable-objects/best-practices/websockets/)
- [Alarms API](https://developers.cloudflare.com/durable-objects/api/alarms/)
- [OpenNext: custom worker](https://opennext.js.org/cloudflare/howtos/custom-worker)
- [OpenNext: multi-worker](https://opennext.js.org/cloudflare/howtos/multi-worker)
- [OpenNext: dev and deploy](https://opennext.js.org/cloudflare/howtos/dev-deploy)
