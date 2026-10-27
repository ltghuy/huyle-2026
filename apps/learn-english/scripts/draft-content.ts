// Drafts course content with Claude through the Message Batches API (half
// price, asynchronous). Run on the owner's machine only; the app never calls
// the model. Drafted items land in content/{word,sentence,grammar,writing}/
// with status "draft" and must be approved with review.ts before publishing.
//
//   pnpm content:draft submit words --level A1 [--limit 20] [--group 10]
//   pnpm content:draft submit grammar --level A1 [--limit 2]
//   pnpm content:draft submit writing --level A1
//   pnpm content:draft status
//   pnpm content:draft collect [batchId]     (all ended, uncollected batches by default)
//   pnpm content:draft import <file…> [--check]
//
// submit/status/collect need ANTHROPIC_API_KEY (or an `ant auth login` profile)
// in the shell and cost money. `import` is the free route: it reads drafts
// written by hand or in a Claude Code session, in the same shapes the model
// returns, one JSON file each:
//   { "kind": "words", "level": "A1", "words": WordDraft[] }
//   { "kind": "grammar", "slug": "present-simple", "draft": GrammarDraft }
//   { "kind": "writing", "level": "A1", "tasks": WritingDraft["tasks"] }
// It checks them against the drafting rules and, without --check, merges the
// items into the content files exactly like `collect` does.
import Anthropic from "@anthropic-ai/sdk";
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import type { SourceItem } from "../src/content/schema";
import { LEVELS, type Level } from "../src/learning/types";
import type { WordlistRow } from "./import-wordlists";
import {
  buildGrammar,
  buildWord,
  buildWriting,
  checkSentenceDraft,
  checkWordDraft,
  grammarOutputSchema,
  mergeDrafts,
  wordsOutputSchema,
  writingOutputSchema,
  type Built,
  type GrammarDraft,
  type GrammarTopicRow,
  type WordDraft,
  type WritingDraft,
} from "./lib/drafting";
import { GRAMMAR_SYSTEM, WORDS_SYSTEM, WRITING_SYSTEM } from "./lib/prompts";

const MODEL = "claude-opus-5-5";
// Batch prices for Claude Opus 5.5 in USD per million tokens (half the standard
// $4 input / $20 output; cache writes 1.25x input, cache reads $0.20 halved).
// Used only for the cost report, which is an estimate.
const PRICE = { input: 2, output: 10, cacheWrite: 2.5, cacheRead: 0.1 };

type Kind = "words" | "grammar" | "writing";

interface BatchRecord {
  id: string;
  kind: Kind;
  level: Level;
  createdAt: string;
  /** custom_id → the content ids it covers (word ids, grammar slug, or level). */
  requests: Record<string, string[]>;
  collectedAt?: string;
}

const root = process.cwd();
const contentDir = path.join(root, "content");
const stateFile = path.join(contentDir, ".drafts/batches.json");

async function readJson<T>(file: string, fallback: T): Promise<T> {
  return existsSync(file) ? (JSON.parse(await readFile(file, "utf8")) as T) : fallback;
}

async function writeJson(file: string, value: unknown) {
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(value, null, 2) + "\n");
}

const sourceFile = (kind: SourceItem["kind"], level: Level) => path.join(contentDir, kind, `${level}.json`);

async function loadWordlist(): Promise<WordlistRow[]> {
  const rows = await Promise.all(LEVELS.map((level) => readJson<WordlistRow[]>(path.join(contentDir, "wordlist", `${level}.json`), [])));
  return rows.flat();
}

function wordIndexOf(rows: WordlistRow[]): Map<string, string> {
  const index = new Map<string, string>();
  for (const row of rows) index.set(`${row.headword.toLowerCase()}|${row.pos}`, row.id);
  return index;
}

const system = (text: string) => [{ type: "text" as const, text, cache_control: { type: "ephemeral" as const } }];

function params(systemText: string, schema: Record<string, unknown>, user: string) {
  return {
    model: MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" as const, format: { type: "json_schema" as const, schema } },
    system: system(systemText),
    messages: [{ role: "user" as const, content: user }],
  };
}

