import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { queryOptions } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { POOL } from "@/learning/arena/fixtures";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
import ArenaDuelPage from "@/app/(app)/arena/1v1/page";
import ArenaPage from "@/app/(app)/arena/page";
import { codeFrom } from "./join-room";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/arena",
  useSearchParams: () => new URLSearchParams(),
}));

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

type Handler = (url: string, init?: RequestInit) => Response | undefined;
let handler: Handler = () => undefined;

function stubFetch(signedIn: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url === "/api/auth/get-session") return Response.json(signedIn ? { user: { id: "minh", name: "Minh Anh", email: "m@example.com" }, session: {} } : null);
      if (url === "/api/arena/stats") return Response.json({ wins: 12, losses: 5, streak: 2, bestStreak: 4 });
      return handler(url, init) ?? new Response("{}", { status: 503 });
    }),
  );
}

beforeEach(async () => {
  push.mockReset();
  handler = () => undefined;
  await resetStorage();
  await saveProfile({ ...createDefaultProfile(0, () => "device-a"), displayName: "Minh", level: "A1", placement: "skipped" });
});
afterEach(() => vi.unstubAllGlobals());

describe("codeFrom", () => {
  it("reads a typed code, forgiving case and spaces, or the code in an invite link", () => {
    expect(codeFrom("k7p 2qx")).toBe("K7P2QX");
    expect(codeFrom("https://english.huyle.work/arena/room?code=K7P2QX")).toBe("K7P2QX");
    expect(codeFrom("K7P2QXZZZ")).toBe("K7P2QX");
  });
});

