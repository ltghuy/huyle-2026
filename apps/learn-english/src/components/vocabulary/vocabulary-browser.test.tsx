import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { forms, sentence, vocabSet, word } from "@/learning/exercises/fixtures";
import { buildContentIndex } from "@/lib/session/content-index";
import { toast } from "sonner";
import { getCard, putCards } from "@/storage/cards";
import { getProfile } from "@/storage/meta";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { VocabularyBrowser } from "./vocabulary-browser";

vi.mock("next/navigation", () => import("@/components/library/test-navigation"));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const AUDIO = "a".repeat(64);
const items = [
  { ...word("mother", { ipa: "ˈmʌðər", meaningsVi: ["mẹ", "người mẹ"], examples: ["sentence:mother-1"], audio: AUDIO }), topic: "people-family" },
  { ...word("father", { meaningsVi: ["bố"] }), topic: "people-family" },
  { ...word("kitchen", { meaningsVi: ["nhà bếp"] }), topic: "home" },
  { ...word("travel", { meaningsVi: ["du lịch"] }, "A2"), topic: "travel-transport" },
  { ...sentence("mother-1", { tokens: ["My", "mother", "cooks"], vi: "Mẹ tôi nấu ăn.", audio: "b".repeat(64) }) },
  // B1 here only so the A1 and A2 lists other tests count stay the same.
  { ...word("go-v", { headword: "go", pos: "verb", meaningsVi: ["đi"] }, "B1"), topic: "travel-transport" },
  forms("go-v", ["went"], ["gone"], { wordId: "word:go-v" }, "B1"),
];
// A specialized word (feature 012): only inside its set, never in a level list.
const deploy = { ...word("deploy-v", { headword: "deploy", pos: "verb", meaningsVi: ["triển khai"], source: "specialized" }, "A2"), topic: "technology" };
const setBase = vocabSet("it", [deploy, items[0] as ReturnType<typeof word>]);
const itSet = { ...setBase, body: { ...setBase.body, titleVi: "Công nghệ thông tin", descriptionVi: "Từ vựng cho người làm IT." } };
const index = buildContentIndex([...items, itSet]);

vi.mock("@/hooks/use-content-index", () => ({
  useContentIndex: (levels: string[] | null) =>
    levels ? { status: "ready", index, version: 1, stale: false, retry: () => {} } : { status: "loading", retry: () => {} },
  levelsFor: () => ["A1", "A2"],
  fetchContentIndex: async () => ({ index, version: 1, stale: false }),
}));

let allWords: { status: string; words?: unknown[]; setsByWord?: Map<string, unknown[]> } = { status: "loading" };
const retryAllWords = vi.fn();
vi.mock("@/hooks/use-all-words", () => ({
  useAllWords: (enabled: boolean) => ({ ...(enabled ? allWords : { status: "idle" }), retry: retryAllWords }),
}));

function visit(search: string) {
  window.history.replaceState(null, "", `/vocabulary${search}`);
  render(<VocabularyBrowser />);
}

