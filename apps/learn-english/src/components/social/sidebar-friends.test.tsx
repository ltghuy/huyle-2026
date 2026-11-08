import { fireEvent, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import type { PulseResponse } from "@/server/social/social.schema";
import { render } from "@/test-utils/render";
import { SidebarFriends } from "./sidebar-friends";

let status = "signed-in";
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ status, account: status === "signed-in" ? { userId: "minh", name: "Minh Anh", email: "m@example.com", image: null } : null }),
}));
const pulse = vi.fn<() => Promise<PulseResponse>>();
vi.mock("@/lib/social-client", async (original) => ({ ...(await original<typeof import("@/lib/social-client")>()), pulse: () => pulse() }));

const DATA: PulseResponse = {
  now: 1,
  friends: [
    { id: "lan", name: "Lan", image: null, online: true, lastSeenAt: 1 },
    { id: "khoa", name: "Khoa", image: null, online: false, lastSeenAt: null },
  ],
  outgoing: [],
  incoming: [],
  unread: 0,
};

beforeEach(() => {
  status = "signed-in";
  pulse.mockReset().mockResolvedValue(DATA);
});

describe("sidebar friends (feature 031)", () => {
  it("shows the section to signed-in learners (AC-010)", async () => {
    render(
      <SidebarProvider>
        <SidebarFriends />
      </SidebarProvider>,
    );
    expect(await screen.findByRole("heading", { name: "Bạn bè" })).toBeInTheDocument();
    expect(await screen.findByText("Lan")).toBeInTheDocument();
  });

  it("is absent for guests (AC-018)", () => {
    status = "guest";
    render(
      <SidebarProvider>
        <SidebarFriends />
      </SidebarProvider>,
    );
    expect(screen.queryByRole("heading", { name: "Bạn bè" })).not.toBeInTheDocument();
  });

  it("collapsed, shows the online count and opens the sidebar", async () => {
    render(
      <SidebarProvider defaultOpen={false}>
        <SidebarFriends />
      </SidebarProvider>,
    );
    const button = await screen.findByRole("button", { name: "Bạn bè: 1 đang trực tuyến" });
    fireEvent.click(button);
    expect(await screen.findByRole("heading", { name: "Bạn bè" })).toBeInTheDocument();
  });
});