async function submit(kind: Kind, level: Level, limit: number | undefined, groupSize: number) {
  const client = new Anthropic();
  const requests: { custom_id: string; params: ReturnType<typeof params> }[] = [];
  const covered: Record<string, string[]> = {};

  if (kind === "words") {
    const topics = await readJson<{ slug: string }[]>(path.join(contentDir, "topics.json"), []);
    const ipa = await readJson<Record<string, string>>(path.join(contentDir, "wordlist/ipa.json"), {});
    const existing = await readJson<SourceItem[]>(sourceFile("word", level), []);
    const done = new Set(existing.map((item) => item.id));
    const pending = (await loadWordlist()).filter((row) => row.level === level && !done.has(row.id));
    const rows = limit ? pending.slice(0, limit) : pending;
    const schema = wordsOutputSchema(topics.map((topic) => topic.slug));
    for (let i = 0; i < rows.length; i += groupSize) {
      const group = rows.slice(i, i + groupSize);
      const customId = `words-${level}-${String(i / groupSize).padStart(4, "0")}`;
      const lines = group.map((row) =>
        JSON.stringify({ id: row.id, word: row.headword, pos: row.pos, level: row.level, ipa: ipa[row.id] ?? "", topicHints: row.topicHints }),
      );
      requests.push({ custom_id: customId, params: params(WORDS_SYSTEM, schema, `CEFR level ${level}. Words (one JSON object per line):\n${lines.join("\n")}`) });
      covered[customId] = group.map((row) => row.id);
    }
  } else if (kind === "grammar") {
    const existing = await readJson<SourceItem[]>(sourceFile("grammar", level), []);
    const done = new Set(existing.map((item) => item.id));
    const topics = (await readJson<GrammarTopicRow[]>(path.join(contentDir, "grammar-topics.json"), [])).filter(
      (topic) => topic.level === level && !done.has(`grammar:${topic.slug}`),
    );
    for (const topic of limit ? topics.slice(0, limit) : topics) {
      const customId = `grammar-${topic.slug}`.slice(0, 64);
      const user = `Grammar point: ${topic.titleEn} (Vietnamese title: ${topic.titleVi}). CEFR level ${topic.level}.`;
      requests.push({ custom_id: customId, params: params(GRAMMAR_SYSTEM, grammarOutputSchema, user) });
      covered[customId] = [topic.slug];
    }
  } else {
    const words = (await loadWordlist()).filter((row) => row.level === level).map((row) => row.headword);
    const customId = `writing-${level}`;
    const user = `CEFR level ${level}. Word list for this level (use some of these in useWords):\n${words.join(", ")}`;
    requests.push({ custom_id: customId, params: params(WRITING_SYSTEM, writingOutputSchema, user) });
    covered[customId] = [level];
  }

  if (requests.length === 0) {
    console.log("Nothing to draft: everything at this level already has a draft or approval.");
    return;
  }
  const batch = await client.messages.batches.create({ requests });
  const state = await readJson<BatchRecord[]>(stateFile, []);
  state.push({ id: batch.id, kind, level, createdAt: new Date().toISOString(), requests: covered });
  await writeJson(stateFile, state);
  console.log(`Submitted batch ${batch.id}: ${requests.length} requests (${kind}, ${level}). Run "pnpm content:draft status".`);
}

async function status() {
  const client = new Anthropic();
  for (const record of await readJson<BatchRecord[]>(stateFile, [])) {
    if (record.collectedAt) continue;
    const batch = await client.messages.batches.retrieve(record.id);
    console.log(`${record.id} ${record.kind} ${record.level}: ${batch.processing_status}`, batch.request_counts);
  }
}

interface Usage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}

const costOf = (u: Usage) =>
  (u.input_tokens * PRICE.input +
    u.output_tokens * PRICE.output +
    (u.cache_creation_input_tokens ?? 0) * PRICE.cacheWrite +
    (u.cache_read_input_tokens ?? 0) * PRICE.cacheRead) /
  1_000_000;

