import { describe, expect, it } from "vitest";
import type { SourceItem } from "../../src/content/schema";
import { buildSheet, idsFromDecisions, reviewUnits } from "./review-sheet";

const sentence = (id: string, status = "draft") =>
  ({
    id,
    kind: "sentence",
    level: "A1",
    status,
    body: { en: "I like </script> tea.", vi: "x", audio: "", tokens: ["I", "like", "tea"], acceptedOrders: [[0, 1, 2]], wrongVariants: [], gapCandidates: [1], wordIds: [] },
  }) as unknown as SourceItem;

const word = (slug: string, topic: string, reviewNotes?: string[]) =>
  ({
    id: `word:${slug}`,
    kind: "word",
    level: "A1",
    topic,
    status: "draft",
    ...(reviewNotes ? { reviewNotes } : {}),
    body: { headword: slug, variants: [], pos: "noun", ipa: "", meaningsVi: ["x"], examples: [`sentence:${slug}-1`], synonyms: [], audio: "", source: "cefrj-1.5" },
  }) as unknown as SourceItem;

describe("reviewUnits", () => {
  const items = [word("tea", "food-drink"), sentence("sentence:tea-1"), word("cup", "home", ["check IPA"]), sentence("sentence:cup-1", "approved")];

  it("groups each word with its draft sentences and puts flagged units first", () => {
    const units = reviewUnits(items);
    expect(units.map((unit) => [unit.id, unit.ids, unit.flagged])).toEqual([
      ["word:cup", ["word:cup"], true],
      ["word:tea", ["word:tea", "sentence:tea-1"], false],
    ]);
  });

  it("changes a unit's hash when its content changes", () => {
    const before = reviewUnits(items)[1].hash;
    const edited = [word("tea", "food-drink"), { ...sentence("sentence:tea-1"), body: { ...(sentence("x").body as object), vi: "y" } } as SourceItem];
    expect(reviewUnits(edited)[0].hash).not.toBe(before);
  });
});

describe("idsFromDecisions", () => {
  it("reads a decisions file or a plain array", () => {
    expect(idsFromDecisions({ level: "A1", approve: ["word:tea", "sentence:tea-1"], fix: [] })).toEqual(["word:tea", "sentence:tea-1"]);
    expect(idsFromDecisions(["word:tea"])).toEqual(["word:tea"]);
    expect(() => idsFromDecisions({ nope: true })).toThrow();
  });
});

describe("buildSheet", () => {
  it("embeds the data without a raw closing tag", () => {
    const html = buildSheet("A1", reviewUnits([word("tea", "food-drink"), sentence("sentence:tea-1")]), {});
    const data = html.slice(html.indexOf('id="data">'), html.indexOf("</script>", html.indexOf('id="data">')));
    expect(data).not.toContain("</script>");
    expect(data).toContain("\\u003c/script>");
  });
});

describe("verb forms units (feature 008)", () => {
  const verb = { ...(word("go", "travel") as object), id: "word:go-v", status: "approved", body: { ...((word("go", "travel") as { body: object }).body), headword: "go", pos: "verb" } } as SourceItem;
  const forms = {
    id: "forms:go-v",
    kind: "forms",
    level: "A1",
    status: "draft",
    body: {
      wordId: "word:go-v",
      past: [{ text: "went", ipa: "/wɛnt/" }],
      participle: [{ text: "gone", ipa: "" }],
      audio: "",
      practice: [{ en: "She ___ home.", answer: "past", vi: "Cô ấy về nhà." }, { en: "They have ___.", answer: "participle", vi: "Họ đã đi." }],
    },
  } as unknown as SourceItem;

  it("makes a unit with the verb's base form, after writing and before words", () => {
    const units = reviewUnits([verb, forms, word("tea", "food-drink")]);
    expect(units.map((unit) => [unit.id, unit.kind, unit.headword])).toEqual([
      ["forms:go-v", "forms", "go"],
      ["word:tea", "word", undefined],
    ]);
    expect(units[0].ids).toEqual(["forms:go-v"]);
  });

  it("shows the three forms and the practice answers on the sheet", () => {
    const html = buildSheet("A1", reviewUnits([verb, forms]), {});
    expect(html).toContain('<option value="forms">Verb forms</option>');
    expect(html).toContain('"headword":"go"');
  });
});
