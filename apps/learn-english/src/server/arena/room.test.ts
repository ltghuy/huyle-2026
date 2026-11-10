// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POOL, rightAnswer } from "@/learning/arena/fixtures";
import { currentQuestion, type RoomState } from "@/learning/arena/machine";
import { CLOSE_CODES, type PublicRoom, type RoomFrame } from "@/learning/arena/protocol";
import type { ServerQuestion } from "@/learning/arena/questions";
import type { TeamRoomState } from "@/learning/arena/team-machine";
import type { PublicTeamRoom } from "@/learning/arena/team-protocol";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { ArenaRoom } from "./room";

const T0 = Date.parse("2026-11-04T10:00:00Z");
const MINH = { id: "minh", name: "Minh Anh", image: null };
const LAN = { id: "lan", name: "Lan", image: null };

class FakeSocket {
  readyState = 1; // OPEN
  sent: RoomFrame[] = [];
  closed: { code: number; reason: string } | null = null;
  private attachment: unknown = null;
  send(text: string) {
    this.sent.push(JSON.parse(text) as RoomFrame);
  }
  close(code: number, reason: string) {
    this.closed = { code, reason };
    this.readyState = 3;
  }
  serializeAttachment(value: unknown) {
    this.attachment = structuredClone(value);
  }
  deserializeAttachment() {
    return this.attachment;
  }
  /** The last full room view this socket received. */
  lastRoom(): PublicRoom {
    const states = this.sent.filter((f): f is Extract<RoomFrame, { type: "state" }> => f.type === "state");
    return states[states.length - 1].room;
  }
}

function fakeCtx() {
  const storage = new Map<string, unknown>();
  let alarm: number | null = null;
  const sockets: { socket: FakeSocket; tags: string[] }[] = [];
  const ctx = {
    storage: {
      get: async (key: string) => structuredClone(storage.get(key)),
      put: async (key: string, value: unknown) => void storage.set(key, structuredClone(value)),
      deleteAll: async () => storage.clear(),
      getAlarm: async () => alarm,
      setAlarm: async (at: number) => void (alarm = at),
      deleteAlarm: async () => void (alarm = null),
    },
    blockConcurrencyWhile: async (fn: () => Promise<void>) => fn(),
    acceptWebSocket: (socket: FakeSocket, tags: string[] = []) => void sockets.push({ socket, tags }),
    getWebSockets: (tag?: string) => sockets.filter((s) => (tag ? s.tags.includes(tag) : true) && s.socket.readyState === 1).map((s) => s.socket),
  };
  return { ctx, storage, alarm: () => alarm };
}

function seed(sqlite: ReturnType<typeof sqliteDb>["sqlite"]) {
  for (const [id, name] of [["minh", "Minh Anh"], ["lan", "Lan"]]) {
    sqlite.exec(`INSERT INTO user (id, name, email, created_at, updated_at) VALUES ('${id}', '${name}', '${id}@example.com', ${T0}, ${T0})`);
  }
  const insert = sqlite.prepare("INSERT INTO content_items (id, kind, level, topic, sort, body, deleted, updated_version) VALUES (?, ?, ?, NULL, 0, ?, 0, 1)");
  for (const item of [...POOL.words, ...POOL.sentences]) insert.run(item.id, item.kind, item.level, JSON.stringify(item.body));
}

let fake: ReturnType<typeof fakeCtx>;
let database: ReturnType<typeof sqliteDb>;
let room: ArenaRoom;

async function newRoom() {
  // A fresh object over the same storage: what the runtime does after hibernation.
  room = new ArenaRoom(fake.ctx as unknown as DurableObjectState, { DB: database.d1 } as CloudflareEnv);
  await Promise.resolve();
  return room;
}

async function connect(player: typeof MINH) {
  const socket = new FakeSocket();
  await room.accept(socket as unknown as WebSocket, player);
  return socket;
}

async function send(socket: FakeSocket, frame: object) {
  await room.webSocketMessage(socket as unknown as WebSocket, JSON.stringify(frame));
}

/** Moves the clock to the room's alarm and fires it. */
async function fireAlarm() {
  vi.setSystemTime(fake.alarm()!);
  await room.alarm();
}

function stored(): RoomState {
  return fake.storage.get("room") as RoomState;
}

