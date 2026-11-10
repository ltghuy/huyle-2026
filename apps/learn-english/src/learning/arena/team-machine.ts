// The rules of a team room ("Đấu đội", feature 039) as a pure state machine,
// the team counterpart of ./machine.ts. The room (Durable Object) feeds it
// events with the time, saves the state it returns, carries out its effects
// and keeps one alarm at `nextTeamAlarm(state)`, which comes back as a `tick`.
//
// A round's questions are not in the state: a timed round can ask a few
// hundred, so the room builds one deck per round when the countdown ends
// (`teamNeedsDecks`, `buildTeamDecks`), stores each deck on its own, and
// passes the deck of `deckRound(state)` to every call that needs a question.
//
// Flood limits and the once-per-question typing signal live in the room, in
// memory: they change nothing worth saving.
import { createRng, randomInt, shuffle } from "../exercises/random";
import { CLOSE_CODES, questionMs, type RoomFrame } from "./protocol";
import { buildDeck, hintMask, isCorrect, publicView, revealOf, type ArenaAnswer, type ArenaPool, type ServerQuestion } from "./questions";
import { roundMs, type PublicTeamRoom, type Stage, type Team, type TeamPhase, type TeamRoundResult, type TeamSettings } from "./team-protocol";

/** "3, 2, 1" before the first question. */
export const TEAM_COUNTDOWN_MS = 3_000;
/** The answer shows this long before the next turn (AC-025). */
export const TEAM_REVEAL_MS = 2_000;
/** The round result stays on screen this long before the next round. */
export const TEAM_ROUND_RESULT_MS = 5_000;
/** How long a player may be gone from the lobby, or a whole team from a match, before it counts (AC-045). */
export const TEAM_GRACE_MS = 30_000;
/** A room that hasn't started, or a finished one nobody plays again, closes after this. */
export const TEAM_IDLE_MS = 10 * 60_000;
/** The quickest a turn can take (a fast answer and the reveal): sets how many questions a round's deck holds. */
export const MIN_TURN_MS = 4_000;
/** Questions a deck keeps after the timed ones: three sudden-death pairs and one spare. */
export const DECK_SPARE = 8;
/** Sudden-death pairs before a round is a draw (AC-037). */
export const MAX_SUDDEN_PAIRS = 3;

export const TEAM_MESSAGES = {
  full: "Phòng đã đủ người.",
  started: "Trận đấu đã bắt đầu, bạn không vào được nữa.",
  closed: "Phòng đã đóng.",
  hostOnly: "Chỉ chủ phòng mới làm được việc này.",
  notYourTurn: "Chưa đến lượt bạn.",
  noHints: "Đội bạn đã hết gợi ý.",
  hinted: "Câu này đã dùng gợi ý rồi.",
  listenHint: "Câu nghe không có gợi ý.",
  noQuestions: "Trình độ này chưa đủ câu hỏi cho chế độ đã chọn.",
  sizeTooSmall: (players: number) => `Phòng đang có ${players} người, không giảm xuống ít hơn được.`,
  unassigned: (count: number) => `Còn ${count} người chưa xếp đội.`,
  emptyTeam: (team: Team) => `Đội ${team} chưa có ai.`,
} as const;

export interface TeamIdentity {
  id: string;
  name: string;
  image: string | null;
}

export interface TeamPlayer extends TeamIdentity {
  connected: boolean;
  /** Epoch ms after which a player who dropped from the lobby counts as gone; null otherwise. */
  goneAt: number | null;
  /** Left the match on purpose: out of the turn order until they come back (AC-042). */
  left: boolean;
  /** Turns they had and answers they got right this match (AC-041). */
  answered: number;
  correct: number;
}

type PerTeam<T> = { A: T; B: T };

