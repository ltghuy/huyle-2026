import { BUCKETS, bucketFor, EXPERIMENT, variantFor, type Variant } from "./assign";

// A simulated release flag for the feature flags topic. It decides the way a
// flag service would: the kill switch first, then targeting rules, then a
// percentage rollout from a stable hash of the visitor's id and a salt. The
// site's own pages don't use it.

export const FLAG = "new-checkout";

export type Visitor = { id: string; staff: boolean; variant: Variant };

/** 100 sample visitors; every 20th is on the staff. Their experiment variant uses the page's real assignment. */
export const VISITORS: readonly Visitor[] = Array.from({ length: 100 }, (_, i) => {
  const id = `visitor-${String(i + 1).padStart(3, "0")}`;
  return { id, staff: i % 20 === 0, variant: variantFor(bucketFor(id)) };
});

export type FlagRules = { percent: number; staffFirst: boolean; kill: boolean; reuseHash: boolean };

export type Decision = { on: boolean; reason: string };

/** The salt makes each flag's buckets independent; reusing the experiment's name lines the two up. */
export const saltFor = (rules: FlagRules) => (rules.reuseHash ? EXPERIMENT : FLAG);

export function decide(visitor: Visitor, rules: FlagRules): Decision {
  if (rules.kill) return { on: false, reason: "Kill switch is on" };
  if (rules.staffFirst && visitor.staff) return { on: true, reason: "Staff rule" };
  const bucket = bucketFor(visitor.id, saltFor(rules));
  const cutoff = rules.percent * (BUCKETS / 100);
  return bucket < cutoff ? { on: true, reason: `Bucket ${bucket} is under ${cutoff}` } : { on: false, reason: `Bucket ${bucket} is ${cutoff} or more` };
}

// A hundred visitors is too few to see a split: chance alone moves it by
// ten points or more. The overlap is measured on 10,000 instead.
const POPULATION = Array.from({ length: 10_000 }, (_, i) => {
  const id = `visitor-${i + 1}`;
  return { id, variant: variantFor(bucketFor(id)) };
});

/** How the visitors the rollout reaches split across the experiment's variants, in percent of that group. */
export function overlap(rules: Pick<FlagRules, "percent" | "reuseHash">) {
  const cutoff = rules.percent * (BUCKETS / 100);
  const salt = rules.reuseHash ? EXPERIMENT : FLAG;
  const reached = POPULATION.filter((v) => bucketFor(v.id, salt) < cutoff);
  const a = reached.filter((v) => v.variant === "A").length;
  const pct = (n: number) => (reached.length === 0 ? 0 : Math.round((n / reached.length) * 100));
  return { total: reached.length, a: pct(a), b: pct(reached.length - a) };
}
