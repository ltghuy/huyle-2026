import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { contentItemSchema, type ContentItem } from "../src/content/schema";
import {
  buildSqlFiles,
  checkReferences,
  chunk,
  collectApproved,
  countsByKind,
  generatePlacement,
  missingAudio,
  planPublish,
  rowItemsOf,
  sqlString,
  stableStringify,
  upsertSql,
  BODY_CHUNK_CHARS,
  type ExistingRow,
  type SourceFile,
} from "./publish-content";

const FIXTURES = path.join(__dirname, "fixtures/content");
const fixture = (kind: string): SourceFile => ({
  file: `${kind}/A1.json`,
  data: JSON.parse(readFileSync(path.join(FIXTURES, kind, "A1.json"), "utf8")),
});
const fixtureFiles = () => ["word", "sentence", "grammar", "writing"].map(fixture);

function approvedFixture(): ContentItem[] {
  return collectApproved(fixtureFiles()).items;
}

function rowOf(item: ContentItem, overrides: Partial<ExistingRow> = {}): ExistingRow {
  return {
    id: item.id,
    kind: item.kind,
    level: item.level,
    topic: item.topic ?? null,
    sort: item.sort,
    body: JSON.stringify(item.body),
    deleted: 0,
    ...overrides,
  };
}

describe("collectApproved", () => {
  it("keeps approved items, skips drafts and strips the review fields", () => {
    const { items, drafts, errors } = collectApproved(fixtureFiles());
    expect(errors).toEqual([]);
    expect(drafts).toBe(1);
    expect(items.map((item) => item.id)).not.toContain("word:fish-n");
    expect(items).toHaveLength(4 + 5 + 1 + 1);
    for (const item of items) {
      expect(item).not.toHaveProperty("status");
      expect(item).not.toHaveProperty("reviewNotes");
      expect(contentItemSchema.safeParse(item).success).toBe(true);
    }
  });

  it("reports invalid items and duplicate ids", () => {
    const words = fixture("word");
    const broken = { ...(words.data as object[])[0], body: { headword: "" } };
    const { errors } = collectApproved([words, { file: "word/extra.json", data: [broken] }, { file: "x.json", data: {} }]);
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/^word\/extra.json\[0\] word:cat-n: /);
    expect(errors[1]).toMatch(/expected an array/);

    const dup = collectApproved([words, { file: "word/dup.json", data: [(words.data as object[])[0]] }]);
    expect(dup.errors).toEqual([expect.stringMatching(/duplicate id word:cat-n/)]);
  });
});

describe("checkReferences", () => {
  it("passes on the fixture", () => {
    expect(checkReferences(approvedFixture())).toEqual([]);
  });

  it("flags examples, word ids and grammar slugs that aren't approved", () => {
    const items = approvedFixture().filter((item) => item.id !== "sentence:fx-cat-n" && item.id !== "word:dog-n" && item.kind !== "grammar");
    expect(checkReferences(items)).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/^word:cat-n references sentence:fx-cat-n/),
        expect.stringMatching(/^sentence:fx-dog-n references word:dog-n/),
        expect.stringMatching(/^sentence:g-fx-to-be-1 references grammar:fx-to-be/),
      ]),
    );
  });
});

describe("missingAudio", () => {
  it("lists words and sentences without audio", () => {
    const items = approvedFixture();
    expect(missingAudio(items)).toHaveLength(9);
    const withAudio = items.map((item) =>
      item.kind === "word" || item.kind === "sentence" ? ({ ...item, body: { ...item.body, audio: "a".repeat(64) } } as ContentItem) : item,
    );
    expect(missingAudio(withAudio)).toEqual([]);
  });
});