export interface TeamRoomState {
  kind: "team";
  code: string;
  settings: TeamSettings;
  hostId: string;
  phase: TeamPhase;
  players: TeamPlayer[];
  /** Turn order of each team (AC-010); a player in neither is "Chưa xếp đội". */
  teams: PerTeam<string[]>;
  /** Index in each team's order of the member who answers that team's next question (AC-019). */
  cursor: PerTeam<number>;
  seed: number;
  /** Questions in each round's deck; empty until the decks are built. */
  deckSizes: number[];
  /** 1-based; 0 before the first round. */
  round: number;
  /** The team that opens this round (AC-018). */
  starter: Team;
  stage: Stage;
  suddenPair: number;
  /** Each team's sudden-death answer in the current pair; null until it has answered. */
  pairResults: PerTeam<boolean | null>;
  /** Deck position of the open (or last) question, -1 before the round's first. */
  deckIndex: number;
  /** Questions opened this round (1-based number of the open one). */
  number: number;
  turnTeam: Team | null;
  turnPlayer: string | null;
  scores: PerTeam<number>;
  hints: PerTeam<number>;
  roundsWon: PerTeam<number>;
  /** The open question took a hint (AC-035). */
  hinted: boolean;
  /** The turn player picked a wrong option. */
  lockedOut: boolean;
  /** How the last question went, for its reveal. */
  lastCorrect: boolean;
  /** Epoch ms when the round's time is up; null outside a round and while paused. */
  roundEndsAt: number | null;
  /** The round's time left while paused. */
  roundLeftMs: number | null;
  /** Epoch ms when the current phase ends; null when nothing counts down. */
  deadline: number | null;
  /** Epoch ms when an unstarted or finished room closes; null during a match. */
  idleUntil: number | null;
  /** The team the paused match waits for, and the phase it was in (AC-045). */
  pausedTeam: Team | null;
  pausedFrom: TeamPhase | null;
  rounds: TeamRoundResult[];
  winner: Team | "draw" | null;
  endReason: "won" | "forfeit" | "cancelled" | null;
}

export type TeamRoomEvent =
  | { type: "join"; player: TeamIdentity }
  | { type: "disconnect"; userId: string }
  | { type: "leave"; userId: string }
  | { type: "assign"; userId: string; target: string; team: Team | null }
  | { type: "order"; userId: string; team: Team; ids: string[] }
  | { type: "shuffle"; userId: string }
  | { type: "settings"; userId: string; settings: TeamSettings }
  | { type: "start"; userId: string }
  | { type: "typing"; userId: string; q: number }
  | { type: "answer"; userId: string; q: number; answer: ArenaAnswer }
  | { type: "hint"; userId: string; q: number }
  | { type: "again"; userId: string }
  | { type: "tick" };

/** A team match as history keeps it (AC-040). */
export interface FinishedTeamMatch {
  endedAt: number;
  reason: "won" | "forfeit";
  settings: TeamSettings;
  winner: Team | "draw";
  teams: PerTeam<TeamIdentity[]>;
  roundsWon: PerTeam<number>;
  rounds: TeamRoundResult[];
}

export type TeamEffect =
  /** Send the room view (`team-state`) to everyone connected. */
  | { type: "broadcast" }
  | { type: "send"; to: string; frame: RoomFrame }
  | { type: "send-all"; frame: RoomFrame }
  | { type: "send-others"; except: string; frame: RoomFrame }
  | { type: "close"; userId: string | null; code: number; message?: string }
  | { type: "replace"; userId: string }
  /** Save the match to every player's history; never the Arena record (AC-040). */
  | { type: "record-team"; match: FinishedTeamMatch };

export interface TeamResult {
  state: TeamRoomState;
  effects: TeamEffect[];
}

const other = (team: Team): Team => (team === "A" ? "B" : "A");
const perTeam = <T>(value: T): PerTeam<T> => ({ A: value, B: value });

/** Questions one round's deck holds: enough for the quickest play, plus the sudden-death ones. */
export function deckSize(settings: Pick<TeamSettings, "minutes">): number {
  return Math.ceil(roundMs(settings) / MIN_TURN_MS) + DECK_SPARE;
}

export function createTeamRoom(input: { code: string; settings: TeamSettings; host: TeamIdentity; seed: number; now: number }): TeamRoomState {
  return {
    kind: "team",
    code: input.code,
    settings: input.settings,
    hostId: input.host.id,
    phase: "lobby",
    // The host is in the room from the start but connects a moment later, with a drop's grace.
    players: [newPlayer(input.host, false, input.now)],
    teams: { A: [], B: [] },
    cursor: perTeam(0),
    seed: input.seed,
    ...freshMatch(),
    deadline: null,
    idleUntil: input.now + TEAM_IDLE_MS,
  };
}

function newPlayer(identity: TeamIdentity, connected: boolean, now: number): TeamPlayer {
  return { ...identity, connected, goneAt: connected ? null : now + TEAM_GRACE_MS, left: false, answered: 0, correct: 0 };
}

/** Everything a new match starts from. */
function freshMatch() {
  return {
    deckSizes: [] as number[],
    round: 0,
    starter: "A" as Team,
    stage: "main" as Stage,
    suddenPair: 0,
    pairResults: perTeam<boolean | null>(null),
    deckIndex: -1,
    number: 0,
    turnTeam: null,
    turnPlayer: null,
    scores: perTeam(0),
    hints: perTeam(0),
    roundsWon: perTeam(0),
    hinted: false,
    lockedOut: false,
    lastCorrect: false,
    roundEndsAt: null,
    roundLeftMs: null,
    pausedTeam: null,
    pausedFrom: null,
    rounds: [] as TeamRoundResult[],
    winner: null,
    endReason: null,
  } satisfies Partial<TeamRoomState>;
}

