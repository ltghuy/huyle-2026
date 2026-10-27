// Owner review of drafted content in content/{kind}/{level}.json (T011, AC-053).
//
//   pnpm content:review list [--level A1] [--kind word]
//   pnpm content:review approve <file-or-level> [--kind word] (--ids id1,id2 | --all) [--dry-run]
//   pnpm content:review unapprove <file-or-level> [--kind word] (--ids id1,id2 | --all) [--dry-run]
//   (--content-dir <path> reads another content folder; default content)
//
// Approving flips `status` to "approved" only for the selected drafts that pass
// the source schema and whose references (word and grammar examples, sentence
// words and grammar topic) are approved already or approved in the same
// command. Unapproving is refused while an item that stays approved still
// references it. Files are written back like the drafting script writes them:
// 2-space JSON sorted by id, with a trailing newline.
import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { CONTENT_KINDS, sourceItemSchema, type ContentKind, type SourceItem } from "../src/content/schema";
import { LEVELS, type Level } from "../src/learning/types";

export type Status = "draft" | "approved";

export interface SourceFile {
  /** Path relative to the working directory; also the file's identity. */
  file: string;
  kind: ContentKind;
  /** File name without `.json` (the level for regular files). */
  level: string;
  /** Parsed JSON, or a string describing why it couldn't be read. */
  data: unknown;
}

export interface Entry {
  file: string;
  index: number;
  raw: Record<string, unknown>;
  id: string;
  kind: string;
  level: string;
  status: string;
  item?: SourceItem;
  /** Schema problems, when the item doesn't validate. */
  error?: string;
}

export interface Refusal {
  id: string;
  file: string;
  reason: string;
}

export interface StatusChange {
  changed: Entry[];
  refused: Refusal[];
}

// ---- Reading ----

/** Every item of every file, validated; files that aren't arrays are reported in `problems`. */
export function entriesOf(files: readonly SourceFile[]): { entries: Entry[]; problems: string[] } {
  const entries: Entry[] = [];
  const problems: string[] = [];
  for (const { file, kind, level, data } of files) {
    if (!Array.isArray(data)) {
      problems.push(`${file}: ${typeof data === "string" ? data : "expected an array of items"}`);
      continue;
    }
    data.forEach((value, index) => {
      const raw = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
      const parsed = sourceItemSchema.safeParse(value);
      entries.push({
        file,
        index,
        raw,
        id: typeof raw.id === "string" ? raw.id : `${file}[${index}]`,
        kind: typeof raw.kind === "string" ? raw.kind : kind,
        level: typeof raw.level === "string" ? raw.level : level,
        status: typeof raw.status === "string" ? raw.status : "?",
        ...(parsed.success
          ? { item: parsed.data }
          : { error: parsed.error.issues.map((issue) => `${issue.path.join(".") || "(item)"} ${issue.message}`).join("; ") }),
      });
    });
  }
  return { entries, problems };
}

/** Ids an item needs published alongside it. */
export function referencesOf(item: SourceItem): string[] {
  if (item.kind === "word" || item.kind === "grammar") return [...item.body.examples];
  if (item.kind === "sentence") return [...item.body.wordIds, ...(item.body.grammarSlug ? [`grammar:${item.body.grammarSlug}`] : [])];
  return [];
}

export interface SummaryRow {
  kind: string;
  level: string;
  draft: number;
  approved: number;
  invalid: number;
}

/** Draft / approved / invalid counts per kind and level, in kind then level order. */
export function summarize(entries: readonly Entry[]): SummaryRow[] {
  const rows = new Map<string, SummaryRow>();
  for (const entry of entries) {
    const key = `${entry.kind}|${entry.level}`;
    const row = rows.get(key) ?? { kind: entry.kind, level: entry.level, draft: 0, approved: 0, invalid: 0 };
    if (entry.error) row.invalid++;
    else if (entry.status === "approved") row.approved++;
    else row.draft++;
    rows.set(key, row);
  }
  const kindOrder = (kind: string) => (CONTENT_KINDS as readonly string[]).indexOf(kind);
  return [...rows.values()].sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || (a.level < b.level ? -1 : a.level > b.level ? 1 : 0));
}

export function filterEntries(entries: readonly Entry[], { level, kind }: { level?: string; kind?: string }): Entry[] {
  return entries.filter((entry) => (!level || entry.level === level) && (!kind || entry.kind === kind));
}

// ---- Selecting ----

export interface Selection {
  /** Files in scope (by `SourceFile.file`). */
  files: ReadonlySet<string>;
  ids?: readonly string[];
  all?: boolean;
}

