import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@/test-utils/render";
import type { AccountLink } from "@/learning/types";
import { getAllCards, putCards } from "@/storage/cards";
import { createDefaultProfile, getProfile, saveProfile } from "@/storage/meta";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { AccountCard } from "./account-card";

// Feature 022: the account in Settings (AC-001, AC-005, AC-022, AC-023).

const pushNow = vi.fn();
vi.mock("@/sync/sync-client", () => ({ pushNow: (...args: unknown[]) => pushNow(...args) }));
const exportProgress = vi.fn<(...args: unknown[]) => Promise<void>>(async () => {});
vi.mock("./backup-actions", () => ({ exportProgress: (...args: unknown[]) => exportProgress(...args) }));

const USER = { id: "u1", name: "Minh Anh", email: "minh@example.com", image: null };
const LINKED: AccountLink = { userId: "u1", name: "Minh Anh", email: "minh@example.com", image: null, linkedAt: 1, rev: 3, dirty: false };
let calls: { url: string; method: string }[] = [];

function stubServer({ signedIn = true, deleteOk = true } = {}) {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: RequestInfo | URL, init: RequestInit = {}) => {
      calls.push({ url: String(url), method: init.method ?? "GET" });
      if (String(url) === "/api/auth/get-session") return Response.json(signedIn ? { user: USER, session: {} } : null);
      if (String(url) === "/api/account") return new Response(null, { status: deleteOk ? 204 : 503 });
      return Response.json({ success: true });
    }),
  );
}

beforeEach(async () => {
  await resetStorage();
  pushNow.mockReset().mockResolvedValue(true);
  exportProgress.mockClear();
});

afterEach(() => vi.unstubAllGlobals());

async function signedInDevice() {
  await saveProfile({ ...createDefaultProfile(0, () => "device-a"), account: LINKED });
  await putCards([makeCard("word:minh", 0)]);
}

describe("AccountCard", () => {
  it("offers a guest sign-in with Google", async () => {
    stubServer({ signedIn: false });
    await saveProfile(createDefaultProfile(0, () => "device-a"));
    render(<AccountCard />);
    expect(await screen.findByRole("button", { name: "Đăng nhập với Google" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ứng dụng lưu những gì?" })).toHaveAttribute("href", "/privacy");
  });

  it("shows the account's name and email (AC-022)", async () => {
    stubServer();
    await signedInDevice();
    render(<AccountCard />);
    expect(await screen.findByText("minh@example.com")).toBeInTheDocument();
    expect(screen.getByText("Minh Anh")).toBeInTheDocument();
  });

  it("signs out after sending the last changes, and clears the device (AC-005)", async () => {
    stubServer();
    await signedInDevice();
    render(<AccountCard />);
    fireEvent.click(await screen.findByRole("button", { name: /Đăng xuất/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Đăng xuất" }));
    await waitFor(() => expect(calls.some((call) => call.url === "/api/auth/sign-out")).toBe(true));
    expect(pushNow).toHaveBeenCalled();
    await waitFor(async () => expect(await getAllCards()).toEqual([]));
    expect((await getProfile())?.account).toBeUndefined();
  });

  it("warns when the last changes couldn't be sent, and signs out only on a second press", async () => {
    stubServer();
    await signedInDevice();
    pushNow.mockRejectedValue(new Error("offline"));
    render(<AccountCard />);
    fireEvent.click(await screen.findByRole("button", { name: /Đăng xuất/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Đăng xuất" }));
    expect(await screen.findByText(/những thay đổi đó sẽ mất/)).toBeInTheDocument();
    expect(calls.some((call) => call.url === "/api/auth/sign-out")).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: "Vẫn đăng xuất" }));
    await waitFor(() => expect(calls.some((call) => call.url === "/api/auth/sign-out")).toBe(true));
  });

  it("offers a backup before deleting, then deletes the account and clears the device (AC-023)", async () => {
    stubServer();
    await signedInDevice();
    render(<AccountCard />);
    fireEvent.click(await screen.findByRole("button", { name: /Xóa tài khoản/ }));
    fireEvent.click(await screen.findByRole("button", { name: /Xuất trước/ }));
    expect(exportProgress).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Xóa tài khoản" }));
    await waitFor(() => expect(calls).toContainEqual({ url: "/api/account", method: "DELETE" }));
    await waitFor(async () => expect(await getAllCards()).toEqual([]));
  });

  it("keeps everything when the deletion fails", async () => {
    stubServer({ deleteOk: false });
    await signedInDevice();
    render(<AccountCard />);
    fireEvent.click(await screen.findByRole("button", { name: /Xóa tài khoản/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Xóa tài khoản" }));
    await waitFor(() => expect(calls).toContainEqual({ url: "/api/account", method: "DELETE" }));
    expect(await getAllCards()).toHaveLength(1);
  });
});
