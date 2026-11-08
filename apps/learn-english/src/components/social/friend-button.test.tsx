import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SocialError } from "@/lib/social-client";
import type { PulseResponse } from "@/server/social/social.schema";
import { render } from "@/test-utils/render";
import { FriendButton } from "./friend-button";

const toastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (message: string) => toastError(message) } }));
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ status: "signed-in", account: { userId: "minh", name: "Minh Anh", email: "m@example.com", image: null } }),
}));
const pulse = vi.fn<() => Promise<PulseResponse>>();
const sendFriendRequest = vi.fn();
vi.mock("@/lib/social-client", async (original) => ({
  ...(await original<typeof import("@/lib/social-client")>()),
  pulse: () => pulse(),
  sendFriendRequest: (id: string) => sendFriendRequest(id),
}));

const base: PulseResponse = { now: 1, friends: [], outgoing: [], incoming: [], unread: 0 };

beforeEach(() => {
  pulse.mockReset().mockResolvedValue(base);
  sendFriendRequest.mockReset();
  toastError.mockReset();
});

describe("FriendButton (feature 031)", () => {
  it("shows nothing on your own card", async () => {
    const { container } = render(<FriendButton userId="minh" />);
    await waitFor(() => expect(pulse).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("shows Bạn bè for friends and a disabled Đã gửi lời mời for a sent request (AC-003, AC-007)", async () => {
    pulse.mockResolvedValue({ ...base, friends: [{ id: "lan", name: "Lan", image: null, online: true, lastSeenAt: 1 }], outgoing: ["khoa"] });
    render(
      <>
        <FriendButton userId="lan" />
        <FriendButton userId="khoa" />
      </>,
    );
    expect(await screen.findByText("Bạn bè")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đã gửi lời mời" })).toBeDisabled();
  });

  it("sends a request and switches to sent at once (AC-003)", async () => {
    let resolve: (value: unknown) => void = () => {};
    sendFriendRequest.mockReturnValue(new Promise((r) => (resolve = r)));
    render(<FriendButton userId="lan" />);
    fireEvent.click(await screen.findByRole("button", { name: "Kết bạn" }));
    expect(await screen.findByRole("button", { name: "Đã gửi lời mời" })).toBeDisabled();
    pulse.mockResolvedValue({ ...base, outgoing: ["lan"] });
    resolve({ state: "sent" });
    expect(sendFriendRequest).toHaveBeenCalledWith("lan");
    await waitFor(() => expect(screen.getByRole("button", { name: "Đã gửi lời mời" })).toBeInTheDocument());
  });

  it("rolls back and explains when the request fails", async () => {
    sendFriendRequest.mockRejectedValue(new SocialError("Không tìm thấy người này.", 404));
    render(<FriendButton userId="ghost" />);
    fireEvent.click(await screen.findByRole("button", { name: "Kết bạn" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Không tìm thấy người này."));
    expect(screen.getByRole("button", { name: "Kết bạn" })).toBeEnabled();
  });
});
