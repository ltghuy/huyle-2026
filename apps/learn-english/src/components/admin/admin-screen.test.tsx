import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { AdminError } from "@/lib/admin-client";
import type { AdminClaimGroup, AdminOverview } from "@/server/admin/admin.schema";
import { AdminScreen } from "./admin-screen";

let status = "signed-in";
let tab: string | null = null;
const replace = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace }), usePathname: () => "/admin", useSearchParams: () => ({ get: () => tab }) }));
vi.mock("@/hooks/use-account", async (original) => ({
  ...(await original<typeof import("@/hooks/use-account")>()),
  useAccount: () => ({ status, account: status === "signed-in" ? { userId: "boss", name: "Boss", email: "b@example.com", image: null } : null, session: null }),
}));
const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));

const OVERVIEW: AdminOverview = {
  now: 1,
  range: "today",
  from: "2026-11-09",
  to: "2026-11-09",
  accounts: { total: 42, created: { today: 1, week: 5, month: 12 }, active: { today: 7, week: 20, month: 30 } },
  pendingClaims: 2,
  devices: [{ day: "2026-11-09", devices: 9 }],
  lessons: 15,
  placements: 3,
  exercises: [{ kind: "translate", answered: 40 }],
  wrongWords: [{ wordId: "word:cat-n", wrong: 4 }],
  arenaMatches: 6,
};
const GROUP: AdminClaimGroup = {
  key: "k1",
  ids: ["c1", "c2"],
  sentenceId: "sentence:sea",
  answer: "Shut your eyes and picture the sea.",
  count: 2,
  ai: true,
  aiExplanationVi: "“Shut” và “picture” cũng đúng nghĩa ở đây.",
  firstAt: 1,
  sentence: { vi: "Nhắm mắt lại và tưởng tượng biển cả.", en: "Close your eyes and imagine the sea.", level: "A2" },
  accepted: ["Close your eyes and imagine the sea."],
};
const client = vi.hoisted(() => ({
  fetchOverview: vi.fn(),
  fetchClaimGroups: vi.fn(),
  decideClaimGroup: vi.fn(),
  fetchContent: vi.fn(),
  fetchContentItem: vi.fn(),
  saveContentItem: vi.fn(),
  setContentRemoved: vi.fn(),
}));
vi.mock("@/lib/admin-client", async (original) => ({ ...(await original<typeof import("@/lib/admin-client")>()), ...client }));

beforeEach(() => {
  status = "signed-in";
  tab = null;
  for (const fn of Object.values(client)) fn.mockReset();
  toast.mockReset();
  toast.error.mockReset();
  toast.success.mockReset();
  client.fetchOverview.mockResolvedValue(OVERVIEW);
  client.fetchClaimGroups.mockResolvedValue({ groups: [GROUP] });
  client.decideClaimGroup.mockResolvedValue({ changed: 2 });
  client.fetchContent.mockResolvedValue({ items: [{ id: "writing:a1-x", kind: "writing", level: "A1", topic: null, sort: 0, deleted: false, adminEditedAt: 5, updatedVersion: 3 }], total: 1, page: 1 });
  client.fetchContentItem.mockResolvedValue({ item: { id: "writing:a1-x", kind: "writing", level: "A1", topic: null, sort: 0, deleted: false, adminEditedAt: null, updatedVersion: 3, body: { promptVi: "Viết về bạn." } } });
});

