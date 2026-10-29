import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { vocabSet, word } from "@/learning/exercises/fixtures";
import { buildContentIndex } from "@/lib/session/content-index";
import { putCards } from "@/storage/cards";
import { makeCard, resetStorage } from "@/storage/test-utils";
import { FollowedSetCard } from "./followed-set-card";

vi.mock("next/navigation", () => import("@/components/library/test-navigation"));

const deploy = word("deploy-v", { source: "specialized" }, "A2");
const meeting = word("meeting-n");
const base = vocabSet("recruitment", [deploy, meeting]);
const index = buildContentIndex([meeting, { ...base, body: { ...base.body, titleVi: "Tuyển dụng" } }]);

describe("FollowedSetCard (feature 012)", () => {
  beforeEach(async () => {
    await resetStorage();
  });

  it("shows the followed set's name and learned/total words (AC-013)", async () => {
    await putCards([makeCard("word:meeting-n", Date.now())]);
    render(<FollowedSetCard vocabSet="set:recruitment" index={index} />);
    expect(await screen.findByRole("heading", { name: "Tuyển dụng" })).toBeInTheDocument();
    expect(screen.getByText("1/2")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Xem bộ từ" })).toHaveAttribute("href", "/vocabulary?set=recruitment");
  });

  it("says when the set is finished and offers the next choices (AC-011)", async () => {
    await putCards([makeCard("word:meeting-n", Date.now()), makeCard("word:deploy-v", Date.now())]);
    render(<FollowedSetCard vocabSet="set:recruitment" index={index} />);
    expect(await screen.findByRole("heading", { name: "Bạn đã học xong bộ “Tuyển dụng”" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chọn bộ khác" })).toHaveAttribute("href", "/vocabulary?view=sets");
    expect(screen.getByRole("button", { name: "Ngừng học bộ này" })).toBeEnabled();
  });

  it("shows nothing when no set is followed or the set is gone", async () => {
    const { container, rerender } = render(<FollowedSetCard vocabSet={undefined} index={index} />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container).toBeEmptyDOMElement();
    rerender(<FollowedSetCard vocabSet="set:gone" index={index} />);
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(container).toBeEmptyDOMElement();
  });
});
