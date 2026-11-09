import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  apply,
  autoDecide,
  decisionSql,
  groupClaims,
  planApply,
  pull,
  sentencesFrom,
  suggestVerdicts,
  upsertWordings,
  wordingsFrom,
  type ClaimGroup,
  type ClaimRow,
  type ClaimsFile,
  type Io,
} from "./claims";

function sentence(slug: string, en: string, vi: string, extra: Record<string, unknown> = {}) {
  const tokens = en.replace(/[.?!]$/, "").split(" ");
  return {
    id: `sentence:${slug}`,
    kind: "sentence",
    level: "A1",
    sort: 0,
    status: "approved",
    body: { en, vi, audio: "", tokens, acceptedOrders: [tokens.map((_, i) => i)], ...extra },
  };
}

const SENTENCES = [
  sentence("fx-friday", "The deadline is Friday.", "Hạn chót là thứ Sáu."),
  sentence("fx-dinner", "I do my homework after dinner.", "Tôi làm bài tập sau bữa tối.", {
    acceptedOrders: [
      [0, 1, 2, 3, 4, 5],
      [4, 5, 0, 1, 2, 3],
    ],
  }),
  { ...sentence("fx-draft", "It is a draft.", "Đây là bản nháp."), status: "draft" },
];
const WORDINGS = [
  { id: "wording:fx-friday", kind: "wording", level: "A1", sort: 0, body: { sentenceId: "sentence:fx-friday", accepted: ["Friday is the deadline."] }, status: "approved" },
];

const row = (id: string, sentenceId: string, answer: string, at = 1, source = "learner"): ClaimRow => ({ id, sentence_id: sentenceId, answer, created_at: at, source });

describe("sentencesFrom / wordingsFrom", () => {
  it("keeps approved sentences with their accepted orders, and approved wordings", () => {
    const sentences = sentencesFrom([SENTENCES, "not an array"]);
    expect([...sentences.keys()]).toEqual(["sentence:fx-friday", "sentence:fx-dinner"]);
    expect(sentences.get("sentence:fx-dinner")!.texts).toContain("after dinner I do my homework");
    expect(wordingsFrom([WORDINGS]).get("sentence:fx-friday")).toEqual(["Friday is the deadline."]);
  });
});

describe("groupClaims", () => {
  it("groups the same wording of the same sentence, forgiving case, punctuation and contractions", () => {
    const groups = groupClaims([
      row("b", "sentence:fx-friday", "It isn't the deadline", 2),
      row("a", "sentence:fx-friday", "  It is not the deadline!  ", 1),
      row("c", "sentence:fx-dinner", "Friday is the deadline", 3),
      row("d", "sentence:fx-friday", "it is NOT the deadline.", 4),
    ]);
    expect(groups.map((g) => [g.sentenceId, g.answer, g.claimIds])).toEqual([
      ["sentence:fx-friday", "It is not the deadline!", ["a", "b", "d"]],
      ["sentence:fx-dinner", "Friday is the deadline", ["c"]],
    ]);
    expect(groups[0].count).toBe(3);
  });

  it("counts the claims AI grading accepted (033 AC-018)", () => {
    const groups = groupClaims([
      row("a", "sentence:fx-friday", "It is not the deadline", 1, "ai"),
      row("b", "sentence:fx-friday", "it isn't the deadline", 2),
      row("c", "sentence:fx-friday", "It is not the deadline.", 3, "ai"),
      row("d", "sentence:fx-dinner", "Friday is the deadline", 4),
    ]);
    expect(groups.map((g) => [g.count, g.aiCount])).toEqual([
      [3, 2],
      [1, 0],
    ]);
  });
});