describe("VocabularyBrowser", () => {
  beforeEach(async () => {
    await resetStorage();
    allWords = { status: "ready", words: [...items.filter((item) => item.kind === "word"), deploy], setsByWord: new Map([[deploy.id, [itSet]]]) };
  });

  it("lists the level's words by topic with learned markers (AC-006)", async () => {
    await putCards([makeCard("word:father", Date.now())]);
    visit("?level=A1");

    const list = await screen.findByRole("region", { name: "Danh sách từ" });
    expect(within(list).getAllByRole("link")).toHaveLength(3);
    expect(within(list).queryByText("travel")).not.toBeInTheDocument();
    const father = within(list).getByRole("link", { name: /father/ });
    expect(await within(father).findByText("Đã học")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tất cả: đã học 1/3" })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(screen.getByRole("button", { name: "Nhà cửa: đã học 0/1" }));
    expect(within(screen.getByRole("region", { name: "Danh sách từ" })).getAllByRole("link")).toHaveLength(1);
    expect(window.location.search).toBe("?level=A1&topic=home");
  });

  it("shows an irregular verb's forms with a link to the section (008 AC-013)", async () => {
    visit("?level=B1&word=word%3Ago-v");
    const link = await screen.findByRole("link", { name: /go – went – gone/ });
    expect(link).toHaveAttribute("href", "/irregular-verbs?verb=go-v");
  });

  it("opens a word from a ?word= link with every field and marks it learned (AC-007, AC-009)", async () => {
    visit("?word=word%3Amother");

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("heading", { name: "mother" })).toHaveAttribute("lang", "en");
    expect(within(dialog).getByText("ˈmʌðər")).toHaveClass("ipa");
    expect(within(dialog).getByText("noun")).toBeInTheDocument();
    expect(within(dialog).getByText("mẹ")).toBeInTheDocument();
    expect(within(dialog).getByText("người mẹ")).toBeInTheDocument();
    expect(within(dialog).getByText("My mother cooks")).toBeInTheDocument();
    expect(within(dialog).getByText("Mẹ tôi nấu ăn.")).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Nghe: mother" })).toBeEnabled();
    expect(within(dialog).getByRole("button", { name: "Nghe: My mother cooks" })).toBeEnabled();

    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Đánh dấu đã học" })));
    expect(await getCard("word:mother")).toMatchObject({ itemId: "word:mother", reps: 0 });
    expect(await within(dialog).findByText("Từ này đã có trong lịch Ôn tập của bạn.")).toBeInTheDocument();
  });

  it("says so when a linked word doesn't exist", async () => {
    visit("?level=A1&word=word%3Agone");
    expect(await screen.findByText("Không tìm thấy từ này")).toBeInTheDocument();
  });

  describe("search (feature 002)", () => {
    function search(text: string) {
      const box = screen.getByRole("combobox", { name: "Tìm từ vựng ở mọi trình độ" });
      fireEvent.focus(box);
      // The combobox only opens for typed input, which carries an `inputType`.
      fireEvent.input(box, { target: { value: text }, inputType: "insertText" });
      return box;
    }

    it("suggests words from every level with level and meaning, and opens the chosen one (AC-001, AC-003, AC-004)", async () => {
      visit("?level=A1");
      await screen.findByRole("region", { name: "Danh sách từ" });

      search("TRA");
      const option = await screen.findByRole("option", { name: /travel/ });
      expect(within(option).getByText("A2")).toBeInTheDocument();
      expect(within(option).getByText(/du lịch/)).toHaveTextContent("noun · du lịch");
      expect(screen.getAllByRole("option")).toHaveLength(1);

      fireEvent.click(option);
      expect(window.location.search).toBe("?level=A1&word=word%3Atravel");
      expect(await screen.findByRole("dialog")).toBeInTheDocument();
    });

    it("finds a specialized word and shows its set in place of a level (012 AC-004, AC-005)", async () => {
      visit("?level=A1");
      await screen.findByRole("region", { name: "Danh sách từ" });

      search("deplo");
      const option = await screen.findByRole("option", { name: /deploy/ });
      expect(within(option).getByText("Công nghệ thông tin")).toBeInTheDocument();
      fireEvent.click(option);
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByText("Chuyên ngành: Công nghệ thông tin")).toBeInTheDocument();
    });

    it("opens the highlighted suggestion with Enter (AC-004)", async () => {
      visit("?level=A1");
      await screen.findByRole("region", { name: "Danh sách từ" });

      const box = search("kit");
      await screen.findByRole("option", { name: /kitchen/ });
      fireEvent.keyDown(box, { key: "Enter" });
      expect(window.location.search).toBe("?level=A1&word=word%3Akitchen");
    });

    it("says when nothing matches, and while the words are loading (AC-005, AC-006)", async () => {
      visit("?level=A1");
      await screen.findByRole("region", { name: "Danh sách từ" });

      search("zzz");
      expect(await screen.findByText("Không tìm thấy từ nào.")).toBeInTheDocument();

      allWords = { status: "loading" };
      search("mo");
      expect(await screen.findByText("Đang tải danh sách từ…")).toBeInTheDocument();
    });
  });

  describe("specialized vocabulary sets (feature 012)", () => {
    it("offers Chuyên ngành next to the levels and lists the sets with their progress (AC-001, AC-002)", async () => {
      await putCards([makeCard("word:mother", Date.now())]);
      visit("?level=A1");
      await screen.findByRole("region", { name: "Danh sách từ" });

      fireEvent.click(screen.getByRole("tab", { name: "Chuyên ngành" }));
      expect(window.location.search).toBe("?level=A1&view=sets");
      const card = await screen.findByRole("link", { name: /Công nghệ thông tin/ });
      expect(within(card).getByText("Từ vựng cho người làm IT.")).toBeInTheDocument();
      expect(within(card).getByText("2 từ")).toBeInTheDocument();
      expect(await within(card).findByText("1/2")).toBeInTheDocument();
      expect(card).toHaveAttribute("href", "/vocabulary?level=A1&set=it");
    });

    it("shows a set's words with their level or set name, and its progress (AC-003, AC-004, AC-014)", async () => {
      visit("?set=it");
      expect(await screen.findByRole("heading", { name: "Công nghệ thông tin" })).toBeInTheDocument();
      expect(screen.getByRole("tab", { name: "Chuyên ngành" })).toHaveAttribute("aria-selected", "true");
      expect(screen.getByRole("progressbar", { name: "Đã học 0/2 từ bộ Công nghệ thông tin" })).toBeInTheDocument();
      const list = screen.getByRole("region", { name: "Danh sách từ" });
      expect(within(within(list).getByRole("link", { name: /deploy/ })).getByText("Công nghệ thông tin")).toBeInTheDocument();
      const mother = within(list).getByRole("link", { name: /mother/ });
      expect(within(mother).getByText("A1")).toBeInTheDocument();
      expect(mother).toHaveAttribute("href", "/vocabulary?set=it&word=word%3Amother");
    });

    it("follows and stops following a set, saying so (AC-007, AC-010)", async () => {
      visit("?set=it");
      await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Học bộ này" })));
      expect((await getProfile())?.vocabSet).toBe("set:it");
      await waitFor(() => expect(toast.success).toHaveBeenCalledWith(expect.stringContaining("Bạn đang học bộ “Công nghệ thông tin”")));

      await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Ngừng học bộ này" })));
      expect((await getProfile())?.vocabSet).toBeUndefined();
      await waitFor(() => expect(toast.success).toHaveBeenLastCalledWith(expect.stringContaining("Đã ngừng học bộ “Công nghệ thông tin”")));
      expect(await screen.findByRole("button", { name: "Học bộ này" })).toBeInTheDocument();
    });

    it("says so when the set in the link doesn't exist", async () => {
      visit("?set=gone");
      expect(await screen.findByText("Không tìm thấy bộ từ này")).toBeInTheDocument();
    });
  });
});
