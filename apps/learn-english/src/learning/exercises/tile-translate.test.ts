import { describe, expect, it } from "vitest";
import { sentence } from "./fixtures";
import { buildTileTranslate, gradeTileTranslate } from "./tile-translate";

const s = sentence("park", {
  tokens: ["We", "walk", "in", "the", "park", "on", "Sunday"],
  vi: "Chúng tôi đi dạo trong công viên vào Chủ nhật.",
  acceptedOrders: [
    [0, 1, 2, 3, 4, 5, 6],
    [5, 6, 0, 1, 2, 3, 4],
  ],
});
const distractorPool = ["we", "The", "PARK", "run", "", "at", "garden", "run"];

describe("buildTileTranslate", () => {
  it("adds 2 distractor tiles that never equal a token", () => {
    const tokens = new Set(s.body.tokens.map((t) => t.toLowerCase()));
    for (let seed = 0; seed < 50; seed++) {
      const ex = buildTileTranslate({ sentence: s, distractorPool }, seed)!;
      expect(ex.tiles).toHaveLength(9);
      const extra = ex.tiles.filter((t) => t.id >= s.body.tokens.length);
      expect(extra).toHaveLength(2);
      expect(new Set(extra.map((t) => t.text)).size).toBe(2);
      for (const tile of extra) expect(tokens.has(tile.text.toLowerCase())).toBe(false);
    }
  });

  it("returns null when the pool has fewer than 2 usable words", () => {
    expect(buildTileTranslate({ sentence: s, distractorPool: ["we", "the", "run"] }, 1)).toBeNull();
  });

  it("shows the Vietnamese sentence", () => {
    expect(buildTileTranslate({ sentence: s, distractorPool }, 1)!.vi).toBe(s.body.vi);
  });

  it("is deterministic per seed and varies across seeds", () => {
    const build = (seed: number) => buildTileTranslate({ sentence: s, distractorPool }, seed);
    expect(build(6)).toEqual(build(6));
    expect(new Set(Array.from({ length: 20 }, (_, i) => JSON.stringify(build(i)?.tiles))).size).toBeGreaterThan(1);
  });
});

describe("gradeTileTranslate", () => {
  const ex = buildTileTranslate({ sentence: s, distractorPool }, 3)!;
  const [d1, d2] = ex.tiles.filter((t) => t.id >= s.body.tokens.length).map((t) => t.id);

  it("accepts every accepted order, leaving the distractors unused", () => {
    for (const order of s.body.acceptedOrders) {
      expect(gradeTileTranslate(ex, order)).toEqual({ correct: true, expected: s.body.en });
    }
  });

  it("rejects any answer that uses a distractor tile", () => {
    for (const order of s.body.acceptedOrders) {
      expect(gradeTileTranslate(ex, [...order, d1]).correct).toBe(false);
      expect(gradeTileTranslate(ex, [d2, ...order]).correct).toBe(false);
      expect(gradeTileTranslate(ex, [...order.slice(0, -1), d1]).correct).toBe(false);
    }
  });
});
