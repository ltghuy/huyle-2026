import { fireEvent, screen } from "@testing-library/react";
import { queryOptions } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { POOL } from "@/learning/arena/fixtures";
import type { TeamSettings } from "@/learning/arena/team-protocol";
import { TeamEditSettings } from "./team-edit-settings";
import { teamSettingsLine } from "./team-settings-fields";

vi.mock("@/content/queries", () => ({
  contentQuery: (kind: string, level: string) =>
    queryOptions({
      queryKey: ["content-test", kind, level],
      queryFn: async () => ({ items: kind === "word" ? POOL.words : POOL.sentences, version: 1, stale: false }),
    }),
}));

const SETTINGS: TeamSettings = { mode: "mixed", level: "A2", rounds: 3, seconds: 15, size: 6, minutes: 10 };

describe("teamSettingsLine (AC-007)", () => {
  it("reads mode, level, round length, question time and rounds", () => {
    expect(teamSettingsLine(SETTINGS)).toBe("Hỗn hợp · A2 · 10 phút/hiệp · 15 giây/câu · 3 hiệp");
    expect(teamSettingsLine({ ...SETTINGS, mode: "recall", level: "B1", rounds: 1, seconds: 45, minutes: 5 })).toBe("Nhớ từ · B1 · 5 phút/hiệp · 45 giây/câu · 1 hiệp");
  });
});

describe("TeamEditSettings (AC-049, AC-050)", () => {
  async function openDialog(onSave = vi.fn(), minSize = 4) {
    render(<TeamEditSettings settings={SETTINGS} minSize={minSize} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Đổi cài đặt" }));
    await screen.findByRole("dialog", { name: "Đổi cài đặt" });
    return onSave;
  }

  it("starts from the room's settings and saves a new round length", async () => {
    const onSave = await openDialog();
    expect(screen.getByRole("radio", { name: "10 phút" })).toBeChecked();
    fireEvent.click(screen.getByRole("radio", { name: "15 phút" }));
    const save = await screen.findByRole("button", { name: "Lưu cài đặt" });
    fireEvent.click(save);
    expect(onSave).toHaveBeenCalledWith({ ...SETTINGS, minutes: 15 });
  });

  it("can't lower the size below the players present", async () => {
    const onSave = await openDialog(vi.fn(), 5);
    const less = screen.getByRole("button", { name: "Bớt một người" });
    fireEvent.click(less);
    expect(screen.getByRole("group", { name: "Số người" })).toHaveTextContent("5 người");
    expect(less).toBeDisabled();
    fireEvent.click(await screen.findByRole("button", { name: "Lưu cài đặt" }));
    expect(onSave).toHaveBeenCalledWith({ ...SETTINGS, size: 5 });
  });

  it("sends nothing when nothing changed", async () => {
    const onSave = await openDialog();
    fireEvent.click(await screen.findByRole("button", { name: "Lưu cài đặt" }));
    expect(onSave).not.toHaveBeenCalled();
  });
});
