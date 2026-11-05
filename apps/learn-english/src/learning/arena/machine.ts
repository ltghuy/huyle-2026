// The Arena room's rules (feature 023) as a pure state machine. The room
// (Durable Object) feeds it events with the time, saves the state it returns,
// carries out its effects and sets one alarm at `nextAlarm(state)`, which comes
// back as a `tick`. Nothing here touches sockets, storage or the clock.
//
// Every question of the match is built when the countdown ends and kept in the
// state, so the room loads a level's content once per match (`needsPool`), not
// after every wake-up from hibernation.
//
// T005: room, lobby and the Ready window. T006: play. T007: drops during a
// match (pause, resume, forfeit), a second tab, and rematch.
import { createRng, randomInt } from "../exercises/random";
import { CLOSE_CODES, type ArenaSettings, type Phase, type PublicRoom, type RoomFrame, type RoundResult } from "./protocol";
import { buildRound, isCorrect, MAX_SUDDEN_DEATH, publicView, QUESTION_SECONDS, revealOf, ROUND_SIZE, type ArenaAnswer, type ArenaPool, type ServerQuestion } from "./questions";

/** The 30-second Ready window (AC-007). */
export const READY_MS = 30_000;
/** "3, 2, 1" before the first question (AC-008). */
export const COUNTDOWN_MS = 3_000;
/** The answer stays on screen this long before the next question (AC-018). */
export const REVEAL_MS = 3_000;
/** The round result stays on screen this long before the next round. */
export const ROUND_RESULT_MS = 5_000;
/** How long a player may be gone before counting as having left (AC-024; lobby too, decisions.md). */
export const GRACE_MS = 30_000;
/** A room that hasn't started a match by then closes (spec edge case). */
export const IDLE_MS = 10 * 60_000;
/** Answers a player may send per second; more are dropped (spec edge case). */
export const MAX_ANSWERS_PER_SECOND = 5;

export const MESSAGES = {
  full: "Phòng đã đủ người.",
  started: "Trận đấu đã bắt đầu, bạn không vào được nữa.",
  closed: "Phòng đã đóng.",
  creatorOnly: "Chỉ chủ phòng mới bắt đầu được.",
  creatorSettings: "Chỉ chủ phòng mới đổi được cài đặt.",
  noQuestions: "Trình độ này chưa đủ câu hỏi cho chế độ đã chọn.",
} as const;

export interface PlayerIdentity {
  id: string;
  name: string;
  image: string | null;
}

export interface Player extends PlayerIdentity {
  connected: boolean;
  ready: boolean;
  /** Points in the current round. */
  score: number;
  roundsWon: number;
  /** Time (ms) this player took on the questions they won this round: the last tie-break. */
  answerMs: number;
  /** Epoch ms after which a disconnected player counts as gone; null while connected. */
  goneAt: number | null;
  /** When this player's recent answers arrived, for the flood limit. */
  recentAnswers: number[];
}

/** One round's questions: 12, then the sudden-death ones a tie may need. */
export interface RoundQuestions {
  main: ServerQuestion[];
  suddenDeath: ServerQuestion[];
}

export interface RoomState {
  code: string;
  settings: ArenaSettings;
  creatorId: string;
  phase: Phase;
  players: Player[];
  /** Epoch ms when the current phase ends (Ready window, countdown, question, …); null when nothing counts down. */
  deadline: number | null;
  /** Epoch ms when an unstarted room closes; null once a match is under way. */
  idleUntil: number | null;
  /** Seed for the match's questions. */
  seed: number;
  /** The match's questions, built when the countdown ends; empty before. */
  questions: RoundQuestions[];
  /** 1-based; 0 before the first round. */
  round: number;
  /** Question in the round: 0–11, then 12+ for sudden death. */
  questionIndex: number;
  /** Sudden-death questions asked this round. */
  suddenDeath: number;
  questionStartedAt: number | null;
  /** Who answered the current question first; null while open or when nobody did. */
  answeredBy: string | null;
  /** Players locked out of the current question by a wrong pick (AC-014). */
  lockedOut: string[];
  /** Players whose "typing" was already relayed for this question. */
  typing: string[];
  rounds: RoundResult[];
  winnerId: string | null;
  endReason: "won" | "forfeit" | "cancelled" | null;
  /** The player the paused match waits for, and the phase it was in (AC-024). */
  pausedFor: string | null;
  pausedFrom: Phase | null;
  /** Players who asked for a rematch (AC-027). */
  rematch: string[];
}

