// @vitest-environment node
import { beforeEach, describe, expect, it } from "vitest";
import { sentence } from "@/learning/exercises/fixtures";
import { sqliteDb } from "@/test-utils/sqlite-d1";
import { decideClaims, listClaimGroups } from "./claims.service";

const NOW = 1_800_000_000_000;
let handle: ReturnType<typeof sqliteDb>;

function addClaim(id: string, sentenceId: string, answer: string, createdAt: number, source = "learner") {
  handle.sqlite.prepare("INSERT INTO claims (id, sentence_id, answer, device_hash, day, created_at, status, source) VALUES (?, ?, ?, 'd', '2026-11-09', ?, 'pending', ?)").run(id, sentenceId, answer, createdAt, source);
}
const status = (id: string) => handle.sqlite.prepare("SELECT status, explanation_vi AS why, decided_at AS at FROM claims WHERE id = ?").get(id) as { status: string; why: string | null; at: number | null };
const wording = () => handle.sqlite.prepare("SELECT body, admin_edited_at AS at, level FROM content_items WHERE id = 'wording:sea'").get() as { body: string; at: number; level: string } | undefined;

beforeEach(() => {
  handle = sqliteDb();
  handle.sqlite.exec(`INSERT INTO content_meta (id, version, published_at, counts) VALUES (1, 3, 1, '{}')`);
  const sea = sentence("sea", { tokens: ["Close", "your", "eyes", "and", "imagine", "the", "sea."], vi: "Nhắm mắt lại và tưởng tượng biển cả." });
  handle.sqlite.prepare("INSERT INTO content_items (id, kind, level, sort, body, deleted, updated_version) VALUES (?, 'sentence', 'A2', 0, ?, 0, 3)").run(sea.id, JSON.stringify(sea.body));
  addClaim("c1", "sentence:sea", "Shut your eyes and picture the sea.", NOW - 3000);
  addClaim("c2", "sentence:sea", "shut your eyes and picture the sea", NOW - 2000, "ai");
  addClaim("c3", "sentence:sea", "Close your eyes and think of the ocean.", NOW - 1000);
  addClaim("c4", "sentence:gone", "Hello.", NOW - 500);
});

describe("admin claims (feature 038)", () => {
  it("groups the same wording of a sentence, oldest first, with what it already accepts (AC-009)", async () => {
    const groups = await listClaimGroups(handle.db);
    expect(groups.map((g) => [g.ids, g.count, g.ai])).toEqual([[["c1", "c2"], 2, true], [["c3"], 1, false], [["c4"], 1, false]]);
    expect(groups[0]).toMatchObject({ answer: "Shut your eyes and picture the sea.", sentence: { vi: "Nhắm mắt lại và tưởng tượng biển cả.", level: "A2" }, accepted: ["Close your eyes and imagine the sea."] });
    expect(groups[2].sentence).toBeNull();
  });

  it("approving creates the wording item live and marks the claims (AC-010)", async () => {
    expect(await decideClaims(handle.db, { ids: ["c1", "c2"], decision: "approve" }, NOW)).toEqual({ ok: true, changed: 2 });
    expect(JSON.parse(wording()!.body)).toEqual({ sentenceId: "sentence:sea", accepted: ["Shut your eyes and picture the sea."] });
    expect(wording()).toMatchObject({ at: NOW, level: "A2" });
    expect(status("c1")).toEqual({ status: "approved", why: null, at: NOW });
    // A second approval adds to the same item.
    await decideClaims(handle.db, { ids: ["c3"], decision: "approve" }, NOW + 1);
    expect(JSON.parse(wording()!.body).accepted).toHaveLength(2);
    expect((await listClaimGroups(handle.db)).find((g) => g.sentenceId === "sentence:sea")).toBeUndefined();
  });

  it("doesn't add a wording that is already accepted, and changes nothing when decided twice", async () => {
    await decideClaims(handle.db, { ids: ["c1"], decision: "approve" }, NOW);
    expect(await decideClaims(handle.db, { ids: ["c2"], decision: "approve" }, NOW)).toEqual({ ok: true, changed: 1 });
    expect(JSON.parse(wording()!.body).accepted).toHaveLength(1);
    expect(await decideClaims(handle.db, { ids: ["c1", "c2"], decision: "reject", explanationVi: "x" }, NOW)).toEqual({ ok: true, changed: 0 });
  });

  it("rejects with the explanation, and drops a claim whose sentence is gone (AC-011, AC-012)", async () => {
    await decideClaims(handle.db, { ids: ["c3"], decision: "reject", explanationVi: "\"Ocean\" khác nghĩa với \"biển cả\" ở đây." }, NOW);
    expect(status("c3")).toEqual({ status: "rejected", why: "\"Ocean\" khác nghĩa với \"biển cả\" ở đây.", at: NOW });
    expect(await decideClaims(handle.db, { ids: ["c4"], decision: "approve" }, NOW)).toEqual({ ok: false, reason: "gone" });
    await decideClaims(handle.db, { ids: ["c4"], decision: "drop" }, NOW);
    expect(status("c4").status).toBe("dropped");
    expect(wording()).toBeUndefined();
  });

  it("refuses to approve claims of two sentences at once", async () => {
    expect(await decideClaims(handle.db, { ids: ["c1", "c4"], decision: "approve" }, NOW)).toEqual({ ok: false, reason: "mixed" });
  });
});
