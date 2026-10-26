// Adds General American IPA to the word list: looks each headword up in the
// CMU Pronouncing Dictionary and converts it with arpabetToIpa. Writes
// content/wordlist/ipa.json ({ wordId: "/…/" }) and ipa-missing.json (words
// that need a hand-written transcription). CMUdict is downloaded once into
// content/sources/.cache (not committed).
//
//   pnpm content:ipa   (from apps/learn-english, after content:import)
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { LEVELS } from "../src/learning/types";
import { arpabetToIpa } from "./lib/arpabet";
import type { WordlistRow } from "./import-wordlists";

const CMUDICT_URL =
  "https://raw.githubusercontent.com/cmusphinx/cmudict/74790861f652b15e4ac49015a90074ad62a27690/cmudict.dict";

/** All pronunciations per lowercase word, in CMUdict order ("word(2)" lines are alternates). */
export function parseCmudict(text: string): Map<string, string[]> {
  const entries = new Map<string, string[]>();
  for (const line of text.split("\n")) {
    const match = /^(\S+?)(?:\(\d+\))?\s+([^#]+)/.exec(line);
    if (!match) continue;
    const key = match[1].toLowerCase();
    entries.set(key, [...(entries.get(key) ?? []), match[2].trim()]);
  }
  return entries;
}

const primaryStressIndex = (pron: string) => pron.split(/\s+/).filter((p) => /\d$/.test(p)).findIndex((p) => p.endsWith("1"));

/**
 * Picks the pronunciation for a part of speech. Stress-shifting pairs (record,
 * present, object…) list both forms; nouns and adjectives take the earliest
 * primary stress, verbs the latest. Anything else keeps CMUdict's first entry.
 */
export function choosePronunciation(prons: string[], pos?: string): string {
  if (prons.length < 2 || !pos) return prons[0];
  const byStress = [...prons].sort((a, b) => primaryStressIndex(a) - primaryStressIndex(b));
  if (primaryStressIndex(byStress[0]) === primaryStressIndex(byStress.at(-1)!)) return prons[0];
  if (pos === "noun" || pos === "adjective") return byStress[0];
  if (pos === "verb") return byStress.at(-1)!;
  return prons[0];
}

/** IPA for a headword or its variants; multi-word entries are looked up word by word. */
export function lookupIpa(
  dict: Map<string, string[]>,
  headword: string,
  variants: string[] = [],
  pos?: string,
): string | undefined {
  for (const candidate of [headword, ...variants]) {
    const key = candidate.toLowerCase();
    const whole = dict.get(key);
    if (whole) return `/${arpabetToIpa(choosePronunciation(whole, pos))}/`;
    const parts = key.split(/[\s-]+/).filter(Boolean);
    if (parts.length > 1) {
      const prons = parts.map((part) => dict.get(part));
      if (prons.every(Boolean)) return `/${prons.map((pron) => arpabetToIpa(pron![0])).join(" ")}/`;
    }
  }
  return undefined;
}

async function loadCmudict(cacheDir: string): Promise<Map<string, string[]>> {
  const file = path.join(cacheDir, "cmudict.dict");
  if (!existsSync(file)) {
    await mkdir(cacheDir, { recursive: true });
    const response = await fetch(CMUDICT_URL);
    if (!response.ok) throw new Error(`CMUdict download failed: ${response.status}`);
    await writeFile(file, await response.text());
  }
  return parseCmudict(await readFile(file, "utf8"));
}

async function main() {
  const root = process.cwd();
  const dict = await loadCmudict(path.join(root, "content/sources/.cache"));
  const wordlistDir = path.join(root, "content/wordlist");
  const ipa: Record<string, string> = {};
  const missing: Pick<WordlistRow, "id" | "headword" | "level">[] = [];
  for (const level of LEVELS) {
    const rows: WordlistRow[] = JSON.parse(await readFile(path.join(wordlistDir, `${level}.json`), "utf8"));
    for (const row of rows) {
      const found = lookupIpa(dict, row.headword, row.variants, row.pos);
      if (found) ipa[row.id] = found;
      else missing.push({ id: row.id, headword: row.headword, level: row.level });
    }
  }
  await writeFile(path.join(wordlistDir, "ipa.json"), JSON.stringify(ipa, null, 2) + "\n");
  await writeFile(path.join(wordlistDir, "ipa-missing.json"), JSON.stringify(missing, null, 2) + "\n");
  console.log(`IPA found: ${Object.keys(ipa).length}, missing: ${missing.length} (see content/wordlist/ipa-missing.json)`);
}

if (process.argv[1]?.endsWith("build-ipa.ts")) void main();
