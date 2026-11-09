// Reviews learners' translation claims (feature 016, AC-011 to AC-014): a
// learner said their English wording of a sentence is correct, and the owner
// decides. Run on the owner's machine only; the app never calls the model.
//
//   pnpm content:claims pull [--remote] [--no-ai]
//   pnpm content:claims apply <claims-decisions-YYYY-MM-DD.json> [--remote]
//
// `pull` reads the pending claims from D1 (local unless --remote), groups the
// same wording of the same sentence, decides what it can on its own (claims on
// a sentence that is gone are dropped; wordings the sentence already accepts
// are approved), asks Claude for a suggested verdict on the rest (skipped with
// --no-ai) and writes content/.claims/<date>.json plus a review page,
// content/.claims/<date>.html. It writes nothing to D1.
//
// `apply` reads the decisions file downloaded from that page, adds approved
// wordings to content/wording/<level>.json (status approved: the owner's
// decision is the review), then marks the claims approved, rejected (with the
// owner's Vietnamese explanation) or dropped in D1. Re-running it is safe:
// wordings are deduplicated and only pending claims are updated. Publish the
// wordings afterwards with `pnpm content:publish`.
//
// The Claude step needs ANTHROPIC_API_KEY (or an `ant auth login` profile) and
// costs a little money per group.
import Anthropic from "@anthropic-ai/sdk";
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { z } from "zod";
import { sourceItemSchema } from "../src/content/schema";
import { answerKeys, claimKey } from "../src/learning/exercises/translate";
import { acceptedText } from "../src/learning/exercises/tiles";
import { buildClaimsSheet } from "./lib/claims-sheet";
import { CLAIM_JUDGE_SYSTEM } from "./lib/prompts";
import { sqlString } from "./publish-content";
import { formatItems } from "./review";

const DB_NAME = "learn-english";
const MODEL = "claude-opus-5-5";
const AI_CONCURRENCY = 4;
/** Claim ids per UPDATE statement, well under D1's statement size limit. */
const IDS_PER_STATEMENT = 100;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

export type Target = "local" | "remote";

/** One pending claim as read from D1. */
export interface ClaimRow {
  id: string;
  sentence_id: string;
  answer: string;
  created_at: number;
  /** "ai" when the learner's own AI key accepted the wording (feature 033). Missing in rows read before migration 0009. */
  source?: string;
}

/** What the script needs to know about one approved sentence. */
export interface SentenceInfo {
  id: string;
  level: string;
  vi: string;
  en: string;
  /** The English and its other accepted word orders. */
  texts: string[];
}

export interface Verdict {
  verdict: "approve" | "reject";
  /** Short Vietnamese explanation for the learner; the rejection message. */
  reasonVi: string;
  /** One line for the owner. */
  noteEn: string;
}

export type AutoStatus = "approved" | "dropped" | "rejected";

/** The same wording of the same sentence, claimed once or more. */
export interface ClaimGroup {
  /** `<sentence id>#<claim key>`; the decisions file refers to groups by it. */
  key: string;
  sentenceId: string;
  /** The answer as the first learner typed it. */
  answer: string;
  claimIds: string[];
  count: number;
  /** How many of the claims AI grading accepted while the learner studied (feature 033). Missing in files pulled before it. */
  aiCount?: number;
  /** Missing when the sentence is gone. */
  sentence?: { level: string; vi: string; en: string };
  /** Decided without the owner. */
  auto?: { status: AutoStatus; reason: string; explanationVi?: string };
  /** Claude's suggestion, for the groups the owner decides. */
  suggestion?: Verdict;
  /** Why there is no suggestion, when the model call failed. */
  suggestionError?: string;
}

export interface ClaimsFile {
  date: string;
  target: Target;
  groups: ClaimGroup[];
}

export const decisionsSchema = z.object({
  date: z.string().regex(DAY),
  approve: z.array(z.string()).default([]),
  reject: z.array(z.object({ groupKey: z.string(), explanationVi: z.string() })).default([]),
});
export type Decisions = z.infer<typeof decisionsSchema>;

export const verdictSchema = z.object({
  verdict: z.enum(["approve", "reject"]),
  reasonVi: z.string().trim().min(1),
  noteEn: z.string(),
});

/** JSON schema for the model's structured output. */
export const VERDICT_JSON_SCHEMA = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["approve", "reject"] },
    reasonVi: { type: "string" },
    noteEn: { type: "string" },
  },
  required: ["verdict", "reasonVi", "noteEn"],
  additionalProperties: false,
} as const;

