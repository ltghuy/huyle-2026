import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { queryOptions } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { POOL } from "@/learning/arena/fixtures";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
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

describe("the Arena hub", () => {
  it("asks guests to sign in (AC-006)", async () => {
    stubFetch(false);
    render(<ArenaPage />);
    expect(await screen.findByText("Đăng nhập để vào Đấu trường")).toBeInTheDocument();
  });

  it("shows create, join and the learner's record (AC-001)", async () => {
    stubFetch(true);
    render(<ArenaPage />);
    expect(await screen.findByRole("button", { name: "Tạo phòng" })).toBeInTheDocument();
    expect(screen.getByLabelText("Vào phòng bằng mã")).toBeInTheDocument();
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
    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Tạo phòng" }));
    const dialog = await screen.findByRole("dialog", { name: "Tạo phòng đấu" });
    fireEvent.click(within(dialog).getByLabelText(/Viết câu/));
    fireEvent.click(within(dialog).getByRole("button", { name: /1 hiệp/ }));
    const create = within(dialog).getByRole("button", { name: "Tạo phòng" });
    await waitFor(() => expect(create).toBeEnabled());
    fireEvent.click(create);
    await waitFor(() => expect(push).toHaveBeenCalledWith("/arena/room?code=K7P2QX"));
    expect(sent).toEqual({ mode: "write", level: "A1", rounds: 1, name: "Minh" });
  });

  it("disables the modes a level can't fill and falls back to one it can", async () => {
    stubFetch(true);
    render(<ArenaPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Tạo phòng" }));
    const dialog = await screen.findByRole("dialog", { name: "Tạo phòng đấu" });
    fireEvent.click(within(dialog).getByRole("button", { name: "B1" }));
    await waitFor(() => expect(within(dialog).getByLabelText(/Nghe/)).toBeDisabled());
    expect(within(dialog).getByLabelText(/Viết câu/)).toBeDisabled();
    expect(within(dialog).getByLabelText(/Nhớ từ/)).toBeChecked();
  });

  it("joins by code, and says why when the code is wrong (AC-005)", async () => {
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
});