describe("the Arena hub (feature 024)", () => {
  it("shows the two kinds of match, each opening its screen (AC-001 to AC-003, 039 AC-001)", () => {
    render(<ArenaPage />);
    const duel = screen.getByRole("link", { name: "Đấu 1-1" });
    expect(duel).toHaveAttribute("href", "/arena/1v1");
    expect(duel).toHaveAccessibleDescription(/ai trả lời đúng trước thì ghi điểm/);

    const team = screen.getByRole("link", { name: "Đấu đội" });
    expect(team).toHaveAttribute("href", "/arena/team");
    expect(team).not.toHaveAttribute("aria-disabled");
    expect(team).toHaveAccessibleDescription(/Chia đội cùng bạn bè/);
    expect(screen.queryByText("Sắp ra mắt")).not.toBeInTheDocument();
  });

  it("joins by code from the hub, and says why when the code is wrong (AC-005, quick 059)", async () => {
    stubFetch(true);
    handler = (url, init) => {
      if (url !== "/api/arena/join") return undefined;
      const { code } = JSON.parse(String(init?.body)) as { code: string };
      return code === "K7P2QX" ? Response.json({ code, ticket: "t", settings: {} }) : Response.json({ error: { message: "Không tìm thấy phòng. Bạn kiểm tra lại mã nhé." } }, { status: 404 });
    };
    render(<ArenaPage />);
    const input = await screen.findByLabelText("Vào phòng bằng mã");
    const submit = screen.getByRole("button", { name: "Vào phòng" });
    fireEvent.change(input, { target: { value: "abc" } });
    expect(submit).toBeDisabled();

    fireEvent.change(input, { target: { value: "ZZZZZZ" } });
    fireEvent.click(submit);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy phòng");
    expect(push).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: "https://english.huyle.work/arena/room?code=K7P2QX" } });
    fireEvent.click(screen.getByRole("button", { name: "Vào phòng" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/arena/room?code=K7P2QX"));
  });

  it("sends a guest with a code straight to the room, which asks them to sign in (AC-005, quick 059)", async () => {
    stubFetch(false);
    render(<ArenaPage />);
    const input = screen.getByLabelText("Vào phòng bằng mã");
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/auth/get-session", expect.anything()));
    fireEvent.change(input, { target: { value: "K7P2QX" } });
    fireEvent.click(screen.getByRole("button", { name: "Vào phòng" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/arena/room?code=K7P2QX"));
    expect(fetch).not.toHaveBeenCalledWith("/api/arena/join", expect.anything());
  });
});

describe("no friends on the hub (feature 032)", () => {
  it("shows no friends section to signed-in learners, who find friends on /friends (AC-006)", async () => {
    stubFetch(true);
    handler = (url) => (url === "/api/social/pulse" ? Response.json({ now: 1, friends: [{ id: "lan", name: "Lan", image: null, online: true, lastSeenAt: 1 }], outgoing: [], incoming: [], unread: 0 }) : undefined);
    render(<ArenaPage />);
    // Signed in once the match history is asked for.
    await waitFor(() => expect(fetch).toHaveBeenCalledWith("/api/arena/matches", expect.anything()));
    expect(screen.queryByRole("region", { name: "Bạn bè" })).not.toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalledWith("/api/social/pulse", expect.anything());
  });
});

describe("the 1-1 screen", () => {
  it("asks guests to sign in (023 AC-006, 024 AC-007)", async () => {
    stubFetch(false);
    render(<ArenaDuelPage />);
    expect(await screen.findByText("Đăng nhập để vào Đấu trường")).toBeInTheDocument();
  });

  it("shows you against an empty seat, the settings, create, the record and the way back, and no code entry (024 AC-004 to AC-008)", async () => {
    stubFetch(true);
    render(<ArenaDuelPage />);
    expect(await screen.findByRole("heading", { level: 1, name: "Thách đấu 1-1" })).toBeInTheDocument();
    expect(screen.getByText("Minh")).toBeInTheDocument();
    expect(screen.getByText("Đối thủ")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "A1" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/Hỗn hợp/)).toBeChecked();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Tạo phòng" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Đấu trường" })).toHaveAttribute("href", "/arena");
    expect(screen.queryByLabelText("Vào phòng bằng mã")).not.toBeInTheDocument();
    expect(await screen.findByText("12 thắng")).toBeInTheDocument();
    expect(screen.getByText("Chuỗi thắng dài nhất 4")).toBeInTheDocument();
  });

  it("creates a room with the chosen settings and opens it (AC-002)", async () => {
    stubFetch(true);
    let sent: unknown;
    handler = (url, init) => {
      if (url !== "/api/arena/rooms") return undefined;
      sent = JSON.parse(String(init?.body));
      return Response.json({ code: "K7P2QX", ticket: "t", settings: sent }, { status: 201 });
    };
    render(<ArenaDuelPage />);
    const create = await screen.findByRole("button", { name: "Tạo phòng" });
    fireEvent.click(screen.getByLabelText(/Viết câu/));
    fireEvent.click(screen.getByRole("radio", { name: /1 hiệp/ }));
    fireEvent.click(screen.getByRole("button", { name: "45 giây" }));
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.click(create);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/arena/room?code=K7P2QX"));
    expect(sent).toEqual({ mode: "write", level: "A1", rounds: 1, seconds: 45, name: "Minh" });
  });

  it("offers four question times with 15 s chosen, and no fixed time on the mode cards (feature 028, AC-001, AC-005)", async () => {
    stubFetch(true);
    render(<ArenaDuelPage />);
    await screen.findByRole("button", { name: "Tạo phòng" });
    const group = screen.getByRole("group", { name: "Thời gian mỗi câu" });
    const times = within(group).getAllByRole("button");
    expect(times.map((b) => b.getAttribute("aria-label"))).toEqual(["15 giây", "25 giây", "30 giây", "45 giây"]);
    expect(within(group).getByRole("button", { name: "15 giây" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText(/· \d+ giây/)).toBeNull();
  });

  it("disables the modes a level can't fill and falls back to one it can", async () => {
    stubFetch(true);
    render(<ArenaDuelPage />);
    fireEvent.click(await screen.findByRole("button", { name: "B1" }));
    await waitFor(() => expect(screen.getByLabelText(/Nghe/)).toBeDisabled());
    expect(screen.getByLabelText(/Viết câu/)).toBeDisabled();
    expect(screen.getByLabelText(/Nhớ từ/)).toBeChecked();
  });
});
