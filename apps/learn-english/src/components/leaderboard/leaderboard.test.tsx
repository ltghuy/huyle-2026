import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDate } from "@/learning/attendance";
import { BOARD_NAME_ERRORS, type BoardRow } from "@/learning/leaderboard";
import type { LeaderboardState, Profile } from "@/learning/types";
import { LEADERBOARD_URL } from "@/lib/leaderboard-client";
import { addAttendance } from "@/storage/attendance";
import { closeBroadcast } from "@/storage/broadcast";
import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
import { render } from "@/test-utils/render";
import { BoardAfterLesson } from "./board-after-lesson";
import { LeaderboardSetting } from "./leaderboard-setting";
import { StreakBoard } from "./streak-board";

// Feature 007 in the browser: consent once, the board after a lesson, Settings.

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const JOINED: Extract<LeaderboardState, { status: "joined" }> = {
  status: "joined",
  id: "00000000-0000-4000-8000-000000000001",
  token: "a".repeat(43),
  name: "Minh Anh",
};
const row = (position: number, name: string, streak: number, me = false): BoardRow => ({ position, name, streak, earned: streak * 20, me });
const fetchMock = vi.fn<(input: RequestInfo | URL, init?: RequestInit) => Promise<Response>>();

async function profileWith(extra: Partial<Profile>) {
  await saveProfile({ ...createDefaultProfile(Date.now()), displayName: "Minh Anh", placement: "skipped", tourSeen: true, ...extra });
}

function sent(): { method: string; body: Record<string, unknown> }[] {
  return fetchMock.mock.calls.map(([, init]) => ({ method: init?.method ?? "GET", body: JSON.parse(String(init?.body ?? "{}")) }));
}