const NO_WORDS_VI = "Câu trả lời của bạn không có từ tiếng Anh nào.";

// ---- Reading content ----

/** Approved sentences from the parsed content/sentence/*.json files (set files included). */
export function sentencesFrom(files: readonly unknown[]): Map<string, SentenceInfo> {
  const out = new Map<string, SentenceInfo>();
  for (const data of files) {
    if (!Array.isArray(data)) continue;
    for (const raw of data) {
      const parsed = sourceItemSchema.safeParse(raw);
      if (!parsed.success || parsed.data.kind !== "sentence" || parsed.data.status !== "approved") continue;
      const { id, level, body } = parsed.data;
      out.set(id, { id, level, vi: body.vi, en: body.en, texts: [body.en, ...body.acceptedOrders.map((order) => acceptedText(body, order))] });
    }
  }
  return out;
}

/** Approved wordings per sentence id, from the parsed content/wording/*.json files. */
export function wordingsFrom(files: readonly unknown[]): Map<string, string[]> {
  const out = new Map<string, string[]>();
  for (const data of files) {
    if (!Array.isArray(data)) continue;
    for (const raw of data) {
      const parsed = sourceItemSchema.safeParse(raw);
      if (!parsed.success || parsed.data.kind !== "wording" || parsed.data.status !== "approved") continue;
      const { sentenceId, accepted } = parsed.data.body;
      out.set(sentenceId, [...(out.get(sentenceId) ?? []), ...accepted]);
    }
  }
  return out;
}

// ---- Grouping and automatic decisions ----

/** Groups claims by sentence and claim key, in the order they were first claimed. */
export function groupClaims(rows: readonly ClaimRow[]): ClaimGroup[] {
  const groups = new Map<string, ClaimGroup>();
  for (const row of [...rows].sort((a, b) => a.created_at - b.created_at || (a.id < b.id ? -1 : 1))) {
    const key = `${row.sentence_id}#${claimKey(row.answer)}`;
    const group = groups.get(key);
    if (group) {
      group.claimIds.push(row.id);
      group.count++;
      if (row.source === "ai") group.aiCount = (group.aiCount ?? 0) + 1;
    } else {
      groups.set(key, { key, sentenceId: row.sentence_id, answer: row.answer.trim(), claimIds: [row.id], count: 1, aiCount: row.source === "ai" ? 1 : 0 });
    }
  }
  return [...groups.values()];
}

/**
 * Fills in each group's sentence and decides what needs no owner: claims on a
 * sentence that is gone are dropped, wordings the sentence or an approved
 * wording already accepts are approved, and answers without a single English
 * word are rejected.
 */
export function autoDecide(
  groups: readonly ClaimGroup[],
  sentences: ReadonlyMap<string, SentenceInfo>,
  wordings: ReadonlyMap<string, readonly string[]>,
): ClaimGroup[] {
  return groups.map((group) => {
    const sentence = sentences.get(group.sentenceId);
    if (!sentence) return { ...group, auto: { status: "dropped", reason: "sentence not in the approved course" } };
    const withSentence = { ...group, sentence: { level: sentence.level, vi: sentence.vi, en: sentence.en } };
    const keys = answerKeys(group.answer);
    if (keys.length === 0) {
      return { ...withSentence, auto: { status: "rejected", reason: "no English words", explanationVi: NO_WORDS_VI } };
    }
    const accepted = new Set([...sentence.texts, ...(wordings.get(group.sentenceId) ?? [])].flatMap(answerKeys));
    if (keys.some((key) => accepted.has(key))) return { ...withSentence, auto: { status: "approved", reason: "already accepted" } };
    return withSentence;
  });
}

/** Asks `judge` about every group the owner must decide, a few at a time. A failed call leaves the group without a suggestion. */
export async function suggestVerdicts(
  groups: readonly ClaimGroup[],
  judge: (group: ClaimGroup) => Promise<Verdict>,
  concurrency = AI_CONCURRENCY,
): Promise<ClaimGroup[]> {
  const out = [...groups];
  const todo = out.flatMap((group, index) => (group.auto ? [] : [index]));
  let next = 0;
  const worker = async () => {
    while (next < todo.length) {
      const index = todo[next++];
      try {
        out[index] = { ...out[index], suggestion: await judge(out[index]) };
      } catch (error) {
        out[index] = { ...out[index], suggestionError: error instanceof Error ? error.message : String(error) };
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, todo.length) }, worker));
  return out;
}

