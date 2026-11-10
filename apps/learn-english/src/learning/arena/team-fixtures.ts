// Test-only helpers for the team rules (feature 039): a clock, players, and a
// driver that feeds the machine its decks the way the room does.
import { POOL, rightAnswer, wrongAnswer } from "./fixtures";
import type { ArenaPool, ServerQuestion } from "./questions";
import {
  buildTeamDecks,
  createTeamRoom,
  deckRound,
  reduceTeam,
  teamNeedsDecks,
  teamQuestion,
  type TeamEffect,
  type TeamIdentity,
  type TeamResult,
  type TeamRoomEvent,
  type TeamRoomState,
} from "./team-machine";
import type { Team, TeamSettings } from "./team-protocol";

export const START = 1_800_000_000_000;

export const HOST: TeamIdentity = { id: "minh", name: "Minh", image: null };
export const PEOPLE: TeamIdentity[] = ["lan", "hoa", "khoa", "an", "binh", "chi", "dung", "giang", "hai"].map((id) => ({ id, name: id[0].toUpperCase() + id.slice(1), image: null }));

export const TEAM_SETTINGS: TeamSettings = { mode: "mixed", level: "A2", rounds: 1, seconds: 15, size: 6, minutes: 5 };

/** A room, its decks once built, and a clock the tests move forward. */
export class TeamDriver {
  state: TeamRoomState;
  decks: ServerQuestion[][] = [];
  effects: TeamEffect[] = [];
  now = START;

  constructor(settings: Partial<TeamSettings> = {}, private readonly pool: ArenaPool = POOL) {
    this.state = createTeamRoom({ code: "K7P2QX", settings: { ...TEAM_SETTINGS, ...settings }, host: HOST, seed: 7, now: this.now });
  }

  get deck(): ServerQuestion[] | undefined {
    return this.decks[deckRound(this.state) - 1];
  }

  get question(): ServerQuestion {
    return teamQuestion(this.state, this.decks[this.state.round - 1])!;
  }

  send(event: TeamRoomEvent, after = 100): TeamResult {
    this.now += after;
    if (event.type === "tick" && teamNeedsDecks(this.state)) this.decks = buildTeamDecks(this.state, this.pool);
    const result = reduceTeam(this.state, event, this.now, { deck: this.deck, deckSizes: this.decks.length > 0 ? this.decks.map((d) => d.length) : undefined });
    this.state = result.state;
    this.effects = result.effects;
    return result;
  }

  /** Moves the clock to the current deadline and ticks. */
  tick(): TeamResult {
    const wait = Math.max(0, (this.state.deadline ?? this.now) - this.now);
    return this.send({ type: "tick" }, wait);
  }

  /** Host and `count` more players in the room, connected. */
  fill(count: number): this {
    this.send({ type: "join", player: HOST });
    for (const person of PEOPLE.slice(0, count)) this.send({ type: "join", player: person });
    return this;
  }

  /** Puts players on teams, in order. */
  teams(a: string[], b: string[]): this {
    for (const id of a) this.send({ type: "assign", userId: HOST.id, target: id, team: "A" });
    for (const id of b) this.send({ type: "assign", userId: HOST.id, target: id, team: "B" });
    return this;
  }

  /** Starts and ends the countdown: question 1 of round 1 is open. */
  begin(): this {
    this.send({ type: "start", userId: HOST.id });
    this.tick();
    return this;
  }

  answer(right: boolean, after = 1_000, userId = this.state.turnPlayer!): TeamResult {
    const question = this.question;
    return this.send({ type: "answer", userId, q: this.state.number, answer: right ? rightAnswer(question) : wrongAnswer(question) }, after);
  }

  /** The turn player answers (or the question times out when `right` is null), then the reveal ends. */
  turn(right: boolean | null, after = 1_000): this {
    if (right !== null) this.answer(right, after);
    // Still open: a typed wrong answer, no answer, or an answer after the round clock reached zero.
    if (this.state.phase === "question") this.tick();
    this.tick();
    return this;
  }

  /** The round clock reaches zero now, while the open question keeps its own time. */
  timeUp(): this {
    this.state = { ...this.state, roundEndsAt: this.now };
    return this;
  }

  turnTeam(): Team {
    return this.state.turnTeam!;
  }
}

export const errorTo = (effects: TeamEffect[], to: string): string | undefined => {
  const effect = effects.find((e) => e.type === "send" && e.to === to);
  return effect?.type === "send" && effect.frame.type === "error" ? effect.frame.message : undefined;
};

export { rightAnswer, wrongAnswer };
