// One live Arena room (feature 023): a Durable Object named by the room code.
// The rules live in `src/learning/arena/machine.ts`; this class only feeds it
// events, saves the state it returns, carries out its effects and keeps one
// alarm at `nextAlarm(state)`. Sockets use the hibernation API, so an idle room
// leaves memory while its players stay connected; the state is reloaded from
// storage in the constructor.
//
// No `import "server-only"`: this module is bundled by wrangler into the custom
// worker, where that package's default export throws (knowledge.md, 023).
import { DurableObject } from "cloudflare:workers";
import { drizzle } from "drizzle-orm/d1";
import {
  createRoom,
  needsPool,
  nextAlarm,
  reduce,
  toPublic,
  type Effect,
  type PlayerIdentity,
  type Result,
  type RoomEvent,
  type RoomState,
} from "@/learning/arena/machine";
import { CLOSE_CODES, MAX_FRAME_BYTES, parseClientFrame, type ArenaSettings, type ClientFrame, type RoomFrame } from "@/learning/arena/protocol";
import { historyEntries } from "@/learning/arena/history";
import type { ArenaPool } from "@/learning/arena/questions";
import type { Db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { loadArenaPool } from "./content";
import { ARENA_PROTOCOL, PLAYER_HEADER } from "./socket-route";
import { recordMatch } from "./history";
import { recordResult } from "./stats";

const STATE_KEY = "room";

interface Attachment {
  userId: string;
  connectedAt: number;
}

/** What the join route needs to know before handing out a ticket. */
export interface RoomStatus {
  phase: RoomState["phase"];
  creatorId: string;
  playerIds: string[];
  settings: ArenaSettings;
}

function toEvent(userId: string, frame: ClientFrame): RoomEvent {
  switch (frame.type) {
    case "answer":
      return { type: "answer", userId, q: frame.q, answer: { text: frame.text } };
    case "choose":
      return { type: "answer", userId, q: frame.q, answer: { choice: frame.choice } };
    case "typing":
      return { type: "typing", userId, q: frame.q };
    case "settings":
      return { type: "settings", userId, settings: frame.settings };
    default:
      return { type: frame.type, userId };
  }
}

function randomSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0] & 0x7fffffff;
}

export class ArenaRoom extends DurableObject<CloudflareEnv> {
  private state: RoomState | null = null;
  /** A level's content, kept while the object is in memory; loaded again only when the creator changes the level (AC-031). */
  private pool: { level: ArenaSettings["level"]; content: ArenaPool } | null = null;

