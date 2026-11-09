import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Toaster } from "sonner";
import { CHALLENGE_MS, type LinkFrame } from "@/learning/arena/link";
import type { Link } from "@/lib/link-client";
import { LinkRunner } from "./link-runner";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
let status = "signed-in";
vi.mock("@/hooks/use-account", () => ({ useAccount: () => ({ status }) }));

const CHALLENGE: LinkFrame = { type: "challenge", from: { id: "evan", name: "Evan", image: null }, code: "R2KS89", settings: { mode: "mixed", level: "B1", rounds: 1, seconds: 15 } };

function fakeLink() {
  let listener: ((frame: LinkFrame) => void) | null = null;
  const client = {
    start: vi.fn(),
    stop: vi.fn(),
    setRoom: vi.fn(),
    answer: vi.fn(() => true),
    subscribe: vi.fn((next: (frame: LinkFrame) => void) => {
      listener = next;
      return () => void (listener = null);
    }),
  } satisfies Link;
  return { client, emit: (frame: LinkFrame) => act(() => listener?.(frame)) };
}

function setup() {
  const fake = fakeLink();
  render(
    <>
      <Toaster />
      <LinkRunner client={fake.client} />
    </>,
  );
  return fake;
}

beforeEach(() => {
  status = "signed-in";
  push.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("LinkRunner (feature 035)", () => {
  it("opens the link only for a signed-in learner", () => {
    status = "guest";
    const fake = setup();
    expect(fake.client.start).not.toHaveBeenCalled();
  });

  it("shows the challenge with the host, the settings and the time left (AC-004)", async () => {
    const { client, emit } = setup();
    expect(client.start).toHaveBeenCalled();
    emit(CHALLENGE);
    expect(await screen.findByText("Evan thách đấu bạn!")).toBeInTheDocument();
    expect(screen.getByText(/còn 30 giây/)).toBeInTheDocument();
  });

  it("accepting answers yes and opens the room like a code would (AC-005)", async () => {
    const { client, emit } = setup();
    emit(CHALLENGE);
    fireEvent.click(await screen.findByRole("button", { name: "Chấp nhận" }));
    expect(client.answer).toHaveBeenCalledWith("evan", "R2KS89", true);
    expect(push).toHaveBeenCalledWith("/arena/room?code=R2KS89");
  });

  it("declining answers no and stays on the page (AC-006)", async () => {
    const { client, emit } = setup();
    emit(CHALLENGE);
    fireEvent.click(await screen.findByRole("button", { name: "Từ chối" }));
    expect(client.answer).toHaveBeenCalledWith("evan", "R2KS89", false);
    expect(push).not.toHaveBeenCalled();
  });

  it("closes when the host cancels or another tab answers (AC-010, AC-011)", async () => {
    const { emit } = setup();
    emit(CHALLENGE);
    await screen.findByText("Evan thách đấu bạn!");
    emit({ type: "challenge-closed", hostId: "evan", code: "R2KS89" });
    await vi.waitFor(() => expect(screen.queryByText("Evan thách đấu bạn!")).not.toBeInTheDocument());
  });

  it("closes by itself after 30 seconds (AC-009)", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { client, emit } = setup();
    emit(CHALLENGE);
    await screen.findByText("Evan thách đấu bạn!");
    await act(() => vi.advanceTimersByTimeAsync(CHALLENGE_MS + 1_000));
    await vi.waitFor(() => expect(screen.queryByText("Evan thách đấu bạn!")).not.toBeInTheDocument());
    expect(client.answer).not.toHaveBeenCalled();
  });
});
