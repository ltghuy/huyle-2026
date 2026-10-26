import { describe, expect, it } from "vitest";
import { lookupIpa, parseCmudict } from "./build-ipa";

const dict = parseCmudict(
  [
    "homework HH OW1 M W ER2 K",
    "record R EH1 K ER0 D",
    "record(2) R IH0 K AO1 R D",
    "ice AY1 S",
    "cream K R IY1 M",
    "colour K AH1 L ER0",
    "a.m. EY2 EH1 M # comment",
  ].join("\n"),
);

describe("parseCmudict", () => {
  it("keeps every pronunciation in order and drops comments", () => {
    expect(dict.get("record")).toEqual(["R EH1 K ER0 D", "R IH0 K AO1 R D"]);
    expect(dict.get("a.m.")).toEqual(["EY2 EH1 M"]);
  });
});

describe("lookupIpa", () => {
  it("finds a headword case-insensitively", () => {
    expect(lookupIpa(dict, "Homework")).toBe("/ˈhoʊmˌwɝk/");
  });

  it("builds multi-word entries word by word", () => {
    expect(lookupIpa(dict, "ice cream")).toBe("/aɪs krim/");
    expect(lookupIpa(dict, "ice-cream")).toBe("/aɪs krim/");
  });

  it("falls back to a listed variant", () => {
    expect(lookupIpa(dict, "color", ["colour"])).toBe("/ˈkʌlɚ/");
  });

  it("picks the stress pattern that fits the part of speech", () => {
    expect(lookupIpa(dict, "record", [], "noun")).toBe("/ˈrɛkɚd/");
    expect(lookupIpa(dict, "record", [], "verb")).toBe("/rɪˈkɔrd/");
  });

  it("returns undefined when nothing matches", () => {
    expect(lookupIpa(dict, "zzz")).toBeUndefined();
  });
});
