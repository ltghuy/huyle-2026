// One live Arena room (feature 023): a Durable Object named by the room code.
// The rules live in `src/learning/arena/machine.ts`; this class only feeds it
// events, saves the state it returns, carries out its effects and keeps one
// alarm at `nextAlarm(state)`. Sockets use the hibernation API, so an idle room
// leaves memory while its players stay connected; the state is reloaded from
// storage in the constructor.
//
// Team rooms (feature 039) live in the same class: the stored state's `kind`
// picks the rules (`team-machine.ts` for "team", the duel machine otherwise),
// and a team room keeps each round's questions under its own key (`deck:{r}`).
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
import { CLOSE_CODES, DEFAULT_QUESTION_TIME, MAX_FRAME_BYTES, parseClientFrame, type ArenaSettings, type ClientFrame, type RoomFrame } from "@/learning/arena/protocol";
import { listingOf, sameListing, type CommunityListing } from "@/learning/arena/community";
import { historyEntries, teamHistoryEntries } from "@/learning/arena/history";
import type { ArenaPool, ServerQuestion } from "@/learning/arena/questions";
import {
  buildTeamDecks,
  createTeamRoom,
  deckRound,
  nextTeamAlarm,
  reduceTeam,
  teamNeedsDecks,
  toPublicTeam,
  type TeamEffect,
  type TeamIdentity,
  type TeamResult,
  type TeamRoomEvent,
  type TeamRoomState,
} from "@/learning/arena/team-machine";
import { parseTeamFrame, type TeamClientFrame, type TeamSettings, type TeamStateFrame } from "@/learning/arena/team-protocol";
import { MAX_ANSWERS_PER_SECOND } from "@/learning/arena/machine";
import type { Db } from "@/server/db";
import * as schema from "@/server/db/schema";
import { removeListing, writeListing } from "./community";
import { loadArenaPool } from "./content";
import { ARENA_PROTOCOL, PLAYER_HEADER } from "./socket-route";
import { recordMatch } from "./history";
import { recordResult } from "./stats";

const STATE_KEY = "room";
/** A team room's round deck (feature 039). */
const deckKey = (round: number) => `deck:${round}`;

type AnyState = RoomState | TeamRoomState;
const isTeam = (state: AnyState | null): state is TeamRoomState => state !== null && "kind" in state && state.kind === "team";

interface Attachment {
  userId: string;
  connectedAt: number;
}

/** What the join route needs to know before handing out a ticket. */
export type RoomStatus =
  | {
      /** Absent on statuses read before feature 039: a duel. */
      kind?: "duel";
      phase: RoomState["phase"];
      creatorId: string;
      playerIds: string[];
      /** Who is watching (feature 026). */
      spectatorIds: string[];
      settings: ArenaSettings;
    }
  | {
      /** A team room (feature 039): no spectators, `settings.size` seats. */
      kind: "team";
      phase: TeamRoomState["phase"];
      creatorId: string;
      playerIds: string[];
      spectatorIds: string[];
      settings: TeamSettings;
    };

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
    case "pick":
      return { type: "pick", userId, opponentId: frame.userId };
    default:
      return { type: frame.type, userId };
  }
}