/** Merges drafted items into content/{kind}/{level}.json (approved items are kept). */
async function writeDrafted(level: Level, drafted: SourceItem[]) {
  for (const kind of ["word", "sentence", "grammar", "writing"] as const) {
    const items = drafted.filter((item) => item.kind === kind);
    if (items.length === 0) continue;
    const file = sourceFile(kind, level);
    await writeJson(file, mergeDrafts(await readJson<SourceItem[]>(file, []), items));
  }
}

type ManualDraft =
  | { kind: "words"; level: Level; words: WordDraft[] }
  | { kind: "grammar"; slug: string; draft: GrammarDraft }
  | { kind: "writing"; level: Level; tasks: WritingDraft["tasks"] };

/** Builds hand-written draft files; with `check` only reports problems. */
async function importDrafts(files: string[], check: boolean) {
  const wordlist = await loadWordlist();
  const rowsById = new Map(wordlist.map((row) => [row.id, row]));
  const wordIndex = wordIndexOf(wordlist);
  const ipa = await readJson<Record<string, string>>(path.join(contentDir, "wordlist/ipa.json"), {});
  const grammarTopics = await readJson<GrammarTopicRow[]>(path.join(contentDir, "grammar-topics.json"), []);
  const topicSlugs = new Set((await readJson<{ slug: string }[]>(path.join(contentDir, "topics.json"), [])).map((topic) => topic.slug));
  let failed = false;

  for (const file of files) {
    const input = JSON.parse(await readFile(file, "utf8")) as ManualDraft;
    const built: Built = { items: [], problems: [] };
    let level: Level;
    if (input.kind === "words") {
      level = input.level;
      const seen = new Set<string>();
      for (const draft of input.words) {
        const row = rowsById.get(draft.id);
        if (!row || row.level !== level) {
          built.problems.push(`${draft.id}: not a ${level} word in the word list`);
          continue;
        }
        if (seen.has(draft.id)) built.problems.push(`${draft.id}: drafted twice`);
        seen.add(draft.id);
        built.problems.push(...checkWordDraft(level, draft, topicSlugs));
        const one = buildWord(row, draft, ipa[row.id], wordIndex);
        built.items.push(...one.items);
        built.problems.push(...one.problems);
      }
    } else if (input.kind === "grammar") {
      const topic = grammarTopics.find((row) => row.slug === input.slug);
      if (!topic) throw new Error(`${file}: unknown grammar topic ${input.slug}`);
      level = topic.level;
      input.draft.examples.forEach((example, i) => built.problems.push(...checkSentenceDraft(`${input.slug} example ${i + 1}`, level, example)));
      const one = buildGrammar(topic, input.draft);
      built.items.push(...one.items);
      built.problems.push(...one.problems);
    } else {
      level = input.level;
      const one = buildWriting(level, { tasks: input.tasks }, wordIndex);
      built.items.push(...one.items);
      built.problems.push(...one.problems);
    }
    const label = path.relative(root, file);
    console.log(`${label}: ${built.items.length} items, ${built.problems.length} problems`);
    for (const problem of built.problems) console.log(`  - ${problem}`);
    if (built.problems.length) failed = true;
    else if (!check) await writeDrafted(level, built.items);
  }
  if (failed) {
    console.log(check ? "Fix the problems above." : "Files with problems were not imported; fix them and run import again.");
    process.exitCode = 1;
  }
}

