// What points buy (feature 013): the daily lesson earns them (attendance), and
// extra lessons after it spend them. The first extra lesson of a local date
// costs 10 points and each one after it 30% more, rounded to whole points.
import { totalPoints } from "./attendance";
import type { Attendance, ExtraLesson } from "./types";

export const FIRST_EXTRA_PRICE = 10;
export const EXTRA_PRICE_GROWTH = 1.3;

/** Price of the extra lesson after `bought` others the same day: 10, 13, 17, 22, 29, ... */
export function extraLessonPrice(bought: number): number {
  return Math.round(FIRST_EXTRA_PRICE * EXTRA_PRICE_GROWTH ** bought);
}

export function spentPoints(extras: readonly Pick<ExtraLesson, "price">[]): number {
  return extras.reduce((sum, extra) => sum + extra.price, 0);
}

/**
 * Points earned minus points spent. Two devices that spent the same points
 * offline both keep their purchase after a sync, so this can be below 0.
 */
export function pointsBalance(attendance: readonly Attendance[], extras: readonly Pick<ExtraLesson, "price">[]): number {
  return totalPoints(attendance) - spentPoints(extras);
}

/** Price of the next extra lesson on `today`, counting every purchase that day from any device. */
export function nextExtraPrice(extras: readonly Pick<ExtraLesson, "date">[], today: string): number {
  return extraLessonPrice(extras.filter((extra) => extra.date === today).length);
}
