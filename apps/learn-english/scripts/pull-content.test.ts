import { describe, expect, it } from "vitest";
import { unpulledEdits, type ExistingRow } from "./publish-content";
import { applyPulled, clearMarksSql, type EditedRow } from "./pull-content";

const row = (over: Partial<EditedRow>): EditedRow => ({ id: "writing:a1-x", kind: "writing", level: "A1", topic: null, sort: 0, body: '{"promptVi":"new"}', deleted: 0, admin_edited_at: 5, ...over });
const sources = () => [
  { file: "content/writing/A1.json", data: [{ level: "A1", sort: 0, id: "writing:a1-x", kind: "writing", body: { promptVi: "old" }, status: "draft", reviewNotes: "keep me" }, { id: "writing:a1-y", kind: "writing", level: "A1", body: {}, status: "approved" }] },
  { file: "content/word/set-farm.json", data: [{ level: "A2", id: "word:cow-n", kind: "word", body: { headword: "cow" }, status: "approved" }] },
];

describe("content:pull (feature 038, AC-018)", () => {
  it("replaces an entry in place, keeping its other fields and the file order, and approves it", () => {
    const { files, log } = applyPulled(sources(), [row({ topic: "family", sort: 3 })], "content");
    expect([...files.keys()]).toEqual(["content/writing/A1.json"]);
    const [first, second] = files.get("content/writing/A1.json")!;
    expect(first).toEqual({ level: "A1", sort: 3, id: "writing:a1-x", kind: "writing", topic: "family", body: { promptVi: "new" }, status: "approved", reviewNotes: "keep me" });
    expect(second.id).toBe("writing:a1-y");
    expect(log).toEqual(["updated writing:a1-x in content/writing/A1.json"]);
  });

  it("moves an item whose level changed, but keeps set files in place", () => {
    const { files } = applyPulled(sources(), [row({ level: "B1" }), row({ id: "word:cow-n", kind: "word", level: "B2", body: '{"headword":"cow"}' })], "content");
    expect(files.get("content/writing/A1.json")!.map((e) => e.id)).toEqual(["writing:a1-y"]);
    expect(files.get("content/writing/B1.json")!.map((e) => e.level)).toEqual(["B1"]);
    expect(files.get("content/word/set-farm.json")![0].level).toBe("B2");
  });

  it("adds new items to their level file and takes removed ones out", () => {
    const { files } = applyPulled(sources(), [row({ id: "wording:sea", kind: "wording", level: "A2", body: '{"sentenceId":"sentence:sea","accepted":["x"]}' }), row({ id: "writing:a1-y", deleted: 1 })], "content");
    expect(files.get("content/wording/A2.json")).toEqual([{ level: "A2", sort: 0, id: "wording:sea", kind: "wording", body: { sentenceId: "sentence:sea", accepted: ["x"] }, status: "approved" }]);
    expect(files.get("content/writing/A1.json")!.map((e) => e.id)).toEqual(["writing:a1-x"]);
  });

  it("clears only marks that weren't set again meanwhile", () => {
    expect(clearMarksSql([row({ id: "it's" })])).toBe("UPDATE content_items SET admin_edited_at = NULL WHERE id = 'it''s' AND admin_edited_at = 5;");
  });
});

describe("content:publish guard (AC-019)", () => {
  it("names the rows edited on the admin page and not yet pulled", () => {
    const rows = [{ id: "a", admin_edited_at: 5 }, { id: "b", admin_edited_at: null }, { id: "c" }] as ExistingRow[];
    expect(unpulledEdits(rows)).toEqual(["a"]);
  });
});
