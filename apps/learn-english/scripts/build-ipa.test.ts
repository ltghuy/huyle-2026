import { describe, expect, it } from "vitest";
import { fillFormsIpa, lookupFormIpa, lookupIpa, parseCmudict } from "./build-ipa";

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

describe("irregular verb forms (feature 008)", () => {
  // CMUdict's own order: "read" /rɛd/ first.
  const dict = parseCmudict(["read  R EH1 D", "read(2)  R IY1 D", "went  W EH1 N T", "cut  K AH1 T"].join("\n"));

  it("says a form spelled like its base the other way, from the approved base IPA: read /rid/ → /rɛd/", () => {
    expect(lookupFormIpa(dict, "read", "read", "/rid/")).toBe("/rɛd/");
    expect(lookupFormIpa(dict, "cut", "cut")).toBe("/kʌt/");
    // Any other form spelled like its base is said like the approved base.
    const withCost = parseCmudict(["cost  K AA1 S T", "cost(2)  K AO1 S T"].join("\n"));
    expect(lookupFormIpa(withCost, "cost", "cost", "/kɑst/")).toBe("/kɑst/");
    expect(lookupFormIpa(dict, "went", "go")).toBe("/wɛnt/");
  });

  it("fills only empty IPA and lists what it can't find", () => {
    const items = [
      { id: "forms:go-v", body: { wordId: "word:go-v", past: [{ text: "went", ipa: "" }], participle: [{ text: "gone", ipa: "/ɡɔn/" }] } },
      { id: "forms:x-v", body: { wordId: "word:x-v", past: [{ text: "xed", ipa: "" }], participle: [{ text: "xed", ipa: "" }] } },
    ];
    const missing = fillFormsIpa(dict, items, new Map([["word:go-v", { headword: "go", ipa: "/ɡoʊ/" }]]));
    expect(items[0].body.past[0].ipa).toBe("/wɛnt/");
    expect(items[0].body.participle[0].ipa).toBe("/ɡɔn/");
    expect(missing).toEqual(["forms:x-v: xed", "forms:x-v: xed"]);
  });
});