describe("generatePlacement", () => {
  it("builds valid, deterministic meaning and grammar questions per level", () => {
    const placement = generatePlacement(approvedFixture());
    expect(generatePlacement(approvedFixture())).toEqual(placement);
    expect(placement.every((item) => contentItemSchema.safeParse(item).success)).toBe(true);
    expect(placement.map((item) => item.id)).toEqual(["placement:a1-1", "placement:a1-2", "placement:a1-3", "placement:a1-4", "placement:a1-5", "placement:a1-6"]);

    const meaning = placement.filter((item) => item.body.kind === "meaning-mcq");
    expect(meaning).toHaveLength(4);
    const cat = meaning.find((item) => item.body.prompt === "cat")!;
    expect(cat.body.options[cat.body.answerIndex]).toBe("con mèo");
    expect(new Set(cat.body.options)).toEqual(new Set(["con mèo", "con chó", "quyển sách", "quả táo"]));

    // Only the practice items with 4 options qualify.
    const grammar = placement.filter((item) => item.body.kind === "grammar-mcq");
    expect(grammar.map((item) => item.body.options[item.body.answerIndex]).sort()).toEqual(["am", "are"]);
  });

  it("never uses a synonym or a word sharing a meaning as a distractor, and caps the counts", () => {
    const base = approvedFixture().find((item) => item.id === "word:cat-n")!;
    const words = Array.from({ length: 20 }, (_, i) =>
      contentItemSchema.parse({ ...base, id: `word:w-${i}`, body: { ...base.body, headword: `w${i}`, meaningsVi: [`nghĩa ${i}`] } }),
    );
    const twin = contentItemSchema.parse({ ...base, id: "word:twin", body: { ...base.body, headword: "twin", meaningsVi: ["nghĩa 0"] } });
    const placement = generatePlacement([...words, twin]);
    expect(placement).toHaveLength(12);
    for (const item of placement) {
      if (item.body.prompt === "w0" || item.body.prompt === "twin") {
        expect(item.body.options.filter((option) => option === "nghĩa 0")).toHaveLength(1);
      }
    }
  });

  it("generates nothing for a level with too few words", () => {
    const items = approvedFixture().filter((item) => item.kind !== "grammar" && item.id !== "word:apple-n");
    expect(generatePlacement(items)).toEqual([]);
  });
});

describe("planPublish", () => {
  it("upserts new and changed items only", () => {
    const [a, b, c] = approvedFixture();
    const changed = { ...b, sort: b.sort + 1 } as ContentItem;
    const plan = planPublish([a, changed, c], [rowOf(a), rowOf(b)]);
    expect(plan.upserts.map((item) => item.id)).toEqual([b.id, c.id]);
    expect(plan.tombstones).toEqual([]);
  });

  it("treats a body with keys in another order as unchanged", () => {
    const [a] = approvedFixture();
    const reordered = JSON.stringify(Object.fromEntries(Object.entries(a.body).reverse()));
    expect(planPublish([a], [rowOf(a, { body: reordered })]).upserts).toEqual([]);
  });

  it("tombstones live rows that are gone, and revives tombstoned items that are back", () => {
    const [a, b] = approvedFixture();
    const plan = planPublish([a], [rowOf(a, { deleted: 1 }), rowOf(b), { ...rowOf(b), id: "word:old-n", deleted: 1 }]);
    expect(plan.upserts.map((item) => item.id)).toEqual([a.id]);
    expect(plan.tombstones).toEqual([b.id]);
  });

  it("with levels, never tombstones rows of other levels", () => {
    const [a, b] = approvedFixture();
    const otherLevel = { ...rowOf(b), id: "word:later-n", level: "B2" };
    const plan = planPublish([a], [rowOf(a), rowOf(b), otherLevel], new Set(["A1"]));
    expect(plan.tombstones).toEqual([b.id]);
  });
});

describe("SQL", () => {
  it("escapes single quotes", () => {
    expect(sqlString("it's")).toBe("'it''s'");
    const [word] = approvedFixture();
    const item = { ...word, topic: "o'clock" } as ContentItem;
    const sql = upsertSql(item, 3);
    expect(sql).toContain("'o''clock'");
    expect(sql).toMatch(/^INSERT INTO content_items \(id, kind, level, topic, sort, body, deleted, updated_version\) VALUES \('word:cat-n', 'word', 'A1'/);
    expect(sql).toContain("ON CONFLICT(id) DO UPDATE SET");
    expect(sql).toContain(", 0, 3) ");
  });

  it("writes a body too long for one D1 statement in pieces, each under 100 KB (feature 012)", () => {
    const [word] = approvedFixture();
    const long = { ...word, body: { ...word.body, meaningsVi: ["ờ'" .repeat(BODY_CHUNK_CHARS)] } } as ContentItem;
    const statements = upsertSql(long, 4).split("\n");
    expect(statements.length).toBeGreaterThan(2);
    expect(statements[0]).toMatch(/^INSERT INTO content_items/);
    for (const statement of statements.slice(1)) expect(statement).toMatch(/^UPDATE content_items SET body = body \|\| '.*' WHERE id = 'word:cat-n';$/);
    for (const statement of statements) expect(Buffer.byteLength(statement)).toBeLessThan(100_000);
    // Unquoting and joining the pieces gives the body back.
    const pieces = statements.map((statement, i) => {
      const quoted = i === 0 ? statement.match(/, 0, '((?:[^']|'')*)', 0, 4\)/)![1] : statement.match(/body \|\| '((?:[^']|'')*)' WHERE/)![1];
      return quoted.replace(/''/g, "'");
    });
    expect(JSON.parse(pieces.join(""))).toEqual(long.body);
  });

  it("writes NULL for a missing topic", () => {
    const sentence = approvedFixture().find((item) => item.kind === "sentence")!;
    expect(upsertSql(sentence, 1)).toContain("'A1', NULL, 0, '");
  });

  it("chunks statements at 100 per file and bumps the version in a last file of its own", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    const [word] = approvedFixture();
    const upserts = Array.from({ length: 230 }, (_, i) => ({ ...word, id: `word:w-${i}` }) as ContentItem);
    const files = buildSqlFiles({ upserts, tombstones: ["word:gone-n"] }, 5, 1000, countsByKind(upserts));
    expect(files).toHaveLength(4);
    const statementCounts = files.map((sql) => sql.trim().split("\n").length);
    expect(statementCounts).toEqual([100, 100, 31, 1]);
    expect(files[2]).toContain("UPDATE content_items SET deleted = 1, updated_version = 5 WHERE id = 'word:gone-n';");
    expect(files[3]).toBe(
      "INSERT INTO content_meta (id, version, published_at, counts) VALUES (1, 5, 1000, " +
        `'{"word":230,"grammar":0,"sentence":0,"writing":0,"placement":0,"forms":0,"set":0}') ` +
        "ON CONFLICT(id) DO UPDATE SET version = excluded.version, published_at = excluded.published_at, counts = excluded.counts;\n",
    );
  });

  it("still bumps the version when only tombstones change", () => {
    const files = buildSqlFiles({ upserts: [], tombstones: ["word:a-n"] }, 2, 1, {});
    expect(files).toHaveLength(2);
    expect(files[1]).toMatch(/^INSERT INTO content_meta/);
  });
});

