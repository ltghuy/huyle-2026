import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, screen, waitFor, within } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { buildSnapshot, bytesToBase64, encodeSnapshot } from "@/learning/snapshot";
import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { fakeSyncServer } from "@/sync/test-server";
import { SyncPanel } from "./sync-panel";

let server: ReturnType<typeof fakeSyncServer>;

beforeEach(async () => {
  await resetStorage();
  localStorage.clear();
  server = fakeSyncServer();
  await saveProfile(createDefaultProfile(Date.now(), () => "device-a"));
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function click(name: string | RegExp) {
  const button = await screen.findByRole("button", { name });
  await waitFor(() => expect(button).toBeEnabled());
  await act(async () => fireEvent.click(button));
}

describe("SyncPanel", () => {
  it("off: explains the risk and turns sync on, then shows the code with a copy button", async () => {
    render(<SyncPanel />);
    expect(await screen.findByText(/Ai có mã đồng bộ đều xem và thay đổi được tiến độ này/)).toBeInTheDocument();

    await click("Bật đồng bộ");

    const code = await screen.findByLabelText("Mã đồng bộ");
    expect(code).toHaveTextContent(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
    expect(screen.getByRole("button", { name: "Sao chép mã" })).toBeInTheDocument();
    expect(screen.getByText(/Lần đồng bộ gần nhất:/)).toBeInTheDocument();

    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    await click("Sao chép mã");
    expect(writeText).toHaveBeenCalledWith(code.textContent);
  });

  it("off: previews a code, then links after confirmation", async () => {
    const snapshot = buildSnapshot(
      {
        profile: createDefaultProfile(0, () => "device-b"),
        cards: [makeCard("word:a", 0), makeCard("word:b", 0)],
        attempts: [],
        lessons: [],
        attendance: [{ date: "2026-10-20", points: 10, bonus: 0, at: 1 }],
      },
      Date.now(),
      "Asia/Ho_Chi_Minh",
    );
    server.rows.set("ABCD1234EFGH", { rev: 2, data: bytesToBase64(await encodeSnapshot(snapshot)), updatedAt: Date.UTC(2026, 9, 25, 3) });
    render(<SyncPanel />);

    const input = await screen.findByLabelText("Nhập mã đồng bộ");
    fireEvent.change(input, { target: { value: "abcd-1234-efgh" } });
    await click("Kiểm tra mã");

    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText("Từ đã học").nextSibling).toHaveTextContent("2");
    expect(within(dialog).getByText("Điểm").nextSibling).toHaveTextContent("10");
    expect(within(dialog).getByText("Cập nhật lần cuối").nextSibling).toHaveTextContent(/25\/10\/26/);

    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Liên kết" })));
    await waitFor(async () => expect((await getProfile())?.sync?.code).toBe("ABCD-1234-EFGH"));
    expect(await screen.findByLabelText("Mã đồng bộ")).toHaveTextContent("ABCD-1234-EFGH");
  });

  it("off: shows a Vietnamese error for an unknown code", async () => {
    render(<SyncPanel />);
    fireEvent.change(await screen.findByLabelText("Nhập mã đồng bộ"), { target: { value: "ABCD-1234-EFGH" } });
    await click("Kiểm tra mã");
    expect(await screen.findByRole("alert")).toHaveTextContent("Không tìm thấy mã đồng bộ này");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });

  it("on: syncs now, unlinks, and deletes the synced data after confirmation", async () => {
    render(<SyncPanel />);
    await click("Bật đồng bộ");
    const code = (await screen.findByLabelText("Mã đồng bộ")).textContent!;

    await click("Đồng bộ ngay");
    await waitFor(() => expect(server.calls.at(-1)?.method).toBe("GET"));

    await click("Xóa dữ liệu đã đồng bộ");
    const dialog = await screen.findByRole("alertdialog");
    expect(server.row(code)).toBeDefined();
    await act(async () => fireEvent.click(within(dialog).getByRole("button", { name: "Xóa" })));
    await waitFor(() => expect(server.row(code)).toBeUndefined());
    expect(await screen.findByRole("button", { name: "Bật đồng bộ" })).toBeInTheDocument();
  });

  it("on: unlinking keeps the server copy and shows the off state", async () => {
    render(<SyncPanel />);
    await click("Bật đồng bộ");
    const code = (await screen.findByLabelText("Mã đồng bộ")).textContent!;
    await click("Tắt đồng bộ trên thiết bị này");
    expect(await screen.findByRole("button", { name: "Bật đồng bộ" })).toBeInTheDocument();
    expect(server.row(code)).toBeDefined();
  });

  it("on: tells the learner when changes are waiting, and offline errors in Vietnamese", async () => {
    await saveProfile({ ...createDefaultProfile(0, () => "device-a"), sync: { code: "ABCD-1234-EFGH", rev: 1, dirty: true } });
    server.offline = true;
    render(<SyncPanel />);
    expect(await screen.findByText(/Có thay đổi chưa đồng bộ được/)).toBeInTheDocument();
    await click("Đồng bộ ngay");
    expect(await screen.findByRole("alert")).toHaveTextContent("Không kết nối được máy chủ");
  });
});
