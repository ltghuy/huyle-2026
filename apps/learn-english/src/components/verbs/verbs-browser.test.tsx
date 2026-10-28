import { act, fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forms, word } from "@/learning/exercises/fixtures";
import { verbEntries } from "@/learning/verbs";
import { resetStorage } from "@/storage/test-utils";
import { render } from "@/test-utils/render";
import { VerbsBrowser } from "./verbs-browser";

vi.mock("next/navigation", () => import("@/components/library/test-navigation"));

const words = [
  word("go-v", { headword: "go", pos: "verb", meaningsVi: ["đi"] }),
  word("cut-v", { headword: "cut", pos: "verb", meaningsVi: ["cắt"] }),
  word("get-v", { headword: "get", pos: "verb", meaningsVi: ["nhận được"] }),
  word("lie-v", { headword: "lie", pos: "verb", meaningsVi: ["nằm"] }, "A2"),
];
const items = [
  forms("go-v", ["went"], ["gone"], { wordId: "word:go-v", audio: "a".repeat(64) }),
  forms("cut-v", ["cut"], ["cut"], { wordId: "word:cut-v" }),
  {
    ...forms("get-v", ["got"], ["gotten", "got"], { wordId: "word:get-v" }),
    body: {
      ...forms("get-v", ["got"], ["gotten"]).body,
      wordId: "word:get-v",
      participle: [
        { text: "gotten", ipa: "/ˈɡɑtn/", region: "us" as const },
        { text: "got", ipa: "/ɡɑt/", region: "uk" as const },
      ],
    },
  },
  forms("lie-v", ["lay"], ["lain"], { wordId: "word:lie-v", noteVi: "Với nghĩa \"nói dối\": lie → lied → lied." }, "A2"),
];
let state: { status: string; verbs?: unknown[] } = { status: "ready", verbs: verbEntries(items, words) };
vi.mock("@/hooks/use-verbs", () => ({ useVerbs: () => ({ ...state, retry: () => {} }) }));

function visit(search = "") {
  window.history.replaceState(null, "", `/irregular-verbs${search}`);
  render(<VerbsBrowser />);
}

const cards = () => within(screen.getByRole("list", { name: "Danh sách động từ" })).getAllByRole("listitem");
const names = () => cards().map((card) => card.textContent?.split(" – ")[0]);

beforeEach(async () => {
  await resetStorage();
  state = { status: "ready", verbs: verbEntries(items, words) };
});

describe("VerbsBrowser", () => {
  it("lists every verb with its three forms, meaning and level (AC-001, AC-002)", () => {
    visit();
    expect(names()).toEqual(["cut", "get", "go", "lie"]);
    expect(cards()[1]).toHaveTextContent("get – got – gotten / got");
    expect(screen.getByRole("status")).toHaveTextContent("4 động từ");
    // The table for wide screens has the same rows.
    expect(screen.getAllByRole("row")).toHaveLength(5);
  });

  it("filters by pattern, and keeps it in the address (AC-004)", () => {
    visit();
    fireEvent.click(screen.getByRole("button", { name: "A – A – A, ví dụ cut – cut – cut" }));
    expect(names()).toEqual(["cut"]);
    expect(window.location.search).toBe("?pattern=AAA");
    expect(screen.getByText(/Cả ba dạng giống nhau/)).toBeInTheDocument();
  });

  it("filters by level and searches forms and meanings without accents (AC-005)", () => {
    visit("?level=A2");
    expect(names()).toEqual(["lie"]);
    fireEvent.click(screen.getByRole("tab", { name: "Tất cả" }));
    const search = screen.getByRole("searchbox", { name: "Tìm động từ" });
    fireEvent.change(search, { target: { value: "wen" } });
    expect(names()).toEqual(["go"]);
    fireEvent.change(search, { target: { value: "di" } });
    expect(names()).toEqual(["go"]);
    fireEvent.change(search, { target: { value: "zzz" } });
    expect(screen.getByText("Không tìm thấy động từ nào")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Luyện tập/ })).toBeDisabled();
  });

  it("opens a verb from a ?verb= link with its forms, regions, note and examples (AC-006)", () => {
    visit("?verb=get-v");
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("get – got – gotten")).toBeInTheDocument();
    expect(within(dialog).getByText("(chỉ Mỹ)")).toBeInTheDocument();
    expect(within(dialog).getByText("(chỉ Anh)")).toBeInTheDocument();
    expect(within(dialog).getByText("/ˈɡɑtn/")).toBeInTheDocument();
    expect(within(dialog).getByText("Hôm qua cô ấy về nhà.")).toBeInTheDocument();
    expect(within(dialog).getByRole("link", { name: "Xem từ trong Từ vựng" })).toHaveAttribute("href", "/vocabulary?word=word%3Aget-v");
  });

  it("opens a verb from the list and shows its note", () => {
    visit();
    fireEvent.click(within(cards()[3]).getByRole("button"));
    expect(window.location.search).toBe("?verb=lie-v");
    expect(within(screen.getByRole("dialog")).getByText(/nói dối/)).toBeInTheDocument();
  });

  it("practises the verbs shown, in focus mode (AC-007)", async () => {
    visit("?level=A2");
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Luyện tập/ })));
    const run = screen.getByRole("region", { name: "Động từ bất quy tắc: A2" });
    expect(within(run).getByText("1/1")).toBeInTheDocument();
  });

  it("says the section is being written when nothing is published yet", () => {
    state = { status: "ready", verbs: [] };
    visit();
    expect(screen.getByText("Phần này đang được biên soạn")).toBeInTheDocument();
  });
});