function toTeamEvent(userId: string, frame: TeamClientFrame): TeamRoomEvent {
  switch (frame.type) {
    case "answer":
      return { type: "answer", userId, q: frame.q, answer: { text: frame.text } };
    case "choose":
      return { type: "answer", userId, q: frame.q, answer: { choice: frame.choice } };
    case "typing":
    case "hint":
      return { type: frame.type, userId, q: frame.q };
    case "assign":
      return { type: "assign", userId, target: frame.userId, team: frame.team };
    case "order":
      return { type: "order", userId, team: frame.team, ids: frame.ids };
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
  private state: AnyState | null = null;
  /** A team room's decks by round, kept while in memory; read back from storage after a wake. */
  private decks = new Map<number, ServerQuestion[]>();
  /** Team rooms: when each player's recent answers arrived (flood limit), and who already signalled typing on which question. Memory only: nothing worth a write. */
  private recentAnswers = new Map<string, number[]>();
  private typed = new Set<string>();
  /** A level's content, kept while the object is in memory; loaded again only when the creator changes the level (AC-031). */
  private pool: { level: ArenaSettings["level"]; content: ArenaPool } | null = null;
  /** The "Cộng đồng" row last written for this room (feature 041); undefined after a wake, when it isn't known. */
  private listed: CommunityListing | null | undefined = undefined;

  constructor(ctx: DurableObjectState, env: CloudflareEnv) {
    super(ctx, env);
    void ctx.blockConcurrencyWhile(async () => {
      const stored = await ctx.storage.get<AnyState>(STATE_KEY);
      // Rooms saved before feature 026 have no spectators list, before 028 no question time, before 039 no kind (a duel).
      if (!stored || isTeam(stored)) this.state = stored ?? null;
      else this.state = { ...stored, spectators: stored.spectators ?? [], settings: { ...stored.settings, seconds: stored.settings.seconds ?? DEFAULT_QUESTION_TIME } };
    });
  }

  /** RPC from the create route: claims this code for a new room. False when the code is already in use. */
  async create(input: { code: string; settings: ArenaSettings; creator: PlayerIdentity }): Promise<boolean> {
    if (this.state && this.state.phase !== "closed") return false;
    this.pool = null;
    await this.apply({ state: createRoom({ ...input, seed: randomSeed(), now: Date.now() }), effects: [] });
    return true;
  }

  /** RPC from the team create route (feature 039): claims this code for a new team room. False when it is in use. */
  async createTeam(input: { code: string; settings: TeamSettings; host: TeamIdentity }): Promise<boolean> {
    if (this.state && this.state.phase !== "closed") return false;
    this.pool = null;
    this.decks.clear();
    await this.apply({ state: createTeamRoom({ ...input, seed: randomSeed(), now: Date.now() }), effects: [] });
    return true;
  }

  /** RPC from the join route: the room's kind, phase, seats and spectators, or null when there is no open room. */
  status(): RoomStatus | null {
    if (!this.state || this.state.phase === "closed") return null;
    if (isTeam(this.state)) {
      const { phase, hostId, players, settings } = this.state;
      return { kind: "team", phase, creatorId: hostId, playerIds: players.map((p) => p.id), spectatorIds: [], settings };
    }
    return {
      kind: "duel",
      phase: this.state.phase,
      creatorId: this.state.creatorId,
      playerIds: this.state.players.map((p) => p.id),
      spectatorIds: this.state.spectators.map((s) => s.id),
      settings: this.state.settings,
    };
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
    if (isTeam(this.state)) return this.applyTeam({ type: "join", player });
    await this.apply(reduce(this.state, { type: "join", player }, Date.now()));
  }

  async webSocketMessage(socket: WebSocket, message: string | ArrayBuffer): Promise<void> {
    const userId = userOf(socket);
    if (!userId || !this.state) return;
    const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
    if (isTeam(this.state)) return this.teamMessage(socket, userId, raw);
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
    if (isTeam(this.state)) return this.teamAlarm();
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
    if (isTeam(this.state)) return this.applyTeam({ type: "disconnect", userId });
    await this.apply(reduce(this.state, { type: "disconnect", userId }, Date.now()));
  }

  // ── Team rooms (feature 039) ────────────────────────────────────────────────

  private async teamMessage(socket: WebSocket, userId: string, raw: string): Promise<void> {
    const frame = parseTeamFrame(raw);
    if (!frame) {
      if (new TextEncoder().encode(raw).length > MAX_FRAME_BYTES) socket.close(CLOSE_CODES.tooBig, "too big");
      return;
    }
    const now = Date.now();
    if (frame.type === "answer" || frame.type === "choose" || frame.type === "hint") {
      // Faster than a person could type: dropped, without touching storage (spec edge case).
      const recent = (this.recentAnswers.get(userId) ?? []).filter((at) => now - at < 1_000);
      if (recent.length >= MAX_ANSWERS_PER_SECOND) return;
      this.recentAnswers.set(userId, [...recent, now]);
    }
    if (frame.type === "typing") {
      // One typing signal per player and question.
      const key = `${userId}:${(this.state as TeamRoomState).round}:${frame.q}`;
      if (this.typed.has(key)) return;
      this.typed.add(key);
    }
    await this.applyTeam(toTeamEvent(userId, frame));
  }

  private async teamAlarm(): Promise<void> {
    let sizes: number[] | undefined;
    if (isTeam(this.state) && teamNeedsDecks(this.state)) {
      // Load content first, then read the state again: messages handled while D1 answers must not be lost.
      const pool = await this.loadPool(this.state.settings.level);
      if (!isTeam(this.state) || !teamNeedsDecks(this.state)) return;
      const decks = buildTeamDecks(this.state, pool);
      this.decks.clear();
      for (const [index, deck] of decks.entries()) {
        this.decks.set(index + 1, deck);
        await this.ctx.storage.put(deckKey(index + 1), deck);
      }
      sizes = decks.map((deck) => deck.length);
    }
    await this.applyTeam({ type: "tick" }, sizes);
  }

  /** A round's deck, from memory or, after a wake, from storage. */
  private async deck(round: number): Promise<ServerQuestion[] | undefined> {
    if (round < 1) return undefined;
    let deck = this.decks.get(round);
    if (!deck) {
      deck = await this.ctx.storage.get<ServerQuestion[]>(deckKey(round));
      if (deck) this.decks.set(round, deck);
    }
    return deck;
  }

  private async applyTeam(event: TeamRoomEvent, deckSizes?: number[]): Promise<void> {
    if (!isTeam(this.state)) return;
    const deck = await this.deck(deckRound(this.state));
    if (!isTeam(this.state)) return;
    await this.apply(reduceTeam(this.state, event, Date.now(), { deck, deckSizes }));
  }

  private async loadPool(level: ArenaSettings["level"]): Promise<ArenaPool> {
    if (this.pool?.level !== level) this.pool = { level, content: await loadArenaPool(this.db(), level) };
    return this.pool.content;
  }

  private db(): Db {
    return drizzle(this.env.DB, { schema }) as unknown as Db;
  }

  /** Saves the new state, carries out the effects and keeps the alarm in step. */
  private async apply(result: Result | TeamResult): Promise<void> {
    const before = this.state;
    const changed = result.state !== this.state;
    this.state = result.state;
    if (changed) await this.ctx.storage.put(STATE_KEY, result.state);
    // A new team match builds new decks: drop the last match's from memory.
    if (isTeam(this.state) && this.state.deckSizes.length === 0) this.decks.clear();
    for (const effect of result.effects) await this.run(effect);
    await this.syncAlarm();
    if (changed) await this.syncListing(Boolean(before?.public || this.state.public));
    if (this.state?.phase === "closed") {
      // Nothing left to keep: free the code and the storage.
      await this.ctx.storage.deleteAll();
      this.state = null;
      this.pool = null;
      this.decks.clear();
    }
  }

  /**
   * Keeps this room's "Cộng đồng" row in step (feature 041): written when what the list shows
   * changes, deleted when the room stops being listed. Only a room that is or was public touches
   * D1. A failed write is logged and retried on the next change; the room plays on either way.
   */
  private async syncListing(touchedPublic: boolean): Promise<void> {
    const next = listingOf(this.state);
    if (this.listed === undefined ? next === null && !touchedPublic : sameListing(this.listed, next)) return;
    try {
      if (next) await writeListing(this.db(), next, Date.now());
      else await removeListing(this.db(), this.code());
      this.listed = next;
    } catch (error) {
      console.error("Arena community listing not saved:", error);
    }
  }

  private code(): string {
    return this.state?.code ?? this.ctx.id.name ?? "";
  }

  private async syncAlarm(): Promise<void> {
    const next = !this.state ? null : isTeam(this.state) ? nextTeamAlarm(this.state) : nextAlarm(this.state);
    const current = await this.ctx.storage.getAlarm();
    if (next === current) return;
    // Each setAlarm is a row written on the free plan: only when the time changes.
    if (next === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(next);
  }

  private async run(effect: Effect | TeamEffect): Promise<void> {
    switch (effect.type) {
      case "broadcast": {
        if (!this.state) return;
        const frame: RoomFrame | TeamStateFrame = isTeam(this.state)
          ? { type: "team-state", room: toPublicTeam(this.state, this.decks.get(this.state.round)), serverNow: Date.now() }
          : { type: "state", room: toPublic(this.state), serverNow: Date.now() };
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
      case "record-team":
        // History only: a team match never changes the Arena record (AC-040).
        try {
          const { entries, members } = teamHistoryEntries(effect.match, crypto.randomUUID());
          await recordMatch(this.db(), entries, members);
        } catch (error) {
          console.error("Arena team history not saved:", error);
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

function sendTo(socket: WebSocket, frame: RoomFrame | TeamStateFrame): void {
  try {
    socket.send(JSON.stringify(frame));
  } catch {
    // A socket closing as we send: its close event handles the drop.
  }
}
