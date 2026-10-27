import { describe, expect, it } from "vitest";
import { parseCsv } from "./lib/csv";
import { buildWordlist, splitHeadword, wordId } from "./import-wordlists";

describe("parseCsv", () => {
  it("handles quoted fields with commas and doubled quotes", () => {
    expect(parseCsv('a,"b, c","say ""hi"""\r\nd,,\n')).toEqual([
      ["a", "b, c", 'say "hi"'],
      ["d", "", ""],
    ]);
  });
});

describe("splitHeadword", () => {
  it("keeps the first spelling as the headword", () => {
    expect(splitHeadword("analyze/analyse")).toEqual({ headword: "analyze", variants: ["analyse"] });
    expect(splitHeadword("homework")).toEqual({ headword: "homework", variants: [] });
  });
});

describe("wordId", () => {
  it("slugifies the headword and shortens the part of speech", () => {
    expect(wordId("homework", "noun")).toBe("word:homework-n");
    expect(wordId("a.m.", "adverb")).toBe("word:a-m-adv");
    expect(wordId("be", "be-verb")).toBe("word:be-be-verb");
  });
});

describe("buildWordlist", () => {
  const cefrj = [
    "headword,pos,CEFR,CoreInventory 1,CoreInventory 2,Threshold",
    'accident,noun,A2,"News, lifestyles and current affairs",,Health and body care',
    "airplane/aeroplane,noun,A1,Ways of travelling,,Travel",
    "light,noun,A1,,,",
    "light,adjective,A2,,,",
    "light,noun,B1,,,",
  ].join("\n");
  const octanove = ["headword,pos,CEFR,notes", "timid,adjective,C1,", "seedy,adjective,C2,", "accident,noun,C1,"].join("\n");
  const rows = buildWordlist(cefrj, octanove);

  it("keeps one row per headword + part of speech, first level wins", () => {
    expect(rows.map((row) => `${row.id}@${row.level}`)).toEqual([
      "word:accident-n@A2",
      "word:airplane-n@A1",
      "word:light-n@A1",
      "word:light-adj@A2",
      "word:timid-adj@C1",
    ]);
  });

  it("records the source, variants and topic hints", () => {
    const airplane = rows.find((row) => row.id === "word:airplane-n");
    expect(airplane).toMatchObject({ variants: ["aeroplane"], source: "cefrj-1.5", topicHints: ["Ways of travelling", "Travel"] });
    expect(rows.find((row) => row.id === "word:timid-adj")?.source).toBe("octanove-1.0");
  });

  it("drops C2 rows", () => {
    expect(rows.some((row) => row.headword === "seedy")).toBe(false);
  });
});

describe("buildWordlist exclusions", () => {
  it("leaves out excluded ids", () => {
    const cefrj = ["headword,pos,CEFR,CoreInventory 1,CoreInventory 2,Threshold", "light,noun,A1,,,", "light,adjective,A2,,,"].join("\n");
    const rows = buildWordlist(cefrj, "headword,pos,CEFR,notes", new Set(["word:light-n"]));
    expect(rows.map((row) => row.id)).toEqual(["word:light-adj"]);
  });
});