describe("stableStringify", () => {
  it("sorts keys at every depth and drops undefined", () => {
    expect(stableStringify({ b: 1, a: { d: [2, { f: 1, e: 0 }], c: undefined } })).toBe('{"a":{"d":[2,{"e":0,"f":1}]},"b":1}');
  });
});

describe("vocabulary sets (feature 012)", () => {
  const setFixture = (kind: string): SourceFile => ({
    file: `${kind}/set-fx-office.json`,
    data: JSON.parse(readFileSync(path.join(FIXTURES, kind, "set-fx-office.json"), "utf8")),
  });
  const withSet = (edit: (files: SourceFile[]) => void = () => {}) => {
    const files = [...fixtureFiles(), ...["word", "sentence", "set"].map(setFixture)];
    edit(files);
    return collectApproved(files);
  };
  const setDraft = (files: SourceFile[], id: string) => {
    for (const file of files) {
      if (!Array.isArray(file.data)) continue;
      file.data = (file.data as { id: string }[]).map((item) => (item.id === id ? { ...item, status: "draft" } : item));
    }
  };

  it("builds one row per set with its words in order and every example embedded", () => {
    const collected = withSet();
    const { items, sets, held } = rowItemsOf(collected.items, collected.setScoped);
    expect(held).toEqual([]);
    expect(sets).toHaveLength(1);
    expect(sets[0].body.words.map((word) => word.id)).toEqual(["word:deadline-n", "word:book-n", "word:invoice-n"]);
    expect(sets[0].body.sentences.map((sentence) => sentence.id).sort()).toEqual(["sentence:fx-book-n", "sentence:fx-deadline-n", "sentence:fx-invoice-n"]);
    expect(contentItemSchema.safeParse(sets[0]).success).toBe(true);
    expect(items.filter((item) => item.kind === "set")).toEqual(sets);
  });

  it("never turns a set file's words and sentences into rows of their own", () => {
    const collected = withSet();
    const ids = rowItemsOf(collected.items, collected.setScoped).items.map((item) => item.id);
    expect(ids).not.toContain("word:deadline-n");
    expect(ids).not.toContain("sentence:fx-invoice-n");
    expect(ids).toContain("word:book-n");
    expect(countsByKind(rowItemsOf(collected.items, collected.setScoped).items).set).toBe(1);
  });

  it("holds a set back while one of its words or examples is a draft (AC-017)", () => {
    for (const id of ["word:invoice-n", "sentence:fx-deadline-n", "set:fx-office"]) {
      const collected = withSet((files) => setDraft(files, id));
      const { items, held } = rowItemsOf(collected.items, collected.setScoped);
      expect(items.some((item) => item.kind === "set")).toBe(false);
      if (id !== "set:fx-office") expect(held[0]).toContain(id);
    }
  });

  it("keeps specialized words out of the placement test", () => {
    const collected = withSet();
    const rows = rowItemsOf(collected.items, collected.setScoped).items.filter((item) => item.kind !== "set");
    const prompts = generatePlacement(rows).map((item) => item.body.prompt);
    expect(prompts).not.toContain("deadline");
  });
});
