import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, screen } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { putCards } from "@/storage/cards";
import { createDefaultProfile, saveProfile } from "@/storage/meta";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { GuestNotice } from "./guest-notice";

// Feature 022, AC-026: a one-time notice for learners who used the app before sign-in.

const account = vi.hoisted(() => ({ status: "guest" as "guest" | "signed-in" }));
vi.mock("@/hooks/use-account", () => ({ useAccount: () => ({ status: account.status, account: null, session: undefined }) }));

const TITLE = "Bài học giờ cần đăng nhập";
const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 20)));

beforeEach(async () => {
  await resetStorage();
  localStorage.clear();
  account.status = "guest";
  await saveProfile(createDefaultProfile(0, () => "device-a"));
});

afterEach(() => cleanup());

describe("GuestNotice", () => {
  it("tells a guest with progress once, and not after it was closed", async () => {
    await putCards([makeCard("word:cat", 0)]);
    render(<GuestNotice />);
    expect(await screen.findByText(TITLE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Đăng nhập với Google" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Để sau" }));
    cleanup();

    render(<GuestNotice />);
    await settle();
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });

  it("says nothing to a new guest or a signed-in learner", async () => {
    render(<GuestNotice />);
    await settle();
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
    cleanup();

    await putCards([makeCard("word:cat", 0)]);
    account.status = "signed-in";
    render(<GuestNotice />);
    await settle();
    expect(screen.queryByText(TITLE)).not.toBeInTheDocument();
  });
});