async function collect(onlyId?: string) {
  const client = new Anthropic();
  const state = await readJson<BatchRecord[]>(stateFile, []);
  const wordlist = await loadWordlist();
  const rowsById = new Map(wordlist.map((row) => [row.id, row]));
  const wordIndex = wordIndexOf(wordlist);
  const ipa = await readJson<Record<string, string>>(path.join(contentDir, "wordlist/ipa.json"), {});
  const grammarTopics = await readJson<GrammarTopicRow[]>(path.join(contentDir, "grammar-topics.json"), []);

  for (const record of state) {
    if (record.collectedAt || (onlyId && record.id !== onlyId)) continue;
    const batch = await client.messages.batches.retrieve(record.id);
    if (batch.processing_status !== "ended") {
      console.log(`${record.id}: still ${batch.processing_status}, skipping`);
      continue;
    }
    const drafted: SourceItem[] = [];
    const problems: string[] = [];
    let cost = 0;
    let unitsDone = 0;
    for await (const result of await client.messages.batches.results(record.id)) {
      if (result.result.type !== "succeeded") {
        problems.push(`${result.custom_id}: ${result.result.type} (resubmit later)`);
        continue;
      }
      const message = result.result.message;
      cost += costOf(message.usage);
      if (message.stop_reason !== "end_turn") {
        problems.push(`${result.custom_id}: stopped with ${message.stop_reason}`);
        continue;
      }
      const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
      let built: Built;
      try {
        if (record.kind === "words") {
          const { words } = JSON.parse(text) as { words: WordDraft[] };
          built = { items: [], problems: [] };
          for (const draft of words) {
            const row = rowsById.get(draft.id);
            if (!row || !record.requests[result.custom_id]?.includes(draft.id)) {
              built.problems.push(`${result.custom_id}: unexpected id ${draft.id}`);
              continue;
            }
            const one = buildWord(row, draft, ipa[row.id], wordIndex);
            built.items.push(...one.items);
            built.problems.push(...one.problems);
            unitsDone++;
          }
        } else if (record.kind === "grammar") {
          const slug = record.requests[result.custom_id][0];
          const topic = grammarTopics.find((row) => row.slug === slug)!;
          built = buildGrammar(topic, JSON.parse(text) as GrammarDraft);
          unitsDone++;
        } else {
          built = buildWriting(record.level, JSON.parse(text) as WritingDraft, wordIndex);
          unitsDone++;
        }
      } catch (error) {
        problems.push(`${result.custom_id}: unreadable output (${String(error)})`);
        continue;
      }
      drafted.push(...built.items);
      problems.push(...built.problems);
    }

    await writeDrafted(record.level, drafted);
    record.collectedAt = new Date().toISOString();
    await writeJson(stateFile, state);

    console.log(`\n${record.id} (${record.kind} ${record.level}): ${drafted.length} items drafted, ${problems.length} problems`);
    for (const problem of problems.slice(0, 30)) console.log(`  - ${problem}`);
    if (problems.length > 30) console.log(`  … and ${problems.length - 30} more`);
    console.log(`  Estimated cost: $${cost.toFixed(4)}`);
    if (record.kind === "words" && unitsDone > 0) {
      const drafted = new Set(
        (await Promise.all(LEVELS.map((level) => readJson<SourceItem[]>(sourceFile("word", level), [])))).flat().map((item) => item.id),
      );
      const remaining = wordlist.filter((row) => !drafted.has(row.id)).length;
      console.log(`  Per word: $${(cost / unitsDone).toFixed(5)}; projected for the ${remaining} words left: $${((cost / unitsDone) * remaining).toFixed(2)}`);
    }
  }
}

async function main() {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      level: { type: "string" },
      limit: { type: "string" },
      group: { type: "string", default: "10" },
      check: { type: "boolean", default: false },
    },
  });
  const [command, kind] = positionals;
  if (command === "import") return importDrafts(positionals.slice(1), values.check);
  if (command === "status") return status();
  if (command === "collect") return collect(kind);
  if (command === "submit" && (kind === "words" || kind === "grammar" || kind === "writing")) {
    const level = values.level as Level;
    if (!LEVELS.includes(level)) throw new Error(`--level must be one of ${LEVELS.join(", ")}`);
    return submit(kind, level, values.limit ? Number(values.limit) : undefined, Number(values.group));
  }
  console.log("Usage: content:draft submit <words|grammar|writing> --level <A1..C1> [--limit N] [--group N] | status | collect [batchId] | import <file…> [--check]");
}

if (process.argv[1]?.endsWith("draft-content.ts")) void main();