const unchanged = (state: TeamRoomState): TeamResult => ({ state, effects: [] });
const broadcast = (state: TeamRoomState, ...more: TeamEffect[]): TeamResult => ({ state, effects: [{ type: "broadcast" }, ...more] });
const tell = (state: TeamRoomState, to: string, message: string): TeamResult => ({ state, effects: [{ type: "send", to, frame: { type: "error", message } }] });

const findPlayer = (state: TeamRoomState, userId: string) => state.players.find((p) => p.id === userId);
function teamOf(state: TeamRoomState, userId: string): Team | null {
  if (state.teams.A.includes(userId)) return "A";
  if (state.teams.B.includes(userId)) return "B";
  return null;
}
const canPlay = (player: TeamPlayer | undefined): boolean => player !== undefined && player.connected && !player.left;

function withPlayer(state: TeamRoomState, userId: string, change: (player: TeamPlayer) => TeamPlayer): TeamRoomState {
  return { ...state, players: state.players.map((p) => (p.id === userId ? change(p) : p)) };
}

function closeRoom(state: TeamRoomState, message: string): TeamResult {
  return {
    state: { ...state, phase: "closed", deadline: null, idleUntil: null, endReason: state.endReason ?? "cancelled" },
    effects: [{ type: "broadcast" }, { type: "close", userId: null, code: CLOSE_CODES.roomClosed, message }],
  };
}

const IN_PLAY: ReadonlySet<TeamPhase> = new Set(["countdown", "question", "reveal", "round-end"]);

// ── Lobby (T002) ──────────────────────────────────────────────────────────────

function join(state: TeamRoomState, identity: TeamIdentity, now: number, deck?: readonly ServerQuestion[]): TeamResult {
  const seat = findPlayer(state, identity.id);
  if (seat) {
    // Back from a drop, the host's first connection, or another tab: the same seat; the newest tab wins.
    const back = withPlayer(state, identity.id, (p) => ({ ...p, name: identity.name, image: identity.image, connected: true, goneAt: null, left: false }));
    const effects: TeamEffect[] = seat.connected ? [{ type: "replace", userId: identity.id }] : [];
    const team = teamOf(back, identity.id);
    const resumed = back.phase === "paused" && team === back.pausedTeam ? resume(back, now, deck) : back;
    return { state: resumed, effects: [...effects, { type: "broadcast" }] };
  }
  const reject = (message: string): TeamResult => ({ state, effects: [{ type: "close", userId: identity.id, code: CLOSE_CODES.roomClosed, message }] });
  if (state.phase === "closed") return reject(TEAM_MESSAGES.closed);
  if (state.phase !== "lobby") return reject(TEAM_MESSAGES.started);
  if (state.players.length >= state.settings.size) return reject(TEAM_MESSAGES.full);
  // A new player waits as "Chưa xếp đội" until the host places them (AC-008).
  return broadcast({ ...state, players: [...state.players, newPlayer(identity, true, now)] });
}

/** Off the room and off their team (AC-047); the host leaving the lobby closes the room (AC-046). */
function removePlayer(state: TeamRoomState, userId: string): TeamResult {
  if (!findPlayer(state, userId)) return unchanged(state);
  if (userId === state.hostId) return closeRoom(state, TEAM_MESSAGES.closed);
  const next: TeamRoomState = {
    ...state,
    players: state.players.filter((p) => p.id !== userId),
    teams: { A: state.teams.A.filter((id) => id !== userId), B: state.teams.B.filter((id) => id !== userId) },
  };
  return { state: next, effects: [{ type: "broadcast" }, { type: "close", userId, code: CLOSE_CODES.roomClosed }] };
}

/** Host-only lobby actions: null when allowed, else the refusal. */
function hostCheck(state: TeamRoomState, userId: string): TeamResult | null {
  if (state.phase !== "lobby" || !findPlayer(state, userId)) return unchanged(state);
  if (userId !== state.hostId) return tell(state, userId, TEAM_MESSAGES.hostOnly);
  return null;
}

function assign(state: TeamRoomState, userId: string, target: string, team: Team | null): TeamResult {
  const refused = hostCheck(state, userId);
  if (refused) return refused;
  if (!findPlayer(state, target) || teamOf(state, target) === team) return unchanged(state);
  const teams = { A: state.teams.A.filter((id) => id !== target), B: state.teams.B.filter((id) => id !== target) };
  if (team) teams[team] = [...teams[team], target];
  return broadcast({ ...state, teams });
}

