import { describe, expect, it } from "vitest";
import { sentence, word } from "../exercises/fixtures";
import { POOL } from "./fixtures";
import { buildDeck, hintMask, type ArenaPool, type ServerQuestion } from "./questions";
import { MAX_FRAME_BYTES } from "./protocol";
import { parseTeamFrame, roundMs, teamSettingsSchema } from "./team-protocol";

const SETTINGS = { mode: "mixed", level: "A2", rounds: 1, seconds: 15, size: 6, minutes: 10 };

describe("team settings (AC-002)", () => {
  it("takes 2 to 10 players and 5, 10 or 15 minutes", () => {
    expect(teamSettingsSchema.safeParse(SETTINGS).success).toBe(true);
    for (const size of [2, 10]) expect(teamSettingsSchema.safeParse({ ...SETTINGS, size }).success).toBe(true);
    for (const size of [1, 11, 4.5]) expect(teamSettingsSchema.safeParse({ ...SETTINGS, size }).success).toBe(false);
    for (const minutes of [5, 15]) expect(teamSettingsSchema.safeParse({ ...SETTINGS, minutes }).success).toBe(true);
    expect(teamSettingsSchema.safeParse({ ...SETTINGS, minutes: 7 }).success).toBe(false);
  });

  it("defaults the question time to 15 seconds", () => {
    expect(teamSettingsSchema.parse({ ...SETTINGS, seconds: undefined }).seconds).toBe(15);
  });

  it("gives a round its minutes in ms", () => {
    expect(roundMs({ minutes: 5 })).toBe(300_000);
  });
});

describe("parseTeamFrame", () => {
  it("reads host and player frames", () => {
    expect(parseTeamFrame(JSON.stringify({ type: "assign", userId: "lan", team: "B" }))).toEqual({ type: "assign", userId: "lan", team: "B" });
    expect(parseTeamFrame(JSON.stringify({ type: "assign", userId: "lan", team: null }))).toEqual({ type: "assign", userId: "lan", team: null });
    expect(parseTeamFrame(JSON.stringify({ type: "order", team: "A", ids: ["minh", "lan"] }))).toMatchObject({ type: "order" });
    expect(parseTeamFrame(JSON.stringify({ type: "hint", q: 4 }))).toEqual({ type: "hint", q: 4 });
    expect(parseTeamFrame(JSON.stringify({ type: "answer", q: 4, text: "  happy " }))).toEqual({ type: "answer", q: 4, text: "happy" });
  });

  it("refuses unknown, malformed and oversized frames", () => {
    expect(parseTeamFrame("not json")).toBeNull();
    expect(parseTeamFrame(JSON.stringify({ type: "assign", userId: "lan", team: "C" }))).toBeNull();
    expect(parseTeamFrame(JSON.stringify({ type: "rematch" }))).toBeNull();
    expect(parseTeamFrame(JSON.stringify({ type: "answer", q: 1, text: "x".repeat(MAX_FRAME_BYTES) }))).toBeNull();
  });
});

function recall(headword: string): ServerQuestion {
  const target = word(headword, { meaningsVi: ["vui"] });
  return { type: "recall", itemId: target.id, ipa: "", instance: { kind: "recall", targetId: target.id, headword, variants: [], meaningsVi: ["vui"], pos: "adj", audio: "" } };
}

function write(en: string): ServerQuestion {
  return { type: "write", itemId: "s", instance: { en } } as unknown as ServerQuestion;
}

describe("hintMask (AC-033, AC-034)", () => {
  it("shows a word's first letter only", () => {
    expect(hintMask(recall("happy"))).toBe("h****");
    expect(hintMask(recall("ice cream"))).toBe("i** *****");
    expect(hintMask(recall("well-known"))).toBe("w***-*****");
  });

  it("shows every word's first letter in a sentence, keeping punctuation", () => {
    expect(hintMask(write("I am happy"))).toBe("I a* h****");
    expect(hintMask(write("Don't stop, Lan!"))).toBe("D**'* s***, L**!");
  });

  it("has no hint for listening", () => {
    const listen = { type: "listen" } as unknown as ServerQuestion;
    expect(hintMask(listen)).toBeNull();
  });
});

describe("buildDeck", () => {
  it("fills the asked size, the same for the same seed", () => {
    const deck = buildDeck(POOL, "mixed", 9, 83);
    expect(deck).toHaveLength(83);
    expect(buildDeck(POOL, "mixed", 9, 83).map((q) => q.itemId)).toEqual(deck.map((q) => q.itemId));
  });

  it("repeats items on a short level instead of running out", () => {
    const words = ["apple", "angle", "ankle", "amber", "baker"].map((headword) => word(headword, { meaningsVi: ["x"] }));
    const pool: ArenaPool = { words, sentences: [sentence("s0", { tokens: ["We", "go"] })], wordings: new Map() };
    const deck = buildDeck(pool, "recall", 3, 12);
    expect(deck).toHaveLength(12);
    expect(new Set(deck.slice(0, 5).map((q) => q.itemId)).size).toBe(5);
  });

  it("is empty when the mode has nothing to ask", () => {
    expect(buildDeck({ words: [], sentences: [], wordings: new Map() }, "listen", 1, 10)).toEqual([]);
  });
});
