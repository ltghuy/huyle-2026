import { describe, expect, it } from "vitest";
import { act, fireEvent, screen, within } from "@testing-library/react";
import { render } from "@/test-utils/render";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameGuide, GUIDE_TOOLTIP } from "./game-guide";

function renderGuide() {
  return render(
    <TooltipProvider>
      <GameGuide />
    </TooltipProvider>,
  );
}

describe("GameGuide (024 AC-009)", () => {
  it("shows the tooltip on hover", async () => {
    renderGuide();
    await act(async () => fireEvent.mouseEnter(screen.getByRole("button", { name: "Hướng dẫn chơi" })));
    await act(async () => fireEvent.pointerEnter(screen.getByRole("button", { name: "Hướng dẫn chơi" }), { pointerType: "mouse" }));
    expect(await screen.findByText(GUIDE_TOOLTIP)).toBeInTheDocument();
  });

  it("opens the guide with how to play and how to win", async () => {
    renderGuide();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Hướng dẫn chơi" })));
    const dialog = await screen.findByRole("dialog", { name: "Hướng dẫn chơi" });
    for (const heading of ["Vào trận", "Cách chơi", "Cách thắng"]) {
      expect(within(dialog).getByRole("heading", { name: heading })).toBeInTheDocument();
    }
    expect(within(dialog).getByText(/Mỗi hiệp có 12 câu hỏi/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Ai trả lời đúng trước được 1 điểm/)).toBeInTheDocument();
    expect(within(dialog).getByText(/ai thắng 2 hiệp trước là thắng trận/)).toBeInTheDocument();
  });
});
