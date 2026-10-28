// Publishes approved course content from content/{kind}/*.json to D1 (AC-052,
// AC-053, AC-054): validates, checks references, generates the placement
// items, upserts new or changed rows, tombstones removed ids and bumps
// content_meta.version last, so clients only refetch once everything is in.
//
//   pnpm content:publish [--local | --remote] [--levels A1,A2,B1] [--dry-run] [--allow-missing-audio] [--content-dir <path>] [--persist-to <dir>]
//   (--persist-to: a separate local D1 state, used by the e2e suite so its fixture never touches real local content)
//   (--levels: publish only these levels; rows of other levels are neither upserted nor tombstoned)
//
// Changed rows are found by comparing each approved item with the row read
// back from D1 (kind, level, topic, sort and body), so nothing extra is
// stored and unchanged rows keep their updated_version.
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import {
  CONTENT_KINDS,
  contentItemSchema,
  sourceItemSchema,
  type ContentItem,
  type ContentItemOf,
  type ContentKind,
} from "../src/content/schema";
import { buildMcq } from "../src/learning/exercises/mcq";
import { createRng, shuffle } from "../src/learning/exercises/random";
import { LEVELS } from "../src/learning/types";

export const STATEMENTS_PER_FILE = 100;
export const PLACEMENT_MEANING_ITEMS = 12;
export const PLACEMENT_GRAMMAR_ITEMS = 6;
const DB_NAME = "learn-english";

export interface SourceFile {
  file: string;
  data: unknown;
}

/** The row columns we compare and write (`deleted` and `updated_version` aside). */
export interface ExistingRow {
  id: string;
  kind: string;
  level: string;
  topic: string | null;
  sort: number;
  body: string;
  deleted: number;
}