/** The user message for one group: the data only, so the system prompt stays cacheable. */
export function judgeMessage(group: ClaimGroup): string {
  return JSON.stringify({ vietnamese: group.sentence?.vi, reference: group.sentence?.en, learner: group.answer }, null, 2);
}

// ---- Applying decisions ----

export interface ApplyPlan {
  /** Groups the owner approved: their wording is added. */
  approve: ClaimGroup[];
  reject: { group: ClaimGroup; explanationVi: string }[];
  auto: ClaimGroup[];
  /** Groups with no decision yet; they stay pending. */
  undecided: ClaimGroup[];
  errors: string[];
}

/** Matches the owner's decisions with the pulled groups. Nothing should be written while `errors` is not empty. */
export function planApply(file: ClaimsFile, decisions: Decisions): ApplyPlan {
  const errors: string[] = [];
  if (decisions.date !== file.date) errors.push(`The decisions are for ${decisions.date}, the claims file for ${file.date}`);
  const byKey = new Map(file.groups.map((group) => [group.key, group]));
  const decided = new Set<string>();
  const find = (key: string) => {
    const group = byKey.get(key);
    if (!group) errors.push(`${key}: not in the claims file`);
    else if (group.auto) errors.push(`${key}: decided automatically (${group.auto.status}), not by the owner`);
    else if (decided.has(key)) errors.push(`${key}: decided twice`);
    else {
      decided.add(key);
      return group;
    }
    return undefined;
  };
  const approve = decisions.approve.flatMap((key) => find(key) ?? []);
  const reject = decisions.reject.flatMap(({ groupKey, explanationVi }) => {
    const group = find(groupKey);
    if (!group) return [];
    if (explanationVi.trim() === "") {
      errors.push(`${groupKey}: a rejection needs a Vietnamese explanation for the learner`);
      return [];
    }
    return [{ group, explanationVi: explanationVi.trim() }];
  });
  for (const group of approve) if (!group.sentence) errors.push(`${group.key}: the sentence is missing, so the wording can't be added`);
  return {
    approve,
    reject,
    auto: file.groups.filter((group) => group.auto),
    undecided: file.groups.filter((group) => !group.auto && !decided.has(group.key)),
    errors,
  };
}

export interface WordingFile {
  /** File name without `.json` (a level). */
  level: string;
  items: Record<string, unknown>[];
}

export interface WordingAddition {
  sentenceId: string;
  level: string;
  answer: string;
}

/**
 * Adds each answer to its sentence's wording item, creating the item in
 * `<level>.json` when there is none. An answer whose claim key is already
 * there is skipped. Returns the files that changed.
 */
export function upsertWordings(files: readonly WordingFile[], additions: readonly WordingAddition[]): WordingFile[] {
  const out = new Map(files.map((file) => [file.level, { level: file.level, items: [...file.items] }]));
  const changed = new Set<string>();
  for (const { sentenceId, level, answer } of additions) {
    const id = `wording:${sentenceId.replace(/^sentence:/, "")}`;
    let home = [...out.values()].find((file) => file.items.some((item) => item.id === id));
    if (!home) {
      home = out.get(level) ?? { level, items: [] };
      out.set(level, home);
    }
    const index = home.items.findIndex((item) => item.id === id);
    const current = index >= 0 ? home.items[index] : undefined;
    const body = (current?.body ?? {}) as { accepted?: unknown };
    const accepted = Array.isArray(body.accepted) ? body.accepted.filter((text): text is string => typeof text === "string") : [];
    if (current && accepted.some((text) => claimKey(text) === claimKey(answer))) continue;
    const item = {
      ...(current ?? { id, kind: "wording", level, sort: 0 }),
      body: { sentenceId, accepted: [...accepted, answer] },
      status: "approved",
    };
    if (index >= 0) home.items[index] = item;
    else home.items.push(item);
    changed.add(home.level);
  }
  return [...changed].sort().map((level) => out.get(level)!);
}

/** One status update for a set of claims. */
export interface StatusUpdate {
  status: AutoStatus;
  ids: readonly string[];
  explanationVi?: string;
}

