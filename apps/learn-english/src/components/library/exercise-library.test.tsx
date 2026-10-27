import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { grammar, sentence, word } from "@/learning/exercises/fixtures";
import { buildContentIndex } from "@/lib/session/content-index";
import { getAllAttempts } from "@/storage/attempts";
import { getCard } from "@/storage/cards";
import { resetStorage } from "@/storage/test-utils";
import { buildSetSteps, hashString, listSetCards } from "./exercise-sets";
import { ExerciseLibrary } from "./exercise-library";

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
  { ...sentence("home-1", { tokens: ["The", "kitchen", "is", "big"], gapCandidates: [1] }), topic: "home" },
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
    expect(cards.map((card) => card.key)).toEqual(["word.people-family", "word.home", "grammar.to-be", "sentence.home"]);
    // No wrong variants → no "choose the correct sentence"; no other topics → still enough tile distractors.
    expect(cards[3].sets.map((set) => set.type)).toEqual(["word-order", "sentence-gap", "tile-translate"]);
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

  it("narrows the list with the topic and type filters (AC-026)", async () => {
    visit("?level=A1");
    expect(await screen.findByRole("region", { name: "Từ vựng" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Ngữ pháp" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Mẫu câu" })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(4 + 4 + 1 + 3);

    act(() => window.history.replaceState(null, "", "/exercises?level=A1&topic=home"));
    expect(screen.queryByRole("region", { name: "Ngữ pháp" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(4 + 3);

    act(() => window.history.replaceState(null, "", "/exercises?level=A1&type=grammar-gap"));
    expect(screen.getAllByRole("button", { name: /^Bắt đầu/ })).toHaveLength(1);

    act(() => window.history.replaceState(null, "", "/exercises?level=A1&topic=home&type=grammar-gap"));
    expect(screen.getByText("Không có bài tập nào khớp bộ lọc")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Bỏ lọc" }));
    expect(window.location.search).toBe("?level=A1");
  });

  it("runs a set, shows the score and records each answer (AC-029)", async () => {
    visit("?level=A1");
    fireEvent.click(await screen.findByRole("button", { name: "Bắt đầu Điền vào chỗ trống: The verb to be" }));
    expect(window.location.search).toBe("?level=A1&id=grammar-gap.to-be");

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
});
