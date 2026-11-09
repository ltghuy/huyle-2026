// Pulls content changed on the admin page back into content/{kind}/*.json
// (feature 038, AC-018), so git stays the record of the course and the next
// `pnpm content:publish` keeps the change instead of undoing it.
//
//   pnpm content:pull [--local | --remote] [--dry-run] [--content-dir <path>] [--persist-to <dir>]
//
// Reads the rows with `admin_edited_at` set. A changed item replaces its entry
// in the file that holds it (keeping fields such as `reviewNotes`), or moves to
// `<new level>.json` when its level changed; a new item is added to
// `content/<kind>/<level>.json`; a removed item is taken out of its file. Every
// pulled entry is marked approved: the owner's edit is the review. Files keep
// their order and formatting. Then the mark is cleared in D1, only on rows that
// weren't edited again meanwhile. Commit the changed files afterwards.
import { existsSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { LEVELS } from "../src/learning/types";
import { query, readSourceFiles, sqlString, wrangler, type SourceFile } from "./publish-content";

/** A row edited on the admin page, as read from D1. */
export interface EditedRow {
  id: string;
  kind: string;
  level: string;
  topic: string | null;
  sort: number;
  /** JSON text. */
  body: string;
  deleted: number;
  admin_edited_at: number;
}

type Entry = Record<string, unknown>;

export interface PullResult {
  /** New contents per file path (relative to the content dir's parent, as `readSourceFiles` names them). */
  files: Map<string, Entry[]>;
  log: string[];
}

const LEVEL_FILE = new RegExp(`^(${LEVELS.join("|")})\\.json$`);

/** The file entry for `row`; an existing entry keeps its key order and extra fields, so the diff stays small. */
function entryOf(row: EditedRow, kept?: Entry): Entry {
  const entry: Entry = kept ? { ...kept } : { level: row.level, sort: row.sort, id: row.id, kind: row.kind };
  if (!row.topic) delete entry.topic;
  Object.assign(entry, { level: row.level, sort: row.sort, id: row.id, kind: row.kind, ...(row.topic ? { topic: row.topic } : {}), body: JSON.parse(row.body) as unknown, status: "approved" });
  return entry;
}

/** Where every pulled row goes, as new file contents. Pure, for tests. */
export function applyPulled(sources: readonly SourceFile[], rows: readonly EditedRow[], contentDirName: string): PullResult {
  const files = new Map<string, Entry[]>();
  for (const { file, data } of sources) if (Array.isArray(data)) files.set(file, [...(data as Entry[])]);
  const touched = new Set<string>();
  const log: string[] = [];
  const locate = (id: string) => {
    for (const [file, entries] of files) {
      const index = entries.findIndex((entry) => entry.id === id);
      if (index >= 0) return { file, entries, index };
    }
    return null;
  };
  const levelFile = (kind: string, level: string) => path.join(contentDirName, kind, `${level}.json`);

  for (const row of rows) {
    const found = locate(row.id);
    if (row.deleted) {
      if (found) {
        found.entries.splice(found.index, 1);
        touched.add(found.file);
        log.push(`removed ${row.id} from ${found.file}`);
      }
      continue;
    }
    if (found) {
      const entry = entryOf(row, found.entries[found.index]);
      const inLevelFile = LEVEL_FILE.test(path.basename(found.file));
      const home = levelFile(row.kind, row.level);
      if (inLevelFile && found.file !== home) {
        found.entries.splice(found.index, 1);
        touched.add(found.file);
        const target = files.get(home) ?? [];
        target.push(entry);
        files.set(home, target);
        touched.add(home);
        log.push(`moved ${row.id} from ${found.file} to ${home}`);
      } else {
        found.entries[found.index] = entry;
        touched.add(found.file);
        log.push(`updated ${row.id} in ${found.file}`);
      }
      continue;
    }
    const home = levelFile(row.kind, row.level);
    const target = files.get(home) ?? [];
    target.push(entryOf(row));
    files.set(home, target);
    touched.add(home);
    log.push(`added ${row.id} to ${home}`);
  }
  return { files: new Map([...files].filter(([file]) => touched.has(file))), log };
}

/** Clears the mark only where it still holds the value that was pulled. */
export function clearMarksSql(rows: readonly EditedRow[]): string {
  return rows.map((row) => `UPDATE content_items SET admin_edited_at = NULL WHERE id = ${sqlString(row.id)} AND admin_edited_at = ${row.admin_edited_at};`).join("\n");
}

async function main() {
  const { values } = parseArgs({
    options: {
      local: { type: "boolean" },
      remote: { type: "boolean" },
      "dry-run": { type: "boolean", default: false },
      "content-dir": { type: "string", default: "content" },
      "persist-to": { type: "string" },
    },
  });
  if (values.local && values.remote) throw new Error("Pass --local or --remote, not both");
  const target = values.remote ? ["--remote"] : ["--local", ...(values["persist-to"] ? ["--persist-to", values["persist-to"]] : [])];
  const root = process.cwd();
  const contentDir = path.resolve(root, values["content-dir"]);

  const rows = query<EditedRow>(target, "SELECT id, kind, level, topic, sort, body, deleted, admin_edited_at FROM content_items WHERE admin_edited_at IS NOT NULL ORDER BY id");
  if (rows.length === 0) {
    console.log("Nothing was changed on the admin page.");
    return;
  }
  const { files, log } = applyPulled(await readSourceFiles(contentDir), rows, path.relative(root, contentDir));
  for (const line of log) console.log(line);
  if (values["dry-run"]) {
    console.log(`Dry run: ${files.size} file(s) would change; nothing written.`);
    return;
  }
  for (const [file, entries] of files) {
    const absolute = path.resolve(root, file);
    if (!existsSync(path.dirname(absolute))) await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, JSON.stringify(entries, null, 2) + "\n");
  }
  for (let i = 0; i < rows.length; i += 100) wrangler([...target, "--yes", "--command", clearMarksSql(rows.slice(i, i + 100))]);
  console.log(`Pulled ${rows.length} item(s) into ${files.size} file(s). Commit them, then \`pnpm content:publish\` works again.`);
}

if (process.argv[1]?.endsWith("pull-content.ts")) void main();
