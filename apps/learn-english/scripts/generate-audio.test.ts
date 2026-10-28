import { describe, expect, it } from "vitest";
import type { SourceItem } from "../src/content/schema";
import { applyKeys, audioKey, collectJobs, encodeMp3, referencedKeys } from "./generate-audio";

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

describe("verb forms clips (feature 008)", () => {
  const forms = (audio = "") =>
    ({
      id: "forms:go-v",
      kind: "forms",
      level: "A1",
      sort: 0,
      status: "approved",
      body: { wordId: "word:go-v", past: [{ text: "went", ipa: "" }], participle: [{ text: "gone", ipa: "" }], audio, practice: [] },
    }) as unknown as SourceItem;

  it("says the three forms, with the verb's headword", () => {
    const [job] = collectJobs([forms()], "v", new Map([["word:go-v", "go"]]));
    expect(job).toEqual({ itemId: "forms:go-v", text: "go, went, gone", key: audioKey("v", "go, went, gone") });
  });

  it("skips forms whose verb isn't known, and serves forms clips from the words host", () => {
    expect(collectJobs([forms()], "v")).toEqual([]);
    const [withKey] = applyKeys([forms()], new Map([["forms:go-v", "d".repeat(64)]]));
    expect(withKey).toMatchObject({ body: { audio: "d".repeat(64) } });
    expect([...referencedKeys([withKey]).words]).toEqual(["d".repeat(64)]);
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

describe("referencedKeys", () => {
  it("splits approved clips by host and skips drafts and empty keys", () => {
    const sentence = { ...word("s", "approved", "b".repeat(64)), id: "sentence:s", kind: "sentence", body: { en: "Hi.", vi: "Chào.", audio: "b".repeat(64), tokens: ["Hi", "x"], acceptedOrders: [[0, 1]], wrongVariants: [], gapCandidates: [], wordIds: [] } } as SourceItem;
    const { words, sentences } = referencedKeys([word("cat", "approved", "a".repeat(64)), word("dog", "draft", "c".repeat(64)), word("fox", "approved"), sentence]);
    expect([...words]).toEqual(["a".repeat(64)]);
    expect([...sentences]).toEqual(["b".repeat(64)]);
  });
});

describe("encodeMp3", () => {
  it("encodes a short tone as MPEG audio frames", async () => {
    const samples = Float32Array.from({ length: 24_000 }, (_, i) => 0.5 * Math.sin((2 * Math.PI * 440 * i) / 24_000));
    const mp3 = await encodeMp3(samples, 24_000);
    expect(mp3.length).toBeGreaterThan(1000);
    // Frame sync: 11 set bits at the start of the first frame.
    expect(mp3[0]).toBe(0xff);
    expect(mp3[1] & 0xe0).toBe(0xe0);
  });
});