describe("autoDecide", () => {
  const sentences = sentencesFrom([SENTENCES]);
  const wordings = wordingsFrom([WORDINGS]);
  const decide = (sentenceId: string, answer: string) => autoDecide(groupClaims([row("x", sentenceId, answer)]), sentences, wordings)[0];

  it("drops claims on a sentence that is gone or not approved", () => {
    expect(decide("sentence:fx-gone", "Hello there.").auto?.status).toBe("dropped");
    expect(decide("sentence:fx-draft", "It is a draft.").auto?.status).toBe("dropped");
  });

  it("approves wordings the sentence, an accepted order or a wording already accepts", () => {
    expect(decide("sentence:fx-friday", "the deadline is friday").auto?.status).toBe("approved");
    expect(decide("sentence:fx-dinner", "After dinner, I do my homework.").auto?.status).toBe("approved");
    expect(decide("sentence:fx-friday", "FRIDAY is the deadline!!").auto?.status).toBe("approved");
  });

  it("rejects an answer without English words and leaves the rest to the owner", () => {
    const empty = decide("sentence:fx-friday", "???");
    expect(empty.auto).toMatchObject({ status: "rejected" });
    expect(empty.auto?.explanationVi).toBeTruthy();
    const open = decide("sentence:fx-friday", "The deadline is on Friday.");
    expect(open.auto).toBeUndefined();
    expect(open.sentence).toEqual({ level: "A1", vi: "Hạn chót là thứ Sáu.", en: "The deadline is Friday." });
  });
});

describe("suggestVerdicts", () => {
  it("asks only about open groups and survives a failed call", async () => {
    const groups = autoDecide(
      groupClaims([row("a", "sentence:fx-friday", "The deadline is on Friday."), row("b", "sentence:fx-friday", "Deadline Friday."), row("c", "sentence:fx-gone", "x")]),
      sentencesFrom([SENTENCES]),
      new Map(),
    );
    const judge = vi.fn(async (group: ClaimGroup) => {
      if (group.answer.startsWith("Deadline")) throw new Error("overloaded");
      return { verdict: "approve" as const, reasonVi: "Đúng.", noteEn: "fine" };
    });
    const out = await suggestVerdicts(groups, judge, 2);
    expect(judge).toHaveBeenCalledTimes(2);
    expect(out[0].suggestion?.verdict).toBe("approve");
    expect(out[1].suggestionError).toBe("overloaded");
    expect(out[2].suggestion).toBeUndefined();
  });
});

function claimsFile(): ClaimsFile {
  const groups = autoDecide(
    groupClaims([
      row("c1", "sentence:fx-friday", "The deadline is on Friday.", 1),
      row("c2", "sentence:fx-friday", "the deadline is on friday", 2),
      row("c3", "sentence:fx-dinner", "I does my homework after dinner.", 3),
      row("c4", "sentence:fx-friday", "The deadline is Friday", 4),
      row("c5", "sentence:fx-gone", "Hello.", 5),
      row("c6", "sentence:fx-dinner", "I make my homework after dinner.", 6),
    ]),
    sentencesFrom([SENTENCES]),
    new Map(),
  );
  return { date: "2026-11-01", target: "local", groups };
}
const ON_FRIDAY = "sentence:fx-friday#the deadline is on friday";
const DOES = "sentence:fx-dinner#i does my homework after dinner";
const MAKE = "sentence:fx-dinner#i make my homework after dinner";

describe("planApply", () => {
  it("matches decisions with groups and keeps undecided groups pending", () => {
    const plan = planApply(claimsFile(), { date: "2026-11-01", approve: [ON_FRIDAY], reject: [{ groupKey: DOES, explanationVi: " Dùng \"do\". " }] });
    expect(plan.errors).toEqual([]);
    expect(plan.approve.map((g) => g.claimIds)).toEqual([["c1", "c2"]]);
    expect(plan.reject).toEqual([{ group: expect.objectContaining({ key: DOES }), explanationVi: 'Dùng "do".' }]);
    expect(plan.auto.map((g) => g.auto!.status)).toEqual(["approved", "dropped"]);
    expect(plan.undecided.map((g) => g.key)).toEqual([MAKE]);
  });

  it("refuses an empty explanation, unknown or automatic groups, double decisions and another date", () => {
    const plan = planApply(claimsFile(), {
      date: "2026-10-31",
      approve: [ON_FRIDAY, "sentence:fx-friday#nope", "sentence:fx-friday#the deadline is friday"],
      reject: [{ groupKey: DOES, explanationVi: "  " }, { groupKey: ON_FRIDAY, explanationVi: "Sai." }],
    });
    expect(plan.errors).toHaveLength(5);
    expect(plan.errors.join("\n")).toMatch(/2026-10-31.*2026-11-01/);
    expect(plan.errors.join("\n")).toContain("needs a Vietnamese explanation");
    expect(plan.errors.join("\n")).toContain("not in the claims file");
    expect(plan.errors.join("\n")).toContain("decided automatically");
    expect(plan.errors.join("\n")).toContain("decided twice");
  });
});

