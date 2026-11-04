// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { sentence, word } from "@/learning/exercises/fixtures";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { loadArenaPool } from "./content";

let db: ReturnType<typeof sqliteDb>["db"];
let sqlite: ReturnType<typeof sqliteDb>["sqlite"];

function insert(item: { id: string; kind: string; level: string; body: unknown }, deleted = false) {
  sqlite
    .prepare("INSERT INTO content_items (id, kind, level, topic, sort, body, deleted, updated_version) VALUES (?, ?, ?, NULL, 0, ?, ?, 1)")
    .run(item.id, item.kind, item.level, JSON.stringify(item.body), deleted ? 1 : 0);
}

beforeEach(() => {
  ({ db, sqlite } = sqliteDb());
  insert(word("apple", { audio: "a".repeat(64) }));
  insert(word("banana"));
  insert(word("cherry"), true);
  insert(word("dragon", {}, "B1"));
  insert(sentence("i-like-apples", { tokens: ["I", "like", "apples."] }));
  insert({ id: "wording:i-like-apples", kind: "wording", level: "A1", body: { sentenceId: "sentence:i-like-apples", accepted: ["I love apples."] } });
  insert({ id: "grammar:to-be", kind: "grammar", level: "A1", body: { title: "to be" } });
  insert({ id: "word:broken", kind: "word", level: "A1", body: { headword: "" } });
});

describe("loadArenaPool", () => {
  it("returns the level's live words, sentences and approved wordings", async () => {
    const pool = await loadArenaPool(db, "A1");
    expect(pool.words.map((w) => w.id).sort()).toEqual(["word:apple", "word:banana"]);
    expect(pool.words.find((w) => w.id === "word:apple")?.body.audio).toBe("a".repeat(64));
    expect(pool.sentences.map((s) => s.id)).toEqual(["sentence:i-like-apples"]);
    expect(pool.wordings.get("sentence:i-like-apples")).toEqual(["I love apples."]);
  });

  it("leaves out other levels, deleted items, other kinds and rows that don't parse", async () => {
    const pool = await loadArenaPool(db, "A1");
    const ids = [...pool.words, ...pool.sentences].map((item) => item.id);
    expect(ids).not.toContain("word:dragon");
    expect(ids).not.toContain("word:cherry");
    expect(ids).not.toContain("word:broken");
    expect(ids.some((id) => id.startsWith("grammar:"))).toBe(false);
  });

  it("returns an empty pool for a level with no content", async () => {
    expect(await loadArenaPool(db, "C1")).toEqual({ words: [], sentences: [], wordings: new Map() });
  });
});