/** UPDATE statements that set each claim's decision, only while it is still pending. */
export function decisionSql(updates: readonly StatusUpdate[], decidedAt: number): string {
  const lines: string[] = [];
  for (const { status, ids, explanationVi } of updates) {
    const explanation = status === "rejected" && explanationVi ? sqlString(explanationVi) : "NULL";
    for (let i = 0; i < ids.length; i += IDS_PER_STATEMENT) {
      const list = ids.slice(i, i + IDS_PER_STATEMENT).map(sqlString).join(", ");
      lines.push(
        `UPDATE claims SET status = ${sqlString(status)}, explanation_vi = ${explanation}, decided_at = ${Math.trunc(decidedAt)} ` +
          `WHERE id IN (${list}) AND status = 'pending';`,
      );
    }
  }
  return lines.length ? lines.join("\n") + "\n" : "";
}

/** The status updates for a plan: owner approvals and rejections plus every automatic decision. */
export function updatesOf(plan: ApplyPlan): StatusUpdate[] {
  const updates: StatusUpdate[] = [];
  const approved = [...plan.approve, ...plan.auto.filter((group) => group.auto!.status === "approved")].flatMap((group) => group.claimIds);
  if (approved.length) updates.push({ status: "approved", ids: approved });
  for (const { group, explanationVi } of plan.reject) updates.push({ status: "rejected", ids: group.claimIds, explanationVi });
  for (const group of plan.auto.filter((g) => g.auto!.status === "rejected")) {
    updates.push({ status: "rejected", ids: group.claimIds, explanationVi: group.auto!.explanationVi });
  }
  const dropped = plan.auto.filter((group) => group.auto!.status === "dropped").flatMap((group) => group.claimIds);
  if (dropped.length) updates.push({ status: "dropped", ids: dropped });
  return updates;
}

// ---- I/O ----

export interface Io {
  contentDir: string;
  /** Runs one SELECT against D1. */
  query: (target: Target, sql: string) => ClaimRow[];
  /** Runs a SQL file against D1. */
  executeFile: (target: Target, file: string) => void;
  /** Claude's verdict; undefined skips the suggestions. */
  judge?: (group: ClaimGroup) => Promise<Verdict>;
  now: () => Date;
  log: (line: string) => void;
}

export const PENDING_SQL = "SELECT id, sentence_id, answer, created_at, source FROM claims WHERE status = 'pending' ORDER BY created_at";

async function readJsonDir(dir: string): Promise<{ name: string; data: unknown }[]> {
  if (!existsSync(dir)) return [];
  const names = (await readdir(dir)).filter((name) => name.endsWith(".json")).sort();
  return Promise.all(names.map(async (name) => ({ name, data: JSON.parse(await readFile(path.join(dir, name), "utf8")) as unknown })));
}

const claimsDir = (io: Io) => path.join(io.contentDir, ".claims");

export async function pull(target: Target, io: Io): Promise<ClaimsFile | null> {
  const rows = io.query(target, PENDING_SQL);
  if (rows.length === 0) {
    io.log(`No pending claims in ${target} D1.`);
    return null;
  }
  const sentences = sentencesFrom((await readJsonDir(path.join(io.contentDir, "sentence"))).map((file) => file.data));
  const wordings = wordingsFrom((await readJsonDir(path.join(io.contentDir, "wording"))).map((file) => file.data));
  let groups = autoDecide(groupClaims(rows), sentences, wordings);
  const open = groups.filter((group) => !group.auto).length;
  if (io.judge && open > 0) {
    io.log(`Asking Claude about ${open} group(s)…`);
    groups = await suggestVerdicts(groups, io.judge);
  }

  const date = io.now().toISOString().slice(0, 10);
  const file: ClaimsFile = { date, target, groups };
  const dir = claimsDir(io);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, `${date}.json`), JSON.stringify(file, null, 2) + "\n");
  await writeFile(path.join(dir, `${date}.html`), buildClaimsSheet(file));

  const count = (status: AutoStatus) => groups.filter((group) => group.auto?.status === status).length;
  const aiClaims = groups.reduce((sum, group) => sum + (group.aiCount ?? 0), 0);
  if (aiClaims) io.log(`${aiClaims} claim(s) were accepted by the learner's AI grading; they are marked "AI" in the sheet.`);
  io.log(`${rows.length} pending claim(s) in ${groups.length} group(s): ${open} for you, ${count("approved")} already accepted, ${count("dropped")} dropped, ${count("rejected")} rejected automatically`);
  const failed = groups.filter((group) => group.suggestionError).length;
  if (failed) io.log(`${failed} group(s) have no suggestion (the model call failed); decide them yourself.`);
  io.log(`Open ${path.join(dir, `${date}.html`)}, decide, download claims-decisions-${date}.json, then:`);
  io.log(`  pnpm content:claims apply <path to claims-decisions-${date}.json>${target === "remote" ? " --remote" : ""}`);
  return file;
}