/** FNV-1a, 32-bit: seeds the placement shuffles from stable ids. */
function hashString(text: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** JSON with object keys sorted, so equal values always serialize the same. */
export function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
    return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

/**
 * Validates every source item and keeps the approved ones, without `status`
 * and `reviewNotes`. Drafts are counted, not errors.
 */
export function collectApproved(files: readonly SourceFile[]): { items: ContentItem[]; drafts: number; errors: string[] } {
  const items: ContentItem[] = [];
  const errors: string[] = [];
  const seen = new Map<string, string>();
  let drafts = 0;
  for (const { file, data } of files) {
    if (!Array.isArray(data)) {
      errors.push(`${file}: ${typeof data === "string" ? data : "expected an array of items"}`);
      continue;
    }
    data.forEach((raw, i) => {
      const parsed = sourceItemSchema.safeParse(raw);
      if (!parsed.success) {
        const id = (raw as { id?: unknown })?.id;
        errors.push(`${file}[${i}]${typeof id === "string" ? ` ${id}` : ""}: ${parsed.error.issues.map((issue) => `${issue.path.join(".")} ${issue.message}`).join("; ")}`);
        return;
      }
      const { status } = parsed.data;
      // Parsing as a content item strips the git-only `status` and `reviewNotes`.
      const item = contentItemSchema.parse(parsed.data);
      const where = seen.get(item.id);
      if (where) {
        errors.push(`${file}[${i}]: duplicate id ${item.id} (also in ${where})`);
        return;
      }
      seen.set(item.id, file);
      if (status !== "approved") {
        drafts++;
        return;
      }
      items.push(item);
    });
  }
  return { items, drafts, errors };
}

/** References that point at ids missing from the approved set. */
export function checkReferences(items: readonly ContentItem[]): string[] {
  const ids = new Set(items.map((item) => item.id));
  const errors: string[] = [];
  const need = (from: string, ref: string) => {
    if (!ids.has(ref)) errors.push(`${from} references ${ref}, which is not approved or doesn't exist`);
  };
  for (const item of items) {
    if (item.kind === "word" || item.kind === "grammar") for (const ref of item.body.examples) need(item.id, ref);
    if (item.kind === "sentence") {
      for (const ref of item.body.wordIds) need(item.id, ref);
      if (item.body.grammarSlug) need(item.id, `grammar:${item.body.grammarSlug}`);
    }
    if (item.kind === "forms") need(item.id, item.body.wordId);
  }
  return errors;
}

/** Ids of words, sentences and verb forms that have no audio yet. */
export function missingAudio(items: readonly ContentItem[]): string[] {
  return items.flatMap((item) => ((item.kind === "word" || item.kind === "sentence" || item.kind === "forms") && item.body.audio === "" ? [item.id] : []));
}

type PlacementItem = ContentItemOf<"placement">;

/**
 * Per level: up to 12 meaning questions from the approved words and up to 6
 * grammar questions from the approved topics' 4-option practice items.
 */
export function generatePlacement(items: readonly ContentItem[]): PlacementItem[] {
  const out: PlacementItem[] = [];
  for (const level of LEVELS) {
    const slug = level.toLowerCase();
    let n = 0;
    const add = (body: PlacementItem["body"]) => {
      n++;
      out.push(contentItemSchema.parse({ id: `placement:${slug}-${n}`, kind: "placement", level, sort: n, body }) as PlacementItem);
    };

    const words = items
      .filter((item): item is ContentItemOf<"word"> => item.kind === "word" && item.level === level)
      .sort((a, b) => (a.id < b.id ? -1 : 1));
    let meanings = 0;
    for (const target of shuffle(words, createRng(hashString(`placement:${level}:words`)))) {
      if (meanings === PLACEMENT_MEANING_ITEMS) break;
      const mcq = buildMcq({ target, pool: words, direction: "en-vi" }, hashString(target.id));
      if (!mcq || new Set(mcq.options.map((o) => o.text)).size !== mcq.options.length) continue;
      add({ kind: "meaning-mcq", prompt: mcq.prompt, options: mcq.options.map((o) => o.text), answerIndex: mcq.answerIndex });
      meanings++;
    }

    const practice = items
      .filter((item): item is ContentItemOf<"grammar"> => item.kind === "grammar" && item.level === level)
      .sort((a, b) => (a.id < b.id ? -1 : 1))
      .flatMap((topic) => topic.body.practice.map((entry, i) => ({ key: `${topic.id}#${i}`, entry })))
      .filter(({ entry }) => entry.options && new Set(entry.options).size === 4 && entry.options.includes(entry.answer));
    let grammar = 0;
    for (const { key, entry } of shuffle(practice, createRng(hashString(`placement:${level}:grammar`)))) {
      if (grammar === PLACEMENT_GRAMMAR_ITEMS) break;
      const options = shuffle(entry.options!, createRng(hashString(key)));
      add({ kind: "grammar-mcq", prompt: entry.prompt, options, answerIndex: options.indexOf(entry.answer) });
      grammar++;
    }
  }
  return out;
}

export interface PublishPlan {
  upserts: ContentItem[];
  tombstones: string[];
}

function sameRow(item: ContentItem, row: ExistingRow): boolean {
  if (row.deleted) return false;
  let body: unknown;
  try {
    body = JSON.parse(row.body);
  } catch {
    return false;
  }
  return (
    row.kind === item.kind &&
    row.level === item.level &&
    (row.topic ?? undefined) === item.topic &&
    row.sort === item.sort &&
    stableStringify(body) === stableStringify(item.body)
  );
}

/**
 * New or changed items to upsert, and live rows no longer in the approved set
 * to tombstone. With `levels`, rows of other levels are left alone.
 */
export function planPublish(items: readonly ContentItem[], existing: readonly ExistingRow[], levels?: ReadonlySet<string>): PublishPlan {
  const rows = new Map(existing.map((row) => [row.id, row]));
  const ids = new Set(items.map((item) => item.id));
  const inScope = (row: ExistingRow) => !levels || levels.has(row.level);
  return {
    upserts: items.filter((item) => {
      const row = rows.get(item.id);
      return !row || !sameRow(item, row);
    }),
    tombstones: existing.filter((row) => inScope(row) && !row.deleted && !ids.has(row.id)).map((row) => row.id).sort(),
  };
}

export function sqlString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

export function upsertSql(item: ContentItem, version: number): string {
  const topic = item.topic === undefined ? "NULL" : sqlString(item.topic);
  return (
    "INSERT INTO content_items (id, kind, level, topic, sort, body, deleted, updated_version) " +
    `VALUES (${sqlString(item.id)}, ${sqlString(item.kind)}, ${sqlString(item.level)}, ${topic}, ${item.sort}, ${sqlString(JSON.stringify(item.body))}, 0, ${version}) ` +
    "ON CONFLICT(id) DO UPDATE SET kind = excluded.kind, level = excluded.level, topic = excluded.topic, sort = excluded.sort, " +
    "body = excluded.body, deleted = 0, updated_version = excluded.updated_version;"
  );
}

export function tombstoneSql(id: string, version: number): string {
  return `UPDATE content_items SET deleted = 1, updated_version = ${version} WHERE id = ${sqlString(id)};`;
}

export function metaSql(version: number, publishedAt: number, counts: Record<string, number>): string {
  return (
    "INSERT INTO content_meta (id, version, published_at, counts) " +
    `VALUES (1, ${version}, ${publishedAt}, ${sqlString(JSON.stringify(counts))}) ` +
    "ON CONFLICT(id) DO UPDATE SET version = excluded.version, published_at = excluded.published_at, counts = excluded.counts;"
  );
}

export function countsByKind(items: readonly ContentItem[]): Record<ContentKind, number> {
  const counts = Object.fromEntries(CONTENT_KINDS.map((kind) => [kind, 0])) as Record<ContentKind, number>;
  for (const item of items) counts[item.kind]++;
  return counts;
}

export function chunk<T>(values: readonly T[], size: number = STATEMENTS_PER_FILE): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < values.length; i += size) out.push(values.slice(i, i + size));
  return out;
}

