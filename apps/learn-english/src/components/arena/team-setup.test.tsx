import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { queryOptions } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { POOL } from "@/learning/arena/fixtures";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
import ArenaTeamPage from "@/app/(app)/arena/team/page";

const push = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push, replace: vi.fn() }),
  usePathname: () => "/arena/team",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/content/queries", () => ({
  contentQuery: (kind: string, level: string) =>
    queryOptions({
      queryKey: ["content-test", kind, level],
      queryFn: async () => ({ items: kind === "word" ? POOL.words : POOL.sentences, version: 1, stale: false }),
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
      return handler(url, init) ?? new Response("{}", { status: 503 });
    }),
  );
}

beforeEach(async () => {
  push.mockReset();
  handler = () => undefined;
  await resetStorage();
  await saveProfile({ ...createDefaultProfile(0, () => "device-a"), displayName: "Minh", level: "A2", placement: "skipped" });
});
afterEach(() => vi.unstubAllGlobals());

describe("the team screen (feature 039)", () => {
  it("asks guests to sign in (AC-006)", async () => {
    stubFetch(false);
    render(<ArenaTeamPage />);
    expect(await screen.findByText("Đăng nhập để vào Đấu trường")).toBeInTheDocument();
  });

  it("starts from mixed, the learner's own level, 6 players, 5 phút, 15 giây and 1 hiệp, with the way back (AC-002)", async () => {
    stubFetch(true);
    render(<ArenaTeamPage />);
    expect(await screen.findByRole("heading", { level: 1, name: "Đấu đội" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "A2" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText(/Hỗn hợp/)).toBeChecked();
    expect(screen.getByRole("group", { name: "Số người" })).toHaveTextContent("6 người");
    expect(screen.getByRole("radio", { name: "5 phút" })).toBeChecked();
    expect(screen.getByRole("radio", { name: /1 hiệp/ })).toBeChecked();
    expect(within(screen.getByRole("group", { name: "Thời gian mỗi câu" })).getByRole("button", { name: "15 giây" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByRole("button", { name: "Tạo phòng" })).toBeEnabled();
    expect(screen.getByRole("link", { name: "Đấu trường" })).toHaveAttribute("href", "/arena");
    expect(screen.getByRole("button", { name: "Hướng dẫn chơi" })).toBeInTheDocument();
  });

  it("keeps the room size between 2 and 10 (AC-002)", async () => {
    stubFetch(true);
    render(<ArenaTeamPage />);
    const less = await screen.findByRole("button", { name: "Bớt một người" });
    const more = screen.getByRole("button", { name: "Thêm một người" });
    const group = screen.getByRole("group", { name: "Số người" });
    for (let i = 0; i < 6; i++) fireEvent.click(less);
    expect(group).toHaveTextContent("2 người");
    expect(less).toBeDisabled();
    for (let i = 0; i < 10; i++) fireEvent.click(more);
    expect(group).toHaveTextContent("10 người");
    expect(more).toBeDisabled();
  });

  it("creates a team room with the chosen settings and opens it (AC-002)", async () => {
    stubFetch(true);
    let sent: unknown;
    handler = (url, init) => {
      if (url !== "/api/arena/teams") return undefined;
      sent = JSON.parse(String(init?.body));
      return Response.json({ code: "K7P2QX", ticket: "t", settings: sent }, { status: 201 });
    };
    render(<ArenaTeamPage />);
    const create = await screen.findByRole("button", { name: "Tạo phòng" });
    fireEvent.click(screen.getByLabelText(/Viết câu/));
    fireEvent.click(screen.getByRole("button", { name: "Bớt một người" }));
    fireEvent.click(screen.getByRole("radio", { name: "10 phút" }));
    fireEvent.click(screen.getByRole("radio", { name: /3 hiệp/ }));
    fireEvent.click(screen.getByRole("button", { name: "30 giây" }));
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.click(create);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/arena/room?code=K7P2QX"));
    expect(sent).toEqual({ mode: "write", level: "A2", rounds: 3, seconds: 30, size: 5, minutes: 10, name: "Minh" });
  });

  it("says why the room could not be made", async () => {
    stubFetch(true);
    handler = (url) => (url === "/api/arena/teams" ? Response.json({ error: { message: "Bạn đang ở trong một phòng khác." } }, { status: 409 }) : undefined);
    render(<ArenaTeamPage />);
    const create = await screen.findByRole("button", { name: "Tạo phòng" });
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.click(create);
    expect(await screen.findByRole("alert")).toHaveTextContent("Bạn đang ở trong một phòng khác.");
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Tạo phòng" })).toBeEnabled();
  });
});