/** The entries in scope picked by `--ids` or `--all`; ids not found in scope are listed in `unknown`. */
export function selectEntries(entries: readonly Entry[], { files, ids, all }: Selection): { selected: Entry[]; unknown: string[] } {
  const inScope = entries.filter((entry) => files.has(entry.file));
  if (all) return { selected: inScope, unknown: [] };
  if (!ids?.length) throw new Error("Pass --ids id1,id2 or --all");
  const wanted = new Set(ids);
  const selected = inScope.filter((entry) => wanted.has(entry.id));
  const found = new Set(selected.map((entry) => entry.id));
  return { selected, unknown: ids.filter((id) => !found.has(id)) };
}

// ---- Changing status ----

function describeMissing(ref: string, byId: Map<string, Entry[]>): string {
  const targets = byId.get(ref);
  if (!targets) return `${ref} doesn't exist`;
  if (targets.every((target) => target.error)) return `${ref} is invalid`;
  return `${ref} is still a draft`;
}

/**
 * Which selected drafts can be approved. Invalid items are refused, then items
 * whose references are neither approved nor being approved now, repeated until
 * nothing else drops out (refusing one item can strand another).
 */
export function planApprove(entries: readonly Entry[], selected: readonly Entry[]): StatusChange {
  const refused: Refusal[] = [];
  let candidates: Entry[] = [];
  for (const entry of selected) {
    if (entry.status === "approved") continue;
    if (entry.error) refused.push({ id: entry.id, file: entry.file, reason: `invalid: ${entry.error}` });
    else candidates.push(entry);
  }

  const byId = new Map<string, Entry[]>();
  for (const entry of entries) byId.set(entry.id, [...(byId.get(entry.id) ?? []), entry]);
  const approved = new Set(entries.filter((entry) => entry.status === "approved" && !entry.error).map((entry) => entry.id));

  for (;;) {
    const available = new Set([...approved, ...candidates.map((entry) => entry.id)]);
    const blocked = new Map<Entry, string[]>();
    for (const entry of candidates) {
      const missing = referencesOf(entry.item!).filter((ref) => !available.has(ref));
      if (missing.length) blocked.set(entry, missing);
    }
    if (blocked.size === 0) break;
    for (const [entry, missing] of blocked) {
      refused.push({ id: entry.id, file: entry.file, reason: `references ${missing.map((ref) => describeMissing(ref, byId)).join(", ")}` });
    }
    candidates = candidates.filter((entry) => !blocked.has(entry));
  }
  return { changed: candidates, refused };
}

/**
 * Which selected approved items can go back to draft: an item stays approved
 * while an item that stays approved references it (publishing would fail).
 */
export function planUnapprove(entries: readonly Entry[], selected: readonly Entry[]): StatusChange {
  const refused: Refusal[] = [];
  let candidates = selected.filter((entry) => entry.status === "approved");
  for (;;) {
    const leaving = new Set(candidates);
    const staying = entries.filter((entry) => entry.status === "approved" && !entry.error && !leaving.has(entry));
    const referrers = new Map<string, string[]>();
    for (const entry of staying) {
      for (const ref of referencesOf(entry.item!)) referrers.set(ref, [...(referrers.get(ref) ?? []), entry.id]);
    }
    const blocked = candidates.filter((entry) => referrers.has(entry.id));
    if (blocked.length === 0) break;
    for (const entry of blocked) {
      refused.push({ id: entry.id, file: entry.file, reason: `still referenced by approved ${referrers.get(entry.id)!.join(", ")}` });
    }
    candidates = candidates.filter((entry) => !blocked.includes(entry));
  }
  return { changed: candidates, refused };
}

/** Same layout as the drafting script's writes: 2-space JSON sorted by id, trailing newline. */
export function formatItems(items: readonly Record<string, unknown>[]): string {
  const id = (item: Record<string, unknown>) => String(item.id ?? "");
  const sorted = [...items].sort((a, b) => (id(a) < id(b) ? -1 : id(a) > id(b) ? 1 : 0));
  return JSON.stringify(sorted, null, 2) + "\n";
}

/** New contents for each file that has a changed entry. */
export function applyStatus(files: readonly SourceFile[], changed: readonly Entry[], status: Status): Map<string, string> {
  const byFile = new Map<string, Set<number>>();
  for (const entry of changed) byFile.set(entry.file, (byFile.get(entry.file) ?? new Set()).add(entry.index));
  const output = new Map<string, string>();
  for (const { file, data } of files) {
    const indexes = byFile.get(file);
    if (!indexes || !Array.isArray(data)) continue;
    const items = (data as Record<string, unknown>[]).map((item, index) => (indexes.has(index) ? { ...item, status } : item));
    output.set(file, formatItems(items));
  }
  return output;
}

