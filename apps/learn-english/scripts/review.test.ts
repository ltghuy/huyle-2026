import { cpSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyStatus,
  entriesOf,
  formatItems,
  planApprove,
  planUnapprove,
  resolveTarget,
  run,
  selectEntries,
  summarize,
  type SourceFile,
} from "./review";

const FIXTURES = path.join(__dirname, "fixtures/content");
type Raw = Record<string, unknown> & { id: string; status: string };

function fixture(kind: "word" | "sentence" | "grammar" | "writing"): Raw[] {
  return JSON.parse(readFileSync(path.join(FIXTURES, kind, "A1.json"), "utf8")) as Raw[];
}

/** The fixture set in memory, with the given ids turned back into drafts. */
function files(drafts: string[] = [], edit: (items: Raw[]) => void = () => {}): SourceFile[] {
  return (["word", "sentence", "grammar", "writing"] as const).map((kind) => {
    const items = fixture(kind).map((item) => (drafts.includes(item.id) ? { ...item, status: "draft" } : item));
    edit(items);
    return { file: `content/${kind}/A1.json`, kind, level: "A1", data: items };
  });
}

const WORDS = new Set(["content/word/A1.json"]);
const ALL_A1 = new Set(["content/word/A1.json", "content/sentence/A1.json", "content/grammar/A1.json", "content/writing/A1.json"]);
const ids = (entries: { id: string }[]) => entries.map((entry) => entry.id).sort();

describe("summarize", () => {
  it("counts drafts, approved and invalid items per kind and level", () => {
    const { entries } = entriesOf(
      files(["word:cat-n"], (items) => {
        if (items[0]?.kind === "word") items.push({ id: "word:bad", kind: "word", level: "A1", status: "draft", body: {} });
      }),
    );
    const word = summarize(entries).find((row) => row.kind === "word");
    expect(word).toEqual({ kind: "word", level: "A1", draft: 2, approved: 3, invalid: 1 });
    expect(summarize(entries).map((row) => row.kind)).toEqual(["word", "grammar", "sentence", "writing"]);
  });
});

describe("selectEntries", () => {
  it("picks ids within the target files and reports unknown ones", () => {
    const { entries } = entriesOf(files());
    const { selected, unknown } = selectEntries(entries, { files: WORDS, ids: ["word:cat-n", "sentence:fx-cat-n", "word:nope"] });
    expect(ids(selected)).toEqual(["word:cat-n"]);
    expect(unknown).toEqual(["sentence:fx-cat-n", "word:nope"]);
  });

  it("requires --ids or --all", () => {
    const { entries } = entriesOf(files());
    expect(() => selectEntries(entries, { files: WORDS })).toThrow(/--ids/);
    expect(selectEntries(entries, { files: WORDS, all: true }).selected).toHaveLength(5);
  });
});

describe("planApprove", () => {
  it("approves only the selected drafts whose references are approved", () => {
    const { entries } = entriesOf(files(["word:cat-n", "word:dog-n"]));
    const { selected } = selectEntries(entries, { files: WORDS, ids: ["word:cat-n"] });
    const plan = planApprove(entries, selected);
    expect(ids(plan.changed)).toEqual(["word:cat-n"]);
    expect(plan.refused).toEqual([]);
  });

  it("refuses items that fail validation", () => {
    const { entries } = entriesOf(
      files(["word:cat-n"], (items) => {
        const cat = items.find((item) => item.id === "word:cat-n");
        if (cat) cat.body = { ...(cat.body as object), meaningsVi: [] };
      }),
    );
    const plan = planApprove(entries, selectEntries(entries, { files: WORDS, ids: ["word:cat-n"] }).selected);
    expect(plan.changed).toEqual([]);
    expect(plan.refused[0]).toMatchObject({ id: "word:cat-n", reason: expect.stringMatching(/^invalid: body.meaningsVi/) });
  });

  it("refuses items that reference drafts unless those are approved together", () => {
    const { entries } = entriesOf(files(["word:cat-n", "sentence:fx-cat-n"]));
    const alone = planApprove(entries, selectEntries(entries, { files: WORDS, ids: ["word:cat-n"] }).selected);
    expect(alone.changed).toEqual([]);
    expect(alone.refused).toEqual([{ id: "word:cat-n", file: "content/word/A1.json", reason: "references sentence:fx-cat-n is still a draft" }]);

    const together = planApprove(entries, selectEntries(entries, { files: ALL_A1, ids: ["word:cat-n", "sentence:fx-cat-n"] }).selected);
    expect(ids(together.changed)).toEqual(["sentence:fx-cat-n", "word:cat-n"]);
    expect(together.refused).toEqual([]);
  });

  it("refuses references to missing items, and whatever depends on a refused item", () => {
    const { entries } = entriesOf(
      files(["word:cat-n", "sentence:fx-cat-n"], (items) => {
        const sentence = items.find((item) => item.id === "sentence:fx-cat-n");
        if (sentence) sentence.body = { ...(sentence.body as object), grammarSlug: "no-such-topic" };
      }),
    );
    const plan = planApprove(entries, selectEntries(entries, { files: ALL_A1, all: true }).selected);
    expect(plan.changed).toEqual([]);
    expect(plan.refused.map((r) => [r.id, r.reason])).toEqual([
      ["sentence:fx-cat-n", "references grammar:no-such-topic doesn't exist"],
      ["word:cat-n", "references sentence:fx-cat-n is still a draft"],
      // The fixture's own draft word uses the same sentence.
      ["word:fish-n", "references sentence:fx-cat-n is still a draft"],
    ]);
  });
});