export type RoomEvent =
  | { type: "join"; player: PlayerIdentity }
  | { type: "disconnect"; userId: string }
  | { type: "leave"; userId: string }
  | { type: "ready"; userId: string }
  | { type: "start"; userId: string }
  | { type: "typing"; userId: string; q: number }
  | { type: "answer"; userId: string; q: number; answer: ArenaAnswer }
  | { type: "rematch"; userId: string }
  | { type: "settings"; userId: string; settings: ArenaSettings }
  | { type: "tick" };

export type Effect =
  /** Send the whole room view (`state` frame) to every connected player. */
  | { type: "broadcast" }
  /** Send one frame to one player, to everyone, or to everyone but `except`. */
  | { type: "send"; to: string; frame: RoomFrame }
  | { type: "send-all"; frame: RoomFrame }
  | { type: "send-others"; except: string; frame: RoomFrame }
  /** Close a player's socket (with a message first, if given), or everyone's when `userId` is null. */
  | { type: "close"; userId: string | null; code: number; message?: string }
  /** The player opened the room again (another tab): close their older sockets with 4001, keep the newest. */
  | { type: "replace"; userId: string }
  /** Save the match result to both players' stats (AC-029) and history (feature 025). */
  | { type: "record"; winnerId: string; loserId: string; match: FinishedMatch };

/** What the history keeps of a match that ended with a winner (feature 025, AC-001). */
export interface FinishedMatch {
  endedAt: number;
  reason: "won" | "forfeit";
  settings: ArenaSettings;
  winnerId: string;
  players: (PlayerIdentity & { roundsWon: number })[];
  /** The rounds that finished; a forfeit can end the match mid-round. */
  rounds: RoundResult[];
}

export interface Result {
  state: RoomState;
  effects: Effect[];
}

export function createRoom(input: { code: string; settings: ArenaSettings; creator: PlayerIdentity; seed: number; now: number }): RoomState {
  return {
    code: input.code,
    settings: input.settings,
    creatorId: input.creator.id,
    phase: "lobby",
    // The creator is in the room from the start but connects a moment later, with the grace of a drop.
    players: [newPlayer(input.creator, input.now)],
    deadline: null,
    idleUntil: input.now + IDLE_MS,
    seed: input.seed,
    questions: [],
    round: 0,
    questionIndex: 0,
    suddenDeath: 0,
    questionStartedAt: null,
    answeredBy: null,
    lockedOut: [],
    typing: [],
    rounds: [],
    winnerId: null,
    endReason: null,
    pausedFor: null,
    pausedFrom: null,
    rematch: [],
  };
}

function newPlayer(identity: PlayerIdentity, now: number): Player {
  return { ...identity, connected: false, ready: false, score: 0, roundsWon: 0, answerMs: 0, goneAt: now + GRACE_MS, recentAnswers: [] };
}

const unchanged = (state: RoomState): Result => ({ state, effects: [] });
const broadcast = (state: RoomState, ...more: Effect[]): Result => ({ state, effects: [{ type: "broadcast" }, ...more] });

function withPlayer(state: RoomState, userId: string, change: (player: Player) => Player): RoomState {
  return { ...state, players: state.players.map((player) => (player.id === userId ? change(player) : player)) };
}

function closeRoom(state: RoomState, message: string): Result {
  return {
    state: { ...state, phase: "closed", deadline: null, idleUntil: null, endReason: state.endReason ?? "cancelled" },
    effects: [{ type: "broadcast" }, { type: "close", userId: null, code: CLOSE_CODES.roomClosed, message }],
  };
}