describe("admin page (feature 038)", () => {
  it("asks guests to sign in and calls no admin route (AC-002)", () => {
    status = "guest";
    render(<AdminScreen />);
    expect(screen.getByText("Đăng nhập để vào trang quản trị")).toBeInTheDocument();
    expect(client.fetchOverview).not.toHaveBeenCalled();
  });

  it("tells a learner who isn't an admin they have no access, and shows nothing else (AC-002)", async () => {
    client.fetchOverview.mockRejectedValue(new AdminError("Bạn không có quyền vào trang này.", 403));
    render(<AdminScreen />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Bạn không có quyền vào trang này.");
    expect(screen.queryByRole("tablist")).not.toBeInTheDocument();
  });

  it("shows the account counts and the range stats (AC-006, AC-007)", async () => {
    render(<AdminScreen />);
    expect(await screen.findByText("Tổng số tài khoản")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /Duyệt câu/ })).toHaveTextContent("2");
    expect(await screen.findByText("Dịch câu")).toBeInTheDocument();
    expect(screen.getByText("cat-n")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "7 ngày" }));
    await waitFor(() => expect(client.fetchOverview).toHaveBeenCalledWith("week"));
  });

  it("approves a claim group and rejects one with a required explanation (AC-009 to AC-011)", async () => {
    tab = "claims";
    render(<AdminScreen />);
    expect(await screen.findByText("Shut your eyes and picture the sea.")).toBeInTheDocument();
    expect(screen.getByText("AI chấm đúng")).toBeInTheDocument();
    // The AI's reason is on the card and prefilled, editable, when approving (feature 042, AC-002, AC-003).
    expect(screen.getByText("AI giải thích")).toBeInTheDocument();
    expect(screen.getByText("“Shut” và “picture” cũng đúng nghĩa ở đây.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Duyệt" }));
    const approving = await screen.findByRole("dialog");
    const why = within(approving).getByLabelText(/Vì sao câu này đúng/);
    expect(why).toHaveValue("“Shut” và “picture” cũng đúng nghĩa ở đây.");
    fireEvent.change(why, { target: { value: "“Shut” nghĩa là “close”." } });
    fireEvent.click(within(approving).getByRole("button", { name: "Duyệt" }));
    await waitFor(() => expect(client.decideClaimGroup.mock.calls[0]?.[0]).toEqual({ ids: ["c1", "c2"], decision: "approve", explanationVi: "“Shut” nghĩa là “close”." }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole("button", { name: "Từ chối" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByRole("button", { name: "Từ chối" })).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/Vì sao chưa đúng/), { target: { value: "Sai nghĩa." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Từ chối" }));
    await waitFor(() => expect(client.decideClaimGroup.mock.calls[1]?.[0]).toEqual({ ids: ["c1", "c2"], decision: "reject", explanationVi: "Sai nghĩa." }));
  });

  it("approves a claim with no AI reason, with or without one written by the owner (042 AC-003)", async () => {
    tab = "claims";
    client.fetchClaimGroups.mockResolvedValue({ groups: [{ ...GROUP, ai: false, aiExplanationVi: null }] });
    render(<AdminScreen />);
    fireEvent.click(await screen.findByRole("button", { name: "Duyệt" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByLabelText(/Vì sao câu này đúng/)).toHaveValue("");
    fireEvent.click(within(dialog).getByRole("button", { name: "Duyệt" }));
    await waitFor(() => expect(client.decideClaimGroup.mock.calls[0]?.[0]).toEqual({ ids: ["c1", "c2"], decision: "approve" }));
  });

  it("only offers to drop a claim whose sentence is gone (AC-012)", async () => {
    tab = "claims";
    client.fetchClaimGroups.mockResolvedValue({ groups: [{ ...GROUP, sentence: null, accepted: [] }] });
    render(<AdminScreen />);
    expect(await screen.findByRole("button", { name: "Bỏ qua" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Duyệt" })).not.toBeInTheDocument();
  });

  it("lists content, opens an item, and shows the server's problems when a save is refused (AC-013 to AC-015)", async () => {
    tab = "content";
    client.saveContentItem.mockRejectedValue(new AdminError("Mục nội dung chưa đúng.", 422, [{ path: "body.modelAnswers", message: "Required" }]));
    render(<AdminScreen />);
    expect(await screen.findByText("Sửa ở đây, chưa kéo về")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "writing:a1-x" }));
    const body = await screen.findByLabelText("Nội dung (JSON)");
    expect(body).toHaveValue(JSON.stringify({ promptVi: "Viết về bạn." }, null, 2));
    fireEvent.change(body, { target: { value: "{ nope" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText(/JSON không hợp lệ/)).toBeInTheDocument();
    expect(client.saveContentItem).not.toHaveBeenCalled();
    fireEvent.change(body, { target: { value: '{"promptVi":"Mới"}' } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu" }));
    expect(await screen.findByText("body.modelAnswers")).toBeInTheDocument();
    expect(client.saveContentItem.mock.calls[0][0]).toEqual({ create: false, item: { id: "writing:a1-x", kind: "writing", level: "A1", topic: null, sort: 0, body: { promptVi: "Mới" } } });
  });
});