export async function apply(decisionsPath: string, target: Target, io: Io): Promise<number> {
  const decisions = decisionsSchema.parse(JSON.parse(await readFile(decisionsPath, "utf8")));
  const claimsPath = path.join(claimsDir(io), `${decisions.date}.json`);
  if (!existsSync(claimsPath)) throw new Error(`${claimsPath} not found: run "pnpm content:claims pull" first`);
  const file = JSON.parse(await readFile(claimsPath, "utf8")) as ClaimsFile;
  if (file.target !== target) throw new Error(`These claims were pulled from ${file.target} D1; run apply with${file.target === "remote" ? "" : "out"} --remote`);
  const plan = planApply(file, decisions);
  if (plan.errors.length) {
    for (const error of plan.errors) io.log(`✗ ${error}`);
    io.log("Nothing applied.");
    return 1;
  }

  // Wordings first, so a failed D1 update can simply be re-run.
  const wordingDir = path.join(io.contentDir, "wording");
  const existing = (await readJsonDir(wordingDir)).map(({ name, data }) => ({
    level: name.slice(0, -".json".length),
    items: Array.isArray(data) ? (data as Record<string, unknown>[]) : [],
  }));
  const changed = upsertWordings(
    existing,
    plan.approve.map((group) => ({ sentenceId: group.sentenceId, level: group.sentence!.level, answer: group.answer })),
  );
  if (changed.length) await mkdir(wordingDir, { recursive: true });
  for (const { level, items } of changed) await writeFile(path.join(wordingDir, `${level}.json`), formatItems(items));

  const sql = decisionSql(updatesOf(plan), io.now().getTime());
  if (sql) {
    const sqlPath = path.join(claimsDir(io), `${decisions.date}.sql`);
    await writeFile(sqlPath, sql);
    io.executeFile(target, sqlPath);
  }

  const auto = (status: AutoStatus) => plan.auto.filter((group) => group.auto!.status === status).length;
  io.log(
    `${plan.approve.length} approved by you, ${plan.reject.length} rejected, ${auto("approved")} already accepted, ` +
      `${auto("dropped")} dropped, ${auto("rejected")} rejected automatically, ${plan.undecided.length} left pending`,
  );
  if (changed.length) {
    io.log(`Updated ${changed.map(({ level }) => `content/wording/${level}.json`).join(", ")}`);
    io.log(`Publish them: pnpm content:publish${target === "remote" ? " --remote" : " --local"}`);
  }
  return 0;
}

function wranglerD1(args: string[]): string {
  const bin = path.join(process.cwd(), "node_modules/.bin/wrangler");
  return execFileSync(bin, ["d1", "execute", DB_NAME, ...args], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

function claudeJudge(): (group: ClaimGroup) => Promise<Verdict> {
  const client = new Anthropic();
  return async (group) => {
    const message = await client.messages.create({
      model: MODEL,
      max_tokens: 2000,
      output_config: { effort: "medium" as const, format: { type: "json_schema" as const, schema: VERDICT_JSON_SCHEMA } },
      system: [{ type: "text" as const, text: CLAIM_JUDGE_SYSTEM, cache_control: { type: "ephemeral" as const } }],
      messages: [{ role: "user" as const, content: judgeMessage(group) }],
    });
    const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    return verdictSchema.parse(JSON.parse(text));
  };
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { remote: { type: "boolean", default: false }, "no-ai": { type: "boolean", default: false } },
  });
  const [command, file] = positionals;
  const target: Target = values.remote ? "remote" : "local";
  const io: Io = {
    contentDir: path.join(process.cwd(), "content"),
    query: (where, sql) =>
      (JSON.parse(wranglerD1([`--${where}`, "--json", "--command", sql])) as { results: ClaimRow[] }[])[0]?.results ?? [],
    executeFile: (where, sqlFile) => void wranglerD1([`--${where}`, "--yes", "--file", sqlFile]),
    judge: values["no-ai"] ? undefined : claudeJudge(),
    now: () => new Date(),
    log: (line) => console.log(line),
  };
  if (command === "pull") {
    await pull(target, io);
    return;
  }
  if (command === "apply" && file) {
    process.exitCode = await apply(path.resolve(file), target, io);
    return;
  }
  throw new Error("Usage: content:claims pull [--remote] [--no-ai] | apply <claims-decisions-YYYY-MM-DD.json> [--remote]");
}

if (process.argv[1]?.endsWith("claims.ts")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