// ── Lobby and the Ready window (T005) ─────────────────────────────────────────

/** Opens the Ready window with nobody ready (AC-007, AC-009). */
function openReadyWindow(state: RoomState, now: number): RoomState {
  return { ...state, phase: "ready", deadline: now + READY_MS, players: state.players.map((player) => ({ ...player, ready: false })) };
}

function join(state: RoomState, identity: PlayerIdentity, now: number): Result {
  const seat = state.players.find((player) => player.id === identity.id);
  if (seat) {
    // Back from a drop, the creator's first connection, or another tab: the same seat, never a second
    // one (spec edge cases). A second tab replaces the first.
    const back = withPlayer(state, identity.id, (player) => ({ ...player, name: identity.name, image: identity.image, connected: true, goneAt: null }));
    const effects: Effect[] = seat.connected ? [{ type: "replace", userId: identity.id }] : [];
    if (state.phase === "paused" && state.pausedFor === identity.id) return { state: resume(back, now), effects: [...effects, { type: "broadcast" }] };
    return { state: back, effects: [...effects, { type: "broadcast" }] };
  }
  const reject = (message: string): Result => ({ state, effects: [{ type: "close", userId: identity.id, code: CLOSE_CODES.roomClosed, message }] });
  if (state.phase === "closed") return reject(MESSAGES.closed);
  if (state.phase !== "lobby") return reject(state.players.length >= 2 ? MESSAGES.full : MESSAGES.started);
  if (state.players.length >= 2) return reject(MESSAGES.full);
  const joined: RoomState = { ...state, players: [...state.players, { ...newPlayer(identity, now), connected: true, goneAt: null }] };
  return broadcast(openReadyWindow(joined, now));
}

/** A player left on purpose or didn't come back in time: before the match the creator closes the room (AC-010). */
function removePlayer(state: RoomState, userId: string): Result {
  if (!state.players.some((player) => player.id === userId)) return unchanged(state);
  if (userId === state.creatorId) return closeRoom(state, MESSAGES.closed);
  const players = state.players.filter((player) => player.id !== userId);
  return {
    state: { ...state, phase: "lobby", deadline: null, players: players.map((player) => ({ ...player, ready: false })) },
    effects: [{ type: "broadcast" }, { type: "close", userId, code: CLOSE_CODES.roomClosed }],
  };
}

const BEFORE_MATCH: ReadonlySet<Phase> = new Set(["lobby", "ready"]);

function pressReady(state: RoomState, userId: string, now: number): Result {
  if (state.phase !== "ready" || !state.players.some((p) => p.id === userId)) return unchanged(state);
  const next = withPlayer(state, userId, (p) => ({ ...p, ready: !p.ready }));
  const allReady = next.players.length === 2 && next.players.every((p) => p.ready && p.connected);
  if (!allReady) return broadcast(next);
  // Both ready: the match is on, the room no longer idles (AC-008).
  return broadcast({ ...next, phase: "countdown", deadline: now + COUNTDOWN_MS, idleUntil: null });
}

function sameSettings(a: ArenaSettings, b: ArenaSettings): boolean {
  return a.mode === b.mode && a.level === b.level && a.rounds === b.rounds;
}

/**
 * The creator changes the mode, level or rounds before a match, e.g. for a rematch (AC-031).
 * Nobody stays ready for settings they didn't agree to: an open Ready window starts again.
 */
function changeSettings(state: RoomState, userId: string, settings: ArenaSettings, now: number): Result {
  if (!BEFORE_MATCH.has(state.phase) || !state.players.some((p) => p.id === userId)) return unchanged(state);
  if (userId !== state.creatorId) return { state, effects: [{ type: "send", to: userId, frame: { type: "error", message: MESSAGES.creatorSettings } }] };
  if (sameSettings(state.settings, settings)) return unchanged(state);
  const changed: RoomState = { ...state, settings };
  return broadcast(state.phase === "ready" ? openReadyWindow(changed, now) : changed);
}

