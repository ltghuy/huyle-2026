import { act, fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/test-utils/render";
import type { LinkFrame } from "@/learning/arena/link";
import type { Link } from "@/lib/link-client";
import type { OnlineLearner } from "@/server/arena/arena.schema";
import { OnlineLearners } from "./online-learners";
import { NOT_SENT, REPLY_MESSAGES } from "./use-challenges";

const toast = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock("sonner", () => ({ toast }));
const fetchOnline = vi.fn();
const sendChallenge = vi.fn();
const cancelChallenge = vi.fn();
vi.mock("@/lib/arena-client", async (original) => ({
  ...(await original<typeof import("@/lib/arena-client")>()),
  fetchOnline: (...args: unknown[]) => fetchOnline(...args),
  sendChallenge: (...args: unknown[]) => sendChallenge(...args),
  cancelChallenge: (...args: unknown[]) => cancelChallenge(...args),
}));

const THU: OnlineLearner = { id: "thu", name: "Thu", image: null, isFriend: false, lastSeenAt: 2 };
const LAN: OnlineLearner = { id: "lan", name: "Lan", image: null, isFriend: true, lastSeenAt: 1 };
const KHOA: OnlineLearner = { id: "khoa", name: "Khoa", image: null, isFriend: false, lastSeenAt: 1 };

function fakeLink() {
  let listener: ((frame: LinkFrame) => void) | null = null;
  const client: Link = { start: vi.fn(), stop: vi.fn(), setRoom: vi.fn(), answer: vi.fn(() => true), subscribe: (next) => ((listener = next), () => void (listener = null)) };
  return { client, emit: (frame: LinkFrame) => act(() => listener?.(frame)) };
}

function setup(props: { friends?: "hide" | "mark"; inRoom?: string[] } = {}) {
  const fake = fakeLink();
  const view = render(<OnlineLearners code="R2KS89" hostName="Minh" inRoom={props.inRoom ?? ["minh"]} friends={props.friends ?? "hide"} client={fake.client} />);
  return { ...fake, ...view };
}

beforeEach(() => {
  toast.mockReset();
  toast.success.mockReset();
  fetchOnline.mockReset().mockResolvedValue({ learners: [THU, LAN, KHOA] });
  sendChallenge.mockReset().mockResolvedValue({ state: "sent" });
  cancelChallenge.mockReset();
});

describe("OnlineLearners (feature 045)", () => {
  it("lists online learners who aren't friends in a duel, each with Mời (AC-002)", async () => {
    setup();
    expect(await screen.findByRole("button", { name: "Mời Thu" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Đang trực tuyến" })).toBeInTheDocument();
    expect(screen.queryByText("Lan")).not.toBeInTheDocument();
    expect(fetchOnline).toHaveBeenCalledWith("R2KS89");
  });

  it("marks friends in a team room, and leaves out people already in the room (AC-007)", async () => {
    setup({ friends: "mark", inRoom: ["minh", "khoa"] });
    const lan = (await screen.findByRole("button", { name: "Mời Lan" })).closest("li")!;
    expect(within(lan).getByText("Bạn bè")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Mời Khoa" })).not.toBeInTheDocument();
    expect(screen.getAllByText("Bạn bè")).toHaveLength(1);
  });

  it("invites like a friend challenge: pending with the seconds left, then the reply (AC-003, AC-004)", async () => {
    const { emit } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Mời Thu" }));
    expect(await screen.findByText(/còn 30 giây/)).toBeInTheDocument();
    expect(sendChallenge).toHaveBeenCalledWith("R2KS89", "thu", "Minh");
    emit({ type: "reply", friendId: "thu", code: "R2KS89", accept: true });
    expect(toast.success).toHaveBeenCalledWith(REPLY_MESSAGES.accepted("Thu"));
    expect(screen.getByRole("button", { name: "Mời Thu" })).toBeInTheDocument();
  });

  it("tells the host when the learner can't get the invite, and lets them cancel one (AC-004)", async () => {
    sendChallenge.mockResolvedValueOnce({ state: "busy" });
    setup();
    fireEvent.click(await screen.findByRole("button", { name: "Mời Thu" }));
    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith(NOT_SENT.busy("Thu")));
    fireEvent.click(screen.getByRole("button", { name: "Mời Khoa" }));
    fireEvent.click(await screen.findByRole("button", { name: "Hủy lời mời Khoa" }));
    expect(cancelChallenge).toHaveBeenCalledWith("R2KS89", "khoa");
  });

  it("withdraws pending invites when it goes away (AC-009)", async () => {
    const { unmount } = setup();
    fireEvent.click(await screen.findByRole("button", { name: "Mời Thu" }));
    await screen.findByText(/Đang chờ/);
    unmount();
    expect(cancelChallenge).toHaveBeenCalledWith("R2KS89", "thu");
  });

  it("says when nobody else is online, and loads again only on Làm mới (AC-005, AC-006)", async () => {
    fetchOnline.mockResolvedValue({ learners: [] });
    setup();
    expect(await screen.findByText("Chưa có ai khác đang trực tuyến.")).toBeInTheDocument();
    expect(fetchOnline).toHaveBeenCalledTimes(1);
    fetchOnline.mockResolvedValue({ learners: [THU] });
    fireEvent.click(screen.getByRole("button", { name: "Làm mới" }));
    expect(await screen.findByRole("button", { name: "Mời Thu" })).toBeInTheDocument();
    expect(fetchOnline).toHaveBeenCalledTimes(2);
  });

  it("offers a retry when the list fails", async () => {
    fetchOnline.mockRejectedValueOnce(new Error("down"));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent("Chưa tải được");
    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("button", { name: "Mời Thu" })).toBeInTheDocument();
  });
});
