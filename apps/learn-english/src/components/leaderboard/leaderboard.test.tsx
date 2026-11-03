import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { localDate } from "@/learning/attendance";
import type { BoardRow } from "@/learning/leaderboard";
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
import { StreakTopTen } from "./streak-top-ten";

// Feature 007 in the browser: consent once, the board after a lesson, Settings.

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
// A signed-in learner whose Google name is "Huy Le" (feature 022).
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ status: "signed-in", account: { userId: "u1", name: "Huy Le", email: "huy@example.com", image: null }, session: undefined }),
  canUseLockedAreas: () => true,
}));

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
  it("asks once, naming the learner as they'll appear, and declining sends nothing (AC-007, AC-008)", async () => {
    await profileWith({});
    render(<BoardAfterLesson />);
    const dialog = await screen.findByRole("dialog", { name: "Tham gia bảng xếp hạng?" });
    expect(dialog).toHaveTextContent("Bạn sẽ hiện với tên Minh Anh");

    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Không, cảm ơn" })));
    await waitFor(async () => expect((await getProfile())?.leaderboard).toEqual({ status: "declined" }));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("shows a learner without a chosen name under their Google name (022)", async () => {
    await profileWith({ displayName: undefined });
    render(<BoardAfterLesson />);
    expect(await screen.findByRole("dialog", { name: "Tham gia bảng xếp hạng?" })).toHaveTextContent("Bạn sẽ hiện với tên Huy Le");
  });

  it("joins under the chosen nickname, sends the streak and shows the board (AC-001, 013 AC-010)", async () => {
    await profileWith({ displayName: "Gấu" });
    fetchMock.mockResolvedValue(Response.json({ rank: 1, previousRank: 2, total: 2, rows: [row(1, "Gấu", 10, true), row(2, "Lan", 5)] }));
    render(<BoardAfterLesson />);
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Tham gia" })));

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

  it("says which name the board shows, with no separate board name (022)", async () => {
    await profileWith({ leaderboard: JOINED, displayName: undefined });
    render(<LeaderboardSetting />);
    expect(await screen.findByText(/Bạn hiện trên bảng với tên Huy Le/)).toBeInTheDocument();
    expect(screen.queryByLabelText("Tên hiện trên bảng")).not.toBeInTheDocument();
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

describe("StreakTopTen (017)", () => {
  const top = (rows: BoardRow[], me?: BoardRow, total = rows.length) => Response.json({ total, rows, ...(me ? { me } : {}) });

  it("shows the top 10 and a join link to a learner not on the board, sending no id (AC-001, AC-003, AC-007)", async () => {
    await profileWith({});
    fetchMock.mockResolvedValue(top([row(1, "Gấu", 30), row(2, "Lan", 12)], undefined, 7));
    render(<StreakTopTen />);
    const list = await screen.findByRole("list", { name: "Top 10 chuỗi ngày học" });
    expect(list).toHaveTextContent("🥇1Gấu30 ngày");
    expect(screen.getByText("7 bạn trên bảng xếp hạng, xếp theo số ngày học liên tiếp.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tham gia bảng xếp hạng" })).toHaveAttribute("href", "/settings#bang-xep-hang");
    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^\/api\/leaderboard\?today=\d{4}-\d{2}-\d{2}$/);
    expect(init?.headers).toBeUndefined();
  });

  it("marks the learner in the top 10, or adds their place below it (AC-004, AC-005)", async () => {
    await profileWith({ leaderboard: JOINED });
    fetchMock.mockResolvedValueOnce(top([row(1, "Minh Anh", 9, true)], row(1, "Minh Anh", 9, true)));
    const { unmount } = render(<StreakTopTen />);
    const list = await screen.findByRole("list", { name: "Top 10 chuỗi ngày học" });
    expect(list.querySelector('[aria-current="true"]')).toHaveTextContent("Minh Anh(bạn)");
    expect(screen.queryByText("Vị trí của bạn")).not.toBeInTheDocument();
    expect(fetchMock.mock.calls[0][1]?.headers).toEqual({ "x-board-id": JOINED.id });
    unmount();

    fetchMock.mockResolvedValueOnce(top([row(1, "Gấu", 30)], row(12, "Minh Anh", 2, true), 20));
    render(<StreakTopTen />);
    expect(await screen.findByText("Vị trí của bạn")).toBeInTheDocument();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("says a joined learner with a broken streak is off the board (AC-006)", async () => {
    await profileWith({ leaderboard: JOINED });
    fetchMock.mockResolvedValue(top([]));
    render(<StreakTopTen />);
    expect(await screen.findByText("Bảng xếp hạng đang trống")).toBeInTheDocument();
    expect(screen.getByText("Chuỗi của bạn đang bị gián đoạn")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Học bài hôm nay" })).toHaveAttribute("href", "/");
  });

  it("offers a retry when the board can't be reached", async () => {
    await profileWith({});
    fetchMock.mockRejectedValue(new TypeError("offline"));
    render(<StreakTopTen />);
    expect(await screen.findByText("Không kết nối được bảng xếp hạng. Bạn kiểm tra mạng nhé.", {}, { timeout: 4000 })).toBeInTheDocument();
    fetchMock.mockResolvedValue(top([row(1, "Gấu", 30)]));
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("list", { name: "Top 10 chuỗi ngày học" })).toBeInTheDocument();
  });
});
