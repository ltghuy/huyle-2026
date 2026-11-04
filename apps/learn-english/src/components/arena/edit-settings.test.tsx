import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { queryOptions } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { POOL } from "@/learning/arena/fixtures";
import { EditSettings } from "./edit-settings";

// A1 has everything; B1 has words without clips and few sentences, so only "Nhớ từ" runs there.
vi.mock("@/content/queries", () => ({
  contentQuery: (kind: string, level: string) =>
    queryOptions({
      queryKey: ["content-test", kind, level],
      queryFn: async () => {
        const items = kind === "word" ? POOL.words : POOL.sentences;
        if (level !== "B1") return { items, version: 1, stale: false };
        return { items: kind === "word" ? POOL.words.map((w) => ({ ...w, body: { ...w.body, audio: "" } })) : items.slice(0, 3), version: 1, stale: false };
      },
    }),
}));

const CURRENT = { mode: "mixed", level: "A1", rounds: 3 } as const;

async function openDialog() {
  fireEvent.click(screen.getByRole("button", { name: /Đổi cài đặt/ }));
  const dialog = await screen.findByRole("dialog", { name: "Đổi cài đặt" });
  await waitFor(() => expect(within(dialog).getByRole("button", { name: "Lưu cài đặt" })).toBeEnabled());
  return dialog;
}

describe("EditSettings (AC-031)", () => {
  it("starts from the room's settings and sends the new ones", async () => {
    const onSave = vi.fn();
    render(<EditSettings settings={CURRENT} onSave={onSave} />);
    const dialog = await openDialog();
    expect(within(dialog).getByLabelText(/Hỗn hợp/)).toBeChecked();
    expect(within(dialog).getByRole("button", { name: /3 hiệp/ })).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(within(dialog).getByRole("button", { name: "B1" }));
    fireEvent.click(within(dialog).getByRole("button", { name: /1 hiệp/ }));
    await waitFor(() => expect(within(dialog).getByLabelText(/Nhớ từ/)).toBeChecked());
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu cài đặt" }));
    expect(onSave).toHaveBeenCalledWith({ mode: "recall", level: "B1", rounds: 1 });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("sends nothing when the settings didn't change", async () => {
    const onSave = vi.fn();
    render(<EditSettings settings={CURRENT} onSave={onSave} />);
    const dialog = await openDialog();
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu cài đặt" }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
