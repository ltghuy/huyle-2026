import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { grammar, sentence, word } from "@/learning/exercises/fixtures";
import { buildContentIndex } from "@/lib/session/content-index";
import { getAllAttempts } from "@/storage/attempts";
import { getCard } from "@/storage/cards";
import { resetStorage } from "@/storage/test-utils";
import { addAiKey, AI_KEYS_KEY, resetAiKeysForTest } from "@/lib/ai-keys";
import { buildSetSteps, hashString, listSetCards, SET_SIZE, TYPE_LABELS } from "./exercise-sets";
import { ExerciseLibrary } from "./exercise-library";

// Signed in unless a test says otherwise (feature 022).
const account = vi.hoisted(() => ({ status: "signed-in" as "signed-in" | "guest" }));
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ status: account.status, account: null, session: undefined }),
  canUseLockedAreas: (status: string) => status === "signed-in" || status === "expired",
}));
vi.mock("next/navigation", () => import("@/components/library/test-navigation"));

const toBe = grammar("to-be", [
  { prompt: "They ___ students.", options: ["am", "is", "are", "be"], answer: "are", explanationVi: "Chủ ngữ số nhiều dùng are." },
]);
const items = [
  { ...word("mother", { meaningsVi: ["mẹ"] }), topic: "people-family" },
  { ...word("father", { meaningsVi: ["bố"] }), topic: "people-family" },
  { ...word("kitchen", { meaningsVi: ["nhà bếp"] }), topic: "home" },
  { ...word("table", { meaningsVi: ["cái bàn"] }), topic: "home" },
  { ...toBe, body: { ...toBe.body, titleEn: "The verb to be", titleVi: "Động từ to be" } },
  // With a clip, so it makes a Nghe chép set too (feature 040).
  { ...sentence("home-1", { tokens: ["The", "kitchen", "is", "big"], gapCandidates: [1], audio: "a".repeat(64) }), topic: "home" },
];
const index = buildContentIndex(items);

vi.mock("@/hooks/use-content-index", () => ({
  useContentIndex: (levels: string[] | null) =>
    levels ? { status: "ready", index, version: 1, stale: false, retry: () => {} } : { status: "loading", retry: () => {} },
}));

function visit(search: string) {
  window.history.replaceState(null, "", `/exercises${search}`);
  render(<ExerciseLibrary />);
}

