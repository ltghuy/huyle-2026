import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, screen, waitFor } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { resolveAccount } from "@/hooks/use-account";
import { AccountLink } from "@/components/shell/account-link";
import type { AccountLink as CachedAccount } from "@/learning/types";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { resetStorage } from "@/storage/test-utils";
import { movedMessage } from "./account-linker";
import { returnPath, SIGN_IN_LABEL, SignInButton } from "./sign-in-button";
import { SignInGate } from "./sign-in-gate";

vi.mock("next/navigation", () => ({ usePathname: () => "/vocabulary" }));

// Feature 022: who the app thinks is using it, and what guests see (AC-001–AC-003, AC-010, AC-012).

const USER = { id: "u1", name: "Minh Anh Nguyen", email: "minh@example.com", image: null };
const CACHED: CachedAccount = { userId: "u1", name: "Minh Anh Nguyen", email: "minh@example.com", image: null, linkedAt: 1 };

function stubSession(user: typeof USER | null | "offline") {
  const fetchMock = vi.fn(async (url: RequestInfo | URL, init: RequestInit = {}) => {
    if (String(url) === "/api/auth/get-session") {
      if (user === "offline") throw new TypeError("Failed to fetch");
      return Response.json(user ? { user, session: {} } : null);
    }
    if (String(url) === "/api/auth/sign-in/social" && init.method === "POST") return Response.json({ url: "https://accounts.google.com/o/oauth2/v2/auth?x=1", redirect: true });
    return new Response(null, { status: 404 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(async () => {
  await resetStorage();
  await saveProfile({ ...createDefaultProfile(0, () => "device-a"), displayName: "Minh" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resolveAccount", () => {
  const live = { userId: "u1", name: "Minh Anh", email: "minh@example.com", image: null };

  it("is a guest once the session says so and no account is cached", () => {
    expect(resolveAccount(undefined, { status: "success", data: null }, true).status).toBe("guest");
    expect(resolveAccount(undefined, { status: "pending" }, true).status).toBe("unknown");
  });

  it("is signed in from the live session, or offline from the cached account (AC-017)", () => {
    expect(resolveAccount(undefined, { status: "success", data: live }, true)).toMatchObject({ status: "signed-in", session: live });
    expect(resolveAccount(CACHED, { status: "error" }, true)).toMatchObject({ status: "signed-in", session: undefined });
    expect(resolveAccount(CACHED, { status: "pending" }, true).status).toBe("signed-in");
  });

  it("is expired when the session ended but this device holds the account's progress (AC-006)", () => {
    expect(resolveAccount(CACHED, { status: "success", data: null }, true).status).toBe("expired");
    expect(resolveAccount({ ...CACHED, expired: true }, { status: "error" }, true).status).toBe("expired");
  });
});

describe("SignInGate", () => {
  it("shows guests what signing in unlocks, with the button and the privacy note", async () => {
    stubSession(null);
    render(
      <SignInGate area="review" fallback={<p>loading</p>}>
        <p>review queue</p>
      </SignInGate>,
    );
    expect(await screen.findByText("Đăng nhập để ôn tập")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: SIGN_IN_LABEL })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "ứng dụng lưu những gì" })).toHaveAttribute("href", "/privacy");
    expect(screen.queryByText("review queue")).not.toBeInTheDocument();
  });

  it("shows the area to a signed-in learner", async () => {
    stubSession(USER);
    render(
      <SignInGate area="review">
        <p>review queue</p>
      </SignInGate>,
    );
    expect(await screen.findByText("review queue")).toBeInTheDocument();
  });

  it("keeps working offline for a learner whose account is cached here", async () => {
    stubSession("offline");
    await saveProfile({ ...createDefaultProfile(0, () => "device-a"), displayName: "Minh", account: CACHED });
    render(
      <SignInGate area="lesson">
        <p>today</p>
      </SignInGate>,
    );
    expect(await screen.findByText("today")).toBeInTheDocument();
  });
});

describe("SignInButton", () => {
  it("drops a leftover ?error= from the page to come back to (AC-003, AC-012)", () => {
    expect(returnPath("/grammar", "?topic=past&error=access_denied")).toBe("/grammar?topic=past");
    expect(returnPath("/review", "")).toBe("/review");
  });

  it("starts the Google round trip back to this page", async () => {
    const fetchMock = stubSession(null);
    const assign = vi.fn();
    vi.stubGlobal("location", { ...window.location, pathname: "/exercises", search: "?tab=sentence", assign });
    render(<SignInButton />);
    fireEvent.click(screen.getByRole("button", { name: SIGN_IN_LABEL }));
    await waitFor(() => expect(assign).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth?x=1"));
    const [, init] = fetchMock.mock.calls.find(([url]) => String(url) === "/api/auth/sign-in/social")!;
    expect(JSON.parse(String(init!.body))).toEqual({ provider: "google", callbackURL: "/exercises?tab=sentence", errorCallbackURL: "/exercises?tab=sentence" });
  });
});

describe("AccountLink (the top-right corner)", () => {
  it("offers sign-in to guests (AC-001)", async () => {
    stubSession(null);
    render(<AccountLink />);
    expect(await screen.findByRole("button", { name: SIGN_IN_LABEL })).toBeInTheDocument();
    expect(screen.queryByText(/Chào/)).not.toBeInTheDocument();
  });

  it("greets a signed-in learner and shows initials without a Google picture (AC-002)", async () => {
    stubSession(USER);
    render(<AccountLink />);
    expect(await screen.findByText("Chào Minh!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Hồ sơ" })).toHaveTextContent("MA");
    expect(screen.queryByRole("button", { name: SIGN_IN_LABEL })).not.toBeInTheDocument();
  });

  it("asks to sign in again when the session ended (AC-006)", async () => {
    stubSession(null);
    await saveProfile({ ...createDefaultProfile(0, () => "device-a"), displayName: "Minh", account: CACHED });
    render(<AccountLink />);
    expect(await screen.findByRole("button", { name: "Đăng nhập lại" })).toBeInTheDocument();
  });
});

describe("movedMessage", () => {
  it("says what moved into the account (AC-014)", () => {
    expect(movedMessage({ wordsLearned: 120, grammarLearned: 3, streak: 15, points: 300, hardWords: 2 })).toBe("Đã chuyển 120 từ, 3 chủ điểm ngữ pháp và chuỗi 15 ngày vào tài khoản.");
    expect(movedMessage({ wordsLearned: 5, grammarLearned: 0, streak: 0, points: 0, hardWords: 0 })).toBe("Đã chuyển 5 từ vào tài khoản.");
    expect(movedMessage({ wordsLearned: 0, grammarLearned: 0, streak: 0, points: 0, hardWords: 0 })).toBeNull();
  });
});