describe("upsertWordings", () => {
  it("creates the item in the sentence's level file, appends, and skips a wording already there", () => {
    const first = upsertWordings([], [{ sentenceId: "sentence:fx-friday", level: "A1", answer: "The deadline is on Friday." }]);
    expect(first).toEqual([
      {
        level: "A1",
        items: [{ id: "wording:fx-friday", kind: "wording", level: "A1", sort: 0, body: { sentenceId: "sentence:fx-friday", accepted: ["The deadline is on Friday."] }, status: "approved" }],
      },
    ]);
    const second = upsertWordings(first, [
      { sentenceId: "sentence:fx-friday", level: "A1", answer: "the deadline is on friday!" },
      { sentenceId: "sentence:fx-friday", level: "A1", answer: "Friday is the deadline." },
    ]);
    expect((second[0].items[0].body as { accepted: string[] }).accepted).toEqual(["The deadline is on Friday.", "Friday is the deadline."]);
    expect(upsertWordings(second, [{ sentenceId: "sentence:fx-friday", level: "A1", answer: "friday is the deadline" }])).toEqual([]);
  });

  it("updates an item where it already lives", () => {
    const files = [{ level: "B1", items: [{ ...WORDINGS[0], level: "B1" }] }];
    const out = upsertWordings(files, [{ sentenceId: "sentence:fx-friday", level: "A1", answer: "It is due on Friday." }]);
    expect(out.map((f) => f.level)).toEqual(["B1"]);
    expect(files[0].items[0].body.accepted).toEqual(["Friday is the deadline."]);
  });
});

describe("decisionSql", () => {
  it("escapes quotes and only touches pending claims", () => {
    const sql = decisionSql(
      [
        { status: "approved", ids: ["a", "b"] },
        { status: "rejected", ids: ["c'); DROP TABLE claims; --"], explanationVi: "Bạn cần \"do\", không phải 'does'." },
        { status: "dropped", ids: ["d"] },
      ],
      1_700_000_000_000,
    );
    expect(sql.split("\n").filter(Boolean)).toEqual([
      "UPDATE claims SET status = 'approved', explanation_vi = NULL, decided_at = 1700000000000 WHERE id IN ('a', 'b') AND status = 'pending';",
      "UPDATE claims SET status = 'rejected', explanation_vi = 'Bạn cần \"do\", không phải ''does''.', decided_at = 1700000000000 WHERE id IN ('c''); DROP TABLE claims; --') AND status = 'pending';",
      "UPDATE claims SET status = 'dropped', explanation_vi = NULL, decided_at = 1700000000000 WHERE id IN ('d') AND status = 'pending';",
    ]);
    expect(decisionSql([], 1)).toBe("");
  });

  it("splits long id lists", () => {
    const ids = Array.from({ length: 250 }, (_, i) => `id-${i}`);
    expect(decisionSql([{ status: "approved", ids }], 1).trim().split("\n")).toHaveLength(3);
  });
});