describe("exercise sets", () => {
  it("builds sets per topic and type, skipping sentence types the content can't support", () => {
    const cards = listSetCards(index, "A1");
    expect(cards.map((card) => card.key)).toEqual(["word.people-family", "word.home", "grammar.to-be", "word.sentences", "sentence.home", "dictation.home"]);
    // Every sentence, per type but Dịch câu and Nghe chép, in Từ vựng (018 AC-005, 040 AC-004). No wrong variants → no "choose the correct sentence".
    expect(cards[3]).toMatchObject({ group: "word", scope: "khac", title: "Chủ đề khác", count: 1 });
    expect(cards[3].sets.map((set) => set.id)).toEqual(["word-order.A1.khac", "sentence-gap.A1.khac"]);
    expect(cards[4].sets).toMatchObject([{ id: "translate.A1.home", type: "translate", group: "sentence", itemIds: ["sentence:home-1"] }]);
    expect(TYPE_LABELS.translate).toBe("Dịch câu");
  });

  it("gives Chủ đề khác every word type too, over the level's words its sentences use (quick 045)", () => {
    const used = (slug: string, wordIds: string[]) => sentence(slug, { tokens: ["My", "mother", "is", "kind."], wordIds });
    const local = buildContentIndex([...items, used("family-1", ["word:mother", "word:kitchen"]), used("family-2", ["word:mother", "word:missing"])]);
    const card = listSetCards(local, "A1").find((c) => c.key === "word.sentences")!;
    expect(card).toMatchObject({ count: 3, wordCount: 2 });
    expect(card.sets.slice(0, 4).map((set) => [set.id, set.itemIds])).toEqual([
      ["mcq.A1.khac", ["word:mother", "word:kitchen"]],
      ["missing-letters.A1.khac", ["word:mother", "word:kitchen"]],
      ["listening.A1.khac", ["word:mother", "word:kitchen"]],
      ["recall.A1.khac", ["word:mother", "word:kitchen"]],
    ]);
    expect(card.sets[4].type).toBe("word-order");
    expect(buildSetSteps(card.sets[3], local, 0)).toHaveLength(2);
  });

  it("groups Viết câu by the topic of a sentence's first word that has one (018 AC-002)", () => {
    const plain = (slug: string, wordIds: string[]) => sentence(slug, { tokens: ["My", "mother", "is", "kind."], wordIds });
    const local = buildContentIndex([
      ...items,
      plain("family-1", ["word:missing", "word:mother"]),
      plain("family-2", ["word:father"]),
      plain("loose-1", ["word:missing"]),
    ]);
    const cards = listSetCards(local, "A1").filter((card) => card.group === "sentence");
    // A sentence with no topic goes to Chủ đề khác, last.
    expect(cards.map((card) => [card.scope, card.sets[0].itemIds])).toEqual([
      ["people-family", ["sentence:family-1", "sentence:family-2"]],
      ["home", ["sentence:home-1"]],
      ["khac", ["sentence:loose-1"]],
    ]);
    expect(cards.at(-1)!.title).toBe("Chủ đề khác");
    expect(listSetCards(local, "A1").find((card) => card.key === "word.sentences")!.count).toBe(4);
  });

  it("runs up to 10 Dịch câu steps from one topic, new ones each round (018 AC-003, AC-004)", () => {
    const ADJECTIVES = ["big", "small", "clean", "warm", "cold", "bright", "dark", "new", "old", "quiet", "busy", "nice", "tidy", "modern"];
    const many = ADJECTIVES.map((adjective, i) => ({ ...sentence(`home-${i + 10}`, { tokens: ["The", "kitchen", "is", "very", `${adjective}.`] }), topic: "home" }));
    const local = buildContentIndex([...items, ...many]);
    const set = listSetCards(local, "A1").find((card) => card.key === "sentence.home")!.sets[0];
    const idsOf = (round: number) => buildSetSteps(set, local, round).map((step) => (step.type === "exercise" && step.instance.kind === "translate" ? step.instance.sentenceId : ""));
    expect(idsOf(3)).toHaveLength(SET_SIZE);
    expect(new Set(idsOf(3)).size).toBe(SET_SIZE);
    expect(idsOf(3)).not.toContain("");
    expect(idsOf(4)).not.toEqual(idsOf(3));
  });

  it("groups Nghe chép by topic, over sentences with audio only, and leaves it out of Từ vựng (010 AC-011, 040 AC-002, AC-004)", () => {
    const heard = (slug: string, wordIds: string[], audio = "") => sentence(slug, { tokens: ["My", "mother", "is", "kind."], wordIds, audio });
    const local = buildContentIndex([
      ...items,
      heard("family-1", ["word:mother"], "b".repeat(64)),
      heard("family-2", ["word:father"]),
      heard("loose-1", ["word:missing"], "c".repeat(64)),
    ]);
    const cards = listSetCards(local, "A1");
    const dictation = cards.filter((card) => card.group === "dictation");
    // family-2 has no clip, so it can't make a dictation step; a sentence with no topic goes to Chủ đề khác, last.
    expect(dictation.map((card) => [card.title, card.count, card.sets.map((set) => [set.id, set.type, set.itemIds])])).toEqual([
      ["Con người & gia đình", 1, [["dictation.A1.people-family", "dictation", ["sentence:family-1"]]]],
      ["Nhà cửa", 1, [["dictation.A1.home", "dictation", ["sentence:home-1"]]]],
      ["Chủ đề khác", 1, [["dictation.A1.khac", "dictation", ["sentence:loose-1"]]]],
    ]);
    expect(cards.find((card) => card.key === "word.sentences")!.sets.some((set) => set.type === "dictation")).toBe(false);
    expect(TYPE_LABELS.dictation).toBe("Nghe chép");
  });

  it("runs up to 10 Nghe chép steps from one topic, new ones each round (040 AC-003)", () => {
    const ADJECTIVES = ["big", "small", "clean", "warm", "cold", "bright", "dark", "new", "old", "quiet", "busy", "nice", "tidy", "modern"];
    const many = ADJECTIVES.map((adjective, i) => ({
      ...sentence(`home-${i + 10}`, { tokens: ["The", "kitchen", "is", "very", `${adjective}.`], audio: String(i % 10).repeat(64) }),
      topic: "home",
    }));
    const local = buildContentIndex([...items, ...many]);
    const set = listSetCards(local, "A1").find((card) => card.key === "dictation.home")!.sets[0];
    const idsOf = (round: number) => buildSetSteps(set, local, round).map((step) => (step.type === "exercise" && step.instance.kind === "dictation" ? step.instance.sentenceId : ""));
    expect(idsOf(3)).toHaveLength(SET_SIZE);
    expect(new Set(idsOf(3)).size).toBe(SET_SIZE);
    expect(idsOf(3)).not.toContain("");
    expect(idsOf(4)).not.toEqual(idsOf(3));
  });

  it("lists Tìm lỗi sai for sentences with a usable wrong version (011 AC-009)", () => {
    const findable = sentence("home-3", {
      tokens: ["She", "has", "the", "ability", "to", "learn", "languages", "fast."],
      wrongVariants: [{ en: "She has the ability to learning languages fast.", explanationVi: "Sau to dùng động từ nguyên mẫu." }],
    });
    const local = buildContentIndex([...items, { ...findable, topic: "home" }]);
    const card = listSetCards(local, "A1").find((c) => c.key === "word.sentences")!;
    expect(card.sets.find((set) => set.type === "find-error")).toMatchObject({ id: "find-error.A1.khac", itemIds: ["sentence:home-3"] });
    expect(TYPE_LABELS["find-error"]).toBe("Tìm lỗi sai");
  });

  it("is deterministic per set and round", () => {
    const set = listSetCards(index, "A1")[0].sets[0];
    const keys = (round: number) => buildSetSteps(set, index, round).map((step) => (step.type === "exercise" ? JSON.stringify(step.instance) : ""));
    expect(keys(0)).toEqual(keys(0));
    expect(hashString("mcq.A1.home")).toBe(hashString("mcq.A1.home"));
  });
});