  constructor(ctx: DurableObjectState, env: CloudflareEnv) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      this.state = (await ctx.storage.get<RoomState>(STATE_KEY)) ?? null;
    });
  }

  /** RPC from the create route: claims this code for a new room. False when the code is already in use. */
  async create(input: { code: string; settings: ArenaSettings; creator: PlayerIdentity }): Promise<boolean> {
    if (this.state && this.state.phase !== "closed") return false;
    this.pool = null;
    await this.apply({ state: createRoom({ ...input, seed: randomSeed(), now: Date.now() }), effects: [] });
    return true;
  }

  /** RPC from the join route: the room's phase and seats, or null when there is no open room. */
  status(): RoomStatus | null {
    if (!this.state || this.state.phase === "closed") return null;
    return { phase: this.state.phase, creatorId: this.state.creatorId, playerIds: this.state.players.map((p) => p.id), settings: this.state.settings };
  }

  fetch(request: Request): Response {
    if (request.headers.get("Upgrade") !== "websocket") return new Response("Expected a WebSocket", { status: 426 });
    const player = playerFrom(request);
    if (!player) return new Response("Unauthorized", { status: 401 });
    const { 0: client, 1: server } = new WebSocketPair();
    void this.accept(server, player);
    // The browser offered ["arena", ticket]; answering "arena" completes the handshake.
    return new Response(null, { status: 101, webSocket: client, headers: { "Sec-WebSocket-Protocol": ARENA_PROTOCOL } });
  }

  /** Takes a player's socket and seats them (or refuses them) through the rules. */
  async accept(socket: WebSocket, player: PlayerIdentity): Promise<void> {
    this.ctx.acceptWebSocket(socket, [player.id]);
    socket.serializeAttachment({ userId: player.id, connectedAt: Date.now() } satisfies Attachment);
    if (!this.state) {
      sendTo(socket, { type: "error", message: "Phòng đã đóng." });
      socket.close(CLOSE_CODES.roomClosed, "closed");
      return;
    }
    await this.apply(reduce(this.state, { type: "join", player }, Date.now()));
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const userId = userOf(socket);
    if (!userId || !this.state) return;
    const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
    const frame = parseClientFrame(raw);
    if (!frame) {
      if (new TextEncoder().encode(raw).length > MAX_FRAME_BYTES) socket.close(CLOSE_CODES.tooBig, "too big");
      return;
    }
    await this.apply(reduce(this.state, toEvent(userId, frame), Date.now()));
  }

  async webSocketClose(socket: WebSocket): Promise<void> {
    await this.dropped(socket);
  }

  async webSocketError(socket: WebSocket): Promise<void> {
    await this.dropped(socket);
  }

  async alarm(): Promise<void> {
    if (!this.state) return;
    // Load content first, then read the state: messages handled while D1 answers must not be lost.
    const pool = needsPool(this.state) ? await this.loadPool(this.state.settings.level) : undefined;
    if (!this.state) return;
    await this.apply(reduce(this.state, { type: "tick" }, Date.now(), pool));
  }

  /** A socket closed: a drop only when it was the player's last one (a newer tab keeps them in). */
  private async dropped(socket: WebSocket): Promise<void> {
    const userId = userOf(socket);
    if (!userId || !this.state) return;
    const others = this.ctx.getWebSockets(userId).filter((other) => other !== socket && other.readyState === WebSocket.OPEN);
    if (others.length > 0) return;
    await this.apply(reduce(this.state, { type: "disconnect", userId }, Date.now()));
  }

  private async loadPool(level: ArenaSettings["level"]): Promise<ArenaPool> {
    if (this.pool?.level !== level) this.pool = { level, content: await loadArenaPool(this.db(), level) };
    return this.pool.content;
  }

  private db(): Db {
    return drizzle(this.env.DB, { schema }) as unknown as Db;
  }

  /** Saves the new state, carries out the effects and keeps the alarm in step. */
  private async apply(result: Result): Promise<void> {
    const changed = result.state !== this.state;
    this.state = result.state;
    if (changed) await this.ctx.storage.put(STATE_KEY, result.state);
    for (const effect of result.effects) await this.run(effect);
    await this.syncAlarm();
    if (this.state?.phase === "closed") {
      // Nothing left to keep: free the code and the storage.
      await this.ctx.storage.deleteAll();
      this.state = null;
      this.pool = null;
    }
  }

  private async syncAlarm(): Promise<void> {
    const next = this.state ? nextAlarm(this.state) : null;
    const current = await this.ctx.storage.getAlarm();
    if (next === current) return;
    // Each setAlarm is a row written on the free plan: only when the time changes.
    if (next === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(next);
  }

  private async run(effect: Effect): Promise<void> {
    switch (effect.type) {
      case "broadcast": {
        if (!this.state) return;
        const frame: RoomFrame = { type: "state", room: toPublic(this.state), serverNow: Date.now() };
        for (const socket of this.ctx.getWebSockets()) sendTo(socket, frame);
        return;
      }
      case "send":
        for (const socket of this.ctx.getWebSockets(effect.to)) sendTo(socket, effect.frame);
        return;
      case "send-all":
        for (const socket of this.ctx.getWebSockets()) sendTo(socket, effect.frame);
        return;
      case "send-others":
        for (const socket of this.ctx.getWebSockets()) if (userOf(socket) !== effect.except) sendTo(socket, effect.frame);
        return;
      case "close":
        for (const socket of effect.userId ? this.ctx.getWebSockets(effect.userId) : this.ctx.getWebSockets()) {
          if (effect.message) sendTo(socket, { type: "error", message: effect.message });
          socket.close(effect.code, "closed");
        }
        return;
      case "replace": {
        // Keep the player's newest socket, close the older ones (another tab).
        const sockets = this.ctx.getWebSockets(effect.userId);
        const newest = sockets.reduce<WebSocket | null>((best, s) => (!best || connectedAt(s) > connectedAt(best) ? s : best), null);
        for (const socket of sockets) if (socket !== newest) socket.close(CLOSE_CODES.replaced, "replaced");
        return;
      }
      case "record":
        try {
          await recordResult(this.db(), effect.winnerId, effect.loserId, Date.now());
        } catch (error) {
          // The match still ends for both; only the stats row is missing.
          console.error("Arena stats not saved:", error);
        }
        try {
          // On its own, so a failed history write never costs the totals (feature 025).
          await recordMatch(this.db(), historyEntries(effect.match, crypto.randomUUID()));
        } catch (error) {
          console.error("Arena history not saved:", error);
        }
        return;
    }
  }
}

function playerFrom(request: Request): PlayerIdentity | null {
  try {
    const value = JSON.parse(request.headers.get(PLAYER_HEADER) ?? "null") as Partial<PlayerIdentity> | null;
    if (!value || typeof value.id !== "string" || typeof value.name !== "string") return null;
    return { id: value.id, name: value.name, image: typeof value.image === "string" ? value.image : null };
  } catch {
    return null;
  }
}

function userOf(socket: WebSocket): string | null {
  return (socket.deserializeAttachment() as Attachment | null)?.userId ?? null;
}

function connectedAt(socket: WebSocket): number {
  return (socket.deserializeAttachment() as Attachment | null)?.connectedAt ?? 0;
}

function sendTo(socket: WebSocket, frame: RoomFrame): void {
  try {
    socket.send(JSON.stringify(frame));
  } catch {
    // A socket closing as we send: its close event handles the drop.
  }
}
