import { describe, expect, it } from "vitest";
import { MAX_ANSWER_LENGTH, MAX_FRAME_BYTES, parseClientFrame, publicQuestionSchema, settingsSchema } from "./protocol";

describe("parseClientFrame", () => {
  it("accepts every frame a player can send", () => {
    expect(parseClientFrame('{"type":"ready"}')).toEqual({ type: "ready" });
    expect(parseClientFrame('{"type":"start"}')).toEqual({ type: "start" });
    expect(parseClientFrame('{"type":"typing","q":3}')).toEqual({ type: "typing", q: 3 });
    expect(parseClientFrame('{"type":"answer","q":0,"text":"  I like apples. "}')).toEqual({ type: "answer", q: 0, text: "I like apples." });
    expect(parseClientFrame('{"type":"choose","q":11,"choice":3}')).toEqual({ type: "choose", q: 11, choice: 3 });
    expect(parseClientFrame('{"type":"rematch"}')).toEqual({ type: "rematch" });
    expect(parseClientFrame('{"type":"settings","settings":{"mode":"write","level":"B1","rounds":1}}')).toEqual({
      type: "settings",
      settings: { mode: "write", level: "B1", rounds: 1 },
    });
    expect(parseClientFrame('{"type":"settings","settings":{"mode":"write","level":"B1","rounds":2}}')).toBeNull();
    expect(parseClientFrame('{"type":"leave"}')).toEqual({ type: "leave" });
  });

  it("rejects text that isn't JSON, unknown frames and bad fields", () => {
    expect(parseClientFrame("ready")).toBeNull();
    expect(parseClientFrame('{"type":"score"}')).toBeNull();
    expect(parseClientFrame('{"type":"choose","q":0,"choice":4}')).toBeNull();
    expect(parseClientFrame('{"type":"answer","q":-1,"text":"a"}')).toBeNull();
    expect(parseClientFrame('{"type":"answer","q":0,"text":"   "}')).toBeNull();
  });

  it("rejects answers over the length cap and frames over the byte cap", () => {
    expect(parseClientFrame(JSON.stringify({ type: "answer", q: 0, text: "a".repeat(MAX_ANSWER_LENGTH + 1) }))).toBeNull();
    // Vietnamese letters take more than one byte: the byte cap counts bytes, not characters.
    const wide = "ệ".repeat(Math.ceil(MAX_FRAME_BYTES / 3) + 1);
    expect(parseClientFrame(JSON.stringify({ type: "leave", pad: wide }))).toBeNull();
  });

  it("ignores an identity a player tries to send", () => {
    expect(parseClientFrame('{"type":"ready","userId":"someone-else"}')).toEqual({ type: "ready" });
  });
});

describe("settingsSchema", () => {
  it("allows the four modes, the five levels and 1 or 3 rounds (AC-002)", () => {
    expect(settingsSchema.safeParse({ mode: "mixed", level: "B1", rounds: 3 }).success).toBe(true);
    expect(settingsSchema.safeParse({ mode: "write", level: "C1", rounds: 1 }).success).toBe(true);
  });

  it("refuses two rounds, unknown modes and levels", () => {
    expect(settingsSchema.safeParse({ mode: "mixed", level: "B1", rounds: 2 }).success).toBe(false);
    expect(settingsSchema.safeParse({ mode: "speed", level: "B1", rounds: 1 }).success).toBe(false);
    expect(settingsSchema.safeParse({ mode: "listen", level: "C2", rounds: 1 }).success).toBe(false);
  });
});

describe("publicQuestionSchema", () => {
  it("has no place for an answer in any question type (AC-019)", () => {
    const listen = publicQuestionSchema.parse({ type: "listen", audio: "k", options: ["a", "b", "c", "d"], answerIndex: 2 });
    expect(listen).not.toHaveProperty("answerIndex");
    const recall = publicQuestionSchema.parse({ type: "recall", meaningsVi: ["quả táo"], pos: "n", mask: "_____", headword: "apple", audio: "k" });
    expect(recall).not.toHaveProperty("headword");
    expect(recall).not.toHaveProperty("audio");
    const write = publicQuestionSchema.parse({ type: "write", vi: "Tôi thích táo.", en: "I like apples." });
    expect(write).not.toHaveProperty("en");
  });
});
