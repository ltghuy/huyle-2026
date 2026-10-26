// Builds the word list skeleton (content/wordlist/{level}.json) from the
// CEFR-J 1.5 (A1–B2) and Octanove C1 CSVs in content/sources. Idempotent:
// rerunning rewrites the same files. Drafting (draft-content.ts) turns these
// rows into full word items.
//
//   pnpm content:import   (from apps/learn-english)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { LEVELS, type Level } from "../src/learning/types";
import { parseCsv } from "./lib/csv";

export interface WordlistRow {
  id: string;
  headword: string;
  variants: string[];
  pos: string;
  level: Level;
  source: "cefrj-1.5" | "octanove-1.0";
  /** CEFR-J's own topic labels (Core Inventory / Threshold), a hint for drafting. */
  topicHints: string[];
}

const POS_SHORT: Record<string, string> = {
  noun: "n",
  verb: "v",
  adjective: "adj",
  adverb: "adv",
  pronoun: "pron",
  preposition: "prep",
  determiner: "det",
  conjunction: "conj",
  number: "num",
  interjection: "int",
  "modal auxiliary": "modal",
};

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function wordId(headword: string, pos: string): string {
  return `word:${slugify(headword)}-${POS_SHORT[pos] ?? slugify(pos)}`;
}

/** "analyze/analyse" → headword "analyze" (CEFR-J lists the American form first), variants ["analyse"]. */
export function splitHeadword(raw: string): { headword: string; variants: string[] } {
  const [headword, ...variants] = raw.split("/").map((part) => part.trim()).filter(Boolean);
  return { headword, variants };
}

function rowsOf(csv: string): Record<string, string>[] {
  const [header, ...rows] = parseCsv(csv);
  return rows
    .filter((row) => row.some((cell) => cell.trim() !== ""))
    .map((row) => Object.fromEntries(header.map((name, i) => [name, (row[i] ?? "").trim()])));
}

export function buildWordlist(cefrjCsv: string, octanoveCsv: string): WordlistRow[] {
  const byId = new Map<string, WordlistRow>();
  const add = (row: WordlistRow) => {
    // First occurrence wins: CEFR-J is read before Octanove, and within a list
    // the first (lowest) level listed for a headword + POS is kept.
    if (!byId.has(row.id)) byId.set(row.id, row);
  };

  for (const row of rowsOf(cefrjCsv)) {
    const level = row.CEFR as Level;
    if (!LEVELS.includes(level)) continue;
    const { headword, variants } = splitHeadword(row.headword);
    const topicHints = [row["CoreInventory 1"], row["CoreInventory 2"], row.Threshold].filter(Boolean);
    add({ id: wordId(headword, row.pos), headword, variants, pos: row.pos, level, source: "cefrj-1.5", topicHints });
  }
  for (const row of rowsOf(octanoveCsv)) {
    if (row.CEFR !== "C1") continue; // C2 is out of scope
    const { headword, variants } = splitHeadword(row.headword);
    add({ id: wordId(headword, row.pos), headword, variants, pos: row.pos, level: "C1", source: "octanove-1.0", topicHints: [] });
  }
  return [...byId.values()];
}

async function main() {
  const root = process.cwd();
  const sources = path.join(root, "content/sources");
  const [cefrj, octanove] = await Promise.all([
    readFile(path.join(sources, "cefrj-vocabulary-profile-1.5.csv"), "utf8"),
    readFile(path.join(sources, "octanove-vocabulary-profile-c1c2-1.0.csv"), "utf8"),
  ]);
  const rows = buildWordlist(cefrj, octanove);
  const outDir = path.join(root, "content/wordlist");
  await mkdir(outDir, { recursive: true });
  for (const level of LEVELS) {
    const levelRows = rows.filter((row) => row.level === level);
    await writeFile(path.join(outDir, `${level}.json`), JSON.stringify(levelRows, null, 2) + "\n");
    console.log(`${level}: ${levelRows.length} words`);
  }
  console.log(`total: ${rows.length}`);
}

if (process.argv[1]?.endsWith("import-wordlists.ts")) void main();