/** SQL file contents in execution order; the version bump is always the last file on its own. */
export function buildSqlFiles(plan: PublishPlan, version: number, publishedAt: number, counts: Record<string, number>): string[] {
  const statements = [...plan.upserts.map((item) => upsertSql(item, version)), ...plan.tombstones.map((id) => tombstoneSql(id, version))];
  return [...chunk(statements).map((part) => part.join("\n") + "\n"), metaSql(version, publishedAt, counts) + "\n"];
}

// ---- I/O ----

async function readSourceFiles(contentDir: string): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  for (const kind of CONTENT_KINDS) {
    const dir = path.join(contentDir, kind);
    if (!existsSync(dir)) continue;
    for (const name of (await readdir(dir)).filter((n) => n.endsWith(".json")).sort()) {
      const file = path.join(dir, name);
      try {
        files.push({ file: path.relative(process.cwd(), file), data: JSON.parse(await readFile(file, "utf8")) });
      } catch (error) {
        files.push({ file: path.relative(process.cwd(), file), data: `unreadable JSON (${String(error)})` });
      }
    }
  }
  return files;
}

function wrangler(args: string[]): string {
  const bin = path.join(process.cwd(), "node_modules/.bin/wrangler");
  return execFileSync(bin, ["d1", "execute", DB_NAME, ...args], { encoding: "utf8", maxBuffer: 512 * 1024 * 1024 });
}

function query<T>(target: string[], sql: string): T[] {
  const output = JSON.parse(wrangler([...target, "--json", "--command", sql])) as { results: T[] }[];
  return output[0]?.results ?? [];
}

