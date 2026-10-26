// Staged placement test as a pure state machine: ask STAGE_SIZE items at the
// current level, then move up (>= 4/5), down (<= 2/5) or stop (3/5).
import { LEVELS, type Level } from "./types";

export const STAGE_SIZE = 5;
export const MAX_ITEMS = 30;
const START_LEVEL: Level = "A2";
const UP_AT = 4;
const DOWN_AT = 2;

export interface PlacementStage {
  level: Level;
  correct: number;
}

export interface PlacementState {
  /** Level of the stage in progress. */
  level: Level;
  /** Answers given in the stage in progress. */
  answers: boolean[];
  /** Completed stages, oldest first. */
  stages: PlacementStage[];
  /** Set once the test has ended. */
  result?: Level;
}

export function startPlacement(): PlacementState {
  return { level: START_LEVEL, answers: [], stages: [] };
}

export function itemsAnswered(state: PlacementState): number {
  return state.stages.length * STAGE_SIZE + state.answers.length;
}

export function isFinished(state: PlacementState): boolean {
  return state.result !== undefined;
}

/** The level to draw the next question from. */
export function nextLevel(state: PlacementState): Level {
  return state.level;
}

export function recordAnswer(state: PlacementState, correct: boolean): PlacementState {
  if (isFinished(state)) return state;
  const answers = [...state.answers, correct];
  if (answers.length < STAGE_SIZE) return { ...state, answers };

  const stage: PlacementStage = { level: state.level, correct: answers.filter(Boolean).length };
  const stages = [...state.stages, stage];
  const index = LEVELS.indexOf(state.level);
  const done = (result: Level): PlacementState => ({ level: state.level, answers: [], stages, result });

  if (stage.correct > DOWN_AT && stage.correct < UP_AT) return done(state.level);
  const up = stage.correct >= UP_AT;
  if (up && index === LEVELS.length - 1) return done(state.level);
  if (!up && index === 0) return done(state.level);

  const next = LEVELS[index + (up ? 1 : -1)];
  // Bounced back to a level already tested: the learner sits at the lower of the two.
  if (stages.some((s) => s.level === next)) return done(up ? state.level : next);
  if (stages.length * STAGE_SIZE >= MAX_ITEMS) return done(up ? state.level : next);
  return { level: next, answers: [], stages };
}

/** The placed level once finished; before that, the current estimate. */
export function result(state: PlacementState): Level {
  return state.result ?? state.level;
}
