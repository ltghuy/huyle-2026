import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { buildSnapshot, bytesToBase64, encodeSnapshot } from "@/learning/snapshot";
import { getAllCards } from "@/storage/cards";
import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { fakeSyncServer } from "@/sync/test-server";
import { SyncPanel } from "./sync-panel";

// Feature 022 (AC-019, AC-020): old sync codes can only be merged into the signed-in account.

const account = vi.hoisted(() => ({ status: "signed-in" as "signed-in" | "guest" }));
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ status: account.status, account: null, session: undefined }),
  canUseLockedAreas: (status: string) => status === "signed-in" || status === "expired",
}));

const ACCOUNT = { userId: "u1", name: "Minh Anh", email: "minh@example.com", image: null, linkedAt: 1, rev: 0, dirty: false };
let server: ReturnType<typeof fakeSyncServer>;

async function oldCode(code = "TEST-0000-0001") {
  const other = createDefaultProfile(Date.now(), () => "device-b");
  const snapshot = buildSnapshot({ profile: other, cards: [makeCard("word:from-code", 0)], attempts: [], lessons: [], extraLessons: [], claims: [], attendance: [] }, Date.now(), other.timeZone);
  server.rows.set(code.replace(/-/g, ""), { rev: 2, data: bytesToBase64(await encodeSnapshot(snapshot)), updatedAt: 1 });
  return code;
}

beforeEach(async () => {
  await resetStorage();
  localStorage.clear();
  server = fakeSyncServer();
  account.status = "signed-in";
  await saveProfile({ ...createDefaultProfile(Date.now(), () => "device-a"), account: ACCOUNT });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SyncPanel", () => {
  it("is not shown to guests, and never offers to make a new code (AC-019)", async () => {
    account.status = "guest";
    const { container } = render(<SyncPanel />);
    expect(container).toBeEmptyDOMElement();
    account.status = "signed-in";
    render(<SyncPanel />);
    expect(await screen.findByText("Mã đồng bộ cũ")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Bật đồng bộ/ })).not.toBeInTheDocument();
  });

  it("merges a typed code's progress into the account and deletes the code (AC-020)", async () => {
    const code = await oldCode();
    render(<SyncPanel />);
    fireEvent.change(await screen.findByLabelText("Nhập mã đồng bộ"), { target: { value: code.toLowerCase() } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Gộp vào tài khoản/ })));
    await waitFor(async () => expect((await getAllCards()).map((card) => card.itemId)).toContain("word:from-code"));
    expect(server.row(code)).toBeUndefined();
    await waitFor(() => expect(server.account).toBeDefined());
  });

  it("offers this device's own linked code in one click", async () => {
    const code = await oldCode();
    await saveProfile({ ...(await getProfile())!, sync: { code, rev: 2, dirty: false } });
    render(<SyncPanel />);
    await act(async () => fireEvent.click(await screen.findByRole("button", { name: "Gộp mã này vào tài khoản" })));
    await waitFor(async () => expect((await getProfile())?.sync).toBeUndefined());
    expect((await getAllCards()).map((card) => card.itemId)).toContain("word:from-code");
  });

  it("explains a wrong code in Vietnamese and keeps everything", async () => {
    render(<SyncPanel />);
    fireEvent.change(await screen.findByLabelText("Nhập mã đồng bộ"), { target: { value: "ZZZZ-ZZZZ-ZZZZ" } });
    await act(async () => fireEvent.click(screen.getByRole("button", { name: /Gộp vào tài khoản/ })));
    expect(await screen.findByText("Không tìm thấy mã đồng bộ này. Bạn kiểm tra lại mã nhé.")).toBeInTheDocument();
  });
});