function reorder(state: TeamRoomState, userId: string, team: Team, ids: string[]): TeamResult {
  const refused = hostCheck(state, userId);
  if (refused) return refused;
  const current = state.teams[team];
  // Every member exactly once: an order can't add, drop or repeat anyone.
  const same = ids.length === current.length && new Set(ids).size === ids.length && ids.every((id) => current.includes(id));
  if (!same || ids.every((id, i) => id === current[i])) return unchanged(state);
  return broadcast({ ...state, teams: { ...state.teams, [team]: [...ids] } });
}

/** "Chia ngẫu nhiên": everyone on a team, as evenly as the number of players allows (AC-011). */
function shuffleTeams(state: TeamRoomState, userId: string): TeamResult {
  const refused = hostCheck(state, userId);
  if (refused) return refused;
  const rng = createRng(state.seed);
  const order = shuffle(state.players.map((p) => p.id), rng);
  const half = Math.ceil(order.length / 2);
  return broadcast({ ...state, seed: randomInt(rng, 2 ** 31), teams: { A: order.slice(0, half), B: order.slice(half) } });
}

function changeSettings(state: TeamRoomState, userId: string, settings: TeamSettings): TeamResult {
  const refused = hostCheck(state, userId);
  if (refused) return refused;
  if (settings.size < state.players.length) return tell(state, userId, TEAM_MESSAGES.sizeTooSmall(state.players.length));
  return broadcast({ ...state, settings });
}

/** Why the host can't start yet (AC-014), or null when every player is placed and both teams have someone. */
export function startProblem(room: { players: { id: string }[]; teams: PerTeam<readonly string[]> }): string | null {
  const unplaced = room.players.filter((p) => !room.teams.A.includes(p.id) && !room.teams.B.includes(p.id)).length;
  if (unplaced > 0) return TEAM_MESSAGES.unassigned(unplaced);
  if (room.teams.A.length === 0) return TEAM_MESSAGES.emptyTeam("A");
  if (room.teams.B.length === 0) return TEAM_MESSAGES.emptyTeam("B");
  return null;
}

/** The host starts with the players present, full or not (AC-015, AC-016); teams and settings lock. */
function start(state: TeamRoomState, userId: string, now: number): TeamResult {
  const refused = hostCheck(state, userId);
  if (refused) return refused;
  const problem = startProblem(state);
  if (problem) return tell(state, userId, problem);
  return broadcast({
    ...state,
    ...freshMatch(),
    phase: "countdown",
    deadline: now + TEAM_COUNTDOWN_MS,
    idleUntil: null,
    cursor: perTeam(0),
    players: state.players.map((p) => ({ ...p, answered: 0, correct: 0, left: false })),
  });
}

// ── Play and hints (T003) ─────────────────────────────────────────────────────

/** The round whose deck a call needs: the next one when a countdown or round result is about to end. */
export function deckRound(state: TeamRoomState): number {
  if (state.phase === "countdown") return 1;
  if (state.phase === "round-end" || (state.phase === "paused" && state.pausedFrom === "round-end")) return state.round + 1;
  return state.round;
}

/** Whether the room must build the decks before the next tick: the countdown is on and none exist. */
export function teamNeedsDecks(state: TeamRoomState): boolean {
  return state.phase === "countdown" && state.deckSizes.length === 0;
}

/** Every round's deck from the match seed; an item comes back in a later round only when the level runs short. */
export function buildTeamDecks(state: TeamRoomState, pool: ArenaPool): ServerQuestion[][] {
  const rng = createRng(state.seed);
  const asked = new Set<string>();
  const decks: ServerQuestion[][] = [];
  for (let round = 0; round < state.settings.rounds; round++) {
    const deck = buildDeck(pool, state.settings.mode, randomInt(rng, 2 ** 31), deckSize(state.settings), asked);
    deck.forEach((q) => asked.add(q.itemId));
    decks.push(deck);
  }
  return decks;
}

/** The open (or last) question; past the deck's end it wraps around. */
export function teamQuestion(state: TeamRoomState, deck: readonly ServerQuestion[] | undefined): ServerQuestion | null {
  if (!deck || deck.length === 0 || state.deckIndex < 0) return null;
  return deck[state.deckIndex % deck.length] ?? null;
}

/** The next member of `team` who can answer, from its cursor (AC-019, AC-042), and where the cursor goes after them. */
function nextMember(state: TeamRoomState, team: Team): { userId: string; cursor: number } | null {
  const members = state.teams[team];
  for (let k = 0; k < members.length; k++) {
    const index = (state.cursor[team] + k) % members.length;
    if (canPlay(findPlayer(state, members[index]))) return { userId: members[index], cursor: (index + 1) % members.length };
  }
  return null;
}