beforeEach(async () => {
  vi.useFakeTimers();
  vi.setSystemTime(T0);
  fake = fakeCtx();
  database = sqliteDb();
  seed(database.sqlite);
  await newRoom();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("ArenaRoom", () => {
  it("claims a code once", async () => {
    expect(await room.create({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1, seconds: 15 }, creator: MINH })).toBe(true);
    expect(await room.create({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1, seconds: 15 }, creator: LAN })).toBe(false);
    expect(room.status()).toMatchObject({ phase: "lobby", creatorId: "minh", playerIds: ["minh"] });
  });

  it("lets a spectator watch and keeps a room saved before spectators existed working (feature 026)", async () => {
    await room.create({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1, seconds: 15 }, creator: MINH });
    const old = stored() as Partial<RoomState>;
    delete old.spectators;
    fake.storage.set("room", old);
    await newRoom();
    const minh = await connect(MINH);
    await connect(LAN);
    const khoa = await connect({ id: "khoa", name: "Khoa", image: null });
    expect(room.status()).toMatchObject({ playerIds: ["minh", "lan"], spectatorIds: ["khoa"] });
    expect(minh.lastRoom().spectators).toEqual([{ id: "khoa", name: "Khoa" }]);
    expect(khoa.lastRoom().players.map((p) => p.id)).toEqual(["minh", "lan"]);
    await room.webSocketClose(khoa as unknown as WebSocket);
    expect(minh.lastRoom().spectators).toEqual([]);
  });

  it("gives a room saved before question times existed 15 s per question (feature 028)", async () => {
    await room.create({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1, seconds: 45 }, creator: MINH });
    const old = stored();
    delete (old.settings as Partial<RoomState["settings"]>).seconds;
    fake.storage.set("room", old);
    await newRoom();
    const minh = await connect(MINH);
    expect(minh.lastRoom().settings.seconds).toBe(15);
    expect(room.status()?.settings.seconds).toBe(15);
  });

  it("refuses a socket to a room that doesn't exist", async () => {
    const socket = await connect(MINH);
    expect(socket.sent).toEqual([{ type: "error", message: "Phòng đã đóng." }]);
    expect(socket.closed?.code).toBe(CLOSE_CODES.roomClosed);
  });

  it("plays a 1-round match end to end, survives hibernation and records the result (AC-016, AC-022, AC-029)", async () => {
    await room.create({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1, seconds: 15 }, creator: MINH });
    const minh = await connect(MINH);
    const lan = await connect(LAN);
    expect(minh.lastRoom()).toMatchObject({ phase: "ready", players: [{ name: "Minh Anh" }, { name: "Lan" }] });

    await send(minh, { type: "ready" });
    await send(lan, { type: "ready" });
    expect(stored().phase).toBe("countdown");

    // The object is evicted between events: a new instance picks the state up from storage.
    await newRoom();
    await fireAlarm();
    expect(stored().phase).toBe("question");
    const view = lan.lastRoom();
    expect(view.question).toMatchObject({ type: "recall" });
    // Nothing a player received so far contains the answer (AC-019).
    const answer = (rightAnswer(currentQuestion(stored())!) as { text: string }).text;
    expect(JSON.stringify(lan.sent)).not.toContain(`"${answer}"`);

    // Minh answers every question first.
    while (stored().phase !== "match-end") {
      const state = stored();
      if (state.phase === "question") await send(minh, { type: "answer", q: state.questionIndex, text: (rightAnswer(currentQuestion(state)!) as { text: string }).text });
      else await fireAlarm();
    }
    expect(lan.lastRoom()).toMatchObject({ phase: "match-end", winnerId: "minh", endReason: "won" });
    expect(database.sqlite.prepare("SELECT user_id, wins, losses FROM arena_stats ORDER BY user_id").all()).toEqual([
      { user_id: "lan", wins: 0, losses: 1 },
      { user_id: "minh", wins: 1, losses: 0 },
    ]);
    // Both players' history entries, from each side, under one match id (feature 025, AC-001).
    const history = database.sqlite.prepare("SELECT match_id, user_id, opponent_name, won, rounds_won, opponent_rounds_won FROM arena_matches ORDER BY user_id").all() as Record<string, unknown>[];
    expect(history).toMatchObject([
      { user_id: "lan", opponent_name: "Minh Anh", won: 0, rounds_won: 0, opponent_rounds_won: 1 },
      { user_id: "minh", opponent_name: "Lan", won: 1, rounds_won: 1, opponent_rounds_won: 0 },
    ]);
    expect(history[0].match_id).toBe(history[1].match_id);
  });

  it("loads the new level's content when the creator changes it for a rematch (AC-031)", async () => {
    await room.create({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1, seconds: 15 }, creator: MINH });
    const minh = await connect(MINH);
    const lan = await connect(LAN);
    await send(minh, { type: "ready" });
    await send(lan, { type: "ready" });
    while (stored().phase !== "match-end") {
      const state = stored();
      if (state.phase === "question") await send(minh, { type: "answer", q: state.questionIndex, text: (rightAnswer(currentQuestion(state)!) as { text: string }).text });
      else await fireAlarm();
    }

    await send(minh, { type: "rematch" });
    await send(lan, { type: "rematch" });
    await send(lan, { type: "settings", settings: { mode: "recall", level: "A2", rounds: 1, seconds: 15 } });
    expect(lan.sent.at(-1)).toEqual({ type: "error", message: "Chỉ chủ phòng mới đổi được cài đặt." });
    await send(minh, { type: "settings", settings: { mode: "recall", level: "A2", rounds: 1, seconds: 15 } });
    expect(lan.lastRoom()).toMatchObject({ phase: "ready", settings: { level: "A2" } });

    // The A1 content from the first match stays in memory; A2 has none, so the room must not reuse it.
    await send(minh, { type: "ready" });
    await send(lan, { type: "ready" });
    await fireAlarm();
    expect(lan.sent).toContainEqual({ type: "error", message: "Trình độ này chưa đủ câu hỏi cho chế độ đã chọn." });
    expect(lan.closed?.code).toBe(CLOSE_CODES.roomClosed);
  });

  it("relays typing and wrong answers to the opponent without the text (AC-013)", async () => {
    await room.create({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1, seconds: 15 }, creator: MINH });
    const minh = await connect(MINH);
    const lan = await connect(LAN);
    await send(minh, { type: "ready" });
    await send(lan, { type: "ready" });
    await fireAlarm();

    await send(minh, { type: "typing", q: 0 });
    await send(minh, { type: "answer", q: 0, text: "secretguess" });
    expect(lan.sent).toContainEqual({ type: "typing", userId: "minh" });
    expect(lan.sent).toContainEqual({ type: "wrong", userId: "minh" });
    expect(minh.sent).not.toContainEqual({ type: "typing", userId: "minh" });
    expect(JSON.stringify(lan.sent)).not.toContain("secretguess");
  });

  it("keeps a player in when a newer tab replaces the old one, and pauses only on their last socket closing", async () => {
    await room.create({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1, seconds: 15 }, creator: MINH });
    const minh = await connect(MINH);
    const lan = await connect(LAN);
    await send(minh, { type: "ready" });
    await send(lan, { type: "ready" });
    await fireAlarm();

    vi.setSystemTime(Date.now() + 1_000);
    const lanAgain = await connect(LAN);
    expect(lan.closed?.code).toBe(CLOSE_CODES.replaced);
    await room.webSocketClose(lan as unknown as WebSocket);
    expect(stored().phase).toBe("question");

    await room.webSocketClose(lanAgain as unknown as WebSocket);
    lanAgain.readyState = 3;
    expect(stored()).toMatchObject({ phase: "paused", pausedFor: "lan" });
    expect(minh.lastRoom()).toMatchObject({ phase: "paused", pausedFor: "lan" });
  });

  it("ignores frames it can't read and closes a socket that sends an oversized one", async () => {
    await room.create({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1, seconds: 15 }, creator: MINH });
    const minh = await connect(MINH);
    const before = stored();
    await room.webSocketMessage(minh as unknown as WebSocket, "not json");
    expect(stored()).toEqual(before);
    await room.webSocketMessage(minh as unknown as WebSocket, JSON.stringify({ type: "leave", pad: "x".repeat(3_000) }));
    expect(minh.closed?.code).toBe(CLOSE_CODES.tooBig);
  });

  it("sets the alarm only when the next deadline changes, and frees its storage when the room closes", async () => {
    await room.create({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1, seconds: 15 }, creator: MINH });
    const minh = await connect(MINH);
    expect(fake.alarm()).toBe(stored().idleUntil);
    await send(minh, { type: "leave" });
    expect(minh.closed?.code).toBe(CLOSE_CODES.roomClosed);
    expect(fake.storage.size).toBe(0);
    expect(fake.alarm()).toBeNull();
    expect(room.status()).toBeNull();
  });
});

