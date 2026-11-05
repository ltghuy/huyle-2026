import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import type { ArenaMatch, ArenaMatchesResponse } from "@/server/arena/arena.schema";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
import ArenaHistoryPage from "@/app/(app)/arena/history/page";
import ArenaPage from "@/app/(app)/arena/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  usePathname: () => "/arena/history",
  useSearchParams: () => new URLSearchParams(),
}));

const NOW = Date.now();

const WON: ArenaMatch = {
  id: "m2",
  endedAt: NOW,
  won: true,
  forfeit: false,
  score: { mine: 2, theirs: 1 },
  opponent: { name: "Lan", image: null },
  settings: { mode: "mixed", level: "A2", rounds: 3 },
  rounds: [
    { round: 1, mine: 5, theirs: 3, won: true, suddenDeath: false, onTime: false },
    { round: 2, mine: 2, theirs: 5, won: false, suddenDeath: false, onTime: false },
    { round: 3, mine: 7, theirs: 6, won: true, suddenDeath: true, onTime: false },
  ],
};
const LOST_BY_FORFEIT: ArenaMatch = { ...WON, id: "m1", endedAt: NOW - 60_000, won: false, forfeit: true, score: { mine: 0, theirs: 0 }, opponent: { name: "Khoa", image: null }, rounds: [] };
const DELETED: ArenaMatch = { ...WON, id: "m0", endedAt: NOW - 120_000, forfeit: true, opponent: null, settings: { mode: "listen", level: "A1", rounds: 1 }, score: { mine: 1, theirs: 0 }, rounds: [{ round: 1, mine: 6, theirs: 6, won: true, suddenDeath: true, onTime: true }] };

let history: () => Response;
let signedIn = true;

function stubFetch() {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/auth/get-session") return Response.json(signedIn ? { user: { id: "minh", name: "Minh Anh", email: "m@example.com" }, session: {} } : null);
      if (url === "/api/arena/matches") return history();
      return new Response("{}", { status: 503 });
    }),
  );
}

const respond = (body: ArenaMatchesResponse) => () => Response.json(body);
const STATS = { wins: 12, losses: 5, streak: 2, bestStreak: 4 };

beforeEach(async () => {
  signedIn = true;
  history = respond({ stats: STATS, matches: [WON, LOST_BY_FORFEIT, DELETED] });
  stubFetch();
  await resetStorage();
  await saveProfile({ ...createDefaultProfile(0, () => "device-a"), displayName: "Minh", level: "A1", placement: "skipped" });
});
afterEach(() => vi.unstubAllGlobals());