/** Gives a question to `team`'s next member: the next deck question, or the same one again when `same` (AC-043). */
function openTurn(state: TeamRoomState, team: Team, now: number, same = false): TeamRoomState {
  const member = nextMember(state, team);
  if (!member) return pause(state, team, now);
  return {
    ...state,
    phase: "question",
    turnTeam: team,
    turnPlayer: member.userId,
    cursor: { ...state.cursor, [team]: member.cursor },
    deckIndex: same ? state.deckIndex : state.deckIndex + 1,
    number: same ? state.number : state.number + 1,
    deadline: now + questionMs(state.settings),
    hinted: false,
    lockedOut: false,
  };
}

function startRound(state: TeamRoomState, round: number, now: number): TeamRoomState {
  // Team A opens rounds 1 and 3, team B round 2 (decisions.md, Tentative). Hints start at 1 (AC-030).
  const starter: Team = round % 2 === 1 ? "A" : "B";
  const reset: TeamRoomState = {
    ...state,
    round,
    starter,
    stage: "main",
    suddenPair: 0,
    pairResults: perTeam(null),
    deckIndex: -1,
    number: 0,
    scores: perTeam(0),
    hints: perTeam(1),
    roundEndsAt: now + roundMs(state.settings),
    roundLeftMs: null,
  };
  return openTurn(reset, starter, now);
}

/** Ends the open question: everyone sees the answer and how it went (AC-025). */
function reveal(state: TeamRoomState, correct: boolean, now: number): TeamRoomState {
  const team = state.turnTeam!;
  const scored = withPlayer(state, state.turnPlayer!, (p) => ({ ...p, answered: p.answered + 1, correct: p.correct + (correct ? 1 : 0) }));
  return {
    ...scored,
    phase: "reveal",
    deadline: now + TEAM_REVEAL_MS,
    lastCorrect: correct,
    // A correct answer scores 1 point, hint or not, and earns the team a hint (AC-023, AC-031, AC-036).
    scores: correct ? { ...state.scores, [team]: state.scores[team] + 1 } : state.scores,
    hints: correct ? { ...state.hints, [team]: state.hints[team] + 1 } : state.hints,
    pairResults: state.stage === "sudden" ? { ...state.pairResults, [team]: correct } : state.pairResults,
  };
}

function answer(state: TeamRoomState, userId: string, q: number, given: ArenaAnswer, now: number, deck?: readonly ServerQuestion[]): TeamResult {
  const question = teamQuestion(state, deck);
  // Only the turn player, on the open question, in time (AC-021, edge cases).
  if (!question || state.phase !== "question" || q !== state.number || userId !== state.turnPlayer || state.lockedOut) return unchanged(state);
  if (state.deadline !== null && now >= state.deadline) return unchanged(state);
  if (timeIsUp(state, now)) return unchanged(state);
  if (isCorrect(question, given)) return broadcast(reveal(state, true, now));
  // A wrong pick ends a listening question; typed answers can try again until time runs out (AC-022, AC-024).
  if (question.type === "listen") return broadcast(reveal({ ...state, lockedOut: true }, false, now));
  return { state, effects: [{ type: "send-all", frame: { type: "wrong", userId } }] };
}

function spendHint(state: TeamRoomState, userId: string, q: number, deck?: readonly ServerQuestion[]): TeamResult {
  const question = teamQuestion(state, deck);
  if (!question || state.phase !== "question" || q !== state.number || !findPlayer(state, userId)) return unchanged(state);
  if (userId !== state.turnPlayer) return tell(state, userId, TEAM_MESSAGES.notYourTurn);
  if (question.type === "listen") return tell(state, userId, TEAM_MESSAGES.listenHint);
  if (state.hinted) return tell(state, userId, TEAM_MESSAGES.hinted);
  const team = state.turnTeam!;
  if (state.hints[team] < 1) return tell(state, userId, TEAM_MESSAGES.noHints);
  return broadcast({ ...state, hinted: true, hints: { ...state.hints, [team]: state.hints[team] - 1 } });
}

function relayTyping(state: TeamRoomState, userId: string, q: number): TeamResult {
  if (state.phase !== "question" || q !== state.number || userId !== state.turnPlayer) return unchanged(state);
  // Everyone else sees that the player is typing, never the text (AC-021).
  return { state, effects: [{ type: "send-others", except: userId, frame: { type: "typing", userId } }] };
}

/** The round clock has reached zero: the timed part of the round is over (AC-027). Sudden death has no clock. */
function timeIsUp(state: TeamRoomState, now: number): boolean {
  return state.stage !== "sudden" && state.roundEndsAt !== null && now >= state.roundEndsAt;
}

