// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { getContentItem, listContent, saveContentItem, setContentRemoved } from "./content.service";

const NOW = 1_800_000_000_000;
const WRITING = { kind: "short-writing", promptVi: "Viết 3 câu về gia đình.", useItems: [], modelAnswers: ["I have a small family."] };
let handle: ReturnType<typeof sqliteDb>;

const meta = () => handle.sqlite.prepare("SELECT version, counts FROM content_meta WHERE id = 1").get() as { version: number; counts: string } | undefined;
const edited = (id: string) => (handle.sqlite.prepare("SELECT admin_edited_at AS at, updated_version AS v, deleted FROM content_items WHERE id = ?").get(id) as { at: number | null; v: number; deleted: number });

beforeEach(() => {
  handle = sqliteDb();
  handle.sqlite.exec(`INSERT INTO content_meta (id, version, published_at, counts) VALUES (1, 7, 1, '{}')`);
  const insert = handle.sqlite.prepare("INSERT INTO content_items (id, kind, level, topic, sort, body, deleted, updated_version) VALUES (?, ?, ?, ?, ?, ?, 0, 7)");
  insert.run("writing:a1-family", "writing", "A1", null, 0, JSON.stringify(WRITING));
  insert.run("writing:a2-weekend", "writing", "A2", "free-time", 1, JSON.stringify({ ...WRITING, promptVi: "Viết về cuối tuần 50% vui." }));
  insert.run("placement:p1", "placement", "A1", null, 0, JSON.stringify({ kind: "meaning-mcq", prompt: "cat", options: ["a", "b", "c", "d"], answerIndex: 0 }));
});

describe("admin content (feature 038)", () => {
  it("lists with filters and search by id or text, escaping wildcards (AC-013)", async () => {
    expect((await listContent(handle.db, { page: 1 })).total).toBe(3);
    expect((await listContent(handle.db, { kind: "writing", level: "A2", page: 1 })).items.map((i) => i.id)).toEqual(["writing:a2-weekend"]);
    expect((await listContent(handle.db, { q: "gia đình", page: 1 })).items.map((i) => i.id)).toEqual(["writing:a1-family"]);
    expect((await listContent(handle.db, { q: "50%", page: 1 })).items.map((i) => i.id)).toEqual(["writing:a2-weekend"]);
    expect((await listContent(handle.db, { q: "%", page: 1 })).total).toBe(1);
    expect((await listContent(handle.db, { page: 2 })).items).toEqual([]);
  });

  it("saves a change live: new version, row on that version, marked edited, counts recounted (AC-015)", async () => {
    const result = await saveContentItem(handle.db, { create: false, item: { id: "writing:a1-family", kind: "writing", level: "A1", topic: "family", sort: 2, body: { ...WRITING, promptVi: "Mới" } } }, NOW);
    expect(result).toMatchObject({ ok: true, item: { topic: "family", sort: 2, body: { promptVi: "Mới" }, adminEditedAt: NOW, updatedVersion: 8 } });
    expect(meta()!.version).toBe(8);
    expect(JSON.parse(meta()!.counts)).toMatchObject({ writing: 2, placement: 1, word: 0 });
    expect(edited("writing:a2-weekend").at).toBeNull();
  });

  it("refuses an invalid body with the problems, and writes nothing", async () => {
    const result = await saveContentItem(handle.db, { create: false, item: { id: "writing:a1-family", kind: "writing", level: "A1", sort: 0, body: { kind: "short-writing", promptVi: "" } } }, NOW);
    expect(result.ok).toBe(false);
    if (!result.ok && result.reason === "invalid") expect(result.issues.map((issue) => issue.path)).toEqual(expect.arrayContaining(["body.promptVi", "body.modelAnswers"]));
    expect(meta()!.version).toBe(7);
  });

  it("adds a new item and refuses a duplicate id or a wrong prefix (AC-016)", async () => {
    const item = { id: "writing:b1-new", kind: "writing" as const, level: "B1" as const, sort: 0, body: WRITING };
    expect((await saveContentItem(handle.db, { create: true, item }, NOW)).ok).toBe(true);
    expect(await getContentItem(handle.db, "writing:b1-new")).toMatchObject({ level: "B1", adminEditedAt: NOW });
    expect(await saveContentItem(handle.db, { create: true, item }, NOW)).toEqual({ ok: false, reason: "exists" });
    expect((await saveContentItem(handle.db, { create: true, item: { ...item, id: "word:oops" } }, NOW)).ok).toBe(false);
    expect(await saveContentItem(handle.db, { create: false, item: { ...item, id: "writing:missing" } }, NOW)).toEqual({ ok: false, reason: "not-found" });
  });

  it("keeps placement and set items read-only (AC-014)", async () => {
    expect(await saveContentItem(handle.db, { create: false, item: { id: "placement:p1", kind: "placement", level: "A1", sort: 0, body: {} } }, NOW)).toEqual({ ok: false, reason: "read-only" });
    expect(await setContentRemoved(handle.db, "placement:p1", true, NOW)).toEqual({ ok: false, reason: "read-only" });
  });

  it("removes as a tombstone with a new version, and restores (AC-017)", async () => {
    expect(await setContentRemoved(handle.db, "writing:a2-weekend", true, NOW)).toEqual({ ok: true });
    expect(edited("writing:a2-weekend")).toEqual({ at: NOW, v: 8, deleted: 1 });
    expect(JSON.parse(meta()!.counts).writing).toBe(1);
    await setContentRemoved(handle.db, "writing:a2-weekend", false, NOW + 1);
    expect(edited("writing:a2-weekend")).toEqual({ at: NOW + 1, v: 9, deleted: 0 });
    expect(await setContentRemoved(handle.db, "writing:nope", true, NOW)).toEqual({ ok: false, reason: "not-found" });
  });
});
