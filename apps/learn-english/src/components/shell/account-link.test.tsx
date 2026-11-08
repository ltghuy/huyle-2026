import { screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { AccountLink } from "./account-link";

let status = "signed-in";
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/hooks/use-profile", () => ({ useProfile: () => ({ status: "ready", data: { displayName: "Minh" } }) }));
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ status, account: status === "signed-in" ? { userId: "minh", name: "Minh Anh", email: "m@example.com", image: null } : null }),
}));
vi.mock("@/lib/social-client", async (original) => ({
  ...(await original<typeof import("@/lib/social-client")>()),
  pulse: async () => ({ now: 1, friends: [], outgoing: [], incoming: [], unread: 2 }),
}));

beforeEach(() => {
  status = "signed-in";
});

describe("AccountLink bell (feature 031)", () => {
  it("shows the bell next to the greeting for signed-in learners (AC-022)", async () => {
    render(<AccountLink />);
    expect(await screen.findByRole("button", { name: "Thông báo, 2 chưa đọc" })).toBeInTheDocument();
    expect(screen.getByText("Chào Minh!")).toBeInTheDocument();
  });

  it("shows no bell to guests (AC-030)", async () => {
    status = "guest";
    render(<AccountLink />);
    await waitFor(() => expect(screen.getByRole("link", { name: "Hồ sơ" })).toBeInTheDocument());
    expect(screen.queryByRole("button", { name: /Thông báo/ })).not.toBeInTheDocument();
  });
});
