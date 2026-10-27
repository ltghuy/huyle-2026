import { describe, expect, it } from "vitest";
import { word } from "@/learning/exercises/fixtures";
import { searchWords } from "./word-search";

const words = [
  word("react", {}, "B1"),
  word("activity", {}, "A2"),
  word("act", {}, "B1"),
  word("action", {}, "A1"),
  word("fact", {}, "A2"),
  word("colour", { variants: ["color"] }),
  word("mother"),
];

const headwords = (query: string, limit?: number) => searchWords(words, query, limit).map((item) => item.body.headword);

describe("searchWords", () => {
  it("matches every level, prefixes first, then easier levels and shorter words (AC-001, AC-002)", () => {
    expect(headwords("ac")).toEqual(["action", "activity", "act", "fact", "react"]);
  });

  it("ignores case and surrounding spaces, and matches spelling variants", () => {
    expect(headwords("  AC ")).toEqual(headwords("ac"));
    expect(headwords("color")).toEqual(["colour"]);
  });

  it("returns nothing for an empty query and caps the list", () => {
    expect(headwords("   ")).toEqual([]);
    expect(headwords("a", 2)).toEqual(["action", "activity"]);
  });
});