/** After a reveal: the other team's turn, sudden death, or the round's end. */
function afterReveal(state: TeamRoomState, now: number): TeamResult {
  const last = state.turnTeam!;
  if (state.stage !== "sudden") {
    // No question opens once the clock is at zero, whoever answered last (AC-027).
    if (!timeIsUp(state, now)) return broadcast(openTurn(state, other(last), now));
    return endOfTime(state, now);
  }

  // Sudden death (AC-037): each team answers once per pair.
  const { A, B } = state.pairResults;
  if (A === null || B === null) return broadcast(openTurn(state, other(last), now));
  if (A !== B) return endRound(state, A ? "A" : "B", now);
  if (state.suddenPair >= MAX_SUDDEN_PAIRS) return endRound(state, null, now);
  return broadcast(openTurn({ ...state, suddenPair: state.suddenPair + 1, pairResults: perTeam(null) }, other(last), now));
}

/** The timed questions are over: more points win, a tie goes to sudden death, the team that didn't answer last first. */
function endOfTime(state: TeamRoomState, now: number): TeamResult {
  if (state.scores.A !== state.scores.B) return endRound(state, state.scores.A > state.scores.B ? "A" : "B", now);
  const sudden: TeamRoomState = { ...state, stage: "sudden", suddenPair: 1, pairResults: perTeam(null), roundEndsAt: null };
  return broadcast(openTurn(sudden, other(state.turnTeam!), now));
}

const roundsToWin = (state: TeamRoomState) => Math.floor(state.settings.rounds / 2) + 1;

function endRound(state: TeamRoomState, winner: Team | null, now: number): TeamResult {
  const result: TeamRoundResult = { round: state.round, scores: { ...state.scores }, winner, suddenDeath: state.stage === "sudden" };
  const roundsWon = winner ? { ...state.roundsWon, [winner]: state.roundsWon[winner] + 1 } : state.roundsWon;
  const next: TeamRoomState = { ...state, rounds: [...state.rounds, result], roundsWon, roundEndsAt: null, turnTeam: null, turnPlayer: null };
  const champion = (["A", "B"] as const).find((team) => roundsWon[team] >= roundsToWin(next));
  if (champion) return endMatch(next, champion, "won", now);
  // Every round played without a team reaching the rounds it needs: more rounds won, else a draw (AC-039).
  if (next.rounds.length >= state.settings.rounds) {
    if (roundsWon.A === roundsWon.B) return endMatch(next, "draw", "won", now);
    return endMatch(next, roundsWon.A > roundsWon.B ? "A" : "B", "won", now);
  }
  return broadcast({ ...next, phase: "round-end", deadline: now + TEAM_ROUND_RESULT_MS });
}

function endMatch(state: TeamRoomState, winner: Team | "draw", reason: "won" | "forfeit", now: number): TeamResult {
  const ended: TeamRoomState = {
    ...state,
    phase: "match-end",
    deadline: null,
    roundEndsAt: null,
    roundLeftMs: null,
    pausedTeam: null,
    pausedFrom: null,
    idleUntil: now + TEAM_IDLE_MS,
    winner,
    endReason: reason,
  };
  const members = (team: Team): TeamIdentity[] =>
    state.teams[team].flatMap((id) => {
      const player = findPlayer(state, id);
      return player ? [{ id: player.id, name: player.name, image: player.image }] : [];
    });
  const match: FinishedTeamMatch = {
    endedAt: now,
    reason,
    settings: state.settings,
    winner,
    teams: { A: members("A"), B: members("B") },
    roundsWon: { ...state.roundsWon },
    rounds: [...state.rounds],
  };
  return broadcast(ended, { type: "record-team", match });
}

// ── Drops, leaving and play again (T004) ──────────────────────────────────────

/** A whole team is gone: everything waits up to 30 s for one of them, the round clock stopped (AC-045). */
function pause(state: TeamRoomState, team: Team, now: number): TeamRoomState {
  return {
    ...state,
    phase: "paused",
    pausedTeam: team,
    pausedFrom: state.phase === "paused" ? state.pausedFrom : state.phase,
    roundLeftMs: state.roundEndsAt !== null ? Math.max(0, state.roundEndsAt - now) : state.roundLeftMs,
    roundEndsAt: null,
    deadline: now + TEAM_GRACE_MS,
  };
}

/** How long a phase lasts when it runs again after a pause. */
const PHASE_MS: Partial<Record<TeamPhase, number>> = {
  countdown: TEAM_COUNTDOWN_MS,
  reveal: TEAM_REVEAL_MS,
  "round-end": TEAM_ROUND_RESULT_MS,
};