// ── Drops during a match, and rematch (T007) ──────────────────────────────────

const IN_PLAY: ReadonlySet<Phase> = new Set(["countdown", "question", "reveal", "round-end"]);

/** A player dropped mid-match: everything waits up to 30 s for them (AC-024). */
function pause(state: RoomState, userId: string, now: number): RoomState {
  return { ...state, phase: "paused", pausedFor: userId, pausedFrom: state.phase, deadline: now + GRACE_MS, typing: [] };
}

/**
 * They are back: an interrupted question starts again with its full time and nobody locked out
 * (AC-025); a countdown, reveal or round result simply runs again.
 */
function resume(state: RoomState, now: number): RoomState {
  const from = state.pausedFrom ?? "question";
  const resumed: RoomState = { ...state, pausedFor: null, pausedFrom: null };
  if (from === "question") return openQuestion(resumed, state.questionIndex, now);
  const length = from === "countdown" ? COUNTDOWN_MS : from === "reveal" ? REVEAL_MS : ROUND_RESULT_MS;
  return { ...resumed, phase: from, deadline: now + length };
}

/** The player who stayed wins the match (AC-026). */
function forfeit(state: RoomState, loserId: string, now: number): Result {
  const winner = state.players.find((p) => p.id !== loserId);
  if (!winner) return closeRoom(state, MESSAGES.closed);
  return endMatch({ ...state, pausedFor: null, pausedFrom: null }, winner.id, "forfeit", now);
}

function disconnect(state: RoomState, userId: string, now: number): Result {
  if (!state.players.find((p) => p.id === userId)?.connected) return unchanged(state);
  const dropped = withPlayer(state, userId, (p) => ({ ...p, connected: false, goneAt: now + GRACE_MS }));
  if (IN_PLAY.has(state.phase)) return broadcast(pause(dropped, userId, now));
  return broadcast(dropped);
}

/** Both players asked: same room and settings, new questions, a new Ready window (AC-027). */
function askRematch(state: RoomState, userId: string, now: number): Result {
  if (state.phase !== "match-end" || state.endReason === "cancelled" || state.rematch.includes(userId)) return unchanged(state);
  if (!state.players.some((p) => p.id === userId)) return unchanged(state);
  const asked: RoomState = { ...state, rematch: [...state.rematch, userId] };
  if (!asked.players.every((p) => asked.rematch.includes(p.id) && p.connected)) return broadcast(asked);
  const fresh: RoomState = {
    ...asked,
    seed: randomInt(createRng(state.seed), 2 ** 31),
    questions: [],
    round: 0,
    questionIndex: 0,
    suddenDeath: 0,
    answeredBy: null,
    lockedOut: [],
    typing: [],
    rounds: [],
    winnerId: null,
    endReason: null,
    rematch: [],
    idleUntil: now + IDLE_MS,
    players: asked.players.map((p) => ({ ...p, score: 0, roundsWon: 0, answerMs: 0, recentAnswers: [] })),
  };
  return broadcast(openReadyWindow(fresh, now));
}

// ── The match (T006) ──────────────────────────────────────────────────────────

/** Rounds a player needs: 1 of 1, or 2 of 3 (AC-022). */
function roundsToWin(state: RoomState): number {
  return Math.floor(state.settings.rounds / 2) + 1;
}

/** Whether the room must be given the level's content before the next tick: the countdown is ending and nothing is built yet. */
export function needsPool(state: RoomState): boolean {
  return state.phase === "countdown" && state.questions.length === 0;
}

