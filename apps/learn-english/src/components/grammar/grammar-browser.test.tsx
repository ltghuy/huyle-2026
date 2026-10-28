import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { grammar, sentence } from "@/learning/exercises/fixtures";
import { buildContentIndex } from "@/lib/session/content-index";
import { getAllAttempts } from "@/storage/attempts";
import { getCard } from "@/storage/cards";
import { resetStorage } from "@/storage/test-utils";
import { GrammarBrowser } from "./grammar-browser";

vi.mock("next/navigation", () => import("@/components/library/test-navigation"));

const base = grammar("present-simple", [
  { prompt: "They ___ students.", options: ["am", "is", "are", "be"], answer: "are", explanationVi: "Chủ ngữ số nhiều dùng are." },
  { prompt: "I ___ a teacher.", options: ["am", "is", "are", "be"], answer: "am", explanationVi: "Chủ ngữ I dùng am." },
]);
const presentSimple = {
  ...base,
  body: {
    ...base.body,
    titleEn: "Present Simple",
    titleVi: "Thì hiện tại đơn",
    ruleVi: "Dùng để nói về thói quen và sự thật.",
    pattern: [
      { form: "affirmative" as const, en: "S + V(s/es)" },
      { form: "negative" as const, en: "S + do/does not + V" },
      { form: "question" as const, en: "Do/Does + S + V?" },
    ],
    usageVi: ["Thói quen hằng ngày"],
    signalWords: ["always", "every day"],
    mistakes: [{ wrong: "She go to school.", right: "She goes to school.", explanationVi: "Ngôi thứ ba số ít thêm -es." }],
    examples: ["sentence:ps-1"],
  },
};
const example = sentence("ps-1", { tokens: ["I", "drink", "tea"], vi: "Tôi uống trà.", audio: "c".repeat(64) });
const pastSimple = { ...grammar("past-simple", [{ prompt: "She ___ home.", options: ["go", "went", "gone", "goes"], answer: "went", explanationVi: "x" }]), level: "A2" as const };
const index = buildContentIndex([presentSimple, example, pastSimple]);

vi.mock("@/hooks/use-content-index", () => ({
  useContentIndex: (levels: string[] | null) =>
    levels ? { status: "ready", index, version: 1, stale: false, retry: () => {} } : { status: "loading", retry: () => {} },
}));

function visit(search: string) {
  window.history.replaceState(null, "", `/grammar${search}`);
  render(<GrammarBrowser />);
}

async function answer(text: string) {
  const option = screen.getAllByRole("radio").find((radio) => radio.textContent?.includes(text));
  fireEvent.click(option!);
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "Kiểm tra" })));
  fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
}

describe("GrammarBrowser", () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it("links tenses built on verb forms to the irregular verbs section (008 AC-012)", async () => {
    visit("?topic=past-simple");
    const link = await screen.findByRole("link", { name: /Thì này dùng dạng quá khứ \(V2\)/ });
    expect(link).toHaveAttribute("href", "/irregular-verbs");
  });

  it("shows no verb forms link on other topics", async () => {
    visit("?topic=present-simple");
    await screen.findByRole("heading", { name: "Present Simple" });
    expect(screen.queryByRole("link", { name: /Động từ bất quy tắc/ })).not.toBeInTheDocument();
  });

  it("lists topics by level, published ones as links and the rest as coming soon (AC-023)", async () => {
    visit("");
    const a1 = await screen.findByRole("region", { name: "Trình độ A1" });
    expect(within(a1).getByRole("link", { name: /Present Simple/ })).toHaveAttribute("href", "/grammar?topic=present-simple");
    expect(within(a1).getAllByText("Sắp có").length).toBeGreaterThan(0);
    expect(screen.getByRole("region", { name: "Trình độ C1" })).toBeInTheDocument();
  });

  it("shows every part of a topic and creates its card after practice (AC-024, AC-025, AC-013)", async () => {
    visit("?topic=present-simple");

    expect(await screen.findByRole("heading", { name: "Present Simple" })).toHaveAttribute("lang", "en");
    expect(screen.getByText("Thì hiện tại đơn")).toBeInTheDocument();
    expect(screen.getByText("Dùng để nói về thói quen và sự thật.")).toBeInTheDocument();
    expect(screen.getByText("Khẳng định")).toBeInTheDocument();
    expect(screen.getByText("S + do/does not + V")).toBeInTheDocument();
    expect(screen.getByText("Nghi vấn")).toBeInTheDocument();
    expect(screen.getByText("Thói quen hằng ngày")).toBeInTheDocument();
    expect(screen.getByText("every day")).toBeInTheDocument();
    expect(screen.getByText("She go to school.")).toBeInTheDocument();
    expect(screen.getByText("She goes to school.")).toBeInTheDocument();
    expect(screen.getByText("Ngôi thứ ba số ít thêm -es.")).toBeInTheDocument();
    expect(screen.getByText("I drink tea")).toBeInTheDocument();
    expect(screen.getByText("Tôi uống trà.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nghe: I drink tea" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Luyện tập" }));
    expect(screen.getByRole("region", { name: "Luyện tập: Thì hiện tại đơn" })).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();

    // One step per practice item, in content order.
    await answer("are");
    await answer("is");

    // The wrong one comes back until it is right (feature 006); only the first try is saved.
    fireEvent.click(await screen.findByRole("button", { name: "Làm lại câu sai" }));
    await answer("am");

    expect(await screen.findByText("Hoàn thành bài tập")).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByText(/sửa đúng cả 1 câu sai/)).toBeInTheDocument();
    await vi.waitFor(async () => expect(await getCard("grammar:present-simple")).toBeDefined());
    await vi.waitFor(async () => expect(await getAllAttempts()).toHaveLength(2));
    const attempts = await getAllAttempts();
    expect(attempts.every((attempt) => attempt.context === "exercise" && attempt.itemId === "grammar:present-simple")).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Về bài học/ }));
    expect(await screen.findByText("Đã học")).toBeInTheDocument();
  });
});