/** Someone of the paused team is back: the clock runs again; a question restarts with full time, other phases run again. */
function resume(state: TeamRoomState, now: number, deck?: readonly ServerQuestion[]): TeamRoomState {
  const from = state.pausedFrom ?? "question";
  const resumed: TeamRoomState = {
    ...state,
    pausedTeam: null,
    pausedFrom: null,
    roundEndsAt: state.roundLeftMs !== null ? now + state.roundLeftMs : null,
    roundLeftMs: null,
  };
  if (from === "question" && state.turnTeam) return openTurn(resumed, state.turnTeam, now, teamQuestion(state, deck) !== null);
  return { ...resumed, phase: from, deadline: now + (PHASE_MS[from] ?? TEAM_ROUND_RESULT_MS) };
}

/** A player is no longer answering, mid-match: their turn moves on, and a team with nobody left pauses the match. */
function afterAbsence(state: TeamRoomState, userId: string, now: number): TeamRoomState {
  const team = teamOf(state, userId);
  if (!team) return state;
  const nobodyLeft = state.teams[team].every((id) => !canPlay(findPlayer(state, id)));
  if (state.phase === "paused") return state;
  if (nobodyLeft) return pause(state, team, now);
  // Their open question goes to the next teammate with its full time (AC-043).
  if (state.phase === "question" && state.turnPlayer === userId) return openTurn(state, team, now, true);
  return state;
}

function disconnect(state: TeamRoomState, userId: string, now: number): TeamResult {
  const player = findPlayer(state, userId);
  if (!player?.connected) return unchanged(state);
  const before = state.phase === "lobby";
  const dropped = withPlayer(state, userId, (p) => ({ ...p, connected: false, goneAt: before ? now + TEAM_GRACE_MS : null }));
  if (IN_PLAY.has(state.phase) || state.phase === "paused") return broadcast(afterAbsence(dropped, userId, now));
  return broadcast(dropped);
}

function leave(state: TeamRoomState, userId: string, now: number): TeamResult {
  if (!findPlayer(state, userId)) return unchanged(state);
  if (state.phase === "lobby") return removePlayer(state, userId);
  if (state.phase === "match-end") {
    // Nobody but the host can start the next match: their leaving ends the room.
    return userId === state.hostId ? closeRoom(state, TEAM_MESSAGES.closed) : removePlayer(state, userId);
  }
  // Mid-match: out of the turn order, the match goes on (AC-042, AC-046).
  const gone = withPlayer(state, userId, (p) => ({ ...p, connected: false, left: true, goneAt: null }));
  return { state: afterAbsence(gone, userId, now), effects: [{ type: "broadcast" }, { type: "close", userId, code: CLOSE_CODES.roomClosed }] };
}

/** "Chơi lại": back to the lobby with the same teams, order and settings (AC-051). Players who are gone leave the room. */
function playAgain(state: TeamRoomState, userId: string, now: number): TeamResult {
  if (state.phase !== "match-end" || state.endReason === "cancelled" || !findPlayer(state, userId)) return unchanged(state);
  if (userId !== state.hostId) return tell(state, userId, TEAM_MESSAGES.hostOnly);
  const staying = state.players.filter((p) => p.connected && !p.left);
  const ids = new Set(staying.map((p) => p.id));
  return broadcast({
    ...state,
    ...freshMatch(),
    phase: "lobby",
    deadline: null,
    idleUntil: now + TEAM_IDLE_MS,
    seed: randomInt(createRng(state.seed), 2 ** 31),
    cursor: perTeam(0),
    players: staying.map((p) => ({ ...p, answered: 0, correct: 0 })),
    teams: { A: state.teams.A.filter((id) => ids.has(id)), B: state.teams.B.filter((id) => ids.has(id)) },
  });
}

function tick(state: TeamRoomState, now: number, ctx: TeamContext): TeamResult {
  if (state.phase === "closed") return unchanged(state);
  if (state.idleUntil !== null && now >= state.idleUntil && (state.phase === "lobby" || state.phase === "match-end")) {
    return closeRoom(state, TEAM_MESSAGES.closed);
  }
  // Lobby players whose grace ran out leave first.
  const gone = state.phase === "lobby" ? state.players.find((p) => !p.connected && p.goneAt !== null && now >= p.goneAt) : undefined;
  if (gone) {
    const removed = removePlayer(state, gone.id);
    const rest = tick(removed.state, now, ctx);
    return { state: rest.state, effects: [...removed.effects, ...rest.effects] };
  }

  // The round clock reached zero during a question: it ends at once, with no point (AC-027).
  if (state.phase === "question" && timeIsUp(state, now)) return broadcast(reveal(state, false, now));

  if (state.deadline === null || now < state.deadline) return unchanged(state);
  switch (state.phase) {
    case "countdown": {
      if (!ctx.deckSizes) throw new Error("The team room must build the decks before the countdown ends (teamNeedsDecks).");
      if (ctx.deckSizes.length < state.settings.rounds || ctx.deckSizes.includes(0)) return closeRoom(state, TEAM_MESSAGES.noQuestions);
      return broadcast(startRound({ ...state, deckSizes: [...ctx.deckSizes] }, 1, now));
    }
    case "question":
      // Time's up: no point, and the other team gets no chance at it (AC-024).
      return broadcast(reveal(state, false, now));
    case "reveal":
      return afterReveal(state, now);
    case "round-end":
      return broadcast(startRound(state, state.round + 1, now));
    case "paused":
      // Nobody of the team came back in 30 s: the other team wins (AC-045).
      return endMatch(state, other(state.pausedTeam!), "forfeit", now);
    default:
      return unchanged(state);
  }
}