describe("planUnapprove", () => {
  it("refuses while an approved item still references it", () => {
    const { entries } = entriesOf(files());
    const sentenceOnly = planUnapprove(entries, selectEntries(entries, { files: ALL_A1, ids: ["sentence:fx-cat-n"] }).selected);
    expect(sentenceOnly.changed).toEqual([]);
    expect(sentenceOnly.refused[0].reason).toBe("still referenced by approved word:cat-n");

    const both = planUnapprove(entries, selectEntries(entries, { files: ALL_A1, ids: ["sentence:fx-cat-n", "word:cat-n"] }).selected);
    expect(ids(both.changed)).toEqual(["sentence:fx-cat-n", "word:cat-n"]);
  });
});

describe("applyStatus", () => {
  it("rewrites only the changed files, sorted by id with the drafting layout", () => {
    const source = files(["word:cat-n"]);
    const { entries } = entriesOf(source);
    const plan = planApprove(entries, selectEntries(entries, { files: WORDS, ids: ["word:cat-n"] }).selected);
    const output = applyStatus(source, plan.changed, "approved");
    expect([...output.keys()]).toEqual(["content/word/A1.json"]);
    const written = JSON.parse(output.get("content/word/A1.json")!) as Raw[];
    expect(written.find((item) => item.id === "word:cat-n")?.status).toBe("approved");
    // The fixture's own draft stays a draft.
    expect(written.find((item) => item.id === "word:fish-n")?.status).toBe("draft");
    expect(written.map((item) => item.id)).toEqual([...written.map((item) => item.id)].sort());
    expect(output.get("content/word/A1.json")).toBe(formatItems(written));
    expect(output.get("content/word/A1.json")!.endsWith("]\n")).toBe(true);
  });
});

describe("resolveTarget", () => {
  const source = files();
  it("takes a level, optionally narrowed to one kind", () => {
    expect(resolveTarget("A1", source)).toEqual(ALL_A1);
    expect(resolveTarget("A1", source, "word")).toEqual(WORDS);
  });
  it("takes a file path and rejects anything else", () => {
    expect(resolveTarget("content/word/A1.json", source)).toEqual(WORDS);
    expect(() => resolveTarget("content/word/B1.json", source)).toThrow();
    expect(() => resolveTarget("content/word/A1.json", source, "sentence")).toThrow(/not sentence/);
  });
});

describe("run (temp copy of the fixtures)", () => {
  let dir: string;
  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "review-"));
    cpSync(FIXTURES, dir, { recursive: true });
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "table").mockImplementation(() => {});
  });
  afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  const read = (kind: string) => JSON.parse(readFileSync(path.join(dir, kind, "A1.json"), "utf8")) as Raw[];
  const statusOf = (kind: string, id: string) => read(kind).find((item) => item.id === id)?.status;

  it("unapproves and re-approves a word with its sentence, touching nothing else", async () => {
    const before = readFileSync(path.join(dir, "grammar/A1.json"), "utf8");
    expect(await run(["unapprove", "A1", "--ids", "word:cat-n,sentence:fx-cat-n", "--content-dir", dir])).toBe(0);
    expect(statusOf("word", "word:cat-n")).toBe("draft");
    expect(statusOf("sentence", "sentence:fx-cat-n")).toBe("draft");
    expect(statusOf("word", "word:dog-n")).toBe("approved");

    // Approving the word alone is refused and writes nothing.
    expect(await run(["approve", "A1", "--kind", "word", "--ids", "word:cat-n", "--content-dir", dir])).toBe(1);
    expect(statusOf("word", "word:cat-n")).toBe("draft");

    expect(await run(["approve", "A1", "--all", "--content-dir", dir])).toBe(0);
    expect(statusOf("word", "word:cat-n")).toBe("approved");
    expect(statusOf("sentence", "sentence:fx-cat-n")).toBe("approved");
    expect(readFileSync(path.join(dir, "grammar/A1.json"), "utf8")).toBe(before);
  });

  it("lists without writing", async () => {
    const before = readFileSync(path.join(dir, "word/A1.json"), "utf8");
    expect(await run(["list", "--level", "A1", "--content-dir", dir])).toBe(0);
    expect(readFileSync(path.join(dir, "word/A1.json"), "utf8")).toBe(before);
  });
});
