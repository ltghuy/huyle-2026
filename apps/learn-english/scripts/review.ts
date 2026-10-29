// Owner review of drafted content in content/{kind}/{level}.json (T011, AC-053).
//
//   pnpm content:review list [--scope A1] [--kind word]
//   pnpm content:review sheet <scope>   (writes content/.review/<scope>.html, a page to review the drafts in)
//   pnpm content:review approve <file-or-scope> [--kind word] (--ids id1,id2 | --ids-file review-A1.json | --all) [--dry-run]
//   pnpm content:review unapprove <file-or-scope> [--kind word] (--ids id1,id2 | --all) [--dry-run]
//   (--content-dir <path> reads another content folder; default content)
//
// A scope is a level (A1…C1) or a vocabulary set (set-it: content/set/set-it.json
// plus the set's new words and sentences in content/{word,sentence}/set-it.json,
// feature 012). A set is approved like any item, once all its words are.
//
// Approving flips `status` to "approved" only for the selected drafts that pass
// the source schema and whose references (word and grammar examples, sentence
// words and grammar topic) are approved already or approved in the same
// command. Unapproving is refused while an item that stays approved still
// references it. Files are written back like the drafting script writes them:
// 2-space JSON sorted by id, with a trailing newline.
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { buildSheet, idsFromDecisions, reviewUnits } from "./lib/review-sheet";
import { isScope, SCOPE_HINT } from "./lib/scope";
import { CONTENT_KINDS, sourceItemSchema, type ContentKind, type SourceItem } from "../src/content/schema";

export type Status = "draft" | "approved";

export interface SourceFile {
  /** Path relative to the working directory; also the file's identity. */
  file: string;
  kind: ContentKind;
  /** File name without `.json`: the scope (a level, or `set-<slug>`). */
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
  /** The file's scope: its level, or `set-<slug>` for a vocabulary set's files. */
  scope: string;
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
        scope: level,
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
  // A verb's forms are only shown with the verb itself (feature 008).
  if (item.kind === "forms") return [item.body.wordId];
  // A set is published with all its words (feature 012).
  if (item.kind === "set") return [...item.body.wordIds];
  return [];
}

export interface SummaryRow {
  kind: string;
  level: string;
  draft: number;
  approved: number;
  invalid: number;
}

/** Draft / approved / invalid counts per kind and scope (level or set), in kind then scope order. */
export function summarize(entries: readonly Entry[]): SummaryRow[] {
  const rows = new Map<string, SummaryRow>();
  for (const entry of entries) {
    const key = `${entry.kind}|${entry.scope}`;
    const row = rows.get(key) ?? { kind: entry.kind, level: entry.scope, draft: 0, approved: 0, invalid: 0 };
    if (entry.error) row.invalid++;
    else if (entry.status === "approved") row.approved++;
    else row.draft++;
    rows.set(key, row);
  }
  const kindOrder = (kind: string) => (CONTENT_KINDS as readonly string[]).indexOf(kind);
  return [...rows.values()].sort((a, b) => kindOrder(a.kind) - kindOrder(b.kind) || (a.level < b.level ? -1 : a.level > b.level ? 1 : 0));
}

export function filterEntries(entries: readonly Entry[], { scope, kind }: { scope?: string; kind?: string }): Entry[] {
  return entries.filter((entry) => (!scope || entry.scope === scope) && (!kind || entry.kind === kind));
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

/** Files a `<file-or-scope>` target covers: a level or set scope (optionally one kind), or one file path. */
export function resolveTarget(target: string, files: readonly SourceFile[], kind?: string): Set<string> {
  if (isScope(target)) {
    return new Set(files.filter((f) => f.level === target && (!kind || f.kind === kind)).map((f) => f.file));
  }
  const wanted = path.resolve(target);
  const match = files.find((f) => path.resolve(f.file) === wanted);
  if (!match) throw new Error(`${target} is neither a scope (${SCOPE_HINT}) nor a content file`);
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
      scope: { type: "string" },
      // The old name of --scope.
      level: { type: "string" },
      kind: { type: "string" },
      ids: { type: "string" },
      "ids-file": { type: "string" },
      all: { type: "boolean", default: false },
      "dry-run": { type: "boolean", default: false },
      "content-dir": { type: "string", default: "content" },
    },
  });
  const [command, target] = positionals;
  if (values.kind && !(CONTENT_KINDS as readonly string[]).includes(values.kind)) throw new Error(`Unknown kind ${values.kind}`);
  const listScope = values.scope ?? values.level;
  if (listScope && !isScope(listScope)) throw new Error(`Unknown scope ${listScope}: use ${SCOPE_HINT}`);

  const files = await readSourceFiles(path.resolve(values["content-dir"]));
  const { entries, problems } = entriesOf(files);

  if (command === "list") {
    printList(filterEntries(entries, { scope: listScope, kind: values.kind }), problems);
    return 0;
  }
  if (command === "sheet") {
    if (!target || !isScope(target)) throw new Error(`Pass a scope to sheet: ${SCOPE_HINT}`);
    const items = entries.filter((entry) => entry.scope === target && entry.item).map((entry) => entry.item!);
    const topics = JSON.parse(await readFile(path.resolve(values["content-dir"], "topics.json"), "utf8")) as { slug: string; titleVi: string }[];
    const units = reviewUnits(items);
    const out = path.resolve(values["content-dir"], ".review", `${target}.html`);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, buildSheet(target, units, Object.fromEntries(topics.map((topic) => [topic.slug, topic.titleVi]))));
    console.log(`${units.length} units to review → ${path.relative(process.cwd(), out)}`);
    console.log(`Open it in a browser, then: pnpm content:review approve ${target} --ids-file <downloaded review-${target}.json>`);
    if (target.startsWith("set-")) console.log(`Then approve the set itself: pnpm content:review approve content/set/${target}.json --all`);
    return 0;
  }
  if (command !== "approve" && command !== "unapprove") {
    throw new Error("Usage: content:review list | sheet <scope> | approve <file-or-scope> | unapprove <file-or-scope>");
  }
  if (!target) throw new Error(`Pass the file or scope to ${command}`);

  const scope = resolveTarget(target, files, values.kind);
  const ids = values["ids-file"]
    ? idsFromDecisions(JSON.parse(await readFile(path.resolve(values["ids-file"]), "utf8")))
    : values.ids?.split(",").map((id) => id.trim()).filter(Boolean);
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