describe("ArenaRoom team rooms (feature 039)", () => {
  const TEAM = { mode: "recall", level: "A1", rounds: 1, seconds: 15, size: 4, minutes: 5 } as const;

  function lastTeamRoom(socket: FakeSocket): PublicTeamRoom {
    const states = (socket.sent as unknown as { type: string; room: PublicTeamRoom }[]).filter((f) => f.type === "team-state");
    return states[states.length - 1].room;
  }

  async function startedTeamRoom() {
    await room.createTeam({ code: "K7P2QX", settings: TEAM, host: MINH });
    const minh = await connect(MINH);
    const lan = await connect(LAN);
    await send(minh, { type: "assign", userId: "minh", team: "A" });
    await send(minh, { type: "assign", userId: "lan", team: "B" });
    await send(minh, { type: "start" });
    await fireAlarm();
    return { minh, lan };
  }

  const teamState = () => fake.storage.get("room") as TeamRoomState;

  it("claims a code and reports itself as a team room with its size", async () => {
    expect(await room.createTeam({ code: "K7P2QX", settings: TEAM, host: MINH })).toBe(true);
    expect(await room.create({ code: "K7P2QX", settings: { mode: "recall", level: "A1", rounds: 1, seconds: 15 }, creator: LAN })).toBe(false);
    expect(room.status()).toEqual({ kind: "team", phase: "lobby", creatorId: "minh", playerIds: ["minh"], spectatorIds: [], settings: TEAM });
  });

  it("builds and stores the round decks once, and sends team views without the answer", async () => {
    const { lan } = await startedTeamRoom();
    expect(fake.storage.get("deck:1")).toHaveLength(83);
    const view = lastTeamRoom(lan);
    expect(view).toMatchObject({ kind: "team", phase: "question", turn: { team: "A", userId: "minh" }, reveal: null });
    expect(view.question?.type).toBe("recall");
  });

  it("plays on after hibernation, reading the deck back from storage", async () => {
    const { minh } = await startedTeamRoom();
    const deck = fake.storage.get("deck:1") as ServerQuestion[];
    await newRoom();
    await send(minh, { type: "answer", q: 1, text: (rightAnswer(deck[0]) as { text: string }).text });
    expect(teamState()).toMatchObject({ phase: "reveal", scores: { A: 1, B: 0 } });
  });

  it("writes nothing for typing or a wrong typed answer", async () => {
    const { minh } = await startedTeamRoom();
    const before = teamState();
    await send(minh, { type: "typing", q: 1 });
    await send(minh, { type: "answer", q: 1, text: "zzzz" });
    expect(teamState()).toEqual(before);
    expect(minh.sent.at(-1)).toEqual({ type: "wrong", userId: "minh" });
  });

  it("drops answers faster than a person could type, without writing", async () => {
    const { minh } = await startedTeamRoom();
    for (let i = 0; i < 8; i++) await send(minh, { type: "answer", q: 1, text: `zzzz${i}` });
    expect(minh.sent.filter((f) => f.type === "wrong")).toHaveLength(5);
  });

  it("saves the finished match to history only", async () => {
    const { minh } = await startedTeamRoom();
    const deck = fake.storage.get("deck:1") as ServerQuestion[];
    await send(minh, { type: "answer", q: 1, text: (rightAnswer(deck[0]) as { text: string }).text });
    // Let the round clock run out, then play the turns it takes to end.
    for (let i = 0; i < 400 && teamState().phase !== "match-end"; i++) await fireAlarm();
    expect(teamState()).toMatchObject({ phase: "match-end", winner: "A" });
    expect(database.sqlite.prepare("SELECT user_id, kind, team, won FROM arena_matches ORDER BY user_id").all()).toEqual([
      { user_id: "lan", kind: "team", team: "B", won: 0 },
      { user_id: "minh", kind: "team", team: "A", won: 1 },
    ]);
    expect(database.sqlite.prepare("SELECT count(*) AS n FROM arena_match_players").get()).toEqual({ n: 2 });
    expect(database.sqlite.prepare("SELECT count(*) AS n FROM arena_stats").get()).toEqual({ n: 0 });
  });

  it("ends on a forfeit when a whole team leaves, then deletes the decks when the room closes", async () => {
    const { minh } = await startedTeamRoom();
    await send(minh, { type: "leave" });
    expect(teamState()).toMatchObject({ phase: "paused", pausedTeam: "A" });
    await fireAlarm();
    expect(teamState()).toMatchObject({ phase: "match-end", winner: "B", endReason: "forfeit" });
    await fireAlarm(); // the idle close
    expect(fake.storage.size).toBe(0);
  });
});