describe("Lịch sử đấu page (feature 025)", () => {
  it("lists the matches newest first with result, score, opponent, settings and time (AC-003, AC-004)", async () => {
    render(<ArenaHistoryPage />);
    const list = await screen.findByRole("list", { name: "Các trận gần đây" });
    const rows = within(list).getAllByRole("button");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveAccessibleName(/^Thắng 2–1 với Lan, \d\d:\d\d hôm nay$/);
    expect(within(rows[0]).getByText("Lan")).toBeInTheDocument();
    expect(within(rows[0]).getByText(/Hỗn hợp · A2 · 3 hiệp · \d\d:\d\d hôm nay/)).toBeInTheDocument();
    expect(within(rows[1]).getByText("Thua")).toBeInTheDocument();
    expect(within(rows[1]).getByText("Bạn rời trận")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Người chơi đã xóa tài khoản")).toBeInTheDocument();
    expect(within(rows[2]).getByText("Đối thủ rời trận")).toBeInTheDocument();
    expect(screen.getByText("12 thắng · 5 thua · 3 trận gần nhất")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Đấu trường/ })).toHaveAttribute("href", "/arena");
  });

  it("opens a match to show each round, then closes back to the list (AC-014, AC-016)", async () => {
    render(<ArenaHistoryPage />);
    const list = await screen.findByRole("list", { name: "Các trận gần đây" });
    const row = within(list).getAllByRole("button")[0];
    fireEvent.click(row);
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Thắng 2–1")).toBeInTheDocument();
    const rounds = within(within(dialog).getByRole("list", { name: "Điểm từng hiệp" })).getAllByRole("listitem");
    expect(rounds.map((r) => r.textContent)).toEqual([
      "Hiệp 15–3Bạn thắng",
      "Hiệp 22–5Lan thắng",
      "Hiệp 37–6Bạn thắng · Phân thắng bại ở câu quyết định",
    ]);
    fireEvent.click(within(dialog).getByRole("button", { name: /close|đóng/i }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("list", { name: "Các trận gần đây" })).toBeInTheDocument();
  });

  it("shows a forfeit with no finished round, and a round won on time (AC-014, AC-015)", async () => {
    render(<ArenaHistoryPage />);
    const rows = within(await screen.findByRole("list", { name: "Các trận gần đây" })).getAllByRole("button");
    fireEvent.click(rows[1]);
    let dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Bạn rời trận trước khi xong hiệp nào.")).toBeInTheDocument();
    expect(within(dialog).queryByText(/trận kết thúc trước khi đấu hết/)).not.toBeInTheDocument();
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(rows[2]);
    dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Hòa điểm, phân thắng bại nhờ trả lời nhanh hơn/)).toBeInTheDocument();
    expect(within(dialog).getByText("Đối thủ rời trận: trận kết thúc trước khi đấu hết các hiệp.")).toBeInTheDocument();
  });

  it("invites a learner with no saved matches to play (AC-006)", async () => {
    history = respond({ stats: { wins: 0, losses: 0, streak: 0, bestStreak: 0 }, matches: [] });
    render(<ArenaHistoryPage />);
    expect(await screen.findByText(/Bạn chưa đấu trận nào/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Đấu 1-1 ngay/ })).toHaveAttribute("href", "/arena/1v1");
  });

  it("says the history starts now for a learner whose matches predate it", async () => {
    history = respond({ stats: STATS, matches: [] });
    render(<ArenaHistoryPage />);
    expect(await screen.findByText("Các trận bạn đấu từ bây giờ sẽ được lưu ở đây.")).toBeInTheDocument();
  });

  it("shows the error with Thử lại, and loads on retry (AC-008)", async () => {
    history = () => Response.json({ error: { message: "Đấu trường đang tạm nghỉ, bạn thử lại sau nhé." } }, { status: 503 });
    render(<ArenaHistoryPage />);
    expect(await screen.findByText("Đấu trường đang tạm nghỉ, bạn thử lại sau nhé.", {}, { timeout: 5_000 })).toBeInTheDocument();
    history = respond({ stats: STATS, matches: [WON] });
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("list", { name: "Các trận gần đây" })).toBeInTheDocument();
  });

  it("asks a guest to sign in (AC-007)", async () => {
    signedIn = false;
    render(<ArenaHistoryPage />);
    expect(await screen.findByText("Đăng nhập để vào Đấu trường")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Các trận gần đây" })).not.toBeInTheDocument();
  });
});

describe("Lịch sử đấu card on the hub (feature 025)", () => {
  const card = () => screen.getByRole("link", { name: "Lịch sử đấu" });

  it("shows the record and the latest match, and links to the history (AC-009, AC-010)", async () => {
    render(<ArenaPage />);
    expect(await screen.findByText("12 thắng · 5 thua")).toBeInTheDocument();
    expect(card()).toHaveAttribute("href", "/arena/history");
    expect(card()).toHaveAccessibleDescription(/Trận gần nhất: Thắng 2–1 · Lan · \d\d:\d\d hôm nay/);
  });

  it("invites a guest to sign in (AC-011)", async () => {
    signedIn = false;
    render(<ArenaPage />);
    await waitFor(() => expect(card()).toHaveAccessibleDescription("Đăng nhập để lưu lại các trận đã đấu: tỉ số, đối thủ và thời gian."));
    expect(card()).toHaveAttribute("href", "/arena/history");
  });

  it("invites a learner with no matches to play their first (AC-012)", async () => {
    history = respond({ stats: { wins: 0, losses: 0, streak: 0, bestStreak: 0 }, matches: [] });
    render(<ArenaPage />);
    await waitFor(() => expect(card()).toHaveAccessibleDescription("Bạn chưa có trận nào được lưu. Đấu trận đầu tiên, nó sẽ hiện ở đây."));
  });
});
