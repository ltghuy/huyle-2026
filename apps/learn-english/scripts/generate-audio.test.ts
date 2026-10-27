import { describe, expect, it } from "vitest";
import type { SourceItem } from "../src/content/schema";
import { applyKeys, audioKey, collectJobs } from "./generate-audio";

const word = (id: string, status: "draft" | "approved", audio = "") =>
  ({
    id: `word:${id}`,
    kind: "word",
    level: "A1",
    sort: 0,
    status,
    body: { headword: id, variants: [], pos: "noun", ipa: "", meaningsVi: ["x"], examples: ["sentence:s"], synonyms: [], audio, source: "cefrj-1.5" },
  }) as SourceItem;

describe("audioKey", () => {
  it("is a stable sha256 of voice and trimmed text", () => {
    expect(audioKey("v", " cat ")).toBe(audioKey("v", "cat"));
    expect(audioKey("v", "cat")).toMatch(/^[0-9a-f]{64}$/);
    expect(audioKey("v", "cat")).not.toBe(audioKey("w", "cat"));
  });
});

describe("collectJobs", () => {
  it("takes approved items without a clip in this voice", () => {
    const done = word("dog", "approved", audioKey("v", "dog"));
    const jobs = collectJobs([word("cat", "approved"), word("fish", "draft"), done, word("old", "approved", audioKey("other", "old"))], "v");
    expect(jobs.map((job) => job.itemId)).toEqual(["word:cat", "word:old"]);
  });
});

describe("applyKeys", () => {
  it("only changes the audio field of finished items", () => {
    const items = [word("cat", "approved"), word("dog", "approved")];
    const [cat, dog] = applyKeys(items, new Map([["word:cat", "a".repeat(64)]]));
    expect(cat).toMatchObject({ status: "approved", body: { audio: "a".repeat(64), headword: "cat" } });
    expect(dog).toBe(items[1]);
  });
});
