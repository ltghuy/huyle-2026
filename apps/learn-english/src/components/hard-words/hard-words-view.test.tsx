import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { addAttempt } from "@/storage/attempts";
import { makeAttempt, resetStorage } from "@/storage/test-utils";
import { HardWordsView } from "./hard-words-view";

vi.mock("@/hooks/use-content-index", async () => {
  const { buildContentIndex } = await import("@/lib/session/content-index");
  const { word } = await import("@/learning/exercises/fixtures");
  const index = buildContentIndex([
    word("apple", { meaningsVi: ["quả táo"] }),
    word("house", { meaningsVi: ["ngôi nhà"] }),
    word("cat", { meaningsVi: ["con mèo"] }),
    word("table", { meaningsVi: ["cái bàn"] }),
    word("dog", { meaningsVi: ["con chó"] }),
  ]);
  return {
    levelsFor: () => ["A1", "A2"],
    useContentIndex: () => ({ status: "ready", index, version: 1, stale: false, retry: () => {} }),
  };
});

async function seedAttempts(itemId: string, results: { correct: boolean; ms: number }[]) {
  for (const [i, result] of results.entries()) {
    await addAttempt(makeAttempt(`${itemId}-${i}`, itemId, 1000 + i, result));
  }
}

const right = (ms = 2000) => ({ correct: true, ms });
const wrong = (ms = 2000) => ({ correct: false, ms });

describe("HardWordsView", () => {
  beforeEach(resetStorage);

  it("lists hard words hardest first with their reason and stat, hiding words missing from content", async () => {
    await seedAttempts("word:apple", [wrong(), right(), wrong(), right(), wrong(), right(), wrong(), right()]);
    await seedAttempts("word:house", [right(9000), right(9000), right(9000), right(9000), right(9000)]);
    await seedAttempts("word:cat", [right(), right(), right(), right()]);
    await seedAttempts("word:ghost", [wrong(), wrong(), wrong()]);

    render(<HardWordsView />);
    const list = await screen.findByRole("list", { name: "Danh sách từ khó" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);

    expect(items[0]).toHaveTextContent("apple");
    expect(items[0]).toHaveTextContent("quả táo");
    expect(items[0]).toHaveTextContent("Hay sai");
    expect(items[0]).toHaveTextContent("Sai 4/8 lần gần nhất");

    expect(items[1]).toHaveTextContent("house");
    expect(items[1]).toHaveTextContent("Nhớ chậm");
    expect(items[1]).toHaveTextContent("Trung bình 9 giây mỗi lần gần đây");
  });

  it("practises only the hard words in a full-screen session", async () => {
    await seedAttempts("word:apple", [wrong(), wrong(), wrong()]);
    await seedAttempts("word:house", [wrong(), wrong(), wrong()]);
    await seedAttempts("word:cat", [right(), right(), right(), right()]);

    render(<HardWordsView />);
    fireEvent.click(await screen.findByRole("button", { name: "Luyện các từ này" }));

    const dialog = await screen.findByRole("dialog", { name: "Luyện từ khó" });
    expect(dialog).toHaveClass("fixed", "inset-0");
    expect(within(dialog).getByText("1/2")).toBeInTheDocument();
  });

  it("shows an encouraging empty state when there are no hard words", async () => {
    await seedAttempts("word:cat", [right(), right(), right(), right()]);
    render(<HardWordsView />);
    expect(await screen.findByText("Chưa có từ khó nào")).toBeInTheDocument();
  });
});