describe("pull and apply (temp content folder)", () => {
  let dir: string;
  let executed: string[];
  let logs: string[];
  const io = (rows: ClaimRow[] = []): Io => ({
    contentDir: dir,
    query: () => rows,
    executeFile: (_target, file) => void executed.push(readFileSync(file, "utf8")),
    judge: async (group) => ({ verdict: group.answer.includes("does") ? "reject" : "approve", reasonVi: "Lý do <b>.", noteEn: "note" }),
    now: () => new Date("2026-11-01T10:00:00Z"),
    log: (line) => void logs.push(line),
  });

  beforeEach(() => {
    dir = mkdtempSync(path.join(tmpdir(), "claims-"));
    mkdirSync(path.join(dir, "sentence"));
    writeFileSync(path.join(dir, "sentence", "A1.json"), JSON.stringify(SENTENCES));
    executed = [];
    logs = [];
  });
  afterEach(() => rmSync(dir, { recursive: true, force: true }));

  it("pull writes the claims file and the sheet, and nothing when no claim waits", async () => {
    expect(await pull("local", io())).toBeNull();
    const rows = [row("c1", "sentence:fx-friday", "The deadline is on Friday."), row("c3", "sentence:fx-dinner", "I does my homework after dinner.")];
    const file = await pull("local", io(rows));
    expect(file!.groups.map((g) => g.suggestion?.verdict)).toEqual(["approve", "reject"]);
    const saved = JSON.parse(readFileSync(path.join(dir, ".claims", "2026-11-01.json"), "utf8")) as ClaimsFile;
    expect(saved).toEqual(file);
    expect(readFileSync(path.join(dir, ".claims", "2026-11-01.html"), "utf8")).toContain("Lý do &lt;b&gt;.");
    expect(executed).toEqual([]);
  });

  it("apply writes the wording file and the SQL, and is safe to re-run", async () => {
    mkdirSync(path.join(dir, ".claims"));
    writeFileSync(path.join(dir, ".claims", "2026-11-01.json"), JSON.stringify(claimsFile()));
    const decisions = path.join(dir, "claims-decisions-2026-11-01.json");
    writeFileSync(decisions, JSON.stringify({ date: "2026-11-01", approve: [ON_FRIDAY], reject: [{ groupKey: DOES, explanationVi: "Với \"I\" dùng \"do\"." }] }));

    expect(await apply(decisions, "local", io())).toBe(0);
    const wordingFile = path.join(dir, "wording", "A1.json");
    const written = readFileSync(wordingFile, "utf8");
    expect(JSON.parse(written)).toEqual([
      { id: "wording:fx-friday", kind: "wording", level: "A1", sort: 0, body: { sentenceId: "sentence:fx-friday", accepted: ["The deadline is on Friday."] }, status: "approved" },
    ]);
    expect(written.endsWith("]\n")).toBe(true);
    expect(executed).toHaveLength(1);
    expect(executed[0]).toContain("status = 'approved', explanation_vi = NULL, decided_at = 1793527200000 WHERE id IN ('c1', 'c2', 'c4') AND status = 'pending'");
    expect(executed[0]).toContain("status = 'rejected', explanation_vi = 'Với \"I\" dùng \"do\".'");
    expect(executed[0]).toContain("status = 'dropped', explanation_vi = NULL, decided_at = 1793527200000 WHERE id IN ('c5')");
    expect(executed[0]).not.toContain("c6");
    expect(existsSync(path.join(dir, ".claims", "2026-11-01.sql"))).toBe(true);

    expect(await apply(decisions, "local", io())).toBe(0);
    expect(readFileSync(wordingFile, "utf8")).toBe(written);
  });

  it("apply writes nothing when a decision is invalid or the target differs", async () => {
    mkdirSync(path.join(dir, ".claims"));
    writeFileSync(path.join(dir, ".claims", "2026-11-01.json"), JSON.stringify(claimsFile()));
    const decisions = path.join(dir, "d.json");
    writeFileSync(decisions, JSON.stringify({ date: "2026-11-01", approve: [ON_FRIDAY], reject: [{ groupKey: DOES, explanationVi: "" }] }));
    expect(await apply(decisions, "local", io())).toBe(1);
    expect(existsSync(path.join(dir, "wording"))).toBe(false);
    expect(executed).toEqual([]);
    await expect(apply(decisions, "remote", io())).rejects.toThrow(/local D1/);
  });
});