/** Files a `<file-or-level>` target covers: a level (optionally one kind), or one file path. */
export function resolveTarget(target: string, files: readonly SourceFile[], kind?: string): Set<string> {
  if ((LEVELS as readonly string[]).includes(target)) {
    return new Set(files.filter((f) => f.level === target && (!kind || f.kind === kind)).map((f) => f.file));
  }
  const wanted = path.resolve(target);
  const match = files.find((f) => path.resolve(f.file) === wanted);
  if (!match) throw new Error(`${target} is neither a level (${LEVELS.join(", ")}) nor a content file`);
  if (kind && match.kind !== kind) throw new Error(`${target} holds ${match.kind} items, not ${kind}`);
  return new Set([match.file]);
}

// ---- I/O ----

export async function readSourceFiles(contentDir: string): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  for (const kind of CONTENT_KINDS) {
    const dir = path.join(contentDir, kind);
    if (!existsSync(dir)) continue;
    for (const name of (await readdir(dir)).filter((n) => n.endsWith(".json")).sort()) {
      const file = path.relative(process.cwd(), path.join(dir, name));
      let data: unknown;
      try {
        data = JSON.parse(await readFile(file, "utf8"));
      } catch (error) {
        data = `unreadable JSON (${String(error)})`;
      }
      files.push({ file, kind, level: name.slice(0, -".json".length), data });
    }
  }
  return files;
}

function printList(entries: Entry[], problems: string[]) {
  const rows = summarize(entries);
  console.table(rows.length ? rows : [{ kind: "(none)", level: "", draft: 0, approved: 0, invalid: 0 }]);
  for (const problem of problems) console.log(`! ${problem}`);
  const drafts = entries.filter((entry) => entry.status !== "approved" || entry.error);
  if (!drafts.length) return console.log("No drafts.");
  console.log(`\n${drafts.length} to review:`);
  for (const entry of drafts) {
    console.log(`- ${entry.id} (${entry.file})${entry.error ? `  INVALID: ${entry.error}` : ""}`);
    const notes = (entry.item?.reviewNotes ?? (Array.isArray(entry.raw.reviewNotes) ? (entry.raw.reviewNotes as string[]) : []));
    for (const note of notes) console.log(`    note: ${note}`);
  }
}

/** Runs one command; returns the process exit code. */
export async function run(argv: string[]): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    allowPositionals: true,
    options: {
      level: { type: "string" },
      kind: { type: "string" },
      ids: { type: "string" },
      all: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "content-dir": { type: "string", default: "content" },
    },
  });
  const [command, target] = positionals;
  if (values.kind && !(CONTENT_KINDS as readonly string[]).includes(values.kind)) throw new Error(`Unknown kind ${values.kind}`);
  if (values.level && !(LEVELS as readonly string[]).includes(values.level as Level)) throw new Error(`Unknown level ${values.level}`);

  const files = await readSourceFiles(path.resolve(values["content-dir"]));
  const { entries, problems } = entriesOf(files);

  if (command === "list") {
    printList(filterEntries(entries, values), problems);
    return 0;
  }
  if (command !== "approve" && command !== "unapprove") {
    throw new Error("Usage: content:review list | approve <file-or-level> | unapprove <file-or-level>");
  }
  if (!target) throw new Error(`Pass the file or level to ${command}`);

  const scope = resolveTarget(target, files, values.kind);
  const ids = values.ids?.split(",").map((id) => id.trim()).filter(Boolean);
  const { selected, unknown } = selectEntries(entries, { files: scope, ids, all: values.all });
  const plan = command === "approve" ? planApprove(entries, selected) : planUnapprove(entries, selected);
  const status: Status = command === "approve" ? "approved" : "draft";

  for (const id of unknown) console.log(`? ${id}: not found in ${target}`);
  for (const { id, reason } of plan.refused) console.log(`✗ ${id}: ${reason}`);
  for (const entry of plan.changed) console.log(`✓ ${entry.id} → ${status}`);
  console.log(`${plan.changed.length} ${command === "approve" ? "approved" : "back to draft"}, ${plan.refused.length} refused${values["dry-run"] ? " (dry run, nothing written)" : ""}`);

  if (!values["dry-run"]) {
    for (const [file, text] of applyStatus(files, plan.changed, status)) await writeFile(file, text);
  }
  return plan.refused.length || unknown.length ? 1 : 0;
}

if (process.argv[1]?.endsWith("review.ts")) {
  run(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    });
}
