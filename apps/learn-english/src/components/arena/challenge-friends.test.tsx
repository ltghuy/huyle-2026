import { act, fireEvent, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import { CHALLENGE_MS, type LinkFrame } from "@/learning/arena/link";
import type { Link } from "@/lib/link-client";
import { ArenaError } from "@/lib/arena-client";
import type { Friend } from "@/server/social/social.schema";
import { ChallengeFriends, NOT_SENT, REPLY_MESSAGES } from "./challenge-friends";

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
vi.mock("@/hooks/use-account", () => ({
  useAccount: () => ({ status: "signed-in", account: { userId: "minh", name: "Minh", email: "m@example.com", image: null } }),
}));
const LAN: Friend = { id: "lan", name: "Lan", image: null, online: true, lastSeenAt: 1 };
const THU: Friend = { id: "thu", name: "Thu", image: null, online: false, lastSeenAt: 1 };
let friends: Friend[] = [LAN, THU];
vi.mock("@/lib/social-client", async (original) => ({
  ...(await original<typeof import("@/lib/social-client")>()),
  pulse: async () => ({ now: 1, friends, outgoing: [], incoming: [], unread: 0 }),
}));
const sendChallenge = vi.fn();
const cancelChallenge = vi.fn();
vi.mock("@/lib/arena-client", async (original) => ({
  ...(await original<typeof import("@/lib/arena-client")>()),
  sendChallenge: (...args: unknown[]) => sendChallenge(...args),
  cancelChallenge: (...args: unknown[]) => cancelChallenge(...args),
}));

function fakeLink() {
  let listener: ((frame: LinkFrame) => void) | null = null;
  const client: Link = { start: vi.fn(), stop: vi.fn(), setRoom: vi.fn(), answer: vi.fn(() => true), subscribe: (next) => ((listener = next), () => void (listener = null)) };
  return { client, emit: (frame: LinkFrame) => act(() => listener?.(frame)) };
}

function setup(inRoom: string[] = ["minh"]) {
  const fake = fakeLink();
  const view = render(<ChallengeFriends code="R2KS89" hostName="Minh" inRoom={inRoom} client={fake.client} />);
  return { ...fake, ...view };
}

async function challengeLan() {
  fireEvent.click(await screen.findByRole("button", { name: "Thách đấu Lan" }));
  await screen.findByText(/Đang chờ/);
}

beforeEach(() => {
  friends = [LAN, THU];
  toast.mockReset();
  toast.success.mockReset();
  toast.error.mockReset();
  sendChallenge.mockReset().mockResolvedValue({ state: "sent" });
  cancelChallenge.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("ChallengeFriends (feature 035)", () => {
  it("lists friends, online first, with a button only for online ones (AC-001, AC-002)", async () => {
    setup();
    expect(await screen.findByRole("heading", { name: "Thách đấu bạn bè" })).toBeInTheDocument();
    expect(screen.getByText("Đang trực tuyến")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Thách đấu Lan" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Thách đấu Thu" })).not.toBeInTheDocument();
  });

  it("leaves out friends already in the room, and says so when there is nobody", async () => {
    friends = [];
    setup();
    expect(await screen.findByText(/chưa có bạn bè nào/)).toBeInTheDocument();
  });

  it("sends the challenge and shows it pending with the seconds left (AC-003)", async () => {
    setup();
    await challengeLan();
    expect(sendChallenge).toHaveBeenCalledWith("R2KS89", "lan", "Minh");
    expect(screen.getByText(/còn 30 giây/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Hủy lời thách đấu Lan" })).toBeInTheDocument();
  });

  it("tells the host when the friend accepts or declines (AC-005, AC-006)", async () => {
    const { emit } = setup();
    await challengeLan();
    emit({ type: "reply", friendId: "lan", code: "R2KS89", accept: true });
    expect(toast.success).toHaveBeenCalledWith(REPLY_MESSAGES.accepted("Lan"));
    expect(screen.getByRole("button", { name: "Thách đấu Lan" })).toBeInTheDocument();

    await challengeLan();
    emit({ type: "reply", friendId: "lan", code: "R2KS89", accept: false });
    expect(toast).toHaveBeenCalledWith(REPLY_MESSAGES.declined("Lan"));
  });

  it("ignores replies for no pending challenge or another room", async () => {
    const { emit } = setup();
    await screen.findByRole("button", { name: "Thách đấu Lan" });
    emit({ type: "reply", friendId: "lan", code: "R2KS89", accept: false });
    await challengeLan();
    emit({ type: "reply", friendId: "lan", code: "ZZZZZZ", accept: false });
    expect(toast).not.toHaveBeenCalled();
  });

  it("says when the friend is busy, gone or already here (AC-007, AC-008)", async () => {
    setup();
    for (const state of ["busy", "offline", "here"] as const) {
      sendChallenge.mockResolvedValueOnce({ state });
      fireEvent.click(await screen.findByRole("button", { name: "Thách đấu Lan" }));
      await vi.waitFor(() => expect(toast).toHaveBeenCalledWith(NOT_SENT[state]("Lan")));
    }
    expect(screen.queryByText(/Đang chờ/)).not.toBeInTheDocument();
  });

  it("shows the route's message when the challenge is refused", async () => {
    sendChallenge.mockRejectedValueOnce(new ArenaError("Phòng đã có đối thủ.", 409));
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Thách đấu Lan" }));
    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith("Phòng đã có đối thủ."));
  });

  it("gives up after 30 seconds with no answer (AC-009)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setup();
    await challengeLan();
    await act(() => vi.advanceTimersByTimeAsync(CHALLENGE_MS));
    expect(toast).toHaveBeenCalledWith(REPLY_MESSAGES.expired("Lan"));
    expect(screen.getByRole("button", { name: "Thách đấu Lan" })).toBeInTheDocument();
  });

  it("withdraws on Hủy and when the list goes away (AC-010)", async () => {
    const { unmount } = setup();
    await challengeLan();
    fireEvent.click(screen.getByRole("button", { name: "Hủy lời thách đấu Lan" }));
    expect(cancelChallenge).toHaveBeenCalledWith("R2KS89", "lan");
    await challengeLan();
    unmount();
    expect(cancelChallenge).toHaveBeenCalledTimes(2);
  });
});