/** Every round's questions, from the match seed; an item is reused across rounds only when the level runs short. */
function buildMatch(state: RoomState, pool: ArenaPool): RoundQuestions[] | null {
  const rng = createRng(state.seed);
  const asked = new Set<string>();
  const rounds: RoundQuestions[] = [];
  for (let r = 0; r < state.settings.rounds; r++) {
    const main = buildRound(pool, state.settings.mode, randomInt(rng, 2 ** 31), ROUND_SIZE, asked);
    main.forEach((q) => asked.add(q.itemId));
    const suddenDeath = buildRound(pool, state.settings.mode, randomInt(rng, 2 ** 31), MAX_SUDDEN_DEATH, asked);
    suddenDeath.forEach((q) => asked.add(q.itemId));
    if (main.length < ROUND_SIZE || suddenDeath.length < MAX_SUDDEN_DEATH) return null;
    rounds.push({ main, suddenDeath });
  }
  return rounds;
}

export function currentQuestion(state: RoomState): ServerQuestion | null {
  const round = state.questions[state.round - 1];
  if (!round) return null;
  return state.questionIndex < ROUND_SIZE ? (round.main[state.questionIndex] ?? null) : (round.suddenDeath[state.questionIndex - ROUND_SIZE] ?? null);
}

/** Opens question `index` of the current round with its type's time (AC-012). */
function openQuestion(state: RoomState, index: number, now: number): RoomState {
  const opened: RoomState = { ...state, phase: "question", questionIndex: index, questionStartedAt: now, answeredBy: null, lockedOut: [], typing: [] };
  const question = currentQuestion(opened)!;
  return { ...opened, deadline: now + QUESTION_SECONDS[question.type] * 1_000 };
}

function startRound(state: RoomState, round: number, now: number): RoomState {
  const reset: RoomState = { ...state, round, suddenDeath: 0, players: state.players.map((p) => ({ ...p, score: 0, answerMs: 0, recentAnswers: [] })) };
  return openQuestion(reset, 0, now);
}

/** Ends the question: show the answer to both, with who scored or nobody (AC-016–AC-018). */
function reveal(state: RoomState, answeredBy: string | null, now: number): RoomState {
  return { ...state, phase: "reveal", answeredBy, deadline: now + REVEAL_MS };
}

/** The round's winner by points, or by the tie-break once sudden death is spent: less time on won questions, then the seed. */
function roundWinner(state: RoomState, tieBreak: boolean): string | null {
  const [a, b] = state.players;
  if (a.score !== b.score) return a.score > b.score ? a.id : b.id;
  if (!tieBreak) return null;
  if (a.answerMs !== b.answerMs) return a.answerMs < b.answerMs ? a.id : b.id;
  return randomInt(createRng(state.seed + state.round), 2) === 0 ? a.id : b.id;
}

function endRound(state: RoomState, winnerId: string, now: number): Result {
  const result: RoundResult = {
    round: state.round,
    scores: Object.fromEntries(state.players.map((p) => [p.id, p.score])),
    winnerId,
    ...(state.suddenDeath > 0 ? { suddenDeath: true } : {}),
  };
  const next: RoomState = {
    ...state,
    rounds: [...state.rounds, result],
    players: state.players.map((p) => (p.id === winnerId ? { ...p, roundsWon: p.roundsWon + 1 } : p)),
  };
  const champion = next.players.find((p) => p.roundsWon >= roundsToWin(next));
  if (champion) return endMatch(next, champion.id, "won", now);
  return broadcast({ ...next, phase: "round-end", deadline: now + ROUND_RESULT_MS, questionStartedAt: null });
}

function endMatch(state: RoomState, winnerId: string, reason: "won" | "forfeit", now: number): Result {
  const loserId = state.players.find((p) => p.id !== winnerId)!.id;
  // A finished room closes after a while unless they play again (T007 rematch).
  const ended: RoomState = { ...state, phase: "match-end", deadline: null, idleUntil: now + IDLE_MS, winnerId, endReason: reason, questionStartedAt: null };
  const match: FinishedMatch = {
    endedAt: now,
    reason,
    settings: state.settings,
    winnerId,
    players: state.players.map(({ id, name, image, roundsWon }) => ({ id, name, image, roundsWon })),
    rounds: state.rounds,
  };
  return broadcast(ended, { type: "record", winnerId, loserId, match });
}

