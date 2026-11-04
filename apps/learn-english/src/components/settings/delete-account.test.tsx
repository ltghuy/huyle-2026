import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@/test-utils/render";
import type { AccountLink } from "@/learning/types";
import { getAllCards, putCards } from "@/storage/cards";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { DeleteAccount } from "./delete-account";

// Feature 022: deleting the account at the end of Settings (AC-022, AC-023).

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
  exportProgress.mockClear();
});

afterEach(() => vi.unstubAllGlobals());

async function signedInDevice() {
  await saveProfile({ ...createDefaultProfile(0, () => "device-a"), account: LINKED });
  await putCards([makeCard("word:minh", 0)]);
}

describe("DeleteAccount", () => {
  it("is hidden for a guest", async () => {
    stubServer({ signedIn: false });
    await saveProfile(createDefaultProfile(0, () => "device-a"));
    render(<DeleteAccount />);
    await waitFor(() => expect(calls.some((call) => call.url === "/api/auth/get-session")).toBe(true));
    expect(screen.queryByRole("button", { name: /Xóa tài khoản/ })).not.toBeInTheDocument();
  });

  it("offers a backup before deleting, then deletes the account and clears the device (AC-023)", async () => {
    stubServer();
    await signedInDevice();
    render(<DeleteAccount />);
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
    render(<DeleteAccount />);
    fireEvent.click(await screen.findByRole("button", { name: /Xóa tài khoản/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Xóa tài khoản" }));
    await waitFor(() => expect(calls).toContainEqual({ url: "/api/account", method: "DELETE" }));
    expect(await getAllCards()).toHaveLength(1);
  });
});