beforeEach(async () => {
  await resetStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  // Today's lesson was just awarded: a 1-day streak with 20 points, nothing before it.
  await addAttendance({ date: localDate(Date.now()), points: 20, bonus: 0, at: Date.now() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  closeBroadcast();
});

describe("after the daily lesson", () => {
  it("asks once, with the name prefilled, and declining sends nothing (AC-007, AC-008)", async () => {
    await profileWith({});
    render(<BoardAfterLesson />);
    expect(await screen.findByRole("dialog", { name: "Tham gia bảng xếp hạng?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Tên hiện trên bảng")).toHaveValue("Minh Anh");

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Không, cảm ơn" })));
    await waitFor(async () => expect((await getProfile())?.leaderboard).toEqual({ status: "declined" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("checks the name before joining (AC-012)", async () => {
    await profileWith({});
    render(<BoardAfterLesson />);
    fireEvent.change(await screen.findByLabelText("Tên hiện trên bảng"), { target: { value: "Đéo biết" } });
    fireEvent.click(screen.getByRole("button", { name: "Tham gia" }));
    expect(await screen.findByText(BOARD_NAME_ERRORS.blocked)).toBeInTheDocument();
    expect((await getProfile())?.leaderboard).toBeUndefined();
  });

  it("joins under the chosen nickname, sends the streak and shows the board (AC-001, 013 AC-010)", async () => {
    await profileWith({});
    fetchMock.mockResolvedValue(Response.json({ rank: 1, previousRank: 2, total: 2, rows: [row(1, "Gấu", 10, true), row(2, "Lan", 5)] }));
    render(<BoardAfterLesson />);
    fireEvent.change(await screen.findByLabelText("Tên hiện trên bảng"), { target: { value: "  Gấu " } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Tham gia" })));

    expect(await screen.findByRole("dialog", { name: "Bảng xếp hạng chuỗi ngày học" })).toBeInTheDocument();
    expect(screen.getByText("Bạn lên hạng 1, vượt qua 1 bạn!")).toBeInTheDocument();
    const [request] = sent();
    expect(request.method).toBe("POST");
    const today = localDate(Date.now());
    expect(request.body).toMatchObject({ name: "Gấu", today, lastDate: today, streak: 1, earned: 20, previousStreak: 0, previousEarned: 0 });
    expect(fetchMock.mock.calls[0][0]).toBe(LEADERBOARD_URL);
    expect((await getProfile())?.leaderboard).toMatchObject({ status: "joined", name: "Gấu" });
  });

  it("shows the board straight away for a learner already on it, without asking (AC-002, AC-003)", async () => {
    await profileWith({ leaderboard: JOINED });
    fetchMock.mockResolvedValue(Response.json({ rank: 3, previousRank: 3, total: 9, rows: [row(2, "Lan", 30), row(3, "Minh Anh", 10, true), row(4, "Tú", 5)] }));
    render(<BoardAfterLesson />);
    expect(await screen.findByText("Bạn đang hạng 3 trong 9 bạn. Học đều mỗi ngày để lên hạng nhé!")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Tham gia bảng xếp hạng?" })).not.toBeInTheDocument();
    expect(screen.getByText("Minh Anh").closest("li")).toHaveAttribute("aria-current", "true");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("says the ranking couldn't load when the board is unreachable (AC-006)", async () => {
    await profileWith({ leaderboard: JOINED });
    fetchMock.mockRejectedValue(new TypeError("offline"));
    render(<BoardAfterLesson />);
    expect(await screen.findByText(/Chưa tải được bảng xếp hạng/)).toBeInTheDocument();
  });

  it("does nothing for a learner who declined", async () => {
    await profileWith({ leaderboard: { status: "declined" } });
    render(<BoardAfterLesson />);
    await act(async () => {});
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("Settings (AC-009, AC-010)", () => {
  it("leaves the board: deletes the entry, then saves the choice", async () => {
    await profileWith({ leaderboard: JOINED });
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }));
    render(<LeaderboardSetting />);
    const toggle = await screen.findByRole("switch", { name: "Hiện tôi trên bảng xếp hạng" });
    await waitFor(() => expect(toggle).toBeChecked());
    await act(async () => fireEvent.click(toggle));

    await waitFor(async () => expect((await getProfile())?.leaderboard).toEqual({ status: "declined" }));
    expect(sent()).toEqual([{ method: "DELETE", body: { id: JOINED.id, token: JOINED.token } }]);
  });

  it("stays on the board when the server refuses to delete", async () => {
    await profileWith({ leaderboard: JOINED });
    fetchMock.mockResolvedValue(Response.json({ error: { message: "x" } }, { status: 503 }));
    render(<LeaderboardSetting />);
    const toggle = await screen.findByRole("switch", { name: "Hiện tôi trên bảng xếp hạng" });
    await waitFor(() => expect(toggle).toBeChecked());
    await act(async () => fireEvent.click(toggle));
    expect((await getProfile())?.leaderboard).toEqual(JOINED);
  });

  it("renames on the board with the current streak", async () => {
    await profileWith({ leaderboard: JOINED });
    fetchMock.mockResolvedValue(Response.json({ rank: 1, previousRank: 1, total: 1, rows: [] }));
    render(<LeaderboardSetting />);
    const field = await screen.findByLabelText("Tên hiện trên bảng");
    fireEvent.change(field, { target: { value: "Gấu" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Lưu tên" })));

    await waitFor(async () => expect((await getProfile())?.leaderboard).toMatchObject({ name: "Gấu" }));
    expect(sent()[0].body).toMatchObject({ name: "Gấu", streak: 1, earned: 20, previousStreak: 1, previousEarned: 20 });
  });
});

describe("StreakBoard (007 AC-002, AC-004; 013 AC-010, AC-012)", () => {
  // 7th on a 3-day streak before, 5th on 9 days now: the 6th and 7th were overtaken.
  const result = {
    rank: 5,
    previousRank: 7,
    total: 9,
    previous: { streak: 3, earned: 60 },
    rows: [row(4, "Lan", 10), row(5, "Minh Anh", 9, true), row(6, "Tú", 6), row(7, "Bảo", 4), row(8, "Vy", 2)],
  };
  const meRow = () => screen.getByText("Minh Anh").closest("li")!;

  it("starts the learner two places lower and slides them up", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    render(<StreakBoard result={result} />);
    expect(meRow().style.transform).toBe("translateY(8rem)");
    expect(meRow()).toHaveTextContent("7");
    expect(screen.getByText("Tú").closest("li")!.style.transform).toBe("translateY(-4rem)");
    await waitFor(() => expect(meRow().style.transform).toBe(""));
    expect(meRow()).toHaveTextContent("5");
    expect(screen.getByText("Bạn lên hạng 5, vượt qua 2 bạn!")).toBeInTheDocument();
    expect(screen.getByText("Tú").closest("li")).toHaveTextContent("6 ngày");
  });

  it("shows the final board at once with reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(<StreakBoard result={result} />);
    expect(meRow().style.transform).toBe("");
    expect(meRow()).toHaveTextContent("5");
  });
});
