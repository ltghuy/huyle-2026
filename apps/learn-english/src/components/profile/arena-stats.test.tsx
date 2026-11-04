import { fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { ArenaStats } from "./arena-stats";

function stubStats(response: () => Response) {
  const fetch = vi.fn(async () => response());
  vi.stubGlobal("fetch", fetch);
  return fetch;
}

afterEach(() => vi.unstubAllGlobals());

describe("ArenaStats (AC-030)", () => {
  it("shows wins, losses and the runs of wins", async () => {
    stubStats(() => Response.json({ wins: 12, losses: 5, streak: 2, bestStreak: 4 }));
    render(<ArenaStats />);
    const value = (label: string) => screen.getByText(label).nextElementSibling?.textContent;
    expect(await screen.findByText("Thắng")).toBeInTheDocument();
    expect(value("Thắng")).toBe("12");
    expect(value("Thua")).toBe("5");
    expect(value("Chuỗi thắng hiện tại")).toBe("2");
    expect(value("Chuỗi thắng dài nhất")).toBe("4");
  });

  it("invites the learner to the Arena before their first duel", async () => {
    stubStats(() => Response.json({ wins: 0, losses: 0, streak: 0, bestStreak: 0 }));
    render(<ArenaStats />);
    expect(await screen.findByText(/Bạn chưa đấu trận nào/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Vào Đấu trường/ })).toHaveAttribute("href", "/arena");
  });

  it("says when the record can't load, and tries again", async () => {
    const fetch = stubStats(() => Response.json({ error: { message: "Đấu trường đang tạm nghỉ" } }, { status: 503 }));
    render(<ArenaStats />);
    expect(await screen.findByText("Chưa tải được thành tích Đấu trường.")).toBeInTheDocument();
    const calls = fetch.mock.calls.length;
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await vi.waitFor(() => expect(fetch.mock.calls.length).toBeGreaterThan(calls));
  });
});
