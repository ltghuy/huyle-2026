import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { sentence, word } from "@/learning/exercises/fixtures";
import { buildContentIndex } from "@/lib/session/content-index";
import { getCard, putCards } from "@/storage/cards";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { VocabularyBrowser } from "./vocabulary-browser";

vi.mock("next/navigation", () => import("@/components/library/test-navigation"));

const AUDIO = "a".repeat(64);
const items = [
  { ...word("mother", { ipa: "ˈmʌðər", meaningsVi: ["mẹ", "người mẹ"], examples: ["sentence:mother-1"], audio: AUDIO }), topic: "people-family" },
  { ...word("father", { meaningsVi: ["bố"] }), topic: "people-family" },
  { ...word("kitchen", { meaningsVi: ["nhà bếp"] }), topic: "home" },
  { ...word("travel", { meaningsVi: ["du lịch"] }, "A2"), topic: "travel-transport" },
  { ...sentence("mother-1", { tokens: ["My", "mother", "cooks"], vi: "Mẹ tôi nấu ăn.", audio: "b".repeat(64) }) },
];
const index = buildContentIndex(items);

vi.mock("@/hooks/use-content-index", () => ({
  useContentIndex: (levels: string[] | null) =>
    levels ? { status: "ready", index, version: 1, stale: false, retry: () => {} } : { status: "loading", retry: () => {} },
}));

function visit(search: string) {
  window.history.replaceState(null, "", `/vocabulary${search}`);
  render(<VocabularyBrowser />);
}

describe("VocabularyBrowser", () => {
  beforeEach(async () => {
    await resetStorage();
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
});
