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
import { WeeklyBoard } from "./weekly-board";

// Feature 007 in the browser: consent once, the board after a lesson, Settings.

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const JOINED: Extract<LeaderboardState, { status: "joined" }> = {
  status: "joined",
  id: "00000000-0000-4000-8000-000000000001",
  token: "a".repeat(43),
  name: "Minh Anh",
};
const row = (position: number, name: string, points: number, me = false): BoardRow => ({ position, name, points, me });
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
  // Today's lesson was just awarded: 10 points this week, 0 before it.
  await addAttendance({ date: localDate(Date.now()), points: 10, bonus: 0, at: Date.now() });
});

afterEach(() => {
  vi.unstubAllGlobals();
  closeBroadcast();
});

describe("after the daily lesson", () => {
  it("asks once, with the name prefilled, and declining sends nothing (AC-007, AC-008)", async () => {
    await profileWith({});
    render(<BoardAfterLesson />);
    expect(await screen.findByRole("dialog", { name: "Tham gia bảng xếp hạng tuần?" })).toBeInTheDocument();
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

  it("joins under the chosen nickname, sends this week's points and shows the board (AC-001)", async () => {
    await profileWith({});
    fetchMock.mockResolvedValue(Response.json({ rank: 1, previousRank: 2, total: 2, rows: [row(1, "Gấu", 10, true), row(2, "Lan", 5)] }));
    render(<BoardAfterLesson />);
    fireEvent.change(await screen.findByLabelText("Tên hiện trên bảng"), { target: { value: "  Gấu " } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Tham gia" })));

    expect(await screen.findByRole("dialog", { name: "Bảng xếp hạng tuần này" })).toBeInTheDocument();
    expect(screen.getByText("Bạn lên hạng 1, vượt qua 1 bạn!")).toBeInTheDocument();
    const [request] = sent();
    expect(request.method).toBe("POST");
    expect(request.body).toMatchObject({ name: "Gấu", points: 10, previousPoints: 0, week: expect.stringMatching(/^\d{4}-W\d{2}$/) });
    expect(fetchMock.mock.calls[0][0]).toBe(LEADERBOARD_URL);
    expect((await getProfile())?.leaderboard).toMatchObject({ status: "joined", name: "Gấu" });
  });

  it("shows the board straight away for a learner already on it, without asking (AC-002, AC-003)", async () => {
    await profileWith({ leaderboard: JOINED });
    fetchMock.mockResolvedValue(Response.json({ rank: 3, previousRank: 3, total: 9, rows: [row(2, "Lan", 30), row(3, "Minh Anh", 10, true), row(4, "Tú", 5)] }));
    render(<BoardAfterLesson />);
    expect(await screen.findByText("Bạn đang hạng 3 trong 9 bạn. Học tiếp để lên hạng nhé!")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Tham gia bảng xếp hạng tuần?" })).not.toBeInTheDocument();
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
    const toggle = await screen.findByRole("switch", { name: "Hiện tôi trên bảng xếp hạng tuần" });
    await waitFor(() => expect(toggle).toBeChecked());
    await act(async () => fireEvent.click(toggle));

    await waitFor(async () => expect((await getProfile())?.leaderboard).toEqual({ status: "declined" }));
    expect(sent()).toEqual([{ method: "DELETE", body: { id: JOINED.id, token: JOINED.token } }]);
  });

  it("stays on the board when the server refuses to delete", async () => {
    await profileWith({ leaderboard: JOINED });
    fetchMock.mockResolvedValue(Response.json({ error: { message: "x" } }, { status: 503 }));
    render(<LeaderboardSetting />);
    const toggle = await screen.findByRole("switch", { name: "Hiện tôi trên bảng xếp hạng tuần" });
    await waitFor(() => expect(toggle).toBeChecked());
    await act(async () => fireEvent.click(toggle));
    expect((await getProfile())?.leaderboard).toEqual(JOINED);
  });

  it("renames on the board with this week's points", async () => {
    await profileWith({ leaderboard: JOINED });
    fetchMock.mockResolvedValue(Response.json({ rank: 1, previousRank: 1, total: 1, rows: [] }));
    render(<LeaderboardSetting />);
    const field = await screen.findByLabelText("Tên hiện trên bảng");
    fireEvent.change(field, { target: { value: "Gấu" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Lưu tên" })));

    await waitFor(async () => expect((await getProfile())?.leaderboard).toMatchObject({ name: "Gấu" }));
    expect(sent()[0].body).toMatchObject({ name: "Gấu", points: 10, previousPoints: 10 });
  });
});

describe("WeeklyBoard (AC-002, AC-004)", () => {
  // 7th with 20 points before, 5th with 45 now: the 6th and 7th were overtaken.
  const result = {
    rank: 5,
    previousRank: 7,
    total: 9,
    previousPoints: 20,
    rows: [row(4, "Lan", 50), row(5, "Minh Anh", 45, true), row(6, "Tú", 40), row(7, "Bảo", 30), row(8, "Vy", 10)],
  };
  const meRow = () => screen.getByText("Minh Anh").closest("li")!;

  it("starts the learner two places lower and slides them up", async () => {
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
    render(<WeeklyBoard result={result} />);
    expect(meRow().style.transform).toBe("translateY(8rem)");
    expect(meRow()).toHaveTextContent("7");
    expect(screen.getByText("Tú").closest("li")!.style.transform).toBe("translateY(-4rem)");
    await waitFor(() => expect(meRow().style.transform).toBe(""));
    expect(meRow()).toHaveTextContent("5");
    expect(screen.getByText("Bạn lên hạng 5, vượt qua 2 bạn!")).toBeInTheDocument();
  });

  it("shows the final board at once with reduced motion", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true }));
    render(<WeeklyBoard result={result} />);
    expect(meRow().style.transform).toBe("");
    expect(meRow()).toHaveTextContent("5");
  });
});