/** After a reveal: the next question, sudden death, or the end of the round. */
function afterReveal(state: RoomState, now: number): Result {
  if (state.questionIndex >= ROUND_SIZE) {
    // Sudden death: the first correct answer takes the round (AC-021).
    if (state.answeredBy) return endRound(state, state.answeredBy, now);
    if (state.suddenDeath < MAX_SUDDEN_DEATH) return broadcast(openQuestion({ ...state, suddenDeath: state.suddenDeath + 1 }, ROUND_SIZE + state.suddenDeath, now));
    return endRound(state, roundWinner(state, true)!, now);
  }
  if (state.questionIndex + 1 < ROUND_SIZE) return broadcast(openQuestion(state, state.questionIndex + 1, now));
  const winner = roundWinner(state, false);
  if (winner) return endRound(state, winner, now);
  return broadcast(openQuestion({ ...state, suddenDeath: 1 }, ROUND_SIZE, now));
}

function relayTyping(state: RoomState, userId: string, q: number): Result {
  if (state.phase !== "question" || q !== state.questionIndex || state.typing.includes(userId)) return unchanged(state);
  if (!state.players.some((p) => p.id === userId)) return unchanged(state);
  // Once per question: the opponent sees a typing dot, never the text (AC-013).
  return { state: { ...state, typing: [...state.typing, userId] }, effects: [{ type: "send-others", except: userId, frame: { type: "typing", userId } }] };
}

function answer(state: RoomState, userId: string, q: number, given: ArenaAnswer, now: number): Result {
  const player = state.players.find((p) => p.id === userId);
  const question = currentQuestion(state);
  // Late, stale or locked-out answers are ignored; the deadline counts even if the alarm is late (AC-016 edge cases).
  if (!player || !question || state.phase !== "question" || q !== state.questionIndex) return unchanged(state);
  if (state.deadline !== null && now >= state.deadline) return unchanged(state);
  if (state.lockedOut.includes(userId)) return unchanged(state);

  const recent = player.recentAnswers.filter((at) => now - at < 1_000);
  if (recent.length >= MAX_ANSWERS_PER_SECOND) return unchanged(state);
  const counted = withPlayer(state, userId, (p) => ({ ...p, recentAnswers: [...recent, now] }));

  if (isCorrect(question, given)) {
    const scored = withPlayer(counted, userId, (p) => ({ ...p, score: p.score + 1, answerMs: p.answerMs + (now - (state.questionStartedAt ?? now)) }));
    return broadcast(reveal(scored, userId, now));
  }

  const wrong: Effect = { type: "send-all", frame: { type: "wrong", userId } };
  if (question.type !== "listen") return { state: counted, effects: [wrong] };
  // A wrong pick locks the player out of this question; when everyone is locked out it ends (AC-014).
  const locked: RoomState = { ...counted, lockedOut: [...counted.lockedOut, userId] };
  if (locked.players.every((p) => locked.lockedOut.includes(p.id))) return broadcast(reveal(locked, null, now));
  return broadcast(locked, wrong);
}

