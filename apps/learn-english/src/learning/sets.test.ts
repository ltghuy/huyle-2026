import { describe, expect, it } from "vitest";
import { vocabSet, word } from "./exercises/fixtures";
import { isSetFinished, nextSetWords, setLabel, setProgress } from "./sets";

const deploy = word("deploy", { source: "specialized" }, "A2");
const meeting = word("meeting", {}, "A1");
const invoice = word("invoice", { source: "specialized" }, "A2");
const itSet = vocabSet("it", [deploy, meeting]);
const office = vocabSet("office", [meeting, invoice]);

describe("setLabel", () => {
  it("shows the level of a course word", () => {
    expect(setLabel(meeting, [itSet, office])).toBe("A1");
  });

  it("shows the first set's name for a specialized word", () => {
    expect(setLabel(deploy, [itSet])).toBe("Bộ it");
  });

  it("falls back to the level when the set is gone", () => {
    expect(setLabel(deploy, [])).toBe("A2");
  });
});

describe("setProgress", () => {
  it("counts a shared word as learned in each set", () => {
    const carded = new Set([meeting.id]);
    expect(setProgress(itSet.body.words, carded)).toEqual({ learned: 1, total: 2 });
    expect(setProgress(office.body.words, carded)).toEqual({ learned: 1, total: 2 });
  });
});

describe("nextSetWords", () => {
  it("takes uncarded, unremoved words in the set's order", () => {
    const words = [deploy, meeting, invoice];
    expect(nextSetWords(words, new Set([deploy.id]), new Set(), 5)).toEqual([meeting, invoice]);
    expect(nextSetWords(words, new Set(), new Set([meeting.id]), 1)).toEqual([deploy]);
  });
});

describe("isSetFinished", () => {
  it("is true only when every word has a card", () => {
    expect(isSetFinished(itSet.body.words, new Set([deploy.id]))).toBe(false);
    expect(isSetFinished(itSet.body.words, new Set([deploy.id, meeting.id]))).toBe(true);
  });

  it("is false for a missing or empty set", () => {
    expect(isSetFinished([], new Set())).toBe(false);
  });
});