async function main() {
  const { values } = parseArgs({
    options: {
      local: { type: "boolean" },
      remote: { type: "boolean" },
      "dry-run": { type: "boolean", default: false },
      "allow-missing-audio": { type: "boolean", default: false },
      "content-dir": { type: "string", default: "content" },
      "persist-to": { type: "string" },
      levels: { type: "string" },
    },
  });
  const levels = values.levels ? new Set(values.levels.split(",").map((level) => level.trim().toUpperCase())) : undefined;
  for (const level of levels ?? []) {
    if (!(LEVELS as readonly string[]).includes(level)) throw new Error(`--levels: unknown level ${level}`);
  }
  if (values.local && values.remote) throw new Error("Pass --local or --remote, not both");
  if (values.remote && values["persist-to"]) throw new Error("--persist-to only applies to --local");
  const target = values.remote ? ["--remote"] : ["--local", ...(values["persist-to"] ? ["--persist-to", values["persist-to"]] : [])];
  const root = process.cwd();
  const contentDir = path.resolve(root, values["content-dir"]);

  const collected = collectApproved(await readSourceFiles(contentDir));
  const { drafts, errors } = collected;
  const approved = levels ? collected.items.filter((item) => levels.has(item.level)) : collected.items;
  if (levels) console.log(`Publishing levels ${[...levels].join(", ")} only (${collected.items.length - approved.length} approved item(s) of other levels held back)`);
  errors.push(...checkReferences(approved));
  const sourced = approved.filter((item) => item.kind !== "placement");
  const placement = generatePlacement(sourced);
  for (const item of placement) {
    if (approved.some((other) => other.id === item.id)) errors.push(`${item.id}: generated placement id clashes with a source item`);
  }
  if (errors.length > 0) {
    console.error(`Publish aborted: ${errors.length} problem(s)`);
    for (const error of errors) console.error(`  - ${error}`);
    process.exitCode = 1;
    return;
  }

  const silent = missingAudio(approved);
  if (silent.length > 0) {
    console.log(`${silent.length} approved item(s) have no audio yet`);
    if (!values["allow-missing-audio"]) {
      console.error("Publish aborted: generate the audio first, or pass --allow-missing-audio");
      process.exitCode = 1;
      return;
    }
  }

  const items = [...approved, ...placement];
  const existing = query<ExistingRow>(target, "SELECT id, kind, level, topic, sort, body, deleted FROM content_items");
  const plan = planPublish(items, existing, levels);
  console.log(`${items.length} approved (${placement.length} placement generated), ${drafts} draft(s) skipped`);
  console.log(`${plan.upserts.length} to upsert, ${plan.tombstones.length} to tombstone`);
  if (plan.upserts.length === 0 && plan.tombstones.length === 0) {
    console.log("Nothing changed; content_meta left as is.");
    return;
  }

  const [meta] = query<{ version: number }>(target, "SELECT version FROM content_meta WHERE id = 1");
  const version = (meta?.version ?? 0) + 1;
  const files = buildSqlFiles(plan, version, Date.now(), countsByKind(items));
  const outDir = path.join(root, "content/.publish");
  await rm(outDir, { recursive: true, force: true });
  await mkdir(outDir, { recursive: true });
  const paths: string[] = [];
  for (const [i, sql] of files.entries()) {
    const file = path.join(outDir, `${String(i + 1).padStart(4, "0")}${i === files.length - 1 ? "-meta" : ""}.sql`);
    await writeFile(file, sql);
    paths.push(file);
  }
  if (values["dry-run"]) {
    console.log(`Dry run: wrote ${paths.length} SQL file(s) to ${path.relative(root, outDir)} for version ${version}`);
    return;
  }
  for (const [i, file] of paths.entries()) {
    console.log(`(${i + 1}/${paths.length}) ${path.relative(root, file)}`);
    wrangler([...target, "--yes", "--file", file]);
  }
  console.log(`Published content version ${version} (${target.join(" ").slice(2)})`);
}

if (process.argv[1]?.endsWith("publish-content.ts")) void main();
