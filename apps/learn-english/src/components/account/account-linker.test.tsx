import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@/test-utils/render";
import type { AccountLink } from "@/learning/types";
import { getAllCards, putCards } from "@/storage/cards";
import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { AccountLinker } from "./account-linker";

// Feature 022: what happens right after a Google sign-in (AC-014, AC-018, edge case: another account).

const linkAccount = vi.fn();
vi.mock("@/sync/sync-client", () => ({ linkAccount: (...args: unknown[]) => linkAccount(...args) }));
const { toast } = vi.hoisted(() => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("sonner", () => ({ toast }));

const LIVE = { id: "u2", name: "Lan Tran", email: "lan@example.com", image: null };
const PREVIOUS: AccountLink = { userId: "u1", name: "Minh Anh", email: "minh@example.com", image: null, linkedAt: 1, dirty: true };

function stubSession(user: typeof LIVE | null) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL) => (String(url) === "/api/auth/get-session" ? Response.json(user ? { user, session: {} } : null) : Response.json({}))),
  );
}

beforeEach(async () => {
  await resetStorage();
  linkAccount.mockReset().mockResolvedValue({ wordsLearned: 12, grammarLearned: 0, streak: 4, points: 80, hardWords: 0 });
  toast.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
});

afterEach(() => vi.unstubAllGlobals());

describe("AccountLinker", () => {
  it("moves a guest device's progress into the account on first sign-in and says what moved", async () => {
    stubSession(LIVE);
    await saveProfile(createDefaultProfile(0, () => "device-a"));
    render(<AccountLinker />);
    await waitFor(() => expect(linkAccount).toHaveBeenCalledWith({ userId: "u2", name: "Lan Tran", email: "lan@example.com", image: null }));
    await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Đã chuyển 12 từ và chuỗi 4 ngày vào tài khoản."));
  });

  it("tells the learner when the move failed, keeping the progress for the next visit (AC-018)", async () => {
    stubSession(LIVE);
    await saveProfile(createDefaultProfile(0, () => "device-a"));
    linkAccount.mockRejectedValue(new Error("offline"));
    render(<AccountLinker />);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
  });

  it("does nothing for a guest or for a device already linked to this account", async () => {
    stubSession(null);
    await saveProfile(createDefaultProfile(0, () => "device-a"));
    const { unmount } = render(<AccountLinker />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    unmount();
    stubSession(LIVE);
    await saveProfile({ ...createDefaultProfile(0, () => "device-a"), account: { ...PREVIOUS, userId: "u2", dirty: false } });
    render(<AccountLinker />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(linkAccount).not.toHaveBeenCalled();
  });

  it("asks before another account takes over a device with unsynced progress, then clears it", async () => {
    stubSession(LIVE);
    await saveProfile({ ...createDefaultProfile(0, () => "device-a"), account: PREVIOUS });
    await putCards([makeCard("word:minh", 0)]);
    render(<AccountLinker />);

    expect(await screen.findByText("Đổi sang tài khoản khác?")).toBeInTheDocument();
    expect(screen.getByText(/còn tiến độ chưa đồng bộ của Minh Anh/)).toBeInTheDocument();
    expect(linkAccount).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Tiếp tục" }));
    await waitFor(() => expect(linkAccount).toHaveBeenCalledWith(expect.objectContaining({ userId: "u2" })));
    expect(await getAllCards()).toEqual([]);
    expect((await getProfile())?.account).toBeUndefined();
  });
});
