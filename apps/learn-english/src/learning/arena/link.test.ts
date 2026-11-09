import { describe, expect, it } from "vitest";
import { LINK_CODE, parseLinkClientFrame, parseLinkFrame } from "./link";
import { CODE_PATTERN } from "./protocol";

const SETTINGS = { mode: "mixed", level: "B1", rounds: 1, seconds: 15 } as const;

describe("link protocol", () => {
  it("never accepts the link code as a room code", () => {
    expect(CODE_PATTERN.test(LINK_CODE)).toBe(false);
  });

  it("parses room reports and answers", () => {
    expect(parseLinkClientFrame(JSON.stringify({ type: "room", code: "R2KS89" }))).toEqual({ type: "room", code: "R2KS89" });
    expect(parseLinkClientFrame(JSON.stringify({ type: "room", code: null }))).toEqual({ type: "room", code: null });
    expect(parseLinkClientFrame(JSON.stringify({ type: "answer", hostId: "u1", code: "R2KS89", accept: true }))).toEqual({
      type: "answer",
      hostId: "u1",
      code: "R2KS89",
      accept: true,
    });
  });

  it("refuses bad frames", () => {
    expect(parseLinkClientFrame("not json")).toBeNull();
    expect(parseLinkClientFrame(JSON.stringify({ type: "room", code: "bad" }))).toBeNull();
    expect(parseLinkClientFrame(JSON.stringify({ type: "answer", hostId: "", code: "R2KS89", accept: true }))).toBeNull();
    expect(parseLinkClientFrame(JSON.stringify({ type: "room", code: null, pad: "x".repeat(2000) }))).toBeNull();
  });

  it("parses the frames a link sends", () => {
    const challenge = { type: "challenge", from: { id: "u1", name: "Evan", image: null }, code: "R2KS89", settings: SETTINGS };
    expect(parseLinkFrame(JSON.stringify(challenge))).toEqual(challenge);
    expect(parseLinkFrame(JSON.stringify({ type: "reply", friendId: "u2", code: "R2KS89", accept: false }))).not.toBeNull();
    expect(parseLinkFrame(JSON.stringify({ type: "challenge-closed", hostId: "u1", code: "R2KS89" }))).not.toBeNull();
    expect(parseLinkFrame(JSON.stringify({ type: "state" }))).toBeNull();
  });
});