describe("ExerciseLibrary", () => {
  beforeEach(async () => {
    await resetStorage();
  });

  afterEach(() => vi.restoreAllMocks());

  it("splits the sets into Từ vựng, Ngữ pháp, Viết câu and Nghe chép tabs (quick 036, 018 AC-001, 040 AC-001)", async () => {
    visit("?level=A1");
    const tabs = await screen.findByRole("tablist", { name: "Nhóm bài tập" });
    expect(within(tabs).getByRole("tab", { name: /Từ vựng/ })).toHaveTextContent("10");
    expect(within(tabs).getByRole("tab", { name: /Ngữ pháp/ })).toHaveTextContent("1");
    expect(within(tabs).getByRole("tab", { name: /Viết câu/ })).toHaveTextContent("1");
    expect(within(tabs).getByRole("tab", { name: /Nghe chép/ })).toHaveTextContent("1");
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent?.replace(/\d+(Hot)*$/, "").trim())).toEqual(["Từ vựng", "Ngữ pháp", "Viết câu", "Nghe chép"]);
    // Viết câu and Nghe chép are marked hot (quick 069).
    expect(within(tabs).getAllByRole("tab").map((tab) => tab.textContent?.includes("Hot"))).toEqual([false, false, true, true]);
    expect(within(tabs).getByRole("tab", { name: /Từ vựng/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(10);
    expect(screen.getByRole("button", { name: "Bắt đầu Sắp xếp câu: Chủ đề khác" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bắt đầu Dịch câu: Chủ đề khác" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bắt đầu Nghe chép: Chủ đề khác" })).not.toBeInTheDocument();

    fireEvent.click(within(tabs).getByRole("tab", { name: /Ngữ pháp/ }));
    expect(window.location.search).toBe("?level=A1&tab=grammar");
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(1);
    // One grammar exercise type and no topics: neither filter is offered.
    expect(screen.queryByRole("combobox", { name: "Lọc theo chủ đề" })).not.toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Lọc theo dạng bài" })).not.toBeInTheDocument();

    fireEvent.click(within(tabs).getByRole("tab", { name: /Viết câu/ }));
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Bắt đầu Luyện viết: Nhà cửa" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Lọc theo chủ đề" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Lọc theo dạng bài" })).not.toBeInTheDocument();

    fireEvent.click(within(tabs).getByRole("tab", { name: /Nghe chép/ }));
    expect(window.location.search).toBe("?level=A1&tab=dictation");
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(1);
    expect(screen.getByRole("button", { name: "Bắt đầu Nghe chép: Nhà cửa" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Lọc theo chủ đề" })).toBeInTheDocument();
    expect(screen.queryByRole("combobox", { name: "Lọc theo dạng bài" })).not.toBeInTheDocument();
  });

  it("opens old per-type sentence links in their tab (018 AC-006)", async () => {
    visit("?level=A1&type=sentence-gap");
    expect(await screen.findByRole("tab", { name: /Từ vựng/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(1);
    cleanup();
    visit("?level=A1&type=translate");
    expect(await screen.findByRole("tab", { name: /Viết câu/ })).toHaveAttribute("aria-selected", "true");
    cleanup();
    visit("?id=word-order.A1.khac");
    expect(await screen.findByRole("region", { name: "Sắp xếp câu: Chủ đề khác" })).toBeInTheDocument();
  });

  it("opens dictation links in Nghe chép (040 AC-005)", async () => {
    visit("?level=A1&type=dictation");
    expect(await screen.findByRole("tab", { name: /Nghe chép/ })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("button", { name: "Bắt đầu Nghe chép: Nhà cửa" })).toBeInTheDocument();
    cleanup();
    visit("?id=dictation.A1.home");
    expect(await screen.findByRole("region", { name: "Nghe chép: Nhà cửa" })).toBeInTheDocument();
  });

  it("picks the tab from a type link, and narrows it with the topic and type filters (AC-026)", async () => {
    visit("?level=A1&type=grammar-gap");
    expect(await screen.findByRole("tab", { name: /Ngữ pháp/ })).toHaveAttribute("aria-selected", "true");

    act(() => window.history.replaceState(null, "", "/exercises?level=A1&topic=home"));
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(4);

    act(() => window.history.replaceState(null, "", "/exercises?level=A1&tab=sentence&topic=home"));
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(1);

    act(() => window.history.replaceState(null, "", "/exercises?level=A1&type=mcq"));
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(2);

    act(() => window.history.replaceState(null, "", "/exercises?level=A1&topic=people-family&type=mcq"));
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(1);
  });

  it("runs a set, shows the score and records each answer (AC-029)", async () => {
    visit("?level=A1&tab=grammar");
    fireEvent.click(await screen.findByRole("button", { name: "Bắt đầu Điền vào chỗ trống: The verb to be" }));
    expect(window.location.search).toBe("?level=A1&tab=grammar&id=grammar-gap.to-be");

    const run = screen.getByRole("region", { name: "Điền vào chỗ trống: The verb to be" });
    const option = within(run).getAllByRole("radio").find((radio) => radio.textContent?.includes("are"));
    fireEvent.click(option!);
    await act(async () => fireEvent.click(within(run).getByRole("button", { name: "Kiểm tra" })));
    fireEvent.click(within(run).getByRole("button", { name: "Tiếp tục" }));

    expect(await screen.findByText("Hoàn thành bài tập")).toBeInTheDocument();
    expect(screen.getByText("1/1")).toBeInTheDocument();
    await vi.waitFor(async () => expect(await getAllAttempts()).toHaveLength(1));
    const [attempt] = await getAllAttempts();
    expect(attempt).toMatchObject({ itemId: "grammar:to-be", correct: true, context: "exercise", exercise: "grammar-gap" });
    expect(await getCard("grammar:to-be")).toBeDefined();

    fireEvent.click(screen.getByRole("button", { name: /Làm lại/ }));
    expect(within(run).getByRole("button", { name: "Kiểm tra" })).toBeDisabled();
  });

  it("opens a shared set link on its own level", async () => {
    visit("?id=grammar-gap.to-be");
    expect(await screen.findByRole("region", { name: "Điền vào chỗ trống: The verb to be" })).toBeInTheDocument();
  });

  it("starts each open of a set on a random round, so the order changes", async () => {
    const set = listSetCards(index, "A1").find((card) => card.key === "word.home")!.sets.find((entry) => entry.type === "mcq")!;
    const shownFor = (round: number) => {
      const [step] = buildSetSteps(set, index, round);
      return step.type === "exercise" && step.instance.kind === "mcq" ? [step.instance.prompt, ...step.instance.options.map((option) => option.text)] : [];
    };
    const roundOf = (random: number) => 1 + Math.floor(random * 2 ** 20);
    const fixed = JSON.stringify(shownFor(0));
    const randoms = Array.from({ length: 50 }, (_, i) => i / 50).filter((random) => JSON.stringify(shownFor(roundOf(random))) !== fixed);
    const picked = randoms.filter((random) => JSON.stringify(shownFor(roundOf(random))) !== JSON.stringify(shownFor(roundOf(randoms[0])))).slice(0, 1);
    expect(picked).toHaveLength(1);

    for (const random of [randoms[0], picked[0]]) {
      vi.spyOn(Math, "random").mockReturnValue(random);
      visit(`?id=${set.id}`);
      const run = await screen.findByRole("region", { name: /^Trắc nghiệm nghĩa/ });
      const [prompt, ...options] = shownFor(roundOf(random));
      expect(within(run).getByText(prompt)).toBeInTheDocument();
      expect(within(run).getAllByRole("radio").map((radio) => radio.textContent)).toEqual(options.map((text, i) => `${i + 1}${text}`));
      cleanup();
      vi.restoreAllMocks();
    }
  });
});

describe("AI key notice in Viết câu (quick 070)", () => {
  beforeEach(() => {
    localStorage.removeItem(AI_KEYS_KEY);
    resetAiKeysForTest();
  });

  afterEach(() => {
    account.status = "signed-in";
  });

  const notice = () => screen.queryByRole("note", { name: "Gợi ý thêm khóa AI" });

  it("suggests adding a key in Viết câu only, linking to the AI card in Cài đặt, until one is added", async () => {
    visit("?level=A1&tab=sentence");
    await screen.findByRole("button", { name: "Bắt đầu Luyện viết: Nhà cửa" });
    expect(within(notice()!).getByRole("link", { name: "Thêm khóa AI" })).toHaveAttribute("href", "/settings#cham-bang-ai");
    act(() => {
      addAiKey("AIza-test-key");
    });
    expect(notice()).not.toBeInTheDocument();
    cleanup();
    localStorage.removeItem(AI_KEYS_KEY);
    resetAiKeysForTest();
    visit("?level=A1&tab=dictation");
    await screen.findByRole("button", { name: "Bắt đầu Nghe chép: Nhà cửa" });
    expect(notice()).not.toBeInTheDocument();
  });

  it("hides when dismissed, and shows again on coming back to the tab without a key", async () => {
    visit("?level=A1&tab=sentence");
    fireEvent.click(await screen.findByRole("button", { name: "Ẩn gợi ý" }));
    expect(notice()).not.toBeInTheDocument();
    const tabs = screen.getByRole("tablist", { name: "Nhóm bài tập" });
    fireEvent.click(within(tabs).getByRole("tab", { name: /Nghe chép/ }));
    fireEvent.click(within(tabs).getByRole("tab", { name: /Viết câu/ }));
    expect(notice()).toBeInTheDocument();
  });

  it("isn't shown to guests", async () => {
    account.status = "guest";
    visit("?level=A1&tab=sentence");
    await screen.findByRole("button", { name: "Bắt đầu Luyện viết: Nhà cửa" });
    expect(notice()).not.toBeInTheDocument();
  });
});

describe("ExerciseLibrary for guests (022 AC-009)", () => {
  afterEach(() => {
    account.status = "signed-in";
  });

  it("shows the sets, and asks to sign in instead of running one", async () => {
    account.status = "guest";
    visit("?level=A1&tab=grammar");
    fireEvent.click(await screen.findByRole("button", { name: "Bắt đầu Điền vào chỗ trống: The verb to be" }));
    expect(await screen.findByText("Đăng nhập để làm bài tập")).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Điền vào chỗ trống: The verb to be" })).not.toBeInTheDocument();
  });
});