function tick(state: RoomState, now: number, pool?: ArenaPool): Result {
  if (state.phase === "closed") return unchanged(state);
  if (state.idleUntil !== null && now >= state.idleUntil && (BEFORE_MATCH.has(state.phase) || state.phase === "match-end")) {
    return closeRoom(state, MESSAGES.closed);
  }

  // Players whose grace ran out leave, before anything else happens.
  const gone = state.players.find((p) => !p.connected && p.goneAt !== null && now >= p.goneAt);
  if (gone && BEFORE_MATCH.has(state.phase)) {
    const removed = removePlayer(state, gone.id);
    const rest = tick(removed.state, now, pool);
    return { state: rest.state, effects: [...removed.effects, ...rest.effects] };
  }

  if (state.deadline === null || now < state.deadline) return unchanged(state);
  switch (state.phase) {
    case "ready":
      // Window over without both ready: back to the lobby, the creator may start again (AC-009).
      return broadcast({ ...state, phase: "lobby", deadline: null, players: state.players.map((player) => ({ ...player, ready: false })) });
    case "countdown": {
      if (!pool) throw new Error("The Arena room must load the level's content before the countdown ends (needsPool).");
      const questions = buildMatch(state, pool);
      if (!questions) return closeRoom(state, MESSAGES.noQuestions);
      return broadcast(startRound({ ...state, questions }, 1, now));
    }
    case "question":
      // Time is up and nobody was right: no point (AC-017).
      return broadcast(reveal(state, null, now));
    case "reveal":
      return afterReveal(state, now);
    case "round-end":
      return broadcast(startRound(state, state.round + 1, now));
    case "paused":
      // Not back in 30 s: the player who stayed wins (AC-026).
      return forfeit(state, state.pausedFor!, now);
    default:
      return unchanged(state);
  }
}

/**
 * Applies one event at time `now`. `pool` is the room's level content; it is needed only when
 * `needsPool(state)` is true and a tick may end the countdown.
 */
export function reduce(state: RoomState, event: RoomEvent, now: number, pool?: ArenaPool): Result {
  switch (event.type) {
    case "join":
      return join(state, event.player, now);
    case "disconnect":
      return disconnect(state, event.userId, now);
    case "leave":
      if (BEFORE_MATCH.has(state.phase)) return removePlayer(state, event.userId);
      // Leaving mid-match on purpose is a forfeit, so quitting can't dodge a loss.
      if (IN_PLAY.has(state.phase) || state.phase === "paused") return forfeit(state, event.userId, now);
      return unchanged(state);
    case "rematch":
      return askRematch(state, event.userId, now);
    case "settings":
      return changeSettings(state, event.userId, event.settings, now);
    case "ready":
      return pressReady(state, event.userId, now);
    case "start": {
      if (state.phase !== "lobby" || state.players.length !== 2) return unchanged(state);
      if (event.userId !== state.creatorId) return { state, effects: [{ type: "send", to: event.userId, frame: { type: "error", message: MESSAGES.creatorOnly } }] };
      return broadcast(openReadyWindow(state, now));
    }
    case "typing":
      return relayTyping(state, event.userId, event.q);
    case "answer":
      return answer(state, event.userId, event.q, event.answer, now);
    case "tick":
      return tick(state, now, pool);
  }
}

/** When the room must wake next: the phase deadline, a grace running out, or the idle close. */
export function nextAlarm(state: RoomState): number | null {
  if (state.phase === "closed") return null;
  const times = [state.deadline, state.idleUntil, ...state.players.map((p) => (p.connected ? null : p.goneAt))].filter((t): t is number => t !== null);
  return times.length > 0 ? Math.min(...times) : null;
}

const OPEN_QUESTION: ReadonlySet<Phase> = new Set(["question", "reveal"]);

/** The room as players see it: the open question without its answer, and the answer only in the reveal (AC-019). */
export function toPublic(state: RoomState): PublicRoom {
  const question = OPEN_QUESTION.has(state.phase) ? currentQuestion(state) : null;
  return {
    code: state.code,
    settings: state.settings,
    creatorId: state.creatorId,
    phase: state.phase,
    players: state.players.map(({ id, name, image, connected, ready, score, roundsWon }) => ({ id, name, image, connected, ready, score, roundsWon })),
    round: state.round,
    questionIndex: state.questionIndex,
    questionCount: ROUND_SIZE,
    suddenDeath: state.suddenDeath,
    deadline: state.deadline,
    question: question ? publicView(question) : null,
    questionType: question?.type ?? null,
    lockedOut: [...state.lockedOut],
    reveal: question && state.phase === "reveal" ? revealOf(question, state.answeredBy) : null,
    rounds: [...state.rounds],
    pausedFor: state.pausedFor,
    winnerId: state.winnerId,
    endReason: state.endReason,
    rematch: [...state.rematch],
  };
}