/** What the room passes along with an event: the deck of `deckRound(state)`, and the deck sizes once built. */
export interface TeamContext {
  deck?: readonly ServerQuestion[];
  deckSizes?: number[];
}

/** Applies one event at time `now`. */
export function reduceTeam(state: TeamRoomState, event: TeamRoomEvent, now: number, ctx: TeamContext = {}): TeamResult {
  switch (event.type) {
    case "join":
      return join(state, event.player, now, ctx.deck);
    case "disconnect":
      return disconnect(state, event.userId, now);
    case "leave":
      return leave(state, event.userId, now);
    case "assign":
      return assign(state, event.userId, event.target, event.team);
    case "order":
      return reorder(state, event.userId, event.team, event.ids);
    case "shuffle":
      return shuffleTeams(state, event.userId);
    case "settings":
      return changeSettings(state, event.userId, event.settings);
    case "start":
      return start(state, event.userId, now);
    case "typing":
      return relayTyping(state, event.userId, event.q);
    case "answer":
      return answer(state, event.userId, event.q, event.answer, now, ctx.deck);
    case "hint":
      return spendHint(state, event.userId, event.q, ctx.deck);
    case "again":
      return playAgain(state, event.userId, now);
    case "tick":
      return tick(state, now, ctx);
  }
}

/** When the room must wake next: the phase deadline, a lobby grace running out, or the idle close. */
export function nextTeamAlarm(state: TeamRoomState): number | null {
  if (state.phase === "closed") return null;
  const graces = state.phase === "lobby" ? state.players.map((p) => (p.connected ? null : p.goneAt)) : [];
  // A question can end early: when the round clock reaches zero (AC-027).
  const roundEnd = state.phase === "question" && state.stage !== "sudden" ? state.roundEndsAt : null;
  const times = [state.deadline, state.idleUntil, roundEnd, ...graces].filter((t): t is number => t !== null);
  return times.length > 0 ? Math.min(...times) : null;
}

const SHOWS_QUESTION: ReadonlySet<TeamPhase> = new Set(["question", "reveal"]);

/** The room as browsers see it: the open question without its answer, the answer only in the reveal (AC-026). */
export function toPublicTeam(state: TeamRoomState, deck?: readonly ServerQuestion[]): PublicTeamRoom {
  const question = SHOWS_QUESTION.has(state.phase) ? teamQuestion(state, deck) : null;
  const view = (team: Team) => ({ members: [...state.teams[team]], score: state.scores[team], hints: state.hints[team], roundsWon: state.roundsWon[team] });
  return {
    kind: "team",
    code: state.code,
    settings: state.settings,
    hostId: state.hostId,
    phase: state.phase,
    players: state.players.map(({ id, name, image, connected, left, answered, correct }) => ({ id, name, image, connected: connected && !left, answered, correct })),
    teams: { A: view("A"), B: view("B") },
    round: state.round,
    roundEndsAt: state.roundEndsAt,
    roundLeftMs: state.roundLeftMs,
    stage: state.stage,
    suddenPair: state.suddenPair,
    number: state.number,
    turn: state.turnTeam && state.turnPlayer && (SHOWS_QUESTION.has(state.phase) || state.phase === "paused") ? { team: state.turnTeam, userId: state.turnPlayer } : null,
    deadline: state.deadline,
    question: question ? publicView(question) : null,
    questionType: question?.type ?? null,
    hint: question && state.hinted ? hintMask(question) : null,
    lockedOut: state.lockedOut,
    reveal: question && state.phase === "reveal" ? { ...revealOf(question, state.lastCorrect ? state.turnPlayer : null), correct: state.lastCorrect, by: state.turnPlayer! } : null,
    rounds: [...state.rounds],
    pausedTeam: state.pausedTeam,
    winner: state.winner,
    endReason: state.endReason,
  };
}
