// Extra lessons bought with points after the daily lesson (feature 013). An
// extra lesson is planned like the daily one (due reviews, the next new words,
// grammar when it's a grammar day, sentences, writing), awards no points and
// leaves the streak alone. One can be open at a time; it is resumable until
// the local date changes, then dropped without a refund.
import { localDate } from "@/learning/attendance";
import { buildLessonPlan, hashString } from "@/learning/lesson-plan";
import { extraLessonPrice, nextExtraPrice, pointsBalance } from "@/learning/points";
import type { DailyLesson, ExtraLesson } from "@/learning/types";
import { getAllAttendance } from "@/storage/attendance";
import { getAllCards } from "@/storage/cards";
import { getAllExtraLessons, getExtraLesson, purchaseExtraLesson, putExtraLesson } from "@/storage/extra-lessons";
import { getAllLessons, getLesson } from "@/storage/lessons";
import { endPosition, recentWritingIds, type TodayInput } from "./today";

export interface ExtraOffer {
  today: string;
  /** Today's daily lesson is finished, so extra lessons are on sale. */
  dailyDone: boolean;
  /** Points earned minus spent; below 0 only after two devices spent the same points. */
  balance: number;
  price: number;
  /** What the one after it would cost, for the confirmation. */
  priceAfter: number;
  /** Today's extra lesson that isn't finished: resume it instead of buying another. */
  open: ExtraLesson | null;
  /** False when a new lesson would have no new words to teach. */
  hasNewWords: boolean;
}

export type BuyResult =
  | { status: "bought" | "open"; lesson: ExtraLesson }
  | { status: "not-enough"; balance: number; price: number }
  | { status: "nothing-new" | "daily-first" };

const comparePosition = (a: DailyLesson["position"], b: DailyLesson["position"]) => a.part - b.part || a.index - b.index;

/** 8 random base64url characters: keeps two devices' purchases of the same day apart. */
function randomPart(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_");
}

async function readState(input: TodayInput) {
  const today = localDate(input.now, input.profile.timeZone);
  const [daily, attendance, extras, cards, lessons] = await Promise.all([getLesson(today), getAllAttendance(), getAllExtraLessons(), getAllCards(), getAllLessons()]);
  return { today, daily, attendance, extras, cards, lessons };
}

type State = Awaited<ReturnType<typeof readState>>;

function planExtra({ profile, index, contentVersion, now }: TodayInput, state: State, id: string) {
  const writingIds = recentWritingIds([...state.lessons, ...state.extras], now, profile.timeZone);
  return buildLessonPlan({ date: state.today, now, profile, cards: state.cards, content: index.lesson, contentVersion, seed: hashString(id), recentWritingIds: writingIds });
}

const teachesNewWords = (plan: DailyLesson["plan"]) => plan.some((part) => part.kind === "new-words" && part.exercises.length > 0);

function offerOf(input: TodayInput, state: State): ExtraOffer {
  const todays = state.extras.filter((extra) => extra.date === state.today);
  return {
    today: state.today,
    dailyDone: Boolean(state.daily?.completedAt),
    balance: pointsBalance(state.attendance, state.extras),
    price: nextExtraPrice(state.extras, state.today),
    priceAfter: extraLessonPrice(todays.length + 1),
    open: todays.find((extra) => extra.completedAt === undefined) ?? null,
    // Planned with a throwaway id: only whether new words are left matters here.
    hasNewWords: teachesNewWords(planExtra(input, state, `${state.today}#preview`).plan),
  };
}

/** What the home card offers after today's lesson (AC-003, AC-007, AC-009). */
export async function getExtraOffer(input: TodayInput): Promise<ExtraOffer> {
  return offerOf(input, await readState(input));
}

/**
 * Buys the next extra lesson (AC-004, AC-005): takes its price from the
 * balance by saving the lesson. Re-reads everything first, so a stale card
 * can't buy at an old price; a second tab buying at the same moment gets the
 * lesson the first one bought.
 */
export async function buyExtraLesson(input: TodayInput): Promise<BuyResult> {
  const state = await readState(input);
  const offer = offerOf(input, state);
  if (!offer.dailyDone) return { status: "daily-first" };
  if (offer.open) return { status: "open", lesson: offer.open };
  if (!offer.hasNewWords) return { status: "nothing-new" };
  if (offer.balance < offer.price) return { status: "not-enough", balance: offer.balance, price: offer.price };

  const number = state.extras.filter((extra) => extra.date === state.today).length + 1;
  const id = `${state.today}#${number}#${randomPart()}`;
  const plan = planExtra(input, state, id);
  const lesson: ExtraLesson = {
    id,
    date: state.today,
    price: offer.price,
    purchasedAt: input.now,
    contentVersion: plan.contentVersion,
    plan: plan.plan,
    position: { part: 0, index: 0 },
    updatedAt: input.now,
  };
  const result = await purchaseExtraLesson(lesson, number);
  if (result.status === "bought") return { status: "bought", lesson };
  const taken = await getExtraLesson(result.id);
  return taken ? { status: "open", lesson: taken } : { status: "daily-first" };
}

/** Today's unfinished extra lesson, for the player; null when there is none (or it is from an earlier day). */
export async function getOpenExtraLesson(timeZone: string, now: number): Promise<ExtraLesson | null> {
  const today = localDate(now, timeZone);
  const extras = await getAllExtraLessons();
  return extras.find((extra) => extra.date === today && extra.completedAt === undefined) ?? null;
}

export async function saveExtraPosition(id: string, position: DailyLesson["position"], now: number): Promise<void> {
  const lesson = await getExtraLesson(id);
  if (lesson && comparePosition(position, lesson.position) > 0) await putExtraLesson({ ...lesson, position, updatedAt: now });
}

/** Marks the extra lesson finished (AC-008): no points, no streak, no board. */
export async function completeExtraLesson(id: string, now: number): Promise<void> {
  const lesson = await getExtraLesson(id);
  if (lesson && lesson.completedAt === undefined) await putExtraLesson({ ...lesson, position: endPosition(lesson), completedAt: now, updatedAt: now });
}
