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
